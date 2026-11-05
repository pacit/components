import {
  Component,
  provideZonelessChangeDetection,
  signal,
  type Type,
} from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PctSparkline, type PctSparkValue } from './sparkline';

@Component({
  imports: [PctSparkline],
  template: `
    <pct-sparkline
      [data]="data()"
      [kind]="kind()"
      [area]="area()"
      [last]="last()"
      [extremes]="extremes()"
      [floor]="floor()"
      [ceiling]="ceiling()"
      [color]="color()"
      [unit]="unit()"
      [locale]="locale()"
      [ariaLabel]="label()"
      [ariaLabelledby]="labelledby()"
    />
  `,
})
class Host {
  readonly data = signal<readonly (number | null)[]>([3, 5, 4, 8]);
  readonly kind = signal<'line' | 'bars' | 'band'>('line');
  readonly area = signal(false);
  readonly last = signal(true);
  readonly extremes = signal(false);
  readonly floor = signal<number | null>(null);
  readonly ceiling = signal<number | null>(null);
  readonly color = signal('');
  readonly unit = signal('');
  readonly locale = signal('en-US');
  readonly label = signal('Orders');
  readonly labelledby = signal('');
}

interface Room {
  readonly room: string;
  readonly kwh: number | string | null;
}

@Component({
  imports: [PctSparkline],
  template: `<pct-sparkline
    [data]="rows"
    [value]="value()"
    ariaLabel="Energy"
  />`,
})
class Rows {
  readonly rows: readonly Room[] = [
    { room: 'Hall', kwh: 2 },
    { room: 'Attic', kwh: 'x' },
    { room: 'Kitchen', kwh: 6 },
  ];
  readonly value = signal<PctSparkValue<Room>>('kwh');
}

/** A sparkline as it comes, with nothing set but the data. */
@Component({
  imports: [PctSparkline],
  template: `<pct-sparkline [data]="[1.23456, 2]" />`,
})
class Bare {}

/** A sparkline with a name and nothing else: not even rows. */
@Component({
  imports: [PctSparkline],
  template: `<pct-sparkline ariaLabel="Hall" />`,
})
class Empty {}

async function render<H>(type: Type<H>): Promise<ComponentFixture<H>> {
  TestBed.configureTestingModule({
    providers: [provideZonelessChangeDetection()],
  });
  const fixture = TestBed.createComponent(type);
  await settle(fixture);
  return fixture;
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  for (let i = 0; i < 3; i++) {
    fixture.detectChanges();
    await fixture.whenStable();
  }
}

const host = (fixture: ComponentFixture<unknown>) =>
  (fixture.nativeElement as HTMLElement).querySelector(
    'pct-sparkline',
  ) as HTMLElement;
const part = (fixture: ComponentFixture<unknown>, name: string) =>
  host(fixture).querySelector(`[data-pct-part="${name}"]`);
const parts = (fixture: ComponentFixture<unknown>, name: string) => [
  ...host(fixture).querySelectorAll(`[data-pct-part="${name}"]`),
];
const d = (fixture: ComponentFixture<unknown>, name: string) =>
  part(fixture, name)?.getAttribute('d') ?? null;
const dots = (fixture: ComponentFixture<unknown>) =>
  parts(fixture, 'dot').map((dot) => ({
    kind: dot.getAttribute('data-pct-dot'),
    left: (dot as HTMLElement).style.left,
    top: (dot as HTMLElement).style.top,
  }));
const rects = (fixture: ComponentFixture<unknown>, name: string) =>
  parts(fixture, name).map((r) => ({
    x: r.getAttribute('x'),
    y: r.getAttribute('y'),
    width: r.getAttribute('width'),
    height: r.getAttribute('height'),
    on: r.hasAttribute('data-pct-on'),
  }));
const description = (fixture: ComponentFixture<unknown>) =>
  (fixture.nativeElement as HTMLElement).querySelector(
    `#${host(fixture).getAttribute('aria-describedby')}`,
  )?.textContent;

