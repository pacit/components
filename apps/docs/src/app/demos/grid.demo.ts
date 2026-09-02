import { Component } from '@angular/core';
import { PctGrid } from '@pacit/components/grid';

/** Tiles find their own column count from one minimum width — no media query anywhere. */
@Component({
  selector: 'demo-grid',
  imports: [PctGrid],
  styles:
    'div { border: 1px solid var(--pct-border); border-radius: 8px; padding: 12px; }',
  template: `
    <pct-grid style="--pct-grid-min-width: 8rem">
      <div>One</div>
      <div>Two</div>
      <div>Three</div>
      <div>Four</div>
      <div>Five</div>
      <div>Six</div>
    </pct-grid>
  `,
})
export class GridDemo {}
