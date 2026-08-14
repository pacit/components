# `PctCheckbox` — checkbox

**Entrypoint:** `@pacit/components/checkbox`
**Selector:** `pct-checkbox`
**Status:** released
**ARIA APG pattern:** [Checkbox (tri-state)](https://www.w3.org/WAI/ARIA/apg/patterns/checkbox/)
— the indeterminate state through `aria-checked="mixed"`

## Contract

|                 |                                                                                                                                        |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| **Value**       | `boolean` through `checked` — the `FormCheckboxControl` contract **forbids defining `value`** ([`lesson-12`](../lessons.md#lesson-12)) |
| **Inputs**      | `checked` (`model`), `indeterminate`, `label`, `hint`, plus `FormUiControl`                                                            |
| **Binding**     | `model()` does not accept `booleanAttribute`, so `[checked]="true"` in brackets — a bare attribute does not compile                    |
| **Parts**       | `control`, `box`, `mark`, `label`, `hint`, `error`                                                                                     |
| **DI contract** | `PCT_FIELD`; `fieldAppearance: 'bare'` — a frame around a checkbox looks alien                                                         |

## Keyboard map

| key     | effect | test                             |
| ------- | ------ | -------------------------------- |
| `Space` | toggle | native `<input type="checkbox">` |

No handling of its own ([`req-api-platform`](../requirements/api.md#req-api-platform)).
`readonly` blocks the change **without losing focusability**.

## Checks

| criterion                       | evidence                                                                                                                                                                                           |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ARIA APG pattern in the JSDoc   | none — gap                                                                                                                                                                                         |
| Keyboard map                    | not applicable — native                                                                                                                                                                            |
| axe audit                       | `apps/sandbox-e2e/src/a11y.spec.ts` — including a separate test of the **indeterminate state**                                                                                                     |
| Visual screenshot               | `apps/sandbox-e2e/src/visual.spec.ts`                                                                                                                                                              |
| `forced-colors: active`         | `apps/sandbox-e2e/src/forced-colors.spec.ts` — the tick toggles `visibility`, so the state is carried by **the presence of a shape**, not by colour ([`lesson-40`](../lessons.md#lesson-40))       |
| `prefers-reduced-motion`        | `apps/sandbox-e2e/src/preferences.spec.ts`                                                                                                                                                         |
| Touch target ≥ 24×24 px         | `apps/sandbox-e2e/src/checkbox.spec.ts` — the box is 18 px, the hit zone is **enlarged and centred**; met outright, not through the spacing exception ([`lesson-14`](../lessons.md#lesson-14))     |
| Size axis                       | not applicable — the `bare` variant does not align heights ([0004](../decisions/0004-explicit-height.md))                                                                                          |
| Density axis                    | none — gap. **Elevated risk:** density will drop below the touch threshold sooner than size `sm`                                                                                                   |
| RTL                             | none — gap. Note: the symmetric `left: 50%` in the hit zone is RTL-safe                                                                                                                            |
| SSR + hydration                 | `apps/sandbox-e2e/src/hydration.spec.ts`                                                                                                                                                           |
| Forms                           | `libs/components/checkbox/src/checkbox.spec.ts`, `apps/sandbox-e2e/src/forms.spec.ts`                                                                                                              |
| Parts in the inventory          | `libs/components/parts.snapshot.md`, `tools/check-parts.mjs` (target `check-parts`). Note: the `control` part collided with the native input once wrapped ([`lesson-24`](../lessons.md#lesson-24)) |
| Tokens + `contrast.policy.json` | `libs/tokens/src/contrast.policy.json`                                                                                                                                                             |
| Strings through `PCT_TEXTS`     | `tools/check-texts.mjs` — no strings of its own                                                                                                                                                    |
| Size budget                     | none — gap                                                                                                                                                                                         |
| Screen-reader log               | none — gap. Relevant: how the `mixed` state is announced differs between readers                                                                                                                   |
| docs page                       | none — gap                                                                                                                                                                                         |

## Decisions

[0005](../decisions/0005-signal-forms-without-cva.md), [0003](../decisions/0003-wrapper-and-control.md)

## Known limitations

- **The tick is an inline SVG in `currentColor`** — the consumer has no way to swap it.
  Waiting for [`req-api-icons`](../requirements/api.md#req-api-icons).
- **No switch variant** — that is a separate component despite the same
  `FormCheckboxControl` contract, because the semantics differ („turn on now" vs „tick to
  submit").
