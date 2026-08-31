from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from hms_backend.app.core.database import get_db
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
