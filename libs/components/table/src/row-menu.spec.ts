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
import { PctMenu, PctMenuItem } from '@pacit/components/menu';
import { PctDataTable } from './data-table';
import { PctTableColumns } from './data-table-columns';
import { PctTableDetails } from './data-table-details';
import { PctTableColumnFilters } from './data-table-filters';
import { PctTableGrid } from './data-table-grid';
import { PctTableGroups } from './data-table-groups';
import { PctTablePinnedRows } from './data-table-pinned-rows';
import {
  PctTableRemote,
  type PctTableAnswer,
  type PctTableRequest,
} from './data-table-remote';
import { PctTableRowMenu } from './data-table-row-menu';
import { PctCellTemplate, PctDetailsTemplate } from './data-table-slots';
import { PctTableWindow } from './data-table-window';
import { pctColumnsOf, type PctRowId } from './model/columns';
import type { PctTableLayout } from './model/layout';

interface Rule {
  readonly id: number;
  readonly name: string;
  readonly watts: number;
}

const col = pctColumnsOf<Rule>();
const columns = col.of([
  col.key('name', { header: 'Name' }),
  col.key('watts', { header: 'Watts', aggregate: 'sum' }),
]);
const byId = (rule: Rule) => rule.id;
const RULES: readonly Rule[] = [
  { id: 1, name: 'Lamp', watts: 12 },
  { id: 2, name: 'Boiler', watts: 1900 },
  { id: 3, name: 'Fan', watts: 40 },
];

@Component({
  imports: [
    PctDataTable,
    PctTableRowMenu,
    PctTablePinnedRows,
    PctTableDetails,
    PctDetailsTemplate,
    PctCellTemplate,
    PctMenu,
    PctMenuItem,
  ],
  template: `
    @if (shown()) {
      <pct-data-table
        [pctTableRowMenu]="second() ? other : actions"
        #rowMenu="pctTableRowMenu"
        pctTablePinnedRows
        pctTableDetails
        [details]="open()"
        [pinnedTop]="top()"
        [rows]="rows()"
        [columns]="columns"
        [rowId]="byId"
        caption="Rules"
      >
        <ng-template [pctCell]="columns" pctCellOf="watts" let-rule>
          {{ rule.watts }}
          @if (rule.id === 3) {
            <input aria-label="Note" />
            <a href="#fan">Fan’s page</a>
          }
        </ng-template>
        <ng-template [pctDetails]="columns" let-rule
          >{{ rule.name }} in full</ng-template
        >
      </pct-data-table>
    }
    <pct-menu #actions (closed)="closed.push($event)">
      <button id="remove" pctMenuItem (click)="remove(rowMenu()?.id() ?? null)">
        Remove
      </button>
      <button id="keep" pctMenuItem>Keep</button>
      <button id="pin" pctMenuItem (click)="pin(rowMenu()?.id() ?? null)">
        Pin
      </button>
    </pct-menu>
    <pct-menu #other>
      <button id="other" pctMenuItem>Other</button>
    </pct-menu>
  `,
})
class Host {
  readonly columns = columns;
  readonly byId = byId;
  readonly rows = signal(RULES);
  readonly top = signal<readonly Rule[]>([]);
  readonly open = signal<readonly PctRowId[]>([]);
  readonly shown = signal(true);
  readonly second = signal(false);
  readonly rowMenu = viewChild(PctTableRowMenu);
  readonly menu = viewChild.required<PctMenu>('actions');
  readonly other = viewChild.required<PctMenu>('other');
  readonly removed: (PctRowId | null)[] = [];
  readonly closed: string[] = [];
  remove(id: PctRowId | null): void {
    this.removed.push(id);
    this.rows.set(this.rows().filter((rule) => rule.id !== id));
  }
  /** Moves the row out of the rows into those pinned above: its row is drawn anew there. */
  pin(id: PctRowId | null): void {
    const rule = this.rows().find((each) => each.id === id) as Rule;
    this.rows.set(this.rows().filter((each) => each.id !== id));
    this.top.set([...this.top(), rule]);
  }
}

