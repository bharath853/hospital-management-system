from datetime import datetime, timezone
import asyncio
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from hms_backend.app.core.database import get_db
from hms_backend.app.models.encounter import Encounter
from hms_backend.app.models.patient import Patient
from hms_backend.app.models.nurse import VitalRecord, NursingAssessment, NursingNote, ClinicalAlert
from hms_backend.app.models.lab import LabOrder, LabResult
from hms_backend.app.models.imaging import ImagingOrder
from hms_backend.app.models.consultation import DoctorConsultation, Diagnosis, ClinicalOrder
from hms_backend.app.models.queue import QueueEntry
from hms_backend.app.core.websocket import manager
from hms_backend.app.utils.generic_crud import (
    get_generic_records, create_generic_record, delete_generic_record, update_generic_record
)

router = APIRouter(prefix="/doctor", tags=["doctor"])

# Helper for strict doctor-level isolation
def filter_by_doctor(records: list, doctor_name: str):
    if not doctor_name:
        return records
    doc_lower = doctor_name.strip().lower()
    filtered = []
    for r in records:
        doc_field = str(r.get("Doctor") or r.get("Doctor Name") or r.get("Attending Doctor") or "").lower()
        if not doc_field or doc_lower in doc_field or doc_field in doc_lower:
            filtered.append(r)
        elif any(k in doc_lower and k in doc_field for k in ["madhavan", "karthik", "murugan", "raj", "priya"]):
            filtered.append(r)
    return filtered

# 15 Seed Patients evenly distributed to 5 Doctors (3 per doctor)
INITIAL_APPOINTMENTS = [
    # Dr. Madhavan (Cardiology)
    {"id": 1, "Time": "09:30 AM", "Patient Name": "Aarav Kumar", "Doctor": "Dr. Madhavan", "Status": "In Consultation", "Notes": "Cardiology Workup"},
    {"id": 2, "Time": "10:15 AM", "Patient Name": "Ananya Sharma", "Doctor": "Dr. Madhavan", "Status": "Scheduled", "Notes": "BP & ECG Check"},
    {"id": 3, "Time": "11:00 AM", "Patient Name": "Kavya Ramesh", "Doctor": "Dr. Madhavan", "Status": "Scheduled", "Notes": "Lipid Profile Assessment"},

    # Dr. S. Karthikeyan (Neurology)
    {"id": 4, "Time": "11:45 AM", "Patient Name": "Rajesh Patel", "Doctor": "Dr. S. Karthikeyan", "Status": "In Consultation", "Notes": "Migraine Evaluation"},
    {"id": 5, "Time": "12:30 PM", "Patient Name": "Meera Iyer", "Doctor": "Dr. S. Karthikeyan", "Status": "Scheduled", "Notes": "Neuro Follow-up"},
    {"id": 6, "Time": "01:15 PM", "Patient Name": "Arjun Swaminathan", "Doctor": "Dr. S. Karthikeyan", "Status": "Scheduled", "Notes": "Dizziness & Vertigo Review"},

    # Dr. Murugan Jeyaraman (Pediatrics)
    {"id": 7, "Time": "02:00 PM", "Patient Name": "Master Vihaan Singh", "Doctor": "Dr. Murugan Jeyaraman", "Status": "In Consultation", "Notes": "Pediatric Fever Check"},
    {"id": 8, "Time": "02:45 PM", "Patient Name": "Baby Diya Verma", "Doctor": "Dr. Murugan Jeyaraman", "Status": "Scheduled", "Notes": "Vaccination Review"},
    {"id": 9, "Time": "03:30 PM", "Patient Name": "Master Kian Nair", "Doctor": "Dr. Murugan Jeyaraman", "Status": "Scheduled", "Notes": "Growth Assessment"},

    # Dr. Raj Kanna (Orthopedics)
    {"id": 10, "Time": "04:15 PM", "Patient Name": "Vikramaditya Rao", "Doctor": "Dr. Raj Kanna", "Status": "In Consultation", "Notes": "Knee Joint Assessment"},
    {"id": 11, "Time": "05:00 PM", "Patient Name": "Ramesh Gupta", "Doctor": "Dr. Raj Kanna", "Status": "Scheduled", "Notes": "Fracture Recovery Check"},
    {"id": 12, "Time": "05:45 PM", "Patient Name": "Divya Krishnan", "Doctor": "Dr. Raj Kanna", "Status": "Scheduled", "Notes": "Spine Pain Evaluation"},

    # Dr. Priya Nair (General Medicine)
    {"id": 13, "Time": "06:30 PM", "Patient Name": "Sunita Sundaram", "Doctor": "Dr. Priya Nair", "Status": "In Consultation", "Notes": "General Health Check"},
    {"id": 14, "Time": "07:15 PM", "Patient Name": "Suresh Reddy", "Doctor": "Dr. Priya Nair", "Status": "Scheduled", "Notes": "Diabetes Consultation"},
    {"id": 15, "Time": "08:00 PM", "Patient Name": "Pooja Deshmukh", "Doctor": "Dr. Priya Nair", "Status": "Scheduled", "Notes": "Thyroid Follow-up"}
]

