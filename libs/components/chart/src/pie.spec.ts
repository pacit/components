import {
  Component,
  provideZonelessChangeDetection,
  signal,
  type Type,
} from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PctChartTable } from './chart-table';
import { PctChartLegend } from './legend';
import { pctMeasureText } from './measure';
import { PctPie, type PctSlicePick } from './pie';

interface Room {
  readonly room: string;
  readonly kwh: number | null;
  readonly color?: number | string;
}

const ROOMS: readonly Room[] = [
  { room: 'Heating', kwh: 50 },
  { room: 'Cooling', kwh: 30 },
  { room: 'Fans', kwh: 20 },
];

@Component({
  imports: [PctPie, PctChartLegend, PctChartTable],
  template: `
    <pct-pie
      #pie
      [ariaLabel]="label()"
      [ariaLabelledby]="labelledby()"
      [description]="description()"
      [data]="rows()"
      value="kwh"
      name="room"
      [color]="colorOf()"
      unit="kWh"
      locale="en-US"
      [donut]="donut()"
      [startAngle]="startAngle()"
      [others]="others()"
      [labels]="labels()"
      [loading]="loading()"
      [(hiddenSeries)]="hidden"
      [(selected)]="selected"
      [(cursor)]="cursor"
      (pick)="picked.set($event)"
    />
    <pct-chart-legend [chart]="pie" [value]="legendValue()" />
    <pct-chart-table [chart]="pie" [summary]="summary()" />
  `,
})
class Host {
  readonly label = signal('Energy by use');
  readonly labelledby = signal('');
  readonly description = signal('');
  readonly rows = signal<readonly Room[]>(ROOMS);
  readonly colorOf = signal<'color' | undefined>(undefined);
  readonly donut = signal(0);
  readonly startAngle = signal(0);
  readonly others = signal(6);
  readonly labels = signal<'auto' | 'none'>('auto');
  readonly loading = signal(false);
  readonly hidden = signal<readonly string[]>([]);
  readonly selected = signal<string | null>(null);
  readonly cursor = signal<string | null>(null);
  readonly picked = signal<PctSlicePick<Room> | null>(null);
  readonly legendValue = signal<'none' | 'latest' | 'sum'>('none');
  readonly summary = signal<'none' | 'sum'>('none');
}

/** A pie as it comes, with nothing set but the data: what the defaults say. */
@Component({
  imports: [PctPie, PctChartTable],
  template: `
    <pct-pie #pie [data]="rows" value="kwh" name="room" />
    <pct-chart-table [chart]="pie" />
  `,
})
class Bare {
  readonly rows: readonly Room[] = [
    { room: 'Heating', kwh: 12.3456 },
    { room: 'Cooling', kwh: 30 },
  ];
}

function stubSize(): void {
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(
    function (this: HTMLElement) {
      return this.tagName === 'PCT-PIE' ? 400 : 0;
    },
  );
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockImplementation(
    function (this: HTMLElement) {
      return this.tagName === 'PCT-PIE' ? 300 : 0;
    },
  );
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe(): void {
        // nothing to watch
      }
      unobserve(): void {
        // nothing watched
      }
      disconnect(): void {
        // nothing to leave
      }
    },
  );
}

async function render(): Promise<ComponentFixture<Host>> {
  return renderAs(Host);
}

async function renderAs<H>(type: Type<H>): Promise<ComponentFixture<H>> {
  TestBed.configureTestingModule({
    providers: [provideZonelessChangeDetection()],
  });
  const fixture = TestBed.createComponent(type);
  await settle(fixture);
  return fixture;
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  for (let i = 0; i < 4; i++) {
    fixture.detectChanges();
    await fixture.whenStable();
  }
}

const element = (fixture: ComponentFixture<unknown>) =>
  fixture.nativeElement as HTMLElement;
const all = (fixture: ComponentFixture<unknown>, selector: string) => [
  ...element(fixture).querySelectorAll(selector),
];
const one = (fixture: ComponentFixture<unknown>, selector: string) =>
  element(fixture).querySelector(selector) as HTMLElement;
const pieOf = (fixture: ComponentFixture<unknown>) =>
  fixture.debugElement.query((d) => d.name === 'pct-pie')
    .componentInstance as PctPie<Room>;
const slices = (fixture: ComponentFixture<unknown>) =>
  all(fixture, '[data-pct-part="slice"]').map((p) => ({
    d: p.getAttribute('d'),
    place: p.getAttribute('data-pct-series'),
    color: (p as SVGElement).style.getPropertyValue('--_pct-chart-color'),
    hatch: (p as SVGElement).style.getPropertyValue('--_pct-pie-hatch'),
    selected: p.classList.contains('selected'),
  }));
const labels = (fixture: ComponentFixture<unknown>) =>
  all(fixture, 'text[data-pct-part="label"]').map((t) => ({
    text: t.textContent,
    x: t.getAttribute('x'),
    y: t.getAttribute('y'),
    anchor: t.getAttribute('text-anchor'),
  }));
