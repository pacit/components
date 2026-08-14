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
const PROJEKT = 'libs/components';
const DIST = 'dist/libs/components';
const FIXTURES = join(ROOT, 'tools/check-texts.fixtures');
const REFERENCE = '_reference';

/**
 * The attributes whose value a user SEES or HEARS. The list is closed, and that is its
 * defect, known in advance: there is no way for a machine to derive it. It is visible,
 * though — adding an entry is a line in the diff, exactly like the name dictionary in
 * `check-tokens` (A4).
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

const LITERA = /\p{L}/u;

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
const isProse = (v) => LITERA.test(v) && (/^\p{Lu}/u.test(v) || /\s/.test(v));

const list = (wpisy) => wpisy.map((w) => `      ${w}`).join('\n');

const skroc = (wpisy, ile = 8) =>
  wpisy.length <= ile
    ? wpisy
    : [...wpisy.slice(0, ile), `… i ${wpisy.length - ile} dalszych`];

const ile = (tekst, pattern) => (tekst.match(pattern) ?? []).length;

// ── source scanners ────────────────────────────────────────────────────────────

/**
 * Ta sama anchor co w `check-parts` i z tego samego powodu: formatowanie
 * enforced by `nx format:check` puts `@Component({` and `})` in column zero. The counter
 * does NOT repeat that anchor — a repeated one would put out both sides of the comparison
 * at once (`lesson-48`).
 */
const DEKORATOR =
  /^@(Component|Directive)\(\{\r?\n([\s\S]*?)^\}\)\r?\n(?:export\s+)?(?:abstract\s+)?class\s+([A-Za-z_$][\w$]*)/gm;
