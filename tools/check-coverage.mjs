#!/usr/bin/env node
/**
 * Bramka pokrycia: sprawdza, czy raport pokrycia mierzy CAŁĄ bibliotekę i czy próg
 * z `wym-jakosc-pokrycie` jest naprawdę egzekwowany.
 *
 * Powód istnienia (lekcja-45): sam próg w targecie `test` nie wystarcza, bo v8 liczy
 * procent na próbce dobranej przez samego mierzonego — do raportu wchodzą tylko moduły,
 * które weszły do przebiegu. Plik bez testu potrafi z raportu WYPAŚĆ, a nie pokazać się
 * z zerem: usunięcie `number.spec.ts` podniosło wtedy pokrycie z 96,55% na 96,94%, bo
 * razem z testem zniknął ze statystyki cały nietestowany `number.ts`. Próg pilnujący
 * takiej liczby jest bramką urodzoną martwą (lekcja-39).
 *
 * `coverageInclude` w `project.json` domyka to tylko częściowo: pliki bez testu dokłada
 * przez osobną ścieżkę, która parsuje ŹRÓDŁO, i wywraca się na `import type` /
 * `export type` — wypisując „Excluding it from coverage" w środku kilku tysięcy linii
 * logu i kończąc przebieg zielono. Dlatego pokrycie stoi na dwóch nogach:
 * `public-api.spec.ts` wprowadza moduły każdej bramki do przebiegu, a ta bramka
 * sprawdza, że w raporcie nie brakuje ani jednego pliku źródłowego.
 *
 * Sprawdzane jest pięć rzeczy:
 *  1. raport w ogóle jest i ma sumę linii,
 *  2. lista plików źródłowych nie jest pusta (inaczej punkt 3 nie ma czego badać),
 *  3. KOMPLET: każdy plik źródłowy biblioteki jest w raporcie,
 *  4. próg jest zadeklarowany w targecie `test` i nie niższy niż MINIMUM,
 *  5. raport spełnia zadeklarowany próg.
 *
 * Punkt 3 jest tym, który faktycznie łapie regresję — punkty 4 i 5 pilnują liczby,
 * a punkt 3 pilnuje mianownika, z którego ta liczba powstała.
 *
 * Do tego szósty przebieg, który nie bada pokrycia, tylko TĘ BRAMKĘ: kontrola
 * odniesienia z `tools/check-coverage.fixtures/`. Spreparowane wejścia, z których każde
 * łamie dokładnie jeden z pięciu punktów i musi zostać odrzucone przez ten właśnie punkt
 * (`wym-jakosc-kontrola`).
 *
 * Użycie:
 *   node tools/check-coverage.mjs
 */
