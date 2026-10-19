#!/usr/bin/env node
/**
 * Accessible name and description gate: `req-a11y-built-in` — what a screen reader says about
 * a widget has to be REACHABLE from the host. A name written on a roleless host is prohibited
 * and read by nobody, and neither an audit nor a per-component spec can see it (`lesson-65`).
 *
 *  1. DENOMINATOR: every decorator parsed, every base found, every template owned and tag read,
 *  2. HOST: an ARIA name written into a `host` block needs a role on the host to carry it,
 *  3. INPUTS: a widget inside the template means `ariaLabel` and `ariaLabelledby` are declared,
 *  4. FORWARDED: both on ONE element per DOM state, not per file, its role one taking a name,
 *  5. SURFACE: the card that names the selector names both inputs,
 *  6. DESCRIPTION: hint, warning and error parts are ALTERNATIVES of one conditional (`req-api-message`),
 *  7. ANNOUNCEMENT: an error part IS the live region, and a warning part the polite one ([0026](../docs/decisions/0026-one-channel-per-politeness.md)),
 *  8. HIDDEN: a component out of the accessibility tree holds nothing to land on and no name,
 *  9. CONTEXT: an `option`, a `tab`, a `treeitem` has nothing but its required context above it.
 *
 * What an element is, whether a user lands on it and which block excludes which come off the
 * syntax tree. Each fails point 1: a tag the scan or reader misses, a widget or group with no path,
 * a tag in or read into an ICU, markup a string or frame draws, `@content`, unrendered attributes.
 *
 * Usage: node tools/check-aria.mjs
 */
