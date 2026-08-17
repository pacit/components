#!/usr/bin/env node
/**
 * Package gate: can `dist/libs/components` be installed and used — does it carry the skin
 * or only the code? A library build SUCCEEDS with not one token definition in the package;
 * the components then reference `var(--pct-*)` nobody declares, the browser quietly takes
 * the initial value and the consumer gets controls with no appearance. No unit or e2e test
 * sees it — they run on the sources and on the sandbox, not on the packed artifact
 * ([`lesson-17`](../../docs/lessons.md#lesson-17)).
 *
 *  1. the skin is in the package (`themes/pct.css`, non-empty),
 *  2. it is reachable by import (`exports` in package.json),
 *  3. token closure: every `var(--pct-*)` used in the package is declared in it,
 *  4. `PCT_VERSION` in the code matches `version` from the manifest,
 *  5. the `ng add` / `ng update` collections are there and their factories point at
 *     compiled files,
 *  6. the manifest has the metadata publishing needs (a warning; `--release` blocks),
 *  7. the dependency lists: every declared name is deliberate, everything the code imports
 *     is declared, and the `@angular/*` ranges admit the compiler that built the package.
 *
 * Point 3 is the one that catches the regression — an empty file passes 1 and 2 as well.
 * Negative control: `tools/check-package.fixtures/` (`req-quality-negative-control`).
 *
 * Usage: node libs/components/check-package.mjs [--release]  (--release: point 6 blocks)
 */
import {
  cpSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
} from 'node:fs';
import { basename, dirname, extname, join, relative } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const DIST = join(HERE, '../../dist/libs/components');
const FIXTURES = join(HERE, '../../tools/check-package.fixtures');
const REFERENCE = '_reference';
const THEME = 'themes/pct.css';
const POLICY = 'dependencies.policy.json';

/** The two manifest fields point 7 reads, and the `kind` each of them is in the policy. */
const DEPENDENCY_FIELDS = { peerDependencies: 'peer', dependencies: 'runtime' };

/**
 * Every other field npm installs from. The gate does not read them, and a list it does not
 * read is exactly the road a dependency takes when nobody is looking — so their presence is
 * an error rather than a silence.
 */
const UNREAD_FIELDS = [
  'optionalDependencies',
  'bundleDependencies',
  'bundledDependencies',
];

/**
 * How an import is recognised in the artefact. A statement is anchored at the start of a
 * line, because the bundles are generated and put one there — measured, not assumed: a
 * pattern free to match anywhere reads `told from "junk"` out of a JSDoc paragraph in
 * `field` as an import of a package called `junk`.
 */
const IMPORTS = [
  /^\s*(?:import|export)\b[^'"\n]*\bfrom\s*['"]([^'"]+)['"]/gm,
  /^\s*import\s*['"]([^'"]+)['"]/gm,
  /\b(?:import|require)\(\s*['"]([^'"]+)['"]\s*\)/g,
];

/**
 * The version of the compiler that produced the package. Angular's partial compilation
 * stamps it into every declaration next to the `minVersion` the output needs, and the pair
 * is what makes the match precise: a bare `version:` also stands in every manifest of the
 * package, with a version of the LIBRARY beside it.
 */
const COMPILER =
  /minVersion:\s*['"][^'"]+['"],\s*version:\s*['"](\d+)\.\d+\.\d+/g;

/**
 * A peer range point 7 can read majors out of — the same shape `tools/check-support.mjs`
 * counts them in, and anything else is refused rather than guessed at. The two gates ask
 * different questions of the same ranges: that one asks how many majors the window holds,
 * this one whether the window holds the compiler that built the code.
 */
const PEER_TERM = /^\^(\d+)\.\d+\.\d+(?:-[\w.]+)?$/;

// We scan the package's textual outputs. Component styles sit in the bundles as strings,
// so the definitions from .scss arrive here together with the code.
const TEXT = new Set(['.css', '.scss', '.js', '.mjs', '.ts', '.json']);

const walk = (dir, out = []) => {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, out);
    else if (TEXT.has(extname(name)) && !name.endsWith('.map')) out.push(path);
  }
  return out;
};

