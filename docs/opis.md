# Biblioteka komponentów angular

Biblioteka komponentów angular pozwalająca na budowanie skomplikowanych, skalowalnych widoków aplikacji.

## Wymagania projektowe

- `wym-proj-1` Całość powstaje jako NX workspace (monorepo).

- `wym-proj-2` Na obecnym etapie (przed pierwszym publicznym wydaniem) używane są najnowsze dostępne w chwili tworzenia wersje bibliotek i frameworków. Dopiero po wydaniu pierwszej wersji publicznej rozpoczniemy prowadzenie macierzy kompatybilności (które wersje Angulara są wspierane).

- `wym-proj-3` Biblioteka ma możliwie najmniej zależności runtime od innych bibliotek TS/JS. Dopuszczone zależności runtime:
  - `@angular/cdk` — używany (CDK Overlay w `PctSelect`); zadeklarowany jako `peerDependency` pakietu. Konsument musi dołączyć `@angular/cdk/overlay-prebuilt.css`.

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
  - OnPush (domyślne w v22+, nieustawiane jawnie — `wym-api-2`),
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

## Sandbox

- `wym-sbx-1` **Sandbox jest rozbity na widoki, nie na jedną stronę.** Widok per komponent pokazuje jego warianty, wielkości i stany; widoki przekrojowe (wielkość, motyw, gęstość, stany, formularze, tokeny/części, a11y) zestawiają **wszystkie** komponenty na jednej osi — bo część wad widać wyłącznie w zestawieniu (`wym-real-29`). Rejestr widoków (`views.ts`) jest jednym źródłem dla routingu, nawigacji i strony wejściowej.

  `/` to spis widoków, `/all` — gęsty przekrój wszystkiego naraz, utrzymywany pod audyt axe i przyszłe testy wizualne.

  Widoki przekrojowe zestawiają komponenty w **macierz**, nie w listę przykładów: `/size` to wszystkie kontrolki × `sm`/`md`/`lg` wyrównane dolną krawędzią, `/states` to wszystkie kontrolki × każdy stan. Stany są tam wymuszane inputami, a nie wyprowadzane z formularza — inaczej nie da się pokazać przypadków, do których trudno doprowadzić klikaniem, a to właśnie one nie mają pokrycia (`wym-real-33`).

  **Test komponentu wchodzi na widok tego komponentu.** Dopóki wszystko stało na jednej stronie, zakres każdego testu zależał od zawartości sąsiednich przykładów, a selektory globalne (`getByRole('radiogroup')`) trafiały w cudze elementy. Testy przekrojowe (formularz, motyw, wielkość) zostają na `/all`, bo ich przedmiotem jest właśnie zestawienie.

- `wym-sbx-2` **Wspólna karta `sbx-demo` obudowuje każdy przykład.** Karta niesie osie przekrojowe: schemat kolorów (light/dark), skórkę i wielkość — z ustawieniem globalnym w powłoce i lokalnym override'em per karta. Motyw ustawia na **własnej scenie**, nigdy na `:root`, więc każdy przykład jest przy okazji testem scoped theme (`wym-theme-4`) bez pisania osobnego przykładu. Pasek przełączników stoi **poza sceną** (jest chromem strony): inaczej przełącznik motywu zmieniałby sam siebie i nie dałoby się porównać dwóch kart obok siebie.

- `wym-sbx-3` **Motyw strony też jest scoped theme** — powłoka trzyma `data-theme` na swoim hoście, a nie na `:root`. Dzięki temu `:root` zostaje niezmiennym punktem odniesienia dla testów, a strona przechodzi tę samą ścieżkę kodu co dowolne poddrzewo.

  Wymusiło to emisję bloku `[data-theme="light"]` w buildzie tokenów: dopóki jasny motyw był tylko brakiem atrybutu, jasna karta wewnątrz ciemnej strony nie miała czym cofnąć dziedziczonych wartości.

- `wym-sbx-4` **Infrastruktura sandboxa ma własny prefiks `sbx`**, oddzielony od `app` (powłoka) i od `pct` (biblioteka) — po selektorze widać, czy element jest rusztowaniem, demonstracją czy komponentem publikowanym.

## Konwencje API komponentów

- `wym-api-1` Nazewnictwo wg nowego style guide Angulara: klasa `PctButton` (bez sufiksu `Component`), plik `button.ts` (bez `.component.`), selektor elementu `pct-field` (kebab-case), selektor atrybutowy `[pctButton]` (camelCase), dyrektywy `[pctTooltip]`. Szablon i style zawsze w osobnych plikach — **świadome odstępstwo** od oficjalnej wskazówki „prefer inline templates for smaller components", podyktowane spójnością struktury plików w bibliotece o dziesiątkach komponentów (`wym-ws-6`).

- `wym-api-2` Fundament każdego komponentu: standalone, OnPush, zoneless-safe (stan wyłącznie przez signals, brak polegania na zone.js). Zamiast `ngOnChanges` → `computed`/`effect`.

  **Ani `standalone: true`, ani `changeDetection: ChangeDetectionStrategy.OnPush` nie są ustawiane jawnie** — w Angularze v22+ oba są domyślne, a oficjalny przewodnik zabrania ich powtarzania (zweryfikowane: komponent bez jawnej deklaracji ma `ɵcmp.onPush === true`).

