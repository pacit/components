/**
 * An option of a select. The value is of any type `T` — business forms bind numeric ids, union
 * members and whole entities, and narrowing it to a string forced every application into
 * mapping by hand in both directions. `T` is a string by default, so string lists are written
 * exactly as before.
 *
 * The label stays a string: it is the text visible on screen, and typeahead runs on it.
 */
export interface PctSelectOption<T = string> {
  readonly value: T;
  readonly label: string;
  readonly disabled?: boolean;
}

/**
 * Width of the dropdown panel:
 * - `'field'` (the default) — exactly that of the visible control: the field border inside the
 *   chrome, the trigger alone outside it. The panel is then an extension of the field rather
 *   than a separate object,
 * - `'auto'` — as wide as the longest option, but never narrower than the control. For lists
 *   where an option's full text matters more than a flush edge,
 * - a CSS length (`'320px'`, `'24rem'`) — the width outright.
 *
 * `& {}` keeps editor completion for the named variants; without it the union with `string`
 * collapses to `string` alone.
 */
export type PctSelectPanelWidth = 'field' | 'auto' | (string & {});

/**
 * Alignment of the panel to the control when the panel does not have the control's width
 * (`'auto'` or an explicit width). With `panelWidth="field"` every variant gives the same
 * result.
 */
export type PctSelectPanelAlign = 'start' | 'center' | 'end';
