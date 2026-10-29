/**
 * An instant: one moment, the same everywhere, and what a wall clock in a time zone shows at it.
 *
 * The library's other time values are wall clocks that name no moment: a day
 * ([0043](../../../../docs/decisions/0043-a-day-is-not-an-instant.md)), a time of day
 * ([0086](../../../../docs/decisions/0086-a-time-of-day-is-a-wall-clock.md)), a day with a
 * time ([0090](../../../../docs/decisions/0090-a-day-with-a-time-is-a-wall-clock-with-a-date.md)).
 * A measurement, a log line or an API timestamp is the other kind, and this module is the road
 * between the two: an instant read as a wall clock in a zone, and a wall clock in a zone read
 * back as an instant, across the hour a change of clocks skips or repeats.
 *
 * Writing an instant in full is left to the platform: `Intl.DateTimeFormat` with `timeZone`
 * already does it, and a wrapper would be a second name for the same call.
 */

/**
 * A moment as milliseconds since 1970-01-01T00:00Z: what `Date.now()`, `Date.parse()` and
 * `Date.prototype.getTime()` return. A number rather than a `Date`, because it is immutable, it
 * compares with `<`, and a chart of sixty thousand points holds sixty thousand of them.
 *
 * @since next
 */
export type PctInstant = number;

/**
 * The fields a wall clock shows. `month` counts from 1, `hour` from 0 to 23.
 *
 * @since next
 */
export interface PctWallClock {
  readonly year: number;
  readonly month: number;
  readonly day: number;
  readonly hour: number;
  readonly minute: number;
  readonly second: number;
  readonly millisecond: number;
}

/**
 * Which instant a wall clock means where a change of clocks makes it ambiguous. The names and
 * the default are those of the TC39 Temporal proposal:
 * - `compatible` — in a skipped hour the later reading, in a repeated hour the earlier one,
 * - `earlier` — the earlier reading in both,
 * - `later` — the later reading in both.
 *
 * @since next
 */
export type PctDisambiguation = 'compatible' | 'earlier' | 'later';

const DAY = 86_400_000;

/** One formatter per zone: a formatter holds native memory, and a chart asks thousands of times. */
const clocks = new Map<string | undefined, Intl.DateTimeFormat>();

function clockOf(timeZone: string | undefined): Intl.DateTimeFormat {
  let clock = clocks.get(timeZone);
  if (!clock) {
    clock = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
    });
    clocks.set(timeZone, clock);
  }
  return clock;
}

/**
 * The wall clock `timeZone` shows at `at`. Without a zone, the runtime's own: under SSR that is
 * the server's, so a page rendered on a server and hydrated in a browser passes the zone.
 *
 * Years from 1 on, and a whole number of milliseconds: the formatter writes no era, so a year
 * before 1 reads as a year after it. An invalid zone or instant is the platform's `RangeError`.
 *
 * @example
 * pctWallClockOf(Date.UTC(2026, 9, 25, 0, 30), 'Europe/Warsaw');
 * // { year: 2026, month: 10, day: 25, hour: 2, minute: 30, second: 0, millisecond: 0 }
 *
 * @since next
 */
export function pctWallClockOf(
  at: PctInstant,
  timeZone?: string,
): PctWallClock {
  const fields: Record<string, number> = {};
  for (const part of clockOf(timeZone).formatToParts(at)) {
    fields[part.type] = Number(part.value);
  }
  return {
    year: fields['year'],
    month: fields['month'],
    day: fields['day'],
    hour: fields['hour'],
    minute: fields['minute'],
    second: fields['second'],
    millisecond: ((at % 1000) + 1000) % 1000,
  };
}

/**
 * The instant at which `timeZone` shows the wall clock `clock`. The fields left out are zero,
 * and a field out of its range carries into the next, as `Date.UTC` carries it: day 32 of
 * January is the first of February, hour 24 is the next day's midnight. That is how a caller
 * steps a calendar: `{ ...pctWallClockOf(at, zone), day: d + 1 }`.
 *
 * A wall clock a change of clocks skips (02:30 on the spring morning in Warsaw) or shows twice
 * (02:30 on the autumn one) is resolved by `disambiguation`, `compatible` when unset.
 *
 * Years from 1 on, as `pctWallClockOf` reads them.
 *
 * @since next
 */
export function pctInstantOf(
  clock: Pick<PctWallClock, 'year' | 'month' | 'day'> & Partial<PctWallClock>,
  timeZone?: string,
  disambiguation?: PctDisambiguation,
): PctInstant {
  // `compatible` when unset, and no branch names it: it is the skipped clock's later reading
  // and the repeated clock's earlier one, which is what neither of the other two asks for.
  const local = utc(clock);
  const before = offsetAt(local - DAY, timeZone);
  const after = offsetAt(local + DAY, timeZone);
  const readings = [local - before, local - after].filter(
    (at) => at + offsetAt(at, timeZone) === local,
  );
  if (readings.length === 0) {
    // A skipped wall clock: the later reading is the clock moved on by the gap, which is what
    // the offset in force before the change gives it.
    return disambiguation === 'earlier' ? local - after : local - before;
  }
  return disambiguation === 'later'
    ? Math.max(...readings)
    : Math.min(...readings);
}

