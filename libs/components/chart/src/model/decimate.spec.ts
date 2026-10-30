import type { PctColumns } from './columns';
import { pctDecimate, pctPyramid, pctRangeExtent } from './decimate';
import {
  pctForAll,
  pctInt,
  pctRandom,
  pctRecord,
} from '../../../testing/src/property.testkit';

const of = (points: readonly (readonly [number, number])[]): PctColumns => ({
  xs: Float64Array.from(points.map((p) => p[0])),
  ys: Float64Array.from(points.map((p) => p[1])),
  length: points.length,
});
const pairs = (c: PctColumns) =>
  Array.from({ length: c.length }, (_, i) => [
    c.xs[i],
    Number.isNaN(c.ys[i]) ? 'gap' : c.ys[i],
  ]);

/**
 * The reference: the definition read literally. Per column of pixels the first, the lowest,
 * the highest and the last reading, in order; a gap as one marker; the reading on each side of
 * the window. Slow and plain, which is the point.
 */
function reference(
  c: PctColumns,
  from: number,
  to: number,
  width: number,
): (number | string)[][] {
  const out: (number | string)[][] = [];
  const n = c.length;
  let i0 = 0;
  while (i0 < n && c.xs[i0] < from) i0++;
  i0 = Math.max(0, i0 - 1);
  let i1 = 0;
  while (i1 < n && c.xs[i1] < to) i1++;
  i1 = Math.min(n - 1, i1);
  let group: number[] = [];
  const flush = () => {
    if (!group.length) return;
    let lo = group[0];
    let hi = group[0];
    for (const i of group) {
      if (c.ys[i] < c.ys[lo]) lo = i;
      if (c.ys[i] > c.ys[hi]) hi = i;
    }
    for (const i of [
      ...new Set([group[0], lo, hi, group[group.length - 1]]),
    ].sort((a, b) => a - b)) {
      out.push([c.xs[i], c.ys[i]]);
    }
    group = [];
  };
  let column = NaN;
  for (let i = i0; i <= i1; i++) {
    if (Number.isNaN(c.ys[i])) {
      flush();
      if (out.length && out[out.length - 1][1] !== 'gap')
        out.push([c.xs[i], 'gap']);
      column = NaN;
      continue;
    }
    const col = Math.floor(((c.xs[i] - from) * width) / (to - from));
    if (col !== column) flush();
    column = col;
    group.push(i);
  }
  flush();
  return out;
}

function noisy(n: number, seed: number, gaps: number): PctColumns {
  const random = pctRandom(seed);
  const xs = new Float64Array(n);
  const ys = new Float64Array(n);
  let x = 0;
  let y = 0;
  for (let i = 0; i < n; i++) {
    x += 1 + Math.floor(random() * 3);
    y += random() - 0.5;
    xs[i] = x;
    ys[i] = random() < gaps ? NaN : Math.round(y * 100) / 100;
  }
  return { xs, ys, length: n };
}

describe('pctPyramid', () => {
  it('shows how many readings it was built over, and nothing else', () => {
    const p = pctPyramid(
      of([
        [0, 5],
        [1, 3],
        [2, 8],
      ]),
    );
    expect(p).toEqual({ length: 3 });
    expect(pctPyramid(of([])).length).toBe(0);
  });

  it('gives the answer of the scan at every level, gaps and all', () => {
    const c = of([
      [0, 5],
      [1, NaN],
      [2, NaN],
      [3, NaN],
      [4, 1],
      [5, 2],
      [6, 9],
      [7, 0],
      [8, 4],
    ]);
    for (const width of [1, 2, 3, 9]) {
      const window = { from: 0, to: 9 };
      expect(pairs(pctDecimate(c, window, width, pctPyramid(c)))).toEqual(
        reference(c, 0, 9, width),
      );
    }
  });
});

