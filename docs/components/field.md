# `PctField` — form control wrapper

**Summary:** The wrapper around a form control — its label, its hint, its error, and the wiring between the three.
**Entrypoint:** `@pacit/components/field`
**Selector:** `pct-field`
**Status:** released
**Category:** Inputs
**ARIA APG pattern:** none — the wrapper has no role of its own: it supplies the label and
the descriptions, and the control inside carries the role

## Usage

```html
<pct-field label="E-mail" hint="A work address">
  <input pctText type="email" />
</pct-field>
```

## Contract

|                 |                                                                                                                                                                                                                                                                                                         |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Value**       | **does not implement the form contract** — the control inside does ([0003](../decisions/0003-wrapper-and-control.md))                                                                                                                                                                                   |
| **Inputs**      | `label`, `hint`, `size`, `required`                                                                                                                                                                                                                                                                     |
| **Outputs**     | none                                                                                                                                                                                                                                                                                                    |
| **Slots**       | default (the control), `[pctPrefix]`, `[pctSuffix]` — both with an `inset` \| `fill` axis                                                                                                                                                                                                               |
| **Parts**       | the wrapper: `field-header`, `field-label`, `field-label-aux`, `field-row`, `field-prefix`, `field-control`, `field-suffix`, `field-footer`, `field-hint`, `field-error`, `field-message-aux`; slot content: `field-prefix-item`, `field-suffix-item`, `field-label-aux-item`, `field-message-aux-item` |
| **DI contract** | `PCT_FIELD` — the control registers itself, the wrapper hands over the description ids for `aria-describedby`; `PctFieldApi.surface` as the reference surface for overlays                                                                                                                              |
| **Tokens**      | `--pct-field-*`, `--pct-control-height-*`, `--pct-target-min`                                                                                                                                                                                                                                           |

## Parts

| part                     | what it is                                                     |
| ------------------------ | -------------------------------------------------------------- |
| `field-header`           | the row above the control: the label and what stands beside it |
| `field-label`            | the label, tied to the control by id                           |
| `field-label-aux`        | the slot beside the label — a counter, a link                  |
| `field-label-aux-item`   | one projected item inside the label slot                       |
| `field-row`              | the control's row, with its prefix and suffix                  |
| `field-prefix`           | what sits before the control inside the row                    |
| `field-prefix-item`      | one projected item inside the prefix                           |
| `field-control`          | the wrapped control itself                                     |
| `field-suffix`           | what sits after the control inside the row                     |
| `field-suffix-item`      | one projected item inside the suffix                           |
| `field-footer`           | the row under the control: the hint or the error               |
| `field-hint`             | the hint, read as the description of the control               |
| `field-error`            | the message when the control is invalid                        |
| `field-message-aux`      | the slot beside the hint or error                              |
| `field-message-aux-item` | one projected item inside the message slot                     |

## Theming

```css
[data-theme='brand'] {
  --pct-field-border-focus: #0f766e;
  --pct-field-bg: #f0fdfa;
  --pct-field-fg: #134e4a;
}
```

## Keyboard map

None of its own — the wrapper is not focusable. A click on the row's background is
**forwarded to the control**: `focus()` on `mousedown`, `activate()` on `click`.

## Checks

| criterion                       | evidence                                                                                                                                                                                                                                                                                                                                                               |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ARIA APG pattern in the JSDoc   | none — gap                                                                                                                                                                                                                                                                                                                                                             |
| Keyboard map                    | not applicable                                                                                                                                                                                                                                                                                                                                                         |
| axe audit                       | `apps/sandbox-e2e/src/a11y.spec.ts` (the `/field` view, plus the validation error state)                                                                                                                                                                                                                                                                               |
| Visual screenshot               | `apps/sandbox-e2e/src/visual.spec.ts`                                                                                                                                                                                                                                                                                                                                  |
| `forced-colors: active`         | `apps/sandbox-e2e/src/forced-colors.spec.ts`; the mapping for the whole library is written down in `field.scss`, and `tools/check-styles.mjs` (point 7) makes the `bare` variant say in the mode itself that it has neither surface nor ring — until now the base rules decided that, and only because they are more specific ([`lesson-70`](../lessons.md#lesson-70)) |
| `prefers-reduced-motion`        | `apps/sandbox-e2e/src/preferences.spec.ts`                                                                                                                                                                                                                                                                                                                             |
| Touch target ≥ 24×24 px         | `apps/sandbox-e2e/src/field-hitarea.spec.ts` — **a cursor map over a grid of points**, not a measurement of one element                                                                                                                                                                                                                                                |
| Size axis                       | `apps/sandbox-e2e/src/size.spec.ts` — the field row equals a button of the same size                                                                                                                                                                                                                                                                                   |
| Density axis                    | none — gap                                                                                                                                                                                                                                                                                                                                                             |
| RTL                             | none — gap                                                                                                                                                                                                                                                                                                                                                             |
| SSR + hydration                 | `apps/sandbox-e2e/src/hydration.spec.ts`                                                                                                                                                                                                                                                                                                                               |
| Forms                           | `libs/components/field/src/field-controls.spec.ts` — the wrapper is tested with every control                                                                                                                                                                                                                                                                          |
| Parts in the inventory          | `libs/components/parts.snapshot.md`, `tools/check-parts.mjs` (target `check-parts`). **The card has under-counted twice**: 11 parts against a requirement listing 7, then 15 against a card listing 11 — four slot parts sit in the `host` blocks of directives. Both times noticed only on counting                                                                   |
| Tokens + `contrast.policy.json` | `libs/tokens/src/contrast.policy.json`                                                                                                                                                                                                                                                                                                                                 |
| Strings through `PCT_TEXTS`     | `tools/check-texts.mjs` — every string comes from an input                                                                                                                                                                                                                                                                                                             |
| Size budget                     | none — gap. Measured today: **~62 kB** in the FESM (the largest entrypoint)                                                                                                                                                                                                                                                                                            |
| Screen-reader log               | none — gap                                                                                                                                                                                                                                                                                                                                                             |
| docs page                       | `/components/field` on the published site — prerendered, the demo's own source is the code tab (2.1.7)                                                                                                                                                                                                                                                                 |

## Decisions

[0003](../decisions/0003-wrapper-and-control.md) (the main one),
[0004](../decisions/0004-explicit-height.md), [0006](../decisions/0006-overlay.md)

## Known limitations

- **Two controls in one chrome are reported, not repaired.** The last to register wins, as
  before — the chrome cannot know which of the two the label was written for — but it is no
  longer quiet about it: a dev-mode message names both control ids
  ([`lesson-68`](../lessons.md#lesson-68)). Registration is a pair (`attach` / `detach`), so a
  control merely replaced inside an `@if` is not mistaken for a second one, and a control that
  leaves takes its state out of the chrome with it.
- **An `inset` button has to be one step smaller than the field.** At size `sm` there is no
  step below, so the button fills the height there and pushes the row out by the thickness of
  the frame. That is a corollary of [0004](../decisions/0004-explicit-height.md), not
  a fitting defect.
