"""환경 설정. backend/.env 파일 또는 환경 변수에서 읽는다."""
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent


def _load_dotenv(path: Path) -> None:
    if not path.exists():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


_load_dotenv(BASE_DIR / ".env")

# Render 가 자동으로 넣어 주는 환경 변수. Render 위에서는 아래 공개 설정을 기본값으로 쓴다.
ON_RENDER = bool(os.getenv("RENDER"))

# 운영 Supabase 프로젝트의 공개 설정.
# publishable 키는 브라우저 앱에 넣어 공개해도 되는 키다(권한은 RLS 가 막는다). secret 키는 절대 여기 넣지 않는다.
PUBLIC_SUPABASE_URL = "https://xjmpmhrohdswalszmapz.supabase.co"
PUBLIC_SUPABASE_KEY = "sb_publishable_1uimcTFL_zba7lWGMgcNiA_d8P6W5ps"
PUBLIC_ORIGINS = "https://crystalmoon74.github.io"

SUPABASE_URL = os.getenv("SUPABASE_URL", PUBLIC_SUPABASE_URL if ON_RENDER else "").rstrip("/")
SUPABASE_ANON_KEY = (
    os.getenv("SUPABASE_PUBLISHABLE_KEY")
    or os.getenv("SUPABASE_ANON_KEY")
    or (PUBLIC_SUPABASE_KEY if ON_RENDER else "")
)

# Supabase 설정이 없으면 로컬 SQLite 모드로 동작 (로컬 테스트용)
USE_SUPABASE = bool(SUPABASE_URL and SUPABASE_ANON_KEY)

ALLOWED_ORIGINS = [
    o.strip()
    for o in os.getenv(
        "ALLOWED_ORIGINS",
        PUBLIC_ORIGINS if ON_RENDER
        else "http://localhost:5500,http://127.0.0.1:5500,http://localhost:8000,http://127.0.0.1:8000",
    ).split(",")
    if o.strip()
]

DATA_DIR = Path(os.getenv("DATA_DIR", BASE_DIR / "data"))
LOCAL_SECRET = os.getenv("LOCAL_SECRET", "")
TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7

TEMPLE_IDS = {"bulguksa", "haeinsa", "tongdosa", "songgwangsa", "buseoksa"}
STEP_KEYS = {"arrival", "yebul", "gongyang", "ulyeok", "meditation", "dharma", "hoehyang"}
WISH_CATEGORIES = {"suneung", "exam", "health", "peace", "etc"}
FOR_WHOM = {"self", "child", "family", "other"}
