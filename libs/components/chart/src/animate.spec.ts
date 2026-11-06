import {
  Component,
  provideZonelessChangeDetection,
  signal,
} from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PctArea } from './area';
import { PctBars } from './bars';
import { PctChart } from './chart';
import { PctGauge } from './gauge';
import { PctLine } from './line';
import { PctPie } from './pie';
import { PctPoints } from './points';
import { PctRange } from './range';
import { PctChartScene } from './scene';

const H = 3_600_000;
const T0 = Date.UTC(2026, 9, 28, 0);
const day = (value: (i: number) => number) =>
  Array.from({ length: 5 }, (_, i) => ({ at: T0 + i * H, value: value(i) }));
const MOTION = '--pct-motion-transition-duration: 150ms';

@Component({
  imports: [PctChart, PctLine, PctArea, PctBars],
  template: `
    <pct-chart
      ariaLabel="Supply and return"
      timeZone="UTC"
      locale="en-US"
      [animate]="animate()"
    >
      <pct-line
        [data]="supply()"
        x="at"
        y="value"
        name="Supply"
        unit="°C"
        [style]="motion"
      />
      <pct-area
        [data]="back()"
        x="at"
        y="value"
        name="Return"
        unit="°C"
        [style]="motion"
      />
    </pct-chart>
    <pct-chart
      ariaLabel="Rooms"
      x="band"
      [categories]="rooms"
      locale="en-US"
      animate
    >
      <pct-bars
        [data]="energy()"
        x="room"
        y="energy"
        name="Energy"
        unit="kWh"
        stack="all"
        [style]="motion"
      />
      <pct-bars
        [data]="heat()"
        x="room"
        y="energy"
        name="Heat"
        unit="kWh"
        stack="all"
        [style]="motion"
      />
    </pct-chart>
  `,
})
class Host {
  readonly motion = MOTION;
  readonly animate = signal(true);
  readonly supply = signal(day(() => 18));
  readonly back = signal(day(() => 10));
  readonly rooms = ['Kitchen', 'Hall'];
  readonly energy = signal([
    { room: 0, energy: 4 },
    { room: 1, energy: 2 },
  ]);
  readonly heat = signal([
    { room: 0, energy: 1 },
    { room: 1, energy: 1 },
  ]);
}

@Component({
  imports: [PctChart, PctArea],
  template: `
    <pct-chart ariaLabel="Heat by source" timeZone="UTC" locale="en-US" animate>
      <pct-area
        [data]="gas()"
        x="at"
        y="value"
        name="Gas"
        unit="kW"
        stack="heat"
        [style]="motion"
      />
      <pct-area
        [data]="solar"
        x="at"
        y="value"
        name="Solar"
        unit="kW"
        stack="heat"
        [style]="motion"
      />
    </pct-chart>
  `,
})
class Stacked {
  readonly motion = MOTION;
  readonly gas = signal(day(() => 4));
  readonly solar = day(() => 1);
}

// Twenty thousand readings, past where a frame reads a pyramid, with one spike: before the
// change in the middle, after it near the front.
const SPIKED = 20_000;
const spiked = (at: number, value: number) =>
  Array.from({ length: SPIKED }, (_, i) => ({
    at: T0 + i * 1000,
    value: i === at ? value : 0,
  }));

@Component({
  imports: [PctChart, PctLine, PctArea],
  template: `
    <pct-chart ariaLabel="Flow" timeZone="UTC" locale="en-US" animate>
      <pct-line [data]="rows()" x="at" y="value" name="Flow" [style]="motion" />
    </pct-chart>
    <pct-chart ariaLabel="Spill" timeZone="UTC" locale="en-US" animate>
      <pct-area
        [data]="rows()"
        x="at"
        y="value"
        name="Spill"
        [style]="motion"
      />
    </pct-chart>
  `,
})
class Spiked {
  readonly motion = MOTION;
  readonly rows = signal(spiked(10_005, 1000));
}

