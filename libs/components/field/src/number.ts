import {
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
} from '@angular/core';
import { NgControl } from '@angular/forms';
import { FormField } from '@angular/forms/signals';
import type { FormValueControl, ValidationError } from '@angular/forms/signals';
import {
  nextPctId,
  PCT_FIELD,
  PCT_TEXTS,
  pctAttachToField,
  PctFieldControl,
  PctFieldCursor,
  PctLabelStrategy,
  PctValidationError,
} from '@pacit/components/core';

/**
 * Bounds are sometimes absent ("no limit"), and the `FormUiControl` contract requires
 * `undefined` for them — `numberAttribute` (which gives `NaN`) is not enough.
 */
function optionalNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * What a formatted number carries besides its digits and separators. `\s` already covers the
 * spaces locales group with — U+00A0 in `pl-PL`, U+202F in `fr-FR` — and covers no bidi mark
 * at all, which is the half that matters: `Intl` writes U+200E in front of the minus in
 * `he-IL`, so a parser blind to it reads the text this very control just formatted as junk.
 */
const BLANK = /[\s\u200e\u200f\u061c\u2066-\u2069]/g;

/**
 * Number field: a component on a native `<input type="text">` with the `spinbutton` role, a
 * value of type `number | null` and locale-aware formatting.
 *
 * **Why not `<input type="number">`** — despite the rule "do not write what the platform gives
 * you" (`req-api-platform`), the native number field does not do for business forms: it does
 * not know the local decimal separator (a comma in Polish), cannot group thousands, and on
 * invalid content returns an empty `value`, so "empty" cannot be told from "junk" and the user
 * cannot be shown what they typed. On top of that the mouse wheel changes the value by
 * accident. Hence a text field with parsing of its own and the `spinbutton` role
 * (`req-api-number`).
 *
 * The field is **integer** by default — `maxFractionDigits` turns fractions on. The empty
 * value is `null`, not `0` and not `NaN`.
 *
 * @example
 * // The bounds come from the min()/max() validators of the form schema.
 * <pct-field label="Number of seats">
 *   <input pctNumber [formField]="f.seats" />
 * </pct-field>
 *
 * @example
 * <pct-field label="Price">
 *   <span pctPrefix>PLN</span>
 *   <input pctNumber [minFractionDigits]="2" [maxFractionDigits]="2" [(value)]="price" />
 * </pct-field>
 *
 * @since 0.1.0
 */
