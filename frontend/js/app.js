import { api, session, ApiError } from "./api.js";
import {
  TEMPLES, templeById, STEPS, OGWANGE, VERSES, MINDS, FOR_WHOM, FOR_WHOM_OBJ, CATEGORIES, BOW_TARGETS,
} from "./data.js";
import { templeScene, buddhaPhoto, bowScene, photoCredit } from "./scenes.js";
import { createWorshipper } from "./figure.js";
import { initMusicButton, moktak, bell, templeBell } from "./audio.js";

const app = document.getElementById("app");
let cleanup = [];

// ---------- 유틸 ----------
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const $ = (sel, root = app) => root.querySelector(sel);
const $$ = (sel, root = app) => [...root.querySelectorAll(sel)];
const fmtDate = (iso) => {
  const d = new Date(iso);
  return isNaN(d) ? "" : `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
};
const fmtDur = (sec) => (sec >= 60 ? `${Math.round(sec / 60)}분` : `${sec}초`);

function toast(msg) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove("show"), 2600);
}

function go(hash) { location.hash = hash; }

function parseHash() {
  const raw = location.hash.replace(/^#/, "") || "/";
  const [path, query = ""] = raw.split("?");
  return { parts: path.split("/").filter(Boolean), query: new URLSearchParams(query) };
}

function needLogin() {
  if (session.token) return false;
  const next = location.hash.replace(/^#/, "");
  go(`/login?next=${encodeURIComponent(next)}`);
  return true;
}

function errorView(err) {
  app.innerHTML = `<section class="paper narrow center">
    <h2 class="brush">길을 잃었습니다</h2>
    <p>${esc(err.message || err)}</p>
    <a class="btn" href="#/temples">사찰로 돌아가기</a></section>`;
}

function renderNav() {
  const nav = document.getElementById("nav");
  const u = session.user;
  nav.innerHTML = `
    <a href="#/temples">사찰</a>
    <a href="#/my">나의 기록</a>
    ${u ? `<span class="nav-user">${esc(u.nickname)} 님</span><button class="linkish" id="logoutBtn" type="button">나가기</button>`
        : `<a href="#/login" class="nav-login">들어가기</a>`}`;
  const lb = document.getElementById("logoutBtn");
  if (lb) lb.onclick = () => { session.clear(); renderNav(); toast("편안히 가십시오. 🙏"); go("/"); };
}

// ---------- 홈 ----------
function homeView() {
  app.innerHTML = `
    <section class="hero">
      <div class="hero-scene">${templeScene(TEMPLES[0])}</div>
      <div class="hero-copy paper">
        <p class="eyebrow">온라인 산사 · 山寺</p>
        <h1 class="brush big">잠시, 마음 내려놓고 가세요</h1>
        <p>전국 다섯 사찰의 산문을 지나 하루의 템플스테이를 보내고,<br class="pc">
           소중한 이의 합격과 평안을 비는 절을 올려 보세요.</p>
        <div class="row">
          <a class="btn seal" href="#/temples">산문에 들어서기</a>
          <a class="btn" href="#/my">나의 기록</a>
        </div>
      </div>
    </section>
    <section class="how">
      <article class="note-card tilt-l">
        <span class="num">一</span><h3>사찰 고르기</h3>
        <p>불국사, 해인사, 통도사, 송광사, 부석사 — 마음 가는 곳으로.</p>
      </article>
      <article class="note-card tilt-r">
        <span class="num">二</span><h3>템플스테이</h3>
        <p>예불·발우공양·울력·참선·법문까지, 하루 일과를 차례로 따라가요.</p>
      </article>
      <article class="note-card tilt-l">
        <span class="num">三</span><h3>소원 기원</h3>
        <p>소원을 적고 절을 올리면, 마음을 담은 편지로 전할 수 있어요.</p>
      </article>
    </section>`;
}

// ---------- 인증 ----------
function authView(mode, query) {
  if (session.token) { go(query.get("next") || "/temples"); return; }
  const isSignup = mode === "signup";
  app.innerHTML = `
    <section class="paper narrow auth">
      <h2 class="brush">${isSignup ? "처음 오셨군요" : "다시 오셨군요"}</h2>
      <p class="muted">${isSignup ? "이메일과 비밀번호만 있으면 됩니다. 이름·전화번호 등은 묻지 않아요." : "수행 기록과 소원은 로그인해야 이어서 볼 수 있어요."}</p>
      <form id="authForm" class="form" novalidate>
        <label>이메일<input name="email" type="email" autocomplete="email" required maxlength="254"></label>
        <label>비밀번호 <small>(8자 이상)</small><input name="password" type="password" autocomplete="${isSignup ? "new-password" : "current-password"}" required minlength="8" maxlength="72"></label>
        ${isSignup ? `<label>법명 · 별칭 <small>(선택, 편지에 표시)</small><input name="nickname" maxlength="20" placeholder="예) 연꽃"></label>` : ""}
        <p class="form-error" id="authErr" role="alert"></p>
        <button class="btn seal wide" type="submit">${isSignup ? "가입하고 들어가기" : "들어가기"}</button>
      </form>
      <p class="center small">${isSignup
        ? `이미 가입하셨나요? <a href="#/login?${esc(query)}">들어가기</a>`
        : `처음이신가요? <a href="#/signup?${esc(query)}">이메일로 가입하기</a>`}</p>
    </section>`;
  $("#authForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const err = $("#authErr");
    err.textContent = "";
    const email = String(f.get("email") || "").trim();
    const password = String(f.get("password") || "");
    if (!email || password.length < 8) { err.textContent = "이메일과 8자 이상의 비밀번호를 입력해 주세요."; return; }
    const btn = e.target.querySelector("button");
    btn.disabled = true;
    try {
      const res = isSignup ? await api.signup(email, password, String(f.get("nickname") || "")) : await api.login(email, password);
      if (res.needs_confirmation) {
        err.textContent = "확인 메일을 보냈습니다. 메일의 링크를 누른 뒤 로그인해 주세요.";
        return;
      }
      session.set(res.token, res.user);
      renderNav();
      toast(`${res.user.nickname} 님, 어서 오세요. 🙏`);
      go(query.get("next") || "/temples");
    } catch (ex) {
      err.textContent = ex.message;
    } finally { btn.disabled = false; }
  });
}

// ---------- 사찰 선택 ----------
function templesView() {
  app.innerHTML = `
    <section class="section-head">
      <h2 class="brush">어느 산사로 가볼까요</h2>
      <p class="muted">다섯 곳의 산문이 열려 있습니다.</p>
    </section>
    <section class="temple-grid">
      ${TEMPLES.map((t, i) => `
        <a class="temple-card ${i % 2 ? "tilt-r" : "tilt-l"}" href="#/temple/${t.id}">
          <div class="thumb">${templeScene(t)}</div>
          <div class="temple-info">
            <h3><span class="brush">${t.name}</span> <span class="hanja">${t.hanja}</span></h3>
            <p class="region">${t.region}</p>
            <p>${t.tagline}</p>
          </div>
        </a>`).join("")}
    </section>`;
}

// ---------- 사찰 입구 ----------
async function templeView(id) {
  const t = templeById(id);
  if (!t) return errorView("그런 사찰은 없습니다.");
  app.innerHTML = `
    <section class="temple-hero">
      <div class="scene-wrap">${templeScene(t)}</div>
      <div class="temple-title paper">
        <p class="eyebrow">${t.region}</p>
        <h2><span class="brush big">${t.name}</span> <span class="hanja">${t.hanja}</span></h2>
        <p>${t.desc}</p>
        <ul class="tags">${t.features.map((f) => `<li>${f}</li>`).join("")}</ul>
      </div>
    </section>
    <section class="dharma">
      <h3 class="brush center">${t.hall} 안으로</h3>
      ${buddhaPhoto(t)}
      <p class="center caption">${t.id === "tongdosa"
        ? "통도사 대웅전에는 불상 대신 금강계단의 부처님 진신사리를 모십니다. 응진전의 부처님께 먼저 인사드립니다."
        : "부처님께서 고요히 내려다보고 계십니다. 두 손 모아 인사드립니다."}</p>
      <div class="center"><button class="btn" id="halfBow" type="button">🙏 합장 반배 올리기</button></div>
    </section>
    <section class="gate">
      <p class="gate-ask">부처님께 인사를 드렸습니다. 무엇을 하시겠어요?</p>
      <div class="signboards">
        <button class="signboard" id="goStay" type="button">
          <span class="sb-hanja">修行</span>
          <span class="sb-title">템플스테이</span>
          <span class="sb-sub">예불부터 회향까지 하루 일과</span>
        </button>
        <a class="signboard red" href="#/wish/${t.id}">
          <span class="sb-hanja">祈願</span>
          <span class="sb-title">소원 기원</span>
          <span class="sb-sub">소원을 적고 절 올리기</span>
        </a>
      </div>
      <div id="resume"></div>
    </section>`;

  $("#halfBow").addEventListener("click", (e) => {
    bell(0.4);
    e.currentTarget.textContent = "🙏 고개 숙여 인사드렸습니다";
    e.currentTarget.disabled = true;
  });

  $("#goStay").addEventListener("click", async () => {
    if (needLogin()) return;
    try {
      const stay = await api.createStay(t.id);
      go(`/stay/${stay.id}`);
    } catch (ex) { toast(ex.message); }
  });

  if (session.token) {
    try {
      const stays = await api.listStays();
      const open = stays.find((s) => s.temple_id === t.id && s.status === "in_progress");
      if (open && $("#resume")) {
        $("#resume").innerHTML = `<a class="resume" href="#/stay/${esc(open.id)}">↳ ${fmtDate(open.started_at)}에 시작한 템플스테이 이어서 하기 (${open.activities.length}/${STEPS.length})</a>`;
      }
    } catch { /* 무시 */ }
  }
}

// ---------- 템플스테이 ----------
async function stayView(stayId) {
  if (needLogin()) return;
  let stay;
  try { stay = await api.getStay(stayId); } catch (ex) { return errorView(ex); }
  const t = templeById(stay.temple_id);
  if (stay.status === "completed") return certificateView(stay, t);

  const done = new Set(stay.activities.map((a) => a.step_key));
  const idx = STEPS.findIndex((s) => !done.has(s.key));
  const step = STEPS[idx === -1 ? STEPS.length - 1 : idx];

  app.innerHTML = `
    <section class="stay-head">
      <p class="eyebrow">${t.name} 템플스테이</p>
      <ol class="stones">${STEPS.map((s, i) => `
        <li class="${done.has(s.key) ? "done" : s.key === step.key ? "now" : ""}">
          <span class="stone">${done.has(s.key) ? "✓" : i + 1}</span><span class="stone-name">${s.name}</span>
        </li>`).join("")}</ol>
    </section>
    <section class="paper step">
      <header class="step-title">
        <span class="time">${step.time}</span>
        <h2 class="brush">${step.name} <small>· ${step.sub}</small></h2>
      </header>
      <div id="stepBody"></div>
      ${step.key === "hoehyang" ? "" : `
      <div class="journal">
        <label>수행 일지 <small>(선택)</small>
          <textarea id="note" maxlength="1000" rows="3" placeholder="이 시간에 느낀 것을 짧게 적어 두세요."></textarea>
        </label>
        <button class="btn seal" id="nextBtn" type="button" disabled>기록하고 다음으로</button>
      </div>`}
    </section>`;

  const started = Date.now();
  const ctx = {
    stay, temple: t, extraNote: "",
    ready(extra) {
      if (extra !== undefined) ctx.extraNote = extra;
      const b = $("#nextBtn");
      if (b) { b.disabled = false; b.classList.add("pulse"); }
    },
    duration: null,
  };
  STEP_UI[step.key]($("#stepBody"), ctx);

  const nb = $("#nextBtn");
  if (nb) nb.addEventListener("click", async () => {
    nb.disabled = true;
    const note = [ctx.extraNote, $("#note").value.trim()].filter(Boolean).join("\n").slice(0, 1000);
    const dur = ctx.duration ?? Math.round((Date.now() - started) / 1000);
    try {
      await api.addActivity(stay.id, step.key, note, Math.min(dur, 21600));
      toast(`${step.name} 기록을 남겼습니다.`);
      stayView(stay.id);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (ex) { toast(ex.message); nb.disabled = false; }
  });
}

const STEP_UI = {
  arrival(el, ctx) {
    el.innerHTML = `
      <p>일주문을 지나 ${ctx.temple.name} 경내에 들어섰습니다. 신발을 가지런히 벗고, 오늘 어떤 마음으로 왔는지 하나 골라 보세요.</p>
      <div class="chips" id="minds">${MINDS.map((m) => `<button type="button" class="chip">${m}</button>`).join("")}</div>
      <div class="center"><button class="btn big-hapjang" id="hapjang" type="button" disabled>🙏 합장하고 들어가기</button></div>`;
    let mind = "";
    $$("#minds .chip", el).forEach((c) => c.addEventListener("click", () => {
      $$("#minds .chip", el).forEach((x) => x.classList.remove("on"));
      c.classList.add("on"); mind = c.textContent; $("#hapjang", el).disabled = false;
    }));
    $("#hapjang", el).addEventListener("click", (e) => {
      bell(0.35); e.target.textContent = "고요히 머뭅니다…"; e.target.disabled = true;
      ctx.ready(`오늘의 마음: ${mind}`);
    });
  },

  yebul(el, ctx) {
    const need = 3;
    let n = 0;
    el.innerHTML = `
      <p>새벽 네 시, 도량석 목탁 소리에 잠을 깹니다. 범종을 <b>${need}번</b> 울려 모든 생명을 깨워 주세요.</p>
      <div class="bell-wrap">
        <button class="bell-btn" id="bellBtn" type="button" aria-label="범종 치기">
          <svg viewBox="0 0 200 220" aria-hidden="true"><g filter="url(#rough)">
            <rect x="20" y="10" width="160" height="10" fill="#7f4f3a" stroke="#2b2621" stroke-width="2"/>
            <path d="M100 20 V34" stroke="#2b2621" stroke-width="4"/>
            <path d="M60 40 C 60 34 140 34 140 40 L 150 170 C 150 182 50 182 50 170Z" fill="#6c7d6e" stroke="#2b2621" stroke-width="2.4"/>
            <path d="M54 120 H146 M56 90 H144" stroke="#2b2621" stroke-width="1.4"/>
            <circle cx="100" cy="140" r="12" fill="#a8b4a0" stroke="#2b2621" stroke-width="1.6"/>
            <path d="M50 172 Q100 190 150 172" fill="none" stroke="#2b2621" stroke-width="2"/>
          </g></svg>
          <span class="ripple"></span>
        </button>
        <p class="counter" id="bellCount">0 / ${need}</p>
      </div>`;
    const btn = $("#bellBtn", el);
    btn.addEventListener("click", () => {
      if (n >= need) return;
      n++; templeBell(0.7);
      btn.classList.remove("struck"); void btn.offsetWidth; btn.classList.add("struck");
      $("#bellCount", el).textContent = `${n} / ${need}`;
      if (n === need) { $("#bellCount", el).textContent = "종소리가 산을 넘어갑니다 ~"; ctx.ready(`범종 ${need}타`); }
    });
  },

  gongyang(el, ctx) {
    const bowls = [["어시발우", "밥", "#f3ecd8"], ["국발우", "국", "#c98b4a"], ["찬발우", "찬", "#6f9a52"], ["청수발우", "청수", "#cfe3e6"]];
    let filled = 0;
    el.innerHTML = `
      <p>발우공양은 음식을 남기지 않고, 감사히 먹는 수행입니다. 큰 발우부터 차례로 눌러 공양을 받으세요.</p>
      <div class="bowls">${bowls.map(([name, food], i) => `
        <button type="button" class="bowl" data-i="${i}" ${i ? "disabled" : ""}>
          <svg viewBox="0 0 120 80" aria-hidden="true"><g filter="url(#rough)">
            <ellipse cx="60" cy="26" rx="${50 - i * 5}" ry="12" class="food" fill="#5a4636" stroke="#2b2621" stroke-width="2"/>
            <path d="M${10 + i * 5} 26 Q 60 ${92 - i * 4} ${110 - i * 5} 26" fill="#3b2a20" stroke="#2b2621" stroke-width="2.2"/>
          </g></svg>
          <span>${name}<br><small>${food}</small></span>
        </button>`).join("")}</div>
      <ol class="verse-lines" id="ogwan"></ol>`;
    $$(".bowl", el).forEach((b) => b.addEventListener("click", () => {
      const i = Number(b.dataset.i);
      if (i !== filled) return;
      moktak(0.4);
      b.querySelector(".food").setAttribute("fill", bowls[i][2]);
      b.classList.add("full"); b.disabled = true;
      filled++;
      const next = $(`.bowl[data-i="${filled}"]`, el);
      if (next) next.disabled = false;
      const li = document.createElement("li");
      li.textContent = OGWANGE[i];
      $("#ogwan", el).appendChild(li);
      if (filled === bowls.length) {
        const last = document.createElement("li");
        last.textContent = OGWANGE[4];
        $("#ogwan", el).appendChild(last);
        ctx.ready("발우공양 · 오관게를 새기며");
      }
    }));
  },

  ulyeok(el, ctx) {
    const phases = [
      { name: "대웅전 마루 닦기", cls: "floor", dust: "#9a8a6e" },
      { name: "발우 설거지", cls: "dishes", dust: "#b9a27a" },
    ];
    let phase = 0;
    el.innerHTML = `
      <p>울력은 함께 일하는 수행입니다. 손가락(마우스)으로 문질러 깨끗하게 해 주세요.</p>
      <p class="phase" id="phaseName"></p>
      <div class="wipe" id="wipe"><canvas id="dust"></canvas><span class="wipe-hint">문질러 주세요 ✋</span></div>
      <div class="meter"><span id="meterBar"></span></div>`;
    const wrap = $("#wipe", el);
    const cv = $("#dust", el);
    const g = cv.getContext("2d");
    let rect, down = false, moves = 0;

    function paintDust() {
      const p = phases[phase];
      $("#phaseName", el).textContent = `${phase + 1}. ${p.name}`;
      wrap.className = `wipe ${p.cls}`;
      rect = wrap.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = rect.width * dpr; cv.height = rect.height * dpr;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.globalCompositeOperation = "source-over";
      g.fillStyle = p.dust;
      g.fillRect(0, 0, rect.width, rect.height);
      for (let i = 0; i < 260; i++) {
        g.fillStyle = `rgba(60,45,30,${Math.random() * 0.25})`;
        g.beginPath();
        g.arc(Math.random() * rect.width, Math.random() * rect.height, Math.random() * 14 + 2, 0, Math.PI * 2);
        g.fill();
      }
      $("#meterBar", el).style.width = "0%";
    }
    function cleared() {
      const d = g.getImageData(0, 0, cv.width, cv.height).data;
      let clear = 0, total = 0;
      for (let i = 3; i < d.length; i += 4 * 37) { total++; if (d[i] < 40) clear++; }
      return clear / total;
    }
    function wipeAt(e) {
      const x = e.clientX - rect.left, y = e.clientY - rect.top;
      g.globalCompositeOperation = "destination-out";
      g.fillStyle = "#000";
      g.beginPath(); g.arc(x, y, 26, 0, Math.PI * 2); g.fill();
      if (++moves % 12 === 0) checkClean();
    }
    function checkClean() {
      const c = cleared();
      $("#meterBar", el).style.width = `${Math.min(100, Math.round((c / 0.85) * 100))}%`;
      if (c > 0.85) nextPhase();
    }
    function nextPhase() {
      down = false;
      moktak(0.4);
      g.clearRect(0, 0, cv.width, cv.height);
      if (phase < phases.length - 1) {
        phase++;
        toast("반짝반짝! 이제 설거지를 해 볼까요.");
        setTimeout(paintDust, 500);
      } else {
        $("#phaseName", el).textContent = "울력을 마쳤습니다. 마음의 먼지도 함께 닦였기를.";
        cv.style.pointerEvents = "none";
        ctx.ready("울력 · 마루 닦기와 설거지");
      }
    }
    cv.addEventListener("pointerdown", (e) => { down = true; rect = wrap.getBoundingClientRect(); try { cv.setPointerCapture(e.pointerId); } catch { /* 무시 */ } wipeAt(e); });
    cv.addEventListener("pointermove", (e) => { if (down) wipeAt(e); });
    cv.addEventListener("pointerup", () => { if (down) { down = false; checkClean(); } });
    cv.addEventListener("pointercancel", () => { down = false; });
    requestAnimationFrame(paintDust);
  },

  meditation(el, ctx) {
    el.innerHTML = `
      <p>허리를 펴고 편안히 앉습니다. 숨이 들어오고 나가는 것만 지켜봅니다. 얼마 동안 앉아 볼까요?</p>
      <div class="chips" id="mins">${[1, 3, 5, 10].map((m) => `<button type="button" class="chip" data-m="${m}">${m}분</button>`).join("")}</div>
      <div class="breath" id="breath" hidden>
        <div class="breath-circle"><span id="breathText">들이쉬고</span></div>
        <p class="counter" id="left"></p>
        <button class="btn" id="stopMed" type="button">죽비 치고 마치기</button>
      </div>`;
    let timer, breathTimer, startAt;
    const finish = () => {
      clearInterval(timer); clearInterval(breathTimer);
      const sec = Math.max(1, Math.round((Date.now() - startAt) / 1000));
      ctx.duration = sec;
      bell(0.4);
      $("#breath", el).classList.add("ended");
      $("#breathText", el).textContent = "고요";
      $("#left", el).textContent = `${fmtDur(sec)} 동안 앉았습니다.`;
      $("#stopMed", el).hidden = true;
      ctx.ready(`참선 ${fmtDur(sec)}`);
    };
    $$("#mins .chip", el).forEach((c) => c.addEventListener("click", () => {
      const total = Number(c.dataset.m) * 60;
      $("#mins", el).hidden = true;
      $("#breath", el).hidden = false;
      startAt = Date.now();
      bell(0.4);
      moktak(0.5); setTimeout(() => moktak(0.5), 400); setTimeout(() => moktak(0.5), 800);
      let phase = 0;
      const words = ["들이쉬고", "머물고", "내쉬고"];
      breathTimer = setInterval(() => { phase = (phase + 1) % 3; const bt = $("#breathText", el); if (bt) bt.textContent = words[phase]; }, 4000);
      const tick = () => {
        const left = total - Math.floor((Date.now() - startAt) / 1000);
        const lf = $("#left", el);
        if (!lf) { clearInterval(timer); clearInterval(breathTimer); return; }
        lf.textContent = `${Math.floor(left / 60)}:${String(Math.max(0, left % 60)).padStart(2, "0")}`;
        if (left <= 0) finish();
      };
      tick();
      timer = setInterval(tick, 1000);
      cleanup.push(() => { clearInterval(timer); clearInterval(breathTimer); });
    }));
    $("#stopMed", el).addEventListener("click", () => { moktak(0.6); finish(); });
  },

  dharma(el, ctx) {
    const picks = [...VERSES].sort(() => Math.random() - 0.5).slice(0, 3);
    el.innerHTML = `
      <p>스님께서 오늘의 법문을 준비하셨습니다. 마음이 가는 경전 한 장을 골라 펼쳐 보세요.</p>
      <div class="sutra-cards">${picks.map((v, i) => `
        <button type="button" class="sutra" data-i="${i}">
          <span class="sutra-front">經</span>
          <span class="sutra-back"><span class="v">${v.text}</span><small>— ${v.src}</small></span>
        </button>`).join("")}</div>`;
    $$(".sutra", el).forEach((b) => b.addEventListener("click", () => {
      if (el.querySelector(".sutra.open")) return;
      b.classList.add("open");
      $$(".sutra", el).forEach((x) => { if (x !== b) x.classList.add("dim"); });
      bell(0.25, 262);
      const v = picks[Number(b.dataset.i)];
      ctx.ready(`법문 · ${v.src}`);
    }));
  },

  hoehyang(el, ctx) {
    const recs = ctx.stay.activities;
    el.innerHTML = `
      <p>회향(回向)은 수행으로 얻은 좋은 기운을 나 아닌 모든 이에게 돌려 보내는 일입니다. 오늘 하루를 돌아보세요.</p>
      <ul class="recap">${recs.map((a) => {
        const s = STEPS.find((x) => x.key === a.step_key);
        return `<li><b>${s ? s.name : ""}</b> <span class="muted">${fmtDur(a.duration_sec)}</span><br><span class="pre">${esc(a.note)}</span></li>`;
      }).join("")}</ul>
      <label>회향 소감
        <textarea id="reflection" rows="4" maxlength="2000" placeholder="이 마음이 어디로 가 닿기를 바라나요?"></textarea>
      </label>
      <div class="center"><button class="btn seal" id="finish" type="button">회향하고 산문 나서기</button></div>`;
    $("#finish", el).addEventListener("click", async (e) => {
      e.target.disabled = true;
      try {
        await api.addActivity(ctx.stay.id, "hoehyang", "회향", 0);
        const done = await api.completeStay(ctx.stay.id, $("#reflection", el).value.trim());
        bell(0.45);
        certificateView(done, ctx.temple);
      } catch (ex) { toast(ex.message); e.target.disabled = false; }
    });
  },
};

function certificateView(stay, t) {
  const total = stay.activities.reduce((s, a) => s + (a.duration_sec || 0), 0);
  app.innerHTML = `
    <section class="paper certificate">
      <p class="eyebrow">修了</p>
      <h2 class="brush big">템플스테이를 회향했습니다</h2>
      <p>${t.name}에서 ${STEPS.length}가지 일과를 모두 마쳤습니다.<br>수행 시간 약 ${fmtDur(total)}</p>
      ${stay.reflection ? `<blockquote class="pre">${esc(stay.reflection)}</blockquote>` : ""}
      <span class="stamp">${t.hanja.slice(0, 2)}</span>
      <p class="muted">${fmtDate(stay.completed_at || stay.started_at)}</p>
      <div class="row center">
        <a class="btn seal" href="#/wish/${t.id}">소원도 빌고 가기</a>
        <a class="btn" href="#/my">나의 기록</a>
      </div>
    </section>`;
}

// ---------- 소원 기원 ----------
function wishView(templeId) {
  if (needLogin()) return;
  const t = templeById(templeId);
  if (!t) return errorView("그런 사찰은 없습니다.");
  const state = { for_whom: "child", category: "suneung", target: 108, bows: 0, content: "" };

  app.innerHTML = `
    <section class="paper wish-form">
      <p class="eyebrow">${t.name} ${t.hall}</p>
      <h2 class="brush">소원지를 씁니다</h2>
      <div class="field"><span class="label">누구를 위한 소원인가요?</span>
        <div class="chips" data-k="for_whom">${Object.entries(FOR_WHOM).map(([k, v]) => `<button type="button" class="chip${k === state.for_whom ? " on" : ""}" data-v="${k}">${v}</button>`).join("")}</div></div>
      <div class="field"><span class="label">어떤 소원인가요?</span>
        <div class="chips" data-k="category">${Object.entries(CATEGORIES).map(([k, v]) => `<button type="button" class="chip${k === state.category ? " on" : ""}" data-v="${k}">${v}</button>`).join("")}</div></div>
      <label class="field"><span class="label">소원 <small>(실명·연락처는 적지 않는 것을 권해요)</small></span>
        <textarea id="wishText" class="lined" rows="5" maxlength="1000" placeholder="예) 우리 아이가 그동안 애쓴 만큼 시험장에서 떨지 않고 실력을 다 보여 주기를."></textarea>
        <span class="count" id="wishCount">0 / 1000</span></label>
      <div class="field"><span class="label">몇 번 절을 올릴까요?</span>
        <div class="chips" data-k="target">${BOW_TARGETS.map((n) => `<button type="button" class="chip${n === state.target ? " on" : ""}" data-v="${n}">${n}배</button>`).join("")}<button type="button" class="chip" data-v="0">마음 가는 대로</button></div></div>
      <p class="form-error" id="wishErr" role="alert"></p>
      <div class="center"><button class="btn seal" id="toBow" type="button">법당에 들어가 절 올리기</button></div>
    </section>`;

  $$(".chips", app).forEach((group) => group.addEventListener("click", (e) => {
    const c = e.target.closest(".chip");
    if (!c) return;
    $$(".chip", group).forEach((x) => x.classList.remove("on"));
    c.classList.add("on");
    const k = group.dataset.k;
    state[k] = k === "target" ? Number(c.dataset.v) : c.dataset.v;
  }));
  $("#wishText").addEventListener("input", (e) => { $("#wishCount").textContent = `${e.target.value.length} / 1000`; });
  $("#toBow").addEventListener("click", () => {
    state.content = $("#wishText").value.trim();
    if (!state.content) { $("#wishErr").textContent = "소원을 한 줄이라도 적어 주세요."; return; }
    bowStage(t, state);
  });
}

function bowStage(t, state) {
  const target = state.target;
  const free = !target;
  const BEADS = 108; // 염주 108알: 목표 배수에 비례해 불이 켜진다
  app.innerHTML = `
    <section class="bow-stage">
      <div class="bow-left"><div class="bow-scene">${bowScene(t)}</div><p class="photo-credit">${esc(t.photo.caption)} — ${photoCredit(t)}</p></div>
      <div class="bow-panel paper">
        <div class="mala-ring">
          <div class="mala" id="mala">${Array.from({ length: BEADS }, (_, i) => {
            const a = (i / BEADS) * Math.PI * 2 - Math.PI / 2;
            return `<i style="left:${50 + Math.cos(a) * 47}%;top:${50 + Math.sin(a) * 47}%"></i>`;
          }).join("")}</div>
          <p class="counter big" id="bowCount">0${free ? "" : `<span class="of"> / ${target}</span>`}<small>배</small></p>
        </div>
        <p class="muted small" id="bowMsg">부처님께 합장하고, 무릎 꿇고, 이마를 바닥에 대어 정성껏 큰절을 올립니다.</p>
        <div class="chips small-chips" id="speed" aria-label="절 속도">
          <button type="button" class="chip on" data-s="1">정성껏</button>
          <button type="button" class="chip" data-s="1.6">보통</button>
          <button type="button" class="chip" data-s="2.4">빠르게</button>
        </div>
        <label class="check"><input type="checkbox" id="autoBow"> 멈출 때까지 이어서 절하기</label>
        <button class="btn seal huge" id="bowBtn" type="button">🙏 절 올리기</button>
        <button class="btn" id="offerBtn" type="button" ${free ? "disabled" : "hidden"}>소원 올리기</button>
      </div>
    </section>`;

  let alive = true;
  let speed = 1;
  cleanup.push(() => { alive = false; });
  const bowBtn = $("#bowBtn");
  const offerBtn = $("#offerBtn");
  const auto = $("#autoBow");
  const person = createWorshipper($("#worshipper"), { onTouch: () => moktak(0.3) });

  $$("#speed .chip").forEach((c) => c.addEventListener("click", () => {
    $$("#speed .chip").forEach((x) => x.classList.remove("on"));
    c.classList.add("on"); speed = Number(c.dataset.s);
  }));

  const finished = () => !free && state.bows >= target;
  const doBow = async () => {
    if (person.busy || finished()) return;
    bowBtn.disabled = true;
    bowBtn.textContent = "절 올리는 중…";
    moktak(0.55);
    await person.bow(speed);
    if (!alive) return;
    state.bows++;
    const litCount = free ? ((state.bows - 1) % BEADS) + 1 : Math.round((Math.min(state.bows, target) / target) * BEADS);
    $$("#mala i").forEach((b, i) => b.classList.toggle("lit", i < litCount));
    $("#bowCount").innerHTML = `${state.bows}${free ? "" : `<span class="of"> / ${target}</span>`}<small>배</small>`;
    if (free) offerBtn.disabled = false;
    if (finished()) {
      bell(0.45);
      $("#bowMsg").textContent = "절을 모두 올렸습니다. 이제 소원을 올려 주세요.";
      bowBtn.hidden = true; offerBtn.hidden = false; offerBtn.classList.add("pulse");
      return;
    }
    bowBtn.disabled = false;
    bowBtn.textContent = "🙏 절 올리기";
    if (auto.checked) doBow();
  };
  bowBtn.addEventListener("click", doBow);
  const onKey = (e) => { if (e.code === "Space" && !bowBtn.hidden && document.activeElement?.tagName !== "TEXTAREA") { e.preventDefault(); doBow(); } };
  window.addEventListener("keydown", onKey);
  cleanup.push(() => window.removeEventListener("keydown", onKey));

  offerBtn.addEventListener("click", async () => {
    auto.checked = false;
    if (person.busy) return;
    offerBtn.disabled = true;
    try {
      const wish = await api.createWish({
        temple_id: t.id, for_whom: state.for_whom, category: state.category, content: state.content, bows: state.bows,
      });
      bell(0.5, 147);
      doneStage(wish);
    } catch (ex) { toast(ex.message); offerBtn.disabled = false; }
  });
}

function shareUrl(shareId) {
  return `${location.origin}${location.pathname}#/letter/${shareId}`;
}

