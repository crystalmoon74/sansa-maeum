# 산사의 마음 — 온라인 템플스테이 · 소원 기원

전국 다섯 사찰(불국사·해인사·통도사·송광사·부석사)을 골라 **온라인 템플스테이**를 하고,
자녀의 수능·시험 합격 등 **소원을 적고 절을 올린 뒤 편지 링크로 전할 수 있는** 웹사이트입니다.

- 한지·먹·단청 색을 쓴 손그림 스타일 (SVG 흔들림 필터로 붓선 느낌)
- 사찰마다 특징을 살린 풍경: 불국사 청운교·백운교와 다보탑·석가탑, 해인사 장경판전,
  통도사 금강계단, 송광사 우화각과 계곡, 부석사 무량수전 배흘림기둥·석등·부석
- 법당 안 부처님: 각 사찰 부처님의 **실사 사진** (Wikimedia Commons 자유 이용 사진, 출처 표시 — 아래 "사진 출처")
- 소원 기원의 절: 법복을 입은 참배자가 부처님 사진 앞에서 합장 → 무릎 꿇기 → 두 손 짚기 → 이마를 바닥에(오체투지) → 접족례 → 일어서기 순서로 큰절 (속도 3단계, 연속 절하기)
- 배경 소리: 멀리서 울리는 산사의 범종 (Web Audio 합성, 맥놀이 표현)
- 모바일 화면 지원

**바로 가기:** 웹사이트 https://sansa-api-vn7n.onrender.com · 저장소 https://github.com/crystalmoon74/sansa-maeum

## 문서 요약

| 문서 | 내용 |
|---|---|
| [docs/PRD.md](docs/PRD.md) | 요구사항, 기능별 구현 현황, 기술 스택, 데이터 모델, 개발·수정 기록 |
| [docs/SECURITY_CHECK.md](docs/SECURITY_CHECK.md) | 보안 점검 항목·시험 결과, 남은 위험, 운영 배포 체크리스트 |
| [supabase/schema.sql](supabase/schema.sql) | DB 테이블 3개, 본인 데이터만 보이는 RLS 정책, 공유 편지 조회 함수 |
| [render.yaml](render.yaml) | Render 무료 Web Service 입력값 (Blueprint 미사용) |
| 이 README | 기능, 구조, 로컬 실행, 배포 방법, 사진 출처, API |

### PRD 요약

- **목적:** 온라인에서 템플스테이를 하며 마음을 쉬고, 자녀의 수능·시험 합격 등 소원을 비는 사이트
- **대상:** 템플스테이로 쉬고 싶은 사람, 자녀의 합격을 기원하고 싶은 사람
- **핵심 기능 (7개 모두 구현)**

| # | 기능 | 구현 내용 |
|---|---|---|
| 1 | 회원가입·로그인 | 이메일·비밀번호·(선택)법명만 수집. 이메일 확인 메일 없이 바로 가입 |
| 2 | 사찰 선택 | 불국사·해인사·통도사·송광사·부석사, 사찰별 손그림 풍경 |
| 3 | 사찰 입구 | 법당 안 부처님 실사 사진, 템플스테이 / 소원 기원 선택 |
| 4 | 템플스테이 | 입재·예불·발우공양·울력·참선·법문·회향 7단계, 단계별 기록 DB 저장, 이어 하기 |
| 5 | 소원 기원 | 소원 작성 → 큰절(3·21·108배·자유) → DB 저장, 횟수 제한 없음 |
| 6 | 소원 편지 | 편지 양식 + 공유 링크(복사·공유·인쇄), 링크 받은 사람만 열람 |
| 7 | 배경 소리 | 처음엔 반야심경 → 요청에 따라 **범종 소리(기본 On)** 로 변경 |

- **기술 스택:** Python FastAPI(백엔드) · Supabase Auth + Postgres(DB) · Render 무료 Web Service 하나가 웹사이트와 API를 함께 제공 · 브라우저는 API를 통해서만 DB에 접근
- **수정 기록 (2026-11-03)**
  1. 1차 구현: 로컬(SQLite) 모드로 전체 흐름 완성
  2. 2차 수정: 관절이 있는 큰절 동작, 법당 안 부처님 장면
  3. 3차 수정: 참배자를 사람답게, 반야심경 삭제 후 범종 소리, 부처님 실사 사진
  4. 운영 배포: GitHub 공개 저장소, Render 무료 서비스, Supabase 연결
  5. 가입 오류 수정: Supabase 메일 발송 한도(429)가 원인 → 이메일 확인 끄기, 오류 안내 문구 추가
  6. Render 일원화: GitHub Pages 끄고 Render 한 주소로 제공, 범종 기본 On
- **남은 일:** 실제 계정으로 운영 전체 흐름 확인, (선택) 직접 촬영하거나 허락받은 부처님 사진으로 교체, (선택) 이메일 확인이 필요해지면 SMTP 연결

### 보안 점검 요약

