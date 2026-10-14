import {
  CdkFixedSizeVirtualScroll,
  CdkVirtualForOf,
  CdkVirtualScrollViewport,
} from '@angular/cdk/scrolling';
import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { pctListNavigation } from '@pacit/components/core';

/**
 * PROBE — the runway as the CDK's virtual-scroll viewport (0091, A1/B/C). Throwaway: this
 * entrypoint measures bytes, a fling and three readers, and is never published.
 *
 * The shell is the same in `wheel-c` and `wheel-w`: a `role="listbox"` on the platform's
 * scroll, `pctListNavigation` with `wrap`, `aria-activedescendant`, a mandatory snap to the
 * centre, and a `scrollend` that reads the row under the line and re-centres the scroll to
 * the middle cycle. What differs is the runway: here the CDK renders a window over seven
 * cycles of the rows.
 */
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
/** The row height in px, and the rows the window shows — odd, so the line is the third. */
const ROW = 32;
const VISIBLE = 5;
/** The runway: seven cycles of the rows, the middle one canonical. */
const CYCLES = 7;
const MIDDLE = 3;
let counter = 0;

export interface PctWheelKRow {
  readonly cycle: number;
  readonly index: number;
  readonly label: string;
}

@Component({
  selector: 'pct-wheel-k',
  imports: [CdkVirtualScrollViewport, CdkFixedSizeVirtualScroll, CdkVirtualForOf],
  templateUrl: './wheel-k.html',
  styleUrl: './wheel-k.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PctWheelK {
  readonly rows = input<readonly string[]>(MINUTES);
  readonly label = input('Minutes');
  /** `scroll-snap-stop: always` on the rows — one row per tick and per flick. */
  readonly stopAlways = input(true);
  /** Whether a rendered row says its place in the cycle: `aria-setsize`, `aria-posinset`. */
  readonly setsize = input(true);
  /** The row the wheel opens on. */
  readonly start = input(0);

  /** The row under the line after a settle — what a gesture wrote. */
  readonly value = signal<string | null>(null);
  /** How often `scrollend` fired, for the probe to read. */
  readonly scrollends = signal(0);

  protected readonly ROW = ROW;
  protected readonly MIDDLE = MIDDLE;
  protected readonly uid = `pct-wheel-k-${++counter}`;
  protected readonly runway = computed<readonly PctWheelKRow[]>(() => {
    const rows = this.rows();
    const out: PctWheelKRow[] = [];
    for (let cycle = 0; cycle < CYCLES; cycle++)
      for (let index = 0; index < rows.length; index++)
        out.push({ cycle, index, label: rows[index] });
    return out;
  });

  private readonly walk = pctListNavigation<string>({
    items: this.rows,
    label: (row) => row,
    wrap: true,
  });
  protected readonly active = this.walk.activeIndex;
  protected readonly activeId = computed(() => `${this.uid}-${this.active()}`);
  /** Bumped by a key: the active row is then brought under the line. A scroll bumps nothing. */
  private readonly centring = signal(0);
  private readonly viewport = viewChild.required(CdkVirtualScrollViewport);

  constructor() {
    this.walk.setActive(this.start());
    afterRenderEffect(() => {
      this.centring();
      untracked(() => this.centre());
    });
  }

  protected trackRow(_: number, row: PctWheelKRow): number {
    return row.cycle * 1000 + row.index;
  }

  protected rowId(row: PctWheelKRow): string | null {
    return row.cycle === MIDDLE ? `${this.uid}-${row.index}` : null;
  }

  protected onKeydown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'ArrowDown':
        this.walk.move(1);
        break;
      case 'ArrowUp':
        this.walk.move(-1);
        break;
      case 'Home':
        this.walk.first();
        break;
      case 'End':
        this.walk.last();
        break;
      default:
        if (event.key.length !== 1 || event.ctrlKey || event.metaKey || event.altKey)
          return;
        this.walk.typeahead(event.key);
    }
    event.preventDefault();
    this.value.set(this.rows()[this.active()]);
    this.centring.update((n) => n + 1);
  }

  /** The settle: the row under the line is the value, and the scroll goes back to the middle cycle. */
  protected onScrollEnd(): void {
    this.scrollends.update((n) => n + 1);
    const el = this.viewport().elementRef.nativeElement;
    const n = this.rows().length;
    const under = Math.round((el.scrollTop + (VISIBLE * ROW - ROW) / 2) / ROW);
    const cycle = Math.floor(under / n);
    const index = ((under % n) + n) % n;
    this.walk.setActive(index);
    this.value.set(this.rows()[index]);
    if (cycle !== MIDDLE) this.jump(el, el.scrollTop + (MIDDLE - cycle) * n * ROW);
  }

  /**
   * A jump into rows the window has not rendered. Under `scroll-snap-type: y mandatory` every
   * engine snaps such a jump back to the nearest rendered row before the window can move
   * (0091, B8) — so the snap is switched off for the jump and restored two frames later, when
   * the window has rendered the destination.
   */
  private jump(el: HTMLElement, top: number): void {
    el.style.scrollSnapType = 'none';
    el.scrollTop = top;
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        el.style.scrollSnapType = '';
      }),
    );
  }

  private centre(): void {
    const el = this.viewport().elementRef.nativeElement;
    const n = this.rows().length;
    // The CDK sets the spacer's height after its own first render; a scrollTop written
    // before that is clamped to zero. Wait for the runway to have its height.
    if (el.scrollHeight < this.runway().length * ROW) {
      requestAnimationFrame(() => this.centre());
      return;
    }
    this.jump(el, (MIDDLE * n + this.active()) * ROW - (VISIBLE * ROW - ROW) / 2);
  }
}
