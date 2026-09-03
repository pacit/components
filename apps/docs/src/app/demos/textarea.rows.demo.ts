import { Component } from '@angular/core';
import { PctAutosize, PctField, PctText } from '@pacit/components/field';

/**
 * It grows, up to a point
 *
 * `rows` is the height it starts at; `maxRows` is where it stops growing and starts
 * scrolling instead — a comment box, not a document.
 */
@Component({
  selector: 'demo-textarea-rows',
  imports: [PctAutosize, PctField, PctText],
  styles: ':host { display: block; max-inline-size: 28rem; }',
  template: `
    <pct-field label="Comment" hint="Grows to five lines, then scrolls">
      <textarea pctText pctAutosize rows="2" [maxRows]="5"></textarea>
    </pct-field>
  `,
})
export class TextareaRowsDemo {}
