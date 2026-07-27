import {
  booleanAttribute,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  viewChild,
} from '@angular/core';
import { nextPctId } from '@pacit/components/core';
import { PctRadioGroup } from './radio-group';

/**
 * Pojedyncza opcja w `pct-radio-group`. **Nie jest samodzielną kontrolką
 * formularza** — stan trzyma grupa (wym-api-5). Opiera się na natywnym
 * `<input type="radio">` ze wspólnym `name`, więc nawigacja strzałkami
 * i zachowanie Taba pochodzą od przeglądarki, a nie z własnej implementacji
 * roving tabindex.
 *
 * @example
 * <pct-radio value="pro">Plan Pro</pct-radio>
 */
@Component({
  selector: 'pct-radio',
  templateUrl: './radio.html',
  styleUrl: './radio.scss',
  host: {
    class: 'pct-radio',
    '[attr.data-pct-checked]': 'checked() ? "" : null',
    '[attr.data-pct-disabled]': 'isDisabled() ? "" : null',
    '[attr.data-pct-invalid]': 'group.showInvalid() ? "" : null',
  },
})
export class PctRadio<T = string> {
  protected readonly group = inject<PctRadioGroup<T>>(PctRadioGroup);

  /** Wartość reprezentowana przez tę opcję. */
  readonly value = input.required<T>();

  /** Wyłączenie pojedynczej opcji; grupa może wyłączyć wszystkie. */
  readonly disabled = input(false, { transform: booleanAttribute });

  private readonly control =
    viewChild.required<ElementRef<HTMLInputElement>>('control');

  private readonly uid = nextPctId('pct-radio');
  protected readonly controlId = `${this.uid}-control`;

  protected readonly checked = computed(() =>
    this.group.isSelected(this.value()),
  );

  /**
   * Natywny atrybut `value` opisuje opcję, ale **nie bierze udziału w wyborze**:
   * zaznaczenie ustawia `checked`, a zmianę zgłasza `onChange()`, przekazując
   * grupie wartość z inputu. Skoro wartością może być teraz obiekt, wystawiamy
   * atrybut tylko dla prymitywów — `String({})` dałoby `[object Object]`,
   * czyli napis, który niczego nie identyfikuje i mylnie wygląda na wartość.
   */
  protected readonly valueAttr = computed(() => {
    const value = this.value();
    return typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
      ? String(value)
      : null;
  });
  protected readonly isDisabled = computed(
    () => this.disabled() || this.group.disabled(),
  );
  protected readonly name = computed(() => this.group.groupName());

  /** Readonly nie istnieje natywnie dla radia — blokujemy zmianę stanu. */
  protected onClick(event: Event): void {
    if (this.group.readonly()) {
      event.preventDefault();
    }
  }

  protected onChange(): void {
    this.group.select(this.value());
  }

  protected onBlur(): void {
    this.group.markTouched();
  }

  focus(options?: FocusOptions): void {
    this.control().nativeElement.focus(options);
  }
}
