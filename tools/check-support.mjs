#!/usr/bin/env node
/**
 * Support gate: is `docs/support.md` a policy a consumer can hold the library to, or four
 * good intentions? `req-release-support` promises three numbers and one obligation, and the
 * obligation was the one tied to nothing — the migration collection has shipped since the
 * first commit and no breaking change was ever required to add to it.
 *
 *  1. the policy declares its rows, in the shape this gate reads,
 *  2. the declared Angular window equals the one the manifest's peer ranges admit,
 *  3. every migration entry is whole: a version, a description, a factory with a file,
 *  4. THE TIE: a breaking change since the last release tag ships a codemod,
 *  5. a deprecation names the version it started in, else the countdown starts nowhere.
 *
 * Point 4 is what the requirement was missing; 1 and 2 stop the document drifting from the
 * package it describes. A sixth run examines the gate itself
 * (`req-quality-negative-control`): `check-support.fixtures/`.
 *
 * Usage: node tools/check-support.mjs
 */
import { execFileSync } from 'node:child_process';
import { existsSync, globSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const POLICY = 'docs/support.md';
const MANIFEST = 'libs/components/package.json';
const SCHEMATICS = 'libs/components/schematics';
const COLLECTION = `${SCHEMATICS}/migration.json`;
const FIXTURES = join(ROOT, 'tools/check-support.fixtures');
const REFERENCE = '_reference.json';

/** Release tags — `release.releaseTag.pattern` in `nx.json` is `{projectName}@{version}`. */
const TAG = 'components@*';

/** The rows of the table in the policy, and the shape each value has to have. */
const ROWS = {
  'angular-majors': /^\d+$/,
  'support-months': /^\d+$/,
  'deprecation-minors': /^\d+$/,
  'codemod-required': /^(yes|no)$/,
};

/**
 * A peer range this gate can count majors in. Anything else is **refused, not guessed**: a
 * range the parser half-understands would report a window nobody declared, and point 2 would
 * be comparing the policy against the gate's own imagination.
 */
const PEER_TERM = /^\^(\d+)\.\d+\.\d+(?:-[\w.]+)?$/;

/** A version in the collection, and the `since` clause a `@deprecated` tag has to carry. */
const VERSION = /^\d+\.\d+\.\d+(?:-[\w.]+)?$/;
const SINCE = /\bsince\s+v?\d+\.\d+\.\d+/;

/** Where a `@deprecated` tag counts — the sources that become the public surface. */
const SOURCES = [
  'libs/components/src/**/*.ts',
  'libs/components/*/src/**/*.ts',
];

/** `feat!:`, `fix(scope)!:` — the conventional-commit mark for a breaking change. */
const BREAKING_SUBJECT = /^[a-z]+(\([^)]*\))?!:/;
const BREAKING_TRAILER = /^BREAKING[ -]CHANGE:/m;

/**
 * A violation of one of the five points. It carries the point's identifier, not just the
 * message: the negative control has to verify that a prepared input fired ON ITS OWN point —
 * an input failing for a reason other than the one written into it proves something other
 * than what it declares.
 */
class SupportError extends Error {
  constructor(check, description) {
    super(description);
    this.check = check;
  }
}

/** `a` strictly newer than `b`, comparing the numeric triple and nothing else. */
const newer = (a, b) => {
  const parts = (v) => String(v).split('-')[0].split('.').map(Number);
  const [x, y] = [parts(a), parts(b)];
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] > y[i];
  return false;
};

/**
 * The full set of checks over a ready input:
 *   `policy`       — the rows read out of the table (or null: no document),
 *   `peers`        — `peerDependencies` from the manifest,
 *   `migrations`   — the collection's entries (or null: the file declares no `schematics`),
 *   `released`     — the newest released version, or null before the first tag,
 *   `breaking`     — the breaking commits since that tag,
 *   `deprecations` — the `@deprecated` lines of the library sources.
 * Throws `SupportError` on the first violation — the points run from the most basic one, so
 * the later ones would have nothing to examine anyway.
 */
