from fastapi import APIRouter
from hms_backend.app.api.v1 import (
    auth, admin, patients, doctors, appointments, opd, ipd, nursing, nurse, laboratory, pharmacy, billing, ambulance, reports, reception, doctor, portal
)

# API v1 Aggregator Router
api_v1_router = APIRouter(prefix="/v1")

api_v1_router.include_router(auth.router)
api_v1_router.include_router(admin.router)
api_v1_router.include_router(patients.router)
api_v1_router.include_router(doctors.router)
api_v1_router.include_router(appointments.router)
api_v1_router.include_router(reception.router)
api_v1_router.include_router(nurse.router)
api_v1_router.include_router(doctor.router)
api_v1_router.include_router(opd.router)
api_v1_router.include_router(ipd.router)
api_v1_router.include_router(nursing.router)
api_v1_router.include_router(laboratory.router)
api_v1_router.include_router(pharmacy.router)
api_v1_router.include_router(billing.router)
api_v1_router.include_router(ambulance.router)
api_v1_router.include_router(reports.router)
api_v1_router.include_router(portal.router)
