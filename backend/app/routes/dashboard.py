from collections import defaultdict
from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from ..config import get_settings
from ..database import get_db
from ..dependencies.auth import get_current_user
from ..models import Product, User
from ..schemas import ProductOut
from ..services.deadlines import build_events, days_remaining, product_to_out
from ..services.reminders import build_reminders

router = APIRouter(prefix="/api", tags=["dashboard"])


def _user_products(db: Session, user: User) -> list[Product]:
    return db.scalars(select(Product).where(Product.user_id == user.id).options(selectinload(Product.receipts))).all()


@router.get("/dashboard")
def dashboard(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    today = date.today()
    window = get_settings().upcoming_days
    products = _user_products(db, user)
    w_days = [days_remaining(p.warranty_end, today) for p in products]
    r_days = [days_remaining(p.return_deadline, today) for p in products]
    spending: dict[str, float] = defaultdict(float)
    for p in products:
        spending[p.category] += float(p.purchase_price)
    recent = sorted(products, key=lambda p: (p.created_at, p.id), reverse=True)[:5]
    reminders = build_reminders(db, user.id, today)
    return {
        "total_products": len(products),
        "active_warranties": sum(1 for d in w_days if d is not None and d >= 0),
        "expired_warranties": sum(1 for d in w_days if d is not None and d < 0),
        "upcoming_return_deadlines": sum(1 for d in r_days if d is not None and 0 <= d <= window),
        "upcoming_warranty_deadlines": sum(1 for d in w_days if d is not None and 0 <= d <= window),
        "total_spending": round(sum(spending.values()), 2),
        "category_spending": [{"category": c, "total": round(t, 2)} for c, t in sorted(spending.items(), key=lambda x: -x[1])],
        "recent_products": [product_to_out(p, today).model_dump(mode="json") for p in recent],
        "timeline": [{**e, "date": e["date"].isoformat()} for e in build_events(products, today, include_expired=False)[:8]],
        "action_center": {"pending_count": len(reminders),
                          "urgent_count": sum(1 for r in reminders if r["severity"] == "Urgent"),
                          "items": [{**r, "deadline_date": r["deadline_date"].isoformat()} for r in reminders[:5]]},
    }


@router.get("/deadlines")
def deadlines(include_expired: bool = Query(True), db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    events = build_events(_user_products(db, user), include_expired=include_expired)
    return [{**e, "date": e["date"].isoformat()} for e in events]
