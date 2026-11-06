import {
  Component,
  ErrorHandler,
  provideZonelessChangeDetection,
  signal,
  viewChild,
} from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PctDataTable } from './data-table';
import { PctTableGrid } from './data-table-grid';
import {
  PctTableRemote,
  type PctTableAnswer,
  type PctTableRequest,
} from './data-table-remote';
import { PctTableTree } from './data-table-tree';
import { PctTableWindow } from './data-table-window';
import { pctColumnsOf, type PctRowId } from './model/columns';
import type { PctTableSort } from './table';

/** A home on a server: floors, their rooms, the rooms' devices. */
interface Place {
  readonly id: string;
  readonly name: string;
  readonly kind: 'floor' | 'room' | 'device';
}

const col = pctColumnsOf<Place>();
const columns = col.of([col.key('name', { header: 'Name' })]);

/** A request the source was asked, and the means to answer it. */
interface Asked {
  readonly request: PctTableRequest<string>;
  readonly signal: AbortSignal;
  readonly answer: (total?: number) => void;
  readonly fail: (error: unknown) => void;
}

let asked: Asked[] = [];

/** The rows of a list, `[from, to)` of `total`: floors at the top, rooms in a floor, devices in a room. */
function rowsOf(
  parent: PctRowId | null,
  from: number,
  to: number,
): readonly Place[] {
  const kind =
    parent === null
      ? 'floor'
      : String(parent).includes('r')
        ? 'device'
        : 'room';
  const prefix = parent === null ? 'f' : `${String(parent)}-${kind[0]}`;
  return Array.from({ length: to - from }, (_, i) => ({
    id: `${prefix}${from + i}`,
    name: `${kind} ${prefix}${from + i}`,
    kind,
  }));
}

const load = (
  request: PctTableRequest<string>,
  signal: AbortSignal,
): Promise<PctTableAnswer<Place>> =>
  new Promise((resolve, reject) =>
    asked.push({
      request,
      signal,
      answer: (total = 3) =>
        resolve({
          rows: rowsOf(
            request.parent,
            request.from,
            Math.min(request.to, total),
          ),
          total,
        }),
      fail: reject,
    }),
  );

@Component({
  imports: [
    PctDataTable,
    PctTableWindow,
    PctTableRemote,
    PctTableTree,
    PctTableGrid,
  ],
  template: `<pct-data-table
    pctTableWindow
    [pctTableRemote]="load"
    [hasChildren]="branches()"
    [pctTableTree]="columns"
    [(expanded)]="open"
    [pctTableGrid]="columns"
    blockSize="50"
    caption="Home"
    [(sort)]="sort"
    [columns]="columns"
    [rowId]="byId"
  />`,
})
class TreeHost {
  readonly table = viewChild.required(PctDataTable);
  readonly remote = viewChild.required(PctTableRemote);
  readonly open = signal<readonly PctRowId[]>([]);
  readonly sort = signal<readonly PctTableSort<'name'>[]>([]);
  readonly branches = signal<((row: Place) => boolean) | null>(
    (row: Place) => row.kind !== 'device',
  );
  readonly columns = columns;
  readonly load = load;
  readonly byId = (row: Place) => row.id;
}

let errors: unknown[] = [];
const globals = globalThis as {
  ResizeObserver?: unknown;
  IntersectionObserver?: unknown;
};

beforeEach(() => {
  asked = [];
  errors = [];
  globals.ResizeObserver = class {
    observe(): void {
      // The window counts every line at its estimate: nothing is measured.
    }
    disconnect(): void {
      // Nothing to let go.
    }
  };
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(
    function (this: HTMLElement) {
      const frame = this.closest('pct-table-frame') as HTMLElement | null;
      const top = this.localName === 'tbody' ? 40 - (frame?.scrollTop ?? 0) : 0;
      return { top, height: 0, width: 0, bottom: top } as DOMRect;
    },
  );
  Object.defineProperty(document.documentElement, 'clientHeight', {
    configurable: true,
    get: () => 800,
  });
  globals.IntersectionObserver = class {
    observe(): void {
      // What the view shows is the window's to say.
    }
    disconnect(): void {
      // Nothing to let go.
    }
  };
});

afterEach(() => {
  vi.restoreAllMocks();
  delete (document.documentElement as { clientHeight?: number }).clientHeight;
  delete globals.ResizeObserver;
  delete globals.IntersectionObserver;
  expect(errors).toEqual([]);
});

