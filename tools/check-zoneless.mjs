#!/usr/bin/env node
/**
 * Foundation gate: has `zone.js` really left the project, and is every built component
 * OnPush? An OPTIONAL peer of `@angular/core` and somebody else's default: both promises
 * rest on nobody undoing them ([`lesson-8`](../docs/lessons.md#lesson-8), [`lesson-11`](../docs/lessons.md#lesson-11)).
 *
 *  1. no manifest in the repository declares `zone.js`,
 *  2. `package-lock.json` has none in the tree, not even nested under someone's package,
 *  3. the built package holds not one trace of the zone runtime,
 *  4. DENOMINATOR: every component from the sources is in the built package,
 *  5. every component in the package has `ɵcmp.onPush === true` and `standalone === true`,
 *  6. no `@Component` sets `changeDetection` or `standalone` explicitly.
 *
 * `ɵcmp` is read from `dist/`, not from the sources: a partially compiled declaration
 * omits a default `changeDetection`, which the linker supplies at the consumer's
 * (`lesson-36`). Point 4 is point 5's denominator. Control: `check-zoneless.fixtures/`.
 *
 * Usage: node tools/check-zoneless.mjs
 */
import { globSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, extname, join, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execSync } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PROJEKT = 'libs/components';
const DIST = 'dist/libs/components';
const FIXTURES = join(ROOT, 'tools/check-zoneless.fixtures');
const BAZA = '_poprawny.json';

/** Manifest fields where `zone.js` means „it is back". */
const POLA_ZALEZNOSCI = [
  'dependencies',
  'devDependencies',
  'peerDependencies',
  'optionalDependencies',
];

/**
 * Traces of the zone runtime in the built code. Deliberately NOT `/zone/i`: a substring
 * that common hits ordinary words as well and would report an empty spot. Every pattern
 * has a name, because „something about zones" does not say what to look for.
 *
 * `NgZone` stands here beside the global `Zone`: for a library it is the same defect seen
 * from the other side — a component injecting `NgZone` relies on zones even with no
 * polyfill in the bundle, and falls over only at the consumer's.
 */
