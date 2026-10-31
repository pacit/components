import {
  PctLineHeights,
  pctWindow,
  pctWindowScroll,
  type PctWindowInput,
} from './window';

/** The heights of `count` lines at `estimate`, those `measured` gives a height written. */
function heightsOf(
  count: number,
  estimate: number,
  measured: (index: number) => number | undefined = () => undefined,
): PctLineHeights {
  const heights = new PctLineHeights(count, estimate);
  for (let index = 0; index < count; index++) {
    const height = measured(index);
    if (height !== undefined) heights.set(index, height);
  }
  return heights;
}

/** The input of the old shape: a count, an estimate and the heights measured. */
interface Old extends Omit<PctWindowInput, 'heights'> {
  readonly count: number;
  readonly estimate: number;
  readonly heightOf: (index: number) => number | undefined;
}

/** The window over the old shape's input, with no limit: `space` is `total`. */
function windowOf(of: Old) {
  const { count, estimate, heightOf, ...rest } = of;
  const { space, top, ...window } = pctWindow({
    ...rest,
    heights: heightsOf(count, estimate, heightOf),
  });
  expect(space).toBe(window.total);
  expect(top).toBeGreaterThanOrEqual(0);
  return window;
}

/** Ten lines of 10 px, none measured, a view of 30 px, no overscan unless a case says so. */
const base: Old = {
  count: 10,
  heightOf: () => undefined,
  estimate: 10,
  scrollTop: 0,
  viewport: 30,
  overscan: 0,
};

describe('pctWindow', () => {
  it('draws the lines the view meets at the top', () => {
    expect(windowOf(base)).toEqual({
      start: 0,
      end: 3,
      lead: 0,
      tail: 70,
      total: 100,
    });
  });

  it('draws a line the view meets only in part, at either edge', () => {
    expect(windowOf({ ...base, scrollTop: 15 })).toEqual({
      start: 1,
      end: 5,
      lead: 10,
      tail: 50,
      total: 100,
    });
  });

  it('does not draw a line that ends exactly where the view starts, nor one that starts where it ends', () => {
    expect(windowOf({ ...base, scrollTop: 20 })).toEqual({
      start: 2,
      end: 5,
      lead: 20,
      tail: 50,
      total: 100,
    });
  });

  it('adds the overscan on both sides, within the list', () => {
    expect(windowOf({ ...base, scrollTop: 40, overscan: 2 })).toMatchObject({
      start: 2,
      end: 9,
    });
    expect(windowOf({ ...base, overscan: 2 })).toMatchObject({
      start: 0,
      end: 5,
    });
    expect(windowOf({ ...base, scrollTop: 70, overscan: 2 })).toMatchObject({
      start: 5,
      end: 10,
    });
  });

  it('counts a measured line at its height and the rest at the estimate', () => {
    const tall = (index: number) => (index === 1 ? 50 : undefined);
    expect(windowOf({ ...base, heightOf: tall, scrollTop: 55 })).toEqual({
      start: 1,
      end: 5,
      lead: 10,
      tail: 50,
      total: 140,
    });
  });

  it('reads a negative top as the first line’s', () => {
    expect(windowOf({ ...base, scrollTop: -25 })).toEqual(windowOf(base));
  });

  it('reads a top past the last full view as that view', () => {
    const last = { start: 7, end: 10, lead: 70, tail: 0, total: 100 };
    expect(windowOf({ ...base, scrollTop: 70 })).toEqual(last);
    expect(windowOf({ ...base, scrollTop: 100 })).toEqual(last);
    expect(windowOf({ ...base, scrollTop: 500 })).toEqual(last);
  });

  it('draws the whole of a list shorter than the view', () => {
    expect(windowOf({ ...base, count: 2, scrollTop: 40 })).toEqual({
      start: 0,
      end: 2,
      lead: 0,
      tail: 0,
      total: 20,
    });
  });

  it('keeps the last line under a view of no height at the very end', () => {
    expect(windowOf({ ...base, viewport: 0, scrollTop: 100 })).toMatchObject({
      start: 9,
      end: 10,
    });
  });

  it('draws the first line of a list of no height, so it can be measured', () => {
    expect(
      windowOf({ ...base, estimate: 0, scrollTop: 40, overscan: 1 }),
    ).toEqual({
      start: 0,
      end: 2,
      lead: 0,
      tail: 0,
      total: 0,
    });
  });

  it('reads the overscan as a whole number of lines, at least none', () => {
    expect(windowOf({ ...base, scrollTop: 40, overscan: -3 })).toMatchObject({
      start: 4,
      end: 7,
    });
    expect(windowOf({ ...base, scrollTop: 40, overscan: 1.9 })).toMatchObject({
      start: 3,
      end: 8,
    });
  });

  it('draws the line under the top, and its overscan, for a view of no height', () => {
    expect(
      windowOf({ ...base, viewport: 0, scrollTop: 25, overscan: 1 }),
    ).toMatchObject({
      start: 1,
      end: 4,
    });
    expect(windowOf({ ...base, viewport: -10, scrollTop: 25 })).toMatchObject({
      start: 2,
      end: 3,
    });
  });

  it('draws nothing for no lines', () => {
    expect(windowOf({ ...base, count: 0, overscan: 3 })).toEqual({
      start: 0,
      end: 0,
      lead: 0,
      tail: 0,
      total: 0,
    });
  });
});

