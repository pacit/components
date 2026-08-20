/**
 * A time in a computed style: `150ms`, `0.15s`, `0s`. `getComputedStyle` resolves every
 * duration to one of these two units, so nothing wider needs parsing here.
 */
const TIME = /^\s*(-?[\d.]+)(ms|s)\s*$/;

/**
 * The longest time in a comma-separated computed value. A transition may name several
 * properties with several durations, and what a leave has to wait for is the last of them,
 * not the first one the string happens to hold.
 *
 * Anything unreadable counts as zero — deliberately. The other road would be to guess a
 * duration, which turns a browser that reports nothing (jsdom implements no cascade, so it
 * answers `''`) into a panel that hangs on the screen for a made-up number of milliseconds.
 */
function longest(value: string | undefined): number {
  if (!value) return 0;
  let max = 0;
  for (const part of value.split(',')) {
    const match = TIME.exec(part);
    if (!match) continue;
    const time = Number(match[1]) * (match[2] === 's' ? 1000 : 1);
    if (Number.isFinite(time) && time > max) max = time;
  }
  return max;
}

/**
 * Runs `done` once the element has finished transitioning — the half of an enter/leave that
 * CSS cannot do on its own.
 *
 * An enter needs no JavaScript at all: `@starting-style` gives the browser the state to come
 * from, and the panel animates into place the moment it is attached. A **leave** is the other
 * matter entirely — a panel removed from the DOM takes its transition with it, so something
 * has to hold the element there until the motion is over. That something is this function, and
 * it is in `core` because a tooltip and a popover need exactly the same wait
 * (`req-a11y-motion`).
 *
 * **Why the duration is read rather than assumed.** `prefers-reduced-motion` is answered by
 * the token build, not by a media query in a sheet — so the same rule that draws the panel
 * carries `0.01ms` for a user who asked for less motion, and the wait collapses with it. A
 * number written here would be a second opinion about a preference this library already
 * answers in one place, and it would keep the panel on screen for 150 ms after the motion the
 * user switched off had ended.
 *
 * **Why there is a timeout beside the event.** `transitionend` is not promised: a panel
 * hidden, detached or repainted mid-flight never fires it, and a leave waiting on it alone
 * would leave the overlay attached for good. The timer is the floor, the event is the
 * fast path, and whichever arrives first wins once.
 *
 * @returns a cancel — for the panel that is opened again before its leave has finished.
 *
 * @example
 * panel.setAttribute('data-pct-leaving', '');
 * this.cancelLeave = pctAfterTransition(panel, () => ref.dispose());
 */
export function pctAfterTransition(
  element: HTMLElement,
  done: () => void,
): () => void {
  const view = element.ownerDocument?.defaultView;
  const style = view?.getComputedStyle(element);
  const total =
    longest(style?.transitionDuration) + longest(style?.transitionDelay);

  if (total <= 0) {
    done();
    return () => undefined;
  }

  let finished = false;
  const finish = (): void => {
    if (finished) return;
    finished = true;
    element.removeEventListener('transitionend', onEnd);
    clearTimeout(timer);
    done();
  };

  // A transition of a child bubbles here as well, and it is not the one being waited for —
  // a panel with its own fading content would otherwise be detached at the first of them.
  function onEnd(event: TransitionEvent): void {
    if (event.target === element) finish();
  }

  // The slack is for the frame the browser needs to start the transition at all: the timer
  // runs from now, the motion from the next paint, and a floor equal to the duration would
  // cut the last frames off every leave.
  const timer = setTimeout(finish, total + 50);
  element.addEventListener('transitionend', onEnd);

  return () => {
    if (finished) return;
    finished = true;
    element.removeEventListener('transitionend', onEnd);
    clearTimeout(timer);
  };
}
