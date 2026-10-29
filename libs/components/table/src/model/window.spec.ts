import { pctWindow, type PctWindowInput } from './window';

/** Ten lines of 10 px, none measured, a view of 30 px, no overscan unless a case says so. */
const base: PctWindowInput = {
  count: 10,
  heightOf: () => undefined,
  estimate: 10,
  scrollTop: 0,
  viewport: 30,
  overscan: 0,
};

describe('pctWindow', () => {
  it('draws the lines the view meets at the top', () => {
    expect(pctWindow(base)).toEqual({
      start: 0,
      end: 3,
      lead: 0,
      tail: 70,
      total: 100,
    });
  });

  it('draws a line the view meets only in part, at either edge', () => {
    expect(pctWindow({ ...base, scrollTop: 15 })).toEqual({
      start: 1,
      end: 5,
      lead: 10,
      tail: 50,
      total: 100,
    });
  });

  it('does not draw a line that ends exactly where the view starts, nor one that starts where it ends', () => {
    expect(pctWindow({ ...base, scrollTop: 20 })).toEqual({
      start: 2,
      end: 5,
      lead: 20,
      tail: 50,
      total: 100,
    });
  });

  it('adds the overscan on both sides, within the list', () => {
    expect(pctWindow({ ...base, scrollTop: 40, overscan: 2 })).toMatchObject({
      start: 2,
      end: 9,
    });
    expect(pctWindow({ ...base, overscan: 2 })).toMatchObject({
      start: 0,
      end: 5,
    });
    expect(pctWindow({ ...base, scrollTop: 70, overscan: 2 })).toMatchObject({
      start: 5,
      end: 10,
    });
  });

  it('counts a measured line at its height and the rest at the estimate', () => {
    const tall = (index: number) => (index === 1 ? 50 : undefined);
    expect(pctWindow({ ...base, heightOf: tall, scrollTop: 55 })).toEqual({
      start: 1,
      end: 5,
      lead: 10,
      tail: 50,
      total: 140,
    });
  });

  it('reads a negative top as the first line’s', () => {
    expect(pctWindow({ ...base, scrollTop: -25 })).toEqual(pctWindow(base));
  });

  it('keeps the last line under a top at the very end', () => {
    expect(pctWindow({ ...base, scrollTop: 100 })).toMatchObject({
      start: 9,
      end: 10,
    });
  });

  it('keeps the last line under a top past the end', () => {
    expect(pctWindow({ ...base, scrollTop: 500 })).toEqual({
      start: 9,
      end: 10,
      lead: 90,
      tail: 0,
      total: 100,
    });
  });

  it('draws the line under the top, and its overscan, for a view of no height', () => {
    expect(
      pctWindow({ ...base, viewport: 0, scrollTop: 25, overscan: 1 }),
    ).toMatchObject({
      start: 1,
      end: 4,
    });
    expect(pctWindow({ ...base, viewport: -10, scrollTop: 25 })).toMatchObject({
      start: 2,
      end: 3,
    });
  });

  it('draws nothing for no lines', () => {
    expect(pctWindow({ ...base, count: 0, overscan: 3 })).toEqual({
      start: 0,
      end: 0,
      lead: 0,
      tail: 0,
      total: 0,
    });
  });
});
