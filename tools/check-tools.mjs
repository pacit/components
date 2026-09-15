#!/usr/bin/env node
/**
 * Scripts gate: does every name in the repository's own `.mjs` resolve to something? Nothing
 * read them — `eslint.config.mjs` matches four extensions and `.mjs` is not one, and a lint
 * target belongs to an Nx project, while `tools/` is no project.
 *
 *  1. MEASURED: the scripts are found at all, and the set is read two different ways,
 *  2. NAMES: no identifier in any of them resolves to nothing,
 *  3. CONTROL: the prepared scripts are read, one reported and one not.
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

const live = {
  scripts,
  tracked,
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
  `✓ Scripts gate: ${scripts.length} script(s) read two ways, every name resolves. ` +
    `Negative control: the prepared defect is reported and the prepared browser names are ` +
    `not, ${cases.length} prepared input(s) rejected on their own points.\n`,
);
