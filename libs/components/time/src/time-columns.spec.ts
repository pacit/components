import {
  Component,
  ErrorHandler,
  provideZonelessChangeDetection,
  signal,
} from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { providePctTexts } from '@pacit/components/core';
import { PctField } from '@pacit/components/field';
import { PctWheel } from '@pacit/components/wheel';

import { PctTimeOfDay } from './time';
import {
  PctTimeColumns,
  PctTimePicker,
  PctTimePredicate,
} from './time-columns';

@Component({
  imports: [PctTimeColumns],
  template: `<pct-time-columns
    [(value)]="value"
    [locale]="locale()"
    [step]="step()"
    [min]="min()"
    [max]="max()"
    [disabled]="disabled()"
    [timeDisabled]="timeDisabled()"
    [ariaLabel]="ariaLabel()"
    [picker]="picker()"
    [rows]="rows()"
    (timePicked)="picked.push($event)"
  />`,
})
class Host {
  readonly value = signal<PctTimeOfDay | null>('13:05');
  readonly locale = signal('en-GB');
  readonly step = signal(60);
  readonly min = signal<string | undefined>(undefined);
  readonly max = signal<string | undefined>(undefined);
  readonly disabled = signal(false);
  readonly timeDisabled = signal<PctTimePredicate | null>(null);
  readonly ariaLabel = signal('');
  readonly picker = signal<PctTimePicker>('list');
  readonly rows = signal<unknown>(7);
  readonly picked: PctTimeOfDay[] = [];
}

async function render(setup: (host: Host) => void = () => undefined) {
  const f = TestBed.createComponent(Host);
  setup(f.componentInstance);
  f.detectChanges();
  await f.whenStable();
  return f;
}

async function settle(f: ComponentFixture<Host>) {
  f.detectChanges();
  await f.whenStable();
}

const columnsOf = (f: ComponentFixture<unknown>) =>
  Array.from(
    (f.nativeElement as HTMLElement).querySelectorAll<HTMLElement>(
      '[data-pct-part="column"]',
    ),
  );

const column = (f: ComponentFixture<unknown>, field: string) =>
  (f.nativeElement as HTMLElement).querySelector<HTMLElement>(
    `[data-pct-part="column"][data-pct-field="${field}"]`,
  ) as HTMLElement;

const rowsOf = (list: HTMLElement) =>
  Array.from(list.querySelectorAll<HTMLElement>('[data-pct-part="option"]'));

const labels = (list: HTMLElement) =>
  rowsOf(list).map((row) => row.textContent?.trim());

const enabled = (list: HTMLElement) =>
  rowsOf(list)
    .filter((row) => row.getAttribute('aria-disabled') !== 'true')
    .map((row) => row.textContent?.trim());

const active = (list: HTMLElement) =>
  list
    .querySelector(`#${list.getAttribute('aria-activedescendant')}`)
    ?.textContent?.trim();

const chosen = (list: HTMLElement) =>
  rowsOf(list)
    .filter((row) => row.getAttribute('aria-selected') === 'true')
    .map((row) => row.textContent?.trim());

async function press(
  f: ComponentFixture<Host>,
  list: HTMLElement,
  key: string,
  init: KeyboardEventInit = {},
) {
  const event = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
    ...init,
  });
  list.dispatchEvent(event);
  await settle(f);
  return event;
}

const hostOf = (f: ComponentFixture<unknown>) =>
  (f.nativeElement as HTMLElement).querySelector(
    'pct-time-columns',
  ) as HTMLElement;

