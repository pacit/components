#!/usr/bin/env node
/**
 * Mutation run gate: do the unit tests catch anything (`req-quality-unit`)? Stryker answers
 * that and can fail on it, but by DEFAULT does neither: `thresholds.break` is `null`, so a
 * run ends zero at 4% as at 94%.
 *
 *  1. DENOMINATOR: the measurement exists, is not empty and is CURRENT with the sources,
 *  2. the inventory of mutated files matches the policy — both ways,
 *  3. TEST DENOMINATOR: the run executed exactly the specs the `test` target does,
 *  4. the threshold is declared, binding, and cannot be disarmed from the command,
 *  5. the denominator is not narrowed: ignorers, excluded mutators, static mutants,
 *  6. the result: a hard floor and a snapshot with a TWO-SIDED tolerance, per file and total,
 *  7. both targets (`mutacja`, `check-mutation`) run in CI.
 *
 * „What the run really did" comes from the report's `config` field, which carries the
 * EFFECTIVE configuration: the file plus whatever the command line added. Point 3 stands
 * apart because the run has a Vitest configuration of its own.
 *
 * Usage: node tools/check-mutation.mjs [--write]  (--write: rewrite the result snapshot)
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FIXTURES = join(ROOT, 'tools/check-mutation.fixtures');
const BAZA = '_poprawny.json';

const PROJEKT = 'libs/components';
const RAPORT = 'tmp/mutacja/mutation.json';
const POLITYKA = `${PROJEKT}/mutacja.policy.json`;
const KONFIG = `${PROJEKT}/stryker.config.json`;
const SNAPSHOT = `${PROJEKT}/mutacja.snapshot.md`;
const CI = '.github/workflows/ci.yml';

const WRITE = process.argv.includes('--write');

/** Wzorzec pliku specyfikacji — mianownik punktu 3. */
const SPEC = /\.spec\.ts$/;

/**
 * The mutant statuses Stryker counts as DETECTED. `Timeout` stands beside `Killed` not out
 * of courtesy but because that is how the score is computed — and that is exactly why
 * point 5 asks separately how large the clock's share is.
 */
const WYKRYTE = ['Killed', 'Timeout'];
/** The statuses counted into the denominator. `Ignored` is NOT one — hence point 5. */
const MIANOWNIK = [...WYKRYTE, 'Survived', 'NoCoverage', 'RuntimeError'];

/**
 * The strings by which a disarmed target command is recognised. `--force` tells Stryker to
 * ignore the incremental result, `--dryRunOnly` ends the run BEFORE a single mutant is
 * executed (and exits zero), and a shell operator eats the exit code — so
 * `thresholds.break` stops meaning anything.
 */
