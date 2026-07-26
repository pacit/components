import { Component, signal } from '@angular/core';
import { form, FormField, required } from '@angular/forms/signals';
import { PctCheckbox } from '@pacit/components/checkbox';
import { PctField } from '@pacit/components/field';
import { SbxDemo } from '../../ui/demo';

/**
 * Checkbox: natywna kontrolka signal forms (`FormCheckboxControl`) ze stanem
 * nieokreślonym i obszarem dotyku niezależnym od rozmiaru wizualnego.
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
    required(p.terms, { message: 'Musisz zaakceptować regulamin' });
  });

  /** Stan nieokreślony — demonstracja aria-checked="mixed". */
  protected readonly partial = signal(true);
}
