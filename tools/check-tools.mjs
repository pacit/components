#!/usr/bin/env node
/**
 * Scripts gate: does every name in the repository's own `.mjs` resolve to something? Nothing
 * read them — `eslint.config.mjs` matches four extensions and `.mjs` is not one, and a lint
 * target belongs to an Nx project, while `tools/` is no project.
 *
 *  1. MEASURED: the scripts are found at all, and the set is read two different ways,
 *  2. NAMES: no identifier in any of them resolves to nothing,
 *  3. CONTROL: the readers read the prepared inputs as written — names, loads, runs, git calls,
 *  4. RUN: every script under `tools/` is executed by a pass, or the register says why not,
 *  5. INPUTS: a target that runs a script hashes it and every module it imports,
 *  6. INDEX: a target that runs a script asking git for its index hashes the index too.
 *
 * `at-pass.mjs` carried `CEILING_TAB`, declared nowhere, and threw on the first view of every
 * run for a day and a half (`lesson-210`). `no-undef` is the whole instrument on purpose: a
 * name absent at runtime is invisible to a parser, and a test meets it only down one branch.
 *
 * Usage: node tools/check-tools.mjs [--report]   (--report: the files it read)
 */
import { readFileSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join, posix } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ESLint } from 'eslint';
import ts from 'typescript';
import { createProjectGraphAsync } from '@nx/devkit';
import { HashPlanInspector } from 'nx/src/hasher/hash-plan-inspector.js';
import { targetsIn } from './workflow-targets.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const REPORT = process.argv.includes('--report');
const FIXTURES = 'tools/check-tools.fixtures';
const POLICY = 'tools/tools.policy.json';
const WORKFLOWS = ['ci.yml', 'nightly.yml'];
const REPORTED = 'a-name-nothing-declares.mjs';
const PASSED = 'a-name-the-browser-declares.mjs';

/**
 * The two readers of point 5 have a control of their own, as the name reader has: a prepared
 * script carrying every form of a load this repository writes, and a prepared target carrying
 * every shape of a command, each read by the live reader and held to a list. A reader that
 * stops seeing a form leaves the gate green over the module it stopped seeing, and no prepared
 * case can miss that absence — the edges of a case are exactly what the reader produced.
 */
