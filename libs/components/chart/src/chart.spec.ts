import {
  Component,
  ErrorHandler,
  provideZonelessChangeDetection,
  signal,
  Type,
} from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { providePctTexts } from '@pacit/components/core';
import { PctAxis, PctChart, PctChartTooltip } from './chart';
import { PctChartTable } from './chart-table';
import { PctLine, pctSeriesColor } from './line';
import { pctPyramid } from './model/decimate';

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
  observe(): void {
    // The size is given by the stubs, never observed.
  }
  unobserve(): void {
    // Nothing is observed.
  }
  disconnect(): void {
    // Nothing is observed.
  }
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
    // The chart reads its content box, which the stub gives to `pct-chart` alone.
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(
      function (this: HTMLElement) {
        return this.tagName === 'PCT-CHART' ? size.width : 0;
      },
    );
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockImplementation(
      function (this: HTMLElement) {
        return this.tagName === 'PCT-CHART' ? size.height : 0;
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

  it('reads a palette place written as text, and takes a free place for one outside 1 to 8', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    @Component({
      imports: [PctChart, PctLine],
      template: `<pct-chart ariaLabel="Colours" timeZone="UTC">
        <pct-line [data]="rows" x="at" y="value" name="Text" color="3" />
        <pct-line [data]="rows" x="at" y="value" name="Nine" [color]="9" />
        <pct-line
          [data]="rows"
          x="at"
          y="value"
          name="Own"
          color="rebeccapurple"
        />
      </pct-chart>`,
    })
    class Colours {
      readonly rows = temperature;
    }
    const fixture = await render(Colours);
    const paths = all(fixture, 'path[data-pct-part="series"]');
    expect(paths.map((p) => p.getAttribute('data-pct-series'))).toEqual([
      '3',
      '1',
      'custom',
    ]);
    // the consumer's colour is a private property the stylesheet reads, not an inline stroke
    expect(
      (paths[2] as SVGElement).style.getPropertyValue('--_pct-chart-color'),
    ).toBe('rebeccapurple');
    expect((paths[2] as SVGElement).style.stroke).toBe('');
    expect(warn.mock.calls.some(([m]) => String(m).includes('`color` 9'))).toBe(
      true,
    );
  });

  it('gives a place the consumer names to that series, and moves a remembered one off it', async () => {
    @Component({
      imports: [PctChart, PctLine],
      template: `<pct-chart ariaLabel="Places" timeZone="UTC">
        <pct-line [data]="rows" x="at" y="value" name="First" />
        @if (second()) {
          <pct-line [data]="rows" x="at" y="value" name="Second" [color]="1" />
        }
      </pct-chart>`,
    })
    class Places {
      readonly rows = temperature;
      readonly second = signal(false);
    }
    const fixture = await render(Places);
    expect(
      all(fixture, 'path[data-pct-part="series"]').map((p) =>
        p.getAttribute('data-pct-series'),
      ),
    ).toEqual(['1']);
    fixture.componentInstance.second.set(true);
    await settle(fixture);
    expect(
      all(fixture, 'path[data-pct-part="series"]').map((p) =>
        p.getAttribute('data-pct-series'),
      ),
    ).toEqual(['2', '1']);
  });

  it('puts an outer axis on the edge of the plot when the inner slot is empty', async () => {
    @Component({
      imports: [PctChart, PctLine],
      template: `<pct-chart ariaLabel="Outer" timeZone="UTC">
        @if (inner()) {
          <pct-line [data]="rows" x="at" y="value" name="Inner" unit="°C" />
        }
        <pct-line [data]="rows" x="at" y="value" name="Right" unit="W" />
        <pct-line [data]="rows" x="at" y="value" name="Outer" unit="%" />
      </pct-chart>`,
    })
    class Outer {
      readonly rows = temperature;
      readonly inner = signal(true);
    }
    const fixture = await render(Outer);
    const baseOf = (unit: string) =>
      Number(
        query(fixture, `[data-pct-unit="${unit}"] .base`)?.getAttribute('x1'),
      );
    const outerWithInner = baseOf('%');
    const inner = baseOf('°C');
    expect(
      query(fixture, '[data-pct-unit="%"]')?.getAttribute('data-pct-slot'),
    ).toBe('left-outer');
    expect(outerWithInner).toBeLessThan(inner);
    fixture.componentInstance.inner.set(false);
    await settle(fixture);
    // the outer axis keeps its slot and its place, and the plot grows to it instead of
    // leaving the inner axis's room empty
    expect(
      query(fixture, '[data-pct-unit="%"]')?.getAttribute('data-pct-slot'),
    ).toBe('left-outer');
    expect(baseOf('%')).toBe(outerWithInner);
    expect(Number(query(fixture, 'clipPath rect')?.getAttribute('x'))).toBe(
      outerWithInner,
    );
  });

  it('keeps room for a unit wider than its labels', async () => {
    @Component({
      imports: [PctChart, PctLine],
      template: `<pct-chart ariaLabel="Wide" timeZone="UTC">
        <pct-line [data]="rows" x="at" y="value" name="Flow" [unit]="unit()" />
      </pct-chart>`,
    })
    class Wide {
      readonly rows = temperature;
      readonly unit = signal('°C');
    }
    const fixture = await render(Wide);
    const base = () =>
      Number(
        query(fixture, '[data-pct-slot="left"] .base')?.getAttribute('x1'),
      );
    const narrow = base();
    fixture.componentInstance.unit.set('kilowatt hours a day');
    await settle(fixture);
    // without a canvas a text measures 0.6 of the font a character: twenty characters at 13 px
    expect(base()).toBeGreaterThan(narrow);
    expect(base()).toBeGreaterThanOrEqual(20 * 13 * 0.6);
  });

  it('says every series is hidden when every series is', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.hidden.set(['Supply air', 'Fan power']);
    await settle(fixture);
    expect(
      query(fixture, '[data-pct-part="message"]')?.textContent?.trim(),
    ).toBe('Every series is hidden');
    fixture.componentInstance.hidden.set(['Supply air']);
    await settle(fixture);
    expect(query(fixture, '[data-pct-part="message"]')).toBeNull();
  });

  it('hides the description from the page and keeps it on the picture', async () => {
    const fixture = await render(Host);
    const described = query(fixture, '[role="img"]')!.getAttribute(
      'aria-describedby',
    )!;
    expect(query(fixture, `#${described}`)?.hasAttribute('hidden')).toBe(true);
  });

  it('warns in development of a unit with no axis, and of two series with one id', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    @Component({
      imports: [PctChart, PctLine],
      template: `<pct-chart ariaLabel="Crowded" timeZone="UTC">
        <pct-line [data]="rows" x="at" y="value" name="A" unit="a" />
        <pct-line [data]="rows" x="at" y="value" name="B" unit="b" />
        <pct-line [data]="rows" x="at" y="value" name="C" unit="c" />
        <pct-line [data]="rows" x="at" y="value" name="D" unit="d" />
        <pct-line [data]="rows" x="at" y="value" name="E" unit="e" />
        <pct-line [data]="rows" x="at" y="value" name="A" unit="a" />
      </pct-chart>`,
    })
    class Crowded {
      readonly rows = temperature;
    }
    await render(Crowded);
    const messages = warn.mock.calls.map(([m]) => String(m));
    expect(messages.some((m) => m.includes('"E" (e) has no axis'))).toBe(true);
    expect(messages.some((m) => m.includes('share the id "A"'))).toBe(true);
  });
});

describe('pctSeriesColor', () => {
  it('reads places, their text, CSS colours, and nothing else', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    expect(pctSeriesColor(1)).toBe(1);
    expect(pctSeriesColor(8)).toBe(8);
    expect(pctSeriesColor('3')).toBe(3);
    expect(pctSeriesColor(' 4 ')).toBe(4);
    expect(pctSeriesColor(0)).toBeUndefined();
    expect(pctSeriesColor(9)).toBeUndefined();
    expect(pctSeriesColor(2.5)).toBeUndefined();
    expect(pctSeriesColor('12')).toBeUndefined();
    expect(pctSeriesColor('#0f766e')).toBe('#0f766e');
    expect(pctSeriesColor('')).toBeUndefined();
    expect(pctSeriesColor('  ')).toBeUndefined();
    expect(pctSeriesColor(null)).toBeUndefined();
    expect(pctSeriesColor(undefined)).toBeUndefined();
  });
});