- `wym-api-3` Wejścia/wyjścia przez signals: `input()` / `input.required()` / `output()`, dwukierunkowe przez `model()`. Boolean z `booleanAttribute`, liczby z `numberAttribute`. Nazwy inputów zgodne z natywnym HTML tam gdzie to możliwe (`disabled`, `readonly`, `size`, `variant`, `loading`, `invalid`), bez prefiksu `pct`.

- `wym-api-4` Stan reflektowany na hoście jako atrybuty `data-pct-*` (np. `data-pct-size`, `data-pct-disabled`), a nie jako klasy CSS. Elementy wewnętrzne oznaczone `data-pct-part="..."` (`wym-token-7`).

- `wym-api-5` **Kontrolki formularzy to natywne kontrolki signal forms** — implementują `FormValueControl` (lub `FormCheckboxControl`) z `@angular/forms/signals`, czyli wystawiają wymagany `value = model<T>()` oraz opcjonalne pola `FormUiControl` (`disabled`, `readonly`, `invalid`, `errors`, `required`, `name`, `touch`), które dyrektywa `FormField` synchronizuje ze stanem pola.

  **`ControlValueAccessor` NIE jest implementowany.** Kontrolka spełniająca `FormValueControl` działa z reactive forms (`[formControl]`, `formControlName`) i template-driven (`[(ngModel)]`) bez żadnej warstwy kompatybilności — zweryfikowane testami (`wym-real-9`). Dzięki temu rdzeń komponentów pozostaje wolny od klasycznego API formularzy przy zachowaniu pełnej kompatybilności z istniejącymi aplikacjami.

- `wym-api-13` **Kontrolki formularza budujemy jako obudowa + kontrolka.** `pct-field` dostarcza etykietę, podpowiedź, komunikat błędu, znacznik wymagalności oraz sloty `[pctPrefix]` / `[pctSuffix]` wewnątrz ramki. Kontraktu formularza **nie implementuje obudowa**, lecz kontrolka w środku — dzięki temu typowanie zostaje przy rodzaju pola (`string`, `number`, `Date`, `string[]`). Kontrolka rejestruje się przez token `PCT_FIELD` (wstrzykiwany opcjonalnie), a obudowa oddaje jej identyfikatory opisów do `aria-describedby`.

  Wspólna logika komunikatów (tekst błędu, bramkowanie na `touched`, składanie `aria-describedby`) mieszka w `core` — była wcześniej skopiowana do każdej kontrolki osobno (`wym-real-21`).

  **Ramkę pola rysuje obudowa**, nie kontrolka: inaczej dekoracje `prefix`/`suffix` znalazłyby się poza polem. Kontrolka w środku jest przezroczysta i bez obramowania, a focus ring obejmuje cały rząd (`:has(:focus-visible)`), także gdy fokus trafi na przycisk w slocie.

  **Cała powierzchnia ramki ma właściciela.** Rząd nie ma własnego `padding` ani `gap` — odstępy niosą trzy kolumny w środku (`field-prefix`, `field-control`, `field-suffix`), rozciągnięte na jego pełną wysokość; pusty slot dekoracji nie znika, tylko zwija się do samego paddingu krawędzi. Kursor nad ramką bierze się z kontrolki (`PctFieldControl.fieldCursor`), a nie z rozpoznawania jej klasy w arkuszu obudowy, i zapowiada skutek kliknięcia na **całej** powierzchni: `text`, `pointer`, a przy wyłączeniu `not-allowed`. Klik w tło rzędu jest przekazywany kontrolce — `focus()` na `mousedown` i `activate()` na `click`, żeby obietnica kursora obowiązywała także w paddingu (`wym-real-27`).

- `wym-api-14` **Obudowa jest opcjonalna.** Kontrolki działają też bez `pct-field` (wtedy bez etykiety i komunikatów) — przydatne np. w komórce tabeli. Kontrolki z własnym układem etykiety (checkbox, radiogroup) rysują ją samodzielnie, a wewnątrz `pct-field` oddają obudowie.

- `wym-api-15` **Pole tekstowe to komponent na natywnym `<input>`** (`input[pctText]`), nie własny element. Zachowujemy `type`, autouzupełnianie przeglądarki i tryby klawiatury mobilnej. Komponent, a nie dyrektywa, bo dyrektywy nie mogą mieć styli, a nie chcemy opierać API na `::ng-deep`.

- `wym-api-10` **Komponenty złożone: kontrolką formularza jest kontener, nie elementy składowe.** W grupie (np. `pct-radio-group` + `pct-radio`) kontrakt `FormValueControl` implementuje wyłącznie kontener — z punktu widzenia formularza edytowana jest jedna wartość. Elementy składowe komunikują się z kontenerem przez DI i nie mają własnego stanu formularza.

- `wym-api-11` **Zachowania klawiatury nie implementujemy sami, jeśli daje je platforma.** Grupa radiów opiera się na natywnych `<input type="radio">` ze wspólnym `name`, dzięki czemu nawigacja strzałkami, zawijanie i „jedno miejsce w kolejności Taba" pochodzą od przeglądarki — bez własnego roving tabindex. Własną obsługę klawiatury dodajemy tylko tam, gdzie nie istnieje natywny odpowiednik.