const LOADS = {
  script: `${FIXTURES}/a-script-that-loads.mjs`,
  // Every relative specifier of the script, resolved against it: a static import, a re-export
  // from the directory above, an `export *`, an `import()` and a `.ts` that is no script. A
  // string and a comment in the file spell two more, and neither is a load.
  resolved: [
    `${FIXTURES}/a-name-the-browser-declares.mjs`,
    'tools/workflow-targets.mjs',
    `${FIXTURES}/a-module-nobody-wrote.mjs`,
    `${FIXTURES}/a-module-loaded-later.mjs`,
    `${FIXTURES}/a-hop-in-typescript.ts`,
  ],
  // The three of them the index holds…
  tracked: [
    `${FIXTURES}/a-name-the-browser-declares.mjs`,
    'tools/workflow-targets.mjs',
    `${FIXTURES}/a-hop-in-typescript.ts`,
  ],
  // …and everything the script reaches: the walk passes through the `.ts` to what it loads.
  closure: [
    `${FIXTURES}/a-script-that-loads.mjs`,
    `${FIXTURES}/a-name-the-browser-declares.mjs`,
    'tools/workflow-targets.mjs',
    `${FIXTURES}/a-hop-in-typescript.ts`,
    `${FIXTURES}/a-module-beyond-the-hop.mjs`,
  ],
};
const RUNS = {
  // Three targets as the graph hands them. `four-ways` runs a list of commands, one of them
  // quoted, one beside a `&&`, one under a configuration, all from a `cwd` of their own,
  // names one script the index does not hold, and hands a glob to a program after a `&&`,
  // which is no script. `a-cd-away` changes directory inside the command instead, so its one
  // script resolves to nothing, and passes a glob too. `a-glob-after-node` hands `node` a
  // glob, which the shell expands into a script list the reader cannot — a script it cannot
  // find, rather than one passed over.
  targets: {
    'four-ways': {
      options: {
        cwd: FIXTURES,
        commands: [
          'node a-name-nothing-declares.mjs',
          {
            command:
              'node "a-name-the-browser-declares.mjs" --quiet && node ../check-tools.mjs',
          },
          'node a-script-nobody-wrote.mjs && prettier --check "*.mjs"',
        ],
      },
      configurations: { alt: { command: 'node ../check-prose.mjs' } },
    },
    'a-cd-away': {
      options: {
        command: `cd ${FIXTURES} && node a-name-nothing-declares.mjs && prettier --check "*.mjs"`,
      },
    },
    'a-glob-after-node': {
      options: { cwd: FIXTURES, command: 'node --no-warnings a-name-*.mjs' },
    },
  },
  // What the reader has to make of them, by target, through the same road the live targets
  // take — so a filter that drops a target on that road drops a prepared one too.
  read: {
    'prepared:four-ways': {
      scripts: [
        `${FIXTURES}/a-name-nothing-declares.mjs`,
        `${FIXTURES}/a-name-the-browser-declares.mjs`,
        'tools/check-tools.mjs',
        'tools/check-prose.mjs',
      ],
      unresolved: [`${FIXTURES}/a-script-nobody-wrote.mjs`],
    },
    'prepared:a-cd-away': {
      scripts: [],
      unresolved: ['a-name-nothing-declares.mjs'],
    },
    'prepared:a-glob-after-node': {
      scripts: [],
      unresolved: [`${FIXTURES}/a-name-*.mjs`],
    },
  },
};
/**
 * The two readers of point 6 are held the same way. The call reader gets a prepared script
 * holding twelve calls, one per entry, each the only string on its line that names the word:
 * the argument `ls-files`, a string with a `$(…)` before the subcommand, a template with no
 * substitution, the head, a middle and the tail of a template, a template over two lines, a
 * `bash -lc` body with escaped quotes, a brace group, a sentence, the dashed `git-ls-files`, and
 * a hyphen written as an escape, which the string's value holds and its source does not.
 * Beside them stand six near misses it must not read: a longer word, one joined by a hyphen, a
 * word that ends in `ls-files`, another subcommand, the word split across a concatenation, and a
 * regular expression, which is no string. The caller reader walks from the script: the script
 * asks, the `.ts` it loads asks once, and the module beyond that asks nothing and loads the `.ts`
 * back.
 */
const CALLS = {
  script: `${FIXTURES}/a-script-that-asks-for-the-index.mjs`,
  lines: [16, 17, 18, 19, 20, 21, 22, 24, 25, 26, 27, 28],
  callers: [
    `${FIXTURES}/a-hop-that-asks.ts`,
    `${FIXTURES}/a-script-that-asks-for-the-index.mjs`,
  ],
};
/** The command whose answer a target asking git for its index hashes: `{ "runtime": … }`. */
const INDEX = 'git ls-files';

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

/**
 * The roots and everything they load, transitively, each module once: a module that imports
 * its importer back ends the walk rather than the process. Points 4, 5 and 6 walk the same
 * edges — `imports`, one reading of what every script loads.
 */