@Component({
  imports: [PctDataTable, PctTableRowMenu, PctTableGroups, PctMenu],
  template: `
    <pct-data-table
      [pctTableRowMenu]="actions"
      [pctTableGroups]="columns"
      [groupBy]="['name']"
      [rows]="rows"
      [columns]="columns"
      [rowId]="byId"
      caption="Rules"
    />
    <pct-menu #actions />
  `,
})
class GroupedHost {
  readonly columns = columns;
  readonly byId = byId;
  readonly rows = RULES;
}

/** The columns in a group, filtered in a row, laid out, the last pinned to the end. */
const grouped = col.of([
  col.key('name', { header: 'Name', group: 'Rule' }),
  col.key('watts', { header: 'Watts', group: 'Rule' }),
]);

@Component({
  imports: [
    PctDataTable,
    PctTableRowMenu,
    PctTableColumnFilters,
    PctTableColumns,
    PctMenu,
  ],
  template: `
    <pct-data-table
      [pctTableRowMenu]="actions"
      [pctTableColumnFilters]="columns"
      [pctTableColumns]="columns"
      [filterRow]="true"
      [(layout)]="layout"
      [rows]="rows"
      [columns]="columns"
      [rowId]="byId"
      caption="Rules"
    />
    <pct-menu #actions />
  `,
})
class LinedHost {
  readonly columns = grouped;
  readonly byId = byId;
  readonly rows = RULES;
  readonly layout = signal<PctTableLayout<'name' | 'watts'>>({});
}

/** A source asked for blocks, which answers when told to. */
let answers: (() => void)[] = [];
const load = (
  request: PctTableRequest<string>,
): Promise<PctTableAnswer<Rule>> =>
  new Promise((resolve) =>
    answers.push(() =>
      resolve({
        rows: Array.from({ length: request.to - request.from }, (_, i) => ({
          id: request.from + i,
          name: `Rule ${request.from + i}`,
          watts: 1,
        })),
        total: 1000,
      }),
    ),
  );

@Component({
  imports: [
    PctDataTable,
    PctTableRowMenu,
    PctTableWindow,
    PctTableRemote,
    PctMenu,
  ],
  template: `
    <pct-data-table
      [pctTableRowMenu]="actions"
      pctTableWindow
      [pctTableRemote]="load"
      blockSize="50"
      [columns]="columns"
      [rowId]="byId"
      caption="Rules"
    />
    <pct-menu #actions />
  `,
})
class RemoteHost {
  readonly columns = columns;
  readonly byId = byId;
  readonly load = load;
}

@Component({
  imports: [
    PctDataTable,
    PctTableRowMenu,
    PctTableGrid,
    PctTableColumns,
    PctMenu,
  ],
  template: `
    <pct-data-table
      [pctTableRowMenu]="actions"
      [pctTableGrid]="columns"
      [pctTableColumns]="columns"
      [(layout)]="layout"
      [rows]="rows"
      [columns]="columns"
      [rowId]="byId"
      caption="Rules"
    />
    <pct-menu #actions />
  `,
})
class GridHost {
  readonly columns = columns;
  readonly byId = byId;
  readonly rows = RULES;
  readonly layout = signal<PctTableLayout<'name' | 'watts'>>({});
}

let errors: unknown[] = [];

const globals = globalThis as {
  ResizeObserver?: unknown;
  IntersectionObserver?: unknown;
};

afterEach(() => {
  answers = [];
});

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
  for (let round = 0; round < 2; round++) {
    fixture.detectChanges();
    await TestBed.inject(ApplicationRef).whenStable();
  }
}

const table = () =>
  document.querySelector('pct-data-table table') as HTMLTableElement;
const actionButtons = () =>
  Array.from(
    table().querySelectorAll<HTMLButtonElement>('[data-pct-part="actions"]'),
  );
