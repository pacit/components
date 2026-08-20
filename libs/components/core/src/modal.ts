import { DOCUMENT, inject, Injectable, signal } from '@angular/core';

/**
 * The half of a modal that is about the page rather than about the modal: the background stops
 * answering, and the page stops scrolling underneath.
 *
 * [0024](../../../../docs/decisions/0024-the-closing-stack-is-the-dependency-s.md) deferred
 * both to the first modal, because a panel that locked the page's scroll would be a defect —
 * a listbox is not a modal and must not behave like one. E1 is that first consumer, and it
 * brings only **one** of the two things the plan expected: `inert` on the background is ours
 * to write, the scroll lock is ours to write, and the third item on that list — the closing
 * stack — stays the dependency's.
 *
 * **Why `inert` and not `aria-hidden`.** `aria-hidden` hides the background from a screen
 * reader and leaves it to the Tab key and the mouse; a focus trap covers the Tab key and
 * leaves it to the mouse. `inert` is the one property that says all three at once, and it is
 * the platform's (`req-api-platform`): measured in blink, gecko and webkit, an inert subtree
 * refuses `element.focus()`, drops out of the Tab order and stops answering the hit test, and
 * releasing it restores every one of the three.
 *
 * **Why the depth counter.** A dialog opened from a dialog engages the same background twice,
 * and the inner one closing must not hand the page back while the outer one is still up. The
 * count is on the service and not on the caller, because the state it guards is the document's.
 *
 * **The order the release has to keep** is the reason this is a service and not two lines in
 * the dialog: focus is restored to the element that opened the modal, and that element is
 * inside the background. Releasing after the restore would aim `focus()` at an inert subtree,
 * and an inert subtree refuses it — measured, not deduced. So a caller releases **before** it
 * detaches, and the dialog's own spec pins that order.
 *
 * @example
 * private readonly background = inject(PctModalBackground);
 * // on open, naming the element that stays live — everything not containing it goes inert:
 * this.background.hold(overlayRef.hostElement);
 * // on close, BEFORE the panel is detached, so focus has somewhere to go back to:
 * this.background.release();
 */
@Injectable({ providedIn: 'root' })
export class PctModalBackground {
  private readonly document = inject(DOCUMENT);

  /**
   * How many modals are holding the background. Public because it is the only thing about
   * this service a test can read without asking the document — and because a leak here is a
   * page that never scrolls again, which is worth being able to assert.
   */
  readonly depth = signal(0);

  /** What this service made inert, so the release puts back exactly that and nothing else. */
  private inerted: Element[] = [];

  /** The two inline styles as they stood before the lock; `null` while nothing is held. */
  private overflow: string | null = null;
  private padding: string | null = null;

  /**
   * Takes the page away from everything that does not contain `live`.
   *
   * `live` is an element rather than a selector on purpose: the caller knows where its panel
   * ended up, and every overlay of this library shares one container — so exempting the
   * subtree that holds the modal exempts the select panel opened inside it as well. A
   * selector written here would name the dependency's class in a file that otherwise does not
   * know it exists.
   *
   * A child already inert for somebody else's reason is left alone and not recorded, so the
   * release cannot hand back something this service never took.
   */
  hold(live: Element): void {
    this.depth.update((n) => n + 1);
    if (this.depth() > 1) return;

    for (const child of Array.from(this.document.body.children)) {
      if (child.hasAttribute('inert') || child.contains(live)) continue;
      // A live region goes on speaking. Found by looking rather than by reasoning: this
      // library's own channels are children of `body` (`PctAnnouncer`), so the first version
      // of this loop silenced them — and with them the one sentence a select opened INSIDE a
      // dialog has to say, that its list is empty. An inert subtree is hidden from assistive
      // technology, so a status message inside one reaches nobody.
      //
      // The test is `aria-live` on the child ITSELF, not anywhere below it: a region an
      // application put inside its own root would otherwise keep the whole page answering,
      // which is the opposite of what a modal is. A toast container below `<app-root>` does
      // go quiet, and that is the honest boundary — it is the same one the dependency draws.
      if (child.hasAttribute('aria-live')) continue;
      // The attribute rather than the property, though in a browser the two are one thing:
      // the attribute is the version a test can read and a person can see in the inspector,
      // and jsdom implements neither `inert` nor its reflection — so the property alone
      // would leave the unit suite asserting an expando it had invented itself.
      child.setAttribute('inert', '');
      this.inerted.push(child);
    }

    const root = this.document.documentElement;
    const view = this.document.defaultView;
    // The gutter is what the scrollbar was taking from the layout. Locking the scroll gives
    // it back, and the page behind the modal jumps by that width — 15 px in webkit with a
    // classic scrollbar, 0 wherever the scrollbars overlay the content. Compensating it here
    // is one read at the one moment the answer is knowable.
    const width = root.clientWidth;
    // A document with no layout reports a width of zero — the whole viewport would then read
    // as gutter, and the compensation would push the page off its own edge.
    const gutter = view && width > 0 ? view.innerWidth - width : 0;

    this.overflow = root.style.overflow;
    this.padding = root.style.paddingInlineEnd;
    root.style.overflow = 'hidden';
    // Logical, not `padding-right`: in a right-to-left page the scrollbar is on the other
    // side, and a physical property would compensate the edge that never moved
    // (`req-token-logical`).
    if (gutter > 0) root.style.paddingInlineEnd = `${gutter}px`;
  }

  /**
   * Gives the page back, once the last holder has let go. A release with nothing held is a
   * no-op rather than a negative count: the caller that closes twice is the ordinary case (a
   * dialog closed by Escape and then destroyed), and a counter that could go below zero would
   * leave the next `hold()` doing nothing at all.
   */
  release(): void {
    if (this.depth() === 0) return;
    this.depth.update((n) => n - 1);
    if (this.depth() > 0) return;

    for (const element of this.inerted) element.removeAttribute('inert');
    this.inerted = [];

    const root = this.document.documentElement;
    root.style.overflow = this.overflow ?? '';
    root.style.paddingInlineEnd = this.padding ?? '';
    this.overflow = null;
    this.padding = null;
  }
}