/** The answers given so far settled, and the table drawn with them. */
async function stable(fixture: ComponentFixture<unknown>): Promise<void> {
  await new Promise((done) => setTimeout(done));
  await fixture.whenStable();
}

/** Gives the frame a scroll jsdom does not keep, and a view of 400 px: ten lines. */
function lay(fixture: ComponentFixture<unknown>): void {
  let top = 0;
  const frame = (fixture.nativeElement as HTMLElement).querySelector(
    'pct-table-frame',
  ) as HTMLElement;
  Object.defineProperties(frame, {
    scrollTop: {
      configurable: true,
      get: () => top,
      set: (value: number) => {
        top = Math.max(0, value);
      },
    },
    clientHeight: { configurable: true, get: () => 400 },
  });
}

/** The table drawn with its roots answered: three floors. */
async function render(): Promise<ComponentFixture<TreeHost>> {
  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      {
        provide: ErrorHandler,
        useValue: { handleError: (error: unknown) => errors.push(error) },
      },
    ],
  });
  const fixture = TestBed.createComponent(TreeHost);
  fixture.detectChanges();
  lay(fixture);
  await stable(fixture);
  asked[0].answer();
  await stable(fixture);
  return fixture;
}

/** Opens a branch, as its button would. */
async function open(
  fixture: ComponentFixture<TreeHost>,
  ...ids: PctRowId[]
): Promise<void> {
  fixture.componentInstance.open.update((open) => [...open, ...ids]);
  await stable(fixture);
}

/** Each body row drawn: its level and its first cell's text, `hole` or `failed`. */
function drawn(fixture: ComponentFixture<unknown>): string[] {
  return Array.from(
    (
      fixture.nativeElement as HTMLElement
    ).querySelectorAll<HTMLTableRowElement>('tbody tr[data-pct-index]'),
  ).map((tr) => {
    const level = tr.getAttribute('aria-level');
    const text =
      tr.dataset['pctPart'] !== 'hole'
        ? (tr.cells[0].textContent ?? '').trim()
        : tr.querySelector('td[colspan]')
          ? 'failed'
          : 'hole';
    return `${level} ${text}`;
  });
}

/** The lists asked for, by their parent and first row, in the order asked. */
function requests(): string[] {
  return asked.map(
    ({ request }) => `${String(request.parent)} ${request.from}`,
  );
}

