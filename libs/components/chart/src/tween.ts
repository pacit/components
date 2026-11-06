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
  return pctEased(readings, animate, COLUMNS);
}

/**
 * How a drawn value moves: whether a change from one value to another only moves what can be
 * eased, and where the value stands `progress` of the way.
 */
export interface PctWay<T> {
  readonly tweenable: (from: T, to: T) => boolean;
  readonly tween: (from: T, to: T, progress: number) => T;
}

/**
 * `way` over a value that may be missing: a value that comes or goes is drawn at once, and two
 * that are there move as `way` moves them.
 */
export function pctOrNone<T>(way: PctWay<T>): PctWay<T | null> {
  return {
    tweenable: (from, to) =>
      from !== null && to !== null && way.tweenable(from, to),
    tween: (from, to, progress) =>
      from === null || to === null ? to : way.tween(from, to, progress),
  };
}

/** A series' columns: the values move, the positions stay. */
const COLUMNS: PctWay<PctColumns> = {
  tweenable: pctTweenable,
  tween: pctTween,
};

/**
 * What is drawn of `value`: the value itself, or, while `animate` is on and `way` can ease the
 * change, the value on its way there from what was drawn, as `pctTweened` moves a series'
 * columns. Called where a mark is built.
 */
export function pctEased<T>(
  value: Signal<T>,
  animate: Signal<boolean>,
  way: PctWay<T>,
): Signal<T> {
  const host = inject(ElementRef).nativeElement as HTMLElement;
  // What is drawn stays where it was when the change can be eased, and the effect below moves
  // it; any other change is drawn as it comes.
  const drawn = linkedSignal<T, T>({
    source: value,
    computation: (to, previous) =>
      previous && untracked(animate) && way.tweenable(previous.value, to)
        ? previous.value
        : to,
  });
  effect((onCleanup) => {
    const to = value();
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
      drawn.set(way.tween(from, to, timing.getComputedTiming().progress ?? 0));
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
