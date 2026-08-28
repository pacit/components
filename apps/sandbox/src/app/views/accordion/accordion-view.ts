import { Component, signal } from '@angular/core';
import { PctAccordion, PctAccordionItem } from '@pacit/components/accordion';
import { SbxDemo } from '../../ui/demo';

/**
 * The accordion: a stack of `<details>`. What is worth looking at here is how little of it is
 * this library's — the press, the state a reader announces, the tab order and the browser's
 * find-in-page are the platform's, and the exclusive group is one attribute.
 */
@Component({
  selector: 'sbx-accordion-view',
  imports: [SbxDemo, PctAccordion, PctAccordionItem],
  templateUrl: './accordion-view.html',
  styleUrl: './accordion-view.scss',
})
export class AccordionView {
  protected readonly shipping = signal(true);
}
