from datetime import date
from typing import Optional

from ..config import get_settings
from ..models import Product
from ..schemas import ProductOut


def days_remaining(target: Optional[date], today: Optional[date] = None) -> Optional[int]:
    if target is None:
        return None
    return (target - (today or date.today())).days


def deadline_status(days: Optional[int], urgent: Optional[int] = None, upcoming: Optional[int] = None) -> Optional[str]:
    """Expired (<0), Urgent (0..urgent), Upcoming (..upcoming), otherwise Active. None when no date."""
    if days is None:
        return None
    s = get_settings()
    urgent = s.urgent_days if urgent is None else urgent
    upcoming = s.upcoming_days if upcoming is None else upcoming
    if days < 0:
        return "Expired"
    if days <= urgent:
        return "Urgent"
    if days <= upcoming:
        return "Upcoming"
    return "Active"


def product_to_out(p: Product, today: Optional[date] = None) -> ProductOut:
    today = today or date.today()
    out = ProductOut.model_validate(p)
    out.warranty_days_remaining = days_remaining(p.warranty_end, today)
    out.warranty_status = deadline_status(out.warranty_days_remaining)
    out.return_days_remaining = days_remaining(p.return_deadline, today)
    out.return_status = deadline_status(out.return_days_remaining)
    out.receipt_count = len(p.receipts)
    return out


def build_events(products: list[Product], today: Optional[date] = None, include_expired: bool = True) -> list[dict]:
    """Return and warranty deadlines as separate events, sorted chronologically."""
    today = today or date.today()
    events = []
    for p in products:
        for kind, d in (("return", p.return_deadline), ("warranty", p.warranty_end)):
            if d is None:
                continue
            days = days_remaining(d, today)
            if days < 0 and not include_expired:
                continue
            events.append({"product_id": p.id, "product_name": p.name, "category": p.category, "kind": kind,
                           "date": d, "days_remaining": days, "status": deadline_status(days)})
    events.sort(key=lambda e: (e["date"], e["product_name"], e["kind"]))
    return events
