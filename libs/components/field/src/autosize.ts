import {
  afterNextRender,
  DestroyRef,
  Directive,
  effect,
  ElementRef,
  inject,
  input,
  isDevMode,
  numberAttribute,
  untracked,
} from '@angular/core';
import { NgControl } from '@angular/forms';
import { PctText } from './text';

/**
 * Which of the two roads is open here — and `none`, which is anywhere with no layout to ask:
 * a server, and a test runner.
 *
 * Measured rather than assumed: `field-sizing: content` is in chromium 149 and webkit 26.5
 * and **absent from firefox 151**, where the absence is silent and total — a `rows="2"` box
 * stays two lines tall whatever is typed into it.
 *
 * The third answer is deliberately not `isPlatformBrowser`: the question is not where the
 * code runs but whether there is an engine to ask, and where there is no `CSS` object there
 * is no layout either — a server and jsdom both answer `none`, and both are right. It also
 * keeps `@angular/common` out of this entrypoint, which the dependency policy admits for
 * `NgTemplateOutlet` and nothing else.
 */
const roadHere = (): 'platform' | 'measured' | 'none' => {
  if (typeof CSS === 'undefined') return 'none';
  return CSS.supports('field-sizing', 'content') ? 'platform' : 'measured';
};

/**
 * A `<textarea>` as tall as what is written in it — the ARIA APG has no pattern for this,
 * because it is not a behaviour but a height.
 *
 * **Where the height comes from is the engine's business first**
 * ([0041](../../../../docs/decisions/0041-a-height-the-platform-computes.md)): with
 * `field-sizing: content` the box is laid out against its own text, which costs no script,
 * survives an SSR first paint and follows a rewrap nothing told us about. Where the property
 * is missing the same height is **measured**, and the fallback then has to be told three
 * separate things the CSS road gets for free — the three numbered comments in the constructor.
 *
 * It is a **directive** and not an input on `PctText` for the reason
 * [0034](../../../../docs/decisions/0034-multiplicity-is-a-tag.md) gave for a tag: what the
 * type cannot say, the selector says. `PctText` also serves `input[pctText]`, where a height
 * that follows the content means nothing — an `autosize` input there would be an API in a
 * shape where it does nothing. And it cannot be a component, because `PctText` already is
 * one on that element and Angular matches one component to an element; a directive carries no
 * stylesheet, so the rules live in the control's own sheet behind `[data-pct-autosize]`,
 * which this writes.
 *
 * @example
 * <pct-field label="About">
 *   <textarea pctText pctAutosize rows="3" maxRows="8" [(value)]="bio"></textarea>
 * </pct-field>
 *
 * @since 0.1.0
 */
@Directive({
  selector: 'textarea[pctText][pctAutosize]',
  host: {
    'data-pct-autosize': '',
    // Written back to the DOM because the input above has taken it: a bound `[rows]` is
    // consumed by a directive input and never reaches the element, and the measured road
    // takes its floor from the element's own `rows` sizing. Both roads read one number.
    '[attr.rows]': 'rows()',
    '[style.--_pct-text-rows]': 'rows()',
    '[attr.data-pct-capped]': 'maxRows() > 0 ? "" : null',
    // `lh` is the element's own line box — the arithmetic stays in the engine, in both roads.
    '[style.max-block-size]': 'maxRows() > 0 ? maxRows() + "lh" : null',
    '(input)': 'fit()',
  },
})
export class PctAutosize {
  private readonly el = inject<ElementRef<HTMLTextAreaElement>>(ElementRef);
  private readonly text = inject(PctText);

  /**
   * The floor, in lines — the platform's own `rows`, kept as the platform spells it
   * ([`req-api-platform`](../../../../docs/requirements/api.md#req-api-platform)) and read
   * here only because `field-sizing: content` **discards** it: measured, an empty
   * `rows="2"` box under the property is 34 px, one line, against the 58 a plain one is.
   *
   * @since 0.1.0
   */
  readonly rows = input(2, { transform: numberAttribute });

  /**
   * The ceiling, in lines; `0` is no ceiling. This one has no native spelling, so it is an
   * input. Past it the box scrolls rather than clipping — measured in three engines, on both
   * roads.
   *
   * @since 0.1.0
   */
  readonly maxRows = input(0, { transform: numberAttribute });

  /**
   * Set once: the road is a property of the engine, and an engine does not change. Anything
   * that is not the platform road is this one — an engine without the property, and equally
   * an environment with no engine to ask, which takes the same code down to `ready` below.
   */
  private readonly measures = roadHere() !== 'platform';

  /**
   * Is there anything to measure yet? Set at the first render and never unset.
   *
   * This is the whole of the SSR guard, and it is structural rather than a platform string:
   * `afterNextRender` does not run on a server, so on a server no height is ever written —
   * which also states the cost of the measured road plainly. Where `field-sizing` is missing
   * the server sends the FLOOR and the real height arrives at hydration; where the property
   * exists the first paint is already right, with no script involved at all.
   */
  private ready = false;