const DEKORATOR_LICZNIK = /^[ \t]*@(?:Component|Directive)\(/gm;

const TEMPLATE_URL = /templateUrl\s*:\s*(['"])([^'"]*)\1/;
const TEMPLATE_INLINE = /^\s{2}template\s*:\s*([\s\S]*?),?\s*$/m;

/** A string literal in an expression (a binding in a `host` block is a string). */
const LITERAL_W_WYRAZENIU = /'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"/g;

/**
 * The key of a `host` block entry — the quotes are optional, because prettier does not add
 * them: `role: 'spinbutton'` and `'[attr.aria-label]': 'x()'` stand side by side in the same
 * block (`field/src/number.ts`). A pattern demanding quotes would let the first through
 * SILENTLY — and that is exactly the half the static attributes sit in.
 */
const HOST_KLUCZ = /(?:'([^']*)'|"([^"]*)"|([A-Za-z_$][\w$]*))\s*:/g;

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
const readHost = (blok) => {
  const wpisy = [];
  for (const m of blok.matchAll(HOST_KLUCZ)) {
    const key = m[1] ?? m[2] ?? m[3];
    let i = m.index + m[0].length;
    while (/\s/.test(blok[i])) i++;
    const quote = blok[i];
    if (quote !== "'" && quote !== '"') continue;
    let k = i + 1;
    let value = '';
    while (k < blok.length && blok[k] !== quote) {
      if (blok[k] === '\\') k++;
      value += blok[k];
      k++;
    }
    if (k >= blok.length) continue;
    wpisy.push([key, value]);
  }
  return wpisy;
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

/** Nazwa attribute z key bloku `host`: `[attr.aria-label]` → `aria-label`. */
const nameFromKey = (key) => {
  const wiazane = /^\[(?:attr\.)?([^\]]+)\]$/.exec(key);
  return wiazane
    ? { name: wiazane[1], wiazane: true }
    : { name: key, wiazane: false };
};

/**
 * Decorated classes. `attributes` are the `host` block's static attributes (name/value
 * pairs), `literaly` the string literals from the expressions of speaking-attribute
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
    declarations += ile(content, DEKORATOR_LICZNIK);

    for (const [, kind, body, className] of content.matchAll(DEKORATOR)) {
      const url = TEMPLATE_URL.exec(body);
      const inline = TEMPLATE_INLINE.exec(body);
      const host = hostBlock(body) ?? '';
      const attributes = [];
      const literaly = [];

      for (const [key, value] of readHost(host)) {
        const { name, wiazane } = nameFromKey(key);
        if (!wiazane) {
          attributes.push([name, value]);
          continue;
        }
        if (!SPEAKING_ATTRIBUTES.has(name)) continue;
        for (const l of value.matchAll(LITERAL_W_WYRAZENIU))
          literaly.push([name, l[1] ?? l[2]]);
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
        literaly,
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
  constructor(zbierz) {
    super();
    this.zbierz = zbierz;
  }
  visitLiteralPrimitive(node) {
    if (typeof node.value === 'string') this.zbierz(node.value);
  }
  visitTemplateLiteralElement(node) {
    this.zbierz(node.text);
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
 * orzeka o wszystkim (`lesson-48`).
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
          gdzie: 'interpolacja',
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
          gdzie: `binding \`${node.name}\``,
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

// ── scanner TypeScriptu ────────────────────────────────────────────────────────

/**
 * Signal factory calls together with their first argument. The generic is not parsed with a
 * regex: `input<readonly PctSelectOption<T>[]>([])` has a `>` inside, so a `<[^>]*>` pattern
 * would let it through SILENTLY — and an input the scanner did not see is exactly what this
 * point is looking for. Angle brackets are therefore counted like round ones.
 */
const FABRYKI = ['input', 'model', 'signal', 'computed'];
/**
 * The independent counter cannot count calls — the scanner finds MORE of them than
 * assignments (a factory called in a function body, in an argument, in a conditional), so
 * comparing the sums would pass even with one assignment gone. ASSIGNMENTS are counted
 * instead, and the condition is that the scanner resolves each of them to a call.
 */
const PRZYPISANIE = /=\s*$/;

const match = (tekst, i, otw, zam) => {
  let depth = 0;
  for (let k = i; k < tekst.length; k++) {
    if (tekst[k] === otw) depth++;
    else if (tekst[k] === zam && --depth === 0) return k;
  }
  return -1;
};

const readFactories = (file, content) => {
  const wywolania = [];
  const unrecognised = [];
  const pattern = new RegExp(`\\b(${FABRYKI.join('|')})\\b`, 'g');

  for (const m of content.matchAll(pattern)) {
    const przypisanie = PRZYPISANIE.test(content.slice(0, m.index));
    const zglos = () => {
      if (przypisanie)
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
        const koniec = match(content, k, '<', '>');
        if (koniec === -1) break;
        k = koniec + 1;
        continue;
      }
      break;
    }
    if (content[k] !== '(') {
      zglos();
      continue;
    }
    const koniec = match(content, k, '(', ')');
    if (koniec === -1) {
      zglos();
      continue;
    }

    // The first argument alone: `input('x', { alias: 'Name' })` carries an attribute name
    // in the second, not a string. The comma is counted outside any nesting.
    const cale = content.slice(k + 1, koniec);
    let g = 0;
    let przecinek = cale.length;
    for (let i = 0; i < cale.length; i++) {
      const c = cale[i];
      if ('([{'.includes(c)) g++;
      else if (')]}'.includes(c)) g--;
      else if (c === ',' && g === 0) {
        przecinek = i;
        break;
      }
    }

    wywolania.push({
      file,
      factory: m[1],
      line: content.slice(0, m.index).split('\n').length,
      // The declared type of the first parameter — `input<string>` means „arbitrary
      // text", that is, a place where a literal is prose by definition.
      textual: /^\s*<\s*string\s*[,>]/.test(
        content.slice(m.index + m[1].length),
      ),
      argument: cale.slice(0, przecinek),
    });
  }

  return { wywolania, unrecognised };
};

const INTERFACE_KEYS = /export interface PctTexts \{([\s\S]*?)^\}/m;
const DOMYSLNE = /export const PCT_DEFAULT_TEXTS[^=]*=\s*\{([\s\S]*?)^\};/m;
const POLE = /^\s*(?:readonly\s+)?([A-Za-z_$][\w$]*)\s*:/gm;
const DOMYSLNA_PARA =
  /^\s*([A-Za-z_$][\w$]*)\s*:\s*(['"])((?:[^'\\]|\\.)*)\2/gm;
