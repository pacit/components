import type { PctAnyColumn } from './columns';

/**
 * The words of a quick-filter question, case-folded, in the order they were typed.
 *
 * Read once per question rather than once per row: a table of a thousand rows asks the same
 * question a thousand times.
 *
 * @since next
 */
export function pctQuestionWords(question: string): readonly string[] {
  // `\s` takes the no-break spaces a pasted value carries as well as the ones typed.
  return question
    .toLowerCase()
    .normalize('NFC')
    .split(/\s/)
    .filter((word) => word !== '');
}

/**
 * Whether a row answers a quick-filter question: every word is found in some column the
 * filter reads.
 *
 * **What is searched is what the user sees.** `text` gives the cell's text as the table
 * writes it — `7 899,7 kWh`, not `7899.7` — so a question copied off the screen finds its
 * row. A word holds no space, so the no-break spaces a locale writes inside a value never stand
 * in its way, and a number the locale groups with spaces is read as several words. Both
 * sides are lower-cased and composed (NFC), so an accent typed as one character finds the
 * same accent stored as two; that is all: accents are not folded, for the reason the select's filter gives
 * ([`lesson-101`](../../../../../docs/lessons.md#lesson-101)). A column whose `filter` is a
 * function is asked that function per word instead; one whose `filter` is `false` is not read.
 *
 * **Every word, in any column.** `kitchen lamp` finds the lamp in the kitchen when the room
 * and the name are two columns, which a single substring over each cell would not.
 *
 * A question of no words is answered by every row.
 *
 * @since next
 */
export function pctMatches<T>(
  row: T,
  columns: readonly PctAnyColumn<T>[],
  text: (column: PctAnyColumn<T>, row: T) => string,
  words: readonly string[],
): boolean {
  const read = columns.filter((column) => column.filter !== false);
  const texts: (string | undefined)[] = [];
  return words.every((word) =>
    read.some((column, c) => {
      const filter = column.filter;
      if (typeof filter === 'function') return filter(column.value(row), word);
      texts[c] ??= text(column, row).toLowerCase().normalize('NFC');
      return (texts[c] as string).includes(word);
    }),
  );
}
