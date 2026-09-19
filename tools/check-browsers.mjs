#!/usr/bin/env node
/**
 * Browser matrix gate: does `req-quality-browsers` — "the tests run on chromium, firefox
 * and webkit" — have a measurement behind it, or three entries in `playwright.config.mts`
 * that nobody reads again? Undoing the matrix gives NO RED TEST.
 *
 *  1. DENOMINATOR: the measurement can be taken and is not empty,
 *  2. the collected projects are exactly the policy's engines, each with tests,
 *  3. COVERAGE: every spec file runs on every engine — or carries an entry,
 *  4. the register of exclusions is alive and justified,
 *  5. CI installs every engine and does not narrow the run,
 *  6. FACT: a `measurement` exclusion's justification is measured, not remembered.
 *
 * What "really runs" comes from `playwright test --list`, not from the configuration —
 * the same move as "run the compiler" in `check-typecheck`. Point 6 re-probes on every
 * run: a fact about an engine stops holding at a package bump, not at a change here.
 *
 * Usage: node tools/check-browsers.mjs
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { runsTarget } from './workflow-targets.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FIXTURES = join(ROOT, 'tools/check-browsers.fixtures');
const REFERENCE = '_reference.json';

const E2E = 'apps/sandbox-e2e';
const TESTDIR = `${E2E}/src`;
const POLICY = `${E2E}/browsers.policy.json`;
const CI = '.github/workflows/ci.yml';

/**
 * What Playwright takes for a test file. A repetition of its default `testMatch`
 * (`**\/*.@(spec|test).?(c|m)[jt]s?(x)`) — point 3's denominator has to cover exactly the
 * files it collects, or the comparison of two lists measures a difference of definitions
 * rather than a difference of coverage.
 */
const SPEC = /\.(?:spec|test)\.(?:c|m)?[jt]sx?$/;

/** Kinds of exclusion justification. Any other kind is an entry the gate cannot read. */
const KINDS = ['record', 'measurement'];

/**
 * Flags that narrow the run. `--project` and `--grep` turn the matrix into one engine or
 * into a subset of the tests, changing neither the configuration nor the file list — so
 * points 1–3 would look exactly as they do today while something else ran. `--shard` is
 * deliberately NOT listed: it splits the same set across machines, so the sum of the runs
 * stays whole.
 */
const NARROWING = [
  ['--project', /(?:^|\s)--project(?:=|\s)/],
  ['--grep', /(?:^|\s)--grep(?:-invert)?(?:=|\s)/],
];

/**
 * Probes of facts about the engines. The key is what goes into the `fact` field of a
 * `measurement` exclusion; the value answers "can this engine do it".
 *
 * `author-colour-override` — whether under `forced-colors: active` the browser replaces
 * the author's colours with the user's palette. The probe measures that on an element with
 * NO rules of the library, because it asks about the browser's behaviour and not about a
 * stylesheet: the background `rgb(1, 2, 3)` is a value in no palette, so any answer other
 * than itself means "replaced".
 */
const PROBES = {
  'author-colour-override': async (page) => {
    await page.setContent(
      '<div id="s" style="background: rgb(1, 2, 3)"></div>',
    );
    const background = await page.evaluate(
      () => getComputedStyle(document.getElementById('s')).backgroundColor,
    );
    return background !== 'rgb(1, 2, 3)';
  },
};

/**
 * A violation of one of the checks. It carries the pair `check` + `rule`, not the
 * point's identifier alone: a gate's point is not one sentence (`lesson-50`), and a
 * negative control comparing only the point lets through a case that fired on a
 * neighbouring rule of that same point.
 */
class BrowsersError extends Error {
  constructor(check, rule, description) {
    super(description);
    this.check = check;
    this.rule = rule;
  }
}

const list = (items) => items.map((i) => `      ${i}`).join('\n');

// ── the checks ──────────────────────────────────────────────────────────────────

/**
 * The full set of checks over a ready input:
 *   `policy` — the contents of `browsers.policy.json`,
 *   `collected`  — `{ [engine]: [files] }`, measured by `playwright test --list`,
 *   `files`    — spec files from the git index, relative to `testDir`,
 *   `e2e`      — `{ command }` from the `sandbox-e2e:e2e` target in the Nx graph,
 *   `ci`       — `{ installs: [[engine]], runsE2E }` from the workflow,
 *   `facts`    — `{ [fact]: { [engine]: boolean } }`, the probes' results.
 * Throws `BrowsersError` on the first violation — the checks start from the
 * denominator, so the later ones would have nothing to examine anyway.
 */
