#!/usr/bin/env node
/**
 * Conformance gate: is `docs/acr.md` — the Accessibility Conformance Report a buyer asks for
 * since the EAA — a rendering of what the gates measure, or prose somebody wrote
 * (`req-a11y-acr`)? Here the evidence runs on every commit and the report is derived from it.
 *
 *  1. CATALOGUE: the claims name every WCAG 2.2 success criterion at A and AA, once,
 *  2. LEVEL: a level is one of the five words, and each word demands its own input,
 *  3. EVIDENCE: every citation resolves — a point, a case title, a sentence, a decision,
 *  4. WIRED: a cited gate or suite runs in CI (`nx affected -t …`),
 *  5. CARDS: a claim over the component cards is the cards' own Checks rows,
 *  6. FINDINGS: a finding a row leans on is still open in the plan,
 *  7. THE PASS: each act owned by a spec; a recorded pass has its logs, readings and acts,
 *  8. RENDERING: `docs/acr.md` is the rendering of the claims, status sentence included.
 *
 * A row cannot say more than a gate proves, and the rows nothing measures say so in their own
 * words. A ninth run examines the gate itself (`req-quality-negative-control`):
 * `check-acr.fixtures/`.
 *
 * Usage: node tools/check-acr.mjs [--write]  (--write: regenerate docs/acr.md)
 */
import {
  BindingType,
  Call,
  CombinedRecursiveAstVisitor,
  Conditional,
  HtmlParser,
  ImplicitReceiver,
  LiteralPrimitive,
  parseTemplate,
  Parser,
  Lexer,
  ParseLocation,
  ParseSourceFile,
  ParseSourceSpan,
  PropertyRead,
  RecursiveVisitor,
  TmplAstRecursiveVisitor,
  tmplAstVisitAll,
  Unary,
  visitAll,
} from '@angular/compiler';
import { execSync } from 'node:child_process';
import {
  existsSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, posix } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as sass from 'sass';
import ts from 'typescript';
import { decoratorsOf, textOf, unwrap } from './decorators.mjs';
import { targetsIn } from './workflow-targets.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const WRITE = process.argv.includes('--write');
const CLAIMS = 'docs/acr/claims.json';
const REPORT = 'docs/acr.md';
const CARDS_DIR = 'docs/components';
const PLAN = 'docs/plan.md';
const CI = '.github/workflows/ci.yml';
const IDS = 'apps/sandbox/src/app/ui/doc-ids.ts';
const MANIFEST = 'libs/components/package.json';
const LIB = 'libs/components';
const ACTS = 'apps/sandbox-e2e/at/acts.ts';
const FIXTURES = join(ROOT, 'tools/check-acr.fixtures');
const REFERENCE = '_reference.json';

/** WCAG 2.2, the 31 criteria of level A and the 24 of level AA, in the standard's order. */
const CATALOGUE = [
  ['1.1.1', 'Non-text Content', 'A'],
  ['1.2.1', 'Audio-only and Video-only (Prerecorded)', 'A'],
  ['1.2.2', 'Captions (Prerecorded)', 'A'],
  ['1.2.3', 'Audio Description or Media Alternative (Prerecorded)', 'A'],
  ['1.2.4', 'Captions (Live)', 'AA'],
  ['1.2.5', 'Audio Description (Prerecorded)', 'AA'],
  ['1.3.1', 'Info and Relationships', 'A'],
  ['1.3.2', 'Meaningful Sequence', 'A'],
  ['1.3.3', 'Sensory Characteristics', 'A'],
  ['1.3.4', 'Orientation', 'AA'],
  ['1.3.5', 'Identify Input Purpose', 'AA'],
  ['1.4.1', 'Use of Color', 'A'],
  ['1.4.2', 'Audio Control', 'A'],
  ['1.4.3', 'Contrast (Minimum)', 'AA'],
  ['1.4.4', 'Resize Text', 'AA'],
  ['1.4.5', 'Images of Text', 'AA'],
  ['1.4.10', 'Reflow', 'AA'],
  ['1.4.11', 'Non-text Contrast', 'AA'],
  ['1.4.12', 'Text Spacing', 'AA'],
  ['1.4.13', 'Content on Hover or Focus', 'AA'],
  ['2.1.1', 'Keyboard', 'A'],
  ['2.1.2', 'No Keyboard Trap', 'A'],
  ['2.1.4', 'Character Key Shortcuts', 'A'],
  ['2.2.1', 'Timing Adjustable', 'A'],
  ['2.2.2', 'Pause, Stop, Hide', 'A'],
  ['2.3.1', 'Three Flashes or Below Threshold', 'A'],
  ['2.4.1', 'Bypass Blocks', 'A'],
  ['2.4.2', 'Page Titled', 'A'],
  ['2.4.3', 'Focus Order', 'A'],
  ['2.4.4', 'Link Purpose (In Context)', 'A'],
  ['2.4.5', 'Multiple Ways', 'AA'],
  ['2.4.6', 'Headings and Labels', 'AA'],
  ['2.4.7', 'Focus Visible', 'AA'],
  ['2.4.11', 'Focus Not Obscured (Minimum)', 'AA'],
  ['2.5.1', 'Pointer Gestures', 'A'],
  ['2.5.2', 'Pointer Cancellation', 'A'],
  ['2.5.3', 'Label in Name', 'A'],
  ['2.5.4', 'Motion Actuation', 'A'],
  ['2.5.7', 'Dragging Movements', 'AA'],
  ['2.5.8', 'Target Size (Minimum)', 'AA'],
  ['3.1.1', 'Language of Page', 'A'],
  ['3.1.2', 'Language of Parts', 'AA'],
  ['3.2.1', 'On Focus', 'A'],
  ['3.2.2', 'On Input', 'A'],
  ['3.2.3', 'Consistent Navigation', 'AA'],
  ['3.2.4', 'Consistent Identification', 'AA'],
  ['3.2.6', 'Consistent Help', 'A'],
  ['3.3.1', 'Error Identification', 'A'],
  ['3.3.2', 'Labels or Instructions', 'A'],
  ['3.3.3', 'Error Suggestion', 'AA'],
  ['3.3.4', 'Error Prevention (Legal, Financial, Data)', 'AA'],
  ['3.3.7', 'Redundant Entry', 'A'],
  ['3.3.8', 'Accessible Authentication (Minimum)', 'AA'],
  ['4.1.2', 'Name, Role, Value', 'A'],
  ['4.1.3', 'Status Messages', 'AA'],
];
const BY_ID = new Map(
  CATALOGUE.map(([id, name, level]) => [id, { name, level }]),
);

/** The five words of the ITI template, and what each demands here (point 2). */
const LEVELS = [
  'Supports',
  'Partially Supports',
  'Does Not Support',
  'Not Applicable',
  'Not Evaluated',
];
/** The kinds of evidence that MEASURE; the others point at prose. */
const MEASURING = new Set(['gate', 'spec', 'cards', 'scan', 'source']);
const KINDS = new Set([...MEASURING, 'req', 'lesson', 'decision', 'finding']);

/**
 * A scan is a claim "by construction" turned into a measurement: what a criterion forbids, read
 * over the library's own sources on every run. `over` picks the sources — templates, sheets, or
 * the TypeScript outside the specs — and `find` says where one of them holds it, in the words of
 * the refusal, or nothing.
 *
 * Each scan was one pattern over the lines of the text, and four of them read a name in one
 * spelling where Angular and the engines take others (measured on main, 2026-10-17 and 18):
 * `[tabIndex]="2"`, `[attr.tabindex]="3"`, `TABINDEX="4"`, `'[tabIndex]': '5'` in a `host`
 * block and `tabIndex = input(2)` bound there each passed the tabindex scan, `ACCESSKEY="k"`
 * and `[accessKey]="k"` the accesskey scan, `@media (ORIENTATION: portrait)` the orientation
 * scan and a template's `(window:devicemotion)` the motion scan. So the reading is chosen per
 * scan, by what the criterion turns on:
 *
 * - a NAME whose presence alone breaks the claim (`accesskey`, a motion event, a `<video>` or an
 *   SVG `<text>` tag) is a pattern over the raw text and over the text the TypeScript parser
 *   cooks out of each string and name (`cookedHolding`): an attribute, a property or `attr.`
 *   binding, a `host` key, `@HostListener`, `addEventListener`, an assignment and an inline
 *   `template` hold the name as written, and the cooked text holds it where an escape hides it
 *   (`'[attr.acc\u0065sskey]'`). A tag a script creates is read off the call
 *   (`createdIn`). Over-approximated by design, and named: prose that says the word is refused
 *   with the code, and so is an event type no engine fires (`'DeviceMotion'`: a listener's type
 *   is compared as written). Not read: a name a script builds from pieces;
 * - a VALUE — `tabindex`, whose zero and minus one the library writes on purpose, while only a
 *   positive one breaks 2.4.3 — is read off the parsed template and the parsed TypeScript
 *   (`positiveTabindexIn`), because no pattern tells `[tabIndex]="on ? 0 : -1"` from
 *   `[tabIndex]="2"`. What the reading cannot judge is refused, never passed;
 * - the DISPLAY ORIENTATION is read off a stylesheet as it compiles, and off a script's media
 *   queries, its `orientationchange` and its reads of the orientation (`orientationIn`).
 */
const SCANS = {
  'no-media-elements': {
    over: ['html', 'ts'],
    // In any case and any namespace the template writes, as Angular's lexer takes a prefix: `ngc`
    // hands `<VIDEO>` to `createElement`, which an HTML document lowers, and makes the same
    // element of `<foo:video>`, with no namespace instruction (measured on 22.2.1). In a script
    // too, where an inline `template` stands, and where `createElement('video')` and `new
    // Audio()` make one.
    find: (path, text) =>
      lineHolding(path, text, MEDIA) ??
      cookedHolding(path, text, MEDIA) ??
      createdIn(path, text, (c) => /^(?:video|audio)$/i.test(c.name)),
    means: 'an `<audio>` or `<video>` element',
  },
  'no-orientation-lock': {
    over: ['scss', 'css', 'html', 'ts'],
    find: (path, text) => orientationIn(path, text),
    means: 'a reading of the display orientation',
  },
  'no-positive-tabindex': {
    over: ['html', 'ts'],
    find: (path, text, context) => positiveTabindexIn(path, text, context),
    // Reads every source's `extends` as well (`extendedIn`), so its answer is not one file's.
    whole: true,
    means: 'a positive `tabindex`',
  },
  'no-accesskey': {
    over: ['html', 'ts'],
    find: (path, text) =>
      lineHolding(path, text, ACCESSKEY) ??
      cookedHolding(path, text, ACCESSKEY),
    means: 'an `accesskey`',
  },
  'no-device-motion': {
    over: ['html', 'ts'],
    find: (path, text) =>
      lineHolding(path, text, MOTION) ?? cookedHolding(path, text, MOTION),
    means: 'a device-motion or orientation listener, or a motion sensor',
  },
  'no-svg-text': {
    over: ['html', 'ts'],
    // Inside an `<svg>` or in its namespace, `<svg:text>`, which `ngc` makes anywhere: no other
    // prefix compiles to one, and SVG names keep their case in a template (`<TEXT>` is no text
    // element there). A script's string in any case: the HTML parser `innerHTML` hands it to lowers
    // `<TEXT>` inside an `<svg>` to a text element (Chromium 152) — over-approximated, an inline
    // `template` holding `<TEXT>` too. A script makes one in a namespace: `createElementNS(…,
    // 'text')`, a renderer's `createElement('text', 'svg')` — over-approximated, any namespace and
    // any second argument.
    find: (path, text) =>
      lineHolding(path, text, SVG_TEXT) ??
      cookedHolding(path, text, MARKUP_SVG_TEXT) ??
      createdIn(path, text, (c) => c.name === 'text' && c.namespaced),
    means: 'an SVG `<text>` element',
  },
};

