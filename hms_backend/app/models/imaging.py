from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from hms_backend.app.core.database import Base


class ImagingOrder(Base):
    __tablename__ = "imaging_orders"

    id = Column(Integer, primary_key=True, index=True)
    order_code = Column(String(50), unique=True, index=True, nullable=False) # IMG-2026-00101
    
    encounter_id = Column(String(50), nullable=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    ordering_doctor_id = Column(Integer, ForeignKey("doctors.id"), nullable=True)
    
    imaging_type = Column(String(50), nullable=False) # X-Ray, CT Scan, MRI, Ultrasound
    body_part = Column(String(100), default="Chest") # Chest, Abdomen, Brain, Knee, Spine
    clinical_indication = Column(Text, nullable=True)
    
    priority = Column(String(50), default="Routine") # Routine, Urgent, Emergency
    status = Column(String(50), default="ORDERED") # ORDERED, SCHEDULED, SCAN_COMPLETED, VERIFIED, CANCELLED
    
    report_findings = Column(Text, nullable=True)
    impression = Column(Text, nullable=True)
    radiologist_name = Column(String(120), default="Dr. Radhakrishnan (Radiology)")
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    verified_at = Column(DateTime, nullable=True)

    patient = relationship("Patient")
    ordering_doctor = relationship("Doctor", foreign_keys=[ordering_doctor_id])
