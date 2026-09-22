import uuid
from datetime import datetime, timezone, date
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from hms_backend.app.core.database import get_db

from hms_backend.app.models.reception_billing import EncounterBill, EncounterBillItem, EncounterPayment
from hms_backend.app.models.encounter import Encounter
from hms_backend.app.models.patient import Patient
from hms_backend.app.models.consultation import DoctorConsultation
from hms_backend.app.models.lab import LabOrder

# Add websocket broadcaster
from hms_backend.app.core.websocket import manager

router = APIRouter(prefix="/billing", tags=["reception_billing"])

@router.get("/encounter/{encounter_code}")
def get_encounter_billing_preview(encounter_code: str, db: Session = Depends(get_db)):
    """Fetch unbilled services and billing preview for an encounter."""
    enc = db.query(Encounter).filter(Encounter.encounter_code == encounter_code).first()
    if not enc:
        raise HTTPException(status_code=404, detail="Encounter not found")
        
    pt = db.query(Patient).filter(Patient.id == enc.patient_id).first()
    
    # 1. Fetch Existing Bills
    existing_bills = db.query(EncounterBill).filter(EncounterBill.encounter_id == enc.id).all()
    already_billed_sources = set()
    for b in existing_bills:
        for item in b.bill_items:
            already_billed_sources.add(f"{item.source_type}:{item.source_id}")
            
    # 2. Identify Billable Services
    unbilled_services = []
    
    # A. Consultation
    consult = db.query(DoctorConsultation).filter(DoctorConsultation.encounter_id == enc.encounter_code).first()
    if consult and f"CONSULTATION:{consult.id}" not in already_billed_sources:
        unbilled_services.append({
            "service_code": "CONSULT-OP",
            "service_name": "Doctor Consultation",
            "category": "CONSULTATION",
            "quantity": 1.0,
            "unit_price": 500.0,
            "total": 500.0,
            "source_type": "CONSULTATION",
            "source_id": str(consult.id)
        })
    elif not consult and f"CONSULTATION:{enc.id}" not in already_billed_sources:
        # Fallback if no specific consult record but encounter exists
        unbilled_services.append({
            "service_code": "CONSULT-OP",
            "service_name": f"Doctor Consultation ({enc.doctor_name or 'General'})",
            "category": "CONSULTATION",
            "quantity": 1.0,
            "unit_price": 500.0,
            "total": 500.0,
            "source_type": "CONSULTATION",
            "source_id": str(enc.id)
        })

    # B. Lab Orders (Completed or Ordered)
    lab_orders = db.query(LabOrder).filter(LabOrder.patient_id == pt.id, LabOrder.status != "Cancelled").all()
    for lab in lab_orders:
        source_key = f"LAB_ORDER:{lab.id}"
        if source_key not in already_billed_sources:
            # Look at lab items
            for item in lab.items:
                item_key = f"LAB_TEST:{item.id}"
                if item_key not in already_billed_sources:
                    unbilled_services.append({
                        "service_code": item.test_code or "LAB-TEST",
                        "service_name": item.test_name,
                        "category": "LAB",
                        "quantity": 1.0,
                        "unit_price": 250.0,  # Could fetch from ServiceMaster
                        "total": 250.0,
                        "source_type": "LAB_TEST",
                        "source_id": str(item.id)
                    })

    # Calculate Totals
    gross_amount = sum(s["total"] for s in unbilled_services)
    
    return {
        "encounter": {
            "encounter_code": enc.encounter_code,
            "encounter_type": enc.encounter_type,
            "status": enc.status,
            "doctor_name": enc.doctor_name
        },
        "patient": {
            "id": pt.id,
            "full_name": pt.full_name,
            "patient_code": pt.patient_code
        },
        "unbilled_services": unbilled_services,
        "existing_bills": [
            {
                "id": b.id,
                "bill_number": b.bill_number,
                "gross_amount": b.gross_amount,
                "net_amount": b.net_amount,
                "paid_amount": b.paid_amount,
                "balance_amount": b.balance_amount,
                "status": b.status
            } for b in existing_bills
        ],
        "totals": {
            "gross_amount": gross_amount,
            "net_amount": gross_amount
        }
    }


