import type { PctAnyColumn } from './columns';

/**
 * The edge a column is pinned to: it stays there while the rest scroll along the inline axis.
 *
 * @since 0.3.0
 */
export type PctColumnPin = 'start' | 'end';

/**
 * How a user laid the columns out: their order, their widths in pixels, the ones hidden and
 * the ones pinned to an edge. Every field may be missing, and an id may name a column the
 * table no longer has, so a layout saved with `JSON.stringify` and read back months later
 * still lays the table out (0097, D9):
 *
 * - an id of no column is passed over, a field of the wrong shape is read as missing;
 * - a column the layout does not name stands where `columns` puts it, at its own width;
 * - a column pinned to both edges is pinned to the start;
 * - within an edge, the columns stand in `order`'s order;
 * - a layout that hides every column hides none.
 *
 * @since 0.3.0
 */
export interface PctTableLayout<Id extends string = string> {
  /** The columns' ids in the order they stand, the hidden ones among them. */
  readonly order?: readonly Id[];
  /** A column's width in pixels; a column with none takes its own, or a share of what is left. */
  readonly widths?: Readonly<Partial<Record<Id, number>>>;
  /** The ids of the columns the user hid. */
  readonly hidden?: readonly Id[];
  /** The ids of the columns pinned to each edge. */
  readonly pinned?: {
    readonly start?: readonly Id[];
    readonly end?: readonly Id[];
  };
}

/**
 * A column as a layout places it.
 *
 * @since 0.3.0
 */
export interface PctPlacedColumn<T> {
  readonly column: PctAnyColumn<T>;
  /** The column's place among the columns given, which a row's values are read by. */
  readonly index: number;
  /** The edge the column is pinned to, or `null`. */
  readonly pin: PctColumnPin | null;
  /** The column's width in pixels, or `null` for a share of the width the others leave. */
  readonly width: number | null;
  /** The user hid the column. */
  readonly hidden: boolean;
}

/**
 * The narrowest a column with no `minWidth` of its own is made: its header's padding, its
 * sort's chevron and its two buttons, about 90 px, and a few letters beside them.
 */
const MIN_WIDTH = 120;

/** The widest a column is made. */
const MAX_WIDTH = 2000;

/** A list of strings, from what may be anything: a layout read back from storage. */
function idsOf(value: unknown): ReadonlySet<string> {
  return new Set(
    Array.isArray(value)
      ? value.filter((id): id is string => typeof id === 'string')
      : [],
  );
}

/** An object's own field, from what may be anything. */
function fieldOf(value: unknown, key: string): unknown {
  return typeof value === 'object' && value !== null
    ? (value as Record<string, unknown>)[key]
    : undefined;
}

/**
 * The levels of a column's `group`, the outermost first: `'Power/Peak'` is `['Power',
 * 'Peak']`, a blank level is passed over, and a column with no group has none.
 *
 * @since 0.3.1
 */
export function pctGroupPath<T>(column: PctAnyColumn<T>): readonly string[] {
  return (column.group ?? '')
    .split('/')
    .map((level) => level.trim())
    .filter((level) => level !== '');
}

/**
 * The block a column moves and is pinned in: its outermost group, or the column alone,
 * keyed apart from any group's name.
 */
function blockOf<T>(column: PctAnyColumn<T>): string {
  const [top] = pctGroupPath(column);
  return top === undefined ? `:${column.id}` : `/${top}`;
}

/**
 * The order with the ids of one key standing together, at the first of them: what a stored
 * order that split a group is read as.
 */
function gathered(
  order: readonly string[],
  keyOf: (id: string) => string | null,
): string[] {
  const out: string[] = [];
  // Where the last id of each key stands in `out`.
  const last = new Map<string, number>();
  for (const id of order) {
    const key = keyOf(id);
    const after = key === null ? undefined : last.get(key);
    if (after === undefined) {
      out.push(id);
      if (key !== null) last.set(key, out.length - 1);
      continue;
    }
    const place = after + 1;
    out.splice(place, 0, id);
    for (const [other, at] of last) if (at >= place) last.set(other, at + 1);
    last.set(key as string, place);
  }
  return out;
}

/**
 * The narrowest and the widest a column may be made: its `minWidth`, or 120 px with none, and
 * 2000 px.
 *
 * @since 0.3.0
 */
