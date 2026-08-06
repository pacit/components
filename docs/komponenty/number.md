# `PctNumber` — pole liczbowe

**Entrypoint:** `@pacit/components/field`
**Selektor:** `input[pctNumber]` — na `<input type="text">`, **świadomy wyjątek** od
[`wym-api-platforma`](../wymagania/api.md#wym-api-platforma) ([0009](../decyzje/0009-pole-liczbowe.md))
**Status:** w wydaniu
**Wzorzec ARIA APG:** [Spinbutton](https://www.w3.org/WAI/ARIA/apg/patterns/spinbutton/) —
`role="spinbutton"`, `aria-valuenow`, `aria-valuetext`

## Kontrakt

|                 |                                                                                                                                                               |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Wartość**     | `number \| null` — puste to `null`, **nigdy `0` ani `NaN`**                                                                                                   |
| **Wejścia**     | `FormValueControl` + `FormUiControl`, plus `min`, `max`, `step`, `minFractionDigits`, `maxFractionDigits`, `useGrouping`, `locale`                            |
| **Granice**     | `min`/`max` należą do `FormUiControl` — przy `[formField]` wypełnia je dyrektywa z walidatorów `min()`/`max()` schematu. **Nie powtarza się ich w szablonie** |
| **Kontrakt DI** | `PCT_FIELD`; `fieldAppearance: 'boxed'`, `fieldCursor: 'text'`                                                                                                |

## Mapa klawiatury

| klawisz               | skutek                                                            | test                                       |
| --------------------- | ----------------------------------------------------------------- | ------------------------------------------ |
| `↑` / `↓`             | krok o `step`                                                     | `apps/sandbox-e2e/src/number.spec.ts`      |
| `PageUp` / `PageDown` | krok większy                                                      | `apps/sandbox-e2e/src/number.spec.ts`      |
| pisanie               | tekst **nie jest przepisywany**, żeby kursor nie skakał na koniec | `libs/components/field/src/number.spec.ts` |
| `Enter` / `blur`      | zatwierdzenie: zaokrąglenie i domknięcie do granic                | `libs/components/field/src/number.spec.ts` |

## Kontrole

| kryterium                       | dowód                                                                                                                                                                                            |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Wzorzec ARIA APG w JSDoc        | brak — luka                                                                                                                                                                                      |
| Mapa klawiatury przetestowana   | `apps/sandbox-e2e/src/number.spec.ts`, `libs/components/field/src/number.spec.ts`                                                                                                                |
| Audyt axe                       | `apps/sandbox-e2e/src/a11y.spec.ts` (widok `/number`)                                                                                                                                            |
| Zrzut wizualny                  | `apps/sandbox-e2e/src/visual.spec.ts`                                                                                                                                                            |
| `forced-colors: active`         | `apps/sandbox-e2e/src/forced-colors.spec.ts`                                                                                                                                                     |
| `prefers-reduced-motion`        | `apps/sandbox-e2e/src/preferences.spec.ts`                                                                                                                                                       |
| Obszar dotyku                   | `apps/sandbox-e2e/src/field-hitarea.spec.ts`                                                                                                                                                     |
| Oś wielkości                    | `apps/sandbox-e2e/src/size.spec.ts`                                                                                                                                                              |
| Oś gęstości                     | brak — luka                                                                                                                                                                                      |
| RTL                             | brak — luka. **Uwaga wyższego ryzyka niż w innych kontrolkach:** liczby mają własny kierunek wewnątrz tekstu RTL                                                                                 |
| SSR + hydracja                  | `apps/sandbox-e2e/src/hydration.spec.ts`                                                                                                                                                         |
| Formularze                      | `libs/components/field/src/field-controls.spec.ts`, `apps/sandbox-e2e/src/forms.spec.ts`                                                                                                         |
| Części w inwentarzu             | `libs/components/czesci.snapshot.md`, `tools/check-parts.mjs` (target `check-parts`) — dyrektywa nie wystawia własnych części; inwentarz entrypointu `field` obejmuje ją tym samym wierszem      |
| Tokeny + `contrast.policy.json` | wspólne z `field`                                                                                                                                                                                |
| Napisy przez `PCT_TEXTS`        | `tools/check-texts.mjs` — ostrzeżenia deweloperskie są **po angielsku na stałe** i gasną poza `isDevMode()`, co bramka mierzy osobnym punktem ([0007](../decyzje/0007-konfiguracja-i-teksty.md)) |
| Budżet rozmiaru                 | brak — luka                                                                                                                                                                                      |
| Log z czytnikiem ekranu         | brak — luka. **Najbardziej potrzebny ze wszystkich kontrolek** — `aria-valuetext` jest jedyną rzeczą, którą czytnik ogłasza zamiast surowej liczby                                               |
| Strona docs                     | brak — luka                                                                                                                                                                                      |

## Decyzje

[0009](../decyzje/0009-pole-liczbowe.md) (główna),
[0003](../decyzje/0003-obudowa-i-kontrolka.md), [0005](../decyzje/0005-signal-forms-bez-cva.md)

## Znane ograniczenia

- **Brak testów własnościowych parsera.** Parsowanie jest **szersze** niż formatowanie
  (separator grupujący usuwany warunkowo, kropka i przecinek jako dziesiętne), więc
  przestrzeń wejść jest większa, niż da się pokryć ręcznie. Kandydat wzorcowy:
  `parse(format(n)) === n` dla dowolnego `n` i dowolnego locale.
- **Punktem wyjścia kroku jest sygnał, nie DOM** — i to jest wymóg, nie optymalizacja.
  Odczyt z DOM zawsze może być o jeden przebieg do tyłu
  ([`lekcja-32`](../lekcje.md#lekcja-32)).
- **Mobilna klawiatura numeryczna** nie wynika z typu pola i musi być zamówiona osobno.
