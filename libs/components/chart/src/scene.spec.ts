import { Component, provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PctChart } from './chart';
import { PctLine } from './line';
import { PctMark } from './scene';

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
  imports: [PctChart, PctLine],
  template: `
    <pct-chart ariaLabel="A line" timeZone="UTC" interval="day">
      <pct-line [data]="rows" x="at" y="value" name="Supply" />
    </pct-chart>
  `,
})
class Host {
  readonly rows = [
    { at: T0, value: 1 },
    { at: T0 + 12 * H, value: 2 },
  ];
}

describe('PctMark, what a mark that draws no bars answers', () => {
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

  it('stands in no band, gives no values, rows, band or pick, and keeps no pyramid of its own', async () => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    });
    const fixture: ComponentFixture<Host> = TestBed.createComponent(Host);
    fixture.detectChanges();
    await fixture.whenStable();
    const mark = fixture.debugElement
      .query((d) => d.name === 'pct-line')
      .injector.get(PctMark);
    const bands = [
      { from: T0, to: T0 + 24 * H },
      { from: T0 + 24 * H, to: T0 + 48 * H },
    ];
    expect(mark.band()).toBeNull();
    expect(PctMark.prototype.valuesIn.call(mark, 'Supply', bands)).toEqual([
      null,
      null,
    ]);
    expect(PctMark.prototype.valuesIn.call(mark, 'Supply', [])).toEqual([]);
    expect(
      PctMark.prototype.rowsIn.call(mark, 'Supply', { from: T0, to: T0 + H }),
    ).toBeNull();
    expect(PctMark.prototype.bandAt.call(mark, 'Supply', T0)).toBeNull();
    expect(PctMark.prototype.pickAt.call(mark, 'Supply', 10, 10)).toBe(false);
    expect(PctMark.prototype.notesAt.call(mark, T0)).toEqual([]);
    expect(PctMark.prototype.pyramidOf.call(mark, 'Supply')).toBeNull();
    // the line itself keeps a pyramid, which the base's answer is not
    expect(mark.pyramidOf('Supply')).not.toBeNull();
  });
});
