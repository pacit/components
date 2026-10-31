import type { PctColumns } from './columns';
import { pctIndexAt, pctValueAt } from './value-at';
import {
  pctForAll,
  pctInt,
  pctRecord,
} from '../../../testing/src/property.testkit';

const of = (points: readonly (readonly [number, number])[]): PctColumns => ({
  xs: Float64Array.from(points.map((p) => p[0])),
  ys: Float64Array.from(points.map((p) => p[1])),
  length: points.length,
});

/** 10 → 1, 20 → 3, 30 → gap, 40 → 7. */
const series = of([
  [10, 1],
  [20, 3],
  [30, NaN],
  [40, 7],
]);

describe('pctIndexAt', () => {
  it('finds the last reading at or before a position', () => {
    expect(pctIndexAt(series, 5)).toBe(-1);
    expect(pctIndexAt(series, 10)).toBe(0);
    expect(pctIndexAt(series, 19.9)).toBe(0);
    expect(pctIndexAt(series, 20)).toBe(1);
    expect(pctIndexAt(series, 40)).toBe(3);
    expect(pctIndexAt(series, 99)).toBe(3);
  });

  it('takes the last of readings at one position', () => {
    expect(
      pctIndexAt(
        of([
          [1, 1],
          [2, 2],
          [2, 3],
          [3, 4],
        ]),
        2,
      ),
    ).toBe(2);
  });

  it('reads only up to the length', () => {
    expect(
      pctIndexAt(
        {
          xs: Float64Array.from([1, 2, 3]),
          ys: new Float64Array(3),
          length: 2,
        },
        5,
      ),
    ).toBe(1);
  });

  it('agrees with a walk from the start', () => {
    const cases = pctRecord({
      n: pctInt(0, 40),
      at: pctInt(-5, 130),
      seed: pctInt(1, 1000),
    });
    pctForAll(cases, ({ n, at, seed }) => {
      const xs: number[] = [];
      let x = 0;
      for (let i = 0; i < n; i++) xs.push((x += (seed * (i + 7)) % 5));
      const c = of(xs.map((v) => [v, 0] as const));
      let walk = -1;
      for (let i = 0; i < n; i++) if (xs[i] <= at) walk = i;
      expect(pctIndexAt(c, at)).toBe(walk);
    });
  });
});

