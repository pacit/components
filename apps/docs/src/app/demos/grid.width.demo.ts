import { Component } from '@angular/core';
import { PctGrid } from '@pacit/components/grid';

/**
 * Cards that decide their own count
 *
 * `--pct-grid-min-width` is the smallest a cell may be; the grid fits as many as the
 * container allows and wraps the rest. No breakpoints — the container is the question.
 */
@Component({
  selector: 'demo-grid-width',
  imports: [PctGrid],
  // A definite width, or `auto-fit` repeats once (lesson-146).
  styles:
    ':host { display: block; inline-size: 100%; } div { padding: 12px; border: 1px solid currentColor; border-radius: 8px; }',
  template: `
    <pct-grid style="--pct-grid-min-width: 11rem; --pct-grid-gap: 12px">
      <div>Container</div>
      <div>Stack</div>
      <div>Grid</div>
      <div>Theme</div>
      <div>Button</div>
      <div>Tabs</div>
    </pct-grid>
  `,
})
export class GridWidthDemo {}
