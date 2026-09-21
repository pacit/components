#!/usr/bin/env node
/**
 * Mutation run gate: do the unit tests catch anything (`req-quality-unit`)? Stryker answers
 * that and can fail on it, but by DEFAULT does neither: `thresholds.break` is `null`, so a
 * run ends zero at 4% as at 94%.
 *
 *  1. DENOMINATOR: the measurement exists, is not empty and is CURRENT with the sources,
 *  2. the inventory matches the policy both ways, every source file in it or excused,
 *  3. TEST DENOMINATOR: the run executed exactly the specs the `test` target does,
 *  4. the threshold is declared, binding, and cannot be disarmed from the command,
 *  5. the denominator is not narrowed: ignorers, excluded mutators, static mutants,
 *  6. the result: a hard floor, a TWO-SIDED tolerance on what assertions caught, the prose,
 *  7. EQUIVALENT: a survivor excused as unkillable is named, still alive, and reasoned,
 *  8. both targets (`mutation`, `check-mutation`) run in CI.
 *
 * "What the run really did" comes from the report's `config`, which carries the EFFECTIVE
 * configuration: the file plus whatever the command line added. Point 3 has a Vitest
 * configuration of its own; point 7 keys on the mutant, so an excuse dies with its line.
 *
 * Usage: node tools/check-mutation.mjs [--write]  (--write: rewrite the result snapshot)
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FIXTURES = join(ROOT, 'tools/check-mutation.fixtures');
const REFERENCE = '_reference.json';

const PROJECT = 'libs/components';
const REPORT = 'tmp/mutation/mutation.json';
const POLICY = `${PROJECT}/mutation.policy.json`;
const CONFIG = `${PROJECT}/stryker.config.json`;
const SNAPSHOT = `${PROJECT}/mutation.snapshot.md`;
const WORKFLOWS = ['.github/workflows/ci.yml', '.github/workflows/nightly.yml'];

const WRITE = process.argv.includes('--write');

/** Stryker's own ceiling on the initial, instrumented run of the whole suite. */
const DRY_RUN_DEFAULT_MINUTES = 5;

/** Spec file pattern — the denominator of point 3. */
const SPEC = /\.spec\.ts$/;

/**
 * What a source file of the library IS — the candidate set of the measurement, that is the
 * denominator of the denominator. Deliberately NOT read from `mutate`: a list taken from
 * the configuration would strike a file off both sides of the comparison at once and the
 * rule walking it would stop seeing anything (`check-coverage` computes its own list for
 * exactly this reason). The exceptions are CATEGORIES rather than files, and each carries
 * the reason it is one; a single file left out is a matter for the policy's register.
 */
const NOT_A_SOURCE = [
  // Anything that is not TypeScript. Stryker mutates `.ts` and nothing else, so what a
  // template promises stands outside this measurement altogether — that half is held by
  // `check-coverage` point 6, a floor per template on all four metrics.
  (p) => !p.endsWith('.ts'),
  // The tests themselves.
  (p) => SPEC.test(p),
  // Pure types: they vanish at compilation, so there is no executable line to break.
  (p) => p.endsWith('.types.ts'),
  // Re-export barrels. `export * from './x'` promises nothing that the file it names does
  // not promise itself — and the same three lines stand in `mutate` as exclusions.
  (p) => p.endsWith('/index.ts'),
  // The harness entrypoint (`@pacit/components/testing`). Its harnesses are declarations
  // over the parts inventory, held to the built package by `check-harness` in both
  // directions, and the base class's few methods are driven by the harness spec; the
  // mutation run's scope is the components' own logic (`mutation.policy.json`), and a
  // defect here reaches nobody's application — the entrypoint is imported by tests alone.
  (p) => p.startsWith(`${PROJECT}/testing/`),
  // The version stamp `stamp-version` writes — one constant, whose agreement with the
  // manifest is `check-package`'s point 4 and not a unit test's.
  (p) => p === `${PROJECT}/src/version.ts`,
  // The mutation run's own harness: it is what RUNS the specs, not something they measure.
  (p) => p === `${PROJECT}/mutation.setup.ts`,
  // The schematics: the `ng add` one and the `ng update` migrations. Both run once, in the
  // consumer's CLI, and each is measured where it can be — `check-consumer` installs the
  // package into a real application and runs `ng add` there, while of a migration it asks
  // only whether the collection and the factory reach the archive, because nothing in this
  // workspace executes one. A migration's cases therefore stand in `test` alone: nothing
  // under here is mutated, so the run never selects the spec that holds them, which is the
  // case the policy's `coversNothing` register was written for.
  (p) => p.startsWith(`${PROJECT}/schematics/`),
];

/** The library's source files, off the git index — everything `NOT_A_SOURCE` leaves. */
const librarySources = (inRepo) =>
  (Array.isArray(inRepo) ? inRepo : []).filter(
    (p) => typeof p === 'string' && !NOT_A_SOURCE.some((no) => no(p)),
  );

/**
 * The mutant statuses Stryker counts as DETECTED. `Timeout` stands beside `Killed` not out
 * of courtesy but because that is how the score is computed — and that is exactly why
 * point 5 asks separately how large the clock's share is.
 */
const DETECTED = ['Killed', 'Timeout'];
/** The statuses counted into the denominator. `Ignored` is NOT one — hence point 5. */
const DENOMINATOR = [...DETECTED, 'Survived', 'NoCoverage', 'RuntimeError'];

/**
 * The strings by which a disarmed target command is recognised. `--force` tells Stryker to
 * ignore the incremental result, `--dryRunOnly` ends the run BEFORE a single mutant is
 * executed (and exits zero), and a shell operator eats the exit code — so
 * `thresholds.break` stops meaning anything.
 */
const DISARMING = [
  ['shell operator', /\|\||;\s*(?:true|exit\s+0)|&&\s*true\s*$/],
  ['--dryRunOnly', /--dry-?[Rr]un[Oo]nly/],
  ['--thresholds', /--thresholds/],
  ['--ignoreStatic', /--ignore-?[Ss]tatic/],
  ['--mutate', /--mutate/],
  ['--ignorers', /--ignorers/],
];

/**
 * Comments that disarm Stryker IN THE SOURCE. They enter the repository with no line in
 * the configuration and no line in the command — visible only in the file they concern,
 * and looking like a comment beside the code.
 */
