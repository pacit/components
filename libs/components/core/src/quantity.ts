/**
 * A number with its unit, written the way the reader's locale writes numbers.
 *
 * One home for a fact a table cell, a chart axis and a description list all need
 * ([0017](../../../../docs/decisions/0017-one-home-per-fact.md)). The platform writes the
 * number. This module adds only what the platform leaves open: a unit it does not know, and a
 * fraction-digit rule given as one number or as a pair.
 */

/**
 * How a quantity is written.
 *
 * @since next
 */
export interface PctQuantityOptions {
  /**
   * The unit. A unit the platform knows by its CLDR name (`celsius`, `percent`, `liter`,
   * `kilometer-per-hour`) is written the locale's way, placement and spacing included. Any
   * other text is a symbol (`kWh`, `m³/h`, `°C`) written after the number with a no-break
   * space between them, the SI rule for a unit symbol. A locale's spelling of a known unit
   * can surprise: `pl` writes `celsius` as `st. C`, so an application wanting `°C` passes the
   * symbol.
   */
  readonly unit?: string;
  /** How the platform spells a unit it knows: `short` by default, `long` or `narrow`. */
  readonly unitDisplay?: 'short' | 'long' | 'narrow';
  /**
   * Fraction digits. One number fixes them, a pair is the fewest and the most. Unset, the
   * platform's default applies: none forced, at most three.
   */
  readonly fractionDigits?: number | readonly [min: number, max: number];
  /** The sign, as `Intl.NumberFormat` takes it. `exceptZero` writes a difference: `+12`, `0`, `-3`. */
  readonly signDisplay?: Intl.NumberFormatOptions['signDisplay'];
}

/**
 * A formatter made once and called per value. Making one costs far more than calling it, so a
 * component builds it in a `computed` and a table of a thousand rows calls it a thousand times.
 *
 * @since next
 */
export interface PctQuantityFormat {
  format(value: number): string;
}

/**
 * The formatter of a quantity in `locale`.
 *
 * The platform groups the digits by the locale's own rule, and that rule is not always "every
 * three": `pl` leaves a four-digit number whole (`7899,7`) and groups from five (`17 899,7`).
 *
 * @example
 * const energy = pctQuantityFormat('pl', { unit: 'kWh', fractionDigits: 1 });
 * energy.format(17899.7); // '17 899,7 kWh', the spaces no-break
 * pctQuantityFormat('en', { unit: 'percent', signDisplay: 'exceptZero' }).format(12); // '+12%'
 *
 * @since next
 */
export function pctQuantityFormat(
  locale: string,
  options: PctQuantityOptions = {},
): PctQuantityFormat {
  const { unit, unitDisplay = 'short', fractionDigits, signDisplay } = options;
  const base: Intl.NumberFormatOptions = {
    ...digitsOf(fractionDigits),
    signDisplay,
  };
  const number = new Intl.NumberFormat(locale, base);
  if (!unit) return number;
  const known = platformUnit(locale, unit, { ...base, unitDisplay });
  if (known) return known;
  return { format: (value) => `${number.format(value)}\u00A0${unit}` };
}

function digitsOf(
  digits: PctQuantityOptions['fractionDigits'],
): Intl.NumberFormatOptions {
  if (digits === undefined) return {};
  const [min, max] = typeof digits === 'number' ? [digits, digits] : digits;
  return { minimumFractionDigits: min, maximumFractionDigits: max };
}

/**
 * The platform's formatter for `unit`, or nothing where the platform does not know the unit.
 * Asking is the only portable test: `Intl.supportedValuesOf('unit')` lists the simple units
 * and not their `-per-` compounds, which the formatter accepts.
 */
function platformUnit(
  locale: string,
  unit: string,
  options: Intl.NumberFormatOptions,
): Intl.NumberFormat | undefined {
  try {
    return new Intl.NumberFormat(locale, { ...options, style: 'unit', unit });
  } catch {
    // The platform does not know the unit, and the caller writes it as a symbol.
  }
  return undefined;
}