- `wym-api-12` **Nazwy części (`data-pct-part`) muszą być jednoznaczne w obrębie zagnieżdżenia.** W komponentach złożonych części kontenera dostają własny przedrostek (`group-label`, `group-hint`, `group-error`), żeby selektor konsumenta nie trafiał przypadkiem w części elementów składowych. Dotyczy to również obudowy: `pct-field` nazywa swoje części `field-label`, `field-row`, `field-prefix`, `field-control`, `field-suffix`, `field-hint`, `field-error` — inaczej kolidowałyby z częściami kontrolek w środku (`wym-real-24`).

- `wym-api-16` **Kontrolka zgłasza obudowie, czy chce ramkę** (`fieldAppearance`): `boxed` dla pól tekstowych, selecta czy daty; `bare` dla checkboxa i grupy radiów, wokół których ramka wygląda obco — tam obudowa dostarcza wyłącznie etykietę, podpowiedź i komunikat błędu. Obudowa gwarantuje też **minimalny obszar dotyku** kolumny kontrolki (`--pct-target-min`), bo sama wysokość linii tekstu to ~20 px, czyli poniżej progu SC 2.5.8 (`wym-a11y-2`).

- `wym-api-17` **Pole liczbowe nie opiera się na `<input type="number">`** — to świadomy wyjątek od `wym-api-11`. Natywne pole liczbowe nie zna lokalnego separatora dziesiętnego (w polskim przecinka), nie grupuje tysięcy, przy niepoprawnej treści zwraca puste `value` (nie da się odróżnić „puste" od „śmieci" ani pokazać użytkownikowi tego, co wpisał), a kółko myszy przypadkowo zmienia wartość. `[pctNumber]` stoi więc na `<input type="text">` z `role="spinbutton"`, `aria-valuenow`/`aria-valuetext` i własnym parsowaniem opartym o `Intl.NumberFormat`.

  Zasady pola liczbowego: wartość to `number | null` (puste to `null`, nigdy `0` ani `NaN`); formatowanie wg `LOCALE_ID` (nadpisywalne inputem `locale`); parsowanie **szersze niż formatowanie** — separator grupujący usuwany tylko tam, gdzie faktycznie rozdziela tysiące, a jako separator dziesiętny przyjmowany zarówno lokalny, jak i kropka (daje ją klawiatura numeryczna); domyślnie pole jest **całkowite**, ułamki włącza `maxFractionDigits`; zaokrąglanie i domykanie do granic następuje przy **zatwierdzeniu**, nie w trakcie pisania (inaczej nie da się wpisać „15", przechodząc przez „1"); tekst pola nie jest przepisywany w trakcie pisania, żeby kursor nie skakał na koniec.

  **Granic nie powtarza się w szablonie.** `min` i `max` należą do kontraktu `FormUiControl`, więc przy `[formField]` wypełnia je sama dyrektywa na podstawie walidatorów `min()` / `max()` ze schematu formularza — jedno źródło prawdy dla walidacji, ARIA i domykania wartości.

- `wym-api-18` **Wielkość jest jedną osią dla całej biblioteki.** Każdy komponent przyjmujący `size` (`sm` / `md` / `lg`, domyślnie z `providePctConfig`) bierze wysokość z tego samego tokenu `--pct-control-height-{rozmiar}`. Dzięki temu przycisk i wiersz pola tej samej wielkości mają **dokładnie** tę samą wysokość — w polu chodzi o wiersz między etykietą a podpowiedzią/błędem, bo tylko on jest odpowiednikiem przycisku.

  **Wysokość jest wartością wprost, nie wynikiem paddingu i wysokości linii.** Sterowanie pionem przez `padding-y` nie daje się zgrać między komponentami: przycisk mierzy wysokość linii etykiety, a pole — wysokość kontrolki w środku, więc ta sama liczba w paddingu daje inną wysokość (`wym-real-29`). Wysokość niesie `min-height`, nie `height`, żeby wyższa zawartość (etykieta łamana na dwie linie, `textarea`, przycisk w slocie) wciąż rozpychała kontrolkę zamiast się przycinać.

  Wariant rozmiaru **podmienia tokeny bazowe** na swoje odpowiedniki (`--pct-button-height: var(--pct-button-height-lg)`), zamiast powtarzać reguły wyglądu. Wielkość `md` nie nadpisuje niczego, więc nadpisanie tokenu bazowego w motywie nadal działa (`wym-theme-3`). Wielkość skaluje razem z wysokością rozmiar tekstu i padding poziomy — inaczej większe pole miałoby tekst mniejszego.

  W obudowie wielkość należy do **obudowy**: kontrolka z własnym `size` (np. `pct-select`) oddaje ją polu, tak jak oddaje ramkę (`wym-api-13`). Inaczej dwa `size` w jednym polu dawałyby ramkę jednej wielkości i tekst innej.

  Wariant `bare` (checkbox, grupa radiów) wysokości nie wyrównuje: bez ramki nie ma czego zgrywać z przyciskiem, a wymuszona wysokość dokładałaby tym kontrolkom pustego miejsca. Obszar dotyku pilnuje tam kolumna kontrolki (`wym-api-16`).

- `wym-api-6` Dostępność wbudowana w każdy komponent — ARIA zarządzane wewnętrznie, wykorzystanie CDK a11y (`FocusMonitor`, `LiveAnnouncer`, `FocusTrap`), id generowane util-em (`wym-a11y-1`).

- `wym-api-7` Customizacja przez projekcję treści `<ng-content select="...">` oraz przekazywanie szablonów jako `TemplateRef` / dyrektywa `*pctTemplate` (odpowiednik `pTemplate`) dla elementów typu szablon itemu.

