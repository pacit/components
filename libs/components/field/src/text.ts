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
import type { FormValueControl, ValidationError } from '@angular/forms/signals';
import {
  nextPctId,
  PCT_FIELD,
  PctFieldControl,
  PctLabelStrategy,
} from '@pacit/components/core';

/**
 * Pole tekstowe: dyrektywa na **natywnym** `<input>`. Nie owijamy inputu we
 * własny komponent, więc zachowujemy `type`, autouzupełnianie przeglądarki,
 * tryby klawiatury mobilnej i całą semantykę bez własnej abstrakcji
 * (`wym-api-11`).
 *
 * Kontraktem formularza jest ta dyrektywa (`FormValueControl<string>`), a
 * etykietę, podpowiedź i błąd rysuje `pct-field` (`wym-api-13`).
 *
 * @example
 * <pct-field label="E-mail">
 *   <input pctText type="email" [formField]="f.email" />
 * </pct-field>
 */
@Component({
  selector: 'input[pctText], textarea[pctText]',
  // Komponent (nie dyrektywa) na natywnym elemencie — jak `button[pct-button]`.
  // Dyrektywa nie może mieć styli, a nie chcemy opierać API na `::ng-deep`.
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

  /** Wartość — wymagane pole kontraktu `FormValueControl`. */
  readonly value = model<string>('');

  // --- FormUiControl (synchronizowane przez dyrektywę FormField) ---

  readonly disabled = input(false, { transform: booleanAttribute });
  readonly readonly = input(false, { transform: booleanAttribute });
  readonly invalid = input(false, { transform: booleanAttribute });
  readonly touched = input(false, { transform: booleanAttribute });
  readonly required = input(false, { transform: booleanAttribute });
  readonly errors = input<readonly ValidationError.WithOptionalFieldTree[]>([]);
  readonly name = input<string>('');

  readonly touch = output<void>();

  // --- kontrakt PctFieldControl ---

  readonly controlId = nextPctId('pct-text');
  readonly labelStrategy: PctLabelStrategy = 'for';

  /** Ustawiane przez obudowę; wystawiane na natywnym elemencie. */
  protected readonly describedBy = signal<string | null>(null);

  protected readonly showInvalid = computed(
    () => this.invalid() && this.touched(),
  );

  /**
   * Klasyczne formularze (`[formControl]`, `formControlName`, `[(ngModel)]`) na
   * natywnym `<input>` są obsługiwane przez wbudowany `DefaultValueAccessor`
   * Angulara — to on pisze do DOM. Gdybyśmy pisali równolegle, powstałby
   * konflikt dwóch autorów wartości (`wym-real-20`). Wykrywamy więc, czy
   * klasyczna dyrektywa formularza jest na tym samym elemencie, i wtedy
   * oddajemy jej własność wartości, pozostając przy obudowie i stanie.
   */
  private readonly classicForms = inject(NgControl, {
    optional: true,
    self: true,
  });

  constructor() {
    // Obecność obudowy jest opcjonalna: bez niej kontrolka działa samodzielnie
    // (bez etykiety i komunikatów), co jest przydatne np. w komórce tabeli.
    this.field?.attach(this);

    // Sygnał -> DOM tylko wtedy, gdy nie prowadzą klasyczne formularze.
    effect(() => {
      const next = this.value();
      if (this.classicForms) return;
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

  /** Wywoływane przez signal forms (np. `focusBoundControl()`). */
  focus(options?: FocusOptions): void {
    this.el.nativeElement.focus(options);
  }

  reset(): void {
    this.value.set('');
  }
}