/** `texts().key` — jedyna droga read po decyzji 0014. */
const ODCZYT = /\btexts\(\)\.([A-Za-z_$][\w$]*)/g;
/** `inject(PCT_TEXTS)` has to land under the name `texts` — else the read disappears. */
const WSTRZYKNIECIE = /(?:(\w+)\s*=\s*)?inject\(\s*PCT_TEXTS\s*\)/g;

const KONSOLA = /\bconsole\.(log|warn|error|info|debug)\s*\(/g;

// ── checks ──────────────────────────────────────────────────────────────────

/**
 * A violation — with the identifier of the point AND of the rule. The point alone is not
 * enough: point 3 carries four rules, point 5 six, and a negative control comparing only
 * the point would let through a case that fired on a neighbouring rule (`lesson-50`, the
 * conclusion of A12).
 */
class BladTekstu extends Error {
  constructor(check, rule, description) {
    super(description);
    this.check = check;
    this.rule = rule;
  }
}

const checkTexts = (we) => {
  const { classes, declarations, templates, pkg, sources } = we;

  // ── 1. MIANOWNIK ────────────────────────────────────────────────────────────
  if (!classes.length || !sources.length)
    throw new BladTekstu(
      'denominator',
      'empty-list',
      `no \`@Component\`/\`@Directive\` decorator found in the sources ` +
        `(${PROJEKT}; files: ${sources.length}) — every later point would then pass ` +
        `without pronouncing on anything (lesson-48).\n    Usual cause: the list of ` +
        `source files stopped returning anything.`,
    );

  if (classes.length !== declarations)
    throw new BladTekstu(
      'denominator',
      'decorator-parser',
      `the parser recognised ${classes.length} of ${declarations} decorators — the rest ` +
        `would drop out of the measurement without a trace, together with their \`host\` ` +
        `block. Usual cause: a decorator written otherwise than prettier formats it ` +
        `(\`@Component({\` and \`})\` in column zero).`,
    );

  const wInline = classes.filter((k) => k.inline);
  if (wInline.length)
    throw new BladTekstu(
      'denominator',
      'template-in-decorator',
      `${wInline.length} classes bierze template z decorator, a nie z pliku:\n` +
        list(wInline.map((k) => `${k.file}: ${k.className}`)) +
        `\n    This scanner reads \`.html\` files, so a string written into a decorator ` +
        `would be invisible to it — and travels to the browser all the same. Move the ` +
        `template out to ` +
        `\`templateUrl\`.`,
    );

  const uzywane = new Map();
  for (const k of classes)
    if (k.template)
      uzywane.set(k.template, [...(uzywane.get(k.template) ?? []), k]);

  const znane = new Set(templates.map((s) => s.file));
  const missing = [...uzywane.keys()].filter((s) => !znane.has(s));
  if (missing.length)
    throw new BladTekstu(
      'denominator',
      'template-without-file',
      `${missing.length} templates named by \`templateUrl\` are not on the gate's ` +
        `file list:\n` +
        list(missing) +
        `\n    Their texts will not enter the measurement. Usual cause: a file outside ` +
        `the git index, or a pathspec that stopped covering it.`,
    );

  const osierocone = templates.filter((s) => !uzywane.has(s.file));
  if (osierocone.length)
    throw new BladTekstu(
      'denominator',
      'template-without-owner',
      `${osierocone.length} templates belong to no decorator:\n` +
        list(osierocone.map((s) => s.file)) +
        `\n    A template nobody points at is an orphan to the measurement — and travels ` +
        `to the browser like every other one.`,
    );

  const scans = templates.map((s) => readTemplate(s.file, s.content));

  const zBledem = scans.filter((s) => s.errors.length);
  if (zBledem.length)
    throw new BladTekstu(
      'denominator',
      'template-parser',
      `Angular's parser rejected ${zBledem.length} templates:\n` +
        list(
          zBledem.map((s) => `${s.file}: ${s.errors[0].msg.split('\n')[0]}`),
        ) +
        `\n    A tree that does not exist has no text node either — point 3 would pass ` +
        `over it without objection.`,
    );

  const unknown = scans.filter((s) => s.scanner.unknown.size);
  if (unknown.length)
    throw new BladTekstu(
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
    throw new BladTekstu(
      'denominator',
      'empty-measurement',
      `${templates.length} templates, 0 visited nodes — the measurement never started.\n` +
        `    The non-emptiness check stands on the RESULT's side, not the input's: the ` +
        `file count is sometimes right while the read itself is empty (lesson-48, the ` +
        `same mistake as ` +
        `w A5 i A12).`,
    );

  // ── 2. ARTIFACT ─────────────────────────────────────────────────────────────
  //
  //    The source read reads a decorator's text, so it is blind to a `host` block
  //    composed by spreading somebody else's object (`...fitHost`). The package read
  //    reads `ɵdir.hostAttrs` and `ɵcmp.consts` after linking — the output of the REAL
  //    compiler. The same move as in A3 and A6.
  if (!pkg.length)
    throw new BladTekstu(
      'artifact',
      'empty-package',
      `the built package gave not one class with an Angular definition — the comparison ` +
        `would pass with nothing to compare.\n    Usual cause: a stale or empty ` +
        `\`${DIST}\` (the gate needs \`dependsOn: build\`).`,
    );

  const zeZrodel = new Map(classes.map((k) => [k.className, k]));
  const zPakietu = new Map(pkg.map((p) => [p.className, p]));

  const withoutPackage = [...zeZrodel.keys()].filter((k) => !zPakietu.has(k));
  if (withoutPackage.length)
    throw new BladTekstu(
      'artifact',
      'class-without-package',
      `${withoutPackage.length} classes from the sources are not in the built package:\n` +
        list(withoutPackage.map((k) => `${k} (${zeZrodel.get(k).file})`)) +
        `\n    The measurement would then count the strings of a component the consumer ` +
        `never gets — or, more often, would be reading a stale \`${DIST}\`.`,
    );

  const withoutSources = [...zPakietu.keys()].filter((k) => !zeZrodel.has(k));
  if (withoutSources.length)
    throw new BladTekstu(
      'artifact',
      'class-without-sources',
      `${withoutSources.length} classes from the package are invisible to the source scanner:\n` +
        list(withoutSources.map((k) => `${k} (${zPakietu.get(k).input})`)) +
        `\n    A class the scanner did not see brings strings into a release that this ` +
        `gate says nothing about.`,
    );

  // A template's owner has a precondition of ITS OWN, even though point 1 guarantees it.
  // Without that, disarming the `template-bez-wlasciciela` rule turned this loop into a
  // `TypeError` — the negative control lost the ability to examine the rule it was meant to
  // examine. The same defect as in A3, A4, A7, A8 and A12; „do not trust the previous
  // point" apparently has to be written out in every gate.
  const wlascicielem = (file) => uzywane.get(file)?.[0]?.className ?? file;

  const speakingInSources = new Set();
  for (const k of classes)
    for (const [name, value] of k.attributes)
      if (SPEAKING_ATTRIBUTES.has(name))
        speakingInSources.add(`${k.className} ${name}=${value}`);
  for (const s of scans)
    for (const a of s.scanner.attributes)
      if (SPEAKING_ATTRIBUTES.has(a.name))
        speakingInSources.add(`${wlascicielem(s.file)} ${a.name}=${a.value}`);

  const speakingInPackage = new Set();
  for (const p of pkg)
    for (const [name, value] of p.attributes)
      if (SPEAKING_ATTRIBUTES.has(name))
        speakingInPackage.add(`${p.className} ${name}=${value}`);

  const tylkoWPakiecie = [...speakingInPackage].filter(
    (w) => !speakingInSources.has(w),
  );
  if (tylkoWPakiecie.length)
    throw new BladTekstu(
      'artifact',
      'attribute-only-in-package',
      `${tylkoWPakiecie.length} speaking attributes are in the package and not in the ` +
        `source read:\n` +
        list(skroc(tylkoWPakiecie)) +
        `\n    This is what an attribute brought in by syntax the scanner cannot read ` +
        `looks like — an object spread in a \`host\` block, a mixin, inheritance. Point 3 ` +
        `would never look at it.`,
    );

  const tylkoWZrodlach = [...speakingInSources].filter(
    (w) => !speakingInPackage.has(w),
  );
  if (tylkoWZrodlach.length)
    throw new BladTekstu(
      'artifact',
      'attribute-only-in-sources',
      `${tylkoWZrodlach.length} speaking attributes are in the sources and not in the package:\n` +
        list(skroc(tylkoWZrodlach)) +
        `\n    Usual cause: a stale \`${DIST}\`. Point 3 would then be pronouncing on ` +
        `text the consumer never gets.`,
    );

  // ── 3. SZABLON ──────────────────────────────────────────────────────────────
  const textViolations = [];
  for (const s of scans)
    for (const t of s.scanner.texts)
      if (LITERA.test(t.value))
        textViolations.push(`${s.file}:${t.line}: ${JSON.stringify(t.value)}`);
  if (textViolations.length)
    throw new BladTekstu(
      'template',
      'literal-text',
      `${textViolations.length} text nodes carry a string written into the template:\n` +
        list(skroc(textViolations)) +
        `\n    A string the library prints itself goes through \`PCT_TEXTS\`: a field in ` +
        `\`PctTexts\`, a default in \`PCT_DEFAULT_TEXTS\`, a \`texts().key\` read ` +
        `in the template (req-api-texts). A character with no letter (\`*\`, \`×\`) is not ` +
        `text and does not fire here — there is nothing in it to translate.`,
    );

  const attributeViolations = [];
  for (const s of scans)
    for (const a of s.scanner.attributes)
      if (LITERA.test(a.value))
        attributeViolations.push(`${s.file}:${a.line}: ${a.name}="${a.value}"`);
  for (const k of classes)
    for (const [name, value] of k.attributes)
      if (SPEAKING_ATTRIBUTES.has(name) && LITERA.test(value))
        attributeViolations.push(`${k.file}: host \`${name}\` = "${value}"`);
  if (attributeViolations.length)
    throw new BladTekstu(
      'template',
      'speaking-attribute',
      `${attributeViolations.length} speaking attributes carry a string written inline:\n` +
        list(skroc(attributeViolations)) +
        `\n    The value of \`aria-label\`, \`title\` or \`placeholder\` is read by the ` +
        `user — that is text, not a keyword of a specification (like \`role="combobox"\`). ` +
        `It goes through ` +
        `\`PCT_TEXTS\`.`,
    );

  const expressionViolations = [];
  for (const s of scans)
    for (const w of s.scanner.expressions)
      if (LITERA.test(w.value))
        expressionViolations.push(
          `${s.file}:${w.line}: ${w.gdzie} → ${JSON.stringify(w.value)}`,
        );
  for (const k of classes)
    for (const [name, value] of k.literaly)
      if (LITERA.test(value))
        expressionViolations.push(
          `${k.file}: host \`${name}\` → ${JSON.stringify(value)}`,
        );
  if (expressionViolations.length)
    throw new BladTekstu(
      'template',
      'literal-in-expression',
      `${expressionViolations.length} string literals reach the DOM from an expression:\n` +
        list(skroc(expressionViolations)) +
        `\n    \`{{ open() ? 'Close' : 'Open' }}\` bypasses the channel exactly like a ` +
        `string written into a node's text — only it looks like code. A pipe's argument ` +
        `does not count: that is a format marker, not text.`,
    );

  const withIcu = scans.filter((s) => s.scanner.icu);
  if (withIcu.length)
    throw new BladTekstu(
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
  const factories = we.factories.wywolania;
  if (!factories.length || we.factories.unrecognised.length)
    throw new BladTekstu(
      'typescript',
      'empty-measurement',
      `the scanner recognised ${factories.length} signal factory calls and left ` +
        `${we.factories.unrecognised.length} assignments unresolved:\n` +
        list(skroc(we.factories.unrecognised)) +
        `\n    An input the scanner did not resolve to a call brings a default value this ` +
        `point says nothing about. The counter counts ASSIGNMENTS, not calls: the scanner ` +
        `finds more calls (a factory in a function body, in an argument), so comparing the ` +
        `sums would pass even with one assignment gone.`,
    );

  const proza = factories.flatMap((f) =>
    [...f.argument.matchAll(LITERAL_W_WYRAZENIU)]
      .map((m) => m[1] ?? m[2])
      .filter(isProse)
      .map(
        (v) => `${f.file}:${f.line}: ${f.factory}(…) → ${JSON.stringify(v)}`,
      ),
  );
  if (proza.length)
    throw new BladTekstu(
      'typescript',
      'prose-in-factory',
      `${proza.length} signal defaults are prose:\n` +
        list(skroc(proza)) +
        `\n    A library string goes through \`PCT_TEXTS\`. An axis value (\`md\`, ` +
        `\`solid\`, \`inset\`) is not prose and does not fire here — shape tells them ` +
        `apart: a capital at the start or a space in the middle.`,
    );

  const tekstDomyslny = factories
    .filter(
      (f) =>
        f.textual &&
        [...f.argument.matchAll(LITERAL_W_WYRAZENIU)].some(
          (m) => (m[1] ?? m[2]) !== '',
        ),
    )
    .map((f) => `${f.file}:${f.line}: ${f.factory}<string>(${f.argument})`);
  if (tekstDomyslny.length)
    throw new BladTekstu(
      'typescript',
      'text-as-default',
      `${tekstDomyslny.length} inputs declared as \`<string>\` carry a literal as their ` +
        `default:\n` +
        list(skroc(tekstDomyslny)) +
        `\n    \`<string>\` means „arbitrary text", so a literal in that place is a ` +
        `library string whatever it looks like. An empty one (\`''\`) means „no value" ` +
        `and is allowed.`,
    );

  const przyKonstrukcji = factories
    .filter(
      (f) => f.factory !== 'computed' && /\btexts\s*\(\s*\)/.test(f.argument),
    )
    .map((f) => `${f.file}:${f.line}: ${f.factory}(…${f.argument.trim()}…)`);
  if (przyKonstrukcji.length)
    throw new BladTekstu(
      'typescript',
      'text-at-construction',
      `${przyKonstrukcji.length} defaults read \`PCT_TEXTS\` at CONSTRUCTION:\n` +
        list(skroc(przyKonstrukcji)) +
        `\n    An input's default is created once, so an application switching language ` +
        `without a reload keeps the string from before the change — exactly the defect ` +
        `decision 0014 closed. Read through \`computed()\`, that is, at render time.`,
    );

  // ── 5. CHANNEL ────────────────────────────────────────────────────────────────
  const { keys, defaults, reads, wstrzykniecia } = we.channel;

  if (!keys.length)
    throw new BladTekstu(
      'channel',
      'empty-measurement',
      `no field found in \`export interface PctTexts\` — the whole of point 5 would then ` +
        `pass with nothing to compare.\n    Usual cause: the interface moved to another ` +
        `file, or written differently.`,
    );

  const zleWstrzykniecia = wstrzykniecia
    .filter((w) => w.name !== 'texts')
    .map((w) => `${w.file}:${w.line}: ${w.name ?? '(bez przypisania)'}`);
  if (zleWstrzykniecia.length)
    throw new BladTekstu(
      'channel',
      'inject-under-another-name',
      `${zleWstrzykniecia.length} \`PCT_TEXTS\` injections land under a name other than ` +
        `\`texts\`:\n` +
        list(zleWstrzykniecia) +
        `\n    Reads are counted by the \`texts().key\` pattern, so another name makes ` +
        `them invisible — and then the „a key has to be used" rule pronounces on keys it ` +
        `simply cannot see.`,
    );

  const withoutDefault = keys.filter((k) => !(k in defaults));
  if (withoutDefault.length)
    throw new BladTekstu(
      'channel',
      'key-without-default',
      `${withoutDefault.length} \`PctTexts\` fields have no default value:\n` +
        list(withoutDefault) +
        `\n    Overriding is partial (decision 0007), so a field with no default reaches ` +
        `the DOM as \`undefined\` for everybody who did not translate it.`,
    );

  const withoutKey = Object.keys(defaults).filter((k) => !keys.includes(k));
  if (withoutKey.length)
    throw new BladTekstu(
      'channel',
      'default-without-key',
      `${withoutKey.length} default values have no field in \`PctTexts\`:\n` +
        list(withoutKey) +
        `\n    A string missing from the type is a string the consumer has no way of ` +
        `overriding — \`providePctTexts\` takes \`Partial<PctTexts>\`.`,
    );

  const puste = keys.filter((k) => k in defaults && defaults[k].trim() === '');
  if (puste.length)
    throw new BladTekstu(
      'channel',
      'empty-default',
      `${puste.length} default values are empty:\n` +
        list(puste) +
        `\n    An empty default turns „the library prints this itself" into „the library ` +
        `prints nothing" for everybody who did not translate that field.`,
    );

  const uzyte = new Set(reads.map((o) => o.key));
  const dead = keys.filter((k) => !uzyte.has(k));
  if (dead.length)
    throw new BladTekstu(
      'channel',
      'dead-key',
      `${dead.length} \`PctTexts\` fields are read by no component:\n` +
        list(dead) +
        `\n    That is coverage which does not exist: the field stands in a public type, ` +
        `the consumer translates it, and it appears nowhere. The same move as removing the ` +
        `dead \`--pct-on-danger\` in A12 — the field comes back with a component that ` +
        `prints it.`,
    );

  const donikad = reads
    .filter((o) => !keys.includes(o.key))
    .map((o) => `${o.file}: texts().${o.key}`);
  if (donikad.length)
    throw new BladTekstu(
      'channel',
      'read-to-nowhere',
      `${donikad.length} reads name a field that is not in \`PctTexts\`:\n` +
        list(skroc(donikad)) +
        `\n    In a template such a read is no compilation error — it is an empty space ` +
        `na ekranie.`,
    );

  // ── 6. WARNINGS ──────────────────────────────────────────────────────────
  const zKanalu = we.warnings
    .filter((o) => /\btexts\s*\(\s*\)/.test(o.argument))
    .map((o) => `${o.file}:${o.line}`);
  if (zKanalu.length)
    throw new BladTekstu(
      'warnings',
      'warning-from-the-channel',
      `${zKanalu.length} developer warnings draw on \`PCT_TEXTS\`:\n` +
        list(zKanalu) +
        `\n    A warning is read by a developer, not a user — translating it helps nobody ` +
        `and takes up room in a type the consumer has to fill in (decision 0007).`,
    );

  const withoutDevMode = we.warnings
    .filter((o) => !o.strzezone)
    .map((o) => `${o.file}:${o.line}: console.${o.method}(…)`);
  if (withoutDevMode.length)
    throw new BladTekstu(
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
      `${we.warnings.length} developer warnings`,
  };
};

// ── input from disk ───────────────────────────────────────────────────────────

const read = (root, path) => readFileSync(join(root, path), 'utf8');

const isSource = (p) =>
  p.startsWith(`${PROJEKT}/`) && p.endsWith('.ts') && !p.endsWith('.spec.ts');
const isTemplate = (p) => p.startsWith(`${PROJEKT}/`) && p.endsWith('.html');

/**
 * Static attributes from Angular's flat array (`consts`, `hostAttrs`). A number opens a
 * section with a different meaning (classes, styles, bindings), so we read only the prefix
 * before the first number — beyond it stand names without values. The same parser as in
 * `check-parts`.
 */
const parujAtrybuty = (attrs) => {
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
    throw new BladTekstu(
      'artifact',
      'empty-package',
      `no built package in ${DIST} — this gate reads the artifact, not the sources ` +
        `alone.\n    The target needs a \`dependsOn\` on the library's build.`,
    );

  await import('@angular/compiler');
  const exports = JSON.parse(read(root, `${DIST}/package.json`)).exports ?? {};
  const out = [];

  for (const [input, cel] of Object.entries(exports)) {
    const file = typeof cel === 'object' ? cel.default : cel;
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
          ...consts.filter(Array.isArray).flatMap(parujAtrybuty),
          ...parujAtrybuty(def.hostAttrs ?? []),
        ],
      });
    }
  }
  return out;
};

