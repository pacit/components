// A type-only import, for `ng-add`'s reason: the schematics runtime belongs to the Angular
// CLI that runs them, and a component library must not drag build tooling into a consumer's
// dependency tree (`req-project-dependencies`).
import type { Rule, SchematicContext, Tree } from '@angular-devkit/schematics';

/**
 * `0.2.0` — the badge's tone became the library's tone.
 *
 * `PctBadgeTone` is gone. `tone` takes `PctTone | null` now, and the absence of a tone is what
 * `'neutral'` used to be — so `<pct-badge tone="neutral">` means "no tone", and removing the
 * attribute leaves exactly the same pixels
 * ([0053](https://pacit.github.io/components/trust/#adr-0053)).
 *
 * **It rewrites `.html` and never `.ts`, and that line is the whole design.**
 *
 * An `.html` file is a template from its first byte: no question of what is markup and what is
 * not, and the reading below is a scan over tags that walks quotes rather than guessing where
 * one ends. A `.ts` file is a different problem. Finding an inline `template:` inside it means
 * knowing where TypeScript's comments, strings, template literals, interpolations and regular
 * expressions begin and end — which is parsing TypeScript, and a migration that parses it
 * badly does not fail politely. Five versions of this file tried, each fixed the case it had
 * just been shown, and each was reached by the next one: `<pct-badge` in a comment; a `>`
 * inside an attribute value; a brace inside a string inside an interpolation; a `/` after `--`
 * read as a regular expression. Every time, the damage was the same shape — a consumer's own
 * `tone` binding spliced out of a class body, leaving `const { } = props;` or `protected;`,
 * both of which compile — and the run reported success.
 *
 * So this does not read TypeScript. A `.ts` file is REPORTED, never edited: the lines that
 * name a badge and the attribute, and every mention of the deleted type, with the two moves
 * spelled out. A consumer changing four lines by hand is a cost. Losing a line of their code
 * to a migration that was sure of itself is not a cost, it is a defect with no upper bound,
 * and the only way to make it impossible rather than unlikely is to not write there.
 *
 * @see the spec beside this file, whose cases are the reading — no gate in the library
 * executes a migration, so the cases are the only instrument there is.
 */

/** An `.html` file is a template whole. `.htm` is the same file with a shorter name. */
const TEMPLATE_FILE = /\.html?$/i;

/** Every spelling of a TypeScript file: read for the report, never written. */
const SOURCE_FILE = /\.[cm]?tsx?$/i;

/** Directories with no consumer source in them, and a great deal of everything else. */
const SKIPPED = /(^|\/)(node_modules|dist|\.git|\.angular|\.nx|coverage)(\/|$)/;

/** Anything still naming the deleted type, so the report can point at a line. */
const DELETED_TYPE = /\bPctBadgeTone\b/;

/** The attribute this release takes away, in the spellings a template may write it. */
const NEUTRAL_TONE =
  /(?<![-.\w])tone\s*=\s*(?:"\s*neutral\s*"|'\s*neutral\s*'|neutral\b)|(?:\[tone\]|(?<![-.\w])bind-tone)\s*=\s*(?:"\s*'neutral'\s*"|'\s*"neutral"\s*')/;

interface Span {
  readonly start: number;
  readonly end: number;
}

interface Attribute extends Span {
  readonly name: string;
  readonly value: string | null;
}

const isSpace = (c: string): boolean =>
  c === ' ' || c === '\t' || c === '\n' || c === '\r';

/**
 * From the `<` of a tag, the index of the `>` that really ends it — quotes walked rather than
 * jumped over, which is the whole point: an attribute value may hold `>`, and every structural
 * directive and half the bindings do.
 */
const tagEnd = (source: string, open: number, limit: number): number => {
  let quote = '';
  for (let i = open + 1; i < limit; i++) {
    const c = source[i];
    if (quote) {
      if (c === quote) quote = '';
      continue;
    }
    if (c === '"' || c === "'") quote = c;
    else if (c === '>') return i;
    else if (c === '<') return -1;
  }
  return -1;
};

/**
 * Elements whose content is text rather than markup. The list is Angular's own — `script`,
 * `style`, `title`, `textarea` in its `TAG_DEFINITIONS` — and not HTML's longer one: a badge
 * inside `<iframe>` or `<noscript>` IS a component to the Angular compiler, so skipping those
 * would be skipping real work. Inside these four a badge is a sample a consumer typed out, and
 * rewriting it edits their prose.
 */
const RAW_TEXT = /^(?:script|style|textarea|title)$/i;