  /** The last width the height was measured at — see the resize observer below. */
  private width = 0;

  constructor() {
    if (isDevMode()) {
      effect(() => {
        if (this.maxRows() > 0 && this.maxRows() < this.rows())
          console.warn(
            `[pct-autosize] maxRows (${this.maxRows()}) is below rows (${this.rows()}), ` +
              `so the ceiling stands under the floor and CSS keeps the floor. Raise maxRows ` +
              `or lower rows.`,
          );
      });
    }

    if (!this.measures) return;

    // 1. the value this control owns — `[(value)]` and signal forms both land here.
    effect(() => {
      this.text.value();
      untracked(() => this.fit());
    });

    const classic = inject(NgControl, { optional: true, self: true });
    const destroyRef = inject(DestroyRef);

    afterNextRender(() => {
      // 2. the value written with no event at all. `DefaultValueAccessor.writeValue` assigns
      //    `element.value` and dispatches nothing, so a `patchValue` on a classic form is
      //    invisible to `(input)` — measured: the CSS road grows from 39 px to 59, the
      //    measured one stays at 39 and hides two lines of the text.
      //
      //    Subscribed HERE and not in the constructor, which is where it belongs by every
      //    other habit: `NgControl.valueChanges` forwards to a control the forms directive
      //    binds in its own `ngOnChanges`, so at construction the getter answers `null` and
      //    the subscription is to nothing — with no error to say so
      //    ([`lesson-114`](../../../../docs/lessons.md#lesson-114)).
      //    Unsubscribed through the `DestroyRef` this scope already holds rather than through
      //    `takeUntilDestroyed`. The operator is the idiom and it is what put
      //    `@angular/core/rxjs-interop` in `./field`'s external column — 35 B and a whole
      //    entrypoint of the framework, for a teardown these two lines already have a handle
      //    on. The bytes are not the argument; the line in the snapshot is.
      const changes = classic?.valueChanges?.subscribe(() => this.fit());
      if (changes) destroyRef.onDestroy(() => changes.unsubscribe());

      this.ready = true;
      this.fit();

      // 3. a width that changed under the text. Nothing announces a rewrap: narrowed from
      //    354 px to 268 the CSS road goes 39 px -> 59 by itself, and before this observer
      //    existed the measured one stayed at 39 with a line of the text out of sight.
      //
      //    The guard inside it is the point of it — our own `fit` changes the height and
      //    wakes the observer again, which is
      //    [`lesson-110`](../../../../docs/lessons.md#lesson-110)'s loop waiting to happen,
      //    so only a changed WIDTH is a reason to measure again.
      //
      //    Last, and asked for rather than assumed: this is the one part of the road that
      //    needs an API outside the DOM core, and jsdom has none. Built first, its absence
      //    took the subscription and the first fit down with it; built here, an environment
      //    without it still follows every value and only misses a rewrap.
      if (typeof ResizeObserver === 'undefined') return;
      const observer = new ResizeObserver(() => {
        const width = this.el.nativeElement.clientWidth;
        if (width === this.width) return;
        this.width = width;
        this.fit();
      });
      observer.observe(this.el.nativeElement);
      destroyRef.onDestroy(() => observer.disconnect());
    });
  }

  /**
   * One height, measured. Two corrections, and both of them are defects if left out:
   *
   * - **the reset.** `scrollHeight` never reports less than the box already is, so without
   *   `height: auto` first the box grows and never shrinks — measured at 294 px kept after
   *   the value went back to a single line, in all three engines.
   * - **the border.** `scrollHeight` is the padding box while `height` under
   *   `box-sizing: border-box` is the border box, so `height = scrollHeight` leaves the box
   *   short by exactly the border and scrolling by it — 2 px, in all three engines.
   *
   * Physical rather than logical on purpose: `scrollHeight` is a vertical measurement, so
   * the property it feeds is the vertical one.
   *
   * And it is an **integer** one, which is why the two roads agree to within a pixel rather
   * than to the pixel: on the same three-line value chromium lays out 58.78 px and the
   * measured road here writes 59. A gate that compares them compares with a tolerance
   * ([`lesson-111`](../../../../docs/lessons.md#lesson-111) on a second reading).
   */
  protected fit(): void {
    if (!this.measures || !this.ready) return;
    const el = this.el.nativeElement;
    const style = getComputedStyle(el);
    // `|| 0` twice, and it has a measured witness rather than a worry: for an element that is
    // not in the document `getComputedStyle` answers `''` for every length — in all three
    // engines, whether it was removed or never inserted. `parseFloat('')` is `NaN`, and
    // `height: NaNpx` is a declaration the browser DROPS, so the box would keep whatever
    // height it had with nothing to say why.
    const border =
      (parseFloat(style.borderTopWidth) || 0) +
      (parseFloat(style.borderBottomWidth) || 0);
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight + border}px`;
    this.width = el.clientWidth;
  }
}
