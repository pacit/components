import { pctBrushDrag, pctBrushEdgeAt, pctBrushGrip } from './brush';
import {
  pctDecimal,
  pctForAll,
  pctRecord,
} from '../../../testing/src/property.testkit';

const w = (from: number, to: number) => ({ from, to });
const LIMITS = w(0, 100);

describe('pctBrushGrip', () => {
  it('takes an edge within the distance, on both sides of it and at its end', () => {
    expect(pctBrushGrip(100, 100, 300, 12)).toBe('from');
    expect(pctBrushGrip(88, 100, 300, 12)).toBe('from');
    expect(pctBrushGrip(112, 100, 300, 12)).toBe('from');
    expect(pctBrushGrip(87.9, 100, 300, 12)).toBe('outside');
    expect(pctBrushGrip(112.1, 100, 300, 12)).toBe('inside');
    expect(pctBrushGrip(288, 100, 300, 12)).toBe('to');
    expect(pctBrushGrip(312, 100, 300, 12)).toBe('to');
    expect(pctBrushGrip(312.1, 100, 300, 12)).toBe('outside');
  });

  it('takes the nearer edge where both are near, and the start on a tie', () => {
    expect(pctBrushGrip(104, 100, 110, 12)).toBe('from');
    expect(pctBrushGrip(106, 100, 110, 12)).toBe('to');
    expect(pctBrushGrip(105, 100, 110, 12)).toBe('from');
    expect(pctBrushGrip(100, 100, 100, 12)).toBe('from');
  });

  it('is inside strictly between the edges, and outside past either', () => {
    expect(pctBrushGrip(200, 100, 300, 12)).toBe('inside');
    expect(pctBrushGrip(50, 100, 300, 12)).toBe('outside');
    expect(pctBrushGrip(350, 100, 300, 12)).toBe('outside');
    // with no distance at all, an edge itself is the edge and a hair past it is not
    expect(pctBrushGrip(100, 100, 300, 0)).toBe('from');
    expect(pctBrushGrip(300, 100, 300, 0)).toBe('to');
    expect(pctBrushGrip(100.5, 100, 300, 0)).toBe('inside');
    expect(pctBrushGrip(99.5, 100, 300, 0)).toBe('outside');
    expect(pctBrushGrip(300.5, 100, 300, 0)).toBe('outside');
  });
});

describe('pctBrushEdgeAt', () => {
  it('puts the edge where it is asked, inside the limits', () => {
    expect(pctBrushEdgeAt(w(10, 50), 'from', 30, LIMITS, 5)).toEqual(w(30, 50));
    expect(pctBrushEdgeAt(w(10, 50), 'to', 80, LIMITS, 5)).toEqual(w(10, 80));
  });

  it('stops an edge at the limit', () => {
    expect(pctBrushEdgeAt(w(10, 50), 'from', -20, LIMITS, 5)).toEqual(w(0, 50));
    expect(pctBrushEdgeAt(w(10, 50), 'to', 120, LIMITS, 5)).toEqual(w(10, 100));
  });

  it('keeps the narrowest span from the other edge, exactly at it and short of it', () => {
    expect(pctBrushEdgeAt(w(10, 50), 'from', 45, LIMITS, 5)).toEqual(w(45, 50));
    expect(pctBrushEdgeAt(w(10, 50), 'from', 46, LIMITS, 5)).toEqual(w(45, 50));
    expect(pctBrushEdgeAt(w(10, 50), 'from', 70, LIMITS, 5)).toEqual(w(45, 50));
    expect(pctBrushEdgeAt(w(10, 50), 'to', 15, LIMITS, 5)).toEqual(w(10, 15));
    expect(pctBrushEdgeAt(w(10, 50), 'to', 14, LIMITS, 5)).toEqual(w(10, 15));
    expect(pctBrushEdgeAt(w(10, 50), 'to', 2, LIMITS, 5)).toEqual(w(10, 15));
  });

  it('brings an other edge outside the limits back in, and keeps the span from it', () => {
    expect(pctBrushEdgeAt(w(10, 300), 'from', 30, LIMITS, 5)).toEqual(
      w(30, 100),
    );
    expect(pctBrushEdgeAt(w(10, 300), 'from', 99, LIMITS, 5)).toEqual(
      w(95, 100),
    );
    expect(pctBrushEdgeAt(w(-50, 50), 'to', 80, LIMITS, 5)).toEqual(w(0, 80));
    expect(pctBrushEdgeAt(w(-50, 50), 'to', 1, LIMITS, 5)).toEqual(w(0, 5));
    // an other edge at the far limit leaves the span's room inside
    expect(pctBrushEdgeAt(w(10, 2), 'from', 0, LIMITS, 5)).toEqual(w(0, 5));
    expect(pctBrushEdgeAt(w(98, 50), 'to', 100, LIMITS, 5)).toEqual(w(95, 100));
  });

  it('takes the limits whole when the narrowest span is wider than they are', () => {
    expect(pctBrushEdgeAt(w(2, 8), 'from', 4, w(0, 10), 50)).toEqual(w(0, 10));
    expect(pctBrushEdgeAt(w(2, 8), 'to', 4, w(0, 10), 50)).toEqual(w(0, 10));
    // the limits' span, wherever they start
    expect(pctBrushEdgeAt(w(52, 58), 'from', 54, w(50, 60), 50)).toEqual(
      w(50, 60),
    );
  });
});

