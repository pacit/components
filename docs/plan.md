# Plan pracy — lista zadań

> **Ten plik jest pisany ręcznie.** Jest jedynym miejscem, w którym wolno trzymać stan
> „zrobione / w toku / do zrobienia" i notatki przenoszone między sesjami.
>
> Nie duplikuje [rejestru](rejestr.md): rejestr (generowany) mówi, **które obietnice nie
> mają bramki**, a ten plik — **w jakiej kolejności je domykamy i co już poszło**. Gdy
> jedno przeczy drugiemu, rację ma rejestr: jest wyprowadzony z dokumentacji, a to jest
> lista zadań pisana ręką.

## Jak z tego korzystać

**Na starcie sesji** — sprawdź, czy plan nie skłamał:

```bash
node tools/check-docs.mjs
```

Wypisuje aktualne liczby (`egzekwowane / częściowo / luka`). Jeśli nie zgadzają się
z sekcją [Stan](#stan), popraw ją, zanim cokolwiek zaczniesz.

**Na koniec sesji** — odhacz zadania i dopisz wpis do [dziennika](#dziennik). Zadanie
przechodzi na `[x]` dopiero wtedy, gdy spełnia definicję ukończenia.

### Definicja ukończenia zadania

Wprost z [`wym-os`](00-os.md): obietnica bez bramki jest niedokończona, a bramka bez
dowodu zapalenia — niedokończona piętro wyżej. Zadanie jest `[x]`, gdy:

1. bramka istnieje i **biegnie w CI** (`nx affected -t …` w `.github/workflows/ci.yml`),
2. ma **kontrolę odniesienia** — test albo zapisany przebieg dowodzący, że potrafi
   **nie** przejść,
3. wymaganie w [`wymagania/`](wymagania/) ma zaktualizowane pola **Bramka** i **Kontrola**,
4. `node tools/check-docs.mjs --write` przepisał rejestr, a pozycja zniknęła z listy luk.

Punkt 4 jest jedynym twardym dowodem — pierwsze trzy bez niego są deklaracją.

### Oznaczenia

| zapis | znaczenie                                                                         |
| ----- | --------------------------------------------------------------------------------- |
| `[ ]` | nie zaczęte                                                                       |
| `[~]` | w toku — w notatce **czym się skończyło**, żeby dało się podjąć bez czytania kodu |
| `[x]` | domknięte wg definicji wyżej                                                      |
| `[-]` | świadomie odrzucone — wtedy wymaganie dostaje `brak — świadomie: <powód>`         |

## Stan

Migawka z **2026-08-05**, `node tools/check-docs.mjs`:

| miara                                 | wartość |
| ------------------------------------- | ------: |
| wymagań                               |      81 |
| ✅ egzekwowane                        |      46 |
| 🟡 częściowo (świadomie bez kontroli) |      16 |
| ⛔ luka                               |      19 |

Wszystkie 19 luk mają niżej swojego właściciela (A, B, D, F, G). Jeśli po dopisaniu
wymagania liczba luk rośnie, a żadne zadanie się nie zmienia — ta lista przestała być
kompletna i to jest błąd tej listy, nie rejestru.

## Kolejność

```
A  bramki „natychmiast"        blokuje wszystko — każda pozycja drożeje z każdym komponentem
B  gotowość do wydania         można równolegle z A; wiąże przy pierwszej publikacji
C  otwarte znaleziska review   drobne, dobre na wypełniacz między A
D  warstwa zachowań w core     dopiero po A; blokuje E
E  komponenty                  dialog → tooltip/popover → menu → select → pola → tabela
F  powierzchnia zaufania       docs, ACR, benchmarki, most Figma
G  luki bez terminu            czekają na wyzwalacz zapisany w polu „Wiąże przy"
```

Pierwsze trzy, gdyby trzeba było wybrać tydzień: **A3** (domyka odblokowanie F1 razem
z gotowym już A4 i jest jedynym miejscem, w którym projekt zachowuje się jak zwykła
biblioteka), **A8** (obietnica sprzedażowa dziś niesprawdzana w ogóle), **A12** (pół dnia
na dwie luki, a jedna z nich to ta sama klasa co A4: policy bada wyłącznie to, co ktoś
wcześniej wpisał).

---

## A. Faza 0 — bramki „natychmiast"

Zostało siedem zadań i domykają **8 z 19 luk** — blisko połowy wszystkiego, co jeszcze
stoi otworem.

- [x] **A1 — kontrola odniesienia dla `check-package`** _(2026-08-04)_
  - domknęło: `wym-jakosc-pakiet`, `wym-projekt-pakiet`, `wym-projekt-entrypointy`,
    `wym-projekt-lib-tokenow`, `wym-token-css`, `wym-token-dystrybucja` — **6 luk**,
    a przy okazji `wym-wydanie-ng-add` (czyli **B5**) i kontrolę dla
    `wym-wydanie-metadane`: to te same punkty tej samej bramki, więc fixtures dla nich
    powstały tym samym ruchem
  - zrobione: `tools/check-package.fixtures/` — pakiet wzorcowy `_poprawny/` plus siedem
    przypadków składanych **na jego kopii**, więc katalog przypadku zawiera wyłącznie
    swoją wadę. `check-package.mjs` rozbity na kontrole zwracające identyfikator, żeby
    dało się sprawdzić nie tylko **że** fixture zapalił, ale **który punkt** go odrzucił —
    inaczej fixture wywalający się z przypadkowego powodu liczyłby się jako dowód
  - punkt 4 ma dwa przypadki (zła wartość i zniknięcie stałej), punkt 6 jest badany
    w obie strony: przy `--release` blokuje, na co dzień ostrzega i przepuszcza
  - kontrola tej kontroli: przebieg dowiódł zapalenia na czterech niezależnych sposobach
    zepsucia — rozbrojony punkt 3 w bramce, fixture przestający być wadliwym, fixture
    zapalający na cudzym punkcie, wadliwy pakiet wzorcowy
  - koszt: ~1 dzień · _notatki:_ udawany `package.json` w repo okazał się dla Nx
    projektem, a `.nxignore` naprawiał to kosztem unieważniania cache — patrz
    [`lekcja-44`](lekcje.md#lekcja-44)

- [x] **A2 — pokrycie z egzekwowanym progiem** _(2026-08-04)_
  - domknęło: `wym-jakosc-pokrycie` — najstarszy dług w projekcie
  - zrobione: `coverage` + `coverageInclude` + próg 80% w targecie `test`, do tego **druga
    bramka** `tools/check-coverage.mjs` (target `check-coverage`, w CI) i
    `libs/components/src/public-api.spec.ts`. Plan mówił „`coverageInclude` + próg" i to
    było za mało: sam próg pilnuje liczby, a psuje się **mianownik**
  - dlaczego dwie bramki: usunięcie `number.spec.ts` **podniosło** pokrycie z 96,55% na
    96,94%, bo nietestowany plik wypadł z raportu razem ze swoim testem. `coverageInclude`
    domyka to w połowie — dokłada pliki bez testu osobną ścieżką, która parsuje źródło
    rolldownem i wywraca się na `import type`, wypisując „Excluding it from coverage"
    i kończąc przebieg zielono ([`lekcja-45`](lekcje.md#lekcja-45))
  - kontrola: `tools/check-coverage.fixtures/` — siedem wejść, po jednym na sposób
    rozbrojenia bramki, każde odrzucane na swoim punkcie; plus dwa przebiegi na repo:
    usunięcie `public-api.spec.ts` zostawia `test` zielony (96,55%), a `check-coverage`
    zapala na `libs/components/src/index.ts`; usunięcie dwóch specyfikacji daje 64,96%
    i zapala oba progi
  - kontrola tej kontroli: rozbrojony punkt 3 → fixture „PRZESZŁO"; fixture przestający
    być wadliwym → to samo; wadliwe wejście wzorcowe → przypadek zapala na cudzym punkcie
  - koszt: ~1 dzień (plan zakładał 0,5) · _notatki:_ próg jest **podłogą, nie zapadką** —
    przy 96,58% usunięcie jednej specyfikacji go nie przebija. Zapadka to inna obietnica
    i musi przyjść z własną bramką

- [ ] **A3 — inwentarz `data-pct-part` + bramka**
  - domyka: `wym-api-czesci`
  - co: generowany spis części per komponent (skan szablonów) + snapshot w repo; zmiana
    nieuzgodniona = błąd CI. To jedyne miejsce, w którym projekt zachowuje się jak zwykła
    biblioteka: obietnica „możesz bezpiecznie stylować wnętrze" bez maszyny
  - kontrola: zmiana nazwy części bez aktualizacji inwentarza musi zapalić
  - koszt: ~1 dzień · _notatki:_ —

- [x] **A4 — snapshot nazw tokenów** _(2026-08-05)_
  - domknęło: `wym-token-nazwy`
  - zrobione: `tools/check-tokens.mjs` (target `check-tokens` w projekcie roota,
    `dependsOn: tokens:build`, w CI) — pięć punktów. Reguły są dwie (punkt 3: nazwa
    parsuje się wobec słownika `libs/tokens/src/nazwy.policy.json`, a komponent w nazwie
    jest prawdziwym entrypointem; punkt 5: `libs/tokens/tokens.snapshot.md` zgadza się
    z bieżącą listą), a **trzy pozostałe pilnują mianownika**: dwa niezależne odczyty
    listy nazw, zgodność `tokens.ts` i `_tokens.scss` z nią, zakaz martwych słów
    w słowniku
  - **plan mówił „dołożyć snapshot i porównanie" i to było za mało — było wręcz
    szkodliwe.** Repozytorium miało **34 tokeny z segmentami w odwrotnej kolejności**
    (`--pct-checkbox-checked-bg` sześć linii pod `--pct-checkbox-border-hover`), więc
    snapshot dołożony przed normalizacją zapisałby ten rozjazd jako stan zaakceptowany,
    a każde późniejsze przemianowanie byłoby już zmianą łamiącą
    ([`lekcja-49`](lekcje.md#lekcja-49)). Stąd punkt 3 **przed** punktem 5 i stąd
    normalizacja tym samym ruchem: 34 tokeny w 5 plikach DTCG, policy kontrastu,
    8 arkuszach i jednym e2e — 108 podmian
  - punkt 1 jest tym samym ruchem co punkt 2 w A5 („nie ufaj jednemu odczytowi"):
    lista nazw powstaje **dwa razy** — raz z tekstu `dist/pct.css`, raz z obejścia drzew
    DTCG — i musi wyjść ta sama. Pierwsze łapie generator gubiący token i nieaktualne
    `dist`, drugie — plik źródłowy, którego generator nie wczytuje
  - punkt 4 nie udaje, że rozstrzyga to, czego maszyna nie rozstrzygnie: słownik da się
    rozszerzyć razem ze złą nazwą. Pilnuje węższej rzeczy — słowo zadeklarowane musi być
    użyte — żeby dopisanie słowa było linią w diffie, którą widać w review. Ta sama
    konstrukcja co próg uzasadnienia wyjątku w A5
  - przy okazji: prefiksy prywatne (`pct.blue.`, `pct.slate.`) przeniesione z wyrażenia
    w `build.mjs` do polityki, żeby bramka je **czytała**, a nie zgadywała, co ten filtr
    znaczy. Wyszło z tego widoczne pytanie bez odpowiedzi: `pct.red.` prywatne **nie
    jest**, więc surowa rampa czerwieni stoi w publicznej unii `PctCssVar`, a niebieska
    i szara nie. Zostawione świadomie — to nie jest obietnica tej bramki (patrz **C6**)
  - kontrola: `tools/check-tokens.fixtures/` — jedenaście wejść, każde odrzucane na swoim
    punkcie; plus pięć przebiegów na prawdziwym repo (przemianowanie na inną poprawną
    nazwę, `disabled-bg` zamiast `bg-disabled`, `component.dialog.json` bez entrypointu,
    token usunięty z `dist/pct.css`, słowo dopisane do słownika bez użycia)
  - kontrola tej kontroli: rozbrojone po kolei wszystkie pięć punktów — 1, 2, 4 i 5 dają
    „PRZESZŁO", 3 przestawia cztery przypadki na cudzy punkt; przypadek przestający być
    wadliwym → to samo; wadliwe wejście wzorcowe → bramka zapala na nim osobno, a trzy
    przypadki idą na cudze punkty
  - koszt: ~1 dzień (plan zakładał 0,5; różnicę zjadła normalizacja) · _notatki:_
    rozbrojenie punktu 3 dało najpierw `TypeError` zamiast komunikatu — punkt 4 czytał
    wynik parsera wprost, ufając poprzedniemu. **Ta sama wada co w A7**, znaleziona tą
    samą kontrolą i naprawiona tak samo

- [x] **A5 — bramka stylów: właściwości logiczne + zakaz `opacity` na tekście**
      _(2026-08-05)_
  - domknęło: `wym-token-logiczne`, `wym-token-bez-opacity` — **2 luki**
  - zrobione: `tools/check-styles.mjs` (target `check-styles` w `components`, w CI) —
    sześć punktów. Reguły są dwie (punkt 5: właściwości i wartości fizyczne osi inline;
    punkt 6: `opacity` inna niż `0`/`1`), a **cztery pozostałe pilnują mianownika**:
    niepusta lista arkuszy, zgodność skanera z tym, co wypisuje sass, niepusty i zgodny
    zbiór komponentów, poprawność wyjątków. Wyjątek wymaga znacznika
    `/* pct-wyjatek <właściwość>: <powód> */` **przylegającego** do deklaracji — repo ma
    dziś cztery, dokładnie te dwa dobre, które plan przewidział
  - plan dawał wybór „skrypt albo stylelint" i wybór padł na skrypt: stylelint raportuje
    o plikach, które mu się poda, i **milczy o reszcie** — a milczenie o reszcie jest tu
    całą wadą. Do tego `/* stylelint-disable */` byłoby rozbrojeniem bez śladu
  - punkt 2 jest tym, którego plan nie przewidywał: skaner czyta tekst arkusza, a
    właściwość złożona mixinem albo interpolacją (`padding-#{$strona}`) dociera do
    przeglądarki, nie stojąc w tekście nigdzie. Bramka porównuje więc swój odczyt
    z wyjściem sassa — parsera prawdziwego. To ten sam ruch co w A7 („nie czytaj
    `include`, uruchom kompilator") i A6 („czytaj `ɵcmp` z `dist`, nie ze źródła")
  - plus (zgodnie z planem): **oś `dir`** w `SbxSettings`, w pasku globalnym i na karcie,
    z `[attr.dir]` na hoście powłoki i na scenie karty; **9 wzorców RTL** w
    `visual.spec.ts` (lista krótsza niż LTR — świadomie: zrzut RTL niesie informację tam,
    gdzie układ jest asymetryczny wzdłuż osi inline); **audyt axe na każdym widoku w RTL**
    (11 nowych testów) i `rtl.spec.ts` z pomiarami układu
  - **oś `dir` od razu znalazła wadę**: panel selecta żyje w nakładce CDK, czyli jako
    dziecko `body`, więc nie dziedziczy kierunku po kontrolce — zmierzone `direction: rtl`
    na triggerze wobec `ltr` na panelu, przy arkuszu bez ani jednej właściwości fizycznej.
    Trzecia właściwość z [`lekcja-35`](lekcje.md#lekcja-35) po motywie i piśmie; naprawione
    tym samym wzorcem (odczyt z triggera przy otwarciu), z testem, który bez poprawki pada
  - kontrola: `tools/check-styles.fixtures/` — dwanaście wejść, każde odrzucane na swoim
    punkcie; plus sześć przebiegów na prawdziwym repo (`padding-left` w `field.scss`,
    `opacity: 0.45` w `checkbox.scss`, usunięty znacznik wyjątku, komponent przeniesiony
    na `styles: [...]`, dekorator poza kotwicą parsera, `margin-right` schowany
    w mixinie) i przebieg `rtl.spec.ts` z cofniętą poprawką panelu
  - kontrola tej kontroli: rozbrojony punkt 5 → oba fixtures „PRZESZŁO"; przypadek
    przestający być wadliwym → to samo; wadliwe wejście wzorcowe → bramka zapala na nim
    osobno, a przypadki nieprzykrywające zepsutego arkusza przechodzą na cudze punkty
  - koszt: ~1,5 dnia (zgodnie z planem) · _notatki:_ bramka **przeszła na zielono, nie
    zmierzywszy ani jednego komponentu** — patrz [`lekcja-48`](lekcje.md#lekcja-48).
    Ta sama wada siedziała w `check-zoneless.mjs` (A6) i została naprawiona przy okazji

- [x] **A6 — bramka zoneless + OnPush** _(2026-08-04)_
  - domknęło: `wym-projekt-angular`, `wym-api-fundament` — **2 luki**
  - zrobione: `tools/check-zoneless.mjs` (target `check-zoneless`, `dependsOn: build`
    - `schematics`, w CI) — sześć punktów w jednym przebiegu, tak jak zakładał plan.
      Zoneless: manifesty z indeksu gita, drzewo `package-lock.json` (także instalacje
      zagnieżdżone), ślad runtime w zbudowanym pakiecie. Fundament: pomiar `ɵcmp.onPush`
      i `ɵcmp.standalone`, mianownik (każdy `@Component` ze źródeł musi być w pakiecie)
      i zakaz powtarzania wartości domyślnych w dekoratorze
  - plan mówił „`Zone` w zbudowanym bundlu" i to za mało precyzyjnie: `/zone/i` zapala
    na polskim „liczone" w komentarzu. Ślady są nazwane po jednym — `import 'zone.js'`,
    `NgZone`, `__zone_symbol__`, globalny `Zone` — żeby komunikat mówił, czego szukać
  - odczyt `ɵcmp` idzie z `dist` przez JIT, nie ze źródeł: deklaracja częściowa
    **pomija** `changeDetection`, gdy jest domyślne, więc wartość powstaje dopiero przy
    linkowaniu ([`lekcja-46`](lekcje.md#lekcja-46)). Efektem ubocznym jest to, o co
    chodziło: podbicie Angulara zmieniające domyślne zapala tę bramkę
  - kontrola: `tools/check-zoneless.fixtures/` — dwanaście wejść, każde odrzucane na
    swoim punkcie; plus cztery przebiegi na prawdziwym repo: `npm i -D zone.js` zapala
    punkt 1, cofnięcie wpisu w manifeście **bez** cofnięcia w locku — punkt 2,
    `ChangeDetectionStrategy.Default` w `PctButton` — punkt 6 od razu i punkt 5 po
    przebudowie, złamane formatowanie dekoratora — mianownik parsera (7 z 8)
  - kontrola tej kontroli: rozbrojony punkt 6 → fixture „PRZESZŁO"; fixture przestający
    być wadliwym → to samo; wadliwe wejście wzorcowe → osiem przypadków zapala na cudzych
    punktach
  - koszt: ~0,5 dnia (zgodnie z planem) · _notatki:_ komentarz w `project.json`
    twierdził najpierw, że jawne `standalone: true` daje bajt w bajt ten sam pakiet.
    Pomiar to obalił — rusza `ɵɵngDeclareClassMetadata`, czyli echo dekoratora dla
    debugowania. Źródła zostają w `inputs`, ale uzasadnieniem jest „bramka je czyta",
    a nie funkcja diagnostyczna, która może zniknąć

- [x] **A7 — bramka pokrycia targetem `typecheck`** _(2026-08-05)_
  - domknęło: `wym-jakosc-typecheck`
  - zrobione: `tools/check-typecheck.mjs` (target `check-typecheck` w projekcie roota,
    w CI) — cztery punkty. Do tego **brakujące targety**: `components` (trzy rozłączne
    programy: pakiet, specyfikacje z `testing/`, schematics), projekt roota
    (`tsconfig.root.json` na `vitest.config.ts` i `vitest.workspace.ts`) i nadpisany
    `sandbox`. `tokens` świadomie bez targetu — nie ma ani jednego pliku TS
  - plan mówił „projekt bez targetu `typecheck` zapala" i to było za mało: `sandbox`
    target **miał**, przechodził i nie oglądał czterech swoich plików, bo inferowany
    przez `@nx/vite/plugin` obejmuje wyłącznie `tsconfig.app.json`, a ten wyklucza
    `**/*.spec.ts` ([`lekcja-47`](lekcje.md#lekcja-47)). Stąd punkt 4: bramka nie czyta
    `include`, tylko **uruchamia polecenie z targetu** rozszerzone o `--listFilesOnly`
    i porównuje program kompilatora z indeksem gita
  - plan pomylił się też w diagnozie: „dziś ma go **tylko** `sandbox-e2e`". Miał go też
    `sandbox` — i to był gorszy przypadek, bo wyglądał na domknięty
  - punkt 1 to mianownik na piętro wyżej: `vitest.config.ts` i `vitest.workspace.ts`
    nie należą do żadnego projektu, więc bramka chodząca po projektach byłaby na nie
    ślepa. Punkt 3 pilnuje, że polecenia nie da się rozbroić po cichu — operator powłoki
    (`|| true`), `--noCheck`, brak `-p`
  - kontrola: `tools/check-typecheck.fixtures/` — jedenaście wejść, każde odrzucane na
    swoim punkcie; plus cztery przebiegi na prawdziwym repo: `sandbox` cofnięty do
    targetu inferowanego zapala punkt 4 na czterech plikach, `libs/components/dialog/`
    spoza `include` — punkt 4, nowy projekt bez targetu — punkt 2, `|| true` w poleceniu
    — punkt 3
  - kontrola tej kontroli: rozbrojony punkt 4 → oba fixtures „PRZESZŁO"; przypadek
    przestający być wadliwym → to samo; wadliwe wejście wzorcowe → bramka zapala na nim
    osobno, zanim policzy przypadki. Rozbrojony punkt 2 dał najpierw `TypeError` zamiast
    komunikatu — punkt 3 czytał `typecheck.polecenia` wprost, ufając poprzedniemu
  - koszt: ~0,5 dnia (zgodnie z planem) · _notatki:_ zmierzone, nie założone: projekt
    roota jest `affected` przy **każdej** zmianie (`nx show projects --affected --files=…`
    zwraca `@org/source` i dla źródła biblioteki, i dla `docs/`, i dla `project.json`
    nowego projektu), więc bramki workspace'owe biegną w każdym przebiegu — bez tego nowy
    projekt wymykałby się tej, która powstała właśnie po to

- [ ] **A8 — tree-shaking + budżet rozmiaru entrypointu**
  - domyka: `wym-projekt-tree-shaking`
  - co: build aplikacji importującej **wyłącznie** `@pacit/components/button` i asercja,
    że w bundlu nie ma ani `PctField`, ani CDK Overlay; do tego budżet rozmiaru per
    entrypoint, failujący na skoku
  - to obietnica sprzedażowa, dziś niesprawdzana w ogóle
  - kontrola: aplikacja importująca dwa entrypointy musi dać bundle zauważalnie większy —
    inaczej pomiar nic nie mierzy
  - koszt: ~1 dzień · _notatki:_ —

- [ ] **A9 — test konsumenta na Verdaccio**
  - domyka: `wym-jakosc-konsument`
  - co: `npm pack` → instalacja do świeżej aplikacji → build z SSR → jeden e2e.
    `.verdaccio/config.yml` i target `local-registry` w root `project.json` **istnieją
    i nie są przez nic używane**
  - `check-package` bada artefakt **statycznie**; to sprawdziłoby go w użyciu — wprost
    z własnej lekcji „zielony build nie jest dowodem, że artefakt da się użyć"
    ([`lekcja-36`](lekcje.md#lekcja-36))
  - kontrola: aplikacja zbudowana z pakietu bez skórki nie może przejść
  - koszt: 1–2 dni · _notatki:_ —

- [ ] **A10 — macierz przeglądarek**
  - domyka: `wym-jakosc-przegladarki`
  - co: webkit + firefox **funkcjonalnie** w `apps/sandbox-e2e/playwright.config.mts`
    (dziś wyłącznie chromium, reszta zakomentowana); zrzuty wizualne zostają na
    linux/chromium — rasteryzacja i tak by je rozjechała
  - kontrola: przebieg dowodzący, że test przechodzący na chromium potrafi nie przejść na
    webkicie
  - koszt: ~0,5 dnia + czas CI · _notatki:_ —

- [ ] **A11 — bramka tekstów**
  - domyka: `wym-api-teksty`
  - co: grep po literałach w szablonach biblioteki — każdy napis widoczny dla użytkownika
    idzie przez `PCT_TEXTS`. Dziś sprawdzone jest tylko nadpisanie częściowe
  - razem z tym: rozstrzygnąć **reaktywność `PCT_TEXTS`** (patrz C5) jako ADR, nie jako
    przeoczenie
  - kontrola: literał dopisany do szablonu musi zapalić
  - koszt: ~0,5 dnia · _notatki:_ —

- [ ] **A12 — kompletność par tekst/tło + poziomy tokenów**
  - domyka: `wym-token-pary-tekstu`, `wym-token-poziomy`
  - co: (1) porównanie listy powierzchni z listą par w `libs/tokens/src/contrast.policy.json`
    — nowa powierzchnia bez pary zapala; (2) zakaz odwołań token komponentowy → prymitywny
    z pominięciem warstwy semantycznej
  - kontrola: dodanie powierzchni bez pary musi zapalić; token komponentowy wskazujący
    wprost na prymitywny musi zapalić
  - koszt: ~0,5 dnia · _notatki:_ —

- [ ] **A13 — testowanie mutacyjne rdzenia**
  - domyka: `wym-jakosc-jednostkowe`
  - co: Stryker na `core`, `number`, `select`. Jedyna metoda odpowiadająca na pytanie
    „czy te testy w ogóle coś łapią" — czyli dokładnie to pytanie, które projekt zadaje
    sobie przy każdej bramce. Komplet zielonych testów sam z siebie nie jest dowodem
  - kontrola: próg przeżywalności mutantów wpięty w CI, nie raport do oglądania
  - koszt: 1–2 dni · _notatki:_ —

---

## B. Gotowość do pierwszego wydania

Można prowadzić równolegle z A. Wiąże przy pierwszej publikacji — a wtedy wszystko naraz.

- [ ] **B1 — `LICENSE` w repo**
  - `"license": "MIT"` w manifeście bez pliku to formalnie niepełna licencja, a to
    pierwsza rzecz, którą sprawdza dział prawny konsumenta korporacyjnego
  - koszt: minuty · _notatki:_ —

- [ ] **B2 — zdalne repozytorium + `repository` w manifeście**
  - dotyczy: `wym-wydanie-metadane` — bramka i jej kontrola są (A1), więc w rejestrze
    stoi ✅; brakuje **samego pola**, a bramka na co dzień tylko ostrzega i nikt jej nie
    słucha, bo przebieg jest zielony
  - `git remote -v` jest **puste** — dopóki repo nie ma zdalnego, `repository` nie ma czego
    wskazywać, npm odmawia provenance, a `check-package.mjs --release` blokuje wydanie
  - koszt: minuty (po decyzji, gdzie repo ma stać) · _notatki:_ —

- [ ] **B3 — README pakietu i `description` po angielsku**
  - `libs/components/README.md` to wciąż stub z generatora Nx („This library was generated
    with Nx") i **jedzie do `dist`** — czyli jest stroną pakietu na npm. `description`
    w manifeście jest po polsku
  - koszt: ~0,5 dnia · _notatki:_ —

- [ ] **B4 — JSDoc publicznego API po angielsku**
  - ten tekst wyświetla się w podpowiedzi edytora **u konsumenta**, nie w tym repo.
    Podział jest już zapisany w [`docs/README.md`](README.md): dokumentacja robocza po
    polsku, powierzchnia publiczna po angielsku — brakuje wykonania
  - koszt: 1–2 dni (mechaniczne) · _notatki:_ —

- [x] **B5 — kontrola odniesienia dla `ng add`** _(2026-08-04, razem z A1)_
  - domknęło: `wym-wydanie-ng-add`
  - zrobione: `tools/check-package.fixtures/brak-schematica/` — kolekcja wskazuje fabrykę,
    której skompilowanego pliku nie ma, i musi zapalić punkt 5. Wyszło tym samym ruchem
    co A1, bo to punkt tej samej bramki; osobne zadanie było zbędne od początku

- [ ] **B6 — dokument polityki wsparcia**
  - domyka: `wym-wydanie-wsparcie`
  - co: okno wsparcia (ile wersji Angulara wstecz, jak długo), polityka deprecacji (ile
    minorów ostrzeżenia przed usunięciem), wymóg codemodu przy zmianie łamiącej —
    kolekcja migracji istnieje, ale nic nie wiąże `feat!` z wpisem w niej
  - kontrola: commit `feat!:` bez wpisu w kolekcji migracji musi zapalić
  - koszt: ~1 dzień · _notatki:_ —

- [ ] **B7 — bramka listy zależności**
  - domyka: `wym-projekt-zaleznosci`
  - co: siódmy punkt w `check-package.mjs` — `dependencies` / `peerDependencies`
    w **spakowanym** manifeście wobec listy dozwolonej. Dziś nic nie odróżnia zależności
    świadomej od dodanej odruchowo
  - kontrola: manifest z dopisaną zależnością spoza listy musi zapalić
  - koszt: ~0,5 dnia · _notatki:_ —

---

## C. Otwarte znaleziska z review

Sprawdzone w kodzie **2026-08-03** — wszystkie nadal aktualne. Drobne, dobre na wypełniacz
między większymi zadaniami. Pełny kontekst: [`review.md`](review.md) §5.

- [ ] **C1 — `pct-select` bez obudowy jest nienazwanym comboboxem**
  - `aria-label` ląduje na hoście `<pct-select>`, który nie ma roli; `role="combobox"`
    siedzi na wewnętrznym `<button>`. Konsument nie ma jak tego naprawić
  - potrzebne: jawne wejścia `ariaLabel` / `ariaLabelledby` przenoszone na element z rolą —
    reguła dla każdego przyszłego komponentu, w którym rola nie siedzi na hoście
  - to realna luka a11y, nie kosmetyka · _notatki:_ —

- [ ] **C2 — `track option.value` przy generycznym `T`**
  - `libs/components/select/src/select.html` — dla `T` nieprymitywnego to śledzenie po
    referencji, a dwie opcje o tej samej wartości dają NG0955 w trybie deweloperskim.
    Albo `track $index`, albo udokumentowany wymóg unikalności z ostrzeżeniem pod
    `isDevMode()` · _notatki:_ —

- [ ] **C3 — `PctField.attach()` nadpisuje po cichu**
  - `libs/components/field/src/field.ts` — druga kontrolka w jednej obudowie wygrywa bez
    słowa. Klasyczna cicha wada, tania do domknięcia: `console.warn` pod `isDevMode()`
    · _notatki:_ —

- [ ] **C4 — `_tokens.scss`: generowany, wieziony w pakiecie, używany przez zero linii**
  - dotyczy: `wym-token-scss` — w arkuszach komponentów nie ma ani jednego `@use`;
    wszystkie odwołania to surowe `var(--pct-*)`
  - decyzja: albo uczynić go obowiązkową drogą do tokenu (literówka staje się błędem
    kompilacji — duch [`lekcja-43`](lekcje.md#lekcja-43)), albo wyrzucić z wymagania
    i z pakietu. Dziś to martwy artefakt w publikowanym pakiecie · _notatki:_ —

- [ ] **C6 — prymitywy w publicznej unii `PctCssVar`: dwie rampy prywatne, trzecia nie**
  - `libs/tokens/src/nazwy.policy.json` deklaruje `pct.blue.` i `pct.slate.` jako
    prywatne, a `pct.red.` nie — więc konsument widzi w typie `--pct-red-600` i nie widzi
    `--pct-blue-600`. Rozjazd zastany, przeniesiony przy A4 z wyrażenia w `build.mjs` do
    polityki, czyli **z niewidocznego miejsca w widoczne** — i tam zostawiony
  - do rozstrzygnięcia szerzej niż jedna rampa: czy prymitywy w ogóle należą do
    powierzchni publicznej. Argument za: e2e i kod budujący motyw pytają przeglądarkę
    o wartości i typ jest jedyną ochroną przed literówką ([`lekcja-43`](lekcje.md#lekcja-43)).
    Argument przeciw: prymityw jest implementacją skórki, a nie jej kontraktem
  - koszt: minuty na zmianę, decyzja jest całym zadaniem · _notatki:_ —

- [ ] **C5 — `PCT_TEXTS` nie przeżyje zmiany języka w runtime**
  - `providePctTexts` zwraca statyczny obiekt, a `PctSelect` czyta go **raz przy
    konstrukcji** (`input<string>(this.texts.selectPlaceholder)`). Aplikacja przełączająca
    język bez przeładowania nie zobaczy nowych napisów
  - do rozstrzygnięcia **zanim `PCT_TEXTS` urośnie**: token niesie `Signal<PctTexts>`,
    fabryka zamiast wartości, albo zapisane wprost „zmiana języka wymaga przeładowania".
    Trzecia opcja jest obronna, ale musi być decyzją (ADR), nie przeoczeniem · _notatki:_ —

---

## D. Faza 1 — warstwa zachowań w `core`

Największe ryzyko architektoniczne. Maszyneria listy (typeahead, `activeIndex`, pomijanie
wyłączonych) siedzi dziś jako prywatne metody w `PctSelect`, a potrzebują jej
autocomplete, multiselect, menu, combobox i paleta poleceń. **Wyciągnąć przed drugim
konsumentem, nie po nim** — inaczej powtórzy się [`lekcja-21`](lekcje.md#lekcja-21) (ta
sama logika skopiowana do czterech kontrolek) na dużo większym kawałku.

Zasada przewodnia: **mechanika z CDK, API własne** — typy CDK nigdy nie wyciekają do
publicznego kontraktu. Wzorzec jest gotowy: `PCT_FIELD` jest dokładnie tym dla obudowy
i kontrolki.

- [ ] **D1 — nawigacja po liście** → wyciągnąć z `PctSelect` do `core` · _notatki:_ —
- [ ] **D2 — nakładka**: pozycjonowanie, stos zamykania (kolejność Escape przy
      zagnieżdżeniu), klik na zewnątrz, `inert` tła, blokada scrolla, dziedziczenie motywu
      i pisma — to ostatnie rozwiązane raz w [`lekcja-35`](lekcje.md#lekcja-35), do
      uogólnienia · _notatki:_ —
- [ ] **D3 — fokus**: trap, powrót, fokus początkowy, roving tabindex jako alternatywa dla
      `aria-activedescendant` · _notatki:_ —
- [ ] **D4 — live announcer**: jeden kanał `polite`, jeden `assertive`, z deduplikacją —
      nie region per komponent · _notatki:_ —
- [ ] **D5 — `*pctTemplate` / `TemplateRef`** → domyka `wym-api-szablony`; odblokowuje
      ikony · _notatki:_ —
- [ ] **D6 — ikony**: `pct-icon` na rzutowanym SVG + token `PCT_ICONS` mapujący nazwy
      semantyczne na szablony, z wbudowanymi domyślnymi → domyka `wym-api-ikony`
      · _notatki:_ —
- [ ] **D7 — bramka zakazu `@angular/animations`** → domyka `wym-api-animacje`; wiąże przy
      pierwszym komponencie z wejściem/wyjściem, czyli przy D2 · _notatki:_ —

---

## E. Faza 2 — komponenty

Kolejność wg długu architektonicznego, nie wg popularności. Każdy nowy komponent wypełnia
[`komponenty/_szablon.md`](komponenty/_szablon.md) — formularz DoD istnieje i jest
warunkiem wejścia do wydania.

- [ ] **E1 — dialog** — wymusza focus trap, blokadę scrolla, `inert`, powrót fokusu, stos
      Escape, bezpieczeństwo SSR. Najwyższy zysk architektoniczny na komponent
- [ ] **E2 — tooltip + popover** — rozróżnienie „opisuje vs nazywa", parytet
      hover/focus/touch, redukcja ruchu na realnym wejściu/wyjściu
- [ ] **E3 — menu** — roving focus, podmenu, ponowne użycie typeaheadu z D1
- [ ] **E4 — domknięcie rodziny select** — rzutowane `pct-option`, szablon opcji, grupy,
      wielokrotny wybór, filtrowanie, czyszczenie, async, wirtualizacja. Świadomie **po**
      warstwie zachowań
- [ ] **E5 — switch, textarea (autosize), slider, date picker** — date picker wymusza
      głębokie i18n, co `[pctNumber]` już zaczęło
- [ ] **E6 — table / datagrid** na headless rdzeniu (model kolumn, sortowanie, filtrowanie,
      grupowanie, zaznaczenie jako sygnały) oddzielonym od renderowania
- [ ] **E7 — reszta**: toast, tabs, accordion, drawer, pagination, progress, skeleton,
      chips, avatar, badge, breadcrumb, stepper, tree

---

## F. Faza 3 — powierzchnia zaufania

- [ ] **F1 — `apps/docs`** → domyka `wym-projekt-aplikacje` i `wym-projekt-layout`.
      Renderuje **wygenerowane** inwentarze części i tokenów (z A3 i A4), nie pisane ręcznie
- [ ] **F2 — ACR / VPAT** z istniejących bramek — dowód maszynowy macie wcześniej niż
      dokument, co jest odwrotnością normy w branży (EAA egzekwowalny od czerwca 2025,
      EN 301 549 w przetargach)
- [ ] **F3 — benchmarki jako opublikowana liczba** + regresja wydajności failująca CI
- [ ] **F4 — most DTCG ↔ Figma / Tokens Studio** — źródło prawdy już jest w DTCG,
      to niewykorzystany atut
- [ ] **F5 — powierzchnia dla agentów AI**: `llms.txt`, maszynowy katalog komponentów
      z tego samego źródła co docs, kanoniczne przykłady

---

## G. Luki bez terminu

Czekają na wyzwalacz zapisany w polu **Wiąże przy**. Nie są zapomniane — są odroczone.

- [ ] **G1 — `wym-api-liczba`**: testy własnościowe parsera (`parse(format(n)) === n` dla
      dowolnego `n` i locale). Wiąże przy pierwszym locale spoza `pl`/`en`
- [ ] **G2 — `wym-projekt-pliki`**: kontrola układu katalogu entrypointu. Wiąże przy
      pierwszym komponencie dopisanym przez kogoś innego niż autor reguły
- [ ] **G3 — `wym-token-dyrektywa`**: dyrektywa motywu zamiast ręcznego `data-theme`.
      Wiąże, gdy ustawianie atrybutu z szablonu zacznie się powtarzać
- [ ] **G4 — `wym-token-gestosc`**: w źródłach DTCG nie ma **ani jednego** tokenu gęstości.
      Wiąże po ustabilizowaniu osi wielkości — uwaga: gęstość zejdzie poniżej progu obszaru
      dotyku, więc musi przyjść razem z bramką, nie przed nią

---

## Dziennik

Wpis per sesja: co ruszyło, czym się skończyło, co jest następne. Najnowsze na górze.

### 2026-08-05 — A4: snapshot, który zamroziłby to, czego miał pilnować

Zrobione **A4**. Luki: 20 → 19, egzekwowane: 45 → 46.

Zadanie miało być półdniowe („dołożyć wersjonowany snapshot i porównanie") i przy
pierwszym czytaniu wymagania okazało się czymś innym. Plan nie pomylił się w diagnozie
mechanizmu — snapshot rzeczywiście jest tym, czego brakuje — tylko w tym, **co on
mierzy**. Wyszło to nie z rozumowania, tylko z wypisania listy nazw i spojrzenia na nią.

- **Snapshot mierzy ZMIANĘ, a wymaganie obiecuje WŁAŚCIWOŚĆ.** `wym-token-nazwy` mówi,
  że nazwę da się zgadnąć bez dokumentacji. Repozytorium miało **34 tokeny z segmentami
  w odwrotnej kolejności**: `--pct-checkbox-checked-bg` stało sześć linii pod
  `--pct-checkbox-border-hover`, `--pct-button-disabled-bg` obok `--pct-button-bg-hover`.
  Każda z tych nazw jest z osobna poprawna; nie da się ich zgadnąć dlatego, że są obok
  siebie. Snapshot dołożony przed normalizacją zapisałby ten rozjazd jako **stan
  zaakceptowany**, a każde późniejsze przemianowanie byłoby już zmianą łamiącą dla
  konsumenta ([`lekcja-49`](lekcje.md#lekcja-49)). Stąd punkt schematu **przed** punktem
  snapshotu i stąd normalizacja tym samym ruchem — 108 podmian w 16 plikach.
- **Reguła, która domyka się w kółko, potrzebuje węższego pilnowania.** „Nazwa składa się
  ze słów z zamkniętego zbioru" jest prawdziwa zawsze, bo zbiór da się rozszerzyć razem
  z nazwą. Maszyna tego nie rozstrzygnie i bramka nie udaje, że rozstrzyga: pilnuje, żeby
  **każde zadeklarowane słowo było użyte**, czyli żeby dopisanie słowa było linią
  w diffie, którą widać w review. Dokładnie ta sama konstrukcja co próg długości
  uzasadnienia w A5 — bramka nie ocenia powodu, tylko pilnuje, żeby było co oceniać.
- **Mianownik znowu, tym razem jako lista nazw.** Punkt 1 liczy ją **dwa razy**: raz
  z tekstu `dist/pct.css`, raz z obejścia drzew DTCG. Zmierzone, że obie strony łapią co
  innego — usunięcie deklaracji z `pct.css` zapala jako „w źródłach, a nie w artefakcie",
  a niezacommitowany `component.dialog.json` jako „w artefakcie, a nie w źródłach", bo
  bramka czyta indeks gita, a generator katalog.
- **Rozbrojenie punktu znowu dało stack trace zamiast zdania.** Punkt słownika czytał
  wynik parsera wprost, bo po punkcie schematu nazwa „na pewno" się parsuje. Wyłączenie
  punktu schematu w ramach kontroli tej kontroli zamieniło bramkę w `TypeError`. **To ta
  sama wada co w A7**, znaleziona tą samą kontrolą, w bramce napisanej dzień po tym, jak
  zapisałem o niej wniosek w dzienniku.

Sprawdzone przebiegiem, nie rozumowaniem: bramka zapala na pięciu sposobach zepsucia
repozytorium (przemianowanie na inną poprawną nazwę, cofnięta normalizacja
`--pct-button-disabled-bg`, `component.dialog.json` bez entrypointu, nieaktualne `dist`,
martwe słowo w słowniku) i na trzech sposobach rozbrojenia własnej kontroli — przy czym
rozbrojenie zostało zmierzone **dla każdego z pięciu punktów osobno**.

Osobno zmierzone, bo w trakcie sam to zepsułem: ponowne uruchomienie skryptu zmiany nazw
dało `--pct-radio-dot-bg-bg` (podmiana tekstu nie ma granic słowa), a `check-tokens` tego
**nie widzi z założenia** — czyta deklaracje tokenów, nie ich użycia w arkuszach. Złapał
to `check-package` punktem 3 (użycie ⊆ deklaracje). Podział jest właściwy, ale zielony
przebieg jednej bramki nie wyklucza wady po drugiej stronie.

Następne: **A3** (inwentarz `data-pct-part`) — razem z A4 odblokowuje F1.

### 2026-08-05 — A5: bramka, która przeszła, nie zmierzywszy niczego

Zrobione **A5**. Luki: 22 → 20, egzekwowane: 43 → 45.

Zadanie wyszło na zakładane półtora dnia i po raz pierwszy w tej serii **plan nie pomylił
się w diagnozie** — obie obietnice były dokładnie tam, gdzie je opisał, a dwa przewidziane
wyjątki (`border-right-color` spinnera, `left: 50%` w strefach trafienia) okazały się
jedynymi w repozytorium. Pomyliłem się za to ja, i to w miejscu, które ta seria zadań
tresuje od czterech sesji.

- **Bramka przeszła na zielono, nie zmierzywszy ani jednego komponentu.** Wypisała
  „7 arkuszy, 0 komponentów". Pathspec gita nie jest globem powłoki: bez `:(glob)`
  gwiazdka przechodzi przez `/`, więc `libs/components/*/src/**/*.ts` żąda o jeden katalog
  za dużo i zwraca **pustą listę** — nie błąd. Kontrola mianownika porównywała liczbę
  sparsowanych dekoratorów z liczbą wystąpień `@Component(`, obie wyszły zerowe, a zero
  równa się zeru. Ten sam mianownik co w A2, A6 i A7, tylko że tym razem napisałem
  kontrolę niepustości dla listy arkuszy i **nie napisałem jej dla drugiej strony
  porównania** ([`lekcja-48`](lekcje.md#lekcja-48)).
- **Kontrola porównująca dwa pomiary jest warta tyle, ile ich niezależność.** Licznik
  dekoratorów miał zauważać, że rzeczywistość odjechała od formatowania, na którym
  kotwiczy się parser — i był zapisany **tą samą kotwicą co parser**. Przesunięcie
  dekoratora o jedną spację gasi wtedy obie strony naraz. Zmierzone: `PctCheckbox` wcięty
  o spację dawał „7 komponentów" zamiast ośmiu, przy przebiegu bez naruszeń. **Ta sama
  wada siedziała w `check-zoneless.mjs`** i kosztowała tam cichy brak pomiaru `OnPush` dla
  całego komponentu; naprawione razem. Zdanie o tym, jak to działa, stało w komentarzu
  przy kodzie i było nieprawdziwe od pierwszego commita — bo kontrola odniesienia tej
  bramki podaje **dane**, więc regex nie biegnie na żadnym fixturze.
- **Arkusz może być bez zarzutu logiczny i nie odbić się w RTL.** Oś `dir` weszła do
  sandboxa i od razu pokazała, że panel selecta pisze od lewej przy triggerze piszącym od
  prawej — bo nakładka CDK jest dzieckiem `body` i nie dziedziczy niczego. `text-align:
start` w arkuszu jest poprawne; rozwiązuje się tylko w drugą stronę. To trzecia
  właściwość z [`lekcja-35`](lekcje.md#lekcja-35) po motywie i piśmie, czyli argument za
  wyciągnięciem tego przenoszenia do warstwy nakładki w **D2**, zamiast dopisywania
  czwartej pozycji do `openPanel()`.
- **Skaner też ma mianownik.** Właściwość złożona interpolacją (`padding-#{$strona}`)
  dociera do przeglądarki, a w tekście arkusza nie stoi nigdzie. Stąd punkt 2: bramka
  porównuje swój odczyt z wyjściem sassa. Ten sam ruch co „nie czytaj `include`, uruchom
  kompilator" z A7 — z tą różnicą, że tutaj wiedziałem, po co go robię.

Sprawdzone przebiegiem, nie rozumowaniem: bramka zapala na sześciu sposobach zepsucia
repozytorium (`padding-left`, `opacity: 0.45`, usunięty znacznik wyjątku, style
przeniesione do dekoratora, dekorator poza kotwicą parsera, `margin-right` schowany
w mixinie) i na trzech sposobach rozbrojenia własnej kontroli. Test panelu w RTL pada bez
poprawki (`Expected "rtl", Received "ltr"`) i przechodzi z nią. Dziesięć wzorców LTR
zmieniło się świadomie — karty biorące domyślny zestaw osi pokazują teraz czwartą.

Następne: **A4** (snapshot nazw tokenów, pół dnia) albo **A3** (inwentarz
`data-pct-part`) — razem odblokowują F1. _(A4 zrobione tego samego dnia — wpis wyżej.)_

### 2026-08-05 — A7: target, który istnieje, i target, który patrzy

Zrobione **A7**. Luki: 23 → 22, egzekwowane: 42 → 43.

Zadanie wyszło półdniowe zgodnie z planem, ale plan pomylił się w diagnozie i przez to
w zakresie. Miało być „przejście po grafie Nx — projekt bez targetu `typecheck` zapala",
z uwagą, że dziś ma go **tylko** `sandbox-e2e`. Sprawdzenie grafu na starcie pokazało coś
innego: `sandbox` też go ma, inferowany przez `@nx/vite/plugin`. To wygląda na lepszy stan
niż opisany, a jest gorszy.

- **Target inferowany jest cudzą decyzją o zasięgu.** Polecenie brzmi
  `tsc --noEmit -p tsconfig.app.json`, a ta konfiguracja **wyklucza** `**/*.spec.ts`.
  Cztery pliki `sandboxa` — dwie specyfikacje, `test-setup.ts` i `vite.config.mts` — nie
  przeszły przez kompilator ani razu, przy zielonym `nx affected -t typecheck`. W
  `project.json` nie było przy tym niczego do zobaczenia, bo target nie jest tam zapisany
  ([`lekcja-47`](lekcje.md#lekcja-47)).
- **Stąd punkt 4, którego plan nie przewidywał.** Wymóg istnienia targetu mierzy
  deklarację, a `lekcja-42` mówi wprost, że tsconfig potrafi kłamać o swoim zasięgu.
  Bramka nie czyta więc `include`, tylko uruchamia **polecenie z targetu** rozszerzone
  o `--listFilesOnly` i porównuje program kompilatora z indeksem gita. `--showConfig`
  odpadło z tego samego powodu: rozwija wzorce, ale nie widzi plików wciągniętych przez
  import.
- **Mianownik znów, tylko o piętro wyżej.** W A2 kurczyła się próbka plików w raporcie,
  w A6 — zbiór mierzonych komponentów, tutaj kurczy się **zbiór projektów**:
  `vitest.config.ts` i `vitest.workspace.ts` leżą w korzeniu i nie należą do niczego,
  więc bramka chodząca po projektach orzekłaby „nie ma takiego kodu" dokładnie dlatego,
  że nie potrafi go zobaczyć. Punkt 1 przypisuje każdy plik do najgłębszego
  projektu-przedrostka i zapala na bezpańskich.
- **Rozbrojenie punktu dało stack trace zamiast zdania.** Punkt 3 czytał
  `p.typecheck.polecenia` wprost, bo po punkcie 2 target „na pewno" istnieje. Wyłączenie
  punktu 2 w ramach kontroli tej kontroli zamieniło bramkę w `TypeError` — czyli kontrola
  odniesienia przestała umieć zbadać punkt, który miała zbadać. Zależność między punktami
  jest normalna; zapisanie jej tak, że jej naruszenie nie daje komunikatu — nie.

Sprawdzone przebiegiem, nie rozumowaniem: bramka zapala na czterech sposobach zepsucia
repozytorium (`sandbox` cofnięty do targetu inferowanego, nowy entrypoint spoza `include`,
nowy projekt bez targetu, `|| true` dopisane do polecenia) i na trzech sposobach
rozbrojenia własnej kontroli. Osobno zmierzone, że projekt roota jest `affected` przy
każdej zmianie — bez tego bramka workspace'owa nie ruszyłaby dokładnie wtedy, gdy powstaje
nowy projekt.

Następne: **A5** (bramka stylów — właściwości logiczne i zakaz `opacity` na tekście),
jedyna pozycja, której koszt retrofitu rośnie nieliniowo z liczbą komponentów.

### 2026-08-04 — A6: OnPush da się zmierzyć dopiero po linkowaniu

Zrobione **A6**. Luki: 25 → 23, egzekwowane: 40 → 42.

Zadanie wyszło półdniowe zgodnie z planem, ale nie tam, gdzie plan zakładał. Obie
obietnice — „`zone.js` usunięty" i „każdy komponent jest OnPush" — są tej samej klasy:
opierają się na tym, że nikt ich nie cofnie, a cofnięcie nie daje czerwonego testu.
Różnią się tym, gdzie w ogóle da się je zmierzyć.

- **Zoneless mierzy się na wejściu i na wyjściu.** Manifest, lock, bundle — trzy
  niezależne drogi powrotu, więc trzy punkty. Przebieg, który to rozstrzygnął:
  `npm i -D zone.js` zapala punkt 1; cofnięcie wpisu **w manifeście, ale nie w locku**
  zapala punkt 2. Ten drugi wariant jest tym, którego nie widać w code review — diff
  pokazuje usunięcie zależności, a pakiet dalej stoi w drzewie.
- **OnPush nie mierzy się nigdzie poza `dist`.** W źródle nie stoi nic (przewodnik v22+
  zabrania powtarzania domyślnych), w tekście bundla też nic — deklaracja częściowa
  zapisuje wyłącznie odstępstwa od domyślnych. Wartość powstaje dopiero przy linkowaniu,
  u konsumenta. Jedyny uczciwy odczyt to `ɵcmp.onPush` po `import '@angular/compiler'`,
  czyli po odtworzeniu tego samego kroku ([`lekcja-46`](lekcje.md#lekcja-46)). Efekt
  uboczny jest tym, o który chodziło: dzień zmiany domyślnych Angulara to dzień, w którym
  ta bramka zapala.
- **„Każdy komponent" znów potrzebowało mianownika.** Ta sama nauka co w A2, na innym
  pomiarze: gdyby zbiór badanych komponentów brał się z samego pakietu, komponent, który
  z niego wypadł, przestałby być sprawdzany bez śladu. Stąd punkt 4 (każdy `@Component`
  ze źródeł musi być w pakiecie) i osobno kontrola mianownika samego parsera — złamanie
  formatowania dekoratora daje „rozpoznałem 7 z 8", a nie cichsze o jeden pomiary.
- **Komentarz w `project.json` skłamał, zanim go zmierzyłem.** Napisałem, że jawne
  `standalone: true` daje bajt w bajt ten sam pakiet, więc źródła muszą być w `inputs`.
  Porównanie sum kontrolnych to obaliło: rusza `ɵɵngDeclareClassMetadata`, echo dekoratora
  zostawiane dla debugowania. Źródła zostają w `inputs`, ale uzasadnieniem jest „bramka je
  czyta" — opieranie klucza cache na funkcji diagnostycznej byłaby `lekcja-44`
  w trzecim przebraniu.

Sprawdzone przebiegiem, nie rozumowaniem: bramka zapala na czterech sposobach zepsucia
repozytorium (instalacja, instalacja ukryta w locku, jawny `Default` przed i po
przebudowie, złamany parser) i na trzech sposobach rozbrojenia własnej kontroli
(punkt w bramce, fixture przestający być wadliwym, wadliwe wejście wzorcowe).

Następne: **A7** (bramka targetu `typecheck`) — pół dnia, bez zależności.

### 2026-08-04 — A2: pokrycie mierzy całą bibliotekę, nie swoją próbkę

Zrobione **A2**. Luki: 26 → 25, egzekwowane: 39 → 40.

Zadanie miało być półdniowe („`coverageInclude` + próg 80%") i przy pierwszym przebiegu
kontroli okazało się czymś innym. Kontrola z planu brzmiała: „usunięcie testu zbija
pokrycie poniżej progu i bramka zapala". Usunięcie `number.spec.ts` **podniosło** pokrycie
z 96,55% na 96,94% — bo v8 zna tylko moduły, które weszły do przebiegu, więc nietestowany
`number.ts` wypadł z raportu razem ze swoim testem. Nie licznik urósł, tylko mianownik się
skurczył.

To była pierwsza wersja bramki, gotowa do odhaczenia. Przeszłaby, i to nie dlatego, że
pokrycie jest dobre.

- **`coverageInclude` domyka to w połowie.** Pliki bez testu dokłada ścieżka, która
  parsuje ŹRÓDŁO rolldownem — a ta wywraca się na `import type` / `export type`,
  wypisuje „Excluding it from coverage" w środku kilku tysięcy linii logu i kończy
  przebieg **zielono**. Sonda: zwykła funkcja, `@Directive` i `@Component` trafiają do
  raportu z zerem; kopia `number.ts` nie, bo w 18. linii ma `import type`. W bibliotece
  Angulara to zapis domyślny, nie egzotyczny ([`lekcja-45`](lekcje.md#lekcja-45)).
- **Stąd dwie nogi.** `public-api.spec.ts` wprowadza moduły każdej bramki pakietu do
  przebiegu, a `check-coverage.mjs` pilnuje, że w raporcie nie brakuje ani jednego pliku
  źródłowego. Punkty o progu pilnują liczby; punkt 3 pilnuje mianownika, z którego ta
  liczba powstała — i to on cicho się kurczy.
- **Lista plików w bramce jest niezależna od `coverageInclude`.** Gdyby ją z niego czytać,
  zawężenie konfiguracji zabierałoby plik z obu stron porównania naraz i punkt 3
  przestałby cokolwiek widzieć. Tak samo `inputs` targetu wymieniają źródła wprost:
  plik, którego v8 nie doliczy, nie zmienia raportu ani o bajt, więc sam
  `dependentTasksOutputFiles` dałby trafienie w cache ([`lekcja-44`](lekcje.md#lekcja-44)
  w innym przebraniu).

Sprawdzone przebiegiem, nie rozumowaniem: usunięcie `public-api.spec.ts` zostawia `test`
zielony na 96,55%, a `check-coverage` zapala na `libs/components/src/index.ts`; usunięcie
dwóch specyfikacji daje 64,96% i zapala oba progi. Kontrola tej kontroli — trzy sposoby
rozbrojenia (punkt 3 w bramce, fixture przestający być wadliwym, wadliwe wejście
wzorcowe), każdy zauważony.

Następne: **A6** (bramka zoneless + OnPush) albo **A7** (bramka targetu `typecheck`) —
po pół dnia, bez zależności.

### 2026-08-04 — A1: bramka pakietu dostała kontrolę odniesienia

Zrobione **A1**, a razem z nim **B5** — okazało się tym samym zadaniem, bo `ng add` to
piąty punkt tej samej bramki. Luki: 33 → 26, egzekwowane: 31 → 39 (osiem, nie siedem:
`wym-wydanie-metadane` przeszło z 🟡 na ✅, bo jego „brak kontroli — świadomie" przestał
być prawdą).

Trzy rzeczy warte zapamiętania poza samym kodem:

- **Nie wystarczy sprawdzić, że fixture zapalił — trzeba sprawdzić, który punkt go
  odrzucił.** Przy sześciu kontrolach w jednym skrypcie spreparowany pakiet potrafi
  wywalić się z powodu, którego nie badał (zepsuty manifest, literówka w ścieżce),
  i wyglądać jak dowód. Stąd identyfikator kontroli przy każdym błędzie i deklaracja
  `kontrola` w `fixture.json`. Przebieg to potwierdził: gdy pakiet wzorcowy stał się
  wadliwy, **wszystkie siedem** przypadków zaczęło zapalać na cudzych punktach.
- **Pakiet wzorcowy musi przechodzić** — inaczej każdy przypadek zapala z jego powodu,
  a nie ze swojego, i cała kontrola staje się tym, przed czym stoi.
- **Udawany `package.json` w repozytorium jest dla Nx projektem**, a `.nxignore` naprawia
  to kosztem unieważniania cache — czyli zamienia widoczny bałagan na cichą wadę
  ([`lekcja-44`](lekcje.md#lekcja-44)).

Sprawdzone przebiegiem, nie rozumowaniem: bramka zapala na czterech niezależnych
sposobach zepsucia (rozbrojony punkt 3, fixture przestający być wadliwym, fixture
zapalający na cudzym punkcie, wadliwy pakiet wzorcowy).

Następne: **A2** (pokrycie z egzekwowanym progiem — najstarszy dług).

### 2026-08-03 — plan powstał

Przegląd stanu: 81 wymagań, 31 egzekwowanych, 17 świadomie częściowych, 33 luki.
Zweryfikowane w kodzie przy okazji:

- formularz DoD komponentu (`komponenty/_szablon.md`) **już istnieje** — pozycja
  z roadmapy review jest zrobiona,
- znaleziska review §5.1–5.5 są nadal otwarte (→ C1–C5),
- `dist/libs/components/README.md` to stub z generatora Nx (→ B3),
- repozytorium nie ma zdalnego (`git remote -v` puste) (→ B2),
- `libs/components/testing/` nie ma `ng-package.json` — to katalog wewnętrzny, nie
  entrypoint; przy okazji G2 warto to potwierdzić świadomie.

Następne: A1.
