import { type PctAnyColumn, pctColumnsOf } from './columns';
import {
  type PctAnyColumnFilter,
  pctColumnFilterTest,
  pctColumnFilterUse,
  pctColumnValues,
  pctFilterIsEmpty,
} from './filters';

interface Device {
  name: string;
  room: string | null;
  power: number | null;
  on: boolean;
  seen: number | null;
}

const col = pctColumnsOf<Device>();
const name = col.key('name', { header: 'Name' });
const room = col.key('room', { header: 'Room', columnFilter: 'values' });
const power = col.key('power', {
  header: 'Power',
  kind: { number: { unit: 'kWh' } },
});
const on = col.key('on', { header: 'On', kind: 'boolean' });
const seen = col.key('seen', {
  header: 'Seen',
  kind: { instant: { timeZone: 'Europe/Warsaw' } },
});
const seenHere = col.key('seen', { header: 'Seen', kind: { instant: {} } });

const lamp: Device = {
  name: 'Ceiling Lamp',
  room: 'Kitchen',
  power: 7899.7,
  on: true,
  seen: Date.UTC(2026, 9, 25, 23, 30), // 26 October, 00:30 in Warsaw, past the change of clocks
};
const fan: Device = {
  name: 'Fan',
  room: null,
  power: null,
  on: false,
  seen: null,
};

/** The text a table would show. */
const shown = (column: PctAnyColumn<Device>) => (row: Device) =>
  column.id === 'power' ? `7 899,7 kWh` : String(column.value(row));

/** Whether a row passes a column's filter; `null` stands for a filter that lets all through. */
function passes(
  column: PctAnyColumn<Device>,
  filter: PctAnyColumnFilter,
  row: Device,
): boolean | null {
  const test = pctColumnFilterTest(column, filter, shown(column));
  return test === null ? null : test(row);
}

describe('pctColumnFilterUse', () => {
  it('reads the kind: a boolean by values, a number by a range, an instant by days, else text', () => {
    expect(pctColumnFilterUse(name)).toBe('text');
    expect(pctColumnFilterUse(on)).toBe('values');
    expect(pctColumnFilterUse(power)).toBe('range');
    expect(pctColumnFilterUse(seen)).toBe('days');
  });

  it('reads the kind as the cell does: a number that is there, then an instant', () => {
    const both = {
      ...seen,
      kind: { instant: { timeZone: 'UTC' }, number: undefined },
    } as PctAnyColumn<Device>;
    expect(pctColumnFilterUse(both)).toBe('days');
    expect(
      pctColumnFilterUse({ ...seen, kind: {} } as PctAnyColumn<Device>),
    ).toBe('text');
  });

  it('takes the column’s own word over the kind’s, and none for false', () => {
    expect(pctColumnFilterUse({ ...name, columnFilter: 'values' })).toBe(
      'values',
    );
    expect(pctColumnFilterUse({ ...power, columnFilter: 'text' })).toBe('text');
    expect(pctColumnFilterUse({ ...name, columnFilter: false })).toBeNull();
  });

  it('filters a column with a filterBy by its own state, unless it says otherwise', () => {
    const by = () => true;
    expect(pctColumnFilterUse({ ...name, filterBy: by })).toBe('own');
    expect(
      pctColumnFilterUse({ ...name, filterBy: by, columnFilter: 'text' }),
    ).toBe('text');
  });
});

describe('pctFilterIsEmpty', () => {
  it('holds no words, no values, no ends, or no state', () => {
    expect(pctFilterIsEmpty({ text: '  ' })).toBe(true);
    expect(pctFilterIsEmpty({ text: ' a ' })).toBe(false);
    expect(pctFilterIsEmpty({ values: [] })).toBe(true);
    expect(pctFilterIsEmpty({ values: [null] })).toBe(false);
    expect(pctFilterIsEmpty({ from: null, to: null })).toBe(true);
    expect(pctFilterIsEmpty({ from: 0, to: null })).toBe(false);
    expect(pctFilterIsEmpty({ from: null, to: 0 })).toBe(false);
    expect(pctFilterIsEmpty({ since: null, until: null })).toBe(true);
    expect(pctFilterIsEmpty({ since: '2026-10-26', until: null })).toBe(false);
    expect(pctFilterIsEmpty({ since: null, until: '2026-10-26' })).toBe(false);
    expect(pctFilterIsEmpty({ own: undefined })).toBe(true);
    expect(pctFilterIsEmpty({ own: null })).toBe(true);
    expect(pctFilterIsEmpty({ own: 0 })).toBe(false);
    expect(pctFilterIsEmpty({ own: false })).toBe(false);
  });

  it('holds a state that is no filter at all as one that filters', () => {
    const broken = (state: unknown) => state as PctAnyColumnFilter;
    expect(pctFilterIsEmpty(broken('lamp'))).toBe(false);
    expect(pctFilterIsEmpty(broken(null))).toBe(false);
    expect(pctFilterIsEmpty(broken({}))).toBe(false);
    expect(pctFilterIsEmpty(broken({ text: 5 }))).toBe(false);
    expect(pctFilterIsEmpty(broken({ values: 'a' }))).toBe(false);
    expect(pctFilterIsEmpty(broken({ from: '1', to: null }))).toBe(false);
    expect(pctFilterIsEmpty(broken({ from: null }))).toBe(false);
    expect(pctFilterIsEmpty(broken({ since: 1, until: null }))).toBe(false);
    expect(pctFilterIsEmpty(broken({ since: null }))).toBe(false);
  });
});

