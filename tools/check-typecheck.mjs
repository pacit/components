#!/usr/bin/env node
/**
 * Typecheck gate: is there TypeScript the compiler never sees? `sandbox-e2e` had `lint`
 * and `e2e` and no typecheck target at all, so a dozen of its files never reached the
 * compiler ([`lesson-42`](../docs/lessons.md#lesson-42)) — `req-quality-typecheck`.
 *
 *  1. DENOMINATOR: every TypeScript file in the git index belongs to some project,
 *  2. every project with TypeScript files has a `typecheck` target,
 *  3. that target's command can be measured and is not disarmed,
 *  4. COVERAGE: every file of a project is in its compiler's program.
 *
 * Point 2 measures the target's existence, point 4 its reach — and a tsconfig can lie
 * about what it covers, so the program comes from running THE COMMAND with
 * `--listFilesOnly`, not from `include`. Negative control: `check-typecheck.fixtures/`.
 *
 * Usage: node tools/check-typecheck.mjs
 */
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FIXTURES = join(ROOT, 'tools/check-typecheck.fixtures');
const REFERENCE = '_reference.json';

/** Extensions the TypeScript compiler is meant to see. */
const TYPESCRIPT = /\.(?:m|c)?tsx?$/;

/**
 * How the gate turns a target's command into a list of files. `--listFilesOnly` prints the
 * program and stops before type checking, so the measurement is cheap and does not repeat
 * the target's own work. `--noEmit` is there just in case: some configurations have an
 * `outDir` (schematics compile to `dist/`), and the gate has no business writing anything
 * along the way.
 */
const MEASURE = '--listFilesOnly --noEmit';

/** The command is a `tsc` call — otherwise `--listFilesOnly` means nothing. */
const TSC = /(?:^|[/\\])tsc(?:\s|$)/;

/**
 * The configuration named EXPLICITLY. Not a formality: without `-p`, tsc looks for
 * `tsconfig.json` upwards from the working directory, so the target's reach depends on a
 * `cwd` set elsewhere in `project.json` — invisible at the point of the call. It also
 * rules out `tsc --build`, which is opaque to a file listing: it builds references one by
 * one and `--listFilesOnly` has no way to describe it. One configuration per command, as
 * many commands as there are programs.
 */
const CONFIG = /(?:^|\s)(?:-p|--project)\s+\S/;

/**
 * Shell operators. `nx:run-commands` sends the command through a shell, so
 * `tsc --noEmit -p x || true` is a target that ALWAYS passes and looks in `project.json`
 * exactly like a gate. It costs one character and disarms a whole project's typecheck.
 */
const OPERATORS = /[;|&]/;

/**
 * Flags that switch checking off. `--noCheck` (TS 5.6+) leaves only parse and emit errors,
 * `--listFilesOnly` stops tsc before type checking — both turn the target into an
 * expensive no-op. The gate uses the second of them to MEASURE, so it has to forbid it in
 * the measured command outright: otherwise a disarmed target and a measurement would look
 * identical.
 */
const WITHOUT_CHECKING = [
  ['--noCheck', /(?:^|\s)--noCheck(?:\s|=|$)/],
  ['--listFilesOnly', /(?:^|\s)--listFilesOnly(?:\s|$)/],
];

/**
 * A violation of one of the four checks. It carries the check's identifier, not just the
 * message: the negative control has to verify that a prepared input fired ON ITS OWN
 * point — a fixture failing for a reason other than the one written into it proves
 * something other than what it declares.
 */
class TypecheckError extends Error {
  constructor(check, description) {
    super(description);
    this.check = check;
  }
}

/**
 * A command's defect, or `null`. One place for two callers: point 3 and the input layer,
 * which has to reject a command carrying a shell operator BEFORE running it.
 */
