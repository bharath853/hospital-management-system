from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from hms_backend.app.core.database import Base


class DoctorConsultation(Base):
    __tablename__ = "doctor_consultations"

    id = Column(Integer, primary_key=True, index=True)
    encounter_id = Column(String(50), index=True, nullable=False)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    doctor_id = Column(Integer, ForeignKey("doctors.id"), nullable=False)

    status = Column(String(50), default="IN_PROGRESS") # IN_PROGRESS, AWAITING_INVESTIGATION, COMPLETED, CANCELLED

    chief_complaint = Column(Text, nullable=True)
    hpi_notes = Column(Text, nullable=True) # History of Present Illness
    past_medical_history = Column(Text, nullable=True)
    allergy_notes = Column(Text, nullable=True)

    general_examination = Column(Text, nullable=True)
    specialty_name = Column(String(80), default="General Medicine") # Cardiology, Orthopedics, Neurology, Pediatrics, General Medicine
    specialty_examination = Column(Text, nullable=True) # Structured exam findings

    primary_diagnosis = Column(String(255), nullable=True)
    secondary_diagnosis = Column(String(255), nullable=True)
    differential_diagnosis = Column(Text, nullable=True)

    treatment_plan = Column(Text, nullable=True)
    prescription_json = Column(Text, nullable=True) # Serialized drug items list

    followup_required = Column(Boolean, default=False)
    followup_date = Column(String(50), nullable=True)
    followup_instructions = Column(Text, nullable=True)

    referral_required = Column(Boolean, default=False)
    referral_specialty = Column(String(100), nullable=True)
    referral_notes = Column(Text, nullable=True)

    started_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    patient = relationship("Patient")
    doctor = relationship("Doctor", foreign_keys=[doctor_id])


class Diagnosis(Base):
    __tablename__ = "diagnoses"

    id = Column(Integer, primary_key=True, index=True)
    encounter_id = Column(String(50), index=True, nullable=False)
    consultation_id = Column(Integer, ForeignKey("doctor_consultations.id"), nullable=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    doctor_id = Column(Integer, ForeignKey("doctors.id"), nullable=False)

    diagnosis_code = Column(String(50), nullable=True) # ICD-10 code e.g. I20.9
    diagnosis_name = Column(String(255), nullable=False)
    diagnosis_type = Column(String(50), default="PRIMARY") # PRIMARY, SECONDARY, DIFFERENTIAL
    is_primary = Column(Boolean, default=True)
    clinical_notes = Column(Text, nullable=True)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    patient = relationship("Patient")


class ClinicalOrder(Base):
    __tablename__ = "clinical_orders"

    id = Column(Integer, primary_key=True, index=True)
    order_code = Column(String(50), unique=True, index=True, nullable=False) # ORD-2026-001
    encounter_id = Column(String(50), index=True, nullable=False)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    doctor_id = Column(Integer, ForeignKey("doctors.id"), nullable=False)

    order_type = Column(String(50), nullable=False) # LAB, IMAGING, PROCEDURE, MEDICATION, REFERRAL
    priority = Column(String(50), default="Routine") # Routine, Urgent, Emergency
    status = Column(String(50), default="ORDERED") # ORDERED, PROCESSING, COMPLETED, CANCELLED

    clinical_indication = Column(Text, nullable=True)
    instructions = Column(Text, nullable=True)
    ordered_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    patient = relationship("Patient")
