import { pctLineKey, pctLines } from './lines';

interface Node {
  id: string;
  kids?: Node[];
}

const id = (node: Node) => node.id;
const kids = (node: Node) => node.kids;
const a: Node = { id: 'a' };
const b: Node = { id: 'b' };
const c: Node = { id: 'c' };

describe('pctLines', () => {
  it('draws one row line per row, counted from zero, with no options', () => {
    expect(pctLines([a, b], id)).toEqual([
      { kind: 'row', key: 'a', row: a, index: 0, level: 0, expanded: null },
      { kind: 'row', key: 'b', row: b, index: 1, level: 0, expanded: null },
    ]);
    expect(pctLines([], id)).toEqual([]);
  });

  it('draws a hole for a row not delivered, keyed and counted by its index', () => {
    expect(pctLines([a, undefined, b], id)).toEqual([
      { kind: 'row', key: 'a', row: a, index: 0, level: 0, expanded: null },
      { kind: 'hole', key: 1, index: 1 },
      { kind: 'row', key: 'b', row: b, index: 2, level: 0, expanded: null },
    ]);
  });

  it('draws the details of an open row right after it, with the row’s index', () => {
    expect(pctLines([a, b], id, { details: new Set(['a']) })).toEqual([
      { kind: 'row', key: 'a', row: a, index: 0, level: 0, expanded: null },
      { kind: 'details', key: 'a', row: a, index: 0 },
      { kind: 'row', key: 'b', row: b, index: 1, level: 0, expanded: null },
    ]);
  });

  it('draws an expanded row’s children one level deeper, and a collapsed one’s not at all', () => {
    const parent: Node = { id: 'p', kids: [a, { id: 'q', kids: [c] }] };
    expect(
      pctLines([parent, b], id, { children: kids, expanded: new Set(['p']) }),
    ).toEqual([
      {
        kind: 'row',
        key: 'p',
        row: parent,
        index: 0,
        level: 0,
        expanded: true,
      },
      { kind: 'row', key: 'a', row: a, index: 1, level: 1, expanded: null },
      {
        kind: 'row',
        key: 'q',
        row: parent.kids?.[1],
        index: 2,
        level: 1,
        expanded: false,
      },
      { kind: 'row', key: 'b', row: b, index: 3, level: 0, expanded: null },
    ]);
  });

  it('reads a row with no children, or an empty list of them, as a leaf', () => {
    const empty: Node = { id: 'e', kids: [] };
    expect(
      pctLines([empty, a], id, { children: kids, expanded: new Set(['e']) }),
    ).toEqual([
      { kind: 'row', key: 'e', row: empty, index: 0, level: 0, expanded: null },
      { kind: 'row', key: 'a', row: a, index: 1, level: 0, expanded: null },
    ]);
  });

  it('reads a branch as collapsed when nothing is expanded', () => {
    const parent: Node = { id: 'p', kids: [a] };
    expect(pctLines([parent], id, { children: kids })).toEqual([
      {
        kind: 'row',
        key: 'p',
        row: parent,
        index: 0,
        level: 0,
        expanded: false,
      },
    ]);
  });

  it('puts a row’s details before its children', () => {
    const parent: Node = { id: 'p', kids: [a] };
    const lines = pctLines([parent], id, {
      children: kids,
      expanded: new Set(['p']),
      details: new Set(['p']),
    });
    expect(lines.map((line) => line.kind)).toEqual(['row', 'details', 'row']);
  });
});

describe('pctLines — groups', () => {
  interface Light {
    id: string;
    floor: number;
    room: string;
  }
  const l1: Light = { id: '1', floor: 0, room: 'Hall' };
  const l2: Light = { id: '2', floor: 1, room: 'Bath' };
  const l3: Light = { id: '3', floor: 0, room: 'Kitchen' };
  const l4: Light = { id: '4', floor: 0, room: 'Hall' };
  const byId = (light: Light) => light.id;
  const floor = {
    value: (light: Light) => light.floor,
    label: (light: Light) => `Floor ${light.floor}`,
  };
  const room = {
    value: (light: Light) => light.room,
    label: (light: Light) => light.room,
  };
  const shape = (lines: ReturnType<typeof pctLines<Light>>) =>
    lines.map((line) =>
      line.kind === 'group'
        ? `${'  '.repeat(line.level)}${line.label} ${line.count}${line.collapsed ? ' closed' : ''} ${line.key}`
        : line.kind === 'row'
          ? `${'  '.repeat(line.level)}row ${line.key} #${line.index}`
          : `${line.kind} ${line.key}`,
    );

  it('heads each group with a line, in the order its first row stands, its rows below one level deeper', () => {
    expect(
      shape(pctLines([l1, l2, l3, l4], byId, { groups: [floor] })),
    ).toEqual([
      'Floor 0 3 [0]',
      '  row 1 #0',
      '  row 3 #1',
      '  row 4 #2',
      'Floor 1 1 [1]',
      '  row 2 #3',
    ]);
  });

  it('groups within groups, each key the path of its values', () => {
    const lines = pctLines([l1, l2, l3, l4], byId, { groups: [floor, room] });
    expect(shape(lines)).toEqual([
      'Floor 0 3 [0]',
      '  Hall 2 [0,"Hall"]',
      '    row 1 #0',
      '    row 4 #1',
      '  Kitchen 1 [0,"Kitchen"]',
      '    row 3 #2',
      'Floor 1 1 [1]',
      '  Bath 1 [1,"Bath"]',
      '    row 2 #3',
    ]);
    const hall = lines[1];
    expect(hall.kind === 'group' && hall.rows).toEqual([l1, l4]);
  });

  it('hides a collapsed group’s rows and the groups inside it, and keeps its heading', () => {
    expect(
      shape(
        pctLines([l1, l2, l3, l4], byId, {
          groups: [floor, room],
          collapsed: new Set(['[0]', '[1,"Bath"]']),
        }),
      ),
    ).toEqual([
      'Floor 0 3 closed [0]',
      'Floor 1 1 [1]',
      '  Bath 1 closed [1,"Bath"]',
    ]);
  });

  it('opens details below a grouped row, and puts holes after the groups', () => {
    const empty = {
      value: (light: Light) =>
        light.room === 'Hall'
          ? undefined
          : light.room === 'Bath'
            ? null
            : light.room,
      label: (light: Light) => light.room,
    };
    expect(
      shape(
        pctLines([l1, undefined, l3, l2], byId, {
          groups: [empty],
          details: new Set(['3']),
        }),
      ),
    ).toEqual([
      // No value and a null are one group.
      'Hall 2 [null]',
      '  row 1 #0',
      '  row 2 #1',
      'Kitchen 1 ["Kitchen"]',
      '  row 3 #2',
      'details 3',
      'hole 3',
    ]);
  });
});

describe('pctLineKey', () => {
  it('holds the kind and the key, so lines of two kinds or two id types never meet', () => {
    expect(pctLineKey({ kind: 'hole', key: 1, index: 1 })).toBe('hole:1');
    expect(
      pctLineKey({
        kind: 'row',
        key: 1,
        row: a,
        index: 0,
        level: 0,
        expanded: null,
      }),
    ).toBe('row:1');
    expect(
      pctLineKey({
        kind: 'row',
        key: '1',
        row: a,
        index: 0,
        level: 0,
        expanded: null,
      }),
    ).toBe('row:"1"');
    expect(pctLineKey({ kind: 'details', key: '1', row: a, index: 0 })).toBe(
      'details:"1"',
    );
  });
});
