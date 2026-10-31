import {
  Component,
  provideZonelessChangeDetection,
  signal,
} from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PctChart } from './chart';
import { PctChartTable } from './chart-table';
import { PctChartLegend } from './legend';
import { pctBandPath } from './model/path';
import { PctRange } from './range';

interface Day {
  readonly at: number;
  readonly low: number | null;
  readonly high: number | null;
  readonly open: number | null;
  readonly close: number | null;
}

const DAYS: readonly Day[] = [
  { at: 0, low: 3, high: 11, open: 5, close: 9 },
  { at: 10, low: 2, high: 9, open: 8, close: 4 },
  { at: 20, low: 5, high: 14, open: 7, close: 7 },
  { at: 30, low: 4, high: 12, open: 6, close: 10 },
];

@Component({
  imports: [PctChart, PctRange, PctChartLegend, PctChartTable],
  template: `
    <pct-chart
      #chart
      ariaLabel="Temperature"
      x="linear"
      locale="en-US"
      [orientation]="orientation()"
      [(hiddenSeries)]="hidden"
      [(cursor)]="cursor"
    >
      <pct-range
        [data]="rows()"
        x="at"
        low="low"
        high="high"
        [open]="candles() || openOnly() ? 'open' : null"
        [close]="candles() ? 'close' : null"
        name="Outdoors"
        unit="°C"
        [color]="color()"
      />
    </pct-chart>
    <pct-chart-legend [chart]="chart" />
    <pct-chart-table [chart]="chart" />
  `,
})
class Host {
  readonly rows = signal<readonly Day[]>(DAYS);
  readonly orientation = signal<'vertical' | 'horizontal'>('vertical');
  readonly hidden = signal<readonly string[]>([]);
  readonly cursor = signal<number | null>(null);
  readonly candles = signal(false);
  readonly openOnly = signal(false);
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
  return { x: chart.xScale()!, y: chart.yScales().get('°C')! };
};
const numbers = (el: Element, names: readonly string[]) =>
  names.map((n) => Number(el.getAttribute(n)));
const candles = (fixture: ComponentFixture<unknown>) =>
  all(fixture, '[data-pct-part="candle"]').map((g) => ({
    rise: g.classList.contains('rise'),
    fall: g.classList.contains('fall'),
    wick: numbers(g.querySelector('[data-pct-part="wick"]')!, [
      'x1',
      'y1',
      'x2',
      'y2',
    ]),
    body: numbers(g.querySelector('[data-pct-part="body"]')!, [
      'x',
      'y',
      'width',
      'height',
    ]),
  }));
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
const markers = (fixture: ComponentFixture<unknown>) =>
  all(fixture, '[data-pct-part="marker"]').map(
    (m) => (m as HTMLElement).style.transform,
  );

