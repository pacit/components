#!/usr/bin/env node
/**
 * Distance gate: how much of this work exists only here, and for how long (0075)? A push is
 * the maintainer's act, so this one does not push — it refuses to let the distance grow
 * quietly, the way `check-bundle` refuses a drift in bytes.
 *
 *  1. MEASURED: the checkout can see a remote at all, and every reading is a whole count,
 *  2. DENOMINATOR: the unit is a commit no remote ref carries, read two different ways,
 *  3. CEILING: both numbers are whole and above zero, and each carries its reason,
 *  4. COMMITS: the count of commits that exist only here is at or under the ceiling,
 *  5. DAYS: the oldest of them is no older than the ceiling in days.
 *
 * Off a runner the reading is zero by construction — a true reading, not a skip. What point 1
 * catches there is a checkout with no remote-tracking ref: the base `nx affected` compares
 * against, guarded nowhere else. Register: `distance.policy.json`. Control: the fixtures tree.
 *
 * Usage: node tools/check-distance.mjs [--report]  (--report: the commits and their ages)
 */
import { readFileSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const REPORT = process.argv.includes('--report');
const POLICY = 'tools/distance.policy.json';
const FIXTURES = join(ROOT, 'tools/check-distance.fixtures');
const REFERENCE = '_reference.json';
const DAY = 86400;

/** The two numbers the register is required to carry, and nothing else is read out of it. */
const CEILINGS = ['commits', 'days'];
/** A reason short enough to be a label is not a reason — the same floor the other registers use. */
const REASON = 40;

/**
 * A violation of one of the five points. It carries the point's identifier AND the rule that
 * fired: the negative control holds a prepared input to both, because a case that fires on
 * the right point for the wrong reason proves something other than what it declares.
 */
class DistanceError extends Error {
  constructor(check, rule, message) {
    super(message);
    this.check = check;
    this.rule = rule;
  }
}

const git = (...args) =>
  execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim();

const lines = (text) => text.split('\n').filter(Boolean);

/**
 * The unit is a commit reachable from `HEAD` and from NO remote-tracking ref — not "ahead of
 * `origin/main`", which is a statement about one branch, but "exists on this disk and nowhere
 * else", which is the continuous property 0075 bought and the one that decays.
 */
const readInput = () => ({
  remotes: lines(git('for-each-ref', '--format=%(refname)', 'refs/remotes')),
  commits: lines(
    git('log', '--format=%H %ct', 'HEAD', '--not', '--remotes'),
  ).map((line) => ({ sha: line.slice(0, 40), at: Number(line.slice(41)) })),
  // The second reading, and through a different command: does any remote ref carry `HEAD`
  // itself? It has to agree with the count above, because `HEAD` is in its own reachable set.
  carried: lines(
    git(
      'for-each-ref',
      '--contains',
      'HEAD',
      '--format=%(refname)',
      'refs/remotes',
    ),
  ),
  now: Math.floor(Date.now() / 1000),
  policy: JSON.parse(readFileSync(join(ROOT, POLICY), 'utf8')),
});

// ── the checks ────────────────────────────────────────────────────────────────

/** 1. MEASURED — a reading taken against nothing is not a small distance, it is no reading. */
const checkMeasured = (input) => {
  if (!input.remotes.length)
    throw new DistanceError(
      'measured',
      'no-remote-ref',
      `this checkout has no remote-tracking ref, so the distance would be measured against ` +
        `nothing and every commit would read as unpushed. It is also the shape \`nx affected\` ` +
        `has no base to compare against — the reason \`ci.yml\` asks for the whole history`,
    );
  if (!Number.isInteger(input.now) || input.now <= 0)
    throw new DistanceError(
      'measured',
      'clock-not-whole',
      `the clock reads \`${input.now}\`, which is not a whole number of seconds`,
    );
  for (const { sha, at } of input.commits)
    if (!Number.isInteger(at) || at <= 0)
      throw new DistanceError(
        'measured',
        'date-not-whole',
        `\`${sha.slice(0, 8)}\` carries the date \`${at}\`, which is not a whole number of ` +
          `seconds — an unparsed date silently ages to 1970 and passes every ceiling`,
      );
};

/** 2. DENOMINATOR — the count and the containment have to be the same fact. */
const checkDenominator = (input) => {
  const only = input.commits.length;
  const carried = input.carried.length;
  if ((only === 0) !== carried > 0)
    throw new DistanceError(
      'denominator',
      'readings-disagree',
      `two readings of one fact disagree: ${only} commit(s) that no remote carries, and ` +
        `${carried} remote ref(s) that carry \`HEAD\` itself. Those cannot both be true — ` +
        `\`HEAD\` is in its own reachable set, so a carried \`HEAD\` means a distance of zero`,
    );
};

/** 3. CEILING — a ceiling with no reason beside it is a number the next person will raise. */
const checkCeiling = (input) => {
  for (const key of CEILINGS) {
    const value = input.policy?.[key];
    if (value === undefined)
      throw new DistanceError(
        'ceiling',
        'ceiling-missing',
        `\`${POLICY}\` carries no \`${key}\` — the ceiling is the maintainer's number (0075), ` +
          `and a gate that supplies its own would be holding the work to nobody's`,
      );
    if (!Number.isInteger(value))
      throw new DistanceError(
        'ceiling',
        'ceiling-not-whole',
        `\`${key}\` is \`${value}\` — a ceiling counted in commits or in days is whole (0023)`,
      );
    if (value <= 0)
      throw new DistanceError(
        'ceiling',
        'ceiling-not-positive',
        `\`${key}\` is \`${value}\`, which forbids the commit that has not been pushed yet — ` +
          `a ceiling of zero is a rule against working, not against holding work back`,
      );
    const reason = input.policy?.[`// ${key}`];
    if (typeof reason !== 'string' || reason.trim().length < REASON)
      throw new DistanceError(
        'ceiling',
        'ceiling-without-reason',
        `\`${key}\` stands in \`${POLICY}\` with no \`"// ${key}"\` beside it saying what the ` +
          `number is for — ${REASON} characters at the least, because the next person to find ` +
          `this gate red will otherwise raise the number rather than push`,
      );
  }
};

/** 4. COMMITS — how much of this work exists on one disk. */
const checkCommits = (input) => {
  const only = input.commits.length;
  if (only > input.policy.commits)
    throw new DistanceError(
      'commits',
      'too-many-commits',
      `${only} commits exist here and on no remote, against a ceiling of ` +
        `${input.policy.commits}. This is not a push — \`git push\` is yours to run (0075); ` +
        `it is the gate refusing to let the distance grow without anybody reading it`,
    );
};

/** 5. DAYS — and for how long. A small count of very old commits is the same defect. */
const checkDays = (input) => {
  if (!input.commits.length) return;
  const oldest = Math.min(...input.commits.map((c) => c.at));
  const age = (input.now - oldest) / DAY;
  if (age > input.policy.days)
    throw new DistanceError(
      'days',
      'too-old',
      `the oldest commit that exists only here is ${age.toFixed(1)} days old, against a ` +
        `ceiling of ${input.policy.days}. The count says how much is at stake; this says how ` +
        `long a disk failure has been able to take it (\`lesson-191\`)`,
    );
};

const checkDistance = (input) => {
  checkMeasured(input);
  checkDenominator(input);
  checkCeiling(input);
  checkCommits(input);
  checkDays(input);
  return input;
};

// ── the live run ──────────────────────────────────────────────────────────────

const problems = [];
let live = null;
try {
  live = checkDistance(readInput());
} catch (error) {
  if (!(error instanceof DistanceError)) throw error;
  problems.push(`${error.check}/${error.rule}: ${error.message}`);
  try {
    live = readInput();
  } catch {
    live = null;
  }
}

// ── the negative control ──────────────────────────────────────────────────────

/**
 * Builds a case's input ON A COPY of the live one, so the case file holds nothing but its own
 * defect: `remotes` and `carried` are emptied or extended, `commits` emptied, padded with
 * `pad` or extended with `add` (an entry dates itself with `daysAgo`, or with a raw `at` when
 * the point of the case is a date that does not parse), `now` is set or moved by
 * `forwardDays`, and `policy` takes `drop` and `set`. A stored copy of the input is deliberately absent —
 * it would measure the repository as it was the day somebody stored it.
 */
const buildFixture = (base, fx) => {
  const w = structuredClone(base);
  for (const layer of ['remotes', 'carried', 'commits'])
    if (fx[layer]?.clear) w[layer] = [];
  for (const layer of ['remotes', 'carried'])
    w[layer].push(...(fx[layer]?.add ?? []));
  if (fx.now?.set !== undefined) w.now = fx.now.set;
  if (fx.now?.forwardDays) w.now += fx.now.forwardDays * DAY;
  for (let i = 0; i < (fx.commits?.pad ?? 0); i += 1)
    w.commits.push({ sha: String(i).padStart(40, '0'), at: w.now });
  for (const entry of fx.commits?.add ?? [])
    w.commits.push({
      sha: (entry.sha ?? `f${w.commits.length}`).padEnd(40, '0'),
      at: entry.at ?? w.now - (entry.daysAgo ?? 0) * DAY,
    });
  for (const key of fx.policy?.drop ?? []) delete w.policy[key];
  Object.assign(w.policy, fx.policy?.set ?? {});
  return w;
};

const cases = readdirSync(FIXTURES)
  .filter((name) => name.endsWith('.json') && name !== REFERENCE)
  .sort();
if (cases.length === 0)
  problems.push(
    `tools/check-distance.fixtures: no prepared inputs — a gate with no proof that it can ` +
      `fail is one more silent defect (req-quality-negative-control)`,
  );

if (live)
  for (const name of cases) {
    const fx = JSON.parse(readFileSync(join(FIXTURES, name), 'utf8'));
    try {
      checkDistance(buildFixture(live, fx));
      problems.push(
        `${name}: the prepared input PASSED and was meant not to — point ${fx.point} ` +
          `(\`${fx.check}\`/\`${fx.rule}\`) stopped examining anything`,
      );
    } catch (error) {
      if (!(error instanceof DistanceError)) throw error;
      if (error.check !== fx.check || error.rule !== fx.rule)
        problems.push(
          `${name}: \`${error.check}\`/\`${error.rule}\` fired where point ${fx.point} ` +
            `(\`${fx.check}\`/\`${fx.rule}\`) was meant to — the case proves something other ` +
            `than what it declares`,
        );
    }
  }

// ── the report ────────────────────────────────────────────────────────────────

if (REPORT && live) {
  console.log(
    `\n== ${live.commits.length} commit(s) on this disk and no remote, against ` +
      `${live.policy.commits} / ${live.policy.days} days ==`,
  );
  for (const { sha, at } of live.commits)
    console.log(
      `  ${sha.slice(0, 8)}  ${((live.now - at) / DAY).toFixed(1).padStart(6)} days  ` +
        `${git('show', '-s', '--format=%s', sha).slice(0, 72)}`,
    );
}

// ── result ────────────────────────────────────────────────────────────────────

if (problems.length) {
  console.error(`X Distance gate — ${problems.length} violations:\n`);
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}
const oldest = live.commits.length
  ? `${Math.max(...live.commits.map((c) => (live.now - c.at) / DAY)).toFixed(1)} days`
  : 'nothing';
console.log(
  `v Distance gate: ${live.commits.length} commit(s) exist only here against a ceiling of ` +
    `${live.policy.commits}, the oldest ${oldest} old against ${live.policy.days} days; ` +
    `${live.remotes.length} remote ref(s) read. Negative control: the live input passes, ` +
    `${cases.length} prepared ones rejected on their own points.`,
);
