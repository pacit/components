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
  type PctBlockRows,
} from './model/blocks';
import type { PctRowId } from './model/columns';
import type { PctAnyColumnFilter } from './model/filters';
import { pctGroupKey } from './model/lines';
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
 * A failed block as the table holds it: the key of the list it is of and its number. The
 * table hands it back to the retry and reads nothing in it; one object per failure, so the
 * holes of one block are seen as one.
 */
interface Failure {
  readonly list: string;
  readonly block: number;
}

/**
 * A group the source made: its key, its values from the outermost level down, and what the
 * source said of it. One object per group that came, so a list holds it as it holds a row.
 */
class Group {
  constructor(
    readonly key: string,
    readonly values: readonly unknown[],
    readonly count: number,
    readonly sums: Readonly<Record<string, unknown>> | undefined,
  ) {}
}

/** An item of a list: a row, or a group the source made. */
type Item<T> = T | Group;

/**
 * The key of a list: the branch whose children it holds, or the group whose members it does,
 * both `null` for the top. A row's id and a group's key are kept apart, a `1` from a `'1'` too.
 */
function listKey(parent: PctRowId | null, group: string | null): string {
  return JSON.stringify([parent, group]);
}

/**
 * One list the source answers for: the roots, the children of a branch that opened or the
 * members of a group, each asked for a block at a time.
 */
interface List<T> {
  /** Its key among the lists: its `parent` and its `group`. */
  readonly key: string;
  /** The branch whose children these are, `null` for the roots and a group's members. */
  readonly parent: PctRowId | null;
  /** The ids of the branches above the list, the outermost first and `parent` last. */
  readonly path: readonly PctRowId[];
  /** The key of the group whose members these are, `null` outside one. */
  readonly group: string | null;
  /** The values of the groups the list stands in, the outermost first. */
  readonly values: readonly unknown[];
  /** Each block asked for, and what came of it. */
  readonly blocks: WritableSignal<ReadonlyMap<number, PctBlock<Item<T>>>>;
  /**
   * The count the last answer gave; `null` before a branch's first. The roots' is a number
   * from the start, and stays the last question's until a block of a new one answers.
   */
  readonly count: WritableSignal<number | null>;
  /** The list as the table draws it: a hole wherever no block came, one while none has. */
  readonly rows: Signal<readonly (Item<T> | undefined)[]>;
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
   * @since next
   */
  readonly parent: PctRowId | null;
  /**
   * The ids of the branches above the rows asked for, the outermost first and `parent` last;
   * empty for the roots.
   *
   * @since next
   */
  readonly path: readonly PctRowId[];
  /**
   * The columns the rows are grouped by, outermost first: `pctTableGroups`'s `groupBy`, empty
   * without it.
   *
   * @since next
   */
  readonly groupBy: readonly string[];
  /**
   * The values of the group whose members are asked for, outermost first; empty for the top.
   * Shorter than `groupBy`, the source answers with the groups one level deeper
   * ({@link PctTableGroupsAnswer}); as long, with the group's rows.
   *
   * @since next
   */
  readonly group: readonly unknown[];
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
 * A group a remote source made, one level of `groupBy`: the value its rows share in that
 * level's column, how many rows it holds, and the sums its heading shows.
 *
 * @since next
 */
export interface PctTableGroup {
  /** The value its rows share, as the column reads it: its heading writes it as the column does. */
  readonly value: unknown;
  /** How many rows it holds, those of the groups inside it too. */
  readonly count: number;
  /**
   * The sums of its rows by column id, each a value of the column's kind, written as the
   * column writes it; a column with none is written as nothing.
   */
  readonly sums?: Readonly<Record<string, unknown>>;
}

/**
 * What a remote source answers when asked into a group shallower than `groupBy`: the groups of
 * the block, one level deeper, and how many there are in all.
 *
 * @since next
 */
export interface PctTableGroupsAnswer {
  readonly groups: readonly PctTableGroup[];
  readonly total: number;
}

/**
 * Loads a block of rows, or of groups when the table groups them. `signal` aborts when the
 * table no longer needs the block: the order or the question changed, or the view left it
 * before it came.
 *
 * @since 0.3.0
 */
export type PctTableLoad<T, Id extends string = string> = (
  request: PctTableRequest<Id>,
  signal: AbortSignal,
) => Promise<PctTableAnswer<T> | PctTableGroupsAnswer>;

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
 * - **Groups are the source's to make** ([0123](../../../../docs/decisions/0123-a-group-of-a-remote-source-is-the-sources.md)):
 *   with `pctTableGroups`, the source is asked under `request.groupBy` and answers the top
 *   with groups, each with its count and sums; an open group's members are a list of their
 *   own, asked for under `request.group` — groups one level deeper, or its rows — as the view
 *   reaches them. The table groups, counts and sums none of the rows itself.
 * - **It needs `pctTableWindow`**: without a window every row of the source would be drawn,
 *   holes and all.
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
   * @since next
   */
  readonly hasChildren = input<((row: T) => boolean) | null>(null);