@router.post("/generate")
async def generate_bill(payload: dict = Body(...), db: Session = Depends(get_db)):
    """Generate a bill for selected unbilled services."""
    encounter_code = payload.get("encounter_code")
    discount_amount = float(payload.get("discount_amount", 0.0))
    services = payload.get("services", [])
    
    enc = db.query(Encounter).filter(Encounter.encounter_code == encounter_code).first()
    if not enc:
        raise HTTPException(status_code=404, detail="Encounter not found")
        
    if not services:
        raise HTTPException(status_code=400, detail="No services provided to bill")

    # Double check for duplicates
    existing_items = db.query(EncounterBillItem).filter(
        EncounterBillItem.bill.has(encounter_id=enc.id)
    ).all()
    already_billed = set(f"{i.source_type}:{i.source_id}" for i in existing_items)
    
    gross_amount = 0.0
    bill_items = []
    
    for s in services:
        key = f"{s['source_type']}:{s['source_id']}"
        if key in already_billed:
            raise HTTPException(status_code=400, detail=f"Service {key} already billed!")
            
        unit_price = float(s.get("unit_price", 0.0))
        qty = float(s.get("quantity", 1.0))
        total = unit_price * qty
        gross_amount += total
        
        item = EncounterBillItem(
            service_code=s.get("service_code", "GEN"),
            service_name=s.get("service_name", "Service"),
            category=s.get("category", "OTHER"),
            quantity=qty,
            unit_price=unit_price,
            total=total,
            source_type=s["source_type"],
            source_id=str(s["source_id"])
        )
        bill_items.append(item)
        
    net_amount = gross_amount - discount_amount
    
    bill = EncounterBill(
        bill_number=f"BILL-2026-{uuid.uuid4().hex[:6].upper()}",
        encounter_id=enc.id,
        patient_id=enc.patient_id,
        gross_amount=gross_amount,
        discount_amount=discount_amount,
        net_amount=net_amount,
        balance_amount=net_amount,
        status="GENERATED"
    )
    
    db.add(bill)
    db.commit()
    db.refresh(bill)
    
    for item in bill_items:
        item.bill_id = bill.id
        db.add(item)
        
    db.commit()
    
    # Broadcast event
    await manager.broadcast({
        "event": "BillGenerated",
        "encounter_id": enc.encounter_code,
        "bill_number": bill.bill_number,
        "net_amount": net_amount
    }, channel="reception")
    
    return {"status": "success", "bill_id": bill.id, "bill_number": bill.bill_number, "net_amount": net_amount}


@router.post("/{bill_id}/payment")
async def record_payment(bill_id: int, payload: dict = Body(...), db: Session = Depends(get_db)):
    bill = db.query(EncounterBill).filter(EncounterBill.id == bill_id).first()
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")
        
    amount = float(payload.get("amount", 0.0))
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Invalid payment amount")
        
    if amount > bill.balance_amount:
        raise HTTPException(status_code=400, detail=f"Payment exceeds outstanding balance of {bill.balance_amount}")
        
    payment = EncounterPayment(
        payment_number=f"REC-2026-{uuid.uuid4().hex[:6].upper()}",
        bill_id=bill.id,
        encounter_id=bill.encounter_id,
        patient_id=bill.patient_id,
        amount=amount,
        payment_method=payload.get("payment_method", "CASH"),
        transaction_reference=payload.get("transaction_reference")
    )
    db.add(payment)
    
    # Update Bill
    bill.paid_amount += amount
    bill.balance_amount = bill.net_amount - bill.paid_amount
    
    if bill.balance_amount <= 0:
        bill.status = "PAID"
    else:
        bill.status = "PARTIALLY_PAID"
        
    db.commit()
    db.refresh(payment)
    
    await manager.broadcast({
        "event": "PaymentCompleted",
        "encounter_id": bill.encounter.encounter_code,
        "bill_number": bill.bill_number,
        "amount": amount,
        "payment_method": payment.payment_method
    }, channel="reception")
    
    return {"status": "success", "payment_id": payment.id, "balance_amount": bill.balance_amount, "bill_status": bill.status}


@router.get("/reconciliation/today")
def get_daily_collection(db: Session = Depends(get_db)):
    today = datetime.now(timezone.utc).date()
    
    payments = db.query(EncounterPayment).filter(
        EncounterPayment.payment_status == "SUCCESS"
    ).all()
    
    # Filter for today
    today_payments = [p for p in payments if p.paid_at.date() == today]
    
    cash = sum(p.amount for p in today_payments if p.payment_method == "CASH")
    card = sum(p.amount for p in today_payments if p.payment_method == "CARD")
    upi = sum(p.amount for p in today_payments if p.payment_method == "UPI")
    
    return {
        "date": today.strftime("%Y-%m-%d"),
        "total_payments": len(today_payments),
        "total_collected": cash + card + upi,
        "breakdown": {
            "CASH": cash,
            "CARD": card,
            "UPI": upi
        }
    }
