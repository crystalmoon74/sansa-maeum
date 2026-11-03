// 손그림 느낌의 사찰 풍경 SVG 생성기
// 모든 도형은 #rough 필터로 살짝 흔들려 붓으로 그린 듯한 선이 된다.

const INK = "#2b2621";
const PILLAR = "#9a4a31";
const STONE = "#d4c8b0";
const CELADON = "#3f7a6a";

const r = (n) => Math.round(n * 10) / 10;

function mountains(t) {
  return `
  <g filter="url(#wash)" opacity="0.55">
    <path d="M-20 300 C 80 190 150 160 240 220 C 300 140 390 100 470 190 C 540 130 640 120 820 240 L820 460 L-20 460Z" fill="${t.hill}" opacity="0.45"/>
  </g>
  <g filter="url(#wash)" opacity="0.8">
    <path d="M-20 330 C 60 260 140 250 210 290 C 290 240 340 230 420 280 C 500 230 600 220 700 270 C 750 250 790 255 820 270 L820 460 L-20 460Z" fill="${t.hill}" opacity="0.6"/>
  </g>`;
}

function pine(x, y, s = 1, flip = false) {
  const f = flip ? -1 : 1;
  return `<g transform="translate(${x} ${y}) scale(${s * f} ${s})" filter="url(#rough)">
    <path d="M0 0 C 4 -30 -6 -55 6 -90 C 10 -100 14 -110 12 -118" stroke="${INK}" stroke-width="5" fill="none" stroke-linecap="round"/>
    <path d="M-34 -70 C -10 -84 18 -82 36 -72 C 16 -66 -12 -64 -34 -70Z" fill="#3e5a45" stroke="${INK}" stroke-width="1.5"/>
    <path d="M-20 -96 C 0 -108 22 -106 38 -98 C 20 -92 -2 -90 -20 -96Z" fill="#46664e" stroke="${INK}" stroke-width="1.5"/>
    <path d="M-12 -118 C 2 -128 18 -126 28 -120 C 14 -114 0 -113 -12 -118Z" fill="#4f7056" stroke="${INK}" stroke-width="1.5"/>
  </g>`;
}

