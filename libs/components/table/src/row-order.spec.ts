import {
  ApplicationRef,
  Component,
  ErrorHandler,
  provideZonelessChangeDetection,
  signal,
  type Type,
} from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PctAnnouncer } from '@pacit/components/core';
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
import { PctTableRowOrder, type PctRowMove } from './data-table-row-order';
import { PctDetailsTemplate } from './data-table-slots';
import { PctTableTree } from './data-table-tree';
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

@Component({
  imports: [PctDataTable, PctTableRowOrder, PctTablePinnedRows],
  template: `
    <pct-data-table
      pctTableRowOrder
      pctTablePinnedRows
      [disabled]="disabled()"
      [animateRows]="animated()"
      [pinnedTop]="top()"
      [rows]="rows()"
      [columns]="columns"
      [rowId]="byId"
      [sort]="sort()"
      rowNumbers
      caption="Rules"
      (reorder)="moved($event)"
    />
  `,
})
class Host {
  readonly columns = columns;
  readonly byId = byId;
  readonly rows = signal(RULES);
  readonly top = signal<readonly Rule[]>([]);
  readonly sort = signal<readonly PctTableSort<'name' | 'watts'>[]>([]);
  readonly disabled = signal(false);
  readonly animated = signal(false);
  readonly moves: PctRowMove[] = [];
  /** The application moves the row, as asked: out of the list and in before the other. */
  moved(move: PctRowMove): void {
    this.moves.push(move);
    const rows = this.rows().filter((rule) => rule.id !== move.id);
    const moving = this.rows().find((rule) => rule.id === move.id) as Rule;
    const at =
      move.before === null
        ? rows.length
        : rows.findIndex((rule) => rule.id === move.before);
    rows.splice(at, 0, moving);
    this.rows.set(rows);
  }
}

@Component({
  imports: [PctDataTable, PctTableRowOrder, PctTableGrid],
  template: `
    <pct-data-table
      pctTableRowOrder
      [pctTableGrid]="columns"
      [rows]="rows"
      [columns]="columns"
      [rowId]="byId"
      caption="Rules"
      (reorder)="moves.push($event)"
    />
  `,
})
class GridHost {
  readonly columns = columns;
  readonly byId = byId;
  readonly rows = RULES;
  readonly moves: PctRowMove[] = [];
}

@Component({
  imports: [
    PctDataTable,
    PctTableRowOrder,
    PctTableDetails,
    PctDetailsTemplate,
  ],
  template: `
    <pct-data-table
      pctTableRowOrder
      pctTableDetails
      [details]="[2]"
      [rows]="rows"
      [columns]="columns"
      [rowId]="byId"
      caption="Rules"
      (reorder)="moves.push($event)"
    >
      <ng-template [pctDetails]="columns" let-rule
        >{{ rule.name }} in full</ng-template
      >
    </pct-data-table>
  `,
})
class DetailsHost {
  readonly columns = columns;
  readonly byId = byId;
  readonly rows = RULES;
  readonly moves: PctRowMove[] = [];
}

@Component({
  imports: [PctDataTable, PctTableRowOrder, PctTableGroups, PctTableTree],
  template: `
    @if (tree()) {
      <pct-data-table
        pctTableRowOrder
        [pctTableTree]="columns"
        [children]="none"
        [rows]="rows"
        [columns]="columns"
        [rowId]="byId"
        caption="Rules"
      />
    } @else {
      <pct-data-table
        pctTableRowOrder
        [pctTableGroups]="columns"
        [groupBy]="['name']"
        [rows]="rows"
        [columns]="columns"
        [rowId]="byId"
        caption="Rules"
      />
    }
  `,
})
class ShapedHost {
  readonly columns = columns;
  readonly byId = byId;
  readonly rows = RULES;
  readonly tree = signal(false);
  readonly none = () => undefined;
}

/** The columns in a group, filtered in a row: a row of groups and a row of filters. */
const grouped = col.of([
  col.key('name', { header: 'Name', group: 'Rule' }),
  col.key('watts', { header: 'Watts', group: 'Rule' }),
]);

