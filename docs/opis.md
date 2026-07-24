# Biblioteka komponentów angular

Biblioteka komponentów angular pozwalająca na budowanie skomplikowanych, skalowalnych widoków aplikacji.

## Wymagania projektowe

- `wym-proj-1` Całość powstaje jako NX workspace (monorepo).

- `wym-proj-2` Na obecnym etapie (przed pierwszym publicznym wydaniem) używane są najnowsze dostępne w chwili tworzenia wersje bibliotek i frameworków. Dopiero po wydaniu pierwszej wersji publicznej rozpoczniemy prowadzenie macierzy kompatybilności (które wersje Angulara są wspierane).

- `wym-proj-3` Biblioteka ma możliwie najmniej zależności runtime od innych bibliotek TS/JS. Dopuszczone zależności runtime:
  - `@angular/cdk`

- `wym-proj-4` Kod biblioteki jest możliwie pełnie pokryty testami. Spełnia minimum SonarQube, czyli >=80% pokrycia linii kodu.

- `wym-proj-5` W ramach workspace powstaje:
  - biblioteka komponentów,
  - aplikacja angular z dokumentacją i prezentacją biblioteki — możliwa do publikacji w internecie jako strona biblioteki,
  - aplikacja angular "sandbox" pokazująca jak najwięcej możliwości używania i konfigurowania komponentów,
  - testy e2e bazujące na aplikacji "sandbox".

## Wymagania techniczne

- `wym-tech-1` Biblioteka publikowana jest jako jeden pakiet npm `@pacit/components` z secondary entrypoints per komponent.

- `wym-tech-2` Prefix selektorów i komponentów: `pct`.

- `wym-tech-3` Biblioteka korzysta z najnowszych mechanizmów Angulara:
  - standalone components,
  - signals,
  - signal forms,
  - `ChangeDetectionStrategy.OnPush`,
  - zoneless,
  - SSR.

- `wym-tech-4` Komponenty działają poprawnie w trybie SSR (Angular Universal / hydration).

## Struktura workspace

- `wym-ws-1` Layout NX monorepo:
  - `apps/` — `docs` (aplikacja dokumentacji, publikowalna), `sandbox` (playground, baza dla e2e), `sandbox-e2e` (Playwright),
  - `libs/` — `components` (publikowalny pakiet), `tokens` (źródło DTCG + build).

- `wym-ws-2` Lib `components` publikuje pakiet `@pacit/components` z secondary entrypoints per komponent (kanonicznie przez ng-packagr — folder + własny `ng-package.json` + `index.ts`; generator `@nx/angular:library-secondary-entry-point`). Wszystko trafia do jednego pakietu npm, a entrypointy mogą od siebie zależeć.

- `wym-ws-3` Kod współdzielony między komponentami trafia do wewnętrznego entrypointu `@pacit/components/core` (klasy bazowe, helpery a11y, generowanie id, `providePctConfig`), dystrybuowanego w tym samym pakiecie.

- `wym-ws-4` Tokeny są osobną lib `tokens` z targetem build (DTCG → CSS/SCSS/TS, `wym-token-2`). Wygenerowane motywy CSS trafiają do assetów pakietu, tak by działało `@pacit/components/themes/...` (`wym-token-10`).

- `wym-ws-5` Primary entrypoint (`@pacit/components`) jest minimalny — eksportuje tylko `providePctConfig`, wspólne typy i wersję. Komponenty importuje się wyłącznie przez secondary entrypoints (wymusza tree-shaking i jawne importy).

- `wym-ws-6` Struktura pliku per komponent (nazwy wg nowego style guide, `wym-api-1`): `button.ts`, `button.html`, `button.scss`, `button.spec.ts`, `button.types.ts`, `index.ts`, `ng-package.json`.

## Konwencje API komponentów

- `wym-api-1` Nazewnictwo wg nowego style guide Angulara: klasa `PctButton` (bez sufiksu `Component`), plik `button.ts` (bez `.component.`), selektor elementu `pct-button`, dyrektywy `[pctTooltip]`. Szablon i style zawsze w osobnych plikach — **świadome odstępstwo** od oficjalnej wskazówki „prefer inline templates for smaller components", podyktowane spójnością struktury plików w bibliotece o dziesiątkach komponentów (`wym-ws-6`).