const range = (fixture: ComponentFixture<unknown>) =>
  one(fixture, '[data-pct-part="range"]') as HTMLInputElement;
const key = (fixture: ComponentFixture<unknown>, name: string) => {
  const event = new KeyboardEvent('keydown', { key: name, cancelable: true });
  range(fixture).dispatchEvent(event);
  return event;
};

describe('pctMeasureText', () => {
  it('measures on one canvas of the document, in the font given', () => {
    const context = {
      font: '',
      measureText: (text: string) => ({ width: text.length * 7 }),
    };
    const createElement = vi.fn(() => ({ getContext: () => context }));
    const document = { createElement } as unknown as Document;
    expect(pctMeasureText(document, { family: 'serif', px: 10 }, 'abc')).toBe(
      21,
    );
    expect(context.font).toBe('10px serif');
    expect(pctMeasureText(document, { family: 'serif', px: 12 }, 'abcd')).toBe(
      28,
    );
    expect(context.font).toBe('12px serif');
    expect(createElement).toHaveBeenCalledTimes(1);
    expect(createElement).toHaveBeenCalledWith('canvas');
  });

  it('counts six tenths of the font per letter where the document has no canvas to draw on, asking once', () => {
    // the server's DOM has a canvas element whose context throws, a test's has none
    const createElement = vi.fn(() => ({
      getContext: () => {
        throw new Error('NotYetImplemented');
      },
    }));
    const server = { createElement } as unknown as Document;
    expect(pctMeasureText(server, { family: 'serif', px: 10 }, 'abc')).toBe(18);
    expect(pctMeasureText(server, { family: 'serif', px: 20 }, 'ab')).toBe(24);
    expect(createElement).toHaveBeenCalledTimes(1);
    const bare = {
      createElement: () => ({ getContext: () => null }),
    } as unknown as Document;
    expect(pctMeasureText(bare, { family: 'serif', px: 10 }, 'abc')).toBe(18);
  });
});