const wheelsOf = (f: ComponentFixture<unknown>) =>
  Array.from(
    (f.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('pct-wheel'),
  );

/** The listbox of a column drawn as a wheel — the element its keys and its scroll are on. */
const wheel = (f: ComponentFixture<unknown>, field: string) =>
  (f.nativeElement as HTMLElement).querySelector<HTMLElement>(
    `pct-wheel[data-pct-field="${field}"] [data-pct-part="list"]`,
  ) as HTMLElement;

/** The rows of a wheel a reader meets: a ring's runway copies are left out. */
const turn = (list: HTMLElement) =>
  rowsOf(list).filter((row) => row.getAttribute('aria-hidden') !== 'true');

const turnLabels = (list: HTMLElement) =>
  turn(list).map((row) => row.textContent?.trim());

const wheelAsked = (f: ComponentFixture<unknown>, field: string) =>
  (
    f.debugElement.query(By.css(`pct-wheel[data-pct-field="${field}"]`))
      .componentInstance as PctWheel<number>
  ).options();

/** The height the layout stub gives every row, in pixels. */
const ROW = 32;

interface ScrollCall {
  readonly list: Element;
  readonly top: number;
  readonly behavior: ScrollBehavior;
}

/**
 * jsdom lays nothing out, so the scroll code finds columns that are not on the screen. This
 * gives it one — every row `ROW` high and stacked in its parent, a window of seven rows, a
 * `scrollTop` that keeps what is written and a `scrollTo` that moves it at once — and takes
 * it back.
 */
function layout(): { calls: ScrollCall[]; restore: () => void } {
  const calls: ScrollCall[] = [];
  const tops = new WeakMap<Element, number>();
  const stubs: readonly (readonly [object, string, PropertyDescriptor])[] = [
    [HTMLElement.prototype, 'offsetHeight', { get: () => ROW }],
    [
      HTMLElement.prototype,
      'offsetTop',
      {
        get(this: HTMLElement) {
          return (
            Array.from(this.parentElement?.children ?? []).indexOf(this) * ROW
          );
        },
      },
    ],
    [Element.prototype, 'clientHeight', { get: () => 7 * ROW }],
    [
      Element.prototype,
      'scrollHeight',
      {
        get(this: Element) {
          return this.children.length * ROW;
        },
      },
    ],
    [
      Element.prototype,
      'scrollTop',
      {
        get(this: Element) {
          return tops.get(this) ?? 0;
        },
        set(this: Element, top: number) {
          tops.set(this, top);
        },
      },
    ],
    [
      Element.prototype,
      'scrollTo',
      {
        writable: true,
        value(this: Element, options: ScrollToOptions) {
          calls.push({
            list: this,
            top: options.top as number,
            behavior: options.behavior as ScrollBehavior,
          });
          tops.set(this, options.top as number);
        },
      },
    ],
  ];
  const kept = stubs.map(([target, name]) =>
    Object.getOwnPropertyDescriptor(target, name),
  );
  for (const [target, name, descriptor] of stubs)
    Object.defineProperty(target, name, { configurable: true, ...descriptor });
  return {
    calls,
    restore: () =>
      stubs.forEach(([target, name], index) => {
        const descriptor = kept[index];
        if (descriptor) Object.defineProperty(target, name, descriptor);
        else delete (target as Record<string, unknown>)[name];
      }),
  };
}

/** The motion axis with a duration on it, for as long as `run` takes. */
async function moving(run: () => Promise<void>): Promise<void> {
  const style = vi.spyOn(window, 'getComputedStyle').mockReturnValue({
    getPropertyValue: (name: string) =>
      name === '--pct-motion-transition-duration' ? '150ms' : '',
  } as CSSStyleDeclaration);
  try {
    await run();
  } finally {
    style.mockRestore();
  }
}

beforeEach(() => {
  TestBed.configureTestingModule({
    providers: [provideZonelessChangeDetection()],
  });
});

describe('PctTimeColumns — the columns there are', () => {
  it('lists hours and minutes on a twenty-four-hour clock, two digits each', async () => {
    const f = await render();
    expect(columnsOf(f).map((c) => c.dataset['pctField'])).toEqual([
      'hour',
      'minute',
    ]);
    const hours = labels(column(f, 'hour'));
    expect(hours).toHaveLength(24);
    expect(hours[0]).toBe('00');
    expect(hours[23]).toBe('23');
    const minutes = labels(column(f, 'minute'));
    expect(minutes).toHaveLength(60);
    expect(minutes[0]).toBe('00');
    expect(minutes[59]).toBe('59');
  });

  it('adds the two halves of the day on a twelve-hour clock, where the language writes them', async () => {
    const f = await render((h) => h.locale.set('en-US'));
    expect(columnsOf(f).map((c) => c.dataset['pctField'])).toEqual([
      'hour',
      'minute',
      'dayPeriod',
    ]);
    // `h12` writes the first hour `12`, and the locale's own width: `1`, not `01`.
    expect(labels(column(f, 'hour'))).toEqual([
      '12',
      '1',
      '2',
      '3',
      '4',
      '5',
      '6',
      '7',
      '8',
      '9',
      '10',
      '11',
    ]);
    expect(labels(column(f, 'dayPeriod'))).toEqual(['AM', 'PM']);
  });

  it('stands the day period where the language does — before the hour in Korean', async () => {
    const f = await render((h) => h.locale.set('ko-KR'));
    expect(columnsOf(f).map((c) => c.dataset['pctField'])).toEqual([
      'dayPeriod',
      'hour',
      'minute',
    ]);
    expect(labels(column(f, 'dayPeriod'))).toEqual(['오전', '오후']);
  });

  it('writes the hour as wide as the field writes it', async () => {
    // Most twelve-hour clocks write `1:05 PM`; the ones that pad write `01:05 AM`, and the
    // column follows the field rather than a rule about twelve-hour clocks.
    const padded = await render((h) => h.locale.set('hr-HR-u-hc-h12'));
    expect(labels(column(padded, 'hour'))[1]).toBe('01');
    const plain = await render((h) => h.locale.set('en-US'));
    expect(labels(column(plain, 'hour'))[1]).toBe('1');
  });

  it('writes each cycle’s first hour as that cycle writes it', async () => {
    const h11 = await render((h) => h.locale.set('ja-JP-u-hc-h11'));
    expect(labels(column(h11, 'hour'))[0]).toBe('0');
    const h24 = await render((h) => h.locale.set('en-US-u-hc-h24'));
    expect(labels(column(h24, 'hour'))[0]).toBe('24');
    expect(labels(column(h24, 'hour'))[1]).toBe('01');
  });

  it('writes the rows in the digits the field is written in', async () => {
    const f = await render((h) => h.locale.set('ar-EG'));
    expect(labels(column(f, 'minute'))[5]).toBe('٠٥');
    expect(labels(column(f, 'hour'))[1]).toBe('١');
    expect(labels(column(f, 'dayPeriod'))).toEqual(['ص', 'م']);
  });

  it('adds seconds where the step has them, and only there', async () => {
    const f = await render((h) => h.step.set(15));
    expect(columnsOf(f).map((c) => c.dataset['pctField'])).toEqual([
      'hour',
      'minute',
      'second',
    ]);
    expect(labels(column(f, 'second'))).toEqual(['00', '15', '30', '45']);
  });

  it('lists the minutes the step reaches, counted from min', async () => {
    const quarter = await render((h) => h.step.set(900));
    expect(labels(column(quarter, 'minute'))).toEqual(['00', '15', '30', '45']);
    const offset = await render((h) => {
      h.step.set(900);
      h.min.set('09:05');
    });
    expect(labels(column(offset, 'minute'))).toEqual(['05', '20', '35', '50']);
  });

  it('lists the hours an hour step reaches, and the one minute it stands on', async () => {
    const f = await render((h) => {
      h.step.set(3 * 3600);
      h.value.set('03:00');
    });
    expect(labels(column(f, 'hour'))).toEqual([
      '00',
      '03',
      '06',
      '09',
      '12',
      '15',
      '18',
      '21',
    ]);
    expect(labels(column(f, 'minute'))).toEqual(['00']);
  });

  it('reads a step it cannot list as 60, and says so in dev mode', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const f = await render((h) => h.step.set(420));
    expect(labels(column(f, 'minute'))).toHaveLength(60);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('[pct-time-columns] step=420'),
    );
    warn.mockClear();
    f.componentInstance.step.set(300);
    await settle(f);
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});

describe('PctTimeColumns — the roles and the names', () => {
  it('makes every column a named listbox and one tab stop', async () => {
    const f = await render((h) => h.locale.set('en-US'));
    for (const list of columnsOf(f)) {
      expect(list.getAttribute('role')).toBe('listbox');
      expect(list.getAttribute('tabindex')).toBe('0');
    }
    expect(columnsOf(f).map((c) => c.getAttribute('aria-label'))).toEqual([
      'Hours',
      'Minutes',
      'AM/PM',
    ]);
    // The rows are options, and none of them is a tab stop: the column points at them.
    const rows = rowsOf(column(f, 'minute'));
    expect(rows.every((row) => row.getAttribute('role') === 'option')).toBe(
      true,
    );
    expect(rows.every((row) => !row.hasAttribute('tabindex'))).toBe(true);
  });

  it('names the seconds column too', async () => {
    const f = await render((h) => h.step.set(1));
    expect(column(f, 'second').getAttribute('aria-label')).toBe('Seconds');
  });

  it('takes the names from the texts channel', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        providePctTexts({
          timeHours: 'Heures',
          timeMinutes: 'Minutes',
          timeSeconds: 'Secondes',
          timePeriod: 'Période',
        }),
      ],
    });
    const f = await render((h) => {
      h.locale.set('en-US');
      h.step.set(1);
    });
    expect(columnsOf(f).map((c) => c.getAttribute('aria-label'))).toEqual([
      'Heures',
      'Minutes',
      'Secondes',
      'Période',
    ]);
  });

  it('names the group it stands in only when told to', async () => {
    const f = await render();
    const host = f.nativeElement.querySelector(
      'pct-time-columns',
    ) as HTMLElement;
    expect(host.getAttribute('role')).toBe('group');
    expect(host.hasAttribute('aria-label')).toBe(false);
    expect(host.hasAttribute('aria-labelledby')).toBe(false);
    f.componentInstance.ariaLabel.set('Start time');
    await settle(f);
    expect(host.getAttribute('aria-label')).toBe('Start time');
  });

  it('names the group by a heading on the page', async () => {
    @Component({
      imports: [PctTimeColumns],
      template: `<h3 id="when">When</h3>
        <pct-time-columns ariaLabelledby="when" />`,
    })
    class Labelled {}
    const f = TestBed.createComponent(Labelled);
    f.detectChanges();
    await f.whenStable();
    const host = f.nativeElement.querySelector(
      'pct-time-columns',
    ) as HTMLElement;
    expect(host.getAttribute('aria-labelledby')).toBe('when');
    expect(host.hasAttribute('aria-label')).toBe(false);
  });

  it('carries its size to the rows, and the configured one by default', async () => {
    @Component({
      imports: [PctTimeColumns],
      template: `<pct-time-columns size="sm" /><pct-time-columns />`,
    })
    class Sized {}
    const f = TestBed.createComponent(Sized);
    f.detectChanges();
    await f.whenStable();
    const [small, plain] = Array.from(
      f.nativeElement.querySelectorAll('pct-time-columns'),
    ) as HTMLElement[];
    expect(small.getAttribute('data-pct-size')).toBe('sm');
    expect(plain.getAttribute('data-pct-size')).toBe('md');
  });

  it('marks the row the walk stands on in every column, and only that one', async () => {
    const f = await render((h) => {
      h.step.set(900);
      h.value.set('13:05');
    });
    const marked = (list: HTMLElement) =>
      rowsOf(list)
        .filter((row) => row.hasAttribute('data-pct-active'))
        .map((row) => row.textContent?.trim());
    expect(marked(column(f, 'hour'))).toEqual(['13']);
    // The value is off the step: no minute row is the value's, and the walk stands on `00`.
    expect(marked(column(f, 'minute'))).toEqual(['00']);
    expect(
      rowsOf(column(f, 'minute')).filter((row) =>
        row.hasAttribute('data-pct-chosen'),
      ),
    ).toHaveLength(0);
  });

  it('points every column at the row of the value, and marks it chosen', async () => {
    const f = await render((h) => h.locale.set('en-US'));
    expect(active(column(f, 'hour'))).toBe('1');
    expect(active(column(f, 'minute'))).toBe('05');
    expect(active(column(f, 'dayPeriod'))).toBe('PM');
    expect(chosen(column(f, 'hour'))).toEqual(['1']);
    expect(chosen(column(f, 'minute'))).toEqual(['05']);
    expect(chosen(column(f, 'dayPeriod'))).toEqual(['PM']);
    // Every other row says it is not selected — `false`, not absent.
    expect(
      rowsOf(column(f, 'minute')).filter(
        (row) => row.getAttribute('aria-selected') === 'false',
      ),
    ).toHaveLength(59);
  });

  it('marks nothing chosen with no value, and still has a row to start from', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 8, 14, 22, 37));
    try {
      const f = await render((h) => h.value.set(null));
      expect(chosen(column(f, 'hour'))).toEqual([]);
      expect(chosen(column(f, 'minute'))).toEqual([]);
      // Now, as a wall clock shows it: 14:22 until it ticks, never rounded up to 14:23.
      expect(active(column(f, 'hour'))).toBe('14');
      expect(active(column(f, 'minute'))).toBe('22');
    } finally {
      vi.useRealTimers();
    }
  });

  it('marks the row of a value that is not a time as nothing at all', async () => {
    const f = await render();
    // What `[(ngModel)]` writes first, and what no type here refuses (`lesson-117`).
    f.componentInstance.value.set('half past one' as PctTimeOfDay);
    await settle(f);
    expect(chosen(column(f, 'hour'))).toEqual([]);
  });
});

