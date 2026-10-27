#!/usr/bin/env node
/**
 * Texts channel gate: `req-api-texts` — a string the library prints ITSELF goes through the
 * `PCT_TEXTS` token, not into a template or an input's default. A literal added to a template
 * compiles, passes the tests and looks right in every screenshot; it breaks at a consumer.
 *
 *  1. DENOMINATOR: every decorator parsed, every template owned, every node reached and known,
 *  2. ARTIFACT: the classes and static attributes from the sources match the BUILT package,
 *  3. TEMPLATE: no text node and no SPEAKING attribute carries a literal with a letter,
 *  4. TYPESCRIPT: a signal's default is not prose and does not read `PCT_TEXTS`,
 *  5. CHANNEL: the `PctTexts` keys, their defaults and their reads are one set,
 *  6. WARNINGS: `console.*` draws nothing from `PCT_TEXTS` and is quiet outside `isDevMode()`.
 *
 * The template is read by `parseTemplate` from `@angular/compiler` and walked by the compiler's
 * own visitor, every method of which counts what it is handed; point 1 holds the count to the
 * tree, found over every node's fields, so that the walk cannot lose syntax quietly.
 *
 * Usage: node tools/check-texts.mjs
 */
import {
  BindingType,
  JitEvaluator,
  outputAst,
  parseTemplate,
  R3Identifiers,
  RecursiveAstVisitor,
  splitNsName,
  TmplAstDeferredTrigger,
  TmplAstRecursiveVisitor,
  visitAll,
} from '@angular/compiler';
import * as compiler from '@angular/compiler';
import * as core from '@angular/core';
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

import { classesOf, classKey, standsFor } from './class-bases.mjs';
import { decoratorsOf, hostOf, textOf } from './decorators.mjs';
import { runnerControl } from './runner-control.mjs';
import { staticAttributes } from './static-attributes.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PROJECT = 'libs/components';
const DIST = 'dist/libs/components';
const FIXTURES = join(ROOT, 'tools/check-texts.fixtures');
const REFERENCE = '_reference';
const RUNNER = '_runner.json';

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

/**
 * Whether an attribute speaks, by its name in any case. The compiler hands a name on as it is
 * written — `TITLE` in the template's tree, in `ɵcmp.consts` and in `ɵdir.hostAttrs` alike — and
 * the DOM lowercases it: `setAttribute('TITLE', …)` on an HTML element writes `title`, so the
 * user reads the string (measured through ngc 22.2.1 in partial mode, the linker and a render in
 * jsdom). An exact lookup let `TITLE="Collapse the list"` through points 2 and 3. The formatter
 * is no fence: it lowercases a written name only where its table of HTML knows that attribute on
 * that element (`<button TITLE>`), and keeps `ARIA-LABEL`, any name on a `pct-*` tag or in SVG,
 * an `attr.` binding and a `host` block's key as they are written (prettier 3.9.9).
 *
 * Only the TEST takes the name in any case. What point 2 compares keeps the name as written,
 * because both of its reads carry it so, and the inheritance merge compares names exactly, as
 * Angular's `mergeHostAttribute` does. A property binding under such a name (`[TITLE]`) is
 * refused by the compiler (`NG8002`) in a template and in a `host` block alike. On an SVG or
 * MathML element the DOM keeps the case and `TITLE` is no `title`; it is read as speaking here
 * all the same, because `consts` do not say which namespace an element draws in, and a string
 * written there was written for the user. `toLowerCase` is louder than the DOM's ASCII lowercase
 * in one spelling as well: the Kelvin sign (U+212A) folds to the `k` of `aria-keyshortcuts`.
 *
 * A name that is not a string speaks nothing: a loading block with `after` and no `minimum` puts
 * `[null, 100]` into `consts`, which the package read takes for a pair, and the exact lookup
 * passed over it where `toLowerCase` throws.
 */
const speaks = (name) =>
  typeof name === 'string' && SPEAKING_ATTRIBUTES.has(name.toLowerCase());

/**
 * The attribute a PROPERTY binding writes: the engines reflect the ARIA attributes with a string
 * value as camel-case properties, so `[ariaLabel]` sets the element's `aria-label` — as
 * `check-aria` reads it (`nameOf`). An id reference is an `…Elements` array instead, so
 * `[ariaLabelledby]` reaches nothing, and reading it as `aria-labelledby` only refuses more; no
 * speaking attribute is one. Another property is its attribute by name (`[title]`). An `attr.`
 * binding goes through `setAttribute`, which makes `ariaLabel` the attribute `arialabel`, no ARIA,
 * and keeps its name.
 */
const reflected = (name) => name.replace(/^aria(?!-)/, 'aria-');

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
/**
 * A function key's name, which the platform spells with a capital and no language translates.
 *
 * The one class the shape below cannot tell from prose, and it is named RATHER THAN excused by
 * a rule about length or case: `F6` is a `KeyboardEvent.key` value — `[pctRegionKey]`'s default
 * (0072) — and there is no language in which a translator would touch it. The pattern is the
 * platform's own list and nothing wider: `Enter`, `Home` and `Delete` are key names too, and
 * they are also English words a component could put on a button, so they stay visible here.
 */
const FUNCTION_KEY = /^F([1-9]|1\d|2[0-4])$/;

const isProse = (v) =>
  !FUNCTION_KEY.test(v) &&
  LETTER.test(v) &&
  (/^\p{Lu}/u.test(v) || /\s/.test(v));

const list = (entries) => entries.map((w) => `      ${w}`).join('\n');

const shorten = (entries, countOf = 8) =>
  entries.length <= countOf
    ? entries
    : [...entries.slice(0, countOf), `… and ${entries.length - countOf} more`];

// ── source scanners ────────────────────────────────────────────────────────────

/**
 * The same anchor as in `check-parts` and for the same reason: the formatting
 * enforced by `nx format:check` puts `@Component({` and `})` in column zero. The counter
 * does NOT repeat that anchor — a repeated one would put out both sides of the comparison
 * at once (`lesson-48`). The counter is the parser's (`decoratorsOf`, `decorators.mjs`), and so
 * is the metadata the template is read off: a pattern counted decorators from the start of a line
 * and read `template:` and `templateUrl:` off the text, and a shorthand, a quoted key, an escaped
 * name, a decorator behind a comment on its line and one imported under another name each handed
 * ngc a template, its text with it, that this scanner never opened (measured).
 */
