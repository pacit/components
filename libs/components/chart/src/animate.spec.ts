import {
  Component,
  provideZonelessChangeDetection,
  signal,
} from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PctArea } from './area';
import { PctBars } from './bars';
import { PctChart } from './chart';
import { PctLine } from './line';
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
