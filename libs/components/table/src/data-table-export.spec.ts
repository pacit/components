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
import { PctDataTable } from './data-table';
import { PctTableColumns } from './data-table-columns';
import type { PctTableSort } from './table';
import { pctTableCsv, pctTableXlsx } from './data-table-export';
import { pctColumnsOf } from './model/columns';
import type { PctTableLayout } from './model/layout';

interface Device {
  id: number;
  name: string;
  power: number | null;
  seen: number;
  on: boolean;
  note: string;
}

const col = pctColumnsOf<Device>();
const columns = col.of([
  col.key('name', { header: 'Name' }),
  col.key('power', {
    header: 'Power',
    kind: { number: { unit: 'W', fractionDigits: 1 } },
  }),
  col.key('seen', {
    header: 'Seen',
    kind: {
      instant: {
        timeZone: 'Europe/Warsaw',
        format: { dateStyle: 'short', timeStyle: 'short' },
      },
    },
  }),
  col.key('on', { header: 'On', kind: 'boolean' }),
  col.key('note', { header: 'Note', priority: 1 }),
]);
type Map = typeof columns extends { readonly __map?: infer M } ? M : never;
type Id = keyof Map & string;

// 2026-11-03 13:05 UTC is 14:05 in Warsaw.
const SEEN = Date.UTC(2026, 10, 3, 13, 5);
const DEVICES: Device[] = [
  { id: 1, name: 'Lamp', power: 1950.25, seen: SEEN, on: true, note: '=1+1' },
  { id: 2, name: 'Boiler', power: -3, seen: SEEN, on: false, note: 'x;y' },
  { id: 3, name: 'Fan', power: null, seen: SEEN, on: true, note: '-cold' },
];

@Component({
  imports: [PctDataTable, PctTableColumns],
  template: `
    <pct-data-table
      [pctTableColumns]="columns"
      [(layout)]="layout"
      [rows]="rows()"
      [columns]="columns"
      [rowId]="byId"
      [(filter)]="filter"
      [(sort)]="sort"
      [locale]="locale()"
      [caption]="caption()"
      ariaLabel="Devices of the house"
    />
  `,
})
class Host {
  readonly table = viewChild.required(PctDataTable<Device, Map>);
  readonly columns = columns;
  readonly byId = (device: Device) => device.id;
  readonly rows = signal<Device[]>(DEVICES);
  readonly layout = signal<PctTableLayout<Id>>({});
  readonly filter = signal('');
  readonly sort = signal<readonly PctTableSort<Id>[]>([]);
  readonly locale = signal('pl');
  readonly caption = signal('Devices');
}

interface Sighting {
  id: number;
  seen: number | null;
  on: boolean | null;
}

const sightings = pctColumnsOf<Sighting>();
const days = sightings.of([
  sightings.key('seen', {
    header: 'Seen',
    kind: { instant: { timeZone: 'Pacific/Kiritimati' } },
  }),
  sightings.key('on', { header: 'On', kind: 'boolean' }),
]);

@Component({
  imports: [PctDataTable],
  template: `
    <pct-data-table
      [rows]="rows"
      [columns]="columns"
      [rowId]="byId"
      caption="Sightings"
    />
  `,
})
class DayHost {
  readonly table = viewChild.required(PctDataTable<Sighting>);
  readonly columns = days;
  readonly byId = (sighting: Sighting) => sighting.id;
  readonly rows: Sighting[] = [
    { id: 1, seen: SEEN, on: false },
    { id: 2, seen: null, on: null },
    { id: 3, seen: null, on: 'maybe' as unknown as boolean },
  ];
}

let errors: unknown[] = [];
let resized: (() => void) | null = null;
const globals = globalThis as {
  ResizeObserver?: unknown;
  IntersectionObserver?: unknown;
};

