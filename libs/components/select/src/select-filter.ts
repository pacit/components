import type { PctSelectFilter } from './select.types';

/**
 * The default filter: the label, case-folded, **contains** what was typed.
 *
 * What it deliberately does not do is fold accents, and that is a measurement rather than a
 * shortcut. `Intl.Collator(locale, { sensitivity: 'base' })` — the setting whose entire job is
 * "ignore the accents" — answers the question **per language**: an `o` with an umlaut and a
 * plain `o` are one letter in German and in English and two in Swedish and in Danish, on the
 * same pair of strings. And the trick every library reaches for instead, `normalize('NFD')`
 * with the combining marks stripped, is not consistent with itself: it folds the accents that
 * come apart and leaves the ones that are a codepoint of their own, so an umlaut goes and a
 * stroke through the letter stays — which makes a Danish label reachable by typing the slashed
 * letter and unreachable by typing the plain one, in a library that never said which of the
 * two the user is in ([`lesson-101`](../../../../docs/lessons.md#lesson-101)).
 *
 * So the library folds case and stops there, and a list that needs its own idea of "the same
 * letter" says so in a `filterWith` of its own — where the application's language is known,
 * which is the one place the question has an answer.
 *
 * @since 0.1.0
 */
export const pctFilterByLabel: PctSelectFilter<unknown> = (option, query) =>
  option.label.toLowerCase().includes(query.toLowerCase());

/**
 * The predicate that decides nothing: **for a list somebody else has already narrowed.** An
 * application filtering on a server answers the question with another `options` list, and the
 * control would otherwise narrow that answer a second time — a server that matched a city by
 * its old name, by a code or by a misspelling would watch the row it found be taken out again
 * by a client-side `includes`, in a library that never said it would
 * ([0037](../../../../docs/decisions/0037-loading-is-a-fact-about-the-list.md)).
 *
 * It is a constant and not `() => true` written into the template, and that is a cost rather
 * than a style: an arrow in a binding is a NEW function on every change detection pass, so
 * the input changes, the predicate changes, and every row of the panel is rebuilt for as long
 * as the page lives. One shared identity is the whole difference.
 *
 * @since 0.1.0
 */
export const pctKeepAll: PctSelectFilter<unknown> = () => true;