describe('pctColumnFilterTest', () => {
  it('lets every row through for an empty filter', () => {
    expect(passes(name, { text: '' }, lamp)).toBeNull();
    expect(passes(power, { from: null, to: null }, lamp)).toBeNull();
  });

  it('finds every word of a text in the cell’s text, folded as the quick filter folds', () => {
    expect(passes(name, { text: 'LAMP ceil' }, lamp)).toBe(true);
    expect(passes(name, { text: 'lamp fan' }, lamp)).toBe(false);
    // What is searched is what the cell shows: the unit and the locale's digits.
    const written = { ...power, columnFilter: 'text' } as PctAnyColumn<Device>;
    expect(passes(written, { text: '899,7 KWH' }, lamp)).toBe(true);
    expect(passes(written, { text: '7899' }, lamp)).toBe(false);
  });

  it('composes the text before it looks', () => {
    const expose = { ...lamp, name: 'Exposé' };
    expect(passes(name, { text: 'exposé' }, expose)).toBe(true);
  });

  it('lets a row through by one of the values, null standing for no value', () => {
    expect(passes(on, { values: [true] }, lamp)).toBe(true);
    expect(passes(on, { values: [true] }, fan)).toBe(false);
    expect(passes(on, { values: [false, true] }, fan)).toBe(true);
    expect(passes(room, { values: [null] }, fan)).toBe(true);
    expect(passes(room, { values: [null] }, lamp)).toBe(false);
    expect(passes(room, { values: ['Kitchen'] }, lamp)).toBe(true);
  });

  it('compares the values as includes does: NaN with NaN, -0 with 0', () => {
    const at = (power: number) => ({ ...lamp, power });
    const picked = { ...power, columnFilter: 'values' } as PctAnyColumn<Device>;
    expect(passes(picked, { values: [0] }, at(-0))).toBe(true);
    expect(passes(picked, { values: [NaN] }, at(NaN))).toBe(true);
    expect(passes(picked, { values: [1] }, at(NaN))).toBe(false);
  });

  it('lets nothing through a filter of a shape the column does not take, or of none', () => {
    const broken = (state: unknown) => state as PctAnyColumnFilter;
    expect(passes(power, { text: '7' }, lamp)).toBe(false);
    expect(passes(power, { since: '2026-01-01', until: null }, lamp)).toBe(
      false,
    );
    expect(passes(name, { values: ['Ceiling Lamp'] }, lamp)).toBe(false);
    expect(passes(seen, { from: 0, to: null }, lamp)).toBe(false);
    for (const state of [
      'lamp',
      null,
      {},
      { text: 5 },
      { values: 'Kitchen' },
      { from: '1', to: null },
      { from: null },
      { since: 1, until: null },
      { since: null },
    ])
      for (const column of [name, room, power, seen])
        expect(passes(column, broken(state), lamp)).toBe(false);
  });

  it('takes both ends of a range, and any number past an open one', () => {
    const at = (power: number) => ({ ...lamp, power });
    expect(passes(power, { from: 10, to: 20 }, at(10))).toBe(true);
    expect(passes(power, { from: 10, to: 20 }, at(20))).toBe(true);
    expect(passes(power, { from: 10, to: 20 }, at(9.99))).toBe(false);
    expect(passes(power, { from: 10, to: 20 }, at(20.01))).toBe(false);
    expect(passes(power, { from: 10, to: null }, at(1e9))).toBe(true);
    expect(passes(power, { from: null, to: 20 }, at(-1e9))).toBe(true);
    expect(passes(power, { from: null, to: 20 }, at(21))).toBe(false);
  });

  it('lets no empty value, nor a value that is not a number, into a range', () => {
    expect(passes(power, { from: null, to: 20 }, fan)).toBe(false);
    expect(passes(power, { from: 0, to: null }, { ...lamp, power: NaN })).toBe(
      false,
    );
    expect(passes(name, { from: 0, to: null }, lamp)).toBe(false);
  });

  it('reads the days in the column’s zone, from the start of the first to the end of the last', () => {
    // 00:30 on 26 October in Warsaw is still the 25th in UTC.
    expect(passes(seen, { since: '2026-10-26', until: null }, lamp)).toBe(true);
    expect(passes(seen, { since: null, until: '2026-10-25' }, lamp)).toBe(
      false,
    );
    expect(
      passes(seen, { since: '2026-10-26', until: '2026-10-26' }, lamp),
    ).toBe(true);
    expect(passes(seen, { since: '2026-10-27', until: null }, lamp)).toBe(
      false,
    );
  });

  it('counts a day’s end as the next day’s start, which it does not hold', () => {
    const midnight = Date.UTC(2026, 9, 26, 23, 0); // 27 October, 00:00 in Warsaw
    const at = { ...lamp, seen: midnight };
    expect(passes(seen, { since: null, until: '2026-10-26' }, at)).toBe(false);
    expect(passes(seen, { since: null, until: '2026-10-27' }, at)).toBe(true);
    expect(
      passes(
        seen,
        { since: null, until: '2026-10-26' },
        { ...at, seen: midnight - 1 },
      ),
    ).toBe(true);
    expect(passes(seen, { since: '2026-10-27', until: null }, at)).toBe(true);
    expect(
      passes(
        seen,
        { since: '2026-10-27', until: null },
        { ...at, seen: midnight - 1 },
      ),
    ).toBe(false);
  });

  it('reads the days in a zone far from the runtime’s and from UTC', () => {
    // Tokyo is nine hours ahead: 23:30 UTC on 25 October is 08:30 on the 26th there.
    const far = col.key('seen', {
      header: 'Seen',
      kind: { instant: { timeZone: 'Asia/Tokyo' } },
    });
    const start = Date.UTC(2026, 9, 25, 15, 0); // 26 October, 00:00 in Tokyo
    const at = { ...lamp, seen: start };
    expect(passes(far, { since: '2026-10-26', until: null }, at)).toBe(true);
    expect(
      passes(
        far,
        { since: '2026-10-26', until: null },
        { ...at, seen: start - 1 },
      ),
    ).toBe(false);
  });

  it('reads the days of a column filtered by them without an instant kind in the runtime’s zone', () => {
    const start = new Date(2026, 9, 26).getTime();
    const at = { ...lamp, seen: start };
    for (const column of [
      { ...name, columnFilter: 'days' },
      { ...power, columnFilter: 'days' },
    ] as PctAnyColumn<Device>[]) {
      const days = { ...column, value: (row: Device) => row.seen };
      expect(passes(days, { since: '2026-10-26', until: null }, at)).toBe(true);
      expect(
        passes(
          days,
          { since: '2026-10-26', until: null },
          { ...at, seen: start - 1 },
        ),
      ).toBe(false);
    }
  });

  it('reads a zone the column does not name as the runtime’s', () => {
    const start = new Date(2026, 9, 26).getTime();
    const at = { ...lamp, seen: start };
    expect(passes(seenHere, { since: '2026-10-26', until: null }, at)).toBe(
      true,
    );
    expect(
      passes(
        seenHere,
        { since: '2026-10-26', until: null },
        { ...at, seen: start - 1 },
      ),
    ).toBe(false);
  });

  it('lets nothing through an end that is not a day', () => {
    expect(
      passes(seen, { since: 'not a day', until: '2026-10-26' }, lamp),
    ).toBe(false);
    expect(passes(seen, { since: '2026-10-26', until: '26.10' }, lamp)).toBe(
      false,
    );
    expect(passes(seen, { since: '2026-02-30', until: null }, lamp)).toBe(
      false,
    );
    expect(passes(seen, { since: null, until: '2026-02-30' }, lamp)).toBe(
      false,
    );
  });

  it('asks the column’s filterBy with the value and the state', () => {
    const asked: unknown[] = [];
    const column = {
      ...room,
      columnFilter: undefined,
      filterBy: (value: string | null, own: unknown) => {
        asked.push([value, own]);
        return value === own;
      },
    } as PctAnyColumn<Device>;
    expect(passes(column, { own: 'Kitchen' }, lamp)).toBe(true);
    expect(passes(column, { own: 'Hall' }, lamp)).toBe(false);
    expect(asked).toEqual([
      ['Kitchen', 'Kitchen'],
      ['Kitchen', 'Hall'],
    ]);
  });

  it('lets nothing through an own state on a column with no filterBy', () => {
    const own = { ...room, columnFilter: 'own' } as PctAnyColumn<Device>;
    expect(passes(own, { own: 'Kitchen' }, lamp)).toBe(false);
  });
});

describe('pctColumnValues', () => {
  it('lists each value once, in the rows’ order, with the first row that holds it', () => {
    const hall = { ...lamp, room: 'Hall' };
    const second = { ...lamp, name: 'Second' };
    expect(pctColumnValues(room, [lamp, hall, second])).toEqual([
      { value: 'Kitchen', row: lamp },
      { value: 'Hall', row: hall },
    ]);
  });

  it('puts no value last, once, with the first row that has none', () => {
    const other = { ...fan, name: 'Other' };
    expect(pctColumnValues(room, [fan, lamp, other])).toEqual([
      { value: 'Kitchen', row: lamp },
      { value: null, row: fan },
    ]);
    expect(
      pctColumnValues(room, [{ ...lamp, room: undefined as unknown as null }]),
    ).toEqual([{ value: null, row: { ...lamp, room: undefined } }]);
  });

  it('lists nothing for no rows', () => {
    expect(pctColumnValues(room, [])).toEqual([]);
  });
});
