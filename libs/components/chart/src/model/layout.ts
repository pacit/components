/**
 * Where a tooltip stands beside the cursor: on its right when it fits inside the plot, on its
 * left otherwise, always `gap` away from the cursor, so a narrow tooltip sits as close as a
 * wide one. When it fits on neither side, it takes the roomier side and is held inside the
 * plot.
 *
 * @example
 * const { left, side } = pctTooltipPlace(cursorX, tooltip.offsetWidth, plotLeft, plotRight);
 *
 * @since next
 */
export function pctTooltipPlace(
  cursor: number,
  width: number,
  start: number,
  end: number,
  gap = 8,
): { readonly left: number; readonly side: 'start' | 'end' } {
  if (cursor + gap + width <= end) return { left: cursor + gap, side: 'end' };
  if (cursor - gap - width >= start)
    return { left: cursor - gap - width, side: 'start' };
  return end - cursor >= cursor - start
    ? { left: Math.max(start, end - width), side: 'end' }
    : { left: start, side: 'start' };
}

/**
 * Which labels of a row to show so that none touches its neighbour: every `n`-th, with the
 * smallest `n` that leaves at least `gap` between the shown ones, counted so that `keep` (a
 * selected bar, say) is always among them.
 *
 * `middles` are the labels' centres in order along the axis, `widths` their widths.
 *
 * @example
 * pctThinLabels(centres, widths, 4, selected); // [true, false, true, false, …]
 *
 * @since next
 */
export function pctThinLabels(
  middles: readonly number[],
  widths: readonly number[],
  gap: number,
  keep = 0,
): readonly boolean[] {
  const count = middles.length;
  const anchor = keep >= 0 && keep < count ? keep : 0;
  // Ends: at `every` as large as the row, one label is shown and nothing can touch it.
  for (let every = 1; ; every++) {
    let fits = true;
    let previous = -1;
    for (let i = anchor % every; i < count; i += every) {
      if (previous >= 0) {
        const room =
          Math.abs(middles[i] - middles[previous]) -
          (widths[i] + widths[previous]) / 2;
        if (room < gap) {
          fits = false;
          break;
        }
      }
      previous = i;
    }
    if (fits) return middles.map((_, i) => i % every === anchor % every);
  }
}
