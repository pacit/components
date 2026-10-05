/**
 * The LAWS of `time.ts`, swept rather than walked.
 *
 * `time.spec.ts` next door walks the cases a person picked: midnight, the night shift, the clock
 * fourteen hours east of the meridian. This file is the other half — the invariants a CALLER is
 * entitled to lean on, held over generated times: a step and the step back, two steps and one
 * step of their sum, an order that agrees with the seconds between two times, a clamp that
 * holds what it held, a snap that lands on the step and nowhere else.
 *
 * The oracles are outside ones, as in `day.property.spec.ts`: the platform's own millisecond
 * count in UTC, `toISOString` as the writer of the shape, `Intl` in the local zone, and — for
 * the step — the columns' own definition of one they can list, a grid of hours, minutes and
 * seconds that are independent of each other. Never the expression under test written a second
 * time.
 *
 * **The edges are drawn, not hoped for** ([`lesson-185`](../../../../docs/lessons.md#lesson-185)):
 * the walks reach two days either way, so most of them cross midnight; the domain is stated in
 * both directions, at the field edges a worked case would stop short of; and the step is checked
 * against its definition for EVERY whole number of seconds up to a day, not for a sample.
 */

import {
  PctArbitrary,
  pctForAll,
  pctInt,
  pctOneOf,
  pctRecord,
} from '../../testing/src/property.testkit';
import {
  isPctTime,
  isPctTimeStep,
  PctTime,
  pctAddMinutes,
  pctAddSeconds,
  pctClampTime,
  pctCompareTimes,
  pctNow,
  pctSnapToStep,
  pctTime,
  pctTimeOnStep,
  pctTimeParts,
} from './time';

const DAY = 86_400;

// --- how a case becomes a time ---

interface Clock {
  readonly hour: number;
  readonly minute: number;
  readonly second: number;
  /** Whether the time is written with its seconds — `HH:mm:ss` — or without them. */
  readonly seconds: boolean;
}

/** `false` first: `pctOneOf` shrinks towards it, and `HH:mm` is the plainer case. */
const anyClock: PctArbitrary<Clock> = pctRecord<Clock>({
  hour: pctInt(0, 23),
  minute: pctInt(0, 59),
  second: pctInt(0, 59),
  seconds: pctOneOf([false, true]),
});

/** A clock written without seconds drops them — the shape decides, as it does for a caller. */
const timeOf = (clock: Clock): PctTime =>
  clock.seconds
    ? pctTime(clock.hour, clock.minute, clock.second)
    : pctTime(clock.hour, clock.minute);

/** Whether a string carries its seconds, read off the string rather than off the module. */
const hasSeconds = (time: string): boolean => /^\d\d:\d\d:\d\d$/.test(time);

/**
 * The time as a platform instant: that wall-clock time on 1 January 2026, UTC — far from any
 * edge of the range a `Date` holds, so a walk of two days either way stays a plain instant.
 */
const msOf = (time: PctTime): number => {
  const { hour, minute, second } = pctTimeParts(time);
  return Date.UTC(2026, 0, 1, hour, minute, second);
};

/** The wall-clock fields of an instant, read in UTC — the platform's own idea of the ring. */
const clockOf = (instant: Date) => ({
  hour: instant.getUTCHours(),
  minute: instant.getUTCMinutes(),
  second: instant.getUTCSeconds(),
});

// --- the step, defined the way the columns need it ---

/**
 * Whether the columns can list the times on `step`, counted from midnight: the times have to be
 * the same on every lap of the ring — the step divides a day — and they have to form a GRID, every
 * hour that appears with every minute that appears with every second that appears. A step that
 * fails the second test makes the valid minutes depend on the hour, which columns that are
 * fields cannot show (0086 §5). Nothing here mentions minutes dividing hours: that is the rule
 * `isPctTimeStep` is written in, and this is the definition it has to agree with.
 */
function listable(step: number): boolean {
  if (DAY % step !== 0) return false;
  const hours = new Set<number>();
  const minutes = new Set<number>();
  const seconds = new Set<number>();
  for (let at = 0; at < DAY; at += step) {
    hours.add(Math.floor(at / 3600));
    minutes.add(Math.floor(at / 60) % 60);
    seconds.add(at % 60);
  }
  return hours.size * minutes.size * seconds.size === DAY / step;
}

/** Every listable step, a minute first — the default, and where a failing case shrinks to. */
const LISTABLE = Array.from({ length: DAY }, (_, i) => i + 1)
  .filter(listable)
  .sort((a, b) => (a === 60 ? -1 : b === 60 ? 1 : a - b));

