import {
  Component,
  provideZonelessChangeDetection,
  signal,
} from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PctChart } from './chart';
import { PctChartLegend } from './legend';
import { PctLine } from './line';
import { PctSpan } from './span';

const H = 3_600_000;
const T0 = Date.UTC(2026, 9, 28, 0);
/** A day of hourly readings rising from 18 to 24 °C. */
const temperature = Array.from({ length: 25 }, (_, i) => ({
  at: T0 + i * H,
  value: 18 + i * 0.25,
}));

@Component({
  imports: [PctChart, PctLine, PctSpan, PctChartLegend],
  template: `
    <pct-chart
      #chart
      ariaLabel="Supply air"
      timeZone="UTC"
      locale="en-US"
      [orientation]="orientation()"
      [(hiddenSeries)]="hidden"
    >
      <pct-span
        [from]="from()"
        [to]="to()"
        [axis]="axis()"
        [unit]="unit()"
        [label]="label()"
        [color]="color()"
        [legend]="legend()"
      />
      <pct-line [data]="rows" x="at" y="value" name="Supply air" unit="°C" />
    </pct-chart>
    <pct-chart-legend [chart]="chart" />
  `,
})
class Host {
  readonly rows = temperature;
  readonly orientation = signal<'vertical' | 'horizontal'>('vertical');
  readonly hidden = signal<readonly string[]>([]);
  readonly from = signal(T0 + 22 * H);
  readonly to = signal(T0 + 30 * H);
  readonly axis = signal<'x' | 'y'>('x');
  readonly unit = signal('');
  readonly label = signal('Night');
  readonly color = signal<number | string | undefined>(undefined);
  readonly legend = signal(false);
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
const chartOf = (fixture: ComponentFixture<unknown>) =>
  fixture.debugElement.query((d) => d.name === 'pct-chart')
    .componentInstance as PctChart;
const plotOf = (fixture: ComponentFixture<unknown>) => {
  const clip = element(fixture).querySelector('clipPath rect')!;
  const left = Number(clip.getAttribute('x'));
  const top = Number(clip.getAttribute('y'));
  return {
    left,
    top,
    right: left + Number(clip.getAttribute('width')),
    bottom: top + Number(clip.getAttribute('height')),
  };
};
const group = (fixture: ComponentFixture<unknown>) =>
  element(fixture).querySelector('[data-pct-part="span"]');
const rectOf = (fixture: ComponentFixture<unknown>) => {
  const rect = group(fixture)?.querySelector('rect.band');
  return rect
    ? ['x', 'y', 'width', 'height'].map((n) => Number(rect.getAttribute(n)))
    : null;
};
const described = (fixture: ComponentFixture<unknown>) =>
  element(fixture).querySelector('.description')?.textContent?.trim() ?? null;

describe('PctSpan', () => {
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

  it('draws a band between two positions from the plot’s top to its bottom, cut at the window’s end, under the series, its label in the corner', async () => {
    const fixture = await render();
    const chart = chartOf(fixture);
    const { top, bottom } = plotOf(fixture);
    const scale = chart.xScale()!;
    const from = scale.map(T0 + 22 * H);
    const end = scale.map(T0 + 24 * H);
    expect(rectOf(fixture)).toEqual([from, top, end - from, bottom - top]);
    const g = group(fixture)!;
    expect(g.getAttribute('data-pct-series')).toBeNull();
    const label = g.querySelector('text.label')!;
    expect(
      ['x', 'y', 'text-anchor', 'dominant-baseline'].map((n) =>
        label.getAttribute(n),
      ),
    ).toEqual([String(from + 4), String(top + 4), 'start', 'hanging']);
    expect(label.textContent).toBe('Night');
    // under the series: the band comes before the line's path, though its mark stands after it
    const path = element(fixture).querySelector('[data-pct-part="series"]')!;
    expect(
      g.compareDocumentPosition(path) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(described(fixture)).toBe(
      `Night ${chart.writePosition(T0 + 22 * H, 'full')} – ${chart.writePosition(T0 + 30 * H, 'full')}.`,
    );
    // the ends in either order; a band outside the window, or of no width, is not drawn
    fixture.componentInstance.from.set(T0 + 30 * H);
    fixture.componentInstance.to.set(T0 + 22 * H);
    await settle(fixture);
    expect(rectOf(fixture)).toEqual([from, top, end - from, bottom - top]);
    fixture.componentInstance.from.set(T0 + 22 * H);
    await settle(fixture);
    expect(rectOf(fixture)).toBeNull();
    fixture.componentInstance.from.set(T0 - 2 * H);
    fixture.componentInstance.to.set(T0);
    await settle(fixture);
    expect(rectOf(fixture)).toBeNull();
    fixture.componentInstance.to.set(T0 + 1);
    await settle(fixture);
    expect(rectOf(fixture)![2]).toBe(scale.map(T0 + 1) - scale.map(T0));
    // no label: no text, and the kind's name in the description
    fixture.componentInstance.label.set('');
    await settle(fixture);
    expect(group(fixture)!.querySelector('text.label')).toBeNull();
    expect(described(fixture)).toMatch(/^Band /);
  });

  it('draws a band between two values across the plot, on the unit’s axis, in a palette place or a colour of its own', async () => {
    const fixture = await render();
    const host = fixture.componentInstance;
    const chart = chartOf(fixture);
    host.axis.set('y');
    host.unit.set('°C');
    host.from.set(20);
    host.to.set(22);
    host.color.set(2);
    await settle(fixture);
    const { left, right } = plotOf(fixture);
    const y = chart.yScales().get('°C')!;
    expect(rectOf(fixture)).toEqual([
      left,
      y.map(22),
      right - left,
      y.map(20) - y.map(22),
    ]);
    expect(group(fixture)!.getAttribute('data-pct-series')).toBe('2');
    expect(described(fixture)).toBe('Night 20 °C – 22 °C.');
    host.from.set(22);
    host.to.set(20);
    await settle(fixture);
    expect(rectOf(fixture)).toEqual([
      left,
      y.map(22),
      right - left,
      y.map(20) - y.map(22),
    ]);
    host.color.set('gold');
    await settle(fixture);
    expect(group(fixture)!.getAttribute('data-pct-series')).toBe('custom');
    expect(
      (group(fixture) as HTMLElement).style.getPropertyValue(
        '--_pct-chart-color',
      ),
    ).toBe('gold');
    // a unit no axis holds draws nothing
    host.unit.set('kWh');
    await settle(fixture);
    expect(group(fixture)).toBeNull();
    expect(described(fixture)).toBe('Night 22 kWh – 20 kWh.');
  });

  it('stands in the legend when asked, with a block as its swatch, and its toggle hides it', async () => {
    const fixture = await render();
    const host = fixture.componentInstance;
    host.legend.set(true);
    await settle(fixture);
    const items = [
      ...element(fixture).querySelectorAll('[data-pct-part="item"]'),
    ];
    expect(items.length).toBe(2);
    expect(items[1].querySelector('.name')!.textContent).toBe('Night');
    expect(
      items[1].querySelector('[data-pct-part="swatch"] rect.band'),
    ).not.toBeNull();
    (items[1].querySelector('[data-pct-part="toggle"]') as HTMLElement).click();
    await settle(fixture);
    expect(host.hidden()).toEqual(['Night']);
    expect(group(fixture)).toBeNull();
    expect(described(fixture)).toBeNull();
  });

  it('turns with the scene: a band of positions lies, a band of values stands', async () => {
    const fixture = await render();
    const host = fixture.componentInstance;
    const chart = chartOf(fixture);
    host.orientation.set('horizontal');
    await settle(fixture);
    const { left, top, right, bottom } = plotOf(fixture);
    const x = chart.xScale()!;
    expect(rectOf(fixture)).toEqual([
      left,
      x.map(T0 + 22 * H),
      right - left,
      x.map(T0 + 24 * H) - x.map(T0 + 22 * H),
    ]);
    expect(
      ['x', 'y'].map((n) =>
        group(fixture)!.querySelector('text.label')!.getAttribute(n),
      ),
    ).toEqual([String(left + 4), String(x.map(T0 + 22 * H) + 4)]);
    host.axis.set('y');
    host.unit.set('°C');
    host.from.set(20);
    host.to.set(22);
    await settle(fixture);
    const y = chart.yScales().get('°C')!;
    expect(rectOf(fixture)).toEqual([
      y.map(20),
      top,
      y.map(22) - y.map(20),
      bottom - top,
    ]);
  });
});
