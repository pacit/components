# Biblioteka komponentów angular

Biblioteka komponentów angular pozwalająca na budowanie skomplikowanych, skalowalnych widoków aplikacji.

## Jak czytać ten dokument

Wymagania (`wym-*`) opisują **cel**, nie stan kodu — i przez to łatwo je przeczytać jako opis tego,
co już działa. Żeby to rozdzielić, wymaganie, którego jeszcze nie spełniamy, ma adnotację przy samej
treści:

- _(niezrealizowane)_ — nic z tego jeszcze nie powstało,
- _(częściowo)_ — działa część; adnotacja mówi, która nie.

Brak adnotacji znaczy „zrealizowane". Zbiorcze zestawienie z uzasadnieniem kolejności jest
w sekcji **Czego jeszcze nie ma**, a wnioski wyciągnięte po drodze — w **Stanie realizacji**
(`wym-real-*`).

## Wymagania projektowe

- `wym-proj-1` Całość powstaje jako NX workspace (monorepo).

- `wym-proj-2` Na obecnym etapie (przed pierwszym publicznym wydaniem) używane są najnowsze dostępne w chwili tworzenia wersje bibliotek i frameworków. Dopiero po wydaniu pierwszej wersji publicznej rozpoczniemy prowadzenie macierzy kompatybilności (które wersje Angulara są wspierane).

- `wym-proj-3` Biblioteka ma możliwie najmniej zależności runtime od innych bibliotek TS/JS. Dopuszczone zależności runtime:
  - `@angular/cdk` — używany (CDK Overlay w `PctSelect`); zadeklarowany jako `peerDependency` pakietu. Konsument musi dołączyć `@angular/cdk/overlay-prebuilt.css`.

- `wym-proj-4` _(częściowo)_ Kod biblioteki jest możliwie pełnie pokryty testami. Spełnia minimum SonarQube, czyli >=80% pokrycia linii kodu.

  Testy są (`components` + `sandbox` + e2e), ale **próg nie jest egzekwowany**: żaden target nie zbiera pokrycia biblioteki ani nie faila poniżej 80% (`wym-real-5`). Do czasu konfiguracji `coverageInclude` liczba „80%" jest deklaracją, nie bramką.

- `wym-proj-5` _(częściowo)_ W ramach workspace powstaje:
  - biblioteka komponentów,
  - aplikacja angular z dokumentacją i prezentacją biblioteki — możliwa do publikacji w internecie jako strona biblioteki, **_(niezrealizowane — `apps/docs` nie istnieje)_**
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

- `wym-ws-1` _(częściowo)_ Layout NX monorepo:
  - `apps/` — `docs` (aplikacja dokumentacji, publikowalna) **_(niezrealizowane)_**, `sandbox` (playground, baza dla e2e), `sandbox-e2e` (Playwright),
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

  **Dopasowanie dekoracji do slotu zgłasza autor pola**, nie arkusz obudowy po zawartości slotu (`pctPrefix` / `pctSuffix` przyjmują `inset` albo `fill`). `inset` (domyślne) leży **na powierzchni pola**: jest wpisane w padding ramki, dziedziczy jej kursor, a klik w nie fokusuje kontrolkę. `fill` bierze **cały** slot — od krawędzi ramki po odstęp kontrolki, na pełną wysokość — i jest **własną powierzchnią**: ma własne tło, własny kursor i sam przyjmuje kliknięcie, więc obudowa do niego nie sięga. Odstęp od kontrolki przechodzi wtedy na kolumnę kontrolki, żeby nadal miał właściciela, a dekoracja `fill` bierze wysokość ze slotu (`min-height: 0`), żeby przycisk nie rozpychał wiersza ponad wysokość pola tej samej wielkości (`wym-real-34`).

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

- `wym-api-19` **Nakładka wychodzi z widocznej krawędzi kontrolki, nie z elementu, który ją otwiera.** W obudowie ramkę rysuje `pct-field`, a trigger stoi w kolumnie odsuniętej od niej o padding i sloty dekoracji — panel oparty o trigger jest więc węższy od pola i przesunięty względem niego. Obudowa udostępnia kontrolkom swój wiersz jako **powierzchnię odniesienia** (`PctFieldApi.surface`), a kontrolka kotwiczy w nim panel; bez obudowy kotwicą jest sam trigger, który jest wtedy własną ramką (`wym-real-35`).

  Szerokość panelu jest osią API, a nie stałą: `panelWidth="field"` (domyślnie) zrównuje panel z kontrolką, `"auto"` dopasowuje go do najdłuższej opcji, nie zwężając poniżej kontrolki, a długość CSS ustawia go wprost. Gdy panel nie ma szerokości kontrolki, o krawędź, do której przylega, pyta `panelAlign` (`start` / `center` / `end`); panel wychodzący poza okno jest wsuwany z powrotem (`push` strategii CDK), bo przycięte opcje są nie do odczytania.

  **Panel nie dziedziczy niczego po hoście** — renderuje się poza jego drzewem (`wym-real-18`). Poza motywem dotyczy to również pisma: krój należy do aplikacji, a wielkość do kontekstu kontrolki (`pct-field[size]` albo własny `size`), więc jedno i drugie kontrolka odczytuje z triggera przy otwarciu i przenosi na panel. Inaczej lista pisze domyślną czcionką przeglądarki, a w polu `lg` — tekstem wielkości `md`.

