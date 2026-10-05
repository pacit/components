/**
 * A time of day, written the way the platform already writes one: `HH:mm`, or `HH:mm:ss` where
 * the field's step has seconds in it.
 *
 * **Why a string and not a `Date`.** A `Date` is an INSTANT, and a time of day is what a clock
 * on the wall shows — no date, no zone. Measured rather than deduced
 * ([0086](../../../../docs/decisions/0086-a-time-of-day-is-a-wall-clock.md), B5 and B6): the
 * platform's own `valueAsDate` turns `13:05` into 13:05 UTC on 1 January 1970, which
 * `getHours()` reads back as **14** in `Europe/Warsaw`; and there `new Date(2026, 2, 29, 2, 30)`
 * answers `03:30` without a word, because that minute does not exist on that day — a local
 * `Date` cannot even hold every time a clock can show.
 *
 * **Why not `Temporal.PlainTime`,** which is exactly this type: it is in all three engines this
 * repository runs and absent from webkit 26.5, which Angular 22 still supports
 * ([0084](../../../../docs/decisions/0084-a-fallback-stays-while-angular-supports-an-engine-without-the-feature.md)).
 * `PlainTime.from` reads both shapes, and asked for minutes it writes the first, so the day it
 * is everywhere the interop is one call each way and no stored value changes.
 *
 * Two digits each, a 24-hour clock, no fraction and no zone — the string
 * `<input type="time">.value`, `<time datetime>` and SQL `TIME` all carry. **The two shapes are
 * two spellings of one time**: `13:05` and `13:05:00` compare equal, and every function here
 * keeps the shape it was given, widening to seconds only where a result has seconds the shape
 * could not carry.
 *
 * @since next
 */
export type PctTime = string;

/** `HH:mm` or `HH:mm:ss` — the shape alone, before the clock is asked. */
const SHAPE = /^(\d{2}):(\d{2})(?::(\d{2}))?$/;

/** The seconds in a day — the ring the arithmetic comes round on. */
const DAY = 86_400;

/** Where a step is counted from when the field has no `min`. */
const MIDNIGHT: PctTime = '00:00';

/**
 * The three fields of a time, as numbers on a 24-hour clock. `second` is `0` for a time written
 * without seconds — the two shapes are one time.
 *
 * @since next
 */
export interface PctTimeParts {
  readonly hour: number;
  readonly minute: number;
  readonly second: number;
}

/**
 * Whether a string is a time this library will work with: `00:00` to `23:59:59`, two digits a
 * field. A value read from a server, a query string or `localStorage` is a string somebody else
 * wrote, and three of the strings they write are refused on purpose:
 *
 * - **`24:00`**, which ISO 8601 allows as the end of a day — the platform sanitises it to `""`
 *   and `Temporal.PlainTime.from` throws on it (0086, A16 and B3). The trap beside it is why
 *   this guard is a parser and not a `from`: `PlainTime.from({ hour: 24 })` does not throw, it
 *   **constrains to `23:00`**;
 * - **`23:59:60`**, which the platform refuses and `Temporal` quietly makes `:59`;
 * - **a fraction of a second**, which the native element carries for a step of `0.001`. A field
 *   a person types a time into is not a stopwatch, and a third shape would be a third way for
 *   two equal times to be two strings.
 *
 * @since next
 */
export function isPctTime(value: unknown): value is PctTime {
  if (typeof value !== 'string') return false;
  const m = SHAPE.exec(value);
  if (m === null) return false;
  return (
    Number(m[1]) <= 23 &&
    Number(m[2]) <= 59 &&
    (m[3] === undefined || Number(m[3]) <= 59)
  );
}

/** Zero-padded to two digits — every field of the shape has exactly two. */
function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/** A whole number from `0` to `max` — the one test every field of a time is held to. */
function within(value: number, max: number): boolean {
  return Number.isInteger(value) && value >= 0 && value <= max;
}

/**
 * Builds a time from its fields: `HH:mm`, or `HH:mm:ss` when `second` is given — `0` included,
 * because the shape is the caller's to choose.
 *
 * **A field outside the clock is refused, loudly**, where `pctDay` normalises an overflow: a
 * month past twelve is a walk the calendar takes, and minute `60` is nothing a clock shows. The
 * arithmetic that does come round at midnight has names of its own — `pctAddMinutes` and
 * `pctAddSeconds` — so nothing here has to guess which of the two a caller meant.
 *
 * @since next
 */
