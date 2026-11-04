import {
  Component,
  provideZonelessChangeDetection,
  signal,
  type Type,
} from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PctGauge, type PctGaugeBand } from './gauge';

const BANDS: readonly PctGaugeBand[] = [
  { from: 10, to: 18, tone: 'info', label: 'Cold' },
  { from: 18, to: 24, tone: 'success', label: 'Comfort' },
  { from: 24, to: 30, tone: 'danger', label: 'Hot' },
];

@Component({
  imports: [PctGauge],
  template: `
    <pct-gauge
      [ariaLabel]="label()"
      [ariaLabelledby]="labelledby()"
      [value]="value()"
      [min]="min()"
      [max]="max()"
      [unit]="unit()"
      locale="en-US"
      [bands]="bands()"
      [indicator]="indicator()"
      [sweep]="sweep()"
    />
  `,
})
class Host {
  readonly label = signal('Supply air');
  readonly labelledby = signal('');
  readonly value = signal<number | string | null>(21.5);
  readonly min = signal(10);
  readonly max = signal(30);
  readonly unit = signal('°C');
  readonly bands = signal<readonly PctGaugeBand[]>(BANDS);
  readonly indicator = signal<'arc' | 'needle'>('arc');
  readonly sweep = signal(240);
}

/** A gauge as it comes, with nothing set but the value: what the defaults say. */
@Component({
  imports: [PctGauge],
  template: `<pct-gauge [value]="21.56789" />`,
})
class Bare {}

function stubSize(): void {
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(
    function (this: HTMLElement) {
      return this.tagName === 'PCT-GAUGE' ? 300 : 0;
    },
  );
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockImplementation(
    function (this: HTMLElement) {
      return this.tagName === 'PCT-GAUGE' ? 200 : 0;
    },
  );
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
}

async function render(): Promise<ComponentFixture<Host>> {
  return renderAs(Host);
}

