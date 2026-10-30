import {
  Component,
  provideZonelessChangeDetection,
  signal,
  Type,
} from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { providePctTexts } from '@pacit/components/core';
import { PctAxis, PctChart } from './chart';
import { PctChartTable } from './chart-table';
import { PctLine } from './line';

interface Reading {
  readonly at: number;
  readonly value: number | null;
}

const H = 3_600_000;
const T0 = Date.UTC(2026, 9, 28, 0);
const temperature: Reading[] = [
  { at: T0, value: 20 },
  { at: T0 + 6 * H, value: 22.5 },
  { at: T0 + 12 * H, value: null },
  { at: T0 + 18 * H, value: 21 },
  { at: T0 + 24 * H, value: 19.5 },
];
const power: Reading[] = [
  { at: T0, value: 400 },
  { at: T0 + 12 * H, value: 1200 },
  { at: T0 + 24 * H, value: 800 },
];
const heater: Reading[] = [
  { at: T0, value: 0 },
  { at: T0 + 8 * H, value: 1 },
  { at: T0 + 10 * H, value: 0 },
];

@Component({
  imports: [PctChart, PctLine, PctAxis, PctChartTable],
  template: `
    <pct-chart
      #chart
      ariaLabel="Heat recovery"
      description="Supply air between 19.5 and 22.5 °C."
      timeZone="UTC"
      locale="en-US"
      [(window)]="window"
      [(hiddenSeries)]="hidden"
    >
      @if (showTemperature()) {
        <pct-line
          [data]="temperature"
          x="at"
          y="value"
          name="Supply air"
          unit="°C"
          [area]="area()"
        />
      }
      @if (showPower()) {
        <pct-line
          [data]="power"
          x="at"
          y="value"
          name="Fan power"
          unit="W"
          curve="step"
        />
      }
      @if (showHeater()) {
        <pct-line
          [data]="heater"
          x="at"
          y="value"
          name="Heater"
          unit="boolean"
          curve="step"
        />
      }
      @if (fixed()) {
        <pct-axis unit="°C" [floor]="0" [ceiling]="40" />
      }
      <figcaption>Heat recovery unit</figcaption>
    </pct-chart>
    <pct-chart-table [chart]="chart" />
  `,
})
class Host {
  readonly temperature = temperature;
  readonly power = power;
  readonly heater = heater;
  readonly window = signal<{ from: number; to: number } | null>(null);
  readonly hidden = signal<readonly string[]>([]);
  readonly showTemperature = signal(true);
  readonly showPower = signal(true);
  readonly showHeater = signal(false);
  readonly area = signal(false);
  readonly fixed = signal(false);
}

@Component({
  imports: [PctChart],
  template: `<pct-chart ariaLabel="Nothing yet" />`,
})
class Empty {}

let size = { width: 600, height: 300 };

/** The table's frame watches its size; jsdom has no observer and no canvas to measure with. */
class QuietObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
beforeAll(() => {
  vi.stubGlobal('ResizeObserver', QuietObserver);
});
afterAll(() => vi.unstubAllGlobals());

async function render<T>(
  type: Type<T>,
  providers: unknown[] = [],
): Promise<ComponentFixture<T>> {
  TestBed.configureTestingModule({
    providers: [provideZonelessChangeDetection(), ...(providers as never[])],
  });
  const fixture = TestBed.createComponent(type);
  await settle(fixture);
  return fixture;
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  await fixture.whenStable();
}

const query = (fixture: ComponentFixture<unknown>, selector: string) =>
  (fixture.nativeElement as HTMLElement).querySelector(selector);
const all = (fixture: ComponentFixture<unknown>, selector: string) => [
  ...(fixture.nativeElement as HTMLElement).querySelectorAll(selector),
];
const texts = (fixture: ComponentFixture<unknown>, selector: string) =>
  all(fixture, selector).map((e) => e.textContent?.trim());

