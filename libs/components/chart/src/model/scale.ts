/**
 * Scales: a value to a position and back. Pure arithmetic with no import from Angular, public
 * because an application computing beside a chart computes with the same functions
 * ([0099](../../../../../docs/decisions/0099-a-chart-is-scales-the-marks-share-and-a-ready-chart-is-a-recipe.md)).
 */

/**
 * The span of values a scale covers, the lower first.
 *
 * @since next
 */
export type PctDomain = readonly [min: number, max: number];

/**
 * The span of positions a scale maps onto, in pixels. The start is where the domain's minimum
 * lands, so a vertical axis passes its bottom first: `[height, 0]`.
 *
 * @since next
 */
export type PctScaleRange = readonly [start: number, end: number];

/**
 * A continuous scale.
 *
 * @since next
 */
export interface PctScale {
  readonly domain: PctDomain;
  readonly range: PctScaleRange;
  /** The position of a value. Outside the domain it extrapolates, so a line leaves the plot at its edge. */
  map(value: number): number;
  /** The value at a position, the inverse of `map`. */
  invert(position: number): number;
}

/**
 * A linear scale. A domain of one value maps every value to the middle of the range, and
 * inverts every position to that value: a flat line is drawn across the middle rather than at
 * an edge.
 *
 * @example
 * const y = pctLinear([0, 40], [300, 0]);
 * y.map(10); // 225
 * y.invert(150); // 20
 *
 * @since next
 */
export function pctLinear(domain: PctDomain, range: PctScaleRange): PctScale {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  if (d0 === d1) {
    const middle = (r0 + r1) / 2;
    return { domain, range, map: () => middle, invert: () => d0 };
  }
  const k = (r1 - r0) / (d1 - d0);
  return {
    domain,
    range,
    map: (value) => r0 + (value - d0) * k,
    invert: (position) => d0 + (position - r0) / k,
  };
}

/**
 * A logarithmic scale, base 10. Its domain is above zero; a value at or below zero has no
 * position, and maps to `NaN`, which a path reads as a gap.
 *
 * @since next
 */
export function pctLog(domain: PctDomain, range: PctScaleRange): PctScale {
  const inner = pctLinear(
    [Math.log10(domain[0]), Math.log10(domain[1])],
    range,
  );
  return {
    domain,
    range,
    map: (value) => (value > 0 ? inner.map(Math.log10(value)) : NaN),
    invert: (position) => 10 ** inner.invert(position),
  };
}

/**
 * Categories laid side by side: each takes a slot of equal width, and its band stands in the
 * middle of the slot with `inner` of the slot left free, split between its two sides.
 *
 * @since next
 */
export interface PctBandScale {
  readonly count: number;
  readonly range: PctScaleRange;
  /** The width of one slot. Negative when the range runs backwards. */
  readonly step: number;
  /** The width of a band; negative, as the step is, when the range runs backwards. */
  readonly bandwidth: number;
  /** Where the band of category `index` starts and ends. */
  band(index: number): PctScaleRange;
  /** The middle of the slot of category `index`. */
  middle(index: number): number;
  /** The category whose slot holds `position`, or `-1` outside every slot. */
  indexAt(position: number): number;
}

/**
 * A band scale over `count` categories. `inner` is the share of each slot left free, `0.2` by
 * default, so a group of bars takes four fifths of its interval.
 *
 * @example
 * const days = pctBand(31, [0, 620]);
 * days.band(0); // [2, 18]
 * days.indexAt(30); // 1
 *
 * @since next
 */
export function pctBand(
  count: number,
  range: PctScaleRange,
  inner = 0.2,
): PctBandScale {
  const [r0, r1] = range;
  const step = count > 0 ? (r1 - r0) / count : 0;
  const pad = (step * inner) / 2;
  return {
    count,
    range,
    step,
    bandwidth: step - 2 * pad,
    band: (index) => [r0 + index * step + pad, r0 + (index + 1) * step - pad],
    middle: (index) => r0 + (index + 0.5) * step,
    indexAt: (position) => {
      // With no categories the step is 0 and the division gives no finite index.
      const index = Math.floor((position - r0) / step);
      return index >= 0 && index < count ? index : -1;
    },
  };
}
