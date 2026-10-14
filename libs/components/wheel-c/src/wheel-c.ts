import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  computed,
  type OnInit,
  ElementRef,
  input,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { pctListNavigation } from '@pacit/components/core';

/**
 * PROBE — the runway as three copies of the rows in the DOM (0091, A2/B/C). Throwaway.
 *
 * The same shell as `wheel-k` and `wheel-w`; the runway is three cycles rendered whole by
 * `@for`, the middle one canonical. `hideCopies` says what the two outer copies are to a
 * reader: `aria-hidden` with no id, or plain rows with ids of their own.
 */
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
const ROW = 32;
const VISIBLE = 5;
const CYCLES = 3;
const MIDDLE = 1;
let counter = 0;

export interface PctWheelCRow {
  readonly cycle: number;
  readonly index: number;
  readonly label: string;
}

@Component({
  selector: 'pct-wheel-c',
  templateUrl: './wheel-c.html',
  styleUrl: './wheel-c.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PctWheelC implements OnInit {
  readonly rows = input<readonly string[]>(MINUTES);
  readonly label = input('Minutes');
  readonly stopAlways = input(true);
  /** The outer copies: `aria-hidden` and no id (true), or plain rows with ids (false). */
  readonly hideCopies = input(true);
  readonly setsize = input(false);
  readonly start = input(0);

  readonly value = signal<string | null>(null);
  readonly scrollends = signal(0);

  protected readonly ROW = ROW;
  protected readonly MIDDLE = MIDDLE;
  protected readonly uid = `pct-wheel-c-${++counter}`;
  protected readonly runway = computed<readonly PctWheelCRow[]>(() => {
    const rows = this.rows();
    const out: PctWheelCRow[] = [];
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
  private readonly centring = signal(0);
  private readonly list = viewChild.required<ElementRef<HTMLElement>>('list');

  constructor() {
    afterRenderEffect(() => {
      this.centring();
      untracked(() => this.centre());
    });
  }

  /** Inputs are bound after construction: the start row is read here, before the first render. */
  ngOnInit(): void {
    this.walk.setActive(this.start());
  }

  protected rowId(row: PctWheelCRow): string | null {
    if (row.cycle === MIDDLE) return `${this.uid}-${row.index}`;
    return this.hideCopies() ? null : `${this.uid}-c${row.cycle}-${row.index}`;
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

  protected onScrollEnd(): void {
    this.scrollends.update((n) => n + 1);
    const el = this.list().nativeElement;
    const n = this.rows().length;
    const under = Math.round((el.scrollTop + (VISIBLE * ROW - ROW) / 2) / ROW);
    const cycle = Math.floor(under / n);
    const index = ((under % n) + n) % n;
    this.walk.setActive(index);
    this.value.set(this.rows()[index]);
    if (cycle !== MIDDLE) el.scrollTop += (MIDDLE - cycle) * n * ROW;
  }

  private centre(): void {
    const el = this.list().nativeElement;
    const n = this.rows().length;
    el.scrollTop = (MIDDLE * n + this.active()) * ROW - (VISIBLE * ROW - ROW) / 2;
  }
}