export function pctColumnWidthBounds<T>(column: PctAnyColumn<T>): {
  readonly min: number;
  readonly max: number;
} {
  const own = column.minWidth;
  const min =
    own !== undefined && own > 0 && own <= MAX_WIDTH ? own : MIN_WIDTH;
  return { min, max: MAX_WIDTH };
}

/**
 * A width made to fit a column's bounds, rounded to a whole pixel.
 *
 * @since 0.3.0
 */
export function pctClampWidth<T>(
  column: PctAnyColumn<T>,
  width: number,
): number {
  const { min, max } = pctColumnWidthBounds(column);
  return Math.round(Math.min(max, Math.max(min, width)));
}

/**
 * Every column, in the order a layout puts it: those pinned to the start, the rest, those
 * pinned to the end, each with its width and whether the user hid it. The columns hidden are
 * listed where they stand, so a list of all of them — a chooser's — keeps their places.
 *
 * @example
 * pctPlaceColumns(columns, { order: ['power', 'name'], pinned: { start: ['name'] } });
 * // name (pinned to the start), power, then the columns the order does not name
 *
 * @since 0.3.0
 */
export function pctPlaceColumns<T>(
  columns: readonly PctAnyColumn<T>[],
  layout: PctTableLayout,
): readonly PctPlacedColumn<T>[] {
  const index = new Map(columns.map((column, c) => [column.id, c]));
  const order = [...idsOf(fieldOf(layout, 'order'))].filter((id) =>
    index.has(id),
  );
  const listed = new Set(order);
  // A column the order does not name stands at its own place among the columns given.
  columns.forEach((column, c) => {
    if (!listed.has(column.id))
      order.splice(Math.min(c, order.length), 0, column.id);
  });
  // The columns of a group stand together, at the first of them, each level inside the one
  // above it: a stored order that split a group is read as one that did not.
  const paths = new Map(
    columns.map((column) => [column.id, pctGroupPath(column)]),
  );
  const depth = Math.max(
    0,
    ...Array.from(paths.values(), (path) => path.length),
  );
  let together: readonly string[] = order;
  for (let level = 1; level <= depth; level++)
    together = gathered(together, (id) => {
      const path = paths.get(id) as readonly string[];
      return path.length < level ? null : path.slice(0, level).join('/');
    });
  const pinned = fieldOf(layout, 'pinned');
  const start = idsOf(fieldOf(pinned, 'start'));
  const end = idsOf(fieldOf(pinned, 'end'));
  // A group's edge is its first column's: the rest follow it.
  const edgeOf = new Map<string, PctColumnPin | null>();
  const pinOf = (id: string): PctColumnPin | null => {
    const block = blockOf(columns[index.get(id) as number]);
    const own = start.has(id) ? 'start' : end.has(id) ? 'end' : null;
    if (!edgeOf.has(block)) edgeOf.set(block, own);
    return edgeOf.get(block) as PctColumnPin | null;
  };
  const named = idsOf(fieldOf(layout, 'hidden'));
  // A layout that would hide every column hides none: a table with no column has no header,
  // and so no menu to show one back.
  const hidden = order.every((id) => named.has(id)) ? new Set<string>() : named;
  const widths = fieldOf(layout, 'widths');
  const placed = together.map((id): PctPlacedColumn<T> => {
    const c = index.get(id) as number;
    const column = columns[c];
    const own = fieldOf(widths, id);
    const width =
      typeof own === 'number' && own > 0 && Number.isFinite(own)
        ? pctClampWidth(column, own)
        : column.width !== undefined && column.width > 0
          ? pctClampWidth(column, column.width)
          : null;
    return {
      column,
      index: c,
      pin: pinOf(id),
      width,
      hidden: hidden.has(id),
    };
  });
  return [
    ...placed.filter((one) => one.pin === 'start'),
    ...placed.filter((one) => one.pin === null),
    ...placed.filter((one) => one.pin === 'end'),
  ];
}

/** The layout's fields as they are, its order written out whole. */
function withOrder<Id extends string>(
  layout: PctTableLayout<Id>,
  order: readonly string[],
): PctTableLayout<Id> {
  return { ...layout, order: order as readonly Id[] };
}

/**
 * The layout with the column moved one place along its edge's columns — those pinned to the
 * same edge, or the unpinned — towards the start for `-1`, towards the end for `1`. The
 * hidden columns are stepped over unless `among` is `'all'`, as a list of every column moves
 * them; a hidden column itself moves past the next one shown. A column of a group moves with
 * its group, past the next column or group whole. At the end of its edge, the layout as it
 * was.
 *
 * @since 0.3.0
 */
