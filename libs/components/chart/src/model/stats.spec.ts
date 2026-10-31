import { pctLinear } from './scale';
import { pctBin, pctQuantiles, pctSpacing } from './stats';

const eight = [3, 1, 2, 10, 3, 2, 4, 3];

describe('pctBin', () => {
  it('bins by Sturges’ rule on a nice step, the edges on the step, the last bin closed', () => {
    // Eight values: four bins asked, a step of 2 from the span of 9, so five bins from 0 to 10.
    expect(pctBin(eight)).toEqual([
      { from: 0, to: 2, count: 1 },
      { from: 2, to: 4, count: 5 },
      { from: 4, to: 6, count: 1 },
      { from: 6, to: 8, count: 0 },
      { from: 8, to: 10, count: 1 },
    ]);
    expect(pctBin(eight, 'sturges')).toEqual(pctBin(eight));
  });

  it('bins by a count, rounded down and at least one', () => {
    expect(pctBin(eight, 2)).toEqual([
      { from: 0, to: 5, count: 7 },
      { from: 5, to: 10, count: 1 },
    ]);
    expect(pctBin(eight, 2.9)).toEqual(pctBin(eight, 2));
    expect(pctBin(eight, 0)).toEqual([{ from: 0, to: 10, count: 8 }]);
  });

  it('bins by Freedman and Diaconis: twice the interquartile range over the cube root of the count', () => {
    // Quartiles 2 and 3.25 give a width of 1.25 and eight bins asked, a step of 1 from 1 to 10.
    const bins = pctBin(eight, 'freedman-diaconis');
    expect(bins).toHaveLength(9);
    expect(bins[0]).toEqual({ from: 1, to: 2, count: 1 });
    expect(bins[2]).toEqual({ from: 3, to: 4, count: 3 });
    expect(bins[8]).toEqual({ from: 9, to: 10, count: 1 });
    expect(bins.reduce((sum, b) => sum + b.count, 0)).toBe(8);
    // Values all alike have no interquartile range, and the rule falls back on Sturges.
    expect(pctBin([5, 5, 5, 5, 6], 'freedman-diaconis')).toEqual(
      pctBin([5, 5, 5, 5, 6]),
    );
  });

  it('bins by the edges it is given, the last one closed, a value past them in no bin', () => {
    expect(pctBin([0, 5, 10, 11, -1, 7], [10, 0, 5])).toEqual([
      { from: 0, to: 5, count: 1 },
      { from: 5, to: 10, count: 3 },
    ]);
    expect(pctBin([1], [0])).toEqual([]);
  });

  it('puts values all alike in one bin of no width, and leaves out what is not a number', () => {
    expect(pctBin([5, NaN, 5, Infinity, 5])).toEqual([
      { from: 5, to: 5, count: 3 },
    ]);
    expect(pctBin([])).toEqual([]);
    expect(pctBin([NaN])).toEqual([]);
  });

  it('writes the edges clean of the float’s dust', () => {
    const bins = pctBin([0.1, 0.2, 0.3, 0.7], 'sturges');
    for (const bin of bins) {
      expect(String(bin.from).length).toBeLessThan(8);
      expect(String(bin.to).length).toBeLessThan(8);
    }
    expect(bins.reduce((sum, b) => sum + b.count, 0)).toBe(4);
  });
});

describe('pctQuantiles', () => {
  it('finds the quartiles by interpolation, the whiskers within one and a half ranges, the rest outliers', () => {
    expect(pctQuantiles([100, 1, 3, 2, 4])).toEqual({
      low: 1,
      q1: 2,
      median: 3,
      q3: 4,
      high: 4,
      outliers: [100],
    });
    expect(pctQuantiles([1, 2, 3, 4])).toEqual({
      low: 1,
      q1: 1.75,
      median: 2.5,
      q3: 3.25,
      high: 4,
      outliers: [],
    });
  });

  it('keeps a value on the fence inside, and lists outliers on both sides in order', () => {
    // Quartiles 2 and 4, a reach of 3: -1 and 7 stand on the fences, -2 and 8 past them.
    expect(pctQuantiles([8, 2, 3, 4, -1, 7, -2, 2, 4])).toEqual({
      low: -1,
      q1: 2,
      median: 3,
      q3: 4,
      high: 7,
      outliers: [-2, 8],
    });
  });

  it('makes one value a box of no height, and nothing of no finite value', () => {
    expect(pctQuantiles([7, NaN])).toEqual({
      low: 7,
      q1: 7,
      median: 7,
      q3: 7,
      high: 7,
      outliers: [],
    });
    expect(pctQuantiles([])).toBeNull();
    expect(pctQuantiles([NaN, Infinity])).toBeNull();
  });
});

describe('pctSpacing', () => {
  const scale = pctLinear([0, 100], [0, 200]);

  it('is the smallest gap in pixels between neighbours, a gap of nothing left out', () => {
    expect(pctSpacing([0, 10, 10, 30], scale)).toBe(20);
    expect(pctSpacing([30, 10, 0], scale)).toBe(20);
  });

  it('is infinite for fewer than two positions, or positions all alike', () => {
    expect(pctSpacing([5], scale)).toBe(Infinity);
    expect(pctSpacing([], scale)).toBe(Infinity);
    expect(pctSpacing([5, 5, 5], scale)).toBe(Infinity);
  });
});