describe('pctBrushDrag', () => {
  it('draws a new selection between the press and the pointer, either way', () => {
    expect(pctBrushDrag('outside', LIMITS, 40, 70, LIMITS, 1)).toEqual(
      w(40, 70),
    );
    expect(pctBrushDrag('outside', LIMITS, 70, 40, LIMITS, 1)).toEqual(
      w(40, 70),
    );
  });

  it('holds a new selection inside the limits', () => {
    expect(pctBrushDrag('outside', LIMITS, 40, 140, LIMITS, 1)).toEqual(
      w(40, 100),
    );
    expect(pctBrushDrag('outside', LIMITS, 140, 40, LIMITS, 1)).toEqual(
      w(40, 100),
    );
    expect(pctBrushDrag('outside', LIMITS, -10, 40, LIMITS, 1)).toEqual(
      w(0, 40),
    );
    expect(pctBrushDrag('outside', LIMITS, 40, -10, LIMITS, 1)).toEqual(
      w(0, 40),
    );
  });

  it('widens a short drag to the narrowest span past the end the pointer drags', () => {
    expect(pctBrushDrag('outside', LIMITS, 50, 51, LIMITS, 5)).toEqual(
      w(50, 55),
    );
    expect(pctBrushDrag('outside', LIMITS, 50, 49, LIMITS, 5)).toEqual(
      w(45, 50),
    );
    expect(pctBrushDrag('outside', LIMITS, 50, 50, LIMITS, 5)).toEqual(
      w(50, 55),
    );
    // against a limit, the anchor gives way instead
    expect(pctBrushDrag('outside', LIMITS, 99, 99.5, LIMITS, 5)).toEqual(
      w(95, 100),
    );
    expect(pctBrushDrag('outside', LIMITS, 1, 0.5, LIMITS, 5)).toEqual(w(0, 5));
  });

  it('moves the selection whole from inside, and stops it at a limit with its span', () => {
    expect(pctBrushDrag('inside', w(20, 40), 30, 50, LIMITS, 1)).toEqual(
      w(40, 60),
    );
    expect(pctBrushDrag('inside', w(20, 40), 30, 20, LIMITS, 1)).toEqual(
      w(10, 30),
    );
    expect(pctBrushDrag('inside', w(20, 40), 30, 90, LIMITS, 1)).toEqual(
      w(80, 100),
    );
    expect(pctBrushDrag('inside', w(20, 40), 30, -40, LIMITS, 1)).toEqual(
      w(0, 20),
    );
  });

  it('moves one edge from an edge, as the edge alone would', () => {
    expect(pctBrushDrag('from', w(20, 40), 20, 30, LIMITS, 5)).toEqual(
      w(30, 40),
    );
    expect(pctBrushDrag('from', w(20, 40), 20, 39, LIMITS, 5)).toEqual(
      w(35, 40),
    );
    expect(pctBrushDrag('to', w(20, 40), 40, 70, LIMITS, 5)).toEqual(w(20, 70));
    expect(pctBrushDrag('to', w(20, 40), 40, 21, LIMITS, 5)).toEqual(w(20, 25));
  });

  it('always lands inside the limits, in order, and no narrower than the narrowest span', () => {
    pctForAll(
      pctRecord({
        grip: pctDecimal(0, 3.99, 2),
        a: pctDecimal(-50, 150, 2),
        b: pctDecimal(-50, 150, 2),
        start: pctDecimal(0, 90, 2),
        span: pctDecimal(1, 10, 2),
        minSpan: pctDecimal(0, 20, 2),
      }),
      ({ grip, a, b, start, span, minSpan }) => {
        const kind = (['from', 'to', 'inside', 'outside'] as const)[
          Math.floor(grip)
        ];
        const out = pctBrushDrag(
          kind,
          w(start, start + span),
          a,
          b,
          LIMITS,
          minSpan,
        );
        expect(out.from).toBeGreaterThanOrEqual(LIMITS.from);
        expect(out.to).toBeLessThanOrEqual(LIMITS.to);
        expect(out.from).toBeLessThanOrEqual(out.to);
        if (kind !== 'inside')
          expect(out.to - out.from).toBeGreaterThanOrEqual(
            Math.min(minSpan, 100) - 1e-9,
          );
      },
    );
  });
});
