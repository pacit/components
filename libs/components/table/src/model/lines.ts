import type { PctRowId } from './columns';

/**
 * One line the table draws, in the order it draws them. Each kind has a stable `key`; two
 * lines of different kinds may share one, so `@for` tracks {@link pctLineKey}, which holds
 * both.
 *
 * - `row`: a row of data. `index` counts the rows and holes drawn before it; `level` is its
 *   depth in a tree, 0 without one, and `expanded` whether its children are shown, `null`
 *   for a row with no children to show.
 * - `hole`: a row a remote source has not delivered yet, keyed by its index — the index of
 *   the source's list as long as no tree is expanded above it.
 * - `details`: the details of the row before it, the full width of the table.
 * - `group`: the heading of a group of rows.
 *
 * @since next
 */
export type PctTableLine<T> =
  | {
      readonly kind: 'row';
      readonly key: PctRowId;
      readonly row: T;
      readonly index: number;
      readonly level: number;
      readonly expanded: boolean | null;
    }
  | { readonly kind: 'hole'; readonly key: number; readonly index: number }
  | {
      readonly kind: 'details';
      readonly key: PctRowId;
      readonly row: T;
      readonly index: number;
    }
  | {
      readonly kind: 'group';
      readonly key: string;
      readonly level: number;
      readonly label: string;
      readonly count: number;
      readonly rows: readonly T[];
      readonly collapsed: boolean;
    };

/**
 * One level of grouping: the value rows are grouped by, and the label a group is headed with,
 * written from its first row.
 *
 * @since next
 */
export interface PctGroupBy<T> {
  readonly value: (row: T) => unknown;
  readonly label: (row: T) => string;
}

/**
 * What opens below or inside a row: its details, and its children in a tree; and the groups
 * the rows stand in.
 *
 * @since next
 */
export interface PctLinesOptions<T> {
  /**
   * The levels the rows are grouped by, outermost first. A group's key is the path of its
   * values, written as JSON, so it stays the same however the rows change.
   */
  readonly groups?: readonly PctGroupBy<T>[];
  /** The groups whose rows are hidden, by key. */
  readonly collapsed?: ReadonlySet<string>;
  /** The rows whose details are open, by id. */
  readonly details?: ReadonlySet<PctRowId>;
  /** A row's children, for a tree; `undefined` or an empty list for a leaf. */
  readonly children?: (row: T) => readonly T[] | undefined;
  /** The rows whose children are shown, by id. */
  readonly expanded?: ReadonlySet<PctRowId>;
}

/**
 * The lines the table draws for `rows`, in order.
 *
 * `rowId` is unique across the whole list, children included, and the children form a tree:
 * a row that is its own descendant never ends. A row is followed by its details when its id
 * is in `details`, and by its children, one
 * level deeper, when it has some and its id is in `expanded`; a collapsed row's children are
 * not lines at all, so the count of lines is the count a reader can reach. An `undefined` in
 * `rows` is a hole: only a remote source writes one, and nothing sorts or filters it.
 *
 * @since next
 */
export function pctLines<T>(
  rows: readonly (T | undefined)[],
  rowId: (row: T) => PctRowId,
  options: PctLinesOptions<T> = {},
): readonly PctTableLine<T>[] {
  const { details, children, expanded, groups = [], collapsed } = options;
  const lines: PctTableLine<T>[] = [];
  let index = 0;
  const walk = (list: readonly (T | undefined)[], level: number): void => {
    for (const row of list) {
      if (row === undefined) {
        lines.push({ kind: 'hole', key: index, index });
        index++;
        continue;
      }
      const key = rowId(row);
      const kids = children?.(row);
      const branch = kids !== undefined && kids.length > 0;
      const open = branch && (expanded?.has(key) ?? false);
      lines.push({
        kind: 'row',
        key,
        row,
        index,
        level,
        expanded: branch ? open : null,
      });
      if (details?.has(key)) lines.push({ kind: 'details', key, row, index });
      index++;
      if (open) walk(kids as readonly T[], level + 1);
    }
  };
  // The groups are one more level above the rows, walked by the same recursion: a group is a
  // node made of a value, a row a node of the data. A group stands where its first row stood,
  // so the order inside and across groups is the rows' own.
  const group = (
    list: readonly T[],
    level: number,
    path: readonly unknown[],
  ): void => {
    if (level === groups.length) {
      walk(list, level);
      return;
    }
    const by = new Map<string, { value: unknown; rows: T[] }>();
    for (const row of list) {
      const value = groups[level].value(row);
      // `undefined` and `null` are both no value, and one group: their keys would be one too.
      const at = JSON.stringify(value ?? null);
      const found = by.get(at);
      if (found) found.rows.push(row);
      else by.set(at, { value, rows: [row] });
    }
    for (const { value, rows: members } of by.values()) {
      const values = [...path, value];
      const key = JSON.stringify(values);
      const closed = collapsed?.has(key) ?? false;
      lines.push({
        kind: 'group',
        key,
        level,
        label: groups[level].label(members[0]),
        count: members.length,
        rows: members,
        collapsed: closed,
      });
      if (!closed) group(members, level + 1, values);
    }
  };
  if (groups.length === 0) walk(rows, 0);
  else {
    // Holes have no value to be grouped by: they stand after the groups, as they came.
    group(
      rows.filter((row): row is T => row !== undefined),
      0,
      [],
    );
    walk(
      rows.filter((row) => row === undefined),
      0,
    );
  }
  return lines;
}

/**
 * The key `@for` tracks a line by: its kind and its key, so a hole `1` and a row `1`, or a
 * row and its details, are never one line to Angular, and a row id `1` and `'1'` stay two.
 *
 * @since next
 */
export function pctLineKey<T>(line: PctTableLine<T>): string {
  return `${line.kind}:${JSON.stringify(line.key)}`;
}
