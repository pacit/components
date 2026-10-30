import {
  Component,
  provideZonelessChangeDetection,
  signal,
} from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PctChart } from './chart';
import { PctChartLegend } from './legend';
import { PctLine } from './line';
import { PctNow } from './now';

const H = 3_600_000;
const T0 = Date.UTC(2026, 9, 28, 0);
/** A day of hourly readings rising from 18 to 24 °C. */
const temperature = Array.from({ length: 25 }, (_, i) => ({
  at: T0 + i * H,
  value: 18 + i * 0.25,
}));

@Component({
  imports: [PctChart, PctLine, PctNow, PctChartLegend],
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
      <pct-now
        [at]="at()"
        [label]="label()"
        [color]="color()"
        [legend]="legend()"
      />
    </pct-chart>
    <pct-chart-legend [chart]="chart" />
  `,
})
class Host {
  readonly rows = temperature;
  readonly orientation = signal<'vertical' | 'horizontal'>('vertical');
  readonly hidden = signal<readonly string[]>([]);
  readonly at = signal<number | null>(null);
  readonly label = signal('');
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
const nowOf = (fixture: ComponentFixture<unknown>) =>
  fixture.debugElement.query((d) => d.name === 'pct-now')
    .componentInstance as PctNow;
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
  element(fixture).querySelector('[data-pct-part="now"]');
const lineOf = (fixture: ComponentFixture<unknown>) => {
  const line = group(fixture)?.querySelector('line.line');
  return line
    ? ['x1', 'x2', 'y1', 'y2'].map((n) => Number(line.getAttribute(n)))
    : null;
};
const described = (fixture: ComponentFixture<unknown>) =>
  element(fixture).querySelector('.description')?.textContent?.trim() ?? null;

describe('PctNow', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(T0 + 6 * H);
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
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('stands at the clock’s moment from the plot’s top to its bottom, labelled Now, and moves with the clock once a second', async () => {
    const fixture = await render();
    const chart = chartOf(fixture);
    const { top, bottom } = plotOf(fixture);
    const px = chart.xScale()!.map(T0 + 6 * H);
    expect(lineOf(fixture)).toEqual([px, px, top, bottom]);
    const g = group(fixture)!;
    expect(g.getAttribute('data-pct-series')).toBeNull();
    const label = g.querySelector('text.label')!;
    expect(
      ['x', 'y', 'text-anchor', 'dominant-baseline'].map((n) =>
        label.getAttribute(n),
      ),
    ).toEqual([String(px + 4), String(top + 4), 'start', 'hanging']);
    expect(label.textContent).toBe('Now');
    expect(described(fixture)).toBe(
      `Now ${chart.writePosition(T0 + 6 * H, 'full')}.`,
    );
    // an hour on, after a tick, the line has moved; before the tick it had not
    vi.setSystemTime(T0 + 7 * H);
    vi.advanceTimersByTime(999);
    await settle(fixture);
    expect(lineOf(fixture)![0]).toBe(px);
    vi.advanceTimersByTime(1);
    await settle(fixture);
    expect(lineOf(fixture)![0]).toBe(chart.xScale()!.map(T0 + 7 * H + 1000));
    // destroyed, it ticks no more
    const now = nowOf(fixture);
    fixture.destroy();
    vi.setSystemTime(T0 + 8 * H);
    vi.advanceTimersByTime(1000);
    expect(now.moment()).toBe(T0 + 7 * H + 1000);
  });

  it('is pinned by `at`, named by its label, and gone with its description outside the window', async () => {
    const fixture = await render();
    const host = fixture.componentInstance;
    const chart = chartOf(fixture);
    host.at.set(T0 + 3 * H);
    host.label.set('Report taken');
    await settle(fixture);
    const px = chart.xScale()!.map(T0 + 3 * H);
    expect(lineOf(fixture)![0]).toBe(px);
    expect(group(fixture)!.querySelector('text.label')!.textContent).toBe(
      'Report taken',
    );
    expect(described(fixture)).toBe(
      `Report taken ${chart.writePosition(T0 + 3 * H, 'full')}.`,
    );
    vi.setSystemTime(T0 + 9 * H);
    vi.advanceTimersByTime(1000);
    await settle(fixture);
    expect(lineOf(fixture)![0]).toBe(px);
    // the window's ends are in
    host.at.set(T0);
    await settle(fixture);
    expect(lineOf(fixture)).not.toBeNull();
    host.at.set(T0 + 24 * H);
    await settle(fixture);
    expect(lineOf(fixture)).not.toBeNull();
    host.at.set(T0 + 24 * H + 1);
    await settle(fixture);
    expect(lineOf(fixture)).toBeNull();
    expect(described(fixture)).toBeNull();
    host.at.set(T0 - 1);
    await settle(fixture);
    expect(lineOf(fixture)).toBeNull();
  });

  it('takes a colour, stands in the legend when asked, and its toggle hides it', async () => {
    const fixture = await render();
    const host = fixture.componentInstance;
    host.color.set(4);
    host.legend.set(true);
    await settle(fixture);
    expect(group(fixture)!.getAttribute('data-pct-series')).toBe('4');
    const items = [
      ...element(fixture).querySelectorAll('[data-pct-part="item"]'),
    ];
    expect(items.length).toBe(2);
    expect(items[1].querySelector('.name')!.textContent).toBe('Now');
    expect(
      items[1]
        .querySelector('[data-pct-part="swatch"]')!
        .getAttribute('data-pct-series'),
    ).toBe('4');
    (items[1].querySelector('[data-pct-part="toggle"]') as HTMLElement).click();
    await settle(fixture);
    expect(host.hidden()).toEqual(['Now']);
    expect(group(fixture)).toBeNull();
    expect(described(fixture)).toBeNull();
    host.hidden.set([]);
    host.color.set('crimson');
    await settle(fixture);
    expect(group(fixture)!.getAttribute('data-pct-series')).toBe('custom');
    expect(
      (group(fixture) as HTMLElement).style.getPropertyValue(
        '--_pct-chart-color',
      ),
    ).toBe('crimson');
  });

  it('lies across a turned chart, its label at the right end', async () => {
    const fixture = await render();
    const chart = chartOf(fixture);
    fixture.componentInstance.orientation.set('horizontal');
    await settle(fixture);
    const { left, right } = plotOf(fixture);
    const py = chart.xScale()!.map(T0 + 6 * H);
    expect(lineOf(fixture)).toEqual([left, right, py, py]);
    const label = group(fixture)!.querySelector('text.label')!;
    expect(
      ['x', 'y', 'text-anchor', 'dominant-baseline'].map((n) =>
        label.getAttribute(n),
      ),
    ).toEqual([String(right - 4), String(py - 4), 'end', 'auto']);
  });
});
