/**
 * What the table reads off itself to fit its columns into its frame.
 *
 * @since next
 */
export interface PctFitInput {
  /** The frame's width. */
  readonly width: number;
  /** The table's width as drawn: the frame's, or more when it overflows. */
  readonly total: number;
  /** The columns that may hide, in the order they hide. */
  readonly order: readonly string[];
  /** How many of them are hidden now: the first ones. */
  readonly count: number;
  /** The width of a column shown now, read off its header cell. */
  readonly widthOf: (id: string) => number;
  /** For each hidden column, the width the table needed while it was shown. */
  readonly needed: readonly number[];
}

/**
 * How many columns the table hides, and the width each needed.
 *
 * @since next
 */
export interface PctFit {
  readonly count: number;
  readonly needed: readonly number[];
}

/**
 * How many columns of the hide order a table hides to fit its frame, and how much room each
 * needs to come back.
 *
 * A table that overflows hides as many more as their widths cover, in one answer, and each
 * keeps the width the table needed while it was shown. A table that fits shows a column
 * again — the last hidden first — once the frame is as wide as that column needed and
 * `hysteresis` more, so a frame resized across the line does not make it come and go.
 *
 * @example
 * pctFit({ width: 250, total: 430, order: ['seen', 'power'], count: 0, widthOf: () => 100, needed: [] }, 8);
 * // { count: 2, needed: [430, 330] }
 *
 * @since next
 */
export function pctFit(input: PctFitInput, hysteresis: number): PctFit {
  const { width, total, order, widthOf } = input;
  const needed = input.needed.slice(0, input.count);
  let count = input.count;
  let freed = 0;
  while (count < order.length && total - freed > width) {
    needed.push(total - freed);
    freed += widthOf(order[count]);
    count++;
  }
  if (count > input.count) return { count, needed };
  while (count > 0 && width >= needed[count - 1] + hysteresis) {
    needed.pop();
    count--;
  }
  return { count, needed };
}