- `wym-api-8` Konfiguracja globalna wzorcem `providePctConfig({...})` z tokenem DI (domyślny `size`, locale, ripple itd.), nadpisywalna per-komponent przez inputy.

- `wym-api-9` Animacje bez zależności `@angular/animations` — realizowane na CSS + Web Animations API (zgodnie z `wym-proj-3`).

## Dostępność (a11y)

- `wym-a11y-1` Komponenty spełniają minimum WCAG 2.2 na poziomie AA, a tam gdzie to możliwe celujemy wyżej.

- `wym-a11y-2` **Obszar dotyku ≥ 24×24 px** (SC 2.5.8) dla każdej kontrolki interaktywnej, spełniony **wprost, a nie przez wyjątek odstępu**. Obszar klikalny jest niezależny od rozmiaru wizualnego — mały wizualnie element (np. pudełko checkboxa 18 px) ma powiększoną, wyśrodkowaną strefę trafienia. Wartość w tokenie `--pct-target-min`.

- `wym-a11y-3` **Automatyczny audyt axe-core** w testach e2e (`apps/sandbox-e2e/src/a11y.spec.ts`) z tagami WCAG 2.0/2.1/2.2 na poziomach A i AA. Audytowane są: cała strona, panel ze scoped theme, formularz w stanie błędu walidacji oraz stany szczególne komponentów. Audyt **uzupełnia** bramkę kontrastu tokenów, nie dubluje jej: bramka bada wartości w palecie, axe — realnie wyrenderowany DOM (role, powiązania ARIA, kontrast po złożeniu warstw).

- `wym-a11y-4` **Bramka a11y ma własny test kontrolny.** Audyt, który zawsze przechodzi (np. po błędnej konfiguracji tagów), jest groźniejszy niż jego brak. Test wstrzykuje oczywiste defekty i wymaga ich wykrycia oraz sprawdza, że liczba uruchomionych reguł jest sensowna.

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

- `wym-token-13` **Blok motywu musi zawierać domknięcie przechodnie nadpisań.** CSS custom properties są podstawiane w **miejscu deklaracji**, nie użycia: token `--a: var(--b)` zadeklarowany w `:root` dziedziczy już rozwiniętą wartość, więc nadpisanie `--b` w zagęszczonym scope go nie zmieni. Dlatego build emituje w bloku motywu (np. `[data-theme="dark"]`) nie tylko nadpisane tokeny semantyczne, ale **wszystkie tokeny, które od nich zależą** — bezpośrednio lub przez łańcuch referencji. Bez tego scoped theme (`wym-theme-4`) działa wyłącznie na warstwie semantycznej, a komponentowa zostaje zamrożona (`wym-real-17`).

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
- `libs/components` — pakiet `@pacit/components` z secondary entrypoints `./core`, `./field`, `./button`, `./checkbox`, `./radio` i `./select` (czysta mapa `exports`).
- `PctButton` — selektor atrybutowy `button[pctButton]`, standalone, OnPush, signals, `booleanAttribute`, stan jako `data-pct-*`, elementy wewnętrzne jako `data-pct-part`, `providePctConfig`.
- `apps/sandbox` — **zoneless** (`provideZonelessChangeDetection`), SSR + hydration, prezentacja Buttona i **scoped theme** (panel `data-theme="dark"` przethemowany samą kaskadą CSS). Rozbity na widoki: powłoka z nawigacją i globalnymi osiami (motyw, skórka, wielkość), widok per komponent i widoki przekrojowe (`wym-sbx-1`).
- `PctField` + `[pctText]` — obudowa pola i pole tekstowe na natywnym `<input>`; etykieta, podpowiedź, błąd i sloty `prefix`/`suffix` należą do obudowy. Zastąpiło wcześniejszy `PctInput`. Kontrolki działają dwutrybowo: w obudowie oddają jej etykietę i komunikaty, poza nią radzą sobie same (`wym-api-14`). Obudowa przyjmuje `size` tak samo jak przycisk — wiersz pola ma wysokość przycisku tej samej wielkości (`wym-api-18`).
- `PctCheckbox` — natywna kontrolka signal forms (`FormCheckboxControl`), stan nieokreślony z `aria-checked="mixed"`, `readonly` blokujące zmianę bez utraty fokusowalności, znacznik rysowany SVG w `currentColor` (bez zależności od zestawu ikon).
- `PctRadioGroup` + `PctRadio` — pierwszy komponent złożony: **kontrolką formularza jest grupa**, opcje nie są samodzielnymi kontrolkami. Grupa ma `role="radiogroup"`, `aria-labelledby`/`aria-orientation`, generuje wspólny `name` dla natywnych radiów.
- `[pctNumber]` — pole liczbowe na natywnym `<input type="text">` z `role="spinbutton"`: wartość `number | null`, formatowanie i parsowanie wg `Intl.NumberFormat` (locale aplikacji), krokowanie strzałkami i PageUp/PageDown, zaokrąglanie i domykanie do granic przy zatwierdzeniu. Granice pobiera z walidatorów `min()`/`max()` schematu (`wym-api-17`).
- `PctSelect` — lista wyboru z własnym panelem (nie natywny `<select>`): wzorzec ARIA „select-only combobox" (`role="combobox"` + `role="listbox"`, fokus zostaje na triggerze, aktywna opcja przez `aria-activedescendant`), własna obsługa klawiatury (strzałki, Home/End, Enter, Escape, typeahead) i **pierwsze użycie CDK Overlay**.
- Testy: `components` 116/116 (Vitest), `sandbox` 7/7, `sandbox-e2e` 94/94 (Playwright, w tym audyt axe-core **każdego widoku** z osobna) — testy jednostkowe biegną pod zoneless. Każdy spec komponentu wchodzi na własny widok, więc jego zakres nie zależy od zawartości sąsiednich przykładów.

