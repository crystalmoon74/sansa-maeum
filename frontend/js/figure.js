// 관절로 움직이는 참배자 — 합장 → 무릎 꿇기 → 앉기 → 두 손 짚기 → 이마 대기(오체투지)
// → 접족례(손바닥 받들기) → 일어서기. 옆모습, 오른쪽(부처님)을 향한다.
const LINE = "#2e2a26";
const ROBE = "#a29c91";     // 회색 법복 저고리
const SLEEVE = "#aaa499";
const PANTS = "#77726a";    // 바지
const ROBE_DEEP = "#5f5a52";
const SKIN = "#e8c9a6";
const SKIN_SHADE = "#cfa57f";
const HAIR = "#262220";
const SOCK = "#f1ede4";       // 흰 버선
const FLOOR = 198;
const L = { thigh: 40, shin: 38, torso: 50, neck: 15, uarm: 26, farm: 23 };

// 각도: 0 = 앞(오른쪽), 90 = 아래, -90 = 위, 180 = 뒤
const POSES = {
  stand:    { hx: 100, hy: 120, th: 90, sh: 90,  to: -90, hd: -90, ua: 75,  fa: -50 },
  bowHead:  { hx: 100, hy: 120, th: 90, sh: 90,  to: -80, hd: -60, ua: 75,  fa: -45 },
  kneel:    { hx: 100, hy: 156, th: 90, sh: 180, to: -90, hd: -88, ua: 75,  fa: -50 },
  sit:      { hx: 72,  hy: 178, th: 27, sh: 180, to: -86, hd: -86, ua: 75,  fa: -50 },
  hands:    { hx: 72,  hy: 178, th: 27, sh: 180, to: -40, hd: -25, ua: 80,  fa: 70 },
  prostrate:{ hx: 74,  hy: 180, th: 25, sh: 180, to: 8,   hd: -15, ua: 168, fa: -3 },
  palmsUp:  { hx: 74,  hy: 180, th: 25, sh: 180, to: 8,   hd: -15, ua: 168, fa: -32 },
};

// 한 번의 큰절. hold 는 그 자세에서 머무는 시간(ms)
const SEQUENCE = [
  ["bowHead", 700, 250], ["stand", 500, 150],
  ["kneel", 1000, 150], ["sit", 700, 200], ["hands", 700, 100],
  ["prostrate", 900, 500, "touch"], ["palmsUp", 600, 700], ["prostrate", 500, 200],
  ["hands", 800, 100], ["sit", 600, 150], ["kneel", 700, 100], ["stand", 1100, 300],
];

const rad = (d) => (d * Math.PI) / 180;
const step = (p, len, deg) => [p[0] + len * Math.cos(rad(deg)), p[1] + len * Math.sin(rad(deg))];
const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const f = (n) => n.toFixed(1);

function lerpPose(a, b, k) {
  const o = {};
  for (const key in a) o[key] = a[key] + (b[key] - a[key]) * k;
  return o;
}

// 두 관절 사이를 굵기가 변하는 둥근 막대로 그린다 (팔·다리·몸통)
function taper(a, b, w1, w2, fill, stroke = LINE) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len, ny = dx / len;
  const r1 = w1 / 2, r2 = w2 / 2;
  const p1 = [a[0] + nx * r1, a[1] + ny * r1], p2 = [b[0] + nx * r2, b[1] + ny * r2];
  const p3 = [b[0] - nx * r2, b[1] - ny * r2], p4 = [a[0] - nx * r1, a[1] - ny * r1];
  return `<path d="M${f(p1[0])} ${f(p1[1])} L${f(p2[0])} ${f(p2[1])} A${f(r2)} ${f(r2)} 0 0 0 ${f(p3[0])} ${f(p3[1])} L${f(p4[0])} ${f(p4[1])} A${f(r1)} ${f(r1)} 0 0 0 ${f(p1[0])} ${f(p1[1])}Z" fill="${fill}" stroke="${stroke}" stroke-width="1.1" stroke-linejoin="round"/>`;
}

// 옆모습 머리: 얼굴(이마·코·입·턱), 귀, 단정히 빗어 묶은 머리
function headSvg(c, deg) {
  return `<g transform="translate(${f(c[0])} ${f(c[1])}) rotate(${f(deg + 90)})">
    <path d="M-3 9 L-2 15 L5 15 L5 9Z" fill="${SKIN_SHADE}" stroke="${LINE}" stroke-width="0.9"/>
    <path d="M-10.5 1 C -11 -9 -4 -13.5 2 -13 C 8 -12.5 11.5 -8 11.5 -3 L 12 -1 L 14.2 3.2 L 12 4 L 12.4 5.6 L 11.6 6.4 L 11.9 7.8 C 11 10 8.5 11.4 5.6 11.2 L 1 11 C -5 10.5 -10 7 -10.5 1Z"
      fill="${SKIN}" stroke="${LINE}" stroke-width="1.1" stroke-linejoin="round"/>
    <path d="M-11 2 C -12.5 -9 -5 -14.8 2.5 -14 C 8 -13.5 11.5 -10 11.8 -5.5 C 8 -8.5 4 -9 1 -8 C -2 -5 -3 -1 -3.5 3 C -5.5 5.5 -8.5 6 -11 2Z" fill="${HAIR}"/>
    <ellipse cx="-12.6" cy="-4" rx="3.6" ry="3.2" fill="${HAIR}"/>
    <ellipse cx="-1.2" cy="1.2" rx="2.4" ry="3.4" fill="${SKIN_SHADE}" stroke="${LINE}" stroke-width="0.8"/>
    <path d="M6.4 -1.4 q 2.2 1.1 4.2 0" stroke="${LINE}" stroke-width="0.9" fill="none" stroke-linecap="round"/>
    <path d="M6 -4.6 q 2.6 -1.3 5 -0.2" stroke="${HAIR}" stroke-width="1" fill="none" stroke-linecap="round"/>
    <path d="M10.6 6.2 h1.4" stroke="#a5634c" stroke-width="0.9" stroke-linecap="round"/>
  </g>`;
}

