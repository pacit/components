import {
  Component,
  provideZonelessChangeDetection,
  signal,
} from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PctBars, type PctPick } from './bars';
import { PctAxis, PctChart } from './chart';
import { PctChartTable } from './chart-table';
import { PctLine } from './line';

const H = 3_600_000;
const D = 24 * H;
/** Midnight in Warsaw on 1 March 2026. */
const MARCH = Date.UTC(2026, 1, 28, 23);
/** Midnight in Warsaw on 1 February 2026. */
const FEBRUARY = Date.UTC(2026, 0, 31, 23);

interface Day {
  readonly at: number;
  readonly kwh: number | null;
}

/** Five days of March, one with no reading and one at zero. */
const march: Day[] = [
  { at: MARCH, kwh: 12 },
  { at: MARCH + D, kwh: 15.5 },
  { at: MARCH + 2 * D, kwh: null },
  { at: MARCH + 3 * D, kwh: 0 },
  { at: MARCH + 4 * D, kwh: 9 },
];
/** February's first days, to compare by position. */
const february: Day[] = [
  { at: FEBRUARY, kwh: 10 },
  { at: FEBRUARY + D, kwh: 20 },
  { at: FEBRUARY + 2 * D, kwh: 8 },
];
const solar: Day[] = [
  { at: MARCH, kwh: -3 },
  { at: MARCH + D, kwh: -4 },
  { at: MARCH + 3 * D, kwh: -1 },
  { at: MARCH + 4 * D, kwh: 2 },
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
  imports: [PctChart, PctBars, PctChartTable, PctAxis],
  template: `
    <pct-chart
      #chart
      ariaLabel="Energy by day"
      timeZone="Europe/Warsaw"
      locale="en-GB"
      interval="day"
      [(window)]="window"
      [(selected)]="selected"
      [(hiddenSeries)]="hidden"
    >
      <pct-bars
        [data]="march"
        x="at"
        y="kwh"
        name="Heat pump"
        unit="kWh"
        [compare]="compare()"
        compareName="February"
        [compareSide]="side()"
        [labels]="labels()"
        [stack]="stack()"
        (pick)="picked.push($event)"
      />
      @if (second()) {
        <pct-bars
          [data]="solar"
          x="at"
          y="kwh"
          name="Solar"
          unit="kWh"
          [stack]="stack()"
          [group]="group()"
        />
      }
    </pct-chart>
    <pct-chart-table [chart]="chart" [summary]="summary()" />
  `,
})
class Host {
  readonly march = march;
  readonly solar = solar;
  readonly window = signal<{ from: number; to: number } | null>(null);
  readonly selected = signal<{ from: number; to: number } | null>(null);
  readonly hidden = signal<readonly string[]>([]);
  readonly compare = signal<readonly Day[] | undefined>(undefined);
  readonly side = signal<'before' | 'after'>('before');
  readonly labels = signal(false);
  readonly stack = signal<string | undefined>(undefined);
  readonly group = signal('');
  readonly second = signal(false);
  readonly summary = signal<'sum' | 'mean' | 'none'>('none');
  readonly picked: PctPick<Day>[] = [];
}

