// P7b — a search for an eight-colour series palette under the constraints C9 sets: every colour
// at least 3:1 (with a margin) on both surfaces of its theme; series N keeps its hue in both
// themes, so a stored index means the same colour in both; the score is the smallest OKLab
// distance between any two series as seen with normal vision and with the three deficiencies,
// the first four series weighted, because most charts draw two to four.
// Usage: node probes/chart/palette-search.mjs [seed] [iterations]
import { readFileSync, writeFileSync } from 'node:fs';

const css = readFileSync(new URL('../../libs/tokens/dist/pct.css', import.meta.url), 'utf8');
const prim = Object.fromEntries([...css.matchAll(/--pct-(slate-\d+):\s*(#[0-9a-f]{6})/gi)].map((m) => [m[1], m[2]]));
const GROUNDS = { light: [prim['slate-0'], prim['slate-100']], dark: [prim['slate-900'], prim['slate-800']] };
const MARGIN = 3.1;

const hex2 = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
const lin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const gam = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
const lumLin = ([r, g, b]) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
const ratio = (a, b) => { const [x, y] = [a, b].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const groundLum = Object.fromEntries(Object.entries(GROUNDS).map(([t, gs]) => [t, gs.map((g) => lumLin(hex2(g).map(lin)))]));

function oklchToLinear(L, C, h) {
  const a = C * Math.cos(h), b = C * Math.sin(h);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s];
}
const inGamut = (v) => v.every((c) => c >= -1e-4 && c <= 1 + 1e-4);
const toHex = (v) => '#' + v.map((c) => Math.round(gam(Math.min(1, Math.max(0, c))) * 255).toString(16).padStart(2, '0')).join('').toUpperCase();

const CVD = {
  protan: [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
  deutan: [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.01182, 0.04294, 0.968881]],
  tritan: [[1.255528, -0.076749, -0.178779], [-0.078411, 0.930809, 0.147602], [0.004733, 0.691367, 0.3039]],
};
const apply = (m, v) => m.map((row) => Math.min(1, Math.max(0, row[0] * v[0] + row[1] * v[1] + row[2] * v[2])));
function oklab([r, g, b]) {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
}
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const KINDS = ['normal', 'protan', 'deutan', 'tritan'];

// state: hue per series, [L, C] per theme per series
function colours(state, theme) {
  return state.hue.map((h, i) => oklchToLinear(state[theme][i][0], state[theme][i][1], h));
}
// Colour, not grey or black: a band of lightness per theme, a floor under chroma, and a hue that
// stays within 30 degrees of the colour series N already wears in the first consumer.
const BANDS = { light: [0.45, 0.63], dark: [0.65, 0.82] };
const CHROMA_MAX = 0.19;
const CHROMA_MIN = 0.1;
const DRIFT = (30 * Math.PI) / 180;
let START_HUE = null;
function score(state) {
  let total = Infinity;
  for (let i = 0; i < 8; i++) {
    let d = Math.abs(state.hue[i] - START_HUE[i]) % (2 * Math.PI);
    if (d > Math.PI) d = 2 * Math.PI - d;
    if (d > DRIFT) return { total: -1 };
    for (const theme of ['light', 'dark']) {
      const [L, C] = state[theme][i];
      if (L < BANDS[theme][0] || L > BANDS[theme][1] || C < CHROMA_MIN || C > CHROMA_MAX) return { total: -1 };
    }
  }
  const detail = {};
  for (const theme of ['light', 'dark']) {
    const cs = colours(state, theme);
    for (const v of cs) {
      if (!inGamut(v)) return { total: -1 };
      const L = lumLin(v.map((c) => Math.min(1, Math.max(0, c))));
      for (const g of groundLum[theme]) if (ratio(L, g) < MARGIN) return { total: -1 };
    }
    for (const kind of KINDS) {
      const seen = cs.map((v) => oklab(kind === 'normal' ? v.map((c) => Math.min(1, Math.max(0, c))) : apply(CVD[kind], v.map((c) => Math.min(1, Math.max(0, c))))));
      let min4 = Infinity, min8 = Infinity;
      for (let i = 0; i < 8; i++)
        for (let j = i + 1; j < 8; j++) {
          const d = dist(seen[i], seen[j]);
          if (j < 4 && d < min4) min4 = d;
          if (d < min8) min8 = d;
        }
      detail[`${theme}/${kind}`] = [+min4.toFixed(3), +min8.toFixed(3)];
      total = Math.min(total, min8 + 0.5 * min4);
    }
  }
  return { total, detail };
}

let seed = Number(process.argv[2] ?? 7);
const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const ITER = Number(process.argv[3] ?? 200_000);

// Start from the smart-home hues, so series N stays the colour its users know where it can.
const startHex = ['#2A78D6', '#EB6834', '#1BAF7A', '#EDA100', '#E87BA4', '#008300', '#6250D6', '#E34948'];
function hueOf(h) { const [L, a, b] = oklab(hex2(h).map(lin)); return Math.atan2(b, a); }
START_HUE = startHex.map(hueOf);
let state = {
  hue: startHex.map(hueOf),
  light: startHex.map(() => [0.5, 0.1]),
  dark: startHex.map(() => [0.72, 0.1]),
};
let best = score(state);
let current = { state, s: best };
for (let it = 0; it < ITER; it++) {
  const t = 1 - it / ITER;
  const next = structuredClone(current.state);
  const i = Math.floor(rand() * 8);
  const what = rand();
  if (what < 0.34) next.hue[i] += (rand() - 0.5) * 0.6 * t + (rand() - 0.5) * 0.05;
  else {
    const theme = what < 0.67 ? 'light' : 'dark';
    next[theme][i][0] += (rand() - 0.5) * 0.08 * t + (rand() - 0.5) * 0.01;
    next[theme][i][1] = Math.max(0.02, next[theme][i][1] + (rand() - 0.5) * 0.08 * t + (rand() - 0.5) * 0.01);
  }
  const s = score(next);
  if (s.total < 0) continue;
  const accept = s.total >= current.s.total || rand() < Math.exp((s.total - current.s.total) / (0.004 * t + 1e-6));
  if (accept) current = { state: next, s };
  if (s.total > best.total) { best = s; state = next; }
}
const result = {
  score: +best.total.toFixed(4),
  closest: best.detail,
  light: colours(state, 'light').map(toHex),
  dark: colours(state, 'dark').map(toHex),
  oklch: state.hue.map((h, i) => ({ hue: +((h * 180) / Math.PI + 360).toFixed(1) % 360, light: state.light[i].map((v) => +v.toFixed(3)), dark: state.dark[i].map((v) => +v.toFixed(3)) })),
};
console.log(JSON.stringify(result, null, 1));
writeFileSync(new URL(`./palette-search-${process.argv[2] ?? 7}.json`, import.meta.url), JSON.stringify({ found: { light: result.light, dark: result.dark } }));
