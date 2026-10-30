import { NgTemplateOutlet } from '@angular/common';
import {
  booleanAttribute,
  Component,
  computed,
  contentChild,
  Directive,
  inject,
  input,
  output,
  TemplateRef,
} from '@angular/core';
import { PCT_TEXTS, pctQuantityFormat } from '@pacit/components/core';
import type { PctChart } from './chart';
import { pctSummarize, type PctSummary } from './model/summarize';
import type { PctSeriesIdentity, PctSwatchContext } from './scene';

/**
 * One entry of a legend: the series, its swatch and what the legend writes beside it.
 *
 * @since next
 */
export interface PctLegendEntry extends PctSeriesIdentity {
  readonly name: string;
  readonly unit: string;
  /** The value written beside the name — the reading under the cursor, or the summary — or `null`. */
  readonly value: string | null;
  /** Whether the series is hidden on the chart. */
  readonly hidden: boolean;
  /** The swatch template of the series' mark. */
  readonly swatch: TemplateRef<PctSwatchContext> | null;
}

/**
 * The context of a `pctLegendItem` template: the entry, and what toggles it.
 *
 * @since next
 */
export interface PctLegendItemContext {
  readonly $implicit: PctLegendEntry;
  /** Shows or hides the series on the chart. */
  readonly toggle: () => void;
}

/**
 * A row of the legend of the consumer's own: an `<ng-template pctLegendItem let-entry
 * let-toggle="toggle">` inside `pct-chart-legend`, stamped in place of the default row, inside
 * the list item.
 *
 * @since next
 */
@Directive({
  // The template is the slot: a row of the consumer's own, stamped by the legend.
  selector: 'ng-template[pctLegendItem]',
})
export class PctLegendItem {
  /**
   * The template the legend stamps.
   *
   * @since next
   */
  readonly template = inject<TemplateRef<PctLegendItemContext>>(TemplateRef);

  /**
   * Types the template's context for the compiler.
   *
   * @since next
   */
  static ngTemplateContextGuard(
    directive: PctLegendItem,
    context: unknown,
  ): context is PctLegendItemContext {
    void directive;
    void context;
    return true;
  }
}

/**
 * The legend of a chart
 * ([0102](../../../../docs/decisions/0102-a-series-owns-its-colour-and-the-colour-is-never-its-only-channel.md)):
 * a list with an entry per series — its swatch, drawn by its mark with its colour, its dash
 * and its marker, its name, its unit where the chart holds more than one, and a value — and a
 * button per entry that hides the series or shows it again, writing the chart's
 * `hiddenSeries`. The value is the reading under the cursor while there is one, and otherwise
 * what `value` asks: the latest reading in the window, their sum, their mean, or nothing.
 *
 * It stands beside the chart, wherever the layout puts it: a legend is no part of the picture.
 *
 * @example
 * <pct-chart #chart ariaLabel="Supply air"> … </pct-chart>
 * <pct-chart-legend [chart]="chart" value="latest" />
 *
 * @since next
 */
@Component({
  selector: 'pct-chart-legend',
  imports: [NgTemplateOutlet],
  templateUrl: './legend.html',
  styleUrl: './legend.scss',
  host: {
    class: 'pct-chart-legend',
    '[class.column]': 'layout() === "column"',
  },
})
export class PctChartLegend {
  /**
   * The chart whose series the legend lists.
   *
   * @since next
   */
  readonly chart = input.required<PctChart>();
  /**
   * What stands beside a name while no cursor is on the chart: the latest reading in the
   * window, the sum or the mean of the readings there, or nothing.
   *
   * @since next
   */
  readonly value = input<'latest' | PctSummary | 'none'>('none');
  /**
   * The entries in a row that wraps, or one under another.
   *
   * @since next
   */
  readonly layout = input<'row' | 'column'>('row');
  /**
   * Each entry gets a second button that takes the series off the chart: it emits `remove`
   * with the series' id, and the application drops the mark.
   *
   * @since next
   */
  readonly removable = input(false, { transform: booleanAttribute });
  /**
   * The id of the series whose remove button was pressed.
   *
   * @since next
   */
  readonly remove = output<string>();

  protected readonly texts = inject(PCT_TEXTS);
  private readonly item = contentChild(PctLegendItem);
  protected readonly custom = computed(() => this.item()?.template ?? null);

  private readonly format = computed(() =>
    pctQuantityFormat(this.chart().effectiveLocale(), {
      fractionDigits: [0, 3],
    }),
  );

  /**
   * The entries, in the chart's order.
   *
   * @since next
   */
  readonly entries = computed<readonly PctLegendEntry[]>(() => {
    const chart = this.chart();
    const hidden = new Set(chart.hiddenSeries());
    const places = chart.places();
    const reading = chart.reading();
    const units = new Set(chart.series().map((s) => s.unit)).size;
    return chart.series().map((s) => {
      const custom = typeof s.color === 'string';
      const isHidden = hidden.has(s.id);
      return {
        id: s.id,
        name: s.name,
        unit: units > 1 ? s.unit : '',
        place: custom ? 'custom' : (places.get(s.id) ?? 1),
        color: custom ? (s.color as string) : null,
        hidden: isHidden,
        value: isHidden
          ? null
          : (reading?.rows.find((r) => r.id === s.id)?.text ??
            this.summary(s.id, s.unit)),
        swatch: chart.markOf(s.id)?.swatch() ?? null,
      };
    });
  });

  /** The name of a remove button: the action, then the series. */
  protected removeName(entry: PctLegendEntry): string {
    return `${this.texts().chartRemove}: ${entry.name}`;
  }

  protected toggle(entry: PctLegendEntry): void {
    const chart = this.chart();
    const hidden = chart.hiddenSeries();
    chart.hiddenSeries.set(
      entry.hidden
        ? hidden.filter((id) => id !== entry.id)
        : [...hidden, entry.id],
    );
  }

  protected toggler(entry: PctLegendEntry): () => void {
    return () => this.toggle(entry);
  }

  /** What `value` asks for, written with the unit; `null` for none or nothing to write. */
  private summary(id: string, unit: string): string | null {
    const mode = this.value();
    const chart = this.chart();
    const shown = chart.shown();
    if (mode === 'none' || !shown) return null;
    const mark = chart.markOf(id);
    if (!mark) return null;
    const value =
      mode === 'latest'
        ? chart.valueAt(id, shown.to)
        : pctSummarize(mark.readings(id), shown, mode);
    if (value === null) return this.texts().chartGap;
    if (unit === 'boolean')
      return value >= 0.5 ? this.texts().chartOn : this.texts().chartOff;
    const number = this.format().format(value);
    return unit ? `${number} ${unit}` : number;
  }
}
