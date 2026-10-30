import {
  pctInstantOf,
  pctWallClockOf,
  type PctInstant,
  type PctWallClock,
} from '@pacit/components/core';
import { pctSteps } from './steps';
import type { PctWindow } from './window';

/**
 * The ticks of a time axis, read off the wall clock of a named zone: on whole minutes,
 * quarters, hours and midnights as the zone's clock shows them, so a day of twenty-three or
 * twenty-five hours keeps its ticks on 00:00, 06:00 and 12:00 rather than sliding by the hour
 * the clocks moved. Built on the road between an instant and a wall clock of `./core`
 * ([0086](../../../../../docs/decisions/0086-a-time-of-day-is-a-wall-clock.md)).
 */

/**
 * A calendar unit a time axis steps by.
 *
 * @since next
 */
export type PctTimeUnit =
  'second' | 'minute' | 'hour' | 'day' | 'week' | 'month' | 'year';

/**
 * A step between two ticks of a time axis: `count` of `unit`.
 *
 * @since next
 */
export interface PctTimeStep {
  readonly unit: PctTimeUnit;
  readonly count: number;
}

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** How long a unit lasts on average: what choosing a step compares, never what a tick is placed by. */
const NOMINAL: Record<PctTimeUnit, number> = {
  second: SECOND,
  minute: MINUTE,
  hour: HOUR,
  day: DAY,
  week: 7 * DAY,
  month: 30.436875 * DAY,
  year: 365.2425 * DAY,
};

/** The steps a time axis chooses from, each dividing the unit above it; years follow them. */
const STEPS: readonly PctTimeStep[] = [
  ...[1, 5, 15, 30].map((count) => ({ unit: 'second' as const, count })),
  ...[1, 2, 5, 10, 15, 30].map((count) => ({ unit: 'minute' as const, count })),
  ...[1, 2, 3, 6, 12].map((count) => ({ unit: 'hour' as const, count })),
  ...[1, 2].map((count) => ({ unit: 'day' as const, count })),
  { unit: 'week', count: 1 },
  ...[1, 3, 6].map((count) => ({ unit: 'month' as const, count })),
];

/**
 * The step for a window of `span` milliseconds drawn across `width` pixels: the finest step
 * that leaves at least `spacing` pixels (70 by default) between two ticks. Beyond a year a step
 * is a whole number of years, 1, 2 or 5 times a power of ten.
 *
 * @example
 * pctTimeStep(86_400_000, 700); // { unit: 'hour', count: 3 }
 *
 * @since next
 */
export function pctTimeStep(
  span: number,
  width: number,
  spacing = 70,
): PctTimeStep {
  const target = Math.max(1, Math.floor(width / spacing));
  const step = STEPS.find((s) => span / (NOMINAL[s.unit] * s.count) <= target);
  if (step) return step;
  // Beyond the steps, whole years: the smallest of 1, 2 and 5 times a power of ten that keeps
  // the spacing.
  const years = span / NOMINAL.year / target;
  const power = 10 ** Math.floor(Math.log10(years));
  // The list ends at ten times the power, which is above `years` by construction.
  const count = [1, 2, 5, 10].map((f) => f * power).find((v) => v >= years)!;
  return { unit: 'year', count: Math.max(1, Math.round(count)) };
}

/**
 * What a tick is labelled with: a time of day, a date, a month or a year. Within a day the
 * label is the time, except at midnight, where it is the date; from a day on it is the date;
 * a month's step writes the month, and the year where the month is January.
 *
 * @since next
 */
export type PctTimeLabel = 'time' | 'date' | 'month' | 'year';

/**
 * A tick of a time axis.
 *
 * @since next
 */
export interface PctTimeTick {
  readonly at: PctInstant;
  readonly label: PctTimeLabel;
}

/**
 * A calendar's fields read as UTC: arithmetic on them has no change of clocks in it. Not
 * `Date.UTC`, which reads a year from 0 to 99 as 1900 and after (`instant.ts` says the same).
 */
function utc(
  year: number,
  monthIndex: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0,
): number {
  const date = new Date(0);
  date.setUTCFullYear(year, monthIndex, day);
  date.setUTCHours(hour, minute, second, 0);
  return date.getTime();
}

/** The wall clock as if it were UTC. */
function local(clock: PctWallClock): number {
  return utc(
    clock.year,
    clock.month - 1,
    clock.day,
    clock.hour,
    clock.minute,
    clock.second,
  );
}

function clockOfLocal(value: number): PctWallClock {
  const date = new Date(value);
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
    hour: date.getUTCHours(),
    minute: date.getUTCMinutes(),
    second: date.getUTCSeconds(),
    millisecond: 0,
  };
}

/**
 * Every tick of `step` inside `window`, ends included, in `timeZone` (the runtime's own when
 * unset). Within a day, a wall clock the zone shows twice gets two ticks, as far apart as the
 * clocks moved back, because that much time passes between them; a wall clock the zone skips
 * gets none, and when the skipped one is midnight the next tick of that day is labelled with
 * the date. A day, week, month or year starts once, at the first moment the zone shows on it,
 * which is midnight everywhere but on the few days a change of clocks skips midnight itself.
 *
 * Weeks start on `weekStart`, 1 for Monday to 7 for Sunday — the locale's first day of the
 * week, which `Intl.Locale.prototype.getWeekInfo` gives where the platform has it.
 *
 * @example
 * pctTimeTicks({ from, to }, { unit: 'hour', count: 6 }, 'Europe/Warsaw');
 * // 00:00, 06:00, 12:00, 18:00 of each day, also on the day of twenty-five hours
 *
 * @since next
 */
