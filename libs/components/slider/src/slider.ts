import {
  booleanAttribute,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  isDevMode,
  LOCALE_ID,
  model,
  numberAttribute,
  output,
  signal,
  viewChild,
} from '@angular/core';
import type { FormValueControl, ValidationError } from '@angular/forms/signals';
import {
  nextPctId,
  PCT_FIELD,
  pctAttachToField,
  pctDescribedBy,
  pctFieldMessages,
  PctFieldAppearance,
  PctFieldControl,
  PctLabelStrategy,
} from '@pacit/components/core';

/**
 * Bounds are part of the `FormUiControl` contract and that contract allows them to be
 * absent, so `numberAttribute` (which gives `NaN`) is not enough — the same reader
 * `[pctNumber]` uses.
 */
function optionalNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Which way the slider runs. An input rather than a tag — the value type is a `number` in both (0042).
 *
 * @since 0.1.0
 */
export type PctSliderOrientation = 'horizontal' | 'vertical';

/**
 * Above this many intervals the ticks stop being ticks: a mark is an element, and two
 * hundred of them two pixels apart are a grey band with a two-hundred-node price. So the
 * marks are REFUSED above the threshold rather than drawn illegibly, and a dev-mode
 * warning says which of `min`, `max` and `step` produced the number.
 */
const MARKS_LEGIBLE_MAX = 50;

/**
 * Slider. A position on a numeric continuum, drawn on the platform's own
 * `<input type="range">` — the ARIA APG's
 * [Slider](https://www.w3.org/WAI/ARIA/apg/patterns/slider/) pattern, in the variant the
 * APG's own HTML example is: the native element, which carries the role, the value, the
 * bounds and the whole keyboard without a line from us
 * ([0042](../../../../docs/decisions/0042-a-slider-is-the-platforms-range.md)).
 *
 * What the component adds is the one thing the platform cannot: a value it can **pronounce**.
 * `aria-valuenow` is a bare number; `1 234,5 €`, `20 %` or `Medium` is not, so a `format` or
 * a `labels` list turns on a visible bubble AND `aria-valuetext` — and only then. An
 * unconditional `aria-valuetext` mirroring the number would be the inert attribute of
 * [0039](../../../../docs/decisions/0039-a-state-the-platform-publishes-is-not-ours-to-write.md)
 * worn a second time ([`lesson-112`](../../../../docs/lessons.md#lesson-112)).
 *
 * Two things it deliberately does NOT have:
 *
 * - **no second thumb.** A range (min–max) forks the value to `[number, number]`, which by
 *   [0034](../../../../docs/decisions/0034-multiplicity-is-a-tag.md) is a question about the
 *   tag; and two overlaid native ranges do not compose — a press at the lower thumb moves
 *   the upper input in all three engines. `<pct-range-slider>` when a consumer asks.
 * - **no `<datalist>`.** It renders no tick in firefox and snaps in no engine, so the marks
 *   are drawn from `step` and snapping is `step` alone.
 *
 * @example
 * <pct-slider label="Volume" [(value)]="volume" [max]="11" />
 *
 * @example
 * <pct-slider
 *   label="Discount"
 *   [(value)]="discount"
 *   [max]="1"
 *   [step]="0.05"
 *   [format]="{ style: 'percent' }"
 * />
 *
 * @since 0.1.0
 */
@Component({
  selector: 'pct-slider',
  templateUrl: './slider.html',
  styleUrl: './slider.scss',
  host: {
    class: 'pct-slider',
    '[attr.data-pct-orientation]': 'orientation()',
    '[attr.data-pct-invalid]': 'showInvalid() ? "" : null',
    '[attr.data-pct-disabled]': 'disabled() ? "" : null',
    '[attr.data-pct-in-field]': 'inField ? "" : null',
    '[style.--_pct-slider-fraction]': 'fraction()',
  },
})
export class PctSlider implements FormValueControl<number>, PctFieldControl {
  /**
   * The position. A `number` and never a `T`: a slider is a place on a numeric continuum,
   * and a control with named steps is that same number with a `labels` list over it, so
   * [`req-api-generic`](../../../../docs/requirements/api.md#req-api-generic) is met by
   * NOT being generic.
   *
   * @since 0.1.0
   */
  readonly value = model(0);

