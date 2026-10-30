import {
  booleanAttribute,
  computed,
  Directive,
  inject,
  input,
} from '@angular/core';
import { PCT_TEXTS } from '@pacit/components/core';
import { pctSeriesColor } from './line';
import type { PctColumns } from './model/columns';
import type { PctDomain } from './model/scale';
import type { PctWindow } from './model/window';
import {
  PctChartScene,
  PctMark,
  type PctLegendExtra,
  type PctMarkLayer,
  type PctSeriesIdentity,
} from './scene';

/** The columns of a mark that has no readings: nothing for the table to walk. */
const NO_READINGS: PctColumns = {
  xs: new Float64Array(0),
  ys: new Float64Array(0),
  length: 0,
};

/**
 * What a reference line, a band, a note and the line of now share: a mark on the scene that
 * brings no series — no axis, no column in the data table, no entry in the legend unless
 * `legend` asks for one — and draws in a layer under the series or over them. It is told
 * apart by a `label` and a `color`, and a reader hears it in the picture's description
 * ([0099](../../../../docs/decisions/0099-a-chart-is-scales-the-marks-share-and-a-ready-chart-is-a-recipe.md)).
 *
 * @since next
 */
@Directive({
  // A base: no selector and no host of its own; each annotation that extends it has both.
})
export abstract class PctAnnotation extends PctMark {
  /**
   * The text written by the drawing, and the sentence's subject in the description.
   *
   * @since next
   */
  readonly label = input('');
  /**
   * The identity the legend's toggle hides the annotation by (`hiddenSeries`): the label when
   * unset.
   *
   * @since next
   */
  readonly id = input('');
  /**
   * The colour: a palette place from 1 to 8, or any CSS colour. The skin's own colour for the
   * kind of annotation when unset.
   *
   * @since next
   */
  readonly color = input<
    number | string | undefined,
    number | string | undefined
  >(undefined, { transform: pctSeriesColor });
  /**
   * The annotation stands in the legend too, named by its label, with a toggle that hides it.
   *
   * @since next
   */
  readonly legend = input(false, { transform: booleanAttribute });

  protected readonly scene = inject(PctChartScene);
  protected readonly texts = inject(PCT_TEXTS);

  /** The kind's name in the texts, which stands for a missing label. */
  protected abstract readonly kind: () => string;
  /** The layer the kind draws in. */
  protected abstract readonly inLayer: PctMarkLayer;

  override readonly layer = computed<PctMarkLayer>(() => this.inLayer);
  override readonly series = computed(() => []);
  override readonly span = computed<PctDomain | null>(() => null);

  /**
   * No series: no extent.
   *
   * @since next
   */
  override extent(id: string, window: PctWindow): PctDomain | null {
    void id;
    void window;
    return null;
  }

  /**
   * No series: no value.
   *
   * @since next
   */
  override valueAt(id: string, x: number): number | null {
    void id;
    void x;
    return null;
  }

  /**
   * No series: no readings.
   *
   * @since next
   */
  override readings(id: string): PctColumns {
    void id;
    return NO_READINGS;
  }

  /** The identity: `id`, the label, or the kind's name. */
  protected readonly key = computed(
    () => this.id() || this.label() || this.kind(),
  );
  /** The name written and read: the label, or the kind's name. */
  protected readonly name = computed(() => this.label() || this.kind());
  /** Hidden by the legend's toggle. */
  protected readonly hidden = computed(() =>
    this.scene.hiddenSeries().includes(this.key()),
  );
  /** The palette place, `custom` for a colour of the consumer's own, `null` for the skin's. */
  protected readonly place = computed<number | 'custom' | null>(() => {
    const color = this.color();
    return typeof color === 'string'
      ? 'custom'
      : typeof color === 'number'
        ? color
        : null;
  });
  protected readonly custom = computed(() => {
    const color = this.color();
    return typeof color === 'string' ? color : null;
  });
  protected readonly identity = computed<PctSeriesIdentity>(() => ({
    id: this.key(),
    place: this.place() ?? 'custom',
    color: this.custom(),
  }));

  override readonly legendEntries = computed<readonly PctLegendExtra[]>(() =>
    this.legend() ? [{ ...this.identity(), name: this.name() }] : [],
  );

  /** The scene's `data-pct-series` of the kind's colour: a place, `custom`, or nothing. */
  protected readonly seriesAttr = computed(() => {
    const place = this.place();
    return place === null ? null : String(place);
  });

  /** A sentence of the description, ended with a full stop: nothing while hidden. */
  protected sentence(what: string): string {
    return this.hidden() ? '' : `${this.name()} ${what}.`;
  }
}