describe('animate', () => {
  let progress: number;
  let state: AnimationPlayState;
  let frames: FrameRequestCallback[];

  beforeEach(() => {
    progress = 0;
    state = 'running';
    frames = [];
    // jsdom runs no animations: the browser's timing, stood in for here
    vi.stubGlobal(
      'KeyframeEffect',
      class {
        getComputedTiming() {
          return { progress };
        }
      },
    );
    vi.stubGlobal(
      'Animation',
      class {
        play() {
          // runs on the stubbed progress
        }
        cancel() {
          // nothing runs to stop
        }
        get playState() {
          return state;
        }
      },
    );
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      frames.push(callback);
      return frames.length;
    });
    vi.stubGlobal('cancelAnimationFrame', () => undefined);
  });

  afterEach(() => vi.unstubAllGlobals());

  async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
    for (let i = 0; i < 4; i++) {
      fixture.detectChanges();
      await fixture.whenStable();
    }
  }
  async function render(): Promise<ComponentFixture<Host>> {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    });
    const fixture = TestBed.createComponent(Host);
    await settle(fixture);
    return fixture;
  }
  const charts = (fixture: ComponentFixture<Host>) =>
    fixture.debugElement
      .queryAll((d) => d.name === 'pct-chart')
      .map((d) => d.componentInstance as PctChart);
  const frame = async (fixture: ComponentFixture<Host>, at: number) => {
    progress = at;
    frames.splice(0).forEach((callback) => callback(0));
    await settle(fixture);
  };

  it('eases a line, an area and stacked bars from the values drawn to the new, as drawn', async () => {
    const fixture = await render();
    const [time, rooms] = charts(fixture);
    const host = fixture.componentInstance;
    const before = time.yScales().get('°C')!.domain[1];
    host.supply.set(day(() => 28));
    host.back.set(day(() => 20));
    host.energy.set([
      { room: 0, energy: 8 },
      { room: 1, energy: 2 },
    ]);
    await settle(fixture);
    // nothing moved before the first frame
    expect(time.valueAt('Supply', T0 + H)).toBe(18);
    expect(time.valueAt('Return', T0 + H)).toBe(10);
    expect(rooms.valueAt('Energy', 0.5)).toBe(4);
    await frame(fixture, 0.5);
    expect(time.valueAt('Supply', T0 + H)).toBe(23);
    expect(time.valueAt('Return', T0 + H)).toBe(15);
    expect(rooms.valueAt('Energy', 0.5)).toBe(6);
    // the stack above stands on the bar on its way
    expect(rooms.stackedOf('all', 'Heat')?.[0]).toEqual({ from: 6, to: 7 });
    // the axis follows what is drawn
    expect(time.yScales().get('°C')!.domain[1]).toBeGreaterThan(before);
    state = 'finished';
    await frame(fixture, 1);
    expect(time.valueAt('Supply', T0 + H)).toBe(28);
    expect(rooms.valueAt('Energy', 0.5)).toBe(8);
  });

  it('reads the data, never a step on the way, into the table and the description', async () => {
    const fixture = await render();
    const [time, rooms] = charts(fixture);
    fixture.componentInstance.supply.set(day(() => 28));
    fixture.componentInstance.energy.set([
      { room: 0, energy: 8 },
      { room: 1, energy: 2 },
    ]);
    await settle(fixture);
    await frame(fixture, 0.5);
    expect(time.describe()).toContain('Supply from 28 °C to 28 °C, last 28 °C');
    expect([...rooms.markOf('Energy')!.readings('Energy').ys]).toEqual([8, 2]);
  });

  it('draws at once readings added, and every change of a chart that does not animate', async () => {
    const fixture = await render();
    const [time] = charts(fixture);
    const host = fixture.componentInstance;
    host.supply.set([...day(() => 18), { at: T0 + 5 * H, value: 30 }]);
    await settle(fixture);
    expect(time.valueAt('Supply', T0 + 5 * H)).toBe(30);
    host.animate.set(false);
    host.back.set(day(() => 12));
    await settle(fixture);
    expect(time.valueAt('Return', T0 + H)).toBe(12);
  });

  it('eases an area on a stack, and the area standing on it', async () => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    });
    const fixture = TestBed.createComponent(Stacked);
    await settle(fixture);
    const chart = fixture.debugElement.query((d) => d.name === 'pct-chart')
      .componentInstance as PctChart;
    fixture.componentInstance.gas.set(day(() => 8));
    await settle(fixture);
    expect(chart.markOf('Solar')!.drawnAt('Solar', T0 + H)).toBe(5);
    progress = 0.5;
    frames.splice(0).forEach((callback) => callback(0));
    await settle(fixture);
    expect(chart.valueAt('Gas', T0 + H)).toBe(6);
    expect(chart.markOf('Solar')!.drawnAt('Solar', T0 + H)).toBe(7);
  });

  it('reads no pyramid of the data into the readings on their way to it', async () => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    });
    const fixture = TestBed.createComponent(Spiked);
    await settle(fixture);
    const [flow, spill] = fixture.debugElement
      .queryAll((d) => d.name === 'pct-chart')
      .map((d) => d.componentInstance as PctChart);
    fixture.componentInstance.rows.set(spiked(2000, 1));
    await settle(fixture);
    progress = 0.5;
    frames.splice(0).forEach((callback) => callback(0));
    await settle(fixture);
    const window = { from: T0, to: T0 + SPIKED * 1000 };
    // halfway: the spike before at 500, the one after at 0.5; the pyramid of the data knows
    // only the second
    expect(flow.markOf('Flow')!.extent('Flow', window)).toEqual([0, 500]);
    expect(spill.markOf('Spill')!.extent('Spill', window)).toEqual([0, 500]);
  });

  it('is off in a scene that does not say', () => {
    const Bare = class extends (PctChartScene as unknown as new () => object) {};
    expect((new Bare() as PctChartScene).animate()).toBe(false);
  });

  it('is off unless asked for', async () => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    });
    const fixture = TestBed.createComponent(PctChart);
    expect(fixture.componentInstance.animate()).toBe(false);
  });
});

