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

/**
 * A named section of a list — what a native `<optgroup>` is, and what the ARIA listbox
 * pattern draws as a `role="group"` with its label referenced by `aria-labelledby`.
 *
 * The label is a heading, not an option: it takes no value, the keyboard walks past it and
 * `aria-activedescendant` never names it. `disabled` on the group reaches every option below
 * it — native parity, and the option objects are left alone: the state is carried beside them
 * so a consumer's `let-option` is still their own object and not a copy.
 *
 * A group with no options is drawn by nobody: a heading over nothing is noise on the screen
 * and an empty `role="group"` in the tree.
 */
export interface PctSelectOptionGroup<T = string> {
  readonly label: string;
  readonly options: readonly PctSelectOption<T>[];
  readonly disabled?: boolean;
}

/**
 * What `options` accepts: a flat list, a list of groups, or the two mixed — options standing
 * before the first heading are exactly what a native `<select>` draws above its first
 * `<optgroup>`.
 *
 * The two are told apart by the **shape** rather than by a discriminant field a consumer
 * would have to write: an object whose `options` is an array is a group. A literal carrying
 * both `value` and an `options` array is therefore read as a group — recorded here because
 * silence would make it a defect report later.
 */
export type PctSelectItem<T = string> =
  PctSelectOption<T> | PctSelectOptionGroup<T>;