- `wym-api-2` Fundament każdego komponentu: `standalone`, `ChangeDetectionStrategy.OnPush`, zoneless-safe (stan wyłącznie przez signals, brak polegania na zone.js). Zamiast `ngOnChanges` → `computed`/`effect`.

- `wym-api-3` Wejścia/wyjścia przez signals: `input()` / `input.required()` / `output()`, dwukierunkowe przez `model()`. Boolean z `booleanAttribute`, liczby z `numberAttribute`. Nazwy inputów zgodne z natywnym HTML tam gdzie to możliwe (`disabled`, `readonly`, `size`, `variant`, `loading`, `invalid`), bez prefiksu `pct`.

- `wym-api-4` Stan reflektowany na hoście jako atrybuty `data-pct-*` (np. `data-pct-size`, `data-pct-disabled`), a nie jako klasy CSS. Elementy wewnętrzne oznaczone `data-pct-part="..."` (`wym-token-7`).

- `wym-api-5` **Kontrolki formularzy to natywne kontrolki signal forms** — implementują `FormValueControl` (lub `FormCheckboxControl`) z `@angular/forms/signals`, czyli wystawiają wymagany `value = model<T>()` oraz opcjonalne pola `FormUiControl` (`disabled`, `readonly`, `invalid`, `errors`, `required`, `name`, `touch`), które dyrektywa `FormField` synchronizuje ze stanem pola.

  **`ControlValueAccessor` NIE jest implementowany.** Kontrolka spełniająca `FormValueControl` działa z reactive forms (`[formControl]`, `formControlName`) i template-driven (`[(ngModel)]`) bez żadnej warstwy kompatybilności — zweryfikowane testami (`wym-real-9`). Dzięki temu rdzeń komponentów pozostaje wolny od klasycznego API formularzy przy zachowaniu pełnej kompatybilności z istniejącymi aplikacjami.

- `wym-api-6` Dostępność wbudowana w każdy komponent — ARIA zarządzane wewnętrznie, wykorzystanie CDK a11y (`FocusMonitor`, `LiveAnnouncer`, `FocusTrap`), id generowane util-em (`wym-a11y-1`).

- `wym-api-7` Customizacja przez projekcję treści `<ng-content select="...">` oraz przekazywanie szablonów jako `TemplateRef` / dyrektywa `*pctTemplate` (odpowiednik `pTemplate`) dla elementów typu szablon itemu.

- `wym-api-8` Konfiguracja globalna wzorcem `providePctConfig({...})` z tokenem DI (domyślny `size`, locale, ripple itd.), nadpisywalna per-komponent przez inputy.

- `wym-api-9` Animacje bez zależności `@angular/animations` — realizowane na CSS + Web Animations API (zgodnie z `wym-proj-3`).

## Dostępność (a11y)

- `wym-a11y-1` Komponenty spełniają minimum WCAG 2.2 na poziomie AA, a tam gdzie to możliwe celujemy wyżej.

## Stylowanie

- `wym-styl-1` Stylowanie oparte o design tokens tłumaczone (kompilowane) na natywne CSS custom properties.

- `wym-styl-2` Wewnętrznie style biblioteki (i aplikacje w workspace) korzystają z SCSS.

## Theming

- `wym-theme-1` Theming po stronie użytkownika opiera się o design tokens i CSS custom properties (bez konieczności rekompilacji SCSS).

- `wym-theme-2` Design tokens wspierają kilka poziomów (jak np. w PrimeNG — tokeny prymitywne, semantyczne, komponentowe) oraz referencje token → token.

- `wym-theme-3` Tokeny można nadpisywać dla wybranych komponentów.

- `wym-theme-4` Możliwość ustawienia innego motywu dla części aplikacji (scoped theme) — realizowana przez kaskadę CSS custom properties na wybranym poddrzewie (np. `.pct-theme-x`), bez rekompilacji.

