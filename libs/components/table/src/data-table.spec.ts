import {
  ApplicationRef,
  Component,
  LOCALE_ID,
  provideZonelessChangeDetection,
  signal,
  Type,
  viewChild,
} from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PctAnnouncer } from '@pacit/components/core';
import { PctDataTable } from './data-table';
import { PctTableDetails } from './data-table-details';
import {
  PctCellTemplate,
  PctDetailsTemplate,
  PctEmptyTemplate,
  PctHeaderCellTemplate,
} from './data-table-slots';
import { pctColumnsOf, type PctRowId } from './model/columns';
import type { PctTableSort } from './table';

interface Device {
  id: number;
  name: string;
  room: string;
  power: number | null;
  on: boolean;
  seen: number;
}

const col = pctColumnsOf<Device>();
const columns = col.of([
  col.key('name', { header: 'Name' }),
  col.key('room', { header: 'Room' }),
  col.key('power', {
    header: 'Power',
    kind: { number: { unit: 'kWh', fractionDigits: 1 } },
  }),
  col.key('on', { header: 'On', kind: 'boolean', sort: false }),
  col.key('seen', {
    header: 'Seen',
    kind: {
      instant: {
        timeZone: 'UTC',
        format: { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' },
      },
    },
  }),
]);
const byId = (device: Device) => device.id;
const HOUR = 3_600_000;
const DEVICES: Device[] = [
  {
    id: 1,
    name: 'Lamp',
    room: 'Kitchen',
    power: 12,
    on: true,
    seen: 10 * HOUR,
  },
  {
    id: 2,
    name: 'Boiler',
    room: 'Kitchen',
    power: 1899.5,
    on: false,
    seen: 11 * HOUR,
  },
  {
    id: 3,
    name: 'Sensor',
    room: 'Hall',
    power: null,
    on: true,
    seen: 12 * HOUR,
  },
];

@Component({
  imports: [
    PctDataTable,
    PctCellTemplate,
    PctHeaderCellTemplate,
    PctEmptyTemplate,
  ],
  template: `
    <pct-data-table
      [rows]="rows()"
      [columns]="columns"
      [rowId]="byId"
      [caption]="caption()"
      [ariaLabelledby]="labelledby()"
      [(sort)]="sort"
      [(filter)]="filter"
      [unsortable]="unsortable()"
      [clientSort]="clientSort()"
      [clientFilter]="clientFilter()"
      [filterWith]="filterWith()"
      [loading]="loading()"
      [locale]="locale()"
      [stickyHeader]="sticky()"
    />
  `,
})
class Host {
  readonly table = viewChild.required(PctDataTable<Device>);
  readonly columns = columns;
  readonly byId = byId;
  readonly rows = signal<readonly Device[]>(DEVICES);
  readonly caption = signal('Devices');
  readonly labelledby = signal('');
  readonly sort = signal<
    readonly PctTableSort<'name' | 'room' | 'power' | 'on' | 'seen'>[]
  >([]);
  readonly filter = signal('');
  readonly unsortable = signal(false);
  readonly clientSort = signal(true);
  readonly clientFilter = signal(true);
  readonly filterWith = signal<
    ((row: Device, question: string) => boolean) | null
  >(null);
  readonly loading = signal(false);
  readonly locale = signal('pl');
  readonly sticky = signal(true);
}

@Component({
  imports: [
    PctDataTable,
    PctCellTemplate,
    PctHeaderCellTemplate,
    PctEmptyTemplate,
  ],
  template: `
    <pct-data-table
      [rows]="rows()"
      [columns]="columns"
      [rowId]="byId"
      caption="Devices"
      [(filter)]="filter"
    >
      <ng-template
        [pctCell]="columns"
        pctCellOf="name"
        let-device
        let-value="value"
        let-index="index"
        let-column="column"
      >
        <b class="named"
          >{{ value }}|{{ device.room }}|{{ index }}|{{ column.id }}</b
        >
      </ng-template>
      <ng-template
        [pctCell]="columns"
        [pctCellOf]="['room', 'name']"
        let-value="value"
      >
        <i class="shared">{{ value }}</i>
      </ng-template>
      <ng-template
        [pctHeaderCell]="columns"
        pctHeaderCellOf="power"
        let-column
        let-direction="direction"
      >
        <span class="head">{{ column.header }}:{{ direction ?? 'none' }}</span>
      </ng-template>
      <ng-template
        [pctHeaderCell]="columns"
        [pctHeaderCellOf]="['power', 'room']"
      >
        <span class="second">second</span>
      </ng-template>
      <ng-template pctEmpty let-question let-loading="loading">
        <em class="empty">{{ question }}|{{ loading }}</em>
      </ng-template>
    </pct-data-table>
  `,
})
class SlotHost {
  readonly columns = columns;
  readonly byId = byId;
  readonly rows = signal<readonly Device[]>(DEVICES);
  readonly filter = signal('');
}

let observed: ((
  entries: { target: Element; isIntersecting: boolean }[],
) => void)[] = [];
const globals = globalThis as {
  ResizeObserver?: unknown;
  IntersectionObserver?: unknown;
};

beforeEach(() => {
  observed = [];
  globals.ResizeObserver = class {
    observe(): void {
      // Nothing to observe in jsdom.
    }
    disconnect(): void {
      // Nothing to let go.
    }
  };
  globals.IntersectionObserver = class {
    constructor(
      callback: (
        entries: { target: Element; isIntersecting: boolean }[],
      ) => void,
    ) {
      observed.push(callback);
    }
    observe(): void {
      // Nothing to observe in jsdom.
    }
    disconnect(): void {
      // Nothing to let go.
    }
  };
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  delete globals.ResizeObserver;
  delete globals.IntersectionObserver;
  vi.restoreAllMocks();
});

async function render<T>(
  type: Type<T>,
  locale = 'en-US',
): Promise<ComponentFixture<T>> {
  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      { provide: LOCALE_ID, useValue: locale },
    ],
  });
  const fixture = TestBed.createComponent(type);
  fixture.detectChanges();
  await TestBed.inject(ApplicationRef).whenStable();
  return fixture;
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await TestBed.inject(ApplicationRef).whenStable();
}

const NBSP = ' ';
const body = () => Array.from(document.querySelectorAll('tbody > tr'));
const texts = () =>
  body().map((tr) =>
    Array.from(tr.querySelectorAll('td')).map((td) =>
      (td.textContent ?? '').trim(),
    ),
  );
const names = () => texts().map((row) => row[0]);
const headers = () => Array.from(document.querySelectorAll('th'));
const header = (label: string) =>
  headers().find((th) =>
    (th.textContent ?? '').trim().startsWith(label),
  ) as HTMLElement;
const toggle = (label: string) =>
  header(label).querySelector(
    '[data-pct-part="toggle"]',
  ) as HTMLButtonElement | null;
const message = () => document.querySelector('[data-pct-part="message"]');

async function press(
  fixture: ComponentFixture<unknown>,
  label: string,
  shift = false,
) {
  const button = toggle(label) as HTMLButtonElement;
  button.dispatchEvent(
    new MouseEvent('mousedown', { bubbles: true, shiftKey: shift }),
  );
  button.click();
  await settle(fixture);
}