// 전통 목조 전각: 기단 + 기둥 + 창호 + 단청 + 곡선 지붕
export function hall({ cx, base, w, h, cols = 3, entasis = false, name = "", roofH = 70, small = false }) {
  const x0 = cx - w / 2, x1 = cx + w / 2;
  const top = base - h;
  const eave = top - 16;
  const ridge = eave - roofH;
  const over = small ? 26 : 44;
  let s = "";

  // 기단
  s += `<rect x="${x0 - 24}" y="${base}" width="${w + 48}" height="${small ? 12 : 22}" fill="${STONE}" stroke="${INK}" stroke-width="2"/>`;
  if (!small) s += `<path d="M${x0 - 24} ${base + 11} H${x1 + 24}" stroke="${INK}" stroke-width="1" opacity="0.5"/>`;

  // 칸마다 꽃살문
  const step = w / cols;
  for (let i = 0; i < cols; i++) {
    const px = x0 + i * step + 6;
    s += `<rect x="${px}" y="${top + 6}" width="${step - 12}" height="${h - 8}" fill="#e2c48e" stroke="${INK}" stroke-width="1.4"/>`;
    const n = small ? 3 : 5;
    for (let k = 1; k < n; k++) {
      const lx = px + ((step - 12) * k) / n;
      s += `<path d="M${r(lx)} ${top + 6} V${base - 2}" stroke="${INK}" stroke-width="0.8" opacity="0.6"/>`;
    }
    for (let k = 1; k < 6; k++) {
      const ly = top + 6 + ((h - 8) * k) / 6;
      s += `<path d="M${px} ${r(ly)} H${px + step - 12}" stroke="${INK}" stroke-width="0.8" opacity="0.6"/>`;
    }
  }

  // 기둥 (부석사는 배흘림)
  for (let i = 0; i <= cols; i++) {
    const px = x0 + i * step;
    if (entasis) {
      s += `<path d="M${px - 5} ${top} C ${px - 9} ${top + h * 0.35} ${px - 9} ${top + h * 0.55} ${px - 5} ${base} H${px + 5} C ${px + 9} ${top + h * 0.55} ${px + 9} ${top + h * 0.35} ${px + 5} ${top}Z" fill="${PILLAR}" stroke="${INK}" stroke-width="1.6"/>`;
    } else {
      s += `<rect x="${px - 5}" y="${top}" width="10" height="${h}" fill="${PILLAR}" stroke="${INK}" stroke-width="1.6"/>`;
    }
  }

  // 단청 띠
  s += `<rect x="${x0 - 8}" y="${eave}" width="${w + 16}" height="${top - eave + 2}" fill="${CELADON}" stroke="${INK}" stroke-width="1.6"/>`;
  for (let x = x0; x < x1; x += 18) {
    s += `<circle cx="${x + 6}" cy="${eave + 8}" r="3.2" fill="#e9dfc8" stroke="#b8432f" stroke-width="1.6"/>`;
  }

  // 곡선 지붕 (처마가 들린 팔작지붕)
  const roof = `M${x0 - over} ${eave - 12}
    Q ${x0 - over / 3} ${eave + 6} ${x0 + 10} ${eave + 2}
    L ${x1 - 10} ${eave + 2}
    Q ${x1 + over / 3} ${eave + 6} ${x1 + over} ${eave - 12}
    Q ${x1 + 6} ${eave - roofH * 0.35} ${x1 - w * 0.12} ${ridge}
    L ${x0 + w * 0.12} ${ridge}
    Q ${x0 - 6} ${eave - roofH * 0.35} ${x0 - over} ${eave - 12}Z`;
  s += `<path d="${roof}" fill="#4a4743" stroke="${INK}" stroke-width="2.2"/>`;
  // 기와 골
  const tiles = small ? 10 : 22;
  for (let i = 1; i < tiles; i++) {
    const tx = x0 - over * 0.6 + ((w + over * 1.2) * i) / tiles;
    const ttop = x0 + w * 0.12 < tx && tx < x1 - w * 0.12 ? ridge + 2 : ridge + roofH * 0.3;
    s += `<path d="M${r(tx)} ${r(ttop)} Q ${r(tx + (tx < cx ? -6 : 6))} ${r((ttop + eave) / 2)} ${r(tx)} ${eave}" stroke="#6b6660" stroke-width="1.2" fill="none"/>`;
  }
  // 용마루 + 치미
  s += `<path d="M${x0 + w * 0.12 - 8} ${ridge + 1} H${x1 - w * 0.12 + 8}" stroke="${INK}" stroke-width="${small ? 5 : 8}" stroke-linecap="round"/>`;
  s += `<path d="M${x0 + w * 0.12 - 10} ${ridge + 2} q -4 -12 4 -18" stroke="${INK}" stroke-width="4" fill="none" stroke-linecap="round"/>`;
  s += `<path d="M${x1 - w * 0.12 + 10} ${ridge + 2} q 4 -12 -4 -18" stroke="${INK}" stroke-width="4" fill="none" stroke-linecap="round"/>`;

  // 현판
  if (name) {
    const bw = Math.max(54, name.length * 17);
    s += `<rect x="${cx - bw / 2}" y="${eave - 4}" width="${bw}" height="22" fill="#2b2621" stroke="#c9933f" stroke-width="2"/>`;
    s += `<text x="${cx}" y="${eave + 12}" text-anchor="middle" font-size="14" fill="#f1d38f" font-family="Gowun Batang, serif" font-weight="700">${name}</text>`;
  }
  return `<g filter="url(#rough)">${s}</g>`;
}

function stoneWall(x0, x1, y0, y1) {
  let s = `<rect x="${x0}" y="${y0}" width="${x1 - x0}" height="${y1 - y0}" fill="#cfc2a6" stroke="${INK}" stroke-width="2"/>`;
  for (let y = y0 + 14, row = 0; y < y1; y += 14, row++) {
    s += `<path d="M${x0} ${y} H${x1}" stroke="${INK}" stroke-width="0.9" opacity="0.55"/>`;
    for (let x = x0 + (row % 2 ? 20 : 8); x < x1; x += 34) {
      s += `<path d="M${x} ${y - 14} V${y}" stroke="${INK}" stroke-width="0.9" opacity="0.5"/>`;
    }
  }
  return `<g filter="url(#rough)">${s}</g>`;
}

