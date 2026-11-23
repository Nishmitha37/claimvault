def test_register_and_login(client):
    r = client.post("/api/auth/register", json={"email": "A@Example.com", "full_name": "A", "password": "password123"})
    assert r.status_code == 201
    assert r.json()["user"]["email"] == "a@example.com"
    assert "password" not in r.text
    ok = client.post("/api/auth/login", json={"email": "a@example.com", "password": "password123"})
    assert ok.status_code == 200 and ok.json()["access_token"]
    me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {ok.json()['access_token']}"})
    assert me.status_code == 200 and me.json()["full_name"] == "A"


def test_duplicate_email_and_weak_password(client):
    body = {"email": "a@example.com", "full_name": "A", "password": "password123"}
    assert client.post("/api/auth/register", json=body).status_code == 201
    assert client.post("/api/auth/register", json=body).status_code == 409
    assert client.post("/api/auth/register", json={**body, "email": "b@example.com", "password": "short"}).status_code == 422


def test_wrong_password(client, alice):
    r = client.post("/api/auth/login", json={"email": "alice@example.com", "password": "wrong-password"})
    assert r.status_code == 401


def test_password_is_hashed(client, alice):
    from app.database import SessionLocal
    from app.models import User
    with SessionLocal() as db:
        u = db.query(User).first()
        assert u.password_hash != "password123" and u.password_hash.startswith("$2")


def test_unauthorized_access(client):
    for path in ("/api/products", "/api/receipts", "/api/reminders", "/api/dashboard", "/api/claims", "/api/deadlines"):
        assert client.get(path).status_code == 401, path
    assert client.get("/api/products", headers={"Authorization": "Bearer not-a-token"}).status_code == 401
