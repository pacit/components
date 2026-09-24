#!/usr/bin/env node
/**
 * Coverage gate: does the report measure the WHOLE library, and is `req-quality-coverage`'s
 * threshold really enforced? A file with no test drops OUT of the report rather than reading
 * zero, so a threshold over it is a gate born dead ([`lesson-45`](../docs/lessons.md#lesson-45)).
 *
 *  1. the report exists at all and has a total for every enforced metric,
 *  2. the list of source files is not empty and matches the tree both ways, less the excused,
 *  3. COMPLETE: every source file of the library — its templates included — is in the report,
 *  4. the `test` target declares a line AND a branch threshold, neither below MINIMUM,
 *  5. the report meets both declared thresholds,
 *  6. every template meets a floor of its own, on each of the four metrics.
 *
 * Point 3 catches the regression, 4 and 5 guard the number it produced, and 6 is the only one
 * that sees a template at all — in the whole report they are a rounding error
 * ([`lesson-71`](../docs/lessons.md#lesson-71)). Control: `check-coverage.fixtures/`.
 *
 * Usage: node tools/check-coverage.mjs
 */
import { execFileSync } from 'node:child_process';
import { existsSync, globSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const GATE = fileURLToPath(import.meta.url);
const ROOT = join(dirname(GATE), '..');
const PROJECT = 'libs/components';
const REPORT = 'coverage/components/coverage-summary.json';
const FIXTURES = join(ROOT, 'tools/check-coverage.fixtures');
const REFERENCE = '_reference.json';

/** Threshold from `req-quality-coverage` — the SonarQube floor. A target may ask for more. */
const MINIMUM = 80;

/**
 * The metrics enforced over the whole report. Both have to be DECLARED in the target:
 * vitest enforces the keys it is handed and infers none, so `lines` alone leaves every
 * condition in the library under no floor whatsoever.
 */
const GLOBAL_METRICS = ['lines', 'branches'];

/** A template — the file whose conditions belong to nobody else's metric. */
const isTemplate = (path) => path.endsWith('.html');

/**
 * A template is measured on ALL FOUR metrics, because in one and the same run each of them
 * was blind to a defect another one caught (`lesson-71`): the false arms of two `@if`s in
 * `field.html` were seen only by branches (lines read 100%), a block of `radio-group.html`
 * that no test ever rendered was seen only by lines (its `@if` reported both arms taken),
 * and a listener never called in `select.html` is seen only by functions and statements.
 */
const TEMPLATE_METRICS = ['lines', 'statements', 'branches', 'functions'];

/**
 * The floor for a template is 100% — not a number chosen to sit below the measurement.
 * Templates are small and declarative: every line of them is DOM somebody promised, and
 * every arm of an `@if` is a state somebody promised. The two defects this floor was born
 * from read 84.61% and 82.35%, that is, they would have passed the 80% the whole report is
 * held to. What a template may not reach is a matter for an exception with a reason, not
 * for a lower floor everywhere.
 */
const TEMPLATE_FLOOR = 100;

/**
 * Templates that do not reach the floor, each with a reason and with the value measured when
 * the reason was written. The floor is two-sided: a metric that climbs ABOVE it fires too,
 * because an exception nothing needs any more is an exception that covers the next defect
 * silently — and that is how this list came to be empty.
 *
 * `select.html` held the only two entries for the whole life of the file, both for the panel's
 * `(overlayOutsideClick)`, and the reason they gave was that jsdom could not raise it. It can:
 * the CDK listens on the document and answers a synthetic click like any other, which
 * `select.spec.ts` ("a click outside the panel closes it") now says. Nothing had asked, and an
 * exception is what a question nobody asks looks like a year later
 * ([`lesson-102`](../docs/lessons.md#lesson-102)).
 */
const TEMPLATE_EXCEPTIONS = {};

/**
 * What counts as "library code". We deliberately do NOT read `coverageInclude` from
 * `project.json`: were this list to come from the configuration, narrowing that
 * configuration would remove a file from both sides of the comparison at once and point 3
 * would stop seeing anything. An independent definition makes a narrowed
 * `coverageInclude` show up as a file missing from the report — that is, as a failure.
 *
 * And this list is held to the tree in turn (point 2), both ways: every `.ts` and `.html`
 * git lists under the library must be reached by a pattern here or excused by a category
 * of `NOT_A_SOURCE`, and every file the patterns reach must be in that listing. Until this
 * point was written nothing held the list. Every case hands the gate a list of files, so no
 * case can see the list itself (`lesson-237`), and the review that followed #14 measured
 * what that leaves open: a copy of this gate without the migrations' pattern below walked
 * 145 files instead of 146, passed, and rejected all twelve prepared inputs on their own
 * points. A pattern struck out takes its files off the list point 3 walks, and point 3
 * passes with fewer to look for — git's listing is the one reading of the library that no
 * pattern here produces, and the other direction keeps that listing from being narrowed.
 */
const SOURCES = [
  `${PROJECT}/src/**/*.ts`,
  `${PROJECT}/*/src/**/*.ts`,
  `${PROJECT}/src/**/*.html`,
  `${PROJECT}/*/src/**/*.html`,
  // The `ng update` migrations, which live outside every entrypoint's `src/` and so were
  // matched by none of the four above. They are code a consumer runs over their own
  // repository, and until 2026-09-21 no floor of any kind stood under them. `ng add` is
  // measured elsewhere — `check-consumer` executes it in a real application, where a
  // migration has no gate at all — and this list does not EXCUSE it the way the mutation
  // run's `NOT_A_SOURCE` does: it simply never reaches it. Said plainly because the two
  // read alike and only one of them would survive a widening to `schematics/**/*.ts`.
  `${PROJECT}/schematics/migrations/**/*.ts`,
];

/**
 * Exceptions. Every one needs a reason, because a silent list of exceptions is exactly the
 * defect this gate stands against.
 */
const SKIPPED = [
  // The tests themselves.
  (p) => p.endsWith('.spec.ts'),
  // Pure types — they vanish in compilation, not one executable line.
  (p) => p.endsWith('.types.ts'),
  // The version stamp generated by `stamp-version` — a single constant, and its agreement
  // with the manifest is watched by `check-package` (point 4), not by a unit test.
  (p) => p === `${PROJECT}/src/version.ts`,
];

/**
 * What git lists under the library that this gate has no business demanding — the tree side
 * of point 2. Categories, each with a reason; a single file left out is a pattern's
 * business, not this list's. Three of them repeat `SKIPPED`, and on purpose: were point 2 to
 * filter the tree with that list, a predicate added to it would strike a file from BOTH sides
 * of the comparison at once and the point would stop seeing anything — the argument that
 * keeps `SOURCES` apart from `coverageInclude`, one list over. Spelled twice, a `SKIPPED`
 * predicate widened shows up as the tree's leftover; a category here widened costs the floor
 * nothing — the patterns still demand its files — and only blinds the tree side to them, so
 * dropping a file silently takes an edit to each list, not to one.
 */
const NOT_A_SOURCE = [
  // Anything that is not TypeScript or a template. The measurement sees these two and nothing
  // else (`coverageInclude` names both extensions and no other); styles, JSON, prose and the
  // `.mjs`/`.mts` tooling that lives beside the sources stand outside it.
  (p) => !p.endsWith('.ts') && !p.endsWith('.html'),
  // The tests themselves.
  (p) => p.endsWith('.spec.ts'),
  // Types, as `SKIPPED` has them. Not all of them pure — `select.types.ts` exports two
  // runtime functions under no floor — and that is a flaw of the category in three lists
  // (this one, `SKIPPED`, `coverageExclude`), a task of its own rather than a reason here.
  (p) => p.endsWith('.types.ts'),
  // The version stamp (see `SKIPPED`).
  (p) => p === `${PROJECT}/src/version.ts`,
  // The mutation run's own harness: what RUNS the specs there, not something they measure —
  // and the `test` target never loads it.
  (p) => p === `${PROJECT}/mutation.setup.ts`,
  // The `ng add` schematic, and that directory alone. It runs once, in the consumer's CLI,
  // and is measured where it runs: `check-consumer` installs the package into a real
  // application and executes it there. A migration under `schematics/migrations/` is NOT
  // this — no gate runs one in a real application, so its floor is here, through the fifth
  // pattern of `SOURCES` — and `migration-behind-ng-add-excuse.json` is what keeps this line
  // from widening back to `schematics/`, the way the mutation run's copy of it once read.
  (p) => p.startsWith(`${PROJECT}/schematics/ng-add/`),
];

/**
 * Templates (`.html`) are required in the report as much as the code is — and that is a
 * promise this gate did not use to make. A template enters the statistic only once some
 * test RENDERS its component, so demanding it there demands a rendering test for every
 * component; the library has one for each of its six. Without the demand a component
 * nobody renders takes its conditions out of the denominator and the percentage goes up as
 * it leaves — `lesson-45` with a different file extension.
 */
const librarySources = () =>
  SOURCES.flatMap((pattern) => globSync(pattern, { cwd: ROOT }))
    .map((p) => p.split('\\').join('/'))
    .filter((p) => !SKIPPED.some((skip) => skip(p)))
    .sort();

/**
 * A violation of one of the checks, which `CHECK_POINTS` sorts into the six points. It
 * carries the check's identifier, not just the message: the negative control has to verify
 * that a prepared input fired ON ITS OWN point — a fixture failing for a reason other than
 * the one written into it proves something other than what it declares.
 */
class CoverageError extends Error {
  constructor(check, description) {
    super(description);
    this.check = check;
  }
}

/**
 * The point each check belongs to. A case declares both, and is held to this table: a
 * point its check does not stand on would put the wrong number in every message about it.
 * A new check comes with its row here, as it comes with its case — and the run holds the
 * table to the checks this file throws, both ways (`throwsOf`).
 */
const CHECK_POINTS = {
  report: 1,
  sources: 2,
  'outside-tree': 2,
  unaccounted: 2,
  complete: 3,
  threshold: 4,
  result: 5,
  templates: 6,
  'exception-stale': 6,
};

/**
 * The full set of checks over a ready input:
 *   `report` — `{ total, files }` with paths relative to the repository root (or null),
 *   `sources` — the files that MUST be in the report,
 *   `tree` — every file of the library as git lists it; point 2 holds `sources` to it
 *            both ways, so a pattern narrowed is seen where a case cannot see it,
 *   `gone` — the listed files git reports deleted from the working tree (for the message),
 *   `target` — the options of the `test` target from `project.json`,
 *   `exceptions` — the templates allowed below the floor, by file and by metric.
 * Throws `CoverageError` on the first violation — the checks run from the most basic one,
 * so the later ones would have nothing to examine anyway.
 */
const checkCoverage = ({ report, sources, tree, gone, target, exceptions }) => {
  // 1. The report exists and has a total for every metric a threshold is declared over.
  for (const metric of GLOBAL_METRICS)
    if (typeof report?.total?.[metric]?.pct !== 'number')
      throw new CoverageError(
        'report',
        `no coverage report, or a report with no ${metric} total (${REPORT}) — ` +
          `the test run collected no coverage and the gate has nothing to examine`,
      );

  // 2. The list of source files is not empty.
  if (!sources?.length)
    throw new CoverageError(
      'sources',
      `not a single source file found (${SOURCES.join(', ')}) — ` +
        `point 3 would then always pass, having nothing to look for in the report`,
    );

  // ...and it is the WHOLE library, held both ways to git's listing of it — the one reading
  // of the library that no pattern of this gate produces, so a pattern narrowed shows up
  // here as listed files the list no longer reaches, where the cases, which hand the gate a
  // list, cannot see it. First the listing itself: it is read under a pathspec, and a
  // listing that does not hold what the patterns reach — narrowed, or empty because the
  // reading failed — would leave the check after it blind.
  const listed = new Set(tree ?? []);
  const outside = sources.filter((p) => !listed.has(p));
  if (outside.length)
    throw new CoverageError(
      'outside-tree',
      `${outside.length} source files the patterns reach are not in git's listing of ` +
        `${PROJECT}` +
        (listed.size ? ':\n' : ` — a listing with nothing in it at all:\n`) +
        outside.map((p) => `      ${p}`).join('\n') +
        `\n    The listing is what holds the patterns to the whole library, so a listing ` +
        `narrowed — a pathspec, an ignore rule, a reading that failed — would leave the ` +
        `next check blind. Remedy: list the library whole (libraryTree), or stop ignoring ` +
        `the file.`,
    );
  const demanded = new Set(sources);
  const unaccounted = (tree ?? []).filter(
    (p) => !NOT_A_SOURCE.some((no) => no(p)) && !demanded.has(p),
  );
  const deleted = new Set(gone ?? []);
  const why = (p) =>
    SKIPPED.some((skip) => skip(p))
      ? 'struck by a SKIPPED predicate'
      : deleted.has(p)
        ? 'gone from the working tree, still listed by git'
        : 'reached by no SOURCES pattern';
  if (unaccounted.length)
    throw new CoverageError(
      'unaccounted',
      `${unaccounted.length} source files of the library are demanded by no pattern and ` +
        `excused by no category:\n` +
        unaccounted.map((p) => `      ${p} (${why(p)})`).join('\n') +
        `\n    A pattern narrowed or struck out, or a SKIPPED predicate widened, takes ` +
        `files off the list point 3 walks, and point 3 passes with fewer to look for — ` +
        `the percentage says nothing about them (lesson-45, lesson-237). Remedy: a ` +
        `pattern in SOURCES that reaches the file, a SKIPPED predicate that no longer ` +
        `strikes it, or a category in NOT_A_SOURCE with a reason.`,
    );

  // 3. Complete: every source file is in the report.
  const missing = sources.filter((p) => !(p in report.files));
  if (missing.length)
    throw new CoverageError(
      'complete',
      `${missing.length} source files are missing from the coverage report — ` +
        `the percentage was computed WITHOUT them, so it says nothing about them:\n` +
        missing.map((p) => `      ${p}`).join('\n') +
        `\n    Usual cause: the file enters no run and v8 cannot count it from the ` +
        `source (lesson-45). Remedy: import the entrypoint in ` +
        `libs/components/src/public-api.spec.ts, or give the file its own test. For a ` +
        `template the remedy is a different one — it appears only once a test RENDERS ` +
        `its component, and an import will not do it.`,
    );

  // 4. The thresholds are declared in the target and not below the minimum.
  if (target?.coverage !== true)
    throw new CoverageError(
      'threshold',
      `the \`test\` target has no \`coverage: true\` — the run collects no coverage, ` +
        `so no threshold has anything to guard`,
    );
  for (const metric of GLOBAL_METRICS) {
    const declared = target?.coverageThresholds?.[metric];
    if (typeof declared !== 'number' || declared < MINIMUM)
      throw new CoverageError(
        'threshold',
        `the \`test\` target declares a ${metric} threshold of ` +
          `\`${declared ?? 'none'}\`, and \`req-quality-coverage\` asks for at least ` +
          `${MINIMUM}% — vitest enforces the keys it is handed and infers none, so a ` +
          `missing one is not inherited from its neighbour: it is no floor at all`,
      );
  }

  // 5. The report meets the declared thresholds. This point duplicates the enforcement in
  // the target itself, and deliberately: that one hangs on a single build option, easy to
  // disarm with one character, while this one runs in a separate process and in CI as a
  // separate target.
  for (const metric of GLOBAL_METRICS) {
    const declared = target.coverageThresholds[metric];
    const pct = report.total[metric].pct;
    if (pct < declared)
      throw new CoverageError(
        'result',
        `${metric} coverage ${pct}% below the ${declared}% threshold`,
      );
  }

  // 6. Every template against the floor of its own — the whole-report figure cannot see
  // them, and each of the four metrics is blind to something the others catch.
  const templates = Object.keys(report.files).filter(isTemplate).sort();
  const below = [];
  const settled = [];
  for (const path of templates)
    for (const metric of TEMPLATE_METRICS) {
      const exception = exceptions?.[path]?.[metric];
      const floor = exception?.floor ?? TEMPLATE_FLOOR;
      const pct = report.files[path][metric]?.pct;
      if (typeof pct !== 'number')
        below.push(
          `${path} — ${metric}: the report has no such total for this file`,
        );
      else if (pct < floor)
        below.push(
          `${path} — ${metric} ${pct}%, below the ${floor}% floor` +
            (exception ? ` its exception declares` : ''),
        );
      else if (exception && pct > floor)
        settled.push(
          `${path} — ${metric} reads ${pct}%, above the ${floor}% of its exception: ` +
            exception.reason,
        );
    }

  if (below.length)
    throw new CoverageError(
      'templates',
      `${below.length} template metrics below the floor — a line of a template nobody ` +
        `renders, or an arm of an \`@if\` nobody takes, is a promise measured by no one:\n` +
        below.map((row) => `      ${row}`).join('\n') +
        `\n    The whole-report threshold does not see this: the templates are a small ` +
        `part of it, and a component left unrendered raises the percentage by leaving.`,
    );

  if (settled.length)
    throw new CoverageError(
      'exception-stale',
      `${settled.length} template exceptions no longer cover anything — the metric ` +
        `climbed above what they allow, so what they cover now is the NEXT defect:\n` +
        settled.map((row) => `      ${row}`).join('\n') +
        `\n    Remedy: raise the floor in TEMPLATE_EXCEPTIONS to what is measured, or ` +
        `delete the entry.`,
    );

  const thresholds = GLOBAL_METRICS.map(
    (m) =>
      `${m} ${report.total[m].pct}% (threshold ${target.coverageThresholds[m]}%)`,
  ).join(', ');
  return (
    `${sources.length} source files in the report, ${thresholds}; ` +
    `${templates.length} templates at their own floor of ${TEMPLATE_FLOOR}%`
  );
};

// ── input from disk ───────────────────────────────────────────────────────────

/** The report in the shape `checkCoverage` expects: paths relative to the repo root. */
const readReport = () => {
  const path = join(ROOT, REPORT);
  if (!existsSync(path)) return null;
  const raw = JSON.parse(readFileSync(path, 'utf8'));
  const files = {};
  for (const [key, value] of Object.entries(raw)) {
    if (key === 'total') continue;
    files[relative(ROOT, key).split('\\').join('/')] = value;
  }
  return { total: raw.total, files };
};

const targetOptions = () =>
  JSON.parse(readFileSync(join(ROOT, PROJECT, 'project.json'), 'utf8')).targets
    ?.test?.options;

/**
 * The library as git lists it: the tracked files and the untracked ones it does not ignore,
 * so a file written a minute ago counts and a generated one does not. Read under one
 * pathspec — `outside-tree` is what keeps that pathspec from being narrowed.
 */
const libraryTree = () =>
  execFileSync(
    'git',
    [
      'ls-files',
      '-z',
      '--cached',
      '--others',
      '--exclude-standard',
      '--',
      PROJECT,
    ],
    { cwd: ROOT, encoding: 'utf8' },
  )
    .split('\0')
    .filter(Boolean)
    .map((p) => p.split('\\').join('/'))
    .sort();

/** The listed files git reports deleted from the working tree — a `git rm` not yet made. */
const libraryGone = () =>
  execFileSync('git', ['ls-files', '-z', '--deleted', '--', PROJECT], {
    cwd: ROOT,
    encoding: 'utf8',
  })
    .split('\0')
    .filter(Boolean)
    .map((p) => p.split('\\').join('/'));

// ── negative control ──────────────────────────────────────────────────────────

/**
 * A case, or the reference, that the builder cannot apply as written. Read loosely, a typo
 * in a fixture — a key misspelt, a list written as a string, a path that is not there, a
 * value equal to the one it replaces — makes the case change nothing: it passes, and the
 * gate blames its own point for it. Refused by name instead, before the gate is asked.
 */
class FixtureError extends Error {}

const has = Object.hasOwn;
const isObject = (v) =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const readFixture = (name) => {
  let text;
  try {
    text = readFileSync(join(FIXTURES, name), 'utf8');
  } catch (error) {
    throw new FixtureError(
      error.code === 'ENOENT'
        ? 'the file is missing'
        : `the file cannot be read (${error.code ?? error.message})`,
    );
  }
  let value;
  try {
    value = JSON.parse(text);
  } catch (error) {
    throw new FixtureError(`not JSON — ${error.message}`);
  }
  if (!isObject(value)) throw new FixtureError('the file is not an object');
  return value;
};

/** Every key a case may carry, and the kind of value each has to hold. */
const CASE_KEYS = {
  point: 'number',
  check: 'string',
  description: 'string',
  dropReport: 'boolean',
  clearSources: 'boolean',
  clearTree: 'boolean',
  dropFromSources: 'paths',
  dropFromTree: 'paths',
  addToTree: 'paths',
  dropFromReport: 'paths',
  pct: 'number',
  branchPct: 'number',
  filePct: 'object',
  target: 'any',
  exceptions: 'any',
};

/**
 * A list of paths, each of which `pool` holds — or, for an addition, does not: dropping a
 * path that is not there, or adding one that already is, changes nothing.
 */
const paths = (holder, key, pool, adding = false) => {
  if (!has(holder, key)) return [];
  const value = holder[key];
  if (!Array.isArray(value) || !value.every((p) => typeof p === 'string'))
    throw new FixtureError(
      `\`${key}\` must be a list of paths, and reads ${JSON.stringify(value)}`,
    );
  if (new Set(value).size !== value.length)
    throw new FixtureError(`\`${key}\` names a path twice`);
  const idle = pool ? value.filter((p) => pool.has(p) === adding) : [];
  if (idle.length)
    throw new FixtureError(
      `\`${key}\` names ${idle.map((p) => `\`${p}\``).join(', ')}, which ` +
        `${adding ? 'is already there' : 'is not there'} — the operation would ` +
        `change nothing`,
    );
  return value;
};

/** A value written with its keys in order, so two inputs compare by what they hold. */
const stable = (v) =>
  Array.isArray(v)
    ? `[${v.map(stable).join(',')}]`
    : isObject(v)
      ? `{${Object.keys(v)
          .sort()
          .map((k) => `${JSON.stringify(k)}:${stable(v[k])}`)
          .join(',')}}`
      : String(JSON.stringify(v));

/** An input as a comparison sees it: the two lists are sets, whatever order built them. */
const canonical = (input) =>
  stable({
    ...input,
    sources: [...new Set(input.sources)].sort(),
    tree: [...new Set(input.tree)].sort(),
  });

/**
 * Builds a case's input ON A COPY of the reference one, so the case file holds nothing but
 * its own defect — you cannot break something in passing and not notice.
 */
const buildFixture = (fx) => {
  for (const [key, value] of Object.entries(fx)) {
    if (!has(CASE_KEYS, key))
      throw new FixtureError(
        `\`${key}\` is no key a case may carry (${Object.keys(CASE_KEYS).join(', ')})`,
      );
    const kind = CASE_KEYS[key];
    const fits =
      kind === 'any' ||
      kind === 'paths' ||
      (kind === 'object' ? isObject(value) : typeof value === kind);
    if (!fits)
      throw new FixtureError(
        `\`${key}\` must be ${kind === 'object' ? 'an object' : `a ${kind}`}, and reads ` +
          JSON.stringify(value),
      );
  }
  if (
    fx.dropReport &&
    ['dropFromReport', 'pct', 'branchPct', 'filePct'].some((k) => has(fx, k))
  )
    throw new FixtureError(
      '`dropReport` leaves no report for the other report operations to change',
    );

  const reference = readFixture(REFERENCE);
  const { report } = reference;
  if (
    !isObject(report?.files) ||
    !Object.values(report.files).every(isObject) ||
    !isObject(report?.total?.lines) ||
    !isObject(report?.total?.branches)
  )
    throw new FixtureError(
      'the reference holds no report whose every file is an object, with a line and a ' +
        'branch total',
    );
  const input = {
    report: structuredClone(report),
    sources: [...paths(reference, 'sources')],
    tree: [...paths(reference, 'tree')],
    gone: [],
    target: structuredClone(reference.target),
    exceptions: structuredClone(reference.exceptions),
  };
  if (fx.dropReport) input.report = null;
  if (fx.clearSources) input.sources = [];
  if (fx.clearTree) input.tree = [];
  const dropped = (key, list) => {
    const gone = new Set(paths(fx, key, new Set(list)));
    return list.filter((p) => !gone.has(p));
  };
  input.sources = dropped('dropFromSources', input.sources);
  input.tree = dropped('dropFromTree', input.tree);
  input.tree.push(...paths(fx, 'addToTree', new Set(input.tree), true));
  if (input.report) {
    const { files, total } = input.report;
    for (const p of paths(fx, 'dropFromReport', new Set(Object.keys(files))))
      delete files[p];
    if (has(fx, 'pct')) total.lines.pct = fx.pct;
    if (has(fx, 'branchPct')) total.branches.pct = fx.branchPct;
    for (const [path, metrics] of Object.entries(fx.filePct ?? {})) {
      if (!has(files, path) || !isObject(metrics))
        throw new FixtureError(
          `\`filePct\` names \`${path}\`, which the report does not hold, or gives it ` +
            `no object of metrics`,
        );
      for (const [metric, value] of Object.entries(metrics)) {
        if (
          !has(files[path], metric) ||
          !isObject(files[path][metric]) ||
          typeof value !== 'number'
        )
          throw new FixtureError(
            `\`filePct\` sets ${metric} of \`${path}\` to ${JSON.stringify(value)}, and ` +
              `the report has no such number to change`,
          );
        files[path][metric].pct = value;
      }
    }
  }
  if (has(fx, 'target')) input.target = fx.target;
  if (has(fx, 'exceptions')) input.exceptions = fx.exceptions;
  return input;
};

