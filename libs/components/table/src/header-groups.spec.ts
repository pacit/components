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
import { PctDataTable, pctHeadersRow } from './data-table';
import { PctTableColumns } from './data-table-columns';
import { PctTableDetails } from './data-table-details';
import { PctTableGrid, type PctTableGridCell } from './data-table-grid';
import { PctTablePage } from './data-table-page';
import { PctTableSelection } from './data-table-selection';
import { PctDetailsTemplate } from './data-table-slots';
import { pctColumnsOf } from './model/columns';
import type { PctTableLayout } from './model/layout';

interface Reading {
  readonly id: number;
  readonly name: string;
  readonly now: number;
  readonly peak: number;
  readonly today: number;
  readonly month: number;
  readonly fee: number;
  readonly room: string;
}

const col = pctColumnsOf<Reading>();
// Two groups, one of two levels, between two columns of none.
const columns = col.of([
  col.key('name', { header: 'Name' }),
  col.key('now', { header: 'Now', group: 'Power' }),
  col.key('peak', { header: 'Peak', group: 'Power' }),
  col.key('today', { header: 'Today', group: 'Cost/Spent' }),
  col.key('month', { header: 'Month', group: 'Cost/Spent' }),
  col.key('fee', { header: 'Fee', group: 'Cost/Fixed' }),
  col.key('room', { header: 'Room' }),
]);
type Map = typeof columns extends { readonly __map?: infer M } ? M : never;
type Layout = PctTableLayout<keyof Map & string>;
const byId = (reading: Reading) => reading.id;
const READINGS: readonly Reading[] = [
  {
    id: 1,
    name: 'Lamp',
    now: 12,
    peak: 15,
    today: 0.1,
    month: 2,
    fee: 1,
    room: 'Kitchen',
  },
  {
    id: 2,
    name: 'Boiler',
    now: 1900,
    peak: 2100,
    today: 3,
    month: 60,
    fee: 5,
    room: 'Cellar',
  },
];

@Component({
  imports: [PctDataTable],
  template: `
    <pct-data-table
      [rows]="rows"
      [columns]="columns"
      [rowId]="byId"
      [rowNumbers]="numbers()"
      [stickyHeader]="sticky()"
      caption="Readings"
    />
  `,
})
class Host {
  readonly columns = columns;
  readonly byId = byId;
  readonly rows = READINGS;
  readonly numbers = signal(false);
  readonly sticky = signal(true);
}

@Component({
  imports: [
    PctDataTable,
    PctTableSelection,
    PctTableDetails,
    PctDetailsTemplate,
  ],
  template: `
    <pct-data-table
      pctTableSelection
      pctTableDetails
      rowNumbers
      [rows]="rows"
      [columns]="columns"
      [rowId]="byId"
      caption="Readings"
    >
      <ng-template [pctDetails]="columns" let-reading>
        {{ reading.room }}
      </ng-template>
    </pct-data-table>
  `,
})
class LeadHost {
  readonly columns = columns;
  readonly byId = byId;
  readonly rows = READINGS;
}

@Component({
  imports: [PctDataTable, PctTableColumns],
  template: `
    <pct-data-table
      [pctTableColumns]="columns"
      [(layout)]="layout"
      [rows]="rows"
      [columns]="columns"
      [rowId]="byId"
      caption="Readings"
    />
  `,
})
class LaidHost {
  readonly columns = columns;
  readonly byId = byId;
  readonly rows = READINGS;
  readonly layout = signal<Layout>({});
}

@Component({
  imports: [PctDataTable, PctTableGrid],
  template: `
    <pct-data-table
      [pctTableGrid]="columns"
      [(focused)]="focused"
      [rows]="rows"
      [columns]="columns"
      [rowId]="byId"
      caption="Readings"
    />
  `,
})
class GridHost {
  readonly columns = columns;
  readonly byId = byId;
  readonly rows = READINGS;
  readonly focused = signal<PctTableGridCell<keyof Map & string> | null>(null);
}

@Component({
  imports: [PctDataTable, PctTablePage],
  template: `
    <pct-data-table
      pctTablePage
      [rowOffset]="10"
      [rowTotal]="40"
      [rows]="rows"
      [columns]="columns"
      [rowId]="byId"
      caption="Readings"
    />
  `,
})
class PagedHost {
  readonly table = viewChild.required(PctDataTable<Reading>);
  readonly columns = columns;
  readonly byId = byId;
  readonly rows = READINGS;
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
const headRows = () => Array.from(table().tHead?.rows ?? []);
/**
 * Each row of the header as its cells read: a group's header `G:`, a column's `H:`, an empty
 * cell as nothing, each with the columns it spans past one.
 */
const head = () =>
  headRows().map((row) =>
    Array.from(row.cells, (cell) => {
      const kind =
        cell.tagName !== 'TH'
          ? ''
          : cell.getAttribute('scope') === 'colgroup'
            ? 'G:'
            : 'H:';
      const text = (cell.textContent ?? '').replace(/\s+/g, ' ').trim();
      return `${kind}${text}${cell.colSpan > 1 ? ` x${cell.colSpan}` : ''}`;
    }),
  );
const active = () => document.activeElement as HTMLElement;

async function press(
  fixture: ComponentFixture<unknown>,
  key: string,
): Promise<void> {
  active().dispatchEvent(
    new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }),
  );
  await settle(fixture);
}

