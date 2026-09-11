import type { ConnectedPosition } from '@angular/cdk/overlay';
import {
  pctDecimal,
  pctForAll,
  pctInt,
  pctOneOf,
  pctRecord,
} from '../../testing/src/property.testkit';
import {
  pctPlacementPositions,
  type PctDirection,
  type PctPlacement,
} from './placement';

/**
 * `pctPlacementPositions` under a property sweep: the laws a caller may lean on, over all four
 * sides, a whole range of gaps and both writing directions at once.
 *
 * `core.spec.ts` already measures this helper, and measures it by example — `('top', 8)` opens
 * upwards, `('end', 8, 'rtl')` turns its sign over, `('top', 8)` falls back downwards first.
 * Those are the cases the helper was written for; four sides times two directions times
 * whatever number a component happens to pass is the space around them, and nothing has looked
 * at it. What is swept here is that space: no side goes missing or is offered twice, the four
 * arrive in the documented order down to the last two, a gap keeps its size on whichever side
 * it lands, the direction reaches the inline axis and nothing else, and the list a caller is
 * handed is the caller's own.
 *
 * Each law is deliberately PARTIAL. Size, sign and origin are three sweeps rather than one
 * `offsetY === -offset`, because a property that writes the implementation's line back out is
 * green for the reason the line is green, and a mutant that breaks the two of them together
 * survives both (`req-quality-unit`). Three partial laws that no single edit satisfies are
 * worth more than one that is the code again.
 *
 * That standard turned on this file and took two sweeps out of it — a box that does not answer
 * to the gap, and the offset argument's oddness — because both had become theorems of the laws
 * they sit next to rather than statements about the helper: with `|own| = |gap|` and the
 * monotone sign already fixed, a mirrored gap has nowhere left to go, and no single edit of
 * `placement.ts` can move a gap or a direction into a box that never mentions either. What
 * bought their place back is the ORDER of the last two fallbacks: swap the last two entries of
 * any `FALLBACKS` row and every other assertion here stays green.
 */

/** The four sides, plainest first: `pctOneOf` shrinks a failure towards the head of the list. */
const PLACEMENTS: readonly PctPlacement[] = ['top', 'bottom', 'start', 'end'];

/** The side across the anchor — the documented first fallback, and its own inverse. */
const ACROSS: Record<PctPlacement, PctPlacement> = {
  top: 'bottom',
  bottom: 'top',
  start: 'end',
  end: 'start',
};

/**
 * The two sides that lie the way their axis grows: down the block axis, towards the end edge of
 * the inline one. Both cross-axis fallbacks are one of these — which is the pair the third
 * position has to come from, whichever side was asked for.
 */
const ALONG_GROWTH: readonly PctPlacement[] = ['bottom', 'end'];

/** The edge that faces a given one: a panel hangs its bottom on the anchor's top. */
const FACING_X = { start: 'end', center: 'center', end: 'start' } as const;
const FACING_Y = { top: 'bottom', center: 'center', bottom: 'top' } as const;

/**
 * Which side a position stands on, read back out of the anchor rather than taken from where it
 * sits in the list. A list that names the right sides in the wrong order and one that names the
 * wrong sides are two different failures, and only a decoder tells them apart.
 */
function sideOf(position: ConnectedPosition): PctPlacement | undefined {
  if (position.originY === 'top') return 'top';
  if (position.originY === 'bottom') return 'bottom';
  if (position.originX === 'start') return 'start';
  if (position.originX === 'end') return 'end';
  return undefined;
}

/** Whether a side is one of the block axis — the axis `offsetY` moves along. */
const isBlock = (side: PctPlacement | undefined) =>
  side === 'top' || side === 'bottom';

/**
 * `+ 0` turns the negative zero a `-offset` of `0` produces into the zero it means: `toBe` asks
 * `Object.is`, and `Object.is(-0, 0)` is false. The distinction is the assertion's, not the
 * dependency's — the CDK adds these numbers to a rectangle, where the two zeroes agree.
 */
const zeroless = (value: number | undefined) =>
  value === undefined ? undefined : value + 0;

const negated = (gap: number | undefined) =>
  gap === undefined ? undefined : zeroless(-gap);