describe('PctTimeColumns — the walk', () => {
  it('moves the value with the row: a column is a field', async () => {
    const f = await render();
    await press(f, column(f, 'minute'), 'ArrowDown');
    expect(f.componentInstance.value()).toBe('13:06');
    expect(active(column(f, 'minute'))).toBe('06');
    await press(f, column(f, 'hour'), 'ArrowUp');
    expect(f.componentInstance.value()).toBe('12:06');
    // A movement is not a pick: nothing closes on it.
    expect(f.componentInstance.picked).toEqual([]);
  });

  it('comes round at the end and leaves the hour where it was (0086 §4)', async () => {
    const f = await render((h) => h.value.set('13:59'));
    const down = await press(f, column(f, 'minute'), 'ArrowDown');
    expect(f.componentInstance.value()).toBe('13:00');
    expect(down.defaultPrevented).toBe(true);
    await press(f, column(f, 'minute'), 'ArrowUp');
    expect(f.componentInstance.value()).toBe('13:59');
    f.componentInstance.value.set('23:30');
    await settle(f);
    await press(f, column(f, 'hour'), 'ArrowDown');
    expect(f.componentInstance.value()).toBe('00:30');
  });

  it('goes to the first and the last row with Home and End', async () => {
    const f = await render();
    await press(f, column(f, 'minute'), 'End');
    expect(f.componentInstance.value()).toBe('13:59');
    await press(f, column(f, 'minute'), 'Home');
    expect(f.componentInstance.value()).toBe('13:00');
  });

  it('reads typed digits as a number, the way a person types one', async () => {
    const f = await render();
    await press(f, column(f, 'minute'), '4');
    expect(f.componentInstance.value()).toBe('13:04');
    await press(f, column(f, 'minute'), '5');
    expect(f.componentInstance.value()).toBe('13:45');
  });

  it('reaches every hour of a twelve-hour clock by typing it', async () => {
    const f = await render((h) => {
      h.locale.set('en-US');
      h.value.set('15:05');
    });
    // Rows `12, 1, 2 … 11`: a prefix would take `1` to twelve and never reach one.
    await press(f, column(f, 'hour'), '1');
    expect(f.componentInstance.value()).toBe('13:05');
    await press(f, column(f, 'hour'), '2');
    expect(f.componentInstance.value()).toBe('12:05');
  });

  it('answers a digit the padded rows do not begin with', async () => {
    const f = await render();
    await press(f, column(f, 'hour'), '9');
    expect(f.componentInstance.value()).toBe('09:05');
  });

  it('falls back to the start of a row where no row writes the number', async () => {
    const f = await render((h) => {
      h.step.set(900);
      h.value.set('13:15');
    });
    await press(f, column(f, 'minute'), '4');
    expect(f.componentInstance.value()).toBe('13:45');
  });

  it('starts a new number once the typed digits have gone quiet', async () => {
    const timers = vi.spyOn(globalThis, 'setTimeout');
    try {
      const f = await render();
      await press(f, column(f, 'hour'), '1');
      expect(f.componentInstance.value()).toBe('01:05');
      // The half second the typeahead waits, run now rather than waited for: what it clears is
      // the number being typed, so the next digit is a number of its own.
      const quiet = timers.mock.calls.filter((call) => call[1] === 500).at(-1);
      (quiet?.[0] as () => void)();
      await press(f, column(f, 'hour'), '3');
      expect(f.componentInstance.value()).toBe('03:05');
    } finally {
      timers.mockRestore();
    }
  });

  it('reads two keys that arrive before a render from where the first one left', async () => {
    // A busy page queues input ahead of change detection: the second key must start from the
    // row the first one wrote, not from the row the last render drew.
    const f = await render((h) => h.value.set('09:05'));
    const hour = column(f, 'hour');
    const send = (key: string) =>
      hour.dispatchEvent(
        new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }),
      );
    send('1');
    send('3');
    await settle(f);
    expect(f.componentInstance.value()).toBe('13:05');
    send('ArrowDown');
    send('ArrowDown');
    await settle(f);
    expect(f.componentInstance.value()).toBe('15:05');
  });

  it('keeps the number being typed across a modifier — AZERTY reaches digits through Shift', async () => {
    const f = await render();
    await press(f, column(f, 'hour'), '1');
    await press(f, column(f, 'hour'), 'Shift');
    await press(f, column(f, 'hour'), '3', { shiftKey: true });
    expect(f.componentInstance.value()).toBe('13:05');
  });

  it('reads a word typed letter by letter, and keeps every letter it answers', async () => {
    const f = await render((h) => {
      h.locale.set('en-US');
      h.value.set('09:05');
    });
    const p = await press(f, column(f, 'dayPeriod'), 'p');
    expect(f.componentInstance.value()).toBe('21:05');
    const m = await press(f, column(f, 'dayPeriod'), 'm');
    expect(f.componentInstance.value()).toBe('21:05');
    expect(p.defaultPrevented).toBe(true);
    expect(m.defaultPrevented).toBe(true);
  });

  it('drops a run that named nothing, and starts afresh from the next key', async () => {
    const stray = await render();
    await press(stray, column(stray, 'hour'), 'x');
    await press(stray, column(stray, 'hour'), '9');
    expect(stray.componentInstance.value()).toBe('09:05');
    // A run started afresh names a row again, so a key that takes it past every row keeps it.
    const again = await render();
    for (const key of ['x', '2', '5'])
      await press(again, column(again, 'hour'), key);
    expect(again.componentInstance.value()).toBe('02:05');

    const quarter = await render((h) => {
      h.step.set(900);
      h.value.set('13:15');
    });
    // `7` begins no quarter; the `4` after it is read on its own.
    await press(quarter, column(quarter, 'minute'), '7');
    expect(quarter.componentInstance.value()).toBe('13:15');
    await press(quarter, column(quarter, 'minute'), '4');
    expect(quarter.componentInstance.value()).toBe('13:45');
  });

  it('stays put on a number the column cannot hold, rather than jumping to its last digit', async () => {
    const hours = await render();
    await press(hours, column(hours, 'hour'), '2');
    expect(hours.componentInstance.value()).toBe('02:05');
    const past = await press(hours, column(hours, 'hour'), '5');
    expect(hours.componentInstance.value()).toBe('02:05');
    expect(past.defaultPrevented).toBe(false);

    const quarter = await render((h) => {
      h.step.set(900);
      h.value.set('13:15');
    });
    await press(quarter, column(quarter, 'minute'), '3');
    await press(quarter, column(quarter, 'minute'), '4');
    expect(quarter.componentInstance.value()).toBe('13:30');

    // Thirteen is no row of a twelve-hour column: one o'clock stays one o'clock.
    const twelve = await render((h) => {
      h.locale.set('en-US');
      h.value.set('15:05');
    });
    await press(twelve, column(twelve, 'hour'), '1');
    await press(twelve, column(twelve, 'hour'), '3');
    expect(twelve.componentInstance.value()).toBe('13:05');
  });

  it('ends the number being typed on any key that is neither printable nor a modifier', async () => {
    const f = await render();
    await press(f, column(f, 'hour'), '1');
    await press(f, column(f, 'hour'), 'ArrowDown');
    expect(f.componentInstance.value()).toBe('02:05');
    await press(f, column(f, 'hour'), '3');
    expect(f.componentInstance.value()).toBe('03:05');
  });

  it('keeps a digit it answers with the row it stands on', async () => {
    const f = await render((h) => {
      h.step.set(900);
      h.value.set('13:15');
    });
    const same = await press(f, column(f, 'minute'), '1');
    expect(same.defaultPrevented).toBe(true);
    expect(f.componentInstance.value()).toBe('13:15');
  });

  it('lets go of the number being typed when the column goes', async () => {
    const timers = vi.spyOn(globalThis, 'setTimeout');
    const cleared = vi.spyOn(globalThis, 'clearTimeout');
    try {
      const f = await render();
      await press(f, column(f, 'hour'), '1');
      const first = timers.mock.results
        .filter((_, i) => timers.mock.calls[i][1] === 500)
        .at(-1)?.value;
      await press(f, column(f, 'hour'), '3');
      // The second digit restarts the half second rather than racing the first one's.
      expect(cleared).toHaveBeenCalledWith(first);
      const second = timers.mock.results
        .filter((_, i) => timers.mock.calls[i][1] === 500)
        .at(-1)?.value;
      f.destroy();
      expect(cleared).toHaveBeenCalledWith(second);
    } finally {
      timers.mockRestore();
      cleared.mockRestore();
    }
  });

  it('keeps one column’s digits out of the next column', async () => {
    const f = await render();
    await press(f, column(f, 'hour'), '1');
    expect(f.componentInstance.value()).toBe('01:05');
    await press(f, column(f, 'minute'), '3');
    // Three, not thirteen: the `1` was the hour's.
    expect(f.componentInstance.value()).toBe('01:03');
  });

  it('never types its way onto a row the bounds refuse', async () => {
    const f = await render((h) => h.max.set('15:00'));
    const list = column(f, 'hour');
    await press(f, list, '1');
    expect(f.componentInstance.value()).toBe('01:05');
    const refused = await press(f, list, '6');
    expect(f.componentInstance.value()).toBe('01:05');
    expect(refused.defaultPrevented).toBe(false);
  });

  it('writes nothing for a key that matches no row — a miss is not an instruction', async () => {
    const off = await render((h) => {
      h.step.set(900);
      h.value.set('13:05');
    });
    const miss = await press(off, column(off, 'minute'), 'x');
    expect(off.componentInstance.value()).toBe('13:05');
    expect(miss.defaultPrevented).toBe(false);
    await press(off, column(off, 'minute'), '7');
    expect(off.componentInstance.value()).toBe('13:05');

    const empty = await render((h) => h.value.set(null));
    await press(empty, column(empty, 'minute'), 'x');
    expect(empty.componentInstance.value()).toBeNull();

    const refused = await render((h) => {
      h.max.set('17:00');
      h.value.set('18:30');
    });
    await press(refused, column(refused, 'hour'), 'x');
    expect(refused.componentInstance.value()).toBe('18:30');
  });

  it('writes nothing for an arrow at a row with nowhere else to go', async () => {
    const f = await render((h) => {
      h.min.set('13:05');
      h.max.set('13:05');
      h.value.set(null);
    });
    const down = await press(f, column(f, 'hour'), 'ArrowDown');
    expect(f.componentInstance.value()).toBeNull();
    // The key is still the column's — a listbox's arrows are not the page's to scroll with.
    expect(down.defaultPrevented).toBe(true);
  });

  it('jumps to a day period by its first letter', async () => {
    const f = await render((h) => h.locale.set('en-US'));
    await press(f, column(f, 'dayPeriod'), 'a');
    expect(f.componentInstance.value()).toBe('01:05');
  });

  it('leaves a modified key, and a key it has no use for, to whoever owns it', async () => {
    const f = await render();
    const list = column(f, 'minute');
    for (const [key, init] of [
      ['4', { ctrlKey: true }],
      ['4', { metaKey: true }],
      ['4', { altKey: true }],
      ['Tab', {}],
      ['ArrowLeft', {}],
    ] as const) {
      const event = await press(f, list, key, init);
      expect(event.defaultPrevented).toBe(false);
    }
    expect(f.componentInstance.value()).toBe('13:05');
  });

  it('switches the half of the day and keeps the hour of it', async () => {
    const f = await render((h) => h.locale.set('en-US'));
    await press(f, column(f, 'dayPeriod'), 'ArrowUp');
    expect(f.componentInstance.value()).toBe('01:05');
    await press(f, column(f, 'dayPeriod'), 'ArrowDown');
    expect(f.componentInstance.value()).toBe('13:05');
  });

  it('walks the hours of the half it stands in on a twelve-hour clock', async () => {
    const f = await render((h) => {
      h.locale.set('en-US');
      h.value.set('23:05');
    });
    expect(active(column(f, 'hour'))).toBe('11');
    await press(f, column(f, 'hour'), 'ArrowDown');
    // From 11 PM the next row is 12, the first hour of the column — and of the same half.
    expect(f.componentInstance.value()).toBe('12:05');
    await press(f, column(f, 'hour'), 'ArrowDown');
    expect(f.componentInstance.value()).toBe('13:05');
  });

  it('starts from the step now is IN, never the next one', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 8, 14, 23, 0));
    try {
      const quarter = await render((h) => {
        h.value.set(null);
        h.step.set(900);
      });
      // 14:23 is nearer 14:30 and stands in the quarter that began at 14:15.
      expect(active(column(quarter, 'minute'))).toBe('15');
      // Before `min`, no time on the step is at or before now: the walk starts at `min`.
      const early = await render((h) => {
        h.value.set(null);
        h.min.set('15:00');
      });
      expect(active(column(early, 'hour'))).toBe('15');
      expect(active(column(early, 'minute'))).toBe('00');
    } finally {
      vi.useRealTimers();
    }
  });

  it('reads now to the second where the step counts seconds', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 8, 14, 22, 40));
    try {
      const f = await render((h) => {
        h.value.set(null);
        h.step.set(30);
      });
      expect(active(column(f, 'second'))).toBe('30');
    } finally {
      vi.useRealTimers();
    }
  });

  it('starts a walk from now when there is no value, and the first move writes one', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 8, 14, 22, 0));
    try {
      const f = await render((h) => h.value.set(null));
      await press(f, column(f, 'minute'), 'ArrowDown');
      expect(f.componentInstance.value()).toBe('14:23');
    } finally {
      vi.useRealTimers();
    }
  });

  it('walks a value off the step from where the step stands nearest', async () => {
    const f = await render((h) => {
      h.step.set(900);
      h.value.set('13:05');
    });
    // 13:05 is no quarter, so no minute row is the value's — and the walk starts at 13:00.
    expect(chosen(column(f, 'minute'))).toEqual([]);
    expect(active(column(f, 'minute'))).toBe('00');
    await press(f, column(f, 'minute'), 'ArrowDown');
    expect(f.componentInstance.value()).toBe('13:15');
  });

  it('writes seconds into the value where the step has them', async () => {
    const f = await render((h) => {
      h.step.set(30);
      h.value.set('13:05');
    });
    expect(chosen(column(f, 'second'))).toEqual(['00']);
    await press(f, column(f, 'second'), 'ArrowDown');
    expect(f.componentInstance.value()).toBe('13:05:30');
    await press(f, column(f, 'minute'), 'ArrowDown');
    expect(f.componentInstance.value()).toBe('13:06:30');
  });
});

