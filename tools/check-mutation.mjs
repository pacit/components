#!/usr/bin/env node
/**
 * Bramka przebiegu mutacyjnego: sprawdza, czy obietnica `req-quality-unit` —
 * „testy jednostkowe biblioteki biegną na Vitest" — ma za sobą odpowiedź na pytanie,
 * którego liczba zielonych testów nie zadaje: **czy te testy w ogóle coś łapią**.
 *
 * Powód istnienia. Sam Stryker odpowiada na to pytanie i potrafi na niej zapalić —
 * ale DOMYŚLNIE tego nie robi i nie musi tego nikt cofać: `thresholds.break` jest
 * z definicji `null`, więc przebieg kończy się zerem przy wyniku 4% tak samo jak
 * przy 94%. To jest ta sama wada co raport pokrycia bez progu: liczba do oglądania.
 * A gdy próg już stoi, podnosi się go pięcioma ruchami, z których żaden nie dokłada
 * ani jednego testu i każdy wygląda w review jak sprzątanie:
 *   - plik wykreślony z `mutate` (zabiera swoje przeżywające mutanty),
 *   - `ignorers` poszerzone albo `// Stryker disable` dopisane do źródła,
 *   - `mutator.excludedMutations` z całą rodziną mutacji,
 *   - `ignoreStatic: true` („bo wolno chodzi"),
 *   - skrócony `timeoutMS` — mutant zabity ZEGAREM liczy się jak zabity asercją.
 *
 * Sprawdzane jest siedem rzeczy:
 *  1. MIANOWNIK: pomiar istnieje, jest niepusty i jest AKTUALNY wobec źródeł,
 *  2. inwentarz mutowanych plików zgadza się z polityką — w obie strony,
 *  3. MIANOWNIK TESTÓW: przebieg uruchomił dokładnie te specyfikacje, co `test`,
 *  4. próg jest zadeklarowany, wiążący i nie da się go rozbroić poleceniem,
 *  5. mianownik nie jest zwężany: ignorery, wykluczone mutatory, mutanty statyczne,
 *  6. wynik: podłoga twarda i snapshot z tolerancją DWUSTRONNĄ, per plik i łącznie,
 *  7. oba targety (`mutacja`, `check-mutation`) biegną w CI.
 *
 * Skąd bierze się „co przebieg naprawdę zrobił". Z `tmp/mutacja/mutation.json`, czyli
 * z RAPORTU Strykera — a w nim z pola `config`, które niesie konfigurację SKUTECZNĄ:
 * plik plus wszystko, co dołożyła linia poleceń. Bramka czytająca `stryker.config.json`
 * orzekałaby o deklaracji, a `--ignoreStatic` w poleceniu targetu nie zostawia w niej
 * śladu. To ten sam ruch co „nie czytaj `include`, uruchom kompilator" z `check-typecheck`.
 *
 * Punkt 3 jest tym, którego nie widać z konstrukcji Strykera. Przebieg mutacyjny idzie
 * WŁASNĄ konfiguracją Vitesta (`libs/components/mutacja.vitest.config.mts`), bo target
 * `test` kompiluje specyfikacje builderem `@angular/build`, który pliku konfiguracyjnego
 * nie ma. To są więc dwie drogi do tych samych plików i potrafią się rozjechać: nowa
 * specyfikacja niewidziana przez tę drugą jest testem, którego mutanty nie mają kto zabić,
 * a wynik spada bez śladu przyczyny.
 *
 * Do tego przebieg, który nie bada repozytorium, tylko TĘ BRAMKĘ: kontrola odniesienia
 * z `tools/check-mutation.fixtures/`. Spreparowane wejścia, z których każde łamie
 * dokładnie jedną regułę i musi zostać odrzucone przez tę właśnie regułę
 * (`req-quality-negative-control`).
 *
 * Użycie:
 *   node tools/check-mutation.mjs
 *   node tools/check-mutation.mjs --write   przepisuje snapshot wyników
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
 * Statusy mutanta, które Stryker liczy jako WYKRYTY. `Timeout` jest tu razem
 * z `Killed` nie z uprzejmości, tylko dlatego, że tak liczy wynik — i właśnie
 * dlatego punkt 5 osobno pyta, jak duży jest udział zegara.
 */
const WYKRYTE = ['Killed', 'Timeout'];
/** Statusy liczone do mianownika. `Ignored` NIE jest jednym z nich — stąd punkt 5. */
const MIANOWNIK = [...WYKRYTE, 'Survived', 'NoCoverage', 'RuntimeError'];

/**
 * Napisy, po których poznaje się rozbrojone polecenie targetu. `--force` każe
 * Strykerowi zignorować wynik przyrostowy, `--dryRunOnly` kończy przebieg PRZED
 * uruchomieniem choćby jednego mutanta (i kończy się zerem), a operator powłoki
 * zjada kod wyjścia — czyli `thresholds.break` przestaje cokolwiek znaczyć.
 */
