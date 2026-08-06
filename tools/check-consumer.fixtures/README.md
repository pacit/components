# Kontrola odniesienia bramki konsumenta

Celowo wadliwe **pomiary**. `tools/check-consumer.mjs` uruchamia na każdym z nich komplet
swoich siedmiu punktów i **wymaga, żeby każdy został odrzucony — i to przez tę regułę,
którą deklaruje**. Pomiar, który przechodzi, jest błędem; pomiar, który zapala gdzie
indziej, niż wpisano w jego pliku, jest błędem tak samo, bo dowodzi czegoś innego, niż
deklaruje.

`fixture.json` niesie **zawsze** parę `kontrola` + `regula`, a nie sam punkt — wprost
wniosek z A12 i [`lekcja-50`](../../docs/lekcje.md#lekcja-50). Zmierzone na tej bramce:
rozbrojenie czterech z dwudziestu ośmiu reguł przestawia ich przypadki na regułę
**sąsiednią, w tym samym punkcie**, i bez tego pola te cztery przebiegi byłyby zielone.

Powód istnienia jest ten sam co przy każdej innej bramce
([`wym-jakosc-kontrola`](../../docs/wymagania/jakosc.md#wym-jakosc-kontrola)): **nowa
bramka nie jest gotowa, gdy przechodzi — jest gotowa, gdy pokazano, że potrafi nie
przejść.**

## Jak to jest złożone

Przypadek to plik JSON z parą pól opisowych i **jedną mutacją** nakładaną na kopię
`_poprawny.json`. Dzięki temu plik przypadku zawiera wyłącznie swoją wadę, a nie kolejny
egzemplarz poprawnego pomiaru, w którym trzeba jej szukać.

`_poprawny.json` jest **odciskiem prawdziwego pomiaru**, nie zdaniem wpisanym ręką obok
niego: powstaje z `node tools/check-consumer.mjs --zapisz-wzorzec`. Wpisany ręką
rozjeżdżałby się z kształtem pomiaru przy pierwszej zmianie i wejście wzorcowe przestałoby
przechodzić z powodu, którego nikt nie badał. Adres rejestru i ścieżka repozytorium są
w nim podmienione na wartości stałe — kontrole porównują je **wewnątrz** pomiaru (adres
archiwum zaczyna się od adresu rejestru, rozwiązanie modułu leży w katalogu aplikacji),
więc podmiana niczego nie osłabia, a zdejmuje z wersjonowanego pliku numer portu i cudzą
ścieżkę domową.

Wejście wzorcowe jest sprawdzane osobno i pierwsze: gdyby samo było wadliwe, każdy
przypadek zapalałby z jego powodu, a nie ze swojego — czyli cała ta kontrola stałaby się
tym, przed czym stoi. Zmierzone: `tokenyWCss: 0` we wzorcu przestawia dziewięć przypadków
z punktów 6 i 7 na cudzą regułę.

## Czego te przypadki NIE ćwiczą

Pomiar przychodzi jako **dane**, a nie z prawdziwego przebiegu. Uruchomienie rejestru,
instalacji, builda z SSR i przeglądarki na każdy z dwudziestu ośmiu przypadków kosztowałoby
kwadranse, a bramka biegnie przy każdym commicie — ten sam wybór co w `check-bundle`
i `check-parts`. Cena jest wprost: **kod mierzący nie jest tutaj ćwiczony ani razu.**
Ćwiczy go za to każdy przebieg na prawdziwym repozytorium, a to, że potrafi zapalić,
zostało zmierzone siedmioma sposobami zepsucia repozytorium — po jednym na regułę,
opisane w [`wym-jakosc-konsument`](../../docs/wymagania/jakosc.md#wym-jakosc-konsument).

## Przypadki

| przypadek                    | punkt | kontrola     | reguła                  | wada                                                |
| ---------------------------- | ----: | ------------ | ----------------------- | --------------------------------------------------- |
| `pusty-tarball`              |     1 | `tarball`    | `pusty`                 | `npm pack` bez ani jednego pliku                    |
| `tarball-bez-skorki`         |     1 | `tarball`    | `brak-skorki`           | skórka jest w `dist`, nie ma jej w archiwum         |
| `tarball-bez-entrypointu`    |     1 | `tarball`    | `brak-entrypointu`      | `exports` obiecuje plik, którego nie spakowano      |
| `tarball-bez-fabryki`        |     1 | `tarball`    | `brak-schematica`       | kolekcja jest, fabryki nie                          |
| `rejestr-publikacja-padla`   |     2 | `rejestr`    | `publikacja`            | `npm publish` zakończył się błędem                  |
| `rejestr-inna-wersja`        |     2 | `rejestr`    | `wersja`                | rejestr nie zna spakowanej wersji                   |
| `rejestr-inna-suma`          |     2 | `rejestr`    | `integralnosc`          | rejestr serwuje inne archiwum                       |
| `rejestr-spoza-lokalnego`    |     2 | `rejestr`    | `nie-lokalny`           | adres archiwum prowadzi na npmjs                    |
| `instalacja-bez-wpisu`       |     3 | `instalacja` | `brak-wpisu`            | brak wpisu w pliku blokady aplikacji                |
| `instalacja-spoza-rejestru`  |     3 | `instalacja` | `spoza-rejestru`        | pakiet przyszedł z uplinku                          |
| `instalacja-inna-suma`       |     3 | `instalacja` | `inna-integralnosc`     | zainstalowane ≠ spakowane                           |
| `instalacja-spoza-aplikacji` |     3 | `instalacja` | `spoza-aplikacji`       | moduł rozwiązuje się do `node_modules` repozytorium |
| `ng-add-padl`                |     4 | `ng-add`     | `schematic-padl`        | schematic nie daje się uruchomić                    |
| `ng-add-bez-zmiany`          |     4 | `ng-add`     | `bez-zmiany`            | przeszedł i niczego nie zmienił                     |
| `ng-add-bez-skorki`          |     4 | `ng-add`     | `brak-skorki-w-stylach` | dopisał coś innego niż skórkę pakietu               |
| `build-padl`                 |     5 | `build`      | `build-padl`            | build aplikacji konsumenta z błędem                 |
| `build-bez-serwera`          |     5 | `build`      | `brak-serwera`          | build przeszedł, bundla serwera nie ma              |
| `build-bez-biblioteki`       |     5 | `build`      | `biblioteka-nieobecna`  | w bundlu nie ma śladu biblioteki                    |
| `build-bez-skorki`           |     5 | `build`      | `skorka-nieobecna`      | arkusz aplikacji bez deklaracji `--pct-*`           |
| `ssr-status`                 |     6 | `ssr`        | `status`                | serwer odpowiada błędem                             |
| `ssr-bez-renderu`            |     6 | `ssr`        | `bez-renderu`           | odpowiedź z prerenderu, nie z serwera               |
| `ssr-bez-komponentu`         |     6 | `ssr`        | `bez-komponentu`        | brak klasy komponentu w HTML-u z serwera            |
| `ssr-bez-czesci`             |     6 | `ssr`        | `bez-czesci`            | brak `data-pct-part` w HTML-u z serwera             |
| `e2e-bez-elementu`           |     7 | `e2e`        | `brak-elementu`         | przeglądarka nie znalazła przycisku                 |
| `e2e-bez-skorki`             |     7 | `e2e`        | `bez-skorki`            | token tła policzony na przycisku jest pusty         |
| `e2e-tlo-poczatkowe`         |     7 | `e2e`        | `tlo-poczatkowe`        | tło wróciło do wartości początkowej                 |
| `e2e-tlo-nie-z-tokenu`       |     7 | `e2e`        | `tlo-nie-z-tokenu`      | przycisk malowany czymś innym niż swoim tokenem     |
| `e2e-blad-konsoli`           |     7 | `e2e`        | `blad-konsoli`          | błąd w konsoli przeglądarki (rozjazd hydracji)      |

`e2e-bez-skorki` i `e2e-tlo-poczatkowe` opisują tę samą awarię z dwóch stron i są
rozdzielone specjalnie: pierwsza mierzy, czy skórka **doszła**, druga — czy przycisk się
nią **pomalował**. Rozjeżdżają się dokładnie wtedy, gdy skórka jest wczytana, a token
przemianowany po jednej stronie; wtedy zapala trzecia (`e2e-tlo-nie-z-tokenu`).
