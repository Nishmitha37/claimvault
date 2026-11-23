from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..database import get_db
from ..dependencies.auth import get_current_user
from ..dependencies.ownership import get_owned_product
from ..models import ReminderAcknowledgement, User
from ..schemas import AckIn
from ..services.reminders import build_reminders
from sqlalchemy import select

router = APIRouter(prefix="/api/reminders", tags=["reminders"])


@router.get("")
def list_reminders(include_acknowledged: bool = False, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return build_reminders(db, user.id, include_acknowledged=include_acknowledged)


@router.post("/acknowledge")
def acknowledge(data: AckIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    p = get_owned_product(db, user, data.product_id)
    current = p.return_deadline if data.kind == "return" else p.warranty_end
    if current != data.deadline_date:
        raise HTTPException(400, "This reminder no longer matches the product's deadline")
    exists = db.scalar(select(ReminderAcknowledgement).where(
        ReminderAcknowledgement.user_id == user.id, ReminderAcknowledgement.product_id == p.id,
        ReminderAcknowledgement.kind == data.kind, ReminderAcknowledgement.deadline_date == data.deadline_date))
    if exists is None:
        db.add(ReminderAcknowledgement(user_id=user.id, product_id=p.id, kind=data.kind, deadline_date=data.deadline_date))
        try:
            db.commit()
        except IntegrityError:  # concurrent duplicate click: already acknowledged
            db.rollback()
    return {"acknowledged": True}