describe('pctDecimate', () => {
  it('keeps the first, the lowest, the highest and the last reading of a column, in order', () => {
    const c = of([
      [0, 5],
      [1, 9],
      [2, 1],
      [3, 4],
      [10, 2],
      [11, 3],
    ]);
    expect(pairs(pctDecimate(c, { from: 0, to: 20 }, 2))).toEqual([
      [0, 5],
      [1, 9],
      [2, 1],
      [3, 4],
      [10, 2],
      [11, 3],
    ]);
    // one column for everything: the first, the highest, the lowest, the last
    expect(pairs(pctDecimate(c, { from: 0, to: 20 }, 1))).toEqual([
      [0, 5],
      [1, 9],
      [2, 1],
      [11, 3],
    ]);
  });

  it('keeps one reading beyond each edge of the window', () => {
    const c = of([
      [0, 1],
      [10, 2],
      [20, 3],
      [30, 4],
      [40, 5],
    ]);
    expect(pairs(pctDecimate(c, { from: 15, to: 25 }, 10))).toEqual([
      [10, 2],
      [20, 3],
      [30, 4],
    ]);
    expect(pairs(pctDecimate(c, { from: 10, to: 30 }, 10))).toEqual([
      [0, 1],
      [10, 2],
      [20, 3],
      [30, 4],
    ]);
  });

  it('keeps a gap where it starts, once', () => {
    const c = of([
      [0, 1],
      [1, NaN],
      [2, NaN],
      [3, 2],
    ]);
    expect(pairs(pctDecimate(c, { from: 0, to: 4 }, 100))).toEqual([
      [0, 1],
      [1, 'gap'],
      [3, 2],
    ]);
  });

  it('gives no gap before the first reading drawn', () => {
    const c = of([
      [0, NaN],
      [1, NaN],
      [2, 3],
    ]);
    expect(pairs(pctDecimate(c, { from: 0, to: 4 }, 100))).toEqual([[2, 3]]);
  });

  it('draws nothing from nothing, in no width or in no window', () => {
    const c = of([
      [0, 1],
      [1, 2],
    ]);
    expect(pctDecimate(of([]), { from: 0, to: 1 }, 10).length).toBe(0);
    expect(pctDecimate(c, { from: 0, to: 1 }, 0).length).toBe(0);
    expect(pctDecimate(c, { from: 1, to: 1 }, 10).length).toBe(0);
    expect(pctDecimate(c, { from: 0, to: 1 }, NaN).length).toBe(0);
  });

  it('keeps a lone reading', () => {
    expect(pairs(pctDecimate(of([[5, 1]]), { from: 0, to: 10 }, 10))).toEqual([
      [5, 1],
    ]);
  });

  it('equals the reference, with a pyramid and without, in any window', () => {
    const cases = pctRecord({
      n: pctInt(0, 3000),
      seed: pctInt(1, 10_000),
      gaps: pctInt(0, 3),
      a: pctInt(-50, 7000),
      span: pctInt(1, 7000),
      width: pctInt(1, 400),
    });
    pctForAll(
      cases,
      ({ n, seed, gaps, a, span, width }) => {
        const c = noisy(n, seed, [0, 0.001, 0.05, 0.5][gaps]);
        const window = { from: a, to: a + span };
        const want = reference(c, window.from, window.to, width);
        expect(pairs(pctDecimate(c, window, width))).toEqual(want);
        expect(pairs(pctDecimate(c, window, width, pctPyramid(c)))).toEqual(
          want,
        );
      },
      { runs: 120 },
    );
  });

  it('reads the pyramid rather than the readings, so the cost follows the pixels', () => {
    const readsFor = (n: number) => {
      const c = noisy(n, 3, 0);
      const pyramid = pctPyramid(c);
      let reads = 0;
      const ys = new Proxy(c.ys, {
        get(target, key) {
          if (typeof key === 'string' && /^\d+$/.test(key)) reads++;
          const value = Reflect.get(target, key);
          return typeof value === 'function' ? value.bind(target) : value;
        },
      }) as Float64Array;
      const window = { from: c.xs[0], to: c.xs[c.length - 1] };
      const drawn = pctDecimate(
        { xs: c.xs, ys, length: c.length },
        window,
        500,
        pyramid,
      );
      expect(drawn.length).toBeLessThanOrEqual(4 * 500 + 2);
      return reads;
    };
    const small = readsFor(100_000);
    const large = readsFor(400_000);
    // four times the readings, the same pixels: a scan reads four times as much, the pyramid
    // a level more per column
    expect(large).toBeLessThan(small * 1.5);
    expect(large).toBeLessThan(400_000 / 4);
  });

  it('reads the readings one by one below 64 a column, and the pyramid from 64', () => {
    const readsAt = (n: number) => {
      const c = noisy(n, 5, 0);
      let reads = 0;
      const ys = new Proxy(c.ys, {
        get(target, key) {
          if (typeof key === 'string' && /^\d+$/.test(key)) reads++;
          const value = Reflect.get(target, key);
          return typeof value === 'function' ? value.bind(target) : value;
        },
      }) as Float64Array;
      const window = { from: c.xs[0] - 1, to: c.xs[c.length - 1] + 1 };
      const drawn = pctDecimate(
        { xs: c.xs, ys, length: c.length },
        window,
        100,
        pctPyramid(c),
      );
      expect(pairs(drawn)).toEqual(reference(c, window.from, window.to, 100));
      return reads;
    };
    // the window holds every reading, so a column holds n / 100 of them; one by one, a reading
    // is read about three times (itself and the two extremes it is compared with)
    const below = readsAt(6399);
    const at = readsAt(6400);
    expect(below).toBeGreaterThanOrEqual(2 * 6399);
    expect(at).toBeLessThan(below / 2);
  });

  it('reads no pyramid built over other columns', () => {
    const c = noisy(20_000, 9, 0);
    const half = {
      xs: c.xs.subarray(0, 10_000),
      ys: c.ys.subarray(0, 10_000),
      length: 10_000,
    };
    const stale = pctPyramid(half);
    expect(stale.length).toBe(10_000);
    const window = { from: c.xs[0], to: c.xs[c.length - 1] };
    expect(pairs(pctDecimate(c, window, 100, stale))).toEqual(
      reference(c, window.from, window.to, 100),
    );
  });
});

