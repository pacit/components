// A type-only import, for `ng-add`'s reason: the schematics runtime belongs to the Angular
// CLI that runs them, and a component library must not drag build tooling into a consumer's
// dependency tree (`req-project-dependencies`).
import type { Rule, SchematicContext, Tree } from '@angular-devkit/schematics';

/**
 * `0.2.0` — the badge's tone became the library's tone.
 *
 * `PctBadgeTone` is gone. `tone` takes `PctTone | null` now, and the absence of a tone is what
 * `'neutral'` used to be — so `<pct-badge tone="neutral">` means "no tone", and removing the
 * attribute leaves the badge looking exactly as it did
 * ([0053](https://pacit.github.io/components/trust/#adr-0053)).
 *
 * "The badge" and not "the page", because one thing outside the badge can read that attribute
 * and no migration can see it: a SELECTOR somewhere else. `<ng-content select="[tone]">` in a
 * consumer's own wrapper projects on the static attribute whatever the badge does with it, and
 * a stylesheet may key on `pct-badge[tone="neutral"]` just as well. Rendered, a badge that
 * changes slot proves it. The consequence of this one edit lives in another file, nothing a
 * migration can parse reaches it, and the backstop cannot see it either — so it is written
 * down rather than caught: the release notes say to grep selectors for `[tone]`.
 *
 * **It rewrites `.html` and never `.ts`, and that line is half the design.**
 *
 * A `.ts` file is REPORTED, never edited. Finding an inline `template:` inside one means
 * knowing where TypeScript's comments, strings, template literals, interpolations and regular
 * expressions begin and end — which is parsing TypeScript, and a migration that parses it
 * badly does not fail politely. Five versions of this file tried, each fixed the case it had
 * just been shown, and each was reached by the next one: `<pct-badge` in a comment; a `>`
 * inside an attribute value; a brace inside a string inside an interpolation; a `/` after
 * `--` read as a regular expression. Every time the damage had the same shape — a consumer's
 * own `tone` binding spliced out of a class body, leaving `const { } = props;` or
 * `protected;`, both of which compile — and the run reported success.
 *
 * **An `.html` file is read by ANGULAR'S OWN PARSER, and that is the other half.** It was a
 * hand-written scan until 2026-09-21 — a walk over tags that stepped through quotes — and
 * that scan was a second implementation of a lexer which already exists. Four independent
 * reviews found six defects in it, every one the same shape: the scan WROTE where Angular
 * would not. A close tag it read and Angular did not, so the text of a `<script>` was edited;
 * `\s` where Angular's whitespace is 9 to 32 and U+00A0; a CDATA section read as markup;
 * `<svg:script>` unrecognised because the name carries a prefix; a tag name that did not end
 * at an `=`; and a cut that absorbed the space before the attribute without asking what came
 * after it, so `<pct-badge tone="neutral"(click)="f()">` — a template that compiles — came
 * out as `<pct-badge(click)="f()">`, which does not. Over 2899 clean templates, 335 came out
 * broken that way, and the run called every one of them a success.
 *
 * None of those is a slip. They are one defect wearing six faces: **a pattern written against
 * a parser is a second implementation of it, and the second one is wrong until something
 * compares them** (`lesson-236`). So this stopped comparing and started calling. `HtmlParser`
 * from `@angular/compiler` returns every element and every attribute with the exact span it
 * occupies in the file, and the six faces left with the code that wore them: raw text, CDATA,
 * comments inside a tag, namespaces, entity decoding, and every question about where a name
 * or a value ends are now answered by the compiler that will read the file afterwards.
 *
 * **It is loaded at run time and never depended on.** `@angular/compiler` stands in every
 * workspace that builds an Angular application: `@angular/build` requires it as a peer — not
 * optional, so an install brings it — and `@angular/core` names it as an optional one, which
 * is the weaker of the two and not what this rests on. This package declares it OPTIONAL and
 * reaches it through a dynamic `import()` — which is why `schematics/tsconfig.json` compiles
 * with `module: "node16"` rather than `commonjs`, so the import is emitted as an import. The
 * reason is NOT that the alternative fails: a `commonjs` emit turns it into a `require`, and
 * that works too on every Node this package supports — measured, after the first version of
 * this sentence claimed it would throw. The reason stands beside the setting, where it can be
 * read with the code it governs.
 *
 * **Two subtrees are markup and not components, and it writes in neither.** An ICU
 * expansion's cases, where the tag survives only as an i18n placeholder; and anything under
 * an `ngNonBindable`, where Angular disables bindings and leaves every attribute in the DOM
 * exactly as written. Both were measured the hard way — the second by RENDERING, because no
 * earlier instrument sees it — and both are reported instead of edited.
 *
 * **Three blind spots are in the REPORT and none of them can write.** `mayStillHoldATone` greps the
 * text, so it does not name a `<PCT-BADGE>` wearing the attribute — correct to leave alone and
 * worth a line nobody gets — and it does name a file that WAS rewritten when the word survives
 * as ordinary text. The exact question is answered by the parser before either of them: the
 * grep is the cheap second net, and its errors cost a consumer one look rather than a line of
 * their code. The third is the selectorless spelling: in a template with that syntax enabled
 * `<PctBadge tone="neutral">` IS the component, and neither this nor the backstop sees it —
 * the parse call does not turn the syntax on, and `pct-badge` is nowhere in the text. Written
 * down because a blind spot that is named is a decision, and one that is not is an accident.
 *
 * **What it does when it cannot be certain is REPORT.** Three places, one rule: the compiler
 * will not load; the parser returns an error, which means the template does not compile
 * today either; or the file still looks like it holds a tone after the rewrite. Nothing is
 * written in any of them and the file is named. A consumer changing four lines by hand is a
 * cost. Losing a line of their code to a migration that was sure of itself is not a cost, it
 * is a defect with no upper bound.
 *
 * @see the spec beside this file, whose cases are the reading — no gate in the library
 * executes a migration, so the cases are the only instrument there is. Since 2026-09-21 the
 * instrument is itself measured: this file stands in `mutate` (`stryker.config.json`), and
 * the reason is that the reviews above each found their defects by planting mutants by hand,
 * which is the same measurement done by an eye that gets tired.
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

/**
 * The element name this migration touches, compared the way Angular compares it before
 * matching a component selector: `createCssSelectorFromNode` calls `splitNsName` first, so
 * the NAMESPACE comes off and the local name is what the selector sees. A badge inside `<svg>`
 * or `<math>` is reported by the parser as `:svg:pct-badge` or `:math:pct-badge`, and both of
 * those ARE the component.
 *
 * Case is not stripped, and that is the one shape this leaves alone: Angular matches a
 * selector case-sensitively, so `<PCT-BADGE>` never bound the input and taking its attribute
 * off would change a template that renders plain text.
 *
 * Read twice, because the first reading of it was wrong in the expensive direction. An earlier
 * version of this file compared the name whole and skipped every badge inside `<svg>` — with a
 * comment claiming the selector does not match, "measured with Angular's own
 * `SelectorMatcher`". The measurement was an artefact: `CssSelector.parse(':svg:pct-badge')`
 * reads the leading colon as a PSEUDO-SELECTOR, so what it built matched nothing like an
 * element and the answer looked like a fact. A false measurement is worse than none — it
 * closes the question (`lesson-238`).
 */
