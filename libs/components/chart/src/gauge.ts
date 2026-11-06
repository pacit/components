import { DOCUMENT } from '@angular/common';
import {
  afterNextRender,
  afterRenderEffect,
  booleanAttribute,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  input,
  isDevMode,
  LOCALE_ID,
  numberAttribute,
  signal,
} from '@angular/core';
import {
  PCT_TEXTS,
  pctQuantityFormat,
  type PctTone,
} from '@pacit/components/core';
import { pctArcPath, pctArcPoint, pctGaugeAngle } from './model/arc';
import { pctEased, pctOrNone } from './tween';

/**
 * A band of a gauge's range: from a value to another, in a tone, with the word the band stands
 * for — what a reader hears beside the value, and what the picture writes under it
 * ([0076](../../../../docs/decisions/0076-a-tone-is-two-channels-and-four-names.md)).
 *
 * @since next
 */
export interface PctGaugeBand {
  readonly from: number;
  readonly to: number;
  readonly tone: PctTone;
  readonly label?: string;
}

/** The ring outside the track the bands stand on, in pixels. */
const BAND_WIDTH = 4;
/** The gap between the track and the bands' ring. */
const BAND_GAP = 2;
/** The needle's width at the hub. */
const NEEDLE_WIDTH = 2;

/** A reading's way: from one value to the next; no reading, or a first one, at once. */
const VALUE = pctOrNone<number>({
  tweenable: () => true,
  tween: (from, to, progress) => from + (to - from) * progress,
});

/**
 * A gauge: one value in its range, drawn as an arc — or a needle — over the bands of its tones
 * ([0115](../../../../docs/decisions/0115-a-pie-is-a-scene-of-shares-and-a-gauge-is-a-meter-drawn-as-an-arc.md)).
 *
 * **A meter, not a picture.** The platform has a role for a value in a range, `meter`, and the
 * gauge is one: a reader hears its name, its value with the unit and the word of the band the
 * value falls in — `21.5 °C, High` — never only an image. `<meter>` itself cannot be drawn as an
 * arc, so the role is written on the element around the drawing, which is hidden
 * ([0049](../../../../docs/decisions/0049-a-progress-bar-is-the-platforms-element-under-our-paint.md)
 * is the precedent of the platform's semantics under the library's paint; this is the one
 * place they are ARIA's rather than an element's).
 *
 * **A tone is never only a colour.** Each band is painted in its tone on the rim, and the band
 * the value falls in writes its label under the value and its tone on the host
 * (`data-pct-tone`), so a skin, a reader and a page with no colours all get the state (0076).
 * No value — `null` — is no reading: the meter holds its minimum and says so in words, and
 * nothing is drawn on the track.
 *
 * @example
 * <pct-gauge ariaLabel="Supply air" [value]="21.5" [min]="10" [max]="30" unit="°C"
 *   [bands]="[{ from: 10, to: 18, tone: 'info', label: 'Cold' }, { from: 18, to: 24, tone: 'success', label: 'Comfort' }, { from: 24, to: 30, tone: 'danger', label: 'Hot' }]" />
 *
 * @since next
 */
@Component({
  selector: 'pct-gauge',
  templateUrl: './gauge.html',
  styleUrl: './gauge.scss',
  host: {
    class: 'pct-gauge',
    '[attr.data-pct-tone]': 'band()?.tone ?? null',
    '[class.needle]': 'indicator() === "needle"',
  },
})
export class PctGauge {
  /**
   * The value, in the unit of `min` and `max`; `null`, or anything that is not a finite
   * number, is no reading.
   *
   * @since next
   */
  readonly value = input<number | null, unknown>(null, {
    transform: gaugeValue,
  });
  /**
   * Whether a new value moves the arc or the needle there over twice the motion transition,
   * rather than at once ([0121](../../../../docs/decisions/0121-live-data-is-read-where-it-changed.md)).
   * `prefers-reduced-motion` draws every change at once; the meter and the words carry the value.
   *
   * @since next
   */
  readonly animate = input(false, { transform: booleanAttribute });
  /** The value as drawn: on its way to the new one while `animate` eases it. */
  private readonly drawnValue = pctEased(this.value, this.animate, VALUE);
  /**
   * The left end of the arc.
   *
   * @since next
   */
  readonly min = input(0, { transform: numberAttribute });
  /**
   * The right end of the arc; a `max` not above `min` stands the value at the left end.
   *
   * @since next
   */
  readonly max = input(100, { transform: numberAttribute });
  /**
   * The unit written after the value and the ends; `''` is a plain number.
   *
   * @since next
   */
  readonly unit = input('');
  /**
   * The locale the numbers are written in: the application's when unset.
   *
   * @since next
   */
  readonly locale = input('');
  /**
   * The bands of the range, each in a tone with a word for it, drawn on the rim in order.
   *
   * @since next
   */
  readonly bands = input<readonly PctGaugeBand[]>([]);
  /**
   * How the value is shown: an arc filled from the minimum to it, or a needle at it.
   *
   * @since next
   */
  readonly indicator = input<'arc' | 'needle'>('arc');
  /**
   * The angle the arc sweeps, in degrees, around twelve o'clock: 240 leaves the bottom open
   * for the value; 360 is a ring.
   *
   * @since next
   */
  readonly sweep = input(240, { transform: numberAttribute });
  /**
   * The meter's name — what is measured. Give this or `ariaLabelledby`.
   *
   * @since next
   */
  readonly ariaLabel = input('');
  /**
   * As `ariaLabel`, for a name that already stands on the page.
   *
   * @since next
   */
  readonly ariaLabelledby = input('');

