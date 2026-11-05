import {
  effect,
  ElementRef,
  inject,
  linkedSignal,
  untracked,
  type Signal,
} from '@angular/core';
import type { PctColumns } from './model/columns';
import { pctTween, pctTweenable } from './model/tween';

/** A duration token's milliseconds: `150ms` or `0.15s`; `NaN` for anything else. */
function milliseconds(value: string): number {
  const text = value.trim();
  const number = Number.parseFloat(text);
  return text.endsWith('ms') ? number : number * 1000;
}

/**
 * The columns a mark draws from `readings`: the readings themselves, or, while `animate` is on
 * and a change only moved their values, the readings on their way there from what was drawn
 * ([0121](../../../../docs/decisions/0121-live-data-is-read-where-it-changed.md)). The way
 * takes twice the motion axis's transition and its easing, as the table's rows do (0116), so
 * `prefers-reduced-motion`, which takes the transition to nought, draws every change at once.
 * The easing is the browser's own, read off an effect with no target. Called where a mark is
 * built.
 */
export function pctTweened(
  readings: Signal<PctColumns>,
  animate: Signal<boolean>,
): Signal<PctColumns> {
  const host = inject(ElementRef).nativeElement as HTMLElement;
  // What is drawn stays where it was when the change can be eased, and the effect below moves
  // it; any other change is drawn as it comes.
  const drawn = linkedSignal<PctColumns, PctColumns>({
    source: readings,
    computation: (to, previous) =>
      previous && untracked(animate) && pctTweenable(previous.value, to)
        ? previous.value
        : to,
  });
  effect((onCleanup) => {
    const to = readings();
    const from = untracked(drawn);
    if (from === to) return;
    const view = host.ownerDocument.defaultView;
    if (!view || typeof view.KeyframeEffect !== 'function') {
      drawn.set(to);
      return;
    }
    const style = view.getComputedStyle(host);
    const duration =
      2 *
      milliseconds(style.getPropertyValue('--pct-motion-transition-duration'));
    // Under a millisecond, or no duration at all: nothing to see on the way.
    if (!(duration >= 1)) {
      drawn.set(to);
      return;
    }
    const easing =
      style.getPropertyValue('--pct-motion-transition-easing').trim() || 'ease';
    let timing: KeyframeEffect;
    try {
      timing = new view.KeyframeEffect(null, null, {
        duration,
        easing,
        fill: 'forwards',
      });
    } catch {
      // An easing the browser does not read: the default one.
      timing = new view.KeyframeEffect(null, null, {
        duration,
        fill: 'forwards',
      });
    }
    const animation = new view.Animation(timing, host.ownerDocument.timeline);
    animation.play();
    const step = () => {
      if (animation.playState === 'finished') {
        drawn.set(to);
        return;
      }
      drawn.set(pctTween(from, to, timing.getComputedTiming().progress ?? 0));
      frame = view.requestAnimationFrame(step);
    };
    let frame = view.requestAnimationFrame(step);
    onCleanup(() => {
      view.cancelAnimationFrame(frame);
      animation.cancel();
    });
  });
  return drawn.asReadonly();
}
