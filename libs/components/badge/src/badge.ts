import {
  afterNextRender,
  Component,
  ElementRef,
  inject,
  input,
  isDevMode,
} from '@angular/core';

/**
 * The tones the skin can keep today. A union, so a missing tone is a compile error and not
 * a silently grey box — and deliberately two members: `neutral` stands on surfaces the skin
 * already has, `danger` is the error colour painting its first background (the `on-danger`
 * pair `semantic.light.json` promised back), and `success` / `warning` / `info` need colour
 * ramps the skin does not have at all. The union grows the day the ramps land — the same
 * road `PctIconName` walks
 * ([0053](../../../../docs/decisions/0053-a-badge-is-a-word-wearing-a-tone.md)).
 */
export type PctBadgeTone = 'neutral' | 'danger';

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

  /** The tone the word wears — `neutral` by default. It repeats the text, never replaces it. */
  readonly tone = input<PctBadgeTone>('neutral');

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
