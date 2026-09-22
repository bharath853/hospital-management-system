from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from hms_backend.app.core.database import Base


class EncounterBill(Base):
    __tablename__ = "encounter_bills"

    id = Column(Integer, primary_key=True, index=True)
    bill_number = Column(String(50), unique=True, index=True, nullable=False)
    encounter_id = Column(Integer, ForeignKey("encounters.id"), nullable=False)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    bill_type = Column(String(50), default="OP") # OP, IP, EMERGENCY, PHARMACY, OTHER
    
    gross_amount = Column(Float, default=0.0)
    discount_amount = Column(Float, default=0.0)
    insurance_amount = Column(Float, default=0.0)
    tax_amount = Column(Float, default=0.0)
    net_amount = Column(Float, default=0.0)
    
    paid_amount = Column(Float, default=0.0)
    balance_amount = Column(Float, default=0.0)
    
    status = Column(String(50), default="DRAFT") # DRAFT, GENERATED, PARTIALLY_PAID, PAID, CANCELLED, REFUNDED
    
    created_by = Column(String(100), default="Receptionist")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    encounter = relationship("Encounter")
    patient = relationship("Patient")
    bill_items = relationship("EncounterBillItem", back_populates="bill")
    payments = relationship("EncounterPayment", back_populates="bill")


class EncounterBillItem(Base):
    __tablename__ = "encounter_bill_items"

    id = Column(Integer, primary_key=True, index=True)
    bill_id = Column(Integer, ForeignKey("encounter_bills.id"), nullable=False)
    
    service_code = Column(String(50), nullable=False)
    service_name = Column(String(150), nullable=False)
    category = Column(String(50), nullable=False) # CONSULTATION, LAB, SCAN, BED, PHARMACY, PROCEDURE
    
    quantity = Column(Float, default=1.0)
    unit_price = Column(Float, default=0.0)
    discount = Column(Float, default=0.0)
    total = Column(Float, default=0.0)
    
    source_type = Column(String(50), nullable=False) # LAB_REQUEST, CONSULTATION, SCAN_REQUEST
    source_id = Column(String(100), nullable=False)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    bill = relationship("EncounterBill", back_populates="bill_items")


class EncounterPayment(Base):
    __tablename__ = "encounter_payments"

    id = Column(Integer, primary_key=True, index=True)
    payment_number = Column(String(50), unique=True, index=True, nullable=False)
    bill_id = Column(Integer, ForeignKey("encounter_bills.id"), nullable=False)
    encounter_id = Column(Integer, ForeignKey("encounters.id"), nullable=False)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    
    amount = Column(Float, default=0.0)
    payment_method = Column(String(50), default="CASH") # CASH, CARD, UPI, INSURANCE
    transaction_reference = Column(String(100), nullable=True)
    payment_status = Column(String(50), default="SUCCESS") # PENDING, SUCCESS, FAILED, CANCELLED, REFUNDED
    
    received_by = Column(String(100), default="Receptionist")
    paid_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    bill = relationship("EncounterBill", back_populates="payments")
    encounter = relationship("Encounter")
    patient = relationship("Patient")
