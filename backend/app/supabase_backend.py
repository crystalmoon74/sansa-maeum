"""운영용 백엔드: Supabase Auth + PostgREST(REST API).

모든 DB 요청은 사용자의 access token 으로 전송되므로 Supabase RLS 정책이 그대로 적용된다.
service_role 키는 사용하지 않는다.
"""
import secrets
from datetime import datetime, timezone

import httpx

from . import config
from .local_backend import AuthError, NotFound, SignupError

# Supabase Auth 의 error_code → (HTTP 상태, 사용자에게 보일 문구)
SIGNUP_ERRORS = {
    "over_email_send_rate_limit": (429, "지금은 가입 확인 메일을 보낼 수 없습니다(시간당 발송 한도). 잠시 후 다시 시도해 주세요."),
    "over_request_rate_limit": (429, "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요."),
    "user_already_exists": (409, "이미 가입된 이메일입니다. 로그인해 주세요."),
    "email_exists": (409, "이미 가입된 이메일입니다. 로그인해 주세요."),
    "weak_password": (400, "비밀번호가 너무 쉽습니다. 더 길거나 복잡한 비밀번호를 써 주세요."),
    "email_address_invalid": (400, "사용할 수 없는 이메일 주소입니다."),
    "signup_disabled": (403, "지금은 새로 가입할 수 없습니다."),
}


class SupabaseBackend:
    mode = "supabase"

    def __init__(self) -> None:
        self._client = httpx.Client(base_url=config.SUPABASE_URL, timeout=10.0)
        self._anon = config.SUPABASE_ANON_KEY

    def _headers(self, token: str | None = None) -> dict:
        # 새 publishable 키(sb_publishable_...)는 JWT 가 아니므로 Authorization 에 넣지 않는다.
        # 로그인한 사용자의 요청만 사용자 JWT 를 Bearer 로 보낸다.
        headers = {"apikey": self._anon, "Content-Type": "application/json"}
        if token:
            headers["Authorization"] = f"Bearer {token}"
        return headers

    @staticmethod
    def _user(data: dict) -> dict:
        meta = data.get("user_metadata") or {}
        # user_metadata 는 사용자가 Supabase Auth API 로 직접 바꿀 수 있으므로 다시 정리한다
        nickname = str(meta.get("nickname") or "").strip()[:20] or "불자"
        return {"id": data["id"], "email": data.get("email"), "nickname": nickname}

    # ---------- 인증 ----------
    def signup(self, email: str, password: str, nickname: str) -> dict:
        r = self._client.post("/auth/v1/signup", headers=self._headers(),
                              json={"email": email, "password": password, "data": {"nickname": nickname}})
        if r.status_code >= 400:
            try:
                code = r.json().get("error_code", "")
            except ValueError:
                code = ""
            raise SignupError(*SIGNUP_ERRORS.get(code, (400, "가입할 수 없습니다. 이메일을 확인하거나 다른 비밀번호를 사용해 주세요.")))
        body = r.json()
        if not body.get("access_token"):
            # 이메일 인증이 켜져 있는 경우 세션 없이 반환된다
            return {"needs_confirmation": True}
        return {"token": body["access_token"], "user": self._user(body["user"])}

    def login(self, email: str, password: str) -> dict:
        r = self._client.post("/auth/v1/token", params={"grant_type": "password"}, headers=self._headers(),
                              json={"email": email, "password": password})
        if r.status_code >= 400:
            try:
                code = r.json().get("error_code", "")
            except ValueError:
                code = ""
            if code == "email_not_confirmed":
                raise AuthError("메일함의 가입 확인 링크를 먼저 눌러 주세요.")
            raise AuthError("이메일 또는 비밀번호가 올바르지 않습니다.")
        body = r.json()
        return {"token": body["access_token"], "user": self._user(body["user"])}

    def verify(self, token: str) -> dict:
        r = self._client.get("/auth/v1/user", headers=self._headers(token))
        if r.status_code != 200:
            raise AuthError("로그인이 필요합니다.")
        return {**self._user(r.json()), "token": token}

    # ---------- PostgREST 헬퍼 ----------
    def _rest(self, method: str, path: str, user: dict | None, **kw) -> list | dict | None:
        headers = self._headers(user["token"] if user else None)
        headers["Prefer"] = "return=representation"
        r = self._client.request(method, f"/rest/v1/{path}", headers=headers, **kw)
        if r.status_code >= 400:
            raise RuntimeError(f"Supabase 오류 {r.status_code}")
        return r.json() if r.content else None

    # ---------- 템플스테이 ----------
    def create_stay(self, user: dict, temple_id: str) -> dict:
        rows = self._rest("POST", "temple_stays", user, json={"user_id": user["id"], "temple_id": temple_id})
        return {**rows[0], "activities": []}

    def get_stay(self, user: dict, stay_id: str) -> dict:
        rows = self._rest("GET", "temple_stays", user,
                          params={"id": f"eq.{stay_id}", "select": "*,activities:stay_activities(*)"})
        if not rows:
            raise NotFound("수행 기록을 찾을 수 없습니다.")
        return rows[0]

    def list_stays(self, user: dict) -> list:
        return self._rest("GET", "temple_stays", user,
                          params={"select": "*,activities:stay_activities(*)", "order": "started_at.desc"})

    def add_activity(self, user: dict, stay_id: str, step_key: str, note: str, duration_sec: int) -> dict:
        self.get_stay(user, stay_id)  # 소유권 확인 (RLS 로도 보장됨)
        rows = self._rest("POST", "stay_activities", user, json={
            "stay_id": stay_id, "user_id": user["id"], "step_key": step_key,
            "note": note, "duration_sec": duration_sec})
        return rows[0]

    def complete_stay(self, user: dict, stay_id: str, reflection: str) -> dict:
        rows = self._rest("PATCH", "temple_stays", user, params={"id": f"eq.{stay_id}"},
                          json={"status": "completed", "reflection": reflection,
                                "completed_at": datetime.now(timezone.utc).isoformat()})
        if not rows:
            raise NotFound("수행 기록을 찾을 수 없습니다.")
        return self.get_stay(user, stay_id)

    # ---------- 소원 ----------
    def create_wish(self, user: dict, data: dict) -> dict:
        rows = self._rest("POST", "wishes", user, json={
            **data, "user_id": user["id"], "nickname": user["nickname"],
            "share_id": secrets.token_urlsafe(16)})
        return rows[0]

    def list_wishes(self, user: dict) -> list:
        return self._rest("GET", "wishes", user, params={"order": "created_at.desc"})

    def delete_wish(self, user: dict, wish_id: str) -> None:
        rows = self._rest("DELETE", "wishes", user, params={"id": f"eq.{wish_id}"})
        if not rows:
            raise NotFound("소원을 찾을 수 없습니다.")

    def get_letter(self, share_id: str) -> dict:
        rows = self._rest("POST", "rpc/get_shared_letter", None, json={"p_share_id": share_id})
        if not rows:
            raise NotFound("편지를 찾을 수 없습니다.")
        return rows[0]