/** A row's button of actions, by the row's place among the bodies' rows. */
const actionsOf = (row: number) =>
  table()
    .querySelectorAll('tbody > tr')
    [row].querySelector('[data-pct-part="actions"]') as HTMLButtonElement;
const menuPanel = () =>
  document.querySelector<HTMLElement>('.cdk-overlay-container [role="menu"]');
const rowNames = () =>
  Array.from(
    table().querySelectorAll('tbody > tr:not([data-pct-part])'),
    (row) => row.querySelector('.pct-data-table__first')?.textContent?.trim(),
  );
const nameOf = (element: Element) =>
  (element.getAttribute('aria-labelledby') as string)
    .split(' ')
    .map((id) => document.getElementById(id)?.textContent?.trim())
    .join(' ');

/** The secondary button on an element, as the browser says it: a cancelable `contextmenu`. */
const contextMenu = (target: Element): MouseEvent => {
  const event = new MouseEvent('contextmenu', {
    bubbles: true,
    cancelable: true,
  });
  target.dispatchEvent(event);
  return event;
};
const keyOn = (target: Element, init: KeyboardEventInit): KeyboardEvent => {
  const event = new KeyboardEvent('keydown', {
    bubbles: true,
    cancelable: true,
    ...init,
  });
  target.dispatchEvent(event);
  return event;
};

