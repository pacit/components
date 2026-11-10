import {
  Component,
  ErrorHandler,
  provideZonelessChangeDetection,
  signal,
  viewChild,
} from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PctDataTable } from './data-table';
import { PctTableGroups } from './data-table-groups';
import {
  PctTableRemote,
  type PctTableAnswer,
  type PctTableGroupsAnswer,
  type PctTableRequest,
} from './data-table-remote';
import { PctTableWindow } from './data-table-window';
import { pctColumnsOf } from './model/columns';
import { pctGroupKey } from './model/lines';
import type { PctTableSort } from './table';

/** A meter's reading of a month, on a server that groups them. */
interface Reading {
  readonly id: string;
  readonly meter: string;
  readonly month: number;
  readonly energy: number;
}

const col = pctColumnsOf<Reading>();
const columns = col.of([
  col.key('meter', { header: 'Meter' }),
  col.key('month', { header: 'Month' }),
  col.key('energy', { header: 'Energy', aggregate: 'sum' }),
]);

/** A request the source was asked, and the means to answer it. */
interface Asked {
  readonly request: PctTableRequest<string>;
  readonly signal: AbortSignal;
  readonly answer: (total?: number) => void;
  readonly resolve: (answer: unknown) => void;
  readonly fail: (error: unknown) => void;
}

let asked: Asked[] = [];

/**
 * What the source answers a request with, `total` in its list: the groups one level deeper
 * while the request is not as deep as `groupBy` — meters `m0`…, then months 1… — each of four
 * rows summing to 10; the rows of the group asked into at the last level.
 */
function answerOf(
  request: PctTableRequest<string>,
  total: number,
): PctTableAnswer<Reading> | PctTableGroupsAnswer {
  const { from, groupBy, group } = request;
  const to = Math.min(request.to, total);
  const places = Array.from(
    { length: Math.max(0, to - from) },
    (_, i) => from + i,
  );
  if (group.length < groupBy.length)
    return {
      groups: places.map((at) => ({
        value: groupBy[group.length] === 'meter' ? `m${at}` : at + 1,
        count: 4,
        sums: { energy: 10 },
      })),
      total,
    };
  const [meter = 'm0', month = 1] = group as [string?, number?];
  return {
    rows: places.map((at) => ({
      id: `${group.join('/')}#${at}`,
      meter,
      month,
      energy: at,
    })),
    total,
  };
}

const load = (
  request: PctTableRequest<string>,
  signal: AbortSignal,
): Promise<PctTableAnswer<Reading> | PctTableGroupsAnswer> =>
  new Promise((resolve, reject) =>
    asked.push({
      request,
      signal,
      answer: (total = 3) => resolve(answerOf(request, total)),
      resolve: resolve as (answer: unknown) => void,
      fail: reject,
    }),
  );

@Component({
  imports: [PctDataTable, PctTableWindow, PctTableRemote, PctTableGroups],
  template: `<pct-data-table
    #groups="pctTableGroups"
    pctTableWindow
    [pctTableRemote]="load"
    [pctTableGroups]="columns"
    [groupBy]="by()"
    [(collapsed)]="closed"
    blockSize="50"
    caption="Readings"
    [(sort)]="sort"
    [columns]="columns"
    [rowId]="byId"
  />`,
})
class GroupsHost {
  readonly table = viewChild.required(PctDataTable);
  readonly remote = viewChild.required(PctTableRemote);
  readonly groups = viewChild.required(PctTableGroups);
  readonly by = signal<readonly ('meter' | 'month' | 'energy')[]>(['meter']);
  readonly closed = signal<readonly string[]>([]);
  readonly sort = signal<readonly PctTableSort<'meter'>[]>([]);
  readonly columns = columns;
  readonly load = load;
  readonly byId = (row: Reading) => row.id;
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

/** The table drawn before any answer, with `prepare` run on its host first. */
async function render(
  prepare: (host: GroupsHost) => void = () => undefined,
): Promise<ComponentFixture<GroupsHost>> {
  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      {
        provide: ErrorHandler,
        useValue: { handleError: (error: unknown) => errors.push(error) },
      },
    ],
  });
  const fixture = TestBed.createComponent(GroupsHost);
  prepare(fixture.componentInstance);
  fixture.detectChanges();
  lay(fixture);
  await stable(fixture);
  return fixture;
}

/** Answers every request still waiting, each list with `total`. */
async function answerAll(
  fixture: ComponentFixture<unknown>,
  total = 3,
): Promise<void> {
  for (const { signal, answer } of asked) if (!signal.aborted) answer(total);
  await stable(fixture);
}

/**
 * Each body line drawn: a group's heading as `▸ label (count) | sums`, the sums written, a row
 * as its cells, a hole as `hole` or `failed`.
 */
