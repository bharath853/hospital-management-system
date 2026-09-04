import pytest
from fastapi.testclient import TestClient
from hms_backend.app.main import app
from hms_backend.app.core.database import Base, engine, SessionLocal
from hms_backend.app.core.seeder import seed_database
from hms_backend.app.services.admin_service import seed_rbac_and_masters_if_needed, log_audit_event

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    seed_database(db)
    seed_rbac_and_masters_if_needed(db)
    db.close()
    yield


def test_admin_dashboard_counters():
    response = client.get("/api/v1/admin/dashboard-counters")
    assert response.status_code == 200
    data = response.json()
    assert "todays_patients" in data
    assert "checked_in" in data
    assert "waiting" in data
    assert "in_consultation" in data
    assert "admitted" in data
    assert "critical_alerts" in data


def test_admin_department_status():
    response = client.get("/api/v1/admin/department-status")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) > 0


def test_user_lifecycle_and_status_toggle():
    # 1. Create User
    new_user_payload = {
        "Name": "Dr. Test Specialist",
        "Email": "test.specialist@hospital.org",
        "Role": "doctor",
        "Employee ID": "EMP-9999",
        "password": "doctor123"
    }
    create_res = client.post("/api/v1/admin/users", json=new_user_payload)
    assert create_res.status_code == 200
    user_id = create_res.json()["user_id"]

    # 2. Verify User Listed
    users_res = client.get("/api/v1/admin/users")
    assert users_res.status_code == 200
    all_users = users_res.json()
    matched = [u for u in all_users if u["id"] == user_id]
    assert len(matched) == 1
    assert matched[0]["Status"] == "Active"

    # 3. Toggle Status to Deactivated
    toggle_res = client.put(f"/api/v1/admin/users/{user_id}/status", json={"is_active": False, "reason": "Test deactivation"})
    assert toggle_res.status_code == 200
    assert "Deactivated" in toggle_res.json()["message"]


def test_rbac_roles_and_permissions():
    roles_res = client.get("/api/v1/admin/rbac/roles")
    assert roles_res.status_code == 200
    roles = roles_res.json()
    assert len(roles) >= 12

    perms_res = client.get("/api/v1/admin/rbac/permissions")
    assert perms_res.status_code == 200
    perms = perms_res.json()
    assert len(perms) >= 20

    # Update Role Permission Matrix for Role 1
    matrix_res = client.post("/api/v1/admin/rbac/matrix", json={"role_id": 1, "permission_ids": [1, 2, 3]})
    assert matrix_res.status_code == 200
    assert "Permissions updated" in matrix_res.json()["message"]


def test_doctor_directory_management():
    doc_payload = {
        "Doctor Name": "Dr. Anitha Raman",
        "Specialization": "Pediatrics",
        "Employee ID": "DR-5050",
        "Phone": "+91 99887 76655",
        "Availability": "Available"
    }
    create_res = client.post("/api/v1/admin/doctors", json=doc_payload)
    assert create_res.status_code == 200

    list_res = client.get("/api/v1/admin/doctors/directory")
    assert list_res.status_code == 200
    docs = list_res.json()
    matched = [d for d in docs if d["Doctor Name"] == "Dr. Anitha Raman"]
    assert len(matched) == 1


def test_master_data_catalogs():
    master_res = client.get("/api/v1/admin/master-data?category=Specialty")
    assert master_res.status_code == 200
    items = master_res.json()
    assert len(items) > 0

    new_master = {
        "Category": "Specialty",
        "Code": "DERM",
        "Name": "Dermatology",
        "Description": "Skin, hair and nail care"
    }
    add_res = client.post("/api/v1/admin/master-data", json=new_master)
    assert add_res.status_code == 200


def test_lab_test_master_configuration():
    new_lab_master = {
        "Test Code": "THYROID_PANEL",
        "Test Name": "Comprehensive Thyroid Profile (T3, T4, TSH)",
        "Section": "Clinical Chemistry",
        "Specimen": "Serum",
        "Container": "SST Gold Top",
        "tat_minutes": 120
    }
    res = client.post("/api/v1/admin/lab-masters", json=new_lab_master)
    assert res.status_code == 200
    
    list_res = client.get("/api/v1/admin/lab-masters")
    assert list_res.status_code == 200
    masters = list_res.json()
    matched = [m for m in masters if m["Test Code"] == "THYROID_PANEL"]
    assert len(matched) == 1


def test_ward_bed_status_toggle():
    beds_res = client.get("/api/v1/admin/wards-beds")
    assert beds_res.status_code == 200
    beds = beds_res.json()
    assert len(beds) > 0
    
    target_bed_id = beds[0]["id"]
    current_status = beds[0]["Status"]
    next_status = "OCCUPIED" if current_status == "AVAILABLE" else "AVAILABLE"

    update_res = client.put(f"/api/v1/admin/beds/{target_bed_id}/status", json={"status": next_status, "reason": "Admin bed status toggle"})
    assert update_res.status_code == 200


def test_pricing_catalog_management():
    new_service = {
        "Code": "PROC-005",
        "Name": "Echocardiogram 2D",
        "Category": "Procedure",
        "op_rate": "1800"
    }
    create_res = client.post("/api/v1/admin/pricing-catalog", json=new_service)
    assert create_res.status_code == 200

    catalog_res = client.get("/api/v1/admin/pricing-catalog")
    assert catalog_res.status_code == 200
    items = catalog_res.json()
    matched = [i for i in items if i["Code"] == "PROC-005"]
    assert len(matched) == 1


def test_system_health_and_audit_logs():
    health_res = client.get("/api/v1/admin/health")
    assert health_res.status_code == 200
    assert health_res.json()["status"] in ["Healthy", "Degraded"]

    audit_res = client.get("/api/v1/admin/audit-logs")
    assert audit_res.status_code == 200
    assert isinstance(audit_res.json(), list)
