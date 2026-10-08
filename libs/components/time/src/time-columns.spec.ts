import {
  Component,
  provideZonelessChangeDetection,
  signal,
} from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { providePctTexts } from '@pacit/components/core';

import { PctTimeOfDay } from './time';
import { PctTimeColumns } from './time-columns';

@Component({
  imports: [PctTimeColumns],
  template: `<pct-time-columns
    [(value)]="value"
    [locale]="locale()"
    [step]="step()"
    [min]="min()"
    [max]="max()"
    [disabled]="disabled()"
    [ariaLabel]="ariaLabel()"
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
  readonly ariaLabel = signal('');
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
    f.componentInstance.ariaLabel.set('Start time');
    await settle(f);
    expect(host.getAttribute('aria-label')).toBe('Start time');
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
      // Now, held on the step: 14:22:37 is nearer 14:23 than 14:22.
      expect(active(column(f, 'hour'))).toBe('14');
      expect(active(column(f, 'minute'))).toBe('23');
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

  it('jumps to the row a typed digit begins', async () => {
    const f = await render();
    await press(f, column(f, 'minute'), '4');
    expect(f.componentInstance.value()).toBe('13:40');
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
});