import {
  BindingType,
  splitNsName,
  TmplAstElement,
  TmplAstForLoopBlock,
  TmplAstRecursiveVisitor,
  tmplAstVisitAll,
} from '@angular/compiler';
import axe from 'axe-core';
import { execFileSync } from 'node:child_process';
import {
  cpSync,
  globSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { classesOf, classKey, standsFor } from './class-bases.mjs';
import { decoratorsOf, textOf, unwrap } from './decorators.mjs';
import { readTree } from './template-comments.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PROJECT = 'libs/components';
const DOCUMENTS = 'docs/components';
const FIXTURES = join(ROOT, 'tools/check-aria.fixtures');
const REFERENCE = '_reference';

/** The two inputs by which a component hands its name over. */
const NAME_INPUTS = ['ariaLabel', 'ariaLabelledby'];
/** The attributes they are forwarded through, as the parsed tree names them. */
const NAME_TARGETS = ['aria-label', 'aria-labelledby'];
/** The same, the way the messages spell a binding to them. */
const NAME_ATTRIBUTES = NAME_TARGETS.map((name) => `[attr.${name}]`);
/**
 * How a component takes ITSELF out of the accessibility tree. Written as a plain attribute in
 * the host block, or bound — a bound one is not read here, and it does not have to be: the
 * question point 8 asks is whether the subtree can be hidden at all, and a binding says it can
 * be, in some state a page will render.
 */
const HOST_HIDDEN_KEYS = ['aria-hidden', '[attr.aria-hidden]'];

/** The same names as a consumer could write them on the host, plain or bound. */
const HOST_NAME_KEYS = [
  'aria-label',
  'aria-labelledby',
  '[attr.aria-label]',
  '[attr.aria-labelledby]',
];

/**
 * The three message parts, whatever a component prefixes them with (`hint`, `group-hint`).
 * Their names are never bound by an expression — `check-parts` point 3 is what holds that —
 * so reading the static attributes here reads all of them. The warning joined the error and
 * the hint with [0087](../docs/decisions/0087-a-warning-is-a-verdict-without-a-veto.md): the
 * same line, the same conditional, one more branch.
 */
const MESSAGE_KINDS = ['hint', 'warning', 'error'];
const MESSAGE_PART = new RegExp(`(^|-)(${MESSAGE_KINDS.join('|')})$`);
const PART_ATTRIBUTE = 'data-pct-part';
/** The attribute point 7 reads, and the value it requires of each part that announces. */
const LIVE_ATTRIBUTE = 'role';
/**
 * One politeness per message (0026): an error interrupts, a warning waits its turn — the
 * value is allowed, so nothing about it is urgent — and a hint announces nothing, being read
 * as the control's description. A kind absent here is a kind point 7 does not examine.
 */
const LIVE_ROLES = { error: 'alert', warning: 'status' };
/**
 * The same name written as a binding, in either of the two forms Angular gives it. A role
 * arriving from an expression is a value the template does not hold, so point 7 reports it
 * rather than reading it — the alternative would be to pass on a role nobody has seen.
 */
const BOUND_LIVE = new Set([
  'role',
  'attr.role',
  'aria-live',
  'attr.aria-live',
]);
/**
 * An attribute's name as the DOM takes it from the parsed tree: HTML ignores the case of a name
 * (`ROLE`, `[attr.ARIA-LABEL]`), and only a PROPERTY binding reaches an ARIA attribute through
 * its camel-case reflection (`[ariaLabel]`) — a written attribute or an `attr.` binding goes
 * through `setAttribute`, which makes `ariaLabel` the attribute `arialabel`, no ARIA at all.
 * Every syntax Angular has for a binding (`[attr.x]`, `[x]`, `x="{{ … }}"`, `attr.x="{{ … }}"`,
 * `bind-`) parses to an input of that name — so a role arriving from an expression, for point
 * 9 a path the template cannot decide and for point 4 an element it cannot judge, is an input
 * named `role`.
 */
const nameOf = (name, property = false) =>
  property
    ? name.toLowerCase().replace(/^aria(?!-)/, 'aria-')
    : name.toLowerCase();
/** The same parts counted without parsing, as the denominator of the walk. */
const MESSAGE_COUNTER = new RegExp(
  `data-pct-part="(?:[a-z-]*-)?(?:${MESSAGE_KINDS.join('|')})"`,
  'g',
);

const list = (entries) => entries.map((w) => `      ${w}`).join('\n');
const sorted = (set) => [...set].sort();

// ── source scanners ────────────────────────────────────────────────────────────

/**
 * A decorator's text, up to the class it stands on. It anchors on the formatting `nx
 * format:check` enforces (`@Component({` and `})` in column zero), and the number of matches is
 * therefore compared against a counter that does NOT repeat that anchor — otherwise a decorator
 * written some other way would leave a whole component unexamined and both sides of the
 * comparison would be out by one together (`lesson-48`). The counter is the parser's
 * (`decoratorsOf`, `decorators.mjs`), and so is the metadata the selector and the template are
 * read off, as ngc reads it: a pattern counted decorators from the start of a line and read
 * `selector:` and `templateUrl:` off the text, and a template handed over by shorthand, under a
 * quoted key or an escaped name, a decorator behind a comment on its line and one imported under
 * another name each reached ngc past it (measured). What the pattern reads is the decorator's
 * `host` block; the class it stands on — its name, its base, its inputs — is the one the
 * TypeScript parser holds at the offset the match starts at (`decoratedClasses`), and a match
 * where the parser holds none is no component at all.
 *
 * **`@Directive` is read too, and it was not always.** An attribute directive is still not
 * judged by the points below — it sits on an element the consumer chose, so the gate cannot
 * know what role that host carries. It is read because a component's surface is not always
 * declared in its own body: `PctSelect` and `PctMultiSelect` draw one template and take their
 * fifteen inputs from a `@Directive()` base, and a scan of one class body sees a combobox
 * that declares no name at all — and says so, wrongly
 * ([0034](../docs/decisions/0034-multiplicity-is-a-tag.md),
 * [`lesson-100`](../docs/lessons.md#lesson-100)).
 */
const DECORATOR =
  /^@(Component|Directive)\(\{?\r?\n?([\s\S]*?)^\}?\)\r?\n(?:export\s+)?(?:abstract\s+)?class\b/gm;

/**
 * Every decorated class of a parsed source, by the offset its decorator's `@` stands at — the
 * parser's answer to "is there a class here", which a comment or a string that spells one does
 * not get.
 */
const decoratedClasses = (source) => {
  const classes = new Map();
  const visit = (node) => {
    if (ts.isDecorator(node) && ts.isClassDeclaration(node.parent))
      classes.set(node.getStart(source), node.parent);
    ts.forEachChild(node, visit);
  };
  visit(source);
  return classes;
};

/** The calls that make a field an input, each with its `.required`. */
const INPUT_CALLS = new Set(['input', 'model']);

/**
 * The inputs a class declares: the name a template binds each one by, to the field that holds
 * it. Read off the parsed class as Angular's compiler reads them (`tryParseSignalInputMapping`,
 * `tryParseSignalModelMapping`): a field, `public` or `protected` — a `private` one the compiler
 * refuses, and the gate reads it all the same — initialised with one of the calls above through
 * any parentheses and `as`, bound by the `alias` its options give as a string — the first
 * argument of a `.required`, the second of any other — and by its own name without one. A
 * pattern over the text stood here and read a field's name with nothing but `readonly` before
 * it: `public readonly ariaLabel = input('')` declared nothing, and `label = input('', { alias:
 * 'ariaLabel' })` declared `label` (`lesson-236`).
 */
const inputsOf = (node) => {
  const inputs = new Map();
  for (const member of node.members) {
    if (!ts.isPropertyDeclaration(member) || member.name.text === undefined)
      continue;
    let call = member.initializer;
    while (
      call &&
      (ts.isParenthesizedExpression(call) || ts.isAsExpression(call))
    )
      call = call.expression;
    if (!call || !ts.isCallExpression(call)) continue;
    const required =
      ts.isPropertyAccessExpression(call.expression) &&
      call.expression.name.text === 'required';
    const callee = required ? call.expression.expression : call.expression;
    if (!ts.isIdentifier(callee) || !INPUT_CALLS.has(callee.text)) continue;
    const options = call.arguments[required ? 0 : 1];
    const alias =
      options && ts.isObjectLiteralExpression(options)
        ? options.properties.find(
            (p) => ts.isPropertyAssignment(p) && p.name.text === 'alias',
          )?.initializer
        : undefined;
    inputs.set(
      alias && ts.isStringLiteralLike(alias) ? alias.text : member.name.text,
      member.name.text,
    );
  }
  return inputs;
};

const countOf = (text, pattern) => (text.match(pattern) ?? []).length;

/**
 * The `host` block off the parsed metadata, `key → value`, each entry named as ngc names a
 * member — by an identifier or a string, by its text — and its value written as a string. `null`
 * for a block this read does not take as written, which point 1 refuses: a block given by an
 * expression, which ngc evaluates (a constant, by shorthand or by name), or an entry under a
 * computed key, by shorthand, or with a value that is no string. A pattern over the decorator's
 * text stood here, `host: {` from the start of a line, and a block under a quoted key, under an
 * escaped name or by shorthand passed every point (measured; ngc compiles each).
 *
 * A spread of an object written in place, an `as` and parentheses taken off, is read as its
 * entries, in order, as the text read before took them. A spread of a constant by its name is
 * passed over, as it was, and that is a hole of this gate's own: the others meet such an entry in
 * their package read, and this one has none. The library spreads one constant, `fitHost` in
 * `field/src/affix.ts`, a data attribute and a style. A spread of anything else — a condition, a
 * call — is a block this read does not take as written.
 */
const hostOf = (node, entries = new Map()) => {
  if (node === undefined) return entries;
  if (!ts.isObjectLiteralExpression(node)) return null;
  for (const entry of node.properties) {
    if (ts.isSpreadAssignment(entry)) {
      const spread = unwrap(entry.expression);
      if (ts.isIdentifier(spread)) continue;
      if (hostOf(spread, entries) === null) return null;
      continue;
    }
    const value =
      ts.isPropertyAssignment(entry) &&
      (ts.isIdentifier(entry.name) || ts.isStringLiteral(entry.name))
        ? textOf(entry.initializer)
        : undefined;
    if (value === undefined) return null;
    entries.set(entry.name.text, value);
  }
  return entries;
};

/**
 * The element names a selector puts the component on. `button[pctButton]` is a component on
 * a native button — the host IS the widget there, and the consumer's `aria-label` reaches it
 * with nothing to forward. An attribute-only selector (`[pctPrefix]`) yields nothing, and a
 * host nothing is known about is treated as one that cannot carry the name.
 */
const hostTags = (selector) =>
  selector
    .split(',')
    .map((part) => /^\s*([a-zA-Z][\w-]*)/.exec(part)?.[1]?.toLowerCase() ?? '')
    .filter(Boolean);

const readSources = (root, files) => {
  const components = [];
  const unheld = [];
  const unparsed = [];
  const renamed = [];
  const unseen = [];
  let counted = 0;
  const contents = new Map(
    files.map((file) => [file, readFileSync(join(root, file), 'utf8')]),
  );
  const bases = classesOf(contents);
  for (const [file, content] of contents) {
    const decorators = decoratorsOf(file, content);
    counted += decorators.declared;
    for (const name of decorators.renamed) renamed.push(`${file}: ${name}`);
    const classes = decoratedClasses(decorators.source);
    for (const match of content.matchAll(DECORATOR)) {
      const node = classes.get(match.index);
      if (node === undefined) {
        unheld.push(`${file}: \`${match[0].split('\n')[0]}\``);
        continue;
      }
      // A class the parser holds below the top level, or one with no name, is no class
      // `classesOf` reads — and one of its name at the top level, beside it, is another class.
      // The pattern runs from an anonymous class's decorator on to the next class it can
      // name, so a nameless one lands here too.
      const key = classKey(file, node.name?.text);
      const held = ts.isSourceFile(node.parent) ? bases.get(key) : undefined;
      if (held === undefined) {
        unheld.push(
          `${file}: \`${match[0].split('\n')[0]}\` with no named class at the top level`,
        );
        continue;
      }
      // The metadata the parser holds for the decorator, read as ngc reads it: an argument ngc
      // refuses (`{ … } satisfies { … }`, NG1001) leaves nothing to read the template off.
      const metadata = decorators.read(match.index);
      if (!metadata) {
        unparsed.push(`${file}: ${node.name.text}`);
        continue;
      }
      const url = metadata.get('templateUrl');
      const template = metadata.get('template');
      const selector = metadata.get('selector');
      const host = hostOf(metadata.get('host'));
      components.push({
        file,
        className: node.name?.text,
        key,
        // `class X extends Y` — the base whose inputs and host block are the subclass's too.
        // `base` is Y as written and `from` the class TypeScript binds it to
        // (`class-bases.mjs`), or `undefined` for none this follows, `via` the module the file
        // imports Y from.
        base: held.base ?? null,
        from: held.from,
        via: held.via,
        selector: textOf(selector) ?? '',
        // A selector ngc evaluates and the scanner does not read: the host tag the points
        // below read off it is one no point could know. Read as no selector, the host passed
        // point 4 as a custom element, which may carry a name (measured).
        unselected: selector !== undefined && textOf(selector) === undefined,
        template: textOf(url) ?? null,
        // A path the scanner does not read as written: ngc evaluates the expression, a
        // constant or a concatenation, and compiles a file this walk never opens.
        unnamed: url !== undefined && textOf(url) === undefined,
        // A template the decorator hands the compiler, a constant it names among them, other
        // than an empty one: the walk reads files, and a widget drawn there is one it never
        // examines.
        inline: template !== undefined && textOf(template) !== '',
        host: host ?? new Map(),
        unhosted: host === null,
        // Off the class itself, so a second component in one file cannot lend its inputs to
        // the first.
        inputs: inputsOf(node),
      });
    }
    unseen.push(...decorators.unseen());
  }
  return { components, counted, unheld, unparsed, renamed, unseen };
};

// ── template scanner ───────────────────────────────────────────────────────────

/**
 * An opening tag with its attribute text; quoted values may hold `>`. The name is the one after a
 * namespace the template writes, a letter and then letters or digits before a colon, as Angular's
 * lexer takes a prefix (`isPrefixEnd`): read with its prefix for a name, `<xhtml:button>` in a
 * string was an `xhtml` and no widget, where a `<button>` there fails point 1.
 */
const OPENING_TAG =
  /<(?:[a-zA-Z][a-zA-Z\d]*:)?([a-zA-Z][\w-]*)((?:"[^"]*"|'[^']*'|[^>"'])*)>/g;
const ATTRIBUTE = /([^\s=/>"']+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;

// ── the platform's tables ──────────────────────────────────────────────────────

/**
 * What the gate knows about tags and roles comes from `axe-core`'s tables — the same tables
 * the audit in `a11y.spec.ts` reads over a rendered page, so the reading at build time and
 * the one at run time have ONE source. Three lists used to stand here by hand: six focusable
 * tags, nine composite roles, two named tags, each grown by one entry the day a component
 * showed it was missing (`summary`, then `progress`), and each with a denominator nobody
 * measured — a tag the list never looked at was indistinguishable from a tag it approved
 * (`lesson-196`). They are derived now:
 *
 *   `focusable` — the tags axe holds natively focusable in SOME variant (`a[href]`, an
 *                 `input` not hidden, `button`, `select`, `textarea`, `summary`, `area`):
 *                 its own `isNativelyFocusable`, asked over a virtual element for every tag
 *                 of its element table.
 *   `named`     — the roles ARIA names as a whole, by attribute: the ones whose superclass
 *                 chain passes through `composite` (a widget the keyboard enters through its
 *                 children — `tablist`, `listbox`, `menu`, `grid`, `tree`) and the ones the
 *                 table says must carry a name they cannot take from their content
 *                 (`toolbar`, `dialog`, `progressbar`, `img`). Not "any role": `alert` is a
 *                 live region and `tab` is named by its text, and asking either for name
 *                 inputs would be the over-reach point 2 refuses in the other direction.
 *   `namedTags` — the tags whose implicit role is one of those, which axe holds focusable in
 *                 no variant and which HTML names by no method of its own (`progress`,
 *                 `meter`, `dialog`): announced with a name, and only ARIA can give one.
 *   `globalAria` — the attributes ARIA lets any element carry (`aria-labelledby`,
 *                  `aria-describedby`, `aria-live`): the ones that keep an element with no
 *                  role in the tree, where point 9 reads them — `aria-hidden` too, unless it
 *                  hides — and the list axe itself asks (`getGlobalAriaAttrs`).
 *
 * What the tables do NOT hold is a fact about axe, measured rather than remembered (three
 * engines, 2026-09-05): `iframe`, `audio` and `video` with `controls`, `embed`, `object`, an
 * open `<dialog>` and an editing host all take focus, and axe's focusability knows none of
 * them; a `<details>` with no summary it holds focusable and no engine does, which the
 * virtual summary child below settles. The gate reads `contenteditable` itself, as an
 * attribute beside `tabindex`, because an editing host is a textbox by any other name; the
 * three frames fail point 1 for the document they embed (`EMBEDS`), and the other three tags it
 * leaves to axe — the day a template here draws one, the audit on the page will not see it
 * either. One source, one blind spot, and a table upstream to correct rather
 * than a list here to remember.
 */
const ANCHORS = {
  focusable: 'summary',
  named: 'tablist',
  namedTags: 'progress',
  contexts: 'option',
  globalAria: 'aria-labelledby',
};
/**
 * Roles that take an element out of the tree, so one wearing them is looked through — unless a
 * global attribute or a way to land on it overrides them, as point 9 reads it.
 */
const TRANSPARENT_ROLES = new Set(['presentation', 'none']);
/**
 * Angular's own tag among the elements the walk reads, which never reaches the DOM and never
 * stands between two roles — by the local name as the compiler tells it: an `<ng-container>` in
 * its case (`op.tag === 'ng-container'`), so an `<NG-CONTAINER>` is an element of the DOM. What
 * is written on a container fails point 1 (`isOwnTag`). An
 * `<ng-content>` is no element of the walk, the tree holding it as a projection (`isElement`),
 * and one under `ngNonBindable`, which the tree holds as an element, is drawn as one, with what
 * is written on it (measured with `ngc`, 22.2.1). An `<ng-template>` is no element of the walk
 * either, the tree holding it as a template, and one written in capitals is an element the type
 * check refuses (`NG8001`, with no `CUSTOM_ELEMENTS_SCHEMA`, which nothing here declares).
 */
const TRANSPARENT_TAGS = new Set(['ng-container']);
/**
 * The same roles counted without parsing, as the denominator of the walk of point 9: every
 * written `role`, its value read by `readRole` as the walk reads it, so that the two counts
 * do not part over the case or the whitespace of a value. Markup the parser decodes and this
 * does not (a character reference, an attribute name in capitals, single quotes) still parts
 * them, and the gate stops on it — a refusal, never a pass.
 */
const ROLE_WRITTEN = /\srole="([^"]*)"/g;
const contextsWritten = (text, tables) =>
  [...text.matchAll(ROLE_WRITTEN)].filter((m) =>
    tables.contexts.has(readRole(m[1])),
  ).length;

/**
 * An element as axe sees one, carrying nothing but what decides focusability: `href` on a
 * link, `type` on an input, `tabindex` on anything — as the tag reader takes them off the parsed
 * tree, a written value decoded and a bound one keyed `[href]`, `[tabindex]` whatever the
 * syntax (`[tabIndex]`, `bind-attr.tabindex`, `tabindex="{{ … }}"`). A bound attribute stands
 * for a present one, with the value that keeps the element focusable, over a written one of
 * the same name, which Angular sets first — the WORST case, which is the one a name has to be
 * able to reach. A `disabled` binding is not passed on: axe would
 * read it as "takes no focus", and a control that is sometimes disabled still has to be
 * namable. A `<details>` gets a summary child, because the element a user lands on is the
 * summary — the platform's own when the template draws none — so the tag itself is never the
 * widget.
 */
const DECIDING = { href: '', type: '', tabindex: '-1' };
/**
 * A name a plain object answers without holding it, a member of `Object.prototype` — of which a
 * lowercase tag or role token can spell `constructor` and `__proto__`. axe looks both up in plain
 * objects (a tag in its node types, `htmlElms` and `implicitHtmlRoles`, a role in `ariaRoles`)
 * and takes the prototype's answer for an entry: an element named `constructor` throws (`nodeType
 * has to be a number`) and, told its type, is its own implicit role; `role="constructor"` is a
 * role, and `constructor option` no option. The engines read neither as anything (measured on
 * 2026-10-16): `<constructor>` is an `HTMLUnknownElement`, as `<foo>` is — generic to Chromium
 * 153, nothing to Firefox 157 — and both skip such a token as they skip `bogus`, taking the next.
 * That is the reading here, and not a refusal on point 1: the build compiles such a tag (under
 * `NO_ERRORS_SCHEMA`, as no element's direct child — Angular's parser closes the element around
 * one, its own table a plain object too — or in a namespace, `<svg:__proto__>`; in a string,
 * `@let mark = '<constructor>'`), and nothing in it is unreadable but axe's lookup. So the tag is
 * asked about under a name no table holds (`UNKNOWN_TAG`), and the token is dropped before axe
 * reads the value (`readRole`). Every other read of a table takes a role out of `readRole`, or out
 * of axe's `implicitRole` over a node built here, and a tag through here or as a table's own key:
 * these two are the doors.
 */
const fromPrototype = (name) => Object.hasOwn(Object.prototype, name);
const UNKNOWN_TAG = 'unknown';
const virtual = (tag, attrs) => {
  const attributes = {};
  for (const [name, fallback] of Object.entries(DECIDING)) {
    const value = attrs.has(`[${name}]`) ? fallback : attrs.get(name);
    if (value !== undefined) attributes[name] = value;
  }
  const node = new axe.SerialVirtualNode({
    nodeName: fromPrototype(tag) ? UNKNOWN_TAG : tag,
    attributes,
  });
  node.children =
    tag === 'details'
      ? [new axe.SerialVirtualNode({ nodeName: 'summary' })]
      : [];
  return node;
};

const platformTables = () => {
  const { ariaRoles, htmlElms } = axe._audit.standards;
  const implicit = axe.commons.standards.implicitHtmlRoles;
  const chain = (role, seen = new Set()) => {
    if (!ariaRoles[role] || seen.has(role)) return [];
    seen.add(role);
    return [
      role,
      ...(ariaRoles[role].superclassRole ?? []).flatMap((s) => chain(s, seen)),
    ];
  };
  const byAttribute = (role) =>
    ariaRoles[role]?.accessibleNameRequired === true &&
    !ariaRoles[role].nameFromContent;
  const named = new Set(
    Object.keys(ariaRoles).filter(
      (role) =>
        ariaRoles[role].type !== 'abstract' &&
        (chain(role).slice(1).includes('composite') || byAttribute(role)),
    ),
  );
  const focusable = new Set(
    Object.keys(htmlElms).filter((tag) =>
      axe.commons.dom.isNativelyFocusable(
        virtual(
          tag,
          new Map([
            ['href', ''],
            ['type', ''],
          ]),
        ),
      ),
    ),
  );
  const namedTags = new Set(
    Object.keys(htmlElms).filter(
      (tag) =>
        typeof implicit[tag] === 'string' &&
        byAttribute(implicit[tag]) &&
        !htmlElms[tag].namingMethods &&
        !focusable.has(tag),
    ),
  );
  // The context a role requires, from the same standard the audit reads: `option` names
  // `group` and `listbox`, `tab` names `tablist`. And the roles the platform gives a tag with
  // none written on it, for the ancestors the walk of point 9 passes — the string-valued
  // entries only; a tag whose implicit role depends on where it stands (`td`, `th`) is read
  // as generic, which is the conservative reading (a generic ancestor is looked through).
  const contexts = new Map(
    Object.entries(ariaRoles)
      .filter(([, definition]) => definition.requiredContext?.length)
      .map(([role, definition]) => [role, new Set(definition.requiredContext)]),
  );
  const implicitRoles = new Map(
    Object.entries(implicit).filter(([, role]) => typeof role === 'string'),
  );
  const globalAria = new Set(axe.commons.standards.getGlobalAriaAttrs());
  return { focusable, named, namedTags, contexts, implicitRoles, globalAria };
};

const TABLES = platformTables();

const attributesOf = (text) => {
  const attrs = new Map();
  for (const m of text.matchAll(ATTRIBUTE))
    attrs.set(m[1], m[2] ?? m[3] ?? m[4] ?? '');
  return attrs;
};

/**
 * The role a written `role` attribute gives an element, read the way the engines read it: the
 * value split on ASCII whitespace, case ignored, and the first token naming a role ARIA defines
 * and does not mark abstract. Measured on 2026-10-13: Chromium 153 (`computedRole`) and Firefox
 * 157 (WebDriver's computed role) read `Group`, `GROUP`, ` group `, `group region`, `bogus
 * group` and `widget group` as a group and `region group` as a region, and WebKit's source
 * reads the same way (`ariaRoleToWebCoreRole`: its whitespace collapsed, then a case-insensitive
 * map, token by token). That is axe's own reader with `fallback`, which its default leaves off
 * — taking `group region` whole, as no role at all — and with `dpub`, because the engines know
 * the `doc-` roles: a `doc-chapter` above an `option` is in the tree, not looked through. axe
 * splits on single spaces alone, so the value is split here on the ASCII whitespace first, as
 * WebKit does. Two kinds of token are dropped before axe reads the rest (measured on 2026-10-16).
 * One holds a character JavaScript takes for whitespace and HTML does not, which axe trims off or
 * joins to the next token: a no-break space keeps both engines' token whole, and invalid —
 * Chromium splits on an ideographic one, Firefox on none, and the reading here is Firefox's. The
 * other is named for a member of every object, in any case, which axe takes for a role and both
 * engines skip (`fromPrototype`): `constructor option` is an option. One
 * token axe does not know is `generic`, which the engines take: `generic group` is a group here
 * and generic to them — a spelling nobody writes, named rather than handled.
 *
 * One reading wherever the gate asks what an element is: the widget test, the group test, a
 * host's role, and point 9's walk with its counter. Point 7 alone compares the literal
 * `role="alert"`, which refuses a spelling the engines would accept and passes none they would
 * not.
 */
const readRole = (value) =>
  axe.commons.aria.getExplicitRole(
    new axe.SerialVirtualNode({
      nodeName: 'div',
      attributes: {
        role: (value ?? '')
          .split(/[\t\n\f\r ]+/)
          .filter(
            (token) => !/\s/.test(token) && !fromPrototype(token.toLowerCase()),
          )
          .join(' '),
      },
    }),
    { fallback: true, dpub: true },
  );

/**
 * A widget — that is, an element whose accessible name is announced, so that a name the
 * consumer supplies has somewhere to land. Three ways in: the user can focus it, it carries a
 * role ARIA names as a whole (a composite whose children are what the user focuses, a
 * `toolbar`, a `dialog`), or its TAG has such a role although nobody can land on it at all.
 * A link without an address is not focusable, nor is a hidden input; a `tabindex` makes
 * anything focusable, which is how a role written onto a `div` becomes a widget.
 */
const namedAsAWhole = (tag, role, tables) =>
  tables.named.has(role) || tables.namedTags.has(tag);
const isWidget = (tag, attrs, role, tables) =>
  namedAsAWhole(tag, role, tables) || isFocusable(tag, attrs);

/**
 * What a reader meets as a control of its own when it stands inside another element: anything
 * a user can land on, or a role of axe's `widget`, `composite` or `window` type — written, or
 * the platform's own for the tag (a `<progress>` is a progressbar, a `<select>` a combobox).
 * An image is none of these: `img` is a structure, named and never operated, which is why a
 * button holding an icon is still one control. Nor is a `toolbar`, which the keyboard passes
 * through to its buttons, unless a `tabindex` makes it one — and even then its name does not
 * stand for theirs (`owns`). A `<progress>` inside a link or a menu item is counted, as strict
 * as the type: only inside a role whose children are presentational is it spared (`insideOf`).
 *
 * The structures named as a whole — `toolbar`, `image`, `meter`, `graphics-document`,
 * `graphics-symbol` — and the landmarks, `application` among them, are left to the type, and no
 * input holds them one by one: counting any one of them, or the `landmark` type, leaves the
 * gate green (measured on a copy, 2026-10-13). Counted, a toolbar would only be asked a name of
 * its own, which axe's table asks of it and no rule of axe reports missing; the rest are shapes
 * nothing here draws — a meter in a link, a landmark in a group, an `application` anywhere.
 * What a toolbar with a stop on it owns is another question, and a case holds it (`owns`).
 *
 * The platform's own role is axe's, worked out from the attributes `virtual` passes on
 * (`href`, `type`): a link is one with an address, an `<input>` follows its type. The rest of
 * what can move a tag's role does not reach it — `multiple` and `size` on a `<select>`, `alt`
 * on an `<img>` — and changes no verdict here: a select is a combobox or a listbox, both named
 * as a whole, and an image either way a structure. A data cell, whose role axe reads off its
 * table, has none here (axe throws on a `<td>` with no table around it, and on a `<header>` or
 * a `<footer>` with nothing above), and a hidden `<input>` none at all: it is in no tree,
 * though axe's table gives the tag a textbox (the datetime field keeps one beside its group).
 */
const INTERACTIVE_TYPES = new Set(['widget', 'composite', 'window']);
const roleOf = (t) => {
  if (t.role !== null) return t.role;
  const node = virtual(t.tag, t.attrs);
  if (t.tag === 'input' && node.attr('type')?.toLowerCase() === 'hidden')
    return null;
  try {
    return axe.commons.aria.implicitRole(node);
  } catch {
    return null;
  }
};
const roleTypeOf = (t) => axe._audit.standards.ariaRoles[roleOf(t)]?.type;
const isInteractive = (t) =>
  isFocusable(t.tag, t.attrs) || INTERACTIVE_TYPES.has(roleTypeOf(t));
/** A role whose children are presentational: `button`, `tab`, `switch`, `slider`, `img`. */
const holdsPresentation = (t) =>
  axe._audit.standards.ariaRoles[roleOf(t)]?.childrenPresentational === true;

/**
 * The narrower question inside the one above: can a user LAND on this element. It is the whole
 * of what point 8 asks — a `<progress>` inside a hidden subtree is announced to nobody and
 * that is the intent, while a `<button>` there is a control the keyboard reaches and the
 * reader cannot describe. axe answers for the tag and its deciding attributes; an editing
 * host is the one thing the gate answers for itself, because the platform focuses it and
 * axe's table does not know (see the tables above). Bound, it is one key whatever the syntax:
 * the property is `[contentEditable]` — the compiler maps no `[contenteditable]` onto it, and
 * its DOM schema knows no property of that name on a `<div>` — and `[attr.contenteditable]`
 * the attribute.
 */
const EDITING_HOST = ['contenteditable', '[contenteditable]'];
/** Every attribute `virtual` and `isFocusable` read, as the tag reader collects them. */
const FOCUS_ATTRIBUTES = [...Object.keys(DECIDING), EDITING_HOST[0]];
const isFocusable = (tag, attrs) =>
  EDITING_HOST.some((key) => attrs.has(key)) ||
  axe.commons.dom.isFocusable(virtual(tag, attrs));

/**
 * The opening tag at an offset of the text both readings take (`readTree`), on one line and cut
 * short: what a refusal shows a reader of the tag it means. The line stands in where no tag opens
 * there to the scan, which in a template that parses a tag behind a quote in a bracketed name
 * reaches, in an ICU's case (`cased`) or not: a tree places it, and the scan cannot read it.
 */
const openingAt = (text, offset) => {
  const tag = new RegExp(OPENING_TAG.source, 'y');
  tag.lastIndex = offset;
  return (tag.exec(text)?.[0] ?? text.slice(offset).split('\n')[0])
    .replace(/\s+/g, ' ')
    .slice(0, 120);
};

/** What a tag inside an ICU is read as (`readTemplate`): a stop. */
const UNREAD = new Map([['[tabindex]', '']]);

/**
 * The tag scan of one template, each tag joined by its offset to the element the parsed tree
 * holds there (`elements`). What the tree can read, the scan takes from it: the tag's name
 * (`names`) — the text, read up to the first character no name holds, gets it wrong where a
 * namespace or a glued binding follows (`<svg:a href>` is a link, not an `svg`) — the role,
 * whether an expression decides it, whether the element binds both name attributes to the inputs
 * or either, whether it names itself, and the attributes that decide whether a user lands on it
 * (`attributes`). The parser has decoded the markup, ignores the case of a name and knows
 * every syntax Angular has for a binding, which a pattern over the text does not
 * (`lesson-236`). A tag the tree holds no element for (`<ng-template>`) keeps its written
 * role, so that a group there still fails point 1, and binds nothing.
 *
 * A tag the tag reader holds nothing for is one of two things, and the tree tells which
 * (`icus`). Inside an ICU it is markup Angular renders and the tree does not hold — nothing here
 * can read it, and reading the scan's text instead would make the scan a lexer again — so it is
 * read as a stop (`UNREAD`), the worst case, and fails point 1 as a widget the walk never
 * reached does. Anywhere else it is no element of the DOM: a `<style>`, a stylesheet `<link>` or
 * a `<script>` the compiler takes out, a tag in the text of a `<textarea>` or in a string
 * (`@let mark = '<b>'`), one the scan reads where the parser sees an expression. Its attributes
 * make no stop, though its tag or its written role can still make it a widget, which fails
 * point 1 (`@let mark = '<button>'`). A real tag such a false one swallows is the tree's alone,
 * as is one a real tag swallows, run on by a quote in its bracketed name that the scan pairs
 * with the next of its kind, and an ICU either runs into is one the scan does not read whole
 * (`end`): a swallowed tag and an ICU run into both fail point 1, as does a tag of an ICU's case
 * the scan never finds, which the HTML tree places (`cased`). A widget or a group the tag reader
 * holds (`held`) and the walk gives no path fails it too: a template, which the tree holds as no
 * element, or a tag in a block kind the walk does not descend into. The text scanned is the one
 * the tree was parsed from, its comments blanked (`readTree`).
 */
const readTemplate = (
  text,
  tables,
  elements,
  attributes,
  icus,
  kinds,
  names,
) => {
  const tags = [...text.matchAll(OPENING_TAG)].map((m) => {
    const element = elements.get(m.index);
    const unread = icus.some(([from, to]) => m.index >= from && m.index < to);
    return {
      tag: (names.get(m.index) ?? m[1]).toLowerCase(),
      attrs: attributes.get(m.index) ?? (unread ? UNREAD : new Map()),
      unread,
      held: kinds.has(m.index),
      template: kinds.get(m.index) === 'template',
      // Where the scan's reading of the tag ends: past an ICU's start for a false one, or for a
      // real one whose bracketed name holds a quote, where the scan, pairing each quote with the
      // next of its kind, meets its first `>` outside them past that start.
      end: m.index + m[0].length,
      // Where the `<` stands, which is what the parsed node's `sourceSpan` reports for the
      // same string — the one key by which the two readings of one template name the same
      // element.
      offset: m.index,
      role: element
        ? element.role
        : readRole(attributesOf(m[2]).get(LIVE_ATTRIBUTE)),
      boundRole: element?.boundRole ?? false,
      roleWritten: element?.roleWritten ?? false,
      forwards: element?.forwards ?? false,
      takesName: element?.takesName ?? false,
      takenAs: element?.takenAs ?? [],
      namesItself: element?.namesItself ?? false,
      // Angular's own tag (`isOwnTag`), which draws a comment and carries no name.
      own: element?.own ?? false,
    };
  });
  return {
    tags,
    widgets: tags
      .filter((t) => isWidget(t.tag, t.attrs, t.role, tables))
      .map((t) => ({ ...t })),
    // A group — `role="group"`, or the platform's own for a `<fieldset>`, a `<details>` or an
    // `<optgroup>` — names a SET of
    // controls, and ARIA asks it for no name — so it is no widget of the tables above. It may
    // still be the element a consumer's name is handed to: the datetime field's two texts
    // stand in one, and each takes the group's name with a word of its own (0090, E1 to E3).
    // Point 4 reads these as carriers beside the widgets.
    groups: tags.filter((t) => roleOf(t) === 'group'),
  };
};

/**
 * A block whose body stands in the DOM once per item: `@for`. Asked of the compiler's own
 * class and not of a property's name, so a kind renamed upstream fails the import, not the
 * rule. An `<ng-template>` stands once per place that stamps it, and is not read as repeating,
 * though the select stamps its option rows once per section: how many places is a question
 * about outlets, overlays and the class's own `viewChild` the walk does not answer (plan 4.83),
 * and reading every template as repeated would refuse the dialog's, the menu's and the
 * popover's panel — each standing once, each carrying the name inside. A `*ngFor` parses as a
 * template too and passes for the same reason; nothing here uses one.
 */
const repeats = (node) => node instanceof TmplAstForLoopBlock;

/**
 * A node the walk reads as an element, asked of the compiler's own class as `repeats` is. An
 * `<ng-content>` draws no element, and point 1 refuses what is written on one past what Angular
 * takes as the projection's own (`readOffAProjection`), so it is no element of the walk either:
 * what it falls back to stands where it stands, the projection looked through. Read as an element,
 * it carried what was written on it to points 4 and 9 — a `role="option"` an option under a
 * listbox, where none exists. Two other kinds the walk meets carry a `name` as a string and draw
 * nothing: an `@let`, the variable's, and an `@content` block, the slot's. Taken for elements,
 * `@let constructor` made a tag axe looks up in a table every object answers `constructor` from,
 * and the run died on a template the build compiles; `@content(optgroup)` made a group, and an
 * option under a menu stood in it. A block Angular cannot place (an `@empty` with no `@for`)
 * carries one too, and comes only with a parse error, on which the walk does not run.
 */
const isElement = (node) => node instanceof TmplAstElement;

/**
 * A `host` key by the attribute it reaches, as `nameOf` reads a template's: `ROLE` is `role`,
 * `[attr.ARIA-LABEL]` is `[attr.aria-label]`, and a property binding is the `[attr.…]` of the
 * attribute it reflects (`[ariaLabel]`, `[role]`), a property being named in its own case. The keys were compared as written, and
 * `'ARIA-LABEL': 'Surface'` or `'[ariaLabel]': "'Surface'"` on a presentational host passed
 * point 2, and `'ARIA-HIDDEN': 'true'` hid nothing from point 8. An event stays as written.
 */
const hostKey = (key) => {
  const bound = /^\[(attr\.)?(.+)\]$/s.exec(key);
  // A property is named as the engines spell it, from a small letter: `[ROLE]` sets an expando
  // nothing reads, and reaches no attribute.
  if (bound && bound[1] === undefined && !/^[a-z]/.test(bound[2])) return key;
  if (bound) return `[attr.${nameOf(bound[2], bound[1] === undefined)}]`;
  return key.startsWith('(') ? key : nameOf(key);
};
/** The host's keys that reach one of `keys`, as written. */
const hostKeysIn = (component, keys) =>
  [...component.host.keys()].filter((key) => keys.includes(hostKey(key)));

/** A binding that sets the element's property, one-way or two-way (`[(ariaLabel)]`). */
const setsProperty = (input) =>
  input.type === BindingType.Property || input.type === BindingType.TwoWay;
/**
 * An attribute written on a node, by the name the DOM gives it and with the value the parser
 * decoded — of two, the last, which the DOM keeps: Angular sets each in turn — and the bindings
 * of that name, in whatever syntax. One reading for the walk and the tag reader below.
 */
const writtenOn = (node, name) =>
  (node.attributes ?? []).findLast((a) => nameOf(a.name) === name)?.value;
const boundOn = (node, name) =>
  (node.inputs ?? []).filter((i) => nameOf(i.name, setsProperty(i)) === name);
/**
 * Every attribute on a node, written or bound in whatever syntax, by the name the DOM gives it:
 * `ARIA-LABELLEDBY` is `aria-labelledby`, and `[ariaLabel]` reaches `aria-label`. A property
 * binding a component of the library takes as its input reads the same way, as it does in
 * `focusAttributes`: where that component puts it is not read here.
 */
const namesOn = (node) => [
  ...(node.attributes ?? []).map((a) => nameOf(a.name)),
  ...(node.inputs ?? []).map((i) => nameOf(i.name, setsProperty(i))),
];
/**
 * What decides whether a user can land on a tag (`FOCUS_ATTRIBUTES`), keyed the way `virtual`
 * and `isFocusable` read it: a written attribute by its name, with its value, and a bound one as
 * `[name]`, whatever syntax binds it. A class, a style or an animation binding of the same name
 * (`[class.tabindex]`) reads as one as well, as it does for a role or a name, and so does a
 * property binding a component of the library takes as its input (`[tabIndex]` on a tag whose
 * component declared one): neither reaches the attribute, and nothing here writes either.
 */
const focusAttributes = (node) =>
  new Map(
    FOCUS_ATTRIBUTES.flatMap((name) => [
      ...(writtenOn(node, name) === undefined
        ? []
        : [[name, writtenOn(node, name)]]),
      ...(boundOn(node, name).length ? [[`[${name}]`, '']] : []),
    ]),
  );

/**
 * How an element draws markup the tree does not hold. A property bound in any syntax, from a
 * string: `innerHTML` and `outerHTML`, whose sanitizer keeps a link, a `tabindex` stop and a
 * `<details>` (it drops a `<button>`) — `[innerHtml]` too, which the compiler maps; an attribute
 * of that name, written or bound through `[attr.]`, draws nothing. And an element embedding a
 * document of its own (`EMBEDS`), whatever draws it: a `srcdoc` a written value hands over
 * unsanitized, a page or a `data:` address — a `<frame>` too, which draws one inside a
 * `<frameset>` a template may hold.
 */
const MARKUP = ['innerHTML', 'outerHTML'];
const EMBEDS = new Set(['embed', 'frame', 'iframe', 'object']);

/**
 * An element's name as the parser reads it, its namespace off: `<svg:a>` is an `a` (the parser's
 * `:svg:a`), and `<input(input)="…">` an element named `input(input)`, a binding glued to the
 * name being part of it — one the compiler refuses (`NG8001`) and the DOM makes no input of.
 */
const localName = (name) => splitNsName(name)[1];

/**
 * What Angular takes off an `<ng-content>` as the projection's own: its `select`, in any case, and
 * `ngProjectAs`, as the compiler's `preparseElement` asks for them, and an inline template's
 * attribute (`*ngIf`), which the template Angular wraps around the projection takes — the tree
 * keeps a copy on the projection too. Every other attribute is only a key an outer `select`
 * matches when the projection is projected in turn, which `ngProjectAs` names on purpose. The
 * `ngNonBindable` that function reads as well stops `ngc` 22.2.1 itself on a projection (`All
 * attributes should have an element-like target`).
 */
const readOffAProjection = (name) =>
  name.toLowerCase() === 'select' ||
  name === 'ngProjectAs' ||
  name.startsWith('*');

/**
 * An element the walk reads that is Angular's own (`TRANSPARENT_TAGS`): one question for the walk,
 * which looks through it, and the tag reader, which records what is written on it.
 */
const isOwnTag = (node) =>
  isElement(node) && TRANSPARENT_TAGS.has(localName(node.name));

/**
 * What Angular takes off an `<ng-container>` as the container's own: `ngProjectAs` and
 * `ngNonBindable`, as the compiler's `preparseElement` asks for them, in their case. A `select`
 * it takes off a projection alone. An inline template's attribute (`*ngIf`) is the template's,
 * and the tree keeps no copy on the container, nor of an `i18n` one, which it takes as the
 * message's meta (measured with `ngc`, 22.2.1); under `ngNonBindable`, where it makes no
 * template, a `*ngIf` is one more attribute on the container.
 */
const readOffAContainer = (name) =>
  name === 'ngProjectAs' || name === 'ngNonBindable';

/**
 * The tags of a template as the compiler's own visitor reaches them: each element and template
 * with its `focusAttributes`, by the offset it starts at, and the span of each ICU, whose cases
 * Angular renders and the tree does not hold (`readTemplate`). The visitor and not the walk,
 * because it knows every kind of node Angular has: a kind the walk does not descend into
 * (`lesson-180`) still has its tags read, and a stop there fails point 1 for want of a path. A
 * template is read too, though the tree holds it as no element: a stop written on one fails
 * point 1, as a group does. An `<ng-content>`, in whatever namespace (`<svg:ng-content>`), is a tag
 * of the tree point 1 counts, recorded with an empty reading: it draws no element, so nothing on
 * it makes a stop; what is written on it, past what Angular takes as the projection's own
 * (`readOffAProjection`), is recorded by the offset it starts at (`projections`), and fails
 * point 1. An `<ng-container>` is recorded with an empty reading too, whatever is bound on it: it
 * draws a comment, which no user lands on. What is written on one past the container's own
 * (`readOffAContainer`) is recorded the same way (`containers`), and fails point 1. Each tag's
 * kind is recorded beside (`kinds`). A tag is recorded before the visitor descends into it, so
 * of two at one offset — an inline template and the element, the `<ng-template>` or the
 * `<ng-content>` it wraps — the inner one is the one kept. Each element's name is recorded too
 * (`names`), as `localName` reads it; a template's or a projection's tag keeps the name the scan
 * reads off the text, on which no verdict turns. So is the markup an element draws that the tree
 * does not hold (`MARKUP`, `EMBEDS`): each way it does, by the offset it starts at. And each
 * `@content` block, by the offset it starts at (`contentBlocks`), its tags read as any others are.
 */
class TagReader extends TmplAstRecursiveVisitor {
  attributes = new Map();
  kinds = new Map();
  names = new Map();
  markup = [];
  icus = [];
  contentBlocks = [];
  projections = [];
  containers = [];
  visitElement(node) {
    this.attributes.set(
      node.sourceSpan.start.offset,
      isOwnTag(node) ? new Map() : focusAttributes(node),
    );
    this.kinds.set(node.sourceSpan.start.offset, 'element');
    this.names.set(node.sourceSpan.start.offset, localName(node.name));
    const carried = isOwnTag(node)
      ? node.attributes
          .map((a) => a.name)
          .filter((name) => !readOffAContainer(name))
      : [];
    if (carried.length)
      this.containers.push({ offset: node.sourceSpan.start.offset, carried });
    const tag = localName(node.name).toLowerCase();
    const drawn = [
      ...MARKUP.filter((name) =>
        boundOn(node, nameOf(name)).some(setsProperty),
      ).map((name) => `[${name}]`),
      ...(EMBEDS.has(tag) ? [`<${tag}>`] : []),
    ];
    if (drawn.length)
      this.markup.push({ offset: node.sourceSpan.start.offset, drawn });
    super.visitElement(node);
  }
  visitTemplate(node) {
    this.attributes.set(node.sourceSpan.start.offset, focusAttributes(node));
    this.kinds.set(node.sourceSpan.start.offset, 'template');
    super.visitTemplate(node);
  }
  visitContent(node) {
    this.attributes.set(node.sourceSpan.start.offset, new Map());
    this.kinds.set(node.sourceSpan.start.offset, 'content');
    const carried = node.attributes
      .map((a) => a.name)
      .filter((name) => !readOffAProjection(name));
    if (carried.length)
      this.projections.push({ offset: node.sourceSpan.start.offset, carried });
    super.visitContent(node);
  }
  visitIcu(node) {
    this.icus.push([node.sourceSpan.start.offset, node.sourceSpan.end.offset]);
  }
  visitContentBlock(node) {
    this.contentBlocks.push(node.sourceSpan.start.offset);
    super.visitContentBlock(node);
  }
}

/**
 * What a block draws in place of its body, by the name the tree holds it under: one block
 * (`@empty`, `@placeholder`, `@loading`, a deferred `@error`) or a list of them, the `@error`
 * blocks of an `@boundary`. Angular 22.2 renders a boundary's body until it throws and then the
 * first `@error` whose `when` matches, the unconditional one last, each in the other's place
 * (measured: the body's three buttons, then only the matching block's). A name missing here is
 * a block whose content the walk never reaches: a stop, a message part or a role that needs a
 * context drawn there fails point 1 (`lesson-180`).
 */
const SIDE_BLOCKS = ['empty', 'placeholder', 'loading', 'error', 'errorBlocks'];

/**
 * Where a node sits in the template's CONDITIONAL structure: one entry per enclosing block,
 * `{ block, branch, repeats }`. Two nodes are alternatives when one block holds them both and
 * their branches differ — "the error takes the line" as a fact about the tree rather than
 * about a page somebody rendered.
 *
 * `@if`/`@switch` branch through `branches`/`cases`; `@for`, `@defer` and `@boundary` branch
 * through their side blocks (`SIDE_BLOCKS`) against their own body, so the body is branch 0
 * and each side block one after it. An `@for` with no `@empty` is an entry too, its body
 * marked `repeats` either way — it once left no trace in the path, and what it repeats is what
 * point 4 and `exclusive` have to know.
 */
const walkTemplate = (nodes, path, state, ancestors = []) => {
  for (const node of nodes) {
    // `groups` and not only `cases`: an `@switch` carries its branches under that name in
    // Angular 22, and a walk that knew the other two names alone stepped over every switch
    // block in the library. Found by point 1's own denominator, which counted five icons in
    // the text of the toast's template and one in the tree (`lesson-180`).
    const branches = node.branches ?? node.cases ?? node.groups ?? null;
    if (branches) {
      const block = state.blocks++;
      branches.forEach((branch, i) =>
        walkTemplate(
          branch.children ?? [],
          [...path, { block, branch: i, repeats: false }],
          state,
          ancestors,
        ),
      );
      continue;
    }
    const sides = state.sides.flatMap((name) => node[name] ?? []);
    if (sides.length || repeats(node)) {
      const block = state.blocks++;
      walkTemplate(
        node.children ?? [],
        [...path, { block, branch: 0, repeats: repeats(node) }],
        state,
        ancestors,
      );
      sides.forEach((side, i) =>
        walkTemplate(
          side.children ?? [],
          [...path, { block, branch: i + 1, repeats: false }],
          state,
          ancestors,
        ),
      );
      continue;
    }
    // An element (`isElement`). Where it stands in the conditional structure is what point 4
    // asks of it; the offset is how it is found again.
    if (isElement(node)) {
      state.paths.set(node.sourceSpan.start.offset, path);
      // And the elements standing above it, by the offset each starts at — what point 4 asks
      // of an element carrying a name: which controls stand inside it.
      state.within.set(
        node.sourceSpan.start.offset,
        ancestors.map((a) => a.offset),
      );
    }
    const part = node.attributes?.find((a) => a.name === PART_ATTRIBUTE)?.value;
    if (part && MESSAGE_PART.test(part))
      state.messages.push({
        part,
        path,
        // Point 7 reads the STATIC attribute, and records separately whether a binding
        // writes the same name. An expression's value is not in the template, so a bound
        // role is neither a pass nor a violation to a reader of the source — it is a thing
        // this gate cannot judge, and it says so instead of guessing.
        role:
          node.attributes?.find((a) => a.name === LIVE_ATTRIBUTE)?.value ??
          null,
        boundRole: (node.inputs ?? []).some((i) => BOUND_LIVE.has(i.name)),
      });
    // Point 9 reads every element with a role, and the roles standing above it in THIS
    // template — the tree's own answer to "what owns this", as far as a template can give it.
    // Point 4 takes from the same element what the tag scan cannot read for itself.
    const written = (name) => writtenOn(node, name);
    const bindings = (name) => boundOn(node, name);
    // Each name attribute bound to its input, in whatever syntax — read in the field the
    // template's owner holds it in, which an alias names apart from the input.
    const taking = NAME_TARGETS.map((name, i) =>
      bindings(name).filter((b) =>
        [...state.reads[i]].some((field) =>
          (b.value?.source ?? '').includes(`${field}(`),
        ),
      ),
    );
    // The element's name as the tag scan reads it (`localName`): the parser names the elements
    // inside an `<svg>` `:svg:…` and those inside a `<math>` `:math:…`, an `<ng-container>` among
    // them, and the compiler takes the prefix for the namespace it draws in — an `<a href>` there
    // is an SVG link, an `<ng-container>` a comment, as outside. Whether the tag is one of
    // Angular's own is asked as the compiler asks it (`TRANSPARENT_TAGS`): an `<NG-CONTAINER>`
    // compiles, and draws an element of the DOM that what it carries reaches (measured, Angular
    // 22.2).
    const name = isElement(node) ? localName(node.name) : '';
    const tag = name.toLowerCase();
    const own = isOwnTag(node);
    const element = isElement(node)
      ? {
          tag,
          offset: node.sourceSpan.start.offset,
          // Angular's own tag, which draws no element and stands between no two roles.
          own,
          role: readRole(written(LIVE_ATTRIBUTE)),
          // Whether a `role` is written at all, read or not: on a component's tag it
          // replaces the host block's, whatever the engines make of it.
          roleWritten: written(LIVE_ATTRIBUTE) !== undefined,
          boundRole: bindings(LIVE_ATTRIBUTE).length > 0,
          // Both of them: what point 4 calls a carrier. Either: the consumer's name lands
          // here, and point 4 asks whether the element's role lets it carry one.
          forwards: taking.every((found) => found.length > 0),
          takesName: taking.some((found) => found.length > 0),
          // The names they are bound under: an input's, when a component drawn by this tag
          // takes the binding as its own (`[ariaLabel]`), or an attribute's, which no input
          // has (`aria-label`, `ARIA-LABEL`).
          takenAs: taking.flat().map((b) => b.name),
          // A name of its own, written or bound — what point 4 asks of each control inside a
          // group that carries the consumer's name.
          namesItself: NAME_TARGETS.some(
            (name) =>
              (written(name) ?? '').trim() !== '' || bindings(name).length > 0,
          ),
          // What keeps a role-less element from being looked through, in axe's own
          // reading of `aria-required-children`: a global ARIA attribute among these, or a
          // way to land on it. Static or bound — a binding says the attribute exists in
          // some state.
          names: namesOn(node),
          // Out of the tree with all it holds, the way axe reads the value; bound, it may
          // be absent. Written on Angular's own tag, it fails point 1 first.
          ariaHidden:
            written('aria-hidden')?.trim().toLowerCase() === 'true' &&
            bindings('aria-hidden').length === 0,
          // A way to land on it, as axe decides it: the line `aria-required-children`
          // draws, which an editing host does not cross (measured, axe 4.13). Read off the
          // template, as for points 4 and 8: an `href` a directive's host binding sets
          // (`routerLink`) is not in it.
          focusable: axe.commons.dom.isFocusable(
            virtual(tag, focusAttributes(node)),
          ),
        }
      : null;
    if (element?.role !== null && element?.role !== undefined)
      state.roles.push({ ...element, ancestors });
    if (element) state.elements.set(element.offset, element);
    // An `<ng-template>` is stamped where an outlet stands, which the walk does not read (plan
    // 4.83): an `aria-hidden` above where it is declared hides nothing the walk can vouch for.
    const stamped = node.tagName?.split(':').pop() === 'ng-template';
    walkTemplate(
      node.children ?? [],
      path,
      state,
      element
        ? [element, ...ancestors]
        : stamped
          ? ancestors.map((a) => ({ ...a, ariaHidden: false }))
          : ancestors,
    );
  }
};

/**
 * A block that holds both, on different branches — then they are never in the DOM together.
 * Unless a repeating body stands above that block: each copy of the body takes a branch of
 * its own, and the `@else` of one item stands beside the `@if` of the next. A path lists the
 * blocks around a node outermost first, and whatever stands above a block holding both
 * stands above both, so the entries before it in either path are the ones to ask.
 */
const exclusive = (a, b) =>
  a.path.some(
    (entry, depth) =>
      b.path.some(
        (other) => other.block === entry.block && other.branch !== entry.branch,
      ) && !a.path.slice(0, depth).some((above) => above.repeats),
  );

/**
 * One template read through the compiler's own parser: the message parts with the conditional
 * path of each, and the path of every element by the offset it starts at. The tree, and the text
 * every reading scans with each comment blanked, come from `readTree` (`template-comments.mjs`):
 * one reader for this gate and `check-icons`, not a copy in each. A template it cannot read
 * leaves the gate with nothing to say, which is why the errors travel back rather than being
 * swallowed into an empty list. The walk knows the side blocks it is handed: the live run hands
 * it every one, and a prepared input may hold one back to play the block Angular adds next. The
 * tag reader goes without the visits a prepared input takes from it (`skips`): the live run takes
 * none, and a case may name one, which then neither records nor descends — an override of the
 * reader's that forgets `super`. The walk knows, too, the fields an expression reads the two name
 * inputs through (`reads`), which are its owners' and not the inputs' names.
 */
const readMessages = (file, content, sides, skips, reads) => {
  const { text, ...parsed } = readTree(file, content);
  const state = {
    sides,
    reads,
    blocks: 0,
    messages: [],
    paths: new Map(),
    within: new Map(),
    roles: [],
    elements: new Map(),
  };
  const tags = new TagReader();
  for (const visit of skips) tags[visit] = () => {};
  if (!parsed.errors?.length) {
    walkTemplate(parsed.nodes, [], state);
    tmplAstVisitAll(tags, parsed.nodes);
  }
  return {
    messages: state.messages,
    paths: state.paths,
    within: state.within,
    roles: state.roles,
    elements: state.elements,
    attributes: tags.attributes,
    kinds: tags.kinds,
    names: tags.names,
    markup: tags.markup,
    icus: tags.icus,
    contentBlocks: tags.contentBlocks,
    projections: tags.projections,
    containers: tags.containers,
    cased: parsed.cased,
    errors: parsed.errors ?? [],
    counted: countOf(text, MESSAGE_COUNTER),
    text,
  };
};

// ── documentation ──────────────────────────────────────────────────────────────

const SELECTOR_LINE = /^\*\*Selector:\*\*(.*)$/m;
/** The selectors a card claims, as whole tokens: `pct-radio` is a part of `pct-radio-group`. */
const cardSelectors = (content) =>
  new Set(
    (SELECTOR_LINE.exec(content)?.[1] ?? '')
      .split(/[^A-Za-z0-9[\]-]+/)
      .filter(Boolean),
  );

// ── the check ──────────────────────────────────────────────────────────────────

class AriaError extends Error {
  constructor(check, message) {
    super(message);
    this.check = check;
  }
}

/**
 * The role a host block gives the component's element: written (`role`, in any case — the last of
 * two, as the DOM keeps it), read as the engines read it, or bound (`[attr.role]`, `[role]`) — one
 * an expression decides.
 */
const hostRoleOf = (component) => ({
  role: readRole(component.host.get(hostKeysIn(component, ['role']).at(-1))),
  bound: hostKeysIn(component, ['[attr.role]']).length > 0,
});

/**
 * A container ARIA names as a whole: the role is named as a whole (the calendar's `grid`, a
 * `listbox`, a `dialog`, a native `<select>`) and its children are not presentational — a name
 * on it is the container's, whatever stands inside, while a `slider` or an `img` is named as a
 * whole and holds no control. Which of what stands inside is its own is `owns`'s question.
 */
const isContainer = (t, tables) =>
  tables.named.has(roleOf(t)) && !holdsPresentation(t);
/**
 * What a control standing inside an element takes as its own: a container of a composite or a
 * widget type whatever stands in it, at any depth, as its items (a `<select>` or a listbox its
 * options, a radiogroup its radios, a grid its cells and the buttons in them), a role whose
 * children are presentational what no user lands on. A `dialog`, an `alertdialog`, a `toolbar`,
 * an `application` or a `graphics-document` is a container too, and a control when it stands in
 * a group (a `tabindex` makes the last three one), but what stands in it is not its own: each
 * control there is asked a name of its own. Adding the `landmark` type to the set leaves the
 * gate green (measured on a copy, 2026-10-13): its one role named as a whole is `application`,
 * a shape nothing here draws (`INTERACTIVE_TYPES`).
 */
const ITEM_TYPES = new Set(['widget', 'composite']);
const owns = (owner, t, tables) =>
  (isContainer(owner, tables) && ITEM_TYPES.has(roleTypeOf(owner))) ||
  (holdsPresentation(owner) && !isFocusable(t.tag, t.attrs));

/**
 * The controls standing inside an element of a template, read off the parsed tree. Where the
 * element's role makes its children presentational (`button`, `tab`, `switch` — a native
 * `<button>` and `<summary>` included), only what a user can land on is a control of its own:
 * the rest is part of the one control, which is why a button may hold a `<progress>` (axe,
 * three engines, 2026-10-13: nothing to report) and may not hold an `<input>` (`label` and
 * `nested-interactive`). What a control inside owns is its own and not the element's: the
 * options of a `<select>` or a `listbox` (a container), a button's busy bar (presentational
 * children no user lands on) — but not a text inside a button, nor anything inside a link,
 * which are controls of their own wherever they stand. An element whose role an expression
 * decides is counted too, outside presentational children: it may be any of them.
 */
const insideOf = (template, element, tables) => {
  const within = (t) => template.within.get(t.offset) ?? [];
  const controls = template.read.tags.filter(
    (t) =>
      within(t).includes(element.offset) &&
      (holdsPresentation(element)
        ? isFocusable(t.tag, t.attrs)
        : isInteractive(t) || t.boundRole),
  );
  return controls.filter(
    (t) =>
      !controls.some(
        (owner) => within(t).includes(owner.offset) && owns(owner, t, tables),
      ),
  );
};

/**
 * Whether ARIA forbids the element a name. A role written on it decides by axe's
 * `prohibitedAttrs` — `presentation`, `none`, `paragraph`, `code`, `strong` and the rest take
 * neither `aria-label` nor `aria-labelledby`, which ARIA forbids together — and so would the
 * platform's own role for the tag (`roleOf`), though none in axe's table forbids one. With no
 * role, axe's element table decides: a `<span>`, a `<div>`, a `<p>`, a `<label>`, an `<a>` with
 * no address are named nothing, while a `<section>`, a `<header>` or a cell has a role its name
 * or its place decides — a named section is a region, a `<header>` a banner at the top of a
 * page and, inside `<main>`, a generic to Firefox 157 and a section header to Chromium 153. The role
 * comes first, because that table read alone forbids a name on an `<a href>`: its `[href]`
 * variant is silent and the default fills in, which axe's own check never reaches, the link
 * being a widget. An address is read as `virtual` reads it, so one an expression may drop
 * counts as there, and one given by a directive (`routerLink`) counts as absent, which
 * refuses. A written `role="generic"` is no role to `readRole` (axe's `aria-roles` reports it
 * on the page).
 */
const forbids = (role) =>
  NAME_TARGETS.some((name) =>
    (axe._audit.standards.ariaRoles[role].prohibitedAttrs ?? []).includes(name),
  );
const prohibitsAName = (t) => {
  const role = roleOf(t);
  return role === null
    ? axe.commons.standards.getElementSpec(virtual(t.tag, t.attrs))
        .namingProhibited === true
    : forbids(role);
};

const checkAria = ({
  components,
  counted,
  unheld,
  unparsed,
  renamed,
  unseen,
  templates,
  documents,
  tables,
  sides,
  skips,
}) => {
  // ── 1. denominator ───────────────────────────────────────────────────────────
  // The tables the classification below reads. Absent, the gate would classify against
  // nothing and pass every template as widget-free; and each holds an entry a prepared input
  // stands on — for the first three, the one that named it when it was a list here. A table
  // that lost one is either a reading this gate has stopped making or a fact about the
  // platform that moved, and both are a verdict to reach rather than a silence.
  if (!tables)
    throw new AriaError(
      'denominator',
      `the platform tables were not read — with no tag held focusable and no role held ` +
        `named, every template below counts zero widgets and passes`,
    );
  for (const [table, anchor] of Object.entries(ANCHORS))
    if (!tables[table]?.has(anchor))
      throw new AriaError(
        'denominator',
        `the \`${table}\` table read from axe-core holds no \`${anchor}\` — an entry a ` +
          `prepared input stands on. Either the read stopped reading or the platform's ` +
          `table moved; decide which before anything below is believed`,
      );
  // What the decorator's pattern reads where the parser holds no class is text that spells one
  // — a comment, a string — and what the points below would examine there exists nowhere. A
  // decorated class the parser holds below the top level of its file, inside a namespace or a
  // function, or one with no name, is one `extends` cannot be resolved for (`class-bases.mjs`
  // reads the named classes of the top level), and its half of the surface would go unexamined
  // as surely.
  if (unheld.length)
    throw new AriaError(
      'denominator',
      `${unheld.length} decorator(s) read where the TypeScript parser holds no decorated class, ` +
        `named, at the top level of the file — a comment or a string spelling one, which no ` +
        `build compiles, or a class inside a namespace or a function, or one with no name, ` +
        `whose base this read does not resolve; no point below may examine any of them as a ` +
        `component:\n${list(unheld)}`,
    );
  // The selector and the template are read off the metadata the parser holds for the decorator,
  // as ngc reads it, and an argument ngc refuses leaves none to read them off.
  if (unparsed.length)
    throw new AriaError(
      'denominator',
      `${unparsed.length} decorator(s) where the TypeScript parser holds no decorator called ` +
        `with an object literal — metadata that is no object literal once an \`as\` is off, ` +
        `which ngc refuses as well (\`{ … } satisfies { … }\`, NG1001), leaves no selector ` +
        `and no template to read:\n${list(unparsed)}`,
    );
  // A decorator under a name of the file's own is one neither the pattern nor the counter sees,
  // so the count below agrees without it, and the widget its template draws goes unexamined.
  if (renamed.length)
    throw new AriaError(
      'denominator',
      `${renamed.length} import(s) take \`Component\` or \`Directive\` from ` +
        `\`@angular/core\` under another name — the pattern and the counter know a decorator ` +
        `by \`@Component(\` and \`@Directive(\`, and ngc by the import, so a class decorated ` +
        `so compiles and is examined by no point below; import them under their own ` +
        `names:\n${list(renamed)}`,
    );
  if (unseen.length)
    throw new AriaError(
      'denominator',
      `the pattern read ${components.length} of the ${counted} decorators the TypeScript ` +
        `parser holds — a decorator written otherwise than \`@Component({\` in column zero ` +
        `(indented, inside a namespace or a function, behind a comment on its line, or above ` +
        `\`export default class\`, which the pattern does not take for a class) leaves ` +
        `a whole component unexamined, and the gate would report on the rest as though on all ` +
        `of them (lesson-48):\n${list(unseen)}`,
    );
  // The walk reads the template a component names by `templateUrl`, as written. One the decorator
  // carries is drawn by no file it opens, and one named by an expression is a file ngc evaluates
  // and the walk never finds: a widget in either passed every point below unexamined.
  for (const component of components) {
    if (component.inline)
      throw new AriaError(
        'denominator',
        `${component.className} (${component.file}) takes its template from the decorator, ` +
          `not a file — the walk reads the file \`templateUrl\` names, so a widget drawn ` +
          `there would be examined by no point below; move the template out to \`templateUrl\``,
      );
    if (component.unnamed)
      throw new AriaError(
        'denominator',
        `${component.className} (${component.file}) names its template file by an ` +
          `expression, not a string — ngc evaluates it and compiles a file the walk never ` +
          `opens; write the path as a string`,
      );
    if (component.unselected)
      throw new AriaError(
        'denominator',
        `${component.className} (${component.file}) names its selector by an expression, ` +
          `not a string — ngc evaluates it, and the host tag the points below read off the ` +
          `selector would be one no point knows; write the selector as a string`,
      );
    if (component.unhosted)
      throw new AriaError(
        'denominator',
        `${component.className} (${component.file}) writes a \`host\` block this read does ` +
          `not take as written — the block given by an expression, or an entry under a ` +
          `computed key, by shorthand or with a value that is no string, each of which ngc ` +
          `evaluates; write each entry as a string under its name`,
      );
  }

  // What a class inherits is part of its surface: Angular merges a decorated base's inputs
  // and host bindings into the subclass, so a rule that reads one class body reads half a
  // component. The merge is done HERE, once, and every point below sees whole components.
  // A base the scan cannot see is a denominator failure and not a shrug — it is exactly the
  // half that would go unexamined.
  //
  // A link is the class TypeScript binds the base's name to (`class-bases.mjs`) — one the
  // subclass's file declares, or one a module of the sources declares `export class` under the name
  // imported — keyed by its file too, and anything else is no link but the refusal below. So two
  // components of one name are two, and the chain is the one TypeScript builds: a cycle in it is
  // one the compiler refuses as well (TS2506, a class named in its own base expression), and no
  // build compiles it. `seen` guards nothing the gate is handed, and dropping it is equivalent on
  // every input that compiles and whose directories carry no `package.json`, which
  // `class-bases.mjs` does not read. By the name alone the chain could run through a class no build
  // put there and close a cycle TypeScript has not got, and only `seen` stopped it recursing
  // forever.
  //
  // The host block merges as Angular's `mergeHostAttrsAcrossInheritance` merges it: the chain's own
  // entries from the root down, a key standing where it first stood with the value of the class
  // nearest the leaf, and the leaf's own entries in front. Of `role` on the root and `ROLE` on a
  // class below it, the DOM keeps the later one `setUpAttributes` sets: the leaf's own merge put
  // the root's last and read a button where three classes make a presentational host (Angular
  // 22's own functions, run on the chain, measured on 2026-10-19).
  const byKey = new Map(components.map((c) => [c.key, c]));
  const inherited = (component, seen = new Set()) => {
    component.own ??= new Map(component.host);
    if (component.base === null) {
      component.chain ??= [component.own];
      return component;
    }
    if (seen.has(component.key)) return component;
    seen.add(component.key);
    const base = byKey.get(component.from);
    if (base === undefined)
      throw new AriaError(
        'denominator',
        `${component.className} (${component.file}) extends \`${component.base}\`, ` +
          `${standsFor(component)} — not among the decorated classes read. Its inputs ` +
          `and its host block are part ` +
          `of this component's surface, and every point below would examine the half ` +
          `declared here`,
      );
    const whole = inherited(base, seen);
    for (const [name, field] of whole.inputs)
      if (!component.inputs.has(name)) component.inputs.set(name, field);
    component.chain = [...(whole.chain ?? [whole.own]), component.own];
    const merged = new Map();
    for (const own of component.chain)
      for (const [key, value] of own) merged.set(key, value);
    component.host = new Map(component.own);
    for (const [key, value] of merged) component.host.set(key, value);
    component.base = null;
    return component;
  };
  for (const component of components) inherited(component);
  // What a host block draws into the component's own element, read as a template's is.
  for (const component of components) {
    const drawn = MARKUP.filter((name) =>
      [...component.host.keys()].some(
        (key) => key.toLowerCase() === `[${name.toLowerCase()}]`,
      ),
    );
    if (drawn.length)
      throw new AriaError(
        'denominator',
        `${component.className} (${component.file}) binds ` +
          `${drawn.map((name) => `\`[${name}]\``).join(' and ')} in its host block — markup ` +
          `drawn into its own element, which the tree does not hold and nothing here reads: a ` +
          `link or a stop drawn there is one no point examines`,
      );
  }

  const byPath = new Map(templates.map((t) => [t.file, t]));
  const owned = new Set();
  for (const component of components) {
    if (component.template === null) continue;
    const path = join(dirname(component.file), component.template).replaceAll(
      '\\',
      '/',
    );
    if (!byPath.has(path))
      throw new AriaError(
        'denominator',
        `${component.className} (${component.file}) names the template \`${path}\`, and it ` +
          `is not among the files read — the component would pass every point below on an ` +
          `empty template`,
      );
    component.templatePath = path;
    owned.add(path);
  }

  const orphans = templates.map((t) => t.file).filter((f) => !owned.has(f));
  if (orphans.length)
    throw new AriaError(
      'denominator',
      `${orphans.length} template(s) belong to no component decorator — a template nothing ` +
        `owns is a template nothing reads:\n${list(orphans)}`,
    );

  for (const template of templates) {
    // The fields its owners hold the two name inputs in — `label` for an input bound as
    // `ariaLabel` — which is what an expression forwarding the name reads. An owner that
    // declares no such input is read by the input's own name, as every owner once was: a
    // member it binds under that name (a `computed`) is taken for the name it hands over.
    const owners = components.filter((c) => c.templatePath === template.file);
    const reads = NAME_INPUTS.map(
      (name) => new Set(owners.map((c) => c.inputs.get(name) ?? name)),
    );
    // Parsed first, judged second: the scan below takes from the tree each tag's name, which
    // roles are bound and what makes a stop. A template the parser refuses is refused for what
    // the parser says, an unbalanced quote included (`Opening tag "button" not terminated`): the
    // build hands it the same text, and prettier refuses it too.
    const said = readMessages(
      template.file,
      template.content,
      sides,
      skips,
      reads,
    );
    if (said.errors.length)
      throw new AriaError(
        'denominator',
        `${template.file} does not parse (${said.errors[0].msg}) — nothing of it reaches ` +
          `the walk or the tag reader, and point 6 would then read a message-free template ` +
          `and pass it, as points 4, 8 and 9 would the elements they never see`,
      );
    // The tree is the denominator of the scan, both ways: a tag it holds the scan must find
    // (below), and a widget or group the scan finds needs the path only a tag of the tree has
    // (classification). A count of widget tags over the text stood before both, and once they
    // stood it had nothing true left to say. What it found and the scan did not was a tag the
    // tree holds (refused below, by its offset), one in an ICU the scan reads into (refused
    // below), or text no element is made of: a string a misread `<` runs over, or a `title`,
    // which Angular renders as text and prettier keeps (`title="press <button> to go"`). What
    // the scan found and it did not was a name a glued binding or a dot follows (`<input(input)>`,
    // `<a.b href>`), which the scan now takes from the tree. Markup a string or a frame draws
    // (`[innerHTML]`, `srcdoc`, a `data:` address) it counted only where the text spelled a
    // widget's tag, as an unbalanced quote; it is refused below, whatever it spells.
    const read = readTemplate(
      said.text,
      tables,
      said.elements,
      said.attributes,
      said.icus,
      said.kinds,
      said.names,
    );
    byPath.get(template.file).read = read;
    byPath.get(template.file).text = said.text;

    const opening = (offset) => openingAt(said.text, offset);
    const scanned = new Set(read.tags.map((t) => t.offset));
    const unscanned = [...said.attributes.keys()].filter(
      (offset) => !scanned.has(offset),
    );
    if (unscanned.length)
      throw new AriaError(
        'denominator',
        `${template.file}: the parsed tree holds a tag at offset ${unscanned[0]} ` +
          `(\`${opening(unscanned[0])}\`), and the tag scan never found it — a quote Angular ` +
          `reads as part of a bracketed name (\`[it's]\`), for one, is one to the scan, which ` +
          `pairs each quote with the next of its kind: where the pairs from one in its own tag ` +
          `reach no \`>\` outside them, the scan finds no tag where it starts, and where those ` +
          `from one in a tag before it reach their first \`>\` past its start, that tag runs on ` +
          `and swallows it; a \`<\` before it, in an expression, a string or a text, reads as a ` +
          `tag that swallows it too; points 4 and 8, which start from the scan, would not ` +
          `examine it`,
      );
    // The walk and the tag reader read one tree, so a tag the walk gives a path the reader has
    // met. On a reader that reaches every kind of node this never fires; it is what holds that
    // reach — `@for` and its `@empty`, `@switch`, `@defer` and its side blocks, a plain
    // `<ng-template>`, a projection's fallback — on the library and the reference. A prepared
    // input that takes a visit from the reader (`"reader": { "drop" }`) is what holds it.
    const unreadByTheReader = read.tags.filter(
      (t) => said.paths.has(t.offset) && !said.kinds.has(t.offset),
    );
    if (unreadByTheReader.length)
      throw new AriaError(
        'denominator',
        `${template.file}: the walk reached a tag at offset ${unreadByTheReader[0].offset} ` +
          `(\`${opening(unreadByTheReader[0].offset)}\`) and the tag reader did not — what ` +
          `makes it a stop would go unread`,
      );
    const runInto = said.icus
      .map(([from]) => ({
        from,
        tag: read.tags.find((t) => t.offset < from && from < t.end),
      }))
      .find(({ tag }) => tag);
    if (runInto)
      throw new AriaError(
        'denominator',
        `${template.file}: the tag scan reads the tag at offset ${runInto.tag.offset} ` +
          `(\`${opening(runInto.tag.offset)}\`) on into the ICU at offset ${runInto.from} — ` +
          `a \`<\` in an expression, a string or a text opens a tag to the scan that ends past ` +
          `the ICU's start, and so does a real tag holding a quote Angular reads as part of a ` +
          `bracketed name (\`[it's]\`) where the scan, pairing each quote with the next of its ` +
          `kind, meets its first \`>\` outside them past that start; what the ICU's cases draw, ` +
          `if anything, is markup the scan does not read whole and the tree does not hold`,
      );
    // Inside an ICU the template tree holds no element, so the refusal above of a tag it holds
    // and the scan missed has nothing there to count by; the HTML tree has, and knows where each
    // tag of a case starts (`cased`). A tag the scan never found there is a stop nothing reads —
    // not the scan, which would have read it as one (`UNREAD`), and not the tree. Asked only
    // inside an ICU the template tree holds (`icus`): under `ngNonBindable` it holds none, and
    // Angular draws nothing of one.
    const uncased = said.cased.find(
      (offset) =>
        !scanned.has(offset) &&
        said.icus.some(([from, to]) => offset >= from && offset < to),
    );
    if (uncased !== undefined)
      throw new AriaError(
        'denominator',
        `${template.file}: an ICU's case draws a tag at offset ${uncased} ` +
          `(\`${opening(uncased)}\`), and the tag scan never found it — a quote Angular reads ` +
          `as part of a bracketed name (\`[it's]\`), for one, is one to the scan, which pairs ` +
          `each quote with the next of its kind: where the pairs from one in its own tag reach ` +
          `no \`>\` outside them, the scan finds no tag where it starts, and where those from ` +
          `one in a tag before it reach their first \`>\` past its start, that tag runs on and ` +
          `swallows it; a \`<\` before it, in the ICU's value or in an expression, a string or ` +
          `a text of a case, reads as a tag that swallows it too; a tag the scan does not find ` +
          `there is one nothing reads, the template tree holding no element in an ICU`,
      );
    if (said.markup.length)
      throw new AriaError(
        'denominator',
        `${template.file} draws markup the tree does not hold — ` +
          said.markup
            .map(
              ({ offset, drawn }) =>
                `${drawn.join(' and ')} at offset ${offset} (\`${opening(offset)}\`)`,
            )
            .join('; ') +
          ` — and nothing here reads it: a link or a stop drawn there is one no point ` +
          `examines`,
      );
    // An `@content` block hands what it holds to a foreign component (`foreignImports`), which
    // places it where its own render function puts it, and Angular builds one there alone:
    // anywhere else the compiler refuses it (`NG8026`, measured on 22.2.1 with the type check
    // and without), and no component here imports a foreign one. Read through, the block would
    // put what it holds in the element around it, which nothing promises; read as an element,
    // it was the tag its slot is named for — `@content(button)` a button an option stood under.
    if (said.contentBlocks.length)
      throw new AriaError(
        'denominator',
        `${template.file}: an \`@content\` block at offset ${said.contentBlocks[0]} ` +
          `(\`${opening(said.contentBlocks[0])}\`) — Angular builds one only as a direct ` +
          `child of a foreign component and refuses it anywhere else (NG8026), and inside one ` +
          `the foreign component places what it holds where the template does not say: points ` +
          `4, 8 and 9 would read it as standing in the element around the block`,
      );
    // An `<ng-content>` draws no element, and Angular renders none of its attributes: `ngc` 22.2.1
    // (strict templates, full compilation) hands each to `ɵɵprojection` — a binding too, as its raw
    // text (`[attr.role]`), with no instruction that binds it — which reads them only as keys an
    // outer `select` matches. A role, a name, a stop or a part written there is meant for an
    // element the DOM never gets, and no engine, audit or spec meets it: the defect of `lesson-65`,
    // written and read by nobody. Read as nothing, a `menu` around `<ng-content role="menuitem">`
    // would pass, holding whatever the consumer projects as it is; read as an element, as it was,
    // an option under a listbox passed where none exists. Every attribute but the projection's own
    // (`readOffAProjection`), and not ARIA's alone: the tree keeps each under its raw name
    // (`[ariaLabel]`), so sorting them would read Angular's binding syntax a second time, and a
    // `class` there reaches no element either. A key for an outer `select` is `ngProjectAs`'s to
    // name.
    if (said.projections.length)
      throw new AriaError(
        'denominator',
        `${template.file}: an \`<ng-content>\` at offset ${said.projections[0].offset} ` +
          `(\`${opening(said.projections[0].offset)}\`) carries ` +
          said.projections[0].carried.map((name) => `\`${name}\``).join(', ') +
          ` — Angular draws no element for a projection and renders none of its attributes, ` +
          `so what is written there reaches no element: the projected content keeps the role, ` +
          `the name and the stop it comes with. Put it on an element around the projection, or, ` +
          `as a key an outer \`select\` matches, in \`ngProjectAs\``,
      );
    // An `<ng-container>` draws a comment, and Angular renders none of its attributes: `ngc`
    // 22.2.1 (strict templates, full compilation) keeps each written one in the consts it matches
    // directives against, and with none matched draws the container alone
    // (`ɵɵdomElementContainer`, or its `Start` and `End` around children), under `ngNonBindable`
    // too. A written attribute is a key a directive's selector names, or a static input one takes,
    // whose type the type check reads — or nothing, and then the compiler says nothing. A role, a
    // name, a stop or a part written there reaches no element, and no engine, audit or spec meets
    // it: the defect of `lesson-65`. Read as an element's, as it was, an option under a listbox
    // passed where none exists; read as nothing, a `menu` around `<ng-container role="menuitem">`
    // would. A binding is no such defect: a property binding no directive takes fails the build
    // (NG8002, `[role]` and `[ariaLabel]` among them), an attribute binding cannot be written there
    // (NG5002), and a class, a style or an animation binding or a listener, which compile with no
    // directive and reach nothing, set no ARIA, no name and no stop on any element. The tag reader
    // records no stop on a container, then, whatever is bound on it, and point 4 refuses the
    // consumer's name bound there for a directive, which reaches no element. Every
    // written attribute but the container's own (`readOffAContainer`), as on a projection, and not
    // ARIA's alone: what the walk reads is not all an engine reads (a `title`). What it costs is a
    // directive a written attribute matches and no input takes, which cannot stand on a container
    // here, and a static input written rather than bound (`matColumnDef="name"`); the library puts
    // neither there, and binds what its directives take.
    if (said.containers.length)
      throw new AriaError(
        'denominator',
        `${template.file}: an \`<ng-container>\` at offset ${said.containers[0].offset} ` +
          `(\`${opening(said.containers[0].offset)}\`) carries ` +
          said.containers[0].carried.map((name) => `\`${name}\``).join(', ') +
          ` — Angular draws a comment for a container and renders none of its attributes, so ` +
          `a role, a name, a stop or a part written there reaches no element; and the compiler ` +
          `does not check that a directive's selector names what is written. Put it on an ` +
          `element inside or around the container, or bind the directive's input ` +
          `(\`[name]="'…'"\`), which the compiler refuses where no directive takes it (NG8002)`,
      );
    if (said.messages.length !== said.counted)
      throw new AriaError(
        'denominator',
        `${template.file}: ${said.counted} message part(s) in the text, ` +
          `${said.messages.length} walked — a part the walk does not reach is a part point 6 ` +
          `does not examine`,
      );
    byPath.get(template.file).said = said.messages;
    byPath.get(template.file).paths = said.paths;
    byPath.get(template.file).within = said.within;
    byPath.get(template.file).roles = said.roles;
    const contextual = said.roles.filter((r) => tables.contexts.has(r.role));
    const contextsCounted = contextsWritten(said.text, tables);
    if (contextual.length !== contextsCounted)
      throw new AriaError(
        'denominator',
        `${template.file}: ${contextsCounted} element(s) wearing a role that requires a ` +
          `context in the text, ${contextual.length} walked — an element the walk does not ` +
          `reach is one point 9 does not examine`,
      );
  }

  // ── classification ───────────────────────────────────────────────────────────
  // The host carries the widget when the selector puts the component on a natively focusable
  // element, or when the host block declares a role of its own. Only then does a consumer's
  // `aria-label`, written on the tag, reach the thing it names. A role of its own is one the
  // engines read (`readRole`), or one an expression binds; `presentation` and `none` are not:
  // with a name on the element both engines measured read it as generic (2026-10-13), which
  // is the host with no role at all.
  for (const component of components) {
    const tags = hostTags(component.selector);
    const host = hostRoleOf(component);
    component.hostIsWidget =
      (tags.length > 0 && tags.every((t) => tables.focusable.has(t))) ||
      host.bound ||
      (host.role !== null && !TRANSPARENT_ROLES.has(host.role));
    const template = component.templatePath
      ? byPath.get(component.templatePath)
      : null;
    component.widgets = template?.read?.widgets ?? [];
    // Each group with the controls standing inside it, read off the parsed tree.
    component.groups = (template?.read?.groups ?? []).map((group) => ({
      ...group,
      inside: insideOf(template, group, tables),
    }));
    // Where each of them stands in the conditional structure, joined to the tag scan by the
    // offset both readings report. A focusable element the walk never reached would be one
    // point 4 could say nothing about — and it would say it by passing, so it is a
    // denominator failure like every other half-read template above.
    // A group is asked the same: one with a `tabindex` is a stop a user lands on.
    for (const element of [...component.widgets, ...component.groups]) {
      const path = template.paths.get(element.offset);
      if (path === undefined)
        throw new AriaError(
          'denominator',
          `${component.templatePath}: a tag at offset ${element.offset} ` +
            `(\`${openingAt(template.text, element.offset)}\`) ` +
            (!element.held
              ? `is in the tag scan and not in the parsed tree — `
              : element.template
                ? `is a template, which the tree holds as no element, so the walk gives it no ` +
                  `path — `
                : `is in the parsed tree, and the walk never reached it — a block kind it does ` +
                  `not descend into; `) +
            (element.unread
              ? `it stands inside an ICU, which the tree holds as no elements, so nothing here ` +
                `reads what it is`
              : `point 4 asks which elements can stand in the DOM together, and about this ` +
                `one it would have nothing to ask`),
        );
      element.path = path;
    }
    component.needsName =
      !component.hostIsWidget && component.widgets.length > 0;
  }

  // ── 2. an ARIA name in a host block ──────────────────────────────────────────
  for (const component of components) {
    const written = hostKeysIn(component, HOST_NAME_KEYS);
    if (written.length && !component.hostIsWidget)
      throw new AriaError(
        'host',
        `${component.className} (${component.file}) writes ${written.join(', ')} into its ` +
          `host block, and the host carries no role (or \`presentation\`/\`none\`, which a ` +
          `name turns back into a generic element) — ARIA prohibits a name on a generic ` +
          `element, so it is read by nobody. Put it on the element that has the role`,
      );
  }

  const naming = components.filter((c) => c.needsName);

  // ── 3. the inputs exist ──────────────────────────────────────────────────────
  for (const component of naming) {
    const missing = NAME_INPUTS.filter((name) => !component.inputs.has(name));
    if (missing.length)
      throw new AriaError(
        'inputs',
        `${component.className} (${component.file}) keeps its widget inside the template ` +
          `and declares no ${missing.join(' / ')} — a consumer's \`aria-label\` lands on the ` +
          `roleless host, so with this missing the control cannot be named at all`,
      );
  }

  // ── 4. and they are forwarded ────────────────────────────────────────────────
  // One carrier per DOM STATE, which is not the same as one per file. A control whose trigger
  // changes element with an input — `pct-select` is a `<button>` and, filtering, an `<input>`
  // — writes it twice on two branches of one `@if`, and exactly one of the two is ever in the
  // tree. Two names for one control is what the rule is about, and two elements that cannot
  // meet are not that ([0035](../docs/decisions/0035-a-filter-is-a-question-not-a-value.md)).
  // Under an `@for` nothing is one: the body is stamped once per item, so a focusable carrier
  // there is as many as there are items — the two names below without a second element to
  // compare, and two branches there are a pair as well. Refused before the pairs are counted,
  // which leaves `exclusive`'s repeat clause to point 6 (`hint-beside-error-across-items`).
  //
  // An element handed the name carries it for itself, and for nothing else a reader meets on
  // its own. So when a control stands inside it — anything a user lands on, or a role of a
  // widget, a composite or a window, the first one on the way down (`insideOf`) — it carries
  // the name only as a container ARIA names as a whole, the name being the container's
  // whatever stands inside: the calendar's `grid`, the dialog, a `listbox`, a `toolbar`, a
  // native `<select>`. Anything else is refused, whatever its kind. A stop a `tabindex` puts on
  // a wrapper is no carrier (the wrapper of `name-on-non-focusable` with a `tabindex`, which
  // the widget test alone let through), and nor is a `region` or a `<button>` around an
  // `<input>`: the name stops one element above a control, or one control holds another. Nor is
  // a role named as a whole whose children are presentational (`slider`, `progressbar`, `img`)
  // holding what a user lands on: that is the button around a text again. axe, run in three
  // engines (2026-10-13), reports the wrapper with a `combobox` inside as
  // `aria-prohibited-attr` and `button-name`, the button around a text as `nested-interactive`
  // and `label`, and a wrapper around a plain button or a `region` around one as nothing at all
  // — there this is the one reader that refuses it. What is not a control of its own passes: an
  // icon (`img` is a structure) anywhere, and inside a role whose children are presentational,
  // whatever no user lands on.
  //
  // Not read: whether what stands in a container that carries the name, or in a composite or a
  // widget standing in a group (a grid's cells and the buttons in them, a radiogroup's radios),
  // names itself (a `toolbar` around an unnamed combobox passes here and fails `button-name` on
  // the page, and so does ARIA 1.1's `combobox` around its text, which fails `label`), what a
  // nested component, a directive (a `routerLink` giving an `<a>` its address) or a template
  // outlet adds inside the element, and what the consumer projects. An `<ng-template>` declared
  // inside the element is read as standing there, wherever an overlay stamps it (plan 4.83). A
  // named scroll region around a table's sort buttons is refused; the table's own item decides
  // where its name goes.
  //
  // A group may carry it too: one name for a set of controls. Two textboxes each carrying the
  // consumer's name would be the two names the rule below refuses; a group carrying it is one
  // name, and it is no stop a user lands on. It carries it only when it holds controls and
  // each of them names itself — an `aria-labelledby` or an `aria-label` of its own, written or
  // bound — because a named group around unnamed texts is 0090's E3, a critical finding in
  // three engines, and a group's role on a wrapper is not a way to forward the name one
  // element too high (`name-on-non-focusable`). A `tabindex` on the group changes none of it.
  // What the gate does NOT read is whether those names include the group's: the datetime field
  // names each text by the label and a word of its own, and its own spec holds that, not this.
  //
  // Wherever the consumer's name lands — either attribute bound to its input, on any element of
  // any template — the element's role has to take a name (`prohibitsAName`). A `<span>` handed
  // it beside a carrier passed unread, being neither a widget nor a group, and one handed it
  // alone failed only for want of a carrier (`name-on-non-focusable`). Measured on 2026-10-13
  // (Chromium 153, Firefox 157, axe 4.13 in three engines): both engines still compute a name on
  // a generic, a `paragraph` or a `code`, and axe fails it only where nothing inside reads as
  // text; a `role="none"` named anyway is shown as the tag's own role (a `<section>`'s region).
  // axe spares an element with no role inside a widget, whose name then joins the widget's
  // ("Country Poland" on a button) — refused here, the name being the control's. A component of
  // the library drawn inside takes the name through the inputs it declares; bound onto its host
  // instead, the name needs the role the host ends with — a host with none is a generic to both
  // engines, and axe, sparing custom elements, says nothing. Asked after what a carrier holds,
  // the sharper reason, and before the carriers are counted.
  //
  // What an element IS is read once, by `readRole`, the way the engines read a role, and off
  // the parsed tree, which has decoded the markup: `Group` and `group region` are groups to all
  // three engines and to these rules. A role an expression decides — in any of Angular's
  // syntaxes — on an element the name is handed to makes it a container, a group, a wrapper or
  // nothing at all, and the gate cannot tell which: it says so instead of guessing, in every
  // template, because a component whose one such element reads as no widget is not among the
  // components asked for a name at all. A native control is the exception: it is the control
  // a user lands on whatever role it wears.
  for (const component of components) {
    if (!component.templatePath) continue;
    const unjudged = byPath
      .get(component.templatePath)
      .read.tags.filter(
        (t) =>
          t.takesName &&
          t.boundRole &&
          !axe.commons.dom.isNativelyFocusable(virtual(t.tag, t.attrs)),
      );
    if (unjudged.length)
      throw new AriaError(
        'forwarded',
        `${component.className} (${component.templatePath}): ` +
          unjudged.map((t) => `<${t.tag}>`).join(', ') +
          ` bind(s) ${NAME_ATTRIBUTES.join(' or ')} to the inputs, and the role is ` +
          `BOUND — an expression decides whether the element is a container, a group of ` +
          `controls, a wrapper or nothing, and whether it may carry a name at all, and a ` +
          `reader of the source cannot judge which. Write the role, or hand the name to an ` +
          `element whose role is written`,
      );
  }
  const described = (elements) =>
    elements
      .map(
        (t) =>
          `<${t.tag}${t.role ? ` role="${t.role}"` : ''}>` +
          (t.boundRole ? ' (role bound)' : ''),
      )
      .join(', ');
  for (const component of naming) {
    const template = byPath.get(component.templatePath);
    for (const group of component.groups.filter((g) => g.forwards)) {
      const unnamed = group.inside.filter((t) => !t.namesItself);
      if (group.inside.length === 0 || unnamed.length)
        throw new AriaError(
          'forwarded',
          `${component.className} (${component.templatePath}): ${described([group])}, ` +
            `a group, binds both ${NAME_ATTRIBUTES.join(' and ')} to the inputs ` +
            (group.inside.length === 0
              ? `and holds no control the template draws — a group carries the name for ` +
                `a set of controls it can show to name themselves (projected content is ` +
                `not read)`
              : `around ${described(unnamed)}, which name(s) nothing of their own — a ` +
                `named group around unnamed controls is 0090's E3, and the name stops above ` +
                `them` +
                (unnamed.some((t) => t.boundRole)
                  ? ` (an element whose role is bound is read as the control it may be)`
                  : '')),
        );
    }
    // A `role="group"` with a `tabindex` is a widget as well, and it counts as the group it
    // is: once, and by the group's rule.
    const grouped = new Set(component.groups.map((group) => group.offset));
    const candidates = component.widgets.filter(
      (widget) => !grouped.has(widget.offset) && widget.forwards,
    );
    for (const widget of candidates) {
      if (isContainer(widget, tables)) continue;
      const inside = insideOf(template, widget, tables);
      if (inside.length)
        throw new AriaError(
          'forwarded',
          `${component.className} (${component.templatePath}): ${described([widget])} ` +
            `binds both ${NAME_ATTRIBUTES.join(' and ')} to the inputs with ` +
            `${described(inside)} inside it — ` +
            (holdsPresentation(widget)
              ? `its children are presentational, so what a user lands on inside it is a ` +
                `second control, one control holding another`
              : `and it is no container ARIA names as a whole: the name stops one element ` +
                `above a control the reader meets on its own, or one control holds another`) +
            `. Hand the name to the control`,
        );
    }
    component.carriers = [
      ...candidates,
      ...component.groups.filter((group) => group.forwards),
    ];
  }
  // A component of the library drawn by a custom tag its selector names takes the name through
  // the inputs it declares, bound to them by property. Bound any other way, or to an input it
  // does not declare, the name lands on its host. A role the host block binds carries it, as
  // point 2 has it, the binding landing after any attribute; otherwise a `role` written on the
  // tag replaces the host block's — Angular sets the template's attributes after the host
  // block's (`mergeHostAttribute`) — even one `readRole` does not read (`generic`, which the
  // engines take, or `""`), and only a tag with none keeps the block's. No role, or one that
  // forbids a name, refuses. A selector is read by its tag (`hostTags`); a custom element the
  // library does not define is not read.
  const drawnBy = new Map(
    components.flatMap((c) =>
      hostTags(c.selector)
        .filter((tag) => tag.includes('-'))
        .map((tag) => [tag, c]),
    ),
  );
  const nameForbidden = (t) => {
    const drawn = drawnBy.get(t.tag);
    if (drawn === undefined) return prohibitsAName(t);
    if (t.takenAs.every((name) => drawn.inputs.has(name))) return false;
    const host = hostRoleOf(drawn);
    if (host.bound) return false;
    const role = t.roleWritten ? t.role : host.role;
    return role === null || forbids(role);
  };
  // On an `<ng-container>` the name lands on no element: a property bound there compiles only as
  // a directive's input (NG8002), a class binding with none, and the container draws a comment.
  // Read through `nameForbidden`,
  // the tag was one axe does not know, which it spares as it spares a custom element, and the
  // name passed beside a carrier; a custom element the library does not define is at least an
  // element the name may reach, and a container never is. Where the directive puts the name no
  // point follows, as the gate refuses a role it cannot judge on the same element.
  for (const component of components) {
    if (!component.templatePath) continue;
    const tags = byPath.get(component.templatePath).read.tags;
    const contained = tags.filter((t) => t.takesName && t.own);
    if (contained.length)
      throw new AriaError(
        'forwarded',
        `${component.className} (${component.templatePath}): ${described(contained)} ` +
          `bind(s) ${NAME_ATTRIBUTES.join(' or ')} to the inputs on Angular's own tag — a ` +
          `container draws a comment, so the name goes to a directive's input or nowhere, and ` +
          `reaches no element of its own: no point follows it there. Hand the name to the ` +
          `control, to a component through its inputs, or to an element whose role takes one`,
      );
    const unnamable = tags.filter((t) => t.takesName && nameForbidden(t));
    if (unnamable.length)
      throw new AriaError(
        'forwarded',
        `${component.className} (${component.templatePath}): ${described(unnamable)} ` +
          `bind(s) ${NAME_ATTRIBUTES.join(' or ')} to the inputs, and its role prohibits a ` +
          `name — the role written, or the platform's own for the tag, or with neither the ` +
          `tag itself (a generic, a \`<p>\`, a \`<label>\`); for a component of the library ` +
          `named on its host, the role written on its tag or else its host block's. Both ` +
          `engines compute the name and ` +
          `nothing has to say it, and axe (\`aria-prohibited-attr\`) fails it only where ` +
          `nothing inside reads as text, asks for a review elsewhere — which the page's ` +
          `audit does not read — and says nothing inside a widget or on a custom element. ` +
          `Hand the name to the control, to a component through its inputs, or to an ` +
          `element whose role takes one`,
      );
  }
  for (const component of naming) {
    const { carriers } = component;
    if (carriers.length === 0)
      throw new AriaError(
        'forwarded',
        `${component.className} (${component.templatePath}): none of the ` +
          `${component.widgets.length} element(s) that carry a name, nor any of the ` +
          `${component.groups.length} group(s) around them, bind both ` +
          `${NAME_ATTRIBUTES.join(' and ')} to the inputs, and one has to — an input read ` +
          `by nobody names nothing`,
      );
    // Both rules below are about the FOCUSABLE carriers, because that is what "two names for
    // one control" means: two things a user can land on, each announcing the same name. A
    // container named alongside the control that owns it is not that — it is the APG's own
    // arrangement, and `pct-select` is the case: the combobox trigger and the `role="listbox"`
    // it opens carry one name between them, deliberately. "Container" is asked of the element
    // and not of a list of roles: the thing the user lands on is the one that counts, and a
    // `role="combobox"` on a `<button>` is that thing although ARIA files the role under
    // `composite` (`lesson-196`).
    const landable = carriers.filter((widget) =>
      isFocusable(widget.tag, widget.attrs),
    );
    const repeated = landable.filter((widget) =>
      widget.path.some((entry) => entry.repeats),
    );
    if (repeated.length)
      throw new AriaError(
        'forwarded',
        `${component.className} (${component.templatePath}): ` +
          repeated.map((widget) => `<${widget.tag}>`).join(', ') +
          ` inside an \`@for\` bind(s) both ${NAME_ATTRIBUTES.join(' and ')} to the inputs, ` +
          `and the loop stamps each once per item — one element in the template, and on ` +
          `every copy a name for the one control. The name belongs outside the loop`,
      );
    const together = landable.flatMap((widget, i) =>
      landable.slice(i + 1).filter((other) => !exclusive(widget, other)),
    );
    if (together.length)
      throw new AriaError(
        'forwarded',
        `${component.className} (${component.templatePath}): ${landable.length} focusable ` +
          `element(s) bind both ${NAME_ATTRIBUTES.join(' and ')} to the inputs and ` +
          `${together.length + 1} of them can be in the DOM at the same time — two named ` +
          `elements are two names for one control. Two branches of one conditional are not ` +
          `that; two elements standing side by side are`,
      );
  }

  // ── 5. the card says so ──────────────────────────────────────────────────────
  for (const component of naming) {
    const cards = documents.filter((d) => d.selectors.has(component.selector));
    if (cards.length !== 1)
      throw new AriaError(
        'surface',
        `${cards.length} card(s) in ${DOCUMENTS}/ name the selector \`${component.selector}\` ` +
          `and exactly one has to — a public input whose page nobody can find is an input ` +
          `nobody uses`,
      );
    const missing = NAME_INPUTS.filter(
      (name) => !cards[0].content.includes(name),
    );
    if (missing.length)
      throw new AriaError(
        'surface',
        `${cards[0].file} is silent about ${missing.join(' / ')} of \`${component.selector}\` ` +
          `— the input exists and the one page a consumer reads does not mention it`,
      );
  }

  // ── 6. one message line ──────────────────────────────────────────────────────
  // Every pair of kinds, not only hint against error: a warning beside an error is a second
  // row exactly as a hint beside one is, and the three are branches of ONE conditional.
  let pairs = 0;
  for (const template of templates) {
    const said = byPath.get(template.file).said;
    const byKind = MESSAGE_KINDS.map((kind) =>
      said.filter((m) => m.part.endsWith(kind)),
    );
    for (let a = 0; a < byKind.length; a++)
      for (let b = a + 1; b < byKind.length; b++)
        for (const one of byKind[a])
          for (const other of byKind[b]) {
            pairs++;
            if (exclusive(one, other)) continue;
            throw new AriaError(
              'description',
              `${template.file}: \`${one.part}\` and \`${other.part}\` can be in the DOM at ` +
                `the same time — they are not two branches of one conditional, or the ` +
                `conditional stands under an \`@for\`, which stamps it once per item. Then the ` +
                `control grows by a row on a message and \`aria-describedby\` names one the ` +
                `wrapped same control never shows (req-api-message)`,
            );
          }
  }

  // ── 7. the message announces itself ─────────────────────────────────────────
  // A validation message appears without anybody being pointed at it, so the text the user
  // can read has to BE the live region — one owner for one sentence, rather than the shared
  // channel repeating what is already on the screen (0026). The rule is the narrow one:
  // `role="alert"` on the error part itself and `role="status"` on the warning part (0087),
  // which is what every template here already does and what `req-a11y-built-in` promises in
  // those words. `aria-live` on a wrapper would satisfy a reader and move the owner off the
  // sentence, and then two components would announce the same fact in two shapes.
  let announced = 0;
  for (const template of templates)
    for (const message of byPath.get(template.file).said) {
      const kind = Object.keys(LIVE_ROLES).find((k) =>
        message.part.endsWith(k),
      );
      if (!kind) continue;
      const liveRole = LIVE_ROLES[kind];
      if (message.role === liveRole) {
        announced++;
        continue;
      }
      throw new AriaError(
        'announcement',
        `${template.file}: \`${message.part}\` carries ` +
          (message.boundRole
            ? `a BOUND role, so what it announces with is not in the template`
            : message.role === null
              ? `no \`role\``
              : `\`role="${message.role}"\``) +
          ` — a validation message enters the DOM with nobody pointed at it, so the text the ` +
          `user reads has to be the live region that speaks it: \`role="${liveRole}"\` on ` +
          `a ${kind}, written as a plain attribute (req-a11y-built-in)`,
      );
    }

  // ── 8. a hidden component holds nothing to land on ──────────────────────────
  // The two rules are one sentence read from both ends. A subtree taken out of the
  // accessibility tree may hold nothing a user can land on — that is axe's
  // `aria-hidden-focus`, and here it is answered before a page exists to report it on. And a
  // component that hides itself may declare no name: `ariaLabel` on a hidden host is an input
  // whose value nothing ever reads, which is point 3's defect turned inside out.
  //
  // It reads the HOST and not every `aria-hidden` in a template, deliberately: what the tag
  // scan gives is a flat list, so "inside a hidden element" is a question about nesting it
  // cannot answer. A host is the one hidden element whose subtree IS the whole template, so
  // this is the part of the rule that can be decided rather than guessed.
  const hidden = components.filter(
    (c) => hostKeysIn(c, HOST_HIDDEN_KEYS).length > 0,
  );
  for (const component of hidden) {
    const landable = component.widgets.filter((widget) =>
      isFocusable(widget.tag, widget.attrs),
    );
    if (landable.length)
      throw new AriaError(
        'hidden',
        `${component.className} (${component.templatePath}) hides its host from the ` +
          `accessibility tree and holds ${landable.length} element(s) a user can land on ` +
          `(${sorted(landable.map((w) => `<${w.tag}>`)).join(', ')}) — a keyboard reaches ` +
          `them and a screen reader cannot describe them, which is axe's ` +
          `\`aria-hidden-focus\`. Either the subtree is decoration and holds no control, or ` +
          `it is not decoration and the host may not be hidden`,
      );
    const named = NAME_INPUTS.filter((name) => component.inputs.has(name));
    if (named.length)
      throw new AriaError(
        'hidden',
        `${component.className} (${component.file}) hides its host from the accessibility ` +
          `tree and declares ${named.join(' / ')} — a name inside a hidden subtree is read ` +
          `by nobody, so the input promises a consumer something it cannot deliver`,
      );
  }

  // ── 9. a role stands in the context it requires ──────────────────────────
  // The relation itself, read off the template: the first ancestor with a role — written, or
  // the platform's own for the tag — either IS the context the role requires or is the
  // defect. Angular's containers are looked through, and so are generic elements and
  // `presentation`/`none` with no global attribute and no way to land on them; a role an
  // `aria-hidden` takes out of the tree is not asked at all. Where the template runs out, the host answers, and a host with no role hands the
  // question to the consumer's template — reported as such, because a static reader that
  // guessed there would be passing on a relation nobody has seen.
  let examined = 0;
  let ownedHere = 0;
  let leftToHost = 0;
  let leftToConsumer = 0;
  const contextOf = (role) => sorted(tables.contexts.get(role)).join(' / ');
  for (const template of templates) {
    const owners = components.filter((c) => c.templatePath === template.file);
    for (const element of byPath.get(template.file).roles) {
      const required = tables.contexts.get(element.role);
      if (!required) continue;
      // A role an `aria-hidden` takes out of the tree needs no owner, and axe asks it for none.
      if ([element, ...element.ancestors].some((e) => e.ariaHidden)) continue;
      examined++;
      let settled = false;
      for (const ancestor of element.ancestors) {
        if (ancestor.own) continue;
        if (ancestor.boundRole)
          throw new AriaError(
            'context',
            `${template.file}: <${element.tag} role="${element.role}"> stands under ` +
              `<${ancestor.tag}> whose role is BOUND, so what owns it is not in the ` +
              `template — a role that requires a context (${contextOf(element.role)}) ` +
              `wants an owner a reader of the source can see`,
          );
        // Looked through — unless it carries ARIA or takes focus, which is the line axe draws:
        // such an element is in the tree, and a listbox may not own it. The select's own
        // measured case (`lesson-65`) is this one: `role="group"` taken off a wrapper that
        // keeps its `aria-labelledby`. A presentational role gives way to either (ARIA's
        // conflict resolution), and the element is what its tag makes it.
        const global = ancestor.names.find((name) =>
          tables.globalAria.has(name),
        );
        const held = global
          ? `a global ARIA attribute (\`${global}\`)`
          : ancestor.focusable
            ? 'a way to land on it'
            : null;
        const implicit = tables.implicitRoles.get(ancestor.tag) ?? null;
        const written = ancestor.role ?? implicit;
        const overridden = TRANSPARENT_ROLES.has(written);
        if (overridden && held === null) continue;
        const role = overridden ? implicit : written;
        if (role === null) {
          if (held === null) continue;
          throw new AriaError(
            'context',
            `${template.file}: <${element.tag} role="${element.role}"> stands under ` +
              (overridden
                ? `<${ancestor.tag} role="${written}"> with ${held}, which overrides it`
                : `<${ancestor.tag}> with no role and ${held}`) +
              ` — such an element is not looked ` +
              `through, so it is what owns the \`${element.role}\`, and nothing but ` +
              `${contextOf(element.role)} may. The audit reports it as a critical ` +
              `\`aria-required-children\` naming the wrapper, on a page that opens the ` +
              `panel and nowhere else`,
          );
        }
        if (required.has(role)) {
          settled = true;
          ownedHere++;
          break;
        }
        throw new AriaError(
          'context',
          `${template.file}: <${element.tag} role="${element.role}"> stands under ` +
            `<${ancestor.tag}${ancestor.role ? ` role="${ancestor.role}"` : ''}> (${role}` +
            (overridden ? `, the \`${written}\` overridden by ${held}` : '') +
            `), ` +
            `and nothing but ${contextOf(element.role)} may stand between a ` +
            `\`${element.role}\` and its owner — axe reports this as a critical ` +
            `\`aria-required-children\` where it knows the role in between (it reads the ` +
            `\`doc-\` ones as none), on a page that opens the panel, and no page has to`,
        );
      }
      if (settled) continue;
      // The template ran out: the owner is the host, or it is outside this component.
      const hosts = owners.map((owner) => ({
        owner,
        ...hostRoleOf(owner),
      }));
      for (const host of hosts) {
        if (host.bound)
          throw new AriaError(
            'context',
            `${template.file}: <${element.tag} role="${element.role}"> reaches the root of ` +
              `its template and ${host.owner.className}'s host binds its role — the owner ` +
              `a \`${element.role}\` requires (${contextOf(element.role)}) is not in the source`,
          );
        if (host.role !== null && !required.has(host.role))
          throw new AriaError(
            'context',
            `${template.file}: <${element.tag} role="${element.role}"> reaches the root of ` +
              `its template and the host of ${host.owner.className} is a ` +
              `\`${host.role}\` — a \`${element.role}\` requires ${contextOf(element.role)} ` +
              `above it, and the host is the last element this template can put there`,
          );
      }
      if (hosts.some((host) => host.role !== null)) leftToHost++;
      else leftToConsumer++;
    }
  }

  return {
    description:
      `${components.length} components, ${naming.length} of them naming a widget of their ` +
      `own (${sorted(naming.map((c) => c.selector)).join(', ')}); ${pairs} message pair(s) ` +
      `on separate branches, ${announced} error/warning part(s) announcing themselves, ` +
      `${hidden.length} hidden from the tree with nothing to land on; ${examined} role(s) ` +
      `requiring a context — ${ownedHere} owned in their own template, ${leftToHost} by ` +
      `the host, ${leftToConsumer} left to the consumer's template`,
  };
};

