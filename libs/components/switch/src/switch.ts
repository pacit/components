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

/**
 * Switch. A setting that takes effect the moment it is moved, drawn as a track the thumb
 * travels along — the ARIA APG's
 * [Switch](https://www.w3.org/WAI/ARIA/apg/patterns/switch/) pattern, built on the same
 * native `<input type="checkbox">` as `PctCheckbox` and carrying `role="switch"` over it.
 *
 * It implements `FormCheckboxControl` (`req-api-signal-forms`), which requires `checked`
 * and **forbids** a `value` property.
 *
 * Two things it deliberately does NOT have, and both follow from the role rather than from
 * taste ([0039](../../../../docs/decisions/0039-a-state-the-platform-publishes-is-not-ours-to-write.md)):
 *
 * - **no `aria-checked`.** `role="switch"` on a native checkbox takes its checked state from
 *   the element's own checkedness — measured in three engines, and in Chromium's own
 *   accessibility tree an `aria-checked` disagreeing with it is ignored outright. An
 *   attribute nobody reads is one that can drift with nothing to notice
 *   ([`lesson-112`](../../../../docs/lessons.md#lesson-112)),
 * - **no `indeterminate`.** ARIA gives `switch` two states and no third, and no audit says
 *   so — `aria-checked="mixed"` over the role drew not one violation in any engine. The type
 *   is therefore the whole gate: the input does not exist, so nobody can ask for it.
 *
 * @example
 * <pct-switch label="Wi-Fi" [(checked)]="wifi" />
 * <pct-switch label="Notifications" [formField]="settings.notify" />
 *
 * @since 0.1.0
 */
@Component({
  selector: 'pct-switch',
  templateUrl: './switch.html',
  styleUrl: './switch.scss',
  host: {
    class: 'pct-switch',
    '[attr.data-pct-checked]': 'checked() ? "" : null',
    '[attr.data-pct-invalid]': 'showInvalid() ? "" : null',
    '[attr.data-pct-disabled]': 'disabled() ? "" : null',
    '[attr.data-pct-in-field]': 'inField ? "" : null',
  },
})
export class PctSwitch implements FormCheckboxControl, PctFieldControl {
  /**
   * On/off — the only required field of the `FormCheckboxControl` contract.
   *
   * @since 0.1.0
   */
  readonly checked = model(false);

  // --- FormUiControl (kept in sync by the FormField directive) ---

  /**
   * Blocks the control and greys it — the native `disabled`, so it leaves the tab order as well. With `[formField]` the directive writes it, as it writes every input of the `FormUiControl` contract.
   *
   * @since 0.1.0
   */
  readonly disabled = input(false, { transform: booleanAttribute });

  /**
   * The switch is a native checkbox, which has no `readonly`, so the click is swallowed here instead; the control stays focusable, unlike under `disabled`, and `aria-readonly` says so.
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
   * The accessible name of a switch with no visible `label` — an INPUT rather than an
   * `aria-label` written on the tag, for the same reason as on the checkbox: the role sits
   * on the `<input>` inside, the host has no role at all, and an ARIA name on a roleless
   * element is ignored
   * ([`req-a11y-built-in`](../../../../docs/requirements/a11y.md#req-a11y-built-in)).
   *
   * Set together with a visible `label` it wins over it — the accessible-name algorithm,
   * not a choice of ours.
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

  private readonly control =
    viewChild.required<ElementRef<HTMLInputElement>>('control');

  // --- a11y: stable ids for the ARIA relations (req-a11y-built-in) ---

  private readonly uid = nextPctId('pct-switch');
  readonly controlId = `${this.uid}-control`;
  protected readonly hintId = `${this.uid}-hint`;
  protected readonly errorId = `${this.uid}-error`;

  // --- working with the chrome (req-api-no-wrapper): the switch works standalone (its own
  // label beside the track) or hands the chrome over to `pct-field`.

  private readonly fieldApi = inject(PCT_FIELD, { optional: true });
  protected readonly inField = this.fieldApi !== null;

  readonly labelStrategy: PctLabelStrategy = 'for';
  /** A field border around a switch looks foreign — the chrome does not draw one. */
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

  constructor() {
    pctAttachToField(this.fieldApi, this);
  }

  /**
   * A native checkbox has no `readonly` attribute, so the change is blocked here while
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

  /**
   * Called by signal forms (`focusBoundControl()`, for instance).
   *
   * @since 0.1.0
   */
  focus(options?: FocusOptions): void {
    this.control().nativeElement.focus(options);
  }

  /**
   * Called by signal forms when the form is reset.
   *
   * @since 0.1.0
   */
  reset(): void {
    this.checked.set(false);
  }
}
