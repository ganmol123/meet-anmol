// Animated dot-field backdrop. Each scene is drawn with plain canvas calls into a
// tiny offscreen buffer (one pixel per dot); every dot then takes its size from
// the brightness under it. Scenes cross-fade on a loop, the cursor carves a
// hollow, and dots behind the content column stay quiet so text reads cleanly.
const canvas = document.querySelector('#landscape');
const ctx = canvas.getContext('2d');
const motion = matchMedia('(prefers-reduced-motion: reduce)');
const finePointer = matchMedia('(pointer: fine)');

const SCENE_MS = 16000;
const FADE_MS = 2600;
const LEVELS = 6;
const COOL = '200,206,214';
const WARM = '226,158,98';

let width = 0, height = 0, step = 9, cols = 0, rows = 0, count = 0;
let dotX, dotY, quiet;
let raf, startTime = performance.now();
const pointer = { x: 0, y: 0, active: false };
const blob = { x: 0, y: 0, r: 0 };
const buckets = Array.from({ length: LEVELS * 2 }, () => []);
const colors = buckets.map((_, i) => {
  const level = i % LEVELS;
  const alpha = 0.13 + 0.87 * Math.pow((level + 0.5) / LEVELS, 0.85);
  return `rgba(${i < LEVELS ? COOL : WARM},${alpha.toFixed(3)})`;
});
// Text the field fades out behind, measured every frame so it follows scrolling.
const TEXT = 'nav, h1, h2, h3, main p, .tags, .project-index, .highlights li, .earlier h3, .button, .text-link, footer';
let textBlocks = [];
const buffers = [0, 1, 2].map(() => {
  const c = document.createElement('canvas');
  return { c, g: c.getContext('2d', { willReadFrequently: true }) };
});

const smooth = (a, b, x) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };

// ---- Rendering
function paint(buffer, scene, t, local) {
  const g = buffer.g;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.fillStyle = '#000'; g.fillRect(0, 0, cols, rows);
  g.setTransform(1 / step, 0, 0, 1 / step, 0, 0);
  scene(g, t, width, height, local);
  return g.getImageData(0, 0, cols, rows).data;
}

// Soft dark pads under each visible text block: outer, middle, inner rings.
// Opaque greys drawn level by level, so overlaps take the max instead of stacking.
function textMask() {
  const g = buffers[2].g;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.fillStyle = '#000'; g.fillRect(0, 0, cols, rows);
  g.setTransform(1 / step, 0, 0, 1 / step, 0, 0);
  const rects = [];
  for (const el of textBlocks) {
    const r = el.getBoundingClientRect();
    if (r.bottom > -40 && r.top < height + 40 && r.width) rects.push(r);
  }
  for (const [pad, grey] of [[38, 115], [20, 180], [6, 215]]) {
    g.fillStyle = `rgb(${grey},${grey},${grey})`;
    for (const r of rects) g.fillRect(r.left - pad, r.top - pad, r.width + pad * 2, r.height + pad * 2);
  }
  return g.getImageData(0, 0, cols, rows).data;
}

function resize() {
  const bounds = canvas.getBoundingClientRect();
  width = bounds.width; height = bounds.height;
  const dpr = Math.min(devicePixelRatio || 1, 2);
  canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  step = width < 700 ? 8 : 9;
  cols = Math.ceil(width / step); rows = Math.ceil(height / step); count = cols * rows;
  for (const b of buffers) { b.c.width = cols; b.c.height = rows; }
  dotX = new Float32Array(count); dotY = new Float32Array(count); quiet = new Float32Array(count);
  // Content sits in a centred column: dim the field there, keep the edges lively.
  const half = Math.min(width * 0.44, 500);
  for (let i = 0; i < count; i++) {
    dotX[i] = (i % cols + 0.5) * step; dotY[i] = (Math.floor(i / cols) + 0.5) * step;
    quiet[i] = width < 700 ? 0.8 : 0.6 + 0.4 * smooth(half * 0.3, half * 0.95, Math.abs(dotX[i] - width / 2));
  }
  cancelAnimationFrame(raf);
  render(performance.now());
}

