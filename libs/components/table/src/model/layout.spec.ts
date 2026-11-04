import { pctColumnsOf } from './columns';
import {
  pctCanMoveColumn,
  pctClampWidth,
  pctColumnWidthBounds,
  pctGroupPath,
  pctHideColumn,
  pctMoveColumn,
  pctPinColumn,
  pctPlaceColumns,
  pctResizeColumn,
  type PctTableLayout,
} from './layout';

interface Device {
  readonly name: string;
  readonly room: string;
  readonly power: number;
  readonly on: boolean;
}

const col = pctColumnsOf<Device>();
const columns = col.of([
  col.key('name', { header: 'Name', minWidth: 120 }),
  col.key('room', { header: 'Room', width: 150 }),
  col.key('power', { header: 'Power' }),
  col.key('on', { header: 'On' }),
]);

/** The ids as a layout places them, a hidden one marked with a `-`, a pinned one with its edge. */
const ids = (layout: unknown) =>
  pctPlaceColumns(columns, layout as PctTableLayout).map(
    (one) =>
      `${one.hidden ? '-' : ''}${one.column.id}${one.pin ? `@${one.pin}` : ''}`,
  );

describe('pctPlaceColumns', () => {
  it('places the columns as given with no layout, each at its own width or a share', () => {
    expect(ids({})).toEqual(['name', 'room', 'power', 'on']);
    expect(
      pctPlaceColumns(columns, {}).map(({ index, width }) => [index, width]),
    ).toEqual([
      [0, null],
      [1, 150],
      [2, null],
      [3, null],
    ]);
  });

  it('follows the order, and puts a column it does not name at its own place', () => {
    expect(ids({ order: ['on', 'power', 'room', 'name'] })).toEqual([
      'on',
      'power',
      'room',
      'name',
    ]);
    // `room` is new since the layout was saved: it stands second, as in `columns`.
    expect(ids({ order: ['on', 'power', 'name'] })).toEqual([
      'on',
      'room',
      'power',
      'name',
    ]);
    // A column past the end of a short order goes to the end.
    expect(ids({ order: ['power'] })).toEqual(['name', 'room', 'power', 'on']);
    expect(ids({ order: ['on'] })).toEqual(['name', 'room', 'power', 'on']);
  });

  it('passes over an id of no column, a twin and a value that is not an id', () => {
    expect(ids({ order: ['gone', 'on', 7, 'on', null, 'name'] })).toEqual([
      'on',
      'room',
      'power',
      'name',
    ]);
  });

  it('reads a field of the wrong shape as missing, and a layout that is no object as none', () => {
    for (const layout of [
      null,
      undefined,
      'on',
      7,
      [],
      { order: 'on' },
      { order: { 0: 'on' } },
      { hidden: 'on' },
      { pinned: ['on'] },
      { pinned: { start: 'on' } },
      { pinned: null },
    ])
      expect(ids(layout)).toEqual(['name', 'room', 'power', 'on']);
  });

  it('puts the start edge first and the end edge last, each in the order', () => {
    expect(
      ids({
        order: ['on', 'power', 'room', 'name'],
        pinned: { start: ['name', 'power'], end: ['on'] },
      }),
    ).toEqual(['power@start', 'name@start', 'room', 'on@end']);
  });

  it('pins a column named on both edges to the start', () => {
    expect(ids({ pinned: { start: ['room'], end: ['room', 'name'] } })).toEqual(
      ['room@start', 'power', 'on', 'name@end'],
    );
  });

  it('keeps a hidden column in its place, marked hidden, pin and all', () => {
    expect(
      ids({ hidden: ['room', 'gone', 3], pinned: { end: ['room'] } }),
    ).toEqual(['name', 'power', 'on', '-room@end']);
  });

  it('hides none when a layout would hide every column, and hides those it names otherwise', () => {
    expect(ids({ hidden: ['name', 'room', 'power', 'on'] })).toEqual([
      'name',
      'room',
      'power',
      'on',
    ]);
    expect(ids({ hidden: ['name', 'room', 'power'] })).toEqual([
      '-name',
      '-room',
      '-power',
      'on',
    ]);
  });

  it("takes a layout's width over the column's, within the column's bounds", () => {
    const widths = (layout: unknown) =>
      pctPlaceColumns(columns, layout as PctTableLayout).map(
        (one) => one.width,
      );
    expect(widths({ widths: { name: 200, room: 130.4, power: 1 } })).toEqual([
      200,
      130,
      120,
      null,
    ]);
    // `name` may be no narrower than its 120 px, nor any column wider than 2000.
    expect(widths({ widths: { name: 100, on: 5000 } })).toEqual([
      120,
      150,
      null,
      2000,
    ]);
    expect(widths({ widths: { name: 119, room: 120, power: 121 } })).toEqual([
      120,
      120,
      121,
      null,
    ]);
    // A width that is no width leaves the column its own.
    for (const width of [0, -10, Number.NaN, Infinity, '200', null])
      expect(widths({ widths: { room: width, power: width } })).toEqual([
        null,
        150,
        null,
        null,
      ]);
    expect(widths({ widths: 'wide' })).toEqual([null, 150, null, null]);
    expect(widths({ widths: null })).toEqual([null, 150, null, null]);
  });

  it("reads a column's own width only when it is one", () => {
    const own = col.of([
      col.key('name', { header: 'Name', width: 0 }),
      col.key('room', { header: 'Room', width: -1 }),
      col.key('power', { header: 'Power', width: 40 }),
    ]);
    expect(pctPlaceColumns(own, {}).map((one) => one.width)).toEqual([
      null,
      null,
      120,
    ]);
  });
});

