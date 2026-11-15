"""
app.py — (वैकल्पिक) Python/Flask सर्वर: असली अकाउंट + डेटा क्लाउड में सेव
GitHub Pages सिर्फ़ स्टैटिक है, इसलिए यह सर्वर अलग जगह चलाएँ (Render, Railway, PythonAnywhere आदि)।

चलाना:
    pip install flask flask-cors pyjwt
    set/export SECRET_KEY="कोई-लंबा-गुप्त-शब्द"
    python app.py
फिर index.html में features.js से पहले यह लाइन जोड़ें:
    <script>window.BHARAT_API = "https://आपका-सर्वर-url";</script>
"""
import os, json, sqlite3, datetime
from flask import Flask, request, jsonify, g
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
import jwt

app = Flask(__name__)
CORS(app)  # production में origins=["https://kundankrishna666-lang.github.io"] रखें
SECRET = os.environ.get("SECRET_KEY", "change-me")
DB = os.environ.get("DB_PATH", "bharat.db")


def db():
    if "db" not in g:
        g.db = sqlite3.connect(DB)
        g.db.execute("CREATE TABLE IF NOT EXISTS users (name TEXT PRIMARY KEY, pw TEXT, data TEXT DEFAULT '{}')")
    return g.db


@app.teardown_appcontext
def close(_):
    d = g.pop("db", None)
    if d:
        d.close()


def make_token(user):
    exp = datetime.datetime.utcnow() + datetime.timedelta(days=30)
    return jwt.encode({"u": user, "exp": exp}, SECRET, algorithm="HS256")


def current_user():
    h = request.headers.get("Authorization", "")
    try:
        return jwt.decode(h.replace("Bearer ", ""), SECRET, algorithms=["HS256"])["u"]
    except Exception:
        return None


@app.post("/api/register")
def register():
    j = request.get_json(force=True)
    u, p = (j.get("username") or "").strip().lower(), j.get("password") or ""
    if not u or len(p) < 6:
        return jsonify(error="यूज़रनेम और 6+ अक्षर का पासवर्ड चाहिए"), 400
    try:
        db().execute("INSERT INTO users(name, pw) VALUES (?,?)", (u, generate_password_hash(p)))
        db().commit()
    except sqlite3.IntegrityError:
        return jsonify(error="यह यूज़रनेम पहले से है"), 409
    return jsonify(token=make_token(u))


@app.post("/api/login")
def login():
    j = request.get_json(force=True)
    u, p = (j.get("username") or "").strip().lower(), j.get("password") or ""
    row = db().execute("SELECT pw FROM users WHERE name=?", (u,)).fetchone()
    if not row or not check_password_hash(row[0], p):
        return jsonify(error="गलत यूज़रनेम या पासवर्ड"), 401
    return jsonify(token=make_token(u))


@app.route("/api/data", methods=["GET", "PUT"])
def data():
    u = current_user()
    if not u:
        return jsonify(error="लॉगिन करें"), 401
    if request.method == "PUT":
        body = json.dumps(request.get_json(force=True))
        if len(body) > 500_000:
            return jsonify(error="डेटा बहुत बड़ा है"), 413
        db().execute("UPDATE users SET data=? WHERE name=?", (body, u))
        db().commit()
        return jsonify(ok=True)
    row = db().execute("SELECT data FROM users WHERE name=?", (u,)).fetchone()
    return jsonify(json.loads(row[0]) if row else {})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)))