const DISABLE_IN_SOURCE = /\/[/*]\s*Stryker\s+(disable|restore)\b/;

/**
 * A violation of one of the checks. It carries the pair `check` + `rule`, not the
 * point's identifier alone: a gate's point is not one sentence (`lesson-50`), and a
 * negative control comparing only the point lets through a case that fired on a
 * neighbouring rule of that same point.
 */
class MutationError extends Error {
  constructor(check, rule, description) {
    super(description);
    this.check = check;
    this.rule = rule;
  }
}

const list = (items) => items.map((i) => `      ${i}`).join('\n');
const percent = (n) => `${n.toFixed(2)}%`;

/** The mutation score of a set of mutants, computed exactly as Stryker computes it. */
const scoreFrom = (mutants) => {
  const w = mutants.filter((m) => DETECTED.includes(m.status)).length;
  const m = mutants.filter((x) => DENOMINATOR.includes(x.status)).length;
  return { detected: w, denominator: m, score: m === 0 ? 100 : (w / m) * 100 };
};

/**
 * The same set read without the clock: the mutants an ASSERTION caught. The drift against
 * the record is measured on this and not on the score above, because a timeout is a
 * property of the machine the run happened on rather than of the tests (0077).
 */
const assertionFrom = (mutants) => {
  const w = mutants.filter((m) => m.status === 'Killed').length;
  const m = mutants.filter((x) => DENOMINATOR.includes(x.status)).length;
  return m === 0 ? 100 : (w / m) * 100;
};

// ── snapshot ──────────────────────────────────────────────────────────────────

const HEADER = `# Mutation run snapshot

> **This file is generated.** Do not edit it by hand —
> \`node tools/check-mutation.mjs --write\`. The \`check-mutation\` gate rejects a drift.

A full set of green tests is no proof that the tests catch anything — that is the only
question a mutation run answers
([\`req-quality-unit\`](../../docs/requirements/quality.md#req-quality-unit)).
Stryker breaks the code in a thousand small ways and asks how many of them the test
suite notices. A **surviving** mutant is a change of behaviour after which CI still
shines green.

This file is the list a change is measured against. \`thresholds.break\` in
\`stryker.config.json\` is a FLOOR on its own and says nothing about a file that fell
twenty points while the rest make up for it. The snapshot watches every file separately
and watches it **both ways**: downwards, because that is what a deleted assertion looks
like, upwards, because a floor ten points below the measurement stops measuring.

An **errored** mutant is one after which the test worker DIED rather than a test failing —
\`if (row === null) return;\` removed, and the next line dereferences \`null\` inside a DOM
listener. It counts towards the denominator here, which is stricter than Stryker's own
score: a mutant that took the run down with it stated nothing about the tests. It has a
column because without one the arithmetic of a row that has any does not work, and a reader
checking it finds a mistake that is not one.

**What a score is a true statement about.** This file measures \`.ts\`, and only \`.ts\`. A
component that borrows more from the platform than it writes has most of itself in a template
and a stylesheet, where no mutant is ever thrown: \`accordion-item.ts\` and \`accordion.ts\` are
74 lines between them, 20 mutants, and the exclusive group, the disclosure state, the keyboard
and the searchability of a closed section are all outside the two files this run reads. A green
95% there is true about a small thing and reads like a statement about a component. What
answers for the other half is a **recorded disarming** — every mechanism taken out by hand and
the case that turned red written into the card, the way \`docs/components/accordion.md\` does it
([\`lesson-174\`](../../docs/lessons.md#lesson-174)). A mutator over templates was refused: it
is machinery this repository would then own, and the disarming is a measurement anybody can
repeat with an editor.

**The clock is recorded and does not bind.** A mutant killed by elapsed time counts towards
the score exactly as one killed by an assertion, and whether it times out is decided by the
machine: one full run produced timeouts on \`motion.ts\`, \`placement.ts\` and \`texts.ts\` over
untouched code, where this record has never carried one on any of the three. Most runs agree
with it exactly — the eight below are the same eight, in the same six files, as the run before
them — and that is what makes the exception expensive rather than cheap: a record written from
the run that lands its timeouts reddens every run that does not, and one written from the run
that does not turns them into headroom excusing assertions nobody wrote. So the row keeps the
clock column as EVIDENCE — it is how \`clock.clockShare\` is read, and how a score bought with
run time shows — while the drift below is measured on the killed minus that column: the
mutants an assertion caught
([0077](../../docs/decisions/0077-the-clock-is-evidence-and-the-workers-are-a-ceiling.md)).

Columns: file · score · killed (of that, by the clock) · surviving · errored · not covered ·
ignored. The score follows from them — \`killed / (killed + surviving + errored + not
covered)\` — and the gate checks that it does. Tolerance: ±%TOLERANCE% of a percentage point,
two-sided, over the assertion reading of the same row.
`;

const renderSnapshot = (report, tolerance) => {
  const rows = Object.entries(report.files)
    .map(([file, data]) => {
      const s = scoreFrom(data.mutants);
      const count = (st) => data.mutants.filter((m) => m.status === st).length;
      return (
        `${file} ${s.score.toFixed(2)} ${count('Killed') + count('Timeout')}` +
        `(${count('Timeout')}) ${count('Survived')} ${count('RuntimeError')} ` +
        `${count('NoCoverage')} ${count('Ignored')}`
      );
    })
    .sort();

  const all = Object.values(report.files).flatMap((d) => d.mutants);
  const total = scoreFrom(all);

  return (
    HEADER.replace('%TOLERANCE%', String(tolerance)) +
    '\n```\n' +
    rows.join('\n') +
    `\nTOTAL ${total.score.toFixed(2)} ${total.detected}/${total.denominator}\n` +
    '```\n'
  );
};

/** The rows from the snapshot's code block — the rest of the file is prose. */
const snapshotRows = (text) =>
  (text ?? '')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => /^(?:[\w./-]+\.ts|TOTAL) \d/.test(l));

/** A file's row: `path score killed(timeout) surviving errored notCovered ignored`. */
const FILE_ROW =
  /^(\S+) (\d+(?:\.\d+)?) (\d+)\((\d+)\) (\d+) (\d+) (\d+) (\d+)$/;
/** The last row: `TOTAL score detected/denominator`. */
const TOTAL_ROW = /^TOTAL (\d+(?:\.\d+)?) (\d+)\/(\d+)$/;

/**
 * A row read as the numbers it claims, or `null` if it does not carry them. Both shapes
 * state the same thing twice — a score, and the counts it was computed from — which is what
 * makes the row checkable at all. Before the errored column that arithmetic was impossible
 * for any file with an errored mutant, and the four rows that had one looked like mistakes.
 */
const rowArithmetic = (row) => {
  const file = FILE_ROW.exec(row);
  if (file) {
    const [, name, score, killed, clock, surviving, errored, notCovered] = file;
    const denominator =
      Number(killed) + Number(surviving) + Number(errored) + Number(notCovered);
    return {
      row,
      name,
      score: Number(score),
      computed: denominator === 0 ? 100 : (Number(killed) / denominator) * 100,
      // The same row read without the clock: what assertions alone caught. It is this
      // number the drift is measured on, and the reason is 0077.
      assertion:
        denominator === 0
          ? 100
          : ((Number(killed) - Number(clock)) / denominator) * 100,
    };
  }
  const total = TOTAL_ROW.exec(row);
  if (!total) return null;
  const [, score, detected, denominator] = total;
  return {
    row,
    name: 'TOTAL',
    score: Number(score),
    computed:
      Number(denominator) === 0
        ? 100
        : (Number(detected) / Number(denominator)) * 100,
  };
};

// ── checks ──────────────────────────────────────────────────────────────────

/**
 * The full set of checks over a ready input:
 *   `policy`  — the contents of `mutation.policy.json`,
 *   `report`    — the contents of `tmp/mutation/mutation.json` (with its `config` field),
 *   `sources`    — `{ [file]: content }` from disk, for the report's and the policy's files,
 *   `inRepo`    — every file of the library from the git index; point 2 reads the
 *                 candidate set of the measurement off it (`librarySources`),
 *   `specs` — the library's `*.spec.ts` files from the git index,
 *   `snapshot`  — the contents of `mutation.snapshot.md`, or `null`,
 *   `config`    — the contents of `stryker.config.json`,
 *   `targets`   — `{ mutation: { command }, check: { command } }` from the Nx graph,
 *   `ci`        — `{ targets: [...] }` from the workflow.
 * Throws `MutationError` on the first violation — the checks start from the denominator, so
 * the later ones would have nothing to examine anyway. Returns `{ description, snapshot }`.
 */