const BADGE = 'pct-badge';

/**
 * `splitNsName`'s local half, transcribed rather than re-implemented: a name is namespaced
 * only when it opens with a colon and holds a second one, and the local name is what follows
 * that second colon. The ANCHOR is the whole of it and it is reachable: `<pct-:q:badge>`
 * parses with no error and no prefix — `isPrefixEnd` stops the prefix scan at the `-`, so the
 * name is `pct-:q:badge` entire — and an unanchored pattern would take `:q:` out of the middle
 * and call the result this component. Angular does not: measured through
 * `findMatchingDirectivesAndPipes`, which matches nothing there.
 */
const localName = (name: string): string => name.replace(/^:[^:]+:/, '');

/**
 * Angular's whitespace, and not JavaScript's: its lexer asks
 * `code >= $TAB && code <= $SPACE || code == $NBSP`, which is 9 to 32 and U+00A0, where `\s`
 * is 9 to 13, 32, U+00A0 and eighteen further Unicode spaces. The two disagree on thirty-six
 * code points, eighteen each way (`lesson-236`). It is one decision now and a cosmetic one —
 * whether a single separator collapses with the attribute that needed it — because the
 * condition in `cutFor` is what keeps the edit safe, not this.
 */
const ONE_SPACE = /^[\t-\x20\u00a0]$/;

interface Span {
  readonly start: number;
  readonly end: number;
}

/** What is taken from `@angular/compiler`, taken narrowly and by structure. */
interface ParsedAttribute {
  readonly name: string;
  readonly value: string;
  readonly sourceSpan: {
    readonly start: { readonly offset: number };
    readonly end: { readonly offset: number };
  };
}