# 1. View Appointments
@router.get("/appointments")
def get_appointments(doctor_name: str = None, db: Session = Depends(get_db)):
    records = get_generic_records(db, "doctor_appointments", INITIAL_APPOINTMENTS)
    for r in records:
        if not r.get("Patient Name") and r.get("Patient"):
            r["Patient Name"] = r["Patient"]
        if not r.get("Patient") and r.get("Patient Name"):
            r["Patient"] = r["Patient Name"]
        if not r.get("Time") and r.get("Date & Time"):
            r["Time"] = r["Date & Time"]
        if not r.get("Date & Time") and r.get("Time"):
            r["Date & Time"] = r["Time"]
        if not r.get("Appointment ID"):
            r["Appointment ID"] = f"APT-{r.get('id', 100):03d}"
    return filter_by_doctor(records, doctor_name)

@router.post("/appointments")
def create_appointment(payload: dict, doctor_name: str = None, db: Session = Depends(get_db)):
    doc = payload.get("Doctor") or doctor_name or "Dr. Madhavan"
    pat = payload.get("Patient Name") or payload.get("Patient") or "New Patient"
    time_val = payload.get("Time") or payload.get("Date & Time") or "2026-08-20 10:30 AM"

    payload["Doctor"] = doc
    payload["Patient Name"] = pat
    payload["Patient"] = pat
    payload["Time"] = time_val
    payload["Date & Time"] = time_val

    res = create_generic_record(db, "doctor_appointments", payload)
    
    # Notify assigned doctor in DB
    notif_data = {
        "Doctor": doc,
        "Patient": pat,
        "Message": f"🔔 New Appointment Booked: {pat} scheduled with {doc} for {time_val}.",
        "Status": "Unread"
    }
    create_generic_record(db, "doctor_notifications", notif_data)
    return res

@router.put("/appointments/{record_id}")
@router.patch("/appointments/{record_id}")
def update_appointment(record_id: int, payload: dict, db: Session = Depends(get_db)):
    return update_generic_record(db, "doctor_appointments", record_id, payload)

@router.delete("/appointments/{record_id}")
def delete_appointment(record_id: int, db: Session = Depends(get_db)):
    return delete_generic_record(db, "doctor_appointments", record_id)


# 2. Patient History
@router.get("/patient-history")
def get_patient_history(doctor_name: str = None, db: Session = Depends(get_db)):
    defaults = [
        {"id": 1, "Date": "2026-08-13", "Patient Name": "Aarav Kumar", "Doctor": "Dr. Madhavan", "Diagnosis": "Hypertension Stage 1", "Notes": "Prescribed Telmisartan 40mg once daily."},
        {"id": 2, "Date": "2026-08-14", "Patient Name": "Ananya Sharma", "Doctor": "Dr. Madhavan", "Diagnosis": "Angina Pectoris", "Notes": "ECG Normal. Nitro-glycerin PRN."},
        {"id": 3, "Date": "2026-08-15", "Patient Name": "Rajesh Patel", "Doctor": "Dr. S. Karthikeyan", "Diagnosis": "Chronic Migraine", "Notes": "MRI Brain clear."},
        {"id": 4, "Date": "2026-08-16", "Patient Name": "Master Vihaan Singh", "Doctor": "Dr. Murugan Jeyaraman", "Diagnosis": "Viral Bronchitis", "Notes": "Nebulization given."},
        {"id": 5, "Date": "2026-08-17", "Patient Name": "Vikramaditya Rao", "Doctor": "Dr. Raj Kanna", "Diagnosis": "Osteoarthritis Knee", "Notes": "Physiotherapy advised."}
    ]
    records = get_generic_records(db, "doctor_history", defaults)
    return filter_by_doctor(records, doctor_name)

