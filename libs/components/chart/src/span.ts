import {
  Component,
  computed,
  input,
  TemplateRef,
  viewChild,
} from '@angular/core';
import { PctAnnotation } from './annotation';
import { PctMark, type PctSwatchContext } from './scene';

/** How far the label stands inside the band's corner. */
const GAP = 4;

/**
 * A band across the plot between two positions — a night tariff, a holiday — or between two
 * values of a unit — a comfort range — drawn under the series, with its label in its corner.
 * It brings no series: no axis, no column in the table, and no legend entry unless `legend`
 * asks for one; a reader hears it in the picture's description
 * (`Night tariff 25 October 2026 22:00 – 26 October 2026 06:00.`).
 *
 * @example
 * <pct-span [from]="night" [to]="morning" label="Night tariff" />
 * <pct-span axis="y" [from]="20" [to]="22" unit="°C" label="Comfort" color="2" />
 *
 * @since next
 */
@Component({
  selector: 'pct-span',
  templateUrl: './span.html',
  styleUrl: './span.scss',
  providers: [{ provide: PctMark, useExisting: PctSpan }],
})
export class PctSpan extends PctAnnotation {
  /**
   * Where the band starts: a position on the x axis, or a value of `unit` when `axis` is `y`.
   *
   * @since next
   */
  readonly from = input.required<number>();
  /**
   * Where the band ends.
   *
   * @since next
   */
  readonly to = input.required<number>();
  /**
   * The axis the band spans: `x`, between two positions, or `y`, between two values of `unit`.
   *
   * @since next
   */
  readonly axis = input<'x' | 'y'>('x');
  /**
   * The unit whose axis `from` and `to` are read on when `axis` is `y`.
   *
   * @since next
   */
  readonly unit = input('');

  protected override readonly kind = () => this.texts().chartSpan;
  protected override readonly inLayer = 'back' as const;

  override readonly template =
    viewChild.required<TemplateRef<unknown>>('drawing');
  override readonly swatch =
    viewChild.required<TemplateRef<PctSwatchContext>>('swatch');

  /** The band and its label, or nothing: hidden, off the plot, or on an axis the scene has not. */
  protected readonly drawn = computed(() => {
    if (this.hidden()) return null;
    const { left, top, right, bottom } = this.scene.frame();
    const horizontal = this.scene.orientation() === 'horizontal';
    let a: number;
    let b: number;
    let alongX: boolean;
    if (this.axis() === 'y') {
      const scale = this.scene.yScales().get(this.unit());
      if (!scale) return null;
      [a, b] = [scale.map(this.from()), scale.map(this.to())];
      alongX = false;
    } else {
      const scale = this.scene.xScale();
      const shown = this.scene.shown();
      if (!scale || !shown) return null;
      const from = Math.max(Math.min(this.from(), this.to()), shown.from);
      const to = Math.min(Math.max(this.from(), this.to()), shown.to);
      if (to <= from) return null;
      [a, b] = [scale.map(from), scale.map(to)];
      alongX = true;
    }
    const near = Math.min(a, b);
    const far = Math.max(a, b);
    // A band of positions stands in an upright chart and lies in a turned one.
    const standing = alongX !== horizontal;
    const rect = standing
      ? { x: near, y: top, width: far - near, height: bottom - top }
      : { x: left, y: near, width: right - left, height: far - near };
    return {
      rect,
      label: { x: rect.x + GAP, y: rect.y + GAP },
    };
  });

  /**
   * The name and the two ends, written as values or as positions.
   *
   * @since next
   */
  override describe(): string {
    const [from, to] =
      this.axis() === 'y'
        ? [
            this.scene.writeValue(this.from(), this.unit()),
            this.scene.writeValue(this.to(), this.unit()),
          ]
        : [
            this.scene.writePosition(this.from(), 'full'),
            this.scene.writePosition(this.to(), 'full'),
          ];
    return this.sentence(`${from} – ${to}`);
  }
}
