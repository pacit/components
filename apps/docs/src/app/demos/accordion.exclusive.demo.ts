import { Component } from '@angular/core';
import { PctAccordion, PctAccordionItem } from '@pacit/components/accordion';

/**
 * One at a time
 *
 * `exclusive` closes the open section when another opens — a FAQ reads better that way.
 * Without it every section keeps its own state, which is what a settings page wants.
 * `headingLevel` sets the heading the buttons sit in, so the outline stays honest.
 */
@Component({
  selector: 'demo-accordion-exclusive',
  imports: [PctAccordion, PctAccordionItem],
  styles: ':host { display: block; max-inline-size: 36rem; }',
  template: `
    <pct-accordion exclusive [headingLevel]="4">
      <pct-accordion-item label="Do I need zone.js?">
        No — the library is zoneless from the first line.
      </pct-accordion-item>
      <pct-accordion-item label="Does it render on the server?">
        Every component renders on the server and hydrates without a mismatch.
      </pct-accordion-item>
      <pct-accordion-item label="Can a screen reader use it?">
        Every promise about that is a test in three engines.
      </pct-accordion-item>
    </pct-accordion>
  `,
})
export class AccordionExclusiveDemo {}
