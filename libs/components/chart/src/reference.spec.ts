import {
  Component,
  provideZonelessChangeDetection,
  signal,
} from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PctChart } from './chart';
import { PctChartLegend } from './legend';
import { PctLine } from './line';
import { PctReference } from './reference';

const H = 3_600_000;
const T0 = Date.UTC(2026, 9, 28, 0);
/** A day of hourly readings rising from 18 to 24 °C. */
const temperature = Array.from({ length: 25 }, (_, i) => ({
  at: T0 + i * H,
  value: 18 + i * 0.25,
}));

@Component({
  imports: [PctChart, PctLine, PctReference, PctChartLegend],
  template: `
    <pct-chart
      #chart
      ariaLabel="Supply air"
      [description]="description()"
      timeZone="UTC"
      locale="en-US"
      [orientation]="orientation()"
      [(hiddenSeries)]="hidden"
    >
      <pct-line [data]="rows" x="at" y="value" name="Supply air" unit="°C" />
      <pct-reference
        [y]="y()"
        [x]="x()"
        [unit]="unit()"
        [label]="label()"
        [id]="id()"
        [dash]="dash()"
        [color]="color()"
        [legend]="legend()"
      />
    </pct-chart>
    <pct-chart-legend [chart]="chart" />
  `,
})
class Host {
  readonly rows = temperature;
  readonly description = signal('');
  readonly orientation = signal<'vertical' | 'horizontal'>('vertical');
  readonly hidden = signal<readonly string[]>([]);
  readonly y = signal<number | null>(21);
  readonly x = signal<number | null>(null);
  readonly unit = signal('°C');
  readonly label = signal('Comfort');
  readonly id = signal('');
  readonly dash = signal(false);
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
  element(fixture).querySelector('[data-pct-part="reference"]');
const attrs = (el: Element | null, names: readonly string[]) =>
  names.map((n) => el?.getAttribute(n));
const described = (fixture: ComponentFixture<unknown>) =>
  element(fixture).querySelector('.description')?.textContent?.trim() ?? null;

describe('PctReference', () => {
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

  it('draws a line across the plot at the value, its label at the right end over it, in the skin colour, over the series', async () => {
    const fixture = await render();
    const chart = chartOf(fixture);
    const { left, top, right, bottom } = plotOf(fixture);
    const py = chart.yScales().get('°C')!.map(21);
    expect(py).toBeGreaterThan(top);
    expect(py).toBeLessThan(bottom);
    const g = group(fixture)!;
    expect(attrs(g, ['data-pct-series'])).toEqual([null]);
    expect(
      (g as HTMLElement).style.getPropertyValue('--_pct-chart-color'),
    ).toBe('');
    const line = g.querySelector('line.line')!;
    expect(attrs(line, ['x1', 'x2', 'y1', 'y2']).map(Number)).toEqual([
      left,
      right,
      py,
      py,
    ]);
    expect(line.classList.contains('dashed')).toBe(false);
    const label = g.querySelector('text.label')!;
    expect(
      attrs(label, ['x', 'y', 'text-anchor', 'dominant-baseline']),
    ).toEqual([String(right - 4), String(py - 4), 'end', 'auto']);
    expect(label.textContent).toBe('Comfort');
    // over the series: the line's path comes first in the layer
    const path = element(fixture).querySelector('[data-pct-part="series"]')!;
    expect(
      path.compareDocumentPosition(g) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    // no series: no axis of its own, no legend entry, no column
    expect(chart.series().map((s) => s.name)).toEqual(['Supply air']);
    expect(
      element(fixture).querySelectorAll('[data-pct-part="item"]').length,
    ).toBe(1);
  });

  it('describes itself to a reader, after the consumer’s description, and the picture points at it', async () => {
    const fixture = await render();
    expect(described(fixture)).toBe('Comfort 21 °C.');
    const picture = element(fixture).querySelector('[data-pct-part="plot"]')!;
    const id = element(fixture).querySelector('.description')!.id;
    expect(id).not.toBe('');
    expect(picture.getAttribute('aria-describedby')).toBe(id);
    fixture.componentInstance.description.set('A day of supply air.');
    await settle(fixture);
    expect(described(fixture)).toBe('A day of supply air. Comfort 21 °C.');
    // the kind's name stands for a missing label
    fixture.componentInstance.label.set('');
    await settle(fixture);
    expect(described(fixture)).toBe(
      'A day of supply air. Reference line 21 °C.',
    );
    expect(group(fixture)!.querySelector('text.label')).toBeNull();
    // with neither a value nor a position there is nothing to draw and nothing to say
    fixture.componentInstance.description.set('');
    fixture.componentInstance.y.set(null);
    await settle(fixture);
    expect(group(fixture)).toBeNull();
    expect(described(fixture)).toBeNull();
    expect(
      element(fixture)
        .querySelector('[data-pct-part="plot"]')!
        .getAttribute('aria-describedby'),
    ).toBeNull();
  });

  it('dashes on request, takes a palette place or a colour of its own, and stands in the legend with a toggle that hides it', async () => {
    const fixture = await render();
    const host = fixture.componentInstance;
    host.dash.set(true);
    host.color.set('3');
    host.legend.set(true);
    await settle(fixture);
    const g = group(fixture)!;
    expect(g.getAttribute('data-pct-series')).toBe('3');
    expect(g.querySelector('line.line')!.classList.contains('dashed')).toBe(
      true,
    );
    // the legend's second entry, named Comfort, with the reference's swatch: a dashed line
    const items = [
      ...element(fixture).querySelectorAll('[data-pct-part="item"]'),
    ];
    expect(items.length).toBe(2);
    const toggle = items[1].querySelector(
      '[data-pct-part="toggle"]',
    ) as HTMLButtonElement;
    expect(toggle.textContent?.trim()).toBe('Comfort');
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    const swatch = items[1].querySelector('[data-pct-part="swatch"]')!;
    expect(swatch.getAttribute('data-pct-series')).toBe('3');
    expect(
      swatch.querySelector('line.line')!.classList.contains('dashed'),
    ).toBe(true);
    expect(items[1].querySelector('.unit')).toBeNull();
    expect(items[1].querySelector('.value')).toBeNull();
    // pressed: hidden by the label, and gone from the picture and the description
    toggle.click();
    await settle(fixture);
    expect(host.hidden()).toEqual(['Comfort']);
    expect(group(fixture)).toBeNull();
    expect(described(fixture)).toBeNull();
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
    toggle.click();
    await settle(fixture);
    expect(group(fixture)).not.toBeNull();
    // an id of its own is what the toggle writes
    host.id.set('comfort');
    await settle(fixture);
    (
      element(fixture).querySelector(
        '[data-pct-part="item"]:nth-child(2) [data-pct-part="toggle"]',
      ) as HTMLElement
    ).click();
    await settle(fixture);
    expect(host.hidden()).toEqual(['comfort']);
    host.hidden.set([]);
    // a colour of its own: `custom`, handed in as a property; a place out of range is none
    host.color.set('tomato');
    await settle(fixture);
    expect(group(fixture)!.getAttribute('data-pct-series')).toBe('custom');
    expect(
      (group(fixture) as HTMLElement).style.getPropertyValue(
        '--_pct-chart-color',
      ),
    ).toBe('tomato');
    expect(
      (
        element(fixture).querySelector(
          '[data-pct-part="item"]:nth-child(2) [data-pct-part="swatch"]',
        ) as HTMLElement
      ).style.getPropertyValue('--_pct-chart-color'),
    ).toBe('tomato');
    host.color.set(12);
    await settle(fixture);
    expect(group(fixture)!.getAttribute('data-pct-series')).toBeNull();
  });

  it('stands at a position instead, from the plot’s top to its bottom with the label at the top, and is gone outside the window', async () => {
    const fixture = await render();
    const host = fixture.componentInstance;
    const chart = chartOf(fixture);
    host.y.set(null);
    host.x.set(T0 + 6 * H);
    host.label.set('Six');
    await settle(fixture);
    const { top, bottom } = plotOf(fixture);
    const px = chart.xScale()!.map(T0 + 6 * H);
    const g = group(fixture)!;
    expect(
      attrs(g.querySelector('line.line'), ['x1', 'x2', 'y1', 'y2']).map(Number),
    ).toEqual([px, px, top, bottom]);
    expect(
      attrs(g.querySelector('text.label'), [
        'x',
        'y',
        'text-anchor',
        'dominant-baseline',
      ]),
    ).toEqual([String(px + 4), String(top + 4), 'start', 'hanging']);
    expect(described(fixture)).toBe(
      `Six ${chart.writePosition(T0 + 6 * H, 'full')}.`,
    );
    // the window's ends are in; a position past them is not drawn, though still described
    host.x.set(T0);
    await settle(fixture);
    expect(group(fixture)).not.toBeNull();
    host.x.set(T0 + 24 * H);
    await settle(fixture);
    expect(group(fixture)).not.toBeNull();
    host.x.set(T0 + 24 * H + 1);
    await settle(fixture);
    expect(group(fixture)).toBeNull();
    expect(described(fixture)).toBe(
      `Six ${chart.writePosition(T0 + 24 * H + 1, 'full')}.`,
    );
    host.x.set(T0 - 1);
    await settle(fixture);
    expect(group(fixture)).toBeNull();
    // a value wins over a position
    host.x.set(T0 + 6 * H);
    host.y.set(20);
    await settle(fixture);
    expect(
      attrs(group(fixture)!.querySelector('line.line'), ['y1', 'y2']).map(
        Number,
      ),
    ).toEqual([
      chart.yScales().get('°C')!.map(20),
      chart.yScales().get('°C')!.map(20),
    ]);
    expect(described(fixture)).toBe('Six 20 °C.');
    // a unit no axis holds draws nothing, and is still described
    host.unit.set('kWh');
    await settle(fixture);
    expect(group(fixture)).toBeNull();
    expect(described(fixture)).toBe('Six 20 kWh.');
  });

  it('turns with the scene: a value’s line stands and a position’s lies', async () => {
    const fixture = await render();
    const host = fixture.componentInstance;
    const chart = chartOf(fixture);
    host.orientation.set('horizontal');
    await settle(fixture);
    const { left, top, right, bottom } = plotOf(fixture);
    const px = chart.yScales().get('°C')!.map(21);
    const g = group(fixture)!;
    expect(
      attrs(g.querySelector('line.line'), ['x1', 'x2', 'y1', 'y2']).map(Number),
    ).toEqual([px, px, top, bottom]);
    expect(
      attrs(g.querySelector('text.label'), [
        'x',
        'y',
        'text-anchor',
        'dominant-baseline',
      ]),
    ).toEqual([String(px + 4), String(top + 4), 'start', 'hanging']);
    host.y.set(null);
    host.x.set(T0 + 6 * H);
    await settle(fixture);
    const py = chart.xScale()!.map(T0 + 6 * H);
    const turned = group(fixture)!;
    expect(
      attrs(turned.querySelector('line.line'), ['x1', 'x2', 'y1', 'y2']).map(
        Number,
      ),
    ).toEqual([left, right, py, py]);
    expect(
      attrs(turned.querySelector('text.label'), [
        'x',
        'y',
        'text-anchor',
        'dominant-baseline',
      ]),
    ).toEqual([String(right - 4), String(py - 4), 'end', 'auto']);
  });
});