function seokgatap(x, base, s = 1) {
  const g = [];
  g.push(`<rect x="-34" y="-18" width="68" height="18" fill="${STONE}" stroke="${INK}" stroke-width="2"/>`);
  g.push(`<rect x="-28" y="-34" width="56" height="16" fill="${STONE}" stroke="${INK}" stroke-width="2"/>`);
  let y = -34;
  const sizes = [[34, 34], [28, 16], [24, 14]];
  sizes.forEach(([bw, bh]) => {
    g.push(`<rect x="${-bw / 2}" y="${y - bh}" width="${bw}" height="${bh}" fill="#ddd2bc" stroke="${INK}" stroke-width="1.8"/>`);
    y -= bh;
    g.push(`<path d="M${-bw / 2 - 14} ${y} Q 0 ${y - 4} ${bw / 2 + 14} ${y} L ${bw / 2 + 6} ${y - 7} H${-bw / 2 - 6}Z" fill="#c4b79d" stroke="${INK}" stroke-width="1.8"/>`);
    y -= 7;
  });
  g.push(`<path d="M0 ${y} V${y - 26}" stroke="${INK}" stroke-width="3"/>`);
  g.push(`<circle cx="0" cy="${y - 10}" r="4" fill="#c4b79d" stroke="${INK}" stroke-width="1.4"/>`);
  g.push(`<circle cx="0" cy="${y - 19}" r="3" fill="#c4b79d" stroke="${INK}" stroke-width="1.4"/>`);
  return `<g transform="translate(${x} ${base}) scale(${s})" filter="url(#rough)">${g.join("")}</g>`;
}

function dabotap(x, base, s = 1) {
  return `<g transform="translate(${x} ${base}) scale(${s})" filter="url(#rough)">
    <rect x="-36" y="-20" width="72" height="20" fill="${STONE}" stroke="${INK}" stroke-width="2"/>
    <path d="M-10 0 V-20 M10 0 V-20" stroke="${INK}" stroke-width="1.2"/>
    <rect x="-30" y="-50" width="60" height="30" fill="#ddd2bc" stroke="${INK}" stroke-width="1.8"/>
    <path d="M-20 -20 V-50 M0 -20 V-50 M20 -20 V-50" stroke="${INK}" stroke-width="1.4"/>
    <path d="M-44 -50 H44 L34 -60 H-34Z" fill="#c4b79d" stroke="${INK}" stroke-width="1.8"/>
    <path d="M-24 -60 H24 L18 -72 H-18Z" fill="#ddd2bc" stroke="${INK}" stroke-width="1.6"/>
    <path d="M-16 -72 L-12 -92 H12 L16 -72" fill="#ddd2bc" stroke="${INK}" stroke-width="1.6"/>
    <path d="M-22 -92 Q0 -102 22 -92 Q12 -88 0 -88 Q-12 -88 -22 -92Z" fill="#c4b79d" stroke="${INK}" stroke-width="1.6"/>
    <path d="M-28 -98 Q0 -112 28 -98 L18 -106 H-18Z" fill="#c4b79d" stroke="${INK}" stroke-width="1.6"/>
    <path d="M0 -106 V-132" stroke="${INK}" stroke-width="3"/>
    <circle cx="0" cy="-116" r="4" fill="#c4b79d" stroke="${INK}" stroke-width="1.4"/>
  </g>`;
}

function janggyeong(x0, x1, base, h) {
  let s = `<rect x="${x0}" y="${base - h}" width="${x1 - x0}" height="${h}" fill="#e6d3ae" stroke="${INK}" stroke-width="2"/>`;
  for (let x = x0 + 12; x < x1 - 18; x += 30) {
    s += `<rect x="${x}" y="${base - h + 10}" width="18" height="${h * 0.32}" fill="#5a4636" stroke="${INK}" stroke-width="1"/>`;
    for (let k = 1; k < 5; k++) s += `<path d="M${x + k * 3.6} ${base - h + 10} v${h * 0.32}" stroke="#e6d3ae" stroke-width="1.2"/>`;
    s += `<rect x="${x}" y="${base - h * 0.45}" width="18" height="${h * 0.3}" fill="#5a4636" stroke="${INK}" stroke-width="1"/>`;
    for (let k = 1; k < 5; k++) s += `<path d="M${x + k * 3.6} ${base - h * 0.45} v${h * 0.3}" stroke="#e6d3ae" stroke-width="1.2"/>`;
  }
  s += `<path d="M${x0 - 16} ${base - h + 2} Q ${(x0 + x1) / 2} ${base - h - 6} ${x1 + 16} ${base - h + 2} L ${x1 - 10} ${base - h - 26} H${x0 + 10}Z" fill="#4a4743" stroke="${INK}" stroke-width="2"/>`;
  return `<g filter="url(#rough)">${s}</g>`;
}

