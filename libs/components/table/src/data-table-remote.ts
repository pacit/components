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
  type Signal,
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
import type { PctRowId } from './model/columns';
import type { PctAnyColumnFilter } from './model/filters';
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
  readonly retry: (failure: Failure) => void;
}

/**
 * A failed block as the table holds it: the list it is of and its number. The table hands it
 * back to the retry and reads nothing in it; one object per failure, so the holes of one
 * block are seen as one.
 */
interface Failure {
  readonly parent: PctRowId | null;
  readonly block: number;
}

/**
 * One list the source answers for: the roots, or the children of a branch that opened, each
 * asked for a block at a time.
 */
interface List<T> {
  /** The branch whose children these are, `null` for the roots. */
  readonly parent: PctRowId | null;
  /** The ids of the branches above the list, the outermost first and `parent` last. */
  readonly path: readonly PctRowId[];
  /** Each block asked for, and what came of it. */
  readonly blocks: WritableSignal<ReadonlyMap<number, PctBlock<T>>>;
  /**
   * The count the last answer gave; `null` before a branch's first. The roots' is a number
   * from the start, and stays the last question's until a block of a new one answers.
   */
  readonly count: WritableSignal<number | null>;
  /** The list as the table draws it: a hole wherever no block came, one while none has. */
  readonly rows: Signal<readonly (T | undefined)[]>;
  /** The requests in flight, by block, so a block let go aborts its own. */
  readonly flying: Map<number, AbortController>;
  /** Each failed block's failure, kept so the holes of one block hand over one object. */
  readonly failures: Map<number, Failure>;
}

/** A branch not asked for yet: one hole, the first block's, which its opening asks for. */
const UNASKED: readonly undefined[] = [undefined];

const LINKS = /* @__PURE__ */ new WeakMap<object, Link>();

/**
 * What a remote source is asked for: a block of rows, `[from, to)`, in the order and under
 * the question the table holds.
 *
 * @since 0.3.0
 */
export interface PctTableRequest<Id extends string = string> {
  /**
   * The branch whose children are asked for, with `hasChildren` and `pctTableTree`; `null`
   * for the roots.
   *
   * @since 0.3.1
   */
  readonly parent: PctRowId | null;
  /**
   * The ids of the branches above the rows asked for, the outermost first and `parent` last;
   * empty for the roots.
   *
   * @since 0.3.1
   */
  readonly path: readonly PctRowId[];
  /** The first row of the block, counted in its list: the roots, or `parent`'s children. */
  readonly from: number;
  /** The row after the block's last: the source gives fewer past the end of its rows. */
  readonly to: number;
  /** The table's `sort`, its first key deciding first. */
  readonly sort: readonly PctTableSort<Id>[];
  /** The table's quick filter, as it was typed. */
  readonly filter: string;
  /**
   * The columns' filters in force by column id — those of `pctTableColumnFilters` that let
   * some row out, empty without it: the source applies them, as it applies the quick filter.
   */
  readonly columnFilters: Readonly<Record<string, PctAnyColumnFilter>>;
}

/**
 * What a remote source answers: the rows of the block asked for, and how many rows there are
 * in all under the question — in the list asked for, the roots or a branch's children.
 *
 * @since 0.3.0
 */
export interface PctTableAnswer<T> {
  readonly rows: readonly T[];
  readonly total: number;
}

