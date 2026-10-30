import {
  Component,
  provideZonelessChangeDetection,
  signal,
} from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PctChart } from './chart';
import { PctChartLegend, PctLegendItem } from './legend';
import { PctLine } from './line';
import { PCT_SERIES_MARKERS } from './scene';

const H = 3_600_000;
const T0 = Date.UTC(2026, 9, 28, 0);
const temperature = [
  { at: T0, value: 20 },
  { at: T0 + 6 * H, value: 22.5 },
  { at: T0 + 12 * H, value: null },
  { at: T0 + 18 * H, value: 21 },
  { at: T0 + 24 * H, value: 19.5 },
];
const power = [
  { at: T0, value: 400 },
  { at: T0 + 12 * H, value: 1200 },
  { at: T0 + 24 * H, value: 800 },
];

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

@Component({
  imports: [PctChart, PctLine, PctChartLegend],
  template: `
    <pct-chart
      #chart
      ariaLabel="Heat recovery"
      timeZone="UTC"
      locale="en-US"
      [(hiddenSeries)]="hidden"
      [(window)]="window"
    >
      <pct-line
        [data]="temperature"
        x="at"
        y="value"
        name="Supply air"
        unit="°C"
      />
      @if (two()) {
        <pct-line
          [data]="power"
          x="at"
          y="value"
          name="Fan power"
          unit="W"
          curve="step"
          color="rebeccapurple"
        />
      }
    </pct-chart>
    <pct-chart-legend
      [chart]="chart"
      [value]="value()"
      [layout]="layout()"
      [removable]="removable()"
      (remove)="removed.push($event)"
    />
  `,
})
class Host {
  readonly temperature = temperature;
  readonly power = power;
  readonly hidden = signal<readonly string[]>([]);
  readonly window = signal<{ from: number; to: number } | null>(null);
  readonly two = signal(true);
  readonly value = signal<'latest' | 'sum' | 'mean' | 'none'>('none');
  readonly layout = signal<'row' | 'column'>('row');
  readonly removable = signal(false);
  readonly removed: string[] = [];
}

@Component({
  imports: [PctChart, PctLine, PctChartLegend, PctLegendItem],
  template: `
    <pct-chart #chart ariaLabel="Own rows" timeZone="UTC">
      <pct-line
        [data]="temperature"
        x="at"
        y="value"
        name="Supply air"
        unit="°C"
      />
    </pct-chart>
    <pct-chart-legend [chart]="chart">
      <ng-template pctLegendItem let-entry let-toggle="toggle">
        <button type="button" class="own" (click)="toggle()">
          {{ entry.name }} {{ entry.hidden ? 'off' : 'on' }}
        </button>
      </ng-template>
    </pct-chart-legend>
  `,
})
class OwnRows {
  readonly temperature = temperature;
}