/**
 * The checks a source throws, as its constructions name them, each with its lines — read off
 * the text, comments included, so a construction quoted in one counts as one. A check is
 * read only from the name constructed with `new` and a plain literal first argument, with
 * whitespace alone between them, and only spaces or tabs before the name: a comment ending
 * in `new`, `class` or `instanceof` on the line above cannot stand in for the keyword. Every
 * other use of the name — a check that is no literal, a helper's parameter, a subclass, an
 * alias, a construction spelt another way — is filed under `null`, and so reported; the
 * class declaration, `instanceof` and the name itself in backticks are left alone. What the
 * text cannot show is what happens after a construction: a check relabelled on the error,
 * or another class the catches accept, is not read. The lookback of 64 characters is far
 * more than any spacing prettier leaves, and a longer gap is reported, not skipped. The
 * patterns bracket one letter of the name, so that they are no use of it themselves.
 */
const ERROR_NAME = /\bCoverage[E]rror\b/g;
const NAME_LEFT_ALONE = /(?:\bclass|\binstanceof)[ \t]+$|`$/;
const NAME_CONSTRUCTED = /\bnew[ \t]+$/;
const CHECK_LITERAL =
  /\s*\(\s*(?:'([^'\\\n]+)'|"([^"\\\n]+)"|`([^`\\$\n]+)`)(?=\s*[,)])/y;
