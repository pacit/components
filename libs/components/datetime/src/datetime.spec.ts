import {
  isPctDateTime,
  pctAddDateTimeMinutes,
  pctClampDateTime,
  pctCompareDateTimes,
  pctDateTime,
  pctDateTimeAsUtc,
  pctDateTimeParts,
  pctNowDateTime,
} from './datetime';

describe('PctDateTime — a wall clock with a date, not an instant', () => {
  it('is the same day and time whatever the offset it was written at', () => {
    // The native input's own string, read as an instant and serialised, is an hour off in
    // Warsaw — and the day-only string beside it is read as UTC: two rules in one constructor
    // (0090, B2). Built from an offset written out, the instant moves the fields; the value does
    // not, because it has no offset to move by.
    const instant = new Date('2026-12-01T13:05:00+01:00');
    expect(instant.toISOString()).toBe('2026-12-01T12:05:00.000Z');
    expect(new Date('2026-12-01').toISOString()).toBe(
      '2026-12-01T00:00:00.000Z',
    );

    expect(pctDateTime('2026-12-01', '13:05')).toBe('2026-12-01T13:05');
    expect(pctDateTimeParts('2026-12-01T13:05')).toEqual({
      day: '2026-12-01',
      time: '13:05',
    });
  });
});

describe('isPctDateTime', () => {
  it('accepts a day, a capital T and a time, in both shapes', () => {
    expect(isPctDateTime('2026-12-01T13:05')).toBe(true);
    expect(isPctDateTime('2026-12-01T13:05:30')).toBe(true);
    // The day's domain is the pair's, both ends (0090, A7 keeps the first).
    expect(isPctDateTime('0001-01-01T00:00')).toBe(true);
    expect(isPctDateTime('0000-01-01T00:00')).toBe(true);
    expect(isPctDateTime('275760-09-13T23:59:59')).toBe(true);
    expect(isPctDateTime('10000-01-01T00:00')).toBe(true);
  });

  it('refuses an instant, a space, a lower-case t and every half the halves refuse', () => {
    // `Temporal.PlainDateTime.from` drops an offset in silence (0090, B5) — the reason this
    // guard is a parser, and these two lines are the reason written out.
    expect(isPctDateTime('2026-12-01T13:05Z')).toBe(false);
    expect(isPctDateTime('2026-12-01T13:05+01:00')).toBe(false);
    expect(isPctDateTime('2026-12-01T13:05:00.000Z')).toBe(false);
    // The input reads a space and writes a `T`; the value is the `T` alone.
    expect(isPctDateTime('2026-12-01 13:05')).toBe(false);
    expect(isPctDateTime('2026-12-01t13:05')).toBe(false);
    expect(isPctDateTime('2026-12-01T13:05T00')).toBe(false);
    expect(isPctDateTime('2026-12-01T')).toBe(false);
    expect(isPctDateTime('T13:05')).toBe(false);
    // A half alone is not the pair.
    expect(isPctDateTime('2026-12-01')).toBe(false);
    expect(isPctDateTime('13:05')).toBe(false);
    // What each half refuses, the pair refuses.
    expect(isPctDateTime('2026-02-30T13:05')).toBe(false);
    expect(isPctDateTime('2026-12-01T24:00')).toBe(false);
    expect(isPctDateTime('2026-12-01T13:05:60')).toBe(false);
    expect(isPctDateTime('2026-12-01T13:05:00.5')).toBe(false);
    expect(isPctDateTime('26-12-01T13:05')).toBe(false);
    expect(isPctDateTime('2026-12-01T1:05')).toBe(false);
    expect(isPctDateTime('')).toBe(false);
  });

  it('refuses what is not a string', () => {
    expect(isPctDateTime(null)).toBe(false);
    expect(isPctDateTime(undefined)).toBe(false);
    expect(isPctDateTime(new Date(2026, 11, 1, 13, 5))).toBe(false);
    expect(isPctDateTime(20261201)).toBe(false);
  });
});

