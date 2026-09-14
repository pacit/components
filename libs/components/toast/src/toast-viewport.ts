import {
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
} from '@angular/core';
import {
  PCT_REGIONS,
  PCT_TEXTS,
  PctOverlayPanel,
} from '@pacit/components/core';
import { PctIcon } from '@pacit/components/icon';
import { PCT_TOAST_HOST, PctToastState } from './toast';

/**
 * The place the messages appear in — one per application, created by {@link PctToaster} and
 * never written into anybody's template.
 *
 * **The host is the live region**, and it carries `role="log"` and nothing else. Measured in
 * chromium's own accessibility tree, `log` publishes `live=polite`, `atomic=false` and
 * `relevant="additions text"`; `aria-live`, `aria-atomic` and `aria-relevant` written beside
 * it would be three attributes restating what the engine already says
 * ([0039](../../../../docs/decisions/0039-a-state-the-platform-publishes-is-not-ours-to-write.md),
 * [0044](../../../../docs/decisions/0044-a-toast-is-a-change-in-a-region-that-was-already-there.md)).
 * It is also what keeps the stack speaking behind a modal: `PctModalBackground` leaves the
 * live children of `body` alone, and since this one has no `aria-live` attribute to be
 * recognised by, that exemption learned to read the role.
 *
 * **The box is as big as its messages.** A viewport stretched across the window takes the hit
 * test away from the whole page underneath it — measured in three engines, with a button 40 px
 * from the corner answering `#vp` instead of itself. `pointer-events: none` is the usual
 * repair; a box that hugs its content needs no repair, and it is also what makes
 * `pointerenter` / `pointerleave` on the host mean "the pointer is in the stack".
 *
 * **And it is a `popover`, because a number cannot get above the top layer.** The CDK renders
 * every overlay inside a shown popover, so a modal's veil is in the top layer and a stack
 * ordered by `z-index: 1100` sits under it however large the number is
 * ([`lesson-122`](../../../../docs/lessons.md#lesson-122)). What follows for this component is
 * the whole of its lifecycle: a popover the user agent has closed is `display: none`, and a
 * `display: none` live region is absent from the accessibility tree — so the region is shown
 * the moment it is created, empty, and shown again as each message is raised, which is the
 * platform's own way of saying "this is the most recent thing on the screen".
 */
@Component({
  selector: 'pct-toast-viewport',
  templateUrl: './toast-viewport.html',
  styleUrl: './toast-viewport.scss',
  imports: [PctIcon],
  // Everything a child of `body` stops inheriting, applied from one reading rather than from
  // the three or four properties a template happened to name (`lesson-35`). The input is the
  // directive's, re-exposed under a name the service can set from outside.
  hostDirectives: [
    { directive: PctOverlayPanel, inputs: ['pctOverlayPanel: inherited'] },
  ],
  host: {
    class: 'pct-toast',
    role: 'log',
    // `manual`: the stack is not light-dismissed and does not answer Escape — it is not a
    // panel the user opened. `PctToaster` shows it; nothing else ever hides it.
    popover: 'manual',
    '[attr.aria-label]': 'texts().toastRegion',
    '[attr.data-pct-block]': 'host.placement.block',
    '[attr.data-pct-inline]': 'host.placement.inline',
    '(pointerenter)': 'pointer(true)',
    '(pointerleave)': 'pointer(false)',
    '(focusin)': 'focus(true)',
    '(focusout)': 'onFocusOut($event)',
    // The stack is a child of `body`, so a press inside it never reaches the element a
    // consumer mounted the region key on. It answers the same key here, and only when a
    // consumer has chosen one — the library still mounts nothing on the document (0072).
    '(keydown)': 'onRegionKey($event)',
  },
})
export class PctToastViewport {
  protected readonly host = inject(PCT_TOAST_HOST);
  protected readonly texts = inject(PCT_TEXTS);
  private readonly regions = inject(PCT_REGIONS);
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly toasts = this.host.toasts;

  constructor() {
    // The stack is a region whether or not anybody cycles through them: registering costs
    // nothing until a consumer mounts the key, and a stack that registered itself only once
    // somebody pressed something would be a region that is not there when it is looked for.
    // `null` unless an application installed the cycle, and then this whole constructor is
    // three lines that do nothing — which is what "the consumer installs it" costs a consumer
    // who did not (0072).
    const remove = this.regions?.register({
      element: this.element.nativeElement,
      label: computed(() => this.texts().toastRegion),
    });
    if (remove) inject(DestroyRef).onDestroy(remove);
  }

  /**
   * The region key, answered from inside the stack.
   *
   * A press here cannot reach the element the consumer mounted `pctRegionKey` on — the stack
   * is a child of `body` and the application is somewhere else in the tree — so the same key
   * is read from the service, and only when a consumer has actually chosen one. That is the
   * difference between shipping a mechanism and taking a keystroke: with no
   * `[pctRegionKey]` anywhere, F6 does here exactly what it did before this existed (0072).
   */
  protected onRegionKey(event: KeyboardEvent): void {
    if (event.defaultPrevented) return;
    const key = this.regions?.key() ?? null;
    if (key === null || event.key !== key) return;
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    if (this.regions?.next(document.activeElement)) event.preventDefault();
  }

  /** The two reasons a clock stops, kept apart so that neither can release the other's hold. */
  private pointerInside = false;
  private focusInside = false;
  private holding = false;

  protected dismiss(toast: PctToastState): void {
    this.host.dismiss(toast.id);
  }

  protected run(toast: PctToastState): void {
    this.host.run(toast.id);
  }

  protected pointer(inside: boolean): void {
    this.pointerInside = inside;
    this.sync();
  }

  protected focus(inside: boolean): void {
    this.focusInside = inside;
    this.sync();
  }

  /**
   * Focus left one of the buttons — and only a `relatedTarget` outside this element means it
   * left the stack. Without the test, tabbing from a message's action to its cross would read
   * as a departure and start every clock again for the length of one frame.
   */
  protected onFocusOut(event: FocusEvent): void {
    const next = event.relatedTarget;
    const element = event.currentTarget as HTMLElement;
    this.focus(next instanceof Node && element.contains(next));
  }

  /**
   * One `hold` for both reasons, so the counting cannot drift: the service is told only when
   * the answer to "is anybody in the stack" changes.
   */
  private sync(): void {
    const holding = this.pointerInside || this.focusInside;
    if (holding === this.holding) return;
    this.holding = holding;
    if (holding) this.host.hold();
    else this.host.release();
  }
}
