import { pctFactsOf } from './describe';
import {
  pctDecimal,
  pctForAll,
  pctRecord,
} from '../../../testing/src/property.testkit';

const columns = (xs: readonly number[], ys: readonly number[]) => ({
  xs: Float64Array.from(xs),
  ys: Float64Array.from(ys),
  length: xs.length,
});

describe('pctFactsOf', () => {
  it('reads the lowest, the highest and the last reading', () => {
    expect(pctFactsOf(columns([0, 1, 2, 3], [5, 2, 9, 4]), null)).toEqual({
      min: 2,
      max: 9,
      last: 4,
      trend: 'rising',
      gaps: 0,
      count: 4,
    });
  });

  it('reads only the readings inside the window, its ends included', () => {
    const c = columns([0, 1, 2, 3, 4], [100, 1, 2, 3, -100]);
    expect(pctFactsOf(c, { from: 1, to: 3 })).toMatchObject({
      min: 1,
      max: 3,
      last: 3,
      count: 3,
    });
    expect(pctFactsOf(c, { from: 0.5, to: 3.5 })?.count).toBe(3);
    // a window that opens before the first reading starts at the first one
    expect(pctFactsOf(c, { from: -1, to: 1 })).toMatchObject({
      min: 1,
      max: 100,
      count: 2,
    });
    expect(pctFactsOf(c, { from: 5, to: 6 })).toBeNull();
  });

  it('sums up nothing in nothing, and nothing in gaps alone', () => {
    expect(pctFactsOf(columns([], []), null)).toBeNull();
    expect(pctFactsOf(columns([0, 1], [NaN, NaN]), null)).toBeNull();
  });

  it('counts a silence between two readings as a gap, and none at either end', () => {
    expect(
      pctFactsOf(columns([0, 1, 2, 3, 4], [NaN, 1, NaN, 2, NaN]), null)?.gaps,
    ).toBe(1);
    expect(
      pctFactsOf(columns([0, 1, 2, 3, 4, 5], [1, NaN, NaN, 2, NaN, 3]), null)
        ?.gaps,
    ).toBe(2);
  });

  it('rises, falls or stays flat by the line that fits the readings', () => {
    expect(pctFactsOf(columns([0, 1, 2], [1, 2, 3]), null)?.trend).toBe(
      'rising',
    );
    expect(pctFactsOf(columns([0, 1, 2], [3, 2, 1]), null)?.trend).toBe(
      'falling',
    );
    // a constant series is flat, not falling
    expect(pctFactsOf(columns([0, 1, 2], [4, 4, 4]), null)?.trend).toBe('flat');
    // one reading has no trend, nor readings all at one position
    expect(pctFactsOf(columns([5], [1]), null)?.trend).toBeNull();
    expect(pctFactsOf(columns([5, 5], [1, 2]), null)?.trend).toBeNull();
  });

  it('is flat while the fitted change stays within a tenth of the range, at it included', () => {
    const at = (ys: number[]) =>
      pctFactsOf(columns([0, 1, 2], ys), null)?.trend;
    // ys 0, 10, 1: slope 0.5, change 1 = a tenth of 10
    expect(at([0, 10, 1])).toBe('flat');
    // ys 0, 10, 1.2: change 1.2, past a tenth of 10
    expect(at([0, 10, 1.2])).toBe('rising');
    expect(at([1.2, 10, 0])).toBe('falling');
  });

  it('fits instants since 1970 without losing the slope', () => {
    const t = Date.UTC(2026, 9, 25);
    const h = 3_600_000;
    expect(
      pctFactsOf(columns([t, t + h, t + 2 * h], [20, 20.5, 21]), null)?.trend,
    ).toBe('rising');
    // the change is read over the readings' own span, not from 1970: 0, 10, 10, 1 stays flat
    expect(
      pctFactsOf(
        columns([t, t + h, t + 2 * h, t + 3 * h], [0, 10, 10, 1]),
        null,
      )?.trend,
    ).toBe('flat');
    // positions are taken from the first reading: far from zero, squares would drown the slope
    expect(
      pctFactsOf(
        columns([1e15, 1e15 + 1, 1e15 + 2, 1e15 + 3], [0, 1, 2, 3]),
        null,
      )?.trend,
    ).toBe('rising');
  });

  it('always holds its readings between the lowest and the highest', () => {
    pctForAll(
      pctRecord({
        a: pctDecimal(-50, 50, 2),
        b: pctDecimal(-50, 50, 2),
        c: pctDecimal(-50, 50, 2),
      }),
      ({ a, b, c }) => {
        const s = pctFactsOf(columns([0, 1, 2], [a, b, c]), null)!;
        expect(s.min).toBe(Math.min(a, b, c));
        expect(s.max).toBe(Math.max(a, b, c));
        expect(s.last).toBe(c);
        expect(s.count).toBe(3);
      },
    );
  });
});
