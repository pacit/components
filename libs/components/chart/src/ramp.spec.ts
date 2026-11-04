import { Component, provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PctBars } from './bars';
import { PctChart } from './chart';
import { PctHeat } from './heat';
import { PctChartRamp } from './ramp';

interface Cell {
  readonly at: number;
  readonly row: string;
  readonly value: number;
}

@Component({
  imports: [PctChart, PctHeat, PctBars, PctChartRamp],
  template: `
    <pct-chart
      #chart
      ariaLabel="Two heatmaps"
      x="band"
      [categories]="days"
      locale="en-US"
    >
      <pct-bars [data]="counts" x="at" y="value" name="Count" />
      <pct-heat
        [data]="cells"
        x="at"
        y="row"
        value="value"
        name="Load"
        unit="%"
      />
      <pct-heat
        [data]="cells"
        x="at"
        y="row"
        value="value"
        name="Change"
        id="delta"
        scale="diverging"
        [domain]="[-1, 0, 1]"
      />
    </pct-chart>
    <pct-chart-ramp [chart]="chart" />
  `,
})
class Host {
  readonly days = ['Mon', 'Tue'];
  readonly counts = [{ at: 0, value: 2 }];
  readonly cells: readonly Cell[] = [
    { at: 0, row: 'a', value: 0.25 },
    { at: 1, row: 'a', value: 1.5 },
  ];
}

describe('PctChartRamp', () => {
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

  async function render(): Promise<ComponentFixture<Host>> {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    });
    const fixture = TestBed.createComponent(Host);
    for (let i = 0; i < 4; i++) {
      fixture.detectChanges();
      await fixture.whenStable();
    }
    return fixture;
  }

  it('shows a ramp per mark with a colour scale, named, its ends written in the chart’s locale and unit, hidden from a reader', async () => {
    const fixture = await render();
    const host = fixture.nativeElement as HTMLElement;
    const ramp = host.querySelector('pct-chart-ramp')!;
    expect(ramp.getAttribute('aria-hidden')).toBe('true');
    const items = [...ramp.querySelectorAll('[data-pct-part="item"]')];
    // the bars have no colour scale: two ramps, not three
    expect(
      items.map((item) => item.querySelector('.name')!.textContent),
    ).toEqual(['Load', 'Change']);
    expect(
      items.map((item) =>
        [...item.querySelectorAll('[data-pct-part="label"]')].map(
          (l) => l.textContent,
        ),
      ),
    ).toEqual([
      ['0.25 %', '1.5 %'],
      ['-1', '0', '1'],
    ]);
    expect(
      items.map((item) =>
        item
          .querySelector('[data-pct-part="ramp"]')!
          .classList.contains('diverging'),
      ),
    ).toEqual([false, true]);
  });
});