export function pctTimeTicks(
  window: PctWindow,
  step: PctTimeStep,
  timeZone?: string,
  weekStart = 1,
): readonly PctTimeTick[] {
  const { unit, count } = step;
  if (!(window.to >= window.from)) return [];
  const startClock = pctWallClockOf(window.from, timeZone);
  const endClock = pctWallClockOf(window.to, timeZone);
  const within = unit === 'second' || unit === 'minute' || unit === 'hour';

  // The wall clocks worth trying, read as if they were UTC (`local`), so stepping through them
  // knows no change of clocks.
  let candidates: number[];
  if (unit === 'month' || unit === 'year') {
    const months = unit === 'year' ? 12 * count : count;
    const first = startClock.year * 12 + startClock.month - 1;
    const last = endClock.year * 12 + endClock.month - 1;
    candidates = pctSteps(
      Math.floor(first / months) * months,
      last,
      months,
    ).map((m) => utc(Math.floor(m / 12), m % 12, 1));
  } else {
    // Every instant of the window stands at the offset of one of its ends — a window narrow
    // enough for ticks within a day holds one change of clocks at most — so the walk spans the
    // window read at both offsets, a second wider each way for the milliseconds the wall clock
    // leaves out; a step of seconds walks seconds, not a day of them.
    const atFrom = local(startClock) - window.from;
    const atTo = local(endClock) - window.to;
    const from = window.from + Math.min(atFrom, atTo) - SECOND;
    const to = window.to + Math.max(atFrom, atTo) + SECOND;
    if (within) {
      const size =
        count * (unit === 'hour' ? HOUR : unit === 'minute' ? MINUTE : SECOND);
      // A step within a day divides the day, so its multiples since the epoch are its multiples
      // since every midnight.
      candidates = pctSteps(Math.floor(from / size) * size, to, size);
    } else {
      // Every midnight, kept when it is a week's first day or a multiple of the step in days
      // since the epoch.
      candidates = pctSteps(Math.floor(from / DAY) * DAY, to, DAY).filter(
        (at) =>
          unit === 'week'
            ? ((new Date(at).getUTCDay() + 6) % 7) + 1 === weekStart
            : (at / DAY) % count === 0,
      );
    }
  }

  const ticks: PctTimeTick[] = [];
  // The date a skipped midnight left without its tick: the first tick on that date carries it.
  let dateDue = NaN;
  const add = (at: PctInstant, clock: PctWallClock) => {
    // Outside the window, or on a tick already placed: a day the zone skips whole starts where
    // the next day does.
    if (at < window.from || at > window.to || at === ticks.at(-1)?.at) return;
    const midnight =
      clock.hour === 0 && clock.minute === 0 && clock.second === 0;
    const day = utc(clock.year, clock.month - 1, clock.day);
    const label: PctTimeLabel =
      unit === 'year' || (unit === 'month' && clock.month === 1)
        ? 'year'
        : unit === 'month'
          ? 'month'
          : within && !midnight && day !== dateDue
            ? 'time'
            : 'date';
    ticks.push({ at, label });
    dateDue = NaN;
  };
  for (const wall of candidates) {
    const clock = clockOfLocal(wall);
    const at = pctInstantOf(clock, timeZone);
    if (local(pctWallClockOf(at, timeZone)) !== wall) {
      // The zone skips this wall clock. A tick within a day has no place, and a skipped
      // midnight hands its date to the next tick of the day; a day's tick stands where the day
      // really starts, which is where the skipped clock resolves.
      if (within) dateDue = wall % DAY === 0 ? wall : NaN;
      else add(at, clock);
      continue;
    }
    add(at, clock);
    // Within a day, a wall clock shown twice gets its later reading too, as time passes between
    // them; a day, a month or a year starts once.
    if (within) add(pctInstantOf(clock, timeZone, 'later'), clock);
  }
  return ticks;
}

/** What each kind of tick shows. */
const FORMATS: Record<PctTimeLabel | 'seconds', Intl.DateTimeFormatOptions> = {
  seconds: {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  },
  time: { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' },
  date: { day: 'numeric', month: 'numeric' },
  month: { month: 'short' },
  year: { year: 'numeric' },
};

/** One formatter per locale, zone and label: a formatter holds native memory (`instant.ts`). */
const formats = new Map<string, Intl.DateTimeFormat>();

/**
 * The text of a tick in `locale` and `timeZone`: `14:00` (`14:00:15` on a step of seconds),
 * `28.10`, `Oct`, `2026`, as the locale writes them.
 *
 * @example
 * pctTimeTickText(tick, { unit: 'hour', count: 3 }, 'pl', 'Europe/Warsaw'); // '15:00'
 *
 * @since next
 */
export function pctTimeTickText(
  tick: PctTimeTick,
  step: PctTimeStep,
  locale: string,
  timeZone?: string,
): string {
  const kind =
    tick.label === 'time' && step.unit === 'second' ? 'seconds' : tick.label;
  const key = `${locale}|${timeZone}|${kind}`;
  let format = formats.get(key);
  if (!format) {
    const options = FORMATS[kind];
    format = new Intl.DateTimeFormat(locale, { ...options, timeZone });
    formats.set(key, format);
  }
  return format.format(tick.at);
}
