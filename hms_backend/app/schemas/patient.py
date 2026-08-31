from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import date


class PatientBase(BaseModel):
    full_name: str
    phone: str
    email: Optional[str] = None
    gender: Optional[str] = None
    blood_group: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    status: Optional[str] = "Active"


class PatientCreate(PatientBase):
    date_of_birth: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    emergency_relationship: Optional[str] = None
    medical_history_summary: Optional[str] = None


class PatientResponse(PatientBase):
    id: int
    patient_code: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)
