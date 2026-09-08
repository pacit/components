import { DestroyRef } from '@angular/core';

/**
 * The reading line: a heading is "passed" once it is this far up the viewport, which is a
 * little below the sticky bar rather than exactly at it — a section whose heading is level
 * with the top edge is one the reader is arriving at, not one they are in.
 */
const READING_LINE = 120;

/**
 * The scroll spy: of every `[data-spy]` on the page, the last one that has passed the reading
 * line is the one the reader is in, and an index anywhere on the page can light it.
 *
 * One copy, two pages — the component page's table of contents and the gallery's band bar ask
 * the same question of the same DOM, and a second hand-written listener would be the shape
 * `lesson-21` names. It reads the DOM fresh on every frame rather than holding a list, so a
 * page whose sections come and go under a filter needs no rewiring; what it returns is that
 * reading itself, for a caller that wants to take it again without waiting for a scroll.
 *
 * Browser only: with no view there is nothing to scroll and nothing to measure, and the
 * prerender's answer would be a section nobody is looking at.
 */
export function spyOnSections(
  document: Document,
  destroyRef: DestroyRef,
  onActive: (id: string) => void,
): (() => void) | null {
  const view = document.defaultView;
  if (!view) return null;

  let ticking = false;
  const spy = () => {
    ticking = false;
    const targets = Array.from(
      document.querySelectorAll<HTMLElement>('[data-spy]'),
    );
    if (!targets.length) return;
    let current = targets[0];
    for (const target of targets)
      if (target.getBoundingClientRect().top <= READING_LINE) current = target;
    // At the very bottom the last section may never reach the line — a short one never
    // will — so the end of the page belongs to the end of the index.
    if (view.innerHeight + view.scrollY >= document.body.offsetHeight - 2)
      current = targets[targets.length - 1];
    onActive(current.id);
  };

  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    view.requestAnimationFrame(spy);
  };

  view.addEventListener('scroll', onScroll, { passive: true });
  destroyRef.onDestroy(() => view.removeEventListener('scroll', onScroll));
  spy();
  return spy;
}
