#!/usr/bin/env node
/**
 * Flake gate: which e2e cases are not a function of the code (`req-quality-e2e`)? 4.54 bought
 * the SHAPE of a race as a greppable rule; this asks how many are left, by running the suites
 * N times over and writing down what did not agree with itself.
 *
 *  1. MEASURED: a report per suite, none empty, retries off, repetitions at or above the floor,
 *  2. DENOMINATOR: the walk's tally equals the report's own `stats`, and every case ran N times,
 *  3. OUTCOMES: a case that failed EVERY repetition is a failure and not a wobble,
 *  4. NAMES: every case that wobbled stands in the record — ONE-sided, this being a sample,
 *  5. RECORD: a dated reading whose rate equals its own rows, and the prose the renderer writes.
 *
 * One-sided by design (point 4): a name that appears is a finding, a recorded name that
 * behaved is not — repetitions are a SAMPLE, and absence is not proof. The rate is dated and
 * compared by nobody, as `bench.snapshot.md` treats its clock. Control: the fixtures tree.
 *
 * Usage: node tools/check-flake.mjs [--write] [--report]  (--report: every case and its runs)
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const WRITE = process.argv.includes('--write');
const REPORT = process.argv.includes('--report');
const POLICY = 'tools/flake.policy.json';
const SNAPSHOT = 'docs/flake.snapshot.md';
const FIXTURES = join(ROOT, 'tools/check-flake.fixtures');
const REFERENCE = '_reference.json';

/** The statuses Playwright puts on a test, and what each means for a repetition. */
const PASSED = 'expected';
const FAILED = 'unexpected';
const SKIPPED = 'skipped';
/** `flaky` cannot happen with retries off, which is why seeing it is a rule and not a case. */
const RETRIED = 'flaky';

class FlakeError extends Error {
  constructor(check, rule, message) {
    super(message);
    this.check = check;
    this.rule = rule;
  }
}

const list = (items) => items.map((i) => `      ${i}`).join('\n');
const read = (path) => readFileSync(join(ROOT, path), 'utf8');
const json = (path) =>
  existsSync(join(ROOT, path)) ? JSON.parse(read(path)) : null;

/**
 * Every spec in a report, carrying the path a person would grep for. A `--repeat-each` run
 * puts each repetition in a SEPARATE spec entry under the same title — measured against the
 * reporter rather than read out of the documentation — so the repetitions of one case are
 * found by grouping on that path and not by any field of the report.
 */
const specsOf = (suite, path = []) => [
  ...(suite?.specs ?? []).map((spec) => ({
    spec,
    path: [...path, spec.title],
  })),
  ...(suite?.suites ?? []).flatMap((child) =>
    specsOf(child, [...path, child.title]),
  ),
];

/** A case: one test, in one project, across the repetitions of one run. */
const casesOf = (report) => {
  const cases = new Map();
  for (const { spec, path } of (report?.suites ?? []).flatMap((s) =>
    specsOf(s, [s.title]),
  ))
    for (const test of spec?.tests ?? []) {
      const key = `${path.join(' › ')} | ${test?.projectName}`;
      const at = cases.get(key) ?? { key, runs: [] };
      at.runs.push(test?.status);
      cases.set(key, at);
    }
  return [...cases.values()].map((c) => ({
    ...c,
    passed: c.runs.filter((s) => s === PASSED).length,
    failed: c.runs.filter((s) => s === FAILED).length,
  }));
};

const readInput = () => {
  const policy = json(POLICY) ?? {};
  return {
    policy,
    reports: Object.fromEntries(
      Object.entries(policy.reports ?? {}).map(([suite, path]) => [
        suite,
        json(path),
      ]),
    ),
    snapshot: existsSync(join(ROOT, SNAPSHOT)) ? read(SNAPSHOT) : null,
  };
};

// ── the record ────────────────────────────────────────────────────────────────

