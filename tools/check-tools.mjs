#!/usr/bin/env node
/**
 * Scripts gate: does every name in the repository's own `.mjs` resolve to something? Nothing
 * read them — `eslint.config.mjs` matches four extensions and `.mjs` is not one, and a lint
 * target belongs to an Nx project, while `tools/` is no project.
 *
 *  1. MEASURED: the scripts are found at all, and the set is read two different ways,
 *  2. NAMES: no identifier in any of them resolves to nothing,
 *  3. CONTROL: the prepared scripts are read, one reported and one not,
 *  4. RUN: every script under `tools/` is executed by a pass, or the register says why not.
 *
 * `at-pass.mjs` carried `CEILING_TAB`, declared nowhere, and threw on the first view of every
 * run for a day and a half (`lesson-210`). `no-undef` is the whole instrument on purpose: a
 * name absent at runtime is invisible to a parser, and a test meets it only down one branch.
 *
 * Usage: node tools/check-tools.mjs [--report]   (--report: the files it read)
 */
import { readFileSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ESLint } from 'eslint';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const REPORT = process.argv.includes('--report');
const FIXTURES = 'tools/check-tools.fixtures';
const POLICY = 'tools/tools.policy.json';
const WORKFLOWS = ['ci.yml', 'nightly.yml'];
const REPORTED = 'a-name-nothing-declares.mjs';
const PASSED = 'a-name-the-browser-declares.mjs';

/**
 * Every name a script here may use without declaring it, written out. The `globals` package
 * would have supplied the node set in one line and was measured against this: it is a
 * transitive dependency of eslint rather than one this repository asks for, and it admits
 * several hundred names, so a misspelling that lands on a forgotten one goes quiet. Eleven
 * is what the whole repository actually uses. `document` and the three beside it are what a
 * browser hands a `page.evaluate` callback — the whole browser set is refused for the same
 * reason. A twelfth name arriving legitimately is one line here, and the gate says so.
 */
const ALLOWED = Object.fromEntries(
  [
    'console',
    'process',
    'structuredClone',
    'fetch',
    'setTimeout',
    'AbortSignal',
    'Buffer',
    'document',
    'window',
    'location',
    'getComputedStyle',
  ].map((name) => [name, 'readonly']),
);
class ToolsError extends Error {
  constructor(check, rule, message) {
    super(message);
    this.check = check;
    this.rule = rule;
  }
}

// ── the rules ─────────────────────────────────────────────────────────────────

/**
 * Every point, over an input that is a plain object, so a prepared case is a copy of the live
 * reading with one thing moved. `findings` is what the reader said about the scripts;
 * `reported` and `passed` are what it said about the two prepared files, which is a reading
 * of the READER and not of this repository.
 */
