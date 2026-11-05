import {
  ApplicationRef,
  Component,
  ErrorHandler,
  provideZonelessChangeDetection,
  signal,
  type Type,
  viewChild,
} from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PctDataTable } from './data-table';
import { PctTableGrid, type PctTableDataCell } from './data-table-grid';
import { PctTableEditing } from './data-table-editing';
import { PctTableGroups } from './data-table-groups';
import { PctTableSelection } from './data-table-selection';
import { PctTableTree } from './data-table-tree';
import { pctColumnsOf, type PctRowId } from './model/columns';
import type { PctTableSort } from './table';

interface Node {
  readonly id: string;
  readonly name: string;
  readonly floor: string;
  readonly power: number;
  readonly kids?: readonly Node[];
}

const node = (
  id: string,
  name: string,
  power: number,
  kids?: readonly Node[],
): Node =>
  kids
    ? { id, name, floor: 'Ground', power, kids }
    : { id, name, floor: 'Ground', power };

const kettle = node('kettle', 'Kettle', 2000);
const lamp = node('lamp', 'Lamp', 12);
const kitchen = node('kitchen', 'Kitchen', 0, [kettle, lamp]);
const hall = node('hall', 'Hall', 0, [node('sensor', 'Sensor', 1)]);
const ground = node('ground', 'Ground floor', 0, [kitchen, hall]);
const upstairs: Node = {
  ...node('up', 'Upstairs', 0, [node('bed', 'Bedroom', 0, [])]),
  floor: 'Upper',
};
const HOME: readonly Node[] = [ground, upstairs];

const col = pctColumnsOf<Node>();
const columns = col.of([
  col.key('name', { header: 'Name' }),
  col.key('power', { header: 'Power', kind: { number: { unit: 'W' } } }),
]);
const byId = (row: Node) => row.id;
const kidsOf = (row: Node) => row.kids;

@Component({
  imports: [PctDataTable, PctTableTree],
  template: `
    <pct-data-table
      [pctTableTree]="columns"
      [children]="kidsOf"
      [(expanded)]="expanded"
      [disabled]="off()"
      [rows]="rows()"
      [columns]="columns"
      [rowId]="byId"
      [filter]="filter()"
      [sort]="sort()"
      caption="Home"
    />
  `,
})
class Host {
  readonly table = viewChild.required(PctDataTable<Node>);
  readonly tree = viewChild.required(PctTableTree);
  readonly columns = columns;
  readonly byId = byId;
  readonly kidsOf = kidsOf;
  readonly rows = signal(HOME);
  readonly expanded = signal<readonly PctRowId[]>([]);
  readonly off = signal(false);
  readonly filter = signal('');
  readonly sort = signal<readonly PctTableSort<'name' | 'power'>[]>([]);
}

@Component({
  imports: [PctDataTable, PctTableTree],
  template: `
    <pct-data-table
      [pctTableTree]="columns"
      [children]="kidsOf"
      [rows]="rows"
      [columns]="columns"
      [rowId]="byId"
      caption="Home"
    />
  `,
})
class BareHost {
  readonly tree = viewChild.required(PctTableTree);
  readonly columns = columns;
  readonly byId = byId;
  readonly kidsOf = kidsOf;
  readonly rows = HOME;
}

@Component({
  imports: [PctDataTable, PctTableTree, PctTableGrid],
  template: `
    <pct-data-table
      [pctTableTree]="columns"
      [children]="kidsOf"
      [(expanded)]="expanded"
      [disabled]="off()"
      [pctTableGrid]="columns"
      rowNumbers
      [rows]="rows"
      [columns]="columns"
      [rowId]="byId"
      caption="Home"
    />
  `,
})
class GridHost {
  readonly columns = columns;
  readonly byId = byId;
  readonly kidsOf = kidsOf;
  readonly rows = HOME;
  readonly expanded = signal<readonly PctRowId[]>(['ground']);
  readonly off = signal(false);
}

