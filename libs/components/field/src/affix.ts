import { Directive, input } from '@angular/core';

/**
 * How a decoration sits in its slot:
 *
 * - `inset` (the default) — it lies **on the field surface**: inscribed in the border's
 *   padding, inheriting its cursor, and a click on it focuses the control. That is how a unit
 *   ("PLN") or a field-kind icon behaves;
 * - `fill` — it is **a surface of its own**: it takes the whole slot, from the border edge to
 *   the control's gap and at full height, has its own cursor and takes the click itself. That
 *   is how a tile with a background, or a button welded into the field's corner, behaves.
 *
 * The field's author chooses, not the chrome stylesheet: what used to decide was the presence
 * of an interactive element in the slot, so a button **could not** be smaller than its slot
 * and a passive decoration could not be larger (`lesson-34`).
 *
 * Take an `inset` button one step smaller than the field: at the same size their heights are
 * equal (`req-api-size`), so a button of the same size will not fit inside the border and
 * pushes the row apart by its thickness.
 *
 * @since 0.1.0
 */
export type PctAffixFit = 'inset' | 'fill';

/** The bare attribute with no value (`pctPrefix`) gives `''` — read here as `inset`. */
function affixFit(value: PctAffixFit | ''): PctAffixFit {
  return value || 'inset';
}

/**
 * A `fill` decoration takes its height from the slot, not from itself. Without this a button
 * in the slot would bring its own minimum height (`--pct-button-height`), and since that
 * equals the height of a field of the same size (`req-api-size`), the row would grow by the
 * thickness of its border — a field with a welded-in button would be 2 px taller than one
 * without. The height comes from `align-items: stretch` on the slot anyway.
 *
 * This has to be a host binding rather than a rule in `field.scss`: a decoration is projected
 * content, so the chrome stylesheet does not reach it, and a directive cannot have a
 * stylesheet of its own.
 */
const fitHost = {
  '[attr.data-pct-fit]': 'fit()',
  '[style.min-height]': "fit() === 'fill' ? '0' : null",
};

/**
 * A decoration before the control, inside the field border (a currency unit, an icon).
 * Decorative content should be hidden from the screen reader (`aria-hidden`), or have an
 * accessible name of its own if it is interactive.
 *
 * @example
 * <span pctPrefix aria-hidden="true">PLN</span>
 * <span pctPrefix="fill" aria-hidden="true">https://</span>
 *
 * @since 0.1.0
 */
@Directive({
  selector: '[pctPrefix]',
  host: {
    class: 'pct-affix',
    'data-pct-part': 'field-prefix-item',
    ...fitHost,
  },
})
export class PctPrefix {
  /**
   * How the decoration sits against the border: inset from it, or flush with it.
   *
   * @since 0.1.0
   */
  readonly fit = input<PctAffixFit, PctAffixFit | ''>('inset', {
    alias: 'pctPrefix',
    transform: affixFit,
  });
}

/**
 * A decoration after the control, inside the field border (a clear button, say).
 *
 * @example
 * <button pctSuffix pctButton size="sm" aria-label="Clear">×</button>
 * <button pctSuffix="fill" pctButton>Search</button>
 *
 * @since 0.1.0
 */
@Directive({
  selector: '[pctSuffix]',
  host: {
    class: 'pct-affix',
    'data-pct-part': 'field-suffix-item',
    ...fitHost,
  },
})
export class PctSuffix {
  /**
   * How the decoration sits against the border: inset from it, or flush with it.
   *
   * @since 0.1.0
   */
  readonly fit = input<PctAffixFit, PctAffixFit | ''>('inset', {
    alias: 'pctSuffix',
    transform: affixFit,
  });
}