const HEADER = `# End-to-end flake snapshot

> **This file is generated.** Do not edit it by hand —
> \`node tools/check-flake.mjs --write\`. The \`check-flake\` gate rejects a new name.

A test that fails once in thirty runs is worse than a test that fails always: it is read as
noise, re-run until green, and the defect it was pointing at outlives everybody's patience
([\`req-quality-e2e\`](../docs/requirements/quality.md#req-quality-e2e)). Two such cases were
found here by hand and fixed, and the SHAPE of the race they shared became a greppable rule —
but nobody has ever measured how many are left, which is what this file is.

**What is measured.** Both suites run with \`--repeat-each\` and \`--retries=0\`, and a case —
one test, in one project — that did not agree with itself across its repetitions is written
down by name. Retries are off because a retry is precisely the mechanism that makes this
invisible: a case that fails and passes on the second attempt is reported green.

**The record is read ONE way.** A name that appears and is not below is a finding and turns
the run red. A name below that behaved this time is **not** a finding and is not removed by
the gate, because repetitions of a suite are a sample of a population: a case that wobbles
once in twenty runs is silent in most samples, and deleting it on that evidence would be the
sample deciding what the population contains.

**The rate is dated and compared by nobody**, the way \`bench.snapshot.md\` treats its clock.
It is a property of the machine that took it at least as much as of the suite — the failure
mode being measured is "fails only under the suite's own parallelism" — so two readings from
two machines are two facts and not a trend ([\`lesson-200\`](lessons.md#lesson-200)).

Rows: case · project · how many of its repetitions passed. The reading line above them says
when, how many repetitions, and over how many cases and runs.
`;

/** `Taken 2026-09-15 · 3 repetitions · 2 suites · 512 cases · 1536 runs · 4 wobbled (0.78%)` */
const READING =
  /^Taken (\d{4}-\d{2}-\d{2}) · (\d+) repetitions · (\d+) suites · (\d+) cases · (\d+) runs · (\d+) wobbled \((\d+\.\d\d)%\)$/m;
/** A row: the case path, the project, and how many repetitions of it passed. */
const ROW = /^(.+) \| (\S+) (\d+)\/(\d+)$/;
const NONE = '(none — no case disagreed with itself in this run)';

const rateOf = (wobbled, cases) => (cases === 0 ? 0 : (wobbled / cases) * 100);

const renderSnapshot = (input) => {
  const tally = tallyOf(input);
  const rows = tally.wobbling
    .map((c) => `${c.key} ${c.passed}/${c.runs.length}`)
    .sort();
  return (
    `${HEADER}\n` +
    `Taken ${tally.date} · ${tally.repetitions} repetitions · ${tally.suites} suites · ` +
    `${tally.cases.length} cases · ${tally.runs} runs · ${tally.wobbling.length} wobbled ` +
    `(${rateOf(tally.wobbling.length, tally.cases.length).toFixed(2)}%)\n\n` +
    '```\n' +
    `${rows.length ? rows.join('\n') : NONE}\n` +
    '```\n'
  );
};

/** Everything the record states, read back off the run rather than off the file. */
const tallyOf = (input) => {
  const entries = Object.entries(input.reports ?? {});
  const cases = entries.flatMap(([, report]) => casesOf(report));
  const dates = entries
    .map(([, r]) => String(r?.stats?.startTime ?? '').slice(0, 10))
    .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
    .sort();
  return {
    date: dates[dates.length - 1] ?? '',
    repetitions: Math.max(
      0,
      ...entries.flatMap(([, r]) =>
        (r?.config?.projects ?? []).map((p) => p?.repeatEach ?? 0),
      ),
    ),
    suites: entries.length,
    cases,
    runs: cases.reduce((a, c) => a + c.runs.length, 0),
    // A wobble is a disagreement, so it needs BOTH: a case that only ever failed is point 3's
    // and a case that only ever passed is nobody's.
    wobbling: cases.filter((c) => c.passed > 0 && c.failed > 0),
  };
};

// ── the checks ────────────────────────────────────────────────────────────────

