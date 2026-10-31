import {
  type PctArbitrary,
  pctForAll,
  pctInt,
  pctOneOf,
  pctRecord,
} from '../../../testing/src/property.testkit';
import { PctLineHeights, pctWindow, pctWindowScroll } from './window';

/**
 * The window, swept: what holds for every list of measured and unmeasured lines, wherever the
 * frame stands — the space adds up to the whole, the window lies inside the list, and every
 * line the view meets is drawn, and no line further than the overscan from one. Heights are
 * fractional, as rows are, and the tree adds them in another order than a walk does, so the
 * sums are compared to a millionth of a pixel.
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

/** The tree of a list's heights, the measured ones written. */
function treeOf(
  heights: readonly (number | undefined)[],
  estimate: number,
): PctLineHeights {
  const tree = new PctLineHeights(heights.length, estimate);
  heights.forEach((height, i) => {
    if (height !== undefined) tree.set(i, height);
  });
  return tree;
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
        heights: treeOf(heights, estimate),
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
      expect(w.lead).toBeCloseTo(lead, 6);
      expect(w.tail).toBeCloseTo(tail, 6);
      expect(w.lead + drawn + w.tail).toBeCloseTo(w.total, 6);
      expect(w.space).toBe(w.total);
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
        heights: treeOf(heights, estimate),
        scrollTop,
        viewport,
        overscan,
      });
      let whole = 0;
      heights.forEach((h) => (whole += h ?? estimate));
      const top = Math.max(0, Math.min(scrollTop, whole - viewport));
      // Met for certain, a millionth of a pixel inside the view, and met at all, as far out.
      const met: number[] = [];
      const near: number[] = [];
      let y = 0;
      heights.forEach((h, i) => {
        const next = y + (h ?? estimate);
        if (y < top + viewport - 1e-6 && next > top + 1e-6) met.push(i);
        if (y < top + viewport + 1e-6 && next > top - 1e-6) near.push(i);
        y = next;
      });
      for (const i of met) expect(i >= w.start && i < w.end).toBe(true);
      if (near.length > 0) {
        expect(w.start).toBeGreaterThanOrEqual(Math.max(0, near[0] - overscan));
        expect(w.end).toBeLessThanOrEqual(near[near.length - 1] + 1 + overscan);
      }
    });
  });
});

/** Lists taller than their limit: a limit of a few lines, the view under it. */
const scaled = pctRecord({
  heights: listOf(pctOneOf([undefined, 0, 12, 36.4, 137] as const), 60),
  estimate: pctOneOf([1, 36, 36.4] as const),
  scrollTop: pctInt(-50, 3000),
  viewport: pctInt(0, 200),
  overscan: pctInt(0, 4),
  limit: pctInt(200, 800),
});

describe('pctWindow past the limit, over every list', () => {
  it('adds up to the space, never past the limit, and leaves no space negative', () => {
    pctForAll(scaled, ({ heights, estimate, limit, ...rest }) => {
      const tree = treeOf(heights, estimate);
      const w = pctWindow({ ...rest, heights: tree, limit });
      const drawn = tree.offsetOf(w.end) - tree.offsetOf(w.start);
      expect(w.space).toBe(Math.min(w.total, limit));
      expect(w.lead).toBeGreaterThanOrEqual(0);
      expect(w.tail).toBeGreaterThanOrEqual(0);
      if (drawn <= w.space)
        expect(w.lead + drawn + w.tail).toBeCloseTo(w.space, 6);
      if (heights.length > 0) expect(w.end).toBeGreaterThan(w.start);
    });
  });

  it('scrolls to a line that the window then has under the view’s top, within a line', () => {
    pctForAll(scaled, ({ heights, estimate, limit, scrollTop, ...rest }) => {
      if (heights.length === 0) return;
      const tree = treeOf(heights, estimate);
      const index = Math.min(heights.length - 1, Math.abs(scrollTop) % 60);
      const top = pctWindowScroll({
        ...rest,
        heights: tree,
        limit,
        scrollTop,
        index,
        align: 'start',
      });
      const space = Math.min(tree.total, limit);
      expect(top).toBeGreaterThanOrEqual(0);
      expect(top).toBeLessThanOrEqual(
        Math.max(0, space - Math.max(0, rest.viewport)) + 1e-6,
      );
      const w = pctWindow({ ...rest, heights: tree, limit, scrollTop: top });
      const view = Math.max(0, rest.viewport);
      // A line the last full view cannot bring to its top stands lower in it, but still in it.
      if (tree.offsetOf(index) <= tree.total - view) {
        const under = tree.indexAt(
          (top * (tree.total - view)) / Math.max(1e-9, space - view),
        );
        // The line asked for starts within the line the view's top maps to, its ends included.
        if (space < tree.total && space > view) {
          const start = tree.offsetOf(index);
          expect(start).toBeGreaterThanOrEqual(tree.offsetOf(under) - 1e-6);
          expect(start).toBeLessThanOrEqual(tree.offsetOf(under + 1) + 1e-6);
        }
      }
      // A line with a height is drawn, or a rounding away from the view: it ends where the
      // view starts, or, in a view of no height, starts where it ends.
      if (tree.heightOf(index) > 0) {
        expect(index).toBeGreaterThanOrEqual(w.start - 1);
        expect(index).toBeLessThan(w.end + (view === 0 ? 1 : 0));
      }
    });
  });
});
