from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from hms_backend.app.core.database import Base


class TestRequest(Base):
    __tablename__ = "test_requests"

    id = Column(Integer, primary_key=True, index=True)
    req_code = Column(String(50), nullable=False)
    patient_name = Column(String(120), nullable=False)
    test_type = Column(String(100), nullable=False)
    priority = Column(String(50), default="Normal")
    requested_by = Column(String(120), nullable=True)
    status = Column(String(50), default="Requested")


class LabReport(Base):
    __tablename__ = "lab_reports"

    id = Column(Integer, primary_key=True, index=True)
    test_id = Column(Integer, nullable=False)
    patient_name = Column(String(120), nullable=False)
    result_summary = Column(Text, nullable=False)
    verified_by = Column(String(120), nullable=True)
    status = Column(String(50), default="Verified")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class LabOrder(Base):
    __tablename__ = "lab_orders"

    id = Column(Integer, primary_key=True, index=True)
    order_code = Column(String(50), unique=True, index=True, nullable=False) # LAB-2026-00101
    
    encounter_id = Column(String(50), nullable=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    ordering_doctor_id = Column(Integer, ForeignKey("doctors.id"), nullable=True)
    
    test_name = Column(String(120), nullable=False) # CBC, Lipid Profile, LFT, KFT
    test_category = Column(String(80), default="Hematology")
    clinical_notes = Column(Text, nullable=True)
    
    priority = Column(String(50), default="Routine")
    status = Column(String(50), default="ORDERED") # ORDERED, SAMPLE_COLLECTED, PROCESSING, RESULT_READY, VERIFIED
    sample_status = Column(String(50), default="PENDING")
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    patient = relationship("Patient")
    ordering_doctor = relationship("Doctor", foreign_keys=[ordering_doctor_id])


class LabResult(Base):
    __tablename__ = "lab_results"

    id = Column(Integer, primary_key=True, index=True)
    lab_order_id = Column(Integer, ForeignKey("lab_orders.id"), nullable=True)
    encounter_id = Column(String(50), nullable=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    
    test_name = Column(String(120), nullable=False)
    result_data = Column(Text, nullable=False)
    is_abnormal = Column(Boolean, default=False)
    status = Column(String(50), default="VERIFIED")
    
    verified_by = Column(String(120), default="Anil Mehta (Lab Tech)")
    resulted_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    verified_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    patient = relationship("Patient")
