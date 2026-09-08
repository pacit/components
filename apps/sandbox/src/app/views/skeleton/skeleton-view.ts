import { Component, signal } from '@angular/core';
import { PctButton } from '@pacit/components/button';
import { PctSkeleton } from '@pacit/components/skeleton';
import { SbxDemo } from '../../ui/demo';

/**
 * Skeleton: the shape of content that has not arrived. Two things are worth looking at, and
 * neither of them is the drawing. The first is the SPACE — a skeleton is measured in line
 * boxes of the type it stands in, so the page does not move when the text lands. The second is
 * what says the wait is happening at all: `aria-busy` on the region, which is the consumer's
 * element and never this component's.
 */
@Component({
  selector: 'sbx-skeleton-view',
  imports: [SbxDemo, PctSkeleton, PctButton],
  templateUrl: './skeleton-view.html',
  styleUrl: './skeleton-view.scss',
})
export class SkeletonView {
  /** Whether the content of the first card has arrived — the whole demo is this one flag. */
  protected readonly pending = signal(true);

  /** The page's own stop for a wait it has decided is a long one (0073). */
  protected readonly stopped = signal(false);

  protected toggle(): void {
    this.pending.update((waiting) => !waiting);
  }
}
