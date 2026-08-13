#!/usr/bin/env node
/**
 * Browser matrix gate: does `req-quality-browsers` — „the tests run on chromium, firefox
 * and webkit" — have a measurement behind it, or three entries in `playwright.config.mts`
 * that nobody reads again? Undoing the matrix gives NO RED TEST.
 *
 *  1. DENOMINATOR: the measurement can be taken and is not empty,
 *  2. the collected projects are exactly the policy's engines, each with tests,
 *  3. COVERAGE: every spec file runs on every engine — or carries an entry,
 *  4. the register of exclusions is alive and justified,
 *  5. CI installs every engine and does not narrow the run,
 *  6. FACT: a `pomiar` exclusion's justification is measured, not remembered.
 *
 * What „really runs" comes from `playwright test --list`, not from the configuration —
 * the same move as „run the compiler" in `check-typecheck`. Point 6 re-probes on every
 * run: a fact about an engine stops holding at a package bump, not at a change here.
 *
 * Usage: node tools/check-browsers.mjs
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FIXTURES = join(ROOT, 'tools/check-browsers.fixtures');
const BAZA = '_poprawny.json';

const E2E = 'apps/sandbox-e2e';
const TESTDIR = `${E2E}/src`;
const POLITYKA = `${E2E}/przegladarki.policy.json`;
const CI = '.github/workflows/ci.yml';

/**
 * What Playwright takes for a test file. A repetition of its default `testMatch`
 * (`**\/*.@(spec|test).?(c|m)[jt]s?(x)`) — point 3's denominator has to cover exactly the
 * files it collects, or the comparison of two lists measures a difference of definitions
 * rather than a difference of coverage.
 */
const SPEC = /\.(?:spec|test)\.(?:c|m)?[jt]sx?$/;

/** Kinds of exclusion justification. Any other kind is an entry the gate cannot read. */
const RODZAJE = ['zapis', 'pomiar'];

/**
 * Flags that narrow the run. `--project` and `--grep` turn the matrix into one engine or
 * into a subset of the tests, changing neither the configuration nor the file list — so
 * points 1–3 would look exactly as they do today while something else ran. `--shard` is
 * deliberately NOT listed: it splits the same set across machines, so the sum of the runs
 * stays whole.
 */
const ZAWEZAJACE = [
  ['--project', /(?:^|\s)--project(?:=|\s)/],
  ['--grep', /(?:^|\s)--grep(?:-invert)?(?:=|\s)/],
];

/**
 * Probes of facts about the engines. The key is what goes into the `fakt` field of a
 * `pomiar` exclusion; the value answers „can this engine do it".
 *
 * `podmiana-kolorow-autora` — whether under `forced-colors: active` the browser replaces
 * the author's colours with the user's palette. The probe measures that on an element with
 * NO rules of the library, because it asks about the browser's behaviour and not about a
 * stylesheet: the background `rgb(1, 2, 3)` is a value in no palette, so any answer other
 * than itself means „replaced".
 */
const SONDY = {
  'podmiana-kolorow-autora': async (page) => {
    await page.setContent(
      '<div id="s" style="background: rgb(1, 2, 3)"></div>',
    );
    const tlo = await page.evaluate(
      () => getComputedStyle(document.getElementById('s')).backgroundColor,
    );
    return tlo !== 'rgb(1, 2, 3)';
  },
};

/**
 * A violation of one of the checks. It carries the pair `kontrola` + `regula`, not the
 * point's identifier alone: a gate's point is not one sentence (`lesson-50`), and a
 * negative control comparing only the point lets through a case that fired on a
 * neighbouring rule of that same point.
 */
class BladPrzegladarek extends Error {
  constructor(kontrola, regula, opis) {
    super(opis);
    this.kontrola = kontrola;
    this.regula = regula;
  }
}

const lista = (items) => items.map((i) => `      ${i}`).join('\n');

// ── the checks ──────────────────────────────────────────────────────────────────