describe('PctChartTable', () => {
  beforeEach(() => {
    // The chart reads its content box, which the stub gives to `pct-chart` alone.
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
  it('writes the edges of a window that falls between two readings', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.window.set({ from: T0 + 7 * H, to: T0 + 9 * H });
    await settle(fixture);
    const heads = texts(fixture, 'pct-chart-table tbody th');
    expect(heads).toEqual(['10/28/26, 7:00:00 AM', '10/28/26, 9:00:00 AM']);
  });

  it('names its table by the element naming the chart when it has no caption', async () => {
    @Component({
      imports: [PctChart, PctLine, PctChartTable],
      template: `<h2 id="title">Output</h2>
        <pct-chart #c ariaLabelledby="title" x="linear"
          ><pct-line [data]="rows" x="at" y="value" name="Power" /></pct-chart
        ><pct-chart-table [chart]="c" />`,
    })
    class Labelled {
      readonly rows = [
        { at: 1, value: 2 },
        { at: 2, value: 3 },
      ];
    }
    const fixture = await render(Labelled);
    expect(query(fixture, 'pct-chart-table caption')).toBeNull();
    expect(
      query(fixture, 'pct-chart-table table')?.getAttribute('aria-labelledby'),
    ).toBe('title');
    expect(texts(fixture, 'pct-chart-table thead th')[0]).toBe('Position');
  });

  it('gives CSV a position as a number, values to fifteen digits, and formulas as text', async () => {
    @Component({
      imports: [PctChart, PctLine, PctChartTable],
      template: `<pct-chart #c ariaLabel="Sums" x="linear" locale="en-US"
          ><pct-line
            [data]="rows"
            x="at"
            y="value"
            name="=SUM(A1)" /></pct-chart
        ><pct-chart-table [chart]="c" />`,
    })
    class Sums {
      readonly rows = [
        { at: 1234.5, value: 0.1 + 0.2 },
        { at: 2000, value: -4 },
      ];
    }
    const fixture = await render(Sums);
    const csv = (
      fixture.debugElement.query((d) => d.name === 'pct-chart-table')
        .componentInstance as PctChartTable
    )
      .csv()
      .split('\r\n');
    expect(csv[0]).toBe("Position,'=SUM(A1)");
    expect(csv[1]).toBe('1234.5,0.3');
    expect(csv[2]).toBe('2000,-4');
  });

  it("writes CSV with a point where the locale writes another script's decimal mark", async () => {
    @Component({
      imports: [PctChart, PctLine, PctChartTable],
      template: `<pct-chart #c ariaLabel="Arabic" x="linear" locale="ar-EG"
          ><pct-line [data]="rows" x="at" y="value" name="Level" /></pct-chart
        ><pct-chart-table [chart]="c" />`,
    })
    class Arabic {
      readonly rows = [
        { at: 1, value: 1.5 },
        { at: 2, value: 2 },
      ];
    }
    const fixture = await render(Arabic);
    const csv = (
      fixture.debugElement.query((d) => d.name === 'pct-chart-table')
        .componentInstance as PctChartTable
    )
      .csv()
      .split('\r\n');
    expect(csv[1]).toBe('1,1.5');
  });
});

const chartOf = (fixture: ComponentFixture<unknown>, index = 0) =>
  fixture.debugElement.queryAll((d) => d.name === 'pct-chart')[index]
    .componentInstance as PctChart;
const tableOf = (fixture: ComponentFixture<unknown>) =>
  fixture.debugElement.query((d) => d.name === 'pct-chart-table')
    .componentInstance as PctChartTable;
const attrs = (
  fixture: ComponentFixture<unknown>,
  selector: string,
  name: string,
) => all(fixture, selector).map((e) => e.getAttribute(name));
const clipOf = (fixture: ComponentFixture<unknown>) =>
  ['x', 'y', 'width', 'height'].map((n) =>
    Number(query(fixture, 'clipPath rect')?.getAttribute(n)),
  );
const placesOf = (fixture: ComponentFixture<unknown>) =>
  attrs(fixture, 'path[data-pct-part="series"]', 'data-pct-series');
const chartWarnings = (warn: { mock: { calls: unknown[][] } }) =>
  warn.mock.calls
    .map(([m]) => String(m))
    .filter((m) => m.startsWith('[pct-chart]') || m.startsWith('[pct-line]'));

/** A computed style for `pct-chart` alone: the font, and the gap the skin sets. */
interface Medium {
  fontSize: string;
  fontFamily: string;
  gap: string;
}
function stubMedium(medium: Medium): void {
  const view = document.defaultView!;
  const real = view.getComputedStyle.bind(view);
  vi.spyOn(view, 'getComputedStyle').mockImplementation((element, pseudo) =>
    element.tagName === 'PCT-CHART'
      ? ({
          get fontSize() {
            return medium.fontSize;
          },
          get fontFamily() {
            return medium.fontFamily;
          },
          getPropertyValue: (name: string) =>
            name === '--pct-chart-axis-gap' ? medium.gap : '',
        } as unknown as CSSStyleDeclaration)
      : real(element, pseudo),
  );
}

/** An error handler that keeps what reaches it: an error in a render hook is reported, not thrown. */
function recordErrors(): { errors: unknown[]; provider: unknown } {
  const errors: unknown[] = [];
  return {
    errors,
    provider: {
      provide: ErrorHandler,
      useValue: { handleError: (error: unknown) => errors.push(error) },
    },
  };
}

/** An observer that keeps what it is given, so a case can call it back. */
class RecordingObserver {
  static made: RecordingObserver[] = [];
  readonly observed: Element[] = [];
  disconnected = false;
  constructor(readonly callback: ResizeObserverCallback) {
    RecordingObserver.made.push(this);
  }
  observe(element: Element): void {
    this.observed.push(element);
  }
  unobserve(): void {
    // The chart observes one element and never lets it go but by disconnecting.
  }
  disconnect(): void {
    this.disconnected = true;
  }
  static ofChart(): RecordingObserver | undefined {
    return RecordingObserver.made.find((o) =>
      o.observed.some((e) => e.tagName === 'PCT-CHART'),
    );
  }
}

@Component({
  imports: [PctChart, PctLine],
  template: `<pct-chart ariaLabel="Supply air" timeZone="UTC" locale="en-US">
    <pct-line [data]="rows" x="at" y="value" name="Supply air" unit="°C" />
  </pct-chart>`,
})
class Single {
  readonly rows = temperature;
}

@Component({
  imports: [PctChart, PctLine],
  template: `<pct-chart ariaLabel=" " timeZone="UTC">
    <pct-line [data]="rows" x="at" y="value" name="A" unit="a" />
    <pct-line [data]="rows" x="at" y="value" name="B" unit="b" />
    <pct-line [data]="rows" x="at" y="value" name="C" unit="c" />
    <pct-line [data]="rows" x="at" y="value" name="D" unit="d" />
    <pct-line [data]="rows" x="at" y="value" name="E" unit="" [area]="true" />
    <pct-line [data]="rows" x="at" y="value" name="F" unit="f" />
    <pct-line [data]="rows" x="at" y="value" name="A" unit="a" />
    <pct-line [data]="rows" x="at" y="value" name="B" unit="b" />
    <pct-line [data]="unordered" x="at" y="value" name="Back" unit="a" />
    <pct-line [data]="rows" x="at" y="value" name="Nine" unit="a" [color]="9" />
  </pct-chart>`,
})
class Crowded {
  readonly rows = temperature;
  readonly unordered = [
    { at: T0 + H, value: 1 },
    { at: T0, value: 2 },
  ];
}

describe('PctChart, as laid out', () => {
  beforeEach(() => {
    size = { width: 600, height: 300 };
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(
      function (this: HTMLElement) {
        return this.tagName === 'PCT-CHART' ? size.width : 0;
      },
    );
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockImplementation(
      function (this: HTMLElement) {
        return this.tagName === 'PCT-CHART' ? size.height : 0;
      },
    );
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  });
  afterEach(() => vi.restoreAllMocks());

  it('lays the plot out between its axes, under the units and over the time', async () => {
    const fixture = await render(Host);
    const chart = chartOf(fixture);
    // "22.5" and "1,200" at 0.6 of 13 px a character, and the gap of 6 on both sides
    expect(clipOf(fixture)).toEqual([43.2, 25, 505.8, 250]);
    expect(chart.plotWidth()).toBeCloseTo(505.8, 9);
    expect(chart.axes().map((a) => [a.unit, a.slot, a.x, a.side])).toEqual([
      ['°C', 'left', 43.2, 'start'],
      ['W', 'right', 549, 'end'],
    ]);
    expect(chart.xScale()?.range).toEqual([43.2, 549]);
    expect(
      attrs(fixture, '[data-pct-unit="°C"] .value', 'text-anchor'),
    ).toEqual(Array(7).fill('end'));
    expect(attrs(fixture, '[data-pct-unit="W"] .value', 'text-anchor')).toEqual(
      Array(5).fill('start'),
    );
    // five rows of 48 pixels fit the plot's 250: a tick every 200 W, not every 100
    expect(texts(fixture, '[data-pct-unit="W"] .value')).toEqual([
      '400',
      '600',
      '800',
      '1,000',
      '1,200',
    ]);
    expect(chart.axes()[1].ticks.map((t) => t.y)).toEqual([
      275, 212.5, 150, 87.5, 25,
    ]);
  });

  it('stands the outer axes beyond the inner ones, on both sides', async () => {
    @Component({
      imports: [PctChart, PctLine],
      template: `<pct-chart ariaLabel="Four" timeZone="UTC">
        <pct-line [data]="rows" x="at" y="value" name="A" unit="a" />
        <pct-line [data]="rows" x="at" y="value" name="B" unit="b" />
        <pct-line [data]="rows" x="at" y="value" name="C" unit="cc" />
        <pct-line [data]="rows" x="at" y="value" name="D" unit="mph" />
      </pct-chart>`,
    })
    class Four {
      readonly rows = temperature;
    }
    const fixture = await render(Four);
    const axes = chartOf(fixture).axes();
    expect(axes.map((a) => [a.unit, a.slot, a.side])).toEqual([
      ['a', 'left', 'start'],
      ['b', 'right', 'end'],
      ['cc', 'left-outer', 'start'],
      ['mph', 'right-outer', 'end'],
    ]);
    // each axis takes 31.2 for "22.5" and 12 for its gaps
    expect(axes[0].x).toBeCloseTo(86.4, 9);
    expect(axes[1].x).toBeCloseTo(513.6, 9);
    expect(axes[2].x).toBeCloseTo(43.2, 9);
    expect(axes[3].x).toBeCloseTo(556.8, 9);
    const [x, , width] = clipOf(fixture);
    expect(x).toBeCloseTo(86.4, 9);
    expect(width).toBeCloseTo(427.2, 9);
    expect(
      attrs(fixture, '[data-pct-unit="cc"] .value', 'text-anchor')[0],
    ).toBe('end');
    expect(
      attrs(fixture, '[data-pct-unit="mph"] .value', 'text-anchor')[0],
    ).toBe('start');
  });

  it('keeps a plot of one pixel in a box too small for its axes', async () => {
    size = { width: 60, height: 40 };
    const fixture = await render(Host);
    const [x, y, width, height] = clipOf(fixture);
    // two ticks fit the height, 19 and 22, whose labels are narrower
    expect(x).toBeCloseTo(27.6, 9);
    expect(y).toBe(25);
    expect(width).toBeCloseTo(1, 9);
    expect(height).toBe(1);
  });

  it('lays an empty chart out to its edges, with no time and no grid', async () => {
    const fixture = await render(Empty);
    const chart = chartOf(fixture);
    expect(clipOf(fixture)).toEqual([8, 8, 584, 267]);
    expect(chart.shown()).toBeNull();
    expect(chart.xScale()).toBeNull();
    expect(all(fixture, 'line.tick')).toHaveLength(0);
    expect(all(fixture, 'line.row')).toHaveLength(0);
    expect(all(fixture, 'line.column')).toHaveLength(0);
    expect(all(fixture, 'text.time')).toHaveLength(0);
  });

  it('shows the span of the data, a reading alone with a unit on each side', async () => {
    @Component({
      imports: [PctChart, PctLine],
      template: `<pct-chart ariaLabel="Spans" timeZone="UTC">
        <pct-line [data]="none" x="at" y="value" name="None" unit="°C" />
        <pct-line [data]="rows()" x="at" y="value" name="Some" unit="°C" />
      </pct-chart>`,
    })
    class Spans {
      readonly none: Reading[] = [];
      readonly rows = signal<Reading[]>(temperature);
    }
    const fixture = await render(Spans);
    const chart = chartOf(fixture);
    // the series with no rows spans nothing and moves no end
    expect(chart.shown()).toEqual({ from: T0, to: T0 + 24 * H });
    expect(placesOf(fixture)).toEqual(['1', '2']);
    fixture.componentInstance.rows.set([{ at: T0, value: 1 }]);
    await settle(fixture);
    expect(chart.shown()).toEqual({ from: T0 - 1, to: T0 + 1 });
  });

  it('says it has nothing to draw when the window holds no reading', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.window.set({
      from: T0 + 30 * H,
      to: T0 + 40 * H,
    });
    await settle(fixture);
    expect(
      query(fixture, '[data-pct-part="message"]')?.textContent?.trim(),
    ).toBe('No data to show');
  });

  it('waits for a height as well as a width before it draws', async () => {
    size = { width: 600, height: 0 };
    const fixture = await render(Host);
    expect(query(fixture, 'pct-skeleton')).not.toBeNull();
    expect(query(fixture, '[data-pct-part="data"]')).toBeNull();
  });

  it('waits for a width as well as a height before it draws', async () => {
    size = { width: 0, height: 300 };
    const fixture = await render(Host);
    expect(query(fixture, 'pct-skeleton')).not.toBeNull();
    expect(query(fixture, '[data-pct-part="data"]')).toBeNull();
  });

  it('has no description, no hidden series and no window when given none', async () => {
    const fixture = await render(Empty);
    const chart = chartOf(fixture);
    expect(
      query(fixture, '[role="img"]')?.hasAttribute('aria-describedby'),
    ).toBe(false);
    expect(query(fixture, '.description')).toBeNull();
    expect(chart.hiddenSeries()).toEqual([]);
    expect(chart.window()).toBeNull();
  });

  it('names its clip and its description after the chart', async () => {
    const fixture = await render(Host);
    const clip = query(fixture, 'clipPath')!.id;
    expect(clip).toMatch(/^pct-chart-clip-\d+$/);
    expect(
      query(fixture, '[data-pct-part="data"] > g[clip-path]')?.getAttribute(
        'clip-path',
      ),
    ).toBe(`url(#${clip})`);
    expect(
      query(fixture, '[role="img"]')!.getAttribute('aria-describedby'),
    ).toMatch(/^pct-chart-description-\d+$/);
  });

  it('keeps zero on an axis when the axis says so, and only then', async () => {
    @Component({
      imports: [PctChart, PctLine, PctAxis],
      template: `<pct-chart ariaLabel="Zero" timeZone="UTC">
        @if (zero()) {
          <pct-axis unit="°C" includeZero />
        } @else {
          <pct-axis unit="°C" />
        }
        <pct-line [data]="rows" x="at" y="value" name="T" unit="°C" />
      </pct-chart>`,
    })
    class Zero {
      readonly rows = temperature;
      readonly zero = signal(false);
    }
    const fixture = await render(Zero);
    expect(texts(fixture, '[data-pct-unit="°C"] .value')[0]).toBe('19.5');
    fixture.componentInstance.zero.set(true);
    await settle(fixture);
    expect(texts(fixture, '[data-pct-unit="°C"] .value')[0]).toBe('0');
  });

  it('keeps zero on an axis when one of its series fills an area, and fills none unasked', async () => {
    @Component({
      imports: [PctChart, PctLine],
      template: `<pct-chart ariaLabel="Areas" timeZone="UTC">
        <pct-line [data]="rows" x="at" y="value" name="Line" unit="°C" />
        @if (filled()) {
          <pct-line
            [data]="rows"
            x="at"
            y="value"
            name="Area"
            unit="°C"
            [area]="true"
          />
        }
      </pct-chart>`,
    })
    class Areas {
      readonly rows = temperature;
      readonly filled = signal(false);
    }
    const fixture = await render(Areas);
    expect(query(fixture, 'path[data-pct-part="area"]')).toBeNull();
    expect(texts(fixture, '[data-pct-unit="°C"] .value')[0]).toBe('19.5');
    fixture.componentInstance.filled.set(true);
    await settle(fixture);
    expect(all(fixture, 'path[data-pct-part="area"]')).toHaveLength(1);
    expect(texts(fixture, '[data-pct-unit="°C"] .value')[0]).toBe('0');
  });

  it('runs a yes/no axis from 0 to 1, as wide as its words and not its unit', async () => {
    @Component({
      imports: [PctChart, PctLine],
      template: `<pct-chart ariaLabel="Heater" timeZone="UTC">
        <pct-line [data]="rows" x="at" y="value" name="Heater" unit="boolean" />
      </pct-chart>`,
    })
    class Heater {
      readonly rows = heater;
    }
    const fixture = await render(Heater);
    const [axis] = chartOf(fixture).axes();
    expect(axis.domain).toEqual([0, 1]);
    expect(axis.ticks.map((t) => [t.text, t.y])).toEqual([
      ['Off', 275],
      ['On', 25],
    ]);
    // "Off" at 0.6 of 13 px a character, and not "boolean"
    expect(clipOf(fixture)[0]).toBeCloseTo(35.4, 9);
  });

  it('puts a dot by its unit for each of the first three series in the palette', async () => {
    @Component({
      imports: [PctChart, PctLine],
      template: `<pct-chart ariaLabel="Dots" timeZone="UTC">
        <pct-line
          [data]="rows"
          x="at"
          y="value"
          name="Own"
          unit="°C"
          color="teal"
        />
        <pct-line [data]="rows" x="at" y="value" name="B" unit="°C" />
        <pct-line [data]="rows" x="at" y="value" name="C" unit="°C" />
        <pct-line [data]="rows" x="at" y="value" name="D" unit="°C" />
        <pct-line [data]="rows" x="at" y="value" name="E" unit="°C" />
      </pct-chart>`,
    })
    class Dots {
      readonly rows = temperature;
    }
    const fixture = await render(Dots);
    expect(attrs(fixture, 'circle.dot', 'data-pct-series')).toEqual([
      '2',
      '3',
      '4',
    ]);
    expect(chartOf(fixture).axes()[0].places).toEqual([2, 3, 4]);
  });

  it('takes the palette round again past its eighth place', async () => {
    @Component({
      imports: [PctChart, PctLine],
      template: `<pct-chart ariaLabel="Nine" timeZone="UTC">
        @for (name of names; track name) {
          <pct-line [data]="rows" x="at" y="value" name="Series" [id]="name" />
        }
      </pct-chart>`,
    })
    class Nine {
      readonly rows = temperature;
      readonly names = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
    }
    const fixture = await render(Nine);
    expect(placesOf(fixture)).toEqual([
      '1',
      '2',
      '3',
      '4',
      '5',
      '6',
      '7',
      '8',
      '1',
      '2',
    ]);
  });

  it("draws the grid along the first axis's ticks and the time's, every axis's, or none", async () => {
    @Component({
      imports: [PctChart, PctLine],
      template: `<pct-chart ariaLabel="Grid" timeZone="UTC" [grid]="grid()">
        @if (celsius()) {
          <pct-line [data]="temperature" x="at" y="value" name="T" unit="°C" />
        }
        <pct-line [data]="power" x="at" y="value" name="P" unit="W" />
      </pct-chart>`,
    })
    class Grid {
      readonly temperature = temperature;
      readonly power = power;
      readonly grid = signal<'first' | 'all' | 'none'>('first');
      readonly celsius = signal(true);
    }
    const fixture = await render(Grid);
    const [celsius, watts] = chartOf(fixture).axes();
    const ys = (axis: typeof celsius) => axis.ticks.map((t) => String(t.y));
    const columns = () =>
      attrs(fixture, 'line.column', 'x1').map((x) => Number(x));
    expect(attrs(fixture, 'line.row', 'y1')).toEqual(ys(celsius));
    expect(columns()).toHaveLength(5);
    [43.2, 169.65, 296.1, 422.55, 549].forEach((x, i) =>
      expect(columns()[i]).toBeCloseTo(x, 9),
    );
    fixture.componentInstance.grid.set('all');
    await settle(fixture);
    expect(attrs(fixture, 'line.row', 'y1')).toEqual([
      ...ys(celsius),
      ...ys(watts),
    ]);
    expect(columns()).toHaveLength(5);
    fixture.componentInstance.grid.set('none');
    await settle(fixture);
    expect(all(fixture, 'line.row')).toHaveLength(0);
    expect(all(fixture, 'line.column')).toHaveLength(0);
    // the first axis is the left one: a chart with the right alone draws no rows
    fixture.componentInstance.grid.set('first');
    fixture.componentInstance.celsius.set(false);
    await settle(fixture);
    expect(all(fixture, 'line.row')).toHaveLength(0);
    expect(columns()).toHaveLength(5);
  });

  it('stands a time label that would leave the box inside it, against the edge', async () => {
    const fixture = await render(Single);
    const labels = all(fixture, 'text.time');
    expect(labels.map((l) => l.textContent)).toEqual([
      '10/28',
      '06:00',
      '12:00',
      '18:00',
      '10/29',
    ]);
    // "10/29" is 39 wide: its tick is at the plot's right, 592, its middle at 600 - 19.5
    expect(Number(labels[0].getAttribute('x'))).toBeCloseTo(43.2, 9);
    expect(Number(labels[4].getAttribute('x'))).toBeCloseTo(580.5, 9);
    expect(Number(attrs(fixture, 'line.tick', 'x1')[4])).toBeCloseTo(592, 9);
  });

  it('thins the labels of a numeric axis to twice the gap apart', async () => {
    size = { width: 580, height: 300 };
    @Component({
      imports: [PctChart, PctLine],
      template: `<pct-chart ariaLabel="Linear" x="linear" locale="en-US">
        <pct-line [data]="rows" x="at" y="value" name="Level" />
      </pct-chart>`,
    })
    class Linear {
      readonly rows = [
        { at: 1e6, value: 1 },
        { at: 2e6, value: 2 },
      ];
    }
    const fixture = await render(Linear);
    expect(all(fixture, 'line.tick')).toHaveLength(6);
    expect(texts(fixture, 'text.time')).toEqual([
      '1,000,000',
      '1,400,000',
      '1,800,000',
    ]);
    expect(attrs(fixture, 'text.time', 'data-pct-label')).toEqual([
      'value',
      'value',
      'value',
    ]);
  });

  it('writes the positions and the values of numbers to the digits of their step', async () => {
    @Component({
      imports: [PctChart, PctLine],
      template: `<pct-chart ariaLabel="Small" x="linear" locale="en-US">
        <pct-line [data]="rows" x="at" y="value" name="Level" />
      </pct-chart>`,
    })
    class Small {
      readonly rows = [
        { at: 0.0001, value: 0.0001 },
        { at: 0.0002, value: 0.0002 },
      ];
    }
    const fixture = await render(Small);
    expect(texts(fixture, '.value')).toEqual([
      '0.0001',
      '0.00012',
      '0.00014',
      '0.00016',
      '0.00018',
      '0.0002',
    ]);
    expect(texts(fixture, 'text.time')).toEqual([
      '0.0001',
      '0.00012',
      '0.00014',
      '0.00016',
      '0.00018',
      '0.0002',
    ]);
  });

  it('reads the font, the gap and the pixel ratio of its medium', async () => {
    stubMedium({ fontSize: '20px', fontFamily: '', gap: '10' });
    const view = document.defaultView!;
    const ratio = Object.getOwnPropertyDescriptor(view, 'devicePixelRatio');
    Object.defineProperty(view, 'devicePixelRatio', {
      configurable: true,
      value: 2,
    });
    try {
      const fixture = await render(Host);
      const chart = chartOf(fixture);
      expect(chart.pixel()).toBe(0.5);
      // a line of 28 for 20 px, and the gap of 10 under the units and over the time
      expect(clipOf(fixture)).toEqual([44, 38, 476, 224]);
      // "19" and "1,200" at 0.6 of 20 px a character, and the gap of 10 on both sides
      expect(chart.axes().map((a) => a.x)).toEqual([44, 520]);
    } finally {
      if (ratio) Object.defineProperty(view, 'devicePixelRatio', ratio);
      else delete (view as { devicePixelRatio?: number }).devicePixelRatio;
    }
  });

  it('takes a gap of nothing when the skin sets it so', async () => {
    stubMedium({ fontSize: '', fontFamily: '', gap: '0' });
    const fixture = await render(Host);
    expect(clipOf(fixture)[1]).toBe(19);
  });

  it('reads its medium again when a web font arrives, until it is gone', async () => {
    const medium = { fontSize: '', fontFamily: '', gap: '' };
    stubMedium(medium);
    const fonts = new EventTarget();
    const add = vi.spyOn(fonts, 'addEventListener');
    const remove = vi.spyOn(fonts, 'removeEventListener');
    Object.defineProperty(document, 'fonts', {
      configurable: true,
      value: fonts,
    });
    try {
      const fixture = await render(Single);
      expect(clipOf(fixture)[1]).toBe(25);
      medium.fontSize = '20px';
      fonts.dispatchEvent(new Event('loadingdone'));
      await settle(fixture);
      expect(clipOf(fixture)[1]).toBe(34);
      expect(add).toHaveBeenCalledWith('loadingdone', expect.any(Function));
      fixture.destroy();
      expect(remove).toHaveBeenCalledWith('loadingdone', add.mock.calls[0][1]);
    } finally {
      delete (document as { fonts?: unknown }).fonts;
    }
  });

  it('follows the size of its box, and stops when it is gone', async () => {
    RecordingObserver.made = [];
    vi.stubGlobal('ResizeObserver', RecordingObserver);
    const { errors, provider } = recordErrors();
    try {
      const fixture = await render(Single, [provider]);
      const chart = chartOf(fixture);
      const observer = RecordingObserver.ofChart()!;
      expect(observer.observed).toEqual([
        fixture.nativeElement.querySelector('pct-chart'),
      ]);
      const resize = (width: number, height: number) =>
        observer.callback(
          [{ contentRect: { width, height } } as ResizeObserverEntry],
          observer as unknown as ResizeObserver,
        );
      // the width alone changes
      resize(400.4, 300);
      await settle(fixture);
      expect(chart.plotWidth()).toBeCloseTo(348.8, 9);
      // the height alone changes
      resize(400, 200.2);
      await settle(fixture);
      expect(clipOf(fixture)[3]).toBe(150);
      expect(observer.disconnected).toBe(false);
      fixture.destroy();
      expect(observer.disconnected).toBe(true);
      expect(errors).toEqual([]);
    } finally {
      vi.stubGlobal('ResizeObserver', QuietObserver);
    }
  });

  it('follows its box where the fonts can tell nothing', async () => {
    RecordingObserver.made = [];
    vi.stubGlobal('ResizeObserver', RecordingObserver);
    Object.defineProperty(document, 'fonts', { configurable: true, value: {} });
    const { errors, provider } = recordErrors();
    try {
      const fixture = await render(Single, [provider]);
      expect(RecordingObserver.ofChart()).toBeDefined();
      fixture.destroy();
      expect(RecordingObserver.ofChart()?.disconnected).toBe(true);
      expect(errors).toEqual([]);
    } finally {
      delete (document as { fonts?: unknown }).fonts;
      vi.stubGlobal('ResizeObserver', QuietObserver);
    }
  });

  it('follows its box where the document has no fonts to watch', async () => {
    RecordingObserver.made = [];
    vi.stubGlobal('ResizeObserver', RecordingObserver);
    const { errors, provider } = recordErrors();
    try {
      expect(document.fonts).toBeUndefined();
      await render(Single, [provider]);
      expect(RecordingObserver.ofChart()).toBeDefined();
      expect(errors).toEqual([]);
    } finally {
      vi.stubGlobal('ResizeObserver', QuietObserver);
    }
  });

  it('draws at the size it first had where there is no ResizeObserver', async () => {
    vi.stubGlobal('ResizeObserver', undefined);
    const { errors, provider } = recordErrors();
    try {
      const fixture = await render(Single, [provider]);
      expect(clipOf(fixture)).toEqual([43.2, 25, 548.8, 250]);
      expect(errors).toEqual([]);
    } finally {
      vi.stubGlobal('ResizeObserver', QuietObserver);
    }
  });

  it('warns of nothing when it is named, its units fit and its ids differ', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    await render(Host);
    expect(chartWarnings(warn)).toEqual([]);
  });

  it('warns of a chart named by an element of a blank id', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    @Component({
      imports: [PctChart],
      template: `<pct-chart ariaLabelledby=" " />`,
    })
    class Blank {}
    await render(Blank);
    expect(chartWarnings(warn)).toEqual([
      '[pct-chart] A chart with neither `ariaLabel` nor `ariaLabelledby`. The picture is ' +
        'announced by its name, so a reader meets an image with none.',
    ]);
  });

  it('warns in words of the series with no axis, the ids shared, the rows unordered and the colour no place', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const fixture = await render(Crowded);
    const messages = chartWarnings(warn);
    expect(messages).toContain(
      '[pct-chart] "E" (no unit), "F" (f) has no axis: a chart holds four units at most, ' +
        'and the series is not drawn. Ask `pctAxisFits` before adding one.',
    );
    expect(messages).toContain(
      '[pct-chart] Two series share the id "A", "B". A series is told apart by its `id` ' +
        '(its `name` when unset): give each its own.',
    );
    expect(messages).toContain(
      '[pct-line] The rows of "Back" are not ordered by `x`: row 1 stands before the one ' +
        'ahead of it. A chart reads its rows in order and does not sort them.',
    );
    expect(messages).toContain(
      '[pct-line] `color` 9 is no place of the palette, which runs from 1 to 8: the series ' +
        'takes the next free place.',
    );
    // a series with no axis has no scale to draw with: no line and no area
    expect(attrs(fixture, 'path[data-pct-part="area"]', 'd')).toEqual(['']);
    expect(attrs(fixture, 'path[data-pct-part="series"]', 'd')[4]).toBe('');
  });

  it('warns of nothing outside development', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const global = globalThis as { ngDevMode?: unknown };
    const before = global.ngDevMode;
    global.ngDevMode = false;
    try {
      await render(Crowded);
    } finally {
      global.ngDevMode = before;
    }
    expect(chartWarnings(warn)).toEqual([]);
  });

  it('answers for a series it does not hold with nothing', async () => {
    const fixture = await render(Host);
    const chart = chartOf(fixture);
    expect(chart.markOf('Nothing')).toBeUndefined();
    expect(chart.valueAt('Nothing', T0)).toBeNull();
    expect(chart.valueAt('Supply air', T0)).toBe(20);
    const line = chart.markOf('Supply air')!;
    const all24 = { from: T0, to: T0 + 24 * H };
    expect(line.valueAt('Fan power', T0)).toBeNull();
    expect(line.extent('Fan power', all24)).toBeNull();
    expect(line.extent('Supply air', all24)).toEqual([19.5, 22.5]);
    expect(line.pyramidOf('Supply air')).toEqual(
      pctPyramid(line.readings('Supply air')),
    );
  });

  it('holds the last reading of a step to its end, and a line to its last reading', async () => {
    @Component({
      imports: [PctChart, PctLine],
      template: `<pct-chart ariaLabel="Ended" x="linear">
          <pct-line
            [data]="rows"
            x="at"
            y="value"
            name="Level"
            curve="step"
            [end]="4"
            [area]="true"
          /> </pct-chart
        ><pct-chart ariaLabel="Ramp" x="linear">
          <pct-line [data]="rows" x="at" y="value" name="Ramp" [end]="4" />
        </pct-chart>`,
    })
    class Ended {
      readonly rows = [
        { at: 0, value: 1 },
        { at: 1, value: 3 },
        { at: 2, value: 2 },
      ];
    }
    const fixture = await render(Ended);
    const step = chartOf(fixture, 0);
    const ramp = chartOf(fixture, 1);
    expect(step.shown()).toEqual({ from: 0, to: 4 });
    expect(step.valueAt('Level', 3)).toBe(2);
    expect(ramp.shown()).toEqual({ from: 0, to: 4 });
    expect(ramp.valueAt('Ramp', 3)).toBeNull();
    const first = fixture.nativeElement.querySelector('pct-chart');
    expect(
      [...first.querySelectorAll('path')].map((p: Element) =>
        p.getAttribute('d'),
      ),
    ).toEqual([
      'M35 275L35 192L175 192L175 25L314 25L314 108L592 108L592 275Z',
      'M35 192L175 192L175 25L314 25L314 108L592 108',
    ]);
  });

  it('fills an area down to the lower end of an axis that keeps zero out', async () => {
    @Component({
      imports: [PctChart, PctLine, PctAxis],
      template: `<pct-chart ariaLabel="Floor" timeZone="UTC">
        <pct-axis unit="°C" [floor]="10" [ceiling]="40" />
        <pct-line
          [data]="rows"
          x="at"
          y="value"
          name="T"
          unit="°C"
          [area]="true"
        />
      </pct-chart>`,
    })
    class Floor {
      readonly rows = temperature;
    }
    const fixture = await render(Floor);
    expect(attrs(fixture, 'path[data-pct-part="area"]', 'd')).toEqual([
      'M28 275L28 192L169 171L169 275ZM451 275L451 183L592 196L592 275Z',
    ]);
  });

  it('paints a palette place from the stylesheet, with no colour of its own', async () => {
    @Component({
      imports: [PctChart, PctLine],
      template: `<pct-chart ariaLabel="Place" timeZone="UTC">
        <pct-line [data]="rows" x="at" y="value" name="Three" [color]="3" />
      </pct-chart>`,
    })
    class Place {
      readonly rows = temperature;
    }
    const fixture = await render(Place);
    const path = query(fixture, 'path[data-pct-part="series"]') as SVGElement;
    expect(path.getAttribute('data-pct-series')).toBe('3');
    expect(path.style.getPropertyValue('--_pct-chart-color')).toBe('');
  });
});

