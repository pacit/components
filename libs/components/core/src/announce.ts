import {
  afterNextRender,
  DestroyRef,
  DOCUMENT,
  inject,
  Injectable,
} from '@angular/core';

/**
 * How loudly a channel speaks: `polite` waits for the screen reader to finish the sentence it
 * is on, `assertive` interrupts it (req-a11y-built-in).
 *
 * The politeness is a property of the **region**, not of the message: an assistive technology
 * registers a live region when it enters the accessibility tree and reads the attribute then,
 * so a single element whose `aria-live` is rewritten per call is announcing the previous
 * politeness at least once. Hence two regions and a name for choosing between them, rather
 * than one region and an argument that mutates it.
 *
 * @since 0.1.0
 */
export type PctPoliteness = 'polite' | 'assertive';

/**
 * The library's live regions — one per politeness for the whole document, not one per
 * component (req-a11y-built-in).
 *
 * **What belongs here and what does not.** A message with a place on the screen announces
 * itself from there: the error under a control is `role="alert"` on the text the user can
 * also read, one owner for one sentence ([0022](../../../../docs/decisions/0022-one-message-line.md)).
 * This channel is for the other kind — a change with no element a screen reader is pointed at.
 * The first of those is the select's empty panel: focus stays on the trigger, the listbox has
 * no options for `aria-activedescendant` to name, and the sentence inside the panel is read by
 * nobody ([0026](../../../../docs/decisions/0026-one-channel-per-politeness.md)).
 *
 * **The regions are built by a render, not by the first message.** A region that enters the
 * document together with its text is a region the assistive technology has not registered yet,
 * and the announcement is lost — which is why the pair is created empty, ahead of anything
 * having something to say. Precisely: by the first render AFTER this service is created, which
 * for a component injecting it is the render that creates the component. It follows that a
 * message emitted before that has nowhere to go and is dropped — there is no document for the
 * user to hear it from — and on the server no render ever comes, so nothing is appended to the
 * HTML being sent (req-project-ssr).
 *
 * **The hiding travels with the element.** The regions are positioned and clipped through
 * their own style, not through a class, because a class is a promise about a stylesheet the
 * consumer has to include — measured on the two this library asks for
 * ([`lesson-83`](../../../../docs/lessons.md#lesson-83)).
 *
 * @example
 * private readonly announcer = inject(PctAnnouncer);
 * this.announcer.announce(this.texts().selectEmpty);
 *
 * @since 0.1.0
 */
@Injectable({ providedIn: 'root' })
export class PctAnnouncer {
  private readonly document = inject(DOCUMENT);
  private readonly regions = new Map<PctPoliteness, HTMLElement>();

  constructor() {
    afterNextRender(() => {
      this.open('polite');
      this.open('assertive');
    });

    // A `providedIn: 'root'` service lives as long as the application injector — one page load
    // in a browser, one test in a suite. Without this the regions of a torn-down application
    // stay in the document, and the next one starts with somebody else's sentences in it.
    inject(DestroyRef).onDestroy(() => {
      for (const region of this.regions.values()) region.remove();
      this.regions.clear();
    });
  }

  /**
   * Says `message` on the given channel. Saying what the channel is already saying does
   * nothing: two components reporting the same state are one announcement, and re-emitting a
   * message on every recomputation of the signal behind it is not a second event.
   *
   * The message has to be withdrawn before it can be announced again — see {@link retract}.
   *
   * @since 0.1.0
   */
  announce(message: string, politeness: PctPoliteness = 'polite'): void {
    if (message === '') return;
    const region = this.regions.get(politeness);
    if (region === undefined || region.textContent === message) return;
    region.textContent = message;
  }

  /**
   * Takes `message` off the channel — the half of the contract without which the same sentence
   * could never be said twice (`lesson-68` is the same pair one layer down: a chrome that only
   * hears about arrivals cannot tell a replacement from a second control).
   *
   * It withdraws only what is still there: a component whose state has passed does not silence
   * the message another one has since put up. Two owners saying the same words are
   * indistinguishable here by design — that is what the deduplication above makes them.
   *
   * @since 0.1.0
   */
  retract(message: string, politeness: PctPoliteness = 'polite'): void {
    const region = this.regions.get(politeness);
    if (region === undefined || region.textContent !== message) return;
    region.textContent = '';
  }

  private open(politeness: PctPoliteness): void {
    const region = this.document.createElement('div');
    region.setAttribute('aria-live', politeness);
    // Without it the region is read from the first changed word rather than as a sentence.
    region.setAttribute('aria-atomic', 'true');
    region.setAttribute('data-pct-live', politeness);

    // One declaration block rather than nine property writes: 30 B of the built artifact,
    // measured rather than assumed — the minifier keeps the property names either way.
    // `white-space` is not decoration: a long sentence in a 1×1 box wraps into a tall column
    // of invisible text down the side of the page.
    region.style.cssText =
      'position:absolute;width:1px;height:1px;margin:-1px;padding:0;border:0;' +
      'overflow:hidden;clip-path:inset(50%);white-space:nowrap';

    this.document.body.appendChild(region);
    this.regions.set(politeness, region);
  }
}
