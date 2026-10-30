import { pctAggregate } from './aggregate';

describe('pctAggregate', () => {
  const values = [12, null, 30, Number.NaN, undefined, 3];

  it('sums, averages and finds the least and the greatest of the numbers, the empty left out', () => {
    expect(pctAggregate(values, 'sum')).toBe(45);
    expect(pctAggregate(values, 'avg')).toBe(15);
    expect(pctAggregate(values, 'min')).toBe(3);
    expect(pctAggregate(values, 'max')).toBe(30);
    expect(pctAggregate([-2, -7, -1], 'max')).toBe(-1);
    expect(pctAggregate([5, 2, 9], 'min')).toBe(2);
  });

  it('counts the values that are not empty, of any type', () => {
    expect(pctAggregate(values, 'count')).toBe(3);
    expect(pctAggregate(['a', null, 'b', ''], 'count')).toBe(3);
    expect(pctAggregate([], 'count')).toBe(0);
  });

  it('answers no number with nothing, not with zero', () => {
    for (const kind of ['sum', 'avg', 'min', 'max'] as const) {
      expect(pctAggregate([], kind)).toBeNull();
      expect(pctAggregate([null, 'a', true], kind)).toBeNull();
    }
    expect(pctAggregate([0, 0], 'sum')).toBe(0);
  });

  it('hands a function the values that are not empty', () => {
    const seen: unknown[] = [];
    expect(
      pctAggregate(['x', null, 'y'], (present) => {
        seen.push(present);
        return present.join('+');
      }),
    ).toBe('x+y');
    expect(seen).toEqual([['x', 'y']]);
  });

  it('reads a hundred thousand values without a spread', () => {
    const many = Array.from({ length: 100_000 }, (_, i) => i);
    expect(pctAggregate(many, 'max')).toBe(99_999);
    expect(pctAggregate(many, 'min')).toBe(0);
  });
});
