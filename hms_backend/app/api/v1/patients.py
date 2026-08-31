from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from hms_backend.app.core.database import get_db
from hms_backend.app.models.patient import Patient
from hms_backend.app.utils.audit import log_deleted_record

router = APIRouter(prefix="/patients", tags=["patients"])


@router.get("")
def list_patients(db: Session = Depends(get_db)):
    patients = db.query(Patient).filter(Patient.status != "Deleted").all()
    result = []
    doctors_list = [
        "Dr. Madhavan",
        "Dr. S. Karthikeyan",
        "Dr. Murugan Jeyaraman",
        "Dr. Raj Kanna",
        "Dr. Priya Nair"
    ]
    for idx, p in enumerate(patients):
        doc_assigned = getattr(p, 'doctor', None) or doctors_list[idx % len(doctors_list)]
        result.append({
            "id": p.id,
            "Patient ID": p.patient_id or p.patient_code or f"PAT-{p.id:04d}",
            "UHID": p.patient_id or p.patient_code or f"PAT-{p.id:04d}",
            "Name": p.full_name,
            "full_name": p.full_name,
            "Doctor": doc_assigned,
            "Disease": p.disease or "General Consultation",
            "Pain Level": f"{p.pain_scale or 3}/10",
            "Phone": p.phone,
            "phone": p.phone,
            "email": p.email,
            "gender": p.gender or "Unspecified",
            "blood_group": p.blood_group or "O+",
            "date_of_birth": str(p.date_of_birth) if p.date_of_birth else None,
            "address": p.address or "",
            "city": getattr(p, 'city', '') or "",
            "state": getattr(p, 'state', '') or "",
            "pincode": getattr(p, 'pincode', '') or "",
            "emergency_contact_name": p.emergency_contact_name or "",
            "emergency_contact_phone": p.emergency_contact_phone or "",
            "emergency_relationship": getattr(p, 'emergency_relationship', '') or "",
            "Registered Date": str(p.created_at.date()) if p.created_at else "2026-08-20",
            "Status": p.status or "Active"
        })
    return result


@router.get("/search")
def search_patients(q: str = "", db: Session = Depends(get_db)):
    if not q:
        return list_patients(db)
    query_str = f"%{q.strip()}%"
    patients = db.query(Patient).filter(
        Patient.status != "Deleted",
        (Patient.full_name.ilike(query_str)) |
        (Patient.phone.ilike(query_str)) |
        (Patient.patient_id.ilike(query_str)) |
        (Patient.patient_code.ilike(query_str))
    ).all()
    
    result = []
    for idx, p in enumerate(patients):
        result.append({
            "id": p.id,
            "Patient ID": p.patient_id or p.patient_code or f"PAT-{p.id:04d}",
            "UHID": p.patient_id or p.patient_code or f"PAT-{p.id:04d}",
            "Name": p.full_name,
            "full_name": p.full_name,
            "Phone": p.phone,
            "phone": p.phone,
            "email": p.email,
            "gender": p.gender or "Unspecified",
            "blood_group": p.blood_group or "O+",
            "date_of_birth": str(p.date_of_birth) if p.date_of_birth else None,
            "address": p.address or "",
            "emergency_contact_name": p.emergency_contact_name or "",
            "emergency_contact_phone": p.emergency_contact_phone or "",
            "Registered Date": str(p.created_at.date()) if p.created_at else "2026-08-20",
            "Status": p.status or "Active"
        })
    return result