/** The name of the tag opening at `at`, lower-cased, or '' when it closes one. */
const tagName = (source: string, at: number): string => {
  if (source[at + 1] === '/') return '';
  let i = at + 1;
  while (
    i < source.length &&
    !isSpace(source[i]) &&
    source[i] !== '>' &&
    source[i] !== '/'
  )
    i++;
  return source.slice(at + 1, i).toLowerCase();
};

/** The attributes of one opening tag, each with the span it occupies in the source. */
const attributesOf = (
  source: string,
  from: number,
  to: number,
): Attribute[] => {
  const found: Attribute[] = [];
  let i = from;
  while (i < to) {
    while (i < to && isSpace(source[i])) i++;
    if (i >= to) break;
    if (source[i] === '/') {
      i++;
      continue;
    }
    const start = i;
    while (
      i < to &&
      !isSpace(source[i]) &&
      source[i] !== '=' &&
      source[i] !== '/'
    )
      i++;
    const name = source.slice(start, i);
    let value: string | null = null;
    let after = i;
    let j = i;
    while (j < to && isSpace(source[j])) j++;
    if (j < to && source[j] === '=') {
      j++;
      while (j < to && isSpace(source[j])) j++;
      if (j < to && (source[j] === '"' || source[j] === "'")) {
        const quote = source[j];
        const opened = ++j;
        while (j < to && source[j] !== quote) j++;
        value = source.slice(opened, j);
        after = Math.min(j + 1, to);
      } else {
        const opened = j;
        while (j < to && !isSpace(source[j])) j++;
        // `<pct-badge tone=neutral/>`: the slash closes the TAG and is not in the value.
        // Angular reads `tone="neutral"` there.
        if (j > opened && j === to && source[j - 1] === '/') j--;
        value = source.slice(opened, j);
        after = j;
      }
    }
    found.push({ name, value, start, end: after });
    i = after;
  }
  return found;
};

/**
 * `tone="neutral"`, and the binding whose expression is that literal — with the whitespace
 * read the way each side reads it. A STATIC value is not trimmed by Angular, so `tone=" neutral "`
 * binds the string with its spaces and is not this attribute; an expression is parsed, so
 * `[tone]=" 'neutral' "` is.
 */
const isNeutralTone = (attribute: Attribute): boolean => {
  const raw = attribute.value ?? '';
  const value = raw.trim();
  if (attribute.name === 'tone') return raw === 'neutral';
  if (attribute.name === '[tone]' || attribute.name === 'bind-tone')
    return value === "'neutral'" || value === '"neutral"';
  return false;
};

/**
 * Rewrites one template: walks it tag by tag, so `<pct-badge` written inside another element's
 * attribute value is text and not a tag, and a comment is a comment. Returns the new text and
 * how many tags it could not read — a tag this cannot parse is REPORTED rather than passed
 * over, because the one thing worse than a migration that changes nothing is one that says it
 * changed everything.
 */
const rewriteTemplate = (
  template: string,
): { readonly text: string; readonly unreadable: number } => {
  const cuts: Span[] = [];
  let unreadable = 0;
  let i = 0;
  while (i < template.length) {
    if (template.startsWith('<!--', i)) {
      const close = template.indexOf('-->', i + 4);
      if (close === -1) {
        // An unterminated comment swallows the rest of the template. Say so rather than
        // return quietly having read a fraction of the file.
        unreadable++;
        break;
      }
      i = close + 3;
      continue;
    }
    if (template[i] !== '<' || !/[a-zA-Z/]/.test(template[i + 1] ?? '')) {
      i++;
      continue;
    }
    const badge =
      template.startsWith('<pct-badge', i) &&
      /^[\s/>]?$/.test(template.slice(i + 10, i + 11));
    const end = tagEnd(template, i, template.length);
    if (end === -1) {
      if (badge) unreadable++;
      i += badge ? 10 : 1;
      continue;
    }
    const raw = tagName(template, i);
    if (RAW_TEXT.test(raw)) {
      // The name has to END there: `</scriptx>` closes nothing, and resuming on it puts
      // the element's own text back into the scan.
      const closing = new RegExp(`</${raw}[\\s/>]`, 'i');
      const found = closing.exec(template.slice(end));
      i = found ? end + found.index + raw.length + 2 : template.length;
      continue;
    }
    if (badge) {
      const attributes = attributesOf(template, i + 10, end);
      const neutral = attributes.filter(isNeutralTone);
      if (neutral.length) {
        // An `i18n-tone` describes an attribute that is about to stop existing; left behind
        // it is a template error the consumer gets to debug on our behalf.
        const orphans = attributes.filter(
          (a) => a.name === 'i18n-tone' || a.name.startsWith('i18n-tone.'),
        );
        for (const attribute of [...neutral, ...orphans]) {
          let start = attribute.start;
          while (start > 0 && isSpace(template[start - 1])) start--;
          cuts.push({ start, end: attribute.end });
        }
      }
    }
    i = end + 1;
  }
  if (!cuts.length) return { text: template, unreadable };

  cuts.sort((a, b) => a.start - b.start);
  let text = '';
  let read = 0;
  for (const cut of cuts) {
    text += template.slice(read, cut.start);
    read = cut.end;
  }
  return { text: text + template.slice(read), unreadable };
};

