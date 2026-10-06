import {
  isPctTimeOfDay,
  isPctTimeStep,
  pctAddMinutes,
  pctAddSeconds,
  pctClampTime,
  pctCompareTimes,
  pctNow,
  pctSnapToStep,
  pctTimeOfDay,
  pctTimeOnStep,
  pctTimeOfDayParts,
} from './time';

describe('PctTimeOfDay — a wall-clock time, not an instant', () => {
  it('is the same time whatever the offset it was written at', () => {
    // 13:05 two hours ahead of UTC is 11:05 in UTC — so a time carried as an instant reads back
    // as another time the moment anything serialises it. That is the whole reason a `Date`
    // cannot be the value type (0086, B5).
    const instant = new Date('2026-10-05T13:05:00+02:00');
    expect(instant.toISOString().slice(11, 16)).toBe('11:05');

    // The same fields as a time never move: there is no offset in them to move by.
    expect(pctTimeOfDay(13, 5)).toBe('13:05');
    expect(pctTimeOfDayParts('13:05')).toEqual({
      hour: 13,
      minute: 5,
      second: 0,
    });
  });

  it('writes the shape the platform writes, two digits a field', () => {
    expect(pctTimeOfDay(9, 5)).toBe('09:05');
    expect(pctTimeOfDay(0, 0)).toBe('00:00');
    expect(pctTimeOfDay(23, 59, 59)).toBe('23:59:59');
    // The shape is the caller's: a second of zero still writes the seconds when it is given.
    expect(pctTimeOfDay(9, 5, 0)).toBe('09:05:00');
    expect(pctTimeOfDayParts('09:05:00')).toEqual({
      hour: 9,
      minute: 5,
      second: 0,
    });
    expect(pctTimeOfDayParts('23:59:59')).toEqual({
      hour: 23,
      minute: 59,
      second: 59,
    });
  });
});

describe('isPctTimeOfDay', () => {
  it('takes both shapes, from the first second of a day to its last', () => {
    for (const time of ['00:00', '13:05', '23:59', '00:00:00', '23:59:59'])
      expect(isPctTimeOfDay(time)).toBe(true);
  });

  it('refuses the three strings 0086 refuses, and every near miss of the shape', () => {
    // The end of a day, the leap second `Temporal` quietly makes `:59`, and a fraction the
    // native element carries for a step of 0.001.
    expect(isPctTimeOfDay('24:00')).toBe(false);
    expect(isPctTimeOfDay('23:59:60')).toBe(false);
    expect(isPctTimeOfDay('13:05:30.5')).toBe(false);
    for (const miss of [
      '23:60',
      '1:05',
      '13:5',
      '13:05:5',
      '13.05',
      '1305',
      ' 13:05',
      '13:05 ',
      'T13:05',
      '13:05Z',
      '13:05+02:00',
      '13:05:00:00',
      '',
      // Arabic-Indic digits are digits, and still not the shape: the value is what a server
      // stores, and the reader's digits are the formatter's business.
      '١٣:٠٥',
    ])
      expect(isPctTimeOfDay(miss)).toBe(false);
  });

  it('refuses everything that is not a string', () => {
    // The forms interop writes values a typed model cannot hold (`lesson-117`), so this is the
    // guard every read in the entrypoint goes through — and a boxed string, which matches the
    // shape perfectly, is the case that says the check is on the TYPE.
    for (const value of [
      null,
      undefined,
      1305,
      new Date(),
      ['13:05'],
      new String('13:05'),
    ])
      expect(isPctTimeOfDay(value)).toBe(false);
  });
});

