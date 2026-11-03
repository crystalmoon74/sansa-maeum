"""로컬 테스트용 백엔드: SQLite + 자체 서명 토큰.

Supabase 키가 없을 때 사용된다. 운영(Render)에서는 SupabaseBackend 를 사용한다.
"""
import base64
import hashlib
import hmac
import json
import secrets
import sqlite3
import threading
import time
import uuid
from datetime import datetime, timezone

from . import config

SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    pw_hash TEXT NOT NULL,
    salt TEXT NOT NULL,
    nickname TEXT NOT NULL,
    created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS temple_stays (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    temple_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'in_progress',
    reflection TEXT,
    started_at TEXT NOT NULL,
    completed_at TEXT
);
CREATE TABLE IF NOT EXISTS stay_activities (
    id TEXT PRIMARY KEY,
    stay_id TEXT NOT NULL REFERENCES temple_stays(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    step_key TEXT NOT NULL,
    note TEXT,
    duration_sec INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS wishes (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    temple_id TEXT NOT NULL,
    for_whom TEXT NOT NULL,
    category TEXT NOT NULL,
    content TEXT NOT NULL,
    bows INTEGER NOT NULL DEFAULT 0,
    nickname TEXT NOT NULL,
    share_id TEXT UNIQUE NOT NULL,
    created_at TEXT NOT NULL
);
"""

PBKDF2_ROUNDS = 310_000


class AuthError(Exception):
    pass


class NotFound(Exception):
    pass


class SignupError(Exception):
    def __init__(self, status: int, message: str) -> None:
        super().__init__(message)
        self.status = status


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _b64(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def _unb64(data: str) -> bytes:
    return base64.urlsafe_b64decode(data + "=" * (-len(data) % 4))


class LocalBackend:
    mode = "local"

    def __init__(self) -> None:
        config.DATA_DIR.mkdir(parents=True, exist_ok=True)
        self._db_path = config.DATA_DIR / "local.db"
        self._lock = threading.Lock()
        self._secret = self._load_secret()
        with self._conn() as c:
            c.executescript(SCHEMA)

    def _load_secret(self) -> bytes:
        if config.LOCAL_SECRET:
            return config.LOCAL_SECRET.encode()
        path = config.DATA_DIR / ".secret"
        if not path.exists():
            path.write_text(secrets.token_hex(32), encoding="utf-8")
        return path.read_text(encoding="utf-8").strip().encode()

    def _conn(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self._db_path, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON")
        return conn

    # ---------- 인증 ----------
    def _hash(self, password: str, salt: bytes) -> str:
        return hashlib.pbkdf2_hmac("sha256", password.encode(), salt, PBKDF2_ROUNDS).hex()

    def _issue_token(self, user_id: str) -> str:
        payload = _b64(json.dumps({"sub": user_id, "exp": int(time.time()) + config.TOKEN_TTL_SECONDS}).encode())
        sig = _b64(hmac.new(self._secret, payload.encode(), hashlib.sha256).digest())
        return f"{payload}.{sig}"

    def signup(self, email: str, password: str, nickname: str) -> dict:
        salt = secrets.token_bytes(16)
        user_id = str(uuid.uuid4())
        with self._lock, self._conn() as c:
            if c.execute("SELECT 1 FROM users WHERE email = ?", (email,)).fetchone():
                raise SignupError(409, "이미 가입된 이메일입니다. 로그인해 주세요.")
            c.execute(
                "INSERT INTO users VALUES (?,?,?,?,?,?)",
                (user_id, email, self._hash(password, salt), salt.hex(), nickname, _now()),
            )
        return {"token": self._issue_token(user_id), "user": {"id": user_id, "email": email, "nickname": nickname}}

    def login(self, email: str, password: str) -> dict:
        with self._conn() as c:
            row = c.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
        # 사용자 존재 여부와 관계없이 같은 메시지 (계정 열거 방지)
        if not row or not hmac.compare_digest(row["pw_hash"], self._hash(password, bytes.fromhex(row["salt"]))):
            raise AuthError("이메일 또는 비밀번호가 올바르지 않습니다.")
        return {
            "token": self._issue_token(row["id"]),
            "user": {"id": row["id"], "email": row["email"], "nickname": row["nickname"]},
        }

    def verify(self, token: str) -> dict:
        try:
            payload, sig = token.split(".")
            expected = _b64(hmac.new(self._secret, payload.encode(), hashlib.sha256).digest())
            if not hmac.compare_digest(sig, expected):
                raise ValueError
            data = json.loads(_unb64(payload))
            if data["exp"] < time.time():
                raise ValueError
        except Exception:
            raise AuthError("로그인이 필요합니다.")
        with self._conn() as c:
            row = c.execute("SELECT id, email, nickname FROM users WHERE id = ?", (data["sub"],)).fetchone()
        if not row:
            raise AuthError("로그인이 필요합니다.")
        return {"id": row["id"], "email": row["email"], "nickname": row["nickname"], "token": token}

    # ---------- 템플스테이 ----------
    def create_stay(self, user: dict, temple_id: str) -> dict:
        stay = {"id": str(uuid.uuid4()), "user_id": user["id"], "temple_id": temple_id,
                "status": "in_progress", "reflection": None, "started_at": _now(), "completed_at": None}
        with self._lock, self._conn() as c:
            c.execute("INSERT INTO temple_stays VALUES (:id,:user_id,:temple_id,:status,:reflection,:started_at,:completed_at)", stay)
        stay["activities"] = []
        return stay

    def _own_stay(self, c, user: dict, stay_id: str):
        row = c.execute("SELECT * FROM temple_stays WHERE id = ? AND user_id = ?", (stay_id, user["id"])).fetchone()
        if not row:
            raise NotFound("수행 기록을 찾을 수 없습니다.")
        return row

    def get_stay(self, user: dict, stay_id: str) -> dict:
        with self._conn() as c:
            stay = dict(self._own_stay(c, user, stay_id))
            stay["activities"] = [dict(r) for r in c.execute(
                "SELECT * FROM stay_activities WHERE stay_id = ? ORDER BY created_at", (stay_id,))]
        return stay

    def list_stays(self, user: dict) -> list:
        with self._conn() as c:
            stays = [dict(r) for r in c.execute(
                "SELECT * FROM temple_stays WHERE user_id = ? ORDER BY started_at DESC", (user["id"],))]
            for s in stays:
                s["activities"] = [dict(r) for r in c.execute(
                    "SELECT * FROM stay_activities WHERE stay_id = ? ORDER BY created_at", (s["id"],))]
        return stays

    def add_activity(self, user: dict, stay_id: str, step_key: str, note: str, duration_sec: int) -> dict:
        rec = {"id": str(uuid.uuid4()), "stay_id": stay_id, "user_id": user["id"], "step_key": step_key,
               "note": note, "duration_sec": duration_sec, "created_at": _now()}
        with self._lock, self._conn() as c:
            self._own_stay(c, user, stay_id)
            c.execute("INSERT INTO stay_activities VALUES (:id,:stay_id,:user_id,:step_key,:note,:duration_sec,:created_at)", rec)
        return rec

    def complete_stay(self, user: dict, stay_id: str, reflection: str) -> dict:
        with self._lock, self._conn() as c:
            self._own_stay(c, user, stay_id)
            c.execute("UPDATE temple_stays SET status='completed', reflection=?, completed_at=? WHERE id=?",
                      (reflection, _now(), stay_id))
        return self.get_stay(user, stay_id)

    # ---------- 소원 ----------
    def create_wish(self, user: dict, data: dict) -> dict:
        wish = {"id": str(uuid.uuid4()), "user_id": user["id"], **data, "nickname": user["nickname"],
                "share_id": secrets.token_urlsafe(16), "created_at": _now()}
        with self._lock, self._conn() as c:
            c.execute("INSERT INTO wishes VALUES (:id,:user_id,:temple_id,:for_whom,:category,:content,:bows,"
                      ":nickname,:share_id,:created_at)", wish)
        return wish

    def list_wishes(self, user: dict) -> list:
        with self._conn() as c:
            return [dict(r) for r in c.execute(
                "SELECT * FROM wishes WHERE user_id = ? ORDER BY created_at DESC", (user["id"],))]

    def delete_wish(self, user: dict, wish_id: str) -> None:
        with self._lock, self._conn() as c:
            cur = c.execute("DELETE FROM wishes WHERE id = ? AND user_id = ?", (wish_id, user["id"]))
            if cur.rowcount == 0:
                raise NotFound("소원을 찾을 수 없습니다.")

    def get_letter(self, share_id: str) -> dict:
        with self._conn() as c:
            row = c.execute("SELECT temple_id, for_whom, category, content, bows, nickname, created_at "
                            "FROM wishes WHERE share_id = ?", (share_id,)).fetchone()
        if not row:
            raise NotFound("편지를 찾을 수 없습니다.")
        return dict(row)
