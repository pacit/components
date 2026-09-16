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
 *  7. the dependency lists: nothing forbidden is imported, declared or permitted, every
 *     declared name is deliberate, everything the code imports is declared, and the
 *     `@angular/*` ranges admit the compiler that built the package,
 *  8. no animation binding in the packed templates — the road to a runtime that leaves no
 *     dependency behind to find (`req-api-animations`),
 *  9. every citation in the shipped types and bundles is an address on the site: no
 *     repository path, no bare `req-*` / `lesson-*`, no foreign host, and not zero of them
 *     (`req-release-metadata`; the rewrite is `link-citations.mjs`, decision 0078).
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
import { basename, dirname, extname, join, relative, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const DIST = join(HERE, '../../dist/libs/components');
const CNAME = join(HERE, '../../apps/docs/public/CNAME');
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

/**
 * The runtime this library refuses (`req-api-animations`): animation here is CSS and the
 * Web Animations API, and `@angular/animations` is a weight no consumer of a control
 * library agreed to carry.
 *
 * The ban is written in the gate and not in `dependencies.policy.json` on purpose. That
 * file is a list of PERMITS — every entry says why a dependency is deliberate — and a
 * refusal standing among permits is one word's edit away from being a permit itself,
 * written by the same hand, in the same commit, for the same reason.
 *
 * The entries are SPECIFIERS rather than package names, because one runtime arrives under
 * several: `@angular/animations` with its `browser` subpath, and
 * `@angular/platform-browser/animations`, a subpath of a package whose name says nothing
 * about animation at all — a ban on names alone would read the second one as
 * `@angular/platform-browser` and let it through the day that package is declared for a
 * reason of its own.
 */
const FORBIDDEN = [
  {
    specifier: '@angular/animations',
    reason:
      'the animation runtime itself, plus its `browser` driver — a dependency for what ' +
      '`transition`, `@keyframes` and `Element.animate()` already do',
  },
  {
    specifier: '@angular/platform-browser/animations',
    reason:
      '`provideAnimations()`, `BrowserAnimationsModule` and the async variant — the same ' +
      'runtime, reached through a package a library never needs and an application ' +
      'always has',
  },
];

/** The banned entry a specifier falls under, subpaths included, or `undefined`. */
const forbids = (specifier) =>
  FORBIDDEN.find(
    (entry) =>
      specifier === entry.specifier ||
      specifier.startsWith(`${entry.specifier}/`),
  );

/**
 * An animation binding in the packed code — the road to the same runtime that leaves no
 * dependency behind at all. Measured rather than assumed ([`lesson-87`](../../docs/lessons.md#lesson-87)):
 * all four shapes compile under `strictTemplates` with `@angular/animations` not even
 * installed, and the emitted file imports nothing but `@angular/core`.
 *
 * The first two are what a template carries into the artefact: ng-packagr emits partial
 * declarations, so a component's template travels as a STRING and its bindings are visible
 * as text. The third is the same pair written in the decorator's `host`, which the
 * declaration carries as an object with `@`-prefixed keys. The fourth is the full
 * compilation's output — not what this package holds today, and the day it does the rule
 * is to keep reading rather than to go quiet.
 *
 * Each pattern is anchored on the punctuation of a BINDING (`[@name]`, `(@name.done)`),
 * never on a bare `@`: a template is full of `@if`, `@for` and `@let`, and the package's
 * own prose holds `(@pacit/components)`.
 */
const SYNTHETIC = [
  { what: 'a property binding', pattern: /\[@[A-Za-z_.][\w.-]*\]/g },
  {
    what: 'a callback binding',
    pattern: /\(@[A-Za-z_][\w.-]*\.(?:start|done)\)/g,
  },
  {
    what: 'a host binding',
    pattern: /(?:properties|listeners)\s*:\s*\{[^{}]*["']@[\w.-]+["']/g,
  },
  {
    what: 'a compiled binding',
    pattern:
      /\u0275\u0275synthetic(?:Host)?(?:Property|Listener)|\u0275\u0275(?:property|listener)\(\s*["']@/g,
  },
];

/**
 * A component declaration in the packed code, in either compilation mode. It is point 8's
 * DENOMINATOR: the patterns above read templates, and a package whose templates stopped
 * being visible to them — a change of compilation mode, a bundler that inlines them
 * differently — would leave the point examining nothing and reporting green
 * ([`lesson-48`](../../docs/lessons.md#lesson-48)).
 */
const DECLARATION = /\u0275\u0275(?:ngDeclare|define)Component/g;

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
 * A violation of one of the nine checks. It carries the check's identifier and not just
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
  const specifiers = new Map(); // the specifier as written -> the same files
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
        if (!specifiers.has(specifier)) specifiers.set(specifier, new Set());
        specifiers.get(specifier).add(where);
      }
  }

  // The ban comes first among the rules of this point, and the order is the rule
  // ([`req-api-animations`](../../docs/requirements/api.md#req-api-animations)). Every
  // rule below asks whether a dependency was DELIBERATE, and each of them advises the
  // road to make it so: an undeclared import is answered with "declare it", a declared
  // name with "write down why". Walked in that order a maintainer would be led by this
  // gate, in two green commits, to exactly the dependency the requirement forbids — and
  // the third refusal would read as the gate changing its mind.
  const banned = [
    ...[...specifiers.keys()].flatMap((specifier) => {
      const entry = forbids(specifier);
      return entry
        ? [
            `imported as \`${specifier}\` in ${[...specifiers.get(specifier)]
              .sort()
              .join(', ')} — ${entry.reason}`,
          ]
        : [];
    }),
    ...[...declared.keys()].flatMap((name) => {
      const entry = forbids(name);
      return entry
        ? [
            `declared in \`${declared.get(name).field}\` as \`${name}\`: \`${
              declared.get(name).range
            }\` — ${entry.reason}`,
          ]
        : [];
    }),
    ...[...allowed.keys()].flatMap((name) => {
      const entry = forbids(name);
      return entry
        ? [
            `permitted by ${policySource}, with a reason written beside it — ` +
              `${entry.reason}`,
          ]
        : [];
    }),
  ];
  if (banned.length)
    fail(
      'dependencies',
      `${banned.length} appearance(s) of a runtime this library does not use:\n` +
        banned.map((line) => `  - ${line}`).join('\n') +
        `\n  This one is not a dependency to argue for: no entry in the policy makes it ` +
        `deliberate, because the promise is that a consumer of a control library never ` +
        `installs an animation engine. Animation here is CSS and the Web Animations API.`,
      'forbidden',
    );

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

  // 8. The same runtime, reached with no dependency to show for it. An animation binding
  // needs no import: `[@fade]`, `(@fade.done)` and the pair of them on a host all compile
  // with `@angular/animations` absent from the workspace, and the emitted file imports
  // `@angular/core` and nothing else ([`lesson-87`](../../docs/lessons.md#lesson-87)). Point
  // 7 therefore cannot see this road at all — it reads manifests, policies and imports, and
  // here there is none of the three.
  //
  // What the consumer gets is worse than a dependency they can see: in dev mode Angular's
  // renderer throws NG5105 (`Unexpected synthetic property @fade found`) and advises adding
  // `provideAnimations()`, that is, it asks the consumer to install the package this
  // library refused to declare; in production the same code writes the value onto a DOM
  // property called `@fade`, and the animation simply never happens — silently, in an
  // application nobody here will ever run.
  const declarations = files
    .map((path) => [...readFileSync(path, 'utf8').matchAll(DECLARATION)].length)
    .reduce((sum, n) => sum + n, 0);
  if (declarations === 0)
    fail(
      'animations',
      `no component declaration anywhere in the package — the rule below reads templates ` +
        `out of the declarations Angular's compilation leaves behind, so with none of them ` +
        `found it examines nothing and reports green.\n` +
        `  Either the package stopped carrying components, or the shape of the output ` +
        `changed and the patterns have to follow it.`,
      'declarations',
    );

  const bindings = [];
  for (const path of files) {
    const text = readFileSync(path, 'utf8');
    for (const { what, pattern } of SYNTHETIC)
      for (const [match] of text.matchAll(pattern))
        bindings.push(`${relative(ROOT, path)}: ${what} \`${match.trim()}\``);
  }
  if (bindings.length)
    fail(
      'animations',
      `${bindings.length} animation binding(s) in the packed code:\n` +
        bindings.map((line) => `  - ${line}`).join('\n') +
        `\n  A binding like this brings the animation runtime into the consumer's ` +
        `application without any dependency of ours saying so: NG5105 in their dev build, ` +
        `and in production a DOM property whose name begins with \`@\`, set on an element ` +
        `that has no such thing, where it does nothing at all. An enter/leave transition ` +
        `here is CSS or \`Element.animate()\`, ` +
        `with its duration on the motion axis (req-a11y-motion).`,
      'binding',
    );

  // 9. Every citation in the shipped JSDoc is an address that answers. The sources cite a
  // requirement, a lesson or a decision by repository path, which reads in this tree and
  // nowhere else — in a consumer's node_modules `../../../../docs/…` is nobody's file, and a
  // bare `(req-a11y-built-in)` is a word. `link-citations.mjs` rewrites them onto the site
  // after the build (decision 0078: the origin has one home, `apps/docs/public/CNAME`);
  // this point reads the artefact for what escaped it, and refuses a reading of nothing
  // the way point 8 does — the types stopping to ship, or the shape moving under the
  // patterns, must not come back green.
  const origin = `https://${readFileSync(CNAME, 'utf8').trim()}/`;
  const cited = files.filter(
    (p) =>
      (p.includes(`${sep}types${sep}`) && p.endsWith('.d.ts')) ||
      (p.includes(`${sep}fesm2022${sep}`) && p.endsWith('.mjs')),
  );
  const CITATION = {
    relative: /\]\((?:\.\.\/)+docs\/[^)\s]*\)/g,
    bare: /(?<![[`#/\w-])(?:req|lesson)-[a-z0-9-]+(?![\w-])|(?<!\[)`(?:req|lesson)-[a-z0-9-]+`(?!\]\()/g,
    link: /\]\((https?:\/\/[^)\s]+)\)/g,
  };
  const escaped = { relative: [], bare: [], host: [] };
  let citations = 0;
  for (const path of cited) {
    const text = readFileSync(path, 'utf8');
    const where = relative(ROOT, path);
    for (const [m] of text.matchAll(CITATION.relative))
      escaped.relative.push(`${where}: \`${m}\``);
    for (const [m] of text.matchAll(CITATION.bare))
      escaped.bare.push(`${where}: \`${m}\``);
    for (const [, href] of text.matchAll(CITATION.link)) {
      if (!/\/trust\/#|\/components\//.test(href)) continue;
      citations += 1;
      if (!href.startsWith(origin)) escaped.host.push(`${where}: \`${href}\``);
    }
  }
  const list = (items) =>
    items
      .slice(0, 12)
      .map((line) => `  - ${line}`)
      .join('\n');
  if (escaped.relative.length)
    fail(
      'citations',
      `${escaped.relative.length} citation(s) by repository path in the shipped JSDoc:\n` +
        list(escaped.relative) +
        `\n  A path into this tree is nobody's file in a consumer's node_modules. ` +
        `\`nx citations components\` rewrites it onto the site; a shape it does not know ` +
        `is taught there, not shipped.`,
      'relative',
    );
  if (escaped.bare.length)
    fail(
      'citations',
      `${escaped.bare.length} bare identifier(s) in the shipped JSDoc:\n` +
        list(escaped.bare) +
        `\n  To the maintainer a citation, to the consumer a word. The site renders an ` +
        `anchor for every requirement and lesson; \`nx citations components\` links them.`,
      'bare',
    );
  if (escaped.host.length)
    fail(
      'citations',
      `${escaped.host.length} citation(s) pointing off the site:\n` +
        list(escaped.host) +
        `\n  The origin has one home, apps/docs/public/CNAME (${origin}); a citation ` +
        `carrying another host was written by hand somewhere the rewrite does not reach.`,
      'host',
    );
  if (citations === 0)
    fail(
      'citations',
      `no citation of the site anywhere in the shipped types or bundles — the real package ` +
        `carries some two hundred. Either the types stopped shipping, or the shape of the ` +
        `output moved under the patterns above, and a point that examines nothing must not ` +
        `report green.`,
      'none',
    );

  return (
    `${THEME} present and exported, ` +
    `${used.size} used tokens covered by ${defined.size} declarations, ` +
    `PCT_VERSION = ${pkg.version}, ` +
    `${declared.size} dependencies allowed by policy against Angular ${[...stamps].join('/')}, ` +
    `${declarations} component declarations with no animation binding, ` +
    `${citations} citations resolving on the site`
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
