import { Component } from '@angular/core';
import { PctAutosize, PctField, PctText } from '@pacit/components/field';

/** `pctAutosize` grows the box with the writing — no scrollbar inside a scrollbar. */
@Component({
  selector: 'demo-textarea',
  imports: [PctAutosize, PctField, PctText],
  styles: ':host { display: block; max-inline-size: 24rem; }',
  template: `
    <pct-field label="Release notes" hint="It grows as you write">
      <textarea pctText pctAutosize rows="2"></textarea>
    </pct-field>
  `,
})
export class TextareaDemo {}
