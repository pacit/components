import {
  pctArcPath,
  pctArcPoint,
  pctFoldOthers,
  pctGaugeAngle,
  pctPieLabels,
  pctSlices,
} from './arc';

const TURN = 2 * Math.PI;

describe('pctSlices', () => {
  it('gives each value its share of the turn in order, from the start given', () => {
    const slices = pctSlices([50, 30, 20], 1);
    expect(slices.map((s) => s.share)).toEqual([0.5, 0.3, 0.2]);
    expect(slices[0].start).toBe(1);
    expect(slices[0].end).toBeCloseTo(1 + TURN / 2, 12);
    expect(slices[1].start).toBe(slices[0].end);
    expect(slices[2].end).toBeCloseTo(1 + TURN, 12);
  });

  it('starts at twelve by default, and gives a value that is not positive and finite no angle', () => {
    const slices = pctSlices([2, 0, -1, NaN, Infinity, 2]);
    expect(slices[0].start).toBe(0);
    expect(slices.map((s) => s.share)).toEqual([0.5, 0, 0, 0, 0, 0.5]);
    expect(slices[1].start).toBe(slices[1].end);
    expect(slices[4].end).toBe(slices[5].start);
  });

  it('has no slices where no value is positive', () => {
    expect(pctSlices([0, -3, NaN])).toEqual([]);
    expect(pctSlices([])).toEqual([]);
  });
});

describe('pctFoldOthers', () => {
  it('keeps the largest values and folds the rest, each list in the order given', () => {
    expect(pctFoldOthers([5, 1, 9, 2, 7], 2)).toEqual({
      kept: [2, 4],
      folded: [0, 1, 3],
    });
  });

  it('folds nothing where the rest would be one value, or none', () => {
    expect(pctFoldOthers([5, 1, 9], 2)).toEqual({
      kept: [0, 1, 2],
      folded: [],
    });
    expect(pctFoldOthers([5, 1], 2)).toEqual({ kept: [0, 1], folded: [] });
    expect(pctFoldOthers([5, 1, 9, 2], 2).folded).toEqual([1, 3]);
  });

  it('keeps everything for a most that is no count, and folds all but one for zero', () => {
    expect(pctFoldOthers([5, 1, 9], NaN).folded).toEqual([]);
    expect(pctFoldOthers([5, 1, 9], -1).folded).toEqual([]);
    expect(pctFoldOthers([5, 1, 9], Infinity).folded).toEqual([]);
    expect(pctFoldOthers([5, 1, 9], 0)).toEqual({
      kept: [],
      folded: [0, 1, 2],
    });
  });
});

describe('pctArcPoint', () => {
  it('reads an angle clockwise from twelve', () => {
    expect(pctArcPoint(10, 20, 5, 0)).toEqual({ x: 10, y: 15 });
    const quarter = pctArcPoint(10, 20, 5, Math.PI / 2);
    expect(quarter.x).toBeCloseTo(15, 12);
    expect(quarter.y).toBeCloseTo(20, 12);
    const half = pctArcPoint(10, 20, 5, Math.PI);
    expect(half.x).toBeCloseTo(10, 12);
    expect(half.y).toBeCloseTo(25, 12);
  });
});

describe('pctArcPath', () => {
  it('draws a wedge from the middle, the large flag past a half turn', () => {
    expect(pctArcPath(100, 100, 50, 0, 0, Math.PI / 2)).toBe(
      'M 100 100 L 100 50 A 50 50 0 0 1 150 100 Z',
    );
    expect(pctArcPath(100, 100, 50, 0, 0, 1.5 * Math.PI)).toBe(
      'M 100 100 L 100 50 A 50 50 0 1 1 50 100 Z',
    );
  });

  it("draws a ring's sector between the two radii, back along the inner arc", () => {
    expect(pctArcPath(100, 100, 50, 25, 0, Math.PI / 2)).toBe(
      'M 100 50 A 50 50 0 0 1 150 100 L 125 100 A 25 25 0 0 0 100 75 Z',
    );
  });

  it('draws a whole turn as two half arcs, and a ring of a whole turn with a hole', () => {
    expect(pctArcPath(100, 100, 50, 0, 0, TURN)).toBe(
      'M 100 50 A 50 50 0 0 1 100 150 A 50 50 0 0 1 100 50 Z',
    );
    expect(pctArcPath(100, 100, 50, 25, 0, TURN + 1)).toBe(
      'M 100 50 A 50 50 0 0 1 100 150 A 50 50 0 0 1 100 50 L 100 75 A 25 25 0 0 0 100 125 A 25 25 0 0 0 100 75 Z',
    );
  });

  it('draws nothing for no sweep, a sweep backwards, or no radius', () => {
    expect(pctArcPath(100, 100, 50, 0, 1, 1)).toBe('');
    expect(pctArcPath(100, 100, 50, 0, 1, 0.5)).toBe('');
    expect(pctArcPath(100, 100, 0, 0, 0, 1)).toBe('');
    expect(pctArcPath(100, 100, NaN, 0, 0, 1)).toBe('');
  });

  it('rounds the points to two decimals', () => {
    expect(pctArcPath(0, 0, 10, 0, 0, 1)).toBe(
      'M 0 0 L 0 -10 A 10 10 0 0 1 8.41 -5.4 Z',
    );
  });
});