// A reading at each hour of the day, the four columns of a range and a point's size each a
// function of the hour.
const hours = <R>(row: (i: number) => R) =>
  Array.from({ length: 5 }, (_, i) => ({ at: T0 + i * H, ...row(i) }));
const POINTS = (value: number, size: number) =>
  hours((i) => ({ value: value + i, size }));
const SPANS = (low: number, high: number) =>
  hours((i) => ({ low: low + i, high: high + i }));
const CANDLES = (low: number, high: number, open: number, close: number) =>
  hours((i) => ({
    low: low + i,
    high: high + i,
    open: open + i,
    close: close + i,
  }));

/** Each mark eased, and beside it the same mark drawn at once from the values halfway. */
@Component({
  imports: [PctChart, PctPoints, PctRange, PctPie, PctGauge],
  template: `
    @for (way of ways; track way.name) {
      <pct-chart
        [attr.data-testid]="way.name"
        [ariaLabel]="way.name"
        timeZone="UTC"
        locale="en-US"
        [animate]="way.eased"
      >
        <pct-points
          [data]="way.eased ? points() : halfway.points"
          x="at"
          y="value"
          size="size"
          name="Rooms"
          unit="°C"
          [style]="motion"
        />
        <pct-range
          [data]="way.eased ? spans() : halfway.spans"
          x="at"
          low="low"
          high="high"
          name="Span"
          unit="°C"
          [style]="motion"
        />
        <pct-range
          [data]="way.eased ? candles() : halfway.candles"
          x="at"
          low="low"
          high="high"
          open="open"
          close="close"
          name="Price"
          unit="°C"
          [style]="motion"
        />
      </pct-chart>
      <pct-pie
        [attr.data-testid]="way.name + '-pie'"
        [ariaLabel]="way.name + ' use'"
        [data]="way.eased ? uses() : halfway.uses"
        value="kwh"
        name="room"
        labels="none"
        locale="en-US"
        [animate]="way.eased"
        [style]="motion"
      />
      <pct-gauge
        [attr.data-testid]="way.name + '-gauge'"
        [ariaLabel]="way.name + ' supply'"
        [value]="way.eased ? supply() : halfway.supply"
        [min]="10"
        [max]="30"
        locale="en-US"
        [animate]="way.eased"
        [style]="motion"
      />
    }
  `,
})
class Shapes {
  readonly motion = MOTION;
  readonly ways = [
    { name: 'eased', eased: true },
    { name: 'halfway', eased: false },
  ];
  readonly points = signal(POINTS(10, 4));
  readonly spans = signal(SPANS(10, 20));
  readonly candles = signal(CANDLES(5, 30, 10, 20));
  readonly uses = signal([
    { room: 'Heating', kwh: 10 },
    { room: 'Cooling', kwh: 10 },
  ]);
  readonly supply = signal<number | null>(15);
  readonly halfway = {
    points: POINTS(20, 6),
    spans: SPANS(15, 30),
    candles: CANDLES(10, 40, 15, 30),
    uses: [
      { room: 'Heating', kwh: 20 },
      { room: 'Cooling', kwh: 10 },
    ],
    supply: 20,
  };
}

