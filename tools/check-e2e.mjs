#!/usr/bin/env node
/**
 * E2E race gate: a number or an index standing where a condition belonged
 * (`req-quality-e2e`) — a shape a reader can look for, where a green full run of the suite
 * says nothing at all (`lesson-192`).
 *
 *  1. CORPUS: the walk found specs, and a vocabulary derived from the helpers they import,
 *  2. PARSER: every spec file read into balanced statements, none of them silently skipped,
 *  3. RACE: a positional locator read after an action with no auto-retrying assertion between,
 *  4. BASELINE: a bare `waitForTimeout` whose next statement takes a later assertion's baseline.
 *
 * The answer to a finding is a CONDITION, never a bigger number; an exemption, if one is ever
 * needed, arrives as a register with a reason per entry and not as a deleted rule.
 *
 * Usage: node tools/check-e2e.mjs
 */
import {
  cpSync,
  globSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
} from 'node:fs';
import { execFileSync } from 'node:child_process';
import { basename, dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { runnerControl } from './runner-control.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FIXTURES = join(ROOT, 'tools/check-e2e.fixtures');
const REFERENCE = '_reference';
const RUNNER = '_runner.json';

/**
 * The two suites, as directories rather than as a list of spec names. A new spec is to be
 * covered from its first commit, and a hard-coded list would drift at the first one — then
 * it would be the gate that stopped seeing, not CI that fired (`check-styles`'s note, and
 * `lesson-48` under it).
 */
const SUITES = ['apps/sandbox-e2e/src', 'apps/docs-e2e/src'];

// ── the three vocabularies ────────────────────────────────────────────────────

/**
 * Playwright's own ONE-SHOT reads on a locator: each resolves the selector once, at the
 * instant it runs, and answers about whatever stood there then. Some of them wait for the
 * element to be attached first — and that is exactly the trap the toast case fell into: the
 * PREVIOUS toast was attached, so the wait was satisfied and the reading was its paint.
 *
 * `expect(locator)` is the other thing entirely: it re-runs the query and re-checks the
 * assertion until it holds or the timeout runs out, so the locator is resolved again on
 * every retry. That difference is the whole of point 3.
 */
const PLAYWRIGHT_READS = [
  'evaluate',
  'evaluateAll',
  'evaluateHandle',
  'textContent',
  'innerText',
  'innerHTML',
  'getAttribute',
  'boundingBox',
  'inputValue',
  'allTextContents',
  'allInnerTexts',
  'isVisible',
  'isHidden',
  'isChecked',
  'isEnabled',
  'isDisabled',
  'isEditable',
  'ariaSnapshot',
  'elementHandle',
  'elementHandles',
];

/**
 * Playwright's own waiting and retrying calls — the things that end an unsettled window
 * because they resolve on a CONDITION of the page rather than on the clock.
 * `waitForTimeout` is deliberately not among them: it is the clock and nothing else, which
 * is what point 4 is about.
 */
const PLAYWRIGHT_WAITS = [
  'waitFor',
  'waitForSelector',
  'waitForFunction',
  'waitForURL',
  'waitForLoadState',
  'waitForEvent',
  'waitForRequest',
  'waitForResponse',
  'toPass',
  'poll',
];

/**
 * Playwright's own calls that CHANGE the page — the ones that open the window in which a
 * one-shot read answers for a state nobody chose. An action auto-waits for its own target
 * to be actionable and says nothing whatever about what the action then sets off.
 */
const PLAYWRIGHT_ACTIONS = [
  'click',
  'dblclick',
  'press',
  'pressSequentially',
  'fill',
  'type',
  'check',
  'uncheck',
  'setChecked',
  'hover',
  'tap',
  'selectOption',
  'clear',
  'focus',
  'blur',
  'dispatchEvent',
  'setInputFiles',
  'dragTo',
  'addStyleTag',
  'addScriptTag',
  'emulateMedia',
  'setViewportSize',
  'goto',
  'reload',
];

/** `.last()`, `.first()`, `.nth(n)` — a locator that picks by POSITION and not by identity. */
const POSITIONAL = /\.(?:last|first)\s*\(\s*\)|\.nth\s*\(/;

/** `page.waitForTimeout(150)` — the clock standing in for a condition. */
const BARE_WAIT = /\.waitForTimeout\s*\(/;

/**
 * The two names points 3 and 4 read as themselves rather than through a vocabulary: a
 * `test(` opens a new test and an `await expect(` closes the window an action opened.
 */
const READ_AS_THEMSELVES = new Set(['test', 'expect']);

// ── the error ─────────────────────────────────────────────────────────────────

/**
 * A violation of one of the four points. It carries the point's identifier and, where the
 * point holds more than one, the rule's: the negative control has to verify that a prepared
 * input fired ON ITS OWN point and on its own rule — an input failing for another reason
 * proves something other than what it declares.
 */
class E2eError extends Error {
  constructor(check, description, rule) {
    super(description);
    this.check = check;
    this.rule = rule;
  }
}

// ── reading a source ──────────────────────────────────────────────────────────

/**
 * Comments and the BODIES of strings blanked, the length and every newline kept — so a line
 * number computed on the masked text is the line number in the file. Everything below looks
 * for method names and identifiers, and a `'.last()'` inside a comment explaining the bug is
 * not a call. The `${…}` of a template literal is blanked with the rest: a test id built out
 * of a loop variable is a string either way, and nothing here rules on what is in one.
 */
const mask = (text) => {
  const out = [...text];
  let i = 0;
  const blank = (from, to) => {
    for (let k = from; k < to && k < out.length; k++)
      if (out[k] !== '\n') out[k] = ' ';
  };
  while (i < text.length) {
    const c = text[i];
    if (c === '/' && text[i + 1] === '/') {
      const end = text.indexOf('\n', i);
      blank(i, end < 0 ? text.length : end);
      i = end < 0 ? text.length : end;
    } else if (c === '/' && text[i + 1] === '*') {
      const end = text.indexOf('*/', i + 2);
      blank(i, end < 0 ? text.length : end + 2);
      i = end < 0 ? text.length : end + 2;
    } else if (c === "'" || c === '"' || c === '`') {
      let k = i + 1;
      while (k < text.length && text[k] !== c) k += text[k] === '\\' ? 2 : 1;
      blank(i + 1, Math.min(k, text.length));
      i = k + 1;
    } else if (c === '/' && regexHere(out, i)) {
      // A REGEX literal, and this is not pedantry: `a11y.spec.ts` holds
      // `.replace(/^```\s*$/m, …)`, whose three backticks opened a template literal that
      // swallowed the next eight lines and one brace with them. Point 2 is what found it —
      // the file came back with a block it never closed — which is the whole argument for a
      // scanner having a denominator of its own.
      let k = i + 1;
      let inClass = false;
      while (k < text.length && text[k] !== '\n') {
        if (text[k] === '\\') k += 2;
        else if (text[k] === '[') ((inClass = true), k++);
        else if (text[k] === ']') ((inClass = false), k++);
        else if (text[k] === '/' && !inClass) break;
        else k++;
      }
      if (text[k] === '/') {
        blank(i + 1, k);
        i = k + 1;
      } else i++;
    } else i++;
  }
  return out.join('');
};

/**
 * Does a `/` at this position open a regex rather than divide? The answer is the previous
 * significant character, read off what has ALREADY been masked so a `/` in a comment or a
 * string never gets here: a regex may follow an operator, an opening bracket, a comma or a
 * keyword, and a division follows a value — an identifier, a number, a `)` or a `]`.
 */
const REGEX_AFTER = new Set([...'(,=:[!&|?{};+-*%<>~^', undefined]);
const REGEX_KEYWORDS =
  /\b(?:return|typeof|instanceof|case|in|of|new|delete|void|await|yield)$/;

const regexHere = (out, at) => {
  let k = at - 1;
  while (k >= 0 && /\s/.test(out[k])) k--;
  if (k < 0) return true;
  if (REGEX_AFTER.has(out[k])) return true;
  return REGEX_KEYWORDS.test(out.slice(Math.max(0, k - 12), k + 1).join(''));
};

/**
 * A `{` opens a BLOCK when what stands before it is `)`, `=>`, `}`, `{`, `;` or one of
 * `else`/`do`/`try`/`finally`; anywhere else — after `(`, `,`, `:`, `=`, `return` — it opens
 * an object literal, and splitting there would shred a statement into cells.
 */
const BLOCK_AFTER = /(?:[)>};{]|\b(?:else|do|try|finally))$/;

/**
 * The statements of a file, each with the block frames it stands in.
 *
 * Hand-written rather than taken from a parser, for the reason every gate here is
 * hand-written: a dependency for it would be a bump that changes what a gate reads
 * (`req-project-dependencies`). What it needs is small — the material is this repository's
 * own prettier-formatted TypeScript.
 *
 * Opening a block RESETS the paren and bracket depths and the close restores them, because
 * a test body is a block inside a call: `test('…', async ({ page }) => {` leaves one paren
 * open, and without the reset not a single `;` inside the body would be a boundary. That is
 * not a hypothesis — the first version of this scanner found 18 of the suite's 22 waits and
 * zero of everything else, and looked exactly as green as a working one.
 *
 * `balanced` is the parser's own denominator, read by point 2: a file whose frames do not
 * close is a file this scanner lost the thread of, and every rule would pass over the rest
 * of it without a trace.
 */
const statements = (masked) => {
  const out = [];
  const frames = [];
  const open = [];
  let paren = 0;
  let bracket = 0;
  let start = 0;
  let line = 1;
  let atLine = 1;
  const flush = (i) => {
    const text = masked.slice(start, i).trim();
    if (text)
      out.push({
        line: atLine,
        text: text.replace(/\s+/g, ' '),
        frames: open.filter(Boolean).map((f) => f.id),
      });
    start = i + 1;
    atLine = line;
  };
  for (let i = 0; i < masked.length; i++) {
    const c = masked[i];
    if (c === '\n') {
      line++;
      if (masked.slice(start, i).trim() === '') atLine = line;
      continue;
    }
    if (c === '(') paren++;
    else if (c === ')') paren = Math.max(0, paren - 1);
    else if (c === '[') bracket++;
    else if (c === ']') bracket = Math.max(0, bracket - 1);
    else if (c === ';' && paren === 0 && bracket === 0) flush(i);
    else if (c === '{') {
      if (BLOCK_AFTER.test(masked.slice(Math.max(0, i - 24), i).trimEnd())) {
        const head = masked.slice(start, i).trim();
        const frame = {
          id: frames.length,
          loop: /\b(?:for|while)\s*\(/.test(head) || /\bdo$/.test(head),
          from: i,
          to: masked.length,
          paren,
          bracket,
        };
        flush(i);
        frames.push(frame);
        open.push(frame);
        paren = 0;
        bracket = 0;
      } else open.push(null);
    } else if (c === '}') {
      const frame = open.pop();
      if (frame) {
        flush(i);
        frame.to = i;
        paren = frame.paren;
        bracket = frame.bracket;
      }
    }
  }
  return { statements: out, frames, open: open.length, balanced: !open.length };
};

/**
 * The definitions a file makes: `const name = (…) => …`, with `async` or type parameters
 * before the list, `const name = function (…) { … }` and `function name(…) { … }`, each with
 * the text of its body; and `const name = other;`, whatever `other` is, whose body is a call
 * of it — a second name for a helper is whatever the first is, and one for a value is
 * nothing. This is how the three vocabularies
 * below stop being lists somebody typed and become lists this repository's own helpers are
 * read into — and a shape left out of it is a helper read as no kind at all.
 */
const definitions = (masked) => {
  const found = [];
  const FUNCTION =
    /(?:^|[^\w$.])(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*(?::[^=;]*)?=\s*(?:async\s+)?(?:function\b\s*[\w$]*\s*)?(?:<(?:[^<>()]|<[^<>()]*>)*>\s*)?\(|(?:^|[^\w$.])function\s+([A-Za-z_$][\w$]*)\s*(?:<(?:[^<>()]|<[^<>()]*>)*>\s*)?\(/g;
  const lineOf = (m) =>
    masked.slice(0, m.index + m[0].search(/[A-Za-z_$]/)).split('\n').length;
  for (const m of masked.matchAll(REBINDING))
    found.push({ name: m[1], body: `${m[2]}()`, line: lineOf(m) });
  for (const m of masked.matchAll(FUNCTION)) {
    const name = m[1] ?? m[2];
    let paren = 0;
    let k = m.index + m[0].length - 1;
    for (; k < masked.length; k++) {
      if (masked[k] === '(') paren++;
      else if (masked[k] === ')' && --paren === 0) break;
    }
    // What follows the parameter list decides which shape this is, and the decision is
    // WHICHEVER COMES FIRST — an `=>` for an arrow, a `{` for a function declaration. Not a
    // regex over the return type: `function styleOf(…): Promise<string> {` is followed by a
    // body whose own first line holds an `=>`, and a pattern that reaches for it takes the
    // callback for the function and reads the body as everything but itself. That is how
    // `styleOf` came back NOT a reader, which is a silent gate and not a loud one. A return
    // annotation is stepped over first, as its own `{` — `Promise<{ colour: string }>` — is
    // a type and no body.
    const from = returned(masked, k + 1, !/\bfunction\b/.test(m[0]));
    const after = masked.slice(from, from + 400);
    const arrowAt = after.indexOf('=>');
    const braceAt = after.indexOf('{');
    // An overload's signature, or a `declare`d one, ends at its `;` and has no body: what
    // follows it is the next signature or the implementation, read on its own match.
    const ends = after.indexOf(';');
    if (ends >= 0 && [arrowAt, braceAt].every((at) => at < 0 || ends < at))
      continue;
    let body = '';
    if (arrowAt >= 0 && (braceAt < 0 || arrowAt < braceAt)) {
      let at = from + arrowAt + 2;
      while (at < masked.length && /\s/.test(masked[at])) at++;
      body =
        masked[at] === '{' ? braced(masked, at) : upToSemicolon(masked, at);
    } else if (braceAt >= 0) body = braced(masked, from + braceAt);
    found.push({ name, body, line: lineOf(m) });
  }
  return found;
};

/**
 * What a file takes from a relative module: every `import … from` whose module is `.`, `..` or
 * a path under either, the last word of each part of its clause as `name` — `a`, the `b` of
 * `a as b`, the `ns` of `* as ns`, the default binding — and the binding as `written`: `a`,
 * `a as b`, `* as ns`, and `default as d` for the default, which names no export of its own.
 * An `import type` is skipped whole, a namespace of types with it: none of its bindings can be
 * called. The line is the one the import starts on. A package is not read: Playwright's names are
 * the base of every vocabulary, and `node:fs` reads no page. The clause is read on the masked
 * text, where a comment between its names is blank, and the module off the source at the
 * same offsets, because the mask blanks every string.
 */
const IMPORT = /^import\s+([\w$*{},\s]+?)\s*from\s*(['"])/gm;

/** `.`, `..` or a path under either: a module of the suite's own, and no package. */
const RELATIVE = /^\.\.?(?:\/|$)/;

const imports = (source) =>
  bindingsOf(source).filter((i) => RELATIVE.test(i.module));

/** Every binding a file's value imports make, from a package or a relative module alike. */
const bindingsOf = ({ text, masked }) => {
  const found = [];
  for (const m of masked.matchAll(IMPORT)) {
    const from = m.index + m[0].length;
    const module = text.slice(from, masked.indexOf(m[2], from));
    if (/^type\s/.test(m[1])) continue;
    const line = masked.slice(0, m.index).split('\n').length;
    const [outside, inside = ''] = m[1].split('{');
    const parts = [
      ...outside.split(',').map((part) => [part, false]),
      ...inside
        .replace('}', '')
        .split(',')
        .map((part) => [part, true]),
    ];
    for (const [part, named] of parts) {
      const words = part.trim().split(/\s+/);
      const name = words.at(-1);
      const imported = named ? words[words[0] === 'type' ? 1 : 0] : 'default';
      const written =
        words.at(-2) === 'as'
          ? words.slice(-3).join(' ')
          : named
            ? name
            : `default as ${name}`;
      if (name)
        found.push({
          line,
          module,
          name,
          imported,
          written,
          namespace: words[0] === '*',
        });
    }
  }
  return found;
};

/**
 * What a module of the corpus answers for a name another file imports from it: what it
 * `defined` in a shape the vocabularies read; what it `declared` otherwise (a value, a call's
 * result, a class) and which of those are `objects` — a `{ … }` or a class, whose helpers
 * would be called as members; its re-exports by name (`export { a, b as c } from './x'`),
 * the names it exports by a list of its own (`export { a, b as c };`) with the `bindings` its
 * imports make, `namespaces` (`export * as ns from './x'`) and `stars` (`export * from
 * './x'`); and whether it has a default export. Read at column 0, where prettier puts what
 * a module declares, and on the masked text, the module of a re-export off the source at the
 * same offsets. `export type` is no value and matches none of it.
 */
const exportsOf = ({ text, masked }) => {
  const NAME = '([A-Za-z_$][\\w$]*)';
  const at = (pattern) => [...masked.matchAll(new RegExp(pattern, 'gm'))];
  const out = {
    defined: new Set(definitions(masked).map((d) => d.name)),
    declared: new Set(
      at(
        `^(?:export\\s+)?(?:async\\s+)?(?:const|let|var|function\\*?|class)\\s+${NAME}`,
      ).map((m) => m[1]),
    ),
    objects: new Set(
      at(
        `^(?:export\\s+)?(?:(?:const|let|var)\\s+${NAME}\\s*(?::[^=;]*)?=\\s*\\{|(?:abstract\\s+)?class\\s+${NAME})`,
      ).map((m) => m[1] ?? m[2]),
    ),
    reexports: new Map(),
    listed: new Map(),
    bindings: new Map(bindingsOf({ text, masked }).map((b) => [b.name, b])),
    namespaces: new Set(),
    stars: [],
    exportsDefault: at('^export\\s+default\\b').length > 0,
  };
  const pairs = (list) =>
    list
      .split(',')
      .map((part) => part.trim().split(/\s+/))
      .filter((words) => words[0]);
  for (const m of at(
    `^export\\s+(\\*(?:\\s+as\\s+[A-Za-z_$][\\w$]*)?|\\{[^}]*\\})\\s*from\\s*(['"])`,
  )) {
    const from = m.index + m[0].length;
    const module = text.slice(from, masked.indexOf(m[2], from));
    const clause = m[1].trim();
    if (clause === '*') out.stars.push(module);
    else if (clause.startsWith('*'))
      out.namespaces.add(clause.split(/\s+/).at(-1));
    else
      for (const words of pairs(clause.slice(1, -1)))
        out.reexports.set(words.at(-1), { module, imported: words[0] });
  }
  for (const m of at('^export\\s+\\{([^}]*)\\}\\s*;'))
    for (const words of pairs(m[1])) out.listed.set(words.at(-1), words[0]);
  return out;
};

/**
 * Where an import of `name` from `module`, written in `from`, leads: to a file of the corpus
 * (`x.ts`, or `x/index.ts`), through its re-exports, to what that file answers — `defined`,
 * `unread`, `object`, `namespace`, `renamed` — or to a `package`, or nowhere: `unheld`, a
 * module no file of the corpus answers for, `missing`, a file that answers and holds no such
 * name. `where` is the module the last step named.
 */
const lookup = (modules, from, module, name, seen = new Set()) => {
  if (!RELATIVE.test(module)) return { kind: 'package' };
  const base = join(dirname(from), module).split('\\').join('/');
  const file = [`${base}.ts`, `${base}/index.ts`].find((f) => modules.has(f));
  if (!file) return { kind: 'unheld', where: module };
  if (seen.has(file)) return { kind: 'missing', where: module };
  seen.add(file);
  const m = modules.get(file);
  if (name === 'default')
    return m.exportsDefault || m.listed.has(name) || m.reexports.has(name)
      ? { kind: 'unread' }
      : { kind: 'missing', where: module };
  if (m.objects.has(name)) return { kind: 'object' };
  if (m.defined.has(name)) return { kind: 'defined' };
  if (m.declared.has(name)) return { kind: 'unread' };
  const re = m.reexports.get(name);
  if (re)
    return re.imported === name
      ? lookup(modules, file, re.module, name, seen)
      : { kind: 'renamed' };
  const local = m.listed.get(name);
  if (local !== undefined && local !== name) return { kind: 'renamed' };
  const bound = local === name && m.bindings.get(name);
  if (bound)
    return bound.written === name
      ? lookup(modules, file, bound.module, bound.imported, seen)
      : { kind: 'renamed' };
  if (m.namespaces.has(name)) return { kind: 'namespace' };
  const starred = m.stars.map((star) =>
    lookup(modules, file, star, name, seen),
  );
  return (
    starred.find((r) => r.kind !== 'missing' && r.kind !== 'unheld') ??
    starred.find((r) => r.kind === 'unheld') ?? {
      kind: 'missing',
      where: module,
    }
  );
};

/**
 * Where a definition's head ends once the parameters are read, from `at`: past a return
 * annotation, if one stands there, to the first `{`, `;` or — for an arrow — `=>` outside every
 * bracket the type opened, after a type that is complete. A `{` where a type is expected (after
 * the `:`, a `<`, a `|`, an `&`, a `,`) opens an object type and belongs to it; a `=>` in a
 * declaration's annotation is a function type's.
 */
const returned = (text, at, arrow) => {
  let i = at;
  while (/\s/.test(text[i] ?? '')) i++;
  if (text[i] !== ':') return at;
  let depth = 0;
  let expecting = true;
  for (i++; i < text.length; i++) {
    const c = text[i];
    if (/\s/.test(c)) continue;
    if (text.startsWith('=>', i)) {
      if (depth === 0 && !expecting && arrow) return i;
      i++;
      expecting = true;
    } else if (depth === 0 && !expecting && (c === '{' || c === ';')) return i;
    else if ('<({['.includes(c)) {
      depth++;
      expecting = true;
    } else if ('>)}]'.includes(c)) {
      depth--;
      expecting = false;
    } else expecting = '|&,:?'.includes(c);
  }
  return at;
};

const REBINDING =
  /(?:^|[^\w$.])(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*(?::[^=;]*)?=\s*([A-Za-z_$][\w$]*)\s*;/g;

const braced = (text, at) => {
  let depth = 0;
  for (let i = at; i < text.length; i++) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}' && --depth === 0) return text.slice(at, i);
  }
  return text.slice(at);
};

const upToSemicolon = (text, at) => {
  let depth = 0;
  for (let i = at; i < text.length; i++) {
    if (text[i] === '(' || text[i] === '[') depth++;
    else if (text[i] === ')' || text[i] === ']') depth--;
    else if (text[i] === ';' && depth <= 0) return text.slice(at, i);
  }
  return text.slice(at);
};

/**
 * Playwright's own names are always METHODS — `locator.fill(…)`, `page.waitForSelector(…)`
 * — and a helper this repository writes is always a free function. Keeping the two apart is
 * not tidiness: `skeleton.spec.ts` has a `fill(page, id)` that returns a locator, and read
 * as Playwright's `fill` it turned a plain lookup into an action and reported a race four
 * lines later that is not one.
 */
const method = (text, name) =>
  new RegExp(`\\.${escaped(name)}\\s*${TYPE_ARGUMENTS}\\(`).test(text);
const free = (text, name) =>
  new RegExp(`(?:^|[^\\w$.])${escaped(name)}\\s*${TYPE_ARGUMENTS}\\(`).test(
    text,
  );

/** A call through a name: `name.member(…)`, which no vocabulary reads as the name's own. */
const through = (text, name) =>
  new RegExp(
    `(?:^|[^\\w$.])${escaped(name)}\\s*\\.\\s*[A-Za-z_$][\\w$]*\\s*${TYPE_ARGUMENTS}\\(`,
  ).test(text);

/**
 * A name as it goes into a pattern: an identifier holds nothing a regex reads but `$`, which
 * is its end-of-input anchor — `$rimOf(` written into a pattern unescaped matches nothing, and
 * a reader by that name would be a read no rule ever sees.
 */
const escaped = (name) => name.replaceAll('$', '\\$');

/**
 * Type arguments between a name and its call, `styleOf<'color'>(…)`, with one level of
 * arguments of their own, `pick<Record<string, string>>(…)`. A function type among them holds
 * parentheses, and is no argument this reads.
 */
const TYPE_ARGUMENTS = '(?:<(?:[^<>()]|<[^<>()]*>)*>\\s*)?';

/**
 * A vocabulary: Playwright's own names, closed over the corpus's helpers. A helper that
 * reaches one of the base names IS one — `styleOf` is `locator.evaluate`, `boxOf` is
 * `locator.boundingBox`, `centreOf` in `slider.spec.ts` is `boxOf`, and `visit` reaches
 * `locator.waitFor`. That closure is the point: the list of readers has to be derived from
 * what the support tree and the specs actually define, because a typed list goes stale the
 * first time somebody writes a helper of their own — and a reader the gate does not know is
 * a race the gate does not see.
 */
const vocabulary = (base, defined, under) => {
  const names = new Set(defined.map((d) => d.name));
  const derived = new Set(
    [...(under?.derived ?? [])].filter((n) => !names.has(n)),
  );
  for (let pass = 0; pass < 8; pass++) {
    let grew = false;
    for (const d of defined) {
      if (derived.has(d.name)) continue;
      if (
        base.some((n) => method(d.body, n)) ||
        [...derived].some((n) => free(d.body, n))
      ) {
        derived.add(d.name);
        grew = true;
      }
    }
    if (!grew) break;
  }
  return { base, derived };
};

const any = (text, vocab) =>
  vocab.base.some((n) => method(text, n)) ||
  [...vocab.derived].some((n) => free(text, n));

/**
 * The three vocabularies over one set of definitions, or over a spec's own `under` the
 * shared ones: what the support tree defines is derived once, from the support tree, and a
 * spec's definitions only add to it — a name the spec defines itself stands for the spec's
 * definition, and a shared helper is still whatever the support tree made it, whatever the
 * spec calls its own.
 */
const vocabulariesOf = (defined, under) => ({
  readers: vocabulary(PLAYWRIGHT_READS, defined, under?.readers),
  waits: vocabulary(PLAYWRIGHT_WAITS, defined, under?.waits),
  actions: vocabulary(PLAYWRIGHT_ACTIONS, defined, under?.actions),
});

/** What a definition does, in the vocabularies it is read with: `reads`, `waits`, `acts`. */
const kindOf = (body, vocabularies) =>
  [
    ['reads', vocabularies.readers],
    ['waits', vocabularies.waits],
    ['acts', vocabularies.actions],
  ]
    .filter(([, vocab]) => any(body, vocab))
    .map(([word]) => word)
    .join(', ') || 'nothing';

/** A block of findings, one per line, indented under the sentence that introduces them. */
const list = (entries) => entries.map((e) => `      ${e}`).join('\n');

// ── the checks ────────────────────────────────────────────────────────────────

/**
 * The full set of checks over a ready input:
 *   `specs`   — `[{ file, masked, parse }]`, the spec files and what the scanner made of them,
 *   `sources` — every `.ts` of the two suites, the material the vocabularies are derived from.
 * Returns `{ description, errors }` rather than throwing. The denominator short-circuits —
 * a rule over a corpus that is not there proves nothing either way — but points 3 and 4 are
 * independent rules over one corpus and BOTH report in a single run, because a gate that
 * hides half of what it found is a gate somebody walks through twice to learn it.
 */
const checkE2e = ({ specs, sources }) => {
  // 1. and 2. The denominator: something to read, and a scanner that read all of it.
  //
  //    The SHARED half of every vocabulary is what the support tree defines — the helpers
  //    a spec imports. The rest is the spec's own, and that half is deliberately not
  //    pooled: a helper name is file-local, and two specs here really do disagree about
  //    one. `visual.spec.ts` has a `stage(page, path)` that navigates and waits, and
  //    `shell.spec.ts` has a `stage(testid)` that builds a selector string. Pooled, the
  //    first taught the gate that `stage(…)` waits for the page — and a real finding in
  //    the second went quiet behind it, which is a gate passing for a reason that has
  //    nothing to do with the code it was reading.
  //
  //    A spec's own definition of a shared name stands in for the shared one within that
  //    spec, as TypeScript has it: `hero.spec.ts` writes a `styleOf` of its own, and the
  //    union of the two would read a call to it as whatever either one does.
  const shared = sources
    .filter((s) => !s.file.endsWith('.spec.ts'))
    .flatMap((s) => definitions(s.masked).map((d) => ({ ...d, file: s.file })));
  const common = vocabulariesOf(shared);
  const own = specs.map((spec) => {
    const defined = definitions(spec.masked).map((d) => ({
      ...d,
      file: spec.file,
    }));
    return { spec, defined, vocabularies: vocabulariesOf(defined, common) };
  });
  const denominator =
    corpus({ specs, sources, shared, common, own }) ?? parser(specs);
  if (denominator) return { description: null, errors: [denominator] };

  // 3. and 4. The rules, over every spec in order, each gathering ALL of its own findings:
  //    a race gate that names one site per run is a gate somebody walks through thirteen
  //    times, and the thirteenth report is the one nobody reads.
  let positional = 0;
  let bare = 0;
  const races = [];
  const baselines = [];
  for (const { spec, vocabularies } of own) {
    const found = race(spec, vocabularies);
    positional += found.seen;
    races.push(...found.findings);
    const waited = baseline(spec, vocabularies);
    bare += waited.seen;
    baselines.push(...waited.findings);
  }

  const errors = [];
  if (races.length)
    errors.push(
      new E2eError(
        'race',
        `${races.length} positional locator read(s) taken in the window an action opened, ` +
          `with no auto-retrying assertion between:\n${list(races)}\n` +
          `    A one-shot read resolves the locator ONCE, at the instant it runs, so it ` +
          `answers for whatever stood at that position then — not for the element the test ` +
          `means. Put an \`await expect(…)\` between the action and the read, naming what ` +
          `the read expects: it retries, and every retry resolves the locator again, which ` +
          `is what makes an index mean the thing the action produced.`,
        'read-after-action',
      ),
    );

  if (baselines.length)
    errors.push(
      new E2eError(
        'baseline',
        `${baselines.length} bare wait(s) standing where a condition belongs:\n` +
          `${list(baselines)}\n` +
          `    The number decides WHEN the reading is taken, so what a later assertion ` +
          `compares against is a function of the machine rather than of the page. Wait for ` +
          `the condition the number stands for — the reading that repeats, the animation ` +
          `that has finished, the element that has arrived — or read the baseline BEFORE the ` +
          `wait and let the wait be a window in which it may not change.`,
        'wait-then-baseline',
      ),
    );

  const description =
    `${specs.length} specs over ${SUITES.length} suites, ` +
    `${common.readers.derived.size} shared readers derived beyond Playwright's own, ` +
    `${positional} positional locator(s) and ${bare} bare wait(s) ruled on`;
  return { description, errors };
};

/**
 * Why a name a file imports from a relative module is one no vocabulary can match, or null.
 * A namespace import always is; any other binding only once the file calls it — by its name,
 * or through it as `binding.member(…)`. `test` and `expect` are the two names points 3 and 4
 * read as themselves: either needs only a file that answers for it, and `expect` has to be
 * Playwright's, as a matcher of the suite's own is no retrying assertion the gate can see.
 */
const unseenWhy = (modules, source, i) => {
  if (i.namespace)
    return "a namespace, through which no call writes a helper's own name";
  const called = free(source.masked, i.name);
  if (!called && !through(source.masked, i.name)) return null;
  const found = lookup(modules, source.file, i.module, i.imported);
  if (found.kind === 'unheld')
    return `no file of the corpus answers for \`${found.where}\``;
  if (found.kind === 'missing')
    return `\`${found.where}\` neither defines nor re-exports \`${i.imported}\``;
  if (i.name === 'test') return null;
  if (i.name === 'expect')
    return found.kind === 'package'
      ? null
      : "an `expect` of the suite's own, which points 3 and 4 cannot see is Playwright's retrying one";
  if (!called)
    return found.kind === 'object' ||
      found.kind === 'namespace' ||
      i.imported === 'default'
      ? `${UNSEEN[i.imported === 'default' ? 'default' : found.kind]}, called through as \`${i.name}.…(…)\``
      : null;
  if (i.written !== i.name)
    return "an alias, which writes no helper's own name";
  return UNSEEN[found.kind] ?? null;
};

/** What a lookup that found something no vocabulary reads found, in a refusal's words. */
const UNSEEN = {
  unread: 'defined in a shape the scanner does not read',
  object: 'an object or a class, whose helpers are its members',
  namespace: 'a namespace a module of the corpus re-exports',
  renamed: 're-exported under another name',
  default: 'a default export, which names nothing the scanner can look into',
};

/**
 * Names defined more than once among `defined`, whose definitions disagree on what a call
 * does in `vocabularies`: one line per name, each definition's kind at its file and line.
 */
const namesakes = (defined, vocabularies) => {
  const byName = Map.groupBy(defined, (d) => d.name);
  return [...byName]
    .filter(
      ([, ds]) => new Set(ds.map((d) => kindOf(d.body, vocabularies))).size > 1,
    )
    .map(
      ([name, ds]) =>
        `\`${name}\` — ` +
        ds
          .map((d) => `${d.file}:${d.line} (${kindOf(d.body, vocabularies)})`)
          .join('; '),
    );
};

/**
 * 1. CORPUS — each kind of material the later points rule on has at least one instance.
 * Returns the violation rather than throwing it: points 3 and 4 are independent rules over
 * one corpus and both have to report in a single run, so the whole set is gathered and
 * handed back. Only the denominator short-circuits, and it short-circuits for a reason —
 * a rule over a corpus that is not there proves nothing either way.
 */
const corpus = ({ specs, sources, shared, common, own }) => {
  if (!specs.length)
    return new E2eError(
      'corpus',
      `no spec found under \`${SUITES.join('/`, `')}/\` — points 3 and 4 would then pass ` +
        `having read not one test. Usual cause: the file list stopped returning anything, ` +
        `which is a green run and not an error (\`lesson-48\`)`,
      'specs',
    );

  const derived = common.readers.derived.size;
  if (derived <= 0)
    return new E2eError(
      'corpus',
      `the shared reader vocabulary resolved nothing past Playwright's own ` +
        `${PLAYWRIGHT_READS.length} names over ${sources.length} source file(s) — this ` +
        `suite reads through helpers ` +
        `(\`styleOf\`, \`boxOf\`, \`attrOf\`, \`centreOf\`), so a vocabulary that holds none ` +
        `of them is one that cannot see a single reading the specs actually take. Usual ` +
        `cause: \`support/\` dropped out of the file list`,
      'readers',
    );

  // A count of readers says nothing about WHICH ones: a support file of two that drops out
  // leaves the other's readers standing, and every reading through the lost one goes quiet —
  // measured on `support/css.ts`, whose `styleOf` takes every colour the races are about. So
  // each helper a file takes from a relative module is followed to the file that module
  // names, through its re-exports, and has to be defined there in a shape the vocabularies
  // read, under the name it is called by.
  const modules = new Map(sources.map((s) => [s.file, exportsOf(s)]));
  const unseen = sources.flatMap((source) =>
    imports(source).flatMap((i) => {
      const why = unseenWhy(modules, source, i);
      return why
        ? [
            `${source.file}:${i.line} — \`${i.written}\`, imported from \`${i.module}\`: ${why}`,
          ]
        : [];
    }),
  );
  if (unseen.length)
    return new E2eError(
      'corpus',
      `${unseen.length} helper(s) imported from a relative module under a name no ` +
        `vocabulary can match:\n${list(unseen)}\n    Every vocabulary is Playwright's own ` +
        `names closed over the helpers the corpus defines, matched by the name a call ` +
        `writes — so a call to one of these could read, wait or act and points 3 and 4 ` +
        `cannot tell which: a race read through it is walked past as agreement. Import a ` +
        `helper by its own name from the file that defines it, define it as a function, and ` +
        `a namespace of types with \`import type\``,
      'helpers',
    );

  // A vocabulary matches by name and takes the union of every definition under one: two
  // support files that define a `visit`, one waiting for the page and one not, make every
  // call to either a wait, and the race after the second goes quiet. The same holds for a
  // name a spec defines twice. Definitions of one name that agree are no harm — both
  // suites' `visit` reads, waits and acts.
  const clashes = [
    ...namesakes(shared, common),
    ...own.flatMap((o) => namesakes(o.defined, o.vocabularies)),
  ];
  if (clashes.length)
    return new E2eError(
      'corpus',
      `${clashes.length} helper name(s) defined more than once, by definitions that ` +
        `disagree on what a call does:\n${list(clashes)}\n    A vocabulary takes the union ` +
        `of every definition under a name, so a call to any of them is read as doing all ` +
        `that any of them does: a call to the one that does not wait is a wait, and the race ` +
        `after it is no race; a locator taken through the one that does not read is a read, ` +
        `and no rule follows it to the read that comes later. Give each its own name`,
      'homonyms',
    );

  const withPositional = specs.filter((s) => POSITIONAL.test(s.masked));
  const withWait = specs.filter((s) => BARE_WAIT.test(s.masked));
  if (!withPositional.length || !withWait.length)
    return new E2eError(
      'corpus',
      `the corpus holds ${withPositional.length} spec(s) with a positional locator and ` +
        `${withWait.length} with a bare \`waitForTimeout\` — point ${withPositional.length ? 4 : 3} ` +
        `then rules on nothing at all and reports it as agreement. This is the denominator, ` +
        `not a formality: both shapes are everywhere in a Playwright suite, and their ` +
        `absence says the scanner stopped reading rather than that the suite got better`,
      'material',
    );
  return null;
};

/** 2. PARSER — a file the scanner cannot account for is one the rules pass over in silence. */
const parser = (specs) => {
  for (const spec of specs) {
    if (!spec.parse.balanced)
      return new E2eError(
        'parser',
        `\`${spec.file}\`: the scanner reached the end of the file with ` +
          `${spec.parse.open} block(s) opened and not closed — it lost the thread somewhere, and from that ` +
          `point on points 3 and 4 read nothing. Either the file does not compile, or it ` +
          `holds a shape this scanner's block rule does not know`,
        'unbalanced',
      );
    if (!spec.parse.statements.length)
      return new E2eError(
        'parser',
        `\`${spec.file}\`: the scanner made no statement of it, and a spec with no ` +
          `statements is a spec with no tests — or a spec this gate reads as empty while ` +
          `Playwright runs every case in it`,
        'empty-file',
      );
  }
  return null;
};

/**
 * 3. RACE — a positional locator read while the page is unsettled.
 *
 * The window opens at an ACTION and closes at an auto-retrying assertion. In between, a
 * one-shot read of a `.last()`/`.first()`/`.nth(n)` answers for whatever stood at that
 * position at that instant — which is not the same thing as what the test means by it. The
 * toast case is the whole argument: `items(page).last()` was the toast this iteration
 * raised, the click that raised it had returned, and the item was appended a frame later,
 * so three of four readings were the PREVIOUS toast's paint and it read as a tone that had
 * quietly lost its colour.
 *
 * What the rule lets through, said plainly so nobody mistakes it for more than it is: ANY
 * auto-retrying assertion closes the window, including one about another element. A test
 * that waits for something is a test whose author thought about arrival; which locator they
 * named is their judgement, and this gate rules on whether there is one. `settled(page)`
 * does NOT close it — it waits for finite animations inside a single `page.evaluate`, which
 * this scanner cannot see through, and in any case an animation finishing says nothing
 * about a node having been appended. The answer to a finding here is the stronger statement
 * anyway: name what the read expects.
 */
const race = (spec, { readers, waits, actions }) => {
  const findings = [];
  let seen = 0;
  let openedAt = null;
  let bound = new Map();
  for (const s of spec.parse.statements) {
    const t = s.text;

    if (/(?:^|[^\w$.])(?:test|describe)\s*(?:\.\w+)?\s*\(/.test(t)) {
      openedAt = null;
      bound = new Map();
    }

    // A call that ENDS by waiting on a condition of the page leaves it settled, whatever
    // it did on the way there: `visit()` navigates and then waits for the shell's marker,
    // and reading the barrier before the action is what keeps it from opening a window of
    // its own.
    const barrier = retrying(t) || any(t, waits);
    if (barrier) openedAt = null;

    const binding = t.match(
      /^(?:const|let)\s+([A-Za-z_$][\w$]*)\s*(?::[^=]*)?=\s*(.*)$/,
    );
    const inline = POSITIONAL.test(t);
    if (inline) seen++;
    if (binding && POSITIONAL.test(binding[2]) && !any(binding[2], readers))
      bound.set(binding[1], s.line);
    const named = [...bound.keys()].filter((n) =>
      new RegExp(`(?:^|[^\\w$.])${escaped(n)}(?:[^\\w$]|$)`).test(t),
    );

    if (openedAt !== null && any(t, readers) && (inline || named.length)) {
      const what = named.length
        ? `\`${named[0]}\`, bound at line ${bound.get(named[0])}`
        : 'a positional locator written into the read itself';
      findings.push(
        `${spec.file}:${s.line} — reads ${what} in the window the action at line ` +
          `${openedAt} opened: ${s.text.slice(0, 92)}`,
      );
      openedAt = null;
    }

    if (!barrier && any(t, actions)) openedAt = s.line;
  }
  return { seen, findings };
};

/**
 * 4. BASELINE — a bare wait whose next statement takes the reading a later assertion is
 * measured against.
 *
 * The skeleton case: `await page.waitForTimeout(150)` and then `const held = await
 * position()`. The wait decides WHEN the baseline is taken, so the baseline is a function
 * of the machine's clock — and on 3 of 30 webkit runs the clock was still settling at that
 * mark and fell back afterwards, which is the one direction a running animation cannot go.
 * The fix was not a bigger number: the baseline became the first reading that repeats.
 *
 * Three shapes of wait are deliberately not this, and the suite has sixteen of them:
 *   - the WINDOW, where the reading compared against was taken before the wait and the
 *     assertion is that it did not move — a longer wait strengthens that claim;
 *   - the POLL, a wait inside a loop that leaves on a condition — the cure, not the defect;
 *   - the SAMPLE, a wait that ends a loop body taking a series of readings — the wait is
 *     the series' own period, and nothing after it is a baseline.
 * The last two are both loops, and they are told apart from a loop that merely repeats a
 * guess by whether the loop leaves early: a `break` or a `return` in the body is the
 * condition the wait is subordinate to.
 */
const baseline = (spec, { readers, waits }) => {
  const findings = [];
  let seen = 0;
  const stream = spec.parse.statements;
  for (let i = 0; i < stream.length; i++) {
    if (!BARE_WAIT.test(stream[i].text)) continue;
    seen++;
    if (polled(spec, stream[i])) continue;

    const next = stream[i + 1];
    if (!next || next.frames.length < stream[i].frames.length) continue;
    const binding = next.text.match(
      /^(?:const|let)\s+([A-Za-z_$][\w$]*)\s*(?::[^=]*)?=\s*(.*)$/,
    );
    if (!binding || !any(binding[2], readers) || any(binding[2], waits))
      continue;
    if (!usedLater(stream, i + 2, binding[1])) continue;

    findings.push(
      `${spec.file}:${stream[i].line} — ${stream[i].text.slice(0, 46)} and line ${next.line} ` +
        `takes the baseline \`${binding[1]}\` straight after it: ${next.text.slice(0, 60)}`,
    );
  }
  return { seen, findings };
};

/** Is this wait subordinate to a condition — a loop that leaves early? */
const polled = (spec, statement) =>
  statement.frames.some((id) => {
    const frame = spec.parse.frames[id];
    return (
      frame?.loop &&
      /(?:^|[^\w$.])(?:break|return)(?:[^\w$]|$)/.test(
        spec.masked.slice(frame.from, frame.to),
      )
    );
  });

/** Does a later statement of this test measure something against `name`? */
const usedLater = (stream, from, name) => {
  const mentions = new RegExp(`(?:^|[^\\w$.])${escaped(name)}(?:[^\\w$]|$)`);
  for (let i = from; i < stream.length; i++) {
    const t = stream[i].text;
    if (/(?:^|[^\w$.])(?:test|describe)\s*(?:\.\w+)?\s*\(/.test(t))
      return false;
    if (/(?:^|[^\w$.])expect\s*\(/.test(t) && mentions.test(t)) return true;
  }
  return false;
};

/**
 * An AUTO-RETRYING assertion: `await expect(<locator>)`, and `await expect.poll(…)` /
 * `expect.soft(…)` with it. The `await` is required — a bare `expect(value)` is a one-shot
 * comparison — and so is an argument that is not itself an already-taken reading:
 * `await expect(await styleOf(x, 'color')).toBe(…)` retries nothing, because the reading
 * happened before `expect` ever saw it.
 */
const retrying = (text) => {
  const at = text.search(/(?:^|[^\w$.])await\s+expect(?:\.\w+)?\s*\(/);
  if (at < 0) return false;
  const rest = text.slice(text.indexOf('(', at) + 1);
  return !/^\s*await\b/.test(rest);
};

// ── input from disk ───────────────────────────────────────────────────────────

/**
 * The input, read defensively: a file that cannot be read is a MESSAGE and not a
 * `TypeError` three frames down, because a gate that crashes tells a person nothing about
 * the repository (`req-axis`, one floor up).
 */
const collectInput = (root, files) => {
  const sources = [];
  for (const file of files) {
    let text;
    try {
      text = readFileSync(join(root, file), 'utf8');
    } catch (error) {
      throw new E2eError(
        'corpus',
        `\`${file}\` is in the file list and cannot be read (${error.code ?? error.message}) ` +
          `— the gate would otherwise rule on a corpus one file smaller than it reports`,
        'specs',
      );
    }
    sources.push({ file, text, masked: mask(text) });
  }
  const specs = sources
    .filter((s) => s.file.endsWith('.spec.ts'))
    .map((s) => ({ ...s, parse: statements(s.masked) }));
  return { specs, sources };
};

/**
 * The suites' files from the GIT INDEX rather than from a glob over the disk, for
 * `check-styles`'s reason: the index is an independent record of what the repository really
 * carries, and it leaves out by itself everything a build happens to have dropped there.
 * The pathspec is a DIRECTORY and the filtering is in JS — a git pathspec is not a shell
 * glob, and a star in it crosses `/` and matches one directory too many, returning ZERO
 * files rather than an error (`lesson-48`).
 */
const suiteFiles = () =>
  execFileSync('git', ['ls-files', '-z', ...SUITES], {
    cwd: ROOT,
    encoding: 'utf8',
  })
    .split('\0')
    .filter(Boolean)
    .map((p) => p.split('\\').join('/'))
    .filter((p) => p.endsWith('.ts') && !p.endsWith('.d.ts'))
    .sort();

// ── negative control ──────────────────────────────────────────────────────────

/**
 * A prepared input: a copy of the reference corpus, the case's files on top, the removals
 * from `drop` last. The case directory then holds NOTHING BUT its defect — you can see what
 * it proves without diffing it against anything — and it does not drift from the reference
 * when the shape of the corpus changes.
 *
 * The specs sit in the repository as `*.ts.txt` and become `*.ts` only here, in a temporary
 * directory outside the workspace. The reason is hard and was written down in
 * `tsconfig.root.json`: a `.ts` file under `tools/` belongs to no compiler program, so it
 * would fire `check-typecheck`. One gate's fixture must not be another's defect — the same
 * reasoning as `check-styles.fixtures` and the fake manifest in `check-package.fixtures`.
 */
const buildFixture = (name, fx) => {
  const destination = mkdtempSync(join(tmpdir(), 'pct-check-e2e-'));
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

const fixtureFiles = (directory) =>
  globSync('**/*.ts', { cwd: directory })
    .map((p) => p.split('\\').join('/'))
    .sort();

/**
 * `checkE2e` over an input that may itself fail to be read. Reading the corpus is the one
 * step that can fail outside the points, and it has to arrive as a message like any other
 * finding — a gate that ends in a stack trace has told a person nothing about the
 * repository (`req-axis`, one floor up).
 */
const examine = (root, files) => {
  try {
    return checkE2e(collectInput(root, files));
  } catch (error) {
    if (!(error instanceof E2eError)) throw error;
    return { description: null, errors: [error] };
  }
};

// ── the run ───────────────────────────────────────────────────────────────────

const problems = [];
let description = null;

{
  const result = examine(ROOT, suiteFiles());
  description = result.description;
  for (const error of result.errors)
    problems.push(
      `${error.check}${error.rule ? ` (${error.rule})` : ''}: ${error.message}`,
    );
}

// `_reference` and `_two-points`, the input the runner's own control plays a case over, are
// no cases.
const cases = readdirSync(FIXTURES, { withFileTypes: true })
  .filter((d) => d.isDirectory() && !d.name.startsWith('_'))
  .map((d) => d.name)
  .sort();

if (!cases.length)
  problems.push(
    `tools/check-e2e.fixtures: no prepared inputs — a gate with no proof that it can fail ` +
      `is one more silent defect (req-quality-negative-control)`,
  );

// The reference corpus MUST pass. Were it defective itself, every case would fire because
// of it rather than because of its own defect, and every "rejected" would be false. It
// carries the two real bugs in their FIXED shape besides, so a rule that started firing on
// the accepted cure is caught here rather than in a spec somebody then rewrites.
{
  const directory = buildFixture(REFERENCE, {});
  try {
    for (const error of examine(directory, fixtureFiles(directory)).errors)
      problems.push(
        `${REFERENCE}: the reference corpus does NOT pass (${error.check}) — every ` +
          `prepared case now fires because of it.\n    ${error.message}`,
      );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

const readCase = (name) =>
  JSON.parse(readFileSync(join(FIXTURES, name, 'fixture.json'), 'utf8'));

/**
 * What the runner reports of one prepared case: nothing, when it was rejected on its own point
 * alone and, where it declares one, on its own rule, saying what its `message` pins. The loop
 * plays every case through it, and so does the runner's own control (`runner-control.mjs`).
 */
const runCase = (name, fx) => {
  const said = [];
  const directory = buildFixture(name, fx);
  try {
    const { errors } = examine(directory, fixtureFiles(directory));
    if (!errors.length)
      said.push(
        `${name}: the prepared input PASSED and was meant not to — point ${fx.point} ` +
          `(\`${fx.check}\`) stopped examining anything`,
      );
    // More than one is a fault of the CASE, not of the gate: a corpus carrying two defects
    // proves neither, because whichever of them still works satisfies the run.
    else if (errors.length > 1)
      said.push(
        `${name}: ${errors.length} points fired ` +
          `(\`${errors.map((e) => e.check).join('`, `')}\`) and the case declares one — a ` +
          `corpus holding more than its own defect is satisfied by whichever of them ` +
          `happens to still work`,
      );
    else if (errors[0].check !== fx.check)
      said.push(
        `${name}: check \`${errors[0].check}\` fired, and point ${fx.point} ` +
          `(\`${fx.check}\`) was meant to — the fixture proves something other than what ` +
          `it declares`,
      );
    else if (fx.rule && errors[0].rule !== fx.rule)
      said.push(
        `${name}: point ${fx.point} fired on rule \`${errors[0].rule ?? '—'}\` and the ` +
          `case is built for \`${fx.rule}\` — one point, two rules, and the one this ` +
          `input exists to prove is the one that stayed silent`,
      );
    // A rule that names what it found says it in the message, and a case may hold that too.
    else if (
      fx.message !== undefined &&
      !errors[0].message.includes(fx.message)
    )
      said.push(
        `${name}: point ${fx.point} (\`${fx.check}\`) fired without "${fx.message}" — the ` +
          `right rule saying something else:\n    ${errors[0].message}`,
      );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
  return said;
};

for (const name of cases) {
  let fx;
  try {
    fx = readCase(name);
  } catch (error) {
    problems.push(
      `${name}: no readable \`fixture.json\` (${error.message}) — a case that does not ` +
        `declare the point it proves proves nothing`,
    );
    continue;
  }
  problems.push(...runCase(name, fx));
}

problems.push(
  ...(await runnerControl({
    where: `tools/check-e2e.fixtures/${RUNNER}`,
    load: () => JSON.parse(readFileSync(join(FIXTURES, RUNNER), 'utf8')),
    cases,
    read: readCase,
    run: runCase,
    holds: ['passed', 'undeclared', 'check', 'rule'],
    own: (fx) => fx.message,
    pin: (fx, message) => ({ ...fx, message }),
  })),
);

// ── result ────────────────────────────────────────────────────────────────────

if (problems.length) {
  console.error(`X E2E race gate — ${problems.length} violations:\n`);
  for (const p of problems) console.error(`  - ${p}`);
  console.error('');
  process.exit(1);
}

console.log(
  `✓ E2E: ${description}. Negative control: the reference corpus passes, ${cases.length} ` +
    `prepared ones rejected on their own points, and the runner reports a case that passed or ` +
    `fired more than its point, another check, another rule or a message it does not pin.`,
);