/** 1. MEASURED — a run that never happened reads as a suite that never wobbles. */
const checkMeasured = (input) => {
  const declared = Object.keys(input.policy?.reports ?? {});
  if (!declared.length)
    throw new FlakeError(
      'measured',
      'no-suite-declared',
      `\`${POLICY}\` names no suite to repeat — with an empty list every later point rules ` +
        `on nothing and this gate reports a repository with no flaky test in it`,
    );
  const floor = input.policy?.minimumRepetitions;
  if (!Number.isInteger(floor) || floor < 2)
    throw new FlakeError(
      'measured',
      'no-repetition-floor',
      `\`${POLICY}\` declares \`minimumRepetitions\` as ${JSON.stringify(floor)}. Below two ` +
        `there is nothing for a case to disagree WITH, and the measurement is the suite`,
    );
  for (const suite of declared) {
    const report = input.reports?.[suite];
    if (!report)
      throw new FlakeError(
        'measured',
        'no-report',
        `no report for \`${suite}\` at \`${input.policy.reports[suite]}\`.\n` +
          `    This gate runs after the repetition job and not beside the other gates: ` +
          `what it reads is produced by that job and by nothing else.`,
      );
    const projects = report?.config?.projects ?? [];
    if (!projects.length || !casesOf(report).length)
      throw new FlakeError(
        'measured',
        'empty-report',
        `the report for \`${suite}\` holds no project or no case at all — an empty ` +
          `measurement agrees with every record ever written`,
      );
    for (const project of projects) {
      if ((project?.retries ?? 0) !== 0)
        throw new FlakeError(
          'measured',
          'retries-on',
          `\`${suite}\`/\`${project?.name}\` ran with ${project?.retries} retries.\n` +
            `    A retry is the mechanism that makes a flake invisible: the case fails, ` +
            `runs again, passes, and is reported green. With retries on, this whole ` +
            `measurement reads zero.`,
        );
      if (!((project?.repeatEach ?? 0) >= floor))
        throw new FlakeError(
          'measured',
          'too-few-repetitions',
          `\`${suite}\`/\`${project?.name}\` ran each case ` +
            `${JSON.stringify(project?.repeatEach)} time(s) against a floor of ${floor}`,
        );
    }
  }
};

/** 2. DENOMINATOR — the walk and the report's own tally are two readings of one run. */
const checkDenominator = (input) => {
  for (const [suite, report] of Object.entries(input.reports ?? {})) {
    const cases = casesOf(report);
    const walked = cases.reduce((a, c) => a + c.runs.length, 0);
    const stats = report?.stats ?? {};
    const counted =
      (stats.expected ?? 0) +
      (stats.unexpected ?? 0) +
      (stats.flaky ?? 0) +
      (stats.skipped ?? 0);
    if (walked !== counted)
      throw new FlakeError(
        'denominator',
        'readings-disagree',
        `\`${suite}\`: the walk found ${walked} test runs where the report's own \`stats\` ` +
          `count ${counted}. A walk that loses a nested \`describe\` loses every case in it ` +
          `and says nothing`,
      );
    const repeats = Math.max(
      0,
      ...(report?.config?.projects ?? []).map((p) => p?.repeatEach ?? 0),
    );
    const short = cases.filter((c) => c.runs.length !== repeats);
    if (short.length)
      throw new FlakeError(
        'denominator',
        'case-run-unevenly',
        `\`${suite}\`: ${short.length} case(s) did not run ${repeats} times:\n` +
          list(short.map((c) => `${c.key} — ${c.runs.length}`)) +
          `\n    Repetitions of one case are found by GROUPING on its path, so a path that ` +
          `is not unique silently merges two cases into one and neither is measured.`,
      );
  }
};

