import { pctTree, pctTreeAbove } from './tree';

interface Node {
  readonly id: string;
  readonly name: string;
  readonly kids?: readonly Node[];
}

const node = (id: string, name: string, kids?: readonly Node[]): Node =>
  kids ? { id, name, kids } : { id, name };

const kettle = node('kettle', 'Kettle');
const lamp = node('lamp', 'Lamp');
const kitchen = node('kitchen', 'Kitchen', [kettle, lamp]);
const hall = node('hall', 'Hall', [node('sensor', 'Sensor')]);
const empty = node('attic', 'Attic', []);
const ground = node('ground', 'Ground floor', [kitchen, hall]);
const upstairs = node('up', 'Upstairs', [node('bed', 'Bedroom', [empty])]);
const roots = [upstairs, ground];

const id = (row: Node) => row.id;
const kids = (row: Node) => row.kids;
const byName = (rows: readonly Node[]) =>
  [...rows].sort((a, b) => a.name.localeCompare(b.name));
const names = (rows: readonly Node[]) => rows.map((row) => row.name);

describe('pctTree', () => {
  it('keeps every row in the order given when nothing filters or orders', () => {
    const tree = pctTree(roots, id, { children: kids });
    expect(tree.roots).toEqual(roots);
    expect(names(tree.rows)).toEqual([
      'Upstairs',
      'Bedroom',
      'Attic',
      'Ground floor',
      'Kitchen',
      'Kettle',
      'Lamp',
      'Hall',
      'Sensor',
    ]);
    expect(tree.children(kitchen)).toEqual([kettle, lamp]);
    expect(tree.children(kettle)).toBeUndefined();
    expect(tree.children(empty)).toEqual([]);
    expect(tree.muted.size).toBe(0);
  });

  it('keeps a match with the rows above it, and mutes those that matched nothing', () => {
    const tree = pctTree(roots, id, {
      children: kids,
      matches: (row) => row.name === 'Lamp',
    });
    expect(names(tree.roots)).toEqual(['Ground floor']);
    expect(names(tree.rows)).toEqual(['Ground floor', 'Kitchen', 'Lamp']);
    expect(tree.children(kitchen)).toEqual([lamp]);
    expect([...tree.muted].sort()).toEqual(['ground', 'kitchen']);
  });

  it('keeps a row that matches without its children that do not, and leaves it a leaf', () => {
    const tree = pctTree(roots, id, {
      children: kids,
      matches: (row) => row.name === 'Kitchen',
    });
    expect(names(tree.rows)).toEqual(['Ground floor', 'Kitchen']);
    expect(tree.children(kitchen)).toEqual([]);
    expect(tree.muted.has('kitchen')).toBe(false);
    expect(tree.muted.has('ground')).toBe(true);
  });

  it('drops a branch whose children were all dropped and that matched nothing itself', () => {
    const tree = pctTree(roots, id, {
      children: kids,
      matches: (row) => row.name === 'Sensor',
    });
    expect(names(tree.rows)).toEqual(['Ground floor', 'Hall', 'Sensor']);
    expect(tree.children(ground)).toEqual([hall]);
  });

  it('orders each list of siblings, the roots too, and reads the rows in that order', () => {
    const tree = pctTree(roots, id, { children: kids, order: byName });
    expect(names(tree.roots)).toEqual(['Ground floor', 'Upstairs']);
    expect(names(tree.children(ground) ?? [])).toEqual(['Hall', 'Kitchen']);
    expect(names(tree.rows)).toEqual([
      'Ground floor',
      'Hall',
      'Sensor',
      'Kitchen',
      'Kettle',
      'Lamp',
      'Upstairs',
      'Bedroom',
      'Attic',
    ]);
  });

  it('orders the siblings the filter kept, not those it dropped', () => {
    const tree = pctTree(roots, id, {
      children: kids,
      matches: (row) => row.name !== 'Hall' && row.name !== 'Sensor',
      order: byName,
    });
    expect(tree.children(ground)).toEqual([kitchen]);
    expect(tree.places.get('kitchen')).toEqual({ position: 1, siblings: 1 });
  });

  it('notes each row’s parent and its place among the siblings kept', () => {
    const tree = pctTree(roots, id, { children: kids });
    expect(tree.parents.get('lamp')).toBe('kitchen');
    expect(tree.parents.get('kitchen')).toBe('ground');
    expect(tree.parents.has('ground')).toBe(false);
    expect(tree.places.get('up')).toEqual({ position: 1, siblings: 2 });
    expect(tree.places.get('ground')).toEqual({ position: 2, siblings: 2 });
    expect(tree.places.get('lamp')).toEqual({ position: 2, siblings: 2 });
    expect(tree.places.get('sensor')).toEqual({ position: 1, siblings: 1 });
  });

  it('answers nothing for a row it does not hold', () => {
    const tree = pctTree(roots, id, {
      children: kids,
      matches: (row) => row.name === 'Kettle',
    });
    expect(tree.children(hall)).toBeUndefined();
    expect(tree.places.has('hall')).toBe(false);
    expect(tree.parents.has('sensor')).toBe(false);
  });

  it('reads a tree whose children are made anew on each call as one tree', () => {
    const fresh = (row: Node) =>
      row.kids === undefined ? undefined : row.kids.map((kid) => ({ ...kid }));
    const tree = pctTree(roots, id, { children: fresh });
    expect(names(tree.rows)).toHaveLength(9);
    expect(tree.children(tree.roots[1])).toHaveLength(2);
    expect(tree.parents.get('kettle')).toBe('kitchen');
  });
});

describe('pctTreeAbove', () => {
  const { parents } = pctTree(roots, id, { children: kids });

  it('lists the rows above a row, its parent first', () => {
    expect(pctTreeAbove(parents, 'lamp')).toEqual(['kitchen', 'ground']);
    expect(pctTreeAbove(parents, 'kitchen')).toEqual(['ground']);
  });

  it('is empty for a root and for an id the tree does not hold', () => {
    expect(pctTreeAbove(parents, 'ground')).toEqual([]);
    expect(pctTreeAbove(parents, 'nobody')).toEqual([]);
  });
});
