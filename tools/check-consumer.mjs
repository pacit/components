#!/usr/bin/env node
/**
 * Bramka konsumenta: sprawdza, czy pakiet da się WZIĄĆ Z REJESTRU i użyć
 * (`req-quality-consumer`).
 *
 * Powód istnienia: `check-package` bada `dist/libs/components` STATYCZNIE — czyta pliki
 * i pyta, czy są. To za mało z dwóch powodów naraz. Po pierwsze `dist` nie jest tym, co
 * dostaje konsument: między katalogiem a jego `node_modules` stoi `npm pack` (pole `files`,
 * `.npmignore`) i rejestr, więc plik obecny w `dist` potrafi nie dojechać. Po drugie
 * „plik istnieje" nie znaczy „plik działa" — i to nie jest teoretyczne: `ng add
 * @pacit/components`, pierwsza komenda, jaką konsument wpisuje, wywracała się na
 * `exports is not defined in ES module scope`, bo manifest pakietu niesie
 * `"type": "module"`, a schematics są CommonJS-em. `check-package` widział wtedy komplet:
 * kolekcja wskazuje fabrykę, plik fabryki jest w pakiecie. Był i nie dawał się wczytać.
 *
 * Bramka odtwarza więc drogę konsumenta w całości: `npm pack` → publikacja do lokalnego
 * rejestru (Verdaccio) → `npm install @pacit/components` PO NAZWIE → `ng add` →
 * build aplikacji z SSR → serwer → jeden przebieg w przeglądarce. To maszynowa postać
 * [`lesson-36`](../docs/lessons.md#lesson-36): „zielony build nie jest dowodem, że artefakt
 * da się użyć".
 *
 * Sprawdzane jest siedem rzeczy:
 *   1. `tarball`     — `npm pack` daje archiwum, a w nim jest skórka, każdy plik z mapy
 *                      `exports` i każda fabryka schematica,
 *   2. `rejestr`     — publikacja się udała, a rejestr serwuje DOKŁADNIE to archiwum
 *                      (ta sama suma) i robi to Z LOKALNEGO adresu, nie z uplinku npmjs,
 *   3. `instalacja`  — instalacja PO NAZWIE wciąga naszą wersję, a aplikacja rozwiązuje
 *                      `@pacit/components` do WŁASNEGO `node_modules`,
 *   4. `ng-add`      — schematic z ZAINSTALOWANEGO pakietu daje się uruchomić i dopina
 *                      skórkę do konfiguracji builda,
 *   5. `build`       — aplikacja buduje się z SSR, a w jej bundlach jest biblioteka
 *                      i są deklaracje tokenów,
 *   6. `ssr`         — zbudowany serwer renderuje komponent PO STRONIE SERWERA,
 *   7. `e2e`         — przeglądarka widzi przycisk pomalowany tokenem ze skórki,
 *                      bez ani jednego błędu w konsoli.
 *
 * Punkty 6 i 7 są sednem obietnicy. Punkty 1–5 są w większości MIANOWNIKIEM: pomiar,
 * w którym aplikacja nie wciągnęła biblioteki, przechodzi każdą asercję o jej zachowaniu,
 * bo nie ma czego zauważyć — a wygląda przy tym na dowód (ta sama wada co w A8).
 *
 * Do tego ósmy przebieg, który nie bada pakietu, tylko TĘ BRAMKĘ: kontrola odniesienia
 * z `tools/check-consumer.fixtures/` (`req-quality-negative-control`).
 *
 * Czego bramka świadomie NIE robi: nie instaluje `peerDependencies` z rejestru. Aplikacja
 * bierze `@angular/*` z `node_modules` repozytorium przez wyszukiwanie w górę drzewa —
 * tak samo jak sonda buildera w `check-bundle` i z tego samego powodu: mierzymy TEN pakiet,
 * a nie to, czy npmjs dziś odpowiada. Cena jest zapisana wprost: rozjazd zakresu wersji
 * w `peerDependencies` przejdzie tę bramkę. Pilnuje go `req-project-dependencies` (B7).
 *
 * Użycie:
 *   node tools/check-consumer.mjs
 *   node tools/check-consumer.mjs --zostaw           nie kasuje katalogu roboczego
 *   node tools/check-consumer.mjs --zapisz-wzorzec   przepisuje `_poprawny.json` pomiarem
 */
import { execFileSync, spawn } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { createRequire } from 'node:module';
import { createServer } from 'node:net';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = 'dist/libs/components';
const PAKIET = '@pacit/components';
const FIXTURES = join(ROOT, 'tools/check-consumer.fixtures');
const BAZA = '_poprawny.json';
const PRACA = join(ROOT, 'tmp/check-consumer');
const ZOSTAW = process.argv.includes('--zostaw');
const WZORZEC = process.argv.includes('--zapisz-wzorzec');

/** Skórka. Ta sama stała co w `check-package`, bo to ten sam plik po drugiej stronie. */
const SKORKA = 'themes/pct.css';

/**
 * Ślady biblioteki w bundlu aplikacji i w wyrenderowanym HTML-u.
 *
 * Zmierzone, nie założone: selektor, który aplikacja wpisuje sama (`pctButton`
 * w `<button pctButton>`), markerem być NIE MOŻE. Dyrektywa atrybutowa, która przestała
 * pasować, nie jest w Angularze błędem — atrybut zostaje statycznym atrybutem elementu.
 * Policzone w bundlu tej samej aplikacji, raz z `imports: [PctButton]` i raz bez niego:
 * `pctButton` 2 → **1**, `pct-button` 33 → 0, `data-pct-part` 2 → 0. Marker wzięty
 * z selektora byłby więc niezerowy dokładnie wtedy, gdy biblioteki w bundlu nie ma
 * w ogóle. Musi pochodzić z KODU BIBLIOTEKI: `pct-button` jest klasą z bloku `host`,
 * a `data-pct-part` — publicznym API stylowania (`req-api-parts`). Żadnego z nich
 * aplikacja nie pisze.
 */
const MARKERY = ['data-pct-part', 'pct-button'];

/** Token, którym biblioteka maluje tło przycisku. Jedna liczba mierzona po obu stronach. */
const TOKEN_TLA = '--pct-button-bg';

/** Wartość początkowa `background-color` — to, co zostaje po nierozwiązanym `var()`. */
const TLO_POCZATKOWE = 'rgba(0, 0, 0, 0)';

/**
 * Naruszenie jednej z siedmiu kontroli. Niesie identyfikator kontroli ORAZ reguły:
 * punkt to nie jedno zdanie, a kontrola odniesienia porównująca sam punkt przepuszcza
 * przypadek, który zapalił na sąsiedniej regule tego samego punktu — zmierzone w A12
 * i potwierdzone w A11 ([`lesson-50`](../docs/lessons.md#lesson-50)).
 */
