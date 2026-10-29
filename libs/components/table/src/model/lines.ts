import type { PctRowId } from './columns';

/**
 * One line the table draws, in the order it draws them. Each kind has a stable `key` for
 * `@for`; two lines of different kinds may share a key, so a line is tracked by its kind and
 * its key together.
 *
 * - `row`: a row of data. `index` counts the rows and holes drawn before it; `level` is its
 *   depth in a tree, 0 without one, and `expanded` whether its children are shown, `null`
 *   for a row with no children to show.
 * - `hole`: a row a remote source has not delivered yet, keyed by its index.
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
 * What opens below or inside a row: its details, and its children in a tree.
 *
 * @since next
 */
export interface PctLinesOptions<T> {
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
 * A row is followed by its details when its id is in `details`, and by its children, one
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
  const { details, children, expanded } = options;
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
  walk(rows, 0);
  return lines;
}
