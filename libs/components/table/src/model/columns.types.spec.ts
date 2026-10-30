import {
  type PctAnyColumn,
  type PctColumn,
  type PctColumns,
  pctColumnNumeric,
  pctColumnsOf,
  pctHideOrder,
} from './columns';

/**
 * The types are the point of the column builder, so most of this file is read by the
 * compiler: a line marked `@ts-expect-error` is a mistake the compiler must refuse, and the
 * spec program fails to compile the day one of them is accepted. The cases run nothing; the
 * suites below them run the builder itself.
 */

interface Register {
  address: number;
  name: string;
  energy: number | null;
  nextAt: number;
  enabled: boolean;
  note?: string;
  mixed: string | number;
}

/** A cell slot as the template's type check sees it: the list and the id in, the context out. */
interface CellContext<
  T,
  M extends Record<string, unknown>,
  Id extends keyof M & string,
> {
  readonly $implicit: T;
  readonly value: M[Id];
  readonly column: PctColumn<T, M[Id]>;
}
declare function cellSlot<
  T,
  M extends Record<string, unknown>,
  Id extends keyof M & string,
>(columns: PctColumns<T, M>, of: Id): CellContext<T, M, Id>;

/** Exact equality of two types: assignability alone would accept a narrower one. */
type Equal<A, B> =
  (<X>() => X extends A ? 1 : 2) extends <X>() => X extends B ? 1 : 2
    ? true
    : false;

const col = pctColumnsOf<Register>();
const columns = col.of([
  col.key('name', { header: 'Name' }),
  col.key('energy', { header: 'Energy', kind: { number: { unit: 'kWh' } } }),
  col.key('enabled', { header: 'On', kind: 'boolean' }),
  col.value('range', (r) => `${r.address}–${r.address + 1}`, {
    header: 'Range',
  }),
  col.value('next', (r) => r.nextAt, {
    header: 'Next',
    kind: { instant: { relative: true } },
  }),
]);

// Never called: the body is for the compiler.
export function typeCases(): void {
  const energy = cellSlot(columns, 'energy');
  const exact: [
    Equal<typeof energy.value, number | null>,
    Equal<
      ReturnType<
        typeof cellSlot<
          Register,
          NonNullable<(typeof columns)['__map']>,
          'range'
        >
      >['value'],
      string
    >,
    Equal<
      keyof NonNullable<(typeof columns)['__map']>,
      'name' | 'energy' | 'enabled' | 'range' | 'next'
    >,
  ] = [true, true, true];
  const value: number | null = energy.value;
  const row: Register = energy.$implicit;
  const range: string = cellSlot(columns, 'range').value;
  const on: boolean = cellSlot(columns, 'enabled').value;

  // @ts-expect-error — not a column's id.
  cellSlot(columns, 'nope');
  // @ts-expect-error — the value of `energy` is not a string.
  const wrong: string = energy.value;
  // @ts-expect-error — a number kind on a column of strings.
  col.key('name', { header: 'Name', kind: { number: {} } });
  // @ts-expect-error — an instant kind on a column of strings.
  col.key('name', { header: 'Name', kind: { instant: {} } });
  // @ts-expect-error — a boolean kind on a column of numbers.
  col.key('address', { header: 'Address', kind: 'boolean' });
  // @ts-expect-error — not a key of the row.
  col.key('nmae', { header: 'Name' });
  // @ts-expect-error — a union of a string and a number is not a column of numbers.
  col.key('mixed', { header: 'Mixed', kind: { number: {} } });
  // @ts-expect-error — nor is an accessor that returns one.
  col.value('mixed', (r) => r.mixed, { header: 'Mixed', kind: { number: {} } });
  // @ts-expect-error — a kind is a number kind or an instant kind, never both.
  col.key('energy', { header: 'E', kind: { number: {}, instant: {} } });
  // A column built from an accessor outside `of`, as columns generated from a schema are,
  // takes its kind and types its comparison by the accessor's value.
  const next = col.value('next', (r) => r.nextAt, {
    header: 'Next',
    kind: { instant: {} },
    sort: (a, b) => a - b,
  });
  const generated = col.of(
    ['a', 'b'].map((id) =>
      col.value(id, (r) => r.energy, { header: id, kind: { number: {} } }),
    ),
  );
  // A generated id is a string, not a literal, so it adds no key a template could name.
  // @ts-expect-error — and a misspelt one is still refused.
  cellSlot(col.of([...generated, col.key('name', { header: 'Name' })]), 'nmae');
  // Spreading a typed list into another keeps its ids.
  const second = col.of([
    ...columns,
    col.key('address', { header: 'Address' }),
  ]);
  const spread: number | null = cellSlot(second, 'energy').value;
  // @ts-expect-error — and refuses a misspelt one.
  cellSlot(second, 'enrgy');
  // A comparison never meets an empty value, so it takes the value without `null`.
  col.key('energy', { header: 'E', sort: (a, b) => a - b });
  // @ts-expect-error — the comparison takes the column's value, a string.
  col.key('name', { header: 'Name', sort: (a: number, b: number) => a - b });
  // An optional field is a column of `T | undefined`, which a kind of its type still takes.
  col.key('note', { header: 'Note', kind: 'text' });

  // A tone reads the value and the row, a tooltip the row, both typed by the builder.
  col.key('energy', {
    header: 'Energy',
    tone: (energy, register) =>
      energy !== null && energy > register.address ? 'warning' : null,
    tooltip: (register) => register.name.toUpperCase(),
  });
  col.value('next', (r) => r.nextAt, {
    header: 'Next',
    tone: (next) => (next > 0 ? 'info' : null),
  });
  // @ts-expect-error — a tone is one of the four, not any word.
  col.key('name', { header: 'Name', tone: () => 'loud' });
  col.key('name', {
    header: 'Name',
    // @ts-expect-error — the tone's value is the column's, a string.
    tone: (name: number) => (name ? null : null),
  });
  col.key('name', {
    header: 'Name',
    // @ts-expect-error — the tooltip's row is the table's row.
    tooltip: (row: { title: string }) => row.title,
  });

  // The engine's view takes any typed list.
  const view: readonly PctAnyColumn<Register>[] = columns;
  // A list built first and handed to `of` later, and one built in a thunk, as a `computed` does.
  const built = [
    col.key('name', { header: 'Name', sort: (a, b) => a.localeCompare(b) }),
    col.key('address', { header: 'Address' }),
  ];
  const later: string = cellSlot(col.of(built), 'name').value;
  const thunk = () =>
    col.of([
      col.key('energy', {
        header: 'Energy',
        filter: (v, word) => String(v).includes(word),
      }),
    ]);
  const fromThunk: number | null = cellSlot(thunk(), 'energy').value;
  void [
    exact,
    value,
    row,
    range,
    on,
    wrong,
    view,
    later,
    fromThunk,
    next,
    spread,
  ];
}

