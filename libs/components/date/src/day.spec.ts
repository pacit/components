import {
  isPctDay,
  pctAddDays,
  pctAddMonths,
  pctClampDay,
  pctCompareDays,
  pctDay,
  pctDayAsUtc,
  pctDayParts,
  pctDaysInMonth,
  pctMonthGrid,
  pctToday,
  pctWeekday,
} from './day';

describe('PctDay — a calendar day, not an instant', () => {
  it('is the same day whatever the offset it was written at', () => {
    // Midnight on 27 August two hours ahead of UTC — which is 22:00 on the 26th. This is the
    // whole reason a `Date` cannot be the value type: the three fields a user picked and the
    // string an API stores are not the same day (0043).
    const instant = new Date('2026-08-27T00:00:00+02:00');
    expect(instant.toISOString().slice(0, 10)).toBe('2026-08-26');

    // The same three fields as a day never move, in either direction.
    expect(pctDayAsUtc('2026-08-27').toISOString().slice(0, 10)).toBe(
      '2026-08-27',
    );
    expect(pctDayAsUtc('2026-08-27').getUTCHours()).toBe(0);
  });

  it('means the year it is given, below 100 as well', () => {
    // `Date.UTC(1, 0, 1)` is 1901 — the two-digit-year rule of the original ECMAScript, still
    // in every engine. `setUTCFullYear` is the only road that does not have it.
    expect(new Date(Date.UTC(1, 0, 1)).getUTCFullYear()).toBe(1901);
    expect(pctDay(1, 1, 1)).toBe('0001-01-01');
    expect(pctDay(99, 12, 31)).toBe('0099-12-31');
    expect(pctDayParts('0099-12-31')).toEqual({
      year: 99,
      month: 12,
      day: 31,
    });
  });
});

describe('isPctDay', () => {
  it('takes the shape and the calendar together', () => {
    expect(isPctDay('2026-08-27')).toBe(true);
    expect(isPctDay('2024-02-29')).toBe(true);
    // The shape alone is not enough — these are strings somebody else wrote.
    expect(isPctDay('2026-02-30')).toBe(false);
    expect(isPctDay('2025-02-29')).toBe(false);
    expect(isPctDay('2026-13-01')).toBe(false);
    expect(isPctDay('2026-00-10')).toBe(false);
    expect(isPctDay('2026-08-00')).toBe(false);
    expect(isPctDay('2026-8-27')).toBe(false);
    expect(isPctDay('27.08.2026')).toBe(false);
    expect(isPctDay('')).toBe(false);
  });

  it('refuses everything that is not a string', () => {
    // The forms interop writes values a typed model cannot hold (`lesson-117`), so this is
    // the guard every read in the entrypoint goes through.
    expect(isPctDay(null)).toBe(false);
    expect(isPctDay(undefined)).toBe(false);
    expect(isPctDay(new Date())).toBe(false);
    expect(isPctDay(20260827)).toBe(false);
    // A boxed string is not one either, and it is the case that says the check is on the
    // TYPE and not on what the value stringifies to: `String('2026-08-27')` matches the
    // shape perfectly and is still an object.
    expect(isPctDay(new String('2026-08-27'))).toBe(false);
  });
});

describe('pctDaysInMonth', () => {
  it('has the whole Gregorian leap rule and not the first third of it', () => {
    expect(pctDaysInMonth(2024, 2)).toBe(29);
    expect(pctDaysInMonth(2025, 2)).toBe(28);
    // The two exceptions a `% 4` test gets wrong.
    expect(pctDaysInMonth(1900, 2)).toBe(28);
    expect(pctDaysInMonth(2000, 2)).toBe(29);
  });

  it('knows the length of all twelve', () => {
    expect(
      Array.from({ length: 12 }, (_, i) => pctDaysInMonth(2026, i + 1)),
    ).toEqual([31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]);
  });
});

