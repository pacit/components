# `PctField` — obudowa kontrolki formularza

**Entrypoint:** `@pacit/components/field`
**Selektor:** `pct-field`
**Status:** w wydaniu
**Wzorzec ARIA APG:** brak własnej roli — obudowa dostarcza etykietę i opisy, a rolę niesie
kontrolka w środku

## Kontrakt

|                 |                                                                                                                                                                                                                                                                                                     |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Wartość**     | **nie implementuje kontraktu formularza** — robi to kontrolka w środku ([0003](../decyzje/0003-obudowa-i-kontrolka.md))                                                                                                                                                                             |
| **Wejścia**     | `label`, `hint`, `size`, `required`                                                                                                                                                                                                                                                                 |
| **Wyjścia**     | brak                                                                                                                                                                                                                                                                                                |
| **Sloty**       | domyślny (kontrolka), `[pctPrefix]`, `[pctSuffix]` — oba z osią `inset` \| `fill`                                                                                                                                                                                                                   |
| **Części**      | obudowa: `field-header`, `field-label`, `field-label-aux`, `field-row`, `field-prefix`, `field-control`, `field-suffix`, `field-footer`, `field-hint`, `field-error`, `field-message-aux`; treść slotów: `field-prefix-item`, `field-suffix-item`, `field-label-aux-item`, `field-message-aux-item` |
| **Kontrakt DI** | `PCT_FIELD` — kontrolka rejestruje się, obudowa oddaje id opisów do `aria-describedby`; `PctFieldApi.surface` jako powierzchnia odniesienia dla nakładek                                                                                                                                            |
| **Tokeny**      | `--pct-field-*`, `--pct-control-height-*`, `--pct-target-min`                                                                                                                                                                                                                                       |

## Mapa klawiatury

Brak własnej — obudowa nie jest fokusowalna. Kliknięcie w tło rzędu jest **przekazywane
kontrolce**: `focus()` na `mousedown`, `activate()` na `click`.

## Kontrole

| kryterium                       | dowód                                                                                                                                                                                                                                                                                                                                 |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Wzorzec ARIA APG w JSDoc        | brak — luka                                                                                                                                                                                                                                                                                                                           |
| Mapa klawiatury                 | nie dotyczy                                                                                                                                                                                                                                                                                                                           |
| Audyt axe                       | `apps/sandbox-e2e/src/a11y.spec.ts` (widok `/field`, plus stan błędu walidacji)                                                                                                                                                                                                                                                       |
| Zrzut wizualny                  | `apps/sandbox-e2e/src/visual.spec.ts`                                                                                                                                                                                                                                                                                                 |
| `forced-colors: active`         | `apps/sandbox-e2e/src/forced-colors.spec.ts`                                                                                                                                                                                                                                                                                          |
| `prefers-reduced-motion`        | `apps/sandbox-e2e/src/preferences.spec.ts`                                                                                                                                                                                                                                                                                            |
| Obszar dotyku ≥ 24×24 px        | `apps/sandbox-e2e/src/field-hitarea.spec.ts` — **mapa kursora po siatce punktów**, nie pomiar jednego elementu                                                                                                                                                                                                                        |
| Oś wielkości                    | `apps/sandbox-e2e/src/size.spec.ts` — wiersz pola równy przyciskowi tej samej wielkości                                                                                                                                                                                                                                               |
| Oś gęstości                     | brak — luka                                                                                                                                                                                                                                                                                                                           |
| RTL                             | brak — luka                                                                                                                                                                                                                                                                                                                           |
| SSR + hydracja                  | `apps/sandbox-e2e/src/hydration.spec.ts`                                                                                                                                                                                                                                                                                              |
| Formularze                      | `libs/components/field/src/field-controls.spec.ts` — obudowa testowana z każdą kontrolką                                                                                                                                                                                                                                              |
| Części w inwentarzu             | `libs/components/czesci.snapshot.md`, `tools/check-parts.mjs` (target `check-parts`). **11 części, a wymaganie wymieniało 7** do 2026-07-27; **15, a karta wymieniała 11** do 2026-08-05 — cztery części slotów siedzą w blokach `host` dyrektyw. Dwa razy ten sam błąd na tej samej karcie, oba razy zauważone dopiero przy liczeniu |
| Tokeny + `contrast.policy.json` | `libs/tokens/src/contrast.policy.json`                                                                                                                                                                                                                                                                                                |
| Napisy przez `PCT_TEXTS`        | nie dotyczy — wszystkie napisy pochodzą z inputów                                                                                                                                                                                                                                                                                     |
| Budżet rozmiaru                 | brak — luka. Zmierzone dziś: **~62 kB** w FESM (największy entrypoint)                                                                                                                                                                                                                                                                |
| Log z czytnikiem ekranu         | brak — luka                                                                                                                                                                                                                                                                                                                           |
| Strona docs                     | brak — luka                                                                                                                                                                                                                                                                                                                           |

## Decyzje

[0003](../decyzje/0003-obudowa-i-kontrolka.md) (główna),
[0004](../decyzje/0004-wysokosc-wprost.md), [0006](../decyzje/0006-nakladka.md)

## Znane ograniczenia

- **`attach()` — ostatni wygrywa po cichu.** `control` to pojedynczy sygnał, a `attach`
  po prostu nadpisuje. Dwie kontrolki w jednej obudowie to cicha wada z gatunku tych, które
  projekt zwykle łapie. Do naprawienia tanim `console.warn` pod `isDevMode()`.
- **Przycisk `inset` musi być o stopień mniejszy od pola.** W wielkości `sm` nie ma już
  stopnia niżej, więc przycisk wypełnia tam wysokość i rozpycha wiersz o grubość ramki. To
  wniosek z [0004](../decyzje/0004-wysokosc-wprost.md), nie wada dopasowania.
