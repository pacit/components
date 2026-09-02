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
  /**
   * Date: the accessible name of the button that opens the calendar, and the name of the
   * panel it opens. One string in both places on purpose — the button says what it will show
   * and the panel is that thing, so a second string would be a distinction the user never
   * meets ([0036](../../../../docs/decisions/0036-a-clear-takes-back-what-the-trigger-shows.md)'s
   * reading of one control doing one thing).
   */
  readonly dateOpen: string;
  /** Date: the accessible name of the button that steps the calendar back a month. */
  readonly datePreviousMonth: string;
  /** Date: the accessible name of the button that steps it forward a month. */
  readonly dateNextMonth: string;
  /**
   * Date: the letters a format hint is written with — `d`, `m`, `y` in English, `d`, `m`, `r`
   * in Polish. They are **texts and not constants** because they are words: the hint
   * `dd.mm.yyyy` is read as language, and a `y` in a Polish field is a letter that means
   * nothing there.
   *
   * The ORDER and the separators are not here — those come from `Intl`, which knows them for
   * every locale and cannot be got wrong by a translator.
   */
  readonly dateDayLetter: string;
  readonly dateMonthLetter: string;
  readonly dateYearLetter: string;
  /**
   * Toast: the accessible name of the cross that takes a message down. The button draws
   * nothing but the cross, so this string is the only name it has — the dialog's `dialogClose`
   * one component over, and deliberately a second key rather than a shared one: "close" is
   * what a panel does and "dismiss" is what happens to a message, and a language that spells
   * the two differently has nowhere else to say so.
   */
  readonly toastDismiss: string;
  /**
   * Drawer: the accessible name of the cross that shuts a docked panel. The button draws
   * nothing but the cross, so this string is the only name it has — and it is a key of its own
   * rather than the dialog's, which the English default makes look like duplication and is
   * not. A dialog is a window: it is CLOSED, and it leaves. A drawer stays part of the page
   * with its text still findable ([0047](../../../../docs/decisions/0047-a-drawer-is-a-region-of-the-page-not-a-layer-over-it.md)),
   * so a language that spells "shut this away" differently from "close this window" has
   * nowhere else to say so. One key serving both would freeze that distinction out of every
   * translation at once, which is `toastDismiss`'s argument at the next component.
   */
  readonly drawerClose: string;
  /**
   * Pagination: the accessible name of the navigation landmark the pager is. A default in the
   * application's language and nothing more — a page with two pagers (above and below a
   * table) tells them apart through the `ariaLabel` input, not through this.
   */
  readonly paginationLabel: string;
  /**
   * Pagination: the accessible name of the stepper that goes back one page. The button draws
   * a chevron and nothing else, so this string is the only name it has. A key of its own and
   * not the calendar's `datePreviousMonth`: one steps a pager and the other a grid of days,
   * and a language that says the two differently has nowhere else to.
   */
  readonly paginationPrevious: string;
  /** Pagination: the accessible name of the stepper that goes forward one page. */
  readonly paginationNext: string;
  /**
   * Chips: the accessible name of the control that takes a chosen value back. The button
   * draws a cross and nothing else, so this string is the only name it has; WHAT it removes
   * is said by the chip's own text, standing beside the button in the same list item. A key
   * of its own rather than the toast's `toastDismiss` or the dialog's `dialogClose`:
   * "remove" is what happens to a chosen value, and a language that spells it apart from
   * "dismiss a message" and "close a window" has nowhere else to say so
   * ([0051](../../../../docs/decisions/0051-chips-are-a-list-the-user-shortens.md)).
   */
  readonly chipRemove: string;
  /**
   * Breadcrumb: the accessible name of the navigation landmark the trail is. A default in
   * the application's language and nothing more — a page with two trails tells them apart
   * through the `ariaLabel` input, not through this. The pagination's key, one landmark
   * over: two components, two landmarks, two names a translation may spell apart.
   */
  readonly breadcrumbLabel: string;
}

export const PCT_DEFAULT_TEXTS: PctTexts = {
  selectPlaceholder: 'Select…',
  selectEmpty: 'No options',
  selectNoMatches: 'No matches',
  selectLoading: 'Loading…',
  selectSeparator: ', ',
  selectClear: 'Clear',
  dialogClose: 'Close',
  dateOpen: 'Choose date',
  datePreviousMonth: 'Previous month',
  dateNextMonth: 'Next month',
  dateDayLetter: 'd',
  dateMonthLetter: 'm',
  dateYearLetter: 'y',
  toastDismiss: 'Dismiss',
  drawerClose: 'Close',
  paginationLabel: 'Pagination',
  paginationPrevious: 'Previous page',
  paginationNext: 'Next page',
  chipRemove: 'Remove',
  breadcrumbLabel: 'Breadcrumb',
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