const MEDIA = /<(?:[a-z][a-z\d]*:)?(?:video|audio)\b/i;
const SVG_TEXT = /<(?:svg:)?text\b/;
const MARKUP_SVG_TEXT = /<(?:svg:)?text\b/i;

/** The end of a refusal that found what a scan forbids. */
const BROKEN = ' — the claim "by construction" no longer holds';

/**
 * `accesskey` in every spelling Angular binds it by: `ACCESSKEY`, `[accessKey]`, `[attr.accesskey]`.
 */
const ACCESSKEY = /\baccesskey\b/i;
/**
 * A motion or orientation event, by its type or a window's `on…` property, its interface
 * (`DeviceMotionEvent.requestPermission()`), and the classes of the Generic Sensor API that read
 * the same motion — written in their own case, which the flag makes no matter.
 */
const MOTION =
  /devicemotion|deviceorientation|\b(?:Accelerometer|Gyroscope|\w*(?:Acceleration|Gravity|Orientation)Sensor)\b/i;

// ── what the scans read ───────────────────────────────────────────────────────

/**
 * Every source is read once per text: a case is built on the live sources and rewrites one or two
 * of them, and a reading of every file per case would make the negative control the whole run.
 * Keyed by the path and then by the text, so that a lookup hashes no string built for it.
 */
const memo = (read) => {
  const byPath = new Map();
  return (path, text) => {
    let byText = byPath.get(path);
    if (byText === undefined) byPath.set(path, (byText = new Map()));
    if (!byText.has(text)) byText.set(text, read(path, text));
    return byText.get(text);
  };
};

/** A spelling a refusal quotes: on one line and cut short. */
const quoted = (text) => `\`${text.replace(/\s+/g, ' ').slice(0, 80)}\``;

/** The first line of the text a pattern matches. */
const lineHolding = (path, text, pattern) => {
  const at = text.split('\n').findIndex((line) => pattern.test(line));
  return at === -1 ? undefined : `\`${path}:${at + 1}\` holds one${BROKEN}`;
};

/**
 * The first string or name of a TypeScript source a pattern matches as the parser cooks it, escapes
 * resolved: `'(window:device\u006dotion)'` is `(window:devicemotion)` to `ngc`, which reads a
 * `host` key and `@HostListener`'s argument so, and to the engines, and to a pattern over the raw
 * text it is no such thing. The refusal quotes the cooked text around the match.
 */
const cookedHolding = (path, text, pattern) => {
  if (!path.endsWith('.ts')) return undefined;
  for (const c of tsReading(path, text).cooked) {
    const at = pattern.exec(c.text);
    if (at)
      return `\`${path}:${c.line}\` holds one (${quoted(c.text.slice(Math.max(0, at.index - 20), at.index + 60))})${BROKEN}`;
  }
  return undefined;
};

/** The first element a script creates (`tsReading`'s `created`) that the test takes for one. */
const createdIn = (path, text, test) => {
  if (!path.endsWith('.ts')) return undefined;
  const at = tsReading(path, text).created.find(test);
  return (
    at && `\`${path}:${at.line}\` creates one (${quoted(at.spelling)})${BROKEN}`
  );
};

/**
 * Whether a value makes the tabindex positive: as the attribute's integer, which skips leading
 * whitespace and a sign and stops at the first character that is no digit (`" +01px"` is 1), or as
 * the property's `long`, which takes `true` for 1 and wraps past 32 bits (`-4294967295` is 1).
 */
const positive = (value) =>
  parseInt(String(value), 10) > 0 || (Number(value) | 0) > 0;

/** Values joined; `null` is a value the reading cannot judge, and it takes the union. */
const union = (...parts) => (parts.includes(null) ? null : parts.flat());

/**
 * The expressions a function returns: a concise arrow's body, or each `return` of its block that
 * no nested function holds — `undefined` for a bare one and for a block with none, and nothing it
 * can judge for a signature with no body.
 */
const returnsOf = (fn) => {
  if (fn.body === undefined) return [null];
  if (!ts.isBlock(fn.body)) return [fn.body];
  const out = [];
  const visit = (node) => {
    if (ts.isFunctionLike(node) || ts.isClassLike(node)) return;
    if (ts.isReturnStatement(node)) out.push(node.expression);
    ts.forEachChild(node, visit);
  };
  ts.forEachChild(fn.body, visit);
  return out.length ? out : [undefined];
};

/**
 * The values a TypeScript expression can take, as far as the source says them: a literal, a
 * negative one, either branch of a condition, and what a `computed` returns. Anything else is
 * `null`: a call returns anything, and an input holds whatever a template gives it — a consumer's
 * and the library's own, which binds its components' inputs too.
 */
const tsValues = (node) => {
  if (node === undefined) return [undefined];
  if (node === null) return null;
  if (ts.isNumericLiteral(node)) return [Number(node.text)];
  if (ts.isStringLiteralLike(node)) return [node.text];
  if (
    ts.isPrefixUnaryExpression(node) &&
    node.operator === ts.SyntaxKind.MinusToken
  )
    return tsValues(node.operand)?.map((v) => -v) ?? null;
  if (ts.isConditionalExpression(node))
    return union(tsValues(node.whenTrue), tsValues(node.whenFalse));
  const [first] = ts.isCallExpression(node) ? node.arguments : [];
  if (
    ts.isCallExpression(node) &&
    ts.isIdentifier(node.expression) &&
    node.expression.text === 'computed' &&
    first !== undefined &&
    (ts.isArrowFunction(first) || ts.isFunctionExpression(first))
  )
    return union(...returnsOf(first).map(tsValues));
  return null;
};

/** A member of an instance by its name, as an expression of the class reads it: no static one. */
const memberOf = (owner, name) =>
  owner?.members.find(
    (m) =>
      m.name !== undefined &&
      (ts.isIdentifier(m.name) || ts.isStringLiteral(m.name)) &&
      m.name.text === name &&
      !(ts.getCombinedModifierFlags(m) & ts.ModifierFlags.Static),
  );

/** An expression with its casts and parentheses taken off: `as`, `satisfies`, `<T>`, `!`. */
const bare = (node) =>
  ts.isParenthesizedExpression(node) ||
  ts.isAsExpression(node) ||
  ts.isSatisfiesExpression(node) ||
  ts.isTypeAssertionExpression(node) ||
  ts.isNonNullExpression(node)
    ? bare(node.expression)
    : node;
/** The outermost cast or parentheses around an expression (`bare` read upwards). */
const dressed = (node) => {
  let at = node;
  while (
    at.parent !== undefined &&
    bare(at.parent) === bare(node) &&
    at.parent !== at
  )
    at = at.parent;
  return at;
};

/**
 * Whether an expression is written to: the left of an assignment, the operand of `++` or `--`,
 * or a target of a destructuring one (`[this.order] = …`, `({ a: this.order } = …)`).
 */
const writtenTo = (node) => {
  let at = dressed(node);
  if (
    (ts.isPrefixUnaryExpression(at.parent) ||
      ts.isPostfixUnaryExpression(at.parent)) &&
    (at.parent.operator === ts.SyntaxKind.PlusPlusToken ||
      at.parent.operator === ts.SyntaxKind.MinusMinusToken)
  )
    return true;
  while (
    ts.isArrayLiteralExpression(at.parent) ||
    ts.isObjectLiteralExpression(at.parent) ||
    ts.isSpreadElement(at.parent) ||
    ts.isSpreadAssignment(at.parent) ||
    ts.isShorthandPropertyAssignment(at.parent) ||
    (ts.isPropertyAssignment(at.parent) && at.parent.initializer === at) ||
    ts.isParenthesizedExpression(at.parent)
  )
    at = at.parent;
  return (
    ts.isBinaryExpression(at.parent) &&
    at.parent.left === at &&
    at.parent.operatorToken.kind >= ts.SyntaxKind.FirstAssignment &&
    at.parent.operatorToken.kind <= ts.SyntaxKind.LastAssignment
  );
};

/** What reflection writes a property through when it is handed the instance. */
const REFLECTING = /^(?:Object|Reflect)$/;

/** The inputs a class's decorators name in their `inputs` metadata, by the class member's name. */
const metadataInputs = (owner) =>
  (ts.getDecorators(owner) ?? []).flatMap((decorator) => {
    const [meta] = ts.isCallExpression(decorator.expression)
      ? decorator.expression.arguments
      : [];
    const inputs =
      meta !== undefined && ts.isObjectLiteralExpression(meta)
        ? meta.properties.find(
            (p) =>
              ts.isPropertyAssignment(p) &&
              (ts.isIdentifier(p.name) || ts.isStringLiteral(p.name)) &&
              p.name.text === 'inputs',
          )?.initializer
        : undefined;
    return inputs !== undefined && ts.isArrayLiteralExpression(inputs)
      ? inputs.elements.flatMap((e) =>
          ts.isStringLiteralLike(e) ? [e.text.split(':')[0].trim()] : [],
        )
      : [];
  });

/**
 * Whether a field holds what its initializer says. It is `readonly`, so that nothing outside the
 * class replaces it; it is no input, by decorator or by the class's `inputs`, since a template sets
 * an input; and the class neither writes it — by an assignment, `++`, a destructuring, a cast
 * receiver (`(this as any).order = …`) — nor hands the instance to `Object` or `Reflect`, which
 * write any of its properties (`Object.assign(this, …)`).
 */
