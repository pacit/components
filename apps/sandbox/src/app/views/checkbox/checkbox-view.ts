import { Component, signal } from '@angular/core';
import { form, FormField, required } from '@angular/forms/signals';
import { PctCheckbox } from '@pacit/components/checkbox';
import { PctField } from '@pacit/components/field';
import { SbxDemo } from '../../ui/demo';

/**
 * Checkbox: a native signal-forms control (`FormCheckboxControl`) with the
 * indeterminate state and a touch area independent of the visual size.
 */
@Component({
  selector: 'sbx-checkbox-view',
  imports: [SbxDemo, PctCheckbox, PctField, FormField],
  templateUrl: './checkbox-view.html',
  styleUrl: './checkbox-view.scss',
})
export class CheckboxView {
  protected readonly model = signal({ terms: false });

  protected readonly userForm = form(this.model, (p) => {
    required(p.terms, { message: 'You have to accept the terms' });
  });

  /** The indeterminate state — the native property, which the accessible tree reads as `mixed`. */
  protected readonly partial = signal(true);
}
