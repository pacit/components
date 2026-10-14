import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  input,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { pctListNavigation } from '@pacit/components/core';

/**
 * PROBE — the runway as a window of the wheel's own (0091, A3/B/C). Throwaway.
 *
 * The same shell as `wheel-k` and `wheel-c`; the runway is seven cycles of the rows, of
 * which the wheel renders eleven rows around the scroll position under a spacer: a
 * `padding-top` of the rows above and a height of the whole. The window moves on `scroll`,
 * and a key moves it in the same render as the row it lands on, so the id
 * `aria-activedescendant` names is in the tree when the attribute changes.
 */
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
const ROW = 32;
const VISIBLE = 5;
const OVERSCAN = 3;
const COUNT = VISIBLE + 2 * OVERSCAN;
const CYCLES = 7;
const MIDDLE = 3;
let counter = 0;

export interface PctWheelWRow {
  readonly cycle: number;
  readonly index: number;
  readonly label: string;
}

@Component({
  selector: 'pct-wheel-w',
  templateUrl: './wheel-w.html',
  styleUrl: './wheel-w.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PctWheelW {
  readonly rows = input<readonly string[]>(MINUTES);
  readonly label = input('Minutes');
  readonly stopAlways = input(true);
  readonly setsize = input(true);
  readonly start = input(0);

  readonly value = signal<string | null>(null);
  readonly scrollends = signal(0);

  protected readonly ROW = ROW;
  protected readonly MIDDLE = MIDDLE;
  protected readonly uid = `pct-wheel-w-${++counter}`;
  protected readonly runway = computed<readonly PctWheelWRow[]>(() => {
    const rows = this.rows();
    const out: PctWheelWRow[] = [];
    for (let cycle = 0; cycle < CYCLES; cycle++)
      for (let index = 0; index < rows.length; index++)
        out.push({ cycle, index, label: rows[index] });
    return out;
  });
  /** The first rendered row of the runway. */
  protected readonly first = signal(0);
  protected readonly windowRows = computed(() =>
    this.runway().slice(this.first(), this.first() + COUNT),
  );
  protected readonly total = computed(() => this.runway().length * ROW);

  private readonly walk = pctListNavigation<string>({
    items: this.rows,
    label: (row) => row,
    wrap: true,
  });
  protected readonly active = this.walk.activeIndex;
  protected readonly activeId = computed(() => `${this.uid}-${this.active()}`);
  private readonly centring = signal(0);
  private readonly list = viewChild.required<ElementRef<HTMLElement>>('list');

  constructor() {
    this.walk.setActive(this.start());
    this.first.set(this.windowFor(MIDDLE * this.rows().length + this.start()));
    afterRenderEffect(() => {
      this.centring();
      untracked(() => this.centre());
    });
  }

  protected rowId(row: PctWheelWRow): string | null {
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
    // The window moves in the same render as the active row: the id is in the tree when
    // `aria-activedescendant` names it.
    this.first.set(this.windowFor(MIDDLE * this.rows().length + this.active()));
    this.centring.update((n) => n + 1);
  }

  /** The window follows the scroll. */
  protected onScroll(): void {
    const el = this.list().nativeElement;
    this.first.set(this.windowAt(el.scrollTop));
  }

  protected onScrollEnd(): void {
    this.scrollends.update((n) => n + 1);
    const el = this.list().nativeElement;
    const n = this.rows().length;
    const under = Math.round((el.scrollTop + (VISIBLE * ROW - ROW) / 2) / ROW);
    const cycle = Math.floor(under / n);
    const index = ((under % n) + n) % n;
    this.walk.setActive(index);
    this.value.set(this.rows()[index]);
    if (cycle !== MIDDLE) {
      const top = el.scrollTop + (MIDDLE - cycle) * n * ROW;
      this.first.set(this.windowAt(top));
      this.jump(el, top);
    }
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

  /** The first rendered row for a scroll position. */
  private windowAt(scrollTop: number): number {
    return this.clamp(Math.floor(scrollTop / ROW) - OVERSCAN);
  }

  /** The first rendered row for a runway row under the line — the same window `windowAt` picks once it is scrolled there. */
  private windowFor(under: number): number {
    return this.clamp(under - Math.floor(COUNT / 2));
  }

  private clamp(first: number): number {
    return Math.max(0, Math.min(this.runway().length - COUNT, first));
  }

  private centre(): void {
    const el = this.list().nativeElement;
    const n = this.rows().length;
    el.scrollTop = (MIDDLE * n + this.active()) * ROW - (VISIBLE * ROW - ROW) / 2;
  }
}
