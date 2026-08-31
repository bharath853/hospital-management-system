from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text, Date
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from hms_backend.app.core.database import Base


class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(Integer, primary_key=True, index=True)
    appointment_code = Column(String(50), unique=True, index=True, nullable=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=True)
    doctor_id = Column(Integer, ForeignKey("doctors.id"), nullable=True)
    doctor_name = Column(String(120), nullable=True)
    department_name = Column(String(120), nullable=True)
    
    appointment_date = Column(String(20), nullable=True)  # YYYY-MM-DD
    start_time = Column(String(20), nullable=True)        # 10:00 AM
    end_time = Column(String(20), nullable=True)          # 10:30 AM
    
    appointment_type = Column(String(50), default="New Consultation")
    priority = Column(String(20), default="Normal")
    reason = Column(Text, nullable=True)
    referral_source = Column(String(50), default="Self")
    
    consultation_fee = Column(String(50), default="₹500")
    payment_status = Column(String(50), default="Paid")
    payment_mode = Column(String(50), default="Cash")
    
    status = Column(String(50), default="Scheduled")
    appointment_status = Column(String(50), default="Scheduled")
    reminder_status = Column(String(50), default="Yes")
    reception_notes = Column(Text, nullable=True)
    notes = Column(String(255), nullable=True)
    
    created_by = Column(String(100), default="Receptionist")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    patient = relationship("Patient", back_populates="appointments")
    doctor = relationship("Doctor", back_populates="appointments")

