from datetime import date, datetime
from decimal import Decimal
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator

ClaimStatus = Literal["Open", "Submitted", "In Repair", "Resolved", "Rejected"]


def _strip(v):
    if isinstance(v, str):
        v = v.strip()
        return v or None
    return v


class UserCreate(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=1, max_length=120)
    password: str = Field(min_length=8, max_length=64)

    @field_validator("full_name", mode="before")
    @classmethod
    def _n(cls, v):
        return _strip(v)


class UserLogin(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    email: str
    full_name: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class ProductIn(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    brand: Optional[str] = Field(None, max_length=120)
    category: str = Field(min_length=1, max_length=80)
    model_number: Optional[str] = Field(None, max_length=120)
    purchase_date: date
    purchase_price: Decimal = Field(ge=0, max_digits=10, decimal_places=2)
    seller: Optional[str] = Field(None, max_length=160)
    order_id: Optional[str] = Field(None, max_length=120)
    return_deadline: Optional[date] = None
    warranty_start: Optional[date] = None
    warranty_end: Optional[date] = None
    notes: Optional[str] = Field(None, max_length=5000)

    @field_validator("name", "brand", "category", "model_number", "seller", "order_id", "notes", mode="before")
    @classmethod
    def _s(cls, v):
        return _strip(v)

    @model_validator(mode="after")
    def _dates(self):
        if (self.warranty_start is None) != (self.warranty_end is None):
            raise ValueError("Warranty start and end dates must be provided together")
        if self.warranty_start and self.warranty_end < self.warranty_start:
            raise ValueError("Warranty end date cannot be before the start date")
        if self.return_deadline and self.return_deadline < self.purchase_date:
            raise ValueError("Return deadline cannot be before the purchase date")
        return self


class ProductOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    brand: Optional[str] = None
    category: str
    model_number: Optional[str] = None
    purchase_date: date
    purchase_price: float
    seller: Optional[str] = None
    order_id: Optional[str] = None
    return_deadline: Optional[date] = None
    warranty_start: Optional[date] = None
    warranty_end: Optional[date] = None
    notes: Optional[str] = None
    created_at: datetime
    warranty_days_remaining: Optional[int] = None
    warranty_status: Optional[str] = None
    return_days_remaining: Optional[int] = None
    return_status: Optional[str] = None
    receipt_count: int = 0


class ReceiptOut(BaseModel):
    id: int
    product_id: int
    product_name: str
    original_filename: str
    content_type: str
    size_bytes: int
    uploaded_at: datetime


class AckIn(BaseModel):
    product_id: int
    kind: Literal["return", "warranty"]
    deadline_date: date


class ClaimCreate(BaseModel):
    product_id: int
    reference_number: str = Field(min_length=1, max_length=100)
    description: str = Field(min_length=1, max_length=5000)

    @field_validator("reference_number", "description", mode="before")
    @classmethod
    def _s(cls, v):
        return _strip(v)


class ClaimStatusUpdate(BaseModel):
    status: ClaimStatus
    note: Optional[str] = Field(None, max_length=1000)

    @field_validator("note", mode="before")
    @classmethod
    def _s(cls, v):
        return _strip(v)


class HistoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    old_status: Optional[str] = None
    new_status: str
    note: Optional[str] = None
    changed_at: datetime


class ClaimOut(BaseModel):
    id: int
    product_id: int
    product_name: str
    reference_number: str
    description: str
    status: str
    created_at: datetime
    updated_at: datetime
    history: list[HistoryOut]