@Component({
  imports: [
    PctDataTable,
    PctTableRowOrder,
    PctTableColumnFilters,
    PctTableColumns,
  ],
  template: `
    <pct-data-table
      pctTableRowOrder
      [pctTableColumnFilters]="columns"
      [pctTableColumns]="columns"
      [filterRow]="true"
      [rows]="rows"
      [columns]="columns"
      [rowId]="byId"
      caption="Rules"
    />
  `,
})
class LinedHost {
  readonly columns = grouped;
  readonly byId = byId;
  readonly rows = RULES;
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
  imports: [PctDataTable, PctTableRowOrder, PctTableWindow, PctTableRemote],
  template: `
    <pct-data-table
      pctTableRowOrder
      pctTableWindow
      [pctTableRemote]="load"
      blockSize="50"
      [columns]="columns"
      [rowId]="byId"
      caption="Rules"
    />
  `,
})
class RemoteHost {
  readonly columns = columns;
  readonly byId = byId;
  readonly load = load;
}

let errors: unknown[] = [];

const globals = globalThis as {
  ResizeObserver?: unknown;
  IntersectionObserver?: unknown;
};

/** What jsdom has of the animations: nothing, so a case that stubs them puts nothing back. */
const proto = HTMLElement.prototype as unknown as Record<string, unknown>;
const animations: Record<string, unknown> = {
  animate: proto['animate'],
  getAnimations: proto['getAnimations'],
};

afterEach(() => {
  for (const name of ['animate', 'getAnimations']) {
    if (animations[name] === undefined) delete proto[name];
    else proto[name] = animations[name];
  }
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
  fixture.detectChanges();
  await TestBed.inject(ApplicationRef).whenStable();
  fixture.detectChanges();
  await TestBed.inject(ApplicationRef).whenStable();
}

const table = () =>
  document.querySelector('pct-data-table table') as HTMLTableElement;
const handles = () =>
  Array.from(
    table().querySelectorAll<HTMLButtonElement>('[data-pct-part="handle"]'),
  );
const handle = (id: number) =>
  handles().find(
    (button) => button.dataset['pctRow'] === String(id),
  ) as HTMLButtonElement;
const names = () =>
  Array.from(table().querySelectorAll('tbody tr'), (row) =>
    row.querySelector('.pct-data-table__first')?.textContent?.trim(),
  );
const press = async (
  fixture: ComponentFixture<unknown>,
  target: Element,
  key: string,
  init: KeyboardEventInit = {},
): Promise<KeyboardEvent> => {
  const event = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
    ...init,
  });
  target.dispatchEvent(event);
  await settle(fixture);
  return event;
};
/** A pointer event on the handle, with the id and the place the init says. */
const pointer = (
  target: Element,
  type: string,
  init: PointerEventInit & { pointerId?: number } = {},
): PointerEvent => {
  const event = new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    ...init,
  }) as PointerEvent;
  Object.defineProperty(event, 'pointerId', { value: init.pointerId ?? 1 });
  target.dispatchEvent(event);
  return event;
};
/** Each row of the data 20 px tall, from 100 px down, as the rows stand. */
function layRows(): void {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(
    function (this: HTMLElement) {
      const row = this.closest('tr');
      const at =
        row === null
          ? -1
          : Array.from(
              table().querySelectorAll('tbody:not([data-pct-pinned]) > tr'),
            ).indexOf(row);
      const top = at < 0 ? 0 : 100 + 20 * at;
      return {
        top,
        bottom: top + 20,
        height: 20,
        width: 0,
        left: 0,
        right: 0,
      } as DOMRect;
    },
  );
}