const checkTools = (input) => {
  const fire = (check, rule, message) => {
    throw new ToolsError(check, rule, message);
  };

  // 1. MEASURED — a gate whose denominator can be zero answers from an empty set, and an
  // empty set satisfies "no name resolves to nothing" perfectly.
  if (!Array.isArray(input.scripts) || !Array.isArray(input.tracked))
    fire(
      'measured',
      'nothing-to-read',
      'the set of scripts is not a list — nothing was read, and a reading of nothing is ' +
        'not a reading',
    );
  if (input.scripts.length === 0)
    fire(
      'measured',
      'nothing-to-read',
      'no `.mjs` file was found to read. Every name in an empty set resolves, so this ' +
        'gate would pass on a repository that had lost its own battery',
    );
  // Two readings of the same set, taken by different means: a pathspec that asks git to do
  // the matching, and the whole tracked list matched here by suffix. A git pathspec is NOT a
  // shell glob — without `:(glob)` a star crosses `/`, which is how `tools/*.mjs` quietly
  // returns forty-three files where the shell returns thirty-two. The first version of this
  // gate compared git against a walk of the filesystem instead and read 220 against 46,
  // because a walk answers for `dist/` and `tmp/` too: two readings of two different sets
  // are not a check, they are a disagreement nobody can settle.
  if (input.scripts.length !== input.tracked.length)
    fire(
      'measured',
      'readings-disagree',
      `the pathspec offers ${input.tracked.length} script(s) and the tracked list ` +
        `${input.scripts.length}. One of the two is reaching somewhere the other does not, ` +
        'and neither number can be trusted until they agree',
    );

  // Point 4 answers from `underTools`, and an empty one would answer "no script is cold"
  // perfectly. It cannot be derived from the set above being non-empty: `tracked` reaches the
  // whole repository and this is one directory of it.
  if (!input.underTools.length)
    fire(
      'measured',
      'nothing-to-read',
      'no script was found directly under `tools/`, which is where this repository keeps the ' +
        'instruments it runs itself with. Point 4 would then have nothing to be cold',
    );
  if (!input.exercised.length)
    fire(
      'measured',
      'nothing-to-read',
      'no target of any workflow was found to run a script under `tools/`. Every script ' +
        'would then be cold, which is a reading of the pattern and not of the repository',
    );

  // 2. NAMES — the finding itself.
  if (input.findings.length) {
    const where = input.findings
      .slice(0, 8)
      .map((f) => `  ${f.file}:${f.line} — ${f.message}`)
      .join('\n');
    fire(
      'names',
      'name-undeclared',
      `${input.findings.length} name(s) resolve to nothing at runtime:\n${where}` +
        (input.findings.length > 8
          ? `\n  … and ${input.findings.length - 8} more`
          : '') +
        '\nA file like this parses, so `node --check` is content and the defect waits for the ' +
        'branch that reaches it. If the name is a real global this repository has started ' +
        'to use, it belongs in `ALLOWED` above — one line, and deliberately one line',
    );
  }

  // 3. CONTROL — both halves. A reader that reports nothing passes the repository; a reader
  // that reports everything passes it too, once somebody silences it.
  if (input.reported !== 1)
    fire(
      'control',
      'control-passed',
      `\`${REPORTED}\` carries exactly one name nothing declares and the reader made ` +
        `${input.reported} finding(s) on it. The reading above is only worth what this ` +
        'number is worth (`req-quality-negative-control`)',
    );
  if (input.passed !== 0)
    fire(
      'control',
      'control-cries-wolf',
      `\`${PASSED}\` carries only names a browser hands to a \`page.evaluate\` callback, ` +
        `and the reader made ${input.passed} finding(s) on it. A reader that reports ` +
        'everything is as useless as one that reports nothing, and louder',
    );

  // 4. RUN — point 2 asks whether the names inside a script resolve. This asks whether
  // anything ever reaches the script. `at-pass.mjs` answered yes to the first for a day and
  // a half while answering no to the second, and the defect lived in the gap.
  const cold = input.underTools.filter(
    (name) => !input.exercised.includes(name),
  );
  const unexplained = cold.filter((name) => !input.policy[name]);
  if (unexplained.length)
    fire(
      'run',
      'unexplained',
      `no pass executes \`${unexplained.join('`, `')}\`, and \`${POLICY}\` does not say ` +
        'why. A script nothing runs is a script nothing reads either, and the first time it ' +
        'is wrong is the first time somebody needs it',
    );
  const stale = Object.keys(input.policy)
    .filter((key) => !key.startsWith('// '))
    .filter((name) => input.exercised.includes(name));
  if (stale.length)
    fire(
      'run',
      'stale-excuse',
      `\`${POLICY}\` excuses \`${stale.join('`, `')}\` from running, and a pass runs ` +
        'them. An excuse nobody removed reads like a fact and is one more thing to disbelieve',
    );
};

// ── the live reading ──────────────────────────────────────────────────────────

const git = (...args) =>
  execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' });
const lines = (text) =>
  text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

