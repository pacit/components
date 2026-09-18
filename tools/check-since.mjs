#!/usr/bin/env node
/**
 * Since gate: does the public surface say since when? `req-release-since` promises that
 * every input, model, output, public method and export names the version it appeared in,
 * at its declaration — the shipped types carry it, and the site tells what `main` has beyond it.
 *
 *  1. every public API item carries a `@since` tag in the JSDoc at its declaration,
 *  2. its value is `next` — unreleased; the release names it — or a version the manifest
 *     has reached, written `major.minor.patch`,
 *  3. a deprecated item is a released one: `@deprecated` on `@since next` is a removal
 *     nobody made.
 *
 * A fourth run examines the gate itself (`req-quality-negative-control`): `check-since.fixtures/`.
 *
 * Usage: node tools/check-since.mjs
 */
import { globSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MANIFEST = 'libs/components/package.json';
const FIXTURES = join(ROOT, 'tools/check-since.fixtures');
const REFERENCE = '_reference.json';

/** Where an API counts — the sources that become the public surface (as `check-support`). */
const SOURCES = [
  'libs/components/src/**/*.ts',
  'libs/components/*/src/**/*.ts',
];
const NOT_SOURCE = /\.(spec|mutation)\.ts$/;

/** The word an unreleased API is dated with, until `stamp-version.mjs` names the version. */
const NEXT = 'next';
/** A `@since` that names a release line — not a prerelease, which is a step of one. */
const VERSION = /^(\d+)\.(\d+)\.(\d+)$/;
/** The declarations whose initialiser makes a member public API. */
const MEMBER_CALLS = new Set(['input', 'model', 'output']);
/**
 * A method Angular calls and nobody else: public because the framework needs it so, and no
 * API of the class. Everything else public on an exported class ships in the types and is
 * read by a consumer's editor — plumbing between a component and its parts included, which
 * is why the tag is honest on it too.
 */
const LIFECYCLE = /^ng[A-Z]\w*$/;

class SinceError extends Error {
  constructor(check, message) {
    super(message);
    this.check = check;
  }
}

// ── the checks ──────────────────────────────────────────────────────────────

const triple = (version) => {
  const m = String(version ?? '').match(/^(\d+)\.(\d+)\.(\d+)/);
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
};
const compare = (a, b) => {
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] - b[i];
  return 0;
};

/**
 * The three points over a ready input: `version` — the manifest's, `items` — every public
 * API item as `{ path, line, name, kind, since, deprecated }`. Returns the summary line.
 */
const checkSince = ({ version, items }) => {
  const shipped = triple(version);
  if (!shipped)
    throw new SinceError(
      'manifest',
      `${MANIFEST} names no version a \`@since\` can be compared with (\`${version}\`) — ` +
        `point 2 has nothing to measure against`,
    );
  const where = (i) => `${i.path}:${i.line}  \`${i.name}\` (${i.kind})`;

  // 1. Every item says since when.
  const missing = items.filter((i) => !i.since);
  if (missing.length)
    throw new SinceError(
      'since-missing',
      `${missing.length} public API item(s) say not since when. Write \`@since next\` in the ` +
        `JSDoc of what is new — the release names the version (\`stamp-version.mjs\`):\n` +
        `    ${missing.map(where).join('\n    ')}`,
    );

  // 2. The value is `next`, or a version the manifest has reached.
  const odd = items.filter(
    (i) =>
      i.since !== NEXT &&
      !(VERSION.test(i.since) && compare(triple(i.since), shipped) <= 0),
  );
  if (odd.length)
    throw new SinceError(
      'since-value',
      `${odd.length} \`@since\` value(s) name neither \`${NEXT}\` nor a version the manifest ` +
        `has reached (${version}):\n    ${odd
          .map((i) => `${where(i)} — \`@since ${i.since}\``)
          .join('\n    ')}`,
    );

  // 3. A deprecated item is a released one.
  const born = items.filter((i) => i.deprecated && i.since === NEXT);
  if (born.length)
    throw new SinceError(
      'since-deprecated',
      `${born.length} item(s) are deprecated before they were released — that is a removal, ` +
        `not a deprecation:\n    ${born.map(where).join('\n    ')}`,
    );

  const members = items.filter((i) => MEMBER_CALLS.has(i.kind)).length;
  const methods = items.filter((i) => i.kind === 'method').length;
  const unreleased = items.filter((i) => i.since === NEXT).length;
  const deprecated = items.filter((i) => i.deprecated).length;
  return (
    `${items.length} public API items — ${members} inputs, models and outputs, ${methods} ` +
    `public methods, ${items.length - members - methods} exports — every one dated; ` +
    `${unreleased} unreleased (\`${NEXT}\`), ${deprecated} deprecated, against ${version}`
  );
};