function letterHtml(w) {
  const t = templeById(w.temple_id) || TEMPLES[0];
  return `
    <article class="letter">
      <div class="letter-inner">
        <p class="letter-to">${t.name} ${t.hall} 부처님 전에</p>
        <h3 class="brush">${FOR_WHOM_OBJ[w.for_whom] || ""} 위한 ${CATEGORIES[w.category] || "소원"} 기원</h3>
        <p class="letter-body pre">${esc(w.content)}</p>
        <p class="letter-bows">이 마음을 담아 <b>${Number(w.bows) || 0}배</b>를 올렸습니다.</p>
        <footer>
          <span>${fmtDate(w.created_at)}</span>
          <span class="from">${esc(w.nickname)} 합장</span>
          <span class="stamp small">${t.hanja.slice(0, 2)}</span>
        </footer>
      </div>
    </article>`;
}

function doneStage(wish) {
  const url = shareUrl(wish.share_id);
  app.innerHTML = `
    <section class="done-wish">
      <h2 class="brush center">소원이 올려졌습니다</h2>
      ${letterHtml(wish)}
      <div class="paper share">
        <label>편지 링크<input id="shareUrl" readonly value="${esc(url)}"></label>
        <div class="row center">
          <button class="btn seal" id="copyBtn" type="button">링크 복사</button>
          ${navigator.share ? `<button class="btn" id="shareBtn" type="button">공유하기</button>` : ""}
          <a class="btn" href="#/wish/${esc(wish.temple_id)}">한 번 더 빌기</a>
        </div>
        <p class="small muted center">링크를 받은 사람만 편지를 볼 수 있어요. 이메일은 보이지 않습니다.</p>
      </div>
    </section>`;
  bindShare(url);
}

