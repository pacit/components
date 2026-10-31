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
  type PctTableRequest,
} from './data-table-remote';
import { PctTableSelection } from './data-table-selection';
import { PctTableWindow } from './data-table-window';
import { pctColumnsOf, type PctRowId } from './model/columns';
import type { PctTableSort } from './table';

interface Register {
  readonly id: number;
  readonly name: string;
  readonly value: number;
}

const col = pctColumnsOf<Register>();
const columns = col.of([
  col.key('name', { header: 'Name' }),
  col.key('value', { header: 'Value', aggregate: 'sum' }),
]);

/** A request the source was asked, and the means to answer it. */
interface Asked {
  readonly request: PctTableRequest<string>;
  readonly signal: AbortSignal;
  readonly answer: (total?: number, count?: number) => void;
  readonly fail: (error: unknown) => void;
}

let asked: Asked[] = [];

/** The rows of `[from, to)`, named by their place, `count` of them at most. */
function rowsOf(from: number, to: number): readonly Register[] {
  return Array.from({ length: to - from }, (_, i) => ({
    id: from + i,
    name: `Register ${from + i}`,
    value: 1,
  }));
}

const load = (
  request: PctTableRequest<string>,
  signal: AbortSignal,
): Promise<PctTableAnswer<Register>> =>
  new Promise((resolve, reject) =>
    asked.push({
      request,
      signal,
      answer: (total = 1000, count = request.to - request.from) =>
        resolve({
          rows: rowsOf(request.from, request.from + count),
          total,
        }),
      fail: reject,
    }),
  );

@Component({
  imports: [PctDataTable, PctTableWindow, PctTableRemote, PctTableSelection],
  template: `
    @if (picking()) {
      <pct-data-table
        pctTableWindow
        [pctTableRemote]="load"
        pctTableSelection
        [(value)]="selected"
        blockSize="50"
        caption="Registers"
        [columns]="columns"
        [rowId]="byId"
      />
    } @else {
      <pct-data-table
        pctTableWindow
        [pctTableRemote]="loader()"
        [blockSize]="size()"
        [keepScroll]="keep()"
        caption="Registers"
        [rowNumbers]="numbers()"
        [(sort)]="sort"
        [(filter)]="filter"
        [columns]="columns"
        [rowId]="byId"
      />
    }
  `,
})
class RemoteHost {
  readonly table = viewChild.required(PctDataTable);
  readonly remote = viewChild.required(PctTableRemote);
  readonly loader = signal(load);
  readonly size = signal(50);
  readonly keep = signal(false);
  readonly numbers = signal(false);
  readonly picking = signal(false);
  readonly sort = signal<readonly PctTableSort<'name' | 'value'>[]>([]);
  readonly filter = signal('');
  readonly selected = signal<readonly PctRowId[]>([]);
  readonly columns = columns;
  readonly load = load;
  readonly byId = (register: Register) => register.id;
}

@Component({
  imports: [PctDataTable, PctTableRemote],
  template: `<pct-data-table
    [pctTableRemote]="load"
    caption="Registers"
    [columns]="columns"
    [rowId]="byId"
  />`,
})
class NoWindowHost {
  readonly columns = columns;
  readonly load = load;
  readonly byId = (register: Register) => register.id;
}

