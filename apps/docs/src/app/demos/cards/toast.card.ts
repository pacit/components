import { Component, signal } from '@angular/core';
import {
  PCT_TOAST_HOST,
  PctToastHost,
  PctToastState,
  PctToastViewport,
} from '@pacit/components/toast';

/**
 * The two shapes the API has, side by side: a notice, which would expire, and a standing
 * message with an action, which by construction has no clock at all ({@link PctToastState}'s
 * two source types in `toast.ts`). `urgent` is deliberately not drawn — it decides what a
 * message is announced as and nothing about how it looks, so a still frame has nothing to
 * show for it.
 */
const MESSAGES: readonly PctToastState[] = [
  { id: 1, text: 'Draft saved.', urgent: false, actionLabel: '' },
  { id: 2, text: 'Message deleted.', urgent: false, actionLabel: 'Undo' },
];

/**
 * What the viewport is given, and the whole of it — the same seam `PctToaster` fills when it
 * creates the view (`toaster.ts`, `provide: PCT_TOAST_HOST, useValue: this`). The list does
 * not move and the stage is `inert`, so the four callbacks are answers to questions nobody in
 * a card asks.
 */
const STAGE_HOST: PctToastHost = {
  toasts: signal(MESSAGES),
  placement: { block: 'end', inline: 'end' },
  dismiss: () => undefined,
  run: () => undefined,
  hold: () => undefined,
  release: () => undefined,
};

/**
 * The messages themselves, standing where a page's own would — the corner of a window, at the
 * component's own `--pct-toast-inset` from both edges. The canonical demo is two buttons and a
 * counter, which is the code that RAISES a toast; the toast is what the card exists to show.
 *
 * Three readings make that static, and none of them is a drawing:
 *
 * - **the viewport is a component with a selector.** `pct-toast-viewport` takes everything it
 *   draws from one token — `PCT_TOAST_HOST` carries the list, the placement and the callbacks
 *   — so a scene that provides that token gets the library's own template and the library's
 *   own sheet, at prerender, with no script. What the scene must NOT provide is `PctToaster`
 *   itself: the service gates `toasts` on `mounted`, which it sets from `afterNextRender`, and
 *   it appends its viewport to `body`. On a server that is an empty region; in a browser it is
 *   a stack over the gallery rather than in a card.
 * - **a closed popover still renders here.** The host carries `popover="manual"` and nothing
 *   shows it, so the user agent's `display: none` for a closed popover applies — and the
 *   component's own sheet takes it back (`:host { display: flex }` in `toast-viewport.scss`),
 *   which the service writes down as the reason a browser with no top layer still sees the
 *   stack. Measured in chromium: `:popover-open` false, computed `display` flex, the two
 *   messages painted.
 * - **`position: fixed` means the nearest containing block, and that is the box below.** The
 *   drawer's page states the rule from the other side — a `transform`, a `filter` or a
 *   `contain` above a fixed panel makes THAT element its window. `contain: layout` on this
 *   host is that element, and measured in chromium the fixed viewport reports its corner
 *   against the host: the stack's `--pct-toast-inset` is 16px inside this box rather than
 *   16px inside the browser's.
 *
 * Nothing is faked. The surface, the border, the shadow, the accent on `Undo` and the cross
 * are the component's own drawings, and its `role="log"` announces nothing here because the
 * stage is `inert` and `aria-hidden` and a list that never changes has nothing to say.
 */
@Component({
  selector: 'demo-toast-card',
  imports: [PctToastViewport],
  providers: [{ provide: PCT_TOAST_HOST, useValue: STAGE_HOST }],
  // The window the stack is pinned to, sized to the smallest stage a card gets. The gallery's
  // `--pct-grid-min-width: 19rem` puts the floor at a 304px column, and the stage keeps 270 of
  // it once the card's two borders and its own 16px of padding are gone (measured: a 289px
  // card, a 287px stage, 255px of room) — so 16.5rem, grid.card's number for the same reason.
  // 9rem is the stage's 11rem read the strict way, with its padding taken off the inside
  // rather than added around it: the shorter of the two answers, and the one that cannot
  // overflow. The stack is 92px of that — two items of 42px and an 8px gap, Inter var at 13px
  // in chromium — which leaves 36px above it. `contain: layout` and not `paint`: the panel
  // shadow throws 24px of blur past the item, and cropping is the stage's job anyway.
  styles: `
    :host {
      display: block;
      contain: layout;
      inline-size: 16.5rem;
      block-size: 9rem;
    }
  `,
  template: `<pct-toast-viewport />`,
})
export class ToastCardScene {}
