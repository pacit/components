#!/usr/bin/env node
/**
 * Bramka tree-shakingu i budżetu rozmiaru: sprawdza, ile konsument naprawdę płaci
 * za import jednego entrypointu (`req-project-tree-shaking`).
 *
 * Powód istnienia: „komponenty importuje się przez secondary entrypoints, co wymusza
 * tree-shaking" jest obietnicą SPRZEDAŻOWĄ — tą, dla której ktoś tę bibliotekę wybiera —
 * i do 2026-08-05 nie była sprawdzana w ogóle. Jej złamanie nie daje ani jednego
 * czerwonego testu: dopisanie w `button/src/button.ts` importu z `@pacit/components/field`
 * kompiluje się, przechodzi testy, przechodzi `check-package` i dokłada konsumentowi
 * kilkadziesiąt kilobajtów, o których dowie się z własnego raportu bundla, jeśli go ma.
 *
 * Sprawdzane jest dziesięć rzeczy:
 *   1. `entrypointy`  — lista entrypointów z DWÓCH odczytów (źródła i artefakt) jest ta
 *                       sama i niepusta,
 *   2. `side-effects` — spakowany manifest deklaruje `sideEffects: false`,
 *   3. `snapshot`     — snapshot istnieje i ma wiersz dokładnie dla każdego entrypointu,
 *   4. `obecnosc`     — MIANOWNIK: sonda wnosi swój entrypoint, primary nie wnosi ani
 *                       jednego komponentu, a każdy entrypoint ma czym się wyróżnić,
 *   5. `izolacja`     — zbiór entrypointów wniesionych przez sondę zgadza się ze snapshotem,
 *   6. `markery`      — drugi odczyt tego samego, po tekście bundla, w OBIE strony,
 *   7. `zewnetrzne`   — zbiór zależności zewnętrznych sondy zgadza się ze snapshotem
 *                       (tu mieszka „w bundlu z `button` nie ma CDK Overlay"),
 *   8. `rozmiar`      — budżet rozmiaru per entrypoint, tolerancja DWUSTRONNA,
 *   9. `roznicowa`    — sonda dwóch entrypointów jest zauważalnie większa niż każda
 *                       z pojedynczych,
 *  10. `builder`      — to samo zmierzone PRAWDZIWYM builderem Angulara.
 *
 * Punkty 5 i 7 są samym sednem obietnicy. Punkty 4, 6, 9 i 10 pilnują MIANOWNIKA —
 * bez nich „w bundlu z `button` nie ma `PctField`" jest prawdą pustą dokładnie wtedy,
 * gdy pomiar przestał cokolwiek mierzyć: sonda, z której esbuild wyrzucił całą
 * bibliotekę, nie zawiera też `PctField`.
 *
 * Do tego jedenasty przebieg, który nie bada bundla, tylko TĘ BRAMKĘ: kontrola
 * odniesienia z `tools/check-bundle.fixtures/` (`req-quality-negative-control`).
 *
 * Użycie:
 *   node tools/check-bundle.mjs
 *   node tools/check-bundle.mjs --write   przepisuje snapshot rozmiarów
 */
import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PROJEKT = 'libs/components';
const DIST = 'dist/libs/components';
const SNAPSHOT = `${PROJEKT}/rozmiar.snapshot.md`;
const FIXTURES = join(ROOT, 'tools/check-bundle.fixtures');
const BAZA = '_poprawny.json';
const WRITE = process.argv.includes('--write');

/**
 * Budżet: o ile rozmiar sondy może odjechać od snapshotu, zanim to jest „skok".
 * Tolerancja jest DWUSTRONNA i to nie z uprzejmości dla optymalizacji. Wzrost trzeba
 * przyjąć w widocznej linii diffa — po to jest budżet. Ale SPADEK jest w tym
 * repozytorium podejrzany co najmniej tak samo: bramka, której pomiar cichnie, wygląda
 * dokładnie jak bramka, której pilnowany kod schudł (`lesson-45`, `lesson-48`). Jedyna
 * różnica jest w tym, czy ktoś na to spojrzał — więc niech spojrzy.
 */
const TOLERANCJA = 0.05;
const TOLERANCJA_MIN = 256;

/**
 * Klasy CSS nakładki CDK. Jedyny napis w tej bramce wpisany ręką i jedyny, który
 * dotyczy cudzego pakietu — bo `@angular/cdk/overlay` jest najdroższą zależnością
 * opcjonalną biblioteki i to ona stoi w treści `req-project-tree-shaking`. Napis nie
 * jest tu założeniem: sonda buildera z KOMPLETEM entrypointów musi go znaleźć, inaczej
 * punkt 10 zapala na samym sobie.
 */
const MARKER_OVERLAY = 'cdk-overlay';

/** Nazwa entrypointu głównego w mapie `exports` — pakiet, nie podścieżka. */
const PRIMARY = '.';

/**
 * Naruszenie jednej z dziesięciu kontroli. It carries the check's identifier, not just the
 * message: the negative control has to verify that a prepared input fired ON ITS OWN
 * point — a fixture failing for a reason other than the one written into it proves
 * something other than what it declares.
 */
class BladBundla extends Error {
  constructor(kontrola, opis) {
    super(opis);
    this.kontrola = kontrola;
  }
}

const lista = (zbior) => [...zbior].sort().join(', ') || '(pusto)';

// ── kontrole ──────────────────────────────────────────────────────────────────

/**
 * Komplet kontroli na gotowym wejściu:
 *   `zrodla`    — entrypointy z `ng-package.json` w indeksie gita,
 *   `manifest`  — spakowany `package.json` (mapa `exports`, `sideEffects`),
 *   `snapshot`  — treść pliku albo `null`,
 *   `markery`   — `{ entrypoint: [selektory] }` ze zbudowanego pakietu,
 *   `sondy`     — `{ entrypoint: { bajty, wniesione, zewnetrzne, wTekscie } }`,
 *   `para`      — `{ entrypointy: [a, b], bajty }`,
 *   `builder`   — `[{ entrypointy, znalezione, overlay }]` z prawdziwego builda.
 *
 * Rzuca `BladBundla` przy pierwszym naruszeniu; zwraca `{ opis, snapshot }`, bo
 * wyrenderowany snapshot wraca także z przebiegu sprawdzającego — `--write` ma go
 * skąd wziąć bez powtarzania całego pomiaru.
 *
 * Każdy punkt czyta wejście DEFENSYWNIE, mimo że poprzedni „już to sprawdził".
 * Zależność między punktami jest normalna; zapisanie jej tak, że rozbrojenie
 * poprzedniego zamienia bramkę w `TypeError`, nie jest — bo wtedy kontrola odniesienia
 * przestaje umieć zbadać punkt, który miała zbadać. Ta sama wada wyszła w A4, A7 i A3,
 * trzy razy z rzędu ([`lesson-50`](../docs/lessons.md#lesson-50)).
 */