/**
 * A node of Angular's HTML tree, taken by the one property that holds another: `children`, an
 * element's or a block's content.
 *
 * An ICU expansion's cases hang off `cases` and `expression` instead, and this deliberately
 * does NOT follow them. A `<pct-badge>` written inside a plural message is markup to the HTML
 * parser and it is not the component: measured through the caller —
 * `findMatchingDirectivesAndPipes('{n, plural, other {<pct-badge tone="neutral">z</pct-badge>}}',
 * ['pct-badge'])` returns nothing, where the same element outside the message returns the
 * component. In the template AST the tag survives only as an i18n PLACEHOLDER whose value is
 * the raw string — and rendering shows the runtime does not even keep it: the i18n opcode
 * builder drops any element whose tag is outside the sanitizer's allow-list, so a
 * `<pct-badge>` inside a plural message reaches the DOM as nothing at all, where a `<span>`
 * reaches it stripped of the attribute. The decision is the same either way. An earlier version of
 * this file followed those two properties and cut the tone there, with a case asserting it —
 * the third time in one branch that a confident comment pinned a write Angular does not make
 * (`lesson-238`). The file is still named by the backstop, which is what an unbound badge
 * wearing a disappearing attribute is worth: one look, not an edit.
 */
interface ParsedNode {
  readonly name?: string;
  readonly attrs?: readonly ParsedAttribute[];
  readonly children?: readonly ParsedNode[];
}

interface Parser {
  parse(
    source: string,
    url: string,
    options?: { tokenizeExpansionForms?: boolean },
  ): { rootNodes: readonly ParsedNode[]; errors?: readonly unknown[] };
}

/**
 * `tone="neutral"`, and the binding whose expression is that literal — with the whitespace
 * read the way each side reads it. A STATIC value is not trimmed by Angular, so
 * `tone=" neutral "` binds the string with its spaces and is not this attribute; an
 * expression is parsed, so `[tone]=" 'neutral' "` is. The parser hands the value already
 * unquoted and with its entities decoded, which is one more reading this file used to miss.
 */
const isNeutralTone = (attribute: ParsedAttribute): boolean => {
  if (attribute.name === 'tone') return attribute.value === 'neutral';
  if (attribute.name === '[tone]' || attribute.name === 'bind-tone') {
    const value = attribute.value.trim();
    return value === "'neutral'" || value === '"neutral"';
  }
  return false;
};

/**
 * An `i18n-tone` describes an attribute that is about to stop existing; left behind it is a
 * template error the consumer gets to debug on our behalf.
 */
const isOrphanDescriptor = (attribute: ParsedAttribute): boolean =>
  attribute.name === 'i18n-tone' || attribute.name.startsWith('i18n-tone.');

/**
 * The span to cut for one attribute: its own, and the whitespace before it when taking that
 * whitespace still leaves a separator behind. The CONDITION is the whole of this function, not
 * the greed — a tag written over lines keeps its shape only if the run of spaces goes with the
 * attribute it indented.
 * `tone="neutral"class="x"` is two attributes to Angular and needs nothing between them, so
 * absorbing the space before `tone` welds the tag name to `class` and the template stops
 * compiling — silently, because the rewrite takes away the word the backstop looks for.
 * Measured before the condition existed: 335 of 2899 clean templates came out broken.
 */
const cutFor = (template: string, attribute: ParsedAttribute): Span => {
  const end = attribute.sourceSpan.end.offset;
  let start = attribute.sourceSpan.start.offset;
  const after = template[end];
  const separated =
    after === undefined ||
    ONE_SPACE.test(after) ||
    after === '>' ||
    after === '/';
  if (separated)
    while (start > 0 && ONE_SPACE.test(template[start - 1] ?? '')) start--;
  return { start, end };
};

/**
 * `ngNonBindable` turns a subtree into markup: Angular emits `ɵɵdisableBindings()` around it,
 * so no directive is instantiated inside and every attribute stays in the DOM as it was
 * written. Measured by RENDERING, because the question cannot be answered anywhere earlier —
 * `findMatchingDirectivesAndPipes` reports `pct-badge` in there just the same, and the AST
 * shows the tone as an attribute rather than an input, which is easy to read as a detail.
 * With a component whose template is `[BOUND]`:
 *
 * ```
 * <pct-badge tone="neutral">x</pct-badge>
 *   -> <pct-badge tone="neutral">[BOUND]x</pct-badge>
 * <div ngNonBindable><pct-badge tone="neutral">x</pct-badge></div>
 *   -> <div><pct-badge tone="neutral">x</pct-badge></div>
 * ```
 *
 * The second one is live DOM the consumer can see, and the migration used to delete from it.
 *
 * Three edges, each measured by rendering rather than reasoned from the first:
 *
 * - it is the ANCESTOR that disables, and only a strict one — `ngNonBindable` on the badge
 *   itself leaves the badge bound and silences its content, so that element stays in;
 * - a sibling outside the subtree binds normally;
 * - and it does NOT reach through an `<ng-template>`. Angular applies non-bindable while
 *   visiting an ELEMENT, and a literal `<ng-template>` is not one, so the attribute is inert
 *   there and everything inside binds. `<div>` and `<ng-container>` do disable, with or
 *   without a structural directive beside them. The first version of this rule was measured
 *   on `<div>` alone and generalised to "anything under an `ngNonBindable`" — the move
 *   `lesson-238` exists to forbid, made by the code that cites it.
 */