function updateBlob() {
  const target = pointer.active ? 42 + Math.min(14, Math.hypot(pointer.x - blob.x, pointer.y - blob.y) * 0.3) : 0;
  if (blob.r < 1 && pointer.active) { blob.x = pointer.x; blob.y = pointer.y; }
  blob.x += (pointer.x - blob.x) * 0.16; blob.y += (pointer.y - blob.y) * 0.16;
  blob.r += (target - blob.r) * 0.1;
}

function render(now) {
  raf = undefined;
  if (!count) return;
  const still = motion.matches;
  const elapsed = still ? FADE_MS + 6000 : now - startTime + FADE_MS;
  const index = Math.floor(elapsed / SCENE_MS), into = elapsed - index * SCENE_MS;
  const fadeStart = SCENE_MS - FADE_MS;
  const mix = into > fadeStart ? smooth(0, 1, (into - fadeStart) / FADE_MS) : 0;
  const t = elapsed / 1000;
  const a = paint(buffers[0], SCENES[index % SCENES.length], t, (into + FADE_MS) / 1000);
  const b = mix > 0 ? paint(buffers[1], SCENES[(index + 1) % SCENES.length], t, (into - fadeStart) / 1000) : null;
  if (!textBlocks.length) textBlocks = [...document.querySelectorAll(TEXT)];
  const mask = textMask();
  if (!still) updateBlob();
  draw(a, b, mix, mask, t, still ? 0 : blob.r);
  canvas.classList.add('ready');
  if (!still) wake();
}

function draw(a, b, mix, mask, t, hollow) {
  for (const list of buckets) list.length = 0;
  const base = 0.55, max = step * 0.42;
  for (let i = 0, p = 0; i < count; i++, p += 4) {
    let r = a[p], g = a[p + 1], bl = a[p + 2];
    if (b) { r += (b[p] - r) * mix; g += (b[p + 1] - g) * mix; bl += (b[p + 2] - bl) * mix; }
    const v = Math.pow(Math.max(r, g, bl) / 255, 0.75) * quiet[i] * (1 - mask[p] / 255);
    let x = dotX[i], y = dotY[i], scale = 1;
    // Cursor lens: dots near the pointer spread outward and shrink toward the centre.
    if (hollow > 1) {
      const dx = x - blob.x, dy = y - blob.y, d2 = dx * dx + dy * dy, reach = hollow * 2.2;
      if (d2 < reach * reach) {
        const d = Math.sqrt(d2) || 1, k = 1 - d / reach, push = k * k * hollow * 0.5;
        x += dx / d * push; y += dy / d * push;
        scale = 0.2 + 0.8 * smooth(0, reach * 0.8, d);
      }
    }
    const radius = (base + v * (max - base)) * scale;
    if (radius < 0.3) continue;
    const level = Math.min(LEVELS - 1, (v * LEVELS) | 0);
    buckets[(r - bl > 45 ? LEVELS : 0) + level].push(x, y, radius);
  }
  ctx.clearRect(0, 0, width, height);
  buckets.forEach((list, k) => {
    if (!list.length) return;
    ctx.fillStyle = colors[k]; ctx.beginPath();
    for (let j = 0; j < list.length; j += 3) { ctx.moveTo(list[j] + list[j + 2], list[j + 1]); ctx.arc(list[j], list[j + 1], list[j + 2], 0, TAU); }
    ctx.fill();
  });
}

function wake() {
  if (!raf && !document.hidden) raf = requestAnimationFrame(render);
}

window.addEventListener('pointermove', event => {
  if (!finePointer.matches) return;
  pointer.x = event.clientX; pointer.y = event.clientY; pointer.active = true;
});
document.documentElement.addEventListener('pointerleave', () => { pointer.active = false; });
motion.addEventListener('change', () => { startTime = performance.now(); wake(); render(performance.now()); });
addEventListener('scroll', () => { if (motion.matches) render(performance.now()); }, { passive: true });
document.addEventListener('visibilitychange', () => {
  cancelAnimationFrame(raf); raf = undefined;
  if (!document.hidden && !motion.matches) wake();
});
new ResizeObserver(resize).observe(canvas.parentElement);
