import {
  Component,
  provideZonelessChangeDetection,
  signal,
} from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PctChart } from './chart';
import { PctChartLegend } from './legend';
import { PctLine } from './line';
import { PctNote } from './note';

const H = 3_600_000;
const T0 = Date.UTC(2026, 9, 28, 0);
/** A day of hourly readings rising from 18 to 24 °C. */
const temperature = Array.from({ length: 25 }, (_, i) => ({
  at: T0 + i * H,
  value: 18 + i * 0.25,
}));

@Component({
  imports: [PctChart, PctLine, PctNote, PctChartLegend],
  template: `
    <pct-chart
      #chart
      ariaLabel="Supply air"
      timeZone="UTC"
      locale="en-US"
      [orientation]="orientation()"
      [(hiddenSeries)]="hidden"
    >
      <pct-line [data]="rows" x="at" y="value" name="Supply air" unit="°C" />
      <pct-note
        [x]="x()"
        [y]="y()"
        [unit]="unit()"
        [text]="text()"
        [position]="position()"
        [color]="color()"
        [legend]="legend()"
      />
      @if (second()) {
        <pct-note [x]="x() + 1800000" [y]="y()" unit="°C" text="Second" />
      }
    </pct-chart>
    <pct-chart-legend [chart]="chart" />
  `,
})
class Host {
  readonly rows = temperature;
  readonly orientation = signal<'vertical' | 'horizontal'>('vertical');
  readonly hidden = signal<readonly string[]>([]);
  readonly x = signal(T0 + 12 * H);
  readonly y = signal(21);
  readonly unit = signal('°C');
  readonly text = signal('Window opened');
  readonly position = signal<'above' | 'below' | 'auto'>('auto');
  readonly color = signal<number | string | undefined>(undefined);
  readonly second = signal(false);
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
const notes = (fixture: ComponentFixture<unknown>) => [
  ...element(fixture).querySelectorAll('[data-pct-part="note"]'),
];
const numbers = (el: Element | null | undefined, names: readonly string[]) =>
  names.map((n) => Number(el?.getAttribute(n)));
/** The note's geometry as drawn. */
const drawnOf = (g: Element) => ({
  dot: numbers(g.querySelector('circle.dot'), ['cx', 'cy', 'r']),
  leader: numbers(g.querySelector('line.leader'), ['x1', 'y1', 'x2', 'y2']),
  box: numbers(g.querySelector('rect.box'), ['x', 'y', 'width', 'height']),
  text: numbers(g.querySelector('text.text'), ['x', 'y']),
});
const described = (fixture: ComponentFixture<unknown>) =>
  element(fixture).querySelector('.description')?.textContent?.trim() ?? null;

describe('PctNote', () => {
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

  it('marks the point with a dot and sets its text in a box over it, centred, on a leader from the point', async () => {
    const fixture = await render();
    const chart = chartOf(fixture);
    const px = chart.xScale()!.map(T0 + 12 * H);
    const py = chart.yScales().get('°C')!.map(21);
    // the box: the text's width and six a side, a line's height and two a side
    const width = chart.measure('Window opened') + 12;
    const height = chart.lineHeight() + 4;
    expect(width).toBe(13 * 13 * 0.6 + 12);
    expect(height).toBe(23);
    const [g] = notes(fixture);
    expect(g.getAttribute('data-pct-series')).toBeNull();
    const top = py - 8 - height;
    const left = px - width / 2;
    expect(drawnOf(g)).toEqual({
      dot: [px, py, 3],
      leader: [px, py, left + width / 2, top + height],
      box: [left, top, width, height],
      text: [left + 6, top + height / 2],
    });
    const text = g.querySelector('text.text')!;
    expect(text.textContent).toBe('Window opened');
    expect(text.getAttribute('dominant-baseline')).toBe('middle');
    expect(described(fixture)).toBe(
      `Window opened (${chart.writePosition(T0 + 12 * H, 'full')}, 21 °C).`,
    );
    // over the series
    const path = element(fixture).querySelector('[data-pct-part="series"]')!;
    expect(
      path.compareDocumentPosition(g) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('goes under the point when asked, or when the plot’s top or another note leaves no room over it', async () => {
    const fixture = await render();
    const host = fixture.componentInstance;
    const chart = chartOf(fixture);
    const px = chart.xScale()!.map(T0 + 12 * H);
    const py = chart.yScales().get('°C')!.map(21);
    const height = chart.lineHeight() + 4;
    host.position.set('below');
    await settle(fixture);
    const [below] = notes(fixture);
    expect(drawnOf(below).box[1]).toBe(py + 8);
    // the leader ends at the box's top
    expect(drawnOf(below).leader[3]).toBe(py + 8);
    expect(drawnOf(below).text[1]).toBe(py + 8 + height / 2);
    host.position.set('auto');
    // a value at the top of the axis: no room over it
    host.y.set(chart.axes()[0].domain[1]);
    await settle(fixture);
    const yTop = chart.yScales().get('°C')!.map(chart.axes()[0].domain[1]);
    expect(yTop).toBe(plotOf(fixture).top);
    expect(drawnOf(notes(fixture)[0]).box[1]).toBe(yTop + 8);
    // two notes half an hour apart: the second goes under its point, in the order of the marks
    host.y.set(21);
    host.second.set(true);
    await settle(fixture);
    const [first, second] = notes(fixture).map(drawnOf);
    expect(first.box[1]).toBe(py - 8 - height);
    expect(second.box[1]).toBe(py + 8);
    expect(second.dot[0]).toBe(chart.xScale()!.map(T0 + 12.5 * H));
    expect(described(fixture)).toMatch(/^Window opened \(.*\)\. Second \(/);
  });

  it('is kept inside the plot sideways, takes a colour, and is not drawn off the window or on an axis the scene has not', async () => {
    const fixture = await render();
    const host = fixture.componentInstance;
    const chart = chartOf(fixture);
    const { left, right } = plotOf(fixture);
    const width = chart.measure('Window opened') + 12;
    host.x.set(T0);
    await settle(fixture);
    expect(drawnOf(notes(fixture)[0]).box[0]).toBe(left);
    expect(drawnOf(notes(fixture)[0]).leader[2]).toBe(left + width / 2);
    host.x.set(T0 + 24 * H);
    await settle(fixture);
    expect(drawnOf(notes(fixture)[0]).box[0]).toBe(right - width);
    host.x.set(T0 + 24 * H + 1);
    await settle(fixture);
    expect(notes(fixture)).toEqual([]);
    expect(described(fixture)).toMatch(/^Window opened/);
    host.x.set(T0 - 1);
    await settle(fixture);
    expect(notes(fixture)).toEqual([]);
    host.x.set(T0 + 12 * H);
    host.unit.set('kWh');
    await settle(fixture);
    expect(notes(fixture)).toEqual([]);
    host.unit.set('°C');
    host.color.set('rebeccapurple');
    await settle(fixture);
    const [g] = notes(fixture);
    expect(g.getAttribute('data-pct-series')).toBe('custom');
    expect(
      (g as HTMLElement).style.getPropertyValue('--_pct-chart-color'),
    ).toBe('rebeccapurple');
    host.color.set(5);
    await settle(fixture);
    expect(notes(fixture)[0].getAttribute('data-pct-series')).toBe('5');
    // hidden by its text, as the legend would hide it
    host.hidden.set(['Window opened']);
    await settle(fixture);
    expect(notes(fixture)).toEqual([]);
    expect(described(fixture)).toBeNull();
  });

  it('turns with the scene: the point’s position runs down and its value across', async () => {
    const fixture = await render();
    const host = fixture.componentInstance;
    const chart = chartOf(fixture);
    host.orientation.set('horizontal');
    await settle(fixture);
    const along = chart.xScale()!.map(T0 + 12 * H);
    const across = chart.yScales().get('°C')!.map(21);
    const { dot } = drawnOf(notes(fixture)[0]);
    expect(dot).toEqual([across, along, 3]);
  });

  it('stands in the legend when asked, its dot as the swatch, and its toggle hides it with its sentence', async () => {
    const fixture = await render();
    const host = fixture.componentInstance;
    const items = () => [
      ...element(fixture).querySelectorAll('[data-pct-part="item"]'),
    ];
    expect(items().length).toBe(1);
    host.legend.set(true);
    host.color.set(3);
    await settle(fixture);
    expect(items().length).toBe(2);
    expect(items()[1].querySelector('.name')!.textContent).toBe(
      'Window opened',
    );
    const swatch = items()[1].querySelector('[data-pct-part="swatch"]')!;
    expect(swatch.getAttribute('data-pct-series')).toBe('3');
    expect(swatch.querySelector('circle.dot')).not.toBeNull();
    (
      items()[1].querySelector('[data-pct-part="toggle"]') as HTMLElement
    ).click();
    await settle(fixture);
    expect(host.hidden()).toEqual(['Window opened']);
    expect(notes(fixture)).toEqual([]);
    expect(described(fixture)).toBeNull();
  });
});
