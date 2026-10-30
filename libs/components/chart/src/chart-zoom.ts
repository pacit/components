import {
  Component,
  computed,
  ElementRef,
  inject,
  input,
  signal,
} from '@angular/core';
import { PctButton } from '@pacit/components/button';
import { PCT_TEXTS } from '@pacit/components/core';
import type { PctChart } from './chart';

/** One button of the bar: what it does, and the glyph it shows; its name is read in order. */
interface PctZoomButton {
  readonly act: (chart: PctChart) => void;
  readonly glyph: string;
}

const BUTTONS: readonly PctZoomButton[] = [
  { act: (c) => c.zoomBy(2), glyph: '+' },
  { act: (c) => c.zoomBy(0.5), glyph: '−' },
  { act: (c) => c.panBy(-0.25), glyph: '‹' },
  { act: (c) => c.panBy(0.25), glyph: '›' },
  { act: (c) => c.home(), glyph: '⟲' },
];

/**
 * The single-pointer twin of a chart's window gestures
 * ([0101](../../../../docs/decisions/0101-the-window-the-cursor-and-the-selection-are-the-applications-models.md)):
 * five buttons — in, out, earlier, later, back to the default window — calling the transform a
 * pinch, a drag and the wheel call, so whoever cannot pinch or drag moves the window as far
 * (WCAG 2.5.1, 2.5.7). It follows the APG toolbar pattern: one stop, the arrows between the
 * buttons.
 *
 * A chart renders one over its plot while its `zoom` is `x`; render one elsewhere with
 * `zoomButtons` off on the chart, or buttons of your own on `zoomBy`, `panBy` and `home`.
 *
 * @example
 * <pct-chart #chart ariaLabel="Supply air" [zoomButtons]="false"> … </pct-chart>
 * <pct-chart-zoom [chart]="chart" />
 *
 * @since next
 */
@Component({
  selector: 'pct-chart-zoom',
  imports: [PctButton],
  templateUrl: './chart-zoom.html',
  styleUrl: './chart-zoom.scss',
  host: {
    class: 'pct-chart-zoom',
    role: 'toolbar',
    '[attr.aria-label]': 'texts().chartZoom',
    '(keydown)': 'onKey($event)',
  },
})
export class PctChartZoom {
  /**
   * The chart whose window the buttons move.
   *
   * @since next
   */
  readonly chart = input.required<PctChart>();

  protected readonly texts = inject(PCT_TEXTS);
  private readonly host: HTMLElement = inject(ElementRef).nativeElement;

  protected readonly buttons = BUTTONS;
  /** The button the bar's one stop stands on. */
  protected readonly active = signal(0);
  /** The buttons' names, in the order of `BUTTONS`. */
  protected readonly names = computed(() => [
    this.texts().chartZoomIn,
    this.texts().chartZoomOut,
    this.texts().chartEarlier,
    this.texts().chartLater,
    this.texts().chartZoomReset,
  ]);

  protected press(index: number): void {
    this.active.set(index);
    BUTTONS[index].act(this.chart());
  }

  /** The toolbar's keys: the arrows, Home and End move the stop and the focus with it. */
  protected onKey(event: KeyboardEvent): void {
    const last = BUTTONS.length - 1;
    const now = this.active();
    const next =
      event.key === 'ArrowRight'
        ? Math.min(last, now + 1)
        : event.key === 'ArrowLeft'
          ? Math.max(0, now - 1)
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? last
              : null;
    if (next === null) return;
    event.preventDefault();
    this.active.set(next);
    this.host.querySelectorAll('button')[next]?.focus();
  }
}
