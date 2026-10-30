/**
 * A note's box before it is placed: the point it marks, in pixels of the plot, the size of its
 * text box, and where it would rather stand. `auto` takes the first side with room, above
 * first.
 *
 * @since next
 */
export interface PctNoteBox {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly prefer: 'above' | 'below' | 'auto';
}

/**
 * Where a note's box stands: its left and top in pixels, and the side of its point it took.
 *
 * @since next
 */
export interface PctPlacedNote {
  readonly id: string;
  readonly left: number;
  readonly top: number;
  readonly side: 'above' | 'below';
}

/**
 * The box of the plot the notes stay inside.
 *
 * @since next
 */
export interface PctNoteFrame {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

interface Rect {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

const overlaps = (a: Rect, b: Rect): boolean =>
  a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;

/**
 * Where each note's box stands so that none covers another and every one stays inside the
 * frame: a box is centred on its point and set `gap` pixels over it or under it. A note that
 * prefers a side takes it when the side has room; `auto` takes the first side with room,
 * above first; a box that fits on neither side takes its preferred side (above for `auto`)
 * and is kept inside the frame, over whatever it covers. The notes are placed in the order
 * given, so an earlier note keeps its place and a later one moves.
 *
 * @example
 * pctPlaceNotes([{ id: 'a', x: 100, y: 80, width: 60, height: 20, prefer: 'auto' }], frame, 8);
 * // [{ id: 'a', left: 70, top: 52, side: 'above' }]
 *
 * @since next
 */
export function pctPlaceNotes(
  boxes: readonly PctNoteBox[],
  frame: PctNoteFrame,
  gap: number,
): readonly PctPlacedNote[] {
  const placed: Rect[] = [];
  return boxes.map((box) => {
    const left = Math.min(
      Math.max(frame.left, box.x - box.width / 2),
      frame.right - box.width,
    );
    const at = (side: 'above' | 'below'): Rect => {
      const top = side === 'above' ? box.y - gap - box.height : box.y + gap;
      return { left, top, right: left + box.width, bottom: top + box.height };
    };
    const fits = (rect: Rect): boolean =>
      rect.top >= frame.top &&
      rect.bottom <= frame.bottom &&
      !placed.some((other) => overlaps(rect, other));
    const order: readonly ('above' | 'below')[] =
      box.prefer === 'below' ? ['below', 'above'] : ['above', 'below'];
    const side = order.find((s) => fits(at(s))) ?? order[0];
    const rect = at(side);
    // Kept inside the frame when nothing fit: pushed down from its top or up from its bottom.
    const top = Math.min(
      Math.max(frame.top, rect.top),
      frame.bottom - box.height,
    );
    const taken = { ...rect, top, bottom: top + box.height };
    placed.push(taken);
    return { id: box.id, left, top, side };
  });
}
