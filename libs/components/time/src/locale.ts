import {
  pctDigitsOf,
  pctNumberFormat,
  pctToLatinDigits,
} from '@pacit/components/core';
import { isPctTime, PctTime, pctTimeParts } from './time';

/**
 * How a language writes a time of day — the hour cycle, the day-period words and where they
 * stand, the separators and the digits — read from `Intl` for the field's locale and never from
 * a table, and **all of it off one formatter**, so the field, its hint and its panel cannot
 * disagree with one another
 * ([0086](../../../../docs/decisions/0086-a-time-of-day-is-a-wall-clock.md) §3).
 *
 * Where the engine is wrong the field is wrong with it, and that is chosen rather than missed:
 * chromium does not carry the language of 44 of the regions `Intl` names and writes them in the
 * browser's default locale, and webkit writes Korean with `AM`/`PM` (0086, C5 and D2). The field
 * then agrees with what the same engine's own `Intl` writes on the same page, instead of with a
 * table this repository would have to keep against three engines.
 */

/**
 * The four clocks `Intl` names. `h11` and `h12` are twelve-hour clocks that write the first hour
 * `0` and `12`; `h23` and `h24` are twenty-four-hour clocks that write it `0` and `24`. The value
 * is `00:05` under all four — a cycle is how a time is written, never which time it is.
 *
 * @since next
 */
export type PctHourCycle = 'h11' | 'h12' | 'h23' | 'h24';

/**
 * Which part of the written time a position holds.
 *
 * @since next
 */
export type PctTimeField = 'hour' | 'minute' | 'second' | 'dayPeriod';

/**
 * The letters a format hint is written with — one per field, from `PCT_TEXTS`, because they are
 * words of the application's language and not facts about the locale (0086 §3).
 *
 * @since next
 */
export interface PctTimeLetters {
  readonly hour: string;
  readonly minute: string;
  readonly second: string;
}

/**
 * Everything about writing and reading a time in one language, built once per locale.
 *
 * @since next
 */
export interface PctTimeFormat {
  /** The locale the platform resolved, which may not be the one asked for. */
  readonly locale: string;
  /**
   * The clock this language counts on — the formatter's own answer, and the only source: a
   * clock forced on a reader is a locale too (`en-US-u-hc-h23`), so there is no other input.
   */
  readonly hourCycle: PctHourCycle;
  /** The parts in the order this language writes them, seconds and day period included. */
  readonly order: readonly PctTimeField[];
  /**
   * The two day-period words on a twelve-hour clock, before noon and after it — `AM` and `PM`,
   * `오전` and `오후` — or `null` where the clock has none.
   */
  readonly dayPeriods: readonly [string, string] | null;
  /** The time as this language writes it — with seconds exactly when the value has them. */
  format(time: PctTime): string;
  /**
   * A time out of what a user typed, or `null`. It accepts more widely than it writes: any run
   * of non-digits separates; the locale's own digits and the ASCII ones both count; a single
   * run of three to six digits is read by width (`905` is `09:05`, `1305` is `13:05`); a day
   * period is the language's own word — on a twenty-four-hour clock, the one it writes on a
   * twelve-hour clock — or `a`, `p`, `am`, `pm` where no word of the language contradicts them,
   * and with one an hour may stand alone (`2 pm`); and a twenty-four-hour time is read in a
   * twelve-hour field. A word or a digit it does not know makes the text malformed, never
   * another time.
   */
  parse(text: string): PctTime | null;
  /**
   * `hh:mm` in this language's order, separators and day-period words, with the reader's own
   * letters — and the seconds when `seconds` asks for them.
   */
  hint(letters: PctTimeLetters, seconds?: boolean): string;
  /**
   * A bare number in the digits the field is written in, at least `width` digits wide — the
   * label of a column row, where a minute is always two.
   */
  number(value: number, width?: 1 | 2): string;
}

/** The formatters are built per locale and shared — an `Intl` object is not cheap. */
const CACHE = new Map<string, PctTimeFormat>();

/**
 * How a time is written and read in one language, built once and shared.
 *
 * @since next
 */
