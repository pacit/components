// Probe: can a tuple of helper-built columns carry an id → value map the templates are typed by?
export interface PctColumn<T, V, Id extends string = string> {
  readonly id: Id;
  readonly header: string;
  readonly value: (row: T) => V;
  readonly kind?: PctCellKind<V>;
  readonly sort?: boolean | ((a: V, b: V) => number);          // contravariant in V
  readonly filter?: boolean | ((value: V, question: string) => boolean);
}
/** The engine's view: one column of any value type. The one `any` the API allows, by name. */
export type PctAnyColumn<T> = PctColumn<T, any>;
/** What a consumer writes beside the key or the accessor. */
export type PctColumnSpec<V> = Omit<PctColumn<unknown, V>, 'id' | 'value'>;
export type PctCellKind<V> =
  | 'text'
  | ([V] extends [number | null] ? { readonly number: { unit?: string } } : never)
  | ([V] extends [number | null] ? { readonly instant: { relative?: boolean } } : never);

type ColumnsOf<T> = readonly PctAnyColumn<T>[];
/** id → value map, read off the tuple. */
export type PctColumnMap<C extends ColumnsOf<any>> = {
  readonly [K in C[number] as K['id']]: K extends PctColumn<any, infer V, any> ? V : never;
};
export type PctColumns<T, M extends Record<string, unknown>> = readonly PctAnyColumn<T>[] & {
  readonly __map?: M;
};

export function pctColumnsOf<T>() {
  return {
    key<K extends keyof T & string>(key: K, spec: PctColumnSpec<T[K]>): PctColumn<T, T[K], K> {
      return { ...spec, id: key, value: (row) => row[key] };
    },
    value<Id extends string, V>(id: Id, value: (row: T) => V, spec: PctColumnSpec<V>): PctColumn<T, V, Id> {
      return { ...spec, id, value };
    },
    of<C extends ColumnsOf<T>>(columns: C): PctColumns<T, PctColumnMap<C>> {
      return columns as unknown as PctColumns<T, PctColumnMap<C>>;
    },
  };
}

// --- the slot, as the TCB would see it: the two inputs and the context ---
export interface PctCellContext<T, M extends Record<string, unknown>, Id extends keyof M & string> {
  readonly $implicit: T;
  readonly value: M[Id];
  readonly column: PctColumn<T, M[Id]>;
}
declare function cellSlot<T, M extends Record<string, unknown>, Id extends keyof M & string>(
  columns: PctColumns<T, M>, of: Id,
): PctCellContext<T, M, Id>;

// --- consumer ---
interface Register { address: number; name: string; energy: number | null; nextAt: number; note?: string }
const col = pctColumnsOf<Register>();
export const columns = col.of([
  col.key('name', { header: 'Name' }),
  col.key('energy', { header: 'Energy', kind: { number: { unit: 'kilowatt-hour' } } }),
  col.value('range', (r) => `${r.address}–${r.address + 1}`, { header: 'Range' }),
  col.value('next', (r) => r.nextAt, { header: 'Next', kind: { instant: { relative: true } } }),
]);

const energy = cellSlot(columns, 'energy');
const v1: number | null = energy.value;            // ok
const row: Register = energy.$implicit;            // ok
const range = cellSlot(columns, 'range');
const v2: string = range.value;                    // ok
// @ts-expect-error — not a column id
cellSlot(columns, 'nope');
// @ts-expect-error — a number kind on a string column
col.key('name', { header: 'Name', kind: { number: {} } });
// @ts-expect-error — not a key of Register
col.key('nmae', { header: 'x' });
// @ts-expect-error — the value is not a string
const v3: string = energy.value;
export const engineView: readonly PctAnyColumn<Register>[] = columns;  // the engine's view
// a list built first and handed to of() later, and one built inside a computed-like thunk
const built = [col.key('name', { header: 'Name', sort: (a, b) => a.localeCompare(b) }), col.key('address', { header: 'Address' })];
export const later = col.of(built);
const v4: string = cellSlot(later, 'name').value;
const thunk = () => col.of([col.key('energy', { header: 'E', filter: (v, q) => String(v).includes(q) })]);
const v5: number | null = cellSlot(thunk(), 'energy').value;
// @ts-expect-error — a union value is not a number column
col.value('mixed', (r) => (r.note ?? r.address) as string | number, { header: 'M', kind: { number: {} } });
void v4; void v5;
void v1; void v2; void v3; void row;
