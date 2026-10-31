import {
  Component,
  provideZonelessChangeDetection,
  signal,
} from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PctAxis, PctChart } from './chart';
import { PctLine } from './line';
import type { PctWindow } from './model/window';

/** Power through the day, over four decades, with the heater off for an hour at the end. */
const WATTS = [0.5, 2, 7, 30, 120, 450, 800, 1500, 60, 9, 1].map((y, x) => ({
  x,
  y,
}));
/** A second unit beside the first, for the axis that follows the window. */
const DEGREES = [10, 14, 19, 25, 30, 28, 22, 17, 13, 11, 10].map((y, x) => ({
  x,
  y,
}));

@Component({
  imports: [PctChart, PctLine, PctAxis],
  template: `
    <pct-chart
      #chart
      ariaLabel="Power against the hour"
      [x]="x()"
      locale="en-US"
      [xUnit]="xUnit()"
      [zoom]="zoom()"
      [orientation]="orientation()"
      [(window)]="window"
      [(yWindow)]="yWindow"
    >
      <pct-line [data]="watts()" x="x" y="y" name="Power" unit="W" />
      @if (second()) {
        <pct-line [data]="degrees" x="x" y="y" name="Heat" unit="°C" />
      }
      <pct-axis
        unit="W"
        [scale]="scale()"
        [floor]="floor()"
        [ceiling]="ceiling()"
      />
    </pct-chart>
  `,
})
class Host {
  readonly watts = signal(WATTS);
  readonly degrees = DEGREES;
  readonly second = signal(false);
  readonly x = signal<'linear' | 'time'>('linear');
  readonly xUnit = signal('');
  readonly zoom = signal<'x' | 'xy' | 'none'>('x');
  readonly orientation = signal<'vertical' | 'horizontal'>('vertical');
  readonly scale = signal<'linear' | 'log'>('log');
  readonly floor = signal<number | undefined>(undefined);
  readonly ceiling = signal<number | undefined>(undefined);
  readonly window = signal<PctWindow | null>(null);
  readonly yWindow = signal<PctWindow | null>(null);
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
const labels = (fixture: ComponentFixture<unknown>, unit: string) =>
  all(fixture, `[data-pct-unit="${unit}"] text.value`).map(
    (t) => t.textContent,
  );
const domain = (fixture: ComponentFixture<unknown>, unit: string) =>
  chartOf(fixture).yScales().get(unit)!.domain;
const overlay = (fixture: ComponentFixture<unknown>) =>
  query(fixture, '.overlay') as HTMLElement;
const range = (fixture: ComponentFixture<unknown>) =>
  query(fixture, 'input[data-pct-part="range"]') as HTMLInputElement;
const keyOn = async (
  fixture: ComponentFixture<unknown>,
  key: string,
  shiftKey = false,
) => {
  range(fixture).dispatchEvent(
    new KeyboardEvent('keydown', {
      key,
      shiftKey,
      bubbles: true,
      cancelable: true,
    }),
  );
  await settle(fixture);
};
const expectWindow = (
  window: { from: number; to: number } | null,
  from: number,
  to: number,
) => {
  expect(window).not.toBeNull();
  expect(window!.from).toBeCloseTo(from, 6);
  expect(window!.to).toBeCloseTo(to, 6);
};
const wheel = async (
  fixture: ComponentFixture<unknown>,
  x: number,
  y: number,
  deltaY: number,
) => {
  overlay(fixture).dispatchEvent(
    new WheelEvent('wheel', {
      deltaY,
      ctrlKey: true,
      clientX: x,
      clientY: y,
      bubbles: true,
      cancelable: true,
    }),
  );
  await settle(fixture);
};

describe('PctAxis, logarithmic', () => {
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

  it('spans whole decades around the values, gives each the same room, and ticks the decades', async () => {
    const fixture = await render();
    // 0.5 to 1500: the decade under and the one over
    expect(domain(fixture, 'W')).toEqual([0.1, 10000]);
    const scale = chartOf(fixture).yScales().get('W')!;
    expect(scale.map(10) - scale.map(100)).toBeCloseTo(
      scale.map(1) - scale.map(10),
      9,
    );
    expect(scale.map(1000)).toBeCloseTo(
      scale.range[0] + ((scale.range[1] - scale.range[0]) * 4) / 5,
      9,
    );
    // five decades, five ticks tall: the decades alone
    expect(labels(fixture, 'W')).toEqual([
      '0.1',
      '1',
      '10',
      '100',
      '1,000',
      '10,000',
    ]);
    expect(scale.invert(scale.map(50))).toBeCloseTo(50, 9);
  });

  it('ticks 1, 2 and 5 of each decade when they fit, written to the places the lowest needs', async () => {
    const fixture = await render();
    fixture.componentInstance.watts.set(
      [0.5, 0.9, 2, 4, 6, 8, 9].map((y, x) => ({ x, y })),
    );
    await settle(fixture);
    expect(domain(fixture, 'W')).toEqual([0.1, 10]);
    expect(labels(fixture, 'W')).toEqual([
      '0.1',
      '0.2',
      '0.5',
      '1',
      '2',
      '5',
      '10',
    ]);
  });

  it('keeps the consumer’s floor and ceiling above zero, and ignores them at or below it', async () => {
    const fixture = await render();
    fixture.componentInstance.floor.set(1);
    fixture.componentInstance.ceiling.set(2000);
    await settle(fixture);
    expect(domain(fixture, 'W')).toEqual([1, 2000]);
    fixture.componentInstance.floor.set(0);
    fixture.componentInstance.ceiling.set(-5);
    await settle(fixture);
    expect(domain(fixture, 'W')).toEqual([0.1, 10000]);
    // a ceiling under the floor: a decade over the floor
    fixture.componentInstance.floor.set(100);
    fixture.componentInstance.ceiling.set(50);
    await settle(fixture);
    expect(domain(fixture, 'W')).toEqual([100, 1000]);
  });

  it('ignores a ceiling of zero, holds a floor that meets its ceiling a decade apart, and spans a decade with no data', async () => {
    const fixture = await render();
    fixture.componentInstance.ceiling.set(0);
    fixture.componentInstance.floor.set(0);
    await settle(fixture);
    expect(domain(fixture, 'W')).toEqual([0.1, 10000]);
    fixture.componentInstance.floor.set(100);
    fixture.componentInstance.ceiling.set(100);
    await settle(fixture);
    expect(domain(fixture, 'W')).toEqual([100, 1000]);
    fixture.componentInstance.floor.set(undefined);
    fixture.componentInstance.ceiling.set(undefined);
    fixture.componentInstance.watts.set([]);
    await settle(fixture);
    expect(domain(fixture, 'W')).toEqual([1, 10]);
  });

  it('shows the three decades under the top when no value gives a positive floor, and reports a value at or below zero as a gap', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const fixture = await render();
    // every value above zero: nothing to report
    expect(warn).not.toHaveBeenCalled();
    fixture.componentInstance.watts.set([
      { x: 0, y: 0 },
      { x: 1, y: 500 },
      { x: 2, y: 20 },
    ]);
    await settle(fixture);
    expect(domain(fixture, 'W')).toEqual([1, 1000]);
    expect(warn).toHaveBeenCalledWith(
      '[pct-chart] "Power" has a value at or below zero on the logarithmic axis "W": ' +
        'it has no logarithm, and is a gap there.',
    );
    // the path runs from the second reading: the first has no place
    const path = query(fixture, '[data-pct-part="series"]')!.getAttribute('d')!;
    const scale = chartOf(fixture).xScale()!;
    expect(
      Math.abs(Number(/^M([\d.]+)/.exec(path)![1]) - scale.map(1)),
    ).toBeLessThanOrEqual(1);
    // a linear axis says nothing of a zero
    warn.mockClear();
    fixture.componentInstance.scale.set('linear');
    await settle(fixture);
    expect(domain(fixture, 'W')[0]).toBe(0);
    expect(warn).not.toHaveBeenCalled();
  });

  it('is a linear axis by default, with the ticks a linear axis has', async () => {
    const fixture = await render();
    fixture.componentInstance.scale.set('linear');
    await settle(fixture);
    expect(domain(fixture, 'W')).toEqual([0, 2000]);
    expect(labels(fixture, 'W')).toEqual([
      '0',
      '500',
      '1,000',
      '1,500',
      '2,000',
    ]);
  });
});