const closureOf = (roots, imports) => {
  const seen = [];
  for (const queue = [...roots]; queue.length;) {
    const module = queue.shift();
    if (seen.includes(module)) continue;
    seen.push(module);
    queue.push(...(imports[module] ?? []));
  }
  return seen;
};
/** The targets whose scripts reach a module that asks git for its index, and those modules. */
const askingOf = (input) =>
  input.targets
    .map((t) => ({
      id: t.id,
      runtime: t.runtime,
      callers: closureOf(t.scripts, input.imports).filter((module) =>
        input.callers.includes(module),
      ),
    }))
    .filter((t) => t.callers.length);

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
  // Point 5 answers from `targets`, the graph's own list of what runs a script. Empty, it
  // holds nothing; and a target the planner gave no file list for is a key nobody read,
  // which must not pass as a key that names everything.
  if (!Array.isArray(input.targets) || !input.targets.length)
    fire(
      'measured',
      'nothing-to-read',
      'no target of the graph was found to run a tracked script. Point 5 would then hold ' +
        'nothing to its inputs, which is a reading of the graph and not of the repository',
    );
  const unread = input.targets.filter((t) => !Array.isArray(t.names));
  if (unread.length)
    fire(
      'measured',
      'nothing-to-read',
      `nx's planner gave no file list for \`${unread.map((t) => t.id).join('`, `')}\` — ` +
        'a key nobody could read is not a key that names everything',
    );
  // A `.mjs` the command names and the index does not hold is a script the reader cannot
  // find, and a script it cannot find it cannot hold: dropped without a word, the target
  // would stand under no rule at all. `cd libs/tokens && node build.mjs` is the usual shape.
  const lost = input.targets.filter((t) => t.unresolved?.length);
  if (lost.length)
    fire(
      'measured',
      'script-unresolved',
      lost
        .map((t) => `\`${t.id}\` runs \`${t.unresolved.join('`, `')}\``)
        .join(', ') +
        ' and the index holds no such file. A script the reader cannot find is one it ' +
        "cannot hold — a `cd` inside the command is the usual cause, and the target's " +
        '`cwd` is where nx wants the directory. A glob is passed over unless `node` is ' +
        'handed it, since the shell then expands a script list the reader cannot; anything ' +
        'else that ends in `.mjs` has to be a file',
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
  // The readers of point 5, held to `LOADS` and `RUNS` in both directions: a form they
  // stopped seeing, a hop they stopped walking, a target they dropped — and a string, a ghost
  // or a glob they started seeing.
  const same = (a, b) =>
    JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());
  const list = (items) =>
    items.length ? `\`${items.join('`, `')}\`` : 'nothing';
  if (
    !same(input.loads.resolved, LOADS.resolved) ||
    !same(input.loads.tracked, LOADS.tracked) ||
    !same(input.loads.closure, LOADS.closure)
  )
    fire(
      'control',
      'loads-misread',
      `\`${LOADS.script}\` loads five modules five ways, three of them files the index ` +
        'holds and one of those a `.ts` loading one more; the reader read ' +
        `${list(input.loads.resolved)}, of which ${list(input.loads.tracked)} tracked, ` +
        `and walked to ${list(input.loads.closure)}. Point 5 holds a target to what this ` +
        'reader sees, and a form it stopped seeing is a module it stopped holding',
    );
  const runs = input.runs ?? {};
  const ids = Object.keys(RUNS.read);
  if (
    !same(Object.keys(runs), ids) ||
    ids.some(
      (id) =>
        !same(runs[id].scripts, RUNS.read[id].scripts) ||
        !same(runs[id].unresolved, RUNS.read[id].unresolved),
    )
  )
    fire(
      'control',
      'runs-misread',
      'the prepared targets run four scripts — one per command, one quoted, one beside a ' +
        '`&&`, one under a configuration, all from a `cwd` of their own — and name one the ' +
        'index does not hold; the second changes directory inside the command and passes a ' +
        'glob, the third hands `node` a glob. The reader read ' +
        (Object.entries(runs)
          .map(
            ([id, r]) =>
              `${id}: ${list(r.scripts)}, unresolved ${list(r.unresolved)}`,
          )
          .join('; ') || 'no target at all') +
        '. Point 5 holds a target to what this reader sees, and a shape it stopped seeing ' +
        'is a target it stopped holding',
    );
  // The readers of point 6, held to `CALLS` both ways: a form the call reader stopped seeing
  // is a caller it stopped holding, a mention it started seeing is a caller somebody silences
  // next, and the caller reader has to walk where the live one walks — past a `.ts`, and to
  // every module that asks once.
  if (!same(input.calls.map(String), CALLS.lines.map(String)))
    fire(
      'control',
      'calls-misread',
      `\`${CALLS.script}\` asks git for its index on lines ` +
        `${list(CALLS.lines.map(String))}, twelve ways, beside six near misses it must not ` +
        `read; the reader read lines ${list(input.calls.map(String))}. Point 6 ` +
        'holds a target to what this reader sees, and a form it stopped seeing is a target ' +
        'it stopped holding',
    );
  if (!same(input.called, CALLS.callers))
    fire(
      'control',
      'callers-misread',
      `the callers over what \`${CALLS.script}\` reaches are ${list(CALLS.callers)}: the ` +
        'script, and the `.ts` it loads, which asks once — not the module beyond, which asks ' +
        `nothing. The reader read ${list(input.called)}. Point 6 follows a target to the ` +
        'callers this reader finds, and a caller it stopped finding is a target it stopped ' +
        'holding',
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

  // 5. INPUTS — point 4 asks whether a pass reaches the script. This asks whether the cache
  // does: nx keys a task on its `inputs`, so a module the target loads and does not name is a
  // module whose edit leaves the hash where it was, and the next run is answered from the
  // cache — on a desk, and in CI, whose gates job restores the previous run's. Six gates stood
  // like that until 2026-09-30: `check-docs`, `check-browsers` and `check-acr` imported
  // `workflow-targets.mjs`, `check-tokens`, `check-parts` and `check-bundle` imported
  // `fresh-inputs.mjs`, and none of the six hashed the module. The names are what nx's own
  // planner resolves the inputs to, so `{workspaceRoot}/**/*` names everything and a `!`
  // takes a file back out — a reading of the patterns themselves would be a second hasher.
  // An uncached target is held too: `cache: true` is one word away, and `inputs` are the
  // list of what the target reads whether or not anything replays it yet.
  const unhashed = input.targets
    .map((t) => ({
      id: t.id,
      unnamed: closureOf(t.scripts, input.imports).filter(
        (module) => !t.names.includes(module),
      ),
    }))
    .filter((t) => t.unnamed.length);
  if (unhashed.length)
    fire(
      'inputs',
      'unnamed',
      `${unhashed.length} target(s) run a script and do not hash a module it loads:\n` +
        unhashed
          .map(
            (t) =>
              `  ${t.id} — ${t.unnamed.map((m) => `\`{workspaceRoot}/${m}\``).join(', ')}`,
          )
          .join('\n') +
        '\nnx keys the task on its `inputs`, so an edit to such a module leaves the hash ' +
        'where it was, and a cached target is then answered from the cache. Name the module ' +
        "in the target's `inputs` as written above, beside the script that imports it",
    );

  // 6. INDEX — point 5 holds a target to the files its scripts load, and the git index is no
  // file. nx hashes the working tree, so `git add` of a file the tree already holds, or
  // `git rm --cached` of one it keeps, moves no hash, and a target that asks `git ls-files`
  // replays the verdict of the index it last ran on: measured 2026-10-02 on all twenty
  // cached gates that ask, each replaying a pass its direct run failed (`lesson-247`). A
  // runtime input puts the answer in the hash, and the planner names it under `runtime`,
  // beside the files — `{workspaceRoot}/**/*` names every file and still not the index.
  const asking = askingOf(input);
  if (!asking.length)
    fire(
      'index',
      'nothing-to-read',
      'no target of the graph runs a script that asks git for its index. Point 6 would then ' +
        'hold nothing, which is a reading of the call reader and not of the repository',
    );
  const blind = asking.filter((t) => !t.runtime.includes(INDEX));
  if (blind.length)
    fire(
      'index',
      'unhashed',
      `${blind.length} target(s) run a script that asks \`${INDEX}\` and do not hash the ` +
        `answer:\n` +
        blind
          .map(
            (t) => `  ${t.id} — ${t.callers.map((m) => `\`${m}\``).join(', ')}`,
          )
          .join('\n') +
        '\nnx hashes the working tree, and the index is no file in it: `git add` of a file ' +
        'the tree already holds, or `git rm --cached` of one it keeps, moves no hash, and a ' +
        'cached target then replays the verdict of the index it last ran on. Name `index` — ' +
        `\`{ "runtime": "${INDEX}" }\` in \`nx.json\` — in the target's \`inputs\``,
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
 *   3. then the closure over the imports, because a module a reached gate imports is
 *      exercised every time that gate is, and `restore-dictionaries.mjs` is exactly that.
 *
 * `tools/` must also not be matched with a `/` in front of it: that reaches `apps/docs/tools/`
 * as well, and the count came out one high until this line said so.
 *
 * Step 1's reading of a workflow line lives in `workflow-targets.mjs` — four gates answer
 * from it and used to hold four different regexes (0017, 0081). Steps 2 and 3 are the two
 * readings point 5 holds a target's `inputs` to, taken once below: `targets` and `imports`.
 */