describe('pctValueAt', () => {
  it('has nothing to say without readings', () => {
    expect(pctValueAt(of([]), 5, 'step')).toBeNull();
    expect(pctValueAt(of([]), 5, 'linear')).toBeNull();
    expect(pctValueAt(of([]), 5, 'step-before')).toBeNull();
  });

  it('holds a reading until the next on a step, and stops in a gap', () => {
    expect(pctValueAt(series, 5, 'step')).toBeNull();
    expect(pctValueAt(series, 10, 'step')).toBe(1);
    expect(pctValueAt(series, 15, 'step')).toBe(1);
    expect(pctValueAt(series, 25, 'step')).toBe(3);
    expect(pctValueAt(series, 30, 'step')).toBeNull();
    expect(pctValueAt(series, 35, 'step')).toBeNull();
    expect(pctValueAt(series, 40, 'step')).toBe(7);
  });

  it('holds the last reading as far as the end it is given, and no further', () => {
    expect(pctValueAt(series, 45, 'step')).toBeNull();
    expect(pctValueAt(series, 45, 'step', 50)).toBe(7);
    expect(pctValueAt(series, 50, 'step', 50)).toBe(7);
    expect(pctValueAt(series, 50.1, 'step', 50)).toBeNull();
    expect(pctValueAt(series, 45, 'step-middle', 50)).toBe(7);
    expect(pctValueAt(series, 45, 'linear', 50)).toBeNull();
  });

  it('interpolates a line between two readings, and not across a gap', () => {
    expect(pctValueAt(series, 10, 'linear')).toBe(1);
    expect(pctValueAt(series, 15, 'linear')).toBe(2);
    expect(pctValueAt(series, 12.5, 'linear')).toBe(1.5);
    expect(pctValueAt(series, 25, 'linear')).toBeNull();
    expect(pctValueAt(series, 35, 'linear')).toBeNull();
    expect(pctValueAt(series, 40, 'linear')).toBe(7);
    expect(pctValueAt(series, 41, 'linear')).toBeNull();
    expect(pctValueAt(series, 9, 'linear')).toBeNull();
  });

  it('takes the next reading on a step drawn before', () => {
    expect(pctValueAt(series, 5, 'step-before')).toBeNull();
    expect(pctValueAt(series, 10, 'step-before')).toBe(1);
    expect(pctValueAt(series, 11, 'step-before')).toBe(3);
    expect(pctValueAt(series, 20, 'step-before')).toBe(3);
    expect(pctValueAt(series, 21, 'step-before')).toBeNull();
    // after the gap the step starts at the next reading
    expect(pctValueAt(series, 31, 'step-before')).toBeNull();
    expect(pctValueAt(series, 40, 'step-before')).toBe(7);
    expect(pctValueAt(series, 41, 'step-before')).toBeNull();
  });

  it('starts again at the reading after a gap, as the path does', () => {
    const gap = of([
      [0, 1],
      [1, NaN],
      [2, 3],
    ]);
    expect(pctValueAt(gap, 1.6, 'step-before')).toBeNull();
    expect(pctValueAt(gap, 1.6, 'step-middle')).toBeNull();
    expect(pctValueAt(gap, 2, 'step-before')).toBe(3);
    expect(pctValueAt(gap, 2, 'step-middle')).toBe(3);
    expect(pctValueAt(gap, 0.4, 'step-middle')).toBe(1);
    expect(pctValueAt(gap, 0.6, 'step-middle')).toBeNull();
  });

  it('switches halfway on a step drawn in the middle', () => {
    expect(pctValueAt(series, 14.9, 'step-middle')).toBe(1);
    expect(pctValueAt(series, 15, 'step-middle')).toBe(3);
    expect(pctValueAt(series, 24, 'step-middle')).toBe(3);
    expect(pctValueAt(series, 25, 'step-middle')).toBeNull();
    expect(pctValueAt(series, 34, 'step-middle')).toBeNull();
    // after the gap the step starts at the next reading, not halfway to it
    expect(pctValueAt(series, 35, 'step-middle')).toBeNull();
    expect(pctValueAt(series, 40, 'step-middle')).toBe(7);
  });
});

describe('pctValueAt, monotone', () => {
  const rising = of([
    [0, 0],
    [1, 1],
    [2, 3],
  ]);

  it('reads the cubic the path draws: through the readings, bent by the monotone tangents', () => {
    expect(pctValueAt(rising, 0, 'monotone')).toBe(0);
    expect(pctValueAt(rising, 1, 'monotone')).toBe(1);
    expect(pctValueAt(rising, 0.5, 'monotone')).toBe(0.40625);
  });

  it('reads two readings as a line', () => {
    const two = of([
      [0, 0],
      [2, 4],
    ]);
    expect(pctValueAt(two, 1, 'monotone')).toBe(2);
    expect(pctValueAt(two, 0.5, 'monotone')).toBe(1);
  });

  it('bends by the neighbours on both sides, and not past a gap', () => {
    const four = of([
      [0, 0],
      [1, 1],
      [2, 3],
      [3, 3],
    ]);
    // The fourth reading changes the tangent at the third, so the stretch before it.
    expect(pctValueAt(four, 1.5, 'monotone')).not.toBe(
      pctValueAt(rising, 1.5, 'monotone'),
    );
    // Not the stretch before the second, whose tangents the fourth does not reach.
    expect(pctValueAt(four, 0.5, 'monotone')).toBe(0.40625);
    // Past a gap, the fourth reading is no neighbour.
    const gapped = of([
      [0, 0],
      [1, 1],
      [2, 3],
      [3, NaN],
      [4, 3],
    ]);
    expect(pctValueAt(gapped, 1.5, 'monotone')).toBe(
      pctValueAt(rising, 1.5, 'monotone'),
    );
    expect(pctValueAt(gapped, 3.5, 'monotone')).toBeNull();
  });

  it('never overshoots: between two readings the value stays between them', () => {
    const hump = of([
      [0, 0],
      [1, 10],
      [2, 10.5],
      [3, 0],
    ]);
    for (let x = 1; x <= 2; x += 0.05) {
      const v = pctValueAt(hump, x, 'monotone')!;
      expect(v).toBeGreaterThanOrEqual(10);
      expect(v).toBeLessThanOrEqual(10.5);
    }
  });
});