export const checkBrowsers = ({ policy, collected, files, e2e, ci, facts }) => {
  const engines = Object.keys(policy?.engines ?? {});
  const exclusions = policy?.exclusions ?? [];

  // 1. DENOMINATOR. Each of the three lists can be empty for a different reason, and any
  // one of them empty gives a gate that always passes, having nothing to compare.
  if (!engines.length)
    throw new BrowsersError(
      'denominator',
      'policy-without-engines',
      `${POLICY} declares no engine at all — points 2–6 walk exactly this list, so all ` +
        `of them would pass without looking at anything`,
    );
  if (!files.length)
    throw new BrowsersError(
      'denominator',
      'no-files',
      `no spec file found in \`${TESTDIR}\` (git index) — point 3 would compare the ` +
        `collected tests against an empty set, that is, against nothing`,
    );
  const total = Object.values(collected ?? {}).reduce(
    (n, p) => n + (p?.length ?? 0),
    0,
  );
  if (!total)
    throw new BrowsersError(
      'denominator',
      'empty-measurement',
      `\`playwright test --list\` collected no file on any engine. Playwright then exits ` +
        `zero and the e2e run is green — exactly the state in which the matrix measures ` +
        `nothing`,
    );

  // 2. The engines. The set of collected projects against the policy's set, both ways:
  // the first catches an engine struck from the configuration, the second a project added
  // to it with no line in the policy — that is, with no place anyone could justify it.
  const collectedEngines = Object.keys(collected ?? {});
  const missing = engines.filter((s) => !(collected?.[s]?.length ?? 0));
  if (missing.length)
    throw new BrowsersError(
      'engines',
      'missing-engine',
      `${missing.length} engines from the policy collect no test at all: ${missing.join(', ')}.\n` +
        `    A project removed from \`projects\` in \`playwright.config.mts\` (or a ` +
        `\`testIgnore\` narrowed down to zero files) gives no red run — it gives a run one ` +
        `engine shorter. Remedy: restore the project, or strike the engine from ` +
        `${POLICY} and justify that in \`req-quality-browsers\`.`,
    );
  const extra = collectedEngines.filter((s) => !engines.includes(s));
  if (extra.length)
    throw new BrowsersError(
      'engines',
      'extra-engine',
      `${extra.length} Playwright projects have no entry in the policy: ${extra.join(', ')}.\n` +
        `    Points 3 and 6 walk the engines FROM THE POLICY, so a project outside it runs ` +
        `in CI, costs time and is never once looked at by this gate.`,
    );

  const baselines = engines.filter((s) => policy.engines[s]?.baseline);
  if (baselines.length !== 1)
    throw new BrowsersError(
      'engines',
      'ambiguous-baseline',
      `the policy names ${baselines.length} baseline engines (${baselines.join(', ') || 'none'}), ` +
        `and is to name exactly one.\n` +
        `    The baseline engine is point 6's baseline: a fact that holds for NOBODY is no ` +
        `defect of an engine but a broken probe. With no unambiguous baseline there is no ` +
        `way to tell the two apart.`,
    );
  const [baseline] = baselines;
  const baselineExclusions = exclusions.filter((w) =>
    (w?.engines ?? []).includes(baseline),
  );
  if (baselineExclusions.length)
    throw new BrowsersError(
      'engines',
      'baseline-with-exclusion',
      `the baseline engine \`${baseline}\` stands in ${baselineExclusions.length} exclusions ` +
        `(${baselineExclusions.map((w) => w.file).join(', ')}).\n` +
        `    The reference is the one that runs WITH NO exclusions — it is the measure ` +
        `for the rest. An engine with a hole stops being one, and point 3 loses what it ` +
        `compares coverage against.`,
    );

  // 3. COVERAGE. Both sides of the denominator first: a file from the repo nobody
  // collected, and a collected file that is not in the repo. Only then a gap on an engine.
  const allCollected = new Set(
    Object.values(collected ?? {}).flatMap((p) => p ?? []),
  );
  const uncollected = files.filter((p) => !allCollected.has(p));
  if (uncollected.length)
    throw new BrowsersError(
      'coverage',
      'file-outside-measurement',
      `${uncollected.length} spec files were collected by NO engine:\n` +
        list(uncollected) +
        `\n    The file sits in \`${TESTDIR}\`, is in the git index and runs nowhere — ` +
        `usually through a \`testMatch\`, \`testDir\` or \`testIgnore\` pattern added ` +
        `to every project at once. The run is green, because Playwright has nothing ` +
        `to run.`,
    );
  const outsideRepo = [...allCollected].filter((p) => !files.includes(p));
  if (outsideRepo.length)
    throw new BrowsersError(
      'coverage',
      'file-outside-repo',
      `${outsideRepo.length} files collected by Playwright are not in the git index:\n` +
        list(outsideRepo) +
        `\n    Point 3's denominator comes from git, so such a file is invisible to it: it ` +
        `runs, and the gate has no way of asking whether it runs everywhere.`,
    );

  const entryFor = (file, engine) =>
    exclusions.find(
      (w) => w?.file === file && (w?.engines ?? []).includes(engine),
    );
  const gaps = [];
  for (const engine of engines) {
    const running = new Set(collected[engine] ?? []);
    for (const file of files) {
      if (running.has(file)) continue;
      if (!entryFor(file, engine)) gaps.push(`${engine}: ${file}`);
    }
  }
  if (gaps.length)
    throw new BrowsersError(
      'coverage',
      'gap-without-entry',
      `${gaps.length} file × engine pairs do not run and have no entry in the policy:\n` +
        list(gaps) +
        `\n    This is what a \`testIgnore\` widened "because it flickers" looks like: ` +
        `coverage shrinks by one file, the run stays green and gets a few seconds shorter. ` +
        `Remedy: fix the test, or add an exclusion with a reason to ${POLICY}.`,
    );

  // 4. The register of exclusions. A dead entry is the same defect here as a dead word in
  // the token name dictionary: it outlives the problem and teaches you to read it as current.
  for (const entry of exclusions) {
    const where = `exclusion \`${entry?.file ?? '(no file)'}\``;
    if (!entry?.file || !files.includes(entry.file))
      throw new BrowsersError(
        'register',
        'entry-without-file',
        `${where} names a file that is not in \`${TESTDIR}\` (git index).\n` +
          `    An entry with no file fires nothing and protects nothing — it reads as a ` +
          `description of the state, and describes the one before a delete or a rename.`,
      );
    const entryEngines = entry.engines ?? [];
    const unknown = entryEngines.filter((s) => !engines.includes(s));
    if (!entryEngines.length || unknown.length)
      throw new BrowsersError(
        'register',
        'entry-without-engine',
        `${where} names ${entryEngines.length ? `unknown engines: ${unknown.join(', ')}` : 'an empty list of engines'}.\n` +
          `    Point 3 looks an entry up by the file × engine pair, so such an entry ` +
          `excuses nothing while looking in the register like a justification.`,
      );
    if (!KINDS.includes(entry.kind))
      throw new BrowsersError(
        'register',
        'entry-of-unknown-kind',
        `${where} has \`kind: ${JSON.stringify(entry.kind)}\`, and I understand ` +
          `${KINDS.map((r) => `\`${r}\``).join(' and ')}.\n` +
          `    The kind decides whether point 6 is to VERIFY the entry with a probe or ` +
          `take it as a recorded decision. An entry of an unknown kind would fall out of ` +
          `that question.`,
      );
    if (typeof entry.reason !== 'string' || entry.reason.trim().length < 40)
      throw new BrowsersError(
        'register',
        'entry-without-reason',
        `${where} carries no reason (or one contentless sentence).\n` +
          `    The register of exclusions is the only place where anybody explains why a ` +
          `file does NOT run — without that it is a list that grows.`,
      );
    if (entry.kind === 'measurement' && !PROBES[entry.fact])
      throw new BrowsersError(
        'register',
        'entry-without-probe',
        `${where} is of kind \`measurement\`, and \`fact: ${JSON.stringify(entry.fact)}\` ` +
          `has no probe in \`check-browsers.mjs\`.\n` +
          `    The \`measurement\` kind promises the justification is verified on every ` +
          `run. With no probe it is a \`record\` pretending to be a measurement — worse ` +
          `than a plain record.`,
      );
    const dead = entryEngines.filter((s) =>
      (collected[s] ?? []).includes(entry.file),
    );
    if (dead.length)
      throw new BrowsersError(
        'register',
        'dead-entry',
        `${where} excludes engines on which the file runs anyway: ${dead.join(', ')}.\n` +
          `    An exclusion with no effect outlives a problem that is gone, and reads as a ` +
          `description of today's state.`,
      );
  }

  // 5. CI. The gate measures `--list`, that is, the configuration — but what runs is a
  // COMMAND. Between the two sits `--project=chromium`, which points 1–3 cannot see.
  const commandDefects = NARROWING.filter(([, pattern]) =>
    pattern.test(e2e?.command ?? ''),
  ).map(([name]) => name);
  if (!e2e?.command)
    throw new BrowsersError(
      'ci',
      'e2e-without-command',
      `the \`sandbox-e2e:e2e\` target has no command that can be read — the gate cannot ` +
        `check whether the run is narrowed`,
    );
  if (commandDefects.length)
    throw new BrowsersError(
      'ci',
      'e2e-narrowed',
      `the \`sandbox-e2e:e2e\` command narrows the run (${commandDefects.join(', ')}):\n` +
        `      ${e2e.command}\n` +
        `    The configuration then declares three engines, \`--list\` shows three, and ` +
        `one runs. The only narrowing invisible in \`playwright.config.mts\`.`,
    );

  if (!ci?.installs?.length)
    throw new BrowsersError(
      'ci',
      'ci-without-install',
      `\`${CI}\` has no \`playwright install\` step at all — browsers do not come from ` +
        `nowhere, so either the run fails or (worse) somebody fixed it by narrowing the ` +
        `matrix`,
    );
  const ciGaps = ci.installs.flatMap((step, i) =>
    engines
      .filter((s) => !step.includes(s))
      .map((s) => `step #${i + 1}: no \`${s}\``),
  );
  if (ciGaps.length)
    throw new BrowsersError(
      'ci',
      'ci-without-engine',
      `${ciGaps.length} browser install steps in \`${CI}\` do not name an engine from the policy:\n` +
        list(ciGaps) +
        `\n    The steps come in pairs (a cache miss and a cache hit), one pair in every job ` +
        `that needs a browser, and all of them have to name the same set: an engine ` +
        `installed only on a miss disappears at the first hit.`,
    );
  if (!ci.runsE2E)
    throw new BrowsersError(
      'ci',
      'ci-without-e2e',
      `\`${CI}\` does not run the \`e2e\` target anywhere.\n` +
        `    That is this whole gate's denominator: the matrix describes a run that does ` +
        `not happen, and every point above passes because the configuration is fine.`,
    );

  const fault = coverFault(ci.shardCover);
  if (fault)
    throw new BrowsersError(
      'ci',
      'ci-shard-not-a-cover',
      fault === 'unreadable'
        ? `\`${CI}\` runs a sharded suite and no matrix under it could be read entry by ` +
            `entry, so nothing here can say whether the shards cover the suite once. The ` +
            `shape this gate reads is one line — \`shard: [1, 2, 3, 4, 5, 6]\` under ` +
            `\`matrix:\`, two spaces in, the numerators bare or quoted. A list written down ` +
            `the page, a flow map, or an expression is legible YAML and not legible here; ` +
            `answering "I could not tell" with silence is the defect this rule exists for, ` +
            `so it is answered with red instead.`
        : fault === 'axes'
          ? `the shard matrix in \`${CI}\` is multiplied by ` +
            `\`${ci.shardCover.keys.filter((k) => k !== 'shard').join('`, `')}\`, so ` +
            `\`job-total\` counts every combination while the numerators still run ` +
            `1…${ci.shardCover.shards.length} — the rest of the suite is never asked for, ` +
            `and the jobs that do run are green.`
          : `the shard numerators in \`${CI}\` are ` +
            `[${ci.shardCover.shards.join(', ')}] where ${ci.shardCover.shards.length} jobs ` +
            `need 1…${ci.shardCover.shards.length}, each once. Some shard of the suite is ` +
            `never asked for and every job is green — the one failure of a test suite ` +
            `nobody sees.`,
    );

  if (ci.shardsNotFromMatrix?.length)
    throw new BrowsersError(
      'ci',
      'ci-shard-not-from-matrix',
      `${ci.shardsNotFromMatrix.length} sharded \`e2e\` line(s) in \`${CI}\` take the ` +
        `shard count from a number instead of from the matrix:\n` +
        list(ci.shardsNotFromMatrix.map((l) => l.trim())) +
        `\n    The denominator has to be \`\${{ strategy.job-total }}\`, which IS the number ` +
        `of jobs. A number typed beside the matrix is a second copy of it, and the two ` +
        `disagree the first time somebody adds a shard: six jobs running \`--shard=N/8\` ` +
        `run six eighths of the suite and report green over the rest — which is the one ` +
        `failure of a test suite nobody sees.`,
    );

  // 6. FACT. A probe in every engine, for every fact a `measurement` exclusion appeals to.
  // Three rules, because there are three different ways such a justification can stop
  // holding, and only one of them is loud.
  const fromMeasurement = exclusions.filter((w) => w.kind === 'measurement');
  for (const fact of [...new Set(fromMeasurement.map((w) => w.fact))]) {
    const result = facts?.[fact] ?? {};
    const withoutResult = engines.filter((s) => typeof result[s] !== 'boolean');
    if (withoutResult.length)
      throw new BrowsersError(
        'fact',
        'probe-failed',
        `probe \`${fact}\` gave no result for: ${withoutResult.join(', ')}.\n` +
          `    With no result there is no way to say whether the exclusion still has a ` +
          `reason — and no verdict defaults to "it stays", the worst of the answers.`,
      );

    const excludedHere = new Set(
      fromMeasurement.filter((w) => w.fact === fact).flatMap((w) => w.engines),
    );
    if (!engines.some((s) => result[s]))
      throw new BrowsersError(
        'fact',
        'fact-without-baseline',
        `probe \`${fact}\` holds for NO engine, the reference \`${baseline}\` ` +
          `included.\n` +
          `    That is no defect of the engines but of the probe: were it ` +
          `to start returning false always, every exclusion resting on it would look ` +
          `justified forever. A measurement's denominator, not caution.`,
      );

    const survived = [...excludedHere].filter((s) => result[s]);
    if (survived.length)
      throw new BrowsersError(
        'fact',
        'fact-stale',
        `\`${fact}\` now holds for engines excluded on account of it: ${survived.join(', ')}.\n` +
          `    The reason for the exclusion is gone — most likely at a Playwright bump, a ` +
          `change that touches not one file in this repository. Remedy: take the entry out ` +
          `of ${POLICY} and out of \`testIgnore\`, then see what that file has to say ` +
          `there.`,
      );

    const withoutCoverage = engines.filter(
      (s) => !result[s] && !excludedHere.has(s),
    );
    if (withoutCoverage.length)
      throw new BrowsersError(
        'fact',
        'fact-unmirrored',
        `\`${fact}\` does not hold for engines whose files run anyway: ${withoutCoverage.join(', ')}.\n` +
          `    The tests ask there about behaviour the engine does not have — they will ` +
          `pass or fail, and either way measure something other than their name says.`,
      );
  }

  const excluded = exclusions.length;
  return (
    `${files.length} spec files on ${engines.length} engines ` +
    `(${engines.map((s) => `${s}: ${collected[s].length}`).join(', ')}), ` +
    `${excluded} ${excluded === 1 ? 'exclusion' : 'exclusions'} — ` +
    `${fromMeasurement.length} of them confirmed by a probe`
  );
};

