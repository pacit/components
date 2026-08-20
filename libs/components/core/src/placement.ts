import type { ConnectedPosition } from '@angular/cdk/overlay';

/**
 * Which side of its anchor a panel opens on — **logical, not physical**: `start` and `end`
 * are the sides the writing direction decides, exactly as `padding-inline-start` is
 * (`req-token-logical`). A panel placed at `end` stands to the right of an English control
 * and to the left of an Arabic one, and nothing in a template has to say so twice.
 */
export type PctPlacement = 'top' | 'bottom' | 'start' | 'end';

/**
 * The writing direction a placement resolves against — the CONTROL's, read at the moment of
 * opening (`PctOverlayInherited.direction`), never `document.dir`. A panel lives outside the
 * host tree, so the page's direction is the one thing it would inherit and the one thing that
 * is wrong for a control inside an `<div dir="rtl">` section of an otherwise English page.
 */
export type PctDirection = 'ltr' | 'rtl';

/** The four sides, as the CDK writes them, before an offset is put on them. */
const SIDES: Record<PctPlacement, ConnectedPosition> = {
  top: {
    originX: 'center',
    originY: 'top',
    overlayX: 'center',
    overlayY: 'bottom',
  },
  bottom: {
    originX: 'center',
    originY: 'bottom',
    overlayX: 'center',
    overlayY: 'top',
  },
  start: {
    originX: 'start',
    originY: 'center',
    overlayX: 'end',
    overlayY: 'center',
  },
  end: {
    originX: 'end',
    originY: 'center',
    overlayX: 'start',
    overlayY: 'center',
  },
};

/** The side a panel falls back to first: the one across the anchor, then the other axis. */
const FALLBACKS: Record<PctPlacement, readonly PctPlacement[]> = {
  top: ['bottom', 'end', 'start'],
  bottom: ['top', 'end', 'start'],
  start: ['end', 'bottom', 'top'],
  end: ['start', 'bottom', 'top'],
};

/**
 * The gap between the anchor and the panel, as a pair of CDK offsets.
 *
 * The block axis needs no thought — a panel above sits `-offset` up, one below `+offset` down.
 * The inline axis does: **`offsetX` is physical while `start`/`end` are not**. The dependency
 * resolves the BOX by direction (`overlayX: 'start'` is the right edge in a right-to-left
 * overlay) and then adds `offsetX` as plain pixels, so the same number that opens a gap in an
 * English page closes one — and lays the panel over the control it belongs to — in an Arabic
 * one. The sign is flipped here, once, rather than in every component that opens a panel.
 */
function withOffset(
  side: PctPlacement,
  offset: number,
  direction: PctDirection,
): ConnectedPosition {
  const position = SIDES[side];
  if (side === 'top') return { ...position, offsetY: -offset };
  if (side === 'bottom') return { ...position, offsetY: offset };
  const away = side === 'end' ? offset : -offset;
  return { ...position, offsetX: direction === 'rtl' ? -away : away };
}

/**
 * The list a connected overlay is positioned by: the side that was asked for, then the ones it
 * may fall back to when the window has no room for it.
 *
 * Positioning is deliberately **not** part of `pctOverlay` — which way a panel drops is a
 * property of a role, and a listbox under a combobox has no use for any of this. What made it
 * shared is two roles arriving at once: a tooltip and a popover both take a side from the
 * author and both have to survive an edge of the window, and the second consumer is the moment
 * to extract rather than the moment to copy (`lesson-21`).
 *
 * The order is the whole content of the list: the CDK takes the first position the panel fits
 * in, so the fallbacks say what "no room" is worth. Across the anchor first — a tooltip asked
 * for `top` and shown below is still a tooltip about the same control — and only then the
 * other axis, which moves the panel to a side the author did not choose but the window has.
 *
 * @example
 * positionStrategy.withPositions(pctPlacementPositions('top', 8, 'rtl'))
 */
export function pctPlacementPositions(
  placement: PctPlacement,
  offset: number,
  direction: PctDirection = 'ltr',
): ConnectedPosition[] {
  return [placement, ...FALLBACKS[placement]].map((side) =>
    withOffset(side, offset, direction),
  );
}
