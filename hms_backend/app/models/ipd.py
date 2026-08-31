from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text, Float
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from hms_backend.app.core.database import Base


class Ward(Base):
    __tablename__ = "wards"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    ward_type = Column(String(50), default="General")
    total_beds = Column(Integer, default=10)
    occupied_beds = Column(Integer, default=0)
    nurse_in_charge = Column(String(120), nullable=True)

    beds = relationship("Bed", back_populates="ward")


class Bed(Base):
    __tablename__ = "beds"

    id = Column(Integer, primary_key=True, index=True)
    bed_number = Column(String(50), nullable=False)
    room_number = Column(String(50), default="Room 201")
    ward_id = Column(Integer, ForeignKey("wards.id"), nullable=False)
    bed_type = Column(String(50), default="General") # General, Semiprivate, Private, ICU, Deluxe
    daily_rate = Column(String(50), default="₹1,500/day")
    status = Column(String(50), default="Available") # Available, Occupied, Maintenance
    current_patient_id = Column(Integer, ForeignKey("patients.id"), nullable=True)

    ward = relationship("Ward", back_populates="beds")
    admissions = relationship("Admission", back_populates="bed")


class IpAdmission(Base):
    __tablename__ = "ip_admissions"

    id = Column(Integer, primary_key=True, index=True)
    ip_admission_code = Column(String(50), unique=True, index=True, nullable=True)
    
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    op_visit_id = Column(Integer, ForeignKey("op_visits.id"), nullable=True)
    
    admission_date = Column(String(50), nullable=True)
    admission_type = Column(String(50), default="Elective") # Elective, Emergency, Transfer, Referral
    admission_source = Column(String(50), default="OP Consultation") # OP Consultation, Emergency Dept, Direct, Referral Hospital
    
    department_name = Column(String(120), nullable=True)
    admitting_doctor_name = Column(String(120), nullable=True)
    
    provisional_diagnosis = Column(Text, nullable=True)
    reason_for_admission = Column(Text, nullable=True)
    
    ward_name = Column(String(100), nullable=True)
    room_number = Column(String(50), nullable=True)
    bed_id = Column(Integer, ForeignKey("beds.id"), nullable=True)
    bed_number = Column(String(50), nullable=True)
    
    insurance_provider = Column(String(120), nullable=True)
    policy_number = Column(String(120), nullable=True)
    emergency_contact = Column(String(120), nullable=True)
    
    deposit_amount = Column(String(50), default="₹10,000")
    payment_status = Column(String(50), default="Paid") # Paid, Pending
    
    admission_status = Column(String(50), default="Admitted") # Admitted, In-Ward, Discharged
    admitted_by = Column(String(100), default="Receptionist")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    patient = relationship("Patient")
    bed = relationship("Bed")


class Admission(Base):
    __tablename__ = "admissions"

    id = Column(Integer, primary_key=True, index=True)
    admission_code = Column(String(50), unique=True, index=True, nullable=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    bed_id = Column(Integer, ForeignKey("beds.id"), nullable=True)
    attending_doctor = Column(String(120), nullable=True)
    admitted_date = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    discharge_date = Column(DateTime, nullable=True)
    status = Column(String(50), default="Admitted")

    patient = relationship("Patient", back_populates="admissions")
    bed = relationship("Bed", back_populates="admissions")

