import {
  isPctDay,
  pctAddDays,
  pctCompareDays,
  PctDay,
  pctDayAsUtc,
  pctToday,
} from '@pacit/components/date';
import {
  isPctTimeOfDay,
  pctCompareTimes,
  pctNow,
  pctTimeOfDay,
  PctTimeOfDay,
  pctTimeOfDayParts,
} from '@pacit/components/time';

/**
 * A day and a time of it, written the way the platform already writes one: `YYYY-MM-DDTHH:mm`,
 * or `YYYY-MM-DDTHH:mm:ss` where the field's step has seconds in it — a `PctDay`, a `T` and a
 * `PctTimeOfDay`.
 *
 * **What a clock on the wall shows, with the date beside it — no zone.** Measured rather than
 * deduced ([0090](../../../../docs/decisions/0090-a-day-with-a-time-is-a-wall-clock-with-a-date.md),
 * B1 and B2): in `Europe/Warsaw` a local `Date` answers 02:30 on 29 March 2026 with **03:30**,
 * because that minute does not exist there, and holds 02:30 on 25 October twice and picks the
 * earlier without a word; and the string the native input writes, put into a `Date` and
 * serialised, comes back an hour off for every user east of Greenwich. Both minutes are values
 * of this type, as they are values of `<input type="datetime-local">`: the control cannot know
 * whether the event is in Warsaw, and in Lisbon the minute exists. Turning the pair into an
 * instant is the application's, which knows where the event is.
 *
 * **Why not `Temporal.PlainDateTime`,** which is exactly this type: it is in all three engines
 * this repository runs and absent from webkit 26.5, which Angular 22 still supports
 * ([0084](../../../../docs/decisions/0084-a-fallback-stays-while-angular-supports-an-engine-without-the-feature.md)).
 * `PlainDateTime.from` reads both shapes, and asked for minutes it writes the first, so the
 * interop is one call each way and no stored value changes.
 *
 * The `T` and not a space: the native input accepts a space and writes a `T`, and `Temporal`
 * reads both and writes one. **The two shapes are two spellings of one value**, as the time's
 * are: `…T13:05` and `…T13:05:00` compare equal, and the arithmetic keeps the shape it was
 * given.
 *
 * @since next
 */
export type PctDateTime = string;

/**
 * The two halves of a datetime — what the field's two texts hold.
 *
 * @since next
 */
export interface PctDateTimeParts {
  readonly day: PctDay;
  readonly time: PctTimeOfDay;
}

/** The minutes in a day — the width the arithmetic carries a day at. */
const DAY_MINUTES = 1440;

/**
 * The index of the one `T` between the halves, or `-1`. Read by position rather than by a
 * pattern: neither half has a `T` of its own, so the first one is the only one a value can
 * have, and each half is then held to its own module's guard rather than to a third copy of it.
 */
function split(value: string): number {
  return value.indexOf('T');
}

/**
 * Whether a string is a datetime this library will work with: a `PctDay`, one capital `T`, and
 * a `PctTimeOfDay` — each half held to its own guard, so the domain is theirs: the day runs from
 * `0000-01-01` to `275760-09-13` and the time refuses `24:00`, a leap second and a fraction.
 *
 * **This guard is a parser and not a `from`**, and the reason is listed out loud (0090, B5):
 * `Temporal.PlainDateTime.from('2026-12-01T13:05+01:00')` does not throw — it **drops the
 * offset** and answers `13:05`, so a guard built on it would admit a string that names an
 * instant as if it named a wall clock. A `Z`, an offset, a space and a lower-case `t` are all
 * refused here.
 *
 * @since next
 */
export function isPctDateTime(value: unknown): value is PctDateTime {
  if (typeof value !== 'string') return false;
  const at = split(value);
  // No `T` needs no case of its own: `at` is then `-1`, the time half is the whole string and
  // the day half the whole string less its last character — and no string is both a time and,
  // one character short, a day. A mutant that deleted the check survived every case, which is how
  // this was found.
  return isPctDay(value.slice(0, at)) && isPctTimeOfDay(value.slice(at + 1));
}

/**
 * Joins a day and a time into one value, in the time's shape: `13:05` makes `…T13:05`, and
 * `13:05:00` makes `…T13:05:00`.
 *
 * **A half that is not one is refused, loudly**, rather than written into a string that
 * `isPctDateTime` would then refuse four calls away from the join that made it — the day and
 * the time are strings, so the compiler cannot stop `'01.12.2026'` arriving here.
 *
 * @since next
 */
export function pctDateTime(day: PctDay, time: PctTimeOfDay): PctDateTime {
  if (!isPctDay(day) || !isPctTimeOfDay(time))
    throw new RangeError(
      `[PctDateTime] '${day}' and '${time}' are not a day and a time: a day is ` +
        `YYYY-MM-DD and a time HH:mm or HH:mm:ss.`,
    );
  return `${day}T${time}`;
}

/**
 * The two halves of a datetime, each in the shape it was written in. The caller has already
 * established that it is one.
 *
 * @since next
 */
export function pctDateTimeParts(value: PctDateTime): PctDateTimeParts {
  const at = split(value);
  return { day: value.slice(0, at), time: value.slice(at + 1) };
}

/** Seconds since midnight, and the shape the time was written in. */
function clockOf(time: PctTimeOfDay): {
  readonly total: number;
  readonly seconds: boolean;
} {
  const { hour, minute, second } = pctTimeOfDayParts(time);
  return {
    total: (hour * 60 + minute) * 60 + second,
    seconds: time.length > 5,
  };
}