const ROZBRAJAJACE = [
  ['operator powłoki', /\|\||;\s*(?:true|exit\s+0)|&&\s*true\s*$/],
  ['--dryRunOnly', /--dry-?[Rr]un[Oo]nly/],
  ['--thresholds', /--thresholds/],
  ['--ignoreStatic', /--ignore-?[Ss]tatic/],
  ['--mutate', /--mutate/],
  ['--ignorers', /--ignorers/],
];

/**
 * Komentarze rozbrajające Strykera W ŹRÓDLE. Wchodzą do repozytorium bez linii
 * w konfiguracji i bez linii w poleceniu — widać je wyłącznie w pliku, którego
 * dotyczą, a wyglądają jak komentarz obok kodu.
 */
const WYLACZENIE_W_ZRODLE = /\/[/*]\s*Stryker\s+(disable|restore)\b/;

/**
 * Naruszenie jednej z kontroli. Niesie parę `kontrola` + `regula`, a nie sam
 * identyfikator punktu: punkt bramki to nie jedno zdanie (`lesson-50`), a kontrola
 * odniesienia porównująca sam punkt przepuszcza przypadek, który zapalił na sąsiedniej
 * regule tego samego punktu.
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

/** Wynik mutacyjny zbioru mutantów, liczony tak samo jak liczy go Stryker. */
const wynikZ = (mutanty) => {
  const w = mutanty.filter((m) => WYKRYTE.includes(m.status)).length;
  const m = mutanty.filter((x) => MIANOWNIK.includes(x.status)).length;
  return { wykryte: w, mianownik: m, wynik: m === 0 ? 100 : (w / m) * 100 };
};

// ── snapshot ──────────────────────────────────────────────────────────────────

const NAGLOWEK = `# Snapshot przebiegu mutacyjnego

> **Ten plik jest generowany.** Nie edytuj go ręcznie —
> \`node tools/check-mutation.mjs --write\`. Bramka \`check-mutation\` odrzuca rozjazd.

Komplet zielonych testów nie jest dowodem, że testy cokolwiek łapią — to jedyne
pytanie, na które odpowiada przebieg mutacyjny
([\`req-quality-unit\`](../../docs/requirements/quality.md#req-quality-unit)).
Stryker psuje kod na tysiąc drobnych sposobów i pyta, ile z nich zauważy zestaw
testów. Mutant **przeżywający** to zmiana zachowania, po której CI dalej świeci
na zielono.

Ten plik jest listą, wobec której mierzy się zmianę. Sam \`thresholds.break\`
w \`stryker.config.json\` jest PODŁOGĄ i nic nie mówi o pliku, który spadł
o dwadzieścia punktów, dopóki reszta go wyrównuje. Snapshot pilnuje każdego pliku
z osobna i pilnuje go **w obie strony**: w dół, bo tak wygląda usunięta asercja,
w górę, bo podłoga stojąca dziesięć punktów pod pomiarem przestaje mierzyć.

Kolumny: plik · wynik · zabite (w tym zegarem) · przeżywające · bez pokrycia ·
zignorowane. Tolerancja: ±%TOLERANCJA% punktu procentowego.
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

/** Wiersze z bloku kodu snapshotu — reszta pliku jest prozą dla człowieka. */
const wierszeSnapshotu = (tekst) =>
  (tekst ?? '')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => /^(?:[\w./-]+\.ts|RAZEM) \d/.test(l));

// ── kontrole ──────────────────────────────────────────────────────────────────

/**
 * Komplet kontroli na gotowym wejściu:
 *   `polityka`  — treść `mutacja.policy.json`,
 *   `raport`    — treść `tmp/mutacja/mutation.json` (razem z polem `config`),
 *   `zrodla`    — `{ [plik]: treść }` z dysku, dla plików z raportu i z polityki,
 *   `specyfikacje` — pliki `*.spec.ts` biblioteki z indeksu gita,
 *   `snapshot`  — treść `mutacja.snapshot.md` albo `null`,
 *   `konfig`    — treść `stryker.config.json`,
 *   `targety`   — `{ mutacja: { polecenie }, check: { polecenie } }` z grafu Nx,
 *   `ci`        — `{ targety: [...] }` z workflow.
 * Rzuca `BladMutacji` przy pierwszym naruszeniu — kontrole idą od mianownika,
 * więc dalsze i tak nie miałyby czego badać. Zwraca `{ opis, snapshot }`.
 */
export const sprawdzMutacje = (we) => {
  const polityka = we?.polityka ?? {};
  const tolerancja = polityka.tolerancja;
  const raport = we?.raport;

  // 1. MIANOWNIK. Raport, którego nie ma albo który jest pusty, daje bramkę
  // przechodzącą zawsze — nie ma czego porównywać, więc wszystko się zgadza.
  if (!raport || typeof raport !== 'object' || !raport.files)
    throw new BladMutacji(
      'pomiar',
      'pomiar-nieczytelny',
      `brak czytelnego \`${RAPORT}\` — przebieg mutacyjny albo nie biegł, albo nie ` +
        `zapisał raportu. Bramka nie ma wtedy nic do zmierzenia i milczy o wszystkim.`,
    );

  // Każdy odczyt niżej jest defensywny, mimo że punkt wyżej już odrzucił raport
  // pusty i nieczytelny. Powód jest zmierzony, nie ostrożnościowy: kontrola
  // odniesienia rozbraja reguły PO KOLEI, więc punkt ufający poprzedniemu daje
  // wtedy `TypeError` zamiast komunikatu — i to jest jedyny stan, w którym bramka
  // nie mówi, co jest nie tak. Ta sama wada wracała w tym repozytorium siedem razy.
  const pliki = Object.keys(raport?.files ?? {});
  const wszystkieMutanty = Object.values(raport?.files ?? {}).flatMap(
    (d) => d?.mutants ?? [],
  );
  if (!wszystkieMutanty.length)
    throw new BladMutacji(
      'pomiar',
      'pomiar-pusty',
      `raport nie zawiera ani jednego mutanta. Stryker kończy się wtedy ZEREM ` +
        `i melduje wynik 100% — bo dzieli przez mianownik, którego nie ma.`,
    );

  // Raport starszy od źródeł mierzy kod, którego już nie ma. Nx pilnuje tego
  // cache'em, ale przebieg z ręki (albo cache trafiony po cofnięciu zmiany)
  // pokazywałby wynik sprzed edycji jako dzisiejszy.
  for (const [plik, dane] of Object.entries(raport?.files ?? {})) {
    const naDysku = we.zrodla?.[plik];
    if (naDysku !== undefined && naDysku !== dane.source)
      throw new BladMutacji(
        'pomiar',
        'pomiar-nieaktualny',
        `\`${plik}\` różni się od treści, na której liczono wynik.\n` +
          `    Raport opisuje kod sprzed edycji: przeżywające mutanty dotyczą linii, ` +
          `których już nie ma, a nowe nie zostały zmierzone ani razu.`,
      );
  }

  // 2. INWENTARZ. Trzy pytania, bo są trzy różne sposoby, na jakie plik potrafi
  // wypaść z pomiaru, i tylko jeden z nich rusza konfigurację.
  const konfigRaportu = raport?.config ?? {};
  const wzorce = polityka.wzorce ?? [];
  const wzorceRaportu = konfigRaportu.mutate ?? [];
  if (JSON.stringify(wzorce) !== JSON.stringify(wzorceRaportu))
    throw new BladMutacji(
      'inwentarz',
      'wzorce-zmienione',
      `wzorce \`mutate\` z przebiegu nie zgadzają się z ${POLITYKA}:\n` +
        `      przebieg:  ${JSON.stringify(wzorceRaportu)}\n` +
        `      polityka:  ${JSON.stringify(wzorce)}\n` +
        `    Zawężenie wzorca jest najtańszym sposobem podniesienia wyniku: plik ` +
        `wykreślony z pomiaru zabiera ze sobą swoje przeżywające mutanty.`,
    );

  const zPolityki = polityka.pliki ?? [];
  if (!zPolityki.length)
    throw new BladMutacji(
      'inwentarz',
      'polityka-bez-plikow',
      `${POLITYKA} nie wymienia ani jednego pliku — punkty 2 i 6 chodzą po tej ` +
        `liście, więc przeszłyby w komplecie, nie zaglądając do niczego`,
    );
  const spozaRepo = zPolityki.filter((p) => !(we.wRepo ?? []).includes(p));
  if (spozaRepo.length)
    throw new BladMutacji(
      'inwentarz',
      'wpis-bez-pliku',
      `${spozaRepo.length} pozycji inwentarza nie ma w indeksie gita:\n` +
        lista(spozaRepo) +
        `\n    Wpis bez pliku niczego nie pilnuje, a czyta się go jako opis ` +
        `dzisiejszego zasięgu pomiaru.`,
    );

  const bezMutantow = polityka.bezMutantow ?? [];
  const uzasadnione = new Set(bezMutantow.map((w) => w?.plik));
  for (const wpis of bezMutantow) {
    if (!zPolityki.includes(wpis?.plik))
      throw new BladMutacji(
        'inwentarz',
        'wyjatek-spoza-inwentarza',
        `wyjątek \`bezMutantow\` wskazuje \`${wpis?.plik ?? '(bez pliku)'}\`, ` +
          `którego nie ma w inwentarzu.\n` +
          `    Wyjątek od pomiaru pliku, który nie jest mierzony, nie zwalnia ` +
          `z niczego — a wygląda w rejestrze na uzasadnienie.`,
      );
    if (typeof wpis.powod !== 'string' || wpis.powod.trim().length < 40)
      throw new BladMutacji(
        'inwentarz',
        'wyjatek-bez-powodu',
        `wyjątek \`bezMutantow\` dla \`${wpis.plik}\` nie niesie powodu.\n` +
          `    „Zero mutantów" znaczy albo „nie ma czego mutować", albo „plik ` +
          `wypadł z pomiaru". Rozstrzyga to wyłącznie zdanie, które ktoś napisał.`,
      );
  }

  const beznadziejne = zPolityki.filter(
    (p) => !pliki.includes(p) && !uzasadnione.has(p),
  );
  if (beznadziejne.length)
    throw new BladMutacji(
      'inwentarz',
      'plik-bez-mutantow',
      `${beznadziejne.length} plików inwentarza nie ma w raporcie:\n` +
        lista(beznadziejne) +
        `\n    Plik bez ani jednego mutanta znika z raportu razem ze swoimi ` +
        `przeżywającymi — i wynik ROŚNIE. Lek: przywrócić plik do pomiaru albo ` +
        `dopisać go do \`bezMutantow\` z powodem.`,
    );

  const martweWyjatki = bezMutantow.filter((w) => pliki.includes(w.plik));
  if (martweWyjatki.length)
    throw new BladMutacji(
      'inwentarz',
      'wyjatek-martwy',
      `${martweWyjatki.length} wyjątków \`bezMutantow\` dotyczy plików, które ` +
        `mutanty jednak mają: ${martweWyjatki.map((w) => w.plik).join(', ')}.\n` +
        `    Powód wyjątku zniknął, a wpis został — i od dziś ukrywa plik, ` +
        `który wypadnie z pomiaru naprawdę.`,
    );

  const nieznane = pliki.filter((p) => !zPolityki.includes(p));
  if (nieznane.length)
    throw new BladMutacji(
      'inwentarz',
      'plik-spoza-polityki',
      `${nieznane.length} plików w raporcie nie ma w inwentarzu:\n` +
        lista(nieznane) +
        `\n    Punkt 6 chodzi po plikach Z RAPORTU, więc ten byłby mierzony, ale ` +
        `jego podłoga nie miałaby gdzie stać. Lek: dopisać do ${POLITYKA}.`,
    );

  // 3. MIANOWNIK TESTÓW. Przebieg mutacyjny idzie własną konfiguracją Vitesta,
  // więc zbiór uruchomionych specyfikacji jest osobnym pomiarem — i osobno psuje się.
  const uruchomione = Object.keys(raport?.testFiles ?? {});
  if (!uruchomione.length)
    throw new BladMutacji(
      'testy',
      'testy-niezmierzone',
      `raport nie wymienia ani jednego pliku testowego. Bez \`coverageAnalysis: ` +
        `"perTest"\` nie ma jak sprawdzić, CZY przebieg mutacyjny widzi te same ` +
        `specyfikacje co target \`test\` — a to on odpowiada za mianownik wyniku.`,
    );
  const specyfikacje = we.specyfikacje ?? [];
  const nieuruchomione = specyfikacje.filter((s) => !uruchomione.includes(s));
  if (nieuruchomione.length)
    throw new BladMutacji(
      'testy',
      'spec-poza-pomiarem',
      `${nieuruchomione.length} specyfikacji biblioteki nie weszło do przebiegu ` +
        `mutacyjnego:\n` +
        lista(nieuruchomione) +
        `\n    Te pliki biegną w targecie \`test\` i nie biegną tutaj — czyli mutant, ` +
        `którego zabijają, liczy się jako przeżywający. Dwie drogi do tych samych ` +
        `specyfikacji rozjechały się (\`mutacja.vitest.config.mts\` wobec \`test\`).`,
    );
  const specSpozaRepo = uruchomione.filter((s) => !specyfikacje.includes(s));
  if (specSpozaRepo.length)
    throw new BladMutacji(
      'testy',
      'spec-spoza-repo',
      `${specSpozaRepo.length} plików testowych z przebiegu nie ma w indeksie gita:\n` +
        lista(specSpozaRepo) +
        `\n    Mianownik punktu 3 bierze się z gita, więc taki plik zabija mutanty, ` +
        `a bramka nie ma jak zapytać, czy zabija je u wszystkich.`,
    );

  // 4. PRÓG. Domyślny `break` Strykera to `null` — przebieg kończy się wtedy zerem
  // niezależnie od wyniku i cała ta bramka mierzyłaby raport do oglądania.
  const prog = polityka.prog;
  if (typeof prog !== 'number')
    throw new BladMutacji(
      'prog',
      'polityka-bez-progu',
      `${POLITYKA} nie deklaruje pola \`prog\` — nie ma z czym porównać ` +
        `\`thresholds.break\`, więc punkt 4 nie ma o co pytać`,
    );
  const przerwanie = konfigRaportu.thresholds?.break;
  if (typeof przerwanie !== 'number')
    throw new BladMutacji(
      'prog',
      'prog-nieustawiony',
      `przebieg biegł z \`thresholds.break = ${JSON.stringify(przerwanie)}\`.\n` +
        `    To jest DOMYŚLNA wartość Strykera i znaczy „nie przerywaj nigdy": ` +
        `przebieg kończy się zerem przy wyniku 4% tak samo jak przy 94%, ` +
        `a raport jest liczbą do oglądania.`,
    );
  if (przerwanie !== prog)
    throw new BladMutacji(
      'prog',
      'prog-rozjechany',
      `\`thresholds.break\` z przebiegu (${przerwanie}) nie zgadza się z \`prog\` ` +
        `z polityki (${prog}).\n` +
        `    To ta liczba faila przebieg, a ta druga jest jej jedynym uzasadnieniem. ` +
        `Rozjazd znaczy, że obniżono jedną z nich, nie ruszając drugiej.`,
    );
  const wKonfiguracji = we.konfig?.thresholds?.break;
  if (wKonfiguracji !== przerwanie)
    throw new BladMutacji(
      'prog',
      'prog-z-polecenia',
      `\`thresholds.break\` w ${KONFIG} (${JSON.stringify(wKonfiguracji)}) różni się ` +
        `od tego, z którym przebieg NAPRAWDĘ biegł (${przerwanie}).\n` +
        `    Konfigurację nadpisuje linia poleceń, a raport niesie wartość skuteczną. ` +
        `Plik mówi wtedy co innego niż przebieg — i to plik czyta review.`,
    );

  const polecenie = we.targety?.mutacja?.polecenie;
  if (!polecenie)
    throw new BladMutacji(
      'prog',
      'target-bez-polecenia',
      `target \`components:mutacja\` nie ma polecenia, które dałoby się przeczytać — ` +
        `bramka nie ma jak sprawdzić, czy przebieg nie jest rozbrojony`,
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
        `    Konfiguracja wygląda wtedy tak samo jak dziś, raport wygląda tak samo ` +
        `jak dziś, a kod wyjścia jest zawsze zerem.`,
    );

  // 5. ZWĘŻENIE MIANOWNIKA. Mutant `Ignored` nie liczy się ani do licznika, ani do
  // mianownika — każde zignorowanie podnosi wynik, nie dokładając żadnego testu.
  const ignorery = polityka.ignorery ?? {};
  const uzyte = konfigRaportu.ignorers ?? [];
  const nieuzasadnione = uzyte.filter((i) => !ignorery[i]);
  if (nieuzasadnione.length)
    throw new BladMutacji(
      'zwezenie',
      'ignorer-nieuzasadniony',
      `przebieg użył ignorerów spoza polityki: ${nieuzasadnione.join(', ')}.\n` +
        `    Ignorer wykreśla mutanty z mianownika. Bez wpisu w ${POLITYKA} nie ma ` +
        `miejsca, w którym ktoś tłumaczy, dlaczego akurat tych nie trzeba zabijać.`,
    );
  const martweIgnorery = Object.keys(ignorery).filter(
    (i) => !uzyte.includes(i),
  );
  if (martweIgnorery.length)
    throw new BladMutacji(
      'zwezenie',
      'ignorer-martwy',
      `polityka uzasadnia ignorery, których przebieg nie użył: ${martweIgnorery.join(', ')}.\n` +
        `    Wpis bez skutku zostaje po problemie, którego już nie ma, a czyta się go ` +
        `jako opis dzisiejszego pomiaru.`,
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
      `${obce.length} mutantów zignorowano z powodem spoza polityki, np.:\n` +
        lista(
          [...new Set(obce.map((m) => `„${m.statusReason}"`))].slice(0, 3),
        ) +
        `\n    Tak wchodzi do repozytorium komentarz \`// Stryker disable\`: ` +
        `w konfiguracji nie zostawia śladu, a mutanty znikają z mianownika.`,
    );

  const wZrodle = Object.entries(we.zrodla ?? {})
    .filter(([, tresc]) => WYLACZENIE_W_ZRODLE.test(tresc ?? ''))
    .map(([plik]) => plik);
  if (wZrodle.length)
    throw new BladMutacji(
      'zwezenie',
      'wylaczenie-w-zrodle',
      `${wZrodle.length} mierzonych plików niesie komentarz wyłączający Strykera:\n` +
        lista(wZrodle) +
        `\n    Biblioteka nie ma dziś ani jednego kandydata na taki wyjątek, więc ` +
        `mechanizmu nie ma — furtka bez użytkownika jest martwym artefaktem. ` +
        `Mutant nie do zabicia jest zdaniem do napisania w ${POLITYKA}, nie ` +
        `komentarzem w kodzie, którego nikt więcej nie czyta.`,
    );

  if (konfigRaportu.ignoreStatic)
    throw new BladMutacji(
      'zwezenie',
      'statyczne-pominiete',
      `przebieg biegł z \`ignoreStatic: true\`.\n` +
        `    Mutanty statyczne — te w inicjalizatorach pól i w zasięgu modułu — ` +
        `wypadają wtedy z mianownika w całości. W bibliotece komponentów jest tam ` +
        `wejście, wartość domyślna i identyfikator, czyli jej publiczny kontrakt.`,
    );
  const wykluczone = konfigRaportu.mutator?.excludedMutations ?? [];
  if (wykluczone.length)
    throw new BladMutacji(
      'zwezenie',
      'mutatory-wykluczone',
      `przebieg wyklucza całe rodziny mutacji: ${wykluczone.join(', ')}.\n` +
        `    Rodzina wykluczona znika z mianownika bez śladu w wyniku — a każda ` +
        `z nich odpowiada realnej pomyłce (odwrócony warunek, przestawiona granica, ` +
        `podmieniony napis).`,
    );

  const zegar = polityka.zegar ?? {};
  if ((konfigRaportu.timeoutMS ?? 0) < (zegar.minimumMS ?? 0))
    throw new BladMutacji(
      'zwezenie',
      'zegar-skrocony',
      `\`timeoutMS\` przebiegu (${konfigRaportu.timeoutMS}) jest niższy niż ` +
        `\`zegar.minimumMS\` z polityki (${zegar.minimumMS}).\n` +
        `    Mutant zabity przez upływ czasu liczy się do wyniku tak samo jak zabity ` +
        `asercją, więc skrócenie limitu podnosi procent, nie dokładając testów.`,
    );
  if ((konfigRaportu.timeoutFactor ?? 0) < (zegar.minimumWspolczynnik ?? 0))
    throw new BladMutacji(
      'zwezenie',
      'wspolczynnik-skrocony',
      `\`timeoutFactor\` przebiegu (${konfigRaportu.timeoutFactor}) jest niższy niż ` +
        `\`zegar.minimumWspolczynnik\` z polityki (${zegar.minimumWspolczynnik}).\n` +
        `    To ta sama dźwignia co \`timeoutMS\`, tylko liczona względem czasu ` +
        `normalnego przebiegu.`,
    );
  const razem = wynikZ(wszystkieMutanty);
  const zZegara = wszystkieMutanty.filter((m) => m.status === 'Timeout').length;
  const udzial = razem.wykryte === 0 ? 0 : (zZegara / razem.wykryte) * 100;
  if (udzial > (zegar.udzialZegara ?? 100))
    throw new BladMutacji(
      'zwezenie',
      'zegar-zamiast-testu',
      `${zZegara} z ${razem.wykryte} zabitych mutantów zabił ZEGAR (${procent(udzial)}, ` +
        `dopuszczone ${zegar.udzialZegara}%).\n` +
        `    Timeout znaczy „mutant zapętlił kod", a nie „test to zauważył". Długi ogon ` +
        `timeoutów to wynik kupiony czasem przebiegu.`,
    );

  // 6. WYNIK. Podłoga twarda (ta sama, którą egzekwuje Stryker) i snapshot per plik.
  if (typeof tolerancja !== 'number')
    throw new BladMutacji(
      'wynik',
      'polityka-bez-tolerancji',
      `${POLITYKA} nie deklaruje pola \`tolerancja\` — bez niej porównanie ze ` +
        `snapshotem nie ma szerokości i każdy przebieg wyglądałby na rozjazd`,
    );

  const swiezy = renderujSnapshot(raport, tolerancja);
  if (we.snapshot === null || we.snapshot === undefined)
    throw new BladMutacji(
      'wynik',
      'brak-snapshotu',
      `brak \`${SNAPSHOT}\` — uruchom \`node tools/check-mutation.mjs --write\`.\n` +
        `    Bez snapshotu punkt 6 pilnuje wyłącznie podłogi łącznej, czyli milczy ` +
        `o pliku, który spadł o dwadzieścia punktów, dopóki reszta go wyrównuje.`,
    );

  if (razem.wynik < prog)
    throw new BladMutacji(
      'wynik',
      'podloga-przebita',
      `wynik łączny ${procent(razem.wynik)} jest poniżej podłogi ${prog}% ` +
        `(${razem.wykryte} z ${razem.mianownik} mutantów wykrytych).\n` +
        `    Tyle mutantów przeżyło zestaw testów, czyli tyle zmian zachowania ` +
        `przechodzi dziś CI na zielono.`,
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
      `${brakujace.length} mierzonych plików nie ma wiersza w snapshocie:\n` +
        lista(brakujace) +
        `\n    Plik bez wiersza jest mierzony wyłącznie podłogą łączną. ` +
        `Lek: \`node tools/check-mutation.mjs --write\`.`,
    );
  const nadmiarowe = [...zeSnapshotu.keys()].filter((p) => !pliki.includes(p));
  if (nadmiarowe.length)
    throw new BladMutacji(
      'wynik',
      'snapshot-przeterminowany',
      `${nadmiarowe.length} wierszy snapshotu dotyczy plików spoza pomiaru:\n` +
        lista(nadmiarowe) +
        `\n    Wiersz bez pliku czyta się jako dowód, że coś jest mierzone — a nie jest.`,
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
      `${spadki.length} plików straciło na wyniku więcej niż ${tolerancja} p.p.:\n` +
        lista(spadki) +
        `\n    Tak wygląda usunięta asercja: testy dalej są zielone, a mutantów ` +
        `zauważają mniej. Lek: dopisać test albo — jeśli to świadome — przepisać ` +
        `snapshot i pokazać ten spadek w review.`,
    );
  if (skoki.length)
    throw new BladMutacji(
      'wynik',
      'snapshot-odstaje',
      `${skoki.length} plików wypadło lepiej niż snapshot o więcej niż ${tolerancja} p.p.:\n` +
        lista(skoki) +
        `\n    To jest dobra wiadomość i mimo to zapala: podłoga stojąca dziesięć ` +
        `punktów pod pomiarem przestaje mierzyć — można wtedy skasować co piątą ` +
        `asercję i zostać zielonym. Lek: \`node tools/check-mutation.mjs --write\`.`,
    );

  // 7. CI. Bramka i sam przebieg to dwa różne targety i każdy da się zdjąć osobno.
  for (const target of ['mutacja', 'check-mutation'])
    if (!(we.ci?.targety ?? []).includes(target))
      throw new BladMutacji(
        'ci',
        'ci-bez-targetu',
        `w \`${CI}\` nie widzę targetu \`${target}\` na liście uruchamianych.\n` +
          `    To jest mianownik całej tej bramki: wszystko wyżej opisuje przebieg, ` +
          `którego nikt nie odpala, a lokalnie każdy z nich przechodzi.`,
      );

  return {
    opis:
      `${pliki.length} plików, ${razem.mianownik} mutantów — wynik ` +
      `${procent(razem.wynik)} przy podłodze ${prog}% ` +
      `(${razem.mianownik - razem.wykryte} przeżywających, ` +
      `${wszystkieMutanty.filter((m) => m.status === 'Ignored').length} zignorowanych)`,
    snapshot: swiezy,
  };
};

