import type { PctDomain } from './scale';
import { pctSteps } from './steps';

/**
 * The ticks of a value axis: a step of 1, 2 or 5 times a power of ten, chosen so the axis shows
 * about as many ticks as asked. The thresholds between the three are the geometric middles
 * (√2, √10, √50), so the step chosen is the one whose count lies nearest the target on a
 * logarithmic scale.
 *
 * Returns 0 for a span or a target that is not above zero.
 *
 * @example
 * pctNiceStep(37, 5); // 10
 * pctNiceStep(0.8, 4); // 0.2
 *
 * @since next
 */
export function pctNiceStep(span: number, target: number): number {
  const raw = span / target;
  // Zero, a negative, an infinite or a missing raw step has no power of ten.
  if (!Number.isFinite(Math.log10(raw))) return 0;
  const power = 10 ** Math.floor(Math.log10(raw));
  const ratio = raw / power;
  const factor =
    ratio >= Math.SQRT2 * 5
      ? 10
      : ratio >= Math.sqrt(10)
        ? 5
        : ratio >= Math.SQRT2
          ? 2
          : 1;
  return factor * power;
}

/**
 * The digits after the decimal point a tick of `step` needs, for a step of 1, 2 or 5 times a
 * power of ten: none from 1 up, one for 0.5, two for 0.05.
 *
 * @since next
 */
export function pctFractionDigits(step: number): number {
  return step > 0 ? Math.max(0, Math.ceil(-Math.log10(step) - 1e-9)) : 0;
}

/**
 * Every multiple of the nice step inside `domain`, ends included, written without the dust of
 * binary arithmetic: `0.30000000000000004` comes out `0.3`.
 *
 * @example
 * pctTicks([0, 37], 5); // [0, 10, 20, 30]
 *
 * @since next
 */
export function pctTicks(domain: PctDomain, target: number): readonly number[] {
  const [min, max] = domain;
  const step = pctNiceStep(max - min, target);
  if (step === 0) return min === max && Number.isFinite(min) ? [min] : [];
  const first = Math.ceil(min / step - 1e-9);
  const last = Math.floor(max / step + 1e-9);
  return pctSteps(first, last, 1).map((k) => clean(k * step));
}

/**
 * A multiple of a step written without the dust of binary arithmetic: fifteen significant
 * digits are what a double holds exactly, and the dust lives in the sixteenth and seventeenth.
 * Precision rather than `toFixed`, which refuses more than a hundred decimals.
 */
const clean = (value: number) => Number(value.toPrecision(15));

/**
 * The domain widened outwards to the nearest ticks, so the axis starts and ends on a labelled
 * value. Widening lengthens the span and so may coarsen the step, so it is repeated until the
 * step of the widened domain is the step it was widened by — the step only grows, so it
 * settles, and `pctTicks` over the result starts and ends on its ends.
 *
 * @example
 * pctNice([3.2, 36.5], 5); // [0, 40]
 *
 * @since next
 */
export function pctNice(domain: PctDomain, target: number): PctDomain {
  const [min, max] = domain;
  const step = pctNiceStep(max - min, target);
  if (step === 0) return domain;
  const wider: PctDomain = [
    clean(Math.floor(min / step + 1e-9) * step),
    clean(Math.ceil(max / step - 1e-9) * step),
  ];
  return pctNiceStep(wider[1] - wider[0], target) === step
    ? wider
    : pctNice(wider, target);
}

/**
 * The domain of a logarithmic axis around the values `lo` to `hi`: whole decades, the one under
 * `lo` to the one over `hi`, and a decade at least. A value at or below zero has no logarithm,
 * so with no positive floor in sight the axis shows the three decades under its top — the
 * consumer's `floor` says better ([0105](../../../../../docs/decisions/0105-a-point-is-picked-by-distance-and-the-y-window-is-the-first-axiss.md)).
 *
 * @since next
 */
export function pctLogDomain(lo: number, hi: number): PctDomain {
  if (!(hi > 0)) return [1, 10];
  const top = Math.ceil(Math.log10(hi) - 1e-9);
  const bottom = lo > 0 ? Math.floor(Math.log10(lo) + 1e-9) : top - 3;
  return [10 ** bottom, 10 ** Math.max(top, bottom + 1)];
}

/**
 * The ticks of a logarithmic axis over `domain`: 1, 2 and 5 of every decade while they fit
 * `target`, the decades alone when they do not, and every k-th decade when even those are too
 * many. A domain inside one decade falls back to the linear ticks.
 *
 * @since next
 */
export function pctLogTicks(
  domain: PctDomain,
  target: number,
): readonly number[] {
  const [lo, hi] = domain;
  if (!(lo > 0) || !(hi > lo)) return [];
  const from = Math.ceil(Math.log10(lo) - 1e-9);
  const to = Math.floor(Math.log10(hi) + 1e-9);
  const decades = to - from + 1;
  if (decades <= 1 && hi / lo < 10) return pctTicks(domain, target);
  const every = decades <= target * 1.5 ? 1 : Math.ceil(decades / target);
  // The mantissas give about three ticks a decade: room for them is half again the target.
  const mantissas = decades * 3 - 2 <= target * 1.5 ? [1, 2, 5] : [1];
  const ticks: number[] = [];
  const decade = (d: number) => {
    for (const m of mantissas) {
      const value = clean(m * 10 ** d);
      if (value >= lo * (1 - 1e-9) && value <= hi * (1 + 1e-9))
        ticks.push(value);
    }
  };
  // The part of the decade under the first whole one: 5 of [5, 100].
  if (every === 1) decade(from - 1);
  for (let d = from; d <= to; d += every) decade(d);
  return ticks;
}
