/**
 * What the window is computed from: how many lines there are, the height of each one that
 * has been measured, the estimate for the rest, and where the frame stands.
 *
 * @since next
 */
export interface PctWindowInput {
  /** How many lines the table has. */
  readonly count: number;
  /** The measured height of a line, or `undefined` while it has not been drawn. */
  readonly heightOf: (index: number) => number | undefined;
  /** The height counted for a line not yet measured. */
  readonly estimate: number;
  /** How far the frame is scrolled past the first line, in pixels. */
  readonly scrollTop: number;
  /** How tall the frame shows, in pixels. */
  readonly viewport: number;
  /** How many lines to draw past each edge of the view. */
  readonly overscan: number;
}

/**
 * The lines to draw, `[start, end)`, and the space around them: `lead` above, `tail` below,
 * `total` for all of it.
 *
 * @since next
 */
export interface PctWindow {
  readonly start: number;
  readonly end: number;
  readonly lead: number;
  readonly tail: number;
  readonly total: number;
}

/**
 * The window over lines of measured heights: every line that meets the view
 * `[scrollTop, scrollTop + viewport)`, and `overscan` more on each side.
 *
 * **Measured, not assumed** ([0098](../../../../../docs/decisions/0098-a-tables-window-is-opt-in-and-the-rows-it-skips-are-two-pseudo-rows.md)):
 * a details row is taller than a row of data and a group heading has a height of its own, so
 * each line counts at its measured height and only a line never drawn at the estimate. The
 * space is a sum over those heights, so `lead + the drawn lines' heights + tail === total`
 * whatever was measured. The line under `scrollTop` is always met, so a view of no height —
 * a frame not yet laid out — still draws it and its overscan; a `scrollTop` past the end is
 * read as the end, where the last line is under it.
 *
 * @since next
 */
export function pctWindow(of: PctWindowInput): PctWindow {
  const { count, heightOf, estimate, scrollTop, viewport, overscan } = of;
  const height = (index: number) => heightOf(index) ?? estimate;
  let total = 0;
  for (let index = 0; index < count; index++) total += height(index);
  // A negative top reads as the first line's; one past the end meets no line's bottom, so the
  // last line stays the one under it, and a view of no height or less meets only that line.
  const top = Math.max(0, scrollTop);
  const bottom = top + viewport;
  // The line under the view's top is always met; after it, every line that starts above the
  // view's bottom. Past the end, the last line is the one under the top.
  let first = count - 1;
  let past = count;
  let found = false;
  let y = 0;
  for (let index = 0; index < count; index++) {
    const next = y + height(index);
    if (!found) {
      if (next > top) {
        first = index;
        found = true;
      }
    } else if (y >= bottom) {
      past = index;
      break;
    }
    y = next;
  }
  const start = Math.max(0, first - overscan);
  const end = Math.min(count, past + overscan);
  let lead = 0;
  for (let index = 0; index < start; index++) lead += height(index);
  let drawn = 0;
  for (let index = start; index < end; index++) drawn += height(index);
  return { start, end, lead, tail: total - lead - drawn, total };
}
