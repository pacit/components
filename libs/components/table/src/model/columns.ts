import type {
  PctQuantityOptions,
  PctRelativeOptions,
  PctTone,
} from '@pacit/components/core';
import type { PctAggregate } from './aggregate';

/**
 * What names a row across renders: the key `@for` tracks, and the one selection, details and
 * focus hold on to when the application hands the table a new list every few seconds.
 *
 * @since next
 */
export type PctRowId = string | number;

/**
 * How a column of instants is written: as a wall clock by `format`, or relative to now
 * ("in 5 minutes") when `relative` is set.
 *
 * @since next
 */
export interface PctInstantCellOptions {
  /**
   * Writes the instant relative to the table's `now`, in the largest unit that fits; an object
   * says how the words are spelt.
   */
  readonly relative?: boolean | Omit<PctRelativeOptions, 'timeZone'>;
  /** The zone whose wall clock or calendar the instant is read in; the runtime's own when unset. */
  readonly timeZone?: string;
  /**
   * The wall clock's fields, as `Intl.DateTimeFormat` takes them: `{ day, month, hour,
   * minute }` writes `27.10, 12:30` where a `dateStyle` would add the year.
   */
  readonly format?: Intl.DateTimeFormatOptions;
}

/**
 * How the table writes a column's value when no cell template does.
 *
 * **Only kinds the value's type can take.** A number kind or an instant kind stands on a
 * column whose value is a number, `null` or `undefined`, and a boolean kind on one whose
 * value is a boolean. The test is the tuple `[V] extends [number | null | undefined]`, not
 * the bare union, so a column of `string | number` is refused rather than split into one
 * half that may and one that may not. An instant is a number of milliseconds, so a column of
 * addresses may be declared an instant: that is the consumer's declaration, not a type
 * error.
 *
 * @since next
 */
export type PctCellKind<V> =
  | 'text'
  | ([V] extends [boolean | null | undefined] ? 'boolean' : never)
  | ([V] extends [number | null | undefined]
      ? PctNumberKind | PctInstantKind
      : never);

/**
 * The kind that writes a number with its unit; a kind is one of these, never both.
 *
 * @since next
 */
export interface PctNumberKind {
  readonly number: PctQuantityOptions;
  readonly instant?: never;
}

/**
 * The kind that writes an instant; a kind is one of these, never both.
 *
 * @since next
 */
export interface PctInstantKind {
  readonly instant: PctInstantCellOptions;
  readonly number?: never;
}

/**
 * The ways a column of values of type `V` may be filtered: a range or a range of days only
 * where the value is a number, the same test the kinds take.
 *
 * @since next
 */
export type PctColumnFilterUseOf<V> =
  | false
  | 'text'
  | 'values'
  | 'own'
  | ([V] extends [number | null | undefined] ? 'range' | 'days' : never);

/**
 * Every kind, whatever the value: what a column built from an accessor is checked against
 * before its value's type is known.
 *
 * @since next
 */
export type PctAnyCellKind =
  'text' | 'boolean' | PctNumberKind | PctInstantKind;

/**
 * The values a kind can write: a boolean kind booleans, a number or instant kind numbers, the
 * text kind anything.
 *
 * @since next
 */
export type PctValueOfKind<K extends PctAnyCellKind> = K extends 'boolean'
  ? boolean | null | undefined
  : K extends 'text'
    ? unknown
    : number | null | undefined;

/**
 * A column of a data table: an id, a header, how a row gives its value, and how the value is
 * written, ordered and searched.
 *
 * `V` is the type of the value and `Id` the literal of the id, so a list built with
 * {@link pctColumnsOf} carries both and the table checks every cell template against them
 * ([0097](../../../../../docs/decisions/0097-a-data-table-is-a-typed-engine-under-the-first-layer-and-grows-into-a-grid-by-directives.md)).
 * Fields join the interface in the phase that gives them a consumer.
 *
 * @since next
 */
export interface PctColumn<T, V = unknown, Id extends string = string> {
  readonly id: Id;
  /** The header's text; a header template may replace what stands inside the header. */
  readonly header: string;
  /** How a row gives the column its value. */
  readonly value: (row: T) => V;
  /** How the value is written when no cell template does; `'text'` by default. */
  readonly kind?: PctCellKind<V>;
  /**
   * Whether the column orders the rows, and how: `false` never, a function by that
   * comparison, anything else by {@link pctCompareValues}. An empty value stands last in
   * either direction whatever the comparison says.
   */
  readonly sort?: boolean | ((a: NonNullable<V>, b: NonNullable<V>) => number);
  /**
   * Whether the quick filter reads the column, and how: `false` never, a function asked once
   * per word of the question — the word lower-cased and in NFC — anything else by the text
   * the cell shows.
   */
  readonly filter?: boolean | ((value: V, word: string) => boolean);
  /**
   * How `pctTableColumnFilters` filters the column: `false` not at all; `'text'` by the words
   * of its text; `'values'` by values picked from those its rows hold; on a column of numbers
   * `'range'` by a range, or `'days'` by a range of days its instants fall on; `'own'` by the
   * state a `pctFilter` template sets, decided by `filterBy`. By default the kind says: a
   * boolean by values, a number by a range, an instant by days, the rest by text — and a
   * column with a `filterBy` by its own.
   */
  readonly columnFilter?: PctColumnFilterUseOf<V>;
  /**
   * How a column filtered by the application's own state decides a row: given the row's value
   * and the state a `pctFilter` template set, whose shape is the application's.
   */
  readonly filterBy?: (value: V, own: unknown) => boolean;
  /** Aligns the column to the end with tabular digits; by default only a number kind does. */
  readonly numeric?: boolean;
  /**
   * The tone a cell wears, from its value and its row: a tint behind the cell. A tone repeats
   * what the cell says and never says it alone — a tint is gone for a reader who cannot tell
   * the colours apart and in forced colours
   * ([0076](../../../../../docs/decisions/0076-a-tone-is-two-channels-and-four-names.md)) — so
   * a column of states wears the tone of the word it writes.
   */
  readonly tone?: (value: V, row: T) => PctTone | null;
  /**
   * A cell's text in a tooltip: `true` keeps the cell to one line, cut with an ellipsis at the
   * column's widest, and shows the whole text under the pointer when it is cut; a function
   * writes the tooltip of every cell itself. The text is whole in the tree either way, so a
   * reader hears all of it.
   */
  readonly tooltip?: boolean | ((row: T) => string);
  /**
   * How readily the column gives way on a narrow table: a column with a priority is hidden
   * when the table no longer fits its frame, the highest number first, and its value moves
   * into the row's details. A column with none is never hidden.
   */
  readonly priority?: number;
  /**
   * How the column sums up a group of rows, in the group's heading, and every row in view, in
   * the table's foot: a number kind writes the sum in its unit, `count` writes a count.
   */
  readonly aggregate?: PctAggregate<V>;
}