/**
 * A violation of one of the seven checks. It carries the check's identifier and not just
 * the message, because the negative control has to verify that a prepared package fired
 * ON ITS OWN point: a fixture failing for a reason other than the one in `fixture.json`
 * proves something other than what it declares — the same silent defect this whole gate
 * stands against.
 *
 * `rule` is the finer address, and point 7 is the first point that needs one: its seven
 * rules share the `dependencies` identifier, so a fixture pinning the check alone would be
 * satisfied by any of them firing — that is, by the rule it was built for having stopped
 * working. A fixture states it when the point has more than one.
 */
class PackageError extends Error {
  constructor(check, description, rule) {
    super(description);
    this.check = check;
    this.rule = rule;
  }
}

/**
 * The full set of checks over the `ROOT` directory. Throws `PackageError` on the first
 * violation — the checks run from the most basic one, so the later ones would have
 * nothing to examine anyway. Returns a summary sentence.
 */
const checks = (ROOT, { release }, warnings) => {
  const fail = (check, msg, rule) => {
    throw new PackageError(check, msg, rule);
  };

  let files;
  try {
    files = walk(ROOT);
  } catch {
    fail(
      'package',
      `no built package in ${ROOT} — run \`nx build components\` first`,
    );
  }

  // 1. the skin is in the package
  const themePath = join(ROOT, THEME);
  let theme = '';
  try {
    theme = readFileSync(themePath, 'utf8');
  } catch {
    fail(
      'theme',
      `the package has no ${THEME} — the consumer gets components without one token.\n` +
        `  Check \`assets\` in libs/components/ng-package.json, and that tokens:build ran before build.`,
    );
  }
  if (!theme.includes('--pct-'))
    fail('theme', `${THEME} holds no token definition at all`);

  // 2. the skin is reachable by import. The `exports` map is closed: a file present in
  // the package but with no entry is invisible to the consumer
  // (ERR_PACKAGE_PATH_NOT_EXPORTED). An entry may be literal or carry a star.
  let pkg;
  try {
    pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
  } catch {
    fail(
      'package',
      `the package has no readable manifest (${ROOT}/package.json)`,
    );
  }
  const exposed = Object.keys(pkg.exports ?? {});
  const themeKey = './' + THEME;
  const covers = (pattern) => {
    const star = pattern.indexOf('*');
    if (star === -1) return pattern === themeKey;
    return (
      themeKey.startsWith(pattern.slice(0, star)) &&
      themeKey.endsWith(pattern.slice(star + 1))
    );
  };
  if (!exposed.some(covers)) {
    fail(
      'exports',
      `${THEME} is in the package but not in the \`exports\` map — \`import '@pacit/components/${THEME}'\`\n` +
        `  will throw ERR_PACKAGE_PATH_NOT_EXPORTED. Visible entrypoints: ${exposed.join(', ')}`,
    );
  }

  // 3. token closure: usage ⊆ declarations
  const USED = /var\(\s*(--pct-[a-z0-9-]+)/gi;
  const DEFINED = /(--pct-[a-z0-9-]+)\s*:/g;

  const used = new Map(); // token -> the files that use it
  const defined = new Set();

  for (const path of files) {
    const text = readFileSync(path, 'utf8');
    const where = relative(ROOT, path);
    for (const [, name] of text.matchAll(USED)) {
      if (!used.has(name)) used.set(name, new Set());
      used.get(name).add(where);
    }
    for (const [, name] of text.matchAll(DEFINED)) defined.add(name);
  }

  const missing = [...used.keys()].filter((t) => !defined.has(t)).sort();
  if (missing.length) {
    fail(
      'tokens',
      `${missing.length} tokens are used but declared nowhere in the package.\n` +
        `  The browser substitutes the initial value — the component renders with no appearance.\n` +
        missing
          .map(
            (t) => `  - ${t}  (used in: ${[...used.get(t)].sort().join(', ')})`,
          )
          .join('\n'),
    );
  }

  // 4. the version in the code == the version in the manifest. `PCT_VERSION` is generated
  // by `stamp-version.mjs`, but the generator is **not** a dependency of the build —
  // otherwise the artifact would always agree with itself and this check would examine
  // nothing. `nx release version` bumps the manifest alone, so without it the first
  // release would ship a package lying about its own version. A missing constant is as
  // much an error as a wrong value: it means the shape of the output changed and the
  // check stopped verifying anything.
  const VERSION_CONST = /PCT_VERSION\s*=\s*['"]([^'"]+)['"]/;
  const stamped = files
    .map((path) => readFileSync(path, 'utf8').match(VERSION_CONST)?.[1])
    .filter((v) => v !== undefined);

  if (stamped.length === 0) {
    fail(
      'version',
      `no PCT_VERSION constant found in the built package — the version check stopped working.\n` +
        `  Check that the constant is still exported from libs/components/src/index.ts.`,
    );
  }
  const wrong = [...new Set(stamped)].filter((v) => v !== pkg.version);
  if (wrong.length) {
    fail(
      'version',
      `PCT_VERSION (${wrong.join(', ')}) does not match the package version (${pkg.version}).\n` +
        `  Run: npx nx stamp-version components  (then rebuild the package)`,
    );
  }

  // 5. `ng add` and `ng update` are reachable. The manifest points at the collections by
  // file, and those appear in a separate step (`nx schematics components`) AFTER
  // ng-packagr — a place that is easy to skip. The manifest entry alone guarantees
  // nothing: with the file missing, `ng add @pacit/components` fails at the consumer's
  // with "Collection not found", and the library looks broken at the first command
  // anybody types.
  for (const [field, pointer] of [
    ['schematics', pkg.schematics],
    ['ng-update.migrations', pkg['ng-update']?.migrations],
  ]) {
    if (!pointer) {
      fail(
        'schematics',
        `the manifest has no \`${field}\` field — \`ng add\`/\`ng update\` will not work.`,
      );
    }
    let collection;
    try {
      collection = JSON.parse(readFileSync(join(ROOT, pointer), 'utf8'));
    } catch {
      fail(
        'schematics',
        `\`${field}\` points at ${pointer}, which is not in the package.\n` +
          `  Run: npx nx schematics components`,
      );
    }
    // The factory has to exist as a compiled file — a collection entry names a
    // pre-build TS path just as readily as an existing JS one.
    for (const [name, def] of Object.entries(collection.schematics ?? {})) {
      const factory = String(def.factory ?? '').split('#')[0];
      const resolved = join(ROOT, dirname(pointer), `${factory}.js`);
      try {
        statSync(resolved);
      } catch {
        fail(
          'schematics',
          `schematic \`${name}\` from \`${field}\` points at ${factory}, ` +
            `but ${relative(ROOT, resolved)} does not exist in the package.`,
        );
      }
    }
  }

  // 6. the metadata publishing requires. A severity of its own, because this is the one
  // condition code cannot satisfy: `repository` has to point at a real repository, and npm
  // **refuses** to issue provenance when it is missing or disagrees with the repository
  // the publish runs from. As long as the project has no remote, a missing field is not a
  // build error — it is a lack of release readiness, so day to day it only warns and
  // blocks under `--release`.
  const REQUIRED_META = {
    description: 'npm shows this on the package page and in search results',
    license: 'without it npm marks the package UNLICENSED',
    repository:
      'required by `npm publish --provenance`; must point at the repository the publish runs from',
  };

  const missingMeta = Object.entries(REQUIRED_META).filter(
    ([key]) => !pkg[key],
  );
  if (missingMeta.length) {
    const list = missingMeta
      .map(([key, why]) => `  - ${key}  (${why})`)
      .join('\n');
    if (release) {
      fail(
        'metadata',
        `the package manifest lacks fields required for publishing:\n${list}\n` +
          `  Fill them in in libs/components/package.json.`,
      );
    }
    warnings.push(
      `The package builds and works, but is NOT ready to publish — missing:\n${list}`,
    );
  }

  // The LICENSE file in the artifact. The `license` field and the file drift apart
  // quietly, because changing one does not force changing the other, and `"license":
  // "MIT"` with no file is formally an incomplete licence. Three different failures, three
  // rules: no file, a generator's stub of a file, a file naming a different licence than
  // the manifest. A hard error every time — unlike `repository`, which could not be
  // satisfied without a remote.
  let licence = '';
  try {
    licence = readFileSync(join(ROOT, 'LICENSE'), 'utf8');
  } catch {
    fail(
      'licence',
      `the package has no LICENSE file, and the manifest declares "${pkg.license}".\n` +
        `  To a consumer's legal team that is an incomplete licence. The file travels from libs/components/LICENSE.`,
    );
  }
  if (licence.trim().length < 100)
    fail(
      'licence',
      `the LICENSE file has ${licence.trim().length} characters — a stub, not a licence text`,
    );

  // Matched on a word boundary, not with `includes`: measured, not assumed — both the MIT
  // and the Apache-2.0 text contain the word LIMITED, with "MIT" sitting inside it as a
  // substring, so an Apache file under an MIT manifest would pass the simpler condition.
  const spdx = (pkg.license ?? '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (
    spdx &&
    !new RegExp(`(?<![A-Za-z0-9])${spdx}(?![A-Za-z0-9])`).test(licence)
  )
    fail(
      'licence',
      `the manifest declares "${pkg.license}" and the LICENSE file does not carry that ` +
        `name — one side was changed without the other`,
    );
  if (!/Copyright \(c\) \d{4} \S/.test(licence))
    fail(
      'licence',
      'the LICENSE file has no `Copyright (c) <year> <holder>` line — with no owner ' +
        'named, the notice protects nothing',
    );

  // 7. the dependency lists. A dependency is the one promise a consumer cannot opt out
  // of — it arrives with the install — and it is the one that gets added by reflex: `npm
  // i` writes the name into the ROOT manifest and the import into a source file, so the
  // library's own manifest never learns of it. A point reading the declared list alone
  // would be watching the single place a reflex does not touch, so this one measures both
  // directions against a policy that says which names are deliberate and why
  // ([`req-project-dependencies`](../../docs/requirements/project.md#req-project-dependencies)).
  //
  // The policy is read from the package when the package carries one and from the library
  // otherwise. That is what gives the rules ABOUT the policy — the shape of an entry, an
  // allowance with no dependency left behind it — a way of being shown to fire: a real
  // package never carries the file, so day to day the road is always the library's.
  const fromPackage = existsSync(join(ROOT, POLICY));
  const policySource = fromPackage
    ? `${POLICY} (the package's)`
    : `libs/components/${POLICY}`;
  let policy;
  try {
    policy = JSON.parse(
      readFileSync(join(fromPackage ? ROOT : HERE, POLICY), 'utf8'),
    );
  } catch {
    fail(
      'dependencies',
      `no readable dependency policy (${policySource}) — the list of deliberate ` +
        `dependencies is the whole of what this point compares the manifest against`,
      'policy',
    );
  }
  if (!Array.isArray(policy.allowed))
    fail(
      'dependencies',
      `${policySource} carries no \`allowed\` list — with that key renamed or misspelt ` +
        `every dependency of the package would read as one added by reflex, and the ` +
        `first thing anybody did about it would be to weaken this point`,
      'policy',
    );

  const KINDS = Object.values(DEPENDENCY_FIELDS);
  const allowed = new Map();
  for (const entry of policy.allowed) {
    if (
      !entry?.name ||
      !KINDS.includes(entry.kind) ||
      !String(entry.reason ?? '').trim()
    )
      fail(
        'dependencies',
        `${policySource}: \`${JSON.stringify(entry)}\` is not a \`name\` + \`kind\` ` +
          `(${KINDS.join(' / ')}) + \`reason\`. The reason is what the file exists for — ` +
          `a bare list of names records that a dependency was allowed and never why, and ` +
          `the next one is added by reading this file`,
        'policy',
      );
    allowed.set(entry.name, entry);
  }

  // npm installs from more fields than the two below. This gate reads two, so the rest
  // have to be absent rather than unexamined — a list nobody looks at is precisely the
  // road a dependency takes when nobody is looking.
  const unread = UNREAD_FIELDS.filter((field) => pkg[field]);
  if (unread.length)
    fail(
      'dependencies',
      `the manifest carries \`${unread.join('`, `')}\` — npm installs from ${
        unread.length > 1 ? 'those fields' : 'that field'
      } and this point does not read ${unread.length > 1 ? 'them' : 'it'}.\n` +
        `  Move the entries into \`dependencies\`/\`peerDependencies\`, or widen the gate deliberately.`,
      'unread-field',
    );

  const declared = new Map();
  for (const [field, kind] of Object.entries(DEPENDENCY_FIELDS))
    for (const [name, range] of Object.entries(pkg[field] ?? {}))
      declared.set(name, { field, kind, range });

  // What the package imports, by package name: a subpath is the same dependency
  // (`@angular/forms/signals` is `@angular/forms`), the package's own entrypoints are not
  // a dependency at all, and neither is a builtin.
  const packageOf = (specifier) => {
    const parts = specifier.split('/');
    return specifier.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];
  };
  const imported = new Map(); // package -> the files that import it
  for (const path of files) {
    const text = readFileSync(path, 'utf8');
    const where = relative(ROOT, path);
    for (const pattern of IMPORTS)
      for (const [, specifier] of text.matchAll(pattern)) {
        if (/^[./]/.test(specifier) || specifier.startsWith('node:')) continue;
        const name = packageOf(specifier);
        if (name === pkg.name) continue;
        if (!imported.has(name)) imported.set(name, new Set());
        imported.get(name).add(where);
      }
  }

  const undeclared = [...imported.keys()]
    .filter((name) => !declared.has(name))
    .sort();
  if (undeclared.length)
    fail(
      'dependencies',
      `${undeclared.length} package(s) are imported by the artefact and declared in no ` +
        `dependency list of its manifest:\n` +
        undeclared
          .map(
            (n) =>
              `  - ${n}  (imported in: ${[...imported.get(n)].sort().join(', ')})`,
          )
          .join('\n') +
        `\n  Here they resolve from the workspace's own node_modules; at the consumer's ` +
        `nothing brings them, and the import fails on the first render.`,
      'undeclared',
    );

  const strangers = [...declared.keys()]
    .filter((name) => !allowed.has(name))
    .sort();
  if (strangers.length)
    fail(
      'dependencies',
      `${strangers.length} declared dependency(ies) with no entry in ${policySource}:\n` +
        strangers
          .map(
            (n) =>
              `  - ${n}  (${declared.get(n).field}: ${declared.get(n).range})`,
          )
          .join('\n') +
        `\n  Nothing here says whether they are deliberate. If they are, the entry saying ` +
        `WHY is the price; if they are not, this is the reflex the requirement was written against.`,
      'not-allowed',
    );

  const misplaced = [...declared].filter(
    ([name, d]) => allowed.get(name).kind !== d.kind,
  );
  if (misplaced.length)
    fail(
      'dependencies',
      misplaced
        .map(
          ([name, d]) =>
            `\`${name}\` is allowed as \`${allowed.get(name).kind}\` and the manifest ` +
            `declares it in \`${d.field}\``,
        )
        .join('; ') +
        `.\n  The field is not a formality: a peer is the copy the consumer already has, ` +
        `and the same package under \`dependencies\` becomes a SECOND one in their tree.`,
      'wrong-kind',
    );

  const idle = [...declared.keys()]
    .filter((name) => !imported.has(name) && !allowed.get(name).unimported)
    .sort();
  if (idle.length)
    fail(
      'dependencies',
      `${idle.length} declared dependency(ies) that nothing in the package imports: ` +
        `\`${idle.join('`, `')}\`.\n` +
        `  Every consumer installs them for nothing. If one cannot be seen in the code — a ` +
        `compiler helper, a stylesheet — its policy entry says so in \`unimported\`, and ` +
        `that note is then the thing a reader can check.`,
      'unused',
    );

  const dead = [...allowed.keys()].filter((name) => !declared.has(name)).sort();
  if (dead.length)
    fail(
      'dependencies',
      `${policySource} allows \`${dead.join('`, `')}\`, and the manifest declares ` +
        `${dead.length > 1 ? 'none of them' : 'no such dependency'}.\n` +
        `  An allowance outliving its dependency is a permit for the next reflex to arrive ` +
        `under — and it reads as a decision somebody made, which by then nobody did.`,
      'dead',
    );

  // The compiler that built the package is a fact the package carries, so the peer range
  // can be measured against it rather than against a version somebody typed twice. What
  // this catches is the drift `check-consumer` writes down as its own blind spot: that
  // gate takes `@angular/*` from the workspace, so a package compiled by 22 and declaring
  // `^21.0.0` peers installs and runs there, and fails at the first consumer who takes the
  // manifest at its word. `check-support` asks a different question of the same ranges —
  // how many majors the window holds — and neither answers for the other.
  const stamps = new Set(
    files
      .filter((path) => ['.mjs', '.js'].includes(extname(path)))
      .flatMap((path) => [...readFileSync(path, 'utf8').matchAll(COMPILER)])
      .map(([, major]) => Number(major)),
  );
  if (stamps.size === 0)
    fail(
      'dependencies',
      `no \`minVersion\`/\`version\` pair anywhere in the package's code — Angular's ` +
        `partial compilation stamps the compiler's version into every declaration, so its ` +
        `absence means the shape of the output changed and the range check below has ` +
        `nothing left to compare. A missing stamp is an error for the same reason a ` +
        `missing PCT_VERSION is (point 4).`,
      'compiler-stamp',
    );
  const angular = [...declared].filter(([name]) =>
    name.startsWith('@angular/'),
  );
  for (const [name, { range }] of angular) {
    const terms = String(range)
      .split('||')
      .map((t) => t.trim());
    const unreadable = terms.filter((t) => !PEER_TERM.test(t));
    if (unreadable.length)
      fail(
        'dependencies',
        `\`${name}\`: \`${range}\` — this point reads majors out of \`^N.0.0\` terms ` +
          `joined by \`||\` and refuses to guess at \`${unreadable.join('`, `')}\`. ` +
          `Write the range in that shape, or widen both parsers deliberately ` +
          `(tools/check-support.mjs counts the same ranges).`,
        'compiler-drift',
      );
    const majors = new Set(terms.map((t) => Number(t.match(PEER_TERM)[1])));
    const missed = [...stamps].filter((major) => !majors.has(major)).sort();
    if (missed.length)
      fail(
        'dependencies',
        `\`${name}\`: \`${range}\` does not admit Angular ${missed.join(', ')}, and that ` +
          `is what compiled this package.\n` +
          `  The consumer installing by the manifest gets a framework the code was never ` +
          `built against — and the failure surfaces in their application, not here.`,
        'compiler-drift',
      );
  }

  return (
    `${THEME} present and exported, ` +
    `${used.size} used tokens covered by ${defined.size} declarations, ` +
    `PCT_VERSION = ${pkg.version}, ` +
    `${declared.size} dependencies allowed by policy against Angular ${[...stamps].join('/')}`
  );
};