function stupaPlatform(x, base) {
  return `<g transform="translate(${x} ${base})" filter="url(#rough)">
    <rect x="-70" y="-16" width="140" height="16" fill="${STONE}" stroke="${INK}" stroke-width="2"/>
    <rect x="-52" y="-30" width="104" height="14" fill="#ddd2bc" stroke="${INK}" stroke-width="2"/>
    <path d="M-22 -30 C -24 -60 -16 -78 0 -80 C 16 -78 24 -60 22 -30Z" fill="#e6dccb" stroke="${INK}" stroke-width="2"/>
    <path d="M-16 -62 H16" stroke="${INK}" stroke-width="1"/>
    <path d="M0 -80 V-94" stroke="${INK}" stroke-width="3"/>
    <circle cx="0" cy="-96" r="5" fill="#c9933f" stroke="${INK}" stroke-width="1.4"/>
    <path d="M-70 -16 l-8 0 M70 -16 l8 0" stroke="${INK}" stroke-width="2"/>
  </g>`;
}

function stream(y) {
  let s = `<path d="M-20 ${y} C 150 ${y - 14} 300 ${y + 12} 460 ${y} S 700 ${y - 10} 820 ${y + 4} L820 470 L-20 470Z" fill="#a9c6c4" stroke="${INK}" stroke-width="2"/>`;
  for (let i = 0; i < 9; i++) {
    const x = 30 + i * 88, yy = y + 22 + (i % 3) * 14;
    s += `<path d="M${x} ${yy} q 12 -6 24 0 t 24 0" stroke="#f3ead8" stroke-width="2" fill="none" stroke-linecap="round"/>`;
  }
  return `<g filter="url(#rough)">${s}</g>`;
}

function archBridge(cx, y) {
  return `<g filter="url(#rough)">
    <path d="M${cx - 120} ${y} Q ${cx} ${y - 70} ${cx + 120} ${y} L ${cx + 120} ${y - 18} Q ${cx} ${y - 92} ${cx - 120} ${y - 18}Z" fill="#cfc2a6" stroke="${INK}" stroke-width="2"/>
    <path d="M${cx - 46} ${y + 2} Q ${cx} ${y - 52} ${cx + 46} ${y + 2}" fill="#6f8f8c" stroke="${INK}" stroke-width="2"/>
  </g>`;
}

function stoneLantern(x, base) {
  return `<g transform="translate(${x} ${base})" filter="url(#rough)">
    <rect x="-20" y="-10" width="40" height="10" fill="${STONE}" stroke="${INK}" stroke-width="1.8"/>
    <rect x="-5" y="-50" width="10" height="40" fill="#ddd2bc" stroke="${INK}" stroke-width="1.8"/>
    <path d="M-18 -50 H18 L12 -58 H-12Z" fill="#c4b79d" stroke="${INK}" stroke-width="1.6"/>
    <rect x="-13" y="-82" width="26" height="24" fill="#ddd2bc" stroke="${INK}" stroke-width="1.8"/>
    <rect x="-6" y="-78" width="12" height="16" fill="#f4c96a" stroke="${INK}" stroke-width="1.2" class="lantern-glow"/>
    <path d="M-24 -82 Q0 -96 24 -82 L14 -92 H-14Z" fill="#c4b79d" stroke="${INK}" stroke-width="1.6"/>
    <circle cx="0" cy="-98" r="4" fill="#c4b79d" stroke="${INK}" stroke-width="1.4"/>
  </g>`;
}

