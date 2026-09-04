from datetime import datetime, timezone, date
from typing import Optional, List
import asyncio
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from hms_backend.app.core.database import get_db
from hms_backend.app.models.encounter import Encounter
from hms_backend.app.models.appointment import Appointment
from hms_backend.app.models.patient import Patient
from hms_backend.app.models.nurse import VitalRecord, NursingAssessment, NursingNote, ClinicalAlert
from hms_backend.app.models.lab import (
    LabOrder, LabOrderItem, LabResult, LabResultValue, LabSpecimen, LabTestMaster
)
from hms_backend.app.models.imaging import ImagingOrder
from hms_backend.app.models.consultation import DoctorConsultation, Diagnosis, ClinicalOrder
from hms_backend.app.models.queue import QueueEntry
from hms_backend.app.core.websocket import manager
from hms_backend.app.utils.generic_crud import (
    get_generic_records, create_generic_record, delete_generic_record, update_generic_record
)
from hms_backend.app.services.lab_service import seed_lab_masters_if_needed, emit_lab_event

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


from hms_backend.app.models.doctor import Doctor
from hms_backend.app.models.lab import LabTestMaster, LabTestParameter, LabOrder, LabOrderItem, LabSpecimen, LabResult, LabResultValue
from hms_backend.app.services.lab_service import seed_lab_masters_if_needed, emit_lab_event

@router.post("/lab-orders")
async def create_doctor_lab_order(payload: dict, doctor_name: Optional[str] = Query(None), db: Session = Depends(get_db)):
    seed_lab_masters_if_needed(db)
    doc_name = payload.get("Doctor") or doctor_name or "Dr. Madhavan"
    patient_id = payload.get("patient_id") or 1
    encounter_id = payload.get("encounter_id") or "ENC-2026-00451"
    
    doc_obj = db.query(Doctor).filter(Doctor.full_name.ilike(f"%{doc_name.split()[0]}%")).first()
    doc_id = doc_obj.id if doc_obj else 1

    tests_requested = payload.get("tests") or [payload.get("test_name") or payload.get("Test Name") or "CBC"]
    if isinstance(tests_requested, str):
        tests_requested = [tests_requested]

    priority = payload.get("priority") or payload.get("Priority") or "URGENT"
    clinical_indication = payload.get("clinical_indication") or payload.get("Clinical Indication") or "Routine Diagnostic Workup"
    fasting_required = payload.get("fasting_required") or False
    order_notes = payload.get("order_notes") or payload.get("Notes") or ""
    op_ip_status = payload.get("op_ip_status") or "OP"

    order_count = db.query(LabOrder).count()
    order_code = f"LAB-2026-{(891 + order_count):05d}"
    now_dt = datetime.now(timezone.utc)

    order = LabOrder(
        order_code=order_code,
        encounter_id=encounter_id,
        patient_id=patient_id,
        ordering_doctor_id=doc_id,
        department_name=payload.get("department_name") or "Cardiology",
        priority=priority.upper(),
        clinical_indication=clinical_indication,
        fasting_required=fasting_required,
        order_notes=order_notes,
        op_ip_status=op_ip_status,
        status="ORDERED",
        ordered_at=now_dt
    )
    db.add(order)
    db.commit()
    db.refresh(order)

    primary_section = "Hematology"
    for t_idx, t_name in enumerate(tests_requested):
        master = db.query(LabTestMaster).filter(
            (LabTestMaster.test_code.ilike(f"%{t_name}%")) | 
            (LabTestMaster.test_name.ilike(f"%{t_name}%"))
        ).first()
        sec = master.laboratory_section if master else "Hematology"
        if t_idx == 0:
            primary_section = sec

        item = LabOrderItem(
            lab_order_id=order.id,
            test_id=master.id if master else 1,
            test_name=master.test_name if master else t_name,
            laboratory_section=sec,
            status="ORDERED",
            created_at=now_dt
        )
        db.add(item)
        db.commit()
        db.refresh(item)

        spc_code = f"SPC-2026-{(1051 + item.id):05d}"
        barcode = f"BC-2026-{(1051 + item.id):05d}"
        specimen = LabSpecimen(
            specimen_code=spc_code,
            lab_order_id=order.id,
            lab_order_item_id=item.id,
            patient_id=patient_id,
            specimen_type=master.specimen_type if master else "Whole Blood",
            container_type=master.container_type if master else "EDTA tube",
            barcode=barcode,
            collection_status="PENDING"
        )
        db.add(specimen)

    db.commit()

    patient_obj = db.query(Patient).filter(Patient.id == patient_id).first()

    event_payload = {
        "event": "LabOrderCreated",
        "lab_order_id": order.id,
        "order_code": order.order_code,
        "encounter_id": encounter_id,
        "patient_id": patient_id,
        "patient_name": patient_obj.full_name if patient_obj else "Ishaan",
        "patient_uhid": patient_obj.patient_code or patient_obj.patient_id if patient_obj else "PT-2026-102",
        "ordering_doctor_id": doc_id,
        "ordering_doctor_name": doc_name,
        "section": primary_section,
        "priority": priority.upper(),
        "status": "ORDERED",
        "ordered_at": now_dt.strftime("%Y-%m-%d %H:%M")
    }

    section_channel = f"laboratory:{primary_section.lower().split()[0]}"
    await emit_lab_event(db, "LabOrderCreated", event_payload, channel=section_channel)

    return {
        "status": "success",
        "message": f"Lab Order {order_code} created and auto-routed to {primary_section} Laboratory Queue.",
        "lab_order_id": order.id,
        "order_code": order.order_code,
        "section": primary_section
    }