const sprawdzBundle = (we) => {
  const zrodla = we.zrodla ?? [];
  const zArtefaktu = Object.keys(we.manifest?.exports ?? {}).filter(
    (k) => k === PRIMARY || /^\.\/[a-z0-9-]+$/.test(k),
  );

  /**
   * Błąd punktu, na który `--write` jest właściwą odpowiedzią, niesie ze sobą gotowy
   * snapshot. Bez tego pierwsze uruchomienie bramki w repozytorium bez snapshotu nie
   * miałoby jak go wygenerować — a `--write` istniałby jako polecenie, którego jedyny
   * przypadek użycia nie działa.
   */
  const doZapisu = (kontrola, opis) =>
    Object.assign(new BladBundla(kontrola, opis), {
      snapshot: renderujSnapshot(zrodla, we.sondy ?? {}),
    });

  // 1. Lista entrypointów z dwóch odczytów. Ten sam ruch co punkt 1 w `check-tokens`
  //    i punkt 2 w `check-parts`: jeden odczyt nie ma jak zauważyć, że sam się skurczył.
  //    Źródła łapią entrypoint, który nie dojechał do pakietu (i nieaktualne `dist`),
  //    artefakt — katalog, któremu ktoś zabrał `ng-package.json`, zostawiając kod.
  if (zrodla.length === 0)
    throw new BladBundla(
      'entrypointy',
      `nie znalazłem ani jednego entrypointu w \`${PROJEKT}/*/ng-package.json\` — ` +
        `wszystkie dalsze punkty przeszłyby wtedy zawsze, bo nie mają czego mierzyć`,
    );
  const brakWArtefakcie = zrodla.filter((e) => !zArtefaktu.includes(e));
  const brakWZrodlach = zArtefaktu.filter((e) => !zrodla.includes(e));
  if (brakWArtefakcie.length || brakWZrodlach.length)
    throw new BladBundla(
      'entrypointy',
      `dwa odczyty listy entrypointów się rozjechały:\n` +
        (brakWArtefakcie.length
          ? `      w źródłach, a nie w \`${DIST}/package.json\`: ${lista(brakWArtefakcie)}\n`
          : '') +
        (brakWZrodlach.length
          ? `      w artefakcie, a nie w źródłach: ${lista(brakWZrodlach)}\n`
          : '') +
        `    Najczęstsza przyczyna: nieaktualne \`dist\` (target musi mieć ` +
        `\`dependsOn\` na build biblioteki) albo entrypoint bez \`ng-package.json\``,
    );

  // 2. `sideEffects: false`. Flaga, na której stoi CAŁA reszta: bez niej bundler musi
  //    założyć, że każdy moduł pakietu coś robi przy wczytaniu, i przestaje wyrzucać
  //    nieużywane. Sondy tej bramki tego NIE zauważą — importują cały namespace, więc
  //    i tak wszystko zostaje — dlatego flaga potrzebuje osobnego punktu.
  //
  //    Zmierzone, nie założone: USUNIĘCIE klucza ze źródłowego manifestu tego punktu
  //    nie zapala, bo ng-packagr dopisuje wtedy `false` sam — sprawdzone przebiegiem
  //    z `--skip-nx-cache`, żeby nie wziąć trafienia w cache za wynik. Punkt zapala
  //    na jawnym `true` i na dniu, w którym ng-packagr przestanie tę wartość dopisywać.
  //    Czyta artefakt, a nie źródło, właśnie dlatego: konsument dostaje ten plik,
  //    a nie ten, który leży w repozytorium.
  if (we.manifest?.sideEffects !== false)
    throw new BladBundla(
      'side-effects',
      `\`${DIST}/package.json\` deklaruje \`sideEffects: ${JSON.stringify(
        we.manifest?.sideEffects,
      )}\`, a tree-shaking stoi na \`false\` — bez tego bundler musi zachować każdy ` +
        `moduł pakietu „na wszelki wypadek", a ta bramka tego nie zobaczy: jej sondy ` +
        `importują cały namespace`,
    );

  // 3. Snapshot: istnieje i pokrywa dokładnie listę entrypointów.
  if (we.snapshot === null || we.snapshot === undefined)
    throw doZapisu(
      'snapshot',
      `brak \`${SNAPSHOT}\` — uruchom \`node tools/check-bundle.mjs --write\`.\n` +
        `    Bez snapshotu punkty 5, 7 i 8 nie mają się z czym porównać, więc bramka ` +
        `pilnowałaby wyłącznie tego, że pomiar się wykonał`,
    );
  const wiersze = wierszeSnapshotu(we.snapshot);
  const brakWiersza = zrodla.filter((e) => !wiersze.has(e));
  const zbedny = [...wiersze.keys()].filter((e) => !zrodla.includes(e));
  if (brakWiersza.length || zbedny.length)
    throw doZapisu(
      'snapshot',
      `snapshot nie pokrywa listy entrypointów:\n` +
        (brakWiersza.length
          ? `      bez wiersza w snapshocie: ${lista(brakWiersza)}\n`
          : '') +
        (zbedny.length
          ? `      wiersz bez entrypointu: ${lista(zbedny)}\n`
          : '') +
        `    Nowy entrypoint bez wiersza nie ma budżetu ani zapisanej izolacji, ` +
        `czyli rodzi się poza tą bramką — \`node tools/check-bundle.mjs --write\``,
    );

  // 4. MIANOWNIK. Cztery rzeczy, bez których wszystko niżej jest prawdą pustą.
  const sondy = we.sondy ?? {};
  const markery = we.markery ?? {};

  //    a) sonda wnosi swój entrypoint. Sonda, z której bundler wyrzucił bibliotekę
  //       w całości, przechodzi każdy punkt o izolacji — bo nie ma w niej NICZEGO.
  for (const e of zrodla) {
    const s = sondy[e];
    if (!s)
      throw new BladBundla(
        'obecnosc',
        `nie ma pomiaru dla entrypointu \`${e}\` — sonda się nie zbudowała albo ` +
          `wypadła z listy`,
      );
    // `s?.` mimo gałęzi wyżej, która „już to sprawdziła": rozbrojenie tamtej nie
    // może zamienić tej w `TypeError`. Ta sama wada wyszła w A7, A4 i A3 — trzy razy
    // MIĘDZY punktami, tutaj czwarty raz i wewnątrz jednego ([`lesson-50`]).
    if (!(s?.wniesione ?? []).includes(e))
      throw new BladBundla(
        'obecnosc',
        `sonda importująca \`${e}\` nie wniosła do bundla ani jednego bajtu z tego ` +
          `entrypointu — „nie ma w niej \`PctField\`" jest wtedy prawdą pustą.\n` +
          `    Wniesione: ${lista(s?.wniesione ?? [])}`,
      );
  }

  //    b) primary nie wnosi ani jednego komponentu. To jest DOSŁOWNIE treść obietnicy
  //       („`@pacit/components` eksportuje wyłącznie `providePctConfig`, wspólne typy
  //       i wersję") i zarazem jedyny powód, dla którego primary wolno nie mieć markera
  //       w punkcie (c): nie ma własnej treści, którą dałoby się rozpoznać po tekście.
  //       Ta asercja jest od markera mocniejsza, więc zwolnienie nie jest wyjątkiem
  //       do wyklikania, tylko innym, ostrzejszym pomiarem tej samej rzeczy.
  const zKomponentami = (e) => (markery[e] ?? []).length > 0;
  const wPrimary = (sondy[PRIMARY]?.wniesione ?? []).filter(zKomponentami);
  if (wPrimary.length)
    throw new BladBundla(
      'obecnosc',
      `entrypoint główny \`@pacit/components\` wnosi komponenty: ${lista(wPrimary)}.\n` +
        `    Obietnica brzmi „primary eksportuje wyłącznie \`providePctConfig\`, ` +
        `wspólne typy i wersję" — każdy konsument płaci wtedy za komponent, ` +
        `którego nie zaimportował`,
    );

  //    c) każdy entrypoint, którego jakaś sonda musi dowieść NIEOBECNYM, ma po czym go
  //       poznać. Entrypoint bez markera przechodziłby punkt 6 zawsze — bo nie ma czego
  //       szukać. Primary jest wyłączony na mocy (b), a entrypoint wnoszony przez
  //       wszystkie sondy (dziś `./core`) nie jest nigdzie dowodzony nieobecnym.
  const nieobecnyGdzies = zrodla.filter(
    (e) =>
      e !== PRIMARY &&
      zrodla.some((x) => !(sondy[x]?.wniesione ?? []).includes(e)),
  );
  const bezMarkera = nieobecnyGdzies.filter((e) => !zKomponentami(e));
  if (bezMarkera.length)
    throw new BladBundla(
      'obecnosc',
      `entrypointy bez ani jednego markera: ${lista(bezMarkera)} — punkt 6 nie ma ` +
        `dla nich czego szukać w tekście bundla, więc orzeka o ich nieobecności, ` +
        `nie umiejąc zobaczyć obecności.\n` +
        `    Marker to selektor komponentu albo dyrektywy ze ZBUDOWANEGO pakietu ` +
        `(\`ɵcmp.selectors\`) — entrypoint, który nie wystawia ani jednego, wymaga ` +
        `innego odczytu niż tekstowy`,
    );

  //    d) marker jednego entrypointu nie może być podciągiem markera drugiego —
  //       wyszukiwanie po tekście dawałoby wtedy trafienie na cudzej treści.
  const wszystkieMarkery = Object.entries(markery).flatMap(([e, m]) =>
    m.map((marker) => ({ e, marker })),
  );
  for (const a of wszystkieMarkery)
    for (const b of wszystkieMarkery)
      if (a.e !== b.e && b.marker.includes(a.marker))
        throw new BladBundla(
          'obecnosc',
          `marker \`${a.marker}\` (${a.e}) jest podciągiem markera \`${b.marker}\` ` +
            `(${b.e}) — odczyt tekstowy meldowałby \`${a.e}\` wszędzie tam, gdzie ` +
            `naprawdę jest \`${b.e}\``,
        );

  // 5. IZOLACJA: co sonda naprawdę wciągnęła. Odczyt z metafile bundlera, czyli
  //    z tego, komu przypisał bajty w wyjściu — nie z listy importów w źródle.
  //    Rozjazd nie znaczy „błąd": znaczy „konsument zaczął płacić za coś innego niż
  //    wczoraj i ma to być widoczne w review".
  for (const e of zrodla) {
    const zmierzone = new Set(
      (sondy[e]?.wniesione ?? []).filter((x) => x !== e),
    );
    const zapisane = new Set(wiersze.get(e)?.wniesione ?? []);
    if (!rowne(zmierzone, zapisane))
      throw doZapisu(
        'izolacja',
        `import \`@pacit/components${e === PRIMARY ? '' : e.slice(1)}\` wciąga inny ` +
          `zestaw entrypointów niż zapisany:\n` +
          `      snapshot: ${lista(zapisane)}\n` +
          `      pomiar:   ${lista(zmierzone)}\n` +
          `    Jeśli to zamierzone — \`node tools/check-bundle.mjs --write\`. Jeśli nie, ` +
          `szukaj importu z innego entrypointu w \`${PROJEKT}${e === PRIMARY ? '/src' : e.slice(1)}\``,
      );
  }

  // 6. Ten sam pomiar, drugi odczyt: po TEKŚCIE zbudowanego bundla. Metafile mówi,
  //    komu bundler przypisał bajty; tekst mówi, co w tych bajtach naprawdę stoi.
  //    Porównanie idzie w OBIE strony, bo każda łapie co innego: marker bez wpisu
  //    w metafile to treść, która weszła drogą, o której bundler nie raportuje;
  //    wpis bez markera to entrypoint policzony, choć nic z niego nie zostało.
  for (const e of zrodla) {
    const wTekscie = new Set(sondy[e]?.wTekscie ?? []);
    const oczekiwane = new Set(
      (sondy[e]?.wniesione ?? []).filter(zKomponentami),
    );
    if (!rowne(wTekscie, oczekiwane))
      throw new BladBundla(
        'markery',
        `dwa odczyty zawartości sondy \`${e}\` się rozjechały:\n` +
          `      metafile bundlera: ${lista(oczekiwane)}\n` +
          `      markery w tekście: ${lista(wTekscie)}\n` +
          `    Marker w tekście bez wpisu w metafile znaczy treść wniesioną drogą, ` +
          `której bundler nie przypisał do modułu. Wpis bez markera — entrypoint ` +
          `policzony, choć nic z niego nie przetrwało`,
      );
  }

  // 7. Zależności zewnętrzne per entrypoint. Tu mieszka literalne „w bundlu z `button`
  //    nie ma CDK Overlay": snapshot zapisuje `@angular/cdk/overlay` przy `./select`
  //    i nigdzie indziej, więc drugi entrypoint, który po nią sięgnie, jest linią
  //    w diffie. Ten sam mechanizm obejmie każdą przyszłą zależność, także taką,
  //    o której dziś nikt nie pomyślał — dlatego punkt porównuje ZBIÓR, a nie szuka
  //    wpisanej z góry nazwy.
  for (const e of zrodla) {
    const zmierzone = new Set(sondy[e]?.zewnetrzne ?? []);
    const zapisane = new Set(wiersze.get(e)?.zewnetrzne ?? []);
    if (!rowne(zmierzone, zapisane))
      throw doZapisu(
        'zewnetrzne',
        `import \`@pacit/components${e === PRIMARY ? '' : e.slice(1)}\` ciągnie inny ` +
          `zestaw zależności zewnętrznych niż zapisany:\n` +
          `      snapshot: ${lista(zapisane)}\n` +
          `      pomiar:   ${lista(zmierzone)}`,
      );
  }

  // 8. Budżet rozmiaru. Liczba jest surowym rozmiarem zminifikowanego bundla sondy,
  //    z Angularem jako zależnością zewnętrzną — czyli mierzy WKŁAD BIBLIOTEKI, a nie
  //    wagę cudzego frameworka. Gdyby Angular wchodził do pomiaru, każdy jego patch
  //    przepisywałby cały snapshot i budżet przestałby mówić cokolwiek o tej bibliotece.
  for (const e of zrodla) {
    const zmierzony = sondy[e]?.bajty;
    const zapisany = wiersze.get(e)?.bajty;
    if (typeof zmierzony !== 'number' || typeof zapisany !== 'number')
      throw doZapisu(
        'rozmiar',
        `brak rozmiaru dla \`${e}\` (pomiar: ${zmierzony ?? 'brak'}, ` +
          `snapshot: ${zapisany ?? 'brak'})`,
      );
    const luz = Math.max(TOLERANCJA_MIN, Math.round(zapisany * TOLERANCJA));
    if (Math.abs(zmierzony - zapisany) > luz)
      throw doZapisu(
        'rozmiar',
        `rozmiar sondy \`${e}\` wyszedł poza budżet: ${zmierzony} B wobec ` +
          `${zapisany} B ± ${luz} B (${(((zmierzony - zapisany) / zapisany) * 100).toFixed(1)}%).\n` +
          `    ${
            zmierzony > zapisany
              ? 'Wzrost jest do przyjęcia, ale w widocznej linii diffa'
              : 'Spadek też wymaga spojrzenia: pomiar, który cichnie, wygląda tak samo jak kod, który schudł'
          } — \`node tools/check-bundle.mjs --write\``,
      );
  }

  // 9. KONTROLA RÓŻNICOWA. Sonda dwóch entrypointów musi być zauważalnie większa niż
  //    każda z pojedynczych — inaczej pomiar nic nie mierzy. Ten punkt zapala dokładnie
  //    w scenariuszu, w którym wszystkie pozostałe wyglądają zdrowo: bundler przestał
  //    wciągać bibliotekę (zły alias, za szeroka lista `external`), więc każda sonda
  //    waży tyle samo i różnica znika.
  //
  //    Próg nie jest wzięty z sufitu: bundle sumy zawiera obie biblioteki, a policzony
  //    dwa razy jest tylko ich wspólny rdzeń. Stąd `a + b - wspólne`, z tolerancją na
  //    glue kodu wejściowego.
  const [pierwszy, drugi] = we.para?.entrypointy ?? [];
  const bajtyPary = we.para?.bajty;
  if (!pierwszy || !drugi || typeof bajtyPary !== 'number')
    throw new BladBundla(
      'roznicowa',
      `brak sondy dwóch entrypointów — kontrola różnicowa nie ma czego porównać`,
    );
  const wspolne = new Set(
    (sondy[pierwszy]?.wniesione ?? []).filter(
      (x) => x !== pierwszy && (sondy[drugi]?.wniesione ?? []).includes(x),
    ),
  );
  const bajtyWspolnych = [...wspolne].reduce(
    (n, x) => n + (sondy[x]?.bajty ?? 0),
    0,
  );
  const oczekiwane =
    (sondy[pierwszy]?.bajty ?? 0) + (sondy[drugi]?.bajty ?? 0) - bajtyWspolnych;
  if (bajtyPary < oczekiwane * (1 - TOLERANCJA))
    throw new BladBundla(
      'roznicowa',
      `sonda \`${pierwszy}\` + \`${drugi}\` waży ${bajtyPary} B, a suma pojedynczych ` +
        `bez wspólnego rdzenia to ${oczekiwane} B ` +
        `(${sondy[pierwszy]?.bajty} + ${sondy[drugi]?.bajty} − ${bajtyWspolnych}).\n` +
        `    Dwa entrypointy dają bundle nie większy niż jeden — to nie jest dobra ` +
        `wiadomość o tree-shakingu, tylko znak, że pomiar przestał wciągać bibliotekę`,
    );

  // 10. Drugi odczyt CAŁEJ bramki: to samo zmierzone prawdziwym `@angular/build:
  //     application`, czyli tym, co u konsumenta naprawdę składa aplikację. Sondy wyżej
  //     idą własnym esbuildem — szybkim, ale będącym MOIM ustawieniem bundlera, nie
  //     jego. Ten sam ruch co „nie czytaj `include`, uruchom kompilator" z A7 i „nie
  //     czytaj tekstu arkusza, uruchom sass" z A5.
  //
  //     Trzecia sonda (komplet entrypointów) jest mianownikiem dwóch pierwszych:
  //     dowodzi, że ten odczyt w ogóle POTRAFI zobaczyć to, czego w nich nie znajduje.
  const przebiegi = we.builder ?? [];
  if (przebiegi.length < 3)
    throw new BladBundla(
      'builder',
      `prawdziwym builderem Angulara poszło ${przebiegi.length} sond, a potrzeba ` +
        `trzech: dwie mierzone i jedna z kompletem entrypointów, która dowodzi, ` +
        `że pozostałe potrafią cokolwiek znaleźć`,
    );
  for (const p of przebiegi) {
    const oczekiwane = new Set(
      (p.entrypointy ?? []).flatMap((e) =>
        (sondy[e]?.wniesione ?? [e]).filter(zKomponentami),
      ),
    );
    const znalezione = new Set(p.znalezione ?? []);
    if (!rowne(znalezione, oczekiwane))
      throw new BladBundla(
        'builder',
        `prawdziwy build aplikacji importującej ${lista(p.entrypointy ?? [])} ` +
          `zawiera inny zestaw entrypointów, niż wynika z sond esbuilda:\n` +
          `      z sond esbuilda: ${lista(oczekiwane)}\n` +
          `      w prawdziwym bundlu: ${lista(znalezione)}\n` +
          `    Rozjazd znaczy, że szybki pomiar tej bramki przestał odpowiadać temu, ` +
          `co dostaje konsument — i to pomiar jest do naprawy, nie prawdziwy build`,
      );
    const oczekiwanyOverlay = [...oczekiwane].some((e) =>
      (sondy[e]?.zewnetrzne ?? []).some((z) => z.includes('cdk/overlay')),
    );
    if ((p.overlay ?? false) !== oczekiwanyOverlay)
      throw new BladBundla(
        'builder',
        `prawdziwy build aplikacji importującej ${lista(p.entrypointy ?? [])} ` +
          `${p.overlay ? 'ZAWIERA' : 'NIE zawiera'} nakładki CDK (\`${MARKER_OVERLAY}\`), ` +
          `a wg sond esbuilda ${oczekiwanyOverlay ? 'powinien' : 'nie powinien'}.\n` +
          `    CDK Overlay jest najdroższą zależnością opcjonalną tej biblioteki — ` +
          `konsument, który nie użył \`pct-select\`, nie ma prawa jej dostać`,
      );
  }

  const suma = zrodla.reduce((n, e) => n + (sondy[e]?.bajty ?? 0), 0);
  return {
    opis:
      `${zrodla.length} entrypointów, ${suma} B razem, największy ` +
      `${zrodla.reduce((a, b) => ((sondy[a]?.bajty ?? 0) >= (sondy[b]?.bajty ?? 0) ? a : b))}; ` +
      `prawdziwym builderem ${przebiegi.length} sondy`,
    snapshot: renderujSnapshot(zrodla, sondy),
  };
};