function bindShare(url) {
  const copy = $("#copyBtn");
  if (copy) copy.addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(url); toast("링크를 복사했습니다."); }
    catch { $("#shareUrl").select(); toast("링크를 선택했습니다. 복사해 주세요."); }
  });
  const sh = $("#shareBtn");
  if (sh) sh.addEventListener("click", () => navigator.share({ title: "소원 편지", text: "산사에서 마음을 담아 보낸 편지", url }).catch(() => {}));
}

async function letterView(shareId) {
  app.innerHTML = `<p class="center muted">편지를 펼치는 중…</p>`;
  try {
    const w = await api.getLetter(shareId);
    app.innerHTML = `
      <section class="done-wish">
        <p class="eyebrow center">산사에서 온 편지</p>
        ${letterHtml(w)}
        <div class="row center no-print">
          <button class="btn" id="printBtn" type="button">인쇄하기</button>
          <a class="btn seal" href="#/temples">나도 마음 올리러 가기</a>
        </div>
      </section>`;
    $("#printBtn").addEventListener("click", () => window.print());
  } catch (ex) { errorView(ex); }
}

// ---------- 나의 기록 ----------
async function myView() {
  if (needLogin()) return;
  app.innerHTML = `<p class="center muted">기록을 펼치는 중…</p>`;
  let stays, wishes;
  try { [stays, wishes] = await Promise.all([api.listStays(), api.listWishes()]); }
  catch (ex) { return errorView(ex); }
  app.innerHTML = `
    <section class="section-head"><h2 class="brush">나의 수행 기록</h2></section>
    <section class="my-grid">
      <div class="paper">
        <h3>템플스테이 <small class="muted">${stays.length}회</small></h3>
        ${stays.length ? `<ul class="log">${stays.map((s) => {
          const t = templeById(s.temple_id);
          return `<li><a href="#/stay/${esc(s.id)}"><b>${t ? t.name : ""}</b> · ${fmtDate(s.started_at)}</a>
            <span class="badge ${s.status === "completed" ? "ok" : ""}">${s.status === "completed" ? "회향" : `${s.activities.length}/${STEPS.length} 진행 중`}</span></li>`;
        }).join("")}</ul>` : `<p class="muted">아직 기록이 없어요. <a href="#/temples">산사로 가기</a></p>`}
      </div>
      <div class="paper">
        <h3>소원 편지 <small class="muted">${wishes.length}통 · ${wishes.reduce((s, w) => s + w.bows, 0)}배</small></h3>
        ${wishes.length ? `<ul class="log">${wishes.map((w) => {
          const t = templeById(w.temple_id);
          return `<li><a href="#/letter/${esc(w.share_id)}"><b>${CATEGORIES[w.category] || ""}</b> · ${t ? t.name : ""} · ${w.bows}배</a>
            <span class="muted small">${fmtDate(w.created_at)}</span>
            <button class="linkish danger" type="button" data-del="${esc(w.id)}">지우기</button></li>`;
        }).join("")}</ul>` : `<p class="muted">아직 올린 소원이 없어요.</p>`}
      </div>
    </section>`;
  $$("[data-del]").forEach((b) => b.addEventListener("click", async () => {
    if (!confirm("이 소원 편지를 지울까요? 공유한 링크도 더 이상 열리지 않습니다.")) return;
    try { await api.deleteWish(b.dataset.del); toast("지웠습니다."); myView(); } catch (ex) { toast(ex.message); }
  }));
}

// ---------- 라우터 ----------
async function route() {
  cleanup.forEach((fn) => fn()); cleanup = [];
  const { parts, query } = parseHash();
  const [page, arg] = parts;
  renderNav();
  document.body.dataset.page = page || "home";
  try {
    switch (page) {
      case undefined: homeView(); break;
      case "login": authView("login", query); break;
      case "signup": authView("signup", query); break;
      case "temples": templesView(); break;
      case "temple": await templeView(arg); break;
      case "stay": await stayView(arg); break;
      case "wish": wishView(arg); break;
      case "letter": await letterView(arg); break;
      case "my": await myView(); break;
      default: errorView("없는 길입니다.");
    }
  } catch (ex) {
    if (ex instanceof ApiError && ex.status === 401) { renderNav(); needLogin(); return; }
    errorView(ex);
  }
  app.focus({ preventScroll: true });
}

window.addEventListener("hashchange", () => { route(); window.scrollTo(0, 0); });
initMusicButton();
route();