- `wym-theme-5` **Skórka jest w pełni parametryzowana** — autor motywu definiuje wszystkie kolory (wszystkich stanów). Komponenty nie mają wbudowanych kolorów ani nie przyciemniają stanów przez `opacity` (`wym-token-12`); korzystają wyłącznie z tokenów. Budowanie skórki uruchamia bramkę kontrastu (`wym-token-11`), która daje autorowi konkretny raport błędów i ostrzeżeń.

## Architektura design tokens

Zasada nadrzędna: **CSS-first, zero-runtime**. Motyw w runtime to wyłącznie kaskadowy CSS (custom properties) — bez silnika JS generującego style. Dzięki temu jest SSR-safe (brak FOUC i rozjazdów hydration, zgodnie z `wym-tech-4`), ma zerowy koszt w runtime i pozwala nadpisywać style zwykłym CSS-em.

- `wym-token-1` **Źródło prawdy: format DTCG** (W3C Design Tokens Community Group, JSON z `$type`/`$value` i referencjami `{...}`). Format jest przenośny — może być czytany/zapisywany przez narzędzia projektowe (np. Figma / Tokens Studio).

- `wym-token-2` **Build-time generuje artefakty** ze źródła DTCG (narzędziem typu Style Dictionary):
  - CSS z custom properties (dystrybuowane motywy),
  - mapy/funkcje SCSS do użytku wewnętrznego biblioteki,
  - typy/const TS z nazwami tokenów (bezpieczeństwo typów, brak cichych literówek).

  TS jest **generowany** ze źródła DTCG, nie pisany ręcznie.

- `wym-token-3` **Trzy poziomy tokenów:**
  - prymitywne — surowe wartości bez znaczenia (np. `--pct-blue-500`, `--pct-space-4`, `--pct-radius-md`), rampy kolorów 50–950,
  - semantyczne — intencja i stany (np. `--pct-primary`, `--pct-surface-100`, `--pct-text-muted`, `--pct-border`, `--pct-focus-ring`); to jedyna warstwa, którą użytkownik musi znać, aby zbudować własny motyw,
  - komponentowe — per-komponent (np. `--pct-button-bg`, `--pct-button-padding-x`); referują wyłącznie do semantycznych, nigdy do prymitywnych.

- `wym-token-4` **Referencje token → token są zachowywane jako `var()`** w wygenerowanym CSS (a nie rozwijane do wartości). Każdy poziom emituje `var()` do poziomu niżej. Dzięki temu nadpisanie jednej zmiennej w dowolnym scope kaskaduje samo:
  - nadpisanie tokenu semantycznego (np. `--pct-primary`) przethemowuje wszystko poniżej,
  - nadpisanie tokenu komponentowego (np. `--pct-button-bg`) zmienia tylko dany komponent (`wym-theme-3`).

- `wym-token-5` **Nazewnictwo tokenów wg przewidywalnego schematu**, tak by token dało się zgadnąć bez dokumentacji: `--pct-{komponent}-{part}-{właściwość}-{stan}` (np. `--pct-button-bg-hover`).

- `wym-token-6` **Tokeny kontrastu a11y** — dla powierzchni istnieją odpowiadające tokeny tekstu (`--pct-on-*`, np. `--pct-on-primary`). Kontrast jest weryfikowany przez bramkę policy (`wym-token-11`), spójnie z `wym-a11y-1`.

