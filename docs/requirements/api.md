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
`[formControl]`, `formControlName` and `[(ngModel)]` work with no compatibility layer. And
the contract is carried **whole and identically**: every control declares the state block
(`disabled`, `readonly`, `invalid`, `touched`, `required`, `errors`, `name`, `touch`) with
the same transforms and the same defaults, so a form bound to any of them writes the same
state into all of them.

**Gate:** `tools/check-forms.mjs` (target `check-forms` in the root project, in CI) for the
second half — the block is declared in `libs/components/forms.policy.json`, held against
`FormUiControl` in `@angular/forms`'s own declarations, and every control is held to it
through its base class. It exists because `implements` proves almost nothing here: **every
member of `FormUiControl` is optional** — the one required member is `value` — so a control
missing `touched`, or declaring `invalid` with no `booleanAttribute`, compiles and satisfies
the contract. The prose above those members is deliberately NOT held: what `readonly` means
is the control's own knowledge, and six of the nine say it differently and truly. A member
with no JSDoc at all is already red in the content pass
([`req-api-catalogue`](#req-api-catalogue)).
And, for the first half — the classic-forms interop suites in the per-control specs —
`libs/components/field/src/field.spec.ts`, `libs/components/field/src/number.spec.ts`,
`libs/components/select/src/select.spec.ts`, `libs/components/checkbox/src/checkbox.spec.ts`,
`libs/components/switch/src/switch.spec.ts`, `libs/components/radio/src/radio.spec.ts`,
`libs/components/slider/src/slider.spec.ts`, `libs/components/date/src/date.spec.ts` —
`[formControl]` and `[(ngModel)]` per control, plus `apps/sandbox-e2e/src/forms.spec.ts` for
the signal-forms half. The lines used to point at `field-controls.spec.ts`, which contains
none of those tests: deleting the interop suites would have failed nothing this requirement
named
**Control:** the tests start from a **non-empty** initial value — with an empty model the
regression in [`lesson-26`](../lessons.md#lesson-26) was invisible; and
`tools/check-forms.fixtures/` for the structural half — eight prepared inputs, of which
`transform-dropped` is the defect the gate was written for and `member-missing` its other
half, plus a run against the repository: `booleanAttribute` taken off the checkbox's
`invalid` fires with the file, the line and the eight sites that disagree with it
**Decision:** [0005 — signal forms without CVA](../decisions/0005-signal-forms-without-cva.md)
**Lessons:** [`lesson-9`](../lessons.md#lesson-9), [`lesson-20`](../lessons.md#lesson-20),
[`lesson-26`](../lessons.md#lesson-26)

### <a id="req-api-day"></a>`req-api-day` — A day is a calendar day, the same in every timezone

**Promise.** The date field's value is a calendar day written `YYYY-MM-DD` (`PctDay`), never a
`Date`: the day a user picked in one timezone is the day an application stores, serialises and
reads back in any other, and the arithmetic behind the calendar — a step of a day or a month,
a weekday, the grid of a month — gives the same answer on every machine, on both sides of a
daylight-saving switch included. The one read of local time is "what day is it", and that
one is deliberately where the user stands.

**Gate:** `libs/components/date/src/day.spec.ts › in a hostile timezone` — the clock pinned
to `Pacific/Kiritimati` (UTC+14) and to `Europe/Warsaw` across the 23-hour day of 29 March
2026 and the 25-hour day of 25 October 2026, with the local-time `Date` measured beside the
day so that the defect the type refuses is in the run and not only in the prose; and
`apps/sandbox-e2e/src/date.spec.ts`, every case of which runs with the browser's clock in
Kiritimati (`test.use({ timezoneId })`) against values written on a server-side calendar,
in three engines; and `libs/components/date/src/day.property.spec.ts`, which holds the
arithmetic as laws instead of walks — a step invertible and composing, a weekday anchored on
the platform's own epoch rather than on a table, a month's length read from `Date`'s
normalisation, an order that agrees with the millisecond difference, a grid of six whole weeks
containing its month, and the domain in both directions
**Control:** the same cases build the day the old way beside the new — `new Date(2026, 2, 29)`
serialises as `2026-03-28T23:00:00.000Z` in Warsaw and `…T10:00:00.000Z` in Kiritimati — so
a `PctDay` that came out a day short would fail against a number the run itself produced. The
laws have a recorded one too, and it is the reason they exist: the sweep found **two defects
no worked case had reached**, one at each end of the shape. `pctCompareDays` compared strings
while the year is four digits **or more**, so `'2026-01-01'` read as later than
`'10000-01-01'` — a day `pctAddDays('9999-12-31', 1)` produces — and the clamp pulled a day
past `max` down to `min`; and `pad(-1, 4)` is `'00-1'`, so a step back off year zero
returned a string this module's own reader crashes on
([`lesson-185`](../lessons.md#lesson-185))
**Decision:** [0043 — a day is not an instant](../decisions/0043-a-day-is-not-an-instant.md)

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
one on the screen. What a control knows and the form cannot — text that is not a date, not a
number — goes **first** on that line and waits for no touch, through the contract's second
channel, `ownErrors`
([0070](../decisions/0070-what-the-control-knows-and-the-form-cannot-is-a-second-channel.md)).

**Gate:** `libs/components/field/src/field-controls.spec.ts` — the three controls that draw
their own messages, each in both states; `libs/components/core/src/core.spec.ts ›
pctFieldMessages` — the control's own error first and gated by nothing, the form's after it and
once touched; `libs/components/date/src/date.spec.ts › junk in the field` and
`libs/components/field/src/number.spec.ts` — the sentence in the control's own line and in the
chrome's; `tools/check-aria.mjs` (point 6, target `check-aria`)
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

**And it is not only behaviour.** A **layout** the platform computes is the platform's too:
`pctAutosize` takes a textarea's height from `field-sizing: content` in the engines that have
it, and measures one only in the engine that does not
([0041](../decisions/0041-a-height-the-platform-computes.md)). Two things follow, and both are
gated rather than declared. Where a fallback exists it has to produce **the platform's own
answer**, not a plausible one — so the floor is compared against a plain `<textarea rows="2">`
on the same page rather than against a number of ours. And a fallback is written to **expire**:
the case naming which engine lacks the property fails the day that engine ships it, which is
the notice that the borrowed road has lost its last consumer.

**Gate:** `apps/sandbox-e2e/src/radio.spec.ts` — keyboard navigation;
`apps/sandbox-e2e/src/menu.spec.ts` — `Enter` and `Space` on a command, in three engines. The
menu's rows are `<button>` elements and the component reads neither key: the case exists because
"the platform does it" is a claim about browsers rather than about intentions, and this is the
one component here whose activation is entirely borrowed;
`apps/sandbox-e2e/src/select.spec.ts › "the caret keeps the keys the list does not take"` — the
same claim about a text field: where the select's trigger can be typed into, `Home`, `End` and
the space bar go back to the caret, and the space that used to pick lengthens the question
instead ([0035](../decisions/0035-a-filter-is-a-question-not-a-value.md));
`apps/sandbox-e2e/src/select.spec.ts › "the cross is not a stop on the way to the next
control"` — Tab really walking past a control the mouse can press, which is what the platform's
own clear does in all three engines;
`apps/sandbox-e2e/src/textarea.spec.ts` — the layout half, and the only one of these with two
implementations under one set of assertions: an empty autosizing textarea is exactly as tall as
a plain `<textarea rows="2">` beside it, three lines are three and six are six, in three
engines, of which two are laid out by `field-sizing: content` and one is measured in script.
Plus `› "the engine is on the road the decision says it is"`, which exists to go red when the
borrowed road stops being borrowed;
`apps/sandbox-e2e/src/accordion.spec.ts` — the third kind of borrowing, and the widest: not a
key and not a layout but a **relation between elements**. `<details name>` makes one section
close its siblings, and `exclusive` is that attribute with no code behind it, so the case is the
whole of the input's implementation, in three engines
([0046](../decisions/0046-a-disclosure-is-the-platforms-and-so-is-the-group-it-belongs-to.md)).
It carries an expiring case of its own with the sign reversed — `interpolate-size` is
chromium's alone today, which is why nothing animates, and the case goes red when a second
engine ships it: a road nobody could take opening, rather than a borrowed one losing its last
consumer;
`apps/sandbox-e2e/src/drawer.spec.ts › "an ancestor with a transform catches the panel"` — the
fourth kind: a **containing block** the platform assigns. A `transform` on the demo card takes
the drawer's fixed panel off the window and onto the card's padding box, in three engines, and
the drawer neither prevents nor repairs it — it asks the platform who caught it (`offsetParent`,
null for a panel the window holds) and reports the ancestor and the property in dev mode; with
no transform the panel spans the viewport and nothing is said. `libs/components/drawer/src/drawer.spec.ts › the containing block`
holds the sentence whole, over doctored answers ([`lesson-163`](../lessons.md#lesson-163))
**Control:** the keyboard half has none — deliberately: a navigation test has no mode in which
it passes without a working keyboard. The layout half does, and it is recorded rather than
prepared, because the two roads fail in different engines: the `field-sizing` declaration
removed leaves **10 of 21** cases red on chromium and webkit; the floor removed, 6; the
measured road's reset removed, 2 on firefox; its resize observer removed, 1 there and 1 unit
case; its subscription taken at construction instead of after the first render, again 1 and 1
([`lesson-114`](../lessons.md#lesson-114))
**Exceptions:** [`req-api-number`](#req-api-number) (native `type="number"` does not know the
local separator), `PctSelect` (a native `<select>` gives no panel — and a filtering one borrows
back what a real `<input>` answers on its own), `PctMenu` (a native menu is not a thing the
platform has at all — what it borrows is the row, which is a button)

---

### <a id="req-api-number"></a>`req-api-number` — The number field does not stand on `<input type="number">`

**Promise.** `[pctNumber]` stands on `<input type="text">` with `role="spinbutton"`,
`aria-valuenow` / `aria-valuetext` and parsing of its own built on `Intl.NumberFormat`. The
value is `number | null` (empty is `null`, never `0` or `NaN`). The `min`/`max` bounds come
from the schema validators, not from a repetition in the template. Text that is not a number
is **kept** in the field and named — the native control's failing, an empty value with no way
back to what was typed, is not repeated one floor up
([0070](../decisions/0070-what-the-control-knows-and-the-form-cannot-is-a-second-channel.md)).

**Gate:** `libs/components/field/src/number.spec.ts`,
`apps/sandbox-e2e/src/number.spec.ts`, and — since the parser accepts more widely than it
formats, which is more cases than anybody thinks up —
`libs/components/field/src/number.property.spec.ts`: `parse(format(n)) === n` asked of the
real control over **22 locales** from a fixed seed, beside the five laws that hold the rest of
the commit (grouping visible in the text and absent from the value, the rounding, junk kept
and named, blank cleared and not named, the announced value)
**Control:** recorded rather than prepared, because each mechanism is one line and disarming
it is one edit. The parser's three widenings past `pl`/`en`, disabled one at a time, turn
**2, 3 and 3** of the six sweeps red: the bidi marks `Intl` writes in `he-IL`, `ar-EG` and
`fa-IR`; the Arabic-Indic and Devanagari digits of four locales, without which this control
cannot read back the `٠` it wrote into its own input; and the Indian grouping of `hi-IN`,
`bn-IN` and `ne-NP`. The instrument has a control of its own —
`libs/components/testing/src/property.spec.ts` — because a generator that drew one case and
called it two hundred, or a descent that reported the case which found a break rather than the
smallest one, would take every sweep in this library down without a word
**Decision:** [0009 — the number field on `type="text"`](../decisions/0009-number-field.md)
**Lessons:** [`lesson-32`](../lessons.md#lesson-32),
[`lesson-187`](../lessons.md#lesson-187), [`lesson-186`](../lessons.md#lesson-186)

---

### <a id="req-api-generic"></a>`req-api-generic` — A choice control's value is of type `T`, not a string

**Promise.** `PctSelect<T>`, `PctMultiSelect<T>`, `PctSelectOption<T>` and `PctRadioGroup<T>`
are generic (`T = string` by default). Equality is declared by the application (`compareWith`),
"nothing selected" is a separate state (`T | null`, with `emptyValue` for non-nullable models;
for a list it is `[]`, which every `T` can reach), and the native radio's `value` attribute
describes the option but **takes no part in the choice**.

**How many values a control holds is part of that type, so it is part of the tag.** A
`multiple` input cannot decide what `value` is: an input is a value at runtime and the
compiler relates no input to another's type, so one component serving both shapes has to
declare `T | T[] | null` — and then it accepts an array nobody asked for while breaking the
single-choice consumer's own `(valueChange)` handler, which is the only channel that still
carries a check ([`lesson-99`](../lessons.md#lesson-99)). `pct-multi-select` is therefore a
second tag over one implementation, and the two are measured against each other rather than
kept in step by hand ([0034](../decisions/0034-multiplicity-is-a-tag.md)). **What the type
cannot say otherwise is a tag; everything else is an input** — filtering changes no type, so it
is an input on both tags rather than two more of them, and its predicate takes the whole option
so that a list can be narrowed on something other than the text
([0035](../decisions/0035-a-filter-is-a-question-not-a-value.md)).

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

**The promise is kept by the authoring channel, and by nothing else.** `T` comes from the
option list because the list is **one expression** — an array literal is the one place
TypeScript compares a collection's members with each other. Written as elements a consumer
projects, the same list is one instantiation per element with no relation between any two of
them: `<pct-option [value]="1">` beside `[value]="'pl'"` compiles silently, and a
`contentChildren` query hands the component back `any`
([`lesson-97`](../lessons.md#lesson-97),
[0033](../decisions/0033-an-option-is-a-row-of-data.md)). A group is therefore a shape in the
data too — `PctSelectOptionGroup<T>` inside the same array — so a heading in the list costs the
type nothing.

**Gate:** `libs/components/select/src/select.spec.ts` — the generic contract, plus the
dev-mode report of two options with one value; `libs/components/radio/src/radio.spec.ts` — the
same report for the group, which reads its options through the `PCT_RADIO_OPTION` token rather
than through the class, so the container↔element import still points one way
([`lesson-16`](../lessons.md#lesson-16));
`libs/components/select/src/multi-select.spec.ts` — the list-valued contract and the **input
parity** of the two tags, read from `ɵcmp.inputs` after a build, where the one allowed
difference is `emptyValue`; `apps/sandbox-e2e/src/select.spec.ts` — the two comboboxes side by
side in three engines; the `typecheck` target of the `sandbox-e2e` project
**Control:** the probe from [`lesson-37`](../lessons.md#lesson-37) — five deliberately
contradictory bindings, four of which **must** break the build. Without `NoInfer<T>` the
compiler let all five through. For the uniqueness half the switched-off warning leaves three
cases red, and its mirrors stay green on their own: a list with distinct values and the same
pair of options without a `compareWith` that calls them equal. The group answers the same way,
six cases to three red — and one of its six measures the DEFECT rather than the report (both
options painted, one native checked), so it would go on standing if the warning ever left. For
the many-choice half, three recorded runs: a pick that ends the question (the single-choice
behaviour, one line) leaves **six** cases red; the value written in the order the picking went
rather than the list's leaves **three**, one of them the signal-forms case; and an input
declared on one tag and not the other leaves **one** — the parity case, which is the only
thing in the repository that would have said so
**Decision:** [0010 — a generic value and `NoInfer`](../decisions/0010-generic-noinfer.md),
[0033 — an option is a row of data](../decisions/0033-an-option-is-a-row-of-data.md),
[0034 — multiplicity is a type, so it is a tag](../decisions/0034-multiplicity-is-a-tag.md)
**Lessons:** [`lesson-37`](../lessons.md#lesson-37), [`lesson-66`](../lessons.md#lesson-66),
[`lesson-72`](../lessons.md#lesson-72), [`lesson-97`](../lessons.md#lesson-97),
[`lesson-98`](../lessons.md#lesson-98), [`lesson-99`](../lessons.md#lesson-99)

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
**Control:** `tools/check-parts.fixtures/` — 25 inputs, each rejected on its own
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

### <a id="req-api-harness"></a>`req-api-harness` — A harness per component, on the parts contract

**Promise.** `@pacit/components/testing` ships a harness for every component and directive a
card names, built on the CDK's `ComponentHarness`: the host selector is the component's own,
verbatim, a part is read by the name the card documents (`part('label')`, typed, so an editor
completes it and a name the component does not draw is a compile error) and a state by its
attribute (`state('size')` reads `data-pct-size`). A consumer's suite holds the library's
promises with it after an upgrade — a renamed part fails a test **by name**, not through a
selector copied out of the DOM. A harness is a declaration and nothing more; what makes the
declaration true is the gate. For a fixture without the CDK, `part`, `allParts` and `query`
from the same entrypoint do the query and throw naming what is there.

**Gate:** `tools/check-harness.mjs` (target `check-harness` in the `components` project, in
CI) — six points over the **built package**, read the way `check-parts` reads it: the
entrypoint is exported and every harness is a `PctHarness` of the right shape; a
`hostSelector` is verbatim the selector list of exactly one exported class; every class that
draws a part has a harness; a harness names exactly the parts its class draws, in both
directions; the union the declaration file offers a consumer's editor is that same list; and
every card's **Harness** row names harnesses of its own entrypoint that exist, every harness
standing on some card. Plus `libs/components/testing/src/harness.spec.ts` — the base class
driven over a button, an accordion item whose host is its own part, and a select whose panel
is drawn in an overlay outside the host
**Control:** `tools/check-harness.fixtures/` — 17 prepared inputs, each rejected on its own
point: the entrypoint gone, a harness off the base, a part named twice, a selector nobody
answers to, one wider than the class, two harnesses for one class, a class the package lost,
a class with no harness, a part the component does not draw, a part the harness forgot, the
declaration file gone, a union narrower and one wider than the list, a card with no row, one
naming nobody, one borrowing another entrypoint's harness, a harness on no card
**Decision:** [0068 — a harness is a declaration over the parts contract](../decisions/0068-a-harness-is-a-declaration-over-the-parts-contract.md)

---

### <a id="req-api-templates"></a>`req-api-templates` — Customisation through projection and templates

**Promise.** Two mechanisms, and the line between them is whether the component renders the
content **once** or **per item**. Content it merely places comes in through
`<ng-content select="…">` — the chrome's prefix, suffix and label aux. Content it draws per
item comes in through a **slot**: an `<ng-template>` carrying a directive of that slot's own
(`pctSelectOption` is the first), typed by a context guard, and read by the component through
a content query — which is also what tells a slot written where nothing reads it that it is
rendered by nobody. A slot replaces what is inside the item and never the item —
`role`, the id, `aria-selected` and the key map stay with the component.

**`*pctTemplate` is deliberately not the shape**, and the reason is measured rather than
argued: a name inside a string is invisible to the compiler, and one directive serving many
names has nowhere to put a context guard per name, so it gives up both of the two checks a
template channel has to buy ([0027](../decisions/0027-a-slot-is-a-directive.md),
[`lesson-84`](../lessons.md#lesson-84)).

**What no gate here can see, named rather than implied:** a slot attribute that is _misspelt_
matches no directive, so nothing exists to report it. The obvious repair — the component
comparing the templates in its content against the slots that claimed one — is measured shut,
because control flow in projected content is itself a `TemplateRef` and the comparison would
fire on correct markup. What answers the misspelling is one step earlier and only for the name
spelt right: a slot's type carrier is `input.required`, so leaving it unbound is `NG8008`.

**Gate:** `libs/components/core/src/core.spec.ts` — `pctReportOrphanSlot` under the layer's own
name, including the case an `@if` between the slot and its component would have broken;
`libs/components/select/src/select.spec.ts` — the option row rendered, the whole context it is
handed, the built-in label when no slot is written, and the slot placed where no select reads
it; `apps/sandbox-e2e/src/select.spec.ts` — the custom row in three engines, with the listbox
pattern and the keyboard unchanged by it
**Control:** two recorded runs that fail on different cases. `pctReportOrphanSlot` silenced at
its entry leaves the three reporting cases red and the three asserting silence green; the
slot's rendering taken out of `select.html` leaves the three rendering cases red and the report
green. Above both, the compile-time half is the probe of
[`lesson-84`](../lessons.md#lesson-84): four deliberately wrong bindings under
`strictTemplates`, of which the table records which break the build and which do not — the two
that stay silent are why the shape is what it is
**Binds at:** closed with the template slots. The second caller arrived with the icons and took the mechanism one step
further: an icon set is a component whose `<ng-template>`s are its icons, and the name they
are called by is an **input of a union type** rather than a selector — which buys back
exactly the half this requirement names as unbuyable, for the string being a value
([0028](../decisions/0028-an-icon-set-is-a-component.md),
[`lesson-85`](../lessons.md#lesson-85))
**Decision:** [0027 — a slot is a directive of its own](../decisions/0027-a-slot-is-a-directive.md)
**Lessons:** [`lesson-84`](../lessons.md#lesson-84)

---

### <a id="req-api-icons"></a>`req-api-icons` — Easy use of somebody else's icons

**Promise.** The library makes it possible to use icons from the popular sets (FontAwesome,
PrimeIcons, Material) and to supply your own (SVG / icon fonts).

An icon the library draws sits inside `<pct-icon>` under a **semantic name** — the role it
plays, `chevron-down` and not `arrow-down-16`. The drawing written there is what a consumer
who registers nothing sees; `providePctIcons(Set)` replaces the names the set carries and
leaves the rest. **A set is a component whose templates are the icons**, because that is the
only thing that fits in a provider and yields a `TemplateRef`
([0028](../decisions/0028-an-icon-set-is-a-component.md),
[`lesson-85`](../lessons.md#lesson-85)) — and it is an ordinary provider, so a subtree may
carry a different set from the application around it.

**What the swap holds still, and what it may not touch.** The `pct-icon` element is the
contract: `data-pct-part`, the size, the colour and any state the component paints on it (the
select's arrow turns on opening, the checkbox's mark is hidden until it is checked) are
written on the box, which survives the swap. The drawing owns its geometry and paints itself
in `currentColor`, so a stylesheet that reaches for its `fill` or `stroke` is styling the one
icon it happens to know — that is what `check-styles` point 8 refuses.

**`PctIconName` is public API** in the sense of [`req-api-parts`](#req-api-parts): a published
name promises that some component draws it and that a set replacing it is seen. The name is an
input of a union type rather than a directive selector, so a misspelling is `TS2820` with the
right name suggested.

**Gate:** `tools/check-icons.mjs` (target `check-icons`) — six points over the library's
templates: the denominator (every `<svg>` and every `<pct-icon>` the text holds is one the
walk saw), a drawing stands inside a `pct-icon`, that icon carries a name, a named icon
carries its own drawing, the published names and the drawn names are the same set both ways,
and no `data-pct-part` sits below an icon; `tools/check-styles.mjs` point 8 — no SVG paint
property in a component stylesheet; `libs/components/icon/src/icon.spec.ts` — the layer under
its own name, including a partial set and a set nobody reads;
`apps/sandbox-e2e/src/select.spec.ts` — a registered arrow in three engines, in the same box
and turning with it
**Control:** `tools/check-icons.fixtures/` — six prepared inputs, each rejected on its own
point, the first of them being the shape the library shipped until the icons (an `<svg>` written
straight into the template); `tools/check-styles.fixtures/paint-inside-an-icon/` for point 8.
Above them a recorded run: the lookup in `PctIcon` returning `null` always leaves 291 cases
green and turns 7 red, every one of them a replacement
**Binds at:** closed with the icons
**Decision:** [0011 — icons through a template and `PCT_ICONS`](../decisions/0011-icons.md),
[0028 — an icon set is a component](../decisions/0028-an-icon-set-is-a-component.md)
**Lessons:** [`lesson-85`](../lessons.md#lesson-85), [`lesson-86`](../lessons.md#lesson-86)

---

### <a id="req-api-icons-custom"></a>`req-api-icons-custom` — The library ships no icon set of its own

**Promise.** A non-goal. An icon set is a separate product with its own life cycle; the
library ships **the swap mechanism**, not icons.

**Gate:** `libs/components/check-package.mjs` — the absence of icon files in the packed
artifact would be detectable on the content listing. Since the icons the promise is literal in a
second sense: there is no default icon SET anywhere in the package either. A default drawing
lives in the template of the component that draws it, so `./checkbox` never carries the
select's arrow ([0028](../decisions/0028-an-icon-set-is-a-component.md))
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
**Control:** `tools/check-texts.fixtures/` — 32 doctored inputs, each rejected on its own
**rule** (not merely its point); plus nine runs against the repository (a literal in
a template, an `aria-label` with a string before and after a rebuild, a text read inside an
input's default value, `console.warn` without `isDevMode()`, a field with no default, a dead
field, a literal in an interpolation, a static `aria-label` in a `host` block)
**Decision:** [0007 — configuration apart from texts](../decisions/0007-config-and-texts.md),
[0014 — texts as a signal](../decisions/0014-texts-as-signal.md)
**Lessons:** [`lesson-54`](../lessons.md#lesson-54)

---

### <a id="req-api-catalogue"></a>`req-api-catalogue` — The contract is machine-readable, from the same sources as the pages

**Promise.** The site serves `llms.txt` and `components.json` at known addresses, emitted by
**the same pass** that renders the component pages (`apps/docs/tools/build-content.mjs`):
every component with its canonical usage and examples as text, its API with types and
defaults, parts, tokens with both themes' defaults, keyboard map, the texts it prints, and
the evidence behind it — plus the `PctTexts` channel with the meaning of every key, its
English default, which components read it, and a template typed against the interface. An
agent reads what the pages show and can verify what it suggests; a dictionary for another
language is an object typed `PctTexts`, so a key the library adds is a compile error in the
application and never a blank string. **The library ships no dictionary of its own**: the
package is measured for one language with no register at all
([`req-project-language`](project.md#req-project-language), `check-language` point 3), and
that law is worth more than an afternoon's translations the maintainer cannot review.

**Gate:** `apps/docs/tools/build-content.mjs` (target `content` of the `docs` project, on
the road of every build in CI) — a card without a usage, a member without its JSDoc, a key
without a meaning or a default, a default with no key, a preview with no cost reading all
throw; `apps/docs-e2e/src/landing.spec.ts › "the machine catalogue is the inventory the
site renders…"` reads the cards on disk and the channel in its source and holds the served
file to both, every documented address answering
**Control:** the content pass's tripwires fired twice while the cards' owed readings were being written
they owed (the registry's bold total and its three-column rows) and again on the first
strict build (94 readings owed, then none); the e2e case is held by the same law as the
landing's strip — a card renamed on disk or a key added to `PctTexts` fails it until the
served file follows, which it does by being generated
**Decision:** [0014 — texts as a signal](../decisions/0014-texts-as-signal.md)

---

## Overlays and motion

### <a id="req-api-overlay"></a>`req-api-overlay` — The overlay comes out of the control's visible edge

**Promise.** The wrapper offers controls its row as the reference surface
(`PctFieldApi.surface`); with no wrapper the anchor is the trigger itself. The panel width is
an axis of the API (`panelWidth="field" | "auto" | <CSS length>`), the abutting edge is
`panelAlign`. **The panel inherits nothing from the host**: theme, typeface, font size and
writing direction are read from the control when it opens and carried over explicitly. That
reading is `pctOverlay()` in `@pacit/components/core` and it is not optional machinery —
`show()` **is** the read, so no control can open a panel and carry nothing. Escape closes the
**top-most** open overlay and only it; a component never listens for it above its own control.
**A panel says whether it takes focus.** Where the role keeps focus on the control — a listbox
under a combobox, pointed at by `aria-activedescendant` — the panel carries `pctFocusStays`,
which refuses the press that would move it: without that refusal a press on the panel's own
background lands on `body`, and every key the control owns loses its handler. **A panel of the
other kind — one that takes focus — comes in two, and the difference is what it does to the
page.** A **modal** takes the page with it: everything outside it goes `inert` and the document
stops scrolling, both released **before** the panel is detached, because focus goes back to an
element that sits in the background and an inert subtree refuses `focus()`. That is `PctModalBackground` in `@pacit/components/core`, and it is
reference-counted — a dialog opened from a dialog hands the page back once, at the end. One
thing it must not take: a live region that is a child of `body` goes on speaking, or a control
inside the modal loses the only channel it has. A **non-modal** panel takes focus and nothing
else — the page behind answers, and what it owes in exchange is the **tab order**: an overlay is
a child of `body`, so its content stands at the end of the document however near its trigger it
is drawn, and Tab out of the panel therefore closes it and hands focus back to the trigger for
the page's own order to carry on from. Focus goes to the **panel** rather than to the first
control in it — the panel is what carries the role and the name — and comes back only if it was
still inside, because a live page can be clicked into and dismissed from there. **Which side a panel opens on is logical**:
`start` and `end` are the sides the writing direction decides, and a side the window has no room
for gives way to the one across the control rather than to the nearest empty corner. That list
is `pctPlacementPositions()` in `@pacit/components/core`, and the reason it is shared rather
than written per component is one line the dependency does not carry — the box is resolved by
direction and the offset is added as plain pixels afterwards, so the gap has to change sign in a
right-to-left page or the panel lies over the control it belongs to.

**Gate:** `apps/sandbox-e2e/src/select.spec.ts` — measuring the panel's width and offset
against the field, the typeface and font size inside the panel, and a press on the panel that
leaves focus on the trigger with the keyboard still answering;
`apps/sandbox-e2e/src/dialog.spec.ts` — the modal half in a browser: the background refusing
the pointer, the keyboard and a script, the page that stops scrolling and starts again, the
scrollbar's width handed back to the layout, the live regions left speaking, and a select panel
opened inside a dialog that answers Escape before the dialog does;
`apps/sandbox-e2e/src/tooltip.spec.ts` — the placement half: each side measured against the
control it hangs on, the 8 px gap, `end` measured on both sides of the writing direction, and a
side with no room giving way across the control;
`apps/sandbox-e2e/src/popover.spec.ts` — the non-modal half: the page behind answering a press
and still scrolling while the panel is up, focus taken by the panel and given back by Escape,
and Tab walking out of the panel in both directions;
`apps/sandbox-e2e/src/menu.spec.ts` — a TREE of non-modal panels: one Escape per level, a press
inside a submenu that is "outside" every panel above it, the pointer opening one without taking
focus into it, and the side and the arrow keys mirroring together in a right-to-left page;
`libs/components/core/src/core.spec.ts` — the layer under its own name: the four properties
read off the control, the anchor's width, a second opening re-reading a page that moved, the
closing order over two stacked overlays, the press `PctFocusStays` refuses, which elements
`PctModalBackground` marks and gives back, and the sign of the inline gap in each direction
**Control:** the measurement from [`lesson-35`](../lessons.md#lesson-35) (a 301 px field ⇒
a 275 px panel, offset by 13 px; `Times New Roman` in the panel against `system-ui` in the
control) — the test compares **specific values**, so it does not pass on "roughly right". The
unit cases carry the same numbers, and the closing case discriminates by construction: an
Escape delivered to every overlay rather than to the top one closes both at the first press.
The focus case has a recorded run: `pctFocusStays` taken off the panel and the e2e case red in
all three engines — `expect(locator).toBeFocused() failed / Received: inactive` — while the
unit cases stay green, jsdom moving focus on no `mousedown` at all. The modal half discriminates
the same way and was measured before it was written: the native `<dialog showModal()>` refused
on the one finding that decides it — an overlay outside the topmost modal is inert in blink,
gecko and webkit, the top layer included, so the select's panel inside one takes no click, no
focus and no Tab ([`lesson-89`](../lessons.md#lesson-89)). And the order the release keeps has
a recorded run of its own: with `inert` still on the background at the moment of detach, focus
lands on `body` instead of on the control that opened the dialog
**Decision:** [0006 — the anchor and inheritance in an overlay](../decisions/0006-overlay.md),
[0024 — the overlay layer carries what an overlay severs](../decisions/0024-the-closing-stack-is-the-dependency-s.md),
[0025 — a panel says whether it takes focus](../decisions/0025-a-panel-says-whether-it-takes-focus.md),
[0029 — a modal is an overlay, not a `<dialog>`](../decisions/0029-a-modal-is-an-overlay-not-a-dialog-element.md)
**Lessons:** [`lesson-18`](../lessons.md#lesson-18), [`lesson-35`](../lessons.md#lesson-35),
[`lesson-82`](../lessons.md#lesson-82), [`lesson-89`](../lessons.md#lesson-89),
[`lesson-90`](../lessons.md#lesson-90)

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

**And it is not a dependency in two senses**, because the runtime has two roads here. One is
the name — in the manifest, in the dependency policy, in an import — and on that road the
answer is that **no reason opens it**: every other rule of the dependency gate asks whether a
dependency was deliberate, and this one is refused when it is. The other road leaves no name
anywhere: an animation binding (`[@panel]`, `(@panel.done)`, the same pair on a host) compiles
with the package absent from the workspace and imports nothing but `@angular/core`
([`lesson-87`](../lessons.md#lesson-87)), and it reaches the consumer as NG5105 in their dev
build and as silence in their production one. A library can therefore require this runtime
without depending on it, which is why the ban is measured on the shape of a binding as well as
on the name of a package.

**Gate:** `libs/components/check-package.mjs` point 7, rule `forbidden` — the banned
specifiers (`@angular/animations` and `@angular/platform-browser/animations`, subpaths
included) in the packed manifest, in the policy and among the imports of the packed code,
evaluated **before** the rules that ask for a justification
([`lesson-88`](../lessons.md#lesson-88)); the same gate's point 8 — no animation binding in the
packed templates, host bindings included, with the count of component declarations as its
denominator. The duration half is `tools/check-styles.mjs` point 9
([`req-a11y-motion`](a11y.md#req-a11y-motion))
**Control:** `tools/check-package.fixtures/` — five prepared packages, each rejected on its own
rule: `dependency-forbidden` (declared as a peer **and** permitted by a policy entry that says
why), `import-forbidden` (`@angular/platform-browser/animations`, which a ban on package names
would read as `@angular/platform-browser`), `animation-binding`, `animation-host-binding` and
`no-component-declaration`, the denominator. Above them a recorded run over the real package:
the same three roads fire on `dist/libs/components`, naming the bundle and the shape found
**Binds at:** closed with the ban on `@angular/animations`
**Lessons:** [`lesson-87`](../lessons.md#lesson-87), [`lesson-88`](../lessons.md#lesson-88)

> Nothing uses WAAPI today; the only transitions are `transition` declarations in the
> stylesheets, and every one of them takes its time from the motion axis — which is the
> promise `check-styles` point 9 holds.