const NON_BINDABLE = 'ngNonBindable';

/** The one tag `ngNonBindable` does not disable through. */
const TEMPLATE_TAG = 'ng-template';

/**
 * Every named node of the tree, in the order the parser found them, minus everything under an
 * `ngNonBindable`. The flag rides DOWN the walk rather than being asked of each node, because
 * the property is inherited and a node does not know its parents.
 */
const elementsOf = (
  nodes: readonly ParsedNode[],
  bound = true,
  found: ParsedNode[] = [],
): ParsedNode[] => {
  for (const node of nodes) {
    if (bound && typeof node?.name === 'string') found.push(node);
    const disables =
      node?.name !== TEMPLATE_TAG &&
      (node?.attrs ?? []).some((a) => a.name === NON_BINDABLE);
    const inside = bound && !disables;
    if (node?.children) elementsOf(node.children, inside, found);
  }
  return found;
};

/** The text with those spans taken out, cut in order so every offset stays the parser's. */
const withoutSpans = (template: string, cuts: Span[]): string => {
  cuts.sort((a, b) => a.start - b.start);
  let text = '';
  let read = 0;
  for (const cut of cuts) {
    text += template.slice(read, cut.start);
    read = cut.end;
  }
  return text + template.slice(read);
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

/**
 * Angular's parser, or nothing. It is imported DYNAMICALLY, and failing to get it is a
 * first-class outcome rather than an exception: a workspace that cannot resolve
 * `@angular/compiler` gets a migration that writes nowhere and names every file worth a look,
 * which is the same answer this gives for a template it cannot read.
 */
const angularParser = async (): Promise<Parser | null> => {
  try {
    const compiler = (await import('@angular/compiler')) as unknown as {
      HtmlParser: new () => Parser;
    };
    return new compiler.HtmlParser();
  } catch {
    return null;
  }
};

/**
 * Rewrites one template, and says whether the parser could read it at all. A template it
 * could not read is REPORTED and never touched: an error from the parser means the file does
 * not compile as it stands, and the one thing worse than a migration that changes nothing is
 * one that says it changed everything.
 */
const rewriteTemplate = (
  parser: Parser,
  template: string,
  path: string,
): { readonly text: string; readonly unreadable: boolean } => {
  let parsed;
  try {
    // The flag `parseTemplate` itself passes. It changes nothing this walks — an expansion's
    // cases are deliberately not followed — and it changes what the parser REPORTS: with
    // expansion forms tokenized, a malformed plural message is an error here exactly as it is
    // in the consumer's build, and an error means this writes nothing and names the file.
    parsed = parser.parse(template, path, { tokenizeExpansionForms: true });
  } catch {
    return { text: template, unreadable: true };
  }
  if (parsed.errors?.length) return { text: template, unreadable: true };

  const cuts: Span[] = [];
  for (const element of elementsOf(parsed.rootNodes)) {
    if (localName(element.name ?? '') !== BADGE) continue;
    const attributes = element.attrs ?? [];
    const neutral = attributes.filter(isNeutralTone);
    if (!neutral.length) continue;
    for (const attribute of [
      ...neutral,
      ...attributes.filter(isOrphanDescriptor),
    ])
      cuts.push(cutFor(template, attribute));
  }
  return { text: withoutSpans(template, cuts), unreadable: false };
};

export function badgeTone(): Rule {
  return async (tree: Tree, context: SchematicContext) => {
    const parser = await angularParser();
    const rewritten: string[] = [];
    const unread: string[] = [];
    const byHand: string[] = [];

    // `visit` is synchronous and the work below is not, so the walk collects and the reading
    // happens after it: a callback that returned a promise would be a promise nobody awaits.
    const paths: string[] = [];
    tree.visit((path) => {
      if (SKIPPED.test(path)) return;
      if (TEMPLATE_FILE.test(path) || SOURCE_FILE.test(path)) paths.push(path);
    });

    for (const path of paths) {
      const template = TEMPLATE_FILE.test(path);

      let before: string;
      try {
        before = tree.readText(path);
      } catch {
        // `readText` decodes as UTF-8 and throws on anything else, and `.ts` is also the
        // extension of an MPEG transport stream. One asset would otherwise end the whole
        // migration with a decoding error the consumer cannot act on.
        continue;
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
        continue;
      }

      if (parser === null) {
        // No parser, no writing. The file is named if it looks like it holds a tone, which
        // is every file this migration would have had anything to say about anyway.
        if (mayStillHoldATone(before)) unread.push(shown);
        continue;
      }

      const result = rewriteTemplate(parser, before, path);
      if (result.text !== before) {
        tree.overwrite(path, result.text);
        rewritten.push(shown);
      }
      if (result.unreadable || mayStillHoldATone(result.text))
        unread.push(shown);
    }

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
