/**
 * The LAWS of `day.ts`, swept rather than walked.
 *
 * `day.spec.ts` next door walks the cases a person picked: the leap day, the month boundary,
 * the clock fourteen hours east of the meridian. That is the right instrument for a defect
 * somebody has already imagined. This file is the other half — the invariants a CALLER is
 * entitled to lean on, held over a few thousand generated days at once: a walk and the walk
 * back, a weekday the platform's own epoch fixes, a grid that is six whole weeks whatever
 * month it is asked for, an order that agrees with the time between two days.
 *
 * A law stated from the inside is worth nothing here: it would be green for the same reason
 * the code is, and the mutant that breaks both would walk away. So the oracles below are
 * outside ones — the platform's own millisecond count, its epoch, `toISOString`, `Intl` in UTC
 * and in the local zone, the three fields read back as numbers — and never the expression
 * under test written a second time.
 *
 * Every function here is pure ([0043](../../../../docs/decisions/0043-a-day-is-not-an-instant.md)
 * — a day is a string and the arithmetic never asks what time it is), so a case costs a
 * handful of `Date` constructions and the counts can be high. `pctToday` is the exception and
 * has the sweep that fits it.
 *
 * **The two boundaries this file used to narrow around are laws in it now.** Both were defects
 * the earlier version of this sweep found and both are repaired in `day.ts` (5.1): the year
 * below zero, where `pctDay` wrote `'00-1-12-31'` into the shape and handed it on, and the
 * year above `9999`, where `pctCompareDays` compared the string and sorted eleven characters
 * among ten. So the ranges reach them instead of stopping short — the order is swept across
 * the four-digit boundary, and the refusal outside the domain is stated in both directions.
 *
 * **Two silences, on purpose.** `pctClampDay` with `min` after `max` and `pctMonthGrid` with a
 * `firstDayOfWeek` outside `1..7` both answer something today, and neither answer is a
 * contract: the first is the order the two branches happen to be written in, the second is the
 * ring arithmetic running on a number nobody meant. Stating either would make this file the
 * place the contract was decided, which is the entrypoint's job and not a sweep's.
 */

