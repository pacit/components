# 0006 — Kotwica i dziedziczenie w nakładce

**Status:** przyjęta
**Realizuje:** [`req-api-overlay`](../requirements/api.md#req-api-overlay)
**Dowód:** [`lesson-18`](../lessons.md#lesson-18), [`lesson-35`](../lessons.md#lesson-35)

## Kontekst

Panel selecta żyje w nakładce CDK, czyli **jako dziecko `body`**, poza drzewem hosta. Ma
przy tym wyglądać jak przedłużenie kontrolki. Te dwie rzeczy są ze sobą sprzeczne i każda
właściwość, która „po prostu działała", przestaje działać po cichu.

Objawy zmierzone w przeglądarce:

- Po [0003](0003-wrapper-and-control.md) trigger przestał być własną ramką, a nakładka
  nadal kotwiczyła się w nim: przy polu **301 px** panel miał **275 px** i był przesunięty
  o **13 px** w prawo.
- Panel dziedziczył krój pisma po `body`, nie po aplikacji: **`Times New Roman`** w panelu
  wobec `system-ui` w kontrolce.
- Wielkość pisma brała się z tokenu `--pct-select-font-size`, więc w polu `lg` opcje
  zostawały przy 14 px, gdy trigger pisał 16 px.
- Kaskada scoped theme do panelu nie dociera w ogóle
  ([`lesson-18`](../lessons.md#lesson-18)).

Samodzielny select wyglądał przy tym **bez zarzutu** — bo tam trigger _jest_ widoczną
krawędzią. Objaw pojawiał się dokładnie w konfiguracji, w której obudowa przejmuje wygląd.

## Decyzja

**Nakładka wychodzi z widocznej krawędzi kontrolki, nie z elementu, który ją otwiera.**

- Obudowa udostępnia swój wiersz jako **powierzchnię odniesienia** (`PctFieldApi.surface`);
  kontrolka kotwiczy w nim panel. Bez obudowy kotwicą jest sam trigger.
- **Kotwica jest częścią kontraktu, nie domysłem kontrolki.**

**Panel nie dziedziczy niczego po hoście — wszystko, co ma wyglądać jak przedłużenie
kontrolki, jest z niej odczytywane przy otwarciu i przenoszone jawnie:** motyw
(`data-theme`), krój pisma i wielkość pisma.

Szerokość panelu jest **osią API**, a nie stałą:

| `panelWidth` | zachowanie                                                |
| ------------ | --------------------------------------------------------- |
| `"field"`    | domyślne — panel równy kontrolce                          |
| `"auto"`     | dopasowany do najdłuższej opcji, nie węższy niż kontrolka |
| długość CSS  | ustawiona wprost                                          |

Gdy panel nie ma szerokości kontrolki, o krawędź przylegania pyta `panelAlign`
(`start` / `center` / `end`); panel wychodzący poza okno jest wsuwany z powrotem (`push`),
bo przycięte opcje są nie do odczytania.

## Konsekwencje

**Reguła ogólna, ważniejsza od samego selecta:** _każda właściwość dziedziczona jest po
cichu zerwana w nakładce._ Motyw był przenoszony jawnie już wcześniej, ale traktowano to
jako osobliwość motywu — a to reguła. Co ma wyglądać jak przedłużenie kontrolki, musi być
z niej **odczytane**, bo drzewo DOM tego nie zrobi.

Konsekwencje techniczne:

- Selektory `:host(...)` nie obejmują treści panelu — stany opcji trzeba oznaczać
  atrybutami na samych opcjach.
- Tokeny działają mimo wszystko, bo są zdefiniowane na `:root` — to zaleta podejścia
  CSS-first.
- Bramka musi porównywać **konkretne wartości** (szerokość, przesunięcie, krój, rozmiar),
  nie „mniej więcej pasuje".
- Ta lista jest **do uogólnienia w warstwie zachowań `core`** przy pierwszym dialogu.
  Dziś rozwiązana raz, w jednym komponencie.

## Co przez to tracimy

- **Odczyt ze stylu obliczonego przy każdym otwarciu** — koszt jest mały, ale to praca
  w runtime tam, gdzie normalnie wystarczyłaby kaskada.
- Lista właściwości do przeniesienia jest **otwarta**: dziś motyw, krój i rozmiar. Każda
  kolejna dziedziczona właściwość, na której komuś zależy, będzie kolejnym wpisem — i do
  jej odkrycia znów potrzeba pomiaru, bo brak dziedziczenia nie daje sygnału.

## Rozważane alternatywy

| alternatywa                                      | dlaczego odrzucona                                                                                 |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| Kotwiczenie w triggerze                          | zmierzone: panel 275 px przy polu 301 px, przesunięty o 13 px                                      |
| Wielkość pisma z tokenu `--pct-select-font-size` | token nie zna kontekstu obudowy: w polu `lg` opcje zostawały przy 14 px                            |
| Renderowanie panelu w drzewie hosta              | `overflow` i `z-index` przodków przycinają panel — to jest powód, dla którego CDK Overlay istnieje |
| `forced-color-adjust` / dziedziczenie przez CSS  | kaskada nie przechodzi przez granicę nakładki; nie ma czego naprawić po stronie arkusza            |
