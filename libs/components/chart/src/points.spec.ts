import {
  Component,
  provideZonelessChangeDetection,
  signal,
} from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { PctPick } from './bars';
import { PctChart } from './chart';
import { PctChartTable } from './chart-table';
import { PctChartLegend } from './legend';
import type { PctWindow } from './model/window';
import { PctPoints } from './points';
import { PCT_SERIES_MARKERS } from './scene';

interface Row {
  readonly x: number;
  readonly y: number | null;
  readonly s?: number;
}

/** Six rows, out of order, one with no value: five points. */
const ROWS: readonly Row[] = [
  { x: 30, y: 3, s: 12 },
  { x: 10, y: 1, s: 4 },
  { x: 20, y: null, s: 8 },
  { x: 25, y: 2.5, s: 16 },
  { x: 20, y: 2, s: 8 },
  { x: 15, y: 1.5 },
];

@Component({
  imports: [PctChart, PctPoints, PctChartLegend, PctChartTable],
  template: `
    <pct-chart
      #chart
      ariaLabel="Power against temperature"
      x="linear"
      locale="en-US"
      [orientation]="orientation()"
      [(hiddenSeries)]="hidden"
      [(cursor)]="cursor"
    >
      <pct-points
        [data]="rows()"
        x="x"
        y="y"
        name="Power"
        unit="kW"
        [size]="sizeKey()"
        sizeName="Area"
        sizeUnit="m²"
        [hollow]="hollow()"
        (pick)="picked.set($event)"
      />
    </pct-chart>
    <pct-chart-legend [chart]="chart" />
    <pct-chart-table [chart]="chart" />
  `,
})
class Host {
  readonly rows = signal<readonly Row[]>(ROWS);
  readonly orientation = signal<'vertical' | 'horizontal'>('vertical');
  readonly hidden = signal<readonly string[]>([]);
  readonly cursor = signal<number | null>(null);
  readonly sizeKey = signal<'s' | undefined>(undefined);
  readonly hollow = signal(false);
  readonly picked = signal<PctPick<Row> | null>(null);
}

/** Two series of points and nothing else: every input at its default. */
@Component({
  imports: [PctChart, PctPoints],
  template: `
    <pct-chart
      ariaLabel="Two series of points"
      x="linear"
      locale="en-US"
      [(hiddenSeries)]="hidden"
      [window]="window()"
    >
      <pct-points
        [data]="first"
        x="x"
        y="y"
        name="First"
        (pick)="picks.set(picks() + 1)"
      />
      <pct-points
        [data]="second()"
        x="x"
        y="y"
        name="Second"
        id="two"
        [color]="color()"
        (pick)="picks.set(picks() + 1)"
      />
    </pct-chart>
  `,
})
class Bare {
  readonly first = ROWS;
  /** The first series' rows, a little to the right: close to its points, never on them. */
  readonly second = signal<readonly Row[]>(
    ROWS.map((r) => ({ ...r, x: r.x + 0.3 })),
  );
  readonly color = signal<number | string | undefined>(undefined);
  readonly hidden = signal<readonly string[]>([]);
  readonly window = signal<PctWindow | null>(null);
  readonly picks = signal(0);
}

async function renderBare(): Promise<ComponentFixture<Bare>> {
  TestBed.configureTestingModule({
    providers: [provideZonelessChangeDetection()],
  });
  const fixture = TestBed.createComponent(Bare);
  await settle(fixture);
  return fixture;
}

async function render(): Promise<ComponentFixture<Host>> {
  TestBed.configureTestingModule({
    providers: [provideZonelessChangeDetection()],
  });
  const fixture = TestBed.createComponent(Host);
  await settle(fixture);
  return fixture;
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  for (let i = 0; i < 4; i++) {
    fixture.detectChanges();
    await fixture.whenStable();
  }
}

let clock = 0;
function pointer(type: string, x: number, y: number): Event {
  const event = new MouseEvent(type, {
    bubbles: true,
    clientX: x,
    clientY: y,
    button: 0,
  });
  Object.assign(event, { pointerType: 'mouse', pointerId: 1, isPrimary: true });
  Object.defineProperty(event, 'timeStamp', { value: (clock += 1000) });
  return event;
}

const element = (fixture: ComponentFixture<unknown>) =>
  fixture.nativeElement as HTMLElement;
const query = (fixture: ComponentFixture<unknown>, selector: string) =>
  element(fixture).querySelector(selector);