function handSvg(c, deg) {
  // 손바닥을 편 손 (손가락은 팔뚝 방향으로)
  return `<g transform="translate(${f(c[0])} ${f(c[1])}) rotate(${f(deg)})">
    <path d="M-2 -3.2 C 3 -4 8 -3.4 10.5 -1.6 C 11.6 -0.6 11.4 1 10 1.6 C 7 3 2 3.6 -2 3.2Z" fill="${SKIN}" stroke="${LINE}" stroke-width="1"/>
    <path d="M3 -0.6 H9" stroke="${SKIN_SHADE}" stroke-width="0.8"/>
  </g>`;
}

function draw(p) {
  const hip = [p.hx, p.hy];
  const knee = step(hip, L.thigh, p.th);
  let ankle = step(knee, L.shin, p.sh);
  if (ankle[1] > FLOOR - 3) ankle = [ankle[0], FLOOR - 3]; // 바닥 아래로 내려가지 않게
  const footDir = (p.sh - 90) * 2;
  const toe = step(ankle, 13, footDir);
  const shoulder = step(hip, L.torso, p.to);
  const chest = step(hip, L.torso * 0.62, p.to);
  const neck = step(shoulder, 4, p.to);
  const head = step(neck, L.neck - 3, p.hd);
  const elbow = step(shoulder, L.uarm, p.ua);
  const wrist = step(elbow, L.farm, p.fa);
  const belt = step(hip, 12, p.to);
  const beltEnd = step(belt, 14, p.to + 90);

  return `
    ${taper(ankle, toe, 9, 7, SOCK)}
    ${taper(knee, ankle, 17, 12, PANTS)}
    ${taper(hip, knee, 22, 18, PANTS)}
    ${taper(hip, step(hip, 15, p.th), 27, 24, ROBE)}
    ${taper(hip, chest, 25, 26, ROBE)}
    ${taper(chest, shoulder, 26, 20, ROBE)}
    <path d="M${f(belt[0])} ${f(belt[1])} L${f(beltEnd[0])} ${f(beltEnd[1])}" stroke="${ROBE_DEEP}" stroke-width="3.2" stroke-linecap="round"/>
    ${taper(shoulder, neck, 9, 8, SKIN_SHADE)}
    ${headSvg(head, p.hd)}
    <path d="M${f(step(shoulder, 3, p.to + 180)[0])} ${f(step(shoulder, 3, p.to + 180)[1])} L${f(step(chest, 11, p.to + 90)[0])} ${f(step(chest, 11, p.to + 90)[1])}"
      stroke="${ROBE_DEEP}" stroke-width="1.4" fill="none"/>
    <path d="M${f(neck[0])} ${f(neck[1])} L${f(step(chest, 9, p.to + 90)[0])} ${f(step(chest, 9, p.to + 90)[1])}" stroke="#f4f0e6" stroke-width="2" stroke-linecap="round"/>
    ${taper(shoulder, elbow, 11, 10, SLEEVE)}
    ${taper(elbow, wrist, 10, 13, SLEEVE)}
    ${handSvg(step(wrist, 1, p.fa), p.fa)}`;
}

export function createWorshipper(group, { onTouch } = {}) {
  const cushion = `<path d="M50 ${FLOOR + 1} q 44 -7 92 0 q 2 5 -2 7 q -44 4 -88 0 q -4 -2 -2 -7Z" fill="#8e3a2a" stroke="${LINE}" stroke-width="1"/>`;
  group.innerHTML = `${cushion}<g class="w-body" style="filter:drop-shadow(1px 1.5px 1.2px rgba(0,0,0,.35))"></g>`;
  const body = group.querySelector(".w-body");
  let current = { ...POSES.stand };
  body.innerHTML = draw(current);
  let busy = false;

  function tween(to, dur) {
    const from = { ...current };
    return new Promise((resolve) => {
      const start = performance.now();
      const frame = (now) => {
        const k = Math.min(1, (now - start) / dur);
        current = lerpPose(from, to, ease(k));
        body.innerHTML = draw(current);
        k < 1 ? requestAnimationFrame(frame) : resolve();
      };
      requestAnimationFrame(frame);
    });
  }
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  return {
    get busy() { return busy; },
    async bow(speed = 1) {
      if (busy) return;
      busy = true;
      for (const [name, dur, hold, cue] of SEQUENCE) {
        await tween(POSES[name], dur / speed);
        if (cue === "touch" && onTouch) onTouch();
        await wait(hold / speed);
      }
      busy = false;
    },
  };
}
