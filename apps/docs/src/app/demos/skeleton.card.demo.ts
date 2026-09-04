import { Component } from '@angular/core';
import { PctSkeleton } from '@pacit/components/skeleton';

/**
 * A card that is still coming
 *
 * The three shapes arranged the way an application arranges them: a disc the avatar's own
 * size, one short line where the name will be, three where the text will be — under ONE busy
 * region. The wait is a fact about the card, not about each placeholder inside it.
 */
@Component({
  selector: 'demo-skeleton-card',
  imports: [PctSkeleton],
  styles: `
    :host {
      display: block;
      inline-size: min(24rem, 100%);
    }
    .card {
      display: flex;
      gap: 16px;
      padding: 16px;
      border: 1px solid var(--pct-border);
      border-radius: var(--pct-radius-md);
    }
    .avatar {
      block-size: var(--pct-avatar-size);
    }
    .body {
      display: grid;
      flex: 1;
      gap: 8px;
    }
    .name {
      inline-size: 55%;
    }
  `,
  template: `
    <div class="card" aria-busy="true">
      <pct-skeleton shape="circle" class="avatar" />
      <div class="body">
        <pct-skeleton class="name" />
        <pct-skeleton [lines]="3" />
      </div>
    </div>
  `,
})
export class SkeletonCardDemo {}
