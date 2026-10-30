import { pctBand, pctLinear, pctLog } from './scale';
import {
  pctDecimal,
  pctForAll,
  pctRecord,
} from '../../../testing/src/property.testkit';

describe('pctLinear', () => {
  it('maps a value onto the range and back', () => {
    const y = pctLinear([0, 40], [300, 0]);
    expect(y.domain).toEqual([0, 40]);
    expect(y.range).toEqual([300, 0]);
    expect(y.map(0)).toBe(300);
    expect(y.map(10)).toBe(225);
    expect(y.map(40)).toBe(0);
    expect(y.invert(150)).toBe(20);
    expect(y.invert(300)).toBe(0);
  });

  it('extrapolates outside the domain, so a line leaves the plot at its edge', () => {
    const x = pctLinear([10, 20], [100, 200]);
    expect(x.map(30)).toBe(300);
    expect(x.map(0)).toBe(0);
    expect(x.invert(50)).toBe(5);
  });

  it('draws a domain of one value across the middle of the range', () => {
    const flat = pctLinear([7, 7], [300, 100]);
    expect(flat.map(7)).toBe(200);
    expect(flat.map(-1000)).toBe(200);
    expect(flat.invert(0)).toBe(7);
  });

  it('inverts what it maps, for any domain and range', () => {
    const cases = pctRecord({
      d0: pctDecimal(-1000, 1000, 2),
      span: pctDecimal(0.01, 2000, 2),
      r0: pctDecimal(-500, 500, 1),
      r1: pctDecimal(-500, 500, 1),
      v: pctDecimal(-3000, 3000, 2),
    });
    pctForAll(cases, ({ d0, span, r0, r1, v }) => {
      if (r0 === r1) return;
      const s = pctLinear([d0, d0 + span], [r0, r1]);
      expect(s.invert(s.map(v))).toBeCloseTo(v, 6);
    });
  });
});

describe('pctLog', () => {
  it('spaces the decades evenly', () => {
    const y = pctLog([1, 1000], [300, 0]);
    expect(y.domain).toEqual([1, 1000]);
    expect(y.range).toEqual([300, 0]);
    expect(y.map(1)).toBe(300);
    expect(y.map(10)).toBeCloseTo(200, 9);
    expect(y.map(100)).toBeCloseTo(100, 9);
    expect(y.map(1000)).toBeCloseTo(0, 9);
    expect(y.invert(100)).toBeCloseTo(100, 9);
  });

  it('has no position for zero or a negative value', () => {
    const y = pctLog([1, 100], [100, 0]);
    expect(y.map(0)).toBeNaN();
    expect(y.map(-5)).toBeNaN();
    expect(y.map(Number.MIN_VALUE)).not.toBeNaN();
  });
});

describe('pctBand', () => {
  it('gives each category an equal slot and a band four fifths of it, centred', () => {
    const days = pctBand(31, [0, 620]);
    expect(days.count).toBe(31);
    expect(days.range).toEqual([0, 620]);
    expect(days.step).toBe(20);
    expect(days.bandwidth).toBe(16);
    expect(days.band(0)).toEqual([2, 18]);
    expect(days.band(30)).toEqual([602, 618]);
    expect(days.middle(0)).toBe(10);
    expect(days.middle(30)).toBe(610);
  });

  it('takes the free share of a slot as asked', () => {
    const tight = pctBand(4, [0, 100], 0);
    expect(tight.bandwidth).toBe(25);
    expect(tight.band(1)).toEqual([25, 50]);
    const loose = pctBand(4, [0, 100], 0.5);
    expect(loose.band(1)).toEqual([31.25, 43.75]);
  });

  it('finds the slot under a position, and none outside them', () => {
    const b = pctBand(5, [100, 200]);
    expect(b.indexAt(100)).toBe(0);
    expect(b.indexAt(119.99)).toBe(0);
    expect(b.indexAt(120)).toBe(1);
    expect(b.indexAt(199.99)).toBe(4);
    expect(b.indexAt(200)).toBe(-1);
    expect(b.indexAt(99.99)).toBe(-1);
  });

  it('runs backwards along a reversed range', () => {
    const b = pctBand(2, [100, 0], 0);
    expect(b.step).toBe(-50);
    expect(b.band(0)).toEqual([100, 50]);
    expect(b.indexAt(75)).toBe(0);
    expect(b.indexAt(25)).toBe(1);
  });

  it('has no slot at all without categories', () => {
    const none = pctBand(0, [0, 100]);
    expect(none.step).toBe(0);
    expect(none.bandwidth).toBe(0);
    expect(none.indexAt(50)).toBe(-1);
  });
});