const rowne = (a, b) => a.size === b.size && [...a].every((x) => b.has(x));

// ── snapshot ──────────────────────────────────────────────────────────────────

/**
 * Ten sam wybór formatu co w `libs/components/czesci.snapshot.md` i `libs/tokens/
 * tokens.snapshot.md`, i z tego samego powodu: tabela markdowna po przejściu prettiera
 * wyrównuje kolumny do najdłuższej komórki, więc jedna długa nazwa przepisuje CAŁY plik,
 * a diff przestaje pokazywać, co się naprawdę zmieniło.
 */
const renderujSnapshot = (zrodla, sondy) =>
  [
    '# Snapshot rozmiaru i izolacji entrypointów',
    '',
    '> **Ten plik jest generowany.** Nie edytuj go ręcznie —',
    '> `node tools/check-bundle.mjs --write`. Bramka `check-bundle` odrzuca rozjazd.',
    '',
    '„Komponenty importuje się przez secondary entrypoints, co wymusza tree-shaking"',
    'jest obietnicą sprzedażową ([`req-project-tree-shaking`](../../docs/requirements/project.md#req-project-tree-shaking))',
    '— tą, dla której ktoś tę bibliotekę wybiera. Jej złamanie nie daje ani jednego',
    'czerwonego testu: import z sąsiedniego entrypointu kompiluje się, przechodzi testy',
    'i dokłada konsumentowi kilkadziesiąt kilobajtów, o których dowie się z własnego',
    'raportu bundla, jeśli go ma.',
    '',
    'Ten plik jest listą, wobec której mierzy się zmianę. Rozjazd nie znaczy „błąd" —',
    'znaczy „konsument zaczął płacić za coś innego niż wczoraj, i ma to być widoczne',
    'w review".',
    '',
    'Kolumny: entrypoint · rozmiar w bajtach · wniesione inne entrypointy · zależności',
    'zewnętrzne. Rozmiar jest surowym rozmiarem zminifikowanego bundla aplikacji, która',
    'importuje **wyłącznie** ten jeden entrypoint, z Angularem jako zależnością',
    'zewnętrzną — mierzy więc wkład **tej biblioteki**, a nie wagę cudzego frameworka.',
    `Budżet: ±${(TOLERANCJA * 100).toFixed(0)}% albo ±${TOLERANCJA_MIN} B, co większe.`,
    '',
    '```',
    ...zrodla.map((e) =>
      [
        e,
        sondy[e]?.bajty ?? 0,
        [...(sondy[e]?.wniesione ?? [])]
          .filter((x) => x !== e)
          .sort()
          .join(',') || '-',
        [...(sondy[e]?.zewnetrzne ?? [])].sort().join(',') || '-',
      ].join(' '),
    ),
    '```',
    '',
  ].join('\n');

