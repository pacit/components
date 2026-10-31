import {
  pctFractionDigits,
  pctLogDomain,
  pctLogTicks,
  pctNice,
  pctNiceStep,
  pctTicks,
} from './ticks';
import {
  pctDecimal,
  pctForAll,
  pctInt,
  pctRecord,
} from '../../../testing/src/property.testkit';

describe('pctNiceStep', () => {
  it('takes 1, 2 or 5 times a power of ten, nearest the target', () => {
    expect(pctNiceStep(37, 5)).toBe(10);
    expect(pctNiceStep(0.8, 4)).toBe(0.2);
    expect(pctNiceStep(100, 4)).toBe(20);
    expect(pctNiceStep(100, 10)).toBe(10);
    expect(pctNiceStep(100, 2)).toBe(50);
    expect(pctNiceStep(1234, 5)).toBe(200);
  });

  it('switches factor at the geometric middles', () => {
    // raw step 1.41 and 1.42 sit either side of √2
    expect(pctNiceStep(1.41, 1)).toBe(1);
    expect(pctNiceStep(1.42, 1)).toBe(2);
    // either side of √10
    expect(pctNiceStep(3.16, 1)).toBe(2);
    expect(pctNiceStep(3.17, 1)).toBe(5);
    // either side of √50
    expect(pctNiceStep(7.07, 1)).toBe(5);
    expect(pctNiceStep(7.08, 1)).toBe(10);
    // exactly on a power of ten
    expect(pctNiceStep(1, 1)).toBe(1);
    // exactly on each middle, which belongs to the larger factor
    expect(pctNiceStep(Math.SQRT2, 1)).toBe(2);
    expect(pctNiceStep(Math.sqrt(10), 1)).toBe(5);
    expect(pctNiceStep(Math.SQRT2 * 5, 1)).toBe(10);
  });

  it('gives no step for an empty span or no room', () => {
    expect(pctNiceStep(0, 5)).toBe(0);
    expect(pctNiceStep(-3, 5)).toBe(0);
    expect(pctNiceStep(10, 0)).toBe(0);
    expect(pctNiceStep(NaN, 5)).toBe(0);
    expect(pctNiceStep(10, NaN)).toBe(0);
    expect(pctNiceStep(Infinity, 5)).toBe(0);
    expect(pctNiceStep(10, -2)).toBe(0);
  });
});

describe('pctFractionDigits', () => {
  it('counts the digits a step needs after the point', () => {
    expect(pctFractionDigits(10)).toBe(0);
    expect(pctFractionDigits(1)).toBe(0);
    expect(pctFractionDigits(0.5)).toBe(1);
    expect(pctFractionDigits(0.1)).toBe(1);
    expect(pctFractionDigits(0.05)).toBe(2);
    expect(pctFractionDigits(0.002)).toBe(3);
    expect(pctFractionDigits(0)).toBe(0);
    expect(pctFractionDigits(-1)).toBe(0);
  });
});

describe('pctTicks', () => {
  it('lists the multiples of the step inside the domain, ends included', () => {
    expect(pctTicks([0, 37], 5)).toEqual([0, 10, 20, 30]);
    expect(pctTicks([0, 40], 5)).toEqual([0, 10, 20, 30, 40]);
    expect(pctTicks([-12, 12], 5)).toEqual([-10, -5, 0, 5, 10]);
    expect(pctTicks([3.2, 36.5], 5)).toEqual([5, 10, 15, 20, 25, 30, 35]);
  });

  it('writes a decimal tick without binary dust', () => {
    expect(pctTicks([0, 1], 10)).toEqual([
      0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1,
    ]);
    expect(pctTicks([0.1, 0.35], 5)).toEqual([0.1, 0.15, 0.2, 0.25, 0.3, 0.35]);
  });

  it('writes ticks of any size, however small', () => {
    expect(pctTicks([0, 1e-102], 5)).toEqual([
      0, 2e-103, 4e-103, 6e-103, 8e-103, 1e-102,
    ]);
  });

  it('gives the one value of a flat domain, and nothing for a broken one', () => {
    expect(pctTicks([5, 5], 5)).toEqual([5]);
    expect(pctTicks([NaN, NaN], 5)).toEqual([]);
    expect(pctTicks([3, 1], 5)).toEqual([]);
  });

  it('keeps every tick inside, on the step, near the target', () => {
    const cases = pctRecord({
      min: pctDecimal(-10000, 10000, 3),
      span: pctDecimal(0.001, 20000, 3),
      target: pctInt(2, 12),
    });
    pctForAll(cases, ({ min, span, target }) => {
      const max = min + span;
      const ticks = pctTicks([min, max], target);
      const step = pctNiceStep(span, target);
      expect(ticks.length).toBeGreaterThanOrEqual(1);
      expect(ticks.length).toBeLessThanOrEqual(target * 2.5 + 1);
      for (const t of ticks) {
        expect(t).toBeGreaterThanOrEqual(min - step * 1e-6);
        expect(t).toBeLessThanOrEqual(max + step * 1e-6);
        expect(Math.abs(t / step - Math.round(t / step))).toBeLessThan(1e-6);
      }
    });
  });
});

