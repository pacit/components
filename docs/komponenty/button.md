# `PctButton` — przycisk

**Entrypoint:** `@pacit/components/button`
**Selektor:** `button[pctButton]` (atrybutowy — przycisk zostaje natywnym `<button>`)
**Status:** w wydaniu
**Wzorzec ARIA APG:** natywny `<button>` — brak własnej roli, brak własnej obsługi
klawiatury ([`wym-api-platforma`](../wymagania/api.md#wym-api-platforma))

## Kontrakt

|             |                                                                                                                                 |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------- |
| **Wartość** | nie dotyczy — to nie kontrolka formularza                                                                                       |
| **Wejścia** | `variant` (`'solid'` \| …), `size` (`sm`/`md`/`lg`, domyślnie z `providePctConfig`), `disabled`, `loading`                      |
| **Wyjścia** | brak — `click` jest natywny                                                                                                     |
| **Sloty**   | domyślny (treść etykiety)                                                                                                       |
| **Części**  | `label`, `spinner`                                                                                                              |
| **Tokeny**  | `--pct-button-*`, w tym `--pct-button-height-{sm,md,lg}`; wpisy w `contrast.policy.json` dla `button/solid` i `button/disabled` |

## Mapa klawiatury

Brak własnej obsługi — `Enter` i `Space` pochodzą od natywnego `<button>`. To jest
realizacja [`wym-api-platforma`](../wymagania/api.md#wym-api-platforma), nie przeoczenie.

## Kontrole

| kryterium                               | dowód                                                                                                                                                                                         |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Wzorzec ARIA APG wskazany w JSDoc klasy | brak — luka: JSDoc nie wskazuje wprost, że komponent celowo nie ma własnej roli                                                                                                               |
| Mapa klawiatury przetestowana           | brak — świadomie: obsługa jest natywna, testowalibyśmy przeglądarkę                                                                                                                           |
| Audyt axe na własnym widoku sandboxa    | `apps/sandbox-e2e/src/a11y.spec.ts` (widok `/button`)                                                                                                                                         |
| Zrzut wizualny                          | `apps/sandbox-e2e/src/visual.spec.ts`                                                                                                                                                         |
| `forced-colors: active`                 | `apps/sandbox-e2e/src/forced-colors.spec.ts`                                                                                                                                                  |
| `prefers-reduced-motion`                | `apps/sandbox-e2e/src/preferences.spec.ts` — spinner **zwalnia**, nie staje ([0008](../decyzje/0008-os-ruchu.md))                                                                             |
| Obszar dotyku ≥ 24×24 px                | `apps/sandbox-e2e/src/size.spec.ts` — najmniejsza wielkość to 28 px, czyli próg z zapasem                                                                                                     |
| Oś wielkości                            | `apps/sandbox-e2e/src/size.spec.ts` — pomiar równości z wierszem pola **i** wartości bezwzględnej                                                                                             |
| Oś gęstości                             | brak — luka: [`wym-token-gestosc`](../wymagania/tokeny.md#wym-token-gestosc) nie istnieje w źródłach DTCG                                                                                     |
| RTL                                     | brak — luka: [`wym-token-logiczne`](../wymagania/tokeny.md#wym-token-logiczne) nie ma bramki. Uwaga: spinner ma `border-right-color`, czyli jedno z dwóch RTL-bezpiecznych trafień fizycznych |
| SSR + hydracja                          | `apps/sandbox-e2e/src/hydration.spec.ts` przez `visit()`                                                                                                                                      |
| Formularze                              | nie dotyczy                                                                                                                                                                                   |
| Części w inwentarzu                     | `libs/components/czesci.snapshot.md`, `tools/check-parts.mjs` (target `check-parts`)                                                                                                          |
| Tokeny + `contrast.policy.json`         | `libs/tokens/src/contrast.policy.json`, `libs/tokens/build.mjs`                                                                                                                               |
| Napisy przez `PCT_TEXTS`                | `tools/check-texts.mjs` — komponent nie wypisuje własnych napisów, a dopisanie któregoś zapala bramkę                                                                                         |
| Budżet rozmiaru entrypointu             | brak — luka: budżetu nie ma ([`wym-projekt-tree-shaking`](../wymagania/projekt.md#wym-projekt-tree-shaking))                                                                                  |
| Log testu z czytnikiem ekranu           | brak — luka                                                                                                                                                                                   |
| Strona docs                             | brak — luka: `apps/docs` nie istnieje                                                                                                                                                         |

## Decyzje

[0001](../decyzje/0001-pliki-osobno.md), [0004](../decyzje/0004-wysokosc-wprost.md),
[0008](../decyzje/0008-os-ruchu.md)

## Znane ograniczenia

- **Brak wariantu ikonowego** — przycisk z samą ikoną wymagałby kwadratowej geometrii
  i osobnej gwarancji obszaru dotyku. Czeka na [`wym-api-ikony`](../wymagania/api.md#wym-api-ikony).
- **`loading` nie blokuje kliknięcia** — blokuje je `disabled`. Rozdzielone celowo:
  „pracuje" i „nie da się kliknąć" to dwa różne stany, a przycisk ładujący bez `disabled`
  jest legalnym wzorcem (np. gdy kliknięcie kolejkuje).
