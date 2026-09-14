# `PctCheckbox` — checkbox

**Summary:** A box the reader ticks, with the third state a parent of many options needs.
**Entrypoint:** `@pacit/components/checkbox`
**Selector:** `pct-checkbox`
**Status:** released
**Category:** Choices
**ARIA APG pattern:** [Checkbox (tri-state)](https://www.w3.org/WAI/ARIA/apg/patterns/checkbox/)
— the third state is the native `indeterminate` property, which the accessible tree reports
as `mixed`; no `aria-checked` is written
([0039](../decisions/0039-a-state-the-platform-publishes-is-not-ours-to-write.md))

## Usage

```html
<pct-checkbox label="Send me release notes" [(checked)]="notes" />
```

## Contract

|                 |                                                                                                                                                                                                                                                 |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Value**       | `boolean` through `checked` — the `FormCheckboxControl` contract **forbids defining `value`** ([`lesson-12`](../lessons.md#lesson-12))                                                                                                          |
| **Inputs**      | `checked` (`model`), `indeterminate`, `label`, `hint`, `ariaLabel`, `ariaLabelledby`, plus `FormUiControl`                                                                                                                                      |
| **Naming**      | `ariaLabel` / `ariaLabelledby` are **inputs and not attributes on the tag**: the role sits on the `<input>` inside, the host carries no role, and an ARIA name on a roleless element is ignored. Both win over `label` (`tools/check-aria.mjs`) |
| **Binding**     | `model()` does not accept `booleanAttribute`, so `[checked]="true"` in brackets — a bare attribute does not compile                                                                                                                             |
| **Parts**       | `control`, `box`, `mark`, `label`, `hint`, `error`                                                                                                                                                                                              |
| **Harness**     | `PctCheckboxHarness`                                                                                                                                                                                                                            |
| **DI contract** | `PCT_FIELD`; `fieldAppearance: 'bare'` — a frame around a checkbox looks alien                                                                                                                                                                  |

## Parts

| part      | what it is               |
| --------- | ------------------------ |
| `control` | the native input         |
| `box`     | the square drawn over it |
| `mark`    | the check inside the box |
| `label`   | the label beside the box |
| `hint`    | the hint under the label |
| `error`   | the message when invalid |

## Theming

```css
[data-theme='brand'] {
  --pct-checkbox-bg-checked: #0f766e;
  --pct-checkbox-border-checked: #0f766e;
  --pct-checkbox-fg-checked: #ffffff;
}
```

## Keyboard map

| key     | effect | test                             |
| ------- | ------ | -------------------------------- |
| `Space` | toggle | native `<input type="checkbox">` |

No handling of its own ([`req-api-platform`](../requirements/api.md#req-api-platform)).
`readonly` blocks the change **without losing focusability**.

## Checks

| criterion                       | evidence                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ARIA APG pattern in the JSDoc   | none — gap                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Keyboard map                    | not applicable — native                                                                                                                                                                                                                                                                                                                                                                                                         |
| No `aria-checked` of its own    | `libs/components/checkbox/src/checkbox.spec.ts › never writes aria-checked` — the absence in all three states; `apps/sandbox-e2e/src/checkbox.spec.ts` — the accessible tree read in three engines, `[checked]` from the checkedness and `[checked=mixed]` from the `indeterminate` property alone ([0039](../decisions/0039-a-state-the-platform-publishes-is-not-ours-to-write.md), [`lesson-112`](../lessons.md#lesson-112)) |
| axe audit                       | `apps/sandbox-e2e/src/a11y.spec.ts` — including a separate test of the **indeterminate state**                                                                                                                                                                                                                                                                                                                                  |
| Visual screenshot               | `apps/sandbox-e2e/src/visual.spec.ts`                                                                                                                                                                                                                                                                                                                                                                                           |
| `forced-colors: active`         | `apps/sandbox-e2e/src/forced-colors.spec.ts` — the tick toggles `visibility`, so the state is carried by **the presence of a shape**, not by colour ([`lesson-40`](../lessons.md#lesson-40)); `tools/check-styles.mjs` (point 7) found the disabled box keeping a theme surface instead of `Field` ([`lesson-70`](../lessons.md#lesson-70))                                                                                     |
| `prefers-reduced-motion`        | `apps/sandbox-e2e/src/preferences.spec.ts`                                                                                                                                                                                                                                                                                                                                                                                      |
| Touch target ≥ 24×24 px         | `apps/sandbox-e2e/src/checkbox.spec.ts` — the box is 18 px, the hit zone is **enlarged and centred**; met outright, not through the spacing exception ([`lesson-14`](../lessons.md#lesson-14))                                                                                                                                                                                                                                  |
| Size axis                       | not applicable — the `bare` variant does not align heights ([0004](../decisions/0004-explicit-height.md))                                                                                                                                                                                                                                                                                                                       |
| Density axis                    | none — gap. **Elevated risk:** density will drop below the touch threshold sooner than size `sm`                                                                                                                                                                                                                                                                                                                                |
| RTL                             | `tools/check-styles.mjs` (point 5, [`req-token-logical`](../requirements/tokens.md#req-token-logical)) over the stylesheet — one justified `pct-exception`, the symmetric `left: 50%` of the hit zone, where `inset-inline-start` would be a defect and not an improvement — plus the `checkbox-in-wrapper-rtl` baseline in `apps/sandbox-e2e/src/visual.spec.ts`                                                               |
| SSR + hydration                 | `apps/sandbox-e2e/src/hydration.spec.ts`                                                                                                                                                                                                                                                                                                                                                                                        |
| Forms                           | `libs/components/checkbox/src/checkbox.spec.ts`, `apps/sandbox-e2e/src/forms.spec.ts`                                                                                                                                                                                                                                                                                                                                           |
| The mark through `PCT_ICONS`    | `tools/check-icons.mjs` (target `check-icons`), `libs/components/checkbox/src/checkbox.spec.ts` — `check` and `indeterminate` are two names, and a set carrying one of them leaves the other to the component                                                                                                                                                                                                                   |
| Parts in the inventory          | `libs/components/parts.snapshot.md`, `tools/check-parts.mjs` (target `check-parts`). Note: the `control` part collided with the native input once wrapped ([`lesson-24`](../lessons.md#lesson-24))                                                                                                                                                                                                                              |
| Tokens + `contrast.policy.json` | `libs/tokens/src/contrast.policy.json`                                                                                                                                                                                                                                                                                                                                                                                          |
| Strings through `PCT_TEXTS`     | `tools/check-texts.mjs` — no strings of its own                                                                                                                                                                                                                                                                                                                                                                                 |
| Size budget                     | none — gap                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Screen-reader log               | none — gap. Relevant: how the `mixed` state is announced differs between readers                                                                                                                                                                                                                                                                                                                                                |
| docs page                       | `/components/checkbox` on the published site — prerendered, the demo's own source is the code tab                                                                                                                                                                                                                                                                                                                               |

## Decisions

[0005](../decisions/0005-signal-forms-without-cva.md), [0003](../decisions/0003-wrapper-and-control.md),
[0028](../decisions/0028-an-icon-set-is-a-component.md) (the tick and the dash are `check` and
`indeterminate` inside a `pct-icon`; the colour and the hiding belong to the box, the drawing
to whoever provided it)

## Known limitations

- **No switch variant** — that is a separate component despite the same
  `FormCheckboxControl` contract, because the semantics differ ("turn on now" vs "tick to
  submit").