describe('PctTimeColumns — the bounds', () => {
  it('disables the rows no time inside the bounds has, and keeps drawing them', async () => {
    const f = await render((h) => {
      h.min.set('09:30');
      h.max.set('17:00');
      h.value.set('09:45');
    });
    expect(labels(column(f, 'hour'))).toHaveLength(24);
    expect(enabled(column(f, 'hour'))).toEqual([
      '09',
      '10',
      '11',
      '12',
      '13',
      '14',
      '15',
      '16',
      '17',
    ]);
    // The minutes follow the hour the value stands in: nothing before half past nine.
    expect(enabled(column(f, 'minute'))[0]).toBe('30');
    expect(enabled(column(f, 'minute'))).toHaveLength(30);
    const refused = rowsOf(column(f, 'hour'))[8];
    expect(refused.getAttribute('aria-disabled')).toBe('true');
    expect(refused.hasAttribute('data-pct-disabled')).toBe(true);
  });

  it('skips a refused row, and comes round past the refused ones at the end', async () => {
    const f = await render((h) => {
      h.min.set('09:00');
      h.max.set('17:00');
      h.value.set('17:00');
    });
    await press(f, column(f, 'hour'), 'ArrowDown');
    expect(f.componentInstance.value()).toBe('09:00');
    await press(f, column(f, 'hour'), 'ArrowUp');
    expect(f.componentInstance.value()).toBe('17:00');
  });

  it('takes the other columns to meet a bound the moved one runs into', async () => {
    const f = await render((h) => {
      h.min.set('09:30');
      h.value.set('10:15');
    });
    await press(f, column(f, 'hour'), 'ArrowUp');
    expect(f.componentInstance.value()).toBe('09:30');
  });

  it('lands on the step under a max that is not on it', async () => {
    const f = await render((h) => {
      h.step.set(900);
      h.max.set('17:50');
      h.value.set('16:50');
    });
    // 16:50 is off the step: the walk starts at 16:45. A step up the hour aims at 17:45.
    await press(f, column(f, 'hour'), 'ArrowDown');
    expect(f.componentInstance.value()).toBe('17:45');
  });

  it('reads min later than max as the night between them', async () => {
    const f = await render((h) => {
      h.min.set('22:00');
      h.max.set('06:00');
      h.value.set('23:00');
    });
    expect(enabled(column(f, 'hour'))).toEqual([
      '00',
      '01',
      '02',
      '03',
      '04',
      '05',
      '06',
      '22',
      '23',
    ]);
    await press(f, column(f, 'hour'), 'ArrowDown');
    expect(f.componentInstance.value()).toBe('00:00');
    f.componentInstance.value.set('06:00');
    await settle(f);
    await press(f, column(f, 'hour'), 'ArrowDown');
    expect(f.componentInstance.value()).toBe('22:00');
  });

  it('refuses the half of the day the bounds leave nothing in', async () => {
    const f = await render((h) => {
      h.locale.set('en-US');
      h.min.set('13:00');
      h.max.set('18:00');
      h.value.set('14:00');
    });
    expect(enabled(column(f, 'dayPeriod'))).toEqual(['PM']);
    await press(f, column(f, 'dayPeriod'), 'ArrowUp');
    expect(f.componentInstance.value()).toBe('14:00');
  });

  it('marks no row of an hour a refused value is not in', async () => {
    const f = await render((h) => {
      h.max.set('17:00');
      h.value.set('18:30');
    });
    // The walk starts at 17:00; the value is 18:30, so no minute of 17 is the value's.
    expect(active(column(f, 'hour'))).toBe('17');
    expect(chosen(column(f, 'hour'))).toEqual(['18']);
    expect(chosen(column(f, 'minute'))).toEqual([]);
  });
});

