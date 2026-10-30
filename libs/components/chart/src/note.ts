import {
  Component,
  computed,
  input,
  TemplateRef,
  viewChild,
} from '@angular/core';
import { PctAnnotation } from './annotation';
import type { PctNoteBox } from './model/notes';
import { PctMark, type PctSwatchContext } from './scene';

/** The text's padding inside its box, sideways and up and down. */
const PAD_X = 6;
const PAD_Y = 2;
/** The dot on the point. */
const DOT = 3;

/**
 * A text on a point of the plot — "Window opened", "Filter changed" — in a box over the point
 * or under it, with a leader to the point, drawn over the series. The scene places every note
 * together so that none covers another and every one stays on the plot (`pctPlaceNotes`):
 * `position` asks for a side, `auto` takes the first with room. It brings no series; a reader
 * hears it in the picture's description (`Window opened (25 October 2026 14:10, 19.2 °C).`).
 *
 * @example
 * <pct-note [x]="opened" [y]="19.2" unit="°C" text="Window opened" />
 *
 * @since next
 */
@Component({
  selector: 'pct-note',
  templateUrl: './note.html',
  styleUrl: './note.scss',
  providers: [{ provide: PctMark, useExisting: PctNote }],
})
export class PctNote extends PctAnnotation {
  /**
   * The point's position on the x axis.
   *
   * @since next
   */
  readonly x = input.required<number>();
  /**
   * The point's value, on the axis of `unit`.
   *
   * @since next
   */
  readonly y = input.required<number>();
  /**
   * The unit whose axis `y` is read on.
   *
   * @since next
   */
  readonly unit = input('');
  /**
   * The note's text, written in its box; the `label` of the other annotations.
   *
   * @since next
   */
  readonly text = input.required<string>();
  /**
   * The side of the point the box stands on: `above`, `below`, or the first with room.
   *
   * @since next
   */
  readonly position = input<'above' | 'below' | 'auto'>('auto');

  protected override readonly kind = () => this.text();
  protected override readonly inLayer = 'front' as const;

  override readonly template =
    viewChild.required<TemplateRef<unknown>>('drawing');
  override readonly swatch =
    viewChild.required<TemplateRef<PctSwatchContext>>('swatch');

  /** The point in pixels and the box's size, or nothing while the point is off the plot. */
  private readonly box = computed<PctNoteBox | null>(() => {
    if (this.hidden()) return null;
    const xScale = this.scene.xScale();
    const yScale = this.scene.yScales().get(this.unit());
    const shown = this.scene.shown();
    const x = this.x();
    if (!xScale || !yScale || !shown || x < shown.from || x > shown.to)
      return null;
    const along = xScale.map(x);
    const across = yScale.map(this.y());
    const horizontal = this.scene.orientation() === 'horizontal';
    return {
      id: this.key(),
      x: horizontal ? across : along,
      y: horizontal ? along : across,
      width: this.scene.measure(this.text()) + 2 * PAD_X,
      height: this.scene.lineHeight() + 2 * PAD_Y,
      prefer: this.position(),
    };
  });

  /**
   * The one box of this note, for the scene to place with the others.
   *
   * @since next
   */
  override noteBoxes(): readonly PctNoteBox[] {
    const box = this.box();
    return box ? [box] : [];
  }

  /** The dot, the leader, the box and the text, where the scene placed them. */
  protected readonly drawn = computed(() => {
    const box = this.box();
    const placed = box && this.scene.placedNote(box.id);
    if (!box || !placed) return null;
    const middle = placed.left + box.width / 2;
    return {
      dot: { cx: box.x, cy: box.y, r: DOT },
      leader: {
        x1: box.x,
        y1: box.y,
        x2: middle,
        y2: placed.side === 'above' ? placed.top + box.height : placed.top,
      },
      box: {
        x: placed.left,
        y: placed.top,
        width: box.width,
        height: box.height,
      },
      text: { x: placed.left + PAD_X, y: placed.top + box.height / 2 },
    };
  });

  /**
   * The text, then the position and the value in brackets.
   *
   * @since next
   */
  override describe(): string {
    return this.sentence(
      `(${this.scene.writePosition(this.x(), 'full')}, ${this.scene.writeValue(this.y(), this.unit())})`,
    );
  }
}
