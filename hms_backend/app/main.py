from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from hms_backend.app.core.database import Base, engine, SessionLocal
from hms_backend.app.core.seeder import seed_database
from hms_backend.app.api.v1.router import api_v1_router

# Import models to ensure they are registered with Base.metadata
import hms_backend.app.models.user
import hms_backend.app.models.patient
import hms_backend.app.models.doctor
import hms_backend.app.models.staff
import hms_backend.app.models.department
import hms_backend.app.models.appointment
import hms_backend.app.models.opd
import hms_backend.app.models.ipd
import hms_backend.app.models.prescription
import hms_backend.app.models.lab
import hms_backend.app.models.pharmacy
import hms_backend.app.models.billing
import hms_backend.app.models.ambulance
import hms_backend.app.models.audit
import hms_backend.app.models.generic
import hms_backend.app.models.queue
import hms_backend.app.models.encounter
import hms_backend.app.models.imaging
import json

from hms_backend.app.core.websocket import manager, WebSocket, WebSocketDisconnect

from hms_backend.app.services.lab_service import seed_lab_masters_if_needed
from hms_backend.app.services.admin_service import seed_rbac_and_masters_if_needed

# Ensure all tables are created in SQLite database
Base.metadata.create_all(bind=engine)
db_init = SessionLocal()
try:
    seed_database(db_init)
    seed_lab_masters_if_needed(db_init)
    seed_rbac_and_masters_if_needed(db_init)
finally:
    db_init.close()

from hms_backend.app.routers import (
    admin, reception, doctor, nurse, laboratory, pharmacy, inpatient, billing, portal
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_database(db)
        seed_lab_masters_if_needed(db)
        seed_rbac_and_masters_if_needed(db)
    finally:
        db.close()
    yield


app = FastAPI(title="Hospital Management API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register v1 router under /api
app.include_router(api_v1_router, prefix="/api")

# Register direct module routers
app.include_router(admin.router)
app.include_router(reception.router)
app.include_router(doctor.router)
app.include_router(nurse.router)
app.include_router(laboratory.router)
app.include_router(pharmacy.router)
app.include_router(inpatient.router)
app.include_router(billing.router)
app.include_router(portal.router)


@app.get("/")
def read_root():
    return {
        "message": "Hospital Management API is running",
        "docs_url": "/docs",
        "version": "1.0.0"
    }


@app.get("/health")
def health_check():
    with engine.begin() as conn:
        conn.execute(text("SELECT 1"))
    return {"status": "ok"}


@app.post("/api/auth/login")
def legacy_login():
    return {"token": "demo-token", "role": "admin", "name": "Demo Admin"}


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, channel: str = None):
    await manager.connect(websocket, channel=channel)
    try:
        while True:
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
                if msg.get("action") == "subscribe" and msg.get("channel"):
                    manager.subscribe(websocket, msg["channel"])
                    await websocket.send_text(f'{{"event": "SUBSCRIBED", "channel": "{msg["channel"]}"}}')
                else:
                    await websocket.send_text(f'{{"event": "PONG", "data": "{data}"}}')
            except Exception:
                await websocket.send_text(f'{{"event": "PONG", "data": "{data}"}}')
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        manager.disconnect(websocket)