export function pctTimeFormat(locale: string): PctTimeFormat {
  const cached = CACHE.get(locale);
  if (cached) return cached;
  const built = build(locale);
  CACHE.set(locale, built);
  return built;
}

/**
 * The times every reading is taken at: an hour that is one digit on a twelve-hour clock and two
 * on a twenty-four-hour one, a minute and a second that cannot be confused with it or with each
 * other, and the same three fields before noon and after it, for the two day-period words.
 */
const MORNING: PctTime = '01:05:09';
const AFTERNOON: PctTime = '13:05:09';

/**
 * The time as the one instant anything here hands `Intl`: that wall-clock time on 1 January 1970
 * in UTC, which a formatter told `timeZone: 'UTC'` reads back as the same three fields. No offset
 * is ever added, so no daylight-saving switch is ever crossed.
 */
function instant(time: PctTime): Date {
  const { hour, minute, second } = pctTimeParts(time);
  return new Date(((hour * 60 + minute) * 60 + second) * 1000);
}

/** The letters of a run of text, folded — what a day-period word is compared by. */
function wordOf(text: string): string {
  return text.toLowerCase().replace(/[^\p{L}\p{M}]/gu, '');
}

/** Which half of the day a word names. */
type Half = 'am' | 'pm';

/**
 * The day-period words every field reads whatever its locale — the four a keyboard anywhere can
 * type. Each is dropped where one of the language's own words for the OTHER half begins with it:
 * Albanian writes the morning `p.d.`, and a `p` read there as the afternoon would be a morning
 * moved to the afternoon without a word. The language's own words are set after them, so where
 * the two coincide the language's wins.
 */
const ASCII_HALVES: readonly (readonly [string, Half])[] = [
  ['a', 'am'],
  ['am', 'am'],
  ['p', 'pm'],
  ['pm', 'pm'],
];

/**
 * The separator every field reads beyond the locale's own: the `h` of `14h30`, which French
 * writes by hand and `fr-CA`'s formatter writes with a space either side.
 */
const HOUR_LETTER = 'h';

/** Whether a cycle is a twelve-hour clock — the two that need a day period to be read. */
function twelve(hourCycle: PctHourCycle): boolean {
  return hourCycle === 'h11' || hourCycle === 'h12';
}

/** The word a formatter writes for the day period in these parts, if it writes one. */
function periodIn(
  parts: readonly Intl.DateTimeFormatPart[],
): string | undefined {
  return parts.find((part) => part.type === 'dayPeriod')?.value;
}

/** What one cycle writes: the two formatters, the parts the hint is read off, the two words. */
interface Writer {
  readonly hourCycle: PctHourCycle;
  readonly short: Intl.DateTimeFormat;
  readonly long: Intl.DateTimeFormat;
  /** `MORNING` written without its seconds, and with them. */
  readonly brief: readonly Intl.DateTimeFormatPart[];
  readonly morning: readonly Intl.DateTimeFormatPart[];
  readonly dayPeriods: readonly [string, string] | null;
}

/**
 * The formatters a cycle writes with: two digits on a twenty-four-hour clock, where firefox alone
 * would pad a numeric hour, and the locale's own on a twelve-hour one, `1:05 PM` and not
 * `01:05 PM` (0086, D6). `hour12` is never passed: it means `h11` in Japanese and overrides
 * `hourCycle` when both are given (C6).
 */
function writer(locale: string, hourCycle: PctHourCycle): Writer {
  const options: Intl.DateTimeFormatOptions = {
    hour: twelve(hourCycle) ? 'numeric' : '2-digit',
    minute: '2-digit',
    hourCycle,
    timeZone: 'UTC',
  };
  const short = new Intl.DateTimeFormat(locale, options);
  const long = new Intl.DateTimeFormat(locale, {
    ...options,
    second: '2-digit',
  });
  const morning = long.formatToParts(instant(MORNING));
  const am = periodIn(morning);
  return {
    hourCycle,
    short,
    long,
    brief: short.formatToParts(instant(MORNING)),
    morning,
    // A formatter that writes a day period before noon writes one after it.
    dayPeriods:
      am === undefined
        ? null
        : [am, periodIn(long.formatToParts(instant(AFTERNOON))) as string],
  };
}