// ── wejście z dysku ───────────────────────────────────────────────────────────

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
 * Polecenia obu targetów Z GRAFU NX, a nie z `project.json`: to graf jest tym,
 * co Nx naprawdę uruchomi, i to on scala konfiguracje oraz wartości domyślne.
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
 * Które targety uruchamia workflow. Komentarze obcinane PRZED szukaniem — ten
 * workflow tłumaczy każdy swój krok akapitem prozy, więc zdanie o targecie
 * wygląda dla wzorca dokładnie jak jego wywołanie (`lesson-56` w `check-browsers`).
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

// ── kontrola odniesienia ──────────────────────────────────────────────────────

const wczytajFixture = (nazwa) =>
  JSON.parse(readFileSync(join(FIXTURES, nazwa), 'utf8'));

/**
 * Wejście wzorcowe trzyma pliki skrótowo (nazwa → mutanty jako lista statusów),
 * żeby przypadek dało się przeczytać jednym spojrzeniem. Rozwijamy je tu do
 * kształtu, jaki ma raport Strykera.
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
 * Składa wejście przypadku NA KOPII wzorcowego, więc plik przypadku zawiera wyłącznie
 * swoją wadę — nie da się zepsuć czegoś przy okazji i nie zauważyć.
 *
 * Snapshot wzorcowy renderuje się z raportu SPRZED zmian przypadku i tym samym
 * rendererem co produkcyjny. Jedno i drugie jest konieczne: wyrenderowany po
 * zmianach zawsze zgadzałby się z pomiarem (czyli punkt 6 nie miałby czego badać),
 * a wpisany w plik ręcznie zapalałby na różnicy formatu, a nie na wadzie przypadku.
 */
