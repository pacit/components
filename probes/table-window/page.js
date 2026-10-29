'use strict';
// Probe functions for the data-table decisions. Every function builds its own structure in
// #root and returns plain numbers; the spec writes them with the condition.
const COLS = 8;
const WORDS = ['Lamp', 'Thermostat', 'Living room ceiling light', 'Hall', 'Garage door opener', 'Kitchen', 'Boiler', 'Motion sensor in the upstairs bathroom'];
const frames = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
const now = () => performance.now();
const median = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : null; };
const round = (x) => (x == null ? x : Math.round(x * 100) / 100);

let vary = false;
function text(r, c) {
  // Content whose width grows down the list, so a window drawn lower has wider cells.
  if (vary && c === 2) return 'W'.repeat(4 + Math.floor(r / 5000) * 3);
  if (c === 0) return `Row ${String(r).padStart(6, '0')}`;
  if (c === 1) return WORDS[(r * 7) % WORDS.length];
  if (c === 2) return WORDS[(r * 3 + 1) % WORDS.length];
  if (c % 2 === 1) return ((r * 37 + c * 11) % 100000 / 10).toFixed(1);
  return WORDS[(r + c) % WORDS.length].slice(0, 4 + ((r + c) % 12));
}
function row(r, cls) {
  const tr = document.createElement('tr');
  if (cls) tr.className = cls;
  for (let c = 0; c < COLS; c++) {
    const td = document.createElement('td');
    if (c % 2 === 1 && c > 2) td.className = 'num';
    td.textContent = text(r, c);
    tr.appendChild(td);
  }
  return tr;
}
function shell({ caption = 'Devices', tableClass = '', bodyClass = '' } = {}) {
  const root = document.getElementById('root');
  root.textContent = '';
  const frame = document.createElement('div');
  frame.className = 'frame';
  frame.id = 'frame';
  frame.setAttribute('role', 'region');
  frame.setAttribute('aria-label', caption);
  frame.tabIndex = 0;
  const table = document.createElement('table');
  if (tableClass) table.className = tableClass;
  const cap = document.createElement('caption');
  cap.textContent = caption;
  const thead = document.createElement('thead');
  const htr = document.createElement('tr');
  for (let c = 0; c < COLS; c++) {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = `Column ${c + 1}`;
    htr.appendChild(th);
  }
  thead.appendChild(htr);
  const tbody = document.createElement('tbody');
  if (bodyClass) tbody.className = bodyClass;
  table.append(cap, thead, tbody);
  frame.appendChild(table);
  root.appendChild(frame);
  return { frame, table, thead, tbody };
}

// Probe 1: the bare table, every row in the DOM.
async function bare(n, { cv = false } = {}) {
  const t0 = now();
  const { frame, table, tbody } = shell();
  const frag = document.createDocumentFragment();
  for (let r = 0; r < n; r++) frag.appendChild(row(r, cv ? 'cv' : ''));
  tbody.appendChild(frag);
  void frame.scrollHeight;
  const built = now() - t0;
  await frames();
  const firstFrame = now() - t0;
  const scrolls = [];
  for (let i = 0; i < 10; i++) {
    const s0 = now();
    frame.scrollTop = Math.min(frame.scrollTop + 5000, frame.scrollHeight);
    await frames();
    scrolls.push(now() - s0);
  }
  frame.scrollTop = 0;
  await frames();
  const restyles = [];
  for (let i = 0; i < 5; i++) {
    const s0 = now();
    tbody.rows[10 + i].classList.toggle('selected');
    void frame.scrollHeight;
    await frames();
    restyles.push(now() - s0);
  }
  const relayouts = [];
  for (let i = 0; i < 3; i++) {
    const s0 = now();
    frame.style.width = `${1000 - (i + 1) * 40}px`;
    void table.offsetWidth;
    await frames();
    relayouts.push(now() - s0);
  }
  frame.style.width = '';
  await frames();
  const r0 = now();
  const rows = Array.from(tbody.rows);
  for (let i = rows.length - 1; i >= 0; i--) tbody.appendChild(rows[i]);
  void frame.scrollHeight;
  await frames();
  const reorder = now() - r0;
  // Find-in-page: the row the probe looks for is 9 000, or the last one in a shorter table.
  const target = Math.min(9000, n - 1);
  frame.scrollTop = 0;
  window.getSelection()?.removeAllRanges();
  await frames();
  let found = null;
  if (typeof window.find === 'function') {
    try { found = window.find(`Row ${String(target).padStart(6, '0')}`, false, false, true); } catch (e) { found = `throws ${e.name}`; }
  }
  await frames();
  const selected = window.getSelection()?.toString() ?? null;
  const mem = performance.memory ? performance.memory.usedJSHeapSize : null;
  return {
    n, cv, built: round(built), firstFrame: round(firstFrame), scrollMedian: round(median(scrolls)), scrollMax: round(Math.max(...scrolls)),
    restyleMedian: round(median(restyles)), relayoutMedian: round(median(relayouts)), reorder: round(reorder), found, selected, heapUsed: mem,
    scrollHeight: frame.scrollHeight, nodes: document.getElementsByTagName('*').length,
  };
}