const throwsOf = (source) => {
  const thrown = new Map();
  for (const { 0: name, index } of source.matchAll(ERROR_NAME)) {
    const before = source.slice(Math.max(0, index - 64), index);
    if (NAME_LEFT_ALONE.test(before)) continue;
    CHECK_LITERAL.lastIndex = index + name.length;
    const literal = NAME_CONSTRUCTED.test(before)
      ? CHECK_LITERAL.exec(source)
      : null;
    const check = literal ? (literal[1] ?? literal[2] ?? literal[3]) : null;
    const line = source.slice(0, index).split('\n').length;
    thrown.set(check, [...(thrown.get(check) ?? []), line]);
  }
  return thrown;
};

// ── the run ───────────────────────────────────────────────────────────────────

const problems = [];
let summary = null;

try {
  summary = checkCoverage({
    report: readReport(),
    sources: librarySources(),
    tree: libraryTree(),
    gone: libraryGone(),
    target: targetOptions(),
    exceptions: TEMPLATE_EXCEPTIONS,
  });
} catch (error) {
  if (!(error instanceof CoverageError)) throw error;
  problems.push(`${error.check}: ${error.message}`);
}

const cases = readdirSync(FIXTURES)
  .filter((n) => n.endsWith('.json') && n !== REFERENCE)
  .sort();

