// Scenes for the dot-field backdrop (script.js). Each scene draws with plain canvas
// calls in CSS pixels: white = cool dots, amber = warm dots, black = empty.
// Scenes read `step` (dot spacing), which script.js sets on resize.
const TAU = Math.PI * 2;
const W = a => `rgba(255,255,255,${a})`;
const A = a => `rgba(255,166,92,${a})`;

function rng(seed) {
  return () => {
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const R = rng(7);
const circle = (g, x, y, r) => { g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); };
const fit = w => Math.min(1.4, Math.max(0.65, w / 1300));

const STARS = Array.from({ length: 220 }, () => ({ x: R(), y: R() * 0.82, s: 0.35 + R() * 0.65, ph: R() * 7, sp: 0.5 + R() * 1.8 }));

function streak(g, t, w, h, period, seed, color) {
  const k = Math.floor(t / period);
  const p = (t - k * period) / 1.3;
  if (p >= 1) return;
  const r = rng(k * 977 + seed);
  const x0 = (0.04 + 0.6 * r()) * w, y0 = (0.03 + 0.28 * r()) * h;
  const hx = x0 + 0.9 * w * 0.45 * p, hy = y0 + 0.42 * w * 0.45 * p;
  const grad = g.createLinearGradient(hx, hy, hx - 126, hy - 59);
  grad.addColorStop(0, color(1 - p));
  grad.addColorStop(1, color(0));
  g.strokeStyle = grad; g.lineWidth = step * 1.1; g.lineCap = 'round';
  g.beginPath(); g.moveTo(hx, hy); g.lineTo(hx - 126, hy - 59); g.stroke();
}

function nightSky(g, t, w, h) {
  const haze = g.createLinearGradient(0, h * 0.5, 0, h);
  haze.addColorStop(0, W(0)); haze.addColorStop(1, W(0.18));
  g.fillStyle = haze; g.fillRect(0, 0, w, h);
  for (const s of STARS) {
    g.fillStyle = W(s.s * (0.3 + 0.7 * (0.5 + 0.5 * Math.sin(t * s.sp + s.ph))));
    circle(g, s.x * w, s.y * h, step * 0.85);
  }
  g.save(); g.translate(w * 0.5, h * 0.45); g.rotate(-0.5);
  const band = g.createLinearGradient(0, -h * 0.16, 0, h * 0.16);
  band.addColorStop(0, W(0)); band.addColorStop(0.5, W(0.2)); band.addColorStop(1, W(0));
  g.fillStyle = band; g.fillRect(-w, -h * 0.16, w * 2, h * 0.32); g.restore();
  const mx = w * 0.84, my = h * 0.2, mr = Math.max(34, w * 0.035);
  const glow = g.createRadialGradient(mx, my, mr * 0.8, mx, my, mr * 5);
  glow.addColorStop(0, W(0.3)); glow.addColorStop(1, W(0));
  g.fillStyle = glow; g.fillRect(mx - mr * 5, my - mr * 5, mr * 10, mr * 10);
  g.fillStyle = W(0.95); circle(g, mx, my, mr);
  g.fillStyle = 'rgba(0,0,0,.35)'; circle(g, mx - mr * 0.3, my - mr * 0.2, mr * 0.28); circle(g, mx + mr * 0.35, my + mr * 0.3, mr * 0.2);
  streak(g, t, w, h, 3.8, 3, W);
  g.fillStyle = '#000'; g.beginPath(); g.moveTo(0, h);
  for (let x = 0; x <= w + 20; x += 20) g.lineTo(x, h * 0.87 - Math.sin(x / w * 5.2 + 1) * h * 0.04 - Math.sin(x / w * 13) * h * 0.015);
  g.lineTo(w, h); g.fill();
}

const JELLIES = [0.08, 0.9, 0.2, 0.78, 0.03, 0.96].map((x, i) => ({ x, warm: i === 2, off: i / 6 + R() * 0.08, size: 48 + R() * 44, ph: R() * 7, sp: 0.018 + R() * 0.016 }));
const BUBBLES = Array.from({ length: 40 }, () => ({ x: R(), off: R(), sp: 0.03 + R() * 0.05, s: 0.4 + R() * 0.6 }));

function deepSea(g, t, w, h) {
  for (let i = 0; i < 3; i++) {
    const x = w * (0.15 + 0.35 * i) + Math.sin(t * 0.15 + i) * w * 0.04;
    const grad = g.createLinearGradient(0, 0, 0, h * 0.85);
    grad.addColorStop(0, W(0.17)); grad.addColorStop(1, W(0));
    g.fillStyle = grad; g.beginPath();
    g.moveTo(x - 30, 0); g.lineTo(x + 30, 0); g.lineTo(x + 180, h * 0.85); g.lineTo(x + 40, h * 0.85); g.fill();
  }
  for (const b of BUBBLES) {
    g.fillStyle = W(0.5 * b.s);
    circle(g, b.x * w + Math.sin(t + b.off * 9) * 12, h * (1.05 - ((t * b.sp + b.off) % 1.1)), step * 0.5);
  }
  for (const j of JELLIES) {
    const size = j.size * fit(w), pulse = 0.5 + 0.5 * Math.sin(t * 1.7 + j.ph);
    const x = j.x * w + Math.sin(t * 0.4 + j.ph) * w * 0.02, y = h * (1.25 - ((t * j.sp + j.off * 1.5) % 1.5));
    const rx = size * (1 - 0.12 * pulse), ry = size * 0.75 * (1 + 0.12 * pulse), len = size * 2.8 * (1 - 0.15 * pulse);
    const ink = j.warm ? A : W;
    const fade = g.createLinearGradient(0, y, 0, y + len);
    fade.addColorStop(0, ink(0.55)); fade.addColorStop(1, ink(0));
    g.strokeStyle = fade; g.lineWidth = step * 0.7;
    for (let k = 0; k <= 6; k++) {
      const bx = x - rx * 0.8 + rx * 1.6 * k / 6;
      g.beginPath(); g.moveTo(bx, y);
      for (let s = 1; s <= 10; s++) g.lineTo(bx + Math.sin(t * 2 + k + s * 0.6) * size * 0.012 * s, y + len * s / 10);
      g.stroke();
    }
    const bell = g.createRadialGradient(x, y - ry * 0.4, 0, x, y - ry * 0.4, ry * 1.3);
    bell.addColorStop(0, ink(0.95)); bell.addColorStop(1, ink(0.3));
    g.fillStyle = bell; g.beginPath();
    g.ellipse(x, y, rx, ry, 0, Math.PI, TAU); g.quadraticCurveTo(x, y - ry * 0.15, x - rx, y); g.fill();
  }
}

const SCHOOL = Array.from({ length: 22 }, () => ({ ox: (R() - 0.5) * 340, oy: (R() - 0.5) * 150, ph: R() * 7, len: 34 + R() * 18 }));
const KOI = Array.from({ length: 4 }, (_, i) => ({ off: i / 4 + R() * 0.1, y: 0.18 + R() * 0.62, sp: 0.012 + R() * 0.008, ph: R() * 7, len: 56 + R() * 24 }));
const KELP = Array.from({ length: 14 }, () => ({ x: R(), hgt: 0.16 + R() * 0.24, ph: R() * 7 }));

function fish(g, x, y, len, angle, wag, color) {
  g.save(); g.translate(x, y); g.rotate(angle); g.fillStyle = color;
  g.beginPath(); g.ellipse(0, 0, len * 0.5, len * 0.2, 0, 0, TAU); g.fill();
  g.beginPath(); g.moveTo(-len * 0.4, 0);
  g.lineTo(-len * 0.74, -len * 0.22 + wag * len * 0.1); g.lineTo(-len * 0.74, len * 0.22 + wag * len * 0.1); g.fill();
  g.restore();
}

function reef(g, t, w, h) {
  const floor = g.createLinearGradient(0, h * 0.8, 0, h);
  floor.addColorStop(0, W(0)); floor.addColorStop(1, W(0.15));
  g.fillStyle = floor; g.fillRect(0, 0, w, h);
  g.strokeStyle = W(0.3); g.lineWidth = step * 1.2; g.lineCap = 'round';
  for (const k of KELP) {
    const sway = Math.sin(t * 0.6 + k.ph);
    g.beginPath(); g.moveTo(k.x * w, h);
    g.quadraticCurveTo(k.x * w - sway * 20, h * (1 - k.hgt / 2), k.x * w + sway * 30, h * (1 - k.hgt)); g.stroke();
  }
  const s = fit(w);
  const schools = [
    { cx: ((t * 0.04) % 1.5 - 0.25) * w, cy: h * (0.32 + 0.1 * Math.sin(t * 0.35)), dir: 0 },
    { cx: w - (((t * 0.03) + 0.6) % 1.5 - 0.25) * w, cy: h * (0.66 + 0.06 * Math.sin(t * 0.3)), dir: Math.PI },
  ];
  for (const sc of schools) {
    for (const f of SCHOOL) {
      fish(g, sc.cx + f.ox * s + Math.sin(t * 0.9 + f.ph) * 10, sc.cy + f.oy * s + Math.cos(t * 0.7 + f.ph) * 8,
        f.len * s, sc.dir + 0.12 * Math.cos(t * 0.35), Math.sin(t * 9 + f.ph), W(0.85));
    }
  }
  for (const k of KOI) {
    fish(g, (((t * k.sp + k.off) % 1.3) - 0.15) * w, k.y * h + Math.sin(t * 0.5 + k.ph) * 20,
      k.len * s, 0.1 * Math.cos(t * 0.5 + k.ph), Math.sin(t * 4 + k.ph), A(0.9));
  }
}

// Long-neck dinosaur in local units: ground at y = 0, facing +x, ~380 units tall.
function sauropod(g, x, y, s, t) {
  g.save(); g.translate(x, y); g.scale(-s, s);
  g.fillStyle = g.strokeStyle = '#000'; g.lineCap = 'round';
  [[70, 0], [-70, Math.PI], [90, Math.PI], [-50, 0]].forEach(([hx, ph]) => {
    g.save(); g.translate(hx, -140); g.rotate(Math.sin(t * 1.6 + ph) * 0.16);
    g.fillRect(-17, 0, 34, 142); g.restore();
  });
  g.beginPath(); g.ellipse(0, -150, 122, 60, 0, 0, TAU); g.fill();
  const bob = Math.sin(t * 3.2) * 4;
  g.lineWidth = 54; g.beginPath(); g.moveTo(80, -170); g.quadraticCurveTo(130, -195, 150, -235 + bob / 2); g.stroke();
  g.lineWidth = 28; g.beginPath(); g.moveTo(140, -215); g.quadraticCurveTo(185, -260, 212, -360 + bob); g.stroke();
  g.beginPath(); g.ellipse(228, -364 + bob, 30, 15, 0.2, 0, TAU); g.fill();
  const flick = Math.sin(t * 1.2) * 10;
  g.lineWidth = 36; g.beginPath(); g.moveTo(-90, -160); g.quadraticCurveTo(-160, -160, -220, -130); g.stroke();
  g.lineWidth = 16; g.beginPath(); g.moveTo(-210, -133); g.quadraticCurveTo(-290, -110, -350, -50 + flick); g.stroke();
  g.restore();
}

function dusk(g, t, w, h, local) {
  const horizon = h * 0.8;
  const sky = g.createLinearGradient(0, 0, 0, horizon);
  sky.addColorStop(0, A(0.04)); sky.addColorStop(0.5, A(0.3)); sky.addColorStop(1, A(0.95));
  g.fillStyle = sky; g.fillRect(0, 0, w, horizon);
  const sx = w * 0.28, sr = h * 0.14;
  const sun = g.createRadialGradient(sx, horizon, sr * 0.7, sx, horizon, sr * 2.4);
  sun.addColorStop(0, A(1)); sun.addColorStop(1, A(0));
  g.fillStyle = sun; g.fillRect(sx - sr * 2.4, horizon - sr * 2.4, sr * 4.8, sr * 2.4);
  g.fillStyle = A(1); circle(g, sx, horizon, sr * 0.7);
  streak(g, t, w, h, 5.2, 11, A);
  g.fillStyle = '#000'; g.beginPath(); g.moveTo(0, h);
  for (let x = 0; x <= w + 20; x += 20) g.lineTo(x, horizon - Math.max(0, Math.sin(x / w * 7 + 2)) * h * 0.025);
  g.lineTo(w, h); g.fill();
  g.fillStyle = A(0.22); g.fillRect(0, horizon + step, w, step);
  sauropod(g, w * 0.84 - local * 12, horizon + step * 0.5, (h * 0.34) / 380, t);
}

const SCENES = [dusk, nightSky, deepSea, reef];
