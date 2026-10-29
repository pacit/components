/**
 * The window: the stretch of the horizontal axis a chart shows, and the one function every
 * gesture moves it through
 * ([0101](../../../../../docs/decisions/0101-the-window-the-cursor-and-the-selection-are-the-applications-models.md)).
 */

/**
 * A stretch of the horizontal axis, `from` before `to`: instants on a time axis, values on a
 * linear one.
 *
 * @since next
 */
export interface PctWindow {
  readonly from: number;
  readonly to: number;
}

/**
 * A move of the window, every field optional:
 * - `factor` — above 1 zooms in, below 1 out; the span is divided by it,
 * - `anchor` — the point that stays put while zooming, as a share of the window from its start
 *   (0.5, the middle, by default),
 * - `shift` — a pan, as a share of the new span; positive moves later.
 *
 * @since next
 */
export interface PctWindowChange {
  readonly factor?: number;
  readonly anchor?: number;
  readonly shift?: number;
}

/**
 * The window after `change`, held inside `limits` and no narrower than `minSpan` nor wider
 * than the limits. At a limit the window stops and keeps its span: a pan against the end of
 * the history does not shrink what is shown.
 *
 * @example
 * pctWindowTransform(window, { factor: 2, anchor: 0.25 }, limits, 120_000); // zoom in about the first quarter
 * pctWindowTransform(window, { shift: -0.1 }, limits, 120_000); // a tenth earlier
 *
 * @since next
 */
export function pctWindowTransform(
  window: PctWindow,
  change: PctWindowChange,
  limits: PctWindow | null,
  minSpan: number,
): PctWindow {
  const { factor: asked = 1, anchor = 0.5, shift = 0 } = change;
  // A factor of zero, below it or not a number zooms nowhere.
  const factor = asked > 0 ? asked : 1;
  const span = window.to - window.from;
  const widest = limits ? limits.to - limits.from : Infinity;
  const next = Math.min(widest, Math.max(minSpan, span / factor));
  const fixed = window.from + span * anchor;
  let from = fixed - next * anchor + shift * next;
  if (!limits) return { from, to: from + next };
  // The lower limit last, and the end held to the upper: at the full span the subtraction can
  // land an ulp outside either.
  from = Math.max(limits.from, Math.min(limits.to - next, from));
  return { from, to: Math.min(limits.to, from + next) };
}

/**
 * The window a moment later, for a chart that follows the present: a window whose end had
 * reached `before` moves with the clock to `now` and keeps its span; any other stays where the
 * reader left it.
 *
 * @since next
 */
export function pctWindowFollow(
  window: PctWindow,
  before: number,
  now: number,
): PctWindow {
  if (window.to < before) return window;
  const by = now - before;
  return { from: window.from + by, to: window.to + by };
}
