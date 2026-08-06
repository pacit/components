# Kontrola odniesienia bramki pakietu

Celowo wadliwe pakiety. `libs/components/check-package.mjs` uruchamia na każdym z nich
komplet swoich sześciu kontroli i **wymaga, żeby każdy został odrzucony — i to przez ten
punkt, który deklaruje**. Pakiet, który przechodzi, jest błędem; pakiet, który zapala
z innego powodu, niż wpisano w `fixture.json`, jest błędem tak samo, bo dowodzi czegoś
innego, niż deklaruje.

Powód istnienia jest ten sam co przy każdej innej bramce w tym repozytorium
([`req-quality-negative-control`](../../docs/requirements/quality.md#req-quality-negative-control)): **nowa
bramka nie jest gotowa, gdy przechodzi — jest gotowa, gdy pokazano, że potrafi nie
przejść.** Przebieg, z którego wzięła się bramka pakietu, opisuje
[`lesson-36`](../../docs/lessons.md#lesson-36): usunięcie `libs/tokens/dist` → build
**przechodzi**, a pakiet nie wozi ani jednej definicji tokenu. Tamten przebieg był
**ręczny**, czyli między sesjami nie istnieje — to jest jego maszynowa postać.

## Jak to jest złożone

Przypadek nie jest szóstą kopią poprawnego pakietu z jedną zepsutą rzeczą. Bramka składa
go z trzech warstw:

1. `_poprawny/` — pakiet wzorcowy w miniaturze, zawiera dokładnie to, co bramka czyta,
2. pliki z katalogu przypadku, nadpisujące bazę (`fixture.json` się nie kopiuje),
3. usunięcia z listy `usun` w `fixture.json`.

Dzięki temu katalog przypadku zawiera **wyłącznie wadę** — widać ją bez porównywania
plików — i nie rozjeżdża się z bazą, gdy kształt pakietu się zmieni.

Manifest nazywa się w repozytorium `manifest.json` i `package.json` staje się dopiero
w złożonym pakiecie. To nie jest kosmetyka: **prawdziwy `package.json` w drzewie
repozytorium jest dla Nx projektem** — graf dostawał widmowy projekt `@pacit/components`
o korzeniu w fixtures, i to w trzech egzemplarzach o tej samej nazwie. Naturalne obejście
(`.nxignore`) naprawia to i psuje coś gorszego: katalog znika z mapy plików, więc
`inputs` targetu `check-package` przestają go widzieć, a osłabienie fixture'a **nie
unieważnia cache**. Bramka świeciłaby wtedy na zielono z cache'a, nie sprawdziwszy
niczego — czyli sama kontrola odniesienia stałaby się cichą wadą
([`req-axis`](../../docs/00-axis.md)).

**Pakiet wzorcowy musi przejść**, i to w trybie `--release`. To nie jest kontrola na
zapas: gdyby baza sama była wadliwa, każdy przypadek zapalałby z jej powodu, a nie
z powodu swojej wady, i wszystkie „odrzucone" byłyby fałszywe — czyli cała ta kontrola
odniesienia stałaby się dokładnie tym, przed czym stoi.

| katalog                                         | co łamie                                              | punkt |
| ----------------------------------------------- | ----------------------------------------------------- | ----- |
| [`brak-skorki`](brak-skorki/)                   | pakiet bez `themes/pct.css`                           | 1     |
| [`skorka-poza-exports`](skorka-poza-exports/)   | skórka w pakiecie, ale poza mapą `exports`            | 2     |
| [`token-bez-deklaracji`](token-bez-deklaracji/) | użyty `var(--pct-*)` bez deklaracji w pakiecie        | 3     |
| [`zla-wersja`](zla-wersja/)                     | `PCT_VERSION` inna niż `version` z manifestu          | 4     |
| [`bez-stalej-wersji`](bez-stalej-wersji/)       | `PCT_VERSION` znikła z pakietu w całości              | 4     |
| [`brak-schematica`](brak-schematica/)           | kolekcja `ng add` wskazuje na nieskompilowaną fabrykę | 5     |
| [`brak-repository`](brak-repository/)           | manifest bez `repository`                             | 6     |

Punkt 4 ma dwa przypadki, bo to dwie różne awarie: zła wartość i brak stałej. Ten drugi
znaczy, że zmienił się kształt wyjścia, a kontrola wersji przestała mieć co porównywać —
przechodząc przy tym na zielono.

Punkt 6 jako jedyny ma dwa tryby, więc jego przypadek ma w `fixture.json`
`"tylkoPrzyRelease": true` i jest badany w obie strony: przy `--release` musi blokować,
w zwykłym przebiegu musi **ostrzec i przepuścić**. Asercja wyłącznie na „blokuje"
przepuściłaby regresję, po której punkt 6 blokuje zawsze — a wtedy repozytorium bez
zdalnego nie zbudowałoby się w ogóle.

## Dlaczego ten katalog stoi w `tools/`, a nie obok skryptu

Skrypt jest w `libs/components/`, bo target `check-package` należy do tego projektu.
Fixtures tam nie stoją, bo katalog projektu jest wejściem jego własnych zadań: siedem
udawanych pakietów wchodziłoby do `inputs` builda i lintu biblioteki, a `manifest.json`
podpadałby pod regułę `@nx/dependency-checks`, która w tym projekcie obejmuje
`**/*.json`. Sąsiedztwo z [`check-docs.fixtures/`](check-docs.fixtures/) jest przy
okazji: oba katalogi są tym samym rodzajem rzeczy.

## Dodanie nowej kontroli do bramki

Nowa kontrola w `check-package.mjs` przychodzi **razem z przypadkiem**, który ją zapala,
i z identyfikatorem, po którym da się poznać, że zapaliła właśnie ona. Kontrola bez
przypadku jest dokładnie tym, czego zakazuje [`req-axis`](../../docs/00-axis.md): obietnicą
bez maszyny potrafiącej na niej zapalić, tylko piętro wyżej.
