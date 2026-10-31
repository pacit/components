/**
 * The heights of a list's lines: each one measured, or counted at the estimate until it is.
 * Where a line starts and which line stands at a height are answered in steps of the
 * logarithm of the count, not by a walk of the list, so a window over a million lines reads
 * them on every scroll
 * ([0098](../../../../../docs/decisions/0098-a-tables-window-is-opt-in-and-the-rows-it-skips-are-two-pseudo-rows.md)).
 *
 * Two Fenwick trees hold the sums: of the heights measured, and of how many are. A line not
 * measured adds the estimate, so a range's height is its measured sum and the estimate for
 * each of the rest.
 *
 * @since next
 */
export class PctLineHeights {
  /** The height measured for each line, or `undefined` while it has not been. */
  private readonly measured: (number | undefined)[] = [];
  /** The measured heights' tree, counted from 1. */
  private readonly sums: Float64Array;
  /** How many lines each node of the tree holds a measured height for. */
  private readonly counts: Float64Array;
  /** The largest power of two not above the count: where a search down the tree starts. */
  private readonly step: number;

  /**
   * @param count how many lines there are, a whole number of at least none
   * @param estimate the height a line counts at until it is measured, at least none
   */
  constructor(
    readonly count: number,
    readonly estimate: number,
  ) {
    this.sums = new Float64Array(count + 1);
    this.counts = new Float64Array(count + 1);
    let step = 1;
    while (step * 2 <= count) step *= 2;
    this.step = step;
  }

  /**
   * The height of every line together.
   *
   * @since next
   */
  get total(): number {
    return this.offsetOf(this.count);
  }

  /**
   * The height line `index` counts at: measured, or the estimate.
   *
   * @since next
   */
  heightOf(index: number): number {
    return this.measured[index] ?? this.estimate;
  }

  /**
   * Writes the height measured for line `index`, or `undefined` to count it at the estimate
   * again, and returns by how much the line's height changed.
   *
   * @since next
   */
  set(index: number, height: number | undefined): number {
    const was = this.measured[index];
    const change = (height ?? this.estimate) - (was ?? this.estimate);
    this.measured[index] = height;
    const sum = (height ?? 0) - (was ?? 0);
    const count = (height === undefined ? 0 : 1) - (was === undefined ? 0 : 1);
    for (let node = index + 1; node <= this.count; node += node & -node) {
      this.sums[node] += sum;
      this.counts[node] += count;
    }
    return change;
  }

  /**
   * Where line `index` starts: the height of every line before it. `count` gives the total.
   *
   * @since next
   */
  offsetOf(index: number): number {
    let sum = 0;
    let count = 0;
    const end = Math.max(0, Math.min(this.count, index));
    for (let node = end; node > 0; node -= node & -node) {
      sum += this.sums[node];
      count += this.counts[node];
    }
    return sum + (end - count) * this.estimate;
  }

  /**
   * How many lines, counted from the first, add up to at most `y`, or to less than it when
   * `strict`: walked down the tree, one level a step.
   */
  private reach(y: number, strict: boolean): number {
    let at = 0;
    let left = y;
    for (let step = this.step; step > 0; step >>= 1) {
      const node = at + step;
      if (node > this.count) continue;
      const height =
        this.sums[node] + (step - this.counts[node]) * this.estimate;
      if (strict ? height < left : height <= left) {
        at = node;
        left -= height;
      }
    }
    return at;
  }

  /**
   * The first line that ends past `y`: the line standing at that height, lines of no height
   * before it passed over. `count` when no line does.
   *
   * @since next
   */
  indexAt(y: number): number {
    return this.reach(y, false);
  }

  /**
   * The first line that starts at `y` or below it; `count` when none does.
   *
   * @since next
   */
  firstFrom(y: number): number {
    return y <= 0 ? 0 : Math.min(this.count, this.reach(y, true) + 1);
  }
}

/**
 * What the window is computed from: the lines' heights, where the view stands and how tall it
 * is, and the tallest space the window may take.
 *
 * @since next
 */
export interface PctWindowInput {
  readonly heights: PctLineHeights;
  /** How far the view is scrolled past the first line, in pixels of the space drawn. */
  readonly scrollTop: number;
  /** How tall the view is, in pixels. */
  readonly viewport: number;
  /** How many lines to draw past each edge of the view. */
  readonly overscan: number;
  /** The tallest the space may be; past it the lines are scaled into it. No limit by default. */
  readonly limit?: number;
}

/**
 * The lines to draw, `[start, end)`, and the space around them: `lead` above, `tail` below,
 * `space` for all of it. `total` is the lines' own height, which `space` is unless it is over
 * the limit, and `top` is where the view's top stands among the lines.
 *
 * @since next
 */