const invoked = new Set(
  WORKFLOWS.flatMap((file) => [
    ...targetsIn(readFileSync(join(ROOT, '.github/workflows', file), 'utf8')),
  ]),
);
const index = new Set(lines(git('ls-files')));

/**
 * What each script loads by a relative path — `from './x.mjs'`, `export … from`,
 * `import('./x.mjs')` — resolved against its own directory and kept when the index holds the
 * file: the `./fresh-inputs.mjs` of `check-bundle.mjs` is `tools/fresh-inputs.mjs`, and the
 * `'./app'` inside a template string of `check-consumer.mjs` is generated code that resolves
 * to nothing tracked. Read with the TypeScript parser and not with a pattern over the text,
 * which is a second lexer and reads wrong where the first does not (`lesson-236`). The parser
 * recovers from what it cannot read; ESLint, which parses every script in the same run for
 * point 2, does not, and a file that does not parse is a finding there.
 */
const specifiersOf = (source) => {
  const found = [];
  const walk = (node) => {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    )
      found.push(node.moduleSpecifier.text);
    if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments[0] &&
      ts.isStringLiteral(node.arguments[0])
    )
      found.push(node.arguments[0].text);
    ts.forEachChild(node, walk);
  };
  walk(source);
  return found;
};
const parse = (path) =>
  ts.createSourceFile(
    path,
    readFileSync(join(ROOT, path), 'utf8'),
    ts.ScriptTarget.Latest,
    true,
  );
