#!/usr/bin/env node
/**
 * Bramka fundamentu: sprawdza, czy `zone.js` naprawdę zniknął z projektu i czy każdy
 * zbudowany komponent jest OnPush — czyli czy dwie obietnice, które dziś opierają się
 * na tym, że nikt ich nie cofnie, mają za sobą pomiar.
 *
 * Powód istnienia. `lekcja-8` kończy się zdaniem „powrót do trybu zone-based jest
 * niemożliwy przez przypadek", a stoi za nim jednorazowy przebieg z lipca: ktoś raz
 * odinstalował pakiet i raz sprawdził, że w runtime nie ma `window.Zone`. Ręczny przebieg
 * nie istnieje między sesjami (`lekcja-36`) — `npm i zone.js` przy okazji innego zadania
 * cofa go bez jednego czerwonego testu, bo `zone.js` jest OPCJONALNYM peerem
 * `@angular/core`, a runner testów przy nieudanym `resolve('zone.js')` po cichu
 * przechodzi w tryb bez zone. Instalacja niczego nie psuje — tylko cicho przywraca
 * to, czego projekt się wyrzekł.
 *
 * Symetrycznie `wym-api-fundament`: OnPush jest w Angularze v22+ DOMYŚLNE i oficjalny
 * przewodnik zabrania ustawiania go jawnie (`lekcja-11`). Obietnica „każdy komponent jest
 * OnPush" opiera się więc na cudzej wartości domyślnej — a wartości domyślne się zmieniają.
 * Jedyna uczciwa forma tej obietnicy to pomiar `ɵcmp.onPush` na zbudowanym pakiecie,
 * powtarzany przy każdym przebiegu.
 *
 * Sprawdzane jest sześć rzeczy:
 *  1. żaden manifest w repozytorium nie deklaruje `zone.js`,
 *  2. `package-lock.json` nie ma go w drzewie — także zagnieżdżonego pod cudzym pakietem,
 *  3. zbudowany pakiet nie zawiera ani jednego śladu runtime zone,
 *  4. MIANOWNIK: każdy komponent ze źródeł jest w zbudowanym pakiecie,
 *  5. każdy komponent w pakiecie ma `ɵcmp.onPush === true` i `ɵcmp.standalone === true`,
 *  6. żaden `@Component` nie ustawia `changeDetection` ani `standalone` jawnie.
 *
 * Punkt 4 jest tym, bez którego punkt 5 nic nie znaczy — to ta sama nauka co w
 * `check-coverage`: „każdy" liczone na próbce dobranej przez samego mierzonego jest
 * zdaniem o próbce, nie o bibliotece. Komponent, który wypadł z pakietu, przestałby
 * być sprawdzany, a przebieg dalej byłby zielony.
 *
 * Skąd `ɵcmp` jest czytany. Z `dist/`, a nie ze źródeł, i to jest istotne: pakiet jest
 * kompilowany CZĘŚCIOWO (`ɵɵngDeclareComponent`), a deklaracja częściowa **pomija**
 * `changeDetection`, gdy jest domyślne — wartość powstaje dopiero przy linkowaniu,
 * z domyślnych zainstalowanego Angulara. Odczyt przez JIT (`import '@angular/compiler'`)
 * odtwarza dokładnie ten krok, więc podbicie Angulara zmieniające domyślne zapala tę
 * bramkę — a o to w `wym-api-fundament` chodzi. Odczyt ze źródeł mierzyłby nasz zapis,
 * nie to, co dostanie konsument (`lekcja-36`).
 *
 * Do tego siódmy przebieg, który nie bada projektu, tylko TĘ BRAMKĘ: kontrola odniesienia
 * z `tools/check-zoneless.fixtures/`. Spreparowane wejścia, z których każde łamie dokładnie
 * jeden z sześciu punktów i musi zostać odrzucone przez ten właśnie punkt
 * (`wym-jakosc-kontrola`).
 *
 * Użycie:
 *   node tools/check-zoneless.mjs
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

/** Pola manifestu, w których `zone.js` znaczy „wrócił". */
const POLA_ZALEZNOSCI = [
  'dependencies',
  'devDependencies',
  'peerDependencies',
  'optionalDependencies',
];