if (cases.length === 0)
  problems.push(
    `tools/check-coverage.fixtures: no prepared inputs — a gate with no proof that it ` +
      `can fail is one more silent defect (req-quality-negative-control)`,
  );

// Every check the gate throws has its row, and every row is thrown. A case is held to the
// table and the missing-case line below walks it, so a check thrown with neither a row nor
// a case would be seen by neither: the list the table is held to is the source itself.
const thrown = throwsOf(readFileSync(GATE, 'utf8'));
const locations = (check) =>
  thrown
    .get(check)
    .map((line) => `${relative(ROOT, GATE)}:${line}`)
    .join(', ');
if (thrown.has(null))
  problems.push(
    `${locations(null)}: \`CoverageError\` used where this reading resolves no check — it ` +
      `reads a check only where \`new\` and the name share a line and a plain literal is ` +
      `the first argument, with no comment inside, and it leaves alone nothing but the ` +
      `class declaration, \`instanceof\` and the name itself in backticks`,
  );
const thrownChecks = [...thrown.keys()].filter((check) => check !== null);
const unlisted = thrownChecks.filter((check) => !has(CHECK_POINTS, check));
if (unlisted.length)
  problems.push(
    `${unlisted.map((c) => `\`${c}\` (${locations(c)})`).join(', ')}: constructed with ` +
      `no row in \`CHECK_POINTS\` — a case naming a check the table does not hold is ` +
      `refused, and the missing-case line walks the rows: nothing would ever ask for a case`,
  );
