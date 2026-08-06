# 0010 — Generyczna wartość i `NoInfer`

**Status:** przyjęta
**Realizuje:** [`req-api-generic`](../requirements/api.md#req-api-generic)
**Dowód:** [`lesson-37`](../lessons.md#lesson-37)

## Kontekst

Pierwsza wersja `PctSelect` przyjmowała `PctSelectOption[]` z wartością typu `string`.
Realne formularze wiążą identyfikatory liczbowe, warianty unii i całe encje — zawężenie do
napisu przerzucało na każdą aplikację **ręczne mapowanie tam i z powrotem**, czyli dokładnie
tę pracę, którą biblioteka ma zdejmować.

## Decyzja

`PctSelect<T>`, `PctSelectOption<T>` i `PctRadioGroup<T>` są generyczne, z `T = string`
domyślnie — listy napisowe pisze się bez zmian.

Trzy rzeczy wynikają z tego wprost:

- **Równość zgłasza aplikacja** (`compareWith`, domyślnie tożsamość). Encja wczytana
  z serwera nie jest tą samą referencją co opcja na liście, więc bez tego wybrana pozycja
  nie podświetlałaby się po otwarciu formularza.
- **Brak wyboru jest osobnym stanem.** Wartość ma typ `T | null`, bo „nic nie wybrano" jest
  osiągalne dla każdego `T`. Aplikacja z polem nienullowalnym zgłasza własną wartość pustą
  (`emptyValue`), żeby reset nie wpisywał do modelu `null` wbrew jego typowi.
- **Atrybut `value` natywnego radia opisuje opcję, ale nie bierze udziału w wyborze**
  i dla wartości nieprymitywnych po prostu znika — `[object Object]` w DOM wyglądałby jak
  wartość, a niczego nie identyfikuje.

### `NoInfer` na wiązaniach, które mają być tylko sprawdzane

To jest właściwa treść tej decyzji i wzięła się z sondy.

Po uogólnieniu okazało się, że kompilator **przepuszcza wiązania jawnie sprzeczne**: lista
opcji `PctSelectOption<number>[]` z wartością `'napis'`, `emptyValue` innego typu niż
opcje, a nawet `$event` z `(valueChange)` podany metodzie o niepasującym parametrze.

Sprawdzanie szablonów **działało** — `NG8002` na wymyślonym inpucie było łapane od razu.
Problem był węższy: `T` ma kilka miejsc wnioskowania (`options`, `value`, `emptyValue`),
więc TypeScript wybierał **unię kandydatów** (`string | number`), do której pasowały obie
strony konfliktu.

Naprawa polega na **odebraniu prawa do ustalania `T`** tym wiązaniom, które mają być
wobec niego tylko sprawdzane: `value` i `emptyValue` są zadeklarowane jako `NoInfer<T>`,
więc typ bierze się wyłącznie z listy opcji.

## Konsekwencje

- Sonda z pięciu przypadków: **cztery domknięte**, łącznie z typowaniem `$event`, które
  wcześniej milczało.
- **Piąty przypadek zostaje i jest ograniczeniem Angulara, nie API:** `PctRadioGroup` nie
  ma inputu z opcjami (są treścią rzutowaną), więc jedynym źródłem `T` jest samo `value` —
  i tam `$event` z `(valueChange)` nadal nie jest sprawdzane. Generyk daje tej grupie
  bezpieczeństwo po stronie TypeScriptu (`isSelected`, `select`, odczyt `value()`), ale nie
  po stronie szablonu.
- **Reguła metodyczna:** przy generycznym komponencie trzeba **osobno sprawdzić, czy
  szablon faktycznie egzekwuje typ**. Sam fakt, że build przechodzi na poprawnym użyciu,
  nie odróżnia „typ się zgadza" od „typ jest ignorowany". Rozstrzyga dopiero kontrola
  negatywna: celowo błędne wiązanie, które **ma** wywalić build.

## Co przez to tracimy

- **Sygnatury są trudniejsze do czytania.** `NoInfer<T>` wymaga wyjaśnienia każdemu, kto
  otworzy plik pierwszy raz — stąd ten wpis.
- **Nierówność między komponentami:** select ma pełne sprawdzanie szablonu, grupa radiów
  częściowe. To jest różnica, której nie da się dziś zniwelować bez dodania grupie inputu
  z opcjami — czyli bez odebrania jej rzutowanej treści.
- Kontrola negatywna dla typów **nie jest testem automatycznym** — to sonda, którą trzeba
  uruchomić świadomie. Zapisana jako kontrola przy
  [`req-api-generic`](../requirements/api.md#req-api-generic).

## Rozważane alternatywy

| alternatywa                            | dlaczego odrzucona                                                                   |
| -------------------------------------- | ------------------------------------------------------------------------------------ |
| `value: string`, mapowanie w aplikacji | przerzuca na każdą aplikację pracę, którą biblioteka ma zdejmować                    |
| `T` bez `NoInfer`                      | zmierzone: kompilator przepuszcza 5/5 sprzecznych wiązań, bo wybiera unię kandydatów |
| `unknown` + rzutowanie w aplikacji     | odbiera sprawdzanie w miejscu, gdzie jest najbardziej potrzebne — w szablonie        |