/** 3. OUTCOMES — a test that always fails is red, and a `flaky` status contradicts point 1. */
const checkOutcomes = (input) => {
  for (const [suite, report] of Object.entries(input.reports ?? {})) {
    const cases = casesOf(report);
    const retried = cases.filter((c) => c.runs.includes(RETRIED));
    if (retried.length)
      throw new FlakeError(
        'outcomes',
        'status-contradicts-retries',
        `\`${suite}\`: ${retried.length} case(s) carry the \`${RETRIED}\` status, which ` +
          `Playwright gives a test that failed and then passed ON A RETRY:\n` +
          list(retried.map((c) => c.key)) +
          `\n    Point 1 read the configuration and found retries off. One of the two is ` +
          `not describing this run.`,
      );
    const broken = cases.filter(
      (c) => c.failed === c.runs.length && c.runs.length > 0,
    );
    if (broken.length)
      throw new FlakeError(
        'outcomes',
        'case-always-failed',
        `\`${suite}\`: ${broken.length} case(s) failed every repetition:\n` +
          list(broken.map((c) => `${c.key} — 0/${c.runs.length}`)) +
          `\n    They are separated from the wobbles because a repetition job swallows ` +
          `an ordinary failure otherwise: the run exits non-zero, the step is allowed to, ` +
          `and a gate counting DISAGREEMENTS finds none. What a unanimous column MEANS is ` +
          `not decided here. A case broken outright and a case that fails whenever the ` +
          `machine is busy look identical from inside a run that loaded it: \`--repeat-each\` ` +
          `multiplies the work and \`--retries=0\` removes the quiet second attempt, so a ` +
          `contention-sensitive case fails all of its copies. The evidence that tells them ` +
          `apart is OUTSIDE this report — the same commit's ordinary suite, where a retry ` +
          `runs on a calm machine. On 2026-09-16 that suite called these same four "flaky" ` +
          `while this one read 0/3 (\`lesson-214\`).`,
      );
  }
};

/** 4. NAMES — one-sided by design: what appeared is a finding, what behaved is not. */
const checkNames = (input, snapshot) => {
  if (snapshot === null || snapshot === undefined)
    throw new FlakeError(
      'names',
      'no-record',
      `no \`${SNAPSHOT}\`. The first reading is the first one taken — run the repetition ` +
        `job, then \`node tools/check-flake.mjs --write\` over its reports.`,
    );
  const recorded = new Set(
    snapshot
      .split('\n')
      .map((l) => ROW.exec(l.trim()))
      .filter(Boolean)
      .map((m) => `${m[1]} | ${m[2]}`),
  );
  const fresh = tallyOf(input).wobbling.filter((c) => !recorded.has(c.key));
  if (fresh.length)
    throw new FlakeError(
      'names',
      'wobble-unrecorded',
      `${fresh.length} case(s) disagreed with themselves and stand in no record:\n` +
        list(
          fresh.map((c) => `${c.key} — ${c.passed}/${c.runs.length} passed`),
        ) +
        `\n    Either the case has a race in it, or it had one all along and the sample ` +
        `only now caught it. Remedy: fix it, or write it down and say which — ` +
        `\`node tools/check-flake.mjs --write\`.`,
    );
};

/** 5. RECORD — the reading is a reading, its rate is its own, and the prose is the render. */
const checkRecord = (input, snapshot) => {
  const reading = READING.exec(snapshot ?? '');
  if (!reading)
    throw new FlakeError(
      'record',
      'reading-missing',
      `\`${SNAPSHOT}\` carries no reading line, so it records names without saying what ` +
        `they were measured over. A list of names and no denominator is not a rate`,
    );
  const [, , repetitions, , cases, , wobbled, rate] = reading;
  if (Number(repetitions) < (input.policy?.minimumRepetitions ?? 0))
    throw new FlakeError(
      'record',
      'reading-below-floor',
      `the record was taken over ${repetitions} repetitions, under the floor of ` +
        `${input.policy?.minimumRepetitions} — it is a record of a run that could not ` +
        `have found anything`,
    );
  const rows = (snapshot ?? '')
    .split('\n')
    .filter((l) => ROW.test(l.trim())).length;
  if (rows !== Number(wobbled))
    throw new FlakeError(
      'record',
      'rows-contradict-reading',
      `the reading says ${wobbled} case(s) wobbled and the record holds ${rows} row(s) — ` +
        `a number written in prose has to equal what it counts`,
    );
  const want = rateOf(Number(wobbled), Number(cases)).toFixed(2);
  if (want !== rate)
    throw new FlakeError(
      'record',
      'rate-contradicts-reading',
      `the record prints ${rate}% where ${wobbled} of ${cases} gives ${want}%`,
    );
  // The prose, read the other way round: everything above compares the record's NUMBERS, and
  // a record is not its numbers. The paragraph saying what the rate is a statement about —
  // and what it deliberately is not — is compared by nobody otherwise (`lesson-79`).
  const prose = (text) => String(text ?? '').split('\nTaken ')[0];
  if (prose(snapshot) !== prose(renderSnapshot(input))) {
    const have = prose(snapshot).split('\n');
    const want = prose(renderSnapshot(input)).split('\n');
    const at = want.findIndex((w, i) => w !== have[i]);
    throw new FlakeError(
      'record',
      'stale-prose',
      `the prose of \`${SNAPSHOT}\` is not what the renderer writes, from line ` +
        `${at + 1}:\n` +
        `      file:   ${have[at] ?? '(the file ends here)'}\n` +
        `      render: ${want[at] ?? '(the render ends here)'}`,
    );
  }
};

