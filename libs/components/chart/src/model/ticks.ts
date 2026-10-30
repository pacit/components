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
