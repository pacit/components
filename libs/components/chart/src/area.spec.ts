import {
  Component,
  provideZonelessChangeDetection,
  signal,
} from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PctArea } from './area';
import { PctChart } from './chart';
import { PctChartTable } from './chart-table';
import { PctChartLegend } from './legend';
import { pctAreaPath, pctBandPath, pctLinePath } from './model/path';
import type { PctCurve } from './model/value-at';

interface Row {
  readonly x: number;
  readonly gas: number | null;
  readonly solar: number | null;
}

const ROWS: readonly Row[] = [
  { x: 0, gas: 2, solar: 1 },
  { x: 10, gas: 2, solar: 3 },
  { x: 20, gas: 4, solar: 1 },
  { x: 30, gas: 1, solar: 3 },
];

@Component({
  imports: [PctChart, PctArea, PctChartLegend, PctChartTable],
  template: `
    <pct-chart
      #chart
      ariaLabel="Energy"
      x="linear"
      locale="en-US"
      [orientation]="orientation()"
      [(hiddenSeries)]="hidden"
      [(cursor)]="cursor"
    >
      <pct-area
        [data]="rows()"
        x="x"
        y="gas"
        name="Gas"
        unit="kW"
        [stack]="stack()"
        [normalize]="normalize()"
        [curve]="curve()"
        [color]="color()"
        [end]="end()"
      />
      @if (two()) {
        <pct-area
          [data]="rows()"
          x="x"
          y="solar"
          name="Solar"
          unit="kW"
          [stack]="stack()"
          [curve]="curve()"
        />
      }
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
  readonly stack = signal('');
  readonly normalize = signal(false);
  readonly curve = signal<PctCurve>('linear');
  readonly two = signal(true);
  readonly color = signal<number | string | undefined>(undefined);
  readonly end = signal<number | null>(null);
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
const all = (fixture: ComponentFixture<unknown>, selector: string) => [
  ...element(fixture).querySelectorAll(selector),
];
const chartOf = (fixture: ComponentFixture<unknown>) =>
  fixture.debugElement.query((d) => d.name === 'pct-chart')
    .componentInstance as PctChart;
const areas = (fixture: ComponentFixture<unknown>) =>
  all(fixture, '[data-pct-part="area"]').map((p) => p.getAttribute('d') ?? '');
const edges = (fixture: ComponentFixture<unknown>) =>
  all(fixture, 'path[data-pct-part="series"]').map(
    (p) => p.getAttribute('d') ?? '',
  );
const scalesOf = (fixture: ComponentFixture<unknown>, unit = 'kW') => {
  const chart = chartOf(fixture);
  return { x: chart.xScale()!, y: chart.yScales().get(unit)! };
};
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
const markers = (fixture: ComponentFixture<unknown>) =>
  all(fixture, '[data-pct-part="marker"]').map(
    (m) => (m as HTMLElement).style.transform,
  );
const columnsOf = (
  points: readonly (readonly [number, number])[],
): { xs: Float64Array; ys: Float64Array; length: number } => ({
  xs: Float64Array.from(points.map((p) => p[0])),
  ys: Float64Array.from(points.map((p) => p[1])),
  length: points.length,
});

describe('PctArea', () => {
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

  it('draws each area alone from zero to its values, with its top edge, in its place, and the axis from zero', async () => {
    const fixture = await render();
    const chart = chartOf(fixture);
    const { x, y } = scalesOf(fixture);
    expect(y.domain[0]).toBe(0);
    const gas = columnsOf(ROWS.map((r) => [r.x, r.gas!]));
    expect(areas(fixture)).toEqual([
      pctAreaPath(gas, x, y, 'linear', 0, { pixel: 1 }),
      pctAreaPath(
        columnsOf(ROWS.map((r) => [r.x, r.solar!])),
        x,
        y,
        'linear',
        0,
        { pixel: 1 },
      ),
    ]);
    expect(edges(fixture)[0]).toMatch(/^M/);
    expect(
      all(fixture, '[data-pct-part="area"]').map((p) =>
        p.getAttribute('data-pct-series'),
      ),
    ).toEqual(['1', '2']);
    expect(chart.areaStackOf('energy', 'Gas')).toBeNull();
    // The value read is the value, drawn where it stands.
    fixture.componentInstance.cursor.set(20);
    await settle(fixture);
    expect(rows(fixture)).toEqual([
      { name: 'Gas', value: '4 kW' },
      { name: 'Solar', value: '1 kW' },
    ]);
    expect(markers(fixture)[0]).toBe(
      `translate(${x.map(20)}px, ${y.map(4)}px)`,
    );
    // the legend's swatch is a tint under an edge
    expect(
      element(fixture).querySelector(
        'pct-chart-legend [data-pct-part="swatch"] .tint',
      ),
    ).not.toBeNull();
  });

  it('stacks areas naming one stack, each from the top of the ones under it, the axis up to the sum, the marker on the drawing', async () => {
    const fixture = await render();
    fixture.componentInstance.stack.set('energy');
    await settle(fixture);
    const chart = chartOf(fixture);
    const { x, y } = scalesOf(fixture);
    expect(y.domain[1]).toBeGreaterThanOrEqual(5);
    const solar = chart.areaStackOf('energy', 'Solar')!;
    expect([...solar.xs]).toEqual([0, 10, 20, 30]);
    expect([...solar.from]).toEqual([2, 2, 4, 1]);
    expect([...solar.to]).toEqual([3, 5, 5, 4]);
    expect(chart.areaStackOf('energy', 'Wind')).toBeNull();
    expect(chart.areaStackOf('heat', 'Gas')).toBeNull();
    expect(areas(fixture)[1]).toBe(
      pctBandPath(
        { xs: solar.xs, ys: solar.to, length: 4 },
        solar.from,
        x,
        y,
        'linear',
        { pixel: 1 },
      ),
    );
    // the edge is the top of the layer on its stack
    expect(edges(fixture)[1]).toBe(
      pctLinePath({ xs: solar.xs, ys: solar.to, length: 4 }, x, y, 'linear', {
        pixel: 1,
      }),
    );
    fixture.componentInstance.cursor.set(10);
    await settle(fixture);
    // The values read are the series' own; the markers stand on the stack.
    expect(rows(fixture)).toEqual([
      { name: 'Gas', value: '2 kW' },
      { name: 'Solar', value: '3 kW' },
    ]);
    expect(markers(fixture)).toEqual([
      `translate(${x.map(10)}px, ${y.map(2)}px)`,
      `translate(${x.map(10)}px, ${y.map(5)}px)`,
    ]);
    // Between readings, the stack is read as drawn: the sum of the interpolated values.
    expect(chart.valueAt('Solar', 15)).toBe(2);
    expect(chart.markOf('Solar')!.drawnAt('Solar', 15)).toBe(5);
    expect(chart.markOf('Solar')!.drawnAt('Gas', 15)).toBeNull();
    expect(chart.markOf('Solar')!.extent('Solar', { from: 0, to: 30 })).toEqual(
      [1, 5],
    );
  });

  it('brings a hidden series’ layers down, and stands on a zero where a series under has a gap', async () => {
    const fixture = await render();
    fixture.componentInstance.stack.set('energy');
    fixture.componentInstance.rows.set([
      { x: 0, gas: 2, solar: 1 },
      { x: 10, gas: null, solar: 3 },
      { x: 20, gas: 4, solar: 1 },
    ]);
    await settle(fixture);
    const chart = chartOf(fixture);
    expect([...chart.areaStackOf('energy', 'Solar')!.from]).toEqual([2, 0, 4]);
    expect([...chart.areaStackOf('energy', 'Gas')!.to]).toEqual([2, NaN, 4]);
    fixture.componentInstance.cursor.set(10);
    await settle(fixture);
    expect(rows(fixture)).toEqual([
      { name: 'Gas', value: 'No reading' },
      { name: 'Solar', value: '3 kW' },
    ]);
    expect(markers(fixture)).toHaveLength(1);
    fixture.componentInstance.hidden.set(['Gas']);
    await settle(fixture);
    expect([...chart.areaStackOf('energy', 'Solar')!.from]).toEqual([0, 0, 0]);
    expect(chart.areaStackOf('energy', 'Gas')).toBeNull();
    expect(areas(fixture)).toHaveLength(1);
  });

  it('stacks at every position any member has a reading at, each read as it is drawn', async () => {
    const fixture = await render();
    fixture.componentInstance.stack.set('energy');
    fixture.componentInstance.rows.set([
      { x: 0, gas: 2, solar: 1 },
      { x: 10, gas: null, solar: 3 },
      { x: 20, gas: 4, solar: null },
    ]);
    await settle(fixture);
    const chart = chartOf(fixture);
    const gas = chart.areaStackOf('energy', 'Gas')!;
    expect([...gas.xs]).toEqual([0, 10, 20]);
    // Gas at 10 is a gap in its own rows: a gap in the stack, not a value interpolated across.
    expect([...gas.to]).toEqual([2, NaN, 4]);
    const solar = chart.areaStackOf('energy', 'Solar')!;
    expect([...solar.from]).toEqual([2, 0, NaN]);
    expect([...solar.to]).toEqual([3, 3, NaN]);
  });

  it('normalized, draws each layer as its share in percent, reads the share with the value in brackets, and makes a total of nothing a gap', async () => {
    const fixture = await render();
    fixture.componentInstance.stack.set('energy');
    fixture.componentInstance.normalize.set(true);
    fixture.componentInstance.rows.set([
      { x: 0, gas: 2, solar: 8 },
      { x: 10, gas: 0, solar: 0 },
      { x: 20, gas: 3, solar: 1 },
    ]);
    await settle(fixture);
    const chart = chartOf(fixture);
    const { x, y } = scalesOf(fixture, '%');
    expect(y.domain).toEqual([0, 100]);
    expect(chart.series().map((s) => s.unit)).toEqual(['%', '%']);
    expect([...chart.areaStackOf('energy', 'Gas')!.to]).toEqual([20, NaN, 75]);
    expect([...chart.areaStackOf('energy', 'Solar')!.from]).toEqual([
      20,
      NaN,
      75,
    ]);
    expect([...chart.areaStackOf('energy', 'Solar')!.to]).toEqual([
      100,
      NaN,
      100,
    ]);
    expect(chart.valueAt('Gas', 20)).toBe(75);
    expect(chart.valueAt('Solar', 10)).toBeNull();
    expect(chart.markOf('Gas')!.rowValueAt('Gas', 20)).toBe(3);
    expect(chart.markOf('Gas')!.rowValueAt('Solar', 20)).toBeNull();
    // Solar never asked to be normalized: the stack is, so it stands in percent too.
    expect(chart.markOf('Solar')!.stacked()).toEqual({
      stack: 'energy',
      normalize: false,
    });
    expect(chart.stackNormalized('energy')).toBe(true);
    expect(chart.stackNormalized('heat')).toBe(false);
    fixture.componentInstance.cursor.set(20);
    await settle(fixture);
    const percent = (v: number) => chart.writeValue(v, '%');
    expect(rows(fixture)).toEqual([
      { name: 'Gas', value: `${percent(75)} (3 kW)` },
      { name: 'Solar', value: `${percent(25)} (1 kW)` },
    ]);
    expect(markers(fixture)[1]).toBe(
      `translate(${x.map(20)}px, ${y.map(100)}px)`,
    );
    expect(headers(fixture)).toEqual(['Position', 'Gas (%)', 'Solar (%)']);
    // bare in the cells, whose headers carry the unit
    expect(cells(fixture)[0]).toEqual(['20 (2 kW)', '80 (8 kW)']);
    expect(cells(fixture)[1]).toEqual(['No reading', 'No reading']);
  });

  it('normalized alone, is a hundred wherever it has a value: a stack of itself', async () => {
    const fixture = await render();
    fixture.componentInstance.two.set(false);
    fixture.componentInstance.normalize.set(true);
    await settle(fixture);
    const chart = chartOf(fixture);
    expect(chart.markOf('Gas')!.stacked()).toEqual({
      stack: 'Gas',
      normalize: true,
    });
    expect([...chart.areaStackOf('Gas', 'Gas')!.to]).toEqual([
      100, 100, 100, 100,
    ]);
    expect(chart.valueAt('Gas', 5)).toBe(100);
  });

  it('follows the curve it is given: a monotone area is a cubic, a step holds, an alone one at every default', async () => {
    const fixture = await render();
    expect(chartOf(fixture).markOf('Gas')!.stacked()).toBeNull();
    fixture.componentInstance.curve.set('monotone');
    await settle(fixture);
    expect(areas(fixture)[0]).toMatch(/^M[^C]*C/);
    expect(edges(fixture)[0]).toContain('C');
    fixture.componentInstance.stack.set('energy');
    fixture.componentInstance.curve.set('step');
    await settle(fixture);
    expect(areas(fixture)[1]).not.toContain('C');
    expect(chartOf(fixture).valueAt('Solar', 15)).toBe(3);
    expect(chartOf(fixture).markOf('Solar')!.drawnAt('Solar', 15)).toBe(5);
  });

  it('turned, writes the band as y x', async () => {
    const fixture = await render();
    fixture.componentInstance.stack.set('energy');
    fixture.componentInstance.orientation.set('horizontal');
    await settle(fixture);
    const chart = chartOf(fixture);
    const { x, y } = scalesOf(fixture);
    const solar = chart.areaStackOf('energy', 'Solar')!;
    expect(areas(fixture)[1]).toBe(
      pctBandPath(
        { xs: solar.xs, ys: solar.to, length: 4 },
        solar.from,
        x,
        y,
        'linear',
        { pixel: 1, transpose: true },
      ),
    );
  });

  it('draws a stack of negatives down from zero, and spans the axis to its foot', async () => {
    const fixture = await render();
    fixture.componentInstance.stack.set('energy');
    fixture.componentInstance.rows.set([
      { x: 0, gas: -2, solar: -1 },
      { x: 10, gas: 2, solar: -3 },
    ]);
    await settle(fixture);
    const chart = chartOf(fixture);
    expect([...chart.areaStackOf('energy', 'Solar')!.from]).toEqual([-2, 0]);
    expect([...chart.areaStackOf('energy', 'Solar')!.to]).toEqual([-3, -3]);
    expect(chart.markOf('Solar')!.extent('Solar', { from: 0, to: 10 })).toEqual(
      [-3, 0],
    );
    expect(scalesOf(fixture).y.domain[0]).toBeLessThanOrEqual(-3);
  });

  it('reports rows out of order in development, naming the series and the row', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const fixture = await render();
    fixture.componentInstance.rows.set([ROWS[1], ROWS[0]]);
    await settle(fixture);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('[pct-area] The rows of "Gas" are not ordered'),
    );
    expect(warn.mock.calls[0][0]).toContain('row 1 stands');
    expect(warn.mock.calls[0][0]).toContain('does not sort them.');
  });

  it('alone below zero, stands on the zero line and not on the foot of the axis', async () => {
    const fixture = await render();
    fixture.componentInstance.two.set(false);
    fixture.componentInstance.rows.set([
      { x: 0, gas: -2, solar: null },
      { x: 10, gas: -3, solar: null },
    ]);
    await settle(fixture);
    const { x, y } = scalesOf(fixture);
    expect(y.domain[0]).toBeLessThan(0);
    expect(areas(fixture)[0]).toBe(
      pctAreaPath(
        { xs: Float64Array.of(0, 10), ys: Float64Array.of(-2, -3), length: 2 },
        x,
        y,
        'linear',
        0,
        { pixel: 1 },
      ),
    );
  });

  it('answers for its own series only, takes a colour of its own, and holds a step to its end', async () => {
    const fixture = await render();
    const chart = chartOf(fixture);
    const gas = chart.markOf('Gas')!;
    expect(gas.valueAt('Solar', 0)).toBeNull();
    expect(gas.rowValueAt('Solar', 0)).toBeNull();
    expect(gas.readAt('Solar', 0)).toBeNull();
    expect(gas.extent('Solar', { from: 0, to: 30 })).toBeNull();
    // not normalized, the reading is the scene's to write
    expect(gas.readAt('Gas', 0)).toBeNull();
    fixture.componentInstance.color.set('tomato');
    await settle(fixture);
    const area = all(fixture, '[data-pct-part="area"]')[0] as HTMLElement;
    expect(area.getAttribute('data-pct-series')).toBe('custom');
    expect(area.style.getPropertyValue('--_pct-chart-color')).toBe('tomato');
    expect(
      all(fixture, 'pct-chart-legend .swatch')[0].getAttribute(
        'data-pct-series',
      ),
    ).toBe('custom');
    fixture.componentInstance.curve.set('step');
    fixture.componentInstance.end.set(40);
    await settle(fixture);
    expect(gas.span()).toEqual([0, 40]);
    expect(gas.valueAt('Gas', 35)).toBe(1);
    expect(gas.extent('Gas', { from: 32, to: 40 })).toEqual([1, 1]);
    fixture.componentInstance.rows.set([]);
    await settle(fixture);
    expect(gas.span()).toBeNull();
    expect(gas.valueAt('Gas', 0)).toBeNull();
  });
});