/**
 * The backstop, and it is asked of the RESULT. Every miss this migration has had looked the
 * same from outside: a file still holding the attribute and a cheerful "nothing to migrate".
 * So the question at the end is not "did I rewrite it" but "does this file still look like it
 * holds one" — a question about what is there now, which catches the shapes nobody thought of.
 */
const mayStillHoldATone = (source: string): boolean =>
  source.includes('pct-badge') && /\bneutral\b/.test(source);

/**
 * Every line of a source file worth a consumer's eye, with its number.
 *
 * A line is not a parse, and this does not pretend otherwise: it wants the element and the
 * attribute on the SAME line, which keeps `<other tone="neutral">` and a string that merely
 * holds the text out of a warning that says "want your hands". What it cannot see is a tag
 * spread over lines — and that is what the whole-file fallback beside it is for.
 */
const linesWorthReading = (source: string, shown: string): string[] => {
  const found: string[] = [];
  source.split('\n').forEach((line, index) => {
    const wearsIt = line.includes('pct-badge') && NEUTRAL_TONE.test(line);
    if (wearsIt || DELETED_TYPE.test(line)) found.push(`${shown}:${index + 1}`);
  });
  return found;
};

export function badgeTone(): Rule {
  return (tree: Tree, context: SchematicContext) => {
    const rewritten: string[] = [];
    const unread: string[] = [];
    const byHand: string[] = [];

    tree.visit((path) => {
      if (SKIPPED.test(path)) return;
      const template = TEMPLATE_FILE.test(path);
      if (!template && !SOURCE_FILE.test(path)) return;

      let before: string;
      try {
        before = tree.readText(path);
      } catch {
        // `readText` decodes as UTF-8 and throws on anything else, and `.ts` is also the
        // extension of an MPEG transport stream. One asset would otherwise end the whole
        // migration with a decoding error the consumer cannot act on.
        return;
      }

      const shown = path.replace(/^\//, '');

      if (!template) {
        // Read, never written. See the header: finding an inline template here means parsing
        // TypeScript, and a migration that parses it badly deletes a consumer's code.
        // Both questions, not one: a file can carry a line worth naming AND a tag spread
        // over lines that no line carries. Asking the second only when the first found
        // nothing hid the second inside every file that had both.
        byHand.push(...linesWorthReading(before, shown));
        if (mayStillHoldATone(before)) unread.push(shown);
        return;
      }

      const result = rewriteTemplate(before);
      if (result.text !== before) {
        tree.overwrite(path, result.text);
        rewritten.push(shown);
      }
      if (result.unreadable || mayStillHoldATone(result.text))
        unread.push(shown);
    });

    if (rewritten.length)
      context.logger.info(
        `[pacit] tone="neutral" removed from ${rewritten.length} template file(s) — the ` +
          `absence IS the neutral now, and the badge looks exactly as it did:\n` +
          rewritten.map((p) => `    ${p}`).join('\n'),
      );

    if (byHand.length)
      context.logger.warn(
        `[pacit] ${byHand.length} line(s) in TypeScript want your hands. This migration does ` +
          `not write to \`.ts\` on purpose: finding an inline template there means parsing ` +
          `TypeScript, and getting that wrong deletes code rather than failing politely. ` +
          `Two moves, both mechanical: \`tone="neutral"\` on a <pct-badge> comes off, and ` +
          `\`PctBadgeTone\` becomes \`PctTone | null\` from \`@pacit/components/core\` with ` +
          `\`'neutral'\` written as \`null\`:\n` +
          byHand.map((p) => `    ${p}`).join('\n'),
      );

    if (unread.length)
      context.logger.warn(
        `[pacit] ${unread.length} file(s) name a badge and the word "neutral" and were not ` +
          `rewritten. That may be nothing — the word in a sentence, a tone on something ` +
          `else — or a shape this could not read. Worth one look each:\n` +
          unread.map((p) => `    ${p}`).join('\n'),
      );

    if (!rewritten.length && !byHand.length && !unread.length)
      context.logger.info(
        `[pacit] nothing to migrate: no badge in this workspace wears a tone this release ` +
          `took away.`,
      );
  };
}