/** Fixture trees are prepared inputs to other gates: they hold defects on purpose. */
const own = (path) => !path.includes('.fixtures/');

const reader = new ESLint({
  cwd: ROOT,
  overrideConfigFile: true,
  overrideConfig: [
    {
      files: ['**/*.mjs'],
      languageOptions: {
        ecmaVersion: 2024,
        sourceType: 'module',
        globals: ALLOWED,
      },
      rules: { 'no-undef': 'error' },
    },
  ],
});

const readNames = async (paths) => {
  const results = await reader.lintFiles(paths.map((p) => join(ROOT, p)));
  return results.flatMap((result) =>
    result.messages.map((message) => ({
      file: result.filePath.replace(`${ROOT}/`, ''),
      line: message.line,
      message: message.message,
    })),
  );
};

const scripts = lines(git('ls-files'))
  .filter((path) => path.endsWith('.mjs'))
  .filter(own)
  .sort();
const tracked = lines(git('ls-files', ':(glob)*.mjs', ':(glob)**/*.mjs'))
  .filter(own)
  .sort();

/**
 * Which scripts a pass actually reaches, and the arithmetic is the whole difficulty. This
 * number was answered four different ways in one day — 4, 3, 4, 2 — and only the last is
 * right, so the method is written out rather than left in a regex:
 *
 *   1. the targets the two scheduled-or-pushed workflows invoke (a dispatch is a person),
 *   2. the scripts in the COMMAND of such a target — not anywhere in its definition, since
 *      `{workspaceRoot}/tools/fresh-inputs.mjs` appears as a cache INPUT and is not run by it,
 *   3. then the closure over `./*.mjs` imports, because a module a reached gate imports is
 *      exercised every time that gate is, and `restore-dictionaries.mjs` is exactly that.
 *
 * `tools/` must also not be matched with a `/` in front of it: that reaches `apps/docs/tools/`
 * as well, and the count came out one high until this line said so.
 */
const targetsIn = (text) =>
  [...String(text).matchAll(/nx (?:affected|run-many) -t ([a-z0-9:\- \t]+)/g)]
    .flatMap((m) => m[1].trim().split(/\s+/))
    .filter(Boolean);
