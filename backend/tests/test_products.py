from datetime import date, timedelta

from conftest import product_payload


def test_product_crud(client, alice, new_product):
    p = new_product(alice)
    assert p["purchase_price"] == 999.5 and p["warranty_status"] == "Active"
    assert client.get(f"/api/products/{p['id']}", headers=alice).json()["name"] == "Laptop"
    upd = client.put(f"/api/products/{p['id']}", json=product_payload(name="Laptop Pro"), headers=alice)
    assert upd.status_code == 200 and upd.json()["name"] == "Laptop Pro"
    assert client.delete(f"/api/products/{p['id']}", headers=alice).status_code == 204
    assert client.get(f"/api/products/{p['id']}", headers=alice).status_code == 404


def test_validation(client, alice):
    t = date.today()
    bad = product_payload(warranty_end=(t - timedelta(days=100)).isoformat())
    assert client.post("/api/products", json=bad, headers=alice).status_code == 422
    assert client.post("/api/products", json=product_payload(purchase_price="-1"), headers=alice).status_code == 422
    only_start = product_payload(warranty_end=None)
    assert client.post("/api/products", json=only_start, headers=alice).status_code == 422
    assert client.post("/api/products", json=product_payload(name="  "), headers=alice).status_code == 422


def test_cross_user_isolation(client, alice, bob, new_product):
    p = new_product(alice)
    pid = p["id"]
    assert client.get(f"/api/products/{pid}", headers=bob).status_code == 404
    assert client.put(f"/api/products/{pid}", json=product_payload(), headers=bob).status_code == 404
    assert client.delete(f"/api/products/{pid}", headers=bob).status_code == 404
    assert client.get("/api/products", headers=bob).json() == []
    assert client.get(f"/api/products/{pid}", headers=alice).status_code == 200


def test_search_filter_sort(client, alice, new_product):
    t = date.today()
    new_product(alice, name="Phone", category="Electronics", warranty_end=(t + timedelta(days=100)).isoformat())
    new_product(alice, name="Fridge", category="Appliances", warranty_end=(t + timedelta(days=5)).isoformat())
    new_product(alice, name="Old Toaster", category="Appliances", warranty_start=(t - timedelta(days=400)).isoformat(),
                warranty_end=(t - timedelta(days=30)).isoformat())
    new_product(alice, name="Chair", category="Furniture", warranty_start=None, warranty_end=None)
    names = lambda r: [p["name"] for p in r.json()]
    assert names(client.get("/api/products?search=fri", headers=alice)) == ["Fridge"]
    assert set(names(client.get("/api/products?category=Appliances", headers=alice))) == {"Fridge", "Old Toaster"}
    assert names(client.get("/api/products?warranty_status=expired", headers=alice)) == ["Old Toaster"]
    assert names(client.get("/api/products?warranty_status=urgent", headers=alice)) == ["Fridge"]
    assert names(client.get("/api/products?warranty_status=none", headers=alice)) == ["Chair"]
    assert names(client.get("/api/products?sort=expiry_asc", headers=alice)) == ["Old Toaster", "Fridge", "Phone", "Chair"]
    assert names(client.get("/api/products?sort=expiry_desc", headers=alice)) == ["Phone", "Fridge", "Old Toaster", "Chair"]