@Component({
  imports: [PctDataTable, PctTableWindow, PctTableRemote, PctTableGroups],
  template: `<pct-data-table
    pctTableWindow
    [pctTableRemote]="load"
    [pctTableGroups]="columns"
    [groupBy]="['name']"
    blockSize="50"
    caption="Registers"
    [columns]="columns"
    [rowId]="byId"
  />`,
})
class GroupsHost {
  readonly columns = columns;
  readonly load = load;
  readonly byId = (register: Register) => register.id;
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
  // The bodies start under a header of 40 px and move with the scroll, as a browser lays them.
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
  globals.IntersectionObserver = class {
    observe(): void {
      // What the view shows is the window's to say: the source asks for the lines drawn.
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

function frameOf(fixture: ComponentFixture<unknown>): HTMLElement {
  return (fixture.nativeElement as HTMLElement).querySelector(
    'pct-table-frame',
  ) as HTMLElement;
}

/** Gives the frame a scroll jsdom does not keep, and a view of 400 px: ten lines. */
function lay(fixture: ComponentFixture<unknown>): void {
  let top = 0;
  Object.defineProperties(frameOf(fixture), {
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

async function render(
  configure: (host: RemoteHost) => void = () => undefined,
): Promise<ComponentFixture<RemoteHost>> {
  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      {
        provide: ErrorHandler,
        useValue: { handleError: (error: unknown) => errors.push(error) },
      },
    ],
  });
  const fixture = TestBed.createComponent(RemoteHost);
  configure(fixture.componentInstance);
  fixture.detectChanges();
  lay(fixture);
  await stable(fixture);
  return fixture;
}

/** The first request answered, and the table drawn with its rows. */
async function answered(
  configure: (host: RemoteHost) => void = () => undefined,
): Promise<ComponentFixture<RemoteHost>> {
  const fixture = await render(configure);
  asked[0].answer();
  await stable(fixture);
  return fixture;
}

/**
 * Scrolls the frame so that `line` stands at the view's top: the window then draws from eight
 * lines above it to eighteen below, every line at its 40 px estimate under a 40 px header.
 */
async function goTo(
  fixture: ComponentFixture<unknown>,
  line: number,
): Promise<void> {
  const frame = frameOf(fixture);
  frame.scrollTop = 40 + line * 40;
  frame.dispatchEvent(new Event('scroll'));
  await stable(fixture);
}

function tableOf(fixture: ComponentFixture<unknown>): HTMLTableElement {
  return frameOf(fixture).querySelector('table') as HTMLTableElement;
}

/** Each body row drawn: a row's first cell's text, `hole` or `failed`. */
function lines(fixture: ComponentFixture<unknown>): string[] {
  return Array.from(
    tableOf(fixture).querySelectorAll<HTMLElement>('tbody tr[data-pct-index]'),
  ).map((tr) => {
    if (tr.dataset['pctPart'] !== 'hole')
      return (tr.cells[0].textContent ?? '').trim();
    return tr.querySelector('td[colspan]') ? 'failed' : 'hole';
  });
}

/** The blocks asked for, by their first row, in the order asked. */
function froms(): number[] {
  return asked.map(({ request }) => request.from);
}

describe('PctTableRemote', () => {
  it('asks for the first block, and stands in for its rows until it comes', async () => {
    const fixture = await render();
    expect(asked.map(({ request }) => request)).toEqual([
      { from: 0, to: 50, sort: [], filter: '' },
    ]);
    const remote = fixture.componentInstance.remote();
    expect(remote.loading()).toBe(true);
    expect(remote.total()).toBe(0);
    const body = tableOf(fixture).querySelector('tbody') as HTMLElement;
    expect(body.getAttribute('aria-busy')).toBe('true');
    expect(
      body.querySelectorAll('tr[data-pct-part="placeholder"]'),
    ).toHaveLength(5);
  });

  it('draws the block that came, among every row the source counts', async () => {
    const fixture = await answered();
    const remote = fixture.componentInstance.remote();
    expect(remote.total()).toBe(1000);
    expect(remote.loading()).toBe(false);
    expect(tableOf(fixture).getAttribute('aria-rowcount')).toBe('1001');
    // The view's ten lines and eight below: all of them the first block's.
    expect(lines(fixture)).toEqual(
      rowsOf(0, 18).map((register) => register.name),
    );
    expect(
      (tableOf(fixture).querySelector('tbody') as HTMLElement).getAttribute(
        'aria-busy',
      ),
    ).toBeNull();
    expect(froms()).toEqual([0]);
  });

  it('draws a row not here yet as a hole, busy, at its place', async () => {
    const fixture = await answered();
    await goTo(fixture, 100);
    expect(lines(fixture)).toEqual(Array.from({ length: 26 }, () => 'hole'));
    const hole = tableOf(fixture).querySelector(
      'tr[data-pct-part="hole"]',
    ) as HTMLTableRowElement;
    expect(hole.dataset['pctIndex']).toBe('92');
    expect(hole.getAttribute('aria-busy')).toBe('true');
    expect(hole.getAttribute('aria-rowindex')).toBe('94');
    // A placeholder in each column's cell, the table's own loading.
    expect(hole.cells).toHaveLength(2);
    expect(hole.querySelectorAll('pct-skeleton')).toHaveLength(2);
  });

  it('asks for the blocks of the lines drawn and half a block around, each once', async () => {
    const fixture = await answered();
    await goTo(fixture, 100);
    // Lines 92 to 117, with 25 rows more each side: 67 to 142, in blocks 1 and 2.
    expect(froms()).toEqual([0, 50, 100]);
    expect(asked[1].request).toEqual({
      from: 50,
      to: 100,
      sort: [],
      filter: '',
    });
    await goTo(fixture, 102);
    expect(froms()).toEqual([0, 50, 100]);
    await goTo(fixture, 300);
    expect(froms()).toEqual([0, 50, 100, 250, 300]);
  });

  it('draws a block where it stands when it comes', async () => {
    const fixture = await answered();
    await goTo(fixture, 100);
    asked[2].answer();
    await stable(fixture);
    expect(lines(fixture)).toEqual([
      ...Array.from({ length: 8 }, () => 'hole'),
      ...rowsOf(100, 118).map((register) => register.name),
    ]);
    expect(fixture.componentInstance.remote().loading()).toBe(true);
  });

  it('lets go of a block still coming that the view left, and asks again on the way back', async () => {
    const fixture = await answered();
    await goTo(fixture, 100);
    await goTo(fixture, 0);
    expect(asked[1].signal.aborted).toBe(true);
    expect(asked[2].signal.aborted).toBe(true);
    expect(fixture.componentInstance.remote().loading()).toBe(false);
    // An answer to a block let go draws nothing.
    asked[2].answer();
    await stable(fixture);
    await goTo(fixture, 100);
    expect(lines(fixture)[8]).toBe('hole');
    expect(froms()).toEqual([0, 50, 100, 50, 100]);
    expect(asked[3].signal.aborted).toBe(false);
  });

  it('keeps the rows of a block the view left', async () => {
    const fixture = await answered();
    await goTo(fixture, 100);
    asked[2].answer();
    await stable(fixture);
    await goTo(fixture, 0);
    await goTo(fixture, 100);
    // Block 2 is here, and only block 1, let go before it came, is asked again.
    expect(froms()).toEqual([0, 50, 100, 50]);
    expect(lines(fixture)[8]).toBe('Register 100');
  });

  it('says once that a block failed, in the first of its rows in view, with a retry for it', async () => {
    const fixture = await answered();
    // Lines 67 to 92 are drawn, 75 to 84 in the view: every one of them in block 1.
    await goTo(fixture, 75);
    expect(froms()).toEqual([0, 50, 100]);
    const remote = fixture.componentInstance.remote();
    asked[1].fail('down');
    await stable(fixture);
    expect(remote.error()).toBe('down');
    expect(lines(fixture)).toEqual(Array.from({ length: 26 }, () => 'failed'));
    const failed = Array.from(
      tableOf(fixture).querySelectorAll<HTMLTableRowElement>(
        'tr[data-pct-part="hole"]',
      ),
    );
    // The view's first line says so, not a line drawn above the view.
    const said = failed.filter((tr) => tr.textContent?.trim() !== '');
    expect(said.map((tr) => tr.dataset['pctIndex'])).toEqual(['75']);
    expect(said[0].getAttribute('aria-busy')).toBeNull();
    expect(said[0].cells).toHaveLength(1);
    expect(said[0].cells[0].getAttribute('colspan')).toBe('2');
    expect(said[0].textContent?.replace(/\s+/g, ' ').trim()).toBe(
      'These rows could not be loaded. Retry',
    );
    expect(
      tableOf(fixture).querySelectorAll('[data-pct-part="retry"]'),
    ).toHaveLength(1);
    // Still drawn, the block is not asked again of itself.
    await goTo(fixture, 76);
    expect(froms()).toEqual([0, 50, 100]);
    expect(
      tableOf(fixture)
        .querySelector('[data-pct-part="retry"]')
        ?.closest('tr')?.dataset['pctIndex'],
    ).toBe('76');
  });

  it('says it in the first hole of a failed block that starts below the view’s top', async () => {
    const fixture = await answered();
    await goTo(fixture, 100);
    asked[2].fail('down');
    await stable(fixture);
    const retry = tableOf(fixture).querySelector('[data-pct-part="retry"]');
    expect(retry?.closest('tr')?.dataset['pctIndex']).toBe('100');
  });

  it('says nothing of a failed block drawn only above the view', async () => {
    const fixture = await answered();
    await goTo(fixture, 100);
    asked[1].fail('down');
    await stable(fixture);
    expect(lines(fixture).slice(0, 8)).toEqual(
      Array.from({ length: 8 }, () => 'failed'),
    );
    expect(
      tableOf(fixture).querySelectorAll('[data-pct-part="retry"]'),
    ).toHaveLength(0);
  });

  it('asks the failed block alone again at the retry, and draws its rows', async () => {
    const fixture = await answered();
    await goTo(fixture, 75);
    asked[1].fail('down');
    await stable(fixture);
    (
      tableOf(fixture).querySelector(
        '[data-pct-part="retry"]',
      ) as HTMLButtonElement
    ).click();
    await stable(fixture);
    expect(froms()).toEqual([0, 50, 100, 50]);
    expect(asked[2].signal.aborted).toBe(false);
    expect(lines(fixture)[0]).toBe('hole');
    expect(fixture.componentInstance.remote().error()).toBeNull();
    asked[3].answer();
    await stable(fixture);
    expect(lines(fixture)[0]).toBe('Register 67');
  });

  it('hands the focus to the frame when the retry pressed goes with its message', async () => {
    const fixture = await answered();
    await goTo(fixture, 75);
    asked[1].fail('down');
    await stable(fixture);
    const frame = frameOf(fixture);
    const focus = vi.spyOn(frame, 'focus');
    const retry = tableOf(fixture).querySelector(
      '[data-pct-part="retry"]',
    ) as HTMLButtonElement;
    retry.focus();
    retry.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    retry.click();
    await stable(fixture);
    expect(retry.isConnected).toBe(false);
    expect(focus).toHaveBeenCalledWith({ preventScroll: true });
  });

  it('says the first block failed where an empty table says why, with its retry', async () => {
    const fixture = await render();
    asked[0].fail('down');
    await stable(fixture);
    const message = frameOf(fixture).querySelector(
      '[data-pct-part="message"]',
    ) as HTMLElement;
    expect(message.textContent?.replace(/\s+/g, ' ').trim()).toBe(
      'These rows could not be loaded. Retry',
    );
    (
      message.querySelector('[data-pct-part="retry"]') as HTMLButtonElement
    ).click();
    await stable(fixture);
    expect(froms()).toEqual([0, 0]);
    expect(
      frameOf(fixture).querySelector('[data-pct-part="message"]')?.textContent,
    ).toContain('Loading');
    asked[1].answer();
    await stable(fixture);
    expect(lines(fixture)[0]).toBe('Register 0');
  });

  it('fails a block whose load throws rather than rejects', async () => {
    const fixture = await answered((host) =>
      host.loader.set((request, signal) => {
        if (request.from === 50) throw new Error('no server');
        return load(request, signal);
      }),
    );
    await goTo(fixture, 75);
    expect(
      (fixture.componentInstance.remote().error() as Error).message,
    ).toBe('no server');
    expect(lines(fixture)[0]).toBe('failed');
  });

  it('asks again for a failed block the view left and came back to', async () => {
    const fixture = await answered();
    await goTo(fixture, 100);
    asked[1].fail('down');
    await stable(fixture);
    await goTo(fixture, 0);
    expect(fixture.componentInstance.remote().error()).toBeNull();
    await goTo(fixture, 100);
    expect(froms()).toEqual([0, 50, 100, 50, 100]);
  });

  it('starts again at the top under a new order: every block let go, the first asked', async () => {
    const fixture = await answered();
    await goTo(fixture, 100);
    asked[2].answer();
    await stable(fixture);
    fixture.componentInstance.sort.set([
      { key: 'name', direction: 'descending' },
    ]);
    await stable(fixture);
    expect(asked[1].signal.aborted).toBe(true);
    expect(frameOf(fixture).scrollTop).toBe(0);
    expect(froms()).toEqual([0, 50, 100, 0]);
    expect(asked[3].request).toEqual({
      from: 0,
      to: 50,
      sort: [{ key: 'name', direction: 'descending' }],
      filter: '',
    });
    // The browser says the scroll moved, and the window draws the top.
    frameOf(fixture).dispatchEvent(new Event('scroll'));
    await stable(fixture);
    expect(froms()).toEqual([0, 50, 100, 0]);
    // The count stands until the new list's first answer: the scrollbar does not jump.
    expect(tableOf(fixture).getAttribute('aria-rowcount')).toBe('1001');
    expect(lines(fixture)).toEqual(Array.from({ length: 18 }, () => 'hole'));
    asked[3].answer(40);
    await stable(fixture);
    expect(tableOf(fixture).getAttribute('aria-rowcount')).toBe('41');
  });

  it('asks under the question typed, and filters nothing itself', async () => {
    const fixture = await answered();
    fixture.componentInstance.filter.set('Register 7');
    await stable(fixture);
    expect(asked.at(-1)?.request.filter).toBe('Register 7');
    (asked.at(-1) as Asked).answer(1000);
    await stable(fixture);
    // The rows the source gave, in its order: the table's own filter would leave few.
    expect(lines(fixture).slice(0, 3)).toEqual([
      'Register 0',
      'Register 1',
      'Register 2',
    ]);
    expect(fixture.componentInstance.table().matched()).toBe(1000);
  });

  it('orders nothing itself: the rows stand as the source gave them', async () => {
    const fixture = await answered();
    fixture.componentInstance.sort.set([
      { key: 'value', direction: 'descending' },
    ]);
    await stable(fixture);
    (asked.at(-1) as Asked).answer();
    await stable(fixture);
    expect(lines(fixture).slice(0, 2)).toEqual(['Register 0', 'Register 1']);
  });

  it('keeps the scroll under a new question with keepScroll, and asks for the blocks drawn', async () => {
    const fixture = await answered((host) => host.keep.set(true));
    await goTo(fixture, 100);
    fixture.componentInstance.filter.set('a');
    await stable(fixture);
    expect(frameOf(fixture).scrollTop).toBe(4040);
    expect(asked[1].signal.aborted).toBe(true);
    expect(froms()).toEqual([0, 50, 100, 50, 100]);
    expect(asked.slice(3).every(({ request }) => request.filter === 'a')).toBe(
      true,
    );
  });

  it('starts again under a new size of block', async () => {
    const fixture = await answered();
    fixture.componentInstance.size.set(20);
    await stable(fixture);
    // Lines 0 to 17 and ten rows more, in blocks of twenty.
    expect(froms()).toEqual([0, 0, 20]);
    expect(asked[1].request).toEqual({
      from: 0,
      to: 20,
      sort: [],
      filter: '',
    });
    // The first block's rows went with their size: twenty of them are not the fifty asked.
    expect(lines(fixture)[0]).toBe('hole');
  });

  it('refreshes the blocks drawn with their rows kept, and lets the rest go', async () => {
    const fixture = await answered();
    await goTo(fixture, 100);
    asked[1].answer();
    asked[2].answer();
    await stable(fixture);
    await goTo(fixture, 0);
    const remote = fixture.componentInstance.remote();
    remote.refresh();
    await stable(fixture);
    // Block 0 is asked again; 1 and 2 are let go.
    expect(froms()).toEqual([0, 50, 100, 0]);
    expect(remote.loading()).toBe(true);
    expect(lines(fixture)[0]).toBe('Register 0');
    await goTo(fixture, 100);
    expect(lines(fixture)[0]).toBe('hole');
    expect(froms()).toEqual([0, 50, 100, 0, 50, 100]);
  });

  it('keeps the rows of a refreshed block whose new answer failed', async () => {
    const fixture = await answered();
    fixture.componentInstance.remote().refresh();
    await stable(fixture);
    asked[1].fail('down');
    await stable(fixture);
    expect(lines(fixture)[0]).toBe('Register 0');
    expect(fixture.componentInstance.remote().error()).toBe('down');
  });

  it('lets every row go at invalidate, and asks for the blocks drawn where the scroll stands', async () => {
    const fixture = await answered();
    await goTo(fixture, 100);
    asked[1].answer();
    asked[2].answer();
    await stable(fixture);
    const remote = fixture.componentInstance.remote();
    remote.invalidate();
    await stable(fixture);
    expect(froms()).toEqual([0, 50, 100, 50, 100]);
    expect(frameOf(fixture).scrollTop).toBe(4040);
    expect(lines(fixture)[0]).toBe('hole');
    expect(remote.total()).toBe(1000);
  });

  it('draws a count that changed: the newer answer’s', async () => {
    const fixture = await answered();
    await goTo(fixture, 100);
    asked[2].answer(110);
    await stable(fixture);
    expect(tableOf(fixture).getAttribute('aria-rowcount')).toBe('111');
    expect(lines(fixture).at(-1)).toBe('Register 109');
  });

  it('says nothing of an empty source but that it is empty', async () => {
    const fixture = await render();
    asked[0].answer(0, 0);
    await stable(fixture);
    expect(lines(fixture)).toEqual([]);
    expect(
      (frameOf(fixture).querySelector('[data-pct-part="message"]') as HTMLElement)
        .textContent,
    ).toContain('No rows');
    // A new question asks again, though the last list had no rows.
    fixture.componentInstance.filter.set('x');
    await stable(fixture);
    expect(froms()).toEqual([0, 0]);
  });

  it('asks an empty source again at refresh', async () => {
    const fixture = await render();
    asked[0].answer(0, 0);
    await stable(fixture);
    fixture.componentInstance.remote().refresh();
    await stable(fixture);
    expect(froms()).toEqual([0, 0]);
    asked[1].answer(3);
    await stable(fixture);
    expect(lines(fixture)).toEqual(['Register 0', 'Register 1', 'Register 2']);
  });

  it('starts again with a new source: its rows, not the last one’s', async () => {
    const fixture = await answered();
    await goTo(fixture, 100);
    const other: typeof load = (request, signal) =>
      load(request, signal).then((answer) => ({
        rows: answer.rows.map((row) => ({ ...row, name: `Other ${row.id}` })),
        total: answer.total,
      }));
    fixture.componentInstance.loader.set(other);
    await stable(fixture);
    expect(asked[1].signal.aborted).toBe(true);
    expect(frameOf(fixture).scrollTop).toBe(0);
    frameOf(fixture).dispatchEvent(new Event('scroll'));
    await stable(fixture);
    expect(froms()).toEqual([0, 50, 100, 0]);
    asked[3].answer();
    await stable(fixture);
    expect(lines(fixture)[0]).toBe('Other 0');
  });

  it('asks for every block the top draws when it starts again there', async () => {
    const fixture = await answered((host) => host.size.set(10));
    // Lines 0 to 17 and five rows more: blocks 0, 1 and 2.
    expect(froms()).toEqual([0, 10, 20]);
    fixture.componentInstance.sort.set([
      { key: 'name', direction: 'descending' },
    ]);
    await stable(fixture);
    expect(froms()).toEqual([0, 10, 20, 0, 10, 20]);
    expect(asked.slice(3).every(({ request }) => request.sort.length === 1)).toBe(
      true,
    );
  });

  it('fails a block whose total is no count of rows', async () => {
    const fixture = await render();
    asked[0].answer(Number.NaN);
    await stable(fixture);
    const error = fixture.componentInstance.remote().error() as Error;
    expect(error).toBeInstanceOf(RangeError);
    expect(error.message).toBe(
      "[pct-data-table] pctTableRemote: a block's total must be a whole number of rows, not NaN.",
    );
    expect(fixture.componentInstance.remote().total()).toBe(0);
  });

  it('fails a block whose total is less than none, or a part of a row', async () => {
    for (const total of [-1, 2.5]) {
      TestBed.resetTestingModule();
      asked = [];
      const fixture = await render();
      asked[0].answer(total);
      await stable(fixture);
      expect(fixture.componentInstance.remote().error()).toBeInstanceOf(
        RangeError,
      );
    }
  });

  it('takes a block of no rows, or of a part of one, as the default hundred', async () => {
    for (const [size, to] of [
      [0, 100],
      [Number.NaN, 100],
      [2.5, 2],
      [1, 1],
    ] as const) {
      TestBed.resetTestingModule();
      asked = [];
      await render((host) => host.size.set(size));
      expect(asked[0].request.to).toBe(to);
    }
  });

  it('numbers a hole by its place', async () => {
    const fixture = await answered((host) => host.numbers.set(true));
    await goTo(fixture, 100);
    const hole = tableOf(fixture).querySelector(
      'tr[data-pct-part="hole"]',
    ) as HTMLTableRowElement;
    expect(hole.cells[0].textContent?.trim()).toBe('93');
    expect(hole.querySelectorAll('pct-skeleton')).toHaveLength(2);
  });

  it('sums nothing in the foot: the sums of rows not here are the source’s', async () => {
    const fixture = await answered();
    expect(tableOf(fixture).querySelector('tfoot')).toBeNull();
  });

  it('picks only the rows that came, and leaves a hole’s place empty', async () => {
    const fixture = await answered((host) => host.picking.set(true));
    const host = fixture.componentInstance;
    expect(host.table().matchedIds()).toEqual(rowsOf(0, 50).map((r) => r.id));
    await goTo(fixture, 100);
    const hole = tableOf(fixture).querySelector(
      'tr[data-pct-part="hole"]',
    ) as HTMLTableRowElement;
    expect(hole.cells).toHaveLength(3);
    expect(hole.cells[0].textContent?.trim()).toBe('');
  });

  it('aborts what is in flight when the table goes', async () => {
    const fixture = await answered();
    await goTo(fixture, 100);
    fixture.destroy();
    expect(asked[1].signal.aborted).toBe(true);
    expect(asked[2].signal.aborted).toBe(true);
  });

  it('refuses to draw without a window', () => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    });
    expect(() => TestBed.createComponent(NoWindowHost)).toThrow(
      /PctTableWindow/,
    );
  });

  it('groups none of a remote source’s rows, and says why', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    });
    const fixture = TestBed.createComponent(GroupsHost);
    fixture.detectChanges();
    await stable(fixture);
    asked[0].answer();
    await stable(fixture);
    expect(tableOf(fixture).querySelector('[data-pct-part="group"]')).toBeNull();
    expect(lines(fixture)[0]).toBe('Register 0');
    const said = warn.mock.calls.filter(([text]) =>
      String(text).includes('pctTableRemote'),
    );
    expect(said).toHaveLength(1);
  });
});