/** Milliseconds `timeZone` stands ahead of UTC at `at`. */
function offsetAt(at: PctInstant, timeZone: string | undefined): number {
  return utc(pctWallClockOf(at, timeZone)) - at;
}

/**
 * The wall clock as if it were UTC. Not `Date.UTC`, which reads a year from 0 to 99 as 1900 and
 * after: the setters take the year as written.
 */
function utc(
  clock: Pick<PctWallClock, 'year' | 'month' | 'day'> & Partial<PctWallClock>,
): number {
  const date = new Date(0);
  date.setUTCFullYear(clock.year, clock.month - 1, clock.day);
  date.setUTCHours(
    clock.hour ?? 0,
    clock.minute ?? 0,
    clock.second ?? 0,
    clock.millisecond ?? 0,
  );
  return date.getTime();
}

/**
 * How an instant is written relative to another.
 *
 * @since next
 */
export interface PctRelativeOptions {
  /** The zone whose calendar counts the days, weeks, months and years. The runtime's own when unset. */
  readonly timeZone?: string;
  /** `auto` (the default) writes `tomorrow` and `now`, `always` writes `in 1 day` and `in 0 seconds`. */
  readonly numeric?: 'always' | 'auto';
  /** The length of the unit's name, as `Intl.RelativeTimeFormat` takes it. */
  readonly style?: 'long' | 'short' | 'narrow';
}

/**
 * A formatter made once and called per value.
 *
 * @since next
 */
export interface PctRelativeFormat {
  /** `at` as seen from `now`. The caller owns `now`, so a list ticks on its own clock and a test on a fixed one. */
  format(at: PctInstant, now: PctInstant): string;
}

/**
 * The formatter of an instant relative to now, in `locale`.
 *
 * The platform writes the words, and it does not choose the unit: this does. Under a day the
 * unit is the largest of seconds, minutes and hours that counts at least one, truncated. From a
 * day on the calendar of `timeZone` counts, because "tomorrow" is a date and not a span of
 * twenty-four hours: under seven days the days, then whole weeks until a whole month has
 * passed, then whole months, then whole years. Twenty-four hours that end on the same date,
 * as they can on a day of twenty-five, are still written in hours.
 *
 * @example
 * const when = pctRelativeFormat('en', { timeZone: 'Europe/Warsaw' });
 * when.format(due, Date.now()); // 'in 6 days', 'tomorrow', '3 hours ago'
 *
 * @since next
 */
export function pctRelativeFormat(
  locale: string,
  options: PctRelativeOptions = {},
): PctRelativeFormat {
  const { timeZone, numeric = 'auto', style } = options;
  const words = new Intl.RelativeTimeFormat(locale, { numeric, style });
  // Asked once here, so an invalid zone throws where the formatter is made, not at its first long span.
  clockOf(timeZone).format(0);
  return {
    format: (at, now) => {
      const [value, unit] = relative(at, now, timeZone);
      return words.format(value, unit);
    },
  };
}

function relative(
  at: PctInstant,
  now: PctInstant,
  timeZone: string | undefined,
): [number, Intl.RelativeTimeFormatUnit] {
  const span = at - now;
  // `+ 0` turns a negative zero into zero: the platform writes `-0` as the past, `0 seconds ago`.
  const seconds = Math.trunc(span / 1000) + 0;
  if (Math.abs(seconds) < 60) return [seconds, 'second'];
  const minutes = Math.trunc(span / 60_000);
  if (Math.abs(minutes) < 60) return [minutes, 'minute'];
  const hours = Math.trunc(span / 3_600_000);
  if (Math.abs(hours) < 24) return [hours, 'hour'];
  const there = pctWallClockOf(at, timeZone);
  const here = pctWallClockOf(now, timeZone);
  const days = dateOf(there) - dateOf(here);
  // Twenty-four hours from early on a day of twenty-five can still be the same date, and a
  // day written there would be "tomorrow" for today.
  if (days === 0) return [hours, 'hour'];
  if (Math.abs(days) < 7) return [days, 'day'];
  const months = monthsBetween(here, there);
  if (months === 0) return [Math.trunc(days / 7), 'week'];
  if (Math.abs(months) < 12) return [months, 'month'];
  return [Math.trunc(months / 12), 'year'];
}

/** The date of a wall clock as a count of days, so two dates subtract. */
function dateOf(clock: PctWallClock): number {
  return utc({ year: clock.year, month: clock.month, day: clock.day }) / DAY;
}

/** Whole months from `from` to `to` on the wall clock: a month counts once its day and time come round. */
function monthsBetween(from: PctWallClock, to: PctWallClock): number {
  const months = (to.year - from.year) * 12 + (to.month - from.month);
  const lead = withinMonth(to) - withinMonth(from);
  if (months > 0 && lead < 0) return months - 1;
  if (months < 0 && lead > 0) return months + 1;
  return months;
}

function withinMonth(clock: PctWallClock): number {
  return utc({ ...clock, year: 1970, month: 1 });
}