describe('PctDataTable — the first layer, drawn from data', () => {
  it('draws a native table: a caption, a header per column, a row per row, no role', async () => {
    await render(Host);
    const table = document.querySelector('table') as HTMLTableElement;
    expect(table.classList.contains('pct-table')).toBe(true);
    expect(table.getAttribute('role')).toBeNull();
    expect(table.getAttribute('aria-labelledby')).toBeNull();
    expect(document.querySelector('caption')?.textContent?.trim()).toBe(
      'Devices',
    );
    expect(headers().map((th) => th.getAttribute('scope'))).toEqual([
      'col',
      'col',
      'col',
      'col',
      'col',
    ]);
    expect(headers().map((th) => (th.textContent ?? '').trim())).toEqual([
      'Name',
      'Room',
      'Power',
      'On',
      'Seen',
    ]);
    expect(names()).toEqual(['Lamp', 'Boiler', 'Sensor']);
    expect(body().map((tr) => tr.getAttribute('data-pct-index'))).toEqual([
      '0',
      '1',
      '2',
    ]);
  });

  it('writes each kind in the table’s locale: a number with its unit, a boolean as a word, an instant on a clock', async () => {
    await render(Host);
    expect(texts()[1]).toEqual([
      'Boiler',
      'Kitchen',
      `1899,5${NBSP}kWh`,
      'No',
      '11:00',
    ]);
    expect(texts()[0][2]).toBe(`12,0${NBSP}kWh`);
    // An empty value writes nothing.
    expect(texts()[2][2]).toBe('');
    // A true boolean draws a check mark beside its word; a false one only the word.
    expect(
      body()[0].querySelectorAll('td')[3].querySelector('pct-icon'),
    ).not.toBeNull();
    expect(
      body()[1].querySelectorAll('td')[3].querySelector('pct-icon'),
    ).toBeNull();
    expect(body()[0].querySelectorAll('td')[3].textContent?.trim()).toBe('Yes');
  });

  it('falls back to the application’s locale when the table names none', async () => {
    const fixture = await render(Host, 'en-US');
    fixture.componentInstance.locale.set('');
    await settle(fixture);
    expect(texts()[1][2]).toBe(`1,899.5${NBSP}kWh`);
  });

  it('writes a relative instant from now, the clock’s when now is unset', async () => {
    const relative = col.of([
      col.key('seen', {
        header: 'Seen',
        kind: { instant: { relative: { numeric: 'always' } } },
      }),
    ]);
    @Component({
      imports: [PctDataTable],
      template: `<pct-data-table
        [rows]="rows"
        [columns]="columns"
        [rowId]="byId"
        caption="Seen"
        [now]="now()"
        locale="en"
      />`,
    })
    class RelativeHost {
      readonly rows = DEVICES;
      readonly columns = relative;
      readonly byId = byId;
      readonly now = signal<number | null>(13 * HOUR);
    }
    vi.spyOn(Date, 'now').mockReturnValue(14 * HOUR);
    const fixture = await render(RelativeHost);
    expect(texts().map((row) => row[0])).toEqual([
      '3 hours ago',
      '2 hours ago',
      '1 hour ago',
    ]);
    fixture.componentInstance.now.set(null);
    await settle(fixture);
    expect(texts()[0][0]).toBe('4 hours ago');
  });

  it('writes an instant on a wall clock with no options as the platform does', async () => {
    const plain = col.of([
      col.key('seen', { header: 'Seen', kind: { instant: {} } }),
      col.key('room', { header: 'Room', kind: 'text' }),
    ]);
    @Component({
      imports: [PctDataTable],
      template: `<pct-data-table
        [rows]="rows"
        [columns]="columns"
        [rowId]="byId"
        caption="Seen"
        locale="en-US"
      />`,
    })
    class PlainHost {
      readonly rows = DEVICES;
      readonly columns = plain;
      readonly byId = byId;
    }
    await render(PlainHost);
    expect(texts()[0][0]).toBe(
      new Intl.DateTimeFormat('en-US').format(10 * HOUR),
    );
    expect(texts()[0][1]).toBe('Kitchen');
  });

  it('names the table by an element elsewhere, on the table and on its frame, with no caption', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.caption.set('');
    fixture.componentInstance.labelledby.set('heading');
    await settle(fixture);
    expect(document.querySelector('caption')).toBeNull();
    expect(
      document.querySelector('table')?.getAttribute('aria-labelledby'),
    ).toBe('heading');
    expect(
      document
        .querySelector('pct-table-frame')
        ?.getAttribute('aria-labelledby'),
    ).toBe('heading');
  });

  it('says once, in dev mode, that a table with neither a caption nor a name has none', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const fixture = await render(Host);
    expect(warn).not.toHaveBeenCalled();
    fixture.componentInstance.caption.set('');
    await settle(fixture);
    fixture.componentInstance.labelledby.set('x');
    await settle(fixture);
    fixture.componentInstance.labelledby.set('');
    await settle(fixture);
    const named = warn.mock.calls.filter(([text]) =>
      String(text).includes('has no name'),
    );
    expect(named).toHaveLength(1);
  });

  it('says once, in dev mode, that two rows share an id', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const fixture = await render(Host);
    expect(warn).not.toHaveBeenCalled();
    fixture.componentInstance.rows.set([...DEVICES, { ...DEVICES[0] }]);
    await settle(fixture);
    fixture.componentInstance.rows.set([...DEVICES, { ...DEVICES[1] }]);
    await settle(fixture);
    const twins = warn.mock.calls.filter(([text]) =>
      String(text).includes('share the id'),
    );
    expect(twins).toHaveLength(1);
    expect(twins[0][0]).toBe(
      '[pct-data-table] Two rows share the id 1: rowId must name each row once, or the table ' +
        'cannot tell them apart.',
    );
  });

  it('keeps a row’s element across a new list with the same ids', async () => {
    const fixture = await render(Host);
    const first = body()[0];
    fixture.componentInstance.rows.set(
      DEVICES.map((device) => ({ ...device, power: 5 })),
    );
    await settle(fixture);
    expect(body()[0]).toBe(first);
    expect(texts()[0][2]).toBe(`5,0${NBSP}kWh`);
  });

  it('marks the host sticky by default, and not when told', async () => {
    const fixture = await render(Host);
    const host = document.querySelector('pct-data-table') as HTMLElement;
    expect(host.hasAttribute('data-pct-sticky')).toBe(true);
    fixture.componentInstance.sticky.set(false);
    await settle(fixture);
    expect(host.hasAttribute('data-pct-sticky')).toBe(false);
  });
});

describe('PctDataTable — the order', () => {
  it('sorts by a pressed column, then turns it, with aria-sort on its header alone', async () => {
    const fixture = await render(Host);
    const host = fixture.componentInstance;
    await press(fixture, 'Name');
    expect(host.sort()).toEqual([{ key: 'name', direction: 'ascending' }]);
    expect(names()).toEqual(['Boiler', 'Lamp', 'Sensor']);
    expect(header('Name').getAttribute('aria-sort')).toBe('ascending');
    await press(fixture, 'Name');
    expect(host.sort()).toEqual([{ key: 'name', direction: 'descending' }]);
    expect(names()).toEqual(['Sensor', 'Lamp', 'Boiler']);
    await press(fixture, 'Name');
    expect(host.sort()).toEqual([{ key: 'name', direction: 'ascending' }]);
    await press(fixture, 'Room');
    expect(host.sort()).toEqual([{ key: 'room', direction: 'ascending' }]);
    expect(header('Name').getAttribute('aria-sort')).toBeNull();
    expect(header('Room').getAttribute('aria-sort')).toBe('ascending');
  });

  it('takes a descending column out of the order on the third press when unsortable', async () => {
    const fixture = await render(Host);
    const host = fixture.componentInstance;
    host.unsortable.set(true);
    await settle(fixture);
    await press(fixture, 'Name');
    await press(fixture, 'Name');
    await press(fixture, 'Name');
    expect(host.sort()).toEqual([]);
    expect(names()).toEqual(['Lamp', 'Boiler', 'Sensor']);
    expect(header('Name').getAttribute('aria-sort')).toBeNull();
  });

  it('adds a column as the next key with Shift, turns it where it stands, and marks its place', async () => {
    const fixture = await render(Host);
    const host = fixture.componentInstance;
    await press(fixture, 'Room');
    await press(fixture, 'Name', true);
    expect(host.sort()).toEqual([
      { key: 'room', direction: 'ascending' },
      { key: 'name', direction: 'ascending' },
    ]);
    expect(names()).toEqual(['Sensor', 'Boiler', 'Lamp']);
    expect(header('Room').getAttribute('aria-sort')).toBe('ascending');
    expect(header('Name').getAttribute('aria-sort')).toBeNull();
    const place = header('Name').querySelector(
      '[data-pct-part="place"]',
    ) as HTMLElement;
    expect(place.textContent).toBe('2▲');
    expect(place.getAttribute('aria-hidden')).toBe('true');
    expect(place.closest('[data-pct-part="toggle"]')).not.toBeNull();
    expect(header('Room').querySelector('[data-pct-part="place"]')).toBeNull();
    await press(fixture, 'Name', true);
    expect(host.sort()).toEqual([
      { key: 'room', direction: 'ascending' },
      { key: 'name', direction: 'descending' },
    ]);
    expect(names()).toEqual(['Sensor', 'Lamp', 'Boiler']);
    expect(
      header('Name').querySelector('[data-pct-part="place"]')?.textContent,
    ).toBe('2▼');
    // Without Shift a column after the first becomes the only key, ascending.
    await press(fixture, 'Name');
    expect(host.sort()).toEqual([{ key: 'name', direction: 'ascending' }]);
  });

  it('reads Shift from the key that pressed, as from the pointer', async () => {
    const fixture = await render(Host);
    await press(fixture, 'Room');
    const button = toggle('Name') as HTMLButtonElement;
    button.dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        key: 'Enter',
        shiftKey: true,
      }),
    );
    button.click();
    await settle(fixture);
    expect(fixture.componentInstance.sort()).toHaveLength(2);
  });

  it('takes a descending key out of a list with Shift when unsortable, and keeps the rest', async () => {
    const fixture = await render(Host);
    const host = fixture.componentInstance;
    host.unsortable.set(true);
    host.sort.set([
      { key: 'room', direction: 'ascending' },
      { key: 'name', direction: 'descending' },
    ]);
    await settle(fixture);
    await press(fixture, 'Name', true);
    expect(host.sort()).toEqual([{ key: 'room', direction: 'ascending' }]);
  });

  it('draws no button on a column that does not sort', async () => {
    await render(Host);
    expect(toggle('On')).toBeNull();
    expect(toggle('Name')).not.toBeNull();
  });

  it('orders the rows as given, and still writes the sort, for rows a server orders', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.clientSort.set(false);
    await settle(fixture);
    await press(fixture, 'Name');
    expect(fixture.componentInstance.sort()).toEqual([
      { key: 'name', direction: 'ascending' },
    ]);
    expect(names()).toEqual(['Lamp', 'Boiler', 'Sensor']);
  });

  it('ignores a key that names no column', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.sort.set([
      { key: 'gone' as 'name', direction: 'ascending' },
      { key: 'power', direction: 'descending' },
    ]);
    await settle(fixture);
    expect(names()).toEqual(['Boiler', 'Lamp', 'Sensor']);
  });

  it('orders text by the locale, numerically', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.rows.set([
      { ...DEVICES[0], id: 7, name: 'item 10' },
      { ...DEVICES[0], id: 8, name: 'Item 9' },
    ]);
    fixture.componentInstance.sort.set([
      { key: 'name', direction: 'ascending' },
    ]);
    await settle(fixture);
    expect(names()).toEqual(['Item 9', 'item 10']);
  });
});

describe('PctDataTable — the quick filter', () => {
  it('keeps the rows every word is found in, and counts them', async () => {
    const fixture = await render(Host);
    const host = fixture.componentInstance;
    host.filter.set('kitchen');
    await settle(fixture);
    expect(names()).toEqual(['Lamp', 'Boiler']);
    expect(host.table().matched()).toBe(2);
    host.filter.set('kitchen 1899,5');
    await settle(fixture);
    expect(names()).toEqual(['Boiler']);
    host.filter.set('yes hall');
    await settle(fixture);
    expect(names()).toEqual(['Sensor']);
  });

  it('keeps every row for rows a server has filtered', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.clientFilter.set(false);
    fixture.componentInstance.filter.set('nothing at all');
    await settle(fixture);
    expect(names()).toEqual(['Lamp', 'Boiler', 'Sensor']);
    expect(fixture.componentInstance.table().matched()).toBe(3);
  });

  it('asks the application’s predicate instead, with the question as typed, empty too', async () => {
    const fixture = await render(Host);
    const asked: string[] = [];
    fixture.componentInstance.filterWith.set((row, question) => {
      asked.push(question);
      return row.on;
    });
    await settle(fixture);
    expect(names()).toEqual(['Lamp', 'Sensor']);
    expect(asked).toContain('');
    fixture.componentInstance.filter.set('Lamp');
    await settle(fixture);
    expect(asked).toContain('Lamp');
  });
});

