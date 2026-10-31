import {
  booleanAttribute,
  computed,
  DestroyRef,
  Directive,
  effect,
  ElementRef,
  inject,
  input,
  numberAttribute,
  signal,
  untracked,
} from '@angular/core';
import { PctDataTable } from './data-table';
import { PctTableWindow } from './data-table-window';
import {
  pctBlockRows,
  pctBlocksFor,
  pctFailedBlock,
  type PctBlock,
} from './model/blocks';
import type { PctTableSort } from './table';

/**
 * What a remote source is asked for: a block of rows, `[from, to)`, in the order and under
 * the question the table holds.
 *
 * @since next
 */
export interface PctTableRequest<Id extends string = string> {
  /** The first row of the block. */
  readonly from: number;
  /** The row after the block's last: the source gives fewer past the end of its rows. */
  readonly to: number;
  /** The table's `sort`, its first key deciding first. */
  readonly sort: readonly PctTableSort<Id>[];
  /** The table's quick filter, as it was typed. */
  readonly filter: string;
}

/**
 * What a remote source answers: the rows of the block asked for, and how many rows there are
 * in all under the question.
 *
 * @since next
 */
export interface PctTableAnswer<T> {
  readonly rows: readonly T[];
  readonly total: number;
}

/**
 * Loads a block of rows. `signal` aborts when the table no longer needs the block: the order
 * or the question changed, or the view left it before it came.
 *
 * @since next
 */
export type PctTableLoad<T, Id extends string = string> = (
  request: PctTableRequest<Id>,
  signal: AbortSignal,
) => Promise<PctTableAnswer<T>>;

/**
 * The rows come from a remote source a block at a time, as the view reaches them: one
 * function, `load`, asked for the blocks of the lines the window draws and half a block on
 * each side, each block once ([0097](../../../../docs/decisions/0097-a-data-table-is-a-typed-engine-under-the-first-layer-and-grows-into-a-grid-by-directives.md)).
 *
 * - **The source sorts and filters.** The table's `sort` and `filter` are what `load` is
 *   asked under, and the table orders and matches nothing itself. A new order or question
 *   aborts every block in flight, lets every row go and scrolls to the top — `keepScroll`
 *   keeps the reader where they were.
 * - **A row not here yet is a hole**: drawn as a row of placeholders, `aria-busy`, at its
 *   place among all of them, so the scrollbar is the whole list's from the first answer.
 * - **A block that failed says so** in the first of its rows in view, with a retry that asks
 *   for that block alone.
 * - **It needs `pctTableWindow`**: without a window every row of the source would be drawn,
 *   holes and all. Groups are the source's to make, and the table makes none of its rows.
 *
 * `refresh()` asks again for the blocks in view and lets the rest go, for data that lives;
 * `invalidate()` lets every row go, the scroll staying where it is.
 *
 * @example
 * <pct-data-table pctTableWindow [pctTableRemote]="load" [columns]="columns" [rowId]="byId" [(sort)]="sort" style="block-size: 30rem" />
 *
 * @since next
 */
@Directive({
  selector: 'pct-data-table[pctTableRemote]',
  exportAs: 'pctTableRemote',
})
export class PctTableRemote<T, Id extends string = string> {
  private readonly table = inject<PctDataTable<T>>(PctDataTable);
  // The rows of a remote source are drawn by a window, or every hole of them would be; the
  // lines it draws are the ones to ask for.
  private readonly window = inject(PctTableWindow);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /**
   * Loads a block of the rows. The ids it orders by are its own type's: the columns the
   * source can sort.
   *
   * @since next
   */
  readonly load = input.required<PctTableLoad<T, Id>>({
    alias: 'pctTableRemote',
  });

  /**
   * How many rows a block holds: what one request asks for.
   *
   * @since next
   */
  readonly blockSize = input(100, { transform: numberAttribute });

  /**
   * A new order or question keeps the scroll where it was, rather than going back to the top.
   *
   * @since next
   */
  readonly keepScroll = input(false, { transform: booleanAttribute });

  /** Each block asked for under the current question, and what came of it. */
  private readonly blocks = signal<ReadonlyMap<number, PctBlock<T>>>(
    new Map(),
  );

  /** The requests in flight, by block, so a block let go aborts its own. */
  private readonly flying = new Map<number, AbortController>();

  /** The count the last answer gave, under any question: the length of the rows drawn. */
  private readonly count = signal(0);

  /** Whether a block has answered under the current question: until one has, the count is the last question's. */
  private readonly answered = signal(false);

  /**
   * How many rows the source counts, as its last answer said; 0 before the first.
   *
   * @since next
   */
  readonly total = this.count.asReadonly();

  /**
   * A block is in flight.
   *
   * @since next
   */
  readonly loading = computed(() =>
    [...this.blocks().values()].some((block) => block.state === 'loading'),
  );

  /**
   * What the load of a block threw, while one has failed and not loaded since; `null` while
   * none has.
   *
   * @since next
   */
  readonly error = computed(() => {
    for (const block of this.blocks().values())
      if (block.state === 'failed') return block.error;
    return null;
  });

  /** The rows the table draws: every row the source counts, a hole wherever none came. */
  private readonly rows = computed(() =>
    pctBlockRows(this.blocks(), this.count(), this.blockSize()),
  );

