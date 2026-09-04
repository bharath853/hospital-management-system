import time
import pytest
from fastapi.testclient import TestClient
from hms_backend.app.main import app

client = TestClient(app)


def test_api_response_latency():
    """Verifies that key API endpoints respond in < 200 milliseconds."""
    endpoints = [
        "/health",
        "/api/v1/admin/dashboard",
        "/api/v1/patients",
        "/api/v1/doctors",
        "/api/v1/pharmacy/inventory",
    ]

    for ep in endpoints:
        start_time = time.time()
        res = client.get(ep)
        latency_ms = (time.time() - start_time) * 1000
        
        assert res.status_code == 200
        assert latency_ms < 200, f"Endpoint {ep} latency {latency_ms:.2f}ms exceeded 200ms threshold!"


def test_batch_request_throughput():
    """Verifies backend handles 50 rapid sequential requests without failure."""
    start_time = time.time()
    for _ in range(50):
        res = client.get("/api/v1/admin/dashboard")
        assert res.status_code == 200
    total_time = time.time() - start_time
    avg_ms = (total_time / 50) * 1000
    assert avg_ms < 250, f"Average throughput latency {avg_ms:.2f}ms exceeded performance target."