describe('pctPieLabels', () => {
  const box = { width: 400, height: 300 };

  it('stands each label beside its slice on the side it faces, with a leader from the rim through an elbow', () => {
    const labels = pctPieLabels(
      [
        { angle: Math.PI / 2, width: 40 },
        { angle: 1.5 * Math.PI, width: 40 },
      ],
      200,
      150,
      100,
      12,
      20,
      box,
    );
    expect(labels).toEqual([
      {
        index: 0,
        x: 318,
        y: 150,
        anchor: 'start',
        leader: [
          [300, 150],
          [312, 150],
          [318, 150],
        ],
      },
      {
        index: 1,
        x: 82,
        y: 150,
        anchor: 'end',
        leader: [
          [100, 150],
          [88, 150],
          [82, 150],
        ],
      },
    ]);
  });

  it('moves a label that would cover the one above it down a line, and bends its leader to it', () => {
    const labels = pctPieLabels(
      [
        { angle: 0.1, width: 40 },
        { angle: 0.12, width: 40 },
        { angle: 0.14, width: 40 },
      ],
      200,
      150,
      100,
      12,
      20,
      box,
    );
    const ys = labels.map((l) => l.y);
    expect(ys[0]).toBeCloseTo(38.56, 2);
    expect(ys[1]).toBeCloseTo(58.56, 2);
    expect(ys[2]).toBeCloseTo(78.56, 2);
    expect(labels[1].leader[1]).toEqual([213.41, 38.81]);
    expect(labels[1].leader[2][1]).toBeCloseTo(58.56, 2);
  });

  it('drops a label that would leave the box, below, above or beside, and reads an angle past a turn', () => {
    const labels = pctPieLabels(
      [
        { angle: 0, width: 40 },
        { angle: Math.PI, width: 40 },
        { angle: Math.PI / 2, width: 100 },
        { angle: TURN + 1.5 * Math.PI, width: 40 },
      ],
      200,
      150,
      140,
      12,
      20,
      box,
    );
    expect(labels.map((l) => l.index)).toEqual([3]);
    expect(labels[0].anchor).toBe('end');
  });

  it('keeps a label exactly at the edge', () => {
    const labels = pctPieLabels(
      [
        { angle: Math.PI / 2, width: 82 },
        { angle: 1.5 * Math.PI, width: 82 },
      ],
      200,
      150,
      100,
      12,
      20,
      box,
    );
    expect(labels).toHaveLength(2);
    expect(
      pctPieLabels(
        [{ angle: Math.PI / 2, width: 82.01 }],
        200,
        150,
        100,
        12,
        20,
        box,
      ),
    ).toEqual([]);
  });

  it('comes back in the order asked, whichever side each stands on', () => {
    const labels = pctPieLabels(
      [
        { angle: 1.5 * Math.PI, width: 10 },
        { angle: Math.PI / 2, width: 10 },
      ],
      200,
      150,
      100,
      12,
      20,
      box,
    );
    expect(labels.map((l) => l.index)).toEqual([0, 1]);
  });
});

describe('pctGaugeAngle', () => {
  it('runs from the left end at the minimum to the right at the maximum, held at the ends', () => {
    expect(pctGaugeAngle(0, 0, 100, 4)).toBe(-2);
    expect(pctGaugeAngle(50, 0, 100, 4)).toBe(0);
    expect(pctGaugeAngle(100, 0, 100, 4)).toBe(2);
    expect(pctGaugeAngle(150, 0, 100, 4)).toBe(2);
    expect(pctGaugeAngle(-5, 0, 100, 4)).toBe(-2);
    expect(pctGaugeAngle(25, 0, 100, 4)).toBe(-1);
  });

  it('stands at the left end on a range of no span', () => {
    expect(pctGaugeAngle(5, 10, 10, 4)).toBe(-2);
    expect(pctGaugeAngle(5, 10, 0, 4)).toBe(-2);
  });
});
