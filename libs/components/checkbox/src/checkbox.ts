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
  pctAttachToField,
  pctFieldMessages,
  PctFieldAppearance,
  PctFieldControl,
  PctLabelStrategy,
} from '@pacit/components/core';
import { PctIcon } from '@pacit/components/icon';

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
  imports: [PctIcon],
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

  /** Blocks the control and greys it — the native `disabled`, so it leaves the tab order as well. With `[formField]` the directive writes it, as it writes every input of the `FormUiControl` contract. */
  readonly disabled = input(false, { transform: booleanAttribute });

  /** A native checkbox has no `readonly`, so the click is swallowed here instead; the control stays focusable, unlike under `disabled`, and `aria-readonly` says so. */
  readonly readonly = input(false, { transform: booleanAttribute });

  /** The form's verdict; shown only once `touched`, so an empty form does not open red. */
  readonly invalid = input(false, { transform: booleanAttribute });

  /** Whether the user has left the field once; with `invalid` it gates the error face. */
  readonly touched = input(false, { transform: booleanAttribute });

  /** Marks the label with the required sign; with `[formField]` it follows the schema's `required()`. */
  readonly required = input(false, { transform: booleanAttribute });

  /** The form's validation errors; the first one's `message` takes the hint's place once the field is touched. */
  readonly errors = input<readonly ValidationError.WithOptionalFieldTree[]>([]);

  /** The native `name` — what a form submission calls the value. */
  readonly name = input<string>('');

  /** Emitted on blur — lets the form mark the field as touched. */
  readonly touch = output<void>();

  // --- component API ---

  /** The visible label, rendered by the control itself when it stands outside a `pct-field`; inside one, the field's label is the name. */
  readonly label = input<string>('');

  /** A line of help under the control, outside a `pct-field`; the first error message takes its place while the field is invalid and touched. */
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

  /**
   * Indeterminate state (a partial choice in a group, say). It is the native `indeterminate`
   * PROPERTY and nothing else: the accessible tree reports it as `mixed` from the property
   * alone, and an `aria-checked` written beside it would be ignored in both directions —
   * measured in three engines and in Chromium's own tree, so none is written
   * ([0039](../../../../docs/decisions/0039-a-state-the-platform-publishes-is-not-ours-to-write.md),
   * [`lesson-112`](../../../../docs/lessons.md#lesson-112)).
   */
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
          [this.errorId, this.showError()],
          [this.hintId, !this.showError() && this.hint() !== ''],
        ]),
  );

  constructor() {
    pctAttachToField(this.fieldApi, this);
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
