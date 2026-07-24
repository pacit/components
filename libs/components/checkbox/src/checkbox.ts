import {
  booleanAttribute,
  Component,
  computed,
  ElementRef,
  input,
  model,
  output,
  viewChild,
} from '@angular/core';
import type {
  FormCheckboxControl,
  ValidationError,
} from '@angular/forms/signals';
import { nextPctId } from '@pacit/components/core';

/**
 * Pole wyboru. Natywna kontrolka signal forms — implementuje `FormCheckboxControl`
 * (wym-api-5). W tym kontrakcie wymagane jest `checked`, a komponent **nie może**
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
  },
})
export class PctCheckbox implements FormCheckboxControl {
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

  // --- a11y: stabilne id do powiązań ARIA (wym-api-6) ---

  private readonly uid = nextPctId('pct-checkbox');
  protected readonly controlId = `${this.uid}-control`;
  protected readonly hintId = `${this.uid}-hint`;
  protected readonly errorId = `${this.uid}-error`;

  protected readonly errorText = computed(() => {
    const first = this.errors()?.[0] as { message?: string } | undefined;
    return first?.message ?? '';
  });

  /** Błąd pokazujemy dopiero po dotknięciu pola — jak w `PctInput`. */
  protected readonly showInvalid = computed(
    () => this.invalid() && this.touched(),
  );

  protected readonly showError = computed(
    () => this.showInvalid() && this.errorText() !== '',
  );

  protected readonly describedBy = computed(() => {
    const ids: string[] = [];
    if (this.hint()) ids.push(this.hintId);
    if (this.showError()) ids.push(this.errorId);
    return ids.length > 0 ? ids.join(' ') : null;
  });

  /** `aria-checked` musi być „mixed" dla stanu nieokreślonego. */
  protected readonly ariaChecked = computed(() =>
    this.indeterminate() ? 'mixed' : this.checked() ? 'true' : 'false',
  );

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
