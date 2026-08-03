# 0007 — Konfiguracja osobno od tekstów

**Status:** przyjęta
**Realizuje:** [`wym-api-konfiguracja`](../wymagania/api.md#wym-api-konfiguracja),
[`wym-api-teksty`](../wymagania/api.md#wym-api-teksty)
**Dowód:** brak pomiaru — decyzja z różnicy rytmu i zasięgu podmiany

## Kontekst

Biblioteka potrzebuje dwóch rzeczy ustawianych globalnie: **konfiguracji** (domyślny
`size`, locale, ripple) i **napisów** (tekst zastępczy listy, komunikat pustej listy).
Naturalnym odruchem jest jeden token DI z polem `texts`.

## Decyzja

**Dwa osobne tokeny: `PctConfig` (przez `providePctConfig`) i `PCT_TEXTS` (przez
`providePctTexts`).**

Powód jest w **rytmie i zasięgu podmiany**:

|                     | `PctConfig`                 | `PCT_TEXTS`                                |
| ------------------- | --------------------------- | ------------------------------------------ |
| kiedy się ustawia   | raz, przy starcie aplikacji | także w poddrzewie                         |
| po co się podmienia | zmiana domyślnych           | sekcja w innym języku, podgląd tłumaczenia |

Osobny token pozwala nadpisać **same napisy** w poddrzewie, nie powtarzając reszty
konfiguracji.

Dwie reguły uzupełniające:

- **Nadpisanie jest częściowe.** Podane pola nadpisują domyślne, reszta zostaje — nowy
  napis w bibliotece nie wywraca aplikacji tłumaczącej tylko część.
- **Domyślne są angielskie**, a ostrzeżenia deweloperskie (`console.warn`) do tego kanału
  **nie należą**: są po angielsku na stałe, bo czyta je programista, nie użytkownik,
  i gasną poza `isDevMode()`.

## Konsekwencje

- Aplikacja może mieć jeden `providePctConfig` i kilka `providePctTexts` w różnych
  poddrzewach.
- Dodanie napisu do biblioteki jest zmianą niełamiącą.

## Co przez to tracimy

- **Dwa miejsca do skonfigurowania zamiast jednego** — konsument musi wiedzieć, że są dwa.
- **`PCT_TEXTS` nie przeżyje zmiany języka w runtime.** `providePctTexts` zwraca
  `{ provide, useValue }`, czyli statyczny obiekt, a komponent czyta go **przy
  konstrukcji**:

  ```ts
  protected readonly texts = inject(PCT_TEXTS);
  readonly placeholder = input<string>(this.texts.selectPlaceholder); // odczyt raz
  ```

  Aplikacja przełączająca język bez przeładowania strony — bardzo częsty wzorzec — **nie
  zobaczy nowych napisów**.

  To jest **otwarte i musi zostać rozstrzygnięte zanim `PCT_TEXTS` urośnie**: albo token
  niesie `Signal<PctTexts>`, albo `providePctTexts` przyjmuje fabrykę, albo zapisujemy
  wprost, że zmiana języka wymaga przeładowania. Trzecia opcja jest obronna — ale musi być
  **decyzją, nie przeoczeniem**, a dziś nie jest nigdzie zapisana.

- **Kształt `PctConfig` jest niedokończony.** Ma jedno pole (`defaultSize`). Otwarte
  pytanie nie brzmi „jakie pola dołożyć", tylko **czy domyślne per komponent idą przez
  konfigurację (`providePctConfig({ button: { variant: 'outline' } })`), czy przez
  tokeny**. Material i PrimeNG oba skończyły na dostawcach domyślnych. Rozstrzygnąć przed
  piętnastym komponentem — później to zmiana łamiąca w każdym z nich.

## Rozważane alternatywy

| alternatywa                             | dlaczego odrzucona                                                             |
| --------------------------------------- | ------------------------------------------------------------------------------ |
| Jeden token z polem `texts`             | wymusza powtórzenie całej konfiguracji, żeby nadpisać jeden napis w poddrzewie |
| Napisy przez `$localize`                | wiąże bibliotekę z natywnym i18n Angulara; do rozważenia **obok**, nie zamiast |
| Ostrzeżenia deweloperskie w `PCT_TEXTS` | czyta je programista, nie użytkownik — tłumaczenie ich nikomu nie pomaga       |
