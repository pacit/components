import { Component, provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PctChart } from './chart';
import { PctChartZoom } from './chart-zoom';
import { PctLine } from './line';

const H = 3_600_000;
const T0 = Date.UTC(2026, 9, 28, 0);

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
  imports: [PctChart, PctLine, PctChartZoom],
  template: `
    <pct-chart #chart ariaLabel="Apart" timeZone="UTC" [zoomButtons]="false">
      <pct-line [data]="rows" x="at" y="value" name="Supply" />
    </pct-chart>
    <pct-chart-zoom [chart]="chart" />
  `,
})
class Apart {
  readonly rows = [
    { at: T0, value: 1 },
    { at: T0 + 24 * H, value: 2 },
  ];
}

async function render(): Promise<ComponentFixture<Apart>> {
  TestBed.configureTestingModule({
    providers: [provideZonelessChangeDetection()],
  });
  const fixture = TestBed.createComponent(Apart);
  for (let i = 0; i < 4; i++) {
    fixture.detectChanges();
    await fixture.whenStable();
  }
  return fixture;
}

describe('PctChartZoom', () => {
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

  it('stands apart from its chart when the chart draws none of its own', async () => {
    const fixture = await render();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelectorAll('pct-chart-zoom')).toHaveLength(1);
    expect(element.querySelector('pct-chart pct-chart-zoom')).toBeNull();
    const chart = fixture.debugElement.query((d) => d.name === 'pct-chart')
      .componentInstance as PctChart;
    element.querySelector<HTMLButtonElement>('pct-chart-zoom button')!.click();
    expect(chart.window()).toEqual({ from: T0 + 6 * H, to: T0 + 18 * H });
  });

  it('shows a glyph on each button, hidden from a reader, who hears the name', async () => {
    const fixture = await render();
    const buttons = [
      ...(fixture.nativeElement as HTMLElement).querySelectorAll(
        'pct-chart-zoom button',
      ),
    ];
    expect(buttons.map((b) => b.textContent?.trim())).toEqual([
      '+',
      '−',
      '‹',
      '›',
      '⟲',
    ]);
    // the glyph is drawn for an eye and hidden from the tree: the name is what is read
    expect(
      buttons.map((b) =>
        b.querySelector('[aria-hidden="true"]')?.textContent?.trim(),
      ),
    ).toEqual(['+', '−', '‹', '›', '⟲']);
    expect(
      buttons.every((b) => b.getAttribute('data-pct-part') === 'zoom'),
    ).toBe(true);
  });

  it('is one stop, and the arrows, Home and End move it and the focus', async () => {
    const fixture = await render();
    const bar = (fixture.nativeElement as HTMLElement).querySelector(
      'pct-chart-zoom',
    ) as HTMLElement;
    const buttons = [...bar.querySelectorAll('button')];
    const key = async (name: string) => {
      const event = new KeyboardEvent('keydown', {
        key: name,
        bubbles: true,
        cancelable: true,
      });
      buttons[0].dispatchEvent(event);
      fixture.detectChanges();
      await fixture.whenStable();
      return event;
    };
    const stops = () => buttons.map((b) => b.getAttribute('tabindex'));
    expect((await key('ArrowRight')).defaultPrevented).toBe(true);
    expect(stops()).toEqual(['-1', '0', '-1', '-1', '-1']);
    expect(document.activeElement).toBe(buttons[1]);
    await key('End');
    expect(stops()).toEqual(['-1', '-1', '-1', '-1', '0']);
    await key('ArrowRight');
    expect(stops()).toEqual(['-1', '-1', '-1', '-1', '0']);
    await key('Home');
    expect(stops()).toEqual(['0', '-1', '-1', '-1', '-1']);
    await key('ArrowLeft');
    expect(stops()).toEqual(['0', '-1', '-1', '-1', '-1']);
    await key('ArrowRight');
    await key('ArrowLeft');
    expect(document.activeElement).toBe(buttons[0]);
    expect((await key('Enter')).defaultPrevented).toBe(false);
  });
});
