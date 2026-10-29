// The page behind the chart probes (plan-charts, phase 0). Everything is built here, in plain
// JS, so the three engines run the same code and no dev server stands between the probe and
// the measurement. `window.probe` is what the spec calls.
'use strict';

const SERIES = 8;
const POINTS = 60_480; // a week at one reading per ten seconds
const T0 = Date.UTC(2026, 9, 19, 0, 0, 0);
const STEP = 10_000;
const WIDTH = 1400;
const HEIGHT = 500;
const COLORS = ['#2A78D6', '#EB6834', '#1BAF7A', '#EDA100', '#E87BA4', '#008300', '#6250D6', '#E34948'];

// A seeded generator, so every engine draws the same data.
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeData() {
  const out = [];
  for (let k = 0; k < SERIES; k++) {
    const r = rng(1000 + k);
    const xs = new Float64Array(POINTS);
    const ys = new Float64Array(POINTS);
    let v = 20 + k * 3;
    for (let i = 0; i < POINTS; i++) {
      xs[i] = T0 + i * STEP;
      v += (r() - 0.5) * 0.4;
      ys[i] = v;
    }
    // One gap per series: the device did not answer for 50 minutes.
    for (let i = 20_000 + k * 1000; i < 20_300 + k * 1000; i++) ys[i] = NaN;
    out.push({ xs, ys });
  }
  return out;
}

const DATA = makeData();
const SPAN = (POINTS - 1) * STEP;

