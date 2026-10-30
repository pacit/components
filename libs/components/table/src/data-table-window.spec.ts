import {
  Component,
  ErrorHandler,
  provideZonelessChangeDetection,
  signal,
  viewChild,
} from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PctDataTable } from './data-table';
import { PctTableDetails } from './data-table-details';
import { PctTableGroups } from './data-table-groups';
import { PctDetailsTemplate } from './data-table-slots';
import { PctTableWindow } from './data-table-window';
import { pctColumnsOf, type PctRowId } from './model/columns';

interface Register {
  readonly id: number;
  readonly name: string;
  readonly room: string;
  readonly value: number;
}

const col = pctColumnsOf<Register>();
const columns = col.of([
  col.key('name', { header: 'Name' }),
  col.key('room', { header: 'Room' }),
  col.key('value', { header: 'Value', aggregate: 'sum' }),
]);
const fewer = col.of([col.key('name', { header: 'Name' })]);

function registersOf(count: number): readonly Register[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    name: `Register ${i + 1}`,
    room: i < count / 2 ? 'Hall' : 'Kitchen',
    value: 1,
  }));
}

@Component({
  imports: [
    PctDataTable,
    PctTableWindow,
    PctTableDetails,
    PctTableGroups,
    PctDetailsTemplate,
  ],
  template: `
    @if (grouped()) {
      <pct-data-table
        pctTableWindow
        [pctTableGroups]="columns()"
        [groupBy]="['room']"
        caption="Registers"
        [stickyHeader]="sticky()"
        [rows]="rows()"
        [columns]="columns()"
        [rowId]="byId"
      />
    } @else {
      <pct-data-table
        pctTableWindow
        pctTableDetails
        [(details)]="open"
        caption="Registers"
        [stickyHeader]="sticky()"
        [highlightChanges]="true"
        [rows]="rows()"
        [columns]="columns()"
        [rowId]="byId"
      >
        <ng-template [pctDetails]="columns()" let-register>
          {{ register.room }}
        </ng-template>
      </pct-data-table>
    }
  `,
})
class WindowHost {
  readonly table = viewChild.required(PctDataTable);
  readonly rows = signal<readonly Register[]>(registersOf(1000));
  readonly columns = signal(columns);
  readonly sticky = signal(true);
  readonly grouped = signal(false);
  readonly open = signal<readonly PctRowId[]>([]);
  readonly byId = (register: Register) => register.id;
}

@Component({
  imports: [PctDataTable],
  template: `<pct-data-table
    caption="Registers"
    [rows]="rows"
    [columns]="columns"
    [rowId]="byId"
  />`,
})
class PlainHost {
  readonly rows = registersOf(3);
  readonly columns = columns;
  readonly byId = (register: Register) => register.id;
}

/** The height each line reports, by its index; 40 unless a case says otherwise. */
let heightOf: (index: number) => number;
/** The frame's height, the page's, and the header cells' widths. */
let view: number;
let page: number;
let widthOf: (th: Element) => number;

interface Observer {
  readonly callback: (entries: unknown[]) => void;
  readonly targets: Set<Element>;
}
let observers: Observer[] = [];
let errors: unknown[] = [];
const globals = globalThis as {
  ResizeObserver?: unknown;
  IntersectionObserver?: unknown;
};