function drawn(fixture: ComponentFixture<unknown>): string[] {
  return Array.from(
    (
      fixture.nativeElement as HTMLElement
    ).querySelectorAll<HTMLTableRowElement>('tbody tr[data-pct-index]'),
  ).map((tr) => {
    const part = tr.dataset['pctPart'];
    const text = (cell: Element) => (cell.textContent ?? '').trim();
    if (part === 'group') {
      const label = text(tr.querySelector('button span') as Element);
      const sums = [
        tr.querySelector('.pct-data-table__sum')?.textContent?.trim() ?? '',
        ...Array.from(tr.querySelectorAll('td')).map(text),
      ];
      return `▸ ${label} | ${sums.filter((sum) => sum !== '').join(' ')}`.trim();
    }
    if (part === 'hole')
      return tr.querySelector('td[colspan]') ? 'failed' : 'hole';
    return Array.from(tr.cells).map(text).join(' ');
  });
}

/** The lists asked for: the group's values and the first row, in the order asked. */
function requests(): string[] {
  return asked.map(
    ({ request }) => `${JSON.stringify(request.group)} ${request.from}`,
  );
}

describe('PctTableRemote with groups — the source makes them', () => {
  it('asks the top for groups under groupBy, and an open group for its rows under its value', async () => {
    const fixture = await render();
    expect(asked.map(({ request }) => request.groupBy)).toEqual([['meter']]);
    expect(requests()).toEqual(['[] 0']);
    asked[0].answer();
    await stable(fixture);
    // Every group opens as one hole, its rows asked for as the view reaches them.
    expect(drawn(fixture)).toEqual([
      '▸ m0 (4) | 10',
      'hole',
      '▸ m1 (4) | 10',
      'hole',
      '▸ m2 (4) | 10',
      'hole',
    ]);
    expect(requests()).toEqual(['[] 0', '["m0"] 0', '["m1"] 0', '["m2"] 0']);
    asked[1].answer(2);
    await stable(fixture);
    expect(drawn(fixture).slice(0, 4)).toEqual([
      '▸ m0 (4) | 10',
      'm0 1 0',
      'm0 1 1',
      '▸ m1 (4) | 10',
    ]);
  });

  it('heads a group with the count and the sums the source gave, summing none of its rows', async () => {
    const fixture = await render();
    asked[0].resolve({
      groups: [{ value: 'm0', count: 7, sums: { energy: 1234, meter: 'x' } }],
      total: 1,
    });
    await stable(fixture);
    asked[1].answer(2);
    await stable(fixture);
    // The rows that came sum to 1, the source said 1234; it gave the meter's column a sum
    // too, written as the column writes it.
    expect(drawn(fixture)[0]).toBe('▸ m0 (7) | x 1,234');
    // A group of no sums writes none.
    fixture.componentInstance.remote().invalidate();
    await stable(fixture);
    asked[2].resolve({ groups: [{ value: null, count: 1 }], total: 1 });
    await stable(fixture);
    expect(drawn(fixture)[0]).toBe('▸ No value (1) |');
  });

  it('counts the rows of the groups at the top as the rows matched', async () => {
    const fixture = await render();
    asked[0].answer();
    await stable(fixture);
    expect(fixture.componentInstance.table().matched()).toBe(12);
  });

  it('asks nothing for a collapsed group, and asks when it opens', async () => {
    const fixture = await render((host) =>
      host.closed.set([pctGroupKey(['m1'])]),
    );
    asked[0].answer();
    await stable(fixture);
    expect(requests()).toEqual(['[] 0', '["m0"] 0', '["m2"] 0']);
    expect(drawn(fixture)[2]).toBe('▸ m1 (4) | 10');
    expect(drawn(fixture)[3]).toBe('▸ m2 (4) | 10');
    fixture.componentInstance.closed.set([]);
    await stable(fixture);
    expect(requests().at(-1)).toBe('["m1"] 0');
  });

  it('keeps a closed group’s rows, and asks nothing when it opens again', async () => {
    const fixture = await render();
    await answerAll(fixture);
    await answerAll(fixture, 2);
    const before = asked.length;
    fixture.componentInstance.closed.set([pctGroupKey(['m0'])]);
    await stable(fixture);
    fixture.componentInstance.closed.set([]);
    await stable(fixture);
    expect(asked.length).toBe(before);
    expect(drawn(fixture)[1]).toBe('m0 1 0');
  });

  it('aborts a group’s block in flight when the group closes', async () => {
    const fixture = await render();
    asked[0].answer();
    await stable(fixture);
    expect(asked[1].signal.aborted).toBe(false);
    fixture.componentInstance.closed.set([pctGroupKey(['m0'])]);
    await stable(fixture);
    expect(asked[1].signal.aborted).toBe(true);
  });

  it('asks each level in turn, a group of a group under both values', async () => {
    const fixture = await render((host) => host.by.set(['meter', 'month']));
    expect(asked[0].request.groupBy).toEqual(['meter', 'month']);
    asked[0].answer(1);
    await stable(fixture);
    expect(requests()).toEqual(['[] 0', '["m0"] 0']);
    asked[1].answer(2);
    await stable(fixture);
    expect(requests()).toEqual([
      '[] 0',
      '["m0"] 0',
      '["m0",1] 0',
      '["m0",2] 0',
    ]);
    asked[2].answer(1);
    await stable(fixture);
    expect(drawn(fixture)).toEqual([
      '▸ m0 (4) | 10',
      '▸ 1 (4) | 10',
      'm0 1 0',
      '▸ 2 (4) | 10',
      'hole',
    ]);
    // A group's key is the path of its values, as a group the table makes.
    const headings = (
      fixture.nativeElement as HTMLElement
    ).querySelectorAll<HTMLButtonElement>('tr[data-pct-part="group"] button');
    expect(headings[1].getAttribute('aria-label')).toBe('1 (4), in m0');
    headings[1].click();
    await stable(fixture);
    expect(fixture.componentInstance.closed()).toEqual([
      pctGroupKey(['m0', 1]),
    ]);
  });

  it('collapses every group that came', async () => {
    const fixture = await render((host) => host.by.set(['meter', 'month']));
    asked[0].answer(2);
    await stable(fixture);
    await answerAll(fixture, 1);
    fixture.componentInstance.groups().collapseAll();
    expect(fixture.componentInstance.closed()).toEqual([
      pctGroupKey(['m0']),
      pctGroupKey(['m0', 1]),
      pctGroupKey(['m1']),
      pctGroupKey(['m1', 1]),
    ]);
  });

  it('says a group’s failed block in its hole, and the retry asks for that block alone', async () => {
    const fixture = await render();
    asked[0].answer(1);
    await stable(fixture);
    asked[1].fail(new Error('down'));
    await stable(fixture);
    expect(drawn(fixture)).toEqual(['▸ m0 (4) | 10', 'failed']);
    expect(fixture.componentInstance.remote().error()).toEqual(
      new Error('down'),
    );
    (
      (fixture.nativeElement as HTMLElement).querySelector(
        'tr[data-pct-part="hole"] button',
      ) as HTMLButtonElement
    ).click();
    await stable(fixture);
    expect(requests()).toEqual(['[] 0', '["m0"] 0', '["m0"] 0']);
    asked[2].answer(1);
    await stable(fixture);
    expect(drawn(fixture)).toEqual(['▸ m0 (4) | 10', 'm0 1 0']);
  });

  it('fails a block that answers rows where groups were asked for, naming what was', async () => {
    const fixture = await render();
    asked[0].resolve({ rows: [], total: 0 });
    await stable(fixture);
    expect(fixture.componentInstance.remote().error()).toEqual(
      new TypeError(
        '[pct-data-table] pctTableRemote: a block asked for under [] of groupBy needs `groups`: the table groups by more columns there.',
      ),
    );
  });

  it('fails a block that answers groups where rows were asked for', async () => {
    const fixture = await render();
    asked[0].answer(1);
    await stable(fixture);
    asked[1].resolve({ groups: [], total: 0 });
    await stable(fixture);
    expect(fixture.componentInstance.remote().error()).toEqual(
      new TypeError(
        '[pct-data-table] pctTableRemote: a block asked for under ["m0"] of groupBy needs `rows`: the table groups by no more columns there.',
      ),
    );
  });

  it('fails a block whose group counts no whole number of rows', async () => {
    const fixture = await render();
    asked[0].resolve({ groups: [{ value: 'm0', count: 1.5 }], total: 1 });
    await stable(fixture);
    expect(fixture.componentInstance.remote().error()).toEqual(
      new RangeError(
        "[pct-data-table] pctTableRemote: a group's count must be a whole number of rows, not 1.5.",
      ),
    );
  });

  it('asks again from the top under a new grouping, and lets the old blocks go', async () => {
    const fixture = await render();
    asked[0].answer();
    await stable(fixture);
    const old = asked.slice(1);
    fixture.componentInstance.by.set(['month']);
    await stable(fixture);
    expect(old.every(({ signal }) => signal.aborted)).toBe(true);
    const last = asked.at(-1) as Asked;
    expect(last.request.groupBy).toEqual(['month']);
    expect(last.request.group).toEqual([]);
    last.answer(1);
    await stable(fixture);
    expect(drawn(fixture)[0]).toBe('▸ 1 (4) | 10');
  });

  it('asks a new order of every open group', async () => {
    const fixture = await render();
    await answerAll(fixture);
    const before = asked.length;
    fixture.componentInstance.sort.set([
      { key: 'meter', direction: 'descending' },
    ]);
    await stable(fixture);
    expect(requests().slice(before)).toEqual(['[] 0']);
    expect(asked.at(-1)?.request.sort).toEqual([
      { key: 'meter', direction: 'descending' },
    ]);
    asked.at(-1)?.answer();
    await stable(fixture);
    expect(requests().slice(before + 1)).toEqual([
      '["m0"] 0',
      '["m1"] 0',
      '["m2"] 0',
    ]);
  });

  it('asks rows alone, under no group, while nothing is grouped', async () => {
    const fixture = await render((host) => host.by.set([]));
    expect(asked[0].request.groupBy).toEqual([]);
    expect(asked[0].request.group).toEqual([]);
    asked[0].answer(2);
    await stable(fixture);
    expect(drawn(fixture)).toEqual(['m0 1 0', 'm0 1 1']);
    expect(fixture.componentInstance.table().groupedBy()).toEqual([]);
  });
});