describe('PctTimeColumns — the predicate (0090 §5)', () => {
  /** Booked: 10:00 to 10:59 whole, and the quarter past eleven. */
  const booked: PctTimePredicate = (time) =>
    time.startsWith('10:') || time === '11:15';

  it('asks every time on the step once, in the value’s shape, and draws a refused one disabled', async () => {
    const asked: string[] = [];
    const f = await render((h) => {
      h.step.set(900);
      h.value.set('11:00');
      h.timeDisabled.set((time) => {
        asked.push(time);
        return booked(time);
      });
    });
    // 96 quarter hours, each asked once, in `HH:mm` — the shape a minute step writes.
    expect(asked).toHaveLength(96);
    expect(new Set(asked).size).toBe(96);
    expect(asked[0]).toBe('00:00');
    expect(asked).toContain('23:45');
    expect(labels(column(f, 'minute'))).toEqual(['00', '15', '30', '45']);
    expect(enabled(column(f, 'minute'))).toEqual(['00', '30', '45']);
    const refused = rowsOf(column(f, 'minute'))[1];
    expect(refused.getAttribute('aria-disabled')).toBe('true');
  });

  it('asks in the seconds shape where the step has seconds', async () => {
    const asked: string[] = [];
    await render((h) => {
      h.step.set(1800);
      h.min.set('00:00:30');
      h.timeDisabled.set((time) => {
        asked.push(time);
        return false;
      });
    });
    expect(asked).toHaveLength(48);
    expect(asked[0]).toBe('00:00:30');
  });

  it('refuses an hour every time of which is refused, and only that one', async () => {
    const f = await render((h) => {
      h.value.set('11:00');
      h.timeDisabled.set(booked);
    });
    const hours = enabled(column(f, 'hour'));
    expect(hours).toHaveLength(23);
    expect(hours).not.toContain('10');
    expect(hours).toContain('11');
  });

  it('refuses a half of the day every time of which is refused', async () => {
    const f = await render((h) => {
      h.locale.set('en-US');
      h.value.set('14:00');
      h.timeDisabled.set((time) => Number(time.slice(0, 2)) < 12);
    });
    expect(enabled(column(f, 'dayPeriod'))).toEqual(['PM']);
    await press(f, column(f, 'dayPeriod'), 'ArrowUp');
    expect(f.componentInstance.value()).toBe('14:00');
  });

  it('walks past a refused hour, and lands a move on the nearest time it lets through', async () => {
    const f = await render((h) => {
      h.value.set('09:20');
      h.timeDisabled.set(booked);
    });
    await press(f, column(f, 'hour'), 'ArrowDown');
    expect(f.componentInstance.value()).toBe('11:20');
    // Onto 11:15, refused: the minute walk steps over it, both ways.
    f.componentInstance.value.set('11:14');
    await settle(f);
    await press(f, column(f, 'minute'), 'ArrowDown');
    expect(f.componentInstance.value()).toBe('11:16');
    await press(f, column(f, 'minute'), 'ArrowUp');
    expect(f.componentInstance.value()).toBe('11:14');
  });

  it('keeps a refused value, and starts the walk from the nearest time it lets through', async () => {
    const f = await render((h) => {
      h.step.set(900);
      h.value.set('11:15');
      h.timeDisabled.set(booked);
    });
    expect(f.componentInstance.value()).toBe('11:15');
    // Halfway between 11:00 and 11:30 goes to the later of the two.
    expect(active(column(f, 'minute'))).toBe('30');
    expect(chosen(column(f, 'minute'))).toEqual(['15']);
  });

  it('starts from the time now is in, stepping back past a refused one', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 5, 11, 20));
    try {
      const f = await render((h) => {
        h.step.set(900);
        h.value.set(null);
        h.timeDisabled.set(booked);
      });
      // Now is 11:20, IN the quarter of 11:15, which is booked: the walk stands on 11:00.
      expect(active(column(f, 'hour'))).toBe('11');
      expect(active(column(f, 'minute'))).toBe('00');
    } finally {
      vi.useRealTimers();
    }
  });

  it('takes nothing where it refuses every time, and stands where the bounds alone would', async () => {
    const f = await render((h) => {
      h.min.set('09:00');
      h.value.set('08:00');
      h.timeDisabled.set(() => true);
    });
    expect(enabled(column(f, 'hour'))).toEqual([]);
    expect(enabled(column(f, 'minute'))).toEqual([]);
    expect(active(column(f, 'hour'))).toBe('09');
    await press(f, column(f, 'hour'), 'Enter');
    await press(f, column(f, 'hour'), 'ArrowDown');
    expect(f.componentInstance.picked).toEqual([]);
    expect(f.componentInstance.value()).toBe('08:00');
  });

  it('is whole again when the predicate goes', async () => {
    const f = await render((h) => {
      h.value.set('11:00');
      h.timeDisabled.set(booked);
    });
    expect(enabled(column(f, 'hour'))).toHaveLength(23);
    f.componentInstance.timeDisabled.set(null);
    await settle(f);
    expect(enabled(column(f, 'hour'))).toHaveLength(24);
  });
});

describe('PctTimeColumns — taking a time', () => {
  it('takes the time with Enter and Space, and says it was picked', async () => {
    const f = await render();
    const enter = await press(f, column(f, 'minute'), 'Enter');
    expect(enter.defaultPrevented).toBe(true);
    expect(f.componentInstance.picked).toEqual(['13:05']);
    await press(f, column(f, 'minute'), ' ');
    expect(f.componentInstance.picked).toEqual(['13:05', '13:05']);
  });

  it('takes the time the walk stands on, in the field’s shape, when there is no value', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 8, 14, 22, 0));
    try {
      const f = await render((h) => {
        h.value.set(null);
        h.step.set(30);
      });
      await press(f, column(f, 'hour'), 'Enter');
      expect(f.componentInstance.value()).toBe('14:22:00');
      expect(f.componentInstance.picked).toEqual(['14:22:00']);
    } finally {
      vi.useRealTimers();
    }
  });

  it('moves the value on a press, and does not say it was picked', async () => {
    const f = await render();
    rowsOf(column(f, 'minute'))[30].click();
    await settle(f);
    expect(f.componentInstance.value()).toBe('13:30');
    expect(f.componentInstance.picked).toEqual([]);
  });

  it('ignores a press on a refused row', async () => {
    const f = await render((h) => h.max.set('15:00'));
    rowsOf(column(f, 'hour'))[16].click();
    await settle(f);
    expect(f.componentInstance.value()).toBe('13:05');
  });

  it('freezes when disabled: no walk, no press, no pick — and says so', async () => {
    const f = await render((h) => h.disabled.set(true));
    const host = f.nativeElement.querySelector(
      'pct-time-columns',
    ) as HTMLElement;
    expect(host.hasAttribute('data-pct-disabled')).toBe(true);
    for (const list of columnsOf(f))
      expect(list.getAttribute('aria-disabled')).toBe('true');
    const down = await press(f, column(f, 'minute'), 'ArrowDown');
    expect(down.defaultPrevented).toBe(false);
    await press(f, column(f, 'minute'), 'Enter');
    rowsOf(column(f, 'minute'))[30].click();
    await settle(f);
    expect(f.componentInstance.value()).toBe('13:05');
    expect(f.componentInstance.picked).toEqual([]);
  });
});

describe('PctTimeColumns — focus', () => {
  it('hands the focus to the hour column, wherever the language puts it', async () => {
    const f = TestBed.createComponent(PctTimeColumns);
    f.componentRef.setInput('locale', 'ko-KR');
    document.body.append(f.nativeElement);
    f.detectChanges();
    await f.whenStable();
    f.componentInstance.focusCursor();
    expect(document.activeElement?.getAttribute('data-pct-field')).toBe('hour');
    f.nativeElement.remove();
  });

  it('focuses nothing while there is no column drawn yet', () => {
    const f = TestBed.createComponent(PctTimeColumns);
    expect(() => f.componentInstance.focusCursor()).not.toThrow();
  });
});