describe('PctDataTable — an empty table', () => {
  it('says there are no rows, beside the table and not in it', async () => {
    const fixture = await render(Host);
    expect(message()).toBeNull();
    fixture.componentInstance.rows.set([]);
    await settle(fixture);
    expect(message()?.textContent?.trim()).toBe('No rows');
    expect(message()?.closest('table')).toBeNull();
    expect(message()?.closest('pct-table-frame')).not.toBeNull();
    expect(body()).toHaveLength(0);
  });

  it('says nothing matches when the filter took every row, and announces it', async () => {
    const fixture = await render(Host);
    const announcer = TestBed.inject(PctAnnouncer);
    const announce = vi.spyOn(announcer, 'announce');
    const retract = vi.spyOn(announcer, 'retract');
    fixture.componentInstance.filter.set('garage');
    await settle(fixture);
    expect(message()?.textContent?.trim()).toBe('No matches');
    expect(announce).toHaveBeenLastCalledWith('No matches');
    fixture.componentInstance.filter.set('');
    await settle(fixture);
    expect(message()).toBeNull();
    expect(retract).toHaveBeenLastCalledWith('No matches');
  });

  it('says nothing matches for a question a server answered with no rows', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.rows.set([]);
    fixture.componentInstance.filter.set('garage');
    await settle(fixture);
    expect(message()?.textContent?.trim()).toBe('No matches');
  });

  it('draws placeholder rows and says it is loading while no row has come', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.rows.set([]);
    fixture.componentInstance.loading.set(true);
    await settle(fixture);
    const tbody = document.querySelector('tbody') as HTMLElement;
    expect(tbody.getAttribute('aria-busy')).toBe('true');
    const placeholders = document.querySelectorAll(
      'tr[data-pct-part="placeholder"]',
    );
    expect(placeholders).toHaveLength(5);
    expect(placeholders[0].querySelectorAll('td pct-skeleton')).toHaveLength(5);
    expect(message()?.textContent?.trim()).toBe('Loading…');
  });

  it('keeps its rows and draws no placeholder while more are loading', async () => {
    const fixture = await render(Host);
    expect(
      document.querySelector('tbody')?.getAttribute('aria-busy'),
    ).toBeNull();
    fixture.componentInstance.loading.set(true);
    await settle(fixture);
    expect(document.querySelector('tbody')?.getAttribute('aria-busy')).toBe(
      'true',
    );
    expect(
      document.querySelectorAll('tr[data-pct-part="placeholder"]'),
    ).toHaveLength(0);
    expect(message()).toBeNull();
    expect(names()).toEqual(['Lamp', 'Boiler', 'Sensor']);
  });
});

describe('PctDataTable — slots', () => {
  it('draws a cell template with the row, the typed value, the column and the index', async () => {
    await render(SlotHost);
    const named = Array.from(document.querySelectorAll('.named')).map(
      (b) => b.textContent,
    );
    expect(named).toEqual([
      'Lamp|Kitchen|0|name',
      'Boiler|Kitchen|1|name',
      'Sensor|Hall|2|name',
    ]);
    // A template naming several columns draws the ones no earlier template took.
    expect(
      Array.from(document.querySelectorAll('.shared')).map(
        (i) => i.textContent,
      ),
    ).toEqual(['Kitchen', 'Kitchen', 'Hall']);
  });

  it('puts a header template inside the sort button, with the column and its direction', async () => {
    const fixture = await render(SlotHost);
    const head = document.querySelector('.head') as HTMLElement;
    expect(head.textContent).toBe('Power:none');
    expect(head.closest('[data-pct-part="toggle"]')).not.toBeNull();
    // A list of ids draws the headers no earlier template took: Room, not Power.
    expect(
      Array.from(document.querySelectorAll('.second')).map((e) =>
        e.closest('th')?.textContent?.trim(),
      ),
    ).toEqual(['second']);
    expect(header('second').querySelector('.head')).toBeNull();
    (head.closest('button') as HTMLButtonElement).click();
    await settle(fixture);
    expect(document.querySelector('.head')?.textContent).toBe(
      'Power:ascending',
    );
  });

  it('draws the empty template with the question and the loading state', async () => {
    const fixture = await render(SlotHost);
    fixture.componentInstance.filter.set('garage');
    await settle(fixture);
    expect(document.querySelector('.empty')?.textContent).toBe('garage|false');
  });
});

describe('PctDataTable — where the frame stands', () => {
  it('reads the frame’s scroll position from its own listener', async () => {
    const fixture = await render(Host);
    const frame = document.querySelector('pct-table-frame') as HTMLElement;
    Object.defineProperty(frame, 'scrollTop', {
      configurable: true,
      value: 120,
    });
    frame.dispatchEvent(new Event('scroll'));
    expect(fixture.componentInstance.table().scrolled()).toBe(120);
  });

  it('reports the rows in view, from the observer', async () => {
    const fixture = await render(Host);
    const callback = observed.at(-1) as (typeof observed)[number];
    const rows = body();
    callback([
      { target: rows[2], isIntersecting: true },
      { target: rows[1], isIntersecting: true },
    ]);
    expect(fixture.componentInstance.table().visible()).toEqual({
      start: 1,
      end: 3,
      rows: [2, 3],
    });
    callback([{ target: rows[1], isIntersecting: false }]);
    expect(fixture.componentInstance.table().visible()).toEqual({
      start: 2,
      end: 3,
      rows: [3],
    });
    callback([{ target: rows[2], isIntersecting: false }]);
    expect(fixture.componentInstance.table().visible()).toEqual({
      start: 0,
      end: 0,
      rows: [],
    });
  });

  it('scrolls a row into view, and waits for a row that has not come yet', async () => {
    const error = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    const fixture = await render(Host);
    const scroll = Element.prototype.scrollIntoView as ReturnType<typeof vi.fn>;
    fixture.componentInstance.table().scrollTo(2, { align: 'center' });
    await settle(fixture);
    expect(scroll).toHaveBeenCalledTimes(1);
    expect(scroll.mock.contexts[0]).toBe(body()[1]);
    expect(scroll).toHaveBeenLastCalledWith({ block: 'center' });
    fixture.componentInstance.table().scrollTo(9 as PctRowId);
    await settle(fixture);
    expect(scroll).toHaveBeenCalledTimes(1);
    fixture.componentInstance.rows.set([
      ...DEVICES,
      { ...DEVICES[0], id: 9, name: 'Late' },
    ]);
    await settle(fixture);
    expect(scroll).toHaveBeenCalledTimes(2);
    expect(scroll.mock.contexts[1]).toBe(body()[3]);
    expect(scroll).toHaveBeenLastCalledWith({ block: 'nearest' });
    await settle(fixture);
    expect(scroll).toHaveBeenCalledTimes(2);
    expect(error).not.toHaveBeenCalled();
  });

  it('reveals a row by scrolling to it', async () => {
    const fixture = await render(Host);
    const scroll = Element.prototype.scrollIntoView as ReturnType<typeof vi.fn>;
    fixture.componentInstance.table().reveal(3);
    await settle(fixture);
    expect(scroll.mock.contexts[0]).toBe(body()[2]);
  });
});

/** A table bound with nothing but what it requires, so every default is the one read. */
@Component({
  imports: [PctDataTable],
  template: `<pct-data-table
    [columns]="columns"
    [rowId]="byId"
    [caption]="caption"
  />`,
})
class BareHost {
  readonly table = viewChild.required(PctDataTable<Device>);
  readonly columns = columns;
  readonly byId = byId;
  readonly rows = DEVICES;
  caption = 'Devices';
}

interface Loose {
  id: number;
  label: string | null | undefined;
  flag: boolean | null | undefined;
  at: number | null;
}
const loose = pctColumnsOf<Loose>();
const looseColumns = loose.of([
  loose.key('label', { header: 'Label' }),
  loose.key('flag', { header: 'Flag', kind: 'boolean' }),
  loose.value('raw', (r) => r.flag, { header: 'Raw' }),
  loose.key('at', { header: 'At', kind: { instant: { timeZone: 'UTC' } } }),
  loose.value('ago', (r) => r.at, {
    header: 'Ago',
    kind: { instant: { relative: { style: 'short' } } },
  }),
]);

@Component({
  imports: [PctDataTable],
  template: `<pct-data-table
    [rows]="rows"
    [columns]="columns"
    [rowId]="byId"
    caption="Loose"
    locale="en"
    [now]="now"
  />`,
})
class LooseHost {
  readonly columns = looseColumns;
  readonly byId = (row: Loose) => row.id;
  readonly now = 5 * HOUR;
  readonly rows: Loose[] = [
    { id: 1, label: null, flag: null, at: null },
    { id: 2, label: undefined, flag: undefined, at: Number.NaN },
    { id: 3, label: 'x', flag: true, at: 2 * HOUR },
  ];
}

