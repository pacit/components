import {
  booleanAttribute,
  Component,
  computed,
  inject,
  input,
  model,
  output,
} from '@angular/core';
import type { FormValueControl, ValidationError } from '@angular/forms/signals';
import { nextPctId, PCT_CONFIG, PctSize } from '@pacit/components/core';
import { PctInputType } from './input.types';

/**
 * Pole tekstowe. Natywna kontrolka signal forms — implementuje `FormValueControl`
 * (wym-api-5), więc działa z dyrektywą `Field` bez warstwy pośredniej.
 *
 * Pola z `FormUiControl` (disabled, readonly, invalid, errors, required, name)
 * są opcjonalne w kontrakcie; zadeklarowane tutaj, są automatycznie
 * synchronizowane ze stanem pola formularza.
 *
 * @example
 * <pct-input label="E-mail" [field]="form.email" />
 * <pct-input label="E-mail" [(value)]="email" />
 */
@Component({
  selector: 'pct-input',
  templateUrl: './input.html',
  styleUrl: './input.scss',
  host: {
    class: 'pct-input',
    '[attr.data-pct-size]': 'size()',
    '[attr.data-pct-invalid]': 'showInvalid() ? "" : null',
    '[attr.data-pct-disabled]': 'disabled() ? "" : null',
  },
})
export class PctInput implements FormValueControl<string> {
  private readonly config = inject(PCT_CONFIG);

  /** Wartość — jedyne wymagane pole kontraktu `FormValueControl`. */
  readonly value = model<string>('');

  // --- FormUiControl (synchronizowane przez dyrektywę Field) ---

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
  readonly placeholder = input<string>('');
  readonly type = input<PctInputType>('text');
  readonly size = input<PctSize>(this.config.defaultSize);

  // --- a11y: stabilne id do powiązań ARIA (wym-api-6) ---

  private readonly uid = nextPctId('pct-input');
  protected readonly controlId = `${this.uid}-control`;
  protected readonly hintId = `${this.uid}-hint`;
  protected readonly errorId = `${this.uid}-error`;

  /** Komunikat pierwszego błędu walidacji. */
  protected readonly errorText = computed(() => {
    const first = this.errors()?.[0] as { message?: string } | undefined;
    return first?.message ?? '';
  });

  /**
   * Błąd pokazujemy dopiero po dotknięciu pola — inaczej pusty, nietknięty
   * formularz od razu świeci na czerwono. `touched` jest synchronizowane przez
   * dyrektywę `FormField` (blur emituje `touch`).
   */
  protected readonly showInvalid = computed(
    () => this.invalid() && this.touched(),
  );

  protected readonly showError = computed(
    () => this.showInvalid() && this.errorText() !== '',
  );

  /** Powiązanie opisu i błędu z polem (aria-describedby). */
  protected readonly describedBy = computed(() => {
    const ids: string[] = [];
    if (this.hint()) ids.push(this.hintId);
    if (this.showError()) ids.push(this.errorId);
    return ids.length > 0 ? ids.join(' ') : null;
  });

  protected onInput(event: Event): void {
    this.value.set((event.target as HTMLInputElement).value);
  }

  protected onBlur(): void {
    this.touch.emit();
  }
}