// Probe 2: where the space of the rows that are not drawn lives.
const RH = 36;
function spaceSetup(kind, { n = 50000, drawn = 40, layout = 'auto' } = {}) {
  const { frame, table, tbody } = shell({ tableClass: layout === 'fixed' ? 'layout-fixed' : '', bodyClass: kind === 'pseudo' ? 'pseudo' : '' });
  let before = null, after = null, sizer = null;
  if (kind === 'tr' || kind === 'tr-td') {
    const mk = () => {
      const tr = document.createElement('tr');
      tr.className = 'spacer';
      tr.setAttribute('aria-hidden', 'true');
      if (kind === 'tr-td') { const td = document.createElement('td'); td.colSpan = COLS; tr.appendChild(td); }
      return tr;
    };
    before = mk(); after = mk();
    tbody.append(before, after);
  }
  if (kind === 'transform') {
    sizer = document.createElement('div');
    sizer.setAttribute('aria-hidden', 'true');
    frame.appendChild(sizer);
  }
  let start = -1;
  const render = (s) => {
    s = Math.max(0, Math.min(n - drawn, s));
    if (s === start) return s;
    start = s;
    const frag = document.createDocumentFragment();
    for (let r = s; r < s + drawn; r++) frag.appendChild(row(r, 'fixed'));
    const keep = new Set([before, after]);
    for (const tr of Array.from(tbody.rows)) if (!keep.has(tr)) tr.remove();
    if (kind === 'tr' || kind === 'tr-td') {
      tbody.insertBefore(frag, after);
      before.style.height = `${s * RH}px`;
      after.style.height = `${(n - s - drawn) * RH}px`;
    } else {
      tbody.appendChild(frag);
    }
    if (kind === 'pseudo') {
      tbody.style.setProperty('--before', `${s * RH}px`);
      tbody.style.setProperty('--after', `${(n - s - drawn) * RH}px`);
    }
    if (kind === 'transform') {
      tbody.style.transform = `translateY(${s * RH}px)`;
      sizer.style.height = `${(n - drawn) * RH}px`;
    }
    return s;
  };
  return { frame, table, tbody, render, get start() { return start; } };
}
async function space(kind, opts = {}) {
  const n = opts.n ?? 50000, drawn = opts.drawn ?? 40, layout = opts.layout ?? 'auto';
  vary = !!opts.vary;
  const t = spaceSetup(kind, { n, drawn, layout });
  t.render(0);
  await frames();
  const firstRow = () => Array.from(t.tbody.rows).find((tr) => !tr.classList.contains('spacer'));
  if (layout === 'fixed') {
    // Widths from the first frame, written on <col> so the drawn rows never move them.
    const ws = Array.from(firstRow().cells).map((c) => c.getBoundingClientRect().width);
    const cg = document.createElement('colgroup');
    for (const w of ws) { const col = document.createElement('col'); col.style.width = `${w}px`; cg.appendChild(col); }
    t.table.insertBefore(cg, t.table.tHead);
    await frames();
  }
  const fr = () => t.frame.getBoundingClientRect();
  const base = firstRow().getBoundingClientRect().top - fr().top + t.frame.scrollTop;
  const expectedHeight = base + n * RH;
  const positions = [0, 0.25, 0.5, 0.75, 1];
  const samples = [];
  for (const p of positions) {
    const top = Math.round((t.frame.scrollHeight - t.frame.clientHeight) * p);
    t.frame.scrollTop = top;
    const first = Math.floor(Math.max(0, t.frame.scrollTop - base) / RH);
    t.render(first - 5);
    await frames();
    const fRow = firstRow();
    const widths = Array.from(fRow.cells).map((c) => round(c.getBoundingClientRect().width));
    // The row the scroll position names must sit where the sum puts it.
    const k = Math.min(n - 1, Math.max(t.start, first));
    const tr = Array.from(t.tbody.rows).find((x) => x.cells[0]?.textContent === `Row ${String(k).padStart(6, '0')}`);
    const actual = tr ? tr.getBoundingClientRect().top - fr().top + t.frame.scrollTop : null;
    const th = t.table.tHead.rows[0].cells[0].getBoundingClientRect();
    samples.push({ p, scrollTop: t.frame.scrollTop, widths, rowOffsetError: actual == null ? 'not drawn' : round(actual - (base + k * RH)), stickyHeaderTop: round(th.top - fr().top), scrollHeight: t.frame.scrollHeight });
  }
  const colDrift = [];
  for (let c = 0; c < COLS; c++) {
    const ws = samples.map((s) => s.widths[c]);
    colDrift.push(round(Math.max(...ws) - Math.min(...ws)));
  }
  // The cost of moving the window by its own length.
  t.frame.scrollTop = 0; t.render(0); await frames();
  const moves = [];
  for (let i = 1; i <= 10; i++) {
    const s0 = now();
    t.frame.scrollTop = i * drawn * RH;
    t.render(i * drawn);
    void t.frame.scrollHeight;
    await frames();
    moves.push(now() - s0);
  }
  vary = false;
  return { kind, layout, vary: !!opts.vary, n, drawn, base: round(base), expectedHeight: round(expectedHeight), samples, maxColDrift: Math.max(...colDrift), moveMedian: round(median(moves)), moveMax: round(Math.max(...moves)) };
}