const commandDefect = (command) => {
  if (typeof command !== 'string')
    return (
      `is not a string (${JSON.stringify(command)}) — ` +
      `\`commands\` also takes objects, and one with no \`command\` field would drop out of the measurement`
    );
  if (OPERATORS.test(command))
    return `contains a shell operator — a command like \`tsc … || true\` always passes`;
  if (!TSC.test(command))
    return `is not a \`tsc\` call — the gate cannot measure which files it sees`;
  if (!CONFIG.test(command))
    return (
      `does not name a configuration with \`-p\` — the reach then depends on \`cwd\`, ` +
      `and \`tsc --build\` cannot be described by a file listing either`
    );
  const switchedOff = WITHOUT_CHECKING.filter(([, pattern]) =>
    pattern.test(command),
  ).map(([name]) => name);
  if (switchedOff.length)
    return (
      `carries a flag that switches type checking off (${switchedOff.join(', ')}) — ` +
      `the target runs, costs CI time and checks nothing`
    );
  return null;
};

/**
 * The project a file belongs to: the deepest root that is its prefix. The root project
 * (`.`) is a prefix of everything, so it loses to every other one and collects only what
 * nobody else took.
 */
const owner = (file, projects) =>
  projects
    .filter((p) => p.root === '.' || file.startsWith(`${p.root}/`))
    .sort((a, b) => b.root.length - a.root.length)[0] ?? null;

/**
 * The full set of checks over a ready input:
 *   `projects` — `[{ name, root, typecheck: { cwd, commands } | null }]`,
 *   `files`    — TypeScript file paths from the git index, relative to the repo root,
 *   `seen` — `{ [project]: [files] }`, the compiler program measured with `--listFilesOnly`.
 * Throws `TypecheckError` on the first violation — the checks start from the denominator,
 * so the later ones would have nothing to examine anyway.
 */
const checkTypecheck = ({ projects, files, seen }) => {
  // 1. DENOMINATOR. First, both lists have to exist at all: either one empty gives a gate
  // that always passes, because it has nothing to compare.
  if (!projects.length)
    throw new TypecheckError(
      'denominator',
      `the Nx graph returned no projects at all — points 2–4 would then always pass, ` +
        `since they walk exactly this list`,
    );
  if (!files.length)
    throw new TypecheckError(
      'denominator',
      `no TypeScript file found in the git index — the gate would be comparing the ` +
        `compiler program against an empty set, that is, against nothing`,
    );

  const ownership = new Map(projects.map((p) => [p.name, []]));
  const sieroty = [];
  for (const file of files) {
    const project = owner(file, projects);
    if (project) ownership.get(project.name).push(file);
    else sieroty.push(file);
  }
  if (sieroty.length)
    throw new TypecheckError(
      'denominator',
      `${sieroty.length} TypeScript files belong to no project:\n` +
        sieroty.map((s) => `      ${s}`).join('\n') +
        `\n    Points 2–4 walk projects, so such a file is invisible to them — which ` +
        `means nobody checks it. Remedy: a project covering that directory, or move the ` +
        `file into an existing one (req-quality-typecheck).`,
    );

  // Projects without a single TypeScript file stand outside the rest of the gate on
  // purpose: `tokens` generates CSS/SCSS/TS from JSON with an `.mjs` script, and asking it
  // for a `typecheck` target would be asking it to check an empty set.
  const withCode = projects.filter((p) => ownership.get(p.name).length);

  // 2. The target exists. This is `lesson-42` verbatim.
  const bezTargetu = withCode.filter((p) => !p.typecheck);
  if (bezTargetu.length)
    throw new TypecheckError(
      'target',
      `${bezTargetu.length} projects have TypeScript files and no \`typecheck\` target:\n` +
        bezTargetu
          .map(
            (p) =>
              `      ${p.name} (${p.root}): ${ownership.get(p.name).length} files`,
          )
          .join('\n') +
        `\n    \`nx affected -t typecheck\` stays silent where the target is missing, so ` +
        `the run is green and the compiler never saw these files (lesson-42).`,
    );

  // 3. The command can be measured. Without this point a disarmed target and a checked
  // one would look the same to point 4 — the measurement would return emptiness or junk.
  // `?.` is not excess caution: past point 2 `typecheck` certainly exists, but that means
  // precisely that this point leans on the previous one. Without the optional read,
  // DISARMING point 2 turns the gate into an exception instead of a message — and the
  // negative control loses the ability to examine the point it was meant to examine.
  const wadliwe = withCode.flatMap((p) => {
    const commands = p.typecheck?.commands ?? [];
    if (!commands.length)
      return [`${p.name}: the \`typecheck\` target has no command at all`];
    return commands.flatMap((command) => {
      const defect = commandDefect(command);
      return defect ? [`${p.name}: \`${command}\` — ${defect}`] : [];
    });
  });
  if (wadliwe.length)
    throw new TypecheckError(
      'command',
      `${wadliwe.length} \`typecheck\` commands cannot be measured or are disarmed:\n` +
        wadliwe.map((w) => `      ${w}`).join('\n') +
        `\n    Point 4 compares a project's files against THAT command's program, so a ` +
        `command that cannot be read takes its denominator away.`,
    );

  // 4. COVERAGE. Point 2 measures that the target exists, this one measures its reach —
  // and the whole of `lesson-42` sits between the two.
  const nieobjete = withCode.flatMap((p) => {
    const program = new Set(seen[p.name] ?? []);
    return ownership
      .get(p.name)
      .filter((file) => !program.has(file))
      .map((file) => `${p.name}: ${file}`);
  });
  if (nieobjete.length)
    throw new TypecheckError(
      'coverage',
      `${nieobjete.length} files do not enter their project's compiler program:\n` +
        nieobjete.map((n) => `      ${n}`).join('\n') +
        `\n    The \`typecheck\` target exists and passes, but never looks at these ` +
        `files: usually because the tsconfig lists directories by name and a new one ` +
        `arrived. Remedy: widen \`include\`, or add a command with a second configuration.`,
    );

  return (
    `${files.length} TypeScript files in ${withCode.length} projects ` +
    `(${projects.length - withCode.length} with no TS code), ` +
    `each one in its own compiler's program`
  );
};