  // --- FormUiControl (kept in sync by the FormField directive) ---

  /**
   * Blocks the control and greys it — the native `disabled`, so it leaves the tab order as well. With `[formField]` the directive writes it, as it writes every input of the `FormUiControl` contract.
   *
   * @since 0.1.0
   */
  readonly disabled = input(false, { transform: booleanAttribute });

  /**
   * A native range has no `readonly`, so a move is undone here instead; the thumb stays focusable, unlike under `disabled`, and `aria-readonly` says so.
   *
   * @since 0.1.0
   */
  readonly readonly = input(false, { transform: booleanAttribute });

  /**
   * The form's verdict; shown only once `touched`, so an empty form does not open red.
   *
   * @since 0.1.0
   */
  readonly invalid = input(false, { transform: booleanAttribute });

  /**
   * Whether the user has left the field once; with `invalid` it gates the error face.
   *
   * @since 0.1.0
   */
  readonly touched = input(false, { transform: booleanAttribute });

  /**
   * Marks the label with the required sign; with `[formField]` it follows the schema's `required()`.
   *
   * @since 0.1.0
   */
  readonly required = input(false, { transform: booleanAttribute });

  /**
   * The form's validation errors; the first one's `message` takes the hint's place once the field is touched.
   *
   * @since 0.1.0
   */
  readonly errors = input<readonly ValidationError.WithOptionalFieldTree[]>([]);

  /**
   * The native `name` — what a form submission calls the value.
   *
   * @since 0.1.0
   */
  readonly name = input<string>('');

  /**
   * Value bounds. They belong to the `FormUiControl` contract, so with `[formField]` **the
   * directive fills them itself** from the schema's `min()` / `max()` validators — and here
   * they are also the native `min` / `max` attributes, so one pair of numbers is both what
   * the form validates and what the platform clamps to.
   *
   * Absent, they are the platform's own defaults rather than "no limit": a slider with no
   * bounds is not a slider, and 0–100 is what `<input type="range">` means by nothing.
   *
   * @since 0.1.0
   */
  readonly min = input(undefined, { transform: optionalNumber });

  /**
   * The upper bound — as `min`: the form's and the native `max` in one; `100` when absent.
   *
   * @since 0.1.0
   */
  readonly max = input(undefined, { transform: optionalNumber });

  protected readonly lower = computed(() => this.min() ?? 0);
  protected readonly upper = computed(() => this.max() ?? 100);

  /**
   * The position as a NUMBER, whatever the model happens to hold.
   *
   * `value` is typed `number` and the classic-forms interop still writes `null` into it: a
   * `[(ngModel)]` binding sets the control up before its own value has resolved, and the
   * bridge that makes CVA unnecessary ([`lesson-9`](../../../../docs/lessons.md#lesson-9))
   * has nowhere to say so. Nothing in the compiler notices, so the reading is defensive
   * from the first version rather than after the first `NaN` reaches a stylesheet
   * ([`lesson-117`](../../../../docs/lessons.md#lesson-117)). An unusable value is read as
   * the lower bound, which is where a thumb with nothing to stand on belongs.
   */
  protected readonly position = computed(() => {
    const v = this.value() as number | null | undefined;
    return typeof v === 'number' && Number.isFinite(v) ? v : this.lower();
  });

  /**
   * The granularity — and the only snapping there is (`<datalist>` snaps in no engine).
   *
   * @since 0.1.0
   */
  readonly step = input(1, { transform: numberAttribute });

  /**
   * Emitted on blur — lets the form mark the field as touched.
   *
   * @since 0.1.0
   */
  readonly touch = output<void>();

  // --- component API ---

  /**
   * The visible label, rendered by the control itself when it stands outside a `pct-field`; inside one, the field's label is the name.
   *
   * @since 0.1.0
   */
  readonly label = input<string>('');

  /**
   * A line of help under the control, outside a `pct-field`; the first error message takes its place while the field is invalid and touched.
   *
   * @since 0.1.0
   */
  readonly hint = input<string>('');

