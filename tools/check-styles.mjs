#!/usr/bin/env node
/**
 * Style gate: `req-token-logical` (layout in logical properties, so it mirrors under
 * `dir="rtl"`) and `req-token-no-opacity` (no compositing `opacity`). Breaking either
 * gives no red test — an LTR screenshot looks right, and so does `opacity: 0.6`, which
 * quietly undoes `req-token-contrast` ([`lesson-6`](../docs/lessons.md#lesson-6)).
 *
 *  1. the list of stylesheets is not empty (else points 5 and 6 pass over nothing),
 *  2. COMPILER: everything sass EMITS is visible to the source scanner as well,
 *  3. STYLE SOURCE: every `@Component` takes its styles from a sheet this gate reads,
 *  4. exceptions are named, justified and USED,
 *  5. no physical property of the inline axis,
 *  6. no compositing `opacity`.
 *
 * Points 5 and 6 are the rules; 1–3 watch the DENOMINATOR they run over — an unread sheet
 * is to them what a missing file is to coverage ([`lesson-48`](../docs/lessons.md#lesson-48)).
 *
 * Usage: node tools/check-styles.mjs
 */
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
import { basename, dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as sass from 'sass';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PROJECT = 'libs/components';
const FIXTURES = join(ROOT, 'tools/check-styles.fixtures');
const REFERENCE = '_reference';

/**
 * The exception marker. It names a PROPERTY, not "this line": a comment written for
 * `left` must not quietly cover an `opacity` added beside it half a year later.
 *
 *   /* pct-exception left: <justification> *\/
 */
const EXCEPTION = /pct-exception\s+([-a-zA-Z]+)\s*:\s*([\s\S]*)$/;

/**
 * The minimum length of a justification. A floor against an empty rubber stamp
 * (`/* pct-exception left: because *\/`), not a judge of quality — a machine cannot tell
 * whether a reason is true. Review watches that, and only review; the gate watches that
 * there is something to review and that exceptions can be counted.
 */
const MIN_JUSTIFICATION = 40;

/**
 * Physical properties of the inline axis and their logical counterparts. The BLOCK axis
 * (`top`/`bottom`, `margin-top`, …) is deliberately NOT on the list: `dir="rtl"` mirrors
 * the inline axis alone, and full bidi — that is, vertical writing modes — is an explicit
 * non-goal (`docs/00-axis.md`). A ban on `top` would be noise, and the answer to noise is
 * a rubber-stamp exception on every other rule.
 */
const PHYSICAL = new Map([
  ['left', 'inset-inline-start'],
  ['right', 'inset-inline-end'],
  ['margin-left', 'margin-inline-start'],
  ['margin-right', 'margin-inline-end'],
  ['padding-left', 'padding-inline-start'],
  ['padding-right', 'padding-inline-end'],
  ['scroll-margin-left', 'scroll-margin-inline-start'],
  ['scroll-margin-right', 'scroll-margin-inline-end'],
  ['scroll-padding-left', 'scroll-padding-inline-start'],
  ['scroll-padding-right', 'scroll-padding-inline-end'],
  ['border-left', 'border-inline-start'],
  ['border-right', 'border-inline-end'],
  ['border-left-width', 'border-inline-start-width'],
  ['border-right-width', 'border-inline-end-width'],
  ['border-left-style', 'border-inline-start-style'],
  ['border-right-style', 'border-inline-end-style'],
  ['border-left-color', 'border-inline-start-color'],
  ['border-right-color', 'border-inline-end-color'],
  ['border-top-left-radius', 'border-start-start-radius'],
  ['border-top-right-radius', 'border-start-end-radius'],
  ['border-bottom-left-radius', 'border-end-start-radius'],
  ['border-bottom-right-radius', 'border-end-end-radius'],
  // `direction` in a component sheet kills the whole promise: however logical the other
  // rules are, this one pins the direction down.
  [
    'direction',
    'the direction is inherited from the document — do not pin it in a component',
  ],
]);

/** Properties where it is the VALUE that is physical, not the name. */
const PHYSICAL_BY_VALUE = new Map([
  ['text-align', { wrong: new Set(['left', 'right']), instead: 'start / end' }],
  [
    'float',
    { wrong: new Set(['left', 'right']), instead: 'inline-start / inline-end' },
  ],
  [
    'clear',
    { wrong: new Set(['left', 'right']), instead: 'inline-start / inline-end' },
  ],
]);

/**
 * The `opacity` family. The SVG variants are here for the same reason as `opacity`:
 * `fill-opacity` on a checkbox tick composites in exactly the same way, it just does not
 * carry the name the requirement uses.
 */
const OPACITY = new Set([
  'opacity',
  'fill-opacity',
  'stroke-opacity',
  'stop-opacity',
]);

// ── sheet scanner ────────────────────────────────────────────────────────────

/**
 * The scanner: turns a stylesheet's text into a list of declarations and comments, each
 * with a line number. It is not a CSS parser and need not be — the gate asks only about
 * `property: value` pairs and about the comments that carry exceptions.
 *
 * postcss is deliberately NOT used here, though it is among the dependencies: its default
 * parser falls over on SCSS syntax (`//`, a `$variable` outside a rule), and `postcss-scss`
 * would be a new dependency taken on to read seven files written in plain CSS. Something
 * else matters more, though: a scanner of one's own fails the way it was designed to fail,
 * and what it cannot see is caught by point 2 — the comparison against what sass, a real
 * parser, prints from the same sheet.
 *
 * Brackets are counted separately, so that a `;` inside `url(data:…;base64,…)` does not
 * cut a declaration in half.
 */
const scan = (content) => {
  const declarations = [];
  const comments = [];
  let buffer = '';
  let bufferLine = 0;
  let line = 1;
  let parens = 0;
  let i = 0;

  const push = (char) => {
    if (buffer.trim() === '' && char.trim() !== '') bufferLine = line;
    buffer += char;
  };

  /** Closes the buffer: if it looks like a declaration, it lands on the list. */
  const close = () => {
    const m = /^\s*(-{0,2}[A-Za-z_][-\w]*)\s*:\s*([\s\S]*)$/.exec(buffer);
    if (m)
      declarations.push({
        property: m[1].toLowerCase(),
        value: m[2].trim().replace(/\s+/g, ' '),
        line: bufferLine,
      });
    buffer = '';
  };

  while (i < content.length) {
    const char = content[i];
    const next = content[i + 1];

    if (char === '/' && next === '*') {
      const start = line;
      const end = content.indexOf('*/', i + 2);
      const limit = end === -1 ? content.length : end;
      const text = content.slice(i + 2, limit);
      line += (text.match(/\n/g) ?? []).length;
      comments.push({ text, line: start, end: line });
      i = limit + 2;
      continue;
    }

    // An SCSS line comment. It carries no exceptions (sass does not emit it, so point 2
    // would have nothing to compare), but it has to leave the stream.
    if (char === '/' && next === '/') {
      const end = content.indexOf('\n', i);
      i = end === -1 ? content.length : end;
      continue;
    }

    if (char === '"' || char === "'") {
      let j = i + 1;
      while (j < content.length && content[j] !== char) {
        if (content[j] === '\\') j++;
        if (content[j] === '\n') line++;
        j++;
      }
      push(content.slice(i, j + 1));
      i = j + 1;
      continue;
    }

    if (char === '\n') {
      line++;
      push(' ');
      i++;
      continue;
    }

    if (char === '(') parens++;
    if (char === ')') parens = Math.max(0, parens - 1);

    if (parens === 0) {
      // A rule prelude (a selector, an at-rule prelude) is not a declaration.
      if (char === '{') {
        buffer = '';
        i++;
        continue;
      }
      // `}` also closes a declaration with no semicolon at the end of a block.
      if (char === '}' || char === ';') {
        close();
        i++;
        continue;
      }
    }

    push(char);
    i++;
  }

  return { declarations, comments };
};

/**
 * The key of a declaration RELEVANT to either promise — or `null`. The same key is
 * computed for the source and for sass's output, so point 2 compares those two views
 * without looking at the rest of the sheet.
 */
const significantKey = (d) => {
  const value = d.value.toLowerCase();
  if (PHYSICAL.has(d.property)) return `${d.property}:${value}`;
  const valueBased = PHYSICAL_BY_VALUE.get(d.property);
  if (valueBased?.wrong.has(value.split(/\s+/)[0]))
    return `${d.property}:${value}`;
  if (OPACITY.has(d.property) && !binaryOpacity(value))
    return `${d.property}:${value}`;
  // `inset` is physical only with several values: `inset: 0` is symmetric and behaves
  // identically in RTL, and a ban covering it too would produce contentless exceptions.
  if (d.property === 'inset' && value.split(/\s+/).length > 1)
    return `${d.property}:${value}`;
  return null;
};

/**
 * `opacity` is allowed ONLY as a visibility switch: `0` (the element takes no part in the
 * image, so there is no contrast to promise) and `1` (the neutral value, usually undoing a
 * state). Everything in between COMPOSITES with the background, moving the real contrast
 * outside the contrast gate's result (`lesson-6`).
 *
 * A non-literal value (`var(...)`, `calc(...)`) is not binary by definition: the gate does
 * not know what will arrive at runtime, and guessing in the author's favour would be
 * exactly the silence this rule stands against.
 *
 * Deliberately allowed: `transition: opacity …` and a 0 → 1 transition. A transient state
 * is not what `req-token-contrast` speaks about, and a ban covering animations would take
 * away the one standard way of bringing an overlay in.
 */
const binaryOpacity = (value) => {
  const m = /^(\d*\.?\d+)(%?)$/.exec(value.trim());
  if (!m) return false;
  const count = Number(m[1]) / (m[2] === '%' ? 100 : 1);
  return count === 0 || count === 1;
};

// ── checks ──────────────────────────────────────────────────────────────────

/**
 * A violation of one of the six checks. It carries the check's identifier, not just the
 * message: the negative control has to verify that a prepared input fired ON ITS OWN
 * point — a sheet failing for a reason other than the one written into it proves
 * something other than what it declares.
 */
class StyleError extends Error {
  constructor(check, description) {
    super(description);
    this.check = check;
  }
}

const list = (entries) => entries.map((w) => `      ${w}`).join('\n');

/**
 * The full set of checks over a ready input:
 *   `sheets`     — `[{ file, content, css }]`, where `css` is sass's output,
 *   `components`  — `[{ file, className, sheets, inline }]` from the decorators,
 *   `declarations`  — the number of `@Component(` occurrences in the sources (the parser's
 *                   denominator).
 * Throws `StyleError` on the first violation: the checks run from the denominator to the
 * rules, so a rule after a collapsed denominator would have nothing to examine anyway.
 */
const checkStyles = ({ sheets, components, declarations }) => {
  // 1. The list of stylesheets is not empty.
  if (!sheets.length)
    throw new StyleError(
      'sheets',
      `no stylesheet found (${PROJECT}/**/*.scss) — points 5 and 6 would then always ` +
        `pass, having nothing to read`,
    );

  const scans = new Map(sheets.map((a) => [a.file, scan(a.content)]));

  // 2. The compiler: sass emits nothing relevant that the scanner cannot see in the
  //    source. This is the scanner's own denominator — a declaration produced by a mixin,
  //    an interpolation or a nested property reaches the browser without standing in the
  //    source text, so the rules would pass over it without a trace.
  for (const sheet of sheets) {
    const inSources = new Set(
      scans
        .get(sheet.file)
        .declarations.map(significantKey)
        .filter((k) => k !== null),
    );
    const hidden = [
      ...new Set(
        scan(sheet.css)
          .declarations.map(significantKey)
          .filter((k) => k !== null && !inSources.has(k)),
      ),
    ];
    if (hidden.length)
      throw new StyleError(
        'compiler',
        `${sheet.file}: sass emits declarations absent from the source text:\n` +
          list(hidden) +
          `\n    They reach the browser, and the rules of points 5 and 6 pass over them ` +
          `without a trace. Usual cause: a mixin, an interpolation (\`padding-#{$x}\`) or ` +
          `a nested property. Write them out — or teach the scanner to read them.`,
      );
  }

  // 3. Style source: every `@Component` is styled by a sheet this gate reads.
  //
  //    A non-empty set first — for the same reason as point 1, only on the other side of
  //    the comparison. Comparing numbers (`recognised N of M`) is blind to zero: with both
  //    sides empty they are equal, and the point passes having said nothing. The first
  //    version of this gate passed exactly that way — the git pathspec returned zero
  //    sources and the result read "0 components" (`lesson-48`).
  if (!components.length)
    throw new StyleError(
      'style-source',
      `no \`@Component\` found in the sources (${PROJECT}) — the comparison against the ` +
        `decorator count would then always pass, because zero equals zero.\n` +
        `    Usual cause: the list of source files stopped returning anything.`,
    );

  if (components.length !== declarations)
    throw new StyleError(
      'style-source',
      `the parser recognised ${components.length} of ${declarations} \`@Component\` ` +
        `decorators — the rest would drop out of the measurement without a trace. Usual ` +
        `cause: a decorator written otherwise than prettier formats it (\`@Component({\` ` +
        `and \`})\` in column zero).`,
    );

  const known = new Set(sheets.map((a) => a.file));
  const withoutStylesheet = components.flatMap((k) => {
    if (k.inline)
      return [
        `${k.file}: ${k.className} has \`styles: […]\` in its decorator — this gate reads sheets, not decorators`,
      ];
    return k.sheets
      .filter((a) => !known.has(a))
      .map(
        (a) =>
          `${k.file}: ${k.className} takes its styles from \`${a}\`, outside the sheet list`,
      );
  });
  if (withoutStylesheet.length)
    throw new StyleError(
      'style-source',
      `${withoutStylesheet.length} components take their styles from beyond this gate's reach:\n` +
        list(withoutStylesheet) +
        `\n    Those styles travel to the consumer like every other, and points 5 and 6 ` +
        `pronounce them "clean" only because they cannot see them.`,
    );

  // 4. Exceptions: named, justified, used.
  //
  //    An exception holds ONLY for an adjacent declaration — on the same line, or on the
  //    line directly below the comment. Without that, a reason describing one rule would
  //    spread over a whole block, and moving code would leave a valid exception standing
  //    above something else entirely.
  const justified = new Set();
  const exceptionProblems = [];
  for (const sheet of sheets) {
    const { declarations, comments } = scans.get(sheet.file);
    for (const comment of comments) {
      const m = EXCEPTION.exec(comment.text);
      if (!m) continue;
      const [, property, rawJustification] = m;
      const justification = rawJustification.replace(/\*+\s*$/, '').trim();
      if (justification.length < MIN_JUSTIFICATION) {
        exceptionProblems.push(
          `${sheet.file}:${comment.line}: an exception for \`${property}\` with no ` +
            `justification (${justification.length} of ${MIN_JUSTIFICATION} characters) — ` +
            `a rubber stamp, not a reason`,
        );
        continue;
      }
      const matched = declarations.filter(
        (d) =>
          d.property === property.toLowerCase() &&
          (d.line === comment.line || d.line === comment.end + 1),
      );
      if (!matched.length) {
        exceptionProblems.push(
          `${sheet.file}:${comment.line}: an exception for \`${property}\` is ` +
            `adjacent to no declaration of that property — either the code moved and the ` +
            `exception was left behind, or the property named is not the one below`,
        );
        continue;
      }
      for (const d of matched) justified.add(`${sheet.file}:${d.line}`);
    }
  }
  if (exceptionProblems.length)
    throw new StyleError(
      'exception',
      `${exceptionProblems.length} exceptions are not exceptions:\n` +
        list(exceptionProblems) +
        `\n    Notation: /* pct-exception <property>: <why it is safe exactly here> */`,
    );

  // 5. Logical properties (`req-token-logical`).
  const physical = [];
  // 6. No compositing `opacity` (`req-token-no-opacity`).
  const translucent = [];

  for (const sheet of sheets)
    for (const d of scans.get(sheet.file).declarations) {
      if (justified.has(`${sheet.file}:${d.line}`)) continue;
      const where = `${sheet.file}:${d.line}`;

      const logical = PHYSICAL.get(d.property);
      if (logical) {
        physical.push(`${where}: \`${d.property}\` — use \`${logical}\``);
        continue;
      }
      const valueBased = PHYSICAL_BY_VALUE.get(d.property);
      const first = d.value.toLowerCase().split(/\s+/)[0];
      if (valueBased?.wrong.has(first)) {
        physical.push(
          `${where}: \`${d.property}: ${first}\` — use \`${valueBased.instead}\``,
        );
        continue;
      }
      if (d.property === 'inset' && d.value.split(/\s+/).length > 1) {
        physical.push(
          `${where}: \`inset: ${d.value}\` — several values set the inline axis ` +
            `physically; use \`inset-block-*\` / \`inset-inline-*\``,
        );
        continue;
      }
      if (OPACITY.has(d.property) && !binaryOpacity(d.value))
        translucent.push(`${where}: \`${d.property}: ${d.value}\``);
    }

  if (physical.length)
    throw new StyleError(
      'logical',
      `${physical.length} physical properties of the inline axis (req-token-logical):\n` +
        list(physical) +
        `\n    A physically described layout does NOT mirror under \`dir="rtl"\`, and no ` +
        `LTR screenshot shows it. If this one is safe, say why: ` +
        `/* pct-exception <property>: <reason> */`,
    );

  if (translucent.length)
    throw new StyleError(
      'opacity',
      `${translucent.length} \`opacity\` declarations compositing with the background (req-token-no-opacity):\n` +
        list(translucent) +
        `\n    The contrast gate computes on the palette's values, so it cannot see the ` +
        `compositing — this is the way back to before lesson-6. Express the state with a ` +
        `colour token of its own. Only \`0\` and \`1\` are allowed (a visibility switch).`,
    );

  const exceptions = justified.size;
  return (
    `${sheets.length} stylesheets, ${components.length} components, ` +
    `${exceptions} justified ${exceptions === 1 ? 'exception' : 'exceptions'}`
  );
};

// ── input from disk ───────────────────────────────────────────────────────────

/**
 * The component decorator. The parser anchors in column zero, because that is the
 * formatting `nx format:check` enforces, and the counter watches that a drift from that
 * assumption stays visible — a component the parser does not recognise is to drop out of
 * the measurement LOUDLY, not quietly.
 *
 * So the counter must NOT repeat the parser's anchor, and that is the whole point here.
 * The first version had `/^@Component\(/gm` in both places: moving a decorator by one
 * space put out the parser and the counter at once, both sides agreed on seven and the
 * gate ended green, having stopped measuring a whole component (`lesson-48`). Indentation
 * is therefore allowed here, and only occurrences in comments are filtered out —
 * `core/src/texts.ts` has `@Component(` in a JSDoc example, that is, on a line starting
 * with an asterisk.
 */
const COMPONENT =
  /^@Component\(\{\r?\n([\s\S]*?)^\}\)\r?\n(?:export\s+)?(?:abstract\s+)?class\s+([A-Za-z_$][\w$]*)/gm;
const COMPONENT_COUNT = /^[ \t]*@Component\(/gm;

const readComponents = (root, files) => {
  const components = [];
  let declarations = 0;
  for (const file of files) {
    const content = readFileSync(join(root, file), 'utf8');
    declarations += (content.match(COMPONENT_COUNT) ?? []).length;
    for (const [, body, className] of content.matchAll(COMPONENT)) {
      const sheets = [
        ...body.matchAll(/styleUrls?\s*:\s*(?:\[([^\]]*)\]|(['"])([^'"]*)\2)/g),
      ].flatMap(([, array, , single]) =>
        single !== undefined
          ? [single]
          : [...array.matchAll(/['"]([^'"]*)['"]/g)].map((m) => m[1]),
      );
      components.push({
        file,
        className,
        inline: /^\s*styles\s*:/m.test(body),
        sheets: sheets.map((a) =>
          relative(root, resolve(join(root, dirname(file)), a))
            .split('\\')
            .join('/'),
        ),
      });
    }
  }
  return { components, declarations };
};

/** An input built from a file list — the same shape for the repo and for a fixture. */
const collectInput = (root, sheetPaths, sourcePaths) => ({
  sheets: sheetPaths.map((file) => ({
    file,
    content: readFileSync(join(root, file), 'utf8'),
    // Sass's output, that is, what the browser really gets. The `expanded` style keeps
    // `/* */` comments, so point 2's comparison looks at the same material on both sides.
    css: sass.compile(join(root, file), { style: 'expanded' }).css,
  })),
  ...readComponents(root, sourcePaths),
});

/**
 * All the project's files from the GIT INDEX, not from a glob over the disk. The reason is
 * the same as in `check-zoneless` and `check-typecheck`: the index is an independent
 * record of what the repository really carries, and it cuts out generated things by itself
 * — `libs/components/themes/` is written by the token build on every run and is gitignored,
 * so there is nothing here to exclude it with.
 *
 * The pathspec is a DIRECTORY and the filtering sits in JS. Not a matter of taste: a git
 * pathspec is not a shell glob — without `:(glob)` a star crosses `/`, so
 * `libs/components/*​/src/**​/*.ts` asks for one directory too many and does not match
 * `button/src/button.ts`. It then returns ZERO files rather than an error. The first
 * version of this gate passed green with such a pattern, measuring zero components
 * (`lesson-48`).
 */
const projectFiles = () =>
  execFileSync('git', ['ls-files', '-z', PROJECT], {
    cwd: ROOT,
    encoding: 'utf8',
  })
    .split('\0')
    .filter(Boolean)
    .map((p) => p.split('\\').join('/'))
    .sort();

/**
 * The sources searched for `@Component`. Specs are left out on purpose: they define host
 * components with a template and styles written into the decorator, and those travel
 * nowhere — point 3 would fire on every rendering test.
 */
const isSource = (p) => p.endsWith('.ts') && !p.endsWith('.spec.ts');

// ── negative control ──────────────────────────────────────────────────────────

/**
 * Builds a prepared input: a copy of the base, the case's files on top, the deletions
 * from `fixture.json` last. The case directory then holds NOTHING BUT the defect, rather
 * than one more copy of a correct input to hunt through.
 *
 * Component sources sit in the repository as `*.ts.txt` and become `*.ts` only here. The
 * reason is hard and already written down in `tsconfig.root.json`: a `.ts` file in `tools/`
 * belongs to no compiler program, so it would fire `check-typecheck` (point 1 — a file
 * with no project). One gate's fixture must not be another's defect. The composition goes
 * to a temporary directory OUTSIDE the repository, so no gate ever sees the intermediate
 * material.
 */
const buildFixture = (name, fx) => {
  const destination = mkdtempSync(join(tmpdir(), 'pct-check-styles-'));
  cpSync(join(FIXTURES, REFERENCE), destination, { recursive: true });
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

const files = (directory, pattern) =>
  globSync(pattern, { cwd: directory })
    .map((p) => p.split('\\').join('/'))
    .sort();

const fixtureInput = (directory) =>
  collectInput(
    directory,
    files(directory, '**/*.scss'),
    files(directory, '**/*.ts').filter(isSource),
  );

// ── the run ───────────────────────────────────────────────────────────────────

const problems = [];
let description = null;

try {
  const files = projectFiles();
  description = checkStyles(
    collectInput(
      ROOT,
      files.filter((p) => p.endsWith('.scss')),
      files.filter(isSource),
    ),
  );
} catch (error) {
  if (!(error instanceof StyleError)) throw error;
  problems.push(`${error.check}: ${error.message}`);
}

const cases = readdirSync(FIXTURES, { withFileTypes: true })
  .filter((d) => d.isDirectory() && d.name !== REFERENCE)
  .map((d) => d.name)
  .sort();

if (cases.length === 0)
  problems.push(
    `tools/check-styles.fixtures: no prepared inputs — a gate with no proof that it can ` +
      `fail is one more silent defect (req-quality-negative-control)`,
  );

// The reference input MUST pass. Were the base defective itself, every case would
// fire because of it and not because of its own defect — every "rejected" would be
// false, and this control would become the very thing it stands against.
{
  const directory = buildFixture(REFERENCE, {});
  try {
    checkStyles(fixtureInput(directory));
  } catch (error) {
    if (!(error instanceof StyleError)) throw error;
    problems.push(
      `${REFERENCE}: the reference input does NOT pass (${error.check}) — ` +
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
    checkStyles(fixtureInput(directory));
    problems.push(
      `${name}: the prepared input PASSED and was meant not to — ` +
        `point ${fx.point} (\`${fx.check}\`) stopped examining anything`,
    );
  } catch (error) {
    if (!(error instanceof StyleError)) throw error;
    if (error.check !== fx.check)
      problems.push(
        `${name}: check \`${error.check}\` fired, and point ${fx.point} ` +
          `(\`${fx.check}\`) was meant to — the fixture proves something other than what it declares`,
      );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

// ── result ────────────────────────────────────────────────────────────────────

if (problems.length) {
  console.error(`X Style gate — ${problems.length} violations:\n`);
  for (const p of problems) console.error(`  - ${p}`);
  console.error('');
  process.exit(1);
}

console.log(
  `✓ Styles: ${description}. Negative control: the reference input passes, ` +
    `${cases.length} prepared ones rejected on their own points.`,
);