beforeEach(() => {
  resized = null;
  globals.ResizeObserver = class {
    constructor(callback: () => void) {
      resized = callback;
    }
    observe(): void {
      // Reported by `resized`.
    }
    unobserve(): void {
      // Nothing to let go.
    }
    disconnect(): void {
      // Nothing to let go.
    }
  };
  globals.IntersectionObserver = class {
    observe(): void {
      // Nothing to observe in jsdom.
    }
    disconnect(): void {
      // Nothing to let go.
    }
  };
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(
    function (this: HTMLElement) {
      const width = this.tagName === 'TH' ? 100 : 0;
      return { width, height: 0 } as DOMRect;
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

async function render<T = Host>(
  type: Type<T> = Host as Type<T>,
): Promise<ComponentFixture<T>> {
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

/** A frame `width` wide around a table as wide as its header cells. */
async function narrow(fixture: ComponentFixture<unknown>, width: number) {
  const frame = document.querySelector('pct-table-frame') as HTMLElement;
  const table = document.querySelector('table') as HTMLElement;
  Object.defineProperty(frame, 'clientWidth', {
    configurable: true,
    get: () => width,
  });
  Object.defineProperty(table, 'scrollWidth', {
    configurable: true,
    get: () => Math.max(width, table.querySelectorAll('thead th').length * 100),
  });
  (resized as () => void)();
  await settle(fixture);
}

const BOM = String.fromCharCode(0xfeff);
const lines = (csv: string) => csv.replace(BOM, '').split('\r\n');

describe('pctTableCsv', () => {
  it("writes the headers and each row's plain values, in the locale's delimiter, after a BOM", async () => {
    const fixture = await render();
    const csv = pctTableCsv(fixture.componentInstance.table());
    expect(csv.startsWith(BOM)).toBe(true);
    expect(csv.indexOf(BOM, 1)).toBe(-1);
    expect(lines(csv)).toEqual([
      'Name;Power;Seen;On;Note',
      "Lamp;1950,25;2026-11-03 14:05:00;true;'=1+1",
      'Boiler;-3;2026-11-03 14:05:00;false;"x;y"',
      "Fan;;2026-11-03 14:05:00;true;'-cold",
      '',
    ]);
  });

  it('writes a comma in English, and the delimiter and the BOM it is told', async () => {
    const fixture = await render();
    fixture.componentInstance.locale.set('en');
    await settle(fixture);
    const table = fixture.componentInstance.table();
    expect(lines(pctTableCsv(table))[1]).toBe(
      "Lamp,1950.25,2026-11-03 14:05:00,true,'=1+1",
    );
    const tabbed = pctTableCsv(table, { delimiter: '\t', bom: false });
    expect(tabbed.startsWith('Name\tPower')).toBe(true);
    expect(tabbed.split('\r\n')[2]).toBe(
      'Boiler\t-3\t2026-11-03 14:05:00\tfalse\tx;y',
    );
    expect(pctTableCsv(table, { bom: true }).startsWith(BOM)).toBe(true);
  });

  it('writes the texts the cells show with formatted, and never a number as a formula', async () => {
    const fixture = await render();
    const table = fixture.componentInstance.table();
    const shown = lines(pctTableCsv(table, { formatted: true }));
    const lamp = DEVICES[0];
    const boiler = DEVICES[1];
    expect(shown[1]).toBe(
      ['name', 'power', 'seen', 'on']
        .map((id) => table.textOf(lamp, id))
        .join(';') + ";'=1+1",
    );
    // A formatted negative number begins with its minus, and is still not a formula.
    expect(shown[2].split(';')[1]).toBe(table.textOf(boiler, 'power'));
    expect(table.textOf(boiler, 'power')).toMatch(/^[-−]3,0/);
  });

  it('escapes each sign a sheet starts a formula with, and only at the start', async () => {
    const fixture = await render();
    const table = fixture.componentInstance.table();
    const notes = async (note: string) => {
      fixture.componentInstance.rows.set([{ ...DEVICES[0], note }]);
      await settle(fixture);
      return lines(pctTableCsv(table, { bom: false }))[1]
        .split(';')
        .at(-1);
    };
    expect(await notes('+1')).toBe("'+1");
    expect(await notes('@sum')).toBe("'@sum");
    expect(await notes('\tx')).toBe("'\tx");
    expect(await notes('\rx')).toBe(`"'\rx"`);
    expect(await notes('1=1')).toBe('1=1');
    expect(await notes('a-b')).toBe('a-b');
  });

  it("writes the rows the filter lets through, in the table's order, and the columns in the user's", async () => {
    const fixture = await render();
    const host = fixture.componentInstance;
    host.filter.set('a');
    host.sort.set([{ key: 'name', direction: 'ascending' }]);
    host.layout.set({
      order: ['on', 'name', 'power', 'seen', 'note'],
      hidden: ['seen'],
    });
    await settle(fixture);
    const table = host.table();
    expect(table.matchedRows().map((device) => device.name)).toEqual([
      'Fan',
      'Lamp',
    ]);
    expect(lines(pctTableCsv(table, { bom: false }))).toEqual([
      'On;Name;Power;Note',
      "true;Fan;;'-cold",
      "true;Lamp;1950,25;'=1+1",
      '',
    ]);
  });

  it('writes the columns a narrow frame moved into the details', async () => {
    const fixture = await render();
    await narrow(fixture, 1000);
    await narrow(fixture, 420);
    const table = fixture.componentInstance.table();
    expect(table.hiddenColumns()).toEqual(['note']);
    expect(lines(pctTableCsv(table))[0]).toBe('Name;Power;Seen;On;Note');
  });
});

describe('pctTableXlsx', () => {
  /** The sheet's XML, read from the stored zip a test's platform writes. */
  async function sheetOf(file: Blob): Promise<{ sheet: string; book: string }> {
    const bytes = new Uint8Array(
      await new Promise<ArrayBuffer>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as ArrayBuffer);
        reader.readAsArrayBuffer(file);
      }),
    );
    const text = new TextDecoder().decode(bytes);
    const part = (start: string, end: string) =>
      text.slice(text.indexOf(start), text.indexOf(end) + end.length);
    return {
      sheet: part('<worksheet', '</worksheet>'),
      book: part('<workbook', '</workbook>'),
    };
  }

  beforeEach(() => vi.stubGlobal('CompressionStream', undefined));
  afterEach(() => vi.unstubAllGlobals());

  it('writes a workbook of the rows: numbers, a moment on the zone’s clock, booleans, and texts', async () => {
    const fixture = await render();
    const file = await pctTableXlsx(fixture.componentInstance.table());
    expect(file.type).toBe(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    const { sheet, book } = await sheetOf(file);
    expect(book).toContain('<sheet name="Devices"');
    expect(sheet).toContain(
      '<c r="B2"><v>1950.25</v></c><c r="C2" s="3"><v>46329.586805555555</v></c><c r="D2" t="b"><v>1</v></c>' +
        '<c r="E2" t="inlineStr"><is><t xml:space="preserve">=1+1</t></is></c>',
    );
    // An empty number is no cell.
    expect(sheet).toContain(
      '<row r="4"><c r="A4" t="inlineStr"><is><t xml:space="preserve">Fan</t></is></c><c r="C4" s="3">',
    );
    // Each column as wide as its widest text and two: 'Boiler' 6, a moment 16, 'false' 5.
    expect(sheet).toContain(
      '<cols><col min="1" max="1" width="8" customWidth="1"/>' +
        '<col min="2" max="2" width="9" customWidth="1"/>' +
        '<col min="3" max="3" width="18" customWidth="1"/>' +
        '<col min="4" max="4" width="7" customWidth="1"/>' +
        '<col min="5" max="5" width="7" customWidth="1"/></cols>',
    );
  });

  it('writes a day where the column shows no time, and an empty instant or boolean as no cell', async () => {
    const fixture = await render(DayHost);
    const { sheet } = await sheetOf(
      await pctTableXlsx(fixture.componentInstance.table()),
    );
    // 13:05 UTC is the next day on Kiritimati, at +14.
    expect(sheet).toContain(
      '<row r="2"><c r="A2" s="2"><v>46330</v></c><c r="B2" t="b"><v>0</v></c></row><row r="3"></row><row r="4"></row>',
    );
    // A day column is as wide as its header or ten characters, and two; `false` is five.
    expect(sheet).toContain(
      '<cols><col min="1" max="1" width="12" customWidth="1"/><col min="2" max="2" width="7" customWidth="1"/></cols>',
    );
  });

  it('writes the texts the cells show with formatted, the sheet and widths it is told', async () => {
    const fixture = await render();
    const table = fixture.componentInstance.table();
    const { sheet, book } = await sheetOf(
      await pctTableXlsx(table, {
        formatted: true,
        sheet: 'House',
        widths: { name: 140, power: 77 },
      }),
    );
    expect(book).toContain('<sheet name="House"');
    expect(sheet).toContain(
      `<c r="B2" t="inlineStr"><is><t xml:space="preserve">${table.textOf(DEVICES[0], 'power')}</t></is></c>`,
    );
    expect(sheet).toContain(
      `<c r="D2" t="inlineStr"><is><t xml:space="preserve">${table.textOf(DEVICES[0], 'on')}</t></is></c>`,
    );
    expect(sheet).toContain(
      '<col min="1" max="1" width="20" customWidth="1"/><col min="2" max="2" width="11" customWidth="1"/>',
    );
  });

  it("names the sheet by the caption, else the table's label", async () => {
    const fixture = await render();
    fixture.componentInstance.caption.set('');
    await settle(fixture);
    const { book } = await sheetOf(
      await pctTableXlsx(fixture.componentInstance.table()),
    );
    expect(book).toContain('<sheet name="Devices of the house"');
  });

  it('caps a width at sixty characters', async () => {
    const fixture = await render();
    fixture.componentInstance.rows.set([
      { ...DEVICES[1], note: 'n'.repeat(80) },
    ]);
    await settle(fixture);
    const { sheet } = await sheetOf(
      await pctTableXlsx(fixture.componentInstance.table()),
    );
    expect(sheet).toContain(
      '<col min="5" max="5" width="60" customWidth="1"/>',
    );
  });
});
