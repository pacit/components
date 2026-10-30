import { pctFit, type PctFitInput } from './fit';

const widths: Record<string, number> = { a: 60, b: 120, c: 80 };
const fit = (input: Partial<PctFitInput>) =>
  pctFit(
    {
      width: 300,
      total: 300,
      order: ['a', 'b', 'c'],
      count: 0,
      widthOf: (id) => widths[id],
      needed: [],
      ...input,
    },
    8,
  );

describe('pctFit', () => {
  it('hides nothing while the table fits, to the pixel', () => {
    expect(fit({ width: 300, total: 300 })).toEqual({ count: 0, needed: [] });
  });

  it('hides as many columns at once as cover the overflow, each keeping the width it needed', () => {
    expect(fit({ width: 300, total: 301 })).toEqual({
      count: 1,
      needed: [301],
    });
    expect(fit({ width: 200, total: 400 })).toEqual({
      count: 3,
      needed: [400, 340, 220],
    });
    expect(fit({ width: 280, total: 400 })).toEqual({
      count: 2,
      needed: [400, 340],
    });
  });

  it('hides more after those already hidden, and stops when the order runs out', () => {
    const widthOf = vi.fn((id: string) => widths[id]);
    expect(
      fit({ width: 100, total: 500, count: 1, needed: [600], widthOf }),
    ).toEqual({ count: 3, needed: [600, 500, 380] });
    expect(widthOf.mock.calls).toEqual([['b'], ['c']]);
    expect(fit({ width: 10, total: 500, count: 3, needed: [9, 8, 7] })).toEqual(
      { count: 3, needed: [9, 8, 7] },
    );
  });

  it('shows the last hidden first, once the frame is as wide as it needed and eight more', () => {
    const needed = [500, 400, 340];
    expect(fit({ width: 347, count: 3, needed })).toEqual({
      count: 3,
      needed,
    });
    expect(fit({ width: 348, count: 3, needed })).toEqual({
      count: 2,
      needed: [500, 400],
    });
    expect(fit({ width: 408, count: 3, needed })).toEqual({
      count: 1,
      needed: [500],
    });
    expect(fit({ width: 900, count: 3, needed })).toEqual({
      count: 0,
      needed: [],
    });
  });

  it('reads no width it was left from a longer list than the hidden ones', () => {
    expect(
      fit({ width: 200, total: 200, count: 1, needed: [100, 50] }),
    ).toEqual({
      count: 0,
      needed: [],
    });
    expect(fit({ width: 300, total: 360, count: 1, needed: [500, 1] })).toEqual(
      { count: 2, needed: [500, 360] },
    );
  });
});