describe('PctRange', () => {
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

  it('draws a band from the lows to the highs, spans the axis over both, and reads low – high', async () => {
    const fixture = await render();
    const chart = chartOf(fixture);
    const { x, y } = scalesOf(fixture);
    expect(y.domain[0]).toBeLessThanOrEqual(2);
    expect(y.domain[1]).toBeGreaterThanOrEqual(14);
    expect(chart.series()[0].fromZero).toBe(false);
    const band = query(fixture, '[data-pct-part="spread"]')!;
    expect(band.getAttribute('data-pct-series')).toBe('1');
    expect(band.getAttribute('d')).toBe(
      pctBandPath(
        {
          xs: Float64Array.from(DAYS.map((d) => d.at)),
          ys: Float64Array.from(DAYS.map((d) => d.high!)),
          length: 4,
        },
        Float64Array.from(DAYS.map((d) => d.low!)),
        x,
        y,
        'linear',
        { pixel: 1 },
      ),
    );
    expect(all(fixture, '[data-pct-part="candle"]')).toHaveLength(0);
    // The value is the high, the marker stands on it, the text reads both.
    expect(chart.valueAt('Outdoors', 5)).toBe(10);
    fixture.componentInstance.cursor.set(10);
    await settle(fixture);
    expect(rows(fixture)).toEqual([{ name: 'Outdoors', value: '2 °C – 9 °C' }]);
    expect(notes(fixture)).toEqual([]);
    expect(markers(fixture)).toEqual([
      `translate(${x.map(10)}px, ${y.map(9)}px)`,
    ]);
    expect(
      query(fixture, 'input[data-pct-part="range"]')!.getAttribute(
        'aria-valuetext',
      ),
    ).toBe('10: Outdoors 2 °C – 9 °C');
    expect(headers(fixture)).toEqual(['Position', 'Outdoors (°C)']);
    expect(cells(fixture)[1]).toEqual(['2 – 9']);
    // the legend's swatch is a tint between two edges
    expect(all(fixture, 'pct-chart-legend .dash')).toHaveLength(2);
  });

  it('makes a gap in either value a gap in both, and reads it as none', async () => {
    const fixture = await render();
    fixture.componentInstance.rows.set([
      DAYS[0],
      { at: 10, low: null, high: 9, open: null, close: null },
      { at: 20, low: 5, high: null, open: null, close: null },
      DAYS[3],
    ]);
    await settle(fixture);
    const chart = chartOf(fixture);
    expect(chart.valueAt('Outdoors', 10)).toBeNull();
    expect(chart.valueAt('Outdoors', 20)).toBeNull();
    expect(chart.markOf('Outdoors')!.readAt('Outdoors', 15)).toBeNull();
    expect(chart.markOf('Outdoors')!.readAt('Outdoors', 10)).toBeNull();
    expect(chart.markOf('Outdoors')!.readAt('Outdoors', 20)).toBeNull();
    expect(chart.markOf('Outdoors')!.valueAt('Other', 0)).toBeNull();
    expect(
      chart.markOf('Outdoors')!.extent('Other', { from: 0, to: 30 }),
    ).toBeNull();
    expect(chart.markOf('Outdoors')!.readAt('Outdoors', 0)).toBe(
      '3 °C – 11 °C',
    );
    expect(chart.markOf('Outdoors')!.readAt('Outdoors', 0, true)).toBe(
      '3 – 11',
    );
    expect(chart.markOf('Outdoors')!.readAt('Other', 0)).toBeNull();
    // Two bands: the stretch before the gaps and the one after.
    expect(
      (query(fixture, '[data-pct-part="spread"]')!.getAttribute('d') ?? '')
        .split('Z')
        .filter(Boolean),
    ).toHaveLength(2);
    fixture.componentInstance.cursor.set(10);
    await settle(fixture);
    expect(rows(fixture)).toEqual([{ name: 'Outdoors', value: 'No reading' }]);
    expect(cells(fixture)[1]).toEqual(['No reading']);
  });

  it('draws candles with an open and a close: a wick from low to high, a body from open to close, rising or falling', async () => {
    const fixture = await render();
    fixture.componentInstance.candles.set(true);
    await settle(fixture);
    const chart = chartOf(fixture);
    const { x, y } = scalesOf(fixture);
    expect(query(fixture, '[data-pct-part="spread"]')).toBeNull();
    const drawn = candles(fixture);
    expect(drawn).toHaveLength(4);
    expect(drawn.map((c) => c.rise)).toEqual([true, false, true, true]);
    expect(drawn.map((c) => c.fall)).toEqual([false, true, false, false]);
    // Four candles ten apart on a 600 wide chart: the spacing in pixels is well over forty, so
    // the body is as wide as it may be.
    const spacing = x.map(10) - x.map(0);
    expect(spacing).toBeGreaterThan(40);
    const width = 24;
    const along = Math.round(x.map(10));
    expect(drawn[1].wick).toEqual([along, y.map(9), along, y.map(2)]);
    expect(drawn[1].body).toEqual([
      along - width / 2,
      Math.min(y.map(8), y.map(4)),
      width,
      Math.abs(y.map(8) - y.map(4)),
    ]);
    // A close at its open is a body one pixel tall.
    expect(drawn[2].body[3]).toBe(1);
    expect(drawn[2].rise).toBe(true);
    // The value is the close, held until the next candle.
    expect(chart.valueAt('Outdoors', 10)).toBe(4);
    expect(chart.valueAt('Outdoors', 15)).toBe(4);
    expect(chart.markOf('Outdoors')!.readAt('Outdoors', 10)).toBeNull();
    fixture.componentInstance.cursor.set(10);
    await settle(fixture);
    expect(rows(fixture)).toEqual([{ name: 'Outdoors', value: '4 °C' }]);
    expect(notes(fixture)).toEqual([
      { name: 'Open', value: '8 °C' },
      { name: 'High', value: '9 °C' },
      { name: 'Low', value: '2 °C' },
    ]);
    expect(markers(fixture)).toEqual([
      `translate(${x.map(10)}px, ${y.map(4)}px)`,
    ]);
    // A row per candle, the open, high and low in columns of their own.
    expect(headers(fixture)).toEqual([
      'Position',
      'Outdoors (°C)',
      'Open',
      'High',
      'Low',
    ]);
    expect(cells(fixture)).toEqual([
      ['9', '5 °C', '11 °C', '3 °C'],
      ['4', '8 °C', '9 °C', '2 °C'],
      ['7', '7 °C', '14 °C', '5 °C'],
      ['10', '6 °C', '12 °C', '4 °C'],
    ]);
    expect(
      chart.markOf('Outdoors')!.rowsIn('Outdoors', { from: 5, to: 25 }),
    ).toEqual([10, 20]);
    expect(
      chart.markOf('Outdoors')!.rowsIn('Other', { from: 5, to: 25 }),
    ).toBeNull();
    // the legend's swatch is a candle
    expect(query(fixture, 'pct-chart-legend .body')).not.toBeNull();
  });

  it('narrows the bodies to six tenths of the spacing, never under two pixels, and leaves out a candle with a gap', async () => {
    const fixture = await render();
    fixture.componentInstance.candles.set(true);
    fixture.componentInstance.rows.set([
      ...Array.from({ length: 60 }, (_, i) => ({
        at: i,
        low: 1,
        high: 3,
        open: 2,
        close: i === 30 ? null : 2.5,
      })),
    ]);
    await settle(fixture);
    const { x } = scalesOf(fixture);
    const drawn = candles(fixture);
    expect(drawn).toHaveLength(59);
    const spacing = x.map(1) - x.map(0);
    expect(drawn[0].body[2]).toBe(
      Math.min(24, Math.max(2, Math.round(spacing * 0.6))),
    );
    // The least spacing rules: two candles nearly at one place narrow every body to the floor.
    fixture.componentInstance.rows.set(
      [0, 0.001, 1000].map((at) => ({
        at,
        low: 1,
        high: 3,
        open: 2,
        close: 2.5,
      })),
    );
    await settle(fixture);
    expect(candles(fixture).map((c) => c.body[2])).toEqual([2, 2, 2]);
  });

  it('turned, draws the wick along the x axis of the layer and the body across it', async () => {
    const fixture = await render();
    fixture.componentInstance.candles.set(true);
    fixture.componentInstance.orientation.set('horizontal');
    await settle(fixture);
    const { x, y } = scalesOf(fixture);
    const along = Math.round(x.map(10));
    const drawn = candles(fixture);
    expect(drawn[1].wick).toEqual([y.map(9), along, y.map(2), along]);
    expect(drawn[1].body).toEqual([
      Math.min(y.map(8), y.map(4)),
      along - 12,
      Math.abs(y.map(8) - y.map(4)),
      24,
    ]);
  });

  it('draws nothing while hidden, and no columns, and takes a colour of its own', async () => {
    const fixture = await render();
    fixture.componentInstance.candles.set(true);
    fixture.componentInstance.hidden.set(['Outdoors']);
    await settle(fixture);
    expect(all(fixture, '[data-pct-part="candle"]')).toHaveLength(0);
    expect(headers(fixture)).toEqual(['Position']);
    fixture.componentInstance.cursor.set(10);
    await settle(fixture);
    expect(notes(fixture)).toEqual([]);
    fixture.componentInstance.hidden.set([]);
    fixture.componentInstance.candles.set(false);
    fixture.componentInstance.color.set('tomato');
    await settle(fixture);
    const band = query(fixture, '[data-pct-part="spread"]') as HTMLElement;
    expect(band.getAttribute('data-pct-series')).toBe('custom');
    expect(band.style.getPropertyValue('--_pct-chart-color')).toBe('tomato');
  });

  it('reports rows out of order in development, naming the series and the row', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const fixture = await render();
    fixture.componentInstance.rows.set([DAYS[1], DAYS[0]]);
    await settle(fixture);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining(
        '[pct-range] The rows of "Outdoors" are not ordered',
      ),
    );
    expect(warn.mock.calls[0][0]).toContain('row 1 stands');
    expect(warn.mock.calls[0][0]).toContain('does not sort them.');
  });

  it('with an open and no close is a band still: candles take both ends', async () => {
    const fixture = await render();
    fixture.componentInstance.openOnly.set(true);
    await settle(fixture);
    const chart = chartOf(fixture);
    expect(all(fixture, '[data-pct-part="candle"]')).toHaveLength(0);
    expect(query(fixture, '[data-pct-part="spread"]')).not.toBeNull();
    expect(chart.markOf('Outdoors')!.columns()).toEqual([]);
    expect(chart.markOf('Outdoors')!.textAt('Outdoors:open', 0)).toBeNull();
    expect(chart.valueAt('Outdoors', 0)).toBe(11);
    expect(chart.markOf('Outdoors')!.readAt('Outdoors', 0)).toBe(
      '3 °C – 11 °C',
    );
  });

  it('as candles, reads a gap in a column as none, in the notes and the table alike', async () => {
    const fixture = await render();
    fixture.componentInstance.candles.set(true);
    fixture.componentInstance.rows.set([
      DAYS[0],
      { at: 10, low: 2, high: 9, open: null, close: 4 },
      DAYS[2],
    ]);
    await settle(fixture);
    const mark = chartOf(fixture).markOf('Outdoors')!;
    expect(mark.textAt('Outdoors:open', 10)).toBeNull();
    expect(mark.textAt('Outdoors:open', 0)).toBe('5 °C');
    expect(mark.textAt('Outdoors:high', 10)).toBe('9 °C');
    expect(mark.textAt('Outdoors:low', 10)).toBe('2 °C');
    expect(mark.textAt('Other', 10)).toBeNull();
    expect(mark.notesAt(10)).toEqual([
      { id: 'Outdoors:high', name: 'High', text: '9 °C' },
      { id: 'Outdoors:low', name: 'Low', text: '2 °C' },
    ]);
    expect(all(fixture, '[data-pct-part="candle"]')).toHaveLength(2);
    expect(cells(fixture)[1]).toEqual([
      'No reading',
      'No reading',
      '9 °C',
      '2 °C',
    ]);
  });
});