function lanternString(y) {
  const colors = ["#d9573c", "#e7a23a", "#c74d6a", "#6f9a52", "#e48a3c", "#b8432f"];
  let s = `<path d="M-10 ${y} Q 400 ${y + 40} 810 ${y}" stroke="${INK}" stroke-width="1.4" fill="none"/>`;
  for (let i = 0; i < 11; i++) {
    const x = 40 + i * 72;
    const t = x / 800;
    const yy = y + 40 * 4 * t * (1 - t) * 0.5 + 6;
    s += `<g class="sway" style="transform-origin:${x}px ${yy - 6}px;animation-delay:${-i * 0.37}s">
      <path d="M${x} ${yy - 6} v8" stroke="${INK}" stroke-width="1.2"/>
      <ellipse cx="${x}" cy="${yy + 14}" rx="12" ry="13" fill="${colors[i % colors.length]}" stroke="${INK}" stroke-width="1.6"/>
      <path d="M${x - 12} ${yy + 14} q12 5 24 0 M${x} ${yy + 1} v26" stroke="${INK}" stroke-width="0.9" fill="none" opacity="0.6"/>
      <path d="M${x - 3} ${yy + 27} v10 M${x + 3} ${yy + 27} v8" stroke="${colors[(i + 2) % colors.length]}" stroke-width="1.6"/>
    </g>`;
  }
  return `<g filter="url(#rough)">${s}</g>`;
}

function sun(x, y, color = "#d9573c", rad = 30) {
  return `<circle cx="${x}" cy="${y}" r="${rad}" fill="${color}" opacity="0.85" filter="url(#rough)"/>`;
}

function frame(t, inner, label) {
  return `<svg class="scene" viewBox="0 0 800 460" role="img" aria-label="${label}" preserveAspectRatio="xMidYMid slice">
    <defs><linearGradient id="sky-${t.id}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${t.sky[0]}"/><stop offset="1" stop-color="${t.sky[1]}"/></linearGradient></defs>
    <rect width="800" height="460" fill="url(#sky-${t.id})"/>
    ${inner}
  </svg>`;
}

const ground = (y, color = "#cdb88f") =>
  `<path d="M-20 ${y} C 200 ${y - 8} 600 ${y + 8} 820 ${y - 2} L820 470 L-20 470Z" fill="${color}" stroke="${INK}" stroke-width="2" filter="url(#rough)"/>`;

const BUILDERS = {
  bulguksa: (t) =>
    sun(650, 90, "#e07a4f") + mountains(t) + pine(70, 330, 1.1) + pine(740, 320, 1, true) +
    ground(372) +
    stoneWall(170, 630, 290, 372) +
    // 청운교·백운교 돌계단
    `<g filter="url(#rough)">
      <path d="M330 372 L360 290 H440 L470 372Z" fill="#ddd2bc" stroke="${INK}" stroke-width="2"/>
      ${Array.from({ length: 9 }, (_, i) => `<path d="M${334 + i * 3.2} ${362 - i * 9} H${466 - i * 3.2}" stroke="${INK}" stroke-width="1"/>`).join("")}
      <path d="M362 372 Q400 340 438 372" fill="#7a6a58" stroke="${INK}" stroke-width="1.6"/>
    </g>` +
    hall({ cx: 400, base: 268, w: 300, h: 70, cols: 5, name: t.hall, roofH: 64 }) +
    dabotap(225, 290, 0.85) + seokgatap(575, 290, 0.95) +
    lanternString(40),

  haeinsa: (t) =>
    mountains(t) + sun(130, 80, "#f0e3c0", 26) +
    janggyeong(30, 250, 330, 70) + janggyeong(550, 770, 330, 70) +
    ground(360, "#d3c19d") +
    hall({ cx: 400, base: 330, w: 260, h: 78, cols: 5, name: t.hall, roofH: 66 }) +
    pine(60, 380, 1.1) + pine(760, 385, 1.05, true) + stoneLantern(400, 400) +
    lanternString(30),

  tongdosa: (t) =>
    mountains(t) + sun(670, 80, "#e48a3c") + pine(40, 360, 1.2) +
    ground(366) +
    hall({ cx: 330, base: 330, w: 290, h: 80, cols: 5, name: t.hall, roofH: 70 }) +
    stupaPlatform(640, 380) + pine(770, 380, 0.9, true) +
    `<g filter="url(#rough)"><path d="M560 420 q 80 -20 170 0" stroke="${INK}" stroke-width="1.5" fill="none" stroke-dasharray="4 6"/></g>` +
    lanternString(36),

  songgwangsa: (t) =>
    mountains(t) + pine(740, 300, 1.1, true) +
    ground(312, "#cbb991") +
    hall({ cx: 520, base: 290, w: 240, h: 66, cols: 5, name: t.hall, roofH: 58 }) +
    stream(360) + archBridge(230, 370) +
    hall({ cx: 230, base: 302, w: 120, h: 36, cols: 3, roofH: 34, small: true, name: "우화각" }) +
    pine(40, 340, 0.95) +
    lanternString(28),

  buseoksa: (t) =>
    sun(150, 110, "#d9573c", 40) + mountains(t) +
    `<g filter="url(#wash)" opacity="0.4"><path d="M-20 260 C 120 230 260 250 400 236 C 560 222 700 248 820 236 V300 H-20Z" fill="#8a6f86"/></g>` +
    ground(358, "#c9ae86") +
    hall({ cx: 410, base: 330, w: 330, h: 88, cols: 5, entasis: true, name: t.hall, roofH: 72 }) +
    stoneLantern(410, 410) +
    `<g filter="url(#rough)">
      <path d="M640 360 C 650 320 720 312 760 330 C 790 344 780 368 744 372 C 700 378 650 380 640 360Z" fill="#9c958a" stroke="${INK}" stroke-width="2"/>
      <path d="M650 384 q 50 6 110 -6" stroke="${INK}" stroke-width="1.2" fill="none" stroke-dasharray="3 5"/>
      <text x="705" y="404" text-anchor="middle" font-size="13" fill="${INK}" font-family="Gaegu, cursive">浮石</text>
    </g>` +
    pine(60, 370, 1.05),
};