const settled = (owner, field) => {
  if (!(ts.getCombinedModifierFlags(field) & ts.ModifierFlags.Readonly))
    return false;
  if (
    (ts.getDecorators(field) ?? []).some(
      (d) =>
        ts.isCallExpression(d.expression) &&
        ts.isIdentifier(d.expression.expression) &&
        d.expression.expression.text === 'Input',
    ) ||
    metadataInputs(owner).includes(field.name.text)
  )
    return false;
  let changed = false;
  const visit = (node) => {
    if (node.kind === ts.SyntaxKind.ThisKeyword) {
      const at = dressed(node);
      const access = at.parent;
      if (
        (ts.isPropertyAccessExpression(access) ||
          ts.isElementAccessExpression(access)) &&
        access.expression === at
      ) {
        const name = ts.isPropertyAccessExpression(access)
          ? access.name.text
          : textOf(access.argumentExpression);
        if (name === field.name.text && writtenTo(access)) changed = true;
      } else if (
        ts.isCallExpression(access) &&
        access.arguments.includes(at) &&
        ts.isPropertyAccessExpression(bare(access.expression)) &&
        ts.isIdentifier(bare(access.expression).expression) &&
        REFLECTING.test(bare(access.expression).expression.text)
      )
        changed = true;
    }
    ts.forEachChild(node, visit);
  };
  visit(owner);
  return !changed;
};

/** What a field holds, where it is settled; `null` where anything may replace it. */
const fieldValues = (owner, field) =>
  settled(owner, field) ? tsValues(field.initializer ?? null) : null;

/**
 * The values a bound expression can take, off Angular's own expression tree: a literal, a signed
 * one, either branch of a condition, and — where the class is known, as a `host` block's is — a
 * member called with nothing around it: what a method returns, what a settled `computed` holds.
 * The members it reads go into `consulted`: a class that extends this one may override them.
 * Anything else is `null`, and refused: a template variable (`$index`), a pipe, a property read,
 * an input, a member of a class the template does not name.
 */
const ngValues = (ast, owner, consulted = new Set()) => {
  if (ast instanceof LiteralPrimitive) return [ast.value];
  if (ast instanceof Unary)
    return (
      ngValues(ast.expr, owner, consulted)?.map((v) =>
        ast.operator === '-' ? -v : Number(v),
      ) ?? null
    );
  if (ast instanceof Conditional)
    return union(
      ngValues(ast.trueExp, owner, consulted),
      ngValues(ast.falseExp, owner, consulted),
    );
  if (
    ast instanceof Call &&
    ast.receiver instanceof PropertyRead &&
    ast.receiver.receiver instanceof ImplicitReceiver
  ) {
    const member = memberOf(owner, ast.receiver.name);
    if (member !== undefined) consulted.add(ast.receiver.name);
    if (member !== undefined && ts.isMethodDeclaration(member))
      return union(...returnsOf(member).map(tsValues));
    if (member !== undefined && ts.isPropertyDeclaration(member))
      return fieldValues(owner, member);
  }
  return null;
};

/** A `host` entry's value, parsed as `ngc` parses one: an expression of the class it decorates. */
const EXPRESSIONS = new Parser(new Lexer());
const bindingValues = (path, expression, owner, consulted) => {
  const at = new ParseLocation(new ParseSourceFile(expression, path), 0, 0, 0);
  const parsed = EXPRESSIONS.parseBinding(
    expression,
    new ParseSourceSpan(at, at),
    0,
  );
  return parsed.errors.length ? null : ngValues(parsed.ast, owner, consulted);
};

/** The bindings that reach an element's attribute: a property, a two-way one, and `attr.`. */
const REACHING = new Set([
  BindingType.Property,
  BindingType.TwoWay,
  BindingType.Attribute,
]);

/**
 * Every element of an HTML tree, an ICU's cases included: the base visitor does not enter a case,
 * and the markup there is rendered — Angular's i18n sanitizer keeps `tabindex` and `accesskey`.
 */
class Elements extends RecursiveVisitor {
  found = [];
  visitElement(node, context) {
    this.found.push(node);
    return super.visitElement(node, context);
  }
  visitExpansionCase(node, context) {
    visitAll(this, node.expression, context);
  }
}
const TEMPLATE_LEXING = {
  tokenizeExpansionForms: true,
  tokenizeBlocks: true,
  tokenizeLet: true,
};
const elementsOf = (text, path, options = {}) => {
  const visitor = new Elements();
  visitAll(visitor, new HtmlParser().parse(text, path, options).rootNodes);
  return visitor.found;
};

/** Each tabindex written on an element of an HTML tree, its name in any case. */
const writtenTabindex = (elements, lineOf, out) => {
  for (const element of elements)
    for (const a of element.attrs)
      if (a.name.toLowerCase() === 'tabindex')
        out.push({
          line: lineOf(a),
          values: [a.value],
          spelling: `${a.name}="${a.value}"`,
        });
};

/**
 * A piece of markup that ends inside a tabindex, leaving its value to whatever is joined to it — a
 * `+`, a substitution, `concat`, `join`: a tag left open on the name (`'<b tabindex'`) or a value
 * begun and not closed (`'<b tabindex="'`, `'<b tabindex="0'`, which a `5` makes `05`).
 */