@Component({
  imports: [PctChart, PctBars, PctLine],
  template: `
    <pct-chart ariaLabel="Rooms" x="band" [categories]="rooms" locale="en-US">
      <pct-bars [data]="rows" x="room" y="kwh" name="Energy" unit="kWh" />
      <pct-line [data]="mean" x="at" y="kwh" name="Mean" unit="kWh" />
    </pct-chart>
  `,
})
class Rooms {
  readonly rooms = ['Kitchen', 'Hall', 'Study'];
  readonly rows = [
    { room: 0, kwh: 5 },
    { room: 1, kwh: 2 },
    { room: 2, kwh: 7 },
  ];
  readonly mean = [
    { at: 0.5, kwh: 4.67 },
    { at: 2.5, kwh: 4.67 },
  ];
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
const chartOf = (fixture: ComponentFixture<unknown>) =>
  fixture.debugElement.query((d) => d.name === 'pct-chart')
    .componentInstance as PctChart;
const bars = (fixture: ComponentFixture<unknown>) =>
  [...element(fixture).querySelectorAll('rect[data-pct-part="bar"]')].map(
    (r) => ({
      x: Number(r.getAttribute('x')),
      width: Number(r.getAttribute('width')),
      y: Number(r.getAttribute('y')),
      height: Number(r.getAttribute('height')),
      compared: r.classList.contains('compared'),
      zero: r.classList.contains('zero'),
      place: r.getAttribute('data-pct-series'),
    }),
  );
const texts = (fixture: ComponentFixture<unknown>, selector: string) =>
  [...element(fixture).querySelectorAll(selector)].map((e) =>
    e.textContent?.trim(),
  );

describe('PctBars', () => {
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

  it('draws a bar per day of the zone in four fifths of its band, none for a gap and a line for a zero', async () => {
    const fixture = await render(Host);
    const chart = chartOf(fixture);
    expect(chart.bands()).toHaveLength(5);
    expect(chart.shown()).toEqual({ from: MARCH, to: MARCH + 5 * D });
    const drawn = bars(fixture);
    expect(drawn).toHaveLength(4);
    const scale = chart.xScale()!;
    const band = scale.map(MARCH + D) - scale.map(MARCH);
    expect(drawn[0].width).toBeCloseTo(band * 0.8 - 2, 6);
    expect(drawn[0].x).toBeCloseTo(scale.map(MARCH) + band * 0.1 + 1, 6);
    expect(drawn.map((b) => b.place)).toEqual(['1', '1', '1', '1']);
    // the zero is a line a pixel high on the axis, the fifteen and a half the tallest
    expect(drawn[2].zero).toBe(true);
    expect(drawn[2].height).toBe(1);
    expect(drawn[1].height).toBeGreaterThan(drawn[0].height);
    const axis = texts(fixture, '[data-pct-unit="kWh"] .value');
    expect(axis[0]).toBe('0');
    // the time axis labels each band in its middle
    expect(texts(fixture, '[data-pct-part="axis"] .time')).toEqual([
      'Sun 1',
      'Mon 2',
      'Tue 3',
      'Wed 4',
      'Thu 5',
    ]);
  });

  it('reads the bar under the cursor, writes its band, and gives the table a row per day', async () => {
    const fixture = await render(Host);
    const chart = chartOf(fixture);
    chart.cursor.set(MARCH + D + 5 * H);
    await settle(fixture);
    expect(chart.reading()).toEqual(
      expect.objectContaining({
        text: 'Mon 2',
        rows: [expect.objectContaining({ value: 15.5, text: '15.5 kWh' })],
      }),
    );
    chart.cursor.set(MARCH + 2 * D + H);
    await settle(fixture);
    expect(chart.reading()!.rows[0].text).toBe('No reading');
    expect(texts(fixture, 'pct-chart-table tbody th')).toEqual([
      '01/03/2026, 00:00:00',
      '02/03/2026, 00:00:00',
      '03/03/2026, 00:00:00',
      '04/03/2026, 00:00:00',
      '05/03/2026, 00:00:00',
    ]);
    expect(texts(fixture, 'pct-chart-table tbody td')).toEqual([
      '12',
      '15.5',
      'No reading',
      '0',
      '9',
    ]);
    fixture.componentInstance.summary.set('sum');
    await settle(fixture);
    expect(texts(fixture, 'pct-chart-table tfoot th')).toEqual(['Sum']);
    expect(texts(fixture, 'pct-chart-table tfoot td')).toEqual(['36.5']);
    fixture.componentInstance.summary.set('mean');
    await settle(fixture);
    expect(texts(fixture, 'pct-chart-table tfoot th')).toEqual(['Mean']);
    expect(texts(fixture, 'pct-chart-table tfoot td')).toEqual(['9.125']);
  });

  it('lays a compared period beside the bars by position, lighter, before or after', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.compare.set(february);
    await settle(fixture);
    const chart = chartOf(fixture);
    expect(chart.series().map((s) => [s.id, s.name])).toEqual([
      ['Heat pump', 'Heat pump'],
      ['Heat pump:compare', 'February'],
    ]);
    const drawn = bars(fixture);
    // three compared bars for February's three rows, four of March's own
    expect(drawn.filter((b) => b.compared)).toHaveLength(3);
    expect(drawn.filter((b) => !b.compared)).toHaveLength(4);
    const first = drawn.filter((b) => !b.compared)[0];
    const compared = drawn.filter((b) => b.compared)[0];
    expect(compared.x).toBeLessThan(first.x);
    expect(compared.width).toBeCloseTo(first.width, 6);
    fixture.componentInstance.side.set('after');
    await settle(fixture);
    const after = bars(fixture);
    expect(after.filter((b) => b.compared)[0].x).toBeGreaterThan(
      after.filter((b) => !b.compared)[0].x,
    );
    chart.cursor.set(MARCH + D);
    await settle(fixture);
    expect(chart.reading()!.rows.map((r) => r.text)).toEqual([
      '15.5 kWh',
      '20 kWh',
    ]);
    expect(texts(fixture, 'pct-chart-table thead th')).toEqual([
      'Time',
      'Heat pump (kWh)',
      'February (kWh)',
    ]);
    // the compared bars go with their series when it is hidden
    fixture.componentInstance.hidden.set(['Heat pump:compare']);
    await settle(fixture);
    expect(bars(fixture).filter((b) => b.compared)).toHaveLength(0);
  });

  it('stands two marks of one stack on each other, negatives down from zero, and the axis holds both', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.stack.set('energy');
    fixture.componentInstance.second.set(true);
    await settle(fixture);
    const chart = chartOf(fixture);
    expect(
      chart.stackedOf('energy', 'Solar')!.map((s) => s && [s.from, s.to]),
    ).toEqual([[0, -3], [0, -4], null, [0, -1], [9, 11]]);
    const drawn = bars(fixture);
    // the solar's last bar stands on the heat pump's nine
    const y = chart.yScales().get('kWh')!;
    const solarLast = drawn.find(
      (b) => b.place === '2' && b.y < y.map(9) + 1 && b.y > y.map(11) - 1,
    )!;
    expect(solarLast).toBeDefined();
    expect(y.domain[0]).toBeLessThanOrEqual(-4);
    expect(y.domain[1]).toBeGreaterThanOrEqual(11);
    // both marks' bars share one slot: one group
    expect(chart.groupOf('energy')).toEqual({ index: 0, count: 1 });
    expect(drawn.filter((b) => b.place === '1')[0].x).toBeCloseTo(
      drawn.filter((b) => b.place === '2')[0].x,
      6,
    );
  });

