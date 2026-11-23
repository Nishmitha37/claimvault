from datetime import date
from pathlib import Path
from typing import Literal, Optional

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session, selectinload

from ..config import get_settings
from ..database import get_db
from ..dependencies.auth import get_current_user
from ..dependencies.ownership import get_owned_product
from ..models import Product, Receipt, User
from ..schemas import ProductIn, ProductOut
from ..services.deadlines import product_to_out

router = APIRouter(prefix="/api/products", tags=["products"])


def _load(db: Session, user: User, product_id: int) -> Product:
    p = get_owned_product(db, user, product_id)
    db.refresh(p, attribute_names=["receipts"])
    return p


@router.get("", response_model=list[ProductOut])
def list_products(
    search: Optional[str] = Query(None, max_length=100),
    category: Optional[str] = Query(None, max_length=80),
    warranty_status: Optional[Literal["active", "upcoming", "urgent", "expired", "none"]] = None,
    sort: Literal["expiry_asc", "expiry_desc", "newest"] = "expiry_asc",
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    q = select(Product).where(Product.user_id == user.id).options(selectinload(Product.receipts))
    if search and search.strip():
        term = f"%{search.strip()}%"
        q = q.where(or_(Product.name.ilike(term), Product.brand.ilike(term), Product.model_number.ilike(term),
                        Product.seller.ilike(term), Product.order_id.ilike(term)))
    if category:
        q = q.where(Product.category == category)
    today = date.today()
    items = [product_to_out(p, today) for p in db.scalars(q).all()]
    if warranty_status:
        items = [i for i in items if (i.warranty_status or "none").lower() == warranty_status]
    if sort == "newest":
        items.sort(key=lambda i: i.id, reverse=True)
    elif sort == "expiry_asc":
        items.sort(key=lambda i: (i.warranty_end is None, i.warranty_end or date.max, i.name.lower()))
    else:
        with_date = sorted([i for i in items if i.warranty_end], key=lambda i: i.warranty_end, reverse=True)
        items = with_date + [i for i in items if not i.warranty_end]
    return items


@router.post("", response_model=ProductOut, status_code=status.HTTP_201_CREATED)
def create_product(data: ProductIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    p = Product(user_id=user.id, **data.model_dump())
    db.add(p)
    db.commit()
    db.refresh(p)
    return product_to_out(p)


@router.get("/{product_id}", response_model=ProductOut)
def get_product(product_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return product_to_out(_load(db, user, product_id))


@router.put("/{product_id}", response_model=ProductOut)
def update_product(product_id: int, data: ProductIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    p = _load(db, user, product_id)
    for k, v in data.model_dump().items():
        setattr(p, k, v)
    db.commit()
    db.refresh(p)
    return product_to_out(p)


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(product_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    p = get_owned_product(db, user, product_id)
    root = Path(get_settings().upload_dir)
    files = [root / str(user.id) / r.stored_filename
             for r in db.scalars(select(Receipt).where(Receipt.product_id == p.id)).all()]
    db.delete(p)
    db.commit()
    for f in files:
        f.unlink(missing_ok=True)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