describe('PctTableRemote — a tree the source holds', () => {
  it('asks for the roots alone, and draws each branch closed', async () => {
    const fixture = await render();
    expect(requests()).toEqual(['null 0']);
    expect(asked[0].request.path).toEqual([]);
    expect(drawn(fixture)).toEqual(['1 floor f0', '1 floor f1', '1 floor f2']);
    const rows = (fixture.nativeElement as HTMLElement).querySelectorAll(
      'tbody tr[data-pct-index]',
    );
    expect(rows[0].getAttribute('aria-expanded')).toBe('false');
    expect(fixture.componentInstance.remote().total()).toBe(3);
  });

  it('asks for a branch’s children when it opens, a hole standing in for them', async () => {
    const fixture = await render();
    await open(fixture, 'f1');
    expect(requests()).toEqual(['null 0', 'f1 0']);
    expect(asked[1].request).toEqual({
      parent: 'f1',
      path: ['f1'],
      from: 0,
      to: 50,
      sort: [],
      filter: '',
      columnFilters: {},
    });
    expect(drawn(fixture)).toEqual([
      '1 floor f0',
      '1 floor f1',
      '2 hole',
      '1 floor f2',
    ]);
    const hole = (fixture.nativeElement as HTMLElement).querySelector(
      'tr[data-pct-part="hole"]',
    ) as HTMLElement;
    expect(hole.getAttribute('aria-busy')).toBe('true');
    asked[1].answer(2);
    await stable(fixture);
    expect(drawn(fixture)).toEqual([
      '1 floor f0',
      '1 floor f1',
      '2 room f1-r0',
      '2 room f1-r1',
      '1 floor f2',
    ]);
  });

  it('asks a branch deeper down under the path to it', async () => {
    const fixture = await render();
    await open(fixture, 'f0');
    asked[1].answer(1);
    await stable(fixture);
    await open(fixture, 'f0-r0');
    expect(asked[2].request.parent).toBe('f0-r0');
    expect(asked[2].request.path).toEqual(['f0', 'f0-r0']);
    asked[2].answer(1);
    await stable(fixture);
    expect(drawn(fixture)).toEqual([
      '1 floor f0',
      '2 room f0-r0',
      '3 device f0-r0-d0',
      '1 floor f1',
      '1 floor f2',
    ]);
    // A device is a leaf: nothing to open, nothing asked.
    const rows = (fixture.nativeElement as HTMLElement).querySelectorAll(
      'tbody tr[data-pct-index]',
    );
    expect(rows[2].hasAttribute('aria-expanded')).toBe(false);
  });

  it('counts a branch’s children apart from the roots, a hole for each not come', async () => {
    const fixture = await render();
    await open(fixture, 'f0');
    asked[1].answer(70);
    await stable(fixture);
    const remote = fixture.componentInstance.remote();
    expect(remote.total()).toBe(3);
    const lines = fixture.componentInstance.table().lines();
    // The floor, its 70 rooms — 50 that came and 20 holes — and the two other floors.
    expect(lines).toHaveLength(73);
    expect(lines.filter((line) => line.kind === 'hole')).toHaveLength(20);
    expect(lines[51]).toEqual({
      kind: 'hole',
      key: 51,
      index: 51,
      level: 1,
      parent: 'f0',
      at: 50,
    });
  });

  it('says a branch’s block failed in its hole, and asks that block alone again at the retry', async () => {
    const fixture = await render();
    await open(fixture, 'f2');
    asked[1].fail(new Error('down'));
    await stable(fixture);
    expect(drawn(fixture)).toEqual([
      '1 floor f0',
      '1 floor f1',
      '1 floor f2',
      '2 failed',
    ]);
    expect(fixture.componentInstance.remote().error()).toEqual(
      new Error('down'),
    );
    const retry = (fixture.nativeElement as HTMLElement).querySelector(
      '[data-pct-part="retry"]',
    ) as HTMLButtonElement;
    retry.click();
    await stable(fixture);
    expect(requests()).toEqual(['null 0', 'f2 0', 'f2 0']);
    asked[2].answer(1);
    await stable(fixture);
    expect(drawn(fixture).at(-1)).toBe('2 room f2-r0');
  });

  it('keeps a closed branch’s children, and asks nothing when it opens again', async () => {
    const fixture = await render();
    await open(fixture, 'f0');
    asked[1].answer(1);
    await stable(fixture);
    fixture.componentInstance.open.set([]);
    await stable(fixture);
    expect(drawn(fixture)).toHaveLength(3);
    await open(fixture, 'f0');
    expect(requests()).toEqual(['null 0', 'f0 0']);
    expect(drawn(fixture)[1]).toBe('2 room f0-r0');
  });

  it('aborts a branch’s block still coming when the branch closes, and asks again when it opens', async () => {
    const fixture = await render();
    await open(fixture, 'f0');
    fixture.componentInstance.open.set([]);
    await stable(fixture);
    expect(asked[1].signal.aborted).toBe(true);
    await open(fixture, 'f0');
    expect(requests()).toEqual(['null 0', 'f0 0', 'f0 0']);
  });

  it('lets every branch’s rows go under a new order, and asks again for the open ones', async () => {
    const fixture = await render();
    await open(fixture, 'f0');
    asked[1].answer(1);
    await stable(fixture);
    fixture.componentInstance.sort.set([
      { key: 'name', direction: 'descending' },
    ]);
    await stable(fixture);
    expect(requests()).toEqual(['null 0', 'f0 0', 'null 0']);
    asked[2].answer();
    await stable(fixture);
    // The floor is open still, and its rooms are the new order's to send.
    expect(requests()).toEqual(['null 0', 'f0 0', 'null 0', 'f0 0']);
    expect(asked[3].request.sort).toEqual([
      { key: 'name', direction: 'descending' },
    ]);
    expect(drawn(fixture)[1]).toBe('2 hole');
  });

  it('refreshes the lists in view, the branches’ with the roots', async () => {
    const fixture = await render();
    await open(fixture, 'f0');
    asked[1].answer(1);
    await stable(fixture);
    fixture.componentInstance.remote().refresh();
    await stable(fixture);
    expect(requests()).toEqual(['null 0', 'f0 0', 'null 0', 'f0 0']);
    // The rows stand until the new answers.
    expect(drawn(fixture)[1]).toBe('2 room f0-r0');
  });

  it('leaves the tree to the rows that came without hasChildren', async () => {
    const fixture = await render();
    fixture.componentInstance.branches.set(null);
    await open(fixture, 'f0');
    expect(requests()).toEqual(['null 0']);
    expect(drawn(fixture)).toEqual(['1 floor f0', '1 floor f1', '1 floor f2']);
  });
});
