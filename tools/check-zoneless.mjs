#!/usr/bin/env node
/**
 * Foundation gate: has `zone.js` really left the project, and is every built component
 * OnPush? An OPTIONAL peer of `@angular/core` and somebody else's default: both promises
 * rest on nobody undoing them ([`lesson-8`](../docs/lessons.md#lesson-8), [`lesson-11`](../docs/lessons.md#lesson-11)).
 *
 *  1. no manifest in the repository declares `zone.js`,
 *  2. `package-lock.json` has none in the tree, not even nested under someone's package,
 *  3. the built package holds not one trace of the zone runtime,
 *  4. DENOMINATOR: every component from the sources is in the built package,
 *  5. every component in the package has `ɵcmp.onPush === true` and `standalone === true`,
 *  6. no `@Component` sets `changeDetection` or `standalone` explicitly.
 *
 * `ɵcmp` is read from `dist/`, not from the sources: a partially compiled declaration
 * omits a default `changeDetection`, which the linker supplies at the consumer's
 * (`lesson-36`). Point 4 is point 5's denominator. Control: `check-zoneless.fixtures/`.
 *
 * Usage: node tools/check-zoneless.mjs
 */
import { globSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, extname, join, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execSync } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PROJECT = 'libs/components';
const DIST = 'dist/libs/components';
const FIXTURES = join(ROOT, 'tools/check-zoneless.fixtures');
const REFERENCE = '_reference.json';

/** Manifest fields where `zone.js` means "it is back". */
const DEPENDENCY_FIELDS = [
  'dependencies',
  'devDependencies',
  'peerDependencies',
  'optionalDependencies',
];

/**
 * Traces of the zone runtime in the built code. Deliberately NOT `/zone/i`: a substring
 * that common hits ordinary words as well and would report an empty spot. Every pattern
 * has a name, because "something about zones" does not say what to look for.
 *
 * `NgZone` stands here beside the global `Zone`: for a library it is the same defect seen
 * from the other side — a component injecting `NgZone` relies on zones even with no
 * polyfill in the bundle, and falls over only at the consumer's.
 */
