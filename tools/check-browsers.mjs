#!/usr/bin/env node
/**
 * Bramka macierzy przeglądarek: sprawdza, czy obietnica `req-quality-browsers` —
 * „testy funkcjonalne biegną na chromium, firefox i webkicie" — ma za sobą pomiar,
 * a nie trzy wpisy w `playwright.config.mts`, których nikt więcej nie czyta.
 *
 * Powód istnienia. Sama macierz jest tania do dopisania i tania do cofnięcia, a jej
 * cofnięcie NIE DAJE ANI JEDNEGO CZERWONEGO TESTU. Wystarczy jedna z czterech rzeczy,
 * z których każda wygląda w review jak sprzątanie:
 *   - projekt usunięty z `projects` (przebieg zielony, mierzy jeden silnik),
 *   - `--project=chromium` dopisane do polecenia targetu (to samo, tylko z drugiej strony),
 *   - plik dopisany do `testIgnore` „bo miga" (pokrycie kurczy się o jeden plik na raz),
 *   - krok instalacji w CI zawężony do chromium (tu akurat głośno — ale dopiero wtedy,
 *     gdy pozostałe trzy jeszcze nie zdążyły uciszyć przebiegu).
 *
 * Sprawdzane jest sześć rzeczy:
 *  1. MIANOWNIK: pomiar da się wykonać i nie jest pusty,
 *  2. zebrane projekty to dokładnie silniki z polityki, każdy z niezerową liczbą testów,
 *  3. POKRYCIE: każdy plik specyfikacji biegnie na każdym silniku — albo ma wpis,
 *  4. rejestr wyłączeń jest żywy i uzasadniony,
 *  5. CI instaluje wszystkie silniki i nie zawęża przebiegu,
 *  6. FAKT: uzasadnienie wyłączenia rodzaju `pomiar` jest mierzone, a nie pamiętane.
 *
 * Skąd bierze się „co naprawdę biegnie". Z `playwright test --list --reporter=json`,
 * czyli z uruchomienia SAMEGO PLAYWRIGHTA, a nie z odczytania `projects` i `testIgnore`
 * z pliku konfiguracyjnego. To ten sam ruch co „nie czytaj `include`, uruchom kompilator"
 * z `check-typecheck` i z tego samego powodu: wzorzec `testIgnore`, który w nic nie
 * trafia, nie jest dla Playwrighta błędem — jest projektem zbierającym komplet. Bramka
 * czytająca konfigurację orzekałaby o deklaracji, a deklaracja jest tym, co się psuje.
 *
 * Punkt 6 jest tym, którego nie da się zastąpić zdaniem w komentarzu. Wyłączenie
 * `forced-colors.spec.ts` z webkita stoi na FAKCIE o tym silniku (melduje media query,
 * a kolorów autora nie podmienia), a fakty o przeglądarkach mają to do siebie, że
 * przestają obowiązywać po cichu — przy podbiciu paczki, nie przy zmianie w tym repo.
 * Bramka powtarza więc sondę przy każdym przebiegu i wymaga, żeby fakt nie zachodził
 * DOKŁADNIE tam, gdzie stoi wyłączenie. Dzień, w którym webkit to zaimplementuje, jest
 * dniem, w którym bramka każe wyłączenie zdjąć — zamiast dnia, w którym nikt nie zauważa,
 * że plik nie biegnie tam już bez powodu.
 *
 * Do tego przebieg, który nie bada repozytorium, tylko TĘ BRAMKĘ: kontrola odniesienia
 * z `tools/check-browsers.fixtures/`. Spreparowane wejścia, z których każde łamie
 * dokładnie jedną regułę i musi zostać odrzucone przez tę właśnie regułę
 * (`req-quality-negative-control`).
 *
 * Użycie:
 *   node tools/check-browsers.mjs
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
 * Co Playwright uzna za plik testowy. Powtórzenie jego domyślnego `testMatch`
 * (`**\/*.@(spec|test).?(c|m)[jt]s?(x)`) — mianownik punktu 3 musi obejmować dokładnie
 * te pliki, które tamten zbiera, inaczej porównanie dwóch list mierzy różnicę definicji,
 * a nie różnicę pokrycia.
 */
const SPEC = /\.(?:spec|test)\.(?:c|m)?[jt]sx?$/;

