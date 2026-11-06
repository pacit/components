import { pctInstantOf, pctWallClockOf } from '@pacit/components/core';
import type { PctAnyCellKind, PctInstantCellOptions } from './columns';

/**
 * What separates the cells of a line: a comma, a semicolon where a comma is the locale's
 * decimal separator, a tab on the clipboard.
 *
 * @since 0.3.1
 */
export type PctDelimiter = ',' | ';' | '\t';

/**
 * The delimiter a spreadsheet of `locale` reads a CSV file with: a semicolon where the locale
 * writes its decimals with a comma — `pl`, `de`, `fr` — so `1950,3` stays one cell, and a comma
 * everywhere else.
 *
 * @example
 * pctDelimiterOf('pl'); // ';'
 * pctDelimiterOf('en'); // ','
 *
 * @since 0.3.1
 */
export function pctDelimiterOf(locale: string): ',' | ';' {
  return decimalOf(locale) === ',' ? ';' : ',';
}

/**
 * Cells written as delimited text, as RFC 4180 has it: lines ended by CR LF, and a cell that
 * holds the delimiter, a quote or a line break in quotes, its quotes doubled. What a cell
 * holds is the caller's: this writes text, it does not decide it.
 *
 * @example
 * pctWriteDelimited([['Name', 'Note'], ['Lamp', 'say "hi"']], ',');
 * // 'Name,Note\r\nLamp,"say ""hi"""\r\n'
 *
 * @since 0.3.1
 */
