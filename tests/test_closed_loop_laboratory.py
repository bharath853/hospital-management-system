import pytest
from fastapi.testclient import TestClient
from hms_backend.app.main import app
from hms_backend.app.core.database import SessionLocal
from hms_backend.app.services.lab_service import seed_lab_masters_if_needed
from hms_backend.app.models.patient import Patient
from hms_backend.app.models.doctor import Doctor
from hms_backend.app.models.user import User
from hms_backend.app.models.lab import LabOrder, LabSpecimen, LabResult, LabResultValue

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_database():
    db = SessionLocal()
    # Seed doctors & patients if not present
    doc = db.query(Doctor).filter(Doctor.id == 15).first()
    if not doc:
        doc = Doctor(id=15, employee_id="DR-015", full_name="Dr. Madhavan", specialization="Cardiology")
        db.add(doc)
    
    doc2 = db.query(Doctor).filter(Doctor.id == 16).first()
    if not doc2:
        doc2 = Doctor(id=16, employee_id="DR-016", full_name="Dr. Priya Nair", specialization="General Medicine")
        db.add(doc2)

    pat = db.query(Patient).filter(Patient.id == 102).first()
    if not pat:
        pat = Patient(id=102, patient_code="PT-2026-102", full_name="Ishaan", gender="Male", phone="+91 91234 56780")
        db.add(pat)

    db.commit()
    seed_lab_masters_if_needed(db)
    db.close()
    yield


def test_closed_loop_laboratory_workflow():
    # 1. Doctor creates Lab Order (Dr. Madhavan orders CBC for Ishaan)
    order_payload = {
        "Doctor": "Dr. Madhavan",
        "patient_id": 102,
        "encounter_id": "ENC-2026-00451",
        "tests": ["CBC"],
        "priority": "URGENT",
        "clinical_indication": "Chest discomfort workup"
    }
    res_order = client.post("/api/v1/doctor/lab-orders", json=order_payload)
    assert res_order.status_code == 200
    order_data = res_order.json()
    assert order_data["status"] == "success"
    assert order_data["section"] == "Hematology"
    lab_order_id = order_data["lab_order_id"]

    # 2. Check Dashboard Counters
    res_cnt = client.get("/api/v1/laboratory/dashboard-counters")
    assert res_cnt.status_code == 200
    cnts = res_cnt.json()
    assert cnts["new_orders"] >= 1

    # 3. Check Section Work Queue (Hematology Queue)
    res_q = client.get("/api/v1/laboratory/work-queue?section=Hematology")
    assert res_q.status_code == 200
    queue = res_q.json()
    assert len(queue) >= 1
    assert queue[0]["patient_name"] == "Ishaan"
    assert queue[0]["ordering_doctor_name"] == "Dr. Madhavan"

    # 4. Sample Collection (Generates Specimen ID and Barcode)
    res_col = client.post("/api/v1/laboratory/specimens/collect", json={
        "lab_order_id": lab_order_id,
        "collected_by": "Phlebotomist Staff"
    })
    assert res_col.status_code == 200
    col_data = res_col.json()
    assert col_data["status"] == "success"

    # 5. Sample Reception
    res_rec = client.post("/api/v1/laboratory/specimens/receive", json={
        "lab_order_id": lab_order_id,
        "received_by": "Anil Mehta (Lab Tech)"
    })
    assert res_rec.status_code == 200
    assert res_rec.json()["status"] == "success"

    # 6. Parameter Result Entry & Flag Calculation
    entry_payload = {
        "lab_order_id": lab_order_id,
        "entered_by": "Anil Mehta (Lab Tech)",
        "parameter_values": {
            "HGB": "13.2",
            "RBC": "4.7",
            "WBC": "8500",
            "PLT": "245000",
            "HCT": "41.0",
            "MCV": "88.0",
            "MCH": "29.0",
            "MCHC": "34.0"
        }
    }
    res_entry = client.post("/api/v1/laboratory/results/entry", json=entry_payload)
    assert res_entry.status_code == 200
    result_id = res_entry.json()["result_id"]

    # 7. Technical Verification & Release
    res_ver = client.post("/api/v1/laboratory/results/verify-release", json={
        "result_id": result_id,
        "verified_by": "Anil Mehta (Senior Lab Tech)"
    })
    assert res_ver.status_code == 200
    assert res_ver.json()["status"] == "success"

    # 8. Ordering Doctor Authorized Delivery & Strict Isolation Check
    # Doctor 15 (Dr. Madhavan) MUST succeed
    res_doc15 = client.get("/api/v1/doctor/encounters/ENC-2026-00451/lab-results?doctor_name=Dr.%20Madhavan")
    assert res_doc15.status_code == 200
    results_list = res_doc15.json()
    assert len(results_list) >= 1
    assert results_list[0]["patient_name"] == "Ishaan"
    assert results_list[0]["status"] == "RELEASED"
    assert len(results_list[0]["parameters"]) >= 6

    # Doctor 16 (Dr. Priya Nair) MUST receive 403 Forbidden
    res_doc16 = client.get("/api/v1/doctor/encounters/ENC-2026-00451/lab-results?doctor_name=Dr.%20Priya%20Nair")
    assert res_doc16.status_code == 403

    # 9. Doctor Acknowledge Report
    res_ack = client.post(f"/api/v1/doctor/lab-results/{result_id}/acknowledge", json={
        "clinical_notes": "CBC parameters within normal limits. Continue current therapy."
    })
    assert res_ack.status_code == 200
    assert res_ack.json()["status"] == "success"
