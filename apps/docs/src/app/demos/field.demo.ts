import { Component, signal } from '@angular/core';
import { FormField, email, form, required } from '@angular/forms/signals';
import { PctField, PctText } from '@pacit/components/field';

/** One line under the field: the hint — or, once you leave it broken, the error. */
@Component({
  selector: 'demo-field',
  imports: [FormField, PctField, PctText],
  styles: ':host { display: block; max-inline-size: 24rem; }',
  template: `
    <pct-field label="E-mail" hint="A work address">
      <input pctText type="email" [formField]="userForm.email" />
    </pct-field>
  `,
})
export class FieldDemo {
  readonly model = signal({ email: '' });
  readonly userForm = form(this.model, (path) => {
    required(path.email, { message: 'The e-mail address is required' });
    email(path.email, { message: 'That does not look like an address' });
  });
}