const OPEN_VALUE = /(?:<[^>]*\btabindex\s*|\btabindex\s*=\s*["']?[^"'\s>]*)$/i;

/**
 * The tabindex a string writes, read as markup: a string handed to `innerHTML`, `srcdoc` or
 * `insertAdjacentHTML` is parsed by the engine, and the sanitizer keeps the attribute. Every
 * string holding a `<` is read so, whatever takes it — a string that is never markup is read as
 * markup too, an over-approximation the library pays nothing for. A string that ends inside a
 * tabindex (`OPEN_VALUE`) leaves the value to an expression, which the reading cannot judge.
 * `lineOf` places an attribute by its line in the string.
 */
const markupWrites = (text, lineOf, out) => {
  if (OPEN_VALUE.test(text))
    out.push({ line: lineOf(0), values: null, spelling: text.slice(-60) });
  if (text.includes('<'))
    for (const element of elementsOf(text, 'markup'))
      for (const a of element.attrs)
        if (a.name.toLowerCase() === 'tabindex')
          out.push({
            line: lineOf(a.sourceSpan.start.line),
            values: [a.value],
            spelling: `${a.name}="${a.value}"`,
          });
};

/** The strings of a template's expressions, read as markup (`markupWrites`). */
class ExpressionStrings extends CombinedRecursiveAstVisitor {
  constructor(text, out) {
    super();
    this.text = text;
    this.out = out;
  }
  lineOf(span) {
    const first = this.text.slice(0, span.start).split('\n').length;
    const within = this.text.slice(span.start, span.end).includes('\n');
    return (line) => first + (within ? line : 0);
  }
  visitLiteralPrimitive(ast) {
    if (typeof ast.value === 'string')
      markupWrites(ast.value, this.lineOf(ast.sourceSpan), this.out);
  }
  visitTemplateLiteralElement(ast) {
    markupWrites(ast.text, this.lineOf(ast.sourceSpan), this.out);
  }
}

/** The bound tabindex of each element of a template tree, in every syntax Angular binds it by. */
class BoundTabindex extends TmplAstRecursiveVisitor {
  constructor(out) {
    super();
    this.out = out;
  }
  visitElement(node) {
    for (const input of node.inputs)
      if (REACHING.has(input.type) && input.name.toLowerCase() === 'tabindex')
        this.out.push({
          line: input.sourceSpan.start.line + 1,
          values: ngValues(input.value.ast, undefined),
          spelling: input.sourceSpan.toString(),
        });
    super.visitElement(node);
  }
}

/**
 * One template, read as `ngc` reads it: its first error, its `<style>` elements — which `ngc`
 * takes into the component's styles — and every tabindex it writes, each `{ line, values,
 * spelling }`:
 *
 * - written, off the HTML tree, in any case, an ICU's cases included: `TABINDEX="4"` is the
 *   attribute, as `setAttribute` lowers a name on an HTML element;
 * - bound, off the template tree, by a property, a two-way or an `attr.` binding in any syntax
 *   (`[tabIndex]`, `[attr.tabindex]`, `bind-tabindex`, `tabindex="{{ … }}"`), its value judged
 *   where the template says it as a literal or a condition of literals. Anything else is refused:
 *   an interpolation, and a member the binding calls, which is not looked up, since a template
 *   file does not name its class — no binding of the library calls one;
 * - in a string of an expression, read as markup.
 *
 * A name in a namespace (`xlink:tabindex`) is no tabindex to the platform, and is not read.
 */
const templateReading = memo((path, text) => {
  const { nodes, errors, styles } = parseTemplate(text, path, {
    preserveWhitespaces: false,
  });
  if (errors?.length) return { error: errors[0].msg, writes: [], styles: [] };
  const writes = [];
  writtenTabindex(
    elementsOf(text, path, TEMPLATE_LEXING),
    (a) => a.sourceSpan.start.line + 1,
    writes,
  );
  tmplAstVisitAll(new BoundTabindex(writes), nodes);
  new ExpressionStrings(text, writes).visitAllTemplateNodes(nodes);
  return { writes, styles };
});

/**
 * The name a TypeScript key or argument writes, as a `host` key and `@HostBinding` take it:
 * `[tabIndex]` and `[attr.tabindex]` bound, `tabIndex` as the property, `TABINDEX` as the
 * attribute.
 */
const writtenName = (text) =>
  text
    .replace(/^\[(.*)\]$/s, '$1')
    .replace(/^attr\./, '')
    .toLowerCase();

/** A property's name off an access, by dot or by a key the source writes: `a.b`, `a['b']`. */
const accessedName = (node) =>
  ts.isPropertyAccessExpression(node)
    ? node.name.text
    : ts.isElementAccessExpression(node)
      ? textOf(node.argumentExpression)
      : undefined;

/** A call's name, off its callee: `createElement` of `document.createElement` or of `d['createElement']`. */
const calleeName = (call) =>
  ts.isIdentifier(bare(call.expression))
    ? bare(call.expression).text
    : accessedName(bare(call.expression));

/**
 * The calls that only read a name, and write nothing when given no value: a test, a read, a
 * removal, a selector. Any other call naming `tabindex` with nothing after it writes something the
 * reading cannot judge — `createAttribute('tabindex')` makes a node a later `.value` fills.
 */
const READS = new Set([
  'getAttribute',
  'hasAttribute',
  'removeAttribute',
  'querySelector',
  'querySelectorAll',
  'closest',
  'matches',
]);

/** Where the orientation can be read: `screen`, and `window`, whose own is the legacy angle. */
const ORIENTED = new Set(['screen', 'window']);

/**
 * One TypeScript source, parsed once (`decoratorsOf`):
 *
 * - `writes` — every tabindex it writes, `{ line, values, spelling, owner }`: an object's key, a
 *   static one judged as the attribute's value (`tabindex: '0'`) and a bracketed one as a binding
 *   of the class it stands in (`'[tabindex]': 'rovingIndex()'`); a call's string argument naming
 *   it — `setAttribute`, `setAttributeNS`, a renderer's `setAttribute` and `setProperty` — judged by
 *   the argument after it, unless the call only reads (`READS`); `@HostBinding`'s, judged by the
 *   field it decorates, a getter refused; an assignment to a property of that name
 *   (`el.tabIndex = 1`, `el['tabIndex'] = 1`); each string but an inline template, read as markup;
 *   and a decorator's inline `template`, read as a template file is, or refused where it is no
 *   string the parser holds whole (a constant, a concatenation, a substitution). `owner` names the
 *   class whose members a judged value was read off;
 * - `cooked` — the text of each string and each name (`cookedHolding`);
 * - `created` — each element a script creates, by the name a call hands over:
 *   `createElement(name)`, `createElementNS(ns, name)`, by dot or key, and `new Audio()`;
 * - `oriented` — each read of `orientation` off the screen or the window, by dot or key, casts
 *   taken off (`bare`): `screen.orientation` and its lock among them;
 * - `sheets` and `queries` — the strings a decorator's `styles` and an inline template's `<style>`
 *   hold, and the strings `matchMedia` is handed, for `orientationIn` to compile;
 * - `extended` — the name of each class a class here extends, an imported alias read back to the
 *   name it imports (`extendedIn`).
 *
 * Not read, by name: a key under a computed name (`['tabindex']`), an attribute or a tag named by
 * an expression (the SVG renderer's paint list, every name of which is geometry or paint), a
 * compound assignment or a destructuring one, a write in a template's event handler, a callee or a
 * receiver reached through an alias (`const ce = document.createElement.bind(document)`,
 * `globalThis.screen`, `const { orientation } = screen`, `document.defaultView`), a string that
 * mixes an escaped line break with real ones, which is placed by its real ones, and a class inside
 * a namespace or a function, which every gate reading a decorator refuses as one it did not read
 * (`decoratorsOf`'s `unseen`). Over-approximated: `toggleAttribute('tabindex', on)` judges `on`,
 * and an `@Input` aliased `tabindex` is taken for a write.
 */
const tsReading = memo((path, text) => {
  const { source, read } = decoratorsOf(path, text);
  const lineOf = (node) =>
    source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
  // The line of a line inside a string, where the string's lines are the source's own.
  const linesIn = (node) => (line) =>
    lineOf(node) + (node.getText(source).includes('\n') ? line : 0);
  const classOf = (node) => {
    let at = node.parent;
    while (at !== undefined && !ts.isClassLike(at)) at = at.parent;
    return at;
  };
  const writes = [];
  const cooked = [];
  const created = [];
  const oriented = [];
  const sheets = [];
  const queries = [];
  const extended = new Set();
  const imported = new Map();
  const write = (node, values, owner) =>
    writes.push({
      line: lineOf(node),
      values,
      spelling: node.getText(source),
      owner: owner?.name?.text,
    });

  const inlines = new Set();
  for (const cls of source.statements.filter(ts.isClassDeclaration))
    for (const decorator of ts.getDecorators(cls) ?? []) {
      const metadata = read(decorator.getStart(source));
      const styles = metadata?.get('styles');
      for (const sheet of styles === undefined
        ? []
        : ts.isArrayLiteralExpression(styles)
          ? styles.elements
          : [styles])
        sheets.push({
          line: lineOf(sheet),
          text: textOf(sheet),
          spelling: sheet.getText(source),
        });
      const inline = metadata?.get('template');
      if (inline === undefined) continue;
      if (textOf(inline) === undefined) {
        writes.push({
          line: lineOf(inline),
          values: null,
          unread: `a template given by \`${inline.getText(source).slice(0, 40)}\``,
        });
        continue;
      }
      inlines.add(inline);
      const template = templateReading(`${path} (template)`, textOf(inline));
      if (template.error)
        writes.push({
          line: lineOf(inline),
          values: null,
          unread: template.error,
        });
      for (const style of template.styles)
        sheets.push({ line: lineOf(inline), text: style, spelling: style });
      for (const w of template.writes)
        writes.push({ ...w, line: linesIn(inline)(w.line - 1) });
    }

  const visit = (node) => {
    if (
      (ts.isPropertyAssignment(node) ||
        ts.isShorthandPropertyAssignment(node)) &&
      (ts.isIdentifier(node.name) || ts.isStringLiteral(node.name)) &&
      writtenName(node.name.text) === 'tabindex'
    ) {
      const consulted = new Set();
      const owner = classOf(node);
      write(
        node,
        /^\[.*\]$/s.test(node.name.text)
          ? bindingValues(
              path,
              textOf(node.initializer) ?? '',
              owner,
              consulted,
            )
          : tsValues(node.initializer ?? null),
        consulted.size ? owner : undefined,
      );
    }
    if (ts.isCallExpression(node)) {
      node.arguments.forEach((argument, i) => {
        if (
          !ts.isStringLiteralLike(argument) ||
          writtenName(argument.text) !== 'tabindex' ||
          READS.has(calleeName(node))
        )
          return;
        if (!ts.isDecorator(node.parent))
          write(
            node,
            node.arguments[i + 1] === undefined
              ? null
              : tsValues(node.arguments[i + 1]),
          );
        else if (ts.isPropertyDeclaration(node.parent.parent))
          write(
            node,
            fieldValues(classOf(node), node.parent.parent),
            classOf(node),
          );
        else write(node, null);
      });
      const [first, second] = node.arguments;
      const named =
        calleeName(node) === 'createElementNS'
          ? { name: second, namespaced: true }
          : calleeName(node) === 'createElement'
            ? { name: first, namespaced: second !== undefined }
            : undefined;
      if (named?.name !== undefined && ts.isStringLiteralLike(named.name))
        created.push({
          line: lineOf(node),
          name: named.name.text,
          namespaced: named.namespaced,
          spelling: node.getText(source),
        });
      if (calleeName(node) === 'matchMedia' && textOf(first) !== undefined)
        queries.push({ line: lineOf(node), text: textOf(first) });
    }
    if (
      ts.isNewExpression(node) &&
      (ts.isIdentifier(bare(node.expression))
        ? bare(node.expression).text
        : accessedName(bare(node.expression))) === 'Audio'
    )
      created.push({
        line: lineOf(node),
        name: 'audio',
        namespaced: false,
        spelling: node.getText(source),
      });
    if (
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
      (ts.isPropertyAccessExpression(node.left) ||
        ts.isElementAccessExpression(node.left)) &&
      (ts.isPropertyAccessExpression(node.left)
        ? node.left.name.text
        : textOf(node.left.argumentExpression)
      )?.toLowerCase() === 'tabindex'
    )
      write(node, tsValues(node.right));
    if (ts.isStringLiteralLike(node) || ts.isTemplateLiteralToken(node)) {
      cooked.push({ line: lineOf(node), text: node.text });
      if (!inlines.has(node)) markupWrites(node.text, linesIn(node), writes);
    }
    if (ts.isIdentifier(node))
      cooked.push({ line: lineOf(node), text: node.text });
    const receiver =
      accessedName(node) === 'orientation' ? bare(node.expression) : undefined;
    if (
      receiver !== undefined &&
      ((ts.isIdentifier(receiver) && ORIENTED.has(receiver.text)) ||
        accessedName(receiver) === 'screen')
    )
      oriented.push({ line: lineOf(node), spelling: node.getText(source) });
    if (ts.isImportSpecifier(node) && node.propertyName !== undefined)
      imported.set(node.name.text, node.propertyName.text);
    if (
      ts.isHeritageClause(node) &&
      node.token === ts.SyntaxKind.ExtendsKeyword
    )
      for (const type of node.types) {
        const base = bare(type.expression);
        const name = ts.isIdentifier(base) ? base.text : accessedName(base);
        if (name !== undefined) extended.add(name);
      }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return {
    writes,
    cooked,
    created,
    oriented,
    sheets,
    queries,
    extended: new Set([...extended].map((name) => imported.get(name) ?? name)),
  };
});

/**
 * The classes some class of the sources extends, by name — a namesake in another file counts too,
 * over-approximated. A value read off a member of one of them is one a subclass may override:
 * Angular evaluates an inherited `host` binding on the subclass's instance (`PctSelectBase` and
 * its two subclasses are the library's own case).
 */
const extendedIn = (sources) =>
  new Set(
    Object.entries(sources).flatMap(([path, text]) =>
      path.endsWith('.ts') ? [...tsReading(path, text).extended] : [],
    ),
  );

/**
 * Where a source writes a positive tabindex, or one whose value the reading cannot judge — a
 * value read off a member of a class another class extends among them (`context.extended()`).
 */
const positiveTabindexIn = (path, text, context) => {
  const reading = path.endsWith('.ts')
    ? tsReading(path, text)
    : templateReading(path, text);
  if (reading.error)
    return `\`${path}\` does not parse (${reading.error}), and the scan cannot read it`;
  const found = reading.writes.find(
    (w) =>
      w.values === null ||
      w.values.some(positive) ||
      (w.owner !== undefined && context.extended().has(w.owner)),
  );
  if (found === undefined) return undefined;
  if (found.unread !== undefined)
    return (
      `\`${path}:${found.line}\` holds a template the scan cannot read (${found.unread}), ` +
      `and a tabindex there is one it cannot judge`
    );
  if (found.values !== null && !found.values.some(positive))
    return (
      `\`${path}:${found.line}\` writes one the scan cannot judge (${quoted(found.spelling)}): ` +
      `a class extends \`${found.owner}\`, and may override the member the value is read off`
    );
  return found.values === null
    ? `\`${path}:${found.line}\` writes one the scan cannot judge (${quoted(found.spelling)}): ` +
        `it reads a literal, a signed one and a condition of them, and what a method or a settled ` +
        `\`computed\` of the class a binding stands in returns`
    : `\`${path}:${found.line}\` holds one (${quoted(found.spelling)})${BROKEN}`;
};

/**
 * The word `orientation`, which no hyphen or letter joins to another (`aria-orientation`); an
 * attribute selector and a string of that name (`[orientation='vertical']`,
 * `content: 'orientation'`) are words too, over-approximated.
 */
const ORIENTATION = /(?<![\w-])orientation(?![\w-])/i;
/** A media query on it in a string a script hands to `matchMedia`: `(orientation: portrait)`. */
const MEDIA_QUERY = /\(\s*orientation\s*:/i;
/** The event that says the orientation changed, by its type or the window's `on…` property. */
const ORIENTATION_EVENT = /orientationchange/i;

/**
 * A stylesheet as the browser gets it: compiled, so that a comment is no reading and a feature
 * spelled by interpolation or a mixin of another file is one. A sheet that does not compile is
 * refused as one the scan cannot read; the build refuses it as well.
 */
const compiled = memo((path, sheet) => {
  try {
    return sass.compileString(sheet, {
      url: pathToFileURL(join(ROOT, path)),
      syntax: path.endsWith('.scss') ? 'scss' : 'css',
      style: 'compressed',
    }).css;
  } catch (error) {
    return { error: error.message.split('\n')[0] };
  }
});

/** The first place a compiled sheet holds the word, as a refusal names it; or why it does not compile. */
const sheetHolding = (where, file, sheet) => {
  const css = compiled(file, sheet);
  if (css.error)
    return `${where} does not compile (${css.error}), and the scan cannot read it`;
  const at = ORIENTATION.exec(css);
  return at
    ? `${where} compiles to one (${quoted(css.slice(Math.max(0, at.index - 20), at.index + 30))})${BROKEN}`
    : undefined;
};

/**
 * Where a source reads the display orientation. A stylesheet — `.scss`, `.css`, a template's
 * `<style>`, a decorator's `styles` — that compiles to the word anywhere: an `@media` feature,
 * `@viewport`'s descriptor, and, over-approximated, an `@container` query on a box's orientation.
 * A query a script hands `matchMedia`, compiled as one, so that a comment or an escape in it
 * (`(\6f rientation: …)`) is read as the engine reads it; a media query on it in any other string.
 * A template or a script listening to `orientationchange`, behind an escape too. A read of the
 * orientation off the screen or the window (`tsReading`'s `oriented`). A stylesheet's own words —
 * a comment naming the event — are not read for the event.
 */
const orientationIn = (path, text) => {
  if (path.endsWith('.html') || path.endsWith('.ts')) {
    const event =
      lineHolding(path, text, ORIENTATION_EVENT) ??
      cookedHolding(path, text, ORIENTATION_EVENT);
    if (event !== undefined) return event;
  }
  if (path.endsWith('.ts')) {
    const reading = tsReading(path, text);
    for (const sheet of reading.sheets) {
      if (sheet.text === undefined)
        return (
          `\`${path}:${sheet.line}\` holds a stylesheet the scan cannot read ` +
          `(${quoted(sheet.spelling)}), and an orientation there is one it cannot see`
        );
      const found = sheetHolding(
        `\`${path}:${sheet.line}\``,
        `${path}.css`,
        sheet.text ?? '',
      );
      if (found !== undefined) return found;
    }
    for (const query of reading.queries) {
      const found = sheetHolding(
        `\`${path}:${query.line}\``,
        `${path}.css`,
        `@media ${query.text}{a{b:c}}`,
      );
      if (found !== undefined) return found;
    }
    const at =
      reading.cooked.find((c) => MEDIA_QUERY.test(c.text)) ??
      reading.oriented.map((s) => ({ line: s.line, text: s.spelling }))[0];
    return (
      at && `\`${path}:${at.line}\` holds one (${quoted(at.text)})${BROKEN}`
    );
  }
  const sheets = path.endsWith('.html')
    ? templateReading(path, text).styles
    : [text];
  for (const sheet of sheets) {
    const found = sheetHolding(
      `\`${path}\``,
      path.endsWith('.html') ? `${path}.css` : path,
      sheet,
    );
    if (found !== undefined) return found;
  }
  return undefined;
};

for (const scan of Object.values(SCANS))
  if (!scan.whole) scan.find = memo(scan.find);

/** The cards' row this gate reads when the pass is claimed as recorded (point 7). */
const SCREEN_READER_ROW = 'Screen-reader log';

/**
 * A violation of one of the eight points. It carries the point's identifier, not just the
 * message: the negative control has to verify that a prepared input fired ON ITS OWN point.
 */
class AcrError extends Error {
  constructor(check, description) {
    super(description);
    this.check = check;
  }
}

// ── reading the repository ────────────────────────────────────────────────────

const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');

/** Every file under the entrypoints' `src` directories, by extension, specs left out. */
const librarySources = () => {
  const out = {};
  for (const entry of readdirSync(join(ROOT, LIB))) {
    const src = join(ROOT, LIB, entry, 'src');
    if (!existsSync(src) || !statSync(src).isDirectory()) continue;
    for (const file of readdirSync(src)) {
      const ext = file.split('.').pop();
      if (
        !['css', 'html', 'scss', 'ts'].includes(ext) ||
        file.endsWith('.spec.ts')
      )
        continue;
      out[`${LIB}/${entry}/src/${file}`] = readFileSync(
        join(src, file),
        'utf8',
      );
    }
  }
  return out;
};

const ROW = /^\s*\|(.*)\|\s*$/;
/** The `## Checks` table of one card, as `{ criterion, evidence }` rows of trimmed cells. */
const checksOf = (text) => {
  const rows = [];
  let on = false;
  for (const line of text.split('\n')) {
    if (/^## /.test(line)) on = /^## Checks\b/.test(line);
    if (!on) continue;
    const m = line.match(ROW);
    if (!m) continue;
    const cells = m[1].split('|').map((c) => c.trim());
    if (cells.length < 2 || cells[0] === 'criterion' || /^-+$/.test(cells[0]))
      continue;
    rows.push({ criterion: cells[0], evidence: cells[1] });
  }
  return rows;
};

const readCards = () =>
  Object.fromEntries(
    readdirSync(join(ROOT, CARDS_DIR))
      .filter(
        (f) => f.endsWith('.md') && f !== 'README.md' && f !== '_template.md',
      )
      .sort()
      .map((f) => [
        f.replace(/\.md$/, ''),
        checksOf(read(`${CARDS_DIR}/${f}`)),
      ]),
  );

/** Requirement ids with the file that declares them, and the lesson ids — for the links. */
const readIds = () => {
  const reqFile = {};
  for (const file of [
    'docs/00-axis.md',
    ...readdirSync(join(ROOT, 'docs/requirements'))
      .filter((f) => f.endsWith('.md'))
      .map((f) => `docs/requirements/${f}`),
  ])
    for (const [, id] of read(file).matchAll(/id="(req-[a-z0-9-]+)"/g))
      reqFile[id] = file.replace(/^docs\//, '');
  const lessons = new Set(
    [...read('docs/lessons.md').matchAll(/id="(lesson-\d+)"/g)].map(
      (m) => m[1],
    ),
  );
  return { reqFile, lessons };
};

/**
 * The act table of the reader walk — per route, the control an act presses and the spec
 * cited as the owner of the gesture — read with the TypeScript parser and not a pattern
 * (`lesson-236`). A field that is not a string literal reads as absent, and point 7 then
 * says the citation resolves to nothing.
 */
const readActs = () => {
  const source = ts.createSourceFile(
    ACTS,
    read(ACTS),
    ts.ScriptTarget.Latest,
    true,
  );
  const text = (node) =>
    node && ts.isStringLiteralLike(node) ? node.text : undefined;
  const acts = {};
  const visit = (node) => {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === 'ACTS' &&
      node.initializer &&
      ts.isObjectLiteralExpression(node.initializer)
    )
      for (const entry of node.initializer.properties) {
        const route = ts.isPropertyAssignment(entry)
          ? text(entry.name)
          : undefined;
        if (
          route === undefined ||
          !ts.isObjectLiteralExpression(entry.initializer)
        )
          continue;
        acts[route] = Object.fromEntries(
          entry.initializer.properties
            .filter(
              (f) => ts.isPropertyAssignment(f) && ts.isIdentifier(f.name),
            )
            .map((f) => [f.name.text, text(f.initializer)]),
        );
      }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return acts;
};

/** One view's section of a reader's log: its heading to the next one, or `null`. */
const sectionOf = (log, route) => {
  const from = log.indexOf(`### \`${route}\`\n`);
  if (from === -1) return null;
  const next = log.indexOf('\n### ', from + 1);
  return log.slice(from, next === -1 ? undefined : next);
};

/**
 * Every path the claims cite, and every spec the act table names as an owner, read once —
 * a fixture overrides the map, not the disk.
 */
const readTexts = (claims, files, acts) => {
  const texts = {};
  const cited = [
    ...(claims.criteria ?? []).flatMap((c) =>
      (c.evidence ?? []).map((e) => e.gate ?? e.spec ?? e.source),
    ),
    ...Object.values(acts).map((act) => act.owner),
  ];
  for (const path of cited)
    if (path && files.has(path) && texts[path] === undefined)
      texts[path] = read(path);
  return texts;
};

const readInput = () => {
  const claims = JSON.parse(read(CLAIMS));
  const files = new Set(
    execSync('git ls-files', { cwd: ROOT, encoding: 'utf8' })
      .split('\n')
      .filter(Boolean),
  );
  const at = join(ROOT, claims.assistiveTechnology?.logs ?? 'docs/acr/at/');
  const atLogs = existsSync(at)
    ? readdirSync(at)
        .filter((f) => f.endsWith('.md'))
        .sort()
    : [];
  const atTexts = Object.fromEntries(
    atLogs.map((f) => [f, readFileSync(join(at, f), 'utf8')]),
  );
  const acts = readActs();
  return {
    claims,
    files,
    texts: readTexts(claims, files, acts),
    sources: librarySources(),
    cards: readCards(),
    ids: readIds(),
    decisions: readdirSync(join(ROOT, 'docs/decisions')).filter((f) =>
      /^\d{4}-.*\.md$/.test(f),
    ),
    ci: read(CI),
    plan: read(PLAN),
    acts,
    atLogs,
    atTexts,
    // How much of the sandbox each log actually covers. Counting the FILES is what the
    // report used to do, and three files would have read as three readings — while two of
    // them can be a single view out of thirty-six, taken to prove a runner works.
    atViews: atLogs.map((f) =>
      Number(/over (\d+) views?/.exec(atTexts[f])?.[1] ?? 0),
    ),
    version: JSON.parse(read(MANIFEST)).version,
    rendered: existsSync(join(ROOT, REPORT)) ? read(REPORT) : null,
  };
};

// ── the eight points ──────────────────────────────────────────────────────────

/** Which target runs this file — the same reading `check-docs` makes of a cited path. */
const impliedTarget = (path) => {
  const gate = path.match(/^tools\/(check-[a-z-]+)\.mjs$/);
  if (gate) return gate[1];
  if (path.startsWith('apps/sandbox-e2e/') || path.startsWith('apps/docs-e2e/'))
    return 'e2e';
  if (path.startsWith('libs/components/') && path.endsWith('.spec.ts'))
    return 'test';
  return null;
};

/*
 * Which targets CI runs. The reading lives in `workflow-targets.mjs`, and moving it there
 * fixed two defects this copy had: it held `\s` in its class, so a match could run past the
 * newline into the next step, and it read neither comments nor options. The second one had
 * teeth — the sharded browser job puts `--shard=…` between the command and `-t`, so this
 * gate stopped seeing the `e2e` run line, while a COMMENT naming it was enough to answer
 * "the suite runs in CI" with the run line deleted (0081).
 */
const ciTargets = (ci) => targetsIn(ci);

/** What one Checks row says: measured (a path), argued (deliberately, not applicable), a gap. */
const rowState = (evidence) => {
  if (/^none\s+—\s+gap/i.test(evidence)) return 'gap';
  if (/^(none\s+—\s+deliberately|not applicable)/i.test(evidence))
    return 'argued';
  return 'measured';
};

/** The cards' rows behind one `cards` citation: who measured, who argued, who owes. */
const aggregate = (cards, label) => {
  const out = { label, measured: [], argued: [], gaps: [], missing: [] };
  for (const [id, rows] of Object.entries(cards)) {
    const row = rows.find((r) => r.criterion.includes(label));
    if (!row) out.missing.push(id);
    else
      out[
        rowState(row.evidence) === 'gap' ? 'gaps' : rowState(row.evidence)
      ].push(id);
  }
  return out;
};

const findingState = (plan, n) => {
  const m = plan.match(
    new RegExp(`^- \\[( |x|~|-)\\] \\*\\*${n.replace('.', '\\.')} — `, 'm'),
  );
  return m ? m[1] : null;
};

/**
 * Runs the eight points over one input and returns what the report is rendered from.
 * Throws `AcrError` on the first violation — the points run from the most basic one, so
 * the later ones would have nothing to examine anyway.
 */
const checkAcr = (input) => {
  const { claims, files, texts, sources, cards, ids, decisions, plan } = input;
  const rows = claims.criteria ?? [];

  // 1. CATALOGUE
  const seen = new Set();
  for (const row of rows) {
    if (!BY_ID.has(row.id))
      throw new AcrError(
        'catalogue',
        `\`${row.id}\` is not a success criterion of WCAG 2.2 at level A or AA — the report ` +
          `is the 55 of the standard, in the standard's order, and nothing else`,
      );
    if (seen.has(row.id))
      throw new AcrError('catalogue', `\`${row.id}\` is claimed twice`);
    seen.add(row.id);
  }
  const missing = CATALOGUE.filter(([id]) => !seen.has(id)).map(([id]) => id);
  if (missing.length)
    throw new AcrError(
      'catalogue',
      `${missing.length} success criteria have no row: ${missing.join(', ')} — a report ` +
        `that skips a criterion is read as passing it`,
    );

  // 2. LEVEL
  for (const row of rows) {
    if (!LEVELS.includes(row.conformance))
      throw new AcrError(
        'level',
        `\`${row.id}\` says "${row.conformance}", which is none of the five words: ` +
          LEVELS.join(', '),
      );
    if (typeof row.remarks !== 'string' || !row.remarks.trim())
      throw new AcrError(
        'level',
        `\`${row.id}\` carries no remark — every row says in words what the level rests on`,
      );
    if (!Array.isArray(row.evidence))
      throw new AcrError('level', `\`${row.id}\` has no evidence list`);
    for (const e of row.evidence) {
      const kind = Object.keys(e).find((k) => KINDS.has(k));
      if (!kind)
        throw new AcrError(
          'evidence',
          `\`${row.id}\` cites ${JSON.stringify(e)}, which is no kind of evidence this gate reads`,
        );
    }
    const kinds = row.evidence.map((e) =>
      Object.keys(e).find((k) => KINDS.has(k)),
    );
    const measures = kinds.some((k) => MEASURING.has(k));
    const findings = kinds.filter((k) => k === 'finding').length;
    const limits = findings + kinds.filter((k) => k === 'cards').length;
    if (row.conformance === 'Supports' && !measures)
      throw new AcrError(
        'level',
        `\`${row.id}\` says Supports on no measurement — a requirement, a lesson or a ` +
          `decision is prose about a gate, not the gate`,
      );
    if (row.conformance === 'Supports' && findings)
      throw new AcrError(
        'level',
        `\`${row.id}\` says Supports and cites an open finding — a limit with an owner is ` +
          `exactly what Partially Supports is for`,
      );
    if (row.conformance === 'Partially Supports' && !measures)
      throw new AcrError(
        'level',
        `\`${row.id}\` says Partially Supports on no measurement`,
      );
    if (row.conformance === 'Partially Supports' && !limits)
      throw new AcrError(
        'level',
        `\`${row.id}\` says Partially Supports and names no limit — an open finding, or a ` +
          `cards' row with a gap in it`,
      );
    if (
      ['Does Not Support', 'Not Evaluated'].includes(row.conformance) &&
      !findings
    )
      throw new AcrError(
        'level',
        `\`${row.id}\` says ${row.conformance} and cites no open finding — a criterion the ` +
          `library fails or nobody measures needs an owner in the plan`,
      );
  }

  // 3. EVIDENCE
  const targets = new Map();
  const scanned = new Map();
  let extended;
  const context = { extended: () => (extended ??= extendedIn(sources)) };
  for (const row of rows)
    for (const e of row.evidence) {
      const where = `\`${row.id}\``;
      if (
        e.gate !== undefined ||
        e.spec !== undefined ||
        e.source !== undefined
      ) {
        const path = e.gate ?? e.spec ?? e.source;
        if (!files.has(path) || texts[path] === undefined)
          throw new AcrError(
            'evidence',
            `${where} cites \`${path}\`, which is not a tracked file`,
          );
        const text = texts[path];
        for (const p of e.points ?? []) {
          if (!new RegExp(`^\\s*\\*\\s+${p}\\.\\s`, 'm').test(text))
            throw new AcrError(
              'evidence',
              `${where} cites point ${p} of \`${path}\`, and the gate's header numbers no ` +
                `such point`,
            );
        }
        for (const title of e.titles ?? [])
          if (!text.includes(title))
            throw new AcrError(
              'evidence',
              `${where} cites a case "${title}" that \`${path}\` does not hold — renamed, ` +
                `or never written`,
            );
        if (e.says !== undefined && !text.includes(e.says))
          throw new AcrError(
            'evidence',
            `${where} says \`${path}\` reads "${e.says}", and it does not`,
          );
        const target = impliedTarget(path);
        if (target) targets.set(path, target);
      }
      if (e.req !== undefined && !ids.reqFile[e.req])
        throw new AcrError(
          'evidence',
          `${where} cites \`${e.req}\`, which no requirement declares`,
        );
      if (e.lesson !== undefined && !ids.lessons.has(e.lesson))
        throw new AcrError(
          'evidence',
          `${where} cites \`${e.lesson}\`, which is not in lessons.md`,
        );
      if (
        e.decision !== undefined &&
        !decisions.some((f) => f.startsWith(`${e.decision}-`))
      )
        throw new AcrError(
          'evidence',
          `${where} cites decision ${e.decision}, which is not on disk`,
        );
      if (e.finding !== undefined && !/^\d+\.\d+$/.test(String(e.finding)))
        throw new AcrError(
          'evidence',
          `${where} cites finding "${e.finding}", which is not a plan number`,
        );
      if (e.scan !== undefined && !scanned.has(e.scan)) {
        // By its own key: `constructor` is a member of every object, and named no scan.
        const scan = Object.hasOwn(SCANS, e.scan) ? SCANS[e.scan] : undefined;
        if (!scan)
          throw new AcrError(
            'evidence',
            `${where} cites scan \`${e.scan}\`, which this gate does not know (${Object.keys(SCANS).join(', ')})`,
          );
        const over = Object.entries(sources).filter(([path]) =>
          scan.over.includes(path.split('.').pop()),
        );
        for (const [path, text] of over) {
          const found = scan.find(path, text, context);
          if (found !== undefined)
            throw new AcrError(
              'evidence',
              `${where} rests on scan \`${e.scan}\` (${scan.means}), and ${found}`,
            );
        }
        scanned.set(e.scan, over.length);
      }
    }

  // 4. WIRED
  const wired = ciTargets(input.ci);
  for (const [path, target] of targets)
    if (!wired.has(target))
      throw new AcrError(
        'wired',
        `\`${path}\` is cited as evidence, and the \`${target}\` target does not run in CI ` +
          `(\`nx affected -t\` in ci.yml) — a gate outside CI proves nothing about a commit`,
      );

  // 5. CARDS
  const aggregates = {};
  for (const row of rows)
    for (const e of row.evidence) {
      if (e.cards === undefined) continue;
      const agg = aggregate(cards, e.cards);
      aggregates[e.cards] = agg;
      const owed = [...agg.gaps, ...agg.missing];
      if (row.conformance === 'Supports' && owed.length)
        throw new AcrError(
          'cards',
          `\`${row.id}\` says Supports over the cards' \`${e.cards}\` row, and ${owed.length} ` +
            `of ${Object.keys(cards).length} cards owe it: ${owed.join(', ')} — a gap in a ` +
            `card is a gap in the claim`,
        );
      if (
        row.conformance === 'Partially Supports' &&
        !owed.length &&
        !row.evidence.some((x) => x.finding !== undefined)
      )
        throw new AcrError(
          'cards',
          `\`${row.id}\` says Partially Supports over the cards' \`${e.cards}\` row, and no ` +
            `card owes it any more — the limit has closed, the row is a Supports to raise`,
        );
    }

  // 6. FINDINGS
  for (const row of rows)
    for (const e of row.evidence) {
      if (e.finding === undefined) continue;
      const state = findingState(plan, String(e.finding));
      if (state === null)
        throw new AcrError(
          'finding',
          `\`${row.id}\` leans on finding ${e.finding}, and the plan has no such item`,
        );
      if (state === 'x' || state === '-')
        throw new AcrError(
          'finding',
          `\`${row.id}\` leans on finding ${e.finding}, which the plan marks ` +
            `${state === 'x' ? 'closed' : 'dropped'} — a limit that has gone is a claim to revisit`,
        );
    }

  // 7. THE PASS
  const at = claims.assistiveTechnology ?? {};
  // Three renderings read the flag and, since 2026-09-28, so does the status sentence — while
  // this point verifies the pass only when it is exactly `true`. A word in its place ("false",
  // "yes") is truthy: the pass went unverified and the report said "recorded", and would now
  // say the stronger word. The claims have no schema, so the flag is held to its type here.
  if (typeof at.recorded !== 'boolean')
    throw new AcrError(
      'pass',
      `the assistive-technology pass says \`"recorded": ${JSON.stringify(at.recorded)}\`, which ` +
        `is neither true nor false — every rendering reads the flag by its truthiness, not its meaning`,
    );
  if (
    !Array.isArray(at.readers) ||
    !at.readers.length ||
    typeof at.logs !== 'string'
  )
    throw new AcrError(
      'pass',
      `the assistive-technology pass names no readers or no place for its logs`,
    );
  // The act table's citations, recorded or not. The key that opens a menu has one home — the
  // spec that presses it — and the table points there instead of restating it (0017), so
  // the file it names must be tracked and must name the control the act presses. Two of nine
  // did not, for twelve days, and nothing read them.
  for (const [route, act] of Object.entries(input.acts)) {
    if (act.on === undefined || act.owner === undefined)
      throw new AcrError(
        'owner',
        `the act on \`${route}\` names its control or its owner with something other than a ` +
          `string literal, and this gate reads only literals`,
      );
    const control = /data-testid="([^"]+)"/.exec(act.on)?.[1] ?? act.on;
    if (!files.has(act.owner) || !texts[act.owner]?.includes(control))
      throw new AcrError(
        'owner',
        `the act on \`${route}\` cites \`${act.owner}\` as the owner of its gesture, and that ` +
          `file is not tracked or never names \`${control}\` — the citation resolves to ` +
          `nothing, and the act presses a control no spec owns`,
      );
  }
  const sr = aggregate(cards, SCREEN_READER_ROW);
  if (at.recorded === true) {
    if (!input.atLogs.length)
      throw new AcrError(
        'pass',
        `the pass is claimed as recorded and \`${at.logs}\` holds no log`,
      );
    const owed = [...sr.gaps, ...sr.missing, ...sr.argued];
    if (owed.length)
      throw new AcrError(
        'pass',
        `the pass is claimed as recorded and ${owed.length} cards carry no reading in their ` +
          `\`${SCREEN_READER_ROW}\` row: ${owed.join(', ')}`,
      );
    // Every act in every log, on the control the table names today. A record taken by a
    // walk that did not act answers the cards' opening question with silence and reads like
    // one that did; a record taken from an older table quotes a control nobody presses now.
    for (const [file, log] of Object.entries(input.atTexts))
      for (const [route, act] of Object.entries(input.acts)) {
        const section = sectionOf(log, route);
        if (!section || !/^open\s/m.test(section) || !section.includes(act.on))
          throw new AcrError(
            'pass',
            `the pass is claimed as recorded and \`${file}\` holds no \`open\` row on ` +
              `\`${act.on}\` under \`${route}\` — the act table names it (\`${ACTS}\`), so ` +
              `this record was taken without the act: by a walk that did not act, acted on ` +
              `something else, or never visited the view`,
          );
      }
  }

  // 8. RENDERING
  const rendered = renderAcr(input, aggregates, scanned, sr);
  return { rendered, aggregates, sr };
};

// ── the report ────────────────────────────────────────────────────────────────

const renderEvidence = (e, ids, aggregates, scanned) => {
  if (e.gate !== undefined) {
    const pts = e.points ?? [];
    return `\`${e.gate}\`${pts.length ? ` (point${pts.length > 1 ? 's' : ''} ${pts.join(', ')})` : ''}`;
  }
  if (e.spec !== undefined)
    return `\`${e.spec}\`${(e.titles ?? []).length ? ` › ${e.titles.map((t) => `"${t}"`).join(', ')}` : ''}`;
  if (e.source !== undefined)
    return `\`${e.source}\`${e.says !== undefined ? ` ("${e.says.replace(/`/g, '')}")` : ''}`;
  if (e.scan !== undefined)
    return `scan \`${e.scan}\` — no match in ${scanned.get(e.scan)} source files`;
  if (e.cards !== undefined) {
    const a = aggregates[e.cards];
    const total =
      a.measured.length + a.argued.length + a.gaps.length + a.missing.length;
    const held = a.measured.length + a.argued.length;
    const owed = [...a.gaps, ...a.missing];
    return (
      `the cards' \`${e.cards}\` row: ${held} of ${total} (${a.measured.length} measured, ` +
      `${a.argued.length} by argument${owed.length ? `; owed by ${owed.join(', ')}` : ''})`
    );
  }
  if (e.req !== undefined)
    return `[\`${e.req}\`](${ids.reqFile[e.req]}#${e.req})`;
  if (e.lesson !== undefined)
    return `[\`${e.lesson}\`](lessons.md#${e.lesson})`;
  if (e.decision !== undefined)
    return `decision [${e.decision}](decisions/README.md)`;
  if (e.finding !== undefined)
    return `finding ${e.finding} in [plan.md](plan.md)`;
  return '';
};

/** The template's three words under Supports: a row at one of them holds the report there. */
const BELOW = new Set([
  'Partially Supports',
  'Does Not Support',
  'Not Evaluated',
]);

/** "A", "A and B", "A, B and C" — three would read "A and B and C" without this. */
const listed = (items) =>
  items.length < 3
    ? items.join(' and ')
    : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`;

/** The plan's order for findings: 4.8 before 4.75, which the string's order gets wrong. */
const byNumber = (a, b) => {
  const [am, an] = a.split('.').map(Number);
  const [bm, bn] = b.split('.').map(Number);
  return am - bm || an - bn;
};

/**
 * The status sentence — the one line of the report a procurement reads first — read from
 * the claims so that it is true on the day it is rendered, not on the day it was written
 * (0061, amended 2026-09-28: for twelve days it stood two lines under "recorded" and said the
 * pass was what it waited for). Three states: the pass not on record — the decision's
 * sentence; on record with a row below Supports — the rows counted and their owners named,
 * a finding in the plan or a card that owes the row; on record with none — the word the
 * decision reserves for this report. A row below Supports always has an owner: point 2 and
 * point 5 refuse one without.
 */
const renderStatus = (claims, aggregates) => {
  const byId = new Map(claims.criteria.map((c) => [c.id, c]));
  const below = CATALOGUE.map(([id]) => byId.get(id)).filter((c) =>
    BELOW.has(c.conformance),
  );
  if (!claims.assistiveTechnology.recorded)
    return `**Status: machine-audited.** The library is built and machine-audited to WCAG 2.2 AA; it does
not call itself conformant until the assistive-technology pass is on record — the wording
law of decision 0061, held by the documentation site's own suite.`;
  if (!below.length)
    return (
      `**Status: conformant.** Every one of the ${CATALOGUE.length} rows reads Supports, on the ` +
      `evidence its row names, or Not Applicable, on something the library does not ship, and ` +
      `the assistive-technology pass is on record. The word is the one decision 0061 reserves for ` +
      `this report and for this state of it (amended 2026-09-28); the documentation site's landing ` +
      `keeps "machine-audited", a law of the same decision that the site's own suite holds and the ` +
      `report's word does not move.`
    );
  const findings = [
    ...new Set(
      below.flatMap((c) =>
        c.evidence
          .filter((e) => e.finding !== undefined)
          .map((e) => String(e.finding)),
      ),
    ),
  ].sort(byNumber);
  const owing = new Map();
  for (const c of below)
    for (const e of c.evidence) {
      if (e.cards === undefined) continue;
      const owed = [
        ...aggregates[e.cards].gaps,
        ...aggregates[e.cards].missing,
      ];
      if (owed.length) owing.set(e.cards, owed);
    }
  const held = [
    ...(findings.length
      ? [
          `finding${findings.length > 1 ? 's' : ''} ${listed(findings)} in [plan.md](plan.md)`,
        ]
      : []),
    ...[...owing].map(
      ([label, owed]) => `the cards' \`${label}\` row, owed by ${listed(owed)}`,
    ),
  ];
  return (
    `**Status: machine-audited.** The library is built and machine-audited to WCAG 2.2 AA, and ` +
    `the assistive-technology pass is on record; it does not call itself conformant while ` +
    `${below.length} row${below.length === 1 ? ' stands' : 's stand'} below Supports — ` +
    `${listed(below.map((c) => `${c.id} (${c.conformance})`))} — held by ${listed(held)}. ` +
    `The word is decision 0061's (amended 2026-09-28), and it changes the day every row reads ` +
    `Supports or Not Applicable.`
  );
};

/** The status sentence of a rendering: the word after `Status:`, and the paragraph on one line. */
const statusOf = (rendered) => {
  const m = /^\*\*Status: ([a-z-]+)\.\*\*[^\n]*(?:\n[^\n]+)*/m.exec(rendered);
  return m ? { word: m[1], sentence: m[0].replace(/\s+/g, ' ') } : null;
};

const renderAcr = (input, aggregates, scanned, sr) => {
  const { claims, ids, version, cards } = input;
  const byId = new Map(claims.criteria.map((c) => [c.id, c]));
  const table = (level) =>
    [
      '| Criterion | Conformance level | Remarks and explanations |',
      '| --- | --- | --- |',
      ...CATALOGUE.filter(([, , l]) => l === level).map(([id, name]) => {
        const c = byId.get(id);
        const evidence = c.evidence
          .map((e) => renderEvidence(e, ids, aggregates, scanned))
          .filter(Boolean);
        const remark =
          c.remarks.replace(/\|/g, '\\|') +
          (evidence.length ? ` _Evidence:_ ${evidence.join(' · ')}` : '');
        return `| **${id}** ${name} | ${c.conformance} | ${remark} |`;
      }),
    ].join('\n');
  const count = (level, word) =>
    CATALOGUE.filter(
      ([id, , l]) => l === level && byId.get(id).conformance === word,
    ).length;
  const summary = [
    '| Conformance level | Level A (31) | Level AA (24) |',
    '| --- | ---: | ---: |',
    ...LEVELS.map((w) => `| ${w} | ${count('A', w)} | ${count('AA', w)} |`),
  ].join('\n');
  const at = claims.assistiveTechnology;
  const total = Object.keys(cards).length;
  const notEvaluated = CATALOGUE.filter(
    ([id]) => byId.get(id).conformance === 'Not Evaluated',
  );
  const passText = at.recorded
    ? `**Recorded.** ${listed(at.readers)} over ${at.views}; the logs stand under \`${at.logs}\` (${input.atLogs.length} file${input.atLogs.length === 1 ? '' : 's'}), and every one of the ${total} component cards points its \`${SCREEN_READER_ROW}\` row at them.`
    : `**Not recorded.** The gates end where axe ends — the DOM and the CSS. What a screen reader says on arriving at each view is a question they do not answer, and this report says so rather than guessing: ${sr.gaps.length} of the ${total} component cards carry a \`${SCREEN_READER_ROW}\` row that reads \`none — gap\`, ${sr.measured.length} carry a reading, and ${sr.missing.length} have no row yet. The pass this report waits for: ${listed(at.readers)}, over ${at.views}, one log per reader under \`${at.logs}\` (${input.atLogs.length} of ${at.readers.length} on disk today${input.atViews?.length ? `, covering ${input.atViews.join(', ')} view(s)` : ''}), the announcement transcribed per view. The day the claims say \`"recorded": true\`, point 7 of the gate demands the logs on disk and a reading in every card. Until then the site says "machine-audited" and never "conformant" (decision 0061).`;
  return `# Accessibility Conformance Report

<!-- GENERATED by \`node tools/check-acr.mjs --write\` from \`docs/acr/claims.json\` — do not
edit. The gate holds every citation below to the repository and rejects a report that
differs from its claims. -->

**Product:** \`@pacit/components\` ${version} — the Angular component library. The documentation
site and the consuming application are outside this report: a criterion about a page is
theirs, and its row says so.

**Standard:** WCAG 2.2, levels A and AA. EN 301 549, the European standard the EAA points
tenders at, refers web content to the same criteria (clause 9 is WCAG 2.1 AA, which these
tables cover).

**Report date:** ${claims.reportDate}

**Evaluation methods:** the repository's own gates, run on every commit in CI and named per
row — axe-core over every component view and every special state in three engines, a
contrast policy measured on every token build for both themes, a keyboard map tested key by
key per component, forced colours and reduced motion emulated and read back, an accessible
name gate over the sources, and scans over the library's templates and stylesheets for what
a criterion forbids. The assistive-technology pass: **${at.recorded ? 'recorded' : 'not recorded'}** (see below).

${renderStatus(claims, aggregates)}

## The words

| Level | What it means in this report |
| --- | --- |
| Supports | a gate that runs on every commit measures the criterion and finds nothing wrong |
| Partially Supports | measured, and a limit is named in the row — an open finding in the plan, or a component card that still owes the reading |
| Does Not Support | measured, and found wrong; the finding that owns the repair is named |
| Not Applicable | the criterion is about something the library does not ship, and the row says what — where a scan can prove the absence, it does |
| Not Evaluated | no gate measures the criterion yet, and the row names the finding that will |

The last word is this report's one deviation from the ITI template, which reserves _Not
Evaluated_ for level AAA. A claim nothing measured is exactly what this document exists to
avoid, so a criterion no gate reaches says so in its own row rather than borrowing a
_Supports_ from a reading of the code; the list of those rows is the work order, not a
footnote.

## Summary

${summary}

## Table 1: success criteria, level A

${table('A')}

## Table 2: success criteria, level AA

${table('AA')}

## The assistive-technology pass

${passText}

## What no gate measures yet

${
  notEvaluated.length
    ? notEvaluated
        .map(([id, name]) => `- **${id}** ${name} — ${byId.get(id).remarks}`)
        .join('\n')
    : 'Every criterion has a gate behind its row.'
}
`;
};

// ── formatting ────────────────────────────────────────────────────────────────

/**
 * The rendering goes through prettier, because \`nx format:check\` covers \`docs/\` and a
 * generated table that prettier would re-align is a drift the next format run reports.
 */
const prettier = await import('prettier');
const format = async (text) =>
  prettier.format(text, {
    ...((await prettier.resolveConfig(join(ROOT, REPORT))) ?? {}),
    parser: 'markdown',
  });

// ── the real run ──────────────────────────────────────────────────────────────

const problems = [];
let summary = null;
try {
  const input = readInput();
  const { rendered, aggregates, sr } = checkAcr(input);
  const text = await format(rendered);
  if (WRITE) {
    writeFileSync(join(ROOT, REPORT), text);
  } else if (input.rendered !== text) {
    const a = (input.rendered ?? '').split('\n');
    const b = text.split('\n');
    const at = b.findIndex((line, i) => a[i] !== line);
    throw new AcrError(
      'rendering',
      `\`${REPORT}\` is not the rendering of \`${CLAIMS}\` — first difference at line ` +
        `${at + 1}: ${JSON.stringify(b[at] ?? '')} — run \`node tools/check-acr.mjs --write\``,
    );
  }
  summary = { input, aggregates, sr, status: statusOf(rendered) };
} catch (error) {
  if (!(error instanceof AcrError)) throw error;
  problems.push(`${error.check}: ${error.message}`);
}

// ── the negative control ──────────────────────────────────────────────────────

const readFixture = (name) =>
  JSON.parse(readFileSync(join(FIXTURES, name), 'utf8'));

/**
 * Builds a case's input ON A COPY of the live one, so the case file holds nothing but its
 * own defect — or, for a case of the status sentence, nothing but its own state. The live
 * input is the reference: the report is a reading of this repository and a case is that
 * reading with one thing broken.
 */
const buildFixture = (live, fx) => {
  // The sources are strings, which no case changes in place, so the copy shares them: a case's
  // reading then finds every source it did not rewrite already read (`memo`).
  const { sources, ...rest } = live;
  const w = { ...structuredClone(rest), sources: { ...sources } };
  w.rendered = null; // a case examines the decision, not the drift of the file on disk
  // A `null` that names nothing is an authoring fault and says so, by the case's name, rather
  // than dropping nothing (a case that then proves something other than it declares) — or,
  // as this loop did until 2026-09-28, dropping the LAST row on a misspelled id: `splice(-1, 1)`.
  const drop = (list, at, what) => {
    if (at === -1)
      throw new Error(
        `the case drops ${what}, and the live input holds no such thing`,
      );
    list.splice(at, 1);
  };
  for (const [id, patch] of Object.entries(fx.criteria ?? {})) {
    const i = w.claims.criteria.findIndex((c) => c.id === id);
    if (patch === null) drop(w.claims.criteria, i, `the row for \`${id}\``);
    else if (i === -1) w.claims.criteria.push({ id, ...patch });
    else w.claims.criteria[i] = { ...w.claims.criteria[i], ...patch };
  }
  Object.assign(w.claims.assistiveTechnology, fx.assistiveTechnology ?? {});
  // A card's row rewritten, added or, with `null`, dropped — a card owes a row by a gap in it
  // or by not having it at all, and the two are counted alike.
  for (const [id, rows] of Object.entries(fx.cards ?? {}))
    for (const [label, evidence] of Object.entries(rows)) {
      const card = w.cards[id] ?? [];
      const at = card.findIndex((r) => r.criterion.includes(label));
      if (evidence === null)
        drop(card, at, `the \`${label}\` row of the ${id} card`);
      else if (at !== -1) card[at].evidence = evidence;
      else (w.cards[id] ??= []).push({ criterion: label, evidence });
    }
  Object.assign(w.texts, fx.texts ?? {});
  Object.assign(w.sources, fx.sources ?? {});
  for (const path of fx.dropFiles ?? []) w.files.delete(path);
  // A finding closed, dropped or absent — or opened: a case that needs an open finding builds
  // its own, because one borrowed from the plan closes the day the work is done and takes the
  // case's meaning with it (`a-finding-that-has-closed.json` kept moving for that). Only
  // `open` may name an item the plan lacks: the other states on one were a no-op, and point 6
  // fires "no such item" under the same check as "closed", so the case would count as rejected
  // on its own point while proving the other reason.
  for (const [n, state] of Object.entries(fx.plan ?? {})) {
    const item = new RegExp(
      `^- \\[( |x|~|-)\\] \\*\\*${n.replace('.', '\\.')} — `,
      'm',
    );
    if (!item.test(w.plan)) {
      if (state !== 'open')
        throw new Error(
          `the case marks finding ${n} ${state}, and the plan has no such item`,
        );
      w.plan += `\n- [ ] **${n} — a finding this case opens**\n`;
    } else
      w.plan = w.plan.replace(
        item,
        state === 'absent'
          ? '- **gone — '
          : `- [${{ open: ' ', closed: 'x' }[state] ?? '-'}] **${n} — `,
      );
  }
  if (fx.ci !== undefined) w.ci = fx.ci;
  if (fx.atLogs !== undefined) w.atLogs = fx.atLogs;
  for (const [route, patch] of Object.entries(fx.acts ?? {}))
    if (patch === null) delete w.acts[route];
    else w.acts[route] = { ...w.acts[route], ...patch };
  return w;
};

const cases = readdirSync(FIXTURES)
  .filter((n) => n.endsWith('.json') && n !== REFERENCE)
  .sort();
if (cases.length === 0)
  problems.push(
    `tools/check-acr.fixtures: no prepared inputs — a gate with no proof that it can fail ` +
      `is one more silent defect (req-quality-negative-control)`,
  );

let states = 0;
if (summary) {
  // The live input MUST pass (it did, above) — every case is built on it.
  for (const name of cases) {
    const fx = readFixture(name);
    let input;
    try {
      input = buildFixture(summary.input, fx);
    } catch (error) {
      problems.push(`${name}: the case cannot be built — ${error.message}`);
      continue;
    }
    if (fx.status !== undefined) {
      // A state of the status sentence, not a defect: the gate must ACCEPT the input, and the
      // rendering must say the word the case declares and every phrase it names — the rows
      // counted, their owners. A rule with three branches lies in three ways, and each one
      // reads like a report.
      states++;
      let rendered;
      try {
        ({ rendered } = checkAcr(input));
      } catch (error) {
        if (!(error instanceof AcrError)) throw error;
        problems.push(
          `${name}: the prepared input was REJECTED (\`${error.check}\`: ${error.message}) ` +
            `and was meant to be rendered — point ${fx.point} (\`${fx.check}\`) never saw it`,
        );
        continue;
      }
      const status = statusOf(rendered);
      if (status?.word !== fx.status.word)
        problems.push(
          `${name}: the rendering says "Status: ${status?.word ?? '(none)'}" and the case ` +
            `expects "Status: ${fx.status.word}" — point ${fx.point} (\`${fx.check}\`) put ` +
            `the wrong word on the report`,
        );
      for (const phrase of fx.status.says ?? [])
        if (!status?.sentence.includes(phrase))
          problems.push(
            `${name}: the status sentence does not say "${phrase}" — it reads: ` +
              `${status?.sentence ?? '(no status sentence)'}`,
          );
      continue;
    }
    try {
      checkAcr(input);
      problems.push(
        `${name}: the prepared input PASSED and was meant not to — point ${fx.point} ` +
          `(\`${fx.check}\`) stopped examining anything`,
      );
    } catch (error) {
      if (!(error instanceof AcrError)) throw error;
      if (error.check !== fx.check)
        problems.push(
          `${name}: check \`${error.check}\` fired, and point ${fx.point} (\`${fx.check}\`) ` +
            `was meant to — the fixture proves something other than what it declares`,
        );
    }
  }
}

// ── result ────────────────────────────────────────────────────────────────────

if (problems.length) {
  console.error(`X Conformance gate — ${problems.length} violations:\n`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
const { input, sr } = summary;
const words = Object.fromEntries(
  LEVELS.map((w) => [
    w,
    input.claims.criteria.filter((c) => c.conformance === w).length,
  ]),
);
console.log(
  `✓ Conformance gate: ${CATALOGUE.length} criteria — ` +
    LEVELS.map((w) => `${words[w]} ${w.toLowerCase()}`).join(', ') +
    `; the assistive-technology pass ${input.claims.assistiveTechnology.recorded ? 'recorded' : `not recorded (${sr.gaps.length + sr.missing.length} of ${Object.keys(input.cards).length} cards owe the reading)`}; ` +
    `the status reads "${summary.status?.word ?? '(none)'}"; ` +
    `${WRITE ? `${REPORT} written` : `${REPORT} is the rendering of the claims`}. ` +
    `Negative control: the live input passes, ${cases.length - states} prepared ones rejected ` +
    `on their own points and ${states} rendered with the status they declare.`,
);