describe('pctDateTime and pctDateTimeParts', () => {
  it('joins in the time shape it is given, and splits back into the same two', () => {
    expect(pctDateTime('2026-12-01', '13:05:00')).toBe('2026-12-01T13:05:00');
    expect(pctDateTimeParts('2026-12-01T13:05:30')).toEqual({
      day: '2026-12-01',
      time: '13:05:30',
    });
    expect(pctDateTimeParts('10000-01-01T00:00')).toEqual({
      day: '10000-01-01',
      time: '00:00',
    });
  });

  it('refuses a half that is not one, either half, with the two it was given in the message', () => {
    expect(() => pctDateTime('01.12.2026', '13:05')).toThrow(
      /'01\.12\.2026' and '13:05' are not a day and a time/,
    );
    expect(() => pctDateTime('2026-12-01', '1:05 PM')).toThrow(RangeError);
    expect(() => pctDateTime('2026-02-30', '13:05')).toThrow(RangeError);
    expect(() => pctDateTime('2026-12-01', '24:00')).toThrow(RangeError);
  });
});

describe('pctDateTimeAsUtc', () => {
  it('is the fields in UTC, read back by a UTC formatter as the same day and time', () => {
    const date = pctDateTimeAsUtc('2026-03-29T02:30');
    expect(date.toISOString()).toBe('2026-03-29T02:30:00.000Z');
    expect(
      new Intl.DateTimeFormat('pl-PL', {
        timeZone: 'UTC',
        dateStyle: 'short',
        timeStyle: 'short',
      }).format(date),
    ).toBe('29.03.2026, 02:30');
    expect(pctDateTimeAsUtc('2026-12-01T13:05:09').toISOString()).toBe(
      '2026-12-01T13:05:09.000Z',
    );
  });

  it('means the year it is given, in the first century too', () => {
    // `Date.UTC(20, …)` is 1920 — the day's reason for `setUTCFullYear`, inherited.
    expect(pctDateTimeAsUtc('0020-06-15T08:00').getUTCFullYear()).toBe(20);
  });

  it('holds the last midnight a Date can, and refuses every minute after it', () => {
    expect(pctDateTimeAsUtc('275760-09-13T00:00').getTime()).toBe(8.64e15);
    expect(() => pctDateTimeAsUtc('275760-09-13T00:01')).toThrow(
      /275760-09-13T00:01 is past the last instant a Date can hold/,
    );
  });
});

describe('pctCompareDateTimes', () => {
  it('orders by the day first and the time second, and reads two shapes as one value', () => {
    expect(pctCompareDateTimes('2026-12-01T23:00', '2026-12-02T01:00')).toBe(
      -1,
    );
    expect(pctCompareDateTimes('2026-12-02T01:00', '2026-12-01T23:00')).toBe(1);
    expect(pctCompareDateTimes('2026-12-01T13:05', '2026-12-01T13:05:00')).toBe(
      0,
    );
    expect(pctCompareDateTimes('2026-12-01T13:05', '2026-12-01T13:05:01')).toBe(
      -1,
    );
    // A five-digit year is later, which a string compare gets backwards.
    expect(pctCompareDateTimes('2026-01-01T00:00', '10000-01-01T00:00')).toBe(
      -1,
    );
  });
});