export function pctWriteDelimited(
  cells: readonly (readonly string[])[],
  delimiter: PctDelimiter,
): string {
  return cells
    .map(
      (line) =>
        line
          .map((cell) =>
            cell.includes(delimiter) || /["\r\n]/.test(cell)
              ? `"${cell.replace(/"/g, '""')}"`
              : cell,
          )
          .join(delimiter) + '\r\n',
    )
    .join('');
}

/**
 * Delimited text read back into cells, as RFC 4180 has it and as a spreadsheet puts it on the
 * clipboard: a line ends at CR LF or at LF alone, a quoted cell holds anything, a doubled quote
 * in it is one. The break after the last line ends it rather than opening another, so a copy
 * of one cell is one cell; text with no cells is no line. A quote
 * that closes before more text, or never, is a character of a cell written as it is: `5" disk`.
 *
 * @example
 * pctParseDelimited('Lamp\t12\r\nFan\t"4\n0"\r\n', '\t'); // [['Lamp', '12'], ['Fan', '4\n0']]
 *
 * @since 0.3.1
 */
export function pctParseDelimited(
  text: string,
  delimiter: PctDelimiter,
): string[][] {
  const lines: string[][] = [];
  let line: string[] = [];
  let cell = '';
  let quoted = false;
  // Where the quoted cell began, and a quote there read as a character: a cell whose quote never
  // closes, or closes before more text, is read as it was written.
  let start = -1;
  let literal = -1;
  let at = 0;
  const ends = (next: string | undefined) =>
    next === undefined || next === delimiter || next === '\n' || next === '\r';
  while (at < text.length || quoted) {
    if (at >= text.length) {
      literal = start;
      at = start;
      cell = '';
      quoted = false;
      continue;
    }
    const character = text[at];
    if (quoted) {
      if (character !== '"') cell += character;
      else if (text[at + 1] === '"') {
        cell += '"';
        at++;
      } else if (ends(text[at + 1])) quoted = false;
      else {
        literal = start;
        at = start;
        cell = '';
        quoted = false;
        continue;
      }
    } else if (character === '"' && cell === '' && at !== literal) {
      quoted = true;
      start = at;
    } else if (character === delimiter) {
      line.push(cell);
      cell = '';
    } else if (character === '\n' || character === '\r') {
      line.push(cell);
      lines.push(line);
      line = [];
      cell = '';
      if (character === '\r' && text[at + 1] === '\n') at++;
    } else cell += character;
    at++;
  }
  if (cell !== '' || line.length > 0) lines.push([...line, cell]);
  return lines;
}

/**
 * How a column's value is written for another program to read as the value it is, rather
 * than as the table shows it: a number with the locale's decimal separator and nothing else —
 * no grouping, no unit, every digit it has, and a point where the locale's mark is neither a point
 * nor a comma; an instant as its wall clock in the column's zone,
 * `2026-11-03 14:05:00`, or its day alone, `2026-11-03`, where the column shows no time; a
 * boolean as `true` or `false`, which is its text; any other value as its text. An empty value is empty.
 *
 * @example
 * pctPlainWriter({ number: { unit: 'kWh', fractionDigits: 1 } }, 'pl')(1950.25); // '1950,25'
 *
 * @since 0.3.1
 */
export function pctPlainWriter(
  kind: PctAnyCellKind | undefined,
  locale: string,
): (value: unknown) => string {
  if (typeof kind === 'object' && kind.number) {
    // A comma where the locale writes one, else a point: the two a sheet reads a number by.
    const decimal = decimalOf(locale) === ',' ? ',' : '.';
    return (value) =>
      Number.isFinite(value) ? String(value).replace('.', decimal) : '';
  }
  if (typeof kind === 'object' && kind.instant) {
    const { timeZone } = kind.instant;
    const time = pctShowsTime(kind.instant);
    return (value) => {
      if (!Number.isFinite(value)) return '';
      const clock = pctWallClockOf(value as number, timeZone);
      const day = `${pad(clock.year, 4)}-${pad(clock.month)}-${pad(clock.day)}`;
      return time
        ? `${day} ${pad(clock.hour)}:${pad(clock.minute)}:${pad(clock.second)}`
        : day;
    };
  }
  return (value) =>
    value === null || value === undefined ? '' : String(value);
}

/**
 * How a column's value is read from text another program wrote — a cell pasted from a sheet:
 * a number in the locale's way or with a point, its groups where they stand between thousands after a first group of up to three digits;
 * an instant as `2026-11-03`, `2026-11-03 14:05`, with seconds, with milliseconds, with `T`, and
 * with an offset or `Z`, without one on the column's zone's wall clock; a boolean as `true`,
 * `false`, `1`, `0` or the words the table writes it in; a text as it is. Empty text is an
 * empty value — `null`, or `''` for a text. Text that is no value of the kind is `undefined`.
 *
 * @example
 * pctPlainReader({ number: {} }, 'pl')('1 950,3'); // 1950.3
 * pctPlainReader({ number: {} }, 'pl')('12 W'); // undefined
 *
 * @since 0.3.1
 */
export function pctPlainReader(
  kind: PctAnyCellKind | undefined,
  locale: string,
  words: { readonly yes: string; readonly no: string },
): (text: string) => unknown {
  if (kind === 'boolean') {
    const yes = ['true', '1', words.yes.toLocaleLowerCase(locale)];
    const no = ['false', '0', words.no.toLocaleLowerCase(locale)];
    return (text) => {
      const word = text.trim().toLocaleLowerCase(locale);
      if (word === '') return null;
      return yes.includes(word) ? true : no.includes(word) ? false : undefined;
    };
  }
  if (typeof kind === 'object' && kind.number) {
    const decimal = decimalOf(locale);
    // Either apostrophe for one: `Intl` groups `de-CH` with one or the other, as its data has it.
    const group = groupOf(locale).replace('\u2019', "'");
    return (text) => {
      // The spaces a locale groups with, and the marks `Intl` writes around a sign.
      let s = text
        .replace(/[\s\u200e\u200f\u061c\u2066-\u2069]/g, '')
        .replace(/\u2019/g, "'");
      if (s === '') return null;
      s = s.replace(/\u2212/g, '-');
      // A group separator only where it stands between thousands after a first group of one to
      // three digits, so `1234.567` and `0.125` stay decimals in a German table. A locale that
      // groups with a space had it taken out above; one that groups with nothing finds no three
      // digits between its empty marks.
      const parts = s.split(group);
      const last = parts.length - 1;
      if (
        /^[+-]?[1-9]\d{0,2}$/.test(parts[0]) &&
        parts
          .slice(1)
          .every((part, i) =>
            i + 1 === last ? /^\d{3}(\D|$)/.test(part) : /^\d{3}$/.test(part),
          )
      )
        s = parts.join('');
      s = s.replace(decimal, '.');
      // Digits, a point, a sign and an exponent: what `Number` reads that a sheet does not, a
      // hexadecimal `0x10` or `Infinity`, is no number here.
      if (/[^\d.e+-]/i.test(s)) return undefined;
      const value = Number(s);
      return Number.isFinite(value) ? value : undefined;
    };
  }
  if (typeof kind === 'object' && kind.instant) {
    const { timeZone } = kind.instant;
    return (text) => {
      const s = text.trim();
      if (s === '') return null;
      const m =
        /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?)?(Z|[+-]\d{2}:?\d{2})?$/.exec(
          s,
        );
      if (m === null) return undefined;
      const [year, month, day, hour, minute, second] = m
        .slice(1, 7)
        .map((field) => Number(field ?? 0));
      const millisecond = m[7] === undefined ? 0 : Number(m[7].padEnd(3, '0'));
      if (hour > 23 || minute > 59 || second > 59) return undefined;
      // A day the month has: `Date.UTC` rolls 2026-02-30 over into March, and a month 0 or 13
      // and a day 0 or 32 into another month.
      if (new Date(Date.UTC(year, month - 1, day)).getUTCMonth() !== month - 1)
        return undefined;
      const clock = { year, month, day, hour, minute, second, millisecond };
      const offset = m[8];
      if (offset === undefined) return pctInstantOf(clock, timeZone);
      const utc = Date.UTC(
        year,
        month - 1,
        day,
        hour,
        minute,
        second,
        millisecond,
      );
      if (offset === 'Z') return utc;
      const sign = offset[0] === '-' ? -1 : 1;
      const digits = offset.slice(1).replace(':', '');
      const hours = Number(digits.slice(0, 2));
      const rest = Number(digits.slice(2));
      if (hours > 23 || rest > 59) return undefined;
      return utc - sign * (hours * 60 + rest) * 60_000;
    };
  }
  return (text) => text;
}

/**
 * Whether an instant kind writes the time of day, and not its day alone: a relative instant
 * does, and a format that asks for an hour, a minute, a second or a time style; with no format
 * the platform writes the day.
 *
 * @since 0.3.1
 */
export function pctShowsTime(instant: PctInstantCellOptions): boolean {
  if (instant.relative) return true;
  const format = instant.format ?? {};
  return (
    format.hour !== undefined ||
    format.minute !== undefined ||
    format.second !== undefined ||
    format.timeStyle !== undefined
  );
}

function pad(value: number, width = 2): string {
  return String(value).padStart(width, '0');
}

/** The locale's decimal separator. */
function decimalOf(locale: string): string {
  return separatorOf(locale, 'decimal');
}

/** The locale's group separator, `''` where it groups with none. */
function groupOf(locale: string): string {
  return separatorOf(locale, 'group');
}

function separatorOf(locale: string, type: 'decimal' | 'group'): string {
  return (
    new Intl.NumberFormat(locale || undefined)
      .formatToParts(12345.6)
      .find((part) => part.type === type)?.value ?? ''
  );
}
