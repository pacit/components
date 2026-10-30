import type { PctColumns } from './columns';
import { pctCursorJump, pctCursorStep } from './cursor';

const of = (points: readonly (readonly [number, number])[]): PctColumns => ({
  xs: Float64Array.from(points.map((p) => p[0])),
  ys: Float64Array.from(points.map((p) => p[1])),
  length: points.length,
});

const sparse = of([
  [0, 1],
  [10, 2],
  [20, NaN],
  [30, 4],
  [40, 5],
]);
const other = of([
  [5, 1],
  [25, 2],
  [45, 3],
]);
const all = { from: 0, to: 50 };

describe('pctCursorStep', () => {
  it('places a first cursor on the first reading of the window, or the last', () => {
    expect(pctCursorStep([sparse, other], null, 1, all, 1)).toBe(0);
    expect(pctCursorStep([sparse, other], null, -1, all, 1)).toBe(45);
    expect(pctCursorStep([sparse], null, 1, { from: 1, to: 50 }, 1)).toBe(10);
    expect(pctCursorStep([sparse], null, -1, { from: 0, to: 35 }, 1)).toBe(30);
    // a reading on the edge is in the window
    expect(pctCursorStep([sparse], null, 1, { from: 10, to: 50 }, 1)).toBe(10);
    expect(pctCursorStep([sparse], null, -1, { from: 0, to: 40 }, 1)).toBe(40);
  });

  it('gives nothing when the window holds no reading', () => {
    expect(
      pctCursorStep([sparse], null, 1, { from: 41, to: 49 }, 1),
    ).toBeNull();
    expect(
      pctCursorStep([sparse], null, -1, { from: 41, to: 49 }, 1),
    ).toBeNull();
    expect(pctCursorStep([], null, 1, all, 1)).toBeNull();
    expect(pctCursorStep([of([])], null, 1, all, 1)).toBeNull();
  });

  it('moves to the next reading of any series, either way', () => {
    expect(pctCursorStep([sparse, other], 0, 1, all, 1)).toBe(5);
    expect(pctCursorStep([sparse, other], 5, 1, all, 1)).toBe(10);
    expect(pctCursorStep([sparse, other], 10, -1, all, 1)).toBe(5);
    expect(pctCursorStep([sparse, other], 7, 1, all, 1)).toBe(10);
    expect(pctCursorStep([sparse, other], 7, -1, all, 1)).toBe(5);
  });

  it('steps over a gap, which is no reading', () => {
    expect(pctCursorStep([sparse], 10, 1, all, 1)).toBe(30);
    expect(pctCursorStep([sparse], 30, -1, all, 1)).toBe(10);
    expect(
      pctCursorStep(
        [
          of([
            [0, NaN],
            [1, NaN],
            [2, 3],
          ]),
        ],
        null,
        1,
        all,
        1,
      ),
    ).toBe(2);
    expect(
      pctCursorStep(
        [
          of([
            [0, 1],
            [1, NaN],
            [2, NaN],
          ]),
        ],
        null,
        -1,
        all,
        1,
      ),
    ).toBe(0);
  });

  it('stays where it is when nothing lies further that way', () => {
    expect(pctCursorStep([sparse, other], 45, 1, all, 1)).toBe(45);
    expect(pctCursorStep([sparse, other], 0, -1, all, 1)).toBe(0);
    // a reading past the window's edge is not a place to go
    expect(pctCursorStep([sparse], 30, 1, { from: 0, to: 35 }, 1)).toBe(30);
    expect(pctCursorStep([sparse], 10, -1, { from: 5, to: 50 }, 1)).toBe(10);
  });

  it('moves a whole pixel when the readings are denser than the pixels', () => {
    const dense = of(
      Array.from({ length: 101 }, (_, i) => [i / 10, i] as const),
    );
    // ten readings a pixel: a key goes a pixel, to the first reading there
    expect(pctCursorStep([dense], 2, 1, { from: 0, to: 10 }, 1)).toBe(3);
    expect(pctCursorStep([dense], 2, -1, { from: 0, to: 10 }, 1)).toBe(1);
    // a reading exactly a pixel away is the one
    expect(pctCursorStep([dense], 2.5, 1, { from: 0, to: 10 }, 0.5)).toBe(3);
    // the next reading at a pixel or more is taken as it is
    expect(pctCursorStep([sparse], 0, 1, all, 10)).toBe(10);
    expect(pctCursorStep([sparse], 10, -1, all, 10)).toBe(0);
  });

  it('goes to the last reading when every one left is within a pixel', () => {
    const tail = of([
      [0, 1],
      [9.6, 2],
      [9.8, 3],
    ]);
    expect(pctCursorStep([tail], 9.5, 1, { from: 0, to: 10 }, 1)).toBe(9.8);
    expect(pctCursorStep([tail], 0.4, -1, { from: 0, to: 10 }, 1)).toBe(0);
  });

  it('reads two readings at one position as one', () => {
    const twice = of([
      [0, 1],
      [5, 2],
      [5, 3],
      [9, 4],
    ]);
    expect(pctCursorStep([twice], 0, 1, all, 1)).toBe(5);
    expect(pctCursorStep([twice], 5, 1, all, 1)).toBe(9);
    expect(pctCursorStep([twice], 5, -1, all, 1)).toBe(0);
    expect(pctCursorStep([twice], 9, -1, all, 1)).toBe(5);
    expect(pctCursorStep([twice], null, 1, { from: 5, to: 9 }, 1)).toBe(5);
  });
});

describe('pctCursorJump', () => {
  it('goes to the first reading at the target or beyond it', () => {
    expect(pctCursorJump([sparse, other], 12, 1, all)).toBe(25);
    expect(pctCursorJump([sparse, other], 12, -1, all)).toBe(10);
    expect(pctCursorJump([sparse, other], 10, 1, all)).toBe(10);
    expect(pctCursorJump([sparse, other], 10, -1, all)).toBe(10);
  });

  it('holds the target inside the window', () => {
    expect(pctCursorJump([sparse], -100, 1, all)).toBe(0);
    expect(pctCursorJump([sparse], 100, -1, all)).toBe(40);
    expect(pctCursorJump([sparse], 100, -1, { from: 0, to: 35 })).toBe(30);
  });

  it('goes to the last reading that way when none is beyond the target', () => {
    expect(pctCursorJump([sparse, other], 46, 1, all)).toBe(45);
    expect(pctCursorJump([sparse], 41, 1, all)).toBe(40);
    expect(pctCursorJump([other], 3, -1, all)).toBe(5);
    expect(pctCursorJump([sparse], 36, 1, { from: 0, to: 39 })).toBe(30);
  });

  it('gives nothing when the window holds no reading', () => {
    expect(pctCursorJump([sparse], 45, 1, { from: 41, to: 49 })).toBeNull();
    expect(pctCursorJump([], 0, -1, all)).toBeNull();
  });
});