/**
 * What a consumer writes beside the key or the accessor when building a column: `V` the
 * value's type, `T` the row's, which a tone and a tooltip read.
 *
 * @since next
 */
export type PctColumnSpec<V, T = unknown> = Omit<
  PctColumn<T, V>,
  'id' | 'value'
>;

/**
 * The engine's view of one column of any value type.
 *
 * `sort` and `filter` take the value as an argument, so they are contravariant in it: a
 * `PctColumn<T, number>` is not a `PctColumn<T, unknown>`, and a list of mixed columns has no
 * other common type. This is the one `any` the table's API takes, and it takes it by name.
 *
 * @since next
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type PctAnyColumn<T> = PctColumn<T, any>;

/**
 * The map from each column's id to its value's type, read off a list of columns.
 *
 * @since next
 */
export type PctColumnMap<C extends readonly PctAnyColumn<never>[]> = {
  readonly [
    K in C[number] as string extends K['id'] ? never : K['id']
  ]: K extends PctColumn<never, infer V, string> ? V : never;
};

/**
 * A list of columns that carries the map of its ids to their values' types.
 *
 * The map is a phantom: no list holds a `__map`, and the engine reads the list as the array it
 * is. A cell template reads the map, so a misspelt id or a wrong value type is the compiler's
 * error, not the user's.
 *
 * @since next
 */
export type PctColumns<T, M extends Record<string, unknown>> = readonly {
  readonly [K in keyof M & string]: PctColumn<T, M[K], K>;
}[keyof M & string][] & { readonly __map?: M };

/**
 * The builder of a typed list of columns for rows of type `T`.
 *
 * `key` builds a column from a key of the row, its value the key's type; `value` builds one
 * from an accessor, its value what the accessor returns; `of` turns the built columns into a
 * list that carries every id and every value's type. A literal array of columns compiles too,
 * and its cell templates are not checked against the ids.
 *
 * @example
 * const col = pctColumnsOf<Rule>();
 * const columns = col.of([
 *   col.key('name', { header: 'Name' }),
 *   col.key('energy', { header: 'Energy', kind: { number: { unit: 'kWh' } } }),
 *   col.value('next', (rule) => rule.nextAt, { header: 'Next', kind: { instant: { relative: true } } }),
 * ]);
 *
 * @since next
 */
export function pctColumnsOf<T>(): {
  key<K extends keyof T & string>(
    key: K,
    spec: PctColumnSpec<T[K], T>,
  ): PctColumn<T, T[K], K>;
  value<
    Id extends string,
    V extends PctValueOfKind<K>,
    K extends PctAnyCellKind = 'text',
  >(
    id: Id,
    value: (row: T) => V,
    spec: Omit<PctColumnSpec<V, T>, 'kind'> & { readonly kind?: K },
  ): PctColumn<T, V, Id>;
  of<C extends readonly PctAnyColumn<T>[]>(
    columns: C,
  ): PctColumns<T, PctColumnMap<C>>;
} {
  // The casts are the builder's whole job: the kind was checked against the value's type by
  // the signature, and the list against the ids by the map, before the call compiled.
  return {
    key: (key, spec) => ({ ...spec, id: key, value: (row) => row[key] }),
    value: <Id extends string, V>(id: Id, value: (row: T) => V, spec: object) =>
      ({ ...spec, id, value }) as PctColumn<T, V, Id>,
    of: <C extends readonly PctAnyColumn<T>[]>(columns: C) =>
      columns as unknown as PctColumns<T, PctColumnMap<C>>,
  };
}

/**
 * Whether a column aligns to the end with tabular digits: as it says, or when its kind writes
 * a number.
 *
 * @since next
 */
export function pctColumnNumeric<T>(column: PctAnyColumn<T>): boolean {
  if (column.numeric !== undefined) return column.numeric;
  const kind = column.kind;
  return typeof kind === 'object' && 'number' in kind;
}

/**
 * The ids of the columns a narrow table may hide, in the order it hides them: the highest
 * `priority` first, and of two equal ones the later column, so the columns a reader meets
 * first stay longest. A column with no priority, or one that is not a finite number, never
 * hides.
 *
 * @since next
 */
export function pctHideOrder<T>(
  columns: readonly PctAnyColumn<T>[],
): readonly string[] {
  return columns
    .map((column, place) => ({ column, place }))
    .filter(({ column }) => Number.isFinite(column.priority))
    .sort(
      (a, b) =>
        (b.column.priority as number) - (a.column.priority as number) ||
        b.place - a.place,
    )
    .map(({ column }) => column.id);
}
