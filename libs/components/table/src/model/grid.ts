/**
 * Where a grid's tab stop stands: a line, counted from the header's first row, and a column,
 * counted from the first leading one. The column is the one the stop was asked for, so a
 * move down from a column a line spans comes back to that column on the next line that
 * splits it.
 *
 * @since next
 */
export interface PctGridPlace {
  readonly line: number;
  readonly column: number;
}

/**
 * A cell of a line, by the first column it covers and how many it spans.
 *
 * @since next
 */
export interface PctGridCellSpan {
  readonly start: number;
  readonly span: number;
}

/**
 * What a move is made over: how many lines there are, the cells of the lines drawn, and how
 * many lines a page holds.
 *
 * @since next
 */
export interface PctGridMap {
  readonly lines: number;
  /** The cells of a line, in order; `null` for a line not drawn. */
  readonly cellsOf: (line: number) => readonly PctGridCellSpan[] | null;
  /** The lines a page moves by, at least one. */
  readonly page: number;
}

/**
 * A move of the tab stop: along a line, to a line above or below, to an end of the line, to
 * the grid's first or last cell, or by a page.
 *
 * @since next
 */
export type PctGridMove =
  | 'next'
  | 'previous'
  | 'up'
  | 'down'
  | 'start'
  | 'end'
  | 'first'
  | 'last'
  | 'page-up'
  | 'page-down';

/**
 * The keys of the APG's grid (https://www.w3.org/WAI/ARIA/apg/patterns/grid/), read as a
 * move: the arrows, Home and End, with Ctrl or ⌘ the grid's ends, Page Up and Page Down. A
 * right-to-left grid turns the horizontal arrows, so the arrow points where the stop goes.
 * Shift extends a range from where it started. An arrow with Ctrl, ⌘ or Alt, and anything
 * else, is not the grid's: `null`, and the key is left to the browser and the reader.
 *
 * @example
 * pctGridKey({ key: 'ArrowLeft', shiftKey: false, ctrlKey: false, metaKey: false, altKey: false }, true);
 * // { move: 'next', extend: false }
 *
 * @since next
 */
export function pctGridKey(
  event: Pick<
    KeyboardEvent,
    'key' | 'shiftKey' | 'ctrlKey' | 'metaKey' | 'altKey'
  >,
  rtl: boolean,
): { readonly move: PctGridMove; readonly extend: boolean } | null {
  if (event.altKey) return null;
  const command = event.ctrlKey || event.metaKey;
  const move = command ? COMMANDS[event.key] : KEYS[event.key];
  if (move === undefined) return null;
  const turned = rtl ? (TURNED[move] ?? move) : move;
  return { move: turned, extend: event.shiftKey };
}

const KEYS: Readonly<Record<string, PctGridMove>> = {
  ArrowRight: 'next',
  ArrowLeft: 'previous',
  ArrowUp: 'up',
  ArrowDown: 'down',
  Home: 'start',
  End: 'end',
  PageUp: 'page-up',
  PageDown: 'page-down',
};

const COMMANDS: Readonly<Record<string, PctGridMove>> = {
  Home: 'first',
  End: 'last',
};

const TURNED: Readonly<Partial<Record<PctGridMove, PctGridMove>>> = {
  next: 'previous',
  previous: 'next',
};

/**
 * The cell of a line that covers a column: the last that starts at it or before, so a
 * column past the line's last cell is that cell's. -1 for a line of no cells.
 *
 * @since next
 */
export function pctGridCellAt(
  cells: readonly PctGridCellSpan[],
  column: number,
): number {
  let at = cells.length === 0 ? -1 : 0;
  for (let c = 1; c < cells.length; c++) if (cells[c].start <= column) at = c;
  return at;
}

/**
 * Where the tab stop goes on a move. Along a line it steps over a cell, and its column becomes
 * that cell's first; across lines it keeps the column it was asked for. It stops at the
 * grid's edges, and a move along a line not drawn leaves it where it was.
 *
 * @example
 * pctGridMove({ lines: 3, cellsOf: () => [{ start: 0, span: 1 }, { start: 1, span: 2 }], page: 10 }, { line: 0, column: 0 }, 'next');
 * // { line: 0, column: 1 }
 *
 * @since next
 */
export function pctGridMove(
  map: PctGridMap,
  at: PctGridPlace,
  move: PctGridMove,
): PctGridPlace {
  const last = map.lines - 1;
  const line = (to: number): PctGridPlace => ({
    line: Math.max(0, Math.min(last, to)),
    column: at.column,
  });
  const cells = map.cellsOf(at.line);
  switch (move) {
    case 'up':
      return line(at.line - 1);
    case 'down':
      return line(at.line + 1);
    case 'page-up':
      return line(at.line - map.page);
    case 'page-down':
      return line(at.line + map.page);
    case 'first':
      return { line: 0, column: 0 };
    case 'last':
      // The last line's last cell, which covers every column from its start on.
      return { line: Math.max(last, 0), column: Number.POSITIVE_INFINITY };
    case 'start':
      return { line: at.line, column: 0 };
    case 'end':
      return {
        line: at.line,
        column: cells?.at(-1)?.start ?? at.column,
      };
    default: {
      if (cells === null || cells.length === 0) return at;
      const step = move === 'next' ? 1 : -1;
      const c = pctGridCellAt(cells, at.column) + step;
      return c < 0 || c >= cells.length
        ? at
        : { line: at.line, column: cells[c].start };
    }
  }
}