function build(locale: string): PctTimeFormat {
  // The cycle first, off the formatter 0086 measured it with (C1); then the formatters that write
  // everything the field shows are built FOR that cycle. A formatter asked for an hour always
  // resolves a cycle, hence the cast.
  const asked = new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  }).resolvedOptions().hourCycle as PctHourCycle;
  const first = writer(locale, asked);
  // The one place the field overrides the formatter's clock: a twelve-hour clock that writes no
  // day period cannot tell 01:05 from 13:05 — node writes `fr-CM-u-hc-h12` that way — and a
  // field that reads back what it writes would move every afternoon into the morning. A clock
  // that cannot be read back is not one, so there the field counts to twenty-four.
  const clock =
    first.dayPeriods === null && twelve(asked) ? writer(locale, 'h23') : first;
  const resolved = clock.short.resolvedOptions();
  const digits = pctDigitsOf(locale, resolved.numberingSystem);
  const one = pctNumberFormat(locale, resolved.numberingSystem);
  const two = pctNumberFormat(locale, resolved.numberingSystem, 2);
  const order = clock.morning
    .filter((part) => part.type !== 'literal')
    .map((part) => part.type as PctTimeField);

  // The words a day period is read by: the field's own two where it writes them, and on a clock
  // that writes none the two its language writes on a twelve-hour one — `午後2:30` is a time in
  // a Japanese field as `2:30 pm` is in a British one. Then the ASCII words, each where the
  // language's own words leave room for it.
  const words = clock.dayPeriods ?? writer(locale, 'h12').dayPeriods;
  const own: readonly (readonly [string, Half])[] =
    words === null
      ? []
      : [
          [wordOf(words[0]), 'am'],
          [wordOf(words[1]), 'pm'],
        ];
  const halves = new Map<string, Half>(
    ASCII_HALVES.filter(
      ([ascii, half]) =>
        !own.some(([word, other]) => other !== half && word.startsWith(ascii)),
    ),
  );
  for (const [word, half] of own) halves.set(word, half);
  // A separator is the `h` above and every word the formatter itself writes between the fields
  // — `fr-CA` writes `13 h 05 min 09 s` — so that what the field writes it reads back.
  const separators = new Set([HOUR_LETTER]);
  for (const part of [...clock.brief, ...clock.morning])
    if (part.type === 'literal' && wordOf(part.value) !== '')
      separators.add(wordOf(part.value));

  const reader: Reader = {
    latin: (text) => pctToLatinDigits(text, digits),
    halves,
    separators,
    hourCycle: clock.hourCycle,
  };

  return {
    locale: resolved.locale,
    hourCycle: clock.hourCycle,
    order,
    dayPeriods: clock.dayPeriods,
    // Joined from the parts rather than taken from `format()`, and the difference is measured:
    // node's `format()` writes U+0020 before `PM` where its own `formatToParts()` writes U+202F
    // (the three browsers write U+0020 in both, 0086 D4), so a field written one way beside a
    // hint read the other would be two strings in the engine the unit suite runs in. Read off
    // the parts, the two cannot part anywhere.
    format: (time) =>
      (time.length > 5 ? clock.long : clock.short)
        .formatToParts(instant(time))
        .map((part) => part.value)
        .join(''),
    parse: (text) => parse(text, reader),
    hint: (letters, seconds = false) =>
      hint(seconds ? clock.morning : clock.brief, letters, clock.dayPeriods),
    number: (value, width = 1) => (width === 2 ? two : one).format(value),
  };
}

/**
 * The format hint: the language's own order, separators and day-period words, with the reader's
 * own letters standing for the digits — as many as the formatter writes, so a twelve-hour clock
 * reads `h:mm` and a twenty-four-hour one `hh:mm`. The period slot is written with the field's
 * own two words, because unlike a letter they are what the field shows and what it reads back.
 */
function hint(
  parts: readonly Intl.DateTimeFormatPart[],
  letters: PctTimeLetters,
  dayPeriods: readonly [string, string] | null,
): string {
  return parts
    .map((part) => {
      if (part.type === 'dayPeriod' && dayPeriods)
        return `${dayPeriods[0]}/${dayPeriods[1]}`;
      if (
        part.type === 'hour' ||
        part.type === 'minute' ||
        part.type === 'second'
      )
        return letters[part.type].repeat(Array.from(part.value).length);
      return part.value;
    })
    .join('');
}

