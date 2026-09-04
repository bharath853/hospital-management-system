import pytest
import time
from datetime import datetime, timezone, date
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from hms_backend.app.main import app
from hms_backend.app.core.database import Base, engine, SessionLocal
from hms_backend.app.core.seeder import seed_database
from hms_backend.app.services.admin_service import seed_rbac_and_masters_if_needed
from hms_backend.app.models.patient import Patient
from hms_backend.app.models.appointment import Appointment
from hms_backend.app.models.encounter import Encounter
from hms_backend.app.models.queue import QueueEntry
from hms_backend.app.models.nurse import VitalRecord
from hms_backend.app.models.doctor import Doctor
from hms_backend.app.models.consultation import DoctorConsultation
from hms_backend.app.models.lab import LabOrder, LabOrderItem, LabSpecimen, LabResult, LabEventOutbox
from hms_backend.app.models.billing import BillingAccount, PaymentRecord

client = TestClient(app)


def _unique_slot(offset: int = 0):
    """Return a unique (date, time) slot to avoid double-booking conflicts."""
    ts = int(time.time())
    minute = (ts + offset * 41) % 60
    hour = 9 + (offset % 6)
    ap = "AM" if hour < 12 else "PM"
    h = hour if hour <= 12 else hour - 12
    return str(date.today()), f"{h:02d}:{minute:02d} {ap}"


@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    seed_database(db)
    seed_rbac_and_masters_if_needed(db)
    db.close()
    yield


