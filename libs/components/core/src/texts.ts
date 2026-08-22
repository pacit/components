import {
  computed,
  InjectionToken,
  Provider,
  Signal,
  signal,
} from '@angular/core';

/**
 * The strings the library writes by itself — without them a component has nothing to show,
 * and they cannot be passed as an input, because they belong to no particular instance (an
 * empty option list is a state, not content authored by the view).
 *
 * Kept apart from `PctConfig` rather than as a field of it, because they are swapped at a
 * different rhythm and in a different scope: configuration is set once at application start,
 * while texts can differ within a single tree (a section in another language, a translation
 * preview). A separate token allows overriding the strings alone in any subtree, without
 * repeating the rest of the configuration.
 *
 * The defaults are English — the language the library is published in. An application swaps
 * them through `providePctTexts()`.
 */
export interface PctTexts {
  /** Select: when nothing is chosen. */
  readonly selectPlaceholder: string;
  /** Select: when there is not a single option. */
  readonly selectEmpty: string;
  /**
   * Select: when a filter has left nothing standing. A different sentence from `selectEmpty`
   * because it is a different fact about the world — "there is nothing to choose from" is the
   * list's state, "nothing here answers what you typed" is the question's, and a user who has
   * just typed three letters is owed the second one.
   */
  readonly selectNoMatches: string;
  /**
   * Select: while the list is still coming. The third fact an empty panel can carry, and the
   * one that is not a conclusion — "there is nothing" and "nothing matches" are both answers,
   * and a request in flight has given neither
   * ([0037](../../../../docs/decisions/0037-loading-is-a-fact-about-the-list.md)).
   */
  readonly selectLoading: string;
  /**
   * Multi-select: what stands between the chosen labels on the trigger. Punctuation is a
   * string like any other — an Arabic list is separated by `،` and a Japanese one by `、`,
   * so a comma written into the template would be a word of English in every language.
   */
  readonly selectSeparator: string;
  /**
   * Select: the accessible name of the control that takes the answer back. It draws a cross
   * and nothing else, so this string is the only name it has — and one name serves both jobs
   * the button does, because what it takes back is whatever the trigger is showing
   * ([0036](../../../../docs/decisions/0036-a-clear-takes-back-what-the-trigger-shows.md)):
   * a second string for "clear the question" would be a distinction the user never sees, the
   * button standing in one place and doing one thing.
   */
  readonly selectClear: string;
  /**
   * Dialog: the accessible name of the button that closes it. The button draws a cross and
   * nothing else, so this string is the only name it has — a component's own string and not
   * content the view authored, which is what puts it here rather than in an input.
   */
  readonly dialogClose: string;
}

export const PCT_DEFAULT_TEXTS: PctTexts = {
  selectPlaceholder: 'Select…',
  selectEmpty: 'No options',
  selectNoMatches: 'No matches',
  selectLoading: 'Loading…',
  selectSeparator: ', ',
  selectClear: 'Clear',
  dialogClose: 'Close',
};

/**
 * The token carries a **signal**, not a ready object, because changing language without a
 * page reload is a pattern rather than an exotic case — and a value injected once at
 * construction is by definition the one from before the change
 * ([0014](../../../../docs/decisions/0014-texts-as-signal.md)).
 *
 * The consequence for a component: a string is read **at render time**
 * (`texts().selectEmpty`), not at construction. An input's default value is a read at
 * construction, so a library string may never be one — the `check-texts` gate watches that
 * (point "the channel in TS").
 */
export const PCT_TEXTS = new InjectionToken<Signal<PctTexts>>('PCT_TEXTS', {
  factory: () => signal(PCT_DEFAULT_TEXTS).asReadonly(),
});

/**
 * Registers the library texts (the provideX pattern, req-api-config). The fields given
 * override the defaults and the rest stay, so a new string added in the library does not
 * upend an application that translates only part of them.
 *
 * A signal in the argument is the road for an application switching language at runtime:
 * the merge with the defaults then runs on every read rather than once.
 *
 * @example
 * bootstrapApplication(App, {
 *   providers: [providePctTexts({ selectPlaceholder: 'Sélectionner…' })],
 * });
 *
 * @example
 * // Changing language without a reload: the texts come from a signal.
 * providePctTexts(computed(() => DICTIONARIES[language()]));
 *
 * @example
 * // Local scope: a section in a different language from the rest of the application.
 * @Component({ providers: [providePctTexts({ selectEmpty: 'Keine Optionen' })] })
 */
export function providePctTexts(
  texts: Partial<PctTexts> | Signal<Partial<PctTexts>>,
): Provider {
  // The merge is always against `PCT_DEFAULT_TEXTS`, never against the texts from the parent
  // injector: a subtree declares a language, not a difference from its neighbour — otherwise
  // the same `providePctTexts` would mean different things depending on where in the tree it
  // stands.
  const value: Signal<PctTexts> =
    typeof texts === 'function'
      ? computed(() => ({ ...PCT_DEFAULT_TEXTS, ...texts() }))
      : signal({ ...PCT_DEFAULT_TEXTS, ...texts }).asReadonly();

  return { provide: PCT_TEXTS, useValue: value };
}
