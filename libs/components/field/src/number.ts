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
} from '@angular/core';
import { NgControl } from '@angular/forms';
import { FormField } from '@angular/forms/signals';
import type { FormValueControl, ValidationError } from '@angular/forms/signals';
import {
  nextPctId,
  PCT_FIELD,
  pctAttachToField,
  PctFieldControl,
  PctFieldCursor,
  PctLabelStrategy,
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
    autocomplete: 'off',
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

  /** The value — `null` means the field is empty. */
  readonly value = model<number | null>(null);

  // --- FormUiControl (kept in sync by the FormField directive) ---

  readonly disabled = input(false, { transform: booleanAttribute });
  readonly readonly = input(false, { transform: booleanAttribute });
  readonly invalid = input(false, { transform: booleanAttribute });
  readonly touched = input(false, { transform: booleanAttribute });
  readonly required = input(false, { transform: booleanAttribute });
  readonly errors = input<readonly ValidationError.WithOptionalFieldTree[]>([]);
  readonly name = input<string>('');

  readonly touch = output<void>();

  // --- component API ---

  /**
   * Value bounds. They belong to the `FormUiControl` contract, so with `[formField]` **the
   * directive fills them itself** from the schema's `min()` / `max()` validators — there is no
   * need to repeat them in the template. The value is clamped to them on commit.
   */
  readonly min = input(undefined, { transform: optionalNumber });
  readonly max = input(undefined, { transform: optionalNumber });

  /** The up/down arrow step; PageUp/PageDown jumps ten times as far. */
  readonly step = input(1, { transform: numberAttribute });

  /** Minimum number of decimal places written (`2` for amounts, say: "12.50"). */
  readonly minFractionDigits = input(0, { transform: numberAttribute });

  /** Maximum number of decimal places; `0` (the default) = an integer. */
  readonly maxFractionDigits = input(0, { transform: numberAttribute });

  /** Locale-aware thousands grouping ("1 234 567"). */
  readonly useGrouping = input(true, { transform: booleanAttribute });

  /** Overrides the application's `LOCALE_ID` for this field. */
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

  protected readonly showInvalid = computed(
    () => this.invalid() && this.touched(),
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

    effect(() => {
      const v = this.value();
      if (this.typing()) return;
      const el = this.el.nativeElement;
      const text = v === null ? '' : this.formatter().format(v);
      if (el.value !== text) el.value = text;
    });

    if (isDevMode()) this.warnOnUnsupportedUsage();
  }

  setDescribedBy(ids: string | null): void {
    this.describedBy.set(ids);
  }

  /**
   * Parses text per locale. It accepts more widely than it formats: the grouping separator is
   * removed only where it actually separates thousands, and the decimal separator accepted is
   * the local one plus both the dot and the comma — a numeric keypad gives a dot whatever the
   * region.
   */
  private parse(text: string): number | null {
    const raw = text.trim();
    if (raw === '') return null;

    const { decimal, group } = this.separators();
    // Locales group with a non-breaking space (pl-PL: U+00A0) — `\s` does not catch it.
    let s = raw.replace(/[\s\u00a0\u202f]/g, '');

    if (group.trim() !== '') {
      const g = escapeRegExp(group);
      s = s.replace(new RegExp(`${g}(?=\\d{3}(\\D|$))`, 'g'), '');
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
    // The commit reads the text, not the signal: it rejects junk, rounds and clamps.
    this.commit(this.parse(this.el.nativeElement.value));
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

  /** Called by signal forms (`focusBoundControl()`, for instance). */
  focus(options?: FocusOptions): void {
    this.el.nativeElement.focus(options);
  }

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
