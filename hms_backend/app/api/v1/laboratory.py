import json
from datetime import datetime, timezone, date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from hms_backend.app.core.database import get_db
from hms_backend.app.models.lab import (
    LabTestMaster, LabTestParameter, LabOrder, LabOrderItem, LabSpecimen,
    LabResult, LabResultValue, LabResultAmendment, LabEventOutbox,
    TestRequest, LabReport
)
from hms_backend.app.models.patient import Patient
from hms_backend.app.models.doctor import Doctor
from hms_backend.app.models.encounter import Encounter
from hms_backend.app.models.queue import QueueEntry
from hms_backend.app.services.lab_service import (
    seed_lab_masters_if_needed, compute_parameter_flag, emit_lab_event
)

router = APIRouter(prefix="/laboratory", tags=["laboratory"])


# 1. Lab Test Master & Parameters
@router.get("/masters")
def get_lab_masters(db: Session = Depends(get_db)):
    seed_lab_masters_if_needed(db)
    masters = db.query(LabTestMaster).filter(LabTestMaster.is_active == True).all()
    result = []
    for m in masters:
        params = db.query(LabTestParameter).filter(LabTestParameter.test_id == m.id).order_by(LabTestParameter.display_order).all()
        result.append({
            "id": m.id,
            "test_code": m.test_code,
            "test_name": m.test_name,
            "laboratory_section": m.laboratory_section,
            "specimen_type": m.specimen_type,
            "container_type": m.container_type,
            "fasting_required": m.fasting_required,
            "tat_minutes": m.tat_minutes,
            "parameters": [
                {
                    "id": p.id,
                    "parameter_code": p.parameter_code,
                    "parameter_name": p.parameter_name,
                    "unit": p.unit,
                    "data_type": p.data_type,
                    "reference_low": p.reference_low,
                    "reference_high": p.reference_high,
                    "reference_text": p.reference_text,
                    "critical_low": p.critical_low,
                    "critical_high": p.critical_high,
                    "display_order": p.display_order
                }
                for p in params
            ]
        })
    return result


# 2. Dynamic Dashboard Counters (Calculated directly from Database)
@router.get("/dashboard-counters")
def get_dashboard_counters(db: Session = Depends(get_db)):
    seed_lab_masters_if_needed(db)
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    
    new_orders = db.query(LabOrder).filter(LabOrder.status.in_(["ORDERED", "ACKNOWLEDGED"])).count()
    sample_pending = db.query(LabOrder).filter(LabOrder.status == "COLLECTION_PENDING").count()
    sample_collected = db.query(LabSpecimen).filter(LabSpecimen.collection_status == "COLLECTED").count()
    processing = db.query(LabOrder).filter(LabOrder.status.in_(["SAMPLE_RECEIVED", "PROCESSING"])).count()
    results_pending = db.query(LabOrder).filter(LabOrder.status.in_(["PROCESSING", "RESULT_ENTERED"])).count()
    verification_pending = db.query(LabResult).filter(LabResult.status.in_(["RESULT_ENTERED", "VERIFICATION_PENDING"])).count()
    completed_today = db.query(LabResult).filter(
        LabResult.status.in_(["VERIFIED", "RELEASED"]),
        LabResult.verified_at >= today_start
    ).count()
    critical_results = db.query(LabResult).filter(LabResult.is_critical == True).count()

    return {
        "new_orders": new_orders,
        "sample_pending": sample_pending,
        "sample_collected": sample_collected,
        "processing": processing,
        "results_pending": results_pending,
        "verification_pending": verification_pending,
        "completed_today": completed_today,
        "critical_results": critical_results
    }


