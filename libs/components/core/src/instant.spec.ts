import { pctInstantOf, pctRelativeFormat, pctWallClockOf } from './instant';

/** An instant from UTC fields, month counted from 1 as everywhere else in this file. */
function utc(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0,
  millisecond = 0,
): number {
  return Date.UTC(year, month - 1, day, hour, minute, second, millisecond);
}

const MINUTE = 60_000;
const HOUR = 3_600_000;
const DAY = 86_400_000;

describe('pctWallClockOf', () => {
  it('reads the wall clock a zone shows, either side of a change of clocks', () => {
    // Warsaw goes back from 03:00 to 02:00 at 01:00 UTC on 2026-10-25: half past two twice.
    expect(pctWallClockOf(utc(2026, 10, 25, 0, 30), 'Europe/Warsaw')).toEqual({
      year: 2026,
      month: 10,
      day: 25,
      hour: 2,
      minute: 30,
      second: 0,
      millisecond: 0,
    });
    expect(pctWallClockOf(utc(2026, 10, 25, 1, 30), 'Europe/Warsaw')).toEqual(
      expect.objectContaining({ hour: 2, minute: 30 }),
    );
    expect(
      pctWallClockOf(utc(2026, 7, 1, 23, 59, 58), 'Asia/Kathmandu'),
    ).toEqual(
      expect.objectContaining({
        month: 7,
        day: 2,
        hour: 5,
        minute: 44,
        second: 58,
      }),
    );
  });

  it('carries the milliseconds, before the epoch as well as after it', () => {
    expect(
      pctWallClockOf(utc(2026, 1, 1, 12, 0, 0, 250), 'UTC').millisecond,
    ).toBe(250);
    expect(pctWallClockOf(-1, 'UTC')).toEqual({
      year: 1969,
      month: 12,
      day: 31,
      hour: 23,
      minute: 59,
      second: 59,
      millisecond: 999,
    });
  });

  it("reads the runtime's own zone when none is given", () => {
    const own = new Intl.DateTimeFormat().resolvedOptions().timeZone;
    const at = utc(2026, 3, 29, 1, 30);
    expect(pctWallClockOf(at)).toEqual(pctWallClockOf(at, own));
  });

  it('keeps one formatter per zone, and does not lend one zone the next', () => {
    const Real = Intl.DateTimeFormat;
    let made = 0;
    Intl.DateTimeFormat = function (
      ...args: ConstructorParameters<typeof Intl.DateTimeFormat>
    ) {
      made++;
      return new Real(...args);
    } as unknown as typeof Intl.DateTimeFormat;
    try {
      pctWallClockOf(0, 'Pacific/Chatham');
      pctWallClockOf(DAY, 'Pacific/Chatham');
      expect(made).toBe(1);
    } finally {
      Intl.DateTimeFormat = Real;
    }
    expect(pctWallClockOf(0, 'Pacific/Chatham').hour).not.toBe(
      pctWallClockOf(0, 'America/New_York').hour,
    );
  });

  it('throws the platform error for a zone that does not exist', () => {
    expect(() => pctWallClockOf(0, 'Mars/Olympus')).toThrow(RangeError);
  });
});

