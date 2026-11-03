"""산사(山寺)의 마음 — 힐링 및 기원 사이트 API 서버 (FastAPI)."""
import re
import time
import uuid
from collections import defaultdict, deque
from pathlib import Path

from fastapi import Depends, FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field, field_validator

from . import config
from .local_backend import AuthError, LocalBackend, NotFound, SignupError

if config.USE_SUPABASE:
    from .supabase_backend import SupabaseBackend
    backend = SupabaseBackend()
else:
    backend = LocalBackend()

app = FastAPI(title="Sansa API", docs_url=None, redoc_url=None, openapi_url=None)

app.add_middleware(
    CORSMiddleware,
    allow_origins=config.ALLOWED_ORIGINS,
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)


@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "no-referrer"
    if request.url.path.startswith("/api"):
        response.headers["Cache-Control"] = "no-store"
    else:
        response.headers["Cache-Control"] = "no-cache"  # 정적 파일은 항상 재검증 (ES 모듈 캐시 꼬임 방지)
    return response


# ---------- 간단한 요청 제한 (무차별 대입 방지) ----------
_hits: dict[str, deque] = defaultdict(deque)


def rate_limit(request: Request, limit: int = 10, window: int = 60) -> None:
    key = f"{request.client.host if request.client else 'x'}:{request.url.path}"
    now = time.time()
    q = _hits[key]
    while q and q[0] < now - window:
        q.popleft()
    if len(q) >= limit:
        raise HTTPException(429, "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.")
    q.append(now)


@app.exception_handler(AuthError)
async def _auth_error(_, exc: AuthError):
    return JSONResponse({"detail": str(exc)}, status_code=401)


@app.exception_handler(SignupError)
async def _signup_error(_, exc: SignupError):
    return JSONResponse({"detail": str(exc)}, status_code=exc.status)


@app.exception_handler(NotFound)
async def _not_found(_, exc: NotFound):
    return JSONResponse({"detail": str(exc)}, status_code=404)


@app.exception_handler(RuntimeError)
async def _runtime(_, exc: RuntimeError):
    return JSONResponse({"detail": "잠시 후 다시 시도해 주세요."}, status_code=502)


def current_user(authorization: str = Header(default="")) -> dict:
    if not authorization.startswith("Bearer "):
        raise AuthError("로그인이 필요합니다.")
    return backend.verify(authorization[7:])


def _uuid(value: str) -> str:
    try:
        return str(uuid.UUID(value))
    except ValueError:
        raise HTTPException(404, "찾을 수 없습니다.")


# ---------- 요청 모델 ----------
EMAIL_RE = re.compile(r"^[^@\s]{1,64}@[^@\s]{1,255}\.[^@\s]{2,}$")


class SignupIn(BaseModel):
    email: str = Field(max_length=254)
    password: str = Field(min_length=8, max_length=72)
    nickname: str = Field(default="", max_length=20)

    @field_validator("email")
    @classmethod
    def _email(cls, v: str) -> str:
        v = v.strip().lower()
        if not EMAIL_RE.match(v):
            raise ValueError("올바른 이메일 형식이 아닙니다.")
        return v

    @field_validator("nickname")
    @classmethod
    def _nick(cls, v: str) -> str:
        return v.strip() or "불자"


class LoginIn(BaseModel):
    email: str = Field(max_length=254)
    password: str = Field(max_length=72)


class StayIn(BaseModel):
    temple_id: str

    @field_validator("temple_id")
    @classmethod
    def _t(cls, v):
        if v not in config.TEMPLE_IDS:
            raise ValueError("알 수 없는 사찰입니다.")
        return v


class ActivityIn(BaseModel):
    step_key: str
    note: str = Field(default="", max_length=1000)
    duration_sec: int = Field(default=0, ge=0, le=60 * 60 * 6)

    @field_validator("step_key")
    @classmethod
    def _s(cls, v):
        if v not in config.STEP_KEYS:
            raise ValueError("알 수 없는 수행 단계입니다.")
        return v


class CompleteIn(BaseModel):
    reflection: str = Field(default="", max_length=2000)


class WishIn(BaseModel):
    temple_id: str
    for_whom: str
    category: str
    content: str = Field(min_length=1, max_length=1000)
    bows: int = Field(ge=1, le=10000)

    @field_validator("temple_id")
    @classmethod
    def _t(cls, v):
        if v not in config.TEMPLE_IDS:
            raise ValueError("알 수 없는 사찰입니다.")
        return v

    @field_validator("for_whom")
    @classmethod
    def _f(cls, v):
        if v not in config.FOR_WHOM:
            raise ValueError("잘못된 값입니다.")
        return v

    @field_validator("category")
    @classmethod
    def _c(cls, v):
        if v not in config.WISH_CATEGORIES:
            raise ValueError("잘못된 값입니다.")
        return v


# ---------- 라우트 ----------
@app.get("/api/health")
def health():
    return {"ok": True, "mode": backend.mode}


@app.post("/api/auth/signup")
def signup(body: SignupIn, request: Request):
    rate_limit(request, limit=5)
    return backend.signup(body.email, body.password, body.nickname)


@app.post("/api/auth/login")
def login(body: LoginIn, request: Request):
    rate_limit(request)
    return backend.login(body.email.strip().lower(), body.password)


@app.get("/api/me")
def me(user: dict = Depends(current_user)):
    return {k: user[k] for k in ("id", "email", "nickname")}


@app.post("/api/stays")
def create_stay(body: StayIn, user: dict = Depends(current_user)):
    return backend.create_stay(user, body.temple_id)


@app.get("/api/stays")
def list_stays(user: dict = Depends(current_user)):
    return backend.list_stays(user)


@app.get("/api/stays/{stay_id}")
def get_stay(stay_id: str, user: dict = Depends(current_user)):
    return backend.get_stay(user, _uuid(stay_id))


@app.post("/api/stays/{stay_id}/activities")
def add_activity(stay_id: str, body: ActivityIn, user: dict = Depends(current_user)):
    return backend.add_activity(user, _uuid(stay_id), body.step_key, body.note.strip(), body.duration_sec)


@app.post("/api/stays/{stay_id}/complete")
def complete_stay(stay_id: str, body: CompleteIn, user: dict = Depends(current_user)):
    return backend.complete_stay(user, _uuid(stay_id), body.reflection.strip())


@app.post("/api/wishes")
def create_wish(body: WishIn, user: dict = Depends(current_user)):
    data = body.model_dump()
    data["content"] = data["content"].strip()
    return backend.create_wish(user, data)


@app.get("/api/wishes")
def list_wishes(user: dict = Depends(current_user)):
    return backend.list_wishes(user)


@app.delete("/api/wishes/{wish_id}")
def delete_wish(wish_id: str, user: dict = Depends(current_user)):
    backend.delete_wish(user, _uuid(wish_id))
    return {"ok": True}


@app.get("/api/letters/{share_id}")
def get_letter(share_id: str, request: Request):
    rate_limit(request, limit=60)
    if not re.fullmatch(r"[A-Za-z0-9_-]{16,64}", share_id):
        raise HTTPException(404, "편지를 찾을 수 없습니다.")
    return backend.get_letter(share_id)


# 로컬 개발 편의: 프론트엔드도 같은 서버에서 제공 (http://localhost:8000)
_FRONTEND = Path(__file__).resolve().parents[2] / "frontend"
if _FRONTEND.exists():
    app.mount("/", StaticFiles(directory=_FRONTEND, html=True), name="frontend")
