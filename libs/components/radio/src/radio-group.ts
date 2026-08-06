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
} from '@angular/core';
import type { FormValueControl, ValidationError } from '@angular/forms/signals';
import {
  nextPctId,
  PCT_FIELD,
  pctDescribedBy,
  pctFieldMessages,
  PctCompareWith,
  PctFieldAppearance,
  PctFieldControl,
  PctLabelStrategy,
  pctSameValue,
} from '@pacit/components/core';

/**
 * Grupa pól wyboru jednokrotnego. **To grupa jest kontrolką formularza**
 * (`FormValueControl`), a nie poszczególne opcje — z punktu widzenia formularza
 * radiogroup edytuje jedną wartość (req-api-signal-forms).
 *
 * Opcje (`pct-radio`) używają natywnych `<input type="radio">` ze wspólnym
 * atrybutem `name`, dzięki czemu przeglądarka sama zapewnia nawigację
 * strzałkami i poprawne zachowanie Taba (fokusowalna jest tylko wybrana opcja).
 *
 * Wartość jest dowolnego typu `T` (domyślnie napis): grupa nie czyta jej
 * z DOM-u — atrybut `value` natywnego radia jest tylko opisem, a wybór zgłasza
 * `pct-radio`, przekazując wartość, którą dostało w inpucie. Dzięki temu opcją
 * może być wariant unii albo encja, a nie tylko napis.
 *
 * @example
 * <pct-radio-group label="Plan" [formField]="form.plan">
 *   <pct-radio value="free">Darmowy</pct-radio>
 *   <pct-radio value="pro">Pro</pct-radio>
 * </pct-radio-group>
 *
 * @example
 * // `T` bierze się z wiązania; opcje muszą podać wartość tego samego typu.
 * <pct-radio-group [(value)]="wielkosc">
 *   <pct-radio [value]="'sm'">Mała</pct-radio>
 * </pct-radio-group>
 */
@Component({
  selector: 'pct-radio-group',
  templateUrl: './radio-group.html',
  styleUrl: './radio-group.scss',
  host: {
    class: 'pct-radio-group',
    role: 'radiogroup',
    '[attr.aria-labelledby]': 'labelledBy()',
    '[attr.aria-describedby]': 'describedBy()',
    '[attr.aria-invalid]': 'showInvalid() ? "true" : null',
    '[attr.aria-required]': 'required() ? "true" : null',
    // `aria-readonly` należy do GRUPY, nie do opcji: rola `radio` go nie
    // wspiera (wspiera go `radiogroup`), a atrybut niedozwolony dla roli jest
    // naruszeniem krytycznym, nie kosmetycznym (`lesson-33`).
    '[attr.aria-readonly]': 'readonly() ? "true" : null',
    '[attr.aria-orientation]': 'orientation()',
    '[attr.data-pct-orientation]': 'orientation()',
    '[attr.data-pct-invalid]': 'showInvalid() ? "" : null',
    '[attr.data-pct-disabled]': 'disabled() ? "" : null',
    '[attr.data-pct-in-field]': 'inField ? "" : null',
  },
})
export class PctRadioGroup<T = string>
  implements FormValueControl<T | null>, PctFieldControl
{
  /**
   * Wybrana wartość — wymagane pole kontraktu `FormValueControl`. `null` znaczy
   * „żadna opcja nie jest zaznaczona": to stan, w którym grupa się rodzi i do
   * którego wraca reset.
   */
  readonly value = model<T | null>(null);

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

  /** Równość wartości — jak w `pct-select`; encje porównuje się po kluczu. */
  readonly compareWith = input<PctCompareWith<T>>(pctSameValue);

  /** Wartość „brak wyboru", ustawiana przy resecie formularza. */
  readonly emptyValue = input<T | null>(null);

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

  // --- współpraca z obudową (req-api-no-wrapper) ---

  private readonly fieldApi = inject(PCT_FIELD, { optional: true });
  protected readonly inField = this.fieldApi !== null;

  /** Grupy nazywa się przez `aria-labelledby`, nie `<label for>`. */
  readonly controlId = this.uid;
  readonly labelStrategy: PctLabelStrategy = 'labelledby';
  readonly fieldAppearance: PctFieldAppearance = 'bare';

  private readonly fieldDescribedBy = signal<string | null>(null);
  private readonly fieldLabelledBy = signal<string | null>(null);

  setDescribedBy(ids: string | null): void {
    this.fieldDescribedBy.set(ids);
  }

  setLabelledBy(id: string | null): void {
    this.fieldLabelledBy.set(id);
  }

  /** Nazwa grupy: etykieta obudowy albo własna. */
  protected readonly labelledBy = computed(() =>
    this.inField ? this.fieldLabelledBy() : this.label() ? this.labelId : null,
  );

  private readonly messages = pctFieldMessages({
    invalid: this.invalid,
    touched: this.touched,
    errors: this.errors,
  });
  protected readonly errorText = this.messages.errorText;
  readonly showInvalid = this.messages.showInvalid;

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

  constructor() {
    this.fieldApi?.attach(this);
  }

  /**
   * Czy dana opcja jest wybrana (używane przez `pct-radio`). Brak wyboru
   * odsiewamy przed porównaniem — komparator aplikacji dostaje wyłącznie
   * wartości, dla których został napisany.
   */
  isSelected(optionValue: T): boolean {
    const current = this.value();
    if (current === null || current === undefined) return false;
    return this.compareWith()(current, optionValue);
  }

  /** Wybór opcji; ignorowany w trybie readonly. */
  select(optionValue: T): void {
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
    this.value.set(this.emptyValue());
  }
}