const DECORATOR =
  /^@(Component|Directive)\(\{\r?\n([\s\S]*?)^\}\)\r?\n(?:export\s+)?(?:abstract\s+)?class\s+([A-Za-z_$][\w$]*)([^{]*)\{/dgm;

/** A string literal in an expression (a binding in a `host` block is a string). */
const LITERAL_IN_EXPRESSION = /'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"/g;

/**
 * The string literals of an expression, with comments stepped over — the same job as
 * `LITERAL_IN_EXPRESSION` where the expression can be several lines long and carry prose.
 *
 * A regular expression cannot do this, and the difference is not academic. A factory's
 * argument in this library is often a whole `computed()` body, a body carries comments,
 * comments are English, and English carries apostrophes — which is the quote character of
 * every second literal here. One `reader's` in a comment leaves the count of `'` odd, and the
 * next quote in the CODE closes a literal that began in the prose: the value handed to
 * `isProse` is then the source text between the two, which reads as prose because half of it
 * is. The gate fires, and it names a file that did nothing wrong
 * ([`lesson-132`](../docs/lessons.md#lesson-132)).
 *
 * Template literals are stepped over rather than reported: a backtick default is not a plain
 * literal and was never reported before, and their contents carry the same apostrophes.
 */
const literalsIn = (expression) => {
  const found = [];
  for (let i = 0; i < expression.length; i++) {
    const c = expression[i];
    if (c === '/' && expression[i + 1] === '/') {
      const end = expression.indexOf('\n', i);
      i = end === -1 ? expression.length : end;
      continue;
    }
    if (c === '/' && expression[i + 1] === '*') {
      const end = expression.indexOf('*/', i + 2);
      i = end === -1 ? expression.length : end + 1;
      continue;
    }
    if (c !== "'" && c !== '"' && c !== '`') continue;

    let value = '';
    let j = i + 1;
    for (; j < expression.length && expression[j] !== c; j++) {
      if (expression[j] === '\\') {
        value += expression[j + 1] ?? '';
        j++;
        continue;
      }
      value += expression[j];
    }
    // An unterminated quote outside a comment is an apostrophe in code this scanner cannot
    // explain. Stepping over it is right; taking the rest of the argument for its value is
    // the very thing this function exists to stop doing.
    if (j < expression.length && c !== '`') found.push(value);
    i = j;
  }
  return found;
};

/**
 * The attribute name from a `host` block key: `[attr.aria-label]` → `aria-label`, and the property
 * `[ariaLabel]` → `aria-label` (`reflected`).
 */
const nameFromKey = (key) => {
  const bound = /^\[(attr\.)?([^\]]+)\]$/.exec(key);
  if (!bound) return { name: key, bound: false };
  return { name: bound[1] ? bound[2] : reflected(bound[2]), bound: true };
};

/**
 * Decorated classes. `attributes` are the `host` block's static attributes (name/value
 * pairs), `literals` the string literals from the expressions of speaking-attribute
 * bindings. Beside them, what point 1 holds the read to: the decorators the pattern read where
 * the parser holds no class (`unheld`) or no metadata (`unparsed`), the ones it counted and the
 * pattern did not read (`unseen`), and the files taking a decorator under another name
 * (`renamed`).
 *
 * The `host` block is read as ngc composes it (`hostOf`), a constant of the file's own followed
 * by name or in a spread (`...fitHost` in `field/src/affix.ts`). Any other composition is
 * refused at point 1 (`composed`). Left to the package read, an attribute it brings fired point 2
 * as one the sources lack: a refusal, for a cause that is not the one.
 */
const readSources = (root, files) => {
  const classes = [];
  const unheld = [];
  const unparsed = [];
  const renamed = [];
  const unseen = [];
  let declarations = 0;
  const contents = new Map(
    files.map((file) => [file, readFileSync(join(root, file), 'utf8')]),
  );
  const bases = classesOf(contents);

  for (const [file, content] of contents) {
    const decorators = decoratorsOf(file, content);
    declarations += decorators.declared;
    for (const name of decorators.renamed) renamed.push(`${file}: ${name}`);

    for (const match of content.matchAll(DECORATOR)) {
      const [, kind, , className] = match;
      const id = classKey(file, className);
      // The class of that name at the top level of the file, and only where its name stands
      // where the pattern read it: one in a comment beside it is not that class.
      const held = bases.get(id);
      if (held?.at !== match.indices[3][0]) {
        unheld.push(`${file}: ${className}`);
        continue;
      }
      // And the decorator the parser holds where the pattern read its `@`, called with an object
      // literal: one in a comment above a class decorated otherwise is not that class's.
      const metadata = decorators.read(match.index);
      if (!metadata) {
        unparsed.push(`${file}: ${className}`);
        continue;
      }
      const url = metadata.get('templateUrl');
      const path = textOf(url);
      const template = metadata.get('template');
      const host = hostOf(metadata.get('host'));
      const attributes = [];
      const literals = [];

      for (const [key, value] of host?.entries ?? []) {
        const { name, bound } = nameFromKey(key);
        if (!bound) {
          attributes.push([name, value]);
          continue;
        }
        if (!speaks(name)) continue;
        for (const l of value.matchAll(LITERAL_IN_EXPRESSION))
          literals.push([name, l[1] ?? l[2]]);
      }

      classes.push({
        file,
        className,
        key: id,
        kind,
        // `class X extends Y` — and what Y declares is X's too. Angular merges a decorated base's
        // host bindings into the subclass's definition, so the package read finds them ON THE
        // SUBCLASS while the source read finds them one file away. An unexported base is not a
        // class of the package at all: its strings travel inside whatever extends it
        // ([0034](../docs/decisions/0034-multiplicity-is-a-tag.md),
        // [`lesson-100`](../docs/lessons.md#lesson-100)). `base` is Y as written and `from` the
        // class TypeScript binds it to (`class-bases.mjs`), or `undefined` for none this follows,
        // `via` the module the file imports Y from.
        base: held.base ?? null,
        from: held.from,
        via: held.via,
        template:
          path !== undefined
            ? relative(root, resolve(join(root, dirname(file)), path))
                .split('\\')
                .join('/')
            : null,
        // A path the scanner does not read as written: ngc evaluates the expression, a
        // constant or a concatenation, and compiles a file the source read never opens.
        unnamed: url !== undefined && path === undefined,
        // An empty template (`template: ''` in `number.ts` and `text.ts`) has nothing to
        // print a string with. Any other template the decorator hands the compiler is a hole,
        // a constant it names among them: this scanner reads `.html` files, so text from a
        // decorator would be invisible to it and travels to the browser all the same.
        inline: template !== undefined && textOf(template) !== '',
        // A block given otherwise than by an object literal of the file, which ngc evaluates.
        composed: host === null,
        attributes,
        literals,
      });
    }
    unseen.push(...decorators.unseen());
  }

  return { classes, declarations, unheld, unparsed, renamed, unseen };
};

/**
 * The node kinds this walk understands, and what each carries. The list exists so that the day
 * the parser makes a kind it does not hold is the day this gate SAYS so — rather than the day it
 * quietly stops measuring that node's contents. Every method of the compiler's visitor counts the
 * node it is handed, whichever of them `TemplateScanner` writes (`seen`), so a kind is checked
 * wherever it stands; and the reference holds a node of each but an ICU, which a case holds
 * (`icu-in-template`), so that a kind taken off the list refuses one of the two.
 *
 * Left out, measured on Angular 22.2.1: `ContentBlock` (`@content`), a foreign component's slot,
 * which the parser makes and `ngc` refuses outside one (`NG8026`) — the library has none, and what
 * one draws of the block is its render function's, which no reading here follows; `Component` and
 * `Directive`, which the parser makes under the selectorless syntax alone, off in `ngc` and in
 * `parseTemplate` alike; and `UnknownBlock`, which comes with a parse error every time, so that
 * point 1 refuses its template before any walk.
 */
const KNOWN_NODES = new Set([
  // What the walk reads: a text, a speaking attribute's value, a binding's literals.
  'Text',
  'BoundText',
  'TextAttribute',
  'BoundAttribute',
  // What holds the rest: the walk enters each, an `@boundary` and its `@error` blocks among
  // them (measured: the text in both is read), and none draws a string of its own — what a
  // condition or a collection hands a name is the hole the `@let` below stands for.
  'Element',
  'Template',
  'Content',
  'IfBlock',
  'IfBlockBranch',
  'ForLoopBlock',
  'ForLoopBlockEmpty',
  'SwitchBlock',
  'SwitchBlockCaseGroup',
  'DeferredBlock',
  'DeferredBlockPlaceholder',
  'DeferredBlockLoading',
  'DeferredBlockError',
  'BoundaryBlock',
  'BoundaryErrorBlock',
  // What draws nothing: a listener, a name, a condition — a `@case`'s, the `never` of an
  // exhaustive `@switch`, which takes no body, and a `@defer` block's trigger (`kindOf`).
  'BoundEvent',
  'Reference',
  'Variable',
  'SwitchBlockCase',
  'SwitchExhaustiveCheck',
  'DeferredTrigger',
  // A `@let`, whose value is not read, nor is any expression no point reads that hands a name
  // its value — a block's condition, a loop's collection, a template's input, an outlet's
  // context: a literal there is drawn wherever the name is printed (`@let m = 'Delete'`,
  // `@if ('Delete'; as m)`), and the walk follows no name. The library's blocks hold literals in
  // comparisons alone.
  'LetDeclaration',
  // Refused whole by point 3 (`visitIcu`).
  'Icu',
]);

/**
 * A node's kind, by its class's name. A `@defer` block's trigger is one kind whatever it waits for
 * (`on idle`, `on hover(…)`, `when …` — eight classes in 22.2.1): a condition, which no class of
 * them draws.
 */
const kindOf = (node) =>
  node instanceof TmplAstDeferredTrigger
    ? 'DeferredTrigger'
    : node.constructor.name;

/**
 * Every node of a template's tree, found over the fields of each object it holds rather than by
 * the walk, with the field of the nearest node holding it (`ContentBlock.variables`): an object of
 * a class `@angular/compiler` exports under a `TmplAst` name is a node. It is the walk's
 * denominator. What the compiler's visitor does not hand on, no method of the walk is handed, and
 * the count could not show it: measured on 22.2.1, an `<ng-content>`'s attributes, an inline
 * template's own bindings, the `never` of an exhaustive `@switch`, the variables of a `@content`
 * block and what an ICU holds — and the unknown blocks of an `@switch`, each with a parse error.
 */
const TEMPLATE_NODES = Object.entries(compiler)
  .filter(
    ([name, value]) =>
      name.startsWith('TmplAst') && value !== TmplAstRecursiveVisitor,
  )
  .map(([, value]) => value);
const nodesOf = (
  value,
  holder = 'the template',
  found = new Map(),
  passed = new WeakSet(),
) => {
  if (value === null || typeof value !== 'object' || passed.has(value))
    return found;
  passed.add(value);
  const node = TEMPLATE_NODES.some((kind) => value instanceof kind);
  if (node) found.set(value, holder);
  for (const [field, held] of Object.entries(value))
    nodesOf(held, node ? `${kindOf(value)}.${field}` : holder, found, passed);
  return found;
};

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
 * counts the nodes it reaches along the way (`seen`) — point 1 compares that count against zero,
 * because a pass that visited nothing pronounces on everything (`lesson-48`), and holds every node
 * of the tree to having been reached (`nodesOf`).
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
    this.reached = new Set();
    this.unknown = new Set();
    this.tag = null;
    this.type = null;
  }

  /** A node the walk reaches: from each method of the compiler's visitor, and from `passOver`. */
  seen(node) {
    this.nodesSeen++;
    this.reached.add(node);
    const kind = kindOf(node);
    if (!KNOWN_NODES.has(kind)) this.unknown.add(kind);
  }

  /**
   * What the walk reaches and reads nothing of, which the compiler's visitor does not hand on
   * (measured on Angular 22.2.1, through JIT and a render in jsdom): an `<ng-content>`'s
   * attributes, keys an outer `select` matches, of which nothing is drawn or put into `consts`;
   * an inline template's own bindings (`*ngFor="let item of items()"`), inputs of a directive on
   * the template, which draws a comment, and hands its names what they print (`KNOWN_NODES`); the
   * `never` of an exhaustive `@switch`, which takes no body; and what an ICU holds, which point 3
   * refuses whole.
   */
  passOver(nodes) {
    for (const node of nodes) this.seen(node);
  }

  visitText(node) {
    if (node.value.trim() !== '')
      this.texts.push({ value: node.value.trim(), line: line(node) });
  }

  visitBoundText(node) {
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

  /**
   * The tag and its `type` in any case, as the names in `speaking`: `<INPUT TYPE="submit"
   * VALUE="Send">` draws a button labelled "Send" (measured, the same render as `speaks`). The
   * tag in any namespace the template writes, which the parser keeps on the name: `ngc` makes
   * an `<input>` of `<X1:input>` (the schema takes off every prefix but `svg` and `math`).
   */
  visitElement(node) {
    const previous = [this.tag, this.type];
    this.tag = splitNsName(node.name)[1].toLowerCase();
    this.type =
      node.attributes
        .find((a) => a.name.toLowerCase() === 'type')
        ?.value?.toLowerCase() ?? null;
    super.visitElement(node);
    [this.tag, this.type] = previous;
  }

  speaking(name) {
    return (
      speaks(name) ||
      (name.toLowerCase() === 'value' &&
        this.tag === 'input' &&
        BUTTONS.has(this.type))
    );
  }

  visitTextAttribute(node) {
    if (this.speaking(node.name))
      this.attributes.push({
        name: node.name,
        value: node.value,
        line: line(node),
      });
  }

  visitBoundAttribute(node) {
    // A two-way binding holds no literal to read, so a property is the one-way kind.
    const property = node.type === BindingType.Property;
    if (!this.speaking(property ? reflected(node.name) : node.name)) return;
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
    this.icu++;
    this.passOver([
      ...Object.values(node.vars),
      ...Object.values(node.placeholders),
    ]);
  }

  visitContent(node) {
    this.passOver(node.attributes);
    super.visitContent(node);
  }
  visitTemplate(node) {
    this.passOver(node.templateAttrs);
    super.visitTemplate(node);
  }
  visitSwitchBlock(node) {
    if (node.exhaustiveCheck) this.passOver([node.exhaustiveCheck]);
    super.visitSwitchBlock(node);
  }
}

