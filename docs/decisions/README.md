# Decyzje architektoniczne

Poziom 2 dokumentacji. [Wymaganie](../README.md#poziom-1--wymagania) mówi **co ma być
prawdą**; decyzja mówi **dlaczego akurat tak, a nie inaczej** — i co przez to tracimy.

Do końca 2026-07 ta proza siedziała wewnątrz wymagań. Efekt: dzisiejsze
[`req-api-wrapper`](../requirements/api.md#req-api-wrapper) miało osiem akapitów, a
[`req-project-package`](../requirements/project.md#req-project-package) jedno zdanie, choć oba
były pozycjami tej samej listy. Wymaganie przestało dać się przeczytać w całości, bo
trzeba było przejść przez uzasadnienie.

## Zasady

- **Decyzja jest niezmienna po przyjęciu.** Zmiana zdania nie jest edycją — jest nową
  decyzją, która **zastępuje** starą. Stara zostaje w repozytorium ze statusem
  `zastąpiona przez NNNN`, bo powód, dla którego kiedyś wybrano inaczej, jest częścią
  wiedzy o projekcie.
- **Numer jest chronologiczny i nie zmienia się** — tak samo jak w
  [logu lekcji](../lessons.md#dlaczego-numery-skoro-wymagania-mają-nazwy) i z tego samego
  powodu: kolejność tu coś znaczy.
- **Decyzja bez dowodu jest opinią.** Sekcja „Dowód" wskazuje lekcję, pomiar albo
  eksperyment. Gdy dowodu nie ma, wpisujemy to wprost — to informacja, nie wstyd.
- **Konsekwencje obejmują koszty.** Decyzja bez sekcji „Co przez to tracimy" jest
  niedokończona.

## Kształt pliku

```markdown
# NNNN — Tytuł

**Status:** przyjęta | zastąpiona przez NNNN
**Realizuje:** `req-…`, `req-…`
**Dowód:** `lesson-…`

## Kontekst

## Decyzja

## Konsekwencje

## Co przez to tracimy

## Rozważane alternatywy
```

## Spis

| nr                                       | decyzja                                       | realizuje                                                 |
| ---------------------------------------- | --------------------------------------------- | --------------------------------------------------------- |
| [0001](0001-separate-files.md)           | Szablon i style w osobnych plikach            | `req-project-files`                                       |
| [0002](0002-skin-in-package.md)          | Skórka jedzie w pakiecie                      | `req-project-tokens-lib`, `req-token-distribution`        |
| [0003](0003-wrapper-and-control.md)      | Obudowa i kontrolka                           | `req-api-wrapper`, `req-api-frame`, `req-api-no-wrapper`  |
| [0004](0004-explicit-height.md)          | Wysokość wprost, nie z paddingu               | `req-api-size`                                            |
| [0005](0005-signal-forms-without-cva.md) | Signal forms bez `ControlValueAccessor`       | `req-api-signal-forms`                                    |
| [0006](0006-overlay.md)                  | Kotwica i dziedziczenie w nakładce            | `req-api-overlay`                                         |
| [0007](0007-config-and-texts.md)         | Konfiguracja osobno od tekstów                | `req-api-config`, `req-api-texts`                         |
| [0008](0008-motion-axis.md)              | Oś ruchu w tokenach                           | `req-a11y-motion`                                         |
| [0009](0009-number-field.md)             | Pole liczbowe na `type="text"`                | `req-api-number`                                          |
| [0010](0010-generic-noinfer.md)          | Generyczna wartość i `NoInfer`                | `req-api-generic`                                         |
| [0011](0011-icons.md)                    | Ikony przez szablon i `PCT_ICONS`             | `req-api-icons`                                           |
| [0012](0012-theme-closure.md)            | Domknięcie przechodnie w bloku motywu         | `req-token-closure`                                       |
| [0013](0013-no-headless-split.md)        | Bez podziału na rdzeń bezgłowy i skórkę       | `req-project-core`, `req-api-parts`, `req-api-attributes` |
| [0014](0014-texts-as-signal.md)          | Teksty jako sygnał, czytane przy renderowaniu | `req-api-texts`                                           |