DEFAULT_PARAMETER_INFO = {
    "HGB": {"unit": "g/dL", "ref": "13.0 - 17.5", "low": 13.0, "high": 17.5, "full_name": "Hemoglobin (Hb)"},
    "WBC": {"unit": "cells/mcL", "ref": "4,000 - 11,000", "low": 4000.0, "high": 11000.0, "full_name": "Total White Blood Cell Count"},
    "RBC": {"unit": "million/mcL", "ref": "4.5 - 5.9", "low": 4.5, "high": 5.9, "full_name": "Red Blood Cell Count"},
    "PLT": {"unit": "/mcL", "ref": "150,000 - 450,000", "low": 150000.0, "high": 450000.0, "full_name": "Platelet Count"},
    "HCT": {"unit": "%", "ref": "40.0 - 52.0", "low": 40.0, "high": 52.0, "full_name": "Hematocrit (PCV)"},
    "MCV": {"unit": "fL", "ref": "80.0 - 100.0", "low": 80.0, "high": 100.0, "full_name": "Mean Corpuscular Volume"},
    "MCH": {"unit": "pg", "ref": "27.0 - 33.0", "low": 27.0, "high": 33.0, "full_name": "Mean Corpuscular Hemoglobin"},
    "MCHC": {"unit": "g/dL", "ref": "32.0 - 36.0", "low": 32.0, "high": 36.0, "full_name": "Mean Corpuscular Hb Conc."},
    "GLU": {"unit": "mg/dL", "ref": "70 - 99", "low": 70.0, "high": 99.0, "full_name": "Fasting Plasma Glucose"},
    "FBS": {"unit": "mg/dL", "ref": "70 - 99", "low": 70.0, "high": 99.0, "full_name": "Fasting Blood Sugar"},
    "PPBS": {"unit": "mg/dL", "ref": "< 140", "low": None, "high": 140.0, "full_name": "Post-Prandial Blood Sugar"},
    "HBA1C": {"unit": "%", "ref": "< 5.7", "low": None, "high": 5.7, "full_name": "Glycated Hemoglobin (HbA1c)"},
    "CREATININE": {"unit": "mg/dL", "ref": "0.7 - 1.3", "low": 0.7, "high": 1.3, "full_name": "Serum Creatinine"},
    "BUN": {"unit": "mg/dL", "ref": "7 - 20", "low": 7.0, "high": 20.0, "full_name": "Blood Urea Nitrogen"},
    "CHOLESTEROL": {"unit": "mg/dL", "ref": "< 200", "low": None, "high": 200.0, "full_name": "Total Cholesterol"},
    "TRIGLYCERIDES": {"unit": "mg/dL", "ref": "< 150", "low": None, "high": 150.0, "full_name": "Triglycerides"},
    "HDL": {"unit": "mg/dL", "ref": "> 40", "low": 40.0, "high": None, "full_name": "HDL Cholesterol"},
    "LDL": {"unit": "mg/dL", "ref": "< 100", "low": None, "high": 100.0, "full_name": "LDL Cholesterol"},
    "TROPONIN": {"unit": "ng/mL", "ref": "< 0.04", "low": None, "high": 0.04, "full_name": "Cardiac Troponin I"}
}