describe('walking', () => {
  it('crosses a month, a year and a leap day', () => {
    expect(pctAddDays('2026-08-27', 1)).toBe('2026-08-28');
    expect(pctAddDays('2026-08-31', 1)).toBe('2026-09-01');
    expect(pctAddDays('2026-01-01', -1)).toBe('2025-12-31');
    expect(pctAddDays('2024-02-28', 1)).toBe('2024-02-29');
    expect(pctAddDays('2025-02-28', 1)).toBe('2025-03-01');
    expect(pctAddDays('2026-08-27', 7)).toBe('2026-09-03');
  });

  it('clamps a month step to the length of the month it lands in', () => {
    // 31 January plus one month is 28 February and not 3 March — a walk that changed the day
    // of the month would move the cursor twice.
    expect(pctAddMonths('2026-01-31', 1)).toBe('2026-02-28');
    expect(pctAddMonths('2024-01-31', 1)).toBe('2024-02-29');
    expect(pctAddMonths('2026-03-31', -1)).toBe('2026-02-28');
    expect(pctAddMonths('2026-08-27', 12)).toBe('2027-08-27');
    expect(pctAddMonths('2026-01-15', -1)).toBe('2025-12-15');
    expect(pctAddMonths('2026-01-15', -13)).toBe('2024-12-15');
  });

  it('reads the weekday in ISO numbering', () => {
    // 2024-01-01 was a Monday; the reference the column headings are rotated from.
    expect(pctWeekday('2024-01-01')).toBe(1);
    expect(pctWeekday('2024-01-07')).toBe(7);
    expect(pctWeekday('2026-08-27')).toBe(4);
  });

  it('compares as the string it is', () => {
    expect(pctCompareDays('2026-08-27', '2026-08-28')).toBe(-1);
    expect(pctCompareDays('2026-08-28', '2026-08-27')).toBe(1);
    expect(pctCompareDays('2026-08-27', '2026-08-27')).toBe(0);
  });

  it('clamps to the bounds it has and leaves the ones it has not', () => {
    expect(pctClampDay('2026-08-27', '2026-09-01', undefined)).toBe(
      '2026-09-01',
    );
    expect(pctClampDay('2026-08-27', undefined, '2026-08-01')).toBe(
      '2026-08-01',
    );
    expect(pctClampDay('2026-08-27', undefined, undefined)).toBe('2026-08-27');
    expect(pctClampDay('2026-08-27', '2026-01-01', '2026-12-31')).toBe(
      '2026-08-27',
    );
  });
});

describe('pctToday', () => {
  it('reads the LOCAL clock — "what day is it" is a question about where the user is', () => {
    // The clock is injected, so the assertion is about the reading and not about the day the
    // suite happens to run on.
    const noon = new Date(2026, 7, 27, 12, 0, 0);
    expect(pctToday(noon)).toBe('2026-08-27');
    // 23:30 local is the NEXT day in UTC anywhere east of the meridian, and still today.
    const lateEvening = new Date(2026, 7, 27, 23, 30, 0);
    expect(pctToday(lateEvening)).toBe('2026-08-27');
  });
});

describe('pctMonthGrid', () => {
  it('is six whole weeks, always', () => {
    // A month spans four to six weeks depending on where it starts. A panel that changed
    // height between them would move the page under the pointer mid-walk.
    for (const [year, month] of [
      [2026, 2],
      [2026, 8],
      [2027, 2],
      [2024, 2],
    ] as const) {
      const grid = pctMonthGrid(year, month, 1);
      expect(grid).toHaveLength(6);
      for (const week of grid) expect(week).toHaveLength(7);
    }
  });

  it('starts each row on the day the week starts on', () => {
    const monday = pctMonthGrid(2026, 8, 1);
    expect(monday.every((week) => pctWeekday(week[0]) === 1)).toBe(true);

    const sunday = pctMonthGrid(2026, 8, 7);
    expect(sunday.every((week) => pctWeekday(week[0]) === 7)).toBe(true);

    // Same month, two week starts, two different first cells.
    expect(monday[0][0]).toBe('2026-07-27');
    expect(sunday[0][0]).toBe('2026-07-26');
  });

  it('runs day by day with no gap and no repeat', () => {
    const days = pctMonthGrid(2026, 8, 1).flat();
    expect(days).toHaveLength(42);
    expect(new Set(days).size).toBe(42);
    for (let i = 1; i < days.length; i++)
      expect(days[i]).toBe(pctAddDays(days[i - 1], 1));
  });

  it('holds the whole month it is the grid of', () => {
    for (const [year, month] of [
      [2026, 2],
      [2026, 8],
      [2026, 12],
    ] as const) {
      const days = new Set(pctMonthGrid(year, month, 1).flat());
      for (let d = 1; d <= pctDaysInMonth(year, month); d++)
        expect(days.has(pctDay(year, month, d))).toBe(true);
    }
  });
});