describe('PctChart, its window on both axes', () => {
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

  const linear = async () => {
    const fixture = await render();
    fixture.componentInstance.scale.set('linear');
    fixture.componentInstance.second.set(true);
    fixture.componentInstance.zoom.set('xy');
    await settle(fixture);
    return fixture;
  };

  it('gives the first axis its window as given, and the others the same stretch in pixels', async () => {
    const fixture = await linear();
    expect(domain(fixture, 'W')).toEqual([0, 2000]);
    expect(domain(fixture, '°C')).toEqual([10, 30]);
    fixture.componentInstance.yWindow.set({ from: 500, to: 1000 });
    await settle(fixture);
    expect(domain(fixture, 'W')).toEqual([500, 1000]);
    expect(domain(fixture, '°C')).toEqual([15, 20]);
    expect(labels(fixture, 'W')).toEqual([
      '500',
      '600',
      '700',
      '800',
      '900',
      '1,000',
    ]);
    // the window is nothing to a chart that zooms along one axis
    fixture.componentInstance.zoom.set('x');
    await settle(fixture);
    expect(domain(fixture, 'W')).toEqual([0, 2000]);
    expect(domain(fixture, '°C')).toEqual([10, 30]);
  });

  it('follows a log axis in its own pixels: the window of a linear first axis is a stretch of decades on it', async () => {
    const fixture = await linear();
    fixture.componentInstance.scale.set('log');
    await settle(fixture);
    // the first axis is the log one here: 0.1 to 10 000, a window of its top two decades
    fixture.componentInstance.yWindow.set({ from: 100, to: 10000 });
    await settle(fixture);
    expect(domain(fixture, 'W')).toEqual([100, 10000]);
    // 3/5 to 5/5 of the °C axis's 10 to 30
    const [lo, hi] = domain(fixture, '°C');
    expect(lo).toBeCloseTo(22, 9);
    expect(hi).toBeCloseTo(30, 9);
  });

  it('zooms both axes about the pointer with Ctrl and the wheel, pans both on a drag, and returns both on 0', async () => {
    const fixture = await linear();
    const chart = chartOf(fixture);
    const x = chart.xScale()!.map(5);
    const y = chart.yScales().get('W')!.map(1000);
    await wheel(fixture, x, y, -200);
    const window = fixture.componentInstance.window()!;
    const yWindow = fixture.componentInstance.yWindow()!;
    expect(window.to - window.from).toBeCloseTo(10 / Math.exp(0.4), 6);
    expect(yWindow.to - yWindow.from).toBeCloseTo(2000 / Math.exp(0.4), 6);
    // about the pointer: 5 stays at the same share of the window, 1000 of the axis
    expect((5 - window.from) / (window.to - window.from)).toBeCloseTo(0.5, 6);
    expect((1000 - yWindow.from) / (yWindow.to - yWindow.from)).toBeCloseTo(
      0.5,
      6,
    );
    // a drag down and to the right: the window moves to lower positions and higher values,
    // the values by the drag's share of the axis
    const layer = overlay(fixture);
    const press = (type: string, px: number, py: number) => {
      const event = new MouseEvent(type, {
        bubbles: true,
        clientX: px,
        clientY: py,
      });
      Object.assign(event, { pointerType: 'mouse', pointerId: 1 });
      layer.dispatchEvent(event);
    };
    press('pointerdown', x, y);
    press('pointermove', x + 60, y + 30);
    press('pointerup', x + 60, y + 30);
    await settle(fixture);
    const moved = fixture.componentInstance.window()!;
    const movedY = fixture.componentInstance.yWindow()!;
    expect(moved.from).toBeLessThan(window.from);
    const scale = chart.yScales().get('W')!;
    const height = Math.abs(scale.range[1] - scale.range[0]);
    expect(movedY.from - yWindow.from).toBeCloseTo(
      (30 / height) * (yWindow.to - yWindow.from),
      6,
    );
    expect(movedY.to - movedY.from).toBeCloseTo(yWindow.to - yWindow.from, 6);
    await keyOn(fixture, '0');
    expect(fixture.componentInstance.window()).toBeNull();
    expect(fixture.componentInstance.yWindow()).toBeNull();
  });

  it('zooms about the pointer’s place on the first axis: at the axis’s foot the foot stays, on a turned chart at its left end', async () => {
    const fixture = await linear();
    const chart = chartOf(fixture);
    const x = chart.xScale()!.map(5);
    await wheel(fixture, x, chart.yScales().get('W')!.map(0), -200);
    expectWindow(fixture.componentInstance.yWindow(), 0, 2000 / Math.exp(0.4));
    await keyOn(fixture, '0');
    fixture.componentInstance.orientation.set('horizontal');
    await settle(fixture);
    // the value axis runs along the width now: its foot is the left end
    const foot = chart.yScales().get('W')!.map(0);
    // the turned axis has its own ticks, and so its own whole domain
    const top = domain(fixture, 'W')[1];
    await wheel(fixture, foot, chart.xScale()!.map(5), -200);
    expectWindow(fixture.componentInstance.yWindow(), 0, top / Math.exp(0.4));
    // and a drag to the right on it moves the window to lower values
    const layer = overlay(fixture);
    const press = (type: string, px: number, py: number) => {
      const event = new MouseEvent(type, {
        bubbles: true,
        clientX: px,
        clientY: py,
      });
      Object.assign(event, { pointerType: 'mouse', pointerId: 1 });
      layer.dispatchEvent(event);
    };
    fixture.componentInstance.yWindow.set({ from: 500, to: 1500 });
    await settle(fixture);
    const mid = chart.yScales().get('W')!.map(1000);
    press('pointerdown', mid, chart.xScale()!.map(5));
    press('pointermove', mid + 60, chart.xScale()!.map(5));
    press('pointerup', mid + 60, chart.xScale()!.map(5));
    await settle(fixture);
    const scale = chart.yScales().get('W')!;
    const width = Math.abs(scale.range[1] - scale.range[0]);
    expectWindow(
      fixture.componentInstance.yWindow(),
      500 - (60 / width) * 1000,
      1500 - (60 / width) * 1000,
    );
  });

  it('pans the first axis a tenth on Shift with an arrow up or down, zooms it on +, and lets it go once it covers the data again', async () => {
    const fixture = await linear();
    await keyOn(fixture, '+');
    expectWindow(fixture.componentInstance.yWindow(), 500, 1500);
    await keyOn(fixture, 'ArrowUp', true);
    expectWindow(fixture.componentInstance.yWindow(), 600, 1600);
    await keyOn(fixture, 'ArrowDown', true);
    await keyOn(fixture, 'ArrowDown', true);
    expectWindow(fixture.componentInstance.yWindow(), 400, 1400);
    await keyOn(fixture, '-');
    expect(fixture.componentInstance.yWindow()).toBeNull();
    // a pan along leaves the window across where it is
    fixture.componentInstance.yWindow.set({ from: 500, to: 1500 });
    await settle(fixture);
    await keyOn(fixture, 'ArrowRight', true);
    expectWindow(fixture.componentInstance.yWindow(), 500, 1500);
    expect(fixture.componentInstance.window()).not.toBeNull();
    // without Shift the arrows are the cursor's
    chartOf(fixture).cursor.set(5);
    await settle(fixture);
    await keyOn(fixture, 'ArrowDown');
    expect(chartOf(fixture).cursor()).toBe(4);
    expectWindow(fixture.componentInstance.yWindow(), 500, 1500);
    // with `zoom="x"` nothing moves across: not Shift with an arrow, not the wheel
    fixture.componentInstance.zoom.set('x');
    await settle(fixture);
    await keyOn(fixture, 'ArrowUp', true);
    await keyOn(fixture, 'ArrowDown', true);
    expectWindow(fixture.componentInstance.yWindow(), 500, 1500);
    fixture.componentInstance.yWindow.set(null);
    await settle(fixture);
    await wheel(
      fixture,
      chartOf(fixture).xScale()!.map(5),
      chartOf(fixture).yScales().get('W')!.map(1000),
      -200,
    );
    expect(fixture.componentInstance.window()).not.toBeNull();
    expect(fixture.componentInstance.yWindow()).toBeNull();
  });

  it('stops the window at the data’s domain, and keeps a millionth of it at the narrowest', async () => {
    const fixture = await linear();
    fixture.componentInstance.yWindow.set({ from: 1500, to: 2000 });
    await settle(fixture);
    await keyOn(fixture, 'ArrowUp', true);
    expectWindow(fixture.componentInstance.yWindow(), 1500, 2000);
    // a window already under a millionth of the axis widens to it on the next zoom
    fixture.componentInstance.yWindow.set({ from: 1000, to: 1000.0005 });
    await settle(fixture);
    await keyOn(fixture, '+');
    const narrow = fixture.componentInstance.yWindow()!;
    expect(narrow.to - narrow.from).toBeCloseTo(2000 / 1e6, 6);
  });
});