describe('header groups', () => {
  it('draws a row per level over the headers: a group over its columns, an empty cell over the rest', async () => {
    await render(Host);
    expect(head()).toEqual([
      ['', 'G:Power x2', 'G:Cost x3', ''],
      ['', ' x2', 'G:Spent x2', 'G:Fixed', ''],
      ['H:Name', 'H:Now', 'H:Peak', 'H:Today', 'H:Month', 'H:Fee', 'H:Room'],
    ]);
    // Outside a window, the rows say no place.
    expect(headRows().map((row) => row.getAttribute('aria-rowindex'))).toEqual([
      null,
      null,
      null,
    ]);
    expect(
      headRows()[1].querySelector('th')?.classList.contains('pct-table-header'),
    ).toBe(true);
  });

  it('heads each row of groups with the leading cells, empty', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.numbers.set(true);
    await settle(fixture);
    expect(head()[0]).toEqual(['', '', 'G:Power x2', 'G:Cost x3', '']);
    expect(head()[2][0]).toBe('H:#Row');
    expect(headRows()[0].cells[0].tagName).toBe('TD');
  });

  it("heads each row of groups with the checkboxes', the disclosures' and the numbers' cells, empty", async () => {
    await render(LeadHost);
    expect(head()[0]).toEqual(['', '', '', '', 'G:Power x2', 'G:Cost x3', '']);
    expect(Array.from(headRows()[0].cells, (cell) => cell.tagName)).toEqual([
      'TD',
      'TD',
      'TD',
      'TD',
      'TH',
      'TH',
      'TD',
    ]);
    expect(headRows()[0].querySelector('input, button')).toBeNull();
  });

  it('leaves a hidden column out of its group, a group hidden whole out of the rows, and draws no row with no group shown', async () => {
    const fixture = await render(LaidHost);
    const { layout } = fixture.componentInstance;
    layout.set({ hidden: ['peak'] });
    await settle(fixture);
    expect(head()[0]).toEqual(['', 'G:Power', 'G:Cost x3', '']);
    layout.set({ hidden: ['now', 'peak'] });
    await settle(fixture);
    expect(head()[0]).toEqual(['', 'G:Cost x3', '']);
    layout.set({ hidden: ['today', 'month', 'fee'] });
    await settle(fixture);
    expect(head()).toEqual([
      ['', 'G:Power x2', ''],
      ['H:Name', 'H:Now', 'H:Peak', 'H:Room'],
    ]);
    layout.set({ hidden: ['now', 'peak', 'today', 'month', 'fee'] });
    await settle(fixture);
    expect(head()).toEqual([['H:Name', 'H:Room']]);
  });

  it("sticks a pinned group with its columns, the edge's shadow on the cell that holds the edge", async () => {
    // Every column 100 px wide: an offset tells the columns apart.
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(
      function (this: HTMLElement) {
        return {
          width: this.dataset['pctColumn'] === undefined ? 0 : 100,
          height: 20,
          top: 0,
          left: 0,
          right: 0,
          bottom: 20,
        } as DOMRect;
      },
    );
    const fixture = await render(LaidHost);
    const { layout } = fixture.componentInstance;
    layout.set({ pinned: { start: ['now'] } });
    await settle(fixture);
    expect(head()[0]).toEqual(['G:Power x2', '', 'G:Cost x3', '']);
    const [power, name] = Array.from(headRows()[0].cells);
    expect(power.getAttribute('data-pct-pinned')).toBe('start edge');
    // The offset of a group on the start is its first column's.
    expect(power.style.getPropertyValue('--_at')).toBe('0px');
    expect(name.hasAttribute('data-pct-pinned')).toBe(false);
    // Two groups on the start: the second's offset is the width of the first.
    layout.set({ pinned: { start: ['now', 'today'] } });
    await settle(fixture);
    expect(head()[0]).toEqual(['G:Power x2', 'G:Cost x3', ' x2']);
    expect(headRows()[0].cells[1].style.getPropertyValue('--_at')).toBe(
      '200px',
    );
    // Two columns of no group side by side, one pinned and one not, are two cells: a cell
    // sticks as one.
    layout.set({
      order: ['name', 'room', 'now', 'peak', 'today', 'month', 'fee'],
      pinned: { start: ['name'] },
    });
    await settle(fixture);
    expect(head()[0]).toEqual(['', '', 'G:Power x2', 'G:Cost x3']);
    expect(headRows()[0].cells[0].getAttribute('data-pct-pinned')).toBe(
      'start edge',
    );
    expect(headRows()[0].cells[1].hasAttribute('data-pct-pinned')).toBe(false);
    // Two columns of no group on one edge are one cell, apart from the ones that scroll.
    layout.set({ pinned: { start: ['name', 'room'] } });
    await settle(fixture);
    expect(head()[0]).toEqual([' x2', 'G:Power x2', 'G:Cost x3']);
    expect(headRows()[0].cells[0].getAttribute('data-pct-pinned')).toBe(
      'start edge',
    );
    // Pinned to the end, the cell at the edge is the first of them, and its offset from the
    // end is its last column's: the group reaches the end.
    layout.set({ pinned: { end: ['today'] } });
    await settle(fixture);
    expect(head()[0]).toEqual(['', 'G:Power x2', '', 'G:Cost x3']);
    const cost = headRows()[0].cells[3];
    expect(cost.getAttribute('data-pct-pinned')).toBe('end edge');
    expect(cost.style.getPropertyValue('--_at')).toBe('0px');
    expect(
      Array.from(headRows()[2].cells, (cell) =>
        cell.style.getPropertyValue('--_at'),
      ),
    ).toEqual(['', '', '', '', '200px', '100px', '0px']);
    // Two groups on the end: the second's offset is the width of the first. The two
    // columns of no group, adjacent now, stand under one cell.
    layout.set({ pinned: { end: ['now', 'today'] } });
    await settle(fixture);
    expect(head()[0]).toEqual([' x2', 'G:Power x2', 'G:Cost x3']);
    expect(headRows()[0].cells[1].style.getPropertyValue('--_at')).toBe(
      '300px',
    );
    expect(headRows()[0].cells[1].getAttribute('data-pct-pinned')).toBe(
      'end edge',
    );
  });

  it('writes each row of the header its offset while the header sticks, and none when it scrolls', async () => {
    // The header's rows 20 px apart, the first of them 100 px down the page: an offset is
    // measured from the first row, not from the page.
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(
      function (this: HTMLElement) {
        const row =
          this instanceof HTMLTableRowElement &&
          this.parentElement?.tagName === 'THEAD'
            ? this.rowIndex
            : null;
        const top = row === null ? 0 : 100 + 20 * row;
        return {
          width: 0,
          height: 20,
          top,
          left: 0,
          right: 0,
          bottom: top + 20,
        } as DOMRect;
      },
    );
    const fixture = await render(Host);
    expect(
      headRows().map((row) => row.style.getPropertyValue('--_top')),
    ).toEqual(['0px', '20px', '40px']);
    fixture.componentInstance.sticky.set(false);
    await settle(fixture);
    expect(
      headRows().map((row) => row.style.getPropertyValue('--_top')),
    ).toEqual(['', '', '']);
  });

  it('finds no headers’ row in a table with no header', () => {
    expect(pctHeadersRow(document.createElement('table'))).toBeUndefined();
  });

  it("counts the groups' rows in each row's place among all the rows", async () => {
    await render(PagedHost);
    expect(table().getAttribute('aria-rowcount')).toBe('43');
    expect(
      Array.from(table().querySelectorAll('tr'), (row) =>
        row.getAttribute('aria-rowindex'),
      ),
    ).toEqual(['1', '2', '3', '14', '15']);
  });

  it("the grid's header is the columns' row, and a group's cell is a cell of no model", async () => {
    const fixture = await render(GridHost);
    const { focused } = fixture.componentInstance;
    (table().querySelector('[tabindex="0"]') as HTMLElement).focus();
    await settle(fixture);
    expect(focused()).toEqual({ row: 1, column: 'name' });
    await press(fixture, 'ArrowUp');
    // The header's sort button: the lone control of its cell.
    expect(active()).toBe(headRows()[2].cells[0].querySelector('button'));
    expect(focused()).toEqual({ row: null, column: 'name' });
    await press(fixture, 'ArrowUp');
    expect(active()).toBe(headRows()[1].cells[0]);
    expect(focused()).toBeNull();
    await press(fixture, 'ArrowRight');
    expect(active()).toBe(headRows()[1].cells[1]);
    // Down from the empty cell over `Now` and `Peak`: the header of its first column.
    await press(fixture, 'ArrowDown');
    expect(active()).toBe(headRows()[2].cells[1].querySelector('button'));
    expect(focused()).toEqual({ row: null, column: 'now' });
  });
});