describe('pctColumnWidthBounds and pctClampWidth', () => {
  it('bounds a column by its minWidth, or 120 px, and 2000 px', () => {
    expect(pctColumnWidthBounds(columns[0])).toEqual({ min: 120, max: 2000 });
    expect(pctColumnWidthBounds(columns[1])).toEqual({ min: 120, max: 2000 });
  });

  it('reads a minWidth that is no width, or one past the widest, as none', () => {
    for (const minWidth of [0, -5, 2001, Number.NaN])
      expect(
        pctColumnWidthBounds(col.key('name', { header: 'Name', minWidth })),
      ).toEqual({ min: 120, max: 2000 });
    expect(
      pctColumnWidthBounds(col.key('name', { header: 'Name', minWidth: 2000 })),
    ).toEqual({ min: 2000, max: 2000 });
  });

  it('rounds a width to the pixel within its bounds', () => {
    expect(pctClampWidth(columns[1], 150.5)).toBe(151);
    expect(pctClampWidth(columns[1], 120)).toBe(120);
    expect(pctClampWidth(columns[1], 119)).toBe(120);
    expect(pctClampWidth(columns[1], 2000)).toBe(2000);
    expect(pctClampWidth(columns[1], 2001)).toBe(2000);
  });
});

describe('pctMoveColumn', () => {
  it('moves a column one place towards either end, writing the whole order', () => {
    expect(pctMoveColumn(columns, {}, 'room', 1)).toEqual({
      order: ['name', 'power', 'room', 'on'],
    });
    expect(pctMoveColumn(columns, {}, 'room', -1)).toEqual({
      order: ['room', 'name', 'power', 'on'],
    });
  });

  it('keeps the rest of the layout as it was', () => {
    const layout = { widths: { name: 200 }, hidden: ['on' as const] };
    expect(pctMoveColumn(columns, layout, 'name', 1)).toEqual({
      ...layout,
      order: ['room', 'name', 'power', 'on'],
    });
  });

  it('gives the same layout back at either end, and for an id of no column', () => {
    const layout: PctTableLayout = { order: ['name', 'room', 'power', 'on'] };
    expect(pctMoveColumn(columns, layout, 'name', -1)).toBe(layout);
    expect(pctMoveColumn(columns, layout, 'on', 1)).toBe(layout);
    expect(pctMoveColumn(columns, layout, 'gone', 1)).toBe(layout);
  });

  it('steps over a hidden column, and moves past it when all are listed', () => {
    const layout: PctTableLayout = { hidden: ['room'] };
    expect(pctMoveColumn(columns, layout, 'name', 1).order).toEqual([
      'room',
      'power',
      'name',
      'on',
    ]);
    expect(pctMoveColumn(columns, layout, 'name', 1, 'all').order).toEqual([
      'room',
      'name',
      'power',
      'on',
    ]);
    expect(pctMoveColumn(columns, layout, 'power', -1).order).toEqual([
      'power',
      'name',
      'room',
      'on',
    ]);
    // The hidden column itself moves past the next one shown, from its own place.
    expect(pctMoveColumn(columns, layout, 'room', 1).order).toEqual([
      'name',
      'power',
      'room',
      'on',
    ]);
    expect(pctMoveColumn(columns, layout, 'room', -1).order).toEqual([
      'room',
      'name',
      'power',
      'on',
    ]);
  });

  it('moves a column along its own edge only', () => {
    const layout: PctTableLayout = {
      pinned: { start: ['name', 'room'], end: ['on'] },
    };
    expect(pctMoveColumn(columns, layout, 'room', -1).order).toEqual([
      'room',
      'name',
      'power',
      'on',
    ]);
    // The last of the start edge, the only unpinned column and the only one at the end.
    expect(pctMoveColumn(columns, layout, 'room', 1)).toBe(layout);
    expect(pctMoveColumn(columns, layout, 'power', -1)).toBe(layout);
    expect(pctMoveColumn(columns, layout, 'power', 1)).toBe(layout);
    expect(pctMoveColumn(columns, layout, 'on', -1)).toBe(layout);
  });

  it('says whether a column can move', () => {
    expect(pctCanMoveColumn(columns, {}, 'name', -1)).toBe(false);
    expect(pctCanMoveColumn(columns, {}, 'name', 1)).toBe(true);
    expect(pctCanMoveColumn(columns, { hidden: ['name'] }, 'room', -1)).toBe(
      false,
    );
    expect(
      pctCanMoveColumn(columns, { hidden: ['name'] }, 'room', -1, 'all'),
    ).toBe(true);
  });
});

