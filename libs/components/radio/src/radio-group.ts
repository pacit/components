import {
  booleanAttribute,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  model,
  output,
} from '@angular/core';
import type { FormValueControl, ValidationError } from '@angular/forms/signals';
import { nextPctId } from '@pacit/components/core';

/**
 * Grupa pól wyboru jednokrotnego. **To grupa jest kontrolką formularza**
 * (`FormValueControl`), a nie poszczególne opcje — z punktu widzenia formularza
 * radiogroup edytuje jedną wartość (wym-api-5).
 *
 * Opcje (`pct-radio`) używają natywnych `<input type="radio">` ze wspólnym
 * atrybutem `name`, dzięki czemu przeglądarka sama zapewnia nawigację
 * strzałkami i poprawne zachowanie Taba (fokusowalna jest tylko wybrana opcja).
 *
 * Wartości są napisami — tak jak w natywnym DOM (`input.value`).
 *
 * @example
 * <pct-radio-group label="Plan" [formField]="form.plan">
 *   <pct-radio value="free">Darmowy</pct-radio>
 *   <pct-radio value="pro">Pro</pct-radio>
 * </pct-radio-group>
 */
@Component({
  selector: 'pct-radio-group',
  templateUrl: './radio-group.html',
  styleUrl: './radio-group.scss',
  host: {
    class: 'pct-radio-group',
    role: 'radiogroup',
    '[attr.aria-labelledby]': 'label() ? labelId : null',
    '[attr.aria-describedby]': 'describedBy()',
    '[attr.aria-invalid]': 'showInvalid() ? "true" : null',
    '[attr.aria-required]': 'required() ? "true" : null',
    '[attr.aria-orientation]': 'orientation()',
    '[attr.data-pct-orientation]': 'orientation()',
    '[attr.data-pct-invalid]': 'showInvalid() ? "" : null',
    '[attr.data-pct-disabled]': 'disabled() ? "" : null',
  },
})
export class PctRadioGroup implements FormValueControl<string> {
  /** Wybrana wartość — wymagane pole kontraktu `FormValueControl`. */
  readonly value = model<string>('');

  // --- FormUiControl (synchronizowane przez dyrektywę FormField) ---

  readonly disabled = input(false, { transform: booleanAttribute });
  readonly readonly = input(false, { transform: booleanAttribute });
  readonly invalid = input(false, { transform: booleanAttribute });
  readonly touched = input(false, { transform: booleanAttribute });
  readonly required = input(false, { transform: booleanAttribute });
  readonly errors = input<readonly ValidationError.WithOptionalFieldTree[]>([]);

  /** Wspólny atrybut `name` natywnych radiów; domyślnie generowany. */
  readonly name = input<string>('');

  readonly touch = output<void>();

  // --- API komponentu ---

  readonly label = input<string>('');
  readonly hint = input<string>('');
  readonly orientation = input<'vertical' | 'horizontal'>('vertical');

  /** Opcje są treścią rzutowaną z zewnątrz, więc odpytujemy DOM hosta —
      zapytanie `viewChildren` nie widzi szablonów komponentów potomnych,
      a `contentChildren(PctRadio)` tworzyłoby cykliczny import. */
  private readonly hostRef = inject<ElementRef<HTMLElement>>(ElementRef);

  private controls(): HTMLInputElement[] {
    return Array.from(
      this.hostRef.nativeElement.querySelectorAll<HTMLInputElement>(
        'input[type="radio"]',
      ),
    );
  }

  // --- a11y ---

  private readonly uid = nextPctId('pct-radio-group');
  protected readonly labelId = `${this.uid}-label`;
  protected readonly hintId = `${this.uid}-hint`;
  protected readonly errorId = `${this.uid}-error`;

  /** Nazwa grupująca natywne radia — bez niej przeglądarka nie zrobi grupy. */
  readonly groupName = computed(() => this.name() || this.uid);

  protected readonly errorText = computed(() => {
    const first = this.errors()?.[0] as { message?: string } | undefined;
    return first?.message ?? '';
  });

  /** Błąd dopiero po dotknięciu grupy — spójnie z pozostałymi kontrolkami. */
  readonly showInvalid = computed(() => this.invalid() && this.touched());

  protected readonly showError = computed(
    () => this.showInvalid() && this.errorText() !== '',
  );

  protected readonly describedBy = computed(() => {
    const ids: string[] = [];
    if (this.hint()) ids.push(this.hintId);
    if (this.showError()) ids.push(this.errorId);
    return ids.length > 0 ? ids.join(' ') : null;
  });

  /** Czy dana opcja jest wybrana (używane przez `pct-radio`). */
  isSelected(optionValue: string): boolean {
    return this.value() === optionValue;
  }

  /** Wybór opcji; ignorowany w trybie readonly. */
  select(optionValue: string): void {
    if (this.readonly()) return;
    this.value.set(optionValue);
  }

  markTouched(): void {
    this.touch.emit();
  }

  /** Wywoływane przez signal forms — fokusuje wybraną lub pierwszą opcję. */
  focus(options?: FocusOptions): void {
    const controls = this.controls();
    const target = controls.find((c) => c.checked) ?? controls[0];
    target?.focus(options);
  }

  /** Wywoływane przez signal forms przy resecie formularza. */
  reset(): void {
    this.value.set('');
  }
}