  protected readonly texts = inject(PCT_TEXTS);
  private readonly appLocale = inject(LOCALE_ID);
  private readonly document = inject(DOCUMENT);
  private readonly host: HTMLElement = inject(ElementRef).nativeElement;

  private readonly size = signal({ width: 0, height: 0 });
  private readonly font = signal(13);
  /** The track's width: the `gauge-width` token, read with the font. */
  private readonly trackWidth = signal(14);
  protected readonly measured = computed(
    () => this.size().width > 0 && this.size().height > 0,
  );
  private readonly lineHeight = computed(() => Math.ceil(this.font() * 1.4));

  /**
   * The locale the numbers are written in: `locale`, or the application's.
   *
   * @since next
   */
  readonly effectiveLocale = computed(() => this.locale() || this.appLocale);
  private readonly format = computed(() =>
    pctQuantityFormat(this.effectiveLocale(), { fractionDigits: [0, 3] }),
  );

  /** The ends as numbers a scale can be made of: `max` held above `min`. */
  private readonly ends = computed(() => {
    const min = this.min();
    const max = this.max();
    return { min, max: max > min ? max : min };
  });

  /**
   * The band the value falls in — from its `from` up to its `to`, the last band at its `to`
   * too — or `null` for none, or no reading.
   *
   * @since next
   */
  readonly band = computed<PctGaugeBand | null>(() => {
    const value = this.value();
    if (value === null) return null;
    const bands = this.bands();
    return (
      bands.find(
        (b, i) =>
          value >= b.from &&
          (value < b.to || (i === bands.length - 1 && value === b.to)),
      ) ?? null
    );
  });

  /**
   * The value written with the unit, or the gap for no reading.
   *
   * @since next
   */
  readonly valueText = computed(() => this.write(this.value()));

  /** What the meter says: the value and the band's word, or that there is no reading. */
  protected readonly readingText = computed(() => {
    const label = this.band()?.label;
    const text = this.valueText();
    return label ? `${text}, ${label}` : text;
  });

  /** The value the meter carries: held in the range, the minimum for no reading. */
  protected readonly reported = computed(() => {
    const { min, max } = this.ends();
    const value = this.value();
    return value === null ? min : Math.min(max, Math.max(min, value));
  });

  /** The arc's middle and radius in the box, with room for the track and the ends' labels. */
  private readonly circle = computed(() => {
    const { width, height } = this.size();
    const sweep = (this.sweep() * Math.PI) / 180;
    const rim = this.trackWidth() / 2 + BAND_GAP + BAND_WIDTH;
    // How far below the middle the ends reach, as a share of the radius: none above it.
    const below = Math.max(0, -Math.cos(sweep / 2));
    const labels = this.lineHeight();
    const radius = Math.max(
      0,
      Math.min(
        width / 2 - rim,
        (height - rim - labels - (below > 0 ? labels : 0)) / (1 + below),
      ),
    );
    return { cx: width / 2, cy: rim + radius, radius, sweep };
  });

  /** The track: the whole sweep, under the value. */
  protected readonly track = computed(() => {
    const { cx, cy, radius, sweep } = this.circle();
    const half = this.trackWidth() / 2;
    return pctArcPath(
      cx,
      cy,
      radius + half,
      radius - half,
      -sweep / 2,
      sweep / 2,
    );
  });

  /** The bands on the rim, each its stretch of the sweep in its tone. */
  protected readonly bandViews = computed(() => {
    const { cx, cy, radius, sweep } = this.circle();
    const { min, max } = this.ends();
    const inner = radius + this.trackWidth() / 2 + BAND_GAP;
    return this.bands().map((band, index) => ({
      index,
      tone: band.tone,
      path: pctArcPath(
        cx,
        cy,
        inner + BAND_WIDTH,
        inner,
        pctGaugeAngle(band.from, min, max, sweep),
        pctGaugeAngle(band.to, min, max, sweep),
      ),
    }));
  });

