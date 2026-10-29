import {
  type PctArbitrary,
  pctForAll,
  pctOneOf,
  pctRecord,
} from '../../../testing/src/property.testkit';
import { pctColumnsOf } from './columns';
import { pctOrderRows } from './order';

/**
 * The order, swept over rows with ties and empty values: it is a permutation, the rows come
 * in the key's order with the empty ones last, and rows the key finds equal keep the order
 * they came in.
 */
interface Row {
  readonly id: number;
  readonly v: number | null;
}

function rowsOf(max: number): PctArbitrary<readonly Row[]> {
  const value = pctOneOf([null, 1, 2, 3] as const);
  return {
    sample: (random) =>
      Array.from({ length: Math.floor(random() * (max + 1)) }, (_, id) => ({
        id,
        v: value.sample(random),
      })),
    shrink: (rows) => rows.map((_, i) => rows.filter((__, j) => j !== i)),
    show: (rows) => `[${rows.map((r) => `${r.id}:${r.v}`).join(', ')}]`,
  };
}

const col = pctColumnsOf<Row>();
const v = col.key('v', { header: 'V' });
const collator = new Intl.Collator('en');
const cases = pctRecord({
  rows: rowsOf(30),
  direction: pctOneOf(['ascending', 'descending'] as const),
});

describe('pctOrderRows over every list', () => {
  it('is a stable permutation, in the key’s order, with the empty values last', () => {
    pctForAll(cases, ({ rows, direction }) => {
      const out = pctOrderRows(rows, [{ column: v, direction }], collator);
      expect([...out].map((r) => r.id).sort((x, y) => x - y)).toEqual(
        rows.map((r) => r.id),
      );
      const sign = direction === 'ascending' ? 1 : -1;
      for (let i = 1; i < out.length; i++) {
        const [a, b] = [out[i - 1], out[i]];
        if (a.v === null) {
          expect(b.v).toBe(null);
          expect(a.id).toBeLessThan(b.id);
        } else if (b.v !== null) {
          expect(sign * (a.v - b.v)).toBeLessThanOrEqual(0);
          if (a.v === b.v) expect(a.id).toBeLessThan(b.id);
        }
      }
    });
  });
});
