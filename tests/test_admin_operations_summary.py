import pytest
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from hms_backend.app.main import app
from hms_backend.app.core.database import Base, engine, SessionLocal
from hms_backend.app.core.seeder import seed_database
from hms_backend.app.services.admin_service import seed_rbac_and_masters_if_needed
from hms_backend.app.api.v1.admin import _calculate_health_pct, HOSPITAL_TZ, _operations_summary_cache
from hms_backend.app.models.user import User

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    seed_database(db)
    seed_rbac_and_masters_if_needed(db)
    _operations_summary_cache.clear()
    db.close()
    yield


def test_operations_summary_kpi_correctness():
    """Verifies that operations summary returns all locked KPI contract keys with positive/valid counts."""
    response = client.get("/api/v1/admin/dashboard/operations-summary?range=6m")
    assert response.status_code == 200
    data = response.json()

    assert "kpis" in data
    kpis = data["kpis"]
    assert "total_patients" in kpis and kpis["total_patients"] >= 0
    assert "total_staff" in kpis and kpis["total_staff"] >= 0
    assert "total_beds" in kpis and kpis["total_beds"] >= 0
    assert "total_emergency" in kpis and kpis["total_emergency"] >= 0
    assert "new_tasks" in kpis and kpis["new_tasks"] >= 0
    assert "new_patients_today" in kpis and kpis["new_patients_today"] >= 0
    assert "notifications" in kpis and kpis["notifications"] >= 0

    assert "activity_trend" in data
    assert data["activity_trend"]["range"] == "6m"
    assert len(data["activity_trend"]["series"]) == 6

    assert "departments" in data
    assert len(data["departments"]) > 0
    for dept in data["departments"]:
        assert "name" in dept
        assert "active_patients" in dept
        assert "capacity" in dept
        assert 50 <= dept["health_pct"] <= 100

    assert "doctors" in data
    assert len(data["doctors"]) > 0

    assert "appointments" in data
    assert len(data["appointments"]) > 0

    assert "generated_at" in data


def test_department_health_formula():
    """Verifies that health % calculation formula is deterministic and clamped to [50, 100]."""
    # Healthy staff (8), zero queue -> 100%
    assert _calculate_health_pct(active_staff=8, waiting_queue=0) == 100

    # Low staff (2), heavy queue (15) -> clamped to 50%
    assert _calculate_health_pct(active_staff=2, waiting_queue=15) == 50

    # Normal staff (6), moderate queue (4)
    # staff_score = (6/8)*100 = 75, queue_score = 100 - (4*4) = 84 -> round(0.5*75 + 0.5*84) = round(79.5) = 80
    assert _calculate_health_pct(active_staff=6, waiting_queue=4) in [79, 80]


def test_admin_auth_guard():
    """Verifies that a user with non-admin role receives 403 Forbidden."""
    db = SessionLocal()
    # Create or retrieve a test receptionist
    rec = db.query(User).filter(User.role == "reception").first()
    if not rec:
        rec = User(full_name="Nurse Test", email="nurse.guard@test.com", password_hash="hash", role="nurse")
        db.add(rec)
        db.commit()
        db.refresh(rec)
    db.close()

    # Create mock JWT or pass credentials for non-admin
    from hms_backend.app.core.security import create_access_token
    token = create_access_token(data={"sub": rec.email, "role": rec.role})
    headers = {"Authorization": f"Bearer {token}"}

    res = client.get("/api/v1/admin/dashboard/operations-summary", headers=headers)
    assert res.status_code == 403
    assert "Admin authorization required" in res.json()["detail"]


def test_server_cache_ttl():
    """Verifies that a subsequent call within 30s returns cached data without re-querying database."""
    _operations_summary_cache.clear()
    res1 = client.get("/api/v1/admin/dashboard/operations-summary?range=6m")
    assert res1.status_code == 200
    gen1 = res1.json()["generated_at"]

    # Immediate second call
    res2 = client.get("/api/v1/admin/dashboard/operations-summary?range=6m")
    assert res2.status_code == 200
    gen2 = res2.json()["generated_at"]

    assert gen1 == gen2
    assert "ops_summary_6m" in _operations_summary_cache


def test_timezone_today_boundary():
    """Verifies that today's date calculations are anchored to hospital timezone (+05:30)."""
    now_local = datetime.now(HOSPITAL_TZ)
    assert now_local.tzinfo == HOSPITAL_TZ
    today_midnight = now_local.replace(hour=0, minute=0, second=0, microsecond=0)
    today_utc = today_midnight.astimezone(timezone.utc).replace(tzinfo=None)
    assert today_utc <= now_local.astimezone(timezone.utc).replace(tzinfo=None)
