import {
  ApplicationRef,
  Component,
  ErrorHandler,
  provideZonelessChangeDetection,
  signal,
  Type,
  viewChild,
} from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PctAnnouncer } from '@pacit/components/core';
import { PctDataTable } from './data-table';
import { PctTableColumns } from './data-table-columns';
import { PctTableDetails } from './data-table-details';
import {
  PctTableGrid,
  type PctTableCellRange,
  type PctTableGridCell,
} from './data-table-grid';
import { PctTableSelection } from './data-table-selection';
import { PctCellTemplate, PctDetailsTemplate } from './data-table-slots';
import { pctColumnsOf } from './model/columns';
import type { PctTableLayout } from './model/layout';

interface Device {
  id: number;
  name: string;
  room: string;
  power: number;
}

const col = pctColumnsOf<Device>();
const columns = col.of([
  col.key('name', { header: 'Name' }),
  col.key('room', { header: 'Room', sort: false }),
  col.key('power', { header: 'Power', kind: { number: { unit: 'W' } } }),
]);
type Id = 'name' | 'room' | 'power';
const byId = (device: Device) => device.id;
const DEVICES: Device[] = [
  { id: 1, name: 'Lamp', room: 'Kitchen', power: 12 },
  { id: 2, name: 'Boiler', room: 'Cellar', power: 1900 },
  { id: 3, name: 'Fan', room: 'Attic', power: 40 },
];

@Component({
  imports: [
    PctDataTable,
    PctTableGrid,
    PctTableSelection,
    PctTableDetails,
    PctCellTemplate,
    PctDetailsTemplate,
  ],
  template: `
    <pct-data-table
      pctTableSelection
      [readonly]="locked()"
      pctTableDetails
      rowNumbers
      [pctTableGrid]="columns"
      [(focused)]="focused"
      [(range)]="range"
      [rows]="rows()"
      [columns]="columns"
      [rowId]="byId"
      caption="Devices"
    >
      <ng-template [pctCell]="columns" pctCellOf="room" let-device>
        <button type="button" class="go">Go</button>
        <input class="note" aria-label="Note" />
      </ng-template>
      <ng-template [pctCell]="columns" pctCellOf="power" let-device>
        <button type="button" class="power">{{ device.power }}</button>
      </ng-template>
      <ng-template [pctDetails]="columns" let-device>{{
        device.room
      }}</ng-template>
    </pct-data-table>
  `,
})
class Host {
  readonly table = viewChild.required(PctDataTable<Device>);
  readonly selection = viewChild.required(PctTableSelection);
  readonly columns = columns;
  readonly byId = byId;
  readonly rows = signal(DEVICES);
  readonly locked = signal(false);
  readonly focused = signal<PctTableGridCell<Id> | null>(null);
  readonly range = signal<PctTableCellRange<Id> | null>(null);
}

@Component({
  imports: [PctDataTable, PctTableGrid, PctTableColumns],
  template: `
    <pct-data-table
      [pctTableGrid]="columns"
      [pctTableColumns]="columns"
      [(layout)]="layout"
      [rows]="rows"
      [columns]="columns"
      [rowId]="byId"
      caption="Devices"
    />
  `,
})
class BareHost {
  readonly columns = columns;
  readonly byId = byId;
  readonly rows = DEVICES;
  readonly layout = signal<PctTableLayout<Id>>({});
}

@Component({
  imports: [PctDataTable, PctTableGrid],
  template: `
    <pct-data-table
      [pctTableGrid]="columns"
      [rows]="[]"
      [columns]="columns"
      [rowId]="byId"
      caption="Devices"
    />
  `,
})
class EmptyHost {
  readonly columns = columns;
  readonly byId = byId;
}

@Component({
  imports: [PctDataTable, PctTableGrid, PctCellTemplate],
  template: `
    <pct-data-table
      [pctTableGrid]="columns"
      [rows]="rows"
      [columns]="columns"
      [rowId]="byId"
      caption="Devices"
    >
      <ng-template [pctCell]="columns" pctCellOf="room" let-device>
        <button type="button" class="act">Act</button>
        <span class="mine" tabindex="0">{{ device.room }}</span>
      </ng-template>
      <ng-template [pctCell]="columns" pctCellOf="power" let-device>
        <button type="button" class="solo">{{ device.power }}</button>
        <span class="aside" tabindex="-1">W</span>
      </ng-template>
    </pct-data-table>
  `,
})
class OwnHost {
  readonly columns = columns;
  readonly byId = byId;
  readonly rows = DEVICES;
}

@Component({
  imports: [PctDataTable, PctTableGrid, PctCellTemplate],
  template: `
    <pct-data-table
      [pctTableGrid]="columns"
      [rows]="rows"
      [columns]="columns"
      [rowId]="byId"
      caption="Devices"
    >
      <ng-template [pctCell]="columns" pctCellOf="room" let-device>
        <button type="button" [attr.tabindex]="current() === 0 ? 0 : -1">
          On
        </button>
        <button type="button" [attr.tabindex]="current() === 1 ? 0 : -1">
          Off
        </button>
      </ng-template>
    </pct-data-table>
  `,
})
class RovingHost {
  readonly columns = columns;
  readonly byId = byId;
  readonly rows = DEVICES.slice(0, 1);
  readonly current = signal(0);
}

