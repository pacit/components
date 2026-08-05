# Kontrola odniesienia bramki stylów

Celowo wadliwe wejścia. `tools/check-styles.mjs` uruchamia na każdym z nich komplet
swoich sześciu kontroli i **wymaga, żeby każde zostało odrzucone — i to przez ten punkt,
który deklaruje**. Wejście, które przechodzi, jest błędem; wejście, które zapala z innego
powodu, niż wpisano w jego `fixture.json`, jest błędem tak samo, bo dowodzi czegoś
innego, niż deklaruje.

Powód istnienia jest ten sam co przy każdej innej bramce w tym repozytorium
([`wym-jakosc-kontrola`](../../docs/wymagania/jakosc.md#wym-jakosc-kontrola)): **nowa
bramka nie jest gotowa, gdy przechodzi — jest gotowa, gdy pokazano, że potrafi nie
przejść.** Tutaj jest to szczególnie dosłowne, bo obie pilnowane obietnice łamią się
w ciszy: arkusz z `padding-left` wygląda bez zarzutu w każdym zrzucie LTR, czyli
w każdym, jaki repozytorium robi, a `opacity: 0.6` na warstwie tekstowej wygląda bez
zarzutu zawsze i cofa [`wym-token-kontrast`](../../docs/wymagania/tokeny.md#wym-token-kontrast)
do stanu sprzed [`lekcja-6`](../../docs/lekcje.md#lekcja-6).

## Jak to jest złożone

Przypadek nie jest trzynastą kopią poprawnego wejścia z jedną zepsutą rzeczą. Bramka
składa go z dwóch warstw:

1. `_poprawny/` — wejście wzorcowe: dwa komponenty ze swoimi arkuszami, w tym jeden
   wyjątek uzasadniony,
2. pliki katalogu przypadku, kopiowane **na kopię wzorca**, plus usunięcia z `usun`
   w `fixture.json`.

Dzięki temu katalog przypadku zawiera **wyłącznie wadę** — widać ją bez porównywania
plików — i nie rozjeżdża się z bazą, gdy kształt wejścia się zmieni.

**Wejście wzorcowe musi przejść.** To nie jest kontrola na zapas: gdyby baza sama była
wadliwa, każdy przypadek zapalałby z jej powodu, a nie z powodu swojej wady, i wszystkie
„odrzucone" byłyby fałszywe. Sprawdzone przebiegiem — `margin-left` dopisany do
wzorcowego `przycisk.scss` natychmiast przestawił `opacity-czesciowa`
i `opacity-ze-zmiennej` na cudzy punkt.

Źródła komponentów leżą tutaj jako `*.ts.txt` i stają się `*.ts` dopiero przy składaniu,
w katalogu tymczasowym poza repozytorium. Powód jest twardy i zapisany wcześniej
w [`tsconfig.root.json`](../../tsconfig.root.json): plik `.ts` w `tools/` nie należy do
żadnego programu kompilatora, więc zapaliłby `check-typecheck`. Fixture jednej bramki nie
może być wadą dla drugiej — to ta sama klasa problemu co udawany `package.json`
w [`check-package.fixtures`](../check-package.fixtures/README.md).

| katalog                                                | co łamie                                                   | punkt |
| ------------------------------------------------------ | ---------------------------------------------------------- | ----- |
| [`bez-arkuszy`](bez-arkuszy)                           | ani jednego arkusza do zbadania                            | 1     |
| [`styl-przez-mixin`](styl-przez-mixin)                 | `padding-left` złożony interpolacją, niewidoczny w tekście | 2     |
| [`bez-komponentow`](bez-komponentow)                   | ani jednego `@Component` — zero równe zeru                 | 3     |
| [`dekorator-poza-parserem`](dekorator-poza-parserem)   | dekorator poza kotwicą parsera                             | 3     |
| [`styl-w-dekoratorze`](styl-w-dekoratorze)             | `styles: [...]` zamiast arkusza                            | 3     |
| [`arkusz-spoza-projektu`](arkusz-spoza-projektu)       | `styleUrl` na arkusz spoza listy                           | 3     |
| [`wyjatek-bez-uzasadnienia`](wyjatek-bez-uzasadnienia) | znacznik wyjątku bez powodu                                | 4     |
| [`wyjatek-bez-uzycia`](wyjatek-bez-uzycia)             | znacznik nazywa inną właściwość niż ta pod nim             | 4     |
| [`padding-fizyczny`](padding-fizyczny)                 | `padding-left`                                             | 5     |
| [`text-align-fizyczny`](text-align-fizyczny)           | `text-align: left` — fizyczna WARTOŚĆ, nie nazwa           | 5     |
| [`opacity-czesciowa`](opacity-czesciowa)               | `opacity: 0.6` na stanie                                   | 6     |
| [`opacity-ze-zmiennej`](opacity-ze-zmiennej)           | `opacity: var(...)` — wartość nierozstrzygalna             | 6     |

Punkt 3 ma cztery przypadki, bo to cztery różne drogi, którymi komponent znika
z pomiaru: nie ma go w liście plików, nie widzi go parser, styluje się poza arkuszem
albo wskazuje arkusz, którego bramka nie czyta. Każda kończy przebieg zielono i każda
zostawia repozytorium wyglądające sensownie.

## Punkty 1–3 to mianownik, nie formalność

Reguły są w punktach 5 i 6; punkty 1–3 pilnują zbioru, na którym te reguły działają. To
ten sam mechanizm, który w A2 kurczył próbkę plików w raporcie pokrycia, w A6 zbiór
mierzonych komponentów, a w A7 zbiór projektów — tutaj kurczy się zbiór deklaracji.

Dwa z tych przypadków nie są hipotezami. `bez-komponentow` istnieje, bo bramka na nim
**przeszła**: pathspec gita nie jest globem powłoki, wzorzec zwracał pustą listę źródeł,
a porównanie „rozpoznano N z M" jest na zero ślepe. `dekorator-poza-parserem` istnieje,
bo licznik dekoratorów powtarzał kotwicę parsera co do znaku — przesunięcie o jedną
spację gasiło obie strony porównania naraz. Oba opisuje
[`lekcja-48`](../../docs/lekcje.md#lekcja-48); ten drugi siedział też w `check-zoneless`
i został naprawiony razem z tym.

## Dodanie nowej kontroli do bramki

Nowa kontrola w `check-styles.mjs` przychodzi **razem z przypadkiem**, który ją zapala,
i z identyfikatorem, po którym da się poznać, że zapaliła właśnie ona. Kontrola bez
przypadku jest dokładnie tym, czego zakazuje [`wym-os`](../../docs/00-os.md): obietnicą
bez maszyny potrafiącej na niej zapalić, tylko piętro wyżej.