async function render<T>(type: new () => T): Promise<ComponentFixture<T>> {
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
const legendOf = (fixture: ComponentFixture<unknown>) =>
  fixture.debugElement.query((d) => d.name === 'pct-chart-legend')
    .componentInstance as PctChartLegend;
const chartOf = (fixture: ComponentFixture<unknown>) =>
  fixture.debugElement.query((d) => d.name === 'pct-chart')
    .componentInstance as PctChart;
const toggles = (fixture: ComponentFixture<unknown>) => [
  ...element(fixture).querySelectorAll<HTMLButtonElement>(
    'pct-chart-legend [data-pct-part="toggle"]',
  ),
];
const values = (fixture: ComponentFixture<unknown>) =>
  [...element(fixture).querySelectorAll('pct-chart-legend .value')].map((v) =>
    v.textContent?.trim(),
  );

describe('PctChartLegend', () => {
  beforeAll(() => vi.stubGlobal('ResizeObserver', QuietObserver));
  afterAll(() => vi.unstubAllGlobals());
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

  it('lists the series as a named list, each a pressed button with its swatch, name and unit', async () => {
    const fixture = await render(Host);
    const list = element(fixture).querySelector('pct-chart-legend')!;
    expect(list.getAttribute('role')).toBe('list');
    expect(list.getAttribute('aria-label')).toBe('Series');
    expect(list.getAttribute('aria-labelledby')).toBeNull();
    expect(
      list.querySelectorAll('[role="listitem"][data-pct-part="item"]'),
    ).toHaveLength(2);
    const buttons = toggles(fixture);
    expect(buttons.map((b) => b.getAttribute('aria-pressed'))).toEqual([
      'true',
      'true',
    ]);
    expect(buttons.map((b) => b.querySelector('.name')?.textContent)).toEqual([
      'Supply air',
      'Fan power',
    ]);
    // two units on the chart: each entry says its own
    expect(buttons.map((b) => b.querySelector('.unit')?.textContent)).toEqual([
      '°C',
      'W',
    ]);
    const swatches = buttons.map((b) =>
      b.querySelector('[data-pct-part="swatch"]')!,
    );
    expect(swatches.map((s) => s.getAttribute('data-pct-series'))).toEqual([
      '1',
      'custom',
    ]);
    expect(swatches.map((s) => s.getAttribute('viewBox'))).toEqual([
      '0 0 24 12',
      '0 0 24 12',
    ]);
    expect(swatches.map((s) => s.querySelector('.dash') !== null)).toEqual([
      true,
      true,
    ]);
    expect(
      swatches.map((s) => s.querySelector('.shape')?.getAttribute('d')),
    ).toEqual([PCT_SERIES_MARKERS[0], PCT_SERIES_MARKERS[0]]);
    expect(
      (swatches[1] as HTMLElement).style.getPropertyValue('--_pct-chart-color'),
    ).toBe('rebeccapurple');
    expect(values(fixture)).toEqual([]);
    expect(
      element(fixture).querySelector('[data-pct-part="remove"]'),
    ).toBeNull();
    expect(legendOf(fixture).value()).toBe('none');
    expect(legendOf(fixture).layout()).toBe('row');
    expect(legendOf(fixture).removable()).toBe(false);
  });

  it("takes a name of the consumer's own, or an element that names it", async () => {
    @Component({
      imports: [PctChart, PctLine, PctChartLegend],
      template: `
        <h3 id="rooms">Rooms</h3>
        <pct-chart #chart ariaLabel="Named" timeZone="UTC">
          <pct-line [data]="temperature" x="at" y="value" name="Supply air" />
        </pct-chart>
        <pct-chart-legend [chart]="chart" ariaLabel="Lines on the chart" />
        <pct-chart-legend [chart]="chart" ariaLabelledby="rooms" />
      `,
    })
    class Named {
      readonly temperature = temperature;
    }
    const fixture = await render(Named);
    const lists = [...element(fixture).querySelectorAll('pct-chart-legend')];
    expect(lists.map((l) => l.getAttribute('aria-label'))).toEqual([
      'Lines on the chart',
      null,
    ]);
    expect(lists.map((l) => l.getAttribute('aria-labelledby'))).toEqual([
      null,
      'rooms',
    ]);
  });

  it('writes no unit when the chart holds one', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.two.set(false);
    await settle(fixture);
    expect(toggles(fixture)).toHaveLength(1);
    expect(toggles(fixture)[0].querySelector('.unit')).toBeNull();
    expect(legendOf(fixture).entries()[0].unit).toBe('');
  });

  it("hides a series on a press and shows it again on the next, through the chart's model", async () => {
    const fixture = await render(Host);
    toggles(fixture)[1].click();
    await settle(fixture);
    expect(fixture.componentInstance.hidden()).toEqual(['Fan power']);
    expect(toggles(fixture)[1].getAttribute('aria-pressed')).toBe('false');
    expect(
      toggles(fixture)[1]
        .closest('[data-pct-part="item"]')!
        .classList.contains('hidden'),
    ).toBe(true);
    expect(
      element(fixture).querySelectorAll('path[data-pct-part="series"]'),
    ).toHaveLength(1);
    toggles(fixture)[1].click();
    await settle(fixture);
    expect(fixture.componentInstance.hidden()).toEqual([]);
    expect(toggles(fixture)[1].getAttribute('aria-pressed')).toBe('true');
    // a series hidden from outside reads as hidden too
    fixture.componentInstance.hidden.set(['Supply air', 'Fan power']);
    await settle(fixture);
    expect(toggles(fixture).map((b) => b.getAttribute('aria-pressed'))).toEqual(
      ['false', 'false'],
    );
  });

  it('writes the latest reading, the sum or the mean beside a shown series, and nothing for a hidden one', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.value.set('latest');
    await settle(fixture);
    expect(values(fixture)).toEqual(['19.5 °C', '800 W']);
    fixture.componentInstance.value.set('sum');
    await settle(fixture);
    expect(values(fixture)).toEqual(['83 °C', '2,400 W']);
    fixture.componentInstance.value.set('mean');
    await settle(fixture);
    expect(values(fixture)).toEqual(['20.75 °C', '800 W']);
    fixture.componentInstance.hidden.set(['Fan power']);
    await settle(fixture);
    expect(values(fixture)).toEqual(['20.75 °C']);
    // the window narrows what is summed; a window with no reading writes the gap
    fixture.componentInstance.hidden.set([]);
    fixture.componentInstance.window.set({ from: T0 + 5 * H, to: T0 + 13 * H });
    await settle(fixture);
    expect(values(fixture)).toEqual(['22.5 °C', '1,200 W']);
    fixture.componentInstance.window.set({ from: T0 + 7 * H, to: T0 + 11 * H });
    await settle(fixture);
    expect(values(fixture)).toEqual(['No reading', 'No reading']);
    fixture.componentInstance.value.set('latest');
    await settle(fixture);
    // the latest is the value at the window's end: the step carries its reading there, and
    // the line ends at its last reading before the gap
    expect(values(fixture)).toEqual(['No reading', '400 W']);
    fixture.componentInstance.value.set('none');
    await settle(fixture);
    expect(values(fixture)).toEqual([]);
  });

  it('writes the reading under the cursor while there is one, whatever value asks', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.value.set('sum');
    chartOf(fixture).cursor.set(T0 + 6 * H);
    await settle(fixture);
    expect(values(fixture)).toEqual(['22.5 °C', '400 W']);
    chartOf(fixture).cursor.set(T0 + 12 * H);
    await settle(fixture);
    expect(values(fixture)).toEqual(['No reading', '1,200 W']);
    chartOf(fixture).cursor.set(null);
    await settle(fixture);
    expect(values(fixture)).toEqual(['83 °C', '2,400 W']);
  });

  it('lays the entries in a column when asked', async () => {
    const fixture = await render(Host);
    const host = element(fixture).querySelector('pct-chart-legend')!;
    expect(host.classList.contains('column')).toBe(false);
    fixture.componentInstance.layout.set('column');
    await settle(fixture);
    expect(host.classList.contains('column')).toBe(true);
  });

  it('adds a remove button per entry when removable, named by the series, which emits its id', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.removable.set(true);
    await settle(fixture);
    const removes = [
      ...element(fixture).querySelectorAll<HTMLButtonElement>(
        '[data-pct-part="remove"]',
      ),
    ];
    expect(removes.map((r) => r.getAttribute('aria-label'))).toEqual([
      'Remove: Supply air',
      'Remove: Fan power',
    ]);
    expect(
      removes.map((r) => r.querySelector('[aria-hidden="true"]')?.textContent),
    ).toEqual(['×', '×']);
    removes[1].click();
    expect(fixture.componentInstance.removed).toEqual(['Fan power']);
    // removing is the application's: the entry stays until the mark goes
    await settle(fixture);
    expect(toggles(fixture)).toHaveLength(2);
    fixture.componentInstance.two.set(false);
    await settle(fixture);
    expect(toggles(fixture)).toHaveLength(1);
  });

  it("stamps the consumer's own row with the entry and a toggle", async () => {
    const fixture = await render(OwnRows);
    const own = element(fixture).querySelector<HTMLButtonElement>('.own')!;
    expect(own.textContent?.trim()).toBe('Supply air on');
    expect(
      element(fixture).querySelector('[data-pct-part="toggle"]'),
    ).toBeNull();
    own.click();
    await settle(fixture);
    expect(chartOf(fixture).hiddenSeries()).toEqual(['Supply air']);
    expect(element(fixture).querySelector('.own')?.textContent?.trim()).toBe(
      'Supply air off',
    );
  });
});