export function pctMoveColumn<T, Id extends string>(
  columns: readonly PctAnyColumn<T>[],
  layout: PctTableLayout<Id>,
  id: Id,
  step: -1 | 1,
  among: 'shown' | 'all' = 'shown',
): PctTableLayout<Id> {
  const placed = pctPlaceColumns(columns, layout);
  const self = placed.find((one) => one.column.id === id);
  if (!self) return layout;
  // A hidden column moves from its own place: it stands among its neighbours shown.
  const along = placed.filter(
    (one) =>
      one.pin === self.pin && (among === 'all' || !one.hidden || one === self),
  );
  const block = blockOf(self.column);
  // The blocks along the edge, each a group or a column alone, in their order.
  const blocks: string[] = [];
  for (const one of along) {
    const key = blockOf(one.column);
    if (blocks[blocks.length - 1] !== key) blocks.push(key);
  }
  const target = blocks[blocks.indexOf(block) + step];
  if (target === undefined) return layout;
  // The whole block moves, its hidden columns too, past the whole of the target.
  const moving = placed.filter((one) => blockOf(one.column) === block);
  const rest = placed.filter((one) => blockOf(one.column) !== block);
  const ends = rest.filter((one) => blockOf(one.column) === target);
  const at =
    step > 0 ? rest.indexOf(ends[ends.length - 1]) + 1 : rest.indexOf(ends[0]);
  const order = rest.map((one) => one.column.id);
  order.splice(at, 0, ...moving.map((one) => one.column.id));
  return withOrder(layout, order);
}

/**
 * Whether the column can move one place along its edge: what a control that moves it is
 * disabled by.
 *
 * @since 0.3.0
 */
export function pctCanMoveColumn<T>(
  columns: readonly PctAnyColumn<T>[],
  layout: PctTableLayout,
  id: string,
  step: -1 | 1,
  among: 'shown' | 'all' = 'shown',
): boolean {
  return pctMoveColumn(columns, layout, id, step, among) !== layout;
}

/**
 * The layout with the column hidden, or shown again.
 *
 * @since 0.3.0
 */
export function pctHideColumn<Id extends string>(
  layout: PctTableLayout<Id>,
  id: Id,
  hidden: boolean,
): PctTableLayout<Id> {
  const rest = [...idsOf(fieldOf(layout, 'hidden'))].filter(
    (other) => other !== id,
  ) as Id[];
  return { ...layout, hidden: hidden ? [...rest, id] : rest };
}

/**
 * The layout with the column pinned to an edge, or to none for `null`. Given the columns — an
 * argument that came with the header groups, after 0.3.0 — a column of a group is pinned with
 * its group, since a group's edge is its first column's.
 *
 * @since 0.3.0
 */
export function pctPinColumn<Id extends string, T = unknown>(
  layout: PctTableLayout<Id>,
  id: Id,
  pin: PctColumnPin | null,
  columns: readonly PctAnyColumn<T>[] = [],
): PctTableLayout<Id> {
  const self = columns.find((column) => column.id === id);
  const ids = new Set<string>(
    self === undefined
      ? [id]
      : columns
          .filter((column) => blockOf(column) === blockOf(self))
          .map((column) => column.id),
  );
  const pinned = fieldOf(layout, 'pinned');
  const without = (edge: PctColumnPin) =>
    [...idsOf(fieldOf(pinned, edge))].filter(
      (other) => !ids.has(other),
    ) as Id[];
  const start = without('start');
  const end = without('end');
  if (pin === 'start') start.push(...(ids as Set<Id>));
  if (pin === 'end') end.push(...(ids as Set<Id>));
  return { ...layout, pinned: { start, end } };
}

/**
 * The layout with the column's width set, in pixels, or taken off for `null`, so the column
 * goes back to its own.
 *
 * @since 0.3.0
 */
export function pctResizeColumn<Id extends string>(
  layout: PctTableLayout<Id>,
  id: Id,
  width: number | null,
): PctTableLayout<Id> {
  const widths = fieldOf(layout, 'widths');
  const next: Record<string, number> = {};
  if (typeof widths === 'object' && widths !== null)
    for (const [key, value] of Object.entries(widths))
      if (key !== id && typeof value === 'number') next[key] = value;
  if (width !== null) next[id] = width;
  return { ...layout, widths: next as PctTableLayout<Id>['widths'] };
}
