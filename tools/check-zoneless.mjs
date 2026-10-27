#!/usr/bin/env node
/**
 * Foundation gate: has `zone.js` really left the project, and is every built component
 * OnPush? An OPTIONAL peer of `@angular/core` and somebody else's default: both promises
 * rest on nobody undoing them ([`lesson-8`](../docs/lessons.md#lesson-8), [`lesson-11`](../docs/lessons.md#lesson-11)).
 *
 *  1. no manifest in the repository declares `zone.js`,
 *  2. `package-lock.json` has none in the tree, not even nested under someone's package,
 *  3. the built package holds not one trace of the zone runtime,
 *  4. DENOMINATOR: every component from the sources is exported by its own entrypoint,
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

import { COMPONENT_ONLY, decoratorsOf } from './decorators.mjs';
import { runnerControl } from './runner-control.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PROJECT = 'libs/components';
const DIST = 'dist/libs/components';
const FIXTURES = join(ROOT, 'tools/check-zoneless.fixtures');
const REFERENCE = '_reference.json';
const RUNNER = '_runner.json';

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
 * enforces (`@Component({` and `})` in column zero) — and that is exactly why what it reads
 * is held separately against a count of the decorators taken another way. Without that, a
 * change of formatting would not break the pattern but quietly SHRINK point 4's denominator,
 * with the gate still green: the very defect it stands against.
 *
 * The counter allowed INDENTATION from 2026-08-05, because until then it did not, and so did
 * nothing: it repeated the pattern's anchor character for character, so moving a decorator by
 * one space put out both sides of the comparison at once. Measured on this repository —
 * `PctCheckbox` indented by a space gave "7 components" instead of eight and a green run,
 * so the component dropped out of the OnPush measurement without a trace (`lesson-48`).
 * A check comparing two measurements needs two INDEPENDENT ones.
 *
 * The counter is the TypeScript parser's now, every `@Component` decorator at any depth of a file
 * (`decoratorsOf`, `decorators.mjs`), and the options point 6 reads are read off the decorator's
 * metadata as ngc reads it. A counter from the start of a line past indentation stood here, and
 * a decorator behind a comment on its line, which prettier keeps, or imported under another name
 * was a component neither side saw; a pattern read `changeDetection:` off the text, and the
 * option written by shorthand, under a quoted key or an escaped name passed point 6 (measured).
 */
const COMPONENT =
  /^@Component\(\{\r?\n([\s\S]*?)^\}\)\r?\n(?:export\s+)?(?:abstract\s+)?class\s+([A-Za-z_$][\w$]*)/gm;

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
 *   `sources`     — `[{ file, content }]`, the library's source files, read by `readSources`,
 *   `modules`    — `[{ entrypoint, module }]`, the namespace each entrypoint of the package
 *                  exports (built of plain classes in a case, read by the same `componentsOf`).
 * Throws `ZonelessError` on the first violation — the checks run from the most basic one,
 * so the later ones would have nothing to examine anyway.
 */