@Component({
  selector: 'input[pctNumber]',
  // A component (not a directive) on a native element — as with `input[pctText]`.
  template: '',
  styleUrl: './text.scss',
  host: {
    class: 'pct-text pct-number',
    type: 'text',
    role: 'spinbutton',
    '[attr.autocomplete]': 'autocomplete()',
    '[id]': 'controlId',
    '[attr.inputmode]': 'inputMode()',
    '[disabled]': 'disabled()',
    '[readOnly]': 'readonly()',
    '[attr.name]': 'name() || null',
    '[attr.required]': 'required() || null',
    '[attr.aria-invalid]': 'showInvalid() ? "true" : null',
    '[attr.aria-describedby]': 'describedBy()',
    '[attr.aria-valuenow]': 'value()',
    '[attr.aria-valuetext]': 'valueText()',
    '[attr.aria-valuemin]': 'min()',
    '[attr.aria-valuemax]': 'max()',
    '(input)': 'onInput()',
    '(blur)': 'onBlur()',
    '(keydown)': 'onKeydown($event)',
  },
})
export class PctNumber
  implements FormValueControl<number | null>, PctFieldControl
{
  private readonly el = inject<ElementRef<HTMLInputElement>>(ElementRef);
  private readonly field = inject(PCT_FIELD, { optional: true });
  protected readonly texts = inject(PCT_TEXTS);

  /**
   * The value — `null` means the field is empty.
   *
   * @since 0.1.0
   */
  readonly value = model<number | null>(null);

  // --- FormUiControl (kept in sync by the FormField directive) ---

  /**
   * Blocks the control and greys it — the native `disabled`, so it leaves the tab order as well. With `[formField]` the directive writes it, as it writes every input of the `FormUiControl` contract.
   *
   * @since 0.1.0
   */
  readonly disabled = input(false, { transform: booleanAttribute });

  /**
   * Keeps the value from being edited while the field stays focusable and readable — the native `readonly`.
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
   * The native `required`; a `pct-field` around the control reads it to mark the label.
   *
   * @since 0.1.0
   */
  readonly required = input(false, { transform: booleanAttribute });

  /**
   * The form's validation errors; a `pct-field` around the control shows the first one's `message` in place of the hint once the field is touched.
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
   * The field's purpose for a browser's autofill, `off` by default — the value the control
   * wrote by itself until it took this input.
   *
   * **Why the default is `off` and why it is nevertheless an input.** This is not an
   * `<input type="number">` but a text field with a parser of its own
   * (`req-api-number`), and a browser filling it with a formatted string — a card number
   * with spaces, a phone number with dashes — hands the parser something it will refuse.
   * So the control refuses autofill unless asked. But WCAG 2.2 **1.3.5 Identify Input
   * Purpose** asks that a field collecting information ABOUT THE USER declares which one,
   * and three of the list's entries are numbers a person types here: `bday-day`,
   * `bday-month`, `bday-year`. With `autocomplete` nailed shut those three could not be
   * declared on this control at all, which is what the conformance report said out loud.
   *
   * The type is the platform's own `AutoFill`, so a misspelt purpose is a compile error
   * rather than an attribute a browser ignores.
   *
   * @example
   * <pct-field label="Year of birth">
   *   <input pctNumber autocomplete="bday-year" [(value)]="year" />
   * </pct-field>
   *
   * @since 0.1.0
   */
  readonly autocomplete = input<AutoFill>('off');

  /**
   * Emitted on blur — lets the form mark the field as touched.
   *
   * @since 0.1.0
   */
  readonly touch = output<void>();

  // --- component API ---

  /**
   * Value bounds. They belong to the `FormUiControl` contract, so with `[formField]` **the
   * directive fills them itself** from the schema's `min()` / `max()` validators — there is no
   * need to repeat them in the template. The value is clamped to them on commit.
   *
   * @since 0.1.0
   */
  readonly min = input(undefined, { transform: optionalNumber });

  /**
   * The upper bound — as `min`: filled by the directive from the schema's `max()`, and the value is clamped to it on commit.
   *
   * @since 0.1.0
   */
  readonly max = input(undefined, { transform: optionalNumber });

  /**
   * The up/down arrow step; PageUp/PageDown jumps ten times as far.
   *
   * @since 0.1.0
   */
  readonly step = input(1, { transform: numberAttribute });

  /**
   * Minimum number of decimal places written (`2` for amounts, say: "12.50").
   *
   * @since 0.1.0
   */
  readonly minFractionDigits = input(0, { transform: numberAttribute });

  /**
   * Maximum number of decimal places; `0` (the default) = an integer.
   *
   * @since 0.1.0
   */
  readonly maxFractionDigits = input(0, { transform: numberAttribute });

  /**
   * Locale-aware thousands grouping ("1 234 567").
   *
   * @since 0.1.0
   */
  readonly useGrouping = input(true, { transform: booleanAttribute });

  /**
   * Overrides the application's `LOCALE_ID` for this field.
   *
   * @since 0.1.0
   */
  readonly locale = input<string>('');

  private readonly appLocale = inject(LOCALE_ID);
  private readonly activeLocale = computed(
    () => this.locale() || this.appLocale,
  );

  // --- the PctFieldControl contract ---

  readonly controlId = nextPctId('pct-number');
  readonly labelStrategy: PctLabelStrategy = 'for';
  readonly fieldCursor: PctFieldCursor = 'text';

  protected readonly describedBy = signal<string | null>(null);

  // --- the state the form cannot see ---

  /**
   * There is text in the field and it is not a number. Kept where the user left it and said
   * so, through the contract's second channel (0070) — the field used to clear it on blur,
   * which is `<input type="number">`'s own failing committed one floor up (`req-api-number`).
   */
  private readonly rejected = signal<string | null>(null);
  readonly ownErrors = computed<readonly PctValidationError[]>(() =>
    this.rejected() !== null && !this.disabled()
      ? [{ message: this.texts().numberMalformed }]
      : [],
  );

  protected readonly showInvalid = computed(
    () => (this.invalid() && this.touched()) || this.ownErrors().length > 0,
  );

  /** With no fractions the mobile keyboard can be purely numeric. */
  protected readonly inputMode = computed(() =>
    this.maxFractionDigits() > 0 ? 'decimal' : 'numeric',
  );

  // --- formatting and parsing ---

  private readonly fractionDigits = computed(() => {
    const min = Math.max(0, this.minFractionDigits());
    return { min, max: Math.max(min, this.maxFractionDigits()) };
  });

  private readonly formatter = computed(() => {
    const { min, max } = this.fractionDigits();
    return new Intl.NumberFormat(this.activeLocale(), {
      minimumFractionDigits: min,
      maximumFractionDigits: max,
      useGrouping: this.useGrouping(),
    });
  });

  /** The separators of the current locale — read from `Intl`, not guessed. */
  private readonly separators = computed(() => {
    const parts = new Intl.NumberFormat(this.activeLocale(), {
      useGrouping: true,
      maximumFractionDigits: 2,
    }).formatToParts(1234567.5);
    return {
      decimal: parts.find((p) => p.type === 'decimal')?.value ?? '.',
      group: parts.find((p) => p.type === 'group')?.value ?? '',
    };
  });

  /**
   * The ten digits of the locale's own numbering system, mapped back to ASCII — `null` where
   * they already are ASCII, which is most of the world and the whole of the fast path.
   *
   * `Intl` formats `ar-EG` and `fa-IR` in Arabic-Indic digits (`٠١٢`), and a parser that
   * knows only `\d` refuses the text this control wrote into its own input: the value
   * formats, the user blurs, and the field reports its own output as not a number.
   */
  private readonly digits = computed(() => {
    const format = new Intl.NumberFormat(this.activeLocale(), {
      useGrouping: false,
    });
    const local = Array.from({ length: 10 }, (_, d) => format.format(d));
    if (local.every((digit, d) => digit === String(d))) return null;
    return new Map(local.map((digit, d) => [digit, String(d)]));
  });

  /** The text a screen reader announces — formatted, not the raw number. */
  protected readonly valueText = computed(() => {
    const v = this.value();
    return v === null ? null : this.formatter().format(v);
  });

  /**
   * While the user is typing the field's content is not rewritten — otherwise the caret would
   * jump to the end on every character. The write to the DOM happens only on commit (blur,
   * arrows, a value change from outside).
   */
  private readonly typing = signal(false);

  /**
   * `FormField` provides `NgControl` as well (interop for legacy `ControlValueAccessor`s), so
   * its presence alone does not yet mean classic forms (`lesson-26`).
   */
  private readonly classicForms = inject(NgControl, {
    optional: true,
    self: true,
  });
  private readonly signalForms = inject(FormField, {
    optional: true,
    self: true,
  });

  constructor() {
    pctAttachToField(this.field, this);

    // What the field shows: the value formatted, or — while there is none — the text the
    // user left behind that is not a number. A value arriving from outside takes the
    // report back, which is the one thing a commit cannot see (the date field's reading).
    effect(() => {
      const v = this.value();
      if (this.typing()) return;
      const el = this.el.nativeElement;
      if (v === null) {
        const junk = untracked(() => this.rejected()) ?? '';
        if (el.value !== junk) el.value = junk;
        return;
      }
      untracked(() => this.rejected.set(null));
      const text = this.formatter().format(v);
      if (el.value !== text) el.value = text;
    });

    if (isDevMode()) this.warnOnUnsupportedUsage();
  }

  /** @since 0.1.0 */
  setDescribedBy(ids: string | null): void {
    this.describedBy.set(ids);
  }

  /**
   * Parses text per locale. It accepts more widely than it formats: the digits of the
   * locale's numbering system and ASCII alike, the grouping separator removed only where it
   * actually separates thousands, and the decimal separator accepted is the local one plus
   * both the comma and the dot — a numeric keypad gives a dot whatever the region.
   *
   * **The dot cannot mean both things in a locale that groups with it.** In `de-DE` or
   * `tr-TR` a typed `0.123` is read as the grouped 123, not as nought point one two three:
   * three digits and then the end is exactly the shape `Intl` writes a thousand in, and
   * grouping has to win the tie — losing it would mean this control could not read back the
   * text it had just written into its own input, which is the one law it cannot break.
   *
   * The three widenings past `pl`/`en` were measured, not thought up. The sweep in
   * `number.property.spec.ts` runs `parse(format(n)) === n` over 22 locales, and disabling
   * one of them alone turns 2, 3 and 3 of its six sweeps red — the bidi marks `Intl` writes in
   * `he-IL`, `ar-EG` and `fa-IR`; the Arabic-Indic and Devanagari digits of four locales,
   * without which this control cannot read back the `٠` it wrote itself; and the Indian
   * grouping of `hi-IN`, `bn-IN` and `ne-NP` (`req-api-number`).
   */
  private parse(text: string): number | null {
    const raw = text.trim();
    if (raw === '') return null;

    const { decimal, group } = this.separators();
    let s = raw.replace(BLANK, '');

    const digits = this.digits();
    if (digits !== null)
      s = Array.from(s)
        .map((character) => digits.get(character) ?? character)
        .join('');

    if (group.trim() !== '') {
      const g = escapeRegExp(group);
      // Where a separator really stands between thousands: three digits and then no digit,
      // or — the Indian grouping of `hi-IN`, `1,23,456` — two digits and a second separator.
      // Anything else stays where it is, so a German `1.23` remains one and twenty-three
      // hundredths instead of becoming a hundred and twenty-three.
      s = s.replace(new RegExp(`${g}(?=\\d{3}(\\D|$)|\\d{2}${g})`, 'g'), '');
    }
    s = s.split(decimal).join('.').replace(/,/g, '.');
    // The typographic minus appears in values formatted by Intl.
    s = s.replace(/[\u2212\u2013]/g, '-');

    if (!/^-?\d*\.?\d*$/.test(s) || !/\d/.test(s)) return null;
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  }

  /** Rounds to the allowed number of places and clamps to `min`/`max`. */
  private normalize(n: number): number {
    const { max } = this.fractionDigits();
    let v = Number(n.toFixed(Math.min(max, 20)));
    const lo = this.min();
    const hi = this.max();
    if (lo !== undefined && v < lo) v = lo;
    if (hi !== undefined && v > hi) v = hi;
    return v;
  }

  /** Commits the value and lets the effect rewrite the formatted text. */
  private commit(n: number | null): void {
    this.typing.set(false);
    this.value.set(n === null ? null : this.normalize(n));
  }

  protected onInput(): void {
    this.typing.set(true);
    const text = this.el.nativeElement.value;
    // The report is taken back on the first keystroke and put back, if at all, on commit.
    this.rejected.set(null);
    if (text.trim() === '') {
      this.value.set(null);
      return;
    }
    const parsed = this.parse(text);
    // A transitional state ("-", "12,") does not clear the value — the text stays and the
    // matter is settled on commit.
    if (parsed !== null) this.value.set(parsed);
  }

  protected onBlur(): void {
    // The commit reads the text, not the signal: it rejects junk, rounds and clamps. Junk is
    // rejected and KEPT — the value is empty and the text is not, and the sentence saying
    // so is this control's own (0070).
    const text = this.el.nativeElement.value;
    const parsed = this.parse(text);
    this.rejected.set(text.trim() !== '' && parsed === null ? text : null);
    this.commit(parsed);
    this.touch.emit();
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (this.disabled() || this.readonly()) return;

    switch (event.key) {
      case 'ArrowUp':
        return this.stepBy(this.step(), event);
      case 'ArrowDown':
        return this.stepBy(-this.step(), event);
      case 'PageUp':
        return this.stepBy(this.step() * 10, event);
      case 'PageDown':
        return this.stepBy(this.step() * -10, event);
      case 'Home': {
        const lo = this.min();
        if (lo === undefined) return;
        event.preventDefault();
        return this.commit(lo);
      }
      case 'End': {
        const hi = this.max();
        if (hi === undefined) return;
        event.preventDefault();
        return this.commit(hi);
      }
      default:
        return;
    }
  }

  private stepBy(delta: number, event: KeyboardEvent): void {
    event.preventDefault();
    // The starting point depends on who wrote to the field last:
    //   - the user is typing -> the text, because what was typed is not committed,
    //   - otherwise -> the signal, because the text in the DOM can be one detection pass
    //     behind: an effect writes it, and that runs asynchronously. Reading the text then
    //     loses a step when an arrow repeats quickly — two presses before a refresh saw the
    //     same starting value, and the second had no effect (`lesson-32`).
    const current =
      (this.typing()
        ? this.parse(this.el.nativeElement.value)
        : this.value()) ??
      this.min() ??
      this.max() ??
      0;
    this.commit(current + delta);
  }

  /**
   * Called by signal forms (`focusBoundControl()`, for instance).
   *
   * @since 0.1.0
   */
  focus(options?: FocusOptions): void {
    this.el.nativeElement.focus(options);
  }

  /** @since 0.1.0 */
  reset(): void {
    this.commit(null);
  }

  /**
   * Two ways of using this look correct and quietly break the formatting: classic forms (their
   * `DefaultValueAccessor` takes over writing to the DOM and writes raw strings —
   * `lesson-20`), and `type="number"`, where the browser filters the content itself and loses
   * the local separator.
   */
  private warnOnUnsupportedUsage(): void {
    if (this.classicForms && !this.signalForms) {
      console.warn(
        '[pctNumber] Classic forms ([formControl], [(ngModel)]) take over writing ' +
          'the value and break locale formatting. Use signal forms ([formField]) ' +
          'or [(value)] instead.',
      );
    }
    if (this.el.nativeElement.type !== 'text') {
      console.warn(
        `[pctNumber] Expected type="text" (the control parses numbers per locale ` +
          `itself), but got type="${this.el.nativeElement.type}".`,
      );
    }
  }
}