const all = (fixture: ComponentFixture<unknown>, selector: string) => [
  ...element(fixture).querySelectorAll(selector),
];
const chartOf = (fixture: ComponentFixture<unknown>) =>
  fixture.debugElement.query((d) => d.name === 'pct-chart')
    .componentInstance as PctChart;
const group = (fixture: ComponentFixture<unknown>) =>
  query(fixture, '[data-pct-part="points"]');
const points = (fixture: ComponentFixture<unknown>) =>
  all(fixture, '[data-pct-part="point"]').map(
    (p) => p.getAttribute('transform') ?? '',
  );
/** Where a point stands in the layer, by the scene's scales. */
const place = (fixture: ComponentFixture<unknown>, x: number, y: number) => {
  const chart = chartOf(fixture);
  const along = chart.xScale()!.map(x);
  const across = chart.yScales().get('kW')!.map(y);
  return chart.orientation() === 'horizontal'
    ? { x: across, y: along }
    : { x: along, y: across };
};
const transform = (x: number, y: number, r: number) =>
  `translate(${x - r} ${y - r}) scale(${r / 6})`;
const overlay = (fixture: ComponentFixture<unknown>) =>
  query(fixture, '.overlay') as HTMLElement;
const headers = (fixture: ComponentFixture<unknown>) =>
  all(fixture, 'thead th').map((th) => th.textContent!.trim());
const noteRows = (fixture: ComponentFixture<unknown>) =>
  all(fixture, '[data-pct-part="tooltip"] .row.note').map((row) => ({
    name: row.querySelector('.name')!.textContent,
    value: row.querySelector('.value')!.textContent,
  }));

