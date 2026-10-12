/**
 * The LAWS of `datetime.ts`, swept rather than walked.
 *
 * `datetime.spec.ts` next door walks the cases a person picked: midnight, the two switches in
 * Warsaw, the clock fourteen hours east of the meridian. This file is the other half — the
 * invariants a CALLER is entitled to lean on, held over generated values: a step and the step
 * back, two steps and one step of their sum, a step that carries the day exactly as the
 * platform counts milliseconds, an order that agrees with them, a clamp that holds what it held.
 *
 * The oracles are outside ones, as in `day.property.spec.ts` and `time.property.spec.ts`: the
 * platform's own millisecond count in UTC, its UTC getters as the writer of the shape, `Intl` in
 * the local zone. Never the expression under test written a second time.
 *
 * **The edges are drawn, not hoped for** ([`lesson-185`](../../../../docs/lessons.md#lesson-185)):
 * the days are drawn from the whole domain the day's module allows — year zero to the last day
 * the ECMAScript range holds — as well as from a century near now, the walks cross midnight in
 * most cases, and the domain is stated in both directions at both of its ends.
 */

import {
  pctForAll,
  pctInt,
  pctOneOf,
  pctRecord,
} from '../../testing/src/property.testkit';
import {
  isPctDateTime,
  pctAddDateTimeMinutes,
  pctClampDateTime,
  pctCompareDateTimes,
  pctDateTime,
  PctDateTime,
  pctDateTimeAsUtc,
  pctDateTimeParts,
  pctNowDateTime,
} from './datetime';

/** The first day of the domain, 0000-01-01, and the last, 275760-09-13, as days since 1970. */
const FIRST = -719_528;
const LAST = 100_000_000;
const DAY_MS = 86_400_000;

// --- how a case becomes a value ---

interface Case {
  /** Which range the day is drawn from — a century near now, or the whole domain. */
  readonly era: 'near' | 'any';
  readonly near: number;
  readonly any: number;
  readonly hour: number;
  readonly minute: number;
  readonly second: number;
  /** Whether the time is written with its seconds. */
  readonly seconds: boolean;
}

/** `near` first: `pctOneOf` shrinks towards it, and 2026 is the plainer case. */
const anyCase = pctRecord<Case>({
  era: pctOneOf(['near', 'any'] as const),
  near: pctInt(-3650, 36_500),
  any: pctInt(FIRST, LAST),
  hour: pctInt(0, 23),
  minute: pctInt(0, 59),
  second: pctInt(0, 59),
  seconds: pctOneOf([false, true]),
});

const indexOf = (c: Case): number => (c.era === 'near' ? c.near : c.any);

/** The day as the platform's UTC getters write it — the shape, from outside the module. */
const dayOf = (index: number): string => {
  const date = new Date(index * DAY_MS);
  const pad = (n: number, width: number) => String(n).padStart(width, '0');
  return `${pad(date.getUTCFullYear(), 4)}-${pad(date.getUTCMonth() + 1, 2)}-${pad(date.getUTCDate(), 2)}`;
};

const timeOf = (c: Case): string => {
  const pad = (n: number) => String(n).padStart(2, '0');
  const time = `${pad(c.hour)}:${pad(c.minute)}`;
  return c.seconds ? `${time}:${pad(c.second)}` : time;
};

const valueOf = (c: Case): PctDateTime =>
  pctDateTime(dayOf(indexOf(c)), timeOf(c));

/** Seconds since 1970-01-01T00:00 on the wall — the order's oracle, over the whole domain. */
const totalOf = (c: Case): number =>
  indexOf(c) * 86_400 +
  (c.hour * 60 + c.minute) * 60 +
  (c.seconds ? c.second : 0);