describe('pctWindow over lines exactly as tall as the view', () => {
  const ten: PctWindowInput = {
    heights: new PctLineHeights(10, 36),
    scrollTop: 0,
    viewport: 360,
    overscan: 0,
  };

  it('draws them all, with no space around them', () => {
    expect(pctWindow(ten)).toEqual({
      start: 0,
      end: 10,
      lead: 0,
      tail: 0,
      space: 360,
      total: 360,
      top: 0,
    });
  });

  it('scrolls to any of them by not scrolling', () => {
    expect(pctWindowScroll({ ...ten, index: 9, align: 'end' })).toBe(0);
  });

  it('draws the line under the top for a view of no height and no overscan', () => {
    const none = pctWindow({ ...ten, viewport: 0 });
    expect([none.start, none.end]).toEqual([0, 1]);
  });
});

describe('PctLineHeights', () => {
  it('counts every line at the estimate until it is measured', () => {
    const heights = new PctLineHeights(5, 10);
    expect(heights.total).toBe(50);
    expect(heights.heightOf(3)).toBe(10);
    expect(heights.offsetOf(3)).toBe(30);
  });

  it('counts a measured line at its height, and the estimate again once let go', () => {
    const heights = new PctLineHeights(5, 10);
    expect(heights.set(1, 25)).toBe(15);
    expect(heights.heightOf(1)).toBe(25);
    expect(heights.offsetOf(1)).toBe(10);
    expect(heights.offsetOf(2)).toBe(35);
    expect(heights.total).toBe(65);
    expect(heights.set(1, 20)).toBe(-5);
    expect(heights.total).toBe(60);
    expect(heights.set(1, undefined)).toBe(-10);
    expect(heights.offsetOf(5)).toBe(50);
    expect(heights.total).toBe(50);
  });

  it('reads an offset before the first line as none, and past the last as the total', () => {
    const heights = heightsOf(4, 10, (i) => (i === 3 ? 7 : undefined));
    expect(heights.offsetOf(-2)).toBe(0);
    expect(heights.offsetOf(0)).toBe(0);
    expect(heights.offsetOf(4)).toBe(37);
    expect(heights.offsetOf(9)).toBe(37);
  });

  it('finds the line standing at a height, past lines of no height', () => {
    // 10, 0, 0, 20, 10: the lines start at 0, 10, 10, 10, 30.
    const heights = heightsOf(5, 10, (i) =>
      i === 1 || i === 2 ? 0 : i === 3 ? 20 : undefined,
    );
    expect(heights.indexAt(-1)).toBe(0);
    expect(heights.indexAt(0)).toBe(0);
    expect(heights.indexAt(9.5)).toBe(0);
    expect(heights.indexAt(10)).toBe(3);
    expect(heights.indexAt(29.9)).toBe(3);
    expect(heights.indexAt(30)).toBe(4);
    expect(heights.indexAt(40)).toBe(5);
  });

  it('finds the first line starting at a height or below it', () => {
    const heights = heightsOf(5, 10, (i) =>
      i === 1 || i === 2 ? 0 : i === 3 ? 20 : undefined,
    );
    expect(heights.firstFrom(-5)).toBe(0);
    expect(heights.firstFrom(0)).toBe(0);
    expect(heights.firstFrom(0.5)).toBe(1);
    expect(heights.firstFrom(10)).toBe(1);
    expect(heights.firstFrom(11)).toBe(4);
    expect(heights.firstFrom(30)).toBe(4);
    expect(heights.firstFrom(31)).toBe(5);
    expect(heights.firstFrom(400)).toBe(5);
  });

  it('searches a count that is no power of two, and one line, and none', () => {
    const seven = heightsOf(7, 3);
    expect([0, 3, 17.9, 18, 20.9, 21].map((y) => seven.indexAt(y))).toEqual([
      0, 1, 5, 6, 6, 7,
    ]);
    const one = new PctLineHeights(1, 4);
    expect([one.indexAt(3.9), one.indexAt(4), one.firstFrom(4)]).toEqual([
      0, 1, 1,
    ]);
    const none = new PctLineHeights(0, 4);
    expect([none.total, none.indexAt(1), none.firstFrom(1)]).toEqual([0, 0, 0]);
  });

  it('searches a count that is a power of two up to its last line', () => {
    const eight = heightsOf(8, 3);
    expect([20.9, 21, 23.9, 24].map((y) => eight.indexAt(y))).toEqual([
      6, 7, 7, 8,
    ]);
  });
});

/** A million lines of 36 px, over a limit of 16,000,000 px, and a view of 360 px. */
const million: PctWindowInput = {
  heights: new PctLineHeights(1_000_000, 36),
  scrollTop: 0,
  viewport: 360,
  overscan: 2,
  limit: 16_000_000,
};