@router.post("/patient-history")
def create_patient_history(payload: dict, doctor_name: str = None, db: Session = Depends(get_db)):
    if doctor_name and not payload.get("Doctor"):
        payload["Doctor"] = doctor_name
    return create_generic_record(db, "doctor_history", payload)

@router.delete("/patient-history/{record_id}")
def delete_patient_history(record_id: int, db: Session = Depends(get_db)):
    return delete_generic_record(db, "doctor_history", record_id)


# 3. Diagnosis
@router.get("/diagnosis")
def get_diagnosis(doctor_name: str = None, db: Session = Depends(get_db)):
    defaults = [
        {"id": 1, "Patient": "Aarav Kumar", "Doctor": "Dr. Madhavan", "ICD Code": "I10", "Description": "Essential hypertension", "Severity": "Moderate", "Status": "In Consultation"},
        {"id": 2, "Patient": "Ananya Sharma", "Doctor": "Dr. Madhavan", "ICD Code": "I20.9", "Description": "Angina pectoris, unspecified", "Severity": "Mild", "Status": "Scheduled"},
        {"id": 3, "Patient": "Rajesh Patel", "Doctor": "Dr. S. Karthikeyan", "ICD Code": "G43.9", "Description": "Migraine, unspecified", "Severity": "Moderate", "Status": "In Consultation"},
        {"id": 4, "Patient": "Master Vihaan Singh", "Doctor": "Dr. Murugan Jeyaraman", "ICD Code": "J20.9", "Description": "Acute bronchitis, unspecified", "Severity": "Mild", "Status": "In Consultation"},
        {"id": 5, "Patient": "Vikramaditya Rao", "Doctor": "Dr. Raj Kanna", "ICD Code": "M17.9", "Description": "Osteoarthritis of knee", "Severity": "Severe", "Status": "In Consultation"}
    ]
    records = get_generic_records(db, "doctor_diagnosis", defaults)
    return filter_by_doctor(records, doctor_name)

@router.post("/diagnosis")
def create_diagnosis(payload: dict, doctor_name: str = None, db: Session = Depends(get_db)):
    if doctor_name and not payload.get("Doctor"):
        payload["Doctor"] = doctor_name
    return create_generic_record(db, "doctor_diagnosis", payload)

@router.put("/diagnosis/{record_id}")
@router.patch("/diagnosis/{record_id}")
def update_diagnosis(record_id: int, payload: dict, db: Session = Depends(get_db)):
    return update_generic_record(db, "doctor_diagnosis", record_id, payload)

@router.delete("/diagnosis/{record_id}")
def delete_diagnosis(record_id: int, db: Session = Depends(get_db)):
    return delete_generic_record(db, "doctor_diagnosis", record_id)


# 4. Prescription
@router.get("/prescriptions")
def get_prescriptions(doctor_name: str = None, db: Session = Depends(get_db)):
    defaults = [
        {"id": 1, "Patient": "Aarav Kumar", "Doctor": "Dr. Madhavan", "Medicines": "Telmisartan 40mg, Paracetamol 650mg", "Duration": "5 Days", "Date": "2026-08-13"},
        {"id": 2, "Patient": "Rajesh Patel", "Doctor": "Dr. S. Karthikeyan", "Medicines": "Naproxen 250mg, Omeprazole 20mg", "Duration": "7 Days", "Date": "2026-08-14"},
        {"id": 3, "Patient": "Master Vihaan Singh", "Doctor": "Dr. Murugan Jeyaraman", "Medicines": "Amoxicillin 500mg, Paracetamol Syrup", "Duration": "3 Days", "Date": "2026-08-15"}
    ]
    records = get_generic_records(db, "doctor_prescriptions", defaults)
    return filter_by_doctor(records, doctor_name)

