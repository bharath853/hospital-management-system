import pytest
from datetime import datetime, timezone, date
from fastapi.testclient import TestClient
from hms_backend.app.main import app
from hms_backend.app.core.database import SessionLocal
from hms_backend.app.models.patient import Patient
from hms_backend.app.models.encounter import Encounter
from hms_backend.app.models.nurse import NursingAssessment, VitalRecord
from hms_backend.app.models.lab import LabTestMaster, LabOrder, LabResult, LabOrderItem
from hms_backend.app.models.queue import QueueEntry

client = TestClient(app)


def test_doctor_portal_encounter_driven_full_flow():
    db = SessionLocal()

    # 1. Create a test patient
    ts = int(datetime.now().timestamp() * 1000)
    pt = Patient(
        patient_id=f"PT-ENC-{ts}",
        patient_code=f"UHID-ENC-{ts}",
        full_name="Encounter Flow Patient",
        gender="Male",
        date_of_birth=date(1980, 5, 12),
        phone="+91 9988776655"
    )
    db.add(pt)
    db.commit()
    db.refresh(pt)

    # 2. Create Encounter for Doctor 1 (Dr. Madhavan)
    enc_code = f"ENC-TEST-{ts}"
    enc = Encounter(
        encounter_code=enc_code,
        patient_id=pt.id,
        assigned_doctor_id=1,
        doctor_id=1,
        encounter_type="OP",
        status="CHECKED_IN",
        doctor_name="Dr. Madhavan",
        department_name="Cardiology",
        priority="Normal",
        check_in_time=datetime.now(timezone.utc)
    )
    db.add(enc)
    db.commit()
    db.refresh(enc)

    # 3. Verify Nursing Gate: Consultation start should fail (409) if nursing is incomplete
    res_fail = client.post("/api/v1/doctor/consultation/start", json={
        "encounter_code": enc_code,
        "doctor_id": 1
    })
    assert res_fail.status_code == 409
    assert "Nursing assessment must be completed" in res_fail.json()["detail"]

    # 4. Complete nursing assessment
    vitals = VitalRecord(
        patient_id=pt.id,
        encounter_id=enc_code,
        recorded_by="Nurse Sarah",
        temperature=98.4,
        pulse_rate=76,
        systolic_bp=120,
        diastolic_bp=80,
        spo2=98.0
    )
    db.add(vitals)
    assessment = NursingAssessment(
        patient_id=pt.id,
        encounter_id=enc_code,
        nurse_id="Nurse Sarah",
        chief_complaint="Chest pressure on exertion",
        general_condition="Stable"
    )
    db.add(assessment)
    enc.nursing_completed_at = datetime.now(timezone.utc)
    enc.status = "NURSING_COMPLETED"
    db.commit()

    # 5. Verify Queue: Patient appears in Dr. Madhavan's (doctor_id=1) active queue
    queue_res = client.get("/api/v1/doctor/me/queue?doctor_id=1")
    assert queue_res.status_code == 200
    q_data = queue_res.json()
    my_patient = next((p for p in q_data["queue"] if p["encounter_code"] == enc_code), None)
    assert my_patient is not None
    assert my_patient["status"] == "NURSING_COMPLETED"
    assert my_patient["nursing_completed"] is True

    # Verify Isolation: Doctor 2 (Dr. Murugan) does NOT see this encounter
    queue_res_doc2 = client.get("/api/v1/doctor/me/queue?doctor_id=2")
    assert queue_res_doc2.status_code == 200
    doc2_patient = next((p for p in queue_res_doc2.json()["queue"] if p["encounter_code"] == enc_code), None)
    assert doc2_patient is None

    # 6. Verify Ownership Security: Doctor 2 cannot start or access Doctor 1's encounter
    auth_fail = client.get(f"/api/v1/doctor/encounters/{enc_code}?doctor_id=2")
    assert auth_fail.status_code == 403
    assert "not authorized" in auth_fail.json()["detail"]

    auth_start_fail = client.post("/api/v1/doctor/consultation/start", json={
        "encounter_code": enc_code,
        "doctor_id": 2
    })
    assert auth_start_fail.status_code == 403

    # 7. Doctor 1 starts consultation
    start_res = client.post("/api/v1/doctor/consultation/start", json={
        "encounter_code": enc_code,
        "doctor_id": 1
    })
    assert start_res.status_code == 200
    assert start_res.json()["status"] == "success"

    # Verify status changed to IN_CONSULTATION
    db.refresh(enc)
    assert enc.status == "IN_CONSULTATION"

    # 8. Doctor records diagnosis and prescription
    diag_res = client.post(f"/api/v1/doctor/encounters/{enc_code}/diagnoses?doctor_id=1", json={
        "primary_diagnosis": "Stable Angina Pectoris",
        "secondary_diagnosis": "Essential Hypertension",
        "clinical_notes": "Patient presents with exertional discomfort."
    })
    assert diag_res.status_code == 200

    rx_res = client.post(f"/api/v1/doctor/encounters/{enc_code}/prescriptions?doctor_id=1", json={
        "medications": [
            {"name": "Aspirin", "dose": "75mg", "freq": "0-1-0", "duration": "30 Days", "instructions": "After food"},
            {"name": "Atorvastatin", "dose": "20mg", "freq": "0-0-1", "duration": "30 Days", "instructions": "Bedtime"}
        ]
    })
    assert rx_res.status_code == 200

    # 9. Doctor orders CBC lab test (auto-routes to Hematology, moves encounter to AWAITING_RESULTS)
    lab_order_res = client.post(f"/api/v1/doctor/encounters/{enc_code}/lab-orders?doctor_id=1", json={
        "test_name": "CBC",
        "priority": "ROUTINE",
        "clinical_indication": "Evaluate baseline blood counts"
    })
    assert lab_order_res.status_code == 200
    lab_order_data = lab_order_res.json()
    assert lab_order_data["lab_section"] == "Hematology"
    assert lab_order_data["encounter_status"] == "AWAITING_RESULTS"

    # Check encounter in DB is AWAITING_RESULTS
    db.refresh(enc)
    assert enc.status == "AWAITING_RESULTS"

    # 10. Simulate Laboratory Workflow: Collect Specimen -> Receive -> Enter Result -> Verify & Release
    lab_order_id = lab_order_data["lab_order_id"]
    client.post("/api/v1/laboratory/specimens/collect", json={
        "lab_order_id": lab_order_id,
        "collected_by": "Phlebotomist Staff"
    })
    client.post("/api/v1/laboratory/specimens/receive", json={
        "lab_order_id": lab_order_id,
        "received_by": "Anil Mehta (Lab Tech)"
    })
    enter_res = client.post("/api/v1/laboratory/results/entry", json={
        "lab_order_id": lab_order_id,
        "entered_by": "Anil Mehta (Lab Tech)",
        "parameter_values": {"HGB": "13.5", "WBC": "7200", "PLT": "250000"}
    })
    assert enter_res.status_code == 200
    res_id = enter_res.json()["result_id"]

    release_res = client.post(f"/api/v1/laboratory/results/{res_id}/verify-and-release", json={
        "verified_by": "Dr. Sarah Chen, Pathologist"
    })
    assert release_res.status_code == 200

    # 11. Verify state transition: Encounter is now RESULTS_AVAILABLE
    db.refresh(enc)
    assert enc.status == "RESULTS_AVAILABLE"

    # 12. Doctor checks lab results
    get_res = client.get(f"/api/v1/doctor/encounters/{enc_code}/lab-results?doctor_id=1")
    assert get_res.status_code == 200
    res_data = get_res.json()
    res_list = res_data if isinstance(res_data, list) else res_data.get("results", [])
    assert len(res_list) > 0
    assert res_list[0]["status"] == "RELEASED"
    assert res_list[0]["doctor_acknowledged"] is False

    # 13. Doctor acknowledges lab result -> transitions encounter to DOCTOR_REVIEW
    ack_res = client.post(f"/api/v1/doctor/lab-results/{res_id}/acknowledge?doctor_id=1")
    assert ack_res.status_code == 200
    assert ack_res.json()["doctor_acknowledged"] is True
    assert ack_res.json()["encounter_status"] == "DOCTOR_REVIEW"

    db.refresh(enc)
    assert enc.status == "DOCTOR_REVIEW"

    # 14. Doctor schedules follow-up
    fu_res = client.post(f"/api/v1/doctor/encounters/{enc_code}/follow-ups?doctor_id=1", json={
        "followup_required": True,
        "followup_date": "2026-09-17",
        "instructions": "Review lipid panel and stress echo"
    })
    assert fu_res.status_code == 200

    # 15. Complete Consultation -> moves to COMPLETED
    complete_res = client.post("/api/v1/doctor/consultation/complete", json={
        "encounter_code": enc_code,
        "doctor_id": 1
    })
    assert complete_res.status_code == 200
    assert complete_res.json()["encounter_status"] == "COMPLETED"

    # 16. Verify encounter has LEFT active queue
    queue_after = client.get("/api/v1/doctor/me/queue?doctor_id=1").json()
    assert not any(p["encounter_code"] == enc_code for p in queue_after["queue"])

    # 17. Verify Dashboard Counters reflects real DB values
    counters = client.get("/api/v1/doctor/dashboard-counters?doctor_id=1").json()
    assert isinstance(counters["waiting_patients"], int)
    assert isinstance(counters["in_consultation"], int)
    assert isinstance(counters["completed_today"], int)
    assert counters["completed_today"] >= 1
    assert "new_results" in counters

    db.close()