describe('pctTime and pctTimeParts', () => {
  it('writes the shape toISOString writes, and reads back the fields it was built from', () => {
    pctForAll(
      anyClock,
      ({ hour, minute, second }) => {
        const iso = new Date(Date.UTC(2026, 0, 1, hour, minute, second))
          .toISOString()
          .slice(11, 19);
        expect(pctTime(hour, minute)).toBe(iso.slice(0, 5));
        expect(pctTime(hour, minute, second)).toBe(iso);
        expect(pctTimeParts(pctTime(hour, minute))).toEqual({
          hour,
          minute,
          second: 0,
        });
        expect(pctTimeParts(pctTime(hour, minute, second))).toEqual({
          hour,
          minute,
          second,
        });
      },
      { runs: 400 },
    );
  });

  it('builds every time in the domain, and refuses every field outside it', () => {
    // The edges, once: the first and last second of a day are times, and one step past any
    // field's edge is a `RangeError` and not a string.
    expect(pctTime(0, 0, 0)).toBe('00:00:00');
    expect(pctTime(23, 59, 59)).toBe('23:59:59');
    for (const [hour, minute, second] of [
      [24, 0, 0],
      [-1, 0, 0],
      [0, 60, 0],
      [0, -1, 0],
      [0, 0, 60],
      [0, 0, -1],
    ])
      expect(() => pctTime(hour, minute, second)).toThrow(RangeError);

    pctForAll(
      pctRecord({ clock: anyClock, past: pctInt(1, 1_000) }),
      ({ clock, past }) => {
        const { hour, minute, second } = clock;
        expect(isPctTime(timeOf(clock))).toBe(true);
        // Past each edge by any distance, in both directions, and off the whole numbers — one
        // field at a time, with the other two inside, so each refusal is that field's own.
        for (const [h, m, s] of [
          [23 + past, minute, second],
          [-past, minute, second],
          [hour, 59 + past, second],
          [hour, -past, second],
          [hour, minute, 59 + past],
          [hour, minute, -past],
          [hour + 0.5, minute, second],
          [hour, minute + 0.5, second],
          [hour, minute, second + 0.5],
        ])
          expect(() => pctTime(h, m, s)).toThrow(RangeError);
      },
      { runs: 150 },
    );
  });
});

/**
 * The strings `pctTime` writes, as a predicate — the independent half of `isPctTime`'s contract.
 * The parse is deliberately LOOSER than `time.ts`'s own (`\d+` in every field, no width), so a
 * candidate is refused for the reason a reader would name — that is not the string this library
 * writes for those fields — and not for failing the very regex under test.
 */
function writtenBack(candidate: unknown): boolean {
  if (typeof candidate !== 'string') return false;
  const fields = /^(\d+):(\d+)(?::(\d+))?$/.exec(candidate);
  if (fields === null) return false;
  try {
    const written =
      fields[3] === undefined
        ? pctTime(Number(fields[1]), Number(fields[2]))
        : pctTime(Number(fields[1]), Number(fields[2]), Number(fields[3]));
    return written === candidate;
  } catch {
    return false;
  }
}

/**
 * The near misses of one time: the string itself, each field past its edge, each field a digit
 * short and a digit long, the anchors tested at both ends, a separator that is not a colon, a
 * fraction, and values that are not strings at all.
 */
function nearMissesOf(time: PctTime): readonly unknown[] {
  const [hh, mm, ss = '00'] = time.split(':');
  return [
    time,
    `24:${mm}`,
    `${hh}:60`,
    `${hh}:${mm}:60`,
    `${hh}:${mm}:${ss}`,
    `${Number(hh)}:${mm}`,
    `${hh}:${Number(mm)}`,
    `${hh}:${mm}:${Number(ss)}`,
    `0${hh}:${mm}`,
    `${hh}:${mm}0`,
    `${time}:00`,
    `${time}.5`,
    `${time}Z`,
    `T${time}`,
    ` ${time} `,
    time.replaceAll(':', '.'),
    time.replaceAll(':', ''),
    '',
    [time],
    Number(time.replaceAll(':', '')),
  ];
}

/** `typeof` and all, so a failure names the candidate that disagreed and not just its text. */
const reading = (candidate: unknown): string =>
  `${typeof candidate} ${String(candidate)}`;

