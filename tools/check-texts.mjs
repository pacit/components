#!/usr/bin/env node
/**
 * Texts channel gate: `req-api-texts` — a string the library prints ITSELF goes through the
 * `PCT_TEXTS` token, not into a template or an input's default. A literal added to a template
 * compiles, passes the tests and looks right in every screenshot; it breaks at a consumer.
 *
 *  1. DENOMINATOR: every decorator parsed, every template owned, no unknown AST node,
 *  2. ARTIFACT: the classes and static attributes from the sources match the BUILT package,
 *  3. TEMPLATE: no text node and no SPEAKING attribute carries a literal with a letter,
 *  4. TYPESCRIPT: a signal's default is not prose and does not read `PCT_TEXTS`,
 *  5. CHANNEL: the `PctTexts` keys, their defaults and their reads are one set,
 *  6. WARNINGS: `console.*` draws nothing from `PCT_TEXTS` and is quiet outside `isDevMode()`.
 *
 * The template is read by `parseTemplate` from `@angular/compiler` and walked by
 * `TmplAstRecursiveVisitor`: it cannot lose syntax quietly, and point 1's four rules watch
 * that it sees EVERYTHING.
 *
 * Usage: node tools/check-texts.mjs
 */
import {
  parseTemplate,
  RecursiveAstVisitor,
  TmplAstRecursiveVisitor,
  visitAll,
} from '@angular/compiler';
import { execFileSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  globSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PROJECT = 'libs/components';
const DIST = 'dist/libs/components';
const FIXTURES = join(ROOT, 'tools/check-texts.fixtures');
const REFERENCE = '_reference';

/**
 * The attributes whose value a user SEES or HEARS. The list is closed, and that is its
 * defect, known in advance: there is no way for a machine to derive it. It is visible,
 * though — adding an entry is a line in the diff, exactly like the name dictionary in
 * `check-tokens`.
 *
 * The first group holds the ARIA properties with a STRING value (not an idref, an enum or
 * a number) — only they carry text for a screen reader. The second holds the HTML
 * attributes whose value lands on screen. `role`, `type` and `aria-haspopup` belong to
 * neither: their values are keywords of a specification, not text — which is why
 * `role="combobox"` is no violation here.
 */
const SPEAKING_ATTRIBUTES = new Set([
  'aria-label',
  'aria-placeholder',
  'aria-roledescription',
  'aria-valuetext',
  'aria-keyshortcuts',
  'aria-description',
  'aria-braillelabel',
  'aria-brailleroledescription',
  'title',
  'placeholder',
  'alt',
  'label',
  'abbr',
  'download',
]);

/** `<input type="submit">` prints `value` as the button's label. */
const BUTTONS = new Set(['submit', 'button', 'reset']);

const LETTER = /\p{L}/u;

/**
 * Prose in TypeScript. In a template it is POSITION that decides whether a literal is text
 * (a text node is text by definition); in TS there is no position, so shape decides. A
 * capital letter at the start or a space in the middle tells a sentence from an axis value
 * (`md`, `solid`, `inset`, `pctPrefix`) — measured across the whole library: nothing fires
 * on this rule today, and `Select…` and `No options` both do.
 *
 * A known limit: a one-word lowercase string (`close`) is indistinguishable from an axis
 * value to this rule. The point's second rule closes that — an input declared as
 * `input<string>` is arbitrary text by definition, so a literal in its default fires
 * whatever its shape.
 */
const isProse = (v) => LETTER.test(v) && (/^\p{Lu}/u.test(v) || /\s/.test(v));

const list = (entries) => entries.map((w) => `      ${w}`).join('\n');

const shorten = (entries, countOf = 8) =>
  entries.length <= countOf
    ? entries
    : [...entries.slice(0, countOf), `… and ${entries.length - countOf} more`];

const countOf = (text, pattern) => (text.match(pattern) ?? []).length;

// ── source scanners ────────────────────────────────────────────────────────────

/**
 * The same anchor as in `check-parts` and for the same reason: the formatting
 * enforced by `nx format:check` puts `@Component({` and `})` in column zero. The counter
 * does NOT repeat that anchor — a repeated one would put out both sides of the comparison
 * at once (`lesson-48`).
 */
const DECORATOR =
  /^@(Component|Directive)\(\{\r?\n([\s\S]*?)^\}\)\r?\n(?:export\s+)?(?:abstract\s+)?class\s+([A-Za-z_$][\w$]*)/gm;
const DECORATOR_COUNT = /^[ \t]*@(?:Component|Directive)\(/gm;

const TEMPLATE_URL = /templateUrl\s*:\s*(['"])([^'"]*)\1/;
const TEMPLATE_INLINE = /^\s{2}template\s*:\s*([\s\S]*?),?\s*$/m;

/** A string literal in an expression (a binding in a `host` block is a string). */
const LITERAL_IN_EXPRESSION = /'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"/g;

/**
 * The key of a `host` block entry — the quotes are optional, because prettier does not add
 * them: `role: 'spinbutton'` and `'[attr.aria-label]': 'x()'` stand side by side in the same
 * block (`field/src/number.ts`). A pattern demanding quotes would let the first through
 * SILENTLY — and that is exactly the half the static attributes sit in.
 */
const HOST_KEY = /(?:'([^']*)'|"([^"]*)"|([A-Za-z_$][\w$]*))\s*:/g;

/**
 * The `host` block's entries as key/value pairs — with the values read with escapes in
 * mind, because bindings carry the other kind of quote inside (`'open() ? "" : null'`).
 *
 * An entry this scanner does not understand (a `...fitHost` spread, a value composed by an
 * expression) is skipped WITHOUT a message — deliberately: its denominator is point 2, the
 * comparison against the built package. A static attribute brought in by such syntax will
 * appear on the artifact's side and be missing on the sources' side, so it fires with its
 * name in the message.
 */
const readHost = (block) => {
  const entries = [];
  for (const m of block.matchAll(HOST_KEY)) {
    const key = m[1] ?? m[2] ?? m[3];
    let i = m.index + m[0].length;
    while (/\s/.test(block[i])) i++;
    const quote = block[i];
    if (quote !== "'" && quote !== '"') continue;
    let k = i + 1;
    let value = '';
    while (k < block.length && block[k] !== quote) {
      if (block[k] === '\\') k++;
      value += block[k];
      k++;
    }
    if (k >= block.length) continue;
    entries.push([key, value]);
  }
  return entries;
};

/**
 * The `host` block from a decorator's body — with braces matched rather than a regex up to
 * the first `}`: values can contain braces (`'open() ? "" : null'`).
 */
const hostBlock = (body) => {
  const i = body.search(/(^|\s)host\s*:\s*\{/m);
  if (i === -1) return null;
  const start = body.indexOf('{', i);
  let depth = 0;
  for (let k = start; k < body.length; k++) {
    if (body[k] === '{') depth++;
    else if (body[k] === '}' && --depth === 0) return body.slice(start + 1, k);
  }
  return null;
};

/** The attribute name from a `host` block key: `[attr.aria-label]` → `aria-label`. */
const nameFromKey = (key) => {
  const bound = /^\[(?:attr\.)?([^\]]+)\]$/.exec(key);
  return bound ? { name: bound[1], bound: true } : { name: key, bound: false };
};

/**
 * Decorated classes. `attributes` are the `host` block's static attributes (name/value
 * pairs), `literals` the string literals from the expressions of speaking-attribute
 * bindings.
 *
 * A `host` block is sometimes composed by spreading somebody else's object (`...fitHost` in
 * `field/src/affix.ts`) and this scanner does not see that — deliberately, exactly as in
 * `check-parts`. An attribute brought in by a spread appears in the package read and is
 * missing from the source read, so it fires point 2. Exactly the work the second read is
 * there to do.
 */
const readSources = (root, files) => {
  const classes = [];
  let declarations = 0;

  for (const file of files) {
    const content = readFileSync(join(root, file), 'utf8');
    declarations += countOf(content, DECORATOR_COUNT);

    for (const [, kind, body, className] of content.matchAll(DECORATOR)) {
      const url = TEMPLATE_URL.exec(body);
      const inline = TEMPLATE_INLINE.exec(body);
      const host = hostBlock(body) ?? '';
      const attributes = [];
      const literals = [];

      for (const [key, value] of readHost(host)) {
        const { name, bound } = nameFromKey(key);
        if (!bound) {
          attributes.push([name, value]);
          continue;
        }
        if (!SPEAKING_ATTRIBUTES.has(name)) continue;
        for (const l of value.matchAll(LITERAL_IN_EXPRESSION))
          literals.push([name, l[1] ?? l[2]]);
      }

      classes.push({
        file,
        className,
        kind,
        template: url
          ? relative(root, resolve(join(root, dirname(file)), url[2]))
              .split('\\')
              .join('/')
          : null,
        // An empty template (`template: ''` in `number.ts` and `text.ts`) has nothing to
        // print a string with. Any other notation written into the decorator is a hole:
        // this scanner reads `.html` files, so text from a decorator would be invisible to
        // it and travels to the browser all the same.
        inline: inline !== null && !/^(''|"")$/.test(inline[1].trim()),
        attributes,
        literals,
      });
    }
  }

  return { classes, declarations };
};

/**
 * The node kinds this walk understands. The list exists so that the day Angular adds a new
 * kind of node carrying text (on the horizon today: `TmplAstComponent` and
 * `TmplAstDirective` from the selectorless syntax) is the day this gate SAYS so — rather
 * than the day it quietly stops measuring that node's contents.
 */
const KNOWN_NODES = new Set([
  'Text',
  'BoundText',
  'TextAttribute',
  'BoundAttribute',
  'BoundEvent',
  'Element',
  'Template',
  'Content',
  'Reference',
  'Variable',
  'LetDeclaration',
  'IfBlock',
  'IfBlockBranch',
  'ForLoopBlock',
  'ForLoopBlockEmpty',
  'SwitchBlock',
  'SwitchBlockCase',
  'SwitchBlockCaseGroup',
  'DeferredBlock',
  'DeferredBlockPlaceholder',
  'DeferredBlockLoading',
  'DeferredBlockError',
  'Icu',
  'UnknownBlock',
]);

/** String literals from an expression — pipe arguments excluded (see `visitPipe`). */
class ExpressionLiterals extends RecursiveAstVisitor {
  constructor(collect) {
    super();
    this.collect = collect;
  }
  visitLiteralPrimitive(node) {
    if (typeof node.value === 'string') this.collect(node.value);
  }
  visitTemplateLiteralElement(node) {
    this.collect(node.text);
  }
  /**
   * A pipe's argument never reaches the DOM — it is a format marker (`date: 'short'`),
   * not text. The rule speaks of prose landing on screen, so covering it would contradict
   * the rule itself.
   */
  visitPipe(node, ctx) {
    node.exp.visit(this, ctx);
  }
}

/**
 * One walk over a template's tree. It collects what the user sees: node texts, the values
 * of speaking attributes and the literals from expressions that land in such a place. It
 * counts visited nodes along the way — point 1 compares that count against zero, because a
 * pass that visited nothing
 * pronounces on everything (`lesson-48`).
 */
class TemplateScanner extends TmplAstRecursiveVisitor {
  constructor(file) {
    super();
    this.file = file;
    this.texts = [];
    this.attributes = [];
    this.expressions = [];
    this.icu = 0;
    this.nodesSeen = 0;
    this.unknown = new Set();
    this.tag = null;
    this.type = null;
  }

  seen(node) {
    const kind = node?.constructor?.name;
    this.nodesSeen++;
    if (!KNOWN_NODES.has(kind)) this.unknown.add(kind);
  }

  visitText(node) {
    this.seen(node);
    if (node.value.trim() !== '')
      this.texts.push({ value: node.value.trim(), line: line(node) });
  }

  visitBoundText(node) {
    this.seen(node);
    node.value.visit(
      new ExpressionLiterals((v) =>
        this.expressions.push({
          where: 'interpolation',
          value: v,
          line: line(node),
        }),
      ),
    );
  }

  visitElement(node) {
    this.seen(node);
    const previous = [this.tag, this.type];
    this.tag = node.name;
    this.type =
      node.attributes.find((a) => a.name === 'type')?.value?.toLowerCase() ??
      null;
    super.visitElement(node);
    [this.tag, this.type] = previous;
  }

  speaking(name) {
    return (
      SPEAKING_ATTRIBUTES.has(name) ||
      (name === 'value' && this.tag === 'input' && BUTTONS.has(this.type))
    );
  }

  visitTextAttribute(node) {
    this.seen(node);
    if (this.speaking(node.name))
      this.attributes.push({
        name: node.name,
        value: node.value,
        line: line(node),
      });
  }

  visitBoundAttribute(node) {
    this.seen(node);
    if (!this.speaking(node.name)) return;
    node.value.visit(
      new ExpressionLiterals((v) =>
        this.expressions.push({
          where: `binding \`${node.name}\``,
          value: v,
          line: line(node),
        }),
      ),
    );
  }

  /**
   * ICU keeps its text variants in a separate i18n tree this walk does not reach — and
   * `PCT_TEXTS` has nothing to handle such a string with, being a map of strings rather
   * than a grammar. Instead of reading it by halves, point 3 forbids it: the same move as
   * forbidding a bound part name in `check-parts` — a thing the measurement cannot see is
   * to be loud rather than invisible.
   */
  visitIcu(node) {
    this.seen(node);
    this.icu++;
    return super.visitIcu(node);
  }

  visitBoundEvent(node) {
    this.seen(node);
  }
  visitReference(node) {
    this.seen(node);
  }
  visitVariable(node) {
    this.seen(node);
  }
  visitContent(node) {
    this.seen(node);
    return super.visitContent(node);
  }
  visitTemplate(node) {
    this.seen(node);
    return super.visitTemplate(node);
  }
  visitLetDeclaration(node) {
    this.seen(node);
  }
  visitIfBlock(node) {
    this.seen(node);
    return super.visitIfBlock(node);
  }
  visitIfBlockBranch(node) {
    this.seen(node);
    return super.visitIfBlockBranch(node);
  }
  visitForLoopBlock(node) {
    this.seen(node);
    return super.visitForLoopBlock(node);
  }
  visitForLoopBlockEmpty(node) {
    this.seen(node);
    return super.visitForLoopBlockEmpty(node);
  }
  visitSwitchBlock(node) {
    this.seen(node);
    return super.visitSwitchBlock(node);
  }
  visitSwitchBlockCase(node) {
    this.seen(node);
    return super.visitSwitchBlockCase(node);
  }
  visitDeferredBlock(node) {
    this.seen(node);
    return super.visitDeferredBlock(node);
  }
  visitDeferredBlockPlaceholder(node) {
    this.seen(node);
    return super.visitDeferredBlockPlaceholder(node);
  }
  visitDeferredBlockLoading(node) {
    this.seen(node);
    return super.visitDeferredBlockLoading(node);
  }
  visitDeferredBlockError(node) {
    this.seen(node);
    return super.visitDeferredBlockError(node);
  }
  visitUnknownBlock(node) {
    this.seen(node);
  }
}

const line = (node) => node?.sourceSpan?.start?.line + 1 || '?';

/**
 * `preserveWhitespaces: false` — that is how a template really compiles, so that is the set
 * of nodes reaching the browser. Under `true` every indent would be a text node of its own
 * and point 3 would be pronouncing on whitespace.
 */
const readTemplate = (file, content) => {
  const result = parseTemplate(content, file, { preserveWhitespaces: false });
  const scanner = new TemplateScanner(file);
  if (!result.errors?.length) visitAll(scanner, result.nodes);
  return { file, errors: result.errors ?? [], scanner };
};

// ── TypeScript scanner ─────────────────────────────────────────────────────────

/**
 * Signal factory calls together with their first argument. The generic is not parsed with a
 * regex: `input<readonly PctSelectOption<T>[]>([])` has a `>` inside, so a `<[^>]*>` pattern
 * would let it through SILENTLY — and an input the scanner did not see is exactly what this
 * point is looking for. Angle brackets are therefore counted like round ones.
 */
const FACTORIES = ['input', 'model', 'signal', 'computed'];
/**
 * The independent counter cannot count calls — the scanner finds MORE of them than
 * assignments (a factory called in a function body, in an argument, in a conditional), so
 * comparing the sums would pass even with one assignment gone. ASSIGNMENTS are counted
 * instead, and the condition is that the scanner resolves each of them to a call.
 */
const ASSIGNMENT = /=\s*$/;

const match = (text, i, opening, closing) => {
  let depth = 0;
  for (let k = i; k < text.length; k++) {
    if (text[k] === opening) depth++;
    else if (text[k] === closing && --depth === 0) return k;
  }
  return -1;
};

const readFactories = (file, content) => {
  const calls = [];
  const unrecognised = [];
  const pattern = new RegExp(`\\b(${FACTORIES.join('|')})\\b`, 'g');

  for (const m of content.matchAll(pattern)) {
    const assignment = ASSIGNMENT.test(content.slice(0, m.index));
    const report = () => {
      if (assignment)
        unrecognised.push(
          `${file}:${content.slice(0, m.index).split('\n').length}: ` +
            `= ${m[1]} with no recognised call`,
        );
    };
    let k = m.index + m[1].length;
    // `.required` and the generic are optional and may appear in that order.
    for (;;) {
      while (/\s/.test(content[k])) k++;
      if (content.startsWith('.required', k)) {
        k += '.required'.length;
        continue;
      }
      if (content[k] === '<') {
        const end = match(content, k, '<', '>');
        if (end === -1) break;
        k = end + 1;
        continue;
      }
      break;
    }
    if (content[k] !== '(') {
      report();
      continue;
    }
    const end = match(content, k, '(', ')');
    if (end === -1) {
      report();
      continue;
    }

    // The first argument alone: `input('x', { alias: 'Name' })` carries an attribute name
    // in the second, not a string. The comma is counted outside any nesting.
    const whole = content.slice(k + 1, end);
    let g = 0;
    let comma = whole.length;
    for (let i = 0; i < whole.length; i++) {
      const c = whole[i];
      if ('([{'.includes(c)) g++;
      else if (')]}'.includes(c)) g--;
      else if (c === ',' && g === 0) {
        comma = i;
        break;
      }
    }

    calls.push({
      file,
      factory: m[1],
      line: content.slice(0, m.index).split('\n').length,
      // The declared type of the first parameter — `input<string>` means "arbitrary
      // text", that is, a place where a literal is prose by definition.
      textual: /^\s*<\s*string\s*[,>]/.test(
        content.slice(m.index + m[1].length),
      ),
      argument: whole.slice(0, comma),
    });
  }

  return { calls, unrecognised };
};

const INTERFACE_KEYS = /export interface PctTexts \{([\s\S]*?)^\}/m;
const DEFAULTS = /export const PCT_DEFAULT_TEXTS[^=]*=\s*\{([\s\S]*?)^\};/m;
const POLE = /^\s*(?:readonly\s+)?([A-Za-z_$][\w$]*)\s*:/gm;
const DEFAULT_PAIR = /^\s*([A-Za-z_$][\w$]*)\s*:\s*(['"])((?:[^'\\]|\\.)*)\2/gm;
/** `texts().key` — the only road for a read after decision 0014. */
const TEXTS_READ = /\btexts\(\)\.([A-Za-z_$][\w$]*)/g;
/** `inject(PCT_TEXTS)` has to land under the name `texts` — else the read disappears. */
const INJECTION = /(?:(\w+)\s*=\s*)?inject\(\s*PCT_TEXTS\s*\)/g;

const CONSOLE_CALL = /\bconsole\.(log|warn|error|info|debug)\s*\(/g;

// ── checks ──────────────────────────────────────────────────────────────────

/**
 * A violation — with the identifier of the point AND of the rule. The point alone is not
 * enough: point 3 carries four rules, point 5 six, and a negative control comparing only
 * the point would let through a case that fired on a neighbouring rule (`lesson-50`).
 */
class TextsError extends Error {
  constructor(check, rule, description) {
    super(description);
    this.check = check;
    this.rule = rule;
  }
}

const checkTexts = (input) => {
  const { classes, declarations, templates, pkg, sources } = input;

  // ── 1. DENOMINATOR ────────────────────────────────────────────────────────────
  if (!classes.length || !sources.length)
    throw new TextsError(
      'denominator',
      'empty-list',
      `no \`@Component\`/\`@Directive\` decorator found in the sources ` +
        `(${PROJECT}; files: ${sources.length}) — every later point would then pass ` +
        `without pronouncing on anything (lesson-48).\n    Usual cause: the list of ` +
        `source files stopped returning anything.`,
    );

  if (classes.length !== declarations)
    throw new TextsError(
      'denominator',
      'decorator-parser',
      `the parser recognised ${classes.length} of ${declarations} decorators — the rest ` +
        `would drop out of the measurement without a trace, together with their \`host\` ` +
        `block. Usual cause: a decorator written otherwise than prettier formats it ` +
        `(\`@Component({\` and \`})\` in column zero).`,
    );

  const inInline = classes.filter((k) => k.inline);
  if (inInline.length)
    throw new TextsError(
      'denominator',
      'template-in-decorator',
      `${inInline.length} classes take their template from the decorator, not from a file:\n` +
        list(inInline.map((k) => `${k.file}: ${k.className}`)) +
        `\n    This scanner reads \`.html\` files, so a string written into a decorator ` +
        `would be invisible to it — and travels to the browser all the same. Move the ` +
        `template out to ` +
        `\`templateUrl\`.`,
    );

  const used = new Map();
  for (const k of classes)
    if (k.template) used.set(k.template, [...(used.get(k.template) ?? []), k]);

  const known = new Set(templates.map((s) => s.file));
  const missing = [...used.keys()].filter((s) => !known.has(s));
  if (missing.length)
    throw new TextsError(
      'denominator',
      'template-without-file',
      `${missing.length} templates named by \`templateUrl\` are not on the gate's ` +
        `file list:\n` +
        list(missing) +
        `\n    Their texts will not enter the measurement. Usual cause: a file outside ` +
        `the git index, or a pathspec that stopped covering it.`,
    );

  const orphaned = templates.filter((s) => !used.has(s.file));
  if (orphaned.length)
    throw new TextsError(
      'denominator',
      'template-without-owner',
      `${orphaned.length} templates belong to no decorator:\n` +
        list(orphaned.map((s) => s.file)) +
        `\n    A template nobody points at is an orphan to the measurement — and travels ` +
        `to the browser like every other one.`,
    );

  const scans = templates.map((s) => readTemplate(s.file, s.content));

  const withError = scans.filter((s) => s.errors.length);
  if (withError.length)
    throw new TextsError(
      'denominator',
      'template-parser',
      `Angular's parser rejected ${withError.length} templates:\n` +
        list(
          withError.map((s) => `${s.file}: ${s.errors[0].msg.split('\n')[0]}`),
        ) +
        `\n    A tree that does not exist has no text node either — point 3 would pass ` +
        `over it without objection.`,
    );

  const unknown = scans.filter((s) => s.scanner.unknown.size);
  if (unknown.length)
    throw new TextsError(
      'denominator',
      'unknown-node',
      `${unknown.length} templates carry a node kind this walk does not know:\n` +
        list(
          unknown.map((s) => `${s.file}: ${[...s.scanner.unknown].join(', ')}`),
        ) +
        `\n    A new node kind may carry text, and the default walk would pass through ` +
        `it without a word. Add it to \`KNOWN_NODES\` with a decision on whether it does.`,
    );

  const nodesSeen = scans.reduce((n, s) => n + s.scanner.nodesSeen, 0);
  if (!nodesSeen)
    throw new TextsError(
      'denominator',
      'empty-measurement',
      `${templates.length} templates, 0 visited nodes — the measurement never started.\n` +
        `    The non-emptiness check stands on the RESULT's side, not the input's: the ` +
        `file count is sometimes right while the read itself is empty (lesson-48).`,
    );

  // ── 2. ARTIFACT ─────────────────────────────────────────────────────────────
  //
  //    The source read reads a decorator's text, so it is blind to a `host` block
  //    composed by spreading somebody else's object (`...fitHost`). The package read
  //    reads `ɵdir.hostAttrs` and `ɵcmp.consts` after linking — the output of the REAL
  //    compiler.
  if (!pkg.length)
    throw new TextsError(
      'artifact',
      'empty-package',
      `the built package gave not one class with an Angular definition — the comparison ` +
        `would pass with nothing to compare.\n    Usual cause: a stale or empty ` +
        `\`${DIST}\` (the gate needs \`dependsOn: build\`).`,
    );

  const fromSources = new Map(classes.map((k) => [k.className, k]));
  const fromPackage = new Map(pkg.map((p) => [p.className, p]));

  const withoutPackage = [...fromSources.keys()].filter(
    (k) => !fromPackage.has(k),
  );
  if (withoutPackage.length)
    throw new TextsError(
      'artifact',
      'class-without-package',
      `${withoutPackage.length} classes from the sources are not in the built package:\n` +
        list(withoutPackage.map((k) => `${k} (${fromSources.get(k).file})`)) +
        `\n    The measurement would then count the strings of a component the consumer ` +
        `never gets — or, more often, would be reading a stale \`${DIST}\`.`,
    );

  const withoutSources = [...fromPackage.keys()].filter(
    (k) => !fromSources.has(k),
  );
  if (withoutSources.length)
    throw new TextsError(
      'artifact',
      'class-without-sources',
      `${withoutSources.length} classes from the package are invisible to the source scanner:\n` +
        list(withoutSources.map((k) => `${k} (${fromPackage.get(k).input})`)) +
        `\n    A class the scanner did not see brings strings into a release that this ` +
        `gate says nothing about.`,
    );

  // A template's owner has a precondition of ITS OWN, even though point 1 guarantees it.
  // Without that, disarming the `orphaned-template` rule turned this loop into a
  // `TypeError` — the negative control lost the ability to examine the rule it was meant to
  // examine. The same defect has come out five times here; "do not trust the previous
  // point" apparently has to be written out in every gate.
  const ownerOf = (file) => used.get(file)?.[0]?.className ?? file;

  const speakingInSources = new Set();
  for (const k of classes)
    for (const [name, value] of k.attributes)
      if (SPEAKING_ATTRIBUTES.has(name))
        speakingInSources.add(`${k.className} ${name}=${value}`);
  for (const s of scans)
    for (const a of s.scanner.attributes)
      if (SPEAKING_ATTRIBUTES.has(a.name))
        speakingInSources.add(`${ownerOf(s.file)} ${a.name}=${a.value}`);

  const speakingInPackage = new Set();
  for (const p of pkg)
    for (const [name, value] of p.attributes)
      if (SPEAKING_ATTRIBUTES.has(name))
        speakingInPackage.add(`${p.className} ${name}=${value}`);

  const packageOnly = [...speakingInPackage].filter(
    (w) => !speakingInSources.has(w),
  );
  if (packageOnly.length)
    throw new TextsError(
      'artifact',
      'attribute-only-in-package',
      `${packageOnly.length} speaking attributes are in the package and not in the ` +
        `source read:\n` +
        list(shorten(packageOnly)) +
        `\n    This is what an attribute brought in by syntax the scanner cannot read ` +
        `looks like — an object spread in a \`host\` block, a mixin, inheritance. Point 3 ` +
        `would never look at it.`,
    );

  const sourcesOnly = [...speakingInSources].filter(
    (w) => !speakingInPackage.has(w),
  );
  if (sourcesOnly.length)
    throw new TextsError(
      'artifact',
      'attribute-only-in-sources',
      `${sourcesOnly.length} speaking attributes are in the sources and not in the package:\n` +
        list(shorten(sourcesOnly)) +
        `\n    Usual cause: a stale \`${DIST}\`. Point 3 would then be pronouncing on ` +
        `text the consumer never gets.`,
    );

  // ── 3. TEMPLATE ──────────────────────────────────────────────────────────────
  const textViolations = [];
  for (const s of scans)
    for (const t of s.scanner.texts)
      if (LETTER.test(t.value))
        textViolations.push(`${s.file}:${t.line}: ${JSON.stringify(t.value)}`);
  if (textViolations.length)
    throw new TextsError(
      'template',
      'literal-text',
      `${textViolations.length} text nodes carry a string written into the template:\n` +
        list(shorten(textViolations)) +
        `\n    A string the library prints itself goes through \`PCT_TEXTS\`: a field in ` +
        `\`PctTexts\`, a default in \`PCT_DEFAULT_TEXTS\`, a \`texts().key\` read ` +
        `in the template (req-api-texts). A character with no letter (\`*\`, \`×\`) is not ` +
        `text and does not fire here — there is nothing in it to translate.`,
    );

  const attributeViolations = [];
  for (const s of scans)
    for (const a of s.scanner.attributes)
      if (LETTER.test(a.value))
        attributeViolations.push(`${s.file}:${a.line}: ${a.name}="${a.value}"`);
  for (const k of classes)
    for (const [name, value] of k.attributes)
      if (SPEAKING_ATTRIBUTES.has(name) && LETTER.test(value))
        attributeViolations.push(`${k.file}: host \`${name}\` = "${value}"`);
  if (attributeViolations.length)
    throw new TextsError(
      'template',
      'speaking-attribute',
      `${attributeViolations.length} speaking attributes carry a string written inline:\n` +
        list(shorten(attributeViolations)) +
        `\n    The value of \`aria-label\`, \`title\` or \`placeholder\` is read by the ` +
        `user — that is text, not a keyword of a specification (like \`role="combobox"\`). ` +
        `It goes through ` +
        `\`PCT_TEXTS\`.`,
    );

  const expressionViolations = [];
  for (const s of scans)
    for (const w of s.scanner.expressions)
      if (LETTER.test(w.value))
        expressionViolations.push(
          `${s.file}:${w.line}: ${w.where} → ${JSON.stringify(w.value)}`,
        );
  for (const k of classes)
    for (const [name, value] of k.literals)
      if (LETTER.test(value))
        expressionViolations.push(
          `${k.file}: host \`${name}\` → ${JSON.stringify(value)}`,
        );
  if (expressionViolations.length)
    throw new TextsError(
      'template',
      'literal-in-expression',
      `${expressionViolations.length} string literals reach the DOM from an expression:\n` +
        list(shorten(expressionViolations)) +
        `\n    \`{{ open() ? 'Close' : 'Open' }}\` bypasses the channel exactly like a ` +
        `string written into a node's text — only it looks like code. A pipe's argument ` +
        `does not count: that is a format marker, not text.`,
    );

  const withIcu = scans.filter((s) => s.scanner.icu);
  if (withIcu.length)
    throw new TextsError(
      'template',
      'icu',
      `${withIcu.length} templates use an ICU expression:\n` +
        list(withIcu.map((s) => `${s.file}: ${s.scanner.icu} occurrences`)) +
        `\n    ICU keeps its text variants in an i18n tree this read does not reach — and ` +
        `\`PCT_TEXTS\` is a map of strings, not a grammar, so it has nothing to handle ` +
        `them with. Plurals in a library are a decision to record (an ADR), not a syntax ` +
        `to write.`,
    );

  // ── 4. TYPESCRIPT ───────────────────────────────────────────────────────────
  const factories = input.factories.calls;
  if (!factories.length || input.factories.unrecognised.length)
    throw new TextsError(
      'typescript',
      'empty-measurement',
      `the scanner recognised ${factories.length} signal factory calls and left ` +
        `${input.factories.unrecognised.length} assignments unresolved:\n` +
        list(shorten(input.factories.unrecognised)) +
        `\n    An input the scanner did not resolve to a call brings a default value this ` +
        `point says nothing about. The counter counts ASSIGNMENTS, not calls: the scanner ` +
        `finds more calls (a factory in a function body, in an argument), so comparing the ` +
        `sums would pass even with one assignment gone.`,
    );

  const prose = factories.flatMap((f) =>
    [...f.argument.matchAll(LITERAL_IN_EXPRESSION)]
      .map((m) => m[1] ?? m[2])
      .filter(isProse)
      .map(
        (v) => `${f.file}:${f.line}: ${f.factory}(…) → ${JSON.stringify(v)}`,
      ),
  );
  if (prose.length)
    throw new TextsError(
      'typescript',
      'prose-in-factory',
      `${prose.length} signal defaults are prose:\n` +
        list(shorten(prose)) +
        `\n    A library string goes through \`PCT_TEXTS\`. An axis value (\`md\`, ` +
        `\`solid\`, \`inset\`) is not prose and does not fire here — shape tells them ` +
        `apart: a capital at the start or a space in the middle.`,
    );

  const textDefault = factories
    .filter(
      (f) =>
        f.textual &&
        [...f.argument.matchAll(LITERAL_IN_EXPRESSION)].some(
          (m) => (m[1] ?? m[2]) !== '',
        ),
    )
    .map((f) => `${f.file}:${f.line}: ${f.factory}<string>(${f.argument})`);
  if (textDefault.length)
    throw new TextsError(
      'typescript',
      'text-as-default',
      `${textDefault.length} inputs declared as \`<string>\` carry a literal as their ` +
        `default:\n` +
        list(shorten(textDefault)) +
        `\n    \`<string>\` means "arbitrary text", so a literal in that place is a ` +
        `library string whatever it looks like. An empty one (\`''\`) means "no value" ` +
        `and is allowed.`,
    );

  const atConstruction = factories
    .filter(
      (f) => f.factory !== 'computed' && /\btexts\s*\(\s*\)/.test(f.argument),
    )
    .map((f) => `${f.file}:${f.line}: ${f.factory}(…${f.argument.trim()}…)`);
  if (atConstruction.length)
    throw new TextsError(
      'typescript',
      'text-at-construction',
      `${atConstruction.length} defaults read \`PCT_TEXTS\` at CONSTRUCTION:\n` +
        list(shorten(atConstruction)) +
        `\n    An input's default is created once, so an application switching language ` +
        `without a reload keeps the string from before the change — exactly the defect ` +
        `decision 0014 closed. Read through \`computed()\`, that is, at render time.`,
    );

  // ── 5. CHANNEL ────────────────────────────────────────────────────────────────
  const { keys, defaults, reads, injections } = input.channel;

  if (!keys.length)
    throw new TextsError(
      'channel',
      'empty-measurement',
      `no field found in \`export interface PctTexts\` — the whole of point 5 would then ` +
        `pass with nothing to compare.\n    Usual cause: the interface moved to another ` +
        `file, or written differently.`,
    );

  const wrongInjections = injections
    .filter((w) => w.name !== 'texts')
    .map((w) => `${w.file}:${w.line}: ${w.name ?? '(no assignment)'}`);
  if (wrongInjections.length)
    throw new TextsError(
      'channel',
      'inject-under-another-name',
      `${wrongInjections.length} \`PCT_TEXTS\` injections land under a name other than ` +
        `\`texts\`:\n` +
        list(wrongInjections) +
        `\n    Reads are counted by the \`texts().key\` pattern, so another name makes ` +
        `them invisible — and then the "a key has to be used" rule pronounces on keys it ` +
        `simply cannot see.`,
    );

  const withoutDefault = keys.filter((k) => !(k in defaults));
  if (withoutDefault.length)
    throw new TextsError(
      'channel',
      'key-without-default',
      `${withoutDefault.length} \`PctTexts\` fields have no default value:\n` +
        list(withoutDefault) +
        `\n    Overriding is partial (decision 0007), so a field with no default reaches ` +
        `the DOM as \`undefined\` for everybody who did not translate it.`,
    );

  const withoutKey = Object.keys(defaults).filter((k) => !keys.includes(k));
  if (withoutKey.length)
    throw new TextsError(
      'channel',
      'default-without-key',
      `${withoutKey.length} default values have no field in \`PctTexts\`:\n` +
        list(withoutKey) +
        `\n    A string missing from the type is a string the consumer has no way of ` +
        `overriding — \`providePctTexts\` takes \`Partial<PctTexts>\`.`,
    );

  const empty = keys.filter((k) => k in defaults && defaults[k].trim() === '');
  if (empty.length)
    throw new TextsError(
      'channel',
      'empty-default',
      `${empty.length} default values are empty:\n` +
        list(empty) +
        `\n    An empty default turns "the library prints this itself" into "the library ` +
        `prints nothing" for everybody who did not translate that field.`,
    );

  const readKeys = new Set(reads.map((o) => o.key));
  const dead = keys.filter((k) => !readKeys.has(k));
  if (dead.length)
    throw new TextsError(
      'channel',
      'dead-key',
      `${dead.length} \`PctTexts\` fields are read by no component:\n` +
        list(dead) +
        `\n    That is coverage which does not exist: the field stands in a public type, ` +
        `the consumer translates it, and it appears nowhere. The same move as removing the ` +
        `dead \`--pct-on-danger\` — the field comes back with a component that ` +
        `prints it.`,
    );

  const toNowhere = reads
    .filter((o) => !keys.includes(o.key))
    .map((o) => `${o.file}: texts().${o.key}`);
  if (toNowhere.length)
    throw new TextsError(
      'channel',
      'read-to-nowhere',
      `${toNowhere.length} reads name a field that is not in \`PctTexts\`:\n` +
        list(shorten(toNowhere)) +
        `\n    In a template such a read is no compilation error — it is an empty space ` +
        `on the screen.`,
    );

  // ── 6. WARNINGS ──────────────────────────────────────────────────────────
  const fromChannel = input.warnings
    .filter((o) => /\btexts\s*\(\s*\)/.test(o.argument))
    .map((o) => `${o.file}:${o.line}`);
  if (fromChannel.length)
    throw new TextsError(
      'warnings',
      'warning-from-the-channel',
      `${fromChannel.length} developer warnings draw on \`PCT_TEXTS\`:\n` +
        list(fromChannel) +
        `\n    A warning is read by a developer, not a user — translating it helps nobody ` +
        `and takes up room in a type the consumer has to fill in (decision 0007).`,
    );

  const withoutDevMode = input.warnings
    .filter((o) => !o.guarded)
    .map((o) => `${o.file}:${o.line}: console.${o.method}(…)`);
  if (withoutDevMode.length)
    throw new TextsError(
      'warnings',
      'warning-without-devmode',
      `${withoutDevMode.length} \`console.*\` calls do not go quiet outside \`isDevMode()\`:\n` +
        list(withoutDevMode) +
        `\n    The requirement reserves this channel for development mode. The guard may ` +
        `stand in the same function or at EVERY call of it — the gate accepts both, ` +
        `because \`if (isDevMode()) this.warn()\` is better rather than worse.`,
    );

  const textCount = scans.reduce((n, s) => n + s.scanner.texts.length, 0);
  return {
    description:
      `${templates.length} templates (${nodesSeen} nodes, ${textCount} texts), ` +
      `${classes.length} classes, ${factories.length} signals, ` +
      `${keys.length} PctTexts fields in ${reads.length} reads, ` +
      `${input.warnings.length} developer warnings`,
  };
};

// ── input from disk ───────────────────────────────────────────────────────────

const read = (root, path) => readFileSync(join(root, path), 'utf8');

const isSource = (p) =>
  p.startsWith(`${PROJECT}/`) && p.endsWith('.ts') && !p.endsWith('.spec.ts');
const isTemplate = (p) => p.startsWith(`${PROJECT}/`) && p.endsWith('.html');

/**
 * Static attributes from Angular's flat array (`consts`, `hostAttrs`). A number opens a
 * section with a different meaning (classes, styles, bindings), so we read only the prefix
 * before the first number — beyond it stand names without values. The same parser as in
 * `check-parts`.
 */
const pairAttributes = (attrs) => {
  const out = [];
  for (let i = 0; i < attrs.length; i++) {
    if (typeof attrs[i] === 'number') break;
    out.push([attrs[i], attrs[i + 1]]);
    i++;
  }
  return out;
};

/**
 * Definitions from the BUILT package. `@angular/compiler` is loaded first,
 * because the package is partially compiled and `ɵcmp` appears only on access — the same
 * step the linker performs at the consumer's (`lesson-46`).
 */
const packageComponents = async (root) => {
  const dist = join(root, DIST);
  if (!existsSync(join(dist, 'package.json')))
    throw new TextsError(
      'artifact',
      'empty-package',
      `no built package in ${DIST} — this gate reads the artifact, not the sources ` +
        `alone.\n    The target needs a \`dependsOn\` on the library's build.`,
    );

  await import('@angular/compiler');
  const exports = JSON.parse(read(root, `${DIST}/package.json`)).exports ?? {};
  const out = [];

  for (const [input, target] of Object.entries(exports)) {
    const file = typeof target === 'object' ? target.default : target;
    if (typeof file !== 'string' || !file.endsWith('.mjs')) continue;

    const module = await import(
      pathToFileURL(join(dist, file.replace(/^\.\//, ''))).href
    );
    for (const [className, value] of Object.entries(module)) {
      if (typeof value !== 'function') continue;
      const def = value['ɵcmp'] ?? value['ɵdir'];
      if (!def) continue;

      const consts =
        typeof def.consts === 'function' ? def.consts() : (def.consts ?? []);
      out.push({
        input,
        className,
        attributes: [
          ...consts.filter(Array.isArray).flatMap(pairAttributes),
          ...pairAttributes(def.hostAttrs ?? []),
        ],
      });
    }
  }
  return out;
};

/**
 * What encloses a `console.*` call: a class method at two-space indent, or a free function at
 * column zero.
 *
 * **Both alternatives, because one of them was the whole denominator until D5.** Every warning
 * in this library had until then stood in a class method, so the pattern was written for that
 * shape alone — and a free function's body still matches it, on its own `if (` and `for (`
 * lines. The gate then read `pctReportOrphanSlot`'s guard as belonging to a method called
 * `if`, measured the slice from the WRONG `if` and reported a guarded warning as unguarded
 * (`console.if(…)`, which is not a call anybody wrote). A free function's statements sit at
 * the same two-space indent a class puts its methods at, so the keywords have to be named as
 * keywords — a shape written to see one class of enclosure was silently deciding for another
 * ([`lesson-80`](../docs/lessons.md#lesson-80)).
 */
const KEYWORD = '(?:if|for|while|switch|catch|do|else|return)';
const ENCLOSING = new RegExp(
  `^ {2}(?:private |protected )?(?!${KEYWORD}\\s*\\()([A-Za-z_$][\\w$]*)\\s*\\(` +
    `|^(?:export\\s+)?(?:async\\s+)?function\\s+([A-Za-z_$][\\w$]*)\\s*\\(`,
  'gm',
);

/**
 * The developer warnings of one file. An `isDevMode()` guard is accepted in two places: in
 * the same function the `console.*` stands in, or at every call of it. The second form is
 * better in a library — it does not enter a function there is no point running — so the
 * gate must not penalise it.
 */
const readWarnings = (file, content) => {
  const out = [];
  for (const m of content.matchAll(CONSOLE_CALL)) {
    const opening = m.index + m[0].length - 1;
    const closing = match(content, opening, '(', ')');
    const argument = closing === -1 ? '' : content.slice(opening + 1, closing);
    const before = content.slice(0, m.index);
    const line = before.split('\n').length;

    // The enclosing function: the last declaration of either shape before the call.
    const methods = [...before.matchAll(ENCLOSING)];
    const last = methods.at(-1);
    const method = last ? (last[1] ?? last[2]) : null;
    const bodyFrom = last?.index ?? 0;
    // A free function is called by its bare name, a method through `this`.
    const free = last !== undefined && last[2] !== undefined;

    const inFunction = /\bisDevMode\s*\(\s*\)/.test(
      content.slice(bodyFrom, m.index),
    );
    const calls = method
      ? [
          ...content.matchAll(
            new RegExp(
              free
                ? `(?<!\\.)\\b${method}\\s*\\(`
                : `\\bthis\\.${method}\\s*\\(`,
              'g',
            ),
          ),
        ].filter((w) => w.index !== bodyFrom)
      : [];
    const atCalls =
      calls.length > 0 &&
      calls.every((w) =>
        /\bisDevMode\s*\(\s*\)/.test(
          content.slice(content.lastIndexOf('\n', w.index) + 1, w.index),
        ),
      );

    out.push({
      file,
      line,
      method,
      callMethod: calls.length,
      argument,
      guarded: inFunction || atCalls,
    });
  }
  return out;
};

/** An input built from a file list — the same shape for the repo and for a fixture. */
const gatherInput = async (root, files, packageFromDisk) => {
  const sources = files.filter(isSource);
  const contents = new Map(sources.map((p) => [p, read(root, p)]));

  const factories = { calls: [], unrecognised: [] };
  const reads = [];
  const injections = [];
  const warnings = [];
  let keys = [];
  const defaults = {};

  for (const [file, content] of contents) {
    const f = readFactories(file, content);
    factories.calls.push(...f.calls);
    factories.unrecognised.push(...f.unrecognised);
    warnings.push(...readWarnings(file, content));

    for (const m of content.matchAll(TEXTS_READ))
      reads.push({ file, key: m[1] });
    for (const m of content.matchAll(INJECTION))
      injections.push({
        file,
        line: content.slice(0, m.index).split('\n').length,
        name: m[1] ?? null,
      });

    const iface = INTERFACE_KEYS.exec(content);
    if (iface) keys = [...iface[1].matchAll(POLE)].map((m) => m[1]);
    const dom = DEFAULTS.exec(content);
    if (dom)
      for (const m of dom[1].matchAll(DEFAULT_PAIR)) defaults[m[1]] = m[3];
  }

  const templates = files
    .filter(isTemplate)
    .map((file) => ({ file, content: read(root, file) }));
  for (const { file, content } of templates)
    for (const m of content.matchAll(TEXTS_READ))
      reads.push({ file, key: m[1] });

  return {
    ...readSources(root, sources),
    sources,
    templates,
    factories,
    channel: { keys, defaults, reads, injections },
    warnings,
    pkg: packageFromDisk ?? (await packageComponents(root)),
  };
};

/**
 * Files from the GIT INDEX, not from a glob over the disk — the same reason as in the other
 * gates: the index is an independent record of what the repository really
 * carries. The pathspec is a DIRECTORY and the filtering sits in JS, because a git
 * pathspec is not a shell glob and a pattern with a star can return ZERO files rather than
 * an error (`lesson-48`).
 */
const repoFiles = () =>
  execFileSync('git', ['ls-files', '-z', PROJECT], {
    cwd: ROOT,
    encoding: 'utf8',
  })
    .split('\0')
    .filter(Boolean)
    .map((p) => p.split('\\').join('/'))
    .sort();

// ── negative control ──────────────────────────────────────────────────────────

/**
 * Builds a prepared input: a copy of the base, the case's files on top, then the deletions
 * from `fixture.json`. The case directory then holds NOTHING BUT its own defect, rather
 * than one more copy of a correct input to hunt through.
 *
 * The package read arrives as DATA (`package.json`) rather than from a real build — the same
 * choice as in `check-parts` and `check-zoneless` and for the same reason: building an
 * Angular package for each of a dozen-odd cases would cost minutes per run. The price is
 * plain: the fixtures do NOT exercise the code that reads `ɵcmp` — they exercise every
 * other parser and the whole arrangement of checks. The package read itself is exercised on
 * every run against the repository.
 *
 * The sources sit in the repository as `*.ts.txt` and become `*.ts` only here — a `.ts` file
 * in `tools/` belongs to no compiler program, so it would fire `check-typecheck`. One
 * gate's fixture must not be another's defect.
 */
const buildFixture = (name, fx) => {
  const destination = mkdtempSync(join(tmpdir(), 'pct-check-texts-'));
  cpSync(join(FIXTURES, REFERENCE), destination, { recursive: true });
  if (name !== REFERENCE)
    cpSync(join(FIXTURES, name), destination, {
      recursive: true,
      filter: (src) => basename(src) !== 'fixture.json',
    });
  for (const path of fx.drop ?? [])
    rmSync(join(destination, path), { recursive: true, force: true });
  for (const file of globSync('**/*.ts.txt', { cwd: destination }))
    renameSync(
      join(destination, file),
      join(destination, file.replace(/\.txt$/, '')),
    );
  return destination;
};

const fixtureInput = (directory) =>
  gatherInput(
    directory,
    globSync('**/*.{ts,html}', { cwd: directory })
      .map((p) => p.split('\\').join('/'))
      .sort(),
    JSON.parse(readFileSync(join(directory, 'package.json'), 'utf8')).classes,
  );

// ── the run ───────────────────────────────────────────────────────────────────

const problems = [];
let description = null;

try {
  description = checkTexts(
    await gatherInput(ROOT, repoFiles(), null),
  ).description;
} catch (error) {
  if (!(error instanceof TextsError)) throw error;
  problems.push(`${error.check}/${error.rule}: ${error.message}`);
}

const cases = readdirSync(FIXTURES, { withFileTypes: true })
  .filter((d) => d.isDirectory() && d.name !== REFERENCE)
  .map((d) => d.name)
  .sort();

if (cases.length === 0)
  problems.push(
    `tools/check-texts.fixtures: no prepared inputs — a gate with no proof that it can ` +
      `fail is one more silent defect (req-quality-negative-control)`,
  );

// The reference input MUST pass: were the base defective itself, every case would fire
// because of it rather than its own defect, and every "rejected" would be false — this
// control would become the very thing it stands against.
{
  const directory = buildFixture(REFERENCE, {});
  try {
    checkTexts(await fixtureInput(directory));
  } catch (error) {
    if (!(error instanceof TextsError)) throw error;
    problems.push(
      `${REFERENCE}: the reference input does NOT pass (${error.check}/${error.rule}) — ` +
        `every prepared case now fires because of it.\n    ${error.message}`,
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

for (const name of cases) {
  const fx = JSON.parse(
    readFileSync(join(FIXTURES, name, 'fixture.json'), 'utf8'),
  );
  const directory = buildFixture(name, fx);
  try {
    checkTexts(await fixtureInput(directory));
    problems.push(
      `${name}: the prepared input PASSED and was meant not to — ` +
        `point ${fx.point} (\`${fx.check}/${fx.rule}\`) stopped examining anything`,
    );
  } catch (error) {
    if (!(error instanceof TextsError)) throw error;
    if (error.check !== fx.check || error.rule !== fx.rule)
      problems.push(
        `${name}: \`${error.check}/${error.rule}\` fired, and point ${fx.point} ` +
          `(\`${fx.check}/${fx.rule}\`) was meant to — the fixture proves something other than what it declares`,
      );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

// ── result ────────────────────────────────────────────────────────────────────

if (problems.length) {
  console.error(`X Texts channel gate — ${problems.length} violations:\n`);
  for (const p of problems) console.error(`  - ${p}`);
  console.error('');
  process.exit(1);
}

console.log(
  `✓ Texts: ${description}. Negative control: the reference input passes, ` +
    `${cases.length} prepared ones rejected on their own rules.`,
);