const checkSupport = ({
  policy,
  peers,
  migrations,
  released,
  breaking,
  deprecations,
}) => {
  // 1. The policy declares its rows.
  if (!policy)
    throw new SupportError(
      'policy',
      `no \`${POLICY}\` — the support window, the deprecation notice and the codemod ` +
        `obligation are then whatever the last person to be asked remembers`,
    );
  for (const [row, shape] of Object.entries(ROWS)) {
    const value = policy[row];
    if (value === undefined)
      throw new SupportError(
        'policy',
        `\`${POLICY}\` has no \`${row}\` row — the promise is prose then, and prose is ` +
          `not something a consumer can hold the library to`,
      );
    if (!shape.test(String(value)))
      throw new SupportError(
        'policy',
        `\`${row}\` is \`${value}\`, and has to match \`${shape.source}\` — a policy ` +
          `answers "how many" with a number, not with a sentence about circumstances`,
      );
  }

  // 2. The declared window is the window the manifest admits. This is what stops the
  // document being a second, drifting copy of the peer ranges.
  const declared = Number(policy['angular-majors']);
  const angular = Object.entries(peers ?? {}).filter(([name]) =>
    name.startsWith('@angular/'),
  );
  if (!angular.length)
    throw new SupportError(
      'window',
      `the manifest (${MANIFEST}) declares no \`@angular/*\` peer dependency — ` +
        `there is nothing for the declared window of ${declared} major(s) to agree with`,
    );
  const majors = new Map();
  for (const [name, range] of angular) {
    const terms = String(range)
      .split('||')
      .map((t) => t.trim());
    const unreadable = terms.filter((t) => !PEER_TERM.test(t));
    if (unreadable.length)
      throw new SupportError(
        'window',
        `\`${name}\`: \`${range}\` — this gate counts majors in \`^N.0.0\` terms joined ` +
          `by \`||\` and refuses to guess at \`${unreadable.join('`, `')}\`. Write the ` +
          `range in that shape, or widen the parser deliberately`,
      );
    majors.set(name, [
      ...new Set(terms.map((t) => Number(t.match(PEER_TERM)[1]))),
    ]);
  }
  const [reference, ...rest] = [...majors].map(([name, m]) => [
    name,
    m.sort((a, b) => a - b),
  ]);
  const disagreeing = rest.filter(([, m]) => m.join() !== reference[1].join());
  if (disagreeing.length)
    throw new SupportError(
      'window',
      `the \`@angular/*\` peer ranges do not admit the same majors: ` +
        `\`${reference[0]}\` → ${reference[1].join(', ')}, ` +
        disagreeing.map(([n, m]) => `\`${n}\` → ${m.join(', ')}`).join('; ') +
        ` — the window is then a different one per package and the policy states one number`,
    );
  if (reference[1].length !== declared)
    throw new SupportError(
      'window',
      `\`${POLICY}\` promises ${declared} Angular major(s), the manifest admits ` +
        `${reference[1].length} (${reference[1].join(', ')}) — whichever is right, a ` +
        `consumer reads the document and installs against the manifest`,
    );

  // 3. Every migration entry is whole.
  if (!migrations)
    throw new SupportError(
      'collection',
      `\`${COLLECTION}\` declares no \`schematics\` object — that is not an empty ` +
        `collection, it is no collection, and \`ng update\` reads it from the version ` +
        `INSTALLED at the consumer (req-release-ng-add)`,
    );
  for (const entry of migrations) {
    const where = `\`${COLLECTION}\` → \`${entry.name}\``;
    if (!VERSION.test(String(entry.version ?? '')))
      throw new SupportError(
        'collection',
        `${where}: version \`${entry.version ?? 'none'}\` — \`ng update\` picks ` +
          `migrations by version, so an entry without one runs for nobody`,
      );
    if (!String(entry.description ?? '').trim())
      throw new SupportError(
        'collection',
        `${where}: no \`description\` — it is what the consumer sees scroll past ` +
          `during the upgrade, and the only account of what was rewritten`,
      );
    if (!/^\.\/.+#.+$/.test(String(entry.factory ?? '')))
      throw new SupportError(
        'collection',
        `${where}: factory \`${entry.factory ?? 'none'}\` — the shape is ` +
          `\`./path/to/file#exportedName\``,
      );
    if (!entry.factoryExists)
      throw new SupportError(
        'collection',
        `${where}: \`${String(entry.factory).split('#')[0]}\` has no file under ` +
          `\`${SCHEMATICS}/\` — the entry blows up at the consumer, not here`,
      );
  }

  // 4. The tie the requirement was missing: a breaking change ships a codemod.
  if (policy['codemod-required'] !== 'yes')
    throw new SupportError(
      'codemod',
      `\`${POLICY}\` sets \`codemod-required\` to \`${policy['codemod-required']}\` — ` +
        `req-release-support promises the opposite, so this row is not a switch to reach ` +
        `for when a migration is inconvenient to write`,
    );
  const owed = released ? breaking : [];
  if (owed.length) {
    const ahead = migrations.filter((m) => newer(m.version, released));
    if (!ahead.length)
      throw new SupportError(
        'codemod',
        `${owed.length} breaking change(s) since \`${released}\` and not one migration ` +
          `above that version — the consumer gets a CHANGELOG paragraph where the ` +
          `policy promised \`ng update\` would do the work:\n` +
          owed.map((c) => `      ${c.hash} ${c.subject}`).join('\n'),
      );
  }

  // 5. A deprecation names the version it started in.
  const unnamed = deprecations.filter((d) => !SINCE.test(d.text));
  if (unnamed.length)
    throw new SupportError(
      'deprecation',
      `${unnamed.length} \`@deprecated\` tag(s) name no version — ` +
        `\`${policy['deprecation-minors']}\` minors of notice cannot be counted from a ` +
        `moment nobody recorded. Write \`@deprecated since <version> — use X instead\`:\n` +
        unnamed.map((d) => `      ${d.path}:${d.line}`).join('\n'),
    );

  const tie = released
    ? `${breaking.length} breaking change(s) since ${released}`
    : `no release tag yet, so point 4 measures nothing — the obligation starts at the first one`;
  return (
    `${declared} Angular major (${reference[1].join(', ')}), ` +
    `${policy['support-months']} months of an old line, ` +
    `${policy['deprecation-minors']} minors of notice; ` +
    `${migrations.length} migration(s), ${deprecations.length} deprecation(s); ${tie}`
  );
};

// ── input from disk ───────────────────────────────────────────────────────────

/**
 * The rows of the policy table. Read by key rather than by position, so reordering the table
 * or adding a column of prose does not move the measurement.
 */
const readPolicy = () => {
  const path = join(ROOT, POLICY);
  if (!existsSync(path)) return null;
  const rows = {};
  for (const [, key, value] of readFileSync(path, 'utf8').matchAll(
    /^\|\s*`([a-z-]+)`\s*\|\s*([^|]*?)\s*\|/gm,
  ))
    if (key in ROWS) rows[key] = value;
  return rows;
};

const readPeers = () =>
  JSON.parse(readFileSync(join(ROOT, MANIFEST), 'utf8')).peerDependencies;

/** Does the factory of an entry have a file? The extension is the build's business. */
const factoryExists = (factory) => {
  const file = String(factory ?? '').split('#')[0];
  return ['.ts', '.mts', '.mjs', '.js'].some((ext) =>
    existsSync(join(ROOT, SCHEMATICS, file + ext)),
  );
};

const readMigrations = () => {
  const raw = JSON.parse(readFileSync(join(ROOT, COLLECTION), 'utf8'));
  if (!raw.schematics || typeof raw.schematics !== 'object') return null;
  return Object.entries(raw.schematics).map(([name, entry]) => ({
    name,
    version: entry?.version,
    description: entry?.description,
    factory: entry?.factory,
    factoryExists: factoryExists(entry?.factory),
  }));
};

const git = (...args) =>
  execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim();

/**
 * The newest released version, or null. `--sort=-v:refname` orders by version rather than
 * alphabetically, so `0.10.0` does not lose to `0.9.0`.
 */
const readReleased = () => {
  const tags = git('tag', '--list', TAG, '--sort=-v:refname')
    .split('\n')
    .filter(Boolean);
  return tags.length ? tags[0].split('@').pop() : null;
};

/** Breaking commits in the unreleased range. Before the first tag: the whole history. */
const readBreaking = (released) =>
  git(
    'log',
    '--format=%H%x1f%s%x1f%b%x1e',
    released ? `components@${released}..HEAD` : 'HEAD',
  )
    .split('\x1e')
    .map((record) => record.trim())
    .filter(Boolean)
    .map((record) => {
      const [hash, subject, body] = record.split('\x1f');
      return { hash: hash.slice(0, 8), subject, body: body ?? '' };
    })
    .filter(
      (c) => BREAKING_SUBJECT.test(c.subject) || BREAKING_TRAILER.test(c.body),
    );

const readDeprecations = () =>
  SOURCES.flatMap((pattern) => globSync(pattern, { cwd: ROOT }))
    .map((p) => p.split('\\').join('/'))
    .filter((p) => !p.endsWith('.spec.ts'))
    .sort()
    .flatMap((path) =>
      readFileSync(join(ROOT, path), 'utf8')
        .split('\n')
        .map((text, i) => ({ path, line: i + 1, text }))
        .filter((d) => d.text.includes('@deprecated')),
    );

// ── negative control ──────────────────────────────────────────────────────────

const readFixture = (name) =>
  JSON.parse(readFileSync(join(FIXTURES, name), 'utf8'));

/**
 * Builds a case's input ON A COPY of the reference one, so the case file holds nothing but
 * its own defect — you cannot break something in passing and not notice.
 */
const buildFixture = (fx) => {
  const input = structuredClone(readFixture(REFERENCE).input);
  if (fx.dropPolicy) input.policy = null;
  for (const row of fx.dropRows ?? []) delete input.policy[row];
  Object.assign(input.policy ?? {}, fx.policy ?? {});
  Object.assign(input.peers, fx.peers ?? {});
  for (const name of fx.dropPeers ?? []) delete input.peers[name];
  if (fx.dropCollection) input.migrations = null;
  if (fx.migrations !== undefined) input.migrations = fx.migrations;
  if ('released' in fx) input.released = fx.released;
  if (fx.breaking !== undefined) input.breaking = fx.breaking;
  if (fx.deprecations !== undefined) input.deprecations = fx.deprecations;
  return input;
};

// ── the run ───────────────────────────────────────────────────────────────────

const problems = [];
let summary = null;

try {
  const released = readReleased();
  summary = checkSupport({
    policy: readPolicy(),
    peers: readPeers(),
    migrations: readMigrations(),
    released,
    breaking: readBreaking(released),
    deprecations: readDeprecations(),
  });
} catch (error) {
  if (!(error instanceof SupportError)) throw error;
  problems.push(`${error.check}: ${error.message}`);
}

const cases = readdirSync(FIXTURES)
  .filter((n) => n.endsWith('.json') && n !== REFERENCE)
  .sort();

if (cases.length === 0)
  problems.push(
    `tools/check-support.fixtures: no prepared inputs — a gate with no proof that it can ` +
      `fail is one more silent defect (req-quality-negative-control)`,
  );

// The reference input MUST pass. Were it defective itself, every case would fire because of
// it rather than because of its own defect — and every "it fired" would be false.
try {
  checkSupport(buildFixture({}));
} catch (error) {
  if (!(error instanceof SupportError)) throw error;
  problems.push(
    `${REFERENCE}: the reference input does NOT pass (${error.check}) — ` +
      `every prepared case now fires because of it.\n    ${error.message}`,
  );
}

for (const name of cases) {
  const fx = readFixture(name);
  try {
    checkSupport(buildFixture(fx));
    problems.push(
      `${name}: the prepared input PASSED and was meant not to — ` +
        `point ${fx.point} (\`${fx.check}\`) stopped examining anything`,
    );
  } catch (error) {
    if (!(error instanceof SupportError)) throw error;
    if (error.check !== fx.check)
      problems.push(
        `${name}: check \`${error.check}\` fired, and point ${fx.point} ` +
          `(\`${fx.check}\`) was meant to — the fixture proves something other than what ` +
          `it declares`,
      );
  }
}

// ── result ────────────────────────────────────────────────────────────────────

if (problems.length) {
  console.error(`X Support gate — ${problems.length} violations:\n`);
  for (const p of problems) console.error(`  - ${p}`);
  console.error('');
  process.exit(1);
}

console.log(
  `✓ Support: ${summary}. Negative control: the reference input passes, ` +
    `${cases.length} prepared ones rejected on their own points.`,
);
