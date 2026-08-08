import {
  booleanAttribute,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  model,
  output,
  signal,
} from '@angular/core';
import { NgControl } from '@angular/forms';
import { FormField } from '@angular/forms/signals';
import type { FormValueControl, ValidationError } from '@angular/forms/signals';
import {
  nextPctId,
  PCT_FIELD,
  PctFieldControl,
  PctFieldCursor,
  PctLabelStrategy,
} from '@pacit/components/core';

/**
 * Text field: a directive on a **native** `<input>`. The input is not wrapped in a component
 * of ours, so `type`, browser autofill, mobile keyboard modes and the whole semantics are kept
 * without an abstraction in between (`req-api-platform`).
 *
 * This directive is the form contract (`FormValueControl<string>`), while the label, the hint
 * and the error are drawn by `pct-field` (`req-api-wrapper`).
 *
 * @example
 * <pct-field label="E-mail">
 *   <input pctText type="email" [formField]="f.email" />
 * </pct-field>
 */
@Component({
  selector: 'input[pctText], textarea[pctText]',
  // A component (not a directive) on a native element — as with `button[pctButton]`.
  // A directive cannot carry styles, and the API is not to stand on `::ng-deep`.
  template: '',
  styleUrl: './text.scss',
  host: {
    class: 'pct-text',
    '[id]': 'controlId',
    '[disabled]': 'disabled()',
    '[readOnly]': 'readonly()',
    '[attr.name]': 'name() || null',
    '[attr.required]': 'required() || null',
    '[attr.aria-invalid]': 'showInvalid() ? "true" : null',
    '[attr.aria-describedby]': 'describedBy()',
    '(input)': 'onInput($event)',
    '(blur)': 'onBlur()',
  },
})
export class PctText implements FormValueControl<string>, PctFieldControl {
  private readonly el = inject<ElementRef<HTMLInputElement>>(ElementRef);
  private readonly field = inject(PCT_FIELD, { optional: true });

  /** The value — a required field of the `FormValueControl` contract. */
  readonly value = model<string>('');

  // --- FormUiControl (kept in sync by the FormField directive) ---

  readonly disabled = input(false, { transform: booleanAttribute });
  readonly readonly = input(false, { transform: booleanAttribute });
  readonly invalid = input(false, { transform: booleanAttribute });
  readonly touched = input(false, { transform: booleanAttribute });
  readonly required = input(false, { transform: booleanAttribute });
  readonly errors = input<readonly ValidationError.WithOptionalFieldTree[]>([]);
  readonly name = input<string>('');

  readonly touch = output<void>();

  // --- the PctFieldControl contract ---

  readonly controlId = nextPctId('pct-text');
  readonly labelStrategy: PctLabelStrategy = 'for';
  readonly fieldCursor: PctFieldCursor = 'text';

  /** Set by the chrome; exposed on the native element. */
  protected readonly describedBy = signal<string | null>(null);

  protected readonly showInvalid = computed(
    () => this.invalid() && this.touched(),
  );

  /**
   * Classic forms (`[formControl]`, `formControlName`, `[(ngModel)]`) on a native `<input>` are
   * handled by Angular's built-in `DefaultValueAccessor` — it is what writes to the DOM.
   * Writing in parallel would create a conflict between two authors of the value
   * (`lesson-20`). So the presence of a classic form directive on the same element is detected,
   * and ownership of the value is then handed over to it, while the chrome and the state stay
   * here.
   *
   * The presence of `NgControl` alone is not enough: the `FormField` directive provides it
   * **too** (interop for legacy `ControlValueAccessor`s), and with a control of its own signal
   * forms set `value` only and never write to the DOM — handing them ownership left the field
   * empty (`lesson-26`).
   */
  private readonly classicForms = inject(NgControl, {
    optional: true,
    self: true,
  });
  private readonly signalForms = inject(FormField, {
    optional: true,
    self: true,
  });
  private readonly domOwnedElsewhere =
    this.classicForms !== null && this.signalForms === null;

  constructor() {
    // The chrome is optional: without it the control works standalone (no label, no
    // messages), which is useful in a table cell, for instance.
    this.field?.attach(this);

    // Signal -> DOM only while classic forms are not in charge.
    effect(() => {
      const next = this.value();
      if (this.domOwnedElsewhere) return;
      const el = this.el.nativeElement;
      if (el.value !== next) el.value = next;
    });
  }

  setDescribedBy(ids: string | null): void {
    this.describedBy.set(ids);
  }

  protected onInput(event: Event): void {
    this.value.set((event.target as HTMLInputElement).value);
  }

  protected onBlur(): void {
    this.touch.emit();
  }

  /** Called by signal forms (`focusBoundControl()`, for instance). */
  focus(options?: FocusOptions): void {
    this.el.nativeElement.focus(options);
  }

  reset(): void {
    this.value.set('');
  }
}