Wnioski, które doprecyzowują „przepis":

- `wym-real-1` **Angular nie wspiera nowego NX „TS-solution" (project references).** Workspace musi używać klasycznego layoutu (tsconfig `paths`), nie composite/references.
- `wym-real-2` **Discovery testów Angulara (`@angular/build:unit-test`) globuje z `projectSourceRoot`.** Aby testy w secondary entrypointach (siblingi `src/`) były wykrywane, `sourceRoot` biblioteki ustawiono na root pakietu (`libs/components`).
- `wym-real-3` Target testów aplikacji to `vite:test` (plugin `@nx/vitest`), a biblioteki `test` (`@nx/angular:unit-test`).
- `wym-real-4` Build tokenów jest na razie lekkim własnym transformem (kontrakt DTCG bez zmian); podmiana na Style Dictionary pozostaje opcją bez wpływu na źródła (`wym-token-2`).
- `wym-real-5` _(do zrobienia)_ Raport pokrycia wymaga konfiguracji `coverageInclude` w targecie testowym, by egzekwować próg z `wym-proj-4`.
- `wym-real-6` Pierwotny guard (token-level) przepuścił disabled o realnym kontraście ~1.6:1, bo stan był robiony przez `opacity` (kompozycja z tłem w runtime, niewidoczna dla matematyki na hexach). Stąd `wym-token-11` (policy per motyw/rozmiar, severity) i `wym-token-12` (zakaz `opacity` dla warstw tekstowych). Wdrożone: `libs/tokens/src/contrast.policy.json` + silnik w `build.mjs`; `PctButton` używa tokenów `disabled-*` zamiast `opacity`.
- `wym-real-7` **Zoneless jest deklarowany jawnie** przez `provideZonelessChangeDetection()` w `app.config.ts`, mimo że generator nie dodaje polyfilla `zone.js` (bundle i tak go nie zawiera). Jawna deklaracja zamyka `wym-tech-3` i chroni przed przypadkowym powrotem do trybu zone-based. Testy jednostkowe biblioteki i aplikacji również konfigurują zoneless w `TestBed`, dzięki czemu `wym-api-2` (komponenty zoneless-safe) jest **weryfikowane**, a nie tylko deklarowane. (Uwaga: `setupTestBed()` z `@analogjs/vitest-angular` domyślnie już ustawia `zoneless: true` — jawna konfiguracja w spec-ach jest zabezpieczeniem na wypadek zmiany domyślnych.)
- `wym-real-24` **Kolizja nazw części powtórzyła się przy obudowie.** Gdy `pct-field` opakował grupę radiów, jego część `label` pasowała do 4 elementów (etykieta obudowy + etykiety opcji), a po opakowaniu checkboxa część `control` kolidowała z natywnym inputem checkboxa. To ta sama klasa błędu co `wym-real-15` — reguła `wym-api-12` obowiązuje więc także dla obudowy, nie tylko dla grup.
- `wym-real-25` **Select w obudowie miał obszar dotyku 19,6 px.** Po oddaniu ramki obudowie trigger stracił własny padding, więc jego wysokość spadła do wysokości linii tekstu — poniżej progu SC 2.5.8. Obudowa gwarantuje teraz `min-height: var(--pct-target-min)` na kolumnie kontrolki, co naprawia to dla wszystkich kontrolek naraz. Wychwycił to istniejący test progu dotyku — dowód, że warto było go napisać przy checkboxie.
- `wym-real-22` **Padding ramki obudowy tworzył „martwą strefę"** — kursor był wewnątrz pola, ale kliknięcie nie ustawiało fokusu. Najbardziej widoczne, gdy wyższy element w slocie (przycisk) podnosił wysokość rzędu, a wyśrodkowana kontrolka zostawiała pustą przestrzeń nad i pod sobą. Rozwiązanie dwuczęściowe: kontrolka rozciąga się na wysokość rzędu (`align-self: stretch`), a obudowa przekazuje kontrolce `mousedown` z obszaru, który nie jest elementem interaktywnym (kontrakt zyskał opcjonalne `focus()`). Ramka pokazuje kursor tekstowy, gdy zawiera kontrolkę tekstową. **Poprawka była tylko połowiczna** — patrz `wym-real-27`.
- `wym-real-29` **Wysokość liczona z paddingu nie daje się zgrać między komponentami.** Przycisk i pole miały ten sam token odstępu (`space.3`) i mimo to różniły się o 7 px: przycisk mierzył `padding-y` + wysokość linii etykiety (≈34,8 px), a pole `padding-y` + gwarantowany obszar dotyku kolumny kontrolki (42 px). Wyrównanie przez dobranie paddingów byłoby fałszywe — zależałoby od `line-height`, kroju pisma i zawartości slotów, a każdy nowy komponent zaczynałby od zgadywania. Stąd `wym-api-18`: wysokość jest osobnym tokenem (`--pct-control-height-*`), wspólnym dla obu, a padding pionowy przestaje sterować pionem. Skala `28 / 36 / 44 px` została dobrana tak, by najmniejsza wielkość nadal mieściła próg dotyku SC 2.5.8 z zapasem.

  Dowodem jest pomiar w przeglądarce (`apps/sandbox-e2e/src/size.spec.ts`), a nie sam fakt, że oba komponenty czytają ten sam token: test sprawdza równość wysokości **i** jej konkretną wartość — przy samej równości oba mogłyby spaść do wysokości linii tekstu i nadal „przechodzić".

