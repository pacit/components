/**
 * An option of a select. The value is of any type `T` — business forms bind numeric ids, union
 * members and whole entities, and narrowing it to a string forced every application into
 * mapping by hand in both directions. `T` is a string by default, so string lists are written
 * exactly as before.
 *
 * The label stays a string: it is the text visible on screen, and typeahead runs on it.
 *
 * @since 0.1.0
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
 *
 * @since 0.1.0
 */
export type PctSelectPanelWidth = 'field' | 'auto' | (string & {});

/**
 * Alignment of the panel to the control when the panel does not have the control's width
 * (`'auto'` or an explicit width). With `panelWidth="field"` every variant gives the same
 * result.
 *
 * @since 0.1.0
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
 *
 * @since 0.1.0
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
 *
 * @since 0.1.0
 */
export type PctSelectItem<T = string> =
  PctSelectOption<T> | PctSelectOptionGroup<T>;

/**
 * What decides whether an option stays in the panel while a filter is on: the option, and
 * what the user has typed. A predicate rather than a mode name (`'contains'`, `'startsWith'`)
 * — the moment a list wants matching on a second field, on a code beside the label or on what
 * a server said, a name in an enum has to grow another member and a function does not.
 *
 * The query arrives exactly as typed, trimmed of nothing: leading space is a character of the
 * question like any other, and a predicate that wants it gone can say so in one call.
 *
 * @since 0.1.0
 */
export type PctSelectFilter<T = string> = (
  option: PctSelectOption<T>,
  query: string,
) => boolean;

/**
 * The default filter: the label, case-folded, **contains** what was typed.
 *
 * What it deliberately does not do is fold accents, and that is a measurement rather than a
 * shortcut. `Intl.Collator(locale, { sensitivity: 'base' })` — the setting whose entire job is
 * "ignore the accents" — answers the question **per language**: an `o` with an umlaut and a
 * plain `o` are one letter in German and in English and two in Swedish and in Danish, on the
 * same pair of strings. And the trick every library reaches for instead, `normalize('NFD')`
 * with the combining marks stripped, is not consistent with itself: it folds the accents that
 * come apart and leaves the ones that are a codepoint of their own, so an umlaut goes and a
 * stroke through the letter stays — which makes a Danish label reachable by typing the slashed
 * letter and unreachable by typing the plain one, in a library that never said which of the
 * two the user is in ([`lesson-101`](../../../../docs/lessons.md#lesson-101)).
 *
 * So the library folds case and stops there, and a list that needs its own idea of "the same
 * letter" says so in a `filterWith` of its own — where the application's language is known,
 * which is the one place the question has an answer.
 *
 * @since 0.1.0
 */
export const pctFilterByLabel: PctSelectFilter<unknown> = (option, query) =>
  option.label.toLowerCase().includes(query.toLowerCase());

/**
 * The predicate that decides nothing: **for a list somebody else has already narrowed.** An
 * application filtering on a server answers the question with another `options` list, and the
 * control would otherwise narrow that answer a second time — a server that matched a city by
 * its old name, by a code or by a misspelling would watch the row it found be taken out again
 * by a client-side `includes`, in a library that never said it would
 * ([0037](../../../../docs/decisions/0037-loading-is-a-fact-about-the-list.md)).
 *
 * It is a constant and not `() => true` written into the template, and that is a cost rather
 * than a style: an arrow in a binding is a NEW function on every change detection pass, so
 * the input changes, the predicate changes, and every row of the panel is rebuilt for as long
 * as the page lives. One shared identity is the whole difference.
 *
 * @since 0.1.0
 */
export const pctKeepAll: PctSelectFilter<unknown> = () => true;
