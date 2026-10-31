import { NgTemplateOutlet } from '@angular/common';
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
import { By } from '@angular/platform-browser';
import { PctDate } from '@pacit/components/date';
import { PctMultiSelect } from '@pacit/components/select';
import { PctDataTable } from './data-table';
import {
  PctFilterTemplate,
  PctTableColumnFilters,
  PctTableFilterParts,
} from './data-table-filters';
import { PctTableDetails } from './data-table-details';
import { PctTableSelection } from './data-table-selection';
import { PctDetailsTemplate } from './data-table-slots';
import { PctTableWindow } from './data-table-window';
import { pctColumnsOf } from './model/columns';
import type { PctColumnFilters } from './model/filters';

interface Device {
  id: number;
  name: string;
  room: string | null;
  power: number | null;
  on: boolean;
  seen: number;
  floor: number;
}

const col = pctColumnsOf<Device>();
const columns = col.of([
  col.key('name', { header: 'Name' }),
  col.key('room', { header: 'Room', columnFilter: 'values' }),
  col.key('power', { header: 'Power', kind: { number: { unit: 'W' } } }),
  col.key('on', { header: 'On', kind: 'boolean' }),
  col.key('seen', {
    header: 'Seen',
    kind: { instant: { timeZone: 'UTC', format: { day: 'numeric' } } },
  }),
  col.key('floor', {
    header: 'Floor',
    filterBy: (value, own) => value === own,
  }),
]);
type Map = typeof columns extends { readonly __map?: infer M } ? M : never;
const byId = (device: Device) => device.id;
const day = (d: number) => Date.UTC(2026, 9, d, 12);
const DEVICES: Device[] = [
  {
    id: 1,
    name: 'Ceiling lamp',
    room: 'Kitchen',
    power: 12,
    on: true,
    seen: day(1),
    floor: 0,
  },
  {
    id: 2,
    name: 'Boiler',
    room: 'Kitchen',
    power: 1900,
    on: false,
    seen: day(2),
    floor: 0,
  },
  {
    id: 3,
    name: 'Sensor',
    room: 'Hall',
    power: null,
    on: true,
    seen: day(3),
    floor: 1,
  },
  {
    id: 4,
    name: 'Desk lamp',
    room: null,
    power: 40,
    on: false,
    seen: day(4),
    floor: 1,
  },
];

@Component({
  imports: [PctDataTable, PctTableColumnFilters, PctFilterTemplate],
  template: `
    <pct-data-table
      [pctTableColumnFilters]="columns"
      [(columnFilters)]="filters"
      [filterRow]="row()"
      [rows]="rows()"
      [columns]="columns"
      [rowId]="byId"
      caption="Devices"
      [(filter)]="filter"
      [clientFilter]="client()"
      [filterWith]="own()"
    >
      @if (drawFloor()) {
        <ng-template
          [pctFilter]="columns"
          pctFilterOf="floor"
          let-state
          let-set="set"
          let-clear="clear"
          let-column="column"
        >
          <button class="floor" type="button" (click)="set(1)">
            {{ column.header }} {{ state ?? 'any' }}
          </button>
          <button class="floor-clear" type="button" (click)="clear()">x</button>
          <button class="floor-none" type="button" (click)="set(null)">
            -
          </button>
        </ng-template>
      }
    </pct-data-table>
  `,
})
class Host {
  readonly table = viewChild.required(PctDataTable<Device>);
  readonly filtering = viewChild.required(PctTableColumnFilters<Device, Map>);
  readonly columns = columns;
  readonly byId = byId;
  readonly rows = signal<readonly Device[]>(DEVICES);
  readonly filters = signal<PctColumnFilters<Map>>({});
  readonly row = signal(false);
  readonly filter = signal('');
  readonly client = signal(true);
  readonly own = signal<((row: Device, question: string) => boolean) | null>(
    null,
  );
  readonly drawFloor = signal(true);
}

@Component({
  imports: [PctDataTable, PctTableColumnFilters, PctTableWindow],
  template: `
    <pct-data-table
      pctTableWindow
      [pctTableColumnFilters]="columns"
      [filterRow]="row()"
      [rows]="rows"
      [columns]="columns"
      [rowId]="byId"
      caption="Devices"
    />
  `,
})
class WindowHost {
  readonly columns = columns;
  readonly byId = byId;
  readonly rows = DEVICES;
  readonly row = signal(true);
}

