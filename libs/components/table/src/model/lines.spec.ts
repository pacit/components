import { pctLines } from './lines';

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