/**
 * The developer warnings of one file. An `isDevMode()` guard is accepted in two places: in
 * the same function the `console.*` stands in, or at every call of it. The second form is
 * better in a library — it does not enter a function there is no point running — so the
 * gate must not penalise it.
 */
const readWarnings = (file, content) => {
  const out = [];
  for (const m of content.matchAll(KONSOLA)) {
    const otw = m.index + m[0].length - 1;
    const zam = match(content, otw, '(', ')');
    const argument = zam === -1 ? '' : content.slice(otw + 1, zam);
    const przed = content.slice(0, m.index);
    const line = przed.split('\n').length;

    // The enclosing function: the last method declaration before the call.
    const methods = [
      ...przed.matchAll(
        /^ {2}(?:private |protected )?([A-Za-z_$][\w$]*)\s*\(/gm,
      ),
    ];
    const method = methods.at(-1)?.[1] ?? null;
    const bodyFrom = methods.at(-1)?.index ?? 0;

    const wFunkcji = /\bisDevMode\s*\(\s*\)/.test(
      content.slice(bodyFrom, m.index),
    );
    const wywolania = method
      ? [...content.matchAll(new RegExp(`\\bthis\\.${method}\\s*\\(`, 'g'))]
      : [];
    const przyWywolaniach =
      wywolania.length > 0 &&
      wywolania.every((w) =>
        /\bisDevMode\s*\(\s*\)/.test(
          content.slice(content.lastIndexOf('\n', w.index) + 1, w.index),
        ),
      );

    out.push({
      file,
      line,
      method,
      callMethod: wywolania.length,
      argument,
      strzezone: wFunkcji || przyWywolaniach,
    });
  }
  return out;
};

/** An input built from a file list — the same shape for the repo and for a fixture. */
const gatherInput = async (root, files, pakietZDysku) => {
  const sources = files.filter(isSource);
  const tresci = new Map(sources.map((p) => [p, read(root, p)]));

  const factories = { wywolania: [], unrecognised: [] };
  const reads = [];
  const wstrzykniecia = [];
  const warnings = [];
  let keys = [];
  const defaults = {};

  for (const [file, content] of tresci) {
    const f = readFactories(file, content);
    factories.wywolania.push(...f.wywolania);
    factories.unrecognised.push(...f.unrecognised);
    warnings.push(...readWarnings(file, content));

    for (const m of content.matchAll(ODCZYT)) reads.push({ file, key: m[1] });
    for (const m of content.matchAll(WSTRZYKNIECIE))
      wstrzykniecia.push({
        file,
        line: content.slice(0, m.index).split('\n').length,
        name: m[1] ?? null,
      });

    const iface = INTERFACE_KEYS.exec(content);
    if (iface) keys = [...iface[1].matchAll(POLE)].map((m) => m[1]);
    const dom = DOMYSLNE.exec(content);
    if (dom)
      for (const m of dom[1].matchAll(DOMYSLNA_PARA)) defaults[m[1]] = m[3];
  }

  const templates = files
    .filter(isTemplate)
    .map((file) => ({ file, content: read(root, file) }));
  for (const { file, content } of templates)
    for (const m of content.matchAll(ODCZYT)) reads.push({ file, key: m[1] });

  return {
    ...readSources(root, sources),
    sources,
    templates,
    factories,
    channel: { keys, defaults, reads, wstrzykniecia },
    warnings,
    pkg: pakietZDysku ?? (await packageComponents(root)),
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
  execFileSync('git', ['ls-files', '-z', PROJEKT], {
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
  const cel = mkdtempSync(join(tmpdir(), 'pct-check-texts-'));
  cpSync(join(FIXTURES, REFERENCE), cel, { recursive: true });
  if (name !== REFERENCE)
    cpSync(join(FIXTURES, name), cel, {
      recursive: true,
      filter: (src) => basename(src) !== 'fixture.json',
    });
  for (const path of fx.drop ?? [])
    rmSync(join(cel, path), { recursive: true, force: true });
  for (const file of globSync('**/*.ts.txt', { cwd: cel }))
    renameSync(join(cel, file), join(cel, file.replace(/\.txt$/, '')));
  return cel;
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
  if (!(error instanceof BladTekstu)) throw error;
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
// because of it rather than its own defect, and every „rejected" would be false — this
// control would become the very thing it stands against.
{
  const directory = buildFixture(REFERENCE, {});
  try {
    checkTexts(await fixtureInput(directory));
  } catch (error) {
    if (!(error instanceof BladTekstu)) throw error;
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
    if (!(error instanceof BladTekstu)) throw error;
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
