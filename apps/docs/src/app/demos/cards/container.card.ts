import { Component } from '@angular/core';
import { PctContainer } from '@pacit/components/container';

/**
 * The same column twice against the same ground: with the default 72rem cap, which nothing
 * a card is wide can reach, and with a 9rem one scoped onto the instance, which bites — a
 * narrower column, centred, its gutter on both sides. Both lengths are scoped down rather
 * than staged at their defaults, and that is the honest reduction: both are tokens, and a
 * token scoped on the element IS the per-instance API (0057). The gutter goes with them
 * because its `clamp()` reads the VIEWPORT, so left alone it would draw the page's 40px
 * around a card-sized column — a true number in a frame that makes it a lie about the
 * proportion. 16px is that clamp's own floor, not a value from nowhere. What the card does
 * not claim is the 72rem measure itself: no card is wide enough to reach it, so the first
 * row shows the column doing what it does below the cap — being the width it was handed.
 */
@Component({
  selector: 'demo-container-card',
  imports: [PctContainer],
  styles: `
    :host {
      /* A column has no width of its own — inline-size containment reports none, and a
         stage that centres its scene hands it none (lesson-146). So the ground states one,
         the stage's own 272px, which is what makes the cap in the second row visible. */
      display: grid;
      gap: var(--pct-space-4);
      inline-size: 17rem;
      max-inline-size: 100%;
    }
    .row {
      display: grid;
      gap: var(--pct-space-2);
    }
    .note {
      margin: 0;
      color: var(--pct-text-muted);
      font-size: var(--pct-font-size-sm);
    }
    .ground {
      padding-block: var(--pct-space-3);
      background: var(--pct-surface-100);
    }
    pct-container {
      --pct-container-padding-x: var(--pct-space-5);
      /* The component paints nothing at all, so its box needs a ruler drawn round it: the
         same dashed line the page's demo uses, and the scene's line, not the component's. */
      outline: 1px dashed var(--pct-border-strong);
      outline-offset: -1px;
    }
    pct-container p {
      margin: 0;
      font-size: var(--pct-font-size-md);
    }
  `,
  template: `
    <div class="row">
      <p class="note">72rem cap — wider than this ground</p>
      <div class="ground">
        <pct-container>
          <p>the parent's full width</p>
        </pct-container>
      </div>
    </div>
    <div class="row">
      <p class="note">9rem cap, scoped to the instance</p>
      <div class="ground">
        <pct-container style="--pct-container-max-width: 9rem">
          <p>capped, centred</p>
        </pct-container>
      </div>
    </div>
  `,
})
export class ContainerCardScene {}
