# Szablon — Definition of Done komponentu

Skopiuj ten plik jako `docs/komponenty/<nazwa>.md` i wypełnij. **Pusta rubryka jest
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

|                              |                                                                                                 |
| ---------------------------- | ----------------------------------------------------------------------------------------------- |
| **Wartość**                  | typ, wartość pusta, `compareWith`                                                               |
| **Wejścia**                  | lista z typami                                                                                  |
| **Wyjścia**                  | lista                                                                                           |
| **Sloty**                    | `<ng-content select="…">`                                                                       |
| **Części** (`data-pct-part`) | lista — musi zgadzać się z inwentarzem ([`wym-api-czesci`](../wymagania/api.md#wym-api-czesci)) |
| **Tokeny**                   | prefiks `--pct-<nazwa>-*` + wpis w `contrast.policy.json`                                       |

## Mapa klawiatury

| klawisz | skutek | test |
| ------- | ------ | ---- |
|         |        |      |

Pusta tabela jest dozwolona **tylko** wtedy, gdy komponent nie ma własnej obsługi
klawiatury — i wtedy musi wskazywać, skąd bierze ją platforma
([`wym-api-platforma`](../wymagania/api.md#wym-api-platforma)).

## Kontrole

Każdy wiersz: ścieżka do dowodu albo `brak — <świadomie|luka>: <powód>`.

| kryterium                                                          | wymaganie                                                                      | dowód |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------ | ----- |
| Wzorzec ARIA APG wskazany w JSDoc klasy                            | [`wym-a11y-wbudowana`](../wymagania/a11y.md#wym-a11y-wbudowana)                |       |
| Mapa klawiatury przetestowana klawisz po klawiszu                  | [`wym-api-platforma`](../wymagania/api.md#wym-api-platforma)                   |       |
| Audyt axe na własnym widoku sandboxa                               | [`wym-a11y-axe`](../wymagania/a11y.md#wym-a11y-axe)                            |       |
| Zrzut wizualny                                                     | [`wym-jakosc-e2e`](../wymagania/jakosc.md#wym-jakosc-e2e)                      |       |
| `forced-colors: active` — stan nie niesiony samą barwą             | [`wym-a11y-kolory-wymuszone`](../wymagania/a11y.md#wym-a11y-kolory-wymuszone)  |       |
| `prefers-reduced-motion` — czas z tokenu, nie z arkusza            | [`wym-a11y-ruch`](../wymagania/a11y.md#wym-a11y-ruch)                          |       |
| Obszar dotyku ≥ 24×24 px wprost                                    | [`wym-a11y-dotyk`](../wymagania/a11y.md#wym-a11y-dotyk)                        |       |
| Oś wielkości wyrównana do `--pct-control-height-*`                 | [`wym-api-wielkosc`](../wymagania/api.md#wym-api-wielkosc)                     |       |
| Oś gęstości                                                        | [`wym-token-gestosc`](../wymagania/tokeny.md#wym-token-gestosc)                |       |
| RTL — brak właściwości fizycznych + zrzut `dir="rtl"`              | [`wym-token-logiczne`](../wymagania/tokeny.md#wym-token-logiczne)              |       |
| SSR + hydracja bez `NG05xx`                                        | [`wym-jakosc-hydracja`](../wymagania/jakosc.md#wym-jakosc-hydracja)            |       |
| Formularze: signal forms **i** `[formControl]` **i** `[(ngModel)]` | [`wym-api-signal-forms`](../wymagania/api.md#wym-api-signal-forms)             |       |
| Części zarejestrowane w inwentarzu                                 | [`wym-api-czesci`](../wymagania/api.md#wym-api-czesci)                         |       |
| Tokeny zarejestrowane + wpis w `contrast.policy.json`              | [`wym-token-kontrast`](../wymagania/tokeny.md#wym-token-kontrast)              |       |
| Napisy przez `PCT_TEXTS`                                           | [`wym-api-teksty`](../wymagania/api.md#wym-api-teksty)                         |       |
| Budżet rozmiaru entrypointu                                        | [`wym-projekt-tree-shaking`](../wymagania/projekt.md#wym-projekt-tree-shaking) |       |
| Log testu z czytnikiem ekranu                                      | [`wym-a11y-wcag`](../wymagania/a11y.md#wym-a11y-wcag)                          |       |
| Strona docs z żywymi przykładami                                   | [`wym-projekt-aplikacje`](../wymagania/projekt.md#wym-projekt-aplikacje)       |       |

## Decyzje, które ten komponent realizuje

Lista `NNNN` z [`docs/decyzje/`](../decyzje/).

## Znane ograniczenia

Rzeczy, których komponent świadomie nie robi — z powodem. Ograniczenie bez powodu to
błąd, o którym nikt jeszcze nie napisał zgłoszenia.
