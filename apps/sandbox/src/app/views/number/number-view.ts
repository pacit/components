import { Component, signal } from '@angular/core';
import { form, FormField, max, min, required } from '@angular/forms/signals';
import { PctButton } from '@pacit/components/button';
import {
  PctField,
  PctNumber,
  PctPrefix,
  PctSuffix,
} from '@pacit/components/field';
import { SbxDemo } from '../../ui/demo';

/**
 * Pole liczbowe: `<input type="text">` z `role="spinbutton"` i własnym
 * parsowaniem opartym o `Intl.NumberFormat` (wym-api-liczba).
 */
@Component({
  selector: 'sbx-number-view',
  imports: [
    SbxDemo,
    PctField,
    PctNumber,
    PctPrefix,
    PctSuffix,
    PctButton,
    FormField,
  ],
  templateUrl: './number-view.html',
  styleUrl: './number-view.scss',
})
export class NumberView {
  protected readonly price = signal<number | null>(1499.9);

  protected readonly model = signal<{ seats: number | null }>({ seats: 1 });

  protected readonly userForm = form(this.model, (p) => {
    required(p.seats, { message: 'Podaj liczbę stanowisk' });
    min(p.seats, 1, { message: 'Minimum jedno stanowisko' });
    max(p.seats, 500, {
      message: 'Powyżej 500 stanowisk skontaktuj się z nami',
    });
  });

  protected clearPrice(): void {
    this.price.set(null);
  }
}