/**
 * The pair as the one `Date` anything outside this file is allowed to see: those fields in
 * **UTC** — which is what `Intl.DateTimeFormat` with `timeZone: 'UTC'` reads back as the same
 * day and time, exactly, in all three engines (0090, B9). It is the day's `pctDayAsUtc` with an
 * hour on it, and it is not an instant anybody meant: no zone the event happens in is asked.
 *
 * There is no helper to an instant **in a zone**, on purpose (0090 §1): where `Temporal` is,
 * `PlainDateTime.from(value).toZonedDateTime(zone, { disambiguation })` is one call and names
 * the policy for the minute a switch skips and the hour it repeats; a form control has no
 * business choosing it.
 *
 * @since next
 */
export function pctDateTimeAsUtc(value: PctDateTime): Date {
  const { day, time } = pctDateTimeParts(value);
  const date = pctDayAsUtc(day);
  const { hour, minute, second } = pctTimeOfDayParts(time);
  // The day's last one, 13 September 275760, is where the ECMAScript range ENDS — at its
  // midnight — so every later minute of it is a value of this type and no `Date` at all. An
  // invalid `Date` handed on is a `NaN` four calls away; the edge is said here instead.
  if (Number.isNaN(date.setUTCHours(hour, minute, second)))
    throw new RangeError(
      `[PctDateTime] ${value} is past the last instant a Date can hold, ` +
        `275760-09-13T00:00 in UTC.`,
    );
  return date;
}

/**
 * `-1`, `0` or `1` — the days first, then the times. `…T13:05` and `…T13:05:00`, one value in
 * two shapes, compare equal; and the day's compare reads a year of five digits as later than
 * one of four, where a string compare would not.
 *
 * **It is a span with a sign**, where the time's compare is not a ring either: `23:00` on one
 * day is before `01:00` on the next, because the day carries.
 *
 * @since next
 */
export function pctCompareDateTimes(a: PctDateTime, b: PctDateTime): number {
  const left = pctDateTimeParts(a);
  const right = pctDateTimeParts(b);
  return (
    pctCompareDays(left.day, right.day) ||
    pctCompareTimes(left.time, right.time)
  );
}

/**
 * Held inside the bounds, either of which may be absent — `undefined`, as the `FormUiControl`
 * contract spells an absent bound. A clamp invents no value: it hands back the one it was given
 * or a bound, as written, and a value equal to a bound in the other shape is inside.
 *
 * **`min` later than `max` is no window** — a contradiction, which is how the platform reads a
 * reversed pair on a datetime input (0090, A8: `23:00` is over, `05:00` under, `12:00` both).
 * The night shift the time field reads into such a pair is, with a date on it, two datetimes on
 * two days. So a reversed pair holds nothing, and the value comes back as it was given — which
 * is how the field treats such bounds, beside a dev-mode warning.
 *
 * @since next
 */
export function pctClampDateTime(
  value: PctDateTime,
  min: PctDateTime | undefined,
  max: PctDateTime | undefined,
): PctDateTime {
  if (
    min !== undefined &&
    max !== undefined &&
    pctCompareDateTimes(min, max) > 0
  )
    return value;
  if (min !== undefined && pctCompareDateTimes(value, min) < 0) return min;
  if (max !== undefined && pctCompareDateTimes(value, max) > 0) return max;
  return value;
}

/**
 * `n` minutes on (or back), and **the day carries**: `…01T23:30` plus 45 minutes is
 * `…02T00:15`. That is `PlainDateTime`'s answer and the platform's own — a datetime input's
 * `stepUp()` at `23:59` is the next day's `00:00` in all three engines, where the same call on a
 * time input stops or comes round (0090, A10 and B7). The time's shape is kept: a whole minute
 * never moves the seconds.
 *
 * **Not `pctAddMinutes`,** which is the time's and comes round at midnight: the two take the same
 * `string`, so one name in two entrypoints would be a mistake the compiler cannot see — an
 * import from the wrong one compiles, and throws on the first value it is handed.
 *
 * The day's domain is the pair's, so a walk off either end of it throws the day's `RangeError`.
 *
 * @since next
 */
export function pctAddDateTimeMinutes(
  value: PctDateTime,
  n: number,
): PctDateTime {
  if (!Number.isInteger(n))
    throw new RangeError(
      `[PctDateTime] ${n} is not a whole number of minutes — a datetime has no fraction of one ` +
        `to move by.`,
    );
  const { day, time } = pctDateTimeParts(value);
  const { total, seconds } = clockOf(time);
  const second = total % 60;
  // The days and the minutes apart, so neither sum leaves the integers a double holds exactly:
  // a day is never more than a few hundred million days from another, and the rest is less than
  // two days of minutes.
  const rest = Math.floor(total / 60) + (n % DAY_MINUTES);
  const days =
    (n - (n % DAY_MINUTES)) / DAY_MINUTES + Math.floor(rest / DAY_MINUTES);
  const minute = ((rest % DAY_MINUTES) + DAY_MINUTES) % DAY_MINUTES;
  return pctDateTime(
    pctAddDays(day, days),
    pctTimeOfDay(
      Math.floor(minute / 60),
      minute % 60,
      seconds ? second : undefined,
    ),
  );
}

/**
 * The day and the time on the LOCAL clock — the one read of local time in this file, and the
 * only one that belongs: "what day and what time is it" is a question about where the user is
 * standing, and every other question here is arithmetic on a value that already has an answer.
 *
 * `…THH:mm` by default — the minute a wall clock shows until it ticks, never rounded up — or
 * `…THH:mm:ss` for a field that counts seconds.
 *
 * @since next
 */
export function pctNowDateTime(
  now: Date = new Date(),
  seconds = false,
): PctDateTime {
  return pctDateTime(pctToday(now), pctNow(now, seconds));
}
