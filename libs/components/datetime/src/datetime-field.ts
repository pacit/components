import { ConnectedPosition, OverlayModule } from '@angular/cdk/overlay';
import {
  afterRenderEffect,
  booleanAttribute,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  isDevMode,
  LOCALE_ID,
  model,
  numberAttribute,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import type { FormValueControl, ValidationError } from '@angular/forms/signals';
import {
  nextPctId,
  PCT_CONFIG,
  PCT_FIELD,
  PCT_TEXTS,
  pctAttachToField,
  pctDescribedBy,
  pctFieldMessages,
  pctFieldWarnings,
  pctOverlay,
  PctFieldControl,
  PctFieldCursor,
  PctLabelStrategy,
  PctOverlayPanel,
  PctSize,
  PctValidationError,
} from '@pacit/components/core';
import {
  PctCalendar,
  pctCompareDays,
  PctDay,
  pctDayFormat,
  PctDayPredicate,
} from '@pacit/components/date';
import { PctIcon } from '@pacit/components/icon';
import {
  isPctTimeStep,
  pctCompareTimes,
  PctTimeColumns,
  pctTimeFormat,
  pctTimeOfDay,
  PctTimeOfDay,
  pctTimeOfDayParts,
  PctTimePredicate,
} from '@pacit/components/time';

import {
  isPctDateTime,
  pctCompareDateTimes,
  pctDateTime,
  PctDateTime,
  pctDateTimeParts,
} from './datetime';
import { pctDateTimeHalves, PctDateTimeHalf } from './halves';

/**
 * A datetime input written as an attribute is a string; one bound from a model may be anything.
 * Absent is `undefined`, as the `FormUiControl` contract spells an absent bound.
 */
function optionalDateTime(value: unknown): PctDateTime | undefined {
  return isPctDateTime(value) ? value : undefined;
}

/** The seconds in a day. */
const DAY = 86_400;

/** A time as seconds since midnight. */
function secondsOf(time: PctTimeOfDay): number {
  const { hour, minute, second } = pctTimeOfDayParts(time);
  return (hour * 60 + minute) * 60 + second;
}

/**
 * A predicate on a datetime: `true` refuses it — a slot already taken on a day.
 *
 * @since next
 */
export type PctDateTimePredicate = (value: PctDateTime) => boolean;

/**
 * Which edge of the field the panel lines its own up with.
 *
 * @since next
 */
export type PctDatetimePanelAlign = 'start' | 'end';

/**
 * Datetime field — two texts under one label, the day's and the time's, each formatted and
 * parsed per locale, with ONE button and ONE panel holding a calendar and columns of hours and
 * minutes. It is the ARIA APG's
 * [Date Picker Dialog](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/examples/datepicker-dialog/)
 * whole, through `PctCalendar` as `PctDate` holds it, with the time's columns beside the grid —
 * a `role="listbox"` per field, claimed on their own card.
 *
 * **Why not `<input type="datetime-local">`,** despite
 * [`req-api-platform`](../../../../docs/requirements/api.md#req-api-platform) — the time field's
 * case met a third time ([0090](../../../../docs/decisions/0090-a-day-with-a-time-is-a-wall-clock-with-a-date.md)):
 *
 * - **its clock and order come from three different sources in three engines**, and `lang` from
 *   none of them;
 * - **a whole day typed with no time is no value at all**, `""`, and the same eight digits are
 *   two days by the system's locale, and the year takes the time's digits in chromium;
 * - **one control is seven tab stops, or nine, or six, or one.**
 *
 * **Two texts and not one,** because two parsers exist and a third would have to read the
 * literal between the halves — a word in Finnish already in the numeric form; because a day
 * picked in the panel rewrites the day's text and leaves the time as the user typed it; and
 * because a half that is junk is reported as a half. Each text is named by the field's label
 * and a word of its own (`datetimeDay`, `datetimeTime`), and they stand in the order the
 * language writes a day with a time — the time first in Vietnamese.
 *
 * **The container is the control** ([`req-api-container`](../../../../docs/requirements/api.md#req-api-container)):
 * one value, one label, one message line, one `touch` when focus leaves the whole. The value
 * is a [`PctDateTime`](./datetime.ts) — `YYYY-MM-DDTHH:mm`, a wall clock with a date and no
 * zone — and it is `null` until both halves hold one; a half left empty is a sentence of its
 * own when focus leaves the field (`datetimeIncomplete`, 0070's second channel).
 *
 * @example
 * <pct-field label="Starts">
 *   <pct-datetime [formField]="f.startsAt" />
 * </pct-field>
 *
 * @example
 * // Standalone: quarter hours inside a window of two days, in a locale of its own.
 * <pct-datetime [(value)]="startsAt" step="900" min="2026-12-01T09:00" max="2026-12-02T17:00" locale="en-GB" label="Starts" />
 *
 * @since next
 */
@Component({
  selector: 'pct-datetime',
  imports: [OverlayModule, PctCalendar, PctTimeColumns, PctIcon, PctOverlayPanel],
  templateUrl: './datetime-field.html',
  styleUrl: './datetime-field.scss',
  host: {
    class: 'pct-datetime',
    '[attr.data-pct-size]': 'size()',
    '[attr.data-pct-open]': 'open() ? "" : null',
    '[attr.data-pct-invalid]': 'showInvalid() ? "" : null',
    '[attr.data-pct-warning]': 'showWarning() ? "" : null',
    '[attr.data-pct-disabled]': 'disabled() ? "" : null',
    // What the control knows and the form cannot: there is text in a half and it is not one.
    '[attr.data-pct-malformed]': 'malformed() ? "" : null',
    '[attr.data-pct-in-field]': 'inField ? "" : null',
  },
})
export class PctDatetime
  implements FormValueControl<PctDateTime | null>, PctFieldControl
{
  private readonly config = inject(PCT_CONFIG);
  protected readonly texts = inject(PCT_TEXTS);
  private readonly appLocale = inject(LOCALE_ID);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /**
   * The chosen day and time, or `null` — which it is until both halves hold one.
   *
   * @since next
   */
  readonly value = model<PctDateTime | null>(null);

  // --- FormUiControl (kept in sync by the FormField directive) ---

  /**
   * Blocks the control and greys it — the native `disabled` on both texts, so they leave the tab order as well. With `[formField]` the directive writes it, as it writes every input of the `FormUiControl` contract.
   *
   * @since next
   */
  readonly disabled = input(false, { transform: booleanAttribute });

  /**
   * Keeps the value: both texts take the native `readonly` and the button is disabled with them, while the field stays focusable.
   *
   * @since next
   */
  readonly readonly = input(false, { transform: booleanAttribute });

  /**
   * The form's verdict; shown only once `touched`, so an empty form does not open red.
   *
   * @since next
   */
  readonly invalid = input(false, { transform: booleanAttribute });

  /**
   * Whether the user has left the field once; with `invalid` it gates the error face.
   *
   * @since next
   */
  readonly touched = input(false, { transform: booleanAttribute });

  /**
   * Marks the label with the required sign; with `[formField]` it follows the schema's `required()`.
   *
   * @since next
   */
  readonly required = input(false, { transform: booleanAttribute });

  /**
   * The form's validation errors; the first one's `message` takes the hint's place once the field is touched.
   *
   * @since next
   */
  readonly errors = input<readonly ValidationError.WithOptionalFieldTree[]>([]);

  /**
   * A verdict without a veto (0087): shown after the error and before the hint once the field is touched, in the warning tone, with `aria-invalid` untouched. Left unbound, the control reads what `pctWarn()` wrote for its own `[formField]`; bound — `[]` included — the list given stands.
   *
   * @since next
   */
  readonly warnings = input<
    readonly ValidationError.WithOptionalFieldTree[] | undefined
  >(undefined);

  /**
   * The warnings drawn under the control — the input, or the form's (0087). The chrome reads this one list.
   *
   * @since next
   */
  readonly fieldWarnings = pctFieldWarnings(this.warnings);

  /**
   * The native `name` — what a form submission calls the value. It names a hidden input that carries the value as the platform writes one, `YYYY-MM-DDTHH:mm`, and not either text, which are written in the user's language.
   *
   * @since next
   */
  readonly name = input<string>('');

  /**
   * The earliest day and time. It belongs to the `FormUiControl` contract, which spells an
   * absent bound `undefined`.
   *
   * **The bounds clamp the panel's walk and never rewrite what was typed** — the date and the
   * time fields' rule. The calendar gets the day of each bound, and the columns get the time of
   * a bound **only on the bound's own day**: on 1 December from 09:00 the hours before nine are
   * refused when the chosen day is 1 December and on no other day. **Later than `max`, the pair
   * is no window** — the platform's reading of a reversed pair on a datetime — so it is a
   * dev-mode warning and the field behaves as if it had no bounds (0090 §5).
   *
   * @since next
   */
  readonly min = input(undefined, { transform: optionalDateTime });

  /**
   * The latest day and time — as `min`, a bound on the panel's walk and not a rewrite of what was typed.
   *
   * @since next
   */
  readonly max = input(undefined, { transform: optionalDateTime });

  /**
   * The step in seconds — the time's, 60 by default. It decides the columns' rows, whether a seconds column exists and whether the value carries `:ss`, and nothing about typed text. **It counts from midnight on every day**, not from `min`: a bound off the step is moved inward onto it before the columns see it (0090 §5). A step the columns cannot list is refused with a dev-mode warning and read as 60.
   *
   * @since next
   */
  readonly step = input(60, { transform: numberAttribute });

  /**
   * Days inside the bounds that cannot be picked — handed to the calendar as it is, so a day it refuses is refused whole, hours included.
   *
   * @since next
   */
  readonly dateDisabled = input<PctDayPredicate | null>(null);

  /**
   * Slots inside the bounds that cannot be taken — a meeting room's bookings. The field closes it over the chosen day and asks it of every time on the step, in the columns' rows: an hour is refused when every time in it is. It never reaches the calendar; a day whose every slot it refuses is still a day the grid offers, and a consumer who wants that day greyed says so through `dateDisabled`. A typed value it refuses is kept, and the form's to refuse.
   *
   * @since next
   */
  readonly datetimeDisabled = input<PctDateTimePredicate | null>(null);

  /**
   * Emitted when focus leaves the whole field — both texts, the button and the panel — and not when it moves between them; lets the form mark the field as touched.
   *
   * @since next
   */
  readonly touch = output<void>();

  // --- component API ---

  /**
   * The visible label, rendered by the control itself when it stands outside a `pct-field`; inside one, the field's label is the name. Each text is named by it and a word of its own.
   *
   * @since next
   */
  readonly label = input<string>('');

  /**
   * A line of help under the control, outside a `pct-field`; the first error message takes its place while the field is invalid and touched.
   *
   * @since next
   */
  readonly hint = input<string>('');

  /**
   * The accessible name of a field with no visible `label` — an INPUT rather than an
   * `aria-label` on the tag, because the texts sit inside this template and an ARIA name on the
   * roleless host is ignored. Each text is named by it and a word of its own.
   *
   * @since next
   */
  readonly ariaLabel = input<string>('');

  /**
   * As `ariaLabel`, for a name that already stands somewhere on the page.
   *
   * @since next
   */
  readonly ariaLabelledby = input<string>('');

  /**
   * Overrides the application's `LOCALE_ID` for this field — the order of the two texts, the day's order and the clock all follow it.
   *
   * @since next
   */
  readonly locale = input<string>('');

  /**
   * Which day the calendar's week starts on, `1` (Monday) … `7` (Sunday). Absent, the locale decides.
   *
   * @since next
   */
  readonly firstDayOfWeek = input(0, { transform: numberAttribute });

  /**
   * Whether the two format hints stand in the texts while they are empty (`dd.mm.yyyy` and `hh:mm`).
   *
   * @since next
   */
  readonly showFormat = input(true, { transform: booleanAttribute });

  /**
   * Height 28 / 36 / 44 px — the axis every field shares; from `providePctConfig` by default (req-api-config).
   *
   * @since next
   */
  readonly size = input<PctSize>(this.config.defaultSize);

  /**
   * Which edge of the field the panel lines up with.
   *
   * @since next
   */
  readonly panelAlign = input<PctDatetimePanelAlign>('start');

  private readonly dayControl =
    viewChild<ElementRef<HTMLInputElement>>('dayControl');
  private readonly timeControl =
    viewChild<ElementRef<HTMLInputElement>>('timeControl');
  private readonly row = viewChild.required<ElementRef<HTMLElement>>('row');
  private readonly calendar = viewChild(PctCalendar);
  private readonly columns = viewChild(PctTimeColumns);
  private readonly panel = viewChild<ElementRef<HTMLElement>>('panel');

  // --- a11y: stable ids for the ARIA relations (req-a11y-built-in) ---

  private readonly uid = nextPctId('pct-datetime');
  /**
   * The id of the text that stands first — the one the label points at, whichever half the language writes first.
   *
   * @since next
   */
  readonly controlId = `${this.uid}-control`;
  /** The id of the text that stands second. */
  protected readonly secondId = `${this.uid}-second`;
  protected readonly labelId = `${this.uid}-label`;
  /** The hidden copy of `ariaLabel`, so the texts can be named by it and a word through ids. */
  protected readonly nameId = `${this.uid}-name`;
  protected readonly dayWordId = `${this.uid}-day-word`;
  protected readonly timeWordId = `${this.uid}-time-word`;
  protected readonly hintId = `${this.uid}-hint`;
  protected readonly errorId = `${this.uid}-error`;
  protected readonly warningId = `${this.uid}-warning`;

  // --- working with the chrome (req-api-no-wrapper) ---

  private readonly fieldApi = inject(PCT_FIELD, { optional: true });
  protected readonly inField = this.fieldApi !== null;

  /**
   * `for`: the chrome's label points at the first text, so a press on it puts the caret there — and the chrome hands its label's id over as well (`setLabelledBy`), because each text is named by the label AND a word of its own.
   *
   * @since next
   */
  readonly labelStrategy: PctLabelStrategy = 'for';
  /**
   * A click anywhere on the field places the caret — the control is typed into, and the panel is behind a button of its own.
   *
   * @since next
   */
  readonly fieldCursor: PctFieldCursor = 'text';

  /** What the chrome hands over inside a field; `null` standing alone. */
  private readonly fieldDescribedBy = signal<string | null>(null);
  private readonly fieldLabelledBy = signal<string | null>(null);

  // --- the two halves ---

  /** The day the day's text holds, or `null`. */
  protected readonly day = signal<PctDay | null>(null);
  /** The time the time's text holds, or `null`. */
  protected readonly time = signal<PctTimeOfDay | null>(null);

  /** The pair the two halves make, or `null` while either is empty. */
  private readonly composed = computed(() => {
    const day = this.day();
    const time = this.time();
    return day !== null && time !== null ? pctDateTime(day, time) : null;
  });

  /** What was typed into a half and is not one — kept on the screen, reported once it is left. */
  private readonly dayRejected = signal<string | null>(null);
  private readonly timeRejected = signal<string | null>(null);

  /** While a half is being typed into, its text is not rewritten — the caret would jump. */
  private readonly dayTyping = signal(false);
  private readonly timeTyping = signal(false);

  /**
   * Whether focus has left the whole since the last keystroke in an empty half — the moment
   * the incomplete sentence is written (0070's first moment), taken back by the next two.
   */
  private readonly left = signal(false);

  // --- the state the form cannot see ---

  /**
   * There is text in a half and it is not one. The form sees `null` and calls the field empty,
   * so the control says so itself, and the half says which.
   */
  protected readonly malformed = computed(
    () =>
      (this.dayRejected() !== null || this.timeRejected() !== null) &&
      !this.disabled(),
  );

  /**
   * One half holds a value and the other is empty, and focus has left the field: the value is
   * `null`, and a required field would say "required" over a day the user can see. Junk in a
   * half comes first — text on the screen that is not a value before a value that is missing.
   */
  private readonly incomplete = computed(
    () =>
      this.left() &&
      !this.disabled() &&
      this.dayRejected() === null &&
      this.timeRejected() === null &&
      (this.day() === null) !== (this.time() === null),
  );

  /**
   * What the control knows and the form cannot (0070), one sentence at a time: the day's junk, then the time's, then a half left empty. The two halves' sentences are the date field's and the time field's own.
   *
   * @since next
   */
  readonly ownErrors = computed<readonly PctValidationError[]>(() => {
    if (this.disabled()) return [];
    if (this.dayRejected() !== null)
      return [{ message: this.texts().dateMalformed }];
    if (this.timeRejected() !== null)
      return [{ message: this.texts().timeMalformed }];
    if (this.incomplete())
      return [{ message: this.texts().datetimeIncomplete }];
    return [];
  });

  private readonly messages = pctFieldMessages({
    invalid: this.invalid,
    touched: this.touched,
    errors: this.errors,
    own: this.ownErrors,
    warnings: this.fieldWarnings,
  });
  protected readonly errorText = this.messages.errorText;
  protected readonly showInvalid = this.messages.showInvalid;
  protected readonly showError = this.messages.showError;
  protected readonly warningText = this.messages.warningText;
  protected readonly showWarning = this.messages.showWarning;

  /**
   * Which half `aria-invalid` stands on. The control's own sentence names one half — the junk,
   * or the empty one — and only that half is marked; the form's verdict is about the pair, so
   * it marks both.
   */
  protected readonly blamed = computed(() => {
    const day = this.dayRejected() !== null;
    const time = this.timeRejected() !== null;
    if (!this.showInvalid()) return { day: false, time: false };
    if (day || time) return { day, time };
    if (this.incomplete())
      return { day: this.day() === null, time: this.time() === null };
    return { day: true, time: true };
  });

  // --- the language the field is written in ---

  protected readonly activeLocale = computed(
    () => this.locale() || this.appLocale,
  );

  private readonly dayFormat = computed(() =>
    pctDayFormat(this.activeLocale()),
  );
  private readonly timeFormat = computed(() =>
    pctTimeFormat(this.activeLocale()),
  );

  /** The two texts in the order this language writes a day with a time. */
  protected readonly halves = computed(() =>
    pctDateTimeHalves(this.activeLocale()),
  );

  /** A step the columns can list, or the default one in its place — what the panel is handed. */
  protected readonly validStep = computed(() => {
    const step = this.step();
    return isPctTimeStep(step) ? step : 60;
  });

  /** Whether a time on this field's step has seconds — counted from midnight, on every day. */
  private readonly seconds = computed(() => this.validStep() % 60 !== 0);

  /** `dd.mm.yyyy` — this language's order and separators, the reader's own letters. */
  protected readonly dayHint = computed(() => {
    if (!this.showFormat()) return null;
    // Read one by one through `texts()`: the texts gate finds a read by that shape, and a key
    // nobody can see read is a key it calls dead.
    return this.dayFormat().hint({
      day: this.texts().dateDayLetter,
      month: this.texts().dateMonthLetter,
      year: this.texts().dateYearLetter,
    });
  });

  /** `hh:mm` — this language's order, separators and day-period words, the reader's own letters. */
  protected readonly timeHint = computed(() => {
    if (!this.showFormat()) return null;
    return this.timeFormat().hint(
      {
        hour: this.texts().timeHourLetter,
        minute: this.texts().timeMinuteLetter,
        second: this.texts().timeSecondLetter,
      },
      this.seconds(),
    );
  });

  /**
   * How many characters wide the day's text is drawn: as wide as its hint and as a day written
   * at its widest, so the time stands right after it and not across the field. A native `size`
   * and not `field-sizing`, which Angular 22 still supports a firefox without (0084).
   */
  protected readonly dayWidth = computed(() => {
    const format = this.dayFormat();
    const hint = format.hint({ day: 'd', month: 'm', year: 'y' });
    return Math.max(hint.length, format.format('2026-12-28').length) + 1;
  });

  /** As `dayWidth`, for the time: its hint, and a time written at its widest on this clock. */
  protected readonly timeWidth = computed(() => {
    const format = this.timeFormat();
    const seconds = this.seconds();
    const hint = format.hint({ hour: 'h', minute: 'm', second: 's' }, seconds);
    return (
      Math.max(
        hint.length,
        format.format(seconds ? '23:58:58' : '23:58').length,
      ) + 1
    );
  });

  /** The ids every text is named by, ahead of its own word — or nothing to name it by. */
  protected readonly nameIds = computed(() => {
    if (this.inField) return this.fieldLabelledBy();
    if (this.label() !== '') return this.labelId;
    if (this.ariaLabelledby() !== '') return this.ariaLabelledby();
    return this.ariaLabel() !== '' ? this.nameId : null;
  });

  protected readonly dayLabelledBy = computed(() =>
    [this.nameIds(), this.dayWordId].filter((id) => id !== null).join(' '),
  );
  protected readonly timeLabelledBy = computed(() =>
    [this.nameIds(), this.timeWordId].filter((id) => id !== null).join(' '),
  );

  /** The id each half's text stands under — the first one in the language's order is the label's. */
  protected idOf(half: PctDateTimeHalf): string {
    return this.halves()[0] === half ? this.controlId : this.secondId;
  }

  // --- the panel ---

  /** Inside the chrome the panel lines up with the field's border, not with the texts. */
  protected readonly anchor = computed(() => this.fieldApi?.surface() ?? null);

  private readonly panelOverlay = pctOverlay({
    // The row and not a text: the panel's width and the inherited theme are the whole field's.
    from: () => this.row().nativeElement,
    anchor: () => this.anchor(),
  });

  protected readonly open = this.panelOverlay.open;
  protected readonly inherited = this.panelOverlay.inherited;
  protected readonly panelId = `${this.uid}-panel`;

  protected readonly panelPositions = computed<ConnectedPosition[]>(() => {
    const x = this.panelAlign();
    return [
      { originX: x, originY: 'bottom', overlayX: x, overlayY: 'top' },
      { originX: x, originY: 'top', overlayX: x, overlayY: 'bottom' },
    ];
  });

  /** The bounds the field obeys: the pair, or none where it is reversed. */
  private readonly window = computed(() => {
    const min = this.min();
    const max = this.max();
    return min !== undefined &&
      max !== undefined &&
      pctCompareDateTimes(min, max) > 0
      ? { min: undefined, max: undefined }
      : { min, max };
  });

  /** The calendar's bounds — the day of each. */
  protected readonly minDay = computed(() => {
    const min = this.window().min;
    return min === undefined ? undefined : pctDateTimeParts(min).day;
  });
  protected readonly maxDay = computed(() => {
    const max = this.window().max;
    return max === undefined ? undefined : pctDateTimeParts(max).day;
  });

  /**
   * The columns' bounds on the chosen day: a bound's time on the bound's own day, moved inward
   * onto the step counted from midnight — the first time on it at or after `min`'s, the last at
   * or before `max`'s — so the columns, which count from the bound they are handed, list the
   * same rows on that day as on every other. `closed` is a day with no time on the step inside
   * the window: a day outside it, or one on which the move crosses — the columns are then
   * handed no bound at all and refuse every row through `timeDisabled`, never a reversed pair,
   * which they would read as a window across midnight (0090 §5).
   */
  protected readonly hours = computed(() => {
    const day = this.day();
    const { min, max } = this.window();
    const step = this.validStep();
    const open = { min: undefined, max: undefined, closed: false };
    if (day === null) return open;
    const low = min === undefined ? null : pctDateTimeParts(min);
    const high = max === undefined ? null : pctDateTimeParts(max);
    if (
      (low !== null && pctCompareDays(day, low.day) < 0) ||
      (high !== null && pctCompareDays(day, high.day) > 0)
    )
      return { ...open, closed: true };
    const from =
      low !== null && pctCompareDays(day, low.day) === 0
        ? Math.ceil(secondsOf(low.time) / step) * step
        : null;
    const to =
      high !== null && pctCompareDays(day, high.day) === 0
        ? Math.floor(secondsOf(high.time) / step) * step
        : null;
    if ((from !== null && from >= DAY) || (from ?? 0) > (to ?? DAY))
      return { ...open, closed: true };
    return {
      min: from === null ? undefined : this.write(from),
      max: to === null ? undefined : this.write(to),
      closed: false,
    };
  });

  /**
   * What the columns refuse: every row on a closed day, or `datetimeDisabled` closed over the
   * chosen day — the predicate 0086 deferred, which only a control holding a day can ask.
   */
  protected readonly timeRefused = computed<PctTimePredicate | null>(() => {
    if (this.hours().closed) return () => true;
    const day = this.day();
    const refuses = this.datetimeDisabled();
    if (day === null || refuses === null) return null;
    return (time) => refuses(pctDateTime(day, time));
  });

  /**
   * The day the calendar opens on while the day's text is junk: the month it names, where the
   * day of the month is what is wrong — `31.02.2026` opens on February (0090 §2). The text's
   * three runs of digits are the date parser's own reading, and the day's is set to the first.
   */
  protected readonly typedMonth = computed(() => {
    const junk = this.dayRejected();
    if (junk === null) return undefined;
    const runs = junk.split(/(\p{Nd}+)/u);
    if (runs.length !== 7) return undefined;
    const format = this.dayFormat();
    runs[format.order.indexOf('day') * 2 + 1] = '1';
    return format.parse(runs.join('')) ?? undefined;
  });

  /** Where focus goes once the panel has drawn: the grid on opening, the hours after a day. */
  private readonly focusWanted = signal<{
    readonly where: 'grid' | 'hours';
  } | null>(null);

  /**
   * The description, from whichever of the two owners is drawing it. Standing alone the ids
   * follow the ONE line the template draws — the error takes it and the hint gives way
   * (`req-api-message`).
   */
  protected readonly describedBy = computed(() =>
    this.inField
      ? this.fieldDescribedBy()
      : pctDescribedBy([
          [this.errorId, this.showError()],
          [this.warningId, this.showWarning()],
          [
            this.hintId,
            !this.showError() && !this.showWarning() && this.hint() !== '',
          ],
        ]),
  );

  constructor() {
    pctAttachToField(this.fieldApi, this);

    // A value from outside — a model, a form, a reset — is split into the two halves, and
    // whatever the user left behind goes with it. A value this field wrote itself is the pair
    // its halves make, and is let through: the comparison is the compare, so the pair written
    // in the other shape is the same value.
    effect(() => {
      const value = this.value();
      untracked(() => {
        const composed = this.composed();
        if (
          value === composed ||
          (value !== null &&
            composed !== null &&
            isPctDateTime(value) &&
            pctCompareDateTimes(value, composed) === 0)
        )
          return;
        // The interop writes values a `PctDateTime | null` model cannot hold — a `null` before
        // the first real one, and whatever a legacy `ControlValueAccessor` had (`lesson-117`).
        const parts =
          value !== null && isPctDateTime(value)
            ? pctDateTimeParts(value)
            : null;
        this.day.set(parts?.day ?? null);
        this.time.set(parts?.time ?? null);
        this.dayRejected.set(null);
        this.timeRejected.set(null);
        this.left.set(false);
      });
    });

    // What each text shows: its half written in this language, or — while there is none — the
    // text the user left behind that is not one.
    effect(() => {
      const day = this.day();
      const text = day === null ? '' : this.dayFormat().format(day);
      this.show(this.dayControl(), text, this.dayRejected(), this.dayTyping());
    });
    effect(() => {
      const time = this.time();
      const text = time === null ? '' : this.timeFormat().format(time);
      this.show(
        this.timeControl(),
        text,
        this.timeRejected(),
        this.timeTyping(),
      );
    });

    // The grid and the columns do not exist until the overlay has drawn them, so the focus
    // follows the render rather than the signal that asked for it.
    afterRenderEffect(() => {
      const wanted = this.focusWanted();
      if (wanted === null) return;
      untracked(() => {
        if (wanted.where === 'grid') this.calendar()?.focusCursor();
        else this.columns()?.focusCursor();
      });
    });

    if (isDevMode()) this.warnOnUnsupportedStep();
    if (isDevMode()) this.warnOnReversedBounds();
  }

  /**
   * The chrome hands over the ids of its hint and error, and both texts describe themselves by them.
   *
   * @since next
   */
  setDescribedBy(ids: string | null): void {
    this.fieldDescribedBy.set(ids);
  }

  /**
   * The chrome hands over the id of its label, and each text is named by it and a word of its own.
   *
   * @since next
   */
  setLabelledBy(id: string | null): void {
    this.fieldLabelledBy.set(id);
  }

  /**
   * Called by signal forms (`focusBoundControl()`, for instance), and by the chrome: the text that stands first.
   *
   * @since next
   */
  focus(options?: FocusOptions): void {
    this.firstControl()?.focus(options);
  }

  /**
   * Empties the field — both texts, both halves and the value alike.
   *
   * @since next
   */
  reset(): void {
    this.dayTyping.set(false);
    this.timeTyping.set(false);
    this.dayRejected.set(null);
    this.timeRejected.set(null);
    this.left.set(false);
    this.day.set(null);
    this.time.set(null);
    this.compose();
  }

  private firstControl(): HTMLInputElement | undefined {
    const control =
      this.halves()[0] === 'day' ? this.dayControl() : this.timeControl();
    return control?.nativeElement;
  }

  private show(
    control: ElementRef<HTMLInputElement> | undefined,
    text: string,
    junk: string | null,
    typing: boolean,
  ): void {
    if (control === undefined || typing) return;
    const shown = text !== '' ? text : (junk ?? '');
    const el = control.nativeElement;
    if (el.value !== shown) el.value = shown;
  }

  /** Seconds since midnight written in the field's shape. */
  private write(total: number): PctTimeOfDay {
    return pctTimeOfDay(
      Math.floor(total / 3600),
      Math.floor(total / 60) % 60,
      this.seconds() ? total % 60 : undefined,
    );
  }

  /**
   * The value the halves make, written unless it is the one held — the same pair in the other
   * shape is not an edit, and handing the form a new string for it would be a change nobody made.
   */
  private compose(): void {
    const composed = this.composed();
    const held = this.value();
    if (composed === null) {
      if (held !== null) this.value.set(null);
      return;
    }
    if (
      held !== null &&
      isPctDateTime(held) &&
      pctCompareDateTimes(held, composed) === 0
    )
      return;
    this.value.set(composed);
  }

  /** What was typed into the time's text, in the field's shape: seconds where the step has them. */
  private parseTime(text: string): PctTimeOfDay | null {
    const parsed = this.timeFormat().parse(text);
    return parsed !== null && this.seconds() && parsed.length === 5
      ? `${parsed}:00`
      : parsed;
  }

  protected onInput(half: PctDateTimeHalf, event: Event): void {
    const text = (event.target as HTMLInputElement).value;
    // A keystroke in a half that held nothing takes the incomplete sentence back — 0070's
    // second moment. One in the half that holds the value does not: the other is still empty.
    if ((half === 'day' ? this.day() : this.time()) === null)
      this.left.set(false);
    if (half === 'day') {
      this.dayTyping.set(true);
      // A day being typed is malformed most of the way through, so the report is taken back on
      // the first keystroke and put back, if at all, only when the half is left.
      this.dayRejected.set(null);
      const parsed = text.trim() === '' ? null : this.dayFormat().parse(text);
      if (text.trim() === '' || parsed !== null) this.day.set(parsed);
    } else {
      this.timeTyping.set(true);
      this.timeRejected.set(null);
      const parsed = text.trim() === '' ? null : this.parseTime(text);
      if (text.trim() === '' || parsed !== null) this.time.set(parsed);
    }
    this.compose();
  }

  /**
   * Settles what is in a half when it is left — each half on its own blur, as the date and
   * the time fields do, so a day typed and left for the time already moves the calendar's
   * cursor. An empty text is no half; a half is the half; anything else keeps the text the
   * user typed and reports that it is not one.
   */
  protected onBlur(half: PctDateTimeHalf, event: Event): void {
    const text = (event.target as HTMLInputElement).value;
    if (half === 'day') {
      this.dayTyping.set(false);
      const parsed = text.trim() === '' ? null : this.dayFormat().parse(text);
      this.dayRejected.set(
        text.trim() !== '' && parsed === null ? text : null,
      );
      const held = this.day();
      // The day the half already holds, read back from its own text, is not an edit.
      if (
        parsed === null ||
        held === null ||
        pctCompareDays(held, parsed) !== 0
      )
        this.day.set(parsed);
    } else {
      this.timeTyping.set(false);
      const parsed = text.trim() === '' ? null : this.parseTime(text);
      this.timeRejected.set(
        text.trim() !== '' && parsed === null ? text : null,
      );
      const held = this.time();
      if (
        parsed === null ||
        held === null ||
        pctCompareTimes(held, parsed) !== 0
      )
        this.time.set(parsed);
    }
    this.compose();
  }

  /**
   * Focus leaving a part of the field — a text, the button, the panel. Only leaving the WHOLE
   * counts: then the form is told the field was touched, and a half left empty is said (0090
   * §3). Moving between the texts, onto the button or into the panel is staying.
   */
  protected onFocusOut(event: FocusEvent): void {
    const next = event.relatedTarget as Node | null;
    if (
      next !== null &&
      (this.host.nativeElement.contains(next) ||
        (this.panel()?.nativeElement.contains(next) ?? false))
    )
      return;
    this.left.set(true);
    this.touch.emit();
  }

  /** A day from the grid: the day's text is rewritten and the time's is left as it was typed. */
  protected onDay(day: PctDay | null): void {
    this.dayTyping.set(false);
    this.dayRejected.set(null);
    this.left.set(false);
    this.day.set(day);
    this.compose();
  }

  /** A time from the columns, which write as they walk. */
  protected onTime(time: PctTimeOfDay | null): void {
    this.timeTyping.set(false);
    this.timeRejected.set(null);
    this.left.set(false);
    this.time.set(time);
    this.compose();
  }

  /** A pick in the grid answers the first question; the second one is next (0090 §4). */
  protected onDayPicked(): void {
    this.focusWanted.set({ where: 'hours' });
  }

  /** A pick in the columns completes the pair, and the panel closes. */
  protected onTimePicked(): void {
    this.close(true);
  }

  protected toggle(): void {
    if (this.disabled() || this.readonly()) return;
    if (this.open()) this.close(true);
    else this.openPanel();
  }

  private openPanel(): void {
    this.panelOverlay.show();
    this.focusWanted.set({ where: 'grid' });
  }

  /** Closes the panel; `restore` decides whether focus comes back to the field. */
  protected close(restore: boolean): void {
    if (!this.open()) return;
    this.panelOverlay.hide();
    if (restore) this.focus();
  }

  /**
   * The panel's own key map. Escape closes it with the value as the halves left it, and Tab
   * walks the grid, then the columns one stop each, and off the last it closes — with focus
   * spliced back onto the field, because an overlay stands at the END of the document's tab
   * order however near the field it is drawn
   * ([0031](../../../../docs/decisions/0031-a-panel-s-tab-order-belongs-to-its-trigger.md)).
   * The stops are the month buttons, the grid's cell and the columns, all of them in this
   * entrypoint's templates and the two it composes.
   */
  protected onPanelKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      // `stopPropagation` so a dialog holding this field does not take the same Escape as its
      // own — the closing stack is the dependency's, and this panel is not on it (0024).
      event.stopPropagation();
      this.close(true);
      return;
    }
    if (event.key !== 'Tab') return;

    const panel = this.panel()?.nativeElement;
    if (!panel) return;
    const stops = Array.from(
      panel.querySelectorAll<HTMLElement>(
        'button:not(:disabled), [tabindex="0"]',
      ),
    );
    const target = event.target as HTMLElement;
    const leaving = event.shiftKey
      ? target === panel || target === stops[0]
      : stops.length === 0 || target === stops[stops.length - 1];
    if (!leaving) return;

    event.preventDefault();
    this.close(true);
  }

  /**
   * A step the columns cannot list makes the valid minutes depend on the hour (0086 §5), so it
   * is refused, read as 60, and said — once per value it takes.
   */
  private warnOnUnsupportedStep(): void {
    effect(() => {
      const step = this.step();
      if (isPctTimeStep(step)) return;
      console.warn(
        `[pct-datetime] step=${step} is not a step the columns can list — a whole number of ` +
          `seconds that divides a minute, of minutes that divides an hour, or of hours that ` +
          `divides a day. It is read as 60.`,
      );
    });
  }

  /**
   * A reversed pair is the platform's contradiction on a datetime, not the time field's night
   * shift (0090 §5, A8): the field behaves as if it had no bounds, and says so.
   */
  private warnOnReversedBounds(): void {
    effect(() => {
      const min = this.min();
      const max = this.max();
      if (
        min === undefined ||
        max === undefined ||
        pctCompareDateTimes(min, max) <= 0
      )
        return;
      console.warn(
        `[pct-datetime] min=${min} is later than max=${max}. A datetime's bounds are no window ` +
          `across midnight — the night shift is two datetimes on two days — so the field has ` +
          `no bounds at all.`,
      );
    });
  }
}
