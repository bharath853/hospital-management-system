from sqlalchemy import Column, Integer, String, Date, Text, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from hms_backend.app.core.database import Base


class Patient(Base):
    __tablename__ = "patients"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(String(50), unique=True, index=True, nullable=True)
    patient_code = Column(String(50), unique=True, index=True, nullable=True)
    full_name = Column(String(120), nullable=False)
    phone = Column(String(20), nullable=False)
    email = Column(String(120), nullable=True)
    date_of_birth = Column(Date, nullable=True)
    gender = Column(String(20), nullable=True)
    blood_group = Column(String(10), nullable=True)
    address = Column(String(255), nullable=True)
    city = Column(String(100), nullable=True)
    state = Column(String(100), nullable=True)
    pincode = Column(String(20), nullable=True)
    disease = Column(String(100), nullable=True)
    pain_scale = Column(Integer, nullable=True)
    emergency_contact_name = Column(String(120), nullable=True)
    emergency_contact_phone = Column(String(20), nullable=True)
    emergency_relationship = Column(String(50), nullable=True)
    medical_history_summary = Column(Text, nullable=True)
    status = Column(String(50), default="Active")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    appointments = relationship("Appointment", back_populates="patient")
    opd_visits = relationship("OPDVisit", back_populates="patient")
    admissions = relationship("Admission", back_populates="patient")
