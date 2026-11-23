def make_claim(client, headers, pid, ref="CLM-1"):
    return client.post("/api/claims", json={"product_id": pid, "reference_number": ref, "description": "Screen flickers"}, headers=headers)


def test_claim_lifecycle_and_history(client, alice, new_product):
    pid = new_product(alice)["id"]
    c = make_claim(client, alice, pid)
    assert c.status_code == 201 and c.json()["status"] == "Open" and len(c.json()["history"]) == 1
    cid = c.json()["id"]
    for status, note in [("Submitted", "Sent to brand"), ("In Repair", None), ("Resolved", "Fixed")]:
        r = client.patch(f"/api/claims/{cid}/status", json={"status": status, "note": note}, headers=alice)
        assert r.status_code == 200 and r.json()["status"] == status
    h = client.get(f"/api/claims/{cid}", headers=alice).json()["history"]
    assert [x["new_status"] for x in h] == ["Open", "Submitted", "In Repair", "Resolved"]
    assert h[1]["old_status"] == "Open" and h[1]["note"] == "Sent to brand"
    assert client.get(f"/api/claims?product_id={pid}", headers=alice).json()[0]["id"] == cid


def test_invalid_and_duplicate_status(client, alice, new_product):
    pid = new_product(alice)["id"]
    cid = make_claim(client, alice, pid).json()["id"]
    assert client.patch(f"/api/claims/{cid}/status", json={"status": "Bogus"}, headers=alice).status_code == 422
    assert client.patch(f"/api/claims/{cid}/status", json={"status": "Open"}, headers=alice).status_code == 400


def test_duplicate_reference_and_ownership(client, alice, bob, new_product):
    pid = new_product(alice)["id"]
    cid = make_claim(client, alice, pid).json()["id"]
    assert make_claim(client, alice, pid).status_code == 409
    assert make_claim(client, bob, pid, "CLM-9").status_code == 404
    assert client.get(f"/api/claims/{cid}", headers=bob).status_code == 404
    assert client.patch(f"/api/claims/{cid}/status", json={"status": "Submitted"}, headers=bob).status_code == 404
    assert client.delete(f"/api/claims/{cid}", headers=bob).status_code == 404
    assert client.get("/api/claims", headers=bob).json() == []


def test_deleting_product_removes_claims(client, alice, new_product):
    pid = new_product(alice)["id"]
    make_claim(client, alice, pid)
    client.delete(f"/api/products/{pid}", headers=alice)
    assert client.get("/api/claims", headers=alice).json() == []


def test_dashboard(client, alice, new_product):
    new_product(alice, purchase_price="100")
    new_product(alice, name="B", category="Appliances", purchase_price="50.25")
    d = client.get("/api/dashboard", headers=alice).json()
    assert d["total_products"] == 2 and d["active_warranties"] == 2 and d["total_spending"] == 150.25
    assert {c["category"] for c in d["category_spending"]} == {"Electronics", "Appliances"}
    assert len(d["recent_products"]) == 2
