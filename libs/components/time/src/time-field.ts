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
import {
  createMetadataKey,
  MAX,
  metadata,
  MetadataReducer,
  MIN,
  validate,
  type FormValueControl,
  type LimitKey,
  type LogicFn,
  type PathKind,
  type SchemaPath,
  type SchemaPathRules,
  type ValidationError,
} from '@angular/forms/signals';
import {
  nextPctId,
  PCT_CONFIG,
  PCT_FIELD,
  PCT_TEXTS,
  pctAttachToField,
  pctFieldWarnings,
  pctDescribedBy,
  pctFieldMessages,
  pctOverlay,
  PctFieldControl,
  PctFieldCursor,
  PctLabelStrategy,
  PctOverlayPanel,
  PctSize,
  PctValidationError,
} from '@pacit/components/core';
import { PctIcon } from '@pacit/components/icon';

import { pctLattice } from './lattice';
import { pctTimeFormat } from './locale';
import {
  isPctTimeOfDay,
  isPctTimeStep,
  pctCompareTimes,
  PctTimeOfDay,
  pctTimeOfDayParts,
} from './time';
import { PctTimeColumns } from './time-columns';

/**
 * A time input written as an attribute is a string; one bound from a model may be anything.
 * Absent is `undefined` and not `null`, because `min` / `max` belong to the `FormUiControl`
 * contract and that contract spells an absent bound `undefined` — the date field's reader.
 */
function optionalTime(value: unknown): PctTimeOfDay | undefined {
  return isPctTimeOfDay(value) ? value : undefined;
}

/**
 * Which edge of the field the panel lines its own up with.
 *
 * @since next
 */
export type PctTimePanelAlign = 'start' | 'end';

/**
 * Time field — a text control the library formats and parses per locale, with columns of hours
 * and minutes in a panel beside it.
 *
 * **Why not `<input type="time">`,** despite
 * [`req-api-platform`](../../../../docs/requirements/api.md#req-api-platform) — three
 * measurements over the three engines, and harder than the date's
 * ([0086](../../../../docs/decisions/0086-a-time-of-day-is-a-wall-clock.md)):
 *
 * - **the clock it draws comes from a different place in each engine** — the browser's
 *   interface language in chromium, firefox's own in firefox, the browser's locale in webkit,
 *   and `lang` in none of them — so a Polish application shows `01:05 PM` to a Polish user of
 *   an English-language Firefox and cannot say otherwise;
 * - **what was typed is not what is read**: a half-typed time reads `""` in firefox and webkit,
 *   and chromium reads `130` as **`13:00`**, a valid value nobody entered;
 * - **one control is three, four or one tab stops** by engine and by the system's locale, and a
 *   step with seconds adds one.
 *
 * The value is a [`PctTimeOfDay`](./time.ts) — `HH:mm`, or `HH:mm:ss` where the step has
 * seconds in it: a wall-clock time and not an instant. The clock — twelve hours or twenty-four,
 * the day-period words and where they stand — is the field's `locale`, read off one formatter;
 * a clock the application wants forced is a locale too (`en-US-u-hc-h23`), so there is no
 * input for it.
 *
 * @example
 * <pct-field label="Starts at">
 *   <pct-time [formField]="f.startsAt" />
 * </pct-field>
 *
 * @example
 * // Standalone: quarter hours inside office hours, in a locale of its own.
 * <pct-time [(value)]="time" step="900" min="09:00" max="17:00" locale="en-US" label="Time" />
 *
 * @since next
 */