/** What the parser needs from the locale, gathered once per formatter. */
interface Reader {
  readonly latin: (text: string) => string | null;
  readonly halves: ReadonlyMap<string, Half>;
  readonly separators: ReadonlySet<string>;
  readonly hourCycle: PctHourCycle;
}

/**
 * The half of the day a run of letters names, `null` for a separator, and `undefined` for a word
 * this locale does not write. A day period may share its run with a separator, on either side:
 * Ewe writes `ŋdi ga 12:00`, its word for the morning before its word for the hour, and on a
 * forced twelve-hour clock Bulgarian writes `1:05 ч. pm` and Canadian French
 * `1 h 05 min 09 s p.m.`, the separator first — each with no digit between the two.
 */
function halfIn(word: string, reader: Reader): Half | null | undefined {
  const half = reader.halves.get(word);
  if (half !== undefined) return half;
  if (reader.separators.has(word)) return null;
  for (const [period, side] of reader.halves)
    if (
      (word.startsWith(period) &&
        reader.separators.has(word.slice(period.length))) ||
      (word.endsWith(period) &&
        reader.separators.has(word.slice(0, -period.length)))
    )
      return side;
  return undefined;
}

/**
 * The fields of what was typed as digit strings, or `null`. A single run of digits is read by
 * width, because the keypad `inputmode="numeric"` raises on a phone may offer digits and
 * nothing else: the last two are the minutes — or the seconds, with the minutes before them —
 * and what is left is the hour. A run of one or two digits is an hour alone, which only a day
 * period makes a time: without one it is a time half typed.
 */
function fieldsOf(
  groups: readonly string[],
  half: Half | null,
): readonly string[] | null {
  if (groups.length > 1) return groups.length > 3 ? null : groups;
  const run = groups[0];
  if (run.length <= 2) return half === null ? null : [run, '00'];
  if (run.length <= 4) return [run.slice(0, -2), run.slice(-2)];
  if (run.length <= 6)
    return [run.slice(0, -4), run.slice(-4, -2), run.slice(-2)];
  return null;
}

function parse(text: string, reader: Reader): PctTime | null {
  const latin = reader.latin(text);
  if (latin === null) return null;

  // Letters mean something here, where in a date they only separate: every word that stands
  // between the digits has to be a day period or one of the separators the locale writes.
  // Anything else is refused rather than read past — a mistyped `pmm` read as nothing would
  // turn an afternoon into a morning without a word.
  let half: Half | null = null;
  for (const run of latin.split(/\d+/)) {
    const word = wordOf(run);
    if (word === '') continue;
    const named = halfIn(word, reader);
    if (named === undefined) return null;
    if (named === null) continue;
    if (half !== null) return null;
    half = named;
  }

  const groups = latin.match(/\d+/g);
  if (groups === null) return null;
  const fields = fieldsOf(groups, half);
  if (fields === null) return null;
  // The minute and the second go into the candidate as typed, so `isPctTime` below refuses one
  // that is not two digits; the hour is a number by then, and its width is read here.
  const [h, minute, second] = fields;
  if (h.length > 2) return null;

  let hour = Number(h);
  if (half !== null) {
    // `0` is how `h11` writes the first hour and `12` how `h12` does; both are the same hour,
    // and past twelve a day period contradicts the hour it stands beside.
    if (hour > 12) return null;
    hour = (hour % 12) + (half === 'pm' ? 12 : 0);
  } else if (hour === 24 && reader.hourCycle === 'h24') {
    // `h24` writes the first hour `24`, so the field reads back what it writes.
    hour = 0;
  }

  // Built by hand rather than through `pctTime`, which throws: a field out of range is a typing
  // mistake to report, not an error.
  const candidate = `${String(hour).padStart(2, '0')}:${minute}${
    second === undefined ? '' : `:${second}`
  }`;
  return isPctTime(candidate) ? candidate : null;
}
