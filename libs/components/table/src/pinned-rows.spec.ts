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
import { PctTableDetails } from './data-table-details';
import { PctTableGrid, type PctTableGridCell } from './data-table-grid';
import { PctTablePage } from './data-table-page';
import { PctTablePinnedRows } from './data-table-pinned-rows';
import { PctTableSelection } from './data-table-selection';
import { PctDetailsTemplate } from './data-table-slots';
import { PctTableWindow } from './data-table-window';
import { pctColumnsOf } from './model/columns';
import type { PctTableSort } from './table';

interface Rule {
  readonly id: number;
  readonly name: string;
  readonly watts: number;
}

const col = pctColumnsOf<Rule>();
const columns = col.of([
  col.key('name', { header: 'Name' }),
  col.key('watts', { header: 'Watts' }),
]);
const byId = (rule: Rule) => rule.id;
const RULES: readonly Rule[] = [
  { id: 1, name: 'Lamp', watts: 12 },
  { id: 2, name: 'Boiler', watts: 1900 },
  { id: 3, name: 'Fan', watts: 40 },
];
const TOTAL: Rule = { id: 100, name: 'Total', watts: 1952 };
const NEW: Rule = { id: 101, name: 'New rule', watts: 0 };

@Component({
  imports: [PctDataTable, PctTablePinnedRows],
  template: `
    <pct-data-table
      pctTablePinnedRows
      [pinnedTop]="top()"
      [pinnedBottom]="bottom()"
      [rows]="rows"
      [columns]="columns"
      [rowId]="byId"
      [sort]="sort()"
      [filter]="filter()"
      [stickyHeader]="sticky()"
      rowNumbers
      caption="Rules"
    />
  `,
})
class Host {
  readonly table = viewChild.required(PctDataTable<Rule>);
  readonly columns = columns;
  readonly byId = byId;
  readonly rows = RULES;
  readonly top = signal<readonly Rule[]>([TOTAL]);
  readonly bottom = signal<readonly Rule[]>([NEW]);
  readonly sort = signal<readonly PctTableSort<'name' | 'watts'>[]>([]);
  readonly filter = signal('');
  readonly sticky = signal(true);
}

@Component({
  imports: [PctDataTable, PctTablePinnedRows, PctTablePage],
  template: `
    <pct-data-table
      pctTablePinnedRows
      pctTablePage
      [pinnedTop]="[top]"
      [pinnedBottom]="[bottom, bottom2]"
      [rowOffset]="10"
      [rowTotal]="40"
      [rows]="rows"
      [columns]="columns"
      [rowId]="byId"
      caption="Rules"
    />
  `,
})
class PagedHost {
  readonly columns = columns;
  readonly byId = byId;
  readonly rows = RULES;
  readonly top = TOTAL;
  readonly bottom = NEW;
  readonly bottom2: Rule = { id: 102, name: 'Newer', watts: 1 };
}

@Component({
  imports: [
    PctDataTable,
    PctTablePinnedRows,
    PctTableSelection,
    PctTableDetails,
    PctDetailsTemplate,
  ],
  template: `
    <pct-data-table
      pctTablePinnedRows
      pctTableSelection
      pctTableDetails
      [pinnedTop]="[top]"
      [(value)]="picked"
      [rows]="rows"
      [columns]="columns"
      [rowId]="byId"
      rowNumbers
      caption="Rules"
    >
      <ng-template [pctDetails]="columns" let-rule
        >{{ rule.name }} in full</ng-template
      >
    </pct-data-table>
  `,
})
class LeadHost {
  readonly columns = columns;
  readonly byId = byId;
  readonly rows = RULES;
  readonly top = TOTAL;
  readonly picked = signal<readonly number[]>([100]);
}

@Component({
  imports: [PctDataTable, PctTablePinnedRows],
  template: `
    <pct-data-table
      pctTablePinnedRows
      [pinnedBottom]="[bottom]"
      [rows]="rows"
      [columns]="columns"
      [rowId]="byId"
      caption="Rules"
    />
  `,
})
class BottomHost {
  readonly columns = columns;
  readonly byId = byId;
  readonly rows = RULES;
  readonly bottom = NEW;
}