/**
 * Wiersze danych jako mapa `entrypoint → { bajty, wniesione, zewnetrzne }`.
 *
 * Brak pliku (`null`) jest tu pustą mapą, a nie awarią, choć punkt 3 łapie ten
 * przypadek osobno i wcześniej — patrz komentarz przy `sprawdzBundle`. Filtr wierszy
 * przepuszcza ukośnik w `./select` świadomie: w `check-parts` dokładnie ten znak
 * wypadł z klasy znaków, obie listy wyszły puste, puste okazały się sobie równe
 * i bramka odrzuciła zmianę, podając poprawną diagnozę problemu, którego nie było
 * ([`lesson-50`](../docs/lessons.md#lesson-50)).
 */
const wierszeSnapshotu = (tresc) => {
  const out = new Map();
  for (const w of (tresc ?? '').split('\n')) {
    if (!/^\.(\/[a-z0-9-]+)?\s/.test(w)) continue;
    const [e, bajty, wniesione, zewnetrzne] = w.trim().split(/\s+/);
    out.set(e, {
      bajty: Number(bajty),
      wniesione: wniesione === '-' ? [] : (wniesione ?? '').split(','),
      zewnetrzne: zewnetrzne === '-' ? [] : (zewnetrzne ?? '').split(','),
    });
  }
  return out;
};