/**
 * The checks over a `root` directory without ending the process — so the same code runs
 * twice: once on the real `dist`, once on every prepared package of the negative control.
 * A gate that ends the process itself could only be examined through a subprocess and an
 * exit code — that is, in a way that makes a fixture firing for the wrong reason look
 * like proof.
 */
const checkPackage = (root, { release = false } = {}) => {
  const warnings = [];
  try {
    return {
      error: null,
      warnings,
      description: checks(root, { release }, warnings),
    };
  } catch (e) {
    if (!(e instanceof PackageError)) throw e;
    return { error: e, warnings, description: null };
  }
};

/**
 * Builds a prepared package: a copy of the base, the case's files on top, the deletions
 * from `fixture.json` last. The case directory then holds NOTHING BUT the defect, rather
 * than one more copy of a correct package to hunt through — and it does not drift from the
 * base when the shape of the package changes.
 *
 * The manifest sits in the repository as `manifest.json` and becomes `package.json` only
 * here. The reason is hard: a real `package.json` in the repository tree **is a project to
 * Nx** — the graph was getting a phantom `@pacit/components` project rooted in the
 * fixtures, in three copies under the same name at that. The natural workaround
 * (`.nxignore`) fixes that and breaks something worse: the directory disappears from the
 * file map, so the target's `inputs` stop seeing it and weakening a fixture does NOT
 * invalidate the cache. The gate would then shine green from the cache having checked
 * nothing — the negative control itself would become a silent defect (`req-axis`).
 */
