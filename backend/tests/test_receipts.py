import os

from conftest import PDF, PNG


def upload(client, headers, pid, name="r.pdf", data=PDF, ctype="application/pdf"):
    return client.post(f"/api/products/{pid}/receipts", files={"file": (name, data, ctype)}, headers=headers)


def test_upload_download_delete(client, alice, new_product):
    pid = new_product(alice)["id"]
    r = upload(client, alice, pid)
    assert r.status_code == 201 and r.json()["content_type"] == "application/pdf"
    rid = r.json()["id"]
    assert upload(client, alice, pid, "photo.PNG", PNG, "image/png").status_code == 201
    f = client.get(f"/api/receipts/{rid}/file", headers=alice)
    assert f.status_code == 200 and f.content == PDF and "inline" in f.headers["content-disposition"]
    d = client.get(f"/api/receipts/{rid}/file?download=true", headers=alice)
    assert "attachment" in d.headers["content-disposition"]
    assert len(client.get("/api/receipts", headers=alice).json()) == 2
    assert client.get(f"/api/products/{pid}", headers=alice).json()["receipt_count"] == 2
    assert client.delete(f"/api/receipts/{rid}", headers=alice).status_code == 204
    assert client.get(f"/api/receipts/{rid}/file", headers=alice).status_code == 404


def test_validation(client, alice, new_product):
    pid = new_product(alice)["id"]
    assert upload(client, alice, pid, "notes.txt", b"hello", "text/plain").status_code == 415
    assert upload(client, alice, pid, "fake.pdf", b"<script>alert(1)</script>", "application/pdf").status_code == 415
    assert upload(client, alice, pid, "mismatch.jpg", PNG, "image/jpeg").status_code == 415
    assert upload(client, alice, pid, "empty.pdf", b"", "application/pdf").status_code == 400
    big = PDF + b"0" * (5 * 1024 * 1024)
    assert upload(client, alice, pid, "big.pdf", big).status_code == 413
    ok = PDF + b"0" * (5 * 1024 * 1024 - len(PDF))
    assert upload(client, alice, pid, "max.pdf", ok).status_code == 201
    assert client.get("/api/receipts", headers=alice).json()[0]["original_filename"] == "max.pdf"


def test_ownership_checked_on_every_operation(client, alice, bob, new_product):
    pid = new_product(alice)["id"]
    rid = upload(client, alice, pid).json()["id"]
    assert upload(client, bob, pid).status_code == 404
    assert client.get(f"/api/receipts/{rid}/file", headers=bob).status_code == 404
    assert client.delete(f"/api/receipts/{rid}", headers=bob).status_code == 404
    assert client.get("/api/receipts", headers=bob).json() == []
    assert client.get(f"/api/receipts/{rid}/file").status_code == 401
    assert client.get(f"/api/receipts/{rid}/file", headers=alice).status_code == 200


def test_filename_is_sanitised_and_files_removed_with_product(client, alice, new_product):
    from app.config import get_settings
    pid = new_product(alice)["id"]
    r = upload(client, alice, pid, "../../evil.pdf")
    assert r.status_code == 201 and r.json()["original_filename"] == "evil.pdf"
    folder = os.path.join(get_settings().upload_dir, "1")
    assert len(os.listdir(folder)) == 1
    client.delete(f"/api/products/{pid}", headers=alice)
    assert os.listdir(folder) == []
