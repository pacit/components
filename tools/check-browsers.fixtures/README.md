# Kontrola odniesienia bramki macierzy przeglądarek

Celowo wadliwe wejścia. `tools/check-browsers.mjs` uruchamia na każdym z nich komplet
swoich sześciu punktów i **wymaga, żeby każde zostało odrzucone — i to przez tę regułę,
którą deklaruje**. Wejście, które przechodzi, jest błędem; wejście, które zapala gdzie
indziej, niż wpisano w jego pliku, jest błędem tak samo, bo dowodzi czegoś innego, niż
deklaruje.

Każdy przypadek niesie parę `kontrola` + `regula`, a nie sam numer punktu — wprost
z A12 i [`lekcja-50`](../../docs/lekcje.md#lekcja-50). Zmierzone na tej bramce:
rozbrojenie **ośmiu z dwudziestu sześciu** reguł przestawia ich przypadki na regułę
sąsiednią, a bez tego pola wszystkie osiem przebiegów byłoby zielonych.

Powód istnienia jest ten sam co przy każdej innej bramce
([`wym-jakosc-kontrola`](../../docs/wymagania/jakosc.md#wym-jakosc-kontrola)): **nowa
bramka nie jest gotowa, gdy przechodzi — jest gotowa, gdy pokazano, że potrafi nie
przejść.** Tutaj chodzi o obietnicę, która nie ma żadnego objawu: cofnięcie macierzy
przeglądarek nie daje ani jednego czerwonego testu, bo Playwright kończy się zerem
po trzech projektach dokładnie tak samo jak po jednym — i tak samo po zerze zebranych
testów.

## Jak to jest złożone

Przypadek nie jest kolejną kopią poprawnego wejścia z jedną zepsutą rzeczą. Bramka
składa go z dwóch warstw:

1. kopia `_poprawny.json` — obraz repozytorium z dnia powstania bramki, który **musi
   przechodzić**;
2. zmiany z pliku przypadku (`usunSilniki`, `dopiszWylaczenia`, `usunZebrane`, `ci`,
   `fakty`, …).

Dzięki temu plik przypadku zawiera **wyłącznie swoją wadę** i w diffie widać dokładnie
tę jedną rzecz, o którą chodzi. Wejście wzorcowe jest sprawdzane osobno i pierwsze:
gdyby samo było wadliwe, każdy przypadek zapalałby z jego powodu, a nie ze swojego —
czyli cała ta kontrola stałaby się tym, przed czym stoi.

## Czego te przypadki NIE ćwiczą

Trzy odczyty przychodzą tu jako dane, a nie z prawdziwego uruchomienia:

- `zebrane` — zamiast wyniku `playwright test --list --reporter=json`,
- `e2e` — zamiast polecenia z grafu Nx,
- `fakty` — zamiast sond w żywych przeglądarkach.

To ten sam wybór co w `check-parts` i `check-zoneless` i z tego samego powodu: trzy
przeglądarki i graf Nx na każdy z dwudziestu pięciu przypadków kosztowałyby minuty,
a bramka biegnie przy każdym commicie. Cena jest zapisana wprost — kod czytający raport
Playwrighta, graf i sondy nie jest tutaj ćwiczony ani razu. Ćwiczy go za to **każdy**
przebieg na prawdziwym repozytorium.

## Jedna reguła bez przypadku

`mianownik/pomiar-nieczytelny` — zapala, gdy `playwright test --list` nie da się
uruchomić albo jego wyjście nie jest JSON-em. Nie da się jej osiągnąć wejściem
w formie danych, bo należy do warstwy odczytu, a nie do kontroli. Rozbrojona **nie
daje żadnego objawu**: bramka zostaje zielona, bo w zdrowym repozytorium ta ścieżka
nigdy nie jest wykonywana.

Jest za to sprawdzona przebiegiem na prawdziwym repozytorium: niedomknięty nawias
w `playwright.config.mts` zapala ją z komunikatem parsera. To jest jedyna droga do
tej reguły i dlatego jedyny dowód, jaki ma.