const checkFlake = (input) => {
  checkMeasured(input);
  checkDenominator(input);
  checkOutcomes(input);
  checkNames(input, input.snapshot);
  checkRecord(input, input.snapshot);
  return input;
};

// ── the live run ──────────────────────────────────────────────────────────────

const problems = [];
let live = null;
try {
  const input = readInput();
  if (WRITE) {
    // Points 1 to 3 stand before the record because `--write` needs them: a run with
    // retries on, or one the walk read half of, must not be written down as the accepted
    // state (`lesson-49`).
    checkMeasured(input);
    checkDenominator(input);
    checkOutcomes(input);
    writeFileSync(join(ROOT, SNAPSHOT), renderSnapshot(input));
    input.snapshot = read(SNAPSHOT);
  }
  checkFlake(input);
  live = input;
} catch (error) {
  if (!(error instanceof FlakeError)) throw error;
  problems.push(`${error.check}/${error.rule}: ${error.message}`);
}

// ── the negative control ──────────────────────────────────────────────────────

/**
 * Builds a case's input ON A COPY of the reference one, so the case file holds nothing but
 * its own defect. The reference is a STORED report rather than the repository's own: what
 * this gate reads is produced by a job that runs for an hour on a machine that is not this
 * one, so there is no live input to build on and a stored one is the honest alternative.
 *
 * Operations: `dropReports` and `addReports` over the suites; `projects` patches every
 * project of a report; `stats` patches its tally; `replaceStatuses` rewrites one case's
 * repetitions by its path and `dropRepetitions` takes one away; `policy` adds or drops a
 * register key; `snapshot: null` loses the record, and `snapshot.replace` rewrites it by a
 * pattern that has to match — a needle that finds nothing is a case that breaks nothing.
 */
const buildFixture = (fx) => {
  const reference = JSON.parse(readFileSync(join(FIXTURES, REFERENCE), 'utf8'));
  const w = structuredClone(reference.input);
  w.snapshot = renderSnapshot(w);

  for (const suite of fx.dropReports ?? []) delete w.reports[suite];
  for (const [suite, report] of Object.entries(fx.addReports ?? {}))
    w.reports[suite] = report;
  for (const [suite, patch] of Object.entries(fx.projects ?? {}))
    for (const project of w.reports[suite]?.config?.projects ?? [])
      Object.assign(project, patch);
  for (const [suite, patch] of Object.entries(fx.stats ?? {}))
    Object.assign(w.reports[suite].stats, patch);
  // A case is addressed the way the record names it — `<suite>::<path> | <project>` — because
  // one spec entry carries one project, and a path alone reaches every project's copy of it.
  const repetitionsOf = (suite, key) => {
    const cut = key.lastIndexOf(' | ');
    const [path, project] = [key.slice(0, cut), key.slice(cut + 3)];
    return (w.reports[suite]?.suites ?? [])
      .flatMap((s) => specsOf(s, [s.title]))
      .filter(
        ({ path: p, spec }) =>
          p.join(' › ') === path &&
          (spec?.tests ?? []).some((t) => t?.projectName === project),
      )
      .map(({ spec }) => ({
        spec,
        tests: spec.tests.filter((t) => t.projectName === project),
      }));
  };
  for (const [path, statuses] of Object.entries(fx.replaceStatuses ?? {})) {
    const [suite, key] = path.split('::');
    const hit = repetitionsOf(suite, key);
    if (hit.length !== statuses.length)
      throw new Error(
        `${fx.rule}: \`${key}\` has ${hit.length} repetitions and the case rewrites ` +
          `${statuses.length} — a case that misses is a case that breaks nothing`,
      );
    hit.forEach(({ tests }, i) => {
      for (const test of tests) test.status = statuses[i];
    });
  }
  for (const path of fx.dropRepetitions ?? []) {
    const [suite, key] = path.split('::');
    const hit = repetitionsOf(suite, key)[0];
    if (!hit)
      throw new Error(
        `${fx.rule}: there is no repetition of \`${key}\` to drop — the case breaks nothing`,
      );
    for (const top of w.reports[suite].suites)
      for (const inner of [top, ...(top.suites ?? [])]) {
        const at = (inner.specs ?? []).indexOf(hit.spec);
        if (at >= 0) inner.specs.splice(at, 1);
      }
  }
  if (fx.policy)
    for (const [k, v] of Object.entries(fx.policy))
      v === null ? delete w.policy[k] : (w.policy[k] = v);
  if (fx.snapshot === null) w.snapshot = null;
  for (const { pattern, flags, with: replacement } of fx.snapshot?.replace ??
    []) {
    const re = new RegExp(pattern, flags ?? '');
    if (!re.test(w.snapshot))
      throw new Error(
        `${fx.rule}: the pattern ${JSON.stringify(pattern)} matches nothing in the ` +
          `rendered record — the case breaks nothing`,
      );
    w.snapshot = w.snapshot.replace(re, replacement);
  }
  return w;
};