@Component({
  imports: [PctDataTable, PctTablePinnedRows, PctTableWindow],
  template: `
    <pct-data-table
      pctTablePinnedRows
      pctTableWindow
      [pinnedTop]="top()"
      [pinnedBottom]="bottom()"
      [stickyHeader]="sticky()"
      [rows]="rows"
      [columns]="columns"
      [rowId]="byId"
      caption="Rules"
    />
  `,
})
class WindowHost {
  readonly window = viewChild.required(PctTableWindow);
  readonly columns = columns;
  readonly byId = byId;
  readonly rows: readonly Rule[] = Array.from({ length: 100 }, (_, i) => ({
    id: i,
    name: `Rule ${i}`,
    watts: i,
  }));
  readonly top = signal<readonly Rule[]>([TOTAL]);
  readonly bottom = signal<readonly Rule[]>([NEW]);
  readonly sticky = signal(true);
}

@Component({
  imports: [PctDataTable, PctTablePinnedRows, PctTableGrid],
  template: `
    <pct-data-table
      pctTablePinnedRows
      [pctTableGrid]="columns"
      [(focused)]="focused"
      [pinnedTop]="[top]"
      [pinnedBottom]="[bottom]"
      [rows]="rows"
      [columns]="columns"
      [rowId]="byId"
      caption="Rules"
    />
  `,
})
class GridHost {
  readonly columns = columns;
  readonly byId = byId;
  readonly rows = RULES;
  readonly top = TOTAL;
  readonly bottom = NEW;
  readonly focused = signal<PctTableGridCell<'name' | 'watts'> | null>(null);
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
const bodies = () => Array.from(table().tBodies);
/** Each body as its pin and the first texts of its rows. */
const laid = () =>
  bodies().map((body) => [
    body.dataset['pctPinned'] ?? '',
    ...Array.from(body.rows, (row) =>
      (
        row.querySelector('td:not(.pct-data-table__number)') as HTMLElement
      ).textContent?.trim(),
    ),
  ]);

describe('pinned rows', () => {
  it('draws the rows pinned above and below in bodies of their own, outside the sort and the filter', async () => {
    const fixture = await render(Host);
    const { sort, filter, top, bottom } = fixture.componentInstance;
    expect(laid()).toEqual([
      ['top', 'Total'],
      ['', 'Lamp', 'Boiler', 'Fan'],
      ['bottom', 'New rule'],
    ]);
    // A pinned row is no line: it has no index, and the lines count the data alone.
    expect(
      bodies().map((body) =>
        Array.from(body.rows, (row) => row.dataset['pctIndex'] ?? '-'),
      ),
    ).toEqual([['-'], ['0', '1', '2'], ['-']]);
    expect(fixture.componentInstance.table().lines()).toHaveLength(3);
    sort.set([{ key: 'name', direction: 'ascending' }]);
    filter.set('a');
    await settle(fixture);
    expect(laid()).toEqual([
      ['top', 'Total'],
      ['', 'Fan', 'Lamp'],
      ['bottom', 'New rule'],
    ]);
    // None pinned: no body of theirs.
    top.set([]);
    bottom.set([]);
    await settle(fixture);
    expect(laid()).toEqual([['', 'Fan', 'Lamp']]);
  });

  it('numbers the rows for a reader in the DOM’s order on a page: pinned above, the page, pinned below', async () => {
    await render(PagedHost);
    expect(table().getAttribute('aria-rowcount')).toBe('44');
    expect(
      bodies().map((body) =>
        Array.from(body.rows, (row) => row.getAttribute('aria-rowindex')),
      ),
    ).toEqual([['2'], ['13', '14', '15'], ['43', '44']]);
  });

  it('leaves a reader’s numbers out where every row is drawn', async () => {
    await render(Host);
    expect(table().hasAttribute('aria-rowcount')).toBe(false);
    expect(
      bodies().flatMap((body) =>
        Array.from(body.rows, (row) => row.getAttribute('aria-rowindex')),
      ),
    ).toEqual([null, null, null, null, null]);
    expect(
      Array.from(table().querySelectorAll('.pct-data-table__number'), (cell) =>
        cell.textContent?.trim(),
      ),
    ).toEqual(['#Row', '', '1', '2', '3', '']);
  });

  it('draws a pinned row with the leading cells: its checkbox, which picks it by its id, no disclosure, no number', async () => {
    const fixture = await render(LeadHost);
    const pinned = table().querySelector(
      'tbody[data-pct-pinned="top"] > tr',
    ) as HTMLTableRowElement;
    const [pick, disclosure, number] = Array.from(pinned.cells);
    const box = pick.querySelector('input') as HTMLInputElement;
    expect(box.checked).toBe(true);
    expect(disclosure.querySelector('button')).toBeNull();
    expect(number.textContent?.trim()).toBe('');
    // The row of the data keeps its disclosure and its number.
    const first = table().querySelector(
      'tbody:not([data-pct-pinned]) > tr',
    ) as HTMLTableRowElement;
    expect(first.cells[1].querySelector('button')).not.toBeNull();
    expect(first.cells[2].textContent?.trim()).toBe('1');
    box.click();
    await settle(fixture);
    expect(fixture.componentInstance.picked()).toEqual([]);
    // A press on the label beside the checkbox is the label's, which presses the checkbox.
    (pick.querySelector('label') as HTMLElement).click();
    await settle(fixture);
    expect(fixture.componentInstance.picked()).toEqual([100]);
  });

  it('pins no row above when only the rows below are given', async () => {
    await render(BottomHost);
    expect(table().querySelector('tbody[data-pct-pinned="top"]')).toBeNull();
    expect(
      Array.from(table().querySelectorAll('tbody'), (body) =>
        body.getAttribute('data-pct-pinned'),
      ),
    ).toEqual([null, 'bottom']);
  });

  it('leaves the rows pinned above and below out of the window’s view, while they stick', async () => {
    // A header of 40 px, a row pinned above of 40, a row pinned below of 60; the bodies start
    // under the header and the rows pinned above, and move with the scroll, as a browser
    // lays them.
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(
      function (this: HTMLElement) {
        const frame = this.closest('pct-table-frame') as HTMLElement | null;
        const pinned = this.closest('tbody[data-pct-pinned]');
        const above =
          frame?.querySelectorAll('tbody[data-pct-pinned="top"] > tr').length ??
          0;
        const top =
          this.localName === 'tbody'
            ? 40 + 40 * above - (frame?.scrollTop ?? 0)
            : 0;
        const height =
          this.localName === 'thead'
            ? 40
            : this.localName === 'tr' && pinned !== null
              ? pinned.getAttribute('data-pct-pinned') === 'bottom'
                ? 60
                : 40
              : 0;
        return { top, height, width: 0, bottom: top + height } as DOMRect;
      },
    );
    Object.defineProperty(document.documentElement, 'clientHeight', {
      configurable: true,
      get: () => 800,
    });
    try {
      const fixture = await render(WindowHost);
      const frame = document.querySelector('pct-table-frame') as HTMLElement;
      Object.defineProperties(frame, {
        scrollTop: { configurable: true, get: () => 0 },
        clientHeight: { configurable: true, get: () => 400 },
      });
      const drawn = async () => {
        await settle(fixture);
        return fixture.componentInstance.window().drawn().end;
      };
      // The frame laid out after the first render: the view is read again with the pinned
      // rows, so the bare view is read with none.
      fixture.componentInstance.top.set([]);
      fixture.componentInstance.bottom.set([]);
      // Nine lines of 40 px fill the view under the header, and eight more are drawn.
      const bare = await drawn();
      expect(bare).toBe(17);
      // The row pinned above covers 40 px more and the two below 120: five lines.
      fixture.componentInstance.top.set([TOTAL]);
      fixture.componentInstance.bottom.set([
        NEW,
        { id: 102, name: 'Newer', watts: 1 },
      ]);
      expect(await drawn()).toBe(13);
      // Nothing sticks: the view is the frame's whole height, ten lines, and the pinned rows
      // scroll with the lines, covering nothing.
      fixture.componentInstance.sticky.set(false);
      expect(await drawn()).toBe(18);
    } finally {
      delete (document.documentElement as { clientHeight?: number })
        .clientHeight;
    }
  });

  it('sticks the rows pinned above under the header, each at its measured offset, and those below above each other', async () => {
    // The header's row 20 px tall at the top; each pinned row 20 px, the rows pinned below
    // all stuck at one place, as a frame scrolled to its end would have them: the offsets
    // come from the heights, not from where a stuck row stands.
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(
      function (this: HTMLElement) {
        const row = this.closest('tr');
        const body = row?.parentElement as HTMLElement | null;
        let top = 0;
        if (row !== null && body !== null) {
          const at = Array.from(body.children).indexOf(row);
          top =
            body.tagName === 'THEAD'
              ? 20 * at
              : body.dataset['pctPinned'] === 'top'
                ? 20
                : body.dataset['pctPinned'] === 'bottom'
                  ? 200
                  : 100 + 20 * at;
        }
        const height = this.tagName === 'THEAD' ? 20 : row === null ? 0 : 20;
        return { top, bottom: top + height, height, width: 0 } as DOMRect;
      },
    );
    const fixture = await render(Host);
    fixture.componentInstance.top.set([
      TOTAL,
      { id: 103, name: 'Average', watts: 650 },
    ]);
    fixture.componentInstance.bottom.set([
      NEW,
      { id: 102, name: 'Newer', watts: 1 },
    ]);
    await settle(fixture);
    const offsets = (pin: string, property: string) =>
      Array.from(
        table().querySelectorAll<HTMLElement>(
          `tbody[data-pct-pinned="${pin}"] > tr`,
        ),
        (row) => row.style.getPropertyValue(property),
      );
    expect(offsets('top', '--_top')).toEqual(['20px', '40px']);
    expect(offsets('bottom', '--_bottom')).toEqual(['20px', '0px']);
    const frame = document.querySelector('pct-table-frame') as HTMLElement;
    // The header's cover: its own height and the rows pinned under it; the frame's end is
    // covered by the rows pinned below, and a row scrolled to stands clear of both.
    expect(frame.style.getPropertyValue('--_head')).toBe('60px');
    expect(frame.style.scrollPaddingBlockStart).toBe('60px');
    expect(frame.style.scrollPaddingBlockEnd).toBe('40px');
    fixture.componentInstance.sticky.set(false);
    await settle(fixture);
    expect(offsets('top', '--_top')).toEqual(['', '']);
    expect(offsets('bottom', '--_bottom')).toEqual(['', '']);
    expect(frame.style.getPropertyValue('--_head')).toBe('');
    expect(frame.style.scrollPaddingBlockStart).toBe('');
    expect(frame.style.scrollPaddingBlockEnd).toBe('');
  });

  it('keeps a pinned row out of the grid: the arrows step over the rows of the data alone', async () => {
    const fixture = await render(GridHost);
    const first = table().querySelector(
      'tbody:not([data-pct-pinned]) td[tabindex]',
    ) as HTMLElement;
    first.focus();
    await settle(fixture);
    expect(fixture.componentInstance.focused()).toEqual({
      row: 1,
      column: 'name',
    });
    // Up from the first row is the header, over the row pinned between them.
    first.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }),
    );
    await settle(fixture);
    expect(fixture.componentInstance.focused()).toEqual({
      row: null,
      column: 'name',
    });
    // The pinned rows are not painted: no stop, no column index, no selection.
    expect(
      table().querySelectorAll(
        'tbody[data-pct-pinned] [tabindex], tbody[data-pct-pinned] [aria-colindex], tbody[data-pct-pinned] [aria-selected]',
      ),
    ).toHaveLength(0);
    expect(
      table().querySelectorAll('tbody:not([data-pct-pinned]) td[tabindex]')
        .length,
    ).toBeGreaterThan(0);
  });
});