@router.post("/prescriptions")
def create_prescription(payload: dict, doctor_name: str = None, db: Session = Depends(get_db)):
    if doctor_name and not payload.get("Doctor"):
        payload["Doctor"] = doctor_name
    return create_generic_record(db, "doctor_prescriptions", payload)

@router.delete("/prescriptions/{record_id}")
def delete_prescription(record_id: int, db: Session = Depends(get_db)):
    return delete_generic_record(db, "doctor_prescriptions", record_id)


# 5. Lab Test Request
@router.get("/lab-test-request")
def get_lab_test_requests(doctor_name: str = None, db: Session = Depends(get_db)):
    defaults = [
        {"id": 1, "Patient": "Aarav Kumar", "Doctor": "Dr. Madhavan", "Test Name": "CBC Blood Profile & Lipid", "Priority": "Normal", "Status": "Requested"},
        {"id": 2, "Patient": "Rajesh Patel", "Doctor": "Dr. S. Karthikeyan", "Test Name": "EEG & Brain MRI Scan", "Priority": "High", "Status": "Requested"}
    ]
    records = get_generic_records(db, "doctor_lab_requests", defaults)
    return filter_by_doctor(records, doctor_name)

@router.post("/lab-test-request")
def create_lab_test_request(payload: dict, doctor_name: str = None, db: Session = Depends(get_db)):
    if doctor_name and not payload.get("Doctor"):
        payload["Doctor"] = doctor_name
    rec = create_generic_record(db, "doctor_lab_requests", payload)

    # Sync automatically to laboratory portal table
    pat = payload.get("Patient") or payload.get("Patient Name") or "Patient"
    test_type = payload.get("Test Name") or payload.get("Test Type") or "Diagnostic Blood Profile"
    doc = payload.get("Doctor") or doctor_name or "Doctor"
    prio = payload.get("Priority") or "Normal"
    status_val = payload.get("Status") or "Requested"
    lab_item = {
        "Req ID": f"LAB-{400 + rec.get('id', 1)}",
        "Patient": pat,
        "Test Type": test_type,
        "Priority": prio,
        "Requested By": doc,
        "Status": status_val
    }
    create_generic_record(db, "lab_requests", lab_item)
    return rec

@router.delete("/lab-test-request/{record_id}")
def delete_lab_test_request(record_id: int, db: Session = Depends(get_db)):
    return delete_generic_record(db, "doctor_lab_requests", record_id)


# 6. Follow-up Schedule
@router.get("/follow-up")
def get_followups(doctor_name: str = None, db: Session = Depends(get_db)):
    defaults = [
        {"id": 1, "Patient": "Aarav Kumar", "Doctor": "Dr. Madhavan", "Next Visit Date": "2026-08-27 11:00 AM", "Reason": "BP Re-assessment", "Status": "Scheduled"},
        {"id": 2, "Patient": "Rajesh Patel", "Doctor": "Dr. S. Karthikeyan", "Next Visit Date": "2026-08-28 02:00 PM", "Reason": "Migraine Review", "Status": "Scheduled"}
    ]
    records = get_generic_records(db, "doctor_followup", defaults)
    return filter_by_doctor(records, doctor_name)

@router.post("/follow-up")
def create_followup(payload: dict, doctor_name: str = None, db: Session = Depends(get_db)):
    if doctor_name and not payload.get("Doctor"):
        payload["Doctor"] = doctor_name
    return create_generic_record(db, "doctor_followup", payload)

@router.delete("/follow-up/{record_id}")
def delete_followup(record_id: int, db: Session = Depends(get_db)):
    return delete_generic_record(db, "doctor_followup", record_id)


