import {
  afterNextRender,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  signal,
  TemplateRef,
  viewChild,
} from '@angular/core';
import { PctAnnotation } from './annotation';
import { PctMark, type PctSwatchContext } from './scene';

/** How far the label stands from the line and from the plot's edge. */
const GAP = 4;
/** How often the line moves. */
const TICK = 1000;

/**
 * The line of the present moment across the plot, moving with the clock once a second while
 * the moment is in the window, with its label at the top. `at` pins it to a moment instead —
 * the time a report was taken, or a test's clock. It brings no series; a reader hears it in the
 * picture's description (`Now 25 October 2026 14:10.`).
 *
 * @example
 * <pct-now />
 * <pct-now [at]="reportedAt" label="Report taken" />
 *
 * @since next
 */
@Component({
  selector: 'pct-now',
  templateUrl: './now.html',
  styleUrl: './now.scss',
  providers: [{ provide: PctMark, useExisting: PctNow }],
})
export class PctNow extends PctAnnotation {
  /**
   * The moment the line stands at, instead of the clock's.
   *
   * @since next
   */
  readonly at = input<number | null>(null);

  protected override readonly kind = () => this.texts().chartNow;
  protected override readonly inLayer = 'front' as const;

  override readonly template =
    viewChild.required<TemplateRef<unknown>>('drawing');
  override readonly swatch =
    viewChild.required<TemplateRef<PctSwatchContext>>('swatch');

  private readonly clock = signal(Date.now());
  /**
   * The moment drawn: `at`, or the clock's.
   *
   * @since next
   */
  readonly moment = computed(() => this.at() ?? this.clock());

  constructor() {
    super();
    // The clock ticks in the browser alone: on the server the line stands where the page was
    // rendered, and the pinned `at` ticks nowhere.
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const timer = setInterval(() => this.clock.set(Date.now()), TICK);
      destroyRef.onDestroy(() => clearInterval(timer));
    });
  }

  /** The line and its label, or nothing while the moment is off the plot or the mark hidden. */
  protected readonly drawn = computed(() => {
    if (this.hidden()) return null;
    const scale = this.scene.xScale();
    const shown = this.scene.shown();
    const moment = this.moment();
    if (!scale || !shown || moment < shown.from || moment > shown.to)
      return null;
    const { left, top, right, bottom } = this.scene.frame();
    const px = scale.map(moment);
    return this.scene.orientation() === 'horizontal'
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
   * The name and the moment, while the moment is in the window.
   *
   * @since next
   */
  override describe(): string {
    return this.drawn()
      ? this.sentence(this.scene.writePosition(this.moment(), 'full'))
      : '';
  }
}
