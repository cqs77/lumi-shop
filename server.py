#!/usr/bin/env python3
"""
光采汇 - 商城 + 后台管理（COMMON(0)/RACE(1)/EPIC(2) 三分类）
数据存储：支持 GitHub 远程存储（免费永久）或本地文件
  - 配置 GITHUB_TOKEN + GITHUB_REPO → 数据存 GitHub
  - 未配置 → 退回本地文件
"""
import json, os, time, base64, urllib.request, urllib.error

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "780124Cq")

GITHUB_TOKEN = os.environ.get("GITHUB_TOKEN", "").strip()
GITHUB_REPO = os.environ.get("GITHUB_REPO", "").strip()
GITHUB_BRANCH = os.environ.get("GITHUB_BRANCH", "main").strip() or "main"
GH_PRODUCTS_PATH = os.environ.get("GH_PRODUCTS_PATH", "shopdata/products.json")
GH_ORDERS_PATH = os.environ.get("GH_ORDERS_PATH", "shopdata/orders.json")
USE_GITHUB = bool(GITHUB_TOKEN and GITHUB_REPO)

DATA_DIR = os.environ.get("DATA_DIR") or os.path.join(BASE_DIR, "data")
LOCAL_PRODUCTS = os.path.join(DATA_DIR, "products.json")
LOCAL_ORDERS = os.path.join(DATA_DIR, "orders.json")
UPLOAD_DIR = os.environ.get("UPLOAD_DIR") or os.path.join(BASE_DIR, "static", "uploads")
os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(UPLOAD_DIR, exist_ok=True)

CATEGORIES = [
    {"id": "common", "name": "COMMON(0)", "desc": "常规系列", "order": 0},
    {"id": "race",   "name": "RACE(1)",   "desc": "竞速系列", "order": 1},
    {"id": "epic",   "name": "EPIC(2)",   "desc": "史诗系列", "order": 2},
]

DEFAULT_PRODUCTS = [
    {"id": "p1", "name": "川崖泉", "price_usd": 5.0, "category": "common",
     "image": "/static/img/p1.jpg", "desc": "五粮香浓，回甘，绵柔 · 浓香型白酒",
     "detail": "川崖泉浓香型白酒，精选优质五粮，采用传统固态发酵工艺精心酿造。酒体醇厚绵柔，入口甘美顺滑，回味悠长。"},
    {"id": "p2", "name": "中航生物尊享卡", "price_usd": 5.0, "category": "epic",
     "image": "/static/img/p2.jpg", "desc": "细胞级健康管理 · VIP 体检与专属健康咨询",
     "detail": "中航生物细胞级健康管理尊享卡，权益涵盖公立医院高端 VIP 体检、全身功能医学检测、高端养护项目、专家健康讲座，以及一对一专属健康咨询。"},
]


def _gh_api(method, url, payload=None):
    headers = {"Authorization": f"token {GITHUB_TOKEN}",
               "Accept": "application/vnd.github.v3+json",
               "User-Agent": "shop", "Content-Type": "application/json"}
    data = json.dumps(payload).encode() if payload is not None else None
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    with urllib.request.urlopen(req, timeout=20) as r:
        body = r.read().decode()
        return json.loads(body) if body else {}


def gh_read(path, default):
    if not USE_GITHUB:
        return default
    url = f"https://api.github.com/repos/{GITHUB_REPO}/contents/{path}?ref={GITHUB_BRANCH}"
    try:
        res = _gh_api("GET", url)
        return json.loads(base64.b64decode(res["content"]).decode("utf-8"))
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return default
        print(f"[GH read HTTP {e.code}] {path}", flush=True)
        return default
    except Exception as e:
        print(f"[GH read err] {e}", flush=True)
        return default


def gh_write(path, data):
    if not USE_GITHUB:
        return False
    content = json.dumps(data, ensure_ascii=False, indent=2)
    b64 = base64.b64encode(content.encode("utf-8")).decode()
    sha = None
    try:
        url = f"https://api.github.com/repos/{GITHUB_REPO}/contents/{path}?ref={GITHUB_BRANCH}"
        sha = _gh_api("GET", url).get("sha")
    except Exception:
        pass
    payload = {"message": f"update {path}", "content": b64, "branch": GITHUB_BRANCH}
    if sha:
        payload["sha"] = sha
    url = f"https://api.github.com/repos/{GITHUB_REPO}/contents/{path}"
    try:
        _gh_api("PUT", url, payload)
        return True
    except Exception as e:
        print(f"[GH write err] {e}", flush=True)
        return False


def _local_read(path, default):
    if not os.path.exists(path):
        _local_write(path, default)
        return list(default)
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def _local_write(path, data):
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    os.replace(tmp, path)