/** Rodzaje uzasadnień wyłączenia. Inny rodzaj to wpis, którego bramka nie rozumie. */
const RODZAJE = ['zapis', 'pomiar'];

/**
 * Flagi zawężające przebieg. `--project` i `--grep` zamieniają macierz w jeden silnik
 * albo w podzbiór testów, nie zmieniając ani konfiguracji, ani listy plików — czyli
 * punkty 1–3 wyglądałyby wtedy tak samo jak dziś, a biegłoby co innego. `--shard`
 * świadomie NIE jest tu wymieniony: dzieli ten sam zbiór na maszyny, więc suma
 * przebiegów zostaje pełna.
 */
const ZAWEZAJACE = [
  ['--project', /(?:^|\s)--project(?:=|\s)/],
  ['--grep', /(?:^|\s)--grep(?:-invert)?(?:=|\s)/],
];

/**
 * Sondy faktów o silnikach. Klucz jest tym, co wpisuje się w pole `fakt` wyłączenia
 * rodzaju `pomiar`; wartość odpowiada na pytanie „czy ten silnik to potrafi".
 *
 * `podmiana-kolorow-autora` — czy pod `forced-colors: active` przeglądarka zastępuje
 * kolory autora paletą użytkownika. Sonda mierzy to na elemencie BEZ żadnych reguł
 * biblioteki, bo pyta o zachowanie przeglądarki, a nie o arkusz: tło `rgb(1, 2, 3)`
 * jest wartością, której nie ma w żadnej palecie, więc każda odpowiedź inna niż ona
 * sama znaczy „podmieniono".
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
 * Naruszenie jednej z kontroli. Niesie parę `kontrola` + `regula`, a nie sam
 * identyfikator punktu: punkt bramki to nie jedno zdanie (`lesson-50`), a kontrola
 * odniesienia porównująca sam punkt przepuszcza przypadek, który zapalił na sąsiedniej
 * regule tego samego punktu.
 */
class BladPrzegladarek extends Error {
  constructor(kontrola, regula, opis) {
    super(opis);
    this.kontrola = kontrola;
    this.regula = regula;
  }
}

const lista = (items) => items.map((i) => `      ${i}`).join('\n');

// ── kontrole ──────────────────────────────────────────────────────────────────