- **결과:** 높음 0 · 중간 0 · 낮음/권고 6
- **지켜지는 것**
  - 개인정보는 이메일·비밀번호·(선택)법명만. 공유 편지에는 이메일·사용자 ID가 나가지 않음
  - 비밀번호는 Supabase Auth(bcrypt)가 저장. 요청마다 로그인 토큰을 Supabase로 검증
  - 남의 기록은 볼 수도 지울 수도 없음 (서버 검사 + DB RLS 이중 차단, 시험에서 404 확인)
  - 입력 길이·값 검증, XSS 차단(모든 사용자 입력 이스케이프 + CSP), SQL 인젝션 방지
  - 로그인·가입 요청 횟수 제한, 보안 헤더(`X-Frame-Options: DENY`, `nosniff`, `no-referrer`)
  - 저장소에는 공개용 Supabase **publishable 키**만 있음. secret 키는 어디에도 없음
  - 공유 링크는 128비트 난수라 추측할 수 없음
- **남은 위험 (낮음)**
  1. 로그인 토큰을 브라우저 localStorage에 저장 (CSP·이스케이프로 보완)
  2. 요청 횟수 제한이 서버 메모리 기반이라 재시작하면 초기화됨
  3. CSP에 로컬 개발용 주소가 남아 있음
  4. 공유 편지는 링크를 아는 누구나 열람 (화면에 실명·연락처를 적지 말라고 안내, 삭제하면 링크 무효)
  5. Python 패키지 버전이 고정되어 있지 않음
  6. 이메일 확인을 꺼서 다른 사람 이메일로도 가입 가능 (이메일 외 정보가 없어 위험 낮음)

## 구조

```
VCMQ/
├─ frontend/            정적 웹사이트 (Render 에서 API 와 함께 제공)
│  ├─ index.html
│  ├─ css/style.css
│  ├─ js/app.js         화면·라우터(해시 라우팅)
│  ├─ js/api.js         백엔드 API 호출
│  ├─ js/data.js        사찰(사진 포함)·수행 단계·법문 데이터
│  ├─ js/scenes.js      사찰 풍경 SVG / 부처님 사진 장면
│  ├─ js/audio.js       범종 배경 소리 / 목탁·종 효과음
│  ├─ js/figure.js      큰절하는 참배자 관절 애니메이션
│  ├─ js/config.js      배포용 API 주소 설정
├─ backend/             Python FastAPI (Render 배포, frontend/ 도 함께 제공)
│  ├─ app/main.py       API 라우트·검증·보안 헤더·요청 제한
│  ├─ app/supabase_backend.py  Supabase Auth + REST(PostgREST) 연동
│  ├─ app/local_backend.py     로컬 테스트용 SQLite 백엔드
│  └─ requirements.txt
├─ supabase/schema.sql  테이블 + RLS 정책 + 공유 편지 함수
├─ render.yaml          Render 무료 Web Service 설정값 정리
└─ docs/
   ├─ PRD.md            요구사항 + 개발 기록
   └─ SECURITY_CHECK.md 보안 점검 결과
```

## 로컬에서 실행

Supabase 키가 없으면 자동으로 **로컬 SQLite 모드**로 동작하므로 바로 테스트할 수 있습니다.

```bash
pip install -r backend/requirements.txt
```

```bash
python -m uvicorn app.main:app --app-dir backend --port 8000
```

브라우저에서 http://localhost:8000 을 엽니다. (FastAPI 가 프론트엔드도 함께 제공)
로컬 테스트 계정은 `backend/test_account.example.json` 에 있습니다(직접 가입해도 됩니다).

## 배포 (운영 중)

웹사이트와 API 를 **Render 무료 Web Service 한 곳**에서 함께 제공합니다. (FastAPI 가 `frontend/` 정적 파일도 서비스)

| 구성 | 주소 |
|---|---|
| 웹사이트 + API (Render 무료) | **https://sansa-api-vn7n.onrender.com** (`/api/health`) |
| DB·인증 (Supabase) | 프로젝트 `xjmpmhrohdswalszmapz` |
| 저장소 | https://github.com/crystalmoon74/sansa-maeum |

> Render 무료 플랜은 15분 정도 접속이 없으면 서버가 잠듭니다. 잠든 뒤 첫 접속은 50초 이상 걸릴 수 있습니다.
> 예전 GitHub Pages 주소(crystalmoon74.github.io/sansa-maeum)는 꺼 두었습니다.

### 1) Supabase
1. **SQL Editor** 에서 `supabase/schema.sql` 실행 (테이블 3개 + RLS + 공유 편지 함수)
2. **Authentication → Sign In / Providers → Confirm email 끄기** (무료 기본 메일 발송 한도 때문에 가입이 막히지 않도록)
3. **Authentication → URL Configuration → Site URL** = `https://sansa-api-vn7n.onrender.com/`
4. **Project Settings → API Keys** 의 **publishable key** 를 `backend/app/config.py` 의 `PUBLIC_SUPABASE_KEY` 에 넣음.
   publishable 키는 공개해도 되는 키(예전 anon key)이고, **secret key 는 쓰지 않으며 어디에도 넣지 않습니다.**

### 2) Render (무료 플랜, Blueprint 없이)
Blueprint 는 카드 등록이 필요하므로 **New → Web Service → Public Git Repository** 로 만듭니다.

