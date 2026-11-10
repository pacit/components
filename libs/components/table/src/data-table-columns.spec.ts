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
import { PctTableColumnChooser } from './column-chooser';
import { PctDataTable } from './data-table';
import { PctTableColumns } from './data-table-columns';
import { PctTableColumnFilters } from './data-table-filters';
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
  col.key('name', { header: 'Name', minWidth: 120 }),
  col.key('room', { header: 'Room', width: 150 }),
  col.key('power', { header: 'Power', kind: { number: { unit: 'W' } } }),
]);
type Map = typeof columns extends { readonly __map?: infer M } ? M : never;
type Layout = PctTableLayout<keyof Map & string>;
const byId = (device: Device) => device.id;
const DEVICES: Device[] = [
  { id: 1, name: 'Lamp', room: 'Kitchen', power: 12 },
  { id: 2, name: 'Boiler', room: 'Cellar', power: 1900 },
];

@Component({
  imports: [
    PctDataTable,
    PctTableColumns,
    PctTableColumnChooser,
    PctCellTemplate,
  ],
  template: `
    <pct-table-column-chooser [columns]="columns" [(layout)]="layout" />
    <pct-data-table
      [pctTableColumns]="columns"
      [(layout)]="layout"
      [rows]="rows"
      [columns]="columns"
      [rowId]="byId"
      [rowNumbers]="numbers()"
      [(filter)]="filter"
      caption="Devices"
    >
      <ng-template [pctCell]="columns" pctCellOf="room" let-device>
        <b class="room">{{ device.room }}</b>
      </ng-template>
    </pct-data-table>
  `,
})
class Host {
  readonly table = viewChild.required(PctDataTable<Device>);
  readonly laying = viewChild.required(PctTableColumns<Device, Map>);
  readonly columns = columns;
  readonly byId = byId;
  readonly rows = DEVICES;
  readonly layout = signal<Layout>({});
  readonly numbers = signal(false);
  readonly filter = signal('');
}

@Component({
  imports: [PctTableColumnChooser],
  template: `
    <h2 id="columns-heading">Columns</h2>
    <pct-table-column-chooser
      [columns]="columns"
      ariaLabel="The table's columns"
      ariaLabelledby="columns-heading"
    />
  `,
})
class NamedChooserHost {
  readonly columns = columns;
}

@Component({
  imports: [PctDataTable, PctTableColumns, PctDetailsTemplate],
  template: `
    <pct-data-table
      [pctTableColumns]="columns"
      [rows]="rows"
      [columns]="columns"
      [rowId]="byId"
      caption="Devices"
    >
      <ng-template [pctDetails]="columns" let-device>{{
        device.room
      }}</ng-template>
    </pct-data-table>
  `,
})
class DetailsHost {
  readonly columns = columns;
  readonly byId = byId;
  readonly rows = DEVICES;
}

