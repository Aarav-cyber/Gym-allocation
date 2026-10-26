import uuid
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, field_validator


# ── User schemas ──────────────────────────────────────────────────────────────

class UserBase(BaseModel):
    email: EmailStr
    status: str = "PENDING"


class UserCreate(UserBase):
    """Used by admin to provision a new user account."""
    pass


class UserUpdate(BaseModel):
    """Used by admin to update status or email."""
    email: Optional[EmailStr] = None
    status: Optional[str] = None

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: Optional[str]) -> Optional[str]:
        allowed = {"PENDING", "ACTIVE", "SUSPENDED", "INACTIVE"}
        if v is not None and v not in allowed:
            raise ValueError(f"status must be one of {allowed}")
        return v


class RoleRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str


class UserRead(UserBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email_verified_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    roles: List[RoleRead] = []


# ── Auth / Token schemas ──────────────────────────────────────────────────────

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds


class CurrentUser(BaseModel):
    """Decoded JWT payload available to downstream handlers."""
    user_id: uuid.UUID
    email: str
    roles: List[str]
    status: str