def load_products():
    return gh_read(GH_PRODUCTS_PATH, DEFAULT_PRODUCTS) if USE_GITHUB else _local_read(LOCAL_PRODUCTS, DEFAULT_PRODUCTS)


def save_products(p):
    if USE_GITHUB:
        return gh_write(GH_PRODUCTS_PATH, p)
    _local_write(LOCAL_PRODUCTS, p); return True


def load_orders():
    return gh_read(GH_ORDERS_PATH, []) if USE_GITHUB else _local_read(LOCAL_ORDERS, [])


def save_orders(o):
    if USE_GITHUB:
        return gh_write(GH_ORDERS_PATH, o)
    _local_write(LOCAL_ORDERS, o); return True


from flask import Flask, jsonify, request, send_from_directory, abort
app = Flask(__name__, static_folder="static", static_url_path="/static")


def require_admin():
    if request.headers.get("X-Admin-Password", "") != ADMIN_PASSWORD:
        abort(401)


@app.route("/")
def index(): return send_from_directory(BASE_DIR, "index.html")


@app.route("/admin")
def admin(): return send_from_directory(BASE_DIR, "admin.html")


@app.route("/uploads/<path:name>")
def serve_upload(name): return send_from_directory(UPLOAD_DIR, name)


@app.route("/api/storage-mode")
def storage_mode():
    return jsonify({"mode": "github" if USE_GITHUB else "local", "repo": GITHUB_REPO if USE_GITHUB else None})


@app.route("/api/categories")
def api_categories():
    return jsonify(sorted(CATEGORIES, key=lambda c: c.get("order", 99)))


@app.route("/api/products")
def api_products():
    products = load_products()
    cat = request.args.get("category")
    if cat:
        products = [p for p in products if (p.get("category") or "") == cat]
    return jsonify(products)


@app.route("/api/products", methods=["POST"])
def api_add_product():
    require_admin()
    d = request.get_json(force=True) or {}
    products = load_products()
    pid = d.get("id") or ("p" + str(int(time.time() * 1000)))
    item = {"id": pid, "name": (d.get("name") or "").strip(),
            "price_usd": float(d.get("price_usd") or 0),
            "category": (d.get("category") or "").strip(), "image": d.get("image") or "",
            "desc": (d.get("desc") or "").strip(), "detail": (d.get("detail") or "").strip()}
    if not item["name"]:
        return jsonify({"ok": False, "error": "name required"}), 400
    products = [p for p in products if p.get("id") != pid]
    products.append(item)
    if not save_products(products):
        return jsonify({"ok": False, "error": "save failed"}), 500
    return jsonify({"ok": True, "product": item})


@app.route("/api/products/<pid>", methods=["PUT"])
def api_edit_product(pid):
    require_admin()
    d = request.get_json(force=True) or {}
    products = load_products(); found = False
    for p in products:
        if p.get("id") == pid:
            found = True
            for k in ("name", "image", "desc", "detail", "category"):
                if k in d:
                    p[k] = (d[k] or "").strip() if k != "image" else (d[k] or "")
            if "price_usd" in d:
                p["price_usd"] = float(d["price_usd"] or 0)
    if not found:
        return jsonify({"ok": False, "error": "not found"}), 404
    ok = save_products(products)
    return jsonify({"ok": True}) if ok else (jsonify({"ok": False, "error": "save failed"}), 500)


@app.route("/api/products/<pid>", methods=["DELETE"])
def api_delete_product(pid):
    require_admin()
    save_products([p for p in load_products() if p.get("id") != pid])
    return jsonify({"ok": True})


@app.route("/api/upload", methods=["POST"])
def api_upload():
    require_admin()
    f = request.files.get("file")
    if not f or not f.filename:
        return jsonify({"ok": False, "error": "no file"}), 400
    ext = os.path.splitext(f.filename)[1].lower()
    if ext not in (".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"):
        return jsonify({"ok": False, "error": "unsupported type"}), 400
    raw = f.read()
    name = "img_" + str(int(time.time() * 1000)) + ext
    if USE_GITHUB:
        b64 = base64.b64encode(raw).decode()
        gh_path = f"static/uploads/{name}"
        try:
            _gh_api("PUT", f"https://api.github.com/repos/{GITHUB_REPO}/contents/{gh_path}",
                    {"message": f"upload {name}", "content": b64, "branch": GITHUB_BRANCH})
            return jsonify({"ok": True, "url": "/uploads/" + name})
        except Exception as e:
            return jsonify({"ok": False, "error": f"github upload failed: {e}"}), 500
    with open(os.path.join(UPLOAD_DIR, name), "wb") as fp:
        fp.write(raw)
    return jsonify({"ok": True, "url": "/uploads/" + name})


