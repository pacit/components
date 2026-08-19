# Requirements — component API

The contract the consumer sees: names, inputs, outputs, slots, parts and configuration. This
area absorbed the former icons section plus the `data-pct-part` contract, which used to sit
among the tokens even though it is styling API and not a token.

> The shape of an entry and the meaning of the **Gate** / **Control** fields are described
> in the [README](../README.md#requirement-shape).

---

## Foundations

### <a id="req-api-names"></a>`req-api-names` — Naming per the new style guide

**Promise.** Class `PctButton` (no `Component` suffix), file `button.ts` (no `.component.`),
element selector in kebab-case (`pct-field`), attribute selector in camelCase
(`[pctButton]`).

**Gate:** `libs/components/eslint.config.mjs` — `@angular-eslint/component-selector`,
`directive-selector`, `component-class-suffix`
**Control:** none — deliberately: an ESLint rule has no quiet-pass mode

---

### <a id="req-api-foundation"></a>`req-api-foundation` — Standalone, OnPush, zoneless-safe

**Promise.** Every component is standalone, OnPush and zoneless-safe (state through signals
only, zero reliance on `zone.js`). Instead of `ngOnChanges` → `computed`/`effect`. **Neither
`standalone: true` nor `changeDetection` is set explicitly** — in Angular v22+ both are the
default, and the official guide forbids repeating them.

**Gate:** `tools/check-zoneless.mjs` (target `check-zoneless`, in CI) — measuring
`ɵcmp.onPush === true` and `ɵcmp.standalone === true` for **every** component of the built
package, plus the denominator (every `@Component` in the sources must be in the package —
otherwise "every" is counted over a sample that quietly shrinks) and a ban on repeating either
default in the decorator. The reading comes from `dist`, not from the sources, and that is not
convenience: the partial declaration **omits** `changeDetection` when it is the default, so
the value only comes into being at link time and can only be measured there
([`lesson-46`](../lessons.md#lesson-46)). Besides that, the library's unit tests configure
zoneless in `TestBed` (`libs/components/*/src/*.spec.ts`), so a component relying on `zone.js`
knocks over its own test
**Control:** `tools/check-zoneless.fixtures/` — doctored inputs, one per way of disarming the
measurement (an empty set of source components, a component outside the package,
`onPush: false`, `standalone: false`, a decorator repeating the defaults). Each must be
rejected **by the point it declares**, and the reference input must pass. Plus a run against
the real repository: `ChangeDetectionStrategy.Default` added to `PctButton` fires point 6
straight away (the source scan) and point 5 once the package is rebuilt — the `ɵcmp`
measurement on `dist`; and separately a run proving that the decorator parser reports its own
drift (7 recognised out of 8) instead of quietly shrinking the denominator
**Lessons:** [`lesson-7`](../lessons.md#lesson-7), [`lesson-11`](../lessons.md#lesson-11),
[`lesson-46`](../lessons.md#lesson-46)

---

### <a id="req-api-signals"></a>`req-api-signals` — Inputs and outputs through signals

**Promise.** `input()` / `input.required()` / `output()`, two-way through `model()`. Booleans
through `booleanAttribute`, numbers through `numberAttribute`. Names follow native HTML where
possible (`disabled`, `readonly`, `size`, `variant`, `loading`, `invalid`) — with no `pct`
prefix.

**Gate:** `libs/components/button/src/button.spec.ts`,
`libs/components/checkbox/src/checkbox.spec.ts` — binding by attribute and by property
**Control:** none — deliberately: a wrong transform shows up as a wrong type in the template,
i.e. a compile error — it does not belong to the [`req-axis`](../00-axis.md) class
**Lessons:** [`lesson-12`](../lessons.md#lesson-12)

---

### <a id="req-api-attributes"></a>`req-api-attributes` — State as `data-pct-*`, not CSS classes

**Promise.** State is reflected on the host as `data-pct-*` attributes (e.g.
`data-pct-size`, `data-pct-disabled`), not as CSS classes.

**Gate:** `apps/sandbox-e2e/src/states.spec.ts` — the cross-cutting states view queries by
attribute
**Control:** none — deliberately: a selector matching nothing yields an empty locator, i.e.
a **red** test, not a green one
**Decision:** [0013 — no headless core / skin split](../decisions/0013-no-headless-split.md)

---

### <a id="req-api-config"></a>`req-api-config` — Global configuration via `providePctConfig`

**Promise.** Global configuration follows the `providePctConfig({…})` pattern with a DI token,
overridable per component through inputs.

**Gate:** `libs/components/button/src/button.spec.ts` — the default `size` from the
configuration and its override by an input
**Control:** none — deliberately: the test compares two **different** values, so it cannot
pass on the defaults
**Binds at:** settling **whether per-component defaults go through the configuration**
(`providePctConfig({ button: { variant: 'outline' } })`) **or through tokens** — Material and
PrimeNG both ended up with default providers. The decision has to come before the fifteenth
component, because after that it is a breaking change in every one of them
**Decision:** [0007 — configuration apart from texts](../decisions/0007-config-and-texts.md)

> Today `PctConfig` has **one field** (`defaultSize`). The mechanism works; the shape is
> open.

---

## Forms

### <a id="req-api-signal-forms"></a>`req-api-signal-forms` — Controls are native signal-forms controls

**Promise.** Controls implement `FormValueControl` (or `FormCheckboxControl`) from
`@angular/forms/signals`. **`ControlValueAccessor` is NOT implemented** — and yet
`[formControl]`, `formControlName` and `[(ngModel)]` work with no compatibility layer.

**Gate:** `libs/components/field/src/field-controls.spec.ts`,
`apps/sandbox-e2e/src/forms.spec.ts` — all three form APIs on the same control
**Control:** the tests start from a **non-empty** initial value — with an empty model the
regression in [`lesson-26`](../lessons.md#lesson-26) was invisible
**Decision:** [0005 — signal forms without CVA](../decisions/0005-signal-forms-without-cva.md)
**Lessons:** [`lesson-9`](../lessons.md#lesson-9), [`lesson-20`](../lessons.md#lesson-20),
[`lesson-26`](../lessons.md#lesson-26)

---

### <a id="req-api-container"></a>`req-api-container` — In a composite component the control is the container

**Promise.** In a group (`pct-radio-group` + `pct-radio`) only the container implements the
`FormValueControl` contract — from the form's point of view one value is being edited. The
member elements talk to the container through DI and have no form state of their own.

**Gate:** `libs/components/radio/src/radio.spec.ts`
**Control:** none — deliberately: the violation would be a second `FormValueControl` in the
tree, which Angular reports itself
**Lessons:** [`lesson-16`](../lessons.md#lesson-16)

---

### <a id="req-api-wrapper"></a>`req-api-wrapper` — Form controls are a wrapper plus a control

**Promise.** `pct-field` provides the label, the hint, the error message, the required marker
and the `[pctPrefix]` / `[pctSuffix]` slots. The form contract is implemented **not by the
wrapper** but by the control inside it — which keeps the typing with the kind of field. The
control registers itself through the `PCT_FIELD` token; the wrapper hands it the description
ids for `aria-describedby`.

**One chrome holds one control**, and registration is a **pair**: `attach` on construction,
`detach` on destruction (`pctAttachToField` in `core` books both). The pair is what tells a
control **replaced** — an `@if` around it — from **two controls at once**, which is reported
under `isDevMode()` rather than repaired: the chrome cannot know which of the two the label
was written for, and the one that did not win looks exactly as it should
([`lesson-68`](../lessons.md#lesson-68)).

**Gate:** `libs/components/field/src/field.spec.ts` — the chrome's own cases plus the four
about registration (two controls reported, one silent, a swap silent, and a control leaving
taking its state with it); `apps/sandbox-e2e/src/field.spec.ts`,
`apps/sandbox-e2e/src/field-hitarea.spec.ts`
**Control:** `field-hitarea.spec.ts` — a cursor map over a grid of points
(`elementFromPoint` × `getComputedStyle().cursor`); the test measures the **whole** surface of
the frame, so it cannot pass with an uncovered strip. For the pair: `detach` made a no-op
leaves the swap and the departure red (measured — and it is what a naive count of `attach`
calls would have got wrong), and the report switched off leaves the first case red
**Decision:** [0003 — wrapper and control](../decisions/0003-wrapper-and-control.md)
**Lessons:** [`lesson-21`](../lessons.md#lesson-21),
[`lesson-22`](../lessons.md#lesson-22), [`lesson-24`](../lessons.md#lesson-24),
[`lesson-27`](../lessons.md#lesson-27), [`lesson-28`](../lessons.md#lesson-28),
[`lesson-34`](../lessons.md#lesson-34), [`lesson-68`](../lessons.md#lesson-68)

---

### <a id="req-api-no-wrapper"></a>`req-api-no-wrapper` — The wrapper is optional

**Promise.** Controls also work without `pct-field` (a text field then has no label and no
messages) — in a table cell, for instance. Controls with a label layout of their own
(checkbox, radio group, select) draw the label and the messages themselves, and hand both over
to the wrapper inside `pct-field`. What they draw is what the wrapper would have drawn:
one message line, per [`req-api-message`](#req-api-message).

**Gate:** `libs/components/field/src/field-controls.spec.ts` — every control is tested in
both modes, and the three that draw their own messages are tested against the wrapper's answer
rather than only against themselves ([`lesson-76`](../lessons.md#lesson-76))
**Control:** none — deliberately: the standalone mode is **the default**, so its failure
knocks over the control's entire test suite

---

### <a id="req-api-message"></a>`req-api-message` — One message line, and the error takes it

**Promise.** Below a control there is **one** message at a time: the error while it is lit, the
hint otherwise. The rule is the same for the chrome's footer and for a control drawing its own
messages, so wrapping a control in `pct-field` does not change what it shows. The message that
gives way **leaves the DOM** rather than being hidden, and `aria-describedby` names exactly the
one on the screen.

**Gate:** `libs/components/field/src/field-controls.spec.ts` — the three controls that draw
their own messages, each in both states; `tools/check-aria.mjs` (point 6, target `check-aria`)
— every template of the library, so a component nobody has written yet is covered from its
first commit
**Control:** `tools/check-aria.fixtures/hint-beside-error` — the same two messages in two
independent blocks, rejected on point 6; the unit case was written first and fired on the
repository as it stood (`expected [ 'error', 'hint' ] to deeply equal [ StringMatching
/error$/ ]`)
**Decision:** [0022 — one message line](../decisions/0022-one-message-line.md)
**Lessons:** [`lesson-76`](../lessons.md#lesson-76)

---

### <a id="req-api-frame"></a>`req-api-frame` — The control tells the wrapper whether it wants a frame

**Promise.** `fieldAppearance`: `boxed` for text fields, the select and the date field; `bare`
for the checkbox and the radio group. The wrapper guarantees the **minimum touch target** of
the control column (`--pct-target-min`) regardless of the variant.

**Gate:** `apps/sandbox-e2e/src/field.spec.ts`,
[`req-a11y-touch`](a11y.md#req-a11y-touch)
**Control:** the touch-target test caught the regression described in
[`lesson-25`](../lessons.md#lesson-25) (a wrapped select: 19.6 px) — the gate has
a documented run in which it fired
**Lessons:** [`lesson-25`](../lessons.md#lesson-25)

---

### <a id="req-api-native-input"></a>`req-api-native-input` — The text field stands on a native `<input>`

**Promise.** `input[pctText]` is a component on a native `<input>`, not an element of our
own — we keep `type`, the browser's autofill and the mobile keyboard modes. A component
rather than a directive, because directives cannot have styles.

**Gate:** `libs/components/field/src/field-controls.spec.ts`
**Control:** none — deliberately: swapping `<input>` for an element of our own knocks over
the whole autofill and type test suite

---

### <a id="req-api-platform"></a>`req-api-platform` — We do not implement what the platform gives us

**Promise.** We do not write keyboard behaviour ourselves if the browser provides it. The
radio group stands on native `<input type="radio">` elements sharing a `name`, so arrow
navigation, wrapping and "one stop in the Tab order" come from the platform. We add handling
of our own only where there is no native equivalent.

**Gate:** `apps/sandbox-e2e/src/radio.spec.ts` — keyboard navigation
**Control:** none — deliberately: a navigation test has no mode in which it passes without
a working keyboard
**Exceptions:** [`req-api-number`](#req-api-number) (native `type="number"` does not know the
local separator), `PctSelect` (a native `<select>` gives no panel)

---

### <a id="req-api-number"></a>`req-api-number` — The number field does not stand on `<input type="number">`

**Promise.** `[pctNumber]` stands on `<input type="text">` with `role="spinbutton"`,
`aria-valuenow` / `aria-valuetext` and parsing of its own built on `Intl.NumberFormat`. The
value is `number | null` (empty is `null`, never `0` or `NaN`). The `min`/`max` bounds come
from the schema validators, not from a repetition in the template.

**Gate:** `libs/components/field/src/number.spec.ts`,
`apps/sandbox-e2e/src/number.spec.ts`
**Control:** none — gap: property tests for the parser (`parse(format(n)) === n` for any `n`
and any locale). Parsing is **wider** than formatting, so there are more cases than can be
thought up by hand
**Binds at:** the first locale outside `pl`/`en` reported by a consumer
**Decision:** [0009 — the number field on `type="text"`](../decisions/0009-number-field.md)
**Lessons:** [`lesson-32`](../lessons.md#lesson-32)

---

### <a id="req-api-generic"></a>`req-api-generic` — A choice control's value is of type `T`, not a string

**Promise.** `PctSelect<T>`, `PctSelectOption<T>` and `PctRadioGroup<T>` are generic
(`T = string` by default). Equality is declared by the application (`compareWith`), "nothing
selected" is a separate state (`T | null`, with `emptyValue` for non-nullable models), and the
native radio's `value` attribute describes the option but **takes no part in the choice**.

The mapping runs both ways, so **option values are unique** under that equality: a value is
what points back at an option. **Which of two equal options wins is not the same in both
components, and neither answer is a choice of ours.** In `pct-select` the code resolves it and
the earlier option wins — picking the later one shows the earlier one's label. In
`pct-radio-group` the browser resolves it: the native radios share a `name`, so only the **last**
of them stays checked, while **every** option the value matches paints itself selected — the
user sees two chosen options where a screen reader announces one. Neither component chooses for
the application nor repairs the list; each reports the pair under `isDevMode()`, because a
defect whose only witness was somebody else's diagnostic goes silent the moment that
diagnostic is removed ([`lesson-66`](../lessons.md#lesson-66)).

**Gate:** `libs/components/select/src/select.spec.ts` — the generic contract, plus the
dev-mode report of two options with one value; `libs/components/radio/src/radio.spec.ts` — the
same report for the group, which reads its options through the `PCT_RADIO_OPTION` token rather
than through the class, so the container↔element import still points one way
([`lesson-16`](../lessons.md#lesson-16)); the `typecheck` target of the `sandbox-e2e` project
**Control:** the probe from [`lesson-37`](../lessons.md#lesson-37) — five deliberately
contradictory bindings, four of which **must** break the build. Without `NoInfer<T>` the
compiler let all five through. For the uniqueness half the switched-off warning leaves three
cases red, and its mirrors stay green on their own: a list with distinct values and the same
pair of options without a `compareWith` that calls them equal. The group answers the same way,
six cases to three red — and one of its six measures the DEFECT rather than the report (both
options painted, one native checked), so it would go on standing if the warning ever left
**Decision:** [0010 — a generic value and `NoInfer`](../decisions/0010-generic-noinfer.md)
**Lessons:** [`lesson-37`](../lessons.md#lesson-37), [`lesson-66`](../lessons.md#lesson-66),
[`lesson-72`](../lessons.md#lesson-72)

> The probe's fifth case stays open and is **a limitation of Angular**: `PctRadioGroup` has no
> options input, so the only source of `T` is `value` — and `$event` from `(valueChange)` is
> still not checked there.

---

## Extensibility

### <a id="req-api-parts"></a>`req-api-parts` — The `data-pct-part` contract is public styling API

**Promise.** Elements inside components carry stable, **inventoried and versioned**
`data-pct-part="…"` attributes, letting a consumer target them with a selector that survives
updates.

**Gate:** `tools/check-parts.mjs` (target `check-parts` in the root project, in CI) — six
points. Point 3 forbids binding a part name with an expression (a name that comes into being
at runtime cannot be inventoried), point 4 compares the **Parts** sections in
[`components/`](../components/) with what the entrypoint actually exposes, and point 5
compares `libs/components/parts.snapshot.md` with the current inventory, and point 6 holds
[`req-api-parts-unique`](#req-api-parts-unique) below. Points 1 and 2 guard
the denominator: every decorator and every occurrence of the attribute in a template must be
recognised, and the list of parts is built **twice** — from the sources and from the built
package (`ɵcmp.consts`, `ɵdir.hostAttrs` after linking)
**Control:** `tools/check-parts.fixtures/` — 22 inputs, each rejected on its own
point; plus runs against the repository: renaming a part fires point 2 with a stale `dist`,
point 4 after a rebuild and point 5 once the card is reconciled; `[attr.data-pct-part]` in
a template fires point 3 from both readings at once; a part removed from a card fires point 4;
a directive whose part is not exported from the entrypoint fires point 2
**Decision:** [0013 — no headless core / skin split](../decisions/0013-no-headless-split.md)

> The inventory is **independent of `apps/docs`**. A pretty page rendering it can come later;
> generating and gating it cannot ([`req-project-apps`](project.md#req-project-apps)).

---

### <a id="req-api-parts-unique"></a>`req-api-parts-unique` — Part names are unambiguous under nesting

**Promise.** In composite components the container's parts carry a prefix of their own —
**all of them**, `group-label`, `group-hint`, `group-error` and `group-options` alike; the
wrapper names its own `field-*`
(`field-header`, `field-label`, `field-label-aux`, `field-row`, `field-prefix`,
`field-control`, `field-suffix`, `field-footer`, `field-hint`, `field-error`,
`field-message-aux`). A consumer's selector must not accidentally hit the parts of member
elements.

**Gate:** `tools/check-parts.mjs` point 6 — a component whose parts share a prefix has to
give it to **all** of them, read off the inventory rather than off a list of container
components ("is this a container" is not decidable from a template: a button projects content
too). Plus `apps/sandbox-e2e/src/radio.spec.ts`, `apps/sandbox-e2e/src/field.spec.ts` —
assertions on the **cardinality** of a collection, not on its first element
**Control:** `tools/check-parts.fixtures/part-outside-namespace`, and a run against the
repository: `group-options` renamed back to `options` fires point 6 by name. Older than both,
the collision in [`lesson-15`](../lessons.md#lesson-15) and
[`lesson-24`](../lessons.md#lesson-24) is a documented run in which the e2e half fired — the
unit tests did **not** see it, because they queried a specific element
**Lessons:** [`lesson-15`](../lessons.md#lesson-15), [`lesson-24`](../lessons.md#lesson-24)

---

### <a id="req-api-templates"></a>`req-api-templates` — Customisation through projection and templates

**Promise.** Content projection with `<ng-content select="…">` plus passing templates as
`TemplateRef` / the `*pctTemplate` directive for item-template-like elements.

**Gate:** none — gap: projection works (the wrapper's slots), but **`TemplateRef` appears
nowhere in the library** — a select's option cannot be styled with a template of one's own
today
**Control:** none — gap: an option template supplied by the consumer and never used has to
fire
**Binds at:** the first real use of the select (the option template) and at
[`req-api-icons`](#req-api-icons) — a template is the simplest icon-swap mechanism

---

### <a id="req-api-icons"></a>`req-api-icons` — Easy use of somebody else's icons

**Promise.** The library makes it possible to use icons from the popular sets (FontAwesome,
PrimeIcons, Material) and to supply your own (SVG / icon fonts).

**Gate:** none — gap: today every icon is **written into the template** as SVG in
`currentColor`. It works and adds no dependency, but it is not a mechanism — a consumer has no
way to swap the select's arrow
**Control:** none — gap: an icon override through `PCT_ICONS` that does not reach the
component has to fire
**Binds at:** the second component that needs a swappable icon
**Decision:** [0011 — icons through a template and `PCT_ICONS`](../decisions/0011-icons.md)

---

### <a id="req-api-icons-custom"></a>`req-api-icons-custom` — The library ships no icon set of its own

**Promise.** A non-goal. An icon set is a separate product with its own life cycle; the
library ships **the swap mechanism**, not icons.

**Gate:** `libs/components/check-package.mjs` — the absence of icon files in the packed
artifact would be detectable on the content listing
**Control:** none — deliberately: the violation here is **adding** something, not a quiet
disappearance; it does not belong to the [`req-axis`](../00-axis.md) class

---

### <a id="req-api-texts"></a>`req-api-texts` — The library's strings are exposed for translation

**Promise.** Text a component writes by itself goes through the `PCT_TEXTS` token and
`providePctTexts({…})`; the fields supplied override the defaults, the rest stay. The defaults
are **English**. Developer warnings (`console.warn`) **do not belong** in that channel — they
are permanently English and go dark outside `isDevMode()`.

A string is read **at render time**: the token carries `Signal<PctTexts>`, so an app switching
language without a reload sees the change. An input's default value is a read at construction
time and therefore cannot be a library string.

**Gate:** `tools/check-texts.mjs` (target `check-texts`) — six points: a string written into
a text node, into a speaking attribute or into an expression literal; prose in a signal's
default value and a read of `PCT_TEXTS` at construction; completeness of the channel (field ⟷
default ⟷ read); developer warnings outside the channel and under `isDevMode()`. Templates are
read by `parseTemplate` from `@angular/compiler`, and the list of static classes and
attributes is built **twice** — from the sources and from the built package. Plus
`libs/components/select/src/select.spec.ts` — a partial override leaves the rest at the
defaults, and a runtime language change reaches the strings
**Control:** `tools/check-texts.fixtures/` — 29 doctored inputs, each rejected on its own
**rule** (not merely its point); plus nine runs against the repository (a literal in
a template, an `aria-label` with a string before and after a rebuild, a text read inside an
input's default value, `console.warn` without `isDevMode()`, a field with no default, a dead
field, a literal in an interpolation, a static `aria-label` in a `host` block)
**Decision:** [0007 — configuration apart from texts](../decisions/0007-config-and-texts.md),
[0014 — texts as a signal](../decisions/0014-texts-as-signal.md)
**Lessons:** [`lesson-54`](../lessons.md#lesson-54)

---

## Overlays and motion

### <a id="req-api-overlay"></a>`req-api-overlay` — The overlay comes out of the control's visible edge

**Promise.** The wrapper offers controls its row as the reference surface
(`PctFieldApi.surface`); with no wrapper the anchor is the trigger itself. The panel width is
an axis of the API (`panelWidth="field" | "auto" | <CSS length>`), the abutting edge is
`panelAlign`. **The panel inherits nothing from the host**: theme, typeface and font size are
read from the trigger when it opens and carried over explicitly.

**Gate:** `apps/sandbox-e2e/src/select.spec.ts` — measuring the panel's width and offset
against the field, and the typeface and font size inside the panel
**Control:** the measurement from [`lesson-35`](../lessons.md#lesson-35) (a 301 px field ⇒
a 275 px panel, offset by 13 px; `Times New Roman` in the panel against `system-ui` in the
control) — the test compares **specific values**, so it does not pass on "roughly right"
**Decision:** [0006 — the anchor and inheritance in an overlay](../decisions/0006-overlay.md)
**Lessons:** [`lesson-18`](../lessons.md#lesson-18), [`lesson-35`](../lessons.md#lesson-35)

---

### <a id="req-api-size"></a>`req-api-size` — Size is one axis for the whole library

**Promise.** Every component taking `size` (`sm`/`md`/`lg`) takes its height from the
`--pct-control-height-{size}` token. The height is a value stated **outright** (`min-height`),
not the result of padding plus line height. A size variant **swaps the base tokens** instead
of repeating appearance rules. Inside a wrapper, size belongs to the wrapper.

**Gate:** `apps/sandbox-e2e/src/size.spec.ts` — measured in the browser
**Control:** the test checks that the heights are equal **and what that height is** — on
equality alone both components could collapse to the text line height and still "pass"
**Decision:** [0004 — height stated outright, not derived from padding](../decisions/0004-explicit-height.md)
**Lessons:** [`lesson-29`](../lessons.md#lesson-29), [`lesson-34`](../lessons.md#lesson-34)

---

### <a id="req-api-animations"></a>`req-api-animations` — Animation without `@angular/animations`

**Promise.** Animation is done with CSS + the Web Animations API. `@angular/animations` is
not a dependency.

**Gate:** none — gap: the ban is kept, but **nothing watches it** — the only thing in force is
the package's absence from `package.json`. Its natural home is the dependency gate from
[`req-project-dependencies`](project.md#req-project-dependencies)
**Control:** none — gap: an `@angular/animations` import added to the package has to fire
**Binds at:** the first component with an enter/leave transition (panel, dialog, toast) — at
which point it also has to be checked that the motion takes its duration from a token
([`req-a11y-motion`](a11y.md#req-a11y-motion)) and not from a stylesheet

> Nothing uses WAAPI today; the only transitions are `transition` declarations in the
> stylesheets.
