import { pctStack, pctStackExtent } from './stack';

describe('pctStack', () => {
  it('stacks positives up from zero in the order of the series', () => {
    expect(
      pctStack([
        [1, 2],
        [3, 4],
      ]),
    ).toEqual([
      [
        { from: 0, to: 1 },
        { from: 0, to: 2 },
      ],
      [
        { from: 1, to: 4 },
        { from: 2, to: 6 },
      ],
    ]);
  });

  it('stacks negatives down from zero apart from the positives', () => {
    expect(
      pctStack([
        [-1, 2],
        [3, -4],
        [-2, 1],
      ]),
    ).toEqual([
      [
        { from: 0, to: -1 },
        { from: 0, to: 2 },
      ],
      [
        { from: 0, to: 3 },
        { from: 0, to: -4 },
      ],
      [
        { from: -1, to: -3 },
        { from: 2, to: 3 },
      ],
    ]);
  });

  it('leaves a bar out where a series has no value, and keeps the stack above it', () => {
    expect(
      pctStack([
        [1, null],
        [2, 3],
        [4, undefined as unknown as number],
      ]),
    ).toEqual([
      [{ from: 0, to: 1 }, null],
      [
        { from: 1, to: 3 },
        { from: 0, to: 3 },
      ],
      [{ from: 3, to: 7 }, null],
    ]);
    expect(pctStack([[NaN, Infinity]])).toEqual([[null, null]]);
  });

  it('stacks a zero as a bar from zero to zero', () => {
    expect(pctStack([[0], [2]])).toEqual([
      [{ from: 0, to: 0 }],
      [{ from: 0, to: 2 }],
    ]);
  });

  it('gives series of different lengths the longest, and nothing from nothing', () => {
    expect(pctStack([[1], [2, 3]])).toEqual([
      [{ from: 0, to: 1 }, null],
      [
        { from: 1, to: 3 },
        { from: 0, to: 3 },
      ],
    ]);
    expect(pctStack([])).toEqual([]);
    expect(pctStack([[]])).toEqual([[]]);
  });
});

describe('pctStackExtent', () => {
  it('spans the lowest and the highest end, zero among them', () => {
    expect(
      pctStackExtent(
        pctStack([
          [1, 2],
          [3, 4],
        ]),
      ),
    ).toEqual([0, 6]);
    expect(
      pctStackExtent(
        pctStack([
          [-1, 2],
          [3, -4],
          [-2, 1],
        ]),
      ),
    ).toEqual([-4, 3]);
    expect(pctStackExtent(pctStack([[5], [5]]))).toEqual([0, 10]);
    expect(pctStackExtent(pctStack([[-5]]))).toEqual([-5, 0]);
  });

  it('answers nothing for no bars', () => {
    expect(pctStackExtent([])).toBeNull();
    expect(pctStackExtent([[null, null]])).toBeNull();
  });
});