/** Every relative specifier of a file, resolved against it — before the index is asked. */
const resolvedOf = (path) => [
  ...new Set(
    specifiersOf(parse(path))
      .filter((spec) => spec.startsWith('./') || spec.startsWith('../'))
      .map((spec) => posix.normalize(posix.join(posix.dirname(path), spec))),
  ),
];
/**
 * …and the ones the index holds: the edges the closure walks. A specifier without an
 * extension is followed nowhere, as node would follow it nowhere.
 */
const edgesOf = (path) => resolvedOf(path).filter((p) => index.has(p));
/**
 * The edges of every root, and of every file a root reaches, `.mjs` or not: `at-pass.mjs`
 * loads a `.ts`, and what that one loads is as loaded as it is.
 */
const importsFrom = (roots) => {
  const imports = {};
  for (const queue = [...roots]; queue.length;) {
    const path = queue.shift();
    if (Object.hasOwn(imports, path)) continue;
    imports[path] = edgesOf(path);
    queue.push(...imports[path]);
  }
  return imports;
};
const imports = importsFrom(scripts);

/**
 * Where a file asks git for its index: a line holding a string that names `ls-files` as a word —
 * a string, a template with no substitution, or any piece of a template, each read alone. A
 * comment is no string (`lesson-236`). Prose that names the word is read as well, on purpose:
 * a false positive asks a target for one named input it does not need, a false negative reopens
 * the route for that target, and three rounds of review found a shell form that a reading of
 * commands missed each time. The word split across pieces, or built from variables, is not read.
 * One line per string.
 */
const ASKS = /(?<!\w)ls-files(?![\w-])/;
const STRINGS = [
  ts.SyntaxKind.StringLiteral,
  ts.SyntaxKind.NoSubstitutionTemplateLiteral,
  ts.SyntaxKind.TemplateHead,
  ts.SyntaxKind.TemplateMiddle,
  ts.SyntaxKind.TemplateTail,
];
const callsOf = (path) => {
  const source = parse(path);
  const lines = [];
  const walk = (node) => {
    if (STRINGS.includes(node.kind) && ASKS.test(node.text))
      lines.push(
        source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1,
      );
    ts.forEachChild(node, walk);
  };
  walk(source);
  return lines;
};
/** The modules of an import map that ask git for its index — what point 6 follows. */
const callersOf = (imports) =>
  Object.keys(imports)
    .filter((path) => callsOf(path).length)
    .sort();
const callers = callersOf(imports);

/**
 * Every target of the graph that runs a tracked script, and the files its `inputs` resolve
 * to. `scripts` are the `.mjs` tokens of its command(s) — under every configuration, since a
 * configuration may swap the command — resolved against the command's `cwd` and kept when the
 * index holds them, `unresolved` the ones it does not: `node build.mjs` under `libs/tokens`
 * is `libs/tokens/build.mjs`, and a glob is passed over, since `prettier --check "*.mjs"`
 * runs no script. The graph arrives with `{projectRoot}` and its kin already resolved in
 * every option, so a command reads as nx will run it. `names` are asked of nx's
 * own hash planner, the class `nx show target inputs` answers from, rather than of a second
 * reading of the patterns: `{projectRoot}`, a `!`, a brace group and a named input such as
 * `default` are then read as the hasher reads them, over the graph as plugins and
 * `targetDefaults` leave it. Measured 2026-10-01: the planner, once built, answered for every
 * target in a fifth of a second, and one invocation of the command took five. `runtime` comes
 * from the same answer: the commands whose output the hasher keys the target on.
 */
