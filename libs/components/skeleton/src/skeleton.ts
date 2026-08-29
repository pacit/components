import {
  afterNextRender,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  isDevMode,
  numberAttribute,
} from '@angular/core';

/**
 * Which drawing a skeleton is: the lines of a paragraph, or one box.
 *
 * There is no `circle` here, and its absence is the shape of the whole styling contract: a
 * disc is a `block` with `--pct-skeleton-track-radius: 50%`, so it is a token a consumer sets
 * and not a third drawing this component has to know about
 * ([0013](../../../../docs/decisions/0013-no-headless-split.md)).
 */
export type PctSkeletonShape = 'text' | 'block';

/**
 * A skeleton: the shape of content that has not arrived, drawn where the content will be.
 *
 * **There is no ARIA pattern for it, because it is not a widget and says nothing.** The
 * component is `aria-hidden` outright — the second in the library after `pct-icon`, and the
 * first whose silence is the whole point: a placeholder announced as anything at all would be
 * a reader describing a picture of text nobody has written yet
 * ([0050](../../../../docs/decisions/0050-a-skeleton-is-a-picture-of-a-wait.md)).
 *
 * **What has to be announced is the wait, and the wait belongs to the region.** `aria-busy`
 * is the platform's own name for "the content of this container has not arrived", the same
 * attribute `pct-select` writes on a listbox whose rows are still coming
 * ([0037](../../../../docs/decisions/0037-loading-is-a-fact-about-the-list.md)) — and here it
 * goes on the element the content will land in, which is the consumer's own. This component
 * cannot write it: it stands INSIDE that region, and a busy state written on a hidden child
 * is a fact about nothing. In dev mode it says so when nothing around it is marked busy.
 *
 * **Its size is the type it stands in for.** A line is `1lh` — the line box the browser
 * computes from the consumer's own font and line height — and the bar inside it is `1cap`,
 * the height of a capital letter in the same font. So `[lines]="3"` occupies exactly the
 * space three lines of text will occupy and the page does not move when they arrive; a
 * height in pixels would be right at the one font size it was chosen for
 * ([`lesson-136`](../../../../docs/lessons.md#lesson-136)).
 *
 * @example
 * <div [attr.aria-busy]="pending() ? 'true' : null">
 *   @if (pending()) {
 *     <pct-skeleton [lines]="3" />
 *   } @else {
 *     <p>{{ article().body }}</p>
 *   }
 * </div>
 */
@Component({
  selector: 'pct-skeleton',
  templateUrl: './skeleton.html',
  styleUrl: './skeleton.scss',
  host: {
    class: 'pct-skeleton',
    // The component draws and does not speak. Everything below it is a box with a colour,
    // there is no text anywhere in the template and nothing in it can take focus, so hiding
    // the subtree costs a reader nothing and saves them a description of content that does
    // not exist (`req-a11y-built-in`, 0050). What a reader needs to hear is `aria-busy` on
    // the region, and the region is not ours to write on.
    'aria-hidden': 'true',
    '[attr.data-pct-shape]': 'shape()',
  },
})
export class PctSkeleton {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /**
   * How many lines of the surrounding text this stands in for — one by default.
   *
   * It is a count of LINE BOXES and not of pixels, so the space held is the space the text
   * will take at whatever size it is set in. Anything that is not a whole number of at least
   * one is one: a skeleton is drawn because something is coming, and a placeholder for zero
   * lines of it is a component asking to be left out of the template instead.
   */
  readonly lines = input(1, { transform: skeletonLines });

  /**
   * Lines of text, or one box — `text` by default.
   *
   * A `block` holds the place of something that is not type: a picture, a map, an avatar. Its
   * box is the consumer's, because only they know what is coming; with no size given it is
   * one line of the surrounding text tall, which is the smallest thing worth standing in for.
   */
  readonly shape = input<PctSkeletonShape>('text');

  /**
   * One entry per bar to draw. A `block` is one bar however many lines were asked for —
   * `lines` counts lines of TEXT, and a box has none.
   */
  protected readonly bars = computed(() =>
    Array.from({ length: this.shape() === 'block' ? 1 : this.lines() }),
  );

  constructor() {
    if (isDevMode()) afterNextRender(() => this.warnOnSilentWait());
  }

  /**
   * A skeleton with nothing around it saying that anything is late — reported once, when the
   * placeholder first stands in the document.
   *
   * The question is asked of the platform rather than answered from the component's own
   * inputs: `closest('[aria-busy="true"]')` is the same walk a browser does for the cascade,
   * and it is the only way to see a fact that lives on somebody else's element. A skeleton is
   * hidden from the accessibility tree, so with no busy region above it the whole wait is
   * silent — a sighted user sees three grey bars and a screen-reader user is told nothing at
   * all until the content lands, which is the one defect this component can cause and the one
   * a static gate here cannot see: the region belongs to the consumer's application.
   */
  private warnOnSilentWait(): void {
    if (this.host.nativeElement.closest('[aria-busy="true"]')) return;
    console.warn(
      `[pct-skeleton] A skeleton with no region around it marked \`aria-busy="true"\`. ` +
        `Put it on the element the content will land in — the one this placeholder stands ` +
        `inside. A skeleton is drawn for an eye and hidden from the accessibility tree, so ` +
        `while nothing says the region is busy the wait is announced to nobody.`,
    );
  }
}

/**
 * The `lines` input's transform: a whole number of lines, at least one.
 *
 * `Number.isFinite` is not defensiveness for its own sake here — it is the one guard whose
 * absence has a cost bigger than a wrong drawing. `lines` decides the length of the array the
 * template repeats over, and `Array.from({ length: Infinity })` does not draw a very long
 * skeleton: it never returns. Text that does not parse, a negative number and a fraction are
 * all quieter mistakes, and all three answer with the default rather than with a guess.
 */
function skeletonLines(value: unknown): number {
  const parsed = Math.floor(numberAttribute(value));
  return Number.isFinite(parsed) && parsed >= 1 ? parsed : 1;
}
