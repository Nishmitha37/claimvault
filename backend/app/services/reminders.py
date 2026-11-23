from datetime import date
from typing import Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..config import get_settings
from ..models import Product, ReminderAcknowledgement
from .deadlines import days_remaining, deadline_status


def _when(days: int) -> str:
    return "today" if days == 0 else "tomorrow" if days == 1 else f"in {days} days"


def build_reminders(db: Session, user_id: int, today: Optional[date] = None, include_acknowledged: bool = False) -> list[dict]:
    """Reminders are derived from live deadlines, so they can never be duplicated:
    one reminder per (product, kind, deadline date). Acknowledgements are stored separately."""
    today = today or date.today()
    window = get_settings().upcoming_days
    products = db.scalars(select(Product).where(Product.user_id == user_id)).all()
    acks = {(a.product_id, a.kind, a.deadline_date)
            for a in db.scalars(select(ReminderAcknowledgement).where(ReminderAcknowledgement.user_id == user_id))}
    items = []
    for p in products:
        for kind, d in (("return", p.return_deadline), ("warranty", p.warranty_end)):
            if d is None:
                continue
            days = days_remaining(d, today)
            if days < 0 or days > window:
                continue
            acked = (p.id, kind, d) in acks
            if acked and not include_acknowledged:
                continue
            if kind == "return":
                msg = f"The return window for \"{p.name}\" closes {_when(days)} ({d.isoformat()}). Start the return before then if you want to send it back."
            else:
                msg = f"The warranty for \"{p.name}\" ends {_when(days)} ({d.isoformat()}). Check the product now and file a claim if anything is wrong."
            items.append({"product_id": p.id, "product_name": p.name, "kind": kind, "deadline_date": d,
                          "days_remaining": days, "severity": deadline_status(days), "message": msg, "acknowledged": acked})
    items.sort(key=lambda i: (i["acknowledged"], i["days_remaining"], i["product_name"]))
    return items