describe('pctDateTime, pctDateTimeParts and isPctDateTime', () => {
  it('joins the shape the platform writes, splits it back, and is accepted', () => {
    pctForAll(
      anyCase,
      (c) => {
        const day = dayOf(indexOf(c));
        const time = timeOf(c);
        const value = pctDateTime(day, time);
        expect(value).toBe(`${day}T${time}`);
        expect(pctDateTimeParts(value)).toEqual({ day, time });
        expect(isPctDateTime(value)).toBe(true);
      },
      { runs: 400 },
    );
  });

  it('refuses every near miss of a value it accepts', () => {
    pctForAll(anyCase, (c) => {
      const value = valueOf(c);
      const { day, time } = pctDateTimeParts(value);
      const misses = [
        value.replace('T', ' '),
        value.replace('T', 't'),
        `${value}Z`,
        `${value}+01:00`,
        `${value}-05:00`,
        `${day}T${time.length > 5 ? time : `${time}:00`}.5`,
        `${day}T24${time.slice(2)}`,
        `${day}T${time.slice(0, 3)}60`,
        `${day}TT${time}`,
        `${day}`,
        `T${time}`,
        `${day.slice(0, -2)}32T${time}`,
        ` ${value}`,
        `${value} `,
      ];
      for (const miss of misses) expect(isPctDateTime(miss)).toBe(false);
    });
  });
});

describe('pctDateTimeAsUtc', () => {
  it('is the platform’s own UTC instant of the fields, everywhere before the range ends', () => {
    pctForAll(
      anyCase,
      (c) => {
        const value = valueOf(c);
        const ms = totalOf(c) * 1000;
        // The ECMAScript range ends at the last day's midnight: every later minute is a value
        // and no `Date`.
        if (ms > 8.64e15) {
          expect(() => pctDateTimeAsUtc(value)).toThrow(RangeError);
          return;
        }
        expect(pctDateTimeAsUtc(value).getTime()).toBe(ms);
      },
      { runs: 400 },
    );
  });
});

describe('pctAddDateTimeMinutes', () => {
  const step = pctRecord({
    at: anyCase,
    n: pctInt(-10_000_000, 10_000_000),
    small: pctInt(-3 * 1440, 3 * 1440),
    big: pctOneOf([false, true]),
  });

  it('moves the pair exactly as the platform counts minutes — the day carries — or leaves the domain loudly', () => {
    pctForAll(
      step,
      ({ at, n: far, small, big }) => {
        const n = big ? far : small;
        const value = valueOf(at);
        const total = totalOf(at) + n * 60;
        // Where the day the walk lands on is, read off the seconds alone.
        const landed = Math.floor(total / 86_400);
        if (landed < FIRST || landed > LAST) {
          expect(() => pctAddDateTimeMinutes(value, n)).toThrow(RangeError);
          return;
        }
        const moved = pctAddDateTimeMinutes(value, n);
        expect(isPctDateTime(moved)).toBe(true);
        // The shape the value was given: a whole minute never moves the seconds.
        expect(pctDateTimeParts(moved).time.length).toBe(
          pctDateTimeParts(value).time.length,
        );
        expect(pctDateTimeParts(moved).day).toBe(dayOf(landed));
        if (total * 1000 <= 8.64e15)
          expect(pctDateTimeAsUtc(moved).getTime()).toBe(total * 1000);
      },
      { runs: 600 },
    );
  });

  it('is undone by the step back, and two steps are one step of their sum', () => {
    const two = pctRecord({
      at: anyCase,
      a: pctInt(-5 * 1440, 5 * 1440),
      b: pctInt(-5 * 1440, 5 * 1440),
    });
    pctForAll(two, ({ at, a, b }) => {
      // A century near now, so neither walk leaves the domain.
      const value = valueOf({ ...at, era: 'near' });
      expect(pctAddDateTimeMinutes(pctAddDateTimeMinutes(value, a), -a)).toBe(
        value,
      );
      expect(pctAddDateTimeMinutes(pctAddDateTimeMinutes(value, a), b)).toBe(
        pctAddDateTimeMinutes(value, a + b),
      );
    });
  });

  it('stops at both ends of the domain, in both directions', () => {
    const walk = pctInt(1, 3 * 1440);
    pctForAll(walk, (k) => {
      const first = '0000-01-01T00:00';
      const last = '275760-09-13T23:59';
      // Off the end is refused; into the domain from the end is a value, and comes back.
      expect(() => pctAddDateTimeMinutes(first, -k)).toThrow(RangeError);
      expect(() => pctAddDateTimeMinutes(last, k)).toThrow(RangeError);
      expect(pctAddDateTimeMinutes(pctAddDateTimeMinutes(first, k), -k)).toBe(
        first,
      );
      expect(pctAddDateTimeMinutes(pctAddDateTimeMinutes(last, -k), k)).toBe(
        last,
      );
    });
  });

  it('refuses every movement that is not a whole number of minutes', () => {
    pctForAll(pctInt(-1000, 1000), (n) => {
      expect(() =>
        pctAddDateTimeMinutes('2026-12-01T13:05', n + 0.5),
      ).toThrow(RangeError);
    });
    for (const n of [NaN, Infinity, -Infinity])
      expect(() => pctAddDateTimeMinutes('2026-12-01T13:05', n)).toThrow(
        RangeError,
      );
  });
});

