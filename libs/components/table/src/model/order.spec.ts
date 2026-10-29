import { pctColumnsOf } from './columns';
import { pctCompareValues, pctIsEmptyValue, pctOrderRows } from './order';

interface Device {
  name: string;
  power: number | null;
  room: string;
}

const col = pctColumnsOf<Device>();
const name = col.key('name', { header: 'Name' });
const power = col.key('power', { header: 'Power' });
const room = col.key('room', { header: 'Room' });
const collator = new Intl.Collator('en', { numeric: true });

const lamp: Device = { name: 'Lamp', power: 12, room: 'Kitchen' };
const boiler: Device = { name: 'Boiler', power: 900, room: 'Kitchen' };
const sensor: Device = { name: 'Sensor', power: null, room: 'Hall' };
const fan: Device = { name: 'Fan', power: 12, room: 'Hall' };

describe('pctIsEmptyValue', () => {
  it('reads null, undefined, NaN and an invalid date as empty', () => {
    expect(pctIsEmptyValue(null)).toBe(true);
    expect(pctIsEmptyValue(undefined)).toBe(true);
    expect(pctIsEmptyValue(Number.NaN)).toBe(true);
    expect(pctIsEmptyValue(new Date(Number.NaN))).toBe(true);
  });

  it('reads zero, the empty string, false and a valid date as values', () => {
    expect(pctIsEmptyValue(0)).toBe(false);
    expect(pctIsEmptyValue('')).toBe(false);
    expect(pctIsEmptyValue(false)).toBe(false);
    expect(pctIsEmptyValue(new Date(0))).toBe(false);
  });
});

describe('pctCompareValues', () => {
  /** Not numeric: `'10'` before `'2'`, so a comparison by size is told from one by text. */
  const text = new Intl.Collator('en');

  it('compares numbers by size, not by the text they print', () => {
    expect(pctCompareValues(2, 10, text)).toBeLessThan(0);
    expect(pctCompareValues(10, 2, text)).toBeGreaterThan(0);
    expect(pctCompareValues(3, 3, text)).toBe(0);
  });

  it('compares big integers by size, both ways and equal', () => {
    expect(pctCompareValues(2n, 10n, text)).toBe(-1);
    expect(pctCompareValues(10n, 2n, text)).toBe(1);
    expect(pctCompareValues(4n, 4n, text)).toBe(0);
  });

  it('compares a big integer, a number and a date by size across the three', () => {
    expect(pctCompareValues(2n, 10, text)).toBe(-1);
    expect(pctCompareValues(10, 2n, text)).toBe(1);
    expect(pctCompareValues(new Date(5), 3, text)).toBe(1);
    expect(pctCompareValues(Infinity, Infinity, text)).toBe(0);
    expect(pctCompareValues(-Infinity, 0, text)).toBe(-1);
  });

  it('puts false before true', () => {
    expect(pctCompareValues(false, true, text)).toBeLessThan(0);
    expect(pctCompareValues(true, false, text)).toBeGreaterThan(0);
  });

  it('compares dates by time, to the millisecond', () => {
    expect(pctCompareValues(new Date(1), new Date(2), text)).toBe(-1);
    expect(pctCompareValues(new Date(2), new Date(1), text)).toBe(1);
    expect(pctCompareValues(new Date(2), new Date(2), text)).toBe(0);
  });

  it('puts a value with a size before a text, whichever comes first', () => {
    expect(pctCompareValues(new Date(0), 'a', text)).toBe(-1);
    expect(pctCompareValues('a', 99, text)).toBe(1);
    expect(pctCompareValues(5n, 'a', text)).toBe(-1);
  });

  it('compares strings by the collator, so a numeric one orders item 9 before item 10', () => {
    expect(pctCompareValues('item 9', 'item 10', collator)).toBeLessThan(0);
    expect(pctCompareValues('item 9', 'item 10', text)).toBeGreaterThan(0);
  });

  it('compares values of two types as the strings they print', () => {
    expect(pctCompareValues(10, 'a', collator)).toBeLessThan(0);
    expect(pctCompareValues('a', 10, collator)).toBeGreaterThan(0);
    expect(pctCompareValues(true, 'true', collator)).toBe(0);
  });
});