describe('PctDataTable — what is read when nothing is bound', () => {
  it('reads no rows, no name besides the caption, no order, and a sticky header', async () => {
    const fixture = await render(BareHost);
    const table = fixture.componentInstance.table();
    expect(body()).toHaveLength(0);
    expect(message()?.textContent?.trim()).toBe('No rows');
    expect(
      document.querySelector('table')?.getAttribute('aria-labelledby'),
    ).toBeNull();
    expect(
      document
        .querySelector('pct-table-frame')
        ?.getAttribute('aria-labelledby'),
    ).toBeNull();
    expect(document.querySelectorAll('[aria-sort]')).toHaveLength(0);
    expect(
      document.querySelector('pct-data-table')?.hasAttribute('data-pct-sticky'),
    ).toBe(true);
    expect(table.sort()).toEqual([]);
    expect(table.visible()).toEqual({ start: 0, end: 0, rows: [] });
    expect(table.scrolled()).toBe(0);
  });

  it('has no caption unless one is given, and says so once', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    TestBed.overrideTemplate(
      BareHost,
      `<pct-data-table [columns]="columns" [rowId]="byId" />`,
    );
    await render(BareHost);
    expect(document.querySelector('caption')).toBeNull();
    expect(warn).toHaveBeenCalledWith(
      '[pct-data-table] The table has no name: give it a caption, or the id of the element ' +
        'that names it in ariaLabelledby.',
    );
  });

  it('says nothing about a table named by another element from the start', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    TestBed.overrideTemplate(
      BareHost,
      `<pct-data-table [columns]="columns" [rowId]="byId" ariaLabelledby="h" />`,
    );
    await render(BareHost);
    expect(warn).not.toHaveBeenCalled();
  });

  it('sorts in the client and keeps a column sorted on the third press by default', async () => {
    TestBed.overrideTemplate(
      BareHost,
      `<pct-data-table [rows]="rows" [columns]="columns" [rowId]="byId" caption="Devices" />`,
    );
    const fixture = await render(BareHost);
    await press(fixture, 'Name');
    await press(fixture, 'Name');
    await press(fixture, 'Name');
    expect(fixture.componentInstance.table().sort()).toEqual([
      { key: 'name', direction: 'ascending' },
    ]);
    expect(names()).toEqual(['Boiler', 'Lamp', 'Sensor']);
  });
});

describe('PctDataTable — the edges of a value', () => {
  it('writes nothing for an empty value of any kind, and a boolean only where the kind says', async () => {
    await render(LooseHost);
    expect(texts()[0]).toEqual(['', '', '', '', '']);
    expect(texts()[1]).toEqual(['', '', '', '', '']);
    const cells = body()[2].querySelectorAll('td');
    // A boolean in a text column is text, with no check mark and no hidden word.
    expect(cells[2].textContent?.trim()).toBe('true');
    expect(cells[2].querySelector('pct-icon')).toBeNull();
    expect(cells[2].querySelector('.pct-data-table__word')).toBeNull();
    // An undefined boolean is no word at all.
    expect(
      body()[1]
        .querySelectorAll('td')[1]
        .querySelector('.pct-data-table__word'),
    ).toBeNull();
    expect(cells[1].querySelector('.pct-data-table__word')?.textContent).toBe(
      'Yes',
    );
    expect(cells[3].textContent?.trim()).toBe(
      new Intl.DateTimeFormat('en', { timeZone: 'UTC' }).format(2 * HOUR),
    );
    // The relative words take their options: `short` writes `hr.`.
    expect(cells[4].textContent?.trim()).toBe('3 hr. ago');
  });
});

describe('PctDataTable — the order, at its edges', () => {
  it('starts an unsorted column ascending when unsortable', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.unsortable.set(true);
    await settle(fixture);
    await press(fixture, 'Name');
    expect(fixture.componentInstance.sort()).toEqual([
      { key: 'name', direction: 'ascending' },
    ]);
  });

  it('turns the first key in place with Shift', async () => {
    const fixture = await render(Host);
    await press(fixture, 'Room');
    await press(fixture, 'Name', true);
    await press(fixture, 'Room', true);
    expect(fixture.componentInstance.sort()).toEqual([
      { key: 'room', direction: 'descending' },
      { key: 'name', direction: 'ascending' },
    ]);
  });

  it('reads a press with no Shift seen as a plain press, the first and the one after a Shift', async () => {
    const fixture = await render(Host);
    const plain = async (label: string) => {
      (toggle(label) as HTMLButtonElement).click();
      await settle(fixture);
    };
    fixture.componentInstance.sort.set([
      { key: 'room', direction: 'ascending' },
    ]);
    await settle(fixture);
    await plain('Name');
    expect(fixture.componentInstance.sort()).toEqual([
      { key: 'name', direction: 'ascending' },
    ]);
    await press(fixture, 'Room', true);
    expect(fixture.componentInstance.sort()).toHaveLength(2);
    await plain('Power');
    expect(fixture.componentInstance.sort()).toEqual([
      { key: 'power', direction: 'ascending' },
    ]);
  });
});

describe('PctDataTable — the empty table, at its edges', () => {
  it('says nothing matches when the application’s predicate took every row with no question', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.filterWith.set(() => false);
    await settle(fixture);
    expect(message()?.textContent?.trim()).toBe('No matches');
  });

  it('announces nothing for a table empty on arrival, and withdraws its sentence when it goes', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: LOCALE_ID, useValue: 'en-US' },
      ],
    });
    const announcer = TestBed.inject(PctAnnouncer);
    const announce = vi.spyOn(announcer, 'announce');
    const retract = vi.spyOn(announcer, 'retract');
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.rows.set([]);
    fixture.detectChanges();
    await TestBed.inject(ApplicationRef).whenStable();
    expect(retract.mock.calls[0]).toEqual(['']);
    expect(announce.mock.calls.every(([text]) => text === '')).toBe(true);
    fixture.componentInstance.filter.set('x');
    await settle(fixture);
    expect(announce).toHaveBeenLastCalledWith('No matches');
    fixture.destroy();
    expect(retract).toHaveBeenLastCalledWith('No matches');
    expect(announce).toHaveBeenLastCalledWith('');
  });
});

describe('PctDataTable — the frame, at its edges', () => {
  it('listens to the frame passively, and stops when the table goes', async () => {
    const add = vi.spyOn(HTMLElement.prototype, 'addEventListener');
    const remove = vi.spyOn(HTMLElement.prototype, 'removeEventListener');
    const fixture = await render(Host);
    const call = add.mock.calls.find(([type]) => type === 'scroll');
    expect(call?.[2]).toEqual({ passive: true });
    fixture.destroy();
    expect(
      remove.mock.calls.some(
        ([type, handler]) => type === 'scroll' && handler === call?.[1],
      ),
    ).toBe(true);
  });

  it('observes every row drawn, and lets the observer go with the table', async () => {
    const observe = vi.fn();
    const disconnect = vi.fn();
    globals.IntersectionObserver = class {
      observe = observe;
      disconnect = disconnect;
    };
    const fixture = await render(Host);
    expect(observe).toHaveBeenCalledTimes(3);
    expect(observe.mock.calls.map(([row]) => row)).toEqual(body());
    const before = disconnect.mock.calls.length;
    fixture.destroy();
    expect(disconnect.mock.calls.length).toBe(before + 1);
  });

  it('watches nothing, and breaks nothing, where there is no observer', async () => {
    delete globals.IntersectionObserver;
    const error = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    const fixture = await render(Host);
    expect(fixture.componentInstance.table().visible()).toEqual({
      start: 0,
      end: 0,
      rows: [],
    });
    fixture.destroy();
    expect(error).not.toHaveBeenCalled();
  });

  it('scrolls to the first row too, once, and breaks nothing while nothing is asked', async () => {
    const error = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    const fixture = await render(Host);
    const scroll = Element.prototype.scrollIntoView as ReturnType<typeof vi.fn>;
    fixture.componentInstance.table().scrollTo(1);
    await settle(fixture);
    expect(scroll.mock.contexts[0]).toBe(body()[0]);
    fixture.componentInstance.rows.set(
      DEVICES.map((device) => ({ ...device })),
    );
    await settle(fixture);
    expect(scroll).toHaveBeenCalledTimes(1);
    expect(error).not.toHaveBeenCalled();
  });
});

describe('PctDataTable — the slots, at their edges', () => {
  it('tells the compiler the context, and says nothing at runtime', () => {
    expect(PctCellTemplate.ngTemplateContextGuard({} as never, {})).toBe(true);
    expect(PctHeaderCellTemplate.ngTemplateContextGuard({} as never, {})).toBe(
      true,
    );
    expect(PctEmptyTemplate.ngTemplateContextGuard({} as never, {})).toBe(true);
  });

  it('names itself when it stands where no table reads it', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    @Component({
      imports: [PctCellTemplate, PctHeaderCellTemplate, PctEmptyTemplate],
      template: `
        <ng-template [pctCell]="columns" pctCellOf="name">x</ng-template>
        <ng-template [pctHeaderCell]="columns" pctHeaderCellOf="name"
          >x</ng-template
        >
        <ng-template pctEmpty>x</ng-template>
      `,
    })
    class Orphans {
      readonly columns = columns;
    }
    await render(Orphans);
    const slots = warn.mock.calls.map(([text]) =>
      String(text).slice(0, String(text).indexOf(']') + 1),
    );
    expect(slots).toEqual(['[pctCell]', '[pctHeaderCell]', '[pctEmpty]']);
  });
});

