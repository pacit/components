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
 * whatever was measured, and `total` is the sum of the three. The line under `scrollTop` is
 * always met, so a view of no height — a frame not yet laid out — still draws it and its
 * overscan. A `scrollTop` past the last full view reads as that view, where the browser
 * clamps it. The overscan is a whole number of lines, at least none.
 *
 * Each call walks every line, which a thousand lines afford on every scroll; a window over a
 * million takes its sums from a structure of its own.
 *
 * @since next
 */
export function pctWindow(of: PctWindowInput): PctWindow {
  const { count, heightOf, estimate, scrollTop, viewport, overscan } = of;
  const height = (index: number) => heightOf(index) ?? estimate;
  let whole = 0;
  for (let index = 0; index < count; index++) whole += height(index);
  // A top past the end reads as the last view the frame can show, where the browser will
  // clamp it, so a list that shrank under a scrolled frame draws a full view, not one line.
  const top = Math.max(0, Math.min(scrollTop, whole - viewport));
  const bottom = top + viewport;
  const around = Math.max(0, Math.floor(overscan));
  // The line under the view's top is always met; after it, every line that starts above the
  // view's bottom.
  let first = 0;
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
  if (!found) {
    // A view of no height at the very end has the last line under it; a list of no height
    // has the first.
    first = top > 0 ? count - 1 : 0;
    past = Math.min(count, first + 1);
  }
  const start = Math.max(0, first - around);
  const end = Math.min(count, past + around);
  // Each part summed on its own, and the whole as their sum, so the three add up exactly in
  // floating point as they do on paper.
  let lead = 0;
  for (let index = 0; index < start; index++) lead += height(index);
  let drawn = 0;
  for (let index = start; index < end; index++) drawn += height(index);
  let tail = 0;
  for (let index = end; index < count; index++) tail += height(index);
  return { start, end, lead, tail, total: lead + drawn + tail };
}