describe('pctTimeOfDay', () => {
  it('refuses a field outside the clock, loudly', () => {
    // A field out of range is not normalised here, unlike a day's month 13: minute 60 is
    // nothing a clock shows, and the walk that comes round at midnight has its own names.
    expect(() => pctTimeOfDay(24, 0)).toThrow(RangeError);
    expect(() => pctTimeOfDay(-1, 0)).toThrow(RangeError);
    expect(() => pctTimeOfDay(0, 60)).toThrow(RangeError);
    expect(() => pctTimeOfDay(0, -1)).toThrow(RangeError);
    expect(() => pctTimeOfDay(0, 0, 60)).toThrow(RangeError);
    expect(() => pctTimeOfDay(0, 0, -1)).toThrow(RangeError);
    expect(() => pctTimeOfDay(1.5, 0)).toThrow(RangeError);
    expect(() => pctTimeOfDay(0, 0, 0.5)).toThrow(RangeError);
    expect(() => pctTimeOfDay(NaN, 0)).toThrow(RangeError);
    expect(() => pctTimeOfDay(0, Infinity)).toThrow(RangeError);
  });

  it('says in the error what a time of day is', () => {
    expect(() => pctTimeOfDay(24, 0)).toThrow(
      '[PctTimeOfDay] hour 24, minute 0 is not a time of day: hours run 0 to 23 and minutes and ' +
        'seconds 0 to 59, in whole numbers — and 24:00 is the end of a day, which a time of day ' +
        'is not.',
    );
    expect(() => pctTimeOfDay(1, 2, 60)).toThrow(
      '[PctTimeOfDay] hour 1, minute 2, second 60 is not a time of day',
    );
  });
});

describe('the arithmetic comes round at midnight', () => {
  it('adds minutes on a ring, the way PlainTime does', () => {
    // 0086, B4: `23:30` plus 45 minutes is `00:15` — a time has nowhere to put the day it ran
    // into, so it comes round or it throws, and a clock comes round.
    expect(pctAddMinutes('23:30', 45)).toBe('00:15');
    expect(pctAddMinutes('00:15', -45)).toBe('23:30');
    expect(pctAddMinutes('13:05', 1440)).toBe('13:05');
    expect(pctAddMinutes('13:05', -1441)).toBe('13:04');
    // A whole minute never moves the seconds, so the shape is kept.
    expect(pctAddMinutes('13:05:09', 1)).toBe('13:06:09');
  });

  it('adds seconds, and widens the shape only to keep a second', () => {
    expect(pctAddSeconds('23:59:30', 45)).toBe('00:00:15');
    expect(pctAddSeconds('00:00', -1)).toBe('23:59:59');
    expect(pctAddSeconds('13:05', 3600)).toBe('14:05');
    expect(pctAddSeconds('13:05', 30)).toBe('13:05:30');
    expect(pctAddSeconds('13:05:30', 30)).toBe('13:06:00');
  });

  it('lands exactly on a step past what a double counts in ones', () => {
    // 2^60 seconds on from midnight is 13:56:16 — 2^60 mod 86 400 is 50 176, computed in
    // integers outside this file. Added whole, `1 + 2^60` IS `2^60` in a double, and the one
    // second the case starts with would vanish without a word.
    expect(pctAddSeconds('00:00:01', 2 ** 60)).toBe('13:56:17');
    // 2^60 minutes is 20:16 from midnight (2^60 mod 1440 is 1216), and the minute the case starts
    // with is the one a product taken before the remainder would lose.
    expect(pctAddMinutes('00:01', 2 ** 60)).toBe('20:17');
  });

  it('moves by whole units and refuses a fraction', () => {
    expect(() => pctAddMinutes('13:05', 0.5)).toThrow(RangeError);
    expect(() => pctAddSeconds('13:05', 1.5)).toThrow(
      new RangeError(
        '[PctTimeOfDay] 1.5 is not a whole number of seconds — a time has no fraction of one to ' +
          'move by.',
      ),
    );
    expect(() => pctAddSeconds('13:05', NaN)).toThrow(RangeError);
    expect(() => pctAddMinutes('13:05', Infinity)).toThrow(
      '[PctTimeOfDay] Infinity is not a whole number of minutes',
    );
  });
});

