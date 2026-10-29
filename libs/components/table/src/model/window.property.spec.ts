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
 * line the view meets is drawn, and no line further than the overscan from one. Heights are
 * fractional, as rows are, so the sums are compared as the window adds them.
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
  heights: listOf(pctOneOf([undefined, 0, 12, 36.4, 35.59, 137] as const), 40),
  estimate: pctOneOf([0, 1, 36, 36.4] as const),
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
      let lead = 0;
      let drawn = 0;
      let tail = 0;
      heights.forEach((_, i) => {
        if (i < w.start) lead += height(i);
        else if (i < w.end) drawn += height(i);
        else tail += height(i);
      });
      expect(w.lead).toBe(lead);
      expect(w.tail).toBe(tail);
      expect(w.lead + drawn + w.tail).toBe(w.total);
      expect(w.tail).toBeGreaterThanOrEqual(0);
      expect(0 <= w.start && w.start <= w.end && w.end <= heights.length).toBe(
        true,
      );
      if (heights.length > 0) expect(w.end).toBeGreaterThan(w.start);
    });
  });

  it('draws every line the view meets, and nothing past the overscan around them', () => {
    pctForAll(cases, ({ heights, estimate, scrollTop, viewport, overscan }) => {
      const w = pctWindow({
        count: heights.length,
        heightOf: (i) => heights[i],
        estimate,
        scrollTop,
        viewport,
        overscan,
      });
      let whole = 0;
      heights.forEach((h) => (whole += h ?? estimate));
      const top = Math.max(0, Math.min(scrollTop, whole - viewport));
      const met: number[] = [];
      let y = 0;
      heights.forEach((h, i) => {
        const next = y + (h ?? estimate);
        if (y < top + viewport && next > top) met.push(i);
        y = next;
      });
      for (const i of met) expect(i >= w.start && i < w.end).toBe(true);
      if (met.length > 0) {
        expect(w.start).toBeGreaterThanOrEqual(Math.max(0, met[0] - overscan));
        expect(w.end).toBeLessThanOrEqual(met[met.length - 1] + 1 + overscan);
      }
    });
  });
});
