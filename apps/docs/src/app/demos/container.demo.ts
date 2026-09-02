import { Component } from '@angular/core';
import { PctContainer } from '@pacit/components/container';

/** A reading column: centred, padded, capped — and the cap is a token you may override. */
@Component({
  selector: 'demo-container',
  imports: [PctContainer],
  styles: 'pct-container { outline: 1px dashed var(--pct-border); }',
  template: `
    <pct-container style="--pct-container-max-width: 28rem">
      <p>
        This column is 28rem at most — one custom property, scoped to this
        instance. Children can respond to the container, not the viewport.
      </p>
    </pct-container>
  `,
})
export class ContainerDemo {}
