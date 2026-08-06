#!/usr/bin/env node
/**
 * Bramka pakietu: sprawdza, czy `dist/libs/components` da się zainstalować
 * i użyć — czyli czy wozi skórkę, a nie tylko kod.
 *
 * Powód istnienia (lesson-17 w wersji dla dystrybucji): build biblioteki
 * kończy się SUKCESEM także wtedy, gdy w pakiecie nie ma ani jednej definicji
 * tokenu. Komponenty odwołują się wtedy do `var(--pct-*)`, których nikt nie
 * deklaruje — przeglądarka po cichu bierze wartość początkową (`background`
 * przezroczyste, `border-color` = currentColor) i konsument dostaje kontrolki
 * bez wyglądu. Żaden test jednostkowy ani e2e tego nie widzi, bo one działają
 * na źródłach i na sandboxie, nie na spakowanym artefakcie.
 *
 * Sprawdzane jest sześć rzeczy:
 *  1. skórka jest w pakiecie (`themes/pct.css`, niepusta),
 *  2. jest osiągalna importem (`exports` w package.json),
 *  3. domknięcie tokenów: każdy `var(--pct-*)` użyty gdziekolwiek w pakiecie
 *     ma w tym pakiecie swoją deklarację,
 *  4. `PCT_VERSION` w kodzie zgadza się z `version` z manifestu,
 *  5. kolekcje `ng add` / `ng update` są w pakiecie, a ich fabryki wskazują na
 *     skompilowane pliki,
 *  6. manifest ma metadane wymagane do publikacji (tylko ostrzeżenie; przy
 *     `--release` blokuje).
 *
 * Punkt 3 jest tym, który faktycznie łapie regresję — warunki 1 i 2 spełni
 * też pusty plik albo skórka, z której ktoś usunął warstwę komponentową.
 *
 * Do tego siódmy przebieg, który nie bada pakietu, tylko TĘ BRAMKĘ: kontrola
 * odniesienia z `tools/check-package.fixtures/`. Spreparowane pakiety, z których
 * każdy łamie dokładnie jeden z sześciu punktów i musi zostać odrzucony przez
 * ten właśnie punkt. Bez niej bramka pilnująca sześciu obietnic sama nie miałaby
 * dowodu, że potrafi zapalić (`req-quality-negative-control`) — czyli byłaby dokładnie
 * tym, co opisuje `lesson-39`: bramką urodzoną martwą. Przebieg z `lesson-36`
 * (usunięcie `libs/tokens/dist` → build przechodzi, pakiet jest bez tokenów)
 * był ręczny, a ręczny przebieg nie istnieje między sesjami.
 *
 * Użycie:
 *   node libs/components/check-package.mjs             weryfikuje (CI)
 *   node libs/components/check-package.mjs --release   punkt 6 blokuje zamiast ostrzegać
 */
import {
  cpSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
} from 'node:fs';
import { basename, dirname, extname, join, relative } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const DIST = join(HERE, '../../dist/libs/components');
const FIXTURES = join(HERE, '../../tools/check-package.fixtures');
const BAZA = '_poprawny';
const THEME = 'themes/pct.css';

// Skanujemy tekstowe wyjścia pakietu. Style komponentów są w bundlach jako
// łańcuchy znaków, więc definicje z .scss trafiają tu razem z kodem.
const TEXT = new Set(['.css', '.scss', '.js', '.mjs', '.ts', '.json']);

const walk = (dir, out = []) => {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path, out);
    else if (TEXT.has(extname(name)) && !name.endsWith('.map')) out.push(path);
  }
  return out;
};

/**
 * Naruszenie jednej z sześciu kontroli. Niesie identyfikator kontroli, a nie
 * tylko komunikat, bo kontrola odniesienia musi sprawdzić, że spreparowany
 * pakiet zapalił NA SWOIM punkcie: fixture wywalający się z innego powodu niż
 * wpisany w `fixture.json` dowodzi czegoś innego, niż deklaruje — a to ta sama
 * cicha wada, przed którą stoi cała ta bramka.
 */
class BladPakietu extends Error {
  constructor(kontrola, opis) {
    super(opis);
    this.kontrola = kontrola;
  }
}

