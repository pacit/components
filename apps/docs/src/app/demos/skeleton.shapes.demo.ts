import { Component } from '@angular/core';
import { PctSkeleton } from '@pacit/components/skeleton';

/**
 * Shapes
 *
 * `shape="text"` draws lines with a shorter last one, the way a paragraph ends; `"block"`
 * holds a box — an image, a card — at whatever size the container gives it; `"circle"` holds
 * a disc, sized on either axis, with the other following.
 */
@Component({
  selector: 'demo-skeleton-shapes',
  imports: [PctSkeleton],
  // A width, not only a ceiling — see `skeleton.demo.ts` (`lesson-160`).
  styles: `
    :host {
      display: grid;
      gap: 16px;
      inline-size: min(28rem, 100%);
    }
    .block {
      block-size: 7rem;
    }
    .disc {
      block-size: var(--pct-avatar-size-lg);
    }
  `,
  template: `
    <pct-skeleton shape="block" class="block" />
    <pct-skeleton shape="circle" class="disc" />
    <pct-skeleton [lines]="4" />
  `,
})
export class SkeletonShapesDemo {}
