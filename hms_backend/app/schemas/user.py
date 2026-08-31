from pydantic import BaseModel, EmailStr, ConfigDict
from typing import Optional


class UserBase(BaseModel):
    full_name: str
    email: str
    role: str = "reception"
    is_active: bool = True
    department_id: Optional[int] = None


class UserCreate(UserBase):
    password: str


class UserResponse(UserBase):
    id: int
    model_config = ConfigDict(from_attributes=True)


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    name: str
    lab_section: Optional[str] = None
    station_id: Optional[str] = None


class LoginRequest(BaseModel):
    username: str
    password: str
    lab_section: Optional[str] = None
    station_id: Optional[str] = None


class MFARequest(BaseModel):
    username: str
    otp_code: str
    lab_section: Optional[str] = None
    station_id: Optional[str] = None


class SSORequest(BaseModel):
    provider: str = "azure_ad"
    email: Optional[str] = "anil.mehta@hospital.lims.org"
    lab_section: Optional[str] = "Hematology"
    station_id: Optional[str] = "Biochemistry Analyzer-01"

