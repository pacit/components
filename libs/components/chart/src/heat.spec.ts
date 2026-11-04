import {
  Component,
  provideZonelessChangeDetection,
  signal,
} from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PctChart } from './chart';
import { PctChartTable } from './chart-table';
import { PctHeat } from './heat';
import { PctChartLegend } from './legend';
import { PctLine } from './line';
import { PctChartRamp } from './ramp';

interface Cell {
  readonly day: number;
  readonly part: string;
  readonly kw: number | null;
}

const DAYS = ['Mon', 'Tue', 'Wed'];
/** Two rows over three days: a gap on Tuesday by day, and the day's values from 1 to 5. */
const CELLS: readonly Cell[] = [
  { day: 0, part: 'Night', kw: 1 },
  { day: 0, part: 'Day', kw: 3 },
  { day: 1, part: 'Night', kw: 2 },
  { day: 1, part: 'Day', kw: null },
  { day: 2, part: 'Night', kw: 4 },
  { day: 2, part: 'Day', kw: 5 },
];

@Component({
  imports: [
    PctChart,
    PctHeat,
    PctLine,
    PctChartLegend,
    PctChartTable,
    PctChartRamp,
  ],
  template: `
    <pct-chart
      #chart
      ariaLabel="Power"
      x="band"
      [categories]="days()"
      locale="en-US"
      [orientation]="orientation()"
      [(hiddenSeries)]="hidden"
      [(cursor)]="cursor"
    >
      <pct-heat
        [data]="rows()"
        x="day"
        y="part"
        value="kw"
        name="Power"
        unit="kW"
        [scale]="scale()"
        [domain]="domain()"
        [rowOrder]="order()"
        [labels]="labels()"
        (pick)="picked.set($event.row)"
      />
      @if (second()) {
        <pct-heat
          [data]="rows()"
          x="day"
          y="part"
          value="kw"
          name="Backup"
          unit="kW"
        />
      }
      @if (line()) {
        <pct-line [data]="rows()" x="day" y="kw" name="Load" unit="kW" />
      }
    </pct-chart>
    <pct-chart-legend [chart]="chart" />
    <pct-chart-table [chart]="chart" />
    <pct-chart-ramp [chart]="chart" />
  `,
})
class Host {
  readonly days = signal<readonly string[]>(DAYS);
  readonly rows = signal<readonly Cell[]>(CELLS);
  readonly orientation = signal<'vertical' | 'horizontal'>('vertical');
  readonly hidden = signal<readonly string[]>([]);
  readonly cursor = signal<number | null>(null);
  readonly scale = signal<'sequential' | 'diverging'>('sequential');
  readonly domain = signal<readonly number[] | undefined>(undefined);
  readonly order = signal<readonly string[] | undefined>(undefined);
  readonly labels = signal(false);
  readonly picked = signal<Cell | null>(null);
  readonly second = signal(false);
  readonly line = signal(false);
}

interface Hour {
  readonly at: number;
  readonly hour: string;
  readonly value: number;
}

const DAY = 86_400_000;
const T0 = Date.UTC(2026, 9, 26);

@Component({
  imports: [PctChart, PctHeat],
  template: `
    <pct-chart ariaLabel="By day" timeZone="UTC" interval="day" locale="en-US">
      <pct-heat
        [data]="rows"
        x="at"
        y="hour"
        value="value"
        name="Load"
        unit="%"
      />
    </pct-chart>
  `,
})
class TimedHost {
  readonly rows: readonly Hour[] = [
    { at: T0 + 3_600_000, hour: '01', value: 10 },
    { at: T0 + DAY + 7_200_000, hour: '01', value: 20 },
    { at: T0 + 2 * DAY + 60_000, hour: '02', value: 30 },
    { at: NaN, hour: '02', value: 99 },
    { at: Infinity, hour: '02', value: 50 },
  ];
}

function stubSize(): void {
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
}