// ── input ──────────────────────────────────────────────────────────────────────

const isSource = (p) =>
  p.startsWith(`${PROJECT}/`) && p.endsWith('.ts') && !p.endsWith('.spec.ts');
const isTemplate = (p) => p.startsWith(`${PROJECT}/`) && p.endsWith('.html');
const isCard = (p) =>
  p.startsWith(`${DOCUMENTS}/`) &&
  p.endsWith('.md') &&
  !['_template.md', 'README.md'].includes(basename(p));

const read = (root, path) => readFileSync(join(root, path), 'utf8');

/**
 * What the gate reads: the files under `root`, and the tables, side blocks and reader's visits a
 * case asks for. The live run asks for nothing, so it reads them through the same lines as a case
 * that does not doctor them, and a fault there fails the cases too.
 */
const collectInput = (root, files, fx = {}) => ({
  tables: tablesFor(fx),
  sides: sidesFor(fx),
  skips: skipsFor(fx),
  ...readSources(root, files.filter(isSource)),
  templates: files
    .filter(isTemplate)
    .map((file) => ({ file, content: read(root, file) })),
  documents: files.filter(isCard).map((file) => {
    const content = read(root, file);
    return { file, content, selectors: cardSelectors(content) };
  }),
});

/**
 * Files from the GIT INDEX rather than from a glob over the disk — the same reason as in
 * `check-parts` and `check-styles`: the index is an independent record of what the
 * repository really carries, and an untracked template is not part of the library.
 */
