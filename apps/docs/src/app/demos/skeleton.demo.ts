import { Component, signal } from '@angular/core';
import { PctButton } from '@pacit/components/button';
import { PctSkeleton } from '@pacit/components/skeleton';

/** The shape of content that is not here yet — and aria-busy on the region that waits. */
@Component({
  selector: 'demo-skeleton',
  imports: [PctButton, PctSkeleton],
  styles: ':host { display: grid; gap: 12px; max-inline-size: 24rem; }',
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