describe('PctDataTable — after the review', () => {
  it('turns or drops only the first key on a plain press, and starts any other afresh', async () => {
    const fixture = await render(Host);
    const host = fixture.componentInstance;
    host.unsortable.set(true);
    host.sort.set([
      { key: 'room', direction: 'descending' },
      { key: 'name', direction: 'descending' },
    ]);
    await settle(fixture);
    await press(fixture, 'Name');
    expect(host.sort()).toEqual([{ key: 'name', direction: 'ascending' }]);
    host.sort.set([
      { key: 'room', direction: 'descending' },
      { key: 'name', direction: 'ascending' },
    ]);
    await settle(fixture);
    await press(fixture, 'Room');
    expect(host.sort()).toEqual([]);
  });

  it('reads Shift only from the keys that press a button', async () => {
    const fixture = await render(Host);
    await press(fixture, 'Room');
    const button = toggle('Name') as HTMLButtonElement;
    button.dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        key: 'Tab',
        shiftKey: true,
      }),
    );
    button.click();
    await settle(fixture);
    expect(fixture.componentInstance.sort()).toEqual([
      { key: 'name', direction: 'ascending' },
    ]);
    const room = toggle('Room') as HTMLButtonElement;
    room.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, key: ' ', shiftKey: true }),
    );
    room.click();
    await settle(fixture);
    expect(fixture.componentInstance.sort()).toHaveLength(2);
  });

  it('empties what it reports in view when the rows go', async () => {
    const fixture = await render(Host);
    const callback = observed.at(-1) as (typeof observed)[number];
    callback([{ target: body()[0], isIntersecting: true }]);
    expect(fixture.componentInstance.table().visible().rows).toEqual([1]);
    fixture.componentInstance.rows.set([]);
    await settle(fixture);
    expect(fixture.componentInstance.table().visible()).toEqual({
      start: 0,
      end: 0,
      rows: [],
    });
    // A report the old observer had queued counts for nothing now.
    callback([{ target: document.createElement('tr'), isIntersecting: true }]);
    expect(fixture.componentInstance.table().visible()).toEqual({
      start: 0,
      end: 0,
      rows: [],
    });
  });

  it('keeps the header’s height clear at the top of the frame while it sticks', async () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      height: 41,
    } as DOMRect);
    const fixture = await render(Host);
    const frame = document.querySelector('pct-table-frame') as HTMLElement;
    expect(frame.style.scrollPaddingBlockStart).toBe('41px');
    fixture.componentInstance.sticky.set(false);
    await settle(fixture);
    expect(frame.style.scrollPaddingBlockStart).toBe('');
  });

  it('counts a relative column from the clock when the rows change', async () => {
    const relative = col.of([
      col.key('seen', {
        header: 'Seen',
        kind: { instant: { relative: true } },
      }),
    ]);
    @Component({
      imports: [PctDataTable],
      template: `<pct-data-table
        [rows]="rows()"
        [columns]="columns"
        [rowId]="byId"
        caption="Seen"
        locale="en"
      />`,
    })
    class ClockHost {
      readonly rows = signal<readonly Device[]>([DEVICES[0]]);
      readonly columns = relative;
      readonly byId = byId;
    }
    const clock = vi.spyOn(Date, 'now').mockReturnValue(12 * HOUR);
    const fixture = await render(ClockHost);
    expect(texts()[0][0]).toBe('2 hours ago');
    clock.mockReturnValue(13 * HOUR);
    fixture.componentInstance.rows.set([{ ...DEVICES[0] }]);
    await settle(fixture);
    expect(texts()[0][0]).toBe('3 hours ago');
  });

  it('reads a question of spaces as none', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.rows.set([]);
    fixture.componentInstance.filter.set('   ');
    await settle(fixture);
    expect(message()?.textContent?.trim()).toBe('No rows');
  });

  it('announces an empty table the application’s predicate made, with no question', async () => {
    const fixture = await render(Host);
    const announce = vi.spyOn(TestBed.inject(PctAnnouncer), 'announce');
    fixture.componentInstance.filterWith.set(() => false);
    await settle(fixture);
    expect(announce).toHaveBeenLastCalledWith('No matches');
  });

  it('calls no empty template an orphan', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    await render(SlotHost);
    expect(
      warn.mock.calls.filter(([text]) => String(text).startsWith('[pctEmpty]')),
    ).toEqual([]);
  });
});

const looks = col.of([
  col.key('name', { header: 'Name', tooltip: true }),
  col.key('room', {
    header: 'Room',
    tooltip: (device) => `${device.name} in ${device.room}`,
  }),
  col.key('power', {
    header: 'Power',
    kind: { number: { unit: 'kWh', fractionDigits: 1 } },
    tone: (power, device) =>
      power !== null && power > 1000 && device.room === 'Kitchen'
        ? 'danger'
        : null,
  }),
  col.key('on', { header: 'On', kind: 'boolean', tooltip: true }),
  col.key('seen', { header: 'Seen', filter: false }),
  col.key('id', {
    header: 'Id',
    filter: (id, word) => String(id) === word,
  }),
]);

@Component({
  imports: [PctDataTable, PctCellTemplate],
  template: `
    <pct-data-table
      [rows]="rows()"
      [columns]="columns"
      [rowId]="byId"
      caption="Devices"
      locale="pl"
      [(filter)]="filter"
      [(sort)]="sort"
      [striped]="striped()"
      [rowNumbers]="numbers()"
      [rowTone]="rowTone()"
      [highlightMatches]="marks()"
      [highlightChanges]="changes()"
      [clientFilter]="clientFilter()"
      [filterWith]="filterWith()"
      [loading]="loading()"
    >
      @if (slotted()) {
        <ng-template [pctCell]="columns" pctCellOf="name" let-value="value">
          <b>{{ value }}</b>
        </ng-template>
      }
    </pct-data-table>
  `,
})
class LookHost {
  readonly table = viewChild.required(PctDataTable<Device>);
  readonly columns = looks;
  readonly byId = byId;
  readonly rows = signal<readonly Device[]>(DEVICES);
  readonly filter = signal('');
  readonly sort = signal<
    readonly PctTableSort<'name' | 'room' | 'power' | 'on' | 'seen' | 'id'>[]
  >([]);
  readonly striped = signal(false);
  readonly numbers = signal(false);
  readonly rowTone = signal<((row: Device) => 'info' | null) | null>(null);
  readonly marks = signal(true);
  readonly changes = signal(false);
  readonly clientFilter = signal(true);
  readonly filterWith = signal<((row: Device) => boolean) | null>(null);
  readonly loading = signal(false);
  readonly slotted = signal(false);
}

const host = () => document.querySelector('pct-data-table') as HTMLElement;
const cells = (row: number) =>
  Array.from(body()[row].querySelectorAll('td')) as HTMLElement[];
const marks = (cell: Element) =>
  Array.from(cell.querySelectorAll('mark')).map((mark) => mark.textContent);