beforeEach(() => {
  heightOf = () => 40;
  view = 400;
  page = 800;
  widthOf = () => 100;
  observers = [];
  errors = [];
  globals.ResizeObserver = class {
    readonly targets = new Set<Element>();
    constructor(callback: (entries: unknown[]) => void) {
      observers.push({ callback, targets: this.targets });
    }
    observe(target: Element): void {
      this.targets.add(target);
    }
    disconnect(): void {
      this.targets.clear();
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
  // A header of 40 px at the frame's top; the bodies start under it, moving with the scroll.
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(
    function (this: HTMLElement) {
      const frame = this.closest('pct-table-frame') as HTMLElement | null;
      const rect = (top: number, height: number, width = 0) =>
        ({
          top,
          height,
          width,
          bottom: top + height,
          left: 0,
          right: width,
          x: 0,
          y: top,
          toJSON: () => ({}),
        }) as DOMRect;
      if (this.localName === 'thead') return rect(0, 40);
      if (this.localName === 'tbody')
        return rect(40 - (frame?.scrollTop ?? 0), 0);
      if (this.localName === 'th') return rect(0, 40, widthOf(this));
      return rect(0, 0);
    },
  );
  Object.defineProperty(document.documentElement, 'clientHeight', {
    configurable: true,
    get: () => page,
  });
});

afterEach(() => {
  delete globals.ResizeObserver;
  delete globals.IntersectionObserver;
  delete (document.documentElement as { clientHeight?: number }).clientHeight;
  vi.restoreAllMocks();
  expect(errors).toEqual([]);
});

/** The frame of the table under test, with a scroll and a height jsdom does not lay out. */
function frameOf(fixture: ComponentFixture<unknown>): HTMLElement {
  return (fixture.nativeElement as HTMLElement).querySelector(
    'pct-table-frame',
  ) as HTMLElement;
}

/** The table drawn and its frame laid out, with no line measured yet. */
async function start(
  configure: (host: WindowHost) => void = () => undefined,
): Promise<ComponentFixture<WindowHost>> {
  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      {
        provide: ErrorHandler,
        useValue: { handleError: (error: unknown) => errors.push(error) },
      },
    ],
  });
  const fixture = TestBed.createComponent(WindowHost);
  configure(fixture.componentInstance);
  fixture.detectChanges();
  lay(fixture);
  // An observer reports the size of what it starts on: the frame's, laid out.
  resize();
  await fixture.whenStable();
  return fixture;
}

async function render(
  configure: (host: WindowHost) => void = () => undefined,
): Promise<ComponentFixture<WindowHost>> {
  const fixture = await start(configure);
  await settle(fixture);
  return fixture;
}

/** Gives the frame a scroll, a height and a width, as a browser lays it out. */
function lay(fixture: ComponentFixture<unknown>): void {
  const frame = frameOf(fixture);
  let top = 0;
  Object.defineProperties(frame, {
    scrollTop: {
      configurable: true,
      get: () => top,
      set: (value: number) => {
        top = Math.max(0, value);
      },
    },
    clientHeight: { configurable: true, get: () => view },
    clientWidth: { configurable: true, get: () => 600 },
    clientTop: { configurable: true, get: () => 0 },
    scrollHeight: { configurable: true, get: () => 40_000 },
  });
}

/**
 * Reports every line observed at its height, as the browser does after a layout, or only the
 * lines `only` holds.
 */
function measure(only?: readonly number[]): void {
  for (const observer of observers) {
    const entries = [...observer.targets]
      .filter((target) => target.localName === 'tr')
      .filter(
        (target) =>
          only === undefined ||
          only.includes(Number((target as HTMLElement).dataset['pctIndex'])),
      )
      .map((target) => ({
        target,
        borderBoxSize: [
          {
            blockSize: heightOf(
              Number((target as HTMLElement).dataset['pctIndex']),
            ),
          },
        ],
      }));
    if (entries.length > 0) observer.callback(entries);
  }
}

/** Reports the frame resized. */
function resize(): void {
  for (const observer of observers)
    if ([...observer.targets].some((t) => t.localName === 'pct-table-frame'))
      observer.callback([]);
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  for (let round = 0; round < 4; round++) {
    await fixture.whenStable();
    measure();
  }
  await fixture.whenStable();
}

async function scroll(
  fixture: ComponentFixture<unknown>,
  top: number,
): Promise<void> {
  const frame = frameOf(fixture);
  frame.scrollTop = top;
  frame.dispatchEvent(new Event('scroll'));
  await settle(fixture);
}

function table(fixture: ComponentFixture<unknown>): HTMLTableElement {
  return frameOf(fixture).querySelector('table') as HTMLTableElement;
}