  it('stands two groups side by side in a band', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.second.set(true);
    await settle(fixture);
    const chart = chartOf(fixture);
    expect(chart.groupOf('Heat pump')).toEqual({ index: 0, count: 2 });
    expect(chart.groupOf('Solar')).toEqual({ index: 1, count: 2 });
    const drawn = bars(fixture);
    const pump = drawn.filter((b) => b.place === '1')[0];
    const solar = drawn.filter((b) => b.place === '2')[0];
    expect(solar.x).toBeGreaterThan(pump.x + pump.width);
    expect(solar.width).toBeCloseTo(pump.width, 6);
    fixture.componentInstance.group.set('Heat pump');
    await settle(fixture);
    expect(chart.groupOf('Heat pump')).toEqual({ index: 0, count: 1 });
  });

  it('writes the values over the bars when asked, thinned where they would touch', async () => {
    const fixture = await render(Host);
    expect(
      element(fixture).querySelector('text[data-pct-part="label"]'),
    ).toBeNull();
    fixture.componentInstance.labels.set(true);
    await settle(fixture);
    expect(texts(fixture, 'text[data-pct-part="label"]')).toEqual([
      '12',
      '15.5',
      '0',
      '9',
    ]);
    // a window of one day in the plot's width: every label fits; a hundred days: fewer
    fixture.componentInstance.window.set({ from: MARCH, to: MARCH + 100 * D });
    await settle(fixture);
    expect(
      element(fixture).querySelectorAll('text[data-pct-part="label"]').length,
    ).toBeLessThan(4);
  });

  it('selects the band under a press and lets it go on the next, and picks the bar', async () => {
    const fixture = await render(Host);
    const chart = chartOf(fixture);
    const layer = element(fixture).querySelector('.overlay')!;
    const press = (x: number, y: number, at: number) => {
      for (const type of ['pointerdown', 'pointerup']) {
        const event = new MouseEvent(type, {
          bubbles: true,
          clientX: x,
          clientY: y,
        });
        Object.assign(event, {
          pointerType: 'mouse',
          pointerId: 1,
          isPrimary: true,
        });
        Object.defineProperty(event, 'timeStamp', { value: at });
        layer.dispatchEvent(event);
      }
    };
    const scale = chart.xScale()!;
    const middle = scale.map(MARCH + D + 12 * H);
    const bar = bars(fixture)[1];
    press(middle, bar.y + 2, 10_000);
    await settle(fixture);
    expect(chart.selected()).toEqual({ from: MARCH + D, to: MARCH + 2 * D });
    expect(fixture.componentInstance.picked).toEqual([
      { series: 'Heat pump', index: 1, row: march[1], x: MARCH + D, y: 15.5 },
    ]);
    const band = element(fixture).querySelector(
      '[data-pct-part="selection"]',
    ) as HTMLElement;
    expect(band.style.transform).toBe(`translateX(${scale.map(MARCH + D)}px)`);
    expect(band.style.inlineSize).toBe(
      `${scale.map(MARCH + 2 * D) - scale.map(MARCH + D)}px`,
    );
    // above the bar: the band is selected, nothing is picked
    press(middle, 2, 20_000);
    await settle(fixture);
    expect(chart.selected()).toBeNull();
    expect(fixture.componentInstance.picked).toHaveLength(1);
    press(middle, 2, 30_000);
    await settle(fixture);
    expect(chart.selected()).toEqual({ from: MARCH + D, to: MARCH + 2 * D });
    // Enter at the cursor does the same
    chart.cursor.set(MARCH + 3 * D + H);
    await settle(fixture);
    const range = element(fixture).querySelector(
      'input[data-pct-part="range"]',
    )!;
    const enter = new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true,
    });
    range.dispatchEvent(enter);
    await settle(fixture);
    expect(enter.defaultPrevented).toBe(true);
    expect(chart.selected()).toEqual({
      from: MARCH + 3 * D,
      to: MARCH + 4 * D,
    });
    const space = new KeyboardEvent('keydown', {
      key: ' ',
      bubbles: true,
      cancelable: true,
    });
    range.dispatchEvent(space);
    await settle(fixture);
    expect(chart.selected()).toBeNull();
  });

  it("stands on a band axis by category, with a line through the bands' middles", async () => {
    const fixture = await render(Rooms);
    const chart = chartOf(fixture);
    expect(chart.shown()).toEqual({ from: 0, to: 3 });
    expect(chart.bands()).toEqual([
      { from: 0, to: 1 },
      { from: 1, to: 2 },
      { from: 2, to: 3 },
    ]);
    expect(texts(fixture, '[data-pct-part="axis"] .time')).toEqual([
      'Kitchen',
      'Hall',
      'Study',
    ]);
    expect(bars(fixture)).toHaveLength(3);
    expect(
      element(fixture).querySelector('path[data-pct-part="series"]'),
    ).not.toBeNull();
    chart.cursor.set(1.5);
    await settle(fixture);
    expect(chart.reading()!.text).toBe('Hall');
    expect(chart.reading()!.rows[0].text).toBe('2 kWh');
    expect(texts(fixture, 'input[data-pct-part="range"]')).toEqual(['']);
    expect(
      element(fixture)
        .querySelector('input[data-pct-part="range"]')
        ?.getAttribute('aria-valuetext'),
    ).toBe('Hall: Energy 2 kWh, Mean 4.67 kWh');
  });

  it('warns in development of bars with nowhere to stand', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    @Component({
      imports: [PctChart, PctBars],
      template: `<pct-chart ariaLabel="No interval" timeZone="UTC">
        <pct-bars [data]="rows" x="at" y="kwh" name="Lost" />
      </pct-chart>`,
    })
    class Lost {
      readonly rows = march;
    }
    await render(Lost);
    expect(
      warn.mock.calls.some(([m]) =>
        String(m).includes('has no band to stand in'),
      ),
    ).toBe(true);
  });
});
