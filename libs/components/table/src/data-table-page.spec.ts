import {
  Component,
  ErrorHandler,
  provideZonelessChangeDetection,
  signal,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { PctDataTable } from './data-table';
import { PctTableDetails } from './data-table-details';
import { PctTablePage } from './data-table-page';
import { PctDetailsTemplate } from './data-table-slots';
import { pctColumnsOf, type PctRowId } from './model/columns';

interface Register {
  readonly id: number;
  readonly name: string;
  readonly value: number;
}

const col = pctColumnsOf<Register>();
const columns = col.of([
  col.key('name', { header: 'Name' }),
  col.key('value', { header: 'Value' }),
]);
const summed = col.of([
  col.key('name', { header: 'Name' }),
  col.key('value', { header: 'Value', aggregate: 'sum' }),
]);

/** The page of three registers that stands `offset` rows into the list. */
function pageOf(offset: number): readonly Register[] {
  return [1, 2, 3].map((i) => ({
    id: offset + i,
    name: `Register ${offset + i}`,
    value: 1,
  }));
}

@Component({
  imports: [PctDataTable, PctTablePage, PctTableDetails, PctDetailsTemplate],
  template: `
    <pct-data-table
      pctTablePage
      pctTableDetails
      [(details)]="open"
      caption="Registers"
      [rowOffset]="offset()"
      [rowTotal]="total()"
      [rows]="rows()"
      [columns]="columns()"
      [rowId]="byId"
    >
      <ng-template [pctDetails]="columns()" let-register>
        {{ register.value }}
      </ng-template>
    </pct-data-table>
  `,
})
class PageHost {
  readonly offset = signal(40);
  readonly total = signal(1000);
  readonly rows = signal(pageOf(40));
  readonly columns = signal(columns);
  readonly open = signal<readonly PctRowId[]>([]);
  readonly byId = (register: Register) => register.id;
}

@Component({
  imports: [PctDataTable, PctTablePage],
  template: `<pct-data-table
    pctTablePage
    caption="Registers"
    rowTotal="7"
    [rows]="rows"
    [columns]="columns"
    [rowId]="byId"
  />`,
})
class DefaultHost {
  readonly rows = pageOf(0);
  readonly columns = columns;
  readonly byId = (register: Register) => register.id;
}

let errors: unknown[] = [];
const globals = globalThis as {
  ResizeObserver?: unknown;
  IntersectionObserver?: unknown;
};

beforeEach(() => {
  errors = [];
  // jsdom lays nothing out: the observers the table watches its frame with observe nothing.
  for (const name of ['ResizeObserver', 'IntersectionObserver'] as const)
    globals[name] = class {
      observe(): void {
        // Nothing to observe in jsdom.
      }
      disconnect(): void {
        // Nothing to let go.
      }
    };
});

afterEach(() => {
  delete globals.ResizeObserver;
  delete globals.IntersectionObserver;
  expect(errors).toEqual([]);
});

async function render<H>(host: new () => H) {
  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      {
        provide: ErrorHandler,
        useValue: { handleError: (error: unknown) => errors.push(error) },
      },
    ],
  });
  const fixture = TestBed.createComponent(host);
  fixture.detectChanges();
  await fixture.whenStable();
  const table = (fixture.nativeElement as HTMLElement).querySelector(
    'table',
  ) as HTMLTableElement;
  const places = () =>
    Array.from(table.querySelectorAll('tr')).map((tr) =>
      tr.getAttribute('aria-rowindex'),
    );
  return { fixture, table, places };
}

describe('PctTablePage', () => {
  it('tells a reader each row’s place among all the rows, and how many there are', async () => {
    const { table, places } = await render(PageHost);
    // The header's row, then rows 41 to 43 of a thousand: the header's row is the first.
    expect(table.getAttribute('aria-rowcount')).toBe('1001');
    expect(places()).toEqual(['1', '42', '43', '44']);
  });

  it('follows the page and the total', async () => {
    const { fixture, table, places } = await render(PageHost);
    fixture.componentInstance.offset.set(0);
    fixture.componentInstance.rows.set(pageOf(0));
    fixture.componentInstance.total.set(3);
    await fixture.whenStable();
    expect(table.getAttribute('aria-rowcount')).toBe('4');
    expect(places()).toEqual(['1', '2', '3', '4']);
  });

  it('counts the foot’s row last, after every row', async () => {
    const { fixture, table, places } = await render(PageHost);
    fixture.componentInstance.columns.set(summed as unknown as typeof columns);
    await fixture.whenStable();
    expect(table.getAttribute('aria-rowcount')).toBe('1002');
    expect(places()).toEqual(['1', '42', '43', '44', '1002']);
  });

  it('counts a row’s details as a line of the page, in the places and the count', async () => {
    const { fixture, table, places } = await render(PageHost);
    fixture.componentInstance.open.set([41]);
    await fixture.whenStable();
    expect(places()).toEqual(['1', '42', '43', '44', '45']);
    expect(table.getAttribute('aria-rowcount')).toBe('1002');
  });

  it('keeps the last page’s places within the count, a details row open on it', async () => {
    const { fixture, table, places } = await render(PageHost);
    fixture.componentInstance.offset.set(997);
    fixture.componentInstance.rows.set(pageOf(997));
    fixture.componentInstance.columns.set(summed as unknown as typeof columns);
    fixture.componentInstance.open.set([1000]);
    await fixture.whenStable();
    // Rows 998 to 1,000, the last one's details, and the foot: the foot's row is the count.
    expect(places()).toEqual(['1', '999', '1000', '1001', '1002', '1003']);
    expect(table.getAttribute('aria-rowcount')).toBe('1003');
  });

  it('starts the page at the first row when no offset is given', async () => {
    const { table, places } = await render(DefaultHost);
    expect(table.getAttribute('aria-rowcount')).toBe('8');
    expect(places()).toEqual(['1', '2', '3', '4']);
  });
});