describe('PctDataTable — the look of the rows', () => {
  it('stripes, numbers, tones, marks and flashes nothing unless asked, but marks by default', async () => {
    const fixture = await render(Host);
    expect(host().hasAttribute('data-pct-striped')).toBe(false);
    expect(headers()).toHaveLength(5);
    expect(document.querySelector('[data-pct-tone]')).toBeNull();
    expect(document.querySelector('[title]')).toBeNull();
    expect(document.querySelector('[data-pct-tooltip]')).toBeNull();
    expect(document.querySelector('mark')).toBeNull();
    // With no question a text cell is its text, with no element around it.
    expect(cells(0)[1].children).toHaveLength(0);
    fixture.componentInstance.filter.set('kit');
    await settle(fixture);
    expect(marks(cells(0)[1])).toEqual(['Kit']);
    expect(
      cells(0)[1].querySelector('mark')?.getAttribute('data-pct-part'),
    ).toBe('mark');
    fixture.componentInstance.rows.set([
      { ...DEVICES[0], power: 99 },
      DEVICES[1],
    ]);
    await settle(fixture);
    expect(document.querySelector('[data-pct-changed]')).toBeNull();
  });

  it('stripes the rows on the host’s word', async () => {
    const fixture = await render(LookHost);
    fixture.componentInstance.striped.set(true);
    await settle(fixture);
    expect(host().getAttribute('data-pct-striped')).toBe('');
    fixture.componentInstance.striped.set(false);
    await settle(fixture);
    expect(host().hasAttribute('data-pct-striped')).toBe(false);
  });

  it('numbers the rows as they stand, in a column of its own that does not sort', async () => {
    const fixture = await render(LookHost);
    fixture.componentInstance.numbers.set(true);
    fixture.componentInstance.sort.set([
      { key: 'name', direction: 'ascending' },
    ]);
    await settle(fixture);
    const first = headers()[0];
    // The eye sees a number sign, a reader hears the word.
    expect(first.querySelector('[aria-hidden="true"]')?.textContent).toBe('#');
    expect(first.querySelector('.pct-data-table__word')?.textContent).toBe(
      'Row',
    );
    expect(first.getAttribute('scope')).toBe('col');
    expect(first.hasAttribute('data-pct-numeric')).toBe(true);
    expect(first.querySelector('[data-pct-part="toggle"]')).toBeNull();
    expect(texts().map((row) => row.slice(0, 2))).toEqual([
      ['1', 'Boiler'],
      ['2', 'Lamp'],
      ['3', 'Sensor'],
    ]);
    expect(cells(0)[0].tagName).toBe('TD');
    expect(cells(0)[0].hasAttribute('data-pct-numeric')).toBe(true);
    fixture.componentInstance.rows.set([]);
    fixture.componentInstance.loading.set(true);
    await settle(fixture);
    expect(body()[0].querySelectorAll('td')).toHaveLength(7);
  });

  it('tones a row by its own function and a cell by its value and its row', async () => {
    const fixture = await render(LookHost);
    fixture.componentInstance.rowTone.set((device) =>
      device.on ? 'info' : null,
    );
    await settle(fixture);
    expect(body().map((tr) => tr.getAttribute('data-pct-tone'))).toEqual([
      'info',
      null,
      'info',
    ]);
    expect(cells(1)[2].getAttribute('data-pct-tone')).toBe('danger');
    expect(cells(0)[2].hasAttribute('data-pct-tone')).toBe(false);
    fixture.componentInstance.rows.set([{ ...DEVICES[1], room: 'Hall' }]);
    await settle(fixture);
    expect(cells(0)[2].hasAttribute('data-pct-tone')).toBe(false);
  });

  it('writes a column’s own tooltip on every cell, and cuts a text column to one line', async () => {
    const fixture = await render(LookHost);
    expect(cells(0)[1].getAttribute('title')).toBe('Lamp in Kitchen');
    expect(cells(0)[0].getAttribute('title')).toBeNull();
    const name = cells(0)[0];
    expect(name.getAttribute('data-pct-tooltip')).toBe('');
    const clip = name.firstElementChild as HTMLElement;
    expect(clip.className).toBe('pct-data-table__clip');
    expect(clip.textContent).toBe('Lamp');
    // A boolean draws a mark and a word, and a template its own content: neither is cut.
    expect(cells(0)[3].hasAttribute('data-pct-tooltip')).toBe(false);
    fixture.componentInstance.slotted.set(true);
    await settle(fixture);
    expect(cells(0)[0].hasAttribute('data-pct-tooltip')).toBe(false);
  });

  it('shows a cut cell’s whole text under the pointer, and takes it off when the pointer leaves', async () => {
    await render(LookHost);
    const name = cells(1)[0];
    const clip = name.firstElementChild as HTMLElement;
    const width = (scroll: number) => {
      Object.defineProperty(clip, 'scrollWidth', {
        configurable: true,
        value: scroll,
      });
      Object.defineProperty(clip, 'clientWidth', {
        configurable: true,
        value: 40,
      });
    };
    const over = () =>
      clip.dispatchEvent(new MouseEvent('pointerover', { bubbles: true }));
    const out = (to: Element | null) =>
      clip.dispatchEvent(
        new MouseEvent('pointerout', { bubbles: true, relatedTarget: to }),
      );
    width(40);
    over();
    expect(name.hasAttribute('title')).toBe(false);
    width(41);
    over();
    expect(name.getAttribute('title')).toBe('Boiler');
    // Moving inside the cell keeps it, and coming back over it writes nothing new.
    out(name);
    expect(name.getAttribute('title')).toBe('Boiler');
    name.setAttribute('title', 'kept');
    over();
    expect(name.getAttribute('title')).toBe('kept');
    out(document.body);
    expect(name.hasAttribute('title')).toBe(false);
    out(null);
    expect(name.hasAttribute('title')).toBe(false);
    // A cell with no tooltip of its kind is left as it is.
    const room = cells(1)[1];
    room.dispatchEvent(new MouseEvent('pointerover', { bubbles: true }));
    room.dispatchEvent(
      new MouseEvent('pointerout', { bubbles: true, relatedTarget: null }),
    );
    expect(room.getAttribute('title')).toBe('Boiler in Kitchen');
  });

  it('marks the words the filter found in the text it read, and only there', async () => {
    const fixture = await render(LookHost);
    fixture.componentInstance.filter.set('kitchen 9');
    await settle(fixture);
    expect(names()).toEqual(['Boiler']);
    const [name, room, power, , seen] = cells(0);
    expect(marks(room)).toEqual(['Kitchen']);
    expect(marks(power)).toEqual(['99']);
    expect((power.textContent ?? '').trim()).toBe(`1899,5${NBSP}kWh`);
    // A column the filter does not read, and one it asks a function of, mark nothing.
    expect(marks(seen)).toEqual([]);
    expect(marks(name)).toEqual([]);
    fixture.componentInstance.filter.set('2');
    await settle(fixture);
    expect(names()).toEqual(['Lamp', 'Boiler']);
    expect(marks(cells(1)[5])).toEqual([]);
    expect(marks(cells(0)[2])).toEqual(['2']);
  });

  it('marks a cut cell too, inside its one line', async () => {
    const fixture = await render(LookHost);
    fixture.componentInstance.filter.set('oil');
    await settle(fixture);
    const clip = cells(0)[0].firstElementChild as HTMLElement;
    expect(clip.className).toBe('pct-data-table__clip');
    expect(marks(clip)).toEqual(['oil']);
    expect(clip.textContent).toBe('Boiler');
  });

  it('marks nothing where the table’s own filter did not decide', async () => {
    const fixture = await render(LookHost);
    fixture.componentInstance.filter.set('kit');
    fixture.componentInstance.marks.set(false);
    await settle(fixture);
    expect(document.querySelector('mark')).toBeNull();
    fixture.componentInstance.marks.set(true);
    fixture.componentInstance.clientFilter.set(false);
    await settle(fixture);
    expect(document.querySelector('mark')).toBeNull();
    fixture.componentInstance.clientFilter.set(true);
    fixture.componentInstance.filterWith.set(() => true);
    await settle(fixture);
    expect(document.querySelector('mark')).toBeNull();
    fixture.componentInstance.filterWith.set(null);
    fixture.componentInstance.slotted.set(true);
    await settle(fixture);
    expect(marks(cells(0)[0])).toEqual([]);
    expect(marks(cells(0)[1])).toEqual(['Kit']);
  });

  it('flashes a cell whose value changed, and nothing on the first render, a new row or the same date', async () => {
    const fixture = await render(LookHost);
    fixture.componentInstance.changes.set(true);
    fixture.componentInstance.numbers.set(true);
    await settle(fixture);
    expect(document.querySelector('[data-pct-changed]')).toBeNull();
    const extra: Device = { ...DEVICES[2], id: 4, name: 'Fan' };
    fixture.componentInstance.rows.set([
      DEVICES[1],
      { ...DEVICES[0], power: 13 },
      DEVICES[2],
      extra,
    ]);
    await settle(fixture);
    const changed = Array.from(document.querySelectorAll('[data-pct-changed]'));
    // The lamp moved to the second line, and its power is its fourth cell after the number.
    expect(changed).toEqual([cells(1)[3]]);
    expect(changed[0].getAttribute('data-pct-changed')).toBe('');
    changed[0].dispatchEvent(new Event('animationend', { bubbles: true }));
    expect(changed[0].hasAttribute('data-pct-changed')).toBe(false);
    fixture.componentInstance.rows.set([
      DEVICES[1],
      { ...DEVICES[0], power: 14 },
      DEVICES[2],
      extra,
    ]);
    await settle(fixture);
    expect(cells(1)[3].hasAttribute('data-pct-changed')).toBe(true);
    // Changed again while it still flashes: taken off and put back, so the flash starts again.
    const seen: (string | null)[] = [];
    const watch = new MutationObserver((records) =>
      seen.push(...records.map((record) => record.oldValue)),
    );
    watch.observe(cells(1)[3], {
      attributes: true,
      attributeFilter: ['data-pct-changed'],
      attributeOldValue: true,
    });
    fixture.componentInstance.rows.set([
      DEVICES[1],
      { ...DEVICES[0], power: 15 },
      DEVICES[2],
      extra,
    ]);
    await settle(fixture);
    // Off from '' (it was on), then on from nothing.
    expect(seen).toEqual(['', null]);
    watch.disconnect();
    expect(cells(1)[3].hasAttribute('data-pct-changed')).toBe(true);
    // The numbers coming off move every cell one to the left, and nothing flashes for it.
    cells(1)[3].removeAttribute('data-pct-changed');
    fixture.componentInstance.numbers.set(false);
    await settle(fixture);
    expect(document.querySelector('[data-pct-changed]')).toBeNull();
  });

  it('compares a date by its time, and forgets the values while it is off', async () => {
    interface Reading {
      id: number;
      at: Date;
      value: number;
    }
    const of = pctColumnsOf<Reading>();
    @Component({
      imports: [PctDataTable],
      template: `<pct-data-table
        [rows]="rows()"
        [columns]="columns"
        [rowId]="byId"
        caption="Readings"
        [highlightChanges]="changes()"
      />`,
    })
    class DateHost {
      readonly rows = signal<readonly Reading[]>([
        { id: 1, at: new Date(HOUR), value: 1 },
      ]);
      readonly columns = of.of([
        of.key('at', { header: 'At' }),
        of.key('value', { header: 'Value' }),
      ]);
      readonly byId = (reading: Reading) => reading.id;
      readonly changes = signal(true);
    }
    const fixture = await render(DateHost);
    fixture.componentInstance.rows.set([
      { id: 1, at: new Date(HOUR), value: 1 },
    ]);
    await settle(fixture);
    expect(document.querySelector('[data-pct-changed]')).toBeNull();
    fixture.componentInstance.rows.set([
      { id: 1, at: new Date(2 * HOUR), value: 1 },
    ]);
    await settle(fixture);
    expect(cells(0)[0].hasAttribute('data-pct-changed')).toBe(true);
    expect(cells(0)[1].hasAttribute('data-pct-changed')).toBe(false);
    cells(0)[0].removeAttribute('data-pct-changed');
    // A date that becomes no date at all changed too.
    fixture.componentInstance.rows.set([
      { id: 1, at: null as unknown as Date, value: 1 },
    ]);
    await settle(fixture);
    expect(cells(0)[0].hasAttribute('data-pct-changed')).toBe(true);
    cells(0)[0].removeAttribute('data-pct-changed');
    fixture.componentInstance.changes.set(false);
    await settle(fixture);
    fixture.componentInstance.rows.set([
      { id: 1, at: new Date(2 * HOUR), value: 2 },
    ]);
    await settle(fixture);
    expect(document.querySelector('[data-pct-changed]')).toBeNull();
    fixture.componentInstance.changes.set(true);
    await settle(fixture);
    expect(document.querySelector('[data-pct-changed]')).toBeNull();
  });

  it('says once that two columns share an id', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    @Component({
      imports: [PctDataTable],
      template: `<pct-data-table
        [rows]="rows"
        [columns]="columns()"
        [rowId]="byId"
        caption="Twins"
      />`,
    })
    class TwinHost {
      readonly rows = DEVICES;
      readonly columns = signal(
        col.of([
          col.key('name', { header: 'Name' }),
          col.key('room', { header: 'Room' }),
        ]),
      );
      readonly byId = byId;
    }
    const fixture = await render(TwinHost);
    const twins = () =>
      warn.mock.calls.filter(([text]) =>
        String(text).includes('columns share'),
      );
    expect(twins()).toEqual([]);
    const twin = col.of([
      col.key('name', { header: 'Name' }),
      col.key('room', { header: 'Room' }),
      col.key('name', { header: 'Name again' }),
    ]);
    fixture.componentInstance.columns.set(twin as never);
    await settle(fixture);
    fixture.componentInstance.columns.set([...twin] as never);
    await settle(fixture);
    expect(twins()).toEqual([
      [
        '[pct-data-table] Two columns share the id "name": a cell template, the sort and the filter name a column by its id, so each needs its own.',
      ],
    ]);
  });

  it('reads each value once for the filter and the body together', async () => {
    let reads = 0;
    @Component({
      imports: [PctDataTable],
      template: `<pct-data-table
        [rows]="rows"
        [columns]="columns"
        [rowId]="byId"
        caption="Counted"
        [(filter)]="filter"
      />`,
    })
    class CountHost {
      readonly rows = DEVICES;
      readonly columns = col.of([
        col.value(
          'name',
          (device) => {
            reads++;
            return device.name;
          },
          { header: 'Name' },
        ),
      ]);
      readonly byId = byId;
      readonly filter = signal('o');
    }
    await render(CountHost);
    expect(names()).toEqual(['Boiler', 'Sensor']);
    expect(reads).toBe(DEVICES.length);
  });
});