const repoFiles = () =>
  execFileSync('git', ['ls-files', '-z', PROJECT, DOCUMENTS], {
    cwd: ROOT,
    encoding: 'utf8',
  })
    .split('\0')
    .filter(Boolean)
    .map((p) => p.split('\\').join('/'))
    .sort();

// ── negative control ───────────────────────────────────────────────────────────

/**
 * A prepared input: a copy of the reference, the case's files on top. The case directory
 * then holds NOTHING BUT its own defect instead of one more copy of a correct input.
 *
 * The sources and the templates sit in the repository as `*.txt` and get their real
 * extension only here. A `.ts` file under `tools/` belongs to no compiler program, so it
 * would fire `check-typecheck`; and one of the templates carries a malformed tag by design,
 * which prettier refuses outright — `nx format:check` would fail on the very file that
 * proves this gate can fail. **One gate's fixture must not be another's defect.**
 */
const buildFixture = (name) => {
  const target = mkdtempSync(join(tmpdir(), 'pct-check-aria-'));
  cpSync(join(FIXTURES, REFERENCE), target, { recursive: true });
  if (name !== REFERENCE)
    cpSync(join(FIXTURES, name), target, {
      recursive: true,
      filter: (src) => basename(src) !== 'fixture.json',
    });
  for (const file of globSync('**/*.txt', { cwd: target }))
    renameSync(join(target, file), join(target, file.replace(/\.txt$/, '')));
  return target;
};

