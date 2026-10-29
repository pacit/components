import {
  type PctArbitrary,
  pctForAll,
  pctInt,
  pctOneOf,
  pctRecord,
} from '../../../testing/src/property.testkit';
import { pctWindow } from './window';

/**
 * The window, swept: what holds for every list of measured and unmeasured lines, wherever the
 * frame stands — the space adds up to the whole, the window lies inside the list, and every
 * line the view meets is drawn. Heights are whole pixels, so the sums are exact.
 */
function listOf<T>(
  item: PctArbitrary<T>,
  max: number,
): PctArbitrary<readonly T[]> {
  return {
    sample: (random) =>
      Array.from({ length: Math.floor(random() * (max + 1)) }, () =>
        item.sample(random),
      ),
    shrink: (value) => value.map((_, i) => value.filter((__, j) => j !== i)),
    show: (value) => `[${value.map(item.show).join(', ')}]`,
  };
}

const cases = pctRecord({
  heights: listOf(pctOneOf([undefined, 0, 12, 36, 137] as const), 40),
  estimate: pctInt(1, 60),
  scrollTop: pctInt(-50, 3000),
  viewport: pctInt(0, 400),
  overscan: pctInt(0, 4),
});

describe('pctWindow over every list', () => {
  it('adds lead, the drawn lines and tail up to the total, and stays inside the list', () => {
    pctForAll(cases, ({ heights, estimate, scrollTop, viewport, overscan }) => {
      const height = (i: number) => heights[i] ?? estimate;
      const w = pctWindow({
        count: heights.length,
        heightOf: (i) => heights[i],
        estimate,
        scrollTop,
        viewport,
        overscan,
      });
      let total = 0;
      let lead = 0;
      let drawn = 0;
      heights.forEach((_, i) => {
        total += height(i);
        if (i < w.start) lead += height(i);
        else if (i < w.end) drawn += height(i);
      });
      expect(w.total).toBe(total);
      expect(w.lead).toBe(lead);
      expect(w.lead + drawn + w.tail).toBe(w.total);
      expect(0 <= w.start && w.start <= w.end && w.end <= heights.length).toBe(
        true,
      );
      if (heights.length > 0) expect(w.end).toBeGreaterThan(w.start);
    });
  });

  it('draws every line the view meets', () => {
    pctForAll(cases, ({ heights, estimate, scrollTop, viewport, overscan }) => {
      const w = pctWindow({
        count: heights.length,
        heightOf: (i) => heights[i],
        estimate,
        scrollTop,
        viewport,
        overscan,
      });
      const top = Math.max(0, scrollTop);
      let y = 0;
      heights.forEach((h, i) => {
        const next = y + (h ?? estimate);
        if (y < top + viewport && next > top) {
          expect(i >= w.start && i < w.end).toBe(true);
        }
        y = next;
      });
    });
  });
});