const buildFixture = (name, fx) => {
  const target = mkdtempSync(join(tmpdir(), 'pct-check-package-'));
  cpSync(join(FIXTURES, REFERENCE), target, { recursive: true });
  cpSync(join(FIXTURES, name), target, {
    recursive: true,
    filter: (src) => basename(src) !== 'fixture.json',
  });
  renameSync(join(target, 'manifest.json'), join(target, 'package.json'));
  for (const path of fx.drop ?? [])
    rmSync(join(target, path), { recursive: true, force: true });
  return target;
};

// ── the package ────────────────────────────────────────────────────────────────────

const RELEASE_MODE = process.argv.includes('--release');
const problems = [];

const result = checkPackage(DIST, { release: RELEASE_MODE });
if (result.error)
  problems.push(`${result.error.check}: ${result.error.message}`);
for (const o of result.warnings) console.warn(`! ${o}`);

// ── negative control ──────────────────────────────────────────────────────────

const cases = readdirSync(FIXTURES, { withFileTypes: true })
  .filter((d) => d.isDirectory() && d.name !== REFERENCE)
  .map((d) => d.name)
  .sort();

if (cases.length === 0)
  problems.push(
    `tools/check-package.fixtures: no prepared packages — a gate with no proof that it ` +
      `can fail is one more silent defect (req-quality-negative-control)`,
  );