@router.post("")
def register_patient(payload: dict, db: Session = Depends(get_db)):
    name = payload.get("Name") or payload.get("full_name") or payload.get("Full Name") or "New Patient"
    phone = payload.get("Phone") or payload.get("phone") or payload.get("Mobile Number") or "+91 99999 00000"
    email = payload.get("Email") or payload.get("email")
    dob_str = payload.get("date_of_birth") or payload.get("Date of Birth")
    gender = payload.get("Gender") or payload.get("gender") or "Unspecified"
    blood_group = payload.get("Blood Group") or payload.get("blood_group") or "O+"
    
    address = payload.get("Address") or payload.get("address") or ""
    city = payload.get("City") or payload.get("city") or ""
    state = payload.get("State") or payload.get("state") or ""
    pincode = payload.get("Pincode") or payload.get("pincode") or ""

    dept = payload.get("Department") or payload.get("department") or "Cardiology"
    doctor = payload.get("Doctor") or payload.get("doctor") or "Dr. Madhavan"
    visit_type = payload.get("Visit Type") or payload.get("visit_type") or "New Consultation"
    chief_complaint = payload.get("Chief Complaint") or payload.get("chief_complaint") or payload.get("Disease") or "Routine Checkup"

    emer_name = payload.get("Contact Name") or payload.get("emergency_contact_name") or ""
    emer_rel = payload.get("Relationship") or payload.get("emergency_relationship") or ""
    emer_phone = payload.get("Contact Number") or payload.get("emergency_contact_phone") or ""

    reg_fee = payload.get("Registration Fee") or payload.get("registration_fee") or "₹500"
    pay_mode = payload.get("Payment Mode") or payload.get("payment_mode") or "Cash"
    pay_status = payload.get("Payment Status") or payload.get("payment_status") or "Paid"

    # Generate UHID
    count = db.query(Patient).count() + 1
    pid = payload.get("Patient ID") or payload.get("UHID") or f"UHID-2026-{1000 + count}"

    dob = None
    if dob_str:
        try:
            dob = datetime.strptime(str(dob_str), "%Y-%m-%d").date()
        except Exception:
            dob = None

    patient = Patient(
        patient_id=pid,
        patient_code=pid,
        full_name=name,
        phone=phone,
        email=email,
        date_of_birth=dob,
        gender=gender,
        blood_group=blood_group,
        address=address,
        disease=chief_complaint,
        pain_scale=3,
        emergency_contact_name=emer_name,
        emergency_contact_phone=emer_phone,
        status="Active"
    )
    if hasattr(patient, 'city'): patient.city = city
    if hasattr(patient, 'state'): patient.state = state
    if hasattr(patient, 'pincode'): patient.pincode = pincode
    if hasattr(patient, 'emergency_relationship'): patient.emergency_relationship = emer_rel

    db.add(patient)
    db.commit()
    db.refresh(patient)

    # Auto-generate OPD Queue Token
    from hms_backend.app.utils.generic_crud import create_generic_record, get_generic_records
    existing_queue = get_generic_records(db, "reception_queue")
    token_num = f"TK-{len(existing_queue) + 1:02d}"
    
    time_str = datetime.now().strftime("%Y-%m-%d %I:%M %p")
    
    create_generic_record(db, "reception_queue", {
        "Token No": token_num,
        "Patient": name,
        "Doctor": doctor,
        "Est. Time": datetime.now().strftime("%I:%M %p"),
        "Status": "Waiting"
    })

    create_generic_record(db, "reception_op_ip", {
        "Patient Name": name,
        "Type": "Outpatient (OP)",
        "Department": dept,
        "Status": "Checked In"
    })

    create_generic_record(db, "doctor_appointments", {
        "Time": time_str,
        "Patient Name": name,
        "Doctor": doctor,
        "Status": "Scheduled",
        "Notes": f"{visit_type} - {chief_complaint}"
    })
    
    create_generic_record(db, "doctor_notifications", {
        "Doctor": doctor,
        "Patient": name,
        "Message": f"🔔 New Patient Registration ({token_num}): {name} assigned for {dept} ({chief_complaint}).",
        "Status": "Unread"
    })

    create_generic_record(db, "billing_invoices", {
        "Invoice ID": f"INV-REG-{patient.id}",
        "Patient": name,
        "Total Amount": str(reg_fee),
        "Payment Mode": pay_mode,
        "Payment Status": pay_status,
        "Date": time_str
    })

    return {
        "id": patient.id,
        "Patient ID": patient.patient_id,
        "UHID": patient.patient_id,
        "Name": patient.full_name,
        "full_name": patient.full_name,
        "Phone": patient.phone,
        "email": patient.email,
        "Doctor": doctor,
        "Department": dept,
        "Token No": token_num,
        "Visit Type": visit_type,
        "Chief Complaint": chief_complaint,
        "Registration Fee": reg_fee,
        "Payment Mode": pay_mode,
        "Payment Status": pay_status,
        "Registered Date": str(patient.created_at.date()) if patient.created_at else "2026-08-25",
        "Status": patient.status
    }


@router.delete("/{patient_id}")
def delete_patient(patient_id: int, db: Session = Depends(get_db)):
    p = db.query(Patient).filter(Patient.id == patient_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    deleted_info = {
        "id": p.id,
        "patient_code": p.patient_code,
        "name": p.full_name,
        "phone": p.phone,
        "status": "Deleted"
    }
    log_deleted_record(db, "Patient", p.id, deleted_info)

    p.status = "Deleted"
    db.commit()
    return {"status": "success", "message": f"Patient #{patient_id} marked as deleted in DB and archived in deleted_records table."}