describe('pctInstantOf', () => {
  it('reads a wall clock back as the instant the zone shows it at', () => {
    expect(
      pctInstantOf({ year: 2026, month: 7, day: 1, hour: 12 }, 'Europe/Warsaw'),
    ).toBe(utc(2026, 7, 1, 10));
    expect(
      pctInstantOf(
        {
          year: 2026,
          month: 1,
          day: 1,
          hour: 12,
          minute: 5,
          second: 6,
          millisecond: 7,
        },
        'Europe/Warsaw',
      ),
    ).toBe(utc(2026, 1, 1, 11, 5, 6, 7));
  });

  it('takes the fields left out as zero, and carries a field out of its range', () => {
    expect(pctInstantOf({ year: 2026, month: 1, day: 1 }, 'UTC')).toBe(
      utc(2026, 1, 1),
    );
    expect(pctInstantOf({ year: 2026, month: 1, day: 32 }, 'UTC')).toBe(
      utc(2026, 2, 1),
    );
    expect(
      pctInstantOf({ year: 2026, month: 13, day: 1, hour: 24 }, 'UTC'),
    ).toBe(utc(2027, 1, 2));
  });

  it('reads a year under a hundred as written, not as the twentieth century', () => {
    const fifty = new Date('0050-03-01T00:00:00Z').getTime();
    expect(pctInstantOf({ year: 50, month: 3, day: 1 }, 'UTC')).toBe(fifty);
    expect(pctWallClockOf(fifty, 'UTC').year).toBe(50);
  });

  it('moves a skipped wall clock on by the gap, or back before it when asked for the earlier', () => {
    // Warsaw springs from 02:00 to 03:00 at 01:00 UTC on 2026-03-29: half past two never shows.
    const skipped = { year: 2026, month: 3, day: 29, hour: 2, minute: 30 };
    expect(pctInstantOf(skipped, 'Europe/Warsaw')).toBe(
      utc(2026, 3, 29, 1, 30),
    );
    expect(pctInstantOf(skipped, 'Europe/Warsaw', 'compatible')).toBe(
      utc(2026, 3, 29, 1, 30),
    );
    expect(pctInstantOf(skipped, 'Europe/Warsaw', 'later')).toBe(
      utc(2026, 3, 29, 1, 30),
    );
    expect(pctInstantOf(skipped, 'Europe/Warsaw', 'earlier')).toBe(
      utc(2026, 3, 29, 0, 30),
    );
  });

  it('picks the earlier of a repeated wall clock unless asked for the later', () => {
    const twice = { year: 2026, month: 10, day: 25, hour: 2, minute: 30 };
    expect(pctInstantOf(twice, 'Europe/Warsaw')).toBe(utc(2026, 10, 25, 0, 30));
    expect(pctInstantOf(twice, 'Europe/Warsaw', 'earlier')).toBe(
      utc(2026, 10, 25, 0, 30),
    );
    expect(pctInstantOf(twice, 'Europe/Warsaw', 'later')).toBe(
      utc(2026, 10, 25, 1, 30),
    );
  });

  it('reads an unambiguous wall clock the same whatever disambiguation is asked for', () => {
    const plain = { year: 2026, month: 10, day: 25, hour: 4 };
    expect(pctInstantOf(plain, 'Europe/Warsaw', 'later')).toBe(
      utc(2026, 10, 25, 3),
    );
    expect(pctInstantOf(plain, 'Europe/Warsaw', 'earlier')).toBe(
      utc(2026, 10, 25, 3),
    );
  });

  it('handles a change of half an hour, and a day a country skipped whole', () => {
    // Lord Howe Island moves its clocks by thirty minutes: 02:00 to 02:30 in October.
    expect(
      pctInstantOf(
        { year: 2026, month: 10, day: 4, hour: 2, minute: 15 },
        'Australia/Lord_Howe',
      ),
    ).toBe(utc(2026, 10, 3, 15, 45));
    // ... and 02:00 back to 01:30 in April, so a quarter to two shows twice.
    const twice = { year: 2026, month: 4, day: 5, hour: 1, minute: 45 };
    expect(pctInstantOf(twice, 'Australia/Lord_Howe')).toBe(
      utc(2026, 4, 4, 14, 45),
    );
    expect(pctInstantOf(twice, 'Australia/Lord_Howe', 'later')).toBe(
      utc(2026, 4, 4, 15, 15),
    );
    // Samoa went from UTC-10 to UTC+14 at the end of 2011-12-29: the 30th never happened.
    const lost = { year: 2011, month: 12, day: 30, hour: 12 };
    expect(pctInstantOf(lost, 'Pacific/Apia')).toBe(utc(2011, 12, 30, 22));
    expect(pctInstantOf(lost, 'Pacific/Apia', 'earlier')).toBe(
      utc(2011, 12, 29, 22),
    );
  });

  it('reads the runtime zone when none is given', () => {
    const at = utc(2026, 6, 15, 8, 20);
    expect(pctInstantOf(pctWallClockOf(at))).toBe(at);
  });
});

