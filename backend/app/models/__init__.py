from datetime import date, datetime, timezone
from decimal import Decimal
from typing import Optional

from sqlalchemy import (CheckConstraint, Date, DateTime, ForeignKey, Index, Integer,
                        Numeric, String, Text, UniqueConstraint, func)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..database import Base

OPTS = {"mysql_engine": "InnoDB", "mysql_charset": "utf8mb4", "mysql_collate": "utf8mb4_unicode_ci"}
def _utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


CLAIM_STATUSES = ("Open", "Submitted", "In Repair", "Resolved", "Rejected")


class User(Base):
    __tablename__ = "users"
    __table_args__ = (OPTS,)
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String(120), nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_utcnow, server_default=func.now(), nullable=False)


class Product(Base):
    __tablename__ = "products"
    __table_args__ = (
        CheckConstraint("purchase_price >= 0", name="ck_products_price_nonneg"),
        Index("ix_products_user_warranty_end", "user_id", "warranty_end"),
        Index("ix_products_user_category", "user_id", "category"),
        OPTS,
    )
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    brand: Mapped[Optional[str]] = mapped_column(String(120))
    category: Mapped[str] = mapped_column(String(80), nullable=False)
    model_number: Mapped[Optional[str]] = mapped_column(String(120))
    purchase_date: Mapped[date] = mapped_column(Date, nullable=False)
    purchase_price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    seller: Mapped[Optional[str]] = mapped_column(String(160))
    order_id: Mapped[Optional[str]] = mapped_column(String(120))
    return_deadline: Mapped[Optional[date]] = mapped_column(Date)
    warranty_start: Mapped[Optional[date]] = mapped_column(Date)
    warranty_end: Mapped[Optional[date]] = mapped_column(Date)
    notes: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_utcnow, server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=_utcnow, onupdate=_utcnow, server_default=func.now(), nullable=False)

    receipts: Mapped[list["Receipt"]] = relationship(back_populates="product", cascade="all, delete-orphan", passive_deletes=True)
    claims: Mapped[list["WarrantyClaim"]] = relationship(back_populates="product", cascade="all, delete-orphan", passive_deletes=True)


class Receipt(Base):
    __tablename__ = "receipts"
    __table_args__ = (Index("ix_receipts_user", "user_id"), Index("ix_receipts_product", "product_id"), OPTS)
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    stored_filename: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    content_type: Mapped[str] = mapped_column(String(100), nullable=False)
    size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
    uploaded_at: Mapped[datetime] = mapped_column(DateTime, default=_utcnow, server_default=func.now(), nullable=False)

    product: Mapped[Product] = relationship(back_populates="receipts")


class ReminderAcknowledgement(Base):
    __tablename__ = "reminder_acknowledgements"
    __table_args__ = (
        UniqueConstraint("user_id", "product_id", "kind", "deadline_date", name="uq_reminder_ack"),
        Index("ix_reminder_ack_product", "product_id"),
        CheckConstraint("kind IN ('return','warranty')", name="ck_reminder_kind"),
        OPTS,
    )
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    kind: Mapped[str] = mapped_column(String(20), nullable=False)
    deadline_date: Mapped[date] = mapped_column(Date, nullable=False)
    acknowledged_at: Mapped[datetime] = mapped_column(DateTime, default=_utcnow, server_default=func.now(), nullable=False)


class WarrantyClaim(Base):
    __tablename__ = "warranty_claims"
    __table_args__ = (
        UniqueConstraint("user_id", "reference_number", name="uq_claim_user_ref"),
        Index("ix_claims_product", "product_id"),
        CheckConstraint("status IN ('Open','Submitted','In Repair','Resolved','Rejected')", name="ck_claim_status"),
        OPTS,
    )
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    reference_number: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="Open")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_utcnow, server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=_utcnow, onupdate=_utcnow, server_default=func.now(), nullable=False)

    product: Mapped[Product] = relationship(back_populates="claims")
    history: Mapped[list["ClaimStatusHistory"]] = relationship(
        back_populates="claim", cascade="all, delete-orphan", passive_deletes=True,
        order_by="ClaimStatusHistory.changed_at, ClaimStatusHistory.id")


class ClaimStatusHistory(Base):
    __tablename__ = "claim_status_history"
    __table_args__ = (Index("ix_claim_history_claim", "claim_id"), OPTS)
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    claim_id: Mapped[int] = mapped_column(ForeignKey("warranty_claims.id", ondelete="CASCADE"), nullable=False)
    old_status: Mapped[Optional[str]] = mapped_column(String(20))
    new_status: Mapped[str] = mapped_column(String(20), nullable=False)
    note: Mapped[Optional[str]] = mapped_column(Text)
    changed_at: Mapped[datetime] = mapped_column(DateTime, default=_utcnow, server_default=func.now(), nullable=False)

    claim: Mapped[WarrantyClaim] = relationship(back_populates="history")
