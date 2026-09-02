import { Component, signal } from '@angular/core';
import { FormField, form } from '@angular/forms/signals';
import { PctField, PctNumber } from '@pacit/components/field';

/** A number the way the locale writes it — parsed back to one canonical value. */
@Component({
  selector: 'demo-number',
  imports: [FormField, PctField, PctNumber],
  styles: ':host { display: block; max-inline-size: 24rem; }',
  template: `
    <pct-field label="Monthly budget" hint="In your own digits and separators">
      <input pctNumber [formField]="limits.budget" />
    </pct-field>
  `,
})
export class NumberDemo {
  readonly model = signal({ budget: 1200 });
  readonly limits = form(this.model);
}
