import { pctInstantOf } from '@pacit/components/core';
import { isPctDay, pctDayParts, type PctDay } from '@pacit/components/date';
import type { PctAnyColumn } from './columns';
import { pctQuestionWords } from './question';

/**
 * A column's filter by its text: the rows whose cell's text holds every word, folded as the
 * quick filter folds it.
 *
 * @since next
 */
export interface PctTextFilter {
  readonly text: string;
}

/**
 * A column's filter by a range of numbers, both ends included; an end that is `null` is open.
 *
 * @since next
 */
export interface PctRangeFilter {
  readonly from: number | null;
  readonly to: number | null;
}

/**
 * A column's filter of instants by the days they fall on, in the column's zone: from the
 * start of `since` to the end of `until`, both days included; an end that is `null` is open.
 * Days rather than instants, so the state reads the same in a URL as on the screen.
 *
 * @since next
 */
export interface PctDayRangeFilter {
  readonly since: PctDay | null;
  readonly until: PctDay | null;
}

/**
 * A column's filter by values: the rows whose value is one of these, compared as
 * `Array.prototype.includes` compares — `NaN` is `NaN`, `-0` is `0`; `null` stands for a cell
 * with no value, `undefined` as well. A value that is an object is matched by identity, so
 * one read back from a URL matches nothing: values a URL holds are strings, numbers and
 * booleans.
 *
 * @since next
 */
export interface PctValuesFilter<V> {
  readonly values: readonly V[];
}

/**
 * A column's filter of the application's own: the state a `pctFilter` template sets, and the
 * column's `filterBy` decides by. What it holds is the application's, as long as it writes
 * to JSON — the table only keeps it.
 *
 * @since next
 */
export interface PctOwnFilter {
  readonly own: unknown;
}

/**
 * A filter a column of values of type `V` may hold: a text, values, a range or a range of
 * days for a column of numbers, or one of the application's own. Which one a column offers
 * is {@link pctColumnFilterUse}'s to say.
 *
 * @since next
 */
export type PctColumnFilter<V> =
  | PctTextFilter
  | PctValuesFilter<NonNullable<V> | null>
  | ([V] extends [number | null | undefined]
      ? PctRangeFilter | PctDayRangeFilter
      : never)
  | PctOwnFilter;

/**
 * A filter of any column, whatever its value: the shapes the engine reads before the value's
 * type is known.
 *
 * @since next
 */
export type PctAnyColumnFilter =
  | PctTextFilter
  | PctValuesFilter<unknown>
  | PctRangeFilter
  | PctDayRangeFilter
  | PctOwnFilter;

/**
 * The filters of a table's columns, by id, typed by the map of its columns: a model a URL
 * can hold.
 *
 * @since next
 */
export type PctColumnFilters<M extends Record<string, unknown>> = {
  readonly [Id in keyof M & string]?: PctColumnFilter<M[Id]>;
};

/**
 * How a column is filtered: by its text, by values picked from those its rows hold, by a
 * range of numbers, by a range of days, by the application's own state, or not at all.
 *
 * @since next
 */
export type PctColumnFilterUse = 'text' | 'values' | 'range' | 'days' | 'own';

/**
 * How a column is filtered: as its `columnFilter` says; by the application's own state when
 * it has a `filterBy`; else by its kind — a boolean by its values, a number by a range, an
 * instant by a range of days, the rest by the text. `null` when the column is not filtered.
 *
 * @since next
 */
export function pctColumnFilterUse<T>(
  column: PctAnyColumn<T>,
): PctColumnFilterUse | null {
  const use = column.columnFilter;
  if (use === false) return null;
  if (use !== undefined) return use;
  if (column.filterBy) return 'own';
  const kind = column.kind;
  if (kind === 'boolean') return 'values';
  // Read as the cell reads the kind to write it: a number first, then an instant.
  if (typeof kind === 'object' && kind.number) return 'range';
  if (typeof kind === 'object' && kind.instant) return 'days';
  return 'text';
}

/** An end of a range as a state may hold it: a number, or `null` for an open one. */
const isEnd = (end: unknown) => end === null || typeof end === 'number';

/**
 * The shape a filter holds, or `null` for none of the five. Read with no trust in the
 * types: a state read back from a URL may hold anything at all.
 */
function shapeOf(filter: unknown): PctColumnFilterUse | null {
  if (typeof filter !== 'object' || filter === null) return null;
  const f = filter as {
    readonly text?: unknown;
    readonly values?: unknown;
    readonly from?: unknown;
    readonly to?: unknown;
  };
  if ('text' in f) return typeof f.text === 'string' ? 'text' : null;
  if ('values' in f) return Array.isArray(f.values) ? 'values' : null;
  if ('from' in f) return isEnd(f.from) && isEnd(f.to) ? 'range' : null;
  // A range of days takes any ends: one that is not a day lets nothing through (see below).
  if ('since' in f) return 'days';
  return 'own' in f ? 'own' : null;
}

