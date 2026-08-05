# Lekcje — log dowodów

Wnioski wyciągnięte po drodze, z dowodem empirycznym przy każdym. To jest **baza
dowodowa** dla [osi](00-os.md), [wymagań](README.md#poziom-1--wymagania) i
[decyzji](decyzje/) — jedyne miejsce, gdzie zapisano, **co się naprawdę stało**, zanim
ktoś sformułował z tego regułę.

Kierunek zależności jest jednokierunkowy: wymaganie może powoływać się na lekcję,
lekcja na wymaganie nie musi. Indeks odwrotny (która lekcja karmi które wymaganie)
jest **generowany** do [rejestru](rejestr.md), nie utrzymywany tutaj ręcznie.

## Dlaczego numery, skoro wymagania mają nazwy

Bo tutaj **kolejność coś znaczy**. Log jest chronologiczny i append-only — wstawek nie
ma, więc numer jest zarazem adresem i informacją („to było przed rozbiciem sandboxa na
widoki"). W wymaganiach kolejność nie znaczyła nic i dlatego numeracja się tam
rozjechała; szerzej w [README](README.md#dlaczego-slugi-a-nie-numery).

Zmienił się wyłącznie prefiks: numer został ten sam, a wspólny przedrostek wymagań
ustąpił miejsca własnemu (`lekcja-N`). Lekcja **nie jest wymaganiem** — nie ma bramki,
nie podlega rejestrowi i nie da się jej „zrealizować".
Wspólny prefiks `wym-` był jedynym powodem, dla którego 43 obserwacje mieszały się
z listą obietnic.

## Jak dopisać lekcję

Kolejny wolny numer, na koniec pliku. Lekcja zasługuje na wpis, gdy spełnia dwa warunki:
**coś się naprawdę wydarzyło** (pomiar, celowa regresja, awaria — nie rozumowanie)
oraz **wniosek jest szerszy niż jedna poprawka**. Jeśli wniosek jest normatywny, jego
miejscem jest wymaganie albo decyzja, a lekcja zostaje dowodem, na który się powołują.

## Dziewięć wystąpień jednej lekcji

Log wygląda na zbiór niezależnych obserwacji, a przekrój przez niego dał
[`wym-os`](00-os.md). Zdania kluczowe zebrane są w [tabeli osi](00-os.md#dlaczego-to-nie-jest-hasło);
tutaj ważny jest wniosek: **domyślnym zachowaniem warstwy jest „nic się nie stało"**,
więc brak bramki nigdy nie objawia się jako brak — objawia się jako zieleń.

---

### <a id="lekcja-1"></a>`lekcja-1` — Angular nie wspiera NX „TS-solution"

**Angular nie wspiera nowego NX „TS-solution" (project references).** Workspace musi używać klasycznego layoutu (tsconfig `paths`), nie composite/references.

---

### <a id="lekcja-2"></a>`lekcja-2` — Discovery testów globuje z `projectSourceRoot`

**Discovery testów Angulara (`@angular/build:unit-test`) globuje z `projectSourceRoot`.** Aby testy w secondary entrypointach (siblingi `src/`) były wykrywane, `sourceRoot` biblioteki ustawiono na root pakietu (`libs/components`).

---

### <a id="lekcja-3"></a>`lekcja-3` — Target testów: `vite:test` dla aplikacji, `test` dla biblioteki

Target testów aplikacji to `vite:test` (plugin `@nx/vitest`), a biblioteki `test` (`@nx/angular:unit-test`).

---

### <a id="lekcja-4"></a>`lekcja-4` — Build tokenów to własny transform, nie Style Dictionary

Build tokenów jest na razie lekkim własnym transformem (kontrakt DTCG bez zmian); podmiana na Style Dictionary pozostaje opcją bez wpływu na źródła (`wym-token-artefakty`).

---

### <a id="lekcja-5"></a>`lekcja-5` — Próg pokrycia wymaga `coverageInclude`

Raport pokrycia wymaga konfiguracji `coverageInclude` w targecie testowym, by egzekwować próg z `wym-jakosc-pokrycie` — bez tego v8 mierzy wyłącznie to, co samo weszło do przebiegu. Postawione dopiero razem z bramką pokrycia; wtedy okazało się, że sam `coverageInclude` domyka to tylko w połowie (`lekcja-45`).

---

### <a id="lekcja-6"></a>`lekcja-6` — Guard kontrastu przepuścił `disabled` robiony przez `opacity`

Pierwotny guard (token-level) przepuścił disabled o realnym kontraście ~1.6:1, bo stan był robiony przez `opacity` (kompozycja z tłem w runtime, niewidoczna dla matematyki na hexach). Stąd `wym-token-kontrast` (policy per motyw/rozmiar, severity) i `wym-token-bez-opacity` (zakaz `opacity` dla warstw tekstowych). Wdrożone: `libs/tokens/src/contrast.policy.json` + silnik w `build.mjs`; `PctButton` używa tokenów `disabled-*` zamiast `opacity`.

---

### <a id="lekcja-7"></a>`lekcja-7` — Zoneless jest deklarowany jawnie

**Zoneless jest deklarowany jawnie** przez `provideZonelessChangeDetection()` w `app.config.ts`, mimo że generator nie dodaje polyfilla `zone.js` (bundle i tak go nie zawiera). Jawna deklaracja zamyka `wym-projekt-angular` i chroni przed przypadkowym powrotem do trybu zone-based. Testy jednostkowe biblioteki i aplikacji również konfigurują zoneless w `TestBed`, dzięki czemu `wym-api-fundament` (komponenty zoneless-safe) jest **weryfikowane**, a nie tylko deklarowane. (Uwaga: `setupTestBed()` z `@analogjs/vitest-angular` domyślnie już ustawia `zoneless: true` — jawna konfiguracja w spec-ach jest zabezpieczeniem na wypadek zmiany domyślnych.)

---

### <a id="lekcja-8"></a>`lekcja-8` — `zone.js` usunięty z zależności całkowicie

**Pakiet `zone.js` został całkowicie usunięty z zależności.** Jest opcjonalnym peer-dependency (`peerDependenciesMeta.zone.js.optional: true`) zarówno w `@angular/core`, jak i `@analogjs/vitest-angular`, a runner testów Angulara przy nieudanym `resolve('zone.js')` przechodzi w tryb bez zone (`catch → 'none'`). Zweryfikowane empirycznie po odinstalowaniu: testy 6/6 i 2/2, e2e 4/4, build biblioteki i aplikacji (SSR + prerender) — wszystko zielone; w runtime brak `window.Zone`, `__zone_symbol__` i niepatchowany `Promise`. Dzięki temu powrót do trybu zone-based jest niemożliwy przez przypadek.

---

### <a id="lekcja-9"></a>`lekcja-9` — `ControlValueAccessor` okazało się zbędne

**CVA okazało się zbędne.** Zakładaliśmy, że kompatybilność z reactive/template-driven forms wymaga `ControlValueAccessor` (i rozważaliśmy osobną dyrektywę-adapter). Eksperyment na `PctInput` (kontrolka implementująca wyłącznie `FormValueControl`) wykazał, że `[formControl]` i `[(ngModel)]` synchronizują wartość w obie strony bez żadnego kodu kompatybilności — zgodnie z dokumentacją Angulara. Rdzeń biblioteki nie importuje klasycznego API formularzy. Zachowanie jest zabezpieczone testami regresyjnymi w `input.spec.ts`.

---

### <a id="lekcja-10"></a>`lekcja-10` — Bramka kontrastu objęła pary nietekstowe (SC 1.4.11)

Bramka kontrastu obejmuje teraz także **pary nietekstowe wg SC 1.4.11** (`level: "UI"`, próg 3:1) — obramowanie inputu, obramowanie focus/błędu, focus ring. To wychwytuje typową wadę bibliotek UI: zbyt jasne obramowania pól. Tokeny komponentowe są auto-odkrywane (`component.*.json`), więc dodanie komponentu nie wymaga zmian w `build.mjs`.

---

### <a id="lekcja-11"></a>`lekcja-11` — MCP Angular CLI daje wskazówki dopasowane do wersji

**MCP Angular CLI (`.mcp.json`) dostarcza wskazówki dopasowane do wersji.** Ogólny plik `best-practices.md` pobrany ze strony nie zawierał reguły „nie ustawiaj jawnie `OnPush` — jest domyślne w v22+", którą zwraca `get_best_practices` przez MCP. Stąd korekta `wym-api-fundament`. Uwaga: `list_projects` zwraca pustą listę, bo czyta `angular.json`, a workspace jest oparty na Nx (`project.json`) — narzędzia wymagające kontekstu workspace nie działają, ale `search_documentation` i `get_best_practices` tak.

---

### <a id="lekcja-12"></a>`lekcja-12` — `FormCheckboxControl` wymaga `checked`, nie `value`

**Kontrolki kontraktu `FormCheckboxControl` wymagają `checked`, nie `value`** (definiowanie `value` jest zabronione). Ponieważ `model()` nie przyjmuje transformacji `booleanAttribute`, `checked` trzeba wiązać nawiasami (`[checked]="true"`), a nie gołym atrybutem — inaczej szablon nie kompiluje się (`Type 'string' is not assignable to type 'boolean'`). Kontrakt przewiduje też opcjonalne metody `focus()` i `reset()`; zaimplementowane w `PctCheckbox` i `PctInput`.

---

### <a id="lekcja-13"></a>`lekcja-13` — `getComputedStyle` z panelu podglądu bywa nieaktualne

Odczyty `getComputedStyle` z panelu podglądu potrafią być **nieaktualne**, gdy panel nie jest wyświetlany („the page is not compositing frames") — prowadzi to do fałszywych diagnoz błędów CSS. Wiarygodną weryfikacją stylów są testy e2e (Playwright), które działają w normalnie renderującej przeglądarce.

---

### <a id="lekcja-14"></a>`lekcja-14` — Zgodność formalna nie znaczy dobra jakość

**Zgodność formalna nie znaczy dobra jakość.** Pierwszy audyt axe nie wykazał naruszeń, a reguła `target-size` **przeszła** przy obszarze klikalnym checkboxa 18×18 px — bo SC 2.5.8 dopuszcza wyjątek odstępu, a wokół kontrolki było dużo wolnego miejsca. Wystarczyłoby zagęścić układ w aplikacji konsumenta, żeby to samo przestało być zgodne. Stąd `wym-a11y-dotyk`: obszar dotyku spełniamy wprost, niezależnie od otoczenia.

---

### <a id="lekcja-15"></a>`lekcja-15` — Kolizja nazw części wyszła dopiero w e2e

Kolizja nazw części wyszła dopiero w teście e2e: selektor `[data-pct-part="label"]` w obrębie `pct-radio-group` pasował do 4 elementów (etykieta grupy + etykiety opcji). Stąd `wym-api-czesci-unikalne`. Testy jednostkowe tego nie wychwyciły, bo odpytywały konkretny element, a nie kolekcję.

---

### <a id="lekcja-16"></a>`lekcja-16` — Opcje w grupie są treścią rzutowaną, nie `viewChildren`

W grupie opcje są **treścią rzutowaną**, więc kontener nie widzi ich zapytaniem `viewChildren`; `contentChildren(PctRadio)` tworzyłoby cykliczny import kontener↔element. `focus()` grupy odpytuje więc DOM hosta (`input[type="radio"]`).

---

### <a id="lekcja-17"></a>`lekcja-17` — Scoped theme był zepsuty na warstwie komponentowej

**Scoped theme był zepsuty na warstwie komponentowej i nikt tego nie widział.** Sonda w przeglądarce wykazała, że w panelu `[data-theme="dark"]` token semantyczny `--pct-surface` miał poprawną wartość ciemną, ale `--pct-button-bg` i `--pct-select-panel-bg` nadal zwracały wartości jasne. Przyczyna w `wym-token-domkniecie`. Wada przetrwała tak długo, bo wcześniejszy test scoped theme sprawdzał **tylko token semantyczny**, a różnica między `blue-600` i `blue-500` jest wizualnie subtelna. Poprawione w buildzie; dodany test regresyjny porównujący token komponentowy w `:root` i w scope.

---

### <a id="lekcja-18"></a>`lekcja-18` — Panel nakładki renderuje się poza drzewem hosta

Panel nakładki CDK renderuje się **poza drzewem hosta**, co ma dwie konsekwencje: (1) selektory `:host(...)` nie obejmują jego treści — stany opcji trzeba oznaczać atrybutami na samych opcjach; (2) kaskada scoped theme do niego nie dociera — motyw z najbliższego przodka hosta jest przenoszony jawnie na panel (`data-theme`). Tokeny działają, bo są zdefiniowane na `:root` — zaleta podejścia CSS-first (`wym-token-dtcg`).

---

### <a id="lekcja-19"></a>`lekcja-19` — `CSS.escape` nie istnieje w jsdom

`CSS.escape` nie istnieje w jsdom, więc budowanie selektorów po id wywala testy jednostkowe. Aktywną opcję znajdujemy indeksem w kolekcji, co dodatkowo wprost odpowiada semantyce `activeIndex`.

---

### <a id="lekcja-20"></a>`lekcja-20` — Na natywnym elemencie prowadzi `DefaultValueAccessor`

**Na natywnym elemencie klasyczne formularze prowadzą przez wbudowany `DefaultValueAccessor`.** `[formControl]` na `<input pctText>` jest obsługiwany przez akcesor Angulara, który sam pisze do DOM. Nasze równoległe wiązanie wartości powodowało konflikt dwóch autorów (input startował pusty zamiast z wartością kontrolki). Kontrolka wykrywa więc `NgControl` na tym samym elemencie i wtedy oddaje własność wartości, pozostając przy obudowie i stanie.

---

### <a id="lekcja-21"></a>`lekcja-21` — Ta sama logika komunikatów w czterech kontrolkach

Ta sama logika komunikatów (`errorText`, `showInvalid`, `showError`, `describedBy`, `hintId`, `errorId`, `touch`) była **skopiowana do 4 kontrolek**. Poprawka wymagała czterech identycznych zmian — stąd wydzielenie do `core` (`wym-api-obudowa`).

---

### <a id="lekcja-22"></a>`lekcja-22` — Padding ramki tworzył martwą strefę

**Padding ramki obudowy tworzył „martwą strefę"** — kursor był wewnątrz pola, ale kliknięcie nie ustawiało fokusu. Najbardziej widoczne, gdy wyższy element w slocie (przycisk) podnosił wysokość rzędu, a wyśrodkowana kontrolka zostawiała pustą przestrzeń nad i pod sobą. Rozwiązanie dwuczęściowe: kontrolka rozciąga się na wysokość rzędu (`align-self: stretch`), a obudowa przekazuje kontrolce `mousedown` z obszaru, który nie jest elementem interaktywnym (kontrakt zyskał opcjonalne `focus()`). Ramka pokazuje kursor tekstowy, gdy zawiera kontrolkę tekstową. **Poprawka była tylko połowiczna** — patrz `lekcja-27`.

---

### <a id="lekcja-23"></a>`lekcja-23` — `page.mouse.click()` nie przewija strony

Przy weryfikacji tej poprawki **błąd był w teście, nie w kodzie**: `page.mouse.click()` w Playwright używa współrzędnych widoku i nie przewija strony, więc klik w element poniżej ekranu trafiał w `<html>`. Locator-owe `click()` przewija samo. Przy klikaniu we współrzędne trzeba najpierw `scrollIntoViewIfNeeded()`.

---

### <a id="lekcja-24"></a>`lekcja-24` — Kolizja nazw części powtórzyła się przy obudowie

**Kolizja nazw części powtórzyła się przy obudowie.** Gdy `pct-field` opakował grupę radiów, jego część `label` pasowała do 4 elementów (etykieta obudowy + etykiety opcji), a po opakowaniu checkboxa część `control` kolidowała z natywnym inputem checkboxa. To ta sama klasa błędu co `lekcja-15` — reguła `wym-api-czesci-unikalne` obowiązuje więc także dla obudowy, nie tylko dla grup.

---

### <a id="lekcja-25"></a>`lekcja-25` — Select w obudowie miał obszar dotyku 19,6 px

**Select w obudowie miał obszar dotyku 19,6 px.** Po oddaniu ramki obudowie trigger stracił własny padding, więc jego wysokość spadła do wysokości linii tekstu — poniżej progu SC 2.5.8. Obudowa gwarantuje teraz `min-height: var(--pct-target-min)` na kolumnie kontrolki, co naprawia to dla wszystkich kontrolek naraz. Wychwycił to istniejący test progu dotyku — dowód, że warto było go napisać przy checkboxie.

---

### <a id="lekcja-26"></a>`lekcja-26` — `FormField` sam dostarcza `NgControl`

**`FormField` sam dostarcza `NgControl`, więc heurystyka z `lekcja-20` była za szeroka.** Dyrektywa signal forms rejestruje interop-owy `NgControl` dla zgodności ze starymi `ControlValueAccessor`ami. Warunek „jest `NgControl` ⇒ ktoś inny pisze do DOM" obejmował więc także signal forms — a te przy **własnej kontrolce** (`FormValueControl`) ustawiają wyłącznie jej `value` i do DOM nie piszą (robią to tylko dla elementów bez własnej kontrolki). Efekt: `<input pctText [formField]="f.email">` z niepustą wartością początkową renderował **puste pole**. Wada przetrwała, bo wszystkie testy i sandbox startowały z pustym modelem. Warunek rozróżnia teraz oba przypadki (`NgControl` bez `FormField`), a regresję pilnują testy startujące z niepustą wartością — w `PctText` i `PctNumber`.

---

### <a id="lekcja-27"></a>`lekcja-27` — Łatanie skutku zostawiło martwą strefę widoczną w kursorze

**Łatanie skutku zamiast przyczyny zostawiło martwą strefę widoczną w kursorze.** `lekcja-22` naprawiło _kliknięcie_ w padding ramki (przekazanie `mousedown` kontrolce), ale nie _przynależność_ tego obszaru: padding i `gap` zostały na rzędzie, a kolumny były w nim wyśrodkowane, więc **ok. 60% powierzchni ramki nie należało do żadnego elementu wewnętrznego** (kolumna kontrolki 354×24 w rzędzie 380×42). Skutki widać było dopiero na mapie kursora zdjętej z przeglądarki (`elementFromPoint` × `getComputedStyle().cursor` po siatce punktów): pole z listą miało kursor `pointer` wyłącznie nad triggerem, pole wyłączone zapraszało kursorem tekstowym do pisania po całym paddingu, a pas wokół przycisku w slocie wyglądał na jego część, choć klik w niego trafiał w pole. Naprawa strukturalna: padding schodzi z rzędu do kolumn, kolumny kafelkują wnętrze ramki szczelnie (pusty slot dekoracji **nie znika**, tylko zwija się do paddingu krawędzi), interaktywna dekoracja dostaje całą wysokość swojego slotu (poprawione w `lekcja-34` — o wypełnieniu slotu decyduje odtąd autor, nie obecność przycisku), a rodzaj kursora zgłasza kontrolka przez `fieldCursor` — bez tego `field.scss` musiałby znać klasy wszystkich kontrolek (`:has(input.pct-text)`) i każda nowa startowałaby z tym samym błędem. Doszło też `activate()` w kontrakcie: kursor `pointer` nad całą ramką selecta obiecuje otwarcie listy, więc klik w padding musi ją otwierać, a nie tylko przenosić fokus.

Lekcja metodyczna: **„czy da się kliknąć" i „czy widać, że da się kliknąć" to dwa różne wymagania** — pierwsze testowała para testów e2e i przechodziły, drugie wyszło dopiero z pomiaru całej powierzchni. Wzorzec „mapa kursora po siatce punktów" wychwytuje tę klasę wad tanio i warto go powtarzać przy każdym komponencie o złożonej powierzchni.

---

### <a id="lekcja-28"></a>`lekcja-28` — jsdom nie parsuje `:has()` z kombinatorem względnym

**jsdom (nwsapi) nie parsuje `:has()` z kombinatorem względnym** — `:has(+ .selektor)` wywala `SyntaxError: not a valid selector` przy **dowolnym** późniejszym `querySelectorAll` w teście, więc awaria pojawia się w miejscu niezwiązanym z przyczyną. Wersja z prostym `:has(button, a, [tabindex])` działa. Niezależnie od narzędzia lepszym rozwiązaniem okazał się układ bez patrzenia „w przód": odstęp niesie slot dekoracji (padding krawędzi na zewnątrz, `gap` od strony kontrolki), a pusty slot zwija się do samego paddingu krawędzi — dzięki temu kolumny kafelkują ramkę bez żadnej reguły warunkowej.

---

### <a id="lekcja-29"></a>`lekcja-29` — Wysokość liczona z paddingu nie daje się zgrać

**Wysokość liczona z paddingu nie daje się zgrać między komponentami.** Przycisk i pole miały ten sam token odstępu (`space.3`) i mimo to różniły się o 7 px: przycisk mierzył `padding-y` + wysokość linii etykiety (≈34,8 px), a pole `padding-y` + gwarantowany obszar dotyku kolumny kontrolki (42 px). Wyrównanie przez dobranie paddingów byłoby fałszywe — zależałoby od `line-height`, kroju pisma i zawartości slotów, a każdy nowy komponent zaczynałby od zgadywania. Stąd `wym-api-wielkosc`: wysokość jest osobnym tokenem (`--pct-control-height-*`), wspólnym dla obu, a padding pionowy przestaje sterować pionem. Skala `28 / 36 / 44 px` została dobrana tak, by najmniejsza wielkość nadal mieściła próg dotyku SC 2.5.8 z zapasem.

Dowodem jest pomiar w przeglądarce (`apps/sandbox-e2e/src/size.spec.ts`), a nie sam fakt, że oba komponenty czytają ten sam token: test sprawdza równość wysokości **i** jej konkretną wartość — przy samej równości oba mogłyby spaść do wysokości linii tekstu i nadal „przechodzić".

---

### <a id="lekcja-30"></a>`lekcja-30` — Test może kliknąć w HTML z serwera przed hydracją

**Test może kliknąć w HTML z serwera, zanim hydracja go przejmie.** Po rozbiciu sandboxa na leniwie ładowane widoki testy e2e zaczęły migotać: `fill()` wpisywał wartość, po czym pole wracało do stanu początkowego — objaw wyglądał jak wada `PctNumber`, a był wyścigiem. `goto()` kończy się na zdarzeniu `load`, a między „element jest w DOM" a „element jest podłączony" mieści się pobranie chunka trasy. Powłoka wystawia więc znacznik `data-sbx-ready` po `ApplicationRef.whenStable()`, a testy wchodzą przez pomocnik `visit()`, który na niego czeka. Bariera jest po stronie testu, nie aplikacji — aplikacja niczego nie opóźnia.

---

### <a id="lekcja-31"></a>`lekcja-31` — Generator id był niebezpieczny przy SSR

**Generator id był niebezpieczny przy SSR i nikt tego nie widział.** `nextPctId` liczył w zmiennej modułowej, a serwer renderuje wiele żądań w jednym procesie: licznik rósł z każdym renderem, klient zawsze startował od zera. Pierwsze żądanie po starcie serwera trafiało w zgodność (stąd zielone testy), każde kolejne dawało HTML z innymi id niż policzy klient — po hydracji część atrybutów zostawała z wartościami serwera, część dostawała wartości klienta i **powiązania ARIA wskazywały w próżnię** (`aria-labelledby="pct-field-4071-label"` przy etykiecie `pct-field-12-label`). Wada ujawniła się dopiero, gdy sandbox dostał drugą trasę i ruch na serwerze dev wzrósł. Licznik mieszka teraz w usłudze `providedIn: 'root'` — injector aplikacji żyje tyle, co jedno żądanie na serwerze i jedno wczytanie strony u klienta, więc obie strony liczą od zera.

Lekcja: **stan modułowy jest wspólny dla wszystkich renderów SSR.** Każdy licznik, cache czy rejestr w bibliotece z `wym-projekt-ssr` musi trafić do DI albo być bezstanowy — inaczej wada pojawia się dopiero „u kogoś na produkcji", po drugim żądaniu.

---

### <a id="lekcja-32"></a>`lekcja-32` — Krok pola liczbowego liczony z DOM gubił naciśnięcia

**Krok pola liczbowego liczony z tekstu w DOM gubił naciśnięcia.** `stepBy` brał punkt wyjścia z `input.value`, a tekst zapisuje **efekt**, czyli asynchronicznie: dwa naciśnięcia strzałki w jednym przebiegu detekcji widziały tę samą wartość wyjściową i drugie nie miało skutku. Objawiało się jako migotanie testu e2e (raz na kilka przebiegów), bo zależało od tego, czy między zdarzeniami zmieścił się flush — człowiek trzymający strzałkę trafia w to samo okno. Punktem wyjścia jest teraz **sygnał**, a tekst tylko wtedy, gdy użytkownik faktycznie pisze (`typing()`); wpisana, niezatwierdzona wartość nadal jest respektowana.

Lekcja: **DOM nie jest źródłem prawdy w komponencie sterowanym sygnałami** — odczyt z niego zawsze może być o jeden przebieg do tyłu. Test regresyjny celowo nie stabilizuje fixture między zdarzeniami; z `await` po każdym z nich wada jest niewidoczna, co tłumaczy, dlaczego istniejący test klawiatury ją przepuszczał.

---

### <a id="lekcja-33"></a>`lekcja-33` — Widok stanów wykrył niedozwolony atrybut ARIA

**Widok przekrojowy stanów wykrył niedozwolony atrybut ARIA w pierwszym uruchomieniu.** `PctRadio` wystawiał `aria-readonly` na natywnym `<input type="radio">`, a rola `radio` tego atrybutu **nie wspiera** — wspiera go dopiero `radiogroup`. Axe klasyfikuje to jako naruszenie **krytyczne** (`aria-allowed-attr`), a mimo to wada przeżyła kilka rund audytów: żaden dotychczasowy przykład nie renderował grupy radiów w stanie „tylko do odczytu". Atrybut przeniesiony na kontener, testy jednostkowe sprawdzają teraz oba miejsca (jest na grupie, nie ma na opcji).

Lekcja: **macierz „każdy komponent × każdy stan" nie jest ozdobnikiem sandboxa, tylko wejściem dla bramki a11y.** Audyt bada wyłącznie to, co ktoś wcześniej wyrenderował — luka w prezentacji jest luką w pokryciu, niewidoczną w raporcie, bo raport jest zielony.

---

### <a id="lekcja-34"></a>`lekcja-34` — Arkusz zgadywał intencję z zawartości slotu

**Arkusz zgadywał intencję z zawartości slotu i wiązał dwie niezależne rzeczy.** `lekcja-27` dało dekoracji całą wysokość slotu regułą `:has(button, a, [tabindex])` — czyli „interaktywna" znaczyło „wypełnia slot". Konsekwencje wyszły dopiero przy próbie zbudowania czterech naturalnych dekoracji naraz: przycisk czyszczenia **nie mógł** być mniejszy od swojego slotu (a mały przycisk z widoczną ramką w odstępie pola to zwykły wzorzec), a kafelek z tłem — jednostka wspawana w ramkę — **nie mógł** być większy, bo nie jest interaktywny. Dwie osie zostały rozdzielone: o wypełnieniu slotu decyduje autor (`pctPrefix="fill"`), a o obsłudze kliknięcia nadal sam element. Dekoracja `fill` jest przy tym **własną powierzchnią**, więc obudowa przestaje przechwytywać klik w nią — inaczej kafelek pokazywałby kursor `default` i mimo to fokusował kontrolkę, czyli dokładnie ten rozjazd kursora i skutku, który `lekcja-27` naprawiało.

Dwa szczegóły wyszły dopiero z pomiaru w przeglądarce, nie z rozumowania. Po pierwsze, wspawany przycisk wnosił własną wysokość minimalną, równą z założenia wysokości pola tej samej wielkości (`wym-api-wielkosc`), więc wiersz rósł o grubość swojej ramki — pole z przyciskiem było o 2 px wyższe od pola bez niego. Dekoracja `fill` dostaje więc `min-height: 0`: wysokość ma brać ze slotu, bo to slot ją wypełnia. Po drugie, po oddaniu slotu dekoracji odstęp między nią a kontrolką musiał przejść na kolumnę kontrolki — bez tego byłby pasem bez właściciela, czyli powrotem do wady `lekcja-27` w mikroskali.

Symetryczne ograniczenie zostaje po stronie autora i jest nieusuwalne: przycisk `inset` musi być o stopień mniejszy od pola, bo wysokości obu w tej samej wielkości są z założenia równe. W najmniejszej wielkości nie ma już stopnia niżej, więc przycisk wypełnia tam wysokość i rozpycha wiersz o grubość ramki — to nie wada dopasowania, tylko wniosek z `wym-api-wielkosc`.

---

### <a id="lekcja-35"></a>`lekcja-35` — Kontrolka oddała obudowie ramkę, ale nie oddała panelu

**Kontrolka oddała obudowie ramkę, ale nie oddała jej panelu.** Po `wym-api-obudowa` trigger selecta w polu przestał być własną ramką — a nakładka nadal kotwiczyła się w nim, więc panel wychodził z krawędzi kolumny kontrolki, nie pola: przy zmierzonym polu 301 px panel miał 275 px i był przesunięty o 13 px w prawo. Samodzielny select wyglądał przy tym bez zarzutu, bo tam trigger **jest** widoczną krawędzią — czyli objaw pojawiał się dokładnie w konfiguracji, w której obudowa przejmuje wygląd. Stąd `wym-api-nakladka`: obudowa udostępnia swój wiersz jako powierzchnię odniesienia, a kotwica jest częścią kontraktu, nie domysłem kontrolki.

Przy tej samej okazji wyszło, że **pismo panelu też nie miało właściciela**. Panel żyje w nakładce CDK, czyli jako dziecko `body`, więc dziedziczy krój po nim, a nie po aplikacji: sandbox ustawia `font-family` na hoście powłoki, w efekcie lista pisała domyślną szeryfową czcionką przeglądarki (pomiar: `Times New Roman` w panelu wobec `system-ui` w kontrolce). Rozmiar miał wadę bliźniaczą, ale w drugą stronę — brał się z tokenu `--pct-select-font-size`, więc w polu `lg` opcje zostawały przy 14 px, gdy trigger pisał 16 px. Oba rozwiązane tak samo: pismo odczytujemy z triggera przy otwarciu (jak motyw w `lekcja-18`), zamiast liczyć na dziedziczenie albo na token.

Lekcja: **każda właściwość dziedziczona jest po cichu zerwana w nakładce.** Motyw był już przenoszony jawnie, ale traktowano to jako osobliwość motywu, nie jako regułę — a reguła brzmi: co ma wyglądać jak przedłużenie kontrolki, musi być z niej odczytane, bo drzewo DOM tego nie zrobi.

**Dopisek z 2026-08-05: trzecia właściwość.** Przy wprowadzaniu osi `dir` do sandboxa (`wym-token-logiczne`) wyszło, że kierunek pisma jest dokładnie tym samym przypadkiem — zmierzone `direction: rtl` na triggerze wobec `ltr` na panelu. Arkusz był przy tym bez zarzutu logiczny: `text-align: start` po prostu rozwiązuje się w drugą stronę, gdy kierunek nie dociera. Reguła powtórzyła się więc po raz trzeci, co jest argumentem za wyciągnięciem tego przenoszenia do warstwy nakładki w `core` (**D2**) zamiast dopisywania czwartej właściwości do `openPanel()`. Zapasowy wniosek: bramka czytająca arkusze jest warunkiem koniecznym obietnicy RTL, nigdy wystarczającym — reszta mieszka na wyrenderowanej stronie.

Lekcja: **reguła CSS wnioskująca o zamiarze z zawartości slotu jest ukrytym API** — tanim, dopóki przykład jest jeden. Gdy autor chce wariantu, którego heurystyka nie przewiduje, nie ma go jak wyrazić i zostaje walka z arkuszem. Wariant, który biblioteka dopuszcza, ma być nazwany w API.

---

### <a id="lekcja-36"></a>`lekcja-36` — Pakiet nie woził skórki, a pipeline świecił na zielono

**Pakiet nie woził skórki, a cały pipeline świecił na zielono.** `dist/libs/components` zawierał FESM-y, typy i mapę `exports` — i **zero plików CSS**: bundle odwoływał się do `var(--pct-field-bg)`, którego definicji nie było nigdzie w pakiecie. Przyczyną było to, że `tokens` **nie istniało w grafie NX** (`tokens -> []`, i nic nie wskazywało na `tokens`), a `libs/tokens/dist` jest gitignorowane. Krawędzi nie było, bo zależność jest nietypowa: ani jednego importu TS, sam artefakt CSS — a graf Nx wnioskuje z importów.

Awaria była **cicha w obie strony**. Po usunięciu `libs/tokens/dist` `nx build sandbox` kończył się **sukcesem** bez ostrzeżenia, a wynikowy CSS aplikacji nie zawierał żadnej definicji tokenu; `nx serve sandbox` (komenda startowa z README) też nie miał tej zależności. CI przechodziło wyłącznie dzięki **ręcznemu krokowi** `node libs/tokens/build.mjs` przed `run-many` — czyli obejściu, które maskowało brak krawędzi zamiast go ujawnić.

Naprawa jest trójdzielna, bo trzy różne rzeczy mogły zawieść niezależnie: (1) `implicitDependencies: ["tokens"]` w `components` i `sandbox` plus jawne `dependsOn` na `serve` — graf zna krawędź, ręczny krok w CI znika; (2) skórka jest kopiowana do `libs/components/themes` i stamtąd brana przez `assets` w `ng-package.json` — ng-packagr **nie czyta assetów spoza katalogu projektu**, więc staging jest wymuszony, nie kosmetyczny; do tego wpis `./themes/*` w `exports` źródłowego `package.json` (ng-packagr scala go z generowanymi wejściami), bo mapa `exports` jest zamknięta i plik bez wpisu jest dla konsumenta niewidoczny; (3) bramka `nx check-package components`.

Lekcja: **zielony build nie jest dowodem, że artefakt da się użyć** — jeśli nic nie sprawdza spakowanego wyjścia, biblioteka może przez cały pipeline nieść wadę, którą zobaczy dopiero pierwszy konsument po `npm i`. Bramka sprawdza domknięcie tokenów (każdy `var(--pct-*)` użyty w pakiecie ma w nim deklarację), a nie samą obecność pliku — obecność spełniłby też pusty plik albo skórka, z której ktoś usunął warstwę komponentową. To ta sama klasa wady co `lekcja-17`, przeniesiona z runtime na dystrybucję: brakująca definicja custom property nie jest błędem, tylko cichym powrotem do wartości początkowej.

---

### <a id="lekcja-37"></a>`lekcja-37` — Generyk w komponencie nie znaczy, że szablon go sprawdza

**Generyk w komponencie nie oznacza, że szablon go sprawdza.** Po uogólnieniu `PctSelect` do `PctSelect<T>` (`wym-api-generyk`) sonda w sandboxie pokazała, że kompilator przepuszcza wiązania jawnie sprzeczne: lista opcji `PctSelectOption<number>[]` z wartością `'napis'`, `emptyValue` innego typu niż opcje, a nawet `$event` z `(valueChange)` podany metodzie o niepasującym parametrze. Sprawdzanie szablonów **działało** (`NG8002` na wymyślonym inpucie łapane od razu) — problem był węższy: `T` ma kilka miejsc wnioskowania (`options`, `value`, `emptyValue`), więc TypeScript wybierał unię kandydatów (`string | number`), do której pasowały obie strony konfliktu.

Naprawą jest odebranie prawa do **ustalania** `T` tym wiązaniom, które mają być wobec niego tylko sprawdzane: `value` i `emptyValue` są zadeklarowane jako `NoInfer<T>`, więc typ bierze się wyłącznie z listy opcji. To domknęło cztery z pięciu przypadków sondy — łącznie z typowaniem `$event`, które wcześniej milczało.

Piąty przypadek został i jest ograniczeniem Angulara, nie API: `PctRadioGroup` nie ma inputu z opcjami (są treścią rzutowaną), więc jedynym źródłem `T` jest samo `value` — i tam `$event` z `(valueChange)` nadal nie jest sprawdzane. Generyk daje tej grupie bezpieczeństwo po stronie TypeScriptu (`isSelected`, `select`, odczyt `value()`), ale nie po stronie szablonu.

Lekcja: **przy generycznym komponencie trzeba osobno sprawdzić, czy szablon faktycznie egzekwuje typ** — sam fakt, że build przechodzi na poprawnym użyciu, nie odróżnia „typ się zgadza" od „typ jest ignorowany". Rozstrzyga dopiero kontrola negatywna: celowo błędne wiązanie, które **ma** wywalić build.

---

### <a id="lekcja-38"></a>`lekcja-38` — Idiomatyczna emulacja w Playwrighcie po cichu nie działa

**Idiomatyczny zapis emulacji w Playwrighcie po cichu nie działa i test przechodzi na wartościach domyślnych.** `test.use({ reducedMotion: 'reduce' })` i `test.use({ forcedColors: 'active' })` w wersji 1.61.1 **nie docierają do kontekstu przeglądarki**: w stronie `matchMedia('(prefers-reduced-motion: reduce)').matches` zwraca `false`, choć konfiguracja wygląda poprawnie i nic nie ostrzega. Ten sam kod przez `browser.newContext({ reducedMotion })` i przez `page.emulateMedia({ … })` działa bez zarzutu, a `test.use({ colorScheme })` — jedna z trzech osi — działa również. Czyli: sposób zapisu decyduje o tym, czy test cokolwiek bada, a rozbieżność jest niewidoczna z lektury.

Wykryła to **kontrola odniesienia**, nie test właściwy. Gdyby istniał sam test redukcji z asercją „czas przejścia jest mały", przeszedłby na wartości bazowej `150ms` interpretowanej jako „dość mało" i nikt nie zauważyłby, że media query nigdy się nie zapaliło. Zapaliło się dopiero porównanie pary: bez preferencji **dokładnie** `150ms`, z preferencją **dokładnie** `0.01ms`.

Stąd dwie reguły dla wszystkich testów preferencji systemowych: emulacja idzie przez `page.emulateMedia()` w pomocniku `visit()`, a każdy taki test **najpierw sprawdza `matchMedia`**, czyli pyta przeglądarkę, czy w ogóle jest w mierzonym trybie. To ta sama zasada co `wym-jakosc-kontrola`: bramka musi umieć powiedzieć, że działa.

---

### <a id="lekcja-39"></a>`lekcja-39` — Test wizualny może urodzić się martwy na dwa sposoby

**Test wizualny może urodzić się martwy na dwa niezależne sposoby — oba wyglądają jak działający test.** Pierwszy: `__screenshots__/` było w `.gitignore`, więc wzorce nigdy nie trafiłyby do repozytorium, a Playwright przy braku wzorca **zapisuje bieżący zrzut jako poprawny i przechodzi** — na CI test świeciłby na zielono zawsze, porównując każdy przebieg z samym sobą. Drugi: pierwsza wersja progu miała `maxDiffPixelRatio: 0.01` i **przepuszczała** zmianę `border-radius` przycisku z 8 px na 1 px.

Drugi przypadek jest pouczający liczbowo. Próg jako **ułamek** obrazu daje tym większą pobłażliwość, im większa karta — a różnica realnej regresji nie skaluje się z rozmiarem zrzutu, bo dotyczy kilku krawędzi. Pomiar: ten sam kod w powtórzonym przebiegu daje **0** różniących się pikseli, a zmiana promienia — **74**. Próg jest więc bezwzględny (`maxDiffPixels: 20`) i wynika z tych dwóch liczb, a nie z wyczucia.

Obie wady wyszły dopiero po **celowym wprowadzeniu regresji** i sprawdzeniu, że bramka zapala. Lekcja: nowa bramka nie jest gotowa, gdy przechodzi — jest gotowa, gdy pokazano, że potrafi nie przejść.

---

### <a id="lekcja-40"></a>`lekcja-40` — Stan niesiony samym tłem znika w wysokim kontraście

**Stan niesiony samym tłem znika w trybie wysokiego kontrastu.** Kropka zaznaczonego radiobuttona to zwykły `<div>` z `background`, a w `forced-colors: active` przeglądarka wymusza na tle paletę systemu — kropka i okrąg dostawały ten sam `rgb(255,255,255)` i **zaznaczona opcja wyglądała identycznie jak pusta**. Ani bramka kontrastu tokenów, ani audyt axe tego nie widzą: obie badają tryb normalny, w którym kolory są poprawne.

Naprawa jest jednozdaniowa, ale reguła z niej wynikająca jest szersza i weszła do `wym-a11y-kolory-wymuszone`: **stan ma nieść obecność kształtu, nie barwa**. Ptaszek checkboxa był odporny od początku, bo przełącza się `visibility` — kropka radia była wyjątkiem, nie regułą. Tam, gdzie kształtu nie ma (opcja listy to prostokąt), rozdzielamy stany na dwa niezależne kanały: tło dla wyboru, obrys dla kursora klawiatury.

---

### <a id="lekcja-41"></a>`lekcja-41` — Narzędzie miało hak „przed", a potrzebny był „po"

**Narzędzie miało hak tylko „przed", a potrzebny był „po".** `nx release` udostępnia `preVersionCommand`, czyli komendę uruchamianą **przed** podbiciem wersji. Pakiet zbudowany w tym momencie niesie starą stałą `PCT_VERSION`, więc pierwsze wydanie wypuściłoby artefakt kłamiący o własnej wersji. Podpowiedź z dokumentacji — `manifestRootsToUpdate: ["dist/{projectRoot}"]` — jest półśrodkiem: poprawia `package.json` w `dist`, czyli **jeden plik**, a wartość wkompilowana w bundle zostaje stara. Pakiet zgadza się wtedy sam ze sobą w manifeście i kłamie w kodzie.

Naprawa polega na odwróceniu kolejności, a nie na łataniu skutku: wydanie prowadzi `tools/release.mjs` na programistycznym API (`releaseVersion` → stempel → build → bramka → `releaseChangelog` → `releasePublish`). Build stoi po podbiciu wersji, więc dist niesie właściwą wartość z samego kompilatora i `manifestRootsToUpdate` przestaje być potrzebne. Bramka pakietu stoi **przed** commitem, tagiem i publikacją — czyli przed wszystkim, co trzeba by potem odkręcać.

Osobna decyzja: `stamp-version` **nie jest** zależnością `build`. Gdyby był, artefakt zawsze zgadzałby się sam ze sobą, a kontrola wersji w `check-package` przestałaby cokolwiek badać — dokładnie tak, jak bramka, która nie umie nie przejść (`lekcja-39`).

---

### <a id="lekcja-42"></a>`lekcja-42` — Projekt e2e nigdy nie był typecheckowany

**Projekt e2e nigdy nie był typecheckowany i nikt tego nie zauważył.** `sandbox-e2e` miał `lint` i `e2e`, ale **żadnego** targetu typecheck — czyli kilkanaście plików TypeScriptu, których kompilator nie widział ani razu. Wyszło to przy okazji `wym-token-artefakty`: dodanie targetu ujawniło w pierwszym uruchomieniu 3 błędy w `playwright.config.mts`. Nie były to wady testów — `tsconfig.json` opisywał projekt nieprawdziwie (`module: commonjs` przy pliku `.mts`, który jest ESM, i brak `types: ["node"]` przy użyciu `process`). Kod działał, bo Playwright i Nx ładują `.mts` własnymi loaderami, więc deklaracja z tsconfiga nigdy nie była konfrontowana z rzeczywistością.

Lekcja: **lint nie zastępuje typechecku.** ESLint parsuje i sprawdza reguły, ale nie zgłasza błędów typów ani niespójności konfiguracji modułów. Projekt bez targetu `typecheck` to kod, o którym wiadomo tylko tyle, że da się go sparsować.

---

### <a id="lekcja-43"></a>`lekcja-43` — Odczyt nieistniejącego tokenu to pusty łańcuch

**Odczyt nieistniejącego tokenu nie jest błędem, tylko pustym łańcuchem.** `getComputedStyle(el).getPropertyValue('--pct-surfce')` zwraca `''` — więc test porównujący dwa takie odczyty przechodzi na `'' === ''` i milczy o tym, że nie zmierzył niczego. To ta sama klasa cichej wady co `lekcja-38`, tylko wywołana literówką zamiast zapisu emulacji. Stąd realny użytek z generowanego `tokens.ts` (`wym-token-artefakty`): pomocniki `tokenOf`/`rootToken` przyjmują `PctCssVar` — unię **nazw custom properties**, nie ścieżek DTCG — więc literówka jest błędem kompilacji, a nie zielonym testem. Bramkę zweryfikowano kontrolą negatywną: podmiana jednej nazwy na błędną daje 6 błędów typu.

Przy okazji trzy razy z rzędu ta sama pułapka narzędziowa: „komentarz" w JSON-ie (`"// klucz"`) da się wstawić tylko tam, gdzie schemat dopuszcza dowolne klucze. W `targets` (project.json), `namedInputs` (nx.json) i `paths` (tsconfig) wartość musi mieć konkretny typ, więc łańcuch znaków wywala odpowiednio graf Nx (`Cannot use 'in' operator`), jego wczytywanie (`Given napi value is not an array`) i `tsc` (`TS5025`).

---

### <a id="lekcja-44"></a>`lekcja-44` — `.nxignore` nie wyłącza projektu, tylko wyłącza plik z liczenia

**Kontrola odniesienia bramki pakietu potrzebuje udawanych pakietów, a udawany pakiet ma `package.json` — i to wystarczyło, żeby Nx zrobił z niego projekt.** `nx show projects` pokazał widmowy `@pacit/components` o korzeniu w `tools/check-package.fixtures/_poprawny`, z własnym targetem `lint`; trzy katalogi fixtures deklarowały tę samą nazwę, więc graf wybierał jeden z nich po cichu. Naturalne obejście — wpis w `.nxignore` — widmo usunęło i **zepsuło coś gorszego**: katalog zniknął z mapy plików, więc `inputs` targetu `check-package` przestały go widzieć. Pomiar: po edycji fixture'a `Cache: 5/5 hit (100%)`, czyli bramka **nie pobiegła**; po naprawie ta sama edycja daje `4/5`.

Skutek jest dokładnie tej klasy, przed którą stoi cały ten projekt: ktoś osłabia fixture, CI świeci na zielono z cache'a, a bramka nie wykonała się ani razu. Naprawą nie jest ignorowanie, tylko nieużywanie nazwy, którą narzędzie traktuje jako strukturę: manifest leży w repozytorium jako `manifest.json` i `package.json` staje się dopiero w kopii składanej do przebiegu.

Reguła jest szersza niż ten jeden katalog: **„ignoruj" w narzędziach budowania prawie nigdy nie znaczy „nie jest projektem" — znaczy „nie istnieje"**, a nieistnienie propaguje się do hashowania, czyli do tego, co decyduje o ponownym uruchomieniu zadania. Zanim wyciszy się narzędzie, trzeba sprawdzić, co jeszcze przestanie widzieć — i to pomiarem trafień w cache, bo w wyniku przebiegu ta różnica nie jest widoczna: zielone jest zielone.

---

### <a id="lekcja-45"></a>`lekcja-45` — Usunięcie testu podniosło pokrycie

**Usunięcie `number.spec.ts` podniosło pokrycie linii z 96,55% na 96,94%.** Nie jest to paradoks pomiaru, tylko jego definicja: v8 zna wyłącznie moduły, które faktycznie weszły do przebiegu, więc razem z testem z raportu wypadł cały nietestowany `number.ts` — 114 linii zniknęło z **mianownika**, nie doszło do licznika. Próg pilnujący takiej liczby jest bramką urodzoną martwą (`lekcja-39`) i to w najgorszym możliwym wariancie: świeci tym jaśniej, im mniej się testuje.

`coverageInclude` domyka to **tylko w połowie**. Pliki bez testu dokłada osobna ścieżka (`getCoverageMapForUncoveredFiles`), która parsuje ŹRÓDŁO rolldownem — a ten przewraca się na `import type` / `export type`, wypisując `Failed to parse … Excluding it from coverage.` w środku kilku tysięcy linii logu i kończąc przebieg **zielono, z kodem wyjścia 0**. Sonda rozstrzygnęła, gdzie leży granica: zwykła funkcja, `@Directive` i `@Component` z `templateUrl` trafiły do raportu z zerem; kopia `number.ts` — nie, bo w 18. linii ma `import type`. W bibliotece Angulara pod `isolatedModules` to nie jest rzadki zapis, tylko domyślny.

Stąd pokrycie stoi na dwóch nogach. `libs/components/src/public-api.spec.ts` importuje każdą bramkę pakietu, więc jej moduły wchodzą do przebiegu normalną drogą i plik bez testu pokazuje się z pokryciem bliskim zeru, zamiast wypaść ze statystyki. `tools/check-coverage.mjs` pilnuje, że w raporcie **nie brakuje ani jednego pliku źródłowego** — bo to mianownik cicho się kurczy, a procent zawsze wygląda zdrowo. Punkt 3 tej bramki jest jedynym, który łapie tę regresję; punkty o progu pilnują liczby, która z niej powstała.

Przy okazji dwie rzeczy zmierzone, nie założone. `coverageInclude` przyjmuje wzorce względem **korzenia repozytorium**, nie katalogu projektu, mimo tego, co mówi schemat executora: zapis `**/src/**` wciągnął do raportu biblioteki cały `apps/sandbox` (pokrycie 96,55% → 70,72%). A próg 80% jest **podłogą, nie zapadką**: przy 96,58% usunięcie samego `select.spec.ts` daje 81,55%, samego `number.spec.ts` — równo 80,00%, i oba przechodzą; dopiero obie naraz dają 64,96% i zapalają. Kto chce zapadki, musi ją napisać osobno — ta bramka jej nie obiecuje.

---

### <a id="lekcja-46"></a>`lekcja-46` — Deklaracja częściowa nie zapisuje wartości domyślnych, więc OnPush da się zmierzyć tylko po linkowaniu

**W zbudowanym pakiecie nie ma ani jednego `changeDetection:`, a mimo to każdy komponent linkuje się jako OnPush.** Kompilacja częściowa (`ɵɵngDeclareComponent`) zapisuje wyłącznie to, co odbiega od domyślnych — wartość powstaje dopiero u konsumenta, przy linkowaniu, z domyślnych **jego** Angulara. Wniosek jest niewygodny: obietnica „każdy komponent jest OnPush" nie da się sprawdzić ani w źródle (nic tam nie stoi — przewodnik v22+ wprost zabrania powtarzania domyślnych), ani w tekście bundla (tam też nic nie stoi). Jedyny odczyt, który cokolwiek znaczy, to `ɵcmp.onPush` **po** linkowaniu, a w Node odtwarza to `import '@angular/compiler'` przed wczytaniem pakietu — ten sam krok, który wykonuje konsument.

Stąd kształt bramki `check-zoneless`: mierzy `dist`, nie źródła. Efekt uboczny jest tym, o który chodziło — dzień, w którym Angular zmieni swoją wartość domyślną, jest dniem, w którym ta bramka zapala, bez czytania changelogu.

Przy okazji zmierzone, nie założone: dopisanie jawnego `standalone: true` do dekoratora **nie zmienia** `ɵɵngDeclareComponent` (deklaracja i tak niesie `isStandalone: true`) i rusza wyłącznie `ɵɵngDeclareClassMetadata` — echo dekoratora zostawiane dla debugowania. Cache Nx unieważnia się więc dziś także bez wpisania źródeł do `inputs`, ale za sprawą funkcji diagnostycznej, która nie jest niczyją obietnicą. Klucz cache ma wymieniać to, co bramka **czyta**, a nie to, co zwykle się przy okazji zmienia — inaczej powtórzy się `lekcja-44` w trzecim przebraniu.

I jeszcze jedno, tańsze: `git ls-files "*package.json"` wciąga także `ng-package.json`. Pathspec dopasowuje przyrostek, nie nazwę pliku. Fałszywego trafienia to nie dało — konfiguracja ng-packagr nie ma pól zależności — ale rozdęło mianownik w komunikacie bramki z 3 manifestów do 10, czyli sprawiło, że bramka kłamała o własnym zasięgu.

---

### <a id="lekcja-47"></a>`lekcja-47` — Target inferowany jest cudzą decyzją o zasięgu i wygląda dokładnie jak własna

**`sandbox` miał target `typecheck`, przechodził na zielono i nie oglądał czterech swoich plików.** Target dokładał `@nx/vite/plugin` (`typecheckTargetName: "typecheck"`), a jego polecenie brzmi `tsc --noEmit -p tsconfig.app.json` — czyli obejmuje konfigurację, która **wyklucza** `**/*.spec.ts`. Specyfikacje szły przez vitest, który transpiluje bez sprawdzania typów, więc `app.spec.ts`, `demo.spec.ts`, `test-setup.ts` i `vite.config.mts` nie przeszły przez kompilator ani razu. W `project.json` nie było przy tym **niczego** do zobaczenia: target nie jest tam zapisany.

To `lekcja-42` o piętro wyżej. Tam brakowało targetu i lista `nx affected -t typecheck` milczała; tutaj target jest, biegnie i sprawdza część projektu, a ta różnica nie objawia się nigdzie poza `--listFilesOnly`. Reguła: **target inferowany to decyzja wtyczki o tym, co jest projektem — nie moja.** Można ją przyjąć, ale trzeba ją najpierw zobaczyć, a `nx show project … --json` jest jedynym miejscem, gdzie widać.

Stąd kształt bramki `check-typecheck`: nie czyta `include` z tsconfiga, tylko **uruchamia polecenie z targetu** rozszerzone o `--listFilesOnly` i porównuje wynik z indeksem gita. Czytanie `include` mierzyłoby drugi raz tę samą deklarację, która w `lekcja-42` okazała się nieprawdziwa; `--showConfig` odpada z tego samego powodu, bo rozwija wzorce, ale nie widzi plików wciągniętych przez import.

Trzy rzeczy zmierzone przy okazji, nie założone:

- **Szczelina jest też MIĘDZY projektami.** `vitest.config.ts` i `vitest.workspace.ts` leżą w korzeniu i nie należą do żadnej biblioteki ani aplikacji, więc bramka chodząca po projektach byłaby na nie ślepa i orzekła „nie ma takiego kodu" dokładnie dlatego, że nie potrafi go zobaczyć. Punkt 1 przypisuje każdy plik do najgłębszego projektu-przedrostka i zapala na tych, którym żaden nie odpowiada.
- **Projekt roota jest affected przy każdej zmianie.** Sprawdzone `nx show projects --affected --files=…`: zarówno `libs/components/src/index.ts`, jak i `docs/plan.md`, jak i `project.json` nowego projektu dają w wyniku `@org/source`. Bramki workspace'owe (`check-docs`, `check-typecheck`) biegną więc w każdym przebiegu — inaczej nowy projekt bez targetu wymykałby się tej, która powstała właśnie po to.
- **Rozbrojenie punktu bywa wyjątkiem zamiast komunikatu.** Punkt 3 czytał `p.typecheck.polecenia` wprost, bo po punkcie 2 target „na pewno" istnieje. Wyłączenie punktu 2 w ramach kontroli tej kontroli zamieniło bramkę w `TypeError`, czyli kontrola odniesienia przestała umieć zbadać punkt, który miała zbadać. Zależność między punktami jest normalna; jej zapisanie tak, że jej naruszenie daje stack trace zamiast zdania — nie.

I jeszcze jedno, w rodzinie `lekcja-44`: **target sprawdzający specyfikacje nie może brać `inputs: ["production"]`**, bo ten namedInput odejmuje `**/*.spec.ts` — czyli dokładnie pliki, dla których go dołożono. Pomiar: dopisanie linii do `src/public-api.spec.ts` daje przy `default` `Cache: 0/1 hit`, a przy `production` `1/1 hit`. Przebieg jest w obu przypadkach zielony i w obu wygląda tak samo; różni się tym, czy kompilator w ogóle wystartował.

---

### <a id="lekcja-48"></a>`lekcja-48` — Dwa pomiary pilnujące się nawzajem muszą być NIEZALEŻNE, inaczej gasną razem

**Bramka stylów przeszła na zielono, wypisawszy „7 arkuszy, 0 komponentów".** Lista źródeł
brała się z `git ls-files 'libs/components/*/src/**/*.ts'`, a **pathspec gita nie jest
globem powłoki**: bez magii `:(glob)` gwiazdka przechodzi przez `/`, więc ten wzorzec żąda
o jeden katalog za dużo i nie dopasowuje `button/src/button.ts`. Zwraca zero plików — nie
błąd, nie ostrzeżenie, pustą listę.

Zero komponentów przeszło przez kontrolę mianownika, bo ta porównywała **liczbę
sparsowanych dekoratorów z liczbą wystąpień `@Component(`**. Obie strony wyszły zerowe,
zero równa się zeru, punkt orzekł „komplet". Lek jest ten sam, którego bramka pokrycia
używa na listę plików: zanim porówna się dwa zbiory, trzeba sprawdzić, że **któryś z nich
w ogóle coś zawiera**. Porównanie liczb jest na zero ślepe zawsze.

Gorszy wariant tej samej wady siedział w kontroli, która miała ją wykluczyć. Licznik był
zapisany jako `/^@Component\(/gm` — **co do znaku tą samą kotwicą co parser**. Sens
licznika polegał na tym, że mierzy niezależnie: parser kotwiczy się na formatowaniu
prettiera, a licznik ma zauważyć, gdy rzeczywistość od tego formatowania odjedzie.
Przy identycznej kotwicy przesunięcie dekoratora o **jedną spację** gasi jedno i drugie
naraz, obie strony zgadzają się o jeden niżej i bramka kończy zielono.

Zmierzone, nie wyrozumowane: `PctCheckbox` wcięty o spację dawał „7 komponentów" zamiast
ośmiu, przy przebiegu bez ani jednego naruszenia.

To samo zdanie stało w komentarzu przy tym kodzie — „bez tego zmiana formatowania nie
wywaliłaby parsera, tylko po cichu ZMNIEJSZYŁA mianownik" — i było nieprawdziwe od
początku. Komentarz opisywał zamiar, implementacja go nie realizowała, a **nic tego nie
sprawdzało, bo kontrola odniesienia tej bramki podaje dane, nie tekst źródła**: regex nie
biegnie na żadnym fixturze, wyłącznie na prawdziwym repozytorium. Dziura wyszła dopiero
z ręcznego przebiegu na zepsutym repo.

Ta sama wada była w `check-zoneless.mjs` ([`lekcja-46`](#lekcja-46)) i została naprawiona
razem z tą — tam kosztowała cichy brak pomiaru `OnPush` dla całego komponentu.

Reguła: **kontrola porównująca dwa pomiary jest warta tyle, ile ich niezależność.**
Skopiowanie wyrażenia z jednej strony na drugą zamienia ją w kontrolę tego, że pewna
stała równa się samej sobie — konstrukcja, która nigdy nie zapala i wygląda przy tym
dokładnie jak działająca. Do tego dochodzi wniosek o zasięgu kontroli odniesienia:
fixture podający **dane** nie bada kodu, który te dane wydobywa, więc ta warstwa musi
mieć własny dowód — przebieg na zepsutym repozytorium.
