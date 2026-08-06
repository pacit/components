# `PctText` — pole tekstowe

**Entrypoint:** `@pacit/components/field`
**Selektor:** `input[pctText]` — **komponent na natywnym `<input>`**, nie dyrektywa
(dyrektywy nie mogą mieć styli, a nie chcemy opierać API na `::ng-deep`)
**Status:** w wydaniu
**Wzorzec ARIA APG:** natywny `<input>` — zachowane `type`, autouzupełnianie przeglądarki
i tryby klawiatury mobilnej

## Kontrakt

|                 |                                                                                                                                                     |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Wartość**     | `string`, pusta `''`                                                                                                                                |
| **Wejścia**     | `value` (`model`), `disabled`, `readonly`, `invalid`, `touched`, `required`, `errors`, `name`, `touch` — czyli `FormValueControl` + `FormUiControl` |
| **Wyjścia**     | `valueChange` (przez `model`)                                                                                                                       |
| **Części**      | dziedziczy części obudowy; własnych nie wystawia                                                                                                    |
| **Kontrakt DI** | rejestruje się przez `PCT_FIELD`; `fieldAppearance: 'boxed'`, `fieldCursor: 'text'`                                                                 |

## Mapa klawiatury

Brak własnej — pełna obsługa natywna
([`req-api-platform`](../requirements/api.md#req-api-platform)).

## Kontrole

| kryterium                       | dowód                                                                                                                                                                                       |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Wzorzec ARIA APG w JSDoc        | brak — luka                                                                                                                                                                                 |
| Mapa klawiatury                 | nie dotyczy — natywna                                                                                                                                                                       |
| Audyt axe                       | `apps/sandbox-e2e/src/a11y.spec.ts` (widok `/text`)                                                                                                                                         |
| Zrzut wizualny                  | `apps/sandbox-e2e/src/visual.spec.ts`                                                                                                                                                       |
| `forced-colors: active`         | `apps/sandbox-e2e/src/forced-colors.spec.ts`                                                                                                                                                |
| `prefers-reduced-motion`        | `apps/sandbox-e2e/src/preferences.spec.ts`                                                                                                                                                  |
| Obszar dotyku                   | `apps/sandbox-e2e/src/field-hitarea.spec.ts` (gwarantuje obudowa)                                                                                                                           |
| Oś wielkości                    | `apps/sandbox-e2e/src/size.spec.ts` — wielkość należy do obudowy                                                                                                                            |
| Oś gęstości                     | brak — luka                                                                                                                                                                                 |
| RTL                             | brak — luka                                                                                                                                                                                 |
| SSR + hydracja                  | `apps/sandbox-e2e/src/hydration.spec.ts`                                                                                                                                                    |
| Formularze                      | `libs/components/field/src/field-controls.spec.ts`, `apps/sandbox-e2e/src/forms.spec.ts` — signal forms, `[formControl]` i `[(ngModel)]`, **każdy startujący z niepustą wartością**         |
| Części w inwentarzu             | `libs/components/czesci.snapshot.md`, `tools/check-parts.mjs` (target `check-parts`) — komponent nie wystawia własnych części; inwentarz entrypointu `field` obejmuje go tym samym wierszem |
| Tokeny + `contrast.policy.json` | `libs/tokens/src/contrast.policy.json`                                                                                                                                                      |
| Napisy przez `PCT_TEXTS`        | `tools/check-texts.mjs` — bez własnych napisów                                                                                                                                              |
| Budżet rozmiaru                 | brak — luka (wspólny entrypoint z `field`)                                                                                                                                                  |
| Log z czytnikiem ekranu         | brak — luka                                                                                                                                                                                 |
| Strona docs                     | brak — luka                                                                                                                                                                                 |

## Decyzje

[0003](../decisions/0003-wrapper-and-control.md), [0005](../decisions/0005-signal-forms-without-cva.md)

## Znane ograniczenia

- **Współistnienie z `DefaultValueAccessor` opiera się na heurystyce.** Kontrolka wykrywa
  `NgControl` **bez** `FormField` i wtedy oddaje własność wartości. Warunek już raz był za
  szeroki i renderował puste pole przy niepustym modelu
  ([`lesson-20`](../lessons.md#lesson-20), [`lesson-26`](../lessons.md#lesson-26)) — to
  najbardziej krucha część tej kontrolki.
- **Brak `textarea`** — autosize to osobny komponent, jeszcze nie zbudowany.