describe('PctChart', () => {
  beforeEach(() => {
    size = { width: 600, height: 300 };
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(
      function (this: HTMLElement) {
        return this.tagName === 'PCT-CHART'
          ? ({
              width: size.width,
              height: size.height,
              top: 0,
              left: 0,
              right: size.width,
              bottom: size.height,
              x: 0,
              y: 0,
            } as DOMRect)
          : ({
              width: 0,
              height: 0,
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              x: 0,
              y: 0,
            } as DOMRect);
      },
    );
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  });
  afterEach(() => vi.restoreAllMocks());

  it('draws a skeleton of its shape while it has no size', async () => {
    size = { width: 0, height: 0 };
    const fixture = await render(Host);
    expect(query(fixture, 'pct-skeleton')).not.toBeNull();
    expect(query(fixture, '[data-pct-part="data"]')).toBeNull();
  });

  it('is a named picture with its description, and the caption the consumer wrote', async () => {
    const fixture = await render(Host);
    const picture = query(fixture, '[role="img"]')!;
    expect(picture.getAttribute('aria-label')).toBe('Heat recovery');
    const described = picture.getAttribute('aria-describedby')!;
    expect(query(fixture, `#${described}`)?.textContent).toBe(
      'Supply air between 19.5 and 22.5 °C.',
    );
    expect(query(fixture, 'figure figcaption')?.textContent).toBe(
      'Heat recovery unit',
    );
    expect(
      all(fixture, 'svg').every(
        (svg) => svg.getAttribute('aria-hidden') === 'true',
      ),
    ).toBe(true);
  });

  it('draws each series as a path in its palette place, the gap a break', async () => {
    const fixture = await render(Host);
    const paths = all(fixture, 'path[data-pct-part="series"]');
    expect(paths.map((p) => p.getAttribute('data-pct-series'))).toEqual([
      '1',
      '2',
    ]);
    const supply = paths[0].getAttribute('d')!;
    expect(supply.match(/M/g)).toHaveLength(2);
    // every path is in the SVG namespace, stamped into the scene's own <svg>
    expect(
      paths.every((p) => p.namespaceURI === 'http://www.w3.org/2000/svg'),
    ).toBe(true);
    expect(
      paths.every(
        (p) => p.closest('svg')?.getAttribute('data-pct-part') === 'data',
      ),
    ).toBe(true);
  });

  it('gives each unit an axis, the first on the left and the second on the right', async () => {
    const fixture = await render(Host);
    const axes = all(fixture, '[data-pct-unit]');
    expect(
      axes.map((a) => [
        a.getAttribute('data-pct-unit'),
        a.getAttribute('data-pct-slot'),
      ]),
    ).toEqual([
      ['°C', 'left'],
      ['W', 'right'],
    ]);
    expect(texts(fixture, '[data-pct-part="unit"]')).toEqual(['°C', 'W']);
    // 19.5 to 22.5, ticked every half degree
    const celsius = texts(fixture, '[data-pct-unit="°C"] .value');
    expect(celsius[0]).toBe('19.5');
    expect(celsius[1]).toBe('20');
    expect(celsius.at(-1)).toBe('22.5');
  });

  it('keeps an axis and a colour where they were when another series leaves', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.showTemperature.set(false);
    await settle(fixture);
    expect(
      all(fixture, '[data-pct-unit]').map((a) =>
        a.getAttribute('data-pct-slot'),
      ),
    ).toEqual(['right']);
    expect(
      all(fixture, 'path[data-pct-part="series"]').map((p) =>
        p.getAttribute('data-pct-series'),
      ),
    ).toEqual(['2']);
    fixture.componentInstance.showHeater.set(true);
    await settle(fixture);
    // the heater takes the free place and the free slot
    expect(
      all(fixture, 'path[data-pct-part="series"]').map((p) =>
        p.getAttribute('data-pct-series'),
      ),
    ).toEqual(['2', '1']);
    expect(
      all(fixture, '[data-pct-unit="boolean"]').map((a) =>
        a.getAttribute('data-pct-slot'),
      ),
    ).toEqual(['left']);
  });

  it("writes a yes/no axis as off and on, in the application's words", async () => {
    const fixture = await render(Host, [
      providePctTexts({ chartOff: 'Not heating', chartOn: 'Heating' }),
    ]);
    fixture.componentInstance.showHeater.set(true);
    await settle(fixture);
    expect(texts(fixture, '[data-pct-unit="boolean"] .value')).toEqual([
      'Not heating',
      'Heating',
    ]);
    expect(
      query(fixture, '[data-pct-unit="boolean"] [data-pct-part="unit"]'),
    ).toBeNull();
  });

  it('draws a hidden series not and leaves its domain out, but keeps its axis', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.hidden.set(['Fan power']);
    await settle(fixture);
    expect(all(fixture, 'path[data-pct-part="series"]')).toHaveLength(1);
    expect(
      all(fixture, '[data-pct-unit]').map((a) =>
        a.getAttribute('data-pct-unit'),
      ),
    ).toEqual(['°C', 'W']);
    // nothing shown on the axis: its domain is [0, 1]
    expect(texts(fixture, '[data-pct-unit="W"] .value')).toEqual([
      '0',
      '0.2',
      '0.4',
      '0.6',
      '0.8',
      '1',
    ]);
  });

  it('ticks the time on whole hours of the zone, and a midnight as a date', async () => {
    const fixture = await render(Host);
    const labels = texts(fixture, '.time');
    expect(labels).toContain('10/28');
    expect(labels).toContain('12:00');
  });

  it('shows the window it is given, and the data choose none', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.window.set({ from: T0 + 6 * H, to: T0 + 12 * H });
    await settle(fixture);
    // one value shows in the window, 22.5, and gets five percent on each side
    const labels = texts(fixture, '[data-pct-unit="°C"] .value');
    expect(labels[0]).toBe('21');
    expect(labels.at(-1)).toBe('24');
    expect(fixture.componentInstance.window()).toEqual({
      from: T0 + 6 * H,
      to: T0 + 12 * H,
    });
  });

  it('fills the area to zero, and keeps zero on the axis', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.area.set(true);
    await settle(fixture);
    expect(
      query(fixture, 'path[data-pct-part="area"]')?.getAttribute('d'),
    ).toMatch(/Z/);
    expect(texts(fixture, '[data-pct-unit="°C"] .value')[0]).toBe('0');
  });

  it('holds an axis to the ends the consumer fixed', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.fixed.set(true);
    await settle(fixture);
    const labels = texts(fixture, '[data-pct-unit="°C"] .value');
    expect(labels[0]).toBe('0');
    expect(labels.at(-1)).toBe('40');
  });

  it("says it has nothing to draw, in the application's words", async () => {
    const fixture = await render(Empty, [
      providePctTexts({ chartEmpty: 'No measurements in this range' }),
    ]);
    expect(
      query(fixture, '[data-pct-part="message"]')?.textContent?.trim(),
    ).toBe('No measurements in this range');
  });

  it('warns in development of a chart with no name', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    @Component({ imports: [PctChart], template: `<pct-chart ariaLabel=" " />` })
    class Unnamed {}
    await render(Unnamed);
    expect(
      warn.mock.calls.some(([m]) => String(m).startsWith('[pct-chart]')),
    ).toBe(true);
  });

  it('warns in development of rows out of order, and draws them as they come', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    @Component({
      imports: [PctChart, PctLine],
      template: `<pct-chart ariaLabel="x"
        ><pct-line [data]="rows" x="at" y="value" name="Out of order"
      /></pct-chart>`,
    })
    class Unordered {
      readonly rows = [
        { at: 2, value: 1 },
        { at: 1, value: 2 },
      ];
    }
    await render(Unordered);
    expect(warn.mock.calls.some(([m]) => String(m).includes('row 1'))).toBe(
      true,
    );
  });
});

