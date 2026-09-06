#!/usr/bin/env node
/**
 * Accessible name and description gate: `req-a11y-built-in` — what a screen reader says about
 * a widget has to be REACHABLE from the host. A consumer writes attributes on the tag they
 * type and on nothing else, so when the role sits on an element INSIDE the template, an
 * `aria-label` written on the tag lands on an element with no role, where ARIA prohibits it
 * and assistive technology ignores it. `<pct-select aria-label="Country">` was exactly that:
 * an unnamed combobox with no way in.
 *
 *  1. DENOMINATOR: every decorator parsed, every base found, every template owned, every
 *     tag read,
 *  2. HOST: an ARIA name written into a `host` block needs a role on the host to carry it,
 *  3. INPUTS: a component whose widget sits inside its template declares `ariaLabel` and
 *     `ariaLabelledby`,
 *  4. FORWARDED: both are bound on that one element — an input nobody reads is the same
 *     defect one floor up. "One" is counted per DOM state and not per file: two triggers on
 *     two branches of one `@if` are one control in two elements, and only elements that can
 *     stand there TOGETHER are two names for it,
 *  5. SURFACE: the card that names the selector names both inputs,
 *  6. DESCRIPTION: a hint part and an error part are ALTERNATIVES of one conditional and
 *     never neighbours (`req-api-message`),
 *  7. ANNOUNCEMENT: an error part IS the live region that speaks it (`role="alert"`),
 *  8. HIDDEN: a component taken out of the accessibility tree holds nothing to land on and
 *     no name of its own,
 *  9. CONTEXT: an element whose role requires a context (`option` in a `listbox` or a
 *     `group`, `tab` in a `tablist`, `treeitem` in a `tree`) has nothing but that context
 *     between it and the root of its template — read off the tree, so the relation the
 *     audit measures only on a page that opens the panel is held for every template from
 *     its first commit (plan 4.3).
 *
 * Points 3 and 4 are one rule split at the place it breaks: declaring the inputs is what a
 * consumer sees in the type, binding them is what the screen reader sees. Points 4, 6 and 7
 * read the template's real syntax tree (`parseTemplate`): which block excludes which is exactly
 * the question a pattern over `@if` cannot answer. The two readings are joined by the **offset**
 * of the tag — the tag scanner's match index and the node's `sourceSpan`, over the same string
 * — so an element found by one and not by the other is a denominator failure and not a shrug.
 *
 * Point 8 is axe's `aria-hidden-focus` moved to build time. A component whose host carries
 * `aria-hidden` is drawn and not announced — `pct-icon` beside the text it belongs to,
 * `pct-skeleton` where content has not arrived — and the whole subtree is then invisible to a
 * reader while remaining perfectly reachable by the keyboard. A `<button>` grown inside one
 * later is a control a screen-reader user cannot see and a sighted keyboard user lands on;
 * axe reports it only on a page that renders it, which is `lesson-65`'s shape again. The
 * other half of the same point is a name declared by such a component: an `ariaLabel` on a
 * hidden host is read by nobody, so an input for it promises what it cannot deliver.
 *
 * Point 9 is the audit's `aria-required-children` and `aria-required-parent` moved to build
 * time, for the half of them a template can decide. The select draws a heading inside its
 * list as `role="group"`, and the options under it are owned by the listbox THROUGH the
 * group — take the role off the wrapper and axe answers with a critical violation, from a
 * page that renders the open panel and from nowhere else (`lesson-65`'s shape). The table of
 * which role requires which context is axe's own (`requiredContext`), anchored like the
 * others; the walk stops at the first ancestor with a role, explicit or implicit (a `<tr>`
 * is a `row`, a `<ul>` a `list`), passes through `presentation`/`none`, role-less elements
 * that carry no ARIA and take no focus (axe's own line — a wrapper with an `aria-labelledby`
 * and no role is an element the listbox owns, and may not) and the Angular containers that
 * never reach the DOM, and where it runs out of template it asks the host: a
 * host role that is the context settles it, a host role that is not is the same defect one
 * element up, and a host with no role leaves the answer to the consumer's template — counted
 * and reported, not guessed. A BOUND role anywhere on the path is a value the template does
 * not hold, and the walk says so instead of reading it.
 *
 * Point 7 is the half point 6 never had. A message that leaves and re-enters the DOM is a
 * change nobody is pointed at, and the library's answer to that is written down twice: the
 * shared channel carries what has no place on the screen, and what IS on the screen announces
 * from where it is drawn ([0026](../docs/decisions/0026-one-channel-per-politeness.md),
 * `req-a11y-built-in`). Four templates did it correctly and nothing measured them, so the
 * fifth component to draw a message would have announced nothing and the run would have
 * stayed green — the shape of `lesson-65`, where the one configuration that fails is the one
 * no page renders.
 *
 * Usage: node tools/check-aria.mjs
 */
