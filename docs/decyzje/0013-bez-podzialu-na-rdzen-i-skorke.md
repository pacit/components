# 0013 — Bez podziału na rdzeń bezgłowy i skórkę

**Status:** przyjęta
**Realizuje:** [`wym-projekt-core`](../wymagania/projekt.md#wym-projekt-core),
[`wym-api-czesci`](../wymagania/api.md#wym-api-czesci),
[`wym-api-atrybuty`](../wymagania/api.md#wym-api-atrybuty)
**Dowód:** pomiar w repozytorium (sekcja „Kontekst") — nie lekcja. Ta decyzja **wyprzedza**
awarię zamiast po niej następować, i to jest wpisane wprost, bo dowód z pomiaru jest
słabszy niż dowód z przebiegu

## Kontekst

Rozważano rozcięcie biblioteki na dwie: bazową z logiką, ARIA, zachowaniami i stanami oraz
wizualną z szablonami i motywem. Motywacja była podwójna — kolejna skórka powstawałaby
przez „dopisanie tylko wyglądu", a `data-pct-part` przestałby być potrzebny jako kontrakt
zaawansowanego stylowania.

Ocena oparła się o trzy fakty zebrane w kodzie i w ekosystemie.

**1. Połowa tego podziału już istnieje.** `button[pctButton]`, `input[pctText]`
i `[pctNumber]` to komponenty atrybutowe na natywnych elementach z pustym szablonem — DOM
należy do konsumenta, biblioteka daje zachowanie i arkusz. `core` trzyma już kontrakt
kontrolki, wyprowadzanie komunikatów, generowanie id, konfigurację i teksty. Własny DOM
mają **cztery** powierzchnie: obudowa, checkbox, radio i select. Realnie złożona jest
jedna.

**2. `@angular/aria` istnieje.** Wersja 22.1.0 (sprawdzone 2026-08-03, linia zgodna
z naszą 22.0.x), entrypointy `listbox`, `combobox`, `menu`, `tabs`, `accordion`, `grid`,
każdy z własnym `/testing`. Własna warstwa bezgłowa dla tych ról to konkurowanie z zespołem
frameworka o rzecz, którą on wydaje w tej samej wersji.

**3. Ponowne użycie szablonu jest węższe, niż wygląda.** Skórka z pływającą etykietą
(notched outline) nie użyje szablonu obudowy — pozycja etykiety jest **strukturą**, nie
farbą. Checkbox jako przełącznik nie użyje szablonu checkboxa, bo znacznik jest SVG
wewnątrz pudełka. Klasa skórek, która faktycznie użyłaby szablonu ponownie, to dokładnie ta
klasa, którą **tokeny już obsługują**.

Do tego pomiar duplikacji, od którego zaczęła się cała rozmowa — ten sam blok hydrauliki
(siedem wejść `FormUiControl`, `touch`, identyfikatory, wstrzyknięcie obudowy,
`fieldDescribedBy`/`setDescribedBy`, `pctFieldMessages`, `describedBy`, `showError`,
`onBlur`, `focus`, `reset`) w sześciu plikach:

| plik             | linii | powtarzalna hydraulika |
| ---------------- | ----: | ---------------------: |
| `checkbox.ts`    |   159 |                    ~30 |
| `radio-group.ts` |   215 |                    ~28 |
| `select.ts`      |   489 |                    ~30 |
| `text.ts`        |   147 |                    ~21 |
| `number.ts`      |   379 |                    ~21 |
| `radio.ts`       |    91 |                     ~6 |

`radio.ts` jest niski, bo kontraktem grupy jest kontener
([`wym-api-kontener`](../wymagania/api.md#wym-api-kontener)). W `PctCheckbox` własne jest
realnie ~20 linii — `ariaChecked`, blokada zmiany przy `readonly`, obsługa `change`. Reszta
jest podatkiem płaconym pięć razy.

## Decyzja

**Nie dzielimy biblioteki na pakiet bazowy i pakiet wizualny.** Zamiast tego trzy
rozstrzygnięcia:

1. **Zachowanie wydzielamy kompozycją do `core`**
   ([`wym-projekt-core`](../wymagania/projekt.md#wym-projekt-core)) — funkcje zwracające
   sygnały i dyrektywy, **nie klasa bazowa pod cudze szablony**. Wzorcem jest
   `pctFieldMessages`, które już tak powstało.
2. **`data-pct-part` zostaje** publicznym kontraktem stylowania i domyka się drogą
   kosztowną: generowany inwentarz plus bramka
   ([`wym-api-czesci`](../wymagania/api.md#wym-api-czesci)). Skasowanie go było korzyścią
   **z podziału**; bez podziału ta korzyść nie przysługuje.
3. **Kontrakt `data-pct-*` stanu jest wzmacniany, nie osłabiany**
   ([`wym-api-atrybuty`](../wymagania/api.md#wym-api-atrybuty)). To jedyny kanał, którym
   zachowanie mówi arkuszowi, w jakim jest stanie — a przy każdej ścieżce customizacji
   staje się ważniejszy, nie mniej ważny.

Ścieżka „konsument chce wygląd pasujący w 100%" pozostaje otwarta, ale prowadzi przez
**schematy kopiujące** ([`wym-wydanie-ng-add`](../wymagania/wydanie.md#wym-wydanie-ng-add)),
nie przez drugi pakiet. Kolejność jest wymuszona: kopiowany plik musi najpierw stać się
cienki, czyli punkt 1 jest warunkiem tamtego, a nie odwrotnie.

## Konsekwencje

- **Obietnice, na których projekt wygrywa, zostają po naszej stronie.** Bramka kontrastu
  ([`wym-token-kontrast`](../wymagania/tokeny.md#wym-token-kontrast)), tryb wymuszonych
  kolorów ([`wym-a11y-kolory-wymuszone`](../wymagania/a11y.md#wym-a11y-kolory-wymuszone)),
  obszar dotyku ([`wym-a11y-dotyk`](../wymagania/a11y.md#wym-a11y-dotyk)), zrzuty wizualne
  i audyt axe to własności **wyrenderowanego wyjścia**, nie logiki. Oddając szablon,
  oddalibyśmy dokładnie tę połowę, której dotyczy [`wym-os`](../00-os.md#wym-os).
- **Dziedziczenie szablonu jest odrzucone jako mechanizm**, bo kontrakt szablon↔klasa jest
  niesprawdzany. Konkretny przypadek z naszego kodu: `select.ts` trzyma
  `viewChild('panel')` bez `required` i używa go do przewijania aktywnej opcji do widoku
  przez podwójne `?.`. Szablon nazywający ten element inaczej **po cichu** traci
  przewijanie — zero błędu, zielone testy. To ta sama klasa awarii co
  [`lekcja-38`](../lekcje.md#lekcja-38), tylko piętro wyżej.
- **Pogrubienie `core` podnosi pilność testowania mutacyjnego rdzenia**
  ([`wym-jakosc-jednostkowe`](../wymagania/jakosc.md#wym-jakosc-jednostkowe)) — jego termin
  brzmi „im więcej komponentów na nim stoi", a ta decyzja właśnie zwiększa to, co na nim
  stoi.
- **Kontrola `wym-projekt-core` dostała udokumentowany przypadek, w którym nie zadziałała.**
  Brzmi „naruszeniem jest duplikacja, a nie awaria; łapie ją review" — a review przepuściło
  ten sam blok sześć razy. To nie unieważnia decyzji o braku bramki maszynowej, ale
  odbiera jej status założenia.
- Uogólnienie nakładki z [`lekcja-35`](../lekcje.md#lekcja-35) czeka na **drugiego**
  użytkownika (dialog), nie robimy go teraz. Prymityw o jednym użyciu jest zgadywaniem,
  jak wygląda drugie.

## Co przez to tracimy

- **Nie ma ścieżki dla kogoś, komu wygląd nie odpowiada, a tokeny nie wystarczają.** Do
  czasu schematów kopiujących odpowiedź brzmi „nadpisz przez `data-pct-part`", czyli
  dokładnie ta gimnastyka, której podział miał uniknąć.
- **Nie korzystamy dziś z `@angular/aria`**, choć pokrywa role, które sami implementujemy.
  To świadome odroczenie, nie przeoczenie — ocena wypada przy domykaniu rodziny selecta
  i przy menu ([`wym-api-szablony`](../wymagania/api.md#wym-api-szablony)).
- **Decyzja jest odwracalna, ale nie za darmo.** Im więcej komponentów, tym więcej
  szablonów do rozcięcia. Odwrócenie po dwudziestu komponentach jest droższe niż dziś —
  choć nadal tańsze niż odwrócenie podziału zrobionego przedwcześnie, bo wtedy koszt
  obejmuje też macierz zgodności wersji między pakietami.

## Rozważane alternatywy

| alternatywa                                                 | dlaczego odrzucona                                                                                                                            |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Dwa pakiety: rdzeń bezgłowy + skórka                        | oddaje wyrenderowane wyjście, czyli warstwę, w której mieszka cały dowód [`wym-os`](../00-os.md#wym-os); dokłada macierz zgodności wersji     |
| Klasa bazowa z logiką, szablon w klasie pochodnej           | kontrakt szablon↔klasa niesprawdzany (`viewChild` bez `required` gaśnie po cichu); `imports` się nie dziedziczą                               |
| Pełny copy-paste komponentu (model shadcn)                  | konsument dostaje 489 linii `select.ts` i sam odpowiada za mapę klawiatury; nasz dowód dostępności przestaje dotyczyć jego kopii              |
| Podział odłożony, ale API projektowane „pod przyszły rdzeń" | mechanizm wariantowości budowany przed drugim wariantem trafia w jeden przypadek — a fakt 3 pokazuje, że najbardziej prawdopodobny nie pasuje |
| Rezygnacja z `data-pct-part` bez podziału                   | zabiera jedyną ścieżkę zaawansowanego stylowania, nie dając nic w zamian                                                                      |