describe('pctRelativeFormat', () => {
  const now = utc(2026, 1, 1, 10);
  const en = pctRelativeFormat('en', { timeZone: 'UTC', numeric: 'always' });

  it('counts seconds under a minute, and turns a past zero into zero', () => {
    expect(en.format(now, now)).toBe('in 0 seconds');
    expect(en.format(now - 500, now)).toBe('in 0 seconds');
    expect(en.format(now + MINUTE - 1, now)).toBe('in 59 seconds');
    expect(en.format(now - MINUTE + 1, now)).toBe('59 seconds ago');
  });

  it('counts minutes under an hour and hours under a day, truncated', () => {
    expect(en.format(now + MINUTE, now)).toBe('in 1 minute');
    expect(en.format(now - MINUTE, now)).toBe('1 minute ago');
    expect(en.format(now + HOUR - 1, now)).toBe('in 59 minutes');
    expect(en.format(now + HOUR, now)).toBe('in 1 hour');
    expect(en.format(now - HOUR, now)).toBe('1 hour ago');
    expect(en.format(now + DAY - 1, now)).toBe('in 23 hours');
    expect(en.format(now - DAY + 1, now)).toBe('23 hours ago');
  });

  it('counts calendar days from a day on, not spans of twenty-four hours', () => {
    expect(en.format(now + DAY, now)).toBe('in 1 day');
    // Five days and twenty-three hours, and six dates on.
    expect(en.format(utc(2026, 1, 7, 9), now)).toBe('in 6 days');
    expect(en.format(utc(2025, 12, 26, 10), now)).toBe('6 days ago');
  });

  it('stays in hours on the day of twenty-five, where a day later is the same date', () => {
    const warsaw = pctRelativeFormat('en', { timeZone: 'Europe/Warsaw' });
    // 00:10 on 2026-10-25 in Warsaw; twenty-four hours later the clock shows 23:10 that day.
    const early = utc(2026, 10, 24, 22, 10);
    expect(warsaw.format(early + DAY, early)).toBe('in 24 hours');
    expect(warsaw.format(early, early + DAY)).toBe('24 hours ago');
    // Twenty-four hours that do cross midnight are a day, by name.
    expect(warsaw.format(early + DAY + 3 * HOUR, early)).toBe('tomorrow');
  });

  it('counts whole weeks from seven days until a whole month has passed', () => {
    expect(en.format(utc(2026, 1, 8), now)).toBe('in 1 week');
    expect(en.format(utc(2025, 12, 25, 10), now)).toBe('1 week ago');
    expect(en.format(utc(2026, 1, 31, 10), now)).toBe('in 4 weeks');
    expect(en.format(utc(2026, 2, 1, 10), now)).toBe('in 1 month');
  });

  it('counts a month once its day and time come round, in both directions', () => {
    const from = utc(2026, 1, 25, 10);
    expect(en.format(utc(2026, 2, 25, 10) - 1, from)).toBe('in 4 weeks');
    expect(en.format(utc(2026, 2, 25, 10), from)).toBe('in 1 month');
    const back = utc(2026, 2, 25, 10);
    expect(en.format(utc(2026, 1, 25, 10) + 1, back)).toBe('4 weeks ago');
    expect(en.format(utc(2026, 1, 25, 10), back)).toBe('1 month ago');
  });

  it('counts no month back while the date is still inside the month it started in', () => {
    const late = utc(2026, 1, 25, 10);
    expect(en.format(utc(2026, 1, 10, 10), late)).toBe('2 weeks ago');
    // Two months and five days back is two months: the earlier day of the month is a full one.
    expect(en.format(utc(2026, 1, 20, 10), utc(2026, 3, 25, 10))).toBe(
      '2 months ago',
    );
  });

  it('counts months under a year, then whole years', () => {
    expect(en.format(utc(2026, 12, 1, 10), now)).toBe('in 11 months');
    expect(en.format(utc(2027, 1, 1, 10), now)).toBe('in 1 year');
    expect(en.format(utc(2028, 2, 1, 10), now)).toBe('in 2 years');
    expect(en.format(utc(2025, 2, 1, 10), now)).toBe('11 months ago');
    expect(en.format(utc(2025, 1, 1, 10), now)).toBe('1 year ago');
  });

  it("counts the days on the zone's calendar", () => {
    const evening = utc(2026, 6, 10, 21);
    const later = utc(2026, 6, 12, 1);
    expect(en.format(later, evening)).toBe('in 2 days');
    const tokyo = pctRelativeFormat('en', {
      timeZone: 'Asia/Tokyo',
      numeric: 'always',
    });
    expect(tokyo.format(later, evening)).toBe('in 1 day');
  });

  it("writes the platform's words, by name where it has them unless asked otherwise", () => {
    const words = pctRelativeFormat('en', { timeZone: 'UTC' });
    expect(words.format(now + DAY, now)).toBe('tomorrow');
    expect(words.format(now, now)).toBe('now');
    expect(
      pctRelativeFormat('de', { timeZone: 'UTC' }).format(now - 3 * HOUR, now),
    ).toBe('vor 3 Stunden');
    expect(
      pctRelativeFormat('en', {
        timeZone: 'UTC',
        style: 'short',
        numeric: 'always',
      }).format(now + 3 * HOUR, now),
    ).toBe('in 3 hr.');
    expect(pctRelativeFormat('en').format(now + MINUTE, now)).toBe(
      'in 1 minute',
    );
  });

  it('throws for a zone that does not exist when the formatter is made', () => {
    expect(() => pctRelativeFormat('en', { timeZone: 'Mars/Olympus' })).toThrow(
      RangeError,
    );
  });
});