/**
 * Ślady runtime zone w zbudowanym kodzie. Świadomie NIE jest to `/zone/i`: w pakiecie
 * są polskie komentarze, a `liczone` zawiera „zone" i dałoby trafienie na pustym miejscu.
 * Każdy wzorzec ma nazwę, bo komunikat „coś ze strefami" nie mówi, czego szukać.
 *
 * `NgZone` jest tu razem z globalnym `Zone`: dla biblioteki to ten sam błąd widziany
 * z drugiej strony — komponent wstrzykujący `NgZone` polega na strefach nawet wtedy,
 * gdy polyfilla nie ma w bundlu, i przewróci się dopiero u konsumenta.
 */
const SLADY = [
  ['import `zone.js`', /(?:from|import|require\()\s*['"]zone\.js/],
  ['wstrzyknięty `NgZone`', /\bNgZone\b/],
  ['`__zone_symbol__`', /__zone_symbol__/],
  [
    'globalny `Zone`',
    /\bZone\s*\.\s*(?:current|root|__load_patch|assertZonePatched)\b/,
  ],
];

/**
 * Dekorator komponentu w źródle. Kotwiczy się na formatowaniu, które wymusza
 * `nx format:check` (`@Component({` i `})` w kolumnie zero) — i właśnie dlatego liczba
 * dopasowań jest osobno porównywana z liczbą samych `@Component(`. Bez tego zmiana
 * formatowania nie wywaliłaby parsera, tylko po cichu ZMNIEJSZYŁA mianownik z punktu 4,
 * a bramka dalej świeciłaby na zielono — czyli dokładnie ta wada, przed którą stoi.
 *
 * Licznik dopuszcza WCIĘCIE, bo do 2026-08-05 tego nie robił i przez to nie robił
 * niczego: powtarzał kotwicę parsera co do znaku, więc przesunięcie dekoratora
 * o jedną spację gasiło obie strony porównania naraz. Zmierzone na tym repozytorium
 * — `PctCheckbox` wcięty o spację dawał „7 komponentów" zamiast ośmiu i przebieg
 * zielony, czyli komponent wypadał z pomiaru OnPush bez śladu (`lekcja-48`).
 * Kontrola porównująca dwa pomiary musi mieć dwa NIEZALEŻNE pomiary; wystąpienia
 * w komentarzu odsiewa `[ \t]*`, bo linia JSDoc zaczyna się od gwiazdki.
 */
const KOMPONENT =
  /^@Component\(\{\r?\n([\s\S]*?)^\}\)\r?\n(?:export\s+)?(?:abstract\s+)?class\s+([A-Za-z_$][\w$]*)/gm;
const KOMPONENT_LICZNIK = /^[ \t]*@Component\(/gm;

/** Opcje, których przewodnik Angulara zabrania powtarzać — są domyślne w v22+. */
const OPCJE_DOMYSLNE = ['changeDetection', 'standalone'];

/**
 * Naruszenie jednej z sześciu kontroli. Niesie identyfikator kontroli, a nie tylko
 * komunikat: kontrola odniesienia musi sprawdzić, że spreparowane wejście zapaliło
 * NA SWOIM punkcie — fixture wywalający się z innego powodu niż wpisany w nim samym
 * dowodzi czegoś innego, niż deklaruje.
 */
class BladZoneless extends Error {
  constructor(kontrola, opis) {
    super(opis);
    this.kontrola = kontrola;
  }
}

/**
 * Komplet kontroli na gotowym wejściu:
 *   `manifesty`  — `[{ plik, dependencies, … }]`,
 *   `pakietyLocka` — klucze `packages` z `package-lock.json`,
 *   `bundle`     — `[{ plik, tekst }]` ze zbudowanego pakietu,
 *   `wejscia`    — pliki, na które wskazuje mapa `exports` (mianownik dla `bundle`),
 *   `zrodla`     — `[{ plik, klasa, jawne }]` z `@Component` w źródłach,
 *   `komponenty` — `[{ klasa, wejscie, onPush, standalone }]` z pakietu.
 * Rzuca `BladZoneless` przy pierwszym naruszeniu — kontrole idą od najbardziej
 * podstawowej, więc dalsze i tak nie miałyby czego badać.
 */
const sprawdzZoneless = ({
  manifesty,
  pakietyLocka,
  bundle,
  wejscia,
  zrodla,
  komponenty,
}) => {
  // 1. Żaden manifest nie deklaruje `zone.js`. Najwcześniejszy moment, w którym da się
  // to zauważyć — zanim ktokolwiek uruchomi `npm install`.
  const zadeklarowany = manifesty.flatMap((m) =>
    POLA_ZALEZNOSCI.filter((pole) => m[pole]?.['zone.js'] !== undefined).map(
      (pole) => `${m.plik} → ${pole}: ${m[pole]['zone.js']}`,
    ),
  );
  if (zadeklarowany.length)
    throw new BladZoneless(
      'manifesty',
      `\`zone.js\` wrócił do manifestu:\n` +
        zadeklarowany.map((z) => `      ${z}`).join('\n') +
        `\n    \`wym-projekt-angular\` żąda USUNIĘCIA pakietu, nie wyłączenia go — ` +
        `sama obecność w zależnościach przywraca tryb zone-based przy pierwszym ` +
        `\`import 'zone.js'\`, a Angular nie powie ani słowa (lekcja-8).`,
    );

  // 2. Drzewo zależności. Manifest to deklaracja, lock to stan faktyczny: `zone.js`
  // potrafi wejść jako zależność cudzego pakietu, więc szukamy też zagnieżdżonych
  // instalacji, nie tylko wpisu na najwyższym poziomie.
  const wDrzewie = pakietyLocka.filter(
    (k) => k === 'node_modules/zone.js' || k.endsWith('/node_modules/zone.js'),
  );
  if (wDrzewie.length)
    throw new BladZoneless(
      'lock',
      `\`zone.js\` jest zainstalowany w drzewie zależności:\n` +
        wDrzewie.map((k) => `      ${k}`).join('\n') +
        `\n    Jest opcjonalnym peerem \`@angular/core\`, więc nic się nie zepsuje ` +
        `i nikt się nie dowie — dopóki ktoś go nie zaimportuje.`,
    );

  // 3. Zbudowany pakiet. Punkty 1 i 2 pilnują wejścia, ten pilnuje wyjścia: to jedyne
  // miejsce, które widzi ślad wniesiony inaczej niż przez `package.json`.
  //
  // Najpierw mianownik samego skanu. Skan chodzi po katalogu, a lista wejść pochodzi
  // z mapy `exports`, czyli z drugiego źródła — więc zmiana układu wyjścia ng-packagr
  // objawia się jako pustka po jednej stronie porównania, a nie jako zielony przebieg
  // po niczym. Bez tego wystarczyłaby zmiana rozszerzenia, żeby punkt 3 przestał
  // cokolwiek czytać i nikt by się nie dowiedział.
  const zeskanowane = new Set(bundle.map((b) => b.plik));
  const nieobjete = wejscia.filter((w) => !zeskanowane.has(w));
  if (nieobjete.length)
    throw new BladZoneless(
      'bundle',
      `skan pakietu pominął ${nieobjete.length} plików, na które wskazuje mapa \`exports\`:\n` +
        nieobjete.map((w) => `      ${w}`).join('\n') +
        `\n    Reszta punktu 3 przeszłaby po zbiorze, w którym tych plików nie ma — ` +
        `czyli po niczym.`,
    );

  const trafienia = bundle.flatMap(({ plik, tekst }) =>
    SLADY.filter(([, wzorzec]) => wzorzec.test(tekst)).map(
      ([nazwa]) => `${plik}: ${nazwa}`,
    ),
  );
  if (trafienia.length)
    throw new BladZoneless(
      'bundle',
      `zbudowany pakiet zawiera ślad runtime zone:\n` +
        trafienia.map((t) => `      ${t}`).join('\n') +
        `\n    Konsument dostaje wtedy bibliotekę, która wymaga stref, mimo że ` +
        `pakiet obiecuje zoneless (wym-api-fundament).`,
    );

  // 4. MIANOWNIK. Bez tego punktu „każdy komponent" z punktu 5 znaczy „każdy, który
  // akurat wszedł do pakietu" — a to zdanie zawsze jest prawdziwe.
  if (!zrodla.length)
    throw new BladZoneless(
      'mianownik',
      `nie znalazłem ani jednego \`@Component\` w źródłach (${PROJEKT}) — ` +
        `punkt 5 przeszedłby wtedy zawsze, bo nie miałby czego mierzyć. ` +
        `Najczęstsza przyczyna: zmiana formatowania dekoratora, na którym kotwiczy się parser.`,
    );

  const wPakiecie = new Map(komponenty.map((k) => [k.klasa, k]));
  const nieobecne = zrodla.filter((z) => !wPakiecie.has(z.klasa));
  if (nieobecne.length)
    throw new BladZoneless(
      'mianownik',
      `${nieobecne.length} komponentów ze źródeł nie ma w zbudowanym pakiecie:\n` +
        nieobecne.map((z) => `      ${z.klasa}  (${z.plik})`).join('\n') +
        `\n    Punkt 5 policzyłby się BEZ nich, więc nie mówi nic o ich strategii ` +
        `detekcji zmian. Lek: eksport z \`index.ts\` swojej bramki.`,
    );

  // 5. Pomiar. `standalone` idzie razem z `onPush`, bo `wym-api-fundament` obiecuje oba
  // i oba są w Angularze v22+ wartościami domyślnymi — czyli obietnicami tej samej klasy.
  const wadliwe = komponenty.filter(
    (k) => k.onPush !== true || k.standalone !== true,
  );
  if (wadliwe.length)
    throw new BladZoneless(
      'onpush',
      `${wadliwe.length} komponentów w pakiecie nie spełnia fundamentu:\n` +
        wadliwe
          .map(
            (k) =>
              `      ${k.klasa} (${k.wejscie}): onPush=${k.onPush}, standalone=${k.standalone}`,
          )
          .join('\n') +
        `\n    Albo ktoś ustawił \`ChangeDetectionStrategy.Default\` jawnie, albo ` +
        `zmieniły się domyślne Angulara — w obu przypadkach obietnica przestała być prawdą.`,
    );

  // 6. Jawność. Odwrotna strona tej samej reguły: skoro pomiar pilnuje WARTOŚCI,
  // to źródło ma nie powtarzać domyślnych (`lekcja-11`). Bez tego punktu jedynym
  // strażnikiem zapisu byłby przegląd kodu.
  const jawne = zrodla.filter((z) => z.jawne?.length);
  if (jawne.length)
    throw new BladZoneless(
      'jawnosc',
      `${jawne.length} komponentów ustawia jawnie opcję, która jest domyślna:\n` +
        jawne
          .map((z) => `      ${z.klasa} (${z.plik}): ${z.jawne.join(', ')}`)
          .join('\n') +
        `\n    Przewodnik Angulara zabrania ich powtarzania w v22+ ` +
        `(wym-api-fundament). Usuń wpis z dekoratora — wartość i tak jest ta sama.`,
    );

  return (
    `${manifesty.length} manifestów i ${pakietyLocka.length} pakietów w locku bez \`zone.js\`, ` +
    `${bundle.length} plików pakietu bez śladu stref, ` +
    `${zrodla.length} komponentów ze źródeł obecnych w pakiecie i wszystkie OnPush`
  );
};

// ── wejście z dysku ───────────────────────────────────────────────────────────

const czytaj = (rel) => readFileSync(join(ROOT, rel), 'utf8');

/**
 * Manifesty z indeksu gita, a nie z listy wpisanej na sztywno: nowy projekt ma być
 * objęty tą bramką od pierwszego commita, bez pamiętania o dopisaniu go tutaj.
 * `inputs` targetu wymieniają ten sam zbiór wzorcem obejmującym każdy `package.json`.
 */
const manifestyRepo = () =>
  execSync('git ls-files', { cwd: ROOT, encoding: 'utf8' })
    .split('\n')
    // Dokładnie `package.json`, nie „cokolwiek kończące się tak samo": pathspec
    // `*package.json` wciąga też `ng-package.json`, czyli konfigurację ng-packagr.
    // Ta nie ma pól zależności, więc nie dałaby fałszywego trafienia — ale rozdęłaby
    // mianownik z komunikatu i przy pierwszym czytaniu kłamałaby o zasięgu bramki.
    .filter((plik) => plik === 'package.json' || plik.endsWith('/package.json'))
    .map((plik) => ({ plik, ...JSON.parse(czytaj(plik)) }));

const pakietyLocka = () =>
  Object.keys(JSON.parse(czytaj('package-lock.json')).packages ?? {});

/**
 * Wykonywalne wyjścia pakietu. Mapy źródeł zostają poza zbiorem same z siebie
 * (`.mjs.map` ma rozszerzenie `.map`) i tak ma być: wiozą kopię ŹRÓDŁA, więc komentarz
 * o strefach dałby w nich trafienie, którego nie ma w kodzie.
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
      `brak zbudowanego pakietu w ${DIST} — uruchom najpierw \`nx build components\``,
    );
  }
  return sciezki.map((s) => ({
    plik: relative(join(ROOT, DIST), s).split('\\').join('/'),
    tekst: readFileSync(s, 'utf8'),
  }));
};

/**
 * Komponenty ze źródeł. Parser jest prosty, ale jego mianownik jest pilnowany:
 * liczba sparsowanych dekoratorów musi się zgadzać z liczbą wystąpień `@Component(`
 * na początku linii. Rozjazd zapala punkt 4 z jasną przyczyną zamiast po cichu
 * zmniejszać zbiór badanych komponentów.
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
      `parser rozpoznał ${out.length} z ${deklaracji} dekoratorów \`@Component\` — ` +
        `reszta wypadłaby z pomiaru bez śladu. Najczęstsza przyczyna: dekorator ` +
        `zapisany inaczej, niż formatuje prettier (\`@Component({\` i \`})\` w kolumnie zero).`,
    );

  return out;
};

/**
 * Wejścia pakietu wg mapy `exports` — `[{ wejscie, plik }]`. Jedno źródło dla dwóch
 * rzeczy naraz: mianownika skanu z punktu 3 i listy modułów do wczytania w punkcie 5.
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
 * Definicje komponentów ze ZBUDOWANEGO pakietu. `@angular/compiler` jest wczytany
 * pierwszy, bo pakiet jest skompilowany częściowo i `ɵcmp` powstaje dopiero przy
 * dostępie — to ten sam krok, który u konsumenta wykonuje linker.
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

// ── kontrola odniesienia ──────────────────────────────────────────────────────

const wczytajFixture = (nazwa) =>
  JSON.parse(readFileSync(join(FIXTURES, nazwa), 'utf8'));

/**
 * Składa wejście przypadku NA KOPII wzorcowego, więc plik przypadku zawiera wyłącznie
 * swoją wadę — nie da się zepsuć czegoś przy okazji i nie zauważyć.
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

// ── przebieg ──────────────────────────────────────────────────────────────────

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
    `tools/check-zoneless.fixtures: brak spreparowanych wejść — bramka bez dowodu, ` +
      `że potrafi nie przejść, jest kolejną cichą wadą (wym-jakosc-kontrola)`,
  );

// Wejście wzorcowe MUSI przejść. Gdyby samo było wadliwe, każdy przypadek zapalałby
// z jego powodu, a nie z powodu swojej wady — i wszystkie „zapaliło" byłyby fałszywe.
try {
  sprawdzZoneless(zlozFixture({}));
} catch (blad) {
  if (!(blad instanceof BladZoneless)) throw blad;
  problems.push(
    `${BAZA}: wejście wzorcowe NIE przechodzi (${blad.kontrola}) — ` +
      `każdy spreparowany przypadek zapala teraz z jego powodu.\n    ${blad.message}`,
  );
}

for (const nazwa of przypadki) {
  const fx = wczytajFixture(nazwa);
  try {
    sprawdzZoneless(zlozFixture(fx));
    problems.push(
      `${nazwa}: spreparowane wejście PRZESZŁO, a miało nie przejść — ` +
        `punkt ${fx.punkt} (\`${fx.kontrola}\`) przestał cokolwiek badać`,
    );
  } catch (blad) {
    if (!(blad instanceof BladZoneless)) throw blad;
    if (blad.kontrola !== fx.kontrola)
      problems.push(
        `${nazwa}: zapaliła kontrola \`${blad.kontrola}\`, a miał punkt ${fx.punkt} ` +
          `(\`${fx.kontrola}\`) — fixture dowodzi czegoś innego, niż deklaruje`,
      );
  }
}

// ── wynik ─────────────────────────────────────────────────────────────────────

if (problems.length) {
  console.error(`X Bramka fundamentu — ${problems.length} naruszeń:\n`);
  for (const p of problems) console.error(`  - ${p}`);
  console.error('');
  process.exit(1);
}

console.log(
  `✓ Fundament: ${opis}. Kontrola odniesienia: wejście wzorcowe przechodzi, ` +
    `${przypadki.length} spreparowanych odrzuconych na swoich punktach.`,
);
