#!/usr/bin/env node
/**
 * Since gate: does the public surface say since when? `req-release-since` promises that
 * every input, model, output and export names the version it appeared in, at its
 * declaration — the shipped types carry it, and the site tells what `main` has beyond it.
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
  const unreleased = items.filter((i) => i.since === NEXT).length;
  const deprecated = items.filter((i) => i.deprecated).length;
  return (
    `${items.length} public API items — ${members} inputs, models and outputs, ` +
    `${items.length - members} exports — every one dated; ${unreleased} unreleased ` +
    `(\`${NEXT}\`), ${deprecated} deprecated, against ${version}`
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
    for (const d of target.statements) {
      const kind = isExported(d) ? kindOf(d) : null;
      if (!kind) continue;
      for (const name of namesOf(d))
        if (!only || only.has(name))
          out.push({ path, line: lineOf(target, d), name, kind, ...docOf(d) });
    }
  }
  return out;
};

const readItems = () => {
  const files = SOURCES.flatMap((p) => globSync(p, { cwd: ROOT }))
    .map((p) => p.split('\\').join('/'))
    .filter((p) => !NOT_SOURCE.test(p))
    .sort();
  const items = files.flatMap(membersIn);
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

// ── the run ────────────────────────────────────────────

const problems = [];
let summary = null;

try {
  summary = checkSince({ version: readVersion(), items: readItems() });
} catch (error) {
  if (!(error instanceof SinceError)) throw error;
  problems.push(`${error.check}: ${error.message}`);
}

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
    `${cases.length} prepared ones rejected on their own points.`,
);