const SLADY = [
  ['import `zone.js`', /(?:from|import|require\()\s*['"]zone\.js/],
  ['injected `NgZone`', /\bNgZone\b/],
  ['`__zone_symbol__`', /__zone_symbol__/],
  [
    'global `Zone`',
    /\bZone\s*\.\s*(?:current|root|__load_patch|assertZonePatched)\b/,
  ],
];

/**
 * The component decorator in a source file. It anchors on the formatting `nx format:check`
 * enforces (`@Component({` and `})` in column zero) — and that is exactly why the number
 * of matches is compared separately against the number of plain `@Component(`. Without
 * that, a change of formatting would not break the parser but quietly SHRINK point 4's
 * denominator, with the gate still green: the very defect it stands against.
 *
 * The counter allows INDENTATION, because until 2026-08-05 it did not, and so did nothing:
 * it repeated the parser's anchor character for character, so moving a decorator by one
 * space put out both sides of the comparison at once. Measured on this repository —
 * `PctCheckbox` indented by a space gave „7 components" instead of eight and a green run,
 * so the component dropped out of the OnPush measurement without a trace (`lesson-48`).
 * A check comparing two measurements needs two INDEPENDENT ones; `[ \t]*` filters out
 * occurrences in comments, because a JSDoc line starts with an asterisk.
 */
const KOMPONENT =
  /^@Component\(\{\r?\n([\s\S]*?)^\}\)\r?\n(?:export\s+)?(?:abstract\s+)?class\s+([A-Za-z_$][\w$]*)/gm;
const KOMPONENT_LICZNIK = /^[ \t]*@Component\(/gm;

/** Options the Angular guide forbids restating — they are defaults in v22+. */
const OPCJE_DOMYSLNE = ['changeDetection', 'standalone'];

/**
 * A violation of one of the six checks. It carries the check's identifier, not just the
 * message: the negative control has to verify that a prepared input fired ON ITS OWN
 * point — a fixture failing for a reason other than the one written into it proves
 * something other than what it declares.
 */
class BladZoneless extends Error {
  constructor(kontrola, opis) {
    super(opis);
    this.kontrola = kontrola;
  }
}

/**
 * The full set of checks over a ready input:
 *   `manifesty`  — `[{ plik, dependencies, … }]`,
 *   `pakietyLocka` — the `packages` keys of `package-lock.json`,
 *   `bundle`     — `[{ plik, tekst }]` from the built package,
 *   `wejscia`    — the files the `exports` map points at (the denominator for `bundle`),
 *   `zrodla`     — `[{ plik, klasa, jawne }]` from `@Component` in the sources,
 *   `komponenty` — `[{ klasa, wejscie, onPush, standalone }]` from the package.
 * Throws `BladZoneless` on the first violation — the checks run from the most basic one,
 * so the later ones would have nothing to examine anyway.
 */
const sprawdzZoneless = ({
  manifesty,
  pakietyLocka,
  bundle,
  wejscia,
  zrodla,
  komponenty,
}) => {
  // 1. No manifest declares `zone.js`. The earliest moment it can be noticed — before
  // anyone runs `npm install`.
  const zadeklarowany = manifesty.flatMap((m) =>
    POLA_ZALEZNOSCI.filter((pole) => m[pole]?.['zone.js'] !== undefined).map(
      (pole) => `${m.plik} → ${pole}: ${m[pole]['zone.js']}`,
    ),
  );
  if (zadeklarowany.length)
    throw new BladZoneless(
      'manifesty',
      `\`zone.js\` is back in a manifest:\n` +
        zadeklarowany.map((z) => `      ${z}`).join('\n') +
        `\n    \`req-project-angular\` asks for the package to be REMOVED, not switched ` +
        `off — its mere presence in the dependencies restores the zone-based mode at the ` +
        `first \`import 'zone.js'\`, and Angular will not say a word (lesson-8).`,
    );

  // 2. The dependency tree. A manifest is a declaration, the lock is the fact: `zone.js`
  // can arrive as somebody else's dependency, so we look for nested installations too,
  // not only for a top-level entry.
  const wDrzewie = pakietyLocka.filter(
    (k) => k === 'node_modules/zone.js' || k.endsWith('/node_modules/zone.js'),
  );
  if (wDrzewie.length)
    throw new BladZoneless(
      'lock',
      `\`zone.js\` is installed in the dependency tree:\n` +
        wDrzewie.map((k) => `      ${k}`).join('\n') +
        `\n    It is an optional peer of \`@angular/core\`, so nothing breaks and nobody ` +
        `finds out — until someone imports it.`,
    );

  // 3. The built package. Points 1 and 2 watch the input, this one watches the output:
  // the only place that sees a trace brought in by anything other than `package.json`.
  //
  // The scan's own denominator comes first. The scan walks a directory while the list of
  // entrypoints comes from the `exports` map, a second source — so a change in the
  // ng-packagr output layout shows up as emptiness on one side of the comparison rather
  // than as a green run over nothing. Without it, a changed extension would be enough for
  // point 3 to stop reading anything, with nobody the wiser.
  const zeskanowane = new Set(bundle.map((b) => b.plik));
  const nieobjete = wejscia.filter((w) => !zeskanowane.has(w));
  if (nieobjete.length)
    throw new BladZoneless(
      'bundle',
      `the package scan missed ${nieobjete.length} files the \`exports\` map points at:\n` +
        nieobjete.map((w) => `      ${w}`).join('\n') +
        `\n    The rest of point 3 would run over a set without those files — that is, ` +
        `over nothing.`,
    );

  const trafienia = bundle.flatMap(({ plik, tekst }) =>
    SLADY.filter(([, wzorzec]) => wzorzec.test(tekst)).map(
      ([nazwa]) => `${plik}: ${nazwa}`,
    ),
  );
  if (trafienia.length)
    throw new BladZoneless(
      'bundle',
      `the built package holds a trace of the zone runtime:\n` +
        trafienia.map((t) => `      ${t}`).join('\n') +
        `\n    The consumer then gets a library that requires zones, though the package ` +
        `promises zoneless (req-api-foundation).`,
    );

  // 4. DENOMINATOR. Without this point, „every component" in point 5 means „every one
  // that happened to reach the package" — a sentence that is always true.
  if (!zrodla.length)
    throw new BladZoneless(
      'mianownik',
      `no \`@Component\` found in the sources (${PROJEKT}) — point 5 would then always ` +
        `pass, having nothing to measure. Usual cause: the decorator formatting the ` +
        `parser anchors on has changed.`,
    );

  const wPakiecie = new Map(komponenty.map((k) => [k.klasa, k]));
  const nieobecne = zrodla.filter((z) => !wPakiecie.has(z.klasa));
  if (nieobecne.length)
    throw new BladZoneless(
      'mianownik',
      `${nieobecne.length} components from the sources are not in the built package:\n` +
        nieobecne.map((z) => `      ${z.klasa}  (${z.plik})`).join('\n') +
        `\n    Point 5 would be computed WITHOUT them, so it says nothing about their ` +
        `change detection strategy. Remedy: export from the entrypoint's \`index.ts\`.`,
    );

  // 5. The measurement. `standalone` travels with `onPush`, because `req-api-foundation`
  // promises both and both are Angular v22+ defaults — promises of the same class.
  const wadliwe = komponenty.filter(
    (k) => k.onPush !== true || k.standalone !== true,
  );
  if (wadliwe.length)
    throw new BladZoneless(
      'onpush',
      `${wadliwe.length} components in the package do not meet the foundation:\n` +
        wadliwe
          .map(
            (k) =>
              `      ${k.klasa} (${k.wejscie}): onPush=${k.onPush}, standalone=${k.standalone}`,
          )
          .join('\n') +
        `\n    Either somebody set \`ChangeDetectionStrategy.Default\` explicitly, or ` +
        `Angular's defaults changed — either way the promise stopped being true.`,
    );

  // 6. Explicitness. The other side of the same rule: since the measurement watches the
  // VALUE, the source is not to restate the defaults (`lesson-11`). Without this point the
  // only guard over the notation would be code review.
  const jawne = zrodla.filter((z) => z.jawne?.length);
  if (jawne.length)
    throw new BladZoneless(
      'jawnosc',
      `${jawne.length} components explicitly set an option that is the default:\n` +
        jawne
          .map((z) => `      ${z.klasa} (${z.plik}): ${z.jawne.join(', ')}`)
          .join('\n') +
        `\n    The Angular guide forbids restating them in v22+ (req-api-foundation). ` +
        `Remove the entry from the decorator — the value is the same either way.`,
    );

  return (
    `${manifesty.length} manifests and ${pakietyLocka.length} locked packages free of \`zone.js\`, ` +
    `${bundle.length} package files with no trace of zones, ` +
    `${zrodla.length} components from the sources present in the package and all OnPush`
  );
};

// ── input from disk ───────────────────────────────────────────────────────────

const czytaj = (rel) => readFileSync(join(ROOT, rel), 'utf8');

/**
 * Manifests from the git index rather than from a hard-coded list: a new project is to be
 * covered by this gate from its first commit, with nobody having to remember to add it
 * here. The target's `inputs` name the same set with a pattern covering every
 * `package.json`.
 */
const manifestyRepo = () =>
  execSync('git ls-files', { cwd: ROOT, encoding: 'utf8' })
    .split('\n')
    // Exactly `package.json`, not „anything ending the same way": the pathspec
    // `*package.json` also pulls in `ng-package.json`, ng-packagr's configuration. That
    // one has no dependency fields, so it would give no false hit — but it would inflate
    // the denominator in the message and lie about the gate's reach on first reading.
    .filter((plik) => plik === 'package.json' || plik.endsWith('/package.json'))
    .map((plik) => ({ plik, ...JSON.parse(czytaj(plik)) }));

const pakietyLocka = () =>
  Object.keys(JSON.parse(czytaj('package-lock.json')).packages ?? {});

/**
 * The package's executable outputs. Source maps stay out of the set by themselves
 * (`.mjs.map` has the `.map` extension) and that is intended: they carry a copy of the
 * SOURCE, so a comment about zones would give a hit there that is not in the code.
 */
const KOD = new Set(['.mjs', '.js', '.cjs']);

const plikiPakietu = (dir, out = []) => {
  for (const nazwa of readdirSync(dir)) {
    const sciezka = join(dir, nazwa);
    if (statSync(sciezka).isDirectory()) plikiPakietu(sciezka, out);
    else if (KOD.has(extname(nazwa))) out.push(sciezka);
  }
  return out;
};

const bundlePakietu = () => {
  let sciezki;
  try {
    sciezki = plikiPakietu(join(ROOT, DIST));
  } catch {
    throw new BladZoneless(
      'bundle',
      `no built package in ${DIST} — run \`nx build components\` first`,
    );
  }
  return sciezki.map((s) => ({
    plik: relative(join(ROOT, DIST), s).split('\\').join('/'),
    tekst: readFileSync(s, 'utf8'),
  }));
};

/**
 * Components from the sources. The parser is simple, but its denominator is watched: the
 * number of parsed decorators has to match the number of `@Component(` occurrences at the
 * start of a line. A drift fires point 4 with a clear cause instead of quietly shrinking
 * the set of examined components.
 */
const zrodlaKomponentow = () => {
  const out = [];
  let deklaracji = 0;

  for (const plik of globSync(`${PROJEKT}/*/src/**/*.ts`, {
    cwd: ROOT,
  }).sort()) {
    if (plik.endsWith('.spec.ts')) continue;
    const tekst = czytaj(plik);
    deklaracji += (tekst.match(KOMPONENT_LICZNIK) ?? []).length;
    for (const [, cialo, klasa] of tekst.matchAll(KOMPONENT))
      out.push({
        plik: plik.split('\\').join('/'),
        klasa,
        jawne: OPCJE_DOMYSLNE.filter((opcja) =>
          new RegExp(`^\\s{2}${opcja}\\s*:`, 'm').test(cialo),
        ),
      });
  }

  if (out.length !== deklaracji)
    throw new BladZoneless(
      'mianownik',
      `the parser recognised ${out.length} of ${deklaracji} \`@Component\` decorators — ` +
        `the rest would drop out of the measurement without a trace. Usual cause: a ` +
        `decorator written otherwise than prettier formats it (\`@Component({\` and ` +
        `\`})\` in column zero).`,
    );

  return out;
};

/**
 * The package's entrypoints by the `exports` map — `[{ wejscie, plik }]`. One source for
 * two things at once: point 3's scan denominator and point 5's list of modules to load.
 */
const wejsciaPakietu = () =>
  Object.entries(JSON.parse(czytaj(`${DIST}/package.json`)).exports ?? {})
    .map(([wejscie, cel]) => ({
      wejscie,
      plik: typeof cel === 'object' ? cel.default : cel,
    }))
    .filter(({ plik }) => typeof plik === 'string' && plik.endsWith('.mjs'))
    .map(({ wejscie, plik }) => ({ wejscie, plik: plik.replace(/^\.\//, '') }));

/**
 * Component definitions from the BUILT package. `@angular/compiler` is loaded first,
 * because the package is partially compiled and `ɵcmp` appears only on access — the same
 * step the linker performs at the consumer's.
 */
const komponentyPakietu = async (wejscia) => {
  await import('@angular/compiler');
  const out = [];

  for (const { wejscie, plik } of wejscia) {
    const modul = await import(pathToFileURL(join(ROOT, DIST, plik)).href);
    for (const [nazwa, wartosc] of Object.entries(modul)) {
      if (typeof wartosc !== 'function') continue;
      if (!Object.getOwnPropertyDescriptor(wartosc, 'ɵcmp')) continue;
      const def = wartosc['ɵcmp'];
      out.push({
        klasa: nazwa,
        wejscie,
        onPush: def.onPush,
        standalone: def.standalone,
      });
    }
  }
  return out;
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
    manifesty: baza.manifesty,
    pakietyLocka: baza.pakietyLocka,
    bundle: baza.bundle,
    wejscia: baza.wejscia,
    zrodla: baza.zrodla,
    komponenty: baza.komponenty,
  });

  if (fx.dopiszZaleznosc) {
    const { plik, pole, wersja } = fx.dopiszZaleznosc;
    const manifest = wejscie.manifesty.find((m) => m.plik === plik);
    manifest[pole] = { ...manifest[pole], 'zone.js': wersja };
  }
  wejscie.pakietyLocka.push(...(fx.dopiszDoLocka ?? []));
  if (fx.dopiszDoBundla) wejscie.bundle[0].tekst += `\n${fx.dopiszDoBundla}\n`;
  if (fx.wyczyscBundle) wejscie.bundle = [];
  if (fx.wyczyscZrodla) wejscie.zrodla = [];
  wejscie.komponenty = wejscie.komponenty.filter(
    (k) => !(fx.usunZPakietu ?? []).includes(k.klasa),
  );
  for (const k of wejscie.komponenty) {
    if (fx.onPush?.[k.klasa] !== undefined) k.onPush = fx.onPush[k.klasa];
    if (fx.standalone?.[k.klasa] !== undefined)
      k.standalone = fx.standalone[k.klasa];
  }
  for (const z of wejscie.zrodla)
    if (fx.jawne?.[z.klasa]) z.jawne = fx.jawne[z.klasa];

  return wejscie;
};

// ── the run ───────────────────────────────────────────────────────────────────

const problems = [];
let opis = null;

try {
  const wejscia = wejsciaPakietu();
  opis = sprawdzZoneless({
    manifesty: manifestyRepo(),
    pakietyLocka: pakietyLocka(),
    bundle: bundlePakietu(),
    wejscia: wejscia.map((w) => w.plik),
    zrodla: zrodlaKomponentow(),
    komponenty: await komponentyPakietu(wejscia),
  });
} catch (blad) {
  if (!(blad instanceof BladZoneless)) throw blad;
  problems.push(`${blad.kontrola}: ${blad.message}`);
}

const przypadki = readdirSync(FIXTURES)
  .filter((n) => n.endsWith('.json') && n !== BAZA)
  .sort();

if (przypadki.length === 0)
  problems.push(
    `tools/check-zoneless.fixtures: no prepared inputs — a gate with no proof that it can ` +
      `fail is one more silent defect (req-quality-negative-control)`,
  );

// The reference input MUST pass. Were it defective itself, every case would fire
// because of it and not because of its own defect — every „it fired" would be false.
try {
  sprawdzZoneless(zlozFixture({}));
} catch (blad) {
  if (!(blad instanceof BladZoneless)) throw blad;
  problems.push(
    `${BAZA}: the reference input does NOT pass (${blad.kontrola}) — ` +
      `every prepared case now fires because of it.\n    ${blad.message}`,
  );
}

for (const nazwa of przypadki) {
  const fx = wczytajFixture(nazwa);
  try {
    sprawdzZoneless(zlozFixture(fx));
    problems.push(
      `${nazwa}: the prepared input PASSED and was meant not to — ` +
        `point ${fx.punkt} (\`${fx.kontrola}\`) stopped examining anything`,
    );
  } catch (blad) {
    if (!(blad instanceof BladZoneless)) throw blad;
    if (blad.kontrola !== fx.kontrola)
      problems.push(
        `${nazwa}: check \`${blad.kontrola}\` fired, and point ${fx.punkt} ` +
          `(\`${fx.kontrola}\`) was meant to — the fixture proves something other than what it declares`,
      );
  }
}

// ── result ────────────────────────────────────────────────────────────────────

if (problems.length) {
  console.error(`X Foundation gate — ${problems.length} violations:\n`);
  for (const p of problems) console.error(`  - ${p}`);
  console.error('');
  process.exit(1);
}

console.log(
  `✓ Foundation: ${opis}. Negative control: the reference input passes, ` +
    `${przypadki.length} prepared ones rejected on their own points.`,
);
