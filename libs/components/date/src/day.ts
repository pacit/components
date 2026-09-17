/**
 * A calendar day, written the way the platform already writes one: `YYYY-MM-DD`.
 *
 * **Why a string and not a `Date`.** A `Date` is an INSTANT — a count of milliseconds — and a
 * calendar day is not one. Measured rather than deduced: in `Europe/Warsaw`,
 * `new Date(2026, 7, 27).toISOString().slice(0, 10)` is **`2026-08-26`**, so the day a user
 * picked becomes the day before it the moment anything serialises it. The defect gives no
 * error, no warning and no red test — it moves one day, in one direction, for the half of the
 * world on the other side of the meridian
 * ([0043](../../../../docs/decisions/0043-a-day-is-not-an-instant.md)).
 *
 * **Why not `Temporal.PlainDate`,** which is exactly this type and does the arithmetic too:
 * it is in chromium 149 and firefox 151 and **absent from webkit 26.5** (measured). A public
 * value type cannot be conditional on the engine. `PlainDate.toString()` IS this string, so
 * the day webkit ships it the interop is one call in each direction and no consumer's stored
 * value changes.
 *
 * The shape is `YYYY-MM-DD` with a four-or-more-digit year, and it is the same string
 * `<input type="date">.value` carries, `<time datetime>` takes, JSON carries and SQL `DATE`
 * stores — so the value crosses every boundary a form has without a converter.
 *
 * @since 0.1.0
 */
export type PctDay = string;

/** `YYYY-MM-DD`, four or more year digits — the shape alone, before the calendar is asked. */
const SHAPE = /^(\d{4,})-(\d{2})-(\d{2})$/;

/**
 * The three fields of a day, as numbers. `month` is 1–12, the way a person says it.
 *
 * @since 0.1.0
 */
export interface PctDayParts {
  readonly year: number;
  readonly month: number;
  readonly day: number;
}

/**
 * The one place a `Date` is built, and it is always UTC. Every day in this file is midnight
 * UTC, so no offset can be added to it and no arithmetic can cross a boundary that only
 * exists in local time — which is the whole of the defect above, refused at the source.
 *
 * `Date.UTC` is not called directly, and that is not a style: **`Date.UTC(1, 0, 1)` is the
 * year 1901**, because the two-digit-year rule of the original ECMAScript is still in it
 * (measured in three engines). `setUTCFullYear` is the only road that means the year it is
 * given, and a date picker with a `min` in year 20 is not a case worth being silently wrong
 * about.
 */
function utc(year: number, month: number, day: number): Date {
  // `new Date(0)` IS midnight UTC and `setUTCFullYear` moves only the date fields, so the
  // `setUTCHours(0, 0, 0, 0)` that stood here was a no-op — a mutation run is what said so,
  // by leaving the mutant that deletes it alive.
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  return date;
}

/**
 * How many days February has — the Gregorian rule, written once.
 *
 * @since 0.1.0
 */
export function pctDaysInMonth(year: number, month: number): number {
  if (month === 2)
    return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0 ? 29 : 28;
  return month === 4 || month === 6 || month === 9 || month === 11 ? 30 : 31;
}

/**
 * Whether a string is a day this library will work with: the right shape **and** a day the
 * calendar has. `2026-02-30` has the shape and is not a day, and the difference matters —
 * a value read from a server, a query string or a `localStorage` entry is a string somebody
 * else wrote.
 *
 * @since 0.1.0
 */
export function isPctDay(value: unknown): value is PctDay {
  if (typeof value !== 'string') return false;
  const m = SHAPE.exec(value);
  if (m === null) return false;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (month < 1 || month > 12) return false;
  return day >= 1 && day <= pctDaysInMonth(year, month);
}

/** Zero-padded to at least `width`, so the year of 999 does not shorten the string. */
function pad(value: number, width: number): string {
  return String(value).padStart(width, '0');
}

/**
 * Builds a day from its three fields, normalising an overflow the way a person expects —
 * month `13` is January of the next year, day `0` is the last day of the previous month. That
 * is what makes `pctAddMonths` and `pctAddDays` one line each instead of three branches.
 *
 * @since 0.1.0
 */
export function pctDay(year: number, month: number, day: number): PctDay {
  const date = utc(year, month, day);
  const landed = date.getUTCFullYear();
  // **A day this shape cannot write is refused here, loudly, rather than handed on.**
  // `pad(-1, 4)` is `'00-1'`, so `pctAddDays('0000-01-01', -1)` used to return
  // `'00-1-12-31'` — a string `isPctDay` refuses and `pctDayParts` crashes on, with a
  // `TypeError` from a cast four calls away from the walk that caused it. Past the
  // ECMAScript date range the fields are `NaN` and it read `'0NaN-NaN-NaN'`. Both were found
  // by a property sweep (`lesson-185`), and neither had any symptom before it.
  //
  // The bound is the type's own reason for being a string: a year below zero is not something
  // `<input type="date">`, `<time datetime>`, JSON or SQL `DATE` can carry, so a walk that
  // leaves the calendar has left the value type too.
  if (!Number.isFinite(landed) || landed < 0)
    throw new RangeError(
      `[PctDay] ${year}-${month}-${day} is outside the days this shape can write: ` +
        `0000-01-01 to 275760-09-13, where the ECMAScript date range ends.`,
    );
  return `${pad(date.getUTCFullYear(), 4)}-${pad(date.getUTCMonth() + 1, 2)}-${pad(
    date.getUTCDate(),
    2,
  )}`;
}

