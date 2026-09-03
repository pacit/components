import { Component } from '@angular/core';
import { PctStack } from '@pacit/components/stack';

/**
 * Three rhythms
 *
 * `gap` rides the library's shared size axis — sm, md, lg — so the space between a form's
 * rows is the same decision as the space between a page's sections, taken once.
 */
@Component({
  selector: 'demo-stack-gaps',
  imports: [PctStack],
  // The width is stated, not shrink-wrapped by the stage (lesson-146).
  styles:
    ':host { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; inline-size: 100%; } div { padding: 6px 10px; border: 1px solid currentColor; border-radius: 6px; }',
  template: `
    <pct-stack gap="sm"
      ><div>sm</div>
      <div>sm</div>
      <div>sm</div></pct-stack
    >
    <pct-stack gap="md"
      ><div>md</div>
      <div>md</div>
      <div>md</div></pct-stack
    >
    <pct-stack gap="lg"
      ><div>lg</div>
      <div>lg</div>
      <div>lg</div></pct-stack
    >
  `,
})
export class StackGapsDemo {}