| 항목 | 값 |
|---|---|
| Repository | `https://github.com/crystalmoon74/sansa-maeum` |
| Name / Branch | `sansa-api` / `main` |
| Language | Python 3 (버전은 저장소 루트의 `.python-version`) |
| Root Directory | (비움 — 저장소 전체. `frontend/` 변경도 자동 배포) |
| Build Command | `pip install -r backend/requirements.txt` |
| Start Command | `uvicorn app.main:app --app-dir backend --host 0.0.0.0 --port $PORT --proxy-headers --forwarded-allow-ips="*"` |
| Instance Type | **Free** |
| 환경 변수 | 없음 — Render 위(`RENDER` 환경 변수)에서는 `config.py` 의 공개 Supabase 설정을 기본값으로 씀 |

`main` 에 push 하면 Render 가 자동으로 다시 배포합니다. 웹사이트와 API 가 같은 주소라 `frontend/js/config.js` 의 `apiBase` 는 비워 둡니다.

## 배경 소리 (범종)

**기본으로 켜져 있으며** 화면 오른쪽 아래 종 버튼으로 끄고 켭니다(끈 상태는 기억). 브라우저 정책상 첫 터치·클릭 전에는 소리가 막혀 있어, 첫 동작 때 첫 타가 울립니다. 약 16초마다 범종이 한 번 울리고 길게 여운이 남습니다.
외부 음원 없이 브라우저(Web Audio)에서 합성하며, 낮은 기본음과 배음을 살짝 어긋나게 겹쳐 한국 범종 특유의 '맥놀이'를 냅니다.
템플스테이 '예불' 단계의 범종 치기도 같은 소리를 씁니다.

## 사진 출처

법당 안 부처님 사진은 모두 [Wikimedia Commons](https://commons.wikimedia.org)의 자유 이용 사진이며, 화면에도 출처를 표시합니다.

| 사찰 | 사진 | 촬영·저작자 | 라이선스 |
|---|---|---|---|
| 불국사 | [비로전 금동비로자나불좌상](https://commons.wikimedia.org/wiki/File:Bulguksageumdongbirojanabuljwasang_(Seated_gilt-bronze_vairocana_buddha_statue_of_Bulguksa_Temple).jpg) | mikeswe (Flickr) | CC BY-SA 2.0 |
| 해인사 | [법당의 부처님](https://commons.wikimedia.org/wiki/File:Haeinsa_Temple_06.jpg) | Bernard Gagnon | CC0 |
| 통도사 | [응진전의 부처님](https://commons.wikimedia.org/wiki/File:Eungjinjeon_Hall_02.jpg) | Bernard Gagnon | CC0 |
| 송광사 | [목조삼존불감](https://commons.wikimedia.org/wiki/File:%EC%86%A1%EA%B4%91%EC%82%AC_%EB%AA%A9%EC%A1%B0%EC%82%BC%EC%A1%B4%EB%B6%88%EA%B0%90.jpg) | 작자 미상 | 퍼블릭 도메인 |
| 부석사 | [무량수전 소조아미타여래좌상](https://commons.wikimedia.org/wiki/File:Seated_clay_buddha_statue_of_Buseoksa_Temple.jpg) | tristanskye (Flickr) | CC BY 2.0 |

> 통도사 대웅전은 불상 없이 금강계단의 진신사리를 모시므로, 같은 절 응진전의 부처님 사진을 썼습니다.
> 사진은 위키미디어 서버에서 바로 불러옵니다(`thumb.wikimedia.org`). 직접 찍은 사진으로 바꾸려면 `frontend/js/data.js` 의 `photo` 항목을 고치세요.

## API 요약

| 메서드 | 경로 | 설명 | 인증 |
|---|---|---|---|
| POST | /api/auth/signup | 이메일 가입 | – |
| POST | /api/auth/login | 로그인 | – |
| GET | /api/me | 내 정보 | ✔ |
| POST/GET | /api/stays | 템플스테이 시작 / 목록 | ✔ |
| GET | /api/stays/{id} | 템플스테이 상세(활동 포함) | ✔ |
| POST | /api/stays/{id}/activities | 단계별 활동 기록 | ✔ |
| POST | /api/stays/{id}/complete | 회향(완료) | ✔ |
| POST/GET | /api/wishes | 소원 올리기 / 목록 | ✔ |
| DELETE | /api/wishes/{id} | 소원 삭제 | ✔ |
| GET | /api/letters/{share_id} | 공유 편지 보기 | – |

## 화면 흐름

`홈 → 사찰 선택 → 사찰 입구(대웅전 풍경)` 에서
- **템플스테이**: 입재 → 예불(범종) → 발우공양(오관게) → 울력(마루 닦기·설거지) → 참선(호흡 타이머) → 법문(법구경) → 회향(소감) → 수료
- **소원 기원**: 소원지 작성 → 절 올리기(3·21·108배 또는 자유, 염주 108알) → 소원 편지 + 공유 링크
- **나의 기록**: 템플스테이·소원 목록, 소원 삭제