  /**
   * The accessible name of a slider with no visible `label` — an INPUT rather than an
   * `aria-label` on the tag, for the same reason as on the switch: the role sits on the
   * `<input>` inside and an ARIA name on the roleless host is ignored.
   *
   * @since 0.1.0
   */
  readonly ariaLabel = input<string>('');

  /**
   * As `ariaLabel`, for a name that already stands somewhere on the page.
   *
   * @since 0.1.0
   */
  readonly ariaLabelledby = input<string>('');

  /**
   * How the value is SAID — `Intl.NumberFormat` options. Given, it turns on the visible
   * bubble and `aria-valuetext`; absent, the platform's bare `aria-valuenow` is the whole
   * announcement, which is what a plain 0–100 slider wants.
   *
   * @since 0.1.0
   */
  readonly format = input<Intl.NumberFormatOptions | null>(null);

  /**
   * Named steps ("Small", "Medium", "Large"), indexed from `min` by `step`. It wins over
   * `format`: a name is what the reader gets and the number underneath is the value.
   *
   * @since 0.1.0
   */
  readonly labels = input<readonly string[]>([]);

  /**
   * Ticks at every `step`. Our own drawing — `<datalist>` renders none in firefox.
   *
   * @since 0.1.0
   */
  readonly marks = input(false, { transform: booleanAttribute });

  /**
   * Which axis the slider runs along. Vertical is `writing-mode`, so no rule reads the direction.
   *
   * @since 0.1.0
   */
  readonly orientation = input<PctSliderOrientation>('horizontal');

  /**
   * Overrides the application's `LOCALE_ID` for the formatted value, as on `[pctNumber]`.
   *
   * @since 0.1.0
   */
  readonly locale = input<string>('');

  private readonly appLocale = inject(LOCALE_ID);
  private readonly activeLocale = computed(
    () => this.locale() || this.appLocale,
  );

  private readonly control =
    viewChild.required<ElementRef<HTMLInputElement>>('control');

  // --- a11y: stable ids for the ARIA relations (req-a11y-built-in) ---

  private readonly uid = nextPctId('pct-slider');
  readonly controlId = `${this.uid}-control`;
  protected readonly hintId = `${this.uid}-hint`;
  protected readonly errorId = `${this.uid}-error`;

  // --- working with the chrome (req-api-no-wrapper) ---

  private readonly fieldApi = inject(PCT_FIELD, { optional: true });
  protected readonly inField = this.fieldApi !== null;

  readonly labelStrategy: PctLabelStrategy = 'for';
  /** A field border around a slider looks foreign — the same call the switch made. */
  readonly fieldAppearance: PctFieldAppearance = 'bare';

  private readonly fieldDescribedBy = signal<string | null>(null);

  /** @since 0.1.0 */
  setDescribedBy(ids: string | null): void {
    this.fieldDescribedBy.set(ids);
  }

  private readonly messages = pctFieldMessages({
    invalid: this.invalid,
    touched: this.touched,
    errors: this.errors,
  });
  protected readonly errorText = this.messages.errorText;
  protected readonly showInvalid = this.messages.showInvalid;

  /** Inside the chrome, the chrome renders the message. */
  protected readonly showError = computed(
    () => !this.inField && this.messages.showError(),
  );

  protected readonly describedBy = computed(() =>
    this.inField
      ? this.fieldDescribedBy()
      : pctDescribedBy([
          [this.errorId, this.showError()],
          [this.hintId, !this.showError() && this.hint() !== ''],
        ]),
  );

  // --- the geometry the stylesheet runs on ---

  /**
   * Where the thumb stands, `0`–`1`. The stylesheet cannot compute it — `value`, `min` and
   * `max` are attributes, not lengths — so this is the one number the component writes for
   * the drawing, and its name is deliberately NOT a `--pct-…` one: that prefix is the
   * promise that a skin may set the value, and a position derived from `value` is not a
   * skin's to move.
   */
  protected readonly fraction = computed(() => {
    const span = this.upper() - this.lower();
    if (!Number.isFinite(span) || span <= 0) return 0;
    const f = (this.position() - this.lower()) / span;
    return Math.min(1, Math.max(0, f));
  });