let errors: unknown[] = [];
const spanned = col.of([
  col.key('name', {
    header: 'Name',
    colSpan: (device) => (device.id === 1 ? 1 : device.id),
  }),
  col.key('room', { header: 'Room' }),
  col.key('power', { header: 'Power', kind: { number: { unit: 'W' } } }),
]);

@Component({
  imports: [
    PctDataTable,
    PctTableGrid,
    PctTableSelection,
    PctTableColumns,
    PctCellTemplate,
  ],
  template: `
    <pct-data-table
      pctTableSelection
      [pctTableGrid]="columns"
      [(focused)]="focused"
      [pctTableColumns]="columns"
      [(layout)]="layout"
      [rows]="rows"
      [columns]="columns"
      [rowId]="byId"
      caption="Devices"
    >
      <ng-template [pctCell]="columns" pctCellOf="name" let-device>
        <b>{{ device.name }}</b>
      </ng-template>
    </pct-data-table>
  `,
})
class SpanHost {
  readonly columns = spanned;
  readonly byId = byId;
  readonly rows = DEVICES;
  readonly focused = signal<PctTableGridCell<Id> | null>(null);
  readonly layout = signal<PctTableLayout<Id>>({});
}

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
  // Every line 20 px tall: a view of 100 px under a header of 20 holds four.
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
/** The cell of a line — the header's first, then the rows — at its place among the cells. */
const cell = (line: number, c: number) =>
  table().rows[line].cells[c] as HTMLTableCellElement;
const active = () => document.activeElement as HTMLElement;

/** A key pressed on the element with the focus. */
async function press(
  fixture: ComponentFixture<unknown>,
  key: string,
  init: KeyboardEventInit = {},
  target: Element = active(),
): Promise<KeyboardEvent> {
  const event = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
    ...init,
  });
  target.dispatchEvent(event);
  await settle(fixture);
  return event;
}

/** The elements in the tab order of the grid. */
const stops = () =>
  Array.from(table().querySelectorAll<HTMLElement>('[tabindex="0"]'));

