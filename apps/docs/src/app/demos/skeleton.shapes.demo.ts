import { Component } from '@angular/core';
import { PctSkeleton } from '@pacit/components/skeleton';

/**
 * Shapes
 *
 * `shape="text"` draws lines with a shorter last one, the way a paragraph ends; `"block"`
 * holds a box — an image, a card — at whatever size the container gives it.
 */
@Component({
  selector: 'demo-skeleton-shapes',
  imports: [PctSkeleton],
  styles:
    ':host { display: grid; gap: 16px; max-inline-size: 28rem; } .block { block-size: 7rem; }',
  template: `
    <pct-skeleton shape="block" class="block" />
    <pct-skeleton [lines]="4" />
  `,
})
export class SkeletonShapesDemo {}