describe('pctRangeExtent', () => {
  const scan = (c: PctColumns, from: number, to: number) => {
    let min = Infinity;
    let max = -Infinity;
    for (let i = 0; i < c.length; i++)
      if (c.xs[i] > from && c.xs[i] < to && !Number.isNaN(c.ys[i])) {
        min = Math.min(min, c.ys[i]);
        max = Math.max(max, c.ys[i]);
      }
    return min <= max ? [min, max] : null;
  };

  it('takes the readings strictly inside, a gap none, and nothing from nothing', () => {
    const c = of([
      [0, 5],
      [1, NaN],
      [2, 7],
      [3, -1],
      [4, 3],
    ]);
    expect(pctRangeExtent(c, 0, 4)).toEqual([-1, 7]);
    expect(pctRangeExtent(c, 0.5, 1.5)).toBeNull();
    expect(pctRangeExtent(c, 2, 3)).toBeNull();
    expect(pctRangeExtent(of([]), 0, 1)).toBeNull();
  });

  it('equals the scan, with a pyramid and without, in any range', () => {
    pctForAll(
      pctRecord({
        length: pctInt(0, 300),
        from: pctInt(-5, 305),
        span: pctInt(0, 310),
        seed: pctInt(0, 1_000_000),
      }),
      ({ length, from, span, seed }) => {
        const random = pctRandom(seed);
        const c = of(
          Array.from({ length }, (_, i) => [
            i,
            random() < 0.1 ? NaN : Math.round(random() * 100),
          ]),
        );
        const pyramid = pctPyramid(c);
        const expected = scan(c, from, from + span);
        expect(pctRangeExtent(c, from, from + span)).toEqual(expected);
        expect(pctRangeExtent(c, from, from + span, pyramid)).toEqual(expected);
      },
    );
  });

  it('reads whole runs of the pyramid, so the cost follows the logarithm', () => {
    const readsFor = (n: number) => {
      const c = noisy(n, 3, 0);
      const pyramid = pctPyramid(c);
      let reads = 0;
      const ys = new Proxy(c.ys, {
        get(target, key) {
          if (typeof key === 'string' && /^\d+$/.test(key)) reads++;
          return Reflect.get(target, key);
        },
      }) as Float64Array;
      pctRangeExtent(
        { xs: c.xs, ys, length: c.length },
        1.5,
        c.length - 2.5,
        pyramid,
      );
      return reads;
    };
    expect(readsFor(100_000)).toBeLessThan(400);
    expect(readsFor(400_000)).toBeLessThan(450);
  });

  it('reads no pyramid built over other columns', () => {
    const c = of([
      [0, 1],
      [1, 9],
      [2, 3],
      [3, 4],
    ]);
    const other = pctPyramid(
      of([
        [0, 100],
        [1, -100],
        [2, 0],
        [3, 0],
      ]),
    );
    expect(pctRangeExtent(c, -1, 4, other)).toEqual([1, 9]);
  });
});