describe('PctPoints', () => {
  beforeEach(() => {
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(
      function (this: HTMLElement) {
        return this.tagName === 'PCT-CHART' ? 600 : 0;
      },
    );
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockImplementation(
      function (this: HTMLElement) {
        return this.tagName === 'PCT-CHART' ? 300 : 0;
      },
    );
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    // The table's frame watches its width; jsdom has no observer.
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
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('draws the series’ marker at every row with a value, the rows sorted by x, four pixels wide, in the series’ place', async () => {
    const fixture = await render();
    const drawn = points(fixture);
    expect(drawn).toHaveLength(5);
    expect(group(fixture)?.getAttribute('data-pct-series')).toBe('1');
    expect(group(fixture)?.classList.contains('bubbles')).toBe(false);
    const first = place(fixture, 10, 1);
    expect(drawn[0]).toBe(transform(first.x, first.y, 4));
    const last = place(fixture, 30, 3);
    expect(drawn[4]).toBe(transform(last.x, last.y, 4));
    // no size read: the table is the position and the series alone
    expect(headers(fixture)).toEqual(['Position', 'Power (kW)']);
    // the shape of place 1: the circle
    expect(query(fixture, '[data-pct-part="point"]')?.getAttribute('d')).toBe(
      'M6 1a5 5 0 1 1 0 10a5 5 0 1 1 0-10z',
    );
    // the axis spans the values; the reading is the point's value, and none between points
    const chart = chartOf(fixture);
    const [low, high] = chart.yScales().get('kW')!.domain;
    expect(low).toBeLessThanOrEqual(1);
    expect(high).toBeGreaterThanOrEqual(3);
    expect(chart.valueAt('Power', 20)).toBe(2);
    expect(chart.valueAt('Power', 17)).toBeNull();
    expect(chart.dataSpan()).toEqual({ from: 10, to: 30 });
    // the legend's swatch is the shape alone
    const swatch = query(fixture, 'pct-chart-legend [data-pct-part="swatch"]');
    expect(swatch?.querySelector('.shape')).not.toBeNull();
    expect(swatch?.querySelector('.dash')).toBeNull();
  });

  it('sizes bubbles by area, the largest sixteen pixels across, none under two, and gives the size a column in the table and a row in the tooltip', async () => {
    const fixture = await render();
    fixture.componentInstance.sizeKey.set('s');
    await settle(fixture);
    expect(group(fixture)?.classList.contains('bubbles')).toBe(true);
    const drawn = points(fixture);
    // sizes 4, none, 8, 16, 12 of a largest 16: radii 8, 2, 8√2, 16, 8√3
    const radii = [8, 2, 8 * Math.SQRT2, 16, 8 * Math.sqrt(3)];
    const at = [
      [10, 1],
      [15, 1.5],
      [20, 2],
      [25, 2.5],
      [30, 3],
    ];
    at.forEach(([x, y], i) => {
      const p = place(fixture, x, y);
      expect(drawn[i]).toBe(transform(p.x, p.y, radii[i]));
    });
    expect(headers(fixture)).toEqual(['Position', 'Power (kW)', 'Area']);
    const cells = all(fixture, 'tbody tr').map((tr) =>
      [...tr.querySelectorAll('td')].map((td) => td.textContent!.trim()),
    );
    expect(cells[0]).toEqual(['1', '4 m²']);
    expect(cells[1][1]).toBe('No reading');
    fixture.componentInstance.cursor.set(30);
    await settle(fixture);
    expect(noteRows(fixture)).toEqual([{ name: 'Area', value: '12 m²' }]);
    // the range reads the size too
    expect(
      query(fixture, 'input[data-pct-part="range"]')!.getAttribute(
        'aria-valuetext',
      ),
    ).toBe('30: Power 3 kW, Area 12 m²');
  });

  it('thins points closer than two pixels to one mark', async () => {
    const fixture = await render();
    fixture.componentInstance.rows.set([
      ...ROWS,
      ...Array.from({ length: 500 }, () => ({ x: 20, y: 2 })),
    ]);
    await settle(fixture);
    expect(points(fixture)).toHaveLength(5);
  });

  it('puts the cursor on the nearest point under a mouse, and in the pointer’s own column far from any', async () => {
    const fixture = await render();
    const layer = overlay(fixture);
    const near = place(fixture, 20, 2);
    layer.dispatchEvent(pointer('pointermove', near.x + 6, near.y - 9));
    await settle(fixture);
    expect(chartOf(fixture).cursor()).toBe(20);
    // no size read: the tooltip has no row of it
    expect(noteRows(fixture)).toEqual([]);
    // the point at 30 stands high; forty pixels under it nothing is within reach
    const far = place(fixture, 30, 3);
    layer.dispatchEvent(pointer('pointermove', far.x - 40, far.y + 40));
    await settle(fixture);
    const cursor = chartOf(fixture).cursor()!;
    expect(cursor).toBeCloseTo(
      chartOf(fixture)
        .xScale()!
        .invert(far.x - 40),
      6,
    );
    expect([10, 15, 20, 25, 30]).not.toContain(cursor);
  });

  it('picks a point on a press within its reach, and nothing a press beside it', async () => {
    const fixture = await render();
    const layer = overlay(fixture);
    const at = place(fixture, 25, 2.5);
    layer.dispatchEvent(pointer('pointerdown', at.x + 3, at.y - 4));
    layer.dispatchEvent(pointer('pointerup', at.x + 3, at.y - 4));
    await settle(fixture);
    expect(fixture.componentInstance.picked()).toEqual({
      series: 'Power',
      index: 3,
      row: ROWS[3],
      x: 25,
      y: 2.5,
    });
    fixture.componentInstance.picked.set(null);
    layer.dispatchEvent(pointer('pointerdown', at.x + 10, at.y));
    layer.dispatchEvent(pointer('pointerup', at.x + 10, at.y));
    await settle(fixture);
    expect(fixture.componentInstance.picked()).toBeNull();
  });

  it('draws hollow points as outlines, and nothing of a hidden series — no points, no size column', async () => {
    const fixture = await render();
    fixture.componentInstance.hollow.set(true);
    fixture.componentInstance.sizeKey.set('s');
    await settle(fixture);
    expect(group(fixture)?.classList.contains('hollow')).toBe(true);
    expect(
      query(
        fixture,
        'pct-chart-legend [data-pct-part="swatch"]',
      )?.classList.contains('hollow'),
    ).toBe(true);
    fixture.componentInstance.hidden.set(['Power']);
    await settle(fixture);
    expect(points(fixture)).toHaveLength(0);
    expect(group(fixture)).toBeNull();
    expect(headers(fixture)).not.toContain('Area');
    fixture.componentInstance.cursor.set(30);
    await settle(fixture);
    expect(noteRows(fixture)).toEqual([]);
  });

  it('turns with the chart: the value across, the position along', async () => {
    const fixture = await render();
    fixture.componentInstance.orientation.set('horizontal');
    await settle(fixture);
    const first = place(fixture, 10, 1);
    expect(points(fixture)[0]).toBe(transform(first.x, first.y, 4));
    expect(first.x).toBeGreaterThan(first.y);
  });

  it('two series: the defaults, the second place’s shape, a consumer’s colour, the id a series is hidden by', async () => {
    const fixture = await renderBare();
    const chart = chartOf(fixture);
    const groups = () => all(fixture, '[data-pct-part="points"]');
    const shapeOf = (g: Element) =>
      g.querySelector('[data-pct-part="point"]')?.getAttribute('d');
    expect(groups().map((g) => g.getAttribute('data-pct-series'))).toEqual([
      '1',
      '2',
    ]);
    expect(groups().map((g) => g.classList.contains('hollow'))).toEqual([
      false,
      false,
    ]);
    expect(groups().map((g) => g.classList.contains('bubbles'))).toEqual([
      false,
      false,
    ]);
    // no unit: the plain number's axis
    expect(chart.yScales().has('')).toBe(true);
    expect(chart.valueAt('First', 20)).toBe(2);
    expect(chart.valueAt('two', 20.3)).toBe(2);
    // each place its shape
    expect(shapeOf(groups()[0])).toBe(PCT_SERIES_MARKERS[0]);
    expect(shapeOf(groups()[1])).toBe(PCT_SERIES_MARKERS[1]);
    // hidden by id, where there is one, by name otherwise
    fixture.componentInstance.hidden.set(['two']);
    await settle(fixture);
    expect(groups()).toHaveLength(1);
    expect(groups()[0].getAttribute('data-pct-series')).toBe('1');
    fixture.componentInstance.hidden.set(['First']);
    await settle(fixture);
    expect(groups()).toHaveLength(1);
    expect(groups()[0].getAttribute('data-pct-series')).toBe('2');
    fixture.componentInstance.hidden.set([]);
    // a consumer's colour: the custom place, the first shape, the colour as a property
    fixture.componentInstance.color.set('tomato');
    await settle(fixture);
    const [first, second] = groups();
    expect(second.getAttribute('data-pct-series')).toBe('custom');
    expect(shapeOf(second)).toBe(PCT_SERIES_MARKERS[0]);
    expect(
      (second as HTMLElement).style.getPropertyValue('--_pct-chart-color'),
    ).toBe('tomato');
    expect(
      (first as HTMLElement).style.getPropertyValue('--_pct-chart-color'),
    ).toBe('');
  });

  it('two series: the nearer point takes the cursor, a press picks the one in reach alone, the window bounds the run, and a series with no points is asked and says nothing', async () => {
    const fixture = await renderBare();
    const chart = chartOf(fixture);
    const layer = overlay(fixture);
    const at = (x: number, y: number) => ({
      x: chart.xScale()!.map(x),
      y: chart.yScales().get('')!.map(y),
    });
    // the second series' point is a few pixels right of the first's, within reach: the first wins
    const near = at(10, 1);
    const gap = at(10.3, 1).x - near.x;
    expect(gap).toBeGreaterThan(4);
    expect(gap).toBeLessThan(16);
    layer.dispatchEvent(pointer('pointermove', near.x, near.y));
    await settle(fixture);
    expect(chart.cursor()).toBe(10);
    // a press there picks the first series' point, and the second's stands out of reach
    layer.dispatchEvent(pointer('pointerdown', near.x, near.y));
    layer.dispatchEvent(pointer('pointerup', near.x, near.y));
    await settle(fixture);
    expect(fixture.componentInstance.picks()).toBe(1);
    // the window bounds the run of points drawn: 10, 15 and 20 of the first, none past it
    fixture.componentInstance.window.set({ from: 10, to: 20 });
    await settle(fixture);
    expect(
      all(fixture, '[data-pct-part="points"]')[0].querySelectorAll(
        '[data-pct-part="point"]',
      ),
    ).toHaveLength(3);
    fixture.componentInstance.window.set(null);
    // a series with no points answers no nearest and picks nothing, and the other goes on
    fixture.componentInstance.second.set([]);
    await settle(fixture);
    layer.dispatchEvent(pointer('pointermove', near.x + 3, near.y - 3));
    await settle(fixture);
    expect(chart.cursor()).toBe(10);
    layer.dispatchEvent(pointer('pointerdown', near.x + 3, near.y - 3));
    layer.dispatchEvent(pointer('pointerup', near.x + 3, near.y - 3));
    await settle(fixture);
    expect(fixture.componentInstance.picks()).toBe(2);
  });

  it('draws nothing of a series on an axis it cannot stand on, and keeps the rest', async () => {
    const fixture = await render();
    fixture.componentInstance.rows.set([{ x: 1, y: 1 }]);
    await settle(fixture);
    expect(points(fixture)).toHaveLength(1);
    fixture.componentInstance.rows.set([]);
    await settle(fixture);
    expect(points(fixture)).toHaveLength(0);
    expect(chartOf(fixture).dataSpan()).toBeNull();
  });
});