// Probe 3: a line of another height inside the window, and the jump when scrolling up.
async function heights({ correct, anchor, fractional = false }) {
  const n = 10000, EST = 36, every = 20, overscan = 3, TOL = 1 / 64;
  const rowClass = fractional ? 'frac' : 'fixed';
  const lines = [];
  for (let r = 0; r < n; r++) { lines.push({ r, details: false }); if (r % every === every - 1) lines.push({ r, details: true }); }
  const N = lines.length;
  const h = new Float64Array(N).fill(EST);
  const measured = new Uint8Array(N);
  const { frame, tbody } = shell({ bodyClass: 'pseudo' });
  frame.style.overflowAnchor = anchor ? 'auto' : 'none';
  const sum = (a, b) => { let s = 0; for (let i = a; i < b; i++) s += h[i]; return s; };
  let start = 0, end = 0;
  const base = () => tbody.getBoundingClientRect().top - frame.getBoundingClientRect().top + frame.scrollTop;
  let tbodyBase = 0;
  const startFor = (top) => { let s = 0, i = 0; const y = top - tbodyBase; while (i < N && s + h[i] <= y) { s += h[i]; i++; } return i; };
  const lineEl = (i) => {
    const l = lines[i];
    if (!l.details) { const tr = row(l.r, rowClass); tr.dataset.i = i; return tr; }
    const tr = document.createElement('tr');
    tr.className = 'details'; tr.dataset.i = i;
    const td = document.createElement('td'); td.colSpan = COLS;
    const box = document.createElement('div'); box.className = fractional ? 'details-box frac' : 'details-box'; box.textContent = `Details of row ${l.r}`;
    td.appendChild(box); tr.appendChild(td);
    return tr;
  };
  // Rows are kept by index across renders, as `@for` with `track` keeps them, so the engine's
  // own scroll anchoring has a node to hold on to.
  const render = (anchorI) => {
    const first = startFor(frame.scrollTop);
    let s = Math.max(0, first - overscan), e = s, acc = 0;
    while (e < N && acc < frame.clientHeight + 2 * overscan * EST) { acc += h[e]; e++; }
    start = s; end = Math.min(N, e + overscan);
    const old = new Map();
    for (const tr of Array.from(tbody.rows)) { const i = +tr.dataset.i; if (i < start || i >= end) tr.remove(); else old.set(i, tr); }
    let next = tbody.rows[0] ?? null;
    for (let i = start; i < end; i++) {
      const tr = old.get(i);
      if (tr) { next = tr.nextElementSibling; continue; }
      tbody.insertBefore(lineEl(i), next);
    }
    tbody.style.setProperty('--before', `${sum(0, start)}px`);
    tbody.style.setProperty('--after', `${sum(end, N)}px`);
    const top = frame.scrollTop;
    // Measure what is drawn; the manual correction keeps the anchor row still when lines above
    // it turn out to have another height than the estimate.
    let delta = 0;
    for (const tr of Array.from(tbody.rows)) {
      const i = +tr.dataset.i;
      const real = tr.getBoundingClientRect().height;
      if (Math.abs(real - h[i]) > TOL) { if (anchorI != null && i < anchorI) delta += real - h[i]; h[i] = real; }
      measured[i] = 1;
    }
    tbody.style.setProperty('--after', `${sum(end, N)}px`);
    const afterTop = frame.scrollTop;
    if (correct && delta) frame.scrollTop = afterTop + delta;
    return { delta, engineMoved: afterTop - top };
  };
  tbody.style.setProperty('--after', `${sum(0, N)}px`);
  await frames();
  tbodyBase = base();
  // Jump to the middle as a dragged thumb would, then scroll up step by step.
  frame.scrollTop = Math.round(sum(0, N) / 2);
  render();
  await frames();
  const anchorOf = () => {
    const ft = frame.getBoundingClientRect().top + 60;
    const tr = Array.from(tbody.rows).find((x) => x.getBoundingClientRect().top >= ft);
    return tr ? { i: +tr.dataset.i, y: tr.getBoundingClientRect().top - frame.getBoundingClientRect().top } : null;
  };
  const steps = [];
  for (let k = 0; k < 30; k++) {
    const a = anchorOf();
    frame.scrollTop -= 200;
    await new Promise((r) => requestAnimationFrame(r));
    const before = frame.scrollTop;
    const { delta } = render(a.i);
    await frames();
    const engine = frame.scrollTop - before - (correct ? delta : 0);
    const el = Array.from(tbody.rows).find((x) => +x.dataset.i === a.i);
    const y = el ? el.getBoundingClientRect().top - frame.getBoundingClientRect().top : null;
    steps.push({ delta: round(delta), engine: round(engine), jump: y == null ? 'gone' : round(y - (a.y + 200)) });
  }
  // Settled: renders with no scroll must change nothing (the loop that froze the select).
  let idle = 0;
  for (let k = 0; k < 5; k++) { const a = anchorOf(); idle += Math.abs(render(a.i).delta); await frames(); }
  // A drawn line above the anchor changes height after it was measured (content arriving late).
  const a = anchorOf();
  const above = Array.from(tbody.rows).filter((x) => +x.dataset.i < a.i).pop();
  if (above) above.cells[0].style.height = `${above.getBoundingClientRect().height + 60}px`;
  render(a.i);
  await frames();
  const el = Array.from(tbody.rows).find((x) => +x.dataset.i === a.i);
  const late = el ? round(el.getBoundingClientRect().top - frame.getBoundingClientRect().top - a.y) : 'gone';
  const jumps = steps.map((s) => (typeof s.jump === 'number' ? Math.abs(s.jump) : 0));
  return { correct, anchor, fractional, idle: round(idle), late, sampleHeights: Array.from(h.slice(0, 3)).map(round), steps, maxJump: Math.max(...jumps), sumJump: round(jumps.reduce((x, y) => x + y, 0)) };
}

