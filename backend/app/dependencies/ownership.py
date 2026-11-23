from fastapi import HTTPException
from sqlalchemy.orm import Session

from ..models import Product, Receipt, User, WarrantyClaim


def get_owned_product(db: Session, user: User, product_id: int) -> Product:
    obj = db.get(Product, product_id)
    if obj is None or obj.user_id != user.id:
        raise HTTPException(404, "Product not found")
    return obj


def get_owned_receipt(db: Session, user: User, receipt_id: int) -> Receipt:
    obj = db.get(Receipt, receipt_id)
    if obj is None or obj.user_id != user.id:
        raise HTTPException(404, "Receipt not found")
    return obj


def get_owned_claim(db: Session, user: User, claim_id: int) -> WarrantyClaim:
    obj = db.get(WarrantyClaim, claim_id)
    if obj is None or obj.user_id != user.id:
        raise HTTPException(404, "Claim not found")
    return obj
