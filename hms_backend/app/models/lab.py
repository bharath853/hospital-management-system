from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean, Float, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from hms_backend.app.core.database import Base


class LabTestMaster(Base):
    __tablename__ = "lab_test_master"

    id = Column(Integer, primary_key=True, index=True)
    test_code = Column(String(50), unique=True, index=True, nullable=False) # CBC, HBA1C, CREAT, etc.
    test_name = Column(String(120), nullable=False)
    laboratory_section = Column(String(80), nullable=False) # Hematology, Clinical Chemistry, Microbiology, etc.
    specimen_type = Column(String(80), default="Whole Blood")
    container_type = Column(String(80), default="EDTA tube")
    fasting_required = Column(Boolean, default=False)
    tat_minutes = Column(Integer, default=60)
    is_active = Column(Boolean, default=True)

    parameters = relationship("LabTestParameter", back_populates="test", cascade="all, delete-orphan")


class LabTestParameter(Base):
    __tablename__ = "lab_test_parameters"

    id = Column(Integer, primary_key=True, index=True)
    test_id = Column(Integer, ForeignKey("lab_test_master.id"), nullable=False)
    parameter_code = Column(String(50), nullable=False)
    parameter_name = Column(String(100), nullable=False)
    unit = Column(String(30), nullable=True)
    data_type = Column(String(30), default="numeric") # numeric, text
    reference_low = Column(Float, nullable=True)
    reference_high = Column(Float, nullable=True)
    reference_text = Column(String(100), nullable=True)
    critical_low = Column(Float, nullable=True)
    critical_high = Column(Float, nullable=True)
    display_order = Column(Integer, default=1)

    test = relationship("LabTestMaster", back_populates="parameters")


class LabOrder(Base):
    __tablename__ = "lab_orders"

    id = Column(Integer, primary_key=True, index=True)
    order_code = Column(String(50), unique=True, index=True, nullable=False) # LAB-2026-00891
    encounter_id = Column(String(50), nullable=False, index=True) # ENC-2026-00451
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    ordering_doctor_id = Column(Integer, ForeignKey("doctors.id"), nullable=True)
    department_name = Column(String(80), default="Cardiology")
    
    priority = Column(String(20), default="ROUTINE") # ROUTINE, URGENT, STAT
    clinical_indication = Column(Text, nullable=True)
    collection_instructions = Column(Text, nullable=True)
    fasting_required = Column(Boolean, default=False)
    order_notes = Column(Text, nullable=True)
    op_ip_status = Column(String(20), default="OP") # OP / IP
    
    status = Column(String(50), default="ORDERED") # ORDERED, ACKNOWLEDGED, COLLECTION_PENDING, SAMPLE_COLLECTED, SAMPLE_RECEIVED, PROCESSING, RESULT_ENTERED, VERIFICATION_PENDING, VERIFIED, RELEASED, SAMPLE_REJECTED, RECOLLECTION_REQUIRED, CANCELLED
    ordered_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    patient = relationship("Patient")
    ordering_doctor = relationship("Doctor", foreign_keys=[ordering_doctor_id])
    items = relationship("LabOrderItem", back_populates="order", cascade="all, delete-orphan")
    specimens = relationship("LabSpecimen", back_populates="order", cascade="all, delete-orphan")
    results = relationship("LabResult", back_populates="order", cascade="all, delete-orphan")


class LabOrderItem(Base):
    __tablename__ = "lab_order_items"

    id = Column(Integer, primary_key=True, index=True)
    lab_order_id = Column(Integer, ForeignKey("lab_orders.id"), nullable=False)
    test_id = Column(Integer, ForeignKey("lab_test_master.id"), nullable=True)
    test_name = Column(String(120), nullable=False)
    laboratory_section = Column(String(80), nullable=False) # Hematology, Clinical Chemistry, etc.
    status = Column(String(50), default="ORDERED")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    order = relationship("LabOrder", back_populates="items")
    test = relationship("LabTestMaster")


