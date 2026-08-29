import { Component, computed, signal } from '@angular/core';
import { PctButton } from '@pacit/components/button';
import { PctProgress } from '@pacit/components/progress';
import { SbxDemo } from '../../ui/demo';

/**
 * Progress: a `<progress>` under our own paint. What is worth looking at here is what the
 * component does NOT write — no `role`, no `aria-valuenow`, no `aria-valuemax` — and what an
 * indeterminate bar is: an element with no value at all, not a value of zero.
 */
@Component({
  selector: 'sbx-progress-view',
  imports: [SbxDemo, PctProgress, PctButton],
  templateUrl: './progress-view.html',
  styleUrl: './progress-view.scss',
})
export class ProgressView {
  /** The bar a button moves, so the value really changes under the eye. */
  protected readonly done = signal(40);

  /** A scale that is not a hundred: bytes of a file, reported as bytes. */
  protected readonly copied = signal(129);
  protected readonly total = 256;
  protected readonly copiedPercent = computed(() =>
    Math.round((this.copied() / this.total) * 100),
  );

  /** Switched between a number and nothing, which is the whole indeterminate contract. */
  protected readonly known = signal<number | null>(null);

  protected move(by: number): void {
    this.done.update((value) => Math.min(100, Math.max(0, value + by)));
  }

  protected toggleKnown(): void {
    this.known.update((value) => (value === null ? 60 : null));
  }
}