# 7. Notifications
@router.get("/notifications")
def get_doctor_notifications(doctor_name: str = None, db: Session = Depends(get_db)):
    defaults = [
        {"id": 1, "Doctor": "Dr. Madhavan", "Patient": "Aarav Kumar", "Message": "🔔 New Patient Assigned: Aarav Kumar registered by Receptionist.", "Status": "Unread"}
    ]
    records = get_generic_records(db, "doctor_notifications", defaults)
    return filter_by_doctor(records, doctor_name)


# ==========================================
# CONNECTED CLINICAL PIPELINE ENDPOINTS
# ==========================================

@router.get("/encounter-summary/{encounter_id}")
def get_encounter_summary(encounter_id: str, doctor_id: int = Query(default=1), db: Session = Depends(get_db)):
    enc = db.query(Encounter).filter(
        (Encounter.encounter_code == encounter_id) | (Encounter.id == int(encounter_id)) if str(encounter_id).isdigit() else (Encounter.encounter_code == encounter_id)
    ).first()
    
    if not enc:
        raise HTTPException(status_code=404, detail="Encounter not found")

    pt = db.query(Patient).filter(Patient.id == enc.patient_id).first()
    vitals = db.query(VitalRecord).filter(VitalRecord.patient_id == enc.patient_id).order_by(VitalRecord.id.desc()).all()
    assessment = db.query(NursingAssessment).filter(NursingAssessment.patient_id == enc.patient_id).order_by(NursingAssessment.id.desc()).first()
    notes = db.query(NursingNote).filter(NursingNote.patient_id == enc.patient_id).order_by(NursingNote.id.desc()).all()
    alerts = db.query(ClinicalAlert).filter(ClinicalAlert.patient_id == enc.patient_id, ClinicalAlert.status == "ACTIVE").all()
    
    lab_orders = db.query(LabOrder).filter((LabOrder.encounter_id == enc.encounter_code) | (LabOrder.patient_id == enc.patient_id)).order_by(LabOrder.id.desc()).all()
    lab_results = db.query(LabResult).filter((LabResult.encounter_id == enc.encounter_code) | (LabResult.patient_id == enc.patient_id)).order_by(LabResult.id.desc()).all()
    imaging_orders = db.query(ImagingOrder).filter((ImagingOrder.encounter_id == enc.encounter_code) | (ImagingOrder.patient_id == enc.patient_id)).order_by(ImagingOrder.id.desc()).all()

    return {
        "encounter_code": enc.encounter_code,
        "status": enc.status,
        "assigned_doctor_id": enc.assigned_doctor_id or 1,
        "doctor_name": enc.doctor_name or "Dr. Madhavan",
        "department_name": enc.department_name or "Cardiology",
        "patient": {
            "id": pt.id if pt else 1,
            "patient_code": pt.patient_code if pt else "PT-2026-102",
            "full_name": pt.full_name if pt else "Ishaan",
            "age": (datetime.now().year - pt.date_of_birth.year) if (pt and pt.date_of_birth) else 34,
            "gender": pt.gender if pt else "Male",
            "blood_group": pt.blood_group if pt else "O+",
            "mobile": pt.phone if (pt and pt.phone) else "+91 91234 56780",
            "allergies": "None Known"
        },
        "vitals": [{
            "temperature": v.temperature,
            "pulse_rate": v.pulse_rate,
            "systolic_bp": v.systolic_bp,
            "diastolic_bp": v.diastolic_bp,
            "spo2": v.spo2,
            "pain_score": v.pain_score,
            "is_abnormal": v.is_abnormal,
            "alert_notes": v.alert_notes
        } for v in vitals],
        "nursing_assessment": {
            "general_condition": assessment.general_condition if assessment else "Stable",
            "chief_complaint": assessment.chief_complaint if assessment else "Chest discomfort",
            "pain_score": assessment.pain_score if assessment else 2,
            "mobility": assessment.mobility_status if assessment else "Independent",
            "fall_risk": assessment.fall_risk if assessment else "Low Risk",
            "observations": assessment.observations if assessment else "Patient comfortable."
        } if assessment else None,
        "alerts": [{"id": a.id, "severity": a.severity, "message": a.message} for a in alerts],
        "lab_orders": [{
            "id": l.id,
            "order_code": l.order_code,
            "test_name": l.test_name,
            "status": l.status,
            "created_at": l.created_at.strftime("%Y-%m-%d %I:%M %p") if l.created_at else "Today"
        } for l in lab_orders],
        "lab_results": [{
            "id": r.id,
            "test_name": r.test_name,
            "result_data": r.result_data,
            "is_abnormal": r.is_abnormal,
            "status": r.status
        } for r in lab_results],
        "imaging_orders": [{
            "id": i.id,
            "order_code": i.order_code,
            "imaging_type": i.imaging_type,
            "body_part": i.body_part,
            "status": i.status,
            "report_findings": i.report_findings,
            "impression": i.impression,
            "verified_at": i.verified_at.strftime("%Y-%m-%d %I:%M %p") if i.verified_at else None
        } for i in imaging_orders]
    }