  /**
   * Each list asked for under the current question, by its key — the top's, which is always
   * there, of no branch and no group.
   */
  private readonly lists = signal<ReadonlyMap<string, List<T>>>(new Map());

  /**
   * The columns the lists held were asked to group by: the table's `groupedBy` as it was at
   * the question, so a list of groups is never read as one of rows.
   */
  private readonly levels = signal<readonly string[]>([]);

  /** The roots: the list every table of a remote source has. */
  private readonly roots = this.list(null, [], null, [], 0);

  /**
   * Where each row and group that came stands: its list and its place in it. Written as a
   * block comes and let go with it, so a row's place is read without walking a list.
   */
  private readonly placed = new Map<Item<T>, { list: List<T>; at: number }>();

  /** Each row that came, by id: the branch a list of its children is asked under. */
  private readonly byId = new Map<PctRowId, T>();

  /** Each group that came, by key: the group a list of its members is asked under. */
  private readonly byKey = new Map<string, Group>();

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
      this.table.groupedBy(),
    ]),
  );

  /**
   * The rows the window draws, by list: the first and the last place drawn in each. A row's
   * place is where its block put it, a hole's the line's own.
   */
  private readonly drawnRows = computed(() => {
    const lines = this.table.lines();
    const { start, end } = this.window.drawn();
    const drawn = new Map<string, { from: number; to: number }>();
    const mark = (key: string, at: number) => {
      const seen = drawn.get(key);
      if (seen === undefined) drawn.set(key, { from: at, to: at + 1 });
      else drawn.set(key, { from: seen.from, to: at + 1 });
    };
    const markPlace = (item: Item<T> | undefined) => {
      const place = item === undefined ? undefined : this.placed.get(item);
      // A row of the tree inside the rows that came has no list of its own.
      if (place !== undefined) mark(place.list.key, place.at);
    };
    for (let line = start; line < end; line++) {
      const found = lines[line];
      if (found.kind === 'hole')
        mark(listKey(found.parent, found.group), found.at);
      else if (found.kind === 'row') markPlace(found.row);
      else if (found.kind === 'group') markPlace(this.byKey.get(found.key));
    }
    // Nothing drawn is the top of the roots, where the first block is asked for.
    if (drawn.size === 0) drawn.set(this.roots.key, { from: 0, to: 0 });
    return drawn;
  });

  /** The blocks the rows drawn need, by list. */
  private readonly wanted = computed(() => {
    const wanted = new Map<string, readonly number[]>();
    for (const [key, { from, to }] of this.drawnRows())
      wanted.set(key, this.blocksFor(this.lists().get(key), from, to));
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
      retry: ({ list: key, block }) => {
        const list = this.lists().get(key);
        if (list !== undefined) this.askAgain(list, [block]);
      },
    });
    this.table.contribute({
      remote: {
        rows: computed(() =>
          this.levels().length === 0 ? this.roots.rows() : this.grouped(),
        ),
        loading: this.loading,
        failed: computed(() => {
          const lists = this.lists();
          const size = this.size();
          return ({ parent, group, at }) => {
            const list = lists.get(listKey(parent, group));
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
            return lists.get(listKey(id(row), null))?.rows() ?? UNASKED;
          };
        }) as Signal<((row: never) => readonly unknown[] | undefined) | null>,
        grouped: computed(() => {
          const by = this.levels();
          if (by.length === 0) return null;
          const lists = this.lists();
          return {
            by,
            top: this.roots.rows(),
            group: (item: unknown) =>
              item instanceof Group
                ? {
                    key: item.key,
                    level: item.values.length - 1,
                    value: item.values[item.values.length - 1],
                    count: item.count,
                    sums: item.sums,
                    members: () =>
                      lists.get(listKey(null, item.key))?.rows() ?? UNASKED,
                  }
                : undefined,
          };
        }),
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
          // A new list: the old one's blocks go, and the new ones are of the new size and
          // grouped by the new columns.
          this.clear();
          this.size.set(this.blockSize());
          this.levels.set(this.table.groupedBy());
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
              [
                this.roots.key,
                this.blocksFor(this.roots, 0, end - this.window.first()),
              ],
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
      const view = wanted.get(list.key) ?? [];
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

  /**
   * The rows that came in the groups' lists, in the order the groups stand: what the table
   * reads as the rows a source sent.
   */
  private grouped(): readonly T[] {
    const lists = this.lists();
    const rows: T[] = [];
    const walk = (list: readonly (Item<T> | undefined)[]) => {
      for (const item of list) {
        if (item instanceof Group) {
          const members = lists.get(listKey(null, item.key));
          if (members !== undefined) walk(members.rows());
        } else if (item !== undefined) rows.push(item);
      }
    };
    walk(this.roots.rows());
    return rows;
  }

  /**
   * A list of its own, the roots, a branch's children or a group's members, with no block
   * asked for.
   */
  private list(
    parent: PctRowId | null,
    path: readonly PctRowId[],
    group: string | null,
    values: readonly unknown[],
    count: number | null,
  ): List<T> {
    const blocks = signal<ReadonlyMap<number, PctBlock<Item<T>>>>(new Map());
    const counted = signal(count);
    // The rows last drawn: a block that comes is written into a copy of them.
    let drawn: PctBlockRows<Item<T>> | undefined;
    const list: List<T> = {
      key: listKey(parent, group),
      parent,
      path,
      group,
      values,
      blocks,
      count: counted,
      rows: computed(() => {
        const total = counted();
        if (total === null) return UNASKED;
        const held = blocks();
        const size = this.size();
        const rows = pctBlockRows(held, total, size, drawn);
        drawn = { blocks: held, total, size, rows };
        return rows;
      }),
      flying: new Map(),
      failures: new Map(),
    };
    this.lists.update((lists) => new Map(lists).set(list.key, list));
    return list;
  }

  /** The failure of a failed block, the same object for each of its holes. */
  private failureOf(list: List<T>, block: number): Failure {
    let failure = list.failures.get(block);
    if (failure === undefined) {
      failure = { list: list.key, block };
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

  /** Lets every block go, and every branch's and group's list: the roots stay, with their count. */
  private clear(): void {
    for (const list of this.lists().values())
      this.letGo(list, [...list.blocks().keys()]);
    this.lists.set(new Map([[this.roots.key, this.roots]]));
    this.placed.clear();
    this.byId.clear();
    this.byKey.clear();
  }

  /**
   * Follows the view: asks for each block of `wanted` not asked for, opening the list of a
   * branch or a group the first time its members are drawn, and lets go of the blocks the
   * view left that have no rows to show — still coming, or failed — so a scroll past them
   * waits for none, and one back to them asks again.
   */
  private follow(wanted: ReadonlyMap<string, readonly number[]>): void {
    for (const list of this.lists().values()) {
      const view = wanted.get(list.key) ?? [];
      this.letGo(
        list,
        [...list.blocks()].flatMap(([block, state]) =>
          state.rows === null && !view.includes(block) ? [block] : [],
        ),
      );
    }
    for (const [key, blocks] of wanted) {
      const list = this.lists().get(key) ?? this.branch(key);
      if (list === null) continue;
      const held = list.blocks();
      this.askAgain(
        list,
        blocks.filter((block) => !held.has(block)),
      );
    }
  }

  /**
   * The list of a branch's children or a group's members, made the first time they are drawn;
   * `null` for one whose row or group has not come, which a hole cannot name.
   */
  private branch(key: string): List<T> | null {
    const [parent, group] = JSON.parse(key) as [PctRowId | null, string | null];
    if (parent === null) {
      const made = group === null ? undefined : this.byKey.get(group);
      return made === undefined
        ? null
        : this.list(null, [], made.key, made.values, null);
    }
    const row = this.byId.get(parent);
    if (row === undefined) return null;
    // A branch stands in the groups its row stands in.
    const above = this.placed.get(row)?.list;
    return this.list(
      parent,
      [...(above?.path ?? []), parent],
      null,
      above?.values ?? [],
      null,
    );
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

  /** Writes where each row or group of a block that came stands. */
  private place(list: List<T>, block: number, items: readonly Item<T>[]): void {
    const size = this.size();
    const id = this.table.rowId();
    items.slice(0, size).forEach((item, i) => {
      this.placed.set(item, { list, at: block * size + i });
      if (item instanceof Group) this.byKey.set(item.key, item);
      else this.byId.set(id(item), item);
    });
  }

  /**
   * Forgets where the rows and groups of a block let go stood, unless another block holds
   * them now.
   */
  private unplace(list: List<T>, items: readonly Item<T>[] | null): void {
    const id = this.table.rowId();
    for (const item of items ?? []) {
      if (this.placed.get(item)?.list !== list) continue;
      this.placed.delete(item);
      if (item instanceof Group) {
        if (this.byKey.get(item.key) === item) this.byKey.delete(item.key);
      } else if (this.byId.get(id(item)) === item) this.byId.delete(id(item));
    }
  }

  /** Asks the source for a block of a list, and writes what comes of it unless let go. */
  private request(list: List<T>, block: number): void {
    list.flying.get(block)?.abort();
    const controller = new AbortController();
    list.flying.set(block, controller);
    const size = this.size();
    const groupBy = this.levels();
    // Shallower than the columns grouped by, a list holds groups; as deep, rows.
    const groups = list.values.length < groupBy.length;
    const request: PctTableRequest<Id> = {
      parent: list.parent,
      path: list.path,
      groupBy,
      group: list.values,
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
      state: (rows: readonly Item<T>[] | null) => PctBlock<Item<T>>,
    ): boolean => {
      if (controller.signal.aborted) return false;
      list.flying.delete(block);
      list.blocks.update((blocks) =>
        new Map(blocks).set(
          block,
          state((blocks.get(block) as PctBlock<Item<T>>).rows),
        ),
      );
      return true;
    };
    // A failed block keeps the rows it had: a refresh that failed draws them as they were.
    const fail = (error: unknown) =>
      settle((rows) => ({ state: 'failed', error, rows }));
    // A load that throws rather than rejects fails its block all the same.
    new Promise<PctTableAnswer<T> | PctTableGroupsAnswer>((resolve) =>
      resolve(this.load()(request, controller.signal)),
    ).then((answer) => {
      const { total } = answer;
      const items = this.itemsOf(answer, groups, list.values);
      // A count that is no count of rows fails the block, as a load that threw would.
      if (!Number.isInteger(total) || total < 0)
        fail(
          new RangeError(
            `[pct-data-table] pctTableRemote: a block's total must be a whole number of rows, not ${String(total)}.`,
          ),
        );
      else if (items instanceof Error) fail(items);
      else {
        if (controller.signal.aborted) return;
        // The places first: the lines the answer makes are read by them.
        this.unplace(list, list.blocks().get(block)?.rows ?? null);
        this.place(list, block, items);
        settle(() => ({ state: 'loaded', rows: items }));
        list.count.set(total);
      }
    }, fail);
  }

  /**
   * What an answer holds for a list: its rows, or the groups it made one level deeper than
   * `values` — or the error that fails the block, for an answer of the other kind or a group
   * whose count is no count of rows.
   */
  private itemsOf(
    answer: PctTableAnswer<T> | PctTableGroupsAnswer,
    groups: boolean,
    values: readonly unknown[],
  ): readonly Item<T>[] | Error {
    const field = groups ? 'groups' : 'rows';
    const items: unknown = (answer as unknown as Record<string, unknown>)[
      field
    ];
    if (!Array.isArray(items))
      return new TypeError(
        `[pct-data-table] pctTableRemote: a block asked for under ${JSON.stringify(values)} of groupBy needs \`${field}\`: the table groups by ${groups ? 'more' : 'no more'} columns there.`,
      );
    if (!groups) return items as readonly T[];
    const made: Group[] = [];
    for (const { value, count, sums } of items as readonly PctTableGroup[]) {
      if (!Number.isInteger(count) || count < 0)
        return new RangeError(
          `[pct-data-table] pctTableRemote: a group's count must be a whole number of rows, not ${String(count)}.`,
        );
      const path = [...values, value];
      made.push(new Group(pctGroupKey(path), path, count, sums));
    }
    return made;
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
