import { pctIndicesIn, pctWindowFollow, pctWindowTransform } from './window';
import {
  pctDecimal,
  pctForAll,
  pctRecord,
} from '../../../testing/src/property.testkit';

const w = (from: number, to: number) => ({ from, to });

describe('pctWindowTransform', () => {
  it('leaves the window as it is with no change', () => {
    expect(pctWindowTransform(w(100, 200), {}, null, 1)).toEqual(w(100, 200));
  });

  it('zooms about the anchor, which stays put', () => {
    expect(pctWindowTransform(w(0, 100), { factor: 2 }, null, 1)).toEqual(
      w(25, 75),
    );
    expect(
      pctWindowTransform(w(0, 100), { factor: 2, anchor: 0 }, null, 1),
    ).toEqual(w(0, 50));
    expect(
      pctWindowTransform(w(0, 100), { factor: 2, anchor: 1 }, null, 1),
    ).toEqual(w(50, 100));
    expect(
      pctWindowTransform(w(0, 100), { factor: 0.5, anchor: 0.25 }, null, 1),
    ).toEqual(w(-25, 175));
  });

  it('pans by a share of the new span, later when positive', () => {
    expect(pctWindowTransform(w(0, 100), { shift: 0.1 }, null, 1)).toEqual(
      w(10, 110),
    );
    expect(pctWindowTransform(w(0, 100), { shift: -0.5 }, null, 1)).toEqual(
      w(-50, 50),
    );
    expect(
      pctWindowTransform(
        w(0, 100),
        { factor: 2, anchor: 0, shift: 1 },
        null,
        1,
      ),
    ).toEqual(w(50, 100));
  });

  it('is never narrower than the shortest span', () => {
    expect(
      pctWindowTransform(w(0, 100), { factor: 10, anchor: 0 }, null, 40),
    ).toEqual(w(0, 40));
    expect(
      pctWindowTransform(w(0, 100), { factor: 10, anchor: 0 }, null, 10),
    ).toEqual(w(0, 10));
  });

  it('is never wider than the limits, and stops at them without shrinking', () => {
    const limits = w(0, 1000);
    expect(pctWindowTransform(w(0, 100), { factor: 0.01 }, limits, 1)).toEqual(
      w(0, 1000),
    );
    expect(pctWindowTransform(w(900, 1000), { shift: 1 }, limits, 1)).toEqual(
      w(900, 1000),
    );
    expect(pctWindowTransform(w(0, 100), { shift: -1 }, limits, 1)).toEqual(
      w(0, 100),
    );
    expect(pctWindowTransform(w(850, 950), { shift: 1 }, limits, 1)).toEqual(
      w(900, 1000),
    );
    expect(pctWindowTransform(w(50, 150), { shift: -1 }, limits, 1)).toEqual(
      w(0, 100),
    );
  });

  it('reads the limits as a span, wherever they start', () => {
    expect(
      pctWindowTransform(w(5000, 5100), { factor: 0.01 }, w(5000, 6000), 1),
    ).toEqual(w(5000, 6000));
  });

  it('zooms nowhere by a factor of zero, below it or not a number', () => {
    for (const factor of [0, -2, NaN]) {
      expect(pctWindowTransform(w(0, 100), { factor }, null, 1)).toEqual(
        w(0, 100),
      );
    }
  });

  it('stays inside limits whose span the arithmetic cannot write exactly', () => {
    const limits = w(0.1, 0.7 + 1e-17);
    const next = pctWindowTransform(
      w(0.2, 0.3),
      { factor: 0.0001, shift: 1 },
      limits,
      0.01,
    );
    expect(next.from).toBeGreaterThanOrEqual(limits.from);
    expect(next.to).toBeLessThanOrEqual(limits.to);
  });

  it('lets the limits win over a shortest span wider than them', () => {
    expect(pctWindowTransform(w(0, 10), {}, w(0, 50), 100)).toEqual(w(0, 50));
  });

  it('keeps every move inside the limits, its span between the shortest and the widest', () => {
    const cases = pctRecord({
      from: pctDecimal(0, 900, 1),
      span: pctDecimal(1, 100, 1),
      factor: pctDecimal(0.1, 10, 2),
      anchor: pctDecimal(0, 1, 2),
      shift: pctDecimal(-2, 2, 2),
    });
    pctForAll(cases, ({ from, span, factor, anchor, shift }) => {
      const next = pctWindowTransform(
        w(from, from + span),
        { factor, anchor, shift },
        w(0, 1000),
        5,
      );
      expect(next.from).toBeGreaterThanOrEqual(0);
      expect(next.to).toBeLessThanOrEqual(1000 + 1e-9);
      expect(next.to - next.from).toBeGreaterThanOrEqual(5 - 1e-9);
      expect(next.to - next.from).toBeCloseTo(
        Math.min(1000, Math.max(5, span / factor)),
        6,
      );
    });
  });
});

describe('pctWindowFollow', () => {
  it('moves a window that had reached the present along with it', () => {
    expect(pctWindowFollow(w(0, 100), 100, 130)).toEqual(w(30, 130));
    expect(pctWindowFollow(w(0, 120), 100, 130)).toEqual(w(30, 150));
  });

  it('leaves a window the reader moved into the past', () => {
    expect(pctWindowFollow(w(0, 99), 100, 130)).toEqual(w(0, 99));
  });
});

describe('pctIndicesIn', () => {
  const xs = Float64Array.of(0, 10, 20, 30);

  it('finds the positions inside the window, and one beyond each edge', () => {
    expect(pctIndicesIn(xs, w(12, 18))).toEqual([1, 3]);
    expect(pctIndicesIn(xs, w(10, 20))).toEqual([0, 4]);
    expect(pctIndicesIn(xs, w(-5, 35))).toEqual([0, 4]);
  });

  it('widens by the margin it is given, and no further than the ends', () => {
    expect(pctIndicesIn(xs, w(12, 18), 0)).toEqual([2, 2]);
    expect(pctIndicesIn(xs, w(10, 20), 0)).toEqual([1, 3]);
    expect(pctIndicesIn(xs, w(12, 18), 5)).toEqual([0, 4]);
  });

  it('finds nothing but the neighbours past the ends, and nothing in nothing', () => {
    expect(pctIndicesIn(xs, w(40, 50))).toEqual([3, 4]);
    expect(pctIndicesIn(xs, w(-10, -5))).toEqual([0, 1]);
    expect(pctIndicesIn(new Float64Array(), w(0, 1))).toEqual([0, 0]);
  });
});
