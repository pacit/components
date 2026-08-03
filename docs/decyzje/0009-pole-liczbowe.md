# 0009 — Pole liczbowe na `type="text"`

**Status:** przyjęta
**Realizuje:** [`wym-api-liczba`](../wymagania/api.md#wym-api-liczba)
**Dowód:** [`lekcja-32`](../lekcje.md#lekcja-32)

## Kontekst

[`wym-api-platforma`](../wymagania/api.md#wym-api-platforma) mówi: nie implementujemy
tego, co daje platforma. Natywne `<input type="number">` jest dokładnie tym, co platforma
daje dla liczb — i jest **świadomym wyjątkiem** od tej reguły.

Cztery powody, każdy sam w sobie wystarczający:

1. **Nie zna lokalnego separatora dziesiętnego** — w polskim przecinka.
2. **Nie grupuje tysięcy.**
3. **Przy niepoprawnej treści zwraca puste `value`** — nie da się odróżnić „puste" od
   „śmieci" ani pokazać użytkownikowi tego, co wpisał.
4. **Kółko myszy przypadkowo zmienia wartość.**

## Decyzja

`[pctNumber]` stoi na `<input type="text">` z `role="spinbutton"`, `aria-valuenow` /
`aria-valuetext` i własnym parsowaniem opartym o `Intl.NumberFormat`.

Zasady, każda z powodem:

| zasada                                                                           | powód                                                                                                                                                                             |
| -------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Wartość to `number \| null`; puste to `null`, nigdy `0` ani `NaN`                | „nic nie wpisano" jest osobnym stanem od „wpisano zero"                                                                                                                           |
| Formatowanie wg `LOCALE_ID`, nadpisywalne inputem `locale`                       | domyślne locale aplikacji, ale pole w formularzu może być wyjątkiem                                                                                                               |
| **Parsowanie szersze niż formatowanie**                                          | separator grupujący usuwany tylko tam, gdzie faktycznie rozdziela tysiące; jako dziesiętny przyjmowany zarówno lokalny, jak i kropka — bo daje ją klawiatura numeryczna           |
| Domyślnie pole jest **całkowite**; ułamki włącza `maxFractionDigits`             | najczęstszy przypadek bez konfiguracji                                                                                                                                            |
| Zaokrąglanie i domykanie do granic **przy zatwierdzeniu**, nie w trakcie pisania | inaczej nie da się wpisać „15", przechodząc przez „1"                                                                                                                             |
| Tekst pola **nie jest przepisywany w trakcie pisania**                           | żeby kursor nie skakał na koniec                                                                                                                                                  |
| **Granic nie powtarza się w szablonie**                                          | `min`/`max` należą do `FormUiControl`, więc przy `[formField]` wypełnia je dyrektywa z walidatorów `min()`/`max()` schematu — jedno źródło prawdy dla walidacji, ARIA i domykania |

### Punktem wyjścia kroku jest sygnał, nie DOM

`stepBy` brał punkt wyjścia z `input.value`, a tekst zapisuje **efekt**, czyli
asynchronicznie: dwa naciśnięcia strzałki w jednym przebiegu detekcji widziały tę samą
wartość wyjściową i drugie nie miało skutku ([`lekcja-32`](../lekcje.md#lekcja-32)).

Punktem wyjścia jest teraz **sygnał**, a tekst tylko wtedy, gdy użytkownik faktycznie
pisze (`typing()`) — wpisana, niezatwierdzona wartość nadal jest respektowana.

## Konsekwencje

- **DOM nie jest źródłem prawdy w komponencie sterowanym sygnałami** — odczyt z niego
  zawsze może być o jeden przebieg do tyłu. To reguła szersza niż pole liczbowe.
- Test regresyjny celowo **nie stabilizuje fixture między zdarzeniami**; z `await` po
  każdym z nich wada jest niewidoczna — co tłumaczy, dlaczego istniejący test klawiatury ją
  przepuszczał.
- Pole musi samo obsłużyć krokowanie strzałkami i PageUp/PageDown, bo platforma już tego
  nie daje.

## Co przez to tracimy

- **Cała maszyneria parsowania jest nasza**, łącznie z jej wadami. Natywne pole było
  darmowe.
- **Mobilna klawiatura numeryczna** nie pojawia się z samego typu — trzeba ją zamówić
  osobno (`inputmode`).
- **Parsowanie szersze niż formatowanie to duża przestrzeń wejść.** To główny kandydat na
  testy własnościowe (`parse(format(n)) === n` dla dowolnego `n` i locale) — dziś ich nie
  ma i jest to zapisana luka w [`wym-api-liczba`](../wymagania/api.md#wym-api-liczba).

## Rozważane alternatywy

| alternatywa                               | dlaczego odrzucona                                                                      |
| ----------------------------------------- | --------------------------------------------------------------------------------------- |
| `<input type="number">`                   | cztery wady wymienione w Kontekście, z czego dwie są nie do obejścia                    |
| `type="number"` + warstwa formatująca     | przy niepoprawnej treści natywne pole **traci** wpisany tekst — nie ma czego formatować |
| Osobne pole na część całkowitą i ułamkową | wywraca wklejanie, autouzupełnianie i obsługę klawiatury                                |