describe('PctChart, the unit of its horizontal axis', () => {
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

  const unitText = (fixture: ComponentFixture<unknown>) =>
    query(fixture, 'svg[data-pct-part="axis"] > text[data-pct-part="unit"]');

  it('writes the unit under the axis’s end, takes a line for it, and reads it after the position', async () => {
    const fixture = await render();
    expect(unitText(fixture)).toBeNull();
    const bottom = chartOf(fixture).frame().bottom;
    fixture.componentInstance.xUnit.set('h');
    await settle(fixture);
    const unit = unitText(fixture)!;
    expect(unit.textContent).toBe('h');
    expect(unit.getAttribute('text-anchor')).toBe('end');
    expect(Number(unit.getAttribute('x'))).toBe(chartOf(fixture).frame().right);
    expect(chartOf(fixture).frame().bottom).toBe(
      bottom - chartOf(fixture).lineHeight(),
    );
    // a line under the labels of the positions
    const label = query(
      fixture,
      'svg[data-pct-part="axis"] > text[data-pct-label]',
    )!;
    expect(Number(unit.getAttribute('y'))).toBe(
      Number(label.getAttribute('y')) + chartOf(fixture).lineHeight(),
    );
    // a time axis writes its own units: no unit text, the line given back
    fixture.componentInstance.x.set('time');
    await settle(fixture);
    expect(unitText(fixture)).toBeNull();
    expect(chartOf(fixture).frame().bottom).toBe(bottom);
    fixture.componentInstance.x.set('linear');
    await settle(fixture);
    fixture.componentInstance.watts.set([{ x: 5, y: 10 }]);
    await settle(fixture);
    expect(range(fixture).getAttribute('aria-valuetext')).toBe(
      'No reading selected',
    );
    chartOf(fixture).cursor.set(5);
    await settle(fixture);
    expect(range(fixture).getAttribute('aria-valuetext')).toMatch(
      /^5\s?h(r|rs)?: Power 10 W$/,
    );
  });

  it('stands over the axis on a turned chart', async () => {
    const fixture = await render();
    fixture.componentInstance.xUnit.set('h');
    fixture.componentInstance.orientation.set('horizontal');
    await settle(fixture);
    const unit = unitText(fixture)!;
    const chart = chartOf(fixture);
    expect(Number(unit.getAttribute('y'))).toBeLessThan(chart.frame().top);
    expect(chart.frame().top).toBeGreaterThanOrEqual(chart.lineHeight());
    // in the labels' own column, right-aligned to them
    const label = query(
      fixture,
      'svg[data-pct-part="axis"] > text[data-pct-label]',
    )!;
    expect(unit.getAttribute('x')).toBe(label.getAttribute('x'));
    expect(unit.getAttribute('text-anchor')).toBe('end');
  });
});