const fixtureInput = (directory, fx) =>
  collectInput(
    directory,
    globSync('**/*.{ts,html,md}', { cwd: directory })
      .map((p) => p.split('\\').join('/'))
      .sort(),
    fx,
  );

/**
 * The tables a case asks for: the live ones, none at all (`"tables": null`), or the live
 * ones with entries taken out (`"tables": { "drop": { "focusable": ["summary"] } }`) — the
 * derivation's own denominator, doctored the way the file-based cases doctor a template.
 */
const tablesFor = (fx) => {
  if (!('tables' in fx)) return TABLES;
  if (fx.tables === null) return null;
  const tables = Object.fromEntries(
    Object.entries(TABLES).map(([name, table]) => [
      name,
      table instanceof Map ? new Map(table) : new Set(table),
    ]),
  );
  for (const [name, entries] of Object.entries(fx.tables.drop ?? {}))
    for (const entry of entries) tables[name]?.delete(entry);
  return tables;
};

/**
 * The side blocks a case lets the walk know: every one, or every one but those it drops
 * (`"sides": { "drop": ["errorBlocks"] }`) — a block Angular adds next, which the walk would not
 * know either, played by one it knows today.
 */
const sidesFor = (fx) =>
  SIDE_BLOCKS.filter((name) => !(fx.sides?.drop ?? []).includes(name));

