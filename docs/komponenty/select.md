# `PctSelect` — lista wyboru z własnym panelem

**Entrypoint:** `@pacit/components/select`
**Selektor:** `pct-select`
**Status:** w wydaniu (rodzina niedomknięta — patrz Znane ograniczenia)
**Wzorzec ARIA APG:** [Select-Only Combobox](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/)
— `role="combobox"` na triggerze + `role="listbox"` w panelu, **fokus zostaje na triggerze**,
aktywna opcja przez `aria-activedescendant`

Nie natywny `<select>`, bo natywny nie daje panelu, którego wygląd i zawartość da się
kontrolować — to świadomy wyjątek od
[`wym-api-platforma`](../wymagania/api.md#wym-api-platforma).

## Kontrakt

|                 |                                                                                                                                                        |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Wartość**     | `T \| null`, generyczna; `value` i `emptyValue` jako `NoInfer<T>` — typ bierze się **wyłącznie z listy opcji**                                         |
| **Wejścia**     | `options`, `value` (`model`), `label`, `hint`, `placeholder`, `size`, `compareWith`, `emptyValue`, `panelWidth`, `panelAlign`, plus `FormUiControl`    |
| **Panel**       | `panelWidth`: `"field"` (domyślne) \| `"auto"` \| długość CSS; `panelAlign`: `start` \| `center` \| `end`; wychodzący poza okno jest wsuwany (`push`)  |
| **Części**      | `trigger`, `value`, `placeholder`, `arrow`, `panel`, `option`, `empty`, `label`, `hint`, `error`                                                       |
| **Kontrakt DI** | `PCT_FIELD`; `fieldAppearance: 'boxed'`, `fieldCursor: 'pointer'`, `activate()` otwiera panel                                                          |
| **Napisy**      | `placeholder` (gdy bez wiązania) i komunikat pustej listy przez `PCT_TEXTS`, czytane przy renderowaniu ([0014](../decyzje/0014-teksty-jako-sygnal.md)) |

**Pierwsze użycie CDK Overlay w bibliotece.**

## Mapa klawiatury

| klawisz        | skutek                                  | test                                        |
| -------------- | --------------------------------------- | ------------------------------------------- |
| `↑` / `↓`      | otwarcie panelu / zmiana aktywnej opcji | `apps/sandbox-e2e/src/select.spec.ts`       |
| `Home` / `End` | pierwsza / ostatnia opcja               | `apps/sandbox-e2e/src/select.spec.ts`       |
| `Enter`        | wybór aktywnej opcji, zamknięcie        | `apps/sandbox-e2e/src/select.spec.ts`       |
| `Escape`       | zamknięcie bez zmiany                   | `apps/sandbox-e2e/src/select.spec.ts`       |
| znaki          | typeahead z pomijaniem wyłączonych      | `libs/components/select/src/select.spec.ts` |

## Kontrole

| kryterium                       | dowód                                                                                                                                                                                |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Wzorzec ARIA APG w JSDoc        | brak — luka                                                                                                                                                                          |
| Mapa klawiatury przetestowana   | `apps/sandbox-e2e/src/select.spec.ts`, `libs/components/select/src/select.spec.ts`                                                                                                   |
| Audyt axe                       | `apps/sandbox-e2e/src/a11y.spec.ts` — w tym **panel ze scoped theme**                                                                                                                |
| Zrzut wizualny                  | `apps/sandbox-e2e/src/visual.spec.ts` — osobny zrzut `select-panel-otwarty`                                                                                                          |
| `forced-colors: active`         | `apps/sandbox-e2e/src/forced-colors.spec.ts` — wybór niesie tło (`SelectedItem`), a kursor klawiatury obrys (`Highlight`), więc opcja wybrana **i** aktywna pokazuje oba stany naraz |
| `prefers-reduced-motion`        | `apps/sandbox-e2e/src/preferences.spec.ts`                                                                                                                                           |
| Obszar dotyku ≥ 24×24 px        | `apps/sandbox-e2e/src/field-hitarea.spec.ts` — tu wyszła regresja 19,6 px ([`lekcja-25`](../lekcje.md#lekcja-25))                                                                    |
| Oś wielkości                    | `apps/sandbox-e2e/src/size.spec.ts` — w obudowie wielkość oddaje polu; panel bierze rozmiar pisma z triggera                                                                         |
| Oś gęstości                     | brak — luka                                                                                                                                                                          |
| RTL                             | brak — luka. **Najwyższe ryzyko w bibliotece:** nakładka musi się odbijać (CDK `Directionality`), a `panelAlign` ma kierunkową semantykę                                             |
| SSR + hydracja                  | `apps/sandbox-e2e/src/hydration.spec.ts`                                                                                                                                             |
| Formularze                      | `libs/components/select/src/select.spec.ts`, `apps/sandbox-e2e/src/forms.spec.ts`                                                                                                    |
| Części w inwentarzu             | `libs/components/czesci.snapshot.md`, `tools/check-parts.mjs` (target `check-parts`)                                                                                                 |
| Tokeny + `contrast.policy.json` | `libs/tokens/src/contrast.policy.json`                                                                                                                                               |
| Napisy przez `PCT_TEXTS`        | `tools/check-texts.mjs` + `select.spec.ts` — nadpisanie częściowe zostawia resztę domyślną, a zmiana języka w runtime dociera do napisów                                             |
| Budżet rozmiaru                 | brak — luka. Zmierzone dziś: **~43 kB** w FESM                                                                                                                                       |
| Log z czytnikiem ekranu         | brak — luka. **Najbardziej potrzebny**: „co czytnik ogłasza po otwarciu" i „co po zmianie wartości" to pytania, na które axe nie odpowiada — axe bada strukturę, nie słyszy          |
| Strona docs                     | brak — luka                                                                                                                                                                          |

## Decyzje

[0006](../decyzje/0006-nakladka.md) (główna), [0010](../decyzje/0010-generyk-noinfer.md),
[0003](../decyzje/0003-obudowa-i-kontrolka.md), [0007](../decyzje/0007-konfiguracja-i-teksty.md)

## Znane ograniczenia

- **`options: PctSelectOption<T>[]` to komponent zamknięty.** Brakuje rzutowanych
  `pct-option`, szablonu opcji, grup, wielokrotnego wyboru, filtrowania, czyszczenia, stanu
  ładowania/async i wirtualizacji. Świadomie **po** warstwie zachowań w `core` — inaczej
  budujemy to dwa razy.
- **Maszyneria listy jest prywatna.** Typeahead, `enabledIndexes`, `moveActive`,
  `activeIndex` siedzą jako prywatne metody. Tego samego potrzebują autocomplete,
  multiselect, menu i paleta poleceń — **wyciągnąć do `core` przed drugim konsumentem**,
  inaczej powtórzy się [`lekcja-21`](../lekcje.md#lekcja-21) na dużo większym kawałku.
- **`track option.value` w szablonie.** Dla `T` nieprymitywnego to śledzenie po
  referencji, a dwie opcje o tej samej wartości dają `NG0955` w trybie deweloperskim. Do
  rozstrzygnięcia: `track $index` albo udokumentowany wymóg unikalności z ostrzeżeniem pod
  `isDevMode()`.
- **Brak `ariaLabel` / `ariaLabelledby`.** `<pct-select aria-label="Kraj">` ląduje na
  hoście, który nie ma roli — rola siedzi na wewnętrznym `<button>`. Samodzielny select bez
  etykiety i bez obudowy jest **nienazwanym comboboxem**, a konsument nie ma jak tego
  naprawić.
- **Brak wirtualizacji.** `@for` po wszystkich opcjach. Legalne dla v0, ale
  **niezmierzone** — nic nie odpowiada na pytanie „co przy 5 000 opcji".
