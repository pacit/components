import { Component } from '@angular/core';
import { PctContainer } from '@pacit/components/container';

/**
 * A narrower column, per instance
 *
 * The cap is a token, and a token is an input: override `--pct-container-max-width` on one
 * element and only that column narrows — no class, no media query.
 */
@Component({
  selector: 'demo-container-width',
  imports: [PctContainer],
  styles:
    ':host { display: grid; gap: 12px; inline-size: 100%; } pct-container { outline: 1px dashed currentColor; }',
  // Each column sits in a block-flow wrapper: as a grid or flex item, a column's auto
  // margins absorb the free space and its containment leaves it no width of its own
  // (lesson-146) — the wrapper is the item, the column is a block inside it.
  template: `
    <div>
      <pct-container style="--pct-container-max-width: 20rem">
        <p>Twenty rem, for a form.</p>
      </pct-container>
    </div>
    <div>
      <pct-container style="--pct-container-max-width: 32rem">
        <p>Thirty-two rem, for an article.</p>
      </pct-container>
    </div>
  `,
})
export class ContainerWidthDemo {}
