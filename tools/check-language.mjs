#!/usr/bin/env node
/**
 * Language gate: does `req-project-language` — "the repository speaks one language" — have
 * a measurement behind it, or a sentence in the documentation that both sides broke while
 * it stood? A second language leaves NO RED TEST: it compiles, it renders, it ships.
 *
 *  1. DENOMINATOR: the scan can see, split and look up — proved on probes and canaries,
 *  2. REPOSITORY: no Polish in the git index outside the register,
 *  3. ARTIFACT: no Polish in the built package — with no register at all,
 *  4. the register of exceptions is alive and justified,
 *  5. the vocabulary names words, never shapes, and every entry still earns its place,
 *  6. the list of machine-written files is alive,
 *  7. the specimens — this gate's own samples — stay inside this gate's own tree.
 *
 * TWO MEASUREMENTS OF DIFFERENT REACH: the public surface on the ARTIFACT a consumer opens,
 * the rest of the repository on the GIT INDEX. Six limbs, each blind where the next sees —
 * each constant below says what its limb holds and cannot (`lesson-60`, `lesson-77`, `lesson-80`).
 *
 * Usage: node tools/check-language.mjs
 */
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { dirname, extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';
import {
  restoreDictionaries,
  DictionaryError,
} from './restore-dictionaries.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FIXTURES = join(ROOT, 'tools/check-language.fixtures');
const REFERENCE = '_reference.json';

const POLICY = 'tools/language.policy.json';
const DIST = 'dist/libs/components';
const PACKAGE_SOURCES = 'libs/';

/**
 * The one tree that carries Polish by construction: this gate and its fixtures. A canary
 * has to be a word a dictionary really holds and a diacritics case has to carry real
 * diacritics, so an instrument for finding Polish cannot be written without any.
 *
 * The prefix is HARD-CODED rather than configured, and that is the whole safety of the
 * idea: the policy can name which files of this tree are specimens, and it can never widen
 * the tree. A register that could excuse an arbitrary directory would be the second
 * language's way back in, with a sentence to justify it.
 */
const SPECIMENS = 'tools/check-language.';

/**
 * Both lists are restored and hash-verified out of `tools/dictionaries.lock.json` before
 * the run reads a word — never taken from `/usr/share/dict`. What a machine has installed
 * is an ambient version: the first CI run had none at all, and the pin's own measurement
 * caught one package name serving two lists a word apart. The paths are spelled here
 * rather than derived from the lock so that the canaries' messages name real files; were
 * the lock's `cache` ever moved without these, the run would die on ENOENT — loudly,
 * which is the acceptable way for a path to be wrong.
 */
const DICTIONARY = 'tools/.dictionaries/polish';
const ENGLISH = 'tools/.dictionaries/american-english';

/**
 * What the artifact limb reads. Source maps are on the list deliberately: they carry the
 * ORIGINAL text of every comment, so a package can measure clean on its `.d.ts` and ship
 * the same sentence one file further on.
 */
const TEXT = new Set([
  '.css',
  '.scss',
  '.js',
  '.mjs',
  '.ts',
  '.json',
  '.md',
  '.map',
  '.html',
]);

const FOLD = {
  ą: 'a',
  ć: 'c',
  ę: 'e',
  ł: 'l',
  ń: 'n',
  ó: 'o',
  ś: 's',
  ź: 'z',
  ż: 'z',
};

const DIACRITIC = /[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/;
const QUOTE = '„';

/**
 * `ɵ` (U+0275) is on the list because it IS a letter and Angular builds identifiers out of
 * it — `ɵfac`, `ɵcmp`, `ɵmod`. Left out, it separates instead of joining, and the compiler's
 * own property names arrive at the dictionary as `fac`, `cmp`, `mod`: words nobody wrote,
 * in a language nobody chose.
 */
const LETTERS = /[A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźżɵ]+/g;

/**
 * Where an identifier comes apart. `ustawienieDomyslne` at the lowercase-to-uppercase seam,
 * `HTMLElement` before the last capital of a run — and `MOJA_WARTOSC` needs no rule at all,
 * because `_` is not a letter and `LETTERS` never joins across it. That is the whole answer
 * to `SCREAMING_CASE`: it is not excused anywhere, it simply splits.
 */
const CAMEL =
  /(?<=[a-ząćęłńóśźżɵ])(?=[A-ZĄĆĘŁŃÓŚŹŻ])|(?<=[A-ZĄĆĘŁŃÓŚŹŻ])(?=[A-ZĄĆĘŁŃÓŚŹŻ][a-ząćęłńóśźżɵ])/;

/**
 * The probe of point 1. Not a sample of the repository — a constant, so the denominator
 * says something about the INSTRUMENT and not about what it happens to be pointed at
 * ([`lesson-48`](../docs/lessons.md#lesson-48)). It has to come apart into all four words:
 * `MOJA_WARTOŚĆ` proves the split at `_` and the fold of `Ś`/`Ć`, `ustawienieDomyslne`
 * the split at camelCase.
 */
const PROBE = 'const MOJA_WARTOŚĆ = "ustawienieDomyslne";';
const PROBE_WORDS = ['moja', 'wartosc', 'ustawienie', 'domyslne'];

/**
 * The canaries of the dictionary limb, each answering a different way for the lookup to go
 * quiet. `ustawienie` says the Polish list was read at all; `wartosc` — a spelling that
 * stands in the dictionary only WITH diacritics — says it was folded; `test` says the
 * English list was subtracted, and it is the one that would drown the gate in false
 * positives if it were not.
 */
const CANARY = {
  read: 'ustawienie',
  folded: 'wartosc',
  shared: 'test',
  /**
   * The fourth limb's own canary, and it answers for the ENGLISH list read the other way
   * round: not as the subtraction that keeps the second limb usable, but as the source of
   * the STEMS the fourth one stands on. Unread, the second limb drowns the gate in false
   * positives and everybody notices; the fourth simply finds nothing and stays green.
   */
  stem: 'build',
};

/**
 * The endings of the fourth limb, and the whole of what it looks for. A noun borrowed into
 * Polish is declined like a Polish one: the foreign stem stays whole and the ending is glued
 * to it, so the word belongs to neither list — the Polish one holds no such stem, the
 * English one no such tail.
 *
 * NAMING A SHAPE IS WHAT A DETECTOR DOES, and it is the inverse of what point 5 forbids the
 * register: an excused shape lets a whole grammatical class through, a hunted shape lets a
 * whole grammatical class be seen. The list is closed and it is three families — the cases
 * of a masculine noun (the pattern every English borrowing takes), the two feminine
 * diminutive forms whose ending leaves the stem whole, and the verb and adjective a
 * borrowing grows.
 *
 * WHAT IT CANNOT SEE is written down rather than discovered later: where the case softens
 * the stem's LAST LETTER the ending replaces it — a `t` becomes `ci`, an `r` becomes `rz` —
 * and no strip returns the stem, so those forms pass. `-zie` is here because it is the one
 * softening that adds rather than replaces: a stem ending in `d` keeps the `d`.
 */
const ENDINGS = [
  // the seven cases, singular and plural
  'a',
  'u',
  'owi',
  'em',
  'ie',
  'y',
  'i',
  'e',
  'ow',
  'om',
  'ami',
  'ach',
  'owie',
  // the softened locative that leaves the stem whole, and the feminine diminutive
  'zie',
  'ka',
  'ki',
  'ku',
  'ce',
  // the verb made of the borrowing, and the adjective made of the verb
  'owac',
  'owanie',
  'owania',
  'owany',
  'owana',
  'owane',
  'owal',
  'owala',
  'owano',
  'uje',
  'ujesz',
  'ujemy',
  'uja',
  'owy',
  'owa',
  'owe',
  'owego',
  'owym',
  'owych',
].sort((a, b) => b.length - a.length); // longest first: the split a reader is shown is the plausible one

/**
 * The probe of the fourth limb — a constant, like `PROBE`, so point 1 says something about
 * the instrument rather than about what it is pointed at. It has to be recognised: an
 * emptied ending list, a strip off by one, a stem lookup reading the wrong set, and the limb
 * goes quiet on the one class no other limb sees.
 */
const PROBE_INFLECTED = 'buildzie';

/**
 * The fourth limb over one word: `null`, or the split that makes it a borrowing declined in
 * Polish. `english` ends the question — a word an English list holds is an English word,
 * whatever its tail. `stems` is wider by this gate's own vocabulary, because the foreign
 * words this repository writes are not all in a spelling list from another decade: `config`
 * and `repo` are stems here exactly as `script` and `build` are.
 *
 * A single letter is not a stem. `american-english` lists the alphabet, so without that line
 * every word ending in a vowel comes apart into a letter and an ending.
 */
const inflectionOf = (word, english, stems) => {
  if (english.has(word)) return null;
  for (const ending of ENDINGS) {
    if (!word.endsWith(ending)) continue;
    const stem = word.slice(0, -ending.length);
    if (stem.length > 1 && stems.has(stem)) return { stem, ending };
  }
  return null;
};

/**
 * The suffixes of the fifth limb, and the whole of what it looks for. Polish makes new words
 * out of its own: an agent noun from a noun or a verb, an abstract noun from either, an
 * adjective from all of them — productively, which is why a word list always trails the
 * language and holds two of the three.
 *
 * THE CLAIM IS NARROWER THAN THE FOURTH LIMB'S by one dictionary fact. There the stem is
 * anything at all and the ending carries the finding; here the stem has to be a word
 * `/usr/share/dict/polish` confirms, so the two ends of the split are both looked up and
 * only the join between them is guessed at. Measured on the run that opened it: 5715 distinct
 * words of this repository, seven splits — one the word the limb was written for, one the
 * fourth limb's probe in this file, five English agent nouns now named in the policy one by
 * one.
 *
 * WHAT IT CANNOT SEE, written down rather than discovered later: a derivation that softens
 * the stem's last letter before the suffix — a `k` becoming `cz`, a `g` becoming `z` — leaves
 * no stem to look up, and neither does one whose stem the word list is missing too. The gap is
 * in the list, and this limb reads the same list.
 */
const SUFFIXES = [
  // the agent and the instrument: what does the thing, and what it is done with
  'ator',
  'tor',
  'or',
  'acz',
  'nik',
  'arz',
  'ca',
  'ec',
  'ista',
  // the abstract noun: the property, the action, the doctrine
  'nosc',
  'osc',
  'anie',
  'enie',
  'acja',
  'cja',
  'izm',
  'stwo',
  'ctwo',
  // the adjective made of any of them, and the diminutive
  'alny',
  'liwy',
  'owy',
  'ny',
  'ski',
  'cki',
  'ek',
  'ka',
].sort((a, b) => b.length - a.length); // longest first: the split a reader is shown is the plausible one

/**
 * The probe of the fifth limb, and it is the specimen the limb was written for: the name
 * `tools/check-bundle.mjs` gave the function that builds an entrypoint's import specifier.
 * It stood there green through the whole language gate and through sixteen findings after
 * it, because `/usr/share/dict/polish` holds the noun it is made from and the abstract noun
 * made from that one, and not this one. It lives here now, as a constant of the instrument,
 * for the same reason `owany` does: the gate's own tree is the one place in this repository
 * where such a word may stand ([`lesson-77`](../docs/lessons.md#lesson-77)).
 */
const PROBE_DERIVED = 'specyfikator';

/**
 * The sixth limb: a ONE-LETTER Polish word, read by the company it keeps and not by any
 * dictionary. `w`, `z`, `o`, `u` and `i` are all Polish words and all things an English
 * source writes constantly — an index, a width, a loop variable — so a list cannot judge
 * them; and the dictionaries cannot either, because `american-english` lists the whole
 * alphabet, so every letter is subtracted as English before anything looks at it. That is
 * how `has no card at all w \`docs/components/\`` walked through the gate (`lesson-77`): not
 * a floor on word length, which this gate never had, but a dictionary holding `w` as a word.
 *
 * What decides is CONTEXT. The letter counts when it stands in prose — between two words,
 * a single space either side, the word before it at least two letters long and the thing
 * after it a word or a quoted one — and prose is a Markdown line outside a fence, a comment,
 * or a string literal; an inline code span is not prose, and neither is code. `a` is left
 * out: it is the English article, and no context tells the two apart. Lowercase only, on
 * purpose — the English pronoun is `I`.
 */
const ONE_LETTER = new Set(['i', 'o', 'u', 'w', 'z']);
const ONE_LETTER_AT =
  /(?<=(?:^|[^\p{L}`'"])[\p{L}]{2,} )([iouwz])(?= (?:[\p{L}]{2,}|\\?[`'"„«(][\p{L}]))/gu;
const COMMENT_START = /^\s*(\/\/|\*|\/\*|<!--|#)/;
const PROBE_ONE_LETTER = '// it has no card at all w `docs/components/`';

/**
 * The odd-count test: is `position` inside a run opened by `mark` on this line? An escaped
 * mark (`\\\``) opens nothing — it is how a template literal quotes a path.
 */
const inside = (line, position, mark) =>
  (line.slice(0, position).match(new RegExp(`(?<!\\\\)\\${mark}`, 'g')) ?? [])
    .length %
    2 ===
  1;

/**
 * Whether the letter at `position` stands in prose. The three homes of prose and the one
 * thing that is never prose inside any of them, an inline code span; in source that is not
 * a comment, a string is the prose and a template literal is a string.
 */
const proseAt = (line, position, { markdown, fenced }) => {
  if (markdown) return !fenced && !inside(line, position, '`');
  const comment = line.search(/\/\/|<!--/);
  if (COMMENT_START.test(line) || (comment !== -1 && comment < position)) {
    const from = Math.max(0, line.search(/\/\/|<!--|\/\*|\*|#/));
    return !inside(line.slice(from), position - from, '`');
  }
  if (inside(line, position, "'") || inside(line, position, '"'))
    return !inside(line, position, '`');
  return inside(line, position, '`');
};

/**
 * Every one-letter Polish word standing in prose, with its line — and `seen`, how many
 * such letters stood between two words at all, prose or not: the denominator of this limb,
 * which is the number the item that asked for it said nobody measures. The fence state is
 * kept across lines, because a Markdown code block is prose to no reader.
 */
export const oneLetterWords = (text, path = '') => {
  const markdown = path.endsWith('.md');
  const found = [];
  let seen = 0;
  let fenced = false;
  text.split('\n').forEach((line, i) => {
    if (markdown && /^\s*```/.test(line)) {
      fenced = !fenced;
      return;
    }
    for (const m of line.matchAll(ONE_LETTER_AT)) {
      if (!ONE_LETTER.has(m[1])) continue;
      seen++;
      if (proseAt(line, m.index, { markdown, fenced }))
        found.push({ word: m[1], line: i + 1 });
    }
  });
  return { found, seen };
};

/**
 * The fifth limb over one word: `null`, or the split that makes it a Polish word derived
 * from another. `english` ends the question, as in the fourth limb — a word an English list
 * holds is an English word. `polish` is the set the SECOND limb flags on, read here for
 * stems, so what the limb finally claims is "the dictionary knows the stem, and neither
 * dictionary knows the word".
 *
 * The English agent nouns this catches (`locator`, `activator`) are false positives and go
 * into the vocabulary one by one. Not into this function: a rule that says "quiet when the
 * stem plus `ate` is English" is an excused SHAPE, and it excuses it where point 5 cannot
 * see it.
 */
const derivationOf = (word, english, polish) => {
  if (english.has(word) || polish.has(word)) return null;
  for (const suffix of SUFFIXES) {
    if (!word.endsWith(suffix)) continue;
    const stem = word.slice(0, -suffix.length);
    if (stem.length > 1 && polish.has(stem)) return { stem, suffix };
  }
  return null;
};

const fold = (word) =>
  word.toLowerCase().replace(/[ąćęłńóśźż]/g, (c) => FOLD[c]);

/** A word that may stand in the vocabulary: a bare folded word, so no shape can hide in it. */
const PLAIN = /^[a-z]+$/;

class LanguageError extends Error {
  constructor(check, rule, description) {
    super(description);
    this.check = check;
    this.rule = rule;
  }
}

const list = (items) => items.map((i) => `      ${i}`).join('\n');

/** At most `n` of them, and the rest counted — a translation pass has more than fits. */
const some = (items, n = 12) =>
  items.length <= n
    ? list(items)
    : `${list(items.slice(0, n))}\n      … and ${items.length - n} more`;

// ── the measurement ─────────────────────────────────────────────────────────────

/**
 * A source map read AS A SOURCE MAP. Its `mappings` field is base64 VLQ by the spec — read
 * as letters it gives two-letter runs by the thousand, the same debris a lockfile's
 * `integrity` gives. The text a person wrote is in the other fields, `sourcesContent` above
 * all: that is where a comment translated in the source but not rebuilt would still stand,
 * so the file is narrowed rather than skipped.
 *
 * An unparseable map is scanned whole. A gate that goes quiet on a file it failed to
 * understand is the defect this whole instrument is against.
 */
const sourceMapText = (text) => {
  let map;
  try {
    map = JSON.parse(text);
  } catch {
    return text;
  }
  return [
    map.file ?? '',
    ...(map.sources ?? []),
    ...(map.names ?? []),
    ...(map.sourcesContent ?? []),
  ].join('\n');
};

/** The text of a file as this gate reads it — a source map through its fields. */
const textOf = (file) =>
  file.path?.endsWith('.map')
    ? sourceMapText(file.text ?? '')
    : (file.text ?? '');

/**
 * Every word of a text, with the line it stands on. Exported because the measurement needs
 * it before the checks do — the dictionary is 61 MB and is read against the words really
 * found, not the other way round.
 */
export const wordsOf = (text) => {
  const out = [];
  text.split('\n').forEach((line, i) => {
    for (const run of line.match(LETTERS) ?? [])
      for (const part of run.split(CAMEL)) {
        const word = fold(part);
        if (word) out.push({ word, line: i + 1 });
      }
  });
  return out;
};

// ── the checks ──────────────────────────────────────────────────────────────────

/**
 * The full set of checks over a ready input:
 *   `policy` — the contents of `language.policy.json`,
 *   `files`  — `[{ path, scope, text }]`, `scope` being `repository` or `artifact`,
 *   `polish` — the words the dictionary confirmed: in the Polish list, not in the English
 *              one, already folded,
 *   `english` — the same reading of `american-english`, over the scanned words AND over the
 *              stems they yield when an ending comes off. Two limbs read it for opposite
 *              purposes: the second subtracts it, the fourth stands on it,
 *   `probe`  — the text of point 1, `PROBE` unless a fixture says otherwise. The words it
 *              has to yield stay constant, so a case can hand it a line with the seams
 *              taken out and prove that the SPLIT is what produces them. The real run
 *              never passes it,
 *   `inflected` — the same idea for the fourth limb: `PROBE_INFLECTED` unless a fixture
 *              hands the bare stem instead, which is what proves the ENDING is doing the
 *              work,
 *   `derived` — and for the fifth: `PROBE_DERIVED` unless a fixture hands the stem the
 *              suffix comes off, which proves the SUFFIX is.
 * Throws `LanguageError` on the first violation — the checks start from the denominator,
 * so the later ones would have nothing to examine anyway.
 */
export const checkLanguage = ({
  policy,
  files,
  polish,
  english,
  probe: text,
  inflected,
  derived,
  oneLetter,
}) => {
  const confirmed = new Set(polish ?? []);
  const known = new Set(english ?? []);
  const exceptions = policy?.exceptions ?? [];
  const generated = policy?.generated ?? [];
  const specimens = policy?.specimens ?? [];
  const groups = Object.entries(policy?.vocabulary ?? {});
  const vocabulary = new Set(
    groups.flatMap(([, group]) => group?.words ?? []).map((w) => fold(w)),
  );
  const stems = new Set([...known, ...vocabulary]);

  const scoped = (scope) => (files ?? []).filter((f) => f.scope === scope);
  const repository = scoped('repository');
  const artifact = scoped('artifact');

  // 1. DENOMINATOR. Each limb can go quiet in a way that leaves the gate green, and a
  // green gate on a repository nobody scanned looks exactly like a green gate on a clean
  // one. So the instrument is proved on a constant before it is pointed at anything.
  if (!repository.length)
    throw new LanguageError(
      'denominator',
      'no-files',
      `no file to scan in the \`repository\` scope. The git index is what this gate walks — ` +
        `an empty list gives a run that reads nothing and reports nothing wrong.`,
    );
  if (!artifact.length)
    throw new LanguageError(
      'denominator',
      'no-artifact',
      `no file to scan in the \`artifact\` scope (\`${DIST}\`). The public surface is ` +
        `measured on what the package really carries — with no package there is no ` +
        `measurement, and point 3 would pass having opened nothing.`,
    );

  const source = text ?? PROBE;
  const probe = new Set(wordsOf(source).map((w) => w.word));
  const unsplit = PROBE_WORDS.filter((w) => !probe.has(w));
  if (unsplit.length)
    throw new LanguageError(
      'denominator',
      'tokenizer-blind',
      `the probe \`${source}\` does not come apart into ${unsplit.join(', ')}.\n` +
        `    The dictionary limb sees exactly what the split hands it: a lost seam at \`_\` ` +
        `hides every constant, a lost seam at camelCase hides every identifier, a lost fold ` +
        `hides every word written with diacritics. None of that turns the gate red — it ` +
        `turns it quiet.`,
    );

  const words = new Set(
    (files ?? []).flatMap((f) => wordsOf(textOf(f)).map((w) => w.word)),
  );
  if (!words.size)
    throw new LanguageError(
      'denominator',
      'no-words',
      `the scan of ${files.length} files produced not one word. The files are being read ` +
        `and the split returns nothing — every later point then compares empty sets.`,
    );

  if (!confirmed.has(CANARY.read))
    throw new LanguageError(
      'denominator',
      'dictionary-unread',
      `\`${CANARY.read}\` is not among the confirmed Polish words, and it stands in ` +
        `\`${DICTIONARY}\` with no English counterpart.\n` +
        `    The list was not read — a moved cache, a permission, a fault past the ` +
        `verified restore. The limb then confirms nothing and the gate passes every ` +
        `Polish name written without diacritics.`,
    );
  if (!confirmed.has(CANARY.folded))
    throw new LanguageError(
      'denominator',
      'dictionary-unfolded',
      `\`${CANARY.folded}\` is not among the confirmed words. It stands in the dictionary ` +
        `only as \`wartość\`, so its absence means the dictionary was NOT folded of its ` +
        `diacritics.\n` +
        `    Unfolded, the second limb only ever confirms what the first limb already sees — ` +
        `two limbs measuring one thing.`,
    );
  if (confirmed.has(CANARY.shared))
    throw new LanguageError(
      'denominator',
      'english-not-subtracted',
      `\`${CANARY.shared}\` is confirmed as Polish, and it stands in BOTH dictionaries.\n` +
        `    \`${ENGLISH}\` was not subtracted. Every word the two languages share then ` +
        `fires, the register fills up with English to keep the gate green, and the ` +
        `measurement is worth nothing in either direction.`,
    );
  if (!known.has(CANARY.stem))
    throw new LanguageError(
      'denominator',
      'english-unread',
      `\`${CANARY.stem}\` is not among the confirmed English words, and it stands in ` +
        `\`${ENGLISH}\`.\n` +
        `    The list was not read as STEMS. The fourth limb then finds no stem to hang an ` +
        `ending on and confirms nothing — and unlike the second limb, which floods the run ` +
        `when its subtraction goes missing, this one fails by going quiet.`,
    );

  const borrowing = inflected ?? PROBE_INFLECTED;
  if (!inflectionOf(borrowing, known, stems))
    throw new LanguageError(
      'denominator',
      'inflection-blind',
      `the probe \`${borrowing}\` is not read as a foreign stem with a Polish ending.\n` +
        `    The fourth limb is the only one that sees a word standing in NEITHER ` +
        `dictionary, so nothing else covers it: an emptied ending list, a strip off by one ` +
        `or a stem lookup pointed at the wrong set leaves the whole class invisible, and ` +
        `invisible here means green.`,
    );

  const derivation = derived ?? PROBE_DERIVED;
  if (!derivationOf(derivation, known, confirmed))
    throw new LanguageError(
      'denominator',
      'derivation-blind',
      `the probe \`${derivation}\` is not read as a Polish stem with a derivational ` +
        `suffix.\n` +
        `    The fifth limb is the other half of the class no dictionary holds, and it is ` +
        `the half where the WORD LIST is what is missing: an emptied suffix list, a strip ` +
        `off by one, or a stem lookup pointed at the English set instead of the Polish one, ` +
        `and every agent noun this language makes of its own words rides through again.`,
    );

  const company = oneLetter ?? PROBE_ONE_LETTER;
  if (!oneLetterWords(company, 'probe.mjs').found.length)
    throw new LanguageError(
      'denominator',
      'one-letter-blind',
      `the probe \`${company}\` yields no one-letter Polish word standing in prose.\n` +
        `    The sixth limb is the only one that can see \`w\`, \`z\`, \`o\`, \`u\` or ` +
        `\`i\`: the dictionaries subtract every letter of the alphabet as English before ` +
        `looking, so a context rule that stops reading leaves the whole class invisible — ` +
        `and a preposition in a message a maintainer reads walked through exactly there.`,
    );

  // 5. VOCABULARY, before it is used. A register that excuses a shape excuses everything of
  // that shape, and it has to be unwritable rather than discouraged — so the format is
  // checked before the words are trusted to silence anything.
  for (const [name, group] of groups) {
    if (!group?.reason)
      throw new LanguageError(
        'vocabulary',
        'group-without-reason',
        `the vocabulary group \`${name}\` carries no \`reason\`. A word list with no ` +
          `sentence saying why those words are not Polish is a list nobody can review.`,
      );
    for (const word of group.words ?? [])
      if (!PLAIN.test(word))
        throw new LanguageError(
          'vocabulary',
          'word-is-a-shape',
          `\`${word}\` in the group \`${name}\` is not a plain word.\n` +
            `    An entry names a WORD, never the form it is written in. \`SCREAMING_CASE\`, ` +
            `a length, a pattern — each of those excuses a whole grammatical class, and a ` +
            `layer of constants once rode through two passes on exactly that (lesson-60).`,
        );
  }

  // An entry earns its place by silencing a real hit, and there are three ways to be one:
  // the dictionary confirms the word, the fourth limb reads it as a borrowing, or the fifth
  // reads it as a derivation. The check is over ALL THREE, because the list has one
  // meaning — the words this repository writes that are not Polish — and not one per limb.
  const unflagged = [...vocabulary].filter(
    (w) =>
      !confirmed.has(w) &&
      !inflectionOf(w, known, stems) &&
      !derivationOf(w, known, confirmed),
  );
  if (unflagged.length)
    throw new LanguageError(
      'vocabulary',
      'word-not-flagged',
      `${unflagged.length} words are excused and no limb would ever have flagged ` +
        `them:\n${some(unflagged)}\n` +
        `    An entry that silences nothing is superstition, and it grows: the next reader ` +
        `takes the list for the set of words the gate cannot handle.`,
    );
  const unused = [...vocabulary].filter((w) => !words.has(w));
  if (unused.length)
    throw new LanguageError(
      'vocabulary',
      'dead-word',
      `${unused.length} excused words stand nowhere in the repository any more:\n${some(unused)}\n` +
        `    The list is to shrink as the reasons for it go. A dead entry fires just like ` +
        `new Polish — that is what keeps it a register and not a sediment.`,
    );

  // 6. The machine-written files, likewise before they are used to narrow the scan. A name
  // that matches nothing narrows nothing today and hides a file the day it is recreated.
  for (const entry of generated) {
    if (!entry?.reason)
      throw new LanguageError(
        'generated',
        'entry-without-reason',
        `the \`generated\` entry for \`${entry?.file}\` carries no \`reason\`. This list ` +
          `takes files OUT of the measurement — each one owes a sentence.`,
      );
    if (!(files ?? []).some((f) => f.path === entry.file)) continue; // the file is out of the scan — which is what the entry asked for
    throw new LanguageError(
      'generated',
      'entry-still-scanned',
      `\`${entry.file}\` stands among the scanned files and in the \`generated\` list at ` +
        `once. One of the two is a lie: either the file is machine-written and the scan is ` +
        `to skip it, or it is not and the entry is to go.`,
    );
  }

  // 2. and 3. THE MEASUREMENT ITSELF. Three limbs over the same text; the artifact scope
  // knows no register, because a consumer cannot read one.
  const excused = new Set(exceptions.map((e) => e?.file));
  const hits = new Map(); // path -> [{ line, word, limb }]
  let lettersSeen = 0;

  for (const file of files ?? []) {
    const found = [];
    const text = textOf(file);
    text.split('\n').forEach((line, i) => {
      if (line.includes(QUOTE))
        found.push({ line: i + 1, word: QUOTE, limb: 'quote' });
      const mark = line.match(DIACRITIC);
      if (mark) found.push({ line: i + 1, word: mark[0], limb: 'diacritics' });
    });
    const letters = oneLetterWords(text, file.path);
    lettersSeen += letters.seen;
    for (const { word, line } of letters.found)
      found.push({ line, word, limb: 'one-letter' });
    for (const { word, line } of wordsOf(text)) {
      if (vocabulary.has(word)) continue;
      if (confirmed.has(word)) {
        found.push({ line, word, limb: 'dictionary' });
        continue;
      }
      const split = inflectionOf(word, known, stems);
      if (split) {
        found.push({
          line,
          word: `${word} = ${split.stem} + -${split.ending}`,
          limb: 'inflection',
        });
        continue;
      }
      const made = derivationOf(word, known, confirmed);
      if (made)
        found.push({
          line,
          word: `${word} = ${made.stem} + -${made.suffix}`,
          limb: 'derivation',
        });
    }
    if (found.length) hits.set(file.path, found);
  }

  const inPackage = artifact.filter((f) => hits.has(f.path));
  if (inPackage.length) {
    const shown = inPackage.flatMap((f) =>
      hits
        .get(f.path)
        .slice(0, 3)
        .map((h) => `${f.path}:${h.line}  ${h.word}  (${h.limb})`),
    );
    throw new LanguageError(
      'artifact',
      'polish-in-package',
      `${inPackage.length} files of the built package carry Polish:\n${some(shown)}\n` +
        `    The public surface has NO register — an exception there would be a note the ` +
        `consumer cannot read, in a package they cannot edit. What is measured here is the ` +
        `artifact, so a translated source with a stale \`${DIST}\` does not answer it: ` +
        `rebuild, then read.`,
    );
  }

  const sample = new Set(specimens.map((s) => s?.file));
  const offenders = repository.filter(
    (f) => hits.has(f.path) && !excused.has(f.path) && !sample.has(f.path),
  );
  if (offenders.length) {
    const shown = offenders.flatMap((f) =>
      hits
        .get(f.path)
        .slice(0, 3)
        .map((h) => `${f.path}:${h.line}  ${h.word}  (${h.limb})`),
    );
    throw new LanguageError(
      'repository',
      'polish-outside-register',
      `${offenders.length} files carry Polish and stand in no register:\n${some(shown)}\n` +
        `    Translate them, or — if the Polish is the point of the file — add an entry to ` +
        `\`${POLICY}\` with the reason and the task that removes it. A word the dictionary ` +
        `reads wrong belongs in \`vocabulary\` instead, named singly.`,
    );
  }

  // 4. THE REGISTER. Last, because everything above decides what is really left in it.
  for (const entry of exceptions) {
    if (!entry?.file)
      throw new LanguageError(
        'register',
        'entry-without-file',
        `an entry of the register names no file: ${JSON.stringify(entry)}`,
      );
    if (!entry.reason || !entry.task)
      throw new LanguageError(
        'register',
        'entry-without-justification',
        `the entry for \`${entry.file}\` carries no ${!entry.reason ? '`reason`' : '`task`'}.\n` +
          `    An exception with no reason cannot be reviewed and an exception with no task ` +
          `has no end — that is how a register becomes a second language with a permit.`,
      );
    if (entry.file.startsWith(PACKAGE_SOURCES))
      throw new LanguageError(
        'register',
        'entry-on-public-surface',
        `the register excuses \`${entry.file}\`, and \`${PACKAGE_SOURCES}\` is what the ` +
          `package is built from.\n` +
          `    The promise allows NOT ONE entry on the public surface: a comment there ` +
          `travels to \`types/*.d.ts\` and into the bundles, where no register reaches.`,
      );
    if (!repository.some((f) => f.path === entry.file))
      throw new LanguageError(
        'register',
        'entry-unknown-file',
        `the register excuses \`${entry.file}\`, which is not among the scanned files.\n` +
          `    A file that was renamed or deleted leaves an entry that silences nothing — ` +
          `and the next file to take that name inherits the permit.`,
      );
    if (!hits.has(entry.file))
      throw new LanguageError(
        'register',
        'dead-entry',
        `the register excuses \`${entry.file}\`, and there is no Polish left in it.\n` +
          `    The entry has outlived its reason. A dead entry fires just like new Polish, ` +
          `so that the list shrinks by measurement rather than by somebody remembering.`,
      );
  }

  // 7. THE SPECIMENS. The gate's own calibration samples, held to every rule the register is
  // held to — plus the one that cannot be written around: they live in this gate's tree or
  // they are not specimens.
  for (const entry of specimens) {
    if (!entry?.file || !entry.reason)
      throw new LanguageError(
        'specimens',
        'entry-without-justification',
        `a specimen entry names no ${!entry?.file ? 'file' : '`reason`'}: ` +
          `${JSON.stringify(entry)}`,
      );
    if (!entry.file.startsWith(SPECIMENS))
      throw new LanguageError(
        'specimens',
        'entry-outside-the-gate',
        `\`${entry.file}\` is named a specimen and does not stand under \`${SPECIMENS}*\`.\n` +
          `    Only this gate's own files carry Polish by construction. Anywhere else the ` +
          `word for it is an exception, and an exception owes a task that removes it — this ` +
          `list owes none, which is exactly why it may not reach outside.`,
      );
    if (!repository.some((f) => f.path === entry.file))
      throw new LanguageError(
        'specimens',
        'entry-unknown-file',
        `the specimen \`${entry.file}\` is not among the scanned files — renamed, deleted, ` +
          `or never committed.`,
      );
    if (!hits.has(entry.file))
      throw new LanguageError(
        'specimens',
        'dead-specimen',
        `the specimen \`${entry.file}\` carries no Polish at all.\n` +
          `    A sample that stopped being a sample is a hole in the shape of one: the file ` +
          `keeps the permit and nothing measures it any more.`,
      );
  }

  return (
    `${repository.length} files of the repository and ${artifact.length} of the package, ` +
    `${words.size} distinct words, ${vocabulary.size} excused, ` +
    `${exceptions.length} exceptions, ${specimens.length} specimens, ` +
    `${lettersSeen} one-letter words read by their company`
  );
};

// ── reading the real state ──────────────────────────────────────────────────────

const readFile = (path) => {
  const text = readFileSync(path, 'latin1');
  // A binary file has no language. Read once as bytes, decide, then read as text —
  // an extension list would let through the next format nobody thought of.
  if (text.includes('\0')) return null;
  return readFileSync(path, 'utf8');
};

/**
 * The modes git records in the index, and which of them carry text of their OWN. A regular
 * file does. A symlink (`120000`) does not: git stores the target path as the blob, and
 * reading it through the filesystem gives either the target's words a second time, under a
 * path nobody wrote them at, or — when the target is a directory — `EISDIR` and a run that
 * ends. A gitlink (`160000`) is another repository and answers to its own gate. Both are
 * stepped over rather than read, because a crash and a pass are the same thing to a run
 * that never reaches its report.
 */
const CARRIES_TEXT = new Set(['100644', '100755']);

/**
 * The classifier proved on constants, in both directions, the way `CANARY` proves the two
 * dictionaries. Let every mode through and the run dies on the first symlink to a
 * directory; let none through and point 1 fires on an empty denominator. Only a wrong set
 * in the MIDDLE is silent — it drops real files and reports a smaller, cleaner repository
 * than the one that exists.
 */
const classifierFaults = () =>
  [
    ['100644', true],
    ['100755', true],
    ['120000', false],
    ['160000', false],
  ]
    .filter(([mode, carries]) => CARRIES_TEXT.has(mode) !== carries)
    .map(([mode, carries]) =>
      carries
        ? `mode \`${mode}\` is stepped over, and it is a file the gate has to read`
        : `mode \`${mode}\` is read as text, and an entry of that kind carries none`,
    );

/** How many index entries the reader stepped over on the real run. */
let steppedOver = 0;

/**
 * The repository from the GIT INDEX, minus what a machine wrote. `package-lock.json` and
 * the generated registry are not hand-written text and the promise is about hand-written
 * text — but they are named one by one in the policy, never matched by a pattern.
 */
const repositoryFiles = (policy) => {
  const skip = new Set((policy.generated ?? []).map((e) => e.file));
  const entries = execFileSync('git', ['ls-files', '-sz'], {
    cwd: ROOT,
    encoding: 'utf8',
  })
    .split('\0')
    .filter(Boolean)
    // `<mode> <object> <stage>\t<path>`. The path is taken from the tab on and never split
    // on whitespace: a file name may hold anything but a NUL.
    .map((line) => ({
      mode: line.slice(0, 6),
      path: line.slice(line.indexOf('\t') + 1),
    }));
  steppedOver = entries.filter((e) => !CARRIES_TEXT.has(e.mode)).length;
  return entries
    .filter((e) => CARRIES_TEXT.has(e.mode) && !skip.has(e.path))
    .map(({ path }) => {
      const text = readFile(join(ROOT, path));
      return text === null ? null : { path, scope: 'repository', text };
    })
    .filter(Boolean);
};

/** Every text file of the built package, by the same walk `check-package` takes. */
const artifactFiles = () => {
  const root = join(ROOT, DIST);
  if (!existsSync(root)) return [];
  const out = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) walk(path);
      else if (TEXT.has(extname(name))) {
        const text = readFile(path);
        if (text !== null)
          out.push({
            path: `${DIST}/${relative(root, path)}`,
            scope: 'artifact',
            text,
          });
      }
    }
  };
  walk(root);
  return out;
};

/**
 * Both dictionary limbs in one read, because they read the same two files for opposite
 * purposes: the second subtracts the English list, the fourth stands on it. The Polish one
 * is 61 MB and is streamed against the words really found, so memory is the repository's
 * size and not the dictionary's. The canaries go into the candidate set directly — if the
 * split ever returns nothing, the lookups still have to answer for them, and point 1
 * catches the silence.
 */
const confirmWords = async (files) => {
  const candidates = new Set(Object.values(CANARY));
  for (const file of files)
    for (const { word } of wordsOf(textOf(file))) candidates.add(word);

  // What the fourth limb may ask about: every candidate, plus every stem one could come
  // apart into. Asking only about the words themselves would leave `stems` empty of exactly
  // the entries that matter — a stem is a word nobody wrote in that form.
  const asked = new Set(candidates);
  for (const word of candidates)
    for (const ending of ENDINGS)
      if (word.endsWith(ending)) asked.add(word.slice(0, -ending.length));

  // The same thing on the Polish side, for the fifth limb. The 61 MB list is streamed
  // against a set rather than held in memory, so a stem nobody wrote as a word has to be
  // asked for BY NAME or the lookup never sees it — and the limb, which fails by going
  // quiet, would confirm nothing while looking exactly like a clean repository.
  const sought = new Set(candidates);
  for (const word of candidates)
    for (const suffix of SUFFIXES)
      if (word.endsWith(suffix)) sought.add(word.slice(0, -suffix.length));

  const english = new Set();
  for (const line of readFileSync(join(ROOT, ENGLISH), 'utf8').split('\n')) {
    const word = fold(line.trim());
    if (!word) continue;
    english.add(word);
    // `cat's` also stands for `cat`; the apostrophe form never reaches us from a split.
    if (word.includes("'")) english.add(word.split("'")[0]);
  }

  const confirmed = new Set();
  const stream = createInterface({
    input: createReadStream(join(ROOT, DICTIONARY)),
    crlfDelay: Infinity,
  });
  for await (const line of stream) {
    const word = fold(line.trim());
    if (word && sought.has(word) && !english.has(word)) confirmed.add(word);
  }
  return {
    polish: [...confirmed].sort(),
    english: [...asked].filter((word) => english.has(word)).sort(),
  };
};

// ── the negative control ────────────────────────────────────────────────────────

const readFixture = (name) =>
  JSON.parse(readFileSync(join(FIXTURES, name), 'utf8'));

/**
 * Builds a case's input ON A COPY of the reference one, so the case file holds nothing but
 * its own defect — you cannot break something in passing and not notice.
 */
const buildFixture = (fx) => {
  const reference = readFixture(REFERENCE);
  const w = structuredClone(reference.input);

  w.files = w.files.filter((f) => !(fx.dropFiles ?? []).includes(f.path));
  for (const [path, text] of Object.entries(fx.replaceFile ?? {})) {
    const file = w.files.find((f) => f.path === path);
    if (file) file.text = text;
  }
  w.files.push(...(fx.addFiles ?? []));
  if (fx.clearScope) w.files = w.files.filter((f) => f.scope !== fx.clearScope);

  w.polish = w.polish.filter((word) => !(fx.dropPolish ?? []).includes(word));
  w.polish.push(...(fx.addPolish ?? []));

  w.english = w.english.filter(
    (word) => !(fx.dropEnglish ?? []).includes(word),
  );
  w.english.push(...(fx.addEnglish ?? []));

  w.policy.exceptions = w.policy.exceptions.filter(
    (e) => !(fx.dropExceptions ?? []).includes(e.file),
  );
  for (const [file, fields] of Object.entries(fx.replaceException ?? {})) {
    const entry = w.policy.exceptions.find((e) => e.file === file);
    if (entry) for (const [k, v] of Object.entries(fields)) entry[k] = v;
  }
  w.policy.exceptions.push(...(fx.addExceptions ?? []));

  w.policy.generated = w.policy.generated.filter(
    (e) => !(fx.dropGenerated ?? []).includes(e.file),
  );
  w.policy.generated.push(...(fx.addGenerated ?? []));

  w.policy.specimens = (w.policy.specimens ?? []).filter(
    (e) => !(fx.dropSpecimens ?? []).includes(e.file),
  );
  w.policy.specimens.push(...(fx.addSpecimens ?? []));

  for (const [group, words] of Object.entries(fx.addVocabulary ?? {}))
    w.policy.vocabulary[group] = {
      reason:
        w.policy.vocabulary[group]?.reason ?? 'a group added by a fixture',
      words: [...(w.policy.vocabulary[group]?.words ?? []), ...words],
    };
  for (const [group, fields] of Object.entries(fx.replaceGroup ?? {}))
    w.policy.vocabulary[group] = { ...w.policy.vocabulary[group], ...fields };

  if (fx.probe !== undefined) w.probe = fx.probe;
  if (fx.inflected !== undefined) w.inflected = fx.inflected;
  if (fx.derived !== undefined) w.derived = fx.derived;
  if (fx.oneLetter !== undefined) w.oneLetter = fx.oneLetter;

  return w;
};

// ── the run ─────────────────────────────────────────────────────────────────────

const problems = [];
let summary = null;

try {
  const policy = JSON.parse(readFileSync(join(ROOT, POLICY), 'utf8'));
  const files = [...repositoryFiles(policy), ...artifactFiles()];
  // The two word lists, restored out of the lock before a word is read. Warm, this is
  // two hash checks and no network; cold, it is the road `check-consumer` already walks
  // to the registry. A failure lands among the problems like any other — and the
  // fixtures below still run, because the pure checks owe nothing to connectivity.
  await restoreDictionaries();
  const { polish, english } = await confirmWords(files);
  summary = checkLanguage({ policy, files, polish, english });
} catch (error) {
  if (error instanceof DictionaryError)
    problems.push(`dictionaries/${error.rule}: ${error.message}`);
  else if (error instanceof LanguageError)
    problems.push(`${error.check}/${error.rule}: ${error.message}`);
  else throw error;
}

problems.push(...classifierFaults());

if (!existsSync(FIXTURES))
  problems.push(
    `tools/check-language.fixtures: the directory does not exist — a gate with no proof ` +
      `that it can fail is one more silent defect (req-quality-negative-control)`,
  );

const cases = existsSync(FIXTURES)
  ? readdirSync(FIXTURES)
      .filter((n) => n.endsWith('.json') && n !== REFERENCE)
      .sort()
  : [];

if (existsSync(FIXTURES) && !cases.length)
  problems.push(
    `tools/check-language.fixtures: no prepared inputs — a gate with no proof that it can ` +
      `fail is one more silent defect (req-quality-negative-control)`,
  );

// The reference input MUST pass. Were it defective itself, every case would fire because
// of it and not because of its own defect — every "it fired" would be false.
if (cases.length) {
  try {
    checkLanguage(buildFixture({}));
  } catch (error) {
    if (!(error instanceof LanguageError)) throw error;
    problems.push(
      `${REFERENCE}: the reference input does NOT pass (${error.check}/${error.rule}) — ` +
        `every prepared case now fires because of it.\n    ${error.message}`,
    );
  }
}

for (const name of cases) {
  const fx = readFixture(name);
  try {
    checkLanguage(buildFixture(fx));
    problems.push(
      `${name}: the prepared input PASSED and was meant not to — ` +
        `rule \`${fx.check}/${fx.rule}\` stopped examining anything`,
    );
  } catch (error) {
    if (!(error instanceof LanguageError)) throw error;
    if (error.check !== fx.check || error.rule !== fx.rule)
      problems.push(
        `${name}: rule \`${error.check}/${error.rule}\` fired, and \`${fx.check}/${fx.rule}\` ` +
          `was meant to — the fixture proves something other than what it declares`,
      );
  }
}

// ── result ──────────────────────────────────────────────────────────────────────

if (problems.length) {
  console.error(`X Language gate — ${problems.length} violations:\n`);
  for (const p of problems) console.error(`  - ${p}`);
  console.error('');
  process.exit(1);
}

console.log(
  `✓ One language: ${summary}` +
    (steppedOver
      ? `, ${steppedOver} index entries carrying no text of their own`
      : '') +
    `. Negative control: the reference input passes, ` +
    `${cases.length} prepared ones rejected on their own rules.`,
);