/**
 * The suite's machine is the timezone it happens to be, and "every day in this file is
 * midnight UTC" was a sentence with no run standing anywhere hostile behind it (plan 4.29).
 * These cases pin the clock: Node reads `TZ` on every local-time call, so a case can stand in
 * Kiritimati — UTC+14, the farthest a clock gets from the meridian — and on both sides of
 * Warsaw's daylight-saving switch, whatever the machine is set to.
 */
// Node's, and the one spec that reads it: the spec program carries no Node types by design
// (a component's tests run where a component runs), so the shape is declared here rather
// than pulled in for every spec.
declare const process: { env: Record<string, string | undefined> };

describe('in a hostile timezone', () => {
  const machine = process.env['TZ'];
  afterEach(() => {
    if (machine === undefined) delete process.env['TZ'];
    else process.env['TZ'] = machine;
  });

  it('is the same day fourteen hours east of the meridian', () => {
    process.env['TZ'] = 'Pacific/Kiritimati';
    expect(new Date(2026, 2, 29, 12).getTimezoneOffset()).toBe(-840);

    // The one local read: noon UTC on the 28th is already the 29th where the user stands.
    expect(pctToday(new Date('2026-03-28T12:00:00Z'))).toBe('2026-03-29');
    // And what a `Date` built from those three fields would have serialised as — the
    // day before, which is the defect the type refuses (0043).
    expect(new Date(2026, 2, 29).toISOString()).toBe(
      '2026-03-28T10:00:00.000Z',
    );
    expect(pctDayAsUtc('2026-03-29').toISOString()).toBe(
      '2026-03-29T00:00:00.000Z',
    );
    // The arithmetic never asks where it is.
    expect(pctAddDays('2026-03-29', 1)).toBe('2026-03-30');
    expect(pctAddMonths('2026-03-29', 1)).toBe('2026-04-29');
    expect(pctWeekday('2026-03-29')).toBe(7);
    expect(
      pctMonthGrid(2026, 3, 1)
        .flat()
        .filter((d) => d === '2026-03-29'),
    ).toHaveLength(1);
  });

  it('crosses a daylight-saving switch without a 23- or 25-hour day', () => {
    process.env['TZ'] = 'Europe/Warsaw';
    // 29 March 2026: 02:00 becomes 03:00, and the local day is 23 hours long.
    expect(new Date(2026, 2, 28, 12).getTimezoneOffset()).toBe(-60);
    expect(new Date(2026, 2, 29, 12).getTimezoneOffset()).toBe(-120);
    const localSpring =
      new Date(2026, 2, 30).getTime() - new Date(2026, 2, 29).getTime();
    expect(localSpring).toBe(23 * 3_600_000);
    // 25 October 2026: 03:00 becomes 02:00, and the local day is 25 hours long.
    const localAutumn =
      new Date(2026, 9, 26).getTime() - new Date(2026, 9, 25).getTime();
    expect(localAutumn).toBe(25 * 3_600_000);

    // A day here is 24 hours long on both of them, because it is never local.
    for (const [from, to] of [
      ['2026-03-29', '2026-03-30'],
      ['2026-10-25', '2026-10-26'],
    ] as const) {
      expect(pctDayAsUtc(to).getTime() - pctDayAsUtc(from).getTime()).toBe(
        24 * 3_600_000,
      );
      expect(pctAddDays(from, 1)).toBe(to);
      expect(pctAddDays(to, -1)).toBe(from);
    }
    // Midnight local on the switch day, serialised, is the day before — the shape of the
    // defect, measured here so that the sentence above it is not the only evidence.
    expect(new Date(2026, 2, 29).toISOString()).toBe(
      '2026-03-28T23:00:00.000Z',
    );
    expect(pctDayAsUtc('2026-03-29').toISOString()).toBe(
      '2026-03-29T00:00:00.000Z',
    );
    // The grid of the two months walks day by day across the switch.
    for (const [year, month] of [
      [2026, 3],
      [2026, 10],
    ] as const) {
      const days = pctMonthGrid(year, month, 1).flat();
      for (let i = 1; i < days.length; i++)
        expect(days[i]).toBe(pctAddDays(days[i - 1], 1));
    }
  });
});