/**
 * Komplet kontroli na gotowym wejściu:
 *   `polityka` — treść `przegladarki.policy.json`,
 *   `zebrane`  — `{ [silnik]: [pliki] }`, zmierzone przez `playwright test --list`,
 *   `pliki`    — pliki specyfikacji z indeksu gita, względem `testDir`,
 *   `e2e`      — `{ polecenie }` z targetu `sandbox-e2e:e2e` w grafie Nx,
 *   `ci`       — `{ instalacje: [[silnik]], uruchamiaE2E }` z workflow,
 *   `fakty`    — `{ [fakt]: { [silnik]: boolean } }`, wynik sond.
 * Rzuca `BladPrzegladarek` przy pierwszym naruszeniu — kontrole idą od mianownika,
 * więc dalsze i tak nie miałyby czego badać.
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

  // 1. MIANOWNIK. Każda z trzech list z osobna potrafi być pusta z innego powodu
  // i każda pusta daje bramkę, która przechodzi zawsze, bo nie ma czego porównywać.
  if (!silniki.length)
    throw new BladPrzegladarek(
      'mianownik',
      'polityka-bez-silnikow',
      `${POLITYKA} nie deklaruje ani jednego silnika — punkty 2–6 chodzą po tej liście, ` +
        `więc przeszłyby wtedy w komplecie, nie zaglądając do niczego`,
    );
  if (!pliki.length)
    throw new BladPrzegladarek(
      'mianownik',
      'brak-plikow',
      `nie znalazłem ani jednego pliku specyfikacji w \`${TESTDIR}\` (indeks gita) — ` +
        `punkt 3 porównywałby zebrane testy z pustym zbiorem, czyli z niczym`,
    );
  const razem = Object.values(zebrane ?? {}).reduce(
    (n, p) => n + (p?.length ?? 0),
    0,
  );
  if (!razem)
    throw new BladPrzegladarek(
      'mianownik',
      'pomiar-pusty',
      `\`playwright test --list\` nie zebrał ani jednego pliku na żadnym silniku. ` +
        `Playwright kończy się wtedy zerem i przebieg e2e jest zielony — ` +
        `to jest dokładnie ten stan, w którym macierz nie mierzy niczego`,
    );

  // 2. Silniki. Zbiór zebranych projektów wobec zbioru z polityki, w obie strony:
  // pierwsza łapie silnik wykreślony z konfiguracji, druga — projekt dopisany do niej
  // bez zdania w polityce, czyli bez miejsca, w którym ktoś by go uzasadnił.
  const zebraneSilniki = Object.keys(zebrane ?? {});
  const nieobecne = silniki.filter((s) => !(zebrane?.[s]?.length ?? 0));
  if (nieobecne.length)
    throw new BladPrzegladarek(
      'silniki',
      'silnik-nieobecny',
      `${nieobecne.length} silników z polityki nie zbiera ani jednego testu: ${nieobecne.join(', ')}.\n` +
        `    Projekt usunięty z \`projects\` w \`playwright.config.mts\` (albo zawężony ` +
        `\`testIgnore\` do zera plików) nie daje czerwonego przebiegu — daje przebieg ` +
        `krótszy o silnik. Lek: przywrócić projekt albo wykreślić silnik z ${POLITYKA} ` +
        `i uzasadnić to w \`req-quality-browsers\`.`,
    );
  const nadmiarowe = zebraneSilniki.filter((s) => !silniki.includes(s));
  if (nadmiarowe.length)
    throw new BladPrzegladarek(
      'silniki',
      'silnik-nadmiarowy',
      `${nadmiarowe.length} projektów Playwrighta nie ma wpisu w polityce: ${nadmiarowe.join(', ')}.\n` +
        `    Punkty 3 i 6 chodzą po silnikach Z POLITYKI, więc projekt spoza niej ` +
        `biegnie w CI, kosztuje czas i nie jest przez tę bramkę oglądany ani razu.`,
    );

  const wzorcowe = silniki.filter((s) => polityka.silniki[s]?.wzorcowy);
  if (wzorcowe.length !== 1)
    throw new BladPrzegladarek(
      'silniki',
      'wzorcowy-niejednoznaczny',
      `polityka wskazuje ${wzorcowe.length} silników wzorcowych (${wzorcowe.join(', ') || 'żadnego'}), ` +
        `a ma wskazywać dokładnie jeden.\n` +
        `    Silnik wzorcowy jest odniesieniem punktu 6: fakt, który nie zachodzi u NIKOGO, ` +
        `nie jest wadą silnika, tylko zepsutą sondą. Bez jednoznacznego odniesienia ` +
        `nie ma jak tego odróżnić.`,
    );
  const [wzorcowy] = wzorcowe;
  const wzorcoweWylaczenia = wylaczenia.filter((w) =>
    (w?.silniki ?? []).includes(wzorcowy),
  );
  if (wzorcoweWylaczenia.length)
    throw new BladPrzegladarek(
      'silniki',
      'wzorcowy-z-wylaczeniem',
      `silnik wzorcowy \`${wzorcowy}\` stoi w ${wzorcoweWylaczenia.length} wyłączeniach ` +
        `(${wzorcoweWylaczenia.map((w) => w.plik).join(', ')}).\n` +
        `    Wzorcowy jest tym, który biegnie BEZ wyłączeń — to on jest miarą dla ` +
        `pozostałych. Silnik z dziurą przestaje nią być, a punkt 3 przestaje mieć ` +
        `z czym porównywać pokrycie.`,
    );

  // 3. POKRYCIE. Najpierw obie strony mianownika: plik z repo, którego nie zebrał
  // nikt, i plik zebrany, którego nie ma w repo. Dopiero potem luka na silniku.
  const wszystkieZebrane = new Set(
    Object.values(zebrane ?? {}).flatMap((p) => p ?? []),
  );
  const niezebrane = pliki.filter((p) => !wszystkieZebrane.has(p));
  if (niezebrane.length)
    throw new BladPrzegladarek(
      'pokrycie',
      'plik-poza-pomiarem',
      `${niezebrane.length} plików specyfikacji nie zebrał ŻADEN silnik:\n` +
        lista(niezebrane) +
        `\n    Plik leży w \`${TESTDIR}\`, jest w indeksie gita i nie biegnie nigdzie — ` +
        `zwykle przez wzorzec \`testMatch\`, \`testDir\` albo \`testIgnore\` dopisany ` +
        `wszystkim projektom naraz. Przebieg jest zielony, bo Playwright nie ma czego ` +
        `uruchomić.`,
    );
  const spozaRepo = [...wszystkieZebrane].filter((p) => !pliki.includes(p));
  if (spozaRepo.length)
    throw new BladPrzegladarek(
      'pokrycie',
      'plik-spoza-repo',
      `${spozaRepo.length} plików zebranych przez Playwrighta nie ma w indeksie gita:\n` +
        lista(spozaRepo) +
        `\n    Mianownik punktu 3 bierze się z gita, więc taki plik jest dla niego ` +
        `niewidzialny: biegnie, a bramka nie ma jak zapytać, czy biegnie wszędzie.`,
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
        `\n    Tak wygląda \`testIgnore\` poszerzony „bo miga": pokrycie kurczy się o jeden plik, ` +
        `przebieg zostaje zielony i skraca się o kilka sekund. Lek: naprawić test albo ` +
        `dopisać wyłączenie z powodem do ${POLITYKA}.`,
    );

  // 4. Rejestr wyłączeń. Wpis martwy jest tu tą samą wadą co martwe słowo w słowniku
  // nazw tokenów: zostaje po problemie, który zniknął, i uczy czytać go jako aktualny.
  for (const wpis of wylaczenia) {
    const gdzie = `wyłączenie \`${wpis?.plik ?? '(bez pliku)'}\``;
    if (!wpis?.plik || !pliki.includes(wpis.plik))
      throw new BladPrzegladarek(
        'rejestr',
        'wpis-bez-pliku',
        `${gdzie} wskazuje plik, którego nie ma w \`${TESTDIR}\` (indeks gita).\n` +
          `    Wpis bez pliku nie zapala niczego i nie chroni niczego — czyta się go ` +
          `jako opis stanu, a opisuje stan sprzed usunięcia albo przemianowania.`,
      );
    const silnikiWpisu = wpis.silniki ?? [];
    const nieznane = silnikiWpisu.filter((s) => !silniki.includes(s));
    if (!silnikiWpisu.length || nieznane.length)
      throw new BladPrzegladarek(
        'rejestr',
        'wpis-bez-silnika',
        `${gdzie} wymienia ${silnikiWpisu.length ? `nieznane silniki: ${nieznane.join(', ')}` : 'pustą listę silników'}.\n` +
          `    Punkt 3 szuka wpisu po parze plik × silnik, więc taki wpis nie zwalnia ` +
          `z niczego i jednocześnie wygląda w rejestrze na uzasadnienie.`,
      );
    if (!RODZAJE.includes(wpis.rodzaj))
      throw new BladPrzegladarek(
        'rejestr',
        'wpis-nieznanego-rodzaju',
        `${gdzie} ma \`rodzaj: ${JSON.stringify(wpis.rodzaj)}\`, a rozumiem ` +
          `${RODZAJE.map((r) => `\`${r}\``).join(' i ')}.\n` +
          `    Rodzaj rozstrzyga, czy punkt 6 ma ten wpis SPRAWDZIĆ sondą, czy przyjąć ` +
          `jako spisaną decyzję. Wpis nierozpoznanego rodzaju wypadłby z tego pytania.`,
      );
    if (typeof wpis.powod !== 'string' || wpis.powod.trim().length < 40)
      throw new BladPrzegladarek(
        'rejestr',
        'wpis-bez-powodu',
        `${gdzie} nie niesie powodu (albo niesie jedno zdanie bez treści).\n` +
          `    Rejestr wyłączeń jest jedynym miejscem, w którym ktoś tłumaczy, dlaczego ` +
          `plik NIE biegnie — bez tego jest listą, która rośnie.`,
      );
    if (wpis.rodzaj === 'pomiar' && !SONDY[wpis.fakt])
      throw new BladPrzegladarek(
        'rejestr',
        'wpis-bez-sondy',
        `${gdzie} jest rodzaju \`pomiar\`, a \`fakt: ${JSON.stringify(wpis.fakt)}\` ` +
          `nie ma sondy w \`check-browsers.mjs\`.\n` +
          `    Rodzaj \`pomiar\` obiecuje, że uzasadnienie jest sprawdzane przy każdym ` +
          `przebiegu. Bez sondy jest to \`zapis\` udający pomiar — czyli gorzej niż zapis.`,
      );
    const martwe = silnikiWpisu.filter((s) =>
      (zebrane[s] ?? []).includes(wpis.plik),
    );
    if (martwe.length)
      throw new BladPrzegladarek(
        'rejestr',
        'wpis-martwy',
        `${gdzie} wyłącza silniki, na których ten plik i tak biegnie: ${martwe.join(', ')}.\n` +
          `    Wyłączenie bez skutku zostaje po problemie, którego już nie ma, ` +
          `a czyta się je jako opis dzisiejszego stanu.`,
      );
  }

  // 5. CI. Bramka mierzy `--list`, czyli konfigurację — a biegnie POLECENIE. Między
  // jednym a drugim mieści się `--project=chromium`, którego punkty 1–3 nie widzą.
  const wadaPolecenia = ZAWEZAJACE.filter(([, wzorzec]) =>
    wzorzec.test(e2e?.polecenie ?? ''),
  ).map(([nazwa]) => nazwa);
  if (!e2e?.polecenie)
    throw new BladPrzegladarek(
      'ci',
      'e2e-bez-polecenia',
      `target \`sandbox-e2e:e2e\` nie ma polecenia, które dałoby się przeczytać — ` +
        `bramka nie ma jak sprawdzić, czy przebieg nie jest zawężony`,
    );
  if (wadaPolecenia.length)
    throw new BladPrzegladarek(
      'ci',
      'e2e-zawezony',
      `polecenie targetu \`sandbox-e2e:e2e\` zawęża przebieg (${wadaPolecenia.join(', ')}):\n` +
        `      ${e2e.polecenie}\n` +
        `    Konfiguracja deklaruje wtedy trzy silniki, \`--list\` pokazuje trzy silniki, ` +
        `a biegnie jeden. To jedyne zawężenie, którego nie widać w \`playwright.config.mts\`.`,
    );

  if (!ci?.instalacje?.length)
    throw new BladPrzegladarek(
      'ci',
      'ci-bez-instalacji',
      `w \`${CI}\` nie ma ani jednego kroku \`playwright install\` — przeglądarki nie ` +
        `biorą się z niczego, więc albo przebieg pada, albo (gorzej) ktoś to naprawił, ` +
        `zawężając macierz`,
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
      `${brakiCi.length} kroków instalacji przeglądarek w \`${CI}\` nie wymienia silnika z polityki:\n` +
        lista(brakiCi) +
        `\n    Kroki są dwa (pudło i trafienie w cache) i muszą wymieniać to samo: ` +
        `silnik zainstalowany tylko przy pudle znika przy pierwszym trafieniu.`,
    );
  if (!ci.uruchamiaE2E)
    throw new BladPrzegladarek(
      'ci',
      'ci-bez-e2e',
      `w \`${CI}\` nie widzę uruchomienia targetu \`e2e\`.\n` +
        `    To jest mianownik całej tej bramki: macierz opisuje przebieg, którego ` +
        `nie ma, a wszystkie punkty wyżej przechodzą, bo konfiguracja jest w porządku.`,
    );

  // 6. FAKT. Sonda w każdym silniku, dla każdego faktu, na który powołuje się
  // wyłączenie rodzaju `pomiar`. Trzy reguły, bo są trzy różne sposoby, na jakie
  // to uzasadnienie potrafi przestać obowiązywać, i tylko jeden z nich jest głośny.
  const zPomiaru = wylaczenia.filter((w) => w.rodzaj === 'pomiar');
  for (const fakt of [...new Set(zPomiaru.map((w) => w.fakt))]) {
    const wynik = fakty?.[fakt] ?? {};
    const bezWyniku = silniki.filter((s) => typeof wynik[s] !== 'boolean');
    if (bezWyniku.length)
      throw new BladPrzegladarek(
        'fakt',
        'sonda-nieudana',
        `sonda \`${fakt}\` nie dała wyniku dla: ${bezWyniku.join(', ')}.\n` +
          `    Bez wyniku nie ma jak orzec, czy wyłączenie nadal ma powód — ` +
          `a brak orzeczenia domyślnie oznacza „zostaje", czyli najgorszą z odpowiedzi.`,
      );

    const wylaczoneTu = new Set(
      zPomiaru.filter((w) => w.fakt === fakt).flatMap((w) => w.silniki),
    );
    if (!silniki.some((s) => wynik[s]))
      throw new BladPrzegladarek(
        'fakt',
        'fakt-bez-odniesienia',
        `sonda \`${fakt}\` nie zachodzi u ŻADNEGO silnika, w tym u wzorcowego ` +
          `\`${wzorcowy}\`.\n` +
          `    To nie jest wada silników, tylko sondy: gdyby zaczęła zwracać fałsz ` +
          `zawsze, każde wyłączenie oparte na niej wyglądałoby na uzasadnione ` +
          `w nieskończoność. Mianownik pomiaru, nie ostrożność.`,
      );

    const przezyly = [...wylaczoneTu].filter((s) => wynik[s]);
    if (przezyly.length)
      throw new BladPrzegladarek(
        'fakt',
        'fakt-nieaktualny',
        `\`${fakt}\` zachodzi już u silników, które są z tego powodu wyłączone: ${przezyly.join(', ')}.\n` +
          `    Powód wyłączenia zniknął — najpewniej przy podbiciu Playwrighta, ` +
          `czyli przy zmianie, która w tym repozytorium nie rusza ani jednego pliku. ` +
          `Lek: zdjąć wpis z ${POLITYKA} i z \`testIgnore\`, a potem zobaczyć, ` +
          `co ten plik ma tam do powiedzenia.`,
      );

    const bezPokrycia = silniki.filter((s) => !wynik[s] && !wylaczoneTu.has(s));
    if (bezPokrycia.length)
      throw new BladPrzegladarek(
        'fakt',
        'fakt-nieodwzorowany',
        `\`${fakt}\` nie zachodzi u silników, na których pliki i tak biegną: ${bezPokrycia.join(', ')}.\n` +
          `    Testy pytają tam o zachowanie, którego ten silnik nie ma — przejdą albo ` +
          `nie przejdą, ale w obu przypadkach zmierzą co innego, niż mówi ich nazwa.`,
      );
  }

  const wyl = wylaczenia.length;
  return (
    `${pliki.length} plików specyfikacji na ${silniki.length} silnikach ` +
    `(${silniki.map((s) => `${s}: ${zebrane[s].length}`).join(', ')}), ` +
    `${wyl} ${wyl === 1 ? 'wyłączenie' : 'wyłączeń'} — ` +
    `${zPomiaru.length} z nich potwierdzone sondą`
  );
};

// ── wejście z dysku ───────────────────────────────────────────────────────────

const czytaj = (sciezka) => readFileSync(join(ROOT, sciezka), 'utf8');

const politykaZDysku = () => JSON.parse(czytaj(POLITYKA));

/**
 * Co Playwright NAPRAWDĘ zbiera, projekt po projekcie. `--list` nie uruchamia
 * `webServer` ani przeglądarek, więc pomiar kosztuje sekundy, a nie minuty — i mimo to
 * przechodzi przez ten sam kod konfiguracji, co prawdziwy przebieg.
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
      `\`playwright test --list\` nie dał się uruchomić:\n    ` +
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
      `wyjście \`playwright test --list --reporter=json\` nie jest JSON-em ` +
        `(${surowe.length} znaków) — bramka nie ma z czego wyprowadzić macierzy`,
    );
  }
  if (raport.errors?.length)
    throw new BladPrzegladarek(
      'mianownik',
      'pomiar-nieczytelny',
      `Playwright zgłosił ${raport.errors.length} błędów przy zbieraniu testów:\n    ` +
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

  // Projekt bez ani jednego testu nie pojawia się w drzewie wyników, a punkt 2 ma
  // o nim mówić po nazwie — stąd pusta lista zamiast braku klucza.
  for (const projekt of raport.config?.projects ?? [])
    zebrane[projekt.name] ??= new Set();

  return Object.fromEntries(
    Object.entries(zebrane).map(([k, v]) => [k, [...v].sort()]),
  );
};

/**
 * Pliki specyfikacji z INDEKSU GITA, nie ze skanu katalogu: plik niezacommitowany
 * jeszcze nikogo nie obowiązuje, a artefakt w `dist/` nie jest niczyim testem.
 */
