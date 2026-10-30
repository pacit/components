import {
  pctColumnsOf,
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