describe('PctPie', () => {
  beforeEach(() => {
    stubSize();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('draws a slice per row with its share of the turn from twelve, painted by its place, its name and share beside it on a leader', async () => {
    const fixture = await render();
    // the circle leaves room for the widest label ("Heating 50%", 85.8 px) and the leader on
    // each side, and half a line above and below, and the shift of a selected slice
    expect(slices(fixture)).toEqual([
      {
        d: 'M 200 150 L 200 61.8 A 88.2 88.2 0 0 1 200 238.2 Z',
        place: '1',
        color: '',
        hatch: expect.stringMatching(/^url\(#pct-pie-hatch-\d+-1\)$/),
        selected: false,
      },
      {
        d: 'M 200 150 L 200 238.2 A 88.2 88.2 0 0 1 116.12 122.74 Z',
        place: '2',
        color: '',
        hatch: expect.stringMatching(/-2\)$/),
        selected: false,
      },
      {
        d: 'M 200 150 L 116.12 122.74 A 88.2 88.2 0 0 1 200 61.8 Z',
        place: '3',
        color: '',
        hatch: expect.stringMatching(/-3\)$/),
        selected: false,
      },
    ]);
    expect(labels(fixture)).toEqual([
      { text: 'Heating 50%', x: '306.2', y: '150', anchor: 'start' },
      { text: 'Cooling 30%', x: '112.94', y: '208.9', anchor: 'end' },
      { text: 'Fans 20%', x: '135.1', y: '68.94', anchor: 'end' },
    ]);
    expect(
      all(fixture, '[data-pct-part="leader"]').map((l) =>
        l.getAttribute('points'),
      ),
    ).toEqual([
      '288.2,150 300.2,150 306.2,150',
      '128.64,201.84 118.94,208.9 112.94,208.9',
      '148.16,78.64 141.1,68.94 135.1,68.94',
    ]);
    // eight hatches in the defs, one per place
    expect(all(fixture, 'pattern')).toHaveLength(8);
    expect(all(fixture, 'pattern')[0].id).toMatch(/^pct-pie-hatch-\d+-1$/);
    expect(
      all(fixture, 'pattern path').map((path) => path.getAttribute('d')),
    ).toEqual([
      'M0 8L8 0M-2 2L2-2M6 10L10 6',
      'M0 0L8 8M-2 6L2 10M6-2L10 2',
      'M0 4H8',
      'M4 0V8',
      'M0 0L8 8M8 0L0 8',
      'M0 4H8M4 0V8',
      'M3.5 4H4.5',
      'M0 2H8M0 6H8',
    ]);
    // the picture is named, and described by the shares when the consumer says nothing
    const picture = one(fixture, '[data-pct-part="plot"]');
    expect(picture.getAttribute('role')).toBe('img');
    expect(picture.getAttribute('aria-label')).toBe('Energy by use');
    expect(picture.getAttribute('aria-describedby')).toMatch(
      /^pct-pie-description-\d+$/,
    );
    expect(range(fixture).getAttribute('aria-describedby')).toMatch(
      /^pct-pie-keys-\d+$/,
    );
    const description = element(fixture).querySelector(
      `#${picture.getAttribute('aria-describedby')}`,
    );
    expect(description?.textContent).toBe('Heating 50%, Cooling 30%, Fans 20%');
    expect(one(fixture, 'pct-pie').getAttribute('aria-busy')).toBeNull();
  });

  it("takes the consumer's description, and leaves the labels to the legend when asked, with a wider circle", async () => {
    const fixture = await render();
    fixture.componentInstance.description.set('Half of it is heating.');
    fixture.componentInstance.labels.set('none');
    await settle(fixture);
    const picture = one(fixture, '[data-pct-part="plot"]');
    expect(
      element(fixture).querySelector(
        `#${picture.getAttribute('aria-describedby')}`,
      )?.textContent,
    ).toBe('Half of it is heating.');
    fixture.componentInstance.description.set('   ');
    await settle(fixture);
    expect(
      element(fixture).querySelector(
        `#${one(fixture, '[data-pct-part="plot"]').getAttribute('aria-describedby')}`,
      )?.textContent,
    ).toBe('Heating 50%, Cooling 30%, Fans 20%');
    expect(labels(fixture)).toEqual([]);
    expect(all(fixture, '[data-pct-part="leader"]')).toEqual([]);
    expect(slices(fixture)[0].d).toBe(
      'M 200 150 L 200 8 A 142 142 0 0 1 200 292 Z',
    );
  });

  it('starts where startAngle says, and a donut leaves a hole of the share asked, held at nine tenths', async () => {
    const fixture = await render();
    fixture.componentInstance.startAngle.set(90);
    fixture.componentInstance.donut.set(0.5);
    await settle(fixture);
    expect(slices(fixture)[0].d).toBe(
      'M 288.2 150 A 88.2 88.2 0 0 1 111.8 150 L 155.9 150 A 44.1 44.1 0 0 0 244.1 150 Z',
    );
    fixture.componentInstance.donut.set(2);
    await settle(fixture);
    expect(slices(fixture)[0].d).toContain('A 79.38 79.38 0 0 0');
    fixture.componentInstance.donut.set(-1);
    await settle(fixture);
    // held at nothing: a slice from the centre again
    expect(slices(fixture)[0].d).toMatch(/^M 200 150 L /);
  });

  it('folds the smallest values past `others` into one slice of the rest, and never a single one', async () => {
    const fixture = await render();
    fixture.componentInstance.rows.set([
      { room: 'A', kwh: 40 },
      { room: 'B', kwh: 2 },
      { room: 'C', kwh: 30 },
      { room: 'D', kwh: 3 },
      { room: 'E', kwh: 25 },
    ]);
    fixture.componentInstance.others.set(3);
    await settle(fixture);
    const pie = pieOf(fixture);
    expect(pie.series().map((s) => s.name)).toEqual(['A', 'C', 'E', 'Others']);
    expect(pie.valueAt('pct-others')).toBe(5);
    expect(pie.shareOf('pct-others')).toBe(0.05);
    expect(labels(fixture).map((l) => l.text)).toContain('Others 5%');
    // the rest picked is a slice with no row of its own, and no index
    all(fixture, '[data-pct-part="slice"]')[3].dispatchEvent(
      new MouseEvent('click'),
    );
    await settle(fixture);
    expect(fixture.componentInstance.picked()).toEqual({
      series: 'pct-others',
      index: -1,
      row: null,
      value: 5,
      share: 0.05,
    });
    expect(pie.valueAt('nowhere')).toBeNull();
    expect(pie.shareOf('nowhere')).toBeNull();
    expect(pie.summaryOf('nowhere', 'latest')).toBe('No reading');
    fixture.componentInstance.others.set(4);
    await settle(fixture);
    expect(pie.series().map((s) => s.name)).toEqual(['A', 'B', 'C', 'D', 'E']);
    fixture.componentInstance.others.set(Infinity);
    await settle(fixture);
    expect(pie.series()).toHaveLength(5);
  });

  it('hides a slice through the legend and shares the turn among the rest, the legend writing value and share', async () => {
    const fixture = await render();
    fixture.componentInstance.legendValue.set('latest');
    await settle(fixture);
    const toggles = all(fixture, '[data-pct-part="toggle"]');
    expect(toggles.map((t) => t.textContent?.trim())).toEqual([
      'Heating',
      'Cooling',
      'Fans',
    ]);
    expect(
      all(fixture, 'pct-chart-legend .value').map((v) => v.textContent),
    ).toEqual(['50 kWh (50%)', '30 kWh (30%)', '20 kWh (20%)']);
    // every swatch is the pie's block, painted by the place
    expect(
      all(fixture, 'pct-chart-legend [data-pct-part="swatch"]').map((s) =>
        s.getAttribute('data-pct-series'),
      ),
    ).toEqual(['1', '2', '3']);
    (toggles[0] as HTMLButtonElement).click();
    await settle(fixture);
    expect(fixture.componentInstance.hidden()).toEqual(['Heating']);
    expect(slices(fixture).map((s) => s.place)).toEqual(['2', '3']);
    expect(pieOf(fixture).shareOf('Cooling')).toBe(0.6);
    expect(pieOf(fixture).shareOf('Heating')).toBeNull();
    fixture.componentInstance.legendValue.set('sum');
    await settle(fixture);
    expect(
      all(fixture, 'pct-chart-legend .value').map((v) => v.textContent),
    ).toEqual(['30 kWh (60%)', '20 kWh (40%)']);
  });

  it('moves the cursor with the keys over the range, reads the slice, selects it with Enter and picks it', async () => {
    const fixture = await render();
    const input = range(fixture);
    expect(input.min).toBe('0');
    expect(input.max).toBe('2');
    expect(input.step).toBe('1');
    expect(input.getAttribute('aria-label')).toBe('Energy by use');
    expect(input.getAttribute('aria-valuetext')).toBe('No reading selected');
    expect(pieOf(fixture)['range']()).toEqual({ max: 2, value: 0 });
    expect(
      element(fixture).querySelector(
        `#${input.getAttribute('aria-describedby')}`,
      )?.textContent,
    ).toMatch(/^Arrow keys move from slice to slice/);
    expect(key(fixture, 'ArrowRight').defaultPrevented).toBe(true);
    await settle(fixture);
    expect(fixture.componentInstance.cursor()).toBe('Heating');
    expect(input.getAttribute('aria-valuetext')).toBe('Heating: 50 kWh, 50%');
    expect(input.value).toBe('0');
    key(fixture, 'ArrowDown');
    key(fixture, 'ArrowDown');
    key(fixture, 'ArrowDown');
    await settle(fixture);
    expect(fixture.componentInstance.cursor()).toBe('Fans');
    expect(input.value).toBe('2');
    key(fixture, 'ArrowLeft');
    await settle(fixture);
    expect(fixture.componentInstance.cursor()).toBe('Cooling');
    key(fixture, 'Home');
    await settle(fixture);
    expect(fixture.componentInstance.cursor()).toBe('Heating');
    // left of the first is the first; Enter on it selects it, and once more unselects
    key(fixture, 'ArrowLeft');
    await settle(fixture);
    expect(fixture.componentInstance.cursor()).toBe('Heating');
    key(fixture, 'Enter');
    await settle(fixture);
    expect(fixture.componentInstance.selected()).toBe('Heating');
    expect(fixture.componentInstance.picked()?.index).toBe(0);
    key(fixture, 'Enter');
    await settle(fixture);
    expect(fixture.componentInstance.selected()).toBeNull();
    key(fixture, 'End');
    await settle(fixture);
    expect(fixture.componentInstance.cursor()).toBe('Fans');
    // Enter selects the slice under the cursor and picks it; the next Enter unselects
    expect(key(fixture, 'Enter').defaultPrevented).toBe(true);
    await settle(fixture);
    expect(fixture.componentInstance.selected()).toBe('Fans');
    expect(fixture.componentInstance.picked()).toEqual({
      series: 'Fans',
      index: 2,
      row: ROOMS[2],
      value: 20,
      share: 0.2,
    });
    expect(slices(fixture)[2].selected).toBe(true);
    // the selected slice stands eight pixels out along its bisector
    expect(slices(fixture)[2].d).toBe(
      'M 195.3 143.53 L 111.41 116.27 A 88.2 88.2 0 0 1 195.3 55.33 Z',
    );
    key(fixture, ' ');
    await settle(fixture);
    expect(fixture.componentInstance.selected()).toBeNull();
    // Escape clears the cursor; an unknown key is left to the page; up from nothing is the last
    expect(key(fixture, 'Escape').defaultPrevented).toBe(true);
    await settle(fixture);
    expect(fixture.componentInstance.cursor()).toBeNull();
    expect(key(fixture, 'a').defaultPrevented).toBe(false);
    expect(key(fixture, 'Enter').defaultPrevented).toBe(true);
    expect(fixture.componentInstance.picked()?.series).toBe('Fans');
    key(fixture, 'ArrowUp');
    await settle(fixture);
    expect(fixture.componentInstance.cursor()).toBe('Fans');
    // the range dragged lands on the slice of its value
    const live = range(fixture);
    live.value = '1';
    live.dispatchEvent(new Event('input'));
    await settle(fixture);
    expect(fixture.componentInstance.cursor()).toBe('Cooling');
    // a value past the slices (the platform clamps it; a direct call does not) moves nothing
    pieOf(fixture)['onInput']({ target: { value: '9' } } as unknown as Event);
    await settle(fixture);
    expect(fixture.componentInstance.cursor()).toBe('Cooling');
  });

  it('reads the slice under the pointer in a tooltip with its value and share, and picks it on a press', async () => {
    const tip = { width: 0, height: 0 };
    vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockImplementation(
      function (this: HTMLElement) {
        return this.classList.contains('tooltip') ? tip.width : 0;
      },
    );
    vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(
      function (this: HTMLElement) {
        return this.classList.contains('tooltip') ? tip.height : 0;
      },
    );
    const fixture = await render();
    const [first, second] = all(fixture, '[data-pct-part="slice"]');
    expect(one(fixture, '[data-pct-part="tooltip"]')).toBeNull();
    second.dispatchEvent(new Event('pointerenter'));
    await settle(fixture);
    expect(fixture.componentInstance.cursor()).toBe('Cooling');
    const tooltip = one(fixture, '[data-pct-part="tooltip"]');
    expect(tooltip.querySelector('.time')?.textContent).toBe('Cooling');
    expect(
      [...tooltip.querySelectorAll('.row')].map((r) => [
        r.querySelector('.name')?.textContent,
        r.querySelector('.value')?.textContent,
      ]),
    ).toEqual([
      ['Cooling', '30 kWh'],
      ['Share', '30%'],
    ]);
    expect(
      tooltip
        .querySelector('[data-pct-part="swatch"]')
        ?.getAttribute('data-pct-series'),
    ).toBe('2');
    const reading = pieOf(fixture).reading();
    expect(reading?.x).toBe(1);
    expect(reading?.rows[0]).toMatchObject({
      id: 'Cooling',
      unit: 'kWh',
      place: 2,
      color: null,
      value: 30,
      at: null,
      text: '30 kWh',
    });
    // the tooltip stands at seven tenths of the radius along the slice's bisector until it is
    // measured, then centred on that point, and held inside the box by its size
    const placed = () => {
      const box = one(fixture, '[data-pct-part="tooltip"]');
      const match = /translate\(([-\d.]+)px, ([-\d.]+)px\)/.exec(
        box.style.transform,
      );
      return {
        x: Number(match?.[1]),
        y: Number(match?.[2]),
        measured: !box.classList.contains('unmeasured'),
      };
    };
    const hover = async (
      slice: Element,
      width: number,
      height: number,
    ): Promise<void> => {
      slice.dispatchEvent(new Event('pointerleave'));
      await settle(fixture);
      tip.width = width;
      tip.height = height;
      slice.dispatchEvent(new Event('pointerenter'));
      await settle(fixture);
    };
    expect(placed()).toEqual({
      x: expect.closeTo(150.05, 2),
      y: expect.closeTo(186.29, 2),
      measured: false,
    });
    await hover(second, 100, 0);
    expect(placed()).toEqual({
      x: expect.closeTo(100.05, 2),
      y: expect.closeTo(186.29, 2),
      measured: true,
    });
    await hover(second, 0, 40);
    expect(placed()).toEqual({
      x: expect.closeTo(150.05, 2),
      y: expect.closeTo(166.29, 2),
      measured: false,
    });
    await hover(second, 100, 40);
    expect(placed()).toEqual({
      x: expect.closeTo(100.05, 2),
      y: expect.closeTo(166.29, 2),
      measured: true,
    });
    await hover(first, 300, 40);
    expect(placed()).toEqual({ x: 100, y: 130, measured: true });
    await hover(second, 300, 240);
    expect(placed()).toEqual({
      x: expect.closeTo(0.05, 2),
      y: 60,
      measured: true,
    });
    (first as SVGElement).dispatchEvent(new MouseEvent('click'));
    await settle(fixture);
    expect(fixture.componentInstance.selected()).toBe('Heating');
    expect(fixture.componentInstance.picked()?.index).toBe(0);
    second.dispatchEvent(new Event('pointerleave'));
    await settle(fixture);
    expect(fixture.componentInstance.cursor()).toBeNull();
    expect(one(fixture, '[data-pct-part="tooltip"]')).toBeNull();
  });

  it('stands beside its table: a row per slice with value and share, a foot with the total when asked, and the same as CSV', async () => {
    const fixture = await render();
    const heads = all(fixture, 'thead th').map((th) =>
      th.textContent?.replace(/\s+/g, ' ').trim(),
    );
    expect(heads).toEqual(['Series', 'Value (kWh)', 'Share']);
    expect(
      all(fixture, 'tbody tr').map((tr) =>
        [...tr.children].map((c) => c.textContent?.trim()),
      ),
    ).toEqual([
      ['Heating', '50 kWh', '50%'],
      ['Cooling', '30 kWh', '30%'],
      ['Fans', '20 kWh', '20%'],
    ]);
    expect(one(fixture, 'tfoot')).toBeNull();
    expect(one(fixture, 'caption').textContent?.trim()).toBe('Energy by use');
    fixture.componentInstance.summary.set('sum');
    fixture.componentInstance.hidden.set(['Fans']);
    await settle(fixture);
    expect(
      [...one(fixture, 'tfoot tr').children].map((c) => c.textContent?.trim()),
    ).toEqual(['Sum', '80 kWh', '']);
    const table = fixture.debugElement.query(
      (d) => d.name === 'pct-chart-table',
    ).componentInstance as PctChartTable;
    expect(table.csv()).toBe(
      'Series,Value (kWh),Share\r\nHeating,50,62.5\r\nCooling,30,37.5',
    );
  });

  it('draws no slice for a value that is not positive, lists it in the table as it is, and says when nothing is drawn or all is hidden', async () => {
    const error = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    const fixture = await render();
    fixture.componentInstance.summary.set('sum');
    fixture.componentInstance.rows.set([
      { room: 'Heating', kwh: 50 },
      { room: 'Idle', kwh: 0 },
      { room: 'Export', kwh: -5 },
      { room: 'Unread', kwh: null },
      { room: 'Broken', kwh: NaN },
    ]);
    await settle(fixture);
    expect(slices(fixture)).toHaveLength(1);
    expect(pieOf(fixture).shareOf('Heating')).toBe(1);
    const rows = () =>
      all(fixture, 'tbody tr').map((tr) =>
        [...tr.children].map((c) => c.textContent?.trim()),
      );
    expect(rows()).toEqual([
      ['Heating', '50 kWh', '100%'],
      ['Idle', '0 kWh', 'No reading'],
      ['Export', '-5 kWh', 'No reading'],
      ['Unread', 'No reading', 'No reading'],
      ['Broken', 'No reading', 'No reading'],
    ]);
    // the foot sums what is drawn, and the CSV leaves a share there is none of empty
    expect(
      [...one(fixture, 'tfoot tr').children].map((c) => c.textContent?.trim()),
    ).toEqual(['Sum', '50 kWh', '']);
    const table = fixture.debugElement.query(
      (d) => d.name === 'pct-chart-table',
    ).componentInstance as PctChartTable;
    expect(table.csv()).toBe(
      'Series,Value (kWh),Share\r\nHeating,50,100\r\nIdle,0,\r\nExport,-5,\r\nUnread,,\r\nBroken,,',
    );
    expect(one(fixture, '[data-pct-part="message"]')).toBeNull();
    const message = () =>
      one(fixture, '[data-pct-part="message"]').textContent?.trim();
    fixture.componentInstance.rows.set([{ room: 'Unread', kwh: null }]);
    await settle(fixture);
    expect(message()).toBe('No data to show');
    expect(one(fixture, '[data-pct-part="range"]')).toBeNull();
    // the keys have no slice to move to
    expect(() =>
      pieOf(fixture)['onKey'](
        new KeyboardEvent('keydown', { key: 'ArrowRight' }),
      ),
    ).not.toThrow();
    expect(fixture.componentInstance.cursor()).toBeNull();
    fixture.componentInstance.rows.set([]);
    await settle(fixture);
    expect(message()).toBe('No data to show');
    // nothing drawn, yet not every series hidden: one has no value
    fixture.componentInstance.rows.set([
      { room: 'Heating', kwh: 50 },
      { room: 'Idle', kwh: 0 },
    ]);
    fixture.componentInstance.hidden.set(['Heating']);
    await settle(fixture);
    expect(message()).toBe('No data to show');
    fixture.componentInstance.rows.set(ROOMS);
    fixture.componentInstance.hidden.set(['Heating', 'Cooling', 'Fans']);
    await settle(fixture);
    expect(message()).toBe('Every series is hidden');
    expect(error).not.toHaveBeenCalled();
  });

  it("paints a slice in a colour of the consumer's own, with no hatch, and keeps a place a slice had", async () => {
    const fixture = await render();
    fixture.componentInstance.colorOf.set('color');
    fixture.componentInstance.rows.set([
      { room: 'Heating', kwh: 50, color: 'tomato' },
      { room: 'Cooling', kwh: 30 },
      { room: 'Fans', kwh: 20, color: 2 },
    ]);
    await settle(fixture);
    expect(slices(fixture).map((s) => [s.place, s.color, s.hatch])).toEqual([
      // the consumer's colour takes a place too (0102), so the next free one is the third
      ['custom', 'tomato', ''],
      ['3', '', expect.stringMatching(/-3\)$/)],
      ['2', '', expect.stringMatching(/-2\)$/)],
    ]);
    expect(
      all(fixture, 'pct-chart-legend [data-pct-part="swatch"]')[0].getAttribute(
        'style',
      ),
    ).toContain('tomato');
    fixture.componentInstance.rows.set([
      { room: 'Cooling', kwh: 30 },
      { room: 'Fans', kwh: 20, color: 2 },
      { room: 'Pumps', kwh: 10 },
    ]);
    await settle(fixture);
    expect(slices(fixture).map((s) => s.place)).toEqual(['3', '2', '1']);
  });

  it('draws a skeleton while loading, busy, and warns in development when unnamed or two slices share an id', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const fixture = await render();
    expect(warn).not.toHaveBeenCalled();
    fixture.componentInstance.loading.set(true);
    await settle(fixture);
    expect(one(fixture, 'pct-skeleton')).not.toBeNull();
    expect(one(fixture, '[data-pct-part="data"]')).toBeNull();
    expect(one(fixture, '[data-pct-part="range"]')).toBeNull();
    expect(one(fixture, 'pct-pie').getAttribute('aria-busy')).toBe('true');
    fixture.componentInstance.loading.set(false);
    fixture.componentInstance.label.set('');
    await settle(fixture);
    const messages = () => warn.mock.calls.map(([m]) => String(m));
    expect(messages()).toContain(
      '[pct-pie] A pie with neither `ariaLabel` nor `ariaLabelledby`. The picture is ' +
        'announced by its name, so a reader meets an image with none.',
    );
    expect(messages().some((m) => m.includes('share the id'))).toBe(false);
    // a blank name is none; a name that stands elsewhere is one
    warn.mockClear();
    fixture.componentInstance.label.set('  ');
    fixture.componentInstance.labelledby.set('   ');
    await settle(fixture);
    expect(messages()).toContainEqual(
      expect.stringMatching(/^\[pct-pie\] A pie with neither/),
    );
    warn.mockClear();
    fixture.componentInstance.labelledby.set('title');
    await settle(fixture);
    expect(messages()).toEqual([]);
    fixture.componentInstance.rows.set([
      { room: 'Heating', kwh: 50 },
      { room: 'Heating', kwh: 30 },
      { room: 'Fans', kwh: 20 },
      { room: 'Fans', kwh: 1 },
    ]);
    await settle(fixture);
    expect(messages()).toContain(
      '[pct-pie] Two slices share the id "Heating", "Fans". A slice is told apart by its ' +
        '`id` (its `name` when unset): give each its own.',
    );
  });

  it('reads how far a selected slice stands out from the stylesheet', async () => {
    const style = window.getComputedStyle(document.body);
    vi.spyOn(window, 'getComputedStyle').mockImplementation((el) =>
      el.tagName === 'PCT-PIE'
        ? ({
            ...style,
            fontSize: '13px',
            fontFamily: 'sans-serif',
            getPropertyValue: (name: string) =>
              name === '--pct-chart-pie-size-selected' ? '20px' : '',
          } as unknown as CSSStyleDeclaration)
        : style,
    );
    const fixture = await render();
    fixture.componentInstance.labels.set('none');
    fixture.componentInstance.selected.set('Heating');
    await settle(fixture);
    // the radius leaves twenty pixels for the shift, and the selected slice moves by them
    expect(slices(fixture)[0].d).toBe(
      'M 220 150 L 220 20 A 130 130 0 0 1 220 280 Z',
    );
  });

  it('leaves half a line above and below the labels when the box is low', async () => {
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockImplementation(
      function (this: HTMLElement) {
        return this.tagName === 'PCT-PIE' ? 200 : 0;
      },
    );
    const fixture = await render();
    // the height binds: 100 less half a line of 19, less the shift of a selected slice
    expect(slices(fixture)[0].d).toBe(
      'M 200 100 L 200 17.5 A 82.5 82.5 0 0 1 200 182.5 Z',
    );
  });

  it("lays the labels in the stylesheet's font, and lets a selected slice stand still when the token says nought", async () => {
    const style = window.getComputedStyle(document.body);
    vi.spyOn(window, 'getComputedStyle').mockImplementation((el) =>
      el.tagName === 'PCT-PIE'
        ? ({
            ...style,
            fontSize: '20px',
            fontFamily: 'sans-serif',
            getPropertyValue: (name: string) =>
              name === '--pct-chart-pie-size-selected' ? '0px' : '',
          } as unknown as CSSStyleDeclaration)
        : style,
    );
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockImplementation(
      function (this: HTMLElement) {
        return this.tagName === 'PCT-PIE' ? 200 : 0;
      },
    );
    const fixture = await render();
    // the widest label is 132 wide at twenty pixels, the leader 18: the width binds at 50
    expect(slices(fixture)[0].d).toBe(
      'M 200 100 L 200 50 A 50 50 0 0 1 200 150 Z',
    );
    expect(labels(fixture)[0]).toEqual({
      text: 'Heating 50%',
      x: '268',
      y: '100',
      anchor: 'start',
    });
  });

  it('draws a skeleton until the box has a width and a height, follows the box as it is resized, and lets go on destroy', async () => {
    // one observer per element watched — the table's frame watches too — and none on destroy
    type Watch = (
      entries: { contentRect: { width: number; height: number } }[],
    ) => void;
    const watchers = new Map<string, Watch>();
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(private readonly callback: Watch) {}
        observe(el: Element): void {
          watchers.set(el.tagName, this.callback);
        }
        unobserve(): void {
          // nothing watched
        }
        disconnect(): void {
          for (const [tag, watch] of watchers)
            if (watch === this.callback) watchers.delete(tag);
        }
      },
    );
    const fonts = { addEventListener: vi.fn(), removeEventListener: vi.fn() };
    Object.defineProperty(document, 'fonts', {
      value: fonts,
      configurable: true,
    });
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(0);
    const fixture = await render();
    expect(one(fixture, 'pct-skeleton')).not.toBeNull();
    expect(one(fixture, '[data-pct-part="data"]')).toBeNull();
    expect(one(fixture, '[data-pct-part="range"]')).toBeNull();
    expect(watchers.has('PCT-PIE')).toBe(true);
    expect(fonts.addEventListener).toHaveBeenCalledWith(
      'loadingdone',
      expect.any(Function),
    );
    const resize = async (width: number, height: number): Promise<void> => {
      watchers.get('PCT-PIE')?.([{ contentRect: { width, height } }]);
      await settle(fixture);
    };
    await resize(400, 0);
    expect(one(fixture, 'pct-skeleton')).not.toBeNull();
    await resize(0, 300);
    expect(one(fixture, 'pct-skeleton')).not.toBeNull();
    await resize(400, 300);
    expect(one(fixture, 'pct-skeleton')).toBeNull();
    expect(slices(fixture)[0].d).toBe(
      'M 200 150 L 200 61.8 A 88.2 88.2 0 0 1 200 238.2 Z',
    );
    // the width alone, the height alone, and fractions of a pixel rounded away
    await resize(500, 300);
    expect(slices(fixture)[0].d).toMatch(/^M 250 150 L /);
    await resize(500, 320);
    expect(slices(fixture)[0].d).toMatch(/^M 250 160 L /);
    await resize(500.4, 319.6);
    expect(slices(fixture)[0].d).toMatch(/^M 250 160 L /);
    fixture.destroy();
    expect(watchers.has('PCT-PIE')).toBe(false);
    expect(fonts.removeEventListener).toHaveBeenCalledWith(
      'loadingdone',
      fonts.addEventListener.mock.calls[0][1],
    );
    Reflect.deleteProperty(document, 'fonts');
  });

  it("comes with no unit, the application's locale, labels, the shares as its description and no foot, and warns when unnamed", async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const fixture = await renderAs(Bare);
    const pie = fixture.debugElement.query((d) => d.name === 'pct-pie')
      .componentInstance as PctPie<Room>;
    expect(pie.effectiveLocale()).toBe('en-US');
    expect(pie.writeValue(12.3456)).toBe('12.346');
    expect(slices(fixture)).toHaveLength(2);
    expect(labels(fixture).map((l) => l.text)).toEqual([
      'Heating 29%',
      'Cooling 71%',
    ]);
    const picture = one(fixture, '[data-pct-part="plot"]');
    expect(picture.getAttribute('aria-label')).toBeNull();
    expect(
      element(fixture).querySelector(
        `#${picture.getAttribute('aria-describedby')}`,
      )?.textContent,
    ).toBe('Heating 29%, Cooling 71%');
    expect(one(fixture, 'pct-skeleton')).toBeNull();
    expect(
      all(fixture, 'thead th').map((th) =>
        th.textContent?.replace(/\s+/g, ' ').trim(),
      ),
    ).toEqual(['Series', 'Value', 'Share']);
    expect(
      all(fixture, 'tbody tr').map((tr) =>
        [...tr.children].map((c) => c.textContent?.trim()),
      ),
    ).toEqual([
      ['Heating', '12.346', '29%'],
      ['Cooling', '30', '71%'],
    ]);
    expect(one(fixture, 'tfoot')).toBeNull();
    expect(warn.mock.calls.map(([m]) => String(m))).toContain(
      '[pct-pie] A pie with neither `ariaLabel` nor `ariaLabelledby`. The picture is ' +
        'announced by its name, so a reader meets an image with none.',
    );
  });

  it('exports the pie as a standalone SVG, named and described, and rejects a PNG with no canvas', async () => {
    const fixture = await render();
    const pie = pieOf(fixture);
    const root = new DOMParser().parseFromString(
      pie.svg(),
      'image/svg+xml',
    ).documentElement;
    expect(root.getAttribute('width')).toBe('400');
    expect(root.getAttribute('height')).toBe('300');
    expect(root.querySelector('title')?.textContent).toBe('Energy by use');
    const described = one(fixture, '[role="img"]').getAttribute(
      'aria-describedby',
    )!;
    expect(root.querySelector('desc')?.textContent).toBe(
      one(fixture, `#${described}`).textContent,
    );
    expect(root.querySelectorAll('[data-pct-part="slice"]')).toHaveLength(3);
    expect(root.querySelector('[class]')).toBeNull();
    await expect(pie.png()).rejects.toThrow(
      'pct-chart: no canvas to draw the PNG on',
    );
  });

  it('exports nothing while it loads, and rejects a PNG then', async () => {
    const fixture = await render();
    fixture.componentInstance.loading.set(true);
    await settle(fixture);
    const pie = pieOf(fixture);
    expect(pie.svg()).toBe('');
    await expect(pie.png()).rejects.toThrow('pct-pie: nothing drawn to export');
  });
});