# 3. Work Queue (Filtered by Section and Status)
@router.get("/work-queue")
def get_work_queue(
    section: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    seed_lab_masters_if_needed(db)
    if not isinstance(section, str):
        section = None
    if not isinstance(status, str):
        status = None

    query = db.query(LabOrder).order_by(LabOrder.id.desc())

    if status and status != "All":
        query = query.filter(LabOrder.status == status)

    orders = query.all()
    results = []
    
    for o in orders:
        items = db.query(LabOrderItem).filter(LabOrderItem.lab_order_id == o.id).all()
        # Filter by section if specified
        if section and section != "All":
            items = [i for i in items if i.laboratory_section.lower() == section.lower()]
            if not items and not (o.items and any(i.laboratory_section.lower() == section.lower() for i in o.items)):
                continue

        patient = db.query(Patient).filter(Patient.id == o.patient_id).first()
        doctor = db.query(Doctor).filter(Doctor.id == o.ordering_doctor_id).first()
        specimens = db.query(LabSpecimen).filter(LabSpecimen.lab_order_id == o.id).all()
        lab_results = db.query(LabResult).filter(LabResult.lab_order_id == o.id).all()

        results.append({
            "id": o.id,
            "order_code": o.order_code,
            "encounter_id": o.encounter_id,
            "patient_id": o.patient_id,
            "patient_name": patient.full_name if patient else "Patient",
            "patient_uhid": patient.patient_code or patient.patient_id if patient else f"PT-{o.patient_id}",
            "ordering_doctor_id": o.ordering_doctor_id,
            "ordering_doctor_name": doctor.full_name if doctor else "Dr. Madhavan",
            "department_name": o.department_name or "Cardiology",
            "priority": o.priority or "ROUTINE",
            "clinical_indication": o.clinical_indication,
            "fasting_required": o.fasting_required,
            "op_ip_status": o.op_ip_status or "OP",
            "status": o.status,
            "ordered_at": o.ordered_at.strftime("%Y-%m-%d %H:%M") if o.ordered_at else "2026-08-31 10:00",
            "items": [
                {
                    "id": item.id,
                    "test_name": item.test_name,
                    "laboratory_section": item.laboratory_section,
                    "status": item.status
                }
                for item in items
            ],
            "specimens": [
                {
                    "id": s.id,
                    "specimen_code": s.specimen_code,
                    "specimen_type": s.specimen_type,
                    "container_type": s.container_type,
                    "barcode": s.barcode,
                    "collection_status": s.collection_status,
                    "collected_by": s.collected_by,
                    "collected_at": s.collected_at.strftime("%Y-%m-%d %H:%M") if s.collected_at else None,
                    "rejection_reason": s.rejection_reason
                }
                for s in specimens
            ],
            "lab_results": [
                {
                    "id": r.id,
                    "status": r.status,
                    "is_critical": r.is_critical,
                    "verified_by": r.verified_by,
                    "released_at": r.released_at.strftime("%Y-%m-%d %H:%M") if r.released_at else None
                }
                for r in lab_results
            ]
        })
    return results


# 4. Sample Collection API
@router.post("/specimens/collect")
async def collect_sample(payload: dict, db: Session = Depends(get_db)):
    order_id = payload.get("lab_order_id") or payload.get("id")
    order = db.query(LabOrder).filter(LabOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Lab order not found")

    collected_by = payload.get("collected_by") or "Phlebotomist Staff"
    collection_site = payload.get("collection_site") or "Main Lab Collection Counter"
    notes = payload.get("collection_notes") or "Standard venipuncture collection"
    now_dt = datetime.now(timezone.utc)

    # Update specimens
    specimens = db.query(LabSpecimen).filter(LabSpecimen.lab_order_id == order.id).all()
    if not specimens:
        # Create specimen
        spc_code = f"SPC-2026-{1000 + order.id}"
        barcode = f"BC-2026-{1000 + order.id}"
        test_master = db.query(LabTestMaster).filter(LabTestMaster.test_code == "CBC").first()
        spc = LabSpecimen(
            specimen_code=spc_code,
            lab_order_id=order.id,
            patient_id=order.patient_id,
            specimen_type=test_master.specimen_type if test_master else "Whole Blood",
            container_type=test_master.container_type if test_master else "EDTA tube",
            barcode=barcode,
            collection_status="COLLECTED",
            collected_by=collected_by,
            collected_at=now_dt,
            collection_site=collection_site,
            collection_notes=notes
        )
        db.add(spc)
        specimens = [spc]
    else:
        for s in specimens:
            s.collection_status = "COLLECTED"
            s.collected_by = collected_by
            s.collected_at = now_dt
            s.collection_site = collection_site

    order.status = "SAMPLE_COLLECTED"
    db.commit()

    event_data = {
        "lab_order_id": order.id,
        "order_code": order.order_code,
        "encounter_id": order.encounter_id,
        "patient_id": order.patient_id,
        "ordering_doctor_id": order.ordering_doctor_id,
        "status": "SAMPLE_COLLECTED",
        "collected_at": now_dt.strftime("%Y-%m-%d %H:%M")
    }
    await emit_lab_event(db, "LabSampleCollected", event_data, target_doctor_id=order.ordering_doctor_id)

    return {"status": "success", "message": "Sample collected successfully.", "specimens": [s.specimen_code for s in specimens]}


# 5. Sample Reception & Rejection API
@router.post("/specimens/receive")
async def receive_sample(payload: dict, db: Session = Depends(get_db)):
    order_id = payload.get("lab_order_id") or payload.get("id")
    order = db.query(LabOrder).filter(LabOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Lab order not found")

    received_by = payload.get("received_by") or "Anil Mehta (Lab Tech)"
    now_dt = datetime.now(timezone.utc)

    specimens = db.query(LabSpecimen).filter(LabSpecimen.lab_order_id == order.id).all()
    for s in specimens:
        s.collection_status = "RECEIVED"
        s.received_by = received_by
        s.received_at = now_dt

    order.status = "SAMPLE_RECEIVED"
    db.commit()

    event_data = {
        "lab_order_id": order.id,
        "order_code": order.order_code,
        "encounter_id": order.encounter_id,
        "status": "SAMPLE_RECEIVED"
    }
    await emit_lab_event(db, "LabSampleReceived", event_data, target_doctor_id=order.ordering_doctor_id)

    return {"status": "success", "message": "Sample received by Laboratory section."}


@router.post("/specimens/reject")
async def reject_sample(payload: dict, db: Session = Depends(get_db)):
    order_id = payload.get("lab_order_id") or payload.get("id")
    order = db.query(LabOrder).filter(LabOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Lab order not found")

    reason = payload.get("rejection_reason") or "Hemolysed specimen"
    specimens = db.query(LabSpecimen).filter(LabSpecimen.lab_order_id == order.id).all()
    for s in specimens:
        s.collection_status = "REJECTED"
        s.rejection_reason = reason

    order.status = "SAMPLE_REJECTED"
    db.commit()

    event_data = {
        "lab_order_id": order.id,
        "order_code": order.order_code,
        "encounter_id": order.encounter_id,
        "patient_id": order.patient_id,
        "ordering_doctor_id": order.ordering_doctor_id,
        "rejection_reason": reason,
        "status": "RECOLLECTION_REQUIRED"
    }
    await emit_lab_event(db, "LabSampleRecollectionRequired", event_data, target_doctor_id=order.ordering_doctor_id)

    return {"status": "success", "message": f"Sample rejected ({reason}). Recollection required."}


# 6. Result Entry & Processing API
@router.post("/results/entry")
async def enter_result(payload: dict, db: Session = Depends(get_db)):
    order_id = payload.get("lab_order_id") or payload.get("id")
    order = db.query(LabOrder).filter(LabOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Lab order not found")

    item = db.query(LabOrderItem).filter(LabOrderItem.lab_order_id == order.id).first()
    section = item.laboratory_section if item else "Hematology"
    test_id = item.test_id if item else 1

    param_values = payload.get("parameter_values") or {} # e.g. {"HGB": "13.2", "WBC": "8500", "PLT": "245000"}
    entered_by = payload.get("entered_by") or "Anil Mehta (Lab Tech)"
    now_dt = datetime.now(timezone.utc)

    lab_res = LabResult(
        lab_order_id=order.id,
        lab_order_item_id=item.id if item else None,
        encounter_id=order.encounter_id,
        patient_id=order.patient_id,
        ordering_doctor_id=order.ordering_doctor_id,
        laboratory_section=section,
        status="VERIFICATION_PENDING",
        version=1,
        entered_by=entered_by,
        entered_at=now_dt
    )
    db.add(lab_res)
    db.commit()
    db.refresh(lab_res)

    has_critical = False
    master_params = db.query(LabTestParameter).filter(LabTestParameter.test_id == test_id).all()
    if not master_params:
        test_master = db.query(LabTestMaster).filter(
            (LabTestMaster.id == test_id) | 
            (LabTestMaster.test_code == item.test_name) | 
            (LabTestMaster.test_name == item.test_name) |
            (LabTestMaster.test_code == "CBC")
        ).first()
        if test_master:
            master_params = db.query(LabTestParameter).filter(LabTestParameter.test_id == test_master.id).all()

    if master_params:
        for p in master_params:
            val_str = str(param_values.get(p.parameter_code) or param_values.get(p.parameter_name) or "Normal")
            flag_str, is_crit = compute_parameter_flag(val_str, p)
            if is_crit:
                has_critical = True

            res_val = LabResultValue(
                lab_result_id=lab_res.id,
                parameter_id=p.id,
                parameter_name=p.parameter_name,
                value=val_str,
                unit=p.unit,
                flag=flag_str,
                reference_low=p.reference_low,
                reference_high=p.reference_high,
                reference_text=p.reference_text,
                critical_low=p.critical_low,
                critical_high=p.critical_high,
                is_critical=is_crit
            )
            db.add(res_val)

    if not master_params or db.query(LabResultValue).filter(LabResultValue.lab_result_id == lab_res.id).count() == 0:
        for k, v in param_values.items():
            res_val = LabResultValue(
                lab_result_id=lab_res.id,
                parameter_name=str(k),
                value=str(v),
                flag="NORMAL",
                is_critical=False
            )
            db.add(res_val)

    lab_res.is_critical = has_critical
    order.status = "RESULT_ENTERED"
    db.commit()

    event_data = {
        "lab_result_id": lab_res.id,
        "lab_order_id": order.id,
        "encounter_id": order.encounter_id,
        "patient_id": order.patient_id,
        "status": "VERIFICATION_PENDING",
        "is_critical": has_critical
    }
    await emit_lab_event(db, "LabResultEntered", event_data, target_doctor_id=order.ordering_doctor_id)

    return {"status": "success", "message": "Result entered and submitted for Technical Verification.", "result_id": lab_res.id}


# 7. Technical Verification & Release API (ORDERING DOCTOR TARGETING ONLY)
@router.post("/results/verify-release")
@router.post("/results/{result_id}/verify-and-release")
async def verify_and_release_result(payload: dict, result_id: Optional[int] = None, db: Session = Depends(get_db)):
    result_id = result_id or payload.get("result_id") or payload.get("id")
    order_id = payload.get("lab_order_id")
    
    lab_res = None
    if result_id:
        lab_res = db.query(LabResult).filter(LabResult.id == result_id).first()
    elif order_id:
        lab_res = db.query(LabResult).filter(LabResult.lab_order_id == order_id).order_by(LabResult.id.desc()).first()

    if not lab_res:
        raise HTTPException(status_code=404, detail="Lab result record not found")

    order = db.query(LabOrder).filter(LabOrder.id == lab_res.lab_order_id).first()
    verified_by = payload.get("verified_by") or "Anil Mehta (Senior Lab Tech)"
    now_dt = datetime.now(timezone.utc)

    lab_res.status = "RELEASED"
    lab_res.verified_by = verified_by
    lab_res.verified_at = now_dt
    lab_res.released_by = verified_by
    lab_res.released_at = now_dt

    if order:
        order.status = "RELEASED"

    # State machine transition: AWAITING_RESULTS -> RESULTS_AVAILABLE
    enc = db.query(Encounter).filter(Encounter.encounter_code == lab_res.encounter_id).first()
    if enc and enc.status == "AWAITING_RESULTS":
        enc.status = "RESULTS_AVAILABLE"
        q_entry = db.query(QueueEntry).filter(QueueEntry.patient_id == enc.patient_id).first()
        if q_entry:
            q_entry.queue_status = "RESULTS_AVAILABLE"

    db.commit()

    patient = db.query(Patient).filter(Patient.id == lab_res.patient_id).first()
    doc_id = lab_res.ordering_doctor_id or (order.ordering_doctor_id if order else 1)

    event_payload = {
        "event": "LabResultReleased",
        "lab_result_id": lab_res.id,
        "lab_order_id": lab_res.lab_order_id,
        "encounter_id": lab_res.encounter_id,
        "patient_id": lab_res.patient_id,
        "patient_name": patient.full_name if patient else "Ishaan",
        "patient_uhid": patient.patient_code or patient.patient_id if patient else f"PT-{lab_res.patient_id}",
        "ordering_doctor_id": doc_id,
        "laboratory_section": lab_res.laboratory_section,
        "test_name": order.items[0].test_name if order and order.items else "CBC Complete Blood Count",
        "status": "RELEASED",
        "is_critical": lab_res.is_critical,
        "released_at": now_dt.strftime("%Y-%m-%d %H:%M")
    }

    # TARGET ONLY THE ORDERING DOCTOR!
    await emit_lab_event(db, "LabResultReleased", event_payload, target_doctor_id=doc_id)

    if lab_res.is_critical:
        crit_event = {
            "event": "CriticalLabResultCreated",
            "title": "CRITICAL LAB RESULT ALERT",
            "message": f"🚨 CRITICAL ALERT: Immediate review required for {patient.full_name if patient else 'Patient'} (Encounter: {lab_res.encounter_id}).",
            **event_payload
        }
        await emit_lab_event(db, "CriticalLabResultCreated", crit_event, target_doctor_id=doc_id)

    return {
        "status": "success",
        "message": f"Lab Report verified and RELEASED directly to Ordering Doctor (Doctor ID: {doc_id}).",
        "result_id": lab_res.id
    }


# 8. Legacy / General Generic CRUD Fallbacks
@router.get("/test-request")
@router.get("/requests")
def get_test_requests(db: Session = Depends(get_db)):
    return get_work_queue(db=db)

@router.get("/sample-collection")
@router.get("/samples")
def get_sample_collections(db: Session = Depends(get_db)):
    return get_work_queue(status="SAMPLE_COLLECTED", db=db)

@router.get("/report-entry")
@router.get("/reports")
def get_report_entries(db: Session = Depends(get_db)):
    return get_work_queue(status="RESULT_ENTERED", db=db)
