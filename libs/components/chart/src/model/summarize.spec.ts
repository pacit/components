import type { PctColumns } from './columns';
import { pctSummarize } from './summarize';

const of = (points: readonly (readonly [number, number])[]): PctColumns => ({
  xs: Float64Array.from(points.map((p) => p[0])),
  ys: Float64Array.from(points.map((p) => p[1])),
  length: points.length,
});

const readings = of([
  [0, 1],
  [10, 2],
  [20, NaN],
  [30, 4],
  [40, 5],
]);

describe('pctSummarize', () => {
  it('sums and averages the readings inside the window, both ends included', () => {
    expect(pctSummarize(readings, { from: 0, to: 40 }, 'sum')).toBe(12);
    expect(pctSummarize(readings, { from: 0, to: 40 }, 'mean')).toBe(3);
    expect(pctSummarize(readings, { from: 10, to: 30 }, 'sum')).toBe(6);
    expect(pctSummarize(readings, { from: 10, to: 30 }, 'mean')).toBe(3);
  });

  it('takes a reading on either edge, and none just outside', () => {
    expect(pctSummarize(readings, { from: 10, to: 10 }, 'sum')).toBe(2);
    expect(pctSummarize(readings, { from: 10.5, to: 29.5 }, 'sum')).toBeNull();
    expect(pctSummarize(readings, { from: 29.5, to: 30 }, 'sum')).toBe(4);
    expect(pctSummarize(readings, { from: 30, to: 30.5 }, 'sum')).toBe(4);
    expect(pctSummarize(readings, { from: -5, to: 0 }, 'sum')).toBe(1);
  });

  it('skips a gap, and answers nothing where every reading is one', () => {
    expect(pctSummarize(readings, { from: 15, to: 25 }, 'mean')).toBeNull();
    expect(pctSummarize(readings, { from: 15, to: 35 }, 'mean')).toBe(4);
  });

  it('answers nothing for no readings, or a window before or after them', () => {
    expect(pctSummarize(of([]), { from: 0, to: 1 }, 'sum')).toBeNull();
    expect(pctSummarize(readings, { from: -10, to: -1 }, 'sum')).toBeNull();
    expect(pctSummarize(readings, { from: 41, to: 50 }, 'mean')).toBeNull();
  });
});