/**
 * Whether a filter lets every row through: a text of no words, a range or a range of days
 * with both ends open, no values, or an own filter that holds nothing. An empty filter is no
 * filter, and a column holding one is not marked as filtered. A state that is none of the
 * five shapes is not empty: it lets nothing through (see {@link pctColumnFilterTest}).
 *
 * @since next
 */
export function pctFilterIsEmpty(filter: PctAnyColumnFilter): boolean {
  const shape = shapeOf(filter);
  if (shape === 'text')
    return pctQuestionWords((filter as PctTextFilter).text).length === 0;
  if (shape === 'values')
    return (filter as PctValuesFilter<unknown>).values.length === 0;
  if (shape === 'range') {
    const { from, to } = filter as PctRangeFilter;
    return from === null && to === null;
  }
  if (shape === 'days') {
    const { since, until } = filter as PctDayRangeFilter;
    return since === null && until === null;
  }
  if (shape === 'own') {
    const own = (filter as PctOwnFilter).own;
    return own === undefined || own === null;
  }
  return false;
}

/**
 * The first instant of a day in a zone: `null` for an open end, `undefined` for one that is
 * not a day.
 */
function startOf(day: PctDay | null, timeZone: string | undefined, after = 0) {
  if (day === null) return null;
  if (!isPctDay(day)) return undefined;
  const parts = pctDayParts(day);
  return pctInstantOf({ ...parts, day: parts.day + after }, timeZone);
}

/**
 * The test a column's filter puts to a row, or `null` when it lets every row through. `text`
 * gives the cell's text as the table writes it, which a text filter reads; the rest read the
 * value. A filter of a shape the column does not take — a range on a column of names, a text
 * on a column of numbers, a day that is not one, a state that is not a filter at all — lets
 * nothing through rather than everything, so a state that went wrong in a URL shows as no
 * rows, not as a filter that quietly stopped filtering.
 *
 * @since next
 */
export function pctColumnFilterTest<T>(
  column: PctAnyColumn<T>,
  filter: PctAnyColumnFilter,
  text: (row: T) => string,
): ((row: T) => boolean) | null {
  if (pctFilterIsEmpty(filter)) return null;
  if (shapeOf(filter) !== pctColumnFilterUse(column)) return () => false;
  if ('text' in filter) {
    const words = pctQuestionWords(filter.text);
    return (row) => {
      const written = text(row).toLowerCase().normalize('NFC');
      return words.every((word) => written.includes(word));
    };
  }
  if ('values' in filter) {
    const values = filter.values;
    return (row) => values.includes(column.value(row) ?? null);
  }
  if ('own' in filter) {
    const by = column.filterBy;
    if (!by) return () => false;
    return (row) => by(column.value(row), filter.own);
  }
  let low: number | null;
  let high: number | null;
  // A range holds both its ends; a range of days ends where the next day starts.
  let closed = true;
  if ('from' in filter) {
    low = filter.from;
    high = filter.to;
  } else {
    const kind = column.kind;
    const zone = typeof kind === 'object' ? kind.instant?.timeZone : undefined;
    const since = startOf(filter.since, zone);
    // The end of a day is the start of the next: an instant at its very start is not in it.
    const until = startOf(filter.until, zone, 1);
    if (since === undefined || until === undefined) return () => false;
    low = since;
    high = until;
    closed = false;
  }
  return (row) => {
    const value: unknown = column.value(row);
    if (typeof value !== 'number' || Number.isNaN(value)) return false;
    if (low !== null && value < low) return false;
    if (high === null) return true;
    return closed ? value <= high : value < high;
  };
}

/**
 * A value a column's rows hold, with the first row that holds it: the row the table writes
 * the value's text from.
 *
 * @since next
 */
export interface PctColumnValue<T> {
  readonly value: unknown;
  readonly row: T;
}

/**
 * The values a column's rows hold, each once, in the order the rows first give them, for a
 * filter by values to offer; a cell with no value is `null`, and stands last.
 *
 * @since next
 */
export function pctColumnValues<T>(
  column: PctAnyColumn<T>,
  rows: readonly T[],
): readonly PctColumnValue<T>[] {
  const seen = new Map<unknown, T>();
  let empty: { row: T } | null = null;
  for (const row of rows) {
    const value: unknown = column.value(row);
    if (value === null || value === undefined) empty ??= { row };
    else if (!seen.has(value)) seen.set(value, row);
  }
  const values = [...seen].map(([value, row]) => ({ value, row }));
  return empty ? [...values, { value: null, row: empty.row }] : values;
}