@Component({
  imports: [PctDataTable, PctTableTree, PctTableGrid, PctTableGroups],
  template: `
    <pct-data-table
      [pctTableTree]="grouped"
      [children]="kidsOf"
      [(expanded)]="expanded"
      [pctTableGrid]="grouped"
      [pctTableGroups]="grouped"
      [groupBy]="['floor']"
      [(collapsed)]="collapsed"
      [rows]="rows"
      [columns]="grouped"
      [rowId]="byId"
      caption="Home"
    />
  `,
})
class GroupedHost {
  readonly table = viewChild.required(PctDataTable<Node>);
  readonly grouped = col.of([
    col.key('name', { header: 'Name' }),
    col.key('floor', { header: 'Floor' }),
  ]);
  readonly byId = byId;
  readonly kidsOf = kidsOf;
  readonly rows = HOME;
  readonly expanded = signal<readonly PctRowId[]>(['ground', 'kitchen']);
  readonly collapsed = signal<readonly string[]>([]);
}

@Component({
  imports: [PctDataTable, PctTableTree, PctTableGrid, PctTableEditing],
  template: `
    <pct-data-table
      [pctTableTree]="columns"
      [children]="kidsOf"
      [(expanded)]="expanded"
      [pctTableGrid]="columns"
      [pctTableEditing]="columns"
      [editable]="['name']"
      [(editing)]="editing"
      [rows]="rows"
      [columns]="columns"
      [rowId]="byId"
      caption="Home"
    />
  `,
})
class EditHost {
  readonly columns = columns;
  readonly byId = byId;
  readonly kidsOf = kidsOf;
  readonly rows = HOME;
  readonly expanded = signal<readonly PctRowId[]>([]);
  readonly editing = signal<PctTableDataCell<'name' | 'power'> | null>(null);
}

@Component({
  imports: [PctDataTable, PctTableTree, PctTableSelection],
  template: `
    <pct-data-table
      [pctTableTree]="columns"
      [children]="kidsOf"
      [expanded]="open"
      pctTableSelection
      [(value)]="value"
      [cascade]="cascade()"
      [mode]="mode()"
      [rows]="rows"
      [columns]="columns"
      [rowId]="byId"
      [filter]="filter()"
      caption="Home"
    />
  `,
})
class PickHost {
  readonly columns = columns;
  readonly byId = byId;
  readonly kidsOf = kidsOf;
  readonly rows = HOME;
  readonly open = ['ground', 'kitchen', 'hall', 'up'];
  readonly value = signal<readonly PctRowId[]>([]);
  readonly cascade = signal(true);
  readonly mode = signal<'single' | 'multiple'>('multiple');
  readonly filter = signal('');
}

@Component({
  imports: [PctDataTable, PctTableTree, PctTableSelection],
  template: `
    <pct-data-table
      [pctTableTree]="columns"
      [children]="kidsOf"
      [expanded]="open"
      pctTableSelection
      [(value)]="value"
      [rows]="rows"
      [columns]="columns"
      [rowId]="byId"
      caption="Home"
    />
  `,
})
class UnboundPickHost {
  readonly columns = columns;
  readonly byId = byId;
  readonly kidsOf = kidsOf;
  readonly rows = HOME;
  readonly open = ['ground', 'kitchen'];
  readonly value = signal<readonly PctRowId[]>([]);
}

let errors: unknown[] = [];
const globals = globalThis as {
  ResizeObserver?: unknown;
  IntersectionObserver?: unknown;
};

beforeEach(() => {
  const inert = class {
    observe(): void {
      // Nothing to observe in jsdom.
    }
    unobserve(): void {
      // Nothing to let go.
    }
    disconnect(): void {
      // Nothing to let go.
    }
  };
  globals.ResizeObserver = inert;
  globals.IntersectionObserver = inert;
  // jsdom scrolls nothing: `reveal` ends in a scroll the test does not read.
  Element.prototype.scrollIntoView = vi.fn();
  // Every line 20 px tall in a view of 100: the grid hands the focus to a cell it sees.
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
    width: 0,
    height: 20,
    top: 0,
    left: 0,
    right: 0,
    bottom: 20,
  } as DOMRect);
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(100);
});

afterEach(() => {
  delete globals.ResizeObserver;
  delete globals.IntersectionObserver;
  delete (Element.prototype as { scrollIntoView?: unknown }).scrollIntoView;
  vi.restoreAllMocks();
  expect(errors).toEqual([]);
  errors = [];
});

async function render<T>(type: Type<T>): Promise<ComponentFixture<T>> {
  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      {
        provide: ErrorHandler,
        useValue: { handleError: (error: unknown) => errors.push(error) },
      },
    ],
  });
  const fixture = TestBed.createComponent(type);
  await settle(fixture);
  return fixture;
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await TestBed.inject(ApplicationRef).whenStable();
  fixture.detectChanges();
  await TestBed.inject(ApplicationRef).whenStable();
}

