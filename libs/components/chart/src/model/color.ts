import type { PctDomain } from './scale';

/**
 * A colour scale as a mark declares it, for the legend of its ramp: sequential over two ends
 * or diverging over two ends and a middle, on a ramp of `steps` colours, writing its values in
 * `unit`.
 *
 * @since next
 */
export interface PctColorScale {
  readonly kind: 'sequential' | 'diverging';
  /** `[low, high]`, or `[low, mid, high]` for a diverging scale. */
  readonly domain: readonly number[];
  readonly steps: number;
  readonly name: string;
  readonly unit: string;
}

/**
 * Where a value stands on a ramp of `steps` colours, for a cell painted by the stylesheet: the
 * two steps it falls between, one-based, `mix` the share of the second in the mix, and `step`
 * the nearer of the two — which decides the colour of a text written over the cell.
 *
 * @since next
 */
export interface PctRampStop {
  readonly from: number;
  readonly to: number;
  /** The share of `to` in the mix, from 0 to 1. */
  readonly mix: number;
  /** The step nearer to the value, one-based. */
  readonly step: number;
}

/**
 * A value's place on a ramp, from 0 at the low end to 1 at the high end: `null` for a value
 * that is not a finite number. A sequential scale runs from `lo` to `hi`, a value past either
 * end held at it.
 *
 * @example
 * const t = pctSequential([10, 30]);
 * t(20); // 0.5
 * t(40); // 1
 *
 * @since next
 */
export function pctSequential(
  domain: PctDomain,
): (value: number) => number | null {
  const [lo, hi] = domain;
  const span = hi - lo;
  return (value) => {
    if (!Number.isFinite(value)) return null;
    if (span <= 0) return value < lo ? 0 : value > hi ? 1 : 0.5;
    return Math.min(1, Math.max(0, (value - lo) / span));
  };
}

/**
 * A value's place on a diverging ramp: `mid` stands at one half, the low half runs from `lo`
 * to it and the high half from it to `hi`, each on its own scale, so the two sides keep their
 * own reach. `null` for a value that is not a finite number.
 *
 * @example
 * const t = pctDiverging([-10, 0, 40]);
 * t(-5); // 0.25
 * t(20); // 0.75
 *
 * @since next
 */
export function pctDiverging(
  domain: readonly [low: number, mid: number, high: number],
): (value: number) => number | null {
  const [lo, mid, hi] = domain;
  const below = mid - lo;
  const above = hi - mid;
  return (value) => {
    if (!Number.isFinite(value)) return null;
    if (value === mid) return 0.5;
    if (value < mid)
      return below <= 0 ? 0 : Math.max(0, 0.5 - (0.5 * (mid - value)) / below);
    return above <= 0 ? 1 : Math.min(1, 0.5 + (0.5 * (value - mid)) / above);
  };
}

/**
 * The two steps of a ramp of `steps` colours a place `t` falls between, and the share of the
 * second: the stylesheet mixes them. At an end, both steps are that end.
 *
 * @example
 * pctRampStop(0.5, 3); // { from: 2, to: 2, mix: 0, step: 2 }
 * pctRampStop(0.3, 8); // { from: 3, to: 4, mix: 0.1, step: 3 }
 *
 * @since next
 */
export function pctRampStop(t: number, steps: number): PctRampStop {
  const place = Math.min(1, Math.max(0, t)) * (steps - 1);
  const from = Math.floor(place) + 1;
  const to = Math.min(steps, from + 1);
  const mix = place - (from - 1);
  // Rounded half up: the middle of two steps takes the deeper one.
  const step = mix >= 0.5 ? to : from;
  return { from, to, mix: Math.round(mix * 1000) / 1000, step };
}

/**
 * The domain a colour scale takes when the consumer gives none: the finite values' extent, or
 * `[0, 1]` without any; a diverging scale's middle is zero, and its two sides reach as far as
 * the farther of them, so the same hue says the same distance on both. A domain given is
 * returned as it is.
 *
 * @since next
 */
export function pctColorDomain(
  values: ArrayLike<number>,
  diverging: boolean,
  given?: readonly number[],
): readonly number[] {
  if (given && given.length >= 2) return given;
  let lo = Infinity;
  let hi = -Infinity;
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    if (!Number.isFinite(v)) continue;
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  if (lo > hi) return diverging ? [-1, 0, 1] : [0, 1];
  if (!diverging) return [lo, hi];
  const reach = Math.max(Math.abs(lo), Math.abs(hi), Number.EPSILON);
  return [-reach, 0, reach];
}
