// P2d — the scan against the pyramid in the decimation of phase 1 (a copy of
// chart/src/model/decimate.ts with its threshold made a global, so either road can be forced),
// one series of a random walk across 1,400 pixels, Node 24. Seven rounds of twenty calls after
// five warm-up calls; the median round is printed.
// Usage: node probes/chart/node/bench.mts
import { pctDecimate, pctPyramid } from './decimate.ts';
const g = globalThis as { THRESHOLD?: number };
const width = 1400;
for (const perColumn of [16, 32, 43, 64, 86, 171, 429, 1429]) {
  const n = perColumn * width;
  const xs = new Float64Array(n), ys = new Float64Array(n);
  let y = 0;
  for (let i = 0; i < n; i++) { xs[i] = i; y += Math.random() - 0.5; ys[i] = y; }
  const c = { xs, ys, length: n };
  let t = performance.now();
  const p = pctPyramid(c);
  const build = performance.now() - t;
  const w = { from: 0, to: n };
  const time = (f: () => unknown) => {
    for (let i = 0; i < 5; i++) f();
    const rounds: number[] = [];
    for (let r = 0; r < 7; r++) { const s = performance.now(); for (let i = 0; i < 20; i++) f(); rounds.push((performance.now() - s) / 20); }
    return rounds.sort((a, b) => a - b)[3];
  };
  g.THRESHOLD = Infinity;
  const scan = time(() => pctDecimate(c, w, width, p));
  g.THRESHOLD = 0;
  const pyramid = time(() => pctDecimate(c, w, width, p));
  console.log(`${perColumn} a column (${n} readings): scan ${scan.toFixed(2)} ms, pyramid ${pyramid.toFixed(2)} ms, pyramid built in ${build.toFixed(1)} ms`);
}
