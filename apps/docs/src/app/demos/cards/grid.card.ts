import { Component } from '@angular/core';
import { PctGrid } from '@pacit/components/grid';

/**
 * The same four tiles at the same width, under two minimums: four columns, then two. A
 * card cannot resize itself, so the scene varies `--pct-grid-min-width` instead of the
 * container — the same equation read from the other side, and the only honest way to put
 * a reflow in a still frame.
 */
@Component({
  selector: 'demo-grid-card',
  imports: [PctGrid],
  // The stage centres a `max-content` scene and crops what overflows, so the width is
  // stated here rather than inherited — under a width that is not definite `auto-fit`
  // repeats once and both grids would read as one stack (lesson-146). 16.5rem is the
  // stage's 272px less a hair, so a fractional stage never shaves a column off the count
  // the captions name.
  styles: `
    :host {
      display: grid;
      gap: var(--pct-space-4);
      inline-size: 16.5rem;
      font-size: var(--pct-font-size-sm);
    }
    section {
      display: grid;
      gap: var(--pct-space-2);
    }
    p {
      margin: 0;
      line-height: 1.2;
      color: var(--pct-text-muted);
    }
    pct-grid {
      --pct-grid-gap: var(--pct-space-3);
    }
    div {
      padding: var(--pct-space-2);
      border-radius: var(--pct-radius-md);
      background-color: var(--pct-surface-100);
      line-height: 1.2;
      text-align: center;
    }
  `,
  template: `
    <section>
      <p>3.5rem minimum — four columns</p>
      <pct-grid style="--pct-grid-min-width: 3.5rem">
        <div>One</div>
        <div>Two</div>
        <div>Three</div>
        <div>Four</div>
      </pct-grid>
    </section>
    <section>
      <p>7.5rem minimum — two columns</p>
      <pct-grid style="--pct-grid-min-width: 7.5rem">
        <div>One</div>
        <div>Two</div>
        <div>Three</div>
        <div>Four</div>
      </pct-grid>
    </section>
  `,
})
export class GridCardScene {}
