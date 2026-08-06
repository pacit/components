# Kontrola odniesienia bramki tekstów

Celowo wadliwe wejścia. `tools/check-texts.mjs` uruchamia na każdym z nich komplet swoich
sześciu punktów i **wymaga, żeby każde zostało odrzucone — i to przez tę regułę, którą
deklaruje**. Wejście, które przechodzi, jest błędem; wejście, które zapala gdzie indziej,
niż wpisano w jego `fixture.json`, jest błędem tak samo, bo dowodzi czegoś innego, niż
deklaruje.

`fixture.json` niesie tu **zawsze** parę `kontrola` + `regula`, a nie sam punkt. To wprost
wniosek z A12 i [`lesson-50`](../../docs/lessons.md#lesson-50): punkt bramki to nie jedno
zdanie. Zmierzone na tej bramce — rozbrojenie dziewięciu z dwudziestu dziewięciu reguł
przestawia ich przypadki na regułę **sąsiednią, w tym samym punkcie**, i bez tego pola
wszystkie dziewięć przebiegów byłoby zielonych.

Powód istnienia jest ten sam co przy każdej innej bramce
([`req-quality-negative-control`](../../docs/requirements/quality.md#req-quality-negative-control)): **nowa
bramka nie jest gotowa, gdy przechodzi — jest gotowa, gdy pokazano, że potrafi nie
przejść.** Tutaj chodzi o obietnicę, która łamie się wyjątkowo cicho: napis dopisany do
szablonu kompiluje się, przechodzi testy, przechodzi audyt axe i wygląda poprawnie na
każdym zrzucie. Czerwono robi się dopiero u konsumenta, który przetłumaczył aplikację
i dostaje w jej środku jedno zdanie po angielsku — a w review widać poprawny szablon.

## Jak to jest złożone

Przypadek nie jest kolejną kopią poprawnego wejścia z jedną zepsutą rzeczą. Bramka składa
go z trzech warstw:

1. kopia `_poprawny/` — wejście wzorcowe, które **musi przechodzić**;
2. na nią pliki katalogu przypadku;
3. usunięcia z `fixture.json` (klucz `usun`).

Dzięki temu katalog przypadku zawiera **wyłącznie swoją wadę** i w diffie widać dokładnie
tę jedną rzecz, o którą chodzi. Wejście wzorcowe jest sprawdzane osobno i pierwsze: gdyby
samo było wadliwe, każdy przypadek zapalałby z jego powodu, a nie ze swojego — czyli cała
ta kontrola stałaby się tym, przed czym stoi.

Źródła leżą tu jako `*.ts.txt` i stają się `*.ts` dopiero w katalogu tymczasowym. Plik
`.ts` w `tools/` nie należy do żadnego programu kompilatora, więc zapaliłby
`check-typecheck` — fixture jednej bramki nie może być wadą dla drugiej.

## Czego te przypadki NIE ćwiczą

Odczyt ze zbudowanego pakietu przychodzi jako dane (`pakiet.json`), a nie z prawdziwego
builda Angulara — ten sam wybór co w `check-parts` i `check-zoneless` i z tego samego
powodu: build na każdy z dwudziestu dziewięciu przypadków kosztowałby minuty, a bramka
biegnie przy każdym commicie. Cena jest wprost: kod czytający `ɵcmp.consts` i
`ɵdir.hostAttrs` nie jest tutaj ćwiczony ani razu. Ćwiczy go za to **każdy** przebieg na
prawdziwym repozytorium.

## Jedna reguła bez przypadku

`mianownik/nieznany-wezel` — zapala, gdy `parseTemplate` zwróci rodzaj węzła, którego
obejście nie zna. Nie da się jej dziś osiągnąć: składnia selectorless (`<Widget/>`,
`@Marker`), jedyne źródło nowych rodzajów węzłów na horyzoncie, jest w domyślnych opcjach
parsera **wyłączona** — zmierzone, `parseTemplate('<Widget/>')` daje zwykły `Element`.
Reguła istnieje po to, żeby dzień jej włączenia był dniem, w którym bramka o tym **mówi**,
a nie dniem, w którym cicho przestaje mierzyć zawartość takiego węzła.
