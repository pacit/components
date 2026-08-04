# Kontrola odniesienia bramki pokrycia

Celowo wadliwe wejścia. `tools/check-coverage.mjs` uruchamia na każdym z nich komplet
swoich pięciu kontroli i **wymaga, żeby każde zostało odrzucone — i to przez ten punkt,
który deklaruje**. Wejście, które przechodzi, jest błędem; wejście, które zapala z innego
powodu, niż wpisano w jego pliku, jest błędem tak samo, bo dowodzi czegoś innego, niż
deklaruje.

Powód istnienia jest ten sam co przy każdej innej bramce w tym repozytorium
([`wym-jakosc-kontrola`](../../docs/wymagania/jakosc.md#wym-jakosc-kontrola)): **nowa
bramka nie jest gotowa, gdy przechodzi — jest gotowa, gdy pokazano, że potrafi nie
przejść.** Przebieg, z którego wzięła się ta bramka, opisuje
[`lekcja-45`](../../docs/lekcje.md#lekcja-45): usunięcie testu **podniosło** pokrycie
z 96,55% na 96,94%, bo razem z testem wypadł z raportu cały nietestowany plik. Próg
pilnujący takiej liczby przechodzi zawsze i tym głośniej, im mniej się testuje.

## Jak to jest złożone

Przypadek nie jest ósmą kopią poprawnego wejścia z jedną zepsutą rzeczą. Bramka składa
go z dwóch warstw:

1. `_poprawny.json` — wejście wzorcowe: raport, lista plików źródłowych, opcje targetu,
2. operacje z pliku przypadku, nakładane na jego kopię (`usunRaport`, `wyczyscZrodla`,
   `usunZRaportu`, `pct`, `target`).

Dzięki temu plik przypadku zawiera **wyłącznie wadę** — widać ją bez porównywania plików
— i nie rozjeżdża się z bazą, gdy kształt raportu się zmieni.

**Wejście wzorcowe musi przejść.** To nie jest kontrola na zapas: gdyby baza sama była
wadliwa, każdy przypadek zapalałby z jej powodu, a nie z powodu swojej wady, i wszystkie
„odrzucone" byłyby fałszywe — czyli cała ta kontrola odniesienia stałaby się dokładnie
tym, przed czym stoi.

Wejście jest **danymi, nie katalogiem na dysku**: bramka bada decyzję, a nie odczyt
plików. Plumbing broni się sam — gdyby glob źródeł albo normalizacja ścieżek z raportu
przestały działać, punkt 2 albo 3 zapala na prawdziwym przebiegu, głośno i od razu.

| plik                                                 | co łamie                                             | punkt |
| ---------------------------------------------------- | ---------------------------------------------------- | ----- |
| [`brak-raportu.json`](brak-raportu.json)             | przebieg nie zostawił raportu pokrycia               | 1     |
| [`bez-zrodel.json`](bez-zrodel.json)                 | pusta lista plików źródłowych                        | 2     |
| [`plik-poza-raportem.json`](plik-poza-raportem.json) | plik źródłowy poza raportem, przy rosnącym procencie | 3     |
| [`pokrycie-wylaczone.json`](pokrycie-wylaczone.json) | target ma próg, ale nie zbiera pokrycia              | 4     |
| [`bez-progu.json`](bez-progu.json)                   | target zbiera pokrycie, ale bez progu                | 4     |
| [`prog-zanizony.json`](prog-zanizony.json)           | próg niższy niż minimum z `wym-jakosc-pokrycie`      | 4     |
| [`ponizej-progu.json`](ponizej-progu.json)           | pokrycie poniżej zadeklarowanego progu               | 5     |

Punkt 4 ma trzy przypadki, bo to trzy różne sposoby rozbrojenia tej samej egzekucji:
wyłączenie pomiaru, usunięcie progu i obniżenie progu. Każdy zostawia `project.json`
wyglądający sensownie i każdy kończy przebieg zielono.

Punkt 3 jest tym, który faktycznie łapie regresję. Punkty 4 i 5 pilnują liczby; punkt 3
pilnuje **mianownika**, z którego ta liczba powstała — a to on cicho się kurczy.

## Dodanie nowej kontroli do bramki

Nowa kontrola w `check-coverage.mjs` przychodzi **razem z przypadkiem**, który ją zapala,
i z identyfikatorem, po którym da się poznać, że zapaliła właśnie ona. Kontrola bez
przypadku jest dokładnie tym, czego zakazuje [`wym-os`](../../docs/00-os.md): obietnicą
bez maszyny potrafiącej na niej zapalić, tylko piętro wyżej.
