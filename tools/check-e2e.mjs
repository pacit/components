#!/usr/bin/env node
/**
 * E2E race gate: a number or an index standing where a condition belonged
 * (`req-quality-e2e`) — a shape a reader can look for, where a green full run of the suite
 * says nothing at all (`lesson-192`).
 *
 *  1. CORPUS: the walk found specs, and a vocabulary derived from their own helpers,
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

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FIXTURES = join(ROOT, 'tools/check-e2e.fixtures');
const REFERENCE = '_reference';

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
 * The definitions a file makes: `const name = (…) => …`, `const name = async (…) => …` and
 * `function name(…) { … }`, each with the text of its body. This is how the three
 * vocabularies below stop being lists somebody typed and become lists this repository's own
 * helpers are read into.
 */
const definitions = (masked) => {
  const found = [];
  const FUNCTION =
    /(?:^|[^\w$.])(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*(?::[^=;]*)?=\s*(?:async\s+)?\(|(?:^|[^\w$.])function\s+([A-Za-z_$][\w$]*)\s*\(/g;
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
    // `styleOf` came back NOT a reader, which is a silent gate and not a loud one.
    const after = masked.slice(k + 1, k + 1 + 400);
    const arrowAt = after.indexOf('=>');
    const braceAt = after.indexOf('{');
    let body = '';
    if (arrowAt >= 0 && (braceAt < 0 || arrowAt < braceAt)) {
      let at = k + 1 + arrowAt + 2;
      while (at < masked.length && /\s/.test(masked[at])) at++;
      body =
        masked[at] === '{' ? braced(masked, at) : upToSemicolon(masked, at);
    } else if (braceAt >= 0) body = braced(masked, k + 1 + braceAt);
    found.push({ name, body });
  }
  return found;
};

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
const method = (text, name) => new RegExp(`\\.${name}\\s*\\(`).test(text);
const free = (text, name) =>
  new RegExp(`(?:^|[^\\w$.])${name}\\s*\\(`).test(text);

/**
 * A vocabulary: Playwright's own names, closed over the corpus's helpers. A helper that
 * reaches one of the base names IS one — `styleOf` is `locator.evaluate`, `boxOf` is
 * `locator.boundingBox`, `centreOf` in `slider.spec.ts` is `boxOf`, and `visit` reaches
 * `locator.waitFor`. That closure is the point: the list of readers has to be derived from
 * what the support tree and the specs actually define, because a typed list goes stale the
 * first time somebody writes a helper of their own — and a reader the gate does not know is
 * a race the gate does not see.
 */
const vocabulary = (base, defined) => {
  const derived = new Set();
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
  const shared = sources
    .filter((s) => !s.file.endsWith('.spec.ts'))
    .flatMap((s) => definitions(s.masked));
  const readers = vocabulary(PLAYWRIGHT_READS, shared);
  const denominator = corpus({ specs, sources, readers }) ?? parser(specs);
  if (denominator) return { description: null, errors: [denominator] };

  // 3. and 4. The rules, over every spec in order, each gathering ALL of its own findings:
  //    a race gate that names one site per run is a gate somebody walks through thirteen
  //    times, and the thirteenth report is the one nobody reads.
  let positional = 0;
  let bare = 0;
  const races = [];
  const baselines = [];
  for (const spec of specs) {
    const defined = [...shared, ...definitions(spec.masked)];
    const vocabularies = {
      readers: vocabulary(PLAYWRIGHT_READS, defined),
      waits: vocabulary(PLAYWRIGHT_WAITS, defined),
      actions: vocabulary(PLAYWRIGHT_ACTIONS, defined),
    };
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
    `${readers.derived.size} shared readers derived beyond Playwright's own, ` +
    `${positional} positional locator(s) and ${bare} bare wait(s) ruled on`;
  return { description, errors };
};

/**
 * 1. CORPUS — each kind of material the later points rule on has at least one instance.
 * Returns the violation rather than throwing it: points 3 and 4 are independent rules over
 * one corpus and both have to report in a single run, so the whole set is gathered and
 * handed back. Only the denominator short-circuits, and it short-circuits for a reason —
 * a rule over a corpus that is not there proves nothing either way.
 */
const corpus = ({ specs, sources, readers }) => {
  if (!specs.length)
    return new E2eError(
      'corpus',
      `no spec found under \`${SUITES.join('/`, `')}/\` — points 3 and 4 would then pass ` +
        `having read not one test. Usual cause: the file list stopped returning anything, ` +
        `which is a green run and not an error (\`lesson-48\`)`,
      'specs',
    );

  const derived = readers.derived.size;
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
      new RegExp(`(?:^|[^\\w$.])${n}(?:[^\\w$]|$)`).test(t),
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
  const mentions = new RegExp(`(?:^|[^\\w$.])${name}(?:[^\\w$]|$)`);
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
    sources.push({ file, masked: mask(text) });
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

const cases = readdirSync(FIXTURES, { withFileTypes: true })
  .filter((d) => d.isDirectory() && d.name !== REFERENCE)
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

for (const name of cases) {
  let fx;
  try {
    fx = JSON.parse(readFileSync(join(FIXTURES, name, 'fixture.json'), 'utf8'));
  } catch (error) {
    problems.push(
      `${name}: no readable \`fixture.json\` (${error.message}) — a case that does not ` +
        `declare the point it proves proves nothing`,
    );
    continue;
  }
  const directory = buildFixture(name, fx);
  try {
    const { errors } = examine(directory, fixtureFiles(directory));
    if (!errors.length)
      problems.push(
        `${name}: the prepared input PASSED and was meant not to — point ${fx.point} ` +
          `(\`${fx.check}\`) stopped examining anything`,
      );
    // More than one is a fault of the CASE, not of the gate: a corpus carrying two defects
    // proves neither, because whichever of them still works satisfies the run.
    else if (errors.length > 1)
      problems.push(
        `${name}: ${errors.length} points fired ` +
          `(\`${errors.map((e) => e.check).join('`, `')}\`) and the case declares one — a ` +
          `corpus holding more than its own defect is satisfied by whichever of them ` +
          `happens to still work`,
      );
    else if (errors[0].check !== fx.check)
      problems.push(
        `${name}: check \`${errors[0].check}\` fired, and point ${fx.point} ` +
          `(\`${fx.check}\`) was meant to — the fixture proves something other than what ` +
          `it declares`,
      );
    else if (fx.rule && errors[0].rule !== fx.rule)
      problems.push(
        `${name}: point ${fx.point} fired on rule \`${errors[0].rule ?? '—'}\` and the ` +
          `case is built for \`${fx.rule}\` — one point, two rules, and the one this ` +
          `input exists to prove is the one that stayed silent`,
      );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

// ── result ────────────────────────────────────────────────────────────────────

if (problems.length) {
  console.error(`X E2E race gate — ${problems.length} violations:\n`);
  for (const p of problems) console.error(`  - ${p}`);
  console.error('');
  process.exit(1);
}

console.log(
  `✓ E2E: ${description}. Negative control: the reference corpus passes, ` +
    `${cases.length} prepared ones rejected on their own points.`,
);
