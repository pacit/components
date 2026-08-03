# Decyzje architektoniczne

Poziom 2 dokumentacji. [Wymaganie](../README.md#poziom-1--wymagania) mówi **co ma być
prawdą**; decyzja mówi **dlaczego akurat tak, a nie inaczej** — i co przez to tracimy.

Do końca 2026-07 ta proza siedziała wewnątrz wymagań. Efekt: dzisiejsze
[`wym-api-obudowa`](../wymagania/api.md#wym-api-obudowa) miało osiem akapitów, a
[`wym-projekt-pakiet`](../wymagania/projekt.md#wym-projekt-pakiet) jedno zdanie, choć oba
były pozycjami tej samej listy. Wymaganie przestało dać się przeczytać w całości, bo
trzeba było przejść przez uzasadnienie.

## Zasady

- **Decyzja jest niezmienna po przyjęciu.** Zmiana zdania nie jest edycją — jest nową
  decyzją, która **zastępuje** starą. Stara zostaje w repozytorium ze statusem
  `zastąpiona przez NNNN`, bo powód, dla którego kiedyś wybrano inaczej, jest częścią
  wiedzy o projekcie.
- **Numer jest chronologiczny i nie zmienia się** — tak samo jak w
  [logu lekcji](../lekcje.md#dlaczego-numery-skoro-wymagania-mają-nazwy) i z tego samego
  powodu: kolejność tu coś znaczy.
- **Decyzja bez dowodu jest opinią.** Sekcja „Dowód" wskazuje lekcję, pomiar albo
  eksperyment. Gdy dowodu nie ma, wpisujemy to wprost — to informacja, nie wstyd.
- **Konsekwencje obejmują koszty.** Decyzja bez sekcji „Co przez to tracimy" jest
  niedokończona.

## Kształt pliku

```markdown
# NNNN — Tytuł

**Status:** przyjęta | zastąpiona przez NNNN
**Realizuje:** `wym-…`, `wym-…`
**Dowód:** `lekcja-…`

## Kontekst

## Decyzja

## Konsekwencje

## Co przez to tracimy

## Rozważane alternatywy
```

## Spis

| nr                                             | decyzja                                 | realizuje                                                 |
| ---------------------------------------------- | --------------------------------------- | --------------------------------------------------------- |
| [0001](0001-pliki-osobno.md)                   | Szablon i style w osobnych plikach      | `wym-projekt-pliki`                                       |
| [0002](0002-skorka-w-pakiecie.md)              | Skórka jedzie w pakiecie                | `wym-projekt-lib-tokenow`, `wym-token-dystrybucja`        |
| [0003](0003-obudowa-i-kontrolka.md)            | Obudowa i kontrolka                     | `wym-api-obudowa`, `wym-api-ramka`, `wym-api-bez-obudowy` |
| [0004](0004-wysokosc-wprost.md)                | Wysokość wprost, nie z paddingu         | `wym-api-wielkosc`                                        |
| [0005](0005-signal-forms-bez-cva.md)           | Signal forms bez `ControlValueAccessor` | `wym-api-signal-forms`                                    |
| [0006](0006-nakladka.md)                       | Kotwica i dziedziczenie w nakładce      | `wym-api-nakladka`                                        |
| [0007](0007-konfiguracja-i-teksty.md)          | Konfiguracja osobno od tekstów          | `wym-api-konfiguracja`, `wym-api-teksty`                  |
| [0008](0008-os-ruchu.md)                       | Oś ruchu w tokenach                     | `wym-a11y-ruch`                                           |
| [0009](0009-pole-liczbowe.md)                  | Pole liczbowe na `type="text"`          | `wym-api-liczba`                                          |
| [0010](0010-generyk-noinfer.md)                | Generyczna wartość i `NoInfer`          | `wym-api-generyk`                                         |
| [0011](0011-ikony.md)                          | Ikony przez szablon i `PCT_ICONS`       | `wym-api-ikony`                                           |
| [0012](0012-domkniecie-motywu.md)              | Domknięcie przechodnie w bloku motywu   | `wym-token-domkniecie`                                    |
| [0013](0013-bez-podzialu-na-rdzen-i-skorke.md) | Bez podziału na rdzeń bezgłowy i skórkę | `wym-projekt-core`, `wym-api-czesci`, `wym-api-atrybuty`  |
