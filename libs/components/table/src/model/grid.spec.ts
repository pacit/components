import { describe, expect, it } from 'vitest';
import {
  type PctGridCellSpan,
  pctGridCellAt,
  pctGridKey,
  type PctGridMap,
  pctGridMove,
} from './grid';

const key = (
  name: string,
  modifiers: Partial<
    Record<'shiftKey' | 'ctrlKey' | 'metaKey' | 'altKey', boolean>
  > = {},
) => ({
  key: name,
  shiftKey: false,
  ctrlKey: false,
  metaKey: false,
  altKey: false,
  ...modifiers,
});

/** Three cells of one column each. */
const row: readonly PctGridCellSpan[] = [
  { start: 0, span: 1 },
  { start: 1, span: 1 },
  { start: 2, span: 1 },
];

/** A heading: one cell over the first two columns, and one under the third. */
const heading: readonly PctGridCellSpan[] = [
  { start: 0, span: 2 },
  { start: 2, span: 1 },
];

/** Five lines: a header, a row, a heading, a row, and a line not drawn. */
const map: PctGridMap = {
  lines: 5,
  cellsOf: (line) => (line === 4 ? null : line === 2 ? heading : row),
  page: 2,
};

describe('pctGridKey', () => {
  it('reads the arrows, Home, End and the pages as moves', () => {
    expect(
      [
        'ArrowRight',
        'ArrowLeft',
        'ArrowUp',
        'ArrowDown',
        'Home',
        'End',
        'PageUp',
        'PageDown',
      ].map((name) => pctGridKey(key(name), false)?.move),
    ).toEqual([
      'next',
      'previous',
      'up',
      'down',
      'start',
      'end',
      'page-up',
      'page-down',
    ]);
  });

  it('turns the horizontal arrows in a right-to-left grid, and nothing else', () => {
    expect(pctGridKey(key('ArrowLeft'), true)?.move).toBe('next');
    expect(pctGridKey(key('ArrowRight'), true)?.move).toBe('previous');
    expect(pctGridKey(key('ArrowDown'), true)?.move).toBe('down');
    expect(pctGridKey(key('Home'), true)?.move).toBe('start');
  });

  it("reads Ctrl or ⌘ with Home and End as the grid's ends, and leaves an arrow with them", () => {
    expect(pctGridKey(key('Home', { ctrlKey: true }), false)?.move).toBe(
      'first',
    );
    expect(pctGridKey(key('End', { metaKey: true }), false)?.move).toBe('last');
    expect(pctGridKey(key('ArrowDown', { ctrlKey: true }), false)).toBeNull();
    expect(pctGridKey(key('ArrowUp', { metaKey: true }), false)).toBeNull();
  });

  it('says Shift extends, and leaves Alt and any other key', () => {
    expect(pctGridKey(key('ArrowDown', { shiftKey: true }), false)).toEqual({
      move: 'down',
      extend: true,
    });
    expect(pctGridKey(key('ArrowDown'), false)).toEqual({
      move: 'down',
      extend: false,
    });
    expect(pctGridKey(key('ArrowDown', { altKey: true }), false)).toBeNull();
    expect(pctGridKey(key('Enter'), false)).toBeNull();
    expect(pctGridKey(key('a', { ctrlKey: true }), false)).toBeNull();
  });
});

describe('pctGridCellAt', () => {
  it('finds the cell that covers a column, the last one past the line', () => {
    expect(pctGridCellAt(heading, 0)).toBe(0);
    expect(pctGridCellAt(heading, 1)).toBe(0);
    expect(pctGridCellAt(heading, 2)).toBe(1);
    expect(pctGridCellAt(heading, 7)).toBe(1);
    expect(pctGridCellAt(row, Number.POSITIVE_INFINITY)).toBe(2);
  });

  it('says -1 for a line of no cells, and 0 for a line of one', () => {
    expect(pctGridCellAt([], 0)).toBe(-1);
    expect(pctGridCellAt([{ start: 0, span: 3 }], 2)).toBe(0);
  });
});

