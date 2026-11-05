import {
  pctForAll,
  pctInt,
  pctRandom,
  pctRecord,
} from '../../../testing/src/property.testkit';
import {
  pctColumnsOf,
  pctColumnsReader,
  pctFirstUnordered,
  pctRead,
  type PctKey,
} from './columns';

interface Reading {
  at: number;
  value: number | null;
  name: string;
}

describe('pctRead', () => {
  it('reads a column by its key', () => {
    expect(
      pctRead<Reading, number>('at')({ at: 5, value: 1, name: 'a' }, 0),
    ).toBe(5);
  });

  it('calls a function with the row and its index', () => {
    const read = pctRead<Reading, string>((row, i) => `${row.name}${i}`);
    expect(read({ at: 5, value: 1, name: 'a' }, 3)).toBe('a3');
  });
});

describe('pctColumnsOf', () => {
  it('copies positions and values into two columns', () => {
    const rows: Reading[] = [
      { at: 1, value: 10, name: 'a' },
      { at: 2, value: 20, name: 'b' },
    ];
    const c = pctColumnsOf(rows, 'at', 'value');
    expect(c.length).toBe(2);
    expect([...c.xs]).toEqual([1, 2]);
    expect([...c.ys]).toEqual([10, 20]);
  });

  it('reads an infinity as a gap', () => {
    const c = pctColumnsOf(
      [
        [1, Infinity],
        [2, -Infinity],
        [3, 4],
      ] as const,
      (p) => p[0],
      (p) => p[1],
    );
    expect([...c.ys].map((y) => (Number.isNaN(y) ? 'gap' : y))).toEqual([
      'gap',
      'gap',
      4,
    ]);
  });

  it('reads null, undefined and NaN as a gap', () => {
    const c = pctColumnsOf(
      [
        [1, null],
        [2, undefined],
        [3, NaN],
        [4, 0],
      ] as const,
      (p) => p[0],
      (p) => p[1],
    );
    expect([...c.ys].map((y) => (Number.isNaN(y) ? 'gap' : y))).toEqual([
      'gap',
      'gap',
      'gap',
      0,
    ]);
  });

  it('leaves out a row with no finite position, keeping the rest in order', () => {
    const c = pctColumnsOf(
      [
        [1, 1],
        [NaN, 2],
        [Infinity, 3],
        [4, 4],
      ] as const,
      (p) => p[0],
      (p) => p[1],
    );
    expect(c.length).toBe(2);
    expect(c.xs.length).toBe(2);
    expect(c.ys.length).toBe(2);
    expect([...c.xs]).toEqual([1, 4]);
    expect([...c.ys]).toEqual([1, 4]);
  });

  it('passes the row index to an accessor', () => {
    const c = pctColumnsOf(
      [7, 8, 9],
      (_, i) => i * 10,
      (v) => v,
    );
    expect([...c.xs]).toEqual([0, 10, 20]);
  });
});

