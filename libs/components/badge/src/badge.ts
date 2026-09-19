import {
  afterNextRender,
  Component,
  ElementRef,
  inject,
  input,
  isDevMode,
} from '@angular/core';
import type { PctTone } from '@pacit/components/core';

/**
 * A badge: a word wearing a tone — `Draft`, `Active`, `Overdue`.
 *
 * **It is text, and only text.** The content is projected and already stands in the
 * document's sentence, so there is no role, no ARIA and no string of the component's own —
 * a reader reads the word as the plain text it is, and the tone repeats it for the eye
 * that scans. The tone never speaks alone (0053): the one shape where colour would be the
 * only channel — a toned box with no text in it — is named by a dev-mode warning, because
 * it is a colour swatch pretending to be information.
 *
 * **Not a control, not a chip.** It stands on no control axis and has no `size` input; the
 * corner is `radius.md` and deliberately not the chips' pill, because a chip looks
 * grabbable for the reason that it is, and a word of status must not borrow that costume.
 *
 * @example
 * <h2>Invoices <pct-badge tone="danger">3 overdue</pct-badge></h2>
 *
 * @since 0.1.0
 */
@Component({
  selector: 'pct-badge',
  templateUrl: './badge.html',
  styleUrl: './badge.scss',
  host: {
    class: 'pct-badge',
    '[attr.data-pct-tone]': 'tone()',
  },
})
export class PctBadge {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /**
   * The tone the word wears, or `null` for none — the default, and the quiet box the skin's
   * own surfaces paint. It repeats the text, never replaces it.
   *
   * **The absence is the neutral, and is not a member.** A union member meaning "none of the
   * above" makes every consumer write it, and the library settled that once for every
   * component that would ever want tones
   * ([0076](../../../../docs/decisions/0076-a-tone-is-two-channels-and-four-names.md)). Until
   * 0082 landed the skin's `success` / `warning` / `info` ramps this input took a list of
   * its own, `PctBadgeTone`, naming the missing ramps as the condition for growing; the
   * ramps arrived, so the list is gone rather than doubled.
   *
   * @since 0.1.0
   */
  readonly tone = input<PctTone | null>(null);

  constructor() {
    if (isDevMode()) afterNextRender(() => this.warnOnEmptyBadge());
  }

  /**
   * A badge with no text is colour as the only channel — the one thing this component
   * exists to refuse. Said once, when the box first stands in the document, and only in
   * dev mode: the fix is content, not configuration.
   */
  private warnOnEmptyBadge(): void {
    if (this.host.nativeElement.textContent?.trim()) return;
    console.warn(
      `[pct-badge] A badge with no text. A toned box with nothing in it says something ` +
        `by colour alone — write the word in the badge, or leave the badge out.`,
    );
  }
}
