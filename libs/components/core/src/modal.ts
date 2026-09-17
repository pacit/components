import { DOCUMENT, inject, Injectable, signal } from '@angular/core';

/**
 * The roles that ARE a live region, as opposed to the elements that carry one as an
 * attribute. The list is the specification's, and the reason it exists here is a measurement:
 * an element with `role="log"` publishes `live=polite` to the engine and carries **no**
 * `aria-live` attribute at all, so an exemption reading the attribute alone would have made
 * this library's own toast viewport go silent behind its own dialog
 * ([0044](../../../../docs/decisions/0044-a-toast-is-a-change-in-a-region-that-was-already-there.md)).
 * `marquee` and `timer` are in it for completeness — nothing here draws either, and an
 * application's own is exactly what this loop must not silence.
 */
const LIVE_ROLES = new Set(['alert', 'log', 'marquee', 'status', 'timer']);

/** Whether the element itself is a live region, by attribute or by role. */
function isLive(element: Element): boolean {
  return (
    element.hasAttribute('aria-live') ||
    LIVE_ROLES.has(element.getAttribute('role') ?? '')
  );
}

/**
 * The half of a modal that is about the page rather than about the modal: the background stops
 * answering, and the page stops scrolling underneath.
 *
 * [0024](../../../../docs/decisions/0024-the-closing-stack-is-the-dependency-s.md) deferred
 * both to the first modal, because a panel that locked the page's scroll would be a defect —
 * a listbox is not a modal and must not behave like one. E1 is that first consumer, and it
 * brings only **one** of the two things 0024 deferred: `inert` on the background is ours
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
 *
 * @since 0.1.0
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
      // dialog has to say, that its list is empty.
      //
      // "Hidden from assistive technology" is measured and not quoted from the specification:
      // in chromium's own accessibility tree a `role="status"` under `inert` is not ignored
      // but ABSENT — the same as under `aria-hidden` — and it comes back when the attribute
      // goes. A message inside an inert subtree reaches nobody.
      //
      // The test is `aria-live` on the child ITSELF, not anywhere below it: a region an
      // application put inside its own root would otherwise keep the whole page answering,
      // which is the opposite of what a modal is. A toast container below `<app-root>` does
      // go quiet, and that is the honest boundary — it is the same one the dependency draws.
      if (isLive(child)) continue;
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