export function pctTime(
  hour: number,
  minute: number,
  second?: number,
): PctTime {
  if (
    !within(hour, 23) ||
    !within(minute, 59) ||
    (second !== undefined && !within(second, 59))
  )
    throw new RangeError(
      `[PctTime] hour ${hour}, minute ${minute}${second === undefined ? '' : `, second ${second}`} ` +
        `is not a time of day: hours run 0 to 23 and minutes and seconds 0 to 59, in whole ` +
        `numbers — and 24:00 is the end of a day, which a time of day is not.`,
    );
  const time = `${pad(hour)}:${pad(minute)}`;
  return second === undefined ? time : `${time}:${pad(second)}`;
}

/**
 * The three fields of a time. The caller has already established that it is one.
 *
 * @since next
 */
export function pctTimeParts(time: PctTime): PctTimeParts {
  const m = SHAPE.exec(time) as RegExpExecArray;
  return {
    hour: Number(m[1]),
    minute: Number(m[2]),
    second: Number(m[3] ?? 0),
  };
}

/** A time as seconds since midnight, with the shape it was written in. */
interface Reading {
  readonly total: number;
  readonly seconds: boolean;
}

function read(time: PctTime): Reading {
  const { hour, minute, second } = pctTimeParts(time);
  return {
    total: (hour * 60 + minute) * 60 + second,
    seconds: time.length > 5,
  };
}

/**
 * Seconds since midnight written back as a time — in the shape asked for, unless the seconds
 * are not zero and the shape has nowhere to put them. Losing a second to keep a shape would be
 * a time nobody asked for, so the shape gives way and the second stays.
 */
function write(total: number, seconds: boolean): PctTime {
  const second = total % 60;
  return pctTime(
    Math.floor(total / 3600),
    Math.floor(total / 60) % 60,
    seconds || second !== 0 ? second : undefined,
  );
}

/** Into `[0, DAY)` from either side — the clock coming round. */
function ring(total: number): number {
  return ((total % DAY) + DAY) % DAY;
}

/** A movement is a whole number of its unit; a time has no fraction of one to land on. */
function whole(n: number, unit: string): void {
  if (!Number.isInteger(n))
    throw new RangeError(
      `[PctTime] ${n} is not a whole number of ${unit} — a time has no fraction of one to ` +
        `move by.`,
    );
}

/**
 * The time on the LOCAL clock — the one read of local time in this file, and the only one that
 * belongs: "what time is it" is a question about where the user is standing, and every other
 * question here is arithmetic on a time that already has an answer.
 *
 * `HH:mm` by default — the minute a wall clock shows until it ticks, never rounded up — or
 * `HH:mm:ss` for a field that counts seconds.
 *
 * @since next
 */
export function pctNow(now: Date = new Date(), seconds = false): PctTime {
  return pctTime(
    now.getHours(),
    now.getMinutes(),
    seconds ? now.getSeconds() : undefined,
  );
}

/**
 * `n` seconds on (or back), and the clock comes round: `23:59:30` plus 45 seconds is
 * `00:00:15`. The result keeps the shape it was given unless it has seconds that shape cannot
 * carry — `13:05` plus an hour is `14:05`, plus 30 seconds is `13:05:30`.
 *
 * A time has nowhere to put the day it ran into, so it comes round or it throws, and a clock
 * comes round — `Temporal.PlainTime`'s answer (0086, B4). The datetime value will add on the
 * pair instead, so its day carries; this is the time's own arithmetic and only the time's.
 *
 * @since next
 */
export function pctAddSeconds(time: PctTime, n: number): PctTime {
  whole(n, 'seconds');
  const { total, seconds } = read(time);
  // The remainder first: it is exact for every integer a double holds, where `total + n` stops
  // being exact past 2^53 and would land somewhere near the answer instead of on it.
  return write(ring(total + (n % DAY)), seconds);
}

/**
 * `n` minutes on (or back), and the clock comes round: `23:30` plus 45 minutes is `00:15`. The
 * shape is kept — a whole minute never moves the seconds.
 *
 * @since next
 */
export function pctAddMinutes(time: PctTime, n: number): PctTime {
  whole(n, 'minutes');
  const { total, seconds } = read(time);
  return write(ring(total + (n % 1440) * 60), seconds);
}

/**
 * `-1`, `0` or `1`, read as seconds since midnight — so `13:05` and `13:05:00`, one time in two
 * shapes, compare equal.
 *
 * **It does not come round**, where the arithmetic does: `23:00` is before `01:00`. A span that
 * crosses midnight belongs to a day, and only a datetime has one — `PlainTime` says `23:00`
 * until `01:00` is `-PT22H` (0086, B4).
 *
 * @since next
 */
