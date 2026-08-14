import { Component, signal } from '@angular/core';
import { form, FormField, required } from '@angular/forms/signals';
import { PctField } from '@pacit/components/field';
import { PctRadio, PctRadioGroup } from '@pacit/components/radio';
import { SbxDemo } from '../../ui/demo';

/**
 * A radio group — the first composite component: the form control is the container,
 * the options have no form state of their own (req-api-container).
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
    required(p.plan, { message: 'Pick a plan' });
  });

  /** The horizontal layout demo. */
  protected readonly layoutDemo = signal<string | null>('a');
}