class BladKonsumenta extends Error {
  constructor(kontrola, regula, opis) {
    super(opis);
    this.kontrola = kontrola;
    this.regula = regula;
  }
}

const lista = (xs) => [...xs].sort().join(', ') || '(pusto)';

// ── kontrole ──────────────────────────────────────────────────────────────────

/**
 * Komplet kontroli na gotowym pomiarze. Rzuca `BladKonsumenta` przy pierwszym naruszeniu;
 * zwraca zdanie podsumowujące.
 *
 * Każda reguła czyta pomiar DEFENSYWNIE, mimo że poprzednia „już to sprawdziła".
 * Zależność między regułami jest normalna; zapisanie jej tak, że rozbrojenie poprzedniej
 * zamienia bramkę w `TypeError`, nie jest — bo wtedy kontrola odniesienia przestaje umieć
 * zbadać regułę, którą miała zbadać. Ta sama wada wyszła w A3, A4, A7, A8, A11 i A12,
 * sześć razy z rzędu.
 */
const sprawdzKonsumenta = (we) => {
  const fail = (kontrola, regula, opis) => {
    throw new BladKonsumenta(kontrola, regula, opis);
  };

  // ── 1. tarball ──────────────────────────────────────────────────────────────
  // To, co `npm pack` naprawdę zapakował. `check-package` chodzi po katalogu `dist`,
  // a między nim a `node_modules` konsumenta stoi filtr (`files`, `.npmignore`) —
  // plik obecny w `dist` i nieobecny w archiwum jest dla tamtej bramki niewidzialny,
  // a dla konsumenta fatalny.
  const tarball = we.tarball ?? {};
  const pliki = new Set(tarball.pliki ?? []);
  if (pliki.size === 0)
    fail(
      'tarball',
      'pusty',
      `\`npm pack ${DIST}\` nie wypisał ani jednego pliku — wszystkie dalsze punkty ` +
        `przeszłyby wtedy zawsze, bo nie mają czego szukać`,
    );

  if (!pliki.has(SKORKA))
    fail(
      'tarball',
      'brak-skorki',
      `archiwum nie zawiera \`${SKORKA}\`, choć plik jest w \`${DIST}\` — czyli ` +
        `odfiltrował go \`npm pack\` (pole \`files\` albo \`.npmignore\`).\n` +
        `    Konsument dostanie komponenty odwołujące się do tokenów, których nikt ` +
        `nie deklaruje (lesson-36), a \`check-package\` tego nie zobaczy: on czyta katalog`,
    );

  if (!pliki.has('LICENSE'))
    fail(
      'tarball',
      'brak-licencji',
      `archiwum nie zawiera pliku \`LICENSE\`, choć jest w \`${DIST}\` — odfiltrował go ` +
        `\`npm pack\`.\n` +
        `    \`"license"\` w manifeście bez pliku to licencja formalnie niepełna, ` +
        `a \`check-package\` tego nie zobaczy: on czyta katalog, nie archiwum`,
    );

  const manifest = tarball.manifest ?? {};
  const zExports = Object.values(manifest.exports ?? {})
    .map((cel) => (typeof cel === 'object' ? cel?.default : cel))
    .filter((p) => typeof p === 'string' && !p.includes('*'))
    .map((p) => p.replace(/^\.\//, ''));
  const brakZExports = zExports.filter((p) => !pliki.has(p));
  if (brakZExports.length)
    fail(
      'tarball',
      'brak-entrypointu',
      `mapa \`exports\` obiecuje pliki, których w archiwum nie ma: ` +
        `${lista(brakZExports)}.\n` +
        `    Import takiego wejścia kończy się u konsumenta ERR_MODULE_NOT_FOUND`,
    );

  const wskazaneKolekcje = [
    manifest.schematics,
    manifest['ng-update']?.migrations,
  ].filter((p) => typeof p === 'string');
  const brakKolekcji = wskazaneKolekcje
    .map((p) => p.replace(/^\.\//, ''))
    .filter((p) => !pliki.has(p));
  const brakFabryk = (tarball.fabryki ?? []).filter((p) => !pliki.has(p));
  if (brakKolekcji.length || brakFabryk.length)
    fail(
      'tarball',
      'brak-schematica',
      `archiwum nie zawiera plików, na które wskazuje manifest:\n` +
        (brakKolekcji.length
          ? `      kolekcje: ${lista(brakKolekcji)}\n`
          : '') +
        (brakFabryk.length ? `      fabryki: ${lista(brakFabryk)}\n` : '') +
        `    \`ng add\`/\`ng update\` wywalą się u konsumenta na „Collection not found"`,
    );

  // ── 2. rejestr ──────────────────────────────────────────────────────────────
  // Publikacja i to, co rejestr potem serwuje. Punkt istnieje przez UPLINK: konfiguracja
  // Verdaccio proxuje npmjs, więc nieudana publikacja NIE kończy się błędem instalacji —
  // kończy się zaciągnięciem cudzego pakietu o tej nazwie. Dziś `@pacit/components`
  // na npmjs nie ma; od pierwszego wydania (B2) będzie i wtedy bramka bez tego punktu
  // badałaby artefakt sprzed wydania, wyglądając na zieloną.
  const rejestr = we.rejestr ?? {};
  if (!rejestr.opublikowany)
    fail(
      'rejestr',
      'publikacja',
      `\`npm publish\` do lokalnego rejestru się nie udał.\n` +
        `    ${rejestr.wyjscie ?? '(bez wyjścia)'}`,
    );

  const metadane = rejestr.metadane;
  if (!metadane || !(metadane.wersje ?? []).includes(tarball.wersja))
    fail(
      'rejestr',
      'wersja',
      `rejestr nie serwuje wersji \`${tarball.wersja}\` — zna: ` +
        `${lista(metadane?.wersje ?? [])}`,
    );

  if (metadane?.integrity !== tarball.integrity)
    fail(
      'rejestr',
      'integralnosc',
      `rejestr serwuje INNE archiwum, niż spakowaliśmy:\n` +
        `      spakowane: ${tarball.integrity}\n` +
        `      z rejestru: ${metadane.integrity}\n` +
        `    Najczęstsza przyczyna: odpowiedź przyszła z uplinku npmjs, a nie z publikacji`,
    );

  if (!String(metadane?.tarball ?? '').startsWith(rejestr.url ?? '\0'))
    fail(
      'rejestr',
      'nie-lokalny',
      `adres archiwum (\`${metadane?.tarball}\`) nie zaczyna się od lokalnego rejestru ` +
        `(\`${rejestr.url}\`) — mierzylibyśmy cudzy pakiet`,
    );

  // ── 3. instalacja ───────────────────────────────────────────────────────────
  const instalacja = we.instalacja ?? {};
  const wpis = instalacja.wpis;
  if (!wpis)
    fail(
      'instalacja',
      'brak-wpisu',
      `po \`npm install ${PAKIET}\` nie ma wpisu \`node_modules/${PAKIET}\` w pliku ` +
        `blokady aplikacji — instalacja nie doszła do skutku`,
    );

  // `wpis?.` mimo że reguła wyżej „już sprawdziła", że wpis istnieje. Rozbrojenie tamtej
  // dawało tu `TypeError` zamiast komunikatu — SIÓDMY raz ta sama wada w tym repozytorium
  // (A3, A4, A7, A8, A11, A12), tym razem w bramce pisanej ze świadomością sześciu
  // poprzednich i z akapitem o niej w nagłówku. Zależność między regułami jest normalna;
  // zapisanie jej tak, że rozbrojenie poprzedniej gasi komunikat następnej, nie jest.
  if (!String(wpis?.resolved ?? '').startsWith(rejestr.url ?? '\0'))
    fail(
      'instalacja',
      'spoza-rejestru',
      `zainstalowany pakiet przyszedł spoza lokalnego rejestru:\n` +
        `      resolved: ${wpis?.resolved}\n` +
        `      rejestr: ${rejestr.url}`,
    );

  if (wpis?.integrity !== tarball.integrity)
    fail(
      'instalacja',
      'inna-integralnosc',
      `zainstalowane archiwum nie jest tym, które spakowaliśmy:\n` +
        `      spakowane: ${tarball.integrity}\n` +
        `      zainstalowane: ${wpis?.integrity}`,
    );

  // MIANOWNIK rozwiązywania modułów. Aplikacja stoi w `tmp/` repozytorium, żeby
  // `@angular/*` znalazło się przez wyszukiwanie w górę drzewa — a to samo wyszukiwanie
  // znalazłoby tam kiedyś `@pacit/components`, gdyby ktoś je zainstalował w korzeniu.
  // Cała bramka mierzyłaby wtedy pakiet, którego nie opublikowała.
  const rozwiazanie = instalacja.rozwiazanie;
  const wAplikacji = `${instalacja.katalog ?? '\0'}/node_modules/`;
  if (!rozwiazanie || !String(rozwiazanie).startsWith(wAplikacji))
    fail(
      'instalacja',
      'spoza-aplikacji',
      `aplikacja rozwiązuje \`${PAKIET}/button\` do \`${rozwiazanie}\`, a to jest poza ` +
        `jej własnym \`node_modules\` (\`${wAplikacji}\`) — mierzylibyśmy inny pakiet ` +
        `niż zainstalowany`,
    );

  // ── 4. ng add ───────────────────────────────────────────────────────────────
  // Schematic z ZAINSTALOWANEGO pakietu, uruchomiony przez prawdziwe Angular CLI.
  // `check-package` pyta, czy plik fabryki istnieje; ten punkt pyta, czy da się go
  // wczytać i czy coś robi. Różnica między tymi pytaniami kosztowała tę bibliotekę
  // wywrotkę przy pierwszej komendzie konsumenta.
  const ngAdd = we.ngAdd ?? {};
  if (ngAdd.kod !== 0)
    fail(
      'ng-add',
      'schematic-padl',
      `schematic \`${PAKIET}:ng-add\` zakończył się kodem ${ngAdd.kod}.\n` +
        `    ${(ngAdd.wyjscie ?? '(bez wyjścia)').split('\n').slice(0, 6).join('\n    ')}`,
    );

  const przed = ngAdd.stylePrzed ?? [];
  const po = ngAdd.stylePo ?? [];
  if (po.length <= przed.length)
    fail(
      'ng-add',
      'bez-zmiany',
      `schematic przeszedł, ale lista \`styles\` się nie zmieniła (${przed.length} → ` +
        `${po.length}) — \`ng add\` skończyło się instrukcją do wykonania ręcznie ` +
        `albo cichym brakiem zmiany`,
    );

  if (!po.some((s) => String(s).includes(PAKIET)))
    fail(
      'ng-add',
      'brak-skorki-w-stylach',
      `po \`ng add\` w \`styles\` nie ma ani jednego wpisu z \`${PAKIET}\`: ` +
        `${lista(po)}.\n` +
        `    Bez skórki komponenty renderują się bez wyglądu i nikt tego nie zauważy ` +
        `(lesson-36)`,
    );

  // ── 5. build ────────────────────────────────────────────────────────────────
  const build = we.build ?? {};
  if (build.kod !== 0)
    fail(
      'build',
      'build-padl',
      `build aplikacji konsumenta zakończył się kodem ${build.kod}.\n` +
        `    ${(build.wyjscie ?? '(bez wyjścia)').split('\n').slice(-8).join('\n    ')}`,
    );

  if (!build.serwer)
    fail(
      'build',
      'brak-serwera',
      `w wyjściu builda nie ma bundla serwera — aplikacja zbudowała się BEZ SSR, ` +
        `a obietnica mówi o buildzie z SSR`,
    );

  const brakMarkerow = MARKERY.filter((m) => !(build.markery ?? {})[m]);
  if (brakMarkerow.length)
    fail(
      'build',
      'biblioteka-nieobecna',
      `w bundlu przeglądarki nie ma śladów biblioteki: ${lista(brakMarkerow)}.\n` +
        `    To jest MIANOWNIK: aplikacja, która nie wciągnęła biblioteki, przechodzi ` +
        `każdą asercję o jej zachowaniu, bo nie ma czego zauważyć`,
    );

  if (!(build.tokenyWCss > 0))
    fail(
      'build',
      'skorka-nieobecna',
      `arkusz aplikacji nie ma ani jednej deklaracji \`--pct-*\` ` +
        `(policzone: ${build.tokenyWCss}).\n` +
        `    Skórka nie dojechała do builda — dokładnie stan z lesson-36, tylko ` +
        `u konsumenta`,
    );

  // ── 6. ssr ──────────────────────────────────────────────────────────────────
  const ssr = we.ssr ?? {};
  if (ssr.status !== 200)
    fail(
      'ssr',
      'status',
      `serwer aplikacji odpowiedział ${ssr.status ?? '(brak odpowiedzi)'} zamiast 200.\n` +
        `    ${(ssr.tresc ?? '').slice(0, 300)}`,
    );

  if (ssr.kontekst !== 'ssr')
    fail(
      'ssr',
      'bez-renderu',
      `odpowiedź ma \`ng-server-context="${ssr.kontekst}"\`, a nie \`"ssr"\` — treść ` +
        `przyszła z pliku statycznego, więc bundle serwera nie renderował niczego ` +
        `i punkt niżej badałby wynik prerenderu`,
    );

  if (!(ssr.markery ?? {})['pct-button'])
    fail(
      'ssr',
      'bez-komponentu',
      `w HTML-u z serwera nie ma klasy \`pct-button\` — komponent nie wyrenderował się ` +
        `po stronie serwera (biblioteka sięgnęła po \`document\`? nie dopasowała się?)`,
    );

  if ((ssr.czesci ?? []).length === 0)
    fail(
      'ssr',
      'bez-czesci',
      `w HTML-u z serwera nie ma ani jednego \`data-pct-part\` — publiczne API ` +
        `stylowania (req-api-parts) nie dojechało do konsumenta`,
    );

  // ── 7. e2e ──────────────────────────────────────────────────────────────────
  const e2e = we.e2e ?? {};
  if (!e2e.element)
    fail(
      'e2e',
      'brak-elementu',
      `przeglądarka nie znalazła przycisku w drzewie — wszystko niżej byłoby prawdą ` +
        `pustą, bo nie ma czego mierzyć`,
    );

  if (!String(e2e.token ?? '').trim())
    fail(
      'e2e',
      'bez-skorki',
      `\`${TOKEN_TLA}\` policzone na przycisku jest puste — skórka nie doszła do ` +
        `przeglądarki. Przycisk jest wtedy w DOM-ie, ma wszystkie klasy i części, ` +
        `i nie ma wyglądu: cicha wada z lesson-36 w swojej docelowej postaci`,
    );

  if (e2e.tlo === TLO_POCZATKOWE)
    fail(
      'e2e',
      'tlo-poczatkowe',
      `tło przycisku ma wartość POCZĄTKOWĄ (\`${TLO_POCZATKOWE}\`) — deklaracja ` +
        `\`background: var(${TOKEN_TLA})\` nie rozwiązała się i przeglądarka po cichu ` +
        `wróciła do przezroczystego`,
    );

  if (e2e.tlo !== e2e.tloTokenu)
    fail(
      'e2e',
      'tlo-nie-z-tokenu',
      `tło przycisku (\`${e2e.tlo}\`) nie jest wartością \`${TOKEN_TLA}\` ` +
        `(\`${e2e.tloTokenu}\`) — skórka jest wczytana, a komponent maluje się czymś ` +
        `innym, więc nadpisanie tokenu u konsumenta niczego nie zmieni`,
    );

  if ((e2e.bledy ?? []).length)
    fail(
      'e2e',
      'blad-konsoli',
      `przeglądarka zgłosiła ${e2e.bledy.length} błędów na stronie konsumenta:\n` +
        e2e.bledy.map((b) => `      ${String(b).slice(0, 200)}`).join('\n') +
        `\n    Tu lądują rozjazdy hydracji (NG05xx): strona wygląda poprawnie, ` +
        `a płaci podwójnym renderem`,
    );

  return (
    `archiwum ${pliki.size} plików (${tarball.wersja}) → rejestr → aplikacja SSR: ` +
    `${build.tokenyWCss} deklaracji tokenów w arkuszu, ` +
    `${(ssr.czesci ?? []).length} części w HTML-u z serwera, ` +
    `tło ${e2e.tlo} z \`${TOKEN_TLA}\``
  );
};

// ── pomiar ────────────────────────────────────────────────────────────────────

const czytajJson = (sciezka) => {
  try {
    return JSON.parse(readFileSync(sciezka, 'utf8'));
  } catch {
    return null;
  }
};

/** Wolny port. Bramka biegnie w CI obok innych rzeczy, a 4873 bywa zajęte przez człowieka. */
const wolnyPort = () =>
  new Promise((res, rej) => {
    const s = createServer();
    s.on('error', rej);
    s.listen(0, '127.0.0.1', () => {
      const { port } = s.address();
      s.close(() => res(port));
    });
  });

const czekaj = (ms) => new Promise((res) => setTimeout(res, ms));

/** Czeka, aż adres zacznie odpowiadać. Zwraca `false` zamiast rzucać — punkt to oceni. */
const czekajNaHttp = async (url, sekundy = 60) => {
  for (let i = 0; i < sekundy * 4; i++) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(2000) });
      if (r.status < 500) return true;
    } catch {
      /* jeszcze nie wstał */
    }
    await czekaj(250);
  }
  return false;
};