/**
 * The visits a case takes from the tag reader: none, or those it names
 * (`"reader": { "drop": ["visitDeferredBlockPlaceholder"] }`) — the walk's counterpart, a kind of
 * node the reader would not descend into, played by one it descends into today. Only a visit is
 * taken: a field of the reader's (`kinds`, `markup`), or `visit`, which Angular's `visitAll` calls
 * in place of each node's own where a visitor has one, takes nothing, as a misspelt visit does,
 * and the case then passes.
 */
const skipsFor = (fx) =>
  (fx.reader?.drop ?? []).filter((name) => /^visit[A-Z]/.test(name));

// ── the run ────────────────────────────────────────────────────────────────────

const problems = [];
let description = null;

try {
  description = checkAria(collectInput(ROOT, repoFiles())).description;
} catch (error) {
  if (!(error instanceof AriaError)) throw error;
  problems.push(`${error.check}: ${error.message}`);
}

const cases = readdirSync(FIXTURES, { withFileTypes: true })
  .filter((d) => d.isDirectory() && d.name !== REFERENCE)
  .map((d) => d.name)
  .sort();

if (cases.length === 0)
  problems.push(
    `tools/check-aria.fixtures: no prepared inputs — a gate with no proof that it can fail ` +
      `is one more silent defect (req-quality-negative-control)`,
  );