describe('pctClampDateTime', () => {
  const min = '2026-12-01T09:00';
  const max = '2026-12-03T17:00';

  it('pulls a value outside to the bound it passed, as the bound was written', () => {
    expect(pctClampDateTime('2026-12-01T08:59', min, max)).toBe(min);
    expect(pctClampDateTime('2026-11-30T23:00', min, max)).toBe(min);
    expect(pctClampDateTime('2026-12-03T17:01', min, max)).toBe(max);
    expect(pctClampDateTime('2026-12-04T00:00', min, max)).toBe(max);
  });

  it('hands back a value inside as it was written — on a bound in the other shape too', () => {
    expect(pctClampDateTime('2026-12-02T12:00', min, max)).toBe(
      '2026-12-02T12:00',
    );
    expect(pctClampDateTime('2026-12-01T09:00:00', min, max)).toBe(
      '2026-12-01T09:00:00',
    );
    expect(pctClampDateTime('2026-12-03T17:00:00', min, max)).toBe(
      '2026-12-03T17:00:00',
    );
  });

  it('takes either bound alone', () => {
    expect(pctClampDateTime('2026-11-01T00:00', min, undefined)).toBe(min);
    expect(pctClampDateTime('2027-01-01T00:00', min, undefined)).toBe(
      '2027-01-01T00:00',
    );
    expect(pctClampDateTime('2027-01-01T00:00', undefined, max)).toBe(max);
    expect(pctClampDateTime('2026-11-01T00:00', undefined, max)).toBe(
      '2026-11-01T00:00',
    );
    expect(pctClampDateTime('2026-11-01T00:00', undefined, undefined)).toBe(
      '2026-11-01T00:00',
    );
  });

  it('reads a reversed pair as no window, and holds nothing with it', () => {
    // The time field's night shift is two datetimes on two days; a reversed pair here is the
    // platform's contradiction (0090, A8), and the value comes back as it was given — whether
    // it stood before both, between them or after both.
    const late = '2026-12-01T22:00';
    const early = '2026-12-01T06:00';
    for (const value of [
      '2026-12-01T05:00',
      '2026-12-01T12:00',
      '2026-12-01T23:00',
    ])
      expect(pctClampDateTime(value, late, early)).toBe(value);
    // Equal bounds are a window of one minute, not a reversed pair.
    expect(pctClampDateTime('2026-12-01T12:00', late, late)).toBe(late);
  });
});

describe('pctAddDateTimeMinutes', () => {
  it('carries the day across midnight, both ways — the platform stepUp’s reading', () => {
    // A datetime input's `stepUp()` at 23:59 is the next day's 00:00 in all three engines
    // (0090, A10), and `PlainDateTime` adds 45 minutes to 23:30 as 00:15 the next day (B7).
    expect(pctAddDateTimeMinutes('2026-12-01T23:59', 1)).toBe(
      '2026-12-02T00:00',
    );
    expect(pctAddDateTimeMinutes('2026-12-01T23:30', 45)).toBe(
      '2026-12-02T00:15',
    );
    expect(pctAddDateTimeMinutes('2026-12-01T00:00', -1)).toBe(
      '2026-11-30T23:59',
    );
    // Across a month, a year and a leap day.
    expect(pctAddDateTimeMinutes('2026-12-31T23:30', 60)).toBe(
      '2027-01-01T00:30',
    );
    expect(pctAddDateTimeMinutes('2028-02-28T23:00', 120)).toBe(
      '2028-02-29T01:00',
    );
    // Whole days at once, and more than one.
    expect(pctAddDateTimeMinutes('2026-12-01T13:05', 1440 * 3)).toBe(
      '2026-12-04T13:05',
    );
    expect(pctAddDateTimeMinutes('2026-12-01T13:05', -1440 * 3 - 10)).toBe(
      '2026-11-28T12:55',
    );
    expect(pctAddDateTimeMinutes('2026-12-01T13:05', 0)).toBe(
      '2026-12-01T13:05',
    );
  });

  it('keeps the shape it was given — a whole minute never moves the seconds', () => {
    expect(pctAddDateTimeMinutes('2026-12-01T23:59:30', 1)).toBe(
      '2026-12-02T00:00:30',
    );
    expect(pctAddDateTimeMinutes('2026-12-01T13:05:00', 5)).toBe(
      '2026-12-01T13:10:00',
    );
  });

  it('refuses a fraction of a minute, and a walk off either end of the day’s domain', () => {
    expect(() => pctAddDateTimeMinutes('2026-12-01T13:05', 0.5)).toThrow(
      /0\.5 is not a whole number of minutes/,
    );
    expect(() => pctAddDateTimeMinutes('2026-12-01T13:05', NaN)).toThrow(
      RangeError,
    );
    expect(() => pctAddDateTimeMinutes('0000-01-01T00:00', -1)).toThrow(
      RangeError,
    );
    expect(pctAddDateTimeMinutes('0000-01-01T00:01', -1)).toBe(
      '0000-01-01T00:00',
    );
    expect(() => pctAddDateTimeMinutes('275760-09-13T23:59', 1)).toThrow(
      RangeError,
    );
    expect(pctAddDateTimeMinutes('275760-09-13T23:58', 1)).toBe(
      '275760-09-13T23:59',
    );
  });
});