/**
 * Loads a block of rows. `signal` aborts when the table no longer needs the block: the order
 * or the question changed, or the view left it before it came.
 *
 * @since 0.3.0
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
 * - **A tree's branches can be the source's** ([0122](../../../../docs/decisions/0122-a-branch-of-a-remote-source-is-a-list-of-its-own.md)):
 *   with `pctTableTree` and `hasChildren`, the roots come first, and a branch's children are
 *   a list of their own, asked for under `request.parent` when it opens, a block at a time as
 *   the view reaches them, with a count and holes of their own. A closed branch keeps the
 *   rows that came; a new order or question lets every branch's go, and asks again for the
 *   open ones as their rows come back.
 * - **It needs `pctTableWindow`**: without a window every row of the source would be drawn,
 *   holes and all. Groups are the source's to make, and the table makes none of its rows.
 *
 * `refresh()` asks again for the blocks in view and lets the rest go, for data that lives;
 * `invalidate()` lets every row go, the scroll staying where it is.
 *
 * @example
 * <pct-data-table pctTableWindow [pctTableRemote]="load" [columns]="columns" [rowId]="byId" [(sort)]="sort" style="block-size: 30rem" />
 *
 * @since 0.3.0
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
   * @since 0.3.0
   */
  readonly load = input.required<PctTableLoad<T, Id>>({
    alias: 'pctTableRemote',
  });

  /**
   * How many rows a block holds: what one request asks for. A whole number of at least one;
   * anything else is the default.
   *
   * @since 0.3.0
   */
  readonly blockSize = input(100, { transform: sizeOf });

  /**
   * A new order or question keeps the scroll where it was, rather than going back to the top.
   *
   * @since 0.3.0
   */
  readonly keepScroll = input(false, { transform: booleanAttribute });

  /**
   * With `pctTableTree`: whether a row has children, which the source holds. A branch's
   * children are asked for when it opens, a block at a time as the view reaches them, under
   * `request.parent`; `null` leaves the tree to the rows that came, as `children` reads them.
   *
   * @since 0.3.1
   */
  readonly hasChildren = input<((row: T) => boolean) | null>(null);

  /**
   * Each list asked for under the current question, by the branch it is of — `null` the roots,
   * which are always there.
   */
  private readonly lists = signal<ReadonlyMap<PctRowId | null, List<T>>>(
    new Map(),
  );

  /** The roots: the list every table of a remote source has. */
  private readonly roots = this.list(null, [], 0);

  /**
   * Where each row that came stands: its list and its place in it. Written as a block comes
   * and let go with it, so a row's place is read without walking a list.
   */
  private readonly placed = new Map<T, { list: List<T>; at: number }>();

  /** Each row that came, by id: the branch a list of its children is asked under. */
  private readonly byId = new Map<PctRowId, T>();

  /**
   * The size the blocks held were asked at: a new `blockSize` is a new list, and until the
   * blocks of the old one are let go their rows stand where that size put them.
   */
  private readonly size = signal(0);

  /**
   * How many rows the source counts, as its last answer said; 0 before the first. With a tree,
   * the roots.
   *
   * @since 0.3.0
   */
  readonly total = computed(() => this.roots.count() ?? 0);

  /** Every block of every list. */
  private readonly allBlocks = computed(() =>
    [...this.lists().values()].flatMap((list) => [...list.blocks().values()]),
  );

  /**
   * A block is in flight.
   *
   * @since 0.3.0
   */
  readonly loading = computed(() =>
    this.allBlocks().some((block) => block.state === 'loading'),
  );

  /**
   * What the load of a block threw, while a block the table holds has failed; `null` while
   * none has. A failed block the view leaves is let go, and asked again when it comes back.
   *
   * @since 0.3.0
   */
  readonly error = computed(() => {
    for (const block of this.allBlocks())
      if (block.state === 'failed') return block.error;
    return null;
  });

  /**
   * The order, the questions and the size of a block: a change of any is a list of its own.
   */
  private readonly query = computed(() =>
    JSON.stringify([
      this.table.sort(),
      this.table.filter(),
      this.table.columnFilters(),
      this.blockSize(),
    ]),
  );

  /**
   * The rows the window draws, by list: the first and the last place drawn in each. A row's
   * place is where its block put it, a hole's the line's own.
   */
  private readonly drawnRows = computed(() => {
    const lines = this.table.lines();
    const { start, end } = this.window.drawn();
    const drawn = new Map<PctRowId | null, { from: number; to: number }>();
    const mark = (parent: PctRowId | null, at: number) => {
      const seen = drawn.get(parent);
      if (seen === undefined) drawn.set(parent, { from: at, to: at + 1 });
      else drawn.set(parent, { from: seen.from, to: at + 1 });
    };
    for (let line = start; line < end; line++) {
      const found = lines[line];
      if (found.kind === 'hole') mark(found.parent, found.at);
      else if (found.kind === 'row') {
        const place = this.placed.get(found.row);
        // A row of the tree inside the rows that came has no list of its own.
        if (place !== undefined) mark(place.list.parent, place.at);
      }
    }
    // Nothing drawn is the top of the roots, where the first block is asked for.
    if (drawn.size === 0) drawn.set(null, { from: 0, to: 0 });
    return drawn;
  });

  /** The blocks the rows drawn need, by list. */
  private readonly wanted = computed(() => {
    const wanted = new Map<PctRowId | null, readonly number[]>();
    for (const [parent, { from, to }] of this.drawnRows())
      wanted.set(parent, this.blocksFor(this.lists().get(parent), from, to));
    return wanted;
  });

  /** The question the blocks held were asked under, and the source that answered it. */
  private asked: {
    readonly query: string;
    readonly load: PctTableLoad<T, Id>;
  } | null = null;

  constructor() {
    const parts = signal<PctTableRemoteParts | null>(null);
    LINKS.set(this, {
      parts,
      retry: ({ parent, block }) => {
        const list = this.lists().get(parent);
        if (list !== undefined) this.askAgain(list, [block]);
      },
    });
    this.table.contribute({
      remote: {
        rows: this.roots.rows,
        loading: this.loading,
        failed: computed(() => {
          const lists = this.lists();
          const size = this.size();
          return ({ parent, at }) => {
            const list = lists.get(parent);
            if (list === undefined) return null;
            const block = pctFailedBlock(list.blocks(), at, size);
            return block === null ? null : this.failureOf(list, block);
          };
        }),
        children: computed(() => {
          const has = this.hasChildren();
          if (has === null) return null;
          const id = this.table.rowId();
          const lists = this.lists();
          return (row: T) => {
            if (!has(row)) return undefined;
            return lists.get(id(row))?.rows() ?? UNASKED;
          };
        }) as Signal<((row: never) => readonly unknown[] | undefined) | null>,
        parts: PctTableRemoteParts,
        // Read once the table has made the parts: a block fails after its first render.
        failure: computed(() => (parts() as PctTableRemoteParts).failure()),
      },
    });
    inject(DestroyRef).onDestroy(() => {
      for (const list of this.lists().values())
        this.letGo(list, [...list.flying.keys()]);
    });
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
        // Back to the top, where the new list starts: the blocks of as many roots as the view
        // and the lines below it draw. The window follows the scroll, and the view with it.
        untracked(() => {
          const { end } = this.window.drawn();
          const frame = this.frame();
          if (frame !== null) frame.scrollTop = 0;
          this.follow(
            new Map([
              [null, this.blocksFor(this.roots, 0, end - this.window.first())],
            ]),
          );
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
   * @since 0.3.0
   */
  refresh(): void {
    const wanted = this.wanted();
    for (const list of this.lists().values()) {
      const view = wanted.get(list.parent) ?? [];
      this.letGo(
        list,
        [...list.blocks().keys()].filter((block) => !view.includes(block)),
      );
      this.askAgain(list, view);
    }
  }

  /**
   * Lets every row go and asks for the blocks in view, the scroll staying where it is.
   *
   * @since 0.3.0
   */
  invalidate(): void {
    this.clear();
    this.follow(this.wanted());
  }

  /** A list of its own, the roots or a branch's children, with no block asked for. */
  private list(
    parent: PctRowId | null,
    path: readonly PctRowId[],
    count: number | null,
  ): List<T> {
    const blocks = signal<ReadonlyMap<number, PctBlock<T>>>(new Map());
    const counted = signal(count);
    const list: List<T> = {
      parent,
      path,
      blocks,
      count: counted,
      rows: computed(() => {
        const total = counted();
        return total === null
          ? UNASKED
          : pctBlockRows(blocks(), total, this.size());
      }),
      flying: new Map(),
      failures: new Map(),
    };
    this.lists.update((lists) => new Map(lists).set(parent, list));
    return list;
  }

  /** The failure of a failed block, the same object for each of its holes. */
  private failureOf(list: List<T>, block: number): Failure {
    let failure = list.failures.get(block);
    if (failure === undefined) {
      failure = { parent: list.parent, block };
      list.failures.set(block, failure);
    }
    return failure;
  }

  /**
   * The blocks rows `[from, to)` of a list need under the count known; the first while there
   * is none, so a source that had no rows is asked again.
   */
  private blocksFor(
    list: List<T> | undefined,
    from: number,
    to: number,
  ): readonly number[] {
    const count = list?.count() ?? null;
    return pctBlocksFor(
      { start: from, end: to },
      count !== null && count > 0 ? count : null,
      this.size(),
    );
  }

  /** Lets every block go, and every branch's list: the roots stay, with their count. */
  private clear(): void {
    for (const list of this.lists().values())
      this.letGo(list, [...list.blocks().keys()]);
    this.lists.set(new Map([[null, this.roots]]));
    this.placed.clear();
    this.byId.clear();
  }

  /**
   * Follows the view: asks for each block of `wanted` not asked for, opening the list of a
   * branch the first time its children are drawn, and lets go of the blocks the view left
   * that have no rows to show — still coming, or failed — so a scroll past them waits for
   * none, and one back to them asks again.
   */
  private follow(
    wanted: ReadonlyMap<PctRowId | null, readonly number[]>,
  ): void {
    for (const list of this.lists().values()) {
      const view = wanted.get(list.parent) ?? [];
      this.letGo(
        list,
        [...list.blocks()].flatMap(([block, state]) =>
          state.rows === null && !view.includes(block) ? [block] : [],
        ),
      );
    }
    for (const [parent, blocks] of wanted) {
      const list = this.lists().get(parent) ?? this.branch(parent);
      if (list === null) continue;
      const held = list.blocks();
      this.askAgain(
        list,
        blocks.filter((block) => !held.has(block)),
      );
    }
  }

  /**
   * The list of a branch's children, made the first time they are drawn; `null` for a branch
   * none of whose rows came, which a hole cannot name.
   */
  private branch(parent: PctRowId | null): List<T> | null {
    if (parent === null) return this.roots;
    const row = this.byId.get(parent);
    if (row === undefined) return null;
    const above = this.placed.get(row)?.list.path ?? [];
    return this.list(parent, [...above, parent], null);
  }

  /** Asks for each of `blocks` of a list, keeping the rows a block has until its answer. */
  private askAgain(list: List<T>, blocks: readonly number[]): void {
    if (blocks.length === 0) return;
    const next = new Map(list.blocks());
    for (const block of blocks) {
      next.set(block, {
        state: 'loading',
        rows: next.get(block)?.rows ?? null,
      });
      list.failures.delete(block);
      this.request(list, block);
    }
    list.blocks.set(next);
  }

  /** Aborts the requests of `blocks` of a list and forgets them, their rows' places too. */
  private letGo(list: List<T>, blocks: readonly number[]): void {
    if (blocks.length === 0) return;
    const next = new Map(list.blocks());
    for (const block of blocks) {
      list.flying.get(block)?.abort();
      list.flying.delete(block);
      list.failures.delete(block);
      this.unplace(list, next.get(block)?.rows ?? null);
      next.delete(block);
    }
    list.blocks.set(next);
  }

  /** Writes where each row of a block that came stands. */
  private place(list: List<T>, block: number, rows: readonly T[]): void {
    const size = this.size();
    const id = this.table.rowId();
    rows.slice(0, size).forEach((row, i) => {
      this.placed.set(row, { list, at: block * size + i });
      this.byId.set(id(row), row);
    });
  }

  /** Forgets where the rows of a block let go stood, unless another block holds them now. */
  private unplace(list: List<T>, rows: readonly T[] | null): void {
    const id = this.table.rowId();
    for (const row of rows ?? []) {
      if (this.placed.get(row)?.list !== list) continue;
      this.placed.delete(row);
      if (this.byId.get(id(row)) === row) this.byId.delete(id(row));
    }
  }

  /** Asks the source for a block of a list, and writes what comes of it unless let go. */
  private request(list: List<T>, block: number): void {
    list.flying.get(block)?.abort();
    const controller = new AbortController();
    list.flying.set(block, controller);
    const size = this.size();
    const request: PctTableRequest<Id> = {
      parent: list.parent,
      path: list.path,
      from: block * size,
      to: (block + 1) * size,
      // The headers write the ids of sortable columns: those the source sorts by.
      sort: this.table.sort() as readonly PctTableSort<Id>[],
      filter: this.table.filter(),
      columnFilters: this.table.columnFilters(),
    };
    /**
     * Writes what came of the block, unless it was let go: a block let go is no longer the
     * table's, and one asked again is a request of its own.
     */
    const settle = (
      state: (rows: readonly T[] | null) => PctBlock<T>,
    ): boolean => {
      if (controller.signal.aborted) return false;
      list.flying.delete(block);
      list.blocks.update((blocks) =>
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
      else {
        if (controller.signal.aborted) return;
        // The places first: the lines the answer makes are read by them.
        this.unplace(list, list.blocks().get(block)?.rows ?? null);
        this.place(list, block, answer.rows);
        settle(() => ({ state: 'loaded', rows: answer.rows }));
        list.count.set(total);
      }
    }, fail);
  }

  /**
   * The frame that scrolls, or `null` where there is none to scroll: a server lays nothing
   * out, and its DOM answers a `:scope` query with `undefined`.
   */
  private frame(): HTMLElement | null {
    return (
      this.host.nativeElement.querySelector<HTMLElement>(
        ':scope > pct-table-frame',
      ) ?? null
    );
  }
}

/**
 * The parts a remote source's failure is drawn with: the sentence and the retry of the block,
 * in the first hole drawn of it or where an empty table says why. Declared here, drawn by the
 * table, so a table that loads nothing from a server carries none of it (0097).
 * `pctTableRemote` makes it, so it has no selector: there is no tag to write.
 *
 * @since 0.3.0
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
   * @since 0.3.0
   */
  readonly failure = viewChild.required<TemplateRef<unknown>>('failure');

  constructor() {
    this.link.parts.set(this);
  }

  /** The retry was pressed: the block is asked for again, keeping the rows it had. */
  protected retry(failure: Failure): void {
    this.link.retry(failure);
  }
}
