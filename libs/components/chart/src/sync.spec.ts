import {
  Component,
  provideZonelessChangeDetection,
  signal,
} from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PctChart } from './chart';
import { PctLine } from './line';
import { PctChartSync, type PctChartShared } from './sync';

const H = 3_600_000;
const T0 = Date.UTC(2026, 9, 28, 0);
const rows = [
  { at: T0, value: 2 },
  { at: T0 + 12 * H, value: 1500 },
  { at: T0 + 24 * H, value: 4 },
];
const small = [
  { at: T0, value: 0 },
  { at: T0 + 24 * H, value: 1 },
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
  imports: [PctChart, PctLine, PctChartSync],
  template: `
    <div [pctChartSync]="shared()">
      <pct-chart ariaLabel="Wide" timeZone="UTC">
        <pct-line [data]="rows" x="at" y="value" name="Power" unit="W" />
      </pct-chart>
      <section>
        <pct-chart ariaLabel="Narrow" timeZone="UTC">
          <pct-line
            [data]="small"
            x="at"
            y="value"
            name="Heater"
            unit="boolean"
            curve="step"
          />
        </pct-chart>
      </section>
      @if (third()) {
        <pct-chart ariaLabel="Third" timeZone="UTC">
          <pct-line [data]="small" x="at" y="value" name="Valve" />
        </pct-chart>
      }
    </div>
  `,
})
class Synced {
  readonly rows = rows;
  readonly small = small;
  readonly shared = signal<readonly PctChartShared[] | ''>('');
  readonly third = signal(false);
}

async function render(): Promise<ComponentFixture<Synced>> {
  TestBed.configureTestingModule({
    providers: [provideZonelessChangeDetection()],
  });
  const fixture = TestBed.createComponent(Synced);
  await settle(fixture);
  return fixture;
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  for (let i = 0; i < 4; i++) {
    fixture.detectChanges();
    await fixture.whenStable();
  }
}

const charts = (fixture: ComponentFixture<unknown>) =>
  fixture.debugElement
    .queryAll((d) => d.name === 'pct-chart')
    .map((d) => d.componentInstance as PctChart);
const sync = (fixture: ComponentFixture<unknown>) =>
  fixture.debugElement
    .query((d) => d.name === 'div')
    .injector.get(PctChartSync);

describe('PctChartSync', () => {
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

  it('finds the charts at any depth, and shares the window and the cursor by default', async () => {
    const fixture = await render();
    const [wide, narrow] = charts(fixture);
    expect(sync(fixture).charts()).toHaveLength(2);
    expect(sync(fixture).pctChartSync()).toEqual(['window', 'cursor']);
    wide.window.set({ from: T0 + 6 * H, to: T0 + 18 * H });
    await settle(fixture);
    expect(narrow.window()).toEqual({ from: T0 + 6 * H, to: T0 + 18 * H });
    narrow.cursor.set(T0 + 9 * H);
    await settle(fixture);
    expect(wide.cursor()).toBe(T0 + 9 * H);
    narrow.window.set(null);
    await settle(fixture);
    expect(wide.window()).toBeNull();
  });

  it('gives every chart the plot edges of the widest axes', async () => {
    const fixture = await render();
    const [wide, narrow] = charts(fixture);
    expect(wide.axisRoom().left).toBeGreaterThan(narrow.axisRoom().left);
    expect(sync(fixture).room()).toEqual({
      left: wide.axisRoom().left,
      right: Math.max(wide.axisRoom().right, narrow.axisRoom().right),
    });
    expect(narrow.xScale()!.range).toEqual(wide.xScale()!.range);
  });

  it('shares only what it is told', async () => {
    const fixture = await render();
    fixture.componentInstance.shared.set(['cursor']);
    await settle(fixture);
    const [wide, narrow] = charts(fixture);
    wide.window.set({ from: T0, to: T0 + 6 * H });
    wide.cursor.set(T0 + H);
    await settle(fixture);
    expect(narrow.window()).toBeNull();
    expect(narrow.cursor()).toBe(T0 + H);
  });

  it('hands a chart that joins what is already shared', async () => {
    const fixture = await render();
    const [wide] = charts(fixture);
    wide.window.set({ from: T0 + 2 * H, to: T0 + 4 * H });
    await settle(fixture);
    fixture.componentInstance.third.set(true);
    await settle(fixture);
    const third = charts(fixture)[2];
    expect(third.window()).toEqual({ from: T0 + 2 * H, to: T0 + 4 * H });
    expect(wide.window()).toEqual({ from: T0 + 2 * H, to: T0 + 4 * H });
  });
});