// ── input from disk ───────────────────────────────────────────────────────────

/**
 * Projects from the Nx graph, not from the `project.json` files on disk: targets are
 * sometimes INFERRED by plugins (`@nx/vite/plugin` adds `typecheck`), so a list read from
 * the files would show gaps where there are none — and, the other way round, would miss a
 * project the plugin has only just created.
 */
const graphProjects = async () => {
  const { createProjectGraphAsync } = await import('@nx/devkit');
  const graph = await createProjectGraphAsync({ exitOnError: false });

  return Object.entries(graph.nodes).map(([name, node]) => {
    const target = node.data.targets?.typecheck;
    if (!target) return { name, root: node.data.root, typecheck: null };

    const { command, commands, cwd } = target.options ?? {};
    const list = commands ?? (command === undefined ? [] : [command]);
    return {
      name,
      root: node.data.root,
      typecheck: {
        cwd: cwd ?? '.',
        // Objects stay objects: `commandDefect` will say what it cannot read. Filtering
        // them out silently here would shrink the number of measured programs.
        commands: list.map((c) =>
          typeof c === 'string' ? c : (c?.command ?? c),
        ),
      },
    };
  });
};

/**
 * Files from the git index, not from a directory scan: generated artifacts
 * (`libs/tokens/dist/tokens.ts`) are gitignored and are nobody's source code — they appear
 * on every build and nobody maintains them.
 */
const repoFiles = () =>
  execSync('git ls-files', { cwd: ROOT, encoding: 'utf8' })
    .split('\n')
    .filter((file) => TYPESCRIPT.test(file))
    .sort();

/**
 * Every project's compiler program: the target's command extended with `--listFilesOnly`.
 * A union over all the commands, because a project is sometimes several disjoint programs
 * at once (a library: package, specs, schematics) and only together do they cover its files.
 */