// ── pomiar ────────────────────────────────────────────────────────────────────

const czytajJson = (sciezka) =>
  existsSync(sciezka) ? JSON.parse(readFileSync(sciezka, 'utf8')) : null;

/**
 * Entrypointy ze ŹRÓDEŁ, z indeksu gita — ten sam powód co w `check-styles`,
 * `check-tokens`, `check-parts` i `check-typecheck`: indeks jest niezależnym spisem
 * tego, co repozytorium naprawdę wiezie, a nie tego, co akurat leży na dysku.
 *
 * Pathspec jest KATALOGIEM, a filtrowanie siedzi w JS-ie: pathspec gita nie jest globem
 * powłoki i bez `:(glob)` gwiazdka przechodzi przez `/`, więc wzorzec z gwiazdką potrafi
 * zwrócić ZERO plików zamiast błędu ([`lesson-48`](../docs/lessons.md#lesson-48)).
 */
const entrypointyZeZrodel = () =>
  execFileSync('git', ['ls-files', '-z', PROJEKT], {
    cwd: ROOT,
    encoding: 'utf8',
  })
    .split('\0')
    .filter((p) =>
      /^libs\/components\/([a-z0-9-]+\/)?ng-package\.json$/.test(p),
    )
    .map((p) => {
      const katalog = p.slice(`${PROJEKT}/`.length, -'ng-package.json'.length);
      return katalog === '' ? PRIMARY : `./${katalog.slice(0, -1)}`;
    })
    .sort();

/**
 * Plik FESM każdego entrypointu, z mapy `exports` artefaktu — czyli tą samą drogą,
 * którą pójdzie konsument. Wpis, którego w mapie nie ma, jest dla niego nieosiągalny,
 * choćby plik leżał w pakiecie.
 */