// The reference package MUST pass, and in `--release` mode at that. Without it the whole
// control is worthless: were the base defective itself, every case would fail because of
// it and not because of its own defect — every "it fired" would be false. The base goes
// through the same composer as the cases, so it is examined in exactly the shape the
// cases grow out of.
{
  const directory = buildFixture(REFERENCE, {});
  const reference = checkPackage(directory, { release: true });
  rmSync(directory, { recursive: true, force: true });
  if (reference.error)
    problems.push(
      `${REFERENCE}: the reference package does NOT pass (${reference.error.check}) — ` +
        `every prepared package now fires because of it, not because of its own defect.\n` +
        `  ${reference.error.message}`,
    );
  else if (reference.warnings.length)
    problems.push(
      `${REFERENCE}: the reference package passes, but with a warning — the base is to be ` +
        `complete, or point 6 has nothing to tell an absence from a full set.`,
    );
}

for (const name of cases) {
  const fx = JSON.parse(
    readFileSync(join(FIXTURES, name, 'fixture.json'), 'utf8'),
  );
  const directory = buildFixture(name, fx);
  try {
    const resultFx = checkPackage(directory, { release: true });
    if (!resultFx.error)
      problems.push(
        `${name}: the prepared package PASSED and was meant not to — ` +
          `point ${fx.point} (\`${fx.check}\`) stopped examining anything`,
      );
    else if (resultFx.error.check !== fx.check)
      problems.push(
        `${name}: check \`${resultFx.error.check}\` fired, and point ${fx.point} ` +
          `(\`${fx.check}\`) was meant to — the fixture proves something other than ` +
          `what it declares`,
      );
    // The same argument one floor down, where a point has several rules under one check:
    // a case built for a dead allowance and rejected for an undeclared import passes the
    // comparison above while proving nothing about the rule it was written for.
    else if (fx.rule && resultFx.error.rule !== fx.rule)
      problems.push(
        `${name}: rule \`${resultFx.error.rule}\` of check \`${fx.check}\` fired, and ` +
          `\`${fx.rule}\` was meant to — the case is rejected for the wrong reason`,
      );

    // Point 6 is the only one with two modes, so its fixture examines both: under
    // `--release` it blocks, day to day it only warns. The "it blocks" assertion alone
    // would let through a regression in which point 6 starts blocking always — and then a
    // repository with no remote would not build at all.
    if (fx.releaseOnly) {
      const ordinary = checkPackage(directory, { release: false });
      if (ordinary.error)
        problems.push(
          `${name}: in an ordinary run the gate BLOCKS (${ordinary.error.check}) ` +
            `and was meant only to warn — blocking belongs to \`--release\``,
        );
      else if (ordinary.warnings.length === 0)
        problems.push(
          `${name}: in an ordinary run neither an error nor a warning — ` +
            `missing metadata passes without a trace`,
        );
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

// ── result ────────────────────────────────────────────────────────────────────

if (problems.length) {
  console.error(`X Package gate — ${problems.length} violations:\n`);
  for (const p of problems) console.error(`  - ${p}`);
  console.error('');
  process.exit(1);
}

console.log(
  `✓ Package complete: ${result.description}. ` +
    `Negative control: the reference package passes, ` +
    `${cases.length} prepared ones rejected on their own points.`,
);
