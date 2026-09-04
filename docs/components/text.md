# `PctText` — text field

**Summary:** A text field on the platform's own `<input>` element, wired to the label and the error around it.
**Entrypoint:** `@pacit/components/field`
**Selector:** `input[pctText]` — **a component on a native `<input>`**, not a directive
(directives cannot have styles, and we do not want an API resting on `::ng-deep`)
**Status:** released
**Category:** Inputs
**ARIA APG pattern:** a native `<input>` — `type`, the browser's autofill and the mobile
keyboard modes are all preserved

## Usage

```html
<pct-field label="Workspace name">
  <input pctText />
</pct-field>
```

## Contract

|                 |                                                                                                                                                    |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Value**       | `string`, empty is `''`                                                                                                                            |
| **Inputs**      | `value` (`model`), `disabled`, `readonly`, `invalid`, `touched`, `required`, `errors`, `name`, `touch` — i.e. `FormValueControl` + `FormUiControl` |
| **Outputs**     | `valueChange` (through `model`)                                                                                                                    |
| **Parts**       | inherits the wrapper's parts; exposes none of its own                                                                                              |
| **DI contract** | registers through `PCT_FIELD`; `fieldAppearance: 'boxed'`, `fieldCursor: 'text'`                                                                   |

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

None of its own — fully native
([`req-api-platform`](../requirements/api.md#req-api-platform)).

## Checks

| criterion                       | evidence                                                                                                                                                                                      |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ARIA APG pattern in the JSDoc   | none — gap                                                                                                                                                                                    |
| Keyboard map                    | not applicable — native                                                                                                                                                                       |
| axe audit                       | `apps/sandbox-e2e/src/a11y.spec.ts` (the `/text` view)                                                                                                                                        |
| Visual screenshot               | `apps/sandbox-e2e/src/visual.spec.ts`                                                                                                                                                         |
| `forced-colors: active`         | `apps/sandbox-e2e/src/forced-colors.spec.ts`                                                                                                                                                  |
| `prefers-reduced-motion`        | `apps/sandbox-e2e/src/preferences.spec.ts`                                                                                                                                                    |
| Touch target                    | `apps/sandbox-e2e/src/field-hitarea.spec.ts` (guaranteed by the wrapper)                                                                                                                      |
| Size axis                       | `apps/sandbox-e2e/src/size.spec.ts` — size belongs to the wrapper                                                                                                                             |
| Density axis                    | none — gap                                                                                                                                                                                    |
| RTL                             | none — gap                                                                                                                                                                                    |
| SSR + hydration                 | `apps/sandbox-e2e/src/hydration.spec.ts`                                                                                                                                                      |
| Forms                           | `libs/components/field/src/field-controls.spec.ts`, `apps/sandbox-e2e/src/forms.spec.ts` — signal forms, `[formControl]` and `[(ngModel)]`, **each starting from a non-empty value**          |
| Parts in the inventory          | `libs/components/parts.snapshot.md`, `tools/check-parts.mjs` (target `check-parts`) — the component exposes no parts of its own; the `field` entrypoint's inventory covers it in the same row |
| Tokens + `contrast.policy.json` | `libs/tokens/src/contrast.policy.json`                                                                                                                                                        |
| Strings through `PCT_TEXTS`     | `tools/check-texts.mjs` — no strings of its own                                                                                                                                               |
| Size budget                     | none — gap (shares an entrypoint with `field`)                                                                                                                                                |
| Screen-reader log               | none — gap                                                                                                                                                                                    |
| docs page                       | `/components/text` on the published site — prerendered, the demo's own source is the code tab (2.1.7)                                                                                         |

## Decisions

[0003](../decisions/0003-wrapper-and-control.md), [0005](../decisions/0005-signal-forms-without-cva.md)

## Known limitations

- **Coexistence with `DefaultValueAccessor` rests on a heuristic.** The control detects an
  `NgControl` **without** a `FormField` and then gives up ownership of the value. The condition
  has already been too wide once and rendered an empty field against a non-empty model
  ([`lesson-20`](../lessons.md#lesson-20), [`lesson-26`](../lessons.md#lesson-26)) — it is the
  most fragile part of this control.
- **No `textarea`** — autosize is a separate component, not built yet.