export function pctCompareTimes(a: PctTime, b: PctTime): number {
  const away = read(a).total - read(b).total;
  return away < 0 ? -1 : away > 0 ? 1 : 0;
}

/**
 * Held inside the bounds, either of which may be absent — and `undefined` is what absent is,
 * because that is what the `FormUiControl` contract's `min` / `max` are.
 *
 * **`min` later than `max` is a window across midnight**, `22:00` to `06:00` — the reading the
 * HTML specification gives a time input and all three engines implement (0086, A12), and the
 * only way a time without a date can say "the night shift". A time in the gap between the two
 * is pulled to the nearer bound, and one exactly halfway to `min`, the bound the clock reaches
 * next. A clamp invents no time: it hands back the one it was given or a bound it was told.
 *
 * @since next
 */
export function pctClampTime(
  time: PctTime,
  min: PctTime | undefined,
  max: PctTime | undefined,
): PctTime {
  if (min !== undefined && max !== undefined && pctCompareTimes(min, max) > 0) {
    const at = read(time).total;
    // How far past the window's end the time stands, and how far its start still lies ahead.
    // Inside the window one of the two is never positive.
    const past = at - read(max).total;
    const ahead = read(min).total - at;
    if (past <= 0 || ahead <= 0) return time;
    return past < ahead ? max : min;
  }
  if (min !== undefined && pctCompareTimes(time, min) < 0) return min;
  if (max !== undefined && pctCompareTimes(time, max) > 0) return max;
  return time;
}

/**
 * Whether `step` — in seconds, like the native attribute — is one the columns can list: a whole
 * number of seconds that divides a minute, a whole number of minutes that divides an hour, or a
 * whole number of hours that divides a day. Any other — 420 seconds, seven-minute slots — makes
 * the valid minutes depend on the hour, which columns that are fields cannot show
 * ([0086](../../../../docs/decisions/0086-a-time-of-day-is-a-wall-clock.md) §5).
 *
 * Every step this answers `true` for divides a day, so the times on it are the same ones on
 * both sides of midnight — which is what lets the two functions below count on a ring. It is a
 * plain `boolean` and not a type guard on purpose: a guard would narrow a `number` that is not
 * a step to `never`, and a field that warns about its step has to be able to say which one.
 *
 * @since next
 */
export function isPctTimeStep(step: number): boolean {
  if (!Number.isInteger(step) || step <= 0) return false;
  if (step <= 60) return 60 % step === 0;
  if (step <= 3600) return step % 60 === 0 && 3600 % step === 0;
  return step % 3600 === 0 && DAY % step === 0;
}

/** A step this module cannot count with is refused here, before any arithmetic runs on it. */
function stepOf(step: number): void {
  if (!isPctTimeStep(step))
    throw new RangeError(
      `[PctTime] a step of ${step} seconds is not one the columns can list: a whole number ` +
        `of seconds that divides a minute, of minutes that divides an hour, or of hours that ` +
        `divides a day.`,
    );
}

/**
 * Whether a time stands on the step, counted from `base` — the field's `min` when it has one,
 * as the native element counts (0086, A11).
 *
 * **A time off the step is still a time**: the field writes it and the form refuses it, as the
 * native element keeps the value and flags `stepMismatch` beside it. This predicate is what the
 * validator and the columns agree on.
 *
 * @since next
 */
export function pctTimeOnStep(
  time: PctTime,
  step: number,
  base: PctTime = MIDNIGHT,
): boolean {
  stepOf(step);
  return ring(read(time).total - read(base).total) % step === 0;
}

/**
 * The time on the step nearest to this one, counted from `base`, with the clock coming round:
 * at an hour step `23:40` is `00:00`. Exactly halfway goes up, as `Math.round` does. The
 * shape is kept unless the step puts seconds where it had none.
 *
 * The field never snaps what was typed (0086 §5) — this is for a walk that has to start
 * somewhere, a column opening on a time the step does not list.
 *
 * @since next
 */
export function pctSnapToStep(
  time: PctTime,
  step: number,
  base: PctTime = MIDNIGHT,
): PctTime {
  stepOf(step);
  const { total, seconds } = read(time);
  const origin = read(base).total;
  const offset = ring(total - origin);
  return write(ring(origin + Math.round(offset / step) * step), seconds);
}