describe('pctCompareTimes', () => {
  it('reads two shapes of one time as one time', () => {
    expect(pctCompareTimes('13:05', '13:05:00')).toBe(0);
    expect(pctCompareTimes('13:05:01', '13:05')).toBe(1);
    expect(pctCompareTimes('00:00', '23:59:59')).toBe(-1);
  });

  it('does not come round, where the arithmetic does', () => {
    // A span across midnight belongs to a day; `PlainTime` says 23:00 until 01:00 is -PT22H.
    expect(pctCompareTimes('23:00', '01:00')).toBe(1);
    expect(pctCompareTimes('01:00', '23:00')).toBe(-1);
  });
});

describe('pctClampTime', () => {
  it('clamps to the bounds it has and leaves the ones it has not', () => {
    expect(pctClampTime('08:00', '09:00', undefined)).toBe('09:00');
    expect(pctClampTime('18:00', undefined, '17:30')).toBe('17:30');
    expect(pctClampTime('12:00', undefined, undefined)).toBe('12:00');
    expect(pctClampTime('12:00', '09:00', '17:30')).toBe('12:00');
    expect(pctClampTime('08:00', '09:00', '17:30')).toBe('09:00');
    expect(pctClampTime('18:00', '09:00', '17:30')).toBe('17:30');
    // A bound is handed back as it was written: the clamp invents no time and no shape.
    expect(pctClampTime('08:00', '09:00:00', '17:30')).toBe('09:00:00');
    // Two shapes of one time are one bound, not a window across midnight.
    expect(pctClampTime('12:00', '09:00', '09:00:00')).toBe('09:00:00');
    expect(pctClampTime('08:00', '09:00:00', '09:00')).toBe('09:00:00');
    // A time equal to a bound is inside it, and comes back as it was written.
    expect(pctClampTime('09:00:00', '09:00', undefined)).toBe('09:00:00');
    expect(pctClampTime('17:30:00', undefined, '17:30')).toBe('17:30:00');
  });

  it('reads min after max as the night shift, across midnight', () => {
    // 0086, A12: `min="22:00" max="06:00"` makes 23:00 and 05:00 valid and 12:00 under AND
    // over, in all three engines.
    const night = (time: string) => pctClampTime(time, '22:00', '06:00');
    expect(night('23:00')).toBe('23:00');
    expect(night('05:00')).toBe('05:00');
    expect(night('22:00')).toBe('22:00');
    expect(night('06:00')).toBe('06:00');
    // Equal to an end in the other shape is inside too, and comes back as it was written.
    expect(night('22:00:00')).toBe('22:00:00');
    expect(night('06:00:00')).toBe('06:00:00');
    expect(night('00:00')).toBe('00:00');
    // In the gap, the nearer bound — and halfway, the one the clock reaches next.
    expect(night('12:00')).toBe('06:00');
    expect(night('20:00')).toBe('22:00');
    expect(night('14:00')).toBe('22:00');
    expect(night('13:59:59')).toBe('06:00');
  });
});