const table = () =>
  document.querySelector('pct-data-table table') as HTMLTableElement;
const rows = () =>
  Array.from(table().querySelectorAll<HTMLTableRowElement>('tbody tr'));
const names = () =>
  rows()
    .filter((row) => row.getAttribute('data-pct-part') !== 'group')
    .map((row) => row.cells[row.cells.length - 2].textContent?.trim());
const levels = () =>
  rows()
    .filter((row) => row.getAttribute('data-pct-part') !== 'group')
    .map((row) => row.style.getPropertyValue('--_level') || '0');
/** A row's disclosure, by the name its first cell shows. */
const button = (name: string) =>
  rows()
    .find((row) => row.textContent?.includes(name))
    ?.querySelector<HTMLButtonElement>('button[data-pct-part="disclosure"]') ??
  null;
const active = () => document.activeElement as HTMLElement;

async function press(
  fixture: ComponentFixture<unknown>,
  key: string,
  target: Element = active(),
): Promise<KeyboardEvent> {
  const event = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
  });
  target.dispatchEvent(event);
  await settle(fixture);
  return event;
}

describe('PctTableTree — the rows as a tree', () => {
  it('draws the roots closed, a button in the first cell of a branch and a space in a leaf’s', async () => {
    await render(Host);
    expect(names()).toEqual(['Ground floor', 'Upstairs']);
    const open = button('Ground floor') as HTMLButtonElement;
    expect(open.getAttribute('aria-expanded')).toBe('false');
    expect(open.getAttribute('aria-label')).toBe('Expand');
    // Alone, the tree says nothing a row's attributes mean outside a treegrid.
    expect(table().hasAttribute('role')).toBe(false);
    expect(rows()[0].hasAttribute('aria-level')).toBe(false);
    expect(rows()[0].hasAttribute('aria-expanded')).toBe(false);
  });

  it('starts with every branch closed when nothing binds the model', async () => {
    const fixture = await render(BareHost);
    expect(fixture.componentInstance.tree().expanded()).toEqual([]);
    expect(names()).toEqual(['Ground floor', 'Upstairs']);
  });

  it('opens a branch from its button, one level deeper, and writes the model', async () => {
    const fixture = await render(Host);
    (button('Ground floor') as HTMLButtonElement).click();
    await settle(fixture);
    expect(fixture.componentInstance.expanded()).toEqual(['ground']);
    expect(names()).toEqual(['Ground floor', 'Kitchen', 'Hall', 'Upstairs']);
    expect(levels()).toEqual(['0', '1', '1', '0']);
    const open = button('Ground floor') as HTMLButtonElement;
    expect(open.getAttribute('aria-expanded')).toBe('true');
    expect(open.getAttribute('aria-label')).toBe('Collapse');
    // A leaf holds the button's place and no button.
    (button('Kitchen') as HTMLButtonElement).click();
    await settle(fixture);
    expect(names()).toEqual([
      'Ground floor',
      'Kitchen',
      'Kettle',
      'Lamp',
      'Hall',
      'Upstairs',
    ]);
    expect(button('Kettle')).toBeNull();
    expect(
      rows()[2].cells[0].querySelector('.pct-data-table__leaf'),
    ).not.toBeNull();
    // An empty list of children is a leaf too.
    (button('Upstairs') as HTMLButtonElement).click();
    await settle(fixture);
    expect(button('Bedroom')).toBeNull();
  });

  it('closes a branch from its button, and the model loses its id', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.expanded.set(['ground', 'kitchen']);
    await settle(fixture);
    expect(names()).toHaveLength(6);
    (button('Ground floor') as HTMLButtonElement).click();
    await settle(fixture);
    expect(fixture.componentInstance.expanded()).toEqual(['kitchen']);
    expect(names()).toEqual(['Ground floor', 'Upstairs']);
  });

  it('keeps a match with the rows above it, muted, and drops the branches with none', async () => {
    const fixture = await render(Host);
    const { table: tableOf, expanded } = fixture.componentInstance;
    expanded.set(['ground', 'kitchen', 'hall']);
    fixture.componentInstance.filter.set('lamp');
    await settle(fixture);
    expect(names()).toEqual(['Ground floor', 'Kitchen', 'Lamp']);
    expect(rows().map((row) => row.hasAttribute('data-pct-muted'))).toEqual([
      true,
      true,
      false,
    ]);
    expect(tableOf().matched()).toBe(3);
    expect(
      tableOf()
        .matchedRows()
        .map((row) => row.name),
    ).toEqual(['Ground floor', 'Kitchen', 'Lamp']);
    expect(tableOf().matchedIds()).toEqual(['ground', 'kitchen', 'lamp']);
    // Closed, the way to the match is still what is kept, and the count says so.
    expanded.set([]);
    await settle(fixture);
    expect(names()).toEqual(['Ground floor']);
    expect(tableOf().matched()).toBe(3);
    expect(tableOf().lines()).toHaveLength(1);
  });

  it('counts every row kept while nothing filters, open or not', async () => {
    const fixture = await render(Host);
    const { table: tableOf } = fixture.componentInstance;
    expect(tableOf().matched()).toBe(8);
    expect(
      tableOf()
        .matchedRows()
        .map((row) => row.name),
    ).toEqual([
      'Ground floor',
      'Kitchen',
      'Kettle',
      'Lamp',
      'Hall',
      'Sensor',
      'Upstairs',
      'Bedroom',
    ]);
    expect(rows().some((row) => row.hasAttribute('data-pct-muted'))).toBe(
      false,
    );
  });

  it('orders each list of siblings by the sort, the roots too', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.expanded.set(['ground', 'kitchen']);
    fixture.componentInstance.sort.set([
      { key: 'name', direction: 'descending' },
    ]);
    await settle(fixture);
    expect(names()).toEqual([
      'Upstairs',
      'Ground floor',
      'Kitchen',
      'Lamp',
      'Kettle',
      'Hall',
    ]);
  });

  it('reveal opens every branch above a row', async () => {
    const fixture = await render(Host);
    const { table: tableOf, expanded } = fixture.componentInstance;
    expanded.set(['up']);
    await settle(fixture);
    tableOf().reveal('lamp');
    await settle(fixture);
    expect(expanded()).toEqual(['up', 'kitchen', 'ground']);
    expect(names()).toContain('Lamp');
    // A root, and a row the tree does not hold, open nothing more.
    tableOf().reveal('ground');
    tableOf().reveal('nobody');
    await settle(fixture);
    expect(expanded()).toEqual(['up', 'kitchen', 'ground']);
  });

  it('keeps the branches open by their ids when the rows are replaced', async () => {
    const fixture = await render(Host);
    const { expanded } = fixture.componentInstance;
    expanded.set(['ground']);
    await settle(fixture);
    fixture.componentInstance.rows.set([
      { ...ground, kids: [node('garage', 'Garage', 0), kitchen] },
    ]);
    await settle(fixture);
    expect(names()).toEqual(['Ground floor', 'Garage', 'Kitchen']);
    expect(expanded()).toEqual(['ground']);
  });

  it('toggle, expandAll and collapseAll write the model; expandAll opens the branches kept', async () => {
    const fixture = await render(Host);
    const { tree, expanded } = fixture.componentInstance;
    tree().toggle('ground');
    await settle(fixture);
    expect(expanded()).toEqual(['ground']);
    tree().toggle('ground');
    expect(expanded()).toEqual([]);
    // Closing one of two leaves the other open.
    expanded.set(['ground', 'kitchen']);
    await settle(fixture);
    tree().toggle('kitchen');
    expect(expanded()).toEqual(['ground']);
    tree().expandAll();
    await settle(fixture);
    expect(expanded()).toEqual(['ground', 'kitchen', 'hall', 'up']);
    expect(names()).toHaveLength(8);
    tree().collapseAll();
    await settle(fixture);
    expect(expanded()).toEqual([]);
    expect(names()).toEqual(['Ground floor', 'Upstairs']);
    // Only the branches the filter kept: a branch of no match is none to open.
    fixture.componentInstance.filter.set('sensor');
    await settle(fixture);
    tree().expandAll();
    await settle(fixture);
    expect(expanded()).toEqual(['ground', 'hall']);
    // A branch whose children the filter dropped is a leaf, and none to open.
    fixture.componentInstance.filter.set('kitchen');
    await settle(fixture);
    tree().expandAll();
    await settle(fixture);
    expect(expanded()).toEqual(['ground']);
  });

  it('reveal writes the model once, for the branches that were closed', async () => {
    const fixture = await render(Host);
    const { table: tableOf, expanded } = fixture.componentInstance;
    expanded.set(['ground', 'kitchen']);
    await settle(fixture);
    const before = expanded();
    tableOf().reveal('lamp');
    await settle(fixture);
    expect(expanded()).toBe(before);
    expanded.set(['kitchen']);
    await settle(fixture);
    tableOf().reveal('lamp');
    await settle(fixture);
    expect(expanded()).toEqual(['kitchen', 'ground']);
  });

  it('warns once of two rows with one id, in a closed branch too', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const fixture = await render(Host);
    fixture.componentInstance.rows.set([
      ground,
      { ...upstairs, kids: [node('kitchen', 'Kitchen again', 1)] },
    ]);
    await settle(fixture);
    expect(names()).toEqual(['Ground floor', 'Upstairs']);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain('"kitchen"');
  });

  it('disabled, the rows stand flat: the roots, no button and no child', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.expanded.set(['ground']);
    fixture.componentInstance.off.set(true);
    await settle(fixture);
    expect(names()).toEqual(['Ground floor', 'Upstairs']);
    expect(button('Ground floor')).toBeNull();
    expect(
      rows()[0].cells[0].querySelector('.pct-data-table__leaf'),
    ).toBeNull();
    expect(fixture.componentInstance.table().matched()).toBe(2);
  });
});