import { parseTemplate } from '@angular/compiler';
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

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PROJECT = 'libs/components';
const DOCUMENTS = 'docs/components';
const FIXTURES = join(ROOT, 'tools/check-aria.fixtures');
const REFERENCE = '_reference';

/** The two inputs by which a component hands its name over. */
const NAME_INPUTS = ['ariaLabel', 'ariaLabelledby'];
/** The attributes they are forwarded through. */
const NAME_ATTRIBUTES = ['[attr.aria-label]', '[attr.aria-labelledby]'];
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
 * The two message parts, whatever a component prefixes them with (`hint`, `group-hint`).
 * Their names are never bound by an expression — `check-parts` point 3 is what holds that —
 * so reading the static attributes here reads all of them.
 */
const MESSAGE_PART = /(^|-)(hint|error)$/;
const PART_ATTRIBUTE = 'data-pct-part';
/** The attribute point 7 reads, and the value it requires of an error part. */
const LIVE_ATTRIBUTE = 'role';
const LIVE_ROLE = 'alert';
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
/** A role arriving from an expression — for point 9 a path the template cannot decide. */
const BOUND_ROLE = new Set(['role', 'attr.role']);
/** The same parts counted without parsing, as the denominator of the walk. */
const MESSAGE_COUNTER = /data-pct-part="(?:[a-z-]*-)?(?:hint|error)"/g;

const list = (entries) => entries.map((w) => `      ${w}`).join('\n');
const sorted = (set) => [...set].sort();

// ── source scanners ────────────────────────────────────────────────────────────

/**
 * A decorated class, up to the brace its body opens with — that tail is where `extends`
 * stands. It anchors on the formatting `nx format:check` enforces (`@Component({` and `})` in
 * column zero), and the number of matches is therefore compared against a counter that does
 * NOT repeat that anchor — otherwise a decorator written some other way would leave a whole
 * component unexamined and both sides of the comparison would be out by one together
 * (`lesson-48`).
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
  /^@(Component|Directive)\(\{?\r?\n?([\s\S]*?)^\}?\)\r?\n(?:export\s+)?(?:abstract\s+)?class\s+([A-Za-z_$][\w$]*)([^{]*)\{/gm;
const DECORATOR_COUNTER = /^[ \t]*@(?:Component|Directive)\(/gm;

/** `class X extends Y` — the base whose inputs and host block are the subclass's too. */
const EXTENDS = /\bextends\s+([A-Za-z_$][\w$]*)/;

