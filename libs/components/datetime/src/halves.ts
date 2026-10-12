import { pctDateTimeAsUtc } from './datetime';

/**
 * One of the two texts of the datetime field — what each holds, named as `PctDateTimeParts`
 * names the halves of the value. Private to this entrypoint, like the time's lattice.
 */
export type PctDateTimeHalf = 'day' | 'time';

/**
 * The two halves in the order this language writes a day with a time: the day first in 51 of
 * the 52 locales 0090 measured, and the time first in Vietnamese (`13:05 01/12/2026`, C1) — read
 * off `formatToParts` of one pair whose fields cannot be confused, with the numeric fields the
 * halves' own formatters write, so the field agrees with what its language writes. The literal
 * between the halves is never read: it is a comma in Berlin, a space in Paris and a word in
 * Helsinki (C2), and two texts are what let the field leave it unwritten.
 */
export function pctDateTimeHalves(
  locale: string,
): readonly [PctDateTimeHalf, PctDateTimeHalf] {
  const parts = new Intl.DateTimeFormat(locale, {
    calendar: 'gregory',
    timeZone: 'UTC',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).formatToParts(pctDateTimeAsUtc('2026-12-01T13:05'));
  // The question is only which half the FIRST field belongs to: no language measured writes a
  // half inside the other, so the first field that is not a literal decides — a day, a month
  // or a year opens the day's half; anything else, the hour or a day period, the time's. Of the
  // 250 languages node's ICU formats, Vietnamese opens on the hour and Ewe on its day period,
  // and none opens on a literal; the literal is passed over all the same, because the
  // browsers' ICU is another build and a mark before the first field would read as the time.
  const first = parts.find((part) => part.type !== 'literal')?.type;
  return first === 'day' || first === 'month' || first === 'year'
    ? ['day', 'time']
    : ['time', 'day'];
}