const cases = readdirSync(FIXTURES)
  .filter((name) => name.endsWith('.json') && name !== REFERENCE)
  .sort();
if (cases.length === 0)
  problems.push(
    `tools/check-flake.fixtures: no prepared inputs — a gate with no proof that it can fail ` +
      `is one more silent defect (req-quality-negative-control)`,
  );

try {
  checkFlake(buildFixture({ rule: REFERENCE }));
} catch (error) {
  if (!(error instanceof FlakeError)) throw error;
  problems.push(
    `${REFERENCE}: the reference input does NOT pass (${error.check}/${error.rule}) — ` +
      `every prepared case now fires because of it.\n    ${error.message}`,
  );
  cases.length = 0;
}

for (const name of cases) {
  const fx = JSON.parse(readFileSync(join(FIXTURES, name), 'utf8'));
  try {
    checkFlake(buildFixture(fx));
    problems.push(
      `${name}: the prepared input PASSED and was meant not to — ` +
        `\`${fx.check}\`/\`${fx.rule}\` stopped examining anything`,
    );
  } catch (error) {
    if (!(error instanceof FlakeError)) throw error;
    if (error.check !== fx.check || error.rule !== fx.rule)
      problems.push(
        `${name}: \`${error.check}\`/\`${error.rule}\` fired where \`${fx.check}\`/` +
          `\`${fx.rule}\` was meant to — the case proves something other than what it declares`,
      );
  }
}

// ── the report ────────────────────────────────────────────────────────────────

if (REPORT && live) {
  const tally = tallyOf(live);
  console.log(
    `\n== ${tally.cases.length} cases over ${tally.repetitions} repetitions ==`,
  );
  for (const c of [...tally.cases].sort(
    (a, b) => a.passed / a.runs.length - b.passed / b.runs.length,
  ))
    console.log(
      `  ${c.passed === c.runs.length ? ' ' : '!'} ${c.passed}/${c.runs.length}  ${c.key}`,
    );
}

// ── result ────────────────────────────────────────────────────────────────────

if (problems.length) {
  console.error(`X Flake gate — ${problems.length} violations:\n`);
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}
const tally = tallyOf(live);
console.log(
  `v Flake gate: ${tally.wobbling.length} of ${tally.cases.length} cases wobbled over ` +
    `${tally.repetitions} repetitions ` +
    `(${rateOf(tally.wobbling.length, tally.cases.length).toFixed(2)}%), taken ${tally.date}; ` +
    `\`${SNAPSHOT}\` is the record. Negative control: the reference input passes, ` +
    `${cases.length} prepared ones rejected on their own rules.`,
);
