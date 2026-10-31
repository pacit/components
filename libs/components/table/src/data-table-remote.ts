import {
  booleanAttribute,
  Component,
  computed,
  DestroyRef,
  Directive,
  effect,
  ElementRef,
  inject,
  input,
  numberAttribute,
  signal,
  TemplateRef,
  untracked,
  viewChild,
  type WritableSignal,
} from '@angular/core';
import { PctButton } from '@pacit/components/button';
import { PCT_TEXTS } from '@pacit/components/core';
import { PctDataTable } from './data-table';
import { PctTableWindow } from './data-table-window';
import {
  pctBlockRows,
  pctBlocksFor,
  pctFailedBlock,
  type PctBlock,
} from './model/blocks';
import type { PctTableSort } from './table';

/** A block's size as given: a whole number of rows, at least one, or the default's 100. */
function sizeOf(value: unknown): number {
  const size = Math.floor(numberAttribute(value, 100));
  return size >= 1 ? size : 100;
}

/**
 * Where the directive and the parts the table makes for it meet: the parts hand themselves in,
 * and the directive hands over the retry of a block. Kept in a map of this module's own, as
 * the selection's are, so a table that loads nothing from a server carries none of it.
 */
interface Link {
  readonly parts: WritableSignal<PctTableRemoteParts | null>;
  readonly retry: (block: number) => void;
}