/** A side, a gap and a direction — the whole of what the helper is given. */
const anyCall = pctRecord({
  placement: pctOneOf<PctPlacement>(PLACEMENTS),
  // Fractions of a pixel, not whole ones: the parameter is a `number`, and a component that
  // subtracts a border width from a configured gap passes exactly this. It is not decoration —
  // put a `Math.round` around either offset in `placement.ts` and the size law below fails on
  // its first case with the gap drawn here, while 320 integer cases let it through.
  offset: pctDecimal(-40, 40, 2),
  direction: pctOneOf<PctDirection>(['ltr', 'rtl']),
});

/**
 * The same without the direction, for the laws that compare the two directions themselves. The
 * gap stays whole here: those laws relate two calls made with the SAME number and so say
 * nothing about the number itself, and integers are what keep an exact `0` gap anywhere in the
 * file — one of `pctDecimal(-40, 40, 2)`'s eight thousand values is zero.
 */
const anySideAndGap = pctRecord({
  placement: pctOneOf<PctPlacement>(PLACEMENTS),
  offset: pctInt(-40, 40),
});

/** A pure function, so a case costs nothing but the call — the count is a floor on confidence. */
const RUNS = 320;

describe('pctPlacementPositions', () => {
  /**
   * The fallback list is what the CDK has to work with when the window runs out: the first
   * position it fits, or the last one if none fits. A side offered twice is therefore a side
   * that silently eats another's turn, and a missing side is room the panel will never be
   * moved into. A list of the wrong length fails the same assertion — `toEqual` on arrays
   * compares the length before the elements — so the count is not asserted twice.
   */
  it('offers each of the four sides exactly once, whichever one was asked for', () => {
    pctForAll(
      anyCall,
      ({ placement, offset, direction }) => {
        const sides = pctPlacementPositions(placement, offset, direction).map(
          sideOf,
        );

        expect([...sides].sort()).toEqual(['bottom', 'end', 'start', 'top']);
      },
      { runs: RUNS },
    );
  });

  /**
   * The order is the whole content of the list. A tooltip asked for `top` and shown below is
   * still a tooltip about the same control; one shown at its side has moved to an axis nobody
   * chose, and that is the later resort.
   *
   * The third assertion is the one the rest of the suite cannot reach. Four distinct sides with
   * this axis's pair in front leaves positions 2 and 3 holding the other axis's pair in ONE of
   * two orders, and nothing above chooses between them: swap the last two entries of any
   * `FALLBACKS` row and every other property here stays green. `core.spec.ts` pins the order
   * for `top` alone, so three of those four rows answer to this line or to nothing.
   */
  it('opens on the side it was asked for, crosses the anchor, then changes axis the way it grows', () => {
    pctForAll(
      anyCall,
      ({ placement, offset, direction }) => {
        const positions = pctPlacementPositions(placement, offset, direction);

        expect(sideOf(positions[0])).toBe(placement);
        expect(sideOf(positions[1])).toBe(ACROSS[placement]);
        expect(ALONG_GROWTH).toContain(sideOf(positions[2]));
      },
      { runs: RUNS },
    );
  });

  /**
   * A gap is one number and the panel sits on one axis, so exactly one of the two offsets may
   * carry it — and it has to carry the whole of it. A gap that arrives on the cross axis does
   * not open a gap at all: it slides the panel along the control it points at. An offset that
   * went missing altogether fails the size assertion too, `Math.abs(Number(undefined))` being
   * `NaN`, so its presence is not asserted separately.
   */
  it('spends the gap on the axis the panel sits on, in full, and leaves the other axis empty', () => {
    pctForAll(
      anyCall,
      ({ placement, offset, direction }) => {
        for (const position of pctPlacementPositions(
          placement,
          offset,
          direction,
        )) {
          const block = isBlock(sideOf(position));
          const own = block ? position.offsetY : position.offsetX;
          const cross = block ? position.offsetX : position.offsetY;

          expect(Math.abs(Number(own))).toBe(Math.abs(offset));
          expect(cross).toBeUndefined();
        }
      },
      { runs: RUNS },
    );
  });

  /**
   * What fixes the SIGN, without writing `-offset` back out: a bigger number is a wider gap,
   * and a wider gap stands the panel further off the anchor rather than deeper into it. Stated
   * over `ltr` alone on purpose — the direction law below is what carries it to `rtl`, and a
   * sweep that restates a law it already has adds runs and no confidence.
   */
  it('a wider gap stands the panel further off the anchor, never nearer', () => {
    pctForAll(
      pctRecord({
        placement: pctOneOf<PctPlacement>(PLACEMENTS),
        offset: pctInt(-40, 40),
        widen: pctInt(1, 40),
      }),
      ({ placement, offset, widen }) => {
        const near = pctPlacementPositions(placement, offset, 'ltr');
        const far = pctPlacementPositions(placement, offset + widen, 'ltr');

        near.forEach((position, index) => {
          const side = sideOf(position);
          const from = Number(position.offsetY ?? position.offsetX);
          const to = Number(far[index].offsetY ?? far[index].offsetX);

          // `bottom` and `end` lie the way the axes grow; `top` and `start` lie against them.
          if (side === 'bottom' || side === 'end')
            expect(to).toBeGreaterThan(from);
          else expect(to).toBeLessThan(from);
        });
      },
      { runs: RUNS },
    );
  });

  /**
   * The one thing here a screenshot of an English page would never catch. `start` and `end` are
   * resolved by the dependency against the writing direction and `offsetX` is not — it is added
   * afterwards as plain pixels, so the sign has to turn over here. What must NOT turn over is
   * everything else: not the order of the list, not the boxes, and not one block-axis gap,
   * because a page read right to left is still read top to bottom. All three travel in the
   * whole-object comparison — it holds the anchor edges the sides are read out of — so there is
   * no second assertion about the order.
   */
  it('the writing direction reaches the inline gap and nothing else', () => {
    pctForAll(
      anySideAndGap,
      ({ placement, offset }) => {
        const ltr = pctPlacementPositions(placement, offset, 'ltr');
        const rtl = pctPlacementPositions(placement, offset, 'rtl');

        ltr.forEach((position, index) => {
          const mirror = rtl[index];

          // Everything but the inline gap, compared whole: `toEqual` reads an `undefined`
          // property as an absent one, so blanking `offsetX` on both sides leaves the boxes
          // and the block gap facing each other.
          expect({ ...mirror, offsetX: undefined }).toEqual({
            ...position,
            offsetX: undefined,
          });
          expect(zeroless(mirror.offsetX)).toBe(negated(position.offsetX));
        });
      },
      { runs: RUNS },
    );
  });

  /**
   * A panel hangs the edge that FACES the one it is anchored to — its bottom on the anchor's
   * top — or it overlaps the control it belongs to. The other axis is centred on both sides:
   * one axis does the anchoring, and a position that pinned both would be a corner, which is
   * not one of the four sides this helper offers.
   */
  it('hangs the facing edge on the anchor, and centres what it does not hang', () => {
    pctForAll(
      anyCall,
      ({ placement, offset, direction }) => {
        for (const position of pctPlacementPositions(
          placement,
          offset,
          direction,
        )) {
          expect(position.overlayX).toBe(FACING_X[position.originX]);
          expect(position.overlayY).toBe(FACING_Y[position.originY]);
          expect(
            [position.originX, position.originY].filter(
              (edge) => edge === 'center',
            ),
          ).toHaveLength(1);
        }
      },
      { runs: RUNS },
    );
  });

  /**
   * The list belongs to whoever asked for it. A tooltip, a menu and a popover each hand these
   * objects straight to a CDK position strategy that keeps them for its own lifetime, and all
   * three call this one helper — so a position that was a view onto a module constant would let
   * one role's gap follow another's, the next time either opened. Nothing else here says the
   * objects are fresh: `Object.assign(position, { offsetY: -offset })` in place of the spread
   * hands out the shared side itself, and the properties above that call the helper twice catch
   * that only sideways, when the second call's write turns up in the first call's result.
   *
   * The same two calls carry the other half of the sentence — the same arguments, the same
   * answer — which every repeated call in this file has been assuming without stating.
   */
  it('answers the same twice, and hands each caller its own objects', () => {
    pctForAll(
      anyCall,
      ({ placement, offset, direction }) => {
        const mine = pctPlacementPositions(placement, offset, direction);
        const yours = pctPlacementPositions(placement, offset, direction);

        expect(yours).toEqual(mine);
        mine.forEach((position, index) => {
          expect(yours[index]).not.toBe(position);
        });
      },
      { runs: RUNS },
    );
  });

  /**
   * The default is a promise too: every call that names no direction — and the controls that
   * open a panel before a direction is read are exactly those — has to get the left-to-right
   * list, not a third behaviour of its own.
   */
  it('reads an unnamed direction as a left-to-right one', () => {
    pctForAll(
      anySideAndGap,
      ({ placement, offset }) => {
        expect(pctPlacementPositions(placement, offset)).toEqual(
          pctPlacementPositions(placement, offset, 'ltr'),
        );
      },
      { runs: RUNS },
    );
  });
});