/** The lines drawn, by their index. */
function drawn(fixture: ComponentFixture<unknown>): number[] {
  return Array.from(
    table(fixture).querySelectorAll<HTMLElement>('tbody tr[data-pct-index]'),
  ).map((tr) => Number(tr.dataset['pctIndex']));
}

/** The line the view's top stands in, and how far into it, as the space draws them. */
function standing(fixture: ComponentFixture<unknown>): {
  line: number;
  into: number;
} {
  const element = table(fixture);
  let at = parseFloat(element.style.getPropertyValue('--_lead'));
  const top = frameOf(fixture).scrollTop;
  for (const line of drawn(fixture)) {
    const height = heightOf(line);
    if (top < at + height) return { line, into: top - at };
    at += height;
  }
  return { line: -1, into: 0 };
}

function range(start: number, end: number): number[] {
  return Array.from({ length: end - start }, (_, i) => start + i);
}

describe('PctTableWindow', () => {
  it('draws the lines the view shows and eight more below, and the space of the rest', async () => {
    const fixture = await render();
    // A view of 400 px less the header's 40: nine lines of 40 px, and the overscan.
    expect(drawn(fixture)).toEqual(range(0, 17));
    const element = table(fixture);
    expect(element.style.getPropertyValue('--_lead')).toBe('0px');
    expect(element.style.getPropertyValue('--_tail')).toBe(
      `${(1000 - 17) * 40}px`,
    );
    expect(element.classList).toContain('pct-data-table__window');
  });

  it('tells a reader the count and each row’s place, the header’s row first and the foot’s last', async () => {
    const fixture = await render();
    const element = table(fixture);
    // A header row, a thousand rows and the foot's sum.
    expect(element.getAttribute('aria-rowcount')).toBe('1002');
    expect(element.tHead?.rows[0].getAttribute('aria-rowindex')).toBe('1');
    expect(element.tBodies[0].rows[0].getAttribute('aria-rowindex')).toBe('2');
    expect(element.tFoot?.rows[0].getAttribute('aria-rowindex')).toBe('1002');
    fixture.componentInstance.columns.set(fewer as unknown as typeof columns);
    await settle(fixture);
    expect(element.getAttribute('aria-rowcount')).toBe('1001');
  });

  it('moves with the scroll: the lines around the view, and the space above them', async () => {
    const fixture = await render();
    await scroll(fixture, 4000);
    expect(drawn(fixture)).toEqual(range(92, 117));
    expect(table(fixture).style.getPropertyValue('--_lead')).toBe(
      `${92 * 40}px`,
    );
    expect(
      table(fixture).tBodies[0].rows[0].getAttribute('aria-rowindex'),
    ).toBe('94');
  });

  it('counts the lines not drawn at the median of the first rows measured', async () => {
    heightOf = (index) => (index === 0 ? 90 : index < 10 ? 30 : 50);
    const fixture = await render();
    // Seventeen rows measured at first: a 90, nine of 30 and seven of 50, so the median is 30;
    // the view of 360 px then ends at line 10, and the overscan reaches line 17.
    expect(drawn(fixture)).toEqual(range(0, 18));
    expect(table(fixture).style.getPropertyValue('--_tail')).toBe(
      `${(1000 - 18) * 30}px`,
    );
  });

  it('moves the scroll by what a line above the reader’s turned out to be, and not for one below', async () => {
    const fixture = await render();
    await scroll(fixture, 4000);
    const frame = frameOf(fixture);
    // Line 95 is above line 100, at the view's top: it grows by 60 px, and so does the scroll.
    heightOf = (index) => (index === 95 ? 100 : 40);
    measure();
    expect(frame.scrollTop).toBe(4060);
    // Line 105 is below it: what is read stays where it is.
    heightOf = (index) => (index === 95 ? 100 : index === 105 ? 10 : 40);
    measure();
    expect(frame.scrollTop).toBe(4060);
    await settle(fixture);
  });

  it('keeps the line at the top where it was when the first rows set the estimate', async () => {
    heightOf = () => 30;
    const fixture = await start();
    const frame = frameOf(fixture);
    frame.scrollTop = 4010;
    frame.dispatchEvent(new Event('scroll'));
    await fixture.whenStable();
    // At 40 px a line, the top was 10 px into line 100; at the median of 30, still so.
    measure();
    expect(frame.scrollTop).toBe(100 * 30 + 10);
    // The browser tells the frame's listener of the scroll written.
    frame.dispatchEvent(new Event('scroll'));
    await settle(fixture);
    expect(standing(fixture)).toEqual({ line: 100, into: 10 });
  });

  it('takes a height within a sixty-fourth of a pixel of the last as the same', async () => {
    const fixture = await render();
    await scroll(fixture, 4000);
    const frame = frameOf(fixture);
    heightOf = (index) => (index === 95 ? 40 + 1 / 128 : 40);
    measure();
    expect(frame.scrollTop).toBe(4000);
    heightOf = (index) => (index === 95 ? 40 + 1 / 32 : 40);
    measure();
    expect(frame.scrollTop).toBe(4000 + 1 / 32);
    await settle(fixture);
  });

  it('keeps a row measured once at its height after a sort moves it', async () => {
    heightOf = (index) => (index === 3 ? 100 : 40);
    const fixture = await render();
    fixture.componentInstance.rows.update((rows) => [...rows].reverse());
    heightOf = () => 40;
    await settle(fixture);
    // Row 4 now stands at line 996, below the window, and still counts at 100 px.
    expect(table(fixture).style.getPropertyValue('--_tail')).toBe(
      `${(1000 - 17) * 40 + 60}px`,
    );
  });

  it('draws a row with its details and details with their row, at either edge', async () => {
    const fixture = await render((host) => host.open.set([17, 92]));
    // Line 16 is row 17, whose details are line 17: the first not drawn.
    expect(drawn(fixture)).toEqual(range(0, 18));
    expect(table(fixture).style.getPropertyValue('--_tail')).toBe(
      `${(1002 - 18) * 40}px`,
    );
    // Row 92 is line 92 (after row 17's details), its details line 93: a window from line 93
    // starts at the row.
    await scroll(fixture, 93 * 40 + 8 * 40);
    expect(drawn(fixture)[0]).toBe(92);
    expect(table(fixture).style.getPropertyValue('--_lead')).toBe(
      `${92 * 40}px`,
    );
  });

  it('reads where the bodies start, and a header that does not stick covers nothing', async () => {
    const fixture = await render((host) => host.sticky.set(false));
    // The bodies start 40 px down and the whole frame shows lines: ten of them.
    expect(drawn(fixture)).toEqual(range(0, 18));
    await scroll(fixture, 4040);
    expect(drawn(fixture)).toEqual(range(92, 118));
  });

  it('waits for the row it scrolls to, not for any row, before the second pass', async () => {
    const fixture = await render();
    const frame = frameOf(fixture);
    fixture.componentInstance.table().scrollTo(501, { align: 'center' });
    await fixture.whenStable();
    // Row 501 is line 500: its centre at 20,020 px, in a view of 360.
    expect(frame.scrollTop).toBe(19_840);
    frame.dispatchEvent(new Event('scroll'));
    await fixture.whenStable();
    heightOf = (index) => (index === 498 ? 70 : index === 500 ? 100 : 40);
    // Line 498 reports first, below the top: nothing moves yet.
    measure([498]);
    expect(frame.scrollTop).toBe(19_840);
    // Then line 500 itself, 100 px tall: centred where it was measured.
    measure();
    expect(frame.scrollTop).toBe(20_030 + 50 - 180);
    await settle(fixture);
  });

  it('drops a scroll to a line once the lines are others', async () => {
    const fixture = await render();
    const frame = frameOf(fixture);
    fixture.componentInstance.table().scrollTo(501, { align: 'end' });
    await fixture.whenStable();
    expect(frame.scrollTop).toBe(20_040 - 360);
    fixture.componentInstance.rows.update((rows) => [...rows].reverse());
    heightOf = (index) => (index === 500 ? 100 : 40);
    frame.dispatchEvent(new Event('scroll'));
    await settle(fixture);
    // Line 500 is another row now: nothing scrolls to it.
    expect(frame.scrollTop).toBe(20_040 - 360);
  });

  it('reads no report on the rows of lines since gone', async () => {
    const fixture = await render();
    await scroll(fixture, 4000);
    fixture.componentInstance.rows.set(registersOf(50));
    // The rows drawn are lines 92 and on, which fifty lines do not have.
    measure();
    await settle(fixture);
    expect(drawn(fixture).at(-1)).toBe(49);
  });

  it('scrolls to a row it has not drawn, then once more where the row measured', async () => {
    const fixture = await render();
    const frame = frameOf(fixture);
    fixture.componentInstance.table().scrollTo(501, { align: 'start' });
    await fixture.whenStable();
    expect(frame.scrollTop).toBe(500 * 40);
    // Line 498 turns out taller: the second pass puts row 501 at the top again.
    heightOf = (index) => (index === 498 ? 70 : 40);
    frame.dispatchEvent(new Event('scroll'));
    await settle(fixture);
    expect(frame.scrollTop).toBe(500 * 40 + 30);
    expect(drawn(fixture)).toContain(500);
    // Done: a later render does not scroll back to it.
    await scroll(fixture, 100);
    heightOf = () => 40;
    await settle(fixture);
    expect(frame.scrollTop).toBe(100);
  });

  it('fixes the header’s cells at the widths they had, and measures them again for other columns', async () => {
    widthOf = (th) => 50 + th.textContent!.trim().length;
    const fixture = await render();
    const element = table(fixture);
    const cells = () => Array.from(element.tHead!.rows[0].cells);
    expect(element.style.tableLayout).toBe('fixed');
    // The disclosure's header, then Name, Room and Value.
    expect(cells().map((cell) => cell.style.inlineSize)).toEqual([
      '57px',
      '54px',
      '54px',
      '55px',
    ]);
    expect(cells()[0].style.boxSizing).toBe('border-box');
    // The widths are read with none fixed: the automatic layout's.
    const seen: string[] = [];
    widthOf = (th) => {
      seen.push(
        `${(th as HTMLElement).style.inlineSize}|${element.style.tableLayout}`,
      );
      return 80;
    };
    fixture.componentInstance.columns.set(fewer as unknown as typeof columns);
    await settle(fixture);
    expect(seen).toEqual(['|', '|']);
    expect(cells().map((cell) => cell.style.inlineSize)).toEqual([
      '80px',
      '80px',
    ]);
    // A render with the same columns measures nothing.
    await scroll(fixture, 400);
    expect(seen).toHaveLength(2);
  });

  it('measures the widths again when the frame is resized', async () => {
    const fixture = await render();
    const frame = frameOf(fixture);
    widthOf = () => 70;
    Object.defineProperty(frame, 'clientWidth', {
      configurable: true,
      get: () => 500,
    });
    resize();
    expect(table(fixture).tHead!.rows[0].cells[0].style.inlineSize).toBe(
      '70px',
    );
    // Resized to the same width: nothing is measured again.
    widthOf = () => 90;
    resize();
    expect(table(fixture).tHead!.rows[0].cells[0].style.inlineSize).toBe(
      '70px',
    );
    await settle(fixture);
  });

  it('reads a frame taller than the page as the page’s view, and says the table needs a height', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    view = 5000;
    page = 440;
    const fixture = await render();
    // The page's 440 px less the header: ten lines and the overscan.
    expect(drawn(fixture)).toEqual(range(0, 18));
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain('give the table a height');
    resize();
    await settle(fixture);
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('says nothing of a frame no taller than the page', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    page = 400;
    await render();
    expect(warn).not.toHaveBeenCalled();
  });

  it('follows a frame that grows', async () => {
    const fixture = await render();
    view = 600;
    resize();
    await settle(fixture);
    expect(drawn(fixture)).toEqual(range(0, 22));
  });

  it('scales a space past 16,000,000 px, and keeps the line at the top where a line above it grew', async () => {
    const fixture = await render((host) => host.rows.set(registersOf(500_000)));
    const element = table(fixture);
    const space = () =>
      parseFloat(element.style.getPropertyValue('--_lead')) +
      parseFloat(element.style.getPropertyValue('--_tail')) +
      drawn(fixture).length * 40;
    expect(space()).toBeCloseTo(16_000_000, 0);
    await scroll(fixture, 8_000_000);
    const frame = frameOf(fixture);
    expect(drawn(fixture)[8]).toBeGreaterThan(240_000);
    const before = standing(fixture);
    const grown = drawn(fixture)[0];
    heightOf = (index) => (index === grown ? 100 : 40);
    measure();
    frame.dispatchEvent(new Event('scroll'));
    await settle(fixture);
    // The scroll moves by the map's share of the 60 px, and what the reader sees stays.
    expect(frame.scrollTop).not.toBe(8_000_000);
    const after = standing(fixture);
    expect(after.line).toBe(before.line);
    expect(after.into).toBeCloseTo(before.into, 3);
  }, 20_000);

  it('keeps a group’s body when the window leaves its heading behind', async () => {
    const fixture = await render((host) => host.grouped.set(true));
    const element = table(fixture);
    expect(element.tBodies).toHaveLength(1);
    expect(element.querySelectorAll('tr[data-pct-part="group"]')).toHaveLength(
      1,
    );
    const body = element.tBodies[0];
    await scroll(fixture, 4000);
    expect(element.querySelectorAll('tr[data-pct-part="group"]')).toHaveLength(
      0,
    );
    expect(element.tBodies[0]).toBe(body);
    // The kitchen's heading is line 501: the window over it draws a second body under it.
    await scroll(fixture, 499 * 40);
    expect(element.tBodies).toHaveLength(2);
    expect(element.tBodies[1].rows[0].dataset['pctPart']).toBe('group');
  });

  it('flashes a changed value in the row that holds it, wherever the window stands', async () => {
    const fixture = await render();
    await scroll(fixture, 4000);
    fixture.componentInstance.rows.update((rows) =>
      rows.map((row) => (row.id === 101 ? { ...row, value: 7 } : row)),
    );
    await settle(fixture);
    const flashed = table(fixture).querySelectorAll('[data-pct-changed]');
    expect(flashed).toHaveLength(1);
    expect((flashed[0].closest('tr') as HTMLElement).dataset['pctIndex']).toBe(
      '100',
    );
  });

  it('hands the focus to the frame when its row left with the window', async () => {
    const fixture = await render((host) => host.open.set([]));
    const button = table(fixture).querySelector<HTMLElement>(
      'tr[data-pct-index="3"] button',
    );
    // A table with no hidden column and no template has no disclosure: a row holds no control,
    // so one is made to hold the focus.
    const holder = document.createElement('button');
    (button ??
      table(fixture).querySelector('tr[data-pct-index="3"] td'))!.append(
      holder,
    );
    holder.focus();
    holder.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    await scroll(fixture, 8000);
    expect(document.activeElement).toBe(frameOf(fixture));
  });
});

describe('PctDataTable without a window', () => {
  it('writes no count and no row’s place', async () => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    });
    const fixture = TestBed.createComponent(PlainHost);
    fixture.detectChanges();
    await fixture.whenStable();
    const element = (fixture.nativeElement as HTMLElement).querySelector(
      'table',
    ) as HTMLTableElement;
    expect(element.hasAttribute('aria-rowcount')).toBe(false);
    expect(element.tHead?.rows[0].hasAttribute('aria-rowindex')).toBe(false);
    expect(element.tBodies[0].rows[0].hasAttribute('aria-rowindex')).toBe(
      false,
    );
    expect(element.tFoot?.rows[0].hasAttribute('aria-rowindex')).toBe(false);
    expect(element.classList).not.toContain('pct-data-table__window');
    expect(element.style.getPropertyValue('--_lead')).toBe('');
  });
});