/**
 * `seen` around every method of the compiler's visitor, not only the ones written above: a node
 * passed on by a method the walk does not write was counted by none, and its kind never checked
 * — an `@boundary` and its `@error` blocks, the groups of an `@switch`, a `@defer` block's
 * triggers (measured on 22.2.1: eight methods of thirty-one). A method the next Angular adds is
 * wrapped the day it is there.
 */
for (const name of Object.getOwnPropertyNames(
  TmplAstRecursiveVisitor.prototype,
))
  if (name.startsWith('visit')) {
    const visit = TemplateScanner.prototype[name];
    TemplateScanner.prototype[name] = function (node) {
      this.seen(node);
      return visit.call(this, node);
    };
  }

const line = (node) => node?.sourceSpan?.start?.line + 1 || '?';

/**
 * `preserveWhitespaces: false` — that is how a template really compiles, so that is the set
 * of nodes reaching the browser. Under `true` every indent would be a text node of its own
 * and point 3 would be pronouncing on whitespace. Beside the scan, each node of the tree the walk
 * never reached (`nodesOf`), by its kind and the field holding it.
 */
const readTemplate = (file, content) => {
  const result = parseTemplate(content, file, { preserveWhitespaces: false });
  const scanner = new TemplateScanner(file);
  const unreached = [];
  if (!result.errors?.length) {
    visitAll(scanner, result.nodes);
    for (const [node, holder] of nodesOf(result.nodes))
      if (!scanner.reached.has(node))
        unreached.push(`${kindOf(node)} in \`${holder}\`, line ${line(node)}`);
  }
  return { file, errors: result.errors ?? [], scanner, unreached };
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
    // The `>` of an arrow closes no angle bracket. `computed<(o: T) => U>(…)` would otherwise
    // end at the arrow, and the `(` the scanner then looks for is three tokens away — so a
    // factory written with a function type would be reported as one it cannot read. Louder
    // than a silent miss, and still not the truth: the call is there and is legal TypeScript.
    if (closing === '>' && text[k] === '>' && text[k - 1] === '=') continue;
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
  const {
    classes,
    declarations,
    unheld,
    unparsed,
    renamed,
    unseen,
    templates,
    pkg,
    sources,
  } = input;

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

  // A decorator the pattern reads where the TypeScript parser holds no class at the top level of
  // the file — one in a comment, or one inside a namespace or a function, written in column zero
  // — is no class `extends` can be resolved for, and a class that is not there for the rest. It
  // is said here, as `check-aria` says it.
  if (unheld.length)
    throw new TextsError(
      'denominator',
      'decorator-without-class',
      `${unheld.length} decorators stand where the TypeScript parser holds no class at the ` +
        `top level of the file:\n` +
        list(unheld) +
        `\n    A decorator in a comment, or a class inside a namespace or a function: no ` +
        `point below may read it as a component of the library.`,
    );

  // The template is read off the metadata the parser holds for the decorator where the pattern
  // read its `@`, as ngc reads it. Where the parser holds no decorator there, or one called with
  // no object literal, the class has no metadata to read it off, and the text the pattern took
  // for it is no decorator's: a comment above a class decorated otherwise, read as a component.
  if (unparsed.length)
    throw new TextsError(
      'denominator',
      'decorator-without-metadata',
      `${unparsed.length} decorators stand where the TypeScript parser holds no decorator ` +
        `called with an object literal:\n` +
        list(unparsed) +
        `\n    A decorator in a comment above a class decorated otherwise, or metadata that ` +
        `is no object literal once an \`as\` is off, which ngc refuses as well ` +
        `(\`{ … } satisfies { … }\`, NG1001): the scanner reads a class's template off ` +
        `that object, and here it has none.`,
    );

  // A decorator under a name of the file's own is one neither the pattern nor the counter sees,
  // so the count below agrees without it: a class decorated so is no class to the source read,
  // and the text of a template written into its decorator passed every point when no entrypoint
  // exported it.
  if (renamed.length)
    throw new TextsError(
      'denominator',
      'decorator-under-another-name',
      `${renamed.length} imports take \`Component\` or \`Directive\` from ` +
        `\`@angular/core\` under another name:\n` +
        list(renamed) +
        `\n    The pattern and the counter know a decorator by \`@Component(\` and ` +
        `\`@Directive(\`, and ngc by the import: a class decorated under another name ` +
        `compiles into the package, and the source read holds no class there. Import them ` +
        `under their own names.`,
    );

  if (unseen.length)
    throw new TextsError(
      'denominator',
      'decorator-unseen',
      `the pattern read ${classes.length} of the ${declarations} decorators the ` +
        `TypeScript parser holds, and not these:\n` +
        list(unseen) +
        `\n    They would drop out of the measurement without a trace, together with their ` +
        `\`host\` block. Usual cause: a decorator written otherwise than the pattern reads ` +
        `it (\`@Component({\` and \`})\` in column zero): indented, inside a namespace or ` +
        `a function, behind a comment on its line, or above \`export default class\`, which ` +
        `the pattern does not take for a class.`,
    );

  // Point 2 compares the two reads by class name, the one key both carry: the package keeps no
  // file, and a class it exports carries its own name, whatever key it is exported under. Two
  // decorated classes of one name are then one key, and the comparison reads one of them — the
  // other's strings are held against nothing, and a class that never reached the package hides
  // behind its namesake that did (measured: a second `PctMarker` in `twin.ts`, which the package
  // does not carry, passed). It is refused wherever the two stand, two bases no entrypoint
  // exports included, which point 2 never reaches: a name meets the package in more than one
  // place below (`fromPackage`, the filter of `fromSources`), and one class per name is what
  // each of them assumes. The chain is not what needs this: `extends` is resolved through the
  // file that writes it, by name and file.
  const byName = Map.groupBy(classes, (k) => k.className);
  const shared = [...byName].filter(([, named]) => named.length > 1);
  if (shared.length)
    throw new TextsError(
      'denominator',
      'shared-class-name',
      `${shared.length} names are borne by more than one decorated class:\n` +
        list(
          shared.map(
            ([name, named]) =>
              `${name}: ${named.map((k) => k.file).join(', ')}`,
          ),
        ) +
        `\n    Point 2 compares the sources with the package by class name, the only key ` +
        `the package carries, and where two classes of a name reach it, it reads one and ` +
        `passes the other over. The name is refused wherever the two stand. Rename one.`,
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

  const unnamed = classes.filter((k) => k.unnamed);
  if (unnamed.length)
    throw new TextsError(
      'denominator',
      'template-by-expression',
      `${unnamed.length} classes name their template file by an expression, not a string:\n` +
        list(unnamed.map((k) => `${k.file}: ${k.className}`)) +
        `\n    The scanner opens the file \`templateUrl\` names as written; ngc evaluates ` +
        `the expression and compiles a file the source read never opens. Write the path as ` +
        `a string.`,
    );

  const composed = classes.filter((k) => k.composed);
  if (composed.length)
    throw new TextsError(
      'denominator',
      'host-composed',
      `${composed.length} classes take a \`host\` block this read does not take as written:\n` +
        list(composed.map((k) => `${k.file}: ${k.className}`)) +
        `\n    ngc evaluates the block, and composes it from a constant by name, an import, a ` +
        `member, a condition, a call, a computed key or a value kept in a constant alike; ` +
        `the read follows an object literal written in place or in a \`const\` of the ` +
        `file's own, under keys and values written as strings. An attribute composed ` +
        `otherwise reached point 2 as one the sources lack, for a cause not its own. Write ` +
        `the block so.`,
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

  // Reached before known: a node the walk never reaches is a kind it never checks.
  const unreached = scans.filter((s) => s.unreached.length);
  if (unreached.length)
    throw new TextsError(
      'denominator',
      'unreached-node',
      `${unreached.length} templates hold nodes the walk never reaches:\n` +
        list(unreached.map((s) => `${s.file}: ${s.unreached.join(', ')}`)) +
        `\n    The compiler's visitor does not hand on what that field holds, and a node no ` +
        `method of the walk is handed may carry text no point reads. Reach it in ` +
        `\`TemplateScanner\`, or pass over it there with a decision on why it draws nothing.`,
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
  //    The source read takes a `host` block off the parser as far as it follows its
  //    composition (`hostOf`), and point 1 refuses the rest. The package read reads
  //    `ɵdir.hostAttrs` and `ɵcmp.consts` after linking — the output of the REAL compiler.
  if (!pkg.length)
    throw new TextsError(
      'artifact',
      'empty-package',
      `the built package gave not one class with an Angular definition — the comparison ` +
        `would pass with nothing to compare.\n    Usual cause: a stale or empty ` +
        `\`${DIST}\` (the gate needs \`dependsOn: build\`).`,
    );

  const declared = new Map(classes.map((k) => [k.key, k]));
  // The package's classes, one per OBJECT, as `check-zoneless` reads them: a class one
  // entrypoint re-exports from another, or exports a second time under another name, is one
  // class. Its name is its own (`name`), the name the sources give it, not the key it is
  // exported under: by key, `export { PctBlank as PctGhost }` stood in for a decorated
  // `PctGhost` no entrypoint exports, and the input passed with a class the consumer never gets
  // counted, and a second name was a class the scanner did not see.
  const packaged = [...Map.groupBy(pkg, (p) => p.class)].map(([type, of]) => ({
    className: type.name,
    entrypoints: [...new Set(of.map((p) => p.entrypoint))].sort(),
    exports: of.map(({ entrypoint, exportedAs }) => ({
      entrypoint,
      exportedAs,
    })),
    attributes: of[0].attributes,
    unplaced: of[0].unplaced,
  }));
  // A constant of `consts` is a node's attributes or something else — its local references, a
  // `@defer` block's timings — and only the instruction taking its index says which
  // (`CONSTS_AT`). One no instruction the read knows takes is read as neither: as attributes, a
  // reference fired this point on a correct template; as nothing, an attribute a stale `dist`
  // still draws passed it.
  const unplaced = packaged.filter((p) => p.unplaced.length);
  if (unplaced.length)
    throw new TextsError(
      'artifact',
      'unplaced-const',
      `${unplaced.length} classes of the package hold constants in \`consts\` that no ` +
        `instruction this read knows takes:\n` +
        list(unplaced.map((p) => `${p.className}: ${p.unplaced.join(', ')}`)) +
        `\n    Either the class was not compiled from its declaration here (a package ` +
        `compiled in full carries none, and the read sees no instruction), or the compiler ` +
        `takes the constant through an instruction or an argument \`CONSTS_AT\` does not hold.`,
    );
  // The two reads meet by class name, so a name two classes of the package bear — one class
  // bundled into two entrypoints, a copy beside the original — has no class to stand for.
  const twins = [...Map.groupBy(packaged, (p) => p.className)].filter(
    ([, named]) => named.length > 1,
  );
  if (twins.length)
    throw new TextsError(
      'artifact',
      'shared-package-name',
      `${twins.length} names are borne by more than one class of the package:\n` +
        list(
          twins.map(
            ([name, named]) =>
              `${name}: ${named.map((p) => p.entrypoints.join(' and ')).join(', ')}`,
          ),
        ) +
        `\n    Two objects of one name are two classes to a consumer, and the comparison with ` +
        `the sources, which keeps one class per name, would hold the attributes of both ` +
        `against one.`,
    );
  const fromPackage = new Map(packaged.map((p) => [p.className, p]));

  // Inheritance, resolved before the two lists are compared. What a base declares is merged
  // INTO the classes that extend it, because that is where the package puts it; and a base
  // no entrypoint exports stops being a class of its own, because that is what the package
  // does with it. A decorated class nobody extends is untouched by this and still has to be
  // in the package — the rule below is about a base, not about any class the read missed.
  //
  // The merge is Angular's: `ɵɵInheritDefinitionFeature` runs `mergeHostAttrs` down the
  // chain, and an attribute a class writes replaces the one of the same name it inherits —
  // the name compared with `===` — so an element carries the attribute of the nearest class
  // that writes it. Measured through ngc in partial mode and the linker: `PctMarker` writing
  // `title: '*'` over its base's `title: ''` links to `hostAttrs` with `*` alone, and a
  // `TITLE` beside a base's `title` leaves both. A union would compare the base's value
  // against a package that never got it, and name a stale `dist` for the cause. Classes and
  // styles merge otherwise (a union of classes, styles by property), and no point reads them.
  //
  // A chain that writes one attribute twice is not refused, unlike in `check-parts`: there the
  // shadowed value is a part missing from the inventory, here it is a string still written in
  // a file, and point 3 judges every file's own `host` block, a base's included.
  //
  // A link is the class TypeScript binds the base's name to (`class-bases.mjs`) — one the
  // subclass's file declares, or one a module of the sources declares `export class` under the name
  // imported — keyed by its file too, and anything else is no link but the refusal below. So the
  // chain is the one TypeScript builds: a cycle in it is one the compiler refuses as well (TS2506,
  // a class named in its own base expression), and no build compiles it. `seen` guards nothing the
  // gate is handed, and dropping it is equivalent on every input that compiles and whose
  // directories carry no `package.json`, which `class-bases.mjs` does not read. So is the rest the
  // review of this merge named equivalent while names are unique, now that point 1 refuses a name
  // two decorated classes share: merging only the classes point 2 compares, point 3 reading the
  // merged attributes of every class (which only lists an inherited string again under each
  // subclass), and point 3 reading the classes through `declared`.
  const extended = new Set(classes.map((k) => k.from));
  const carried = (k, seen = new Set()) => {
    if (k.base === null || seen.has(k.key)) return k.attributes;
    seen.add(k.key);
    const base = declared.get(k.from);
    if (base === undefined)
      throw new TextsError(
        'denominator',
        'base-without-declaration',
        `${k.className} (${k.file}) extends \`${k.base}\`, ${standsFor(k)} — not ` +
          `among the decorated classes read. Whatever that base writes into a ` +
          `\`host\` block is part of this class in the package, and point 2 would compare ` +
          `the half declared here against the whole of what ships`,
      );
    const own = new Set(k.attributes.map(([name]) => name));
    return [
      ...carried(base, seen).filter(([name]) => !own.has(name)),
      ...k.attributes,
    ];
  };
  const shipped = new Map(classes.map((k) => [k.key, carried(k)]));

  const fromSources = new Map(
    classes
      .filter((k) => fromPackage.has(k.className) || !extended.has(k.key))
      .map((k) => [k.className, k]),
  );

  const withoutPackage = [...fromSources.keys()].filter(
    (k) => !fromPackage.has(k),
  );
  // What a name the sources give a class holds in the package where no class bears it.
  const holding = (className) =>
    packaged.flatMap((p) =>
      p.exports
        .filter((e) => e.exportedAs === className)
        .map(
          (e) =>
            `\`${e.entrypoint}\` exports \`${p.className}\` under that name`,
        ),
    );
  if (withoutPackage.length)
    throw new TextsError(
      'artifact',
      'class-without-package',
      `${withoutPackage.length} classes from the sources are not in the built package:\n` +
        list(
          withoutPackage.map((k) => {
            const held = holding(k);
            return (
              `${k} (${fromSources.get(k).file})` +
              (held.length ? ` — ${held.join('; ')}` : '')
            );
          }),
        ) +
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
        list(
          withoutSources.map(
            (k) => `${k} (${fromPackage.get(k).entrypoints.join(', ')})`,
          ),
        ) +
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
  // The classes the package has, with what their chain hands them — a base that travels
  // inside its subclasses must not be compared under a name the package has not got.
  for (const k of fromSources.values())
    for (const [name, value] of shipped.get(k.key))
      if (speaks(name))
        speakingInSources.add(`${k.className} ${name}=${value}`);
  for (const s of scans)
    for (const a of s.scanner.attributes)
      if (speaks(a.name))
        speakingInSources.add(`${ownerOf(s.file)} ${a.name}=${a.value}`);

  const speakingInPackage = new Set();
  for (const p of packaged)
    for (const [name, value] of p.attributes)
      if (speaks(name))
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
        `\n    This is what an attribute the source read does not see looks like — one a ` +
        `mixin or inheritance brings, or one a \`dist\` built before the source changed ` +
        `still carries. Point 3 would never look at it.`,
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
  // A class answers here for its own `host` block, in its own file, and not for what its chain
  // hands it: an inherited string is judged on the base that writes it, which point 1 holds
  // among `classes`, and a shadowed one as well — it is written, and it ships the day a class
  // extends that base without writing over it.
  for (const k of classes)
    for (const [name, value] of k.attributes)
      if (speaks(name) && LETTER.test(value))
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
    literalsIn(f.argument)
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
    .filter((f) => f.textual && literalsIn(f.argument).some((v) => v !== ''))
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
 * Where an instruction takes an index into `consts`: first where the runtime reads the attributes
 * of the node it creates (`TNode.attrs`), then where it reads anything else. `consts` holds every
 * array a view needs, and only the instruction taking its index tells one from another:
 * `['title', '']` is the attributes of `<b title="">` and the local references of `<span #title>`
 * alike, one array for both, as the compiler keeps one copy of equal constants (measured through
 * ngc 22.2.1 in partial mode and the linker, as every shape below). Read whole, a reference named
 * like a speaking attribute fired point 2 on a correct template, `PctWidget title=`.
 *
 * An element's attributes are what `setUpAttributes` writes onto it. A container's and a
 * template's stand on a comment, and a block's are its one root element's, kept for content
 * projection — an array of the block's own where it keeps other bindings than the element does, as
 * beside an element that listens. No node draws them, and they are read all the same, because the
 * source read holds every node's attributes and point 2 compares the two. Beside them stand an
 * element's, a container's and a template's local references (`['placeholder', 'pctThing']` for
 * `#placeholder="pctThing"`) and a `@defer` block's timings of `@loading` and `@placeholder`
 * (`[null, 100]` for `after 100ms`, `[500]` for `minimum 500ms`). An element writes the DOM-only
 * instruction in a component with no directive among its dependencies, the full one otherwise, and
 * the two take the same arguments. A chained call (`ɵɵdomElement(0, 'span', null, 0)(2, 'b', 3)`)
 * is the instruction at its root, and a block's `@else` the branch its `@if` chains; a `@boundary`
 * block's content is such a branch at the root of a chain of its own (`ɵɵboundaryCreate` chains
 * nothing). An instruction not here takes no constant this read places. An i18n message's would be
 * one (`ɵɵi18n`), but no template of the library is marked for translation, and the `consts()` of
 * one throws here first: it calls `$localize`, which nothing here defines.
 */
const ELEMENT = [[2], [3]];
const CONTAINER = [[1], [2]];
const TEMPLATE = [[5], [6]];
const CONSTS_AT = new Map([
  [R3Identifiers.element, ELEMENT],
  [R3Identifiers.elementStart, ELEMENT],
  [R3Identifiers.domElement, ELEMENT],
  [R3Identifiers.domElementStart, ELEMENT],
  [R3Identifiers.elementContainer, CONTAINER],
  [R3Identifiers.elementContainerStart, CONTAINER],
  [R3Identifiers.domElementContainer, CONTAINER],
  [R3Identifiers.domElementContainerStart, CONTAINER],
  [R3Identifiers.templateCreate, TEMPLATE],
  [R3Identifiers.domTemplate, TEMPLATE],
  [R3Identifiers.conditionalCreate, [[5], []]],
  [R3Identifiers.conditionalBranchCreate, [[5], []]],
  [R3Identifiers.repeaterCreate, [[5, 12], []]],
  [R3Identifiers.defer, [[], [6, 7]]],
]);

class ConstsReader extends outputAst.RecursiveAstVisitor {
  attributes = new Set();
  other = new Set();
  visitInvokeFunctionExpr(call, context) {
    let instruction = call.fn;
    while (instruction instanceof outputAst.InvokeFunctionExpr)
      instruction = instruction.fn;
    const [attributes, other] = CONSTS_AT.get(instruction.value) ?? [[], []];
    for (const at of attributes) this.attributes.add(call.args[at]?.value);
    for (const at of other) this.other.add(call.args[at]?.value);
    return super.visitInvokeFunctionExpr(call, context);
  }
}

/**
 * The indices of `consts` every component compiled in this process takes, by the class it
 * defines: the statements the JIT compiler evaluates for one definition hold its template's
 * function and every embedded view's. The hook stands before any module of the package is
 * imported, because a declaration compiles as its class is evaluated — the same hook as in
 * `check-parts`.
 */
const compiled = new Map();
const evaluateStatements = JitEvaluator.prototype.evaluateStatements;
JitEvaluator.prototype.evaluateStatements = function (
  url,
  statements,
  ...rest
) {
  for (const { value: call } of statements) {
    if (
      !(call instanceof outputAst.InvokeFunctionExpr) ||
      call.fn.value !== R3Identifiers.defineComponent
    )
      continue;
    const reader = new ConstsReader();
    for (const each of statements) each.visitStatement(reader, null);
    compiled.set(
      call.args[0].entries.find((entry) => entry.key === 'type').value.node,
      reader,
    );
  }
  return evaluateStatements.call(this, url, statements, ...rest);
};

/**
 * A definition's static attributes — the arrays of `consts` an instruction takes as a node's
 * attributes, and its host's (`hostAttrs`) — read as `check-parts` reads them
 * (`static-attributes.mjs`), and the constants no instruction it was compiled with takes
 * (`unplaced`). A definition this process did not compile, one a package compiled in full
 * carries, takes none: its constants are all unplaced, and point 2 refuses them rather than read
 * a reference for an attribute or an attribute for nothing. A case gives a definition the same way
 * (`packageClass`).
 */
const attributesOf = (def) => {
  const consts =
    typeof def.consts === 'function' ? def.consts() : (def.consts ?? []);
  const taken = compiled.get(def.type);
  const attributes = [];
  const unplaced = [];
  for (const [i, entry] of consts.entries()) {
    if (taken?.attributes.has(i)) attributes.push(...staticAttributes(entry));
    else if (!taken?.other.has(i))
      unplaced.push(`${i}: ${JSON.stringify(entry)}`);
  }
  return {
    attributes: [...attributes, ...staticAttributes(def.hostAttrs ?? [])],
    unplaced,
  };
};

/**
 * Definitions from the BUILT package, one record per name an entrypoint exports, `class` the
 * object it holds. `@angular/compiler` is loaded and its evaluator hooked before the first
 * import, because the package is partially compiled: each class's declaration compiles through
 * JIT as its module is evaluated — the step the linker performs at the consumer's (`lesson-46`).
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

  const exports = JSON.parse(read(root, `${DIST}/package.json`)).exports ?? {};
  const out = [];

  for (const [entrypoint, target] of Object.entries(exports)) {
    const file = typeof target === 'object' ? target.default : target;
    if (typeof file !== 'string' || !file.endsWith('.mjs')) continue;

    const module = await import(
      pathToFileURL(join(dist, file.replace(/^\.\//, ''))).href
    );
    for (const [exportedAs, value] of Object.entries(module)) {
      if (typeof value !== 'function') continue;
      const def = value['ɵcmp'] ?? value['ɵdir'];
      if (!def) continue;

      out.push({ entrypoint, exportedAs, class: value, ...attributesOf(def) });
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
 * Angular package for each of a dozen-odd cases would cost minutes per run. A class may carry
 * the declaration ngc writes for it instead, compiled through JIT and read by the code that reads
 * the package's (`packageClass`). What no case exercises is the way to the package's classes (the
 * manifest's `exports`, the import) and the `consts()` call: no definition here or in the library
 * has `consts` as a function. That way is exercised on every run against the repository.
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

const fixtureInput = (directory) => {
  // Every case compiles its own `PctWidget`, and Angular warns (NG0912) of a second class whose
  // definition hashes as an earlier one's. The registry is cleared between cases, as `TestBed`
  // clears it between tests and `check-parts` between its cases.
  core.ɵresetCompiledComponents();
  return gatherInput(
    directory,
    globSync('**/*.{ts,html}', { cwd: directory })
      .map((p) => p.split('\\').join('/'))
      .sort(),
    inNamespaceOrder(
      JSON.parse(
        readFileSync(join(directory, 'package.json'), 'utf8'),
      ).classes.flatMap(packageClass),
    ),
  );
};

/**
 * One class of a prepared input's package — one object — as the records the package read
 * gives for it: one per name an entrypoint exports it under. `exports` lists them where the
 * class is exported otherwise than once, from `entrypoint`, under its own name: a re-export
 * from another entrypoint, a second name, a name that is not its own. Its static attributes are
 * the pairs as `attributes` lists them, or read by the function the package read uses
 * (`attributesOf`) off a definition: the one its `declaration` compiles to, or the arrays it
 * gives as a definition no declaration compiled here, as a package compiled in full carries one
 * (`consts`, `hostAttrs`).
 */
const packageClass = (k) => {
  const type = { [k.className]: class {} }[k.className];
  if (k.declaration) type['ɵcmp'] = declare(type, k.declaration);
  const read = k.attributes
    ? { attributes: k.attributes, unplaced: [] }
    : attributesOf(type['ɵcmp'] ?? k);
  return (k.exports ?? [{ entrypoint: k.entrypoint, as: k.className }]).map(
    ({ entrypoint, as }) => ({
      entrypoint,
      exportedAs: as,
      class: type,
      ...read,
    }),
  );
};

/**
 * A component of a prepared input's package compiled from its declaration, as ngc writes it in
 * partial mode less the fields supplied here, through the JIT compiler and the hook the package
 * goes through (`compiled`): a case's `consts` are placed by the instructions the compiler
 * installed writes for its template, as the package's are. A dependency is named by its kind and
 * selector, and the type standing in for it is no matter to the compile: one directive among them
 * makes the full instructions of the template, and none the DOM-only ones.
 */
const declare = (type, { dependencies, ...fields }) =>
  core.ɵɵngDeclareComponent({
    minVersion: '14.0.0',
    version: core.VERSION.full,
    ngImport: core,
    type,
    isStandalone: true,
    dependencies: dependencies?.map((d) => ({ ...d, type: class {} })),
    ...fields,
  });

/**
 * The records as module namespaces give them: each entrypoint's names in code-unit order, and
 * none twice in one module. Listed as a case writes them, a class's own name would always
 * come before its other names, and `PctBare` comes before `PctBlank`.
 */
const inNamespaceOrder = (records) =>
  [...Map.groupBy(records, (r) => r.entrypoint).values()].flatMap((of) => {
    const names = of.map((r) => r.exportedAs);
    const twice = names.filter((n, i) => names.indexOf(n) !== i);
    if (twice.length)
      throw new Error(
        `\`${of[0].entrypoint}\` exports ${twice.join(', ')} twice — no module can`,
      );
    return of.toSorted((a, b) => (a.exportedAs < b.exportedAs ? -1 : 1));
  });

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

const readCase = (name) =>
  JSON.parse(readFileSync(join(FIXTURES, name, 'fixture.json'), 'utf8'));

/**
 * What the runner reports of one prepared case: nothing, when it was rejected on its own rule
 * and says what it pins. The loop plays every case through it, and so does the runner's own
 * control (`runner-control.mjs`).
 */
const runCase = async (name, fx) => {
  const said = [];
  const directory = buildFixture(name, fx);
  try {
    checkTexts(await fixtureInput(directory));
    said.push(
      `${name}: the prepared input PASSED and was meant not to — ` +
        `point ${fx.point} (\`${fx.check}/${fx.rule}\`) stopped examining anything`,
    );
  } catch (error) {
    if (!(error instanceof TextsError)) throw error;
    if (error.check !== fx.check || error.rule !== fx.rule)
      said.push(
        `${name}: \`${error.check}/${error.rule}\` fired, and point ${fx.point} ` +
          `(\`${fx.check}/${fx.rule}\`) was meant to — the fixture proves something other than what it declares`,
      );
    // A rule that names what it found says it in the message, and a case may hold that too.
    else if (fx.message !== undefined && !error.message.includes(fx.message))
      said.push(
        `${name}: \`${fx.check}/${fx.rule}\` fired without "${fx.message}" — the right rule ` +
          `saying something else:\n    ${error.message}`,
      );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
  return said;
};

for (const name of cases)
  problems.push(...(await runCase(name, readCase(name))));

problems.push(
  ...(await runnerControl({
    where: `tools/check-texts.fixtures/${RUNNER}`,
    load: () => JSON.parse(readFileSync(join(FIXTURES, RUNNER), 'utf8')),
    cases,
    read: readCase,
    run: runCase,
    holds: ['passed', 'check', 'rule'],
    own: (fx) => fx.message,
    pin: (fx, message) => ({ ...fx, message }),
  })),
);

// ── result ────────────────────────────────────────────────────────────────────

if (problems.length) {
  console.error(`X Texts channel gate — ${problems.length} violations:\n`);
  for (const p of problems) console.error(`  - ${p}`);
  console.error('');
  process.exit(1);
}

console.log(
  `✓ Texts: ${description}. Negative control: the reference input passes, ${cases.length} ` +
    `prepared ones rejected on their own rules, and the runner reports a case that passed or ` +
    `fired another check or rule, or pinned to a phrase its refusal lacks.`,
);