const unthrown = Object.keys(CHECK_POINTS).filter(
  (check) => !thrown.has(check),
);
if (unthrown.length)
  problems.push(
    `${unthrown.map((c) => `\`${c}\``).join(', ')}: in \`CHECK_POINTS\`, and no ` +
      `construction this reading resolves names it — delete the row, or spell the check ` +
      `at its throw so that one does`,
  );

/**
 * A case's declaration and input — the reference's is built with no operations — or null,
 * with the reason recorded, when the file cannot be read as one. A case is held against
 * `base`, the reference's input: one that builds the same input changes nothing, and would
 * pass with its point blamed.
 */
const built = (name, base) => {
  try {
    const fx = name === REFERENCE ? {} : readFixture(name);
    if (
      name !== REFERENCE &&
      (!has(CHECK_POINTS, fx.check) || CHECK_POINTS[fx.check] !== fx.point)
    )
      throw new FixtureError(
        `a case has to declare one of this gate's checks and the point it stands on ` +
          `(${Object.entries(CHECK_POINTS)
            .map(([check, point]) => `${check} ${point}`)
            .join(', ')}), and declares ${JSON.stringify(fx.check)} on ` +
          JSON.stringify(fx.point),
      );
    if (
      name !== REFERENCE &&
      (typeof fx.description !== 'string' || fx.description.trim().length < 40)
    )
      throw new FixtureError(
        'a case has to say, in `description`, what it breaks and why that matters — ' +
          'a defect nobody explained is the silent exception this gate stands against',
      );
    const input = buildFixture(fx);
    if (base && canonical(input) === canonical(base))
      throw new FixtureError(
        'the case builds the reference input unchanged — every operation in it is ' +
          'already the reference',
      );
    return { fx, input };
  } catch (error) {
    if (!(error instanceof FixtureError)) throw error;
    problems.push(
      name === REFERENCE
        ? `${REFERENCE}: malformed — ${error.message}; every case is built on it, so ` +
            `none of the ${cases.length} was judged`
        : `${name}: malformed — ${error.message}; a case that cannot be read as data ` +
            `measures nothing, whatever the gate answers to it`,
    );
    return null;
  }
};