- `wym-api-6` _(częściowo)_ Dostępność wbudowana w każdy komponent — ARIA zarządzane wewnętrznie, wykorzystanie CDK a11y (`FocusMonitor`, `LiveAnnouncer`, `FocusTrap`), id generowane util-em (`wym-a11y-1`).

  ARIA i generowanie id działają (`nextPctId` w `core`, `wym-real-31`). **Z CDK a11y nie korzysta jeszcze nic** — dotychczasowe komponenty go nie potrzebowały: fokus w selekcie zostaje na triggerze (`wym-real-18`), więc nie ma czego pułapkować, a żaden komponent nie ogłasza jeszcze zmian asynchronicznie. Wiąże dopiero przy dialogu, drawerze i toaście.

- `wym-api-7` _(niezrealizowane)_ Customizacja przez projekcję treści `<ng-content select="...">` oraz przekazywanie szablonów jako `TemplateRef` / dyrektywa `*pctTemplate` (odpowiednik `pTemplate`) dla elementów typu szablon itemu.

  Projekcja treści działa (sloty obudowy pola). **Szablonów nie ma wcale** — `TemplateRef` nie pada nigdzie w bibliotece, więc opcji selecta nie da się dziś ostylować własnym szablonem. To pierwszy brak, w który uderza realne użycie selecta.

- `wym-api-8` _(częściowo)_ Konfiguracja globalna wzorcem `providePctConfig({...})` z tokenem DI (domyślny `size`, locale, ripple itd.), nadpisywalna per-komponent przez inputy.

  Mechanizm działa, ale `PctConfig` ma **jedno pole** (`defaultSize`) — locale ani ripple jeszcze w nim nie ma. Kształt konfiguracji warto domknąć, zanim zacznie ją czytać kilkanaście komponentów; kandydatem jest też kanał na teksty komponentów (patrz **Czego jeszcze nie ma → braki w samych wymaganiach**).

- `wym-api-9` _(niezrealizowane)_ Animacje bez zależności `@angular/animations` — realizowane na CSS + Web Animations API (zgodnie z `wym-proj-3`).

  Zakaz jest dotrzymany (`@angular/animations` nie jest zależnością), ale to na razie jedyne, co z tego wymagania obowiązuje: **z WAAPI nie korzysta nic**, a jedyne przejścia to `transition` w arkuszach. Reguła zostanie sprawdzona dopiero przy pierwszym komponencie z wejściem/wyjściem (panel, dialog, toast) — wtedy trzeba też ustalić, jak animacje respektują `prefers-reduced-motion` systemowo, a nie per komponent.

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

- `wym-theme-5` _(częściowo)_ **Skórka jest w pełni parametryzowana** — autor motywu definiuje wszystkie kolory (wszystkich stanów). Komponenty nie mają wbudowanych kolorów ani nie przyciemniają stanów przez `opacity` (`wym-token-12`); korzystają wyłącznie z tokenów. Budowanie skórki uruchamia bramkę kontrastu (`wym-token-11`), która daje autorowi konkretny raport błędów i ostrzeżeń.

  Parametryzacja jest pełna i bramka działa — ale **wyłącznie dla skórki wbudowanej**. Nie ma ścieżki, którą ktoś z zewnątrz zbudowałby własną: `build.mjs` czyta sztywny zestaw plików z `libs/tokens/src`, a pakiet `@pacit/tokens` jest `private`. Sandbox ma już oś skórki z jedną pozycją (`base`) czekającą na tę ścieżkę.

## Architektura design tokens

Zasada nadrzędna: **CSS-first, zero-runtime**. Motyw w runtime to wyłącznie kaskadowy CSS (custom properties) — bez silnika JS generującego style. Dzięki temu jest SSR-safe (brak FOUC i rozjazdów hydration, zgodnie z `wym-tech-4`), ma zerowy koszt w runtime i pozwala nadpisywać style zwykłym CSS-em.

- `wym-token-1` **Źródło prawdy: format DTCG** (W3C Design Tokens Community Group, JSON z `$type`/`$value` i referencjami `{...}`). Format jest przenośny — może być czytany/zapisywany przez narzędzia projektowe (np. Figma / Tokens Studio).

- `wym-token-2` _(częściowo)_ **Build-time generuje artefakty** ze źródła DTCG (narzędziem typu Style Dictionary):
  - CSS z custom properties (dystrybuowane motywy),
  - mapy/funkcje SCSS do użytku wewnętrznego biblioteki,
  - typy/const TS z nazwami tokenów (bezpieczeństwo typów, brak cichych literówek).

  TS jest **generowany** ze źródła DTCG, nie pisany ręcznie.

  Wszystkie trzy artefakty powstają, ale `tokens.ts` **nie jest przez nikogo importowany** i nie jedzie w pakiecie (`@pacit/tokens` jest `private`). Cel z tego punktu — brak cichych literówek w nazwach tokenów — nie jest więc dziś osiągany: nazwy w arkuszach nadal są zwykłymi łańcuchami znaków, których nikt nie sprawdza. Bramka `nx check-package components` łapie to dopiero na poziomie pakietu (użyty token bez deklaracji), czyli po fakcie i tylko dla biblioteki, nie dla konsumenta.

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