const SELECTOR = /selector\s*:\s*(['"])([^'"]*)\1/;
const TEMPLATE_URL = /templateUrl\s*:\s*(['"])([^'"]*)\1/;

/** `readonly x = input(…)` / `= model(…)` / `= input.required<T>()` in the class body. */
const INPUT =
  /^\s*(?:readonly\s+)?([A-Za-z_$][\w$]*)\s*=\s*(?:input|model)(?:\.required)?\s*[<(]/gm;

const countOf = (text, pattern) => (text.match(pattern) ?? []).length;

/**
 * The `host` block of a decorator, read by counting braces rather than by a regex: its
 * values are expressions that carry braces of their own, and a lazy `[\s\S]*?` up to the
 * first `}` would cut one of them in half.
 */
const hostBlock = (body) => {
  const start = body.search(/(?:^|\s)host\s*:\s*\{/m);
  if (start === -1) return null;
  const from = body.indexOf('{', start);
  let depth = 0;
  for (let i = from; i < body.length; i++) {
    if (body[i] === '{') depth++;
    else if (body[i] === '}' && --depth === 0) return body.slice(from + 1, i);
  }
  return null;
};

/** `'key': 'value'` / `key: 'value'` pairs of a host block. */
const HOST_ENTRY =
  /(?:'([^']*)'|"([^"]*)"|([A-Za-z_$][\w$]*))\s*:\s*(?:'([^']*)'|"([^"]*)"|`([^`]*)`)/g;

const hostEntries = (text) => {
  const entries = new Map();
  for (const m of text.matchAll(HOST_ENTRY))
    entries.set(m[1] ?? m[2] ?? m[3], m[4] ?? m[5] ?? m[6]);
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
  let counted = 0;
  for (const file of files) {
    const content = readFileSync(join(root, file), 'utf8');
    counted += countOf(content, DECORATOR_COUNTER);
    for (const match of content.matchAll(DECORATOR)) {
      const [body, className, heritage] = [match[2], match[3], match[4]];
      // The class body ends at the first `}` in column zero — the same formatting anchor
      // as the decorator. Inputs are read from it and not from the file, so a second
      // component in one file cannot lend its inputs to the first.
      const after = content.indexOf(match[0]) + match[0].length;
      const end = content.indexOf('\n}', after);
      const classBody = content.slice(after, end === -1 ? undefined : end);
      const host = hostBlock(body);
      components.push({
        file,
        className,
        base: EXTENDS.exec(heritage)?.[1] ?? null,
        selector: SELECTOR.exec(body)?.[2] ?? '',
        template: TEMPLATE_URL.exec(body)?.[2] ?? null,
        host: host === null ? new Map() : hostEntries(host),
        inputs: new Set([...classBody.matchAll(INPUT)].map((m) => m[1])),
      });
    }
  }
  return { components, counted };
};

// ── template scanner ───────────────────────────────────────────────────────────

const COMMENT = /<!--[\s\S]*?-->/g;
/** An opening tag with its attribute text; quoted values may hold `>`. */
const OPENING_TAG = /<([a-zA-Z][\w-]*)((?:"[^"]*"|'[^']*'|[^>"'])*)>/g;
/** The same tags counted without parsing, as the denominator of the parse. */
const widgetCounter = (tables) =>
  new RegExp(
    `<(?:${[...tables.focusable, ...tables.namedTags].sort().join('|')})(?=[\\s/>])`,
    'gi',
  );
const ATTRIBUTE = /([^\s=/>"']+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;

// ── the platform's tables ──────────────────────────────────────────────────────

/**
 * What the gate knows about tags and roles comes from `axe-core`'s tables — the same tables
 * the audit in `a11y.spec.ts` reads over a rendered page, so the reading at build time and
 * the one at run time have ONE source. Three lists used to stand here by hand: six focusable
 * tags, nine composite roles, two named tags, each grown by one entry the day a component
 * showed it was missing (`summary`, then `progress`), and each with a denominator nobody
 * measured — a tag the list never looked at was indistinguishable from a tag it approved
 * (plan 4.20). They are derived now:
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
 *
 * What the tables do NOT hold is a fact about axe, measured rather than remembered (three
 * engines, 2026-09-05): `iframe`, `audio` and `video` with `controls`, `embed`, `object`, an
 * open `<dialog>` and an editing host all take focus, and axe's focusability knows none of
 * them; a `<details>` with no summary it holds focusable and no engine does, which the
 * virtual summary child below settles. The gate reads `contenteditable` itself, as an
 * attribute beside `tabindex`, because an editing host is a textbox by any other name; the
 * six tags it leaves to axe — the day a template here draws one, the audit on the page will
 * not see it either. One source, one blind spot, and a table upstream to correct rather
 * than a list here to remember.
 */
const ANCHORS = {
  focusable: 'summary',
  named: 'tablist',
  namedTags: 'progress',
  contexts: 'option',
};
/** Roles that are not in the tree at all, so an element wearing one is looked through. */
const TRANSPARENT_ROLES = new Set(['presentation', 'none']);
/** Angular's own tags, which never reach the DOM and never stand between two roles. */
const TRANSPARENT_TAGS = new Set(['ng-container', 'ng-template', 'ng-content']);
/** The same roles counted without parsing, as the denominator of the walk of point 9. */
const contextCounter = (tables) =>
  new RegExp(`\\srole="(${[...tables.contexts.keys()].join('|')})"`, 'g');

/**
 * An element as axe sees one, carrying nothing but what decides focusability: `href` on a
 * link, `type` on an input, `tabindex` on anything. A bound attribute (`[attr.href]`,
 * `[tabindex]`) stands for a present one, with the value that keeps the element focusable —
 * the WORST case, which is the one a name has to be able to reach. A `disabled` binding is
 * not passed on: axe would read it as "takes no focus", and a control that is sometimes
 * disabled still has to be namable. A `<details>` gets a summary child, because the element
 * a user lands on is the summary — the platform's own when the template draws none — so the
 * tag itself is never the widget.
 */
const DECIDING = { href: '', type: '', tabindex: '-1' };
const virtual = (tag, attrs) => {
  const attributes = {};
  for (const [name, fallback] of Object.entries(DECIDING)) {
    const bound = attrs.has(`[${name}]`) || attrs.has(`[attr.${name}]`);
    const value = attrs.get(name) ?? (bound ? fallback : undefined);
    if (value !== undefined) attributes[name] = value;
  }
  const node = new axe.SerialVirtualNode({ nodeName: tag, attributes });
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
  return { focusable, named, namedTags, contexts, implicitRoles };
};

const TABLES = platformTables();

const attributesOf = (text) => {
  const attrs = new Map();
  for (const m of text.matchAll(ATTRIBUTE))
    attrs.set(m[1], m[2] ?? m[3] ?? m[4] ?? '');
  return attrs;
};

/**
 * A widget — that is, an element whose accessible name is announced, so that a name the
 * consumer supplies has somewhere to land. Three ways in: the user can focus it, it carries a
 * role ARIA names as a whole (a composite whose children are what the user focuses, a
 * `toolbar`, a `dialog`), or its TAG has such a role although nobody can land on it at all.
 * A link without an address is not focusable, nor is a hidden input; a `tabindex` makes
 * anything focusable, which is how a role written onto a `div` becomes a widget.
 */
const isWidget = (tag, attrs, tables) =>
  tables.named.has(attrs.get('role')) ||
  tables.namedTags.has(tag) ||
  isFocusable(tag, attrs);

/**
 * The narrower question inside the one above: can a user LAND on this element. It is the whole
 * of what point 8 asks — a `<progress>` inside a hidden subtree is announced to nobody and
 * that is the intent, while a `<button>` there is a control the keyboard reaches and the
 * reader cannot describe. axe answers for the tag and its deciding attributes; an editing
 * host is the one thing the gate answers for itself, because the platform focuses it and
 * axe's table does not know (see the tables above).
 */
const EDITING_HOST = [
  'contenteditable',
  '[contenteditable]',
  '[attr.contenteditable]',
];
const isFocusable = (tag, attrs) =>
  EDITING_HOST.some((key) => attrs.has(key)) ||
  axe.commons.dom.isFocusable(virtual(tag, attrs));

const readTemplate = (content, tables) => {
  const text = content.replace(COMMENT, '');
  const tags = [...text.matchAll(OPENING_TAG)].map((m) => ({
    tag: m[1].toLowerCase(),
    attrs: attributesOf(m[2]),
    // Where the `<` stands, which is what the parsed node's `sourceSpan` reports for the same
    // string — the one key by which the two readings of one template name the same element.
    offset: m.index,
  }));
  return {
    widgets: tags
      .filter((t) => isWidget(t.tag, t.attrs, tables))
      .map((t) => ({ ...t })),
    parsed: tags.filter(
      (t) => tables.focusable.has(t.tag) || tables.namedTags.has(t.tag),
    ).length,
    counted: countOf(text, widgetCounter(tables)),
  };
};

/**
 * Where a node sits in the template's CONDITIONAL structure: one entry per enclosing block,
 * `<block>#<branch>`. Two nodes are alternatives when one block holds them both and their
 * branches differ — "the error takes the line" as a fact about the tree rather than about
 * a page somebody rendered.
 *
 * `@if`/`@switch` branch through `branches`/`cases`; `@for` and `@defer` branch through a
 * side block (`@empty`, `@placeholder`, `@loading`, `@error`) against their own body, so
 * the body is branch 0 and each side block one after it.
 */
const walkTemplate = (nodes, path, state, ancestors = []) => {
  for (const node of nodes) {
    const branches = node.branches ?? node.cases ?? null;
    if (branches) {
      const block = state.blocks++;
      branches.forEach((branch, i) =>
        walkTemplate(
          branch.children ?? [],
          [...path, `${block}#${i}`],
          state,
          ancestors,
        ),
      );
      continue;
    }
    const sides = [
      node.empty,
      node.placeholder,
      node.loading,
      node.error,
    ].filter(Boolean);
    if (sides.length) {
      const block = state.blocks++;
      walkTemplate(
        node.children ?? [],
        [...path, `${block}#0`],
        state,
        ancestors,
      );
      sides.forEach((side, i) =>
        walkTemplate(
          side.children ?? [],
          [...path, `${block}#${i + 1}`],
          state,
          ancestors,
        ),
      );
      continue;
    }
    // An element — the only kind of node with a tag name of its own. Where it stands in the
    // conditional structure is what point 4 asks of it; the offset is how it is found again.
    if (typeof node.name === 'string' && node.sourceSpan)
      state.paths.set(node.sourceSpan.start.offset, path);
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
    const element =
      typeof node.name === 'string'
        ? {
            tag: node.name.toLowerCase(),
            role:
              node.attributes?.find((a) => a.name === LIVE_ATTRIBUTE)?.value ??
              null,
            boundRole: (node.inputs ?? []).some((i) => BOUND_ROLE.has(i.name)),
            // What keeps a role-less element from being looked through, in axe's own
            // reading of `aria-required-children`: a global ARIA attribute, or a way to land
            // on it. Static or bound — a binding says the attribute exists in some state.
            aria:
              (node.attributes ?? []).some((a) => a.name.startsWith('aria-')) ||
              (node.inputs ?? []).some((i) => /^(attr\.)?aria-/.test(i.name)),
            tabindex:
              (node.attributes ?? []).some((a) => a.name === 'tabindex') ||
              (node.inputs ?? []).some((i) =>
                /^(attr\.)?tabindex$/.test(i.name),
              ),
          }
        : null;
    if (element?.role !== null && element?.role !== undefined)
      state.roles.push({ ...element, ancestors });
    walkTemplate(
      node.children ?? [],
      path,
      state,
      element ? [element, ...ancestors] : ancestors,
    );
  }
};

/** A block that holds both, on different branches — then they are never in the DOM together. */
const exclusive = (a, b) =>
  a.path.some((entry) => {
    const [block, branch] = entry.split('#');
    return b.path.some((other) => {
      const [otherBlock, otherBranch] = other.split('#');
      return block === otherBlock && branch !== otherBranch;
    });
  });

/**
 * One template read through the compiler's own parser: the message parts with the conditional
 * path of each, and the path of every element by the offset it starts at. A template it cannot
 * read leaves the gate with nothing to say, which is why the errors travel back rather than
 * being swallowed into an empty list.
 */
const readMessages = (file, content) => {
  const text = content.replace(COMMENT, '');
  const parsed = parseTemplate(text, file, { preserveWhitespaces: false });
  const state = { blocks: 0, messages: [], paths: new Map(), roles: [] };
  if (!parsed.errors?.length) walkTemplate(parsed.nodes, [], state);
  return {
    messages: state.messages,
    paths: state.paths,
    roles: state.roles,
    errors: parsed.errors ?? [],
    counted: countOf(text, MESSAGE_COUNTER),
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

const checkAria = ({ components, counted, templates, documents, tables }) => {
  // ── 1. denominator ───────────────────────────────────────────────────────────
  // The tables the classification below reads. Absent, the gate would classify against
  // nothing and pass every template as widget-free; and each holds the entry that named it
  // when it was a list here — a table that lost one is either a reading this gate has
  // stopped making or a fact about the platform that moved, and both are a verdict to
  // reach rather than a silence.
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
        `the \`${table}\` table read from axe-core holds no \`${anchor}\` — the entry that ` +
          `named this table when it was a list here, and the one a prepared input still ` +
          `stands on. Either the read stopped reading or the platform's table moved; ` +
          `decide which before anything below is believed`,
      );
  if (components.length !== counted)
    throw new AriaError(
      'denominator',
      `${counted} component decorators in the sources, ${components.length} parsed — a ` +
        `decorator written some other way leaves a whole component unexamined, and the ` +
        `gate would report on the rest as though on all of them (lesson-48)`,
    );

  // What a class inherits is part of its surface: Angular merges a decorated base's inputs
  // and host bindings into the subclass, so a rule that reads one class body reads half a
  // component. The merge is done HERE, once, and every point below sees whole components.
  // A base the scan cannot see is a denominator failure and not a shrug — it is exactly the
  // half that would go unexamined.
  const byName = new Map(components.map((c) => [c.className, c]));
  const inherited = (component, seen = new Set()) => {
    if (component.base === null) return component;
    if (seen.has(component.className)) return component;
    seen.add(component.className);
    const base = byName.get(component.base);
    if (base === undefined)
      throw new AriaError(
        'denominator',
        `${component.className} (${component.file}) extends \`${component.base}\`, which is ` +
          `not among the decorated classes read — its inputs and its host block are part of ` +
          `this component's surface, and every point below would examine the half declared ` +
          `here`,
      );
    const whole = inherited(base, seen);
    for (const name of whole.inputs) component.inputs.add(name);
    for (const [key, value] of whole.host)
      if (!component.host.has(key)) component.host.set(key, value);
    component.base = null;
    return component;
  };
  for (const component of components) inherited(component);

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
    const read = readTemplate(template.content, tables);
    if (read.parsed !== read.counted)
      throw new AriaError(
        'denominator',
        `${template.file}: ${read.counted} named-widget tag(s) in the text, ${read.parsed} ` +
          `parsed — an unbalanced quote swallows the rest of the file, and every element ` +
          `after it stops being examined`,
      );
    byPath.get(template.file).read = read;

    const said = readMessages(template.file, template.content);
    if (said.errors.length)
      throw new AriaError(
        'denominator',
        `${template.file} does not parse (${said.errors[0].msg}) — point 6 would then read ` +
          `a message-free template and pass it`,
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
    byPath.get(template.file).roles = said.roles;
    const contextual = said.roles.filter((r) => tables.contexts.has(r.role));
    const contextsCounted = countOf(
      template.content.replace(COMMENT, ''),
      contextCounter(tables),
    );
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
  // `aria-label`, written on the tag, reach the thing it names.
  for (const component of components) {
    const tags = hostTags(component.selector);
    component.hostIsWidget =
      (tags.length > 0 && tags.every((t) => tables.focusable.has(t))) ||
      component.host.has('role') ||
      component.host.has('[attr.role]');
    const template = component.templatePath
      ? byPath.get(component.templatePath)
      : null;
    component.widgets = template?.read?.widgets ?? [];
    // Where each of them stands in the conditional structure, joined to the tag scan by the
    // offset both readings report. A focusable element the walk never reached would be one
    // point 4 could say nothing about — and it would say it by passing, so it is a
    // denominator failure like every other half-read template above.
    for (const widget of component.widgets) {
      const path = template.paths.get(widget.offset);
      if (path === undefined)
        throw new AriaError(
          'denominator',
          `${component.templatePath}: a widget <${widget.tag}> at offset ${widget.offset} ` +
            `is in the tag scan and not in the parsed tree — point 4 asks which elements can ` +
            `stand in the DOM together, and about this one it would have nothing to ask`,
        );
      widget.path = path;
    }
    component.needsName =
      !component.hostIsWidget && component.widgets.length > 0;
  }

  // ── 2. an ARIA name in a host block ──────────────────────────────────────────
  for (const component of components) {
    const written = HOST_NAME_KEYS.filter((key) => component.host.has(key));
    if (written.length && !component.hostIsWidget)
      throw new AriaError(
        'host',
        `${component.className} (${component.file}) writes ${written.join(', ')} into its ` +
          `host block, and the host carries no role — ARIA prohibits a name on a generic ` +
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
  for (const component of naming) {
    const carriers = component.widgets.filter((widget) =>
      NAME_ATTRIBUTES.every((attribute, i) =>
        (widget.attrs.get(attribute) ?? '').includes(`${NAME_INPUTS[i]}(`),
      ),
    );
    if (carriers.length === 0)
      throw new AriaError(
        'forwarded',
        `${component.className} (${component.templatePath}): none of the ` +
          `${component.widgets.length} element(s) that carry a name bind both ` +
          `${NAME_ATTRIBUTES.join(' and ')} to the inputs, and one has to — an input read ` +
          `by nobody names nothing`,
      );
    // The pairwise rule is about the FOCUSABLE carriers, because that is what "two names for
    // one control" means: two things a user can land on, each announcing the same name. A
    // container named alongside the control that owns it is not that — it is the APG's own
    // arrangement, and `pct-select` is the case: the combobox trigger and the `role="listbox"`
    // it opens carry one name between them, deliberately. "Container" is asked of the element
    // and not of a list of roles: the thing the user lands on is the one that counts, and a
    // `role="combobox"` on a `<button>` is that thing although ARIA files the role under
    // `composite` (plan 4.20).
    const landable = carriers.filter((widget) =>
      isFocusable(widget.tag, widget.attrs),
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
  let pairs = 0;
  for (const template of templates) {
    const said = byPath.get(template.file).said;
    const hints = said.filter((m) => m.part.endsWith('hint'));
    const errors = said.filter((m) => m.part.endsWith('error'));
    for (const hint of hints)
      for (const error of errors) {
        pairs++;
        if (exclusive(hint, error)) continue;
        throw new AriaError(
          'description',
          `${template.file}: \`${hint.part}\` and \`${error.part}\` can be in the DOM at ` +
            `the same time — they are not two branches of one conditional. Then the control ` +
            `grows by a row on an error and \`aria-describedby\` names a message the wrapped ` +
            `same control never shows (req-api-message)`,
        );
      }
  }

  // ── 7. the message announces itself ─────────────────────────────────────────
  // A validation message appears without anybody being pointed at it, so the text the user
  // can read has to BE the live region — one owner for one sentence, rather than the shared
  // channel repeating what is already on the screen (0026). The rule is the narrow one:
  // `role="alert"` on the error part itself, which is what every template here already does
  // and what `req-a11y-built-in` promises in those words. `aria-live` on a wrapper would
  // satisfy a reader and move the owner off the sentence, and then two components would
  // announce the same fact in two shapes.
  let announced = 0;
  for (const template of templates)
    for (const message of byPath.get(template.file).said) {
      if (!message.part.endsWith('error')) continue;
      if (message.role === LIVE_ROLE) {
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
          `user reads has to be the live region that speaks it: \`role="${LIVE_ROLE}"\`, ` +
          `written as a plain attribute (req-a11y-built-in)`,
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
  const hidden = components.filter((c) =>
    HOST_HIDDEN_KEYS.some((key) => c.host.has(key)),
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
  // defect. Generic elements, `presentation`/`none` and Angular's containers are looked
  // through. Where the template runs out, the host answers, and a host with no role hands the
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
      examined++;
      let settled = false;
      for (const ancestor of element.ancestors) {
        if (TRANSPARENT_TAGS.has(ancestor.tag)) continue;
        if (ancestor.boundRole)
          throw new AriaError(
            'context',
            `${template.file}: <${element.tag} role="${element.role}"> stands under ` +
              `<${ancestor.tag}> whose role is BOUND, so what owns it is not in the ` +
              `template — a role that requires a context (${contextOf(element.role)}) ` +
              `wants an owner a reader of the source can see`,
          );
        const role =
          ancestor.role ?? tables.implicitRoles.get(ancestor.tag) ?? null;
        if (TRANSPARENT_ROLES.has(role)) continue;
        if (role === null) {
          // Looked through — unless it carries ARIA or takes focus, which is the line axe
          // draws: such an element is in the tree, and a listbox may not own it. The select's
          // own measured case (plan 4.3) is this one: `role="group"` taken off a wrapper that
          // keeps its `aria-labelledby`.
          const held = ancestor.aria
            ? 'an ARIA attribute'
            : ancestor.tabindex || tables.focusable.has(ancestor.tag)
              ? 'a way to land on it'
              : null;
          if (held === null) continue;
          throw new AriaError(
            'context',
            `${template.file}: <${element.tag} role="${element.role}"> stands under ` +
              `<${ancestor.tag}> with no role and ${held} — such an element is not looked ` +
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
            `<${ancestor.tag}${ancestor.role ? ` role="${ancestor.role}"` : ''}> (${role}), ` +
            `and nothing but ${contextOf(element.role)} may stand between a ` +
            `\`${element.role}\` and its owner — the audit reports this as a critical ` +
            `\`aria-required-children\` on a page that opens the panel, and no page has to`,
        );
      }
      if (settled) continue;
      // The template ran out: the owner is the host, or it is outside this component.
      const hosts = owners.map((owner) => ({
        owner,
        role: owner.host.get('role') ?? null,
        bound: owner.host.has('[attr.role]'),
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
      `own (${sorted(naming.map((c) => c.selector)).join(', ')}); ${pairs} hint/error pair(s) ` +
      `on separate branches, ${announced} error part(s) announcing themselves, ` +
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

const collectInput = (root, files) => ({
  tables: TABLES,
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

const fixtureInput = (directory, tables = TABLES) => ({
  ...collectInput(
    directory,
    globSync('**/*.{ts,html,md}', { cwd: directory })
      .map((p) => p.split('\\').join('/'))
      .sort(),
  ),
  tables,
});

/**
 * The tables a case asks for: the live ones, none at all (`"tables": null`), or the live
 * ones with entries taken out (`"tables": { "drop": { "focusable": ["summary"] } }`) — the
 * derivation's own denominator, doctored the way the file-based cases doctor a template.
 */
const tablesFor = (fx) => {
  if (!('tables' in fx)) return TABLES;
  if (fx.tables === null) return null;
  const tables = Object.fromEntries(
    Object.entries(TABLES).map(([name, set]) => [name, new Set(set)]),
  );
  for (const [name, entries] of Object.entries(fx.tables.drop ?? {}))
    for (const entry of entries) tables[name]?.delete(entry);
  return tables;
};

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
    checkAria(fixtureInput(directory, tablesFor(fx)));
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