/**
 * The full set of checks over a ready input:
 *   `polityka` — the contents of `przegladarki.policy.json`,
 *   `zebrane`  — `{ [silnik]: [pliki] }`, measured by `playwright test --list`,
 *   `pliki`    — spec files from the git index, relative to `testDir`,
 *   `e2e`      — `{ polecenie }` from the `sandbox-e2e:e2e` target in the Nx graph,
 *   `ci`       — `{ instalacje: [[silnik]], uruchamiaE2E }` from the workflow,
 *   `fakty`    — `{ [fakt]: { [silnik]: boolean } }`, the probes' results.
 * Throws `BladPrzegladarek` on the first violation — the checks start from the
 * denominator, so the later ones would have nothing to examine anyway.
 */
export const sprawdzPrzegladarki = ({
  polityka,
  zebrane,
  pliki,
  e2e,
  ci,
  fakty,
}) => {
  const silniki = Object.keys(polityka?.silniki ?? {});
  const wylaczenia = polityka?.wylaczenia ?? [];

  // 1. DENOMINATOR. Each of the three lists can be empty for a different reason, and any
  // one of them empty gives a gate that always passes, having nothing to compare.
  if (!silniki.length)
    throw new BladPrzegladarek(
      'mianownik',
      'polityka-bez-silnikow',
      `${POLITYKA} declares no engine at all — points 2–6 walk exactly this list, so all ` +
        `of them would pass without looking at anything`,
    );
  if (!pliki.length)
    throw new BladPrzegladarek(
      'mianownik',
      'brak-plikow',
      `no spec file found in \`${TESTDIR}\` (git index) — point 3 would compare the ` +
        `collected tests against an empty set, that is, against nothing`,
    );
  const razem = Object.values(zebrane ?? {}).reduce(
    (n, p) => n + (p?.length ?? 0),
    0,
  );
  if (!razem)
    throw new BladPrzegladarek(
      'mianownik',
      'pomiar-pusty',
      `\`playwright test --list\` collected no file on any engine. Playwright then exits ` +
        `zero and the e2e run is green — exactly the state in which the matrix measures ` +
        `nothing`,
    );

  // 2. The engines. The set of collected projects against the policy's set, both ways:
  // the first catches an engine struck from the configuration, the second a project added
  // to it with no line in the policy — that is, with no place anyone could justify it.
  const zebraneSilniki = Object.keys(zebrane ?? {});
  const nieobecne = silniki.filter((s) => !(zebrane?.[s]?.length ?? 0));
  if (nieobecne.length)
    throw new BladPrzegladarek(
      'silniki',
      'silnik-nieobecny',
      `${nieobecne.length} engines from the policy collect no test at all: ${nieobecne.join(', ')}.\n` +
        `    A project removed from \`projects\` in \`playwright.config.mts\` (or a ` +
        `\`testIgnore\` narrowed down to zero files) gives no red run — it gives a run one ` +
        `engine shorter. Remedy: restore the project, or strike the engine from ` +
        `${POLITYKA} and justify that in \`req-quality-browsers\`.`,
    );
  const nadmiarowe = zebraneSilniki.filter((s) => !silniki.includes(s));
  if (nadmiarowe.length)
    throw new BladPrzegladarek(
      'silniki',
      'silnik-nadmiarowy',
      `${nadmiarowe.length} Playwright projects have no entry in the policy: ${nadmiarowe.join(', ')}.\n` +
        `    Points 3 and 6 walk the engines FROM THE POLICY, so a project outside it runs ` +
        `in CI, costs time and is never once looked at by this gate.`,
    );

  const wzorcowe = silniki.filter((s) => polityka.silniki[s]?.wzorcowy);
  if (wzorcowe.length !== 1)
    throw new BladPrzegladarek(
      'silniki',
      'wzorcowy-niejednoznaczny',
      `the policy names ${wzorcowe.length} reference engines (${wzorcowe.join(', ') || 'none'}), ` +
        `and is to name exactly one.\n` +
        `    The reference engine is point 6's baseline: a fact that holds for NOBODY is no ` +
        `defect of an engine but a broken probe. With no unambiguous baseline there is no ` +
        `way to tell the two apart.`,
    );
  const [wzorcowy] = wzorcowe;
  const wzorcoweWylaczenia = wylaczenia.filter((w) =>
    (w?.silniki ?? []).includes(wzorcowy),
  );
  if (wzorcoweWylaczenia.length)
    throw new BladPrzegladarek(
      'silniki',
      'wzorcowy-z-wylaczeniem',
      `the reference engine \`${wzorcowy}\` stands in ${wzorcoweWylaczenia.length} exclusions ` +
        `(${wzorcoweWylaczenia.map((w) => w.plik).join(', ')}).\n` +
        `    The reference is the one that runs WITH NO exclusions — it is the measure ` +
        `for the rest. An engine with a hole stops being one, and point 3 loses what it ` +
        `compares coverage against.`,
    );

  // 3. COVERAGE. Both sides of the denominator first: a file from the repo nobody
  // collected, and a collected file that is not in the repo. Only then a gap on an engine.
  const wszystkieZebrane = new Set(
    Object.values(zebrane ?? {}).flatMap((p) => p ?? []),
  );
  const niezebrane = pliki.filter((p) => !wszystkieZebrane.has(p));
  if (niezebrane.length)
    throw new BladPrzegladarek(
      'pokrycie',
      'plik-poza-pomiarem',
      `${niezebrane.length} spec files were collected by NO engine:\n` +
        lista(niezebrane) +
        `\n    The file sits in \`${TESTDIR}\`, is in the git index and runs nowhere — ` +
        `zwykle przez wzorzec \`testMatch\`, \`testDir\` albo \`testIgnore\` dopisany ` +
        `wszystkim projektom naraz. Przebieg jest zielony, bo Playwright nie ma czego ` +
        `to run.`,
    );
  const spozaRepo = [...wszystkieZebrane].filter((p) => !pliki.includes(p));
  if (spozaRepo.length)
    throw new BladPrzegladarek(
      'pokrycie',
      'plik-spoza-repo',
      `${spozaRepo.length} files collected by Playwright are not in the git index:\n` +
        lista(spozaRepo) +
        `\n    Point 3's denominator comes from git, so such a file is invisible to it: it ` +
        `runs, and the gate has no way of asking whether it runs everywhere.`,
    );

  const wpisFor = (plik, silnik) =>
    wylaczenia.find(
      (w) => w?.plik === plik && (w?.silniki ?? []).includes(silnik),
    );
  const luki = [];
  for (const silnik of silniki) {
    const maja = new Set(zebrane[silnik] ?? []);
    for (const plik of pliki) {
      if (maja.has(plik)) continue;
      if (!wpisFor(plik, silnik)) luki.push(`${silnik}: ${plik}`);
    }
  }
  if (luki.length)
    throw new BladPrzegladarek(
      'pokrycie',
      'luka-bez-wpisu',
      `${luki.length} par plik × silnik nie biegnie i nie ma na to wpisu w polityce:\n` +
        lista(luki) +
        `\n    This is what a \`testIgnore\` widened „because it flickers" looks like: ` +
        `coverage shrinks by one file, the run stays green and gets a few seconds shorter. ` +
        `Remedy: fix the test, or add an exclusion with a reason to ${POLITYKA}.`,
    );

  // 4. The register of exclusions. A dead entry is the same defect here as a dead word in
  // the token name dictionary: it outlives the problem and teaches you to read it as current.
  for (const wpis of wylaczenia) {
    const gdzie = `exclusion \`${wpis?.plik ?? '(no file)'}\``;
    if (!wpis?.plik || !pliki.includes(wpis.plik))
      throw new BladPrzegladarek(
        'rejestr',
        'wpis-bez-pliku',
        `${gdzie} names a file that is not in \`${TESTDIR}\` (git index).\n` +
          `    An entry with no file fires nothing and protects nothing — it reads as a ` +
          `description of the state, and describes the one before a delete or a rename.`,
      );
    const silnikiWpisu = wpis.silniki ?? [];
    const nieznane = silnikiWpisu.filter((s) => !silniki.includes(s));
    if (!silnikiWpisu.length || nieznane.length)
      throw new BladPrzegladarek(
        'rejestr',
        'wpis-bez-silnika',
        `${gdzie} names ${silnikiWpisu.length ? `unknown engines: ${nieznane.join(', ')}` : 'an empty list of engines'}.\n` +
          `    Point 3 looks an entry up by the file × engine pair, so such an entry ` +
          `excuses nothing while looking in the register like a justification.`,
      );
    if (!RODZAJE.includes(wpis.rodzaj))
      throw new BladPrzegladarek(
        'rejestr',
        'wpis-nieznanego-rodzaju',
        `${gdzie} ma \`rodzaj: ${JSON.stringify(wpis.rodzaj)}\`, a rozumiem ` +
          `${RODZAJE.map((r) => `\`${r}\``).join(' i ')}.\n` +
          `    The kind decides whether point 6 is to VERIFY the entry with a probe or ` +
          `take it as a recorded decision. An entry of an unknown kind would fall out of ` +
          `that question.`,
      );
    if (typeof wpis.powod !== 'string' || wpis.powod.trim().length < 40)
      throw new BladPrzegladarek(
        'rejestr',
        'wpis-bez-powodu',
        `${gdzie} carries no reason (or one contentless sentence).\n` +
          `    The register of exclusions is the only place where anybody explains why a ` +
          `file does NOT run — without that it is a list that grows.`,
      );
    if (wpis.rodzaj === 'pomiar' && !SONDY[wpis.fakt])
      throw new BladPrzegladarek(
        'rejestr',
        'wpis-bez-sondy',
        `${gdzie} jest rodzaju \`pomiar\`, a \`fakt: ${JSON.stringify(wpis.fakt)}\` ` +
          `has no probe in \`check-browsers.mjs\`.\n` +
          `    The \`pomiar\` kind promises the justification is verified on every run. ` +
          `With no probe it is a \`zapis\` pretending to be a measurement — worse than a ` +
          `plain record.`,
      );
    const martwe = silnikiWpisu.filter((s) =>
      (zebrane[s] ?? []).includes(wpis.plik),
    );
    if (martwe.length)
      throw new BladPrzegladarek(
        'rejestr',
        'wpis-martwy',
        `${gdzie} excludes engines on which the file runs anyway: ${martwe.join(', ')}.\n` +
          `    An exclusion with no effect outlives a problem that is gone, and reads as a ` +
          `description of today's state.`,
      );
  }

  // 5. CI. The gate measures `--list`, that is, the configuration — but what runs is a
  // COMMAND. Between the two sits `--project=chromium`, which points 1–3 cannot see.
  const wadaPolecenia = ZAWEZAJACE.filter(([, wzorzec]) =>
    wzorzec.test(e2e?.polecenie ?? ''),
  ).map(([nazwa]) => nazwa);
  if (!e2e?.polecenie)
    throw new BladPrzegladarek(
      'ci',
      'e2e-bez-polecenia',
      `the \`sandbox-e2e:e2e\` target has no command that can be read — the gate cannot ` +
        `check whether the run is narrowed`,
    );
  if (wadaPolecenia.length)
    throw new BladPrzegladarek(
      'ci',
      'e2e-zawezony',
      `the \`sandbox-e2e:e2e\` command narrows the run (${wadaPolecenia.join(', ')}):\n` +
        `      ${e2e.polecenie}\n` +
        `    The configuration then declares three engines, \`--list\` shows three, and ` +
        `one runs. The only narrowing invisible in \`playwright.config.mts\`.`,
    );

  if (!ci?.instalacje?.length)
    throw new BladPrzegladarek(
      'ci',
      'ci-bez-instalacji',
      `\`${CI}\` has no \`playwright install\` step at all — browsers do not come from ` +
        `nowhere, so either the run fails or (worse) somebody fixed it by narrowing the ` +
        `matrix`,
    );
  const brakiCi = ci.instalacje.flatMap((krok, i) =>
    silniki
      .filter((s) => !krok.includes(s))
      .map((s) => `krok #${i + 1}: brak \`${s}\``),
  );
  if (brakiCi.length)
    throw new BladPrzegladarek(
      'ci',
      'ci-bez-silnika',
      `${brakiCi.length} browser install steps in \`${CI}\` do not name an engine from the policy:\n` +
        lista(brakiCi) +
        `\n    There are two steps (a cache miss and a cache hit) and they have to name the ` +
        `same set: an engine installed only on a miss disappears at the first hit.`,
    );
  if (!ci.uruchamiaE2E)
    throw new BladPrzegladarek(
      'ci',
      'ci-bez-e2e',
      `\`${CI}\` does not run the \`e2e\` target anywhere.\n` +
        `    That is this whole gate's denominator: the matrix describes a run that does ` +
        `not happen, and every point above passes because the configuration is fine.`,
    );

  // 6. FACT. A probe in every engine, for every fact a `pomiar` exclusion appeals to.
  // Three rules, because there are three different ways such a justification can stop
  // holding, and only one of them is loud.
  const zPomiaru = wylaczenia.filter((w) => w.rodzaj === 'pomiar');
  for (const fakt of [...new Set(zPomiaru.map((w) => w.fakt))]) {
    const wynik = fakty?.[fakt] ?? {};
    const bezWyniku = silniki.filter((s) => typeof wynik[s] !== 'boolean');
    if (bezWyniku.length)
      throw new BladPrzegladarek(
        'fakt',
        'sonda-nieudana',
        `probe \`${fakt}\` gave no result for: ${bezWyniku.join(', ')}.\n` +
          `    With no result there is no way to say whether the exclusion still has a ` +
          `reason — and no verdict defaults to „it stays", the worst of the answers.`,
      );

    const wylaczoneTu = new Set(
      zPomiaru.filter((w) => w.fakt === fakt).flatMap((w) => w.silniki),
    );
    if (!silniki.some((s) => wynik[s]))
      throw new BladPrzegladarek(
        'fakt',
        'fakt-bez-odniesienia',
        `probe \`${fakt}\` holds for NO engine, the reference \`${wzorcowy}\` ` +
          `included.\n` +
          `    That is no defect of the engines but of the probe: were it ` +
          `to start returning false always, every exclusion resting on it would look ` +
          `justified forever. A measurement's denominator, not caution.`,
      );

    const przezyly = [...wylaczoneTu].filter((s) => wynik[s]);
    if (przezyly.length)
      throw new BladPrzegladarek(
        'fakt',
        'fakt-nieaktualny',
        `\`${fakt}\` now holds for engines excluded on account of it: ${przezyly.join(', ')}.\n` +
          `    The reason for the exclusion is gone — most likely at a Playwright bump, a ` +
          `change that touches not one file in this repository. Remedy: take the entry out ` +
          `of ${POLITYKA} and out of \`testIgnore\`, then see what that file has to say ` +
          `there.`,
      );

    const bezPokrycia = silniki.filter((s) => !wynik[s] && !wylaczoneTu.has(s));
    if (bezPokrycia.length)
      throw new BladPrzegladarek(
        'fakt',
        'fakt-nieodwzorowany',
        `\`${fakt}\` does not hold for engines whose files run anyway: ${bezPokrycia.join(', ')}.\n` +
          `    The tests ask there about behaviour the engine does not have — they will ` +
          `pass or fail, and either way measure something other than their name says.`,
      );
  }

  const wyl = wylaczenia.length;
  return (
    `${pliki.length} spec files on ${silniki.length} engines ` +
    `(${silniki.map((s) => `${s}: ${zebrane[s].length}`).join(', ')}), ` +
    `${wyl} ${wyl === 1 ? 'exclusion' : 'exclusions'} — ` +
    `${zPomiaru.length} of them confirmed by a probe`
  );
};

