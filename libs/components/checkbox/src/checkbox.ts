import {
  booleanAttribute,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  model,
  output,
  signal,
  viewChild,
} from '@angular/core';
import type {
  FormCheckboxControl,
  ValidationError,
} from '@angular/forms/signals';
import {
  nextPctId,
  PCT_FIELD,
  pctDescribedBy,
  pctFieldMessages,
  PctFieldAppearance,
  PctFieldControl,
  PctLabelStrategy,
} from '@pacit/components/core';

/**
 * Checkbox. A native signal-forms control — it implements `FormCheckboxControl`
 * (req-api-signal-forms). That contract requires `checked`, and the component **may not**
 * define a `value` property (reserved for `FormValueControl`).
 *
 * @example
 * <pct-checkbox label="I accept the terms" [formField]="form.terms" />
 * <pct-checkbox label="Remember me" [(checked)]="remember" />
 */
@Component({
  selector: 'pct-checkbox',
  templateUrl: './checkbox.html',
  styleUrl: './checkbox.scss',
  host: {
    class: 'pct-checkbox',
    '[attr.data-pct-checked]': 'checked() ? "" : null',
    '[attr.data-pct-indeterminate]': 'indeterminate() ? "" : null',
    '[attr.data-pct-invalid]': 'showInvalid() ? "" : null',
    '[attr.data-pct-disabled]': 'disabled() ? "" : null',
    '[attr.data-pct-in-field]': 'inField ? "" : null',
  },
})
export class PctCheckbox implements FormCheckboxControl, PctFieldControl {
  /** Checked state — the only required field of the `FormCheckboxControl` contract. */
  readonly checked = model(false);

  // --- FormUiControl (kept in sync by the FormField directive) ---

  readonly disabled = input(false, { transform: booleanAttribute });
  readonly readonly = input(false, { transform: booleanAttribute });
  readonly invalid = input(false, { transform: booleanAttribute });
  readonly touched = input(false, { transform: booleanAttribute });
  readonly required = input(false, { transform: booleanAttribute });
  readonly errors = input<readonly ValidationError.WithOptionalFieldTree[]>([]);
  readonly name = input<string>('');

  /** Emitted on blur — lets the form mark the field as touched. */
  readonly touch = output<void>();

  // --- component API ---

  readonly label = input<string>('');
  readonly hint = input<string>('');

  /**
   * The accessible name of a checkbox with no visible `label` — an INPUT rather than an
   * `aria-label` written on the tag, because the tag cannot carry one: the role sits on the
   * `<input>` inside, the host has no role at all, and an ARIA name on a roleless element is
   * ignored (`aria-label` is prohibited for the `generic` role)
   * ([`req-a11y-built-in`](../../../../docs/requirements/a11y.md#req-a11y-built-in)).
   *
   * Set together with a visible `label` it wins over it — the accessible-name algorithm, not
   * a choice of ours.
   */
  readonly ariaLabel = input<string>('');

  /**
   * As `ariaLabel`, for a name that already stands somewhere on the page — the header of the
   * column a checkbox in a row belongs to. It wins over `ariaLabel` and over `label`.
   */
  readonly ariaLabelledby = input<string>('');

  /** Indeterminate state (a partial choice in a group, say); ARIA: `aria-checked="mixed"`. */
  readonly indeterminate = input(false, { transform: booleanAttribute });

  private readonly control =
    viewChild.required<ElementRef<HTMLInputElement>>('control');

  // --- a11y: stable ids for the ARIA relations (req-a11y-built-in) ---

  private readonly uid = nextPctId('pct-checkbox');
  readonly controlId = `${this.uid}-control`;
  protected readonly hintId = `${this.uid}-hint`;
  protected readonly errorId = `${this.uid}-error`;

  // --- working with the chrome (req-api-no-wrapper): the checkbox works standalone (its own
  // label beside the control) or hands the chrome over to `pct-field`.

  private readonly fieldApi = inject(PCT_FIELD, { optional: true });
  protected readonly inField = this.fieldApi !== null;

  readonly labelStrategy: PctLabelStrategy = 'for';
  /** A field border around a checkbox looks foreign — the chrome does not draw one. */
  readonly fieldAppearance: PctFieldAppearance = 'bare';

  private readonly fieldDescribedBy = signal<string | null>(null);

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
          [this.hintId, this.hint() !== ''],
          [this.errorId, this.messages.showError()],
        ]),
  );

  /** `aria-checked` has to be "mixed" for the indeterminate state. */
  protected readonly ariaChecked = computed(() =>
    this.indeterminate() ? 'mixed' : this.checked() ? 'true' : 'false',
  );

  constructor() {
    this.fieldApi?.attach(this);
  }

  /**
   * A native checkbox has no `readonly` attribute, so the state change is blocked here while
   * focusability is kept (unlike `disabled`, which excludes the control from navigation).
   */
  protected onClick(event: Event): void {
    if (this.readonly()) {
      event.preventDefault();
    }
  }

  protected onChange(event: Event): void {
    if (this.readonly()) return;
    this.checked.set((event.target as HTMLInputElement).checked);
  }

  protected onBlur(): void {
    this.touch.emit();
  }

  /** Called by signal forms (`focusBoundControl()`, for instance). */
  focus(options?: FocusOptions): void {
    this.control().nativeElement.focus(options);
  }

  /** Called by signal forms when the form is reset. */
  reset(): void {
    this.checked.set(false);
  }
}
