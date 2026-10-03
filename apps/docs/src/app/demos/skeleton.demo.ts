import { Component, signal } from '@angular/core';
import { PctButton } from '@pacit/components/button';
import { PctSkeleton } from '@pacit/components/skeleton';

/** The shape of content that is not here yet — and aria-busy on the region that waits. */
@Component({
  selector: 'demo-skeleton',
  imports: [PctButton, PctSkeleton],
  // A width and not only a ceiling: the stage centres its demo in a flex row, and a row hands a
  // flex item the width of its content — which, for a component whose bars are 100% OF ITS
  // CONTAINER, is nothing. Measured on the page before this line: a 0px skeleton, invisible,
  // under a heading that promised one (`lesson-160`).
  //
  // And a height for the box the skeleton stands in. Three bars are exactly three line boxes,
  // but the paragraph that replaces them wraps to two and brings a margin above and below —
  // measured 100 to 112px on the host, and the stage recentred it: 6px under the button on
  // every press (`lesson-249`). A floor of three lines and no margin keeps the box the
  // skeleton's shape in both states, which is the component's own promise.
  styles: `
    :host {
      display: grid;
      gap: 12px;
      inline-size: min(24rem, 100%);
    }
    div {
      min-block-size: 3lh;
    }
    p {
      margin: 0;
    }
  `,
  template: `
    <div [attr.aria-busy]="pending() ? 'true' : null">
      @if (pending()) {
        <pct-skeleton [lines]="3" />
      } @else {
        <p>The article arrived — three lines of it, exactly as promised.</p>
      }
    </div>
    <button
      pctButton
      variant="outline"
      size="sm"
      (click)="pending.set(!pending())"
    >
      {{ pending() ? 'Deliver' : 'Reload' }}
    </button>
  `,
})
export class SkeletonDemo {
  readonly pending = signal(true);
}
