// 백엔드 API 호출 래퍼
const TOKEN_KEY = "sansa.token";
const USER_KEY = "sansa.user";

function apiBase() {
  const { hostname, port } = location;
  const local = hostname === "localhost" || hostname === "127.0.0.1";
  if (local && port === "8000") return "";            // FastAPI 가 프론트도 함께 제공
  if (local) return `http://${hostname}:8000`;         // Live Server 등 별도 포트
  return (window.SANSA_CONFIG && window.SANSA_CONFIG.apiBase) || "";
}

function safeGet(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}
function safeSet(key, value) {
  try { value == null ? localStorage.removeItem(key) : localStorage.setItem(key, value); } catch { /* 저장소 차단 */ }
}

export const session = {
  get token() { return safeGet(TOKEN_KEY); },
  get user() {
    try { return JSON.parse(safeGet(USER_KEY) || "null"); } catch { return null; }
  },
  set(token, user) { safeSet(TOKEN_KEY, token); safeSet(USER_KEY, JSON.stringify(user)); },
  clear() { safeSet(TOKEN_KEY, null); safeSet(USER_KEY, null); },
};

export class ApiError extends Error {
  constructor(message, status) { super(message); this.status = status; }
}

async function request(method, path, body) {
  const headers = { "Content-Type": "application/json" };
  if (session.token) headers.Authorization = `Bearer ${session.token}`;
  let res;
  try {
    res = await fetch(apiBase() + path, {
      method, headers, body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError("서버에 연결할 수 없습니다. 백엔드가 실행 중인지 확인해 주세요.", 0);
  }
  let data = null;
  try { data = await res.json(); } catch { /* 빈 응답 */ }
  if (!res.ok) {
    if (res.status === 401) session.clear();
    let msg = "요청을 처리하지 못했습니다.";
    if (data && typeof data.detail === "string") msg = data.detail;
    else if (data && Array.isArray(data.detail) && data.detail[0]) {
      msg = String(data.detail[0].msg || msg).replace(/^Value error, /, "");
    }
    throw new ApiError(msg, res.status);
  }
  return data;
}

export const api = {
  signup: (email, password, nickname) => request("POST", "/api/auth/signup", { email, password, nickname }),
  login: (email, password) => request("POST", "/api/auth/login", { email, password }),
  me: () => request("GET", "/api/me"),
  createStay: (temple_id) => request("POST", "/api/stays", { temple_id }),
  getStay: (id) => request("GET", `/api/stays/${encodeURIComponent(id)}`),
  listStays: () => request("GET", "/api/stays"),
  addActivity: (id, step_key, note, duration_sec) =>
    request("POST", `/api/stays/${encodeURIComponent(id)}/activities`, { step_key, note, duration_sec }),
  completeStay: (id, reflection) => request("POST", `/api/stays/${encodeURIComponent(id)}/complete`, { reflection }),
  createWish: (wish) => request("POST", "/api/wishes", wish),
  listWishes: () => request("GET", "/api/wishes"),
  deleteWish: (id) => request("DELETE", `/api/wishes/${encodeURIComponent(id)}`),
  getLetter: (shareId) => request("GET", `/api/letters/${encodeURIComponent(shareId)}`),
};
