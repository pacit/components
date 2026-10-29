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
  readonly v: number | null | undefined;
  readonly w: number;
}

function rowsOf(max: number): PctArbitrary<readonly Row[]> {
  const value = pctOneOf([
    null,
    undefined,
    Number.NaN,
    -Infinity,
    1,
    2,
    Infinity,
  ] as const);
  const second = pctOneOf([1, 2] as const);
  return {
    sample: (random) =>
      Array.from({ length: Math.floor(random() * (max + 1)) }, (_, id) => ({
        id,
        v: value.sample(random),
        w: second.sample(random),
      })),
    shrink: (rows) => rows.map((_, i) => rows.filter((__, j) => j !== i)),
    show: (rows) => `[${rows.map((r) => `${r.id}:${r.v}/${r.w}`).join(', ')}]`,
  };
}

const col = pctColumnsOf<Row>();
const v = col.key('v', { header: 'V' });
const w = col.key('w', { header: 'W' });
/** NaN, null and undefined are the empty values; every other value has a size. */
const empty = (x: number | null | undefined) =>
  x === null || x === undefined || Number.isNaN(x);
const collator = new Intl.Collator('en');
const cases = pctRecord({
  rows: rowsOf(30),
  direction: pctOneOf(['ascending', 'descending'] as const),
});

describe('pctOrderRows over every list', () => {
  it('is a stable permutation, in the keys’ order, with the empty values last', () => {
    pctForAll(cases, ({ rows, direction }) => {
      const out = pctOrderRows(
        rows,
        [
          { column: v, direction },
          { column: w, direction: 'ascending' },
        ],
        collator,
      );
      expect([...out].map((r) => r.id).sort((x, y) => x - y)).toEqual(
        rows.map((r) => r.id),
      );
      const sign = direction === 'ascending' ? 1 : -1;
      for (let i = 1; i < out.length; i++) {
        const [a, b] = [out[i - 1], out[i]];
        // The first key: empty values last, the rest in its direction.
        if (empty(a.v)) {
          expect(empty(b.v)).toBe(true);
        } else if (!empty(b.v)) {
          expect(
            sign * Math.sign((a.v as number) - (b.v as number) || 0),
          ).toBeLessThanOrEqual(0);
        }
        // Tied on the first key: the second decides, then the order they came in.
        const tied = (empty(a.v) && empty(b.v)) || a.v === b.v;
        if (tied) {
          expect(a.w).toBeLessThanOrEqual(b.w);
          if (a.w === b.w) expect(a.id).toBeLessThan(b.id);
        }
      }
    });
  });
});
