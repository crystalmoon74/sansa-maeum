# 보안 점검 결과 (SECURITY CHECK)

- 점검일: 2026-11-03
- 대상: `frontend/`, `backend/`, `supabase/schema.sql`, 배포 설정(`render.yaml`, `pages.yml`)
- 방법: 코드 검토 + 로컬 서버 대상 API 시험(아래 "실행한 시험")

## 요약

| 등급 | 건수 | 내용 |
|---|---|---|
| 높음 | 0 | – |
| 중간 | 0 | – |
| 낮음 / 권고 | 6 | 아래 "남은 위험과 권고" 참고 |

## 점검 항목

| # | 항목 | 결과 | 근거 |
|---|---|---|---|
| 1 | 개인정보 최소 수집 | ✅ | 이메일·비밀번호·(선택)법명만 받음. 공유 편지 응답에 이메일·user_id 없음 |
| 2 | 비밀번호 저장 | ✅ | 운영: Supabase Auth(bcrypt). 로컬: PBKDF2-SHA256 31만 회 + 사용자별 salt |
| 3 | 인증 토큰 검증 | ✅ | 운영: 요청마다 Supabase `/auth/v1/user` 로 검증. 로컬: HMAC-SHA256 서명 + 만료(7일), `compare_digest` 사용 |
| 4 | 접근 제어(남의 데이터) | ✅ | 서버에서 user_id 조건 + Supabase RLS(`user_id = auth.uid()`). DB 요청은 사용자 JWT로 보내고 `service_role` 키는 쓰지 않음 |
| 5 | 입력 검증 | ✅ | Pydantic 길이·범위 제한, 사찰/단계/분류 화이트리스트, UUID·share_id 형식 검사, DB CHECK 제약 이중 적용 |
| 6 | XSS | ✅ | 사용자 입력은 모두 `esc()` 처리 후 출력. CSP `script-src 'self'`(인라인 스크립트 불가) |
| 7 | SQL 인젝션 | ✅ | 로컬: 파라미터 바인딩. 운영: PostgREST 파라미터(`eq.<uuid>`)는 UUID 검증 후 사용 |
| 8 | CORS | ✅ | `ALLOWED_ORIGINS` 에 적은 주소만 허용 |
| 9 | CSRF | ✅ | 쿠키를 쓰지 않고 `Authorization: Bearer` 헤더 사용 → CSRF 해당 없음 |
| 10 | 무차별 대입 | ✅ | 로그인 분당 10회·가입 분당 5회·편지 조회 분당 60회 IP 단위 제한(429) |
| 11 | 계정 열거 | ✅(운영) | 로그인 실패 메시지 동일. 가입 실패도 운영 모드에서는 일반 메시지 |
| 12 | 공유 링크 추측 | ✅ | `secrets.token_urlsafe(16)` = 128비트 난수 |
| 13 | 오류 정보 노출 | ✅ | Supabase 오류는 "잠시 후 다시 시도" 로 감춤. `/docs`, `/openapi.json` 비활성화 |
| 14 | 보안 헤더 | ✅ | API: `nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, `Cache-Control: no-store` |
| 15 | 비밀 정보 관리 | ✅ | 키는 환경 변수/`backend/.env`(gitignore). 저장소에는 `.env.example` 만. 프론트엔드에는 키가 없음 |
| 16 | 사용자 수정 가능한 메타데이터 | ✅ | Supabase `user_metadata.nickname` 은 서버에서 20자로 다시 자름 |
| 18 | 운영 배포 설정 | ✅ | 저장소에는 Supabase **publishable 키**만 들어 있음(공개용 키, 권한은 RLS 가 제한). secret 키는 저장소·Render 어디에도 없음. publishable 키는 JWT 가 아니므로 Authorization 헤더로 보내지 않음. CSP `connect-src` 는 실제 Render 주소만 허용(`*.onrender.com` 와일드카드 제거). Render 는 CORS 로 `https://crystalmoon74.github.io` 만 허용 |
| 17 | 외부 사진 (3차 수정) | ✅ | CSP `img-src` 에 `thumb.wikimedia.org`, `upload.wikimedia.org` 만 추가. 이미지만 불러오고 `referrerpolicy="no-referrer"` 로 페이지 주소를 보내지 않음. 출처 링크는 `rel="noopener noreferrer"`. 외부 음원·스크립트 없음(`media-src 'self'`) |

## 실행한 시험 (로컬 모드, 2026-11-03)

```
다른 사용자의 템플스테이 조회      → 404
다른 사용자의 소원 삭제            → 404
토큰 없이 /api/stays               → 401
위조 토큰                          → 401
없는 사찰 id                       → 422
2000자 소원                        → 422
틀린 비밀번호                      → 401 + 일반 메시지
공유 편지 응답 필드                → bows, category, content, created_at, for_whom, nickname, temple_id (이메일·user_id 없음)
잘못된 share_id (../../etc, short) → 404
허용되지 않은 Origin 의 CORS 요청  → Access-Control-Allow-Origin 없음
/docs, /openapi.json               → 404
로그인 12회 연속                   → 11회째부터 429
소원/소감에 <img onerror>, <b> 입력 → 글자 그대로 표시(실행 안 됨)
```

## 남은 위험과 권고 (낮음)

1. **토큰을 localStorage 에 저장** — XSS 가 생기면 토큰이 노출될 수 있음. 현재 CSP·이스케이프로 막고 있으며, 더 강하게 하려면 httpOnly 쿠키 + CSRF 토큰 방식으로 바꿀 것.
2. **요청 제한이 메모리 기반** — Render 인스턴스가 여러 개거나 재시작되면 초기화됨. 규모가 커지면 Redis 등 공유 저장소 사용. Supabase Auth 자체 rate limit 도 함께 적용됨.
3. **GitHub Pages 는 응답 헤더를 바꿀 수 없음** — `X-Frame-Options`/`frame-ancestors` 미적용(클릭재킹 위험 낮음: 결제·민감 동작 없음). 필요하면 Cloudflare 등 앞단에서 헤더 추가.
4. **CSP 의 개발용 주소** — `connect-src` 에 로컬 테스트용 `http://localhost:8000` 이 남아 있음(운영 위험 낮음: 방문자 PC 의 로컬 서버로만 향함). 원하면 운영용 index.html 에서 제거.
5. **공유 편지는 링크를 아는 누구나 열람** — 화면에 "실명·연락처는 적지 않기를 권함" 안내 표시. 원치 않으면 '나의 기록'에서 삭제(링크 즉시 무효).
6. **의존성 버전** — `requirements.txt` 가 최소 버전만 지정. 운영 전 `pip freeze` 로 고정하고 정기적으로 `pip-audit` 실행 권장.
7. (참고) 로컬 모드 가입은 "이미 가입된 이메일" 을 알려 줌 — 로컬 테스트 전용이라 허용.

## 운영 배포 체크리스트

- [x] Supabase 에서 `schema.sql` 실행 (세 테이블·공유 편지 함수 응답 확인, 2026-11-03)
- [x] Render 환경 변수 없음 — secret/service_role 키 미사용
- [x] 허용 Origin = `https://crystalmoon74.github.io` (CORS 응답 확인)
- [x] `apiBase`·CSP `connect-src` = `https://sansa-api-vn7n.onrender.com`
- [x] Supabase Auth: 이메일 확인 켜짐, Site URL = GitHub Pages 주소
- [ ] (권장) Supabase Auth 비밀번호 최소 길이를 8 이상으로 설정 (서버에서도 8자 이상 검사함)
- [x] `backend/.env`, `backend/data/`, `.claude/` 커밋 안 됨