const ROZBRAJAJACE = [
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
const WYLACZENIE_W_ZRODLE = /\/[/*]\s*Stryker\s+(disable|restore)\b/;

/**
 * A violation of one of the checks. It carries the pair `kontrola` + `regula`, not the
 * point's identifier alone: a gate's point is not one sentence (`lesson-50`), and a
 * negative control comparing only the point lets through a case that fired on a
 * neighbouring rule of that same point.
 */
class BladMutacji extends Error {
  constructor(kontrola, regula, opis) {
    super(opis);
    this.kontrola = kontrola;
    this.regula = regula;
  }
}

const lista = (items) => items.map((i) => `      ${i}`).join('\n');
const procent = (n) => `${n.toFixed(2)}%`;

/** The mutation score of a set of mutants, computed exactly as Stryker computes it. */
const wynikZ = (mutanty) => {
  const w = mutanty.filter((m) => WYKRYTE.includes(m.status)).length;
  const m = mutanty.filter((x) => MIANOWNIK.includes(x.status)).length;
  return { wykryte: w, mianownik: m, wynik: m === 0 ? 100 : (w / m) * 100 };
};

// ── snapshot ──────────────────────────────────────────────────────────────────

const NAGLOWEK = `# Snapshot przebiegu mutacyjnego

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

Columns: file · score · killed (of that, by the clock) · surviving · not covered ·
ignored. Tolerance: ±%TOLERANCJA% of a percentage point.
`;

const renderujSnapshot = (raport, tolerancja) => {
  const wiersze = Object.entries(raport.files)
    .map(([plik, dane]) => {
      const s = wynikZ(dane.mutants);
      const licz = (st) => dane.mutants.filter((m) => m.status === st).length;
      return (
        `${plik} ${s.wynik.toFixed(2)} ${licz('Killed') + licz('Timeout')}` +
        `(${licz('Timeout')}) ${licz('Survived')} ${licz('NoCoverage')} ` +
        `${licz('Ignored')}`
      );
    })
    .sort();

  const wszystkie = Object.values(raport.files).flatMap((d) => d.mutants);
  const razem = wynikZ(wszystkie);

  return (
    NAGLOWEK.replace('%TOLERANCJA%', String(tolerancja)) +
    '\n```\n' +
    wiersze.join('\n') +
    `\nRAZEM ${razem.wynik.toFixed(2)} ${razem.wykryte}/${razem.mianownik}\n` +
    '```\n'
  );
};

/** The rows from the snapshot's code block — the rest of the file is prose. */
const wierszeSnapshotu = (tekst) =>
  (tekst ?? '')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => /^(?:[\w./-]+\.ts|RAZEM) \d/.test(l));

// ── kontrole ──────────────────────────────────────────────────────────────────

/**
 * The full set of checks over a ready input:
 *   `polityka`  — the contents of `mutacja.policy.json`,
 *   `raport`    — the contents of `tmp/mutacja/mutation.json` (with its `config` field),
 *   `zrodla`    — `{ [plik]: tresc }` from disk, for the report's and the policy's files,
 *   `specyfikacje` — the library's `*.spec.ts` files from the git index,
 *   `snapshot`  — the contents of `mutacja.snapshot.md`, or `null`,
 *   `konfig`    — the contents of `stryker.config.json`,
 *   `targety`   — `{ mutacja: { polecenie }, check: { polecenie } }` from the Nx graph,
 *   `ci`        — `{ targety: [...] }` from the workflow.
 * Throws `BladMutacji` on the first violation — the checks start from the denominator, so
 * the later ones would have nothing to examine anyway. Returns `{ opis, snapshot }`.
 */
export const sprawdzMutacje = (we) => {
  const polityka = we?.polityka ?? {};
  const tolerancja = polityka.tolerancja;
  const raport = we?.raport;

  // 1. DENOMINATOR. A report that is missing or empty gives a gate that always passes —
  // with nothing to compare, everything agrees.
  if (!raport || typeof raport !== 'object' || !raport.files)
    throw new BladMutacji(
      'pomiar',
      'pomiar-nieczytelny',
      `no readable \`${RAPORT}\` — the mutation run either did not happen or wrote no ` +
        `report. The gate then has nothing to measure and stays silent about everything.`,
    );

  // Every read below is defensive, even though the point above has already rejected an
  // empty or unreadable report. The reason is measured, not precautionary: the negative
  // control disarms the rules ONE BY ONE, so a point trusting the previous one then gives
  // a `TypeError` instead of a message — the one state in which the gate does not say what
  // is wrong. The same defect came back seven times in this repository.
  const pliki = Object.keys(raport?.files ?? {});
  const wszystkieMutanty = Object.values(raport?.files ?? {}).flatMap(
    (d) => d?.mutants ?? [],
  );
  if (!wszystkieMutanty.length)
    throw new BladMutacji(
      'pomiar',
      'pomiar-pusty',
      `the report holds no mutant at all. Stryker then exits ZERO and reports a score of ` +
        `100% — because it divides by a denominator that is not there.`,
    );

  // A report older than the sources measures code that is gone. Nx watches this with its
  // cache, but a run by hand (or a cache hit after a change was reverted) would show a
  // pre-edit result as today's.
  for (const [plik, dane] of Object.entries(raport?.files ?? {})) {
    const naDysku = we.zrodla?.[plik];
    if (naDysku !== undefined && naDysku !== dane.source)
      throw new BladMutacji(
        'pomiar',
        'pomiar-nieaktualny',
        `\`${plik}\` differs from the text the score was computed on.\n` +
          `    The report describes pre-edit code: the surviving mutants concern lines ` +
          `that are gone, and the new ones were never measured.`,
      );
  }

  // 2. INVENTORY. Three questions, because there are three different ways a file can drop
  // out of the measurement, and only one of them touches the configuration.
  const konfigRaportu = raport?.config ?? {};
  const wzorce = polityka.wzorce ?? [];
  const wzorceRaportu = konfigRaportu.mutate ?? [];
  if (JSON.stringify(wzorce) !== JSON.stringify(wzorceRaportu))
    throw new BladMutacji(
      'inwentarz',
      'wzorce-zmienione',
      `the run's \`mutate\` patterns do not match ${POLITYKA}:\n` +
        `      run:     ${JSON.stringify(wzorceRaportu)}\n` +
        `      policy:  ${JSON.stringify(wzorce)}\n` +
        `    Narrowing a pattern is the cheapest way to raise the score: a file struck ` +
        `from the measurement takes its surviving mutants with it.`,
    );

  const zPolityki = polityka.pliki ?? [];
  if (!zPolityki.length)
    throw new BladMutacji(
      'inwentarz',
      'polityka-bez-plikow',
      `${POLITYKA} lists no file at all — points 2 and 6 walk exactly this list, so both ` +
        `would pass without looking at anything`,
    );
  const spozaRepo = zPolityki.filter((p) => !(we.wRepo ?? []).includes(p));
  if (spozaRepo.length)
    throw new BladMutacji(
      'inwentarz',
      'wpis-bez-pliku',
      `${spozaRepo.length} pozycji inwentarza nie ma w indeksie gita:\n` +
        lista(spozaRepo) +
        `\n    An entry with no file watches nothing, and reads as a description of ` +
        `today's measurement reach.`,
    );

  const bezMutantow = polityka.bezMutantow ?? [];
  const uzasadnione = new Set(bezMutantow.map((w) => w?.plik));
  for (const wpis of bezMutantow) {
    if (!zPolityki.includes(wpis?.plik))
      throw new BladMutacji(
        'inwentarz',
        'wyjatek-spoza-inwentarza',
        `the \`bezMutantow\` exception names \`${wpis?.plik ?? '(no file)'}\`, which is ` +
          `not in the inventory.\n` +
          `    An exception from measuring a file that is not measured excuses nothing — ` +
          `and looks in the register like a justification.`,
      );
    if (typeof wpis.powod !== 'string' || wpis.powod.trim().length < 40)
      throw new BladMutacji(
        'inwentarz',
        'wyjatek-bez-powodu',
        `the \`bezMutantow\` exception for \`${wpis.plik}\` carries no reason.\n` +
          `    „Zero mutants" means either „there is nothing to mutate" or „the file ` +
          `dropped out of the measurement". Only a sentence somebody wrote can tell.`,
      );
  }

  const beznadziejne = zPolityki.filter(
    (p) => !pliki.includes(p) && !uzasadnione.has(p),
  );
  if (beznadziejne.length)
    throw new BladMutacji(
      'inwentarz',
      'plik-bez-mutantow',
      `${beznadziejne.length} files of the inventory are not in the report:\n` +
        lista(beznadziejne) +
        `\n    A file with no mutant at all disappears from the report together with its ` +
        `survivors — and the score GOES UP. Remedy: bring the file back into the ` +
        `measurement, or add it to \`bezMutantow\` with a reason.`,
    );

  const martweWyjatki = bezMutantow.filter((w) => pliki.includes(w.plik));
  if (martweWyjatki.length)
    throw new BladMutacji(
      'inwentarz',
      'wyjatek-martwy',
      `${martweWyjatki.length} \`bezMutantow\` exceptions concern files that do have ` +
        `mutants: ${martweWyjatki.map((w) => w.plik).join(', ')}.\n` +
        `    The reason is gone and the entry stayed — from now on it hides a file that ` +
        `really does drop out of the measurement.`,
    );

  const nieznane = pliki.filter((p) => !zPolityki.includes(p));
  if (nieznane.length)
    throw new BladMutacji(
      'inwentarz',
      'plik-spoza-polityki',
      `${nieznane.length} files in the report are not in the inventory:\n` +
        lista(nieznane) +
        `\n    Point 6 walks the files FROM THE REPORT, so this one would be measured ` +
        `with nowhere for its floor to stand. Remedy: add it to ${POLITYKA}.`,
    );

  // 3. TEST DENOMINATOR. The mutation run uses a Vitest configuration of its own, so the
  // set of executed specs is a separate measurement — and breaks separately.
  const uruchomione = Object.keys(raport?.testFiles ?? {});
  if (!uruchomione.length)
    throw new BladMutacji(
      'testy',
      'testy-niezmierzone',
      `the report lists no test file at all. Without \`coverageAnalysis: ` +
        `"perTest"\` there is no way to check WHETHER the mutation run sees the same ` +
        `specyfikacje co target \`test\` — a to on odpowiada za mianownik wyniku.`,
    );
  const specyfikacje = we.specyfikacje ?? [];
  const nieuruchomione = specyfikacje.filter((s) => !uruchomione.includes(s));
  if (nieuruchomione.length)
    throw new BladMutacji(
      'testy',
      'spec-poza-pomiarem',
      `${nieuruchomione.length} of the library's specs did not enter the mutation ` +
        `run:\n` +
        lista(nieuruchomione) +
        `\n    They run in the \`test\` target and do not run here — so a mutant they ` +
        `kill counts as surviving. Two paths to the same specs have drifted ` +
        `(\`mutacja.vitest.config.mts\` against \`test\`).`,
    );
  const specSpozaRepo = uruchomione.filter((s) => !specyfikacje.includes(s));
  if (specSpozaRepo.length)
    throw new BladMutacji(
      'testy',
      'spec-spoza-repo',
      `${specSpozaRepo.length} test files from the run are not in the git index:\n` +
        lista(specSpozaRepo) +
        `\n    Point 3's denominator comes from git, so such a file kills mutants and ` +
        `the gate has no way of asking whether it kills them everywhere.`,
    );

  // 4. THRESHOLD. Stryker's default `break` is `null` — the run then exits zero whatever
  // the score, and this whole gate would be measuring a report to look at.
  const prog = polityka.prog;
  if (typeof prog !== 'number')
    throw new BladMutacji(
      'prog',
      'polityka-bez-progu',
      `${POLITYKA} declares no \`prog\` field — there is nothing to compare ` +
        `\`thresholds.break\` against, so point 4 has nothing to ask`,
    );
  const przerwanie = konfigRaportu.thresholds?.break;
  if (typeof przerwanie !== 'number')
    throw new BladMutacji(
      'prog',
      'prog-nieustawiony',
      `the run went with \`thresholds.break = ${JSON.stringify(przerwanie)}\`.\n` +
        `    That is Stryker's DEFAULT and means „never break": the run exits zero at 4% ` +
        `exactly as at 94%, and the report is a number to look at.`,
    );
  if (przerwanie !== prog)
    throw new BladMutacji(
      'prog',
      'prog-rozjechany',
      `the run's \`thresholds.break\` (${przerwanie}) does not match the policy's ` +
        `\`prog\` (${prog}).\n` +
        `    The first number fails the run, the second is its only justification. A drift ` +
        `means one of them was lowered without the other.`,
    );
  const wKonfiguracji = we.konfig?.thresholds?.break;
  if (wKonfiguracji !== przerwanie)
    throw new BladMutacji(
      'prog',
      'prog-z-polecenia',
      `\`thresholds.break\` in ${KONFIG} (${JSON.stringify(wKonfiguracji)}) differs from ` +
        `the one the run REALLY used (${przerwanie}).\n` +
        `    The command line overrides the configuration, and the report carries the ` +
        `effective value. The file then says something other than the run — and it is the ` +
        `file that review reads.`,
    );

  const polecenie = we.targety?.mutacja?.polecenie;
  if (!polecenie)
    throw new BladMutacji(
      'prog',
      'target-bez-polecenia',
      `the \`components:mutacja\` target has no command that can be read — the gate ` +
        `cannot check whether the run is disarmed`,
    );
  const wady = ROZBRAJAJACE.filter(([, w]) => w.test(polecenie)).map(
    ([n]) => n,
  );
  if (wady.length)
    throw new BladMutacji(
      'prog',
      'polecenie-rozbrojone',
      `polecenie targetu \`components:mutacja\` rozbraja przebieg (${wady.join(', ')}):\n` +
        `      ${polecenie}\n` +
        `    The configuration then looks exactly as it does today, the report looks ` +
        `exactly as it does today, and the exit code is always zero.`,
    );

  // 5. NARROWING THE DENOMINATOR. An `Ignored` mutant counts towards neither the
  // numerator nor the denominator — every ignore raises the score, adding no test.
  const ignorery = polityka.ignorery ?? {};
  const uzyte = konfigRaportu.ignorers ?? [];
  const nieuzasadnione = uzyte.filter((i) => !ignorery[i]);
  if (nieuzasadnione.length)
    throw new BladMutacji(
      'zwezenie',
      'ignorer-nieuzasadniony',
      `the run used ignorers from outside the policy: ${nieuzasadnione.join(', ')}.\n` +
        `    An ignorer strikes mutants from the denominator. With no entry in ${POLITYKA} ` +
        `there is no place where anybody explains why those need not be killed.`,
    );
  const martweIgnorery = Object.keys(ignorery).filter(
    (i) => !uzyte.includes(i),
  );
  if (martweIgnorery.length)
    throw new BladMutacji(
      'zwezenie',
      'ignorer-martwy',
      `the policy justifies ignorers the run did not use: ${martweIgnorery.join(', ')}.\n` +
        `    An entry with no effect outlives a problem that is gone, and reads ` +
        `as a description of today's measurement.`,
    );

  const dozwolonePowody = new Set(
    Object.values(ignorery).map((w) => w?.powodMutanta),
  );
  const obce = wszystkieMutanty.filter(
    (m) => m.status === 'Ignored' && !dozwolonePowody.has(m.statusReason),
  );
  if (obce.length)
    throw new BladMutacji(
      'zwezenie',
      'mutant-zignorowany-obcym-powodem',
      `${obce.length} mutants were ignored for a reason outside the policy, e.g.:\n` +
        lista(
          [...new Set(obce.map((m) => `„${m.statusReason}"`))].slice(0, 3),
        ) +
        `\n    This is how a \`// Stryker disable\` comment enters the repository: it ` +
        `leaves no trace in the configuration, and the mutants leave the denominator.`,
    );

  const wZrodle = Object.entries(we.zrodla ?? {})
    .filter(([, tresc]) => WYLACZENIE_W_ZRODLE.test(tresc ?? ''))
    .map(([plik]) => plik);
  if (wZrodle.length)
    throw new BladMutacji(
      'zwezenie',
      'wylaczenie-w-zrodle',
      `${wZrodle.length} measured files carry a comment that switches Stryker off:\n` +
        lista(wZrodle) +
        `\n    The library has not one candidate for such an exception today, so the ` +
        `mechanism does not exist — a door with no user is a dead artifact. ` +
        `Mutant nie do zabicia jest zdaniem do napisania w ${POLITYKA}, nie ` +
        `a comment in code that nobody else reads.`,
    );

  if (konfigRaportu.ignoreStatic)
    throw new BladMutacji(
      'zwezenie',
      'statyczne-pominiete',
      `the run went with \`ignoreStatic: true\`.\n` +
        `    Static mutants — those in field initialisers and at module scope — then leave ` +
        `the denominator entirely. In a component library that is where an input, a ` +
        `default value and an identifier sit: its public contract.`,
    );
  const wykluczone = konfigRaportu.mutator?.excludedMutations ?? [];
  if (wykluczone.length)
    throw new BladMutacji(
      'zwezenie',
      'mutatory-wykluczone',
      `the run excludes whole families of mutations: ${wykluczone.join(', ')}.\n` +
        `    An excluded family leaves the denominator with no trace in the score — and ` +
        `each of them stands for a real mistake (an inverted condition, a moved boundary, ` +
        `a swapped string).`,
    );

  const zegar = polityka.zegar ?? {};
  if ((konfigRaportu.timeoutMS ?? 0) < (zegar.minimumMS ?? 0))
    throw new BladMutacji(
      'zwezenie',
      'zegar-skrocony',
      `the run's \`timeoutMS\` (${konfigRaportu.timeoutMS}) is lower than the policy's ` +
        `\`zegar.minimumMS\` (${zegar.minimumMS}).\n` +
        `    A mutant killed by elapsed time counts towards the score exactly like one ` +
        `killed by an assertion, so shortening the limit raises the percentage without ` +
        `adding tests.`,
    );
  if ((konfigRaportu.timeoutFactor ?? 0) < (zegar.minimumWspolczynnik ?? 0))
    throw new BladMutacji(
      'zwezenie',
      'wspolczynnik-skrocony',
      `the run's \`timeoutFactor\` (${konfigRaportu.timeoutFactor}) is lower than the ` +
        `policy's \`zegar.minimumWspolczynnik\` (${zegar.minimumWspolczynnik}).\n` +
        `    The same lever as \`timeoutMS\`, only measured against the time of ` +
        `a normal run.`,
    );
  const razem = wynikZ(wszystkieMutanty);
  const zZegara = wszystkieMutanty.filter((m) => m.status === 'Timeout').length;
  const udzial = razem.wykryte === 0 ? 0 : (zZegara / razem.wykryte) * 100;
  if (udzial > (zegar.udzialZegara ?? 100))
    throw new BladMutacji(
      'zwezenie',
      'zegar-zamiast-testu',
      `${zZegara} of ${razem.wykryte} killed mutants were killed by the CLOCK ` +
        `(${procent(udzial)}, ${zegar.udzialZegara}% allowed).\n` +
        `    A timeout means „the mutant looped the code", not „a test noticed". A long ` +
        `tail of timeouts is a score bought with run time.`,
    );

  // 6. RESULT. A hard floor (the one Stryker enforces) and a per-file snapshot.
  if (typeof tolerancja !== 'number')
    throw new BladMutacji(
      'wynik',
      'polityka-bez-tolerancji',
      `${POLITYKA} declares no \`tolerancja\` field — without it the comparison against ` +
        `the snapshot has no width and every run would look like a drift`,
    );

  const swiezy = renderujSnapshot(raport, tolerancja);
  if (we.snapshot === null || we.snapshot === undefined)
    throw new BladMutacji(
      'wynik',
      'brak-snapshotu',
      `no \`${SNAPSHOT}\` — run \`node tools/check-mutation.mjs --write\`.\n` +
        `    Without a snapshot point 6 watches the total floor alone, staying silent ` +
        `about a file that fell twenty points while the rest make up for it.`,
    );

  if (razem.wynik < prog)
    throw new BladMutacji(
      'wynik',
      'podloga-przebita',
      `the total score ${procent(razem.wynik)} is below the ${prog}% floor ` +
        `(${razem.wykryte} of ${razem.mianownik} mutants detected).\n` +
        `    That many mutants survived the test suite — that many changes of behaviour ` +
        `pass CI green today.`,
    );

  const zeSnapshotu = new Map(
    wierszeSnapshotu(we.snapshot)
      .filter((l) => !l.startsWith('RAZEM'))
      .map((l) => {
        const [plik, wynik] = l.split(/\s+/);
        return [plik, Number(wynik)];
      }),
  );
  const brakujace = pliki.filter((p) => !zeSnapshotu.has(p));
  if (brakujace.length)
    throw new BladMutacji(
      'wynik',
      'snapshot-niepelny',
      `${brakujace.length} measured files have no row in the snapshot:\n` +
        lista(brakujace) +
        `\n    A file with no row is measured by the total floor alone. ` +
        `Remedy: \`node tools/check-mutation.mjs --write\`.`,
    );
  const nadmiarowe = [...zeSnapshotu.keys()].filter((p) => !pliki.includes(p));
  if (nadmiarowe.length)
    throw new BladMutacji(
      'wynik',
      'snapshot-przeterminowany',
      `${nadmiarowe.length} snapshot rows concern files outside the measurement:\n` +
        lista(nadmiarowe) +
        `\n    A row with no file reads as proof that something is measured — and it is not.`,
    );

  const spadki = [];
  const skoki = [];
  for (const [plik, dane] of Object.entries(raport?.files ?? {})) {
    const teraz = wynikZ(dane.mutants).wynik;
    const wtedy = zeSnapshotu.get(plik);
    if (teraz < wtedy - tolerancja)
      spadki.push(`${plik}: ${procent(wtedy)} → ${procent(teraz)}`);
    if (teraz > wtedy + tolerancja)
      skoki.push(`${plik}: ${procent(wtedy)} → ${procent(teraz)}`);
  }
  if (spadki.length)
    throw new BladMutacji(
      'wynik',
      'wynik-spadl',
      `${spadki.length} files lost more than ${tolerancja} points of score:\n` +
        lista(spadki) +
        `\n    This is what a deleted assertion looks like: the tests are still green and ` +
        `notice fewer mutants. Remedy: add a test — or, if this is deliberate, rewrite the ` +
        `snapshot and show the drop in review.`,
    );
  if (skoki.length)
    throw new BladMutacji(
      'wynik',
      'snapshot-odstaje',
      `${skoki.length} files did better than the snapshot by more than ${tolerancja} points:\n` +
        lista(skoki) +
        `\n    That is good news and fires all the same: a floor ten points below the ` +
        `measurement stops measuring — every fifth assertion could then be deleted and the ` +
        `run stays green. Remedy: \`node tools/check-mutation.mjs --write\`.`,
    );

  // 7. CI. The gate and the run itself are two targets, each removable on its own.
  for (const target of ['mutacja', 'check-mutation'])
    if (!(we.ci?.targety ?? []).includes(target))
      throw new BladMutacji(
        'ci',
        'ci-bez-targetu',
        `\`${CI}\` does not have the \`${target}\` target among the ones it runs.\n` +
          `    That is this whole gate's denominator: everything above describes a run ` +
          `nobody starts, and locally each of them passes.`,
      );

  return {
    opis:
      `${pliki.length} files, ${razem.mianownik} mutants — score ` +
      `${procent(razem.wynik)} against a ${prog}% floor ` +
      `(${razem.mianownik - razem.wykryte} surviving, ` +
      `${wszystkieMutanty.filter((m) => m.status === 'Ignored').length} ignored)`,
    snapshot: swiezy,
  };
};

// ── input from disk ───────────────────────────────────────────────────────────

const czytaj = (sciezka) =>
  existsSync(join(ROOT, sciezka))
    ? readFileSync(join(ROOT, sciezka), 'utf8')
    : null;

const json = (sciezka) => {
  const tekst = czytaj(sciezka);
  if (tekst === null) return null;
  try {
    return JSON.parse(tekst);
  } catch {
    return null;
  }
};

const wIndeksie = (sciezka) =>
  execFileSync('git', ['ls-files', sciezka], { cwd: ROOT, encoding: 'utf8' })
    .split('\n')
    .map((p) => p.trim())
    .filter(Boolean);

/**
 * Both targets' commands FROM THE NX GRAPH, not from `project.json`: the graph is what Nx
 * will really run, and it is the graph that merges configurations and defaults.
 */
const targetyZGrafu = async () => {
  const { createProjectGraphAsync } = await import('@nx/devkit');
  const graf = await createProjectGraphAsync({ exitOnError: false });
  const czytaj = (nazwa) => {
    const target = graf.nodes['components']?.data?.targets?.[nazwa];
    const { command, commands } = target?.options ?? {};
    const polecenia = commands ?? (command === undefined ? [] : [command]);
    return {
      polecenie: polecenia
        .map((c) => (typeof c === 'string' ? c : (c?.command ?? '')))
        .join(' && '),
    };
  };
  return { mutacja: czytaj('mutacja'), check: czytaj('check-mutation') };
};

/**
 * Which targets the workflow runs. Comments are stripped BEFORE the search — this
 * workflow explains every step of its own in a paragraph of prose, so a sentence about a
 * target looks to a pattern exactly like a call to it (`lesson-56` in `check-browsers`).
 */
const targetyCi = () => {
  const linie = (czytaj(CI) ?? '')
    .split('\n')
    .map((l) => l.replace(/#.*$/, ''));
  const uruchomienie =
    linie.find((l) => /nx\s+(?:affected|run-many)/.test(l)) ?? '';
  return { targety: uruchomienie.split(/\s+/).filter(Boolean) };
};

const wejscieZDysku = async () => {
  const polityka = json(POLITYKA) ?? {};
  const raport = json(RAPORT);
  const zrodla = {};
  for (const plik of new Set([
    ...Object.keys(raport?.files ?? {}),
    ...(polityka.pliki ?? []),
  ]))
    zrodla[plik] = czytaj(plik) ?? undefined;

  return {
    polityka,
    raport,
    zrodla,
    wRepo: wIndeksie(PROJEKT),
    specyfikacje: wIndeksie(PROJEKT).filter((p) => SPEC.test(p)),
    snapshot: czytaj(SNAPSHOT),
    konfig: json(KONFIG) ?? {},
    targety: await targetyZGrafu(),
    ci: targetyCi(),
  };
};

// ── negative control ──────────────────────────────────────────────────────────

const wczytajFixture = (nazwa) =>
  JSON.parse(readFileSync(join(FIXTURES, nazwa), 'utf8'));

/**
 * The reference input keeps its files in shorthand (name → mutants as a list of statuses),
 * so a case can be read at a glance. Here they are expanded into the shape of a Stryker
 * report.
 */
const rozwinPliki = (skrot) =>
  Object.fromEntries(
    Object.entries(skrot).map(([plik, dane]) => [
      plik,
      {
        source: dane.source ?? '',
        mutants: (dane.statusy ?? []).map((s, i) => ({
          id: `${plik}-${i}`,
          mutatorName: 'ConditionalExpression',
          status: typeof s === 'string' ? s : s.status,
          statusReason: typeof s === 'string' ? undefined : s.powod,
        })),
      },
    ]),
  );

const zlozRaport = (w) => ({
  files: rozwinPliki(w.plikiSkrot),
  testFiles: Object.fromEntries(
    (w.testFiles ?? w.specyfikacje).map((s) => [s, { tests: [] }]),
  ),
  config: w.konfigPrzebiegu,
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
const zlozFixture = (fx) => {
  const w = structuredClone(wczytajFixture(BAZA).wejscie);
  const snapshotBazowy = renderujSnapshot(zlozRaport(w), w.polityka.tolerancja);

  for (const plik of fx.usunPliki ?? []) delete w.plikiSkrot[plik];
  for (const [plik, dane] of Object.entries(fx.dopiszPliki ?? {}))
    w.plikiSkrot[plik] = dane;
  for (const [plik, statusy] of Object.entries(fx.podmienStatusy ?? {}))
    w.plikiSkrot[plik].statusy = statusy;
  // A file's text stands in two places — on disk and in the report — and whether a change
  // touches both is the whole difference between „other code" and „a stale measurement".
  for (const [plik, tresc] of Object.entries(fx.podmienZrodlo ?? {})) {
    w.zrodla[plik] = tresc;
    w.plikiSkrot[plik].source = tresc;
  }
  for (const [plik, tresc] of Object.entries(fx.rozjedzZrodlo ?? {}))
    w.zrodla[plik] = tresc;

  if (fx.polityka)
    for (const [k, v] of Object.entries(fx.polityka))
      v === null ? delete w.polityka[k] : (w.polityka[k] = v);
  if (fx.konfigPrzebiegu)
    for (const [k, v] of Object.entries(fx.konfigPrzebiegu))
      v === null ? delete w.konfigPrzebiegu[k] : (w.konfigPrzebiegu[k] = v);
  if (fx.konfig) w.konfig = { ...w.konfig, ...fx.konfig };
  if (fx.targety) w.targety = { ...w.targety, ...fx.targety };
  if (fx.ci) w.ci = { ...w.ci, ...fx.ci };
  if (fx.specyfikacje) w.specyfikacje = fx.specyfikacje;
  if (fx.testFiles) w.testFiles = fx.testFiles;
  if (fx.wRepo) w.wRepo = fx.wRepo;

  let snapshot = fx.brakSnapshotu === true ? null : snapshotBazowy;
  for (const plik of fx.usunWierszSnapshotu ?? [])
    snapshot = snapshot
      .split('\n')
      .filter((l) => !l.startsWith(`${plik} `))
      .join('\n');
  for (const wiersz of fx.dopiszWierszSnapshotu ?? [])
    snapshot = snapshot.replace('RAZEM', `${wiersz}\nRAZEM`);

  return {
    polityka: w.polityka,
    raport: fx.brakRaportu === true ? null : zlozRaport(w),
    zrodla: w.zrodla,
    wRepo: w.wRepo,
    specyfikacje: w.specyfikacje,
    snapshot,
    konfig: w.konfig,
    targety: w.targety,
    ci: w.ci,
  };
};

// ── the run ───────────────────────────────────────────────────────────────────

const problems = [];
let opis = null;
try {
  opis = sprawdzMutacje(await wejscieZDysku()).opis;
} catch (blad) {
  if (!(blad instanceof BladMutacji)) throw blad;
  problems.push(`${blad.kontrola}/${blad.regula}: ${blad.message}`);
}

// `--write` is the right answer to three rules of point 6 (`brak-snapshotu`,
// `snapshot-niepelny`, `snapshot-odstaje`), so the snapshot has to be rewritable EVEN when
// the gate fired on them — otherwise the one command that fixes those rules would be
// available exactly outside the state in which it is needed. It renders from disk, not
// from the result above: with a rule fired there is no such result.
if (WRITE) {
  const raport = json(RAPORT);
  const polityka = json(POLITYKA) ?? {};
  if (raport?.files && typeof polityka.tolerancja === 'number') {
    writeFileSync(
      join(ROOT, SNAPSHOT),
      renderujSnapshot(raport, polityka.tolerancja),
    );
    console.log(`✓ Rewrote ${SNAPSHOT}`);
    process.exit(0);
  }
  console.error(`X Nothing to rewrite the snapshot from — no ${RAPORT}.`);
  process.exit(1);
}

if (!existsSync(FIXTURES))
  problems.push(
    `tools/check-mutation.fixtures: the directory does not exist — a gate with no proof ` +
      `that it can fail is one more silent defect (req-quality-negative-control)`,
  );

const przypadki = existsSync(FIXTURES)
  ? readdirSync(FIXTURES)
      .filter((n) => n.endsWith('.json') && n !== BAZA)
      .sort()
  : [];

if (existsSync(FIXTURES) && !przypadki.length)
  problems.push(
    `tools/check-mutation.fixtures: no prepared inputs — a gate with no proof that it can ` +
      `fail is one more silent defect (req-quality-negative-control)`,
  );

// The reference input MUST pass. Were it defective itself, every case would fire
// because of it and not because of its own defect — every „it fired" would be false.
if (przypadki.length) {
  try {
    sprawdzMutacje(zlozFixture({}));
  } catch (blad) {
    if (!(blad instanceof BladMutacji)) throw blad;
    problems.push(
      `${BAZA}: the reference input does NOT pass (${blad.kontrola}/${blad.regula}) — ` +
        `every prepared case now fires because of it.\n    ${blad.message}`,
    );
  }
}

for (const nazwa of przypadki) {
  const fx = wczytajFixture(nazwa);
  try {
    sprawdzMutacje(zlozFixture(fx));
    problems.push(
      `${nazwa}: the prepared input PASSED and was meant not to — ` +
        `rule \`${fx.kontrola}/${fx.regula}\` stopped examining anything`,
    );
  } catch (blad) {
    if (!(blad instanceof BladMutacji)) throw blad;
    if (blad.kontrola !== fx.kontrola || blad.regula !== fx.regula)
      problems.push(
        `${nazwa}: rule \`${blad.kontrola}/${blad.regula}\` fired, and \`${fx.kontrola}/${fx.regula}\` ` +
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
  `✓ Mutation run: ${opis}. Negative control: the reference input passes, ` +
    `${przypadki.length} prepared ones rejected on their own rules.`,
);