async function renderAs<H>(type: Type<H>): Promise<ComponentFixture<H>> {
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
const one = (fixture: ComponentFixture<unknown>, selector: string) =>
  element(fixture).querySelector(selector) as HTMLElement;
const all = (fixture: ComponentFixture<unknown>, selector: string) => [
  ...element(fixture).querySelectorAll(selector),
];
const meter = (fixture: ComponentFixture<unknown>) =>
  one(fixture, '[data-pct-part="meter"]');
const text = (fixture: ComponentFixture<unknown>, part: string) =>
  all(fixture, `text[data-pct-part="${part}"]`).map((t) => ({
    text: t.textContent,
    x: Number(t.getAttribute('x')),
    y: Number(t.getAttribute('y')),
    anchor: t.getAttribute('text-anchor'),
  }));
const path = (fixture: ComponentFixture<unknown>, part: string) =>
  one(fixture, `[data-pct-part="${part}"]`)?.getAttribute('d') ?? null;

describe('PctGauge', () => {
  beforeEach(() => {
    stubSize();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("is a meter named by the consumer, with the value, its ends and the band's word as its text, and the band's tone on the host", async () => {
    const fixture = await render();
    const m = meter(fixture);
    expect(m.getAttribute('role')).toBe('meter');
    expect(m.getAttribute('aria-label')).toBe('Supply air');
    expect(m.getAttribute('aria-labelledby')).toBeNull();
    expect(m.getAttribute('aria-valuemin')).toBe('10');
    expect(m.getAttribute('aria-valuemax')).toBe('30');
    expect(m.getAttribute('aria-valuenow')).toBe('21.5');
    expect(m.getAttribute('aria-valuetext')).toBe('21.5 °C, Comfort');
    const host = one(fixture, 'pct-gauge');
    expect(host.getAttribute('data-pct-tone')).toBe('success');
    expect(host.classList.contains('needle')).toBe(false);
    expect(one(fixture, 'svg').getAttribute('aria-hidden')).toBe('true');
    // the words of the picture: the value in the middle, the band under it, the ends below the arc
    expect(text(fixture, 'value')).toEqual([
      {
        text: '21.5 °C',
        x: 150,
        y: expect.closeTo(112.33, 2),
        anchor: 'middle',
      },
    ]);
    expect(text(fixture, 'state')).toEqual([
      {
        text: 'Comfort',
        x: 150,
        y: expect.closeTo(131.33, 2),
        anchor: 'middle',
      },
    ]);
    expect(text(fixture, 'label')).toEqual([
      { text: '10 °C', x: 52.72, y: 178, anchor: 'middle' },
      { text: '30 °C', x: 247.28, y: 178, anchor: 'middle' },
    ]);
  });

  it('draws the track over the sweep, the value as an arc from the left end, and a band per tone on the rim', async () => {
    const fixture = await render();
    expect(path(fixture, 'track')).toBe(
      'M 57.91 165.5 A 106.33 106.33 0 1 1 242.09 165.5 L 229.96 158.5 A 92.33 92.33 0 1 0 70.04 158.5 Z',
    );
    expect(path(fixture, 'fill')).toBe(
      'M 57.91 165.5 A 106.33 106.33 0 0 1 182.86 11.2 L 178.53 24.52 A 92.33 92.33 0 0 0 70.04 158.5 Z',
    );
    expect(path(fixture, 'needle')).toBeNull();
    const bands = all(fixture, '[data-pct-part="band"]');
    expect(bands.map((b) => b.getAttribute('data-pct-tone'))).toEqual([
      'info',
      'success',
      'danger',
    ]);
    // the first band runs from the left end to 18 on a ring outside the track
    expect(bands[0].getAttribute('d')).toBe(
      'M 52.72 168.5 A 112.33 112.33 0 0 1 104.31 9.71 L 105.94 13.37 A 108.33 108.33 0 0 0 56.18 166.5 Z',
    );
    // the value at the ends: the whole track filled, or nothing
    fixture.componentInstance.value.set(30);
    await settle(fixture);
    expect(path(fixture, 'fill')).toBe(path(fixture, 'track'));
    fixture.componentInstance.value.set(10);
    await settle(fixture);
    expect(path(fixture, 'fill')).toBe('');
  });

  it('holds the value in the range for the meter, and stands it at the left end when the range has no span', async () => {
    const fixture = await render();
    fixture.componentInstance.value.set(35);
    await settle(fixture);
    expect(meter(fixture).getAttribute('aria-valuenow')).toBe('30');
    expect(meter(fixture).getAttribute('aria-valuetext')).toBe('35 °C');
    expect(path(fixture, 'fill')).toBe(path(fixture, 'track'));
    fixture.componentInstance.value.set(-3);
    await settle(fixture);
    expect(meter(fixture).getAttribute('aria-valuenow')).toBe('10');
    fixture.componentInstance.max.set(10);
    fixture.componentInstance.value.set(25);
    await settle(fixture);
    expect(meter(fixture).getAttribute('aria-valuenow')).toBe('10');
    expect(meter(fixture).getAttribute('aria-valuemax')).toBe('10');
    expect(path(fixture, 'fill')).toBe('');
    // a max under the min is held at the min; the meter still says what it was given
    fixture.componentInstance.max.set(5);
    fixture.componentInstance.value.set(21.5);
    await settle(fixture);
    expect(meter(fixture).getAttribute('aria-valuenow')).toBe('10');
    expect(meter(fixture).getAttribute('aria-valuemax')).toBe('5');
  });

  it('is no reading for null, a string that is no number, or an empty value: the minimum, said in words, and nothing on the track', async () => {
    const fixture = await render();
    for (const value of [null, 'abc', '']) {
      fixture.componentInstance.value.set(value);
      await settle(fixture);
      expect(meter(fixture).getAttribute('aria-valuenow')).toBe('10');
      expect(meter(fixture).getAttribute('aria-valuetext')).toBe('No reading');
      expect(path(fixture, 'fill')).toBeNull();
      expect(
        one(fixture, 'pct-gauge').getAttribute('data-pct-tone'),
      ).toBeNull();
      expect(text(fixture, 'value')[0].text).toBe('No reading');
      expect(text(fixture, 'state')).toEqual([]);
    }
    fixture.componentInstance.value.set('24');
    await settle(fixture);
    expect(meter(fixture).getAttribute('aria-valuenow')).toBe('24');
  });

  it('finds the band from its start up to its end, the last band at its end too, and none outside', async () => {
    const fixture = await render();
    const gauge = fixture.debugElement.query((d) => d.name === 'pct-gauge')
      .componentInstance as PctGauge;
    const bandAt = async (value: number) => {
      fixture.componentInstance.value.set(value);
      await settle(fixture);
      return gauge.band()?.label ?? null;
    };
    expect(await bandAt(18)).toBe('Comfort');
    expect(await bandAt(17.99)).toBe('Cold');
    expect(await bandAt(24)).toBe('Hot');
    expect(await bandAt(30)).toBe('Hot');
    expect(await bandAt(30.01)).toBeNull();
    expect(await bandAt(9)).toBeNull();
    expect(meter(fixture).getAttribute('aria-valuetext')).toBe('9 °C');
    fixture.componentInstance.bands.set([
      { from: 0, to: 100, tone: 'warning' },
    ]);
    fixture.componentInstance.value.set(20);
    await settle(fixture);
    expect(meter(fixture).getAttribute('aria-valuetext')).toBe('20 °C');
    expect(one(fixture, 'pct-gauge').getAttribute('data-pct-tone')).toBe(
      'warning',
    );
    expect(text(fixture, 'state')).toEqual([]);
  });

  it('shows the value as a needle when asked, on a hub, with no arc', async () => {
    const fixture = await render();
    fixture.componentInstance.indicator.set('needle');
    await settle(fixture);
    expect(one(fixture, 'pct-gauge').classList.contains('needle')).toBe(true);
    expect(path(fixture, 'fill')).toBeNull();
    const needle = path(fixture, 'needle');
    expect(needle).toMatch(
      /^M 148\.0\d+ 111\.7\d+ L 182\.8\d+ 11\.2\d+ L 151\.9\d+ 112\.9\d+ Z$/,
    );
    const hub = one(fixture, '.hub');
    expect(hub.getAttribute('cx')).toBe('150');
    expect(Number(hub.getAttribute('cy'))).toBeCloseTo(112.33, 2);
    expect(hub.getAttribute('r')).toBe('4');
  });

  it('writes plain numbers with no unit, and labels the ends beside a half arc and not at all on a ring', async () => {
    const fixture = await render();
    fixture.componentInstance.unit.set('');
    fixture.componentInstance.sweep.set(180);
    await settle(fixture);
    expect(meter(fixture).getAttribute('aria-valuetext')).toBe('21.5, Comfort');
    // a half arc ends level with the middle: the labels stand beside the ends
    const ends = text(fixture, 'label');
    expect(ends.map((e) => [e.text, e.anchor])).toEqual([
      ['10', 'end'],
      ['30', 'start'],
    ]);
    expect(ends.map((e) => [e.x, e.y])).toEqual([
      [-9.5, 150],
      [309.5, 150],
    ]);
    // three quarters of a turn reach further below the middle: the arc shrinks to leave the
    // labels their line under the ends
    fixture.componentInstance.sweep.set(270);
    await settle(fixture);
    expect(text(fixture, 'label')).toEqual([
      { text: '10', x: 79.09, y: 180.69, anchor: 'middle' },
      { text: '30', x: 220.91, y: 180.69, anchor: 'middle' },
    ]);
    expect(text(fixture, 'value')[0].y).toBeCloseTo(100.28, 2);
    fixture.componentInstance.sweep.set(360);
    await settle(fixture);
    expect(text(fixture, 'label')).toEqual([]);
    expect(path(fixture, 'track')).toMatch(/^M .* A .* A .* L .* A .* A .* Z$/);
  });

  it("reads the track's width and the font from the stylesheet, keeps the width at a token of nought, and warns in development when unnamed", async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const skin = { fontSize: '20px', width: '30px' };
    const style = window.getComputedStyle(document.body);
    vi.spyOn(window, 'getComputedStyle').mockImplementation((el) =>
      el.tagName === 'PCT-GAUGE'
        ? ({
            ...style,
            get fontSize() {
              return skin.fontSize;
            },
            getPropertyValue: (name: string) =>
              name === '--pct-chart-gauge-width' ? skin.width : '',
          } as unknown as CSSStyleDeclaration)
        : style,
    );
    let watch:
      | ((
          entries: { contentRect: { width: number; height: number } }[],
        ) => void)
      | null = null;
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback: NonNullable<typeof watch>) {
          watch = callback;
        }
        observe(): void {
          // nothing to watch
        }
        unobserve(): void {
          // nothing watched
        }
        disconnect(): void {
          watch = null;
        }
      },
    );
    const fixture = await render();
    // a wider track: the arc's radii are fifteen apart from its middle; a larger font: a line
    // of 28 between the value and the band's word, and under the ends
    expect(path(fixture, 'track')).toMatch(
      /^M .* A 97 97 0 1 1 .* A 67 67 0 1 0 .* Z$/,
    );
    expect(text(fixture, 'value')[0].y).toBeCloseTo(103, 6);
    expect(text(fixture, 'state')[0].y).toBeCloseTo(131, 6);
    // the skin changes under the gauge: the font is read again, a width of nought is kept out
    skin.fontSize = '';
    skin.width = '0px';
    const reread = (): void =>
      watch?.([{ contentRect: { width: 300, height: 200 } }]);
    reread();
    await settle(fixture);
    expect(path(fixture, 'track')).toMatch(
      /^M .* A 109 109 0 1 1 .* A 79 79 0 1 0 .* Z$/,
    );
    expect(
      text(fixture, 'state')[0].y - text(fixture, 'value')[0].y,
    ).toBeCloseTo(19, 6);
    expect(warn).not.toHaveBeenCalled();
    fixture.componentInstance.label.set('');
    await settle(fixture);
    const messages = () => warn.mock.calls.map(([m]) => String(m));
    expect(messages()).toContain(
      '[pct-gauge] A gauge with neither `ariaLabel` nor `ariaLabelledby`. A meter is ' +
        'announced by its name — what is measured — and only the application knows that.',
    );
    // a blank name is none; a name that stands elsewhere is one
    warn.mockClear();
    fixture.componentInstance.label.set('  ');
    fixture.componentInstance.labelledby.set('   ');
    await settle(fixture);
    expect(messages()).toContainEqual(
      expect.stringMatching(/^\[pct-gauge\] A gauge with neither/),
    );
    warn.mockClear();
    fixture.componentInstance.labelledby.set('title');
    await settle(fixture);
    expect(messages()).toEqual([]);
    fixture.destroy();
    expect(watch).toBeNull();
  });

  it('draws nothing until the box has a width and a height, and follows the box as it is resized', async () => {
    let watch:
      | ((
          entries: { contentRect: { width: number; height: number } }[],
        ) => void)
      | null = null;
    const observed: string[] = [];
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback: NonNullable<typeof watch>) {
          watch = callback;
        }
        observe(el: Element): void {
          observed.push(el.tagName);
        }
        unobserve(): void {
          // nothing watched
        }
        disconnect(): void {
          watch = null;
        }
      },
    );
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(0);
    const fixture = await render();
    // the meter speaks before the drawing has a size
    expect(meter(fixture).getAttribute('aria-valuetext')).toBe(
      '21.5 °C, Comfort',
    );
    expect(one(fixture, '[data-pct-part="data"]')).toBeNull();
    expect(observed).toEqual(['PCT-GAUGE']);
    const resize = async (width: number, height: number): Promise<void> => {
      watch?.([{ contentRect: { width, height } }]);
      await settle(fixture);
    };
    await resize(300, 0);
    expect(one(fixture, '[data-pct-part="data"]')).toBeNull();
    await resize(0, 200);
    expect(one(fixture, '[data-pct-part="data"]')).toBeNull();
    await resize(300, 200);
    expect(text(fixture, 'value')[0]).toMatchObject({
      x: 150,
      y: expect.closeTo(112.33, 2),
    });
    // the width alone moves the middle; the height alone lets the arc grow
    await resize(400, 200);
    expect(text(fixture, 'value')[0]).toMatchObject({
      x: 200,
      y: expect.closeTo(112.33, 2),
    });
    await resize(400, 240);
    expect(text(fixture, 'value')[0]).toMatchObject({ x: 200, y: 139 });
    // a low box binds the arc by its height: a half arc keeps one line for the value under
    // the middle and labels the ends beside it, a third of a turn stands its labels higher
    fixture.componentInstance.sweep.set(180);
    await resize(300, 150);
    expect(text(fixture, 'value')[0]).toMatchObject({ x: 150, y: 131 });
    expect(text(fixture, 'label')).toEqual([
      { text: '10 °C', x: 9.5, y: 131, anchor: 'end' },
      { text: '30 °C', x: 290.5, y: 131, anchor: 'start' },
    ]);
    fixture.componentInstance.sweep.set(120);
    await settle(fixture);
    expect(text(fixture, 'value')[0]).toMatchObject({ x: 150, y: 131 });
    expect(text(fixture, 'label')).toEqual([
      { text: '10 °C', x: 27.05, y: 65.5, anchor: 'end' },
      { text: '30 °C', x: 272.95, y: 65.5, anchor: 'start' },
    ]);
  });

  it("comes as a plain number from nought to a hundred in the application's locale, with no bands and an arc, and warns when unnamed", async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const fixture = await renderAs(Bare);
    const m = meter(fixture);
    expect(m.getAttribute('aria-label')).toBeNull();
    expect(m.getAttribute('aria-labelledby')).toBeNull();
    expect(m.getAttribute('aria-valuemin')).toBe('0');
    expect(m.getAttribute('aria-valuemax')).toBe('100');
    expect(m.getAttribute('aria-valuenow')).toBe('21.56789');
    expect(m.getAttribute('aria-valuetext')).toBe('21.568');
    expect(one(fixture, 'pct-gauge').getAttribute('data-pct-tone')).toBeNull();
    expect(all(fixture, '[data-pct-part="band"]')).toEqual([]);
    expect(text(fixture, 'state')).toEqual([]);
    expect(text(fixture, 'label').map((l) => l.text)).toEqual(['0', '100']);
    expect(path(fixture, 'fill')).not.toBeNull();
    expect(path(fixture, 'needle')).toBeNull();
    const gauge = fixture.debugElement.query((d) => d.name === 'pct-gauge')
      .componentInstance as PctGauge;
    expect(gauge.effectiveLocale()).toBe('en-US');
    expect(warn.mock.calls.map(([m]) => String(m))).toContain(
      '[pct-gauge] A gauge with neither `ariaLabel` nor `ariaLabelledby`. A meter is ' +
        'announced by its name — what is measured — and only the application knows that.',
    );
  });
});
