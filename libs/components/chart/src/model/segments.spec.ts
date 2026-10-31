import { pctSegmentAt, pctSegmentsOf, pctSegmentTotals } from './segments';

const rows = [
  { from: 10, to: 20, mode: 'heating' },
  { from: 0, to: 10, mode: 'off' },
  { from: 30, to: 20, mode: 'standby' },
  { from: 30, to: 30, mode: 'defrost' },
  { from: NaN, to: 40, mode: 'off' },
  { from: 40, to: Infinity, mode: 'off' },
  { from: 40, to: 50, mode: null },
  { from: 40, to: 50, mode: 2 },
  { from: 45, to: 55, mode: false },
];

describe('pctSegmentsOf', () => {
  it('reads the segments off the rows in the order of their starts, ends in either order, the state as text, and leaves out what has nowhere to stand', () => {
    expect(pctSegmentsOf(rows, 'from', 'to', 'mode')).toEqual([
      { from: 0, to: 10, state: 'off', index: 1 },
      { from: 10, to: 20, state: 'heating', index: 0 },
      { from: 20, to: 30, state: 'standby', index: 2 },
      { from: 40, to: 50, state: '2', index: 7 },
      { from: 45, to: 55, state: 'false', index: 8 },
    ]);
  });

  it('reads by a function as well, with the row’s index, and keeps the rows’ order at one start', () => {
    const pairs: (readonly [number, number, string])[] = [
      [5, 8, 'b'],
      [5, 6, 'a'],
    ];
    expect(
      pctSegmentsOf(
        pairs,
        (p) => p[0],
        (p) => p[1],
        (p, i) => `${p[2]}${i}`,
      ),
    ).toEqual([
      { from: 5, to: 8, state: 'b0', index: 0 },
      { from: 5, to: 6, state: 'a1', index: 1 },
    ]);
    expect(pctSegmentsOf([], 'from', 'to', 'mode')).toEqual([]);
  });
});

describe('pctSegmentAt', () => {
  const segments = pctSegmentsOf(rows.slice(0, 3), 'from', 'to', 'mode');

  it('finds the segment that starts at or before x and ends after it', () => {
    expect(pctSegmentAt(segments, 0)?.state).toBe('off');
    expect(pctSegmentAt(segments, 9.99)?.state).toBe('off');
    expect(pctSegmentAt(segments, 10)?.state).toBe('heating');
    expect(pctSegmentAt(segments, 25)?.state).toBe('standby');
  });

  it('reads the last end as the segment that ends there, and nothing beyond or before', () => {
    expect(pctSegmentAt(segments, 30)?.state).toBe('standby');
    expect(pctSegmentAt(segments, 30.001)).toBeNull();
    expect(pctSegmentAt(segments, -0.001)).toBeNull();
    expect(pctSegmentAt([], 0)).toBeNull();
    // a hole between segments is nothing, though a segment ends at its start
    const holed = pctSegmentsOf(
      [
        { from: 0, to: 10, mode: 'a' },
        { from: 20, to: 30, mode: 'b' },
      ],
      'from',
      'to',
      'mode',
    );
    expect(pctSegmentAt(holed, 10)?.state).toBe('a');
    expect(pctSegmentAt(holed, 15)).toBeNull();
  });
});

describe('pctSegmentTotals', () => {
  const segments = pctSegmentsOf(
    [
      { from: 0, to: 10, mode: 'off' },
      { from: 10, to: 20, mode: 'heating' },
      { from: 20, to: 30, mode: 'off' },
      { from: 30, to: 32, mode: 'defrost' },
    ],
    'from',
    'to',
    'mode',
  );

  it('sums each state’s time inside the window, cut to it, in the order the states are first met', () => {
    expect([...pctSegmentTotals(segments, { from: 0, to: 32 })]).toEqual([
      ['off', 20],
      ['heating', 10],
      ['defrost', 2],
    ]);
    expect([...pctSegmentTotals(segments, { from: 5, to: 25 })]).toEqual([
      ['off', 10],
      ['heating', 10],
    ]);
  });

  it('leaves out a state no segment of the window holds, and a segment that only touches it', () => {
    expect([...pctSegmentTotals(segments, { from: 30, to: 40 })]).toEqual([
      ['defrost', 2],
    ]);
    expect([...pctSegmentTotals(segments, { from: 32, to: 40 })]).toEqual([]);
    expect([...pctSegmentTotals(segments, { from: 20, to: 20 })]).toEqual([]);
  });
});
