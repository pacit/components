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
 *
 * @since 0.1.0
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
   * Date: the sentence the field says about text that is not a date. The control's own
   * error, first in the message line ahead of the form's — the form sees `null` and would
   * call three typed numbers "required" (0070).
   */
  readonly dateMalformed: string;
  /**
   * Time: the accessible name of the button that opens the columns, and the name of the panel
   * it opens — one string in both places, for the reason `dateOpen` gives.
   */
  readonly timeOpen: string;
  /**
   * Time: the letters a format hint is written with — `h`, `m`, `s` in English, `g`, `m`, `s`
   * in Polish. Words and not constants, as the date's are; the ORDER, the separators and the
   * day-period words are not here — those come from `Intl`, and the period slot is written with
   * the field's own two words, which are what it shows and reads back
   * ([0086](../../../../docs/decisions/0086-a-time-of-day-is-a-wall-clock.md) §3).
   */
  readonly timeHourLetter: string;
  readonly timeMinuteLetter: string;
  readonly timeSecondLetter: string;
  /**
   * Time: the sentence the field says about text that is not a time — the control's own error,
   * first in the message line ahead of the form's, which sees `null` (0070).
   */
  readonly timeMalformed: string;
  /**
   * Time: the accessible name of the column of hours. Each column of the panel is a listbox
   * of its own and needs a name of its own — a column with none is a serious axe finding
   * (0086, E5) — and the name is a word of the application's language, not of the locale's.
   */
  readonly timeHours: string;
  /** Time: the accessible name of the column of minutes. */
  readonly timeMinutes: string;
  /** Time: the accessible name of the column of seconds, which stands where the step has them. */
  readonly timeSeconds: string;
  /**
   * Time: the accessible name of the column of the two halves of the day, on a twelve-hour
   * clock. The column's two rows are the locale's own words, read off the formatter; the name
   * of the column is the application's.
   */
  readonly timePeriod: string;
  /**
   * Datetime: the accessible name of the button that opens the panel of a calendar and columns,
   * and the name of the panel — one string in both places, for the reason `dateOpen` gives.
   */
  readonly datetimeOpen: string;
  /**
   * Datetime: the word each of the field's two texts is named by after the field's label —
   * "Starts, Day" and then "Starts, Time". Two textboxes under a named group with no name of
   * their own are a critical axe finding in all three engines, and two named by the label alone
   * pass axe and leave a reader on the second one not told it is the time
   * ([0090](../../../../docs/decisions/0090-a-day-with-a-time-is-a-wall-clock-with-a-date.md),
   * E2 and E3) — so the word is the record's rule, not the gate's.
   */
  readonly datetimeDay: string;
  readonly datetimeTime: string;
  /**
   * Datetime: the sentence the field says when focus leaves it with one half holding a value and
   * the other empty — the value is `null` until both do, and a required field would otherwise
   * say "required" over a day the user can see. The control's own error, first in the message
   * line, gated by no touch (0070); the two halves' junk keeps the date's and the time's own
   * sentences.
   */
  readonly datetimeIncomplete: string;
  /**
   * Number: the same sentence for text that is not a number, which the field now keeps
   * instead of clearing — a user is shown what they typed, and told what it is not (0070).
   */
  readonly numberMalformed: string;
  /**
   * Field: the word a reader hears before a warning's sentence, hidden from the eye. ARIA
   * has no property for a warning — `aria-invalid` stays off, because the value is allowed
   * — so the glyph beside the line is a drawing and this word is what says "warning" to
   * someone who cannot see it. It ends in a colon because it OPENS the sentence: `Warning:
   * Unusually large` ([0087](../../../../docs/decisions/0087-a-warning-is-a-verdict-without-a-veto.md)).
   */
  readonly fieldWarning: string;
  /**
   * Toast: the accessible name of the cross that takes a message down. The button draws
   * nothing but the cross, so this string is the only name it has — the dialog's `dialogClose`
   * one component over, and deliberately a second key rather than a shared one: "close" is
   * what a panel does and "dismiss" is what happens to a message, and a language that spells
   * the two differently has nowhere else to say so.
   */
  readonly toastDismiss: string;
  /**
   * Toast: what the stack of messages is called when a keyboard arrives at it as a region.
   * The stack is a `role="log"` that stands outside the page's reading order, so the region
   * cycle ({@link PctRegions}) is how a keyboard reaches it in one hop — and a place the
   * keyboard lands on with nothing to announce is a place the user has to guess at. It names
   * the region and not the messages: what is IN it is read as it arrives, by the live region
   * itself.
   */
  readonly toastRegion: string;
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
   * Chips: the VERB half of the name of the control that takes a chosen value back. The
   * button draws a cross and nothing else, and what it acts on is the chip's own projected
   * text — so the two are joined by `aria-labelledby` and a reader hears "Remove, In
   * stock". Until 2026-09-16 this string stood alone here, on the argument that the label
   * beside the button was heard anyway; three readers were asked and none of them said it
   * ([`lesson-218`](../../../../docs/lessons.md#lesson-218)). Word order is the price: a
   * language that puts the object first has the verb second, and this key cannot say so.
   * A key of its own rather than the toast's `toastDismiss` or the dialog's `dialogClose`:
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
  /**
   * Stepper: the suffix a done step carries for a reader — the check that marks it is a
   * drawing the accessibility tree never sees, so this word is how "behind you" is said at
   * all ([0055](../../../../docs/decisions/0055-a-stepper-is-a-map-of-a-journey-the-application-steers.md)).
   * It rides INSIDE the step's content, after the application's own label, so the name
   * stays "Payment, Completed" with the application's word first — never in an
   * `aria-label`, which would replace the label instead of following it.
   */
  readonly stepDone: string;
  /**
   * Chart: the message standing in the plot while it has nothing to draw — no series, or none
   * with a reading in the window. The axes stay, so the reader sees where the data would be.
   * An application with a better sentence ("No measurements in this range") projects it.
   */
  readonly chartEmpty: string;
  /**
   * Chart: what the data table writes where a series has no reading — a gap, not a zero.
   */
  readonly chartGap: string;
  /** Chart: the label of the upper end of a yes/no axis, and of a yes in the data table. */
  readonly chartOn: string;
  /** Chart: the label of the lower end of a yes/no axis, and of a no in the data table. */
  readonly chartOff: string;
  /** Chart: the header of the data table's first column on a time axis. */
  readonly chartTime: string;
  /** Chart: the header of the data table's first column on a numeric axis. */
  readonly chartPosition: string;
  /** Chart: the message of a chart whose every series is hidden. */
  readonly chartAllHidden: string;
  /** Chart: what the cursor's range says while no reading is selected. */
  readonly chartNoCursor: string;
  /** Chart: the keys of the cursor, one sentence, read as the range's description. */
  readonly chartKeys: string;
  /** Chart: the name of the legend's list of series. */
  readonly chartLegend: string;
  /** Chart: the legend's button that takes a series off the chart, named with the series. */
  readonly chartRemove: string;
  /** Chart: the name of the bar of zoom buttons. */
  readonly chartZoom: string;
  /** Chart: the button that shows half as much of the horizontal axis. */
  readonly chartZoomIn: string;
  /** Chart: the button that shows twice as much. */
  readonly chartZoomOut: string;
  /** Chart: the button that moves the window a quarter earlier. */
  readonly chartEarlier: string;
  /** Chart: the button that moves the window a quarter later. */
  readonly chartLater: string;
  /** Chart: the button that returns the window to its default. */
  readonly chartZoomReset: string;
  /** Data table: beside a table with no rows at all. */
  readonly tableEmpty: string;
  /**
   * Data table: beside a table whose rows the quick filter or the application's own filter
   * has all taken away — the question's state, not the list's, as `selectNoMatches` is.
   */
  readonly tableNoMatches: string;
  /** Data table: beside a table whose rows are still coming, with none yet. */
  readonly tableLoading: string;
  /** Data table: how a boolean cell that is true is read, and searched by the quick filter. */
  readonly tableYes: string;
  /** Data table: how a boolean cell that is false is read, and searched by the quick filter. */
  readonly tableNo: string;
  /**
   * Data table: the header of the column that numbers the rows, as a reader hears it; the eye
   * sees `#`, which a reader would call a number sign.
   */
  readonly tableRowNumber: string;
  /**
   * Data table: a sort key after the first, as a reader hears it — the description of its
   * header's button. `{place}` stands for its place in the order and `{way}` for
   * `tableSortAscending` or `tableSortDescending`, so a language orders the sentence and
   * punctuates it as it speaks: `Sort key {place}, {way}` is `Sort key 2, descending`.
   */
  readonly tableSortLater: string;
  /** Data table: the way of a sort key after the first, ascending. */
  readonly tableSortAscending: string;
  /** Data table: the way of a sort key after the first, descending. */
  readonly tableSortDescending: string;
  /** Data table: the header of the column of buttons that open the rows' details. */
  readonly tableDetails: string;
  /** Data table: the name of a row's button while its details are closed. */
  readonly tableDetailsOpen: string;
  /** Data table: the name of a row's button while its details are open. */
  readonly tableDetailsClose: string;
  /**
   * Data table: how many rows a group holds, beside its label. `{count}` stands for the number
   * in the table's locale.
   */
  readonly tableGroupCount: string;
  /** Data table: the label of the foot that sums up every row in view. */
  readonly tableTotal: string;
  /** Data table: the label of the group of rows with no value in the column grouped by. */
  readonly tableGroupEmpty: string;
  /**
   * Data table: how a reader hears the heading of a group inside another. `{group}` stands
   * for its label and count, `{outer}` for the label of the group it stands in.
   */
  readonly tableGroupWithin: string;
}

/**
 * The English texts the components speak with until an application provides its own.
 *
 * @since 0.1.0
 */
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
  dateMalformed: 'Not a date',
  timeOpen: 'Choose time',
  timeHourLetter: 'h',
  timeMinuteLetter: 'm',
  timeSecondLetter: 's',
  timeMalformed: 'Not a time',
  timeHours: 'Hours',
  timeMinutes: 'Minutes',
  timeSeconds: 'Seconds',
  timePeriod: 'AM/PM',
  datetimeOpen: 'Choose date and time',
  datetimeDay: 'Day',
  datetimeTime: 'Time',
  datetimeIncomplete: 'Enter both a date and a time',
  numberMalformed: 'Not a number',
  fieldWarning: 'Warning:',
  toastDismiss: 'Dismiss',
  toastRegion: 'Notifications',
  drawerClose: 'Close',
  paginationLabel: 'Pagination',
  paginationPrevious: 'Previous page',
  paginationNext: 'Next page',
  chipRemove: 'Remove',
  breadcrumbLabel: 'Breadcrumb',
  stepDone: 'Completed',
  chartEmpty: 'No data to show',
  chartGap: 'No reading',
  chartOn: 'On',
  chartOff: 'Off',
  chartTime: 'Time',
  chartPosition: 'Position',
  chartAllHidden: 'Every series is hidden',
  chartNoCursor: 'No reading selected',
  chartKeys:
    'Arrow keys move from reading to reading, Page Up and Page Down a tenth of the view, Home and End to the first and last; Escape clears the cursor.',
  chartLegend: 'Series',
  chartRemove: 'Remove',
  chartZoom: 'Zoom',
  chartZoomIn: 'Zoom in',
  chartZoomOut: 'Zoom out',
  chartEarlier: 'Earlier',
  chartLater: 'Later',
  chartZoomReset: 'Back to the default view',
  tableEmpty: 'No rows',
  tableNoMatches: 'No matches',
  tableLoading: 'Loading…',
  tableYes: 'Yes',
  tableNo: 'No',
  tableRowNumber: 'Row',
  tableSortLater: 'Sort key {place}, {way}',
  tableSortAscending: 'ascending',
  tableSortDescending: 'descending',
  tableDetails: 'Details',
  tableDetailsOpen: 'Show details',
  tableDetailsClose: 'Hide details',
  tableGroupCount: '({count})',
  tableTotal: 'Total',
  tableGroupEmpty: 'No value',
  tableGroupWithin: '{group}, in {outer}',
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
 *
 * @since 0.1.0
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
 * @since 0.1.0
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