export const checkMutation = (input) => {
  const policy = input?.policy ?? {};
  const tolerance = policy.tolerance;
  const report = input?.report;

  // 1. DENOMINATOR. A report that is missing or empty gives a gate that always passes —
  // with nothing to compare, everything agrees.
  if (!report || typeof report !== 'object' || !report.files)
    throw new MutationError(
      'measurement',
      'unreadable-measurement',
      `no readable \`${REPORT}\` — the mutation run either did not happen or wrote no ` +
        `report. The gate then has nothing to measure and stays silent about everything.`,
    );

  // A run that cannot START leaves no report at all, so this rule fires one run late by
  // construction: it is a tripwire on the setting, not on the failure. The default ceiling
  // is five minutes and the instrumented suite measures 4:57 on a machine twice the size of
  // a CI runner — the difference between a gate and two red nights (`lesson-206`).
  const dryRunCeiling = report.config?.dryRunTimeoutMinutes;
  if (!(dryRunCeiling > DRY_RUN_DEFAULT_MINUTES))
    throw new MutationError(
      'measurement',
      'dry-run-ceiling-default',
      `the run declares \`dryRunTimeoutMinutes\` as ${JSON.stringify(dryRunCeiling)}, which ` +
        `is Stryker's own default of ${DRY_RUN_DEFAULT_MINUTES} or below it.\n` +
        `    Before the first mutant, Stryker runs the whole suite once with coverage ` +
        `instrumentation, and this suite measures within seconds of that ceiling. A run ` +
        `that dies there writes no report, so nothing downstream of here can say why.`,
    );

  // The worker count, and the same shape one step further: a run that dies for want of
  // memory ALSO writes no report, so this too is a tripwire on the setting. What makes it a
  // rule rather than a command line is that the binding resource is memory per worker rather
  // than cores, and that is within a gigabyte on both machines this runs on — so one number
  // is right in both places and has a file to live in (0077).
  const declaredWorkers = input.config?.concurrency;
  if (!Number.isInteger(declaredWorkers) || declaredWorkers < 1)
    throw new MutationError(
      'measurement',
      'worker-count-undeclared',
      `${CONFIG} declares \`concurrency\` as ${JSON.stringify(declaredWorkers)}.\n` +
        `    Stryker's default is derived from the core count, and on a machine with more ` +
        `cores than memory per worker it takes the parent process down with it — no red, ` +
        `no report, and nothing left to read one in (\`lesson-200\`).`,
    );
  const effectiveWorkers = report.config?.concurrency;
  if (effectiveWorkers !== declaredWorkers)
    throw new MutationError(
      'measurement',
      'worker-count-overridden',
      `the run used ${JSON.stringify(effectiveWorkers)} workers where ${CONFIG} declares ` +
        `${declaredWorkers}.\n` +
        `    A number on the command line is the same fact in a second place: it is right ` +
        `on the machine somebody typed it on and absent on every other. If ${declaredWorkers} ` +
        `is wrong, the file is where it is wrong.`,
    );

  // Every read below is defensive, even though the point above has already rejected an
  // empty or unreadable report. The reason is measured, not precautionary: the negative
  // control disarms the rules ONE BY ONE, so a point trusting the previous one then gives
  // a `TypeError` instead of a message — the one state in which the gate does not say what
  // is wrong. The same defect came back seven times in this repository.
  const files = Object.keys(report?.files ?? {});
  const allMutants = Object.values(report?.files ?? {}).flatMap(
    (d) => d?.mutants ?? [],
  );
  if (!allMutants.length)
    throw new MutationError(
      'measurement',
      'empty-measurement',
      `the report holds no mutant at all. Stryker then exits ZERO and reports a score of ` +
        `100% — because it divides by a denominator that is not there.`,
    );

  // A report older than the sources measures code that is gone. Nx watches this with its
  // cache, but a run by hand (or a cache hit after a change was reverted) would show a
  // pre-edit result as today's.
  for (const [file, data] of Object.entries(report?.files ?? {})) {
    const onDisk = input.sources?.[file];
    if (onDisk !== undefined && onDisk !== data.source)
      throw new MutationError(
        'measurement',
        'stale-measurement',
        `\`${file}\` differs from the text the score was computed on.\n` +
          `    The report describes pre-edit code: the surviving mutants concern lines ` +
          `that are gone, and the new ones were never measured.`,
      );
  }

  // 2. INVENTORY. Three questions, because there are three different ways a file can drop
  // out of the measurement, and only one of them touches the configuration.
  const reportConfig = report?.config ?? {};
  const patterns = policy.patterns ?? [];
  const reportPatterns = reportConfig.mutate ?? [];
  if (JSON.stringify(patterns) !== JSON.stringify(reportPatterns))
    throw new MutationError(
      'inventory',
      'patterns-changed',
      `the run's \`mutate\` patterns do not match ${POLICY}:\n` +
        `      run:     ${JSON.stringify(reportPatterns)}\n` +
        `      policy:  ${JSON.stringify(patterns)}\n` +
        `    Narrowing a pattern is the cheapest way to raise the score: a file struck ` +
        `from the measurement takes its surviving mutants with it.`,
    );

  const fromPolicy = policy.files ?? [];
  if (!fromPolicy.length)
    throw new MutationError(
      'inventory',
      'policy-without-files',
      `${POLICY} lists no file at all — points 2 and 6 walk exactly this list, so both ` +
        `would pass without looking at anything`,
    );
  const outsideRepo = fromPolicy.filter(
    (p) => !(input.inRepo ?? []).includes(p),
  );
  if (outsideRepo.length)
    throw new MutationError(
      'inventory',
      'entry-without-file',
      `${outsideRepo.length} inventory entries are not in the git index:\n` +
        list(outsideRepo) +
        `\n    An entry with no file watches nothing, and reads as a description of ` +
        `today's measurement reach.`,
    );

  const noMutants = policy.noMutants ?? [];
  const justified = new Set(noMutants.map((w) => w?.file));
  for (const entry of noMutants) {
    if (!fromPolicy.includes(entry?.file))
      throw new MutationError(
        'inventory',
        'exception-outside-inventory',
        `the \`noMutants\` exception names \`${entry?.file ?? '(no file)'}\`, which is ` +
          `not in the inventory.\n` +
          `    An exception from measuring a file that is not measured excuses nothing — ` +
          `and looks in the register like a justification.`,
      );
    if (typeof entry.reason !== 'string' || entry.reason.trim().length < 40)
      throw new MutationError(
        'inventory',
        'exception-without-reason',
        `the \`noMutants\` exception for \`${entry.file}\` carries no reason.\n` +
          `    "Zero mutants" means either "there is nothing to mutate" or "the file ` +
          `dropped out of the measurement". Only a sentence somebody wrote can tell.`,
      );
  }

  const hopeless = fromPolicy.filter(
    (p) => !files.includes(p) && !justified.has(p),
  );
  if (hopeless.length)
    throw new MutationError(
      'inventory',
      'file-without-mutants',
      `${hopeless.length} files of the inventory are not in the report:\n` +
        list(hopeless) +
        `\n    A file with no mutant at all disappears from the report together with its ` +
        `survivors — and the score GOES UP. Remedy: bring the file back into the ` +
        `measurement, or add it to \`noMutants\` with a reason.`,
    );

  const deadExceptions = noMutants.filter((w) => files.includes(w.file));
  if (deadExceptions.length)
    throw new MutationError(
      'inventory',
      'dead-exception',
      `${deadExceptions.length} \`noMutants\` exceptions concern files that do have ` +
        `mutants: ${deadExceptions.map((w) => w.file).join(', ')}.\n` +
        `    The reason is gone and the entry stayed — from now on it hides a file that ` +
        `really does drop out of the measurement.`,
    );

  const unknown = files.filter((p) => !fromPolicy.includes(p));
  if (unknown.length)
    throw new MutationError(
      'inventory',
      'file-outside-policy',
      `${unknown.length} files in the report are not in the inventory:\n` +
        list(unknown) +
        `\n    Point 6 walks the files FROM THE REPORT, so this one would be measured ` +
        `with nowhere for its floor to stand. Remedy: add it to ${POLICY}.`,
    );

  // The fourth question, and the one the three above cannot ask. All three watch a file
  // LEAVING the measurement; not one of them looks at a file that was never in it. A new
  // entrypoint's source is outside the set the moment it exists — `mutate` names what is
  // measured, so "not measured" is the DEFAULT for everything new, it is silent, and the
  // score goes on being computed over the files somebody already wrote tests for. That is
  // `lesson-45` one floor up: not a denominator narrowed on purpose, one never widened.
  const sources = librarySources(input.inRepo);
  const unmeasured = Array.isArray(policy.unmeasured) ? policy.unmeasured : [];
  const excused = new Set(unmeasured.map((e) => e?.file));
  const unaccounted = sources.filter(
    (p) => !fromPolicy.includes(p) && !excused.has(p),
  );
  if (unaccounted.length)
    throw new MutationError(
      'inventory',
      'source-unaccounted',
      `${unaccounted.length} source files of the library are neither measured nor ` +
        `excused:\n` +
        list(unaccounted) +
        `\n    A file nobody decided about looks in the report exactly like a file there ` +
        `was nothing to measure in. Remedy: into \`patterns\` and \`files\`, or into ` +
        `\`unmeasured\` with a reason.`,
    );

  for (const entry of unmeasured) {
    if (!sources.includes(entry?.file))
      throw new MutationError(
        'inventory',
        'absence-without-source',
        `the \`unmeasured\` register excuses \`${entry?.file ?? '(no file)'}\`, which is ` +
          `not a source file of the library.\n` +
          `    An excuse for a file the rule never asks about excuses nothing — and in the ` +
          `register it reads as though it did. A rename leaves exactly this behind.`,
      );
    if (fromPolicy.includes(entry.file))
      throw new MutationError(
        'inventory',
        'absence-inside-inventory',
        `\`${entry.file}\` is measured AND excused from being measured.\n` +
          `    One of the two entries is out of date, and it is the register that nobody ` +
          `compares against the report — so it is the register that will stay wrong.`,
      );
    if (typeof entry.reason !== 'string' || entry.reason.trim().length < 40)
      throw new MutationError(
        'inventory',
        'absence-without-reason',
        `the \`unmeasured\` entry for \`${entry.file}\` carries no reason.\n` +
          `    Without one the register says "this file is not measured", which is what ` +
          `the measurement says anyway by leaving it out. The reason is the whole entry.`,
      );
  }

  // 3. TEST DENOMINATOR. The mutation run uses a Vitest configuration of its own, so the
  // set of executed specs is a separate measurement — and breaks separately.
  const run = Object.keys(report?.testFiles ?? {});
  if (!run.length)
    throw new MutationError(
      'tests',
      'tests-unmeasured',
      `the report lists no test file at all. \`testFiles\` is rendered from the DRY RUN's ` +
        `own results, so an empty one means the run executed no spec — and every point ` +
        `below would rule on the specs of a measurement that never happened.`,
    );
  const specs = input.specs ?? [];
  // `testFiles` holds every spec of the DRY RUN and not the covering ones alone: it is
  // rendered from `testCoverage.testsById`, which core builds from the dry run's own
  // results. So a spec that ran stands in it whatever it covered, and an absence means the
  // run never executed it — which happens with nothing drifting at all. Stryker drives
  // Vitest in RELATED mode (`vitest.related`, schema default `true`) over the mutated
  // inventory, so a spec whose module graph reaches no mutated file is never selected, and
  // that absence looks here exactly like a spec the configuration dropped. This point cannot
  // tell the two apart; `coversNothing` is what does, and it is a permit of the same shape
  // as `unmeasured`: an entry, a reason, and a check in both directions. The reason is
  // measured rather than read off this comment — an earlier version of it named a mechanism
  // the runner does not have, and the first entry written from that was false
  // (`lesson-235`). The cheap alternative would be to widen the measurement until the spec
  // covers something, which is the move this whole file exists to refuse.
  const coversNothing = Array.isArray(policy.coversNothing)
    ? policy.coversNothing
    : [];
  const excusedSpecs = new Set(coversNothing.map((entry) => entry?.spec));
  const notRun = specs.filter((s) => !run.includes(s) && !excusedSpecs.has(s));
  if (notRun.length)
    throw new MutationError(
      'tests',
      'spec-outside-measurement',
      `${notRun.length} of the library's specs did not enter the mutation ` +
        `run:\n` +
        list(notRun) +
        `\n    A spec the run did not execute kills nothing here, so a mutant it would ` +
        `have killed counts as surviving. The report cannot say WHY it is missing, and ` +
        `the remedies differ — among them: the related filter never selected it, because ` +
        `nothing it reaches is mutated, which belongs in \`coversNothing\` with a reason; ` +
        `the two paths to the same specs have drifted (\`mutation.vitest.config.mts\` ` +
        `against \`test\`); or this report is older than the git index and predates the ` +
        `spec, which wants another run and an entry nowhere.`,
    );
  for (const entry of coversNothing) {
    if (!specs.includes(entry?.spec))
      throw new MutationError(
        'tests',
        'excuse-without-spec',
        `the \`coversNothing\` register excuses \`${entry?.spec ?? '(no spec)'}\`, which is ` +
          `not a spec of the library.\n` +
          `    An excuse for a file the point never asks about excuses nothing, and in the ` +
          `register it reads as though it did. A rename leaves exactly this behind.`,
      );
    if (run.includes(entry.spec))
      throw new MutationError(
        'tests',
        'excuse-that-runs',
        `\`${entry.spec}\` is excused as a spec the run never executes, and the report ` +
          `lists it.\n` +
          `    Everything in \`testFiles\` ran, whatever it covered — so the entry has ` +
          `outlived its reason, and from here on it would excuse this spec's real absence ` +
          `too, which is the one thing point 3 exists to catch.`,
      );
    if (typeof entry.reason !== 'string' || entry.reason.trim().length < 40)
      throw new MutationError(
        'tests',
        'excuse-without-reason',
        `the \`coversNothing\` entry for \`${entry.spec}\` carries no reason.\n` +
          `    Without one the register says "the run does not execute this spec", which ` +
          `is what the report says anyway by leaving it out. The reason is the whole entry.`,
      );
  }

  const specOutsideRepo = run.filter((s) => !specs.includes(s));
  if (specOutsideRepo.length)
    throw new MutationError(
      'tests',
      'spec-outside-repo',
      `${specOutsideRepo.length} test files from the run are not in the git index:\n` +
        list(specOutsideRepo) +
        `\n    Point 3's denominator comes from git, so such a file kills mutants and ` +
        `the gate has no way of asking whether it kills them everywhere.`,
    );

  // 4. THRESHOLD. Stryker's default `break` is `null` — the run then exits zero whatever
  // the score, and this whole gate would be measuring a report to look at.
  const threshold = policy.threshold;
  if (typeof threshold !== 'number')
    throw new MutationError(
      'threshold',
      'policy-without-threshold',
      `${POLICY} declares no \`threshold\` field — there is nothing to compare ` +
        `\`thresholds.break\` against, so point 4 has nothing to ask`,
    );
  const breakAt = reportConfig.thresholds?.break;
  if (typeof breakAt !== 'number')
    throw new MutationError(
      'threshold',
      'threshold-unset',
      `the run went with \`thresholds.break = ${JSON.stringify(breakAt)}\`.\n` +
        `    That is Stryker's DEFAULT and means "never break": the run exits zero at 4% ` +
        `exactly as at 94%, and the report is a number to look at.`,
    );
  if (breakAt !== threshold)
    throw new MutationError(
      'threshold',
      'threshold-drifted',
      `the run's \`thresholds.break\` (${breakAt}) does not match the policy's ` +
        `\`threshold\` (${threshold}).\n` +
        `    The first number fails the run, the second is its only justification. A drift ` +
        `means one of them was lowered without the other.`,
    );
  const inConfig = input.config?.thresholds?.break;
  if (inConfig !== breakAt)
    throw new MutationError(
      'threshold',
      'threshold-from-command',
      `\`thresholds.break\` in ${CONFIG} (${JSON.stringify(inConfig)}) differs from ` +
        `the one the run REALLY used (${breakAt}).\n` +
        `    The command line overrides the configuration, and the report carries the ` +
        `effective value. The file then says something other than the run — and it is the ` +
        `file that review reads.`,
    );

  const command = input.targets?.mutation?.command;
  if (!command)
    throw new MutationError(
      'threshold',
      'target-without-command',
      `the \`components:mutation\` target has no command that can be read — the gate ` +
        `cannot check whether the run is disarmed`,
    );
  const defects = DISARMING.filter(([, w]) => w.test(command)).map(([n]) => n);
  if (defects.length)
    throw new MutationError(
      'threshold',
      'disarmed-command',
      `the \`components:mutation\` target's command disarms the run (${defects.join(', ')}):\n` +
        `      ${command}\n` +
        `    The configuration then looks exactly as it does today, the report looks ` +
        `exactly as it does today, and the exit code is always zero.`,
    );

  // 5. NARROWING THE DENOMINATOR. An `Ignored` mutant counts towards neither the
  // numerator nor the denominator — every ignore raises the score, adding no test.
  const ignorers = policy.ignorers ?? {};
  const used = reportConfig.ignorers ?? [];
  const unjustified = used.filter((i) => !ignorers[i]);
  if (unjustified.length)
    throw new MutationError(
      'narrowing',
      'unjustified-ignorer',
      `the run used ignorers from outside the policy: ${unjustified.join(', ')}.\n` +
        `    An ignorer strikes mutants from the denominator. With no entry in ${POLICY} ` +
        `there is no place where anybody explains why those need not be killed.`,
    );
  const deadIgnorers = Object.keys(ignorers).filter((i) => !used.includes(i));
  if (deadIgnorers.length)
    throw new MutationError(
      'narrowing',
      'dead-ignorer',
      `the policy justifies ignorers the run did not use: ${deadIgnorers.join(', ')}.\n` +
        `    An entry with no effect outlives a problem that is gone, and reads ` +
        `as a description of today's measurement.`,
    );

  // `mutantReasons` is a LIST because one ignorer is not one sentence: the Angular plugin
  // strikes the configuration object of `input()`/`model()`/`output()` and the options object
  // of a signal QUERY, and says so in two different texts. Written as a single string, the
  // second text looked exactly like a `// Stryker disable` comment somebody had smuggled in —
  // the register has to be able to describe an ignorer with more than one reason, or it
  // reports the first `contentChildren()` in a measured file as a defect.
  const allowedReasons = new Set(
    Object.values(ignorers).flatMap((w) => w?.mutantReasons ?? []),
  );
  const alien = allMutants.filter(
    (m) => m.status === 'Ignored' && !allowedReasons.has(m.statusReason),
  );
  if (alien.length)
    throw new MutationError(
      'narrowing',
      'mutant-ignored-for-alien-reason',
      `${alien.length} mutants were ignored for a reason outside the policy, e.g.:\n` +
        list(
          [...new Set(alien.map((m) => `"${m.statusReason}"`))].slice(0, 3),
        ) +
        `\n    This is how a \`// Stryker disable\` comment enters the repository: it ` +
        `leaves no trace in the configuration, and the mutants leave the denominator.`,
    );

  const inSource = Object.entries(input.sources ?? {})
    .filter(([, content]) => DISABLE_IN_SOURCE.test(content ?? ''))
    .map(([file]) => file);
  if (inSource.length)
    throw new MutationError(
      'narrowing',
      'disable-in-source',
      `${inSource.length} measured files carry a comment that switches Stryker off:\n` +
        list(inSource) +
        `\n    An unkillable mutant is an entry in \`equivalent\` in ${POLICY} — keyed on ` +
        `the mutant, held to being alive, and read by point 7 — not a comment in code ` +
        `that nobody else reads and no gate ever looks at.`,
    );

  if (reportConfig.ignoreStatic)
    throw new MutationError(
      'narrowing',
      'statics-skipped',
      `the run went with \`ignoreStatic: true\`.\n` +
        `    Static mutants — those in field initialisers and at module scope — then leave ` +
        `the denominator entirely. In a component library that is where an input, a ` +
        `default value and an identifier sit: its public contract.`,
    );
  const excluded = reportConfig.mutator?.excludedMutations ?? [];
  if (excluded.length)
    throw new MutationError(
      'narrowing',
      'excluded-mutators',
      `the run excludes whole families of mutations: ${excluded.join(', ')}.\n` +
        `    An excluded family leaves the denominator with no trace in the score — and ` +
        `each of them stands for a real mistake (an inverted condition, a moved boundary, ` +
        `a swapped string).`,
    );

  const clock = policy.clock ?? {};
  if ((reportConfig.timeoutMS ?? 0) < (clock.minimumMS ?? 0))
    throw new MutationError(
      'narrowing',
      'clock-shortened',
      `the run's \`timeoutMS\` (${reportConfig.timeoutMS}) is lower than the policy's ` +
        `\`clock.minimumMS\` (${clock.minimumMS}).\n` +
        `    A mutant killed by elapsed time counts towards the score exactly like one ` +
        `killed by an assertion, so shortening the limit raises the percentage without ` +
        `adding tests.`,
    );
  if ((reportConfig.timeoutFactor ?? 0) < (clock.minimumFactor ?? 0))
    throw new MutationError(
      'narrowing',
      'factor-shortened',
      `the run's \`timeoutFactor\` (${reportConfig.timeoutFactor}) is lower than the ` +
        `policy's \`clock.minimumFactor\` (${clock.minimumFactor}).\n` +
        `    The same lever as \`timeoutMS\`, only measured against the time of ` +
        `a normal run.`,
    );
  const total = scoreFrom(allMutants);
  const fromClock = allMutants.filter((m) => m.status === 'Timeout').length;
  const share = total.detected === 0 ? 0 : (fromClock / total.detected) * 100;
  if (share > (clock.clockShare ?? 100))
    throw new MutationError(
      'narrowing',
      'clock-instead-of-test',
      `${fromClock} of ${total.detected} killed mutants were killed by the CLOCK ` +
        `(${percent(share)}, ${clock.clockShare}% allowed).\n` +
        `    A timeout means "the mutant looped the code", not "a test noticed". A long ` +
        `tail of timeouts is a score bought with run time.`,
    );

  // 6. RESULT. A hard floor (the one Stryker enforces) and a per-file snapshot.
  if (typeof tolerance !== 'number')
    throw new MutationError(
      'score',
      'policy-without-tolerance',
      `${POLICY} declares no \`tolerance\` field — without it the comparison against ` +
        `the snapshot has no width and every run would look like a drift`,
    );

  const fresh = renderSnapshot(report, tolerance);
  if (input.snapshot === null || input.snapshot === undefined)
    throw new MutationError(
      'score',
      'no-snapshot',
      `no \`${SNAPSHOT}\` — run \`node tools/check-mutation.mjs --write\`.\n` +
        `    Without a snapshot point 6 watches the total floor alone, staying silent ` +
        `about a file that fell twenty points while the rest make up for it.`,
    );

  if (total.score < threshold)
    throw new MutationError(
      'score',
      'floor-broken',
      `the total score ${percent(total.score)} is below the ${threshold}% floor ` +
        `(${total.detected} of ${total.denominator} mutants detected).\n` +
        `    That many mutants survived the test suite — that many changes of behaviour ` +
        `pass CI green today.`,
    );

  // The file's own arithmetic, before any of its numbers is read as evidence below. A row
  // states a score AND the counts it came from, so it can contradict itself — and until the
  // errored column arrived it did, on every file with an errored mutant: `select.ts 88.89
  // 32(0) 3 0 0` is 32 of 36 with four mutants nowhere on the line. The rule reads a
  // generated file, which is not a tautology: `--write` is the only writer and a hand is the
  // likelier one, the rows are the half `stale-prose` deliberately does not compare, and a
  // renderer that stopped agreeing with the score it prints beside would say so here.
  const rows = snapshotRows(input.snapshot).map(
    (row) => rowArithmetic(row) ?? { row, name: null },
  );
  const malformed = rows.filter((r) => r.name === null);
  if (malformed.length)
    throw new MutationError(
      'score',
      'columns-adrift',
      `${malformed.length} row(s) of \`${SNAPSHOT}\` do not carry the columns the file ` +
        `declares:\n` +
        list(malformed.map((r) => r.row)) +
        `\n    Columns: file · score · killed (of that, by the clock) · surviving · ` +
        `errored · not covered · ignored. Remedy: ` +
        `\`node tools/check-mutation.mjs --write\`.`,
    );
  const contradictory = rows.filter(
    (r) => Math.abs(r.score - r.computed) > 0.005,
  );
  if (contradictory.length)
    throw new MutationError(
      'score',
      'columns-adrift',
      `${contradictory.length} row(s) of \`${SNAPSHOT}\` carry a score their own ` +
        `columns do not give:\n` +
        list(
          contradictory.map(
            (r) => `${r.row}  → the columns say ${percent(r.computed)}`,
          ),
        ) +
        `\n    A score is \`killed / (killed + surviving + errored + not covered)\`, and ` +
        `\`ignored\` is outside it by decision (point 5). A row that does not add up is ` +
        `either a hand edit of a generated file or a renderer that no longer agrees with ` +
        `itself. Remedy: \`node tools/check-mutation.mjs --write\`.`,
    );

  const fromSnapshot = new Map(
    rows.filter((r) => r.name !== 'TOTAL').map((r) => [r.name, r]),
  );
  const missing = files.filter((p) => !fromSnapshot.has(p));
  if (missing.length)
    throw new MutationError(
      'score',
      'incomplete-snapshot',
      `${missing.length} measured files have no row in the snapshot:\n` +
        list(missing) +
        `\n    A file with no row is measured by the total floor alone. ` +
        `Remedy: \`node tools/check-mutation.mjs --write\`.`,
    );
  const extra = [...fromSnapshot.keys()].filter((p) => !files.includes(p));
  if (extra.length)
    throw new MutationError(
      'score',
      'expired-snapshot',
      `${extra.length} snapshot rows concern files outside the measurement:\n` +
        list(extra) +
        `\n    A row with no file reads as proof that something is measured — and it is not.`,
    );

  // Both sides without the clock (0077). The column stays in the record as evidence and
  // point 5 still rules on its share; what it may not do is decide whether a file drifted,
  // because then an untouched file reddens on the run that was merely busier.
  const drops = [];
  const rises = [];
  for (const [file, data] of Object.entries(report?.files ?? {})) {
    const now = assertionFrom(data.mutants ?? []);
    const then = fromSnapshot.get(file)?.assertion;
    if (now < then - tolerance)
      drops.push(`${file}: ${percent(then)} → ${percent(now)}`);
    if (now > then + tolerance)
      rises.push(`${file}: ${percent(then)} → ${percent(now)}`);
  }
  if (drops.length)
    throw new MutationError(
      'score',
      'score-dropped',
      `${drops.length} files lost more than ${tolerance} points of score:\n` +
        list(drops) +
        `\n    This is what a deleted assertion looks like: the tests are still green and ` +
        `notice fewer mutants. Remedy: add a test — or, if this is deliberate, rewrite the ` +
        `snapshot and show the drop in review.`,
    );
  if (rises.length)
    throw new MutationError(
      'score',
      'snapshot-adrift',
      `${rises.length} files did better than the snapshot by more than ${tolerance} points:\n` +
        list(rises) +
        `\n    That is good news and fires all the same: a floor ten points below the ` +
        `measurement stops measuring — every fifth assertion could then be deleted and the ` +
        `run stays green. Remedy: \`node tools/check-mutation.mjs --write\`.`,
    );

  // The prose, and it is the same file read the other way round: everything above compares
  // the snapshot's ROWS, and a snapshot is not its rows. The header, the explanation and
  // the tolerance quoted in it come from the same renderer and were compared by nobody, so
  // a rewritten paragraph — or a `tolerance` somebody widened in the policy — stays out of
  // the file until a row happens to drift and carry it in.
  //
  // The rows stay outside this comparison deliberately, and that is
  // [0023](../docs/decisions/0023-a-tolerance-is-for-a-wobbling-measurement.md) taken
  // literally: this measurement wobbles, the tolerance is the width of the wobble, and the
  // columns beside the score wobble with it — a mutant killed by the CLOCK rather than by
  // an assertion moves the timeout column with the code unchanged. Demanding the rows
  // verbatim would rewrite the record on runs that measured nothing new.
  //
  // Last of point 6, and for the same reason point 12 of `check-bundle` stands last: every
  // rule above names WHAT moved, this one can only say the file is not the render.
  const prose = (text) => String(text ?? '').split('\n```')[0];
  if (prose(input.snapshot) !== prose(fresh)) {
    const have = prose(input.snapshot).split('\n');
    const want = prose(fresh).split('\n');
    const at = want.findIndex((w, i) => w !== have[i]);
    const line = at === -1 ? want.length : at;
    throw new MutationError(
      'score',
      'stale-prose',
      `the prose of \`${SNAPSHOT}\` is not what the renderer writes, from line ` +
        `${line + 1}:\n` +
        `      file:   ${have[line] ?? '(the file ends here)'}\n` +
        `      render: ${want[line] ?? '(the render ends here)'}\n` +
        `    The rows are compared above and this is the rest of the file: the paragraph ` +
        `that says what the number means, and the tolerance it quotes from the policy. ` +
        `Remedy: \`node tools/check-mutation.mjs --write\`.`,
    );
  }

  // 7. EQUIVALENT. The fourth register: a survivor no test can tell apart. It is the one
  // excuse that is about a MUTANT rather than a file, so it is keyed on one — the operator,
  // the span it covers and what it puts there — and the day the line moves, the entry stops
  // resolving and says so. An entry is not a permit to stop looking: it has to name a mutant
  // the run really threw, that mutant has to be alive, and the sentence has to be a sentence.
  for (const entry of policy.equivalent ?? []) {
    const at = (m) =>
      `${m.location?.start?.line}:${m.location?.start?.column}-` +
      `${m.location?.end?.line}:${m.location?.end?.column}`;
    const named = `\`${entry?.file}\` ${entry?.mutator} ${entry?.at} → ${entry?.to}`;
    if (excused.has(entry?.file))
      throw new MutationError(
        'inventory',
        'equivalent-outside-inventory',
        `${named} is excused as unkillable and its file is excused from the run.\n` +
          `    An entry about a mutant nobody threw reads like a measurement and is a wish.`,
      );
    const matches = (report.files?.[entry?.file]?.mutants ?? []).filter(
      (m) =>
        m.mutatorName === entry?.mutator &&
        at(m) === entry?.at &&
        m.replacement === entry?.to,
    );
    if (matches.length !== 1)
      throw new MutationError(
        'inventory',
        'equivalent-without-mutant',
        `${named} names ${matches.length} mutants of the run, and an excuse answers for ` +
          `exactly one.\n    Either the line moved and the entry is about code that is ` +
          `gone, or it was never this mutant. Re-derive it from the report rather than ` +
          `adjusting the span until it matches.`,
      );
    if (matches[0].status !== 'Survived')
      throw new MutationError(
        'inventory',
        'equivalent-that-dies',
        `${named} is excused as unkillable and the run reports it \`${matches[0].status}\`.\n` +
          `    The suite can tell it apart after all, so the entry is spent — and while it ` +
          `stands it would excuse the next mutant that takes this line too.`,
      );
    if (typeof entry.reason !== 'string' || entry.reason.trim().length < 40)
      throw new MutationError(
        'inventory',
        'equivalent-without-reason',
        `${named} is excused as unkillable with no reason behind it.\n` +
          `    Proving one by hand has two traps and both have been met here ` +
          `(\`lesson-199\`), so the entry carries the proof or it is a list.`,
      );
  }

  // 8. CI. The gate and the run itself are two targets, each removable on its own.
  for (const target of ['mutation', 'check-mutation'])
    if (!(input.ci?.targets ?? []).includes(target))
      throw new MutationError(
        'ci',
        'ci-without-target',
        `no workflow (${WORKFLOWS.map((w) => `\`${w}\``).join(', ')}) has the ` +
          `\`${target}\` target among the ones it runs.\n` +
          `    That is this whole gate's denominator: everything above describes a run ` +
          `nobody starts, and locally each of them passes.`,
      );

  return {
    description:
      `${files.length} of ${sources.length} source files, ${total.denominator} mutants — ` +
      `score ${percent(total.score)} against a ${threshold}% floor ` +
      `(${total.denominator - total.detected} surviving, ` +
      `${allMutants.filter((m) => m.status === 'Ignored').length} ignored` +
      `${unmeasured.length ? `, ${unmeasured.length} excused` : ''})`,
    snapshot: fresh,
  };
};