describe('pctOrderRows', () => {
  const rows = [lamp, boiler, sensor, fan];

  it('hands back the same array when no key orders', () => {
    expect(pctOrderRows(rows, [], collator)).toBe(rows);
    const fixed = col.key('name', { header: 'Name', sort: false });
    expect(
      pctOrderRows(rows, [{ column: fixed, direction: 'ascending' }], collator),
    ).toBe(rows);
  });

  it('orders by one key either way, and leaves the input as it was', () => {
    expect(
      pctOrderRows(rows, [{ column: name, direction: 'ascending' }], collator),
    ).toEqual([boiler, fan, lamp, sensor]);
    expect(
      pctOrderRows(rows, [{ column: name, direction: 'descending' }], collator),
    ).toEqual([sensor, lamp, fan, boiler]);
    expect(rows).toEqual([lamp, boiler, sensor, fan]);
  });

  it('puts an empty value last in both directions', () => {
    expect(
      pctOrderRows(rows, [{ column: power, direction: 'ascending' }], collator),
    ).toEqual([lamp, fan, boiler, sensor]);
    expect(
      pctOrderRows(
        rows,
        [{ column: power, direction: 'descending' }],
        collator,
      ),
    ).toEqual([boiler, lamp, fan, sensor]);
    expect(
      pctOrderRows(
        [sensor, lamp],
        [{ column: power, direction: 'ascending' }],
        collator,
      ),
    ).toEqual([lamp, sensor]);
  });

  it('keeps the order of rows every key finds equal', () => {
    expect(
      pctOrderRows(
        [fan, lamp],
        [{ column: power, direction: 'ascending' }],
        collator,
      ),
    ).toEqual([fan, lamp]);
    expect(
      pctOrderRows(
        [lamp, fan],
        [{ column: power, direction: 'descending' }],
        collator,
      ),
    ).toEqual([lamp, fan]);
  });

  it('asks the next key when the first finds two rows equal, or both empty', () => {
    const keys = [
      { column: power, direction: 'ascending' as const },
      { column: name, direction: 'ascending' as const },
    ];
    expect(pctOrderRows([lamp, fan, boiler], keys, collator)).toEqual([
      fan,
      lamp,
      boiler,
    ]);
    const radio: Device = { name: 'Radio', power: null, room: 'Hall' };
    expect(pctOrderRows([sensor, radio], keys, collator)).toEqual([
      radio,
      sensor,
    ]);
  });

  it('skips a key that does not order and uses the ones that do', () => {
    const fixed = col.key('room', { header: 'Room', sort: false });
    expect(
      pctOrderRows(
        [lamp, fan],
        [
          { column: fixed, direction: 'ascending' },
          { column: name, direction: 'descending' },
        ],
        collator,
      ),
    ).toEqual([lamp, fan]);
  });

  it('orders by the column’s own comparison when it has one', () => {
    // By length `Fan` comes before `Boiler`; by the alphabet it would come after.
    const byLength = col.key('name', {
      header: 'Name',
      sort: (a, b) => a.length - b.length,
    });
    expect(
      pctOrderRows(
        [boiler, fan],
        [{ column: byLength, direction: 'ascending' }],
        collator,
      ),
    ).toEqual([fan, boiler]);
    expect(
      pctOrderRows(
        [fan, boiler],
        [{ column: byLength, direction: 'descending' }],
        collator,
      ),
    ).toEqual([boiler, fan]);
  });

  it('asks the next key when two values tie at infinity', () => {
    const big = col.value(
      'power',
      (d) => (d.power === null ? null : Infinity),
      { header: 'P' },
    );
    expect(
      pctOrderRows(
        [lamp, boiler],
        [
          { column: big, direction: 'ascending' },
          { column: name, direction: 'ascending' },
        ],
        collator,
      ),
    ).toEqual([boiler, lamp]);
  });

  it('reads NaN from a comparison as no order, and asks the next key', () => {
    const broken = col.key('room', { header: 'Room', sort: () => Number.NaN });
    expect(
      pctOrderRows(
        [lamp, boiler],
        [
          { column: broken, direction: 'ascending' },
          { column: name, direction: 'ascending' },
        ],
        collator,
      ),
    ).toEqual([boiler, lamp]);
  });

  it('reads each value once per key, not once per comparison', () => {
    let reads = 0;
    const counted = col.value(
      'room',
      (d) => {
        reads++;
        return d.room;
      },
      { header: 'Room' },
    );
    pctOrderRows(rows, [{ column: counted, direction: 'ascending' }], collator);
    expect(reads).toBe(rows.length);
    expect(room.value(lamp)).toBe('Kitchen');
  });
});