describe('pctHideColumn', () => {
  it('hides a column once, and shows it again', () => {
    const layout: PctTableLayout = { widths: { name: 200 } };
    const hidden = pctHideColumn(layout, 'room', true);
    expect(hidden).toEqual({ widths: { name: 200 }, hidden: ['room'] });
    expect(pctHideColumn(hidden, 'room', true)).toEqual(hidden);
    expect(pctHideColumn(hidden, 'name', true).hidden).toEqual([
      'room',
      'name',
    ]);
    expect(pctHideColumn(hidden, 'room', false)).toEqual({
      widths: { name: 200 },
      hidden: [],
    });
  });

  it('reads a list of the wrong shape as empty', () => {
    expect(
      pctHideColumn({ hidden: 'room' } as unknown as PctTableLayout, 'on', true)
        .hidden,
    ).toEqual(['on']);
    // A member that is no id is dropped, and the rest kept.
    expect(
      pctHideColumn(
        { hidden: ['room', 3] } as unknown as PctTableLayout,
        'on',
        true,
      ).hidden,
    ).toEqual(['room', 'on']);
  });
});

describe('pctPinColumn', () => {
  it('pins a column to one edge, takes it off the other, and unpins it', () => {
    const start = pctPinColumn({ order: ['on'] }, 'room', 'start');
    expect(start).toEqual({
      order: ['on'],
      pinned: { start: ['room'], end: [] },
    });
    const end = pctPinColumn(start, 'room', 'end');
    expect(end.pinned).toEqual({ start: [], end: ['room'] });
    expect(pctPinColumn(end, 'name', 'end').pinned).toEqual({
      start: [],
      end: ['room', 'name'],
    });
    expect(pctPinColumn(end, 'room', null).pinned).toEqual({
      start: [],
      end: [],
    });
    // A pin to one edge keeps the other edge's columns.
    expect(
      pctPinColumn({ pinned: { start: ['name'] } }, 'room', 'end').pinned,
    ).toEqual({ start: ['name'], end: ['room'] });
  });

  it('reads edges of the wrong shape as empty', () => {
    expect(
      pctPinColumn(
        { pinned: 'room' } as unknown as PctTableLayout,
        'on',
        'start',
      ).pinned,
    ).toEqual({ start: ['on'], end: [] });
  });
});