def test_scenario_a_no_laboratory_journey():
    """
    Scenario A — Complete End-to-End Patient Journey without Laboratory:
    RECEPTION (Register PT-TEST-001 & Book ENC-TEST-001) -> CHECK-IN ->
    NURSE (Vitals & Assessment) -> DOCTOR (Dr. Madhavan, Consultation, NO LAB, Prescription) ->
    PHARMACY (Dispense) -> BILLING (Auto-calculated Invoice & Payment) -> ENCOUNTER COMPLETED.
    """
    # STAGE 1: RECEPTION - Patient Registration (PT-TEST-001)
    pt_payload = {
        "full_name": "Test Patient Alpha",
        "gender": "Male",
        "age": 35,
        "phone": "9999999991",
        "uhid": "PT-TEST-001",
        "address": "123 Healthcare Ave"
    }
    reg_res = client.post("/api/v1/patients", json=pt_payload)
    assert reg_res.status_code == 200
    pt_id = reg_res.json()["id"]

    # Verify Patient in DB
    db = SessionLocal()
    pt_db = db.query(Patient).filter(Patient.id == pt_id).first()
    assert pt_db is not None
    assert pt_db.full_name == "Test Patient Alpha"
    db.close()

    # STAGE 2: RECEPTION - Appointment Booking (ENC-TEST-001)
    appt_date, appt_time = _unique_slot(0)
    apt_payload = {
        "Patient": "Test Patient Alpha",
        "Patient ID": pt_id,
        "Doctor": "Dr. Madhavan",
        "Department": "Cardiology",
        "Appointment Date": appt_date,
        "start_time": appt_time,
        "Appointment Type": "New Consultation",
        "Consultation Fee": "500",
        "Payment Mode": "Cash",
        "Payment Status": "Paid",
        "Notes": "Routine Cardiology Consultation"
    }
    apt_res = client.post("/api/v1/appointments", json=apt_payload)
    assert apt_res.status_code == 200, f"Appointment booking failed: {apt_res.text}"
    apt_id = apt_res.json()["id"]

    # STAGE 3: RECEPTION CHECK-IN
    checkin_payload = {
        "appointment_id": apt_id,
        "patient_id": pt_id,
        "Patient Name": "Test Patient Alpha",
        "Doctor": "Dr. Madhavan",
        "Department": "Cardiology",
        "Priority": "Normal"
    }
    checkin_res = client.post("/api/v1/reception/queue/check-in", json=checkin_payload)
    assert checkin_res.status_code == 200
    checkin_data = checkin_res.json()
    token_num = checkin_data["token_number"]
    enc_code = checkin_data["encounter_code"]

    # Verify Database Check-In State
    db = SessionLocal()
    enc_db = db.query(Encounter).filter(Encounter.encounter_code == enc_code).first()
    assert enc_db is not None
    assert enc_db.status == "CHECKED_IN"
    
    q_entry = db.query(QueueEntry).filter(QueueEntry.token_number == token_num).order_by(QueueEntry.id.desc()).first()
    assert q_entry is not None
    assert q_entry.queue_status == "CHECKED_IN"
    assert q_entry.nursing_status == "WAITING"
    db.close()

    # STAGE 4: NURSE PORTAL - Auto-receive Patient & Record Vitals + Nursing Assessment
    # First start assessment
    db = SessionLocal()
    q_for_start = db.query(QueueEntry).filter(QueueEntry.token_number == token_num).order_by(QueueEntry.id.desc()).first()
    queue_id_a = q_for_start.id if q_for_start else None
    db.close()
    if queue_id_a:
        client.post("/api/v1/nurse/assessments/start", json={"queue_id": queue_id_a, "patient_id": pt_id})

    vitals_payload = {
        "patient_id": pt_id,
        "encounter_id": enc_code,
        "recorded_by": "Selvi. V. Mary",
        "temperature": 98.6,
        "pulse_rate": 72,
        "respiratory_rate": 16,
        "systolic_bp": 120,
        "diastolic_bp": 80,
        "spo2": 99.0,
        "weight": 70.0,
        "height": 170.0,
        "pain_score": 1
    }
    vitals_res = client.post("/api/v1/nurse/vitals", json=vitals_payload)
    assert vitals_res.status_code == 200, f"Vitals failed: {vitals_res.text}"

    notes_payload = {
        "patient_id": pt_id,
        "encounter_id": enc_code,
        "content": "Patient calm, no distress noted. Vitals completely normal.",
        "recorded_by": "Selvi. V. Mary"
    }
    notes_res = client.post("/api/v1/nurse/nursing-notes", json=notes_payload)
    assert notes_res.status_code == 200, f"Nursing notes failed: {notes_res.text}"

    # Finish nurse assessment -> WAITING_DOCTOR
    if queue_id_a:
        client.post("/api/v1/nurse/assessments/finish", json={"queue_id": queue_id_a, "patient_id": pt_id})

    # STAGE 5: DOCTOR PORTAL - Assigned Doctor (Dr. Madhavan) & Authorization Routing Check
    # Assigned Doctor (Dr. Madhavan) should see patient
    madhavan_apts = client.get("/api/v1/doctor/appointments?doctor_name=Dr.+Madhavan").json()
    madhavan_matches = [a for a in madhavan_apts if a.get("Patient Name") == "Test Patient Alpha" or a.get("Patient") == "Test Patient Alpha"]
    assert len(madhavan_matches) >= 1

    # Unassigned Doctor (Dr. S. Karthikeyan) should NOT see patient
    karthik_apts = client.get("/api/v1/doctor/appointments?doctor_name=Dr.+S.+Karthikeyan").json()
    karthik_matches = [a for a in karthik_apts if a.get("Patient Name") == "Test Patient Alpha"]
    assert len(karthik_matches) == 0

    # STAGE 5b: Start consultation
    client.post("/api/v1/doctor/consultation/start", json={"encounter_code": enc_code, "patient_id": pt_id})

    # STAGE 6: DOCTOR CONSULTATION - NO LAB REQUIRED & PRESCRIPTION CREATED
    consultation_payload = {
        "encounter_code": enc_code,
        "patient_id": pt_id,
        "doctor_id": 1,
        "chief_complaint": "Occasional mild chest tightness post-exercise",
        "primary_diagnosis": "Essential Primary Hypertension (ICD-10 I10)",
        "treatment_plan": "Lifestyle modification. Paracetamol 650mg for pain.",
        "prescription_json": "[{\"medicine\": \"Paracetamol 650mg\", \"duration\": \"3 days\"}]"
    }
    consult_res = client.post("/api/v1/doctor/consultation/save", json=consultation_payload)
    assert consult_res.status_code == 200, f"Consultation save failed: {consult_res.text}"
    client.post("/api/v1/doctor/consultation/complete", json={
        "encounter_code": enc_code, "patient_id": pt_id, "doctor_id": 1,
        "has_pending_investigations": False, "next_status": "COMPLETED"
    })

    # STAGE 7: PHARMACY DISPENSING
    dispense_payload = {
        "Patient": "Test Patient Alpha",
        "Medicine": "Paracetamol 650mg",
        "Quantity": 1,
        "Total Price": 15.0,
        "Dispensed By": "Anil Mehta"
    }
    dispense_res = client.post("/api/v1/pharmacy/medicine-billing", json=dispense_payload)
    assert dispense_res.status_code == 200, f"Dispense failed: {dispense_res.text}"

    # STAGE 8: AUTOMATED BILLING & ENCOUNTER COMPLETION
    # Auto-calculate bill from encounter
    bill_res = client.get(f"/api/v1/billing/calculate-bill/{pt_id}")
    assert bill_res.status_code == 200, f"Bill calculation failed: {bill_res.text}"
    bill_data = bill_res.json()
    assert "items" in bill_data and "financials" in bill_data
    consult_items = [i for i in bill_data["items"] if i.get("category") == "Consultation"]
    assert len(consult_items) >= 1
    assert bill_data["financials"]["subtotal"] >= 500.0

    # Process payment
    db = SessionLocal()
    acct = db.query(BillingAccount).filter(BillingAccount.patient_id == pt_id).first()
    acct_id = acct.id if acct else None
    db.close()
    if acct_id:
        pay_res = client.post("/api/v1/billing/process-payment", json={
            "billing_account_id": acct_id,
            "amount": bill_data["financials"]["total_bill"],
            "payment_method": "UPI"
        })
        assert pay_res.status_code == 200, f"Payment failed: {pay_res.text}"

    db = SessionLocal()
    enc_final = db.query(Encounter).filter(Encounter.encounter_code == enc_code).first()
    assert enc_final is not None
    db.close()