- `wym-token-11` **Bramka kontrastu jako policy skórki.** Definicja skórki zawiera policy — listę par `fg`/`bg` (rola × stan, np. `button/solid`, `button/disabled`) z poziomem WCAG i `severity`. Podczas budowania skórki bramka, dla każdego motywu (light/dark; **skórka użytkownika — _niezrealizowane_**, patrz `wym-theme-5`):
  - liczy kontrast i porównuje go z **domyślnymi progami WCAG 2.2** dla tekstu normalnego (AA 4.5:1), dużego (AA 3:1) oraz elementów UI (SC 1.4.11, 3:1),
  - `severity: error` blokuje build; `severity: warn` tylko ostrzega (np. `disabled`, zwolniony z SC 1.4.3),
  - zwraca konkretny komunikat, który wariant rozmiaru przechodzi, a który nie (np. „czytelny dla dużego tekstu, ale nie dla normalnego").

- `wym-token-12` **Stany komponentów nie używają `opacity`** do przyciemniania tekstu — każdy stan (hover, active, disabled, …) ma własne, konkretne tokeny koloru. `opacity` zmienia kontrast w runtime w sposób niewidoczny dla bramki (kompozycja z tłem), więc jest zakazana dla warstw tekstowych.

- `wym-token-7` _(częściowo)_ **Kontrakt part-names jako publiczne API stylowania** — elementy wewnętrzne komponentów mają stabilne, udokumentowane atrybuty `data-pct-part="..."`. Umożliwiają celowanie w elementy wewnętrzne (np. `[data-pct-part="icon"]`) w sposób odporny na aktualizacje. Kontrakt jest wersjonowany.

  Atrybuty są wystawiane i mają regułę jednoznaczności (`wym-api-12`), ale **nie są ani spisane, ani wersjonowane**: nie ma listy części per komponent, więc konsument poznaje je z czytania szablonów, a biblioteka nie ma czym odróżnić zmiany łamiącej od kosmetycznej. To wymaganie domyka się razem z `apps/docs` — spis części jest treścią dokumentacji, nie osobnym plikiem.

- `wym-token-8` _(niezrealizowane)_ **Oś gęstości (density)** — osobny wymiar tokenów (np. `comfortable` / `compact`) przełączany atrybutem/scope, niezależny od motywu kolorystycznego.

  W źródłach DTCG nie ma ani jednego tokenu gęstości. Oś wielkości (`wym-api-18`) jest gotowym wzorcem do powtórzenia — ale uwaga: gęstość zejdzie poniżej progu obszaru dotyku szybciej niż wielkość `sm`, więc razem z nią trzeba przetestować `--pct-target-min` (dokładnie ten warunek, dla którego kolumna kontrolki ma osobną wysokość minimalną — `wym-api-16`).

- `wym-token-9` _(częściowo)_ **Tryb ciemny i scoped theme przez CSS** — schematy kolorów (light/dark) i motywy lokalne realizowane atrybutem/klasą na poddrzewie (np. `[data-theme="dark"]`, `.pct-theme-x`), bez silnika JS. Zapewniona dyrektywa-cukier `[pctTheme]`, ale mechanizm bazowy to sama kaskada.

  Mechanizm bazowy działa i jest przetestowany (`wym-real-17`). **Dyrektywy `[pctTheme]` nie ma** — motyw ustawia się dziś ręcznym `data-theme`. Brakuje też automatycznego trybu ciemnego: skórka nie emituje `@media (prefers-color-scheme: dark)`, więc bez jawnego atrybutu strona zostaje jasna niezależnie od ustawień systemu.

- `wym-token-10` **Motywy dystrybuowane jako zwykłe pliki CSS** (np. `@pacit/components/themes/...`), importowane bez konfiguracji JS.

## Ikony

- `wym-ikon-1` Na obecnym etapie biblioteka nie dostarcza własnego zestawu ikon.

- `wym-ikon-2` _(niezrealizowane — mechanizm do doprecyzowania)_ Biblioteka umożliwia łatwe użycie ikon z popularnych zestawów (FontAwesome, PrimeIcons, Material) oraz dostarczenie przez użytkownika własnych ikon (SVG / fonty ikon).

  Dziś każda ikona jest **wpisana w szablon** jako SVG w `currentColor` (znacznik checkboxa, strzałka selecta). Działa to i nie wnosi zależności, ale nie jest mechanizmem: konsument nie ma jak podmienić strzałki selecta na ikonę ze swojego zestawu, a każdy nowy komponent dokłada kolejny wpisany SVG. Decyzja wiąże z `wym-api-7` — najprostszym mechanizmem podmiany jest szablon, którego jeszcze nie ma.

## Testy

- `wym-test-1` Testy jednostkowe: Vitest.

- `wym-test-2` _(częściowo)_ Testy e2e: Playwright (na późniejszym etapie prawdopodobnie także testy wizualne / screenshot).

  Playwright działa (105 testów, w tym audyt axe każdego widoku). **Testów wizualnych nie ma** — a metodyka projektu opiera się na pomiarze w przeglądarce (mapa kursora z `wym-real-27`, pomiar wysokości z `wym-real-29`), więc screenshot diff jest jej naturalnym przedłużeniem, nie nowym pomysłem. Widok `/all` jest utrzymywany właśnie pod to (`wym-sbx-1`).

## Wersjonowanie

- `wym-wer-1` _(niezrealizowane — do doprecyzowania na późniejszym etapie)_ Wersjonowanie zgodne z SemVer, z kanałami przedwydawniczymi (`beta`, `rc`).

  `nx release` jest skonfigurowany (`nx.json` → `release.projects: ["components"]`), ale **nikt go jeszcze nie uruchamia**: nie ma CHANGELOG-a, workflow publikującego ani provenance. Wersja jest przy tym wpisana w **dwóch** miejscach — `libs/components/package.json` i stała `PCT_VERSION` w `src/index.ts` — i przy pierwszym wydaniu się rozjedzie, bo `nx release` podbija tylko manifest. Stała powinna być generowana.

## Czego jeszcze nie ma

Zestawienie wszystkich adnotacji z tego dokumentu w jednym miejscu. Kolumna „wiąże przy" mówi,
co wymusi domknięcie danego punktu — bo o kolejności nie decyduje numer wymagania, tylko to,
który brak zaczyna blokować następną pracę.

| Wymaganie                     | Czego brakuje                                                | Wiąże przy                                                           |
| ----------------------------- | ------------------------------------------------------------ | -------------------------------------------------------------------- |
| `wym-proj-5`, `wym-ws-1`      | `apps/docs` — aplikacja dokumentacji                         | pierwszym zewnętrznym użytkowniku; bez niej nie ma adopcji           |
| `wym-proj-4`                  | egzekwowanie progu 80% pokrycia (`wym-real-5`)               | zawsze — im później, tym większy dług do nadrobienia                 |
| `wym-api-7`                   | `TemplateRef` / `*pctTemplate`                               | pierwszym realnym użyciu selecta (szablon opcji) i przy `wym-ikon-2` |
| `wym-api-8`                   | pola konfiguracji poza `defaultSize`                         | zanim `PctConfig` zacznie czytać kilkanaście komponentów             |
| `wym-api-6`                   | użycie CDK a11y (`FocusTrap`, `LiveAnnouncer`)               | dialogu, drawerze, toaście                                           |
| `wym-api-9`                   | animacje na WAAPI + systemowe `prefers-reduced-motion`       | pierwszym komponencie z wejściem/wyjściem                            |
| `wym-token-2`                 | użycie generowanego `tokens.ts` (dziś nikt go nie importuje) | gdy literówka w nazwie tokenu przejdzie do wydania                   |
| `wym-token-7`                 | spisanie i wersjonowanie kontraktu `data-pct-part`           | razem z `apps/docs`                                                  |
| `wym-token-8`                 | oś gęstości                                                  | po ustabilizowaniu osi wielkości; wymaga retestu obszaru dotyku      |
| `wym-token-9`                 | dyrektywa `[pctTheme]`, `prefers-color-scheme`               | przy pierwszej integracji, gdzie motyw idzie za systemem             |
| `wym-theme-5`, `wym-token-11` | ścieżka budowania skórki przez osobę z zewnątrz              | gdy ktoś zechce własny motyw                                         |
| `wym-ikon-2`                  | mechanizm ikon (dziś SVG wpisane w szablony)                 | drugim komponencie potrzebującym podmienialnej ikony                 |
| `wym-test-2`                  | testy wizualne / screenshot                                  | przy komponencie, którego nie da się opisać asercją na DOM           |
| `wym-wer-1`                   | automatyzacja wydania, jedno źródło wersji                   | przed pierwszą publikacją na npm                                     |

### Braki w samych wymaganiach

Rzeczy, których w tym dokumencie **nie ma, a powinny być** — czyli nie „niezrealizowane wymaganie",
tylko brakujące ustalenie. Wypisane, żeby nie wyglądały na przeoczenie:

- **Teksty komponentów i i18n.** Dokument nie mówi nic o tym, skąd komponent bierze napisy. Skutek już
  jest w kodzie: `placeholder` selecta domyśla się na `'Wybierz…'`, pusta lista pisze `'Brak opcji'`,
  a `[pctNumber]` ostrzega w konsoli po polsku. Biblioteka o zasięgu międzynarodowym potrzebuje
  neutralnych wartości domyślnych i kanału tłumaczeń (kandydat: `providePctConfig`, `wym-api-8`).
  **To zmiana łamiąca publiczne API** — dziś kosztuje nic, po pierwszym wydaniu kosztuje major.
- **Typ wartości kontrolek.** Nie ustalono, czy kontrolki wiążą wyłącznie `string`, czy dowolne `T`.
  Dziś `PctSelect` i `PctRadioGroup` są zapięte na `string`, a realne formularze wiążą obiekty,
  identyfikatory liczbowe i enumy. Potrzebne ustalenie o generykach i `compareWith`. Ta sama uwaga
  o koszcie w czasie co wyżej.
- **`forced-colors` (Windows High Contrast).** `wym-a11y-1` mówi o WCAG AA, ale nie o trybie wysokiego
  kontrastu systemu — a to osobny mechanizm, w którym kolory z tokenów są ignorowane przez system
  i liczy się tylko to, czy komponent nie zniknie. W bibliotece nie ma dziś ani jednej reguły
  `@media (forced-colors: active)`.
- **RTL.** Arkusze konsekwentnie używają właściwości logicznych (`padding-inline-*`), czyli intencja
  jest, ale nigdzie nie zapisana jako wymaganie i **nigdzie nie sprawdzana** — nie ma widoku ani testu
  z `dir="rtl"`.
- **Regresja hydracji.** `wym-tech-4` wymaga poprawnego SSR, ale nic nie sprawdza, czy hydracja nie
  zgłasza błędów (NG0500/NG0501). `wym-real-31` pokazał, jak cicho taka wada żyje; tani test to
  przechwycenie konsoli w e2e.

## Stan realizacji — komponent referencyjny (walking skeleton)

Zbudowano pionowy plaster end-to-end weryfikujący powyższe ustalenia. Stack: **Angular 22, TypeScript 6, NX 23, Vitest 4, Playwright**.

Powstało:

- `libs/tokens` — źródło DTCG + build (`build.mjs`) generujący `pct.css` / `_tokens.scss` / `tokens.ts`, z **bramką kontrastu WCAG 2.2 AA** (build faila, gdy para tekst/tło < 4.5:1).
- `libs/components` — pakiet `@pacit/components` z secondary entrypoints `./core`, `./field`, `./button`, `./checkbox`, `./radio` i `./select` (czysta mapa `exports`). Skórka jedzie w pakiecie jako `./themes/pct.css` (`wym-token-10`, `wym-ws-4`) — domyka to `wym-real-36`.
- `PctButton` — selektor atrybutowy `button[pctButton]`, standalone, OnPush, signals, `booleanAttribute`, stan jako `data-pct-*`, elementy wewnętrzne jako `data-pct-part`, `providePctConfig`.
- `apps/sandbox` — **zoneless** (`provideZonelessChangeDetection`), SSR + hydration, prezentacja Buttona i **scoped theme** (panel `data-theme="dark"` przethemowany samą kaskadą CSS). Rozbity na widoki: powłoka z nawigacją i globalnymi osiami (motyw, skórka, wielkość), widok per komponent i widoki przekrojowe (`wym-sbx-1`).
- `PctField` + `[pctText]` — obudowa pola i pole tekstowe na natywnym `<input>`; etykieta, podpowiedź, błąd i sloty `prefix`/`suffix` należą do obudowy. Zastąpiło wcześniejszy `PctInput`. Kontrolki działają dwutrybowo: w obudowie oddają jej etykietę i komunikaty, poza nią radzą sobie same (`wym-api-14`). Obudowa przyjmuje `size` tak samo jak przycisk — wiersz pola ma wysokość przycisku tej samej wielkości (`wym-api-18`).
- `PctCheckbox` — natywna kontrolka signal forms (`FormCheckboxControl`), stan nieokreślony z `aria-checked="mixed"`, `readonly` blokujące zmianę bez utraty fokusowalności, znacznik rysowany SVG w `currentColor` (bez zależności od zestawu ikon).
- `PctRadioGroup` + `PctRadio` — pierwszy komponent złożony: **kontrolką formularza jest grupa**, opcje nie są samodzielnymi kontrolkami. Grupa ma `role="radiogroup"`, `aria-labelledby`/`aria-orientation`, generuje wspólny `name` dla natywnych radiów.
- `[pctNumber]` — pole liczbowe na natywnym `<input type="text">` z `role="spinbutton"`: wartość `number | null`, formatowanie i parsowanie wg `Intl.NumberFormat` (locale aplikacji), krokowanie strzałkami i PageUp/PageDown, zaokrąglanie i domykanie do granic przy zatwierdzeniu. Granice pobiera z walidatorów `min()`/`max()` schematu (`wym-api-17`).
- `PctSelect` — lista wyboru z własnym panelem (nie natywny `<select>`): wzorzec ARIA „select-only combobox" (`role="combobox"` + `role="listbox"`, fokus zostaje na triggerze, aktywna opcja przez `aria-activedescendant`), własna obsługa klawiatury (strzałki, Home/End, Enter, Escape, typeahead) i **pierwsze użycie CDK Overlay**.
- Testy: `components` 124/124 (Vitest), `sandbox` 7/7, `sandbox-e2e` 105/105 (Playwright, w tym audyt axe-core **każdego widoku** z osobna) — testy jednostkowe biegną pod zoneless. Każdy spec komponentu wchodzi na własny widok, więc jego zakres nie zależy od zawartości sąsiednich przykładów. Osobno stoi bramka pakietu (`nx check-package components`), która bada **spakowany artefakt**, a nie źródła (`wym-real-36`).

Wnioski, które doprecyzowują „przepis":

- `wym-real-1` **Angular nie wspiera nowego NX „TS-solution" (project references).** Workspace musi używać klasycznego layoutu (tsconfig `paths`), nie composite/references.
- `wym-real-2` **Discovery testów Angulara (`@angular/build:unit-test`) globuje z `projectSourceRoot`.** Aby testy w secondary entrypointach (siblingi `src/`) były wykrywane, `sourceRoot` biblioteki ustawiono na root pakietu (`libs/components`).
- `wym-real-3` Target testów aplikacji to `vite:test` (plugin `@nx/vitest`), a biblioteki `test` (`@nx/angular:unit-test`).
- `wym-real-4` Build tokenów jest na razie lekkim własnym transformem (kontrakt DTCG bez zmian); podmiana na Style Dictionary pozostaje opcją bez wpływu na źródła (`wym-token-2`).
- `wym-real-5` _(do zrobienia)_ Raport pokrycia wymaga konfiguracji `coverageInclude` w targecie testowym, by egzekwować próg z `wym-proj-4`.
- `wym-real-36` **Pakiet nie woził skórki, a cały pipeline świecił na zielono.** `dist/libs/components` zawierał FESM-y, typy i mapę `exports` — i **zero plików CSS**: bundle odwoływał się do `var(--pct-field-bg)`, którego definicji nie było nigdzie w pakiecie. Przyczyną było to, że `tokens` **nie istniało w grafie NX** (`tokens -> []`, i nic nie wskazywało na `tokens`), a `libs/tokens/dist` jest gitignorowane. Krawędzi nie było, bo zależność jest nietypowa: ani jednego importu TS, sam artefakt CSS — a graf Nx wnioskuje z importów.

  Awaria była **cicha w obie strony**. Po usunięciu `libs/tokens/dist` `nx build sandbox` kończył się **sukcesem** bez ostrzeżenia, a wynikowy CSS aplikacji nie zawierał żadnej definicji tokenu; `nx serve sandbox` (komenda startowa z README) też nie miał tej zależności. CI przechodziło wyłącznie dzięki **ręcznemu krokowi** `node libs/tokens/build.mjs` przed `run-many` — czyli obejściu, które maskowało brak krawędzi zamiast go ujawnić.

  Naprawa jest trójdzielna, bo trzy różne rzeczy mogły zawieść niezależnie: (1) `implicitDependencies: ["tokens"]` w `components` i `sandbox` plus jawne `dependsOn` na `serve` — graf zna krawędź, ręczny krok w CI znika; (2) skórka jest kopiowana do `libs/components/themes` i stamtąd brana przez `assets` w `ng-package.json` — ng-packagr **nie czyta assetów spoza katalogu projektu**, więc staging jest wymuszony, nie kosmetyczny; do tego wpis `./themes/*` w `exports` źródłowego `package.json` (ng-packagr scala go z generowanymi wejściami), bo mapa `exports` jest zamknięta i plik bez wpisu jest dla konsumenta niewidoczny; (3) bramka `nx check-package components`.

  Lekcja: **zielony build nie jest dowodem, że artefakt da się użyć** — jeśli nic nie sprawdza spakowanego wyjścia, biblioteka może przez cały pipeline nieść wadę, którą zobaczy dopiero pierwszy konsument po `npm i`. Bramka sprawdza domknięcie tokenów (każdy `var(--pct-*)` użyty w pakiecie ma w nim deklarację), a nie samą obecność pliku — obecność spełniłby też pusty plik albo skórka, z której ktoś usunął warstwę komponentową. To ta sama klasa wady co `wym-real-17`, przeniesiona z runtime na dystrybucję: brakująca definicja custom property nie jest błędem, tylko cichym powrotem do wartości początkowej.

- `wym-real-6` Pierwotny guard (token-level) przepuścił disabled o realnym kontraście ~1.6:1, bo stan był robiony przez `opacity` (kompozycja z tłem w runtime, niewidoczna dla matematyki na hexach). Stąd `wym-token-11` (policy per motyw/rozmiar, severity) i `wym-token-12` (zakaz `opacity` dla warstw tekstowych). Wdrożone: `libs/tokens/src/contrast.policy.json` + silnik w `build.mjs`; `PctButton` używa tokenów `disabled-*` zamiast `opacity`.
- `wym-real-7` **Zoneless jest deklarowany jawnie** przez `provideZonelessChangeDetection()` w `app.config.ts`, mimo że generator nie dodaje polyfilla `zone.js` (bundle i tak go nie zawiera). Jawna deklaracja zamyka `wym-tech-3` i chroni przed przypadkowym powrotem do trybu zone-based. Testy jednostkowe biblioteki i aplikacji również konfigurują zoneless w `TestBed`, dzięki czemu `wym-api-2` (komponenty zoneless-safe) jest **weryfikowane**, a nie tylko deklarowane. (Uwaga: `setupTestBed()` z `@analogjs/vitest-angular` domyślnie już ustawia `zoneless: true` — jawna konfiguracja w spec-ach jest zabezpieczeniem na wypadek zmiany domyślnych.)
- `wym-real-24` **Kolizja nazw części powtórzyła się przy obudowie.** Gdy `pct-field` opakował grupę radiów, jego część `label` pasowała do 4 elementów (etykieta obudowy + etykiety opcji), a po opakowaniu checkboxa część `control` kolidowała z natywnym inputem checkboxa. To ta sama klasa błędu co `wym-real-15` — reguła `wym-api-12` obowiązuje więc także dla obudowy, nie tylko dla grup.
- `wym-real-25` **Select w obudowie miał obszar dotyku 19,6 px.** Po oddaniu ramki obudowie trigger stracił własny padding, więc jego wysokość spadła do wysokości linii tekstu — poniżej progu SC 2.5.8. Obudowa gwarantuje teraz `min-height: var(--pct-target-min)` na kolumnie kontrolki, co naprawia to dla wszystkich kontrolek naraz. Wychwycił to istniejący test progu dotyku — dowód, że warto było go napisać przy checkboxie.
- `wym-real-22` **Padding ramki obudowy tworzył „martwą strefę"** — kursor był wewnątrz pola, ale kliknięcie nie ustawiało fokusu. Najbardziej widoczne, gdy wyższy element w slocie (przycisk) podnosił wysokość rzędu, a wyśrodkowana kontrolka zostawiała pustą przestrzeń nad i pod sobą. Rozwiązanie dwuczęściowe: kontrolka rozciąga się na wysokość rzędu (`align-self: stretch`), a obudowa przekazuje kontrolce `mousedown` z obszaru, który nie jest elementem interaktywnym (kontrakt zyskał opcjonalne `focus()`). Ramka pokazuje kursor tekstowy, gdy zawiera kontrolkę tekstową. **Poprawka była tylko połowiczna** — patrz `wym-real-27`.
- `wym-real-29` **Wysokość liczona z paddingu nie daje się zgrać między komponentami.** Przycisk i pole miały ten sam token odstępu (`space.3`) i mimo to różniły się o 7 px: przycisk mierzył `padding-y` + wysokość linii etykiety (≈34,8 px), a pole `padding-y` + gwarantowany obszar dotyku kolumny kontrolki (42 px). Wyrównanie przez dobranie paddingów byłoby fałszywe — zależałoby od `line-height`, kroju pisma i zawartości slotów, a każdy nowy komponent zaczynałby od zgadywania. Stąd `wym-api-18`: wysokość jest osobnym tokenem (`--pct-control-height-*`), wspólnym dla obu, a padding pionowy przestaje sterować pionem. Skala `28 / 36 / 44 px` została dobrana tak, by najmniejsza wielkość nadal mieściła próg dotyku SC 2.5.8 z zapasem.

  Dowodem jest pomiar w przeglądarce (`apps/sandbox-e2e/src/size.spec.ts`), a nie sam fakt, że oba komponenty czytają ten sam token: test sprawdza równość wysokości **i** jej konkretną wartość — przy samej równości oba mogłyby spaść do wysokości linii tekstu i nadal „przechodzić".

- `wym-real-27` **Łatanie skutku zamiast przyczyny zostawiło martwą strefę widoczną w kursorze.** `wym-real-22` naprawiło _kliknięcie_ w padding ramki (przekazanie `mousedown` kontrolce), ale nie _przynależność_ tego obszaru: padding i `gap` zostały na rzędzie, a kolumny były w nim wyśrodkowane, więc **ok. 60% powierzchni ramki nie należało do żadnego elementu wewnętrznego** (kolumna kontrolki 354×24 w rzędzie 380×42). Skutki widać było dopiero na mapie kursora zdjętej z przeglądarki (`elementFromPoint` × `getComputedStyle().cursor` po siatce punktów): pole z listą miało kursor `pointer` wyłącznie nad triggerem, pole wyłączone zapraszało kursorem tekstowym do pisania po całym paddingu, a pas wokół przycisku w slocie wyglądał na jego część, choć klik w niego trafiał w pole. Naprawa strukturalna: padding schodzi z rzędu do kolumn, kolumny kafelkują wnętrze ramki szczelnie (pusty slot dekoracji **nie znika**, tylko zwija się do paddingu krawędzi), interaktywna dekoracja dostaje całą wysokość swojego slotu (poprawione w `wym-real-34` — o wypełnieniu slotu decyduje odtąd autor, nie obecność przycisku), a rodzaj kursora zgłasza kontrolka przez `fieldCursor` — bez tego `field.scss` musiałby znać klasy wszystkich kontrolek (`:has(input.pct-text)`) i każda nowa startowałaby z tym samym błędem. Doszło też `activate()` w kontrakcie: kursor `pointer` nad całą ramką selecta obiecuje otwarcie listy, więc klik w padding musi ją otwierać, a nie tylko przenosić fokus.

  Lekcja metodyczna: **„czy da się kliknąć" i „czy widać, że da się kliknąć" to dwa różne wymagania** — pierwsze testowała para testów e2e i przechodziły, drugie wyszło dopiero z pomiaru całej powierzchni. Wzorzec „mapa kursora po siatce punktów" wychwytuje tę klasę wad tanio i warto go powtarzać przy każdym komponencie o złożonej powierzchni.

- `wym-real-34` **Arkusz zgadywał intencję z zawartości slotu i wiązał dwie niezależne rzeczy.** `wym-real-27` dało dekoracji całą wysokość slotu regułą `:has(button, a, [tabindex])` — czyli „interaktywna" znaczyło „wypełnia slot". Konsekwencje wyszły dopiero przy próbie zbudowania czterech naturalnych dekoracji naraz: przycisk czyszczenia **nie mógł** być mniejszy od swojego slotu (a mały przycisk z widoczną ramką w odstępie pola to zwykły wzorzec), a kafelek z tłem — jednostka wspawana w ramkę — **nie mógł** być większy, bo nie jest interaktywny. Dwie osie zostały rozdzielone: o wypełnieniu slotu decyduje autor (`pctPrefix="fill"`), a o obsłudze kliknięcia nadal sam element. Dekoracja `fill` jest przy tym **własną powierzchnią**, więc obudowa przestaje przechwytywać klik w nią — inaczej kafelek pokazywałby kursor `default` i mimo to fokusował kontrolkę, czyli dokładnie ten rozjazd kursora i skutku, który `wym-real-27` naprawiało.

  Dwa szczegóły wyszły dopiero z pomiaru w przeglądarce, nie z rozumowania. Po pierwsze, wspawany przycisk wnosił własną wysokość minimalną, równą z założenia wysokości pola tej samej wielkości (`wym-api-18`), więc wiersz rósł o grubość swojej ramki — pole z przyciskiem było o 2 px wyższe od pola bez niego. Dekoracja `fill` dostaje więc `min-height: 0`: wysokość ma brać ze slotu, bo to slot ją wypełnia. Po drugie, po oddaniu slotu dekoracji odstęp między nią a kontrolką musiał przejść na kolumnę kontrolki — bez tego byłby pasem bez właściciela, czyli powrotem do wady `wym-real-27` w mikroskali.

  Symetryczne ograniczenie zostaje po stronie autora i jest nieusuwalne: przycisk `inset` musi być o stopień mniejszy od pola, bo wysokości obu w tej samej wielkości są z założenia równe. W najmniejszej wielkości nie ma już stopnia niżej, więc przycisk wypełnia tam wysokość i rozpycha wiersz o grubość ramki — to nie wada dopasowania, tylko wniosek z `wym-api-18`.

- `wym-real-35` **Kontrolka oddała obudowie ramkę, ale nie oddała jej panelu.** Po `wym-api-13` trigger selecta w polu przestał być własną ramką — a nakładka nadal kotwiczyła się w nim, więc panel wychodził z krawędzi kolumny kontrolki, nie pola: przy zmierzonym polu 301 px panel miał 275 px i był przesunięty o 13 px w prawo. Samodzielny select wyglądał przy tym bez zarzutu, bo tam trigger **jest** widoczną krawędzią — czyli objaw pojawiał się dokładnie w konfiguracji, w której obudowa przejmuje wygląd. Stąd `wym-api-19`: obudowa udostępnia swój wiersz jako powierzchnię odniesienia, a kotwica jest częścią kontraktu, nie domysłem kontrolki.

  Przy tej samej okazji wyszło, że **pismo panelu też nie miało właściciela**. Panel żyje w nakładce CDK, czyli jako dziecko `body`, więc dziedziczy krój po nim, a nie po aplikacji: sandbox ustawia `font-family` na hoście powłoki, w efekcie lista pisała domyślną szeryfową czcionką przeglądarki (pomiar: `Times New Roman` w panelu wobec `system-ui` w kontrolce). Rozmiar miał wadę bliźniaczą, ale w drugą stronę — brał się z tokenu `--pct-select-font-size`, więc w polu `lg` opcje zostawały przy 14 px, gdy trigger pisał 16 px. Oba rozwiązane tak samo: pismo odczytujemy z triggera przy otwarciu (jak motyw w `wym-real-18`), zamiast liczyć na dziedziczenie albo na token.

  Lekcja: **każda właściwość dziedziczona jest po cichu zerwana w nakładce.** Motyw był już przenoszony jawnie, ale traktowano to jako osobliwość motywu, nie jako regułę — a reguła brzmi: co ma wyglądać jak przedłużenie kontrolki, musi być z niej odczytane, bo drzewo DOM tego nie zrobi.

  Lekcja: **reguła CSS wnioskująca o zamiarze z zawartości slotu jest ukrytym API** — tanim, dopóki przykład jest jeden. Gdy autor chce wariantu, którego heurystyka nie przewiduje, nie ma go jak wyrazić i zostaje walka z arkuszem. Wariant, który biblioteka dopuszcza, ma być nazwany w API.

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
