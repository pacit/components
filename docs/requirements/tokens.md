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

### <a id="req-token-dtcg"></a>`req-token-dtcg` — Źródłem prawdy jest format DTCG

**Obietnica.** Tokeny są zapisane w formacie W3C Design Tokens Community Group (JSON
z `$type` / `$value` i referencjami `{…}`). Format jest przenośny — czytany i zapisywany
przez narzędzia projektowe (Figma / Tokens Studio).

**Bramka:** `libs/tokens/build.mjs` — build nie ruszy przy niepoprawnym kształcie źródła
**Kontrola:** brak — świadomie: błąd parsowania jest natychmiastowy i głośny
**Lekcje:** [`lesson-4`](../lessons.md#lesson-4)

---

### <a id="req-token-artifacts"></a>`req-token-artifacts` — Build generuje artefakty ze źródła

**Obietnica.** Ze źródła DTCG powstają: CSS z custom properties (dystrybuowane motywy),
mapy/funkcje SCSS do użytku wewnętrznego oraz typy/stałe TS z nazwami tokenów. TS jest
**generowany**, nie pisany ręcznie. `tokens.ts` emituje dwa kształty tej samej wiedzy:
`PctTokenName` (ścieżka DTCG) i `PctCssVar` (nazwa custom property).

**Bramka:** target `typecheck` projektu `sandbox-e2e` — pomocniki `tokenOf` / `rootToken`
przyjmują `PctCssVar`, więc literówka w nazwie tokenu jest **błędem kompilacji**, a nie
zielonym testem porównującym dwa puste łańcuchy
**Kontrola:** podmiana jednej nazwy na błędną daje 6 błędów typu — przebieg
udokumentowany w [`lesson-43`](../lessons.md#lesson-43)
**Lekcje:** [`lesson-42`](../lessons.md#lesson-42), [`lesson-43`](../lessons.md#lesson-43)

> **Otwarte — martwy artefakt.** `_tokens.scss` jest generowany, wieziony w pakiecie
> i używany przez **zero linii kodu**: komponenty piszą `var(--pct-*)` surowymi
> łańcuchami (159 unikalnych, zero `@use` w arkuszach). Albo usunąć z wymagania
> i z pakietu, albo uczynić obowiązkową drogą odwołania do tokenu. Za drugim przemawia
> [`lesson-43`](../lessons.md#lesson-43) (literówka ma być błędem kompilacji), choć tu
> akurat `check-package` łapie literówkę post factum — więc to nie żywa wada, tylko
> martwy artefakt w publikowanym pakiecie.

> **Otwarte — brak konsumenta zewnętrznego.** Typowanych nazw nie ma dziś kto użyć
> **po stronie konsumenta**, bo `@pacit/tokens` jest `private`. Wiąże z
> [`req-token-skin`](#req-token-skin).

---

### <a id="req-token-tiers"></a>`req-token-tiers` — Trzy poziomy tokenów

**Obietnica.**

- **prymitywne** — surowe wartości bez znaczenia (`--pct-blue-500`, `--pct-space-4`),
  rampy kolorów 50–950,
- **semantyczne** — intencja i stany (`--pct-primary`, `--pct-surface-100`,
  `--pct-text-muted`, `--pct-focus-ring`); **jedyna warstwa, którą musi znać autor
  motywu**,
- **komponentowe** — per komponent (`--pct-button-bg`); referują wyłącznie do
  semantycznych, **nigdy** do prymitywnych.

Graf referencji idzie więc **tylko w dół**: komponentowy → semantyczny → prymitywny →
literał. Odwołanie w bok (token komponentowy jednego komponentu na token drugiego) łamie
przy okazji [`req-token-override`](#req-token-override), a odwołanie w górę
(semantyczny na komponentowy) odwraca cały model.

**Bramka:** `tools/check-tokens.mjs` (target `check-tokens` w projekcie roota, w CI) —
punkt 6. Dla **koloru** reguła nie ma ani jednego wyjątku: nad kolorem warstwa
semantyczna istnieje i jest kompletna, więc kolor komponentowy wskazujący na prymityw
albo wpisany wprost jako literał zapala. Dla **wymiaru** wyjątkiem są osie zadeklarowane
w `libs/tokens/src/poziomy.policy.json` (dziś `control`, `font`, `radius`, `space`,
`target`), a sama lista jest pilnowana z dwóch stron: oś nieużywana zapala, oś niosąca
token `$type: color` zapala już na deklaracji. Do tego `libs/tokens/build.mjs` —
auto-odkrywanie `component.*.json`, więc dodanie komponentu nie wymaga zmian w buildzie
**Kontrola:** `tools/check-tokens.fixtures/` — po jednym wejściu na regułę:
`kolor-pod-semantyka`, `literal-koloru`, `odwolanie-w-bok`, `odwolanie-w-gore`,
`prymityw-z-referencja`, `os-wspolna-martwa`, `os-wspolna-kolorowa`,
`os-niezadeklarowana`; plus przebiegi na
repozytorium: `--pct-button-bg` przestawiony na `{pct.blue.600}`, kolor pola wpisany
z palca, `--pct-select-bg` wskazujący na `{pct.field.bg}`, oś `space` usunięta z polityki
(15 naruszeń), oś `motion` dopisana bez użycia

> **Wyjątek dla osi wymiaru jest zapisany, a nie milczący.** Reguła w brzmieniu
> dosłownym była w tym repozytorium złamana **35 razy** — każdy token wymiaru
> komponentowego wskazuje wprost na prymityw, bo nad wymiarem nie ma warstwy
> semantycznej i nie da się jej dołożyć bez wymyślenia ról, których nikt nie potrzebuje.
> `pct.control.height.md` nie jest przy tym „surową wartością bez znaczenia": jest
> wspólną osią przycisku i wiersza pola ([`req-api-size`](api.md#req-api-size)),
> czyli tym samym leverem, którym miałaby być semantyka. Bramka pisana bez tego zapisu
> musiałaby albo zapalać na całym repozytorium, albo cicho nie badać wymiaru.

---

### <a id="req-token-references"></a>`req-token-references` — Referencje zostają jako `var()`

**Obietnica.** Referencje token → token są zachowywane w wygenerowanym CSS jako `var()`,
a nie rozwijane do wartości. Każdy poziom emituje `var()` do poziomu niżej — dzięki czemu
nadpisanie jednej zmiennej w dowolnym scope kaskaduje samo.

**Bramka:** `apps/sandbox-e2e/src/theme.spec.ts` — nadpisanie tokenu semantycznego
zmienia komponentowy
**Kontrola:** test porównuje token komponentowy w `:root` **i** w scope — sam token
semantyczny przechodził mimo zepsutej warstwy komponentowej
([`lesson-17`](../lessons.md#lesson-17))
**Lekcje:** [`lesson-17`](../lessons.md#lesson-17)

---

### <a id="req-token-closure"></a>`req-token-closure` — Blok motywu zawiera domknięcie przechodnie

**Obietnica.** Build emituje w bloku motywu (np. `[data-theme="dark"]`) nie tylko
nadpisane tokeny semantyczne, ale **wszystkie tokeny, które od nich zależą** —
bezpośrednio lub przez łańcuch referencji.

**Bramka:** `apps/sandbox-e2e/src/theme.spec.ts` — token **komponentowy** porównywany
w `:root` i w scope
**Kontrola:** przebieg z [`lesson-17`](../lessons.md#lesson-17): przed poprawką
`--pct-surface` był poprawnie ciemny, a `--pct-button-bg` i `--pct-select-panel-bg`
zwracały wartości jasne — bramka na samym tokenie semantycznym **przechodziła**
**Decyzja:** [0012 — domknięcie przechodnie w bloku motywu](../decisions/0012-theme-closure.md)
**Lekcje:** [`lesson-17`](../lessons.md#lesson-17)

> Powód jest w mechanice CSS: custom properties są podstawiane **w miejscu deklaracji**,
> nie użycia. Token `--a: var(--b)` zadeklarowany w `:root` dziedziczy już rozwiniętą
> wartość, więc nadpisanie `--b` w zagnieżdżonym scope go nie zmieni.

---

### <a id="req-token-names"></a>`req-token-names` — Nazwa tokenu daje się zgadnąć

**Obietnica.** Schemat `--pct-{komponent}-{część}-{właściwość}-{wariant}` (np.
`--pct-button-bg-hover`), tak by token dało się zgadnąć **bez dokumentacji**. Wariant —
stan (`hover`, `disabled`) albo wielkość (`sm`, `lg`) — stoi **zawsze na końcu**;
`md` nie występuje, bo jest wartością bazową ([`req-api-size`](api.md#req-api-size)).
Warstwa semantyczna ma własny, płaski kształt `[on-]{rola}[-{wariant}]`, a prymitywna
jest ścieżką DTCG jeden do jednego.

**Bramka:** `tools/check-tokens.mjs` (target `check-tokens` w projekcie roota, w CI) —
pięć punktów. Punkt 3 parsuje każdą nazwę wobec słownika w
`libs/tokens/src/nazwy.policy.json` i wymaga, żeby komponent w nazwie był prawdziwym
entrypointem pakietu; punkt 5 porównuje `libs/tokens/tokens.snapshot.md` z bieżącą listą.
Punkty 1, 2 i 4 pilnują mianownika: dwa niezależne odczyty listy (`dist/pct.css` wobec
źródeł DTCG), zgodność `tokens.ts` i `_tokens.scss` z tą listą oraz zakaz martwych słów
w słowniku
**Kontrola:** `tools/check-tokens.fixtures/` — jedenaście wejść, każde odrzucane na swoim
punkcie; plus przebiegi na repozytorium: przemianowanie na inną poprawną nazwę zapala
punkt 5, `disabled-bg` zamiast `bg-disabled` — punkt 3, `component.dialog.json` bez
entrypointu — punkt 3, nieaktualne `dist` — punkt 1, słowo dopisane do słownika bez
użycia — punkt 4

> Ta sama reguła obowiązuje **identyfikatory wymagań** — i to z niej wzięło się
> odejście od numerów. Patrz [README](../README.md#dlaczego-slugi-a-nie-numery).

> **Sam snapshot tego nie domyka — zamraża.** Bramka powstała 2026-08-05 i zastała
> 34 tokeny z segmentami w odwrotnej kolejności (`--pct-checkbox-checked-bg` obok
> `--pct-checkbox-border-hover` w tym samym pliku), więc znając jedną nazwę nie dało
> się zgadnąć siostrzanej. Snapshot dołożony przed normalizacją zapisałby ten rozjazd
> jako stan zaakceptowany. Stąd punkt 3 **przed** punktem 5 — i stąd normalizacja
> wykonana tym samym ruchem co bramka.

---

## Kontrast i stany

### <a id="req-token-text-pairs"></a>`req-token-text-pairs` — Powierzchnia ma odpowiadający token tekstu

**Obietnica.** Każdy kolor, który biblioteka **maluje** — tłem, tekstem albo obrysem —
ma w `libs/tokens/src/contrast.policy.json` parę, wobec której jest mierzony. Tam, gdzie
powierzchnia jest odwrócona względem strony, tekst dla niej nazywa się `--pct-on-*`
(`--pct-on-primary`), a taka para musi mieć obie strony: istniejącą rolę i realne użycie.

**Bramka:** `tools/check-tokens.mjs` (target `check-tokens` w projekcie roota, w CI) —
punkt 7. Mianownikiem nie jest lista nazw kończących się na `-bg` i `-fg`, tylko wyjście
**sassa** dla arkuszy `libs/components`: token wniesiony mixinem albo przypisany do innej
custom property też maluje. Reguła `on-*` czyta za to nazwy, bo para zadeklarowana
i nigdy nienamalowana nie zostawia w arkuszu śladu. Progi liczy dalej
`libs/tokens/build.mjs` ([`req-token-contrast`](#req-token-contrast)) — ten punkt pilnuje
wyłącznie tego, żeby miał co liczyć
**Kontrola:** `tools/check-tokens.fixtures/` — `kolor-niezmierzony` (arkusz maluje tłem
token spoza policy), `para-usunieta-z-policy` (ta sama reguła od drugiej strony),
`on-para-martwa`, `on-bez-powierzchni`, `wymiar-malowany-kolorem`, `token-spoza-skorki`
oraz `arkusz-usuniety` na mianownik; plus przebiegi na repozytorium: nowa deklaracja
`background: var(--pct-surface-disabled)` w `button.scss` zapala, usunięcie pary
`button/solid — etykieta` z policy zapala, przywrócenie martwego `--pct-on-danger` zapala
po przyjęciu snapshotu

> **Do 2026-08-05 policy milczała o 27 kolorach.** Bramka kontrastu liczyła 38 par
> i była zielona; poza jej zasięgiem stały wszystkie stany hover i disabled przycisku,
> komunikaty błędu checkboxa, radia i selecta oraz siedem obramowań — a także dwa
> tokeny **semantyczne** malowane wprost przez wariant outline (`--pct-surface-100` pod
> etykietą `--pct-primary`), których żadna reguła oparta na nazwie tokenu komponentowego
> nie potrafiłaby zobaczyć. To jest ta sama klasa co [`lesson-33`](../lessons.md#lesson-33):
> bramka bada wyłącznie to, co ktoś wcześniej wpisał.
>
> Dopisanie brakujących par **od razu wywróciło build**: trzy z nich nie przechodziły AA
> w motywie ciemnym (etykieta przycisku na hover 3,45:1, na active 2,66:1, etykieta
> wariantu outline na hover 3,98:1) — patrz [`lesson-52`](../lessons.md#lesson-52).

---

### <a id="req-token-contrast"></a>`req-token-contrast` — Bramka kontrastu jako policy skórki

**Obietnica.** Definicja skórki zawiera policy — listę par `fg`/`bg` (rola × stan)
z poziomem WCAG i `severity`. Podczas budowania skórki, dla każdego motywu, bramka liczy
kontrast wobec progów WCAG 2.2 (tekst normalny AA 4.5:1, duży AA 3:1, elementy UI
SC 1.4.11 3:1), blokuje build przy `severity: error`, ostrzega przy `warn` i zwraca
komunikat, **który wariant rozmiaru przechodzi, a który nie**.

**Bramka:** `libs/tokens/build.mjs` (target `tokens:build`, w CI przez `^build`);
kompletność samej policy pilnuje `tools/check-tokens.mjs` punktem 7
([`req-token-text-pairs`](#req-token-text-pairs)) — bez niego ta bramka mierzy
wyłącznie to, co ktoś do niej wpisał
**Kontrola:** przebieg z [`lesson-6`](../lessons.md#lesson-6): pierwotny guard przepuścił
`disabled` o realnym kontraście ~1,6:1 — bramka ma udokumentowany przypadek, w którym
**nie zapaliła**, i poprawkę, która to zmieniła
**Lekcje:** [`lesson-6`](../lessons.md#lesson-6), [`lesson-10`](../lessons.md#lesson-10)

---

### <a id="req-token-no-opacity"></a>`req-token-no-opacity` — Stany nie używają `opacity`

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
[`req-token-contrast`](#req-token-contrast) do stanu sprzed
[`lesson-6`](../lessons.md#lesson-6), i to po cichu

> Świadomie przepuszczone jest `transition: opacity` i przejście 0 → 1. Stan przelotny
> nie jest tym, o czym mówi [`req-token-contrast`](#req-token-contrast), a zakaz
> obejmujący animacje odebrałby jedyny standardowy sposób wprowadzania nakładek.

**Lekcje:** [`lesson-6`](../lessons.md#lesson-6)

---

## Motywy

### <a id="req-token-css"></a>`req-token-css` — Tokeny kompilują się do natywnych custom properties

**Obietnica.** Stylowanie i theming opierają się o design tokens tłumaczone na natywne
CSS custom properties. Zmiana motywu **nie wymaga rekompilacji SCSS** ani silnika JS.

**Bramka:** `apps/sandbox-e2e/src/theme.spec.ts`,
`libs/components/check-package.mjs` (punkt 3: domknięcie tokenów w artefakcie)
**Kontrola:** `tools/check-package.fixtures/token-bez-deklaracji/` — pakiet, w którym użyty
`var(--pct-*)` nie ma nigdzie deklaracji, musi zapalić punkt 3. Przeglądarka podstawiłaby
za niego wartość początkową, więc bez tej kontroli awaria jest niewidoczna
**Lekcje:** [`lesson-18`](../lessons.md#lesson-18), [`lesson-36`](../lessons.md#lesson-36)

---

### <a id="req-token-scss"></a>`req-token-scss` — Wewnętrznie używamy SCSS

**Obietnica.** Style biblioteki i aplikacji w workspace korzystają z SCSS.

**Bramka:** brak — świadomie: rozszerzenie pliku jest widoczne w review, a arkusz
w innym języku nie zbudowałby się
**Kontrola:** nie dotyczy

---

### <a id="req-token-override"></a>`req-token-override` — Tokeny można nadpisać dla wybranych komponentów

**Obietnica.** Nadpisanie tokenu semantycznego przethemowuje wszystko poniżej; nadpisanie
komponentowego (`--pct-button-bg`) zmienia tylko dany komponent.

**Bramka:** `apps/sandbox-e2e/src/theme.spec.ts`
**Kontrola:** jak w [`req-token-closure`](#req-token-closure) — porównanie tokenu
komponentowego, nie semantycznego
**Lekcje:** [`lesson-17`](../lessons.md#lesson-17)

---

### <a id="req-token-scoped"></a>`req-token-scoped` — Motyw dla części aplikacji

**Obietnica.** Inny motyw dla poddrzewa (scoped theme) realizowany kaskadą custom
properties na wybranym elemencie (`[data-theme="dark"]`, `.pct-theme-x`), bez
rekompilacji i bez silnika JS. Nakładki renderowane poza drzewem hosta dostają motyw
**przeniesiony jawnie**.

**Bramka:** `apps/sandbox-e2e/src/theme.spec.ts`, `apps/sandbox-e2e/src/a11y.spec.ts`
(„panel ze scoped theme (ciemny) jest bez naruszeń"). Każda karta sandboxa ustawia motyw
na **własnej scenie**, więc każdy przykład jest przy okazji testem scoped theme
**Kontrola:** patrz [`req-token-closure`](#req-token-closure)
**Lekcje:** [`lesson-17`](../lessons.md#lesson-17), [`lesson-18`](../lessons.md#lesson-18)

---

### <a id="req-token-directive"></a>`req-token-directive` — Dyrektywa-cukier `[pctTheme]`

**Obietnica.** Ustawianie motywu z szablonu przez dyrektywę `[pctTheme]`. Mechanizmem
bazowym pozostaje sama kaskada — dyrektywa jest wygodą, nie warunkiem.

**Bramka:** brak — luka: dyrektywy nie ma, motyw ustawia się ręcznym `data-theme`
**Kontrola:** brak — luka: motyw ustawiony dyrektywą i motyw ustawiony atrybutem muszą dać ten sam wynik
**Wiąże przy:** gdy ustawianie `data-theme` z szablonu zacznie się powtarzać

---

### <a id="req-token-system"></a>`req-token-system` — Motyw idzie za systemem, dopóki nikt nie powie inaczej

**Obietnica.** Build emituje
`@media (prefers-color-scheme: dark) { :root:not([data-theme]) { … } }` — strona bez
jawnej deklaracji dostaje ciemny motyw z pudełka. Selektor `:not([data-theme])` czyni
z preferencji systemu **wartość domyślną, nie rozkaz**.

**Bramka:** `apps/sandbox-e2e/src/preferences.spec.ts`
**Kontrola:** `preferences.spec.ts › „bez preferencji ciemnej :root zostaje jasny
(odniesienie)"` — kontrola odniesienia jest **osobnym testem**, nie asercją wewnątrz
testu właściwego
**Lekcje:** [`lesson-38`](../lessons.md#lesson-38)

> Mechanizm składa się z zagnieżdżeniem tylko dlatego, że `light` jest tu **czynnym
> motywem**, a nie brakiem atrybutu: blok `[data-theme="light"]` niesie pełne
> przeciwnadpisania, więc jasna karta na ciemnym systemie ma czym cofnąć wartości
> odziedziczone z `:root`.

---

### <a id="req-token-skin"></a>`req-token-skin` — Skórka jest w pełni parametryzowana

**Obietnica.** Autor motywu definiuje wszystkie kolory wszystkich stanów. Komponenty nie
mają wbudowanych kolorów i nie przyciemniają stanów przez `opacity`. Budowanie skórki
uruchamia [bramkę kontrastu](#req-token-contrast), która daje autorowi konkretny raport.

**Bramka:** `libs/tokens/build.mjs` — ale **wyłącznie dla skórki wbudowanej**
**Kontrola:** patrz [`req-token-contrast`](#req-token-contrast)
**Wiąże przy:** gdy ktoś zechce własny motyw — **nie ma dziś ścieżki**, którą osoba
z zewnątrz zbudowałaby skórkę: `build.mjs` czyta sztywny zestaw plików z `libs/tokens/src`,
a pakiet `@pacit/tokens` jest `private`. Sandbox ma już oś skórki z jedną pozycją
(`base`) czekającą na tę ścieżkę

---

### <a id="req-token-distribution"></a>`req-token-distribution` — Motywy jako zwykłe pliki CSS

**Obietnica.** Motywy dystrybuowane jako pliki CSS (`@pacit/components/themes/…`),
importowane bez konfiguracji JS.

**Bramka:** `libs/components/check-package.mjs` — punkty 1 i 2: skórka jest w pakiecie
i **osiągalna importem** (mapa `exports` jest zamknięta; plik bez wpisu jest dla
konsumenta niewidoczny)
**Kontrola:** `tools/check-package.fixtures/brak-skorki/` — pakiet bez skórki musi zapalić
punkt 1, a `tools/check-package.fixtures/skorka-poza-exports/` — skórka poza mapą `exports`
punkt 2. Przebieg z [`lesson-36`](../lessons.md#lesson-36) był ręczny
**Lekcje:** [`lesson-36`](../lessons.md#lesson-36)

---

## Osie

### <a id="req-token-density"></a>`req-token-density` — Oś gęstości

**Obietnica.** Osobny wymiar tokenów (`comfortable` / `compact`) przełączany
atrybutem/scope, niezależny od motywu kolorystycznego.

**Bramka:** brak — luka: w źródłach DTCG nie ma **ani jednego** tokenu gęstości
**Kontrola:** brak — luka: układ z tokenem gęstości `compact` musi przejść próg obszaru dotyku, inaczej bramka ma zapalić
**Wiąże przy:** po ustabilizowaniu osi wielkości. Uwaga: gęstość zejdzie poniżej progu
obszaru dotyku **szybciej** niż wielkość `sm`, więc razem z nią trzeba przetestować
`--pct-target-min` ([`req-a11y-touch`](a11y.md#req-a11y-touch))

> Oś wielkości ([`req-api-size`](api.md#req-api-size)) jest gotowym wzorcem do
> powtórzenia.

---

### <a id="req-token-logical"></a>`req-token-logical` — Arkusze używają wyłącznie właściwości logicznych

**Obietnica.** Arkusze biblioteki używają wyłącznie właściwości logicznych
(`padding-inline-start`, nie `padding-left`). Układ **odbija się** w `dir="rtl"`.
Wyjątki wyłącznie z komentarzem uzasadniającym.

**Bramka:** `tools/check-styles.mjs` (target `check-styles`, w CI) — punkt 5: zakaz
właściwości fizycznych osi inline (`left`/`right`, `margin-*`, `padding-*`, `border-*`,
promienie narożników, `direction`, wielowartościowy `inset`) oraz fizycznych WARTOŚCI
(`text-align`, `float`, `clear`). Oś block (`top`/`bottom`) świadomie poza listą: `rtl`
odbija wyłącznie oś inline, a pełne bidi jest [nie-celem](../00-axis.md#jawne-nie-cele).
Wyjątek wymaga znacznika `/* pct-wyjatek <właściwość>: <powód> */` przylegającego do
deklaracji — punkt 4 zapala na znaczniku bez uzasadnienia i na takim, który nie trafia
w żadną deklarację
**Kontrola:** `tools/check-styles.fixtures/padding-fizyczny/` (nazwa właściwości)
i `text-align-fizyczny/` (wartość); dla wyjątków `wyjatek-bez-uzasadnienia/`
i `wyjatek-bez-uzycia/`. Do tego przebiegi na repozytorium: `padding-inline-start`
zamienione na `padding-left` w `field.scss` zapala, usunięcie znacznika wyjątku nad
`left: 50%` w `radio.scss` zapala, a `margin-right` schowany w mixinie z interpolacją
zapala punkt 2 — porównanie tekstu źródła z tym, co z niego wypisuje sass
**Lekcje:** [`lesson-48`](../lessons.md#lesson-48)

> **Bramka arkuszy to warunek konieczny, nie wystarczający.** Arkusz może być bez zarzutu
> logiczny, a układ i tak się nie odbić — bo kierunek nie dociera tam, gdzie powinien.
> Zmierzone przy tej okazji: panel selecta żyje w nakładce CDK, czyli jako dziecko `body`,
> więc w `dir="rtl"` trigger pisał od prawej, a lista pod nim od lewej, przy `text-align:
start` w arkuszu ([`lesson-35`](../lessons.md#lesson-35) — trzecia właściwość dziedziczona
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
> [nie-cele](../00-axis.md#jawne-nie-cele).
