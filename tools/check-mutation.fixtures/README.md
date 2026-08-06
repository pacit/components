# Kontrola odniesienia bramki przebiegu mutacyjnego

Celowo wadliwe wejścia. `tools/check-mutation.mjs` uruchamia na każdym z nich komplet
swoich siedmiu punktów i **wymaga, żeby każde zostało odrzucone — i to przez tę regułę,
którą deklaruje**. Wejście, które przechodzi, jest błędem; wejście, które zapala gdzie
indziej, niż wpisano w jego pliku, jest błędem tak samo, bo dowodzi czegoś innego, niż
deklaruje.

Każdy przypadek niesie parę `kontrola` + `regula`, a nie sam numer punktu — wprost
z A12 i [`lekcja-50`](../../docs/lekcje.md#lekcja-50). Zmierzone na tej bramce:
rozbrojenie **dwunastu z trzydziestu siedmiu** reguł przestawia ich przypadki na regułę
sąsiednią, a bez tego pola wszystkie dwanaście przebiegów byłoby zielonych.

Powód istnienia jest ten sam co przy każdej innej bramce
([`wym-jakosc-kontrola`](../../docs/wymagania/jakosc.md#wym-jakosc-kontrola)): **nowa
bramka nie jest gotowa, gdy przechodzi — jest gotowa, gdy pokazano, że potrafi nie
przejść.** Tutaj jest z tym o tyle ciekawie, że maszyna zapalająca już istnieje: sam
Stryker faila przebieg poniżej `thresholds.break`. Tyle że `break` jest u niego
**domyślnie `null`**, a wynik podnosi się pięcioma ruchami, z których żaden nie dokłada
ani jednego testu — i to tych pięć ruchów te przypadki ćwiczą.

## Jak to jest złożone

Przypadek nie jest kolejną kopią poprawnego wejścia z jedną zepsutą rzeczą. Bramka
składa go z dwóch warstw:

1. kopia `_poprawny.json` — udawana biblioteka (`alfa`, `beta`, `pusty`), która **musi
   przechodzić**;
2. zmiany z pliku przypadku (`podmienStatusy`, `konfigPrzebiegu`, `polityka`,
   `usunWierszSnapshotu`, …).

Dzięki temu plik przypadku zawiera **wyłącznie swoją wadę** i w diffie widać dokładnie
tę jedną rzecz, o którą chodzi. Wejście wzorcowe jest sprawdzane osobno i pierwsze:
gdyby samo było wadliwe, każdy przypadek zapalałby z jego powodu, a nie ze swojego —
czyli cała ta kontrola stałaby się tym, przed czym stoi.

Biblioteka jest **udawana**, a nie prawdziwa (`core`, `number`, `select`), i to ten sam
wybór co w `check-bundle`: przypadki mają nie wymagać utrzymania przy każdym nowym
teście. Statusy mutantów są wypisane wprost, bo bramka liczy wynik z ich rozkładu,
a nie z treści kodu — a rozkład jest tym, co potrafi się zepsuć.

Snapshot wejścia wzorcowego powstaje z **tego samego renderera** co produkcyjny i **z
raportu sprzed zmian przypadku**. Jedno i drugie jest konieczne: wyrenderowany po
zmianach zawsze zgadzałby się z pomiarem, czyli punkt 6 nie miałby czego badać,
a wpisany ręcznie zapalałby na różnicy formatu zamiast na wadzie przypadku.

## Czego te przypadki NIE ćwiczą

Cztery odczyty przychodzą tu jako dane, a nie z prawdziwego uruchomienia:

- `raport` — zamiast przebiegu Strykera (~6 minut na komplet),
- `zrodla` — zamiast plików z dysku,
- `targety` — zamiast poleceń z grafu Nx,
- `ci` — zamiast tekstu workflow.

To ten sam wybór co w `check-browsers` i z tego samego powodu: cztery odczyty z dysku
i z grafu to cztery funkcje po kilkanaście linii, a kontrole to siedem punktów
i trzydzieści siedem reguł, w których siedzi cała treść. Odczyty pilnują przebiegi na
prawdziwym repozytorium, spisane w [`plan.md`](../../docs/plan.md) przy zadaniu A13.

## Reguła, która przetrwa rozbrojenie samego Strykera

`zegar-zamiast-testu` jest jedyną regułą tej bramki mierzącą coś, co dziś **nie
zachodzi**: repozytorium ma zero timeoutów. Przypadek dowodzi, że reguła działa, ale
prawdziwym jej sprawdzianem będzie dzień, w którym pierwszy mutant zapętli kod —
i wtedy ma być głośno, że wynik zaczął kupować zegar, a nie asercja.