describe('row order', () => {
  it('draws a handle per row of the data, named by the word and the row’s first text, under a header of the word', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.top.set([{ id: 9, name: 'Total', watts: 0 }]);
    await settle(fixture);
    const head = table().querySelector(
      'thead th.pct-data-table__order',
    ) as HTMLElement;
    expect(head.textContent?.trim()).toBe('Move');
    const word = head.querySelector('span')?.id as string;
    expect(word).toMatch(/^pct-table-order-\d+-word$/);
    expect(handles().map((button) => button.dataset['pctRow'])).toEqual([
      '9',
      '1',
      '2',
      '3',
    ]);
    const lamp = handle(1);
    expect(lamp.disabled).toBe(false);
    expect(lamp.getAttribute('aria-keyshortcuts')).toBe(
      'Alt+ArrowUp Alt+ArrowDown',
    );
    const [wordId, nameId] = (
      lamp.getAttribute('aria-labelledby') as string
    ).split(' ');
    expect(wordId).toBe(word);
    expect(document.getElementById(nameId)?.textContent?.trim()).toBe('Lamp');
    // A pinned row's handle is drawn and disabled: it has no place in the list to move from,
    // and its keys move nothing.
    expect(handle(9).disabled).toBe(true);
    await press(fixture, handle(9), 'ArrowDown', { altKey: true });
    await press(fixture, handle(9), 'ArrowUp', { altKey: true });
    expect(fixture.componentInstance.moves).toEqual([]);
  });

  it('moves a row one place with Alt and an arrow, keeps the focus on its handle, and tells a reader its new number', async () => {
    const fixture = await render(Host);
    const announcer = TestBed.inject(PctAnnouncer);
    const announce = vi.spyOn(announcer, 'announce');
    const retract = vi.spyOn(announcer, 'retract');
    const lamp = handle(1);
    lamp.focus();
    const down = await press(fixture, lamp, 'ArrowDown', { altKey: true });
    expect(down.defaultPrevented).toBe(true);
    expect(fixture.componentInstance.moves).toEqual([{ id: 1, before: 3 }]);
    expect(names()).toEqual(['Boiler', 'Lamp', 'Fan']);
    expect(document.activeElement).toBe(handle(1));
    expect(retract).toHaveBeenCalledWith('Moved to row 2 of 3');
    expect(announce).toHaveBeenLastCalledWith('Moved to row 2 of 3');
    // To the end: before no row.
    await press(fixture, handle(1), 'ArrowDown', { altKey: true });
    expect(fixture.componentInstance.moves[1]).toEqual({ id: 1, before: null });
    expect(names()).toEqual(['Boiler', 'Fan', 'Lamp']);
    expect(announce).toHaveBeenLastCalledWith('Moved to row 3 of 3');
    // Down from the last row and up from the first: nothing to move past.
    await press(fixture, handle(1), 'ArrowDown', { altKey: true });
    await press(fixture, handle(2), 'ArrowUp', { altKey: true });
    expect(fixture.componentInstance.moves).toHaveLength(2);
    // Up: before the row above.
    await press(fixture, handle(1), 'ArrowUp', { altKey: true });
    expect(fixture.componentInstance.moves[2]).toEqual({ id: 1, before: 3 });
    expect(names()).toEqual(['Boiler', 'Lamp', 'Fan']);
    expect(announce).toHaveBeenCalledTimes(3);
    // An arrow without Alt, or another key with it, is not a move.
    const bare = await press(fixture, handle(1), 'ArrowDown');
    await press(fixture, handle(1), 'Home', { altKey: true });
    expect(bare.defaultPrevented).toBe(false);
    expect(fixture.componentInstance.moves).toHaveLength(3);
  });

  it('says nothing when the application took the row away', async () => {
    const fixture = await render(Host);
    const announce = vi.spyOn(TestBed.inject(PctAnnouncer), 'announce');
    const host = fixture.componentInstance;
    host.moved = (move) =>
      host.rows.set(host.rows().filter((rule) => rule.id !== move.id));
    await press(fixture, handle(1), 'ArrowDown', { altKey: true });
    expect(names()).toEqual(['Boiler', 'Fan']);
    expect(announce).not.toHaveBeenCalled();
  });

  it('says nothing when the application left the row where it was', async () => {
    const fixture = await render(Host);
    const announce = vi.spyOn(TestBed.inject(PctAnnouncer), 'announce');
    // The application that ignores the move: the rows stay.
    fixture.componentInstance.moved = () => {
      // Not moved.
    };
    await press(fixture, handle(1), 'ArrowDown', { altKey: true });
    expect(names()).toEqual(['Lamp', 'Boiler', 'Fan']);
    expect(announce).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(handle(1));
  });

  it('drags a row by its handle over another, marks the place, and moves it where the pointer let go', async () => {
    layRows();
    const fixture = await render(Host);
    const capture = vi.fn();
    const lamp = handle(1) as HTMLButtonElement & {
      setPointerCapture: (id: number) => void;
    };
    lamp.setPointerCapture = capture;
    const rows = () =>
      Array.from(table().querySelectorAll<HTMLElement>('tbody > tr'));
    // Another button than the main one takes nothing.
    pointer(lamp, 'pointerdown', { button: 2, clientY: 110 });
    pointer(lamp, 'pointermove', { clientY: 150 });
    expect(capture).not.toHaveBeenCalled();
    expect(rows()[0].hasAttribute('data-pct-dragging')).toBe(false);
    const down = pointer(lamp, 'pointerdown', { button: 0, clientY: 110 });
    expect(capture).toHaveBeenCalledWith(1);
    expect(down.defaultPrevented).toBe(true);
    // The press would not focus the handle, prevented; the handle takes the focus itself.
    expect(document.activeElement).toBe(lamp);
    expect(rows()[0].hasAttribute('data-pct-dragging')).toBe(true);
    // Another pointer's moves are not this drag's.
    pointer(lamp, 'pointermove', { clientY: 150, pointerId: 2 });
    expect(rows().map((row) => row.dataset['pctDrop'] ?? '')).toEqual([
      '',
      '',
      '',
    ]);
    // Over the upper half of Fan: before it; over its lower half: after it.
    pointer(lamp, 'pointermove', { clientY: 145 });
    expect(rows().map((row) => row.dataset['pctDrop'] ?? '')).toEqual([
      '',
      '',
      'before',
    ]);
    pointer(lamp, 'pointermove', { clientY: 155 });
    expect(rows().map((row) => row.dataset['pctDrop'] ?? '')).toEqual([
      '',
      '',
      'after',
    ]);
    // Off the rows: no place.
    pointer(lamp, 'pointermove', { clientY: 400 });
    expect(rows().map((row) => row.dataset['pctDrop'] ?? '')).toEqual([
      '',
      '',
      '',
    ]);
    pointer(lamp, 'pointermove', { clientY: 155 });
    pointer(lamp, 'pointerup', { clientY: 155 });
    await settle(fixture);
    expect(fixture.componentInstance.moves).toEqual([{ id: 1, before: null }]);
    expect(names()).toEqual(['Boiler', 'Fan', 'Lamp']);
    expect(
      rows().some(
        (row) =>
          row.hasAttribute('data-pct-dragging') ||
          row.hasAttribute('data-pct-drop'),
      ),
    ).toBe(false);
  });

  it('takes a row’s open details as its lower half: the place after the row', async () => {
    layRows();
    const fixture = await render(DetailsHost);
    const lamp = handle(1) as HTMLButtonElement & {
      setPointerCapture: (id: number) => void;
    };
    lamp.setPointerCapture = () => undefined;
    const rows = () =>
      Array.from(table().querySelectorAll<HTMLElement>('tbody > tr'));
    // Lamp, Boiler, Boiler's details, Fan: 20 px each from 100 px down.
    expect(rows().map((row) => row.dataset['pctPart'] ?? '')).toEqual([
      '',
      '',
      'details',
      '',
    ]);
    pointer(lamp, 'pointerdown', { button: 0, clientY: 110 });
    pointer(lamp, 'pointermove', { clientY: 145 });
    expect(rows().map((row) => row.dataset['pctDrop'] ?? '')).toEqual([
      '',
      '',
      'after',
      '',
    ]);
    pointer(lamp, 'pointerup', { clientY: 145 });
    await settle(fixture);
    expect(fixture.componentInstance.moves).toEqual([{ id: 1, before: 3 }]);
  });

  it('draws the column of handles in every row and the colgroup: the groups’, the filters’, a placeholder, a hole', async () => {
    await render(LinedHost);
    const cells = (selector: string) =>
      Array.from(
        table().querySelectorAll<HTMLTableRowElement>(selector),
        (row) => Array.from(row.cells, (cell) => cell.textContent?.trim()),
      );
    // The groups' row and the headers' lead with the column's cell; the filters' row too.
    const [groups, heads, filters] = cells('thead > tr');
    expect(groups[0]).toBe('');
    expect(heads[0]).toBe('Move');
    expect(filters[0]).toBe('');
    expect(groups).toHaveLength(2);
    expect(filters).toHaveLength(3);
    // A laid table's colgroup leads with the column's col too.
    expect(
      Array.from(table().querySelectorAll('colgroup > col'), (col) =>
        col.classList.contains('pct-data-table__toggle-col'),
      ),
    ).toEqual([true, false, false]);
    // A source that has not answered: placeholders with the cell; a line not here yet: a
    // hole with it.
    vi.restoreAllMocks();
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
      TestBed.resetTestingModule();
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
      expect(placeholders[0][0]).toBe('');
      answers[0]();
      await stable();
      frame.scrollTop = 40 + 100 * 40;
      frame.dispatchEvent(new Event('scroll'));
      await stable();
      const holes = cells('tbody > tr[data-pct-part="hole"]');
      expect(holes.length).toBeGreaterThan(0);
      expect(holes[0]).toHaveLength(3);
      expect(holes[0][0]).toBe('');
    } finally {
      delete (document.documentElement as { clientHeight?: number })
        .clientHeight;
    }
  });

  it('reads a drag’s edges: a row’s top is its own, its bottom the next row’s, the rows’ outside no place', async () => {
    layRows();
    const fixture = await render(Host);
    const lamp = handle(1) as HTMLButtonElement & {
      setPointerCapture: (id: number) => void;
    };
    lamp.setPointerCapture = vi.fn();
    const rows = () =>
      Array.from(table().querySelectorAll<HTMLElement>('tbody > tr'));
    const marks = () => rows().map((row) => row.dataset['pctDrop'] ?? '');
    const moves = fixture.componentInstance.moves;
    // A cancel and a release with no drag under way let go of nothing.
    pointer(lamp, 'pointercancel', {});
    pointer(lamp, 'pointerup', { clientY: 145 });
    pointer(lamp, 'pointerdown', { button: 0, clientY: 110 });
    expect(rows()[0].getAttribute('data-pct-dragging')).toBe('');
    // Off the rows with no place marked yet, and above the first row: no place.
    pointer(lamp, 'pointermove', { clientY: 400 });
    expect(marks()).toEqual(['', '', '']);
    pointer(lamp, 'pointermove', { clientY: 90 });
    expect(marks()).toEqual(['', '', '']);
    // A row's top is the row's own upper half; its bottom is the next row's top.
    pointer(lamp, 'pointermove', { clientY: 140 });
    expect(marks()).toEqual(['', '', 'before']);
    pointer(lamp, 'pointermove', { clientY: 120 });
    expect(marks()).toEqual(['', 'before', '']);
    // A row's lower half and the next row's upper are one place, marked on the row under the
    // pointer.
    pointer(lamp, 'pointermove', { clientY: 135 });
    expect(marks()).toEqual(['', 'after', '']);
    pointer(lamp, 'pointermove', { clientY: 145 });
    expect(marks()).toEqual(['', '', 'before']);
    // A key that is not Escape leaves the drag as it is.
    await press(fixture, lamp, 'a');
    expect(rows()[0].hasAttribute('data-pct-dragging')).toBe(true);
    // Another pointer's release drops nothing; a release off the rows moves nothing.
    pointer(lamp, 'pointerup', { clientY: 145, pointerId: 2 });
    await settle(fixture);
    expect(moves).toEqual([]);
    pointer(lamp, 'pointermove', { clientY: 400 });
    pointer(lamp, 'pointerup', { clientY: 400 });
    await settle(fixture);
    expect(moves).toEqual([]);
    expect(rows()[0].hasAttribute('data-pct-dragging')).toBe(false);
    // Over its own lower half: before the next row, where it stands.
    pointer(lamp, 'pointerdown', { button: 0, clientY: 110 });
    pointer(lamp, 'pointermove', { clientY: 115 });
    pointer(lamp, 'pointerup', { clientY: 115 });
    await settle(fixture);
    expect(moves).toEqual([]);
  });

  it('disables the handles in a tree and in groups, saying why', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {
      // Read below.
    });
    await render(ShapedHost);
    expect(handles().length).toBeGreaterThan(0);
    expect(handles().every((button) => button.disabled)).toBe(true);
    expect(warn).toHaveBeenCalledWith(
      '[pct-data-table] pctTableRowOrder moves no row under a sort, in a tree or in groups: ' +
        'the rows stand in the order the application gave them, or the handles stay disabled.',
    );
    TestBed.resetTestingModule();
    const tree = await render(ShapedHost);
    tree.componentInstance.tree.set(true);
    await settle(tree);
    expect(handles()).toHaveLength(3);
    expect(handles().every((button) => button.disabled)).toBe(true);
  });

  it('lets a drag go at Escape, at a cancel, and over the row’s own place, moving nothing', async () => {
    layRows();
    const fixture = await render(Host);
    const lamp = handle(1) as HTMLButtonElement & {
      setPointerCapture: (id: number) => void;
    };
    lamp.setPointerCapture = vi.fn();
    const rows = () =>
      Array.from(table().querySelectorAll<HTMLElement>('tbody > tr'));
    pointer(lamp, 'pointerdown', { button: 0, clientY: 110 });
    pointer(lamp, 'pointermove', { clientY: 145 });
    const escape = await press(fixture, lamp, 'Escape');
    expect(escape.defaultPrevented).toBe(true);
    expect(rows().map((row) => row.dataset['pctDrop'] ?? '')).toEqual([
      '',
      '',
      '',
    ]);
    expect(rows()[0].hasAttribute('data-pct-dragging')).toBe(false);
    // Let go, the pointer's release moves nothing.
    pointer(lamp, 'pointerup', { clientY: 145 });
    await settle(fixture);
    expect(fixture.componentInstance.moves).toEqual([]);
    // Escape with no drag under way is not the handle's.
    const idle = await press(fixture, lamp, 'Escape');
    expect(idle.defaultPrevented).toBe(false);
    // A cancel lets go too.
    pointer(lamp, 'pointerdown', { button: 0, clientY: 110 });
    pointer(lamp, 'pointercancel', {});
    expect(rows()[0].hasAttribute('data-pct-dragging')).toBe(false);
    // Over its own upper half, or the lower half of the row above it: where it stands.
    pointer(lamp, 'pointerdown', { button: 0, clientY: 110 });
    pointer(lamp, 'pointermove', { clientY: 105 });
    pointer(lamp, 'pointerup', { clientY: 105 });
    const boiler = handle(2) as HTMLButtonElement & {
      setPointerCapture: (id: number) => void;
    };
    boiler.setPointerCapture = vi.fn();
    pointer(boiler, 'pointerdown', { button: 0, clientY: 130 });
    pointer(boiler, 'pointermove', { clientY: 115 });
    pointer(boiler, 'pointerup', { clientY: 115 });
    await settle(fixture);
    expect(fixture.componentInstance.moves).toEqual([]);
  });

  it('disables the handles under a sort, saying so once in development, and when asked to', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {
      // Read below.
    });
    const fixture = await render(Host);
    expect(handles().map((button) => button.disabled)).toEqual([
      false,
      false,
      false,
    ]);
    expect(warn).not.toHaveBeenCalled();
    fixture.componentInstance.sort.set([
      { key: 'name', direction: 'ascending' },
    ]);
    await settle(fixture);
    expect(handles().map((button) => button.disabled)).toEqual([
      true,
      true,
      true,
    ]);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain('moves no row under a sort');
    fixture.componentInstance.sort.set([]);
    fixture.componentInstance.disabled.set(true);
    await settle(fixture);
    expect(handles().map((button) => button.disabled)).toEqual([
      true,
      true,
      true,
    ]);
    // A second sort says nothing more: once is the table's.
    fixture.componentInstance.disabled.set(false);
    fixture.componentInstance.sort.set([
      { key: 'watts', direction: 'descending' },
    ]);
    await settle(fixture);
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('keeps the handle’s keys from a grid under it, which steps with the bare arrows', async () => {
    const fixture = await render(GridHost);
    const boiler = handle(2);
    boiler.focus();
    await settle(fixture);
    const alt = await press(fixture, boiler, 'ArrowDown', { altKey: true });
    expect(alt.defaultPrevented).toBe(true);
    expect(fixture.componentInstance.moves).toEqual([{ id: 2, before: null }]);
    // The focus stayed on the handle: the grid did not step.
    expect(document.activeElement).toBe(handle(2));
  });

  it('slides each row from where it stood to where it stands, while asked to, by the motion token', async () => {
    const animate = vi.fn();
    const cancel = vi.fn();
    const proto = HTMLElement.prototype as HTMLElement & {
      animate: unknown;
      getAnimations: unknown;
    };
    proto.animate = animate;
    proto.getAnimations = vi.fn(() => [{ cancel } as unknown as Animation]);
    layRows();
    const fixture = await render(Host);
    // A row pinned above stands in a body of its own, which the slide's rows leave out.
    fixture.componentInstance.top.set([{ id: 9, name: 'Total', watts: 0 }]);
    await settle(fixture);
    // Not asked: nothing measured, nothing animated.
    await press(fixture, handle(1), 'ArrowDown', { altKey: true });
    expect(animate).not.toHaveBeenCalled();
    fixture.componentInstance.animated.set(true);
    await settle(fixture);
    // The first render asked for measures the rows; a move then slides each that moved.
    expect(animate).not.toHaveBeenCalled();
    (table().style as CSSStyleDeclaration).setProperty(
      '--pct-motion-transition-duration',
      '150ms',
    );
    (table().style as CSSStyleDeclaration).setProperty(
      '--pct-motion-transition-easing',
      'ease-out',
    );
    await press(fixture, handle(1), 'ArrowUp', { altKey: true });
    expect(names()).toEqual(['Total', 'Lamp', 'Boiler', 'Fan']);
    // Lamp slid up from the second place, so its slide starts 20 px down; Boiler down from
    // the first, starting 20 px up; Fan stayed.
    expect(animate).toHaveBeenCalledTimes(2);
    expect(animate.mock.calls.map((call) => call[0][0].transform)).toEqual([
      'translateY(20px)',
      'translateY(-20px)',
    ]);
    expect(animate.mock.calls[0][0][1]).toEqual({ transform: 'none' });
    expect(animate.mock.calls[0][1]).toEqual({
      duration: 300,
      easing: 'ease-out',
    });
    // A slide under way is cut short before the next is measured.
    expect(cancel).toHaveBeenCalled();
    // Asked no more: a move slides nothing.
    fixture.componentInstance.animated.set(false);
    await settle(fixture);
    animate.mockClear();
    await press(fixture, handle(1), 'ArrowDown', { altKey: true });
    expect(animate).not.toHaveBeenCalled();
  });

  it('reads the token in seconds too, and no token as no time', async () => {
    const animate = vi.fn();
    const proto = HTMLElement.prototype as HTMLElement & {
      animate: unknown;
      getAnimations: unknown;
    };
    proto.animate = animate;
    proto.getAnimations = vi.fn(() => []);
    layRows();
    const fixture = await render(Host);
    fixture.componentInstance.animated.set(true);
    await settle(fixture);
    (table().style as CSSStyleDeclaration).setProperty(
      '--pct-motion-transition-duration',
      '0.2s',
    );
    await press(fixture, handle(1), 'ArrowDown', { altKey: true });
    expect(animate.mock.calls[0][1]).toEqual({ duration: 400, easing: 'ease' });
    (table().style as CSSStyleDeclaration).setProperty(
      '--pct-motion-transition-duration',
      'fast',
    );
    animate.mockClear();
    await press(fixture, handle(1), 'ArrowDown', { altKey: true });
    expect(animate.mock.calls[0][1]).toEqual({ duration: 0, easing: 'ease' });
  });
});