  /** The order, the question and the size of a block: a change of any is a list of its own. */
  private readonly query = computed(() =>
    JSON.stringify([this.table.sort(), this.table.filter(), this.blockSize()]),
  );

  /** The blocks the rows drawn need. */
  private readonly wanted = computed(
    () => {
      const lines = this.table.lines();
      const { start, end } = this.window.drawn();
      // A line's index counts rows, so an open row's details take no row's place.
      // A group's heading has no index, and the table groups none of a remote source's rows.
      type Counted = { readonly index: number } | undefined;
      const first = lines.at(start) as Counted;
      const last = (end > start ? lines.at(end - 1) : undefined) as Counted;
      const from = first?.index ?? 0;
      const to = last === undefined ? from : last.index + 1;
      const count = this.count();
      return pctBlocksFor(
        { start: from, end: to },
        this.answered() || count > 0 ? count : null,
        this.blockSize(),
      );
    },
    {
      equal: (a, b) =>
        a.length === b.length && a.every((block, at) => block === b[at]),
    },
  );

  /** The question the blocks held were asked under. */
  private asked: string | null = null;

  constructor() {
    this.table.contribute({
      remote: {
        rows: this.rows,
        loading: this.loading,
        failed: computed(() => {
          const blocks = this.blocks();
          const size = this.blockSize();
          return (index: number) => pctFailedBlock(blocks, index, size);
        }),
        retry: (block) => this.askAgain([block]),
      },
    });
    inject(DestroyRef).onDestroy(() => this.letGo([...this.flying.keys()]));
    effect(() => {
      const query = this.query();
      const wanted = this.wanted();
      untracked(() => {
        const asked = this.asked;
        this.asked = query;
        if (asked === null || asked === query || this.keepScroll()) {
          if (asked !== null && asked !== query) this.clear();
          this.follow(wanted);
          return;
        }
        // Back to the top, where the new list starts: its first block is what is in view.
        this.clear();
        this.frame().scrollTop = 0;
        this.follow([0]);
      });
    });
  }

  /**
   * Asks again for the blocks in view, keeping their rows until the answer, and lets the rest
   * go: they are asked for when the view comes back to them.
   *
   * @since next
   */
  refresh(): void {
    const wanted = this.wanted();
    this.letGo(
      [...this.blocks().keys()].filter((block) => !wanted.includes(block)),
    );
    this.askAgain(wanted);
  }

  /**
   * Lets every row go and asks for the blocks in view, the scroll staying where it is.
   *
   * @since next
   */
  invalidate(): void {
    this.clear();
    this.follow(this.wanted());
  }

  /** Lets every block go, under a question no block has answered yet. */
  private clear(): void {
    this.letGo([...this.blocks().keys()]);
    this.answered.set(false);
  }

  /**
   * Follows the view: asks for each block of `wanted` not asked for, and lets go of the
   * blocks the view left that have no rows to show — still coming, or failed — so a scroll
   * past them waits for none, and one back to them asks again.
   */
  private follow(wanted: readonly number[]): void {
    this.letGo(
      [...this.blocks()].flatMap(([block, state]) =>
        state.rows === null && !wanted.includes(block) ? [block] : [],
      ),
    );
    const blocks = this.blocks();
    this.askAgain(wanted.filter((block) => !blocks.has(block)));
  }

  /** Asks for each of `blocks`, keeping the rows a block has until its answer. */
  private askAgain(blocks: readonly number[]): void {
    if (blocks.length === 0) return;
    const next = new Map(this.blocks());
    for (const block of blocks) {
      next.set(block, {
        state: 'loading',
        rows: next.get(block)?.rows ?? null,
      });
      this.request(block);
    }
    this.blocks.set(next);
  }

  /** Aborts the requests of `blocks` and forgets them. */
  private letGo(blocks: readonly number[]): void {
    if (blocks.length === 0) return;
    const next = new Map(this.blocks());
    for (const block of blocks) {
      this.flying.get(block)?.abort();
      this.flying.delete(block);
      next.delete(block);
    }
    this.blocks.set(next);
  }

  /** Asks the source for `block`, and writes what comes of it unless it was let go. */
  private request(block: number): void {
    this.flying.get(block)?.abort();
    const controller = new AbortController();
    this.flying.set(block, controller);
    const size = this.blockSize();
    const request: PctTableRequest<Id> = {
      from: block * size,
      to: (block + 1) * size,
      // The headers write the ids of sortable columns: those the source sorts by.
      sort: this.table.sort() as readonly PctTableSort<Id>[],
      filter: this.table.filter(),
    };
    const settle = (state: PctBlock<T>): void => {
      if (controller.signal.aborted) return;
      this.flying.delete(block);
      this.blocks.update((blocks) => new Map(blocks).set(block, state));
    };
    // A load that throws rather than rejects fails its block all the same.
    new Promise<PctTableAnswer<T>>((resolve) =>
      resolve(this.load()(request, controller.signal)),
    ).then(
      (answer) => {
        if (controller.signal.aborted) return;
        this.count.set(answer.total);
        this.answered.set(true);
        settle({ state: 'loaded', rows: answer.rows });
      },
      (error: unknown) =>
        settle({
          state: 'failed',
          error,
          rows: this.blocks().get(block)?.rows ?? null,
        }),
    );
  }

  private frame(): HTMLElement {
    return this.host.nativeElement.querySelector(
      ':scope > pct-table-frame',
    ) as HTMLElement;
  }
}