const TRACES = [
  ['import `zone.js`', /(?:from|import|require\()\s*['"]zone\.js/],
  ['injected `NgZone`', /\bNgZone\b/],
  ['`__zone_symbol__`', /__zone_symbol__/],
  [
    'global `Zone`',
    /\bZone\s*\.\s*(?:current|root|__load_patch|assertZonePatched)\b/,
  ],
];

/**
 * The component decorator in a source file. It anchors on the formatting `nx format:check`
 * enforces (`@Component({` and `})` in column zero) — and that is exactly why the number
 * of matches is compared separately against the number of plain `@Component(`. Without
 * that, a change of formatting would not break the parser but quietly SHRINK point 4's
 * denominator, with the gate still green: the very defect it stands against.
 *
 * The counter allows INDENTATION, because until 2026-08-05 it did not, and so did nothing:
 * it repeated the parser's anchor character for character, so moving a decorator by one
 * space put out both sides of the comparison at once. Measured on this repository —
 * `PctCheckbox` indented by a space gave "7 components" instead of eight and a green run,
 * so the component dropped out of the OnPush measurement without a trace (`lesson-48`).
 * A check comparing two measurements needs two INDEPENDENT ones; `[ \t]*` filters out
 * occurrences in comments, because a JSDoc line starts with an asterisk.
 */
const COMPONENT =
  /^@Component\(\{\r?\n([\s\S]*?)^\}\)\r?\n(?:export\s+)?(?:abstract\s+)?class\s+([A-Za-z_$][\w$]*)/gm;
const COMPONENT_COUNTER = /^[ \t]*@Component\(/gm;

/** Options the Angular guide forbids restating — they are defaults in v22+. */
const DEFAULT_OPTIONS = ['changeDetection', 'standalone'];

/**
 * A violation of one of the six checks. It carries the check's identifier, not just the
 * message: the negative control has to verify that a prepared input fired ON ITS OWN
 * point — a fixture failing for a reason other than the one written into it proves
 * something other than what it declares.
 */
class ZonelessError extends Error {
  constructor(check, description) {
    super(description);
    this.check = check;
  }
}

/**
 * The full set of checks over a ready input:
 *   `manifests`  — `[{ file, dependencies, … }]`,
 *   `lockPackages` — the `packages` keys of `package-lock.json`,
 *   `bundle`     — `[{ file, text }]` from the built package,
 *   `entrypoints`    — the files the `exports` map points at (the denominator for `bundle`),
 *   `sources`     — `[{ file, className, explicit }]` from `@Component` in the sources,
 *   `components` — `[{ className, entrypoint, onPush, standalone }]` from the package.
 * Throws `ZonelessError` on the first violation — the checks run from the most basic one,
 * so the later ones would have nothing to examine anyway.
 */
const checkZoneless = ({
  manifests,
  lockPackages,
  bundle,
  entrypoints,
  sources,
  components,
}) => {
  // 1. No manifest declares `zone.js`. The earliest moment it can be noticed — before
  // anyone runs `npm install`.
  const declared = manifests.flatMap((m) =>
    DEPENDENCY_FIELDS.filter(
      (field) => m[field]?.['zone.js'] !== undefined,
    ).map((field) => `${m.file} → ${field}: ${m[field]['zone.js']}`),
  );
  if (declared.length)
    throw new ZonelessError(
      'manifests',
      `\`zone.js\` is back in a manifest:\n` +
        declared.map((z) => `      ${z}`).join('\n') +
        `\n    \`req-project-angular\` asks for the package to be REMOVED, not switched ` +
        `off — its mere presence in the dependencies restores the zone-based mode at the ` +
        `first \`import 'zone.js'\`, and Angular will not say a word (lesson-8).`,
    );

  // 2. The dependency tree. A manifest is a declaration, the lock is the fact: `zone.js`
  // can arrive as somebody else's dependency, so we look for nested installations too,
  // not only for a top-level entry.
  const inTree = lockPackages.filter(
    (k) => k === 'node_modules/zone.js' || k.endsWith('/node_modules/zone.js'),
  );
  if (inTree.length)
    throw new ZonelessError(
      'lock',
      `\`zone.js\` is installed in the dependency tree:\n` +
        inTree.map((k) => `      ${k}`).join('\n') +
        `\n    It is an optional peer of \`@angular/core\`, so nothing breaks and nobody ` +
        `finds out — until someone imports it.`,
    );

  // 3. The built package. Points 1 and 2 watch the input, this one watches the output:
  // the only place that sees a trace brought in by anything other than `package.json`.
  //
  // The scan's own denominator comes first. The scan walks a directory while the list of
  // entrypoints comes from the `exports` map, a second source — so a change in the
  // ng-packagr output layout shows up as emptiness on one side of the comparison rather
  // than as a green run over nothing. Without it, a changed extension would be enough for
  // point 3 to stop reading anything, with nobody the wiser.
  const scanned = new Set(bundle.map((b) => b.file));
  const uncovered = entrypoints.filter((w) => !scanned.has(w));
  if (uncovered.length)
    throw new ZonelessError(
      'bundle',
      `the package scan missed ${uncovered.length} files the \`exports\` map points at:\n` +
        uncovered.map((w) => `      ${w}`).join('\n') +
        `\n    The rest of point 3 would run over a set without those files — that is, ` +
        `over nothing.`,
    );

  const hits = bundle.flatMap(({ file, text }) =>
    TRACES.filter(([, pattern]) => pattern.test(text)).map(
      ([name]) => `${file}: ${name}`,
    ),
  );
  if (hits.length)
    throw new ZonelessError(
      'bundle',
      `the built package holds a trace of the zone runtime:\n` +
        hits.map((t) => `      ${t}`).join('\n') +
        `\n    The consumer then gets a library that requires zones, though the package ` +
        `promises zoneless (req-api-foundation).`,
    );

  // 4. DENOMINATOR. Without this point, "every component" in point 5 means "every one
  // that happened to reach the package" — a sentence that is always true.
  if (!sources.length)
    throw new ZonelessError(
      'denominator',
      `no \`@Component\` found in the sources (${PROJECT}) — point 5 would then always ` +
        `pass, having nothing to measure. Usual cause: the decorator formatting the ` +
        `parser anchors on has changed.`,
    );

  const inPackage = new Map(components.map((k) => [k.className, k]));
  const missing = sources.filter((z) => !inPackage.has(z.className));
  if (missing.length)
    throw new ZonelessError(
      'denominator',
      `${missing.length} components from the sources are not in the built package:\n` +
        missing.map((z) => `      ${z.className}  (${z.file})`).join('\n') +
        `\n    Point 5 would be computed WITHOUT them, so it says nothing about their ` +
        `change detection strategy. Remedy: export from the entrypoint's \`index.ts\`.`,
    );

  // 5. The measurement. `standalone` travels with `onPush`, because `req-api-foundation`
  // promises both and both are Angular v22+ defaults — promises of the same class.
  const faulty = components.filter(
    (k) => k.onPush !== true || k.standalone !== true,
  );
  if (faulty.length)
    throw new ZonelessError(
      'onpush',
      `${faulty.length} components in the package do not meet the foundation:\n` +
        faulty
          .map(
            (k) =>
              `      ${k.className} (${k.entrypoint}): onPush=${k.onPush}, standalone=${k.standalone}`,
          )
          .join('\n') +
        `\n    Either somebody set \`ChangeDetectionStrategy.Default\` explicitly, or ` +
        `Angular's defaults changed — either way the promise stopped being true.`,
    );

  // 6. Explicitness. The other side of the same rule: since the measurement watches the
  // VALUE, the source is not to restate the defaults (`lesson-11`). Without this point the
  // only guard over the notation would be code review.
  const explicit = sources.filter((z) => z.explicit?.length);
  if (explicit.length)
    throw new ZonelessError(
      'explicitness',
      `${explicit.length} components explicitly set an option that is the default:\n` +
        explicit
          .map(
            (z) => `      ${z.className} (${z.file}): ${z.explicit.join(', ')}`,
          )
          .join('\n') +
        `\n    The Angular guide forbids restating them in v22+ (req-api-foundation). ` +
        `Remove the entry from the decorator — the value is the same either way.`,
    );

  return (
    `${manifests.length} manifests and ${lockPackages.length} locked packages free of \`zone.js\`, ` +
    `${bundle.length} package files with no trace of zones, ` +
    `${sources.length} components from the sources present in the package and all OnPush`
  );
};

// ── input from disk ───────────────────────────────────────────────────────────

const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');

/**
 * Manifests from the git index rather than from a hard-coded list: a new project is to be
 * covered by this gate from its first commit, with nobody having to remember to add it
 * here. The target's `inputs` name the same set with a pattern covering every
 * `package.json`.
 */
const repoManifests = () =>
  execSync('git ls-files', { cwd: ROOT, encoding: 'utf8' })
    .split('\n')
    // Exactly `package.json`, not "anything ending the same way": the pathspec
    // `*package.json` also pulls in `ng-package.json`, ng-packagr's configuration. That
    // one has no dependency fields, so it would give no false hit — but it would inflate
    // the denominator in the message and lie about the gate's reach on first reading.
    .filter((file) => file === 'package.json' || file.endsWith('/package.json'))
    .map((file) => ({ file, ...JSON.parse(read(file)) }));

const lockPackages = () =>
  Object.keys(JSON.parse(read('package-lock.json')).packages ?? {});

/**
 * The package's executable outputs. Source maps stay out of the set by themselves
 * (`.mjs.map` has the `.map` extension) and that is intended: they carry a copy of the
 * SOURCE, so a comment about zones would give a hit there that is not in the code.
 */
const CODE = new Set(['.mjs', '.js', '.cjs']);

const packageFiles = (dir, out = []) => {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) packageFiles(path, out);
    else if (CODE.has(extname(name))) out.push(path);
  }
  return out;
};

const packageBundle = () => {
  let paths;
  try {
    paths = packageFiles(join(ROOT, DIST));
  } catch {
    throw new ZonelessError(
      'bundle',
      `no built package in ${DIST} — run \`nx build components\` first`,
    );
  }
  return paths.map((s) => ({
    file: relative(join(ROOT, DIST), s).split('\\').join('/'),
    text: readFileSync(s, 'utf8'),
  }));
};

/**
 * Components from the sources. The parser is simple, but its denominator is watched: the
 * number of parsed decorators has to match the number of `@Component(` occurrences at the
 * start of a line. A drift fires point 4 with a clear cause instead of quietly shrinking
 * the set of examined components.
 */
const componentSources = () => {
  const out = [];
  let declarations = 0;

  for (const file of globSync(`${PROJECT}/*/src/**/*.ts`, {
    cwd: ROOT,
  }).sort()) {
    if (file.endsWith('.spec.ts')) continue;
    const text = read(file);
    declarations += (text.match(COMPONENT_COUNTER) ?? []).length;
    for (const [, body, className] of text.matchAll(COMPONENT))
      out.push({
        file: file.split('\\').join('/'),
        className,
        explicit: DEFAULT_OPTIONS.filter((option) =>
          new RegExp(`^\\s{2}${option}\\s*:`, 'm').test(body),
        ),
      });
  }

  if (out.length !== declarations)
    throw new ZonelessError(
      'denominator',
      `the parser recognised ${out.length} of ${declarations} \`@Component\` decorators — ` +
        `the rest would drop out of the measurement without a trace. Usual cause: a ` +
        `decorator written otherwise than prettier formats it (\`@Component({\` and ` +
        `\`})\` in column zero).`,
    );

  return out;
};

/**
 * The package's entrypoints by the `exports` map — `[{ entrypoint, file }]`. One source for
 * two things at once: point 3's scan denominator and point 5's list of modules to load.
 */
const packageEntrypoints = () =>
  Object.entries(JSON.parse(read(`${DIST}/package.json`)).exports ?? {})
    .map(([entrypoint, target]) => ({
      entrypoint,
      file: typeof target === 'object' ? target.default : target,
    }))
    .filter(({ file }) => typeof file === 'string' && file.endsWith('.mjs'))
    .map(({ entrypoint, file }) => ({
      entrypoint,
      file: file.replace(/^\.\//, ''),
    }));

/**
 * Component definitions from the BUILT package. `@angular/compiler` is loaded first,
 * because the package is partially compiled and `ɵcmp` appears only on access — the same
 * step the linker performs at the consumer's.
 */
const packageComponents = async (entrypoints) => {
  await import('@angular/compiler');
  const out = [];

  for (const { entrypoint, file } of entrypoints) {
    const module = await import(pathToFileURL(join(ROOT, DIST, file)).href);
    for (const [name, value] of Object.entries(module)) {
      if (typeof value !== 'function') continue;
      if (!Object.getOwnPropertyDescriptor(value, 'ɵcmp')) continue;
      const def = value['ɵcmp'];
      out.push({
        className: name,
        entrypoint,
        onPush: def.onPush,
        standalone: def.standalone,
      });
    }
  }
  return out;
};

// ── negative control ──────────────────────────────────────────────────────────

const readFixture = (name) =>
  JSON.parse(readFileSync(join(FIXTURES, name), 'utf8'));

/**
 * Builds a case's input ON A COPY of the reference one, so the case file holds nothing
 * but its own defect — you cannot break something in passing and not notice.
 */
const buildFixture = (fx) => {
  const reference = readFixture(REFERENCE);
  const input = structuredClone({
    manifests: reference.manifests,
    lockPackages: reference.lockPackages,
    bundle: reference.bundle,
    entrypoints: reference.entrypoints,
    sources: reference.sources,
    components: reference.components,
  });

  if (fx.addDependency) {
    const { file, field, version } = fx.addDependency;
    const manifest = input.manifests.find((m) => m.file === file);
    manifest[field] = { ...manifest[field], 'zone.js': version };
  }
  input.lockPackages.push(...(fx.addToLock ?? []));
  if (fx.addToBundle) input.bundle[0].text += `\n${fx.addToBundle}\n`;
  if (fx.clearBundle) input.bundle = [];
  if (fx.clearSources) input.sources = [];
  input.components = input.components.filter(
    (k) => !(fx.dropFromPackage ?? []).includes(k.className),
  );
  for (const k of input.components) {
    if (fx.onPush?.[k.className] !== undefined)
      k.onPush = fx.onPush[k.className];
    if (fx.standalone?.[k.className] !== undefined)
      k.standalone = fx.standalone[k.className];
  }
  for (const z of input.sources)
    if (fx.explicit?.[z.className]) z.explicit = fx.explicit[z.className];

  return input;
};

// ── the run ───────────────────────────────────────────────────────────────────

const problems = [];
let summary = null;

try {
  const entrypoints = packageEntrypoints();
  summary = checkZoneless({
    manifests: repoManifests(),
    lockPackages: lockPackages(),
    bundle: packageBundle(),
    entrypoints: entrypoints.map((w) => w.file),
    sources: componentSources(),
    components: await packageComponents(entrypoints),
  });
} catch (error) {
  if (!(error instanceof ZonelessError)) throw error;
  problems.push(`${error.check}: ${error.message}`);
}

const cases = readdirSync(FIXTURES)
  .filter((n) => n.endsWith('.json') && n !== REFERENCE)
  .sort();

if (cases.length === 0)
  problems.push(
    `tools/check-zoneless.fixtures: no prepared inputs — a gate with no proof that it can ` +
      `fail is one more silent defect (req-quality-negative-control)`,
  );

// The reference input MUST pass. Were it defective itself, every case would fire
// because of it and not because of its own defect — every "it fired" would be false.
try {
  checkZoneless(buildFixture({}));
} catch (error) {
  if (!(error instanceof ZonelessError)) throw error;
  problems.push(
    `${REFERENCE}: the reference input does NOT pass (${error.check}) — ` +
      `every prepared case now fires because of it.\n    ${error.message}`,
  );
}

for (const name of cases) {
  const fx = readFixture(name);
  try {
    checkZoneless(buildFixture(fx));
    problems.push(
      `${name}: the prepared input PASSED and was meant not to — ` +
        `point ${fx.point} (\`${fx.check}\`) stopped examining anything`,
    );
  } catch (error) {
    if (!(error instanceof ZonelessError)) throw error;
    if (error.check !== fx.check)
      problems.push(
        `${name}: check \`${error.check}\` fired, and point ${fx.point} ` +
          `(\`${fx.check}\`) was meant to — the fixture proves something other than what it declares`,
      );
  }
}

// ── result ────────────────────────────────────────────────────────────────────

if (problems.length) {
  console.error(`X Foundation gate — ${problems.length} violations:\n`);
  for (const p of problems) console.error(`  - ${p}`);
  console.error('');
  process.exit(1);
}

console.log(
  `✓ Foundation: ${summary}. Negative control: the reference input passes, ` +
    `${cases.length} prepared ones rejected on their own points.`,
);
