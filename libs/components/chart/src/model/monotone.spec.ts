import { pctHermite, pctMonotoneTangents } from './monotone';

const tangents = (xs: readonly number[], ys: readonly number[]) => [
  ...pctMonotoneTangents(xs, ys),
];

describe('pctMonotoneTangents', () => {
  it('takes zero where the neighbouring slopes disagree in sign, so a peak stays a peak', () => {
    // Slopes 1, 0, -1: both interior tangents meet a zero slope; the ends take one and a half.
    expect(tangents([0, 1, 2, 3], [0, 1, 1, 0])).toEqual([1.5, 0, 0, -1.5]);
  });

  it('averages the neighbouring slopes by their widths and clips to the smaller, twice at most', () => {
    // Slopes 1 and 2, equal widths: the mean is 1.5, half of it 0.75, under the smaller slope.
    expect(tangents([0, 1, 2], [0, 1, 3])).toEqual([0.75, 1.5, 2.25]);
    // Slopes 1 and 9: the clip is the smaller slope, and the tangent is twice it.
    expect(tangents([0, 1, 2], [0, 1, 10])).toEqual([0.5, 2, 12.5]);
    // Unequal widths weigh the longer segment's slope less.
    const [, middle] = tangents([0, 1, 4], [0, 1, 4]);
    expect(middle).toBeCloseTo(
      2 * Math.min(1, 1, (0.5 * (1 * 3 + 1 * 1)) / 4),
      12,
    );
  });

  it('gives two readings their slope at both ends, and fewer no tangent', () => {
    expect(tangents([0, 2], [1, 5])).toEqual([2, 2]);
    expect(tangents([0, 2], [1, -5])).toEqual([-3, -3]);
    expect(tangents([3], [1])).toEqual([0]);
    expect(tangents([], [])).toEqual([]);
  });

  it('keeps a falling end falling: the end tangent has the slope’s sign', () => {
    const m = tangents([0, 1, 2, 3], [10, 8, 7, 0]);
    expect(m[0]).toBeLessThan(0);
    expect(m[3]).toBeLessThan(0);
    // A flat end stays flat.
    expect(tangents([0, 1, 2], [1, 1, 5])).toEqual([0, 0, 6]);
  });

  it('reads a range of the columns as a run of its own', () => {
    const xs = [-5, 0, 1, 2, 3, 9];
    const ys = [100, 0, 1, 1, 0, -100];
    expect([...pctMonotoneTangents(xs, ys, 1, 5)]).toEqual([1.5, 0, 0, -1.5]);
    expect([...pctMonotoneTangents(xs, ys, 2, 3)]).toEqual([0]);
  });
});

describe('pctHermite', () => {
  it('passes through both readings', () => {
    expect(pctHermite(0, 0, 0.75, 1, 1, 1.5, 0)).toBe(0);
    expect(pctHermite(0, 0, 0.75, 1, 1, 1.5, 1)).toBe(1);
  });

  it('bends by the tangents between them', () => {
    expect(pctHermite(0, 0, 0.75, 1, 1, 1.5, 0.5)).toBe(0.40625);
    // Tangents equal to the slope: a straight line.
    expect(pctHermite(0, 0, 1, 2, 2, 1, 1)).toBe(1);
    expect(pctHermite(0, 0, 1, 2, 2, 1, 0.5)).toBe(0.5);
  });

  it('scales the tangents by the width of the span', () => {
    // The same tangents over a span twice as wide bend twice as far from the chord.
    const narrow = pctHermite(0, 0, 2, 1, 0, 2, 0.5);
    const wide = pctHermite(0, 0, 2, 2, 0, 2, 1);
    expect(wide).toBe(2 * narrow);
    expect(narrow).toBe(0);
    expect(pctHermite(0, 0, 2, 1, 0, -2, 0.5)).toBe(0.5);
  });
});