const LINKS = /* @__PURE__ */ new WeakMap<object, Link>();

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
   * How many rows a block holds: what one request asks for. A whole number of at least one;
   * anything else is the default.
   *
   * @since next
   */
  readonly blockSize = input(100, { transform: sizeOf });

  /**
   * A new order or question keeps the scroll where it was, rather than going back to the top.
   *
   * @since next
   */
  readonly keepScroll = input(false, { transform: booleanAttribute });

  /** Each block asked for under the current question, and what came of it. */
  private readonly blocks = signal<ReadonlyMap<number, PctBlock<T>>>(new Map());

  /** The requests in flight, by block, so a block let go aborts its own. */
  private readonly flying = new Map<number, AbortController>();

  /**
   * The count the last answer gave, under any question: the length of the rows drawn. Until
   * a block of a new question answers, the count is the last question's.
   */
  private readonly count = signal(0);

  /**
   * The size the blocks held were asked at: a new `blockSize` is a new list, and until the
   * blocks of the old one are let go their rows stand where that size put them.
   */
  private readonly size = signal(0);

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
   * What the load of a block threw, while a block the table holds has failed; `null` while
   * none has. A failed block the view leaves is let go, and asked again when it comes back.
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
    pctBlockRows(this.blocks(), this.count(), this.size()),
  );

  /** The order, the question and the size of a block: a change of any is a list of its own. */
  private readonly query = computed(() =>
    JSON.stringify([this.table.sort(), this.table.filter(), this.blockSize()]),
  );

  /** The rows the window draws, `[from, to)`: the line's index counts rows. */
  private readonly drawnRows = computed(() => {
    const lines = this.table.lines();
    const { start, end } = this.window.drawn();
    // An open row's details take no row's place; a group's heading has no index, and the
    // table groups none of a remote source's rows.
    type Counted = { readonly index: number } | undefined;
    const first = lines.at(start) as Counted;
    const last = (end > start ? lines.at(end - 1) : undefined) as Counted;
    const from = first?.index ?? 0;
    return { from, to: last === undefined ? from : last.index + 1 };
  });

  /** The blocks the rows drawn need. */
  private readonly wanted = computed(() => {
    const { from, to } = this.drawnRows();
    return this.blocksFor(from, to);
  });

  /** The question the blocks held were asked under, and the source that answered it. */
  private asked: {
    readonly query: string;
    readonly load: PctTableLoad<T, Id>;
  } | null = null;

  constructor() {
    const parts = signal<PctTableRemoteParts | null>(null);
    LINKS.set(this, { parts, retry: (block) => this.askAgain([block]) });
    this.table.contribute({
      remote: {
        rows: this.rows,
        loading: this.loading,
        failed: computed(() => {
          const blocks = this.blocks();
          const size = this.size();
          return (index: number) => pctFailedBlock(blocks, index, size);
        }),
        parts: PctTableRemoteParts,
        // Read once the table has made the parts: a block fails after its first render.
        failure: computed(() => (parts() as PctTableRemoteParts).failure()),
      },
    });
    inject(DestroyRef).onDestroy(() => this.letGo([...this.flying.keys()]));
    effect(() => {
      const query = this.query();
      const load = this.load();
      const asked = this.asked;
      const same = asked?.query === query && asked.load === load;
      if (!same)
        untracked(() => {
          this.asked = { query, load };
          // A new list: the old one's blocks go, and the new ones are of the new size.
          this.clear();
          this.size.set(this.blockSize());
        });
      // The first list starts at the top too, where the frame stands.
      if (!same && !untracked(this.keepScroll)) {
        // Back to the top, where the new list starts: the blocks of as many rows as the view
        // and the lines below it draw. The window follows the scroll, and the view with it.
        untracked(() => {
          const { to } = this.drawnRows();
          const top = this.table.lines().at(this.window.first()) as
            { readonly index: number } | undefined;
          this.frame().scrollTop = 0;
          this.follow(this.blocksFor(0, to - (top?.index ?? 0)));
        });
        // Read all the same, so the view the scroll brings is followed.
        this.wanted();
        return;
      }
      const wanted = this.wanted();
      untracked(() => this.follow(wanted));
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

  /**
   * The blocks rows `[from, to)` need under the count known; the first while there is none,
   * so a source that had no rows is asked again.
   */
  private blocksFor(from: number, to: number): readonly number[] {
    const count = this.count();
    return pctBlocksFor(
      { start: from, end: to },
      count > 0 ? count : null,
      this.size(),
    );
  }

  /** Lets every block go. */
  private clear(): void {
    this.letGo([...this.blocks().keys()]);
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
    const size = this.size();
    const request: PctTableRequest<Id> = {
      from: block * size,
      to: (block + 1) * size,
      // The headers write the ids of sortable columns: those the source sorts by.
      sort: this.table.sort() as readonly PctTableSort<Id>[],
      filter: this.table.filter(),
    };
    /**
     * Writes what came of the block, unless it was let go: a block let go is no longer the
     * table's, and one asked again is a request of its own.
     */
    const settle = (
      state: (rows: readonly T[] | null) => PctBlock<T>,
    ): boolean => {
      if (controller.signal.aborted) return false;
      this.flying.delete(block);
      this.blocks.update((blocks) =>
        new Map(blocks).set(
          block,
          state((blocks.get(block) as PctBlock<T>).rows),
        ),
      );
      return true;
    };
    // A failed block keeps the rows it had: a refresh that failed draws them as they were.
    const fail = (error: unknown) =>
      settle((rows) => ({ state: 'failed', error, rows }));
    // A load that throws rather than rejects fails its block all the same.
    new Promise<PctTableAnswer<T>>((resolve) =>
      resolve(this.load()(request, controller.signal)),
    ).then((answer) => {
      const { total } = answer;
      // A count that is no count of rows fails the block, as a load that threw would.
      if (!Number.isInteger(total) || total < 0)
        fail(
          new RangeError(
            `[pct-data-table] pctTableRemote: a block's total must be a whole number of rows, not ${String(total)}.`,
          ),
        );
      else if (settle(() => ({ state: 'loaded', rows: answer.rows })))
        this.count.set(total);
    }, fail);
  }

  private frame(): HTMLElement {
    return this.host.nativeElement.querySelector(
      ':scope > pct-table-frame',
    ) as HTMLElement;
  }
}

/**
 * The parts a remote source's failure is drawn with: the sentence and the retry of the block,
 * in the first hole drawn of it or where an empty table says why. Declared here, drawn by the
 * table, so a table that loads nothing from a server carries none of it (0097).
 * `pctTableRemote` makes it, so it has no selector: there is no tag to write.
 *
 * @since next
 */
@Component({
  imports: [PctButton],
  // Its element is the table's child and draws nothing: the template stands where it is put.
  host: { hidden: '' },
  templateUrl: './data-table-remote.html',
  styleUrl: './data-table-remote.scss',
})
export class PctTableRemoteParts {
  protected readonly texts = inject(PCT_TEXTS);
  private readonly link = LINKS.get(inject(PctTableRemote)) as Link;

  /**
   * What a failed block says, given the block: the sentence and its retry.
   *
   * @since next
   */
  readonly failure = viewChild.required<TemplateRef<unknown>>('failure');

  constructor() {
    this.link.parts.set(this);
  }

  /** The retry was pressed: the block is asked for again, keeping the rows it had. */
  protected retry(block: number): void {
    this.link.retry(block);
  }
}
