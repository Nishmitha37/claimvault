from datetime import date, timedelta

from app.services.deadlines import build_events, days_remaining, deadline_status
from conftest import product_payload


def test_days_remaining():
    today = date(2026, 1, 10)
    assert days_remaining(date(2026, 1, 10), today) == 0
    assert days_remaining(date(2026, 1, 13), today) == 3
    assert days_remaining(date(2026, 1, 9), today) == -1
    assert days_remaining(None, today) is None


def test_status_boundaries():
    assert deadline_status(None) is None
    assert deadline_status(-1) == "Expired"
    assert deadline_status(0) == "Urgent"
    assert deadline_status(7) == "Urgent"
    assert deadline_status(8) == "Upcoming"
    assert deadline_status(30) == "Upcoming"
    assert deadline_status(31) == "Active"


def test_return_and_warranty_tracked_separately(client, alice, new_product):
    t = date.today()
    p = new_product(alice, return_deadline=(t + timedelta(days=3)).isoformat(),
                    warranty_end=(t + timedelta(days=200)).isoformat())
    assert p["return_status"] == "Urgent" and p["return_days_remaining"] == 3
    assert p["warranty_status"] == "Active" and p["warranty_days_remaining"] == 200


def test_events_sorted_chronologically(client, alice, new_product):
    t = date.today()
    new_product(alice, name="A", return_deadline=(t + timedelta(days=50)).isoformat(), warranty_end=(t + timedelta(days=10)).isoformat())
    new_product(alice, name="B", return_deadline=(t + timedelta(days=5)).isoformat(), warranty_end=(t + timedelta(days=90)).isoformat())
    events = client.get("/api/deadlines", headers=alice).json()
    dates = [e["date"] for e in events]
    assert dates == sorted(dates) and len(events) == 4
    assert {e["kind"] for e in events} == {"return", "warranty"}