// ── input from disk ───────────────────────────────────────────────────────────

const read = (path) =>
  existsSync(join(ROOT, path)) ? readFileSync(join(ROOT, path), 'utf8') : null;

const json = (path) => {
  const text = read(path);
  if (text === null) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

const inIndex = (path) =>
  execFileSync('git', ['ls-files', path], { cwd: ROOT, encoding: 'utf8' })
    .split('\n')
    .map((p) => p.trim())
    .filter(Boolean);

/**
 * Both targets' commands FROM THE NX GRAPH, not from `project.json`: the graph is what Nx
 * will really run, and it is the graph that merges configurations and defaults.
 */
const graphTargets = async () => {
  const { createProjectGraphAsync } = await import('@nx/devkit');
  const graph = await createProjectGraphAsync({ exitOnError: false });
  const read = (name) => {
    const target = graph.nodes['components']?.data?.targets?.[name];
    const { command, commands } = target?.options ?? {};
    const list = commands ?? (command === undefined ? [] : [command]);
    return {
      command: list
        .map((c) => (typeof c === 'string' ? c : (c?.command ?? '')))
        .join(' && '),
    };
  };
  return { mutation: read('mutation'), check: read('check-mutation') };
};

/**
 * Which targets the workflow runs. Comments are stripped BEFORE the search — this
 * workflow explains every step of its own in a paragraph of prose, so a sentence about a
 * target looks to a pattern exactly like a call to it (`lesson-56` in `check-browsers`).
 */
const ciTargets = () => {
  // The union over EVERY `nx affected` / `nx run-many` line of BOTH workflows. Point 7's
  // denominator is "a run somebody starts", and the repository deliberately starts the two
  // heaviest runs from `nightly.yml` rather than from every push — while `nightly.yml`
  // itself splits its lines in two. Reading one file, and one line of it, is how this gate
  // came to demand `mutation` of the workflow that deliberately does not run it: the demand
  // held locally from the day the target moved out of `ci.yml`, and the first nightly would
  // have fired red on the gate's own assumption rather than on any fact about the run.
  const targets = WORKFLOWS.flatMap((file) =>
    (read(file) ?? '')
      .split('\n')
      .map((line) => line.replace(/#.*$/m, ''))
      .filter((line) => /nx\s+(?:affected|run-many)/.test(line))
      .flatMap((line) => line.split(/\s+/)),
  ).filter(Boolean);
  return { targets };
};

const inputFromDisk = async () => {
  const policy = json(POLICY) ?? {};
  const report = json(REPORT);
  const sources = {};
  for (const file of new Set([
    ...Object.keys(report?.files ?? {}),
    ...(policy.files ?? []),
  ]))
    sources[file] = read(file) ?? undefined;

  return {
    policy,
    report,
    sources,
    inRepo: inIndex(PROJECT),
    specs: inIndex(PROJECT).filter((p) => SPEC.test(p)),
    snapshot: read(SNAPSHOT),
    config: json(CONFIG) ?? {},
    targets: await graphTargets(),
    ci: ciTargets(),
  };
};

// ── negative control ──────────────────────────────────────────────────────────

const readFixture = (name) =>
  JSON.parse(readFileSync(join(FIXTURES, name), 'utf8'));

/**
 * The reference input keeps its files in shorthand (name → mutants as a list of statuses),
 * so a case can be read at a glance. Here they are expanded into the shape of a Stryker
 * report.
 */
const expandFiles = (digest) =>
  Object.fromEntries(
    Object.entries(digest).map(([file, data]) => [
      file,
      {
        source: data.source ?? '',
        mutants: (data.statuses ?? []).map((s, i) => ({
          id: `${file}-${i}`,
          mutatorName: 'ConditionalExpression',
          status: typeof s === 'string' ? s : s.status,
          statusReason: typeof s === 'string' ? undefined : s.reason,
          // A case about point 7 needs a mutant with coordinates, not just a status.
          ...(typeof s === 'string' ? {} : (s.mutant ?? {})),
        })),
      },
    ]),
  );

const buildReport = (w) => ({
  files: expandFiles(w.fileDigest),
  testFiles: Object.fromEntries(
    (w.testFiles ?? w.specs).map((s) => [s, { tests: [] }]),
  ),
  config: w.runConfig,
});

/**
 * Builds a case's input ON A COPY of the reference one, so the case file holds nothing
 * but its own defect — you cannot break something in passing and not notice.
 *
 * The reference snapshot is rendered from the report BEFORE the case's changes, and by the
 * same renderer as the production one. Both are necessary: rendered after the changes it
 * would always agree with the measurement (so point 6 would have nothing to examine), and
 * written into the file by hand it would fire on a difference of format rather than on the
 * case's defect.
 */
const buildFixture = (fx) => {
  const w = structuredClone(readFixture(REFERENCE).input);
  const baselineSnapshot = renderSnapshot(buildReport(w), w.policy.tolerance);

  for (const file of fx.dropFiles ?? []) delete w.fileDigest[file];
  for (const [file, data] of Object.entries(fx.addFiles ?? {}))
    w.fileDigest[file] = data;
  for (const [file, statuses] of Object.entries(fx.replaceStatuses ?? {}))
    w.fileDigest[file].statuses = statuses;
  // A file's text stands in two places — on disk and in the report — and whether a change
  // touches both is the whole difference between "other code" and "a stale measurement".
  for (const [file, content] of Object.entries(fx.replaceSource ?? {})) {
    w.sources[file] = content;
    w.fileDigest[file].source = content;
  }
  for (const [file, content] of Object.entries(fx.driftSource ?? {}))
    w.sources[file] = content;

  if (fx.policy)
    for (const [k, v] of Object.entries(fx.policy))
      v === null ? delete w.policy[k] : (w.policy[k] = v);
  if (fx.runConfig)
    for (const [k, v] of Object.entries(fx.runConfig))
      v === null ? delete w.runConfig[k] : (w.runConfig[k] = v);
  if (fx.config) w.config = { ...w.config, ...fx.config };
  if (fx.targets) w.targets = { ...w.targets, ...fx.targets };
  if (fx.ci) w.ci = { ...w.ci, ...fx.ci };
  if (fx.specs) w.specs = fx.specs;
  if (fx.testFiles) w.testFiles = fx.testFiles;
  if (fx.inRepo) w.inRepo = fx.inRepo;

  let snapshot = fx.noSnapshot === true ? null : baselineSnapshot;
  for (const file of fx.dropSnapshotRow ?? [])
    snapshot = snapshot
      .split('\n')
      .filter((l) => !l.startsWith(`${file} `))
      .join('\n');
  for (const row of fx.addSnapshotRow ?? [])
    snapshot = snapshot.replace('TOTAL', `${row}\nTOTAL`);

  return {
    policy: w.policy,
    report: fx.noReport === true ? null : buildReport(w),
    sources: w.sources,
    inRepo: w.inRepo,
    specs: w.specs,
    snapshot,
    config: w.config,
    targets: w.targets,
    ci: w.ci,
  };
};

// ── the run ───────────────────────────────────────────────────────────────────

const problems = [];
let description = null;
try {
  description = checkMutation(await inputFromDisk()).description;
} catch (error) {
  if (!(error instanceof MutationError)) throw error;
  problems.push(`${error.check}/${error.rule}: ${error.message}`);
}

// `--write` is the right answer to four rules of point 6 (`no-snapshot`,
// `incomplete-snapshot`, `snapshot-adrift`, `stale-prose`), so the snapshot has to be
// rewritable EVEN when the gate fired on them — otherwise the one command that fixes those
// rules would be available exactly outside the state in which it is needed. It renders from disk, not
// from the result above: with a rule fired there is no such result.
if (WRITE) {
  const report = json(REPORT);
  const policy = json(POLICY) ?? {};
  if (report?.files && typeof policy.tolerance === 'number') {
    writeFileSync(
      join(ROOT, SNAPSHOT),
      renderSnapshot(report, policy.tolerance),
    );
    console.log(`✓ Rewrote ${SNAPSHOT}`);
    process.exit(0);
  }
  console.error(`X Nothing to rewrite the snapshot from — no ${REPORT}.`);
  process.exit(1);
}

if (!existsSync(FIXTURES))
  problems.push(
    `tools/check-mutation.fixtures: the directory does not exist — a gate with no proof ` +
      `that it can fail is one more silent defect (req-quality-negative-control)`,
  );

const cases = existsSync(FIXTURES)
  ? readdirSync(FIXTURES)
      .filter((n) => n.endsWith('.json') && n !== REFERENCE)
      .sort()
  : [];

if (existsSync(FIXTURES) && !cases.length)
  problems.push(
    `tools/check-mutation.fixtures: no prepared inputs — a gate with no proof that it can ` +
      `fail is one more silent defect (req-quality-negative-control)`,
  );

// The reference input MUST pass. Were it defective itself, every case would fire
// because of it and not because of its own defect — every "it fired" would be false.
if (cases.length) {
  try {
    checkMutation(buildFixture({}));
  } catch (error) {
    if (!(error instanceof MutationError)) throw error;
    problems.push(
      `${REFERENCE}: the reference input does NOT pass (${error.check}/${error.rule}) — ` +
        `every prepared case now fires because of it.\n    ${error.message}`,
    );
  }
}

for (const name of cases) {
  const fx = readFixture(name);
  try {
    checkMutation(buildFixture(fx));
    problems.push(
      `${name}: the prepared input PASSED and was meant not to — ` +
        `rule \`${fx.check}/${fx.rule}\` stopped examining anything`,
    );
  } catch (error) {
    if (!(error instanceof MutationError)) throw error;
    if (error.check !== fx.check || error.rule !== fx.rule)
      problems.push(
        `${name}: rule \`${error.check}/${error.rule}\` fired, and \`${fx.check}/${fx.rule}\` ` +
          `was meant to — the fixture proves something other than what it declares`,
      );
  }
}

// ── result ────────────────────────────────────────────────────────────────────

if (problems.length) {
  console.error(`X Mutation run gate — ${problems.length} violations:\n`);
  for (const p of problems) console.error(`  - ${p}`);
  console.error('');
  process.exit(1);
}

console.log(
  `✓ Mutation run: ${description}. Negative control: the reference input passes, ` +
    `${cases.length} prepared ones rejected on their own rules.`,
);