import { existsSync, globSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PROJEKT = 'libs/components';
const RAPORT = 'coverage/components/coverage-summary.json';
const FIXTURES = join(ROOT, 'tools/check-coverage.fixtures');
const BAZA = '_poprawny.json';

/** Próg z `wym-jakosc-pokrycie` — minimum SonarQube. Target może żądać więcej, nie mniej. */
const MINIMUM = 80;

/**
 * Co jest „kodem biblioteki". Świadomie NIE czytamy `coverageInclude` z `project.json`:
 * gdyby ta lista pochodziła z konfiguracji, zawężenie konfiguracji zabierałoby plik
 * z obu stron porównania naraz i punkt 3 przestałby cokolwiek widzieć. Tutaj jest
 * niezależna definicja, więc zawężenie `coverageInclude` objawia się jako brak pliku
 * w raporcie — czyli zapala.
 */
const ZRODLA = [`${PROJEKT}/src/**/*.ts`, `${PROJEKT}/*/src/**/*.ts`];

/**
 * Wyjątki. Każdy musi mieć powód, bo cicha lista wyjątków jest dokładnie tą wadą,
 * przed którą stoi ta bramka.
 */
const POMIJANE = [
  // Same testy.
  (p) => p.endsWith('.spec.ts'),
  // Czysty typ — znika w kompilacji, nie ma ani jednej linii wykonywalnej.
  (p) => p.endsWith('.types.ts'),
  // Narzędzia testowe. Nie mają `ng-package.json`, więc nie jadą w pakiecie,
  // a ich awaria objawia się padniętym testem, nie cichą wadą u konsumenta.
  (p) => p.startsWith(`${PROJEKT}/testing/`),
  // Stempel wersji generowany przez `stamp-version` — jedna stała, a jej zgodności
  // z manifestem pilnuje `check-package` (punkt 4), nie test jednostkowy.
  (p) => p === `${PROJEKT}/src/version.ts`,
];

/**
 * Szablony (`.html`) NIE są wymagane w raporcie: do statystyki wchodzą dopiero wtedy,
 * gdy jakiś test wyrenderuje ich komponent, więc żądanie ich obecności byłoby żądaniem
 * testu renderującego dla każdego komponentu — inną obietnicą niż `wym-jakosc-pokrycie`.
 * Gdy już się pojawią, liczą się normalnie do progu.
 */
const zrodlaBiblioteki = () =>
  ZRODLA.flatMap((wzorzec) => globSync(wzorzec, { cwd: ROOT }))
    .map((p) => p.split('\\').join('/'))
    .filter((p) => !POMIJANE.some((pomin) => pomin(p)))
    .sort();

/**
 * Naruszenie jednej z pięciu kontroli. Niesie identyfikator kontroli, a nie tylko
 * komunikat: kontrola odniesienia musi sprawdzić, że spreparowane wejście zapaliło
 * NA SWOIM punkcie — fixture wywalający się z innego powodu niż wpisany w nim samym
 * dowodzi czegoś innego, niż deklaruje.
 */
class BladPokrycia extends Error {
  constructor(kontrola, opis) {
    super(opis);
    this.kontrola = kontrola;
  }
}

/**
 * Komplet kontroli na gotowym wejściu:
 *   `raport` — `{ total, pliki }` ze ścieżkami względem korzenia repozytorium (albo null),
 *   `zrodla` — lista plików, które MUSZĄ być w raporcie,
 *   `target` — opcje targetu `test` z `project.json`.
 * Rzuca `BladPokrycia` przy pierwszym naruszeniu — kontrole idą od najbardziej
 * podstawowej, więc dalsze i tak nie miałyby czego badać.
 */
const sprawdzPokrycie = ({ raport, zrodla, target }) => {
  // 1. Raport istnieje i ma sumę linii.
  const pct = raport?.total?.lines?.pct;
  if (typeof pct !== 'number')
    throw new BladPokrycia(
      'raport',
      `brak raportu pokrycia albo raport bez sumy linii (${RAPORT}) — ` +
        `przebieg testów nie zebrał pokrycia, a bramka nie ma czego badać`,
    );

  // 2. Lista plików źródłowych nie jest pusta.
  if (!zrodla?.length)
    throw new BladPokrycia(
      'zrodla',
      `nie znalazłem ani jednego pliku źródłowego (${ZRODLA.join(', ')}) — ` +
        `punkt 3 przeszedłby wtedy zawsze, bo nie miałby czego szukać w raporcie`,
    );

  // 3. Komplet: każdy plik źródłowy jest w raporcie.
  const brakujace = zrodla.filter((p) => !(p in raport.pliki));
  if (brakujace.length)
    throw new BladPokrycia(
      'komplet',
      `${brakujace.length} plików źródłowych nie ma w raporcie pokrycia — ` +
        `procent policzył się BEZ nich, więc nie mówi nic o ich pokryciu:\n` +
        brakujace.map((p) => `      ${p}`).join('\n') +
        `\n    Najczęstsza przyczyna: plik nie wchodzi do żadnego przebiegu, ` +
        `a v8 nie potrafi go doliczyć ze źródła (lekcja-45). Lek: import bramki ` +
        `w libs/components/src/public-api.spec.ts albo własny test.`,
    );

  // 4. Próg jest zadeklarowany w targecie i nie niższy niż minimum.
  if (target?.coverage !== true)
    throw new BladPokrycia(
      'prog',
      `target \`test\` nie ma \`coverage: true\` — przebieg nie zbiera pokrycia, ` +
        `więc żaden próg nie ma czego pilnować`,
    );
  const zadeklarowany = target?.coverageThresholds?.lines;
  if (typeof zadeklarowany !== 'number' || zadeklarowany < MINIMUM)
    throw new BladPokrycia(
      'prog',
      `target \`test\` deklaruje próg linii \`${zadeklarowany ?? 'brak'}\`, ` +
        `a \`wym-jakosc-pokrycie\` żąda co najmniej ${MINIMUM}% — bez tego raport jest ` +
        `liczbą do oglądania, nie bramką`,
    );

  // 5. Raport spełnia zadeklarowany próg. Punkt zdublowany z egzekucją w samym
  // targecie i to jest celowe: tamta zależy od jednej opcji builda, którą łatwo
  // rozbroić jednym znakiem, a ta stoi w osobnym procesie i w CI jako osobny target.
  if (pct < zadeklarowany)
    throw new BladPokrycia(
      'wynik',
      `pokrycie linii ${pct}% poniżej progu ${zadeklarowany}%`,
    );

  return `${zrodla.length} plików źródłowych w raporcie, pokrycie linii ${pct}% (próg ${zadeklarowany}%)`;
};

// ── wejście z dysku ───────────────────────────────────────────────────────────

/** Raport w postaci, której oczekuje `sprawdzPokrycie`: ścieżki względem korzenia repo. */
const wczytajRaport = () => {
  const sciezka = join(ROOT, RAPORT);
  if (!existsSync(sciezka)) return null;
  const surowy = JSON.parse(readFileSync(sciezka, 'utf8'));
  const pliki = {};
  for (const [klucz, wartosc] of Object.entries(surowy)) {
    if (klucz === 'total') continue;
    pliki[relative(ROOT, klucz).split('\\').join('/')] = wartosc;
  }
  return { total: surowy.total, pliki };
};

const opcjeTargetu = () =>
  JSON.parse(readFileSync(join(ROOT, PROJEKT, 'project.json'), 'utf8')).targets
    ?.test?.options;

// ── kontrola odniesienia ──────────────────────────────────────────────────────

const wczytajFixture = (nazwa) =>
  JSON.parse(readFileSync(join(FIXTURES, nazwa), 'utf8'));

/**
 * Składa wejście przypadku NA KOPII wzorcowego, więc plik przypadku zawiera wyłącznie
 * swoją wadę — nie da się zepsuć czegoś przy okazji i nie zauważyć.
 */
const zlozFixture = (fx) => {
  const baza = wczytajFixture(BAZA);
  const wejscie = {
    raport: structuredClone(baza.raport),
    zrodla: [...baza.zrodla],
    target: structuredClone(baza.target),
  };
  if (fx.usunRaport) wejscie.raport = null;
  if (fx.wyczyscZrodla) wejscie.zrodla = [];
  for (const p of fx.usunZRaportu ?? []) delete wejscie.raport.pliki[p];
  if (fx.pct !== undefined) wejscie.raport.total.lines.pct = fx.pct;
  if (fx.target !== undefined) wejscie.target = fx.target;
  return wejscie;
};

// ── przebieg ──────────────────────────────────────────────────────────────────

const problems = [];
let opis = null;

try {
  opis = sprawdzPokrycie({
    raport: wczytajRaport(),
    zrodla: zrodlaBiblioteki(),
    target: opcjeTargetu(),
  });
} catch (blad) {
  if (!(blad instanceof BladPokrycia)) throw blad;
  problems.push(`${blad.kontrola}: ${blad.message}`);
}

const przypadki = readdirSync(FIXTURES)
  .filter((n) => n.endsWith('.json') && n !== BAZA)
  .sort();

if (przypadki.length === 0)
  problems.push(
    `tools/check-coverage.fixtures: brak spreparowanych wejść — bramka bez dowodu, ` +
      `że potrafi nie przejść, jest kolejną cichą wadą (wym-jakosc-kontrola)`,
  );

// Wejście wzorcowe MUSI przejść. Gdyby samo było wadliwe, każdy przypadek zapalałby
// z jego powodu, a nie z powodu swojej wady — i wszystkie „zapaliło" byłyby fałszywe.
try {
  sprawdzPokrycie(zlozFixture({}));
} catch (blad) {
  if (!(blad instanceof BladPokrycia)) throw blad;
  problems.push(
    `${BAZA}: wejście wzorcowe NIE przechodzi (${blad.kontrola}) — ` +
      `każdy spreparowany przypadek zapala teraz z jego powodu.\n    ${blad.message}`,
  );
}

for (const nazwa of przypadki) {
  const fx = wczytajFixture(nazwa);
  try {
    sprawdzPokrycie(zlozFixture(fx));
    problems.push(
      `${nazwa}: spreparowane wejście PRZESZŁO, a miało nie przejść — ` +
        `punkt ${fx.punkt} (\`${fx.kontrola}\`) przestał cokolwiek badać`,
    );
  } catch (blad) {
    if (!(blad instanceof BladPokrycia)) throw blad;
    if (blad.kontrola !== fx.kontrola)
      problems.push(
        `${nazwa}: zapaliła kontrola \`${blad.kontrola}\`, a miał punkt ${fx.punkt} ` +
          `(\`${fx.kontrola}\`) — fixture dowodzi czegoś innego, niż deklaruje`,
      );
  }
}

// ── wynik ─────────────────────────────────────────────────────────────────────

if (problems.length) {
  console.error(`X Bramka pokrycia — ${problems.length} naruszeń:\n`);
  for (const p of problems) console.error(`  - ${p}`);
  console.error('');
  process.exit(1);
}

console.log(
  `✓ Pokrycie: ${opis}. Kontrola odniesienia: wejście wzorcowe przechodzi, ` +
    `${przypadki.length} spreparowanych odrzuconych na swoich punktach.`,
);