describe('pctCompareDateTimes', () => {
  it('is a total order that agrees with the seconds between two values, over the whole domain', () => {
    pctForAll(
      pctRecord({ a: anyCase, b: anyCase }),
      ({ a, b }) => {
        const expected = Math.sign(totalOf(a) - totalOf(b));
        expect(pctCompareDateTimes(valueOf(a), valueOf(b))).toBe(expected);
        expect(pctCompareDateTimes(valueOf(b), valueOf(a))).toBe(
          -expected || 0,
        );
        expect(pctCompareDateTimes(valueOf(a), valueOf(a))).toBe(0);
      },
      { runs: 400 },
    );
  });

  it('reads the two shapes of one value as equal', () => {
    pctForAll(anyCase, (c) => {
      const short = valueOf({ ...c, seconds: false });
      expect(pctCompareDateTimes(short, `${short}:00`)).toBe(0);
    });
  });
});

describe('pctClampDateTime', () => {
  const three = pctRecord({ v: anyCase, lo: anyCase, hi: anyCase });

  it('lands inside an ordered window, invents no value, and keeps one already inside', () => {
    pctForAll(
      three,
      ({ v, lo, hi }) => {
        const [low, high] = totalOf(lo) <= totalOf(hi) ? [lo, hi] : [hi, lo];
        const value = valueOf(v);
        const min = valueOf(low);
        const max = valueOf(high);
        const held = pctClampDateTime(value, min, max);
        expect([value, min, max]).toContain(held);
        expect(pctCompareDateTimes(held, min)).toBeGreaterThanOrEqual(0);
        expect(pctCompareDateTimes(held, max)).toBeLessThanOrEqual(0);
        if (totalOf(low) <= totalOf(v) && totalOf(v) <= totalOf(high))
          expect(held).toBe(value);
        // What it held, it holds.
        expect(pctClampDateTime(held, min, max)).toBe(held);
      },
      { runs: 400 },
    );
  });

  it('holds nothing with a reversed pair, wherever the value stands', () => {
    pctForAll(three, ({ v, lo, hi }) => {
      if (totalOf(lo) === totalOf(hi)) return;
      const [low, high] = totalOf(lo) < totalOf(hi) ? [lo, hi] : [hi, lo];
      const value = valueOf(v);
      expect(pctClampDateTime(value, valueOf(high), valueOf(low))).toBe(value);
    });
  });
});

describe('pctNowDateTime', () => {
  it('is the local wall-clock day and time of the instant, as Intl reads it in the same zone', () => {
    const local = new Intl.DateTimeFormat('en-US', {
      calendar: 'gregory',
      numberingSystem: 'latn',
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    // Instants from 1970 to 2100, to the millisecond.
    pctForAll(
      pctRecord({
        ms: pctInt(0, 4_102_444_800_000),
        seconds: pctOneOf([false, true]),
      }),
      ({ ms, seconds }) => {
        const parts = Object.fromEntries(
          local
            .formatToParts(new Date(ms))
            .map((part) => [part.type, part.value]),
        );
        const time = `${parts['hour']}:${parts['minute']}`;
        expect(pctNowDateTime(new Date(ms), seconds)).toBe(
          `${parts['year']}-${parts['month']}-${parts['day']}T${seconds ? `${time}:${parts['second']}` : time}`,
        );
      },
      { runs: 400 },
    );
  });
});