const plikiEntrypointow = (manifest) => {
  const out = new Map();
  for (const [wejscie, cel] of Object.entries(manifest?.exports ?? {})) {
    const plik = typeof cel === 'object' ? cel?.default : cel;
    if (typeof plik === 'string' && plik.endsWith('.mjs'))
      out.set(wejscie, plik);
  }
  return out;
};

/**
 * Markery: selektory komponentów i dyrektyw ze ZBUDOWANEGO pakietu, odczytane po
 * zlinkowaniu (`ɵcmp.selectors`) — ta sama maszyneria co w `check-parts` i z tego
 * samego powodu: pakiet jest skompilowany częściowo, więc definicja powstaje dopiero
 * przy dostępie, tak jak u konsumenta.
 *
 * Dlaczego selektor, a nie dowolny napis unikalny dla entrypointu: napisy z FESM-a
 * przeżywają minifikację, ale NIE przeżywają linkowania — zmierzone, nie założone.
 * `button[pctButton]` stoi w FESM-ie jako jeden napis, a w prawdziwym bundlu jako
 * `[["button","pctButton",""]]`, więc marker wzięty z tekstu FESM-a byłby w punkcie 10
 * nie do znalezienia i „nie ma tu `PctButton`" wychodziłoby na zielono zawsze.
 * Selektor przeżywa oba kroki, bo w obu jest DANĄ, a nie nazwą.
 *
 * Z tokenów selektora zostają wyłącznie te z prefiksem `pct` — `button` w
 * `button[pctButton]` jest nazwą znacznika HTML i pasowałby do wszystkiego.
 */