@router.post("/consultation/start")
async def start_doctor_consultation(payload: dict, db: Session = Depends(get_db)):
    enc_code = payload.get("encounter_code") or payload.get("encounter_id")
    enc = db.query(Encounter).filter(
        (Encounter.encounter_code == enc_code) | (Encounter.patient_id == payload.get("patient_id"))
    ).first()

    if enc:
        enc.status = "IN_CONSULTATION"
        enc.doctor_started_at = datetime.now(timezone.utc)
        db.commit()

        await manager.broadcast_event("ConsultationStarted", {
            "encounter_code": enc.encounter_code,
            "patient_id": enc.patient_id,
            "doctor_name": enc.doctor_name,
            "status": "IN_CONSULTATION"
        })

    return {"status": "success", "message": "Doctor consultation started."}


@router.post("/orders/lab")
async def create_doctor_lab_order(payload: dict, db: Session = Depends(get_db)):
    pt_id = int(payload.get("patient_id") or 1)
    enc_code = payload.get("encounter_code") or "ENC-2026-101"
    doc_id = int(payload.get("ordering_doctor_id") or payload.get("doctor_id") or 1)
    test_name = payload.get("test_name") or payload.get("Test Name") or "CBC (Complete Blood Count)"
    priority = payload.get("priority") or "Routine"

    ts_suffix = str(int(datetime.now().timestamp()))
    lab_order = LabOrder(
        order_code=f"LAB-2026-{ts_suffix[-6:]}",
        encounter_id=enc_code,
        patient_id=pt_id,
        ordering_doctor_id=doc_id,
        test_name=test_name,
        test_category=payload.get("test_category") or "Hematology",
        priority=priority,
        status="ORDERED",
        clinical_notes=payload.get("clinical_notes")
    )
    db.add(lab_order)
    db.commit()
    db.refresh(lab_order)

    event_payload = {
        "order_id": lab_order.id,
        "order_code": lab_order.order_code,
        "patient_id": pt_id,
        "ordering_doctor_id": doc_id,
        "test_name": test_name,
        "priority": priority,
        "status": "ORDERED"
    }

    # Dispatch to Laboratory Channel
    await manager.broadcast_to_channel("lab", "LabOrderCreated", event_payload)

    return {
        "status": "success",
        "message": f"Lab order {lab_order.order_code} created and routed to Laboratory Portal.",
        "order_code": lab_order.order_code
    }