// First index whose x is >= v.
function lowerBound(xs, v) {
  let lo = 0;
  let hi = xs.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (xs[mid] < v) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

// Decimation to the pixel: per column of pixels the first, the lowest, the highest and the last
// reading, in the order they were taken; a gap (NaN) survives as a NaN; one reading beyond each
// edge of the window is kept, so a line enters from the edge.
const OUT_X = new Float64Array(WIDTH * 4 + 8);
const OUT_Y = new Float64Array(WIDTH * 4 + 8);
function decimate(xs, ys, from, to, width) {
  const n = xs.length;
  let i0 = lowerBound(xs, from) - 1;
  if (i0 < 0) i0 = 0;
  let i1 = lowerBound(xs, to);
  if (i1 > n - 1) i1 = n - 1;
  const scale = width / (to - from);
  let count = 0;
  let col = -2;
  let first = -1, lo = -1, hi = -1, last = -1;
  const flush = () => {
    if (first < 0) return;
    const picks = [first, lo, hi, last].sort((a, b) => a - b);
    let prev = -1;
    for (const p of picks) {
      if (p === prev) continue;
      prev = p;
      OUT_X[count] = xs[p];
      OUT_Y[count] = ys[p];
      count++;
    }
    first = lo = hi = last = -1;
  };
  for (let i = i0; i <= i1; i++) {
    const y = ys[i];
    if (y !== y) {
      flush();
      if (count > 0 && OUT_Y[count - 1] === OUT_Y[count - 1]) {
        OUT_X[count] = xs[i];
        OUT_Y[count] = NaN;
        count++;
      }
      col = -2;
      continue;
    }
    let c = Math.floor((xs[i] - from) * scale);
    if (c < -1) c = -1;
    if (c > width) c = width;
    if (c !== col) {
      flush();
      col = c;
      first = lo = hi = last = i;
    } else {
      if (y < ys[lo]) lo = i;
      if (y > ys[hi]) hi = i;
      last = i;
    }
  }
  flush();
  return count;
}

// The same algorithm over an array of [x, y] pairs, for the comparison in P2.
function decimatePairs(points, from, to, width) {
  const n = points.length;
  let a = 0, b = n;
  while (a < b) { const m = (a + b) >>> 1; if (points[m][0] < from) a = m + 1; else b = m; }
  let i0 = Math.max(0, a - 1);
  a = 0; b = n;
  while (a < b) { const m = (a + b) >>> 1; if (points[m][0] < to) a = m + 1; else b = m; }
  const i1 = Math.min(n - 1, a);
  const out = [];
  const scale = width / (to - from);
  let col = -2, first = null, lo = null, hi = null, last = null;
  const flush = () => {
    if (!first) return;
    const picks = [...new Set([first, lo, hi, last])].sort((p, q) => p[0] - q[0]);
    for (const p of picks) out.push(p);
    first = lo = hi = last = null;
  };
  for (let i = i0; i <= i1; i++) {
    const p = points[i];
    if (p[1] === null) { flush(); out.push(p); col = -2; continue; }
    const c = Math.max(-1, Math.min(width, Math.floor((p[0] - from) * scale)));
    if (c !== col) { flush(); col = c; first = lo = hi = last = p; }
    else { if (p[1] < lo[1]) lo = p; if (p[1] > hi[1]) hi = p; last = p; }
  }
  flush();
  return out.length;
}


// A min/max pyramid built once per change of data: level k holds, for every run of 2^k
// readings, the index of the lowest and of the highest and whether the run holds a gap. A frame
// then reads the level whose runs are under half a column, so its cost follows the pixels.
function buildPyramid(xs, ys) {
  const levels = [];
  let n = xs.length;
  let lo = null, hi = null, gap = null;
  for (let k = 1; (1 << k) <= n; k++) {
    const size = Math.ceil(n / (1 << k));
    const L = new Int32Array(size), H = new Int32Array(size), G = new Uint8Array(size);
    for (let b = 0; b < size; b++) {
      let l = -1, h = -1, g = 0;
      if (k === 1) {
        for (let i = b * 2; i < Math.min(n, b * 2 + 2); i++) {
          const y = ys[i];
          if (y !== y) { g = 1; continue; }
          if (l < 0 || y < ys[l]) l = i;
          if (h < 0 || y > ys[h]) h = i;
        }
      } else {
        for (let c = b * 2; c < Math.min(lo.length, b * 2 + 2); c++) {
          if (gap[c]) g = 1;
          const cl = lo[c], ch = hi[c];
          if (cl >= 0 && (l < 0 || ys[cl] < ys[l])) l = cl;
          if (ch >= 0 && (h < 0 || ys[ch] > ys[h])) h = ch;
        }
      }
      L[b] = l; H[b] = h; G[b] = g;
    }
    levels.push({ k, L, H, G });
    lo = L; hi = H; gap = G;
  }
  return levels;
}

// The decimation of chart/src/model/decimate.ts (phase 1), ported: a run of the pyramid that
// lies in one column and holds no gap gives its first reading, its extremes and its last; any
// other splits into its halves, down to single readings. Exact: the same output as the scan.
function decimateExact(xs, ys, levels, from, to, width) {
  const n = xs.length;
  const i0 = Math.max(0, lowerBound(xs, from) - 1);
  const i1 = Math.min(n - 1, lowerBound(xs, to));
  const scale = width / (to - from);
  let count = 0, column = NaN, first = -1, lo = -1, hi = -1, last = -1;
  const flush = () => {
    if (first < 0) return;
    const picks = [first, lo, hi, last].sort((a, b) => a - b);
    for (let p = 0; p < 4; p++) {
      if (p > 0 && picks[p] === picks[p - 1]) continue;
      OUT_X[count] = xs[picks[p]]; OUT_Y[count] = ys[picks[p]]; count++;
    }
    first = -1;
  };
  const columnOf = (i) => Math.floor((xs[i] - from) * scale);
  const visit = (i) => {
    const y = ys[i];
    if (y !== y) {
      flush();
      if (count > 0 && OUT_Y[count - 1] === OUT_Y[count - 1]) { OUT_X[count] = xs[i]; OUT_Y[count] = NaN; count++; }
      column = NaN;
      return;
    }
    const c = columnOf(i);
    if (c !== column || first < 0) { flush(); column = c; first = lo = hi = last = i; return; }
    if (y < ys[lo]) lo = i;
    if (y > ys[hi]) hi = i;
    last = i;
  };
  const run = (k, b) => {
    const size = 2 ** k;
    const st = Math.max(i0 + 1, b * size);
    const en = Math.min(i1 - 1, (b + 1) * size - 1);
    if (st > en) return;
    if (k === 0) return visit(st);
    const level = levels[k - 1];
    if (st === b * size && en === (b + 1) * size - 1 && !level.G[b] && columnOf(st) === columnOf(en)) {
      const l = level.L[b], h = level.H[b];
      visit(st); visit(Math.min(l, h)); visit(Math.max(l, h)); visit(en);
      return;
    }
    run(k - 1, 2 * b);
    run(k - 1, 2 * b + 1);
  };
  const perColumn = (i1 - i0 + 1) / width;
  const k = Math.max(0, Math.min(levels.length, Math.floor(Math.log2(perColumn / 2))));
  visit(i0);
  for (let b = Math.floor((i0 + 1) / 2 ** k); b <= Math.floor((i1 - 1) / 2 ** k); b++) run(k, b);
  if (i1 > i0) visit(i1);
  flush();
  return count;
}
const decimatePyramid = (xs, ys, levels, from, to, width) => decimateExact(xs, ys, levels, from, to, width);

const PYRAMIDS = DATA.map(({ xs, ys }) => buildPyramid(xs, ys));

function extentOf(count) {
  let min = Infinity, max = -Infinity;
  for (let i = 0; i < count; i++) {
    const y = OUT_Y[i];
    if (y < min) min = y;
    if (y > max) max = y;
  }
  if (min === max) { min -= 1; max += 1; }
  return [min, max];
}

function pathOf(count, from, to, min, max) {
  const sx = WIDTH / (to - from);
  const sy = HEIGHT / (max - min);
  let d = '';
  let move = true;
  for (let i = 0; i < count; i++) {
    const y = OUT_Y[i];
    if (y !== y) { move = true; continue; }
    const px = ((OUT_X[i] - from) * sx).toFixed(1);
    const py = ((max - y) * sy).toFixed(1);
    d += (move ? 'M' : 'L') + px + ' ' + py;
    move = false;
  }
  return d;
}

function pathOfInt(count, from, to, min, max) {
  const sx = WIDTH / (to - from);
  const sy = HEIGHT / (max - min);
  const parts = [];
  let move = true, lx = NaN, ly = NaN;
  for (let i = 0; i < count; i++) {
    const y = OUT_Y[i];
    if (y !== y) { move = true; continue; }
    const px = Math.round((OUT_X[i] - from) * sx);
    const py = Math.round((max - y) * sy);
    if (!move && px === lx && py === ly) continue; // the same pixel twice draws nothing
    parts.push((move ? 'M' : 'L') + px + ' ' + py);
    lx = px; ly = py;
    move = false;
  }
  return parts.join('');
}

function drawCanvas(ctx, count, from, to, min, max, color) {
  const sx = WIDTH / (to - from);
  const sy = HEIGHT / (max - min);
  ctx.beginPath();
  let move = true;
  for (let i = 0; i < count; i++) {
    const y = OUT_Y[i];
    if (y !== y) { move = true; continue; }
    const px = (OUT_X[i] - from) * sx;
    const py = (max - y) * sy;
    if (move) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    move = false;
  }
  ctx.strokeStyle = color;
  ctx.stroke();
}

const SVG = 'http://www.w3.org/2000/svg';
function stage(mode) {
  const host = document.getElementById('stage');
  host.textContent = '';
  if (mode === 'canvas') {
    const c = document.createElement('canvas');
    const dpr = devicePixelRatio;
    c.width = WIDTH * dpr;
    c.height = HEIGHT * dpr;
    c.style.width = WIDTH + 'px';
    c.style.height = HEIGHT + 'px';
    host.append(c);
    const ctx = c.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    return { ctx };
  }
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('width', String(WIDTH));
  svg.setAttribute('height', String(HEIGHT));
  const g = document.createElementNS(SVG, 'g');
  svg.append(g);
  const paths = COLORS.map((color) => {
    const p = document.createElementNS(SVG, 'path');
    p.setAttribute('stroke', color);
    if (mode === 'svg-transform') p.setAttribute('vector-effect', 'non-scaling-stroke');
    g.append(p);
    return p;
  });
  const ticks = [];
  for (let i = 0; i < 10; i++) {
    const t = document.createElementNS(SVG, 'text');
    t.setAttribute('y', String(HEIGHT - 4));
    svg.append(t);
    ticks.push(t);
  }
  host.append(svg);
  if (mode === 'labels-promoted' || mode === 'layer-transform') svg.style.willChange = 'transform';
  if (mode === 'labels-split' || mode === 'labels-promoted') {
    const labels = document.createElementNS(SVG, 'svg');
    labels.setAttribute('width', String(WIDTH));
    labels.setAttribute('height', String(HEIGHT));
    for (const t of ticks) labels.append(t);
    host.append(labels);
  }
  let cursor = null;
  if (mode === 'cursor-transform') {
    // An HTML line on its own compositor layer, moved by a transform alone.
    const line = document.createElement('div');
    line.style.cssText = 'position:absolute;top:0;left:0;width:0;height:' + HEIGHT + 'px;border-left:1px dashed #333;will-change:transform';
    host.append(line);
    return { svg, g, paths, ticks, cursor: null, line };
  }
  if (mode === 'cursor-inline' || mode === 'cursor-overlay' || mode === 'cursor-promoted') {
    let layer = svg;
    if (mode === 'cursor-overlay' || mode === 'cursor-promoted') {
      layer = document.createElementNS(SVG, 'svg');
      layer.setAttribute('width', String(WIDTH));
      layer.setAttribute('height', String(HEIGHT));
      if (mode === 'cursor-promoted') layer.style.willChange = 'transform';
      host.append(layer);
    }
    cursor = document.createElementNS(SVG, 'line');
    cursor.setAttribute('y1', '0');
    cursor.setAttribute('y2', String(HEIGHT));
    cursor.setAttribute('stroke', '#333');
    cursor.setAttribute('stroke-dasharray', '4 4');
    layer.append(cursor);
  }
  return { svg, g, paths, ticks, cursor };
}

// The window at phase t of a pinch: the whole week narrows to an hour around a point at 70% and
// widens back, the anchor drifting the way two fingers drift.
function windowAt(t) {
  const k = (1 - Math.cos(t * 2 * Math.PI)) / 2; // 0 → 1 → 0
  const span = SPAN * Math.pow(3_600_000 / SPAN, k);
  const anchor = T0 + SPAN * (0.7 + 0.05 * Math.sin(t * 6 * Math.PI));
  let from = anchor - span * 0.7;
  if (from < T0) from = T0;
  if (from + span > T0 + SPAN) from = T0 + SPAN - span;
  return [from, from + span];
}

const fmt = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Warsaw' });

function quantile(xs, q) {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(q * s.length))];
}