const zbierzMarkery = async (dist, pliki) => {
  await import('@angular/compiler');
  const out = {};
  for (const [wejscie, plik] of pliki) {
    const modul = await import(
      pathToFileURL(join(dist, plik.replace(/^\.\//, ''))).href
    );
    const markery = new Set();
    for (const wartosc of Object.values(modul)) {
      if (typeof wartosc !== 'function') continue;
      const def = wartosc['ɵcmp'] ?? wartosc['ɵdir'];
      for (const token of (def?.selectors ?? []).flat())
        if (typeof token === 'string' && /^pct[-A-Z]/.test(token))
          markery.add(token);
    }
    out[wejscie] = [...markery].sort();
  }
  return out;
};

/**
 * Katalog, w którym sondy widzą pakiet POD JEGO WŁASNĄ NAZWĄ, przez `node_modules`.
 * Nie przez `alias` bundlera i nie przez `paths` tsconfiga — jedno i drugie omija mapę
 * `exports`, czyli tę część manifestu, która u konsumenta decyduje, co jest w ogóle
 * osiągalne. Sonda z aliasem byłaby zielona także wtedy, gdyby `exports` nie istniało.
 */
const przygotujKatalogSond = (dist) => {
  const katalog = mkdtempSync(join(tmpdir(), 'pct-check-bundle-'));
  mkdirSync(join(katalog, 'node_modules/@pacit'), { recursive: true });
  symlinkSync(dist, join(katalog, 'node_modules/@pacit/components'));
  return katalog;
};

const specyfikator = (e) =>
  e === PRIMARY ? '@pacit/components' : `@pacit/components${e.slice(1)}`;

/**
 * Jedna sonda: aplikacja importująca podane entrypointy i NIC więcej.
 *
 * `globalThis` na końcu jest tu po coś: bez użycia zaimportowanego namespace'u bundler
 * ma prawo wyrzucić wszystko i sonda byłaby pusta — a pusta sonda przechodzi każdy
 * punkt o izolacji, bo nie ma w niej niczego. Import namespace'u zatrzymuje więc
 * MAKSIMUM tego, co entrypoint wystawia, i mierzony rozmiar jest jego górnym
 * ograniczeniem, a izolacja — badana w najgorszym przypadku.
 *
 * Angular jest zależnością ZEWNĘTRZNĄ: mierzymy wkład tej biblioteki, a nie wagę
 * frameworka. `@pacit/components/*` zewnętrzne być nie może — wtedy nie dałoby się
 * zobaczyć, że `button` wciągnął `field`, czyli zniknęłaby cała mierzona rzecz.
 */
const sonda = async (esbuild, katalog, markery, poPliku, entrypointy) => {
  // Nazwa pliku wejściowego jest STAŁA, bo rozmiar bundla jest tu mierzoną wielkością:
  // nazwa z licznikiem albo znacznikiem czasu potrafi wejść do wyjścia i budżet
  // zaczyna mierzyć długość ścieżki. Sondy idą po kolei i plik znika po każdej.
  const wejscie = join(katalog, 'sonda.mjs');
  writeFileSync(
    wejscie,
    entrypointy
      .map((e, i) => `import * as m${i} from '${specyfikator(e)}';`)
      .join('\n') +
      `\nglobalThis.__pctSonda = [${entrypointy.map((_, i) => `m${i}`).join(',')}];\n`,
  );
  const wynik = await esbuild.build({
    entryPoints: [wejscie],
    bundle: true,
    minify: true,
    format: 'esm',
    platform: 'browser',
    write: false,
    metafile: true,
    external: ['@angular/*', 'rxjs', 'rxjs/*', 'tslib'],
  });
  rmSync(wejscie, { force: true });

  const tekst = wynik.outputFiles[0].text;
  const wyjscie = Object.values(wynik.metafile.outputs)[0];
  const wniesione = Object.entries(wyjscie.inputs)
    .filter(([, v]) => v.bytesInOutput > 0)
    .map(([k]) => poPliku.get(k.split('/').pop()))
    .filter(Boolean);

  return {
    bajty: tekst.length,
    wniesione: [...new Set(wniesione)].sort(),
    zewnetrzne: [
      ...new Set(wyjscie.imports.filter((i) => i.external).map((i) => i.path)),
    ].sort(),
    wTekscie: Object.entries(markery)
      .filter(([, m]) => m.length > 0 && m.some((x) => tekst.includes(x)))
      .map(([e]) => e)
      .sort(),
  };
};

/**
 * Prawdziwy build aplikacji Angulara. Workspace powstaje w `tmp/` repozytorium,
 * a nie w katalogu tymczasowym systemu, i to nie z wygody: rozwiązywanie modułów
 * ma iść w górę drzewa do `node_modules` repozytorium, więc `@angular/*` znajduje się
 * samo, a lokalne `node_modules/@pacit/components` dokłada wyłącznie mierzony pakiet.
 * `tmp/` jest w `.gitignore`, więc pliki sondy nie stają się wadą dla `check-typecheck`
 * (punkt 1: plik TypeScriptu poza jakimkolwiek projektem) — fixture jednej bramki nie
 * może być wadą dla drugiej.
 */
const sondaBuildera = (dist, markery, entrypointy) => {
  const katalog = join(ROOT, 'tmp/check-bundle');
  rmSync(katalog, { recursive: true, force: true });
  mkdirSync(join(katalog, 'src'), { recursive: true });
  mkdirSync(join(katalog, 'node_modules/@pacit'), { recursive: true });
  symlinkSync(dist, join(katalog, 'node_modules/@pacit/components'));

  writeFileSync(
    join(katalog, 'angular.json'),
    JSON.stringify({
      version: 1,
      projects: {
        sonda: {
          projectType: 'application',
          root: '',
          sourceRoot: 'src',
          architect: {
            build: {
              builder: '@angular/build:application',
              options: {
                outputPath: 'out',
                index: false,
                browser: 'src/main.ts',
                tsConfig: 'tsconfig.json',
                optimization: true,
                outputHashing: 'none',
              },
            },
          },
        },
      },
    }),
  );
  writeFileSync(
    join(katalog, 'tsconfig.json'),
    JSON.stringify({
      compilerOptions: {
        target: 'ES2022',
        module: 'preserve',
        moduleResolution: 'bundler',
        skipLibCheck: true,
        strict: true,
      },
      files: ['src/main.ts'],
    }),
  );
  // Namespace, nie nazwane klasy: lista eksportów każdego entrypointu jest inna,
  // a `imports:` komponentu przyjmuje wyłącznie dyrektywy. `Reflect.set` zatrzymuje
  // całość tak samo jak `globalThis` w sondzie esbuilda i z tego samego powodu —
  // wywołanie jest efektem ubocznym, więc nie ma go jak wyrzucić.
  writeFileSync(
    join(katalog, 'src/main.ts'),
    [
      ...entrypointy.map(
        (e, i) => `import * as m${i} from '${specyfikator(e)}';`,
      ),
      `import { bootstrapApplication } from '@angular/platform-browser';`,
      `import { Component } from '@angular/core';`,
      ``,
      `Reflect.set(globalThis, '__pctSonda', [${entrypointy
        .map((_, i) => `m${i}`)
        .join(',')}]);`,
      ``,
      `@Component({ selector: 'app-root', template: '' })`,
      `export class App {}`,
      ``,
      `bootstrapApplication(App);`,
    ].join('\n'),
  );

  execFileSync(
    'node',
    [join(ROOT, 'node_modules/@angular/cli/bin/ng.js'), 'build', 'sonda'],
    { cwd: katalog, stdio: 'pipe' },
  );
  const bundle = readFileSync(join(katalog, 'out/browser/main.js'), 'utf8');
  rmSync(katalog, { recursive: true, force: true });

  return {
    entrypointy,
    znalezione: Object.entries(markery)
      .filter(([, m]) => m.length > 0 && m.some((x) => bundle.includes(x)))
      .map(([e]) => e)
      .sort(),
    overlay: bundle.includes(MARKER_OVERLAY),
  };
};

/**
 * Pełny pomiar repozytorium. Para do kontroli różnicowej i sondy buildera są WYBIERANE
 * z pomiaru, nie wpisane: najlżejszy i najcięższy entrypoint komponentowy. Lista wpisana
 * na sztywno rozjechałaby się przy pierwszym nowym komponencie — i to bramka przestałaby
 * wtedy widzieć, a nie CI zapaliło.
 */
const zmierzRepozytorium = async () => {
  const dist = join(ROOT, DIST);
  const manifest = czytajJson(join(dist, 'package.json'));
  if (!manifest)
    throw new BladBundla(
      'entrypointy',
      `brak zbudowanego pakietu w ${DIST} — bramka mierzy artefakt, nie źródła.\n` +
        `    Target musi mieć \`dependsOn\` na build biblioteki`,
    );

  const pliki = plikiEntrypointow(manifest);
  // Nazwa pliku FESM → entrypoint. Metafile bundlera mówi o plikach; wszystko powyżej
  // mówi o entrypointach, bo to one są publicznym kontraktem.
  const poPliku = new Map(
    [...pliki].map(([e, plik]) => [plik.split('/').pop(), e]),
  );

  const markery = await zbierzMarkery(dist, pliki);
  const esbuild = await import('esbuild');
  const katalog = przygotujKatalogSond(dist);
  const zrodla = entrypointyZeZrodel();

  try {
    const sondy = {};
    for (const e of pliki.keys())
      sondy[e] = await sonda(esbuild, katalog, markery, poPliku, [e]);

    const komponentowe = [...pliki.keys()]
      .filter((e) => e !== PRIMARY && (markery[e] ?? []).length > 0)
      .sort((a, b) => sondy[a].bajty - sondy[b].bajty);
    const para = [komponentowe.at(0), komponentowe.at(-1)].filter(Boolean);
    const pomiarPary =
      para.length === 2
        ? await sonda(esbuild, katalog, markery, poPliku, para)
        : null;

    return {
      zrodla,
      manifest,
      snapshot: existsSync(join(ROOT, SNAPSHOT))
        ? readFileSync(join(ROOT, SNAPSHOT), 'utf8')
        : null,
      markery,
      sondy,
      para: pomiarPary ? { entrypointy: para, bajty: pomiarPary.bajty } : null,
      builder:
        para.length === 2
          ? [
              sondaBuildera(dist, markery, [para[0]]),
              sondaBuildera(dist, markery, para),
              sondaBuildera(dist, markery, komponentowe),
            ]
          : [],
    };
  } finally {
    rmSync(katalog, { recursive: true, force: true });
  }
};

// ── negative control ──────────────────────────────────────────────────────────

const wczytajFixture = (nazwa) =>
  JSON.parse(readFileSync(join(FIXTURES, nazwa), 'utf8'));

/**
 * Builds a case's input ON A COPY of the reference one, so the case file holds nothing
 * but its own defect — you cannot break something in passing and not notice.
 *
 * Pomiar przychodzi jako DANE, a nie z prawdziwego bundlowania: zbudowanie kilkunastu
 * sond na każdy przypadek kosztowałoby minuty na przebieg, a prawdziwy build Angulara
 * — kwadranse. Ten sam wybór co w `check-zoneless` i `check-parts` i z tego samego
 * powodu. Cenę widać wprost: fixtures NIE ćwiczą kodu bundlującego — ćwiczą cały układ
 * kontroli. Bundlowanie jest za to ćwiczone przy każdym przebiegu na prawdziwym
 * repozytorium.
 *
 * Snapshot wejścia wzorcowego jest RENDEROWANY z jego własnego pomiaru, a nie wpisany
 * obok niego: wpisany rozjeżdżałby się z rendererem przy pierwszej zmianie formatu
 * pliku i wejście wzorcowe przestawałoby przechodzić z powodu, którego nikt nie badał.
 */
const zlozFixture = (fx) => {
  const baza = structuredClone(wczytajFixture(BAZA));
  const we = {
    zrodla: [...baza.zrodla],
    manifest: structuredClone(baza.manifest),
    markery: structuredClone(baza.markery),
    sondy: structuredClone(baza.sondy),
    para: structuredClone(baza.para),
    builder: structuredClone(baza.builder),
  };

  if (fx.wyczyscZrodla) we.zrodla = [];
  if (fx.usunZeZrodel)
    we.zrodla = we.zrodla.filter((e) => e !== fx.usunZeZrodel);
  if (fx.usunZExports) delete we.manifest.exports[fx.usunZExports];
  if (fx.sideEffects !== undefined) we.manifest.sideEffects = fx.sideEffects;
  if (fx.usunSonde) delete we.sondy[fx.usunSonde];
  if (fx.sondaBezSwojego)
    we.sondy[fx.sondaBezSwojego].wniesione = we.sondy[
      fx.sondaBezSwojego
    ].wniesione.filter((e) => e !== fx.sondaBezSwojego);
  if (fx.primaryWnosi)
    we.sondy[PRIMARY].wniesione = [
      ...we.sondy[PRIMARY].wniesione,
      fx.primaryWnosi,
    ].sort();
  if (fx.usunMarkery) we.markery[fx.usunMarkery] = [];
  if (fx.dodajMarker) we.markery[fx.dodajMarker.ep] = fx.dodajMarker.markery;
  if (fx.dodajWniesiony)
    we.sondy[fx.dodajWniesiony.ep].wniesione = [
      ...we.sondy[fx.dodajWniesiony.ep].wniesione,
      fx.dodajWniesiony.co,
    ].sort();
  if (fx.dodajWTekscie)
    we.sondy[fx.dodajWTekscie.ep].wTekscie = [
      ...we.sondy[fx.dodajWTekscie.ep].wTekscie,
      fx.dodajWTekscie.co,
    ].sort();
  if (fx.usunWTekscie)
    we.sondy[fx.usunWTekscie.ep].wTekscie = we.sondy[
      fx.usunWTekscie.ep
    ].wTekscie.filter((e) => e !== fx.usunWTekscie.co);
  if (fx.dodajZewnetrzny)
    we.sondy[fx.dodajZewnetrzny.ep].zewnetrzne = [
      ...we.sondy[fx.dodajZewnetrzny.ep].zewnetrzne,
      fx.dodajZewnetrzny.co,
    ].sort();
  if (fx.rozmiar) we.sondy[fx.rozmiar.ep].bajty = fx.rozmiar.bajty;
  if (fx.paraBajty !== undefined) we.para.bajty = fx.paraBajty;
  if (fx.builderZnalezione)
    we.builder[fx.builderZnalezione.i].znalezione =
      fx.builderZnalezione.znalezione;
  if (fx.builderOverlay)
    we.builder[fx.builderOverlay.i].overlay = fx.builderOverlay.overlay;
  if (fx.usunBuilder) we.builder = we.builder.slice(0, -1);

  // Snapshot renderowany z pomiaru WZORCOWEGO, potem psuty osobno — dzięki temu
  // przypadki celujące w punkty 5, 7 i 8 psują POMIAR, a nie zapis, czyli dokładnie
  // tę stronę porównania, o którą chodzi.
  let snapshot = renderujSnapshot(baza.zrodla, baza.sondy);
  if (fx.usunSnapshot) snapshot = null;
  else if (fx.snapshotBezWiersza)
    snapshot = snapshot
      .split('\n')
      .filter((w) => !w.startsWith(`${fx.snapshotBezWiersza} `))
      .join('\n');
  else if (fx.snapshotZObcymWierszem)
    snapshot = snapshot.replace(
      '```\n',
      `\`\`\`\n${fx.snapshotZObcymWierszem} 100 - @angular/core\n`,
    );
  we.snapshot = snapshot;
  return we;
};

// ── the run ───────────────────────────────────────────────────────────────────

const problems = [];
let opis = null;

try {
  const wynik = sprawdzBundle(await zmierzRepozytorium());
  opis = wynik.opis;
} catch (blad) {
  if (!(blad instanceof BladBundla)) throw blad;
  // `--write` istnieje po to, żeby rozjazd snapshotu dało się zaakceptować jednym
  // poleceniem. Pozostałe punkty zostają błędem także z nim: przepisanie snapshotu
  // nie jest odpowiedzią na entrypoint, który zaczął wciągać sąsiada.
  if (
    WRITE &&
    ['snapshot', 'izolacja', 'zewnetrzne', 'rozmiar'].includes(blad.kontrola) &&
    blad.snapshot
  ) {
    writeFileSync(join(ROOT, SNAPSHOT), blad.snapshot);
    console.log(
      `✓ Rewrote ${SNAPSHOT}. Run the gate once more — the negative control did not run ` +
        `in this pass.`,
    );
    process.exit(0);
  }
  problems.push(`${blad.kontrola}: ${blad.message}`);
}

const przypadki = readdirSync(FIXTURES)
  .filter((n) => n.endsWith('.json') && n !== BAZA)
  .sort();

if (przypadki.length === 0)
  problems.push(
    `tools/check-bundle.fixtures: no prepared inputs — a gate with no proof that it can ` +
      `fail is one more silent defect (req-quality-negative-control)`,
  );

// Wejście wzorcowe MUSI przejść: gdyby samo było wadliwe, każdy przypadek zapalałby
// z jego powodu, a nie ze swojego, i wszystkie „odrzucone" byłyby fałszywe — czyli ta
// kontrola stałaby się tym, przed czym stoi.
try {
  sprawdzBundle(zlozFixture({}));
} catch (blad) {
  if (!(blad instanceof BladBundla)) throw blad;
  problems.push(
    `${BAZA}: the reference input does NOT pass (${blad.kontrola}) — ` +
      `every prepared case now fires because of it.\n    ${blad.message}`,
  );
}

for (const nazwa of przypadki) {
  const fx = wczytajFixture(nazwa);
  try {
    sprawdzBundle(zlozFixture(fx));
    problems.push(
      `${nazwa}: the prepared input PASSED and was meant not to — ` +
        `point ${fx.punkt} (\`${fx.kontrola}\`) stopped examining anything`,
    );
  } catch (blad) {
    if (!(blad instanceof BladBundla)) throw blad;
    if (blad.kontrola !== fx.kontrola)
      problems.push(
        `${nazwa}: check \`${blad.kontrola}\` fired, and point ${fx.punkt} ` +
          `(\`${fx.kontrola}\`) was meant to — the fixture proves something other than what it declares`,
      );
  }
}

// ── result ────────────────────────────────────────────────────────────────────

if (problems.length) {
  console.error(`X Tree-shaking gate — ${problems.length} violations:\n`);
  for (const p of problems) console.error(`  - ${p}`);
  console.error('');
  process.exit(1);
}

console.log(
  `✓ Bundle: ${opis}. Negative control: the reference input passes, ` +
    `${przypadki.length} prepared ones rejected on their own points.`,
);