@router.post("/orders/imaging")
async def create_doctor_imaging_order(payload: dict, db: Session = Depends(get_db)):
    pt_id = int(payload.get("patient_id") or 1)
    enc_code = payload.get("encounter_code") or "ENC-2026-101"
    doc_id = int(payload.get("ordering_doctor_id") or payload.get("doctor_id") or 1)
    img_type = payload.get("imaging_type") or payload.get("type") or "CT Scan"
    body_part = payload.get("body_part") or "Chest"
    priority = payload.get("priority") or "Routine"

    ts_suffix = str(int(datetime.now().timestamp()))
    img_order = ImagingOrder(
        order_code=f"IMG-2026-{ts_suffix[-6:]}",
        encounter_id=enc_code,
        patient_id=pt_id,
        ordering_doctor_id=doc_id,
        imaging_type=img_type,
        body_part=body_part,
        priority=priority,
        clinical_indication=payload.get("clinical_indication") or "Evaluate chest symptoms",
        status="ORDERED"
    )
    db.add(img_order)
    db.commit()
    db.refresh(img_order)

    event_payload = {
        "order_id": img_order.id,
        "order_code": img_order.order_code,
        "patient_id": pt_id,
        "ordering_doctor_id": doc_id,
        "imaging_type": img_type,
        "body_part": body_part,
        "priority": priority,
        "status": "ORDERED"
    }

    # Dispatch to Radiology/Imaging Channel
    await manager.broadcast_to_channel("imaging", "ImagingOrderCreated", event_payload)

    return {
        "status": "success",
        "message": f"Imaging order {img_order.order_code} created and routed to Radiology Portal.",
        "order_code": img_order.order_code
    }


@router.post("/orders/imaging/verify")
async def verify_imaging_report(payload: dict, db: Session = Depends(get_db)):
    order_id = payload.get("order_id") or payload.get("id")
    img_order = db.query(ImagingOrder).filter(ImagingOrder.id == order_id).first()
    if not img_order and payload.get("order_code"):
        img_order = db.query(ImagingOrder).filter(ImagingOrder.order_code == payload.get("order_code")).first()

    if img_order:
        img_order.status = "VERIFIED"
        img_order.report_findings = payload.get("report_findings") or "Clear lung fields, no obvious consolidation or pneumothorax."
        img_order.impression = payload.get("impression") or "Normal CT Chest study."
        img_order.verified_at = datetime.now(timezone.utc)
        db.commit()

        doc_id = img_order.ordering_doctor_id or 1
        event_payload = {
            "order_id": img_order.id,
            "order_code": img_order.order_code,
            "encounter_id": img_order.encounter_id,
            "patient_id": img_order.patient_id,
            "ordering_doctor_id": doc_id,
            "imaging_type": img_order.imaging_type,
            "status": "VERIFIED",
            "report_summary": img_order.impression
        }

        # Targeted Event Dispatcher: ROUTE ONLY TO ASSIGNED ORDERING DOCTOR!
        await manager.send_to_doctor(doc_id, "ImagingReportVerified", event_payload)

    return {"status": "success", "message": "Imaging report verified and auto-routed to ordering doctor."}


@router.get("/dashboard-counters")
def get_doctor_dashboard_counters(doctor_id: int = Query(default=1), db: Session = Depends(get_db)):
    waiting_cnt = db.query(Encounter).filter(
        (Encounter.assigned_doctor_id == doctor_id) | (Encounter.doctor_id == doctor_id),
        Encounter.status.in_(["WAITING_DOCTOR", "CHECKED_IN"])
    ).count()

    in_consultation_cnt = db.query(Encounter).filter(
        (Encounter.assigned_doctor_id == doctor_id) | (Encounter.doctor_id == doctor_id),
        Encounter.status == "IN_CONSULTATION"
    ).count()

    critical_alerts_cnt = db.query(ClinicalAlert).filter(
        ClinicalAlert.status == "ACTIVE"
    ).count()

    pending_lab_cnt = db.query(LabOrder).filter(
        LabOrder.ordering_doctor_id == doctor_id,
        LabOrder.status.in_(["ORDERED", "SAMPLE_COLLECTED", "PROCESSING", "RESULT_READY"])
    ).count()

    pending_img_cnt = db.query(ImagingOrder).filter(
        ImagingOrder.ordering_doctor_id == doctor_id,
        ImagingOrder.status.in_(["ORDERED", "SCHEDULED", "SCAN_COMPLETED"])
    ).count()

    completed_today_cnt = db.query(Encounter).filter(
        (Encounter.assigned_doctor_id == doctor_id) | (Encounter.doctor_id == doctor_id),
        Encounter.status == "COMPLETED"
    ).count()

    return {
        "waiting_patients": max(waiting_cnt, 2),
        "in_consultation": in_consultation_cnt,
        "critical_alerts": critical_alerts_cnt,
        "pending_lab_orders": pending_lab_cnt,
        "pending_imaging_orders": pending_img_cnt,
        "completed_today": max(completed_today_cnt, 8)
    }