describe('PctTimeColumns — the list in view', () => {
  let screen: ReturnType<typeof layout>;

  beforeEach(() => {
    screen = layout();
  });
  afterEach(() => {
    screen.restore();
  });

  it('shows seven rows at every size, and says which shape it is drawn in', async () => {
    const f = await render();
    expect(hostOf(f).style.getPropertyValue('--_pct-time-rows')).toBe('7');
    expect(hostOf(f).getAttribute('data-pct-picker')).toBe('list');
  });

  it('shows seven rows where nobody says how many', async () => {
    @Component({
      imports: [PctTimeColumns],
      template: `<pct-time-columns ariaLabel="Alarm" />`,
    })
    class Bare {}
    const f = TestBed.createComponent(Bare);
    f.detectChanges();
    await f.whenStable();
    expect(hostOf(f).style.getPropertyValue('--_pct-time-rows')).toBe('7');
  });

  it('shows the count of rows it is given: an odd one, an even one taking the next odd', async () => {
    const f = await render((h) => h.rows.set(5));
    const shown = async (rows: unknown) => {
      f.componentInstance.rows.set(rows);
      f.detectChanges();
      await f.whenStable();
      return hostOf(f).style.getPropertyValue('--_pct-time-rows');
    };
    expect(hostOf(f).style.getPropertyValue('--_pct-time-rows')).toBe('5');
    expect(await shown('9')).toBe('9');
    expect(await shown(4)).toBe('5');
    expect(await shown(2.9)).toBe('3');
    expect(await shown(1)).toBe('1');
    // No count: nothing, a word, none and fewer than none.
    expect(await shown(undefined)).toBe('7');
    expect(await shown('many')).toBe('7');
    expect(await shown(0)).toBe('7');
    expect(await shown(-3)).toBe('7');
  });

  it('opens with the walk’s row in the middle of its window, placed at once', async () => {
    const f = await render();
    // Three rows above the middle one: 13 stands with 10 at the top, 05 with 02.
    expect(column(f, 'hour').scrollTop).toBe(10 * ROW);
    expect(column(f, 'minute').scrollTop).toBe(2 * ROW);
    expect(screen.calls).toEqual([]);
  });

  it('stands a row near an end as near the middle as the list lets it', async () => {
    const f = await render((h) => h.value.set('01:59'));
    expect(column(f, 'hour').scrollTop).toBe(0);
    // Sixty rows and a window of seven: the last place the list can be at.
    expect(column(f, 'minute').scrollTop).toBe(53 * ROW);
  });

  it('travels the row a walk lands on to the middle, as the motion axis says', async () => {
    const f = await render();
    const hour = column(f, 'hour');

    // No duration on the axis here: the travel is a placement.
    await press(f, hour, 'ArrowDown');
    expect(screen.calls).toEqual([
      { list: hour, top: 11 * ROW, behavior: 'instant' },
    ]);

    await moving(async () => {
      await press(f, hour, 'ArrowUp');
      expect(screen.calls[1]).toEqual({
        list: hour,
        top: 10 * ROW,
        behavior: 'smooth',
      });
      expect(window.getComputedStyle).toHaveBeenCalledWith(hour);
    });
    // The column nobody moved was where it should be, and is not sent there again.
    expect(screen.calls).toHaveLength(2);
  });

  it('does not send a list to a place it cannot be at', async () => {
    const top = await render((h) => h.value.set('01:05'));
    await press(top, column(top, 'hour'), 'ArrowDown');
    expect(top.componentInstance.value()).toBe('02:05');
    expect(screen.calls).toEqual([]);

    const end = await render((h) => h.value.set('21:05'));
    await press(end, column(end, 'hour'), 'ArrowDown');
    expect(end.componentInstance.value()).toBe('22:05');
    expect(screen.calls).toEqual([]);
    expect(column(end, 'hour').scrollTop).toBe(17 * ROW);
  });

  it('leaves a list that rests within a pixel of its place, and sends one that is a pixel off', async () => {
    const f = await render();
    const hour = column(f, 'hour');
    const minute = column(f, 'minute');

    hour.scrollTop = 10 * ROW + 0.5;
    await press(f, minute, 'ArrowDown');
    expect(screen.calls.filter((call) => call.list === hour)).toEqual([]);

    hour.scrollTop = 10 * ROW + 1;
    await press(f, minute, 'ArrowDown');
    expect(screen.calls.filter((call) => call.list === hour)).toEqual([
      { list: hour, top: 10 * ROW, behavior: 'instant' },
    ]);

    hour.scrollTop = 10 * ROW - 1;
    await press(f, minute, 'ArrowDown');
    expect(screen.calls.filter((call) => call.list === hour)).toHaveLength(2);
  });

  it('places the lists afresh when the shape comes back to them', async () => {
    const f = await render();
    f.componentInstance.picker.set('wheel');
    await settle(f);
    expect(columnsOf(f)).toEqual([]);

    f.componentInstance.picker.set('list');
    await settle(f);
    expect(column(f, 'hour').scrollTop).toBe(10 * ROW);
    expect(
      screen.calls.filter((call) =>
        call.list.matches('[data-pct-part="column"]'),
      ),
    ).toEqual([]);
  });
});