// The reference input MUST pass: were the base defective itself, every case would fire
// because of it rather than its own defect, and every "rejected" would be false.
{
  const directory = buildFixture(REFERENCE);
  try {
    checkAria(fixtureInput(directory));
  } catch (error) {
    if (!(error instanceof AriaError)) throw error;
    problems.push(
      `${REFERENCE}: the reference input does NOT pass (${error.check}) — every prepared ` +
        `case now fires because of it.\n    ${error.message}`,
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

for (const name of cases) {
  const fx = JSON.parse(
    readFileSync(join(FIXTURES, name, 'fixture.json'), 'utf8'),
  );
  const directory = buildFixture(name);
  try {
    checkAria(fixtureInput(directory, fx));
    problems.push(
      `${name}: the prepared input PASSED and was meant not to — point ${fx.point} ` +
        `(\`${fx.check}\`) stopped examining anything`,
    );
  } catch (error) {
    if (!(error instanceof AriaError)) throw error;
    if (error.check !== fx.check)
      problems.push(
        `${name}: check \`${error.check}\` fired, and point ${fx.point} (\`${fx.check}\`) ` +
          `was meant to — the fixture proves something other than what it declares`,
      );
    // One check, several refusals: point 4 throws six ways, all of them `forwarded`. A case
    // that names a fragment of its refusal holds it to that one, so a change that moves it to a
    // neighbouring throw is a failure here and not a pass.
    else if (fx.message !== undefined && !error.message.includes(fx.message))
      problems.push(
        `${name}: point ${fx.point} (\`${fx.check}\`) fired without "${fx.message}" — another ` +
          `refusal of the same check than the one the fixture declares:\n    ${error.message}`,
      );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

// ── result ─────────────────────────────────────────────────────────────────────

if (problems.length) {
  console.error(
    `X ARIA name and description gate — ${problems.length} violations:\n`,
  );
  for (const p of problems) console.error(`  - ${p}`);
  console.error('');
  process.exit(1);
}

console.log(
  `✓ ARIA names and descriptions: ${description}. Negative control: the reference input passes, ` +
    `${cases.length} prepared ones rejected on their own points.`,
);