// Probe 5: the largest height each engine still scrolls to the end of.
async function ceiling(kind) {
  const root = document.getElementById('root');
  root.textContent = '';
  const frame = document.createElement('div');
  frame.className = 'frame';
  root.appendChild(frame);
  let box;
  const set = (H) => {
    frame.textContent = '';
    if (kind === 'block') {
      box = document.createElement('div');
      box.style.height = `${H}px`;
      frame.appendChild(box);
    } else {
      const table = document.createElement('table');
      const tb = document.createElement('tbody');
      if (kind === 'pseudo') { tb.className = 'pseudo'; tb.style.setProperty('--after', `${H}px`); tb.appendChild(row(0, 'fixed')); }
      else { const tr = document.createElement('tr'); tr.className = 'spacer'; tr.style.height = `${H}px`; tb.appendChild(tr); tb.appendChild(row(1, 'fixed')); }
      table.appendChild(tb);
      frame.appendChild(table);
      box = table;
    }
    void frame.scrollHeight;
  };
  const tries = [];
  for (const H of [1e7, 1.5e7, 1.7e7, 1.8e7, 2e7, 3e7, 3.3e7, 3.4e7, 4e7]) {
    set(H);
    frame.scrollTop = Math.round(H / 2);
    await frames();
    const half = frame.scrollTop;
    frame.scrollTop = frame.scrollHeight;
    await frames();
    tries.push({ H, half, scrollHeight: frame.scrollHeight, scrollTop: frame.scrollTop, reachesEnd: Math.abs(frame.scrollTop + frame.clientHeight - frame.scrollHeight) <= 2, boxHeight: round(box.getBoundingClientRect().height) });
  }
  // Bisect the largest height the box keeps as written.
  let lo = 1e6, hi = 1e8;
  while (hi - lo > 1000) {
    const mid = Math.floor((lo + hi) / 2);
    set(mid);
    if (Math.abs(box.getBoundingClientRect().height - mid) < 2 + (kind === 'block' ? 0 : 40)) lo = mid; else hi = mid;
  }
  return { kind, tries, keptUpTo: lo };
}

window.probe = { bare, space, heights, ceiling, shell, row, frames };
