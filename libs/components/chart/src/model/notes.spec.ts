import { pctPlaceNotes, type PctNoteBox } from './notes';

const frame = { left: 0, top: 0, right: 400, bottom: 200 };
const box = (over: Partial<PctNoteBox> = {}): PctNoteBox => ({
  id: 'a',
  x: 100,
  y: 80,
  width: 60,
  height: 20,
  prefer: 'auto',
  ...over,
});

describe('pctPlaceNotes', () => {
  it('centres a box on its point and sets it the gap over the point', () => {
    expect(pctPlaceNotes([box()], frame, 8)).toEqual([
      { id: 'a', left: 70, top: 52, side: 'above' },
    ]);
  });

  it('keeps a box inside the frame sideways, at either edge', () => {
    expect(pctPlaceNotes([box({ x: 10 })], frame, 8)[0].left).toBe(0);
    expect(pctPlaceNotes([box({ x: 390 })], frame, 8)[0].left).toBe(340);
    // a box exactly at the edge stays
    expect(pctPlaceNotes([box({ x: 30 })], frame, 8)[0].left).toBe(0);
    expect(pctPlaceNotes([box({ x: 370 })], frame, 8)[0].left).toBe(340);
  });

  it('goes under the point where there is no room over it, and over it where asked below has none', () => {
    // 27 over the top: 27 - 8 - 20 = -1, a pixel short
    expect(pctPlaceNotes([box({ y: 27 })], frame, 8)[0]).toEqual({
      id: 'a',
      left: 70,
      top: 35,
      side: 'below',
    });
    // 28 fits exactly
    expect(pctPlaceNotes([box({ y: 28 })], frame, 8)[0]).toEqual({
      id: 'a',
      left: 70,
      top: 0,
      side: 'above',
    });
    // asked below, 172 is the last that fits (172 + 8 + 20 = 200); 173 goes over
    expect(
      pctPlaceNotes([box({ y: 172, prefer: 'below' })], frame, 8)[0],
    ).toEqual({ id: 'a', left: 70, top: 180, side: 'below' });
    expect(
      pctPlaceNotes([box({ y: 173, prefer: 'below' })], frame, 8)[0],
    ).toEqual({ id: 'a', left: 70, top: 145, side: 'above' });
  });

  it('takes the preferred side when it has room, whatever auto would have taken', () => {
    expect(pctPlaceNotes([box({ prefer: 'below' })], frame, 8)[0].side).toBe(
      'below',
    );
    expect(pctPlaceNotes([box({ prefer: 'above' })], frame, 8)[0].side).toBe(
      'above',
    );
  });

  it('moves a later note under its point when an earlier one covers the place over it, and no further than that', () => {
    const [first, second, third] = pctPlaceNotes(
      [box({ id: 'a' }), box({ id: 'b', x: 120 }), box({ id: 'c', x: 140 })],
      frame,
      8,
    );
    expect(first).toEqual({ id: 'a', left: 70, top: 52, side: 'above' });
    expect(second).toEqual({ id: 'b', left: 90, top: 88, side: 'below' });
    // the third fits on neither side: it takes the first side, over whatever it covers
    expect(third).toEqual({ id: 'c', left: 110, top: 52, side: 'above' });
    // a box that only touches another is no overlap
    const touching = pctPlaceNotes(
      [box({ id: 'a' }), box({ id: 'b', x: 160 })],
      frame,
      8,
    );
    expect(touching[1]).toEqual({ id: 'b', left: 130, top: 52, side: 'above' });
    // a box of the same height one pixel lower overlaps
    const lower = pctPlaceNotes(
      [box({ id: 'a' }), box({ id: 'b', x: 159, y: 81 })],
      frame,
      8,
    );
    expect(lower[1].side).toBe('below');
    // touching from the other side, from below and from above is no overlap either
    const left = pctPlaceNotes(
      [box({ id: 'a' }), box({ id: 'b', x: 40 })],
      frame,
      8,
    );
    expect(left[1]).toEqual({ id: 'b', left: 10, top: 52, side: 'above' });
    const under = pctPlaceNotes(
      [box({ id: 'a' }), box({ id: 'b', y: 100 })],
      frame,
      8,
    );
    expect(under[1]).toEqual({ id: 'b', left: 70, top: 72, side: 'above' });
    const over = pctPlaceNotes(
      [box({ id: 'a' }), box({ id: 'b', y: 60 })],
      frame,
      8,
    );
    expect(over[1]).toEqual({ id: 'b', left: 70, top: 32, side: 'above' });
    // and a pixel in on each of those sides overlaps
    expect(
      pctPlaceNotes([box({ id: 'a' }), box({ id: 'b', x: 41 })], frame, 8)[1]
        .side,
    ).toBe('below');
    expect(
      pctPlaceNotes([box({ id: 'a' }), box({ id: 'b', y: 99 })], frame, 8)[1]
        .side,
    ).toBe('below');
    expect(
      pctPlaceNotes([box({ id: 'a' }), box({ id: 'b', y: 64 })], frame, 8)[1]
        .side,
    ).toBe('below');
  });

  it('pushes a box that fits on neither side back inside the frame', () => {
    const small = { left: 0, top: 0, right: 400, bottom: 30 };
    // over: 20 - 8 - 20 = -8; under: 28 + 20 = 48 > 30; above is taken and clamped to the top
    expect(pctPlaceNotes([box({ y: 20 })], small, 8)[0]).toEqual({
      id: 'a',
      left: 70,
      top: 0,
      side: 'above',
    });
    // asked below in a frame too short: the box is set over, and pulled up to the bottom
    expect(
      pctPlaceNotes([box({ y: 20, prefer: 'below' })], small, 8)[0],
    ).toEqual({ id: 'a', left: 70, top: 10, side: 'below' });
  });

  it('places nothing from nothing', () => {
    expect(pctPlaceNotes([], frame, 8)).toEqual([]);
  });
});
