import {
  pctInstantOf,
  pctWallClockOf,
  type PctInstant,
  type PctWallClock,
} from '@pacit/components/core';
import type { PctWindow } from './window';

/**
 * A calendar interval a band of bars is cut into: each bar stands for one of them, from its
 * first moment in a zone to the next interval's.
 *
 * @since next
 */
export type PctInterval = 'hour' | 'day' | 'week' | 'month' | 'year';

/** An interval cut on the wall clock: every one but the hour, which is cut on the instant line. */
type PctCalendarInterval = Exclude<PctInterval, 'hour'>;

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

/** The wall clock as if it were UTC: how far into its hour an instant stands. */
function localOf(at: PctInstant, timeZone?: string): number {
  const clock = pctWallClockOf(at, timeZone);
  const date = new Date(0);
  date.setUTCFullYear(clock.year, clock.month - 1, clock.day);
  date.setUTCHours(clock.hour, clock.minute, clock.second, clock.millisecond);
  return date.getTime();
}

/** The wall clock of a calendar day's first moment, as if it were UTC. */
function dayOf(clock: PctWallClock): number {
  const date = new Date(0);
  date.setUTCFullYear(clock.year, clock.month - 1, clock.day);
  date.setUTCHours(0, 0, 0, 0);
  return date.getTime();
}

/** The weekday of a wall clock's date, 1 for Monday to 7 for Sunday. */
function weekdayOf(clock: PctWallClock): number {
  return ((new Date(dayOf(clock)).getUTCDay() + 6) % 7) + 1;
}

/** The wall clock an interval starts at, holding `clock`. */
function startClock(
  clock: PctWallClock,
  interval: PctCalendarInterval,
  weekStart: number,
): Pick<PctWallClock, 'year' | 'month' | 'day'> & Partial<PctWallClock> {
  switch (interval) {
    case 'day':
      return { year: clock.year, month: clock.month, day: clock.day };
    case 'week': {
      const back = (weekdayOf(clock) - weekStart + 7) % 7;
      const date = new Date(dayOf(clock) - back * DAY);
      return {
        year: date.getUTCFullYear(),
        month: date.getUTCMonth() + 1,
        day: date.getUTCDate(),
      };
    }
    case 'month':
      return { year: clock.year, month: clock.month, day: 1 };
    case 'year':
      return { year: clock.year, month: 1, day: 1 };
  }
}

/** The wall clock one interval after `start`, which is an interval's start. */
function nextClock(
  start: Pick<PctWallClock, 'year' | 'month' | 'day'> & Partial<PctWallClock>,
  interval: PctCalendarInterval,
): Pick<PctWallClock, 'year' | 'month' | 'day'> & Partial<PctWallClock> {
  switch (interval) {
    case 'day':
    case 'week': {
      const date = new Date(
        dayOf({ ...start, hour: 0, minute: 0, second: 0, millisecond: 0 }) +
          (interval === 'week' ? 7 : 1) * DAY,
      );
      return {
        year: date.getUTCFullYear(),
        month: date.getUTCMonth() + 1,
        day: date.getUTCDate(),
      };
    }
    case 'month':
      return start.month === 12
        ? { year: start.year + 1, month: 1, day: 1 }
        : { year: start.year, month: start.month + 1, day: 1 };
    case 'year':
      return { year: start.year + 1, month: 1, day: 1 };
  }
}

/**
 * The first moment, in `timeZone`, of the interval that holds `at`: the hour's whole hour, the
 * day's midnight (an hour is cut on the instant line, so a zone half an hour off UTC keeps
 * its own whole hours), the week's first day (`weekStart`, 1 for Monday to 7 for Sunday), the
 * month's or the year's first day. On a day whose midnight the zone skips, the first moment it
 * shows; the runtime's own zone when none is given.
 *
 * @example
 * pctIntervalStart(Date.UTC(2026, 9, 25, 15, 30), 'day', 'Europe/Warsaw'); // 2026-10-24T22:00Z
 *
 * @since next
 */
export function pctIntervalStart(
  at: PctInstant,
  interval: PctInterval,
  timeZone?: string,
  weekStart = 1,
): PctInstant {
  // An hour is sixty minutes on the instant line wherever the zone's clock stands, so the
  // hour the clocks go back is two hours with one name, and the one they skip is none.
  if (interval === 'hour') {
    const into = ((localOf(at, timeZone) % HOUR) + HOUR) % HOUR;
    return at - into;
  }
  const clock = pctWallClockOf(at, timeZone);
  return pctInstantOf(startClock(clock, interval, weekStart), timeZone);
}

/**
 * The first moment of the interval after the one starting at `start`, which `pctIntervalStart`
 * gave: an hour later on the wall clock, the next midnight, the next week's, month's or
 * year's first day — twenty-five hours on the day the clocks go back, twenty-three on the day
 * they go forward.
 *
 * @since next
 */
export function pctIntervalNext(
  start: PctInstant,
  interval: PctInterval,
  timeZone?: string,
): PctInstant {
  if (interval === 'hour') return start + HOUR;
  const clock = pctWallClockOf(start, timeZone);
  return pctInstantOf(nextClock(clock, interval), timeZone);
}

/**
 * Every interval that touches `window`, in order: each from its first moment to the next's,
 * the first one holding the window's start and the last one its end. A window that ends
 * exactly on an interval's first moment does not reach into it.
 *
 * @example
 * pctIntervals({ from, to }, 'day', 'Europe/Warsaw'); // one span per calendar day of Warsaw
 *
 * @since next
 */
export function pctIntervals(
  window: PctWindow,
  interval: PctInterval,
  timeZone?: string,
  weekStart = 1,
): readonly PctWindow[] {
  if (!(window.to >= window.from)) return [];
  const spans: PctWindow[] = [];
  let from = pctIntervalStart(window.from, interval, timeZone, weekStart);
  // A window of one instant holds the interval it stands in; a longer one every interval it
  // reaches into, which the one starting on its end does not.
  while (from < window.to || (from === window.from && spans.length === 0)) {
    const to = pctIntervalNext(from, interval, timeZone);
    spans.push({ from, to });
    from = to;
  }
  return spans;
}

/**
 * What a bar's label says for the interval starting at `start`: the hour (`14`), the weekday
 * and the day (`Mon 26`), the week's first date (`26/10`), the month (`Oct`) or the year, in
 * `locale` and `timeZone`.
 *
 * @since next
 */
export function pctIntervalText(
  start: PctInstant,
  interval: PctInterval,
  locale: string,
  timeZone?: string,
): string {
  const options: Intl.DateTimeFormatOptions =
    interval === 'hour'
      ? { hour: '2-digit', hourCycle: 'h23' }
      : interval === 'day'
        ? { weekday: 'short', day: 'numeric' }
        : interval === 'week'
          ? { day: 'numeric', month: 'numeric' }
          : interval === 'month'
            ? { month: 'short' }
            : { year: 'numeric' };
  return new Intl.DateTimeFormat(locale, { ...options, timeZone }).format(
    start,
  );
}
