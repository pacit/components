import {
  Component,
  provideZonelessChangeDetection,
  signal,
} from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PctChart } from './chart';
import { PctLine, type PctThreshold } from './line';

const H = 3_600_000;
const T0 = Date.UTC(2026, 9, 28, 0);
/** A day of hourly readings rising from 18 to 24 °C. */
const temperature = Array.from({ length: 25 }, (_, i) => ({
  at: T0 + i * H,
  value: 18 + i * 0.25,
}));

@Component({
  imports: [PctChart, PctLine],
  template: `
    <pct-chart
      ariaLabel="Supply air"
      timeZone="UTC"
      locale="en-US"
      [orientation]="orientation()"
      [(hiddenSeries)]="hidden"
    >
      <pct-line
        [data]="rows"
        x="at"
        y="value"
        name="Supply air"
        unit="°C"
        [color]="color()"
        [threshold]="threshold()"
      />
    </pct-chart>
  `,
})
class Host {
  readonly rows = temperature;
  readonly orientation = signal<'vertical' | 'horizontal'>('vertical');
  readonly hidden = signal<readonly string[]>([]);
  readonly color = signal<number | string | undefined>(undefined);
  readonly threshold = signal<readonly PctThreshold[]>([
    { at: 23, color: 4 },
    { at: 21, color: 'tomato' },
  ]);
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
const paths = (fixture: ComponentFixture<unknown>) => [
  ...element(fixture).querySelectorAll('path[data-pct-part="series"]'),
];
/** The segments as drawn: each path's colour and the rectangle of the clip it names. */
const segmentsOf = (fixture: ComponentFixture<unknown>) =>
  paths(fixture).map((path) => {
    const clip = /^url\(#(.+)\)$/.exec(path.getAttribute('clip-path') ?? '');
    const rect = clip
      ? element(fixture).querySelector(`clipPath[id="${clip[1]}"] rect`)
      : null;
    return {
      place: path.getAttribute('data-pct-series'),
      color: (path as HTMLElement).style.getPropertyValue('--_pct-chart-color'),
      d: path.getAttribute('d'),
      rect: rect
        ? ['x', 'y', 'width', 'height'].map((n) => Number(rect.getAttribute(n)))
        : null,
    };
  });

describe('PctLine, a line cut by its thresholds', () => {
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

  it('draws the path once per colour, each clipped to its band of values, the lowest in the series’ own colour, the thresholds in order', async () => {
    const fixture = await render();
    const chart = chartOf(fixture);
    const { left, top, right, bottom } = plotOf(fixture);
    const y = chart.yScales().get('°C')!;
    const segments = segmentsOf(fixture);
    expect(segments.length).toBe(3);
    expect(new Set(segments.map((s) => s.d)).size).toBe(1);
    expect(segments[0].d).toMatch(/^M/);
    expect(segments.map((s) => [s.place, s.color])).toEqual([
      ['1', ''],
      ['custom', 'tomato'],
      ['4', ''],
    ]);
    expect(segments.map((s) => s.rect)).toEqual([
      [left, y.map(21), right - left, bottom - y.map(21)],
      [left, y.map(23), right - left, y.map(21) - y.map(23)],
      [left, top, right - left, y.map(23) - top],
    ]);
    // the clips are the line's own, told apart by their band
    const ids = paths(fixture).map((p) => p.getAttribute('clip-path'));
    expect(new Set(ids).size).toBe(3);
    expect(
      ids.every((id) => /^url\(#pct-line-threshold-\d+-\d\)$/.test(id!)),
    ).toBe(true);
  });

  it('keeps the series’ own colour where a threshold’s is no place of the palette, and follows a colour of the series’ own', async () => {
    const fixture = await render();
    const host = fixture.componentInstance;
    host.threshold.set([{ at: 21, color: 12 }]);
    await settle(fixture);
    expect(segmentsOf(fixture).map((s) => [s.place, s.color])).toEqual([
      ['1', ''],
      ['1', ''],
    ]);
    host.color.set('navy');
    await settle(fixture);
    expect(segmentsOf(fixture).map((s) => [s.place, s.color])).toEqual([
      ['custom', 'navy'],
      ['custom', 'navy'],
    ]);
    host.threshold.set([{ at: 21, color: '2' }]);
    await settle(fixture);
    expect(segmentsOf(fixture).map((s) => [s.place, s.color])).toEqual([
      ['custom', 'navy'],
      ['2', ''],
    ]);
  });

  it('draws the path once, unclipped, without thresholds, and nothing while hidden', async () => {
    const fixture = await render();
    const host = fixture.componentInstance;
    host.threshold.set([]);
    await settle(fixture);
    const segments = segmentsOf(fixture);
    expect(segments.length).toBe(1);
    expect(segments[0].rect).toBeNull();
    expect(segments[0].place).toBe('1');
    expect(
      element(fixture).querySelector('clipPath[id^="pct-line"]'),
    ).toBeNull();
    host.threshold.set([{ at: 21, color: 2 }]);
    host.hidden.set(['Supply air']);
    await settle(fixture);
    expect(paths(fixture)).toEqual([]);
  });

  it('cuts a turned line across its width: the bands run left to right', async () => {
    const fixture = await render();
    const chart = chartOf(fixture);
    fixture.componentInstance.orientation.set('horizontal');
    await settle(fixture);
    const { left, top, right, bottom } = plotOf(fixture);
    const y = chart.yScales().get('°C')!;
    expect(segmentsOf(fixture).map((s) => s.rect)).toEqual([
      [left, top, y.map(21) - left, bottom - top],
      [y.map(21), top, y.map(23) - y.map(21), bottom - top],
      [y.map(23), top, right - y.map(23), bottom - top],
    ]);
  });

  it('brings the defaults of a mark that bears series: the data layer, no sentence, no note boxes, no legend entries of its own', async () => {
    const fixture = await render();
    const line = fixture.debugElement.query((d) => d.name === 'pct-line')
      .componentInstance as PctLine<(typeof temperature)[number]>;
    expect(line.layer()).toBe('data');
    expect(line.describe()).toBe('');
    expect(line.noteBoxes()).toEqual([]);
    expect(line.legendEntries()).toEqual([]);
  });
});