// The reference input MUST pass. Were it defective itself, every case would fire because
// of it rather than because of its own defect — and every "it fired" would be false.
const reference = built(REFERENCE);
if (reference)
  try {
    checkCoverage(reference.input);
  } catch (error) {
    if (!(error instanceof CoverageError)) throw error;
    problems.push(
      `${REFERENCE}: the reference input does NOT pass (${error.check}) — ` +
        `every prepared case now fires because of it.\n    ${error.message}`,
    );
  }

// A reference that cannot be read leaves no case to judge: every one is built on it.
const covered = new Set();
for (const name of reference ? cases : []) {
  const one = built(name, reference.input);
  if (!one) continue;
  const { fx, input } = one;
  covered.add(fx.check);
  try {
    checkCoverage(input);
    problems.push(
      `${name}: the prepared input PASSED and was meant not to — ` +
        `point ${fx.point} (\`${fx.check}\`) stopped examining anything`,
    );
  } catch (error) {
    if (!(error instanceof CoverageError)) throw error;
    if (error.check !== fx.check)
      problems.push(
        `${name}: check \`${error.check}\` fired, and point ${fx.point} ` +
          `(\`${fx.check}\`) was meant to — the fixture proves something other than ` +
          `what it declares`,
      );
  }
}

// Every check has a case. The loop above walks the cases, so a check whose last case is
// deleted leaves it nothing to notice — a promise with no machine able to fire on it, which
// is what `req-axis` forbids. A row a construction names is a check, and needs a readable
// case; a row none names is reported above instead, and a case is not its remedy.
const uncovered = reference
  ? Object.keys(CHECK_POINTS).filter(
      (check) => thrown.has(check) && !covered.has(check),
    )
  : [];
if (uncovered.length)
  problems.push(
    `${uncovered.map((c) => `\`${c}\``).join(', ')}: no readable case declares ` +
      `${uncovered.length === 1 ? 'this check' : 'these checks'} — a check with no case ` +
      `is a promise no machine can fire on (req-axis), and nothing else notices its last ` +
      `case go`,
  );

// ── result ────────────────────────────────────────────────────────────────────

if (problems.length) {
  console.error(`X Coverage gate — ${problems.length} violations:\n`);
  for (const p of problems) console.error(`  - ${p}`);
  console.error('');
  process.exit(1);
}

console.log(
  `✓ Coverage: ${summary}. Negative control: the reference input passes, ` +
    `${cases.length} prepared ones rejected on their own points, and each of the ` +
    `${thrownChecks.length} checks its constructions name has its row and a case.`,
);
