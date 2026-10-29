// P2d — the scan against the pyramid in the decimation of phase 1 (a copy of chart/src/model/decimate.ts
// as it stood when measured), one series of a random walk across 1,400 pixels, Node 24.
// Usage: node probes/chart/node/bench.mts
import { pctDecimate, pctPyramid } from './decimate.ts';
const width = 1400;
for (const n of [60_000, 120_000, 240_000, 600_000, 2_000_000]) {
  const xs = new Float64Array(n), ys = new Float64Array(n);
  let y = 0;
  for (let i = 0; i < n; i++) { xs[i] = i; y += Math.random() - 0.5; ys[i] = y; }
  const c = { xs, ys, length: n };
  const p = pctPyramid(c);
  const w = { from: 0, to: n };
  const time = (f: () => unknown) => { for (let i = 0; i < 5; i++) f(); const t = performance.now(); for (let i = 0; i < 20; i++) f(); return (performance.now() - t) / 20; };
  console.log(n, 'perColumn', (n / width).toFixed(0), 'scan', time(() => pctDecimate(c, w, width)).toFixed(2), 'pyramid', time(() => pctDecimate(c, w, width, p)).toFixed(2));
}
