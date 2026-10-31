import {
  Component,
  provideZonelessChangeDetection,
  signal,
} from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PctBox } from './box';
import { PctChart } from './chart';
import { PctChartTable } from './chart-table';
import { PctChartLegend } from './legend';

interface Batch {
  readonly at: number;
  readonly values: readonly number[] | null;
}

/** Quartiles 2, 3, 4 at 0; 100 past the whisker. Nothing at 10. A flat box at 20. */
const BATCHES: readonly Batch[] = [
  { at: 0, values: [100, 1, 3, 2, 4] },
  { at: 10, values: null },
  { at: 20, values: [7, 7, 7] },
  { at: 30, values: [8, 2, 3, 4, -1, 7, -2, 2, 4] },
];

@Component({
  imports: [PctChart, PctBox, PctChartLegend, PctChartTable],
  template: `
    <pct-chart
      #chart
      ariaLabel="Latency"
      x="linear"
      locale="en-US"
      [orientation]="orientation()"
      [(hiddenSeries)]="hidden"
      [(cursor)]="cursor"
    >
      <pct-box
        [data]="rows()"
        x="at"
        values="values"
        name="Latency"
        unit="ms"
        [color]="color()"
      />
    </pct-chart>
    <pct-chart-legend [chart]="chart" />
    <pct-chart-table [chart]="chart" />
  `,
})
class Host {
  readonly rows = signal<readonly Batch[]>(BATCHES);
  readonly orientation = signal<'vertical' | 'horizontal'>('vertical');
  readonly hidden = signal<readonly string[]>([]);
  readonly cursor = signal<number | null>(null);
  readonly color = signal<number | string | undefined>(undefined);
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
const scalesOf = (fixture: ComponentFixture<unknown>) => {
  const chart = chartOf(fixture);
  return { x: chart.xScale()!, y: chart.yScales().get('ms')! };
};
const numbers = (el: Element, names: readonly string[]) =>
  names.map((n) => Number(el.getAttribute(n)));
const line = (el: Element) => numbers(el, ['x1', 'y1', 'x2', 'y2']);
const boxes = (fixture: ComponentFixture<unknown>) =>
  all(fixture, '[data-pct-part="box"]').map((rect) => {
    const g = rect.parentElement!;
    return {
      place: g.getAttribute('data-pct-series'),
      box: numbers(rect, ['x', 'y', 'width', 'height']),
      median: line(g.querySelector('[data-pct-part="median"]')!),
      whiskers: [...g.querySelectorAll('[data-pct-part="whisker"]')].map(line),
      outliers: [...g.querySelectorAll('[data-pct-part="outlier"]')].map((c) =>
        numbers(c, ['cx', 'cy']),
      ),
    };
  });
const headers = (fixture: ComponentFixture<unknown>) =>
  all(fixture, 'thead th').map((th) => th.textContent!.trim());
const cells = (fixture: ComponentFixture<unknown>) =>
  all(fixture, 'tbody tr').map((tr) =>
    [...tr.querySelectorAll('td')].map((td) => td.textContent!.trim()),
  );
const rows = (fixture: ComponentFixture<unknown>) =>
  all(fixture, '[data-pct-part="tooltip"] .row:not(.note)').map((row) => ({
    name: row.querySelector('.name')!.textContent,
    value: row.querySelector('.value')!.textContent,
  }));
const notes = (fixture: ComponentFixture<unknown>) =>
  all(fixture, '[data-pct-part="tooltip"] .row.note').map((row) => ({
    name: row.querySelector('.name')!.textContent,
    value: row.querySelector('.value')!.textContent,
  }));

describe('PctBox', () => {
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

  it('draws a box per row with values: the quartiles as its ends, the median across, whiskers with caps, the outliers as points', async () => {
    const fixture = await render();
    const chart = chartOf(fixture);
    const { x, y } = scalesOf(fixture);
    const drawn = boxes(fixture);
    expect(drawn).toHaveLength(3);
    expect(drawn[0].place).toBe('1');
    // Three boxes, ten apart, on a chart 600 wide: the spacing is well over sixty pixels, so
    // the box is as wide as it may be, forty, and its caps a quarter of that.
    const along = Math.round(x.map(0));
    expect(drawn[0].box).toEqual([
      along - 20,
      Math.min(y.map(2), y.map(4)),
      40,
      Math.abs(y.map(4) - y.map(2)),
    ]);
    expect(drawn[0].median).toEqual([
      along - 20,
      y.map(3),
      along + 20,
      y.map(3),
    ]);
    expect(drawn[0].whiskers).toEqual([
      [along, y.map(2), along, y.map(1)],
      [along - 10, y.map(1), along + 10, y.map(1)],
      [along, y.map(4), along, y.map(4)],
      [along - 10, y.map(4), along + 10, y.map(4)],
    ]);
    expect(drawn[0].outliers).toEqual([[along, y.map(100)]]);
    // The axis holds the outliers.
    expect(y.domain[1]).toBeGreaterThanOrEqual(100);
    expect(y.domain[0]).toBeLessThanOrEqual(-2);
    expect(
      chart.markOf('Latency')!.extent('Latency', { from: 25, to: 35 }),
    ).toEqual([-2, 8]);
    expect(
      chart.markOf('Latency')!.extent('Latency', { from: 5, to: 15 }),
    ).toBeNull();
    expect(
      chart.markOf('Latency')!.extent('Other', { from: 0, to: 30 }),
    ).toBeNull();
    // A flat box is a pixel tall.
    expect(drawn[1].box[3]).toBe(1);
    expect(drawn[1].outliers).toEqual([]);
    expect(drawn[2].outliers).toHaveLength(2);
    // the legend's swatch is a box on a line
    expect(query(fixture, 'pct-chart-legend .tint')).not.toBeNull();
  });

  it('reads the median as the value, held until the next box, and the five numbers and the outliers on lines and in columns', async () => {
    const fixture = await render();
    const chart = chartOf(fixture);
    expect(chart.valueAt('Latency', 0)).toBe(3);
    expect(chart.valueAt('Latency', 5)).toBe(3);
    expect(chart.valueAt('Latency', 10)).toBeNull();
    expect(chart.valueAt('Latency', 25)).toBe(7);
    expect(chart.valueAt('Other', 0)).toBeNull();
    fixture.componentInstance.cursor.set(30);
    await settle(fixture);
    expect(rows(fixture)).toEqual([{ name: 'Latency', value: '3 ms' }]);
    expect(notes(fixture)).toEqual([
      { name: 'Low', value: '-1 ms' },
      { name: 'Lower quartile', value: '2 ms' },
      { name: 'Upper quartile', value: '4 ms' },
      { name: 'High', value: '7 ms' },
      { name: 'Outliers', value: '-2 ms, 8 ms' },
    ]);
    fixture.componentInstance.cursor.set(20);
    await settle(fixture);
    // No outliers: no line of them.
    expect(notes(fixture).map((n) => n.name)).toEqual([
      'Low',
      'Lower quartile',
      'Upper quartile',
      'High',
    ]);
    expect(headers(fixture)).toEqual([
      'Position',
      'Latency (ms)',
      'Low',
      'Lower quartile',
      'Upper quartile',
      'High',
      'Outliers',
    ]);
    // The median bare under its header with the unit, the columns of words with it.
    expect(cells(fixture)).toEqual([
      ['3', '1 ms', '2 ms', '4 ms', '4 ms', '100 ms'],
      [
        'No reading',
        'No reading',
        'No reading',
        'No reading',
        'No reading',
        'No reading',
      ],
      ['7', '7 ms', '7 ms', '7 ms', '7 ms', 'No reading'],
      ['3', '-1 ms', '2 ms', '4 ms', '7 ms', '-2 ms, 8 ms'],
    ]);
    expect(
      chart.markOf('Latency')!.rowsIn('Latency', { from: 5, to: 25 }),
    ).toEqual([10, 20]);
    expect(
      chart.markOf('Latency')!.rowsIn('Other', { from: 0, to: 30 }),
    ).toBeNull();
    expect(chart.markOf('Latency')!.textAt('Latency:nothing', 0)).toBeNull();
  });

  it('lists the first six outliers and counts the rest', async () => {
    const fixture = await render();
    fixture.componentInstance.rows.set([
      // Thirty alike make a box of no height, so everything else is an outlier: nine of them.
      {
        at: 0,
        values: [
          ...Array.from({ length: 30 }, () => 50),
          100,
          1,
          2,
          3,
          4,
          5,
          6,
          7,
          8,
        ],
      },
    ]);
    await settle(fixture);
    const mark = chartOf(fixture).markOf('Latency')!;
    expect(mark.textAt('Latency:outliers', 0)).toBe(
      '1 ms, 2 ms, 3 ms, 4 ms, 5 ms, 6 ms +3',
    );
    expect(mark.textAt('Latency:outliers', -1)).toBeNull();
  });

  it('narrows the boxes to six tenths of the spacing, never under four pixels', async () => {
    const fixture = await render();
    fixture.componentInstance.rows.set(
      Array.from({ length: 50 }, (_, i) => ({ at: i, values: [1, 2, 3] })),
    );
    await settle(fixture);
    const { x } = scalesOf(fixture);
    const spacing = x.map(1) - x.map(0);
    expect(boxes(fixture)[0].box[2]).toBe(
      Math.min(40, Math.max(4, Math.round(spacing * 0.6))),
    );
    // The least spacing rules: two boxes nearly at one place narrow every box to the floor.
    fixture.componentInstance.rows.set(
      [0, 0.001, 1000].map((at) => ({ at, values: [1, 2, 3] })),
    );
    await settle(fixture);
    expect(boxes(fixture).map((b) => b.box[2])).toEqual([4, 4, 4]);
  });

  it('turned, lays the box along the x axis of the layer', async () => {
    const fixture = await render();
    fixture.componentInstance.orientation.set('horizontal');
    await settle(fixture);
    const { x, y } = scalesOf(fixture);
    const along = Math.round(x.map(0));
    const drawn = boxes(fixture);
    expect(drawn[0].box).toEqual([
      Math.min(y.map(2), y.map(4)),
      along - 20,
      Math.abs(y.map(4) - y.map(2)),
      40,
    ]);
    expect(drawn[0].median).toEqual([
      y.map(3),
      along - 20,
      y.map(3),
      along + 20,
    ]);
    expect(drawn[0].whiskers[0]).toEqual([y.map(2), along, y.map(1), along]);
    expect(drawn[0].outliers).toEqual([[y.map(100), along]]);
  });

  it('draws nothing while hidden, and no columns; takes a colour of its own', async () => {
    const fixture = await render();
    fixture.componentInstance.hidden.set(['Latency']);
    await settle(fixture);
    expect(boxes(fixture)).toHaveLength(0);
    expect(headers(fixture)).toEqual(['Position']);
    fixture.componentInstance.cursor.set(0);
    await settle(fixture);
    expect(notes(fixture)).toEqual([]);
    fixture.componentInstance.hidden.set([]);
    fixture.componentInstance.color.set('tomato');
    await settle(fixture);
    const g = query(fixture, '[data-pct-part="box"]')!
      .parentElement as HTMLElement;
    expect(g.getAttribute('data-pct-series')).toBe('custom');
    expect(g.style.getPropertyValue('--_pct-chart-color')).toBe('tomato');
  });

  it('leaves out a row with no position, and reports rows out of order in development', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const fixture = await render();
    fixture.componentInstance.rows.set([
      BATCHES[0],
      { at: NaN, values: [1] },
      BATCHES[3],
    ]);
    await settle(fixture);
    expect(boxes(fixture)).toHaveLength(2);
    expect(warn).not.toHaveBeenCalled();
    fixture.componentInstance.rows.set([BATCHES[3], BATCHES[0]]);
    await settle(fixture);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining(
        '[pct-box] The rows of "Latency" are not ordered',
      ),
    );
  });
});