describe('pctGridMove', () => {
  it('steps along a line, a cell at a time, and stops at its ends', () => {
    expect(pctGridMove(map, { line: 1, column: 0 }, 'next')).toEqual({
      line: 1,
      column: 1,
    });
    expect(pctGridMove(map, { line: 1, column: 2 }, 'next')).toEqual({
      line: 1,
      column: 2,
    });
    expect(pctGridMove(map, { line: 1, column: 1 }, 'previous')).toEqual({
      line: 1,
      column: 0,
    });
    expect(pctGridMove(map, { line: 1, column: 0 }, 'previous')).toEqual({
      line: 1,
      column: 0,
    });
  });

  it('steps over a cell that spans, to its first column', () => {
    expect(pctGridMove(map, { line: 2, column: 1 }, 'next')).toEqual({
      line: 2,
      column: 2,
    });
    expect(pctGridMove(map, { line: 2, column: 2 }, 'previous')).toEqual({
      line: 2,
      column: 0,
    });
  });

  it('keeps the column asked for across lines, and stops at the first and the last', () => {
    expect(pctGridMove(map, { line: 1, column: 1 }, 'down')).toEqual({
      line: 2,
      column: 1,
    });
    expect(pctGridMove(map, { line: 2, column: 1 }, 'down')).toEqual({
      line: 3,
      column: 1,
    });
    expect(pctGridMove(map, { line: 1, column: 1 }, 'up')).toEqual({
      line: 0,
      column: 1,
    });
    expect(pctGridMove(map, { line: 0, column: 1 }, 'up')).toEqual({
      line: 0,
      column: 1,
    });
    expect(pctGridMove(map, { line: 4, column: 1 }, 'down')).toEqual({
      line: 4,
      column: 1,
    });
  });

  it('moves by a page, and stops at the edges', () => {
    expect(pctGridMove(map, { line: 1, column: 2 }, 'page-down')).toEqual({
      line: 3,
      column: 2,
    });
    expect(pctGridMove(map, { line: 3, column: 2 }, 'page-down')).toEqual({
      line: 4,
      column: 2,
    });
    expect(pctGridMove(map, { line: 3, column: 2 }, 'page-up')).toEqual({
      line: 1,
      column: 2,
    });
    expect(pctGridMove(map, { line: 1, column: 2 }, 'page-up')).toEqual({
      line: 0,
      column: 2,
    });
  });

  it("goes to the line's ends, and to the grid's", () => {
    expect(pctGridMove(map, { line: 1, column: 1 }, 'start')).toEqual({
      line: 1,
      column: 0,
    });
    expect(pctGridMove(map, { line: 1, column: 0 }, 'end')).toEqual({
      line: 1,
      column: 2,
    });
    expect(pctGridMove(map, { line: 2, column: 0 }, 'end')).toEqual({
      line: 2,
      column: 2,
    });
    expect(pctGridMove(map, { line: 3, column: 2 }, 'first')).toEqual({
      line: 0,
      column: 0,
    });
    expect(pctGridMove(map, { line: 1, column: 0 }, 'last')).toEqual({
      line: 4,
      column: Number.POSITIVE_INFINITY,
    });
  });

  it('leaves a move along a line not drawn, or of no cells, where it was', () => {
    const at = { line: 4, column: 1 };
    expect(pctGridMove(map, at, 'next')).toBe(at);
    expect(pctGridMove(map, at, 'previous')).toBe(at);
    expect(pctGridMove(map, at, 'end')).toEqual(at);
    expect(pctGridMove(map, at, 'start')).toEqual({ line: 4, column: 0 });
    const empty: PctGridMap = { lines: 1, cellsOf: () => [], page: 1 };
    expect(pctGridMove(empty, { line: 0, column: 0 }, 'next')).toEqual({
      line: 0,
      column: 0,
    });
    expect(pctGridMove(empty, { line: 0, column: 3 }, 'end')).toEqual({
      line: 0,
      column: 3,
    });
  });

  it('stays on line 0 in a grid of no lines', () => {
    const none: PctGridMap = { lines: 0, cellsOf: () => null, page: 1 };
    expect(pctGridMove(none, { line: 0, column: 0 }, 'last')).toEqual({
      line: 0,
      column: Number.POSITIVE_INFINITY,
    });
    expect(pctGridMove(none, { line: 0, column: 0 }, 'down')).toEqual({
      line: 0,
      column: 0,
    });
  });
});
