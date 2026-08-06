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

Migawka z **2026-08-06**, `node tools/check-docs.mjs`:

| miara                                 | wartość |
| ------------------------------------- | ------: |
| wymagań                               |      81 |
| ✅ egzekwowane                        |      54 |
| 🟡 częściowo (świadomie bez kontroli) |      16 |
| ⛔ luka                               |      11 |

Wszystkie 11 luk mają niżej swojego właściciela (B, D, F, G). Jeśli po dopisaniu
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

**Faza A jest zamknięta.** Kolejność zaczyna się od B (gotowość do wydania) — B1 i B2 to
minuty, a bez nich nie da się wydać niczego. Równolegle: F1 jest odblokowane (A3 i A4
dały mu oba inwentarze do wyrenderowania), a C jest wypełniaczem.

---

## A. Faza 0 — bramki „natychmiast"

**Zamknięta 2026-08-06.** Trzynaście zadań, dwadzieścia domkniętych luk, trzynaście bramek
z kontrolą odniesienia. Nic tu już nie czeka.

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

- [x] **A3 — inwentarz `data-pct-part` + bramka** _(2026-08-05)_
  - domknęło: `wym-api-czesci`
  - zrobione: `tools/check-parts.mjs` (target `check-parts` w projekcie roota,
    `dependsOn: components:build`, w CI) — pięć punktów plus generowany
    `libs/components/czesci.snapshot.md` (41 części, 10 klas, 5 entrypointów). Reguły są
    trzy (punkt 3: nazwa części nie może być wiązana wyrażeniem; punkt 4: rubryki
    **Części** w `docs/komponenty/` zgadzają się z tym, co wystawia entrypoint; punkt 5:
    snapshot zgadza się z bieżącym inwentarzem), a **dwa pozostałe pilnują mianownika**
  - plan mówił „skan szablonów + snapshot" i skan szablonów sam z siebie jest ślepy na
    to, co ta biblioteka naprawdę robi: **cztery części obudowy nie stoją w żadnym
    szablonie**, tylko w blokach `host` dyrektyw (`field-prefix-item`,
    `field-suffix-item`, `field-label-aux-item`, `field-message-aux-item`). Stąd punkt 2
    — lista powstaje **dwa razy**: raz ze źródeł (szablony + dekoratory z indeksu gita),
    raz ze zbudowanego pakietu przez JIT (`ɵcmp.consts`, `ɵdir.hostAttrs`), czyli z wyniku
    prawdziwego parsera Angulara. Ten sam ruch co w A6 i A4
  - punkt 4 jest tym, którego plan nie przewidywał, i to on **zapalił od razu**: karta
    `field.md` wymieniała 11 części z piętnastu — dokładnie ten sam błąd, który ta sama
    karta miała już raz (7 z jedenastu, do 2026-07-27), tylko o cztery pozycje dalej.
    Inwentarz bez powierzchni, na której ktoś go czyta, byłby plikiem dla maszyny
  - punkt 3 pilnuje rzeczy, której snapshot z definicji nie potrafi zobaczyć: część
    o nazwie złożonej w runtime nie daje się spisać, więc inwentarz byłby zielony
    dokładnie dlatego, że nie ma czego zauważyć. Mierzone po obu stronach — zmierzone,
    nie założone: atrybut wiązany **nie trafia do `consts` w ogóle**, tylko do treści
    skompilowanej funkcji szablonu, a interpolacja (`data-pct-part="{{ x() }}"`) wygląda
    jak literał i literałem nie jest
  - świadomie **nie** normalizowane: `options` w `PctRadioGroup` stoi obok `group-label`,
    `group-hint` i `group-error`, czyli jako jedyna część kontenera bez przedrostka.
    Z niczym dziś nie koliduje, a `wym-api-czesci` nie obiecuje zgadywalności (to
    obietnica tokenów, nie części) — więc snapshot ją zamraża i przemianowanie staje się
    od dziś widoczną zmianą API. Przeniesione do **C7**
  - kontrola: `tools/check-parts.fixtures/` — dwadzieścia jeden wejść, każde odrzucane na
    swoim punkcie; plus sześć przebiegów na prawdziwym repozytorium (przemianowanie
    części przy nieaktualnym `dist` → punkt 2, po przebudowie → punkt 4, po uzgodnieniu
    karty → punkt 5; `[attr.data-pct-part]` w szablonie → punkt 3 z obu odczytów naraz;
    część usunięta z karty → punkt 4; dyrektywa z częścią bez eksportu → punkt 2)
  - kontrola tej kontroli: rozbrojone po kolei wszystkie pięć punktów, każdy zauważony
    przez wszystkie swoje przypadki; przypadek przestający być wadliwym → „PRZESZŁO";
    wadliwe wejście wzorcowe → bramka zapala na nim osobno, a przypadki poniżej idą na
    cudze punkty
  - koszt: ~1 dzień (zgodnie z planem) · _notatki:_ punkt 5 **zapalił poprawnie
    i wyjaśnił to fałszywie** — filtr wierszy snapshotu nie przechodził przez ukośnik
    w `./select`, więc komunikat brzmiał „lista części jest ta sama". Kontrola odniesienia
    nie miała jak tego zobaczyć, bo porównuje identyfikator punktu, a nie zdanie
    ([`lekcja-50`](lekcje.md#lekcja-50)). Rozbrojenie gałęzi „brak snapshotu" dało przy
    okazji `TypeError` — **ta sama wada co w A4 i A7, trzeci raz**

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

- [x] **A8 — tree-shaking + budżet rozmiaru entrypointu** _(2026-08-05)_
  - domknęło: `wym-projekt-tree-shaking`
  - zrobione: `tools/check-bundle.mjs` (target `check-bundle` w `components`,
    `dependsOn: build`, w CI) — dziesięć punktów plus generowany
    `libs/components/rozmiar.snapshot.md` (7 entrypointów, 114 766 B razem). Sedno to
    dwa punkty: 5 (jakie entrypointy wciąga import jednego z nich) i 7 (jakie dochodzą
    przy tym zależności zewnętrzne — `@angular/cdk/overlay` ma prawo być wyłącznie
    w `./select`). Do tego budżet z tolerancją **dwustronną** i punkt 4 pilnujący, że
    entrypoint główny nie wnosi ani jednego komponentu. Pozostałe pięć to mianownik
  - plan mówił „build aplikacji importującej wyłącznie `@pacit/components/button`
    i asercja, że w bundlu nie ma `PctField`" i pomylił się nie w zakresie, tylko
    w tym, **czego taka asercja dowodzi**: sonda, z której bundler wyrzucił bibliotekę
    w całości, też nie zawiera `PctField`. Stąd punkt 4 (sonda musi wnieść swój
    entrypoint), punkt 9 (sonda dwóch entrypointów musi być zauważalnie większa niż
    każda z pojedynczych — to jest kontrola z planu, wpięta jako punkt bramki)
    i punkt 6 (drugi odczyt izolacji po tekście bundla, porównywany z metafile
    **w obie strony**)
  - sondy sięgają po pakiet przez `node_modules` i mapę `exports`, a **nie** przez
    `alias` bundlera ani `paths` tsconfiga: jedno i drugie omija tę część manifestu,
    która u konsumenta decyduje, co jest w ogóle osiągalne — sonda z aliasem byłaby
    zielona także wtedy, gdyby `exports` nie istniało
  - punkt 10 to ten sam ruch co „nie czytaj `include`, uruchom kompilator" z A7: siedem
    szybkich sond idzie własnym esbuildem, ale to jest **moje** ustawienie bundlera,
    więc trzy z nich są powtórzone prawdziwym `@angular/build:application`. Trzecia
    niesie komplet entrypointów i jest mianownikiem dwóch pierwszych — dowodzi, że tamten
    odczyt w ogóle potrafi znaleźć to, czego w nich nie znajduje. Zmierzone, nie
    założone: markery **muszą** być selektorami, bo napis z FESM-a przeżywa minifikację,
    a nie przeżywa linkowania (`button[pctButton]` staje się `[["button","pctButton",""]]`)
  - **punkt 2 badał co innego, niż napisałem w jego uzasadnieniu**: usunięcie
    `sideEffects` ze źródłowego manifestu nie zapala, bo ng-packagr dopisuje `false` sam
    — sprawdzone z `--skip-nx-cache`, bo pierwszym podejrzanym był cache i to był fałszywy
    trop ([`lekcja-51`](lekcje.md#lekcja-51)). Punkt zapala na jawnym `true` i na dniu,
    w którym ng-packagr przestanie dopisywać domyślną
  - kontrola: `tools/check-bundle.fixtures/` — dwadzieścia dwa wejścia, każde odrzucane
    na swoim punkcie, na **udawanej** bibliotece (`alfa`, `beta`, `rdzen`), żeby nie
    wymagały utrzymania przy każdym nowym komponencie; plus siedem przebiegów na
    prawdziwym repozytorium (`button` importujący `PctField` → punkt 5; `button`
    sięgający po `OverlayModule` → punkt 7; primary reeksportujący `PctButton` →
    punkt 4; jawne `sideEffects: true` → punkt 2; nowy entrypoint bez przebudowy →
    punkt 1; `button` większy o 2 kB → punkt 8; wiersz usunięty ze snapshotu → punkt 3)
  - kontrola tej kontroli: rozbrojone po kolei **wszystkie dziesięć** punktów, każdy
    zauważony przez wszystkie swoje przypadki; przypadek przestający być wadliwym →
    „PRZESZŁO"; wadliwe wejście wzorcowe → bramka zapala na nim osobno, a dziesięć
    przypadków idzie na cudze punkty
  - koszt: ~1 dzień (zgodnie z planem) · _notatki:_ rozbrojenie punktu 4 dało najpierw
    `TypeError` zamiast komunikatu — **ta sama wada co w A7, A4 i A3, czwarty raz,
    i pierwszy raz WEWNĄTRZ jednego punktu**, nie między punktami. Bramka biegnie ~22 s,
    z czego trzy czwarte to trzy prawdziwe buildy Angulara

- [x] **A9 — test konsumenta na Verdaccio** _(2026-08-06)_
  - domknęło: `wym-jakosc-konsument`, a przy okazji dołożyło drugą bramkę do
    `wym-wydanie-ng-add` — bo to jego punkt zapalił jako pierwszy
  - zrobione: `tools/check-consumer.mjs` (target `check-consumer` w `components`,
    `dependsOn: build + schematics`, w CI) — siedem punktów, 28 reguł, ~26 s. Droga
    konsumenta w całości: `npm pack` → publikacja do Verdaccio → `npm install` **po
    nazwie** → `ng add` → build z SSR → serwer → jeden przebieg w przeglądarce
  - **plan mówił „`npm pack` → instalacja → build → e2e" i to było dobre w zakresie,
    ale za wąskie w tym, PO CO.** Bramka znalazła wadę już przy pierwszym uruchomieniu
    i nie tam, gdzie plan patrzył: `ng add @pacit/components`, pierwsza komenda konsumenta,
    wywracała się na `exports is not defined in ES module scope`. Manifest pakietu niesie
    `"type": "module"` (dopisuje ng-packagr), a schematics są CommonJS-em — więc Node
    czytał je jako ESM. `check-package` widział wtedy **komplet**: kolekcja wskazuje
    fabrykę, plik fabryki jest w pakiecie. Był i nie dawał się wczytać
    ([`lekcja-55`](lekcje.md#lekcja-55)). Naprawione tak, jak robi to `@angular/cdk`:
    własna granica modułów w `schematics/package.json`
  - punkt 1 bada **archiwum**, nie katalog, i to jest jedyna rzecz w tej bramce, której
    `check-package` nie może zobaczyć z konstrukcji: między `dist` a `node_modules`
    konsumenta stoją `npm pack` (pole `files`, `.npmignore`) i rejestr. Punkty 2 i 3
    pilnują, że mierzymy **swój** pakiet: konfiguracja Verdaccio proxuje npmjs, więc
    nieudana publikacja nie kończy się błędem instalacji, tylko zaciągnięciem cudzego
    pakietu o tej nazwie — dziś go tam nie ma, od pierwszego wydania (B2) będzie
  - punkt 6 nie zadowala się kodem 200: wymaga `ng-server-context="ssr"`. Zmierzone —
    aplikacja bez routera jest **prerenderowana**, serwer oddaje wtedy plik statyczny,
    a bundle serwera nie renderuje ani razu. Stąd trasa z `RenderMode.Server`
  - punkt 7 mierzy tło przycisku **dwa razy**: raz jako `background-color` elementu, raz
    jako wartość `--pct-button-bg` policzoną przez tę samą przeglądarkę na sondzie
    w jego scope. Pusty token to skórka, która nie doszła; tło początkowe to `var()`,
    który się nie rozwiązał; różnica między nimi to komponent malujący się czymś innym —
    trzy różne awarie, trzy różne reguły
  - świadomie **bez instalowania `peerDependencies` z rejestru**: `@angular/*` przychodzi
    z `node_modules` repozytorium przez wyszukiwanie w górę drzewa, jak w sondzie buildera
    z A8. Cena zapisana wprost — rozjazd zakresu wersji peerów przejdzie tę bramkę
    i pilnuje go dopiero **B7**
  - kontrola: `tools/check-consumer.fixtures/` — 28 wejść, każde odrzucane na swojej
    **regule**; plus siedem przebiegów na prawdziwym repozytorium (pusta skórka
    w pakiecie → build konsumenta bez ani jednej deklaracji tokenu; skórka usunięta
    z pakietu → punkt 1; `files` odcinające schematics → punkt 1; zdjęta granica
    CommonJS → punkt 4; `exports` na nieistniejący plik → punkt 1; `document` przy
    konstrukcji komponentu → punkt 6; przycisk malowany kolorem z palca → punkt 7)
  - kontrola tej kontroli: rozbrojone po kolei **wszystkie 28 reguł** — 24 dają
    „PRZESZŁO", cztery przestawiają przypadek na regułę sąsiednią i widać to **tylko
    dzięki polu `regula`** (trzecie potwierdzenie wniosku z A12); przypadek przestający
    być wadliwym → „PRZESZŁO"; wadliwe wejście wzorcowe → bramka zapala na nim osobno,
    a dziewięć przypadków idzie na cudze reguły
  - koszt: ~1 dzień (plan zakładał 1–2) · _notatki:_ rozbrojenie reguły `brak-wpisu` dało
    `TypeError` zamiast komunikatu — **ta sama wada co w A3, A4, A7, A8, A11 i A12, siódmy
    raz**, tym razem w bramce, która ma o niej akapit we własnym nagłówku. Osobno
    zmierzone, nie założone: `document` w **zasięgu modułu** biblioteki nie daje 500,
    tylko wywraca **build** — builder ładuje bundle serwera, żeby wyprowadzić trasy

- [x] **A10 — macierz przeglądarek** _(2026-08-06)_
  - domknęło: `wym-jakosc-przegladarki`
  - zrobione: trzy projekty w `apps/sandbox-e2e/playwright.config.mts` (chromium,
    firefox, webkit) — **458 testów w przebiegu, 5,5 min** — plus
    `tools/check-browsers.mjs` (target `check-browsers` w projekcie roota, w CI) —
    sześć punktów, 26 reguł, ~7 s. Do tego rejestr wyłączeń
    `apps/sandbox-e2e/przegladarki.policy.json` i trzy silniki w kroku instalacji CI,
    w **obu** gałęziach (pudło i trafienie w cache)
  - **plan mówił „dopisać webkit i firefox" i to było dobre w zakresie, ale całkiem
    ślepe na to, że ta obietnica nie ma żadnego objawu.** Playwright kończy się zerem
    po trzech projektach dokładnie tak samo jak po jednym — i tak samo po **zerze**
    zebranych testów. Cofa się to czterema ruchami, z których każdy wygląda w review
    jak sprzątanie: projekt wykreślony z `projects`, plik dopisany do `testIgnore`
    „bo miga", `--project=chromium` w poleceniu targetu, silnik zdjęty z kroku
    instalacji. Stąd bramka: pyta `playwright test --list --reporter=json`, co silniki
    NAPRAWDĘ zbierają, i porównuje to z polityką — ten sam ruch co „nie czytaj
    `include`, uruchom kompilator" z A7
  - **firefox przeszedł komplet 146 testów funkcjonalnych za pierwszym razem.**
    Webkit — 144 ze 146, i te dwa są całym znaleziskiem tego zadania: melduje
    `matchMedia('(forced-colors: active)').matches === true` i **nie podmienia kolorów
    autora**. Sonda `<div style="background: rgb(1, 2, 3)">` wychodzi z niego
    niezmieniona, a `forced-color-adjust` nie jest w nim nawet znaną właściwością.
    Cztery z sześciu testów `forced-colors.spec.ts` przechodzą tam, mierząc kolory
    z tokenów ([`lekcja-56`](lekcje.md#lekcja-56))
  - przy okazji, i tylko dlatego, że webkit nie zamalowuje wyniku: `:host([disabled])`
    w bloku forced-colors ma (0,2,0), a reguła bazowa
    `:host([disabled]:not([data-pct-loading]))` — (0,3,0). Media query nie dokłada
    specyfiki, więc `color: GrayText` przegrywa z tokenem. W chromium i firefoksie
    tego nie widać **nigdy**, bo przeglądarka i tak zamaluje. Deklaracja jest dziś
    martwa bez objawu — przeniesione do **C8**
  - wyłączenia są dwa i **różnego rodzaju**: `visual.spec.ts` poza chromium to `zapis`
    (26 z 26 wzorców różni się na obu pozostałych silnikach — zmierzone),
    a `forced-colors.spec.ts` poza webkitem to `pomiar`. Punkt 6 powtarza sondę przy
    każdym przebiegu, więc dzień, w którym webkit to zaimplementuje, jest dniem,
    w którym bramka **każe wyłączenie zdjąć**. Mianownikiem tego punktu jest reguła
    `fakt-bez-odniesienia`: fakt niezachodzący u nikogo nie jest wadą silników, tylko
    zepsutą sondą — i bez niej uzasadniałby każde wyłączenie w nieskończoność
  - kontrola: `tools/check-browsers.fixtures/` — dwadzieścia pięć wejść, każde
    odrzucane na swojej **regule**; plus dziewięć przebiegów na prawdziwym repozytorium
    (webkit wykreślony z `projects` → `silnik-nieobecny`; `select.spec.ts` w `testIgnore`
    firefoksa → `luka-bez-wpisu`; wyłączenie poszerzone na firefoksa → `fakt-nieaktualny`;
    firefox zdjęty z instalacji w CI → `ci-bez-silnika`; `--project=chromium` w targecie
    → `e2e-zawezony`; wyłączenie usunięte z polityki → `luka-bez-wpisu`; `testIgnore`
    zdjęty przy zostawionym wpisie → `wpis-martwy`; nowy spec wyłączony wszystkim naraz
    → `plik-poza-pomiarem`; niedomknięty nawias w konfiguracji → `pomiar-nieczytelny`)
  - kontrola tej kontroli: rozbrojone po kolei **wszystkie 26 reguł** — siedemnaście daje
    „PRZESZŁO", osiem przestawia przypadek na regułę sąsiednią i widać to **tylko dzięki
    polu `regula`** (czwarte potwierdzenie wniosku z A12). Dwudziesta szósta
    (`pomiar-nieczytelny`) rozbrojona **nie daje żadnego objawu** i to jest o niej cała
    prawda: należy do warstwy odczytu, więc w zdrowym repozytorium ta ścieżka nie jest
    wykonywana. Dowodzi jej wyłącznie przebieg z zepsutą konfiguracją
  - koszt: ~1 dzień (plan zakładał 0,5 + czas CI) · _notatki:_ bramka zapaliła na sobie
    przy pierwszym uruchomieniu — punkt 5 policzył **cztery** kroki instalacji tam, gdzie
    są dwa, bo ten workflow tłumaczy każdy krok akapitem prozy i zdanie o
    `playwright install` wygląda dla wzorca jak wywołanie `playwright install`. Osobno:
    webkit nie startuje tu bez czterech bibliotek systemowych (`libevent`, `libavif`,
    `libmanette`, `libwoff1` plus dwie przechodnie), których `playwright install` nie
    dociąga bez roota — w CI robi to `--with-deps`, lokalnie trzeba
    `sudo npx playwright install-deps webkit`

- [x] **A11 — bramka tekstów** _(2026-08-06)_
  - domknęło: `wym-api-teksty`, a razem z tym **C5** — reaktywność `PCT_TEXTS` jest od
    dziś decyzją ([0014](decyzje/0014-teksty-jako-sygnal.md)), nie przeoczeniem
  - zrobione: `tools/check-texts.mjs` (target `check-texts` w `components`,
    `dependsOn: build`, w CI) — sześć punktów, 30 reguł. Reguły są w trzech punktach
    (3: napis w węźle tekstowym, w atrybucie mówiącym albo w literale wyrażenia;
    4: proza w wartości domyślnej sygnału i odczyt `PCT_TEXTS` przy konstrukcji;
    6: ostrzeżenia deweloperskie poza kanałem i pod `isDevMode()`), a **trzy pozostałe
    pilnują mianownika**: parser widzi każdy dekorator i każdy szablon, klasy i atrybuty
    statyczne zgadzają się ze zbudowanym pakietem, a kanał `PctTexts` jest jednym zbiorem
    (pole ⟷ wartość domyślna ⟷ odczyt)
  - plan mówił „grep po literałach w szablonach" i grep był złym narzędziem **i za wąskim
    miejscem**. Szablon czyta `parseTemplate` z `@angular/compiler` przez
    `TmplAstRecursiveVisitor`, czyli parser i obejście drzewa utrzymywane przez Angulara —
    ten sam ruch co „nie czytaj `include`, uruchom kompilator" (A7). Regex byłby ślepy
    dokładnie na to, na co był ślepy w A3, tylko trudniej to zauważyć: napis nie ma
    atrybutu, po którym dałoby się go policzyć
  - **druga połowa kanału jest w TypeScripcie i to jej plan nie widział.**
    `input<string>(this.texts.selectPlaceholder)` wygląda na odczyt reaktywny — wejście
    JEST sygnałem — a wartość domyślna powstaje raz, przy konstrukcji. Aplikacja
    przełączająca język bez przeładowania zostawała z napisem sprzed zmiany, od commita
    wprowadzającego `PCT_TEXTS` (2026-07-27), przy zielonym CI: jedyny test tego kanału
    renderował komponent **raz**, a przy jednym renderowaniu obie wersje dają to samo
    ([`lekcja-54`](lekcje.md#lekcja-54))
  - odczyt tekstu jest **jeden**, nie dwa — i to jest zmierzona granica, nie
    niedopatrzenie: po zlinkowaniu literał węzła tekstowego trafia do treści zagnieżdżonej
    funkcji szablonu, do której `ɵcmp.template` nie prowadzi. Dlatego mianownik tego
    odczytu pilnują cztery osobne reguły (brak błędów parsera, brak nieznanego rodzaju
    węzła, brak szablonu w dekoratorze, niezerowa liczba odwiedzonych węzłów), a odczyt
    z pakietu przez `ɵcmp.consts`/`ɵdir.hostAttrs` odpowiada za atrybuty — tam, gdzie
    rozwinięcie obiektu w bloku `host` czyni skaner źródeł ślepym (`...fitHost` w
    `field/src/affix.ts`, biblioteka naprawdę tak robi)
  - ICU jest **zakazane**, a nie czytane po połowie: warianty tekstu siedzą w drzewie
    i18n, do którego to obejście nie sięga (zmierzone — `visitText` nie dostaje z ICU ani
    jednego węzła), a `PCT_TEXTS` jest mapą napisów, nie gramatyką. Ten sam ruch co zakaz
    wiązania nazwy części w A3: rzecz, której pomiar nie potrafi zobaczyć, ma być głośna
  - świadomie **bez mechanizmu wyjątków** (inaczej niż `pct-wyjatek` w A5): repozytorium
    nie ma dziś ani jednego kandydata, a furtka bez użytkownika jest martwym artefaktem —
    ten sam powód, dla którego A12 usunęło `--pct-on-danger`. Znak bez litery (`*`, `×`)
    nie jest tekstem i nie potrzebuje wyjątku, bo nie ma w nim czego przetłumaczyć
  - kontrola: `tools/check-texts.fixtures/` — dwadzieścia dziewięć wejść, każde odrzucane
    na swojej **regule**, nie tylko punkcie; plus dziewięć przebiegów na prawdziwym
    repozytorium (literał zamiast `texts()` → punkt 3; `aria-label` z napisem przy
    nieaktualnym `dist` → punkt 2, po przebudowie → punkt 3; `input(this.texts()…)` →
    punkt 4; `console.warn` bez `isDevMode()` → punkt 6; nowe pole bez wartości domyślnej
    i pole nieczytane → punkt 5; literał w interpolacji → punkt 3; statyczny `aria-label`
    w bloku `host` → punkt 2)
  - kontrola tej kontroli: rozbrojone po kolei **wszystkie 29 reguł mających przypadek** —
    dwadzieścia daje „PRZESZŁO", dziewięć przestawia przypadek na sąsiednią regułę i to
    widać **tylko dzięki polu `regula`** (wniosek z A12, potwierdzony drugi raz).
    Trzydziesta (`nieznany-wezel`) świadomie zostaje bez przypadku: wymagałaby rodzaju
    węzła, którego `parseTemplate` dziś nie produkuje — składnia selectorless jest
    domyślnie wyłączona (zmierzone). Reguła istnieje po to, żeby dzień jej włączenia był
    dniem, w którym bramka o tym mówi
  - koszt: ~1,5 dnia (plan zakładał 0,5; różnicę zjadła decyzja 0014 i druga połowa
    kanału) · _notatki:_ rozbrojenie reguły `szablon-bez-wlasciciela` dało `TypeError`
    zamiast komunikatu — **ta sama wada co w A3, A4, A7, A8 i A12, szósty raz**: punkt 2
    czytał właściciela szablonu, ufając punktowi 1. Osobno, wpadka nie w bramce, tylko
    w narzędziu do jej badania: skrypt przebiegów na repozytorium odtwarzał stan przez
    `git checkout -- libs/components` i **skasował niezacommitowaną decyzję 0014**.
    Kontrola odniesienia na żywym repozytorium musi odtwarzać z kopii plików, dopóki
    praca nie jest w indeksie

- [x] **A12 — kompletność par tekst/tło + poziomy tokenów** _(2026-08-05)_
  - domknęło: `wym-token-pary-tekstu`, `wym-token-poziomy` — **2 luki**
  - zrobione: punkty **6 i 7** w `tools/check-tokens.mjs` (ten sam target, ta sama
    kontrola odniesienia — bo obie obietnice stoją na tym samym mianowniku co nazwy:
    liście tokenów). Punkt 6 to graf referencji „tylko w dół" z polityką
    `libs/tokens/src/poziomy.policy.json`; punkt 7 to „każdy malowany kolor ma parę
    w policy kontrastu" plus reguła `on-*`. Do tego `regula` w `fixture.json` —
    odpowiedź na [`lekcja-50`](lekcje.md#lekcja-50), bo punkt to nie jedno zdanie
  - plan mówił „porównanie listy powierzchni z listą par" i **pomylił się w mianowniku**:
    lista powierzchni wzięta z nazw tokenów (`*-bg`) nie widzi tego, co ta biblioteka
    naprawdę robi. Wariant outline przycisku maluje tło `var(--pct-surface-100)` pod
    etykietą `var(--pct-primary)` — dwoma tokenami **semantycznymi**. Stąd punkt 7 czyta
    wyjście **sassa** dla arkuszy, a nie listę nazw (ten sam ruch co A5 i A7)
  - **policy milczała o 27 kolorach z 74**, a po ich dopisaniu **build padł na trzech**:
    w motywie ciemnym etykieta przycisku na hover dawała 3,45:1, na active 2,66:1,
    a etykieta outline na hover 3,98:1 — poniżej AA, od miesięcy, przy zielonym CI.
    Przyczyna: rampa ciemna była kopią jasnej, a `on-primary` jest w niej **ciemny**,
    więc przyciemnienie tła zbija kontrast zamiast go podnosić. Poprawione: w ciemnym
    `primary` idzie w górę (`blue-400` → `blue-300` → `blue-200`)
    ([`lekcja-52`](lekcje.md#lekcja-52))
  - plan mówił też „zakaz odwołań komponentowy → prymitywny" i **w brzmieniu dosłownym
    reguła była złamana 35 razy**: nad osiami wymiaru nie ma warstwy semantycznej. Kolor
    jest za to czysty w 100% i tam wyjątku nie ma. Wyjątek dla wymiaru stoi w polityce,
    jest pilnowany z dwóch stron (oś martwa zapala, oś niosąca kolor zapala **na samej
    deklaracji**) — czyli nie da się nim rozbroić reguły, dla której punkt powstał
  - przy okazji: `--pct-on-danger` **usunięty** — para zadeklarowana, nieużywana przez
    żaden token ani arkusz, czyli pokrycie, którego nie było (`danger` maluje tu wyłącznie
    tekst i obramowanie). Wróci z pierwszym komponentem malującym tło błędem
  - **znalezione przy okazji, w innej bramce**: zmiana palety ciemnej nie ruszyła ani
    jednego wzorca wizualnego. `toHaveScreenshot` ma **dwa** progi, a zmierzony był jeden:
    domyślny `threshold: 0.2` jest dwunastokrotnie większy niż krok rampy (0,0163), więc
    przemalowanie całego przycisku dawało zero różniących się pikseli. Ustawione na 0.005
    z pomiaru, zrzuty ciemne odtworzone ([`lekcja-53`](lekcje.md#lekcja-53))
  - kontrola: `tools/check-tokens.fixtures/` — piętnaście nowych wejść (osiem na punkt 6,
    siedem na punkt 7), każde odrzucane na swoim punkcie **i swojej regule**; plus osiem
    przebiegów na prawdziwym repozytorium (kolor na prymitywie, kolor z palca, tło
    pożyczone od innego komponentu, oś usunięta z polityki, oś martwa dopisana, nowe
    malowanie bez pary, para usunięta z policy, martwe `on-danger` przed i po przyjęciu
    snapshotu)
  - kontrola tej kontroli: rozbrojone po kolei **czternaście z piętnastu reguł** obu
    punktów — dziewięć daje „PRZESZŁO", pięć przestawia przypadek na sąsiednią regułę
    tego samego punktu i to widać **tylko dzięki polu `regula`**; przypadek przestający
    być wadliwym → „PRZESZŁO"; wadliwe wejście wzorcowe → bramka zapala na nim osobno,
    a siedem przypadków idzie na cudze punkty. Piętnasta reguła (`referencja-donikad`)
    świadomie zostaje bez przypadku: fixture składa się przez prawdziwy `build.mjs`,
    a ten rzuca na nieznanej referencji wcześniej — reguła istnieje po to, żeby
    rozbrojenie sąsiedniej dało komunikat, a nie `TypeError`
  - koszt: ~1,5 dnia (plan zakładał 0,5) · _notatki:_ punkt 7 **przeszedł na zielono,
    nie zmierzywszy ani jednego koloru** — wypisał „0 kolorów malowanych w 7 arkuszach",
    bo wzorzec deklaracji wymagał wiodącego myślnika. To jest [`lekcja-48`](lekcje.md#lekcja-48)
    w punkcie pisanym po to, żeby jej nie powtórzyć, i ta sama pomyłka co w A5: kontrola
    niepustości stała po stronie **wejścia**, a pusty był **pomiar**. Osobno: rozbrojenie
    reguły `token-spoza-skorki` dało `TypeError` — **ta sama wada co w A3, A4, A7 i A8,
    piąty raz**

- [x] **A13 — testowanie mutacyjne rdzenia** _(2026-08-06)_
  - domknęło: `wym-jakosc-jednostkowe` — ostatnią lukę fazy A
  - zrobione: target `mutacja` (Stryker 9.6 na `core`, `field/number.ts`,
    `select/select.ts`, `thresholds.break` = 80, ~6 min) plus
    `tools/check-mutation.mjs` (target `check-mutation`, `dependsOn: mutacja`, w CI) —
    siedem punktów, 37 reguł — oraz `libs/components/mutacja.policy.json`
    i generowany `mutacja.snapshot.md`
  - **pierwszy pomiar był całym uzasadnieniem tego zadania: przy 96,62% pokrycia linii
    wynik mutacyjny wynosił 63,54%.** Co trzeci mutant przechodził CI na zielono, 44
    mutanty nie miały ani jednego pokrywającego testu, a jeden test naciskał wyłącznie
    PageUp przy nazwie `PageUp/PageDown skacze dziesięciokrotnie`. Domknięcie do 81,77%
    kosztowało **38 nowych testów** i nową specyfikację `core/src/core.spec.ts`:
    `pctFieldMessages` i `pctDescribedBy` są publicznym API entrypointu `./core`
    i nie miały ani jednego testu pod własnym nazwiskiem, a pokrycie linii pokazywało
    je jako 100% ([`lekcja-57`](lekcje.md#lekcja-57))
  - plan mówił „próg przeżywalności wpięty w CI, nie raport do oglądania" i trafił
    w sedno, tylko **za wąsko**: sam próg jest w Strykerze wyłączony domyślnie
    (`thresholds.break: null`), a po ustawieniu podnosi się go pięcioma ruchami, z których
    żaden nie dokłada testu — plik wykreślony z `mutate`, poszerzone `ignorers` albo
    `// Stryker disable` w źródle, wykluczona rodzina mutatorów, `ignoreStatic: true`
    i skrócony `timeoutMS` (mutant zabity ZEGAREM liczy się jak zabity asercją).
    Stąd bramka czyta konfigurację **skuteczną z raportu**, nie z pliku
    ([`lekcja-58`](lekcje.md#lekcja-58))
  - punkt 3 jest tym, którego plan nie przewidywał, i wynika z konstrukcji: Stryker
    potrzebuje **pliku** konfiguracji Vitesta, a target `test` idzie przez builder
    `@angular/build`, który składa ją w pamięci. Są więc dwie drogi do tych samych
    specyfikacji i potrafią się rozjechać — bramka porównuje `testFiles` z raportu
    z listą `*.spec.ts` z indeksu gita. Rozjazd zmierzony od razu: pod konfiguracją
    mutacyjną dwa testy `field.spec.ts` padały, bo wtyczka Analoga domyślnie kompiluje
    w testach **JIT-em**, a wtedy `styleUrl` nie dociera do komponentu w ogóle
  - **`ignorers: ["angular"]` nie jest wygodą, tylko warunkiem uruchomienia.** Bez niego
    dry run wywraca się na `Component 'PctSelect' is not resolved`: obiekt konfiguracyjny
    `input()`/`model()`/`output()` jest czytany statycznie przez ngtsc, a zmutowany
    przestaje być literałem — cały plik wraca wtedy do JIT-a. To zwęża mianownik o 16
    mutantów, więc stoi w polityce razem z powodem, a punkt 5 pilnuje, że żaden inny
    powód zignorowania się nie pojawi
  - podłoga jest dwuwarstwowa i to jest odpowiedź na `lekcja-45` w wersji dla mutacji:
    `thresholds.break` = 80 łącznie (egzekwuje Stryker) plus snapshot **per plik**
    z tolerancją **dwustronną** ±2 p.p. Sam próg łączny milczy o pliku, który spadł
    o dwadzieścia punktów, dopóki reszta go wyrównuje; tolerancja w górę wymusza
    przepisanie snapshotu przy poprawie, czyli linię w diffie
  - kontrola: `tools/check-mutation.fixtures/` — 37 wejść na **udawanej** bibliotece
    (`alfa`, `beta`, `pusty`), każde odrzucane na swojej **regule**; plus cztery
    przebiegi na prawdziwym repozytorium (`thresholds.break: null` → `prog-nieustawiony`;
    `select.ts` wykreślony z `mutate` → `wzorce-zmienione`; usunięte asercje
    z `select.spec.ts` → `wynik-spadl`; nowy test ponad tolerancję → `snapshot-odstaje`)
  - kontrola tej kontroli: rozbrojone po kolei **wszystkie 37 reguł** — 25 daje
    „PRZESZŁO", 12 przestawia przypadek na regułę sąsiednią i widać to **tylko dzięki
    polu `regula`** (piąte potwierdzenie wniosku z A12)
  - koszt: ~1,5 dnia (plan zakładał 1–2) · _notatki:_ rozbrojenie reguły
    `pomiar-nieczytelny` dało `TypeError` zamiast komunikatu — **ta sama wada co w A3,
    A4, A7, A8, A9, A11 i A12, ósmy raz**; tym razem znaleziona przez kontrolę tej
    kontroli, zanim bramka trafiła do CI. Osobno zmierzone: przebieg trwa ~6 min na
    ośmiu rdzeniach i jest w całości zdominowany przez 554 uruchomienia zestawu testów.
    Osobno, znalezione po wpięciu do CI: target był **flaky pod zrównolegleniem** —
    Stryker kopiuje drzewo projektu do piaskownicy i wywracał się na tymczasowym
    tsconfigu, który kasował mu równolegle biegnący `build` ([`lekcja-59`](lekcje.md#lekcja-59)).
    Lek: `ignorePatterns` w `stryker.config.json` — 707 kopiowanych plików zamiast 3907

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

- [ ] **C7 — `options` jako jedyna część kontenera bez przedrostka `group-`**
  - `libs/components/radio/src/radio-group.html` — grupa wystawia `group-label`,
    `group-hint`, `group-error` i `options`. Przedrostek wziął się z realnej kolizji
    z etykietami opcji ([`lekcja-15`](lekcje.md#lekcja-15)), a ta jedna część została poza
    regułą, którą [`wym-api-czesci-unikalne`](wymagania/api.md#wym-api-czesci-unikalne)
    zapisuje jako fakt („części kontenera mają własny przedrostek")
  - dziś **z niczym nie koliduje**, więc to nie jest wada a11y ani zmiana wymuszona:
    `wym-api-czesci` obiecuje stabilność i spisanie, nie zgadywalność. Zostawione przy A3
    świadomie, tym samym ruchem co C6 przy A4 — z tą różnicą, że od A3 przemianowanie jest
    już widoczną zmianą publicznego API (snapshot), a nie cichą poprawką
  - koszt: minuty na zmianę (`options` → `group-options`, nikt jej nie używa
    w testach ani w sandboxie), decyzja jest całym zadaniem · _notatki:_ —

- [ ] **C8 — reguły forced-colors przegrywają specyficznością z regułami bazowymi**
      _(znalezione 2026-08-06 przy A10)_
  - `libs/components/button/src/button.scss` — `:host([disabled])` w bloku
    `@media (forced-colors: active)` ma specyficzność (0,2,0), a reguła bazowa
    `:host([disabled]:not([data-pct-loading]))` — (0,3,0). Media query nie dokłada
    specyficzności, więc `color: GrayText` **nie wygrywa**. Do sprawdzenia w pozostałych
    pięciu arkuszach z blokiem forced-colors (`checkbox`, `radio`, `select`, `field`,
    `text`)
  - dziś **bez objawu**: chromium i firefox zamalowują wynik paletą użytkownika
    niezależnie od tego, która reguła wygrała, więc pomiar wychodzi poprawny. Widać to
    wyłącznie na webkicie, który podmiany nie robi ([`lekcja-56`](lekcje.md#lekcja-56)),
    i będzie widać wszędzie od dnia, w którym któraś część biblioteki dostanie
    `forced-color-adjust: none`
  - to jest deklaracja bez pokrycia, czyli ta sama rodzina co martwe `--pct-on-danger`
    z A12: kod, który wygląda na obsługę przypadku, i go nie obsługuje
  - koszt: ~0,5 dnia razem z pomiarem, czy da się to zapisać jako regułę
    `check-styles` · _notatki:_ —

- [x] **C5 — `PCT_TEXTS` nie przeżyje zmiany języka w runtime** _(2026-08-06, razem z A11)_
  - rozstrzygnięte jako [0014](decyzje/0014-teksty-jako-sygnal.md): token niesie
    `Signal<PctTexts>`, a napis czyta się **przy renderowaniu**. `providePctTexts`
    przyjmuje też sygnał, więc przełącznik języka podaje `computed(() => SLOWNIKI[jezyk()])`
  - wybór padł na pierwszą z trzech opcji, a nie na obronną trzecią, bo cena jest do
    zapłacenia **tylko teraz**: `inject(PCT_TEXTS)` zmienia typ, czyli po pierwszym
    wydaniu byłby to major z codemodem
  - fabryka (opcja druga) nie wystarcza — DI rozwiązuje dostawcę raz, więc `useFactory`
    daje ten sam zamrożony obiekt, tylko liczony leniwie
  - `placeholder` stracił wartość domyślną (`input<string>()`), a napis dokłada
    `computed()`. **`placeholder=""` zostaje pustym tekstem zastępczym** — brak wartości
    i wartość pusta znaczą co innego
  - test: zmiana języka w runtime dociera do napisów; bez poprawki pada na
    `expected 'Select…' to be 'Wybierz…'`. Regułę pilnuje `check-texts`
    (`napis-przy-konstrukcji`), bo sama wiedza już raz nie wystarczyła —
    [`lekcja-54`](lekcje.md#lekcja-54)

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

### 2026-08-06 — A13: 96,62% pokrycia to 63,54% zauważonych wad. Faza A zamknięta

Zrobione **A13**. Luki: 12 → 11, egzekwowane: 53 → 54. **Faza A ma za sobą komplet
trzynastu zadań.**

Zadanie było zakresowo dokładnie tym, co zapisał plan — Stryker na `core`, `number`
i `select`, próg wpięty w CI zamiast raportu do oglądania — i pomyliło się w jednym:
w założeniu, że najtrudniejszą częścią będzie bramka. Najtrudniejszą częścią był
**pierwszy pomiar**.

- **Przy 96,62% pokrycia linii testy zauważały 63,54% wprowadzonych wad.** To nie jest
  błąd pomiaru, tylko dwie różne wielkości: pokrycie mówi, ile linii się WYKONAŁO,
  a linia wykonana bez ani jednej asercji na jej skutek liczy się tam tak samo jak
  sprawdzona. 44 mutanty nie miały ani jednego pokrywającego testu — przy 96,62%.
  Rozkład reszty jest pouczający i nieegzotyczny: granice warunków (`match >= 0`
  przestawione na `> 0` przeżywa każdy test, w którym trafienie nie wypada na indeksie
  zero), wartości domyślne wejść (każdy test podający `[readonly]="readonly()"` mierzy
  własne wiązanie, nie domyślną — kontrolka bez ani jednego wiązania nie była renderowana
  ani razu) i testy, które nie robią tego, co obiecuje ich nazwa: `PageUp/PageDown skacze
dziesięciokrotnie` naciskał wyłącznie PageUp ([`lekcja-57`](lekcje.md#lekcja-57)).
- **Publiczne API bez własnej specyfikacji wygląda na przetestowane.** `pctFieldMessages`
  i `pctDescribedBy` z `@pacit/components/core` nie miały ani jednego testu pod własnym
  nazwiskiem — mierzyły je specyfikacje kontrolek, każda na jednej ścieżce. Pokrycie linii
  pokazywało je jako 100%, bo każda linia wykonuje się przy renderowaniu selecta. Osobna
  `core.spec.ts` podniosła wynik tego entrypointu z 76,79% na 98,21%. Łącznie: 38 nowych
  testów, wynik 63,54% → **81,77%**, a pokrycie linii przy okazji 96,62% → 98,61%.
- **Narzędzie mierzące wady jest po instalacji raportem, nie bramką.** `thresholds.break`
  jest w Strykerze domyślnie `null`, czyli przebieg z wynikiem 4% kończy się zerem tak
  samo jak z 94%. A gdy próg już stoi, podnosi się go pięcioma ruchami, z których żaden
  nie dokłada testu i każdy wygląda w review jak sprzątanie: plik wykreślony z `mutate`
  (zabiera swoje przeżywające mutanty, więc procent rośnie), poszerzone `ignorers` albo
  `// Stryker disable` w źródle, wykluczona rodzina mutatorów, `ignoreStatic: true`
  i skrócony `timeoutMS` — mutant zabity ZEGAREM liczy się do wyniku jak zabity asercją.
  Stąd `check-mutation` czyta konfigurację **skuteczną z raportu przebiegu**, a nie
  z pliku: flaga dopisana do polecenia targetu nie zostawia w nim ani jednej linii
  ([`lekcja-58`](lekcje.md#lekcja-58)).
- **Dwie drogi do tych samych specyfikacji rozjechały się przy pierwszym uruchomieniu.**
  Stryker potrzebuje PLIKU konfiguracji Vitesta, a target `test` idzie przez builder
  `@angular/build`, który składa ją w pamięci — więc przebieg mutacyjny ma własną
  (`mutacja.vitest.config.mts`). Pod nią dwa testy `field.spec.ts` padały od razu: wtyczka
  Analoga domyślnie kompiluje w testach **JIT-em**, a wtedy `styleUrl` nie dociera do
  komponentu w ogóle i `getComputedStyle` zwraca pustkę. Stąd `jit: false` i stąd punkt 3
  bramki, który porównuje `testFiles` z raportu z listą `*.spec.ts` z indeksu gita:
  specyfikacja niewidziana przez tę drugą drogę byłaby testem, którego mutanty nie ma kto
  zabić, a wynik spadłby bez śladu przyczyny.
- **Podłoga jest dwuwarstwowa, bo próg łączny milczy o pojedynczym pliku.** `break` = 80
  egzekwuje Stryker; snapshot `mutacja.snapshot.md` pilnuje każdego pliku z osobna
  i pilnuje go **w obie strony** (±2 p.p.): w dół, bo tak wygląda usunięta asercja,
  w górę, bo podłoga stojąca dziesięć punktów pod pomiarem przestaje mierzyć. Cena jest
  zapisana wprost — poprawa testów wymaga `--write`, czyli linii w diffie.

Sprawdzone przebiegiem, nie rozumowaniem: bramka zapala na czterech sposobach zepsucia
repozytorium (`thresholds.break: null`, `select.ts` wykreślony z `mutate`, usunięte
asercje w `select.spec.ts`, snapshot sprzed dopisania testów) — za każdym razem na innej
regule — i na rozbrojeniu **wszystkich 37 reguł**, z czego 12 przestawia przypadek na
regułę sąsiednią i widać to **tylko dzięki polu `regula`**. To piąte potwierdzenie
wniosku z A12.

Osobne znalezisko, zmierzone przy pierwszym uruchomieniu: **`ignorers: ["angular"]` nie
jest wygodą, tylko warunkiem uruchomienia.** Bez niego dry run wywraca się na
`Component 'PctSelect' is not resolved` — obiekt konfiguracyjny `input()`/`model()`/
`output()` jest czytany statycznie przez ngtsc, a zmutowany przestaje być literałem, więc
cały plik wraca do JIT-a. Zwęża to mianownik o 16 mutantów, więc stoi w polityce razem
z powodem, a punkt 5 pilnuje, żeby żaden inny powód zignorowania się nie pojawił.

Znalezione już po wpięciu do CI i warte zapisania osobno: **target był flaky pod
zrównolegleniem**, a pierwszym podejrzanym był limit czasu mutanta — hipoteza wygodna,
pasująca do objawu i fałszywa. Zapisany przebieg pokazał `ENOENT ... copyfile` na
tymczasowym tsconfigu ng-packagra: Stryker kopiuje drzewo projektu do piaskownicy,
chodząc po nim sam, a nie po indeksie gita (3907 plików wobec 707 znanych gitowi), więc
każdy równoległy pisarz w `tmp/` jest dla niego wyścigiem ([`lekcja-59`](lekcje.md#lekcja-59)).

Wpadka własna jedna i znajoma: rozbrojenie reguły `pomiar-nieczytelny` dało `TypeError`
zamiast komunikatu — **ósmy raz ta sama wada** (A3, A4, A7, A8, A9, A11, A12). Tym razem
z jedną różnicą, którą warto zapisać: znalazła ją kontrola tej kontroli, uruchomiona
**przed** wpięciem bramki do CI, a nie po. Osiem powtórzeń wystarczyło, żeby przestać
liczyć na pamięć i zacząć na przebieg rozbrajający.

Następne: faza A jest zamknięta, więc kolejność zaczyna się od **B** — B1 (`LICENSE`)
i B2 (zdalne repozytorium + `repository`) to minuty, a bez nich nie da się wydać niczego.
Równolegle **F1** (`apps/docs`) jest odblokowane od A3/A4, a **C** zostaje wypełniaczem.

### 2026-08-06 — A10: media query zapaliło się w silniku, który tego nie umie

Zrobione **A10**. Luki: 13 → 12, egzekwowane: 52 → 53. Faza A ma za sobą dwanaście
z trzynastu zadań; zostało jedno.

Zadanie było zakresowo dokładnie tym, co zapisał plan — webkit i firefox funkcjonalnie,
zrzuty na chromium — i pomyliło się w jednym: w założeniu, że dopisanie trzech projektów
jest **wykonaniem** tej obietnicy. Jest jej deklaracją.

- **Ta obietnica nie ma objawu.** Playwright kończy się zerem po trzech projektach
  dokładnie tak samo jak po jednym, i tak samo po **zerze** zebranych testów. Cofa się
  ją czterema ruchami, z których każdy wygląda w review jak sprzątanie: projekt
  wykreślony z `projects`, plik dopisany do `testIgnore` „bo miga", `--project=chromium`
  w poleceniu targetu, silnik zdjęty z kroku instalacji w CI. Trzeci z nich jest
  niewidoczny w `playwright.config.mts`, czwarty — w całym katalogu `apps/`. Stąd bramka
  pytająca `playwright test --list --reporter=json`, co silniki NAPRAWDĘ zbierają, i
  porównująca to z polityką: ten sam ruch co „nie czytaj `include`, uruchom kompilator"
  z A7, bo wzorzec `testIgnore`, który w nic nie trafia, **nie jest dla Playwrighta
  błędem** — jest projektem zbierającym komplet.
- **Firefox przeszedł 146 z 146 testów funkcjonalnych za pierwszym razem, webkit 144.**
  I te dwa są całym znaleziskiem: Playwrightowy webkit melduje
  `matchMedia('(forced-colors: active)').matches === true` i **nie podmienia kolorów
  autora**. Sonda `<div style="background: rgb(1, 2, 3)">` wychodzi z niego niezmieniona,
  a `forced-color-adjust` nie jest w nim nawet znaną właściwością. Cztery z sześciu
  testów `forced-colors.spec.ts` przechodzą tam, mierząc kolory z tokenów zamiast
  z palety — czyli plik pytałby o zachowanie, którego ten silnik nie ma, i pytałby po
  cichu ([`lekcja-56`](lekcje.md#lekcja-56)).
- **Wyłączenie oparte na fakcie o przeglądarce musi ten fakt mierzyć.** Zdanie „webkit
  tego nie umie" jest zdaniem o WERSJI PACZKI, nie o tym repozytorium — przestanie
  obowiązywać przy zmianie, która nie ruszy tu ani jednego pliku. Rejestr wyłączeń ma
  więc dwa rodzaje wpisów: `zapis` (zrzuty wizualne poza chromium — decyzja spisana raz)
  i `pomiar` (forced-colors poza webkitem — sonda przy każdym przebiegu). Mianownikiem
  jest przy tym reguła `fakt-bez-odniesienia`: fakt niezachodzący u ŻADNEGO silnika nie
  jest wadą silników, tylko zepsutą sondą, a sonda zwracająca fałsz zawsze uzasadniałaby
  każde oparte na sobie wyłączenie w nieskończoność.
- **Silnik, który nie zamalowuje wyniku, pokazuje wadę, której dwa pozostałe nie potrafią
  pokazać.** `:host([disabled])` w bloku forced-colors ma specyficzność (0,2,0), a reguła
  bazowa `:host([disabled]:not([data-pct-loading]))` — (0,3,0); media query nie dokłada
  specyficzności, więc `color: GrayText` przegrywa z tokenem. W chromium i firefoksie
  nie widać tego nigdy, bo przeglądarka zamaluje wynik paletą niezależnie od tego, która
  reguła wygrała. Deklaracja w bibliotece jest martwa — dziś bez objawu, z objawem od
  pierwszego `forced-color-adjust: none`. Przeniesione do **C8**.

Sprawdzone przebiegiem, nie rozumowaniem: bramka zapala na dziewięciu sposobach zepsucia
repozytorium (webkit wykreślony z `projects`, plik w `testIgnore` firefoksa, wyłączenie
poszerzone na silnik przechodzący sondę, silnik zdjęty z instalacji w CI,
`--project=chromium` w targecie, wyłączenie usunięte z polityki, `testIgnore` zdjęty przy
zostawionym wpisie, nowy spec wyłączony wszystkim naraz, niedomknięty nawias
w konfiguracji) — za każdym razem na innej regule — i na rozbrojeniu **wszystkich 26
reguł**, z czego osiem przestawia przypadek na regułę sąsiednią i widać to **tylko dzięki
polu `regula`**. To czwarte potwierdzenie wniosku z A12.

Dwudziesta szósta reguła (`pomiar-nieczytelny`) rozbrojona **nie daje żadnego objawu** —
bramka zostaje zielona, bo w zdrowym repozytorium ta ścieżka nie jest wykonywana. Dowodzi
jej wyłącznie przebieg z zepsutą konfiguracją, i to jest o niej cała prawda; wpisana tak
w README fixtures, żeby nie czytało się jej jako pokrytej.

Wpadka własna jedna i nowa w kształcie: bramka zapaliła **na sobie** przy pierwszym
uruchomieniu. Punkt 5 policzył cztery kroki instalacji przeglądarek tam, gdzie są dwa —
ten workflow tłumaczy każdy swój krok akapitem prozy, więc zdanie o `playwright install`
wygląda dla wzorca dokładnie jak wywołanie `playwright install`. Skaner tekstu czytający
plik z komentarzami musi te komentarze obciąć, zanim zacznie szukać; wcześniejsze bramki
nie miały tego problemu, bo czytały JSON albo wyjście parsera.

Osobno, poza kodem: webkit nie startuje na tej maszynie bez czterech bibliotek
systemowych (plus dwóch przechodnich), których `playwright install` nie dociąga bez
roota. W CI robi to `--with-deps`; lokalnie potrzebne jest
`sudo npx playwright install-deps webkit`.

Następne: **A13** (przebieg mutacyjny, 1–2 dni) — ostatnia pozycja fazy A.

### 2026-08-06 — A9: pierwsza komenda konsumenta wywracała się przy zielonych bramkach

Zrobione **A9**. Luki: 14 → 13, egzekwowane: 51 → 52. Faza A ma za sobą jedenaście
z trzynastu zadań; zostały dwa i oba wymagają zbudowania czegoś nowego.

Zadanie było zakresowo dokładnie tym, co zapisał plan — `npm pack`, instalacja, build
z SSR, jeden e2e — i **znalazło wadę przy pierwszym uruchomieniu, zanim jeszcze doszło
do e2e**.

- **`ng add @pacit/components` nie działało.** Manifest pakietu niesie `"type": "module"`
  (dopisuje ng-packagr), schematics są kompilowane osobno do CommonJS-a i lądują jako
  `.js` — więc Node czyta je jako ESM i przewraca się na `exports.ngAdd = …` w drugiej
  linii. Pierwsza komenda, jaką konsument wpisuje po instalacji, w wydawanym artefakcie.
  **`check-package` widział wtedy komplet**: manifest ma pole `schematics`, kolekcja
  wskazuje fabrykę, plik fabryki jest w pakiecie. Wszystkie trzy odpowiedzi prawdziwe;
  pytanie „czy da się go wczytać" nie padło, bo bramka statyczna nie ma jak go zadać
  ([`lekcja-55`](lekcje.md#lekcja-55)). Naprawa jest tym, co robi `@angular/cdk`: własna
  granica modułów w `schematics/package.json`.
- **Między `dist` a `node_modules` konsumenta stoją dwa filtry.** `npm pack` (pole `files`,
  `.npmignore`) i rejestr. Bramka chodząca po katalogu jest na nie ślepa z konstrukcji,
  więc punkt 1 czyta listę plików z **archiwum** i porównuje ją z mapą `exports` oraz
  z kolekcjami schematiców. Przebieg: `files: ["fesm2022", "themes", "types"]` w manifeście
  zapala punkt 1 i **nie rusza** `check-package`.
- **Rejestr proxuje npmjs i to jest cicha wada czekająca na pierwsze wydanie.** Nieudana
  publikacja nie kończy się błędem instalacji — kończy się zaciągnięciem pakietu z uplinku.
  Dziś `@pacit/components` na npmjs nie ma, więc byłoby to 404; po B2 będzie i bramka bez
  punktu 2 badałaby artefakt sprzed wydania, wyglądając na zieloną. Stąd trzy reguły
  porównujące sumę archiwum i adres, z którego przyszło — po obu stronach: w metadanych
  rejestru i w pliku blokady aplikacji.
- **„Zbudowało się z SSR" to za mało — trzeba zapytać, KTO renderował.** Aplikacja bez
  routera jest przez builder **prerenderowana**: serwer oddaje wtedy gotowy plik
  (`ng-server-context="ssg"`), a bundle serwera nie renderuje ani razu. Punkt 6 wymaga
  więc `"ssr"`, a aplikacja sondy dostała trasę z `RenderMode.Server`. Zmierzone przy
  okazji, nie założone: `document` w **zasięgu modułu** biblioteki nie daje 500, tylko
  wywraca **build** — builder ładuje bundle serwera, żeby wyprowadzić z niego trasy.
  Dopiero `document` przy konstrukcji komponentu wychodzi na 404 z serwera.

Sprawdzone przebiegiem, nie rozumowaniem: bramka zapala na siedmiu sposobach zepsucia
repozytorium (pusta skórka w pakiecie, skórka usunięta, `files` odcinające schematics,
zdjęta granica CommonJS, `exports` na nieistniejący plik, `document` przy konstrukcji,
przycisk malowany kolorem z palca) — za każdym razem na innej regule — i na rozbrojeniu
**wszystkich 28 reguł**, z czego cztery przestawiają przypadek na regułę sąsiednią i widać
to **tylko dzięki polu `regula`**. To trzecie potwierdzenie wniosku z A12.

Wpadka własna jedna i znajoma: rozbrojenie reguły `brak-wpisu` dało `TypeError` zamiast
komunikatu — **siódmy raz ta sama wada** (A3, A4, A7, A8, A11, A12), tym razem w bramce,
która ma o tej wadzie akapit we własnym nagłówku. Napisanie „każdy punkt czyta wejście
defensywnie" i napisanie kodu, który to robi, to najwyraźniej dwie różne czynności; jedyne,
co je łączy, to przebieg rozbrajający.

Następne: **A10** (macierz przeglądarek, ~0,5 dnia + czas CI) albo **A13** (przebieg
mutacyjny, 1–2 dni) — dwie ostatnie pozycje fazy A.

### 2026-08-06 — A11: wejście jest sygnałem, a jego wartość domyślna nie

Zrobione **A11**, a razem z nim **C5** — okazały się jednym zadaniem, bo bramka pilnująca
kanału tekstów musi najpierw wiedzieć, czym ten kanał jest. Luki: 15 → 14, egzekwowane:
50 → 51. Faza A ma za sobą dziesięć z trzynastu zadań; zostały trzy i każde wymaga
zbudowania czegoś nowego poza samą bramką.

Zadanie miało być półdniowym grepem („każdy napis widoczny dla użytkownika idzie przez
`PCT_TEXTS`") i pomyliło się nie w diagnozie, tylko w tym, **gdzie ten napis stoi**.

- **Grep po szablonach to połowa kanału, i to ta łatwiejsza.** Druga połowa jest w TS:
  `readonly placeholder = input<string>(this.texts.selectPlaceholder)` wygląda na odczyt
  reaktywny, bo wejście **jest** sygnałem — a wartość domyślna powstaje raz, przy
  konstrukcji. Aplikacja przełączająca język bez przeładowania zostawała z napisem sprzed
  zmiany od commita, który `PCT_TEXTS` wprowadził (2026-07-27), przy zielonym CI: jedyny
  test tego kanału renderował komponent RAZ, a przy jednym renderowaniu obie wersje dają
  ten sam napis ([`lekcja-54`](lekcje.md#lekcja-54)). Wada była przy tym **opisana
  w decyzji 0007 jako otwarta** — to nie brak wiedzy ją utrzymał, tylko brak maszyny.
- **Odczyt szablonu jest jeden i to jest zmierzona granica, nie niedopatrzenie.** Wzorzec
  „dwa niezależne odczyty" (A3, A4, A6) tutaj się nie domyka: po zlinkowaniu literał węzła
  tekstowego trafia do treści **zagnieżdżonej** funkcji szablonu, a `ɵcmp.template`
  prowadzi tylko do zewnętrznej. Zamiast udawać drugi odczyt, bramka bierze parser
  Angulara (`parseTemplate` + `TmplAstRecursiveVisitor`, czyli obejście drzewa
  utrzymywane przez Angulara, nie przeze mnie) i otacza go czterema regułami mianownika:
  brak błędów parsera, brak nieznanego rodzaju węzła, brak szablonu w dekoratorze,
  niezerowa liczba odwiedzonych węzłów. Odczyt z pakietu został tam, gdzie ma co robić —
  przy atrybutach, bo blok `host` składany rozwinięciem obiektu (`...fitHost`) jest dla
  skanera źródeł niewidzialny.
- **Czego pomiar nie umie zobaczyć, tego się zakazuje.** ICU niesie warianty tekstu
  w drzewie i18n, do którego to obejście nie sięga — zmierzone, `visitText` nie dostaje
  z ICU ani jednego węzła. Czytanie go po połowie dałoby bramkę zieloną dokładnie tam,
  gdzie tekstu jest najwięcej. Ten sam ruch co zakaz wiązania nazwy części w A3.
- **Furtka bez użytkownika jest martwym artefaktem.** `check-styles` ma mechanizm wyjątków
  (`pct-wyjatek`) i cztery realne użycia; tutaj kandydatów nie ma ani jednego, więc
  mechanizmu nie ma. Znak bez litery (`*` przy polu wymaganym, cztery wystąpienia
  w bibliotece) nie jest tekstem, bo nie ma w nim czego przetłumaczyć — i dlatego nie
  potrzebuje wyjątku, tylko reguły.

Sprawdzone przebiegiem, nie rozumowaniem: bramka zapala na dziewięciu sposobach zepsucia
repozytorium (literał zamiast `texts()`, `aria-label` z napisem przed przebudową i po
niej, odczyt tekstów w wartości domyślnej wejścia, `console.warn` bez `isDevMode()`, pole
bez wartości domyślnej, pole martwe, literał w interpolacji, statyczny `aria-label`
w bloku `host`) — za każdym razem na innej regule — i na rozbrojeniu **wszystkich 29
reguł mających przypadek**, z czego dziewięć przestawia przypadek na regułę sąsiednią
i widać to **tylko dzięki polu `regula`**. To jest drugie potwierdzenie wniosku z A12:
porównanie samego identyfikatora punktu przepuściłoby dziewięć z dwudziestu dziewięciu.

Dwie wpadki własne. Rozbrojenie reguły `szablon-bez-wlasciciela` dało `TypeError` zamiast
komunikatu — **szósty raz ta sama wada** (A3, A4, A7, A8, A12): punkt 2 czytał właściciela
szablonu, ufając punktowi 1. Druga nie była w bramce, tylko w narzędziu do jej badania:
skrypt przebiegów na repozytorium odtwarzał stan przez `git checkout -- libs/components`
i **skasował niezacommitowaną decyzję 0014** — całą, razem z testami. Odtworzone z kopii
i z kontekstu, ale wniosek jest tani i trwały: przebieg psujący żywe repozytorium ma
odtwarzać z kopii plików, dopóki praca nie jest w indeksie.

Następne: **A9** (test konsumenta na Verdaccio), **A10** (macierz przeglądarek) albo
**A13** (przebieg mutacyjny) — trzy ostatnie pozycje fazy A, każda wymaga zbudowania
czegoś nowego.

### 2026-08-05 — A12: bramka kontrastu mierzyła 38 par z 74 i była zielona

Zrobione **A12**. Luki: 17 → 15, egzekwowane: 48 → 50. Faza A ma za sobą dziewięć
z trzynastu zadań i **wszystkie, które da się napisać bez budowania czegoś nowego**.

Zadanie miało być półdniowe („porównaj listę powierzchni z listą par") i było czymś
innym w obu połowach. Plan nie pomylił się w diagnozie mechanizmu — obie luki są dokładnie
tam, gdzie je opisał — tylko w tym, **skąd wziąć listę**, wobec której się porównuje.

- **Lista powierzchni z NAZW tokenów nie widzi tego, co ta biblioteka robi.** Wariant
  outline przycisku maluje tło `var(--pct-surface-100)` i etykietę `var(--pct-primary)`,
  czyli dwoma tokenami semantycznymi; reguła pytająca „czy każdy token komponentowy
  `*-bg` ma parę" orzekłaby o kompletności, nie widząc ich z konstrukcji. Mianownik
  czyta więc wyjście **sassa** — ten sam ruch co „nie czytaj `include`, uruchom
  kompilator" z A7. Odwrotnie działa reguła `on-*`: ta czyta nazwy, bo para
  zadeklarowana i nigdy nienamalowana nie zostawia w arkuszu żadnego śladu.
- **Policy milczała o 27 kolorach z 74, a po ich dopisaniu build padł na trzech.**
  W motywie ciemnym etykieta przycisku na hover dawała **3,45:1**, na active **2,66:1**,
  a etykieta outline na hover **3,98:1** — wszystkie poniżej AA, wszystkie w bibliotece
  od miesięcy, wszystkie przy zielonym CI. Przyczyna jest warta zapamiętania osobno:
  rampa ciemna była kopią jasnej, a `on-primary` jest w ciemnym motywie **ciemny**, więc
  przyciemnienie tła na hover zbija kontrast zamiast go podnosić. Kierunek rampy zależy
  od tego, po której stronie stoi tekst ([`lekcja-52`](lekcje.md#lekcja-52)).
- **Reguła „komponentowy nigdy do prymitywnego" była złamana 35 razy — i to nie jest
  dług.** Nad osiami wymiaru nie ma warstwy semantycznej i nie da się jej dołożyć bez
  wymyślenia ról, których nikt nie potrzebuje; `pct.control.height.md` nie jest surową
  wartością, tylko wspólną osią przycisku i pola. Kolor jest za to czysty w 100%.
  Wyjątek stoi więc w polityce i jest pilnowany z dwóch stron: oś nieużywana zapala, oś
  niosąca token koloru zapala **na samej deklaracji** — czyli dopisanie `blue` do listy
  nie rozbraja reguły, dla której punkt powstał, tylko ją uruchamia.
- **Punkt bramki to nie jedno zdanie.** Punkt 6 niesie dziewięć reguł, punkt 7 sześć.
  Porównanie samego identyfikatora punktu — tak działa kontrola odniesienia każdej bramki
  w tym repozytorium ([`lekcja-50`](lekcje.md#lekcja-50)) — przepuszcza przypadek, który
  zapalił na sąsiedniej regule. Stąd opcjonalne pole `regula` w `fixture.json`. Zmierzone,
  że to nie jest ozdobnik: rozbrojenie pięciu reguł przestawia ich przypadki na sąsiednie
  reguły tego samego punktu i **bez tego pola wszystkie te przebiegi byłyby zielone**.

Sprawdzone przebiegiem, nie rozumowaniem: bramka zapala na ośmiu sposobach zepsucia
repozytorium (kolor na prymitywie, kolor z palca, tło pożyczone od innego komponentu, oś
usunięta z polityki, oś martwa dopisana, nowe malowanie bez pary, para usunięta z policy,
martwe `on-danger` przed i po przyjęciu snapshotu) — za każdym razem na innej regule —
i na trzech sposobach rozbrojenia własnej kontroli, przy czym rozbrojenie zmierzone
**dla czternastu z piętnastu reguł osobno** — piętnasta (`referencja-donikad`) jest dla
tej konstrukcji nieosiągalna, bo generator rzuca na nieznanej referencji przed bramką.

Dwa wpadki własne, obie tej samej rodziny co poprzednie sesje. Punkt 7 **przeszedł na
zielono, nie zmierzywszy ani jednego koloru** — „0 kolorów malowanych w 7 arkuszach",
bo wzorzec deklaracji wymagał wiodącego myślnika i widział wyłącznie custom properties.
To [`lekcja-48`](lekcje.md#lekcja-48) w punkcie pisanym po to, żeby jej nie powtórzyć,
i ta sama pomyłka co w A5: kontrola niepustości stała po stronie **wejścia**, a pusty
był **pomiar**. Druga: rozbrojenie reguły `token-spoza-skorki` dało `TypeError` zamiast
komunikatu — **piąty raz ta sama wada** (A3, A4, A7, A8), naprawiona tak samo, przez
danie każdej regule własnego warunku wstępnego zamiast łańcucha `else`.

Na koniec znalezisko w **innej** bramce, wywołane tą zmianą: przemalowanie całego
przycisku w motywie ciemnym nie ruszyło ani jednego wzorca wizualnego. `toHaveScreenshot`
ma dwa progi, a zmierzony był jeden — domyślne `threshold: 0.2` jest dwunastokrotnie
większe niż krok rampy (0,0163), więc zmiana koloru dawała **zero** różniących się
pikseli ([`lekcja-53`](lekcje.md#lekcja-53)). Próg ustawiony na 0,005 z pomiaru, dwa
zrzuty ciemne odtworzone, dwa przebiegi pod rząd bez fałszywych alarmów.

Następne: **A11** (bramka tekstów, pół dnia, przy okazji zmusza do rozstrzygnięcia C5).
A9, A10 i A13 wymagają zbudowania czegoś nowego — rejestru npm, macierzy przeglądarek,
przebiegu mutacyjnego.

### 2026-08-05 — A8: pusta sonda przechodzi każdy test na to, czego w niej nie ma

Zrobione **A8**. Luki: 18 → 17, egzekwowane: 47 → 48. Faza A ma za sobą osiem z trzynastu
zadań; została pierwsza pozycja wymagająca zbudowania czegoś nowego poza samą bramką.

Zadanie wyszło na zakładany dzień i plan **nie pomylił się w zakresie** — obietnica
trzyma się dziś w całości, każdy entrypoint wciąga wyłącznie `./core`, a CDK Overlay
stoi tylko w `./select`. Pomylił się w tym, czego dowodzi asercja, którą sam podał.

- **„W bundlu nie ma `PctField`" jest prawdą pustą dokładnie wtedy, gdy pomiar
  przestał mierzyć.** Sonda, z której bundler wyrzucił bibliotekę w całości — zły alias,
  za szeroka lista `external`, entrypoint nieosiągalny przez `exports` — również nie
  zawiera `PctField`, i wygląda przy tym na dowód. To ten sam mianownik co w A2, A5, A6
  i A7, tylko w nowym kształcie: przy asercji o NIEOBECNOŚCI mianownikiem nie jest
  „czy zmierzyłem wszystko", tylko **„czy mój pomiar potrafi cokolwiek zobaczyć"**.
  Stąd cztery punkty z dziesięciu: sonda musi wnieść swój entrypoint, sonda dwóch
  entrypointów musi być zauważalnie większa od pojedynczych (to była „kontrola" z planu
  — wpięta jako punkt bramki, bo tam jest jej miejsce), izolacja czytana drugi raz po
  tekście bundla i porównywana z metafile w obie strony, oraz komplet entrypointów
  w trzeciej sondzie prawdziwego buildera.
- **Sonda z aliasem byłaby zielona także wtedy, gdyby `exports` nie istniało.** Pakiet
  jest widziany pod własną nazwą, przez `node_modules` i mapę `exports` — tą samą drogą,
  którą pójdzie konsument. `alias` bundlera i `paths` tsconfiga omijają dokładnie tę
  część manifestu, która u niego decyduje, co jest osiągalne, więc pomiar przez nie
  badałby bibliotekę, do której nikt nie ma dostępu.
- **Markery muszą być selektorami, bo napis z FESM-a nie przeżywa linkowania.** Pierwsza
  wersja wyprowadzała je jako napisy unikalne dla entrypointu w zminifikowanym FESM-ie
  i to działa w sondzie esbuilda. W prawdziwym buildzie `button[pctButton]` nie istnieje:
  kompilator rozkłada go na `[["button","pctButton",""]]`. Marker wzięty z tekstu FESM-a
  byłby więc w punkcie 10 nie do znalezienia i „nie ma tu `PctButton`" wychodziłoby na
  zielono **zawsze**. Selektor przeżywa oba kroki, bo w obu jest daną, a nie nazwą — ta
  sama maszyneria co w A3 i ten sam powód co w [`lekcja-46`](lekcje.md#lekcja-46).
- **Punkt o `sideEffects` badał co innego, niż napisałem w jego uzasadnieniu.** Komentarz
  mówił „usunięcie tej flagi nie daje ani jednego czerwonego testu". Przebieg: klucz
  usunięty ze źródłowego manifestu, przebudowa — bramka **zielona**. Pierwszym
  podejrzanym był cache (`nx build` zameldował `3/3 hit`) i to był fałszywy trop:
  powtórka z `--skip-nx-cache` dała to samo, bo **ng-packagr dopisuje `false` sam**.
  Scenariusz, dla którego punkt powstał, jest niewykonalny; punkt zapala na jawnym `true`
  i na dniu, w którym narzędzie przestanie tę wartość dopisywać. Komentarz opisujący
  wadę, której bramka nie łapie, jest gorszy niż brak komentarza — brzmi jak pokrycie
  ([`lekcja-51`](lekcje.md#lekcja-51)).

Sprawdzone przebiegiem, nie rozumowaniem: bramka zapala na siedmiu sposobach zepsucia
repozytorium (`button` importujący `PctField`, `button` sięgający po `OverlayModule`,
primary reeksportujący `PctButton`, jawne `sideEffects: true`, nowy entrypoint bez
przebudowy, `button` większy o 2 kB, wiersz usunięty ze snapshotu) — za każdym razem na
innym punkcie — i na trzech sposobach rozbrojenia własnej kontroli, przy czym rozbrojenie
zmierzone **dla każdego z dziesięciu punktów osobno**.

Rozbrojenie punktu 4 dało `TypeError` zamiast komunikatu — **ta sama wada co w A7, A4
i A3, czwarty raz z rzędu.** Tym razem nie między punktami, tylko wewnątrz jednego:
druga gałąź czytała `s.wniesione`, ufając pierwszej. Trzy poprzednie razy dały regułę
„nie ufaj poprzedniemu punktowi"; ta dokłada, że granica punktu nie jest granicą tego
zaufania.

Następne: **A12** (pół dnia na dwie luki) albo **A11** (bramka tekstów, przy okazji
zmusza do rozstrzygnięcia C5). A9, A10 i A13 wymagają zbudowania czegoś nowego —
rejestru, macierzy przeglądarek, przebiegu mutacyjnego.

### 2026-08-05 — A3: bramka, która zapaliła poprawnie i wyjaśniła to fałszywie

Zrobione **A3**. Luki: 19 → 18, egzekwowane: 46 → 47. Faza A ma za sobą siedem z trzynastu
zadań i **wszystkie bramki „natychmiast", które da się napisać bez budowania czegoś
nowego** — reszta (A8–A13) wymaga aplikacji testowej, rejestru albo macierzy przeglądarek.

Zadanie wyszło na zakładany dzień i plan pomylił się w diagnozie mechanizmu, nie zakresu.
Miało być „skan szablonów + snapshot". Skan szablonów jest ślepy na to, co ta biblioteka
naprawdę robi.

- **Cztery części nie stoją w żadnym szablonie.** `field-prefix-item`, `field-suffix-item`,
  `field-label-aux-item`, `field-message-aux-item` siedzą w blokach `host` czterech
  dyrektyw slotowych — bo to znaczniki treści rzutowanej, a nie elementy obudowy. Bramka
  czytająca same szablony orzekałaby o inwentarzu bez nich i wyglądała na kompletną. Stąd
  lista powstaje **dwa razy**: ze źródeł i ze zbudowanego pakietu przez JIT
  (`ɵcmp.consts`, `ɵdir.hostAttrs`), czyli z wyniku prawdziwego parsera Angulara. Ten sam
  ruch co w A6 i A4, tylko że tutaj obie strony łapią rzeczy, których druga nie widzi
  z założenia: pierwsza — część, która nie dojechała do pakietu; druga — część wniesioną
  składnią, na którą regex jest ślepy (rozwinięcie `...fitHost` w obiekcie `host`).
- **Inwentarz bez czytelnika jest plikiem dla maszyny.** Rubryki **Części** w kartach
  `docs/komponenty/` są jedyną powierzchnią, na której konsument dziś te nazwy ogląda —
  i są pisane ręką. Punkt porównujący je z pakietem zapalił przy pierwszym przebiegu:
  `field.md` wymieniał **11 części z piętnastu**. Ta sama karta miała już ten sam błąd raz
  (7 z jedenastu, do 2026-07-27) i wtedy też zauważyło go dopiero policzenie. Dwa razy to
  samo miejsce, dwa razy ta sama przyczyna: listy pisanej ręką nikt nie liczy.
- **Snapshot nie potrafi zobaczyć części, której nazwa powstaje w runtime** — byłby wtedy
  zielony dokładnie dlatego, że nie ma czego zauważyć. Stąd osobny punkt na zakaz
  wiązania. Zmierzone, nie założone: atrybut wiązany **nie trafia do `consts` w ogóle**,
  tylko do treści skompilowanej funkcji szablonu, a interpolacja
  (`data-pct-part="{{ x() }}"`) wygląda w tekście jak literał i literałem nie jest —
  bez rozróżnienia skaner wpisałby do snapshotu część o nazwie `{{ x() }}`.
- **Punkt snapshotu zapalił poprawnie i wyjaśnił to fałszywie.** Przemianowanie `trigger`
  na `activator` dało komunikat „lista części jest ta sama — rozjechał się nagłówek albo
  kolejność wierszy": filtr wierszy danych nie przechodził przez ukośnik w `./select`,
  więc obie listy wychodziły puste, a puste są sobie równe. Bramka odrzuciła zmianę
  i podała poprawną diagnozę problemu, którego nie było. **Kontrola odniesienia nie miała
  jak tego zobaczyć z konstrukcji** — porównuje identyfikator punktu, nie zdanie, i tak
  działa każda kontrola w tym repozytorium ([`lekcja-50`](lekcje.md#lekcja-50)). Wyszło
  z przeczytania wypisanego zdania, nie z kodu wyjścia.

Sprawdzone przebiegiem, nie rozumowaniem: bramka zapala na sześciu sposobach zepsucia
repozytorium (przemianowanie części przy nieaktualnym `dist`, po przebudowie i po
uzgodnieniu karty — za każdym razem na innym punkcie; `[attr.data-pct-part]` w szablonie;
część usunięta z karty; dyrektywa z częścią bez eksportu) i na trzech sposobach
rozbrojenia własnej kontroli, przy czym rozbrojenie zmierzone **dla każdego z pięciu
punktów osobno**. Rozbrojenie gałęzi „brak snapshotu" dało `TypeError` zamiast komunikatu
— **ta sama wada co w A4 i A7, trzeci raz, w bramce pisanej ze świadomością dwóch
poprzednich.**

Zostawione świadomie: `options` w `PctRadioGroup` jest jedyną częścią kontenera bez
przedrostka `group-`. Z niczym nie koliduje, a `wym-api-czesci` obiecuje stabilność
i spisanie, nie zgadywalność — więc snapshot ją zamraża, a przemianowanie jest od dziś
widoczną zmianą API zamiast cichej poprawki. Przeniesione do **C7**, tym samym ruchem co
C6 przy A4.

Następne: **A8** (tree-shaking + budżet rozmiaru) albo **A12** (pół dnia na dwie luki).
F1 jest odblokowane — A3 i A4 dały mu oba inwentarze do wyrenderowania.

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