describe('PctTableGrid — the table as a grid', () => {
  it("is a grid of every column and the leading ones, with one stop: the first row's first cell", async () => {
    await render(Host);
    expect(table().getAttribute('role')).toBe('grid');
    expect(table().getAttribute('aria-colcount')).toBe('6');
    expect(table().getAttribute('aria-multiselectable')).toBe('true');
    expect(table().getAttribute('tabindex')).toBe('-1');
    // The frame scrolls with the cells: it is no stop of its own.
    expect(table().parentElement?.hasAttribute('tabindex')).toBe(false);
    expect(
      Array.from(table().querySelectorAll('thead th[data-pct-column]')).map(
        (th) => th.getAttribute('data-pct-column'),
      ),
    ).toEqual(['name', 'room', 'power']);
    // The checkbox alone in the first cell holds the stop; every cell and control else is out.
    expect(stops()).toEqual([cell(1, 0).querySelector('input')]);
    expect(cell(1, 0).getAttribute('tabindex')).toBe('-1');
    expect(cell(1, 3).getAttribute('tabindex')).toBe('-1');
    expect(cell(1, 4).querySelector('.go')?.getAttribute('tabindex')).toBe(
      '-1',
    );
    expect(cell(1, 4).querySelector('.note')?.getAttribute('tabindex')).toBe(
      '-1',
    );
    // No column hidden: the cells stand where they are drawn.
    expect(cell(1, 3).hasAttribute('aria-colindex')).toBe(false);
    // Rows can be picked: each says whether it is.
    expect(table().tBodies[0].rows[0].getAttribute('aria-selected')).toBe(
      'false',
    );
    expect(table().tHead?.rows[0].hasAttribute('aria-selected')).toBe(false);
  });

  it('leaves the table as it was without the directive: no role, no count, no names', async () => {
    @Component({
      imports: [PctDataTable],
      template: `<pct-data-table
        [rows]="rows"
        [columns]="columns"
        [rowId]="byId"
        caption="Devices"
      />`,
    })
    class Plain {
      readonly columns = columns;
      readonly byId = byId;
      readonly rows = DEVICES;
    }
    await render(Plain);
    expect(table().hasAttribute('role')).toBe(false);
    expect(table().hasAttribute('aria-colcount')).toBe(false);
    expect(table().querySelector('[data-pct-column]')).toBeNull();
  });

  it('moves by the arrows, along a row and across them, keeping the column', async () => {
    const fixture = await render(Host);
    stops()[0].focus();
    await press(fixture, 'ArrowRight');
    expect(active()).toBe(cell(1, 1).querySelector('button'));
    await press(fixture, 'ArrowRight');
    expect(active()).toBe(cell(1, 2));
    await press(fixture, 'ArrowRight');
    expect(active()).toBe(cell(1, 3));
    expect(fixture.componentInstance.focused()).toEqual({
      row: 1,
      column: 'name',
    });
    expect(stops()).toEqual([cell(1, 3)]);
    expect(cell(1, 0).querySelector('input')?.getAttribute('tabindex')).toBe(
      '-1',
    );
    await press(fixture, 'ArrowDown');
    expect(active()).toBe(cell(2, 3));
    await press(fixture, 'ArrowLeft');
    expect(active()).toBe(cell(2, 2));
    await press(fixture, 'ArrowUp');
    await press(fixture, 'ArrowUp');
    // The header's number column holds no control: the cell has the stop.
    expect(active()).toBe(cell(0, 2));
    expect(fixture.componentInstance.focused()).toEqual({
      row: null,
      column: '#number',
    });
    const up = await press(fixture, 'ArrowUp');
    expect(up.defaultPrevented).toBe(true);
    expect(active()).toBe(cell(0, 2));
  });

  it('goes to the ends of a row with Home and End, and of the grid with Ctrl or ⌘', async () => {
    const fixture = await render(Host);
    cell(2, 3).focus();
    await press(fixture, 'End');
    expect(active()).toBe(cell(2, 5).querySelector('.power'));
    expect(fixture.componentInstance.focused()).toEqual({
      row: 2,
      column: 'power',
    });
    await press(fixture, 'Home');
    expect(active()).toBe(cell(2, 0).querySelector('input'));
    await press(fixture, 'End', { ctrlKey: true });
    expect(active()).toBe(cell(3, 5).querySelector('.power'));
    await press(fixture, 'Home', { metaKey: true });
    // The header's checkbox, which picks every row.
    expect(active()).toBe(cell(0, 0).querySelector('input'));
    expect(fixture.componentInstance.focused()).toEqual({
      row: null,
      column: '#select',
    });
  });

  it('moves by what the frame shows with Page Up and Page Down', async () => {
    const fixture = await render(Host);
    cell(0, 3).focus();
    // A frame of 100 px, the header 20, a line 20: four lines to a page.
    await press(fixture, 'PageDown');
    expect(active()).toBe(cell(3, 3));
    await press(fixture, 'PageUp');
    expect(active()).toBe(cell(0, 3).querySelector('button'));
  });

  it('turns the horizontal arrows in a right-to-left table', async () => {
    const fixture = await render(Host);
    cell(1, 3).focus();
    const style = vi
      .spyOn(window, 'getComputedStyle')
      .mockReturnValue({ direction: 'rtl' } as CSSStyleDeclaration);
    await press(fixture, 'ArrowLeft');
    expect(active()).toBe(cell(1, 4));
    await press(fixture, 'ArrowRight');
    expect(active()).toBe(cell(1, 3));
    style.mockRestore();
  });

  it('leaves other keys, and an arrow with Alt, to the browser', async () => {
    const fixture = await render(Host);
    cell(1, 3).focus();
    for (const [key, init] of [
      ['ArrowDown', { altKey: true }],
      ['ArrowDown', { ctrlKey: true }],
      ['x', {}],
      ['Enter', {}],
    ] as const) {
      const event = await press(fixture, key, init);
      expect(event.defaultPrevented).toBe(false);
      expect(active()).toBe(cell(1, 3));
    }
    // A key another handler took is not the grid's.
    const taken = new KeyboardEvent('keydown', {
      key: 'ArrowDown',
      bubbles: true,
      cancelable: true,
    });
    taken.preventDefault();
    active().dispatchEvent(taken);
    await settle(fixture);
    expect(active()).toBe(cell(1, 3));
  });

  it('steps into a cell of several controls with Enter or F2, and out with Escape or F2', async () => {
    const fixture = await render(Host);
    cell(1, 4).focus();
    expect(stops()).toEqual([cell(1, 4)]);
    const go = cell(1, 4).querySelector('.go') as HTMLElement;
    const note = cell(1, 4).querySelector('.note') as HTMLElement;
    const into = await press(fixture, 'Enter');
    expect(into.defaultPrevented).toBe(true);
    expect(active()).toBe(go);
    // In the tab order again, as they were.
    expect(go.hasAttribute('tabindex')).toBe(false);
    expect(note.hasAttribute('tabindex')).toBe(false);
    note.focus();
    // Its keys are the field's.
    const arrow = await press(fixture, 'ArrowLeft');
    expect(arrow.defaultPrevented).toBe(false);
    expect(active()).toBe(note);
    const out = await press(fixture, 'Escape');
    expect(out.defaultPrevented).toBe(true);
    expect(active()).toBe(cell(1, 4));
    expect(go.getAttribute('tabindex')).toBe('-1');
    await press(fixture, 'F2');
    expect(active()).toBe(go);
    const other = await press(fixture, 'x');
    expect(other.defaultPrevented).toBe(false);
    await press(fixture, 'F2');
    expect(active()).toBe(cell(1, 4));
    expect(note.getAttribute('tabindex')).toBe('-1');
  });

  it('takes a control clicked in a cell of several as the cell stepped into, until the focus leaves it', async () => {
    const fixture = await render(Host);
    const note = cell(2, 4).querySelector('.note') as HTMLElement;
    note.focus();
    await settle(fixture);
    expect(fixture.componentInstance.focused()).toEqual({
      row: 2,
      column: 'room',
    });
    expect(note.hasAttribute('tabindex')).toBe(false);
    expect(cell(2, 4).getAttribute('tabindex')).toBe('0');
    // Within the cell, it stays stepped into.
    (cell(2, 4).querySelector('.go') as HTMLElement).focus();
    await settle(fixture);
    expect(note.hasAttribute('tabindex')).toBe(false);
    cell(2, 3).focus();
    await settle(fixture);
    expect(note.getAttribute('tabindex')).toBe('-1');
  });

  it('leaves a cell stepped into when the focus comes back to the cell itself', async () => {
    const fixture = await render(Host);
    const note = cell(2, 4).querySelector('.note') as HTMLElement;
    note.focus();
    await settle(fixture);
    expect(note.hasAttribute('tabindex')).toBe(false);
    // A script, or a click beside the controls: the cell is left, with no render to wait for.
    cell(2, 4).focus();
    expect(note.getAttribute('tabindex')).toBe('-1');
    await press(fixture, 'ArrowDown');
    expect(active()).toBe(cell(3, 4));
  });

  it('leaves the focus where it went when it leaves a cell stepped into: the stop does not take it back', async () => {
    const fixture = await render(Host);
    const note = cell(2, 4).querySelector('.note') as HTMLElement;
    const outside = document.body.appendChild(document.createElement('button'));
    try {
      note.focus();
      await settle(fixture);
      outside.focus();
      await settle(fixture);
      expect(active()).toBe(outside);
      note.focus();
      await settle(fixture);
      // A press on the page's text: the focus goes nowhere, and stays there.
      note.blur();
      await settle(fixture);
      expect(active()).toBe(document.body);
      expect(note.getAttribute('tabindex')).toBe('-1');
    } finally {
      outside.remove();
    }
  });

  it("hands the focus on to a cell's lone control, and steps into no cell without one", async () => {
    const fixture = await render(Host);
    cell(2, 0).focus();
    await settle(fixture);
    expect(active()).toBe(cell(2, 0).querySelector('input'));
    cell(2, 3).focus();
    const enter = await press(fixture, 'Enter');
    expect(enter.defaultPrevented).toBe(false);
    expect(active()).toBe(cell(2, 3));
    // A lone control keeps Enter: the button presses.
    (cell(2, 5).querySelector('.power') as HTMLElement).focus();
    const press2 = await press(fixture, 'Enter');
    expect(press2.defaultPrevented).toBe(false);
  });

  it('stretches a range with Shift over data cells, and lets it go on a move without Shift', async () => {
    const fixture = await render(Host);
    cell(1, 3).focus();
    await press(fixture, 'ArrowDown', { shiftKey: true });
    await press(fixture, 'ArrowRight', { shiftKey: true });
    expect(fixture.componentInstance.range()).toEqual({
      from: { row: 1, column: 'name' },
      to: { row: 2, column: 'room' },
    });
    const marked = () =>
      Array.from(table().querySelectorAll('[data-pct-in-range]'));
    expect(marked()).toEqual([cell(1, 3), cell(1, 4), cell(2, 3), cell(2, 4)]);
    expect(cell(1, 3).getAttribute('aria-selected')).toBe('true');
    expect(cell(1, 5).hasAttribute('aria-selected')).toBe(false);
    // Back up to the corner's row: the range shrinks to it.
    await press(fixture, 'ArrowUp', { shiftKey: true });
    expect(fixture.componentInstance.range()).toEqual({
      from: { row: 1, column: 'name' },
      to: { row: 1, column: 'room' },
    });
    expect(marked()).toEqual([cell(1, 3), cell(1, 4)]);
    // The header is no data: a move there with Shift leaves the range where it was.
    await press(fixture, 'ArrowUp', { shiftKey: true });
    expect(active()).toBe(cell(0, 4));
    expect(marked()).toEqual([cell(1, 3), cell(1, 4)]);
    await press(fixture, 'ArrowDown');
    expect(fixture.componentInstance.range()).toBeNull();
    expect(marked()).toEqual([]);
    expect(cell(1, 3).hasAttribute('aria-selected')).toBe(false);
  });

  it('stretches a range with Shift and a press on a data cell, and no other', async () => {
    const fixture = await render(Host);
    cell(1, 3).focus();
    const pointer = (target: Element, shiftKey: boolean) => {
      const event = new MouseEvent('pointerdown', {
        bubbles: true,
        cancelable: true,
        shiftKey,
      });
      target.dispatchEvent(event);
      return event;
    };
    expect(pointer(cell(3, 5), false).defaultPrevented).toBe(false);
    expect(fixture.componentInstance.range()).toBeNull();
    expect(pointer(cell(3, 2), true).defaultPrevented).toBe(false);
    expect(pointer(table(), true).defaultPrevented).toBe(false);
    const press3 = pointer(cell(3, 5), true);
    await settle(fixture);
    expect(press3.defaultPrevented).toBe(true);
    expect(fixture.componentInstance.range()).toEqual({
      from: { row: 1, column: 'name' },
      to: { row: 3, column: 'power' },
    });
    expect(table().querySelectorAll('[data-pct-in-range]').length).toBe(9);
  });

  it('picks every row the filter left with Ctrl+A or ⌘+A, and each row says it is picked', async () => {
    const fixture = await render(Host);
    cell(1, 3).focus();
    const all = await press(fixture, 'a', { ctrlKey: true });
    expect(all.defaultPrevented).toBe(true);
    expect(fixture.componentInstance.table().matchedIds()).toEqual([1, 2, 3]);
    expect(
      Array.from(table().tBodies[0].rows).map((row) =>
        row.getAttribute('aria-selected'),
      ),
    ).toEqual(['true', 'true', 'true']);
    await press(fixture, 'A', { metaKey: true });
    expect(active()).toBe(cell(1, 3));
  });

  it('follows a cell the application sets, and moves the focus there only from within the grid', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.focused.set({ row: 2, column: 'power' });
    await settle(fixture);
    expect(stops()).toEqual([cell(2, 5).querySelector('.power')]);
    expect(active()).toBe(document.body);
    cell(1, 3).focus();
    await settle(fixture);
    fixture.componentInstance.focused.set({ row: 3, column: 'name' });
    await settle(fixture);
    expect(active()).toBe(cell(3, 3));
    // A cell of no row, or of no column, and nothing, leave it where it is.
    for (const set of [
      { row: 9, column: 'name' },
      { row: 1, column: 'gone' },
    ] as PctTableGridCell<Id>[]) {
      fixture.componentInstance.focused.set(set);
      await settle(fixture);
      expect(active()).toBe(cell(3, 3));
    }
    fixture.componentInstance.focused.set(null);
    await settle(fixture);
    expect(stops()).toEqual([cell(3, 3)]);
  });

  it("walks a row's details as a line of one cell, and comes back to the column it left", async () => {
    const fixture = await render(Host);
    (cell(1, 1).querySelector('button') as HTMLElement).click();
    await settle(fixture);
    cell(1, 4).focus();
    await press(fixture, 'ArrowDown');
    // The details, across the table: no row of data, so no cell of the model.
    expect(active()).toBe(cell(2, 0));
    expect(cell(2, 0).colSpan).toBe(6);
    expect(fixture.componentInstance.focused()).toBeNull();
    await press(fixture, 'ArrowRight');
    expect(active()).toBe(cell(2, 0));
    await press(fixture, 'ArrowDown');
    expect(active()).toBe(cell(3, 4));
    expect(fixture.componentInstance.focused()).toEqual({
      row: 2,
      column: 'room',
    });
  });

  it('gives the focus to the line in the place of a row taken away', async () => {
    const fixture = await render(Host);
    cell(2, 3).focus();
    await settle(fixture);
    fixture.componentInstance.rows.set([DEVICES[0], DEVICES[2]]);
    await settle(fixture);
    expect(active()).toBe(cell(2, 3));
    expect(cell(2, 3).textContent?.trim()).toBe('Fan');
  });

  it('lets the focus go when it leaves the grid, and takes nothing back', async () => {
    const fixture = await render(Host);
    const outside = document.createElement('button');
    document.body.append(outside);
    cell(2, 3).focus();
    await settle(fixture);
    outside.focus();
    await settle(fixture);
    fixture.componentInstance.rows.set([...DEVICES]);
    await settle(fixture);
    expect(active()).toBe(outside);
    // Nowhere: the window or the page took it, and the cell stays.
    cell(2, 3).focus();
    await settle(fixture);
    cell(2, 3).blur();
    await Promise.resolve();
    await settle(fixture);
    expect(active()).toBe(document.body);
    outside.remove();
  });

  it('writes nothing onto the cells on a render that changes nothing of them', async () => {
    const fixture = await render(Host);
    cell(1, 4).focus();
    await settle(fixture);
    const observer = new MutationObserver(() => undefined);
    observer.observe(table(), { attributes: true, subtree: true });
    fixture.componentInstance.rows.set([...DEVICES]);
    await settle(fixture);
    const written = observer
      .takeRecords()
      .map((record) => record.attributeName);
    observer.disconnect();
    expect(written).toEqual([]);
  });

  it("counts a cell's own focusable elements among its controls, and gives them their place back", async () => {
    const fixture = await render(OwnHost);
    const room = cell(1, 1);
    const act = room.querySelector('.act') as HTMLElement;
    const mine = room.querySelector('.mine') as HTMLElement;
    // A button and an element of a tab index of its own: two controls, a cell to step into.
    expect(act.getAttribute('tabindex')).toBe('-1');
    expect(mine.getAttribute('tabindex')).toBe('-1');
    room.focus();
    await settle(fixture);
    expect(active()).toBe(room);
    await press(fixture, 'Enter');
    expect(act.hasAttribute('tabindex')).toBe(false);
    expect(mine.getAttribute('tabindex')).toBe('0');
    await press(fixture, 'Escape');
    expect(act.getAttribute('tabindex')).toBe('-1');
    expect(mine.getAttribute('tabindex')).toBe('-1');
    // An element out of the tab order is no control: the button is alone in its cell.
    const power = cell(1, 2);
    const solo = power.querySelector('.solo') as HTMLElement;
    room.focus();
    await press(fixture, 'ArrowRight');
    expect(active()).toBe(solo);
    expect(power.getAttribute('tabindex')).toBe('-1');
    expect(power.querySelector('.aside')?.getAttribute('tabindex')).toBe('-1');
  });

  it('marks no cell for a range whose corner names a row or a column the table has not', async () => {
    const fixture = await render(Host);
    const marked = () =>
      Array.from(table().querySelectorAll('[data-pct-in-range]'));
    const whole: PctTableCellRange<Id> = {
      from: { row: 1, column: 'name' },
      to: { row: 2, column: 'room' },
    };
    fixture.componentInstance.range.set(whole);
    await settle(fixture);
    expect(marked()).toEqual([cell(1, 3), cell(1, 4), cell(2, 3), cell(2, 4)]);
    expect(cell(1, 3).getAttribute('data-pct-in-range')).toBe('');
    const missing = [
      { ...whole, from: { row: 9, column: 'name' } },
      { ...whole, to: { row: 9, column: 'room' } },
      { ...whole, from: { row: 1, column: 'nothing' } },
      { ...whole, to: { row: 2, column: 'nothing' } },
    ] as PctTableCellRange<Id>[];
    for (const range of missing) {
      fixture.componentInstance.range.set(range);
      await settle(fixture);
      expect(marked()).toEqual([]);
    }
  });

  it('lets the focus go to nowhere — another window — and takes it back from no render', async () => {
    const fixture = await render(Host);
    cell(2, 3).focus();
    await settle(fixture);
    // The browser's blur to no element: a focusout of no related target, the cell still drawn.
    cell(2, 3).dispatchEvent(
      new FocusEvent('focusout', { bubbles: true, relatedTarget: null }),
    );
    await Promise.resolve();
    vi.spyOn(document, 'activeElement', 'get').mockReturnValue(document.body);
    const focus = vi.spyOn(HTMLElement.prototype, 'focus');
    fixture.componentInstance.rows.set([...DEVICES]);
    await settle(fixture);
    expect(focus).not.toHaveBeenCalled();
  });

  it('takes a control whose tab index its template moves out of the order again', async () => {
    const fixture = await render(RovingHost);
    const [, two] = Array.from(
      cell(1, 1).querySelectorAll<HTMLElement>('button'),
    );
    expect(stops()).toEqual([cell(1, 0)]);
    fixture.componentInstance.current.set(1);
    await settle(fixture);
    // The template moved its own stop to the second button: the grid takes it all the same.
    expect(stops()).toEqual([cell(1, 0)]);
    expect(two.getAttribute('tabindex')).toBe('-1');
    cell(1, 1).focus();
    await press(fixture, 'Enter');
    // Stepped in, the template's stop is in the order again.
    expect(two.getAttribute('tabindex')).toBe('0');
  });

  it('lets the grid go when the focus moves to the host outside the table', async () => {
    const fixture = await render(Host);
    const own = document.createElement('button');
    document.querySelector('pct-data-table')?.append(own);
    cell(2, 3).focus();
    await settle(fixture);
    own.focus();
    await settle(fixture);
    own.blur();
    fixture.componentInstance.rows.set([...DEVICES]);
    await settle(fixture);
    expect(active()).toBe(document.body);
  });

  it('keeps the stop on its row as rows come before it, and hands it to the next when it goes', async () => {
    const fixture = await render(Host);
    cell(2, 3).focus();
    await settle(fixture);
    const before = [
      { id: 7, name: 'Kettle', room: 'Kitchen', power: 2000 },
      { id: 8, name: 'Radio', room: 'Attic', power: 5 },
    ];
    fixture.componentInstance.rows.set([...before, ...DEVICES]);
    await settle(fixture);
    expect(active().textContent?.trim()).toBe('Boiler');
    fixture.componentInstance.rows.set([...before, DEVICES[0], DEVICES[2]]);
    await settle(fixture);
    expect(active().textContent?.trim()).toBe('Fan');
    expect(fixture.componentInstance.focused()).toEqual({
      row: 3,
      column: 'name',
    });
  });

  it('picks nothing with Ctrl+A while the selection is read-only', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.locked.set(true);
    await settle(fixture);
    cell(1, 3).focus();
    const all = await press(fixture, 'a', { ctrlKey: true });
    expect(all.defaultPrevented).toBe(false);
    expect(
      table().querySelectorAll('tbody tr[aria-selected="true"]'),
    ).toHaveLength(0);
  });

  it("leaves Escape to a control's open popup in a cell stepped into", async () => {
    const fixture = await render(Host);
    cell(1, 4).focus();
    await press(fixture, 'Enter');
    const note = cell(1, 4).querySelector('.note') as HTMLElement;
    note.focus();
    note.setAttribute('aria-expanded', 'true');
    const escape = await press(fixture, 'Escape');
    expect(escape.defaultPrevented).toBe(false);
    expect(active()).toBe(note);
    note.setAttribute('aria-expanded', 'false');
    await press(fixture, 'Escape');
    expect(active()).toBe(cell(1, 4));
  });

  it('says where each cell stands while a column is hidden', async () => {
    const fixture = await render(BareHost);
    fixture.componentInstance.layout.set({ hidden: ['room'] });
    await settle(fixture);
    expect(table().getAttribute('aria-colcount')).toBe('3');
    expect(
      Array.from(table().rows[1].cells).map((one) =>
        one.getAttribute('aria-colindex'),
      ),
    ).toEqual(['1', '3']);
    expect(table().rows[0].cells[1].getAttribute('aria-colindex')).toBe('3');
    // No rows to pick: no row says it is picked or not.
    expect(table().tBodies[0].rows[0].hasAttribute('aria-selected')).toBe(
      false,
    );
    // Without picks, Ctrl+A is the browser's.
    cell(1, 0).focus();
    const all = await press(fixture, 'a', { ctrlKey: true });
    expect(all.defaultPrevented).toBe(false);
  });

  it('holds its stop on the header in a table of no rows', async () => {
    await render(EmptyHost);
    expect(stops()).toEqual([cell(0, 0).querySelector('button')]);
  });

  it('takes the keys on the table itself, when the line that had the focus is gone', async () => {
    const fixture = await render(Host);
    cell(3, 3).focus();
    await settle(fixture);
    table().focus();
    await press(fixture, 'ArrowUp');
    expect(active()).toBe(cell(2, 3));
    // A key from an element of no cell — the caption — is not the grid's.
    const caption = table().querySelector('caption') as HTMLElement;
    const event = await press(fixture, 'ArrowUp', {}, caption);
    expect(event.defaultPrevented).toBe(false);
  });
});

