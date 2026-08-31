from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from hms_backend.app.core.database import Base


class ServiceMaster(Base):
    __tablename__ = "service_master"

    id = Column(Integer, primary_key=True, index=True)
    service_code = Column(String(50), unique=True, index=True, nullable=False)
    service_name = Column(String(150), nullable=False)
    category = Column(String(50), nullable=False) # Consultation, Laboratory, Imaging, Bed, Nursing, Pharmacy, Procedure, Other
    department_name = Column(String(120), nullable=True)
    
    op_rate = Column(Float, default=500.0)
    ip_rate = Column(Float, default=500.0)
    unit = Column(String(50), default="Per Visit") # Per Visit, Per Test, Per Day, Per Item
    tax_rate = Column(Float, default=0.0) # percentage e.g. 5.0
    active = Column(Boolean, default=True)


class BillingAccount(Base):
    __tablename__ = "billing_accounts"

    id = Column(Integer, primary_key=True, index=True)
    account_code = Column(String(50), unique=True, index=True, nullable=False)
    
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    op_visit_id = Column(Integer, ForeignKey("op_visits.id"), nullable=True)
    ip_admission_id = Column(Integer, ForeignKey("ip_admissions.id"), nullable=True)
    
    account_type = Column(String(20), default="OP") # OP / IP
    discount_amount = Column(Float, default=0.0)
    insurance_adjustment = Column(Float, default=0.0)
    tax_amount = Column(Float, default=0.0)
    
    status = Column(String(50), default="Pending") # Active, Closed, Paid, Pending
    opened_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    closed_at = Column(DateTime, nullable=True)

    patient = relationship("Patient")
    bill_items = relationship("BillItem", back_populates="billing_account")
    payment_records = relationship("PaymentRecord", back_populates="billing_account")


class BillItem(Base):
    __tablename__ = "bill_items"

    id = Column(Integer, primary_key=True, index=True)
    billing_account_id = Column(Integer, ForeignKey("billing_accounts.id"), nullable=False)
    service_id = Column(Integer, ForeignKey("service_master.id"), nullable=True)
    
    source_type = Column(String(50), default="CONSULTATION") # CONSULTATION, LAB, IMAGING, PHARMACY, BED, NURSING, PROCEDURE, OTHER
    source_id = Column(String(100), nullable=True) # Audit reference e.g. LAB-401
    
    description = Column(String(200), nullable=False)
    quantity = Column(Float, default=1.0)
    unit_price = Column(Float, default=0.0)
    discount = Column(Float, default=0.0)
    tax = Column(Float, default=0.0)
    net_amount = Column(Float, default=0.0)
    service_date = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    billing_account = relationship("BillingAccount", back_populates="bill_items")
    service = relationship("ServiceMaster")


class PaymentRecord(Base):
    __tablename__ = "payment_records"

    id = Column(Integer, primary_key=True, index=True)
    billing_account_id = Column(Integer, ForeignKey("billing_accounts.id"), nullable=False)
    transaction_code = Column(String(50), unique=True, index=True, nullable=False)
    
    amount = Column(Float, default=0.0)
    payment_method = Column(String(50), default="Cash") # Cash, Card, UPI, Insurance, Bank Transfer
    transaction_reference = Column(String(100), nullable=True)
    payment_status = Column(String(50), default="Completed")
    payment_date = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    received_by = Column(String(100), default="Billing Officer")

    billing_account = relationship("BillingAccount", back_populates="payment_records")


class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True, index=True)
    invoice_code = Column(String(50), unique=True, index=True, nullable=False)
    patient_name = Column(String(120), nullable=False)
    total_amount = Column(Float, default=0.0)
    due_date = Column(String(50), nullable=True)
    status = Column(String(50), default="Pending")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    transaction_code = Column(String(50), unique=True, index=True, nullable=False)
    patient_name = Column(String(120), nullable=False)
    amount = Column(Float, default=0.0)
    method = Column(String(50), default="Cash")
    status = Column(String(50), default="Completed")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