class LabSpecimen(Base):
    __tablename__ = "lab_specimens"

    id = Column(Integer, primary_key=True, index=True)
    specimen_code = Column(String(50), unique=True, index=True, nullable=False) # SPC-2026-01051
    lab_order_id = Column(Integer, ForeignKey("lab_orders.id"), nullable=False)
    lab_order_item_id = Column(Integer, ForeignKey("lab_order_items.id"), nullable=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    
    specimen_type = Column(String(80), nullable=False) # Whole Blood, Serum, Plasma, Urine, etc.
    container_type = Column(String(80), nullable=False) # EDTA tube, SST tube, etc.
    barcode = Column(String(80), nullable=False) # BC-2026-01051
    
    collection_status = Column(String(50), default="PENDING") # PENDING, COLLECTED, RECEIVED, REJECTED
    collected_by = Column(String(120), nullable=True)
    collected_at = Column(DateTime, nullable=True)
    collection_site = Column(String(100), nullable=True)
    collection_notes = Column(Text, nullable=True)
    
    received_by = Column(String(120), nullable=True)
    received_at = Column(DateTime, nullable=True)
    rejection_reason = Column(String(150), nullable=True)

    order = relationship("LabOrder", back_populates="specimens")
    patient = relationship("Patient")


class LabResult(Base):
    __tablename__ = "lab_results"

    id = Column(Integer, primary_key=True, index=True)
    lab_order_id = Column(Integer, ForeignKey("lab_orders.id"), nullable=False)
    lab_order_item_id = Column(Integer, ForeignKey("lab_order_items.id"), nullable=True)
    encounter_id = Column(String(50), nullable=False, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    ordering_doctor_id = Column(Integer, ForeignKey("doctors.id"), nullable=True)
    laboratory_section = Column(String(80), nullable=False)
    
    status = Column(String(50), default="DRAFT") # DRAFT, RESULT_ENTERED, VERIFICATION_PENDING, VERIFIED, RELEASED
    is_critical = Column(Boolean, default=False)
    version = Column(Integer, default=1)
    
    entered_by = Column(String(120), nullable=True)
    entered_at = Column(DateTime, nullable=True)
    verified_by = Column(String(120), nullable=True)
    verified_at = Column(DateTime, nullable=True)
    released_by = Column(String(120), nullable=True)
    released_at = Column(DateTime, nullable=True)
    
    doctor_acknowledged = Column(Boolean, default=False)
    doctor_acknowledged_at = Column(DateTime, nullable=True)
    doctor_notes = Column(Text, nullable=True)

    order = relationship("LabOrder", back_populates="results")
    patient = relationship("Patient")
    ordering_doctor = relationship("Doctor", foreign_keys=[ordering_doctor_id])
    values = relationship("LabResultValue", back_populates="result", cascade="all, delete-orphan")


class LabResultValue(Base):
    __tablename__ = "lab_result_values"

    id = Column(Integer, primary_key=True, index=True)
    lab_result_id = Column(Integer, ForeignKey("lab_results.id"), nullable=False)
    parameter_id = Column(Integer, ForeignKey("lab_test_parameters.id"), nullable=True)
    parameter_name = Column(String(100), nullable=False)
    value = Column(String(100), nullable=False)
    unit = Column(String(30), nullable=True)
    flag = Column(String(30), default="NORMAL") # LOW, NORMAL, HIGH, CRITICAL_LOW, CRITICAL_HIGH
    
    reference_low = Column(Float, nullable=True)
    reference_high = Column(Float, nullable=True)
    reference_text = Column(String(100), nullable=True)
    critical_low = Column(Float, nullable=True)
    critical_high = Column(Float, nullable=True)
    is_critical = Column(Boolean, default=False)

    result = relationship("LabResult", back_populates="values")


class LabResultAmendment(Base):
    __tablename__ = "lab_result_amendments"

    id = Column(Integer, primary_key=True, index=True)
    lab_result_id = Column(Integer, ForeignKey("lab_results.id"), nullable=False)
    previous_version = Column(Integer, nullable=False)
    amended_by = Column(String(120), nullable=False)
    amended_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    reason_for_amendment = Column(Text, nullable=False)
    previous_data = Column(Text, nullable=False)


class LabEventOutbox(Base):
    __tablename__ = "lab_events_outbox"

    id = Column(Integer, primary_key=True, index=True)
    event_type = Column(String(80), nullable=False)
    payload = Column(Text, nullable=False)
    processed = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


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