describe('pctColumnsReader', () => {
  type Row = { at: number; value: number | null };
  const row = (at: number, value: number | null = at * 10): Row => ({
    at,
    value,
  });
  const plain = (c: {
    xs: Float64Array;
    ys: Float64Array;
    length: number;
  }) => ({
    xs: [...c.xs.subarray(0, c.length)],
    ys: [...c.ys.subarray(0, c.length)],
    length: c.length,
  });
  const counted = () => {
    const seen: number[] = [];
    const x = (r: Row) => {
      seen.push(r.at);
      return r.at;
    };
    return { seen, x };
  };

  it('reads new rows whole, as pctColumnsOf reads them', () => {
    const read = pctColumnsReader<Row>();
    const rows = [row(1), row(2, null), row(NaN), row(4)];
    expect(plain(read(rows, 'at', 'value'))).toEqual(
      plain(pctColumnsOf(rows, 'at', 'value')),
    );
    expect(plain(read([], 'at', 'value'))).toEqual({
      xs: [],
      ys: [],
      length: 0,
    });
  });

  it('reads only the rows added when the rest are the rows it read, some dropped from the front', () => {
    const read = pctColumnsReader<Row>();
    const { seen, x } = counted();
    const rows = [row(1), row(2), row(3)];
    read(rows, x, 'value');
    seen.length = 0;
    const next = [...rows.slice(1), row(4), row(5)];
    expect(plain(read(next, x, 'value'))).toEqual({
      xs: [2, 3, 4, 5],
      ys: [20, 30, 40, 50],
      length: 4,
    });
    expect(seen).toEqual([4, 5]);
    // grown at the back alone, and with nothing added
    seen.length = 0;
    expect(read([...next, row(6)], x, 'value').length).toBe(5);
    expect(seen).toEqual([6]);
  });

  it('hands back the same columns for the same rows in a new array', () => {
    const read = pctColumnsReader<Row>();
    const { seen, x } = counted();
    const rows = [row(1), row(2)];
    const first = read(rows, x, 'value');
    seen.length = 0;
    expect(read([...rows], x, 'value')).toBe(first);
    expect(seen).toEqual([]);
  });

  it('reads whole when a kept row is another object, or an accessor changed', () => {
    const read = pctColumnsReader<Row>();
    const { seen, x } = counted();
    const rows = [row(1), row(2), row(3)];
    read(rows, x, 'value');
    seen.length = 0;
    // the middle row corrected: a new object
    const corrected = [rows[0], row(2, 99), rows[2]];
    expect(plain(read(corrected, x, 'value')).ys).toEqual([10, 99, 30]);
    expect(seen).toEqual([1, 2, 3]);
    // the same rows read through another accessor
    seen.length = 0;
    const other = (r: Row) => {
      seen.push(r.at);
      return r.at * 2;
    };
    expect(plain(read(corrected, other, 'value')).xs).toEqual([2, 4, 6]);
    expect(seen).toEqual([1, 2, 3]);
    // and back through the value's name changed
    expect(plain(read(corrected, other, (r) => r.at)).ys).toEqual([1, 2, 3]);
  });

  it('reads whole when the rows lost one at the back, or none of them is kept', () => {
    const read = pctColumnsReader<Row>();
    const { seen, x } = counted();
    const rows = [row(1), row(2), row(3)];
    read(rows, x, 'value');
    seen.length = 0;
    expect(plain(read(rows.slice(0, 2), x, 'value')).xs).toEqual([1, 2]);
    expect(seen).toEqual([1, 2]);
    seen.length = 0;
    expect(plain(read([row(7)], x, 'value')).xs).toEqual([7]);
    expect(seen).toEqual([7]);
  });

  it("reads whole when an accessor takes the row's index, whose answer moves with the rows", () => {
    const read = pctColumnsReader<Row>();
    const byIndex = (_: Row, i: number) => i;
    const rows = [row(1), row(2), row(3)];
    read(rows, byIndex, 'value');
    expect(
      plain(read([...rows.slice(1), row(4)], byIndex, 'value')).xs,
    ).toEqual([0, 1, 2]);
  });

  it('reads whole after a row left out, and when an added row has nowhere to stand', () => {
    const read = pctColumnsReader<Row>();
    const { seen, x } = counted();
    const rows = [row(1), row(NaN), row(3)];
    read(rows, x, 'value');
    seen.length = 0;
    const next = [...rows, row(4)];
    expect(plain(read(next, x, 'value')).xs).toEqual([1, 3, 4]);
    expect(seen).toEqual([1, NaN, 3, 4]);
    const whole = [row(1), row(2)];
    read(whole, x, 'value');
    seen.length = 0;
    expect(
      plain(read([...whole, row(Infinity), row(5)], x, 'value')).xs,
    ).toEqual([1, 2, 5]);
    expect(seen).toEqual([Infinity, 1, 2, Infinity, 5]);
  });

  it('reads no rows after no rows as no rows', () => {
    const read = pctColumnsReader<Row>();
    read([], 'at', 'value');
    expect(plain(read([], 'at', 'value'))).toEqual({
      xs: [],
      ys: [],
      length: 0,
    });
  });

  it('reads an infinity added at the back as a gap', () => {
    const read = pctColumnsReader<Row>();
    const rows = [row(1)];
    read(rows, 'at', 'value');
    const columns = read([...rows, row(2, Infinity)], 'at', 'value');
    expect(plain(columns).ys.map((y) => (Number.isNaN(y) ? 'gap' : y))).toEqual(
      [10, 'gap'],
    );
  });

  it('adds into the room it keeps, and moves to twice the rows only once that is full', () => {
    const read = pctColumnsReader<Row>();
    let rows = [row(0), row(1), row(2)];
    read(rows, 'at', 'value');
    rows = [...rows, row(3)];
    // four rows: room for 64, the least it makes
    const moved = read(rows, 'at', 'value');
    while (rows.length < 64) rows = [...rows, row(rows.length)];
    const full = read(rows, 'at', 'value');
    expect(full.xs.buffer).toBe(moved.xs.buffer);
    expect(full.length).toBe(64);
    const past = read([...rows, row(64)], 'at', 'value');
    expect(past.xs.buffer).not.toBe(full.xs.buffer);
    expect(past.xs.buffer.byteLength).toBe(130 * 8);
  });

  it('never writes over the columns it handed out before, through a move to more room', () => {
    const read = pctColumnsReader<Row>();
    let rows = Array.from({ length: 40 }, (_, i) => row(i));
    const handed = [read(rows, 'at', 'value')];
    const copies = [plain(handed[0])];
    for (let k = 40; k < 200; k++) {
      rows = [...rows.slice(1), row(k)];
      const columns = read(rows, 'at', 'value');
      handed.push(columns);
      copies.push(plain(columns));
    }
    handed.forEach((columns, i) => expect(plain(columns)).toEqual(copies[i]));
    expect(copies.at(-1)?.xs).toEqual(
      Array.from({ length: 40 }, (_, i) => 160 + i),
    );
  });

  it('always gives what pctColumnsOf gives, whatever the rows did between two reads', () => {
    pctForAll(
      pctRecord({ seed: pctInt(1, 1_000_000) }),
      ({ seed }) => {
        const random = pctRandom(seed);
        const read = pctColumnsReader<Row>();
        let at = 0;
        const fresh = () => {
          at++;
          const r = random();
          return row(r < 0.05 ? NaN : at, r > 0.9 ? null : at * 10);
        };
        let rows: Row[] = [];
        for (let step = 0; step < 30; step++) {
          const r = random();
          const drop = Math.floor(random() * 3);
          const add = Math.floor(random() * 4);
          if (r < 0.7)
            rows = [
              ...rows.slice(Math.min(drop, rows.length)),
              ...Array.from({ length: add }, fresh),
            ];
          else if (r < 0.8) rows = rows.slice(0, Math.max(0, rows.length - 1));
          else if (r < 0.9 && rows.length > 0) {
            const i = Math.floor(random() * rows.length);
            rows = rows.map((old, j) => (j === i ? row(old.at, -1) : old));
          } else rows = [...rows];
          expect(plain(read(rows, 'at', 'value'))).toEqual(
            plain(pctColumnsOf(rows, 'at', 'value')),
          );
        }
      },
      { runs: 60 },
    );
  });
});

