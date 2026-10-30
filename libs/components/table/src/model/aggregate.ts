import { pctIsEmptyValue } from './order';

/**
 * How a column sums up a set of rows: the sum, the mean, the least or the greatest of its
 * numbers, how many values it holds, or a function of the values.
 *
 * @since next
 */
export type PctAggregate<V> =
  | 'sum'
  | 'avg'
  | 'min'
  | 'max'
  | 'count'
  | ((values: readonly NonNullable<V>[]) => unknown);

/**
 * A column's values summed up: by a function, which is handed the values that are not empty;
 * by `count`, how many of them there are; by the four others, over the numbers among them,
 * `null` when there is none — no reading is not a reading of zero.
 *
 * @example
 * pctAggregate([12, null, 30], 'sum'); // 42
 * pctAggregate([12, null, 30], 'count'); // 2
 *
 * @since next
 */
export function pctAggregate<V>(
  values: readonly V[],
  aggregate: PctAggregate<V>,
): unknown {
  const present = values.filter(
    (value) => !pctIsEmptyValue(value),
  ) as NonNullable<V>[];
  if (typeof aggregate === 'function') return aggregate(present);
  if (aggregate === 'count') return present.length;
  const numbers = present.filter(
    (value): value is NonNullable<V> & number => typeof value === 'number',
  );
  if (numbers.length === 0) return null;
  // A reduce and not `Math.min(...numbers)`: a spread of a hundred thousand arguments
  // overflows the stack.
  if (aggregate === 'min')
    return numbers.reduce((least, value) => (value < least ? value : least));
  if (aggregate === 'max')
    return numbers.reduce((most, value) => (value > most ? value : most));
  const sum = numbers.reduce((total, value) => total + value, 0);
  return aggregate === 'sum' ? sum : sum / numbers.length;
}