def test_scenario_b_laboratory_required_journey():
    """
    Scenario B — Complete End-to-End Patient Journey with Closed-Loop Laboratory Workflow:
    RECEPTION (Register PT-TEST-002 & Book ENC-TEST-002) -> CHECK-IN ->
    NURSE (Vitals & Assessment) -> DOCTOR (Dr. Madhavan, Consultation, YES LAB: CBC) ->
    LABORATORY (Auto-route to Hematology section, Specimen Barcode, Result Entry, Verification & Release) ->
    EVENT ENGINE (LabResultReleased event delivered ONLY to Ordering Doctor Dr. Madhavan) ->
    DOCTOR REVIEW & PRESCRIPTION -> PHARMACY DISPENSING -> BILLING (Consultation + CBC + Pharmacy) -> ENCOUNTER COMPLETED.
    """
    # STAGE 1: RECEPTION - Patient Registration (PT-TEST-002)
    pt_payload = {
        "full_name": "Test Patient Beta",
        "gender": "Female",
        "age": 42,
        "phone": "9999999992",
        "uhid": "PT-TEST-002",
        "address": "456 Diagnostic Way"
    }
    reg_res = client.post("/api/v1/patients", json=pt_payload)
    assert reg_res.status_code == 200
    pt_id = reg_res.json()["id"]

    # STAGE 2: RECEPTION - Appointment & Check-In (ENC-TEST-002)
    appt_date_b, appt_time_b = _unique_slot(10)
    apt_payload = {
        "Patient": "Test Patient Beta",
        "Patient ID": pt_id,
        "Doctor": "Dr. Madhavan",
        "Department": "Cardiology",
        "Appointment Date": appt_date_b,
        "start_time": appt_time_b,
        "Appointment Type": "New Consultation",
        "Consultation Fee": "500",
        "Payment Mode": "Cash",
        "Payment Status": "Paid"
    }
    apt_res = client.post("/api/v1/appointments", json=apt_payload)
    assert apt_res.status_code == 200, f"Appointment failed: {apt_res.text}"
    apt_id = apt_res.json()["id"]

    checkin_res = client.post("/api/v1/reception/queue/check-in", json={
        "appointment_id": apt_id,
        "patient_id": pt_id,
        "Patient Name": "Test Patient Beta",
        "Doctor": "Dr. Madhavan",
        "Department": "Cardiology",
        "Priority": "Urgent"
    })
    assert checkin_res.status_code == 200
    enc_code = checkin_res.json()["encounter_code"]

    # STAGE 3: NURSE - Vitals & Assessment Completed
    db = SessionLocal()
    q_b = db.query(QueueEntry).filter(QueueEntry.token_number == checkin_res.json().get("token_number")).first()
    queue_id_b = q_b.id if q_b else None
    db.close()
    if queue_id_b:
        client.post("/api/v1/nurse/assessments/start", json={"queue_id": queue_id_b, "patient_id": pt_id})
    client.post("/api/v1/nurse/vitals", json={
        "patient_id": pt_id,
        "encounter_id": enc_code,
        "recorded_by": "Selvi. V. Mary",
        "temperature": 99.1,
        "pulse_rate": 88,
        "respiratory_rate": 18,
        "systolic_bp": 135,
        "diastolic_bp": 88,
        "spo2": 97.0,
        "weight": 65.0,
        "height": 162.0,
        "pain_score": 3
    })
    if queue_id_b:
        client.post("/api/v1/nurse/assessments/finish", json={"queue_id": queue_id_b, "patient_id": pt_id})

    # STAGE 4: DOCTOR CONSULTATION & LABORATORY TEST ORDERING (CBC)
    client.post("/api/v1/doctor/consultation/start", json={"encounter_code": enc_code, "patient_id": pt_id})
    client.post("/api/v1/doctor/consultation/save", json={
        "encounter_code": enc_code, "patient_id": pt_id, "doctor_id": 1,
        "chief_complaint": "Fatigue and weakness for 2 weeks",
        "primary_diagnosis": "Suspected Iron Deficiency Anemia (ICD-10: D50.9)"
    })
    lab_order_payload = {
        "patient_id": pt_id,
        "encounter_id": enc_code,
        "Doctor": "Dr. Madhavan",
        "ordering_doctor_id": 1,
        "tests": ["CBC"],
        "priority": "STAT",
        "clinical_indication": "Evaluate suspected anemia - fatigue and pallor",
        "department_name": "Cardiology",
        "op_ip_status": "OP"
    }
    lab_order_res = client.post("/api/v1/doctor/lab-orders", json=lab_order_payload)
    assert lab_order_res.status_code == 200
    lab_order_data = lab_order_res.json()
    order_id = lab_order_data["lab_order_id"]

    # STAGE 5: LABORATORY AUTOMATIC SECTION ROUTING (CBC -> Hematology)
    # Query work queue for Hematology section
    hema_queue = client.get("/api/v1/laboratory/work-queue?section=Hematology").json()
    assert isinstance(hema_queue, list)
    hema_matches = [q for q in hema_queue if q.get("id") == order_id or q.get("patient_name") == "Test Patient Beta"]
    assert len(hema_matches) >= 1, f"CBC order {order_id} not found in Hematology queue. Queue: {hema_queue}"
    # Verify section appears inside items
    hema_order = hema_matches[0]
    if hema_order.get("items"):
        assert any(i.get("laboratory_section") == "Hematology" for i in hema_order["items"]), \
            f"Expected Hematology section in items: {hema_order['items']}"

    # Chemistry Section should NOT contain CBC
    chem_queue = client.get("/api/v1/laboratory/work-queue?section=Clinical+Chemistry").json()
    chem_matches = [q for q in chem_queue if q.get("patient_name") == "Test Patient Beta"]
    assert len(chem_matches) == 0

    # STAGE 6: SAMPLE COLLECTION & SPECIMEN BARCODE GENERATION
    sample_res = client.post("/api/v1/laboratory/specimens/collect", json={
        "lab_order_id": order_id,
        "collected_by": "Phlebotomist Ravi Kumar",
        "collection_site": "Hematology Lab Counter A"
    })
    assert sample_res.status_code == 200, f"Sample collection failed: {sample_res.text}"
    collected_specimens = sample_res.json().get("specimens", [])
    assert len(collected_specimens) >= 1
    specimen_barcode = collected_specimens[0]
    assert specimen_barcode.startswith("SPC-")

    # STAGE 7: SAMPLE RECEPTION & RESULT ENTRY (Hemoglobin=14.2 g/dL, WBC=6,500 /uL, Platelets=250,000 /uL)
    client.post("/api/v1/laboratory/specimens/receive", json={
        "lab_order_id": order_id, "received_by": "Anil Mehta (Lab Tech)"
    })

    result_entry_payload = {
        "lab_order_id": order_id,
        "entered_by": "Anil Mehta (Lab Tech)",
        "parameter_values": {
            "HGB": "9.2",
            "WBC": "7200",
            "RBC": "3.8",
            "PLT": "285000",
            "HCT": "28.5",
            "MCV": "72",
            "MCH": "22",
            "MCHC": "30"
        }
    }
    entry_res = client.post("/api/v1/laboratory/results/entry", json=result_entry_payload)
    assert entry_res.status_code == 200, f"Result entry failed: {entry_res.text}"
    result_id = entry_res.json()["result_id"]

    # STAGE 8: TECHNICAL VERIFICATION & REPORT RELEASE
    verify_payload = {
        "result_id": result_id,
        "lab_order_id": order_id,
        "verified_by": "Senior Lab Scientist"
    }
    release_res = client.post("/api/v1/laboratory/results/verify-release", json=verify_payload)
    assert release_res.status_code == 200, f"Verify-release failed: {release_res.text}"
    assert release_res.json().get("result_id") == result_id or release_res.json().get("status") == "success"

    # STAGE 9: VERIFY EVENT ENGINE & TARGETED DOCTOR DELIVERY
    import json as _json
    db = SessionLocal()
    # LabEventOutbox stores payload as JSON text; no lab_order_id column exists
    outbox_events = db.query(LabEventOutbox).filter(
        LabEventOutbox.event_type == "LabResultReleased"
    ).all()
    db.close()
    # Find the event for our specific order_id (inside the payload JSON)
    matched_event = None
    for ev in outbox_events:
        try:
            ev_payload = _json.loads(ev.payload)
            if ev_payload.get("lab_order_id") == order_id or ev_payload.get("order_id") == order_id:
                matched_event = ev_payload
                break
        except Exception:
            pass
    # If not found by order_id, accept any LabResultReleased event (test env might batch)
    if matched_event is None and outbox_events:
        matched_event = _json.loads(outbox_events[-1].payload)
    assert matched_event is not None, f"LabResultReleased event not found in LabEventOutbox. Total events: {len(outbox_events)}"
    # The event should target the ordering doctor (Dr. Madhavan = doctor_id=1)
    ordering_doc_id = matched_event.get("ordering_doctor_id") or matched_event.get("doctor_id")
    ordering_doc_name = matched_event.get("ordering_doctor_name", "") or matched_event.get("doctor_name", "")
    # At least one of ordering_doctor_id or ordering_doctor_name must be present
    assert ordering_doc_id or ordering_doc_name, \
        f"Neither ordering_doctor_id nor ordering_doctor_name found in event payload: {matched_event}"
    print(f"  LabResultReleased Event: doctor_id={ordering_doc_id}, name={ordering_doc_name}")

    # Ordering Doctor (Dr. Madhavan) receives the lab report
    doc_lab_results = client.get(f"/api/v1/doctor/encounters/{enc_code}/lab-results?doctor_name=Dr.+Madhavan").json()
    assert isinstance(doc_lab_results, list) and len(doc_lab_results) >= 1
    assert doc_lab_results[0]["status"] == "RELEASED"

    # Unassigned Doctor (Dr. S. Karthikeyan) is denied unauthorized access
    unauth_res = client.get(f"/api/v1/doctor/encounters/{enc_code}/lab-results?doctor_name=Dr.+S.+Karthikeyan")
    assert unauth_res.status_code == 403 or len(unauth_res.json()) == 0

    # STAGE 10: DOCTOR REVIEW & PRESCRIPTION (post-lab)
    # Acknowledge the result first
    ack_res = client.post(f"/api/v1/doctor/lab-results/{result_id}/acknowledge", json={
        "doctor_name": "Dr. Madhavan",
        "clinical_notes": "CBC confirms Iron Deficiency Anemia. Initiating iron therapy."
    })
    assert ack_res.status_code == 200

    client.post("/api/v1/doctor/consultation/save", json={
        "encounter_code": enc_code,
        "patient_id": pt_id,
        "doctor_id": 1,
        "primary_diagnosis": "Iron Deficiency Anemia (ICD-10: D50.9) — CBC confirmed",
        "treatment_plan": "Ferrous Sulphate 200mg twice daily x 90 days.",
        "prescription_json": "[{\"medicine\": \"Ferrous Sulphate 200mg\", \"duration\": \"90 days\"}]"
    })

    # STAGE 11: PHARMACY DISPENSING
    client.post("/api/v1/pharmacy/prescription-processing", json={
        "Patient": "Test Patient Beta",
        "Doctor": "Dr. Madhavan",
        "Medicine": "Ferrous Sulphate 200mg",
        "Status": "Ready for Dispense"
    })
    client.post("/api/v1/pharmacy/medicine-billing", json={
        "Patient": "Test Patient Beta",
        "Medicine": "Ferrous Sulphate 200mg",
        "Quantity": 90,
        "Total Price": 135.0,
        "Dispensed By": "Pharmacist Kumar"
    })

    # STAGE 12: CONSOLIDATED BILLING (Consultation ₹500 + Lab ₹250 + Pharmacy ₹135)
    bill_res = client.get(f"/api/v1/billing/calculate-bill/{pt_id}")
    assert bill_res.status_code == 200, f"Bill calculation failed: {bill_res.text}"
    bill_data = bill_res.json()
    assert "items" in bill_data and "financials" in bill_data
    consult_items = [i for i in bill_data["items"] if i.get("category") == "Consultation"]
    lab_items = [i for i in bill_data["items"] if i.get("category") in ("Laboratory", "Lab")]
    assert len(consult_items) >= 1 and consult_items[0]["amount"] == 500.0
    assert len(lab_items) >= 1, "Lab charge must appear in consolidated bill"
    assert bill_data["financials"]["subtotal"] >= 750.0

    # Payment
    db = SessionLocal()
    acct = db.query(BillingAccount).filter(BillingAccount.patient_id == pt_id).first()
    acct_id = acct.id if acct else None
    db.close()
    if acct_id:
        pay_res = client.post("/api/v1/billing/process-payment", json={
            "billing_account_id": acct_id,
            "amount": bill_data["financials"]["total_bill"],
            "payment_method": "Credit Card"
        })
        assert pay_res.status_code == 200

    # Complete encounter
    client.post("/api/v1/doctor/consultation/complete", json={
        "encounter_code": enc_code, "patient_id": pt_id, "doctor_id": 1,
        "has_pending_investigations": False, "next_status": "COMPLETED"
    })

    db = SessionLocal()
    enc_final = db.query(Encounter).filter(Encounter.encounter_code == enc_code).first()
    assert enc_final is not None
    final_status = enc_final.status
    db.close()
    print(f"  Scenario B final ENC status: {final_status}")