// ── input from disk ───────────────────────────────────────────────────────────

const czytaj = (sciezka) => readFileSync(join(ROOT, sciezka), 'utf8');

const politykaZDysku = () => JSON.parse(czytaj(POLITYKA));

/**
 * What Playwright REALLY collects, project by project. `--list` starts neither the
 * `webServer` nor the browsers, so the measurement costs seconds rather than minutes — and
 * still goes through the same configuration code as a real run.
 */
const zebranePrzezPlaywrighta = () => {
  let surowe;
  try {
    surowe = execFileSync(
      join(ROOT, 'node_modules/.bin/playwright'),
      ['test', '--list', '--reporter=json'],
      {
        cwd: join(ROOT, E2E),
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
        maxBuffer: 64 * 1024 * 1024,
      },
    );
  } catch (blad) {
    throw new BladPrzegladarek(
      'mianownik',
      'pomiar-nieczytelny',
      `\`playwright test --list\` could not be run:\n    ` +
        String(blad.stderr || blad.stdout || blad.message)
          .trim()
          .split('\n')
          .slice(0, 8)
          .join('\n    '),
    );
  }

  let raport;
  try {
    raport = JSON.parse(surowe);
  } catch {
    throw new BladPrzegladarek(
      'mianownik',
      'pomiar-nieczytelny',
      `the output of \`playwright test --list --reporter=json\` is not JSON ` +
        `(${surowe.length} characters) — the gate has nothing to derive the matrix from`,
    );
  }
  if (raport.errors?.length)
    throw new BladPrzegladarek(
      'mianownik',
      'pomiar-nieczytelny',
      `Playwright reported ${raport.errors.length} errors while collecting tests:\n    ` +
        raport.errors
          .map((e) => (e.message ?? String(e)).split('\n')[0])
          .join('\n    '),
    );

  const zebrane = {};
  const obejdz = (suite) => {
    for (const spec of suite.specs ?? [])
      for (const test of spec.tests ?? []) {
        (zebrane[test.projectName] ??= new Set()).add(spec.file);
      }
    for (const glebiej of suite.suites ?? []) obejdz(glebiej);
  };
  for (const suite of raport.suites ?? []) obejdz(suite);

  // A project with no test at all does not appear in the result tree, and point 2 is to
  // name it — hence an empty list rather than a missing key.
  for (const projekt of raport.config?.projects ?? [])
    zebrane[projekt.name] ??= new Set();

  return Object.fromEntries(
    Object.entries(zebrane).map(([k, v]) => [k, [...v].sort()]),
  );
};

