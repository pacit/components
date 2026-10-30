import {
  booleanAttribute,
  Component,
  computed,
  input,
  TemplateRef,
  viewChild,
} from '@angular/core';
import { PctAnnotation } from './annotation';
import { PctMark, type PctSwatchContext } from './scene';

/** How far a label stands from the line and from the plot's edge. */
const GAP = 4;

/**
 * A line across the plot at a value — a limit, a set point, a mean — or at a position, with
 * its label at its end, drawn over the series. It brings no series: no axis, no column in the
 * table, and no legend entry unless `legend` asks for one; a reader hears it in the picture's
 * description (`Comfort 21 °C.`).
 *
 * @example
 * <pct-reference [y]="21" unit="°C" label="Comfort" dash />
 * <pct-reference [x]="noon" label="Noon" color="3" />
 *
 * @since next
 */
@Component({
  selector: 'pct-reference',
  templateUrl: './reference.html',
  styleUrl: './reference.scss',
  providers: [{ provide: PctMark, useExisting: PctReference }],
})
export class PctReference extends PctAnnotation {
  /**
   * The value the line stands at, on the axis of `unit`; the line is drawn across the plot.
   *
   * @since next
   */
  readonly y = input<number | null>(null);
  /**
   * The unit whose axis `y` is read on: `°C`, `kWh`, `''` for a plain number.
   *
   * @since next
   */
  readonly unit = input('');
  /**
   * The position the line stands at, when it marks a moment or a category rather than a
   * value; `y` wins when both are set.
   *
   * @since next
   */
  readonly x = input<number | null>(null);
  /**
   * The line is dashed.
   *
   * @since next
   */
  readonly dash = input(false, { transform: booleanAttribute });

  protected override readonly kind = () => this.texts().chartReference;
  protected override readonly inLayer = 'front' as const;

  override readonly template =
    viewChild.required<TemplateRef<unknown>>('drawing');
  override readonly swatch =
    viewChild.required<TemplateRef<PctSwatchContext>>('swatch');

  /** The line and its label, or nothing: hidden, off the plot, or on an axis the scene has not. */
  protected readonly drawn = computed(() => {
    if (this.hidden()) return null;
    const { left, top, right, bottom } = this.scene.frame();
    const horizontal = this.scene.orientation() === 'horizontal';
    const y = this.y();
    const x = this.x();
    let px: number;
    // The line runs across the x axis for a value, along it for a position; the label stands
    // at the end of a value's line and at the start of a position's.
    let across: boolean;
    if (y !== null) {
      const scale = this.scene.yScales().get(this.unit());
      if (!scale) return null;
      px = scale.map(y);
      across = true;
    } else if (x !== null) {
      const scale = this.scene.xScale();
      const shown = this.scene.shown();
      if (!scale || !shown || x < shown.from || x > shown.to) return null;
      px = scale.map(x);
      across = false;
    } else return null;
    // A value's line lies in an upright chart and stands in a turned one.
    const lying = across !== horizontal;
    return lying
      ? {
          line: { x1: left, x2: right, y1: px, y2: px },
          label: {
            x: right - GAP,
            y: px - GAP,
            anchor: 'end' as const,
            baseline: 'auto' as const,
          },
        }
      : {
          line: { x1: px, x2: px, y1: top, y2: bottom },
          label: {
            x: px + GAP,
            y: top + GAP,
            anchor: 'start' as const,
            baseline: 'hanging' as const,
          },
        };
  });

  /**
   * The name and the value with its unit, or the position.
   *
   * @since next
   */
  override describe(): string {
    const y = this.y();
    const x = this.x();
    if (y !== null) return this.sentence(this.scene.writeValue(y, this.unit()));
    if (x !== null) return this.sentence(this.scene.writePosition(x, 'full'));
    return '';
  }
}