describe('isPctTime', () => {
  it('accepts exactly the strings pctTime writes, and refuses every near miss', () => {
    pctForAll(
      anyClock,
      (clock) => {
        const candidates = nearMissesOf(timeOf(clock));
        // One string of verdicts rather than an assertion each: the diff names the candidate
        // that disagreed, and a sweep pays for every `expect` once per mutant.
        expect(
          candidates.map((c) => `${reading(c)}: ${isPctTime(c)}`).join('\n'),
        ).toBe(
          candidates.map((c) => `${reading(c)}: ${writtenBack(c)}`).join('\n'),
        );
      },
      { runs: 250 },
    );
  });
});

/** Two days either way: most walks cross midnight, many cross it twice. */
const WALK = pctInt(-2 * DAY, 2 * DAY);

describe('pctAddSeconds', () => {
  it('moves the wall clock exactly as the platform counts seconds, and keeps the shape it can', () => {
    pctForAll(
      pctRecord({ clock: anyClock, n: WALK }),
      ({ clock, n }) => {
        const time = timeOf(clock);
        const moved = pctAddSeconds(time, n);
        expect(isPctTime(moved)).toBe(true);
        // The conservation law, against the platform: an instant `n` seconds on, read in UTC,
        // is on the clock face the result names — midnight crossed or not.
        const landed = new Date(msOf(time) + n * 1000);
        expect(pctTimeParts(moved)).toEqual(clockOf(landed));
        // The shape is the caller's, and it gives way only to keep a second.
        expect(hasSeconds(moved)).toBe(
          hasSeconds(time) || landed.getUTCSeconds() !== 0,
        );
        expect(pctAddSeconds(time, 0)).toBe(time);
      },
      { runs: 400 },
    );
  });

  it('is undone by the step back, and two steps are one step of their sum', () => {
    pctForAll(
      pctRecord({ clock: anyClock, a: WALK, b: WALK }),
      ({ clock, a, b }) => {
        const time = timeOf(clock);
        // As times, always. As strings, wherever no step had to widen the shape on the way.
        const back = pctAddSeconds(pctAddSeconds(time, a), -a);
        expect(pctCompareTimes(back, time)).toBe(0);
        if (hasSeconds(time) || a % 60 === 0) expect(back).toBe(time);
        const twice = pctAddSeconds(pctAddSeconds(time, a), b);
        const once = pctAddSeconds(time, a + b);
        expect(pctCompareTimes(twice, once)).toBe(0);
        if (hasSeconds(time)) expect(twice).toBe(once);
      },
      { runs: 400 },
    );
  });
});

describe('pctAddMinutes', () => {
  it('moves the wall clock as the platform counts minutes, in the shape it was given', () => {
    pctForAll(
      pctRecord({ clock: anyClock, n: pctInt(-3 * 1440, 3 * 1440) }),
      ({ clock, n }) => {
        const time = timeOf(clock);
        const moved = pctAddMinutes(time, n);
        expect(pctTimeParts(moved)).toEqual(
          clockOf(new Date(msOf(time) + n * 60_000)),
        );
        expect(hasSeconds(moved)).toBe(hasSeconds(time));
        // A minute is sixty seconds, string for string: the two walks agree on the shape too.
        expect(moved).toBe(pctAddSeconds(time, n * 60));
      },
      { runs: 400 },
    );
  });

  it('is undone by the step back, and two steps are one step of their sum', () => {
    pctForAll(
      pctRecord({
        clock: anyClock,
        a: pctInt(-3 * 1440, 3 * 1440),
        b: pctInt(-3 * 1440, 3 * 1440),
      }),
      ({ clock, a, b }) => {
        const time = timeOf(clock);
        expect(pctAddMinutes(time, 0)).toBe(time);
        expect(pctAddMinutes(pctAddMinutes(time, a), -a)).toBe(time);
        expect(pctAddMinutes(pctAddMinutes(time, a), b)).toBe(
          pctAddMinutes(time, a + b),
        );
        // A day is a lap of the ring, on every day — the wall clock has no 23- or 25-hour one.
        expect(pctAddMinutes(time, 1440)).toBe(time);
      },
      { runs: 400 },
    );
  });

  it('refuses a step that is not whole, in both units', () => {
    pctForAll(
      pctRecord({ clock: anyClock, n: WALK }),
      ({ clock, n }) => {
        expect(() => pctAddSeconds(timeOf(clock), n + 0.5)).toThrow(RangeError);
        expect(() => pctAddMinutes(timeOf(clock), n + 0.5)).toThrow(RangeError);
      },
      { runs: 100 },
    );
  });
});