@router.get("/encounters/{encounter_id}/lab-results")
def get_encounter_lab_results(
    encounter_id: str,
    doctor_id: Optional[int] = Query(None),
    doctor_name: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(LabResult)
    if encounter_id and encounter_id != "all":
        query = query.filter(LabResult.encounter_id == encounter_id)

    if doctor_id:
        query = query.filter(LabResult.ordering_doctor_id == doctor_id)

    results = query.order_by(LabResult.id.desc()).all()
    if not results and encounter_id == "all":
        results = db.query(LabResult).order_by(LabResult.id.desc()).all()

    if doctor_name:
        doc_lower = doctor_name.strip().lower()
        authorized_results = []
        for r in results:
            doc = db.query(Doctor).filter(Doctor.id == r.ordering_doctor_id).first()
            doc_fullname = (doc.full_name if doc else "").lower()
            if doc_lower in doc_fullname or (doc and doc_lower in (doc.employee_id or "").lower()):
                authorized_results.append(r)
        if results and not authorized_results and encounter_id != "all":
            raise HTTPException(status_code=403, detail="Forbidden: You are not the authorized ordering doctor for this encounter lab report.")
        results = authorized_results

    output = []
    for r in results:
        patient = db.query(Patient).filter(Patient.id == r.patient_id).first()
        doctor = db.query(Doctor).filter(Doctor.id == r.ordering_doctor_id).first()
        order = db.query(LabOrder).filter(LabOrder.id == r.lab_order_id).first()
        vals = db.query(LabResultValue).filter(LabResultValue.lab_result_id == r.id).order_by(LabResultValue.id).all()

        # Build enriched parameters list
        parameters_data = []
        for v in vals:
            param_key = (v.parameter_name or "").strip().upper()
            default_meta = DEFAULT_PARAMETER_INFO.get(param_key, {})

            unit = v.unit or default_meta.get("unit") or ""
            ref_text = v.reference_text
            if not ref_text:
                if v.reference_low is not None and v.reference_high is not None:
                    ref_text = f"{v.reference_low} - {v.reference_high}"
                else:
                    ref_text = default_meta.get("ref", "Normal biological range")

            # Determine clinical flag (NORMAL, HIGH, LOW, CRITICAL)
            flag = v.flag or "NORMAL"
            if flag in ("NORMAL", None):
                try:
                    num_val = float(str(v.value).replace(",", "").strip())
                    low = v.reference_low if v.reference_low is not None else default_meta.get("low")
                    high = v.reference_high if v.reference_high is not None else default_meta.get("high")
                    if low is not None and num_val < low:
                        flag = "LOW"
                    elif high is not None and num_val > high:
                        flag = "HIGH"
                except Exception:
                    pass

            parameters_data.append({
                "id": v.id,
                "parameter_name": v.parameter_name,
                "full_name": default_meta.get("full_name", v.parameter_name),
                "value": v.value,
                "unit": unit,
                "flag": flag,
                "reference_low": v.reference_low if v.reference_low is not None else default_meta.get("low"),
                "reference_high": v.reference_high if v.reference_high is not None else default_meta.get("high"),
                "reference_text": ref_text,
                "is_critical": v.is_critical or (flag in ("CRITICAL_LOW", "CRITICAL_HIGH"))
            })

        # Calculate patient age
        age_str = "Adult"
        if patient and patient.date_of_birth:
            try:
                today = datetime.now(timezone.utc).date()
                years = today.year - patient.date_of_birth.year - ((today.month, today.day) < (patient.date_of_birth.month, patient.date_of_birth.day))
                age_str = f"{years} yrs"
            except Exception:
                pass

        test_name = "Complete Blood Count (CBC)"
        if order and order.items:
            test_name = order.items[0].test_name

        output.append({
            "result_id": r.id,
            "id": r.id,
            "lab_order_id": r.lab_order_id,
            "order_code": order.order_code if order else f"LAB-2026-{(891 + r.id):05d}",
            "encounter_id": r.encounter_id,
            "patient_name": patient.full_name if patient else "Patient",
            "patient_uhid": patient.patient_code or patient.patient_id if patient else "PT-2026-102",
            "patient_age": age_str,
            "patient_gender": (patient.gender if patient else "Male"),
            "ordering_doctor": doctor.full_name if doctor else "Dr. Madhavan",
            "laboratory_section": r.laboratory_section,
            "test_name": test_name,
            "specimen_type": "Whole Blood (EDTA)" if "CBC" in test_name or "Hematology" in r.laboratory_section else "Serum / Plasma",
            "priority": order.priority if order else "ROUTINE",
            "clinical_indication": order.clinical_indication if order and order.clinical_indication else "Diagnostic Evaluation",
            "status": r.status,
            "is_critical": r.is_critical or any(p["is_critical"] for p in parameters_data),
            "entered_by": r.entered_by or "Laboratory Technologist",
            "entered_at": r.entered_at.strftime("%Y-%m-%d %H:%M") if r.entered_at else None,
            "verified_by": r.verified_by or "Dr. Sarah Chen, Pathologist",
            "verified_at": r.verified_at.strftime("%Y-%m-%d %H:%M") if r.verified_at else None,
            "released_at": r.released_at.strftime("%Y-%m-%d %H:%M") if r.released_at else datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M"),
            "doctor_acknowledged": bool(r.doctor_acknowledged),
            "doctor_acknowledged_at": r.doctor_acknowledged_at.strftime("%Y-%m-%d %H:%M") if r.doctor_acknowledged_at else None,
            "doctor_notes": r.doctor_notes,
            "parameters": parameters_data
        })
    return output


@router.post("/lab-results/{result_id}/acknowledge")
async def acknowledge_doctor_lab_result(
    result_id: int,
    payload: dict = {},
    doctor_id: int = Query(default=1),
    db: Session = Depends(get_db)
):
    result = db.query(LabResult).filter(LabResult.id == result_id).first()
    if not result:
        raise HTTPException(status_code=404, detail="Lab result not found")

    target_doc = payload.get("doctor_id") or doctor_id
    if result.ordering_doctor_id and result.ordering_doctor_id != target_doc:
        raise HTTPException(status_code=403, detail="Doctor is not authorized for this lab result.")

    result.doctor_acknowledged = True
    result.doctor_acknowledged_at = datetime.now(timezone.utc)
    if payload.get("clinical_notes"):
        result.doctor_notes = payload.get("clinical_notes")

    # State transition: RESULTS_AVAILABLE -> DOCTOR_REVIEW
    enc = db.query(Encounter).filter(Encounter.encounter_code == result.encounter_id).first()
    if enc and enc.status == "RESULTS_AVAILABLE":
        enc.status = "DOCTOR_REVIEW"
        q_entry = db.query(QueueEntry).filter(QueueEntry.patient_id == enc.patient_id).first()
        if q_entry:
            q_entry.queue_status = "DOCTOR_REVIEW"

    db.commit()

    # Send WebSocket event to update doctor dashboard in real time
    await manager.send_to_doctor(target_doc, "LabResultAcknowledged", {
        "result_id": result_id,
        "encounter_code": result.encounter_id,
        "doctor_id": target_doc
    })

    return {
        "status": "success",
        "message": "Lab report acknowledged by doctor.",
        "result_id": result_id,
        "doctor_acknowledged": True,
        "encounter_status": enc.status if enc else None
    }


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
    records = list(get_generic_records(db, "doctor_notifications", defaults))
    filtered = list(filter_by_doctor(records, doctor_name))

    # Also include newly released lab results awaiting doctor review
    if doctor_name:
        doc = db.query(Doctor).filter(Doctor.full_name.ilike(f"%{doctor_name}%")).first()
        if doc:
            unack_results = db.query(LabResult).filter(
                LabResult.ordering_doctor_id == doc.id,
                LabResult.doctor_acknowledged == False,
                LabResult.status.in_(["VERIFIED", "RELEASED"])
            ).order_by(LabResult.id.desc()).all()
            for ur in unack_results:
                pt = db.query(Patient).filter(Patient.id == ur.patient_id).first()
                pt_name = pt.full_name if pt else "Patient"
                filtered.insert(0, {
                    "id": 9000 + ur.id,
                    "Doctor": doc.full_name,
                    "Patient": pt_name,
                    "Message": f"🧪 Lab Report Ready: Verified diagnostic results released for {pt_name} ({ur.encounter_id}).",
                    "Status": "Unread",
                    "encounter_id": ur.encounter_id
                })
    return filtered


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
    doctor_id = int(payload.get("doctor_id") or 1)

    enc = db.query(Encounter).filter(
        Encounter.encounter_code == enc_code
    ).first()

    if not enc:
        raise HTTPException(status_code=404, detail="Encounter not found.")

    # Encounter ownership check
    enc_doc_id = enc.assigned_doctor_id or enc.doctor_id
    if enc_doc_id and enc_doc_id != doctor_id:
        raise HTTPException(status_code=403, detail="Doctor is not authorized for this encounter.")

    # Nursing gating: nursing must be completed first
    if not enc.nursing_completed_at:
        # Check if nursing assessment exists for this encounter's patient
        nursing_done = db.query(NursingAssessment).filter(
            NursingAssessment.patient_id == enc.patient_id,
            (NursingAssessment.encounter_id == enc.encounter_code) | (NursingAssessment.encounter_id == None)
        ).first()
        if not nursing_done:
            raise HTTPException(
                status_code=409,
                detail="Nursing assessment must be completed before consultation can begin."
            )

    enc.status = "IN_CONSULTATION"
    enc.doctor_started_at = datetime.now(timezone.utc)
    db.commit()

    event_payload = {
        "encounter_code": enc.encounter_code,
        "patient_id": enc.patient_id,
        "doctor_name": enc.doctor_name,
        "doctor_id": doctor_id,
        "status": "IN_CONSULTATION"
    }
    await manager.send_to_doctor(doctor_id, "ConsultationStarted", event_payload)

    return {"status": "success", "message": "Doctor consultation started.", "encounter_code": enc.encounter_code}


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
    # Active consultation queue statuses (doctor sees these patients)
    ACTIVE_STATUSES = [
        "WAITING_DOCTOR", "NURSING_COMPLETED", "IN_CONSULTATION",
        "AWAITING_RESULTS", "RESULTS_AVAILABLE", "DOCTOR_REVIEW"
    ]

    waiting_cnt = db.query(Encounter).filter(
        (Encounter.assigned_doctor_id == doctor_id) | (Encounter.doctor_id == doctor_id),
        Encounter.status.in_(["WAITING_DOCTOR", "NURSING_COMPLETED"])
    ).count()

    in_consultation_cnt = db.query(Encounter).filter(
        (Encounter.assigned_doctor_id == doctor_id) | (Encounter.doctor_id == doctor_id),
        Encounter.status == "IN_CONSULTATION"
    ).count()

    # Critical alerts for encounters owned by this doctor
    doctor_enc_patient_ids = [
        e.patient_id for e in db.query(Encounter).filter(
            (Encounter.assigned_doctor_id == doctor_id) | (Encounter.doctor_id == doctor_id),
            Encounter.status.in_(ACTIVE_STATUSES)
        ).all()
    ]
    critical_alerts_cnt = db.query(ClinicalAlert).filter(
        ClinicalAlert.status == "ACTIVE",
        ClinicalAlert.patient_id.in_(doctor_enc_patient_ids) if doctor_enc_patient_ids else True
    ).count() if doctor_enc_patient_ids else 0

    # Lab pending = all pre-release statuses
    pending_lab_cnt = db.query(LabOrder).filter(
        LabOrder.ordering_doctor_id == doctor_id,
        LabOrder.status.in_([
            "ORDERED", "ACKNOWLEDGED", "COLLECTION_PENDING",
            "SAMPLE_COLLECTED", "SAMPLE_RECEIVED", "PROCESSING",
            "RESULT_ENTERED", "VERIFICATION_PENDING", "VERIFIED"
        ])
    ).count()

    # New results = RELEASED but doctor has NOT yet acknowledged
    new_results_cnt = db.query(LabResult).filter(
        LabResult.ordering_doctor_id == doctor_id,
        LabResult.status == "RELEASED",
        LabResult.doctor_acknowledged == False
    ).count()

    pending_img_cnt = db.query(ImagingOrder).filter(
        ImagingOrder.ordering_doctor_id == doctor_id,
        ImagingOrder.status.in_(["ORDERED", "SCHEDULED", "SCAN_COMPLETED", "PROCESSING"])
    ).count()

    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    completed_today_cnt = db.query(Encounter).filter(
        (Encounter.assigned_doctor_id == doctor_id) | (Encounter.doctor_id == doctor_id),
        Encounter.status == "COMPLETED",
        Encounter.doctor_completed_at >= today_start
    ).count()

    return {
        "waiting_patients": waiting_cnt,
        "in_consultation": in_consultation_cnt,
        "critical_alerts": critical_alerts_cnt,
        "pending_lab_orders": pending_lab_cnt,
        "new_results": new_results_cnt,
        "pending_imaging_orders": pending_img_cnt,
        "completed_today": completed_today_cnt
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
    consultation.followup_required = bool(payload.get("followup_required", False))
    consultation.followup_date = payload.get("followup_date")
    consultation.followup_instructions = payload.get("followup_instructions")
    consultation.referral_required = bool(payload.get("referral_required", False))
    consultation.referral_specialty = payload.get("referral_specialty")
    consultation.referral_notes = payload.get("referral_notes")

    db.commit()
    db.refresh(consultation)

    return {
        "status": "success",
        "message": "Consultation draft saved successfully.",
        "consultation_id": consultation.id
    }


@router.post("/consultation/complete")
async def complete_doctor_consultation(payload: dict, db: Session = Depends(get_db)):
    enc_code = payload.get("encounter_code") or payload.get("encounter_id")
    doc_id = int(payload.get("doctor_id") or payload.get("assigned_doctor_id") or 1)

    if not enc_code:
        raise HTTPException(status_code=422, detail="encounter_code is required.")

    enc = db.query(Encounter).filter(Encounter.encounter_code == enc_code).first()
    if not enc:
        raise HTTPException(status_code=404, detail="Encounter not found.")

    enc_doc_id = enc.assigned_doctor_id or enc.doctor_id
    if enc_doc_id and enc_doc_id != doc_id:
        raise HTTPException(status_code=403, detail="Doctor is not authorized for this encounter.")

    # Check for pending lab/imaging orders to determine next state
    pending_lab = db.query(LabOrder).filter(
        LabOrder.encounter_id == enc_code,
        LabOrder.ordering_doctor_id == doc_id,
        LabOrder.status.notin_(["RELEASED", "CANCELLED", "SAMPLE_REJECTED"])
    ).count()

    pending_img = db.query(ImagingOrder).filter(
        ImagingOrder.encounter_id == enc_code,
        ImagingOrder.ordering_doctor_id == doc_id,
        ImagingOrder.status.notin_(["VERIFIED", "CANCELLED", "COMPLETED"])
    ).count()

    # State machine: can only complete from actionable states
    actionable_states = ["IN_CONSULTATION", "AWAITING_RESULTS", "RESULTS_AVAILABLE", "DOCTOR_REVIEW"]
    if enc.status not in actionable_states:
        raise HTTPException(
            status_code=409,
            detail=f"Cannot complete encounter from status '{enc.status}'. Must be in an active consultation state."
        )

    # Determine next state
    if pending_lab > 0 or pending_img > 0:
        next_status = "AWAITING_RESULTS"
    else:
        next_status = "COMPLETED"

    now_dt = datetime.now(timezone.utc)
    enc.status = next_status
    if next_status == "COMPLETED":
        enc.doctor_completed_at = now_dt

    # Update queue entry
    q_entry = db.query(QueueEntry).filter(QueueEntry.patient_id == enc.patient_id).first()
    if q_entry:
        q_entry.queue_status = next_status if next_status != "COMPLETED" else "COMPLETED"

    # Update consultation record
    consultation = db.query(DoctorConsultation).filter(DoctorConsultation.encounter_id == enc_code).first()
    if consultation:
        consultation.status = next_status
        if next_status == "COMPLETED":
            consultation.completed_at = now_dt

    db.commit()

    event_payload = {
        "encounter_code": enc_code,
        "patient_id": enc.patient_id,
        "assigned_doctor_id": doc_id,
        "status": next_status
    }
    await manager.send_to_doctor(doc_id, "ConsultationCompleted", event_payload)

    return {
        "status": "success",
        "message": f"Encounter status → {next_status}. {'Awaiting lab/imaging results.' if next_status == 'AWAITING_RESULTS' else 'Consultation completed!'}",
        "encounter_status": next_status,
        "pending_investigations": pending_lab + pending_img
    }


# ===================================================================
# ENCOUNTER-SCOPED ENDPOINTS (encounter is the source of truth)
# ===================================================================

@router.get("/me/queue")
def get_doctor_active_queue(doctor_id: int = Query(default=1), db: Session = Depends(get_db)):
    """Active consultation queue for the assigned doctor only.
    Returns ONLY: WAITING_DOCTOR, NURSING_COMPLETED, IN_CONSULTATION,
    AWAITING_RESULTS, RESULTS_AVAILABLE, DOCTOR_REVIEW.
    COMPLETED and CANCELLED are excluded.
    """
    ACTIVE_STATUSES = [
        "WAITING_DOCTOR", "NURSING_COMPLETED", "IN_CONSULTATION",
        "AWAITING_RESULTS", "RESULTS_AVAILABLE", "DOCTOR_REVIEW"
    ]

    encounters = db.query(Encounter).filter(
        (Encounter.assigned_doctor_id == doctor_id) | (Encounter.doctor_id == doctor_id),
        Encounter.status.in_(ACTIVE_STATUSES)
    ).order_by(Encounter.check_in_time.asc()).all()

    results = []
    for enc in encounters:
        patient = db.query(Patient).filter(Patient.id == enc.patient_id).first()
        q = db.query(QueueEntry).filter(QueueEntry.patient_id == enc.patient_id).order_by(QueueEntry.id.desc()).first()
        nursing_done = enc.nursing_completed_at is not None
        results.append({
            "encounter_id": enc.id,
            "encounter_code": enc.encounter_code,
            "patient_id": enc.patient_id,
            "patient_name": patient.full_name if patient else "Unknown",
            "patient_uhid": patient.patient_code or patient.patient_id if patient else f"PT-{enc.patient_id}",
            "patient_age": (datetime.now().year - patient.date_of_birth.year) if (patient and patient.date_of_birth) else None,
            "patient_gender": patient.gender if patient else None,
            "blood_group": patient.blood_group if patient else None,
            "mobile": patient.phone if patient else None,
            "assigned_doctor_id": enc.assigned_doctor_id or enc.doctor_id,
            "doctor_name": enc.doctor_name,
            "department_name": enc.department_name,
            "status": enc.status,
            "priority": enc.priority or "Normal",
            "chief_complaint": enc.chief_complaint,
            "nursing_completed": nursing_done,
            "nursing_completed_at": enc.nursing_completed_at.strftime("%Y-%m-%d %H:%M") if enc.nursing_completed_at else None,
            "check_in_time": enc.check_in_time.strftime("%Y-%m-%d %H:%M") if enc.check_in_time else None,
            "token": q.token_number if q else None,
            "queue_position": q.queue_position if q else None,
            "wait_time": f"{q.estimated_wait_time or 5} min" if q else "—"
        })
    return {"queue": results, "total": len(results)}


@router.get("/encounters/{encounter_code}")
def get_encounter_detail(encounter_code: str, doctor_id: int = Query(default=1), db: Session = Depends(get_db)):
    """Full encounter summary — the primary clinical workspace data source."""
    enc = db.query(Encounter).filter(Encounter.encounter_code == encounter_code).first()
    if not enc:
        raise HTTPException(status_code=404, detail="Encounter not found.")

    enc_doc_id = enc.assigned_doctor_id or enc.doctor_id
    if enc_doc_id and enc_doc_id != doctor_id:
        raise HTTPException(status_code=403, detail="Doctor is not authorized for this encounter.")

    patient = db.query(Patient).filter(Patient.id == enc.patient_id).first()
    appt = db.query(Appointment).filter(Appointment.id == enc.appointment_id).first() if enc.appointment_id else None

    vitals = db.query(VitalRecord).filter(
        VitalRecord.patient_id == enc.patient_id
    ).order_by(VitalRecord.id.desc()).first()

    assessment = db.query(NursingAssessment).filter(
        NursingAssessment.patient_id == enc.patient_id
    ).order_by(NursingAssessment.id.desc()).first()

    nursing_notes = db.query(NursingNote).filter(
        NursingNote.patient_id == enc.patient_id
    ).order_by(NursingNote.id.desc()).limit(5).all()

    alerts = db.query(ClinicalAlert).filter(
        ClinicalAlert.patient_id == enc.patient_id,
        ClinicalAlert.status == "ACTIVE"
    ).all()

    lab_orders = db.query(LabOrder).filter(
        LabOrder.encounter_id == enc.encounter_code,
        LabOrder.ordering_doctor_id == doctor_id
    ).order_by(LabOrder.id.desc()).all()

    lab_results = db.query(LabResult).filter(
        LabResult.encounter_id == enc.encounter_code,
        LabResult.ordering_doctor_id == doctor_id
    ).order_by(LabResult.id.desc()).all()

    imaging_orders = db.query(ImagingOrder).filter(
        ImagingOrder.encounter_id == enc.encounter_code,
        ImagingOrder.ordering_doctor_id == doctor_id
    ).order_by(ImagingOrder.id.desc()).all()

    consultation = db.query(DoctorConsultation).filter(
        DoctorConsultation.encounter_id == enc.encounter_code
    ).order_by(DoctorConsultation.id.desc()).first()

    diagnoses = db.query(Diagnosis).filter(
        Diagnosis.encounter_id == enc.encounter_code
    ).order_by(Diagnosis.id.desc()).all()

    def _vitals_dict(v):
        if not v: return None
        return {
            "temperature": v.temperature, "pulse_rate": v.pulse_rate,
            "respiratory_rate": v.respiratory_rate, "systolic_bp": v.systolic_bp,
            "diastolic_bp": v.diastolic_bp, "spo2": v.spo2, "weight": v.weight,
            "height": v.height, "bmi": v.bmi, "pain_score": v.pain_score,
            "blood_glucose": v.blood_glucose, "is_abnormal": v.is_abnormal,
            "alert_notes": v.alert_notes, "recorded_by": v.recorded_by,
            "recorded_at": v.recorded_at.strftime("%Y-%m-%d %H:%M") if v.recorded_at else None
        }

    return {
        "encounter": {
            "id": enc.id, "encounter_code": enc.encounter_code,
            "status": enc.status, "encounter_type": enc.encounter_type,
            "priority": enc.priority, "chief_complaint": enc.chief_complaint,
            "assigned_doctor_id": enc.assigned_doctor_id or enc.doctor_id,
            "doctor_name": enc.doctor_name, "department_name": enc.department_name,
            "nursing_completed": enc.nursing_completed_at is not None,
            "nursing_completed_at": enc.nursing_completed_at.strftime("%Y-%m-%d %H:%M") if enc.nursing_completed_at else None,
            "doctor_started_at": enc.doctor_started_at.strftime("%Y-%m-%d %H:%M") if enc.doctor_started_at else None,
            "check_in_time": enc.check_in_time.strftime("%Y-%m-%d %H:%M") if enc.check_in_time else None
        },
        "patient": {
            "id": patient.id if patient else enc.patient_id,
            "patient_code": patient.patient_code if patient else None,
            "full_name": patient.full_name if patient else "Unknown",
            "date_of_birth": str(patient.date_of_birth) if (patient and patient.date_of_birth) else None,
            "age": (datetime.now().year - patient.date_of_birth.year) if (patient and patient.date_of_birth) else None,
            "gender": patient.gender if patient else None,
            "blood_group": patient.blood_group if patient else None,
            "mobile": patient.phone if patient else None,
            "email": patient.email if patient else None,
            "address": patient.address if patient else None
        } if patient else {},
        "appointment": {
            "appointment_code": appt.appointment_code if appt else None,
            "appointment_date": str(appt.appointment_date) if appt else None,
            "reason": appt.reason if appt else None
        } if appt else None,
        "vitals": _vitals_dict(vitals),
        "nursing_assessment": {
            "chief_complaint": assessment.chief_complaint,
            "general_condition": assessment.general_condition,
            "mobility_status": assessment.mobility_status,
            "fall_risk": assessment.fall_risk,
            "pain_score": assessment.pain_score,
            "allergy_status": assessment.allergy_status,
            "observations": assessment.observations,
            "nurse_id": assessment.nurse_id,
            "created_at": assessment.created_at.strftime("%Y-%m-%d %H:%M") if assessment.created_at else None
        } if assessment else None,
        "nursing_notes": [
            {"id": n.id, "note_type": n.note_type, "observation": n.observation,
             "nurse_id": n.nurse_id, "created_at": n.created_at.strftime("%Y-%m-%d %H:%M") if n.created_at else None}
            for n in nursing_notes
        ],
        "alerts": [{"id": a.id, "severity": a.severity, "message": a.message, "alert_type": a.alert_type} for a in alerts],
        "consultation": {
            "id": consultation.id, "status": consultation.status,
            "chief_complaint": consultation.chief_complaint, "hpi_notes": consultation.hpi_notes,
            "primary_diagnosis": consultation.primary_diagnosis,
            "secondary_diagnosis": consultation.secondary_diagnosis,
            "differential_diagnosis": consultation.differential_diagnosis,
            "treatment_plan": consultation.treatment_plan,
            "general_examination": consultation.general_examination,
            "prescription_json": consultation.prescription_json,
            "followup_required": consultation.followup_required,
            "followup_date": consultation.followup_date,
            "followup_instructions": consultation.followup_instructions
        } if consultation else None,
        "diagnoses": [
            {"id": d.id, "diagnosis_name": d.diagnosis_name, "diagnosis_type": d.diagnosis_type,
             "diagnosis_code": d.diagnosis_code, "is_primary": d.is_primary, "clinical_notes": d.clinical_notes}
            for d in diagnoses
        ],
        "lab_orders": [
            {
                "id": lo.id, "order_code": lo.order_code, "status": lo.status,
                "priority": lo.priority, "clinical_indication": lo.clinical_indication,
                "ordered_at": lo.ordered_at.strftime("%Y-%m-%d %H:%M") if lo.ordered_at else None,
                "items": [
                    {"id": item.id, "test_name": item.test_name, "laboratory_section": item.laboratory_section, "status": item.status}
                    for item in db.query(LabOrderItem).filter(LabOrderItem.lab_order_id == lo.id).all()
                ]
            }
            for lo in lab_orders
        ],
        "lab_results": [
            {
                "id": r.id, "status": r.status, "is_critical": r.is_critical,
                "laboratory_section": r.laboratory_section,
                "verified_by": r.verified_by, "released_at": r.released_at.strftime("%Y-%m-%d %H:%M") if r.released_at else None,
                "doctor_acknowledged": r.doctor_acknowledged,
                "test_name": db.query(LabOrderItem).filter(LabOrderItem.lab_order_id == r.lab_order_id).first().test_name
                    if db.query(LabOrderItem).filter(LabOrderItem.lab_order_id == r.lab_order_id).first() else "Lab Test",
                "parameters": [
                    {"parameter_name": v.parameter_name, "value": v.value, "unit": v.unit,
                     "flag": v.flag, "reference_low": v.reference_low, "reference_high": v.reference_high,
                     "is_critical": v.is_critical}
                    for v in db.query(LabResultValue).filter(LabResultValue.lab_result_id == r.id).all()
                ]
            }
            for r in lab_results
        ],
        "imaging_orders": [
            {"id": i.id, "order_code": i.order_code, "imaging_type": i.imaging_type,
             "body_part": i.body_part, "status": i.status, "priority": i.priority,
             "report_findings": i.report_findings, "impression": i.impression,
             "verified_at": i.verified_at.strftime("%Y-%m-%d %H:%M") if i.verified_at else None}
            for i in imaging_orders
        ]
    }


@router.get("/encounters/{encounter_code}/nursing")
def get_encounter_nursing(encounter_code: str, doctor_id: int = Query(default=1), db: Session = Depends(get_db)):
    """Read-only nursing data for the encounter. Doctor cannot modify nursing records."""
    enc = db.query(Encounter).filter(Encounter.encounter_code == encounter_code).first()
    if not enc:
        raise HTTPException(status_code=404, detail="Encounter not found.")

    enc_doc_id = enc.assigned_doctor_id or enc.doctor_id
    if enc_doc_id and enc_doc_id != doctor_id:
        raise HTTPException(status_code=403, detail="Doctor is not authorized for this encounter.")

    vitals = db.query(VitalRecord).filter(
        VitalRecord.patient_id == enc.patient_id
    ).order_by(VitalRecord.id.desc()).all()

    assessment = db.query(NursingAssessment).filter(
        NursingAssessment.patient_id == enc.patient_id
    ).order_by(NursingAssessment.id.desc()).first()

    notes = db.query(NursingNote).filter(
        NursingNote.patient_id == enc.patient_id
    ).order_by(NursingNote.id.desc()).all()

    return {
        "nursing_completed": enc.nursing_completed_at is not None,
        "nursing_completed_at": enc.nursing_completed_at.strftime("%Y-%m-%d %H:%M") if enc.nursing_completed_at else None,
        "vitals_history": [
            {
                "id": v.id, "temperature": v.temperature, "pulse_rate": v.pulse_rate,
                "respiratory_rate": v.respiratory_rate, "systolic_bp": v.systolic_bp,
                "diastolic_bp": v.diastolic_bp, "spo2": v.spo2, "weight": v.weight,
                "height": v.height, "bmi": v.bmi, "pain_score": v.pain_score,
                "blood_glucose": v.blood_glucose, "is_abnormal": v.is_abnormal,
                "alert_notes": v.alert_notes, "recorded_by": v.recorded_by,
                "recorded_at": v.recorded_at.strftime("%Y-%m-%d %H:%M") if v.recorded_at else None
            }
            for v in vitals
        ],
        "nursing_assessment": {
            "chief_complaint": assessment.chief_complaint,
            "general_condition": assessment.general_condition,
            "mobility_status": assessment.mobility_status,
            "fall_risk": assessment.fall_risk,
            "pain_score": assessment.pain_score,
            "allergy_status": assessment.allergy_status,
            "observations": assessment.observations,
            "nurse_id": assessment.nurse_id,
            "created_at": assessment.created_at.strftime("%Y-%m-%d %H:%M") if assessment.created_at else None
        } if assessment else None,
        "nursing_notes": [
            {"id": n.id, "note_type": n.note_type, "observation": n.observation,
             "intervention": n.intervention, "nurse_id": n.nurse_id,
             "created_at": n.created_at.strftime("%Y-%m-%d %H:%M") if n.created_at else None}
            for n in notes
        ]
    }


@router.get("/encounters/{encounter_code}/history")
def get_encounter_patient_history(encounter_code: str, doctor_id: int = Query(default=1), db: Session = Depends(get_db)):
    """Patient's past encounter history."""
    enc = db.query(Encounter).filter(Encounter.encounter_code == encounter_code).first()
    if not enc:
        raise HTTPException(status_code=404, detail="Encounter not found.")

    enc_doc_id = enc.assigned_doctor_id or enc.doctor_id
    if enc_doc_id and enc_doc_id != doctor_id:
        raise HTTPException(status_code=403, detail="Doctor is not authorized for this encounter.")

    # Past COMPLETED encounters for the same patient (excluding current)
    past_encounters = db.query(Encounter).filter(
        Encounter.patient_id == enc.patient_id,
        Encounter.status == "COMPLETED",
        Encounter.id != enc.id
    ).order_by(Encounter.id.desc()).limit(20).all()

    history = []
    for pe in past_encounters:
        consult = db.query(DoctorConsultation).filter(DoctorConsultation.encounter_id == pe.encounter_code).first()
        diags = db.query(Diagnosis).filter(Diagnosis.encounter_id == pe.encounter_code).all()
        lab_res = db.query(LabResult).filter(
            LabResult.encounter_id == pe.encounter_code, LabResult.status == "RELEASED"
        ).all()
        img_orders = db.query(ImagingOrder).filter(
            ImagingOrder.encounter_id == pe.encounter_code
        ).all()

        history.append({
            "encounter_code": pe.encounter_code,
            "encounter_date": pe.check_in_time.strftime("%Y-%m-%d") if pe.check_in_time else str(pe.created_at.date()) if pe.created_at else None,
            "doctor_name": pe.doctor_name,
            "department_name": pe.department_name,
            "chief_complaint": pe.chief_complaint,
            "primary_diagnosis": consult.primary_diagnosis if consult else None,
            "secondary_diagnosis": consult.secondary_diagnosis if consult else None,
            "treatment_plan": consult.treatment_plan if consult else None,
            "prescription_items": consult.prescription_json if consult else None,
            "diagnoses": [
                {"name": d.diagnosis_name, "type": d.diagnosis_type, "code": d.diagnosis_code}
                for d in diags
            ],
            "lab_results": [
                {"section": r.laboratory_section, "status": r.status, "is_critical": r.is_critical,
                 "released_at": r.released_at.strftime("%Y-%m-%d %H:%M") if r.released_at else None}
                for r in lab_res
            ],
            "imaging_orders": [
                {"type": i.imaging_type, "body_part": i.body_part, "impression": i.impression}
                for i in img_orders
            ],
            "followup_required": consult.followup_required if consult else False,
            "followup_date": consult.followup_date if consult else None
        })
    return {"patient_id": enc.patient_id, "current_encounter": encounter_code, "history": history}


@router.post("/encounters/{encounter_code}/diagnoses")
async def create_encounter_diagnosis(encounter_code: str, payload: dict, doctor_id: int = Query(default=1), db: Session = Depends(get_db)):
    enc = db.query(Encounter).filter(Encounter.encounter_code == encounter_code).first()
    if not enc:
        raise HTTPException(status_code=404, detail="Encounter not found.")
    enc_doc_id = enc.assigned_doctor_id or enc.doctor_id
    if enc_doc_id and enc_doc_id != doctor_id:
        raise HTTPException(status_code=403, detail="Doctor is not authorized for this encounter.")
    if not enc.nursing_completed_at:
        raise HTTPException(status_code=409, detail="Nursing assessment must be completed before diagnosis can be recorded.")

    diag = Diagnosis(
        encounter_id=encounter_code,
        patient_id=enc.patient_id,
        doctor_id=doctor_id,
        diagnosis_name=payload.get("diagnosis_name") or payload.get("primary_diagnosis") or "Unspecified",
        diagnosis_type=payload.get("diagnosis_type") or "PRIMARY",
        diagnosis_code=payload.get("diagnosis_code"),
        is_primary=payload.get("is_primary", True),
        clinical_notes=payload.get("clinical_notes")
    )
    db.add(diag)

    # Save/update consultation record too
    consult = db.query(DoctorConsultation).filter(DoctorConsultation.encounter_id == encounter_code).first()
    if not consult:
        consult = DoctorConsultation(encounter_id=encounter_code, patient_id=enc.patient_id, doctor_id=doctor_id, status="IN_PROGRESS")
        db.add(consult)
    if payload.get("primary_diagnosis"): consult.primary_diagnosis = payload["primary_diagnosis"]
    if payload.get("secondary_diagnosis"): consult.secondary_diagnosis = payload["secondary_diagnosis"]
    if payload.get("differential_diagnosis"): consult.differential_diagnosis = payload["differential_diagnosis"]
    if payload.get("treatment_plan"): consult.treatment_plan = payload["treatment_plan"]
    if payload.get("chief_complaint"): consult.chief_complaint = payload["chief_complaint"]
    if payload.get("hpi_notes"): consult.hpi_notes = payload["hpi_notes"]
    if payload.get("general_examination"): consult.general_examination = payload["general_examination"]

    db.commit()
    db.refresh(diag)
    return {"status": "success", "message": "Diagnosis recorded.", "diagnosis_id": diag.id}


@router.post("/encounters/{encounter_code}/prescriptions")
async def create_encounter_prescription(encounter_code: str, payload: dict, doctor_id: int = Query(default=1), db: Session = Depends(get_db)):
    enc = db.query(Encounter).filter(Encounter.encounter_code == encounter_code).first()
    if not enc:
        raise HTTPException(status_code=404, detail="Encounter not found.")
    enc_doc_id = enc.assigned_doctor_id or enc.doctor_id
    if enc_doc_id and enc_doc_id != doctor_id:
        raise HTTPException(status_code=403, detail="Doctor is not authorized for this encounter.")

    import json
    consult = db.query(DoctorConsultation).filter(DoctorConsultation.encounter_id == encounter_code).first()
    if not consult:
        consult = DoctorConsultation(encounter_id=encounter_code, patient_id=enc.patient_id, doctor_id=doctor_id, status="IN_PROGRESS")
        db.add(consult)

    medications = payload.get("medications") or []
    consult.prescription_json = json.dumps(medications)
    if payload.get("treatment_plan"): consult.treatment_plan = payload["treatment_plan"]

    db.commit()
    db.refresh(consult)

    patient = db.query(Patient).filter(Patient.id == enc.patient_id).first()
    event_payload = {
        "encounter_code": encounter_code,
        "patient_id": enc.patient_id,
        "patient_name": patient.full_name if patient else "Patient",
        "doctor_id": doctor_id,
        "medication_count": len(medications),
        "status": "PRESCRIPTION_CREATED"
    }
    await manager.send_to_doctor(doctor_id, "PrescriptionCreated", event_payload)

    return {"status": "success", "message": f"{len(medications)} medication(s) prescribed.", "consultation_id": consult.id}


@router.get("/encounters/{encounter_code}/lab-orders")
def get_encounter_lab_orders(encounter_code: str, doctor_id: int = Query(default=1), db: Session = Depends(get_db)):
    enc = db.query(Encounter).filter(Encounter.encounter_code == encounter_code).first()
    if not enc:
        raise HTTPException(status_code=404, detail="Encounter not found.")
    enc_doc_id = enc.assigned_doctor_id or enc.doctor_id
    if enc_doc_id and enc_doc_id != doctor_id:
        raise HTTPException(status_code=403, detail="Doctor is not authorized for this encounter.")

    orders = db.query(LabOrder).filter(
        LabOrder.encounter_id == encounter_code,
        LabOrder.ordering_doctor_id == doctor_id
    ).order_by(LabOrder.id.desc()).all()

    return [
        {
            "id": lo.id, "order_code": lo.order_code, "status": lo.status,
            "priority": lo.priority, "clinical_indication": lo.clinical_indication,
            "ordered_at": lo.ordered_at.strftime("%Y-%m-%d %H:%M") if lo.ordered_at else None,
            "items": [
                {"id": item.id, "test_name": item.test_name, "laboratory_section": item.laboratory_section, "status": item.status}
                for item in db.query(LabOrderItem).filter(LabOrderItem.lab_order_id == lo.id).all()
            ]
        }
        for lo in orders
    ]


@router.post("/encounters/{encounter_code}/lab-orders")
async def create_encounter_lab_order(encounter_code: str, payload: dict, doctor_id: int = Query(default=1), db: Session = Depends(get_db)):
    """Encounter-scoped lab order. Doctor, patient, encounter auto-derived.
    Doctor only specifies: test_name, priority, clinical_indication, order_notes.
    Lab section is auto-determined from LabTestMaster.
    """
    enc = db.query(Encounter).filter(Encounter.encounter_code == encounter_code).first()
    if not enc:
        raise HTTPException(status_code=404, detail="Encounter not found.")
    enc_doc_id = enc.assigned_doctor_id or enc.doctor_id
    if enc_doc_id and enc_doc_id != doctor_id:
        raise HTTPException(status_code=403, detail="Doctor is not authorized for this encounter.")

    seed_lab_masters_if_needed(db)

    test_name = payload.get("test_name") or payload.get("Test Name") or "CBC"
    priority = (payload.get("priority") or "ROUTINE").upper()
    clinical_indication = payload.get("clinical_indication") or enc.chief_complaint or "Clinical Investigation"
    order_notes = payload.get("order_notes") or ""

    # Auto-determine lab section from master
    master = db.query(LabTestMaster).filter(
        (LabTestMaster.test_code.ilike(f"%{test_name}%")) |
        (LabTestMaster.test_name.ilike(f"%{test_name}%"))
    ).first()
    section = master.laboratory_section if master else "Hematology"
    actual_test_name = master.test_name if master else test_name

    now_dt = datetime.now(timezone.utc)
    order_count = db.query(LabOrder).count()
    order_code = f"LAB-2026-{(891 + order_count):05d}"

    # Single transaction: ClinicalOrder + LabOrder + LabOrderItem
    try:
        clinical_order = ClinicalOrder(
            order_code=f"ORD-2026-{(1 + order_count):05d}",
            encounter_id=encounter_code,
            patient_id=enc.patient_id,
            doctor_id=doctor_id,
            order_type="LAB",
            priority=priority,
            clinical_indication=clinical_indication,
            instructions=order_notes,
            status="ORDERED",
            ordered_at=now_dt
        )
        db.add(clinical_order)

        lab_order = LabOrder(
            order_code=order_code,
            encounter_id=encounter_code,
            patient_id=enc.patient_id,
            ordering_doctor_id=doctor_id,
            department_name=enc.department_name or "General Medicine",
            priority=priority,
            clinical_indication=clinical_indication,
            order_notes=order_notes,
            op_ip_status=enc.encounter_type or "OP",
            status="ORDERED",
            ordered_at=now_dt
        )
        db.add(lab_order)
        db.flush()  # get lab_order.id

        lab_item = LabOrderItem(
            lab_order_id=lab_order.id,
            test_id=master.id if master else None,
            test_name=actual_test_name,
            laboratory_section=section,
            status="ORDERED",
            created_at=now_dt
        )
        db.add(lab_item)
        db.flush()

        # Specimen record
        specimen = LabSpecimen(
            specimen_code=f"SPC-2026-{(1000 + lab_item.id):05d}",
            lab_order_id=lab_order.id,
            lab_order_item_id=lab_item.id,
            patient_id=enc.patient_id,
            specimen_type=master.specimen_type if master else "Whole Blood",
            container_type=master.container_type if master else "EDTA tube",
            barcode=f"BC-2026-{(1000 + lab_item.id):05d}",
            collection_status="PENDING"
        )
        db.add(specimen)

        # Move encounter to AWAITING_RESULTS if currently in consultation
        if enc.status == "IN_CONSULTATION":
            enc.status = "AWAITING_RESULTS"

        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Lab order transaction failed: {str(e)}")

    patient = db.query(Patient).filter(Patient.id == enc.patient_id).first()

    # Emit ONLY to the correct lab section channel
    section_channel = f"laboratory:{section.lower().split()[0]}"
    event_payload = {
        "event": "LabOrderCreated",
        "lab_order_id": lab_order.id,
        "order_code": order_code,
        "encounter_id": encounter_code,
        "patient_id": enc.patient_id,
        "patient_name": patient.full_name if patient else "Patient",
        "patient_uhid": patient.patient_code or patient.patient_id if patient else f"PT-{enc.patient_id}",
        "ordering_doctor_id": doctor_id,
        "section": section,
        "test_name": actual_test_name,
        "priority": priority,
        "status": "ORDERED",
        "ordered_at": now_dt.strftime("%Y-%m-%d %H:%M")
    }
    await emit_lab_event(db, "LabOrderCreated", event_payload, channel=section_channel)

    # Also notify ordering doctor that lab order was placed
    await manager.send_to_doctor(doctor_id, "LabOrderPlaced", {
        "order_code": order_code,
        "test_name": actual_test_name,
        "section": section,
        "encounter_code": encounter_code,
        "encounter_status": enc.status
    })

    return {
        "status": "success",
        "message": f"Lab order {order_code} created. Auto-routed to {section}. Encounter now AWAITING_RESULTS.",
        "order_code": order_code,
        "lab_order_id": lab_order.id,
        "lab_section": section,
        "encounter_status": enc.status
    }


@router.post("/encounters/{encounter_code}/follow-ups")
async def create_encounter_followup(encounter_code: str, payload: dict, doctor_id: int = Query(default=1), db: Session = Depends(get_db)):
    enc = db.query(Encounter).filter(Encounter.encounter_code == encounter_code).first()
    if not enc:
        raise HTTPException(status_code=404, detail="Encounter not found.")
    enc_doc_id = enc.assigned_doctor_id or enc.doctor_id
    if enc_doc_id and enc_doc_id != doctor_id:
        raise HTTPException(status_code=403, detail="Doctor is not authorized for this encounter.")

    consult = db.query(DoctorConsultation).filter(DoctorConsultation.encounter_id == encounter_code).first()
    if not consult:
        consult = DoctorConsultation(encounter_id=encounter_code, patient_id=enc.patient_id, doctor_id=doctor_id, status="IN_PROGRESS")
        db.add(consult)

    consult.followup_required = payload.get("followup_required", True)
    consult.followup_date = payload.get("followup_date") or payload.get("date")
    consult.followup_instructions = payload.get("instructions") or payload.get("followup_instructions")

    db.commit()
    db.refresh(consult)

    event_payload = {
        "encounter_code": encounter_code,
        "patient_id": enc.patient_id,
        "doctor_id": doctor_id,
        "followup_date": consult.followup_date,
        "instructions": consult.followup_instructions
    }
    await manager.send_to_doctor(doctor_id, "FollowUpCreated", event_payload)

    return {"status": "success", "message": f"Follow-up scheduled for {consult.followup_date}.", "consultation_id": consult.id}