/**
 * Uruchomienie polecenia z przechwyceniem WSZYSTKIEGO — kodu wyjścia i obu strumieni.
 * Niezerowy kod jest tu DANĄ, nie wyjątkiem: punkt 4 i 5 mają o nim orzec i wypisać
 * wyjście, a `execFileSync` rzucający wyjątkiem zamieniłby bramkę w stack trace
 * dokładnie w miejscu, w którym miała powiedzieć, co się stało.
 */
const uruchom = (plik, args, opcje = {}) => {
  try {
    const out = execFileSync(plik, args, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      ...opcje,
    });
    return { kod: 0, wyjscie: out ?? '' };
  } catch (e) {
    return {
      kod: e.status ?? 1,
      wyjscie: `${e.stdout ?? ''}${e.stderr ?? ''}` || String(e.message ?? e),
    };
  }
};

/** Pliki fabryk z kolekcji schematica — ścieżki takie, jak leżą w archiwum. */
const fabrykiSchematicow = (manifest) => {
  const out = [];
  for (const wskaznik of [
    manifest?.schematics,
    manifest?.['ng-update']?.migrations,
  ]) {
    if (typeof wskaznik !== 'string') continue;
    const kolekcja = czytajJson(join(ROOT, DIST, wskaznik));
    for (const def of Object.values(kolekcja?.schematics ?? {})) {
      const fabryka = String(def.factory ?? '').split('#')[0];
      if (!fabryka) continue;
      out.push(join(dirname(wskaznik), `${fabryka}.js`).replace(/^\.\//, ''));
    }
  }
  return out;
};

/**
 * Katalog roboczy: aplikacja konsumenta i magazyn rejestru. Leży w `tmp/` repozytorium,
 * a nie w katalogu tymczasowym systemu, i to nie z wygody — rozwiązywanie modułów ma iść
 * w górę drzewa do `node_modules` repozytorium, żeby `@angular/*` znalazło się samo,
 * a z rejestru przyszedł WYŁĄCZNIE mierzony pakiet. Ten sam wybór co w `check-bundle`.
 * `tmp/` jest w `.gitignore`, więc pliki sondy nie stają się wadą dla `check-typecheck`.
 */
const przygotujKatalog = () => {
  rmSync(PRACA, { recursive: true, force: true });
  mkdirSync(join(PRACA, 'app/src'), { recursive: true });
  mkdirSync(join(PRACA, 'registry'), { recursive: true });
  return { app: join(PRACA, 'app'), registry: join(PRACA, 'registry') };
};

/**
 * Aplikacja konsumenta. Pisana tutaj, a nie trzymana w repozytorium jako projekt, bo
 * projekt w repozytorium byłby budowany przez `nx affected` i typechecked, czyli
 * mierzyłby ŹRÓDŁA — a cała rzecz polega na tym, że tu widać wyłącznie zainstalowany
 * pakiet.
 *
 * Trasa idzie przez router z `RenderMode.Server`, a nie przez domyślny prerender:
 * bez tego builder wypisuje gotowy `index.html`, serwer serwuje plik statyczny
 * (`ng-server-context="ssg"`) i bundle serwera nie renderuje ani razu. Zmierzone —
 * dopiero z routerem odpowiedź ma `ng-server-context="ssr"`.
 *
 * `security.allowedHosts` jest wymogiem Angulara 22 (ochrona przed SSRF): bez niego
 * serwer odpowiada 400 na własny `Host: localhost:<port>`. To konfiguracja aplikacji,
 * nie biblioteki — ale bez niej punkt 6 mierzyłby błąd frameworka zamiast pakietu.
 */
const napiszAplikacje = (app) => {
  writeFileSync(
    join(app, 'package.json'),
    JSON.stringify(
      { name: 'pct-konsument', version: '0.0.0', private: true },
      null,
      2,
    ) + '\n',
  );

  writeFileSync(
    join(app, 'angular.json'),
    JSON.stringify(
      {
        version: 1,
        projects: {
          konsument: {
            projectType: 'application',
            root: '',
            sourceRoot: 'src',
            architect: {
              build: {
                builder: '@angular/build:application',
                options: {
                  outputPath: 'out',
                  index: 'src/index.html',
                  browser: 'src/main.ts',
                  server: 'src/main.server.ts',
                  ssr: { entry: 'src/server.ts' },
                  outputMode: 'server',
                  tsConfig: 'tsconfig.json',
                  optimization: true,
                  outputHashing: 'none',
                  security: { allowedHosts: ['localhost'] },
                  // Pusto CELOWO: listę wypełnia `ng add` i punkt 4 mierzy różnicę.
                  styles: [],
                },
              },
            },
          },
        },
      },
      null,
      2,
    ) + '\n',
  );

  writeFileSync(
    join(app, 'tsconfig.json'),
    JSON.stringify(
      {
        compilerOptions: {
          target: 'ES2022',
          module: 'preserve',
          moduleResolution: 'bundler',
          skipLibCheck: true,
          strict: true,
          types: ['node'],
        },
        files: ['src/main.ts', 'src/main.server.ts', 'src/server.ts'],
      },
      null,
      2,
    ) + '\n',
  );

  const plik = (nazwa, tresc) =>
    writeFileSync(join(app, 'src', nazwa), tresc.join('\n') + '\n');

  plik('index.html', [
    '<!doctype html>',
    '<html lang="pl">',
    '  <head><meta charset="utf-8" /><title>konsument</title></head>',
    '  <body><app-root></app-root></body>',
    '</html>',
  ]);

  plik('app.ts', [
    `import { Component } from '@angular/core';`,
    `import { RouterOutlet } from '@angular/router';`,
    `import { PctButton } from '${PAKIET}/button';`,
    ``,
    `@Component({`,
    `  selector: 'app-sonda',`,
    `  imports: [PctButton],`,
    `  template: \`<button pctButton id="sonda">Zapisz</button>\`,`,
    `})`,
    `export class Sonda {}`,
    ``,
    `@Component({`,
    `  selector: 'app-root',`,
    `  imports: [RouterOutlet],`,
    `  template: \`<router-outlet />\`,`,
    `})`,
    `export class App {}`,
  ]);

  plik('main.ts', [
    `import { provideZonelessChangeDetection } from '@angular/core';`,
    `import {`,
    `  bootstrapApplication,`,
    `  provideClientHydration,`,
    `} from '@angular/platform-browser';`,
    `import { provideRouter } from '@angular/router';`,
    `import { App, Sonda } from './app';`,
    ``,
    `bootstrapApplication(App, {`,
    `  providers: [`,
    `    provideZonelessChangeDetection(),`,
    `    provideClientHydration(),`,
    `    provideRouter([{ path: '', component: Sonda }]),`,
    `  ],`,
    `}).catch((e) => console.error(e));`,
  ]);

  plik('main.server.ts', [
    `import { provideZonelessChangeDetection } from '@angular/core';`,
    `import {`,
    `  BootstrapContext,`,
    `  bootstrapApplication,`,
    `} from '@angular/platform-browser';`,
    `import { provideRouter } from '@angular/router';`,
    `import { RenderMode, provideServerRendering, withRoutes } from '@angular/ssr';`,
    `import { App, Sonda } from './app';`,
    ``,
    `const bootstrap = (context: BootstrapContext) =>`,
    `  bootstrapApplication(`,
    `    App,`,
    `    {`,
    `      providers: [`,
    `        provideZonelessChangeDetection(),`,
    `        provideRouter([{ path: '', component: Sonda }]),`,
    `        provideServerRendering(`,
    `          withRoutes([{ path: '**', renderMode: RenderMode.Server }]),`,
    `        ),`,
    `      ],`,
    `    },`,
    `    context,`,
    `  );`,
    ``,
    `export default bootstrap;`,
  ]);

  plik('server.ts', [
    `import {`,
    `  AngularNodeAppEngine,`,
    `  createNodeRequestHandler,`,
    `  isMainModule,`,
    `  writeResponseToNodeResponse,`,
    `} from '@angular/ssr/node';`,
    `import express from 'express';`,
    `import { dirname, resolve } from 'node:path';`,
    `import { fileURLToPath } from 'node:url';`,
    ``,
    `const serverDistFolder = dirname(fileURLToPath(import.meta.url));`,
    `const browserDistFolder = resolve(serverDistFolder, '../browser');`,
    ``,
    `const app = express();`,
    `const angularApp = new AngularNodeAppEngine();`,
    ``,
    `app.use(express.static(browserDistFolder, { index: false, redirect: false }));`,
    `app.use('/**', (req, res, next) => {`,
    `  angularApp`,
    `    .handle(req)`,
    `    .then((r) => (r ? writeResponseToNodeResponse(r, res) : next()))`,
    `    .catch(next);`,
    `});`,
    ``,
    `if (isMainModule(import.meta.url)) {`,
    `  app.listen(Number(process.env['PORT'] ?? 4000));`,
    `}`,
    ``,
    `export const reqHandler = createNodeRequestHandler(app);`,
  ]);
};

/** Uruchomiony Verdaccio z magazynem świeżym na każdy przebieg. */
const wstanRejestr = async (registry, port) => {
  const proc = spawn(
    process.execPath,
    [
      join(ROOT, 'node_modules/verdaccio/bin/verdaccio'),
      '--config',
      join(ROOT, '.verdaccio/config.yml'),
      '--listen',
      String(port),
    ],
    {
      cwd: ROOT,
      // Magazyn jest per przebieg, nie ten z konfiguracji: publikacja tej samej wersji
      // do magazynu trwałego kończy się drugi raz konfliktem, więc bramka zapalałaby
      // na SOBIE. Konfiguracja zostaje ta prawdziwa — zmienna nadpisuje z niej jedną
      // ścieżkę, zamiast forkować plik, którego bramka miała pilnować.
      env: { ...process.env, VERDACCIO_STORAGE_PATH: registry },
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );
  let log = '';
  proc.stdout.on('data', (d) => (log += d));
  proc.stderr.on('data', (d) => (log += d));
  const wstal = await czekajNaHttp(`http://localhost:${port}/-/ping`, 30);
  return { proc, wstal, log: () => log };
};

/** Pomiar w przeglądarce. Jeden przebieg, tak jak mówi obietnica. */
const wPrzegladarce = async (url) => {
  const { chromium } = await import('@playwright/test');
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    const bledy = [];
    page.on('console', (m) => m.type() === 'error' && bledy.push(m.text()));
    page.on('pageerror', (e) => bledy.push(String(e)));
    await page.goto(url, { waitUntil: 'networkidle' });
    return {
      ...(await page.evaluate(
        ([tokenTla]) => {
          const el = document.querySelector('#sonda');
          if (!el) return { element: false };
          // Wartość tokenu mierzona przez PRZEGLĄDARKĘ, nie parsowana w Node: token
          // bywa łańcuchem `var()`, a porównanie ma być między dwiema wartościami
          // policzonymi tym samym silnikiem. Sonda stoi wewnątrz przycisku, więc
          // dziedziczy jego scope custom properties.
          const sonda = document.createElement('span');
          sonda.style.backgroundColor = `var(${tokenTla})`;
          el.appendChild(sonda);
          const tloTokenu = getComputedStyle(sonda).backgroundColor;
          sonda.remove();
          return {
            element: true,
            token: getComputedStyle(el).getPropertyValue(tokenTla).trim(),
            tlo: getComputedStyle(el).backgroundColor,
            tloTokenu,
            czesci: [...document.querySelectorAll('[data-pct-part]')].map((e) =>
              e.getAttribute('data-pct-part'),
            ),
          };
        },
        [TOKEN_TLA],
      )),
      bledy,
    };
  } finally {
    await browser.close();
  }
};

/** Pełny przebieg drogi konsumenta. */
const zmierzRepozytorium = async () => {
  const dist = join(ROOT, DIST);
  const manifest = czytajJson(join(dist, 'package.json'));
  if (!manifest)
    throw new BladKonsumenta(
      'tarball',
      'pusty',
      `brak zbudowanego pakietu w ${DIST} — bramka mierzy artefakt, nie źródła.\n` +
        `    Target musi mieć \`dependsOn\` na build biblioteki`,
    );

  const { app, registry } = przygotujKatalog();
  const port = await wolnyPort();
  const portApp = await wolnyPort();
  const url = `http://localhost:${port}`;

  // Konfiguracja npm per przebieg. Rejestr wymaga tokenu nawet przy `publish: $all`
  // (npm bez niego kończy na ENEEDAUTH), a wpisanie go do `~/.npmrc` byłoby zmianą
  // ustawień maszyny — tak robi executor `@nx/js:verdaccio` i dlatego bramka go nie używa.
  const npmrc = join(PRACA, 'npmrc');
  writeFileSync(
    npmrc,
    `registry=${url}/\n//localhost:${port}/:_authToken=pct-check-consumer\n`,
  );
  const npmEnv = { ...process.env, npm_config_userconfig: npmrc };

  const rejestr = await wstanRejestr(registry, port);
  let serwerApp = null;

  try {
    if (!rejestr.wstal)
      throw new BladKonsumenta(
        'rejestr',
        'publikacja',
        `lokalny rejestr nie wstał na ${url}:\n    ${rejestr.log().slice(0, 500)}`,
      );

    // 1. `npm pack` — to, co naprawdę pojedzie do rejestru.
    const spakowane = uruchom(
      'npm',
      ['pack', dist, '--json', '--pack-destination', PRACA],
      { cwd: ROOT },
    );
    const opisPaczki = (() => {
      const i = spakowane.wyjscie.indexOf('[');
      try {
        return JSON.parse(spakowane.wyjscie.slice(i))[0];
      } catch {
        return null;
      }
    })();
    const tarball = {
      wersja: opisPaczki?.version ?? manifest.version,
      integrity: opisPaczki?.integrity ?? null,
      pliki: (opisPaczki?.files ?? []).map((f) => f.path),
      manifest,
      fabryki: fabrykiSchematicow(manifest),
    };
    const archiwum = join(PRACA, opisPaczki?.filename ?? 'brak.tgz');

    // 2. publikacja + odczyt metadanych z rejestru.
    const publikacja = existsSync(archiwum)
      ? uruchom('npm', ['publish', archiwum, '--registry', url], {
          cwd: PRACA,
          env: npmEnv,
        })
      : { kod: 1, wyjscie: `archiwum ${archiwum} nie powstało` };

    const metadane = await (async () => {
      try {
        const r = await fetch(`${url}/${PAKIET.replace('/', '%2f')}`);
        const j = await r.json();
        const w = j?.versions?.[tarball.wersja];
        return {
          wersje: Object.keys(j?.versions ?? {}),
          integrity: w?.dist?.integrity ?? null,
          tarball: w?.dist?.tarball ?? null,
        };
      } catch {
        return null;
      }
    })();

    // 3. instalacja PO NAZWIE do świeżej aplikacji.
    napiszAplikacje(app);
    const instalka = uruchom(
      'npm',
      [
        'install',
        `${PAKIET}@${tarball.wersja}`,
        '--registry',
        url,
        '--omit=peer',
        '--no-audit',
        '--no-fund',
      ],
      { cwd: app, env: npmEnv },
    );
    const lock = czytajJson(join(app, 'node_modules/.package-lock.json'));
    const rozwiazanie = (() => {
      try {
        return createRequire(join(app, 'src/app.ts')).resolve(
          `${PAKIET}/button`,
        );
      } catch {
        return null;
      }
    })();

    // 4. `ng add` — schematic z zainstalowanego pakietu, prawdziwym CLI.
    //    Wołany jako `generate`, a nie `add`: `ng add` to instalacja PLUS ten schematic,
    //    a instalację mierzy punkt 3 — złączone w jedno polecenie dałyby jeden komunikat
    //    na dwie różne awarie.
    const cli = join(ROOT, 'node_modules/@angular/cli/bin/ng.js');
    const stylePrzed = czytajJson(join(app, 'angular.json'))?.projects
      ?.konsument?.architect?.build?.options?.styles;
    const ngAdd = uruchom(
      process.execPath,
      [cli, 'generate', `${PAKIET}:ng-add`, '--defaults'],
      { cwd: app },
    );
    const stylePo = czytajJson(join(app, 'angular.json'))?.projects?.konsument
      ?.architect?.build?.options?.styles;

    // 5. build z SSR.
    const build = uruchom(process.execPath, [cli, 'build', 'konsument'], {
      cwd: app,
      maxBuffer: 32 * 1024 * 1024,
    });
    const out = join(app, 'out');
    const bundle = existsSync(join(out, 'browser/main.js'))
      ? readFileSync(join(out, 'browser/main.js'), 'utf8')
      : '';
    const arkusz = existsSync(join(out, 'browser/styles.css'))
      ? readFileSync(join(out, 'browser/styles.css'), 'utf8')
      : '';

    // 6. serwer + HTTP.
    let ssr = { status: null, kontekst: null, czesci: [], markery: {} };
    if (existsSync(join(out, 'server/server.mjs'))) {
      serwerApp = spawn(process.execPath, [join(out, 'server/server.mjs')], {
        cwd: out,
        env: { ...process.env, PORT: String(portApp) },
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      const adres = `http://localhost:${portApp}/`;
      if (await czekajNaHttp(adres, 60)) {
        const r = await fetch(adres);
        const html = await r.text();
        ssr = {
          status: r.status,
          kontekst: html.match(/ng-server-context="([^"]*)"/)?.[1] ?? null,
          czesci: [...html.matchAll(/data-pct-part="([^"]*)"/g)].map(
            (m) => m[1],
          ),
          markery: Object.fromEntries(
            MARKERY.map((m) => [m, html.includes(m)]),
          ),
          tresc: html.slice(0, 400),
        };
      }
    }

    // 7. jeden przebieg w przeglądarce.
    const e2e =
      ssr.status === 200
        ? await wPrzegladarce(`http://localhost:${portApp}/`)
        : { element: false, bledy: [] };

    return {
      tarball,
      rejestr: {
        url,
        opublikowany: publikacja.kod === 0,
        wyjscie: publikacja.wyjscie,
        metadane,
      },
      instalacja: {
        katalog: app,
        wpis: lock?.packages?.[`node_modules/${PAKIET}`] ?? null,
        wyjscie: instalka.wyjscie,
        rozwiazanie,
      },
      ngAdd: {
        kod: ngAdd.kod,
        wyjscie: ngAdd.wyjscie,
        stylePrzed: stylePrzed ?? [],
        stylePo: stylePo ?? [],
      },
      build: {
        kod: build.kod,
        wyjscie: build.wyjscie,
        serwer: existsSync(join(out, 'server/server.mjs')),
        markery: Object.fromEntries(
          MARKERY.map((m) => [m, bundle.includes(m)]),
        ),
        tokenyWCss: [...arkusz.matchAll(/--pct-[a-z0-9-]+\s*:/g)].length,
      },
      ssr,
      e2e,
    };
  } finally {
    serwerApp?.kill('SIGTERM');
    rejestr.proc.kill('SIGTERM');
    if (!ZOSTAW) rmSync(PRACA, { recursive: true, force: true });
  }
};

// ── kontrola odniesienia ──────────────────────────────────────────────────────

const wczytajFixture = (nazwa) =>
  JSON.parse(readFileSync(join(FIXTURES, nazwa), 'utf8'));

/**
 * Składa wejście przypadku NA KOPII wzorcowego, więc plik przypadku zawiera wyłącznie
 * swoją wadę — nie da się zepsuć czegoś przy okazji i nie zauważyć.
 *
 * Pomiar przychodzi jako DANE, a nie z prawdziwego przebiegu: uruchomienie rejestru,
 * instalacji, builda i przeglądarki na każdy z dwudziestu kilku przypadków kosztowałoby
 * kwadranse. Ten sam wybór co w `check-bundle` i `check-parts`, i ta sama cena, zapisana
 * wprost: fixtures NIE ćwiczą kodu mierzącego — ćwiczą układ kontroli. Kod mierzący jest
 * ćwiczony przy każdym przebiegu na prawdziwym repozytorium.
 */
const zlozFixture = (fx) => {
  const we = structuredClone(wczytajFixture(BAZA));

  const usunZListy = (lista, co) => lista.filter((x) => x !== co);

  if (fx.wyczyscPliki) we.tarball.pliki = [];
  if (fx.usunPlik) we.tarball.pliki = usunZListy(we.tarball.pliki, fx.usunPlik);
  if (fx.dodajExport)
    we.tarball.manifest.exports[fx.dodajExport.klucz] = fx.dodajExport.cel;
  if (fx.dodajFabryke)
    we.tarball.fabryki = [...we.tarball.fabryki, fx.dodajFabryke];
  if (fx.kolekcjaWManifescie !== undefined)
    we.tarball.manifest.schematics = fx.kolekcjaWManifescie;

  if (fx.opublikowany !== undefined) we.rejestr.opublikowany = fx.opublikowany;
  if (fx.wersjeWRejestrze) we.rejestr.metadane.wersje = fx.wersjeWRejestrze;
  if (fx.integrityWRejestrze)
    we.rejestr.metadane.integrity = fx.integrityWRejestrze;
  if (fx.tarballWRejestrze) we.rejestr.metadane.tarball = fx.tarballWRejestrze;

  if (fx.bezWpisu) we.instalacja.wpis = null;
  if (fx.resolvedInstalacji)
    we.instalacja.wpis.resolved = fx.resolvedInstalacji;
  if (fx.integrityInstalacji)
    we.instalacja.wpis.integrity = fx.integrityInstalacji;
  if (fx.rozwiazanie) we.instalacja.rozwiazanie = fx.rozwiazanie;

  if (fx.kodNgAdd !== undefined) we.ngAdd.kod = fx.kodNgAdd;
  if (fx.stylePo) we.ngAdd.stylePo = fx.stylePo;

  if (fx.kodBuilda !== undefined) we.build.kod = fx.kodBuilda;
  if (fx.bezSerwera) we.build.serwer = false;
  if (fx.markerBuilda) we.build.markery[fx.markerBuilda] = false;
  if (fx.tokenyWCss !== undefined) we.build.tokenyWCss = fx.tokenyWCss;

  if (fx.statusSsr !== undefined) we.ssr.status = fx.statusSsr;
  if (fx.kontekstSsr !== undefined) we.ssr.kontekst = fx.kontekstSsr;
  if (fx.markerSsr) we.ssr.markery[fx.markerSsr] = false;
  if (fx.bezCzesci) we.ssr.czesci = [];

  if (fx.bezElementu) we.e2e.element = false;
  if (fx.token !== undefined) we.e2e.token = fx.token;
  if (fx.tlo !== undefined) we.e2e.tlo = fx.tlo;
  if (fx.tloTokenu !== undefined) we.e2e.tloTokenu = fx.tloTokenu;
  if (fx.bledy) we.e2e.bledy = fx.bledy;

  return we;
};

// ── przebieg ──────────────────────────────────────────────────────────────────

const problems = [];
let opis = null;

/**
 * `--zapisz-wzorzec` istnieje, żeby wejście wzorcowe było ODCISKIEM prawdziwego pomiaru,
 * a nie zdaniem wpisanym ręką obok niego: wpisane rozjeżdża się z kształtem pomiaru przy
 * pierwszej zmianie i wejście przestaje przechodzić z powodu, którego nikt nie badał.
 * Długie wyjścia poleceń są przycinane — w fixtures są cytowane wyłącznie w komunikatach
 * błędów, a kilkadziesiąt kilobajtów logu builda w pliku wersjonowanym byłoby szumem.
 */
if (WZORZEC) {
  const pomiar = await zmierzRepozytorium();
  pomiar.rejestr.wyjscie = '(wyjście npm publish)';
  pomiar.instalacja.wyjscie = '(wyjście npm install)';
  pomiar.ngAdd.wyjscie = '(wyjście ng generate)';
  pomiar.build.wyjscie = '(wyjście ng build)';
  pomiar.ssr.tresc = '(początek HTML-a)';
  // Port rejestru i ścieżka repozytorium są inne w każdym przebiegu i na każdej maszynie.
  // Kontrole porównują je WEWNĄTRZ pomiaru (adres archiwum zaczyna się od adresu
  // rejestru, rozwiązanie leży w katalogu aplikacji), więc podmiana na wartości stałe
  // niczego nie osłabia, a zdejmuje z wersjonowanego pliku szum i cudzą ścieżkę domową.
  const stale = JSON.stringify(pomiar)
    .split(pomiar.rejestr.url)
    .join('http://localhost:4873')
    .split(pomiar.instalacja.katalog)
    .join('/repozytorium/tmp/check-consumer/app');
  // Wyjście idzie przez prettiera, bo `nx format:check` obejmuje `tools/`. Bez tego dwie
  // bramki chciałyby innego kształtu tego samego pliku i każde odświeżenie wzorca
  // zostawiałoby repozytorium z czerwonym formatowaniem. Ten sam ruch co w `check-docs`.
  const prettier = await import('prettier');
  const sciezka = join(FIXTURES, BAZA);
  writeFileSync(
    sciezka,
    await prettier.format(JSON.stringify(JSON.parse(stale), null, 2), {
      ...(await prettier.resolveConfig(sciezka)),
      filepath: sciezka,
    }),
  );
  console.log(
    `✓ Zapisano ${BAZA} z pomiaru. Uruchom bramkę jeszcze raz — kontrola odniesienia ` +
      `nie biegła w tym przebiegu.`,
  );
  process.exit(0);
}

try {
  opis = sprawdzKonsumenta(await zmierzRepozytorium());
} catch (blad) {
  if (!(blad instanceof BladKonsumenta)) throw blad;
  problems.push(`${blad.kontrola}/${blad.regula}: ${blad.message}`);
}

const przypadki = readdirSync(FIXTURES)
  .filter((n) => n.endsWith('.json') && n !== BAZA)
  .sort();

if (przypadki.length === 0)
  problems.push(
    `tools/check-consumer.fixtures: brak spreparowanych wejść — bramka bez dowodu, ` +
      `że potrafi nie przejść, jest kolejną cichą wadą (req-quality-negative-control)`,
  );

// Wejście wzorcowe MUSI przejść: gdyby samo było wadliwe, każdy przypadek zapalałby
// z jego powodu, a nie ze swojego, i wszystkie „odrzucone" byłyby fałszywe — czyli ta
// kontrola stałaby się tym, przed czym stoi.
try {
  sprawdzKonsumenta(zlozFixture({}));
} catch (blad) {
  if (!(blad instanceof BladKonsumenta)) throw blad;
  problems.push(
    `${BAZA}: wejście wzorcowe NIE przechodzi (${blad.kontrola}/${blad.regula}) — ` +
      `każdy spreparowany przypadek zapala teraz z jego powodu.\n    ${blad.message}`,
  );
}

for (const nazwa of przypadki) {
  const fx = wczytajFixture(nazwa);
  try {
    sprawdzKonsumenta(zlozFixture(fx));
    problems.push(
      `${nazwa}: spreparowane wejście PRZESZŁO, a miało nie przejść — punkt ` +
        `${fx.punkt} (\`${fx.kontrola}\`), reguła \`${fx.regula}\` przestała ` +
        `cokolwiek badać`,
    );
  } catch (blad) {
    if (!(blad instanceof BladKonsumenta)) throw blad;
    if (blad.kontrola !== fx.kontrola || blad.regula !== fx.regula)
      problems.push(
        `${nazwa}: zapaliła reguła \`${blad.kontrola}/${blad.regula}\`, a miała ` +
          `\`${fx.kontrola}/${fx.regula}\` (punkt ${fx.punkt}) — fixture dowodzi ` +
          `czegoś innego, niż deklaruje`,
      );
  }
}

// ── wynik ─────────────────────────────────────────────────────────────────────

if (problems.length) {
  console.error(`X Bramka konsumenta — ${problems.length} naruszeń:\n`);
  for (const p of problems) console.error(`  - ${p}`);
  console.error('');
  process.exit(1);
}

console.log(
  `✓ Konsument: ${opis}. Kontrola odniesienia: wejście wzorcowe przechodzi, ` +
    `${przypadki.length} spreparowanych odrzuconych na swoich regułach.`,
);
