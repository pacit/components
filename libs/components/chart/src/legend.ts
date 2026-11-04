import { NgTemplateOutlet } from '@angular/common';
import {
  booleanAttribute,
  Component,
  computed,
  contentChild,
  Directive,
  inject,
  input,
  type ModelSignal,
  output,
  type Signal,
  TemplateRef,
} from '@angular/core';
import { PCT_TEXTS } from '@pacit/components/core';
import type { PctChartReading } from './chart';
import type { PctSummary } from './model/summarize';
import type {
  PctMark,
  PctSeriesIdentity,
  PctSeriesSpec,
  PctSwatchContext,
} from './scene';

/**
 * What a legend lists: a chart's series, or a pie's slices
 * ([0115](../../../../docs/decisions/0115-a-pie-is-a-scene-of-shares-and-a-gauge-is-a-meter-drawn-as-an-arc.md)).
 * `PctChart` and `PctPie` are the two sources; the legend asks nothing else of either.
 *
 * @since next
 */
export interface PctLegendSource {
  /** The series, in order. */
  readonly series: Signal<readonly PctSeriesSpec[]>;
  /** The ids not drawn: what a toggle of the legend writes. */
  readonly hiddenSeries: ModelSignal<readonly string[]>;
  /** The palette place of each series. */
  readonly places: Signal<ReadonlyMap<string, number>>;
  /** What the cursor reads, or `null`: the value the legend writes beside a series while there is one. */
  readonly reading: Signal<PctChartReading | null>;
  /** The marks whose `legendEntries` stand after the series; none on a pie. */
  readonly marks: Signal<readonly PctMark[]>;
  /** The swatch template a series is drawn small with, or `null` for none. */
  swatchOf(id: string): TemplateRef<PctSwatchContext> | null;
  /** What stands beside a series while no cursor is on the picture, for `value`, or `null` for nothing. */
  summaryOf(id: string, mode: 'latest' | PctSummary): string | null;
}

/**
 * One entry of a legend: the series, its swatch and what the legend writes beside it.
 *
 * @since 0.3.0
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
 * @since 0.3.0
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
 * @since 0.3.0
 */
@Directive({
  // The template is the slot: a row of the consumer's own, stamped by the legend.
  selector: 'ng-template[pctLegendItem]',
})
export class PctLegendItem {
  /**
   * The template the legend stamps.
   *
   * @since 0.3.0
   */
  readonly template = inject<TemplateRef<PctLegendItemContext>>(TemplateRef);

  /**
   * Types the template's context for the compiler.
   *
   * @since 0.3.0
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
 * a list (the host) with an entry per series — its swatch, drawn by its mark with its colour, its dash
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
 * @since 0.3.0
 */
@Component({
  selector: 'pct-chart-legend',
  imports: [NgTemplateOutlet],
  templateUrl: './legend.html',
  styleUrl: './legend.scss',
  host: {
    class: 'pct-chart-legend',
    role: 'list',
    '[class.column]': 'layout() === "column"',
    '[attr.aria-label]':
      'ariaLabelledby() ? null : ariaLabel() || texts().chartLegend',
    '[attr.aria-labelledby]': 'ariaLabelledby() || null',
  },
})
export class PctChartLegend {
  /**
   * The chart whose series the legend lists, or the pie whose slices.
   *
   * @since 0.3.0
   */
  readonly chart = input.required<PctLegendSource>();
  /**
   * The list's name, which a reader announces on entering it: `chartLegend` ("Series") when
   * unset. Two legends on one page take names that tell them apart.
   *
   * @since 0.3.0
   */
  readonly ariaLabel = input('');
  /**
   * As `ariaLabel`, for a name that already stands on the page: the chart's heading.
   *
   * @since 0.3.0
   */
  readonly ariaLabelledby = input('');
  /**
   * What stands beside a name while no cursor is on the chart: the latest reading in the
   * window, the sum or the mean of the readings there, or nothing.
   *
   * @since 0.3.0
   */
  readonly value = input<'latest' | PctSummary | 'none'>('none');
  /**
   * The entries in a row that wraps, or one under another.
   *
   * @since 0.3.0
   */
  readonly layout = input<'row' | 'column'>('row');
  /**
   * Each entry gets a second button that takes the series off the chart: it emits `remove`
   * with the series' id, and the application drops the mark.
   *
   * @since 0.3.0
   */
  readonly removable = input(false, { transform: booleanAttribute });
  /**
   * The id of the series whose remove button was pressed.
   *
   * @since 0.3.0
   */
  readonly remove = output<string>();

  protected readonly texts = inject(PCT_TEXTS);
  private readonly item = contentChild(PctLegendItem);
  protected readonly custom = computed(() => this.item()?.template ?? null);

  /**
   * The entries, in the chart's order.
   *
   * @since 0.3.0
   */
  readonly entries = computed<readonly PctLegendEntry[]>(() => {
    const chart = this.chart();
    const hidden = new Set(chart.hiddenSeries());
    const places = chart.places();
    const reading = chart.reading();
    const units = new Set(chart.series().map((s) => s.unit)).size;
    const series = chart.series().map((s): PctLegendEntry => {
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
            this.summary(s.id)),
        swatch: chart.swatchOf(s.id),
      };
    });
    // The annotations asked to stand here, after the series: no unit, and as the value the text
    // of the tooltip's note of the same id, where the mark writes one — a band's state under
    // the cursor and how long it holds.
    const extras = chart.marks().flatMap((mark) =>
      mark.legendEntries().map((entry): PctLegendEntry => {
        const isHidden = hidden.has(entry.id);
        return {
          ...entry,
          unit: '',
          hidden: isHidden,
          value: isHidden
            ? null
            : (reading?.notes.find((n) => n.id === entry.id)?.text ?? null),
          swatch: mark.swatch(),
        };
      }),
    );
    return [...series, ...extras];
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

  /** What `value` asks for, as the source writes it; `null` for none or nothing to write. */
  private summary(id: string): string | null {
    const mode = this.value();
    return mode === 'none' ? null : this.chart().summaryOf(id, mode);
  }
}
