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
 * Pole wyboru. Natywna kontrolka signal forms — implementuje `FormCheckboxControl`
 * (wym-api-signal-forms). W tym kontrakcie wymagane jest `checked`, a komponent **nie może**
 * definiować własności `value` (zarezerwowana dla `FormValueControl`).
 *
 * @example
 * <pct-checkbox label="Akceptuję regulamin" [formField]="form.terms" />
 * <pct-checkbox label="Zapamiętaj mnie" [(checked)]="remember" />
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
  /** Stan zaznaczenia — jedyne wymagane pole kontraktu `FormCheckboxControl`. */
  readonly checked = model(false);

  // --- FormUiControl (synchronizowane przez dyrektywę FormField) ---

  readonly disabled = input(false, { transform: booleanAttribute });
  readonly readonly = input(false, { transform: booleanAttribute });
  readonly invalid = input(false, { transform: booleanAttribute });
  readonly touched = input(false, { transform: booleanAttribute });
  readonly required = input(false, { transform: booleanAttribute });
  readonly errors = input<readonly ValidationError.WithOptionalFieldTree[]>([]);
  readonly name = input<string>('');

  /** Emitowane przy blur — pozwala formularzowi oznaczyć pole jako dotknięte. */
  readonly touch = output<void>();

  // --- API komponentu ---

  readonly label = input<string>('');
  readonly hint = input<string>('');

  /** Stan nieokreślony (np. częściowy wybór w grupie); ARIA: `aria-checked="mixed"`. */
  readonly indeterminate = input(false, { transform: booleanAttribute });

  private readonly control =
    viewChild.required<ElementRef<HTMLInputElement>>('control');

  // --- a11y: stabilne id do powiązań ARIA (wym-a11y-wbudowana) ---

  private readonly uid = nextPctId('pct-checkbox');
  readonly controlId = `${this.uid}-control`;
  protected readonly hintId = `${this.uid}-hint`;
  protected readonly errorId = `${this.uid}-error`;

  // --- współpraca z obudową (wym-api-bez-obudowy): checkbox działa samodzielnie
  // (własna etykieta obok kontrolki) albo oddaje obudowę `pct-field`.

  private readonly fieldApi = inject(PCT_FIELD, { optional: true });
  protected readonly inField = this.fieldApi !== null;

  readonly labelStrategy: PctLabelStrategy = 'for';
  /** Ramka pola wokół checkboxa wygląda obco — obudowa jej nie rysuje. */
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

  /** W obudowie komunikat renderuje ona. */
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

  /** `aria-checked` musi być „mixed" dla stanu nieokreślonego. */
  protected readonly ariaChecked = computed(() =>
    this.indeterminate() ? 'mixed' : this.checked() ? 'true' : 'false',
  );

  constructor() {
    this.fieldApi?.attach(this);
  }

  /**
   * Natywny checkbox nie ma atrybutu `readonly` — blokujemy więc zmianę stanu,
   * zachowując fokusowalność (inaczej niż `disabled`, które wyklucza z nawigacji).
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

  /** Wywoływane przez signal forms (np. `focusBoundControl()`). */
  focus(options?: FocusOptions): void {
    this.control().nativeElement.focus(options);
  }

  /** Wywoływane przez signal forms przy resecie formularza. */
  reset(): void {
    this.checked.set(false);
  }
}
