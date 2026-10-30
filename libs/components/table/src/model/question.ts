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

/**
 * A piece of a cell's text, and whether a word of the question found it.
 *
 * @since next
 */
export interface PctTextPart {
  readonly text: string;
  readonly match: boolean;
}

/**
 * A cell's text cut where the words of a quick-filter question were found, so the table can
 * mark them: every place every word stands, folded as {@link pctMatches} folds, the places
 * that overlap or touch drawn as one.
 *
 * A text whose folding changes its length at either step — a letter whose lower case is two,
 * an accent stored as two characters — is returned whole and unmarked: a place found in the folded
 * text would not be the same place in the text drawn, and a mark in the wrong place says
 * the wrong thing.
 *
 * @example
 * pctMatchParts('Kitchen lamp', ['kitch']); // [{ text: 'Kitch', match: true }, { text: 'en lamp', match: false }]
 *
 * @since next
 */
export function pctMatchParts(
  text: string,
  words: readonly string[],
): readonly PctTextPart[] {
  const lower = text.toLowerCase();
  const folded = lower.normalize('NFC');
  const places: [number, number][] = [];
  // Both steps keep the length, or neither moved a place: a lower case that grew and a
  // composition that shrank it back would leave the length and shift every place between.
  if (lower.length === text.length && folded.length === text.length)
    for (const word of words) {
      // An empty word stands everywhere and marks nothing; `pctQuestionWords` writes none.
      if (word === '') continue;
      for (
        let at = folded.indexOf(word);
        at >= 0;
        at = folded.indexOf(word, at + 1)
      )
        places.push([at, at + word.length]);
    }
  places.sort((a, b) => a[0] - b[0]);
  const parts: PctTextPart[] = [];
  let from = 0;
  for (const [start, end] of places) {
    const last = parts.at(-1);
    // A place that overlaps the last mark or starts where it ends grows it.
    if (last && start <= from) {
      if (end > from) {
        parts[parts.length - 1] = {
          text: last.text + text.slice(from, end),
          match: true,
        };
        from = end;
      }
      continue;
    }
    if (start > from)
      parts.push({ text: text.slice(from, start), match: false });
    parts.push({ text: text.slice(start, end), match: true });
    from = end;
  }
  if (from < text.length || parts.length === 0)
    parts.push({ text: text.slice(from), match: false });
  return parts;
}
