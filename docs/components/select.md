# `PctSelect` — choice list with a panel of its own

**Entrypoint:** `@pacit/components/select`
**Selector:** `pct-select`
**Status:** released (the family is incomplete — see Known limitations)
**ARIA APG pattern:** [Select-Only Combobox](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/)
— `role="combobox"` on the trigger plus `role="listbox"` in the panel, **focus stays on the
trigger**, the active option through `aria-activedescendant`

Not a native `<select>`, because the native one gives no panel whose look and content can be
controlled — a deliberate exception to
[`req-api-platform`](../requirements/api.md#req-api-platform).

## Contract

|                 |                                                                                                                                                                        |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Value**       | `T \| null`, generic; `value` and `emptyValue` as `NoInfer<T>` — the type comes **from the option list alone**                                                         |
| **Inputs**      | `options`, `value` (`model`), `label`, `hint`, `placeholder`, `size`, `compareWith`, `emptyValue`, `panelWidth`, `panelAlign`, plus `FormUiControl`                    |
| **Panel**       | `panelWidth`: `"field"` (the default) \| `"auto"` \| a CSS length; `panelAlign`: `start` \| `center` \| `end`; one running off the viewport is pushed back in (`push`) |
| **Parts**       | `trigger`, `value`, `placeholder`, `arrow`, `panel`, `option`, `empty`, `label`, `hint`, `error`                                                                       |
| **DI contract** | `PCT_FIELD`; `fieldAppearance: 'boxed'`, `fieldCursor: 'pointer'`, `activate()` opens the panel                                                                        |
| **Strings**     | `placeholder` (when unbound) and the empty-list message through `PCT_TEXTS`, read at render time ([0014](../decisions/0014-texts-as-signal.md))                        |

**The library's first use of CDK Overlay.**

## Keyboard map

| key            | effect                                    | test                                        |
| -------------- | ----------------------------------------- | ------------------------------------------- |
| `↑` / `↓`      | open the panel / change the active option | `apps/sandbox-e2e/src/select.spec.ts`       |
| `Home` / `End` | first / last option                       | `apps/sandbox-e2e/src/select.spec.ts`       |
| `Enter`        | pick the active option, close             | `apps/sandbox-e2e/src/select.spec.ts`       |
| `Escape`       | close with no change                      | `apps/sandbox-e2e/src/select.spec.ts`       |
| characters     | typeahead, skipping disabled options      | `libs/components/select/src/select.spec.ts` |

## Checks

| criterion                       | evidence                                                                                                                                                                                                                                 |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ARIA APG pattern in the JSDoc   | none — gap                                                                                                                                                                                                                               |
| Keyboard map tested             | `apps/sandbox-e2e/src/select.spec.ts`, `libs/components/select/src/select.spec.ts`                                                                                                                                                       |
| axe audit                       | `apps/sandbox-e2e/src/a11y.spec.ts` — including **the panel with a scoped theme**                                                                                                                                                        |
| Visual screenshot               | `apps/sandbox-e2e/src/visual.spec.ts` — a separate `select-panel-open` shot                                                                                                                                                              |
| `forced-colors: active`         | `apps/sandbox-e2e/src/forced-colors.spec.ts` — selection is carried by the background (`SelectedItem`) and the keyboard cursor by the outline (`Highlight`), so an option that is both selected **and** active shows both states at once |
| `prefers-reduced-motion`        | `apps/sandbox-e2e/src/preferences.spec.ts`                                                                                                                                                                                               |
| Touch target ≥ 24×24 px         | `apps/sandbox-e2e/src/field-hitarea.spec.ts` — this is where the 19.6 px regression surfaced ([`lesson-25`](../lessons.md#lesson-25))                                                                                                    |
| Size axis                       | `apps/sandbox-e2e/src/size.spec.ts` — inside a wrapper the size is handed to the field; the panel takes its font size from the trigger                                                                                                   |
| Density axis                    | none — gap                                                                                                                                                                                                                               |
| RTL                             | none — gap. **The highest risk in the library:** the overlay has to mirror (CDK `Directionality`), and `panelAlign` has directional semantics                                                                                            |
| SSR + hydration                 | `apps/sandbox-e2e/src/hydration.spec.ts`                                                                                                                                                                                                 |
| Forms                           | `libs/components/select/src/select.spec.ts`, `apps/sandbox-e2e/src/forms.spec.ts`                                                                                                                                                        |
| Parts in the inventory          | `libs/components/parts.snapshot.md`, `tools/check-parts.mjs` (target `check-parts`)                                                                                                                                                      |
| Tokens + `contrast.policy.json` | `libs/tokens/src/contrast.policy.json`                                                                                                                                                                                                   |
| Strings through `PCT_TEXTS`     | `tools/check-texts.mjs` + `select.spec.ts` — a partial override leaves the rest at the defaults, and a runtime language change reaches the strings                                                                                       |
| Size budget                     | none — gap. Measured today: **~43 kB** in the FESM                                                                                                                                                                                       |
| Screen-reader log               | none — gap. **The most needed one**: "what a reader announces on open" and "what it announces on a value change" are questions axe does not answer — axe examines structure, it does not listen                                          |
| docs page                       | none — gap                                                                                                                                                                                                                               |

## Decisions

[0006](../decisions/0006-overlay.md) (the main one), [0010](../decisions/0010-generic-noinfer.md),
[0003](../decisions/0003-wrapper-and-control.md), [0007](../decisions/0007-config-and-texts.md)

## Known limitations

- **`options: PctSelectOption<T>[]` is a closed component.** Missing: projected `pct-option`,
  an option template, groups, multiple selection, filtering, clearing, a loading/async state
  and virtualisation. Deliberately **after** the behaviour layer in `core` — otherwise we build
  it twice.
- **The list machinery is private.** Typeahead, `enabledIndexes`, `moveActive`, `activeIndex`
  sit as private methods. Autocomplete, multiselect, menu and a command palette all need the
  same — **extract it into `core` before the second consumer**, or
  [`lesson-21`](../lessons.md#lesson-21) repeats itself on a much bigger piece.
- **`track option.value` in the template.** For non-primitive `T` that tracks by reference, and
  two options with the same value give `NG0955` in dev mode. To be settled: `track $index`, or
  a documented uniqueness requirement with a warning under `isDevMode()`.
- **No `ariaLabel` / `ariaLabelledby`.** `<pct-select aria-label="Country">` lands on a host
  that has no role — the role sits on the inner `<button>`. A standalone select with no label
  and no wrapper is an **unnamed combobox**, and the consumer has no way to fix it.
- **No virtualisation.** `@for` over every option. Legitimate for v0 but **unmeasured** —
  nothing answers "what happens at 5,000 options".