describe('animate, beyond lines, areas and bars', () => {
  let progress: number;
  let state: AnimationPlayState;
  let frames: FrameRequestCallback[];
  const SIZED = ['PCT-CHART', 'PCT-PIE', 'PCT-GAUGE'];

  beforeEach(() => {
    progress = 0;
    state = 'running';
    frames = [];
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(
      function (this: HTMLElement) {
        return SIZED.includes(this.tagName) ? 400 : 0;
      },
    );
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockImplementation(
      function (this: HTMLElement) {
        return SIZED.includes(this.tagName) ? 300 : 0;
      },
    );
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
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
    // jsdom runs no animations: the browser's timing, stood in for here
    vi.stubGlobal(
      'KeyframeEffect',
      class {
        getComputedTiming() {
          return { progress };
        }
      },
    );
    vi.stubGlobal(
      'Animation',
      class {
        play() {
          // runs on the stubbed progress
        }
        cancel() {
          // nothing runs
        }
        get playState() {
          return state;
        }
      },
    );
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      frames.push(callback);
      return frames.length;
    });
    vi.stubGlobal('cancelAnimationFrame', () => undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
    for (let i = 0; i < 4; i++) {
      fixture.detectChanges();
      await fixture.whenStable();
    }
  }
  const frame = async (fixture: ComponentFixture<Shapes>, at: number) => {
    progress = at;
    frames.splice(0).forEach((callback) => callback(0));
    await settle(fixture);
  };
  /** The geometry of every element of a part under `root`, in order. */
  const drawn = (root: HTMLElement, part: string) =>
    [...root.querySelectorAll(`[data-pct-part="${part}"]`)].map((e) =>
      ['d', 'cx', 'cy', 'r', 'x', 'y', 'width', 'height', 'transform']
        .map((name) => e.getAttribute(name))
        .join(' '),
    );
  const PARTS = ['point', 'spread', 'wick', 'body', 'slice', 'fill'];
  const picture = (fixture: ComponentFixture<Shapes>, name: string) => {
    const root = fixture.nativeElement as HTMLElement;
    const of = (id: string) =>
      root.querySelector(`[data-testid="${id}"]`) as HTMLElement;
    return PARTS.map((part) => [
      part,
      [
        ...drawn(of(name), part),
        ...drawn(of(`${name}-pie`), part),
        ...drawn(of(`${name}-gauge`), part),
      ],
    ]);
  };

  it('eases points and their sizes, a band, candles, a pie and a gauge, and reads the data', async () => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    });
    const fixture = TestBed.createComponent(Shapes);
    await settle(fixture);
    const host = fixture.componentInstance;
    const before = picture(fixture, 'eased');
    host.points.set(POINTS(30, 8));
    host.spans.set(SPANS(20, 40));
    host.candles.set(CANDLES(15, 50, 20, 40));
    host.uses.set([
      { room: 'Heating', kwh: 30 },
      { room: 'Cooling', kwh: 10 },
    ]);
    host.supply.set(25);
    await settle(fixture);
    // nothing moved before the first frame
    expect(picture(fixture, 'eased')).toEqual(before);
    await frame(fixture, 0.5);
    const halfway = picture(fixture, 'halfway');
    for (const [, elements] of halfway)
      expect(elements.length).toBeGreaterThan(0);
    expect(picture(fixture, 'eased')).toEqual(halfway);
    // what is read is the data, never a step on the way
    const root = fixture.nativeElement as HTMLElement;
    const chart = fixture.debugElement
      .queryAll((d) => d.name === 'pct-chart')
      .map((d) => d.componentInstance as PctChart)[0];
    expect([...chart.markOf('Rooms')!.readings('Rooms').ys]).toEqual([
      30, 31, 32, 33, 34,
    ]);
    const pie = fixture.debugElement.query((d) => d.name === 'pct-pie')
      .componentInstance as PctPie<unknown>;
    expect(pie.shareOf('Heating')).toBe(0.75);
    expect(
      root
        .querySelector('[data-testid="eased-gauge"] [data-pct-part="meter"]')
        ?.getAttribute('aria-valuenow'),
    ).toBe('25');
    state = 'finished';
    await frame(fixture, 1);
    expect(picture(fixture, 'eased')).not.toEqual(halfway);
  });

  it('draws at once what changes its shape: a slice for another, a reading lost or gained, a reading added', async () => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    });
    const fixture = TestBed.createComponent(Shapes);
    await settle(fixture);
    const host = fixture.componentInstance;
    const root = fixture.nativeElement as HTMLElement;
    const parts = (name: string) =>
      [
        ...root.querySelectorAll(
          `[data-testid^="eased"] [data-pct-part="${name}"]`,
        ),
      ].map((p) => p.getAttribute('d'));
    // what is drawn after a change, and after every frame on its way (the scheduler's own among
    // them), is one and the same: nothing eased
    const atOnce = async (change: () => void) => {
      change();
      await settle(fixture);
      const drawn = [parts('slice'), parts('fill'), picture(fixture, 'eased')];
      progress = 0.5;
      frames.splice(0).forEach((callback) => callback(0));
      await settle(fixture);
      expect([
        parts('slice'),
        parts('fill'),
        picture(fixture, 'eased'),
      ]).toEqual(drawn);
      progress = 0;
      return drawn;
    };
    // as many slices, one of them another; the gauge loses its reading
    await atOnce(() => {
      host.uses.set([
        { room: 'Heating', kwh: 10 },
        { room: 'Fans', kwh: 30 },
      ]);
      host.supply.set(null);
    });
    expect(parts('slice')).toHaveLength(2);
    expect(parts('fill')).toHaveLength(0);
    // a slice fewer; the gauge gains a reading; a band and its candles get a reading more
    await atOnce(() => {
      host.uses.set([{ room: 'Heating', kwh: 30 }]);
      host.supply.set(25);
      host.spans.update((rows) => [
        ...rows,
        { at: rows[4].at + H, low: 20, high: 30 },
      ]);
      host.candles.update((rows) => [
        ...rows,
        { at: rows[4].at + H, low: 20, high: 50, open: 25, close: 40 },
      ]);
    });
    expect(parts('slice')).toHaveLength(1);
    expect(parts('fill')).toHaveLength(1);
  });

  it('is off on a pie and a gauge unless asked for', () => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    });
    expect(TestBed.createComponent(PctPie).componentInstance.animate()).toBe(
      false,
    );
    expect(TestBed.createComponent(PctGauge).componentInstance.animate()).toBe(
      false,
    );
  });
});