describe('pctNowDateTime', () => {
  it('is the local day and time of the instant it is given, to the minute or the second', () => {
    const afternoon = new Date(2026, 11, 1, 13, 5, 9);
    expect(pctNowDateTime(afternoon)).toBe('2026-12-01T13:05');
    expect(pctNowDateTime(afternoon, true)).toBe('2026-12-01T13:05:09');
    // The minute a wall clock shows until it ticks, the day it is until midnight.
    expect(pctNowDateTime(new Date(2026, 11, 31, 23, 59, 59, 999))).toBe(
      '2026-12-31T23:59',
    );
    expect(() => pctNowDateTime(new Date(NaN))).toThrow(RangeError);
  });

  it('reads the clock it is not given as now', () => {
    const before = Date.now();
    const value = pctNowDateTime();
    expect(isPctDateTime(value)).toBe(true);
    // Read back through the local clock it was written from, it is the minute of the call.
    const { day, time } = pctDateTimeParts(value);
    const [y, mo, d] = day.split('-').map(Number);
    const [h, mi] = time.split(':').map(Number);
    const at = new Date(y, mo - 1, d, h, mi).getTime();
    expect(before - at).toBeGreaterThanOrEqual(0);
    expect(before - at).toBeLessThan(60_000 + 1000);
  });
});

/**
 * The suite's machine is the timezone it happens to be, and "a datetime is a wall clock with a
 * date" is a sentence with no run standing anywhere hostile behind it unless these cases pin the
 * clock: Node reads `TZ` on every local-time call, so a case can stand in Kiritimati — UTC+14 —
 * and on both sides of Warsaw's daylight-saving switches, whatever the machine is set to.
 */
// Node's, and declared here for the reason `day.spec.ts` gives: the spec program carries no Node
// types by design.
declare const process: { env: Record<string, string | undefined> };

/**
 * The mutation run cannot move the zone — its thread pool shares one environment between workers
 * and the tz cache of the thread doing the reading is never invalidated. `day.spec.ts` says why at
 * length.
 */
const UNDER_MUTATION = '__stryker__' in globalThis;