describe('PctDataTable — after the review of the rows’ look', () => {
  it('flashes an invalid date only when it becomes another value', async () => {
    interface Reading {
      id: number;
      at: Date;
    }
    const of = pctColumnsOf<Reading>();
    @Component({
      imports: [PctDataTable],
      template: `<pct-data-table
        [rows]="rows()"
        [columns]="columns"
        [rowId]="byId"
        caption="Readings"
        highlightChanges
        [(filter)]="filter"
      />`,
    })
    class InvalidHost {
      readonly rows = signal<readonly Reading[]>([
        { id: 1, at: new Date(Number.NaN) },
      ]);
      readonly columns = of.of([of.key('at', { header: 'At' })]);
      readonly byId = (reading: Reading) => reading.id;
      readonly filter = signal('');
    }
    const fixture = await render(InvalidHost);
    fixture.componentInstance.rows.set([{ id: 1, at: new Date(Number.NaN) }]);
    await settle(fixture);
    expect(document.querySelector('[data-pct-changed]')).toBeNull();
    fixture.componentInstance.rows.set([{ id: 1, at: new Date(HOUR) }]);
    await settle(fixture);
    expect(cells(0)[0].hasAttribute('data-pct-changed')).toBe(true);
  });

  it('reads the values again for new rows, not for a new clock, and flashes nothing on a tick', async () => {
    let reads = 0;
    interface Spot {
      id: number;
      x: number;
      at: number;
    }
    const of = pctColumnsOf<Spot>();
    @Component({
      imports: [PctDataTable],
      template: `<pct-data-table
        [rows]="rows()"
        [columns]="columns"
        [rowId]="byId"
        caption="Spots"
        locale="en"
        highlightChanges
        [now]="now()"
      />`,
    })
    class TickHost {
      readonly rows = signal<readonly Spot[]>([{ id: 1, x: 1, at: HOUR }]);
      readonly columns = of.of([
        of.value(
          'place',
          (spot) => {
            reads++;
            return [spot.x];
          },
          { header: 'Position' },
        ),
        of.key('at', {
          header: 'At',
          kind: { instant: { relative: true } },
        }),
      ]);
      readonly byId = (spot: Spot) => spot.id;
      readonly now = signal(2 * HOUR);
    }
    const fixture = await render(TickHost);
    expect(reads).toBe(1);
    expect(texts()[0][1]).toBe('1 hour ago');
    fixture.componentInstance.now.set(3 * HOUR);
    await settle(fixture);
    expect(texts()[0][1]).toBe('2 hours ago');
    expect(reads).toBe(1);
    expect(document.querySelector('[data-pct-changed]')).toBeNull();
    fixture.componentInstance.rows.set([{ id: 1, x: 1, at: HOUR }]);
    await settle(fixture);
    expect(reads).toBe(2);
  });

  it('works on its own rows when a cell holds another data table', async () => {
    @Component({
      imports: [PctDataTable, PctCellTemplate],
      template: `<pct-data-table
        [rows]="rows()"
        [columns]="columns"
        [rowId]="byId"
        caption="Outer"
        highlightChanges
      >
        <ng-template [pctCell]="columns" pctCellOf="name">
          <pct-data-table
            [rows]="inner"
            [columns]="columns"
            [rowId]="byId"
            caption="Inner"
          />
        </ng-template>
      </pct-data-table>`,
    })
    class NestHost {
      readonly table = viewChild.required(PctDataTable<Device>);
      readonly rows = signal<readonly Device[]>(DEVICES);
      readonly inner = DEVICES;
      readonly columns = col.of([
        col.key('name', { header: 'Name' }),
        col.key('room', { header: 'Room' }),
      ]);
      readonly byId = byId;
    }
    const fixture = await render(NestHost);
    const outer = document.querySelector('table') as HTMLTableElement;
    const own = () => Array.from(outer.tBodies[0].rows);
    fixture.componentInstance.rows.set([
      DEVICES[0],
      { ...DEVICES[1], room: 'Hall' },
      DEVICES[2],
    ]);
    await settle(fixture);
    const flashed = Array.from(document.querySelectorAll('[data-pct-changed]'));
    expect(flashed).toEqual([own()[1].cells[1]]);
    fixture.componentInstance.table().scrollTo(3);
    await settle(fixture);
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledTimes(1);
    expect(vi.mocked(Element.prototype.scrollIntoView).mock.contexts[0]).toBe(
      own()[2],
    );
  });

  it('reads changed columns as new ones, and a column taken off the end as no change', async () => {
    const two = col.of([
      col.key('name', { header: 'Name' }),
      col.key('room', { header: 'Room' }),
    ]);
    const swapped = col.of([
      col.key('name', { header: 'Name' }),
      col.key('power', { header: 'Power' }),
    ]);
    const three = col.of([
      col.key('name', { header: 'Name' }),
      col.key('power', { header: 'Power' }),
      col.key('room', { header: 'Room' }),
    ]);
    @Component({
      imports: [PctDataTable],
      template: `<pct-data-table
        [rows]="rows()"
        [columns]="columns()"
        [rowId]="byId"
        caption="Swapped"
        highlightChanges
      />`,
    })
    class SwapHost {
      readonly rows = signal<readonly Device[]>(DEVICES);
      readonly columns = signal(two as never);
      readonly byId = byId;
    }
    const fixture = await render(SwapHost);
    const flashed = () => document.querySelectorAll('[data-pct-changed]');
    fixture.componentInstance.columns.set(swapped as never);
    await settle(fixture);
    expect(flashed()).toHaveLength(0);
    fixture.componentInstance.columns.set(three as never);
    await settle(fixture);
    expect(flashed()).toHaveLength(0);
    // The last column off: the two before it are the same columns, and they still compare.
    fixture.componentInstance.columns.set(swapped as never);
    fixture.componentInstance.rows.set([
      { ...DEVICES[0], power: 99 },
      DEVICES[1],
      DEVICES[2],
    ]);
    await settle(fixture);
    expect(Array.from(flashed())).toEqual([cells(0)[1]]);
  });

  it('lays the table out once for a poll that changed values, and not at all for one that did not', async () => {
    const fixture = await render(LookHost);
    fixture.componentInstance.changes.set(true);
    await settle(fixture);
    const table = document.querySelector('table') as HTMLTableElement;
    const layout = vi.spyOn(table, 'getBoundingClientRect');
    fixture.componentInstance.rows.set([...DEVICES]);
    await settle(fixture);
    expect(layout).not.toHaveBeenCalled();
    fixture.componentInstance.rows.set([
      { ...DEVICES[0], power: 1, room: 'Attic' },
      { ...DEVICES[1], power: 2 },
      DEVICES[2],
    ]);
    await settle(fixture);
    expect(layout).toHaveBeenCalledTimes(1);
    expect(document.querySelectorAll('[data-pct-changed]')).toHaveLength(3);
  });
});

describe('PctDataTable — a reader hears the later keys', () => {
  it('describes a later key’s button by its place and its way, and the first by nothing', async () => {
    const fixture = await render(Host);
    const described = (label: string) => {
      const id = toggle(label)?.getAttribute('aria-describedby');
      return id ? document.getElementById(id)?.textContent : null;
    };
    await press(fixture, 'Name');
    await press(fixture, 'Room', true);
    await press(fixture, 'Power', true);
    await press(fixture, 'Power', true);
    expect(toggle('Name')).not.toBeNull();
    expect(toggle('Name')?.hasAttribute('aria-describedby')).toBe(false);
    expect(described('Name')).toBeNull();
    expect(described('Room')).toBe('Sort key 2, ascending');
    expect(described('Power')).toBe('Sort key 3, descending');
  });

  it('takes Shift from the main button only', async () => {
    const fixture = await render(Host);
    await press(fixture, 'Name');
    const button = toggle('Room') as HTMLButtonElement;
    button.dispatchEvent(
      new MouseEvent('mousedown', { bubbles: true, shiftKey: true, button: 1 }),
    );
    button.click();
    await settle(fixture);
    expect(fixture.componentInstance.sort()).toEqual([
      { key: 'room', direction: 'ascending' },
    ]);
  });
});

const fitting = col.of([
  col.key('name', { header: 'Name' }),
  col.key('room', { header: 'Room', priority: 1 }),
  col.key('power', { header: 'Power', priority: 2 }),
  col.key('seen', { header: 'Seen', priority: 3 }),
]);

@Component({
  imports: [PctDataTable, PctTableDetails, PctDetailsTemplate, PctCellTemplate],
  template: `
    <pct-data-table
      pctTableDetails
      [(details)]="open"
      [disabled]="off()"
      [rows]="rows()"
      [columns]="columns()"
      [rowId]="byId"
      caption="Devices"
      [rowNumbers]="numbers()"
      [highlightChanges]="changes()"
      [loading]="loading()"
    >
      @if (slotted()) {
        <ng-template [pctDetails]="columns()" let-device let-hidden="hidden">
          <p class="more">{{ device.name }}|{{ hidden.length }}</p>
        </ng-template>
      }
      @if (powerSlot()) {
        <ng-template [pctCell]="columns()" pctCellOf="power" let-value="value">
          <b class="watts">{{ value }}</b>
        </ng-template>
      }
    </pct-data-table>
  `,
})
class DetailsHost {
  readonly table = viewChild.required(PctDataTable<Device>);
  readonly rows = signal<readonly Device[]>(DEVICES);
  readonly columns = signal(fitting);
  readonly byId = byId;
  readonly open = signal<readonly PctRowId[]>([]);
  readonly off = signal(false);
  readonly slotted = signal(true);
  readonly powerSlot = signal(false);
  readonly numbers = signal(false);
  readonly changes = signal(false);
  readonly loading = signal(false);
}