describe('pctCompareTimes', () => {
  it('is a total order that agrees with the seconds between the two times', () => {
    pctForAll(
      pctRecord({ x: anyClock, y: anyClock, z: anyClock }),
      ({ x, y, z }) => {
        const a = timeOf(x);
        const b = timeOf(y);
        const c = timeOf(z);
        expect(pctCompareTimes(a, a)).toBe(0);
        // Antisymmetry as a sum, because `-0` and `0` are not the same value to `toBe`.
        expect(pctCompareTimes(a, b) + pctCompareTimes(b, a)).toBe(0);
        expect(pctCompareTimes(a, b)).toBe(Math.sign(msOf(a) - msOf(b)));
        if (pctCompareTimes(a, b) <= 0 && pctCompareTimes(b, c) <= 0)
          expect(pctCompareTimes(a, c)).toBeLessThanOrEqual(0);
        // One time in two shapes is one time.
        const { hour, minute } = x;
        expect(
          pctCompareTimes(pctTime(hour, minute), pctTime(hour, minute, 0)),
        ).toBe(0);
      },
      { runs: 400 },
    );
  });
});

describe('pctClampTime', () => {
  it('lands inside an ordinary window, invents no time, and keeps one already inside', () => {
    pctForAll(
      pctRecord({ clock: anyClock, one: anyClock, two: anyClock }),
      ({ clock, one, two }) => {
        const time = timeOf(clock);
        const [min, max] = [timeOf(one), timeOf(two)].sort(
          (p, q) => msOf(p) - msOf(q),
        );
        const held = pctClampTime(time, min, max);
        expect(msOf(held)).toBeGreaterThanOrEqual(msOf(min));
        expect(msOf(held)).toBeLessThanOrEqual(msOf(max));
        expect([time, min, max]).toContain(held);
        if (msOf(time) >= msOf(min) && msOf(time) <= msOf(max))
          expect(held).toBe(time);
        // A bound the schema did not set is a bound the directive does not pass.
        expect(pctClampTime(time, undefined, undefined)).toBe(time);
        expect(pctClampTime(time, min, undefined)).toBe(
          msOf(time) < msOf(min) ? min : time,
        );
        expect(pctClampTime(time, undefined, max)).toBe(
          msOf(time) > msOf(max) ? max : time,
        );
      },
      { runs: 400 },
    );
  });

  it('reads min after max as a window across midnight, and pulls the gap to its nearer end', () => {
    pctForAll(
      pctRecord({ clock: anyClock, one: anyClock, two: anyClock }),
      ({ clock, one, two }) => {
        const time = timeOf(clock);
        const [early, late] = [timeOf(one), timeOf(two)].sort(
          (p, q) => msOf(p) - msOf(q),
        );
        if (msOf(early) === msOf(late)) return;
        // `min` the later of the two: the window runs from it through midnight to `max`.
        const held = pctClampTime(time, late, early);
        const inside = msOf(time) >= msOf(late) || msOf(time) <= msOf(early);
        if (inside) expect(held).toBe(time);
        else
          expect(held).toBe(
            msOf(time) - msOf(early) < msOf(late) - msOf(time) ? early : late,
          );
        // Wherever it started, the result is inside the window.
        expect(msOf(held) >= msOf(late) || msOf(held) <= msOf(early)).toBe(
          true,
        );
      },
      { runs: 400 },
    );
  });

  it('holds what it has held, whatever the bounds', () => {
    pctForAll(
      pctRecord({
        clock: anyClock,
        one: anyClock,
        two: anyClock,
        bounds: pctOneOf(['both', 'min', 'max', 'none'] as const),
      }),
      ({ clock, one, two, bounds }) => {
        const min =
          bounds === 'both' || bounds === 'min' ? timeOf(one) : undefined;
        const max =
          bounds === 'both' || bounds === 'max' ? timeOf(two) : undefined;
        const held = pctClampTime(timeOf(clock), min, max);
        expect(pctClampTime(held, min, max)).toBe(held);
      },
      { runs: 400 },
    );
  });
});