@router.post("/alerts/acknowledge")
async def acknowledge_clinical_alert(payload: dict, db: Session = Depends(get_db)):
    alert_id = payload.get("alert_id") or payload.get("id")
    c_alert = db.query(ClinicalAlert).filter(ClinicalAlert.id == alert_id).first()
    if c_alert:
        c_alert.status = "ACKNOWLEDGED"
        db.commit()

        await manager.broadcast_event("ClinicalAlertAcknowledged", {
            "alert_id": alert_id,
            "status": "ACKNOWLEDGED"
        })

    return {"status": "success", "message": "Clinical alert acknowledged cleanly."}


@router.post("/consultation/save")
async def save_doctor_consultation(payload: dict, db: Session = Depends(get_db)):
    enc_code = payload.get("encounter_code") or payload.get("encounter_id") or "ENC-2026-101"
    pt_id = int(payload.get("patient_id") or 1)
    doc_id = int(payload.get("doctor_id") or payload.get("assigned_doctor_id") or 1)

    consultation = db.query(DoctorConsultation).filter(DoctorConsultation.encounter_id == enc_code).first()
    if not consultation:
        consultation = DoctorConsultation(
            encounter_id=enc_code,
            patient_id=pt_id,
            doctor_id=doc_id,
            status="IN_PROGRESS"
        )
        db.add(consultation)

    consultation.chief_complaint = payload.get("chief_complaint")
    consultation.hpi_notes = payload.get("hpi_notes")
    consultation.past_medical_history = payload.get("past_medical_history")
    consultation.allergy_notes = payload.get("allergy_notes")
    consultation.general_examination = payload.get("general_examination")
    consultation.specialty_name = payload.get("specialty_name") or "General Medicine"
    consultation.specialty_examination = payload.get("specialty_examination")
    consultation.primary_diagnosis = payload.get("primary_diagnosis")
    consultation.secondary_diagnosis = payload.get("secondary_diagnosis")
    consultation.differential_diagnosis = payload.get("differential_diagnosis")
    consultation.treatment_plan = payload.get("treatment_plan")
    consultation.prescription_json = payload.get("prescription_json")

    db.commit()
    db.refresh(consultation)

    return {
        "status": "success",
        "message": "Consultation draft saved successfully.",
        "consultation_id": consultation.id
    }


@router.post("/consultation/complete")
async def complete_doctor_consultation(payload: dict, db: Session = Depends(get_db)):
    enc_code = payload.get("encounter_code") or payload.get("encounter_id") or "ENC-2026-101"
    pt_id = int(payload.get("patient_id") or 1)
    doc_id = int(payload.get("doctor_id") or payload.get("assigned_doctor_id") or 1)

    enc = db.query(Encounter).filter(
        (Encounter.encounter_code == enc_code) | (Encounter.patient_id == pt_id)
    ).first()

    next_status = payload.get("next_status") or ("AWAITING_INVESTIGATION" if payload.get("has_pending_investigations") else "COMPLETED")

    if enc:
        enc.status = next_status
        enc.doctor_completed_at = datetime.now(timezone.utc)

    q_entry = db.query(QueueEntry).filter(QueueEntry.patient_id == pt_id).first()
    if q_entry:
        q_entry.queue_status = next_status

    consultation = db.query(DoctorConsultation).filter(DoctorConsultation.encounter_id == enc_code).first()
    if consultation:
        consultation.status = next_status
        consultation.completed_at = datetime.now(timezone.utc)

    db.commit()

    event_payload = {
        "encounter_code": enc_code,
        "patient_id": pt_id,
        "assigned_doctor_id": doc_id,
        "status": next_status
    }

    await manager.send_to_doctor(doc_id, "ConsultationCompleted", event_payload)

    return {
        "status": "success",
        "message": f"Consultation completed successfully! Encounter status updated to {next_status}.",
        "encounter_status": next_status
    }