describe('pctSeriesColor, read whole', () => {
  it('reads a text as a place only when it is digits from end to end', () => {
    expect(pctSeriesColor('a3')).toBe('a3');
    expect(pctSeriesColor('3a')).toBe('3a');
  });
});

describe('PctChartTable, row by row', () => {
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
  });
  afterEach(() => vi.restoreAllMocks());

  const heads = (fixture: ComponentFixture<unknown>) =>
    texts(fixture, 'pct-chart-table tbody th');

  it('writes a row for every reading the rows allow, in order', async () => {
    const fixture = await render(Host);
    expect(heads(fixture)).toEqual([
      '10/28/26, 12:00:00 AM',
      '10/28/26, 6:00:00 AM',
      '10/28/26, 12:00:00 PM',
      '10/28/26, 6:00:00 PM',
      '10/29/26, 12:00:00 AM',
    ]);
  });

  it('leaves a hidden series out of the table', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.hidden.set(['Fan power']);
    await settle(fixture);
    expect(texts(fixture, 'pct-chart-table thead th')).toEqual([
      'Time',
      'Supply air (°C)',
    ]);
  });

  it('has no rows for a chart with no data', async () => {
    @Component({
      imports: [PctChart, PctChartTable],
      template: `<pct-chart #c ariaLabel="None" /><pct-chart-table
          [chart]="c"
        />`,
    })
    class Nothing {}
    const fixture = await render(Nothing);
    expect(all(fixture, 'pct-chart-table tbody tr')).toHaveLength(0);
    expect(tableOf(fixture).csv()).toBe('Time');
  });

  it('writes a row on a window edge only where a series holds a value there', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.window.set({ from: T0 - 2 * H, to: T0 + 2 * H });
    await settle(fixture);
    expect(heads(fixture)).toEqual([
      '10/28/26, 12:00:00 AM',
      '10/28/26, 2:00:00 AM',
    ]);
  });

  it("writes a reading on the window's first edge, a gap among them", async () => {
    const fixture = await render(Host);
    fixture.componentInstance.showPower.set(false);
    fixture.componentInstance.window.set({
      from: T0 + 12 * H,
      to: T0 + 24 * H,
    });
    await settle(fixture);
    expect(heads(fixture)).toEqual([
      '10/28/26, 12:00:00 PM',
      '10/28/26, 6:00:00 PM',
      '10/29/26, 12:00:00 AM',
    ]);
  });

  it('writes the edges and the readings between them in order', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.window.set({ from: T0 + H, to: T0 + 23 * H });
    await settle(fixture);
    expect(heads(fixture)).toEqual([
      '10/28/26, 1:00:00 AM',
      '10/28/26, 6:00:00 AM',
      '10/28/26, 12:00:00 PM',
      '10/28/26, 6:00:00 PM',
      '10/28/26, 11:00:00 PM',
    ]);
  });

  it('shares the rows among the series', async () => {
    @Component({
      imports: [PctChart, PctLine, PctChartTable],
      template: `<pct-chart #c ariaLabel="Two" x="linear"
          ><pct-line [data]="rows" [x]="at" [y]="sine" name="Sine" /><pct-line
            [data]="rows"
            [x]="at"
            [y]="cosine"
            name="Cosine" /></pct-chart
        ><pct-chart-table [chart]="c" [rows]="40" />`,
    })
    class Two {
      readonly rows = Array.from(
        { length: 5000 },
        (_, i) =>
          [
            i,
            i === 2345 ? 999 : Math.sin(i),
            Math.sin(i / 7 + Math.PI / 2),
          ] as const,
      );
      readonly at = (r: readonly number[]) => r[0];
      readonly sine = (r: readonly number[]) => r[1];
      readonly cosine = (r: readonly number[]) => r[2];
    }
    const fixture = await render(Two);
    // five columns a series, four readings a column at most, and the two edges
    expect(all(fixture, 'pct-chart-table tbody tr')).toHaveLength(30);
  });

  it('writes the positions of a numeric axis as numbers', async () => {
    @Component({
      imports: [PctChart, PctLine, PctChartTable],
      template: `<pct-chart #c ariaLabel="Positions" x="linear" locale="en-US"
          ><pct-line [data]="rows" x="at" y="value" name="Level" /></pct-chart
        ><pct-chart-table [chart]="c" />`,
    })
    class Positions {
      readonly rows = [
        { at: 1, value: 2 },
        { at: 1500, value: 3 },
      ];
    }
    const fixture = await render(Positions);
    expect(heads(fixture)).toEqual(['1', '1,500']);
  });

  it('writes a yes/no value as on from one half up', async () => {
    @Component({
      imports: [PctChart, PctLine, PctChartTable],
      template: `<pct-chart #c ariaLabel="Half" x="linear"
          ><pct-line
            [data]="rows"
            x="at"
            y="value"
            name="Valve"
            unit="boolean" /></pct-chart
        ><pct-chart-table [chart]="c" />`,
    })
    class Half {
      readonly rows = [
        { at: 0, value: 0 },
        { at: 1, value: 0.4 },
        { at: 2, value: 0.5 },
        { at: 3, value: 0.6 },
      ];
    }
    const fixture = await render(Half);
    expect(texts(fixture, 'pct-chart-table tbody td')).toEqual([
      'Off',
      'Off',
      'On',
      'On',
    ]);
  });

  it('heads a CSV with quotes doubled, a dash inside a name as text, and no unit for yes/no', async () => {
    @Component({
      imports: [PctChart, PctLine, PctChartTable],
      template: `<pct-chart #c ariaLabel="Heads" x="linear" locale="en-US"
          ><pct-line [data]="rows" x="at" y="value" [name]="quoted" /><pct-line
            [data]="rows"
            x="at"
            y="value"
            name="Supply-air" /><pct-line
            [data]="rows"
            x="at"
            y="value"
            name="Heater"
            unit="boolean" /></pct-chart
        ><pct-chart-table [chart]="c" />`,
    })
    class Heads {
      readonly quoted = 'Say "hi"';
      readonly rows = [
        { at: 1, value: 0 },
        { at: 2, value: 1 },
      ];
    }
    const fixture = await render(Heads);
    expect(tableOf(fixture).csv().split('\r\n')[0]).toBe(
      'Position,"Say ""hi""",Supply-air,Heater',
    );
  });
});