describe('the step', () => {
  it('is exactly the steps whose times the columns can list, for every whole second up to a day', () => {
    // No sample: 86 400 questions, and the denominator is part of the answer — thirty steps
    // pass, from one second to a whole day, and a rule that let a single other one in or kept
    // a single one of these out is a red line here.
    const wrong = Array.from({ length: DAY }, (_, i) => i + 1)
      .filter((step) => isPctTimeStep(step) !== listable(step))
      .map((step) => `${step}: ours ${isPctTimeStep(step)}`);
    expect(wrong).toEqual([]);
    expect(LISTABLE).toHaveLength(30);
    expect(isPctTimeStep(DAY + DAY)).toBe(false);
  });

  it('refuses what is not a whole positive number of seconds', () => {
    pctForAll(
      pctOneOf(LISTABLE),
      (step) => {
        expect(isPctTimeStep(-step)).toBe(false);
        expect(isPctTimeStep(step + 0.5)).toBe(false);
      },
      { runs: 60 },
    );
    expect(isPctTimeStep(0)).toBe(false);
  });

  it('puts every time a whole number of steps from the base on the step, and a second off it off', () => {
    pctForAll(
      pctRecord({
        step: pctOneOf(LISTABLE),
        base: anyClock,
        k: pctInt(-500, 500),
        off: pctInt(1, DAY),
      }),
      ({ step, base, k, off }) => {
        const origin = timeOf(base);
        // The lattice built by the platform, not by the module: `k` steps on as an instant.
        const at = clockOf(new Date(msOf(origin) + k * step * 1000));
        const on = pctTime(at.hour, at.minute, at.second);
        expect(pctTimeOnStep(on, step, origin)).toBe(true);
        if (step === 1) return;
        // Anywhere strictly between two times on the step is off it.
        const aside = clockOf(
          new Date(msOf(on) + (1 + (off % (step - 1))) * 1000),
        );
        expect(
          pctTimeOnStep(
            pctTime(aside.hour, aside.minute, aside.second),
            step,
            origin,
          ),
        ).toBe(false);
      },
      { runs: 400 },
    );
  });

  it('snaps onto the step, to the nearest time on it, and stays there', () => {
    pctForAll(
      pctRecord({ step: pctOneOf(LISTABLE), base: anyClock, clock: anyClock }),
      ({ step, base, clock }) => {
        const origin = timeOf(base);
        const time = timeOf(clock);
        const snapped = pctSnapToStep(time, step, origin);
        expect(pctTimeOnStep(snapped, step, origin)).toBe(true);
        // Nearest, the short way round the ring, measured on the platform's own clock.
        const apart = Math.abs(msOf(snapped) - msOf(time)) / 1000;
        const around = Math.min(apart, DAY - apart);
        expect(around).toBeLessThanOrEqual(step / 2);
        // Exactly halfway goes up: the snap is then half a step AHEAD of the time.
        if (around === step / 2)
          expect(pctTimeParts(snapped)).toEqual(
            clockOf(new Date(msOf(time) + (step / 2) * 1000)),
          );
        expect(pctSnapToStep(snapped, step, origin)).toBe(snapped);
        if (pctTimeOnStep(time, step, origin)) expect(snapped).toBe(time);
        expect(hasSeconds(snapped)).toBe(
          hasSeconds(time) || pctTimeParts(snapped).second !== 0,
        );
      },
      { runs: 400 },
    );
  });

  it('refuses, in both functions, every step the columns cannot list', () => {
    pctForAll(
      pctRecord({ step: pctInt(-DAY, 2 * DAY), clock: anyClock }),
      ({ step, clock }) => {
        if (step > 0 && listable(step)) return;
        expect(() => pctTimeOnStep(timeOf(clock), step)).toThrow(RangeError);
        expect(() => pctSnapToStep(timeOf(clock), step)).toThrow(RangeError);
      },
      { runs: 200 },
    );
  });
});

// --- the reader on the other side of the boundary ---

/** `Intl` in the zone the machine is set to — the second road to the local clock. */
const localClock = new Intl.DateTimeFormat('en-US', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

describe('pctNow', () => {
  it('is the local wall-clock time of the instant it is given', () => {
    pctForAll(
      // Milliseconds rather than fields: the argument is an INSTANT, and the seconds either
      // side of a minute's end are where a rounding would show. 1906 to 2096.
      pctInt(-2_000_000_000_000, 4_000_000_000_000),
      (ms) => {
        const now = new Date(ms);
        const read = Object.fromEntries(
          localClock.formatToParts(now).map((part) => [part.type, part.value]),
        );
        expect(pctNow(now)).toBe(`${read['hour']}:${read['minute']}`);
        expect(pctNow(now, true)).toBe(
          `${read['hour']}:${read['minute']}:${read['second']}`,
        );
      },
      { runs: 200 },
    );
  });
});
