/**
 * The brush: a stretch of the horizontal axis drawn by a drag and moved by its edges — the
 * arithmetic behind `pct-chart`'s `brush`, held in the window the chart shows and never
 * narrower than its narrowest span
 * ([0119](../../../../../docs/decisions/0119-a-brush-is-the-selection-drawn-by-a-drag-and-moved-by-two-ranges.md)).
 */
import type { PctWindow } from './window';

/**
 * Where a press lands on a selection: on one of its edges, inside it, or outside it.
 *
 * @since next
 */
export type PctBrushGrip = 'from' | 'to' | 'inside' | 'outside';

/**
 * One edge of a selection.
 *
 * @since next
 */
export type PctBrushEdge = 'from' | 'to';

/**
 * Which part of a selection the pixel `px` is on, the edges standing at `from` and `to`: an
 * edge within `near` pixels — the nearer one, the start on a tie — then inside or outside.
 *
 * @example
 * pctBrushGrip(104, 100, 300, 12); // 'from'
 * pctBrushGrip(200, 100, 300, 12); // 'inside'
 *
 * @since next
 */
export function pctBrushGrip(
  px: number,
  from: number,
  to: number,
  near: number,
): PctBrushGrip {
  const toFrom = Math.abs(px - from);
  const toTo = Math.abs(px - to);
  if (Math.min(toFrom, toTo) <= near) return toFrom <= toTo ? 'from' : 'to';
  return px > from && px < to ? 'inside' : 'outside';
}

/** `value` held between `low` and `high`, `low` winning when they cross. */
const hold = (value: number, low: number, high: number): number =>
  Math.max(low, Math.min(high, value));

/**
 * The selection with one edge put at `at`: held inside `limits`, and never closer to the other
 * edge than `minSpan` — or than the limits' own span, when that is narrower.
 *
 * @example
 * pctBrushEdgeAt({ from: 10, to: 50 }, 'from', 30, { from: 0, to: 100 }, 5); // { from: 30, to: 50 }
 * pctBrushEdgeAt({ from: 10, to: 50 }, 'to', 12, { from: 0, to: 100 }, 5); // { from: 10, to: 15 }
 *
 * @since next
 */
export function pctBrushEdgeAt(
  selection: PctWindow,
  edge: PctBrushEdge,
  at: number,
  limits: PctWindow,
  minSpan: number,
): PctWindow {
  const gap = Math.min(minSpan, limits.to - limits.from);
  if (edge === 'from') {
    const to = hold(selection.to, limits.from + gap, limits.to);
    return { from: hold(at, limits.from, to - gap), to };
  }
  const from = hold(selection.from, limits.from, limits.to - gap);
  return { from, to: hold(at, from + gap, limits.to) };
}

/**
 * The selection a drag makes, from the press at `at` to the pointer at `now`, by where it
 * began (`grip`) on the selection it began on (`start`):
 * - `outside` — a new selection between the two, widened to `minSpan` past its far end,
 * - `inside` — the same span moved by the drag, stopped at a limit,
 * - `from` or `to` — that edge put where the pointer is.
 *
 * @example
 * pctBrushDrag('outside', { from: 0, to: 100 }, 70, 40, { from: 0, to: 100 }, 1); // { from: 40, to: 70 }
 * pctBrushDrag('inside', { from: 20, to: 40 }, 30, 90, { from: 0, to: 100 }, 1); // { from: 80, to: 100 }
 *
 * @since next
 */
export function pctBrushDrag(
  grip: PctBrushGrip,
  start: PctWindow,
  at: number,
  now: number,
  limits: PctWindow,
  minSpan: number,
): PctWindow {
  if (grip === 'from' || grip === 'to')
    return pctBrushEdgeAt(start, grip, now, limits, minSpan);
  if (grip === 'inside') {
    const span = start.to - start.from;
    const from = hold(start.from + now - at, limits.from, limits.to - span);
    return { from, to: from + span };
  }
  // The press is the anchor, and the edge the pointer drags is the one that gives way.
  const a = hold(at, limits.from, limits.to);
  const b = hold(now, limits.from, limits.to);
  return a <= b
    ? pctBrushEdgeAt({ from: a, to: b }, 'to', b, limits, minSpan)
    : pctBrushEdgeAt({ from: b, to: a }, 'from', b, limits, minSpan);
}