describe('pctResizeColumn', () => {
  it("sets a column's width, keeps the others' and takes one off", () => {
    const wide = pctResizeColumn({ hidden: ['on'] }, 'name', 200);
    expect(wide).toEqual({ hidden: ['on'], widths: { name: 200 } });
    const both = pctResizeColumn(wide, 'room', 90);
    expect(both.widths).toEqual({ name: 200, room: 90 });
    expect(pctResizeColumn(both, 'name', 240).widths).toEqual({
      name: 240,
      room: 90,
    });
    expect(pctResizeColumn(both, 'name', null).widths).toEqual({ room: 90 });
  });

  it('drops a width that is no number from widths of the wrong shape', () => {
    expect(
      pctResizeColumn(
        { widths: { room: '90', power: 70 } } as unknown as PctTableLayout,
        'on',
        100,
      ).widths,
    ).toEqual({ power: 70, on: 100 });
    for (const widths of [null, 'wide'])
      expect(
        pctResizeColumn({ widths } as unknown as PctTableLayout, 'on', 100)
          .widths,
      ).toEqual({ on: 100 });
  });
});

describe('header groups', () => {
  interface Reading {
    readonly name: string;
    readonly now: number;
    readonly peak: number;
    readonly today: number;
    readonly month: number;
    readonly fee: number;
    readonly room: string;
  }
  const reading = pctColumnsOf<Reading>();
  // Two groups, one of two levels, between two columns of none.
  const grouped = reading.of([
    reading.key('name', { header: 'Name' }),
    reading.key('now', { header: 'Now', group: 'Power' }),
    reading.key('peak', { header: 'Peak', group: 'Power' }),
    reading.key('today', { header: 'Today', group: 'Cost/Spent' }),
    reading.key('month', { header: 'Month', group: 'Cost/Spent' }),
    reading.key('fee', { header: 'Fee', group: 'Cost/Fixed' }),
    reading.key('room', { header: 'Room' }),
  ]);
  const laid = (layout: unknown) =>
    pctPlaceColumns(grouped, layout as PctTableLayout).map(
      (one) =>
        `${one.hidden ? '-' : ''}${one.column.id}${one.pin ? `@${one.pin}` : ''}`,
    );
  const moved = (
    layout: PctTableLayout<keyof Reading>,
    id: keyof Reading,
    step: -1 | 1,
    among: 'shown' | 'all' = 'shown',
  ) => pctMoveColumn(grouped, layout, id, step, among).order;

  it('reads the levels of a group, the outermost first, passing a blank one over', () => {
    expect(pctGroupPath(grouped[0])).toEqual([]);
    expect(pctGroupPath(grouped[1])).toEqual(['Power']);
    expect(pctGroupPath(grouped[3])).toEqual(['Cost', 'Spent']);
    expect(
      pctGroupPath(reading.key('now', { header: 'Now', group: ' A / /B ' })),
    ).toEqual(['A', 'B']);
    expect(
      pctGroupPath(reading.key('now', { header: 'Now', group: '/' })),
    ).toEqual([]);
  });

  it('gathers a group a stored order split, at its first column, a level inside its level', () => {
    expect(laid({})).toEqual([
      'name',
      'now',
      'peak',
      'today',
      'month',
      'fee',
      'room',
    ]);
    expect(laid({ order: ['now', 'name', 'peak', 'room'] })).toEqual([
      'now',
      'peak',
      'name',
      'today',
      'month',
      'fee',
      'room',
    ]);
    // `Cost` gathers at `fee`, and `Spent` inside it at `today`; the columns not named
    // stand at their own places first.
    expect(laid({ order: ['fee', 'room', 'today', 'name', 'month'] })).toEqual([
      'fee',
      'today',
      'month',
      'now',
      'peak',
      'room',
      'name',
    ]);
    expect(laid({ order: ['month', 'fee', 'today'] })).toEqual([
      'name',
      'now',
      'peak',
      'month',
      'today',
      'fee',
      'room',
    ]);
    // Two groups interleaved: each gathers at its first column, the second's place moving
    // along as the first grows.
    expect(
      laid({
        order: ['now', 'today', 'peak', 'month', 'name', 'fee', 'room'],
      }),
    ).toEqual(['now', 'peak', 'today', 'month', 'fee', 'name', 'room']);
  });

  it('tells the levels apart by the slash: `a/bc` is no group of `ab/c`', () => {
    const grouped = reading.of([
      reading.key('name', { header: 'Name', group: 'a/bc' }),
      reading.key('now', { header: 'Now', group: 'ab/d' }),
      reading.key('peak', { header: 'Peak', group: 'ab/c' }),
      reading.key('today', { header: 'Today', group: 'a/bc' }),
    ]);
    expect(
      pctPlaceColumns(grouped, {
        order: ['name', 'now', 'peak', 'today'],
      } as PctTableLayout).map((one) => one.column.id),
    ).toEqual(['name', 'today', 'now', 'peak']);
  });

  it("pins a group to its first column's edge, whatever the rest say", () => {
    expect(laid({ pinned: { end: ['month', 'fee'] } })).toEqual([
      'name',
      'now',
      'peak',
      'today',
      'month',
      'fee',
      'room',
    ]);
    expect(laid({ pinned: { start: ['now'], end: ['peak'] } })).toEqual([
      'now@start',
      'peak@start',
      'name',
      'today',
      'month',
      'fee',
      'room',
    ]);
    expect(laid({ pinned: { end: ['today'] } })).toEqual([
      'name',
      'now',
      'peak',
      'room',
      'today@end',
      'month@end',
      'fee@end',
    ]);
  });

  it('moves a group whole past the next column or group, and a column past a group', () => {
    expect(moved({}, 'peak', 1)).toEqual([
      'name',
      'today',
      'month',
      'fee',
      'now',
      'peak',
      'room',
    ]);
    expect(moved({}, 'name', 1)).toEqual([
      'now',
      'peak',
      'name',
      'today',
      'month',
      'fee',
      'room',
    ]);
    expect(moved({}, 'room', -1)).toEqual([
      'name',
      'now',
      'peak',
      'room',
      'today',
      'month',
      'fee',
    ]);
    expect(moved({}, 'fee', -1)).toEqual([
      'name',
      'today',
      'month',
      'fee',
      'now',
      'peak',
      'room',
    ]);
    expect(pctMoveColumn(grouped, {}, 'name', -1)).toEqual({});
    expect(pctCanMoveColumn(grouped, {}, 'month', 1)).toBe(true);
    expect(pctCanMoveColumn(grouped, {}, 'room', 1)).toBe(false);
  });

  it('carries a hidden column of the group along, and stops where nothing shown stands', () => {
    expect(moved({ hidden: ['peak'] }, 'name', 1)).toEqual([
      'now',
      'peak',
      'name',
      'today',
      'month',
      'fee',
      'room',
    ]);
    expect(moved({ hidden: ['now'] }, 'name', 1)).toEqual([
      'now',
      'peak',
      'name',
      'today',
      'month',
      'fee',
      'room',
    ]);
    // Nothing shown stands before the group: the layout as it was, until all are listed.
    expect(pctMoveColumn(grouped, { hidden: ['name'] }, 'now', -1)).toEqual({
      hidden: ['name'],
    });
    expect(moved({ hidden: ['name'] }, 'now', -1, 'all')).toEqual([
      'now',
      'peak',
      'name',
      'today',
      'month',
      'fee',
      'room',
    ]);
  });

  it('pins and unpins a group with any of its columns, given the columns, and the column alone without', () => {
    expect(pctPinColumn({}, 'peak', 'start', grouped)).toEqual({
      pinned: { start: ['now', 'peak'], end: [] },
    });
    expect(
      pctPinColumn(
        { pinned: { start: ['today', 'name'], end: ['month'] } },
        'fee',
        null,
        grouped,
      ),
    ).toEqual({ pinned: { start: ['name'], end: [] } });
    expect(pctPinColumn({}, 'peak', 'end', grouped)).toEqual({
      pinned: { start: [], end: ['now', 'peak'] },
    });
    expect(pctPinColumn({}, 'peak', 'start')).toEqual({
      pinned: { start: ['peak'], end: [] },
    });
    expect(pctPinColumn({}, 'name', 'start', grouped)).toEqual({
      pinned: { start: ['name'], end: [] },
    });
  });
});