describe('PctTimeColumns — the wheel shape', () => {
  const asWheels = (setup: (host: Host) => void = () => undefined) =>
    render((h) => {
      h.picker.set('wheel');
      setup(h);
    });

  /** What a listener above the columns hears of the keys pressed in them. */
  function overhear(f: ComponentFixture<unknown>): string[] {
    const heard: string[] = [];
    (f.nativeElement as HTMLElement).addEventListener('keydown', (event) =>
      heard.push(event.key),
    );
    return heard;
  }

  describe('the wheels there are', () => {
    it('is lists until it is asked for wheels', () => {
      const f = TestBed.createComponent(PctTimeColumns);
      expect(f.componentInstance.picker()).toBe('list');
    });

    it('draws a wheel for every column, in the columns’ order, and no list', async () => {
      const f = await asWheels((h) => h.locale.set('en-US'));

      expect(hostOf(f).getAttribute('data-pct-picker')).toBe('wheel');
      expect(columnsOf(f)).toEqual([]);
      expect(wheelsOf(f).map((host) => host.dataset['pctField'])).toEqual([
        'hour',
        'minute',
        'dayPeriod',
      ]);
      for (const host of wheelsOf(f)) {
        expect(host.classList.contains('pct-time-columns__wheel')).toBe(true);
        expect(host.style.getPropertyValue('--_pct-wheel-rows')).toBe('7');
        expect(host.getAttribute('data-pct-size')).toBe('md');
      }
    });

    it('names every wheel as the list is named, and gives it no label of its own', async () => {
      const f = await asWheels((h) => h.locale.set('en-US'));
      const lists = ['hour', 'minute', 'dayPeriod'].map((field) =>
        wheel(f, field),
      );

      expect(lists.map((list) => list.getAttribute('aria-label'))).toEqual([
        'Hours',
        'Minutes',
        'AM/PM',
      ]);
      for (const list of lists) {
        expect(list.getAttribute('role')).toBe('listbox');
        expect(list.getAttribute('tabindex')).toBe('0');
        expect(list.hasAttribute('aria-labelledby')).toBe(false);
      }
      expect(
        f.nativeElement.querySelector('pct-wheel [data-pct-part="label"]'),
      ).toBeNull();
    });

    it('carries its size to the wheels', async () => {
      const f = TestBed.createComponent(PctTimeColumns);
      f.componentRef.setInput('picker', 'wheel');
      f.componentRef.setInput('locale', 'en-GB');
      f.componentRef.setInput('size', 'lg');
      f.detectChanges();
      await f.whenStable();
      expect(
        wheelsOf(f).map((host) => host.getAttribute('data-pct-size')),
      ).toEqual(['lg', 'lg']);
    });

    it('turns the rows of the column, the refused ones drawn and disabled', async () => {
      const f = await asWheels((h) => {
        h.min.set('09:00');
        h.max.set('17:30');
      });
      const hours = turn(wheel(f, 'hour'));

      expect(turnLabels(wheel(f, 'hour'))).toHaveLength(24);
      expect(turnLabels(wheel(f, 'hour'))[9]).toBe('09');
      expect(
        hours
          .filter((row) => row.getAttribute('aria-disabled') !== 'true')
          .map((row) => row.textContent?.trim()),
      ).toEqual(['09', '10', '11', '12', '13', '14', '15', '16', '17']);
    });

    it('is a ring where a column fills its window, and a list where it does not', async () => {
      const f = await asWheels((h) => {
        h.locale.set('en-US');
        h.step.set(600);
      });
      // Twelve hours: the cycle three times in the tree, one turn of it a reader’s.
      expect(rowsOf(wheel(f, 'hour'))).toHaveLength(36);
      expect(turn(wheel(f, 'hour'))).toHaveLength(12);
      // Six minutes and two halves of a day: a ring of them would show a row twice.
      expect(rowsOf(wheel(f, 'minute'))).toHaveLength(6);
      expect(rowsOf(wheel(f, 'dayPeriod'))).toHaveLength(2);

      // Eight hours on a three-hour step: one row more than the window.
      const eight = await asWheels((h) => h.step.set(10800));
      expect(turn(wheel(eight, 'hour'))).toHaveLength(8);
      expect(rowsOf(wheel(eight, 'hour'))).toHaveLength(24);
    });

    it('hands the wheels the count of rows it is given, and a ring is counted against it', async () => {
      const f = await asWheels((h) => {
        h.locale.set('en-US');
        h.step.set(600);
        h.rows.set(5);
      });
      const shown = (field: string) =>
        (
          wheel(f, field).closest('pct-wheel') as HTMLElement
        ).style.getPropertyValue('--_pct-wheel-rows');
      expect(shown('hour')).toBe('5');
      expect(shown('minute')).toBe('5');
      // Six minutes fill a window of five and not one of seven; two halves of a day fill neither.
      expect(rowsOf(wheel(f, 'minute'))).toHaveLength(18);
      expect(rowsOf(wheel(f, 'dayPeriod'))).toHaveLength(2);

      // A window as long as the column is a ring still; one row longer is not.
      f.componentInstance.rows.set(6);
      f.detectChanges();
      await f.whenStable();
      expect(shown('minute')).toBe('7');
      expect(rowsOf(wheel(f, 'minute'))).toHaveLength(6);
      expect(rowsOf(wheel(f, 'hour'))).toHaveLength(36);
    });

    it('is no field’s control inside a field: the chrome names nothing here', async () => {
      @Component({
        imports: [PctField, PctTimeColumns],
        template: `<pct-field label="Meeting" hint="Any time">
          <pct-time-columns picker="wheel" />
        </pct-field>`,
      })
      class InField {}
      const warn = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => undefined);
      try {
        const f = TestBed.createComponent(InField);
        f.detectChanges();
        await f.whenStable();

        // Every wheel, the last one too — the one a chrome would describe.
        const lists = wheelsOf(f).map(
          (host) => host.querySelector('[data-pct-part="list"]') as HTMLElement,
        );
        expect(lists.length).toBeGreaterThan(1);
        for (const list of lists) {
          expect(list.hasAttribute('aria-labelledby')).toBe(false);
          expect(list.hasAttribute('aria-describedby')).toBe(false);
        }
        expect(wheel(f, 'hour').getAttribute('aria-label')).toBe('Hours');
        // And the chrome was not told of two controls.
        expect(warn).not.toHaveBeenCalled();
      } finally {
        warn.mockRestore();
      }
    });
  });

  describe('the line and the value', () => {
    it('holds the row of the value under every line, chosen', async () => {
      const f = await asWheels();
      expect(active(wheel(f, 'hour'))).toBe('13');
      expect(chosen(wheel(f, 'hour'))).toEqual(['13']);
      expect(active(wheel(f, 'minute'))).toBe('05');
      expect(chosen(wheel(f, 'minute'))).toEqual(['05']);

      f.componentInstance.value.set('07:40');
      await settle(f);
      expect(chosen(wheel(f, 'hour'))).toEqual(['07']);
      expect(chosen(wheel(f, 'minute'))).toEqual(['40']);
    });

    it('with no value holds the rows of now, active and not chosen — and writes nothing', async () => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date(2026, 9, 8, 14, 22, 0));
      try {
        const f = await asWheels((h) => h.value.set(null));
        expect(active(wheel(f, 'hour'))).toBe('14');
        expect(active(wheel(f, 'minute'))).toBe('22');
        expect(chosen(wheel(f, 'hour'))).toEqual([]);
        expect(chosen(wheel(f, 'minute'))).toEqual([]);
        expect(f.componentInstance.value()).toBeNull();
      } finally {
        vi.useRealTimers();
      }
    });

    it('holds the rows the walk starts on for a value the bounds refuse, and chooses none it is not in', async () => {
      const f = await asWheels((h) => {
        h.value.set('07:30');
        h.min.set('09:00');
      });
      expect(active(wheel(f, 'hour'))).toBe('09');
      expect(chosen(wheel(f, 'hour'))).toEqual([]);
      expect(active(wheel(f, 'minute'))).toBe('00');
      expect(chosen(wheel(f, 'minute'))).toEqual([]);
      expect(f.componentInstance.value()).toBe('07:30');
    });

    it('hands a wheel the same list while nothing in it changed', async () => {
      const f = await asWheels();
      const hours = wheelAsked(f, 'hour');
      const minutes = wheelAsked(f, 'minute');

      await press(f, wheel(f, 'hour'), 'ArrowDown');
      expect(f.componentInstance.value()).toBe('14:05');
      expect(wheelAsked(f, 'hour')).toBe(hours);
      expect(wheelAsked(f, 'minute')).toBe(minutes);
    });

    it('hands a wheel a new list when a row is refused, written otherwise, or added', async () => {
      const f = await asWheels((h) => h.step.set(3600));
      expect(turnLabels(wheel(f, 'minute'))).toEqual(['00']);

      // A row more, after rows that stay as they were.
      f.componentInstance.step.set(1800);
      await settle(f);
      expect(turnLabels(wheel(f, 'minute'))).toEqual(['00', '30']);

      // The same rows, one of them refused.
      f.componentInstance.max.set('13:10');
      await settle(f);
      expect(
        turn(wheel(f, 'minute')).map((row) =>
          row.getAttribute('aria-disabled'),
        ),
      ).toEqual([null, 'true']);

      // The same rows, written in other digits.
      f.componentInstance.locale.set('en-GB-u-nu-arab');
      await settle(f);
      expect(turnLabels(wheel(f, 'minute'))).toEqual(['٠٠', '٣٠']);
    });
  });

  describe('the keys', () => {
    it('reads an arrow as the columns do, and the key goes no further', async () => {
      const f = await asWheels();
      const heard = overhear(f);

      const down = await press(f, wheel(f, 'hour'), 'ArrowDown');
      expect(f.componentInstance.value()).toBe('14:05');
      expect(down.defaultPrevented).toBe(true);
      expect(active(wheel(f, 'hour'))).toBe('14');
      expect(chosen(wheel(f, 'hour'))).toEqual(['14']);

      await press(f, wheel(f, 'minute'), 'ArrowUp');
      expect(f.componentInstance.value()).toBe('14:04');
      expect(heard).toEqual([]);
      expect(f.componentInstance.picked).toEqual([]);
    });

    it('comes round at the end of a column that is no ring', async () => {
      const f = await asWheels((h) => h.locale.set('en-US'));
      await press(f, wheel(f, 'dayPeriod'), 'ArrowDown');
      expect(f.componentInstance.value()).toBe('01:05');
      await press(f, wheel(f, 'dayPeriod'), 'ArrowUp');
      expect(f.componentInstance.value()).toBe('13:05');
    });

    it('goes to the first and the last row with Home and End', async () => {
      const f = await asWheels();
      await press(f, wheel(f, 'minute'), 'End');
      expect(f.componentInstance.value()).toBe('13:59');
      await press(f, wheel(f, 'minute'), 'Home');
      expect(f.componentInstance.value()).toBe('13:00');
    });

    it('reads typed digits whole, where a wheel of its own would read the start of a label', async () => {
      const f = await asWheels();
      // No row of padded hours begins with `9`.
      await press(f, wheel(f, 'hour'), '9');
      expect(f.componentInstance.value()).toBe('09:05');
      await press(f, wheel(f, 'minute'), '4');
      await press(f, wheel(f, 'minute'), '5');
      expect(f.componentInstance.value()).toBe('09:45');

      // Rows `12, 1, 2 … 11`: a prefix would take `1` to twelve and never reach one.
      const twelve = await asWheels((h) => {
        h.locale.set('en-US');
        h.value.set('15:05');
      });
      await press(twelve, wheel(twelve, 'hour'), '1');
      expect(twelve.componentInstance.value()).toBe('13:05');
    });

    it('keeps a key that matches no row from the wheel under it, and leaves it to the page', async () => {
      const f = await asWheels();
      const heard = overhear(f);
      const miss = await press(f, wheel(f, 'hour'), 'x');

      expect(miss.defaultPrevented).toBe(false);
      expect(heard).toEqual([]);
      expect(f.componentInstance.value()).toBe('13:05');
    });

    it('takes the time with Enter and Space, and says it was picked', async () => {
      const f = await asWheels();
      const heard = overhear(f);
      const enter = await press(f, wheel(f, 'hour'), 'Enter');
      await press(f, wheel(f, 'minute'), ' ');

      expect(enter.defaultPrevented).toBe(true);
      expect(f.componentInstance.picked).toEqual(['13:05', '13:05']);
      expect(heard).toEqual([]);
    });

    it('takes the rows under the lines when there is no value', async () => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date(2026, 9, 8, 14, 22, 0));
      try {
        const f = await asWheels((h) => h.value.set(null));
        await press(f, wheel(f, 'hour'), 'Enter');
        expect(f.componentInstance.value()).toBe('14:22');
        expect(f.componentInstance.picked).toEqual(['14:22']);
        expect(chosen(wheel(f, 'hour'))).toEqual(['14']);
      } finally {
        vi.useRealTimers();
      }
    });

    it('leaves PageDown and PageUp to the wheel, which moves by its window', async () => {
      const f = await asWheels();
      const heard = overhear(f);

      await press(f, wheel(f, 'hour'), 'PageDown');
      expect(f.componentInstance.value()).toBe('20:05');
      await press(f, wheel(f, 'minute'), 'PageUp');
      // Seven rows back from `05` is past the first: a wide move stops at the end, in a ring
      // as in a list.
      expect(f.componentInstance.value()).toBe('20:00');
      expect(heard).toEqual(['PageDown', 'PageUp']);
      expect(f.componentInstance.picked).toEqual([]);
    });

    it('leaves a modified key, and a key it has no use for, to whoever owns it', async () => {
      const f = await asWheels();
      const heard = overhear(f);
      const copy = await press(f, wheel(f, 'hour'), 'c', { ctrlKey: true });
      const tab = await press(f, wheel(f, 'hour'), 'Tab');

      expect(copy.defaultPrevented).toBe(false);
      expect(tab.defaultPrevented).toBe(false);
      expect(heard).toEqual(['c', 'Tab']);
      expect(f.componentInstance.value()).toBe('13:05');
    });

    it('reads no key pressed outside every wheel, and has nothing to say about it', async () => {
      const f = await asWheels();
      const heard = overhear(f);
      const errors: unknown[] = [];
      const onError = (event: ErrorEvent) => {
        errors.push(event.error);
        event.preventDefault();
      };
      window.addEventListener('error', onError);
      const down = await press(f, hostOf(f), 'ArrowDown');
      window.removeEventListener('error', onError);

      expect(errors).toEqual([]);
      expect(down.defaultPrevented).toBe(false);
      expect(heard).toEqual(['ArrowDown']);
      expect(f.componentInstance.value()).toBe('13:05');
    });

    it('reads no key of a wheel while the shape is a list', async () => {
      const f = await render();
      const heard = overhear(f);
      await press(f, column(f, 'hour'), 'ArrowDown');
      // The list's own handler answered it, on the way up — and it went on up.
      expect(f.componentInstance.value()).toBe('14:05');
      expect(heard).toEqual(['ArrowDown']);
    });

    it('stops listening when the wheels go back to being lists', async () => {
      const f = await asWheels();
      f.componentInstance.picker.set('list');
      await settle(f);
      const heard = overhear(f);

      await press(f, column(f, 'hour'), 'ArrowDown');

      expect(f.componentInstance.value()).toBe('14:05');
      expect(heard).toEqual(['ArrowDown']);
    });

    it('freezes when disabled: the wheels leave the tab order, and no key moves or takes', async () => {
      const f = await asWheels((h) => h.disabled.set(true));
      const heard = overhear(f);
      for (const field of ['hour', 'minute']) {
        expect(wheel(f, field).getAttribute('tabindex')).toBe('-1');
        expect(wheel(f, field).getAttribute('aria-disabled')).toBe('true');
      }

      const down = await press(f, wheel(f, 'minute'), 'ArrowDown');
      await press(f, wheel(f, 'minute'), 'Enter');
      await press(f, wheel(f, 'minute'), 'PageDown');
      turn(wheel(f, 'minute'))[30].click();
      await settle(f);

      expect(down.defaultPrevented).toBe(false);
      expect(heard).toEqual(['ArrowDown', 'Enter', 'PageDown']);
      expect(f.componentInstance.value()).toBe('13:05');
      expect(f.componentInstance.picked).toEqual([]);
    });
  });

  describe('a press and a turn', () => {
    let screen: ReturnType<typeof layout>;

    beforeEach(() => {
      screen = layout();
    });
    afterEach(() => {
      screen.restore();
    });

    it('moves the value on a press, and does not say it was picked', async () => {
      const f = await asWheels();
      turn(wheel(f, 'minute'))[30].click();
      await settle(f);
      expect(f.componentInstance.value()).toBe('13:30');
      expect(f.componentInstance.picked).toEqual([]);
    });

    it('opens every wheel on the row under its line, placed at once', async () => {
      const f = await asWheels();
      // Rings, on their middle turn.
      expect(wheel(f, 'hour').scrollTop).toBe((24 + 13) * ROW);
      expect(wheel(f, 'minute').scrollTop).toBe((60 + 5) * ROW);
      expect(screen.calls.map((call) => call.behavior)).toEqual([
        'instant',
        'instant',
      ]);
    });

    it('opens on the rows of now when there is no value', async () => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date(2026, 9, 8, 14, 22, 0));
      try {
        const f = await asWheels((h) => h.value.set(null));
        expect(wheel(f, 'hour').scrollTop).toBe((24 + 14) * ROW);
        expect(wheel(f, 'minute').scrollTop).toBe((60 + 22) * ROW);
      } finally {
        vi.useRealTimers();
      }
    });

    it('moves the value when a wheel comes to rest, as a press does', async () => {
      const f = await asWheels();
      const hour = wheel(f, 'hour');

      hour.dispatchEvent(new Event('pointerdown'));
      hour.scrollTop = (24 + 20) * ROW;
      hour.dispatchEvent(new Event('scrollend'));
      await settle(f);

      expect(f.componentInstance.value()).toBe('20:05');
      expect(chosen(hour)).toEqual(['20']);
      expect(f.componentInstance.picked).toEqual([]);
    });

    it('writes nothing when a wheel is emptied: no row stands for no value', async () => {
      const f = await asWheels();
      const hour = f.debugElement.query(
        By.css('pct-wheel[data-pct-field="hour"]'),
      ).componentInstance as PctWheel<number>;
      // An error under a wheel's output goes to the handler, and not to whoever set the value.
      const handled = vi
        .spyOn(TestBed.inject(ErrorHandler), 'handleError')
        .mockImplementation(() => undefined);

      hour.value.set(null);
      await settle(f);

      expect(handled).not.toHaveBeenCalled();
      expect(f.componentInstance.value()).toBe('13:05');
      expect(f.componentInstance.picked).toEqual([]);
    });

    it('takes the other wheels to meet a bound the turned one runs into', async () => {
      const f = await asWheels((h) => {
        h.value.set('16:45');
        h.max.set('17:30');
      });
      const hour = wheel(f, 'hour');

      hour.dispatchEvent(new Event('pointerdown'));
      hour.scrollTop = (24 + 17) * ROW;
      hour.dispatchEvent(new Event('scrollend'));
      await settle(f);

      expect(f.componentInstance.value()).toBe('17:30');
      expect(active(wheel(f, 'minute'))).toBe('30');
    });

    it('turns a wheel to the row a key wrote — travelled, the list being the one it had', async () => {
      const f = await asWheels();
      const hour = wheel(f, 'hour');
      screen.calls.length = 0;

      await moving(async () => {
        await press(f, hour, 'ArrowDown');
        expect(screen.calls).toEqual([
          { list: hour, top: (24 + 14) * ROW, behavior: 'smooth' },
        ]);
      });
    });
  });

  describe('focus', () => {
    it('hands the focus to the hour wheel, wherever the language puts it', async () => {
      const f = TestBed.createComponent(PctTimeColumns);
      f.componentRef.setInput('locale', 'ko-KR');
      f.componentRef.setInput('picker', 'wheel');
      document.body.append(f.nativeElement);
      f.detectChanges();
      await f.whenStable();
      f.componentInstance.focusCursor();

      expect(document.activeElement).toBe(wheel(f, 'hour'));
      expect(wheelsOf(f).map((host) => host.dataset['pctField'])).toEqual([
        'dayPeriod',
        'hour',
        'minute',
      ]);
      f.nativeElement.remove();
    });

    it('focuses nothing while there is no wheel drawn yet', () => {
      const f = TestBed.createComponent(PctTimeColumns);
      f.componentRef.setInput('picker', 'wheel');
      expect(() => f.componentInstance.focusCursor()).not.toThrow();
    });
  });
});
