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
const BAZA = '_poprawny.json';

/** Extensions the TypeScript compiler is meant to see. */
const TYPESCRIPT = /\.(?:m|c)?tsx?$/;

/**
 * How the gate turns a target's command into a list of files. `--listFilesOnly` prints the
 * program and stops before type checking, so the measurement is cheap and does not repeat
 * the target's own work. `--noEmit` is there just in case: some configurations have an
 * `outDir` (schematics compile to `dist/`), and the gate has no business writing anything
 * along the way.
 */
const POMIAR = '--listFilesOnly --noEmit';

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
const PROJEKT = /(?:^|\s)(?:-p|--project)\s+\S/;

/**
 * Shell operators. `nx:run-commands` sends the command through a shell, so
 * `tsc --noEmit -p x || true` is a target that ALWAYS passes and looks in `project.json`
 * exactly like a gate. It costs one character and disarms a whole project's typecheck.
 */
const OPERATORY = /[;|&]/;

/**
 * Flags that switch checking off. `--noCheck` (TS 5.6+) leaves only parse and emit errors,
 * `--listFilesOnly` stops tsc before type checking — both turn the target into an
 * expensive no-op. The gate uses the second of them to MEASURE, so it has to forbid it in
 * the measured command outright: otherwise a disarmed target and a measurement would look
 * identical.
 */
const BEZ_SPRAWDZANIA = [
  ['--noCheck', /(?:^|\s)--noCheck(?:\s|=|$)/],
  ['--listFilesOnly', /(?:^|\s)--listFilesOnly(?:\s|$)/],
];

/**
 * A violation of one of the four checks. It carries the check's identifier, not just the
 * message: the negative control has to verify that a prepared input fired ON ITS OWN
 * point — a fixture failing for a reason other than the one written into it proves
 * something other than what it declares.
 */
class BladTypecheck extends Error {
  constructor(kontrola, opis) {
    super(opis);
    this.kontrola = kontrola;
  }
}

/**
 * A command's defect, or `null`. One place for two callers: point 3 and the input layer,
 * which has to reject a command carrying a shell operator BEFORE running it.
 */
const wadaPolecenia = (polecenie) => {
  if (typeof polecenie !== 'string')
    return (
      `is not a string (${JSON.stringify(polecenie)}) — ` +
      `\`commands\` also takes objects, and one with no \`command\` field would drop out of the measurement`
    );
  if (OPERATORY.test(polecenie))
    return `contains a shell operator — a command like \`tsc … || true\` always passes`;
  if (!TSC.test(polecenie))
    return `is not a \`tsc\` call — the gate cannot measure which files it sees`;
  if (!PROJEKT.test(polecenie))
    return (
      `does not name a configuration with \`-p\` — the reach then depends on \`cwd\`, ` +
      `and \`tsc --build\` cannot be described by a file listing either`
    );
  const wylaczone = BEZ_SPRAWDZANIA.filter(([, wzorzec]) =>
    wzorzec.test(polecenie),
  ).map(([nazwa]) => nazwa);
  if (wylaczone.length)
    return (
      `carries a flag that switches type checking off (${wylaczone.join(', ')}) — ` +
      `the target runs, costs CI time and checks nothing`
    );
  return null;
};

/**
 * The project a file belongs to: the deepest root that is its prefix. The root project
 * (`.`) is a prefix of everything, so it loses to every other one and collects only what
 * nobody else took.
 */
const wlasciciel = (plik, projekty) =>
  projekty
    .filter((p) => p.korzen === '.' || plik.startsWith(`${p.korzen}/`))
    .sort((a, b) => b.korzen.length - a.korzen.length)[0] ?? null;

/**
 * The full set of checks over a ready input:
 *   `projekty` — `[{ nazwa, korzen, typecheck: { cwd, polecenia } | null }]`,
 *   `pliki`    — TypeScript file paths from the git index, relative to the repo root,
 *   `widziane` — `{ [project]: [files] }`, the compiler program measured with `--listFilesOnly`.
 * Throws `BladTypecheck` on the first violation — the checks start from the denominator,
 * so the later ones would have nothing to examine anyway.
 */