const scriptsOf = (def) => {
  const options = def.options ?? {};
  const variants = [
    options,
    ...Object.values(def.configurations ?? {}).map((c) => ({
      ...options,
      ...c,
    })),
  ];
  const scripts = new Set();
  const unresolved = new Set();
  for (const variant of variants) {
    const ran = [variant.command, ...(variant.commands ?? [])]
      .map((one) => (typeof one === 'string' ? one : (one?.command ?? '')))
      .join('\n');
    const tokens = ran.split(/[\s"'=;&|()]+/);
    tokens.forEach((token, i) => {
      if (!token.endsWith('.mjs')) return;
      // A glob is no script — unless it is what `node` is handed: the shell then expands it
      // into a script list the reader cannot, and `node b*.mjs` is a script it cannot find.
      const handedToNode =
        tokens.slice(0, i).findLast((t) => !t.startsWith('-')) === 'node';
      if (/[*?[{]/.test(token) && !handedToNode) return;
      const path = posix.normalize(posix.join(variant.cwd ?? '.', token));
      (index.has(path) ? scripts : unresolved).add(path);
    });
  }
  return { scripts: [...scripts], unresolved: [...unresolved] };
};
/** Every target of a graph that runs a script, or tries to: its id, and what its commands name. */
const runsOf = (graph) =>
  Object.entries(graph.nodes)
    .flatMap(([project, node]) =>
      Object.entries(node.data.targets ?? {}).map(([target, def]) => ({
        id: `${project}:${target}`,
        project,
        target,
        ...scriptsOf(def),
      })),
    )
    .filter((t) => t.scripts.length || t.unresolved.length);
const inputsOf = (planner, graph, project, target) => {
  const def = graph.nodes[project].data.targets[target];
  const id = def.defaultConfiguration
    ? `${project}:${target}:${def.defaultConfiguration}`
    : `${project}:${target}`;
  const inputs = planner.inspectTaskInputs({ project, target })[id];
  return { names: inputs?.files ?? null, runtime: inputs?.runtime ?? [] };
};
const graph = await createProjectGraphAsync({ exitOnError: false });
const planner = new HashPlanInspector(graph, ROOT);
await planner.init();
const targets = runsOf(graph).map((t) => ({
  ...t,
  ...inputsOf(planner, graph, t.project, t.target),
}));

// The closure. A gate that runs pulls in what it imports, and that module is as exercised as
// the gate is — measured, not assumed: `check-language` imports `restore-dictionaries.mjs`.
const exercised = closureOf(
  targets.filter((t) => invoked.has(t.target)).flatMap((t) => t.scripts),
  imports,
)
  .filter((path) => path.startsWith('tools/') && !path.slice(6).includes('/'))
  .map((path) => path.slice(6));
const underTools = tracked
  .filter((path) => path.startsWith('tools/') && !path.slice(6).includes('/'))
  .map((path) => path.slice(6));

const live = {
  scripts,
  tracked,
  exercised,
  underTools,
  targets,
  imports,
  callers,
  calls: callsOf(CALLS.script),
  called: callersOf(importsFrom([CALLS.script])),
  loads: {
    resolved: resolvedOf(LOADS.script),
    tracked: edgesOf(LOADS.script),
    closure: closureOf([LOADS.script], importsFrom([LOADS.script])),
  },
  runs: Object.fromEntries(
    runsOf({ nodes: { prepared: { data: { targets: RUNS.targets } } } }).map(
      (t) => [t.id, { scripts: t.scripts, unresolved: t.unresolved }],
    ),
  ),
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
 * defect: `scripts` and `tracked` are emptied, replaced or padded, `findings` extended, the
 * two control counts set, a target added to `targets` with its `names` and `runtime` as given
 * or resolved, an edge set in `imports`, `callers` extended, what the readers said
 * of their prepared inputs set in `loads`, `runs` and `calls`. A stored copy of the input is
 * deliberately absent — it would measure the repository as it stood the day somebody stored
 * it (`lesson-207`).
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
  if (fx.targets?.clear) w.targets = [];
  w.targets.push(
    ...(fx.targets?.add ?? []).map((t) => ({
      id: `${t.project}:${t.target}`,
      project: t.project,
      target: t.target,
      scripts: t.scripts,
      unresolved: t.unresolved ?? [],
      names: t.names ?? null,
      runtime: t.runtime ?? [],
    })),
  );
  Object.assign(w.imports, fx.imports?.set ?? {});
  w.callers.push(...(fx.callers?.add ?? []));
  if (fx.calls?.set !== undefined) w.calls = fx.calls.set;
  if (fx.called?.set !== undefined) w.called = fx.called.set;
  Object.assign(w.loads, fx.loads?.set ?? {});
  for (const id of fx.runs?.drop ?? []) delete w.runs[id];
  for (const [id, read] of Object.entries(fx.runs?.set ?? {}))
    w.runs[id] = { ...w.runs[id], ...read };
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
const fixtures = cases.map((name) => [
  name,
  JSON.parse(readFileSync(join(ROOT, FIXTURES, name), 'utf8')),
]);

/**
 * A prepared target may carry `inputs` in place of `names`: the patterns are then resolved by
 * the planner the live reading asked, over a copy of the graph that carries the target under
 * a name of its own — so a pattern over the whole workspace with a `!` beside it is read
 * exactly as nx reads it, and a case at that edge measures the planner rather than a
 * transcription of it. The names and the runtime commands land on the case's own entry, where
 * `buildFixture` reads.
 */
const prepared = fixtures.flatMap(([, fx]) =>
  (fx.targets?.add ?? []).filter((t) => Array.isArray(t.inputs)),
);
if (prepared.length) {
  const copy = structuredClone(graph);
  prepared.forEach((t, i) => {
    copy.nodes[t.project].data.targets[`${t.target}-${i}`] = {
      executor: 'nx:run-commands',
      cache: true,
      inputs: t.inputs,
      options: { command: `node ${t.scripts[0]}` },
    };
  });
  const second = new HashPlanInspector(copy, ROOT);
  await second.init();
  prepared.forEach((t, i) => {
    Object.assign(t, inputsOf(second, copy, t.project, `${t.target}-${i}`));
  });
}

/**
 * A text a case requires of its message, found with no digit on either side — `1 target(s)`
 * is not named by `11 target(s)`. The same reading as `check-files` and `check-reach`.
 */
const namedIn = (message, named) => {
  for (
    let at = message.indexOf(named);
    at !== -1;
    at = message.indexOf(named, at + 1)
  )
    if (
      !/[0-9]/.test(message[at - 1] ?? '') &&
      !/[0-9]/.test(message[at + named.length] ?? '')
    )
      return true;
  return false;
};

for (const [name, fx] of fixtures) {
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
    // What the message has to name, where a case says: a finding that names one target of
    // two, or the script where the module asks, sends a person to the wrong place and is
    // green otherwise.
    else if (
      fx.names !== undefined &&
      (!Array.isArray(fx.names) ||
        !fx.names.length ||
        fx.names.some((named) => typeof named !== 'string' || !named.trim()))
    )
      problems.push(
        `${name}: \`names\` is not a list of non-empty strings — a case that cannot say ` +
          'what its message names proves nothing about it, and an empty one is named anywhere',
      );
    else {
      const unnamed = (fx.names ?? []).filter(
        (named) => !namedIn(error.message, named),
      );
      if (unnamed.length)
        problems.push(
          `${name}: point ${fx.point} fired on its own rule, and its message does not ` +
            `name ${unnamed.map((named) => `\`${named}\``).join(', ')} — a finding that ` +
            'sends a person to the wrong place, or to none',
        );
    }
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
    `and the rest carry a reason; ${live.targets.length} target(s) run a script and hash ` +
    `it with what it loads, ${askingOf(live).length} of them asking git for its index and ` +
    `hashing the answer. ` +
    `Negative control: the prepared defect is reported and the prepared browser names are ` +
    `not, ${cases.length} prepared input(s) rejected on their own points.\n`,
);