- `wym-real-27` **Łatanie skutku zamiast przyczyny zostawiło martwą strefę widoczną w kursorze.** `wym-real-22` naprawiło *kliknięcie* w padding ramki (przekazanie `mousedown` kontrolce), ale nie *przynależność* tego obszaru: padding i `gap` zostały na rzędzie, a kolumny były w nim wyśrodkowane, więc **ok. 60% powierzchni ramki nie należało do żadnego elementu wewnętrznego** (kolumna kontrolki 354×24 w rzędzie 380×42). Skutki widać było dopiero na mapie kursora zdjętej z przeglądarki (`elementFromPoint` × `getComputedStyle().cursor` po siatce punktów): pole z listą miało kursor `pointer` wyłącznie nad triggerem, pole wyłączone zapraszało kursorem tekstowym do pisania po całym paddingu, a pas wokół przycisku w slocie wyglądał na jego część, choć klik w niego trafiał w pole. Naprawa strukturalna: padding schodzi z rzędu do kolumn, kolumny kafelkują wnętrze ramki szczelnie (pusty slot dekoracji **nie znika**, tylko zwija się do paddingu krawędzi), interaktywna dekoracja dostaje całą wysokość swojego slotu, a rodzaj kursora zgłasza kontrolka przez `fieldCursor` — bez tego `field.scss` musiałby znać klasy wszystkich kontrolek (`:has(input.pct-text)`) i każda nowa startowałaby z tym samym błędem. Doszło też `activate()` w kontrakcie: kursor `pointer` nad całą ramką selecta obiecuje otwarcie listy, więc klik w padding musi ją otwierać, a nie tylko przenosić fokus.

  Lekcja metodyczna: **„czy da się kliknąć" i „czy widać, że da się kliknąć" to dwa różne wymagania** — pierwsze testowała para testów e2e i przechodziły, drugie wyszło dopiero z pomiaru całej powierzchni. Wzorzec „mapa kursora po siatce punktów" wychwytuje tę klasę wad tanio i warto go powtarzać przy każdym komponencie o złożonej powierzchni.

- `wym-real-28` **jsdom (nwsapi) nie parsuje `:has()` z kombinatorem względnym** — `:has(+ .selektor)` wywala `SyntaxError: not a valid selector` przy **dowolnym** późniejszym `querySelectorAll` w teście, więc awaria pojawia się w miejscu niezwiązanym z przyczyną. Wersja z prostym `:has(button, a, [tabindex])` działa. Niezależnie od narzędzia lepszym rozwiązaniem okazał się układ bez patrzenia „w przód": odstęp niesie slot dekoracji (padding krawędzi na zewnątrz, `gap` od strony kontrolki), a pusty slot zwija się do samego paddingu krawędzi — dzięki temu kolumny kafelkują ramkę bez żadnej reguły warunkowej.

- `wym-real-33` **Widok przekrojowy stanów wykrył niedozwolony atrybut ARIA w pierwszym uruchomieniu.** `PctRadio` wystawiał `aria-readonly` na natywnym `<input type="radio">`, a rola `radio` tego atrybutu **nie wspiera** — wspiera go dopiero `radiogroup`. Axe klasyfikuje to jako naruszenie **krytyczne** (`aria-allowed-attr`), a mimo to wada przeżyła kilka rund audytów: żaden dotychczasowy przykład nie renderował grupy radiów w stanie „tylko do odczytu". Atrybut przeniesiony na kontener, testy jednostkowe sprawdzają teraz oba miejsca (jest na grupie, nie ma na opcji).

  Lekcja: **macierz „każdy komponent × każdy stan" nie jest ozdobnikiem sandboxa, tylko wejściem dla bramki a11y.** Audyt bada wyłącznie to, co ktoś wcześniej wyrenderował — luka w prezentacji jest luką w pokryciu, niewidoczną w raporcie, bo raport jest zielony.

- `wym-real-32` **Krok pola liczbowego liczony z tekstu w DOM gubił naciśnięcia.** `stepBy` brał punkt wyjścia z `input.value`, a tekst zapisuje **efekt**, czyli asynchronicznie: dwa naciśnięcia strzałki w jednym przebiegu detekcji widziały tę samą wartość wyjściową i drugie nie miało skutku. Objawiało się jako migotanie testu e2e (raz na kilka przebiegów), bo zależało od tego, czy między zdarzeniami zmieścił się flush — człowiek trzymający strzałkę trafia w to samo okno. Punktem wyjścia jest teraz **sygnał**, a tekst tylko wtedy, gdy użytkownik faktycznie pisze (`typing()`); wpisana, niezatwierdzona wartość nadal jest respektowana.

  Lekcja: **DOM nie jest źródłem prawdy w komponencie sterowanym sygnałami** — odczyt z niego zawsze może być o jeden przebieg do tyłu. Test regresyjny celowo nie stabilizuje fixture między zdarzeniami; z `await` po każdym z nich wada jest niewidoczna, co tłumaczy, dlaczego istniejący test klawiatury ją przepuszczał.