describe.skipIf(UNDER_MUTATION)('in a hostile timezone', () => {
  const machine = process.env['TZ'];
  afterEach(() => {
    if (machine === undefined) delete process.env['TZ'];
    else process.env['TZ'] = machine;
  });

  it('is the same day and time fourteen hours east of the meridian', () => {
    process.env['TZ'] = 'Pacific/Kiritimati';
    expect(new Date(2026, 11, 1, 12).getTimezoneOffset()).toBe(-840);

    // The one local read: noon UTC on 30 November is two in the morning of 1 December where the
    // user stands — the day AND the hour move together, because both are read there.
    expect(pctNowDateTime(new Date('2026-11-30T12:00:00Z'))).toBe(
      '2026-12-01T02:00',
    );
    // What the pair built the old way does: 13:05 local on 1 December, serialised, is 23:05 on
    // 30 November — another day and another hour, with no error.
    expect(new Date(2026, 11, 1, 13, 5).toISOString()).toBe(
      '2026-11-30T23:05:00.000Z',
    );
    // The value never asks where it is.
    expect(pctDateTime('2026-12-01', '13:05')).toBe('2026-12-01T13:05');
    expect(pctDateTimeAsUtc('2026-12-01T13:05').toISOString()).toBe(
      '2026-12-01T13:05:00.000Z',
    );
    expect(pctAddDateTimeMinutes('2026-12-01T23:30', 45)).toBe(
      '2026-12-02T00:15',
    );
  });

  it('holds 02:30 on the day Warsaw skips it, where a local Date answers 03:30', () => {
    process.env['TZ'] = 'Europe/Warsaw';
    expect(new Date(2026, 2, 28, 12).getTimezoneOffset()).toBe(-60);
    expect(new Date(2026, 2, 29, 12).getTimezoneOffset()).toBe(-120);

    // 29 March 2026: 02:00 becomes 03:00, so 02:30 does not exist on that wall — and the type
    // refuses neither half of what a `Date` does with it (0090, B1).
    const gap = new Date(2026, 2, 29, 2, 30);
    expect([gap.getDate(), gap.getHours(), gap.getMinutes()]).toEqual([
      29, 3, 30,
    ]);
    expect(isPctDateTime('2026-03-29T02:30')).toBe(true);
    expect(pctDateTime('2026-03-29', '02:30')).toBe('2026-03-29T02:30');
    // An hour after 01:30 the local clock reads 03:30; on the wall clock it is 02:30 — the face,
    // not the time elapsed in one zone. And the day of 23 hours is 1440 minutes on the face.
    const later = new Date(new Date(2026, 2, 29, 1, 30).getTime() + 3_600_000);
    expect([later.getHours(), later.getMinutes()]).toEqual([3, 30]);
    expect(pctAddDateTimeMinutes('2026-03-29T01:30', 60)).toBe(
      '2026-03-29T02:30',
    );
    expect(
      new Date(2026, 2, 30).getTime() - new Date(2026, 2, 29).getTime(),
    ).toBe(23 * 3_600_000);
    expect(pctAddDateTimeMinutes('2026-03-29T00:00', 1440)).toBe(
      '2026-03-30T00:00',
    );
    // The local reading jumps the hour, honestly, and the type writes what it read.
    expect(pctNowDateTime(new Date('2026-03-29T00:30:00Z'))).toBe(
      '2026-03-29T01:30',
    );
    expect(pctNowDateTime(new Date('2026-03-29T01:30:00Z'))).toBe(
      '2026-03-29T03:30',
    );
    // The pair as the platform formats it, in UTC: exactly the fields (0090, B8 and B9).
    expect(
      pctDateTimeAsUtc('2026-03-29T02:30').toLocaleString('pl-PL', {
        timeZone: 'UTC',
      }),
    ).toBe('29.03.2026, 02:30:00');
    expect(gap.toLocaleString('pl-PL')).toBe('29.03.2026, 03:30:00');
  });

  it('holds 02:30 on the day Warsaw repeats it once, where a local Date picks the earlier', () => {
    process.env['TZ'] = 'Europe/Warsaw';

    // 25 October 2026: 03:00 becomes 02:00, so 02:30 happens twice, and a `Date` chooses an
    // instant the wall clock never named: the first.
    const fold = new Date(2026, 9, 25, 2, 30);
    expect(fold.toISOString()).toBe('2026-10-25T00:30:00.000Z');
    const again = new Date(fold.getTime() + 3_600_000);
    expect([again.getHours(), again.getMinutes()]).toEqual([2, 30]);
    // One value on the face, and the arithmetic says the next hour is 03:30.
    expect(isPctDateTime('2026-10-25T02:30')).toBe(true);
    expect(pctNowDateTime(new Date('2026-10-25T00:30:00Z'))).toBe(
      '2026-10-25T02:30',
    );
    expect(pctNowDateTime(new Date('2026-10-25T01:30:00Z'))).toBe(
      '2026-10-25T02:30',
    );
    expect(pctAddDateTimeMinutes('2026-10-25T02:30', 60)).toBe(
      '2026-10-25T03:30',
    );
    // The day of 25 hours is 1440 minutes on the face too.
    expect(
      new Date(2026, 9, 26).getTime() - new Date(2026, 9, 25).getTime(),
    ).toBe(25 * 3_600_000);
    expect(pctAddDateTimeMinutes('2026-10-25T00:00', 1440)).toBe(
      '2026-10-26T00:00',
    );
    expect(pctCompareDateTimes('2026-10-25T02:30', '2026-10-25T02:30:00')).toBe(
      0,
    );
  });
});