export interface PctWindow {
  readonly start: number;
  readonly end: number;
  readonly lead: number;
  readonly tail: number;
  readonly space: number;
  readonly total: number;
  readonly top: number;
}

/** Where the view's top stands among the lines, for a top in the space drawn. */
function linesTop(
  top: number,
  total: number,
  space: number,
  view: number,
): number {
  return space === total ? top : (top * (total - view)) / (space - view);
}

/**
 * The window over lines of measured heights: every line that meets the view, and `overscan`
 * more on each side.
 *
 * **Measured, not assumed:** each line counts at its measured height and only a line never
 * drawn at the estimate, so `lead + the drawn lines' heights + tail === space`. The line under
 * the view's top is always met, so a view of no height — a frame not yet laid out — still draws
 * it and its overscan. A top past the last full view reads as that view, where the browser
 * clamps it. The overscan is a whole number of lines, at least none.
 *
 * **Scaled past the limit:** Firefox collapses a block taller than 17,895,697 px, so lines
 * taller together than `limit` are drawn in a space of `limit`, and the view's top maps to the
 * lines in proportion: the first view shows the first line, the last the last. The drawn lines
 * stand where that map puts them under the view, so a pixel of scroll moves them by more than a
 * pixel, and the overscan is cut where the space above or below has no room for it.
 *
 * @since next
 */
export function pctWindow(of: PctWindowInput): PctWindow {
  const { heights, scrollTop, overscan } = of;
  const count = heights.count;
  const total = heights.total;
  const view = Math.max(0, of.viewport);
  const space = Math.min(total, of.limit ?? Infinity);
  const domTop = Math.max(0, Math.min(scrollTop, space - view));
  const top = linesTop(domTop, total, space, view);
  const around = Math.max(0, Math.floor(overscan));
  if (count === 0)
    return { start: 0, end: 0, lead: 0, tail: 0, space: 0, total: 0, top: 0 };
  // The line under the top, or, past every line's end, the last line — or the first of a list
  // of no height.
  const under = heights.indexAt(top);
  const first = under < count ? under : top > 0 ? count - 1 : 0;
  // After the first, every line that starts above the view's bottom; past every line's end,
  // the first alone.
  const past =
    under < count
      ? Math.min(count, Math.max(first + 1, heights.firstFrom(top + view)))
      : first + 1;
  // In a scaled space the lines above the top have only `domTop` of room, and those below
  // the rest: the overscan goes no further.
  const above = space === total ? 0 : heights.firstFrom(top - domTop);
  const below = space === total ? count : heights.indexAt(top + space - domTop);
  const start = Math.min(first, Math.max(first - around, above));
  const end = Math.max(past, Math.min(count, past + around, below));
  const from = heights.offsetOf(start);
  const drawn = heights.offsetOf(end) - from;
  // Unscaled, the view's top is the lines' and the lead is the lines' above the window.
  const lead = Math.max(0, Math.min(space - drawn, domTop - top + from));
  return {
    start,
    end,
    lead,
    tail: Math.max(0, space - lead - drawn),
    space,
    total,
    top,
  };
}

/**
 * Where a line stands in the view a scroll brings it to: at the view's top, its centre, its
 * bottom, or wherever is nearest from where the view is.
 *
 * @since next
 */
export type PctWindowAlign = 'start' | 'center' | 'end' | 'nearest';

/**
 * Where to scroll so that line `index` stands in the view as `align` says: a top in the space
 * drawn, through the same map {@link pctWindow} reads the top with, so the window at the top
 * returned has the line where it was asked for. A line taller than the view stands at its top
 * for `nearest`; the top is never past the last full view. `within` moves a `start` that many
 * pixels into the line: what keeps the line the view's top is in where it was.
 *
 * @since next
 */
export function pctWindowScroll(
  of: PctWindowInput & {
    readonly index: number;
    readonly align: PctWindowAlign;
    readonly within?: number;
  },
): number {
  const { heights, index, align } = of;
  const total = heights.total;
  const view = Math.max(0, of.viewport);
  const space = Math.min(total, of.limit ?? Infinity);
  // A top past the last full view asks what one at it would: the target is clamped below.
  const top = linesTop(Math.max(0, of.scrollTop), total, space, view);
  const start = heights.offsetOf(index);
  const height = heights.heightOf(index);
  const target =
    align === 'start'
      ? start + (of.within ?? 0)
      : align === 'end'
        ? start + height - view
        : align === 'center'
          ? start + height / 2 - view / 2
          : start < top || height > view
            ? start
            : Math.max(top, start + height - view);
  const clamped = Math.max(0, Math.min(target, total - view));
  return space === total
    ? clamped
    : (clamped * (space - view)) / (total - view);
}