function pinch(mode, seconds = 3) {
  const s = stage(mode);
  const work = [];
  const stamps = [];
  let maxPoints = 0;
  if (mode === 'svg-transform' || mode === 'svg-static' || mode.startsWith('cursor-') || mode.startsWith('labels-') || mode === 'layer-transform') {
    // Paths drawn once for the whole week; the gesture only moves the group.
    for (let k = 0; k < SERIES; k++) {
      const n = decimate(DATA[k].xs, DATA[k].ys, T0, T0 + SPAN, WIDTH);
      const [min, max] = extentOf(n);
      s.paths[k].setAttribute('d', pathOf(n, T0, T0 + SPAN, min, max));
      maxPoints += n;
    }
  }
  return new Promise((resolve) => {
    let start = -1;
    const frame = (now) => {
      if (start < 0) start = now;
      const t = (now - start) / (seconds * 1000);
      stamps.push(now);
      if (t >= 1) {
        const intervals = stamps.slice(1).map((v, i) => v - stamps[i]);
        resolve({
          mode,
          frames: stamps.length - 1,
          seconds: (stamps[stamps.length - 1] - stamps[0]) / 1000,
          fps: +((stamps.length - 1) / ((stamps[stamps.length - 1] - stamps[0]) / 1000)).toFixed(1),
          workP50: +quantile(work, 0.5).toFixed(2),
          workP95: +quantile(work, 0.95).toFixed(2),
          intervalP50: +quantile(intervals, 0.5).toFixed(2),
          intervalP95: +quantile(intervals, 0.95).toFixed(2),
          intervalMax: +Math.max(...intervals).toFixed(2),
          maxPoints,
        });
        return;
      }
      const w0 = performance.now();
      const [from, to] = windowAt(t);
      if (mode === 'idle') {
        // nothing: the rAF cadence this machine gives a page with nothing to draw
      } else if (mode.startsWith('cursor-')) {
        // the cursor follows a pointer across the plot; the data stands still
        const x = (Math.sin(t * 4 * Math.PI) * 0.45 + 0.5) * WIDTH;
        if (s.line) s.line.style.transform = `translateX(${x.toFixed(1)}px)`;
        else {
          s.cursor.setAttribute('x1', x.toFixed(1));
          s.cursor.setAttribute('x2', x.toFixed(1));
        }
      } else if (mode === 'labels-split' || mode === 'labels-promoted') {
        // the paths stand still in their own <svg>; every label of the other one changes
        for (let i = 0; i < s.ticks.length; i++) {
          s.ticks[i].setAttribute('x', String(((i + 0.5) * WIDTH) / s.ticks.length));
          s.ticks[i].textContent = fmt.format(from + ((to - from) * (i + 0.5)) / s.ticks.length);
        }
      } else if (mode === 'layer-transform') {
        // the week drawn once; the gesture scales and moves the promoted layer on the compositor
        const sx = SPAN / (to - from);
        const tx = (-(from - T0) / SPAN) * WIDTH * sx;
        s.svg.style.transformOrigin = '0 0';
        s.svg.style.transform = `translateX(${tx.toFixed(2)}px) scaleX(${sx.toFixed(5)})`;
      } else if (mode === 'svg-static') {
        // the paths stand still; the frame only moves one tick label
        s.ticks[0].textContent = fmt.format(from);
      } else if (mode.startsWith('svg-pyramid') || mode === 'svg') {
        let pts = 0;
        const perPx = mode === 'svg-pyramid-2' ? 2 : 4;
        for (let k = 0; k < SERIES; k++) {
          const n = mode === 'svg' ? decimate(DATA[k].xs, DATA[k].ys, from, to, WIDTH) : decimatePyramid(DATA[k].xs, DATA[k].ys, PYRAMIDS[k], from, to, WIDTH, perPx);
          const [min, max] = extentOf(n);
          s.paths[k].setAttribute('d', mode === 'svg-pyramid-int' ? pathOfInt(n, from, to, min, max) : pathOf(n, from, to, min, max));
          pts += n;
        }
        for (let i = 0; i < s.ticks.length; i++) {
          const at = from + ((to - from) * (i + 0.5)) / s.ticks.length;
          s.ticks[i].setAttribute('x', String(((i + 0.5) * WIDTH) / s.ticks.length));
          s.ticks[i].textContent = fmt.format(at);
        }
        if (pts > maxPoints) maxPoints = pts;
      } else if (mode === 'svg-transform') {
        const sx = SPAN / (to - from);
        const tx = (-(from - T0) / SPAN) * WIDTH * sx;
        s.g.setAttribute('transform', `translate(${tx.toFixed(2)} 0) scale(${sx.toFixed(5)} 1)`);
      } else {
        s.ctx.clearRect(0, 0, WIDTH, HEIGHT);
        let pts = 0;
        for (let k = 0; k < SERIES; k++) {
          const n = decimatePyramid(DATA[k].xs, DATA[k].ys, PYRAMIDS[k], from, to, WIDTH, 4);
          const [min, max] = extentOf(n);
          drawCanvas(s.ctx, n, from, to, min, max, COLORS[k]);
          pts += n;
        }
        if (pts > maxPoints) maxPoints = pts;
      }
      work.push(performance.now() - w0);
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  });
}

function median(fn, repeat) {
  const times = [];
  let result;
  for (let r = 0; r < repeat; r++) {
    const t0 = performance.now();
    result = fn();
    times.push(performance.now() - t0);
  }
  return { ms: +quantile(times, 0.5).toFixed(3), result };
}

function decimation() {
  const pairs = DATA.map(({ xs, ys }) => Array.from(xs, (x, i) => [x, ys[i] === ys[i] ? ys[i] : null]));
  const windows = { week: [T0, T0 + SPAN], day: [T0 + SPAN - 86_400_000, T0 + SPAN], hour: [T0 + SPAN - 3_600_000, T0 + SPAN] };
  const rows = [];
  for (const [name, [from, to]] of Object.entries(windows)) {
    const typed = median(() => {
      let pts = 0;
      for (let k = 0; k < SERIES; k++) pts += decimate(DATA[k].xs, DATA[k].ys, from, to, WIDTH);
      return pts;
    }, 30);
    const tuples = median(() => {
      let pts = 0;
      for (let k = 0; k < SERIES; k++) pts += decimatePairs(pairs[k], from, to, WIDTH);
      return pts;
    }, 30);
    const path = median(() => {
      let len = 0;
      for (let k = 0; k < SERIES; k++) {
        const n = decimate(DATA[k].xs, DATA[k].ys, from, to, WIDTH);
        const [min, max] = extentOf(n);
        len += pathOf(n, from, to, min, max).length;
      }
      return len;
    }, 30);
    const pyramid = median(() => {
      let pts = 0;
      for (let k = 0; k < SERIES; k++) pts += decimatePyramid(DATA[k].xs, DATA[k].ys, PYRAMIDS[k], from, to, WIDTH, 4);
      return pts;
    }, 30);
    const pyramidPath = median(() => {
      let len = 0;
      for (let k = 0; k < SERIES; k++) {
        const n = decimatePyramid(DATA[k].xs, DATA[k].ys, PYRAMIDS[k], from, to, WIDTH, 2);
        const [min, max] = extentOf(n);
        len += pathOf(n, from, to, min, max).length;
      }
      return len;
    }, 30);
    const intPath = median(() => {
      let len = 0;
      for (let k = 0; k < SERIES; k++) {
        const n = decimatePyramid(DATA[k].xs, DATA[k].ys, PYRAMIDS[k], from, to, WIDTH, 4);
        const [min, max] = extentOf(n);
        len += pathOfInt(n, from, to, min, max).length;
      }
      return len;
    }, 30);
    rows.push({ window: name, pyramidIntWithPathMs: intPath.ms, pyramidIntPathChars: intPath.result });
    // Fidelity: the pyramid's output equals the scan's, point for point, in fifty random windows.
    let identical = true;
    const r = rng(77);
    for (let t = 0; t < 50 && identical; t++) {
      const a0 = T0 + r() * SPAN, a1 = T0 + r() * SPAN;
      const f = Math.min(a0, a1), g = Math.max(a0, a1) + 60_000;
      for (let k = 0; k < SERIES && identical; k++) {
        const na = decimate(DATA[k].xs, DATA[k].ys, f, g, WIDTH);
        const ax = OUT_X.slice(0, na), ay = OUT_Y.slice(0, na);
        const nb = decimateExact(DATA[k].xs, DATA[k].ys, PYRAMIDS[k], f, g, WIDTH);
        if (na !== nb) identical = false;
        for (let i = 0; i < nb && identical; i++) if (!Object.is(ax[i], OUT_X[i]) || !Object.is(ay[i], OUT_Y[i])) identical = false;
      }
    }
    rows.push({ window: name, pyramidIdenticalToScan: identical });
    // Fidelity: the extremes of the window must survive the pyramid.
    let exact = true;
    for (let k = 0; k < SERIES; k++) {
      const a = decimate(DATA[k].xs, DATA[k].ys, from, to, WIDTH);
      const ea = extentOf(a);
      const b = decimatePyramid(DATA[k].xs, DATA[k].ys, PYRAMIDS[k], from, to, WIDTH, 4);
      const eb = extentOf(b);
      if (ea[0] !== eb[0] || ea[1] !== eb[1]) exact = false;
    }
    rows.push({ window: name, pyramidMs: pyramid.ms, pyramidPoints: pyramid.result, pyramid2WithPathMs: pyramidPath.ms, pyramid2PathChars: pyramidPath.result, extremesExact: exact });
    rows.push({ window: name, typedMs: typed.ms, typedPoints: typed.result, pairsMs: tuples.ms, pairsPoints: tuples.result, withPathMs: path.ms, pathChars: path.result });
  }
  // The copy a mark makes when its data changes: 60,480 rows of a consumer's objects into two
  // typed arrays, for one series.
  const objects = Array.from(DATA[0].xs, (x, i) => ({ at: x, value: DATA[0].ys[i] }));
  const copy = median(() => {
    const xs = new Float64Array(objects.length);
    const ys = new Float64Array(objects.length);
    for (let i = 0; i < objects.length; i++) { xs[i] = objects[i].at; ys[i] = objects[i].value ?? NaN; }
    return xs.length;
  }, 30);
  const build = median(() => buildPyramid(DATA[0].xs, DATA[0].ys).length, 10);
  rows.push({ window: 'pyramid-build-one-series', typedMs: build.ms, levels: build.result });
  rows.push({ window: 'copy-one-series', typedMs: copy.ms, typedPoints: copy.result });
  return rows;
}

const LABELS = ['12:00', '28.10', '1 234,5', '−12,75', 'paź', '2026', '21,4 °C', 'kWh', '00:00', '0,5'];
function textWidths() {
  const svg = document.getElementById('labels');
  svg.textContent = '';
  const nodes = [];
  for (let i = 0; i < 200; i++) {
    const t = document.createElementNS(SVG, 'text');
    t.setAttribute('x', '0');
    t.setAttribute('y', '20');
    t.textContent = LABELS[i % LABELS.length] + (i >= 10 ? ' ' + i : '');
    svg.append(t);
    nodes.push(t);
  }
  const font = getComputedStyle(nodes[0]).font;
  const fontParts = { family: getComputedStyle(nodes[0]).fontFamily, size: getComputedStyle(nodes[0]).fontSize, weight: getComputedStyle(nodes[0]).fontWeight };
  const canvasFont = font || `${fontParts.weight} ${fontParts.size} ${fontParts.family}`;
  const ctx = document.createElement('canvas').getContext('2d');
  ctx.font = canvasFont;
  const measure = median(() => nodes.map((n) => ctx.measureText(n.textContent).width), 20);
  const length = median(() => nodes.map((n) => n.getComputedTextLength()), 20);
  const bbox = median(() => nodes.map((n) => n.getBBox().width), 20);
  const diffs = measure.result.map((w, i) => Math.abs(w - length.result[i]));
  const bboxDiffs = bbox.result.map((w, i) => Math.abs(w - length.result[i]));
  // A change of text forces layout before the next SVG read; canvas does not care.
  const fresh = median(() => {
    for (const n of nodes) n.textContent = n.textContent + '';
    return nodes.map((n) => n.getComputedTextLength());
  }, 5);
  return {
    computedFont: font,
    canvasFont: ctx.font,
    measureTextMs: measure.ms,
    computedTextLengthMs: length.ms,
    bboxMs: bbox.ms,
    freshComputedTextLengthMs: fresh.ms,
    maxDiffPx: +Math.max(...diffs).toFixed(3),
    meanDiffPx: +(diffs.reduce((a, b) => a + b, 0) / diffs.length).toFixed(3),
    maxBboxDiffPx: +Math.max(...bboxDiffs).toFixed(3),
    sample: LABELS.map((l, i) => ({ text: l, measure: +measure.result[i].toFixed(2), length: +length.result[i].toFixed(2) })),
  };
}

const log = [];
function pointerLog(active) {
  for (const id of ['touch', 'free']) attach(document.getElementById(id), active);
}
function attach(el, active) {
  if (active) el.addEventListener('wheel', (e) => { if (e.ctrlKey) e.preventDefault(); }, { passive: false });
  for (const type of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel', 'touchstart', 'touchmove', 'touchend', 'wheel', 'dblclick', 'click']) {
    el.addEventListener(type, (e) => {
      log.push({ on: el.id, scale: visualViewport ? +visualViewport.scale.toFixed(3) : null, type, pointerType: e.pointerType, id: e.pointerId, primary: e.isPrimary, ctrl: e.ctrlKey, scrollY: Math.round(scrollY) });
    }, { passive: true });
  }
}

// Accessibility shapes the chart's focus stop could take; the spec runs axe on each and reads
// the role and name the engine computes.
function a11y() {
  const host = document.getElementById('a11y');
  const img = '<svg aria-hidden="true" width="200" height="60"><path d="M0 50L200 10" stroke="#2A78D6" fill="none"/></svg>';
  host.innerHTML = `
    <div id="vA"><div role="img" tabindex="0" aria-label="Temperature, last 24 hours" aria-describedby="dA">${img}</div><p id="dA" class="sr">From 18.2 to 22.4 °C.</p></div>
    <div id="vB"><figure aria-labelledby="cB" style="margin:0">
        <div role="img" aria-label="Temperature, last 24 hours" aria-describedby="dB">${img}</div>
        <div role="slider" tabindex="0" aria-label="Cursor" aria-orientation="horizontal" aria-valuemin="0" aria-valuemax="86400" aria-valuenow="43200" aria-valuetext="28.10 12:00, Temperature 21.4 °C" style="width:200px;height:20px"></div>
        <figcaption id="cB">Temperature</figcaption><p id="dB" class="sr">From 18.2 to 22.4 °C.</p></figure></div>
    <div id="vC"><div role="application" tabindex="0" aria-label="Temperature, last 24 hours" aria-roledescription="chart">${img}</div></div>
    <div id="vD"><div role="group" tabindex="0" aria-label="Temperature, last 24 hours" aria-roledescription="chart">${img}</div></div>
    <div id="vE"><svg role="img" tabindex="0" aria-labelledby="tE" width="200" height="60"><title id="tE">Temperature, last 24 hours</title><path d="M0 50L200 10" stroke="#2A78D6" fill="none"/></svg></div>
    <div id="vG"><figure aria-labelledby="cG" style="margin:0">
        <div role="img" aria-label="Temperature, last 24 hours" aria-describedby="dG">${img}</div>
        <input type="range" tabindex="0" aria-label="Cursor" min="0" max="86400" value="43200" aria-valuetext="28.10 12:00, Temperature 21.4 °C" style="width:200px">
        <figcaption id="cG">Temperature</figcaption><p id="dG" class="sr">From 18.2 to 22.4 °C.</p></figure></div>
    <div id="vF"><div role="img" aria-label="Temperature, last 24 hours"><svg width="200" height="60"><text x="0" y="20">12:00</text></svg><div tabindex="0" role="slider" aria-label="Cursor" aria-valuenow="1" aria-valuetext="12:00"></div></div></div>
  `;
  const keys = [];
  for (const el of host.querySelectorAll('[tabindex]')) el.addEventListener('keydown', (e) => keys.push({ id: el.closest('[id^=v]').id, key: e.key }));
  return keys;
}

let keys = [];
window.probe = {
  pinch,
  decimation,
  textWidths,
  pointerLog,
  scale: () => (visualViewport ? visualViewport.scale : null),
  log,
  a11y: () => { keys = a11y(); return true; },
  keys: () => keys,
};
