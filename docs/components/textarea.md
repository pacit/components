# `PctAutosize` — a textarea as tall as its text

**Entrypoint:** `@pacit/components/field`
**Selector:** `textarea[pctText][pctAutosize]` — **a directive**, not a component: `PctText`
is already the component on that element and Angular matches one component to a node
**Status:** released
**ARIA APG pattern:** none — the APG has no pattern for a height. The control is a native
`<textarea>` and stays one, so `placeholder`, `maxlength`, `spellcheck`, `wrap` and the mobile
keyboard mode are the platform's and untouched

## Contract

|                 |                                                                                                                                                      |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Value**       | none of its own — the value is `PctText`'s (`FormValueControl<string>`). This directive adds a **height** and nothing else                           |
| **Inputs**      | `rows` (the floor, in lines — the platform's own attribute, read and written back), `maxRows` (the ceiling, in lines; `0` is none)                   |
| **Outputs**     | none                                                                                                                                                 |
| **Parts**       | none of its own — it adds no element, so there is nothing new to name                                                                                |
| **DI contract** | requires `PctText` on the same element (the selector says so): the rules that carry the feature live in `text.scss`, which is `PctText`'s stylesheet |
| **Attributes**  | writes `data-pct-autosize` (the sheet's hook), `data-pct-capped` when there is a ceiling, `--_pct-text-rows` and `max-block-size` in `lh`            |

**Where the height comes from.** In chromium and webkit, from `field-sizing: content` — the
engine lays the box out against its own text and no script is involved at any point. In
firefox, which does not have the property and does not degrade
([0041](../decisions/0041-a-height-the-platform-computes.md)), from a measurement in script.
The two are made to agree: the sheet gives the CSS road back the `rows` the property discards,
and the measurement adds back the border `scrollHeight` leaves out. The e2e file asks the same
questions of all three engines for exactly that reason.

## Keyboard map

None of its own — fully native
([`req-api-platform`](../requirements/api.md#req-api-platform)).

## Checks

| criterion                       | evidence                                                                                                                                                                                                                        |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ARIA APG pattern in the JSDoc   | not applicable — a height is not a pattern; the class comment names the decision instead                                                                                                                                        |
| Keyboard map                    | not applicable — native                                                                                                                                                                                                         |
| axe audit                       | `apps/sandbox-e2e/src/a11y.spec.ts` — the `/textarea` view is in `SBX_ROUTES`, so the audit and the RTL audit both take it                                                                                                      |
| Visual screenshot               | none — gap. **Deliberate for now:** the subject is a height that changes with the value, and a baseline pins one value                                                                                                          |
| `forced-colors: active`         | inherited from `PctText` — the directive paints nothing                                                                                                                                                                         |
| `prefers-reduced-motion`        | not applicable — the height is not animated                                                                                                                                                                                     |
| Touch target                    | `apps/sandbox-e2e/src/field-hitarea.spec.ts` — guaranteed by the wrapper, and autosize only ever makes the target taller                                                                                                        |
| Size axis                       | `apps/sandbox-e2e/src/size.spec.ts` — size belongs to the wrapper; the floor is `rows` line boxes, so it follows the field's font size on its own                                                                               |
| Density axis                    | none — gap                                                                                                                                                                                                                      |
| RTL                             | `apps/sandbox-e2e/src/rtl.spec.ts` — the `/textarea` view is in `SBX_ROUTES`. The feature is a block size, and `min-block-size` / `max-block-size` are logical                                                                  |
| SSR + hydration                 | `apps/sandbox-e2e/src/hydration.spec.ts` — and the height at the first paint is a **measured difference between the roads**: right with no script where the property exists, the floor until hydration where it does not (0041) |
| Forms                           | `libs/components/field/src/autosize.spec.ts` — signal forms through `PctText`'s model, and `[formControl]` through the form's own `valueChanges`, which is the case [`lesson-114`](../lessons.md#lesson-114) was written from   |
| Two roads agree                 | `apps/sandbox-e2e/src/textarea.spec.ts` — one set of assertions over two implementations, in three engines, within a pixel ([`lesson-111`](../lessons.md#lesson-111))                                                           |
| The fallback expires            | `apps/sandbox-e2e/src/textarea.spec.ts` — a case asserting which engine has `field-sizing`, so the day firefox ships it the run says the measured road has lost its last consumer                                               |
| Parts in the inventory          | `libs/components/parts.snapshot.md` — the directive exposes no parts of its own                                                                                                                                                 |
| Tokens + `contrast.policy.json` | not applicable — no colour of its own                                                                                                                                                                                           |
| Strings through `PCT_TEXTS`     | `tools/check-texts.mjs` — one dev-mode `console.warn` (a ceiling under a floor) and no user-facing string                                                                                                                       |
| Size budget                     | `libs/components/size.snapshot.md`, `tools/check-bundle.mjs` (target `check-bundle`)                                                                                                                                            |
| Screen-reader log               | none — gap                                                                                                                                                                                                                      |
| docs page                       | `/components/textarea` on the published site — prerendered, the demo's own source is the code tab (2.1.7)                                                                                                                       |

## Decisions

[0041](../decisions/0041-a-height-the-platform-computes.md) (the road, the shape and what the
measurement has to be told), [0034](../decisions/0034-multiplicity-is-a-tag.md) (the rule that
put this in the selector rather than in an input),
[0003](../decisions/0003-wrapper-and-control.md),
[0004](../decisions/0004-explicit-height.md) (which anticipated a textarea in writing: the
field's height is a `min-height`, so taller content pushes the control out)

## Known limitations

- **No manual resize.** `resize: none` under autosize: a drag handle is a second author of the
  height and this feature is the first. A consumer who wants the handle wants a plain
  `<textarea pctText>`.
- **On firefox, a server-rendered value is the floor until hydration.** The measured road
  cannot run before there is a layout, and this is stated rather than hidden — where
  `field-sizing` exists the first paint is already right.
- **The two roads round differently**, by up to a pixel: `scrollHeight` is an integer. Nothing
  in a layout depends on it, but a gate comparing the roads compares with a tolerance.
- **A bound `[rows]` is read by the directive**, which writes it back to the element so both
  roads see one number. A consumer setting `rows` through the DOM instead of the binding is
  outside the contract.
- **No character counter.** `pctMessageAux` already holds one and belongs to the chrome
  ([`field.md`](field.md)), so a counter here would be a second place to put the same thing.