  /** The value as an arc from the left end, or as a needle: `null` for no reading. */
  protected readonly indicatorView = computed(() => {
    const value = this.drawnValue();
    if (value === null) return null;
    const { cx, cy, radius, sweep } = this.circle();
    const { min, max } = this.ends();
    const angle = pctGaugeAngle(value, min, max, sweep);
    const half = this.trackWidth() / 2;
    if (this.indicator() === 'arc') {
      return {
        kind: 'arc' as const,
        path: pctArcPath(
          cx,
          cy,
          radius + half,
          radius - half,
          -sweep / 2,
          angle,
        ),
      };
    }
    const tip = pctArcPoint(cx, cy, radius + half, angle);
    const left = pctArcPoint(cx, cy, NEEDLE_WIDTH, angle - Math.PI / 2);
    const right = pctArcPoint(cx, cy, NEEDLE_WIDTH, angle + Math.PI / 2);
    return {
      kind: 'needle' as const,
      path: `M ${left.x} ${left.y} L ${tip.x} ${tip.y} L ${right.x} ${right.y} Z`,
      cx,
      cy,
      hub: NEEDLE_WIDTH * 2,
    };
  });

  /** The words of the picture: the value and the band's label in the middle, the ends below. */
  protected readonly words = computed(() => {
    const { cx, cy, radius, sweep } = this.circle();
    const { min, max } = this.ends();
    const line = this.lineHeight();
    const outer = radius + this.trackWidth() / 2 + BAND_GAP + BAND_WIDTH;
    const start = pctArcPoint(cx, cy, outer, -sweep / 2);
    const end = pctArcPoint(cx, cy, outer, sweep / 2);
    // The ends' labels stand under the ends where the arc opens below the middle, and beside
    // them outside the arc where it does not; a ring has no ends to label.
    const open = sweep < 2 * Math.PI - 1e-9;
    const below = -Math.cos(sweep / 2) > 0;
    const two = (n: number) => Math.round(n * 100) / 100;
    return {
      value: { x: cx, y: cy },
      state: { x: cx, y: cy + line },
      ends: open
        ? [
            {
              text: this.write(min),
              x: two(below ? start.x : start.x - line / 2),
              y: two(below ? start.y + line / 2 : start.y),
              anchor: below ? ('middle' as const) : ('end' as const),
            },
            {
              text: this.write(max),
              x: two(below ? end.x : end.x + line / 2),
              y: two(below ? end.y + line / 2 : end.y),
              anchor: below ? ('middle' as const) : ('start' as const),
            },
          ]
        : [],
    };
  });

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      this.readMedium();
      this.readSize(this.host.clientWidth, this.host.clientHeight);
      if (typeof ResizeObserver === 'undefined') return;
      const observer = new ResizeObserver(([entry]) => {
        this.readMedium();
        this.readSize(entry.contentRect.width, entry.contentRect.height);
      });
      observer.observe(this.host);
      destroyRef.onDestroy(() => observer.disconnect());
    });
    if (isDevMode()) afterRenderEffect(() => this.warnOnUnnamed());
  }

  private write(value: number | null): string {
    if (value === null) return this.texts().chartGap;
    const number = this.format().format(value);
    const unit = this.unit();
    return unit ? `${number} ${unit}` : number;
  }

  private readSize(rawWidth: number, rawHeight: number): void {
    const width = Math.round(rawWidth);
    const height = Math.round(rawHeight);
    const now = this.size();
    if (now.width !== width || now.height !== height)
      this.size.set({ width, height });
  }

  /** The font and the track's width: what the skin decides. */
  private readMedium(): void {
    const style = this.document.defaultView?.getComputedStyle(this.host);
    const px = parseFloat(style?.fontSize ?? '') || 13;
    if (px !== this.font()) this.font.set(px);
    const track = parseFloat(
      style?.getPropertyValue('--pct-chart-gauge-width') ?? '',
    );
    if (track > 0) this.trackWidth.set(track);
  }

  private warnOnUnnamed(): void {
    if (this.ariaLabel().trim() || this.ariaLabelledby().trim()) return;
    console.warn(
      '[pct-gauge] A gauge with neither `ariaLabel` nor `ariaLabelledby`. A meter is ' +
        'announced by its name — what is measured — and only the application knows that.',
    );
  }
}

/**
 * The `value` input's transform: a finite number, or `null` for no reading — what an absent
 * attribute, an empty one and text that does not parse all mean.
 */
function gaugeValue(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