@Component({
  imports: [PctDataTable],
  template: `
    <pct-data-table
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
}

@Component({
  imports: [
    PctDataTable,
    PctTableColumns,
    PctTableColumnFilters,
    PctTableSelection,
  ],
  template: `
    <pct-data-table
      pctTableSelection
      [pctTableColumnFilters]="columns"
      [pctTableColumns]="columns"
      [(layout)]="layout"
      [rows]="rows"
      [columns]="columns"
      [rowId]="byId"
      rowNumbers
      caption="Devices"
    />
  `,
})
class LeadHost {
  readonly columns = columns;
  readonly byId = byId;
  readonly rows = DEVICES;
  readonly layout = signal<Layout>({});
}

let errors: unknown[] = [];
const globals = globalThis as {
  ResizeObserver?: unknown;
  IntersectionObserver?: unknown;
};

/** The width each header cell is drawn at, by its column's id; a leading cell is 24. */
let drawnAt: Record<string, number> = {};
/** The width a header cell asks for while the table is measured for its content. */
let askedFor: Record<string, number> = {};

beforeEach(() => {
  drawnAt = { name: 120, room: 150, power: 130 };
  askedFor = { name: 173.2, room: 61, power: 130.4 };
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
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(
    function (this: HTMLElement) {
      let width = 0;
      if (this.tagName === 'TH' && this.closest('thead')) {
        const id = this.dataset['pctColumn'];
        const sizing = this.closest('table')?.hasAttribute('data-pct-sizing');
        width =
          id === undefined ? 24 : sizing ? askedFor[id] : (drawnAt[id] ?? 0);
      }
      return {
        width,
        height: 20,
        top: 0,
        left: 0,
        right: width,
        bottom: 20,
      } as DOMRect;
    },
  );
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
const headers = () =>
  Array.from(table().tHead?.rows[0].cells ?? []).map((cell) =>
    cell.hasAttribute('data-pct-column')
      ? (cell.dataset['pctColumn'] as string)
      : (cell.textContent ?? '').trim(),
  );
const head = (id: string) =>
  table().querySelector(`th[data-pct-column="${id}"]`) as HTMLElement;
const firstRow = () => table().tBodies[0].rows[0];
const options = (header: string) =>
  table().querySelector(
    `[data-pct-part="options"][aria-label="Options for ${header}"]`,
  ) as HTMLButtonElement;
const separator = (header: string) =>
  table().querySelector(
    `[data-pct-part="separator"][aria-label="Resize ${header}"]`,
  ) as HTMLElement;
const items = () =>
  Array.from(document.querySelectorAll<HTMLButtonElement>('[role="menuitem"]'));
const item = (text: string) =>
  items().find((one) => (one.textContent ?? '').trim() === text) as
    HTMLButtonElement | undefined;

async function menu(
  fixture: ComponentFixture<unknown>,
  header: string,
): Promise<void> {
  options(header).click();
  await settle(fixture);
}

async function choose(
  fixture: ComponentFixture<unknown>,
  header: string,
  command: string,
): Promise<void> {
  await menu(fixture, header);
  (item(command) as HTMLButtonElement).click();
  await settle(fixture);
}

async function press(
  fixture: ComponentFixture<unknown>,
  target: Element,
  key: string,
  init: KeyboardEventInit = {},
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

describe('PctTableColumns — the table laid out', () => {
  it('leaves a table without it as it was: no widths, no pins, no buttons', async () => {
    await render(BareHost);
    expect(table().querySelector('colgroup')).toBeNull();
    expect(table().classList.contains('pct-data-table__laid')).toBe(false);
    expect(table().style.getPropertyValue('--_min')).toBe('');
    expect(table().querySelector('[data-pct-pinned]')).toBeNull();
    expect(table().querySelector('[data-pct-column]')).toBeNull();
    expect(table().querySelector('[data-pct-part="separator"]')).toBeNull();
    const th = table().tHead?.rows[0].cells[0] as HTMLElement;
    expect(th.classList.contains('pct-data-table__acting')).toBe(false);
    expect(th.style.getPropertyValue('--_actions')).toBe('');
    expect(th.hasAttribute('aria-label')).toBe(false);
  });

  it('lays the table out at its columns widths: a col each, a share for those with none', async () => {
    await render(Host);
    expect(table().classList.contains('pct-data-table__laid')).toBe(true);
    const cols = Array.from(table().querySelectorAll('colgroup > col'));
    expect(cols.map((one) => (one as HTMLElement).style.inlineSize)).toEqual([
      '',
      '150px',
      '',
    ]);
    // Two shares at 160, wider than `name`'s 120, beside `room`'s 150.
    expect(table().style.getPropertyValue('--_min')).toBe(
      'calc(470px + 0 * var(--pct-table-toggle-target-min) + 0 * var(--_number))',
    );
    expect(table().style.getPropertyValue('--_digits')).toBe('1');
    // A column shares, so the table takes the frame's width.
    expect(table().style.getPropertyValue('--_width')).toBe('');
  });

  it('is as wide as its columns when every column shown has a width: the frame stretches none', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.layout.set({ widths: { name: 200, power: 130 } });
    await settle(fixture);
    expect(table().style.getPropertyValue('--_width')).toBe(
      'calc(480px + 0 * var(--pct-table-toggle-target-min) + 0 * var(--_number))',
    );
    // A share shown again gives the frame back.
    fixture.componentInstance.layout.set({ widths: { name: 200 } });
    await settle(fixture);
    expect(table().style.getPropertyValue('--_width')).toBe('');
    // The column with no width hidden, the rest have one.
    fixture.componentInstance.layout.set({
      widths: { name: 200 },
      hidden: ['power'],
    });
    await settle(fixture);
    expect(table().style.getPropertyValue('--_width')).toBe(
      'calc(350px + 0 * var(--pct-table-toggle-target-min) + 0 * var(--_number))',
    );
  });

  it('gives the column of disclosures a col of its own, before the columns laid out', async () => {
    await render(DetailsHost);
    const cols = Array.from(table().querySelectorAll('colgroup > col'));
    expect(cols.map((one) => one.className)).toEqual([
      'pct-data-table__toggle-col',
      '',
      '',
      '',
    ]);
    expect(table().style.getPropertyValue('--_min')).toBe(
      'calc(470px + 1 * var(--pct-table-toggle-target-min) + 0 * var(--_number))',
    );
  });

  it("gives each header its buttons and its name, and names the header's column", async () => {
    await render(Host);
    expect(headers()).toEqual(['name', 'room', 'power']);
    const th = head('name');
    expect(th.classList.contains('pct-data-table__acting')).toBe(true);
    expect(th.style.getPropertyValue('--_actions')).toBe('2');
    expect(th.getAttribute('aria-label')).toBe('Name');
    expect(options('Name').getAttribute('aria-haspopup')).toBe('menu');
    const line = separator('Name');
    expect(line.getAttribute('role')).toBe('separator');
    expect(line.getAttribute('aria-orientation')).toBe('vertical');
    expect(line.tabIndex).toBe(0);
    expect(line.getAttribute('aria-valuemin')).toBe('120');
    expect(line.getAttribute('aria-valuemax')).toBe('2000');
  });

  it('says a width of its own, or the share the table drew, in the separator', async () => {
    await render(Host);
    expect(separator('Room').getAttribute('aria-valuenow')).toBe('150');
    expect(separator('Room').getAttribute('aria-valuetext')).toBe('150 pixels');
    expect(separator('Power').getAttribute('aria-valuenow')).toBe('130');
    expect(separator('Power').getAttribute('aria-valuetext')).toBe(
      '130 pixels',
    );
  });

  it('reads the widths again when the table is resized, rounding a share to the pixel', async () => {
    let resize: () => void = () => undefined;
    globals.ResizeObserver = class {
      constructor(callback: () => void) {
        resize = callback;
      }
      observe(): void {
        // Reported by hand.
      }
      disconnect(): void {
        // Nothing to let go.
      }
    };
    const fixture = await render(Host);
    drawnAt['power'] = 141.6;
    resize();
    await settle(fixture);
    expect(separator('Power').getAttribute('aria-valuenow')).toBe('142');
  });

  it('draws the columns, their cells and their templates in the order of the layout', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.layout.set({ order: ['power', 'room', 'name'] });
    await settle(fixture);
    expect(headers()).toEqual(['power', 'room', 'name']);
    const cells = Array.from(firstRow().cells).map((cell) =>
      (cell.textContent ?? '').trim(),
    );
    expect(cells).toEqual(['12\u00a0W', 'Kitchen', 'Lamp']);
    expect(firstRow().cells[1].querySelector('b.room')).not.toBeNull();
    // The first column's cell is the indented one, wherever it came from.
    expect(
      firstRow().cells[0].classList.contains('pct-data-table__first'),
    ).toBe(true);
    expect(
      Array.from(table().querySelectorAll('colgroup > col')).map(
        (one) => (one as HTMLElement).style.inlineSize,
      ),
    ).toEqual(['', '150px', '']);
  });

  it('takes a hidden column out: no header, no cell, and the quick filter does not read it', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.layout.set({ hidden: ['room'] });
    await settle(fixture);
    expect(headers()).toEqual(['name', 'power']);
    expect(firstRow().cells.length).toBe(2);
    fixture.componentInstance.filter.set('cellar');
    await settle(fixture);
    expect(fixture.componentInstance.table().matched()).toBe(0);
    fixture.componentInstance.layout.set({});
    await settle(fixture);
    expect(fixture.componentInstance.table().matched()).toBe(1);
  });

  it('lays a layout older than its columns out, passing over what is gone', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.layout.set(
      JSON.parse(
        '{"order":["gone","power","name"],"widths":{"gone":10,"name":"wide"},"hidden":["gone"]}',
      ),
    );
    await settle(fixture);
    expect(headers()).toEqual(['power', 'room', 'name']);
  });

  it('pins a column: it and the leading cells stick at the start, the last casts the shade', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.numbers.set(true);
    fixture.componentInstance.layout.set({ pinned: { start: ['room'] } });
    await settle(fixture);
    expect(headers()).toEqual(['#Row', 'room', 'name', 'power']);
    const [number, room, name] = Array.from(table().tHead?.rows[0].cells ?? []);
    expect(number.getAttribute('data-pct-pinned')).toBe('start');
    expect(number.style.getPropertyValue('--_at')).toBe('0px');
    expect(room.getAttribute('data-pct-pinned')).toBe('start edge');
    expect(room.style.getPropertyValue('--_at')).toBe('24px');
    expect(name.hasAttribute('data-pct-pinned')).toBe(false);
    const cells = Array.from(firstRow().cells);
    expect(cells.map((cell) => cell.getAttribute('data-pct-pinned'))).toEqual([
      'start',
      'start edge',
      null,
      null,
    ]);
    expect(cells[1].style.getPropertyValue('--_at')).toBe('24px');
  });

  it('pins a column to the end: its offset summed from the end, the first casts the shade', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.layout.set({ pinned: { end: ['name', 'room'] } });
    await settle(fixture);
    expect(headers()).toEqual(['power', 'name', 'room']);
    const cells = Array.from(table().tHead?.rows[0].cells ?? []);
    expect(cells.map((cell) => cell.getAttribute('data-pct-pinned'))).toEqual([
      null,
      'end edge',
      'end',
    ]);
    expect(cells.map((cell) => cell.style.getPropertyValue('--_at'))).toEqual([
      '',
      '150px',
      '0px',
    ]);
  });

  it('sums the offsets from the end through the first cell, with every column pinned there', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.layout.set({
      pinned: { end: ['name', 'room', 'power'] },
    });
    await settle(fixture);
    const cells = Array.from(table().tHead?.rows[0].cells ?? []);
    expect(cells.map((cell) => cell.getAttribute('data-pct-pinned'))).toEqual([
      'end edge',
      'end',
      'end',
    ]);
    expect(cells.map((cell) => cell.style.getPropertyValue('--_at'))).toEqual([
      '280px',
      '130px',
      '0px',
    ]);
  });

  it('sticks every leading cell before a start pin, and none before an end pin alone', async () => {
    const fixture = await render(LeadHost);
    fixture.componentInstance.layout.set({ pinned: { start: ['name'] } });
    await settle(fixture);
    // The checkbox's and the number's: no row opens, so there is no disclosure.
    const cells = Array.from(table().tHead?.rows[0].cells ?? []);
    expect(cells.map((cell) => cell.getAttribute('data-pct-pinned'))).toEqual([
      'start',
      'start',
      'start edge',
      null,
      null,
    ]);
    expect(cells.map((cell) => cell.style.getPropertyValue('--_at'))).toEqual([
      '0px',
      '24px',
      '48px',
      '',
      '',
    ]);
    expect(
      Array.from(firstRow().cells).map((cell) =>
        cell.getAttribute('data-pct-pinned'),
      ),
    ).toEqual(['start', 'start', 'start edge', null, null]);
    // The filter's button and the layout's stand beside the label.
    expect(head('name').style.getPropertyValue('--_actions')).toBe('3');
    expect(table().style.getPropertyValue('--_min')).toBe(
      'calc(470px + 1 * var(--pct-table-toggle-target-min) + 1 * var(--_number))',
    );
    fixture.componentInstance.layout.set({ pinned: { end: ['name'] } });
    await settle(fixture);
    expect(
      Array.from(table().tHead?.rows[0].cells ?? []).map((cell) =>
        cell.getAttribute('data-pct-pinned'),
      ),
    ).toEqual([null, null, null, null, 'end edge']);
  });
});

describe('PctTableColumns — the menu', () => {
  it('moves a column one place either way, and not past the ends', async () => {
    const fixture = await render(Host);
    await menu(fixture, 'Name');
    expect((item('Move left') as HTMLButtonElement).disabled).toBe(true);
    expect((item('Move right') as HTMLButtonElement).disabled).toBe(false);
    (item('Move right') as HTMLButtonElement).click();
    // A header the row puts back loses the focus in a browser, which jsdom does not do.
    (document.activeElement as HTMLElement).blur();
    await settle(fixture);
    expect(fixture.componentInstance.layout()).toEqual({
      order: ['room', 'name', 'power'],
    });
    expect(headers()).toEqual(['room', 'name', 'power']);
    expect(document.activeElement).toBe(options('Name'));
    await choose(fixture, 'Name', 'Move left');
    expect(headers()).toEqual(['name', 'room', 'power']);
    await menu(fixture, 'Power');
    expect((item('Move right') as HTMLButtonElement).disabled).toBe(true);
  });

  it('pins a column to either edge and takes it off, offering what it is not', async () => {
    const fixture = await render(Host);
    await menu(fixture, 'Power');
    expect(items().map((one) => (one.textContent ?? '').trim())).toEqual([
      'Move left',
      'Move right',
      'Pin to the start',
      'Pin to the end',
      'Fit to content',
      'Hide column',
    ]);
    (item('Pin to the start') as HTMLButtonElement).click();
    (document.activeElement as HTMLElement).blur();
    await settle(fixture);
    expect(fixture.componentInstance.layout().pinned).toEqual({
      start: ['power'],
      end: [],
    });
    expect(headers()).toEqual(['power', 'name', 'room']);
    expect(document.activeElement).toBe(options('Power'));
    await menu(fixture, 'Power');
    expect(item('Pin to the start')).toBeUndefined();
    (item('Pin to the end') as HTMLButtonElement).click();
    await settle(fixture);
    expect(headers()).toEqual(['name', 'room', 'power']);
    await menu(fixture, 'Power');
    expect(item('Pin to the end')).toBeUndefined();
    (item('Unpin') as HTMLButtonElement).click();
    await settle(fixture);
    expect(fixture.componentInstance.layout().pinned).toEqual({
      start: [],
      end: [],
    });
    await menu(fixture, 'Power');
    expect(item('Unpin')).toBeUndefined();
  });

  it('hides a column and hands the focus to the menu of the one in its place', async () => {
    const fixture = await render(Host);
    await choose(fixture, 'Name', 'Hide column');
    expect(fixture.componentInstance.layout().hidden).toEqual(['name']);
    expect(headers()).toEqual(['room', 'power']);
    expect(document.activeElement).toBe(options('Room'));
    // The last column shown takes the focus from the one before it.
    await choose(fixture, 'Power', 'Hide column');
    expect(document.activeElement).toBe(options('Room'));
    await menu(fixture, 'Room');
    expect((item('Hide column') as HTMLButtonElement).disabled).toBe(true);
  });

  it('hands the focus past a hidden column to the next one shown', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.layout.set({ hidden: ['room'] });
    await settle(fixture);
    await choose(fixture, 'Name', 'Hide column');
    expect(headers()).toEqual(['power']);
    expect(document.activeElement).toBe(options('Power'));
  });

  it('fits a column to what it draws, measured with the layout let go', async () => {
    const fixture = await render(Host);
    await choose(fixture, 'Name', 'Fit to content');
    expect(fixture.componentInstance.layout().widths).toEqual({ name: 174 });
    expect(table().hasAttribute('data-pct-sizing')).toBe(false);
    expect(
      (table().querySelectorAll('colgroup > col')[1] as HTMLElement).style
        .inlineSize,
    ).toBe('150px');
    // `room` asks for less than its narrowest, 120.
    await choose(fixture, 'Room', 'Fit to content');
    expect(fixture.componentInstance.layout().widths).toEqual({
      name: 174,
      room: 120,
    });
  });

  it('fits every column at once, and lays them out as given again on reset', async () => {
    const fixture = await render(Host);
    const laying = fixture.componentInstance.laying();
    laying.fit();
    await settle(fixture);
    expect(fixture.componentInstance.layout().widths).toEqual({
      name: 174,
      room: 120,
      power: 131,
    });
    laying.fit('power');
    await settle(fixture);
    laying.reset();
    await settle(fixture);
    expect(fixture.componentInstance.layout()).toEqual({});
  });
});

describe('PctTableColumns — the separator', () => {
  it('widens a column with the arrow towards the end edge, by 8, and by 32 with Shift', async () => {
    const fixture = await render(Host);
    const line = separator('Room');
    const right = await press(fixture, line, 'ArrowRight');
    expect(right.defaultPrevented).toBe(true);
    expect(fixture.componentInstance.layout().widths).toEqual({ room: 158 });
    await press(fixture, separator('Room'), 'ArrowRight', { shiftKey: true });
    expect(fixture.componentInstance.layout().widths).toEqual({ room: 190 });
    await press(fixture, separator('Room'), 'ArrowLeft');
    expect(fixture.componentInstance.layout().widths).toEqual({ room: 182 });
    expect(separator('Room').getAttribute('aria-valuenow')).toBe('182');
    expect(separator('Room').getAttribute('aria-valuetext')).toBe('182 pixels');
    const other = await press(fixture, separator('Room'), 'ArrowUp');
    expect(other.defaultPrevented).toBe(false);
    expect(fixture.componentInstance.layout().widths).toEqual({ room: 182 });
  });

  it('starts a share from the width it was drawn at, and stops at the narrowest', async () => {
    const fixture = await render(Host);
    await press(fixture, separator('Power'), 'ArrowLeft');
    expect(fixture.componentInstance.layout().widths).toEqual({ power: 122 });
    await press(fixture, separator('Name'), 'ArrowLeft', { shiftKey: true });
    expect(fixture.componentInstance.layout().widths).toEqual({
      power: 122,
      name: 120,
    });
  });

  it('turns the arrows in a right-to-left table', async () => {
    const fixture = await render(Host);
    const style = vi
      .spyOn(window, 'getComputedStyle')
      .mockReturnValue({ direction: 'rtl' } as CSSStyleDeclaration);
    await press(fixture, separator('Room'), 'ArrowLeft');
    expect(fixture.componentInstance.layout().widths).toEqual({ room: 158 });
    await press(fixture, separator('Room'), 'ArrowRight');
    expect(fixture.componentInstance.layout().widths).toEqual({ room: 150 });
    style.mockRestore();
  });

  it('follows a drag of the main button, captured, and lets go at its end', async () => {
    const fixture = await render(Host);
    const capture = vi.fn();
    const line = separator('Room') as HTMLElement & {
      setPointerCapture: (id: number) => void;
    };
    line.setPointerCapture = capture;
    const pointer = (type: string, init: PointerEventInit) => {
      const event = new MouseEvent(type, {
        bubbles: true,
        cancelable: true,
        ...init,
      }) as PointerEvent;
      Object.defineProperty(event, 'pointerId', {
        value: init.pointerId ?? 1,
      });
      separator('Room').dispatchEvent(event);
      return event;
    };
    // A press of another button starts nothing.
    pointer('pointerdown', { button: 2, clientX: 100 });
    pointer('pointermove', { clientX: 140 });
    // A release with no drag lets go of nothing.
    pointer('pointerup', { clientX: 140 });
    await settle(fixture);
    expect(fixture.componentInstance.layout()).toEqual({});
    const down = pointer('pointerdown', { button: 0, clientX: 100 });
    expect(down.defaultPrevented).toBe(true);
    expect(capture).toHaveBeenCalledWith(1);
    pointer('pointermove', { clientX: 140 });
    await settle(fixture);
    expect(fixture.componentInstance.layout().widths).toEqual({ room: 190 });
    // Another pointer is not the drag's.
    pointer('pointermove', { clientX: 300, pointerId: 2 });
    pointer('pointerup', { clientX: 300, pointerId: 2 });
    await settle(fixture);
    expect(fixture.componentInstance.layout().widths).toEqual({ room: 190 });
    pointer('pointermove', { clientX: 80 });
    await settle(fixture);
    expect(fixture.componentInstance.layout().widths).toEqual({ room: 130 });
    pointer('pointerup', { clientX: 80 });
    pointer('pointermove', { clientX: 400 });
    await settle(fixture);
    expect(fixture.componentInstance.layout().widths).toEqual({ room: 130 });
    pointer('pointerdown', { button: 0, clientX: 100 });
    pointer('pointercancel', { clientX: 100 });
    pointer('pointermove', { clientX: 400 });
    await settle(fixture);
    expect(fixture.componentInstance.layout().widths).toEqual({ room: 130 });
  });

  it('drags the other way in a right-to-left table', async () => {
    const fixture = await render(Host);
    const line = separator('Room') as HTMLElement & {
      setPointerCapture: (id: number) => void;
    };
    line.setPointerCapture = vi.fn();
    vi.spyOn(window, 'getComputedStyle').mockReturnValue({
      direction: 'rtl',
    } as CSSStyleDeclaration);
    for (const [type, x] of [
      ['pointerdown', 100],
      ['pointermove', 60],
    ] as const) {
      const event = new MouseEvent(type, {
        bubbles: true,
        button: 0,
        clientX: x,
      });
      Object.defineProperty(event, 'pointerId', { value: 1 });
      line.dispatchEvent(event);
    }
    await settle(fixture);
    expect(fixture.componentInstance.layout().widths).toEqual({ room: 190 });
  });

  it('fits its column on a double press', async () => {
    const fixture = await render(Host);
    separator('Name').dispatchEvent(
      new MouseEvent('dblclick', { bubbles: true }),
    );
    await settle(fixture);
    expect(fixture.componentInstance.layout().widths).toEqual({ name: 174 });
  });
});

describe('PctTableColumnChooser', () => {
  const chooser = () =>
    document.querySelector('pct-table-column-chooser') as HTMLElement;
  const rows = () =>
    Array.from(
      chooser().querySelectorAll<HTMLElement>('[data-pct-part="item"]'),
    );
  const listed = () => rows().map((row) => row.dataset['pctColumn']);
  const row = (id: string) =>
    rows().find((one) => one.dataset['pctColumn'] === id) as HTMLElement;
  const checkbox = (id: string) =>
    row(id).querySelector('input[type="checkbox"]') as HTMLInputElement;
  const up = (id: string) =>
    row(id).querySelector('[data-pct-move="up"]') as HTMLButtonElement;
  const down = (id: string) =>
    row(id).querySelector('[data-pct-move="down"]') as HTMLButtonElement;

  it('names its list as it is told', async () => {
    await render(NamedChooserHost);
    const list = chooser().querySelector('[role="group"]') as HTMLElement;
    expect(list.getAttribute('aria-label')).toBe("The table's columns");
    expect(list.getAttribute('aria-labelledby')).toBe('columns-heading');
  });

  it('leaves its list unnamed when it is told no name', async () => {
    await render(Host);
    const list = chooser().querySelector('[role="group"]') as HTMLElement;
    expect(list.hasAttribute('aria-label')).toBe(false);
    expect(list.hasAttribute('aria-labelledby')).toBe(false);
  });

  it('lists every column in the order the table draws, each shown or not', async () => {
    const fixture = await render(Host);
    expect(listed()).toEqual(['name', 'room', 'power']);
    expect(up('name').getAttribute('aria-label')).toBe('Move Name up');
    expect(down('name').getAttribute('aria-label')).toBe('Move Name down');
    expect(up('name').disabled).toBe(true);
    expect(down('power').disabled).toBe(true);
    fixture.componentInstance.layout.set({
      hidden: ['room'],
      pinned: { start: ['power'] },
    });
    await settle(fixture);
    expect(listed()).toEqual(['power', 'name', 'room']);
    expect(checkbox('room').checked).toBe(false);
    expect(checkbox('name').checked).toBe(true);
    expect(row('power').getAttribute('data-pct-pinned')).toBe('start');
    // The only column at the start moves neither way.
    expect(up('power').disabled).toBe(true);
    expect(down('power').disabled).toBe(true);
  });

  it('hides a column and shows it again, but never the last one shown', async () => {
    const fixture = await render(Host);
    checkbox('room').click();
    await settle(fixture);
    expect(fixture.componentInstance.layout().hidden).toEqual(['room']);
    expect(headers()).toEqual(['name', 'power']);
    checkbox('power').click();
    await settle(fixture);
    expect(checkbox('name').disabled).toBe(true);
    expect(checkbox('room').disabled).toBe(false);
    checkbox('room').click();
    await settle(fixture);
    expect(fixture.componentInstance.layout().hidden).toEqual(['power']);
    expect(checkbox('name').disabled).toBe(false);
  });

  it('moves a column by its buttons, past a hidden one, the focus kept in its row', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.layout.set({ hidden: ['room'] });
    await settle(fixture);
    down('name').focus();
    down('name').click();
    await settle(fixture);
    expect(listed()).toEqual(['room', 'name', 'power']);
    expect(headers()).toEqual(['name', 'power']);
    expect(document.activeElement).toBe(down('name'));
    down('name').click();
    await settle(fixture);
    expect(listed()).toEqual(['room', 'power', 'name']);
    // At the end, the button that brought it there is disabled: the focus goes to the other.
    expect(document.activeElement).toBe(up('name'));
    up('name').click();
    await settle(fixture);
    expect(document.activeElement).toBe(up('name'));
    up('name').click();
    await settle(fixture);
    expect(listed()).toEqual(['name', 'room', 'power']);
    // At the top, the other way.
    expect(document.activeElement).toBe(down('name'));
  });

  it('moves the column with Alt and an arrow from any of its controls', async () => {
    const fixture = await render(Host);
    checkbox('name').focus();
    const moved = await press(fixture, checkbox('name'), 'ArrowDown', {
      altKey: true,
    });
    expect(moved.defaultPrevented).toBe(true);
    expect(listed()).toEqual(['room', 'name', 'power']);
    expect(document.activeElement).toBe(checkbox('name'));
    await press(fixture, checkbox('name'), 'ArrowUp', { altKey: true });
    expect(listed()).toEqual(['name', 'room', 'power']);
    // At the top it stays, and the key is still the chooser's.
    const stuck = await press(fixture, checkbox('name'), 'ArrowUp', {
      altKey: true,
    });
    expect(stuck.defaultPrevented).toBe(true);
    expect(listed()).toEqual(['name', 'room', 'power']);
    for (const init of [{ key: 'ArrowDown' }, { key: 'Home', altKey: true }]) {
      const left = await press(fixture, checkbox('name'), init.key, init);
      expect(left.defaultPrevented).toBe(false);
    }
    expect(listed()).toEqual(['name', 'room', 'power']);
  });

  it('puts the focus on the checkbox when a button moved its column where it moves no more', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.layout.set({ pinned: { end: ['power'] } });
    await settle(fixture);
    // The only column at the end: Alt with an arrow from its button has nowhere to send it,
    // and a press of the button would be refused by its being disabled.
    fixture.componentInstance.layout.set({
      order: ['name', 'room', 'power'],
      pinned: { end: ['room', 'power'] },
    });
    await settle(fixture);
    down('room').focus();
    down('room').click();
    await settle(fixture);
    expect(listed()).toEqual(['name', 'power', 'room']);
    expect(document.activeElement).toBe(up('room'));
  });

  it('pins a column from its menu', async () => {
    const fixture = await render(Host);
    const trigger = row('power').querySelector(
      '[aria-haspopup="menu"]',
    ) as HTMLButtonElement;
    expect(trigger.getAttribute('aria-label')).toBe('Options for Power');
    trigger.click();
    await settle(fixture);
    expect(items().map((one) => (one.textContent ?? '').trim())).toEqual([
      'Pin to the start',
      'Pin to the end',
    ]);
    (item('Pin to the start') as HTMLButtonElement).click();
    // A row the list puts back loses the focus in a browser, which jsdom does not do.
    (document.activeElement as HTMLElement).blur();
    await settle(fixture);
    expect(listed()).toEqual(['power', 'name', 'room']);
    expect(headers()).toEqual(['power', 'name', 'room']);
    expect(document.activeElement).toBe(trigger);
    trigger.click();
    await settle(fixture);
    (item('Unpin') as HTMLButtonElement).click();
    await settle(fixture);
    expect(fixture.componentInstance.layout().pinned).toEqual({
      start: [],
      end: [],
    });
    trigger.click();
    await settle(fixture);
    (item('Pin to the end') as HTMLButtonElement).click();
    await settle(fixture);
    expect(listed()).toEqual(['name', 'room', 'power']);
    expect(row('power').getAttribute('data-pct-pinned')).toBe('end');
  });
});
