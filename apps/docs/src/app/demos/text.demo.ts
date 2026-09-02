import { Component } from '@angular/core';
import { PctField, PctText } from '@pacit/components/field';

/** The plainest control there is — which is exactly the promise: a native input, styled. */
@Component({
  selector: 'demo-text',
  imports: [PctField, PctText],
  styles: ':host { display: block; max-inline-size: 24rem; }',
  template: `
    <pct-field label="Workspace name" hint="Lowercase, dashes allowed">
      <input pctText value="acme-design-system" />
    </pct-field>
  `,
})
export class TextDemo {}
