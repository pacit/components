import {
  pctColorDomain,
  pctDiverging,
  pctRampStop,
  pctSequential,
} from './color';

describe('pctSequential', () => {
  it('places a value between the ends, holds one past them, and gives nothing for no number', () => {
    const t = pctSequential([10, 30]);
    expect(t(10)).toBe(0);
    expect(t(20)).toBe(0.5);
    expect(t(30)).toBe(1);
    expect(t(-5)).toBe(0);
    expect(t(40)).toBe(1);
    expect(t(NaN)).toBeNull();
    expect(t(Infinity)).toBeNull();
  });

  it('with a domain of no span, puts the value in the middle and the rest at the ends', () => {
    const t = pctSequential([5, 5]);
    expect(t(5)).toBe(0.5);
    expect(t(4)).toBe(0);
    expect(t(6)).toBe(1);
    // an inverted domain is no span either: held at its ends, the first one first
    expect(pctSequential([6, 5])(5.5)).toBe(0);
    expect(pctSequential([6, 5])(7)).toBe(1);
  });
});

describe('pctDiverging', () => {
  it('puts the middle at one half and scales each side by its own reach', () => {
    const t = pctDiverging([-10, 0, 40]);
    expect(t(0)).toBe(0.5);
    expect(t(-5)).toBe(0.25);
    expect(t(-10)).toBe(0);
    expect(t(20)).toBe(0.75);
    expect(t(40)).toBe(1);
    expect(t(-20)).toBe(0);
    expect(t(80)).toBe(1);
    expect(t(NaN)).toBeNull();
    // a middle off zero: each side measured from it
    const off = pctDiverging([0, 10, 30]);
    expect(off(10)).toBe(0.5);
    expect(off(5)).toBe(0.25);
    expect(off(20)).toBe(0.75);
  });

  it('with a side of no reach, puts every value of that side at its end', () => {
    expect(pctDiverging([0, 0, 10])(-1)).toBe(0);
    expect(pctDiverging([0, 0, 10])(5)).toBe(0.75);
    expect(pctDiverging([-10, 0, 0])(1)).toBe(1);
    expect(pctDiverging([-10, 0, 0])(-5)).toBe(0.25);
    expect(pctDiverging([-10, 0, 0])(0)).toBe(0.5);
    // a side that runs backwards is no reach either
    expect(pctDiverging([5, 0, 10])(-3)).toBe(0);
    expect(pctDiverging([-10, 0, -5])(3)).toBe(1);
  });
});

describe('pctRampStop', () => {
  it('names the two steps a place falls between, the share of the second and the nearer one', () => {
    expect(pctRampStop(0.3, 8)).toEqual({ from: 3, to: 4, mix: 0.1, step: 3 });
    expect(pctRampStop(0.5, 3)).toEqual({ from: 2, to: 3, mix: 0, step: 2 });
    expect(pctRampStop(0.25, 3)).toEqual({ from: 1, to: 2, mix: 0.5, step: 2 });
    expect(pctRampStop(0.2, 3)).toEqual({ from: 1, to: 2, mix: 0.4, step: 1 });
  });

  it('at an end both steps are that end, and a place outside is held at it', () => {
    expect(pctRampStop(0, 8)).toEqual({ from: 1, to: 2, mix: 0, step: 1 });
    expect(pctRampStop(1, 8)).toEqual({ from: 8, to: 8, mix: 0, step: 8 });
    expect(pctRampStop(1.5, 8)).toEqual(pctRampStop(1, 8));
    expect(pctRampStop(-1, 8)).toEqual(pctRampStop(0, 8));
  });
});

describe('pctColorDomain', () => {
  it('takes the finite values’ extent, a given domain as it is, and a unit span without any', () => {
    expect(pctColorDomain([3, NaN, -1, 7], false)).toEqual([-1, 7]);
    expect(pctColorDomain([1, Infinity, 3, -Infinity], false)).toEqual([1, 3]);
    expect(pctColorDomain([3, 7], false, [0, 10])).toEqual([0, 10]);
    expect(pctColorDomain([3, 7], false, [0])).toEqual([3, 7]);
    expect(pctColorDomain([], false)).toEqual([0, 1]);
    expect(pctColorDomain([NaN], true)).toEqual([-1, 0, 1]);
  });

  it('diverging, centres on zero and reaches as far on both sides as the farther value', () => {
    expect(pctColorDomain([-2, 5], true)).toEqual([-5, 0, 5]);
    expect(pctColorDomain([1, 3], true)).toEqual([-3, 0, 3]);
    expect(pctColorDomain([0, 0], true)).toEqual([
      -Number.EPSILON,
      0,
      Number.EPSILON,
    ]);
    expect(pctColorDomain([1], true, [-1, 2, 4])).toEqual([-1, 2, 4]);
  });
});
