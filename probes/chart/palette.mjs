// P7 — the series palette: every colour against the surfaces it is drawn on (WCAG 1.4.11 asks
// 3:1 of a graphic that carries meaning), and every pair against each other as a person with a
// colour-vision deficiency sees them (Machado 2009, severity 1.0), measured as a distance in
// OKLab. Usage: node probes/chart/palette.mjs [palette.json]
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../../libs/tokens/dist/pct.css', import.meta.url), 'utf8');
const prim = Object.fromEntries([...css.matchAll(/--pct-(slate-\d+):\s*(#[0-9a-f]{6})/gi)].map((m) => [m[1], m[2]]));

const palettes = process.argv[2]
  ? JSON.parse(readFileSync(process.argv[2], 'utf8'))
  : {
      'smart-home': {
        light: ['#2A78D6', '#EB6834', '#1BAF7A', '#EDA100', '#E87BA4', '#008300', '#6250D6', '#E34948'],
        dark: ['#3987E5', '#D95926', '#199E70', '#C98500', '#D55181', '#008300', '#9085E9', '#E66767'],
      },
    };
const grounds = {
  light: { surface: prim['slate-0'], 'surface-100': prim['slate-100'] },
  dark: { surface: prim['slate-900'], 'surface-100': prim['slate-800'] },
};

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
const lin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const lum = (rgb) => { const [r, g, b] = rgb.map(lin); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const ratio = (a, b) => { const [x, y] = [lum(hex(a)), lum(hex(b))].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

// Machado, Oliveira, Fernandes 2009, severity 1.0, applied to linear RGB.
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
const seen = (h, kind) => { const v = hex(h).map(lin); return oklab(kind === 'normal' ? v : apply(CVD[kind], v)); };
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

for (const [name, themes] of Object.entries(palettes)) {
  for (const [theme, colours] of Object.entries(themes)) {
    console.log(`\n${name} / ${theme}`);
    for (const [i, c] of colours.entries()) {
      const r = Object.entries(grounds[theme]).map(([g, v]) => `${g} ${ratio(c, v).toFixed(2)}`).join('  ');
      const fail = Object.values(grounds[theme]).some((v) => ratio(c, v) < 3) ? '  < 3:1' : '';
      console.log(`  ${i + 1} ${c}  ${r}${fail}`);
    }
    for (const kind of ['normal', 'protan', 'deutan', 'tritan']) {
      let min = Infinity, pair = '';
      for (let i = 0; i < colours.length; i++)
        for (let j = i + 1; j < colours.length; j++) {
          const d = dist(seen(colours[i], kind), seen(colours[j], kind));
          if (d < min) { min = d; pair = `${i + 1}-${j + 1}`; }
        }
      console.log(`  closest pair ${kind.padEnd(6)} ΔOK ${min.toFixed(3)} (${pair})`);
    }
  }
}
