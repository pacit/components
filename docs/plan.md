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

Migawka z **2026-08-03**, `node tools/check-docs.mjs`:

| miara                                 | wartość |
| ------------------------------------- | ------: |
| wymagań                               |      81 |
| ✅ egzekwowane                        |      31 |
| 🟡 częściowo (świadomie bez kontroli) |      17 |
| ⛔ luka                               |      33 |

Wszystkie 33 luki mają niżej swojego właściciela (A, B, D, F, G). Jeśli po dopisaniu
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

Pierwsze pięć, gdyby trzeba było wybrać tydzień: **A1** (sześć luk jednym ruchem),
**A2** (najstarszy dług), **A6** i **A7** (po pół dnia, czysty zysk), **A5** (jedyna
pozycja, której koszt retrofitu rośnie nieliniowo).

---

## A. Faza 0 — bramki „natychmiast"

15 z 33 luk ma w polu **Wiąże przy** wpisane „natychmiast". Poniższe 13 zadań domyka 21
luk.

- [ ] **A1 — kontrola odniesienia dla `check-package`**
  - domyka: `wym-jakosc-pakiet`, `wym-projekt-pakiet`, `wym-projekt-entrypointy`,
    `wym-projekt-lib-tokenow`, `wym-token-css`, `wym-token-dystrybucja` — **6 luk**
  - co: katalog fixtures w duchu `tools/check-docs.fixtures/` — spreparowany `dist` per
    każdy z sześciu punktów `check-package.mjs` (brak `themes/pct.css`; skórka poza mapą
    `exports`; użyty token bez deklaracji; zła `PCT_VERSION`; brak skompilowanego
    schematica; brak `repository`)
  - kontrola: **każdy** fixture musi wywalić bramkę; fixture, który przechodzi, jest
    błędem samym w sobie — dokładnie jak punkt 6 w `tools/check-docs.mjs`
  - dziś przebieg z [`lekcja-36`](lekcje.md#lekcja-36) był **ręczny**, czyli nie istnieje
  - koszt: ~1 dzień · _notatki:_ —

- [ ] **A2 — pokrycie z egzekwowanym progiem**
  - domyka: `wym-jakosc-pokrycie` — najstarszy dług w projekcie
  - co: `coverageInclude` + próg 80% w targecie `test` projektu `components`, wynik do CI
  - kontrola: przebieg, w którym usunięcie testu zbija pokrycie poniżej progu i bramka
    zapala ([`lekcja-5`](lekcje.md#lekcja-5))
  - koszt: ~0,5 dnia · _notatki:_ —

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
  - dotyczy: `wym-wydanie-metadane` (dziś 🟡: bramka ostrzega, nikt jej nie słucha)
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

- [ ] **B5 — kontrola odniesienia dla `ng add`**
  - domyka: `wym-wydanie-ng-add`
  - co: przebieg, w którym pominięcie targetu `schematics` zapala bramkę. `ng add` to
    pierwsza komenda, jaką konsument wpisze — i pierwsza okazja, żeby biblioteka wyglądała
    na zepsutą
  - koszt: ~0,5 dnia (naturalnie razem z A1) · _notatki:_ —

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