describe('pctNice', () => {
  it('widens the domain to the ticks around it', () => {
    expect(pctNice([3.2, 36.5], 5)).toEqual([0, 40]);
    expect(pctNice([18.2, 22.4], 5)).toEqual([18, 23]);
    expect(pctNice([-0.13, 0.92], 5)).toEqual([-0.2, 1]);
    expect(pctNice([0, 40], 5)).toEqual([0, 40]);
  });

  it('settles a step that widening changed', () => {
    // the first pass gives [0, 8] on a step of 2; the second, on that span, settles on 5
    expect(pctNice([1, 7.1], 2)).toEqual([0, 10]);
  });

  it('widens again until its ends are the ticks of its own span', () => {
    expect(pctNice([-1034.139, -1033.546], 2)).toEqual([-1035, -1033]);
  });

  it('leaves a flat or broken domain as it is', () => {
    expect(pctNice([5, 5], 5)).toEqual([5, 5]);
    expect(pctNice([4, 2], 5)).toEqual([4, 2]);
  });

  it('always covers what it was given', () => {
    const cases = pctRecord({
      min: pctDecimal(-10000, 10000, 2),
      span: pctDecimal(0.01, 20000, 2),
      target: pctInt(2, 12),
    });
    pctForAll(cases, ({ min, span, target }) => {
      const [lo, hi] = pctNice([min, min + span], target);
      expect(lo).toBeLessThanOrEqual(min);
      expect(hi).toBeGreaterThanOrEqual(min + span - 1e-9);
      // and its ends are the first and the last of its own ticks
      const ticks = pctTicks([lo, hi], target);
      expect(ticks[0]).toBe(lo);
      expect(ticks.at(-1)).toBe(hi);
    });
  });
});

describe('pctLogDomain', () => {
  it('spans whole decades, the one under the low end to the one over the high', () => {
    expect(pctLogDomain(3, 700)).toEqual([1, 1000]);
    expect(pctLogDomain(0.02, 5)).toEqual([0.01, 10]);
  });

  it('keeps a decade’s ends where the values stand on them', () => {
    expect(pctLogDomain(100, 1000)).toEqual([100, 1000]);
    expect(pctLogDomain(10, 10)).toEqual([10, 100]);
  });

  it('shows the three decades under the top with no positive floor, and a decade with nothing', () => {
    expect(pctLogDomain(0, 500)).toEqual([1, 1000]);
    expect(pctLogDomain(-4, 50)).toEqual([0.1, 100]);
    expect(pctLogDomain(0, 0)).toEqual([1, 10]);
    expect(pctLogDomain(5, -1)).toEqual([1, 10]);
    expect(pctLogDomain(Infinity, -Infinity)).toEqual([1, 10]);
    expect(pctLogDomain(5, 0)).toEqual([1, 10]);
  });
});

describe('pctLogTicks', () => {
  it('ticks 1, 2 and 5 of every decade while they fit', () => {
    expect(pctLogTicks([1, 1000], 10)).toEqual([
      1, 2, 5, 10, 20, 50, 100, 200, 500, 1000,
    ]);
    expect(pctLogTicks([0.01, 1], 8)).toEqual([
      0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1,
    ]);
  });

  it('keeps to the decades when the mantissas would be too many, and to every k-th when those are', () => {
    expect(pctLogTicks([1, 1e6], 6)).toEqual([1, 10, 100, 1000, 1e4, 1e5, 1e6]);
    expect(pctLogTicks([1, 1e6], 4)).toEqual([1, 100, 1e4, 1e6]);
    expect(pctLogTicks([1, 1e8], 4)).toEqual([1, 1000, 1e6]);
  });

  it('starts inside the domain: 5 of the decade under a low end of 5', () => {
    expect(pctLogTicks([5, 100], 10)).toEqual([5, 10, 20, 50, 100]);
    expect(pctLogTicks([0.5, 100], 10)).toEqual([
      0.5, 1, 2, 5, 10, 20, 50, 100,
    ]);
  });

  it('ticks a full decade from a half to five by its mantissas, and a decade of eight by linear steps', () => {
    // one whole decade's ratio, inside no single decade: 1, 2 and 5 with the half under them
    expect(pctLogTicks([0.5, 5], 10)).toEqual([0.5, 1, 2, 5]);
    // one decade by count, under a decade's ratio: the linear ticks
    expect(pctLogTicks([5, 40], 10)).toEqual(pctTicks([5, 40], 10));
  });

  it('keeps every decade while they are half again the target, and skips from one over it', () => {
    expect(pctLogTicks([1, 1e5], 4)).toEqual([1, 10, 100, 1000, 1e4, 1e5]);
    expect(pctLogTicks([1, 1e6], 4)).toEqual([1, 100, 1e4, 1e6]);
  });

  it('falls back to linear ticks inside one decade, and gives none for a domain with no logarithm', () => {
    expect(pctLogTicks([20, 80], 4)).toEqual(pctTicks([20, 80], 4));
    expect(pctLogTicks([0, 10], 4)).toEqual([]);
    expect(pctLogTicks([10, 10], 4)).toEqual([]);
  });
});