const seenByCompiler = (projects) => {
  const seen = {};

  for (const project of projects) {
    if (!project.typecheck) continue;
    const program = new Set();

    for (const command of project.typecheck.commands) {
      // Checked BEFORE running: a command with a shell operator would go straight from
      // here into a shell, and the gate has no business running something it does not
      // recognise. Point 3 reports the same thing, only with the full list.
      if (commandDefect(command)) continue;

      let result;
      try {
        result = execSync(`${command} ${MEASURE}`, {
          cwd: join(ROOT, project.typecheck.cwd),
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'pipe'],
          // Angular programs pull in a few thousand `.d.ts` files — the default megabyte
          // of buffer is not enough, and an overflow would show up as an empty program,
          // that is, as a false hit on point 4.
          maxBuffer: 64 * 1024 * 1024,
          env: {
            ...process.env,
            PATH: `${join(ROOT, 'node_modules/.bin')}:${process.env.PATH}`,
          },
        });
      } catch (error) {
        throw new TypecheckError(
          'command',
          `could not measure the program for \`${project.name}\`:\n` +
            `      ${command} ${MEASURE}\n` +
            `    ${String(error.stderr || error.stdout || error.message)
              .trim()
              .split('\n')
              .slice(0, 5)
              .join('\n    ')}`,
        );
      }

      for (const linia of result.split('\n')) {
        const sciezka = linia.trim();
        if (!sciezka) continue;
        const wzgledna = relative(ROOT, sciezka).split('\\').join('/');
        if (wzgledna.startsWith('..') || wzgledna.includes('node_modules/'))
          continue;
        program.add(wzgledna);
      }
    }

    seen[project.name] = [...program].sort();
  }

  return seen;
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
  const input = structuredClone({
    projects: reference.projects,
    files: reference.files,
    seen: reference.seen,
  });

  if (fx.clearProjects) input.projects = [];
  if (fx.clearFiles) input.files = [];
  input.projects = input.projects.filter(
    (p) => !(fx.dropProjects ?? []).includes(p.name),
  );
  input.files.push(...(fx.addFiles ?? []));
  for (const project of input.projects) {
    if ((fx.dropTypecheck ?? []).includes(project.name))
      project.typecheck = null;
    if (fx.replaceCommands?.[project.name])
      project.typecheck.commands = fx.replaceCommands[project.name];
  }
  for (const name of fx.clearSeen ?? []) input.seen[name] = [];

  return input;
};

// ── the run ───────────────────────────────────────────────────────────────────

const problems = [];
let summary = null;

try {
  const projects = await graphProjects();
  summary = checkTypecheck({
    projects,
    files: repoFiles(),
    seen: seenByCompiler(projects),
  });
} catch (error) {
  if (!(error instanceof TypecheckError)) throw error;
  problems.push(`${error.check}: ${error.message}`);
}

const cases = readdirSync(FIXTURES)
  .filter((n) => n.endsWith('.json') && n !== REFERENCE)
  .sort();

if (cases.length === 0)
  problems.push(
    `tools/check-typecheck.fixtures: no prepared inputs — a gate with no proof that it can ` +
      `fail is one more silent defect (req-quality-negative-control)`,
  );

// The reference input MUST pass. Were it defective itself, every case would fire
// because of it and not because of its own defect — every „it fired" would be false.
try {
  checkTypecheck(buildFixture({}));
} catch (error) {
  if (!(error instanceof TypecheckError)) throw error;
  problems.push(
    `${REFERENCE}: the reference input does NOT pass (${error.check}) — ` +
      `every prepared case now fires because of it.\n    ${error.message}`,
  );
}

for (const name of cases) {
  const fx = readFixture(name);
  try {
    checkTypecheck(buildFixture(fx));
    problems.push(
      `${name}: the prepared input PASSED and was meant not to — ` +
        `point ${fx.point} (\`${fx.check}\`) stopped examining anything`,
    );
  } catch (error) {
    if (!(error instanceof TypecheckError)) throw error;
    if (error.check !== fx.check)
      problems.push(
        `${name}: check \`${error.check}\` fired, and point ${fx.point} ` +
          `(\`${fx.check}\`) was meant to — the fixture proves something other than what it declares`,
      );
  }
}

// ── result ────────────────────────────────────────────────────────────────────

if (problems.length) {
  console.error(`X Typecheck gate — ${problems.length} violations:\n`);
  for (const p of problems) console.error(`  - ${p}`);
  console.error('');
  process.exit(1);
}

console.log(
  `✓ Typecheck: ${summary}. Negative control: the reference input passes, ` +
    `${cases.length} prepared ones rejected on their own points.`,
);
