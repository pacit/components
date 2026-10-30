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
import {
  PctCellTemplate,
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
  // jsdom has no PointerEvent; a MouseEvent of the same type carries the same shiftKey.
  button.dispatchEvent(
    new MouseEvent('pointerdown', { bubbles: true, shiftKey: shift }),
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
