import { isPctDay, PctDay, pctDayAsUtc, pctToday } from './day';

/**
 * Everything this control knows about a language it reads from `Intl`, never from a table —
 * with **one** exception, and the exception is the reason this file has a measurement in its
 * header rather than a link to one.
 *
 * `Intl.Locale.prototype.getWeekInfo()` is in chromium 149 and webkit 26.5 and **absent from
 * firefox 151**. A calendar that started the week on Monday in two engines and on Sunday in
 * the third would be [`req-axis`](../../../../docs/00-axis.md)'s own defect — the same page,
 * two drawings, no signal — so the answer the platform will not give everywhere is written
 * down here and **checked against the platform's own CLDR for every two-letter region code**
 * (`locale.spec.ts`). 80 regions of the 676 disagree with Monday; those 80 are below
 * ([0043](../../../../docs/decisions/0043-a-day-is-not-an-instant.md)).
 */

/**
 * Which of the three fields a position in the format holds.
 *
 * @since 0.1.0
 */
export type PctDayField = 'day' | 'month' | 'year';

/**
 * The letters a format hint is written with — one per field, from `PCT_TEXTS`.
 *
 * @since 0.1.0
 */
export interface PctDayLetters {
  readonly day: string;
  readonly month: string;
  readonly year: string;
}

/**
 * The Gregorian calendar, said out loud in every formatter this file builds.
 *
 * Measured in three engines: `Intl.DateTimeFormat('th-TH')` resolves to the **buddhist**
 * calendar and `Intl.DateTimeFormat('fa-IR')` to the **persian** one, so a Thai user reading
 * a field that formatted with the locale's default would see `01/12/2569` beside a grid drawn
 * in 2026 — the two halves of one control disagreeing about which year it is, in silence.
 *
 * The numbering system is deliberately **not** pinned beside it, and the distinction is the
 * whole of it: a numbering system is how a number is written (`٠١‏/١٢‏/٢٠٢٦` is how Egyptian
 * Arabic writes this date, and `[pctNumber]` already respects that), a calendar is **which**
 * number it is. The value is a Gregorian day, so the calendar is the value's and the digits
 * are the reader's.
 */
const GREGORIAN: Intl.DateTimeFormatOptions = {
  calendar: 'gregory',
  timeZone: 'UTC',
};

/**
 * The regions whose week does not start on Monday, as CLDR has them — everything not named
 * here starts on Monday, which is what the platform answers for a region it does not know.
 *
 * Written as three unbroken strings read two characters at a time, and the packing is not
 * compression. A region code is DATA and not a word, and separating them with spaces makes
 * every one of them a word to anything reading this file as text — three of the eighty are
 * also words of another language, and the public artifact has no register of exceptions to be
 * told about them in. Packed, each row is one token and stays one thing: a list of codes.
 *
 * The spec beside this file compares it to `getWeekInfo()` over the entire two-letter space,
 * so a stale row is a red test and not a difference somebody notices in Cairo.
 */
const WEEK_STARTS: Readonly<Record<number, string>> = {
  5: 'MV',
  6: 'AFBHDJDZEGIQIRJOKWLYOMQASDSY',
  7:
    'AGASBDBRBSBTBUBWBZCACODMDOETGTGUHKHNIDILINISJMJPJTKEKHKR' +
    'LAMHMIMMMOMTMXMZNINPNTPAPEPHPKPRPTPUPYPZRHSASGSVTHTTTWUM' +
    'USVEVIWKWSYDYEZAZW',
};

/** The lookup the table above is read through, built once. */
const WEEK_START_BY_REGION: ReadonlyMap<string, number> = new Map(
  Object.entries(WEEK_STARTS).flatMap(([day, packed]) =>
    Array.from(
      { length: packed.length / 2 },
      (_, i) => [packed.slice(i * 2, i * 2 + 2), Number(day)] as const,
    ),
  ),
);

/** The default the table is the exception list of — and CLDR's own for an unknown region. */
const MONDAY = 1;

/**
 * `Intl.Locale` with the two things this file asks of it, both optional on the platform:
 * `getWeekInfo` (absent in firefox) and `maximize` (present everywhere measured, but a
 * `Locale` built from a malformed tag throws before either can be called).
 */
interface WeekAwareLocale extends Intl.Locale {
  getWeekInfo?: () => { firstDay: number };
}

/**
 * Which day the week starts on, `1` (Monday) … `7` (Sunday).
 *
 * The platform first, because CLDR moves and this file does not. Where the platform is silent
 * the region decides, and a tag with no region gets one from `maximize()` — `pl` is `pl-Latn-PL`
 * and `en` is `en-Latn-US`, which is exactly the difference between Monday and Sunday.
 *
 * @since 0.1.0
 */