describe('pctWindow past the limit', () => {
  it('draws the lines in a space of the limit, the first view at the first line', () => {
    expect(pctWindow(million)).toEqual({
      start: 0,
      end: 12,
      lead: 0,
      tail: 16_000_000 - 12 * 36,
      space: 16_000_000,
      total: 36_000_000,
      top: 0,
    });
  });

  it('maps the last full view to the last lines, and the middle to the middle', () => {
    const last = pctWindow({ ...million, scrollTop: 16_000_000 });
    expect(last).toMatchObject({ start: 999_988, end: 1_000_000, tail: 0 });
    expect(last.lead).toBeCloseTo(16_000_000 - 12 * 36, 3);
    const middle = pctWindow({ ...million, scrollTop: (16_000_000 - 360) / 2 });
    expect(middle.start).toBe(499_995 - 2);
    expect(middle.top).toBeCloseTo((36_000_000 - 360) / 2, 3);
    // The line under the view's top stands at the view's top.
    const firstOnScreen = middle.lead + 2 * 36 - (16_000_000 - 360) / 2;
    expect(firstOnScreen).toBeCloseTo(0, 3);
    expect(middle.lead + 14 * 36 + middle.tail).toBeCloseTo(16_000_000, 3);
  });

  it('cuts the overscan where the space above has no room for it', () => {
    // At 10 px of scroll the view's top maps to 22.5 px into the lines: line 0, with no room
    // above it for an overscan.
    const near = pctWindow({ ...million, scrollTop: 10 });
    expect(near.start).toBe(0);
    expect(near.lead).toBe(0);
    // At 200 px it maps to 450 px, line 12: the 200 px of room above holds five lines of 36,
    // more than the overscan's two.
    const further = pctWindow({ ...million, scrollTop: 200 });
    expect(further.start).toBe(10);
    expect(further.lead).toBeCloseTo(200 - 450 + 360, 1);
    // At 40 px it maps to 90 px, line 2: the 40 px above hold line 1 only in part, so the
    // window starts at the line under the top.
    expect(pctWindow({ ...million, scrollTop: 40 }).start).toBe(2);
  });

  it('cuts the overscan where the space below has no room for it', () => {
    // 40 px above the last full view the top maps to 90 px above the lines' last view: the
    // 40 px below the view hold no whole line past the one it meets.
    const low = pctWindow({ ...million, scrollTop: 16_000_000 - 360 - 40 });
    expect(low.end).toBe(999_998);
    expect(low.lead + (low.end - low.start) * 36 + low.tail).toBeCloseTo(
      16_000_000,
      3,
    );
  });

  it('is the lines themselves under the limit', () => {
    const under = { ...million, heights: new PctLineHeights(1000, 36) };
    expect(pctWindow({ ...under, scrollTop: 3600 })).toEqual(
      pctWindow({ ...under, scrollTop: 3600, limit: undefined }),
    );
  });
});

describe('pctWindowScroll', () => {
  const ten = { ...base, heights: heightsOf(10, 10), scrollTop: 30 };

  it('puts the line at the view’s top, its centre or its bottom', () => {
    expect(pctWindowScroll({ ...ten, index: 5, align: 'start' })).toBe(50);
    expect(pctWindowScroll({ ...ten, index: 5, align: 'center' })).toBe(40);
    expect(pctWindowScroll({ ...ten, index: 5, align: 'end' })).toBe(30);
  });

  it('moves the least it can for nearest, and not at all for a line in view', () => {
    expect(pctWindowScroll({ ...ten, index: 1, align: 'nearest' })).toBe(10);
    expect(pctWindowScroll({ ...ten, index: 3, align: 'nearest' })).toBe(30);
    expect(pctWindowScroll({ ...ten, index: 5, align: 'nearest' })).toBe(30);
    expect(pctWindowScroll({ ...ten, index: 6, align: 'nearest' })).toBe(40);
  });

  it('puts a line taller than the view at its top for nearest', () => {
    const tall = {
      ...ten,
      heights: heightsOf(10, 10, (i) => (i === 4 ? 50 : undefined)),
    };
    expect(pctWindowScroll({ ...tall, index: 4, align: 'nearest' })).toBe(40);
  });

  it('never scrolls past the last full view, nor above the first', () => {
    expect(pctWindowScroll({ ...ten, index: 9, align: 'start' })).toBe(70);
    expect(pctWindowScroll({ ...ten, index: 0, align: 'end' })).toBe(0);
  });

  it('moves a start into the line by `within`, and nothing else by it', () => {
    expect(
      pctWindowScroll({ ...ten, index: 4, align: 'start', within: 3 }),
    ).toBe(43);
    expect(pctWindowScroll({ ...ten, index: 4, align: 'end', within: 3 })).toBe(
      20,
    );
  });

  it('maps a line past the limit through the window’s own map', () => {
    const top = pctWindowScroll({ ...million, index: 500_000, align: 'start' });
    expect(top).toBeCloseTo(
      (500_000 * 36 * (16_000_000 - 360)) / (36_000_000 - 360),
      3,
    );
    expect(pctWindow({ ...million, scrollTop: top }).start).toBe(500_000 - 2);
  });
});
