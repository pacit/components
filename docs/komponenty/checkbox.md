# `PctCheckbox` — pole wyboru

**Entrypoint:** `@pacit/components/checkbox`
**Selektor:** `pct-checkbox`
**Status:** w wydaniu
**Wzorzec ARIA APG:** [Checkbox (tri-state)](https://www.w3.org/WAI/ARIA/apg/patterns/checkbox/)
— stan nieokreślony przez `aria-checked="mixed"`

## Kontrakt

|                 |                                                                                                                                      |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| **Wartość**     | `boolean` przez `checked` — kontrakt `FormCheckboxControl` **zabrania definiowania `value`** ([`lekcja-12`](../lekcje.md#lekcja-12)) |
| **Wejścia**     | `checked` (`model`), `indeterminate`, `label`, `hint`, plus `FormUiControl`                                                          |
| **Wiązanie**    | `model()` nie przyjmuje `booleanAttribute`, więc `[checked]="true"` nawiasami — goły atrybut nie kompiluje się                       |
| **Części**      | `control`, `box`, `mark`, `label`, `hint`, `error`                                                                                   |
| **Kontrakt DI** | `PCT_FIELD`; `fieldAppearance: 'bare'` — ramka wokół checkboxa wygląda obco                                                          |

## Mapa klawiatury

| klawisz | skutek       | test                              |
| ------- | ------------ | --------------------------------- |
| `Space` | przełączenie | natywne `<input type="checkbox">` |

Własnej obsługi brak ([`wym-api-platforma`](../wymagania/api.md#wym-api-platforma)).
`readonly` blokuje zmianę **bez utraty fokusowalności**.

## Kontrole

| kryterium                       | dowód                                                                                                                                                                                                    |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Wzorzec ARIA APG w JSDoc        | brak — luka                                                                                                                                                                                              |
| Mapa klawiatury                 | nie dotyczy — natywna                                                                                                                                                                                    |
| Audyt axe                       | `apps/sandbox-e2e/src/a11y.spec.ts` — w tym osobny test **stanu nieokreślonego**                                                                                                                         |
| Zrzut wizualny                  | `apps/sandbox-e2e/src/visual.spec.ts`                                                                                                                                                                    |
| `forced-colors: active`         | `apps/sandbox-e2e/src/forced-colors.spec.ts` — ptaszek przełącza `visibility`, więc stan niesie **obecność kształtu**, nie barwa ([`lekcja-40`](../lekcje.md#lekcja-40))                                 |
| `prefers-reduced-motion`        | `apps/sandbox-e2e/src/preferences.spec.ts`                                                                                                                                                               |
| Obszar dotyku ≥ 24×24 px        | `apps/sandbox-e2e/src/checkbox.spec.ts` — pudełko ma 18 px, strefa trafienia jest **powiększona i wyśrodkowana**; spełnione wprost, nie przez wyjątek odstępu ([`lekcja-14`](../lekcje.md#lekcja-14))    |
| Oś wielkości                    | nie dotyczy — wariant `bare` wysokości nie wyrównuje ([0004](../decyzje/0004-wysokosc-wprost.md))                                                                                                        |
| Oś gęstości                     | brak — luka. **Podwyższone ryzyko:** gęstość zejdzie poniżej progu dotyku szybciej niż wielkość `sm`                                                                                                     |
| RTL                             | brak — luka. Uwaga: symetryczne `left: 50%` w strefie trafienia jest RTL-bezpieczne                                                                                                                      |
| SSR + hydracja                  | `apps/sandbox-e2e/src/hydration.spec.ts`                                                                                                                                                                 |
| Formularze                      | `libs/components/checkbox/src/checkbox.spec.ts`, `apps/sandbox-e2e/src/forms.spec.ts`                                                                                                                    |
| Części w inwentarzu             | `libs/components/czesci.snapshot.md`, `tools/check-parts.mjs` (target `check-parts`). Uwaga: część `control` kolidowała z natywnym inputem po opakowaniu obudową ([`lekcja-24`](../lekcje.md#lekcja-24)) |
| Tokeny + `contrast.policy.json` | `libs/tokens/src/contrast.policy.json`                                                                                                                                                                   |
| Napisy przez `PCT_TEXTS`        | `tools/check-texts.mjs` — bez własnych napisów                                                                                                                                                           |
| Budżet rozmiaru                 | brak — luka                                                                                                                                                                                              |
| Log z czytnikiem ekranu         | brak — luka. Istotne: ogłoszenie stanu `mixed` różni się między czytnikami                                                                                                                               |
| Strona docs                     | brak — luka                                                                                                                                                                                              |

## Decyzje

[0005](../decyzje/0005-signal-forms-bez-cva.md), [0003](../decyzje/0003-obudowa-i-kontrolka.md)

## Znane ograniczenia

- **Znacznik jest wpisanym SVG w `currentColor`** — konsument nie ma jak go podmienić.
  Czeka na [`wym-api-ikony`](../wymagania/api.md#wym-api-ikony).
- **Brak wariantu switch** — to osobny komponent, mimo tego samego kontraktu
  `FormCheckboxControl`, bo różni się semantyką („włącz teraz" vs „zaznacz do wysłania").