// ── input from disk ───────────────────────────────────────────────────────────

const read = (path) => readFileSync(join(ROOT, path), 'utf8');

const policyFromDisk = () => JSON.parse(read(POLICY));

/**
 * What Playwright REALLY collects, project by project. `--list` starts neither the
 * `webServer` nor the browsers, so the measurement costs seconds rather than minutes — and
 * still goes through the same configuration code as a real run.
 */
const collectedByPlaywright = () => {
  let raw;
  try {
    raw = execFileSync(
      join(ROOT, 'node_modules/.bin/playwright'),
      ['test', '--list', '--reporter=json'],
      {
        cwd: join(ROOT, E2E),
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
        maxBuffer: 64 * 1024 * 1024,
      },
    );
  } catch (error) {
    throw new BrowsersError(
      'denominator',
      'unreadable-measurement',
      `\`playwright test --list\` could not be run:\n    ` +
        String(error.stderr || error.stdout || error.message)
          .trim()
          .split('\n')
          .slice(0, 8)
          .join('\n    '),
    );
  }

  let report;
  try {
    report = JSON.parse(raw);
  } catch {
    throw new BrowsersError(
      'denominator',
      'unreadable-measurement',
      `the output of \`playwright test --list --reporter=json\` is not JSON ` +
        `(${raw.length} characters) — the gate has nothing to derive the matrix from`,
    );
  }
  if (report.errors?.length)
    throw new BrowsersError(
      'denominator',
      'unreadable-measurement',
      `Playwright reported ${report.errors.length} errors while collecting tests:\n    ` +
        report.errors
          .map((e) => (e.message ?? String(e)).split('\n')[0])
          .join('\n    '),
    );

  const collected = {};
  const walk = (suite) => {
    for (const spec of suite.specs ?? [])
      for (const test of spec.tests ?? []) {
        (collected[test.projectName] ??= new Set()).add(spec.file);
      }
    for (const deeper of suite.suites ?? []) walk(deeper);
  };
  for (const suite of report.suites ?? []) walk(suite);

  // A project with no test at all does not appear in the result tree, and point 2 is to
  // name it — hence an empty list rather than a missing key.
  for (const project of report.config?.projects ?? [])
    collected[project.name] ??= new Set();

  return Object.fromEntries(
    Object.entries(collected).map(([k, v]) => [k, [...v].sort()]),
  );
};

