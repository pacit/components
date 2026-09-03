# `PctNumber` — number field

**Entrypoint:** `@pacit/components/field`
**Selector:** `input[pctNumber]` — on an `<input type="text">`, a **deliberate exception** to
[`req-api-platform`](../requirements/api.md#req-api-platform) ([0009](../decisions/0009-number-field.md))
**Status:** released
**Category:** Inputs
**ARIA APG pattern:** [Spinbutton](https://www.w3.org/WAI/ARIA/apg/patterns/spinbutton/) —
`role="spinbutton"`, `aria-valuenow`, `aria-valuetext`

## Usage

```html
<pct-field label="Monthly budget">
  <input pctNumber [formField]="limits.budget" />
</pct-field>
```

## Contract

|                 |                                                                                                                                                                             |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Value**       | `number \| null` — empty is `null`, **never `0` or `NaN`**                                                                                                                  |
| **Inputs**      | `FormValueControl` + `FormUiControl`, plus `min`, `max`, `step`, `minFractionDigits`, `maxFractionDigits`, `useGrouping`, `locale`                                          |
| **Bounds**      | `min`/`max` belong to `FormUiControl` — with `[formField]` the directive fills them from the schema's `min()`/`max()` validators. **They are not repeated in the template** |
| **DI contract** | `PCT_FIELD`; `fieldAppearance: 'boxed'`, `fieldCursor: 'text'`                                                                                                              |

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

| key                   | effect                                                               | test                                       |
| --------------------- | -------------------------------------------------------------------- | ------------------------------------------ |
| `↑` / `↓`             | step by `step`                                                       | `apps/sandbox-e2e/src/number.spec.ts`      |
| `PageUp` / `PageDown` | a larger step                                                        | `apps/sandbox-e2e/src/number.spec.ts`      |
| typing                | the text **is not rewritten**, so the caret does not jump to the end | `libs/components/field/src/number.spec.ts` |
| `Enter` / `blur`      | commit: rounding and clamping to the bounds                          | `libs/components/field/src/number.spec.ts` |

## Checks

| criterion                       | evidence                                                                                                                                                                                                        |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ARIA APG pattern in the JSDoc   | none — gap                                                                                                                                                                                                      |
| Keyboard map tested             | `apps/sandbox-e2e/src/number.spec.ts`, `libs/components/field/src/number.spec.ts`                                                                                                                               |
| axe audit                       | `apps/sandbox-e2e/src/a11y.spec.ts` (the `/number` view)                                                                                                                                                        |
| Visual screenshot               | `apps/sandbox-e2e/src/visual.spec.ts`                                                                                                                                                                           |
| `forced-colors: active`         | `apps/sandbox-e2e/src/forced-colors.spec.ts`                                                                                                                                                                    |
| `prefers-reduced-motion`        | `apps/sandbox-e2e/src/preferences.spec.ts`                                                                                                                                                                      |
| Touch target                    | `apps/sandbox-e2e/src/field-hitarea.spec.ts`                                                                                                                                                                    |
| Size axis                       | `apps/sandbox-e2e/src/size.spec.ts`                                                                                                                                                                             |
| Density axis                    | none — gap                                                                                                                                                                                                      |
| RTL                             | none — gap. **A higher risk than in the other controls:** numbers have a direction of their own inside RTL text                                                                                                 |
| SSR + hydration                 | `apps/sandbox-e2e/src/hydration.spec.ts`                                                                                                                                                                        |
| Forms                           | `libs/components/field/src/field-controls.spec.ts`, `apps/sandbox-e2e/src/forms.spec.ts`                                                                                                                        |
| Parts in the inventory          | `libs/components/parts.snapshot.md`, `tools/check-parts.mjs` (target `check-parts`) — the directive exposes no parts of its own; the `field` entrypoint's inventory covers it in the same row                   |
| Tokens + `contrast.policy.json` | shared with `field`                                                                                                                                                                                             |
| Strings through `PCT_TEXTS`     | `tools/check-texts.mjs` — the developer warnings are **permanently English** and go dark outside `isDevMode()`, which the gate measures with a point of its own ([0007](../decisions/0007-config-and-texts.md)) |
| Size budget                     | none — gap                                                                                                                                                                                                      |
| Screen-reader log               | none — gap. **The most needed of all the controls** — `aria-valuetext` is the one thing a reader announces instead of the raw number                                                                            |
| docs page                       | `/components/number` on the published site — prerendered, the demo's own source is the code tab (2.1.7)                                                                                                         |

## Decisions

[0009](../decisions/0009-number-field.md) (the main one),
[0003](../decisions/0003-wrapper-and-control.md), [0005](../decisions/0005-signal-forms-without-cva.md)

## Known limitations

- **No property tests for the parser.** Parsing is **wider** than formatting (the grouping
  separator is removed conditionally, dot and comma both act as decimal), so the input space is
  larger than can be covered by hand. The model candidate: `parse(format(n)) === n` for any `n`
  and any locale.
- **The starting point of a step is the signal, not the DOM** — and that is a requirement, not
  an optimisation. A read from the DOM can always be one pass behind
  ([`lesson-32`](../lessons.md#lesson-32)).
- **The mobile numeric keypad** does not follow from the field's type and has to be requested
  separately.
