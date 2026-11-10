import type { PctRowId } from './columns';

/**
 * One line the table draws, in the order it draws them. Each kind has a stable `key`; two
 * lines of different kinds may share one, so `@for` tracks {@link pctLineKey}, which holds
 * both.
 *
 * - `row`: a row of data. `index` counts the rows and holes drawn before it; `level` is its
 *   depth in a tree, 0 without one, and `expanded` whether its children are shown, `null`
 *   for a row with no children to show.
 * - `hole`: a row a remote source has not delivered yet, keyed by its index. `parent` is the
 *   id of the row whose children it stands among, `null` among the roots; `group` the key of
 *   the group a source made whose members it stands among, `null` outside one; `at` its place
 *   in that list, from 0 — what a source is asked for to fill it — and `level` its depth.
 * - `details`: the details of the row before it, the full width of the table.
 * - `group`: the heading of a group of rows. `sums` are the sums a source gave a group it
 *   made, by column id; without them, the table sums `rows`.
 *
 * @since 0.3.0
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
  | {
      readonly kind: 'hole';
      readonly key: number;
      readonly index: number;
      readonly level: number;
      readonly parent: PctRowId | null;
      readonly group: string | null;
      readonly at: number;
    }
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
      readonly sums?: Readonly<Record<string, unknown>>;
      readonly collapsed: boolean;
    };

/**
 * One level of grouping: the value rows are grouped by, and the label a group is headed with,
 * written from its first row.
 *
 * @since 0.3.0
 */
export interface PctGroupBy<T> {
  readonly value: (row: T) => unknown;
  readonly label: (row: T) => string;
}

/**
 * A group a remote source made, as the lines read it: its key, the label it is headed with,
 * how many rows it holds, the sums the source gave, and its members — groups one level deeper,
 * or rows — read only while it is open, holes and all.
 *
 * @since next
 */
export interface PctSourcedGroup<T> {
  readonly key: string;
  readonly label: string;
  readonly count: number;
  readonly sums: Readonly<Record<string, unknown>> | undefined;
  readonly members: () => readonly (T | undefined)[];
}

/**
 * What opens below or inside a row: its details, and its children in a tree; and the groups
 * the rows stand in.
 *
 * @since 0.3.0
 */
export interface PctLinesOptions<T> {
  /**
   * The levels the rows are grouped by, outermost first. A group's key is the path of its
   * values, written as JSON, so it stays the same however the rows change.
   */
  readonly groups?: readonly PctGroupBy<T>[];
  /** The groups whose rows are hidden, by key. */
  readonly collapsed?: ReadonlySet<string>;
  /**
   * The groups a remote source made: the group an item of a list is, `undefined` for a row.
   * The rows stand in them as they came, and `groups` is not read.
   *
   * @since next
   */
  readonly sourced?: (item: T) => PctSourcedGroup<T> | undefined;
  /** The rows whose details are open, by id. */
  readonly details?: ReadonlySet<PctRowId>;
  /**
   * A row's children, for a tree; `undefined` or an empty list for a leaf. An `undefined` in
   * the list is a hole.
   */
  readonly children?: (row: T) => readonly (T | undefined)[] | undefined;
  /** The rows whose children are shown, by id. */
  readonly expanded?: ReadonlySet<PctRowId>;
}

/**
 * A value as a group's key holds it: a big integer, a date, a symbol and a function are tagged,
 * so `1n` stays apart from `"1"`, a date from its ISO text, and two of them never write the same
 * key — or none, which JSON would give a symbol. JSON itself writes no value, a `null` and `NaN`
 * in a list as one `null`.
 */
function keyed(value: unknown): unknown {
  if (typeof value === 'bigint') return { bigint: String(value) };
  if (value instanceof Date) return { date: value.getTime() };
  if (typeof value === 'symbol' || typeof value === 'function')
    return { [typeof value]: String(value) };
  return value;
}

/**
 * The key of the group a path of values names, outermost first: what `collapsed` holds.
 *
 * @example
 * pctGroupKey([0, 'Hall']); // '[0,"Hall"]'
 *
 * @since 0.3.0
 */
export function pctGroupKey(values: readonly unknown[]): string {
  return JSON.stringify(values.map(keyed));
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
 * @since 0.3.0
 */
export function pctLines<T>(
  rows: readonly (T | undefined)[],
  rowId: (row: T) => PctRowId,
  options: PctLinesOptions<T> = {},
): readonly PctTableLine<T>[] {
  const {
    details,
    children,
    expanded,
    groups = [],
    collapsed,
    sourced,
  } = options;
  const lines: PctTableLine<T>[] = [];
  let index = 0;
  // `places` are the rows' places in their list, where the list walked is not the whole of it;
  // `group` the key of the group a source made that the list is the members of.
  const walk = (
    list: readonly (T | undefined)[],
    level: number,
    parent: PctRowId | null,
    places?: readonly number[],
    group: string | null = null,
  ): void => {
    for (const [i, row] of list.entries()) {
      if (row === undefined) {
        const at = places?.[i] ?? i;
        lines.push({
          kind: 'hole',
          key: index,
          index,
          level,
          parent,
          group,
          at,
        });
        index++;
        continue;
      }
      // A group a source made heads its members, which its list holds as the source sent them.
      const made = sourced?.(row);
      if (made !== undefined) {
        const closed = collapsed?.has(made.key) ?? false;
        lines.push({
          kind: 'group',
          key: made.key,
          level,
          label: made.label,
          count: made.count,
          rows: [],
          sums: made.sums,
          collapsed: closed,
        });
        if (!closed) walk(made.members(), level + 1, null, undefined, made.key);
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
      if (open) walk(kids, level + 1, key);
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
      walk(list, level, null);
      return;
    }
    const by = new Map<string, { value: unknown; rows: T[] }>();
    for (const row of list) {
      const value = groups[level].value(row);
      const at = pctGroupKey([value]);
      const found = by.get(at);
      if (found) found.rows.push(row);
      else by.set(at, { value, rows: [row] });
    }
    for (const { value, rows: members } of by.values()) {
      const values = [...path, value];
      const key = pctGroupKey(values);
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
  if (groups.length === 0 || sourced !== undefined) walk(rows, 0, null);
  else {
    // Holes have no value to be grouped by: they stand after the groups, as they came.
    group(
      rows.filter((row): row is T => row !== undefined),
      0,
      [],
    );
    const holes = [...rows.keys()].filter((at) => rows[at] === undefined);
    walk(
      holes.map(() => undefined),
      0,
      null,
      holes,
    );
  }
  return lines;
}

/**
 * The key `@for` tracks a line by: its kind and its key, so a hole `1` and a row `1`, or a
 * row and its details, are never one line to Angular, and a row id `1` and `'1'` stay two.
 *
 * @since 0.3.0
 */
export function pctLineKey<T>(line: PctTableLine<T>): string {
  return `${line.kind}:${JSON.stringify(line.key)}`;
}
