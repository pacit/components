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
 * A number field: `<input type="text">` with `role="spinbutton"` and parsing of our
 * own built on `Intl.NumberFormat` (req-api-number).
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
    required(p.seats, { message: 'Give the number of seats' });
    min(p.seats, 1, { message: 'At least one seat' });
    max(p.seats, 500, {
      message: 'Above 500 seats, get in touch with us',
    });
  });

  protected clearPrice(): void {
    this.price.set(null);
  }
}
