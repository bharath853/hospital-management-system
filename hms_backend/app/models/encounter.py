from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from hms_backend.app.core.database import Base


class Encounter(Base):
    __tablename__ = "encounters"

    id = Column(Integer, primary_key=True, index=True)
    encounter_code = Column(String(50), unique=True, index=True, nullable=False) # e.g. ENC-2026-00451
    
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    appointment_id = Column(Integer, ForeignKey("appointments.id"), nullable=True)
    ip_admission_id = Column(String(50), nullable=True)
    
    encounter_type = Column(String(50), default="OP") # OP, IP, EMERGENCY
    
    # STATUS LIFECYCLE: SCHEDULED -> CHECKED_IN -> WAITING_NURSE -> NURSING_IN_PROGRESS -> NURSING_COMPLETED -> WAITING_DOCTOR -> IN_CONSULTATION -> COMPLETED -> CANCELLED
    status = Column(String(50), default="SCHEDULED")
    
    assigned_doctor_id = Column(Integer, ForeignKey("doctors.id"), nullable=True)
    doctor_id = Column(Integer, ForeignKey("doctors.id"), nullable=True)
    doctor_name = Column(String(120), nullable=True)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    department_name = Column(String(120), nullable=True)
    
    chief_complaint = Column(Text, nullable=True)
    priority = Column(String(50), default="Normal") # Emergency, Urgent, Normal
    
    arrival_time = Column(DateTime, nullable=True)
    check_in_time = Column(DateTime, nullable=True)
    nursing_started_at = Column(DateTime, nullable=True)
    nursing_completed_at = Column(DateTime, nullable=True)
    doctor_started_at = Column(DateTime, nullable=True)
    doctor_completed_at = Column(DateTime, nullable=True)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    patient = relationship("Patient")
    appointment = relationship("Appointment")
    assigned_doctor = relationship("Doctor", foreign_keys=[assigned_doctor_id])