const invoked = new Set(
  WORKFLOWS.flatMap((file) =>
    targetsIn(readFileSync(join(ROOT, '.github/workflows', file), 'utf8')),
  ),
);
const NAMED = /(?:^|["'\s])tools\/([a-z0-9-]+\.mjs)/g;
const reached = new Set(
  lines(git('ls-files'))
    .filter((path) => path.endsWith('project.json'))
    .flatMap((path) => {
      const targets =
        JSON.parse(readFileSync(join(ROOT, path), 'utf8')).targets ?? {};
      return Object.entries(targets)
        .filter(([name]) => invoked.has(name))
        .flatMap(([, def]) => {
          const options = def.options ?? {};
          const ran = [options.command, ...(options.commands ?? [])]
            .map((one) =>
              typeof one === 'string' ? one : (one?.command ?? ''),
            )
            .join('\n');
          return [...ran.matchAll(NAMED)].map((m) => m[1]);
        });
    }),
);
// The closure. A gate that runs pulls in what it imports, and that module is as exercised as
// the gate is — measured, not assumed: `check-language` imports `restore-dictionaries.mjs`.
for (let grew = true; grew;) {
  grew = false;
  for (const name of [...reached]) {
    const path = join(ROOT, 'tools', name);
    let source = '';
    try {
      source = readFileSync(path, 'utf8');
    } catch {
      continue;
    }
    for (const m of source.matchAll(/from '\.\/([a-z0-9-]+\.mjs)'/g))
      if (!reached.has(m[1])) {
        reached.add(m[1]);
        grew = true;
      }
  }
}
const exercised = [...reached];
const underTools = tracked
  .filter((path) => path.startsWith('tools/') && !path.slice(6).includes('/'))
  .map((path) => path.slice(6));

const live = {
  scripts,
  tracked,
  exercised,
  underTools,
  policy: JSON.parse(readFileSync(join(ROOT, POLICY), 'utf8')),
  findings: await readNames(tracked),
  reported: (await readNames([`${FIXTURES}/${REPORTED}`])).length,
  passed: (await readNames([`${FIXTURES}/${PASSED}`])).length,
};

const problems = [];
try {
  checkTools(live);
} catch (error) {
  if (!(error instanceof ToolsError)) throw error;
  problems.push(`${error.check}/${error.rule}: ${error.message}`);
}

// ── the negative control ──────────────────────────────────────────────────────

/**
 * A case is built ON A COPY of the live reading, so its file holds nothing but its own
 * defect: `scripts` and `tracked` are emptied, replaced or padded, `findings` extended, and
 * the two control counts set. A stored copy of the input is deliberately absent — it would
 * measure the repository as it stood the day somebody stored it (`lesson-207`).
 */
const buildFixture = (base, fx) => {
  const w = structuredClone(base);
  for (const layer of ['scripts', 'tracked']) {
    if (fx[layer]?.clear) w[layer] = [];
    for (let i = 0; i < (fx[layer]?.pad ?? 0); i += 1)
      w[layer].push(`tools/pad-${i}.mjs`);
    if (fx[layer]?.set !== undefined) w[layer] = fx[layer].set;
  }
  w.findings.push(...(fx.findings?.add ?? []));
  if (fx.reported !== undefined) w.reported = fx.reported;
  if (fx.passed !== undefined) w.passed = fx.passed;
  if (fx.underTools?.clear) w.underTools = [];
  w.underTools.push(...(fx.underTools?.add ?? []));
  if (fx.exercised?.clear) w.exercised = [];
  w.exercised.push(...(fx.exercised?.add ?? []));
  for (const key of fx.policy?.drop ?? []) delete w.policy[key];
  Object.assign(w.policy, fx.policy?.set ?? {});
  return w;
};

const cases = readdirSync(join(ROOT, FIXTURES))
  .filter((name) => name.endsWith('.json'))
  .sort();
if (cases.length === 0)
  problems.push(
    `${FIXTURES}: no prepared inputs — a gate with no proof that it can fail is one more ` +
      'silent defect (`req-quality-negative-control`)',
  );

for (const name of cases) {
  const fx = JSON.parse(readFileSync(join(ROOT, FIXTURES, name), 'utf8'));
  try {
    checkTools(buildFixture(live, fx));
    problems.push(
      `${name}: the prepared input PASSED and was meant not to — point ${fx.point} ` +
        `(\`${fx.check}\`/\`${fx.rule}\`) stopped examining anything`,
    );
  } catch (error) {
    if (!(error instanceof ToolsError)) throw error;
    if (error.check !== fx.check || error.rule !== fx.rule)
      problems.push(
        `${name}: \`${error.check}\`/\`${error.rule}\` fired where point ${fx.point} ` +
          `(\`${fx.check}\`/\`${fx.rule}\`) was meant to — the case proves something other ` +
          'than what it declares',
      );
  }
}

// ── the report ────────────────────────────────────────────────────────────────

if (REPORT) for (const path of scripts) process.stdout.write(`  ${path}\n`);

if (problems.length) {
  process.stderr.write(`X Scripts gate:\n${problems.join('\n')}\n`);
  process.exit(1);
}
process.stdout.write(
  `✓ Scripts gate: ${scripts.length} script(s) read two ways, every name resolves; ` +
    `${live.underTools.filter((n) => live.exercised.includes(n)).length} of the ` +
    `${live.underTools.length} under \`tools/\` run in a pass ` +
    `and the rest carry a reason. ` +
    `Negative control: the prepared defect is reported and the prepared browser names are ` +
    `not, ${cases.length} prepared input(s) rejected on their own points.\n`,
);
