import {
  pctBlockRows,
  pctBlocksFor,
  pctFailedBlock,
  type PctBlock,
} from './blocks';

describe('pctBlocksFor', () => {
  it('asks for the first block while the total is not known', () => {
    expect(pctBlocksFor({ start: 4000, end: 4030 }, null, 100)).toEqual([0]);
  });

  it('asks for the block the rows stand in, and half a block on each side', () => {
    // 450 - 50 is in block 4, 480 + 50 in block 5.
    expect(pctBlocksFor({ start: 450, end: 480 }, 10_000, 100)).toEqual([4, 5]);
    // 440 - 50 is in block 3.
    expect(pctBlocksFor({ start: 440, end: 480 }, 10_000, 100)).toEqual([
      3, 4, 5,
    ]);
  });

  it('takes the slack to the block edge exactly, and no further', () => {
    // 450 - 50 = 400 starts block 4, and 450 + 50 = 500 ends the range before block 5.
    expect(pctBlocksFor({ start: 450, end: 450 }, 10_000, 100)).toEqual([4]);
    // 449 - 50 = 399 is the last row of block 3.
    expect(pctBlocksFor({ start: 449, end: 450 }, 10_000, 100)).toEqual([3, 4]);
    // 451 + 50 takes the first row of block 5.
    expect(pctBlocksFor({ start: 450, end: 451 }, 10_000, 100)).toEqual([4, 5]);
  });

  it('rounds an odd block size’s half up', () => {
    // A slack of 2 for a block of 3: 5 - 2 = 3 is in block 1, and 5 + 2 = 7 reaches block 2.
    expect(pctBlocksFor({ start: 5, end: 5 }, 100, 3)).toEqual([1, 2]);
  });

  it('starts at the first block and ends at the last the total fills', () => {
    expect(pctBlocksFor({ start: 0, end: 30 }, 10_000, 100)).toEqual([0]);
    expect(pctBlocksFor({ start: 960, end: 990 }, 1000, 100)).toEqual([9]);
    // 950 rows fill ten blocks, the last one half.
    expect(pctBlocksFor({ start: 930, end: 950 }, 950, 100)).toEqual([8, 9]);
  });

  it('asks for nothing of a source with no rows', () => {
    expect(pctBlocksFor({ start: 0, end: 0 }, 0, 100)).toEqual([]);
  });
});

describe('pctBlockRows', () => {
  const blocks = (
    entries: readonly (readonly [number, PctBlock<string>])[],
  ): ReadonlyMap<number, PctBlock<string>> => new Map(entries);

  it('is holes where no block has delivered', () => {
    expect(pctBlockRows(blocks([]), 3, 2)).toEqual([
      undefined,
      undefined,
      undefined,
    ]);
    expect(pctBlockRows(blocks([]), 3, 2)).toHaveLength(3);
  });

  it('puts each block’s rows at its place', () => {
    const rows = pctBlockRows(
      blocks([
        [1, { state: 'loaded', rows: ['c', 'd'] }],
        [0, { state: 'loading', rows: null }],
      ]),
      5,
      2,
    );
    expect(rows).toEqual([undefined, undefined, 'c', 'd', undefined]);
  });

  it('keeps the rows of a block asked again, and of one that failed again', () => {
    const rows = pctBlockRows(
      blocks([
        [0, { state: 'loading', rows: ['a', 'b'] }],
        [1, { state: 'failed', error: 'down', rows: ['c', 'd'] }],
        [2, { state: 'failed', error: 'down', rows: null }],
      ]),
      6,
      2,
    );
    expect(rows).toEqual(['a', 'b', 'c', 'd', undefined, undefined]);
  });

  it('drops the rows past a total that shrank', () => {
    const rows = pctBlockRows(
      blocks([[1, { state: 'loaded', rows: ['c', 'd'] }]]),
      3,
      2,
    );
    expect(rows).toEqual([undefined, undefined, 'c']);
  });

  it('drops a block’s rows past its size: the next block’s place', () => {
    const rows = pctBlockRows(
      blocks([[0, { state: 'loaded', rows: ['a', 'b', 'c'] }]]),
      4,
      2,
    );
    expect(rows).toEqual(['a', 'b', undefined, undefined]);
  });

  it('draws a short last block as long as it is', () => {
    const rows = pctBlockRows(
      blocks([[1, { state: 'loaded', rows: ['c'] }]]),
      4,
      2,
    );
    expect(rows).toEqual([undefined, undefined, 'c', undefined]);
  });
});

describe('pctFailedBlock', () => {
  const blocks = new Map<number, PctBlock<string>>([
    [0, { state: 'loading', rows: null }],
    [1, { state: 'failed', error: 'down', rows: null }],
    [2, { state: 'failed', error: 'down', rows: ['e'] }],
    [3, { state: 'loaded', rows: ['g', 'h'] }],
  ]);

  it('names the failed block a hole stands in', () => {
    expect(pctFailedBlock(blocks, 2, 2)).toBe(1);
    expect(pctFailedBlock(blocks, 3, 2)).toBe(1);
    // Past the rows a failed refresh kept.
    expect(pctFailedBlock(blocks, 5, 2)).toBe(2);
  });

  it('is null for a hole whose block loads, or that no block holds', () => {
    expect(pctFailedBlock(blocks, 1, 2)).toBeNull();
    expect(pctFailedBlock(blocks, 6, 2)).toBeNull();
    expect(pctFailedBlock(blocks, 9, 2)).toBeNull();
  });
});
