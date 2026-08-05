# Wymagania — tokeny, stylowanie i motywy

Obszar scala trzy dawne sekcje, które opisywały **jedną warstwę** — a część punktów była
w nich zdublowana: dwie pary wymagań mówiły to samo innymi słowami. Mapowanie starych
identyfikatorów jest w
[tabeli migracji](../README.md#migracja-identyfikatorów-2026-07-27).

**Zasada nadrzędna: CSS-first, zero-runtime.** Motyw w runtime to wyłącznie kaskadowy
CSS — bez silnika JS generującego style. Stąd bierze się SSR-safety (brak FOUC
i rozjazdów hydracji), zerowy koszt w runtime i możliwość nadpisania zwykłym CSS-em.

> Kształt wpisu i znaczenie pól **Bramka** / **Kontrola** opisuje
> [README](../README.md#kształt-wymagania).

---

## Warstwa źródłowa

### <a id="wym-token-dtcg"></a>`wym-token-dtcg` — Źródłem prawdy jest format DTCG

**Obietnica.** Tokeny są zapisane w formacie W3C Design Tokens Community Group (JSON
z `$type` / `$value` i referencjami `{…}`). Format jest przenośny — czytany i zapisywany
przez narzędzia projektowe (Figma / Tokens Studio).

**Bramka:** `libs/tokens/build.mjs` — build nie ruszy przy niepoprawnym kształcie źródła
**Kontrola:** brak — świadomie: błąd parsowania jest natychmiastowy i głośny
**Lekcje:** [`lekcja-4`](../lekcje.md#lekcja-4)

---

### <a id="wym-token-artefakty"></a>`wym-token-artefakty` — Build generuje artefakty ze źródła

**Obietnica.** Ze źródła DTCG powstają: CSS z custom properties (dystrybuowane motywy),
mapy/funkcje SCSS do użytku wewnętrznego oraz typy/stałe TS z nazwami tokenów. TS jest
**generowany**, nie pisany ręcznie. `tokens.ts` emituje dwa kształty tej samej wiedzy:
`PctTokenName` (ścieżka DTCG) i `PctCssVar` (nazwa custom property).

**Bramka:** target `typecheck` projektu `sandbox-e2e` — pomocniki `tokenOf` / `rootToken`
przyjmują `PctCssVar`, więc literówka w nazwie tokenu jest **błędem kompilacji**, a nie
zielonym testem porównującym dwa puste łańcuchy
**Kontrola:** podmiana jednej nazwy na błędną daje 6 błędów typu — przebieg
udokumentowany w [`lekcja-43`](../lekcje.md#lekcja-43)
**Lekcje:** [`lekcja-42`](../lekcje.md#lekcja-42), [`lekcja-43`](../lekcje.md#lekcja-43)

> **Otwarte — martwy artefakt.** `_tokens.scss` jest generowany, wieziony w pakiecie
> i używany przez **zero linii kodu**: komponenty piszą `var(--pct-*)` surowymi
> łańcuchami (159 unikalnych, zero `@use` w arkuszach). Albo usunąć z wymagania
> i z pakietu, albo uczynić obowiązkową drogą odwołania do tokenu. Za drugim przemawia
> [`lekcja-43`](../lekcje.md#lekcja-43) (literówka ma być błędem kompilacji), choć tu
> akurat `check-package` łapie literówkę post factum — więc to nie żywa wada, tylko
> martwy artefakt w publikowanym pakiecie.

> **Otwarte — brak konsumenta zewnętrznego.** Typowanych nazw nie ma dziś kto użyć
> **po stronie konsumenta**, bo `@pacit/tokens` jest `private`. Wiąże z
> [`wym-token-skorka`](#wym-token-skorka).

---

### <a id="wym-token-poziomy"></a>`wym-token-poziomy` — Trzy poziomy tokenów

**Obietnica.**

- **prymitywne** — surowe wartości bez znaczenia (`--pct-blue-500`, `--pct-space-4`),
  rampy kolorów 50–950,
- **semantyczne** — intencja i stany (`--pct-primary`, `--pct-surface-100`,
  `--pct-text-muted`, `--pct-focus-ring`); **jedyna warstwa, którą musi znać autor
  motywu**,
- **komponentowe** — per komponent (`--pct-button-bg`); referują wyłącznie do
  semantycznych, **nigdy** do prymitywnych.

**Bramka:** `libs/tokens/build.mjs` — tokeny komponentowe są auto-odkrywane
(`component.*.json`), więc dodanie komponentu nie wymaga zmian w buildzie
**Kontrola:** brak — luka: nic nie zapala, gdy token komponentowy odwoła się wprost do
prymitywnego. To reguła warstwowa sprawdzalna jednym przejściem po grafie referencji
**Wiąże przy:** pierwszym motywie budowanym z zewnątrz — złamanie tej reguły odbiera
autorowi motywu warstwę, przez którą miał sterować

---

### <a id="wym-token-referencje"></a>`wym-token-referencje` — Referencje zostają jako `var()`

**Obietnica.** Referencje token → token są zachowywane w wygenerowanym CSS jako `var()`,
a nie rozwijane do wartości. Każdy poziom emituje `var()` do poziomu niżej — dzięki czemu
nadpisanie jednej zmiennej w dowolnym scope kaskaduje samo.

**Bramka:** `apps/sandbox-e2e/src/theme.spec.ts` — nadpisanie tokenu semantycznego
zmienia komponentowy
**Kontrola:** test porównuje token komponentowy w `:root` **i** w scope — sam token
semantyczny przechodził mimo zepsutej warstwy komponentowej
([`lekcja-17`](../lekcje.md#lekcja-17))
**Lekcje:** [`lekcja-17`](../lekcje.md#lekcja-17)

---

### <a id="wym-token-domkniecie"></a>`wym-token-domkniecie` — Blok motywu zawiera domknięcie przechodnie

**Obietnica.** Build emituje w bloku motywu (np. `[data-theme="dark"]`) nie tylko
nadpisane tokeny semantyczne, ale **wszystkie tokeny, które od nich zależą** —
bezpośrednio lub przez łańcuch referencji.

**Bramka:** `apps/sandbox-e2e/src/theme.spec.ts` — token **komponentowy** porównywany
w `:root` i w scope
**Kontrola:** przebieg z [`lekcja-17`](../lekcje.md#lekcja-17): przed poprawką
`--pct-surface` był poprawnie ciemny, a `--pct-button-bg` i `--pct-select-panel-bg`
zwracały wartości jasne — bramka na samym tokenie semantycznym **przechodziła**
**Decyzja:** [0012 — domknięcie przechodnie w bloku motywu](../decyzje/0012-domkniecie-motywu.md)
**Lekcje:** [`lekcja-17`](../lekcje.md#lekcja-17)

> Powód jest w mechanice CSS: custom properties są podstawiane **w miejscu deklaracji**,
> nie użycia. Token `--a: var(--b)` zadeklarowany w `:root` dziedziczy już rozwiniętą
> wartość, więc nadpisanie `--b` w zagnieżdżonym scope go nie zmieni.

---

### <a id="wym-token-nazwy"></a>`wym-token-nazwy` — Nazwa tokenu daje się zgadnąć

**Obietnica.** Schemat `--pct-{komponent}-{część}-{właściwość}-{stan}` (np.
`--pct-button-bg-hover`), tak by token dało się zgadnąć **bez dokumentacji**.

**Bramka:** brak — luka: snapshot nazw tokenów (`tokens.ts` już jest generowany —
zostaje dołożyć bramkę na niezaakceptowaną zmianę)
**Kontrola:** brak — luka: zmiana nazwy tokenu bez aktualizacji snapshotu musi zapalić
**Wiąże przy:** natychmiast — nazwy tokenów są publicznym API motywu tak samo jak
[`wym-api-czesci`](api.md#wym-api-czesci)

> Ta sama reguła obowiązuje **identyfikatory wymagań** — i to z niej wzięło się
> odejście od numerów. Patrz [README](../README.md#dlaczego-slugi-a-nie-numery).

---

## Kontrast i stany

### <a id="wym-token-pary-tekstu"></a>`wym-token-pary-tekstu` — Powierzchnia ma odpowiadający token tekstu

**Obietnica.** Dla każdej powierzchni istnieje odpowiadający token tekstu (`--pct-on-*`,
np. `--pct-on-primary`).

**Bramka:** `libs/tokens/src/contrast.policy.json` + silnik w `libs/tokens/build.mjs` —
para bez wpisu w policy nie jest liczona, więc brak wpisu jest brakiem pokrycia
**Kontrola:** brak — luka: nic nie zapala, gdy **powstanie nowa powierzchnia bez pary**.
To ta sama klasa co [`lekcja-33`](../lekcje.md#lekcja-33): bramka bada wyłącznie to, co
ktoś wcześniej wpisał
**Wiąże przy:** natychmiast — koszt to porównanie listy powierzchni z listą par w policy

---

### <a id="wym-token-kontrast"></a>`wym-token-kontrast` — Bramka kontrastu jako policy skórki

**Obietnica.** Definicja skórki zawiera policy — listę par `fg`/`bg` (rola × stan)
z poziomem WCAG i `severity`. Podczas budowania skórki, dla każdego motywu, bramka liczy
kontrast wobec progów WCAG 2.2 (tekst normalny AA 4.5:1, duży AA 3:1, elementy UI
SC 1.4.11 3:1), blokuje build przy `severity: error`, ostrzega przy `warn` i zwraca
komunikat, **który wariant rozmiaru przechodzi, a który nie**.

**Bramka:** `libs/tokens/build.mjs` (target `tokens:build`, w CI przez `^build`)
**Kontrola:** przebieg z [`lekcja-6`](../lekcje.md#lekcja-6): pierwotny guard przepuścił
`disabled` o realnym kontraście ~1,6:1 — bramka ma udokumentowany przypadek, w którym
**nie zapaliła**, i poprawkę, która to zmieniła
**Lekcje:** [`lekcja-6`](../lekcje.md#lekcja-6), [`lekcja-10`](../lekcje.md#lekcja-10)

---

### <a id="wym-token-bez-opacity"></a>`wym-token-bez-opacity` — Stany nie używają `opacity`

**Obietnica.** Każdy stan (hover, active, disabled, …) ma własne, konkretne tokeny
koloru. `opacity` jest **zakazana dla warstw tekstowych**, bo zmienia kontrast w runtime
w sposób niewidoczny dla bramki (kompozycja z tłem).

**Bramka:** `tools/check-styles.mjs` (target `check-styles`, w CI) — punkt 6: `opacity`
w arkuszach biblioteki wolno wyłącznie jako przełącznik widoczności (`0` albo `1`).
Każda wartość pomiędzy **komponuje z tłem**, czyli przesuwa kontrast realny poza wynik
bramki kontrastu; wartość niedosłowna (`var(...)`, `calc(...)`) jest nierozstrzygalna
statycznie, więc też zapala. Rodzina obejmuje warianty SVG (`fill-opacity`,
`stroke-opacity`), bo kompozycja jest ta sama, tylko nazwa inna
**Kontrola:** `tools/check-styles.fixtures/opacity-czesciowa/` (stan wyrażony przez
`opacity: 0.6`) i `opacity-ze-zmiennej/` (wartość z tokenu). Do tego przebieg na
repozytorium: `opacity: 0` w `checkbox.scss` zmienione na `0.45` zapala punkt 6
**Wiąże przy:** natychmiast — to obietnica, której złamanie **cofa**
[`wym-token-kontrast`](#wym-token-kontrast) do stanu sprzed
[`lekcja-6`](../lekcje.md#lekcja-6), i to po cichu

> Świadomie przepuszczone jest `transition: opacity` i przejście 0 → 1. Stan przelotny
> nie jest tym, o czym mówi [`wym-token-kontrast`](#wym-token-kontrast), a zakaz
> obejmujący animacje odebrałby jedyny standardowy sposób wprowadzania nakładek.

**Lekcje:** [`lekcja-6`](../lekcje.md#lekcja-6)

---

## Motywy

### <a id="wym-token-css"></a>`wym-token-css` — Tokeny kompilują się do natywnych custom properties

**Obietnica.** Stylowanie i theming opierają się o design tokens tłumaczone na natywne
CSS custom properties. Zmiana motywu **nie wymaga rekompilacji SCSS** ani silnika JS.

**Bramka:** `apps/sandbox-e2e/src/theme.spec.ts`,
`libs/components/check-package.mjs` (punkt 3: domknięcie tokenów w artefakcie)
**Kontrola:** `tools/check-package.fixtures/token-bez-deklaracji/` — pakiet, w którym użyty
`var(--pct-*)` nie ma nigdzie deklaracji, musi zapalić punkt 3. Przeglądarka podstawiłaby
za niego wartość początkową, więc bez tej kontroli awaria jest niewidoczna
**Lekcje:** [`lekcja-18`](../lekcje.md#lekcja-18), [`lekcja-36`](../lekcje.md#lekcja-36)

---

### <a id="wym-token-scss"></a>`wym-token-scss` — Wewnętrznie używamy SCSS

**Obietnica.** Style biblioteki i aplikacji w workspace korzystają z SCSS.

**Bramka:** brak — świadomie: rozszerzenie pliku jest widoczne w review, a arkusz
w innym języku nie zbudowałby się
**Kontrola:** nie dotyczy

---

### <a id="wym-token-nadpisanie"></a>`wym-token-nadpisanie` — Tokeny można nadpisać dla wybranych komponentów

**Obietnica.** Nadpisanie tokenu semantycznego przethemowuje wszystko poniżej; nadpisanie
komponentowego (`--pct-button-bg`) zmienia tylko dany komponent.

**Bramka:** `apps/sandbox-e2e/src/theme.spec.ts`
**Kontrola:** jak w [`wym-token-domkniecie`](#wym-token-domkniecie) — porównanie tokenu
komponentowego, nie semantycznego
**Lekcje:** [`lekcja-17`](../lekcje.md#lekcja-17)

---

### <a id="wym-token-scoped"></a>`wym-token-scoped` — Motyw dla części aplikacji

**Obietnica.** Inny motyw dla poddrzewa (scoped theme) realizowany kaskadą custom
properties na wybranym elemencie (`[data-theme="dark"]`, `.pct-theme-x`), bez
rekompilacji i bez silnika JS. Nakładki renderowane poza drzewem hosta dostają motyw
**przeniesiony jawnie**.

**Bramka:** `apps/sandbox-e2e/src/theme.spec.ts`, `apps/sandbox-e2e/src/a11y.spec.ts`
(„panel ze scoped theme (ciemny) jest bez naruszeń"). Każda karta sandboxa ustawia motyw
na **własnej scenie**, więc każdy przykład jest przy okazji testem scoped theme
**Kontrola:** patrz [`wym-token-domkniecie`](#wym-token-domkniecie)
**Lekcje:** [`lekcja-17`](../lekcje.md#lekcja-17), [`lekcja-18`](../lekcje.md#lekcja-18)

---

### <a id="wym-token-dyrektywa"></a>`wym-token-dyrektywa` — Dyrektywa-cukier `[pctTheme]`

**Obietnica.** Ustawianie motywu z szablonu przez dyrektywę `[pctTheme]`. Mechanizmem
bazowym pozostaje sama kaskada — dyrektywa jest wygodą, nie warunkiem.

**Bramka:** brak — luka: dyrektywy nie ma, motyw ustawia się ręcznym `data-theme`
**Kontrola:** brak — luka: motyw ustawiony dyrektywą i motyw ustawiony atrybutem muszą dać ten sam wynik
**Wiąże przy:** gdy ustawianie `data-theme` z szablonu zacznie się powtarzać

---

### <a id="wym-token-system"></a>`wym-token-system` — Motyw idzie za systemem, dopóki nikt nie powie inaczej

**Obietnica.** Build emituje
`@media (prefers-color-scheme: dark) { :root:not([data-theme]) { … } }` — strona bez
jawnej deklaracji dostaje ciemny motyw z pudełka. Selektor `:not([data-theme])` czyni
z preferencji systemu **wartość domyślną, nie rozkaz**.

**Bramka:** `apps/sandbox-e2e/src/preferences.spec.ts`
**Kontrola:** `preferences.spec.ts › „bez preferencji ciemnej :root zostaje jasny
(odniesienie)"` — kontrola odniesienia jest **osobnym testem**, nie asercją wewnątrz
testu właściwego
**Lekcje:** [`lekcja-38`](../lekcje.md#lekcja-38)

> Mechanizm składa się z zagnieżdżeniem tylko dlatego, że `light` jest tu **czynnym
> motywem**, a nie brakiem atrybutu: blok `[data-theme="light"]` niesie pełne
> przeciwnadpisania, więc jasna karta na ciemnym systemie ma czym cofnąć wartości
> odziedziczone z `:root`.

---

### <a id="wym-token-skorka"></a>`wym-token-skorka` — Skórka jest w pełni parametryzowana

**Obietnica.** Autor motywu definiuje wszystkie kolory wszystkich stanów. Komponenty nie
mają wbudowanych kolorów i nie przyciemniają stanów przez `opacity`. Budowanie skórki
uruchamia [bramkę kontrastu](#wym-token-kontrast), która daje autorowi konkretny raport.

**Bramka:** `libs/tokens/build.mjs` — ale **wyłącznie dla skórki wbudowanej**
**Kontrola:** patrz [`wym-token-kontrast`](#wym-token-kontrast)
**Wiąże przy:** gdy ktoś zechce własny motyw — **nie ma dziś ścieżki**, którą osoba
z zewnątrz zbudowałaby skórkę: `build.mjs` czyta sztywny zestaw plików z `libs/tokens/src`,
a pakiet `@pacit/tokens` jest `private`. Sandbox ma już oś skórki z jedną pozycją
(`base`) czekającą na tę ścieżkę

---

### <a id="wym-token-dystrybucja"></a>`wym-token-dystrybucja` — Motywy jako zwykłe pliki CSS

**Obietnica.** Motywy dystrybuowane jako pliki CSS (`@pacit/components/themes/…`),
importowane bez konfiguracji JS.

**Bramka:** `libs/components/check-package.mjs` — punkty 1 i 2: skórka jest w pakiecie
i **osiągalna importem** (mapa `exports` jest zamknięta; plik bez wpisu jest dla
konsumenta niewidoczny)
**Kontrola:** `tools/check-package.fixtures/brak-skorki/` — pakiet bez skórki musi zapalić
punkt 1, a `tools/check-package.fixtures/skorka-poza-exports/` — skórka poza mapą `exports`
punkt 2. Przebieg z [`lekcja-36`](../lekcje.md#lekcja-36) był ręczny
**Lekcje:** [`lekcja-36`](../lekcje.md#lekcja-36)

---

## Osie

### <a id="wym-token-gestosc"></a>`wym-token-gestosc` — Oś gęstości

**Obietnica.** Osobny wymiar tokenów (`comfortable` / `compact`) przełączany
atrybutem/scope, niezależny od motywu kolorystycznego.

**Bramka:** brak — luka: w źródłach DTCG nie ma **ani jednego** tokenu gęstości
**Kontrola:** brak — luka: układ z tokenem gęstości `compact` musi przejść próg obszaru dotyku, inaczej bramka ma zapalić
**Wiąże przy:** po ustabilizowaniu osi wielkości. Uwaga: gęstość zejdzie poniżej progu
obszaru dotyku **szybciej** niż wielkość `sm`, więc razem z nią trzeba przetestować
`--pct-target-min` ([`wym-a11y-dotyk`](a11y.md#wym-a11y-dotyk))

> Oś wielkości ([`wym-api-wielkosc`](api.md#wym-api-wielkosc)) jest gotowym wzorcem do
> powtórzenia.

---

### <a id="wym-token-logiczne"></a>`wym-token-logiczne` — Arkusze używają wyłącznie właściwości logicznych

**Obietnica.** Arkusze biblioteki używają wyłącznie właściwości logicznych
(`padding-inline-start`, nie `padding-left`). Układ **odbija się** w `dir="rtl"`.
Wyjątki wyłącznie z komentarzem uzasadniającym.

**Bramka:** `tools/check-styles.mjs` (target `check-styles`, w CI) — punkt 5: zakaz
właściwości fizycznych osi inline (`left`/`right`, `margin-*`, `padding-*`, `border-*`,
promienie narożników, `direction`, wielowartościowy `inset`) oraz fizycznych WARTOŚCI
(`text-align`, `float`, `clear`). Oś block (`top`/`bottom`) świadomie poza listą: `rtl`
odbija wyłącznie oś inline, a pełne bidi jest [nie-celem](../00-os.md#jawne-nie-cele).
Wyjątek wymaga znacznika `/* pct-wyjatek <właściwość>: <powód> */` przylegającego do
deklaracji — punkt 4 zapala na znaczniku bez uzasadnienia i na takim, który nie trafia
w żadną deklarację
**Kontrola:** `tools/check-styles.fixtures/padding-fizyczny/` (nazwa właściwości)
i `text-align-fizyczny/` (wartość); dla wyjątków `wyjatek-bez-uzasadnienia/`
i `wyjatek-bez-uzycia/`. Do tego przebiegi na repozytorium: `padding-inline-start`
zamienione na `padding-left` w `field.scss` zapala, usunięcie znacznika wyjątku nad
`left: 50%` w `radio.scss` zapala, a `margin-right` schowany w mixinie z interpolacją
zapala punkt 2 — porównanie tekstu źródła z tym, co z niego wypisuje sass
**Lekcje:** [`lekcja-48`](../lekcje.md#lekcja-48)

> **Bramka arkuszy to warunek konieczny, nie wystarczający.** Arkusz może być bez zarzutu
> logiczny, a układ i tak się nie odbić — bo kierunek nie dociera tam, gdzie powinien.
> Zmierzone przy tej okazji: panel selecta żyje w nakładce CDK, czyli jako dziecko `body`,
> więc w `dir="rtl"` trigger pisał od prawej, a lista pod nim od lewej, przy `text-align:
start` w arkuszu ([`lekcja-35`](../lekcje.md#lekcja-35) — trzecia właściwość dziedziczona
> po motywie i piśmie). Dlatego obietnicy pilnują trzy rzeczy naraz: bramka arkuszy,
> zrzuty w `dir="rtl"` (`apps/sandbox-e2e/src/visual.spec.ts`) i pomiary układu
> (`rtl.spec.ts`, `a11y.spec.ts` — audyt axe na każdym widoku w RTL).
>
> Oś `dir` jest osią przekrojową sandboxa jak motyw i wielkość: przestawia się ją
> w pasku globalnym albo na pojedynczej karcie.
>
> **Nie ma tu dywidendy do zainkasowania z rezygnacji**: `padding-inline-start` nie jest
> dłuższe od `padding-left`, więc rezygnacja nie oszczędziłaby ani jednej linii —
> odebrałaby tylko gwarancję.
>
> Realny koszt RTL leży przy **przyszłych** komponentach: strzałki Lewo/Prawo muszą się
> zamieniać w układach poziomych (tabs, slider, carousel), nakładki muszą się odbijać
> (CDK `Directionality`), `scrollLeft` ma inny znak.
>
> Świadomie wyłączone jest **pełne bidi**, nie RTL — patrz
> [nie-cele](../00-os.md#jawne-nie-cele).
