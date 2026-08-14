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
 *  6. the manifest has the metadata publishing needs (a warning; `--release` blocks).
 *
 * Point 3 is the one that catches the regression — an empty file passes 1 and 2 as well.
 * Negative control: `tools/check-package.fixtures/` (`req-quality-negative-control`).
 *
 * Usage: node libs/components/check-package.mjs [--release]  (--release: point 6 blocks)
 */
import {
  cpSync,
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
 * A violation of one of the six checks. It carries the check's identifier and not just
 * the message, because the negative control has to verify that a prepared package fired
 * ON ITS OWN point: a fixture failing for a reason other than the one in `fixture.json`
 * proves something other than what it declares — the same silent defect this whole gate
 * stands against.
 */
class PackageError extends Error {
  constructor(check, description) {
    super(description);
    this.check = check;
  }
}

/**
 * The full set of checks over the `ROOT` directory. Throws `PackageError` on the first
 * violation — the checks run from the most basic one, so the later ones would have
 * nothing to examine anyway. Returns a summary sentence.
 */
const checks = (ROOT, { release }, warnings) => {
  const fail = (check, msg) => {
    throw new PackageError(check, msg);
  };

  let files;
  try {
    files = walk(ROOT);
  } catch {
    fail(
      'pakiet',
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
      'pakiet',
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
  // with „Collection not found", and the library looks broken at the first command
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
  // and the Apache-2.0 text contain the word LIMITED, with „MIT" sitting inside it as a
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

  return (
    `${THEME} present and exported, ` +
    `${used.size} used tokens covered by ${defined.size} declarations, ` +
    `PCT_VERSION = ${pkg.version}`
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
  const cel = mkdtempSync(join(tmpdir(), 'pct-check-package-'));
  cpSync(join(FIXTURES, REFERENCE), cel, { recursive: true });
  cpSync(join(FIXTURES, name), cel, {
    recursive: true,
    filter: (src) => basename(src) !== 'fixture.json',
  });
  renameSync(join(cel, 'manifest.json'), join(cel, 'package.json'));
  for (const path of fx.drop ?? [])
    rmSync(join(cel, path), { recursive: true, force: true });
  return cel;
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
// it and not because of its own defect — every „it fired" would be false. The base goes
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
    const wynikFx = checkPackage(directory, { release: true });
    if (!wynikFx.error)
      problems.push(
        `${name}: the prepared package PASSED and was meant not to — ` +
          `point ${fx.point} (\`${fx.check}\`) stopped examining anything`,
      );
    else if (wynikFx.error.check !== fx.check)
      problems.push(
        `${name}: check \`${wynikFx.error.check}\` fired, and point ${fx.point} ` +
          `(\`${fx.check}\`) was meant to — the fixture proves something other than ` +
          `what it declares`,
      );

    // Point 6 is the only one with two modes, so its fixture examines both: under
    // `--release` it blocks, day to day it only warns. The „it blocks" assertion alone
    // would let through a regression in which point 6 starts blocking always — and then a
    // repository with no remote would not build at all.
    if (fx.releaseOnly) {
      const zwykly = checkPackage(directory, { release: false });
      if (zwykly.error)
        problems.push(
          `${name}: in an ordinary run the gate BLOCKS (${zwykly.error.check}) ` +
            `and was meant only to warn — blocking belongs to \`--release\``,
        );
      else if (zwykly.warnings.length === 0)
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
