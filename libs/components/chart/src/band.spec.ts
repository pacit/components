import {
  Component,
  provideZonelessChangeDetection,
  signal,
} from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PctBand, type PctBandState } from './band';
import { PctChart } from './chart';
import { PctChartTable } from './chart-table';
import { PctChartLegend } from './legend';
import { PctLine } from './line';

const H = 3_600_000;
const T0 = Date.UTC(2026, 9, 28, 0);
/** A day of hourly readings rising from 18 to 24 °C. */
const temperature = Array.from({ length: 25 }, (_, i) => ({
  at: T0 + i * H,
  value: 18 + i * 0.25,
}));
/** The heat pump's mode through the day, in hours from midnight. */
const modes = [
  ['off', 0, 5],
  ['heating', 5, 7.5],
  ['defrost', 7.5, 8],
  ['heating', 8, 9],
  ['standby', 9, 16],
  ['heating', 16, 20],
  ['defrost', 20, 20.25],
  ['heating', 20.25, 22],
  ['off', 22, 24],
].map(([mode, from, to]) => ({
  mode: mode as string,
  from: T0 + (from as number) * H,
  to: T0 + (to as number) * H,
}));
const STATES: Record<string, PctBandState> = {
  heating: { color: 1, label: 'Heating' },
  defrost: { color: 'tomato', label: 'Defrost' },
};

