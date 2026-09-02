import { Component } from '@angular/core';
import { PctAccordion, PctAccordionItem } from '@pacit/components/accordion';

/** Sections that fold — `exclusive` keeps one open at a time, like an FAQ. */
@Component({
  selector: 'demo-accordion',
  imports: [PctAccordion, PctAccordionItem],
  template: `
    <pct-accordion exclusive>
      <pct-accordion-item label="What ships in the package?">
        Standalone components, design tokens and schematics — no zone.js.
      </pct-accordion-item>
      <pct-accordion-item label="Which Angular versions?">
        One major per release line; the support policy names the numbers.
      </pct-accordion-item>
      <pct-accordion-item label="Can I retheme it?">
        Every colour is a token — override one variable or a whole scope.
      </pct-accordion-item>
    </pct-accordion>
  `,
})
export class AccordionDemo {}
