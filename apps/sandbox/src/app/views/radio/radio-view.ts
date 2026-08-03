import { Component, signal } from '@angular/core';
import { form, FormField, required } from '@angular/forms/signals';
import { PctField } from '@pacit/components/field';
import { PctRadio, PctRadioGroup } from '@pacit/components/radio';
import { SbxDemo } from '../../ui/demo';

/**
 * Grupa radiów — pierwszy komponent złożony: kontrolką formularza jest
 * kontener, opcje nie mają własnego stanu formularza (wym-api-kontener).
 */
@Component({
  selector: 'sbx-radio-view',
  imports: [SbxDemo, PctField, PctRadioGroup, PctRadio, FormField],
  templateUrl: './radio-view.html',
  styleUrl: './radio-view.scss',
})
export class RadioView {
  protected readonly model = signal({ plan: '' });

  protected readonly userForm = form(this.model, (p) => {
    required(p.plan, { message: 'Wybierz plan' });
  });

  /** Demo układu poziomego. */
  protected readonly layoutDemo = signal<string | null>('a');
}