@app.route("/api/orders", methods=["POST"])
def api_create_order():
    d = request.get_json(force=True) or {}
    items_in = d.get("items") or []
    if not items_in:
        return jsonify({"ok": False, "error": "empty cart"}), 400
    pmap = {p["id"]: p for p in load_products()}
    items = []; total = 0.0
    for it in items_in:
        p = pmap.get(it.get("id"))
        if not p: continue
        qty = max(1, int(it.get("qty") or 1))
        items.append({"id": p["id"], "name": p["name"], "price_usd": p["price_usd"],
                      "qty": qty, "subtotal": round(p["price_usd"] * qty, 2)})
        total += p["price_usd"] * qty
    if not items:
        return jsonify({"ok": False, "error": "invalid items"}), 400
    ship = d.get("shipping") or {}
    for k in ["name", "phone", "country", "address"]:
        if not (ship.get(k) or "").strip():
            return jsonify({"ok": False, "error": f"missing {k}"}), 400
    order = {"order_no": "OD" + str(int(time.time() * 1000)),
             "created_at": time.strftime("%Y-%m-%d %H:%M:%S"), "status": "pending",
             "items": items, "total_usd": round(total, 2),
             "shipping": {k: (ship.get(k) or "").strip() for k in
                          ["name", "phone", "email", "country", "province", "city", "address", "zipcode", "note"]}}
    orders = load_orders(); orders.append(order); save_orders(orders)
    return jsonify({"ok": True, "order_no": order["order_no"]})


@app.route("/api/orders")
def api_list_orders():
    require_admin()
    orders = load_orders()
    orders.sort(key=lambda o: o.get("created_at", ""), reverse=True)
    return jsonify(orders)


@app.route("/api/orders/<order_no>", methods=["PUT"])
def api_update_order(order_no):
    require_admin()
    d = request.get_json(force=True) or {}
    orders = load_orders(); found = False
    for o in orders:
        if o.get("order_no") == order_no:
            found = True
            if d.get("status"): o["status"] = d["status"]
    if not found: return jsonify({"ok": False, "error": "not found"}), 404
    save_orders(orders); return jsonify({"ok": True})


@app.route("/api/orders/<order_no>", methods=["DELETE"])
def api_delete_order(order_no):
    require_admin()
    save_orders([o for o in load_orders() if o.get("order_no") != order_no])
    return jsonify({"ok": True})


@app.route("/api/stats")
def api_stats():
    require_admin()
    orders = load_orders(); by_status = {}; by_country = {}; cat_count = {}
    for o in orders:
        s = o.get("status", "pending"); by_status[s] = by_status.get(s, 0) + 1
        c = (o.get("shipping") or {}).get("country", "未知") or "未知"
        by_country[c] = by_country.get(c, 0) + 1
    for p in load_products():
        c = p.get("category") or "未分类"
        cat_count[c] = cat_count.get(c, 0) + 1
    return jsonify({"total_orders": len(orders),
                    "total_qty": sum(sum(i.get("qty", 0) for i in o.get("items", [])) for o in orders),
                    "total_usd": round(sum(o.get("total_usd", 0) for o in orders), 2),
                    "by_status": by_status, "by_country": by_country, "by_category": cat_count})


@app.route("/api/orders/export.csv")
def api_export_csv():
    require_admin()
    import csv, io
    from flask import Response
    orders = load_orders(); buf = io.StringIO(); buf.write("\ufeff")
    w = csv.writer(buf)
    w.writerow(["订单号", "下单时间", "状态", "商品", "数量", "小计USD", "订单总额USD",
                "收货人", "电话", "邮箱", "国家", "省/州", "城市", "详细地址", "邮编", "备注"])
    cn = {"pending": "待处理", "shipped": "已发货", "done": "已完成", "cancelled": "已取消"}
    for o in orders:
        s = o.get("shipping", {})
        for i, it in enumerate(o.get("items", [])):
            row = []
            if i == 0:
                row += [o.get("order_no", ""), o.get("created_at", ""), cn.get(o.get("status"), ""),
                        it.get("name", ""), it.get("qty", 0), it.get("subtotal", 0), o.get("total_usd", 0)]
                row += [s.get("name", ""), s.get("phone", ""), s.get("email", ""), s.get("country", ""),
                        s.get("province", ""), s.get("city", ""), s.get("address", ""), s.get("zipcode", ""), s.get("note", "")]
            else:
                row += ["", "", "", it.get("name", ""), it.get("qty", 0), it.get("subtotal", 0), ""] + [""] * 9
            w.writerow(row)
    return Response(buf.getvalue(), mimetype="text/csv",
                    headers={"Content-Disposition": "attachment; filename=orders.csv"})


@app.route("/api/health")
def health():
    return jsonify({"ok": True, "storage": "github" if USE_GITHUB else "local"})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 10000)), debug=False)