/**
 * Komplet kontroli na katalogu `ROOT`. Rzuca `BladPakietu` przy pierwszym
 * naruszeniu — kontrole idą od najbardziej podstawowej, więc dalsze i tak
 * nie miałyby czego badać. Zwraca zdanie podsumowujące.
 */
const kontrole = (ROOT, { release }, ostrzezenia) => {
  const fail = (kontrola, msg) => {
    throw new BladPakietu(kontrola, msg);
  };

  let files;
  try {
    files = walk(ROOT);
  } catch {
    fail(
      'pakiet',
      `brak zbudowanego pakietu w ${ROOT} — uruchom najpierw \`nx build components\``,
    );
  }

  // 1. skórka jest w pakiecie
  const themePath = join(ROOT, THEME);
  let theme = '';
  try {
    theme = readFileSync(themePath, 'utf8');
  } catch {
    fail(
      'skorka',
      `pakiet nie zawiera ${THEME} — konsument dostanie komponenty bez ani jednego tokenu.\n` +
        `  Sprawdz \`assets\` w libs/components/ng-package.json oraz to, czy tokens:build wykonal sie przed build.`,
    );
  }
  if (!theme.includes('--pct-'))
    fail('skorka', `${THEME} nie zawiera zadnej definicji tokenu`);

  // 2. skórka jest osiągalna importem. Mapa `exports` jest zamknięta: plik obecny
  // w pakiecie, ale bez wpisu, jest dla konsumenta niewidoczny
  // (ERR_PACKAGE_PATH_NOT_EXPORTED). Wpis może być dosłowny albo z gwiazdką.
  let pkg;
  try {
    pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
  } catch {
    fail('pakiet', `pakiet nie ma czytelnego manifestu (${ROOT}/package.json)`);
  }
  const exposed = Object.keys(pkg.exports ?? {});
  const themeKey = './' + THEME;
  const covers = (pattern) => {
    const star = pattern.indexOf('*');
    if (star === -1) return pattern === themeKey;
    return (
      themeKey.startsWith(pattern.slice(0, star)) &&
      themeKey.endsWith(pattern.slice(star + 1))
    );
  };
  if (!exposed.some(covers)) {
    fail(
      'exports',
      `${THEME} jest w pakiecie, ale nie w mapie \`exports\` — \`import '@pacit/components/${THEME}'\`\n` +
        `  poleci ERR_PACKAGE_PATH_NOT_EXPORTED. Widoczne wejscia: ${exposed.join(', ')}`,
    );
  }

  // 3. domknięcie tokenów: użycie ⊆ deklaracje
  const USED = /var\(\s*(--pct-[a-z0-9-]+)/gi;
  const DEFINED = /(--pct-[a-z0-9-]+)\s*:/g;

  const used = new Map(); // token -> pliki, w których go użyto
  const defined = new Set();

  for (const path of files) {
    const text = readFileSync(path, 'utf8');
    const where = relative(ROOT, path);
    for (const [, name] of text.matchAll(USED)) {
      if (!used.has(name)) used.set(name, new Set());
      used.get(name).add(where);
    }
    for (const [, name] of text.matchAll(DEFINED)) defined.add(name);
  }

  const missing = [...used.keys()].filter((t) => !defined.has(t)).sort();
  if (missing.length) {
    fail(
      'tokeny',
      `${missing.length} tokenow jest uzywanych, ale nigdzie w pakiecie niezadeklarowanych.\n` +
        `  Przegladarka podstawi za nie wartosc poczatkowa — komponent wyrenderuje sie bez wygladu.\n` +
        missing
          .map(
            (t) => `  - ${t}  (uzyty w: ${[...used.get(t)].sort().join(', ')})`,
          )
          .join('\n'),
    );
  }

  // 4. wersja w kodzie == wersja w manifeście. `PCT_VERSION` jest generowane
  // przez `stamp-version.mjs`, ale generator **nie jest** zależnością builda —
  // inaczej artefakt zawsze by się zgadzał i ta kontrola nic by nie badała.
  // `nx release version` podbija sam manifest, więc bez niej pierwsze wydanie
  // wypuściłoby pakiet, który kłamie o własnej wersji. Brak stałej jest błędem
  // tak samo jak zła wartość: znaczy, że zmienił się kształt wyjścia i kontrola
  // przestała cokolwiek sprawdzać.
  const VERSION_CONST = /PCT_VERSION\s*=\s*['"]([^'"]+)['"]/;
  const stamped = files
    .map((path) => readFileSync(path, 'utf8').match(VERSION_CONST)?.[1])
    .filter((v) => v !== undefined);

  if (stamped.length === 0) {
    fail(
      'wersja',
      `nie znaleziono stalej PCT_VERSION w zbudowanym pakiecie — kontrola wersji przestala dzialac.\n` +
        `  Sprawdz, czy stala nadal jest eksportowana z libs/components/src/index.ts.`,
    );
  }
  const wrong = [...new Set(stamped)].filter((v) => v !== pkg.version);
  if (wrong.length) {
    fail(
      'wersja',
      `PCT_VERSION (${wrong.join(', ')}) nie zgadza sie z wersja pakietu (${pkg.version}).\n` +
        `  Uruchom: npx nx stamp-version components  (a potem przebuduj pakiet)`,
    );
  }

  // 5. `ng add` i `ng update` są osiągalne. Manifest wskazuje na kolekcje
  // plikami, a te powstają w osobnym kroku (`nx schematics components`) już PO
  // ng-packagr — czyli w miejscu, które łatwo pominąć. Sam wpis w manifeście
  // niczego nie gwarantuje: gdy pliku nie ma, `ng add @pacit/components`
  // wywala się u konsumenta na „Collection not found", a biblioteka wygląda
  // na zepsutą przy pierwszej komendzie, jaką ktoś wpisze.
  for (const [field, pointer] of [
    ['schematics', pkg.schematics],
    ['ng-update.migrations', pkg['ng-update']?.migrations],
  ]) {
    if (!pointer) {
      fail(
        'schematics',
        `manifest nie ma pola \`${field}\` — \`ng add\`/\`ng update\` nie zadzialaja.`,
      );
    }
    let collection;
    try {
      collection = JSON.parse(readFileSync(join(ROOT, pointer), 'utf8'));
    } catch {
      fail(
        'schematics',
        `\`${field}\` wskazuje na ${pointer}, ktorego w pakiecie nie ma.\n` +
          `  Uruchom: npx nx schematics components`,
      );
    }
    // Fabryka musi istnieć jako skompilowany plik — wpis w kolekcji wskazuje
    // ścieżkę TS-a sprzed builda tak samo chętnie jak istniejący JS.
    for (const [name, def] of Object.entries(collection.schematics ?? {})) {
      const factory = String(def.factory ?? '').split('#')[0];
      const resolved = join(ROOT, dirname(pointer), `${factory}.js`);
      try {
        statSync(resolved);
      } catch {
        fail(
          'schematics',
          `schematic \`${name}\` z \`${field}\` wskazuje na ${factory}, ` +
            `ale ${relative(ROOT, resolved)} nie istnieje w pakiecie.`,
        );
      }
    }
  }

  // 6. metadane wymagane do publikacji. Osobna surowość, bo to jedyny warunek,
  // którego nie da się spełnić kodem: `repository` musi wskazywać realne
  // repozytorium, a npm **odmawia** wystawienia provenance, gdy go brakuje albo
  // gdy nie zgadza się z repozytorium, z którego leci publikacja. Dopóki projekt
  // nie ma zdalnego repozytorium, brak tego pola nie jest błędem budowania —
  // jest brakiem gotowości do wydania, więc na co dzień tylko ostrzega,
  // a blokuje dopiero przy `--release`.
  const REQUIRED_META = {
    description:
      'npm pokazuje ten opis na stronie pakietu i w wynikach wyszukiwania',
    license: 'bez niego npm oznacza pakiet jako UNLICENSED',
    repository:
      'wymagane przez `npm publish --provenance`; musi wskazywać repozytorium, z ktorego leci publikacja',
  };

  const missingMeta = Object.entries(REQUIRED_META).filter(
    ([key]) => !pkg[key],
  );
  if (missingMeta.length) {
    const list = missingMeta
      .map(([key, why]) => `  - ${key}  (${why})`)
      .join('\n');
    if (release) {
      fail(
        'metadane',
        `manifest pakietu nie ma pol wymaganych do publikacji:\n${list}\n` +
          `  Uzupelnij libs/components/package.json.`,
      );
    }
    ostrzezenia.push(
      `Pakiet zbuduje sie i zadziala, ale NIE jest gotowy do publikacji — brakuje:\n${list}`,
    );
  }

  return (
    `${THEME} obecny i wyeksportowany, ` +
    `${used.size} uzytych tokenow ma pokrycie w ${defined.size} deklaracjach, ` +
    `PCT_VERSION = ${pkg.version}`
  );
};

/**
 * Kontrole na katalogu `root` bez kończenia procesu — dzięki temu ten sam kod
 * biegnie dwa razy: raz na prawdziwym `dist`, raz na każdym spreparowanym
 * pakiecie z kontroli odniesienia. Bramka, która sama kończy proces, dałaby
 * się sprawdzić tylko przez podproces i wyjście po numerze — czyli tak, żeby
 * fixture zapalający z niewłaściwego powodu wyglądał na dowód.
 */
const sprawdzPakiet = (root, { release = false } = {}) => {
  const ostrzezenia = [];
  try {
    return {
      blad: null,
      ostrzezenia,
      opis: kontrole(root, { release }, ostrzezenia),
    };
  } catch (e) {
    if (!(e instanceof BladPakietu)) throw e;
    return { blad: e, ostrzezenia, opis: null };
  }
};

/**
 * Składa spreparowany pakiet: kopia bazy, na nią pliki przypadku, na końcu
 * usunięcia z `fixture.json`. Dzięki temu katalog przypadku zawiera WYŁĄCZNIE
 * wadę, a nie kolejny egzemplarz poprawnego pakietu, w którym trzeba jej
 * szukać — i nie rozjeżdża się z bazą, gdy kształt pakietu się zmieni.
 *
 * Manifest leży w repozytorium jako `manifest.json` i dopiero tutaj staje się
 * `package.json`. Powód jest twardy: prawdziwy `package.json` w drzewie
 * repozytorium **jest dla Nx projektem** — graf dostawał widmowy projekt
 * `@pacit/components` o korzeniu w fixtures, w dodatku w trzech egzemplarzach
 * o tej samej nazwie. Naturalne obejście (`.nxignore`) naprawia to i psuje coś
 * gorszego: katalog znika z mapy plików, więc `inputs` targetu przestają go
 * widzieć i osłabienie fixture'a NIE unieważnia cache. Bramka świeciłaby wtedy
 * na zielono z cache'a, nie sprawdziwszy niczego — czyli sama kontrola
 * odniesienia stałaby się cichą wadą (`req-axis`).
 */
const zlozFixture = (nazwa, fx) => {
  const cel = mkdtempSync(join(tmpdir(), 'pct-check-package-'));
  cpSync(join(FIXTURES, BAZA), cel, { recursive: true });
  cpSync(join(FIXTURES, nazwa), cel, {
    recursive: true,
    filter: (src) => basename(src) !== 'fixture.json',
  });
  renameSync(join(cel, 'manifest.json'), join(cel, 'package.json'));
  for (const sciezka of fx.usun ?? [])
    rmSync(join(cel, sciezka), { recursive: true, force: true });
  return cel;
};

// ── pakiet ────────────────────────────────────────────────────────────────────

const RELEASE_MODE = process.argv.includes('--release');
const problems = [];

const wynik = sprawdzPakiet(DIST, { release: RELEASE_MODE });
if (wynik.blad) problems.push(`${wynik.blad.kontrola}: ${wynik.blad.message}`);
for (const o of wynik.ostrzezenia) console.warn(`! ${o}`);

// ── kontrola odniesienia ──────────────────────────────────────────────────────

const przypadki = readdirSync(FIXTURES, { withFileTypes: true })
  .filter((d) => d.isDirectory() && d.name !== BAZA)
  .map((d) => d.name)
  .sort();

if (przypadki.length === 0)
  problems.push(
    `tools/check-package.fixtures: brak spreparowanych pakietow — bramka bez dowodu, ` +
      `ze potrafi nie przejsc, jest kolejna cicha wada (req-quality-negative-control)`,
  );

// Pakiet wzorcowy MUSI przejsc, i to w trybie `--release`. Bez tego cała kontrola
// jest bezwartościowa: gdyby baza sama była wadliwa, każdy przypadek padałby z jej
// powodu, a nie z powodu swojej wady — i wszystkie „zapaliło" byłyby fałszywe.
// Baza idzie przez ten sam składacz co przypadki, więc jest badana dokładnie
// w tej postaci, w której się z niej wyrasta.
{
  const katalog = zlozFixture(BAZA, {});
  const baza = sprawdzPakiet(katalog, { release: true });
  rmSync(katalog, { recursive: true, force: true });
  if (baza.blad)
    problems.push(
      `${BAZA}: pakiet wzorcowy NIE przechodzi (${baza.blad.kontrola}) — ` +
        `kazdy spreparowany pakiet zapala teraz z jego powodu, nie z powodu swojej wady.\n` +
        `  ${baza.blad.message}`,
    );
  else if (baza.ostrzezenia.length)
    problems.push(
      `${BAZA}: pakiet wzorcowy przechodzi, ale z ostrzezeniem — ` +
        `baza ma byc kompletna, inaczej punkt 6 nie ma czym odroznic braku od kompletu.`,
    );
}

for (const nazwa of przypadki) {
  const fx = JSON.parse(
    readFileSync(join(FIXTURES, nazwa, 'fixture.json'), 'utf8'),
  );
  const katalog = zlozFixture(nazwa, fx);
  try {
    const wynikFx = sprawdzPakiet(katalog, { release: true });
    if (!wynikFx.blad)
      problems.push(
        `${nazwa}: spreparowany pakiet PRZESZEDL, a mial nie przejsc — ` +
          `punkt ${fx.punkt} (\`${fx.kontrola}\`) przestal cokolwiek badac`,
      );
    else if (wynikFx.blad.kontrola !== fx.kontrola)
      problems.push(
        `${nazwa}: zapalila kontrola \`${wynikFx.blad.kontrola}\`, a miala punkt ${fx.punkt} ` +
          `(\`${fx.kontrola}\`) — fixture dowodzi czegos innego, niz deklaruje`,
      );

    // Punkt 6 jako jedyny ma dwa tryby, więc jego fixture bada oba: przy
    // `--release` blokuje, na co dzień tylko ostrzega. Sama asercja „blokuje"
    // przepuściłaby regresję, w której punkt 6 zaczyna blokować zawsze —
    // a wtedy repozytorium bez zdalnego nie zbudowałoby się w ogóle.
    if (fx.tylkoPrzyRelease) {
      const zwykly = sprawdzPakiet(katalog, { release: false });
      if (zwykly.blad)
        problems.push(
          `${nazwa}: w zwyklym przebiegu bramka BLOKUJE (${zwykly.blad.kontrola}), ` +
            `a miala tylko ostrzec — blokada nalezy do \`--release\``,
        );
      else if (zwykly.ostrzezenia.length === 0)
        problems.push(
          `${nazwa}: w zwyklym przebiegu ani bledu, ani ostrzezenia — ` +
            `brak metadanych przechodzi bez sladu`,
        );
    }
  } finally {
    rmSync(katalog, { recursive: true, force: true });
  }
}

// ── wynik ─────────────────────────────────────────────────────────────────────

if (problems.length) {
  console.error(`X Bramka pakietu — ${problems.length} naruszen:\n`);
  for (const p of problems) console.error(`  - ${p}`);
  console.error('');
  process.exit(1);
}

console.log(
  `✓ Pakiet kompletny: ${wynik.opis}. ` +
    `Kontrola odniesienia: pakiet wzorcowy przechodzi, ` +
    `${przypadki.length} spreparowanych odrzuconych na swoich punktach.`,
);