@Component({
  selector: 'pct-time',
  imports: [OverlayModule, PctTimeColumns, PctIcon, PctOverlayPanel],
  templateUrl: './time-field.html',
  styleUrl: './time-field.scss',
  host: {
    class: 'pct-time',
    '[attr.data-pct-size]': 'size()',
    '[attr.data-pct-open]': 'open() ? "" : null',
    '[attr.data-pct-invalid]': 'showInvalid() ? "" : null',
    '[attr.data-pct-warning]': 'showWarning() ? "" : null',
    '[attr.data-pct-disabled]': 'disabled() ? "" : null',
    // What the control knows and the form cannot: there is text in the field and it is not a
    // time. See `malformed` below.
    '[attr.data-pct-malformed]': 'malformed() ? "" : null',
    '[attr.data-pct-in-field]': 'inField ? "" : null',
  },
})
export class PctTime
  implements FormValueControl<PctTimeOfDay | null>, PctFieldControl
{
  private readonly config = inject(PCT_CONFIG);
  protected readonly texts = inject(PCT_TEXTS);
  private readonly appLocale = inject(LOCALE_ID);

  /**
   * The chosen time, or `null` when the field is empty.
   *
   * @since next
   */
  readonly value = model<PctTimeOfDay | null>(null);

  // --- FormUiControl (kept in sync by the FormField directive) ---

  /**
   * Blocks the control and greys it — the native `disabled`, so it leaves the tab order as well. With `[formField]` the directive writes it, as it writes every input of the `FormUiControl` contract.
   *
   * @since next
   */
  readonly disabled = input(false, { transform: booleanAttribute });

  /**
   * Keeps the value: the input takes the native `readonly` and the clock button is disabled with it, while the field stays focusable.
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
   * The native `name` — what a form submission calls the value.
   *
   * @since next
   */
  readonly name = input<string>('');

  /**
   * The earliest time. It belongs to the `FormUiControl` contract, which spells an absent bound
   * `undefined`, and a signal form gives it through `pctTimeBounds` — the compiler refuses the
   * attribute beside `[formField]`.
   *
   * **The bounds clamp the panel's walk and they do not rewrite what was typed** — the date
   * field's rule: a bound clamps a MOVEMENT, and a time somebody wrote out is not one. A value
   * outside them is the form's to report. Later than `max`, the two are a window across
   * midnight, `22:00` to `06:00` — the reading the HTML specification gives a time input, and
   * all three engines implement it (0086, A12).
   *
   * @since next
   */
  readonly min = input(undefined, { transform: optionalTime });

  /**
   * The latest time — as `min`, a bound on the panel's walk and not a rewrite of what was typed.
   *
   * @since next
   */
  readonly max = input(undefined, { transform: optionalTime });

  /**
   * The step in seconds, counted from `min` — 60 by default, like the native attribute. It decides what the panel's columns offer (`900` is the minutes `00 15 30 45`), whether a seconds column exists and the value carries `:ss` — and nothing about typed text: a time off the step is a time, and the form's to refuse (0086 §5). A step the columns cannot list is refused with a dev-mode warning and read as 60.
   *
   * @since next
   */
  readonly step = input(60, { transform: numberAttribute });

  /**
   * Emitted on blur — lets the form mark the field as touched.
   *
   * @since next
   */
  readonly touch = output<void>();

  // --- component API ---

  /**
   * The visible label, rendered by the control itself when it stands outside a `pct-field`; inside one, the field's label is the name.
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
   * `aria-label` on the tag, because the textbox sits inside this template and an ARIA name
   * on the roleless host is ignored.
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
   * Overrides the application's `LOCALE_ID` for this field — and with it the clock: `en-US` counts twelve hours and `en-GB` twenty-four, and `en-US-u-hc-h23` forces the second on the first.
   *
   * @since next
   */
  readonly locale = input<string>('');

  /**
   * Whether the format hint stands in the field while it is empty (`hh:mm`).
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
  readonly panelAlign = input<PctTimePanelAlign>('start');

  private readonly control =
    viewChild.required<ElementRef<HTMLInputElement>>('control');
  private readonly columns = viewChild(PctTimeColumns);
  private readonly panel = viewChild<ElementRef<HTMLElement>>('panel');

  // --- a11y: stable ids for the ARIA relations (req-a11y-built-in) ---

  private readonly uid = nextPctId('pct-time');
  /**
   * The id of the text input the label points at.
   *
   * @since next
   */
  readonly controlId = `${this.uid}-control`;
  protected readonly hintId = `${this.uid}-hint`;
  protected readonly errorId = `${this.uid}-error`;
  protected readonly warningId = `${this.uid}-warning`;

  // --- working with the chrome (req-api-no-wrapper) ---

  private readonly fieldApi = inject(PCT_FIELD, { optional: true });
  protected readonly inField = this.fieldApi !== null;

  /**
   * `for`: the chrome's label points at the input above.
   *
   * @since next
   */
  readonly labelStrategy: PctLabelStrategy = 'for';
  /**
   * A click anywhere on the field places the caret — the control is typed into, and the
   * columns are behind a button of their own.
   *
   * @since next
   */
  readonly fieldCursor: PctFieldCursor = 'text';

  /** What the chrome hands over inside a field; `null` standing alone. */
  private readonly fieldDescribedBy = signal<string | null>(null);

  // --- the state the form cannot see ---

  /**
   * There is text in the field and it is not a time.
   *
   * The form sees `null` and calls it empty, which for a required field means the user is told
   * "this is required" while looking at four digits they typed. The control knows better and
   * says so with `aria-invalid`, a state attribute and — through `ownErrors`, the contract's
   * second channel (0070) — a sentence of its own in the message line, ahead of the form's.
   */
  private readonly rejected = signal<string | null>(null);
  protected readonly malformed = computed(
    () => this.rejected() !== null && !this.disabled(),
  );
  /**
   * Text in the field that is not a time. The form sees `null` and calls the field empty, so the control says this itself.
   *
   * @since next
   */
  readonly ownErrors = computed<readonly PctValidationError[]>(() =>
    this.malformed() ? [{ message: this.texts().timeMalformed }] : [],
  );

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

  // --- the language the field is written in ---

  protected readonly activeLocale = computed(
    () => this.locale() || this.appLocale,
  );

  private readonly format = computed(() => pctTimeFormat(this.activeLocale()));

  /** A step the columns can list, or the default one in its place — what the panel is handed. */
  protected readonly validStep = computed(() => {
    const step = this.step();
    return isPctTimeStep(step) ? step : 60;
  });

  /** Whether a time on this field's step has seconds — the value's shape and the hint's. */
  private readonly seconds = computed(
    () => pctLattice(this.validStep(), this.min(), this.max()).seconds,
  );

  /** `hh:mm` — this language's order, separators and day-period words, the reader's own letters. */
  protected readonly formatHint = computed(() => {
    if (!this.showFormat()) return null;
    // Read one by one through `texts()`: the texts gate finds a read by that shape, and a key
    // nobody can see read is a key it calls dead.
    return this.format().hint(
      {
        hour: this.texts().timeHourLetter,
        minute: this.texts().timeMinuteLetter,
        second: this.texts().timeSecondLetter,
      },
      this.seconds(),
    );
  });

  /** The time as this language writes it, or `''` when there is none. */
  private readonly text = computed(() => {
    const time = this.value();
    // The interop writes values a `PctTimeOfDay | null` model cannot hold — a `null` before the
    // first real one, and whatever a legacy `ControlValueAccessor` had (`lesson-117`). The read
    // is defensive from the first version rather than after the first exception.
    return time !== null && isPctTimeOfDay(time)
      ? this.format().format(time)
      : '';
  });

  /**
   * While the user is typing the field's content is not rewritten — otherwise the caret would
   * jump to the end on every character. The write to the DOM happens on commit alone.
   */
  private readonly typing = signal(false);

  // --- the panel ---

  /** Inside the chrome the panel lines up with the field's border, not with the input. */
  protected readonly anchor = computed(() => this.fieldApi?.surface() ?? null);

  private readonly panelOverlay = pctOverlay({
    from: () => this.control().nativeElement,
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

  /** How many times the panel has been asked to hand focus to the columns. */
  private readonly focusWanted = signal(0);

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

    // What the field shows: the value written in this language, or — while there is no value —
    // the text the user left behind that is not a time. The rejection is cleared HERE and not
    // on commit, because a value arriving from outside is the one thing a commit cannot see.
    //
    // The rejection is READ as a dependency, as in the date field: a reset after junk changes
    // the rejection and nothing else — the value was `null` already — and a field that did not
    // hear it went on showing the junk over an empty value. The write below settles in one
    // more pass: it sets the rejection to what it already is the second time.
    effect(() => {
      const text = this.text();
      const junk = this.rejected() ?? '';
      if (this.typing()) return;
      const el = this.control().nativeElement;
      if (text !== '') {
        untracked(() => this.rejected.set(null));
        if (el.value !== text) el.value = text;
        return;
      }
      if (el.value !== junk) el.value = junk;
    });

    // The columns the panel opens on do not exist until the overlay has drawn them, so the
    // focus follows the render rather than the signal that asked for it.
    afterRenderEffect(() => {
      if (this.focusWanted() === 0) return;
      untracked(() => this.columns()?.focusCursor());
    });

    if (isDevMode()) this.warnOnUnsupportedStep();
  }

  /**
   * The chrome hands over the ids of its hint and error, and the input describes itself by them.
   *
   * @since next
   */
  setDescribedBy(ids: string | null): void {
    this.fieldDescribedBy.set(ids);
  }

  /**
   * Called by signal forms (`focusBoundControl()`, for instance), and by the chrome.
   *
   * @since next
   */
  focus(options?: FocusOptions): void {
    this.control().nativeElement.focus(options);
  }

  /**
   * Takes back what the field holds and the form does not — junk left in it, a time half
   * typed, open columns — and shows the time again. The time is not touched: it is the form's,
   * and a signal form's `reset(value)` has set it before it calls this
   * ([0092](../../../../docs/decisions/0092-a-controls-reset-takes-back-what-the-form-cannot-see.md)).
   *
   * @since next
   */
  reset(): void {
    // None of these writes is the value's, so the form hears nothing — a commit here reached
    // the form after its own value and won, and counted as the user's edit besides.
    this.rejected.set(null);
    this.typing.set(false);
    // A panel that holds focus hands it back to the field as it closes, as Escape does — one
    // taken out of the tree under focus drops it to `body`. Focus anywhere else stays there.
    // A panel asked for in this same task is open and not drawn yet, so it holds nothing.
    const panel = this.panel()?.nativeElement;
    this.close(panel?.contains(panel.ownerDocument.activeElement) ?? false);
  }

  protected onInput(): void {
    this.typing.set(true);
    const text = this.control().nativeElement.value;
    // A time being typed is malformed most of the way through — `13:0` is not a mistake, it is
    // most of the way in — so the report is taken back on the first keystroke and put back, if
    // at all, only when the field is left.
    this.rejected.set(null);
    if (text.trim() === '') {
      this.value.set(null);
      return;
    }
    const parsed = this.parse(text);
    if (parsed !== null) this.value.set(parsed);
  }

  protected onBlur(): void {
    this.commit(this.control().nativeElement.value);
    this.touch.emit();
  }

  /**
   * What was typed, read in this language and written in the field's shape: a field whose step
   * has seconds holds `HH:mm:ss`, so `13:05` typed there is `13:05:00`. The other way round
   * narrows nothing — seconds typed into a field of minutes are a time off its step, which the
   * form refuses and the field keeps.
   */
  private parse(text: string): PctTimeOfDay | null {
    const parsed = this.format().parse(text);
    return parsed !== null && this.seconds() && parsed.length === 5
      ? `${parsed}:00`
      : parsed;
  }

  /**
   * Settles what is in the field. An empty field is `null` and nothing else; a time is the
   * value; anything else keeps **the text the user typed** and reports that it is not a time.
   */
  private commit(text: string): void {
    this.typing.set(false);
    if (text.trim() === '') {
      this.rejected.set(null);
      this.value.set(null);
      return;
    }
    const parsed = this.parse(text);
    if (parsed === null) {
      this.rejected.set(text);
      this.value.set(null);
      return;
    }
    this.rejected.set(null);
    // The time the field already holds, read back from its own text, is not an edit: focus in
    // and out again must not hand the form a change nobody made. Without this a field of
    // seconds given `13:05` from outside wrote `13:05:00` back on a bare blur — one time, a new
    // string, and a `valueChange` the form counted as the user's.
    const held = this.value();
    if (
      held !== null &&
      isPctTimeOfDay(held) &&
      pctCompareTimes(held, parsed) === 0
    )
      return;
    this.value.set(parsed);
  }

  protected toggle(): void {
    if (this.disabled() || this.readonly()) return;
    if (this.open()) this.close(true);
    else this.show();
  }

  private show(): void {
    this.panelOverlay.show();
    this.focusWanted.update((n) => n + 1);
  }

  /** Closes the panel; `restore` decides whether focus comes back to the field. */
  protected close(restore: boolean): void {
    if (!this.open()) return;
    this.panelOverlay.hide();
    if (restore) this.focus();
  }

  protected onPicked(): void {
    this.close(true);
  }

  /**
   * The panel's own key map. Escape closes it, and Tab leaves it — with focus spliced back onto
   * the control it belongs to, because an overlay is a child of `body` and its content therefore
   * stands at the END of the document's tab order however near the field it is drawn
   * ([0031](../../../../docs/decisions/0031-a-panel-s-tab-order-belongs-to-its-trigger.md)).
   * The stops are the columns, one each, all of them in this entrypoint's templates.
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
        `[pct-time] step=${step} is not a step the columns can list — a whole number of ` +
          `seconds that divides a minute, of minutes that divides an hour, or of hours that ` +
          `divides a day. It is read as 60.`,
      );
    });
  }
}

/**
 * A bound `pctTimeBounds` takes: a time, or a function of the field's context that returns one —
 * the two shapes Angular's own `min()` takes. One that is not a time, `undefined` among them, is
 * no bound, as it is on the field's input.
 *
 * @since next
 */
export type PctTimeBound<TValue, TPathKind extends PathKind = PathKind.Root> =
  | PctTimeOfDay
  | undefined
  | LogicFn<TValue, PctTimeOfDay | undefined, TPathKind>;

/**
 * What `pctTimeBounds` reports: `minTime` for a time before `min`, `maxTime` for one after
 * `max` — and both at once for a time in the gap of a window across midnight, which is the
 * native element's reading, "under **and** over" (0086, A12). Each carries the bound it broke,
 * as the bound was written.
 *
 * @since next
 */
export type PctTimeBoundError =
  | {
      readonly kind: 'minTime';
      readonly minTime: PctTimeOfDay;
      readonly message?: string;
    }
  | {
      readonly kind: 'maxTime';
      readonly maxTime: PctTimeOfDay;
      readonly message?: string;
    };

/**
 * The bounds of `pctTimeBounds`, and the sentence its errors carry — one for both, or one
 * written from the error, which holds the bound.
 *
 * @since next
 */
export interface PctTimeBoundsConfig<
  TValue,
  TPathKind extends PathKind = PathKind.Root,
> {
  readonly min?: PctTimeBound<TValue, TPathKind>;
  readonly max?: PctTimeBound<TValue, TPathKind>;
  readonly message?: string | ((error: PctTimeBoundError) => string);
}

/** One rule's two bounds, either of them absent. */
interface TimePair {
  readonly min: PctTimeOfDay | undefined;
  readonly max: PctTimeOfDay | undefined;
}

/**
 * Every rule's pair on a path, in the order the rules were written — read whole, because on a
 * clock the bounds of several rules do not combine a side at a time: `{ min: '18:00' }` and
 * `{ max: '08:00' }` leave no time at all, and their later `min` and earlier `max` read as the
 * night.
 *
 * The keys here are made at the top of the module and marked PURE, for the reason `./core`'s
 * warning keys are (lesson-252): a call a bundler cannot prove free of effects stays in every
 * application that imports the entrypoint, and the forms runtime behind it.
 */
const TIME_PAIRS = /* @__PURE__ */ createMetadataKey(
  /* @__PURE__ */ MetadataReducer.list<TimePair>(),
);

/**
 * The bounds the field is handed, one key a side: the platform's `MIN` and `MAX` POINT at a key
 * of the field's own type, and the `[formField]` directive reads the bound through them into
 * the control's `min` / `max` inputs (`LimitSelectionKey`), as Angular's `min()` keys its own.
 * Every rule writes the same reading of the whole list, so the last one written is that reading.
 */
const TIME_MIN = /* @__PURE__ */ createMetadataKey<PctTimeOfDay | undefined>();
const TIME_MAX = /* @__PURE__ */ createMetadataKey<PctTimeOfDay | undefined>();

const DAY = 86_400;

function secondsOf(time: PctTimeOfDay): number {
  const { hour, minute, second } = pctTimeOfDayParts(time);
  return (hour * 60 + minute) * 60 + second;
}

/** The times a pair accepts, as runs of seconds from midnight: two for a window. */
function runsOf({ min, max }: TimePair): (readonly [number, number])[] {
  const lo = min === undefined ? 0 : secondsOf(min);
  const hi = max === undefined ? DAY - 1 : secondsOf(max);
  return lo <= hi
    ? [[lo, hi]]
    : [
        [0, hi],
        [lo, DAY - 1],
      ];
}

/**
 * The bounds the field walks for every rule on a path: the shortest stretch of the clock that
 * holds every time all the rules accept. Where those times are one run, that is them exactly;
 * where they are several, it leaves out the widest gap between them — the one across midnight
 * included — and keeps the others, so the panel never refuses a time the form accepts and may
 * offer one it refuses. Rules that accept no time at all leave the field no bounds, because no
 * pair of them spells "nothing". A bound is handed on as it was written; midnight and the
 * day's last second, where no rule wrote them, are no bound; a bound is handed on as a rule
 * wrote it.
 */
function timeSpan(pairs: readonly TimePair[]): TimePair {
  const written = new Map<number, PctTimeOfDay>();
  let runs: (readonly [number, number])[] = [[0, DAY - 1]];
  for (const pair of pairs) {
    for (const bound of [pair.min, pair.max]) {
      if (bound !== undefined) written.set(secondsOf(bound), bound);
    }
    runs = runs.flatMap(([from, to]) =>
      runsOf(pair).flatMap(([start, end]) => {
        const a = Math.max(from, start);
        const b = Math.min(to, end);
        return a <= b ? [[a, b] as const] : [];
      }),
    );
  }
  if (runs.length === 0) return { min: undefined, max: undefined };
  // The runs are in the clock's order already: each new one lies inside one old one, and a
  // pair's own runs come morning first.
  let after = 0;
  let widest = runs[0][0] + DAY - runs[runs.length - 1][1];
  for (let i = 1; i < runs.length; i++) {
    const gap = runs[i][0] - runs[i - 1][1];
    if (gap > widest) {
      widest = gap;
      after = i;
    }
  }
  return {
    min: written.get(runs[after][0]),
    // The run before the gap — before the one across midnight, the day's last.
    max: written.get(runs[(after || runs.length) - 1][1]),
  };
}

function timeBound<TValue, TPathKind extends PathKind>(
  bound: PctTimeBound<TValue, TPathKind>,
): LogicFn<TValue, PctTimeOfDay | undefined, TPathKind> {
  return (ctx) =>
    optionalTime(typeof bound === 'function' ? bound(ctx) : bound);
}

/**
 * Bounds a time field in a signal form: what Angular's `min()` and `max()` do for a number,
 * for a `PctTimeOfDay` — which they cannot take, and which the compiler refuses as an
 * attribute beside `[formField]` (`NG8022`). The bounds reach the field's `min` / `max`, so
 * the panel's walk stops at them, and the form grades the value: a time outside is
 * `minTime` or `maxTime`, and a time in the gap of a window across midnight — `min` later
 * than `max`, `22:00` to `06:00` — is both, as the native element reads it (0086, A12).
 *
 * Each bound is a time or a function of the field's context, so one field can be bounded by
 * another's value; one that is not a time is no bound. A bound equal to the value is inside,
 * in either shape. An empty field is not graded — that is `required()`'s to say — and neither
 * is the step: `pctTimeOnStep` is the predicate for a validator of its own.
 *
 * **One rule's two bounds are one pair, and a pair whose `min` is later than its `max` is a
 * window.** So a bound read off another field goes in a rule of its own beside a fixed one:
 * `{ min: valueOf(p.opensAt), max: '22:00' }` reads as the night the moment the opening time
 * passes 22:00, and grades 18:00 inside it. Several rules on one path are each graded on their
 * own pair, and the field walks the shortest stretch of the clock that holds every time all of
 * them accept — exactly those times where they are one run; where they are several, the panel
 * also offers the gaps between them but the widest; where there are none, it has no bounds.
 *
 * @example
 * const f = form(model, (p) => {
 *   pctTimeBounds(p.opensAt, { min: '09:00', max: '17:00', message: 'Office hours only' });
 *   pctTimeBounds(p.closesAt, { min: ({ valueOf }) => valueOf(p.opensAt) ?? undefined });
 *   pctTimeBounds(p.closesAt, { max: '22:00' }); // a rule of its own, so the pair is no window
 *   pctTimeBounds(p.shift, { min: '22:00', max: '06:00' }); // the night, across midnight
 * });
 *
 * @since next
 */
export function pctTimeBounds<
  TValue extends PctTimeOfDay | null,
  TPathKind extends PathKind = PathKind.Root,
>(
  path: SchemaPath<TValue, SchemaPathRules.Supported, TPathKind>,
  config: PctTimeBoundsConfig<TValue, TPathKind>,
): void {
  const min = timeBound(config.min);
  const max = timeBound(config.max);
  metadata(path, TIME_PAIRS, (ctx) => ({ min: min(ctx), max: max(ctx) }));
  metadata(
    path,
    TIME_MIN,
    ({ state }) => timeSpan(state.metadata(TIME_PAIRS)!()).min,
  );
  metadata(
    path,
    TIME_MAX,
    ({ state }) => timeSpan(state.metadata(TIME_PAIRS)!()).max,
  );
  // The keys hold a `PctTimeOfDay`, and the platform asks for a key of the path's own value
  // type, which it cannot see is the same type while `TValue` is a parameter.
  metadata(path, MIN, () => TIME_MIN as unknown as LimitKey<TValue>);
  metadata(path, MAX, () => TIME_MAX as unknown as LimitKey<TValue>);
  validate(path, (ctx) => {
    const value = ctx.value();
    if (!isPctTimeOfDay(value)) return undefined;
    const lo = min(ctx);
    const hi = max(ctx);
    const under = lo !== undefined && pctCompareTimes(value, lo) < 0;
    const over = hi !== undefined && pctCompareTimes(value, hi) > 0;
    // In a window a time is outside only in its gap: before the start AND after the end.
    const window =
      lo !== undefined && hi !== undefined && pctCompareTimes(lo, hi) > 0;
    if (window && !(under && over)) return undefined;
    const errors: PctTimeBoundError[] = [];
    if (under) errors.push({ kind: 'minTime', minTime: lo });
    if (over) errors.push({ kind: 'maxTime', maxTime: hi });
    const message = config.message;
    return message === undefined
      ? errors
      : errors.map((error) => ({
          ...error,
          message: typeof message === 'function' ? message(error) : message,
        }));
  });
}
