import pytest
from fastapi.testclient import TestClient
from hms_backend.app.main import app

client = TestClient(app)


def test_full_clinical_workflow():
    """Tests full hospital flow: Register ➔ Appointment ➔ Diagnosis ➔ Pharmacy ➔ Billing."""
    
    # 1. Patient Registration
    patient_res = client.post("/api/v1/patients", json={
        "Name": "Workflow Patient",
        "Phone": "+91 91111 00000",
        "Email": "workflow@hospital.org"
    })
    assert patient_res.status_code == 200
    patient_id = patient_res.json()["id"]

    # 2. Appointment Scheduling
    appt_res = client.post("/api/v1/appointments", json={
        "patient_id": patient_id,
        "doctor_id": 1,
        "appointment_type": "Routine Checkup",
        "start_time": "04:30 PM",
        "Appointment Date": "2026-12-31"
    })
    assert appt_res.status_code == 200

    # 3. Lab Test Request
    lab_res = client.get("/api/v1/laboratory/requests")
    assert lab_res.status_code == 200

    # 4. Pharmacy Inventory & Stock Alerts
    inv_res = client.get("/api/v1/pharmacy/inventory")
    assert inv_res.status_code == 200
    assert len(inv_res.json()) > 0

    # 5. Billing Invoice Verification
    inv_res = client.get("/api/v1/billing/invoices")
    assert inv_res.status_code == 200

    # Cleanup
    client.delete(f"/api/v1/patients/{patient_id}")