const checkZoneless = ({
  manifests,
  lockPackages,
  bundle,
  entrypoints,
  sources,
  modules,
}) => {
  const components = componentsOf(modules);

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
  const { found, declarations, unseen, unparsed, renamed } =
    readSources(sources);
  // The options point 6 reads are read off the metadata the parser holds for the decorator where
  // the pattern read its `@`, on a class at the top level of the file. Where it holds none — a
  // comment above a class decorated otherwise, or a class inside a namespace or a function written
  // in column zero — or holds metadata ngc refuses (`{ … } satisfies { … }`, NG1001), there is no
  // component's metadata to read them off.
  if (unparsed.length)
    throw new ZonelessError(
      'denominator',
      `${unparsed.length} decorators stand where the TypeScript parser holds no decorator ` +
        `called with an object literal:\n` +
        unparsed.map((z) => `      ${z}`).join('\n') +
        `\n    A decorator in a comment above a class decorated otherwise, one on a class ` +
        `below the top level of the file (inside a namespace or a function) written in ` +
        `column zero, or metadata that is no object literal once an \`as\` is off, which ` +
        `ngc refuses as well: no point ` +
        `below may read it as a component.`,
    );

  // A decorator under a name of the file's own is one neither the pattern nor the counter sees,
  // so the count below agrees without it, and the component is measured by no point.
  if (renamed.length)
    throw new ZonelessError(
      'denominator',
      `${renamed.length} imports take \`Component\` from \`@angular/core\` under another ` +
        `name:\n` +
        renamed.map((z) => `      ${z}`).join('\n') +
        `\n    The pattern and the counter know a decorator by \`@Component(\`, and ngc by ` +
        `the import: a component decorated so compiles, and drops out of points 4 to 6. ` +
        `Import it under its own name.`,
    );

  if (unseen.length)
    throw new ZonelessError(
      'denominator',
      `the pattern read ${found.length} of the ${declarations} \`@Component\` ` +
        `decorators the TypeScript parser holds, and not these:\n` +
        unseen.map((z) => `      ${z}`).join('\n') +
        `\n    They would drop out of the measurement without a trace. Usual cause: a ` +
        `decorator written otherwise than prettier formats it (\`@Component({\` and ` +
        `\`})\` in column zero): indented, inside a namespace or a function, behind a ` +
        `comment on its line, or above \`export default class\`, which the pattern does not ` +
        `take for a class.`,
    );

  // The empty set after the reasons a read can come up short, each of which names its cause.
  if (!found.length)
    throw new ZonelessError(
      'denominator',
      `no \`@Component\` found in the sources (${PROJECT}) — point 5 would then always ` +
        `pass, having nothing to measure. Usual cause: the list of source files stopped ` +
        `returning anything.`,
    );

  // A component pairs with the class its OWN entrypoint exports under the component's own name.
  // An entrypoint is a module of its own, named after the directory it is built from; every one
  // here sits a level under `libs/components`, where the source scan (`*/src/**`) reads. The
  // class's own name, not the key it is exported under, since `export { PctChip as PctButton }`
  // is not `PctButton`. And one to one: an entrypoint exporting two classes of the name gives no
  // pair, and a class is one class however many entrypoints export it, so two components paired
  // with it (two of one name in one entrypoint, or a namesake re-exported from another) are
  // refused — point 5 would measure the rest by its `ɵcmp`.
  const entrypointOf = (z) =>
    `./${z.file.slice(PROJECT.length + 1).split('/')[0]}`;
  const pairsOf = (z) => [
    ...new Set(
      components
        .filter(
          (k) =>
            k.entrypoint === entrypointOf(z) && k.className === z.className,
        )
        .map((k) => k.class),
    ),
  ];
  const missing = found.filter((z) => pairsOf(z).length === 0);
  if (missing.length)
    throw new ZonelessError(
      'denominator',
      `${missing.length} components from the sources are not exported by their entrypoint:\n` +
        missing
          .map((z) => {
            const under = components.find(
              (k) =>
                k.entrypoint === entrypointOf(z) &&
                k.exportedAs === z.className,
            );
            return (
              `      ${z.className} from ${entrypointOf(z)}  (${z.file})` +
              (under
                ? ` — the entrypoint exports \`${under.className}\` under that name`
                : '')
            );
          })
          .join('\n') +
        `\n    Point 5 would be computed WITHOUT them, so it says nothing about their ` +
        `change detection strategy. Remedy: export from the entrypoint's \`index.ts\`.`,
    );

  const ambiguous = found.filter((z) => pairsOf(z).length > 1);
  if (ambiguous.length)
    throw new ZonelessError(
      'denominator',
      `${ambiguous.length} components share their name with another class their entrypoint exports:\n` +
        ambiguous
          .map(
            (z) =>
              `      ${z.className} from ${entrypointOf(z)}  (${z.file}): ` +
              `${pairsOf(z).length} classes of that name`,
          )
          .join('\n') +
        `\n    The package keeps no file, so nothing says which of them is the component. ` +
        `Rename one.`,
    );

  const exporters = (c) => [
    ...new Set(
      components.filter((k) => k.class === c).map((k) => k.entrypoint),
    ),
  ];
  const shared = [...Map.groupBy(found, (z) => pairsOf(z)[0])].filter(
    ([, paired]) => paired.length > 1,
  );
  if (shared.length)
    throw new ZonelessError(
      'denominator',
      `${shared.length} classes in the package are paired with more than one component:\n` +
        shared
          .map(
            ([c, paired]) =>
              `      ${c.name} (${exporters(c).join(', ')}): ` +
              paired.map((z) => z.file).join(', '),
          )
          .join('\n') +
        `\n    A class is one class however many entrypoints export it, so point 5 would ` +
        `measure all of them by its \`ɵcmp\`. Rename one.`,
    );

  // 5. The measurement. `standalone` travels with `onPush`, because `req-api-foundation`
  // promises both and both are Angular v22+ defaults — promises of the same class. A class
  // exported under two keys or by two entrypoints is one class, and is counted once.
  const faulty = [
    ...Map.groupBy(
      components.filter((k) => k.onPush !== true || k.standalone !== true),
      (k) => k.class,
    ).values(),
  ].map(([k]) => k);
  if (faulty.length)
    throw new ZonelessError(
      'onpush',
      `${faulty.length} components in the package do not meet the foundation:\n` +
        faulty
          .map(
            (k) =>
              `      ${k.className} (${exporters(k.class).join(', ')}): onPush=${k.onPush}, standalone=${k.standalone}`,
          )
          .join('\n') +
        `\n    Either somebody set \`ChangeDetectionStrategy.Default\` explicitly, or ` +
        `Angular's defaults changed — either way the promise stopped being true.`,
    );

  // 6. Explicitness. The other side of the same rule: since the measurement watches the
  // VALUE, the source is not to restate the defaults (`lesson-11`). Without this point the
  // only guard over the notation would be code review.
  const explicit = found.filter((z) => z.explicit.length);
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
    `${found.length} components from the sources exported by their own entrypoints and all OnPush`
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
 * Components from the sources — `found`, `[{ file, className, explicit }]` — and what point 4
 * holds that read to: the decorators the parser counts (`declarations`) and each of them the
 * pattern did not read (`unseen`), the ones the pattern read where the parser holds no metadata
 * (`unparsed`), and the imports taking `Component` under another name (`renamed`). The same
 * reader for the repository and for a prepared input, which hands it source text: a case states
 * its defect in the shape the sources carry it, and the reader is what the control exercises.
 */
const readSources = (sources) => {
  const out = [];
  const unseen = [];
  const unparsed = [];
  const renamed = [];
  let declarations = 0;
  for (const { file, content } of sources) {
    const decorators = decoratorsOf(file, content, COMPONENT_ONLY);
    declarations += decorators.declared;
    for (const name of decorators.renamed) renamed.push(`${file}: ${name}`);
    for (const match of content.matchAll(COMPONENT)) {
      const [, , className] = match;
      const metadata = decorators.read(match.index);
      if (!metadata) {
        unparsed.push(`${file}: ${className}`);
        continue;
      }
      out.push({
        file,
        className,
        explicit: DEFAULT_OPTIONS.filter((option) => metadata.has(option)),
      });
    }
    unseen.push(...decorators.unseen());
  }
  return { found: out, declarations, unseen, unparsed, renamed };
};

/** The library's source files, specs left out — what `readSources` reads in the repository. */
const sourceFiles = () =>
  globSync(`${PROJECT}/*/src/**/*.ts`, { cwd: ROOT })
    .sort()
    .filter((file) => !file.endsWith('.spec.ts'))
    .map((file) => ({ file: file.split('\\').join('/'), content: read(file) }));

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
 * The namespaces of the BUILT package's entrypoints. `@angular/compiler` is loaded first,
 * because the package is partially compiled and `ɵcmp` appears only on access — the same
 * step the linker performs at the consumer's.
 */
const packageModules = async (entrypoints) => {
  await import('@angular/compiler');
  const out = [];
  for (const { entrypoint, file } of entrypoints)
    out.push({
      entrypoint,
      module: await import(pathToFileURL(join(ROOT, DIST, file)).href),
    });
  return out;
};

/**
 * Every component a namespace exports — `[{ class, className, exportedAs, entrypoint, onPush,
 * standalone }]`: the class itself, its own name, the key it is exported under. A case goes
 * through it too, so what is read from a namespace is what the cases hold.
 */
const componentsOf = (modules) =>
  modules.flatMap(({ entrypoint, module }) =>
    Object.entries(module)
      .filter(
        ([, value]) =>
          typeof value === 'function' &&
          Object.getOwnPropertyDescriptor(value, 'ɵcmp'),
      )
      .map(([exportedAs, value]) => ({
        class: value,
        className: value.name,
        exportedAs,
        entrypoint,
        onPush: value['ɵcmp'].onPush,
        standalone: value['ɵcmp'].standalone,
      })),
  );

// ── negative control ──────────────────────────────────────────────────────────

const readFixture = (name) =>
  JSON.parse(readFileSync(join(FIXTURES, name), 'utf8'));

/**
 * Builds a case's input ON A COPY of the reference one, so the case file holds nothing
 * but its own defect — you cannot break something in passing and not notice. Sources are
 * source text, a file's `lines`, and a case's `files` replace the reference's of the same path
 * or join them.
 */
const buildFixture = (fx) => {
  const reference = readFixture(REFERENCE);
  const input = structuredClone({
    manifests: reference.manifests,
    lockPackages: reference.lockPackages,
    bundle: reference.bundle,
    entrypoints: reference.entrypoints,
    classes: reference.classes,
    modules: reference.modules,
  });
  const sources = new Map(
    reference.sources.map((z) => [z.file, z.lines.join('\n')]),
  );
  for (const z of fx.files ?? []) sources.set(z.file, z.lines.join('\n'));
  input.sources = [...sources].map(([file, content]) => ({ file, content }));

  if (fx.addDependency) {
    const { file, field, version } = fx.addDependency;
    const manifest = input.manifests.find((m) => m.file === file);
    manifest[field] = { ...manifest[field], 'zone.js': version };
  }
  input.lockPackages.push(...(fx.addToLock ?? []));
  if (fx.addToBundle) input.bundle[0].text += `\n${fx.addToBundle}\n`;
  if (fx.clearBundle) input.bundle = [];
  if (fx.clearSources) input.sources = [];
  Object.assign(input.classes, structuredClone(fx.addClasses ?? {}));
  for (const c of Object.values(input.classes)) {
    if (fx.onPush?.[c.name] !== undefined) c.onPush = fx.onPush[c.name];
    if (fx.standalone?.[c.name] !== undefined)
      c.standalone = fx.standalone[c.name];
  }
  for (const keys of Object.values(input.modules))
    for (const key of fx.dropFromPackage ?? []) delete keys[key];
  for (const [entrypoint, keys] of Object.entries(fx.modules ?? {}))
    for (const [key, id] of Object.entries(keys)) {
      input.modules[entrypoint] ??= {};
      if (id === null) delete input.modules[entrypoint][key];
      else input.modules[entrypoint][key] = id;
    }
  // The package as namespaces of plain classes, one object per class id: the same class
  // exported twice is one object, as a re-export is.
  const made = {};
  for (const [id, c] of Object.entries(input.classes)) {
    made[id] = Object.defineProperty(class {}, 'name', { value: c.name });
    made[id]['ɵcmp'] = { onPush: c.onPush, standalone: c.standalone };
  }
  const { classes, modules, ...rest } = input;
  return {
    ...rest,
    modules: Object.entries(modules).map(([entrypoint, keys]) => ({
      entrypoint,
      module: Object.fromEntries(
        Object.entries(keys).map(([key, id]) => {
          if (!made[id])
            throw new Error(
              `${key} of ${entrypoint}: no class \`${id}\` in the case`,
            );
          return [key, made[id]];
        }),
      ),
    })),
  };
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
    sources: sourceFiles(),
    modules: await packageModules(entrypoints),
  });
} catch (error) {
  if (!(error instanceof ZonelessError)) throw error;
  problems.push(`${error.check}: ${error.message}`);
}

