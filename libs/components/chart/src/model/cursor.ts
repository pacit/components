import type { PctColumns } from './columns';
import { pctIndexAt } from './value-at';
import type { PctWindow } from './window';

/**
 * The first reading of `columns` beyond `x` in `direction` — strictly beyond, or at `x` too
 * when `inclusive` — that is no gap, or `null` when there is none.
 */
function beyond(
  columns: PctColumns,
  x: number,
  direction: 1 | -1,
  inclusive: boolean,
): number | null {
  const { xs, ys } = columns;
  // The last index at or before `x`, and the first of the run of readings on `x` itself when
  // there is one: the walk starts on it (taken) or steps back from it (passed). An index off
  // either end reads `undefined`, which is no position and no gap, so the walk stops there.
  const at = pctIndexAt(columns, x);
  const on = xs[at] === x ? firstAt(columns, at) : null;
  let i =
    direction === 1
      ? inclusive && on !== null
        ? on
        : at + 1
      : inclusive
        ? at
        : on !== null
          ? on - 1
          : at;
  // A gap is no reading: the walk steps over it, as many as there are.
  while (Number.isNaN(ys[i])) i += direction;
  return xs[i] ?? null;
}

/** The first index of the run of readings at the position of `at`. */
function firstAt(columns: PctColumns, at: number): number {
  let i = at;
  while (columns.xs[i - 1] === columns.xs[at]) i--;
  return i;
}

/** The nearest of the candidates in `direction`, inside the window. */
function nearest(
  candidates: readonly (number | null)[],
  direction: 1 | -1,
  window: PctWindow,
): number | null {
  let best: number | null = null;
  for (const c of candidates) {
    if (c === null || c < window.from || c > window.to) continue;
    if (best === null || (direction === 1 ? c < best : c > best)) best = c;
  }
  return best;
}

/**
 * Where a cursor moved by one key goes: to the next position in `direction` that shows a
 * different reading
 * ([0103](../../../../../docs/decisions/0103-a-chart-is-a-named-picture-and-its-cursor-is-the-platforms-range.md)).
 * That is the next reading of any series when readings stand more than `pixel` apart, and the
 * first reading a pixel or more away when they are denser — a column of pixels at a time, so a
 * key never moves the cursor along readings the eye cannot tell apart.
 *
 * With no cursor yet, the first move goes to the first reading in the window (`direction` 1)
 * or the last (−1). `null` when the window holds no reading; `from` itself when nothing lies
 * further that way. A gap is no reading.
 *
 * @example
 * const next = pctCursorStep(series, cursor, 1, window, window span / plot width);
 *
 * @since next
 */
export function pctCursorStep(
  series: readonly PctColumns[],
  from: number | null,
  direction: 1 | -1,
  window: PctWindow,
  pixel: number,
): number | null {
  if (from === null)
    return nearest(
      series.map((c) =>
        beyond(c, direction === 1 ? window.from : window.to, direction, true),
      ),
      direction,
      window,
    );
  const next = nearest(
    series.map((c) => beyond(c, from, direction, false)),
    direction,
    window,
  );
  if (next === null) return from;
  if (Math.abs(next - from) >= pixel) return next;
  // Denser than the pixels: the first reading a whole pixel away, or the edge's last.
  const far = nearest(
    series.map((c) => beyond(c, from + direction * pixel, direction, true)),
    direction,
    window,
  );
  return (
    far ?? pctCursorStep(series, null, -direction as 1 | -1, window, pixel)
  );
}

/**
 * Where a cursor jumps to: the first reading at `target` or beyond it in `direction`, inside the
 * window — or, when none is, the last reading that way. What Page Up and Page Down do with a
 * tenth of the window, and Home and End with its ends.
 *
 * @example
 * pctCursorJump(series, cursor + span / 10, 1, window); // Page Up
 *
 * @since next
 */
export function pctCursorJump(
  series: readonly PctColumns[],
  target: number,
  direction: 1 | -1,
  window: PctWindow,
): number | null {
  const at = Math.min(window.to, Math.max(window.from, target));
  return (
    nearest(
      series.map((c) => beyond(c, at, direction, true)),
      direction,
      window,
    ) ??
    nearest(
      series.map((c) =>
        beyond(
          c,
          direction === 1 ? window.to : window.from,
          -direction as 1 | -1,
          true,
        ),
      ),
      -direction as 1 | -1,
      window,
    )
  );
}