/**
 * The day as the one `Date` anything outside this file is allowed to see: midnight **UTC**,
 * which is what `Intl.DateTimeFormat` with `timeZone: 'UTC'` reads back as the same three
 * fields it was built from. Handing out a local-time `Date` is the defect this whole module
 * exists to refuse.
 *
 * @since 0.1.0
 */
export function pctDayAsUtc(day: PctDay): Date {
  const { year, month, day: d } = pctDayParts(day);
  return utc(year, month, d);
}

/**
 * The three fields of a day. The caller has already established that it is one.
 *
 * @since 0.1.0
 */
export function pctDayParts(day: PctDay): PctDayParts {
  const m = SHAPE.exec(day) as RegExpExecArray;
  return { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) };
}

/**
 * Today, read from the LOCAL clock — the one read of local time in this file, and the only
 * one that belongs: "what day is it" is a question about where the user is standing, and
 * every other question here is arithmetic on a day that already has an answer.
 *
 * @since 0.1.0
 */
export function pctToday(now: Date = new Date()): PctDay {
  return pctDay(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

/**
 * `n` days on (or back).
 *
 * @since 0.1.0
 */
export function pctAddDays(day: PctDay, n: number): PctDay {
  const { year, month, day: d } = pctDayParts(day);
  return pctDay(year, month, d + n);
}

/**
 * `n` months on (or back), clamped to the length of the month it lands in: 31 January plus
 * one month is 28 February and not 3 March. The clamp is what a calendar's "next month"
 * button means — a walk that changed the day of the month would move the cursor twice.
 *
 * @since 0.1.0
 */
export function pctAddMonths(day: PctDay, n: number): PctDay {
  const { year, month, day: d } = pctDayParts(day);
  const total = year * 12 + (month - 1) + n;
  const y = Math.floor(total / 12);
  const m = total - y * 12 + 1;
  return pctDay(y, m, Math.min(d, pctDaysInMonth(y, m)));
}

/**
 * `-1`, `0` or `1` — read from the three fields, though the shape invites a string compare
 * and carried one for months.
 *
 * **The shape is not fixed-width.** The year is four digits OR MORE, and this module reaches
 * the fifth from inside itself: `pctAddDays('9999-12-31', 1)` is `'10000-01-01'`. Ten
 * characters stand after eleven lexicographically, so `'2026-01-01'` was reported as the
 * LATER of the two — silently, in the direction nothing checks — and `pctClampDay` pulled a
 * day four thousand years past `max` down to `min`, the wrong bound entirely. A property
 * sweep of the ordering laws named it
 * ([`lesson-185`](../../../../docs/lessons.md#lesson-185)).
 *
 * @since 0.1.0
 */
export function pctCompareDays(a: PctDay, b: PctDay): number {
  const left = pctDayParts(a);
  const right = pctDayParts(b);
  const away =
    left.year - right.year || left.month - right.month || left.day - right.day;
  return away < 0 ? -1 : away > 0 ? 1 : 0;
}

/**
 * The ISO weekday: Monday is `1`, Sunday is `7` — the numbering
 * `Intl.Locale.prototype.getWeekInfo()` answers in, so the two never need converting
 * between them.
 *
 * @since 0.1.0
 */
export function pctWeekday(day: PctDay): number {
  const { year, month, day: d } = pctDayParts(day);
  return utc(year, month, d).getUTCDay() || 7;
}

/**
 * Held inside the bounds, either of which may be absent — and `undefined` is what absent is,
 * because that is what the `FormUiControl` contract's `min` / `max` are: a bound the schema
 * did not set is a bound the directive does not pass.
 *
 * @since 0.1.0
 */
export function pctClampDay(
  day: PctDay,
  min: PctDay | undefined,
  max: PctDay | undefined,
): PctDay {
  // Through the compare rather than `<`: the two are the same answer only while every year
  // has four digits, and this module can produce one that has five.
  if (min !== undefined && pctCompareDays(day, min) < 0) return min;
  if (max !== undefined && pctCompareDays(day, max) > 0) return max;
  return day;
}

/**
 * The grid of one month: whole weeks, starting on `firstDayOfWeek`, with the days of the
 * neighbouring months that share those weeks. Six weeks always, and that is a decision rather
 * than an oversight — a month spans four to six weeks depending on where it starts, and a
 * panel that changed height between March and August would move the page under the pointer
 * mid-walk.
 *
 * @since 0.1.0
 */
export function pctMonthGrid(
  year: number,
  month: number,
  firstDayOfWeek: number,
): readonly (readonly PctDay[])[] {
  const first = pctDay(year, month, 1);
  // How far back the first row starts: the distance from the week's first day to the day the
  // month begins on, in the 1..7 ring.
  const lead = (pctWeekday(first) - firstDayOfWeek + 7) % 7;
  const weeks: PctDay[][] = [];
  for (let w = 0; w < 6; w++) {
    const row: PctDay[] = [];
    for (let d = 0; d < 7; d++) row.push(pctAddDays(first, w * 7 + d - lead));
    weeks.push(row);
  }
  return weeks;
}
