from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload, selectinload

from ..database import get_db
from ..dependencies.auth import get_current_user
from ..dependencies.ownership import get_owned_claim, get_owned_product
from ..models import ClaimStatusHistory, User, WarrantyClaim
from ..schemas import ClaimCreate, ClaimOut, ClaimStatus, ClaimStatusUpdate, HistoryOut

router = APIRouter(prefix="/api/claims", tags=["claims"])


def _out(c: WarrantyClaim) -> ClaimOut:
    return ClaimOut(id=c.id, product_id=c.product_id, product_name=c.product.name, reference_number=c.reference_number,
                    description=c.description, status=c.status, created_at=c.created_at, updated_at=c.updated_at,
                    history=[HistoryOut.model_validate(h) for h in c.history])


@router.post("", response_model=ClaimOut, status_code=status.HTTP_201_CREATED)
def create_claim(data: ClaimCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    product = get_owned_product(db, user, data.product_id)
    claim = WarrantyClaim(user_id=user.id, product_id=product.id, reference_number=data.reference_number,
                          description=data.description, status="Open")
    claim.history.append(ClaimStatusHistory(old_status=None, new_status="Open", note="Claim created"))
    db.add(claim)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "You already have a claim with this reference number")
    db.refresh(claim)
    return _out(claim)


@router.get("", response_model=list[ClaimOut])
def list_claims(product_id: Optional[int] = None, status_filter: Optional[ClaimStatus] = None,
                db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    q = (select(WarrantyClaim).where(WarrantyClaim.user_id == user.id)
         .options(joinedload(WarrantyClaim.product), selectinload(WarrantyClaim.history))
         .order_by(WarrantyClaim.updated_at.desc(), WarrantyClaim.id.desc()))
    if product_id is not None:
        q = q.where(WarrantyClaim.product_id == product_id)
    if status_filter:
        q = q.where(WarrantyClaim.status == status_filter)
    return [_out(c) for c in db.scalars(q).all()]


@router.get("/{claim_id}", response_model=ClaimOut)
def get_claim(claim_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return _out(get_owned_claim(db, user, claim_id))


@router.patch("/{claim_id}/status", response_model=ClaimOut)
def update_status(claim_id: int, data: ClaimStatusUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    claim = get_owned_claim(db, user, claim_id)
    if claim.status == data.status:
        raise HTTPException(400, f"Claim is already '{data.status}'")
    claim.history.append(ClaimStatusHistory(old_status=claim.status, new_status=data.status, note=data.note))
    claim.status = data.status
    db.commit()
    db.refresh(claim)
    return _out(claim)


@router.delete("/{claim_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_claim(claim_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    claim = get_owned_claim(db, user, claim_id)
    db.delete(claim)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