describe('the step', () => {
  it('is a number of seconds the columns can list, and nothing else', () => {
    for (const step of [
      1, 2, 5, 10, 15, 30, 60, 120, 300, 900, 1800, 3600, 7200, 10800, 21600,
      43200, 86400,
    ])
      expect(isPctTimeStep(step)).toBe(true);
    // Seven-minute slots make the valid minutes depend on the hour; 45 seconds does not divide
    // a minute, 90 is not whole minutes, five hours do not divide a day.
    for (const step of [
      0,
      -60,
      7,
      45,
      90,
      420,
      3601,
      5400,
      18000,
      172800,
      1.5,
      NaN,
      Infinity,
    ])
      expect(isPctTimeStep(step)).toBe(false);
  });

  it('is counted from the base, and a time off it is still a time', () => {
    // 0086, A11: `13:05` at a quarter hour is a mismatch, and on the step once `min` is 00:05;
    // and with no step written the step is a minute, so `13:05:30` is off it.
    expect(pctTimeOnStep('13:05', 900)).toBe(false);
    expect(pctTimeOnStep('13:15', 900)).toBe(true);
    expect(pctTimeOnStep('13:05', 900, '00:05')).toBe(true);
    expect(pctTimeOnStep('13:05:30', 60)).toBe(false);
    expect(pctTimeOnStep('13:05:00', 60)).toBe(true);
    // Across midnight from a base late in the day: the ring has the same times on both sides.
    expect(pctTimeOnStep('00:00', 900, '22:00')).toBe(true);
    expect(pctTimeOnStep('00:10', 900, '22:00')).toBe(false);
  });

  it('snaps to the nearest time on the step, and comes round at midnight', () => {
    expect(pctSnapToStep('13:07', 900)).toBe('13:00');
    expect(pctSnapToStep('13:08', 900)).toBe('13:15');
    // Halfway goes up, and a shape with seconds keeps them.
    expect(pctSnapToStep('13:07:30', 900)).toBe('13:15:00');
    expect(pctSnapToStep('23:40', 3600)).toBe('00:00');
    expect(pctSnapToStep('13:07', 900, '00:05')).toBe('13:05');
    // A base with seconds puts seconds where the shape had none, and the shape gives way —
    // 13:07 stands halfway between 13:06:30 and 13:07:30, so it goes up.
    expect(pctSnapToStep('13:07', 60, '00:00:30')).toBe('13:07:30');
    expect(pctSnapToStep('13:06:50', 60, '00:00:30')).toBe('13:06:30');
  });

  it('refuses a step it cannot count with', () => {
    expect(() => pctSnapToStep('13:05', 420)).toThrow(
      new RangeError(
        '[PctTimeOfDay] a step of 420 seconds is not one the columns can list: a whole number of ' +
          'seconds that divides a minute, of minutes that divides an hour, or of hours that ' +
          'divides a day.',
      ),
    );
    expect(() => pctTimeOnStep('13:05', 0)).toThrow(RangeError);
  });
});

describe('pctNow', () => {
  it('reads the LOCAL clock — "what time is it" is a question about where the user is', () => {
    // The clock is injected, so the assertion is about the reading and not about the hour the
    // suite happens to run at.
    const afternoon = new Date(2026, 9, 5, 13, 5, 9);
    expect(pctNow(afternoon)).toBe('13:05');
    expect(pctNow(afternoon, true)).toBe('13:05:09');
    // The minute a wall clock shows until it ticks — never rounded up into the next one.
    expect(pctNow(new Date(2026, 9, 5, 23, 59, 59, 999))).toBe('23:59');
    // And an unreadable clock is refused rather than written as `NaN:NaN`.
    expect(() => pctNow(new Date(NaN))).toThrow(RangeError);
  });
});

/**
 * The suite's machine is the timezone it happens to be, and "a time of day is a wall clock" is a
 * sentence with no run standing anywhere hostile behind it unless these cases pin the clock: Node
 * reads `TZ` on every local-time call, so a case can stand in Kiritimati — UTC+14 — and on both
 * sides of Warsaw's daylight-saving switch, whatever the machine is set to.
 */
// Node's, and declared here for the reason `day.spec.ts` gives: the spec program carries no Node
// types by design.
declare const process: { env: Record<string, string | undefined> };

/**
 * The mutation run cannot move the zone — its thread pool shares one environment between workers
 * and the tz cache of the thread doing the reading is never invalidated. `day.spec.ts` says why at
 * length, and how both ways this can go wrong stay loud: skipped there, running in `test`.
 */
const UNDER_MUTATION = '__stryker__' in globalThis;