describe('PctSparkline', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('is an image named by the consumer and described by its lowest, highest and last value, the drawing hidden', async () => {
    const fixture = await render(Host);
    const el = host(fixture);
    expect(el.getAttribute('role')).toBe('img');
    expect(el.getAttribute('aria-label')).toBe('Orders');
    expect(el.getAttribute('aria-labelledby')).toBeNull();
    expect(el.getAttribute('aria-describedby')).toMatch(
      /^pct-sparkline-description-\d+$/,
    );
    expect(el.getAttribute('data-pct-kind')).toBe('line');
    expect(el.style.getPropertyValue('--_pct-sparkline-color')).toBe('');
    expect(description(fixture)).toBe('3 – 8, last 8');
    const picture = part(fixture, 'picture');
    expect(picture?.getAttribute('aria-hidden')).toBe('true');
    expect(picture?.getAttribute('viewBox')).toBe('0 0 100 100');
    expect(picture?.getAttribute('preserveAspectRatio')).toBe('none');
    // a line from the first value at the left edge to the last at the right, the lowest at
    // the bottom and the highest at the top
    expect(d(fixture, 'line')).toBe('M 0 100 L 33.33 60 L 66.67 80 L 100 0');
    expect(part(fixture, 'area')).toBeNull();
    expect(dots(fixture)).toEqual([{ kind: 'last', left: '100%', top: '0%' }]);
    fixture.componentInstance.labelledby.set('row-1');
    fixture.componentInstance.label.set('');
    fixture.componentInstance.color.set('tomato');
    await settle(fixture);
    expect(el.getAttribute('aria-label')).toBeNull();
    expect(el.getAttribute('aria-labelledby')).toBe('row-1');
    expect(el.style.getPropertyValue('--_pct-sparkline-color')).toBe('tomato');
  });

  it('fills under the line to the floor, marks the extremes when asked, and leaves the last unmarked when told', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.area.set(true);
    fixture.componentInstance.extremes.set(true);
    fixture.componentInstance.unit.set('kWh');
    await settle(fixture);
    expect(d(fixture, 'area')).toBe(
      'M 0 100 L 0 100 L 33.33 60 L 66.67 80 L 100 0 L 100 100 Z',
    );
    expect(dots(fixture)).toEqual([
      { kind: 'min', left: '0%', top: '100%' },
      { kind: 'max', left: '100%', top: '0%' },
      { kind: 'last', left: '100%', top: '0%' },
    ]);
    expect(description(fixture)).toBe('3 kWh – 8 kWh, last 8 kWh');
    fixture.componentInstance.last.set(false);
    await settle(fixture);
    expect(dots(fixture).map((dot) => dot.kind)).toEqual(['min', 'max']);
    fixture.componentInstance.extremes.set(false);
    await settle(fixture);
    expect(dots(fixture)).toEqual([]);
  });

  it('breaks the line at a gap, closes the area of each run of two or more, and marks the last value there is', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.data.set([3, null, 5, 8, NaN, 4]);
    fixture.componentInstance.area.set(true);
    await settle(fixture);
    expect(d(fixture, 'line')).toBe(
      'M 0 100 L 0 100 M 40 60 L 60 0 M 100 80 L 100 80',
    );
    expect(d(fixture, 'area')).toBe('M 40 100 L 40 60 L 60 0 L 60 100 Z');
    expect(dots(fixture)).toEqual([{ kind: 'last', left: '100%', top: '80%' }]);
    expect(description(fixture)).toBe('3 – 8, last 4');
    // a gap at the end: the last value there is
    fixture.componentInstance.data.set([3, 8, null, null]);
    await settle(fixture);
    expect(dots(fixture)).toEqual([
      { kind: 'last', left: '33.33%', top: '0%' },
    ]);
    expect(description(fixture)).toBe('3 – 8, last 8');
    // two runs of two or more: an area each, in one path
    fixture.componentInstance.data.set([3, 5, null, 8, 4]);
    await settle(fixture);
    expect(d(fixture, 'area')).toBe(
      'M 0 100 L 0 100 L 25 60 L 25 100 Z M 75 100 L 75 0 L 100 80 L 100 100 Z',
    );
  });

  it('draws a flat series and a single value in the middle, and nothing with no value at all', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.data.set([4, 4, 4]);
    fixture.componentInstance.area.set(true);
    await settle(fixture);
    expect(d(fixture, 'line')).toBe('M 0 50 L 50 50 L 100 50');
    expect(description(fixture)).toBe('4 – 4, last 4');
    fixture.componentInstance.data.set([7]);
    await settle(fixture);
    expect(d(fixture, 'line')).toBe('M 50 50 L 50 50');
    expect(part(fixture, 'area')).toBeNull();
    expect(dots(fixture)).toEqual([{ kind: 'last', left: '50%', top: '50%' }]);
    for (const data of [[], [null, NaN]]) {
      fixture.componentInstance.data.set(data);
      await settle(fixture);
      expect(part(fixture, 'line')).toBeNull();
      expect(part(fixture, 'area')).toBeNull();
      expect(dots(fixture)).toEqual([]);
      expect(description(fixture)).toBe('No data');
    }
    fixture.componentInstance.kind.set('bars');
    fixture.componentInstance.extremes.set(true);
    await settle(fixture);
    expect(parts(fixture, 'bar')).toEqual([]);
    expect(dots(fixture)).toEqual([]);
  });

  it('draws in the range asked, holding a value outside it at the edge, and a ceiling under the floor at the floor', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.floor.set(0);
    fixture.componentInstance.ceiling.set(10);
    await settle(fixture);
    expect(d(fixture, 'line')).toBe('M 0 70 L 33.33 50 L 66.67 60 L 100 20');
    // the words are the data's, not the range's
    expect(description(fixture)).toBe('3 – 8, last 8');
    fixture.componentInstance.floor.set(4);
    fixture.componentInstance.ceiling.set(6);
    await settle(fixture);
    expect(d(fixture, 'line')).toBe('M 0 100 L 33.33 50 L 66.67 100 L 100 0');
    fixture.componentInstance.floor.set(5);
    fixture.componentInstance.ceiling.set(2);
    await settle(fixture);
    expect(d(fixture, 'line')).toBe('M 0 50 L 33.33 50 L 66.67 50 L 100 50');
    fixture.componentInstance.floor.set(null);
    fixture.componentInstance.ceiling.set(12);
    await settle(fixture);
    expect(d(fixture, 'line')).toBe(
      'M 0 100 L 33.33 77.78 L 66.67 88.89 L 100 44.44',
    );
  });

  it('draws a bar per value from nought, in the middle of its slot, and marks the bars', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.kind.set('bars');
    fixture.componentInstance.data.set([3, -2, 5]);
    fixture.componentInstance.extremes.set(true);
    await settle(fixture);
    expect(host(fixture).getAttribute('data-pct-kind')).toBe('bars');
    expect(part(fixture, 'line')).toBeNull();
    expect(rects(fixture, 'bar')).toEqual([
      { x: '3.33', y: '28.57', width: '26.67', height: '42.86', on: false },
      { x: '36.67', y: '71.43', width: '26.67', height: '28.57', on: false },
      { x: '70', y: '0', width: '26.67', height: '71.43', on: false },
    ]);
    expect(dots(fixture)).toEqual([
      { kind: 'min', left: '50%', top: '100%' },
      { kind: 'max', left: '83.33%', top: '0%' },
      { kind: 'last', left: '83.33%', top: '0%' },
    ]);
    expect(description(fixture)).toBe('-2 – 5, last 5');
    // all above nought: the bars still rise from it, and a gap is no bar
    fixture.componentInstance.data.set([2, null, 4]);
    await settle(fixture);
    expect(rects(fixture, 'bar')).toEqual([
      { x: '3.33', y: '50', width: '26.67', height: '50', on: false },
      { x: '70', y: '0', width: '26.67', height: '100', on: false },
    ]);
    // a floor above nought: the bars rise from the floor
    fixture.componentInstance.floor.set(1);
    await settle(fixture);
    expect(rects(fixture, 'bar').map((r) => [r.y, r.height])).toEqual([
      ['66.67', '33.33'],
      ['0', '100'],
    ]);
    // all below nought: they hang from it
    fixture.componentInstance.floor.set(null);
    fixture.componentInstance.data.set([-2, -4]);
    await settle(fixture);
    expect(rects(fixture, 'bar').map((r) => [r.y, r.height])).toEqual([
      ['0', '50'],
      ['0', '100'],
    ]);
  });

  it('draws a band of slots, on at a half or more, a gap no slot, with no dots, and says the last state', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.kind.set('band');
    fixture.componentInstance.extremes.set(true);
    fixture.componentInstance.data.set([1, 0, null, 0.5, 0.4]);
    await settle(fixture);
    expect(rects(fixture, 'slot')).toEqual([
      { x: '0', y: '0', width: '20', height: '100', on: true },
      { x: '20', y: '0', width: '20', height: '100', on: false },
      { x: '60', y: '0', width: '20', height: '100', on: true },
      { x: '80', y: '0', width: '20', height: '100', on: false },
    ]);
    expect(dots(fixture)).toEqual([]);
    expect(description(fixture)).toBe('last Off');
    fixture.componentInstance.data.set([0, 0.5]);
    await settle(fixture);
    expect(description(fixture)).toBe('last On');
  });

  it('reads a value off a row by its key or by a function, a value that is no number a gap', async () => {
    const fixture = await render(Rows);
    expect(d(fixture, 'line')).toBe('M 0 100 L 0 100 M 100 0 L 100 0');
    expect(description(fixture)).toBe('2 – 6, last 6');
    fixture.componentInstance.value.set((row, index) =>
      row.room === 'Attic' ? 4 : index,
    );
    await settle(fixture);
    expect(d(fixture, 'line')).toBe('M 0 100 L 50 0 L 100 50');
    expect(description(fixture)).toBe('0 – 4, last 2');
  });

  it("writes its words in the locale given, the application's otherwise, and warns in development when unnamed", async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const fixture = await render(Host);
    fixture.componentInstance.locale.set('de-DE');
    fixture.componentInstance.data.set([1.5, 2.25]);
    await settle(fixture);
    expect(description(fixture)).toBe('1,5 – 2,25, last 2,25');
    expect(warn).not.toHaveBeenCalled();
    const messages = () => warn.mock.calls.map(([m]) => String(m));
    fixture.componentInstance.label.set('  ');
    fixture.componentInstance.labelledby.set('   ');
    await settle(fixture);
    expect(messages()).toContain(
      '[pct-sparkline] A sparkline with neither `ariaLabel` nor `ariaLabelledby`. The picture ' +
        'is announced by its name — what is drawn — and only the application knows that.',
    );
    warn.mockClear();
    fixture.componentInstance.labelledby.set('row-1');
    await settle(fixture);
    expect(messages()).toEqual([]);
  });

  it('comes as a line with the last value marked, no area, no extremes, plain numbers in the application locale, and warns when unnamed', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const fixture = await render(Bare);
    expect(host(fixture).getAttribute('data-pct-kind')).toBe('line');
    expect(host(fixture).getAttribute('aria-label')).toBeNull();
    expect(d(fixture, 'line')).toBe('M 0 100 L 100 0');
    expect(part(fixture, 'area')).toBeNull();
    expect(dots(fixture).map((dot) => dot.kind)).toEqual(['last']);
    expect(description(fixture)).toBe('1.235 – 2, last 2');
    expect(host(fixture).style.getPropertyValue('--_pct-sparkline-color')).toBe(
      '',
    );
    expect(warn.mock.calls.map(([m]) => String(m))).toContainEqual(
      expect.stringMatching(/^\[pct-sparkline\] A sparkline with neither/),
    );
  });

  it('comes with no rows: nothing drawn, no dot, and the words say so', async () => {
    const fixture = await render(Empty);
    expect(parts(fixture, 'dot')).toEqual([]);
    expect(d(fixture, 'line') ?? '').toBe('');
    expect(description(fixture)).toBe('No data');
  });
});