const sprawdzTypecheck = ({ projekty, pliki, widziane }) => {
  // 1. DENOMINATOR. First, both lists have to exist at all: either one empty gives a gate
  // that always passes, because it has nothing to compare.
  if (!projekty.length)
    throw new BladTypecheck(
      'mianownik',
      `the Nx graph returned no projects at all — points 2–4 would then always pass, ` +
        `since they walk exactly this list`,
    );
  if (!pliki.length)
    throw new BladTypecheck(
      'mianownik',
      `no TypeScript file found in the git index — the gate would be comparing the ` +
        `compiler program against an empty set, that is, against nothing`,
    );

  const wlasnosc = new Map(projekty.map((p) => [p.nazwa, []]));
  const sieroty = [];
  for (const plik of pliki) {
    const projekt = wlasciciel(plik, projekty);
    if (projekt) wlasnosc.get(projekt.nazwa).push(plik);
    else sieroty.push(plik);
  }
  if (sieroty.length)
    throw new BladTypecheck(
      'mianownik',
      `${sieroty.length} TypeScript files belong to no project:\n` +
        sieroty.map((s) => `      ${s}`).join('\n') +
        `\n    Points 2–4 walk projects, so such a file is invisible to them — which ` +
        `means nobody checks it. Remedy: a project covering that directory, or move the ` +
        `file into an existing one (req-quality-typecheck).`,
    );

  // Projects without a single TypeScript file stand outside the rest of the gate on
  // purpose: `tokens` generates CSS/SCSS/TS from JSON with an `.mjs` script, and asking it
  // for a `typecheck` target would be asking it to check an empty set.
  const zKodem = projekty.filter((p) => wlasnosc.get(p.nazwa).length);

  // 2. The target exists. This is `lesson-42` verbatim.
  const bezTargetu = zKodem.filter((p) => !p.typecheck);
  if (bezTargetu.length)
    throw new BladTypecheck(
      'target',
      `${bezTargetu.length} projects have TypeScript files and no \`typecheck\` target:\n` +
        bezTargetu
          .map(
            (p) =>
              `      ${p.nazwa} (${p.korzen}): ${wlasnosc.get(p.nazwa).length} files`,
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
  const wadliwe = zKodem.flatMap((p) => {
    const polecenia = p.typecheck?.polecenia ?? [];
    if (!polecenia.length)
      return [`${p.nazwa}: the \`typecheck\` target has no command at all`];
    return polecenia.flatMap((polecenie) => {
      const wada = wadaPolecenia(polecenie);
      return wada ? [`${p.nazwa}: \`${polecenie}\` — ${wada}`] : [];
    });
  });
  if (wadliwe.length)
    throw new BladTypecheck(
      'polecenie',
      `${wadliwe.length} \`typecheck\` commands cannot be measured or are disarmed:\n` +
        wadliwe.map((w) => `      ${w}`).join('\n') +
        `\n    Point 4 compares a project's files against THAT command's program, so a ` +
        `command that cannot be read takes its denominator away.`,
    );

  // 4. COVERAGE. Point 2 measures that the target exists, this one measures its reach —
  // and the whole of `lesson-42` sits between the two.
  const nieobjete = zKodem.flatMap((p) => {
    const program = new Set(widziane[p.nazwa] ?? []);
    return wlasnosc
      .get(p.nazwa)
      .filter((plik) => !program.has(plik))
      .map((plik) => `${p.nazwa}: ${plik}`);
  });
  if (nieobjete.length)
    throw new BladTypecheck(
      'pokrycie',
      `${nieobjete.length} files do not enter their project's compiler program:\n` +
        nieobjete.map((n) => `      ${n}`).join('\n') +
        `\n    The \`typecheck\` target exists and passes, but never looks at these ` +
        `files: usually because the tsconfig lists directories by name and a new one ` +
        `arrived. Remedy: widen \`include\`, or add a command with a second configuration.`,
    );

  return (
    `${pliki.length} TypeScript files in ${zKodem.length} projects ` +
    `(${projekty.length - zKodem.length} with no TS code), ` +
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
const projektyGrafu = async () => {
  const { createProjectGraphAsync } = await import('@nx/devkit');
  const graf = await createProjectGraphAsync({ exitOnError: false });

  return Object.entries(graf.nodes).map(([nazwa, wezel]) => {
    const target = wezel.data.targets?.typecheck;
    if (!target) return { nazwa, korzen: wezel.data.root, typecheck: null };

    const { command, commands, cwd } = target.options ?? {};
    const lista = commands ?? (command === undefined ? [] : [command]);
    return {
      nazwa,
      korzen: wezel.data.root,
      typecheck: {
        cwd: cwd ?? '.',
        // Objects stay objects: `wadaPolecenia` will say what it cannot read. Filtering
        // them out silently here would shrink the number of measured programs.
        polecenia: lista.map((c) =>
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
const plikiRepo = () =>
  execSync('git ls-files', { cwd: ROOT, encoding: 'utf8' })
    .split('\n')
    .filter((plik) => TYPESCRIPT.test(plik))
    .sort();

/**
 * Every project's compiler program: the target's command extended with `--listFilesOnly`.
 * A union over all the commands, because a project is sometimes several disjoint programs
 * at once (a library: package, specs, schematics) and only together do they cover its files.
 */
const widzianePrzezKompilator = (projekty) => {
  const widziane = {};

  for (const projekt of projekty) {
    if (!projekt.typecheck) continue;
    const program = new Set();

    for (const polecenie of projekt.typecheck.polecenia) {
      // Checked BEFORE running: a command with a shell operator would go straight from
      // here into a shell, and the gate has no business running something it does not
      // recognise. Point 3 reports the same thing, only with the full list.
      if (wadaPolecenia(polecenie)) continue;

      let wynik;
      try {
        wynik = execSync(`${polecenie} ${POMIAR}`, {
          cwd: join(ROOT, projekt.typecheck.cwd),
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
      } catch (blad) {
        throw new BladTypecheck(
          'polecenie',
          `could not measure the program for \`${projekt.nazwa}\`:\n` +
            `      ${polecenie} ${POMIAR}\n` +
            `    ${String(blad.stderr || blad.stdout || blad.message)
              .trim()
              .split('\n')
              .slice(0, 5)
              .join('\n    ')}`,
        );
      }

      for (const linia of wynik.split('\n')) {
        const sciezka = linia.trim();
        if (!sciezka) continue;
        const wzgledna = relative(ROOT, sciezka).split('\\').join('/');
        if (wzgledna.startsWith('..') || wzgledna.includes('node_modules/'))
          continue;
        program.add(wzgledna);
      }
    }

    widziane[projekt.nazwa] = [...program].sort();
  }

  return widziane;
};

// ── negative control ──────────────────────────────────────────────────────────

const wczytajFixture = (nazwa) =>
  JSON.parse(readFileSync(join(FIXTURES, nazwa), 'utf8'));

/**
 * Builds a case's input ON A COPY of the reference one, so the case file holds nothing
 * but its own defect — you cannot break something in passing and not notice.
 */
const zlozFixture = (fx) => {
  const baza = wczytajFixture(BAZA);
  const wejscie = structuredClone({
    projekty: baza.projekty,
    pliki: baza.pliki,
    widziane: baza.widziane,
  });

  if (fx.wyczyscProjekty) wejscie.projekty = [];
  if (fx.wyczyscPliki) wejscie.pliki = [];
  wejscie.projekty = wejscie.projekty.filter(
    (p) => !(fx.usunProjekty ?? []).includes(p.nazwa),
  );
  wejscie.pliki.push(...(fx.dopiszPliki ?? []));
  for (const projekt of wejscie.projekty) {
    if ((fx.usunTypecheck ?? []).includes(projekt.nazwa))
      projekt.typecheck = null;
    if (fx.podmienPolecenia?.[projekt.nazwa])
      projekt.typecheck.polecenia = fx.podmienPolecenia[projekt.nazwa];
  }
  for (const nazwa of fx.wyczyscWidziane ?? []) wejscie.widziane[nazwa] = [];

  return wejscie;
};

// ── the run ───────────────────────────────────────────────────────────────────

const problems = [];
let opis = null;

try {
  const projekty = await projektyGrafu();
  opis = sprawdzTypecheck({
    projekty,
    pliki: plikiRepo(),
    widziane: widzianePrzezKompilator(projekty),
  });
} catch (blad) {
  if (!(blad instanceof BladTypecheck)) throw blad;
  problems.push(`${blad.kontrola}: ${blad.message}`);
}

const przypadki = readdirSync(FIXTURES)
  .filter((n) => n.endsWith('.json') && n !== BAZA)
  .sort();

if (przypadki.length === 0)
  problems.push(
    `tools/check-typecheck.fixtures: no prepared inputs — a gate with no proof that it can ` +
      `fail is one more silent defect (req-quality-negative-control)`,
  );

// The reference input MUST pass. Were it defective itself, every case would fire
// because of it and not because of its own defect — every „it fired" would be false.
try {
  sprawdzTypecheck(zlozFixture({}));
} catch (blad) {
  if (!(blad instanceof BladTypecheck)) throw blad;
  problems.push(
    `${BAZA}: the reference input does NOT pass (${blad.kontrola}) — ` +
      `every prepared case now fires because of it.\n    ${blad.message}`,
  );
}

for (const nazwa of przypadki) {
  const fx = wczytajFixture(nazwa);
  try {
    sprawdzTypecheck(zlozFixture(fx));
    problems.push(
      `${nazwa}: the prepared input PASSED and was meant not to — ` +
        `punkt ${fx.punkt} (\`${fx.kontrola}\`) stopped examining anything`,
    );
  } catch (blad) {
    if (!(blad instanceof BladTypecheck)) throw blad;
    if (blad.kontrola !== fx.kontrola)
      problems.push(
        `${nazwa}: check \`${blad.kontrola}\` fired, and point ${fx.punkt} ` +
          `(\`${fx.kontrola}\`) was meant to — the fixture proves something other than what it declares`,
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
  `✓ Typecheck: ${opis}. Negative control: the reference input passes, ` +
    `${przypadki.length} prepared ones rejected on their own points.`,
);