/**
 * Spec files from the GIT INDEX, not from a directory scan: an uncommitted file binds
 * nobody yet, and an artifact in `dist/` is nobody's test.
 */
const specFiles = () =>
  execFileSync('git', ['ls-files', TESTDIR], { cwd: ROOT, encoding: 'utf8' })
    .split('\n')
    .map((p) => p.trim())
    .filter((p) => p && SPEC.test(p))
    .map((p) => p.slice(`${TESTDIR}/`.length))
    .sort();

/**
 * The `e2e` target's command FROM THE NX GRAPH, not from `project.json`: that target is
 * INFERRED by `@nx/playwright/plugin`, so the project file does not carry it at all.
 */
const targetE2E = async () => {
  const { createProjectGraphAsync } = await import('@nx/devkit');
  const graph = await createProjectGraphAsync({ exitOnError: false });
  const target = graph.nodes['sandbox-e2e']?.data?.targets?.e2e;
  const { command, commands } = target?.options ?? {};
  const entries = commands ?? (command === undefined ? [] : [command]);
  return {
    command: entries
      .map((c) => (typeof c === 'string' ? c : (c?.command ?? '')))
      .join(' && '),
  };
};

/**
 * What the workflow does. Read from the text, because the question is about text: which
 * engines the install step names, and whether the `e2e` target is on the list of things
 * that run at all.
 *
 * Comments are stripped BEFORE the search, and that is not excess caution: this workflow
 * explains every step of its own in a paragraph of prose, so a sentence about `playwright
 * install` looks to a pattern exactly like a call to `playwright install`. The gate
 * reported this to itself on the first run after its own comment was added — it counted
 * four install steps where there are two, and fired on two of them.
 */