@Component({
  imports: [PctChart, PctLine, PctBand, PctChartLegend, PctChartTable],
  template: `
    <pct-chart
      #chart
      ariaLabel="Heat pump"
      timeZone="UTC"
      locale="en-US"
      [x]="kind()"
      [orientation]="orientation()"
      [(hiddenSeries)]="hidden"
      [(cursor)]="cursor"
    >
      @if (withLine()) {
        <pct-line [data]="rows" x="at" y="value" name="Supply air" unit="°C" />
      }
      <pct-band
        [data]="data()"
        from="from"
        to="to"
        state="mode"
        [label]="label()"
        [states]="states()"
        [lane]="lane()"
        [legend]="legend()"
      />
      @if (second()) {
        <pct-band
          [data]="data()"
          from="from"
          to="to"
          state="mode"
          label="Second"
          lane="second"
          [legend]="false"
        />
      }
    </pct-chart>
    <pct-chart-legend [chart]="chart" />
    <pct-chart-table [chart]="chart" summary="sum" />
  `,
})
class Host {
  readonly rows = temperature;
  readonly kind = signal<'time' | 'linear'>('time');
  readonly orientation = signal<'vertical' | 'horizontal'>('vertical');
  readonly hidden = signal<readonly string[]>([]);
  readonly cursor = signal<number | null>(null);
  readonly withLine = signal(true);
  readonly data = signal(modes);
  readonly label = signal('Mode');
  readonly states = signal<Record<string, PctBandState>>(STATES);
  readonly lane = signal('below');
  readonly legend = signal(true);
  readonly second = signal(false);
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
const query = (fixture: ComponentFixture<unknown>, selector: string) =>
  element(fixture).querySelector(selector);
const all = (fixture: ComponentFixture<unknown>, selector: string) => [
  ...element(fixture).querySelectorAll(selector),
];
const chartOf = (fixture: ComponentFixture<unknown>) =>
  fixture.debugElement.query((d) => d.name === 'pct-chart')
    .componentInstance as PctChart;
const tableOf = (fixture: ComponentFixture<unknown>) =>
  fixture.debugElement.query((d) => d.name === 'pct-chart-table')
    .componentInstance as PctChartTable;
const numbers = (el: Element | null, names: readonly string[]) =>
  names.map((n) => Number(el?.getAttribute(n)));
const clipOf = (fixture: ComponentFixture<unknown>) =>
  numbers(query(fixture, 'clipPath rect'), ['x', 'y', 'width', 'height']);
const group = (fixture: ComponentFixture<unknown>) =>
  query(fixture, '[data-pct-part="band"]');
const segments = (fixture: ComponentFixture<unknown>) =>
  all(fixture, '[data-pct-part="band"] [data-pct-part="segment"]').map(
    (rect) => ({
      box: numbers(rect, ['x', 'y', 'width', 'height']),
      place: rect.getAttribute('data-pct-series'),
      color: (rect as HTMLElement).style.getPropertyValue('--_pct-chart-color'),
    }),
  );
const described = (fixture: ComponentFixture<unknown>) =>
  query(fixture, '.description')?.textContent?.trim() ?? null;
const range = (fixture: ComponentFixture<unknown>) =>
  query(fixture, 'input[data-pct-part="range"]') as HTMLInputElement;
const key = async (fixture: ComponentFixture<unknown>, name: string) => {
  range(fixture).dispatchEvent(
    new KeyboardEvent('keydown', {
      key: name,
      bubbles: true,
      cancelable: true,
    }),
  );
  await settle(fixture);
};
const items = (fixture: ComponentFixture<unknown>) =>
  all(fixture, '[data-pct-part="item"]').map((item) => ({
    name: item.querySelector('.name')!.textContent,
    value: item.querySelector('.value')?.textContent ?? null,
    place: item
      .querySelector('[data-pct-part="swatch"]')!
      .getAttribute('data-pct-series'),
    hidden: item.classList.contains('hidden'),
  }));
const noteRows = (fixture: ComponentFixture<unknown>) =>
  all(fixture, '[data-pct-part="tooltip"] .row.note').map((row) => ({
    name: row.querySelector('.name')!.textContent,
    value: row.querySelector('.value')!.textContent,
    swatch:
      row
        .querySelector('[data-pct-part="swatch"].marker')
        ?.getAttribute('data-pct-series') ?? null,
  }));
const tableHeaders = (fixture: ComponentFixture<unknown>) =>
  all(fixture, 'thead th').map((th) => ({
    text: th.textContent!.trim(),
    numeric: th.hasAttribute('numeric'),
  }));
const tableRows = (fixture: ComponentFixture<unknown>) =>
  all(fixture, 'tbody tr').map((tr) =>
    [...tr.querySelectorAll('td')].map((td) => td.textContent!.trim()),
  );

describe('PctBand', () => {
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
    // The table's frame watches its width; jsdom has no observer.
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

  it('draws a block per segment in a lane under the plot, in the states’ colours — given, or the next free place — and the picture, the axis and the cursor reach under the lane', async () => {
    const fixture = await render();
    const chart = chartOf(fixture);
    const scale = chart.xScale()!;
    // the plot gives the lane its height and a gap: 300 − 19 − 6 − (16 + 6) = 253
    const [left, top, width, height] = clipOf(fixture);
    expect([top, height]).toEqual([25, 250]);
    expect(chart.frame().bottom).toBe(253);
    expect(chart.laneFrame('below')).toEqual({
      left,
      right: left + width,
      top: 259,
      bottom: 275,
    });
    expect(chart.laneFrame('nothing')).toBeNull();
    const drawn = segments(fixture);
    expect(drawn).toHaveLength(9);
    expect(drawn[0].box).toEqual([
      scale.map(T0),
      259,
      scale.map(T0 + 5 * H) - scale.map(T0),
      16,
    ]);
    // heating in place 1 as given, defrost in tomato, off and standby in the next free places
    expect(drawn.map((s) => s.place)).toEqual([
      '2',
      '1',
      'custom',
      '1',
      '3',
      '1',
      'custom',
      '1',
      '2',
    ]);
    expect(drawn[2].color).toBe('tomato');
    expect(drawn[0].color).toBe('');
    expect(group(fixture)!.classList.contains('tint')).toBe(false);
    // the time axis stands under the lane, and the cursor's line reaches it
    expect(
      query(fixture, '[data-pct-part="axis"] line')!.getAttribute('y1'),
    ).toBe('275');
    fixture.componentInstance.cursor.set(T0 + 6 * H);
    await settle(fixture);
    expect(
      (query(fixture, '[data-pct-part="cursor"]') as HTMLElement).style
        .blockSize,
    ).toBe('250px');
    // the band has no series, no axis of its own and no extent
    expect(chart.series().map((s) => s.name)).toEqual(['Supply air']);
    expect(all(fixture, '[data-pct-slot]')).toHaveLength(1);
    const band = fixture.debugElement.query((d) => d.name === 'pct-band')
      .componentInstance as PctBand<unknown>;
    expect(band.extent('Mode', { from: T0, to: T0 + H })).toBeNull();
    expect(band.valueAt('Mode', T0)).toBeNull();
    expect(band.readings('other')).toEqual({
      xs: new Float64Array(0),
      ys: new Float64Array(0),
      length: 0,
    });
    expect(band.rowsIn('other', { from: T0, to: T0 + H })).toBeNull();
    expect(band.textAt('other', T0)).toBeNull();
  });

  it('two bands take two lanes, in the order of the marks, and the plot gives both their room', async () => {
    const fixture = await render();
    fixture.componentInstance.second.set(true);
    await settle(fixture);
    const chart = chartOf(fixture);
    expect(chart.frame().bottom).toBe(231);
    expect(chart.laneFrame('below')!.top).toBe(237);
    expect(chart.laneFrame('second')).toMatchObject({ top: 259, bottom: 275 });
    expect(all(fixture, '[data-pct-part="band"]')).toHaveLength(2);
    expect(clipOf(fixture)[3]).toBe(250);
  });

  it('cut to the window: a segment across the edge is drawn from it, one outside is not', async () => {
    const fixture = await render();
    const chart = chartOf(fixture);
    chart.window.set({ from: T0 + 6 * H, to: T0 + 8.5 * H });
    await settle(fixture);
    const scale = chart.xScale()!;
    const drawn = segments(fixture);
    expect(drawn.map((s) => s.place)).toEqual(['1', 'custom', '1']);
    expect(drawn[0].box[0]).toBe(scale.map(T0 + 6 * H));
    expect(drawn[2].box[2]).toBe(
      scale.map(T0 + 8.5 * H) - scale.map(T0 + 8 * H),
    );
  });

  it('tints the whole plot behind the series with lane="plot", and asks the scene for no lane', async () => {
    const fixture = await render();
    fixture.componentInstance.lane.set('plot');
    await settle(fixture);
    const chart = chartOf(fixture);
    expect(chart.frame().bottom).toBe(275);
    expect(chart.laneFrame('below')).toBeNull();
    const g = group(fixture)!;
    expect(g.classList.contains('tint')).toBe(true);
    expect(segments(fixture)[0].box.slice(1)).toEqual([
      25,
      expect.any(Number),
      250,
    ]);
    const path = query(fixture, '[data-pct-part="series"]')!;
    expect(
      g.compareDocumentPosition(path) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('alone in a scene it takes the whole plot, with a time axis and no value axis, and the chart is not empty; with no segment it is', async () => {
    const fixture = await render();
    const host = fixture.componentInstance;
    host.withLine.set(false);
    await settle(fixture);
    const chart = chartOf(fixture);
    expect(chart.series()).toEqual([]);
    expect(all(fixture, '[data-pct-slot]')).toHaveLength(0);
    expect(clipOf(fixture)).toEqual([8, 8, 584, 267]);
    expect(chart.laneFrame('below')).toEqual({
      left: 8,
      right: 592,
      top: 8,
      bottom: 275,
    });
    expect(segments(fixture)[0].box[3]).toBe(267);
    expect(query(fixture, '.empty')).toBeNull();
    expect(chart.shown()).toEqual({ from: T0, to: T0 + 24 * H });
    // two bands alone share the plot in equal strips, a gap between
    host.second.set(true);
    await settle(fixture);
    expect(chart.laneFrame('below')).toEqual({
      left: 8,
      right: 592,
      top: 8,
      bottom: 138.5,
    });
    expect(chart.laneFrame('second')).toEqual({
      left: 8,
      right: 592,
      top: 144.5,
      bottom: 275,
    });
    host.second.set(false);
    // no segment: nothing to draw, and the scene says so
    host.data.set([]);
    await settle(fixture);
    expect(query(fixture, '.empty')).not.toBeNull();
    expect(group(fixture)).toBeNull();
    expect(described(fixture)).toBeNull();
  });

  it('the tooltip names the state under the cursor with its swatch and how long it held, the range says it, the legend shows it beside the state, and the keys step from segment to segment', async () => {
    const fixture = await render();
    const host = fixture.componentInstance;
    host.cursor.set(T0 + 6 * H);
    await settle(fixture);
    expect(noteRows(fixture)).toEqual([
      { name: 'Heating', value: '2 hr, 30 min', swatch: '1' },
    ]);
    expect(range(fixture).getAttribute('aria-valuetext')).toBe(
      `${chartOf(fixture).writePosition(T0 + 6 * H, 'full')}: Supply air 19.5 °C, Heating 2 hr, 30 min`,
    );
    expect(items(fixture)).toEqual([
      { name: 'Supply air', value: '19.5 °C', place: '1', hidden: false },
      { name: 'Heating', value: '2 hr, 30 min', place: '1', hidden: false },
      { name: 'Defrost', value: null, place: 'custom', hidden: false },
      { name: 'off', value: null, place: '2', hidden: false },
      { name: 'standby', value: null, place: '3', hidden: false },
    ]);
    // the end of the last segment is still read; past it, nothing
    host.cursor.set(T0 + 24 * H);
    await settle(fixture);
    expect(noteRows(fixture)[0].name).toBe('off');
    expect(noteRows(fixture)[0].value).toBe('2 hr');
    host.cursor.set(T0 + 20 * H + 1);
    await settle(fixture);
    expect(noteRows(fixture)).toEqual([
      { name: 'Defrost', value: '15 min', swatch: 'custom' },
    ]);
    // the keys: alone, the segments' starts are the stops
    host.withLine.set(false);
    host.cursor.set(null);
    await settle(fixture);
    await key(fixture, 'ArrowRight');
    expect(chartOf(fixture).cursor()).toBe(T0);
    await key(fixture, 'ArrowRight');
    expect(chartOf(fixture).cursor()).toBe(T0 + 5 * H);
    await key(fixture, 'ArrowRight');
    expect(chartOf(fixture).cursor()).toBe(T0 + 7.5 * H);
    await key(fixture, 'End');
    expect(chartOf(fixture).cursor()).toBe(T0 + 22 * H);
    // no marker on the cursor's line: the band has no value to mark
    expect(all(fixture, '[data-pct-part="marker"]')).toHaveLength(0);
  });

  it('a reader hears how long each state held in the window, the states in the legend’s order', async () => {
    const fixture = await render();
    const chart = chartOf(fixture);
    expect(described(fixture)).toBe(
      'Mode: Heating 9 hr, 15 min; Defrost 45 min; off 7 hr; standby 7 hr.',
    );
    chart.window.set({ from: T0 + 6 * H, to: T0 + 10 * H });
    await settle(fixture);
    expect(described(fixture)).toBe(
      'Mode: Heating 2 hr, 30 min; Defrost 30 min; standby 1 hr.',
    );
    chart.window.set({ from: T0 + 30 * H, to: T0 + 40 * H });
    await settle(fixture);
    expect(described(fixture)).toBeNull();
    // the kind's name stands for a missing label
    chart.window.set(null);
    fixture.componentInstance.label.set('');
    await settle(fixture);
    expect(described(fixture)).toMatch(/^States: Heating/);
    expect(tableHeaders(fixture)[2].text).toBe('States');
  });

  it('a toggle hides a state’s segments, its sentence and its rows; the band is hidden whole by its id; legend=false lists no state', async () => {
    const fixture = await render();
    const host = fixture.componentInstance;
    (all(fixture, '[data-pct-part="toggle"]')[2] as HTMLElement).click();
    await settle(fixture);
    expect(host.hidden()).toEqual(['Mode:defrost']);
    expect(segments(fixture).map((s) => s.place)).not.toContain('custom');
    expect(items(fixture)[2]).toMatchObject({ name: 'Defrost', hidden: true });
    expect(described(fixture)).toBe(
      'Mode: Heating 9 hr, 15 min; off 7 hr; standby 7 hr.',
    );
    host.cursor.set(T0 + 7.75 * H);
    await settle(fixture);
    expect(noteRows(fixture)).toEqual([]);
    expect(tableRows(fixture)).toHaveLength(7);
    // the whole band, by its id
    host.hidden.set(['Mode']);
    await settle(fixture);
    expect(group(fixture)).toBeNull();
    expect(items(fixture).map((i) => i.name)).toEqual(['Supply air']);
    expect(described(fixture)).toBeNull();
    expect(tableHeaders(fixture).map((h) => h.text)).toEqual([
      'Time',
      'Supply air (°C)',
    ]);
    expect(query(fixture, '.empty')).toBeNull();
    // a band alone and hidden: every mark is hidden, and the scene says so
    host.withLine.set(false);
    await settle(fixture);
    expect(query(fixture, '.empty')).not.toBeNull();
    host.hidden.set([]);
    host.legend.set(false);
    await settle(fixture);
    expect(items(fixture)).toEqual([]);
    expect(group(fixture)).not.toBeNull();
  });

  it('the table gets a column of text with a row per segment, the window’s start where one holds across it, exported as text', async () => {
    const fixture = await render();
    const chart = chartOf(fixture);
    expect(tableHeaders(fixture)).toEqual([
      { text: 'Time', numeric: false },
      { text: 'Supply air (°C)', numeric: true },
      { text: 'Mode', numeric: false },
    ]);
    const rows = tableRows(fixture);
    expect(rows).toHaveLength(9);
    expect(rows.map((r) => r[1])).toEqual([
      'off',
      'Heating',
      'Defrost',
      'Heating',
      'standby',
      'Heating',
      'Defrost',
      'Heating',
      'off',
    ]);
    expect(rows[1][0]).toBe('19.25');
    expect(rows[2][0]).toBe('19.875');
    // the foot sums the series and leaves the words empty
    expect(
      all(fixture, 'tfoot td').map((td) => td.textContent!.trim()),
    ).toEqual([expect.stringMatching(/^\d/), '']);
    const csv = tableOf(fixture).csv().split('\r\n');
    expect(csv[0]).toBe('Time,Supply air (°C),Mode');
    expect(csv[1].endsWith(',18,off')).toBe(true);
    // a window inside a segment: its start is a row of that state
    chart.window.set({ from: T0 + 10 * H, to: T0 + 17 * H });
    await settle(fixture);
    expect(tableRows(fixture).map((r) => r[1])).toEqual(['standby', 'Heating']);
    // a gap in the band is a gap in the column, and empty in the CSV
    chart.window.set(null);
    fixture.componentInstance.data.set(modes.slice(1));
    await settle(fixture);
    expect(tableRows(fixture)[0]).toEqual(['19.25', 'Heating']);
    chart.window.set({ from: T0, to: T0 + 6 * H });
    await settle(fixture);
    expect(tableRows(fixture)[0][1]).toBe('Heating');
    fixture.componentInstance.data.set([
      { mode: 'off', from: T0, to: T0 + 2 * H },
      { mode: 'heating', from: T0 + 4 * H, to: T0 + 6 * H },
    ]);
    fixture.componentInstance.withLine.set(true);
    await settle(fixture);
    const table = tableOf(fixture);
    const lines = table.csv().split('\r\n');
    expect(lines).toHaveLength(3);
    expect(lines[1].endsWith(',off')).toBe(true);
  });

  it('turns with the scene: the lane stands to the right of the plot, and a segment runs down it', async () => {
    const fixture = await render();
    fixture.componentInstance.orientation.set('horizontal');
    await settle(fixture);
    const chart = chartOf(fixture);
    const { right } = chart.frame();
    expect(chart.laneFrame('below')).toMatchObject({
      left: right + 6,
      right: right + 22,
    });
    const scale = chart.xScale()!;
    expect(segments(fixture)[0].box).toEqual([
      right + 6,
      scale.map(T0),
      16,
      scale.map(T0 + 5 * H) - scale.map(T0),
    ]);
    expect(clipOf(fixture)[2]).toBe(right + 22 - chart.frame().left);
  });

  it('on a numeric axis the length is a number, not a duration', async () => {
    const fixture = await render();
    const host = fixture.componentInstance;
    host.kind.set('linear');
    host.cursor.set(T0 + 6 * H);
    await settle(fixture);
    const chart = chartOf(fixture);
    expect(noteRows(fixture)[0].value).toBe(chart.writeValue(2.5 * H, ''));
    expect(described(fixture)).toContain(
      `Heating ${chart.writeValue(9.25 * H, '')}`,
    );
  });
});