// ── the readers ─────────────────────────────────────────────────────────────

// The TypeScript parser, not a regular expression: a decorator between the JSDoc and its
// class, a `readonly` on a line of its own, a generic holding a comma — each is a shape a
// scanner reads wrong once, and a tag it then misses is an API it then excuses.
const parse = (path) =>
  ts.createSourceFile(
    path,
    readFileSync(join(ROOT, path), 'utf8'),
    ts.ScriptTarget.Latest,
    true,
  );
const lineOf = (sf, node) =>
  sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;
const tagText = (tag) =>
  (typeof tag.comment === 'string'
    ? tag.comment
    : (ts.getTextOfJSDocComment(tag.comment) ?? '')
  ).trim();

/** The two tags this gate reads off a declaration's JSDoc. */
const docOf = (node) => {
  const tags = ts.getJSDocTags(node);
  const since = tags.find((t) => t.tagName.text === 'since');
  return {
    since: since ? tagText(since) : null,
    deprecated: tags.some((t) => t.tagName.text === 'deprecated'),
  };
};

/** `input(…)`, `model.required<T>()`, `output<T>()` — the call that makes a member public. */
const memberKind = (initializer) => {
  if (!initializer || !ts.isCallExpression(initializer)) return null;
  const e = initializer.expression;
  const name = ts.isIdentifier(e)
    ? e.text
    : ts.isPropertyAccessExpression(e) &&
        ts.isIdentifier(e.expression) &&
        e.name.text === 'required'
      ? e.expression.text
      : null;
  return name && MEMBER_CALLS.has(name) ? name : null;
};

