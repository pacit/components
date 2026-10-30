import {
  Component,
  provideZonelessChangeDetection,
  signal,
} from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PctBars, type PctPick } from './bars';
import { PctAxis, PctChart } from './chart';
import { PctChartTable } from './chart-table';
import { PctChartLegend } from './legend';
import { PctLine } from './line';
import { PCT_SERIES_MARKERS } from './scene';

const H = 3_600_000;
const D = 24 * H;
/** Midnight in Warsaw on 1 March 2026. */
const MARCH = Date.UTC(2026, 1, 28, 23);
/** Midnight in Warsaw on 1 February 2026. */
const FEBRUARY = Date.UTC(2026, 0, 31, 23);

interface Day {
  readonly at: number;
  readonly energy: number | null;
}

/** Five days of March, one with no reading and one at zero. */
const march: Day[] = [
  { at: MARCH, energy: 12 },
  { at: MARCH + D, energy: 15.5 },
  { at: MARCH + 2 * D, energy: null },
  { at: MARCH + 3 * D, energy: 0 },
  { at: MARCH + 4 * D, energy: 9 },
];
/** February's first days, to compare by position. */
const february: Day[] = [
  { at: FEBRUARY, energy: 10 },
  { at: FEBRUARY + D, energy: 20 },
  { at: FEBRUARY + 2 * D, energy: 8 },
];
const solar: Day[] = [
  { at: MARCH, energy: -3 },
  { at: MARCH + D, energy: -4 },
  { at: MARCH + 3 * D, energy: -1 },
  { at: MARCH + 4 * D, energy: 2 },
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
  imports: [PctChart, PctBars, PctChartTable, PctAxis, PctChartLegend],
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
        y="energy"
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
          y="energy"
          name="Solar"
          unit="kWh"
          [stack]="stack()"
          [group]="group()"
        />
      }
    </pct-chart>
    <pct-chart-table [chart]="chart" [summary]="summary()" />
    <pct-chart-legend [chart]="chart" />
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
      <pct-bars [data]="rows" x="room" y="energy" name="Energy" unit="kWh" />
      <pct-line [data]="mean" x="at" y="energy" name="Mean" unit="kWh" />
    </pct-chart>
  `,
})
class Rooms {
  readonly rooms = ['Kitchen', 'Hall', 'Study'];
  readonly rows = [
    { room: 0, energy: 5 },
    { room: 1, energy: 2 },
    { room: 2, energy: 7 },
  ];
  readonly mean = [
    { at: 0.5, energy: 4.67 },
    { at: 2.5, energy: 4.67 },
  ];
}

interface Reading {
  readonly at: number;
  readonly energy: number | null;
}

/** Four days of March, the third missing: a value to three decimals, a negative and a zero. */
const boiler: Reading[] = [
  { at: MARCH, energy: 7.125 },
  { at: MARCH + D, energy: -2.5 },
  { at: MARCH + 3 * D, energy: 0 },
  { at: MARCH + 4 * D, energy: 4 },
];
/** A compared period: three values that are no bar, then a nine. */
const lastYear: Reading[] = [
  { at: FEBRUARY, energy: NaN },
  { at: FEBRUARY + D, energy: Infinity },
  { at: FEBRUARY + 2 * D, energy: null },
  { at: FEBRUARY + 3 * D, energy: 9 },
];

@Component({
  imports: [PctChart, PctBars],
  template: `
    <pct-chart
      ariaLabel="Boiler by day"
      timeZone="Europe/Warsaw"
      locale="en-GB"
      interval="day"
    >
      <pct-bars
        [data]="data()"
        x="at"
        y="energy"
        name="Boiler"
        unit="kWh"
        [compare]="compare()"
        compareName="Last year"
        [labels]="labels()"
        [color]="color()"
        (pick)="picked.push($event)"
      />
    </pct-chart>
  `,
})
class Boiler {
  readonly data = signal<readonly Reading[]>(boiler);
  readonly compare = signal<readonly Reading[] | undefined>(undefined);
  readonly labels = signal(false);
  readonly color = signal<number | string | undefined>(undefined);
  readonly picked: PctPick<Reading>[] = [];
}

/** The bars with nothing set but what is required, and a compared period. */
@Component({
  imports: [PctChart, PctBars],
  template: `
    <pct-chart ariaLabel="Plain" timeZone="Europe/Warsaw" interval="day">
      <pct-bars
        [data]="rows"
        x="at"
        y="energy"
        name="Plain"
        [compare]="compare"
      />
    </pct-chart>
  `,
})
class Plain {
  readonly rows = boiler;
  readonly compare = lastYear;
}

/** Bars on a time axis with no interval: nowhere to stand. */
@Component({
  imports: [PctChart, PctBars],
  template: `
    <pct-chart ariaLabel="No interval" timeZone="UTC">
      <pct-bars [data]="rows()" x="at" y="energy" name="Stray" />
    </pct-chart>
  `,
})
class Stray {
  readonly rows = signal<readonly Reading[]>([]);
}

/** Five units on a chart with four value axes: the fifth series has none. */
@Component({
  imports: [PctChart, PctBars],
  template: `
    <pct-chart ariaLabel="Five units" timeZone="Europe/Warsaw" interval="day">
      <pct-bars [data]="rows" x="at" y="energy" name="Heat" unit="kWh" />
      <pct-bars [data]="rows" x="at" y="energy" name="Warmth" unit="°C" />
      <pct-bars [data]="rows" x="at" y="energy" name="Damp" unit="%" />
      <pct-bars [data]="rows" x="at" y="energy" name="Flow" unit="l/h" />
      <pct-bars [data]="rows" x="at" y="energy" name="Power" unit="W" />
    </pct-chart>
  `,
})
class FiveUnits {
  readonly rows = boiler;
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
/** The `pct-bars` marks on the fixture, in their order. */
const marksOf = <T>(fixture: ComponentFixture<unknown>) =>
  fixture.debugElement
    .queryAll((d) => d.name === 'pct-bars')
    .map((d) => d.componentInstance as PctBars<T>);
/** The labels over the bars: their text, their place and their baseline. */
const labelsOf = (fixture: ComponentFixture<unknown>) =>
  [...element(fixture).querySelectorAll('text[data-pct-part="label"]')].map(
    (t) => ({
      text: t.textContent?.trim(),
      x: Number(t.getAttribute('x')),
      y: Number(t.getAttribute('y')),
      baseline: t.getAttribute('dominant-baseline'),
    }),
  );
/** The private colour each bar is painted with: `''` for a palette place. */
const paints = (fixture: ComponentFixture<unknown>) =>
  [
    ...element(fixture).querySelectorAll<SVGElement>(
      'rect[data-pct-part="bar"]',
    ),
  ].map((r) => r.style.getPropertyValue('--_pct-chart-color'));

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
    // the labels as the locale writes the weekday and the day
    const label = new Intl.DateTimeFormat('en-GB', {
      weekday: 'short',
      day: 'numeric',
      timeZone: 'Europe/Warsaw',
    });
    expect(texts(fixture, '[data-pct-part="axis"] .time')).toEqual(
      [0, 1, 2, 3, 4].map((d) => label.format(MARCH + d * D)),
    );
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
    // the legend's swatch is the bars' own, in its swatch form: a block in the series' place
    const block = element(fixture).querySelector(
      'pct-chart-legend [data-pct-part="swatch"]:not(.marker) rect.block',
    );
    expect(block?.getAttribute('width')).toBe('22');
    expect(
      block?.closest('[data-pct-part="swatch"]')?.getAttribute('viewBox'),
    ).toBe('0 0 24 12');
    // the marker on the cursor's line is the bars' own swatch in its marker form: a square
    const marker = element(fixture).querySelector(
      '[data-pct-part="marker"] [data-pct-part="swatch"].marker path.shape',
    );
    expect(marker?.getAttribute('d')).toBe(PCT_SERIES_MARKERS[1]);
    chart.cursor.set(MARCH + 2 * D + H);
    await settle(fixture);
    expect(chart.reading()!.rows[0].text).toBe('No reading');
    expect(
      element(fixture).querySelectorAll('[data-pct-part="marker"]'),
    ).toHaveLength(0);
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
    // the difference between the bar and the compared one, in percent of the compared, as a
    // note after the rows: in the tooltip without a swatch, and in the range's value text
    expect(chart.reading()!.notes).toEqual([
      { id: 'Heat pump:difference', name: 'Difference', text: '-22.5%' },
    ]);
    const note = element(fixture).querySelector(
      '[data-pct-part="tooltip"] .row.note',
    )!;
    expect(note.querySelector('[data-pct-part="swatch"]')).toBeNull();
    expect(texts(fixture, '[data-pct-part="tooltip"] .row.note .name')).toEqual(
      ['Difference'],
    );
    expect(
      texts(fixture, '[data-pct-part="tooltip"] .row.note .value'),
    ).toEqual(['-22.5%']);
    expect(
      element(fixture)
        .querySelector('input[data-pct-part="range"]')
        ?.getAttribute('aria-valuetext'),
    ).toContain(', February 20 kWh, Difference -22.5%');
    // no note without a bar (a gap), without a compared bar, over a compared zero, or with
    // either series hidden; none off the bands
    chart.cursor.set(MARCH + 2 * D);
    await settle(fixture);
    expect(chart.reading()!.notes).toEqual([]);
    chart.cursor.set(MARCH + 3 * D);
    await settle(fixture);
    expect(chart.reading()!.notes).toEqual([]);
    chart.cursor.set(MARCH);
    await settle(fixture);
    expect(chart.reading()!.notes[0].text).toBe('+20%');
    fixture.componentInstance.compare.set([{ at: FEBRUARY, energy: 0 }]);
    await settle(fixture);
    expect(chart.reading()!.notes).toEqual([]);
    fixture.componentInstance.compare.set(february);
    fixture.componentInstance.hidden.set(['Heat pump:compare']);
    await settle(fixture);
    expect(chart.reading()!.notes).toEqual([]);
    fixture.componentInstance.hidden.set(['Heat pump']);
    await settle(fixture);
    expect(chart.reading()!.notes).toEqual([]);
    fixture.componentInstance.hidden.set([]);
    await settle(fixture);
    expect(marksOf(fixture)[0].notesAt(MARCH - 1)).toEqual([]);
    expect(marksOf(fixture)[0].notesAt(MARCH)[0].text).toBe('+20%');
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
    // the selected band's label is never thinned away, and it is the bold one
    const shownBefore = texts(fixture, 'text[data-pct-part="label"]');
    expect(shownBefore).not.toContain('9');
    fixture.componentInstance.selected.set({
      from: MARCH + 4 * D,
      to: MARCH + 5 * D,
    });
    await settle(fixture);
    const labels = [
      ...element(fixture).querySelectorAll('text[data-pct-part="label"]'),
    ];
    expect(labels.map((l) => l.textContent)).toEqual([...shownBefore, '9']);
    expect(labels.map((l) => l.classList.contains('selected'))).toEqual([
      ...shownBefore.map(() => false),
      true,
    ]);
    // a band that is not a bar's selects nothing bold
    fixture.componentInstance.selected.set({ from: 1, to: 2 });
    await settle(fixture);
    expect(
      element(fixture).querySelectorAll('text[data-pct-part="label"].selected'),
    ).toHaveLength(0);
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
        <pct-bars [data]="rows" x="at" y="energy" name="Lost" />
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

  it('reads its defaults: a plain number stepped from zero, the name as the id and as the compared name, no labels, the compared half before the own', async () => {
    const fixture = await render(Plain);
    const chart = chartOf(fixture);
    const own = {
      id: 'Plain',
      name: 'Plain',
      unit: '',
      curve: 'step',
      color: undefined,
      fromZero: true,
    };
    expect(chart.series()).toEqual([own, { ...own, id: 'Plain:compare' }]);
    expect(chart.groupOf('Plain')).toEqual({ index: 0, count: 1 });
    expect(marksOf(fixture)[0].band()).toEqual({ group: 'Plain', stack: null });
    expect(labelsOf(fixture)).toEqual([]);
    // the band's four fifths less a gap, split in two halves a gap apart: the compared first
    const scale = chart.xScale()!;
    const band = scale.map(MARCH + D) - scale.map(MARCH);
    const each = (band * 0.8 - 2 - 2) / 2;
    const drawn = bars(fixture);
    const bars0 = drawn.filter((b) => !b.compared);
    const compared = drawn.filter((b) => b.compared);
    expect(bars0).toHaveLength(4);
    expect(compared).toHaveLength(1);
    const start = scale.map(MARCH + 3 * D) + band * 0.1 + 1;
    expect(compared[0].x).toBeCloseTo(start, 6);
    expect(compared[0].width).toBeCloseTo(each, 6);
    expect(bars0[2].x).toBeCloseTo(start + each + 2, 6);
    expect(bars0[2].width).toBeCloseTo(each, 6);
    expect(bars0[0].x).toBeCloseTo(
      scale.map(MARCH) + band * 0.1 + 1 + each + 2,
      6,
    );
  });

  it('reads a compared value that is no finite number as no bar, and answers nothing for a series it has not', async () => {
    const fixture = await render(Boiler);
    const [mark] = marksOf<Reading>(fixture);
    const chart = chartOf(fixture);
    const shown = chart.shown()!;
    const bands = chart.bands();
    expect(bands).toHaveLength(5);
    // without a compared period the compared series has no value anywhere
    expect(mark.valuesIn('Boiler:compare', bands)).toEqual([
      null,
      null,
      null,
      null,
      null,
    ]);
    expect(mark.valueAt('Boiler:compare', MARCH)).toBeNull();
    expect([...mark.readings('Nobody').ys]).toEqual([NaN, NaN, NaN, NaN, NaN]);
    fixture.componentInstance.compare.set(lastYear);
    await settle(fixture);
    expect(bars(fixture).filter((b) => b.compared)).toHaveLength(1);
    expect(mark.valuesIn('Boiler:compare', bands)).toEqual([
      null,
      null,
      null,
      9,
      null,
    ]);
    expect(mark.valuesIn('Boiler', bands)).toEqual([7.125, -2.5, null, 0, 4]);
    expect(mark.valueAt('Boiler:compare', MARCH + 3 * D + H)).toBe(9);
    expect(mark.valueAt('Boiler:compare', MARCH)).toBeNull();
    expect(mark.extent('Boiler:compare', shown)).toEqual([0, 9]);
    expect(mark.extent('Boiler', shown)).toEqual([-2.5, 7.125]);
    expect(mark.extent('Nobody', shown)).toBeNull();
    expect(mark.valueAt('Nobody', MARCH + 3 * D)).toBeNull();
    const compared = mark.readings('Boiler:compare');
    expect([...compared.xs]).toEqual(bands.map((b) => b.from));
    expect([...compared.ys]).toEqual([NaN, NaN, NaN, 9, NaN]);
    expect(compared.length).toBe(5);
    const own = mark.readings('Boiler');
    expect([...own.xs]).toEqual(bands.map((b) => b.from));
    expect([...own.ys]).toEqual([7.125, -2.5, NaN, 0, 4]);
  });

  it("answers the value, the band and the rows of a window on the bands' edges, and nothing beyond them", async () => {
    const fixture = await render(Host);
    const [mark] = marksOf<Day>(fixture);
    const bands = chartOf(fixture).bands();
    const id = 'Heat pump';
    expect(mark.valueAt(id, MARCH - H)).toBeNull();
    expect(mark.valueAt(id, MARCH)).toBe(12);
    expect(mark.valueAt(id, MARCH + D)).toBe(15.5);
    expect(mark.valueAt(id, MARCH + 2 * D + H)).toBeNull();
    expect(mark.valueAt(id, MARCH + 5 * D)).toBeNull();
    expect(mark.bandAt(id, MARCH - H)).toBeNull();
    expect(mark.bandAt(id, MARCH)).toEqual({ from: MARCH, to: MARCH + D });
    expect(mark.bandAt(id, MARCH + D)).toEqual({
      from: MARCH + D,
      to: MARCH + 2 * D,
    });
    expect(mark.bandAt(id, MARCH + 5 * D)).toBeNull();
    // the rows of a window: the starts of the bands it cuts into, not of the ones it touches
    expect(mark.rowsIn(id, { from: MARCH + D, to: MARCH + 3 * D })).toEqual([
      MARCH + D,
      MARCH + 2 * D,
    ]);
    expect(
      mark.rowsIn(id, { from: MARCH + D + H, to: MARCH + 2 * D + H }),
    ).toEqual([MARCH + D, MARCH + 2 * D]);
    expect(mark.rowsIn(id, { from: MARCH + D, to: MARCH + D })).toEqual([]);
    const readings = mark.readings(id);
    expect([...readings.xs]).toEqual(bands.map((b) => b.from));
    expect([...readings.ys]).toEqual([12, 15.5, NaN, 0, 9]);
    expect(readings.length).toBe(5);
    // a band after the rows holds none of them; a band over two days holds the last
    expect(
      mark.valuesIn(id, [{ from: MARCH + 5 * D, to: MARCH + 6 * D }]),
    ).toEqual([null]);
    expect(
      mark.valuesIn(id, [
        { from: MARCH, to: MARCH + 2 * D },
        { from: MARCH + 2 * D, to: MARCH + 5 * D },
      ]),
    ).toEqual([15.5, 9]);
    expect(mark.valuesIn(id, [{ from: MARCH + D, to: MARCH + 2 * D }])).toEqual(
      [15.5],
    );
    // the extent of a window: the bands it cuts into, zero among them, none without a value
    expect(mark.extent(id, { from: MARCH, to: MARCH + D })).toEqual([0, 12]);
    expect(mark.extent(id, { from: MARCH + D, to: MARCH + 2 * D })).toEqual([
      0, 15.5,
    ]);
    expect(mark.extent(id, { from: MARCH + 2 * D, to: MARCH + 3 * D })).toBe(
      null,
    );
    expect(
      mark.extent(id, { from: MARCH + 2 * D + H, to: MARCH + 2 * D + 2 * H }),
    ).toBeNull();
    expect(mark.extent(id, { from: MARCH + 3 * D, to: MARCH + 4 * D })).toEqual(
      [0, 0],
    );
    expect(mark.extent(id, { from: MARCH - D, to: MARCH })).toBeNull();
  });

  it('splits a band between the groups in equal slots a gap apart, and the stacked extent holds the negatives', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.second.set(true);
    await settle(fixture);
    const chart = chartOf(fixture);
    const scale = chart.xScale()!;
    const band = scale.map(MARCH + D) - scale.map(MARCH);
    const drawn = bars(fixture);
    const pump = drawn.filter((b) => b.place === '1')[0];
    const solar = drawn.filter((b) => b.place === '2')[0];
    expect(pump.x).toBeCloseTo(scale.map(MARCH) + band * 0.1 + 1, 6);
    expect(pump.width).toBeCloseTo(band * 0.4 - 2, 6);
    expect(solar.x).toBeCloseTo(pump.x + band * 0.4, 6);
    expect(solar.width).toBeCloseTo(band * 0.4 - 2, 6);
    const solarMark = marksOf<Day>(fixture)[1];
    expect(solarMark.extent('Solar', chart.shown()!)).toEqual([-4, 2]);
    fixture.componentInstance.stack.set('energy');
    await settle(fixture);
    expect(solarMark.extent('Solar', chart.shown()!)).toEqual([-4, 11]);
    expect(solarMark.extent('Solar', { from: MARCH, to: MARCH + D })).toEqual([
      -3, 0,
    ]);
  });

  it("writes each label in its bar's middle, four pixels over a positive or a zero and under a negative, to two decimals, and none over the compared bars", async () => {
    const fixture = await render(Boiler);
    fixture.componentInstance.labels.set(true);
    fixture.componentInstance.compare.set(lastYear);
    await settle(fixture);
    const own = bars(fixture).filter((b) => !b.compared);
    const shown = labelsOf(fixture);
    expect(shown.map((l) => l.text)).toEqual(['7.13', '-2.5', '0', '4']);
    expect(shown.map((l) => l.baseline)).toEqual([
      'auto',
      'hanging',
      'auto',
      'auto',
    ]);
    shown.forEach((label, i) =>
      expect(label.x).toBeCloseTo(own[i].x + own[i].width / 2, 6),
    );
    expect(shown[0].y).toBeCloseTo(own[0].y - 4, 6);
    expect(shown[1].y).toBeCloseTo(own[1].y + own[1].height + 4, 6);
    expect(shown[2].y).toBeCloseTo(own[2].y - 4, 6);
    expect(shown[3].y).toBeCloseTo(own[3].y - 4, 6);
  });

  it('picks the bar under a press, its edges included, and nothing beside, over or under it, nor a compared bar', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.compare.set(february);
    await settle(fixture);
    const [mark] = marksOf<Day>(fixture);
    const picked = fixture.componentInstance.picked;
    const own = bars(fixture).filter((b) => !b.compared);
    const compared = bars(fixture).filter((b) => b.compared);
    const [first, second] = own;
    expect(mark.pickAt('Heat pump', first.x, first.y)).toBe(true);
    expect(picked).toEqual([
      { series: 'Heat pump', index: 0, row: march[0], x: MARCH, y: 12 },
    ]);
    expect(
      mark.pickAt(
        'Heat pump',
        second.x + second.width,
        second.y + second.height,
      ),
    ).toBe(true);
    expect(picked[1]).toEqual({
      series: 'Heat pump',
      index: 1,
      row: march[1],
      x: MARCH + D,
      y: 15.5,
    });
    const beside: [number, number][] = [
      [second.x - 0.5, second.y],
      [second.x + second.width + 0.5, second.y],
      [second.x, second.y - 0.5],
      [second.x, second.y + second.height + 0.5],
      [compared[1].x + compared[1].width / 2, second.y + 1],
    ];
    for (const [x, y] of beside)
      expect(mark.pickAt('Heat pump', x, y)).toBe(false);
    expect(mark.pickAt('Heat pump:compare', second.x, second.y)).toBe(false);
    expect(mark.pickAt('Nobody', second.x, second.y)).toBe(false);
    expect(picked).toHaveLength(2);
  });

  it('draws nothing before the chart has a size', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(0);
    const fixture = await render(Host);
    const chart = chartOf(fixture);
    expect(chart.bands()).toHaveLength(5);
    expect(chart.xScale()).toBeNull();
    expect(bars(fixture)).toHaveLength(0);
    expect(marksOf<Day>(fixture)[0].pickAt('Heat pump', 10, 10)).toBe(false);
  });

  it('draws nothing for a series whose unit has no axis, the other four their bars', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const fixture = await render(FiveUnits);
    const chart = chartOf(fixture);
    expect(chart.yScales().has('W')).toBe(false);
    expect(bars(fixture)).toHaveLength(16);
    expect(marksOf<Reading>(fixture)[4].pickAt('Power', 10, 10)).toBe(false);
  });

  it("warns with the series' name and the two ways to a band once there are rows, and spans their days with no interval", async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    warn.mockClear();
    const fixture = await render(Stray);
    const ours = () =>
      warn.mock.calls
        .map(([m]) => String(m))
        .filter((m) => m.startsWith('[pct-bars]'));
    expect(ours()).toEqual([]);
    expect(marksOf<Reading>(fixture)[0].span()).toBeNull();
    fixture.componentInstance.rows.set(boiler);
    await settle(fixture);
    expect(ours()).toEqual([
      '[pct-bars] "Stray" has no band to stand in: a time axis holds bars only with an `interval` on the chart, and a `band` axis with its `categories`.',
    ]);
    expect(marksOf<Reading>(fixture)[0].span()).toEqual([MARCH, MARCH + 4 * D]);
    expect(chartOf(fixture).bands()).toEqual([]);
    expect(bars(fixture)).toHaveLength(0);
  });

  it('keeps quiet where its bars have bands or it has no rows, and spans nothing without rows', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    warn.mockClear();
    const fixture = await render(Boiler);
    const [mark] = marksOf<Reading>(fixture);
    expect(mark.span()).toEqual([MARCH, MARCH + 5 * D]);
    fixture.componentInstance.data.set([]);
    await settle(fixture);
    expect(mark.span()).toBeNull();
    expect(chartOf(fixture).bands()).toEqual([]);
    expect(bars(fixture)).toHaveLength(0);
    expect(
      warn.mock.calls.filter(([m]) => String(m).startsWith('[pct-bars]')),
    ).toEqual([]);
  });

  it("paints a colour of the consumer's own on each bar, and a palette place otherwise", async () => {
    const fixture = await render(Boiler);
    const places = () => bars(fixture).map((b) => b.place);
    expect(places()).toEqual(['1', '1', '1', '1']);
    expect(paints(fixture)).toEqual(['', '', '', '']);
    fixture.componentInstance.color.set('tomato');
    await settle(fixture);
    expect(places()).toEqual(['custom', 'custom', 'custom', 'custom']);
    expect(paints(fixture)).toEqual(['tomato', 'tomato', 'tomato', 'tomato']);
    fixture.componentInstance.color.set(3);
    await settle(fixture);
    expect(places()).toEqual(['3', '3', '3', '3']);
    expect(paints(fixture)).toEqual(['', '', '', '']);
  });
});