- `wym-real-31` **Generator id był niebezpieczny przy SSR i nikt tego nie widział.** `nextPctId` liczył w zmiennej modułowej, a serwer renderuje wiele żądań w jednym procesie: licznik rósł z każdym renderem, klient zawsze startował od zera. Pierwsze żądanie po starcie serwera trafiało w zgodność (stąd zielone testy), każde kolejne dawało HTML z innymi id niż policzy klient — po hydracji część atrybutów zostawała z wartościami serwera, część dostawała wartości klienta i **powiązania ARIA wskazywały w próżnię** (`aria-labelledby="pct-field-4071-label"` przy etykiecie `pct-field-12-label`). Wada ujawniła się dopiero, gdy sandbox dostał drugą trasę i ruch na serwerze dev wzrósł. Licznik mieszka teraz w usłudze `providedIn: 'root'` — injector aplikacji żyje tyle, co jedno żądanie na serwerze i jedno wczytanie strony u klienta, więc obie strony liczą od zera.

  Lekcja: **stan modułowy jest wspólny dla wszystkich renderów SSR.** Każdy licznik, cache czy rejestr w bibliotece z `wym-tech-4` musi trafić do DI albo być bezstanowy — inaczej wada pojawia się dopiero „u kogoś na produkcji", po drugim żądaniu.

- `wym-real-30` **Test może kliknąć w HTML z serwera, zanim hydracja go przejmie.** Po rozbiciu sandboxa na leniwie ładowane widoki testy e2e zaczęły migotać: `fill()` wpisywał wartość, po czym pole wracało do stanu początkowego — objaw wyglądał jak wada `PctNumber`, a był wyścigiem. `goto()` kończy się na zdarzeniu `load`, a między „element jest w DOM" a „element jest podłączony" mieści się pobranie chunka trasy. Powłoka wystawia więc znacznik `data-sbx-ready` po `ApplicationRef.whenStable()`, a testy wchodzą przez pomocnik `visit()`, który na niego czeka. Bariera jest po stronie testu, nie aplikacji — aplikacja niczego nie opóźnia.