/** Every input, model and output of every class in one source file. */
const membersIn = (path) => {
  const sf = parse(path);
  const out = [];
  const visit = (node) => {
    if (ts.isPropertyDeclaration(node) && ts.isIdentifier(node.name)) {
      const kind = memberKind(node.initializer);
      if (kind)
        out.push({
          path,
          line: lineOf(sf, node),
          name: node.name.text,
          kind,
          ...docOf(node),
        });
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return out;
};

const isExported = (node) =>
  (ts.canHaveModifiers(node) ? (ts.getModifiers(node) ?? []) : []).some(
    (m) => m.kind === ts.SyntaxKind.ExportKeyword,
  );
const kindOf = (d) =>
  ts.isClassDeclaration(d)
    ? 'class'
    : ts.isFunctionDeclaration(d)
      ? 'function'
      : ts.isTypeAliasDeclaration(d)
        ? 'type'
        : ts.isInterfaceDeclaration(d)
          ? 'interface'
          : ts.isEnumDeclaration(d)
            ? 'enum'
            : ts.isVariableStatement(d)
              ? 'const'
              : null;
const namesOf = (d) =>
  ts.isVariableStatement(d)
    ? d.declarationList.declarations
        .map((v) => (ts.isIdentifier(v.name) ? v.name.text : null))
        .filter(Boolean)
    : d.name
      ? [d.name.text]
      : [];

/**
 * What a file exports, by the name it exports it under: `export class X` under `X`, and
 * `export { X }` — `export { X as Y }` under `Y` — for a declaration the keyword was left
 * off. Both reach a consumer, so a reader that knows only the keyword stops seeing an API
 * the day somebody writes the list, and this gate then passes on an undated one.
 *
 * A name maps to a LIST, because TypeScript lets several declarations carry it: a class
 * merged with an interface, a function's overload signatures above its implementation. One
 * declaration per name would hide the others — and with them, for a class, every public
 * method that class declares.
 *
 * `import { X } from './z'; export { X }` is NOT resolved — the declaration is in `z.ts`,
 * where `membersIn` and `methodsIn` read it anyway; only its export item could slip, and
 * only from an entry point, and every index here re-exports with `from`.
 */
const exportedFrom = (sf) => {
  const declared = new Map();
  const out = new Map();
  const add = (map, name, d) => map.set(name, [...(map.get(name) ?? []), d]);
  for (const d of sf.statements) {
    for (const name of namesOf(d)) {
      add(declared, name, d);
      if (isExported(d)) add(out, name, d);
    }
  }
  for (const st of sf.statements) {
    // `export { … } from './x'` is a re-export: its declarations are read in `x.ts`.
    if (!ts.isExportDeclaration(st) || st.moduleSpecifier) continue;
    if (!st.exportClause || !ts.isNamedExports(st.exportClause)) continue;
    for (const e of st.exportClause.elements)
      for (const d of declared.get((e.propertyName ?? e.name).text) ?? [])
        add(out, e.name.text, d);
  }
  return out;
};

const isHidden = (node) =>
  (ts.canHaveModifiers(node) ? (ts.getModifiers(node) ?? []) : []).some(
    (m) =>
      m.kind === ts.SyntaxKind.PrivateKeyword ||
      m.kind === ts.SyntaxKind.ProtectedKeyword,
  );

/**
 * The public methods of every class a source file exports — one item per name, dated by the
 * FIRST of its declarations to carry a tag (an overload set usually carries its JSDoc on the
 * first signature) and deprecated when any does — a merged name cannot say two dates, and
 * plan 4.75 is where that is owed an answer. Read file-wide like the members, and not off
 * the entry point's re-exports: a base class the index never names still ships in the types
 * under the class that extends it (`PctSelectBase` under `PctSelect`), and a consumer's
 * editor reads its methods there. Lifecycle hooks, constructors, accessors and private
 * names are not API.
 */
const methodsIn = (path) => {
  const sf = parse(path);
  const exported = new Set([...exportedFrom(sf).values()].flat());
  const out = [];
  for (const cls of sf.statements) {
    if (!ts.isClassDeclaration(cls) || !cls.name) continue;
    if (!isExported(cls) && !exported.has(cls)) continue;
    const byName = new Map();
    for (const m of cls.members) {
      if (!ts.isMethodDeclaration(m) || !ts.isIdentifier(m.name)) continue;
      if (isHidden(m) || LIFECYCLE.test(m.name.text)) continue;
      const doc = docOf(m);
      const seen = byName.get(m.name.text);
      if (!seen)
        byName.set(m.name.text, {
          path,
          line: lineOf(sf, m),
          name: `${cls.name.text}.${m.name.text}`,
          kind: 'method',
          ...doc,
        });
      else {
        seen.since ??= doc.since;
        seen.deprecated ||= doc.deprecated;
      }
    }
    out.push(...byName.values());
  }
  return out;
};

/**
 * What an entry point re-exports — `export * from './x'` takes every exported declaration
 * of `x.ts`, `export { a, b } from './x'` the named ones — each with its JSDoc read where it
 * is declared.
 */
const exportsIn = (indexPath) => {
  const sf = parse(indexPath);
  const out = [];
  for (const st of sf.statements) {
    if (!ts.isExportDeclaration(st) || !st.moduleSpecifier) continue;
    if (st.exportClause && ts.isNamespaceExport(st.exportClause)) continue;
    const only =
      st.exportClause && ts.isNamedExports(st.exportClause)
        ? new Set(
            st.exportClause.elements.map(
              (e) => (e.propertyName ?? e.name).text,
            ),
          )
        : null;
    const path = `${join(dirname(indexPath), st.moduleSpecifier.text)}.ts`
      .split('\\')
      .join('/');
    let target;
    try {
      target = parse(path);
    } catch {
      continue; // a re-export of nothing does not compile; the build says so, not this gate
    }
    for (const [name, decls] of exportedFrom(target)) {
      if (only && !only.has(name)) continue;
      const kinds = decls.map(kindOf);
      const first = kinds.findIndex(Boolean);
      if (first < 0) continue;
      // One item per exported NAME and not per declaration: a consumer imports the name
      // once, and its declarations are one API. The line and the kind come from the first
      // declaration that has one, the tag from the FIRST that carries one, the deprecation
      // from any — the same reading `methodsIn` gives an overload set. One item cannot say
      // two dates, so a shipped name that gains a signature dated `next` still reads as
      // shipped; that is plan 4.75, and it waits for the first name to meet it.
      out.push({
        path,
        line: lineOf(target, decls[first]),
        name,
        kind: kinds[first],
        since: decls.map((d) => docOf(d).since).find(Boolean) ?? null,
        deprecated: decls.some((d) => docOf(d).deprecated),
      });
    }
  }
  return out;
};

const readItems = () => {
  const files = SOURCES.flatMap((p) => globSync(p, { cwd: ROOT }))
    .map((p) => p.split('\\').join('/'))
    .filter((p) => !NOT_SOURCE.test(p))
    .sort();
  const items = [...files.flatMap(membersIn), ...files.flatMap(methodsIn)];
  const seen = new Set();
  for (const index of files.filter((p) => p.endsWith('/index.ts')))
    for (const item of exportsIn(index)) {
      const key = `${item.path}:${item.line}:${item.name}`;
      if (!seen.has(key)) {
        seen.add(key);
        items.push(item);
      }
    }
  return items;
};

const readVersion = () =>
  JSON.parse(readFileSync(join(ROOT, MANIFEST), 'utf8')).version ?? null;

// ── negative control ─────────────────────────────────────────

const readFixture = (name) =>
  JSON.parse(readFileSync(join(FIXTURES, name), 'utf8'));

/**
 * Builds a case's input ON A COPY of the reference one, so the case file holds nothing but
 * its own defect: `version` replaces the manifest's, `add` appends items, `items` replaces
 * them all.
 */
const buildFixture = (fx) => {
  const input = structuredClone(readFixture(REFERENCE).input);
  if ('version' in fx) input.version = fx.version;
  if (fx.items !== undefined) input.items = fx.items;
  for (const item of fx.add ?? []) input.items.push(item);
  return input;
};

// ── the readers' own control ──────────────────────────

const READER = 'tools/check-since.fixtures/_reader';

/**
 * A prepared library the READERS are run over, because the prepared inputs above examine
 * only the judge. A reader that stops seeing an API leaves this gate green over an undated
 * one, and no list of items can catch that — the list is what the reader was to produce.
 * `_reader/` writes a small surface three ways — with the `export` keyword, with a list,
 * and under names several declarations share — and holds what all three must yield.
 */
const readerControl = () => {
  const expected = readFixture('_reader/expected.json').items;
  const files = ['plain.ts', 'listed.ts', 'merged.ts'].map(
    (n) => `${READER}/${n}`,
  );
  const got = [
    ...files.flatMap(membersIn),
    ...files.flatMap(methodsIn),
    ...exportsIn(`${READER}/index.ts`),
  ];
  const say = (i) =>
    `${i.path}:${i.line} ${i.kind} ${i.name} @since ${i.since}` +
    (i.deprecated ? ' @deprecated' : '');
  // Counted and not merely listed: a reader that returns the same item twice publishes a
  // number nobody can read back, and a set would call that the promised one.
  const tally = (xs) =>
    xs.reduce((m, x) => m.set(x, (m.get(x) ?? 0) + 1), new Map());
  const mine = tally(got.map(say));
  const theirs = tally(expected.map(say));
  const problems = [];
  for (const [x, wanted] of theirs)
    if ((mine.get(x) ?? 0) < wanted)
      problems.push(
        `_reader: the readers no longer find \`${x}\` — an API this gate would now excuse`,
      );
  for (const [x, found] of mine) {
    const wanted = theirs.get(x) ?? 0;
    if (found > wanted)
      problems.push(
        wanted === 0
          ? `_reader: the readers found \`${x}\`, which the prepared library does not promise`
          : `_reader: the readers found \`${x}\` ${found} times, and the prepared ` +
              `library promises it ${wanted}`,
      );
  }
  return problems;
};

// ── the run ────────────────────────────────────────────

const problems = [];
let summary = null;

try {
  summary = checkSince({ version: readVersion(), items: readItems() });
} catch (error) {
  if (!(error instanceof SinceError)) throw error;
  problems.push(`${error.check}: ${error.message}`);
}

problems.push(...readerControl());

const cases = readdirSync(FIXTURES)
  .filter((n) => n.endsWith('.json') && n !== REFERENCE)
  .sort();

if (cases.length === 0)
  problems.push(
    `tools/check-since.fixtures: no prepared inputs — a gate with no proof that it can ` +
      `fail is one more silent defect (req-quality-negative-control)`,
  );

// The reference input MUST pass: were it defective, every case would fire because of it.
try {
  checkSince(buildFixture({}));
} catch (error) {
  if (!(error instanceof SinceError)) throw error;
  problems.push(
    `${REFERENCE}: the reference input does NOT pass (${error.check}) — ` +
      `every prepared case now fires because of it.\n    ${error.message}`,
  );
}

for (const name of cases) {
  const fx = readFixture(name);
  try {
    checkSince(buildFixture(fx));
    problems.push(
      `${name}: the prepared input PASSED and was meant not to — ` +
        `point ${fx.point} (\`${fx.check}\`) stopped examining anything`,
    );
  } catch (error) {
    if (!(error instanceof SinceError)) throw error;
    if (error.check !== fx.check)
      problems.push(
        `${name}: check \`${error.check}\` fired, and point ${fx.point} ` +
          `(\`${fx.check}\`) was meant to — the fixture proves something other than what ` +
          `it declares`,
      );
  }
}

// ── result ────────────────────────────────────────────

if (problems.length) {
  console.error(`X Since gate — ${problems.length} violations:\n`);
  for (const p of problems) console.error(`  - ${p}`);
  console.error('');
  process.exit(1);
}

console.log(
  `✓ Since: ${summary}. Negative control: the reference input passes, ` +
    `${cases.length} prepared ones rejected on their own points, and the readers find ` +
    `every API of the prepared library — written with the keyword, with a list, and under ` +
    `names several declarations share.`,
);