export function pctFirstDayOfWeek(locale: string): number {
  let parsed: WeekAwareLocale;
  try {
    parsed = new Intl.Locale(locale) as WeekAwareLocale;
  } catch {
    // A tag the platform will not parse is a tag we cannot reason about either. Monday is
    // the default of the majority and of `und` with a region the platform does not know.
    return MONDAY;
  }
  const info = parsed.getWeekInfo?.();
  if (info) return info.firstDay;

  let region = parsed.region;
  if (!region) {
    try {
      region = parsed.maximize().region;
    } catch {
      region = undefined;
    }
  }
  const known = region ? WEEK_START_BY_REGION.get(region) : undefined;
  return known ?? MONDAY;
}

/**
 * The digits of the locale's own numbering system, in the order `0`…`9`, or `null` where the
 * locale writes in the ASCII ones and nothing has to be translated back.
 *
 * Read from the platform rather than written down, and that is not caution: `my-MM` resolves
 * to `latn` in chromium 149 and to `mymr` in firefox 151 and webkit 26.5 — measured — so a
 * table of digits per locale would be wrong in one engine of three whichever way it was
 * filled in.
 */
function digitsOf(locale: string, numberingSystem: string): string[] | null {
  if (numberingSystem === 'latn') return null;
  let written: string;
  try {
    written = new Intl.NumberFormat(locale, {
      numberingSystem,
      useGrouping: false,
    }).format(1234567890);
  } catch {
    return null;
  }
  const glyphs = Array.from(written);
  // A numbering system that is not decimal-positional (an algorithmic one) writes this
  // number as something other than ten glyphs; there is then nothing to map back and the
  // ASCII digits are the whole of what a user can type.
  if (glyphs.length !== 10) return null;
  const digits = [glyphs[9], ...glyphs.slice(0, 9)];
  return new Set(digits).size === 10 ? digits : null;
}

/**
 * How wide the window for a year written in one or two digits is, and where it sits: from 80
 * years back to 19 forward, which is the convention every other date field a user has met
 * uses. It is written down here because it is a **guess about intent** — the only one this
 * control makes — and a guess with a number in it belongs where the number can be read.
 */
const YEAR_WINDOW_BACK = 80;

/**
 * Everything about writing and reading a day in one language, built once per locale.
 *
 * @since 0.1.0
 */
export interface PctDayFormat {
  /** The locale the platform resolved, which may not be the one asked for. */
  readonly locale: string;
  /** The three fields in the order this language writes them. */
  readonly order: readonly PctDayField[];
  /** The day as this language writes it — the string the field shows. */
  format(day: PctDay): string;
  /** The full date in words, for the accessible name of a cell holding a bare number. */
  formatLong(day: PctDay): string;
  /**
   * A bare number in the digits the FIELD is written in — the day number in a grid cell.
   * It follows the date formatter's numbering system rather than the locale's own, because
   * the two can disagree: `my-MM` resolves dates to `latn` in chromium 149 and to `mymr` in
   * firefox 151, and a grid written in one system beside a field written in the other is a
   * control that looks broken in exactly one engine.
   */
  number(value: number): string;
  /**
   * A day out of what a user typed, or `null`. It accepts more widely than it writes:
   * any run of non-digits separates, the locale's own digits and the ASCII ones both count,
   * and a year in one or two digits lands in the window above.
   */
  parse(text: string): PctDay | null;
  /** `dd.mm.yyyy` in this language's order, with this language's separators. */
  hint(letters: PctDayLetters): string;
}

/** The formatters are built per locale and shared — an `Intl` object is not cheap. */
const CACHE = new Map<string, PctDayFormat>();

/**
 * The day, weekday and month names of a locale, built once and shared.
 *
 * @since 0.1.0
 */
export function pctDayFormat(locale: string): PctDayFormat {
  const cached = CACHE.get(locale);
  if (cached) return cached;
  const built = build(locale);
  CACHE.set(locale, built);
  return built;
}