const disclosures = () =>
  Array.from(
    document.querySelectorAll('[data-pct-part="disclosure"]'),
  ) as HTMLButtonElement[];
const detailsRows = () =>
  Array.from(document.querySelectorAll('tr[data-pct-part="details"]'));

describe('PctDataTable — a row’s details', () => {
  it('draws a column of disclosures beside a details template, each closed and named', async () => {
    await render(DetailsHost);
    const head = headers()[0];
    expect(head.querySelector('.pct-data-table__word')?.textContent).toBe(
      'Details',
    );
    expect(disclosures()).toHaveLength(3);
    const [first] = disclosures();
    expect(first.getAttribute('aria-expanded')).toBe('false');
    expect(first.getAttribute('aria-label')).toBe('Show details');
    expect(first.hasAttribute('aria-controls')).toBe(false);
    expect(first.type).toBe('button');
    expect(detailsRows()).toHaveLength(0);
  });

  it('opens a row’s details below it, the full width, and closes them again', async () => {
    const fixture = await render(DetailsHost);
    disclosures()[1].click();
    await settle(fixture);
    expect(fixture.componentInstance.open()).toEqual([2]);
    const button = disclosures()[1];
    expect(button.getAttribute('aria-expanded')).toBe('true');
    expect(button.getAttribute('aria-label')).toBe('Hide details');
    const [details] = detailsRows();
    expect(button.getAttribute('aria-controls')).toBe(details.id);
    // Named by its row's place among the lines.
    expect(details.id).toMatch(/^pct-data-table-\d+-details-1$/);
    // After its row, and counted among the lines.
    expect(
      details.previousElementSibling
        ?.querySelector('td + td')
        ?.textContent?.trim(),
    ).toBe('Boiler');
    expect(details.getAttribute('data-pct-index')).toBe('2');
    expect(body().map((tr) => tr.getAttribute('data-pct-index'))).toEqual([
      '0',
      '1',
      '2',
      '3',
    ]);
    const cell = details.querySelector('td') as HTMLTableCellElement;
    expect(cell.colSpan).toBe(5);
    expect(cell.querySelector('dl')).toBeNull();
    expect(cell.querySelector('.more')?.textContent).toBe('Boiler|0');
    disclosures()[1].click();
    await settle(fixture);
    expect(fixture.componentInstance.open()).toEqual([]);
    expect(detailsRows()).toHaveLength(0);
  });

  it('opens what the application binds, and takes the disclosure away when disabled', async () => {
    const fixture = await render(DetailsHost);
    fixture.componentInstance.open.set([3, 1]);
    fixture.componentInstance.numbers.set(true);
    await settle(fixture);
    expect(detailsRows()).toHaveLength(2);
    expect(
      (detailsRows()[0].querySelector('td') as HTMLTableCellElement).colSpan,
    ).toBe(6);
    // The numbers count rows, not lines.
    expect(
      Array.from(document.querySelectorAll('td.pct-data-table__number')).map(
        (td) => td.textContent?.trim(),
      ),
    ).toEqual(['1', '2', '3']);
    fixture.componentInstance.off.set(true);
    await settle(fixture);
    expect(disclosures()).toHaveLength(0);
    expect(detailsRows()).toHaveLength(0);
    expect(headers()[0].textContent?.trim()).not.toContain('Details');
  });

  it('draws no disclosure with nothing to open, and one on each placeholder row while loading', async () => {
    const fixture = await render(DetailsHost);
    fixture.componentInstance.slotted.set(false);
    await settle(fixture);
    expect(disclosures()).toHaveLength(0);
    fixture.componentInstance.slotted.set(true);
    fixture.componentInstance.rows.set([]);
    fixture.componentInstance.loading.set(true);
    await settle(fixture);
    expect(body()[0].querySelectorAll('td')).toHaveLength(5);
  });

  it('reports the rows in view without their details, and scrolls to a row below open details', async () => {
    const fixture = await render(DetailsHost);
    fixture.componentInstance.open.set([1]);
    await settle(fixture);
    const report = observed.at(-1) as (typeof observed)[number];
    report(body().map((target) => ({ target, isIntersecting: true })));
    expect(fixture.componentInstance.table().visible()).toEqual({
      start: 0,
      end: 4,
      rows: [1, 2, 3],
    });
    fixture.componentInstance.table().scrollTo(2);
    await settle(fixture);
    expect(
      vi.mocked(Element.prototype.scrollIntoView).mock.contexts.at(-1),
    ).toBe(body()[2]);
  });

  it('flashes a changed cell past the leading cells, with a row’s details open above it', async () => {
    const fixture = await render(DetailsHost);
    fixture.componentInstance.open.set([1]);
    fixture.componentInstance.changes.set(true);
    fixture.componentInstance.numbers.set(true);
    await settle(fixture);
    fixture.componentInstance.rows.set([
      DEVICES[0],
      { ...DEVICES[1], room: 'Hall' },
      DEVICES[2],
    ]);
    await settle(fixture);
    const flashed = Array.from(document.querySelectorAll('[data-pct-changed]'));
    // The disclosure, the number, the name, then the room.
    expect(flashed).toEqual([body()[2].querySelectorAll('td')[3]]);
  });

  it('says nothing of twins for a row and its own details', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const fixture = await render(DetailsHost);
    fixture.componentInstance.open.set([1, 2]);
    await settle(fixture);
    expect(
      warn.mock.calls.filter(([text]) => String(text).includes('share the id')),
    ).toEqual([]);
  });
});

describe('PctDataTable — a narrow table hides columns', () => {
  let resized: (() => void) | null = null;
  beforeEach(() => {
    resized = null;
    (globalThis as { ResizeObserver?: unknown }).ResizeObserver = class {
      constructor(callback: () => void) {
        resized = callback;
      }
      observe(): void {
        // The test calls the callback itself.
      }
      disconnect(): void {
        // Nothing to let go.
      }
    };
  });

  /** A frame `width` wide, and a table as wide as a hundred per column of data it shows. */
  const lay = (width: { value: number }) => {
    const frame = document.querySelector('pct-table-frame') as HTMLElement;
    const table = document.querySelector('table') as HTMLElement;
    Object.defineProperty(frame, 'clientWidth', {
      configurable: true,
      get: () => width.value,
    });
    Object.defineProperty(table, 'scrollWidth', {
      configurable: true,
      get: () =>
        100 *
        document.querySelectorAll('thead th:not(.pct-data-table__disclosure)')
          .length,
    });
  };

  const labels = () =>
    headers()
      .filter((th) => !th.classList.contains('pct-data-table__disclosure'))
      .map((th) => (th.textContent ?? '').trim());

  it('hides the highest priority until the table fits, and lists it in the details', async () => {
    const fixture = await render(DetailsHost);
    fixture.componentInstance.slotted.set(false);
    await settle(fixture);
    const width = { value: 1000 };
    lay(width);
    (resized as () => void)();
    await settle(fixture);
    expect(labels()).toEqual(['Name', 'Room', 'Power', 'Seen']);
    expect(disclosures()).toHaveLength(0);
    width.value = 250;
    (resized as () => void)();
    await settle(fixture);
    expect(labels()).toEqual(['Name', 'Room']);
    expect(fixture.componentInstance.table().hiddenColumns()).toEqual([
      'seen',
      'power',
    ]);
    // Something is hidden, so rows open even with no template.
    expect(disclosures()).toHaveLength(3);
    expect(body()[0].querySelectorAll('td')).toHaveLength(3);
    disclosures()[1].click();
    await settle(fixture);
    const list = detailsRows()[0].querySelector('dl') as HTMLElement;
    expect(
      Array.from(list.querySelectorAll('div')).map((pair) => [
        pair.querySelector('dt')?.textContent?.trim(),
        pair.querySelector('dd')?.textContent?.trim(),
      ]),
    ).toEqual([
      // In the columns' order, written by each column's kind — here none.
      ['Power', '1899.5'],
      ['Seen', String(11 * HOUR)],
    ]);
  });

  it('shows a column again only once the frame is wider than where it hid it', async () => {
    const fixture = await render(DetailsHost);
    const width = { value: 350 };
    lay(width);
    (resized as () => void)();
    await settle(fixture);
    expect(labels()).toEqual(['Name', 'Room', 'Power']);
    width.value = 358;
    (resized as () => void)();
    await settle(fixture);
    expect(labels()).toEqual(['Name', 'Room', 'Power']);
    width.value = 420;
    (resized as () => void)();
    await settle(fixture);
    expect(labels()).toEqual(['Name', 'Room', 'Power', 'Seen']);
    expect(fixture.componentInstance.table().hiddenColumns()).toEqual([]);
  });

  it('starts every column shown when the columns change, and never hides one with no priority', async () => {
    const fixture = await render(DetailsHost);
    const width = { value: 150 };
    lay(width);
    (resized as () => void)();
    await settle(fixture);
    expect(labels()).toEqual(['Name']);
    fixture.componentInstance.columns.set(
      col.of([
        col.key('name', { header: 'Name' }),
        col.key('room', { header: 'Room' }),
      ]) as never,
    );
    await settle(fixture);
    expect(labels()).toEqual(['Name', 'Room']);
    expect(fixture.componentInstance.table().hiddenColumns()).toEqual([]);
  });

  it('draws a hidden column’s template in the details', async () => {
    const fixture = await render(DetailsHost);
    fixture.componentInstance.powerSlot.set(true);
    fixture.componentInstance.open.set([2]);
    await settle(fixture);
    const width = { value: 250 };
    lay(width);
    (resized as () => void)();
    await settle(fixture);
    expect(detailsRows()[0].querySelector('dd .watts')?.textContent).toBe(
      '1899.5',
    );
    expect(detailsRows()[0].querySelector('.more')?.textContent).toBe(
      'Boiler|2',
    );
  });
});