describe('PctTableGrid — a copy', () => {
  /** A copy on the element with the focus, as the platform sends it, and what it put. */
  function copy(init: { prevented?: boolean; clipboard?: boolean } = {}): {
    event: Event;
    text: string | null;
  } {
    const event = new Event('copy', { bubbles: true, cancelable: true });
    const put: { text: string | null } = { text: null };
    Object.defineProperty(event, 'clipboardData', {
      value:
        init.clipboard === false
          ? null
          : {
              setData: (format: string, text: string) => {
                expect(format).toBe('text/plain');
                put.text = text;
              },
            },
    });
    if (init.prevented) event.preventDefault();
    active().dispatchEvent(event);
    return {
      event,
      get text() {
        return put.text;
      },
    };
  }

  it("copies the stop's cell, a number as another program reads it, and says how many", async () => {
    const fixture = await render(Host);
    const announcer = TestBed.inject(PctAnnouncer);
    const announce = vi.spyOn(announcer, 'announce');
    const retract = vi.spyOn(announcer, 'retract');
    fixture.componentInstance.focused.set({ row: 2, column: 'name' });
    await settle(fixture);
    cell(2, 3).focus();
    const first = copy();
    expect(first.event.defaultPrevented).toBe(true);
    expect(first.text).toBe('Boiler');
    expect(announce).toHaveBeenLastCalledWith('Cells copied: 1');
    // The same count again is said again.
    expect(retract).toHaveBeenLastCalledWith('Cells copied: 1');
    fixture.componentInstance.focused.set({ row: 2, column: 'power' });
    await settle(fixture);
    expect(copy().text).toBe('1900');
    expect(announce).toHaveBeenCalledTimes(2);
  });

  it('copies the range, either way it was drawn, before the rows picked', async () => {
    const fixture = await render(Host);
    const host = fixture.componentInstance;
    const announce = vi.spyOn(TestBed.inject(PctAnnouncer), 'announce');
    host.selection().value.set([3]);
    host.range.set({
      from: { row: 2, column: 'power' },
      to: { row: 1, column: 'name' },
    });
    await settle(fixture);
    cell(1, 3).focus();
    expect(copy().text).toBe('Lamp\tKitchen\t12\r\nBoiler\tCellar\t1900');
    expect(announce).toHaveBeenLastCalledWith('Cells copied: 6');
    host.range.set({
      from: { row: 3, column: 'room' },
      to: { row: 3, column: 'room' },
    });
    await settle(fixture);
    expect(copy().text).toBe('Attic');
  });

  it('copies the rows picked, in the order the table shows them, where no range is drawn', async () => {
    const fixture = await render(Host);
    const host = fixture.componentInstance;
    host.selection().value.set([3, 1]);
    host.focused.set({ row: 2, column: 'name' });
    await settle(fixture);
    cell(2, 3).focus();
    expect(copy().text).toBe('Lamp\tKitchen\t12\r\nFan\tAttic\t40');
    // A range of a row no longer drawn copies what there is without it.
    host.range.set({
      from: { row: 9, column: 'name' },
      to: { row: 1, column: 'name' },
    });
    await settle(fixture);
    expect(copy().text).toBe('Lamp\tKitchen\t12\r\nFan\tAttic\t40');
    host.range.set({
      from: { row: 1, column: 'name' },
      to: { row: 1, column: 'seen' as Id },
    });
    await settle(fixture);
    expect(copy().text).toBe('Lamp\tKitchen\t12\r\nFan\tAttic\t40');
  });

  it('leaves a copy to the platform in a field, in text selected, in a cell stepped into, and off the grid', async () => {
    const fixture = await render(Host);
    const host = fixture.componentInstance;
    host.focused.set({ row: 1, column: 'room' });
    await settle(fixture);
    // A field of a cell.
    (cell(1, 4).querySelector('.note') as HTMLElement).focus();
    expect(copy().event.defaultPrevented).toBe(false);
    // Text the user selected.
    cell(1, 3).focus();
    host.focused.set({ row: 1, column: 'name' });
    await settle(fixture);
    const selection = document.getSelection() as Selection;
    selection.selectAllChildren(cell(1, 3));
    expect(copy().event.defaultPrevented).toBe(false);
    selection.removeAllRanges();
    expect(copy().event.defaultPrevented).toBe(true);
    // A copy someone else took, or one with no clipboard.
    expect(copy({ prevented: true }).text).toBeNull();
    expect(copy({ clipboard: false }).event.defaultPrevented).toBe(false);
    // A cell stepped into: its controls are the user's.
    host.focused.set({ row: 1, column: 'room' });
    await settle(fixture);
    cell(1, 4).focus();
    await press(fixture, 'Enter');
    expect(active()).toBe(cell(1, 4).querySelector('.go'));
    expect(copy().event.defaultPrevented).toBe(false);
    await press(fixture, 'Escape');
    // Off the grid.
    (document.activeElement as HTMLElement).blur();
    expect(copy().event.defaultPrevented).toBe(false);
    const outside = document.createElement('button');
    document.body.append(outside);
    outside.focus();
    expect(copy().event.defaultPrevented).toBe(false);
    outside.remove();
  });

  it('writes a text a sheet would run as a formula after an apostrophe, a number as it is', async () => {
    const fixture = await render(Host);
    const host = fixture.componentInstance;
    host.rows.set([{ id: 1, name: '=SUM(A1)', room: '-cold', power: -5 }]);
    host.range.set({
      from: { row: 1, column: 'name' },
      to: { row: 1, column: 'power' },
    });
    await settle(fixture);
    cell(1, 3).focus();
    expect(copy().text).toBe("'=SUM(A1)\t'-cold\t-5");
  });

  it('copies the cells while text is selected outside the table, and leaves an editor its copy', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.focused.set({ row: 1, column: 'name' });
    await settle(fixture);
    const outside = document.createElement('p');
    outside.textContent = 'Elsewhere';
    document.body.append(outside);
    const selection = document.getSelection() as Selection;
    selection.selectAllChildren(outside);
    cell(1, 3).focus();
    expect(copy().text).toBe('Lamp');
    selection.removeAllRanges();
    outside.remove();
    // An editor's own control, whatever it is, copies as the platform copies it.
    const editor = document.createElement('div');
    editor.setAttribute('data-pct-part', 'editor');
    const control = document.createElement('button');
    editor.append(control);
    cell(1, 3).append(editor);
    control.focus();
    expect(copy().event.defaultPrevented).toBe(false);
    editor.remove();
  });

  it('copies nothing where there is no stop', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.focused.set(null);
    await settle(fixture);
    table().focus();
    const { event, text } = copy();
    expect(event.defaultPrevented).toBe(false);
    expect(text).toBeNull();
  });
});