function build(locale: string): PctDayFormat {
  const numeric = new Intl.DateTimeFormat(locale, {
    ...GREGORIAN,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const long = new Intl.DateTimeFormat(locale, {
    ...GREGORIAN,
    dateStyle: 'full',
  });
  const resolved = numeric.resolvedOptions();
  const digits = digitsOf(locale, resolved.numberingSystem);
  const counter = numberFormat(locale, resolved.numberingSystem);

  // The order and the separators of this language, read off a date whose three fields cannot
  // be confused with one another.
  const parts = numeric.formatToParts(pctDayAsUtc('2026-12-01'));
  const order = parts
    .filter((p) => p.type === 'year' || p.type === 'month' || p.type === 'day')
    .map((p) => p.type as PctDayField);

  /**
   * The locale's own digits, translated back to the ASCII ones. Nothing else is removed —
   * and the strip of the bidi marks that stood here is gone because a control proved it dead:
   * `ar-EG` writes its separator as `U+200F /`, and the parser splits on RUNS OF DIGITS, so
   * every character that is not one already separates. Taking the strip out left all 83 cases
   * green, which is the only reason to believe it was doing nothing.
   */
  const latin = (text: string): string => {
    if (!digits) return text;
    let s = text;
    for (let i = 0; i < 10; i++) s = s.split(digits[i]).join(String(i));
    return s;
  };

  return {
    locale: resolved.locale,
    order,
    format: (day) => numeric.format(pctDayAsUtc(day)),
    formatLong: (day) => long.format(pctDayAsUtc(day)),
    number: (value) => counter.format(value),
    parse: (text) => parse(text, order, latin),
    hint: (letters) => hint(parts, letters),
  };
}

/**
 * A counter in the date formatter's own numbering system. The system is asked for by name,
 * and a platform that will not take it is not an error worth throwing over — the ASCII digits
 * are then what the grid is written in, which is what the field falls back to as well.
 */
function numberFormat(
  locale: string,
  numberingSystem: string,
): Intl.NumberFormat {
  try {
    return new Intl.NumberFormat(locale, {
      numberingSystem,
      useGrouping: false,
    });
  } catch {
    return new Intl.NumberFormat(locale, { useGrouping: false });
  }
}

/** The format hint: the language's own separators with the reader's own letters between them. */
function hint(
  parts: readonly Intl.DateTimeFormatPart[],
  letters: PctDayLetters,
): string {
  const width: Record<PctDayField, number> = { day: 2, month: 2, year: 4 };
  return parts
    .map((part) =>
      part.type === 'literal'
        ? part.value
        : letters[part.type as PctDayField].repeat(
            width[part.type as PctDayField],
          ),
    )
    .join('');
}

function parse(
  text: string,
  order: readonly PctDayField[],
  latin: (text: string) => string,
): PctDay | null {
  const groups = latin(text).match(/\d+/g);
  if (groups === null || groups.length !== 3) return null;

  const field: Record<PctDayField, string> = { day: '', month: '', year: '' };
  order.forEach((name, i) => (field[name] = groups[i]));

  const year = fullYear(field.year);
  const month = Number(field.month);
  const day = Number(field.day);
  if (year === null) return null;

  // Built by hand rather than through `pctDay`, because `pctDay` NORMALISES an overflow and
  // this is the one caller that must not have it: `32.08.2026` is a typing mistake and
  // `01.09.2026` is not what the user meant by it.
  const candidate = `${String(year).padStart(4, '0')}-${String(month).padStart(
    2,
    '0',
  )}-${String(day).padStart(2, '0')}`;
  return isPctDay(candidate) ? candidate : null;
}

/**
 * A year written in full is the year; one written in one or two digits lands in the window
 * `[today − 80, today + 19]`, which is where a date of birth and a card expiry both are.
 * Three digits are neither, and refusing them is the honest answer: `026` is not a year
 * anybody means.
 */
function fullYear(written: string): number | null {
  if (written.length >= 4) return Number(written);
  if (written.length === 3) return null;
  const current = Number(pctToday().slice(0, 4));
  const base = current - YEAR_WINDOW_BACK;
  const candidate = Math.floor(base / 100) * 100 + Number(written);
  return candidate < base ? candidate + 100 : candidate;
}

/** A Monday, so seven days from it are a week in ISO order whatever the locale. */
const REFERENCE_MONDAY: PctDay = '2024-01-01';

/**
 * The two names a column header needs: the one the eye reads and the one a reader says.
 *
 * @since 0.1.0
 */
export interface PctWeekdayName {
  readonly narrow: string;
  readonly long: string;
}

/**
 * The seven column headings, rotated so that the first is `firstDayOfWeek`.
 *
 * Both names come from the platform: the narrow one is what fits a column, the long one is
 * what a screen reader announces — and they are two readings rather than one abbreviated,
 * because `narrow` is ambiguous by design (`S`, `S` for Saturday and Sunday in English) and
 * an ambiguous column header is a grid nobody can navigate by ear.
 *
 * @since 0.1.0
 */
export function pctWeekdayNames(
  locale: string,
  firstDayOfWeek: number,
): readonly PctWeekdayName[] {
  const narrow = new Intl.DateTimeFormat(locale, {
    ...GREGORIAN,
    weekday: 'narrow',
  });
  const long = new Intl.DateTimeFormat(locale, {
    ...GREGORIAN,
    weekday: 'long',
  });
  const names: PctWeekdayName[] = [];
  for (let i = 0; i < 7; i++) {
    // `firstDayOfWeek` is 1..7 with Monday at 1, and the reference day IS a Monday, so the
    // offset is the distance in that same ring.
    const at = pctDayAsUtc(
      shift(REFERENCE_MONDAY, (firstDayOfWeek - 1 + i) % 7),
    );
    names.push({ narrow: narrow.format(at), long: long.format(at) });
  }
  return names;
}

/** Days on from the reference Monday — a local helper so `day.ts` stays free of `Intl`. */
function shift(day: PctDay, by: number): PctDay {
  const at = pctDayAsUtc(day);
  at.setUTCDate(at.getUTCDate() + by);
  return at.toISOString().slice(0, 10);
}

/**
 * The month and year over the grid ("December 2026"), in the value's own calendar.
 *
 * @since 0.1.0
 */
export function pctMonthCaption(locale: string, day: PctDay): string {
  return new Intl.DateTimeFormat(locale, {
    ...GREGORIAN,
    month: 'long',
    year: 'numeric',
  }).format(pctDayAsUtc(day));
}
