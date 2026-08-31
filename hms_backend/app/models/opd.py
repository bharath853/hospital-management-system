from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from hms_backend.app.core.database import Base


class OpVisit(Base):
    __tablename__ = "op_visits"

    id = Column(Integer, primary_key=True, index=True)
    op_visit_code = Column(String(50), unique=True, index=True, nullable=True)
    
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    appointment_id = Column(Integer, ForeignKey("appointments.id"), nullable=True)
    
    doctor_name = Column(String(120), nullable=True)
    department_name = Column(String(120), nullable=True)
    visit_date = Column(String(50), nullable=True)
    visit_type = Column(String(50), default="New Visit") # New Visit / Follow-up Visit
    
    chief_complaint = Column(Text, nullable=True)
    referral_source = Column(String(100), default="Self")
    
    consultation_fee = Column(String(50), default="₹500")
    payment_status = Column(String(50), default="Paid")
    payment_mode = Column(String(50), default="Cash")
    
    visit_status = Column(String(50), default="Active") # Active / Completed
    created_by = Column(String(100), default="Receptionist")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    patient = relationship("Patient")
    appointment = relationship("Appointment")


class OPDVisit(Base):
    __tablename__ = "opd_visits"

    id = Column(Integer, primary_key=True, index=True)
    token_no = Column(String(50), nullable=False)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    doctor_id = Column(Integer, ForeignKey("doctors.id"), nullable=True)
    estimated_time = Column(String(50), nullable=True)
    status = Column(String(50), default="Waiting")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    patient = relationship("Patient", back_populates="opd_visits")