describe.skipIf(UNDER_MUTATION)('in a hostile timezone', () => {
  const machine = process.env['TZ'];
  afterEach(() => {
    if (machine === undefined) delete process.env['TZ'];
    else process.env['TZ'] = machine;
  });

  it('is the same time fourteen hours east of the meridian', () => {
    process.env['TZ'] = 'Pacific/Kiritimati';
    expect(new Date(2026, 2, 29, 12).getTimezoneOffset()).toBe(-840);

    // The one local read: noon UTC is two in the morning of the next day where the user stands.
    expect(pctNow(new Date('2026-03-28T12:00:00Z'))).toBe('02:00');
    // And what the time built the old way does: 13:05 local, serialised, is 23:05 the day
    // before — and 13:05 carried as an instant in UTC, the way `valueAsDate` carries it, reads
    // back as three in the morning (on a day of 2026: on `valueAsDate`'s own 1 January 1970 the
    // island stood at UTC−10:40, and the reading is another hour of another day).
    expect(new Date(2026, 2, 29, 13, 5).toISOString()).toBe(
      '2026-03-28T23:05:00.000Z',
    );
    expect(new Date(Date.UTC(2026, 0, 1, 13, 5)).getHours()).toBe(3);
    // The arithmetic never asks where it is.
    expect(pctAddMinutes('23:30', 45)).toBe('00:15');
    expect(pctAddSeconds('13:05', 3600)).toBe('14:05');
    expect(pctCompareTimes('13:05', '13:05:00')).toBe(0);
  });

  it('crosses a daylight-saving switch without a 23- or 25-hour clock', () => {
    process.env['TZ'] = 'Europe/Warsaw';
    expect(new Date(2026, 2, 28, 12).getTimezoneOffset()).toBe(-60);
    expect(new Date(2026, 2, 29, 12).getTimezoneOffset()).toBe(-120);

    // 29 March 2026: 02:00 becomes 03:00, and the local day is 23 hours long.
    expect(
      new Date(2026, 2, 30).getTime() - new Date(2026, 2, 29).getTime(),
    ).toBe(23 * 3_600_000);
    // 02:30 does not exist that day, and a local `Date` answers 03:30 without a word (B6). The
    // wall clock holds it, because it never asks what day it is.
    const gap = new Date(2026, 2, 29, 2, 30);
    expect([gap.getHours(), gap.getMinutes()]).toEqual([3, 30]);
    expect(pctTimeOfDay(2, 30)).toBe('02:30');
    expect(isPctTimeOfDay('02:30')).toBe(true);
    // An hour after 01:30 the local clock reads 03:30; on the wall clock an hour after 01:30 is
    // 02:30 — the time on the face, not the time elapsed in one zone.
    const later = new Date(new Date(2026, 2, 29, 1, 30).getTime() + 3_600_000);
    expect([later.getHours(), later.getMinutes()]).toEqual([3, 30]);
    expect(pctAddMinutes('01:30', 60)).toBe('02:30');
    // The local reading jumps an hour, honestly, and the type writes what it read.
    expect(pctNow(new Date('2026-03-29T00:30:00Z'))).toBe('01:30');
    expect(pctNow(new Date('2026-03-29T01:30:00Z'))).toBe('03:30');

    // 25 October 2026: 03:00 becomes 02:00, and the local day is 25 hours long.
    expect(
      new Date(2026, 9, 26).getTime() - new Date(2026, 9, 25).getTime(),
    ).toBe(25 * 3_600_000);
    // 02:30 happens twice, and a `Date` has to choose an instant the wall clock never named:
    // the first. An hour on from it, the local clock shows 02:30 again.
    const fold = new Date(2026, 9, 25, 2, 30);
    expect(fold.toISOString()).toBe('2026-10-25T00:30:00.000Z');
    const again = new Date(fold.getTime() + 3_600_000);
    expect([again.getHours(), again.getMinutes()]).toEqual([2, 30]);
    // Two instants, one time on the face — and the arithmetic says the next hour is 03:30.
    expect(pctNow(new Date('2026-10-25T00:30:00Z'))).toBe('02:30');
    expect(pctNow(new Date('2026-10-25T01:30:00Z'))).toBe('02:30');
    expect(pctAddMinutes('02:30', 60)).toBe('03:30');

    // A day of the wall clock is 1440 minutes on both switches, because it is never local.
    for (const time of ['00:00', '01:30', '02:30', '03:30'])
      expect(pctAddMinutes(time, 1440)).toBe(time);
  });
});
