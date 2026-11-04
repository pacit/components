import { Component, computed, input } from '@angular/core';
import type { PctChart } from './chart';
import type { PctColorScale } from './model/color';

/** A ramp as drawn: the scale, its class and the labels under its bar. */
interface PctRampView {
  readonly id: string;
  readonly scale: PctColorScale;
  readonly labels: readonly string[];
}

/**
 * The legend of a heatmap's colours
 * ([0111](../../../../docs/decisions/0111-a-heatmap-is-rows-the-scene-lays-and-a-colour-the-stylesheet-mixes.md)):
 * for every mark of the chart that paints by a colour scale (`PctMark.colorScale`), its name, a
 * bar of the ramp — the skin's tokens, blended by the stylesheet as the cells are — and the
 * values its ends stand for, the middle too for a diverging ramp. It is hidden from a reader:
 * the picture's description says the same reach in words, and the data table holds every value.
 *
 * It stands beside the chart, wherever the layout puts it.
 *
 * @example
 * <pct-chart #chart ariaLabel="Power by hour and day"> <pct-heat … /> </pct-chart>
 * <pct-chart-ramp [chart]="chart" />
 *
 * @since next
 */
@Component({
  selector: 'pct-chart-ramp',
  templateUrl: './ramp.html',
  styleUrl: './ramp.scss',
  host: { class: 'pct-chart-ramp', 'aria-hidden': 'true' },
})
export class PctChartRamp {
  /**
   * The chart whose colour scales the legend shows.
   *
   * @since next
   */
  readonly chart = input.required<PctChart>();

  /** One ramp per mark with a colour scale, in the order of the marks. */
  protected readonly ramps = computed<readonly PctRampView[]>(() => {
    const chart = this.chart();
    return chart.marks().flatMap((mark, i) => {
      const scale = mark.colorScale();
      if (!scale) return [];
      return [
        {
          id: `${i}:${scale.name}`,
          scale,
          labels: scale.domain.map((v) => chart.writeValue(v, scale.unit)),
        },
      ];
    });
  });
}
