# Kontrola odniesienia bramki nazw tokenów

Celowo wadliwe wejścia. `tools/check-tokens.mjs` uruchamia na każdym z nich komplet
swoich pięciu kontroli i **wymaga, żeby każde zostało odrzucone — i to przez ten punkt,
który deklaruje**. Wejście, które przechodzi, jest błędem; wejście, które zapala z innego
powodu, niż wpisano w jego `fixture.json`, jest błędem tak samo, bo dowodzi czegoś
innego, niż deklaruje.

Powód istnienia jest ten sam co przy każdej innej bramce w tym repozytorium
([`wym-jakosc-kontrola`](../../docs/wymagania/jakosc.md#wym-jakosc-kontrola)): **nowa
bramka nie jest gotowa, gdy przechodzi — jest gotowa, gdy pokazano, że potrafi nie
przejść.** Tutaj chodzi o obietnicę, która łamie się szczególnie cicho: nazwa tokenu
jest publicznym API motywu, a jej zmiana nie daje ani jednego czerwonego testu, bo
biblioteka przemianowuje obie strony naraz — token i arkusz, który go używa. Czerwono
robi się dopiero u konsumenta, któremu zostaje nadpisanie wskazujące donikąd.

## Jak to jest złożone

Przypadek nie jest dwunastą kopią poprawnego wejścia z jedną zepsutą rzeczą. Bramka
składa go z czterech warstw:

1. `_poprawny/` — wejście wzorcowe: minimalna skórka (`libs/tokens/src/*.json`), jej
   słownik nazw, jej snapshot i jeden entrypoint `libs/components/przycisk/`,
2. pliki katalogu przypadku, kopiowane **na kopię wzorca**, plus usunięcia z `usun`
   w `fixture.json`,
3. **prawdziwy `libs/tokens/build.mjs` z repozytorium**, uruchomiony na tak złożonych
   źródłach — nie jego kopia w fixtures, bo kopia byłaby nieaktualnym zdaniem o tym,
   co robi generator,
4. jeszcze raz pliki przypadku — po buildzie.

Warstwa czwarta wygląda na nadmiarową i nie jest. Bez niej `dist/` fixture'a jest
z definicji zgodne z jego źródłami, więc **punkty 1 i 2 nie miałyby jak zapalić**: obie
badają właśnie rozjazd między artefaktem a źródłem. Przypadek, który chce ten rozjazd
pokazać, wiezie własny `libs/tokens/dist/…` i musi przeżyć build.

Dzięki temu katalog przypadku zawiera **wyłącznie wadę** — widać ją bez porównywania
plików — i nie rozjeżdża się z bazą, gdy kształt wejścia się zmieni.

Spreparowany `tokens.ts` leży tutaj jako `tokens.ts.txt` i staje się `.ts` dopiero przy
składaniu, w katalogu tymczasowym poza repozytorium. Powód jest ten sam co w
[`check-styles.fixtures`](../check-styles.fixtures/README.md): plik `.ts` w `tools/` nie
należy do żadnego programu kompilatora, więc zapaliłby `check-typecheck`. **Fixture
jednej bramki nie może być wadą dla drugiej** — i nie jest to obawa teoretyczna, bo
`check-typecheck` zapalił na tym pliku przy pierwszym przebiegu po dodaniu go do indeksu.

**Wejście wzorcowe musi przejść.** To nie jest kontrola na zapas: gdyby baza sama była
wadliwa, każdy przypadek zapalałby z jej powodu, a nie ze swojego, i wszystkie
„odrzucone" byłyby fałszywe. Sprawdzone przebiegiem — `bg-hover` przemianowane
w bazie na `hover-bg` natychmiast przestawiło `slowo-martwe`, `snapshot-nieaktualny`
i `snapshot-usuniety` na cudzy punkt.

Słownik bazy (`_poprawny/libs/tokens/src/nazwy.policy.json`) wymienia **wyłącznie słowa
używane** przez któryś token wzorca. To nie jest oszczędność: punkt 4 odrzuca słowo
martwe, więc rozdmuchany „na zapas" słownik zepsułby bazę.

## Snapshot wejścia wzorcowego

`_poprawny/libs/tokens/tokens.snapshot.md` jest generowany tym samym rendererem co
snapshot repozytorium:

```bash
node tools/check-tokens.mjs --write _poprawny
```

Ta forma polecenia istnieje wyłącznie do utrzymania fixtures. Bez niej pierwsza zmiana
formatu snapshotu wywracałaby wejście wzorcowe, a poprawianie go ręcznie byłoby
przepisywaniem tego samego kodu drugi raz w markdownie.

## Przypadki

| katalog                     | punkt | kontrola       | wada                                                   |
| --------------------------- | ----: | -------------- | ------------------------------------------------------ |
| `artefakt-bez-tokenu`       |     1 | `zbior`        | `dist/pct.css` niesie mniej, niż deklarują źródła      |
| `token-w-dwoch-warstwach`   |     1 | `zbior`        | ten sam token w pliku komponentowym i semantycznym     |
| `unia-bez-tokenu`           |     2 | `powierzchnia` | token wypadł z unii `PctCssVar`, został w `pctTokens`  |
| `prefiks-bez-pokrycia`      |     2 | `powierzchnia` | prefiks prywatny, którego nie używa żaden token        |
| `stan-przed-wlasciwoscia`   |     3 | `schemat`      | `disabled-bg` zamiast `bg-disabled`                    |
| `slowo-spoza-slownika`      |     3 | `schemat`      | `bg-over` — dobra kolejność, złe słowo                 |
| `komponent-bez-entrypointu` |     3 | `schemat`      | `component.dialog.json` bez entrypointu `dialog`       |
| `plik-inny-niz-przedrostek` |     3 | `schemat`      | `component.przycisk.json` wiozący tokeny `pct.guzik.*` |
| `slowo-martwe`              |     4 | `slownik`      | stan zadeklarowany i nieużywany                        |
| `snapshot-nieaktualny`      |     5 | `snapshot`     | przemianowanie bez aktualizacji snapshotu              |
| `snapshot-usuniety`         |     5 | `snapshot`     | brak pliku snapshotu                                   |

Dwa przypadki na punkt 3 dla kolejności i dla słownika są rozdzielone specjalnie:
to dwie różne połowy tej samej obietnicy i psują się niezależnie. `stan-przed-wlasciwoscia`
dostaje przy tym własny słownik z `disabled` w stanach, żeby jego jedyną wadą była
kolejność segmentów — `fg-disabled` stoi obok i parsuje się bez zarzutu.
