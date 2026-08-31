from datetime import datetime, timezone
import asyncio
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from hms_backend.app.core.database import get_db
from hms_backend.app.models.lab import LabOrder, LabResult
from hms_backend.app.core.websocket import manager
from hms_backend.app.utils.generic_crud import (
    get_generic_records, create_generic_record, delete_generic_record
)

router = APIRouter(prefix="/laboratory", tags=["laboratory"])


# 1. Test Request
@router.get("/test-request")
@router.get("/requests")
def get_test_requests(db: Session = Depends(get_db)):
    defaults = [
        {"id": 1, "Req ID": "LAB-401", "Patient": "Aarav Kumar", "Test Type": "CBC Blood Profile & Lipid", "Priority": "Normal", "Requested By": "Dr. Madhavan", "Status": "Requested"},
        {"id": 2, "Req ID": "LAB-402", "Patient": "Rajesh Patel", "Test Type": "EEG & Brain MRI Scan", "Priority": "High", "Requested By": "Dr. S. Karthikeyan", "Status": "Requested"},
        {"id": 3, "Req ID": "LAB-403", "Patient": "Master Vihaan Singh", "Test Type": "Pediatric Sputum Culture", "Priority": "Normal", "Requested By": "Dr. Murugan Jeyaraman", "Status": "Requested"},
        {"id": 4, "Req ID": "LAB-404", "Patient": "Vikramaditya Rao", "Test Type": "Synovial Fluid Analysis", "Priority": "High", "Requested By": "Dr. Raj Kanna", "Status": "Requested"}
    ]
    records = get_generic_records(db, "lab_requests", defaults)
    doc_lab_requests = get_generic_records(db, "doctor_lab_requests", [])
    for dlr in doc_lab_requests:
        req_id = f"LAB-{500 + dlr.get('id', 1)}"
        pat = dlr.get("Patient") or dlr.get("Patient Name") or "Patient"
        test_name = dlr.get("Test Name") or dlr.get("Test Type") or "Prescribed Test"
        doc = dlr.get("Doctor") or "Doctor"
        prio = dlr.get("Priority") or "Normal"
        st = dlr.get("Status") or "Requested"
        if not any(r.get("Req ID") == req_id or (r.get("Patient") == pat and r.get("Test Type") == test_name) for r in records):
            records.append({
                "id": 1000 + dlr.get("id", 1),
                "Req ID": req_id,
                "Patient": pat,
                "Test Type": test_name,
                "Priority": prio,
                "Requested By": doc,
                "Status": st
            })
    return records

@router.post("/test-request")
def create_test_request(payload: dict, db: Session = Depends(get_db)):
    return create_generic_record(db, "lab_requests", payload)

@router.delete("/test-request/{record_id}")
def delete_test_request(record_id: int, db: Session = Depends(get_db)):
    return delete_generic_record(db, "lab_requests", record_id)


# 2. Sample Collection
@router.get("/sample-collection")
@router.get("/samples")
def get_sample_collections(db: Session = Depends(get_db)):
    defaults = [
        {"id": 1, "Sample ID": "SMP-991", "Patient": "Aarav Kumar", "Test Name": "CBC Blood Sample", "Collected By": "Anil Mehta", "Status": "Collected"}
    ]
    return get_generic_records(db, "lab_samples", defaults)

@router.post("/sample-collection")
def create_sample_collection(payload: dict, db: Session = Depends(get_db)):
    return create_generic_record(db, "lab_samples", payload)

@router.delete("/sample-collection/{record_id}")
def delete_sample_collection(record_id: int, db: Session = Depends(get_db)):
    return delete_generic_record(db, "lab_samples", record_id)


# 3. Report Entry & Result Verification Engine
@router.get("/report-entry")
@router.get("/reports")
def get_report_entries(db: Session = Depends(get_db)):
    defaults = [
        {"id": 1, "Test ID": "LAB-401", "Patient": "Aarav Kumar", "Result Summary": "Hemoglobin 14.2 g/dL (Normal)", "Verified By": "Anil Mehta", "Status": "Verified"}
    ]
    return get_generic_records(db, "lab_report_entries", defaults)

@router.post("/report-entry")
def create_report_entry(payload: dict, db: Session = Depends(get_db)):
    return create_generic_record(db, "lab_report_entries", payload)

@router.delete("/report-entry/{record_id}")
def delete_report_entry(record_id: int, db: Session = Depends(get_db)):
    return delete_generic_record(db, "lab_report_entries", record_id)


@router.post("/verify-result")
async def verify_lab_result(payload: dict, db: Session = Depends(get_db)):
    order_id = payload.get("order_id") or payload.get("lab_order_id") or payload.get("id")
    order_code = payload.get("order_code")
    
    order = None
    if order_id:
        order = db.query(LabOrder).filter(LabOrder.id == order_id).first()
    elif order_code:
        order = db.query(LabOrder).filter(LabOrder.order_code == order_code).first()

    result_summary = payload.get("result_data") or "Hemoglobin: 12.8 g/dL, WBC: 8,200 /µL, Platelets: 245,000 /µL (Normal)"
    is_abnormal = payload.get("is_abnormal") or False
    doc_id = (order.ordering_doctor_id if order else None) or payload.get("ordering_doctor_id") or 1

    if order:
        order.status = "VERIFIED"
        order.sample_status = "RESULT_READY"

    lab_res = LabResult(
        lab_order_id=order.id if order else 1,
        encounter_id=order.encounter_id if order else "ENC-2026-101",
        patient_id=order.patient_id if order else 1,
        test_name=order.test_name if order else "CBC Test",
        result_data=result_summary,
        is_abnormal=is_abnormal,
        status="VERIFIED",
        verified_by=payload.get("verified_by") or "Anil Mehta (Lab Tech)",
        resulted_at=datetime.now(timezone.utc),
        verified_at=datetime.now(timezone.utc)
    )
    db.add(lab_res)
    db.commit()
    db.refresh(lab_res)

    event_payload = {
        "lab_result_id": lab_res.id,
        "lab_order_id": order.id if order else 1,
        "order_code": order.order_code if order else "LAB-2026-001",
        "encounter_id": order.encounter_id if order else "ENC-2026-101",
        "patient_id": order.patient_id if order else 1,
        "ordering_doctor_id": doc_id,
        "test_name": order.test_name if order else "CBC Test",
        "result_summary": result_summary,
        "is_abnormal": is_abnormal,
        "status": "VERIFIED"
    }

    # Targeted Event Dispatcher: ROUTE ONLY TO ASSIGNED ORDERING DOCTOR!
    await manager.send_to_doctor(doc_id, "LabResultVerified", event_payload)

    return {
        "status": "success",
        "message": f"Lab result verified and auto-routed to Ordering Doctor (Doctor ID: {doc_id}).",
        "result_id": lab_res.id
    }


# 4. Report Upload
@router.get("/report-upload")
def get_report_uploads(db: Session = Depends(get_db)):
    defaults = [
        {"id": 1, "Document ID": "DOC-201", "Patient": "Siddharth Roy", "File Name": "Knee_MRI_Scan.pdf", "Upload Date": "2026-08-13", "Status": "Completed"}
    ]
    return get_generic_records(db, "lab_report_uploads", defaults)

@router.post("/report-upload")
def create_report_upload(payload: dict, db: Session = Depends(get_db)):
    return create_generic_record(db, "lab_report_uploads", payload)

@router.delete("/report-upload/{record_id}")
def delete_report_upload(record_id: int, db: Session = Depends(get_db)):
    return delete_generic_record(db, "lab_report_uploads", record_id)
