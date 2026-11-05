import { pctTween, pctTweenable } from './tween';

const of = (xs: number[], ys: number[]) => ({
  xs: Float64Array.from(xs),
  ys: Float64Array.from(ys),
  length: xs.length,
});

describe('pctTweenable', () => {
  it('eases a change that only moved the values', () => {
    expect(
      pctTweenable(of([0, 1, 2], [1, 2, 3]), of([0, 1, 2], [3, 2, 1])),
    ).toBe(true);
    expect(pctTweenable(of([], []), of([], []))).toBe(true);
  });

  it('draws at once a reading added, dropped or moved', () => {
    expect(pctTweenable(of([0, 1], [1, 2]), of([0, 1, 2], [1, 2, 3]))).toBe(
      false,
    );
    expect(
      pctTweenable(of([0, 1, 2], [1, 2, 3]), of([1, 2, 3], [2, 3, 4])),
    ).toBe(false);
    expect(
      pctTweenable(of([0, 1, 2], [1, 2, 3]), of([0, 1, 5], [1, 2, 3])),
    ).toBe(false);
    // the last reading dropped: the positions that stay are the same ones
    expect(pctTweenable(of([0, 1, 2], [1, 2, 3]), of([0, 1], [1, 2]))).toBe(
      false,
    );
  });

  it('reads the positions only up to the length', () => {
    const a = {
      xs: Float64Array.of(0, 1, 9),
      ys: Float64Array.of(1, 2, 0),
      length: 2,
    };
    expect(pctTweenable(a, of([0, 1], [5, 6]))).toBe(true);
  });
});

describe('pctTween', () => {
  it('is the values that far of the way, at the positions they go to', () => {
    const to = of([0, 1, 2], [10, 20, 30]);
    const half = pctTween(of([0, 1, 2], [0, 40, 30]), to, 0.5);
    expect([...half.ys]).toEqual([5, 30, 30]);
    expect(half.xs).toBe(to.xs);
    expect(half.length).toBe(3);
    expect([...pctTween(of([0, 1, 2], [0, 40, 30]), to, 0).ys]).toEqual([
      0, 40, 30,
    ]);
    expect([...pctTween(of([0, 1, 2], [0, 40, 30]), to, 1).ys]).toEqual([
      10, 20, 30,
    ]);
  });

  it('takes a gap on either side at once', () => {
    const eased = pctTween(
      of([0, 1, 2], [NaN, 4, 2]),
      of([0, 1, 2], [6, NaN, 8]),
      0.25,
    );
    expect(eased.ys[0]).toBe(6);
    expect(eased.ys[1]).toBeNaN();
    expect(eased.ys[2]).toBe(3.5);
  });
});