const zlozFixture = (fx) => {
  const w = structuredClone(wczytajFixture(BAZA).wejscie);
  const snapshotBazowy = renderujSnapshot(zlozRaport(w), w.polityka.tolerancja);

  for (const plik of fx.usunPliki ?? []) delete w.plikiSkrot[plik];
  for (const [plik, dane] of Object.entries(fx.dopiszPliki ?? {}))
    w.plikiSkrot[plik] = dane;
  for (const [plik, statusy] of Object.entries(fx.podmienStatusy ?? {}))
    w.plikiSkrot[plik].statusy = statusy;
  // Treść pliku stoi w dwóch miejscach — na dysku i w raporcie — i to, czy zmiana
  // dotyczy obu, jest całą różnicą między „inny kod" a „nieaktualny pomiar".
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

// ── przebieg ──────────────────────────────────────────────────────────────────

const problems = [];
let opis = null;
try {
  opis = sprawdzMutacje(await wejscieZDysku()).opis;
} catch (blad) {
  if (!(blad instanceof BladMutacji)) throw blad;
  problems.push(`${blad.kontrola}/${blad.regula}: ${blad.message}`);
}

// `--write` jest właściwą odpowiedzią na trzy reguły punktu 6 (`brak-snapshotu`,
// `snapshot-niepelny`, `snapshot-odstaje`), więc snapshot musi dać się przepisać
// TAKŻE wtedy, gdy bramka na nich zapaliła — inaczej jedyne polecenie naprawiające
// te reguły byłoby dostępne dokładnie poza stanem, w którym jest potrzebne.
// Renderuje z dysku, nie z wyniku wyżej: przy zapalonej regule tamtego wyniku nie ma.
if (WRITE) {
  const raport = json(RAPORT);
  const polityka = json(POLITYKA) ?? {};
  if (raport?.files && typeof polityka.tolerancja === 'number') {
    writeFileSync(
      join(ROOT, SNAPSHOT),
      renderujSnapshot(raport, polityka.tolerancja),
    );
    console.log(`✓ Przepisano ${SNAPSHOT}`);
    process.exit(0);
  }
  console.error(`X Nie ma z czego przepisać snapshotu — brak ${RAPORT}.`);
  process.exit(1);
}

if (!existsSync(FIXTURES))
  problems.push(
    `tools/check-mutation.fixtures: katalog nie istnieje — bramka bez dowodu, ` +
      `że potrafi nie przejść, jest kolejną cichą wadą (req-quality-negative-control)`,
  );

const przypadki = existsSync(FIXTURES)
  ? readdirSync(FIXTURES)
      .filter((n) => n.endsWith('.json') && n !== BAZA)
      .sort()
  : [];

if (existsSync(FIXTURES) && !przypadki.length)
  problems.push(
    `tools/check-mutation.fixtures: brak spreparowanych wejść — bramka bez dowodu, ` +
      `że potrafi nie przejść, jest kolejną cichą wadą (req-quality-negative-control)`,
  );

// Wejście wzorcowe MUSI przejść. Gdyby samo było wadliwe, każdy przypadek zapalałby
// z jego powodu, a nie z powodu swojej wady — i wszystkie „zapaliło" byłyby fałszywe.
if (przypadki.length) {
  try {
    sprawdzMutacje(zlozFixture({}));
  } catch (blad) {
    if (!(blad instanceof BladMutacji)) throw blad;
    problems.push(
      `${BAZA}: wejście wzorcowe NIE przechodzi (${blad.kontrola}/${blad.regula}) — ` +
        `każdy spreparowany przypadek zapala teraz z jego powodu.\n    ${blad.message}`,
    );
  }
}

for (const nazwa of przypadki) {
  const fx = wczytajFixture(nazwa);
  try {
    sprawdzMutacje(zlozFixture(fx));
    problems.push(
      `${nazwa}: spreparowane wejście PRZESZŁO, a miało nie przejść — ` +
        `reguła \`${fx.kontrola}/${fx.regula}\` przestała cokolwiek badać`,
    );
  } catch (blad) {
    if (!(blad instanceof BladMutacji)) throw blad;
    if (blad.kontrola !== fx.kontrola || blad.regula !== fx.regula)
      problems.push(
        `${nazwa}: zapaliła reguła \`${blad.kontrola}/${blad.regula}\`, ` +
          `a miała \`${fx.kontrola}/${fx.regula}\` — ` +
          `fixture dowodzi czegoś innego, niż deklaruje`,
      );
  }
}

// ── wynik ─────────────────────────────────────────────────────────────────────

if (problems.length) {
  console.error(
    `X Bramka przebiegu mutacyjnego — ${problems.length} naruszeń:\n`,
  );
  for (const p of problems) console.error(`  - ${p}`);
  console.error('');
  process.exit(1);
}

console.log(
  `✓ Przebieg mutacyjny: ${opis}. Kontrola odniesienia: wejście wzorcowe przechodzi, ` +
    `${przypadki.length} spreparowanych odrzuconych na swoich regułach.`,
);