describe('PctChart, with its series bound', () => {
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
  });

  it('reads a name bound inside a repeated block once it is set, and warns of nothing', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    @Component({
      imports: [PctChart, PctLine],
      template: `<pct-chart ariaLabel="Rooms" timeZone="UTC">
        @for (room of rooms; track room) {
          <pct-line [data]="rows" x="at" y="value" [name]="room" unit="°C" />
        }
      </pct-chart>`,
    })
    class Rooms {
      readonly rows = temperature;
      readonly rooms = ['Kitchen', 'Hall'];
    }
    const fixture = await render(Rooms);
    expect(
      all(fixture, 'path[data-pct-part="series"]').map((p) =>
        p.getAttribute('data-pct-series'),
      ),
    ).toEqual(['1', '2']);
    expect(warn.mock.calls.map(([m]) => String(m).slice(0, 40))).toEqual([]);
  });

  it('writes a lone tick to the step the axis would have had', async () => {
    @Component({
      imports: [PctChart, PctLine, PctAxis],
      template: `<pct-chart
        ariaLabel="Lone"
        timeZone="UTC"
        style="height: 60px"
      >
        <pct-line [data]="rows" x="at" y="value" name="Share" unit="%" />
        <pct-axis unit="%" [floor]="0.41" [ceiling]="0.59" />
      </pct-chart>`,
    })
    class Lone {
      readonly rows = [
        { at: T0, value: 0.45 },
        { at: T0 + H, value: 0.55 },
      ];
    }
    // a chart this short asks for two ticks, and 0.41 to 0.59 holds one step of 0.1
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockImplementation(
      function (this: HTMLElement) {
        return this.tagName === 'PCT-CHART' ? 90 : 0;
      },
    );
    const fixture = await render(Lone);
    expect(texts(fixture, '[data-pct-unit="%"] .value')).toEqual(['0.5']);
  });

  it('writes a lone tick far from zero to the step of its span, not of its ends', async () => {
    @Component({
      imports: [PctChart, PctLine, PctAxis],
      template: `<pct-chart ariaLabel="Lone" timeZone="UTC" locale="en-US">
        <pct-line [data]="rows" x="at" y="value" name="Level" unit="m" />
        <pct-axis unit="m" [floor]="10.41" [ceiling]="10.59" />
      </pct-chart>`,
    })
    class Far {
      readonly rows = [
        { at: T0, value: 10.45 },
        { at: T0 + H, value: 10.55 },
      ];
    }
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockImplementation(
      function (this: HTMLElement) {
        return this.tagName === 'PCT-CHART' ? 90 : 0;
      },
    );
    const fixture = await render(Far);
    expect(texts(fixture, '[data-pct-unit="m"] .value')).toEqual(['10.5']);
  });
});

