#!/usr/bin/env node
/**
 * Coverage gate: does the report measure the WHOLE library, and is `req-quality-coverage`'s
 * threshold really enforced? A file with no test drops OUT of the report rather than reading
 * zero, so a threshold over it is a gate born dead ([`lesson-45`](../docs/lessons.md#lesson-45)).
 *
 *  1. this checkout's report exists and has a total for every enforced metric,
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
import {
  existsSync,
  globSync,
  readFileSync,
  readdirSync,
  realpathSync,
} from 'node:fs';
import { dirname, join, posix, relative, resolve } from 'node:path';
import { URL, fileURLToPath } from 'node:url';
import { getCallSites } from 'node:util';
import ts from 'typescript';

// The real path: reached through a link (`--preserve-symlinks-main`), ROOT would name a
// directory no key of v8's does, and point 1 would call this checkout another one.
const GATE = realpathSync(fileURLToPath(import.meta.url));
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
 * Where a construction stands in this file: the line and column of its `new`, read off V8's
 * frame for it rather than the text of the stack, whose first line is a message of several
 * lines here. V8 places a construction at its `new` whatever lines its name and arguments run
 * over, and `throwsOf` places one there too, so a run and a reading name one construction
 * alike — and two on one line apart. A frame of another script (`eval`) has no site here.
 * Node marks `getCallSites` as still in development; a change to what it hands over moves
 * every construction's site at once, and the run turns red on every case, never quietly.
 */
const siteOf = (frame) =>
  frame?.scriptName === import.meta.url
    ? `${frame.lineNumber}:${frame.columnNumber}`
    : null;

/**
 * A violation of one of the checks, which `CHECK_POINTS` sorts into the six points. It
 * carries the check's identifier, not just the message: the negative control has to verify
 * that a prepared input fired ON ITS OWN point — a fixture failing for a reason other than
 * the one written into it proves something other than what it declares. It also carries the
 * construction that made it: a check constructed in two places is two conditions, and the
 * control holds each to a case that fires it.
 */
class CoverageError extends Error {
  constructor(check, description) {
    super(description);
    this.check = check;
    // The frame below this constructor's own: the construction.
    this.site = siteOf(getCallSites(2)[1]);
  }
}

/**
 * The point each check belongs to. A case declares both, and is held to this table: a
 * point its check does not stand on would put the wrong number in every message about it.
 * A new check comes with its row here, as it comes with its case — and the run holds the
 * table to the checks this file's constructions name, both ways (`throwsOf`).
 */
