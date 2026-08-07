# `PctRadioGroup` + `PctRadio` — group of mutually exclusive options

**Entrypoint:** `@pacit/components/radio`
**Selector:** `pct-radio-group`, `pct-radio`
**Status:** released
**ARIA APG pattern:** [Radio Group](https://www.w3.org/WAI/ARIA/apg/patterns/radio/) —
`role="radiogroup"`, `aria-labelledby`, `aria-orientation`

The library's first composite component. **The form control is the group**, not the options
([`req-api-container`](../requirements/api.md#req-api-container)).

## Contract

|                  |                                                                                                                  |
| ---------------- | ---------------------------------------------------------------------------------------------------------------- |
| **Value**        | `T \| null`, generic (`T = string` by default)                                                                   |
| **Group inputs** | `value` (`model`), `label`, `hint`, `orientation`, `compareWith`, `emptyValue`, plus `FormUiControl`             |
| **Options**      | are **projected content**; they have no form state of their own                                                  |
| **Parts**        | the group: `group-label`, `group-hint`, `group-error`, `options`; an option: `control`, `circle`, `dot`, `label` |
| **DI contract**  | `PCT_FIELD`; `fieldAppearance: 'bare'`                                                                           |

## Keyboard map

| key             | effect                                        | source                                             |
| --------------- | --------------------------------------------- | -------------------------------------------------- |
| `↑` `↓` `←` `→` | move between options, wrapping around         | **native** `<input type="radio">` sharing a `name` |
| `Tab`           | one stop in the Tab order for the whole group | native                                             |

This is the model implementation of
[`req-api-platform`](../requirements/api.md#req-api-platform): **no roving tabindex of our
own**. Tested in `apps/sandbox-e2e/src/radio.spec.ts`.

## Checks

| criterion                       | evidence                                                                                                                                                                                                                                |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ARIA APG pattern in the JSDoc   | none — gap                                                                                                                                                                                                                              |
| Keyboard map tested             | `apps/sandbox-e2e/src/radio.spec.ts`                                                                                                                                                                                                    |
| axe audit                       | `apps/sandbox-e2e/src/a11y.spec.ts` — including the `/states` view with a **read-only** group, which found `aria-readonly` on the `radio` role ([`lesson-33`](../lessons.md#lesson-33))                                                 |
| Visual screenshot               | `apps/sandbox-e2e/src/visual.spec.ts`                                                                                                                                                                                                   |
| `forced-colors: active`         | `apps/sandbox-e2e/src/forced-colors.spec.ts` — **this is where a regression surfaced**: the dot was a plain `<div>` with a `background`, so a selected option looked identical to an empty one ([`lesson-40`](../lessons.md#lesson-40)) |
| `prefers-reduced-motion`        | `apps/sandbox-e2e/src/preferences.spec.ts`                                                                                                                                                                                              |
| Touch target ≥ 24×24 px         | `apps/sandbox-e2e/src/radio.spec.ts`                                                                                                                                                                                                    |
| Size axis                       | not applicable — the `bare` variant                                                                                                                                                                                                     |
| Density axis                    | none — gap                                                                                                                                                                                                                              |
| RTL                             | none — gap. **Elevated risk:** with `orientation="horizontal"` the Left/Right arrows have to swap                                                                                                                                       |
| SSR + hydration                 | `apps/sandbox-e2e/src/hydration.spec.ts`                                                                                                                                                                                                |
| Forms                           | `libs/components/radio/src/radio.spec.ts`, `apps/sandbox-e2e/src/forms.spec.ts`                                                                                                                                                         |
| Parts in the inventory          | `libs/components/czesci.snapshot.md`, `tools/check-parts.mjs` (target `check-parts`). Note: `label` collided with the options' labels — hence the `group-` prefix ([`lesson-15`](../lessons.md#lesson-15))                              |
| Tokens + `contrast.policy.json` | `libs/tokens/src/contrast.policy.json`                                                                                                                                                                                                  |
| Strings through `PCT_TEXTS`     | `tools/check-texts.mjs` — no strings of its own                                                                                                                                                                                         |
| Size budget                     | none — gap                                                                                                                                                                                                                              |
| Screen-reader log               | none — gap                                                                                                                                                                                                                              |
| docs page                       | none — gap                                                                                                                                                                                                                              |

## Decisions

[0005](../decisions/0005-signal-forms-without-cva.md), [0010](../decisions/0010-generic-noinfer.md),
[0003](../decisions/0003-wrapper-and-control.md)

## Known limitations

- **`$event` from `(valueChange)` is not checked in the template.** The group has no options
  input (they are projected content), so the only source of `T` is `value` itself — and then
  `NoInfer` has nothing to protect. That is **a limitation of Angular, not of the API**
  ([0010](../decisions/0010-generic-noinfer.md)).
- **The container does not see the options through `viewChildren`**, because they are
  projected, and `contentChildren` would create a circular container↔element import. So
  `focus()` queries the host's DOM ([`lesson-16`](../lessons.md#lesson-16)).
- **The native radio's `value` attribute disappears for non-primitive `T`** — `[object Object]`
  in the DOM would look like a value while identifying nothing.