/** A pointer event jsdom can dispatch: a mouse event with a pointer's fields. */
function pointer(
  type: string,
  init: { x: number; y?: number; kind?: string; id?: number; button?: number },
): Event {
  const event = new MouseEvent(type, {
    bubbles: true,
    clientX: init.x,
    clientY: init.y ?? 100,
    button: init.button ?? 0,
  });
  Object.assign(event, {
    pointerType: init.kind ?? 'mouse',
    pointerId: init.id ?? 1,
    isPrimary: true,
  });
  return event;
}

describe('PctChart, its cursor', () => {
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
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  const range = (fixture: ComponentFixture<unknown>) =>
    query(fixture, 'input[data-pct-part="range"]') as HTMLInputElement;
  const overlay = (fixture: ComponentFixture<unknown>) =>
    query(fixture, '.overlay') as HTMLElement;
  const key = async (
    fixture: ComponentFixture<unknown>,
    name: string,
  ): Promise<KeyboardEvent> => {
    const event = new KeyboardEvent('keydown', {
      key: name,
      bubbles: true,
      cancelable: true,
    });
    range(fixture).dispatchEvent(event);
    await settle(fixture);
    return event;
  };
  const at = (fixture: ComponentFixture<unknown>, x: number) =>
    chartOf(fixture).xScale()!.map(x);

  it('is a range beside the picture, named by the chart, its value the middle while there is no cursor', async () => {
    const fixture = await render(Host);
    const input = range(fixture);
    expect(input.type).toBe('range');
    expect(input.getAttribute('step')).toBe('any');
    expect(input.getAttribute('dir')).toBe('ltr');
    expect(input.getAttribute('aria-label')).toBe('Heat recovery');
    expect(input.closest('[role="img"]')).toBeNull();
    expect(Number(input.getAttribute('min'))).toBe(T0);
    expect(Number(input.getAttribute('max'))).toBe(T0 + 24 * H);
    expect(Number(input.value)).toBe(T0 + 12 * H);
    expect(input.getAttribute('aria-valuetext')).toBe('No reading selected');
    const keys = input.getAttribute('aria-describedby')!;
    expect(query(fixture, `#${keys}`)?.textContent).toContain(
      'Arrow keys move from reading to reading',
    );
    expect(query(fixture, `#${keys}`)?.hasAttribute('hidden')).toBe(true);
    expect(chartOf(fixture).cursor()).toBeNull();
    expect(chartOf(fixture).reading()).toBeNull();
    expect(query(fixture, '[data-pct-part="cursor"]')).toBeNull();
  });

  it('reads every series under a cursor set from outside, and draws its line and markers', async () => {
    const fixture = await render(Host);
    chartOf(fixture).cursor.set(T0 + 6 * H);
    await settle(fixture);
    const reading = chartOf(fixture).reading()!;
    expect(reading.x).toBe(T0 + 6 * H);
    expect(reading.text).toBe('Oct 28, 06:00 AM');
    expect(reading.rows.map((r) => [r.id, r.place, r.value, r.text])).toEqual([
      ['Supply air', 1, 22.5, '22.5 °C'],
      ['Fan power', 2, 400, '400 W'],
    ]);
    expect(range(fixture).getAttribute('aria-valuetext')).toBe(
      'Oct 28, 2026, 06:00 AM: Supply air 22.5 °C, Fan power 400 W',
    );
    expect(Number(range(fixture).value)).toBe(T0 + 6 * H);
    const line = query(fixture, '[data-pct-part="cursor"]') as HTMLElement;
    expect(line.style.transform).toBe(
      `translateX(${at(fixture, T0 + 6 * H)}px)`,
    );
    const markers = all(fixture, '[data-pct-part="marker"]');
    expect(markers.map((m) => m.getAttribute('data-pct-series'))).toEqual([
      '1',
      '2',
    ]);
    expect(texts(fixture, '[data-pct-part="tooltip"] .value')).toEqual([
      '22.5 °C',
      '400 W',
    ]);
    expect(texts(fixture, '[data-pct-part="tooltip"] .time')).toEqual([
      'Oct 28, 06:00 AM',
    ]);
  });

  it('writes a gap as a gap, draws no marker there, and leaves a hidden series out', async () => {
    const fixture = await render(Host);
    chartOf(fixture).cursor.set(T0 + 13 * H);
    fixture.componentInstance.hidden.set(['Fan power']);
    await settle(fixture);
    expect(
      chartOf(fixture)
        .reading()!
        .rows.map((r) => r.text),
    ).toEqual(['No reading']);
    expect(all(fixture, '[data-pct-part="marker"]')).toHaveLength(0);
  });

  it('keeps the cursor when the window moves past it, and draws no line outside', async () => {
    const fixture = await render(Host);
    chartOf(fixture).cursor.set(T0 + 2 * H);
    fixture.componentInstance.window.set({ from: T0 + 6 * H, to: T0 + 18 * H });
    await settle(fixture);
    expect(chartOf(fixture).cursor()).toBe(T0 + 2 * H);
    expect(query(fixture, '[data-pct-part="cursor"]')).toBeNull();
    expect(query(fixture, '[data-pct-part="tooltip"]')).toBeNull();
  });

  it('steps from reading to reading on the arrows, and pins the cursor', async () => {
    const fixture = await render(Host);
    const right = await key(fixture, 'ArrowRight');
    expect(right.defaultPrevented).toBe(true);
    expect(chartOf(fixture).cursor()).toBe(T0);
    await key(fixture, 'ArrowRight');
    expect(chartOf(fixture).cursor()).toBe(T0 + 6 * H);
    await key(fixture, 'ArrowUp');
    // the gap at noon is no reading of the supply, and the fan's reading is
    expect(chartOf(fixture).cursor()).toBe(T0 + 12 * H);
    await key(fixture, 'ArrowLeft');
    expect(chartOf(fixture).cursor()).toBe(T0 + 6 * H);
    await key(fixture, 'ArrowDown');
    expect(chartOf(fixture).cursor()).toBe(T0);
    await key(fixture, 'ArrowDown');
    expect(chartOf(fixture).cursor()).toBe(T0);
    // a mouse passing over a pinned cursor leaves it
    overlay(fixture).dispatchEvent(
      pointer('pointermove', { x: at(fixture, T0 + 9 * H) }),
    );
    await settle(fixture);
    expect(chartOf(fixture).cursor()).toBe(T0);
  });

  it('places a first cursor on the last reading from the left arrow', async () => {
    const fixture = await render(Host);
    await key(fixture, 'ArrowLeft');
    expect(chartOf(fixture).cursor()).toBe(T0 + 24 * H);
  });

  it('goes to the ends on Home and End, and a tenth of the window on the page keys', async () => {
    const fixture = await render(Host);
    await key(fixture, 'End');
    expect(chartOf(fixture).cursor()).toBe(T0 + 24 * H);
    await key(fixture, 'Home');
    expect(chartOf(fixture).cursor()).toBe(T0);
    await key(fixture, 'PageUp');
    // a tenth is 2.4 hours: the first reading at or past it is 06:00
    expect(chartOf(fixture).cursor()).toBe(T0 + 6 * H);
    await key(fixture, 'PageDown');
    expect(chartOf(fixture).cursor()).toBe(T0);
    chartOf(fixture).cursor.set(null);
    await settle(fixture);
    await key(fixture, 'PageDown');
    expect(chartOf(fixture).cursor()).toBe(T0 + 24 * H);
    chartOf(fixture).cursor.set(null);
    await settle(fixture);
    await key(fixture, 'PageUp');
    expect(chartOf(fixture).cursor()).toBe(T0);
  });

  it('clears the cursor on Escape and Delete, and leaves Escape to the page without one', async () => {
    const fixture = await render(Host);
    await key(fixture, 'Home');
    const escape = await key(fixture, 'Escape');
    expect(escape.defaultPrevented).toBe(true);
    expect(chartOf(fixture).cursor()).toBeNull();
    expect((await key(fixture, 'Escape')).defaultPrevented).toBe(false);
    await key(fixture, 'End');
    await key(fixture, 'Delete');
    expect(chartOf(fixture).cursor()).toBeNull();
    expect((await key(fixture, 'Tab')).defaultPrevented).toBe(false);
    expect((await key(fixture, 'a')).defaultPrevented).toBe(false);
  });

  it('steps the way a change without a key moved the range, and writes its own value back', async () => {
    const fixture = await render(Host);
    const input = range(fixture);
    input.value = String(T0 + 20 * H);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await settle(fixture);
    // up from the middle with no cursor: the first reading of the window
    expect(chartOf(fixture).cursor()).toBe(T0);
    expect(Number(input.value)).toBe(T0);
    input.value = String(T0 + 3 * H);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await settle(fixture);
    expect(chartOf(fixture).cursor()).toBe(T0 + 6 * H);
    input.value = String(T0 + H);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await settle(fixture);
    expect(chartOf(fixture).cursor()).toBe(T0);
    // the same value again moves nothing
    input.value = String(T0);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await settle(fixture);
    expect(chartOf(fixture).cursor()).toBe(T0);
  });

  it('follows a mouse over the plot, and lets go when it leaves', async () => {
    const fixture = await render(Host);
    const x = at(fixture, T0 + 9 * H);
    overlay(fixture).dispatchEvent(pointer('pointermove', { x }));
    await settle(fixture);
    expect(chartOf(fixture).cursor()).toBeCloseTo(T0 + 9 * H, -3);
    // over an axis, off the plot: no cursor
    overlay(fixture).dispatchEvent(pointer('pointermove', { x: 2 }));
    await settle(fixture);
    expect(chartOf(fixture).cursor()).toBeNull();
    overlay(fixture).dispatchEvent(pointer('pointermove', { x }));
    overlay(fixture).dispatchEvent(pointer('pointerleave', { x }));
    await settle(fixture);
    expect(chartOf(fixture).cursor()).toBeNull();
  });

  it('pins on a click, and lets go on a click on its line', async () => {
    const fixture = await render(Host);
    const x = at(fixture, T0 + 9 * H);
    const layer = overlay(fixture);
    layer.dispatchEvent(pointer('pointerdown', { x }));
    layer.dispatchEvent(pointer('pointerup', { x }));
    await settle(fixture);
    expect(chartOf(fixture).cursor()).toBeCloseTo(T0 + 9 * H, -3);
    layer.dispatchEvent(pointer('pointermove', { x: x + 40 }));
    layer.dispatchEvent(pointer('pointerleave', { x: x + 40 }));
    await settle(fixture);
    expect(chartOf(fixture).cursor()).toBeCloseTo(T0 + 9 * H, -3);
    layer.dispatchEvent(pointer('pointerdown', { x: x + 12 }));
    layer.dispatchEvent(pointer('pointerup', { x: x + 12 }));
    await settle(fixture);
    expect(chartOf(fixture).cursor()).toBeNull();
    // a right button is no click of the chart's
    layer.dispatchEvent(pointer('pointerdown', { x, button: 2 }));
    layer.dispatchEvent(pointer('pointerup', { x, button: 2 }));
    await settle(fixture);
    expect(chartOf(fixture).cursor()).toBeNull();
  });

  it('places the cursor on a tap, moves it on a tap away from it, and clears it on one at its line', async () => {
    const fixture = await render(Host);
    const layer = overlay(fixture);
    const tap = async (x: number) => {
      layer.dispatchEvent(pointer('pointerdown', { x, kind: 'touch' }));
      layer.dispatchEvent(pointer('pointerup', { x, kind: 'touch' }));
      await settle(fixture);
    };
    await tap(at(fixture, T0 + 6 * H));
    expect(chartOf(fixture).cursor()).toBeCloseTo(T0 + 6 * H, -3);
    await tap(at(fixture, T0 + 18 * H));
    expect(chartOf(fixture).cursor()).toBeCloseTo(T0 + 18 * H, -3);
    await tap(at(fixture, T0 + 18 * H) - 10);
    expect(chartOf(fixture).cursor()).toBeNull();
    // a finger that moves is a scroll or a pan, not a tap
    const x = at(fixture, T0 + 6 * H);
    layer.dispatchEvent(pointer('pointerdown', { x, kind: 'touch' }));
    layer.dispatchEvent(pointer('pointermove', { x: x + 20, kind: 'touch' }));
    layer.dispatchEvent(pointer('pointerup', { x: x + 20, kind: 'touch' }));
    await settle(fixture);
    expect(chartOf(fixture).cursor()).toBeNull();
    // and one the page takes back is nothing
    layer.dispatchEvent(pointer('pointerdown', { x, kind: 'touch' }));
    layer.dispatchEvent(pointer('pointercancel', { x, kind: 'touch' }));
    layer.dispatchEvent(pointer('pointerup', { x, kind: 'touch' }));
    await settle(fixture);
    expect(chartOf(fixture).cursor()).toBeNull();
  });

  it('drags the cursor under a finger held still', async () => {
    vi.useFakeTimers();
    const fixture = await render(Host);
    const layer = overlay(fixture);
    const x = at(fixture, T0 + 6 * H);
    layer.dispatchEvent(pointer('pointerdown', { x, kind: 'touch' }));
    vi.advanceTimersByTime(299);
    expect(chartOf(fixture).cursor()).toBeNull();
    vi.advanceTimersByTime(1);
    expect(chartOf(fixture).cursor()).toBeCloseTo(T0 + 6 * H, -3);
    const later = at(fixture, T0 + 15 * H);
    layer.dispatchEvent(pointer('pointermove', { x: later, kind: 'touch' }));
    expect(chartOf(fixture).cursor()).toBeCloseTo(T0 + 15 * H, -3);
    layer.dispatchEvent(pointer('pointerup', { x: later, kind: 'touch' }));
    // lifting it leaves the cursor where it was dragged
    expect(chartOf(fixture).cursor()).toBeCloseTo(T0 + 15 * H, -3);
  });

  it('does not hold a finger that moved before the time was up', async () => {
    vi.useFakeTimers();
    const fixture = await render(Host);
    const layer = overlay(fixture);
    const x = at(fixture, T0 + 6 * H);
    layer.dispatchEvent(pointer('pointerdown', { x, kind: 'touch' }));
    layer.dispatchEvent(pointer('pointermove', { x: x + 9, kind: 'touch' }));
    vi.advanceTimersByTime(400);
    expect(chartOf(fixture).cursor()).toBeNull();
  });

  it('takes no hover in the tap mode, and no cursor and no stop in none', async () => {
    @Component({
      imports: [PctChart, PctLine],
      template: `<pct-chart
        ariaLabel="Modes"
        timeZone="UTC"
        [cursorMode]="mode()"
      >
        <pct-line [data]="rows" x="at" y="value" name="Supply" unit="°C" />
      </pct-chart>`,
    })
    class Modes {
      readonly rows = temperature;
      readonly mode = signal<'hover' | 'tap' | 'none'>('tap');
    }
    const fixture = await render(Modes);
    const x = at(fixture, T0 + 9 * H);
    overlay(fixture).dispatchEvent(pointer('pointermove', { x }));
    await settle(fixture);
    expect(chartOf(fixture).cursor()).toBeNull();
    overlay(fixture).dispatchEvent(pointer('pointerdown', { x }));
    overlay(fixture).dispatchEvent(pointer('pointerup', { x }));
    await settle(fixture);
    expect(chartOf(fixture).cursor()).toBeCloseTo(T0 + 9 * H, -3);
    fixture.componentInstance.mode.set('none');
    chartOf(fixture).cursor.set(null);
    await settle(fixture);
    expect(range(fixture)).toBeNull();
    overlay(fixture).dispatchEvent(pointer('pointerdown', { x }));
    overlay(fixture).dispatchEvent(pointer('pointerup', { x }));
    await settle(fixture);
    expect(chartOf(fixture).cursor()).toBeNull();
  });

  it("stamps the consumer's tooltip with the reading, and draws none when told", async () => {
    @Component({
      imports: [PctChart, PctLine, PctChartTooltip],
      template: `<pct-chart
        ariaLabel="Own"
        timeZone="UTC"
        [tooltip]="tooltip()"
      >
        <pct-line [data]="rows" x="at" y="value" name="Supply" unit="°C" />
        <ng-template pctChartTooltip let-reading>
          <b class="own">{{ reading.text }} · {{ reading.rows[0].text }}</b>
        </ng-template>
      </pct-chart>`,
    })
    class Own {
      readonly rows = temperature;
      readonly tooltip = signal<'auto' | 'none'>('auto');
    }
    const fixture = await render(Own);
    chartOf(fixture).cursor.set(T0 + 6 * H);
    await settle(fixture);
    expect(texts(fixture, '[data-pct-part="tooltip"] .own')).toEqual([
      'Oct 28, 06:00 AM · 22.5 °C',
    ]);
    expect(query(fixture, '[data-pct-part="tooltip"] .row')).toBeNull();
    fixture.componentInstance.tooltip.set('none');
    await settle(fixture);
    expect(query(fixture, '[data-pct-part="tooltip"]')).toBeNull();
    expect(query(fixture, '[data-pct-part="cursor"]')).not.toBeNull();
  });

  it('writes seconds in a window of an hour, the day in a window of days, and numbers on a linear axis', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.window.set({ from: T0, to: T0 + H });
    chartOf(fixture).cursor.set(T0 + 1_234_000);
    await settle(fixture);
    expect(chartOf(fixture).reading()!.text).toBe('12:20:34 AM');
    fixture.componentInstance.window.set({ from: T0, to: T0 + 48 * H });
    await settle(fixture);
    expect(chartOf(fixture).reading()!.text).toBe('Oct 28, 12:20 AM');
    @Component({
      imports: [PctChart, PctLine],
      template: `<pct-chart ariaLabel="Linear" x="linear" locale="en-US">
        <pct-line [data]="rows" x="at" y="value" name="Level" />
        <pct-line
          [data]="rows"
          x="at"
          y="on"
          name="Valve"
          unit="boolean"
          curve="step"
        />
      </pct-chart>`,
    })
    class Linear {
      readonly rows = [
        { at: 0, value: 1.5, on: 0 },
        { at: 1000, value: 2.5, on: 1 },
      ];
    }
    TestBed.resetTestingModule();
    const linear = await render(Linear);
    chartOf(linear).cursor.set(1000);
    await settle(linear);
    expect(range(linear).getAttribute('aria-valuetext')).toBe(
      '1,000: Level 2.5, Valve On',
    );
    chartOf(linear).cursor.set(500);
    await settle(linear);
    expect(chartOf(linear).reading()!.rows[1].text).toBe('Off');
  });

  it("paints a custom colour's marker and swatch from its own colour", async () => {
    @Component({
      imports: [PctChart, PctLine],
      template: `<pct-chart ariaLabel="Own colour" timeZone="UTC">
        <pct-line
          [data]="rows"
          x="at"
          y="value"
          name="Supply"
          color="rebeccapurple"
        />
      </pct-chart>`,
    })
    class OwnColour {
      readonly rows = temperature;
    }
    const fixture = await render(OwnColour);
    chartOf(fixture).cursor.set(T0);
    await settle(fixture);
    const marker = query(fixture, '[data-pct-part="marker"]') as HTMLElement;
    expect(marker.getAttribute('data-pct-series')).toBe('custom');
    expect(marker.style.getPropertyValue('--_pct-chart-color')).toBe(
      'rebeccapurple',
    );
    const swatch = query(fixture, '.swatch') as HTMLElement;
    expect(swatch.style.getPropertyValue('--_pct-chart-color')).toBe(
      'rebeccapurple',
    );
    expect(chartOf(fixture).reading()!.rows[0].color).toBe('rebeccapurple');
  });

  /** A numeric axis from 0 to 1000, a level and a valve whose first reading is one half. */
  @Component({
    imports: [PctChart, PctLine],
    template: `<pct-chart ariaLabel="Levels" x="linear" locale="en-US">
      <pct-line [data]="rows" x="at" y="value" name="Level" />
      <pct-line
        [data]="rows"
        x="at"
        y="on"
        name="Valve"
        unit="boolean"
        curve="step"
      />
    </pct-chart>`,
  })
  class Levels {
    readonly rows = [
      { at: 0, value: 1.5, on: 0.5 },
      { at: 500, value: 2, on: 0 },
      { at: 1000, value: 2.5, on: 1 },
    ];
  }

  it('reads its defaults unset: a hover cursor, a tooltip of its own, no cursor, the first grid', async () => {
    const fixture = await render(Host);
    const chart = chartOf(fixture);
    expect(chart.cursorMode()).toBe('hover');
    expect(chart.tooltip()).toBe('auto');
    expect(chart.cursor()).toBeNull();
    expect(chart.grid()).toBe('first');
    expect(range(fixture).getAttribute('aria-describedby')).toMatch(
      /^pct-chart-keys-\d+$/,
    );
  });

  it('types the context of its tooltip template as a reading', () => {
    expect(
      PctChartTooltip.ngTemplateContextGuard({} as PctChartTooltip, {
        $implicit: null,
      }),
    ).toBe(true);
  });

  it('holds the tooltip unmeasured until it has a width, then stands it on the side with the room', async () => {
    let width = 0;
    vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockImplementation(
      function (this: HTMLElement) {
        return this.classList.contains('tooltip') ? width : 0;
      },
    );
    const fixture = await render(Host);
    const tooltip = () =>
      query(fixture, '[data-pct-part="tooltip"]') as HTMLElement;
    const top = clipOf(fixture)[1];
    chartOf(fixture).cursor.set(T0 + 6 * H);
    await settle(fixture);
    expect(tooltip().classList.contains('unmeasured')).toBe(true);
    expect(tooltip().style.transform).toBe(
      `translate(${at(fixture, T0 + 6 * H) + 8}px, ${top}px)`,
    );
    width = 120;
    chartOf(fixture).cursor.set(T0 + 22 * H);
    await settle(fixture);
    expect(tooltip().classList.contains('unmeasured')).toBe(false);
    // no room after the line for 8 and 120: it stands before it
    expect(tooltip().style.transform).toBe(
      `translate(${at(fixture, T0 + 22 * H) - 128}px, ${top}px)`,
    );
  });

  it('draws the line on both ends of the window, and none past its end', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.window.set({ from: T0 + 6 * H, to: T0 + 18 * H });
    const line = () =>
      query(fixture, '[data-pct-part="cursor"]') as HTMLElement | null;
    for (const x of [T0 + 6 * H, T0 + 18 * H]) {
      chartOf(fixture).cursor.set(x);
      await settle(fixture);
      expect(line()?.style.transform).toBe(`translateX(${at(fixture, x)}px)`);
    }
    chartOf(fixture).cursor.set(T0 + 20 * H);
    await settle(fixture);
    expect(line()).toBeNull();
    expect(query(fixture, '[data-pct-part="tooltip"]')).toBeNull();
  });

  it('reads a series with no axis under the cursor, and draws it no marker', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    @Component({
      imports: [PctChart, PctLine],
      template: `<pct-chart
        ariaLabel="Five units"
        timeZone="UTC"
        locale="en-US"
      >
        <pct-line [data]="rows" x="at" y="value" name="A" unit="a" />
        <pct-line [data]="rows" x="at" y="value" name="B" unit="b" />
        <pct-line [data]="rows" x="at" y="value" name="C" unit="c" />
        <pct-line [data]="rows" x="at" y="value" name="D" unit="d" />
        <pct-line [data]="rows" x="at" y="value" name="E" unit="e" />
      </pct-chart>`,
    })
    class Five {
      readonly rows = temperature;
    }
    const fixture = await render(Five);
    chartOf(fixture).cursor.set(T0 + 6 * H);
    await settle(fixture);
    expect(texts(fixture, '[data-pct-part="tooltip"] .value')).toEqual([
      '22.5 a',
      '22.5 b',
      '22.5 c',
      '22.5 d',
      '22.5 e',
    ]);
    expect(
      attrs(fixture, '[data-pct-part="marker"]', 'data-pct-series'),
    ).toEqual(['1', '2', '3', '4']);
  });

  it('steps along the readings of the series shown, and not of a hidden one', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.hidden.set(['Supply air']);
    await settle(fixture);
    await key(fixture, 'ArrowRight');
    expect(chartOf(fixture).cursor()).toBe(T0);
    await key(fixture, 'ArrowRight');
    expect(chartOf(fixture).cursor()).toBe(T0 + 12 * H);
  });

  it('goes on End to the last reading before the end of a window that ends between two', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.window.set({ from: T0, to: T0 + 20 * H });
    await settle(fixture);
    await key(fixture, 'End');
    expect(chartOf(fixture).cursor()).toBe(T0 + 18 * H);
  });

  it('places a first cursor on the first reading on Page Up, not a tenth into the window', async () => {
    const fixture = await render(Levels);
    await key(fixture, 'PageUp');
    expect(chartOf(fixture).cursor()).toBe(0);
  });

  it('writes a yes/no value of one half as on', async () => {
    const fixture = await render(Levels);
    chartOf(fixture).cursor.set(0);
    await settle(fixture);
    expect(
      chartOf(fixture)
        .reading()!
        .rows.map((r) => r.text),
    ).toEqual(['1.5', 'On']);
  });

  it('lets a mouse move a cursor the keys cleared', async () => {
    const fixture = await render(Host);
    await key(fixture, 'Home');
    await key(fixture, 'Escape');
    const x = at(fixture, T0 + 9 * H);
    overlay(fixture).dispatchEvent(pointer('pointermove', { x }));
    await settle(fixture);
    expect(chartOf(fixture).cursor()).toBeCloseTo(T0 + 9 * H, -3);
  });

  it('stands still when the range is given the value it has, and pins where a change moved it', async () => {
    const fixture = await render(Host);
    const input = range(fixture);
    chartOf(fixture).cursor.set(T0 + 6 * H);
    await settle(fixture);
    input.value = String(T0 + 6 * H);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await settle(fixture);
    expect(chartOf(fixture).cursor()).toBe(T0 + 6 * H);
    input.value = String(T0 + 7 * H);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    // the range takes the cursor's value back at once, before the next frame
    expect(Number(input.value)).toBe(T0 + 12 * H);
    await settle(fixture);
    expect(chartOf(fixture).cursor()).toBe(T0 + 12 * H);
    overlay(fixture).dispatchEvent(
      pointer('pointermove', { x: at(fixture, T0 + 3 * H) }),
    );
    await settle(fixture);
    expect(chartOf(fixture).cursor()).toBe(T0 + 12 * H);
  });

  it("reads the pointer in the layer's own pixels when an ancestor scales the chart", async () => {
    const fixture = await render(Host);
    const layer = overlay(fixture);
    Object.defineProperty(layer, 'offsetWidth', {
      configurable: true,
      value: 600,
    });
    // drawn at half its size, 100 pixels from the viewport's edge
    layer.getBoundingClientRect = () =>
      ({ left: 100, top: 0, width: 300, height: 150 }) as DOMRect;
    layer.dispatchEvent(
      pointer('pointermove', { x: 100 + at(fixture, T0 + 9 * H) / 2 }),
    );
    await settle(fixture);
    expect(chartOf(fixture).cursor()).toBeCloseTo(T0 + 9 * H, -3);
  });

  it('reads the pointer on both edges of the plot, and nothing a pixel past either', async () => {
    const fixture = await render(Host);
    const layer = overlay(fixture);
    const move = async (x: number) => {
      layer.dispatchEvent(pointer('pointermove', { x }));
      await settle(fixture);
      return chartOf(fixture).cursor();
    };
    const left = at(fixture, T0);
    const right = left + chartOf(fixture).plotWidth();
    expect(await move(left)).toBe(T0);
    expect(await move(right)).toBeCloseTo(T0 + 24 * H, -3);
    expect(await move(right + 1)).toBeNull();
    expect(await move(left)).toBe(T0);
    expect(await move(left - 1)).toBeNull();
  });

  it('follows another pointer as a hover while a button is down, and the press still pins', async () => {
    const fixture = await render(Host);
    const layer = overlay(fixture);
    const x = at(fixture, T0 + 6 * H);
    layer.dispatchEvent(pointer('pointerdown', { x, id: 1 }));
    layer.dispatchEvent(
      pointer('pointermove', { x: at(fixture, T0 + 15 * H), id: 2 }),
    );
    await settle(fixture);
    expect(chartOf(fixture).cursor()).toBeCloseTo(T0 + 15 * H, -3);
    layer.dispatchEvent(pointer('pointerup', { x, id: 1 }));
    await settle(fixture);
    expect(chartOf(fixture).cursor()).toBeCloseTo(T0 + 6 * H, -3);
  });

  it('follows no finger and no pen that only passes over the plot', async () => {
    const fixture = await render(Host);
    const x = at(fixture, T0 + 9 * H);
    overlay(fixture).dispatchEvent(
      pointer('pointermove', { x, kind: 'touch' }),
    );
    overlay(fixture).dispatchEvent(pointer('pointermove', { x, kind: 'pen' }));
    await settle(fixture);
    expect(chartOf(fixture).cursor()).toBeNull();
  });

  it('clears on leaving only a cursor that a mouse moves, and only in the hover mode', async () => {
    @Component({
      imports: [PctChart, PctLine],
      template: `<pct-chart
        ariaLabel="Leave"
        timeZone="UTC"
        [cursorMode]="mode()"
      >
        <pct-line [data]="rows" x="at" y="value" name="Supply" unit="°C" />
      </pct-chart>`,
    })
    class Leave {
      readonly rows = temperature;
      readonly mode = signal<'hover' | 'tap'>('hover');
    }
    const fixture = await render(Leave);
    const chart = chartOf(fixture);
    const x = at(fixture, T0 + 6 * H);
    chart.cursor.set(T0 + 6 * H);
    await settle(fixture);
    overlay(fixture).dispatchEvent(
      pointer('pointerleave', { x, kind: 'touch' }),
    );
    expect(chart.cursor()).toBe(T0 + 6 * H);
    overlay(fixture).dispatchEvent(pointer('pointerleave', { x, kind: 'pen' }));
    expect(chart.cursor()).toBe(T0 + 6 * H);
    fixture.componentInstance.mode.set('tap');
    await settle(fixture);
    overlay(fixture).dispatchEvent(pointer('pointerleave', { x }));
    expect(chart.cursor()).toBe(T0 + 6 * H);
    fixture.componentInstance.mode.set('hover');
    await settle(fixture);
    overlay(fixture).dispatchEvent(pointer('pointerleave', { x }));
    expect(chart.cursor()).toBeNull();
  });

  it('holds a finger that moved no more than eight pixels, captures it, and pins where it was held', async () => {
    vi.useFakeTimers();
    const fixture = await render(Host);
    const layer = overlay(fixture);
    const capture = vi.fn();
    layer.setPointerCapture = capture;
    const x = at(fixture, T0 + 6 * H);
    const finger = (type: string, dx: number, dy: number) =>
      layer.dispatchEvent(
        pointer(type, { x: x + dx, y: 100 + dy, kind: 'touch', id: 5 }),
      );
    finger('pointerdown', 0, 0);
    finger('pointermove', 8, 0);
    finger('pointermove', -8, 0);
    finger('pointermove', 0, 8);
    finger('pointermove', 0, -8);
    vi.advanceTimersByTime(300);
    expect(capture).toHaveBeenCalledWith(5);
    expect(chartOf(fixture).cursor()).toBeCloseTo(T0 + 6 * H, -3);
    finger('pointerup', 0, 0);
    // pinned: a mouse passing over leaves it
    layer.dispatchEvent(
      pointer('pointermove', { x: at(fixture, T0 + 15 * H) }),
    );
    expect(chartOf(fixture).cursor()).toBeCloseTo(T0 + 6 * H, -3);
  });

  it('keeps a held cursor where it was when the finger leaves the plot, and pins where it lifts', async () => {
    vi.useFakeTimers();
    const { errors, provider } = recordErrors();
    const fixture = await render(Host, [provider]);
    const layer = overlay(fixture);
    const x = at(fixture, T0 + 6 * H);
    layer.dispatchEvent(pointer('pointerdown', { x, kind: 'touch' }));
    vi.advanceTimersByTime(300);
    const later = at(fixture, T0 + 15 * H);
    layer.dispatchEvent(pointer('pointermove', { x: later, kind: 'touch' }));
    layer.dispatchEvent(pointer('pointermove', { x: 2, kind: 'touch' }));
    expect(chartOf(fixture).cursor()).toBeCloseTo(T0 + 15 * H, -3);
    layer.dispatchEvent(pointer('pointerup', { x: 2, kind: 'touch' }));
    layer.dispatchEvent(pointer('pointermove', { x }));
    expect(chartOf(fixture).cursor()).toBeCloseTo(T0 + 15 * H, -3);
    expect(errors).toEqual([]);
  });

  it('holds no mouse button, and no finger pressed off the plot', async () => {
    vi.useFakeTimers();
    const fixture = await render(Levels);
    const layer = overlay(fixture);
    const capture = vi.fn();
    layer.setPointerCapture = capture;
    layer.dispatchEvent(pointer('pointerdown', { x: at(fixture, 500) }));
    vi.advanceTimersByTime(300);
    expect(chartOf(fixture).cursor()).toBeNull();
    layer.dispatchEvent(pointer('pointercancel', { x: at(fixture, 500) }));
    layer.dispatchEvent(pointer('pointerdown', { x: 2, kind: 'touch' }));
    vi.advanceTimersByTime(300);
    expect(chartOf(fixture).cursor()).toBeNull();
    expect(capture).not.toHaveBeenCalled();
  });

  it('forgets a press the chart is destroyed under', async () => {
    vi.useFakeTimers();
    const fixture = await render(Host);
    const chart = chartOf(fixture);
    overlay(fixture).dispatchEvent(
      pointer('pointerdown', { x: at(fixture, T0 + 6 * H), kind: 'touch' }),
    );
    fixture.destroy();
    vi.advanceTimersByTime(300);
    expect(chart.cursor()).toBeNull();
  });

  it('answers only the pointer that pressed when it lifts or is taken back', async () => {
    const { errors, provider } = recordErrors();
    const fixture = await render(Host, [provider]);
    const layer = overlay(fixture);
    const x = at(fixture, T0 + 6 * H);
    // nothing pressed: a lift and a cancel are nothing
    layer.dispatchEvent(pointer('pointerup', { x, kind: 'touch' }));
    layer.dispatchEvent(pointer('pointercancel', { x, kind: 'touch' }));
    layer.dispatchEvent(pointer('pointerdown', { x, kind: 'touch', id: 1 }));
    layer.dispatchEvent(pointer('pointerup', { x, kind: 'touch', id: 2 }));
    layer.dispatchEvent(pointer('pointercancel', { x, kind: 'touch', id: 2 }));
    expect(chartOf(fixture).cursor()).toBeNull();
    layer.dispatchEvent(pointer('pointerup', { x, kind: 'touch', id: 1 }));
    expect(chartOf(fixture).cursor()).toBeCloseTo(T0 + 6 * H, -3);
    expect(errors).toEqual([]);
  });

  it('pins a cursor set from outside on a click at its line, rather than letting it go', async () => {
    const fixture = await render(Host);
    const layer = overlay(fixture);
    chartOf(fixture).cursor.set(T0 + 6 * H);
    await settle(fixture);
    const x = at(fixture, T0 + 6 * H);
    layer.dispatchEvent(pointer('pointerdown', { x }));
    layer.dispatchEvent(pointer('pointerup', { x }));
    expect(chartOf(fixture).cursor()).toBeCloseTo(T0 + 6 * H, -3);
    // and pinned: a mouse passing over leaves it
    layer.dispatchEvent(pointer('pointermove', { x: x + 40 }));
    expect(chartOf(fixture).cursor()).toBeCloseTo(T0 + 6 * H, -3);
  });

  it('places a cursor on a click at the start of the axis after one pinned was cleared from outside', async () => {
    const fixture = await render(Levels);
    const layer = overlay(fixture);
    const click = (x: number) => {
      layer.dispatchEvent(pointer('pointerdown', { x }));
      layer.dispatchEvent(pointer('pointerup', { x }));
    };
    click(at(fixture, 500));
    expect(chartOf(fixture).cursor()).toBeCloseTo(500, 6);
    chartOf(fixture).cursor.set(null);
    await settle(fixture);
    click(at(fixture, 0));
    expect(chartOf(fixture).cursor()).toBe(0);
  });

  it('takes a click off the plot, or over a chart with nothing to show, as nothing', async () => {
    const { errors, provider } = recordErrors();
    const fixture = await render(Host, [provider]);
    const layer = overlay(fixture);
    layer.dispatchEvent(pointer('pointerdown', { x: 2 }));
    layer.dispatchEvent(pointer('pointerup', { x: 2 }));
    expect(chartOf(fixture).cursor()).toBeNull();
    TestBed.resetTestingModule();
    const empty = await render(Empty, [provider]);
    const nothing = overlay(empty);
    nothing.dispatchEvent(pointer('pointermove', { x: 300 }));
    nothing.dispatchEvent(pointer('pointerdown', { x: 300 }));
    nothing.dispatchEvent(pointer('pointerup', { x: 300 }));
    expect(chartOf(empty).cursor()).toBeNull();
    expect(errors).toEqual([]);
  });

  it('lays itself out with the defaults where the document has no window', async () => {
    const { errors, provider } = recordErrors();
    vi.spyOn(document, 'defaultView', 'get').mockReturnValue(null);
    const fixture = await render(Single, [provider]);
    expect(clipOf(fixture)).toEqual([43.2, 25, 548.8, 250]);
    expect(chartOf(fixture).pixel()).toBe(1);
    expect(errors).toEqual([]);
  });

  it('measures its labels on one canvas, in the size and the family of its medium', async () => {
    const fonts: string[] = [];
    const canvas = {
      font: '',
      measureText(text: string) {
        fonts.push(this.font);
        return { width: text.length * 10 };
      },
    };
    const getContext = vi
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockImplementation(((kind: string) =>
        kind === '2d' ? canvas : null) as never);
    // the chart is the fixture's root here, a `div` with the chart's class
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(
      function (this: HTMLElement) {
        return this.classList.contains('pct-chart') ? 600 : 0;
      },
    );
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockImplementation(
      function (this: HTMLElement) {
        return this.classList.contains('pct-chart') ? 300 : 0;
      },
    );
    const medium = { fontSize: '', fontFamily: '' };
    const view = document.defaultView!;
    const real = view.getComputedStyle.bind(view);
    vi.spyOn(view, 'getComputedStyle').mockImplementation((element, pseudo) =>
      element.classList.contains('pct-chart')
        ? ({
            fontSize: medium.fontSize,
            fontFamily: medium.fontFamily,
            getPropertyValue: () => '',
          } as unknown as CSSStyleDeclaration)
        : real(element, pseudo),
    );
    // a module of its own, whose canvas is not made yet
    vi.resetModules();
    const fresh = await import('./chart');
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    });
    const measured = async (fontSize: string, fontFamily: string) => {
      Object.assign(medium, { fontSize, fontFamily });
      fonts.length = 0;
      const fixture = TestBed.createComponent(fresh.PctChart);
      fixture.componentRef.setInput('x', 'linear');
      fixture.componentRef.setInput('locale', 'en-US');
      fixture.componentRef.setInput('window', { from: 0, to: 1000 });
      await settle(fixture);
      expect(fixture.componentInstance.plotWidth()).toBe(584);
      expect(fonts.length).toBeGreaterThan(0);
      return [...new Set(fonts)];
    };
    expect(await measured('', '')).toEqual(['13px sans-serif']);
    // the family alone changes
    expect(await measured('', 'serif')).toEqual(['13px serif']);
    expect(await measured('20px', '')).toEqual(['20px sans-serif']);
    expect(getContext).toHaveBeenCalledTimes(1);
  });
});