import {
  PctArbitrary,
  pctForAll,
  pctInt,
  pctRecord,
} from '../../testing/src/property.testkit';
import {
  isPctDay,
  PctDay,
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

const MS_PER_DAY = 86_400_000;

/**
 * The first and last days `pctDay` can write, both measured rather than read off the error
 * message: the floor is year zero, and the ceiling was found by walking `pctAddDays` up from
 * `275760-01-01` until it refused. The first draft of that message said "year 0 to 275759" —
 * 256 days short of where the ECMAScript range really ends, which is why the two constants
 * below are a measurement and not a quotation.
 */
const FIRST_DAY = '0000-01-01';
const LAST_DAY = '275760-09-13';

// --- the ranges cases are drawn from ---

/** Wide on purpose: below `0100`, above `9999`, and well inside what a `Date` can hold. */
const ANY_YEAR = pctInt(0, 99_999);

/** Every year the shape can write, for the law that says each of them builds a day. */
const DOMAIN_YEARS = pctInt(0, 275_759);

/** A year with a year after it, for the laws that measure one against the next. */
const CALENDAR_YEARS = pctInt(1, 99_000);

/**
 * Room underneath for a composed walk of two hundred and twenty years, which is the widest a
 * case below reaches. The floor is not tidiness: a walk that leaves the domain is a
 * `RangeError` now, and that refusal is a law of its own further down — these sweeps are about
 * the arithmetic inside the domain, so they stay inside it.
 */
const WALK_YEARS = pctInt(400, 90_000);

/** Room underneath and above for a composed month step of seven and a half centuries. */
const MONTH_YEARS = pctInt(900, 9_000);

/**
 * Four digits AND five, on both sides of the boundary the order used to break at.
 * `pctCompareDays` compared the string until 5.1, and ten characters stand after eleven
 * lexicographically, so `pctCompareDays('2026-01-01', '10000-01-01')` answered `1` — the later
 * day reported as the earlier one, and `pctClampDay` pulling a day four thousand years past
 * `max` down to `min`. It reads the three fields now, and this range is what holds it there:
 * at the fixed seed, 80 of the 400 pairs the order sweep draws have one year of each width
 * (counted, not hoped for).
 */
const ORDERED_YEARS = pctInt(1, 99_999);

/** The grid reaches a week either side of its month, with the domain's room on both sides. */
const GRID_YEARS = pctInt(100, 99_000);

// --- how a case becomes a day ---

interface PctFields {
  readonly year: number;
  readonly month: number;
  readonly day: number;
}

/** Day of the month drawn up to 31, so the short months are in the sweep and not excluded. */
const fieldsIn = (year: PctArbitrary<number>): PctArbitrary<PctFields> =>
  pctRecord<PctFields>({ year, month: pctInt(1, 12), day: pctInt(1, 31) });

/**
 * `pctDaysInMonth` is what holds the drawn day of the month to the month naming it — the
 * function under test building the cases of its neighbours, which is safe in the one
 * direction that matters here: a length that let 31 into February would make `pctDay`
 * normalise into March, and the first property below is exactly the one that says so.
 */
const dayOf = ({ year, month, day }: PctFields): PctDay =>
  pctDay(year, month, Math.min(day, pctDaysInMonth(year, month)));

const pad2 = (value: number): string => String(value).padStart(2, '0');

/**
 * The order of two days read from their three fields as numbers — the independent witness
 * `pctCompareDays` is held against, because a comparison checked against itself is a
 * tautology with a test runner around it.
 */
function chronological(a: PctDay, b: PctDay): number {
  const x = pctDayParts(a);
  const y = pctDayParts(b);
  return (
    Math.sign(x.year - y.year) ||
    Math.sign(x.month - y.month) ||
    Math.sign(x.day - y.day)
  );
}

/**
 * The ISO weekday read from the platform's own epoch instead of from `pctWeekday`:
 * 1970-01-01 was a Thursday, which is ISO `4`. A day here is midnight UTC, so its `getTime()`
 * is an exact multiple of `MS_PER_DAY` and the count of whole days from the epoch fixes the
 * phase of the ring for every other day, in both directions. This is the one absolute fact
 * this file states about the calendar; everything else it says about weekdays follows from it.
 */
const isoWeekdayOf = (day: PctDay): number =>
  ((((Math.floor(pctDayAsUtc(day).getTime() / MS_PER_DAY) + 3) % 7) + 7) % 7) +
  1;

/**
 * The strings `pctDay` writes, as a predicate — the independent half of `isPctDay`'s contract.
 * The parse here is deliberately LOOSER than `day.ts`'s own (`\d+` in every field, no width),
 * so a candidate is refused for the reason a reader would name — that is not the string this
 * library writes for those three fields — and not for failing the very regex under test.
 * `pctDay` throwing counts as a refusal: a string naming a day outside the domain is not one
 * of the strings it writes either.
 */
function writtenBack(candidate: unknown): boolean {
  if (typeof candidate !== 'string') return false;
  const fields = /^(\d+)-(\d+)-(\d+)$/.exec(candidate);
  if (fields === null) return false;
  try {
    return (
      pctDay(Number(fields[1]), Number(fields[2]), Number(fields[3])) ===
      candidate
    );
  } catch {
    return false;
  }
}

/**
 * The near misses of one day: the string itself, its calendar edges, each field one digit
 * short, the anchors tested at both ends, a separator that is not a hyphen, and two values
 * that are not strings at all. Every one of them is a string the sweep did NOT build with
 * `pctDay`, which is the gap they exist to close.
 */
function nearMissesOf(day: PctDay): readonly unknown[] {
  const { year, month, day: d } = pctDayParts(day);
  const stem = `${day.slice(0, -6)}-${pad2(month)}`;
  const last = pctDaysInMonth(year, month);
  return [
    day,
    `${stem}-${pad2(last)}`,
    `${stem}-${pad2(last + 1)}`,
    `${stem}-00`,
    `${day.slice(0, -6)}-00-${pad2(d)}`,
    `${day.slice(0, -6)}-13-${pad2(d)}`,
    `${day.slice(0, -6)}-${month}-${pad2(d)}`,
    `${stem}-${d}`,
    `${day.slice(1, -6)}-${pad2(month)}-${pad2(d)}`,
    `${day}x`,
    `x${day}`,
    ` ${day} `,
    day.replaceAll('-', '/'),
    day.replaceAll('-', ''),
    '',
    [day],
    Number(day.replaceAll('-', '')),
  ];
}

/** `typeof` and all, so a failure names the candidate that disagreed and not just its text. */
const reading = (candidate: unknown): string =>
  `${typeof candidate} ${String(candidate)}`;

describe('pctDay and pctDayParts', () => {
  it('reads back exactly the three fields it was built from, five-digit years and all', () => {
    pctForAll(
      // The four-digit years get a draw of their own: they are a tenth of `ANY_YEAR`, and the
      // shape is a promise about them in particular.
      pctRecord({ fields: fieldsIn(ANY_YEAR), inShape: pctInt(0, 9_999) }),
      ({ fields, inShape }) => {
        const { year, month, day } = fields;
        const inRange = Math.min(day, pctDaysInMonth(year, month));
        const built = pctDay(year, month, inRange);
        expect(isPctDay(built)).toBe(true);
        expect(pctDayParts(built)).toEqual({ year, month, day: inRange });

        // The SHAPE, with the platform as the writer of it: ECMAScript's own `toISOString`
        // writes `YYYY-MM-DD` for every year through `9999` — the ten characters the header's
        // consumers take. The edit this catches is `pad(date.getUTCFullYear(), 4)` widened to
        // `pad(..., 5)`: `pctDay(2026, 8, 27)` then answers `'02026-08-27'`, which `isPctDay`
        // still accepts (its shape is `\d{4,}`) and `pctDayParts` still round-trips, so the
        // readback above cannot see it and nor could anything else here.
        const written = pctDay(
          inShape,
          month,
          Math.min(day, pctDaysInMonth(inShape, month)),
        );
        expect(written).toBe(pctDayAsUtc(written).toISOString().slice(0, 10));
      },
      { runs: 400 },
    );
  });

  it('normalises a month past twelve and a day of zero the way a person expects', () => {
    pctForAll(
      pctRecord({
        year: CALENDAR_YEARS,
        month: pctInt(2, 12),
        day: pctInt(1, 28),
      }),
      ({ year, month, day }) => {
        // The docstring promises this and `pctAddMonths` / `pctAddDays` are one line each
        // because of it, but nothing stated it. Day zero is the interesting direction: the
        // left side is the platform's own normalisation and the right side is the length
        // function, so this is also where a wrong month length shows — measured, it fires for
        // `? 29 : 28` -> `? 28 : 28`, for a `pctDaysInMonth` that answers 28 everywhere, and
        // for dropping `month === 6` from the 30-day list.
        expect(pctDay(year, month, 0)).toBe(
          pctDay(year, month - 1, pctDaysInMonth(year, month - 1)),
        );
        expect(pctDay(year, 13, day)).toBe(pctDay(year + 1, 1, day));
      },
      { runs: 300 },
    );
  });

  it('writes every day in the domain, and refuses what the shape cannot carry', () => {
    // The edges, once: year zero is a day, the last day the ECMAScript range holds is a day,
    // and one step past either of them is a `RangeError` and not a string. `pctAddMonths`
    // reaches the floor as readily as `pctAddDays` does.
    expect(pctDay(0, 1, 1)).toBe(FIRST_DAY);
    expect(pctDay(275_760, 9, 13)).toBe(LAST_DAY);
    expect(isPctDay(LAST_DAY)).toBe(true);
    expect(() => pctDay(275_760, 9, 14)).toThrow(RangeError);
    expect(() => pctDay(-1, 1, 1)).toThrow(RangeError);
    expect(() => pctAddMonths('0001-01-01', -13)).toThrow(RangeError);

    pctForAll(
      pctRecord({ fields: fieldsIn(DOMAIN_YEARS), steps: pctInt(1, 40_000) }),
      ({ fields, steps }) => {
        // Inside the domain a built day is always a day — every other sweep here leans on
        // that, over a narrower range than the one the shape actually spans.
        expect(isPctDay(dayOf(fields))).toBe(true);
        // And outside it the refusal is LOUD, in both directions. `pctAddDays(FIRST_DAY, -1)`
        // used to answer `'00-1-12-31'` — a string `isPctDay` refuses and `pctDayParts` throws
        // a `TypeError` on, four calls away from the walk that caused it. The two edits these
        // two lines catch are the two halves of the guard: `landed < 0` for the first, and
        // `!Number.isFinite(landed)` for the second, where the fields have gone `NaN`.
        expect(() => pctAddDays(FIRST_DAY, -steps)).toThrow(RangeError);
        expect(() => pctAddDays(LAST_DAY, steps)).toThrow(RangeError);
      },
      { runs: 150 },
    );
  });
});

describe('isPctDay', () => {
  it('accepts exactly the strings pctDay writes, and refuses every near miss', () => {
    pctForAll(
      fieldsIn(ANY_YEAR),
      (fields) => {
        // Every other input this file hands `isPctDay` is a string it has just built, so the
        // whole refusal side was unreachable and six single edits survived the sweep:
        // deleting `if (month < 1 || month > 12) return false;`, relaxing `(\d{2})` to
        // `(\d{1,2})` or `(\d{4,})` to `(\d{1,})`, dropping either anchor of `SHAPE`, and
        // deleting the `typeof value !== 'string'` guard. Each makes one candidate below read
        // as a day; the two calendar candidates catch `day >= 1` -> `day >= 0` and
        // `day <= pctDaysInMonth(...)` -> `day < pctDaysInMonth(...)` as well.
        const candidates = nearMissesOf(dayOf(fields));
        // One string of verdicts rather than an assertion each: the diff names the candidate
        // that disagreed, and a sweep pays for every `expect` it makes once per mutant.
        expect(
          candidates.map((c) => `${reading(c)}: ${isPctDay(c)}`).join('\n'),
        ).toBe(
          candidates.map((c) => `${reading(c)}: ${writtenBack(c)}`).join('\n'),
        );
      },
      { runs: 250 },
    );
  });
});

describe('pctDaysInMonth', () => {
  it('sums a year to the days the platform itself counts between two Januaries', () => {
    pctForAll(
      CALENDAR_YEARS,
      (year) => {
        const lengths = Array.from({ length: 12 }, (_, i) =>
          pctDaysInMonth(year, i + 1),
        );
        const sum = lengths.reduce((total, days) => total + days, 0);
        // Against the calendar rather than against the leap rule written twice: the distance
        // from one 1 January to the next IS the length of the year.
        const measured =
          (pctDayAsUtc(pctDay(year + 1, 1, 1)).getTime() -
            pctDayAsUtc(pctDay(year, 1, 1)).getTime()) /
          MS_PER_DAY;
        expect(sum).toBe(measured);
      },
      { runs: 400 },
    );
  });

  it('is the number of steps from a month to the next', () => {
    pctForAll(
      pctRecord({ year: CALENDAR_YEARS, month: pctInt(1, 12) }),
      ({ year, month }) => {
        const length = pctDaysInMonth(year, month);
        expect(pctAddDays(pctDay(year, month, 1), length)).toBe(
          pctDay(year, month + 1, 1),
        );
      },
      { runs: 400 },
    );
  });
});

describe('pctAddDays', () => {
  it('is undone by the walk back, and two walks are one walk of their sum', () => {
    pctForAll(
      pctRecord({
        start: fieldsIn(WALK_YEARS),
        a: pctInt(-40_000, 40_000),
        b: pctInt(-40_000, 40_000),
      }),
      ({ start, a, b }) => {
        const day = dayOf(start);
        expect(pctAddDays(day, 0)).toBe(day);
        expect(pctAddDays(pctAddDays(day, a), -a)).toBe(day);
        // Composition says the walk is a TRANSLATION of the day line and not merely
        // something invertible — measured, and worth writing down: an inverted sign passes
        // both of the laws above, and it is the direction below that catches it.
        expect(pctAddDays(pctAddDays(day, a), b)).toBe(pctAddDays(day, a + b));
      },
      { runs: 400 },
    );
  });

  it('moves exactly twenty-four hours of UTC per day, and always in the direction asked', () => {
    pctForAll(
      pctRecord({ start: fieldsIn(WALK_YEARS), n: pctInt(-40_000, 40_000) }),
      ({ start, n }) => {
        const day = dayOf(start);
        const moved = pctAddDays(day, n);
        expect(isPctDay(moved)).toBe(true);
        // The conservation law, and the one a local-time `Date` cannot pass: twice a year a
        // local day is 23 or 25 hours long, and this number never moves off 24 (0043).
        expect(pctDayAsUtc(moved).getTime() - pctDayAsUtc(day).getTime()).toBe(
          n * MS_PER_DAY,
        );
        expect(Math.sign(chronological(moved, day))).toBe(Math.sign(n));
      },
      { runs: 400 },
    );
  });
});

describe('pctWeekday', () => {
  it('is the ISO weekday the platform epoch fixes, Monday 1 through Sunday 7', () => {
    pctForAll(
      pctRecord({ start: fieldsIn(WALK_YEARS), n: pctInt(-40_000, 40_000) }),
      ({ start, n }) => {
        const day = dayOf(start);
        // The PHASE of the ring, which the relative laws that stood here could not state: a
        // weekday compared only against itself one, seven or n days on is the same under every
        // rotation of the seven, and all six non-identity rotations were measured green
        // against the earlier version of this file. The edit this catches is
        // `getUTCDay() || 7` -> `getUTCDay() + 1` — the Sunday-first numbering the docstring
        // exists to refuse, which silently opens `pctMonthGrid(y, m, 1)` on a Sunday. Sunday
        // itself is drawn: 56 of the 400 days this seed builds here are one, so the `|| 7` is
        // under the sweep and not only under the ring law that used to stand for it.
        expect(pctWeekday(day)).toBe(isoWeekdayOf(day));
        // The same on the far side of a walk, which is what `pctMonthGrid`'s lead leans on:
        // the ring and the day line agree about where the walk landed.
        const moved = pctAddDays(day, n);
        expect(pctWeekday(moved)).toBe(isoWeekdayOf(moved));
      },
      { runs: 400 },
    );
  });
});

describe('pctAddMonths', () => {
  it('lands in the month it was asked for and never past the end of it', () => {
    pctForAll(
      pctRecord({ start: fieldsIn(MONTH_YEARS), n: pctInt(-4_500, 4_500) }),
      ({ start, n }) => {
        const day = dayOf(start);
        const from = pctDayParts(day);
        const moved = pctAddMonths(day, n);
        const landed = pctDayParts(moved);
        expect(isPctDay(moved)).toBe(true);
        // The month is the one counted out, whatever the clamp then does to the day: a step
        // that slid a month over a 31st would move the calendar's cursor twice.
        expect(landed.year * 12 + landed.month - 1).toBe(
          from.year * 12 + from.month - 1 + n,
        );
        // The day of the month is KEPT unless the month it lands in is too short, and then it
        // is that month's LAST day — said through the walk, not through `pctDaysInMonth`,
        // which the implementation itself calls: a clamp checked against the same length
        // function moves with it and can only ever confirm the clamp's shape. The edit this
        // catches is `Math.min(d, pctDaysInMonth(y, m))` -> `Math.max(...)`.
        expect(landed.day).toBeLessThanOrEqual(from.day);
        if (landed.day !== from.day)
          expect(pctDayParts(pctAddDays(moved, 1)).day).toBe(1);
      },
      { runs: 400 },
    );
  });

  it('is undone by the opposite step for any day of the month every month has', () => {
    pctForAll(
      pctRecord({
        start: pctRecord({
          year: MONTH_YEARS,
          month: pctInt(1, 12),
          day: pctInt(1, 28),
        }),
        a: pctInt(-4_500, 4_500),
        b: pctInt(-4_500, 4_500),
      }),
      ({ start, a, b }) => {
        const day = pctDay(start.year, start.month, start.day);
        expect(pctAddMonths(day, 0)).toBe(day);
        expect(pctAddMonths(pctAddMonths(day, a), -a)).toBe(day);
        expect(pctAddMonths(pctAddMonths(day, a), b)).toBe(
          pctAddMonths(day, a + b),
        );
        // Twelve months on is the same day of the same month a year later — the one step
        // stated in years, where everything above it is stated in a count of months.
        expect(pctAddMonths(day, 12)).toBe(
          pctDay(start.year + 1, start.month, start.day),
        );
      },
      { runs: 400 },
    );
  });
});

describe('pctCompareDays', () => {
  it('is a total order that agrees with the time between the two days', () => {
    pctForAll(
      pctRecord({
        a: fieldsIn(ORDERED_YEARS),
        b: fieldsIn(ORDERED_YEARS),
        c: fieldsIn(ORDERED_YEARS),
      }),
      ({ a, b, c }) => {
        const x = dayOf(a);
        const y = dayOf(b);
        const z = dayOf(c);
        expect(pctCompareDays(x, x)).toBe(0);
        // Antisymmetry as a sum, because `-0` and `0` are not the same value to `toBe`.
        expect(pctCompareDays(x, y) + pctCompareDays(y, x)).toBe(0);
        expect(pctCompareDays(x, y)).toBe(chronological(x, y));
        expect(
          Math.sign(pctDayAsUtc(x).getTime() - pctDayAsUtc(y).getTime()),
        ).toBe(pctCompareDays(x, y));
        // Transitivity: the half of "total order" no two-day case can see.
        if (pctCompareDays(x, y) <= 0 && pctCompareDays(y, z) <= 0)
          expect(pctCompareDays(x, z)).toBeLessThanOrEqual(0);
      },
      { runs: 400 },
    );
  });
});

describe('pctClampDay', () => {
  it('lands inside the bounds, and is the day itself when it was inside', () => {
    pctForAll(
      pctRecord({
        day: fieldsIn(ORDERED_YEARS),
        one: fieldsIn(ORDERED_YEARS),
        two: fieldsIn(ORDERED_YEARS),
      }),
      ({ day, one, two }) => {
        const subject = dayOf(day);
        const first = dayOf(one);
        const second = dayOf(two);
        const ordered = chronological(first, second) <= 0;
        const min = ordered ? first : second;
        const max = ordered ? second : first;

        const held = pctClampDay(subject, min, max);
        expect(chronological(held, min)).toBeGreaterThanOrEqual(0);
        expect(chronological(held, max)).toBeLessThanOrEqual(0);
        // A clamp invents no day: it hands back the one it was given or a bound it was told.
        expect([subject, min, max]).toContain(held);
        if (
          chronological(subject, min) >= 0 &&
          chronological(subject, max) <= 0
        )
          expect(held).toBe(subject);

        // A bound the schema did not set is a bound the directive does not pass, and an
        // absent bound holds nothing back.
        expect(pctClampDay(subject, undefined, undefined)).toBe(subject);
        expect(pctClampDay(subject, min, undefined)).toBe(
          chronological(subject, min) < 0 ? min : subject,
        );
        expect(pctClampDay(subject, undefined, max)).toBe(
          chronological(subject, max) > 0 ? max : subject,
        );
      },
      { runs: 400 },
    );
  });
});

// --- the readers on the other side of the boundary ---

/** A formatter may group a five-digit year, and a separator is a fact about the locale. */
const digitsOf = (value: string | undefined): number =>
  Number((value ?? '').replace(/\D/g, ''));

const fieldsRead = (
  formatter: Intl.DateTimeFormat,
  instant: Date,
): Record<string, string> =>
  Object.fromEntries(
    formatter.formatToParts(instant).map((part) => [part.type, part.value]),
  );

/**
 * `Intl` told the zone the day claims to be in, and `Intl` in the zone the machine is set to —
 * the second road to the local calendar, which is the one `pctToday` reads with `Date`'s local
 * getters. Both are built once, because a formatter is the expensive object in this file.
 */
const utcFields = new Intl.DateTimeFormat('en-US-u-ca-gregory', {
  timeZone: 'UTC',
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  era: 'short',
});
const localFields = new Intl.DateTimeFormat('en-US-u-ca-gregory', {
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
});

describe('pctToday', () => {
  it('is the local calendar day of the instant it is given', () => {
    // An unreadable clock is refused loudly too, rather than written as `'0NaN-NaN-NaN'`.
    expect(() => pctToday(new Date(NaN))).toThrow(RangeError);

    pctForAll(
      // Milliseconds rather than fields: `pctToday`'s argument is an INSTANT, and the times of
      // day either side of local midnight are where the 0043 defect lives. The span is
      // 1906 to 2096, which is the range a clock on a machine plausibly reads.
      pctInt(-2_000_000_000_000, 4_000_000_000_000),
      (ms) => {
        const now = new Date(ms);
        const today = pctToday(now);
        expect(isPctDay(today)).toBe(true);
        // The one function here that asks what time it is, held against `Intl` in the same
        // zone — a different road to the local calendar than `Date`'s local getters. The edit
        // this catches is `now.getMonth() + 1` -> `now.getMonth()`, measured dead in all three
        // zones tried (the machine's, `UTC`, `Pacific/Kiritimati`). What it does NOT catch is
        // `getDate()` -> `getUTCDate()` on a machine set to UTC, where the local day and the
        // UTC day are the same: `day.spec.ts` moves the clock to Kiritimati for that, which a
        // sweep cannot do under the mutation runner (its own note says why).
        const read = fieldsRead(localFields, now);
        const parts = pctDayParts(today);
        expect(digitsOf(read['year'])).toBe(parts.year);
        expect(digitsOf(read['month'])).toBe(parts.month);
        expect(digitsOf(read['day'])).toBe(parts.day);
      },
      { runs: 200 },
    );
  });
});

describe('pctDayAsUtc', () => {
  it('is midnight UTC, and Intl reads back the three fields the day was built from', () => {
    pctForAll(
      fieldsIn(CALENDAR_YEARS),
      (fields) => {
        const day = dayOf(fields);
        const parts = pctDayParts(day);
        const instant = pctDayAsUtc(day);

        expect(instant.getUTCHours()).toBe(0);
        expect(instant.getUTCMinutes()).toBe(0);
        expect(instant.getUTCSeconds()).toBe(0);
        expect(instant.getUTCMilliseconds()).toBe(0);
        expect(instant.toISOString().endsWith('T00:00:00.000Z')).toBe(true);

        const read = fieldsRead(utcFields, instant);
        expect(digitsOf(read['year'])).toBe(parts.year);
        expect(digitsOf(read['month'])).toBe(parts.month);
        expect(digitsOf(read['day'])).toBe(parts.day);
        // The era is why the sweep starts at year 1: `0000` is 1 BC to a Gregorian calendar,
        // and the fields it reads back are the ones of a year this shape cannot write.
        expect(read['era']).toBe('AD');
      },
      { runs: 300 },
    );
  });
});

describe('pctMonthGrid', () => {
  it('is six whole weeks of consecutive days, each column the weekday of its position', () => {
    pctForAll(
      pctRecord({
        year: GRID_YEARS,
        month: pctInt(1, 12),
        firstDayOfWeek: pctInt(1, 7),
      }),
      ({ year, month, firstDayOfWeek }) => {
        const grid = pctMonthGrid(year, month, firstDayOfWeek);
        expect(grid).toHaveLength(6);
        for (const week of grid) expect(week).toHaveLength(7);

        const days = grid.flat();
        expect(new Set(days).size).toBe(42);
        for (let i = 1; i < days.length; i++)
          expect(days[i]).toBe(pctAddDays(days[i - 1], 1));

        for (const week of grid)
          week.forEach((day, column) =>
            expect(pctWeekday(day)).toBe(
              ((firstDayOfWeek - 1 + column) % 7) + 1,
            ),
          );
      },
      { runs: 300 },
    );
  });

  it('holds every day of the month it is the grid of, in the row the month opens in', () => {
    pctForAll(
      pctRecord({
        year: GRID_YEARS,
        month: pctInt(1, 12),
        firstDayOfWeek: pctInt(1, 7),
      }),
      ({ year, month, firstDayOfWeek }) => {
        const grid = pctMonthGrid(year, month, firstDayOfWeek);
        const days = new Set(grid.flat());
        for (let d = 1; d <= pctDaysInMonth(year, month); d++)
          expect(days.has(pctDay(year, month, d))).toBe(true);

        // Where the 1st sits IS the lead, and this is the whole of it: with the columns pinned
        // above, the first row holding the 1st says the grid opens on or before it AND less
        // than a week before it. Measured over eight single edits of
        // `(pctWeekday(first) - firstDayOfWeek + 7) % 7` — the sign flipped, `% 7` made `* 7`,
        // `+ 7` made `- 7`, the lead zeroed, negated, and shifted a whole week each way — this
        // line fires for every one that the pair of `chronological` assertions it replaced
        // fired for, and it says the law in the terms a calendar panel is built on.
        expect(grid[0]).toContain(pctDay(year, month, 1));
      },
      { runs: 300 },
    );
  });
});
