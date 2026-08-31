from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from hms_backend.app.core.database import Base


class VitalRecord(Base):
    __tablename__ = "vital_records"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    encounter_id = Column(String(50), nullable=True) # OPV-..., IP-...
    recorded_by = Column(String(100), default="Nurse Sarah")
    
    temperature = Column(Float, nullable=True) # °F e.g. 98.6
    pulse_rate = Column(Integer, nullable=True) # bpm e.g. 78
    respiratory_rate = Column(Integer, nullable=True) # /min e.g. 18
    systolic_bp = Column(Integer, nullable=True) # mmHg e.g. 120
    diastolic_bp = Column(Integer, nullable=True) # mmHg e.g. 80
    spo2 = Column(Float, nullable=True) # % e.g. 98.0
    weight = Column(Float, nullable=True) # kg e.g. 72.0
    height = Column(Float, nullable=True) # cm e.g. 175.0
    bmi = Column(Float, nullable=True) # kg/m² auto-calculated e.g. 23.5
    pain_score = Column(Integer, default=0) # 0 to 10
    blood_glucose = Column(Float, nullable=True) # mg/dL e.g. 110.0
    
    is_abnormal = Column(Boolean, default=False)
    alert_notes = Column(String(255), nullable=True)
    recorded_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    patient = relationship("Patient")


class NursingAssessment(Base):
    __tablename__ = "nursing_assessments"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    encounter_id = Column(String(50), nullable=True)
    nurse_id = Column(String(100), default="Nurse Sarah")
    
    chief_complaint = Column(Text, nullable=True)
    general_condition = Column(String(50), default="Stable") # Stable, Needs Attention, Critical / Escalate
    mobility_status = Column(String(50), default="Independent") # Independent, Assisted, Bedridden
    fall_risk = Column(String(50), default="Low") # Low, Medium, High
    pain_score = Column(Integer, default=0)
    allergy_status = Column(String(255), default="No Known Allergies (NKDA)")
    observations = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    patient = relationship("Patient")


class MedicationAdministration(Base):
    __tablename__ = "medication_administrations"

    id = Column(Integer, primary_key=True, index=True)
    medication_order_id = Column(String(50), nullable=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    nurse_id = Column(String(100), default="Nurse Sarah")
    
    medicine_name = Column(String(150), nullable=False)
    dose = Column(String(50), nullable=False) # e.g. 500mg
    route = Column(String(50), default="Oral") # Oral, IV, IM, SC, Topical
    scheduled_time = Column(String(50), nullable=True) # e.g. 02:00 PM
    administered_time = Column(String(50), nullable=True) # e.g. 02:05 PM
    
    status = Column(String(50), default="Given") # Given, Refused, Held, Not Available
    reason_not_given = Column(String(255), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    patient = relationship("Patient")


class NursingNote(Base):
    __tablename__ = "nursing_notes"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    encounter_id = Column(String(50), nullable=True)
    ip_admission_id = Column(String(50), nullable=True)
    nurse_id = Column(String(100), default="Nurse Sarah")
    
    note_type = Column(String(50), default="Routine Nursing Note") # Routine Nursing Note, Assessment, Incident, Doctor Notified
    observation = Column(Text, nullable=False)
    intervention = Column(Text, nullable=True)
    patient_response = Column(Text, nullable=True)
    doctor_notified = Column(Boolean, default=False)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    signed_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    patient = relationship("Patient")


class ClinicalAlert(Base):
    __tablename__ = "clinical_alerts"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    vital_id = Column(Integer, ForeignKey("vital_records.id"), nullable=True)
    encounter_id = Column(String(50), nullable=True)
    
    alert_type = Column(String(50), nullable=False) # LOW_SPO2, HYPERTENSION, HIGH_FEVER, TACHYCARDIA
    severity = Column(String(50), default="CRITICAL") # CRITICAL, WARNING
    message = Column(String(255), nullable=False)
    
    status = Column(String(50), default="ACTIVE") # ACTIVE, ACKNOWLEDGED, RESOLVED
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    resolved_at = Column(DateTime, nullable=True)
    resolved_by = Column(String(100), nullable=True)

    patient = relationship("Patient")
    vital = relationship("VitalRecord")