- `wym-token-11` **Bramka kontrastu jako policy skórki.** Definicja skórki zawiera policy — listę par `fg`/`bg` (rola × stan, np. `button/solid`, `button/disabled`) z poziomem WCAG i `severity`. Podczas budowania skórki bramka, dla każdego motywu (light/dark/skórka użytkownika):
  - liczy kontrast i porównuje go z **domyślnymi progami WCAG 2.2** dla tekstu normalnego (AA 4.5:1), dużego (AA 3:1) oraz elementów UI (SC 1.4.11, 3:1),
  - `severity: error` blokuje build; `severity: warn` tylko ostrzega (np. `disabled`, zwolniony z SC 1.4.3),
  - zwraca konkretny komunikat, który wariant rozmiaru przechodzi, a który nie (np. „czytelny dla dużego tekstu, ale nie dla normalnego").

- `wym-token-12` **Stany komponentów nie używają `opacity`** do przyciemniania tekstu — każdy stan (hover, active, disabled, …) ma własne, konkretne tokeny koloru. `opacity` zmienia kontrast w runtime w sposób niewidoczny dla bramki (kompozycja z tłem), więc jest zakazana dla warstw tekstowych.

- `wym-token-7` **Kontrakt part-names jako publiczne API stylowania** — elementy wewnętrzne komponentów mają stabilne, udokumentowane atrybuty `data-pct-part="..."`. Umożliwiają celowanie w elementy wewnętrzne (np. `[data-pct-part="icon"]`) w sposób odporny na aktualizacje. Kontrakt jest wersjonowany.

- `wym-token-8` **Oś gęstości (density)** — osobny wymiar tokenów (np. `comfortable` / `compact`) przełączany atrybutem/scope, niezależny od motywu kolorystycznego.

- `wym-token-9` **Tryb ciemny i scoped theme przez CSS** — schematy kolorów (light/dark) i motywy lokalne realizowane atrybutem/klasą na poddrzewie (np. `[data-theme="dark"]`, `.pct-theme-x`), bez silnika JS. Zapewniona dyrektywa-cukier `[pctTheme]`, ale mechanizm bazowy to sama kaskada.

- `wym-token-10` **Motywy dystrybuowane jako zwykłe pliki CSS** (np. `@pacit/components/themes/...`), importowane bez konfiguracji JS.

## Ikony

- `wym-ikon-1` Na obecnym etapie biblioteka nie dostarcza własnego zestawu ikon.

- `wym-ikon-2` Biblioteka umożliwia łatwe użycie ikon z popularnych zestawów (FontAwesome, PrimeIcons, Material) oraz dostarczenie przez użytkownika własnych ikon (SVG / fonty ikon). _(mechanizm do doprecyzowania)_

## Testy

- `wym-test-1` Testy jednostkowe: Vitest.

- `wym-test-2` Testy e2e: Playwright (na późniejszym etapie prawdopodobnie także testy wizualne / screenshot).

## Wersjonowanie

- `wym-wer-1` Wersjonowanie zgodne z SemVer, z kanałami przedwydawniczymi (`beta`, `rc`). _(do doprecyzowania na późniejszym etapie)_

## Stan realizacji — komponent referencyjny (walking skeleton)

Zbudowano pionowy plaster end-to-end weryfikujący powyższe ustalenia. Stack: **Angular 22, TypeScript 6, NX 23, Vitest 4, Playwright**.

Powstało:

- `libs/tokens` — źródło DTCG + build (`build.mjs`) generujący `pct.css` / `_tokens.scss` / `tokens.ts`, z **bramką kontrastu WCAG 2.2 AA** (build faila, gdy para tekst/tło < 4.5:1).
- `libs/components` — pakiet `@pacit/components` z secondary entrypoints `./core`, `./button` i `./input` (czysta mapa `exports`).
- `PctButton` — selektor atrybutowy `button[pct-button]`, standalone, OnPush, signals, `booleanAttribute`, stan jako `data-pct-*`, elementy wewnętrzne jako `data-pct-part`, `providePctConfig`.
- `apps/sandbox` — **zoneless** (`provideZonelessChangeDetection`), SSR + hydration, prezentacja Buttona i **scoped theme** (panel `data-theme="dark"` przethemowany samą kaskadą CSS).
- `PctInput` — natywna kontrolka signal forms (`FormValueControl`), etykieta/podpowiedź/błąd powiązane przez generowane id (`for`, `aria-describedby`, `aria-invalid`, `role="alert"`), błąd pokazywany dopiero po dotknięciu pola, stan bez `opacity`.
- Testy: `components` 18/18 (Vitest), `sandbox` 2/2, `sandbox-e2e` 7/7 (Playwright) — testy jednostkowe biegną pod zoneless.

Wnioski, które doprecyzowują „przepis":

- `wym-real-1` **Angular nie wspiera nowego NX „TS-solution" (project references).** Workspace musi używać klasycznego layoutu (tsconfig `paths`), nie composite/references.
- `wym-real-2` **Discovery testów Angulara (`@angular/build:unit-test`) globuje z `projectSourceRoot`.** Aby testy w secondary entrypointach (siblingi `src/`) były wykrywane, `sourceRoot` biblioteki ustawiono na root pakietu (`libs/components`).
- `wym-real-3` Target testów aplikacji to `vite:test` (plugin `@nx/vitest`), a biblioteki `test` (`@nx/angular:unit-test`).
- `wym-real-4` Build tokenów jest na razie lekkim własnym transformem (kontrakt DTCG bez zmian); podmiana na Style Dictionary pozostaje opcją bez wpływu na źródła (`wym-token-2`).
- `wym-real-5` _(do zrobienia)_ Raport pokrycia wymaga konfiguracji `coverageInclude` w targecie testowym, by egzekwować próg z `wym-proj-4`.
- `wym-real-6` Pierwotny guard (token-level) przepuścił disabled o realnym kontraście ~1.6:1, bo stan był robiony przez `opacity` (kompozycja z tłem w runtime, niewidoczna dla matematyki na hexach). Stąd `wym-token-11` (policy per motyw/rozmiar, severity) i `wym-token-12` (zakaz `opacity` dla warstw tekstowych). Wdrożone: `libs/tokens/src/contrast.policy.json` + silnik w `build.mjs`; `PctButton` używa tokenów `disabled-*` zamiast `opacity`.
- `wym-real-7` **Zoneless jest deklarowany jawnie** przez `provideZonelessChangeDetection()` w `app.config.ts`, mimo że generator nie dodaje polyfilla `zone.js` (bundle i tak go nie zawiera). Jawna deklaracja zamyka `wym-tech-3` i chroni przed przypadkowym powrotem do trybu zone-based. Testy jednostkowe biblioteki i aplikacji również konfigurują zoneless w `TestBed`, dzięki czemu `wym-api-2` (komponenty zoneless-safe) jest **weryfikowane**, a nie tylko deklarowane. (Uwaga: `setupTestBed()` z `@analogjs/vitest-angular` domyślnie już ustawia `zoneless: true` — jawna konfiguracja w spec-ach jest zabezpieczeniem na wypadek zmiany domyślnych.)
- `wym-real-9` **CVA okazało się zbędne.** Zakładaliśmy, że kompatybilność z reactive/template-driven forms wymaga `ControlValueAccessor` (i rozważaliśmy osobną dyrektywę-adapter). Eksperyment na `PctInput` (kontrolka implementująca wyłącznie `FormValueControl`) wykazał, że `[formControl]` i `[(ngModel)]` synchronizują wartość w obie strony bez żadnego kodu kompatybilności — zgodnie z dokumentacją Angulara. Rdzeń biblioteki nie importuje klasycznego API formularzy. Zachowanie jest zabezpieczone testami regresyjnymi w `input.spec.ts`.
- `wym-real-10` Bramka kontrastu obejmuje teraz także **pary nietekstowe wg SC 1.4.11** (`level: "UI"`, próg 3:1) — obramowanie inputu, obramowanie focus/błędu, focus ring. To wychwytuje typową wadę bibliotek UI: zbyt jasne obramowania pól. Tokeny komponentowe są auto-odkrywane (`component.*.json`), więc dodanie komponentu nie wymaga zmian w `build.mjs`.
- `wym-real-8` **Pakiet `zone.js` został całkowicie usunięty z zależności.** Jest opcjonalnym peer-dependency (`peerDependenciesMeta.zone.js.optional: true`) zarówno w `@angular/core`, jak i `@analogjs/vitest-angular`, a runner testów Angulara przy nieudanym `resolve('zone.js')` przechodzi w tryb bez zone (`catch → 'none'`). Zweryfikowane empirycznie po odinstalowaniu: testy 6/6 i 2/2, e2e 4/4, build biblioteki i aplikacji (SSR + prerender) — wszystko zielone; w runtime brak `window.Zone`, `__zone_symbol__` i niepatchowany `Promise`. Dzięki temu powrót do trybu zone-based jest niemożliwy przez przypadek.