const CHECK_POINTS = {
  report: 1,
  'foreign-report': 1,
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
 * A file of the report outside this checkout's library — where it lies, not how its path is
 * spelt. Not "outside this checkout": every git worktree under `.claude/worktrees/` lies
 * inside the main checkout, so a report one of them wrote never climbs out of it.
 */
const isElsewhere = (path) =>
  !relative(ROOT, resolve(ROOT, path))
    .split('\\')
    .join('/')
    .startsWith(`${PROJECT}/`);

/**
 * The checkout a file of the report lies in: its absolute path cut before the library's
 * directory — or, for a file outside every copy of the library, the directory it is in.
 */
const checkoutOf = (path) => {
  const absolute = resolve(ROOT, path).split('\\').join('/');
  const at = absolute.lastIndexOf(`/${PROJECT}/`);
  return at === -1 ? dirname(absolute) : absolute.slice(0, at);
};

/**
 * The full set of checks over a ready input:
 *   `report` — `{ total, files }` with paths relative to the repository root (or null);
 *            point 1 asks which of them lie in this checkout's library,
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

  // ...and it is this checkout's own. v8 keys the report by absolute path, so a report
  // written in another checkout names files this one does not hold, and point 3 would call
  // every one of them missing and advise an import that is already there (`lesson-240`).
  // The claim is "another checkout wrote this", and only a report none of whose files lies
  // in this checkout's library makes it: a single file left here, or no file at all, is
  // point 3's to name.
  const files = Object.keys(report.files);
  const elsewhere = files.filter(isElsewhere);
  if (files.length && elsewhere.length === files.length)
    throw new CoverageError(
      'foreign-report',
      `the report (${REPORT}) was written in another checkout — not one of its ` +
        `${files.length} files lies in this one's library (${join(ROOT, PROJECT)}); they ` +
        `lie under:\n` +
        [...new Set(elsewhere.map(checkoutOf))]
          .sort()
          .map((checkout) => `      ${checkout}`)
          .join('\n') +
        `\n    nx shares one cache across git worktrees, and the \`test\` target's hash ` +
        `carries the checkout's path (${PROJECT}/project.json) so that none of them is ` +
        `handed another's report. If nx restored this one, that input is gone: put it ` +
        `back first, because a run without it — --skip-nx-cache included — writes its ` +
        `report into the cache for the next checkout to be handed. If not, the report was ` +
        `left by a checkout that moved, or copied in. Then run the suite here: ` +
        `scripts/with-node npx nx run components:test --skip-nx-cache`,
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

/**
 * The report in the shape `checkCoverage` expects: paths relative to the repo root. v8
 * writes them absolute, so a report another checkout wrote comes out outside this one's
 * library — climbing out (`../`), or under `.claude/worktrees/` for a nested one — and
 * point 1 is what reads that; nothing here decides it.
 */
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

/**
 * A fixture as data. `read` hands over a file's text by its name, and throws what
 * `readFileSync` throws — the run reads `check-coverage.fixtures/` through it, and the
 * control's own control reads prepared files through the same lines.
 */
const fixtureOf = (read, name) => {
  let text;
  try {
    text = read(name);
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
  reportRoot: 'string',
  reportRootFiles: 'paths',
  absoluteReport: 'boolean',
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
const buildFixture = (fx, read) => {
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
    if (kind === 'boolean' && value === false)
      throw new FixtureError(
        `\`${key}\` reads false, which changes nothing — a switch left out says the same`,
      );
  }
  if (
    fx.dropReport &&
    [
      'dropFromReport',
      'pct',
      'branchPct',
      'filePct',
      'reportRoot',
      'reportRootFiles',
      'absoluteReport',
    ].some((k) => has(fx, k))
  )
    throw new FixtureError(
      '`dropReport` leaves no report for the other report operations to change',
    );

  const reference = fixtureOf(read, REFERENCE);
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
    // Last, so that the operations above name the files where the reference has them.
    if (has(fx, 'reportRootFiles') && !has(fx, 'reportRoot'))
      throw new FixtureError(
        '`reportRootFiles` names the files `reportRoot` moves, and there is no `reportRoot`',
      );
    if (has(fx, 'reportRoot')) {
      const chosen = new Set(
        has(fx, 'reportRootFiles')
          ? paths(fx, 'reportRootFiles', new Set(Object.keys(files)))
          : Object.keys(files),
      );
      const to = (p) => posix.join(fx.reportRoot, p);
      if (!chosen.size)
        throw new FixtureError(
          '`reportRoot` has no file of the report to move — the operation would change ' +
            'nothing',
        );
      if ([...chosen].some((p) => has(files, to(p))))
        throw new FixtureError(
          `\`reportRoot\` reads ${JSON.stringify(fx.reportRoot)}, which leaves a file ` +
            `where it was, or on one the report holds — the operation would change nothing`,
        );
      input.report.files = Object.fromEntries(
        Object.entries(files).map(([p, value]) => [
          chosen.has(p) ? to(p) : p,
          value,
        ]),
      );
    }
    // The keys as v8 writes them — absolute — wherever the operations above left them.
    if (fx.absoluteReport) {
      const keyed = Object.entries(input.report.files).map(([p, value]) => [
        resolve(ROOT, p).split('\\').join('/'),
        value,
      ]);
      if (keyed.every(([p]) => has(input.report.files, p)))
        throw new FixtureError(
          '`absoluteReport` finds no key to make absolute — the operation would change ' +
            'nothing',
        );
      input.report.files = Object.fromEntries(keyed);
    }
  }
  if (has(fx, 'target')) input.target = fx.target;
  if (has(fx, 'exceptions')) input.exceptions = fx.exceptions;
  return input;
};

/** The class the reading below looks for: renamed, it is renamed here too. */
const ERROR_CLASS = 'CoverageError';

/**
 * The checks a source's constructions name, each with where they stand. Read by the TypeScript
 * parser, not by a pattern over the text — a pattern is a second lexer (`lesson-236`). A
 * check is the non-empty string literal a construction by name passes first. Every other
 * reference to the class — a check that is no such literal, a helper's parameter, a
 * subclass, an alias, an export, `Reflect.construct`, a class of the same name declared in
 * an inner scope — is filed under `null`, and so reported; the top-level declaration and the
 * right side of `instanceof` are left alone, and comments and strings are no references at
 * all. A construction by name stands at its `new`, line and column as V8 counts them, since
 * that is where a run places it (`siteOf`); any other use stands at the name. What a reading
 * of the code cannot follow is what happens as it runs: a check relabelled on the error, a
 * construction reached through another expression (`eval`, `.constructor`, `this`), or a
 * second error class the catches accept. The control sees the first whatever the cases do —
 * a case reaching the construction fires another check than the one read there, and none
 * reaching it leaves it unreached — and the second once a case fires it. A violation reported
 * without the class at all, a line pushed straight onto `problems`, is outside the table.
 */
const throwsOf = (source) => {
  const file = ts.createSourceFile(GATE, source, ts.ScriptTarget.Latest, true);
  const thrown = new Map();
  const visit = (node) => {
    if (ts.isIdentifier(node) && node.text === ERROR_CLASS) {
      let outer = node;
      while (ts.isParenthesizedExpression(outer.parent)) outer = outer.parent;
      const { parent } = outer;
      const leftAlone =
        (ts.isClassDeclaration(parent) &&
          parent.name === node &&
          parent.parent === file &&
          !(ts.getCombinedModifierFlags(parent) & ts.ModifierFlags.Export)) ||
        (ts.isBinaryExpression(parent) &&
          parent.operatorToken.kind === ts.SyntaxKind.InstanceOfKeyword &&
          parent.right === outer);
      if (!leftAlone) {
        const construction =
          ts.isNewExpression(parent) && parent.expression === outer;
        const [first] = construction ? (parent.arguments ?? []) : [];
        const literal =
          first &&
          (ts.isStringLiteral(first) ||
            ts.isNoSubstitutionTemplateLiteral(first));
        const check = (literal && first.text) || null;
        const { line, character } = file.getLineAndCharacterOfPosition(
          (construction ? parent : node).getStart(file),
        );
        thrown.set(check, [
          ...(thrown.get(check) ?? []),
          { line: line + 1, column: character + 1 },
        ]);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return thrown;
};

/**
 * Where the parser reads a source otherwise than Node runs it. Node would not have started
 * on a syntax error, so every error the parser reports here is a misreading, and the checks
 * read off a misread file cannot be trusted: `</` is a JSX token to it in a JS file, and the
 * code behind it can turn into a string with a construction inside. Only the errors that
 * stand in the file count — the options and the emit can report their own, and those say
 * nothing about the reading. Each source is read once: most prepared inputs below share one.
 */
const misreadings = new Map();
const misreadOf = (source) => {
  if (!misreadings.has(source))
    misreadings.set(
      source,
      (
        ts.transpileModule(source, {
          fileName: GATE,
          reportDiagnostics: true,
          compilerOptions: {
            module: ts.ModuleKind.ESNext,
            target: ts.ScriptTarget.Latest,
          },
        }).diagnostics ?? []
      ).filter(
        (diagnostic) => diagnostic.file && diagnostic.start !== undefined,
      ),
    );
  return misreadings.get(source);
};

// ── the control, over any input ───────────────────────────────────────────────

/**
 * The negative control over any input: the gate's own `source` and `where` it was read, its
 * `table` of checks, the `names` of the cases, a `read` that hands over a fixture's text, and
 * `placed`, the site in `source` of the construction a case fired, given the error and the
 * case — the prepared inputs below name their source for what it is. It returns what it
 * finds, each violation with the rule that fired and what it fired on, and the numbers of
 * checks and constructions the source holds. The run hands it the real input; the control's
 * own control below hands it prepared ones, because on the real input every rule here stays
 * silent — and a rule loosened or struck out stays silent with it.
 */
const controlOf = ({ source, where, table, names, read, placed }) => {
  const found = [];
  const say = (rule, subject, text) =>
    found.push({ rule, subject: String(subject), text });

  if (names.length === 0)
    say(
      'no-cases',
      '',
      `tools/check-coverage.fixtures: no prepared inputs — a gate with no proof that it ` +
        `can fail is one more silent defect (req-quality-negative-control)`,
    );

  // Every check a construction names has its row, and every row is named by one. A case is
  // held to the table and the missing-case line below walks it, so a check constructed with
  // neither a row nor a case would be seen by neither: the list the table is held to is the
  // source itself.
  const here = (line) => `${where}:${line}`;
  const misread = misreadOf(source);
  if (misread.length) {
    const [first] = misread;
    const { line } = first.file.getLineAndCharacterOfPosition(first.start);
    say(
      'misread',
      line + 1,
      `${here(line + 1)}: the TypeScript parser reads this file with ` +
        `${misread.length === 1 ? 'an error' : `${misread.length} errors`} Node does not ` +
        `have, the first "${ts.flattenDiagnosticMessageText(first.messageText, ' ')}" — no ` +
        `check read off a misread file can be trusted, so none is; spell the line so that ` +
        `both read it alike (prettier's spacing does)`,
    );
  }
  const thrown = misread.length ? new Map() : throwsOf(source);
  const lines = (check) => [
    ...new Set(thrown.get(check).map(({ line }) => line)),
  ];
  const locations = (check) => lines(check).map(here).join(', ');
  // Where a check's constructions stand, written as `siteOf` writes the one a case fired.
  const sites = (check) => [
    ...new Set(
      thrown.get(check).map(({ line, column }) => `${line}:${column}`),
    ),
  ];
  if (!misread.length && thrown.size === 0)
    say(
      'no-reference',
      '',
      `${where}: no reference to \`${ERROR_CLASS}\` at all — the reading ` +
        `looks for the name \`ERROR_CLASS\` holds, so while that and the class's own name ` +
        `differ it has nothing to hold the table to; give the two the same name`,
    );
  if (thrown.has(null))
    say(
      'unresolved',
      lines(null).join(', '),
      `${locations(null)}: \`${ERROR_CLASS}\` used where this reading resolves no check — ` +
        `it reads a check only from a construction by name whose first argument is a ` +
        `non-empty string literal, and leaves alone nothing but the top-level unexported ` +
        `declaration and the right side of \`instanceof\`; spell the check at the ` +
        `construction, and use the class for nothing else`,
    );
  const checks = [...thrown.keys()].filter((check) => check !== null);
  const unlisted = checks.filter((check) => !has(table, check));
  if (unlisted.length)
    say(
      'unlisted',
      unlisted.join(', '),
      `${unlisted.map((c) => `\`${c}\` (${locations(c)})`).join(', ')}: constructed with ` +
        `no row in \`CHECK_POINTS\` — a case naming a check the table does not hold is ` +
        `refused, and the missing-case line walks the rows, so nothing would ever ask for a ` +
        `case; give each a row and a case that fires it`,
    );
  const unthrown = thrown.size
    ? Object.keys(table).filter((check) => !thrown.has(check))
    : [];
  if (unthrown.length)
    say(
      'unthrown',
      unthrown.join(', '),
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
      const fx = name === REFERENCE ? {} : fixtureOf(read, name);
      if (
        name !== REFERENCE &&
        (!has(table, fx.check) || table[fx.check] !== fx.point)
      )
        throw new FixtureError(
          `a case has to declare one of this gate's checks and the point it stands on ` +
            `(${Object.entries(table)
              .map(([check, point]) => `${check} ${point}`)
              .join(', ')}), and declares ${JSON.stringify(fx.check)} on ` +
            JSON.stringify(fx.point),
        );
      if (
        name !== REFERENCE &&
        (typeof fx.description !== 'string' ||
          fx.description.trim().length < 40)
      )
        throw new FixtureError(
          'a case has to say, in `description`, what it breaks and why that matters — ' +
            'a defect nobody explained is the silent exception this gate stands against',
        );
      const input = buildFixture(fx, read);
      if (base && canonical(input) === canonical(base))
        throw new FixtureError(
          'the case builds the reference input unchanged — every operation in it is ' +
            'already the reference',
        );
      return { fx, input };
    } catch (error) {
      if (!(error instanceof FixtureError)) throw error;
      say(
        'malformed',
        name,
        name === REFERENCE
          ? `${REFERENCE}: malformed — ${error.message}; every case is built on it, so ` +
              `none of the ${names.length} was judged`
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
      say(
        'reference-fails',
        error.check,
        `${REFERENCE}: the reference input does NOT pass (${error.check}) — ` +
          `every prepared case now fires because of it.\n    ${error.message}`,
      );
    }

  // A reference that cannot be read leaves no case to judge: every one is built on it. Each
  // case leaves the site of the construction it fired in `reached`, and a check one of whose
  // cases is named below for itself — it passed, fired another check, or fired where no
  // construction of it is read — is `broken`.
  const covered = new Set();
  const reached = new Set();
  const broken = new Set();
  for (const name of reference ? names : []) {
    const one = built(name, reference.input);
    if (!one) continue;
    const { fx, input } = one;
    covered.add(fx.check);
    try {
      checkCoverage(input);
      broken.add(fx.check);
      say(
        'passed',
        name,
        `${name}: the prepared input PASSED and was meant not to — ` +
          `point ${fx.point} (\`${fx.check}\`) stopped examining anything`,
      );
    } catch (error) {
      if (!(error instanceof CoverageError)) throw error;
      const site = placed(error, name);
      reached.add(site);
      if (error.check !== fx.check) {
        broken.add(fx.check);
        say(
          'fired-other',
          name,
          `${name}: check \`${error.check}\` fired, and point ${fx.point} ` +
            `(\`${fx.check}\`) was meant to — the fixture proves something other than ` +
            `what it declares`,
        );
      } else if (thrown.has(fx.check) && !sites(fx.check).includes(site)) {
        broken.add(fx.check);
        // What the reading puts there tells a relabel from what it cannot follow.
        const other = [...thrown.keys()].find((check) =>
          sites(check).includes(site),
        );
        say(
          'unplaced',
          name,
          `${name}: \`${fx.check}\` fired ` +
            (!site
              ? `outside ${where}, in code this reading does not hold (\`eval\`) or ` +
                `in a frame \`siteOf\` no longer places`
              : other
                ? `at ${here(site)}, where this reading puts \`${other}\` — relabelled ` +
                  `on the error`
                : `at ${here(site)}, where this reading puts no check — reached through ` +
                  `an expression it cannot follow`) +
            `; what fired is held to no case, and the case to no construction — construct ` +
            `the check by name, with its literal, where it fires`,
        );
      }
    }
  }

  // Every check has a case. The loop above walks the cases, so a check whose last case is
  // deleted leaves it nothing to notice — a promise with no machine able to fire on it, which
  // is what `req-axis` forbids. A row a construction names is a check, and needs a readable
  // case; a row none names is reported above instead, and a case is not its remedy.
  const uncovered = reference
    ? Object.keys(table).filter(
        (check) => thrown.has(check) && !covered.has(check),
      )
    : [];
  if (uncovered.length)
    say(
      'uncovered',
      uncovered.join(', '),
      `${uncovered.map((c) => `\`${c}\``).join(', ')}: no readable case declares ` +
        `${uncovered.length === 1 ? 'this check' : 'these checks'} — a check with no case ` +
        `is a promise no machine can fire on (req-axis), and nothing else notices its last ` +
        `case go`,
    );

  // Every construction of a check its cases declare is reached by one. The line above counts
  // cases by check: a construction added under a check that has one, or one no input reaches,
  // would need no case of its own — and each is a promise of its own (req-axis). One rule per
  // defect: a check no case declares is named above, whole; a check with a case named for
  // itself waits for that case, whose line names the defect; and a construction a case
  // reached under another check is that case's line.
  const unfired = [...thrown.keys()]
    .filter((check) => covered.has(check) && !broken.has(check))
    .flatMap((check) =>
      sites(check)
        .filter((site) => !reached.has(site))
        .map((site) => [check, site]),
    );
  if (unfired.length)
    say(
      'unfired',
      unfired.map(([, site]) => site).join(', '),
      `${unfired.map(([check, site]) => `\`${check}\` at ${here(site)}`).join(', ')}: ` +
        `no readable case reaches ` +
        `${unfired.length === 1 ? 'this construction' : 'these constructions'} — a ` +
        `construction no case reaches is a promise no machine can fire on (req-axis), as ` +
        `a check with no case is; give each a case that fires it, or delete the ones no ` +
        `input can`,
    );

  return {
    found,
    checks: checks.length,
    constructions: checks.reduce((n, check) => n + sites(check).length, 0),
  };
};

// ── the control's own control ─────────────────────────────────────────────────

/*
 * Every rule of the control above has a reject path that only a defective input takes — a
 * use of the class the reading cannot resolve, a case the builder cannot apply, a row no
 * readable case declares — and the real input takes none of them. A rule loosened or struck
 * out leaves the real run as green as it was: the second review of PR #18 found four such
 * escapes in one reading of the source. So the rules run, every time, over prepared inputs
 * that take each reject path, and each has to be answered as written beside it. The prepared
 * sources never spell out the class's name — `ERROR_CLASS` stands in for it — so the gate's
 * reading of its own source finds none of their constructions, by the parser or a pattern.
 */

/**
 * Prepared sources, each with what `throwsOf` has to read in it: `check:line` for every use
 * of the class it does not leave alone — a construction on the line of its `new`, any other
 * use on the name's — and `?` for a use it resolves no check from.
 */
const READINGS = [
  [
    'names that merely contain the class name',
    [`const ${ERROR_CLASS}s = [];`, `throw new My${ERROR_CLASS}('x', '');`],
    '',
  ],
  [
    'the top-level declaration, and the right side of instanceof',
    [
      `class ${ERROR_CLASS} extends Error {}`,
      `if (error instanceof ${ERROR_CLASS}) throw error;`,
      `if (error instanceof (${ERROR_CLASS})) throw error;`,
    ],
    '',
  ],
  [
    'a construction over several lines, as prettier writes one',
    [`throw new ${ERROR_CLASS}(`, `  'x',`, `  '',`, `);`],
    'x:1',
  ],
  [
    'a check in double quotes, and in backticks with no substitution',
    [
      `throw new ${ERROR_CLASS}("x", '');`,
      `throw new ${ERROR_CLASS}(\`y\`, '');`,
    ],
    'x:1 y:2',
  ],
  [
    'a check that is no literal: a variable, a concatenation, a substitution',
    [
      `throw new ${ERROR_CLASS}(check, '');`,
      `throw new ${ERROR_CLASS}('x' + check, '');`,
      `throw new ${ERROR_CLASS}(\`\${check}\`, '');`,
    ],
    '?:1 ?:2 ?:3',
  ],
  [
    'a literal that is no string: a number, a regular expression',
    [`throw new ${ERROR_CLASS}(7, '');`, `throw new ${ERROR_CLASS}(/x/, '');`],
    '?:1 ?:2',
  ],
  [
    'an empty literal, and no argument at all',
    [
      `throw new ${ERROR_CLASS}('', '');`,
      `throw new ${ERROR_CLASS}();`,
      `throw new ${ERROR_CLASS};`,
    ],
    '?:1 ?:2 ?:3',
  ],
  [
    'a helper fail(check, message)',
    [
      `const fail = (check, message) => {`,
      `  throw new ${ERROR_CLASS}(check, message);`,
      `};`,
      `fail('x', '');`,
    ],
    '?:2',
  ],
  [
    'a subclass passing a literal to super',
    [
      `class Sub extends ${ERROR_CLASS} {`,
      `  constructor() {`,
      `    super('x', '');`,
      `  }`,
      `}`,
      `throw new Sub();`,
    ],
    '?:1',
  ],
  [
    'an alias, and a shorthand property',
    [
      `const Alias = ${ERROR_CLASS};`,
      `const errors = { ${ERROR_CLASS} };`,
      `throw new Alias('x', '');`,
    ],
    '?:1 ?:2',
  ],
  [
    'an export: of the declaration, in a list, as the default',
    [
      `export class ${ERROR_CLASS} extends Error {}`,
      `export { ${ERROR_CLASS} };`,
      `export default ${ERROR_CLASS};`,
    ],
    '?:1 ?:2 ?:3',
  ],
  [
    'a class of the same name declared in an inner scope',
    [`{`, `  class ${ERROR_CLASS} extends Error {}`, `}`],
    '?:2',
  ],
  [
    'Reflect.construct',
    [`Reflect.construct(${ERROR_CLASS}, ['x', '']);`],
    '?:1',
  ],
  [
    'the class handed to another construction, and a member of it constructed',
    [
      `throw new Wrapper('x', ${ERROR_CLASS});`,
      `throw new ${ERROR_CLASS}.Inner('y', '');`,
    ],
    '?:1 ?:2',
  ],
  [
    'the class on the right of another operator: an assignment, a comma, a default',
    [
      `let Alias; Alias = ${ERROR_CLASS};`,
      `throw new (0, ${ERROR_CLASS})('x', '');`,
      `const Other = maybe ?? ${ERROR_CLASS};`,
    ],
    '?:1 ?:2 ?:3',
  ],
  [
    'the left side of instanceof',
    [`if (${ERROR_CLASS} instanceof Function) throw error;`],
    '?:1',
  ],
  [
    'new (Name)(…), in one pair of parentheses and in two, the name on a line of its own',
    [
      `throw new (${ERROR_CLASS})('x', '');`,
      `throw new ((${ERROR_CLASS}))('y', '');`,
      `throw new (`,
      `  ${ERROR_CLASS}`,
      `)('z', '');`,
    ],
    'x:1 y:2 z:3',
  ],
  [
    'a comment between new and the name, and between the name and (',
    [
      `throw new /* a comment */ ${ERROR_CLASS} /* another */ ('x', '');`,
      `throw new // a comment`,
      `  ${ERROR_CLASS} // another`,
      `  ('y', '');`,
    ],
    'x:1 y:2',
  ],
  [
    'a line comment ending in class on the line above the name',
    [`// what follows is a class`, `${ERROR_CLASS}.prototype.name = 'x';`],
    '?:2',
  ],
  [
    'a line comment ending in instanceof on the line above the name',
    [`// what follows is the right side of an instanceof`, `${ERROR_CLASS};`],
    '?:2',
  ],
  [
    'a line comment ending in new on the line above the name',
    [`// what follows is called without new`, `${ERROR_CLASS}('x', '');`],
    '?:2',
  ],
  [
    'a construction quoted in a comment',
    [
      `// throw new ${ERROR_CLASS}('x', '');`,
      `/* throw new ${ERROR_CLASS}('y', ''); */`,
      `/** throw new ${ERROR_CLASS}('z', ''); */`,
    ],
    '',
  ],
  [
    'a construction quoted in a string',
    [
      `const a = "throw new ${ERROR_CLASS}('x', '')";`,
      `const b = 'throw new ${ERROR_CLASS}("y", "")';`,
      `const c = \`throw new ${ERROR_CLASS}('z', '')\`;`,
    ],
    '',
  ],
  [
    'the name in backticks',
    [`// \`${ERROR_CLASS}\` is the class`, `const d = \`${ERROR_CLASS}\`;`],
    '',
  ],
  [
    'uses that are no construction, their expression starting a line above the name',
    [
      `const Other = maybe ??`,
      `  ${ERROR_CLASS};`,
      `const Again = (`,
      `  ${ERROR_CLASS}`,
      `);`,
    ],
    '?:2 ?:4',
  ],
];

/** What `throwsOf` reads in a source, written the way `READINGS` writes it. */
const readingOf = (source) =>
  [...throwsOf(source)]
    .flatMap(([check, at]) => at.map(({ line }) => [line, check ?? '?']))
    .sort(([a, x], [b, y]) => a - b || (x < y ? -1 : x > y ? 1 : 0))
    .map(([line, check]) => `${check}:${line}`)
    .join(' ');

/**
 * The one source file of the prepared library, a stylesheet beside it, a path it lacks, and a
 * second file for the edges where a rule reads "every" — all of two, but one.
 */
const FILE = `${PROJECT}/src/prepared.ts`;
const STYLESHEET = `${PROJECT}/src/prepared.scss`;
const ABSENT = `${PROJECT}/src/absent.ts`;
const OTHER = `${PROJECT}/src/other.ts`;

/**
 * A case's declaration, for the prepared cases that the operations beside them complete. Its
 * description is exactly the 40 characters the rule asks for, so a rule asking more refuses
 * every prepared case.
 */
const DECLARED = {
  point: 3,
  check: 'complete',
  description: 'Prepared for the own control, not a run.',
};

/** The prepared reference: every point silent over one source file and its report. */
const PREPARED_REFERENCE = {
  target: { coverage: true, coverageThresholds: { lines: 80, branches: 80 } },
  sources: [FILE],
  tree: [FILE, STYLESHEET],
  exceptions: {},
  report: {
    total: { lines: { pct: 100 }, branches: { pct: 100 } },
    files: { [FILE]: { lines: { pct: 100 } } },
  },
};

/** The prepared reference with its report changed. */
const withReport = (report) => ({
  ...PREPARED_REFERENCE,
  report: { ...PREPARED_REFERENCE.report, ...report },
});

/**
 * The prepared input every entry below changes: two rows, a source that constructs both, the
 * reference, a well-formed case for each row, and the site in the source of what each case
 * fires — on it the control finds nothing. The checks a case runs are this gate's own, so the
 * construction it fires stands in this file, not in the prepared source: where it stands
 * there is prepared too, by case, as `line:column` of the `new`.
 */
const PREPARED = {
  source: [
    `class ${ERROR_CLASS} extends Error {}`,
    `throw new ${ERROR_CLASS}('report', '');`,
    `throw new ${ERROR_CLASS}('complete', '');`,
  ],
  table: { report: 1, complete: 3 },
  files: {
    [REFERENCE]: PREPARED_REFERENCE,
    'report.json': { ...DECLARED, point: 1, check: 'report', dropReport: true },
    'complete.json': { ...DECLARED, dropFromReport: [FILE] },
  },
  sites: { 'report.json': '2:7', 'complete.json': '3:7' },
};

/** What reading a file throws when it cannot be read. */
const unreadable = (code) =>
  Object.assign(new Error(`${code}: a prepared file`), { code });

/**
 * Prepared files read the way `readFileSync` reads a directory: a string is a file's text, a
 * value is written as JSON, an error is what reading the file throws, and a file not there
 * throws `ENOENT`.
 */
const readFrom = (files) => (name) => {
  const file = has(files, name) ? files[name] : undefined;
  if (file === undefined) throw unreadable('ENOENT');
  if (file instanceof Error) throw file;
  return typeof file === 'string' ? file : JSON.stringify(file);
};

/**
 * Changes to the prepared input, each with what the control has to find on it: the rule, what
 * it fires on, and for a refusal a part of its reason. Nothing else may be found.
 */
const ANSWERS = [
  ['the prepared input as it stands', {}, []],
  [
    'no case at all',
    { files: { 'report.json': undefined, 'complete.json': undefined } },
    [
      ['no-cases', ''],
      ['uncovered', 'report, complete'],
    ],
  ],
  [
    'a literal phantom with no row, and a second',
    {
      source: [
        ...PREPARED.source,
        `throw new ${ERROR_CLASS}('impossible', '');`,
        `throw new ${ERROR_CLASS}('unheard', '');`,
      ],
    },
    [
      [
        'unlisted',
        'impossible, unheard',
        '`impossible` (the prepared source:4), `unheard` (the prepared source:5):',
      ],
    ],
  ],
  [
    'a row nothing names',
    { table: { ...PREPARED.table, templates: 6 } },
    [['unthrown', 'templates']],
  ],
  [
    'a use the reading resolves no check from, twice on one line',
    {
      source: [
        ...PREPARED.source,
        `const Alias = ${ERROR_CLASS}, Again = ${ERROR_CLASS};`,
      ],
    },
    [['unresolved', '4', 'the prepared source:4:']],
  ],
  [
    'every use unresolved, no check constructed',
    {
      source: [
        PREPARED.source[0],
        `const Alias = ${ERROR_CLASS};`,
        `const Again = ${ERROR_CLASS};`,
      ],
    },
    [
      ['unresolved', '2, 3', 'the prepared source:2, the prepared source:3:'],
      ['unthrown', 'report, complete'],
    ],
  ],
  [
    'a gate of one check',
    {
      source: PREPARED.source.slice(0, 2),
      table: { report: 1 },
      files: { 'complete.json': undefined },
    },
    [],
  ],
  [
    'a phantom named like a member of every object',
    {
      source: [
        ...PREPARED.source,
        `throw new ${ERROR_CLASS}('constructor', '');`,
      ],
    },
    [['unlisted', 'constructor']],
  ],
  [
    'a class of another name than ERROR_CLASS',
    {
      source: PREPARED.source.map((line) =>
        line.replaceAll(ERROR_CLASS, 'AnotherError'),
      ),
    },
    [['no-reference', '', 'the prepared source: no reference']],
  ],
  [
    'a source the parser reads otherwise than Node runs it',
    {
      source: [
        ...PREPARED.source,
        `throw new ${ERROR_CLASS}('impossible', '');`,
        'const r = 1 </x/.source.length;',
      ],
    },
    [
      [
        'misread',
        '5',
        'the prepared source:5: the TypeScript parser reads this file with 2 errors',
      ],
    ],
  ],
  [
    'a source the parser misreads in one place',
    {
      source: [
        ...PREPARED.source,
        `throw new ${ERROR_CLASS}('impossible', '');`,
        'r = 1 </x/i;',
      ],
    },
    [
      [
        'misread',
        '5',
        'the prepared source:5: the TypeScript parser reads this file with an error',
      ],
    ],
  ],
  [
    'a source misread in two places, the first not on the last line',
    {
      source: [
        ...PREPARED.source,
        'r = 1 </x/i;',
        `throw new ${ERROR_CLASS}('impossible', '');`,
        's = 2 </y/i;',
      ],
    },
    [
      [
        'misread',
        '4',
        'the prepared source:4: the TypeScript parser reads this file with 2 errors',
      ],
    ],
  ],
  [
    'a reference that does not pass',
    {
      files: {
        [REFERENCE]: withReport({
          total: { lines: { pct: 50 }, branches: { pct: 100 } },
        }),
      },
    },
    [['reference-fails', 'result']],
  ],
  [
    'a row whose one case passes',
    { files: { 'complete.json': { ...DECLARED, pct: 90 } } },
    [['passed', 'complete.json']],
  ],
  [
    'a row whose one case fires another check',
    {
      files: { 'complete.json': { ...DECLARED, dropReport: true } },
      sites: { 'complete.json': '2:7' },
    },
    [['fired-other', 'complete.json']],
  ],
  [
    'a case that fires another check',
    { files: { 'stray.json': { ...DECLARED, dropReport: true } } },
    [['fired-other', 'stray.json']],
  ],
  [
    'a case that fires another check on its own point',
    {
      source: [
        ...PREPARED.source,
        `throw new ${ERROR_CLASS}('foreign-report', '');`,
      ],
      table: { ...PREPARED.table, 'foreign-report': 1 },
      files: {
        'foreign.json': {
          ...DECLARED,
          point: 1,
          check: 'foreign-report',
          reportRoot: '../x',
        },
        'stray.json': {
          ...DECLARED,
          point: 1,
          check: 'foreign-report',
          dropReport: true,
        },
      },
      sites: { 'foreign.json': '4:7', 'stray.json': '2:7' },
    },
    [['fired-other', 'stray.json']],
  ],
  [
    'the line total changed alone, below the branch threshold',
    {
      files: {
        [REFERENCE]: {
          ...PREPARED_REFERENCE,
          target: {
            coverage: true,
            coverageThresholds: { lines: 80, branches: 95 },
          },
        },
        'lines.json': { ...DECLARED, pct: 90 },
      },
    },
    [['passed', 'lines.json']],
  ],
  [
    'the branch total changed alone, below the line threshold',
    {
      files: {
        [REFERENCE]: {
          ...PREPARED_REFERENCE,
          target: {
            coverage: true,
            coverageThresholds: { lines: 95, branches: 80 },
          },
        },
        'branches.json': { ...DECLARED, branchPct: 90 },
      },
    },
    [['passed', 'branches.json']],
  ],
  [
    'a row whose one case is malformed',
    {
      files: {
        'complete.json': { ...PREPARED.files['complete.json'], point: 6 },
      },
    },
    [
      ['malformed', 'complete.json', "one of this gate's checks"],
      ['uncovered', 'complete'],
    ],
  ],
  [
    'a row with no case',
    { files: { 'complete.json': undefined } },
    [['uncovered', 'complete']],
  ],
  [
    'a second construction of a check, fired by no case',
    {
      source: [...PREPARED.source, `throw new ${ERROR_CLASS}('complete', '');`],
    },
    [['unfired', '4:7', '`complete` at the prepared source:4:7']],
  ],
  [
    'the first of two constructions of a check, reached by no case',
    {
      source: [...PREPARED.source, `throw new ${ERROR_CLASS}('complete', '');`],
      sites: { 'complete.json': '4:7' },
    },
    [['unfired', '3:7']],
  ],
  [
    'a check waiting for its case, beside a construction of another no case reaches',
    {
      source: [
        ...PREPARED.source,
        `throw new ${ERROR_CLASS}('complete', '');`,
        `throw new ${ERROR_CLASS}('report', '');`,
      ],
      files: { 'complete-too.json': { ...DECLARED, pct: 90 } },
    },
    [
      ['passed', 'complete-too.json'],
      ['unfired', '5:7'],
    ],
  ],
  [
    'three constructions of a check, only the first reached',
    {
      source: [
        ...PREPARED.source,
        `throw new ${ERROR_CLASS}('complete', '');`,
        `throw new ${ERROR_CLASS}('complete', '');`,
      ],
    },
    [['unfired', '4:7, 5:7']],
  ],
  [
    'a construction only a malformed case would reach',
    {
      source: [...PREPARED.source, `throw new ${ERROR_CLASS}('complete', '');`],
      files: {
        'complete-too.json': {
          ...DECLARED,
          point: 6,
          dropFromReport: [FILE],
          pct: 90,
        },
      },
      sites: { 'complete-too.json': '4:7' },
    },
    [
      ['malformed', 'complete-too.json', "one of this gate's checks"],
      ['unfired', '4:7'],
    ],
  ],
  [
    'a construction whose name stands in parentheses, placed at its new',
    {
      source: [
        PREPARED.source[0],
        PREPARED.source[1],
        `throw new (${ERROR_CLASS})('complete', '');`,
      ],
    },
    [],
  ],
  [
    'a construction with a comment before its new, placed at the new',
    {
      source: [
        PREPARED.source[0],
        PREPARED.source[1],
        `throw /* why */ new ${ERROR_CLASS}('complete', '');`,
      ],
      sites: { 'complete.json': '3:17' },
    },
    [],
  ],
  [
    'a case that fires its check where the reading resolves no check',
    {
      source: [...PREPARED.source, `throw new ${ERROR_CLASS}(check, '');`],
      sites: { 'report.json': '4:7' },
    },
    [
      ['unresolved', '4'],
      ['unplaced', 'report.json', 'where this reading puts no check'],
    ],
  ],
  [
    'a case that fires its check where the reading puts a check with no row',
    {
      source: [
        ...PREPARED.source,
        `throw new ${ERROR_CLASS}('impossible', '');`,
      ],
      sites: { 'report.json': '4:7' },
    },
    [
      ['unlisted', 'impossible'],
      ['unplaced', 'report.json', 'where this reading puts `impossible`'],
    ],
  ],
  [
    'a check of two constructions waiting for its case that fires another check',
    {
      source: [...PREPARED.source, `throw new ${ERROR_CLASS}('complete', '');`],
      files: { 'complete-too.json': { ...DECLARED, dropReport: true } },
      sites: { 'complete-too.json': '2:7' },
    },
    [['fired-other', 'complete-too.json']],
  ],
  [
    'a check of two constructions waiting for its case that fires where none of them is read',
    {
      source: [...PREPARED.source, `throw new ${ERROR_CLASS}('complete', '');`],
      files: {
        'complete-too.json': { ...DECLARED, dropFromReport: [FILE], pct: 90 },
      },
      sites: { 'complete-too.json': '2:7' },
    },
    [
      [
        'unplaced',
        'complete-too.json',
        'at the prepared source:2:7, where this reading puts `report`',
      ],
    ],
  ],
  [
    'two constructions of a check, each fired by a case of its own',
    {
      source: [...PREPARED.source, `throw new ${ERROR_CLASS}('complete', '');`],
      files: {
        'complete-too.json': { ...DECLARED, dropFromReport: [FILE], pct: 90 },
      },
      sites: { 'complete-too.json': '4:7' },
    },
    [],
  ],
  [
    'two constructions of a check on one line, one of them fired',
    {
      source: [
        PREPARED.source[0],
        `${PREPARED.source[1]} ${PREPARED.source[1]}`,
        PREPARED.source[2],
      ],
    },
    // The second `new` stands a statement and a space past the first.
    [['unfired', `2:${PREPARED.source[1].length + 1 + 7}`]],
  ],
  [
    'a construction only a case of another check reaches',
    {
      source: [...PREPARED.source, `throw new ${ERROR_CLASS}('report', '');`],
      files: { 'other.json': { ...DECLARED, dropReport: true } },
      sites: { 'other.json': '4:7' },
    },
    [['fired-other', 'other.json']],
  ],
  [
    'a construction reached as another check, as a relabelled one is',
    {
      source: [...PREPARED.source, `throw new ${ERROR_CLASS}('complete', '');`],
      sites: { 'report.json': '4:7' },
    },
    [
      [
        'unplaced',
        'report.json',
        'at the prepared source:4:7, where this reading puts `complete` — relabelled',
      ],
    ],
  ],
  [
    'a case that fires its check where the reading puts no construction of it',
    { sites: { 'report.json': '3:7' } },
    [
      [
        'unplaced',
        'report.json',
        'at the prepared source:3:7, where this reading puts `complete`',
      ],
    ],
  ],
  [
    'a case that fires its check on the line of its construction, at another column',
    { sites: { 'report.json': '2:8' } },
    [
      [
        'unplaced',
        'report.json',
        'at the prepared source:2:8, where this reading puts no check — reached',
      ],
    ],
  ],
  [
    'a case that fires its check outside the source',
    { sites: { 'report.json': undefined } },
    [
      [
        'unplaced',
        'report.json',
        'outside the prepared source, in code this reading does not hold',
      ],
    ],
  ],
  [
    'a metric of the reference that is no object',
    {
      files: {
        [REFERENCE]: withReport({
          files: { [FILE]: { lines: { pct: 100 }, functions: 7 } },
        }),
        'malformed.json': {
          ...DECLARED,
          filePct: { [FILE]: { functions: 50 } },
        },
      },
    },
    [['malformed', 'malformed.json', 'no such number to change']],
  ],
  [
    'a move that lands one of two files on a file the report holds',
    {
      files: {
        [REFERENCE]: withReport({
          files: {
            [FILE]: { lines: { pct: 100 } },
            [OTHER]: { lines: { pct: 100 } },
            [`x/${FILE}`]: { lines: { pct: 100 } },
          },
        }),
        'malformed.json': {
          ...DECLARED,
          reportRoot: 'x',
          reportRootFiles: [FILE, OTHER],
        },
      },
    },
    [['malformed', 'malformed.json', 'leaves a file where it was']],
  ],
];

const NO_REPORT = 'leaves no report for the other report operations';
const UNCHANGED = 'builds the reference input unchanged';
const NO_SHAPE = 'the reference holds no report whose every file is an object';

/**
 * Cases the builder has to refuse, each with a part of the reason it has to give: operations
 * over `DECLARED`, or a file's text, or the error reading it throws. A refusal that gives
 * another reason is a rule gone quiet behind a neighbour.
 */
const REFUSED = [
  ['{', 'not JSON'],
  ['[]', 'the file is not an object'],
  ['null', 'the file is not an object'],
  ['7', 'the file is not an object'],
  ['"x"', 'the file is not an object'],
  ['true', 'the file is not an object'],
  [unreadable('ENOENT'), 'the file is missing'],
  [unreadable('EACCES'), 'the file cannot be read (EACCES)'],
  [{ dropReprot: true }, 'is no key a case may carry'],
  [{ constructor: 1 }, 'is no key a case may carry'],
  [{ pct: '50' }, 'must be a number'],
  [{ branchPct: '50' }, 'must be a number'],
  [{ reportRoot: 7 }, 'must be a string'],
  [{ dropReport: 'yes' }, 'must be a boolean'],
  [{ clearSources: 'yes' }, 'must be a boolean'],
  [{ clearTree: 1 }, 'must be a boolean'],
  [{ absoluteReport: 'yes' }, 'must be a boolean'],
  [{ filePct: [] }, 'must be an object'],
  [{ dropReport: false }, 'reads false, which changes nothing'],
  [{ clearSources: false }, 'reads false, which changes nothing'],
  [{ clearTree: false }, 'reads false, which changes nothing'],
  [{ absoluteReport: false }, 'reads false, which changes nothing'],
  [{ dropReport: true, dropFromReport: [FILE] }, NO_REPORT],
  [{ dropReport: true, pct: 50 }, NO_REPORT],
  [{ dropReport: true, branchPct: 50 }, NO_REPORT],
  [{ dropReport: true, filePct: { [FILE]: { lines: 50 } } }, NO_REPORT],
  [{ dropReport: true, reportRoot: '../x' }, NO_REPORT],
  [{ dropReport: true, reportRootFiles: [FILE] }, NO_REPORT],
  [{ dropReport: true, absoluteReport: true }, NO_REPORT],
  [{ dropFromSources: FILE }, 'must be a list of paths'],
  [{ dropFromSources: [7] }, 'must be a list of paths'],
  [{ dropFromSources: [FILE, 7] }, 'must be a list of paths'],
  [{ dropFromSources: null }, 'must be a list of paths'],
  [{ reportRoot: '../x', reportRootFiles: null }, 'must be a list of paths'],
  [{ dropFromSources: [FILE, FILE] }, 'names a path twice'],
  [{ dropFromSources: [ABSENT] }, 'which is not there'],
  [{ dropFromTree: [ABSENT] }, 'which is not there'],
  [{ dropFromTree: [FILE, ABSENT] }, 'which is not there'],
  [{ dropFromReport: [ABSENT] }, 'which is not there'],
  [{ reportRoot: '../x', reportRootFiles: [ABSENT] }, 'which is not there'],
  [{ addToTree: [FILE] }, 'which is already there'],
  [{ filePct: { [ABSENT]: { lines: 50 } } }, 'which the report does not hold'],
  [{ filePct: { [FILE]: 50 } }, 'which the report does not hold'],
  [
    { filePct: { constructor: { lines: 50 } } },
    'which the report does not hold',
  ],
  [{ filePct: { [FILE]: { functions: 50 } } }, 'no such number to change'],
  [{ filePct: { [FILE]: { ['__proto__']: 50 } } }, 'no such number to change'],
  [{ filePct: { [FILE]: { lines: '50' } } }, 'no such number to change'],
  [{ reportRootFiles: [FILE] }, 'and there is no `reportRoot`'],
  [{ reportRoot: '', reportRootFiles: [FILE] }, 'leaves a file where it was'],
  [{ reportRootFiles: null }, 'and there is no `reportRoot`'],
  [
    { reportRoot: '../x', reportRootFiles: [] },
    'no file of the report to move',
  ],
  [{ reportRoot: '' }, 'leaves a file where it was'],
  [{ reportRoot: '/x', absoluteReport: true }, 'no key to make absolute'],
  [{ dropFromReport: [FILE], absoluteReport: true }, 'no key to make absolute'],
  [{ check: 'impossible', point: undefined }, "one of this gate's checks"],
  [{ point: 1 }, "one of this gate's checks"],
  [{ description: undefined }, 'has to say, in `description`'],
  [{ description: ` ${'x'.repeat(39)} ` }, 'has to say, in `description`'],
  [{ pct: 100 }, UNCHANGED],
  [{ dropFromTree: [FILE], addToTree: [FILE] }, UNCHANGED],
  [
    {
      target: {
        coverageThresholds: { branches: 80, lines: 80 },
        coverage: true,
      },
    },
    UNCHANGED,
  ],
];

/** References the builder has to refuse, each with a part of the reason it has to give. */
const REFERENCE_REFUSED = [
  ['that is not JSON', '{', 'not JSON'],
  [
    'that is missing',
    unreadable('ENOENT'),
    'the file is missing; every case is built on it, so none of the 2 was judged',
  ],
  [
    'that cannot be read',
    unreadable('EACCES'),
    'the file cannot be read (EACCES)',
  ],
  ['that is a list', '[]', 'the file is not an object'],
  ['with no report', { ...PREPARED_REFERENCE, report: undefined }, NO_SHAPE],
  [
    'whose sources are no list',
    { ...PREPARED_REFERENCE, sources: FILE },
    'must be a list of paths',
  ],
  [
    'whose tree names a path twice',
    { ...PREPARED_REFERENCE, tree: [FILE, FILE, STYLESHEET] },
    'names a path twice',
  ],
  ['whose files are a list', withReport({ files: [] }), NO_SHAPE],
  [
    'with one file of two that is no object',
    withReport({ files: { [FILE]: { lines: { pct: 100 } }, [OTHER]: 7 } }),
    NO_SHAPE,
  ],
  [
    'with a file that is no object',
    withReport({ files: { [FILE]: 7 } }),
    NO_SHAPE,
  ],
  [
    'with no line total',
    withReport({ total: { branches: { pct: 100 } } }),
    NO_SHAPE,
  ],
  [
    'with no branch total',
    withReport({ total: { lines: { pct: 100 } } }),
    NO_SHAPE,
  ],
];

/** A prepared file as a message names it. */
const shown = (file) =>
  file instanceof Error
    ? `a file whose reading throws ${file.code}`
    : typeof file === 'string'
      ? `a file that reads ${JSON.stringify(file)}`
      : JSON.stringify(file, (key, value) =>
          value === undefined ? '(none)' : value,
        );

/** Every prepared input the control is run over, with what it has to find there. */
const PREPARED_INPUTS = [
  ...ANSWERS,
  ...REFUSED.map(([file, reason]) => [
    `the case ${shown(file)}`,
    {
      files: {
        'malformed.json':
          isObject(file) && !(file instanceof Error)
            ? { ...DECLARED, ...file }
            : file,
      },
    },
    [['malformed', 'malformed.json', reason]],
  ]),
  ...REFERENCE_REFUSED.map(([what, file, reason]) => [
    `the reference ${what}`,
    { files: { [REFERENCE]: file } },
    [['malformed', REFERENCE, reason]],
  ]),
];

/**
 * Frames `siteOf` has to place, each with the site it has to give. The run holds the rest of
 * it: every construction a real case fires has to stand where the reading puts one, but every
 * one of them stands in this file, so what places a frame of another script — unnamed, as an
 * `eval` makes, or another file — is held here.
 */
const PLACES = [
  [
    'a frame of this file',
    { scriptName: import.meta.url, lineNumber: 12, columnNumber: 5 },
    '12:5',
  ],
  [
    'a frame of another script, as an `eval` makes',
    { scriptName: '', lineNumber: 12, columnNumber: 5 },
    null,
  ],
  [
    'a frame of another file',
    {
      scriptName: new URL('other.mjs', import.meta.url).href,
      lineNumber: 12,
      columnNumber: 5,
    },
    null,
  ],
  [
    'a frame of a file of the same name in another directory',
    {
      scriptName: new URL(
        `other/${import.meta.url.split('/').pop()}`,
        import.meta.url,
      ).href,
      lineNumber: 12,
      columnNumber: 5,
    },
    null,
  ],
  [
    'a frame of this file loaded again under a query, another module',
    { scriptName: `${import.meta.url}?again`, lineNumber: 12, columnNumber: 5 },
    null,
  ],
];

/**
 * The control's own control: every prepared source read as written, every prepared frame
 * placed as written, every prepared input answered as written, and anything else a violation
 * that names the prepared input. The counts are of what it ran, so the green line cannot
 * claim a control that did not run.
 */
const ownControl = () => {
  const violations = [];
  let sources = 0;
  let frames = 0;
  let inputs = 0;
  for (const [what, source, expected] of READINGS) {
    sources++;
    let read;
    try {
      read = readingOf(source.join('\n'));
    } catch (error) {
      read = `an error (${error.message})`;
    }
    if (read !== expected)
      violations.push(
        `the control's own control, the prepared source "${what}": \`throwsOf\` has to ` +
          `read ${expected || 'nothing'} in it, and reads ${read || 'nothing'} — the table ` +
          `would now be held to a reading that is not the source's`,
      );
  }
  const where = (site) => (site ? `at ${site}` : 'nowhere');
  for (const [what, frame, expected] of PLACES) {
    frames++;
    const site = siteOf(frame);
    if (site !== expected)
      violations.push(
        `the control's own control, the prepared frame "${what}": \`siteOf\` has to ` +
          `place it ${where(expected)}, and places it ${where(site)} — a case would be ` +
          `held to a construction other than the one it fired`,
      );
  }
  const said = ([rule, subject, reason]) =>
    `${rule}${subject ? ` ${subject}` : ''}${reason ? ` (${reason})` : ''}`;
  for (const [what, change, expected] of PREPARED_INPUTS) {
    inputs++;
    const files = { ...PREPARED.files, ...change.files };
    const sites = { ...PREPARED.sites, ...change.sites };
    let found;
    try {
      ({ found } = controlOf({
        source: (change.source ?? PREPARED.source).join('\n'),
        where: 'the prepared source',
        table: change.table ?? PREPARED.table,
        names: Object.keys(files)
          .filter((name) => name !== REFERENCE && files[name] !== undefined)
          .sort(),
        read: readFrom(files),
        placed: (_, name) => (has(sites, name) ? (sites[name] ?? null) : null),
      }));
    } catch (error) {
      violations.push(
        `the control's own control, "${what}": the control throws on it (${error.message})`,
      );
      continue;
    }
    const left = [...found];
    const unmet = expected.filter(([rule, subject, reason = '']) => {
      const at = left.findIndex(
        (f) =>
          f.rule === rule && f.subject === subject && f.text.includes(reason),
      );
      if (at !== -1) left.splice(at, 1);
      return at === -1;
    });
    if (unmet.length || left.length)
      violations.push(
        `the control's own control, "${what}": the control has to find ` +
          `${expected.map(said).join(', ') || 'nothing'}` +
          (unmet.length ? `, and misses ${unmet.map(said).join(', ')}` : '') +
          (left.length
            ? `, and finds ${left.map((f) => `${f.rule}: ${f.text}`).join(' | ')}`
            : '') +
          ` — a rule of the control that answers a prepared input otherwise answers the ` +
          `real one otherwise too, and on the real one it is silent either way`,
      );
  }
  return { violations, sources, frames, inputs };
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
const control = controlOf({
  source: readFileSync(GATE, 'utf8'),
  where: relative(ROOT, GATE),
  table: CHECK_POINTS,
  names: cases,
  read: (name) => readFileSync(join(FIXTURES, name), 'utf8'),
  placed: ({ site }) => site,
});
const own = ownControl();
problems.push(...control.found.map(({ text }) => text), ...own.violations);

// ── result ────────────────────────────────────────────────────────────────────

if (problems.length) {
  console.error(`X Coverage gate — ${problems.length} violations:\n`);
  for (const p of problems) console.error(`  - ${p}`);
  console.error('');
  process.exit(1);
}

console.log(
  `✓ Coverage: ${summary}. Negative control: the reference input passes, ` +
    `${cases.length} prepared ones rejected on their own points, each of the ` +
    `${control.checks} checks the gate's constructions name has its row and a case, and ` +
    `each of its ${control.constructions} constructions a case that fires it. Its own ` +
    `control: ${own.sources} prepared sources read as written, ${own.frames} prepared ` +
    `frames placed as written, and ${own.inputs} prepared inputs answered as written.`,
);
