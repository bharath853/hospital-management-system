from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from hms_backend.app.core.database import Base


class QueueEntry(Base):
    __tablename__ = "queue_entries"

    id = Column(Integer, primary_key=True, index=True)
    queue_code = Column(String(50), unique=True, index=True, nullable=True)
    
    appointment_id = Column(Integer, ForeignKey("appointments.id"), nullable=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=True)
    
    doctor_name = Column(String(120), nullable=True)
    department_name = Column(String(120), nullable=True)
    queue_date = Column(String(20), nullable=True) # YYYY-MM-DD
    
    token_number = Column(String(50), nullable=False) # e.g. C-015
    queue_type = Column(String(50), default="Appointment") # Appointment / Walk-in / Emergency
    priority = Column(String(50), default="Normal") # Emergency / Urgent / Normal
    priority_rank = Column(Integer, default=3) # 1=Emergency, 2=Urgent, 3=Appointment, 4=Walk-in
    
    check_in_time = Column(String(50), nullable=True)
    queue_position = Column(Integer, default=1)
    estimated_wait_time = Column(String(50), default="15 min")
    
    queue_status = Column(String(50), default="WAITING") # CHECKED_IN, WAITING, CALLED, IN_CONSULTATION, COMPLETED, SKIPPED, CANCELLED
    nursing_status = Column(String(50), default="WAITING") # WAITING, IN_PROGRESS, COMPLETED, CANCELLED
    vitals_recorded = Column(Boolean, default=False)
    
    assessment_started_at = Column(DateTime, nullable=True)
    assessment_completed_at = Column(DateTime, nullable=True)
    
    called_at = Column(DateTime, nullable=True)
    consultation_start_time = Column(DateTime, nullable=True)
    consultation_end_time = Column(DateTime, nullable=True)
    consultation_room = Column(String(50), default="Room 204")
    
    created_by = Column(String(100), default="Receptionist")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    patient = relationship("Patient")
    appointment = relationship("Appointment")
