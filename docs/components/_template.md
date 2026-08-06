# Szablon — Definition of Done komponentu

Skopiuj ten plik jako `docs/components/<nazwa>.md` i wypełnij. **Pusta rubryka jest
brakiem widocznym maszynowo** — `tools/check-docs.mjs` sprawdza, że każdy wiersz ma albo
ścieżkę do dowodu, albo jawny `brak — <świadomie|luka>: <powód>`.

## Po co to istnieje

Dziś jakość każdego komponentu bierze się z tego, że budowała go ta sama osoba w tym samym
trybie uwagi. **To nie skaluje się ani na drugą osobę, ani na dwudziesty komponent.**

Ten formularz jest odpowiedzią: lista, którą komponent musi przejść, żeby wejść do wydania
— w maksymalnym stopniu sprawdzana maszynowo, nie ludzkim okiem. Bez niego dwudziesty
komponent dostanie tylko te kontrole, o których ktoś akurat pamiętał.

Kolejność jest istotna: **ten formularz musi istnieć przed pierwszym komponentem
z warstwy zachowań** (dialog), bo inaczej dialog powstanie bez części kontroli i stanie
się wzorcem dla następnych.

---

# `PctNazwa` — <jednozdaniowy opis>

**Entrypoint:** `@pacit/components/<nazwa>`
**Selektor:** `pct-nazwa` / `[pctNazwa]`
**Status:** szkic | w wydaniu
**Wzorzec ARIA APG:** [nazwa wzorca](https://www.w3.org/WAI/ARIA/apg/patterns/…) — wskazany
także w JSDoc klasy

## Kontrakt

|                              |                                                                                                  |
| ---------------------------- | ------------------------------------------------------------------------------------------------ |
| **Wartość**                  | typ, wartość pusta, `compareWith`                                                                |
| **Wejścia**                  | lista z typami                                                                                   |
| **Wyjścia**                  | lista                                                                                            |
| **Sloty**                    | `<ng-content select="…">`                                                                        |
| **Części** (`data-pct-part`) | lista — musi zgadzać się z inwentarzem ([`req-api-parts`](../requirements/api.md#req-api-parts)) |
| **Tokeny**                   | prefiks `--pct-<nazwa>-*` + wpis w `contrast.policy.json`                                        |

## Mapa klawiatury

| klawisz | skutek | test |
| ------- | ------ | ---- |
|         |        |      |

Pusta tabela jest dozwolona **tylko** wtedy, gdy komponent nie ma własnej obsługi
klawiatury — i wtedy musi wskazywać, skąd bierze ją platforma
([`req-api-platform`](../requirements/api.md#req-api-platform)).

## Kontrole

Każdy wiersz: ścieżka do dowodu albo `brak — <świadomie|luka>: <powód>`.

| kryterium                                                          | wymaganie                                                                         | dowód |
| ------------------------------------------------------------------ | --------------------------------------------------------------------------------- | ----- |
| Wzorzec ARIA APG wskazany w JSDoc klasy                            | [`req-a11y-built-in`](../requirements/a11y.md#req-a11y-built-in)                  |       |
| Mapa klawiatury przetestowana klawisz po klawiszu                  | [`req-api-platform`](../requirements/api.md#req-api-platform)                     |       |
| Audyt axe na własnym widoku sandboxa                               | [`req-a11y-axe`](../requirements/a11y.md#req-a11y-axe)                            |       |
| Zrzut wizualny                                                     | [`req-quality-e2e`](../requirements/quality.md#req-quality-e2e)                   |       |
| `forced-colors: active` — stan nie niesiony samą barwą             | [`req-a11y-forced-colors`](../requirements/a11y.md#req-a11y-forced-colors)        |       |
| `prefers-reduced-motion` — czas z tokenu, nie z arkusza            | [`req-a11y-motion`](../requirements/a11y.md#req-a11y-motion)                      |       |
| Obszar dotyku ≥ 24×24 px wprost                                    | [`req-a11y-touch`](../requirements/a11y.md#req-a11y-touch)                        |       |
| Oś wielkości wyrównana do `--pct-control-height-*`                 | [`req-api-size`](../requirements/api.md#req-api-size)                             |       |
| Oś gęstości                                                        | [`req-token-density`](../requirements/tokens.md#req-token-density)                |       |
| RTL — brak właściwości fizycznych + zrzut `dir="rtl"`              | [`req-token-logical`](../requirements/tokens.md#req-token-logical)                |       |
| SSR + hydracja bez `NG05xx`                                        | [`req-quality-hydration`](../requirements/quality.md#req-quality-hydration)       |       |
| Formularze: signal forms **i** `[formControl]` **i** `[(ngModel)]` | [`req-api-signal-forms`](../requirements/api.md#req-api-signal-forms)             |       |
| Części zarejestrowane w inwentarzu                                 | [`req-api-parts`](../requirements/api.md#req-api-parts)                           |       |
| Tokeny zarejestrowane + wpis w `contrast.policy.json`              | [`req-token-contrast`](../requirements/tokens.md#req-token-contrast)              |       |
| Napisy przez `PCT_TEXTS`                                           | [`req-api-texts`](../requirements/api.md#req-api-texts)                           |       |
| Budżet rozmiaru entrypointu                                        | [`req-project-tree-shaking`](../requirements/project.md#req-project-tree-shaking) |       |
| Log testu z czytnikiem ekranu                                      | [`req-a11y-wcag`](../requirements/a11y.md#req-a11y-wcag)                          |       |
| Strona docs z żywymi przykładami                                   | [`req-project-apps`](../requirements/project.md#req-project-apps)                 |       |

## Decyzje, które ten komponent realizuje

Lista `NNNN` z [`docs/decisions/`](../decisions/).

## Znane ograniczenia

Rzeczy, których komponent świadomie nie robi — z powodem. Ograniczenie bez powodu to
błąd, o którym nikt jeszcze nie napisał zgłoszenia.
