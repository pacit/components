# `PctRadioGroup` + `PctRadio` — group of mutually exclusive options

**Entrypoint:** `@pacit/components/radio`
**Selector:** `pct-radio-group`, `pct-radio`
**Status:** released
**ARIA APG pattern:** [Radio Group](https://www.w3.org/WAI/ARIA/apg/patterns/radio/) —
`role="radiogroup"`, `aria-labelledby`, `aria-orientation`

The library's first composite component. **The form control is the group**, not the options
([`req-api-container`](../requirements/api.md#req-api-container)).

## Contract

|                   |                                                                                                                                                                                                                                                                                                                                                                                  |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Value**         | `T \| null`, generic (`T = string` by default)                                                                                                                                                                                                                                                                                                                                   |
| **Group inputs**  | `value` (`model`), `label`, `hint`, `orientation`, `compareWith`, `emptyValue`, plus `FormUiControl`                                                                                                                                                                                                                                                                             |
| **Options**       | are **projected content**; they have no form state of their own. **The values are unique** under `compareWith` — and here the arbiter is the browser, not the code: the natives share a `name`, so of two options with one value only the **last** stays checked while both paint themselves chosen. Reported in dev mode, not repaired ([`lesson-66`](../lessons.md#lesson-66)) |
| **Option inputs** | `value` (required), `disabled`, `ariaLabel`, `ariaLabelledby` — the last two are **inputs and not attributes on the tag**: `role="radio"` sits on the `<input>` inside `pct-radio`, the host carries no role, and an ARIA name there is ignored. They are the name of an option whose projected content is not text (`tools/check-aria.mjs`)                                     |
| **Parts**         | the group: `group-label`, `group-hint`, `group-error`, `group-options`; an option: `control`, `circle`, `dot`, `label`                                                                                                                                                                                                                                                           |
| **DI contract**   | `PCT_FIELD`; `fieldAppearance: 'bare'`. Outwards: `PCT_RADIO_OPTION`, the token `pct-radio` provides so that the group can read what its options carry without importing the class                                                                                                                                                                                               |

## Keyboard map

| key             | effect                                        | source                                             |
| --------------- | --------------------------------------------- | -------------------------------------------------- |
| `↑` `↓` `←` `→` | move between options, wrapping around         | **native** `<input type="radio">` sharing a `name` |
| `Tab`           | one stop in the Tab order for the whole group | native                                             |

This is the model implementation of
[`req-api-platform`](../requirements/api.md#req-api-platform): **no roving tabindex of our
own**. Tested in `apps/sandbox-e2e/src/radio.spec.ts`.

## Checks

| criterion                       | evidence                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| ARIA APG pattern in the JSDoc   | none — gap                                                                                                                                                                                                                                                                                                                                                                                                               |
| Keyboard map tested             | `apps/sandbox-e2e/src/radio.spec.ts`                                                                                                                                                                                                                                                                                                                                                                                     |
| axe audit                       | `apps/sandbox-e2e/src/a11y.spec.ts` — including the `/states` view with a **read-only** group, which found `aria-readonly` on the `radio` role ([`lesson-33`](../lessons.md#lesson-33))                                                                                                                                                                                                                                  |
| Visual screenshot               | `apps/sandbox-e2e/src/visual.spec.ts`                                                                                                                                                                                                                                                                                                                                                                                    |
| `forced-colors: active`         | `apps/sandbox-e2e/src/forced-colors.spec.ts` — **this is where a regression surfaced**: the dot was a plain `<div>` with a `background`, so a selected option looked identical to an empty one ([`lesson-40`](../lessons.md#lesson-40)). The second one no browser here shows: the disabled circle kept a theme surface, and `tools/check-styles.mjs` (point 7) is what says so ([`lesson-70`](../lessons.md#lesson-70)) |
| `prefers-reduced-motion`        | `apps/sandbox-e2e/src/preferences.spec.ts`                                                                                                                                                                                                                                                                                                                                                                               |
| Touch target ≥ 24×24 px         | `apps/sandbox-e2e/src/radio.spec.ts`                                                                                                                                                                                                                                                                                                                                                                                     |
| Size axis                       | not applicable — the `bare` variant                                                                                                                                                                                                                                                                                                                                                                                      |
| Density axis                    | none — gap                                                                                                                                                                                                                                                                                                                                                                                                               |
| RTL                             | none — gap. **Elevated risk:** with `orientation="horizontal"` the Left/Right arrows have to swap                                                                                                                                                                                                                                                                                                                        |
| SSR + hydration                 | `apps/sandbox-e2e/src/hydration.spec.ts`                                                                                                                                                                                                                                                                                                                                                                                 |
| Forms                           | `libs/components/radio/src/radio.spec.ts`, `apps/sandbox-e2e/src/forms.spec.ts`                                                                                                                                                                                                                                                                                                                                          |
| Parts in the inventory          | `libs/components/parts.snapshot.md`, `tools/check-parts.mjs` (target `check-parts`). Note: `label` collided with the options' labels — hence the `group-` prefix ([`lesson-15`](../lessons.md#lesson-15)), which every part of the group carries, `group-options` included (point 6 of the gate)                                                                                                                         |
| Tokens + `contrast.policy.json` | `libs/tokens/src/contrast.policy.json`                                                                                                                                                                                                                                                                                                                                                                                   |
| Strings through `PCT_TEXTS`     | `tools/check-texts.mjs` — no strings of its own; the dev-mode report of a duplicated value is addressed to the developer, so it is permanently in English and outside `PCT_TEXTS` ([`req-api-texts`](../requirements/api.md#req-api-texts))                                                                                                                                                                              |
| Size budget                     | none — gap                                                                                                                                                                                                                                                                                                                                                                                                               |
| Screen-reader log               | none — gap                                                                                                                                                                                                                                                                                                                                                                                                               |
| docs page                       | none — gap                                                                                                                                                                                                                                                                                                                                                                                                               |

## Decisions

[0005](../decisions/0005-signal-forms-without-cva.md), [0010](../decisions/0010-generic-noinfer.md),
[0003](../decisions/0003-wrapper-and-control.md)

## Known limitations

- **`$event` from `(valueChange)` is not checked in the template.** The group has no options
  input (they are projected content), so the only source of `T` is `value` itself — and then
  `NoInfer` has nothing to protect. That is **a limitation of Angular, not of the API**
  ([0010](../decisions/0010-generic-noinfer.md)).
- **The container does not see the options through `viewChildren`**, because they are
  projected. `focus()` therefore queries the host's DOM ([`lesson-16`](../lessons.md#lesson-16))
  — the native controls are what the browser checks. What the options MEAN travels the other
  road: a token (`PCT_RADIO_OPTION`) the option provides, which leaves the import pointing one
  way only where `contentChildren(PctRadio)` would have closed the cycle. The DOM could not have
  carried it — `[attr.value]` is absent for a non-primitive `T`.
- **The native radio's `value` attribute disappears for non-primitive `T`** — `[object Object]`
  in the DOM would look like a value while identifying nothing.
