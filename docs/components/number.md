# `PctNumber` — number field

**Summary:** A number field with a step and bounds, and the keyboard the platform already gives it.
**Entrypoint:** `@pacit/components/field`
**Selector:** `input[pctNumber]` — on an `<input type="text">`, a **deliberate exception** to
[`req-api-platform`](../requirements/api.md#req-api-platform) ([0009](../decisions/0009-number-field.md))
**Status:** released
**Category:** Text & numbers
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
| **Inputs**      | `FormValueControl` + `FormUiControl`, plus `min`, `max`, `step`, `minFractionDigits`, `maxFractionDigits`, `useGrouping`, `locale`, `autocomplete`                          |
| **Bounds**      | `min`/`max` belong to `FormUiControl` — with `[formField]` the directive fills them from the schema's `min()`/`max()` validators. **They are not repeated in the template** |
| **DI contract** | `PCT_FIELD`; `fieldAppearance: 'boxed'`, `fieldCursor: 'text'`                                                                                                              |
| **Harness**     | `PctNumberHarness`                                                                                                                                                          |

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

| key                   | effect                                                                                                                                                                                                    | test                                       |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| `↑` / `↓`             | step by `step`                                                                                                                                                                                            | `apps/sandbox-e2e/src/number.spec.ts`      |
| `PageUp` / `PageDown` | a larger step                                                                                                                                                                                             | `apps/sandbox-e2e/src/number.spec.ts`      |
| typing                | the text **is not rewritten**, so the caret does not jump to the end                                                                                                                                      | `libs/components/field/src/number.spec.ts` |
| `Enter` / `blur`      | commit: rounding and clamping to the bounds; text that is not a number is **kept** and named `Not a number` ([0070](../decisions/0070-what-the-control-knows-and-the-form-cannot-is-a-second-channel.md)) | `libs/components/field/src/number.spec.ts` |

## Checks

| criterion                       | evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Junk kept and named             | `libs/components/field/src/number.spec.ts` — rejected content stays in the field with `aria-invalid`, the wrapper's line says `Not a number`, and a keystroke or a value from outside takes it back; `apps/sandbox-e2e/src/number.spec.ts` — the same in three engines, in French ([0070](../decisions/0070-what-the-control-knows-and-the-form-cannot-is-a-second-channel.md))                                                                                                                                             |
| Locale-aware parsing            | `libs/components/field/src/number.property.spec.ts` — `parse(format(n)) === n` asked of the real control over **22 locales** from a fixed seed, beside the five laws that hold the rest of a commit (grouping visible in the text and absent from the value, the rounding, junk kept and named, blank cleared and not named, the announced value). The parser's three widenings past `pl`/`en` are measured rather than argued: disabling one at a time turns 2, 3 and 3 of the six sweeps red (`req-api-number`, plan 5.1) |
| ARIA APG pattern in the JSDoc   | none — gap                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Keyboard map tested             | `apps/sandbox-e2e/src/number.spec.ts`, `libs/components/field/src/number.spec.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| axe audit                       | `apps/sandbox-e2e/src/a11y.spec.ts` (the `/number` view)                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Input purpose (WCAG 1.3.5)      | `libs/components/field/src/number.spec.ts` — `autocomplete="off"` with no binding, and the purpose a consumer declares written through. The default refuses autofill because a browser's formatted string is a value this control's parser rejects; the input exists because three purposes on the criterion's list (`bday-day`, `bday-month`, `bday-year`) are numbers a person types here (plan 4.37)                                                                                                                     |
| Visual screenshot               | `apps/sandbox-e2e/src/visual.spec.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `forced-colors: active`         | `apps/sandbox-e2e/src/forced-colors.spec.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `prefers-reduced-motion`        | `apps/sandbox-e2e/src/preferences.spec.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Touch target                    | `apps/sandbox-e2e/src/field-hitarea.spec.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Size axis                       | `apps/sandbox-e2e/src/size.spec.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Density axis                    | none — gap                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| RTL                             | partly — `tools/check-styles.mjs` (point 5, [`req-token-logical`](../requirements/tokens.md#req-token-logical)) over the stylesheet, and the `number-amount-rtl` baseline in `apps/sandbox-e2e/src/visual.spec.ts`. **Not yet:** numbers carry a direction of their own inside RTL text, and nothing measures what the field does with a mixed string                                                                                                                                                                       |
| SSR + hydration                 | `apps/sandbox-e2e/src/hydration.spec.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Forms                           | `libs/components/field/src/field-controls.spec.ts`, `apps/sandbox-e2e/src/forms.spec.ts`                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Parts in the inventory          | `libs/components/parts.snapshot.md`, `tools/check-parts.mjs` (target `check-parts`) — the directive exposes no parts of its own; the `field` entrypoint's inventory covers it in the same row                                                                                                                                                                                                                                                                                                                               |
| Tokens + `contrast.policy.json` | shared with `field`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Strings through `PCT_TEXTS`     | `tools/check-texts.mjs` — the developer warnings are **permanently English** and go dark outside `isDevMode()`, which the gate measures with a point of its own ([0007](../decisions/0007-config-and-texts.md))                                                                                                                                                                                                                                                                                                             |
| Size budget                     | none — gap                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Screen-reader log               | none — gap. **The most needed of all the controls** — `aria-valuetext` is the one thing a reader announces instead of the raw number                                                                                                                                                                                                                                                                                                                                                                                        |
| docs page                       | `/components/number` on the published site — prerendered, the demo's own source is the code tab (2.1.7)                                                                                                                                                                                                                                                                                                                                                                                                                     |

## Decisions

[0009](../decisions/0009-number-field.md) (the main one),
[0003](../decisions/0003-wrapper-and-control.md), [0005](../decisions/0005-signal-forms-without-cva.md)

## Known limitations

- **A typed dot cannot mean both things where the locale groups with one.** In `de-DE` or
  `tr-TR` a typed `0.123` is read as the grouped 123 and not as nought point one two three:
  three digits and then the end is exactly the shape `Intl` writes a thousand in, and grouping
  has to win the tie — losing it would mean the control could not read back the text it had
  just written. The tie is now a stated property rather than an argument, and the law that does
  hold (a keypad dot at every decimal length) is asked of the 18 locales that group with
  something else.
- **What the parser's sweep does not reach yet:** clamping to `min`/`max`, the stepping keys,
  a locale changing under a value the field already holds, and the negative zero a commit can
  produce — `-0.0001` into a field of no decimals shows a minus sign the model does not carry.
  Each of those needs a new fixture surface rather than one more assertion, which is why they
  are named here instead of being asserted badly.
- **The starting point of a step is the signal, not the DOM** — and that is a requirement, not
  an optimisation. A read from the DOM can always be one pass behind
  ([`lesson-32`](../lessons.md#lesson-32)).
- **The mobile numeric keypad** does not follow from the field's type and has to be requested
  separately.
