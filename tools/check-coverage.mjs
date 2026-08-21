#!/usr/bin/env node
/**
 * Coverage gate: does the report measure the WHOLE library, and is the threshold from
 * `req-quality-coverage` really enforced? A file with no test drops OUT of the report
 * rather than showing up with a zero, so a threshold over that number is a gate born dead
 * ([`lesson-45`](../docs/lessons.md#lesson-45)) — hence the check on the denominator.
 *
 *  1. the report exists at all and has a total for every enforced metric,
 *  2. the list of source files is not empty (else point 3 has nothing to examine),
 *  3. COMPLETE: every source file of the library — its templates included — is in the report,
 *  4. the `test` target declares a line AND a branch threshold, neither below MINIMUM,
 *  5. the report meets both declared thresholds,
 *  6. every template meets a floor of its own, on each of the four metrics.
 *
 * Point 3 catches the regression; 4 and 5 guard the number it produced. Point 6 is the only
 * one that sees a template at all: in the whole-report figure they are a rounding error —
 * `select.html` could go entirely unrendered and the line total would still read 93.37%,
 * thirteen points above the floor ([`lesson-71`](../docs/lessons.md#lesson-71)). A seventh
 * run examines the gate itself (`req-quality-negative-control`): `check-coverage.fixtures/`.
 *
 * Usage: node tools/check-coverage.mjs
 */
import { existsSync, globSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
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
 */
const SOURCES = [
  `${PROJECT}/src/**/*.ts`,
  `${PROJECT}/*/src/**/*.ts`,
  `${PROJECT}/src/**/*.html`,
  `${PROJECT}/*/src/**/*.html`,
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
  // Testing utilities. They have no `ng-package.json`, so they do not travel in the
  // package, and a failure shows up as a broken test, not as a silent defect downstream.
  (p) => p.startsWith(`${PROJECT}/testing/`),
  // The version stamp generated by `stamp-version` — a single constant, and its agreement
  // with the manifest is watched by `check-package` (point 4), not by a unit test.
  (p) => p === `${PROJECT}/src/version.ts`,
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
 * A violation of one of the six checks. It carries the check's identifier, not just the
 * message: the negative control has to verify that a prepared input fired ON ITS OWN
 * point — a fixture failing for a reason other than the one written into it proves
 * something other than what it declares.
 */
class CoverageError extends Error {
  constructor(check, description) {
    super(description);
    this.check = check;
  }
}

/**
 * The full set of checks over a ready input:
 *   `report` — `{ total, files }` with paths relative to the repository root (or null),
 *   `sources` — the files that MUST be in the report,
 *   `target` — the options of the `test` target from `project.json`,
 *   `exceptions` — the templates allowed below the floor, by file and by metric.
 * Throws `CoverageError` on the first violation — the checks run from the most basic one,
 * so the later ones would have nothing to examine anyway.
 */
const checkCoverage = ({ report, sources, target, exceptions }) => {
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

// ── negative control ──────────────────────────────────────────────────────────

const readFixture = (name) =>
  JSON.parse(readFileSync(join(FIXTURES, name), 'utf8'));

/**
 * Builds a case's input ON A COPY of the reference one, so the case file holds nothing but
 * its own defect — you cannot break something in passing and not notice.
 */
const buildFixture = (fx) => {
  const reference = readFixture(REFERENCE);
  const input = {
    report: structuredClone(reference.report),
    sources: [...reference.sources],
    target: structuredClone(reference.target),
    exceptions: structuredClone(reference.exceptions),
  };
  if (fx.dropReport) input.report = null;
  if (fx.clearSources) input.sources = [];
  for (const p of fx.dropFromReport ?? []) delete input.report.files[p];
  if (fx.pct !== undefined) input.report.total.lines.pct = fx.pct;
  if (fx.branchPct !== undefined)
    input.report.total.branches.pct = fx.branchPct;
  for (const [path, metrics] of Object.entries(fx.filePct ?? {}))
    for (const [metric, value] of Object.entries(metrics))
      input.report.files[path][metric].pct = value;
  if (fx.target !== undefined) input.target = fx.target;
  if (fx.exceptions !== undefined) input.exceptions = fx.exceptions;
  return input;
};

// ── the run ───────────────────────────────────────────────────────────────────

const problems = [];
let summary = null;

try {
  summary = checkCoverage({
    report: readReport(),
    sources: librarySources(),
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

// The reference input MUST pass. Were it defective itself, every case would fire because
// of it rather than because of its own defect — and every "it fired" would be false.
try {
  checkCoverage(buildFixture({}));
} catch (error) {
  if (!(error instanceof CoverageError)) throw error;
  problems.push(
    `${REFERENCE}: the reference input does NOT pass (${error.check}) — ` +
      `every prepared case now fires because of it.\n    ${error.message}`,
  );
}

for (const name of cases) {
  const fx = readFixture(name);
  try {
    checkCoverage(buildFixture(fx));
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

// ── result ────────────────────────────────────────────────────────────────────

if (problems.length) {
  console.error(`X Coverage gate — ${problems.length} violations:\n`);
  for (const p of problems) console.error(`  - ${p}`);
  console.error('');
  process.exit(1);
}

console.log(
  `✓ Coverage: ${summary}. Negative control: the reference input passes, ` +
    `${cases.length} prepared ones rejected on their own points.`,
);
