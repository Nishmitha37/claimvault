import os
import shutil
import tempfile
from pathlib import Path

_tmp = tempfile.mkdtemp()
os.environ["DATABASE_URL"] = "sqlite:///" + (Path(_tmp) / "test.db").as_posix()
os.environ["SECRET_KEY"] = "test-secret-key-for-tests-only-0123456789abcdef"
os.environ["UPLOAD_DIR"] = (Path(_tmp) / "uploads").as_posix()

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.database import Base, engine  # noqa: E402
from app.main import app  # noqa: E402

PDF = b"%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF"
PNG = b"\x89PNG\r\n\x1a\n" + b"\x00" * 32


@pytest.fixture(autouse=True)
def reset_db():
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    shutil.rmtree(os.environ["UPLOAD_DIR"], ignore_errors=True)
    yield


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture
def make_user(client):
    def _make(email="alice@example.com", name="Alice"):
        r = client.post("/api/auth/register", json={"email": email, "full_name": name, "password": "password123"})
        assert r.status_code == 201, r.text
        return {"Authorization": f"Bearer {r.json()['access_token']}"}
    return _make


@pytest.fixture
def alice(make_user):
    return make_user("alice@example.com", "Alice")


@pytest.fixture
def bob(make_user):
    return make_user("bob@example.com", "Bob")


def product_payload(**over):
    from datetime import date, timedelta
    t = date.today()
    base = {"name": "Laptop", "brand": "Acme", "category": "Electronics", "model_number": "X1",
            "purchase_date": (t - timedelta(days=10)).isoformat(), "purchase_price": "999.50",
            "seller": "Shop", "order_id": "ORD-1",
            "return_deadline": (t + timedelta(days=20)).isoformat(),
            "warranty_start": (t - timedelta(days=10)).isoformat(),
            "warranty_end": (t + timedelta(days=355)).isoformat(), "notes": "n"}
    base.update(over)
    return base


@pytest.fixture
def new_product(client):
    def _new(headers, **over):
        r = client.post("/api/products", json=product_payload(**over), headers=headers)
        assert r.status_code == 201, r.text
        return r.json()
    return _new
