import type { PctColumns } from './columns';
import { pctDomainOf, pctExtent } from './extent';

const of = (points: readonly (readonly [number, number])[]): PctColumns => ({
  xs: Float64Array.from(points.map((p) => p[0])),
  ys: Float64Array.from(points.map((p) => p[1])),
  length: points.length,
});

const series = of([
  [0, 50],
  [10, 1],
  [20, 9],
  [30, NaN],
  [40, -4],
  [50, 100],
]);

describe('pctExtent', () => {
  it('takes the readings inside the window', () => {
    expect(pctExtent(series, { from: 5, to: 25 }, 'step')).toEqual([1, 50]);
    expect(pctExtent(series, { from: 10, to: 20 }, 'step')).toEqual([1, 9]);
  });

  it('carries the reading that holds into the window on a step', () => {
    // the window starts at 12, where 1 still holds, and holds only that
    expect(pctExtent(series, { from: 12, to: 18 }, 'step')).toEqual([1, 1]);
  });

  it('interpolates the edges of a line', () => {
    expect(pctExtent(series, { from: 12, to: 18 }, 'linear')).toEqual([
      2.6, 7.4,
    ]);
    expect(pctExtent(series, { from: 5, to: 10 }, 'linear')).toEqual([1, 25.5]);
  });

  it('leaves a gap out', () => {
    expect(pctExtent(series, { from: 31, to: 39 }, 'step')).toBeNull();
    expect(pctExtent(series, { from: 25, to: 45 }, 'step')).toEqual([-4, 9]);
  });

  it('stops before the edge readings it already took as edges', () => {
    // a reading exactly on `to` is the edge value; the one after it is not in the window
    expect(pctExtent(series, { from: 41, to: 50 }, 'step')).toEqual([-4, 100]);
    expect(pctExtent(series, { from: 41, to: 49 }, 'step')).toEqual([-4, -4]);
  });

  it('carries the last value to the end given', () => {
    expect(pctExtent(series, { from: 55, to: 60 }, 'step')).toBeNull();
    expect(pctExtent(series, { from: 55, to: 60 }, 'step', 70)).toEqual([
      100, 100,
    ]);
  });
});

describe('pctDomainOf', () => {
  it('widens the union of the extents to nice ticks', () => {
    expect(
      pctDomainOf(
        [
          [18.2, 22.4],
          [19, 23.1],
        ],
        { target: 5 },
      ),
    ).toEqual([18, 24]);
    expect(pctDomainOf([[18.2, 22.4], null], { target: 5 })).toEqual([18, 23]);
  });

  it('keeps zero in when asked', () => {
    expect(
      pctDomainOf([[18.2, 22.4]], { target: 5, includeZero: true }),
    ).toEqual([0, 25]);
    expect(pctDomainOf([[-7, -2]], { target: 5, includeZero: true })).toEqual([
      -7, 0,
    ]);
  });

  it('stands a single value in the middle', () => {
    expect(pctDomainOf([[20, 20]], { target: 4 })).toEqual([19, 21]);
    expect(pctDomainOf([[-20, -20]], { target: 4 })).toEqual([-21, -19]);
    expect(pctDomainOf([[0, 0]], { target: 4 })).toEqual([-1, 1]);
  });

  it("puts the consumer's ends over everything", () => {
    expect(pctDomainOf([[18.2, 22.4]], { target: 5, floor: 0 })).toEqual([
      0, 23,
    ]);
    expect(pctDomainOf([[18.2, 22.4]], { target: 5, ceiling: 40 })).toEqual([
      18, 40,
    ]);
    expect(
      pctDomainOf([[18.2, 22.4]], { target: 5, floor: 15, ceiling: 30 }),
    ).toEqual([15, 30]);
  });

  it("keeps a domain the consumer's ends would turn over", () => {
    expect(pctDomainOf([[-9, -5]], { target: 5, floor: 0 })).toEqual([0, 1]);
    expect(pctDomainOf([[50, 60]], { target: 5, ceiling: 10 })).toEqual([
      9, 10,
    ]);
  });

  it("shows [0, 1] when nothing is drawn, within the consumer's ends", () => {
    expect(pctDomainOf([], { target: 5 })).toEqual([0, 1]);
    expect(pctDomainOf([null], { target: 5 })).toEqual([0, 1]);
    expect(pctDomainOf([], { target: 5, floor: 5 })).toEqual([5, 6]);
    expect(pctDomainOf([], { target: 5, ceiling: 5 })).toEqual([4, 5]);
    expect(pctDomainOf([], { target: 5, floor: -2, ceiling: 8 })).toEqual([
      -2, 8,
    ]);
    expect(pctDomainOf([], { target: 5, floor: 8, ceiling: 2 })).toEqual([
      8, 9,
    ]);
  });
});