describe('PctTableTree with the grid — a treegrid', () => {
  it('is a treegrid whose rows say their level, place and state; a leaf says no state', async () => {
    await render(GridHost);
    expect(table().getAttribute('role')).toBe('treegrid');
    const attributes = (row: HTMLTableRowElement) => [
      row.getAttribute('aria-level'),
      row.getAttribute('aria-posinset'),
      row.getAttribute('aria-setsize'),
      row.getAttribute('aria-expanded'),
    ];
    expect(rows().map(attributes)).toEqual([
      ['1', '1', '2', 'true'],
      ['2', '1', '2', 'false'],
      ['2', '2', '2', 'false'],
      ['1', '2', '2', 'false'],
    ]);
  });

  it('is a grid again, its rows saying no level or place, while the tree is off', async () => {
    const fixture = await render(GridHost);
    fixture.componentInstance.off.set(true);
    await settle(fixture);
    expect(table().getAttribute('role')).toBe('grid');
    expect(names()).toEqual(['Ground floor', 'Upstairs']);
    expect(
      rows().map((row) => [
        row.getAttribute('aria-level'),
        row.getAttribute('aria-posinset'),
        row.getAttribute('aria-setsize'),
        row.getAttribute('aria-expanded'),
      ]),
    ).toEqual([
      [null, null, null, null],
      [null, null, null, null],
    ]);
  });

  it('the arrow into the line opens a closed branch, and out of it closes an open one or goes to the parent', async () => {
    const fixture = await render(GridHost);
    // The stop sits on the first row's button, the lone control of its first cell.
    const first = button('Ground floor') as HTMLButtonElement;
    first.focus();
    await settle(fixture);
    expect(active()).toBe(first);
    // Open already: the arrow moves on to the next cell.
    await press(fixture, 'ArrowRight');
    expect(active()).toBe(rows()[0].cells[2]);
    await press(fixture, 'ArrowLeft');
    expect(active()).toBe(first);
    // Out of the line on an open branch closes it, and the stop stays.
    await press(fixture, 'ArrowLeft');
    expect(fixture.componentInstance.expanded()).toEqual([]);
    expect(names()).toEqual(['Ground floor', 'Upstairs']);
    expect(active()).toBe(button('Ground floor'));
    // Into the line on a closed branch opens it, and the stop stays.
    await press(fixture, 'ArrowRight');
    expect(fixture.componentInstance.expanded()).toEqual(['ground']);
    expect(active()).toBe(button('Ground floor'));
    // On a child, out of the line goes to the parent's first cell.
    const kitchen = button('Kitchen') as HTMLButtonElement;
    kitchen.focus();
    await settle(fixture);
    await press(fixture, 'ArrowLeft');
    expect(active()).toBe(button('Ground floor'));
    // On a root that is closed, out of the line is the grid's own move: nothing before it.
    await press(fixture, 'ArrowLeft');
    await press(fixture, 'ArrowLeft');
    expect(active()).toBe(rows()[0].cells[0]);
    // The number is no first cell: its arrows move as the grid's.
    await press(fixture, 'ArrowRight');
    expect(active()).toBe(button('Ground floor'));
  });

  it('reveal opens the group of the row’s root, in which the row stands', async () => {
    const fixture = await render(GroupedHost);
    const { table: tableOf, expanded, collapsed } = fixture.componentInstance;
    expanded.set([]);
    collapsed.set(['["Upper"]']);
    await settle(fixture);
    expect(names()).toEqual(['Ground floor']);
    // The bedroom's own floor is Ground, but it stands upstairs: that group opens.
    tableOf().reveal('bed');
    await settle(fixture);
    expect(collapsed()).toEqual([]);
    expect(expanded()).toEqual(['up']);
    expect(names()).toEqual(['Ground floor', 'Upstairs', 'Bedroom']);
  });

  it('a row’s level counts the tree alone, not the groups it stands in', async () => {
    await render(GroupedHost);
    expect(table().getAttribute('role')).toBe('treegrid');
    const data = rows().filter(
      (row) => row.getAttribute('data-pct-part') !== 'group',
    );
    expect(
      data.map((row) => [
        row.cells[0].textContent?.trim(),
        row.getAttribute('aria-level'),
        row.style.getPropertyValue('--_level'),
      ]),
    ).toEqual([
      ['Ground floor', '1', '1'],
      ['Kitchen', '2', '2'],
      ['Kettle', '3', '3'],
      ['Lamp', '3', '3'],
      ['Hall', '2', '2'],
      ['Upstairs', '1', '1'],
    ]);
  });

  it('a branch’s first cell is edited from its button by F2, while Enter opens the branch', async () => {
    const fixture = await render(EditHost);
    const first = button('Ground floor') as HTMLButtonElement;
    first.focus();
    await settle(fixture);
    const enter = await press(fixture, 'Enter');
    expect(enter.defaultPrevented).toBe(false);
    expect(fixture.componentInstance.editing()).toBeNull();
    await press(fixture, 'F2');
    expect(fixture.componentInstance.editing()).toEqual({
      row: 'ground',
      column: 'name',
    });
    expect(
      rows()[0].querySelector('[data-pct-part="editor"] input'),
    ).not.toBeNull();
  });
});

