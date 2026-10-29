import type {
  PctQuantityOptions,
  PctRelativeOptions,
} from '@pacit/components/core';

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
  /** Aligns the column to the end with tabular digits; by default only a number kind does. */
  readonly numeric?: boolean;
}

/**
 * What a consumer writes beside the key or the accessor when building a column.
 *
 * @since next
 */
export type PctColumnSpec<V> = Omit<PctColumn<unknown, V>, 'id' | 'value'>;

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
    spec: PctColumnSpec<T[K]>,
  ): PctColumn<T, T[K], K>;
  value<
    Id extends string,
    V extends PctValueOfKind<K>,
    K extends PctAnyCellKind = 'text',
  >(
    id: Id,
    value: (row: T) => V,
    spec: Omit<PctColumnSpec<V>, 'kind'> & { readonly kind?: K },
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
