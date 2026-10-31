import {
  pctLargestSize,
  pctNearestPoint,
  pctPointAt,
  pctPointRadius,
  pctPointsIn,
  pctPointsOf,
  pctThinPoints,
} from './points';

describe('pctPointsOf', () => {
  const rows = [
    { at: 30, value: 3, area: 12 },
    { at: 10, value: 1, area: 4 },
    { at: 20, value: null, area: 8 },
    { at: 20, value: 2, area: undefined },
    { at: NaN, value: 9, area: 1 },
    { at: 10, value: 1.5, area: -2 },
  ];

  it('orders the points by x, rows at one x in their own order, and drops a row with no point', () => {
    const points = pctPointsOf(rows, 'at', 'value', 'area');
    expect([...points.xs]).toEqual([10, 10, 20, 30]);
    expect([...points.ys]).toEqual([1, 1.5, 2, 3]);
    expect([...points.rows]).toEqual([1, 5, 3, 0]);
    expect(points.length).toBe(4);
  });

  it('reads a size where there is one and NaN where there is none', () => {
    const points = pctPointsOf(rows, 'at', 'value', 'area');
    expect([...points.sizes]).toEqual([4, -2, NaN, 12]);
    const unsized = pctPointsOf(rows, 'at', 'value');
    expect([...unsized.sizes].every(Number.isNaN)).toBe(true);
  });

  it('reads by a function of the row too, and a size that is no finite number as none', () => {
    const points = pctPointsOf(
      [[1, 2] as const, [0, 5] as const, [2, 1] as const],
      (r) => r[0],
      (r) => r[1],
      (r, i) => (i === 0 ? null : i === 2 ? Infinity : i),
    );
    expect([...points.xs]).toEqual([0, 1, 2]);
    expect([...points.ys]).toEqual([5, 2, 1]);
    expect([...points.sizes]).toEqual([1, NaN, NaN]);
  });

  it('is empty for no rows', () => {
    const points = pctPointsOf(
      [] as { at: number; value: number }[],
      'at',
      'value',
    );
    expect(points.length).toBe(0);
    expect(pctLargestSize(points)).toBe(0);
  });
});

describe('pctLargestSize', () => {
  it('is the largest finite size, and zero when every size is none or below it', () => {
    const points = pctPointsOf(
      [
        { x: 1, y: 1, s: 3 },
        { x: 2, y: 1, s: 7 },
        { x: 3, y: 1, s: null },
      ],
      'x',
      'y',
      's',
    );
    expect(pctLargestSize(points)).toBe(7);
    expect(
      pctLargestSize(pctPointsOf([{ x: 1, y: 1, s: -3 }], 'x', 'y', 's')),
    ).toBe(0);
  });
});

describe('pctPointRadius', () => {
  it('grows the area with the size: the largest takes the largest radius, a quarter of it half', () => {
    expect(pctPointRadius(100, 100, 16, 2)).toBe(16);
    expect(pctPointRadius(25, 100, 16, 2)).toBe(8);
    expect(pctPointRadius(1, 100, 16, 2)).toBe(2);
  });

  it('never goes under the least radius: no size, zero, a negative one, or no largest', () => {
    expect(pctPointRadius(NaN, 100, 16, 2)).toBe(2);
    expect(pctPointRadius(0, 100, 16, 2)).toBe(2);
    expect(pctPointRadius(-5, 100, 16, 2)).toBe(2);
    expect(pctPointRadius(5, 0, 16, 2)).toBe(2);
  });

  it('caps a size over the largest at the largest radius', () => {
    expect(pctPointRadius(400, 100, 16, 2)).toBe(16);
  });
});

describe('pctThinPoints', () => {
  it('keeps the first point of every cell and drops the rest of it', () => {
    const kept = pctThinPoints(
      [0.5, 1.5, 2.5, 0.2, 3.9],
      [0.5, 1.9, 0.5, 0.9, 3.9],
      [1, 1, 1, 1, 1],
      2,
    );
    // (0,0) twice, (1,0) once, (1,1) once
    expect([...kept]).toEqual([0, 2, 4]);
  });

  it('keeps every point wider than `over`, whatever shares its cell — one as wide as it is thinned', () => {
    const kept = pctThinPoints([1, 1, 1], [1, 1, 1], [1, 3, 2.5], 2, 2);
    expect([...kept]).toEqual([0, 1, 2]);
    expect([...pctThinPoints([1, 1], [1, 1], [2, 2], 2, 2)]).toEqual([0]);
  });

  it('reads a cell of nothing as one pixel', () => {
    expect([
      ...pctThinPoints([0.2, 0.7, 1.2], [0, 0, 0], [0, 0, 0], 0),
    ]).toEqual([0, 2]);
  });

  it('keeps fifty thousand rows under a mark per cell', () => {
    const n = 50_000;
    const xs = new Float64Array(n);
    const ys = new Float64Array(n);
    const radii = new Float64Array(n).fill(4);
    let seed = 7;
    for (let i = 0; i < n; i++) {
      seed = (seed * 48271) % 2147483647;
      xs[i] = (seed / 2147483647) * 600;
      seed = (seed * 48271) % 2147483647;
      ys[i] = (seed / 2147483647) * 300;
    }
    const kept = pctThinPoints(xs, ys, radii, 2);
    expect(kept.length).toBeLessThanOrEqual(300 * 150);
    expect(kept.length).toBeLessThan(n);
  });
});

describe('pctNearestPoint', () => {
  it('finds the point nearest by distance, not by x', () => {
    const near = pctNearestPoint([0, 10, 11], [0, 100, 3], 10, 0);
    expect(near).toEqual({ index: 2, distance: Math.hypot(1, 3) });
  });

  it('takes the first of two at one distance, and nothing of none', () => {
    expect(pctNearestPoint([1, 3], [0, 0], 2, 0)).toEqual({
      index: 0,
      distance: 1,
    });
    expect(pctNearestPoint([], [], 2, 0)).toBeNull();
  });
});

describe('pctPointsIn and pctPointAt', () => {
  const points = pctPointsOf(
    [10, 20, 20, 30, 40].map((at) => ({ at, v: 1 })),
    'at',
    'v',
  );

  it('gives the run inside the window, the end included', () => {
    expect(pctPointsIn(points, { from: 20, to: 30 })).toEqual([1, 4]);
    expect(pctPointsIn(points, { from: 15, to: 25 })).toEqual([1, 3]);
    expect(pctPointsIn(points, { from: 50, to: 60 })).toEqual([5, 5]);
    expect(pctPointsIn(points, { from: 0, to: 5 })).toEqual([0, 0]);
  });

  it('finds the first point at exactly x, and -1 between points', () => {
    expect(pctPointAt(points, 20)).toBe(1);
    expect(pctPointAt(points, 40)).toBe(4);
    expect(pctPointAt(points, 25)).toBe(-1);
    expect(pctPointAt(points, 50)).toBe(-1);
  });
});
