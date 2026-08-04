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

Migawka z **2026-08-04**, `node tools/check-docs.mjs`:

| miara                                 | wartość |
| ------------------------------------- | ------: |
| wymagań                               |      81 |
| ✅ egzekwowane                        |      40 |
| 🟡 częściowo (świadomie bez kontroli) |      16 |
| ⛔ luka                               |      25 |

Wszystkie 25 luk ma niżej swojego właściciela (A, B, D, F, G). Jeśli po dopisaniu
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

Pierwsze cztery, gdyby trzeba było wybrać tydzień: **A6** i **A7** (po pół dnia, czysty
zysk), **A5** (jedyna pozycja, której koszt retrofitu rośnie nieliniowo), **A4** (pół dnia
i odblokowuje F1).

---

## A. Faza 0 — bramki „natychmiast"

12 z 25 luk ma w polu **Wiąże przy** wpisane „natychmiast". Poniższe 11 zadań domyka 14
luk.

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

- [ ] **A4 — snapshot nazw tokenów**
  - domyka: `wym-token-nazwy`
  - co: `libs/tokens/dist/tokens.ts` już jest generowany — dołożyć wersjonowany snapshot
    i porównanie. Nazwy tokenów są publicznym API motywu tak samo jak nazwy inputów
  - kontrola: zmiana nazwy tokenu bez aktualizacji snapshotu musi zapalić
  - koszt: ~0,5 dnia · _notatki:_ —

- [ ] **A5 — bramka stylów: właściwości logiczne + zakaz `opacity` na tekście**
  - domyka: `wym-token-logiczne`, `wym-token-bez-opacity`
  - co: skrypt w duchu `check-package.mjs` albo stylelint — zakaz `left`/`right`,
    `margin-left`, `padding-right`, `text-align: left|right`, `border-*-left`
    w `libs/components/**/*.scss`; wyjątki wyłącznie z komentarzem uzasadniającym
    (są dwa dobre: `border-right-color` spinnera, symetryczne `left: 50%` w strefach
    trafienia). Osobno: `opacity` na warstwie tekstowej cofa
    [`wym-token-kontrast`](wymagania/tokeny.md#wym-token-kontrast) — matematyka na hexach
    kłamie o kompozycji z tłem ([`lekcja-6`](lekcje.md#lekcja-6))
  - plus: **oś `dir` w powłoce sandboxa** (dziś są `scheme`/`skin`/`size` w
    `apps/sandbox/src/app/ui/settings.ts`) + zrzut RTL per komponent + audyt axe w RTL —
    wtedy każdy widok staje się przy okazji testem RTL
  - kontrola: arkusz z `padding-left` musi zapalić; arkusz z `opacity` na tekście musi
    zapalić
  - dlaczego teraz: koszt retrofitu jest nieliniowy — dziś 1–2 dni, po czterdziestu
    komponentach tygodnie plus polowanie na każdą strzałkę o zaszytym kierunku
  - koszt: ~1,5 dnia · _notatki:_ —

- [ ] **A6 — bramka zoneless + OnPush**
  - domyka: `wym-projekt-angular`, `wym-api-fundament`
  - co: test zapalający, gdy `zone.js` pojawi się w drzewie zależności albo `Zone`
    w zbudowanym bundlu; przy okazji asercja `ɵcmp.onPush === true` dla każdego
    eksportowanego komponentu (ten sam plik, ten sam przebieg)
  - dziś „powrót jest niemożliwy przez przypadek" nie ma żadnej maszyny za sobą
    ([`lekcja-8`](lekcje.md#lekcja-8), [`lekcja-11`](lekcje.md#lekcja-11))
  - kontrola: dopisanie `zone.js` do zależności musi zapalić; komponent z jawnym
    `ChangeDetectionStrategy.Default` musi zapalić
  - koszt: ~0,5 dnia · _notatki:_ —

- [ ] **A7 — bramka pokrycia targetem `typecheck`**
  - domyka: `wym-jakosc-typecheck`
  - co: przejście po grafie Nx — projekt bez targetu `typecheck` zapala. Dziś ma go
    **tylko** `sandbox-e2e` (z inferencji `@nx/playwright`), więc nowy projekt urodzi się
    nietypecheckowany i nikt tego nie zauważy ([`lekcja-42`](lekcje.md#lekcja-42))
  - kontrola: projekt z usuniętym targetem musi zapalić
  - koszt: ~0,5 dnia · _notatki:_ —

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
