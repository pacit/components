import type { PctRowId } from './columns';

/**
 * How a tree of rows is read: each row's children, which rows the filter matches, and how a
 * list of siblings is ordered.
 *
 * @since 0.3.1
 */
export interface PctTreeOptions<T> {
  /**
   * A row's children; `undefined` or an empty list for a leaf. An `undefined` in the list is a
   * hole, a child a remote source has not sent yet.
   */
  readonly children: (row: T) => readonly (T | undefined)[] | undefined;
  /**
   * The filter's own verdict on a row. A row stays when it matches or a row below it does,
   * so a match is never shown without the rows that lead to it. Left out, every row stays.
   */
  readonly matches?: (row: T) => boolean;
  /**
   * Orders a list of siblings. Left out, the siblings stand as the data has them, and so does
   * a list with a hole: its source ordered it.
   */
  readonly order?: (rows: readonly T[]) => readonly T[];
}

/**
 * Where a row stands among the siblings kept beside it, counted from 1.
 *
 * @since 0.3.1
 */
export interface PctTreePlace {
  readonly position: number;
  readonly siblings: number;
}

/**
 * The tree the filter left, in order: what the table draws its lines from, and what it
 * answers questions about a row's parent and place with.
 *
 * @since 0.3.1
 */
export interface PctTree<T> {
  /** The roots kept, in order, their holes left out. */
  readonly roots: readonly T[];
  /** Every row kept, depth first: what the filter let through, open or not. */
  readonly rows: readonly T[];
  /**
   * A row's children kept, in order, their holes in their places: `undefined` for a leaf as
   * given, an empty list for a branch none of whose children the filter kept, which is a leaf
   * to the table.
   */
  readonly children: (row: T) => readonly (T | undefined)[] | undefined;
  /** The rows kept for the rows below them only: they matched nothing themselves. */
  readonly muted: ReadonlySet<PctRowId>;
  /** Each row's parent, by id; a root has none. */
  readonly parents: ReadonlyMap<PctRowId, PctRowId>;
  /** Each row's place among the siblings kept beside it, the holes among them counted. */
  readonly places: ReadonlyMap<PctRowId, PctTreePlace>;
}

/**
 * Reads a tree of rows once: prunes it to the filter's matches and their ancestors, orders
 * each list of siblings, and notes each row's parent and place
 * ([0112](../../../../../docs/decisions/0112-a-tree-is-pruned-to-the-matches-and-their-ancestors-and-its-semantics-come-with-the-grid.md)).
 *
 * The rows are read by identity, as `children` hands them out: a function that makes a new
 * list on every call still reads as one tree, since each row is asked once. A hole, in the
 * roots or among a row's children, is kept where it stands and judged by nothing: only a
 * remote source writes one, and it filtered its rows itself.
 *
 * @since 0.3.1
 */
export function pctTree<T>(
  roots: readonly (T | undefined)[],
  rowId: (row: T) => PctRowId,
  options: PctTreeOptions<T>,
): PctTree<T> {
  const { children, matches, order } = options;
  const kept = new Map<T, readonly (T | undefined)[] | undefined>();
  const muted = new Set<PctRowId>();
  // The rows below a row are read before the row is judged: a row that matches nothing stays
  // for a match below it.
  const prune = (
    list: readonly (T | undefined)[],
  ): readonly (T | undefined)[] => {
    const left: (T | undefined)[] = [];
    let holes = false;
    for (const row of list) {
      if (row === undefined) {
        holes = true;
        left.push(row);
        continue;
      }
      const kids = children(row);
      const below = kids === undefined ? undefined : prune(kids);
      const own = matches?.(row) ?? true;
      if (!own && (below === undefined || below.length === 0)) continue;
      if (!own) muted.add(rowId(row));
      kept.set(row, below);
      left.push(row);
    }
    return order && !holes ? order(left as readonly T[]) : left;
  };
  const top = prune(roots);
  const rows: T[] = [];
  const parents = new Map<PctRowId, PctRowId>();
  const places = new Map<PctRowId, PctTreePlace>();
  const walk = (
    list: readonly (T | undefined)[],
    parent: PctRowId | null,
  ): void => {
    list.forEach((row, i) => {
      if (row === undefined) return;
      const id = rowId(row);
      rows.push(row);
      if (parent !== null) parents.set(id, parent);
      places.set(id, { position: i + 1, siblings: list.length });
      const below = kept.get(row);
      if (below !== undefined) walk(below, id);
    });
  };
  walk(top, null);
  return {
    roots: top.filter((row): row is T => row !== undefined),
    rows,
    children: (row) => kept.get(row),
    muted,
    parents,
    places,
  };
}

/**
 * The ids of the rows above a row, its parent first: what opens to show it. Empty for a root
 * and for an id the tree does not hold.
 *
 * @since 0.3.1
 */
export function pctTreeAbove(
  parents: ReadonlyMap<PctRowId, PctRowId>,
  id: PctRowId,
): readonly PctRowId[] {
  const above: PctRowId[] = [];
  let at = parents.get(id);
  while (at !== undefined) {
    above.push(at);
    at = parents.get(at);
  }
  return above;
}