/** Every error the application's handler was given: an effect that throws fails its case. */
let errors: unknown[] = [];
let warnings: unknown[][] = [];
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
  vi.spyOn(console, 'warn').mockImplementation((...args) => {
    warnings.push(args);
  });
});

afterEach(() => {
  delete globals.ResizeObserver;
  delete globals.IntersectionObserver;
  vi.restoreAllMocks();
  expect(errors).toEqual([]);
  errors = [];
  warnings = [];
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
}

const names = () =>
  Array.from(
    document.querySelectorAll<HTMLTableRowElement>(
      'tbody > tr:not([data-pct-part])',
    ),
  ).map((row) => (row.cells[0].textContent ?? '').trim());
const buttons = () =>
  Array.from(
    document.querySelectorAll<HTMLButtonElement>('[data-pct-part="filter"]'),
  );
const button = (header: string) =>
  buttons().find((one) =>
    (one.getAttribute('aria-label') as string).startsWith(`Filter ${header}`),
  ) as HTMLButtonElement;
const head = (header: string) => button(header).closest('th') as HTMLElement;
const panel = () =>
  document.querySelector('[role="dialog"]') as HTMLElement | null;

async function type(
  fixture: ComponentFixture<unknown>,
  input: HTMLInputElement,
  text: string,
): Promise<void> {
  input.value = text;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
  await settle(fixture);
}

async function open(
  fixture: ComponentFixture<unknown>,
  header: string,
): Promise<HTMLElement> {
  button(header).click();
  await settle(fixture);
  return panel() as HTMLElement;
}

/** What the directive lends the table: read as the table reads it. */
const lent = (fixture: ComponentFixture<Host>) =>
  (
    fixture.componentInstance.table() as unknown as {
      filters(): {
        test(): unknown;
        words(): ReadonlyMap<string, readonly string[]>;
      };
    }
  ).filters();

/** The parts' handlers, called as their templates call them. */
const partsOf = (fixture: ComponentFixture<unknown>) =>
  fixture.debugElement.query(By.directive(PctTableFilterParts))
    .componentInstance as unknown as {
    setDay(column: unknown, end: string, day: string | null): void;
    clear(column: unknown, panel: HTMLElement): void;
  };

describe('PctTableColumnFilters — each column’s own filter', () => {
  it('gives every column a filter it can hold a button beside its label, outside the sort’s', async () => {
    await render(Host);
    expect(buttons().map((one) => one.getAttribute('aria-label'))).toEqual([
      'Filter Name',
      'Filter Room',
      'Filter Power',
      'Filter On',
      'Filter Seen',
      'Filter Floor',
    ]);
    const filter = button('Name');
    expect(filter.getAttribute('aria-haspopup')).toBe('dialog');
    expect(filter.getAttribute('aria-expanded')).toBe('false');
    expect(filter.closest('[data-pct-part="toggle"]')).toBeNull();
    expect(filter.closest('.pct-data-table__action')).not.toBeNull();
    expect(head('Name').hasAttribute('data-pct-filtered')).toBe(false);
  });

  it('stands after the sort’s button, as on the screen, and names its header by the column alone', async () => {
    await render(Host);
    const th = head('Name');
    const sort = th.querySelector('[data-pct-part="toggle"]') as HTMLElement;
    expect(
      sort.compareDocumentPosition(button('Name')) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(th.getAttribute('aria-label')).toBe('Name');
  });

  it('opens a panel named by the column, with a field of its text, and filters as it is typed', async () => {
    const fixture = await render(Host);
    const dialog = await open(fixture, 'Name');
    expect(button('Name').getAttribute('aria-expanded')).toBe('true');
    expect(dialog.getAttribute('aria-labelledby')).toBeTruthy();
    expect(dialog.textContent).toContain('Filter Name');
    const input = dialog.querySelector('input') as HTMLInputElement;
    await type(fixture, input, 'LAMP');
    expect(fixture.componentInstance.filters()).toEqual({
      name: { text: 'LAMP' },
    });
    expect(names()).toEqual(['Ceiling lamp', 'Desk lamp']);
    expect(fixture.componentInstance.table().matched()).toBe(2);
    expect(head('Name').hasAttribute('data-pct-filtered')).toBe(true);
    expect(button('Name').getAttribute('aria-label')).toBe(
      'Filter Name, filtered',
    );
    expect(button('Name').classList).toContain('pct-data-table__on');
    expect(button('Room').classList).not.toContain('pct-data-table__on');
  });

  it('takes a text filter away when its field is emptied, and keeps one of spaces, which filters nothing', async () => {
    const fixture = await render(Host);
    const input = (await open(fixture, 'Name')).querySelector(
      'input',
    ) as HTMLInputElement;
    await type(fixture, input, ' ');
    expect(fixture.componentInstance.filters()).toEqual({
      name: { text: ' ' },
    });
    expect(head('Name').hasAttribute('data-pct-filtered')).toBe(false);
    expect(names()).toHaveLength(4);
    await type(fixture, input, '');
    expect(fixture.componentInstance.filters()).toEqual({});
  });

  it('clears the column from its panel, the button disabled while there is nothing to clear', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.filters.set({
      name: { text: 'lamp' },
      power: { from: 20, to: null },
    });
    await settle(fixture);
    expect(names()).toEqual(['Desk lamp']);
    const dialog = await open(fixture, 'Name');
    const clear = Array.from(dialog.querySelectorAll('button')).find(
      (one) => one.textContent?.trim() === 'Clear',
    ) as HTMLButtonElement;
    expect(clear.disabled).toBe(false);
    clear.focus();
    clear.click();
    await settle(fixture);
    expect(fixture.componentInstance.filters()).toEqual({
      power: { from: 20, to: null },
    });
    expect(clear.disabled).toBe(true);
    // The press disabled the button it was on: the focus goes to the control, not the page.
    expect(document.activeElement).toBe(dialog.querySelector('input'));
  });

  it('clears a filter of spaces, which filters nothing and is still held', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.filters.set({ name: { text: '  ' } });
    await settle(fixture);
    const dialog = await open(fixture, 'Name');
    const clear = Array.from(dialog.querySelectorAll('button')).find(
      (one) => one.textContent?.trim() === 'Clear',
    ) as HTMLButtonElement;
    expect(clear.disabled).toBe(false);
    clear.click();
    await settle(fixture);
    expect(fixture.componentInstance.filters()).toEqual({});
  });

  it('tells the application only the filters in force', async () => {
    const fixture = await render(Host);
    const host = fixture.componentInstance;
    host.filters.set({
      name: { text: '  ' },
      power: { from: 20, to: null },
      nothing: { text: 'lamp' },
    } as PctColumnFilters<Map>);
    await settle(fixture);
    expect(host.table().columnFilters()).toEqual({
      power: { from: 20, to: null },
    });
  });

  it('shows no rows for a state that went wrong, and stands', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.filters.set({
      name: 'lamp',
      room: { values: 'Kitchen' },
      power: { text: 5 },
      on: null,
    } as unknown as PctColumnFilters<Map>);
    await settle(fixture);
    expect(names()).toEqual([]);
    expect(head('Name').hasAttribute('data-pct-filtered')).toBe(true);
    expect(
      ((await open(fixture, 'Name')).querySelector('input') as HTMLInputElement)
        .value,
    ).toBe('');
  });

  it('shows in its controls a state set from outside', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.filters.set({ name: { text: 'boil' } });
    await settle(fixture);
    const input = (await open(fixture, 'Name')).querySelector(
      'input',
    ) as HTMLInputElement;
    expect(input.value).toBe('boil');
    expect(names()).toEqual(['Boiler']);
  });

  it('filters a number by a range, both ends included, through two fields named by their end', async () => {
    const fixture = await render(Host);
    const dialog = await open(fixture, 'Power');
    const [from, to] = Array.from(dialog.querySelectorAll('input'));
    expect(from.getAttribute('aria-label')).toBe('Power from');
    expect(to.getAttribute('aria-label')).toBe('Power to');
    await type(fixture, from, '12');
    expect(fixture.componentInstance.filters()).toEqual({
      power: { from: 12, to: null },
    });
    expect(names()).toEqual(['Ceiling lamp', 'Boiler', 'Desk lamp']);
    await type(fixture, to, '40');
    expect(fixture.componentInstance.filters()).toEqual({
      power: { from: 12, to: 40 },
    });
    expect(names()).toEqual(['Ceiling lamp', 'Desk lamp']);
    await type(fixture, from, '');
    expect(fixture.componentInstance.filters()).toEqual({
      power: { from: null, to: 40 },
    });
    await type(fixture, to, '');
    expect(fixture.componentInstance.filters()).toEqual({});
  });

  it('filters instants by the days they fall on, through two date fields', async () => {
    const fixture = await render(Host);
    const dialog = await open(fixture, 'Seen');
    expect(dialog.querySelectorAll('pct-date')).toHaveLength(2);
    fixture.componentInstance.filters.set({
      seen: { since: '2026-10-02', until: '2026-10-03' },
    });
    await settle(fixture);
    expect(names()).toEqual(['Boiler', 'Sensor']);
  });

  it('writes a day picked in a date field into the state, and an emptied one out of it', async () => {
    const fixture = await render(Host);
    const parts = partsOf(fixture);
    const seen = columns[4];
    parts.setDay(seen, 'since', '2026-10-03');
    expect(fixture.componentInstance.filters()).toEqual({
      seen: { since: '2026-10-03', until: null },
    });
    parts.setDay(seen, 'until', '2026-10-03');
    expect(fixture.componentInstance.filters()).toEqual({
      seen: { since: '2026-10-03', until: '2026-10-03' },
    });
    await settle(fixture);
    expect(names()).toEqual(['Sensor']);
    parts.setDay(seen, 'since', null);
    parts.setDay(seen, 'until', null);
    expect(fixture.componentInstance.filters()).toEqual({});
  });

  it('keeps the other end of a range of days as each end is set, and takes it away with both', async () => {
    const fixture = await render(Host);
    const parts = partsOf(fixture);
    const seen = columns[4];
    parts.setDay(seen, 'until', '2026-10-04');
    expect(fixture.componentInstance.filters()).toEqual({
      seen: { since: null, until: '2026-10-04' },
    });
    parts.setDay(seen, 'since', '2026-10-02');
    expect(fixture.componentInstance.filters()).toEqual({
      seen: { since: '2026-10-02', until: '2026-10-04' },
    });
    parts.setDay(seen, 'until', null);
    expect(fixture.componentInstance.filters()).toEqual({
      seen: { since: '2026-10-02', until: null },
    });
  });

  it('writes what each control of the panel and of the row says into the state', async () => {
    const fixture = await render(Host);
    const host = fixture.componentInstance;
    host.row.set(true);
    await settle(fixture);
    const row = document.querySelector(
      '.pct-data-table__filters',
    ) as HTMLTableRowElement;
    const [from, to] = Array.from(row.cells[2].querySelectorAll('input'));
    await type(fixture, from, '20');
    await type(fixture, to, '1900');
    expect(host.filters()).toEqual({ power: { from: 20, to: 1900 } });
    host.filters.set({});
    await settle(fixture);
    const dates = (root: Element) =>
      fixture.debugElement
        .queryAll(By.directive(PctDate))
        .filter((one) => root.contains(one.nativeElement))
        .map((one) => one.componentInstance as PctDate);
    const [since, until] = dates(row);
    since.value.set('2026-10-02');
    until.value.set('2026-10-03');
    await settle(fixture);
    expect(host.filters()).toEqual({
      seen: { since: '2026-10-02', until: '2026-10-03' },
    });
    expect(names()).toEqual(['Boiler', 'Sensor']);
    const values = fixture.debugElement
      .queryAll(By.directive(PctMultiSelect))
      .find((one) => row.contains(one.nativeElement))
      ?.componentInstance as PctMultiSelect<unknown>;
    values.value.set(['Hall']);
    await settle(fixture);
    expect(host.filters()).toEqual({
      seen: { since: '2026-10-02', until: '2026-10-03' },
      room: { values: ['Hall'] },
    });
    (row.querySelector('.floor') as HTMLButtonElement).click();
    await settle(fixture);
    expect(host.filters()['floor']).toEqual({ own: 1 });
    host.filters.set({});
    await settle(fixture);
    const dialog = await open(fixture, 'Seen');
    dates(dialog)[1].value.set('2026-10-01');
    await settle(fixture);
    expect(host.filters()).toEqual({
      seen: { since: null, until: '2026-10-01' },
    });
  });

  it('offers the values the rows hold, each by the text the table writes, no value last', async () => {
    const fixture = await render(Host);
    await open(fixture, 'Room');
    const selects = fixture.debugElement.queryAll(By.directive(PctMultiSelect));
    const room = selects[0].componentInstance as PctMultiSelect<unknown>;
    expect(room.options()).toEqual([
      { value: 'Kitchen', label: 'Kitchen' },
      { value: 'Hall', label: 'Hall' },
      { value: null, label: 'No value' },
    ]);
    room.value.set(['Hall', null]);
    await settle(fixture);
    expect(fixture.componentInstance.filters()).toEqual({
      room: { values: ['Hall', null] },
    });
    expect(names()).toEqual(['Sensor', 'Desk lamp']);
    expect(lent(fixture).words()).toEqual(new Map());
    room.value.set([]);
    await settle(fixture);
    expect(fixture.componentInstance.filters()).toEqual({});
  });

  it('offers a boolean’s two words, and keeps the list of values picked across renders', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.filters.set({ on: { values: [false] } });
    await settle(fixture);
    await open(fixture, 'On');
    const on = fixture.debugElement.query(By.directive(PctMultiSelect))
      .componentInstance as PctMultiSelect<unknown>;
    expect(on.options()).toEqual([
      { value: true, label: 'Yes' },
      { value: false, label: 'No' },
    ]);
    const picked = on.value();
    expect(picked).toEqual([false]);
    await settle(fixture);
    expect(on.value()).toBe(picked);
    expect(names()).toEqual(['Boiler', 'Desk lamp']);
  });

  it('draws the application’s template for its own state, and decides by the column’s filterBy', async () => {
    const fixture = await render(Host);
    const dialog = await open(fixture, 'Floor');
    const floor = dialog.querySelector('.floor') as HTMLButtonElement;
    expect(floor.textContent?.trim()).toBe('Floor any');
    floor.click();
    await settle(fixture);
    expect(fixture.componentInstance.filters()).toEqual({ floor: { own: 1 } });
    expect(names()).toEqual(['Sensor', 'Desk lamp']);
    expect(floor.textContent?.trim()).toBe('Floor 1');
    (dialog.querySelector('.floor-clear') as HTMLButtonElement).click();
    await settle(fixture);
    expect(fixture.componentInstance.filters()).toEqual({});
    floor.click();
    await settle(fixture);
    (dialog.querySelector('.floor-none') as HTMLButtonElement).click();
    await settle(fixture);
    expect(fixture.componentInstance.filters()).toEqual({});
  });

  it('gives a column of its own state no button while nothing draws it, and says so once', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.drawFloor.set(false);
    await settle(fixture);
    expect(button('Floor')).toBeUndefined();
    // Drawn again and taken away again: the warning still stands once.
    fixture.componentInstance.drawFloor.set(true);
    await settle(fixture);
    fixture.componentInstance.drawFloor.set(false);
    await settle(fixture);
    fixture.componentInstance.filters.set({ floor: { own: 1 } });
    await settle(fixture);
    // A state on a column offered no filter filters nothing.
    expect(names()).toHaveLength(4);
    expect(
      warnings.filter((args) => String(args[0]).includes('"floor"')),
    ).toEqual([
      [
        '[pct-data-table] pctTableColumnFilters: the column "floor" is filtered by a state ' +
          "of the application's own, and no <ng-template pctFilter> draws it: the column " +
          'has no filter.',
      ],
    ]);
  });

  it('answers a row only when it answers the quick filter too, and counts those in matched', async () => {
    const fixture = await render(Host);
    const host = fixture.componentInstance;
    host.filters.set({ room: { values: ['Kitchen'] } });
    host.filter.set('lamp');
    await settle(fixture);
    expect(names()).toEqual(['Ceiling lamp']);
    expect(host.table().matched()).toBe(1);
    expect(host.table().matchedIds()).toEqual([1]);
  });

  it('applies the columns’ filters beside filterWith, which replaces the quick filter alone', async () => {
    const fixture = await render(Host);
    const host = fixture.componentInstance;
    host.own.set((row) => row.on);
    host.filters.set({ name: { text: 'lamp' } });
    await settle(fixture);
    expect(names()).toEqual(['Ceiling lamp']);
  });

  it('applies none of them with clientFilter off, and still holds and shows them', async () => {
    const fixture = await render(Host);
    const host = fixture.componentInstance;
    host.client.set(false);
    host.filters.set({ name: { text: 'lamp' } });
    await settle(fixture);
    expect(names()).toHaveLength(4);
    expect(head('Name').hasAttribute('data-pct-filtered')).toBe(true);
    expect(host.table().columnFilters()).toEqual({ name: { text: 'lamp' } });
  });

  it('marks the words of a column’s text filter in that column alone', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.filters.set({ name: { text: 'lamp' } });
    await settle(fixture);
    const marks = Array.from(
      document.querySelectorAll('tbody [data-pct-part="mark"]'),
    ).map((mark) => mark.textContent);
    expect(marks).toEqual(['lamp', 'lamp']);
  });

  it('marks the quick filter’s words and a column’s own in that column together', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.filters.set({ name: { text: 'desk' } });
    fixture.componentInstance.filter.set('lamp');
    await settle(fixture);
    const cell = document.querySelector('tbody td') as HTMLElement;
    expect(
      Array.from(cell.querySelectorAll('[data-pct-part="mark"]')).map(
        (mark) => mark.textContent,
      ),
    ).toEqual(['Desk', 'lamp']);
  });

  it('cuts no cell’s text in a column with nothing to mark, searched by the quick filter or not', async () => {
    @Component({
      imports: [PctDataTable, PctTableColumnFilters],
      template: `<pct-data-table
        [pctTableColumnFilters]="list"
        [(columnFilters)]="filters"
        [rows]="rows"
        [columns]="list"
        [rowId]="byId"
        caption="Devices"
      />`,
    })
    class Marks {
      readonly list = col.of([
        col.key('name', { header: 'Name' }),
        col.key('room', { header: 'Room', filter: false }),
      ]);
      readonly filters = signal<PctColumnFilters<Map>>({});
      readonly rows = DEVICES;
      readonly byId = byId;
    }
    const fixture = await render(Marks);
    // No row of filters unless asked for one.
    expect(document.querySelector('.pct-data-table__filters')).toBeNull();
    const spans = (column: number) =>
      Array.from(
        document.querySelectorAll(
          `tbody > tr:not([data-pct-part]) > td:nth-child(${column}) span`,
        ),
      );
    expect(spans(1)).toEqual([]);
    expect(spans(2)).toEqual([]);
    fixture.componentInstance.filters.set({ name: { text: 'lamp' } });
    await settle(fixture);
    expect(spans(1)).not.toEqual([]);
    expect(spans(2)).toEqual([]);
  });

  it('marks nothing of a filter that is not a text', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.filters.set({ room: { values: ['Hall'] } });
    await settle(fixture);
    expect(document.querySelector('[data-pct-part="mark"]')).toBeNull();
  });

  it('draws a row of filters under the headers, each column’s control named alone', async () => {
    const fixture = await render(Host);
    expect(document.querySelector('.pct-data-table__filters')).toBeNull();
    fixture.componentInstance.row.set(true);
    await settle(fixture);
    const row = document.querySelector(
      'thead > tr.pct-data-table__filters',
    ) as HTMLTableRowElement;
    expect(row.cells).toHaveLength(6);
    const name = row.cells[0].querySelector('input') as HTMLInputElement;
    expect(name.getAttribute('aria-label')).toBe('Filter Name');
    expect(
      Array.from(row.cells[2].querySelectorAll('input')).map((input) =>
        input.getAttribute('aria-label'),
      ),
    ).toEqual(['Power from', 'Power to']);
    await type(fixture, name, 'sensor');
    expect(fixture.componentInstance.filters()).toEqual({
      name: { text: 'sensor' },
    });
    expect(names()).toEqual(['Sensor']);
    // The same state in the panel: one model, two places.
    const panelInput = (await open(fixture, 'Name')).querySelector(
      'input',
    ) as HTMLInputElement;
    expect(panelInput.value).toBe('sensor');
  });

  it('measures the headers’ row apart, for the row of filters to stick below it', async () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(
      function (this: HTMLElement) {
        const height =
          this.tagName === 'THEAD'
            ? 64
            : this.tagName === 'TR' && this.parentElement?.tagName === 'THEAD'
              ? this.classList.contains('pct-data-table__filters')
                ? 24
                : 40
              : 0;
        return { width: 0, height } as DOMRect;
      },
    );
    const fixture = await render(Host);
    fixture.componentInstance.row.set(true);
    await settle(fixture);
    const frame = document.querySelector('pct-table-frame') as HTMLElement;
    expect(frame.style.getPropertyValue('--_first')).toBe('40px');
    expect(frame.style.getPropertyValue('--_head')).toBe('64px');
  });

  it('measures nothing for a header that does not stick', async () => {
    @Component({
      imports: [PctDataTable, PctTableColumnFilters],
      template: `<pct-data-table
        [pctTableColumnFilters]="list"
        filterRow
        [stickyHeader]="false"
        [rows]="rows"
        [columns]="list"
        [rowId]="byId"
        caption="Devices"
      />`,
    })
    class Loose {
      readonly list = columns;
      readonly rows = DEVICES;
      readonly byId = byId;
    }
    await render(Loose);
    const frame = document.querySelector('pct-table-frame') as HTMLElement;
    expect(frame.style.getPropertyValue('--_first')).toBe('');
  });

  it('counts the row of filters among the header’s rows a reader is told of', async () => {
    const fixture = await render(WindowHost);
    const table = document.querySelector('table') as HTMLTableElement;
    expect(table.getAttribute('aria-rowcount')).toBe('6');
    const [heads, filters] = Array.from(
      table.tHead?.rows ?? [],
    ) as HTMLTableRowElement[];
    expect(heads.getAttribute('aria-rowindex')).toBe('1');
    expect(filters.getAttribute('aria-rowindex')).toBe('2');
    const first = table.tBodies[0].rows[0];
    expect(first.getAttribute('aria-rowindex')).toBe('3');
    fixture.componentInstance.row.set(false);
    await settle(fixture);
    expect(table.getAttribute('aria-rowcount')).toBe('5');
    expect(table.tBodies[0].rows[0].getAttribute('aria-rowindex')).toBe('2');
  });

  it('gives a column whose columnFilter is false no button, and leaves its cell in the row empty', async () => {
    @Component({
      imports: [PctDataTable, PctTableColumnFilters],
      template: `<pct-data-table
        [pctTableColumnFilters]="list"
        filterRow
        [rows]="rows"
        [columns]="list"
        [rowId]="byId"
        caption="Devices"
      />`,
    })
    class Off {
      readonly list = col.of([
        col.key('name', { header: 'Name', columnFilter: false }),
        col.key('room', { header: 'Room' }),
      ]);
      readonly rows = DEVICES;
      readonly byId = byId;
    }
    await render(Off);
    expect(buttons().map((one) => one.getAttribute('aria-label'))).toEqual([
      'Filter Room',
    ]);
    const row = document.querySelector(
      '.pct-data-table__filters',
    ) as HTMLTableRowElement;
    expect(row.cells[0].children).toHaveLength(0);
    expect(row.cells[1].querySelector('input')).not.toBeNull();
  });

  it('keeps a cell in the row of filters for each column the table draws before the data', async () => {
    @Component({
      imports: [
        PctDataTable,
        PctTableColumnFilters,
        PctTableSelection,
        PctTableDetails,
        PctDetailsTemplate,
      ],
      template: `<pct-data-table
        [pctTableColumnFilters]="list"
        pctTableSelection
        pctTableDetails
        filterRow
        rowNumbers
        [rows]="rows"
        [columns]="list"
        [rowId]="byId"
        caption="Devices"
      >
        <ng-template [pctDetails]="list" let-device>{{
          device.name
        }}</ng-template>
      </pct-data-table>`,
    })
    class Lead {
      readonly list = col.of([col.key('name', { header: 'Name' })]);
      readonly rows = DEVICES;
      readonly byId = byId;
    }
    await render(Lead);
    const [heads, filters] = Array.from(
      document.querySelector('thead')?.rows ?? [],
    ) as HTMLTableRowElement[];
    expect(filters.cells).toHaveLength(heads.cells.length);
    expect(filters.cells).toHaveLength(4);
    for (const cell of Array.from(filters.cells).slice(0, 3))
      expect(cell.children).toHaveLength(0);
    expect(
      filters.cells[3].querySelector('input')?.getAttribute('aria-label'),
    ).toBe('Filter Name');
  });

  it('lends the table no test while nothing filters, and the words of a text alone', async () => {
    const fixture = await render(Host);
    expect(lent(fixture).test()).toBeNull();
    fixture.componentInstance.filters.set({
      name: { text: 'Lamp desk' },
      on: { values: [false] },
    });
    await settle(fixture);
    expect(lent(fixture).test()).not.toBeNull();
    expect(lent(fixture).words()).toEqual(
      new Map([['name', ['lamp', 'desk']]]),
    );
    // A text on a column of numbers filters, and marks nothing: it is not that column's.
    fixture.componentInstance.filters.set({ power: { text: '12' } });
    await settle(fixture);
    expect(lent(fixture).words()).toEqual(new Map());
  });

  it('gives the list of values picked as an empty one while the column holds none', async () => {
    const fixture = await render(Host);
    await open(fixture, 'Room');
    const room = fixture.debugElement.query(By.directive(PctMultiSelect))
      .componentInstance as PctMultiSelect<unknown>;
    expect(room.value()).toEqual([]);
  });

  it('takes the application’s own state away when it is set to nothing', async () => {
    const fixture = await render(Host);
    const dialog = await open(fixture, 'Floor');
    (dialog.querySelector('.floor') as HTMLButtonElement).click();
    await settle(fixture);
    expect(fixture.componentInstance.filters()).toEqual({ floor: { own: 1 } });
    (dialog.querySelector('.floor-none') as HTMLButtonElement).click();
    await settle(fixture);
    expect(fixture.componentInstance.filters()).toEqual({});
  });

  it('hands the application’s template one context for good, its state read as it stands', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.row.set(true);
    await settle(fixture);
    const context = () =>
      fixture.debugElement
        .queryAllNodes(By.directive(NgTemplateOutlet))
        .map(
          (one) => one.injector.get(NgTemplateOutlet).ngTemplateOutletContext,
        )
        .find((one) => one !== null && 'set' in one) as {
        $implicit: unknown;
        set(own: unknown): void;
      };
    const first = context();
    fixture.componentInstance.filters.set({ floor: { own: 1 } });
    await settle(fixture);
    expect(context()).toBe(first);
    expect(first.$implicit).toBe(1);
    first.set(undefined);
    expect(fixture.componentInstance.filters()).toEqual({});
  });

  it('leaves the focus be after a clear when the panel holds no control', async () => {
    const fixture = await render(Host);
    partsOf(fixture).clear(columns[0], document.createElement('div'));
    await settle(fixture);
    expect(errors).toEqual([]);
  });

  it('takes one template for several columns, and the first of two for one column', async () => {
    @Component({
      imports: [PctDataTable, PctTableColumnFilters, PctFilterTemplate],
      template: `<pct-data-table
        [pctTableColumnFilters]="list"
        [rows]="rows"
        [columns]="list"
        [rowId]="byId"
        caption="Devices"
      >
        <ng-template [pctFilter]="list" [pctFilterOf]="both"
          ><i class="first"></i
        ></ng-template>
        <ng-template [pctFilter]="list" pctFilterOf="floor"
          ><i class="second"></i
        ></ng-template>
      </pct-data-table>`,
    })
    class Twice {
      readonly list = col.of([
        col.key('floor', { header: 'Floor', filterBy: () => true }),
        col.key('id', { header: 'Id', filterBy: () => true }),
      ]);
      readonly both = ['floor', 'id'] as const;
      readonly rows = DEVICES;
      readonly byId = byId;
    }
    const fixture = await render(Twice);
    for (const header of ['Floor', 'Id']) {
      const dialog = await open(fixture, header);
      expect(dialog.querySelector('.first')).not.toBeNull();
      expect(dialog.querySelector('.second')).toBeNull();
      await settle(fixture);
    }
  });

  it('clears one column, or all of them', async () => {
    const fixture = await render(Host);
    const host = fixture.componentInstance;
    host.filters.set({ name: { text: 'lamp' }, on: { values: [true] } });
    await settle(fixture);
    host.filtering().clear('name');
    expect(host.filters()).toEqual({ on: { values: [true] } });
    host.filters.set({ name: { text: 'lamp' }, on: { values: [true] } });
    host.filtering().clear();
    expect(host.filters()).toEqual({});
  });

  it('ignores a state of an id the table has no column of', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.filters.set({
      nothing: { text: 'lamp' },
    } as PctColumnFilters<Map>);
    await settle(fixture);
    expect(names()).toHaveLength(4);
    expect(document.querySelector('[data-pct-filtered]')).toBeNull();
  });

  it('reads a cell’s text as the table writes it', async () => {
    const fixture = await render(Host);
    const table = fixture.componentInstance.table();
    expect(table.textOf(DEVICES[0], 'on')).toBe('Yes');
    expect(table.textOf(DEVICES[0], 'name')).toBe('Ceiling lamp');
    expect(table.textOf(DEVICES[0], 'nothing')).toBe('');
  });

  it('reads no filter on a table without the directive', async () => {
    @Component({
      imports: [PctDataTable],
      template: `<pct-data-table
        [rows]="rows"
        [columns]="list"
        [rowId]="byId"
        caption="Devices"
      />`,
    })
    class Bare {
      readonly table = viewChild.required(PctDataTable<Device>);
      readonly list = columns;
      readonly rows = DEVICES;
      readonly byId = byId;
    }
    const fixture = await render(Bare);
    expect(fixture.componentInstance.table().columnFilters()).toEqual({});
    expect(buttons()).toEqual([]);
    expect(document.querySelector('th[data-pct-filtered]')).toBeNull();
  });
});
