import { pctColumnsOf } from '../../libs/components/chart/src/model/columns';
import { pctPyramid, pctDecimate, pctRangeExtent } from '../../libs/components/chart/src/model/decimate';
const N = 60000, t0 = 0;
const rows = Array.from({ length: N }, (_, i) => ({ at: i * 1000, value: 500 + 300 * Math.sin(i / 300) + (i % 7) }));
const c = pctColumnsOf(rows, 'at', 'value');
const p = pctPyramid(c);
const time = (f: () => unknown, k = 200) => { f(); const s = performance.now(); for (let i = 0; i < k; i++) f(); return ((performance.now() - s) / k).toFixed(3); };
console.log('pyramid build', time(() => pctPyramid(c), 50));
for (const count of [600, 2000, 4000, 8000, 16000, 60000]) {
  const w = { from: (N - count) * 1000, to: N * 1000 };
  console.log(count, 'decimate scan', time(() => pctDecimate(c, w, 860)), 'pyr', time(() => pctDecimate(c, w, 860, p)), '| extent scan', time(() => pctRangeExtent(c, w.from, w.to)), 'pyr', time(() => pctRangeExtent(c, w.from, w.to, p)));
}
