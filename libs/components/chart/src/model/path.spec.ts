import type { PctColumns } from './columns';
import { pctAreaPath, pctLinePath } from './path';
import { pctLinear, pctLog } from './scale';

const of = (points: readonly (readonly [number, number])[]): PctColumns => ({
  xs: Float64Array.from(points.map((p) => p[0])),
  ys: Float64Array.from(points.map((p) => p[1])),
  length: points.length,
});
// x: 0..100 → 0..100 px; y: 0..10 → 100..0 px
const x = pctLinear([0, 100], [0, 100]);
const y = pctLinear([0, 10], [100, 0]);

const three = of([
  [10, 2],
  [20, 6],
  [40, 4],
]);

describe('pctLinePath', () => {
  it('draws a line through the readings', () => {
    expect(pctLinePath(three, x, y, 'linear')).toBe('M10 80L20 40L40 60');
  });

  it('draws a step that holds each reading until the next', () => {
    expect(pctLinePath(three, x, y, 'step')).toBe(
      'M10 80L20 80L20 40L40 40L40 60',
    );
  });

  it('draws a step that rises before the reading', () => {
    expect(pctLinePath(three, x, y, 'step-before')).toBe(
      'M10 80L10 40L20 40L20 60L40 60',
    );
  });

  it('draws a step that changes halfway', () => {
    expect(pctLinePath(three, x, y, 'step-middle')).toBe(
      'M10 80L15 80L15 40L20 40L30 40L30 60L40 60',
    );
  });

  it('carries the last reading of a step to the end, and a line not at all', () => {
    expect(pctLinePath(three, x, y, 'step', { end: 90 })).toBe(
      'M10 80L20 80L20 40L40 40L40 60L90 60',
    );
    expect(pctLinePath(three, x, y, 'step-middle', { end: 90 })).toMatch(
      /L40 60L90 60$/,
    );
    expect(pctLinePath(three, x, y, 'linear', { end: 90 })).toBe(
      'M10 80L20 40L40 60',
    );
    expect(pctLinePath(three, x, y, 'step-before', { end: 90 })).toBe(
      'M10 80L10 40L20 40L20 60L40 60',
    );
    // an end before the last reading draws nothing more
    expect(pctLinePath(three, x, y, 'step', { end: 30 })).toBe(
      'M10 80L20 80L20 40L40 40L40 60',
    );
  });

  it('ends a step at a gap and a line at its last reading, and starts again after it', () => {
    const gappy = of([
      [10, 2],
      [20, 6],
      [30, NaN],
      [40, 4],
      [50, 4],
    ]);
    expect(pctLinePath(gappy, x, y, 'step')).toBe(
      'M10 80L20 80L20 40L30 40M40 60L50 60',
    );
    expect(pctLinePath(gappy, x, y, 'linear')).toBe('M10 80L20 40M40 60L50 60');
    expect(pctLinePath(gappy, x, y, 'step-before')).toBe(
      'M10 80L10 40L20 40M40 60L50 60',
    );
    expect(pctLinePath(gappy, x, y, 'step-middle')).toBe(
      'M10 80L15 80L15 40L20 40L25 40M40 60L45 60L50 60',
    );
  });

  it('starts a step after a gap at the start, and after two gaps in a row', () => {
    const late = of([
      [10, NaN],
      [20, NaN],
      [30, 5],
      [40, 5],
    ]);
    expect(pctLinePath(late, x, y, 'step')).toBe('M30 50L40 50');
    expect(pctLinePath(late, x, y, 'step-middle')).toBe('M30 50L35 50L40 50');
  });

  it('draws a lone reading between gaps as a dot', () => {
    const lone = of([
      [10, NaN],
      [20, 5],
      [30, NaN],
    ]);
    expect(pctLinePath(lone, x, y, 'linear')).toBe('M20 50L20 50');
  });

  it('draws nothing for nothing, and after a trailing gap no end', () => {
    expect(pctLinePath(of([]), x, y, 'step', { end: 50 })).toBe('');
    expect(
      pctLinePath(
        of([
          [10, 2],
          [20, NaN],
        ]),
        x,
        y,
        'step',
        { end: 90 },
      ),
    ).toBe('M10 80L20 80');
  });

  it('rounds to whole pixels and drops a point that lands on the one before', () => {
    const dense = of([
      [10.2, 2.01],
      [10.4, 2.02],
      [10.6, 2.0],
      [20.4, 6.04],
    ]);
    expect(pctLinePath(dense, x, y, 'linear')).toBe('M10 80L11 80L20 40');
  });

  it('rounds to the grid it is given', () => {
    const half = of([
      [10.2, 2.01],
      [10.4, 2.06],
    ]);
    expect(pctLinePath(half, x, y, 'linear', { pixel: 0.5 })).toBe(
      'M10 80L10.5 79.5',
    );
  });

  it('writes a grid finer than a pixel to two decimals', () => {
    const third = of([
      [10.2, 2.01],
      [75.66, 2.0],
    ]);
    expect(pctLinePath(third, x, y, 'linear', { pixel: 1 / 3 })).toBe(
      'M10.33 80L75.67 80',
    );
  });

  it('reads a value the scale has no position for as a gap', () => {
    const log = pctLog([1, 100], [100, 0]);
    const withZero = of([
      [10, 10],
      [20, 0],
      [30, 100],
    ]);
    expect(pctLinePath(withZero, x, log, 'linear')).toBe(
      'M10 50L10 50M30 0L30 0',
    );
    expect(pctLinePath(withZero, x, log, 'step')).toBe(
      'M10 50L20 50M30 0L30 0',
    );
  });
});

describe('pctAreaPath', () => {
  it('closes each run down to the baseline', () => {
    expect(pctAreaPath(three, x, y, 'linear', 0)).toBe(
      'M10 100L10 80L20 40L40 60L40 100Z',
    );
  });

  it('leaves no area under a gap', () => {
    const gappy = of([
      [10, 2],
      [20, 6],
      [30, NaN],
      [40, 4],
      [50, 4],
    ]);
    expect(pctAreaPath(gappy, x, y, 'linear', 0)).toBe(
      'M10 100L10 80L20 40L20 100ZM40 100L40 60L50 60L50 100Z',
    );
  });

  it('takes the baseline as a value of the axis', () => {
    expect(pctAreaPath(three, x, y, 'step', 5)).toBe(
      'M10 50L10 80L20 80L20 40L40 40L40 60L40 50Z',
    );
  });

  it('draws nothing for nothing', () => {
    expect(pctAreaPath(of([]), x, y, 'linear', 0)).toBe('');
  });
});