describe('PctTableSelection cascading in a tree', () => {
  /** A row's checkbox or radio, by the name its first cell shows. */
  const pick = (name: string) =>
    rows()
      .find((row) => row.textContent?.includes(name))
      ?.querySelector<HTMLInputElement>(
        '[data-pct-part="select"]',
      ) as HTMLInputElement;
  const tap = async (
    fixture: ComponentFixture<unknown>,
    name: string,
    shiftKey = false,
  ) => {
    pick(name).dispatchEvent(
      new MouseEvent('click', { bubbles: true, cancelable: true, shiftKey }),
    );
    await settle(fixture);
  };
  const mixed = () =>
    rows()
      .filter(
        (row) =>
          (row.querySelector('[data-pct-part="select"]') as HTMLInputElement)
            .indeterminate,
      )
      // The row's name, as its checkbox is named: the cell also holds it out of the paint.
      .map((row) => row.querySelector('[hidden]')?.textContent?.trim());

  it('names a branch’s checkbox by the row’s text, not by its button’s', async () => {
    await render(PickHost);
    const named = (name: string) =>
      (pick(name).getAttribute('aria-labelledby') as string)
        .split(' ')
        .map((id) => document.getElementById(id)?.textContent?.trim());
    expect(named('Kitchen')).toEqual(['Select', 'Kitchen']);
    expect(named('Kettle')).toEqual(['Select', 'Kettle']);
    // The words stand in the first cell, out of the paint: the cell itself names nothing.
    const first = rows()[1].querySelector(
      'td.pct-data-table__first',
    ) as HTMLElement;
    expect(first.hasAttribute('id')).toBe(false);
    expect((first.querySelector('[hidden]') as HTMLElement).id).toBe(
      pick('Kitchen').getAttribute('aria-labelledby')?.split(' ')[1],
    );
  });

  it('picks a branch with every row below it, and drops them all again', async () => {
    const fixture = await render(PickHost);
    await tap(fixture, 'Ground floor');
    expect(fixture.componentInstance.value()).toEqual([
      'ground',
      'kitchen',
      'kettle',
      'lamp',
      'hall',
      'sensor',
    ]);
    expect(pick('Lamp').checked).toBe(true);
    expect(pick('Upstairs').checked).toBe(false);
    expect(mixed()).toEqual([]);
    await tap(fixture, 'Ground floor');
    expect(fixture.componentInstance.value()).toEqual([]);
  });

  it('picks a branch once all its children are, the rows above it too, and marks the half picked mixed', async () => {
    const fixture = await render(PickHost);
    await tap(fixture, 'Kettle');
    expect(fixture.componentInstance.value()).toEqual(['kettle']);
    expect(mixed()).toEqual(['Ground floor', 'Kitchen']);
    await tap(fixture, 'Lamp');
    expect(fixture.componentInstance.value()).toEqual([
      'kettle',
      'lamp',
      'kitchen',
    ]);
    expect(pick('Kitchen').checked).toBe(true);
    expect(mixed()).toEqual(['Ground floor']);
    await tap(fixture, 'Sensor');
    expect(fixture.componentInstance.value()).toEqual([
      'kettle',
      'lamp',
      'kitchen',
      'sensor',
      'hall',
      'ground',
    ]);
    expect(mixed()).toEqual([]);
    // A branch of one child is picked with it.
    await tap(fixture, 'Bedroom');
    expect(fixture.componentInstance.value()).toContain('up');
  });

  it('drops a row, and with it every row above it, keeping the rest in their order', async () => {
    const fixture = await render(PickHost);
    fixture.componentInstance.value.set([
      'up',
      'ground',
      'kitchen',
      'kettle',
      'lamp',
      'hall',
      'sensor',
      'bed',
    ]);
    await settle(fixture);
    await tap(fixture, 'Kettle');
    expect(fixture.componentInstance.value()).toEqual([
      'up',
      'lamp',
      'hall',
      'sensor',
      'bed',
    ]);
    expect(mixed()).toEqual(['Ground floor', 'Kitchen']);
    expect(pick('Ground floor').checked).toBe(false);
  });

  it('cascades over the rows a press with Shift picks', async () => {
    const fixture = await render(PickHost);
    await tap(fixture, 'Kettle');
    await tap(fixture, 'Hall', true);
    expect(fixture.componentInstance.value()).toEqual([
      'kettle',
      'lamp',
      'hall',
      'sensor',
      'kitchen',
      'ground',
    ]);
  });

  it('picks below a branch only the rows the filter kept, and says the rest once they show', async () => {
    const fixture = await render(PickHost);
    fixture.componentInstance.filter.set('Kettle');
    await settle(fixture);
    await tap(fixture, 'Ground floor');
    expect(fixture.componentInstance.value()).toEqual([
      'ground',
      'kitchen',
      'kettle',
    ]);
    fixture.componentInstance.filter.set('');
    await settle(fixture);
    // The list stands as it was written; the rows below say the branches are half picked.
    expect(pick('Ground floor').checked).toBe(true);
    expect(mixed()).toEqual(['Ground floor', 'Kitchen']);
  });

  it('does not cascade while the input is left unbound', async () => {
    const fixture = await render(UnboundPickHost);
    await tap(fixture, 'Kitchen');
    expect(fixture.componentInstance.value()).toEqual(['kitchen']);
    expect(pick('Kettle').checked).toBe(false);
  });

  it('picks the one row pressed while it does not cascade, and in single mode', async () => {
    const fixture = await render(PickHost);
    fixture.componentInstance.cascade.set(false);
    await settle(fixture);
    await tap(fixture, 'Kettle');
    await tap(fixture, 'Kitchen');
    expect(fixture.componentInstance.value()).toEqual(['kettle', 'kitchen']);
    expect(mixed()).toEqual([]);
    fixture.componentInstance.value.set([]);
    fixture.componentInstance.cascade.set(true);
    fixture.componentInstance.mode.set('single');
    await settle(fixture);
    await tap(fixture, 'Kitchen');
    expect(fixture.componentInstance.value()).toEqual(['kitchen']);
    await tap(fixture, 'Kettle');
    expect(fixture.componentInstance.value()).toEqual(['kettle']);
  });
});