- `wym-real-23` Przy weryfikacji tej poprawki **błąd był w teście, nie w kodzie**: `page.mouse.click()` w Playwright używa współrzędnych widoku i nie przewija strony, więc klik w element poniżej ekranu trafiał w `<html>`. Locator-owe `click()` przewija samo. Przy klikaniu we współrzędne trzeba najpierw `scrollIntoViewIfNeeded()`.
- `wym-real-21` Ta sama logika komunikatów (`errorText`, `showInvalid`, `showError`, `describedBy`, `hintId`, `errorId`, `touch`) była **skopiowana do 4 kontrolek**. Poprawka wymagała czterech identycznych zmian — stąd wydzielenie do `core` (`wym-api-13`).
- `wym-real-20` **Na natywnym elemencie klasyczne formularze prowadzą przez wbudowany `DefaultValueAccessor`.** `[formControl]` na `<input pctText>` jest obsługiwany przez akcesor Angulara, który sam pisze do DOM. Nasze równoległe wiązanie wartości powodowało konflikt dwóch autorów (input startował pusty zamiast z wartością kontrolki). Kontrolka wykrywa więc `NgControl` na tym samym elemencie i wtedy oddaje własność wartości, pozostając przy obudowie i stanie.
- `wym-real-26` **`FormField` sam dostarcza `NgControl`, więc heurystyka z `wym-real-20` była za szeroka.** Dyrektywa signal forms rejestruje interop-owy `NgControl` dla zgodności ze starymi `ControlValueAccessor`ami. Warunek „jest `NgControl` ⇒ ktoś inny pisze do DOM" obejmował więc także signal forms — a te przy **własnej kontrolce** (`FormValueControl`) ustawiają wyłącznie jej `value` i do DOM nie piszą (robią to tylko dla elementów bez własnej kontrolki). Efekt: `<input pctText [formField]="f.email">` z niepustą wartością początkową renderował **puste pole**. Wada przetrwała, bo wszystkie testy i sandbox startowały z pustym modelem. Warunek rozróżnia teraz oba przypadki (`NgControl` bez `FormField`), a regresję pilnują testy startujące z niepustą wartością — w `PctText` i `PctNumber`.
- `wym-real-17` **Scoped theme był zepsuty na warstwie komponentowej i nikt tego nie widział.** Sonda w przeglądarce wykazała, że w panelu `[data-theme="dark"]` token semantyczny `--pct-surface` miał poprawną wartość ciemną, ale `--pct-button-bg` i `--pct-select-panel-bg` nadal zwracały wartości jasne. Przyczyna w `wym-token-13`. Wada przetrwała tak długo, bo wcześniejszy test scoped theme sprawdzał **tylko token semantyczny**, a różnica między `blue-600` i `blue-500` jest wizualnie subtelna. Poprawione w buildzie; dodany test regresyjny porównujący token komponentowy w `:root` i w scope.
- `wym-real-18` Panel nakładki CDK renderuje się **poza drzewem hosta**, co ma dwie konsekwencje: (1) selektory `:host(...)` nie obejmują jego treści — stany opcji trzeba oznaczać atrybutami na samych opcjach; (2) kaskada scoped theme do niego nie dociera — motyw z najbliższego przodka hosta jest przenoszony jawnie na panel (`data-theme`). Tokeny działają, bo są zdefiniowane na `:root` — zaleta podejścia CSS-first (`wym-token-1`).
- `wym-real-19` `CSS.escape` nie istnieje w jsdom, więc budowanie selektorów po id wywala testy jednostkowe. Aktywną opcję znajdujemy indeksem w kolekcji, co dodatkowo wprost odpowiada semantyce `activeIndex`.
- `wym-real-15` Kolizja nazw części wyszła dopiero w teście e2e: selektor `[data-pct-part="label"]` w obrębie `pct-radio-group` pasował do 4 elementów (etykieta grupy + etykiety opcji). Stąd `wym-api-12`. Testy jednostkowe tego nie wychwyciły, bo odpytywały konkretny element, a nie kolekcję.
- `wym-real-16` W grupie opcje są **treścią rzutowaną**, więc kontener nie widzi ich zapytaniem `viewChildren`; `contentChildren(PctRadio)` tworzyłoby cykliczny import kontener↔element. `focus()` grupy odpytuje więc DOM hosta (`input[type="radio"]`).
- `wym-real-14` **Zgodność formalna nie znaczy dobra jakość.** Pierwszy audyt axe nie wykazał naruszeń, a reguła `target-size` **przeszła** przy obszarze klikalnym checkboxa 18×18 px — bo SC 2.5.8 dopuszcza wyjątek odstępu, a wokół kontrolki było dużo wolnego miejsca. Wystarczyłoby zagęścić układ w aplikacji konsumenta, żeby to samo przestało być zgodne. Stąd `wym-a11y-2`: obszar dotyku spełniamy wprost, niezależnie od otoczenia.
- `wym-real-12` **Kontrolki kontraktu `FormCheckboxControl` wymagają `checked`, nie `value`** (definiowanie `value` jest zabronione). Ponieważ `model()` nie przyjmuje transformacji `booleanAttribute`, `checked` trzeba wiązać nawiasami (`[checked]="true"`), a nie gołym atrybutem — inaczej szablon nie kompiluje się (`Type 'string' is not assignable to type 'boolean'`). Kontrakt przewiduje też opcjonalne metody `focus()` i `reset()`; zaimplementowane w `PctCheckbox` i `PctInput`.
- `wym-real-13` Odczyty `getComputedStyle` z panelu podglądu potrafią być **nieaktualne**, gdy panel nie jest wyświetlany („the page is not compositing frames") — prowadzi to do fałszywych diagnoz błędów CSS. Wiarygodną weryfikacją stylów są testy e2e (Playwright), które działają w normalnie renderującej przeglądarce.
- `wym-real-11` **MCP Angular CLI (`.mcp.json`) dostarcza wskazówki dopasowane do wersji.** Ogólny plik `best-practices.md` pobrany ze strony nie zawierał reguły „nie ustawiaj jawnie `OnPush` — jest domyślne w v22+", którą zwraca `get_best_practices` przez MCP. Stąd korekta `wym-api-2`. Uwaga: `list_projects` zwraca pustą listę, bo czyta `angular.json`, a workspace jest oparty na Nx (`project.json`) — narzędzia wymagające kontekstu workspace nie działają, ale `search_documentation` i `get_best_practices` tak.
- `wym-real-9` **CVA okazało się zbędne.** Zakładaliśmy, że kompatybilność z reactive/template-driven forms wymaga `ControlValueAccessor` (i rozważaliśmy osobną dyrektywę-adapter). Eksperyment na `PctInput` (kontrolka implementująca wyłącznie `FormValueControl`) wykazał, że `[formControl]` i `[(ngModel)]` synchronizują wartość w obie strony bez żadnego kodu kompatybilności — zgodnie z dokumentacją Angulara. Rdzeń biblioteki nie importuje klasycznego API formularzy. Zachowanie jest zabezpieczone testami regresyjnymi w `input.spec.ts`.
- `wym-real-10` Bramka kontrastu obejmuje teraz także **pary nietekstowe wg SC 1.4.11** (`level: "UI"`, próg 3:1) — obramowanie inputu, obramowanie focus/błędu, focus ring. To wychwytuje typową wadę bibliotek UI: zbyt jasne obramowania pól. Tokeny komponentowe są auto-odkrywane (`component.*.json`), więc dodanie komponentu nie wymaga zmian w `build.mjs`.
- `wym-real-8` **Pakiet `zone.js` został całkowicie usunięty z zależności.** Jest opcjonalnym peer-dependency (`peerDependenciesMeta.zone.js.optional: true`) zarówno w `@angular/core`, jak i `@analogjs/vitest-angular`, a runner testów Angulara przy nieudanym `resolve('zone.js')` przechodzi w tryb bez zone (`catch → 'none'`). Zweryfikowane empirycznie po odinstalowaniu: testy 6/6 i 2/2, e2e 4/4, build biblioteki i aplikacji (SSR + prerender) — wszystko zielone; w runtime brak `window.Zone`, `__zone_symbol__` i niepatchowany `Promise`. Dzięki temu powrót do trybu zone-based jest niemożliwy przez przypadek.