export function templeScene(t) {
  return frame(t, BUILDERS[t.id](t), `${t.name} ${t.hall} 풍경`);
}

// 작은 썸네일 (사찰 선택 화면)
export function templeThumb(t) {
  return templeScene(t);
}

// ---------- 법당 안 · 부처님 (실사 사진) ----------
// 사진은 위키미디어 공용(Wikimedia Commons)의 자유 이용 사진을 출처와 함께 표시한다.
const esc = (v) => String(v).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

export function photoCredit(t) {
  const p = t.photo;
  return `사진: ${esc(p.credit)} · ${esc(p.license)} · <a href="${esc(p.page)}" target="_blank" rel="noopener noreferrer">Wikimedia Commons</a>`;
}

export function buddhaPhoto(t) {
  const p = t.photo;
  return `<figure class="buddha-photo${p.portrait ? " portrait" : ""}">
    <div class="buddha-frame">
      <img src="${esc(p.src)}" alt="${esc(p.caption)}" loading="lazy" decoding="async" referrerpolicy="no-referrer" style="object-position:${esc(p.pos)}">
      <span class="candle-glow" aria-hidden="true"></span>
    </div>
    <figcaption><b>${esc(p.caption)}</b><span class="credit">${photoCredit(t)}</span></figcaption>
  </figure>`;
}

// 절 올리는 장면: 부처님 사진 위에 바닥과 참배자(<g id="worshipper">)를 겹친다
export function bowScene(t) {
  const p = t.photo;
  return `<div class="bow-photo">
    <img src="${esc(p.src)}" alt="${esc(p.caption)}" referrerpolicy="no-referrer" style="object-position:${esc(p.pos)}">
    <svg class="bow-overlay" viewBox="0 0 800 500" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <defs>
        <linearGradient id="floorFade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#2a1a12" stop-opacity="0"/>
          <stop offset="0.45" stop-color="#2a1a12" stop-opacity="0.55"/>
          <stop offset="1" stop-color="#1c120c" stop-opacity="0.92"/>
        </linearGradient>
        <linearGradient id="floorWood" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#7a5232"/><stop offset="1" stop-color="#4a2f1c"/>
        </linearGradient>
        <radialGradient id="shadow"><stop offset="0" stop-color="#000" stop-opacity="0.45"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
      </defs>
      <rect x="0" y="250" width="800" height="250" fill="url(#floorFade)"/>
      <path d="M0 468 H800 V500 H0Z" fill="url(#floorWood)" opacity="0.85"/>
      ${Array.from({ length: 9 }, (_, i) => `<path d="M${i * 100} 468 L${i * 100 - 30} 500" stroke="#2b1b10" stroke-width="1" opacity="0.6"/>`).join("")}
      <ellipse cx="250" cy="470" rx="120" ry="9" fill="url(#shadow)"/>
      <g id="worshipper" transform="translate(95 182) scale(1.45)"></g>
    </svg>
  </div>`;
}