/**
 * Spec files from the GIT INDEX, not from a directory scan: an uncommitted file binds
 * nobody yet, and an artifact in `dist/` is nobody's test.
 */
const plikiSpec = () =>
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
  const graf = await createProjectGraphAsync({ exitOnError: false });
  const target = graf.nodes['sandbox-e2e']?.data?.targets?.e2e;
  const { command, commands } = target?.options ?? {};
  const polecenia = commands ?? (command === undefined ? [] : [command]);
  return {
    polecenie: polecenia
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
const krokiCi = (silniki) => {
  const linie = czytaj(CI)
    .split('\n')
    .map((l) => l.replace(/#.*$/, ''));
  const instalacje = linie
    .filter((l) => /playwright\s+install/.test(l))
    .map((l) => silniki.filter((s) => new RegExp(`\\b${s}\\b`).test(l)));
  const uruchamiaE2E = linie.some(
    (l) => /nx\s+(?:affected|run-many)/.test(l) && /\be2e\b/.test(l),
  );
  return { instalacje, uruchamiaE2E };
};

/**
 * Probes in real browsers — one page per engine, with no server and no application. What
 * is measured here is the ENGINE's behaviour, so the less there is around it, the fewer
 * things can answer in its place.
 */
const zmierzFakty = async (polityka) => {
  const potrzebne = [
    ...new Set(
      (polityka.wylaczenia ?? [])
        .filter((w) => w.rodzaj === 'pomiar' && SONDY[w.fakt])
        .map((w) => w.fakt),
    ),
  ];
  if (!potrzebne.length) return {};

  const playwright = await import('playwright');
  const fakty = Object.fromEntries(potrzebne.map((f) => [f, {}]));

  for (const silnik of Object.keys(polityka.silniki)) {
    const typ = playwright[silnik];
    if (!typ) continue;
    let przegladarka;
    try {
      przegladarka = await typ.launch();
      const kontekst = await przegladarka.newContext({
        forcedColors: 'active',
      });
      const page = await kontekst.newPage();
      for (const fakt of potrzebne)
        fakty[fakt][silnik] = await SONDY[fakt](page);
    } catch {
      // No result is content here, not a failure: point 6 is to SAY so (the
      // `sonda-nieudana` rule) rather than bring the gate down with a stack trace.
    } finally {
      await przegladarka?.close();
    }
  }
  return fakty;
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
  const w = structuredClone(baza.wejscie);

  for (const nazwa of fx.usunSilniki ?? []) delete w.polityka.silniki[nazwa];
  for (const [nazwa, def] of Object.entries(fx.dopiszSilniki ?? {}))
    w.polityka.silniki[nazwa] = def;
  if (fx.wyczyscSilniki) w.polityka.silniki = {};

  w.polityka.wylaczenia = w.polityka.wylaczenia.filter(
    (wy) => !(fx.usunWylaczenia ?? []).includes(wy.plik),
  );
  for (const [plik, pola] of Object.entries(fx.podmienWylaczenie ?? {})) {
    const wpis = w.polityka.wylaczenia.find((wy) => wy.plik === plik);
    if (wpis) for (const [k, v] of Object.entries(pola)) wpis[k] = v;
  }
  w.polityka.wylaczenia.push(...(fx.dopiszWylaczenia ?? []));

  if (fx.wyczyscPliki) w.pliki = [];
  w.pliki = w.pliki.filter((p) => !(fx.usunPliki ?? []).includes(p));
  w.pliki.push(...(fx.dopiszPliki ?? []));
  w.pliki.sort();

  for (const [silnik, pliki] of Object.entries(fx.usunZebrane ?? {}))
    w.zebrane[silnik] = (w.zebrane[silnik] ?? []).filter(
      (p) => !pliki.includes(p),
    );
  for (const [silnik, pliki] of Object.entries(fx.dopiszZebrane ?? {}))
    w.zebrane[silnik] = [...(w.zebrane[silnik] ?? []), ...pliki].sort();
  for (const silnik of fx.wyczyscZebrane ?? []) w.zebrane[silnik] = [];

  if (fx.e2e) w.e2e = { ...w.e2e, ...fx.e2e };
  if (fx.ci) w.ci = { ...w.ci, ...fx.ci };
  for (const [fakt, wyniki] of Object.entries(fx.fakty ?? {}))
    w.fakty[fakt] = { ...w.fakty[fakt], ...wyniki };

  return w;
};

// ── the run ───────────────────────────────────────────────────────────────────

const problems = [];
let opis = null;

try {
  const polityka = politykaZDysku();
  opis = sprawdzPrzegladarki({
    polityka,
    zebrane: zebranePrzezPlaywrighta(),
    pliki: plikiSpec(),
    e2e: await targetE2E(),
    ci: krokiCi(Object.keys(polityka.silniki ?? {})),
    fakty: await zmierzFakty(polityka),
  });
} catch (blad) {
  if (!(blad instanceof BladPrzegladarek)) throw blad;
  problems.push(`${blad.kontrola}/${blad.regula}: ${blad.message}`);
}

if (!existsSync(FIXTURES))
  problems.push(
    `tools/check-browsers.fixtures: the directory does not exist — a gate with no proof ` +
      `that it can fail is one more silent defect (req-quality-negative-control)`,
  );

const przypadki = existsSync(FIXTURES)
  ? readdirSync(FIXTURES)
      .filter((n) => n.endsWith('.json') && n !== BAZA)
      .sort()
  : [];

if (existsSync(FIXTURES) && !przypadki.length)
  problems.push(
    `tools/check-browsers.fixtures: no prepared inputs — a gate with no proof that it can ` +
      `fail is one more silent defect (req-quality-negative-control)`,
  );

// The reference input MUST pass. Were it defective itself, every case would fire
// because of it and not because of its own defect — every „it fired" would be false.
if (przypadki.length) {
  try {
    sprawdzPrzegladarki(zlozFixture({}));
  } catch (blad) {
    if (!(blad instanceof BladPrzegladarek)) throw blad;
    problems.push(
      `${BAZA}: the reference input does NOT pass (${blad.kontrola}/${blad.regula}) — ` +
        `every prepared case now fires because of it.\n    ${blad.message}`,
    );
  }
}

for (const nazwa of przypadki) {
  const fx = wczytajFixture(nazwa);
  try {
    sprawdzPrzegladarki(zlozFixture(fx));
    problems.push(
      `${nazwa}: the prepared input PASSED and was meant not to — ` +
        `rule \`${fx.kontrola}/${fx.regula}\` stopped examining anything`,
    );
  } catch (blad) {
    if (!(blad instanceof BladPrzegladarek)) throw blad;
    if (blad.kontrola !== fx.kontrola || blad.regula !== fx.regula)
      problems.push(
        `${nazwa}: rule \`${blad.kontrola}/${blad.regula}\` fired, and \`${fx.kontrola}/${fx.regula}\` ` +
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
  `✓ Browser matrix: ${opis}. Negative control: the reference input passes, ` +
    `${przypadki.length} prepared ones rejected on their own rules.`,
);