/**
 * The `shard:` axis of a workflow's matrix, read off the indentation: `{ shards, keys }`,
 * or `null` when there is no matrix carrying one. Both fields are what point 5 needs —
 * the numerators somebody wrote, and every axis they are multiplied by.
 */
/**
 * What is wrong with one shard matrix — `unreadable`, `axes`, `numerators` — or null when it
 * is a cover: one job per shard, each numerator once, none missing. One home, because the
 * reader picks the matrix to complain about by the same rule the complaint is phrased with.
 */
const coverFault = (cover) => {
  if (!cover) return null;
  if (cover.unreadable) return 'unreadable';
  if (cover.keys.some((key) => key !== 'shard')) return 'axes';
  const expected = cover.shards.map((_, i) => i + 1).join(',');
  const written = cover.shards
    .slice()
    .sort((a, b) => a - b)
    .join(',');
  return written === expected ? null : 'numerators';
};

const coverOf = (lines) => {
  const found = [];
  for (let i = 0; i < lines.length; i++) {
    const opening = lines[i].match(/^(\s*)matrix:\s*$/);
    if (!opening) continue;
    const depth = opening[1].length;
    const keys = [];
    let written = null;
    // The WHOLE block, not up to the `shard:` line: an axis written after it multiplies the
    // matrix exactly as one written before, and a reader that returned at `shard:` never saw
    // the second kind — measured on a doctored workflow, where it passed.
    for (let j = i + 1; j < lines.length; j++) {
      if (!lines[j].trim()) continue;
      const indent = lines[j].match(/^\s*/)[0].length;
      if (indent <= depth) break;
      const key = lines[j].match(/^\s*([A-Za-z0-9_-]+):\s*(.*)$/);
      if (!key || indent !== depth + 2) continue;
      keys.push(key[1]);
      const list = key[1] === 'shard' && key[2].trim().match(/^\[(.*)\]$/);
      if (list) written = list[1];
    }
    if (written !== null) found.push({ written, keys });
  }
  if (!found.length) return null;
  /*
   * EVERY matrix carrying a `shard:`, and every entry of it read or the whole list given up
   * as unreadable. Both halves come from the review of 0081, which broke the first version
   * twice with a quoted list: `Number("'1'")` is NaN, a reader that FILTERED those out was
   * left comparing an empty list to an empty list, and `['1','1','2','3','4','5']` — valid
   * Actions, and a matrix that runs shard 1 twice and shard 6 never — passed in silence.
   * That is the defect this rule exists to refuse, produced by the rule's own reader.
   */
  const read = found.map(({ written, keys }) => {
    const entries = written
      .split(',')
      .map((entry) => entry.trim().replace(/^['"]|['"]$/g, ''));
    const shards = entries.map(Number);
    return shards.every((n) => Number.isInteger(n))
      ? { shards, keys }
      : { unreadable: true };
  });
  // The first matrix that is WRONG, and only otherwise the first at all: two jobs, one of
  // them a cover and one of them not, left the second unread while the first answered for it.
  return read.find((one) => coverFault(one)) ?? read[0];
};

const ciStepsOf = (text, engines) => {
  const lines = String(text ?? '')
    .split('\n')
    .map((l) => l.replace(/#.*$/m, ''));
  const installs = lines
    .filter((l) => /playwright\s+install/.test(l))
    .map((l) => engines.filter((s) => new RegExp(`\\b${s}\\b`).test(l)));
  /*
   * Whether the `e2e` TARGET runs, asked of the target list rather than of the line's words.
   * `\be2e\b` was true of `check-e2e` on the battery's own line, so this answered yes with
   * the whole browser job deleted — and yes again from a comment, since the strip above
   * happens in this function and the pattern was applied to the raw line elsewhere. The
   * reading in `workflow-targets.mjs` strips comments, reads past options and takes the
   * words after `-t` as names.
   */
  const runsE2E = runsTarget(text, 'e2e');
  /*
   * A sharded run is a narrowed run six times over, and the six are the whole suite only if
   * the denominator is the number of jobs. Nothing else in this repository can see that
   * arithmetic: the configuration still declares three engines whatever `--shard` says,
   * points 1-3 pass, every job goes green, and a sixth of the tests never ran. So the
   * workflow says the number once — `${{ strategy.job-total }}` IS the size of the matrix —
   * and this line refuses a number typed beside it.
   */
  // `--shard=1/6` and `--shard 1/6` are the same instruction to Playwright — measured, it
  // lists the same 348 tests — so a pattern that knows only the first leaves both rules
  // below silent over a run that is narrowed exactly as much.
  const sharded = lines.filter(
    (l) => /nx\s+(?:affected|run-many)/.test(l) && /--shard(?:=|\s)/.test(l),
  );
  const shardsNotFromMatrix = sharded.filter(
    (l) => !/strategy\.job-total/.test(l),
  );
  /*
   * The other half of the same question, and the half the denominator alone cannot answer:
   * `${{ strategy.job-total }}` is the number of jobs in the matrix, so it is the right
   * denominator only while the matrix is a COVER — one job per shard, each numerator once,
   * none missing. Two ways to lose a sixth of the suite with the rule above satisfied, both
   * of them silent and both measured on a doctored workflow: `shard: [1, 1, 2, 3, 4, 5]`
   * runs shard 1 twice and shard 6 never, and a second axis beside `shard` doubles
   * `job-total` while the numerators stay 1..6, so half the suite is never asked for.
   *
   * The matrix is read off the text at one indentation level, which is what prettier keeps
   * this file at. A sharded run whose matrix cannot be read at all is the third case, and it
   * fires with the rest: a rule that answers "I could not tell" with silence is the defect
   * it was written against.
   */
  const shardCover = sharded.length
    ? (coverOf(lines) ?? { unreadable: true })
    : null;
  return { installs, runsE2E, shardsNotFromMatrix, shardCover };
};

/** The workflow on disk, read by the rule above. */
const ciSteps = (engines) => ciStepsOf(read(CI), engines);

/**
 * Probes in real browsers — one page per engine, with no server and no application. What
 * is measured here is the ENGINE's behaviour, so the less there is around it, the fewer
 * things can answer in its place.
 */
const measureFacts = async (policy) => {
  const needed = [
    ...new Set(
      (policy.exclusions ?? [])
        .filter((w) => w.kind === 'measurement' && PROBES[w.fact])
        .map((w) => w.fact),
    ),
  ];
  if (!needed.length) return {};

  const playwright = await import('playwright');
  const facts = Object.fromEntries(needed.map((f) => [f, {}]));

  for (const engine of Object.keys(policy.engines)) {
    const browserType = playwright[engine];
    if (!browserType) continue;
    let browser;
    try {
      browser = await browserType.launch();
      const context = await browser.newContext({
        forcedColors: 'active',
      });
      const page = await context.newPage();
      for (const fact of needed) facts[fact][engine] = await PROBES[fact](page);
    } catch {
      // No result is content here, not a failure: point 6 is to SAY so (the
      // `probe-failed` rule) rather than bring the gate down with a stack trace.
    } finally {
      await browser?.close();
    }
  }
  return facts;
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
  const w = structuredClone(reference.input);

  for (const name of fx.dropEngines ?? []) delete w.policy.engines[name];
  for (const [name, def] of Object.entries(fx.addEngines ?? {}))
    w.policy.engines[name] = def;
  if (fx.clearEngines) w.policy.engines = {};

  w.policy.exclusions = w.policy.exclusions.filter(
    (x) => !(fx.dropExclusions ?? []).includes(x.file),
  );
  for (const [file, fields] of Object.entries(fx.replaceExclusion ?? {})) {
    const entry = w.policy.exclusions.find((x) => x.file === file);
    if (entry) for (const [k, v] of Object.entries(fields)) entry[k] = v;
  }
  w.policy.exclusions.push(...(fx.addExclusions ?? []));

  if (fx.clearFiles) w.files = [];
  w.files = w.files.filter((p) => !(fx.dropFiles ?? []).includes(p));
  w.files.push(...(fx.addFiles ?? []));
  w.files.sort();

  for (const [engine, files] of Object.entries(fx.dropCollected ?? {}))
    w.collected[engine] = (w.collected[engine] ?? []).filter(
      (p) => !files.includes(p),
    );
  for (const [engine, files] of Object.entries(fx.addCollected ?? {}))
    w.collected[engine] = [...(w.collected[engine] ?? []), ...files].sort();
  for (const engine of fx.clearCollected ?? []) w.collected[engine] = [];

  if (fx.e2e) w.e2e = { ...w.e2e, ...fx.e2e };
  /*
   * `ciText` runs a case's own miniature workflow through the READER, where `ci` hands the
   * rule a state and leaves the reader unexercised. The distinction is not academic: the
   * shard reader passed a quoted list in silence while the fixture beside it, which supplied
   * the parsed state, went on being rejected exactly as declared.
   */
  if (fx.ciText)
    w.ci = ciStepsOf(fx.ciText, Object.keys(w.policy.engines ?? {}));
  if (fx.ci) w.ci = { ...w.ci, ...fx.ci };
  for (const [fact, results] of Object.entries(fx.facts ?? {}))
    w.facts[fact] = { ...w.facts[fact], ...results };

  return w;
};

// ── the run ───────────────────────────────────────────────────────────────────

const problems = [];
let summary = null;

try {
  const policy = policyFromDisk();
  summary = checkBrowsers({
    policy,
    collected: collectedByPlaywright(),
    files: specFiles(),
    e2e: await targetE2E(),
    ci: ciSteps(Object.keys(policy.engines ?? {})),
    facts: await measureFacts(policy),
  });
} catch (error) {
  if (!(error instanceof BrowsersError)) throw error;
  problems.push(`${error.check}/${error.rule}: ${error.message}`);
}

if (!existsSync(FIXTURES))
  problems.push(
    `tools/check-browsers.fixtures: the directory does not exist — a gate with no proof ` +
      `that it can fail is one more silent defect (req-quality-negative-control)`,
  );

const cases = existsSync(FIXTURES)
  ? readdirSync(FIXTURES)
      .filter((n) => n.endsWith('.json') && n !== REFERENCE)
      .sort()
  : [];

if (existsSync(FIXTURES) && !cases.length)
  problems.push(
    `tools/check-browsers.fixtures: no prepared inputs — a gate with no proof that it can ` +
      `fail is one more silent defect (req-quality-negative-control)`,
  );

// The reference input MUST pass. Were it defective itself, every case would fire
// because of it and not because of its own defect — every "it fired" would be false.
if (cases.length) {
  try {
    checkBrowsers(buildFixture({}));
  } catch (error) {
    if (!(error instanceof BrowsersError)) throw error;
    problems.push(
      `${REFERENCE}: the reference input does NOT pass (${error.check}/${error.rule}) — ` +
        `every prepared case now fires because of it.\n    ${error.message}`,
    );
  }
}

for (const name of cases) {
  const fx = readFixture(name);
  try {
    checkBrowsers(buildFixture(fx));
    problems.push(
      `${name}: the prepared input PASSED and was meant not to — ` +
        `rule \`${fx.check}/${fx.rule}\` stopped examining anything`,
    );
  } catch (error) {
    if (!(error instanceof BrowsersError)) throw error;
    if (error.check !== fx.check || error.rule !== fx.rule)
      problems.push(
        `${name}: rule \`${error.check}/${error.rule}\` fired, and \`${fx.check}/${fx.rule}\` ` +
          `was meant to — the fixture proves something other than what it declares`,
      );
  }
}

// ── result ────────────────────────────────────────────────────────────────────

if (problems.length) {
  console.error(`X Browser matrix gate — ${problems.length} violations:\n`);
  for (const p of problems) console.error(`  - ${p}`);
  console.error('');
  process.exit(1);
}

console.log(
  `✓ Browser matrix: ${summary}. Negative control: the reference input passes, ` +
    `${cases.length} prepared ones rejected on their own rules.`,
);
