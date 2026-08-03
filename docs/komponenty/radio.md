# `PctRadioGroup` + `PctRadio` — grupa opcji wykluczających

**Entrypoint:** `@pacit/components/radio`
**Selektor:** `pct-radio-group`, `pct-radio`
**Status:** w wydaniu
**Wzorzec ARIA APG:** [Radio Group](https://www.w3.org/WAI/ARIA/apg/patterns/radio/) —
`role="radiogroup"`, `aria-labelledby`, `aria-orientation`

Pierwszy komponent złożony w bibliotece. **Kontrolką formularza jest grupa**, nie opcje
([`wym-api-kontener`](../wymagania/api.md#wym-api-kontener)).

## Kontrakt

|                   |                                                                                                          |
| ----------------- | -------------------------------------------------------------------------------------------------------- |
| **Wartość**       | `T \| null`, generyczna (`T = string` domyślnie)                                                         |
| **Wejścia grupy** | `value` (`model`), `label`, `hint`, `orientation`, `compareWith`, `emptyValue`, plus `FormUiControl`     |
| **Opcje**         | są **treścią rzutowaną**; nie mają własnego stanu formularza                                             |
| **Części**        | grupa: `group-label`, `group-hint`, `group-error`, `options`; opcja: `control`, `circle`, `dot`, `label` |
| **Kontrakt DI**   | `PCT_FIELD`; `fieldAppearance: 'bare'`                                                                   |

## Mapa klawiatury

| klawisz         | skutek                                          | źródło                                                |
| --------------- | ----------------------------------------------- | ----------------------------------------------------- |
| `↑` `↓` `←` `→` | przejście między opcjami, z zawijaniem          | **natywne** `<input type="radio">` ze wspólnym `name` |
| `Tab`           | jedno miejsce w kolejności Taba dla całej grupy | natywne                                               |

To jest wzorcowa realizacja [`wym-api-platforma`](../wymagania/api.md#wym-api-platforma):
**żadnego własnego roving tabindex**. Test w `apps/sandbox-e2e/src/radio.spec.ts`.

## Kontrole

| kryterium                       | dowód                                                                                                                                                                                                            |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Wzorzec ARIA APG w JSDoc        | brak — luka                                                                                                                                                                                                      |
| Mapa klawiatury przetestowana   | `apps/sandbox-e2e/src/radio.spec.ts`                                                                                                                                                                             |
| Audyt axe                       | `apps/sandbox-e2e/src/a11y.spec.ts` — w tym widok `/states` z grupą **tylko do odczytu**, który wykrył `aria-readonly` na roli `radio` ([`lekcja-33`](../lekcje.md#lekcja-33))                                   |
| Zrzut wizualny                  | `apps/sandbox-e2e/src/visual.spec.ts`                                                                                                                                                                            |
| `forced-colors: active`         | `apps/sandbox-e2e/src/forced-colors.spec.ts` — **tu wyszła regresja**: kropka była zwykłym `<div>` z `background`, więc zaznaczona opcja wyglądała identycznie jak pusta ([`lekcja-40`](../lekcje.md#lekcja-40)) |
| `prefers-reduced-motion`        | `apps/sandbox-e2e/src/preferences.spec.ts`                                                                                                                                                                       |
| Obszar dotyku ≥ 24×24 px        | `apps/sandbox-e2e/src/radio.spec.ts`                                                                                                                                                                             |
| Oś wielkości                    | nie dotyczy — wariant `bare`                                                                                                                                                                                     |
| Oś gęstości                     | brak — luka                                                                                                                                                                                                      |
| RTL                             | brak — luka. **Podwyższone ryzyko:** przy `orientation="horizontal"` strzałki Lewo/Prawo muszą się zamieniać                                                                                                     |
| SSR + hydracja                  | `apps/sandbox-e2e/src/hydration.spec.ts`                                                                                                                                                                         |
| Formularze                      | `libs/components/radio/src/radio.spec.ts`, `apps/sandbox-e2e/src/forms.spec.ts`                                                                                                                                  |
| Części w inwentarzu             | brak — luka. Uwaga: `label` kolidował z etykietami opcji — stąd przedrostek `group-` ([`lekcja-15`](../lekcje.md#lekcja-15))                                                                                     |
| Tokeny + `contrast.policy.json` | `libs/tokens/src/contrast.policy.json`                                                                                                                                                                           |
| Napisy przez `PCT_TEXTS`        | nie dotyczy                                                                                                                                                                                                      |
| Budżet rozmiaru                 | brak — luka                                                                                                                                                                                                      |
| Log z czytnikiem ekranu         | brak — luka                                                                                                                                                                                                      |
| Strona docs                     | brak — luka                                                                                                                                                                                                      |

## Decyzje

[0005](../decyzje/0005-signal-forms-bez-cva.md), [0010](../decyzje/0010-generyk-noinfer.md),
[0003](../decyzje/0003-obudowa-i-kontrolka.md)

## Znane ograniczenia

- **`$event` z `(valueChange)` nie jest sprawdzane w szablonie.** Grupa nie ma inputu
  z opcjami (są treścią rzutowaną), więc jedynym źródłem `T` jest samo `value` — a wtedy
  `NoInfer` nie ma czego chronić. To **ograniczenie Angulara, nie API**
  ([0010](../decyzje/0010-generyk-noinfer.md)).
- **Kontener nie widzi opcji przez `viewChildren`**, bo są rzutowane, a `contentChildren`
  tworzyłoby cykliczny import kontener↔element. `focus()` odpytuje więc DOM hosta
  ([`lekcja-16`](../lekcje.md#lekcja-16)).
- **Atrybut `value` natywnego radia dla `T` nieprymitywnego znika** — `[object Object]`
  w DOM wyglądałby jak wartość, a niczego nie identyfikuje.