describe('pctColumnsOf', () => {
  const rule: Register = {
    address: 40001,
    name: 'Boiler',
    energy: 12.5,
    nextAt: 0,
    enabled: true,
    mixed: 'x',
  };

  it('builds an accessor from a key, and keeps the rest of the spec', () => {
    const energy = col.key('energy', { header: 'Energy', numeric: true });
    expect(energy.id).toBe('energy');
    expect(energy.header).toBe('Energy');
    expect(energy.numeric).toBe(true);
    expect(energy.value(rule)).toBe(12.5);
  });

  it('keeps the accessor it is given', () => {
    const accessor = (r: Register) => r.address + 1;
    const next = col.value('next', accessor, { header: 'Next' });
    expect(next.id).toBe('next');
    expect(next.value).toBe(accessor);
    expect(next.value(rule)).toBe(40002);
  });

  it('hands back the very list it was given', () => {
    const list = [col.key('name', { header: 'Name' })];
    expect(col.of(list)).toBe(list);
  });
});

describe('pctColumnNumeric', () => {
  it('reads a number kind as numeric, and no other kind', () => {
    expect(
      pctColumnNumeric(
        col.key('energy', { header: 'E', kind: { number: {} } }),
      ),
    ).toBe(true);
    expect(
      pctColumnNumeric(
        col.key('nextAt', { header: 'N', kind: { instant: {} } }),
      ),
    ).toBe(false);
    expect(
      pctColumnNumeric(col.key('name', { header: 'N', kind: 'text' })),
    ).toBe(false);
    expect(
      pctColumnNumeric(col.key('enabled', { header: 'O', kind: 'boolean' })),
    ).toBe(false);
    expect(pctColumnNumeric(col.key('address', { header: 'A' }))).toBe(false);
  });

  it('takes what the column says over what its kind would', () => {
    expect(
      pctColumnNumeric(col.key('address', { header: 'A', numeric: true })),
    ).toBe(true);
    expect(
      pctColumnNumeric(
        col.key('energy', {
          header: 'E',
          kind: { number: {} },
          numeric: false,
        }),
      ),
    ).toBe(false);
  });
});

describe('pctHideOrder', () => {
  const at = (id: string, priority?: number) =>
    col.value(id, (r) => r.name, { header: id, priority });

  it('hides the highest priority first, and of equals the later column', () => {
    expect(
      pctHideOrder([at('a', 1), at('b'), at('c', 3), at('d', 1), at('e', 2)]),
    ).toEqual(['c', 'e', 'd', 'a']);
  });

  it('never hides a column with no priority, or one that is no number', () => {
    expect(
      pctHideOrder([at('a'), at('b', Number.NaN), at('c', Infinity)]),
    ).toEqual([]);
    expect(pctHideOrder([])).toEqual([]);
    expect(pctHideOrder([at('a', 0), at('b', -1)])).toEqual(['a', 'b']);
  });
});