async function render<H>(host: new () => H): Promise<ComponentFixture<H>> {
  TestBed.configureTestingModule({
    providers: [provideZonelessChangeDetection()],
  });
  const fixture = TestBed.createComponent(host);
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
const heatOf = (fixture: ComponentFixture<unknown>) =>
  fixture.debugElement.query((d) => d.name === 'pct-heat')
    .componentInstance as PctHeat<Cell>;
const numbers = (el: Element, names: readonly string[]) =>
  names.map((n) => Number(el.getAttribute(n)));
const cells = (fixture: ComponentFixture<unknown>) =>
  all(fixture, '[data-pct-part="cell"]').map((rect) => ({
    box: numbers(rect, ['x', 'y', 'width', 'height']),
    classes: [...rect.classList].sort().join(' '),
    mix: (rect as SVGElement).style.getPropertyValue('--_pct-heat-mix'),
  }));
const rowLabels = (fixture: ComponentFixture<unknown>) =>
  all(fixture, '[data-pct-rows] text').map((t) => ({
    text: t.textContent,
    x: t.getAttribute('x'),
    y: t.getAttribute('y'),
    anchor: t.getAttribute('text-anchor'),
  }));
const headers = (fixture: ComponentFixture<unknown>) =>
  all(fixture, 'thead th').map((th) => th.textContent!.trim());
const tableCells = (fixture: ComponentFixture<unknown>) =>
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

describe('PctHeat', () => {
  beforeEach(stubSize);
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('lays a row per category across the plot, a series each with no axis, named at the side', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const fixture = await render(Host);
    const chart = chartOf(fixture);
    expect(
      chart
        .series()
        .map((s) => [
          s.id,
          s.name,
          s.unit,
          s.row,
          s.color,
          s.curve,
          s.fromZero,
        ]),
    ).toEqual([
      [
        'Power:Night',
        'Night',
        'kW',
        'Night',
        'var(--pct-chart-heat-bg-6)',
        'step',
        false,
      ],
      [
        'Power:Day',
        'Day',
        'kW',
        'Day',
        'var(--pct-chart-heat-bg-6)',
        'step',
        false,
      ],
    ]);
    expect(heatOf(fixture).span()).toEqual([0, 2]);
    // a series with no axis is no series without one
    expect(warn).not.toHaveBeenCalled();
    expect(chart.yScales().size).toBe(0);
    expect(chart.slots().size).toBe(0);
    const { top, bottom, left, right } = chart.frame();
    const night = chart.rowFrame('Night')!;
    const day = chart.rowFrame('Day')!;
    expect(night).toEqual({ left, right, top, bottom: (top + bottom) / 2 });
    expect(day).toEqual({ left, right, top: (top + bottom) / 2, bottom });
    expect(chart.rowFrame('Evening')).toBeNull();
    // the labels at the left of the plot, each at its row's middle, the plot moved right for
    // them: the widest name, 'Night' at 7.8 px a letter without a canvas, and a gap each side
    expect(left).toBe(39 + 12);
    expect(rowLabels(fixture)).toEqual([
      {
        text: 'Night',
        x: String(left - 6),
        y: String((top + night.bottom) / 2),
        anchor: 'end',
      },
      {
        text: 'Day',
        x: String(left - 6),
        y: String((day.top + bottom) / 2),
        anchor: 'end',
      },
    ]);
    // the legend lists the rows, each with the ramp's swatch
    expect(
      all(fixture, 'pct-chart-legend [data-pct-part="swatch"]').map((s) =>
        s.getAttribute('data-pct-series'),
      ),
    ).toEqual(['custom', 'custom']);
  });

  it('names a row two marks share once, and leaves the palette and the axis to a series beside the rows', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.second.set(true);
    fixture.componentInstance.line.set(true);
    await settle(fixture);
    const chart = chartOf(fixture);
    expect(rowLabels(fixture).map((l) => l.text)).toEqual(['Night', 'Day']);
    expect(chart.series().map((s) => s.id)).toEqual([
      'Power:Night',
      'Power:Day',
      'Backup:Night',
      'Backup:Day',
      'Load',
    ]);
    expect(chart.places().get('Load')).toBe(1);
    expect([...chart.slots().keys()]).toEqual(['kW']);
    expect(all(fixture, 'pct-chart-ramp [data-pct-part="item"]')).toHaveLength(
      2,
    );
  });

  it('draws a cell per value in its band and its row, a gap of the token between, mixing the two steps the value falls between', async () => {
    const fixture = await render(Host);
    const chart = chartOf(fixture);
    const x = chart.xScale()!;
    const { top, bottom } = chart.frame();
    const half = (top + bottom) / 2;
    const drawn = cells(fixture);
    // five cells: the gap on Tuesday by day draws none
    expect(drawn).toHaveLength(5);
    const band = (i: number) => [x.map(i) + 0.5, x.map(i + 1) - x.map(i) - 1];
    expect(drawn[0].box).toEqual([
      band(0)[0],
      top + 0.5,
      band(0)[1],
      half - top - 1,
    ]);
    expect(drawn[3].box).toEqual([
      band(0)[0],
      half + 0.5,
      band(0)[1],
      bottom - half - 1,
    ]);
    // the domain is the data's, 1 to 5: 1 is the first step, 3 the middle, 5 the last
    expect(drawn.map((c) => c.classes)).toEqual([
      'from-1 to-2',
      'from-2 to-3',
      'deep from-6 to-7',
      'deep from-4 to-5',
      'deep from-8 to-8',
    ]);
    expect(drawn.map((c) => c.mix)).toEqual(['0%', '75%', '25%', '50%', '0%']);
    expect(heatOf(fixture).colorScale()).toEqual({
      kind: 'sequential',
      domain: [1, 5],
      steps: 8,
      name: 'Power',
      unit: 'kW',
    });
    expect(all(fixture, 'pct-chart text[data-pct-part="label"]')).toHaveLength(
      0,
    );
  });

  it('with labels, writes the value on a cell wide enough in the colour of the nearer step', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.labels.set(true);
    await settle(fixture);
    const labels = all(fixture, 'pct-chart text[data-pct-part="label"]');
    expect(labels.map((l) => l.textContent)).toEqual(['1', '2', '4', '3', '5']);
    expect(labels.map((l) => l.getAttribute('class'))).toEqual([
      'on-1',
      'on-3',
      'on-6',
      'on-5',
      'on-8',
    ]);
    const first = cells(fixture)[0].box;
    expect(numbers(labels[0], ['x', 'y'])).toEqual([
      first[0] + first[2] / 2,
      first[1] + first[3] / 2,
    ]);
    // a cell too narrow for its text carries none
    fixture.componentInstance.days.set(
      Array.from({ length: 300 }, (_, i) => String(i)),
    );
    fixture.componentInstance.rows.set(
      Array.from({ length: 300 }, (_, i) => ({ day: i, part: 'Night', kw: i })),
    );
    await settle(fixture);
    expect(all(fixture, '[data-pct-part="cell"]')).toHaveLength(300);
    expect(all(fixture, 'pct-chart text[data-pct-part="label"]')).toHaveLength(
      0,
    );
  });

  it('writes a label on a cell exactly as wide as its text and the room, and none on one a hair narrower', async () => {
    // every text 141.25 px wide: the rows' names move the plot so that a cell is 145.25 px
    const measure = vi
      .spyOn(PctChart.prototype, 'measure')
      .mockReturnValue(141.25);
    const fixture = await render(Host);
    fixture.componentInstance.labels.set(true);
    await settle(fixture);
    expect(cells(fixture)[0].box[2]).toBe(145.25);
    expect(all(fixture, 'pct-chart text[data-pct-part="label"]')).toHaveLength(
      5,
    );
    measure.mockReturnValue(141.26);
    fixture.componentInstance.labels.set(false);
    await settle(fixture);
    fixture.componentInstance.labels.set(true);
    await settle(fixture);
    expect(all(fixture, 'pct-chart text[data-pct-part="label"]')).toHaveLength(
      0,
    );
  });

  it('diverging, centres on zero, reaches as far on both sides as the farther value, and names the three steps', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.scale.set('diverging');
    fixture.componentInstance.rows.set([
      { day: 0, part: 'Night', kw: -2 },
      { day: 1, part: 'Night', kw: 0 },
      { day: 2, part: 'Night', kw: 4 },
      { day: 0, part: 'Day', kw: 1 },
    ]);
    await settle(fixture);
    expect(heatOf(fixture).colorScale()).toEqual({
      kind: 'diverging',
      domain: [-4, 0, 4],
      steps: 3,
      name: 'Power',
      unit: 'kW',
    });
    const drawn = cells(fixture);
    expect(drawn.map((c) => c.classes)).toEqual([
      'from-low to-mid',
      'deep from-mid to-high',
      'deep from-high to-high',
      'deep from-mid to-high',
    ]);
    expect(drawn.map((c) => c.mix)).toEqual(['50%', '0%', '0%', '25%']);
    // a domain given is the ramp's reach, whatever the data say
    fixture.componentInstance.domain.set([-10, 2, 10]);
    await settle(fixture);
    expect(heatOf(fixture).colorScale()!.domain).toEqual([-10, 2, 10]);
    expect(cells(fixture)[1].classes).toBe('from-low to-mid');
    expect(
      all(fixture, '[data-pct-part="ramp"]')[0].classList.contains('diverging'),
    ).toBe(true);
    expect(
      all(fixture, 'pct-chart-ramp [data-pct-part="label"]').map(
        (l) => l.textContent,
      ),
    ).toEqual(['-10 kW', '2 kW', '10 kW']);
  });

  it('reads a value at the cursor per row, stands the markers at the rows’ middles, and writes the table as the grid', async () => {
    const fixture = await render(Host);
    const chart = chartOf(fixture);
    const heat = heatOf(fixture);
    expect(chart.valueAt('Power:Night', 1.5)).toBe(2);
    expect(chart.valueAt('Power:Day', 1.5)).toBeNull();
    expect(chart.valueAt('Power:Day', 2)).toBe(5);
    expect(heat.valueAt('Power:Day', 7)).toBeNull();
    expect(heat.valueAt('Other', 0)).toBeNull();
    expect(heat.extent('Power:Day', { from: 0, to: 3 })).toBeNull();
    expect(heat.bandAt('Power:Day', 1.2)).toEqual({ from: 1, to: 2 });
    expect(heat.bandAt('Power:Day', 9)).toBeNull();
    expect(heat.bandAt('Other', 1)).toBeNull();
    expect(heat.rowsIn('Power:Night', { from: 0.5, to: 3 })).toEqual([0, 1, 2]);
    // a band touching the window's edge is outside it
    expect(heat.rowsIn('Power:Night', { from: 1, to: 2 })).toEqual([1]);
    expect(heat.bandAt('Power:Night', 0.5)).toEqual({ from: 0, to: 1 });
    expect(heat.bandAt('Other:Night', 1.2)).toBeNull();
    expect(heat.rowsIn('Other', { from: 0, to: 3 })).toBeNull();
    const readings = heat.readings('Power:Night');
    expect([...readings.xs]).toEqual([0, 1, 2]);
    expect([...readings.ys]).toEqual([1, 2, 4]);
    expect(heat.readings('Other').length).toBe(0);
    fixture.componentInstance.cursor.set(1.5);
    await settle(fixture);
    expect(rows(fixture)).toEqual([
      { name: 'Night', value: '2 kW' },
      { name: 'Day', value: 'No reading' },
    ]);
    const x = chart.xScale()!;
    const night = chart.rowFrame('Night')!;
    expect(markers(fixture)).toEqual([
      `translate(${x.map(1.5)}px, ${(night.top + night.bottom) / 2}px)`,
    ]);
    expect(headers(fixture)).toEqual(['Position', 'Night (kW)', 'Day (kW)']);
    expect(tableCells(fixture)).toEqual([
      ['1', '3'],
      ['2', 'No reading'],
      ['4', '5'],
    ]);
    expect(heat.describe()).toBe('Power: 2 rows, from 1 kW to 5 kW.');
    // a value that is no finite number is no reading, and no cell
    fixture.componentInstance.rows.set([
      ...CELLS.slice(0, 3),
      { day: 1, part: 'Day', kw: Infinity },
      ...CELLS.slice(4),
    ]);
    await settle(fixture);
    expect(chart.valueAt('Power:Day', 1.5)).toBeNull();
    expect(cells(fixture)).toHaveLength(5);
  });

  it('picks a cell on its very edges, and nothing a hair outside them', async () => {
    const fixture = await render(Host);
    const heat = heatOf(fixture);
    const [cx, cy, cw, ch] = cells(fixture)[0].box;
    expect(heat.pickAt('Power:Night', cx, cy)).toBe(true);
    expect(fixture.componentInstance.picked()).toEqual(CELLS[0]);
    expect(heat.pickAt('Power:Night', cx + cw, cy + ch)).toBe(true);
    expect(heat.pickAt('Power:Night', cx - 0.01, cy)).toBe(false);
    expect(heat.pickAt('Power:Night', cx + cw + 0.01, cy)).toBe(false);
    expect(heat.pickAt('Power:Night', cx, cy - 0.01)).toBe(false);
    expect(heat.pickAt('Power:Night', cx, cy + ch + 0.01)).toBe(false);
  });

  it('hides a row’s cells and keeps its strip, takes the rows in the order given, and picks a cell', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.hidden.set(['Power:Night']);
    fixture.componentInstance.order.set(['Day', 'Night', 'Evening']);
    await settle(fixture);
    const chart = chartOf(fixture);
    expect(rowLabels(fixture).map((l) => l.text)).toEqual([
      'Day',
      'Night',
      'Evening',
    ]);
    const drawn = cells(fixture);
    expect(drawn).toHaveLength(2);
    const day = chart.rowFrame('Day')!;
    expect(drawn[0].box[1]).toBe(day.top + 0.5);
    // a press on a cell picks the row of the data it was drawn from; off a cell, nothing
    const heat = heatOf(fixture);
    const [cx, cy, cw, ch] = drawn[1].box;
    expect(heat.pickAt('Power:Day', cx + cw / 2, cy + ch / 2)).toBe(true);
    expect(fixture.componentInstance.picked()).toEqual(CELLS[5]);
    expect(heat.pickAt('Power:Day', cx - 2, cy)).toBe(false);
    expect(heat.pickAt('Power:Night', cx, cy)).toBe(false);
    expect(heat.pickAt('Other', cx, cy)).toBe(false);
    expect(heat.describe()).toBe('Power: 3 rows, from 1 kW to 5 kW.');
    fixture.componentInstance.rows.set([]);
    await settle(fixture);
    expect(heat.span()).toBeNull();
    expect(heat.describe()).toBe('Power: 3 rows, from 0 kW to 1 kW.');
    fixture.componentInstance.order.set(undefined);
    await settle(fixture);
    expect(heat.describe()).toBe('');
    // a row the order leaves out draws no cell; one position spans itself
    fixture.componentInstance.order.set(['Day']);
    fixture.componentInstance.rows.set(CELLS);
    await settle(fixture);
    expect(rowLabels(fixture).map((l) => l.text)).toEqual(['Day']);
    expect(cells(fixture)).toHaveLength(2);
    fixture.componentInstance.rows.set([CELLS[0]]);
    await settle(fixture);
    expect(heat.span()).toEqual([0, 0]);
    expect(cells(fixture)).toHaveLength(0);
  });

  it('turned, lays the rows across the width and names them under the plot', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.orientation.set('horizontal');
    await settle(fixture);
    const chart = chartOf(fixture);
    const { top, bottom, left, right } = chart.frame();
    const half = (left + right) / 2;
    expect(chart.rowFrame('Night')).toEqual({ top, bottom, left, right: half });
    expect(chart.rowFrame('Day')).toEqual({ top, bottom, left: half, right });
    const x = chart.xScale()!;
    expect(cells(fixture)[0].box).toEqual([
      left + 0.5,
      x.map(0) + 0.5,
      half - left - 1,
      x.map(1) - x.map(0) - 1,
    ]);
    const turned = rowLabels(fixture);
    expect(turned.map((l) => [l.text, l.anchor])).toEqual([
      ['Night', 'middle'],
      ['Day', 'middle'],
    ]);
    expect(Number(turned[0].x)).toBeCloseTo((left + half) / 2);
    expect(Number(turned[1].x)).toBeCloseTo((half + right) / 2);
    // the labels under the plot, a tick and two below it, in the room a line of them takes
    expect(Number(turned[0].y)).toBe(bottom + 4 + 2);
    expect(bottom).toBe(300 - chart.lineHeight() - 6);
    fixture.componentInstance.cursor.set(0.5);
    await settle(fixture);
    expect(markers(fixture)[0]).toBe(
      `translate(${(left + half) / 2}px, ${x.map(0.5)}px)`,
    );
    // without rows, the plot runs to the edge
    fixture.componentInstance.rows.set([]);
    await settle(fixture);
    expect(chart.frame().bottom).toBe(300 - 8);
  });

  it('reads the gap between the cells from the stylesheet, none for zero, and keeps a pixel for a value that is none', async () => {
    const view = document.defaultView!;
    const real = view.getComputedStyle.bind(view);
    let gap = '';
    vi.spyOn(view, 'getComputedStyle').mockImplementation((element, pseudo) =>
      element.tagName === 'PCT-CHART'
        ? ({
            fontSize: '13px',
            fontFamily: 'sans-serif',
            getPropertyValue: (name: string) =>
              name === '--pct-chart-cell-gap' ? gap : '',
          } as unknown as CSSStyleDeclaration)
        : real(element, pseudo),
    );
    for (const [value, g] of [
      ['3px', 3],
      ['0', 0],
      ['wide', 1],
    ] as const) {
      gap = value;
      TestBed.resetTestingModule();
      const fixture = await render(Host);
      const x = chartOf(fixture).xScale()!;
      const [cx, , cw] = cells(fixture)[0].box;
      expect([value, cx - x.map(0), x.map(1) - x.map(0) - cw]).toEqual([
        value,
        g / 2,
        g,
      ]);
    }
  });

  it('on a time axis, places a cell by the chart’s interval, the last row in a band standing, and spans the bands', async () => {
    const fixture = await render(TimedHost);
    const chart = chartOf(fixture);
    const heat = fixture.debugElement.query((d) => d.name === 'pct-heat')
      .componentInstance as PctHeat<Hour>;
    expect(heat.rows()).toEqual(['01', '02']);
    expect(heat.span()).toEqual([T0, T0 + 3 * DAY]);
    expect(chart.valueAt('Load:01', T0 + 12 * 3_600_000)).toBe(10);
    expect(chart.valueAt('Load:01', T0 + DAY)).toBe(20);
    expect(chart.valueAt('Load:02', T0 + 2 * DAY + DAY / 2)).toBe(30);
    expect(chart.valueAt('Load:02', T0)).toBeNull();
    expect(cells(fixture)).toHaveLength(3);
    expect(all(fixture, 'pct-chart text[data-pct-part="label"]')).toHaveLength(
      0,
    );
    expect(heat.describe()).toBe('Load: 2 rows, from 10 % to 30 %.');
  });
});