const plikiSpec = () =>
  execFileSync('git', ['ls-files', TESTDIR], { cwd: ROOT, encoding: 'utf8' })
    .split('\n')
    .map((p) => p.trim())
    .filter((p) => p && SPEC.test(p))
    .map((p) => p.slice(`${TESTDIR}/`.length))
    .sort();

/**
 * Polecenie targetu `e2e` Z GRAFU NX, a nie z `project.json`: ten target jest
 * INFEROWANY przez `@nx/playwright/plugin`, więc w pliku projektu nie ma go wcale.
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
 * Co robi workflow. Czytane z tekstu, bo pytanie jest o tekst: które silniki wymienia
 * krok instalacji i czy target `e2e` w ogóle stoi na liście uruchamianych.
 *
 * Komentarze są obcinane PRZED szukaniem i nie jest to ostrożność na wyrost: ten
 * workflow tłumaczy każdy swój krok akapitem prozy, więc zdanie o `playwright install`
 * wygląda dla wzorca dokładnie jak wywołanie `playwright install`. Bramka zameldowała
 * to sobie sama przy pierwszym przebiegu po dopisaniu własnego komentarza — czyli
 * policzyła cztery kroki instalacji tam, gdzie są dwa, i dwa z nich zapaliła.
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
 * Sondy w prawdziwych przeglądarkach — po jednej stronie na silnik, bez serwera
 * i bez aplikacji. Mierzy się tu zachowanie SILNIKA, więc im mniej jest wokół,
 * tym mniej rzeczy może odpowiedzieć zamiast niego.
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
      // Brak wyniku jest tu treścią, nie awarią: punkt 6 ma o tym POWIEDZIEĆ
      // (reguła `sonda-nieudana`), a nie przewrócić bramkę stosem wywołań.
    } finally {
      await przegladarka?.close();
    }
  }
  return fakty;
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

// ── przebieg ──────────────────────────────────────────────────────────────────

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
    `tools/check-browsers.fixtures: katalog nie istnieje — bramka bez dowodu, ` +
      `że potrafi nie przejść, jest kolejną cichą wadą (req-quality-negative-control)`,
  );

const przypadki = existsSync(FIXTURES)
  ? readdirSync(FIXTURES)
      .filter((n) => n.endsWith('.json') && n !== BAZA)
      .sort()
  : [];

if (existsSync(FIXTURES) && !przypadki.length)
  problems.push(
    `tools/check-browsers.fixtures: brak spreparowanych wejść — bramka bez dowodu, ` +
      `że potrafi nie przejść, jest kolejną cichą wadą (req-quality-negative-control)`,
  );

// Wejście wzorcowe MUSI przejść. Gdyby samo było wadliwe, każdy przypadek zapalałby
// z jego powodu, a nie z powodu swojej wady — i wszystkie „zapaliło" byłyby fałszywe.
if (przypadki.length) {
  try {
    sprawdzPrzegladarki(zlozFixture({}));
  } catch (blad) {
    if (!(blad instanceof BladPrzegladarek)) throw blad;
    problems.push(
      `${BAZA}: wejście wzorcowe NIE przechodzi (${blad.kontrola}/${blad.regula}) — ` +
        `każdy spreparowany przypadek zapala teraz z jego powodu.\n    ${blad.message}`,
    );
  }
}

for (const nazwa of przypadki) {
  const fx = wczytajFixture(nazwa);
  try {
    sprawdzPrzegladarki(zlozFixture(fx));
    problems.push(
      `${nazwa}: spreparowane wejście PRZESZŁO, a miało nie przejść — ` +
        `reguła \`${fx.kontrola}/${fx.regula}\` przestała cokolwiek badać`,
    );
  } catch (blad) {
    if (!(blad instanceof BladPrzegladarek)) throw blad;
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
    `X Bramka macierzy przeglądarek — ${problems.length} naruszeń:\n`,
  );
  for (const p of problems) console.error(`  - ${p}`);
  console.error('');
  process.exit(1);
}

console.log(
  `✓ Macierz przeglądarek: ${opis}. Kontrola odniesienia: wejście wzorcowe przechodzi, ` +
    `${przypadki.length} spreparowanych odrzuconych na swoich regułach.`,
);