  /** How many intervals the marks divide the track into. */
  protected readonly stepCount = computed(() => {
    const step = this.step();
    const span = this.upper() - this.lower();
    if (!Number.isFinite(step) || step <= 0 || span <= 0) return 0;
    return Math.round(span / step);
  });

  /**
   * Ticks are refused rather than drawn illegibly. Above the threshold they would be one
   * grey band and a span per step for nothing, so the dev-mode warning in the constructor
   * says which numbers produced it.
   */
  protected readonly showMarks = computed(() => {
    const count = this.stepCount();
    return this.marks() && count > 0 && count <= MARKS_LEGIBLE_MAX;
  });

  /** Where each tick stands along the travel, `0`–`1`. */
  protected readonly markFractions = computed(() => {
    const count = this.stepCount();
    // The template only reads this behind `showMarks()`, and the guard is here anyway: a
    // computed that can hand back `[NaN]` is one `@if` away from a `calc()` nobody can read.
    if (count <= 0) return [];
    return Array.from({ length: count + 1 }, (_, i) => i / count);
  });

  /**
   * The formatter, kept apart from the value it formats — as on `[pctNumber]`, and here for
   * a reason that control does not have: a drag changes `value` on every frame, and an
   * `Intl.NumberFormat` built inside `valueText` would be a new one sixty times a second.
   */
  private readonly formatter = computed(() => {
    const options = this.format();
    return options === null
      ? null
      : new Intl.NumberFormat(this.activeLocale(), options);
  });

  /**
   * The value said in words, or `null` when the platform's own number is the whole
   * announcement. `labels` wins over `format` — a name is more specific than a formatting.
   */
  protected readonly valueText = computed(() => {
    const named = this.labels()[this.labelIndex()];
    if (named !== undefined) return named;

    return this.formatter()?.format(this.position()) ?? null;
  });

  private readonly labelIndex = computed(() => {
    const step = this.step();
    if (!Number.isFinite(step) || step <= 0) return -1;
    return Math.round((this.position() - this.lower()) / step);
  });

  constructor() {
    pctAttachToField(this.fieldApi, this);

    if (isDevMode()) {
      let warned = false;
      // A one-shot warning rather than an effect: the numbers it reads are inputs, and a
      // sentence in the console repeated on every change would be the noise that teaches
      // people to filter the console out.
      queueMicrotask(() => {
        if (warned || !this.marks()) return;
        warned = true;
        if (this.stepCount() > MARKS_LEGIBLE_MAX) {
          console.warn(
            `[pct-slider] marks over ${MARKS_LEGIBLE_MAX} intervals would be a grey band ` +
              `rather than ticks, so none are drawn (min=${this.lower()}, max=${this.upper()}, ` +
              `step=${this.step()} gives ${this.stepCount()}). Raise "step", or leave ` +
              `"marks" off.`,
          );
        }
      });
    }
  }

  /**
   * A native range has no `readonly` attribute — and unlike `disabled` it must keep focus
   * and the Tab order, so the change is undone rather than prevented: the platform has
   * already written the element's `value` by the time `input` fires, and setting it back
   * is what the user sees.
   */
  protected onInput(event: Event): void {
    const el = event.target as HTMLInputElement;
    if (this.readonly()) {
      el.value = String(this.position());
      return;
    }
    this.value.set(el.valueAsNumber);
  }

  protected onBlur(): void {
    this.touch.emit();
  }

  /**
   * Called by signal forms (`focusBoundControl()`, for instance).
   *
   * @since 0.1.0
   */
  focus(options?: FocusOptions): void {
    this.control().nativeElement.focus(options);
  }

  /**
   * Called by signal forms when the form is reset. A slider has no empty value — the thumb
   * is always somewhere — so "reset" is the platform's own default: the midpoint.
   *
   * @since 0.1.0
   */
  reset(): void {
    this.value.set(this.lower() + (this.upper() - this.lower()) / 2);
  }
}