describe('PctDataTable — a cell that spans the columns after it', () => {
  /** A text with its spaces as one kind: a unit stands after a space that does not break. */
  const words = (text: string | null | undefined) =>
    text?.trim().replace(/\s/g, ' ');
  /** A row's cells: their text, and how many columns each takes. */
  const drawn = (line: number) =>
    Array.from(table().rows[line].cells)
      .slice(1)
      .map((cell) => [words(cell.textContent), cell.colSpan]);
  /** The words a row's checkbox is named by. */
  const named = (line: number) =>
    (
      table()
        .rows[line].querySelector('[data-pct-part="select"]')
        ?.getAttribute('aria-labelledby') as string
    )
      .split(' ')
      .map((id) => words(document.getElementById(id)?.textContent));

  it('draws a cell over the columns its row asks for, and none for the ones it covers', async () => {
    await render(SpanHost);
    expect(drawn(1)).toEqual([
      ['Lamp', 1],
      ['Kitchen', 1],
      ['12 W', 1],
    ]);
    expect(table().rows[1].cells[1].hasAttribute('colspan')).toBe(false);
    expect(drawn(2)).toEqual([
      ['Boiler', 2],
      ['1,900 W', 1],
    ]);
    // An ask past the row's last column stops there.
    expect(drawn(3)).toEqual([['Fan', 3]]);
  });

  it('names a row by its first cell of text that is drawn', async () => {
    await render(SpanHost);
    expect(named(1)).toEqual(['Select', 'Kitchen']);
    expect(named(2)).toEqual(['Select', '1,900 W']);
    // Every text covered: the first cell names the row.
    expect(named(3)).toEqual(['Select', 'Fan']);
  });

  it('stops a span before a pinned column, and spans no pinned cell', async () => {
    const fixture = await render(SpanHost);
    fixture.componentInstance.layout.set({ pinned: { end: ['power'] } });
    await settle(fixture);
    expect(drawn(3)).toEqual([
      ['Fan', 2],
      ['40 W', 1],
    ]);
    fixture.componentInstance.layout.set({ pinned: { start: ['name'] } });
    await settle(fixture);
    expect(drawn(2)).toEqual([
      ['Boiler', 1],
      ['Cellar', 1],
      ['1,900 W', 1],
    ]);
  });

  it('puts the stop on the cell covering the column, naming it by its own, and keeps the column asked for', async () => {
    const fixture = await render(SpanHost);
    const power = cell(1, 3);
    power.focus();
    power.click();
    await settle(fixture);
    expect(fixture.componentInstance.focused()).toEqual({
      row: 1,
      column: 'power',
    });
    await press(fixture, 'ArrowDown');
    await press(fixture, 'ArrowDown');
    expect(active()).toBe(cell(3, 1));
    expect(fixture.componentInstance.focused()).toEqual({
      row: 3,
      column: 'name',
    });
    await press(fixture, 'ArrowUp');
    expect(active()).toBe(cell(2, 2));
    expect(fixture.componentInstance.focused()).toEqual({
      row: 2,
      column: 'power',
    });
  });
});