describe('pctFirstUnordered', () => {
  it('names the first reading standing before its predecessor', () => {
    const at = (xs: number[]) => ({
      xs: Float64Array.from(xs),
      ys: new Float64Array(xs.length),
      length: xs.length,
    });
    expect(pctFirstUnordered(at([1, 2, 2, 3]))).toBe(-1);
    expect(pctFirstUnordered(at([1, 3, 2, 4]))).toBe(2);
    expect(pctFirstUnordered(at([2, 1]))).toBe(1);
    expect(pctFirstUnordered(at([]))).toBe(-1);
  });

  it('reads only up to the length, not the whole buffer', () => {
    expect(
      pctFirstUnordered({
        xs: Float64Array.from([1, 2, 0]),
        ys: new Float64Array(3),
        length: 2,
      }),
    ).toBe(-1);
  });
});

describe('PctKey', () => {
  // Checked by the compiler: each `@ts-expect-error` is a key the type refuses, and an unused
  // one is itself an error in the `typecheck` target.
  it('names the keys of the right type and no other', () => {
    interface Row {
      at: number;
      value: number | null;
      name: string;
      opt?: number;
    }
    const at: PctKey<Row, number> = 'at';
    // @ts-expect-error a text column is not a number
    const name: PctKey<Row, number> = 'name';
    // @ts-expect-error a nullable column is not a number
    const value: PctKey<Row, number> = 'value';
    const nullable: PctKey<Row, number | null> = 'value';
    // @ts-expect-error an optional column may be undefined
    const opt: PctKey<Row, number> = 'opt';
    const first: PctKey<readonly [number, number | null], number> = '0';
    // @ts-expect-error a tuple's method is not a column
    const map: PctKey<readonly [number, number | null], number> = 'map';
    expect([at, name, value, nullable, opt, first, map]).toHaveLength(7);
  });

  it('types a function accessor by the rows, given tuples', () => {
    const c = pctColumnsOf(
      [[1, 2]] as const,
      (p) => p[0],
      (p) => p[1],
    );
    expect(c.length).toBe(1);
  });
});
