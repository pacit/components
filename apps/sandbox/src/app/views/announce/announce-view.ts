import { Component, inject, signal } from '@angular/core';
import { PctButton } from '@pacit/components/button';
import { PctAnnouncer, PctPoliteness } from '@pacit/components/core';
import { SbxDemo } from '../../ui/demo';

/**
 * The live channels, and the reason this view exists at all: `PctAnnouncer` opens **two**
 * regions and the library speaks through one of them. The polite channel has a consumer —
 * the select's empty panel — and the assertive one has none, because every interruption
 * this library could have had turned out to have a place on the screen instead (0026's own
 * rule, and its prediction that the toast and the dialog would be the first callers was
 * wrong twice, on purpose both times).
 *
 * So the consumer is a demo. That is not a stand-in for a missing feature: the assertive
 * region is a mechanism the package EXPORTS, and a consumer's interruption with nowhere to
 * be is exactly what it is for. What the view adds is a run in which a sentence really
 * lands in the assertive region and not in the polite one.
 *
 * Nothing here draws the message. The regions are the library's, they are visually hidden
 * by design, and the only honest way to see them work is to read the DOM — which is what
 * `announce.spec.ts` does, and what a screen reader does for a person.
 */
@Component({
  selector: 'sbx-announce-view',
  imports: [SbxDemo, PctButton],
  templateUrl: './announce-view.html',
  styleUrl: './announce-view.scss',
})
export class AnnounceView {
  private readonly announcer = inject(PctAnnouncer);

  /** What the last press sent, so the page itself says what happened. */
  protected readonly last = signal<string>('');

  protected say(politeness: PctPoliteness): void {
    const message =
      politeness === 'assertive'
        ? 'The connection was lost. Nothing was saved.'
        : 'Sixteen results.';
    this.announcer.announce(message, politeness);
    this.last.set(`${politeness}: ${message}`);
  }
}