describe('PctChartTable', () => {
  beforeEach(() => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(
      function (this: HTMLElement) {
        return this.tagName === 'PCT-CHART'
          ? ({
              width: 600,
              height: 300,
              top: 0,
              left: 0,
              right: 600,
              bottom: 300,
              x: 0,
              y: 0,
            } as DOMRect)
          : ({
              width: 0,
              height: 0,
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              x: 0,
              y: 0,
            } as DOMRect);
      },
    );
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  });
  afterEach(() => vi.restoreAllMocks());

  it("captions the table with the chart's label and heads a column per series with its unit", async () => {
    const fixture = await render(Host);
    expect(query(fixture, 'pct-chart-table caption')?.textContent?.trim()).toBe(
      'Heat recovery',
    );
    expect(texts(fixture, 'pct-chart-table thead th')).toEqual([
      'Time',
      'Supply air (°C)',
      'Fan power (W)',
    ]);
  });

  it('writes the value of every series at every position, a gap as a gap', async () => {
    const fixture = await render(Host);
    const rows = all(fixture, 'pct-chart-table tbody tr').map((tr) =>
      [...tr.querySelectorAll('th, td')].map((c) => c.textContent?.trim()),
    );
    expect(rows[0]).toEqual(['10/28/26, 12:00:00 AM', '20', '400']);
    expect(rows.find((r) => r[0] === '10/28/26, 12:00:00 PM')).toEqual([
      '10/28/26, 12:00:00 PM',
      'No reading',
      '1,200',
    ]);
    // a step holds its reading between them
    expect(rows.find((r) => r[0] === '10/28/26, 6:00:00 AM')).toEqual([
      '10/28/26, 6:00:00 AM',
      '22.5',
      '400',
    ]);
  });

  it('writes a yes/no series as on and off', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.showHeater.set(true);
    await settle(fixture);
    const heaterColumn = all(fixture, 'pct-chart-table tbody tr').map((tr) =>
      tr.querySelectorAll('td')[2]?.textContent?.trim(),
    );
    expect(heaterColumn).toContain('On');
    expect(heaterColumn).toContain('Off');
  });

  it('gives CSV with a comma between fields where the decimal mark is a point', async () => {
    const fixture = await render(Host);
    const table = fixture.debugElement.query(
      (d) => d.name === 'pct-chart-table',
    ).componentInstance as PctChartTable;
    const en = table.csv().split('\r\n');
    expect(en[0]).toBe('Time,Supply air (°C),Fan power (W)');
    expect(en[1]).toBe('"10/28/26, 12:00:00 AM",20,400');
  });

  it('gives CSV with a semicolon between fields where the decimal mark is a comma, a gap empty', async () => {
    @Component({
      imports: [PctChart, PctLine, PctChartTable],
      template: `<pct-chart #c ariaLabel="Output" locale="pl" timeZone="UTC"
          ><pct-line
            [data]="rows"
            x="at"
            y="value"
            name="Power"
            unit="kW" /></pct-chart
        ><pct-chart-table [chart]="c" />`,
    })
    class Polish {
      readonly rows = [
        { at: T0, value: 1.5 },
        { at: T0 + H, value: null },
      ];
    }
    const pl = await render(Polish);
    const csv = (
      pl.debugElement.query((d) => d.name === 'pct-chart-table')
        .componentInstance as PctChartTable
    )
      .csv()
      .split('\r\n');
    expect(csv[0]).toBe('Time;Power (kW)');
    expect(csv[1]).toBe('28.10.2026, 00:00:00;1,5');
    expect(csv[2]).toBe('28.10.2026, 01:00:00;');
  });

  it('keeps no more rows than it is told, the extremes among them', async () => {
    @Component({
      imports: [PctChart, PctLine, PctChartTable],
      template: `<pct-chart #c ariaLabel="Many" x="linear"
          ><pct-line
            [data]="rows"
            [x]="first"
            [y]="second"
            name="Noise" /></pct-chart
        ><pct-chart-table [chart]="c" [rows]="40" />`,
    })
    class Many {
      readonly rows = Array.from(
        { length: 5000 },
        (_, i) => [i, i === 2345 ? 999 : Math.sin(i)] as const,
      );
      readonly first = (r: readonly [number, number]) => r[0];
      readonly second = (r: readonly [number, number]) => r[1];
    }
    const fixture = await render(Many);
    const rows = all(fixture, 'pct-chart-table tbody tr');
    expect(rows.length).toBeLessThanOrEqual(40);
    expect(texts(fixture, 'pct-chart-table tbody td')).toContain('999');
  });
});