const cases = readdirSync(FIXTURES)
  .filter((n) => n.endsWith('.json') && n !== REFERENCE && n !== RUNNER)
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

/**
 * What the runner reports of one prepared case: nothing, when it was rejected on its own point
 * and says what it pins. The loop plays every case through it, and so does the runner's own
 * control (`runner-control.mjs`).
 */
const runCase = (name, fx) => {
  const said = [];
  try {
    checkZoneless(buildFixture(fx));
    said.push(
      `${name}: the prepared input PASSED and was meant not to — ` +
        `point ${fx.point} (\`${fx.check}\`) stopped examining anything`,
    );
  } catch (error) {
    if (!(error instanceof ZonelessError)) throw error;
    if (error.check !== fx.check)
      said.push(
        `${name}: check \`${error.check}\` fired, and point ${fx.point} ` +
          `(\`${fx.check}\`) was meant to — the fixture proves something other than what it declares`,
      );
    else if (fx.message !== undefined && !error.message.includes(fx.message))
      said.push(
        `${name}: point ${fx.point} (\`${fx.check}\`) fired without "${fx.message}" — another ` +
          `refusal of the same point, or the right one saying something else:\n    ` +
          error.message,
      );
  }
  return said;
};

for (const name of cases) problems.push(...runCase(name, readFixture(name)));

problems.push(
  ...(await runnerControl({
    where: `tools/check-zoneless.fixtures/${RUNNER}`,
    control: readFixture(RUNNER),
    cases,
    read: readFixture,
    run: runCase,
    pin: (fx, message) => ({ ...fx, message }),
  })),
);

// ── result ────────────────────────────────────────────────────────────────────

if (problems.length) {
  console.error(`X Foundation gate — ${problems.length} violations:\n`);
  for (const p of problems) console.error(`  - ${p}`);
  console.error('');
  process.exit(1);
}

console.log(
  `✓ Foundation: ${summary}. Negative control: the reference input passes, ` +
    `${cases.length} prepared ones rejected on their own points, and the runner reports a ` +
    `case pinned to a phrase its refusal lacks.`,
);
