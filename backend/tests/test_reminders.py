from datetime import date, timedelta


def ack(client, headers, pid, kind, d):
    return client.post("/api/reminders/acknowledge", json={"product_id": pid, "kind": kind, "deadline_date": d}, headers=headers)


def test_reminders_generated_once_and_linked(client, alice, new_product):
    t = date.today()
    wd = (t + timedelta(days=3)).isoformat()
    p = new_product(alice, warranty_end=wd, return_deadline=(t + timedelta(days=20)).isoformat())
    items = client.get("/api/reminders", headers=alice).json()
    items2 = client.get("/api/reminders", headers=alice).json()
    assert items == items2 and len(items) == 2
    assert items[0]["kind"] == "warranty" and items[0]["severity"] == "Urgent" and items[0]["product_id"] == p["id"]
    assert items[1]["severity"] == "Upcoming"
    assert "3 days" in items[0]["message"]


def test_far_and_expired_deadlines_have_no_reminder(client, alice, new_product):
    t = date.today()
    new_product(alice, warranty_start=(t - timedelta(days=500)).isoformat(), warranty_end=(t - timedelta(days=1)).isoformat(),
                return_deadline=(t + timedelta(days=200)).isoformat())
    assert client.get("/api/reminders", headers=alice).json() == []


def test_acknowledge_is_idempotent_and_hides_reminder(client, alice, new_product):
    t = date.today()
    wd = (t + timedelta(days=3)).isoformat()
    p = new_product(alice, warranty_end=wd, return_deadline=None)
    assert ack(client, alice, p["id"], "warranty", wd).status_code == 200
    assert ack(client, alice, p["id"], "warranty", wd).status_code == 200
    assert client.get("/api/reminders", headers=alice).json() == []
    shown = client.get("/api/reminders?include_acknowledged=true", headers=alice).json()
    assert len(shown) == 1 and shown[0]["acknowledged"] is True
    from app.database import SessionLocal
    from app.models import ReminderAcknowledgement
    with SessionLocal() as db:
        assert db.query(ReminderAcknowledgement).count() == 1


def test_new_deadline_creates_fresh_reminder(client, alice, new_product):
    t = date.today()
    wd = (t + timedelta(days=3)).isoformat()
    p = new_product(alice, warranty_end=wd, return_deadline=None)
    ack(client, alice, p["id"], "warranty", wd)
    from conftest import product_payload
    new_end = (t + timedelta(days=5)).isoformat()
    client.put(f"/api/products/{p['id']}", json=product_payload(warranty_end=new_end, return_deadline=None), headers=alice)
    assert len(client.get("/api/reminders", headers=alice).json()) == 1


def test_ack_ownership_and_stale_date(client, alice, bob, new_product):
    t = date.today()
    wd = (t + timedelta(days=3)).isoformat()
    p = new_product(alice, warranty_end=wd, return_deadline=None)
    assert ack(client, bob, p["id"], "warranty", wd).status_code == 404
    assert ack(client, alice, p["id"], "warranty", (t + timedelta(days=4)).isoformat()).status_code == 400
    assert client.get("/api/reminders", headers=bob).json() == []
