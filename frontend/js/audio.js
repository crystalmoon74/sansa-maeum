// 배경 소리: 멀리서 울리는 산사의 범종 + 효과음(목탁·범종)
// 모두 Web Audio 로 합성하므로 외부 음원이 필요 없다.
const PREF_KEY = "sansa.music";
const BELL_EVERY_MS = 16000; // 범종 한 타 뒤 여운이 충분히 사라질 만큼 쉰다

let ctx = null;
let master = null;
let playing = false;
let bellTimer = null;

function ensureCtx() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.9;
    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

// 목탁: 짧고 둥근 나무 울림
export function moktak(volume = 0.5) {
  const c = ensureCtx();
  if (!c) return;
  const t = c.currentTime;
  const o = c.createOscillator();
  const g = c.createGain();
  const f = c.createBiquadFilter();
  o.type = "sine";
  o.frequency.setValueAtTime(820, t);
  o.frequency.exponentialRampToValueAtTime(520, t + 0.08);
  f.type = "bandpass"; f.frequency.value = 700; f.Q.value = 3;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(volume, t + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
  o.connect(f).connect(g).connect(master);
  o.start(t); o.stop(t + 0.25);
}

// 작은 종/싱잉볼: 비정수배 배음이 길게 사라짐 (수행 단계 효과음)
export function bell(volume = 0.35, base = 196) {
  const c = ensureCtx();
  if (!c) return;
  const t = c.currentTime;
  [1, 2.01, 2.76, 4.07, 5.43].forEach((ratio, i) => {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = "sine";
    o.frequency.value = base * ratio;
    const v = volume / (i + 1.3);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 6 - i * 0.8);
    o.connect(g).connect(master);
    o.start(t); o.stop(t + 6.2);
  });
}

// 범종(梵鐘): 당목이 치는 둔탁한 타격음 + 낮게 오래 남는 울림.
// 짝을 이룬 배음의 주파수를 아주 조금 어긋나게 해 한국 범종 특유의 '맥놀이'(웅~웅~ 하는 떨림)를 만든다.
export function templeBell(volume = 0.5) {
  const c = ensureCtx();
  if (!c) return;
  const t = c.currentTime;
  const out = c.createGain();
  out.gain.value = volume;
  const lp = c.createBiquadFilter();
  lp.type = "lowpass"; lp.frequency.value = 1400;
  out.connect(lp).connect(master);

  // 타격음 (나무 당목)
  const len = Math.floor(c.sampleRate * 0.25);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
  const noise = c.createBufferSource();
  noise.buffer = buf;
  const nf = c.createBiquadFilter();
  nf.type = "lowpass"; nf.frequency.value = 260;
  const ng = c.createGain();
  ng.gain.value = 0.9;
  noise.connect(nf).connect(ng).connect(out);
  noise.start(t);

  // [배음비, 상대 음량, 지속(초), 맥놀이 폭(Hz)]
  const base = 64;
  [[1, 1.0, 14, 0.35], [1.68, 0.7, 11, 0.5], [2.5, 0.45, 9, 0.7], [3.4, 0.3, 7, 0.9], [4.5, 0.18, 5, 1.2], [6.1, 0.1, 3.5, 1.6]]
    .forEach(([ratio, amp, dur, beat]) => {
      [-beat / 2, beat / 2].forEach((detune) => {
        const o = c.createOscillator();
        const g = c.createGain();
        o.type = "sine";
        o.frequency.value = base * ratio + detune;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(amp * 0.22, t + 0.03);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(g).connect(out);
        o.start(t); o.stop(t + dur + 0.1);
      });
    });
}

// 범종은 기본으로 켜져 있다. 브라우저는 사용자가 화면을 한 번 누르기 전까지 소리를 막으므로,
// 소리가 막혀 있으면 버튼은 켜짐으로 두고 첫 터치·클릭·키 입력 때 바로 첫 타를 울린다.
let pendingFirstBell = false;

function ringIfAllowed(volume) {
  if (!playing || !ctx) return;
  if (ctx.state === "running") templeBell(volume);
  else pendingFirstBell = true;
}

export function startMusic() {
  if (playing || !ensureCtx()) return;
  playing = true;
  updateButton();
  ctx.onstatechange = () => {
    if (ctx.state === "running" && pendingFirstBell && playing) { pendingFirstBell = false; templeBell(0.55); }
  };
  ringIfAllowed(0.55);
  bellTimer = setInterval(() => ringIfAllowed(0.45), BELL_EVERY_MS);
}

export function stopMusic() {
  playing = false;
  pendingFirstBell = false;
  clearInterval(bellTimer);
  updateButton();
}

function updateButton() {
  const btn = document.getElementById("musicBtn");
  if (!btn) return;
  btn.setAttribute("aria-pressed", String(playing));
  btn.classList.toggle("on", playing);
  btn.querySelector(".music-label").textContent = playing ? "범종 소리 ♪" : "범종 소리";
}

function savePref(on) {
  try { localStorage.setItem(PREF_KEY, on ? "on" : "off"); } catch { /* 무시 */ }
}

export function wantsMusic() {
  try { return localStorage.getItem(PREF_KEY) !== "off"; } catch { return true; }
}

export function initMusicButton() {
  const btn = document.getElementById("musicBtn");
  btn.addEventListener("click", () => {
    // 켜져 있지만 아직 소리가 막혀 있던 상태라면, 첫 클릭은 끄지 않고 소리를 풀어 준다
    if (playing && ctx && ctx.state !== "running") { ensureCtx(); return; }
    if (playing) { stopMusic(); savePref(false); } else { startMusic(); savePref(true); }
  });
  // 기본값 On: 처음 방문했거나 끄지 않았다면 바로 켬
  if (wantsMusic()) startMusic();
  // 첫 사용자 동작에서 막혀 있던 오디오를 풀어 준다
  const unlock = (e) => {
    if (e.target.closest && e.target.closest("#musicBtn")) return;
    window.removeEventListener("pointerdown", unlock);
    window.removeEventListener("keydown", unlock);
    if (playing) ensureCtx();
  };
  window.addEventListener("pointerdown", unlock);
  window.addEventListener("keydown", unlock);
}