describe('PctTableRowMenu', () => {
  it('draws a trailing column: a word for its header, a button per row named by it and the row', async () => {
    await render(Host);
    const heads = Array.from(table().querySelectorAll('thead th'));
    const last = heads.at(-1) as HTMLElement;
    expect(last.classList).toContain('pct-data-table__menu');
    expect(last.getAttribute('scope')).toBe('col');
    expect(last.textContent?.trim()).toBe('Actions');
    const buttons = actionButtons();
    expect(buttons).toHaveLength(3);
    expect(buttons.map(nameOf)).toEqual([
      'Actions Lamp',
      'Actions Boiler',
      'Actions Fan',
    ]);
    for (const button of buttons) {
      expect(button.getAttribute('aria-haspopup')).toBe('menu');
      expect(button.getAttribute('aria-expanded')).toBe('false');
      expect(button.hasAttribute('aria-controls')).toBe(false);
      expect(button.type).toBe('button');
      expect(button.id).toBe(
        `${button.getAttribute('aria-labelledby')?.split(' ')[1]}-actions`,
      );
      // The column's cell is the row's last.
      expect(button.closest('td')).toBe(
        (button.closest('tr') as HTMLTableRowElement).lastElementChild,
      );
    }
  });

  it('opens the menu from a row’s button, at its first item, for that row, and closes it on a second press', async () => {
    const fixture = await render(Host);
    const host = fixture.componentInstance;
    expect(host.rowMenu()?.id()).toBeNull();
    const boiler = actionsOf(1);
    boiler.click();
    await settle(fixture);
    expect(menuPanel()).not.toBeNull();
    expect(host.rowMenu()?.id()).toBe(2);
    expect(boiler.getAttribute('aria-expanded')).toBe('true');
    expect(boiler.getAttribute('aria-controls')).toBe(menuPanel()?.id);
    expect(actionsOf(0).getAttribute('aria-expanded')).toBe('false');
    // Named by the control it opened from, the APG's way.
    expect(menuPanel()?.getAttribute('aria-labelledby')).toBe(boiler.id);
    expect(document.activeElement?.id).toBe('remove');
    boiler.click();
    await settle(fixture);
    expect(menuPanel()).toBeNull();
    expect(host.closed).toEqual(['trigger']);
    expect(document.activeElement).toBe(boiler);
    expect(boiler.getAttribute('aria-expanded')).toBe('false');
    // The menu still hangs off the button: a press opens it with nothing bound again.
    const bind = vi.spyOn(host.menu(), 'bindTrigger');
    boiler.click();
    await settle(fixture);
    expect(bind).not.toHaveBeenCalled();
    expect(menuPanel()?.getAttribute('aria-labelledby')).toBe(boiler.id);
    host.menu().closeTree('api', false);
    await settle(fixture);
    // Opened from the code, with no intent: at the first item.
    host.rowMenu()?.openFor(3, actionsOf(2));
    await settle(fixture);
    expect(document.activeElement?.id).toBe('remove');
  });

  it('opens it on a press of the secondary button on a row, from the row’s button, the browser’s menu kept off', async () => {
    const fixture = await render(Host);
    const host = fixture.componentInstance;
    actionsOf(0).click();
    await settle(fixture);
    host.menu().closeTree('api', false);
    await settle(fixture);
    const fan = table().querySelectorAll('tbody > tr')[2];
    const event = contextMenu(fan.querySelectorAll('td')[1]);
    await settle(fixture);
    expect(event.defaultPrevented).toBe(true);
    expect(host.rowMenu()?.id()).toBe(3);
    expect(actionsOf(2).getAttribute('aria-expanded')).toBe('true');
    expect(menuPanel()?.getAttribute('aria-labelledby')).toBe(actionsOf(2).id);
    // The button it hung off before is given back: one control at a time is the trigger.
    expect(actionsOf(0).getAttribute('aria-expanded')).toBe('false');
  });

  it('opens it on the context menu key and on Shift+F10 in a row, and on no other key', async () => {
    const fixture = await render(Host);
    const host = fixture.componentInstance;
    const cell = (row: number) =>
      table().querySelectorAll('tbody > tr')[row].querySelectorAll('td')[1];
    for (const init of [
      { key: 'F10' },
      { key: 'a', shiftKey: true },
      { key: 'Enter' },
    ]) {
      const event = keyOn(cell(0), init);
      await settle(fixture);
      expect(event.defaultPrevented).toBe(false);
      expect(menuPanel()).toBeNull();
    }
    const shifted = keyOn(cell(1), { key: 'F10', shiftKey: true });
    await settle(fixture);
    expect(shifted.defaultPrevented).toBe(true);
    expect(host.rowMenu()?.id()).toBe(2);
    expect(document.activeElement?.id).toBe('remove');
    host.menu().closeTree('api', true);
    await settle(fixture);
    expect(document.activeElement).toBe(actionsOf(1));
    const key = keyOn(cell(0), { key: 'ContextMenu' });
    await settle(fixture);
    expect(key.defaultPrevented).toBe(true);
    expect(host.rowMenu()?.id()).toBe(1);
    // The platform's own menu after the key, which the table keeps off.
    expect(contextMenu(document.body).defaultPrevented).toBe(true);
  });

  it('leaves a field’s and a link’s menu to the browser, and a press a table inside answered', async () => {
    const fixture = await render(Host);
    const fan = table().querySelectorAll('tbody > tr')[2];
    for (const target of [
      fan.querySelector('input') as Element,
      fan.querySelector('a') as Element,
    ]) {
      const event = contextMenu(target);
      await settle(fixture);
      expect(event.defaultPrevented).toBe(false);
      expect(menuPanel()).toBeNull();
    }
    const inner = fan.querySelectorAll('td')[1];
    inner.addEventListener('contextmenu', (event) => event.preventDefault(), {
      once: true,
    });
    contextMenu(inner);
    await settle(fixture);
    expect(menuPanel()).toBeNull();
    expect(fixture.componentInstance.rowMenu()?.id()).toBeNull();
  });

  it('hands the focus to the button where the row stood when a command removed the row', async () => {
    const fixture = await render(Host);
    const host = fixture.componentInstance;
    actionsOf(1).click();
    await settle(fixture);
    (document.getElementById('remove') as HTMLElement).click();
    await settle(fixture);
    expect(host.removed).toEqual([2]);
    expect(rowNames()).toEqual(['Lamp', 'Fan']);
    expect(menuPanel()).toBeNull();
    // Fan's button stands where Boiler's did.
    expect(document.activeElement).toBe(actionsOf(1));
    // The last row's place is taken by the row before it.
    actionsOf(1).click();
    await settle(fixture);
    (document.getElementById('remove') as HTMLElement).click();
    await settle(fixture);
    expect(document.activeElement).toBe(actionsOf(0));
    // The new trigger is the one it opens from next, and the menu hangs off it.
    actionsOf(0).click();
    await settle(fixture);
    expect(menuPanel()?.getAttribute('aria-labelledby')).toBe(actionsOf(0).id);
    (document.getElementById('remove') as HTMLElement).click();
    await settle(fixture);
    // No row left: nothing to hand the focus to.
    expect(actionButtons()).toHaveLength(0);
    expect(host.removed).toEqual([2, 3, 1]);
  });

  it('takes no focus a removed row left somewhere else', async () => {
    const fixture = await render(Host);
    const host = fixture.componentInstance;
    actionsOf(0).click();
    await settle(fixture);
    host.menu().closeTree('api', false);
    const outside = document.createElement('button');
    document.body.append(outside);
    outside.focus();
    host.rows.set(RULES.slice(1));
    await settle(fixture);
    expect(document.activeElement).toBe(outside);
    outside.remove();
  });

  it('opens a pinned row’s menu for the pinned row, and spans the details across the column', async () => {
    const fixture = await render(Host);
    const host = fixture.componentInstance;
    host.top.set([{ id: 9, name: 'Total', watts: 1952 }]);
    host.open.set([1]);
    await settle(fixture);
    const pinned = table().querySelector(
      'tbody[data-pct-pinned] [data-pct-part="actions"]',
    ) as HTMLButtonElement;
    expect(nameOf(pinned)).toBe('Actions Total');
    pinned.click();
    await settle(fixture);
    expect(host.rowMenu()?.id()).toBe(9);
    const details = table().querySelector(
      'tr[data-pct-part="details"] > td',
    ) as HTMLTableCellElement;
    expect(details.colSpan).toBe(4);
    // The foot's sums end with the column's empty cell.
    const foot = Array.from(
      table().querySelectorAll('tfoot td'),
      (cell) => cell.textContent?.trim() ?? '',
    );
    expect(foot.at(-1)).toBe('');
    // The label spans the disclosure's cell and the first column's: four cells in all.
    const label = table().querySelector('tfoot th') as HTMLTableCellElement;
    expect(label.colSpan).toBe(2);
    expect(table().querySelectorAll('tfoot > tr > *')).toHaveLength(3);
  });

  it('gives the button back when the table goes', async () => {
    const fixture = await render(Host);
    const host = fixture.componentInstance;
    const button = actionsOf(0);
    button.click();
    await settle(fixture);
    host.menu().closeTree('api', false);
    const unbind = vi.spyOn(host.menu(), 'unbindTrigger');
    host.shown.set(false);
    await settle(fixture);
    expect(unbind).toHaveBeenCalledWith(button);
  });

  it('gives back nothing when the table goes with the menu never opened', async () => {
    const fixture = await render(Host);
    const host = fixture.componentInstance;
    const unbind = vi.spyOn(host.menu(), 'unbindTrigger');
    host.shown.set(false);
    await settle(fixture);
    expect(unbind).not.toHaveBeenCalled();
  });

  it('closes the menu when its row is taken away while it is open, and hands the focus on', async () => {
    const fixture = await render(Host);
    const host = fixture.componentInstance;
    actionsOf(1).click();
    await settle(fixture);
    expect(document.activeElement?.id).toBe('remove');
    host.rows.set(RULES.filter((rule) => rule.id !== 2));
    await settle(fixture);
    expect(menuPanel()).toBeNull();
    expect(host.closed).toEqual(['api']);
    expect(document.activeElement).toBe(actionsOf(1));
    expect(nameOf(actionsOf(1))).toBe('Actions Fan');
  });

  it('keeps the menu on a row its command drew anew elsewhere: the row’s own button', async () => {
    const fixture = await render(Host);
    const host = fixture.componentInstance;
    actionsOf(2).click();
    await settle(fixture);
    const bind = vi.spyOn(host.menu(), 'bindTrigger');
    (document.getElementById('pin') as HTMLElement).click();
    await settle(fixture);
    // Fan now stands pinned above the rows, in a row of its own drawn there.
    const pinned = table().querySelector(
      'tbody[data-pct-pinned] [data-pct-part="actions"]',
    ) as HTMLButtonElement;
    expect(nameOf(pinned)).toBe('Actions Fan');
    // The focus is the table's to hand on: to the same button of the line where Fan stood.
    expect(nameOf(document.activeElement as Element)).toBe('Actions Boiler');
    // The menu hangs off the pinned row's button before any press on it.
    expect(bind).toHaveBeenCalledWith(pinned, null);
    pinned.click();
    await settle(fixture);
    expect(host.rowMenu()?.id()).toBe(3);
    expect(menuPanel()?.getAttribute('aria-labelledby')).toBe(pinned.id);
  });

  it('keeps the focus a row drawn anew left somewhere else', async () => {
    const fixture = await render(Host);
    const host = fixture.componentInstance;
    actionsOf(2).click();
    await settle(fixture);
    host.menu().closeTree('api', false);
    const outside = document.createElement('button');
    document.body.append(outside);
    outside.focus();
    host.pin(3);
    await settle(fixture);
    expect(document.activeElement).toBe(outside);
    outside.remove();
  });

  it('opens another row’s menu from that row while the menu is open for one', async () => {
    const fixture = await render(Host);
    const host = fixture.componentInstance;
    actionsOf(0).click();
    await settle(fixture);
    const event = contextMenu(
      table().querySelectorAll('tbody > tr')[2].querySelectorAll('td')[0],
    );
    await settle(fixture);
    expect(event.defaultPrevented).toBe(true);
    expect(host.rowMenu()?.id()).toBe(3);
    expect(document.querySelectorAll('[role="menu"]')).toHaveLength(1);
    expect(menuPanel()?.getAttribute('aria-labelledby')).toBe(actionsOf(2).id);
    expect(actionsOf(0).getAttribute('aria-expanded')).toBe('false');
  });

  it('hangs the menu off the menu given now, and gives the button back to the one before', async () => {
    const fixture = await render(Host);
    const host = fixture.componentInstance;
    actionsOf(0).click();
    await settle(fixture);
    host.menu().closeTree('api', false);
    await settle(fixture);
    const unbind = vi.spyOn(host.menu(), 'unbindTrigger');
    host.second.set(true);
    await settle(fixture);
    actionsOf(0).click();
    await settle(fixture);
    expect(unbind).toHaveBeenCalledWith(actionsOf(0));
    expect(document.activeElement?.id).toBe('other');
    expect(actionsOf(0).getAttribute('aria-controls')).toBe(menuPanel()?.id);
  });

  it('opens the menu from a row’s button at its first item on ArrowDown, its last on ArrowUp, outside a grid', async () => {
    const fixture = await render(Host);
    const host = fixture.componentInstance;
    const other = keyOn(actionsOf(0), { key: 'ArrowLeft' });
    await settle(fixture);
    expect(other.defaultPrevented).toBe(false);
    expect(menuPanel()).toBeNull();
    const down = keyOn(actionsOf(0), { key: 'ArrowDown' });
    await settle(fixture);
    expect(down.defaultPrevented).toBe(true);
    expect(document.activeElement?.id).toBe('remove');
    host.menu().closeTree('api', true);
    await settle(fixture);
    keyOn(actionsOf(1), { key: 'ArrowUp' });
    await settle(fixture);
    expect(host.rowMenu()?.id()).toBe(2);
    expect(document.activeElement?.id).toBe('pin');
  });

  it('leaves the arrows to a grid, and counts the trailing column among the grid’s', async () => {
    const fixture = await render(GridHost);
    expect(table().getAttribute('aria-colcount')).toBe('3');
    const button = actionButtons()[0];
    keyOn(button, { key: 'ArrowDown' });
    await settle(fixture);
    expect(menuPanel()).toBeNull();
    // A column hidden: each cell says where it stands, the trailing one last of all.
    fixture.componentInstance.layout.set({ hidden: ['watts'] });
    await settle(fixture);
    expect(table().getAttribute('aria-colcount')).toBe('3');
    const head = (table().tHead as HTMLTableSectionElement).rows[0];
    expect(
      Array.from(head.cells, (cell) => cell.getAttribute('aria-colindex')),
    ).toEqual(['1', '3']);
  });

  it('keeps the browser’s menu for Shift+F10 in a field, for a row with no button, and off the rows', async () => {
    const fixture = await render(Host);
    const fan = table().querySelectorAll('tbody > tr')[2];
    const field = keyOn(fan.querySelector('input') as Element, {
      key: 'F10',
      shiftKey: true,
    });
    await settle(fixture);
    expect(field.defaultPrevented).toBe(false);
    const head = contextMenu(table().querySelector('thead th') as Element);
    await settle(fixture);
    expect(head.defaultPrevented).toBe(false);
    expect(menuPanel()).toBeNull();
    TestBed.resetTestingModule();
    await render(GroupedHost);
    const group = contextMenu(
      table().querySelector('tr[data-pct-part="group"] > th') as Element,
    );
    expect(group.defaultPrevented).toBe(false);
  });

  it('keeps the platform’s own menu off once after the context menu key, for a moment', async () => {
    const fixture = await render(Host);
    const later = vi.spyOn(window, 'setTimeout');
    keyOn(table().querySelectorAll('tbody > tr')[0].querySelectorAll('td')[0], {
      key: 'ContextMenu',
    });
    await settle(fixture);
    const first = contextMenu(document.body);
    const second = contextMenu(document.body);
    expect(first.defaultPrevented).toBe(true);
    expect(second.defaultPrevented).toBe(false);
    const [wait, delay] = later.mock.calls.find(
      ([, ms]) => ms === 1000,
    ) as unknown as [() => void, number];
    expect(delay).toBe(1000);
    const removed = vi.spyOn(window, 'removeEventListener');
    wait();
    expect(removed).toHaveBeenCalledWith('contextmenu', expect.any(Function), {
      capture: true,
    });
    // A guard the moment ended unused is gone: the next menu is the platform's.
    keyOn(table().querySelectorAll('tbody > tr')[0].querySelectorAll('td')[0], {
      key: 'ContextMenu',
    });
    await settle(fixture);
    const [end] = later.mock.calls
      .filter(([, ms]) => ms === 1000)
      .at(-1) as unknown as [() => void];
    end();
    expect(contextMenu(document.body).defaultPrevented).toBe(false);
    // Shift+F10 sets no guard: its menu is the keydown's, which the table kept off.
    later.mockClear();
    keyOn(table().querySelectorAll('tbody > tr')[1].querySelectorAll('td')[0], {
      key: 'F10',
      shiftKey: true,
    });
    expect(later.mock.calls.some(([, ms]) => ms === 1000)).toBe(false);
  });

  it('stops listening to the rows when the table goes', async () => {
    const fixture = await render(Host);
    const element = document.querySelector('pct-data-table') as HTMLElement;
    const removed = vi.spyOn(element, 'removeEventListener');
    fixture.componentInstance.shown.set(false);
    await settle(fixture);
    expect(removed.mock.calls.map(([type]) => type)).toEqual(
      expect.arrayContaining(['contextmenu', 'keydown']),
    );
  });

  it('draws the column’s cell in every row: a group’s heading, the groups’, the filters’, a placeholder, a hole', async () => {
    await render(GroupedHost);
    const lastCells = (selector: string) =>
      Array.from(
        table().querySelectorAll<HTMLTableRowElement>(selector),
        (row) => row.cells[row.cells.length - 1],
      );
    for (const cell of lastCells('tr[data-pct-part="group"]')) {
      expect(cell.localName).toBe('td');
      expect(cell.textContent?.trim()).toBe('');
    }
    expect(lastCells('tr[data-pct-part="group"]')).toHaveLength(3);
    TestBed.resetTestingModule();
    await render(LinedHost);
    const cells = (selector: string) =>
      Array.from(
        table().querySelectorAll<HTMLTableRowElement>(selector),
        (row) => Array.from(row.cells, (cell) => cell.textContent?.trim()),
      );
    const [groups, heads, filters] = cells('thead > tr');
    expect(groups.at(-1)).toBe('');
    expect(groups).toHaveLength(2);
    expect(heads.at(-1)).toBe('Actions');
    expect(filters.at(-1)).toBe('');
    expect(filters).toHaveLength(3);
    expect(
      Array.from(table().querySelectorAll('colgroup > col'), (col) =>
        col.classList.contains('pct-data-table__toggle-col'),
      ),
    ).toEqual([false, false, true]);
    TestBed.resetTestingModule();
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(
      function (this: HTMLElement) {
        const frame = this.closest('pct-table-frame') as HTMLElement | null;
        const top =
          this.localName === 'tbody' ? 40 - (frame?.scrollTop ?? 0) : 0;
        return { top, height: 0, width: 0, bottom: top } as DOMRect;
      },
    );
    Object.defineProperty(document.documentElement, 'clientHeight', {
      configurable: true,
      get: () => 800,
    });
    try {
      const fixture = await render(RemoteHost);
      const frame = document.querySelector('pct-table-frame') as HTMLElement;
      let scrolled = 0;
      Object.defineProperties(frame, {
        scrollTop: {
          configurable: true,
          get: () => scrolled,
          set: (value: number) => {
            scrolled = Math.max(0, value);
          },
        },
        clientHeight: { configurable: true, get: () => 400 },
      });
      const stable = async () => {
        await new Promise((done) => setTimeout(done));
        await fixture.whenStable();
      };
      await stable();
      const placeholders = cells('tbody > tr[data-pct-part="placeholder"]');
      expect(placeholders.length).toBeGreaterThan(0);
      expect(placeholders[0]).toHaveLength(3);
      expect(placeholders[0][2]).toBe('');
      answers[0]();
      await stable();
      frame.scrollTop = 40 + 100 * 40;
      frame.dispatchEvent(new Event('scroll'));
      await stable();
      const holes = cells('tbody > tr[data-pct-part="hole"]');
      expect(holes.length).toBeGreaterThan(0);
      expect(holes[0]).toHaveLength(3);
      expect(holes[0][2]).toBe('');
    } finally {
      delete (document.documentElement as { clientHeight?: number })
        .clientHeight;
    }
  });

  it('sticks the column after the columns pinned to the end, and only then', async () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(
      () => ({ top: 0, height: 0, width: 50, bottom: 0 }) as DOMRect,
    );
    const fixture = await render(LinedHost);
    const head = () =>
      Array.from(
        (table().tHead as HTMLTableSectionElement).rows[1].cells,
      ) as HTMLElement[];
    expect(head().map((cell) => cell.getAttribute('data-pct-pinned'))).toEqual([
      null,
      null,
      null,
    ]);
    // A group is pinned whole: both its columns.
    fixture.componentInstance.layout.set({
      pinned: { end: ['name', 'watts'] },
    });
    await settle(fixture);
    await settle(fixture);
    const cells = head();
    expect(cells.map((cell) => cell.getAttribute('data-pct-pinned'))).toEqual([
      'end edge',
      'end',
      'end',
    ]);
    // The trailing cell at the edge itself, the columns pinned before it past its width.
    expect(cells.map((cell) => cell.style.getPropertyValue('--_at'))).toEqual([
      '100px',
      '50px',
      '0px',
    ]);
    // The rows' cells stick with their header's.
    const row = table().querySelector('tbody > tr') as HTMLTableRowElement;
    expect(row.cells[2].getAttribute('data-pct-pinned')).toBe('end');
    // A layout's least width counts the trailing column as a toggle's.
    expect(table().style.getPropertyValue('--_min')).toContain(
      '+ 1 * var(--pct-table-toggle-target-min)',
    );
  });
});
