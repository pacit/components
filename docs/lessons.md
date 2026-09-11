# Lessons — the evidence log

Conclusions drawn along the way, each with empirical evidence. This is the **evidence base**
for the [axis](00-axis.md), the [requirements](README.md#level-1--requirements) and the
[decisions](decisions/) — the only place recording **what actually happened**, before anybody
turned it into a rule.

The dependency runs one way: a requirement may cite a lesson, a lesson need not cite
a requirement. The reverse index (which lesson feeds which requirement) is **generated** into
the [registry](registry.md), not maintained here by hand.

## Why numbers, when requirements have names

Because **order means something here**. The log is chronological and append-only — nothing is
inserted, so a number is both an address and information ("that was before the sandbox was
split into views"). In the requirements the order meant nothing, which is why the numbering
drifted there; more in the [README](README.md#why-slugs-not-numbers).

Only the prefix changed: the number stayed the same, and the requirements' shared prefix gave
way to one of its own (`lesson-N`). A lesson **is not a requirement** — it has no gate, is not
subject to the registry and cannot be "implemented". A shared prefix was the only reason 43
observations were mixed in with a list of promises.

## How to add a lesson

Next free number, at the end of the file. A lesson deserves an entry when it meets two
conditions: **something actually happened** (a measurement, a deliberate regression, a failure —
not reasoning) and **the conclusion is wider than one fix**. If the conclusion is normative, its
home is a requirement or a decision, and the lesson stays as the evidence they cite.

## Nine occurrences of one lesson

The log looks like a set of independent observations, and a cross-section through it produced
[`req-axis`](00-axis.md). The key sentences are collected in the
[axis table](00-axis.md#why-this-is-not-a-slogan); what matters here is the conclusion: **the
default behaviour of a layer is "nothing happened"**, so a missing gate never shows up as
missing — it shows up as green.

---

### <a id="lesson-1"></a>`lesson-1` — Angular does not support the NX "TS-solution" layout

**Angular does not support the new NX "TS-solution" layout (project references).** The
workspace has to use the classic layout (tsconfig `paths`), not composite/references.

---

### <a id="lesson-2"></a>`lesson-2` — Test discovery globs from `projectSourceRoot`

**Angular's test discovery (`@angular/build:unit-test`) globs from `projectSourceRoot`.** For
tests in secondary entrypoints (siblings of `src/`) to be found, the library's `sourceRoot` was
set to the package root (`libs/components`).

---

### <a id="lesson-3"></a>`lesson-3` — Test target: `vite:test` for apps, `test` for the library

An app's test target is `vite:test` (the `@nx/vitest` plugin), the library's is `test`
(`@nx/angular:unit-test`).

---

### <a id="lesson-4"></a>`lesson-4` — The token build is a transform of our own, not Style Dictionary

The token build is for now a lightweight transform of our own (the DTCG contract unchanged);
swapping in Style Dictionary remains an option with no effect on the sources
(`req-token-artifacts`).

---

### <a id="lesson-5"></a>`lesson-5` — A coverage threshold needs `coverageInclude`

The coverage report needs `coverageInclude` configured in the test target to enforce the
`req-quality-coverage` threshold — without it v8 measures only what entered the run by itself.
Set up only alongside the coverage gate; that is when it turned out `coverageInclude` closes
this only halfway (`lesson-45`).

---

### <a id="lesson-6"></a>`lesson-6` — The contrast guard let through a `disabled` state made with `opacity`

The original (token-level) guard let through a disabled state at a real contrast of ~1.6:1,
because the state was made with `opacity` (composition with the background at runtime,
invisible to arithmetic on hex values). Hence `req-token-contrast` (a policy per theme/size,
with severity) and `req-token-no-opacity` (no `opacity` for text layers). Implemented:
`libs/tokens/src/contrast.policy.json` plus the engine in `build.mjs`; `PctButton` uses
`disabled-*` tokens instead of `opacity`.

---

### <a id="lesson-7"></a>`lesson-7` — Zoneless is declared explicitly

**Zoneless is declared explicitly** through `provideZonelessChangeDetection()` in
`app.config.ts`, even though the generator does not add the `zone.js` polyfill (the bundle does
not contain it anyway). The explicit declaration closes `req-project-angular` and guards
against an accidental return to zone-based mode. The library's and the app's unit tests also
configure zoneless in `TestBed`, which makes `req-api-foundation` (zoneless-safe components)
**verified** rather than merely declared. (Note: `setupTestBed()` from
`@analogjs/vitest-angular` already sets `zoneless: true` by default — the explicit
configuration in the specs is insurance against that default changing.)

---

### <a id="lesson-8"></a>`lesson-8` — `zone.js` removed from the dependencies entirely

**The `zone.js` package was removed from the dependencies entirely.** It is an optional peer
dependency (`peerDependenciesMeta.zone.js.optional: true`) in both `@angular/core` and
`@analogjs/vitest-angular`, and Angular's test runner falls back to zoneless mode on a failed
`resolve('zone.js')` (`catch → 'none'`). Verified empirically after uninstalling: tests 6/6 and
2/2, e2e 4/4, the library and app builds (SSR + prerender) — all green; at runtime no
`window.Zone`, no `__zone_symbol__` and an unpatched `Promise`. A return to zone-based mode is
therefore impossible by accident.

---

### <a id="lesson-9"></a>`lesson-9` — `ControlValueAccessor` turned out to be unnecessary

**CVA turned out to be unnecessary.** We assumed that compatibility with reactive and
template-driven forms required `ControlValueAccessor` (and we were considering a separate
adapter directive). An experiment on `PctInput` (a control implementing only
`FormValueControl`) showed that `[formControl]` and `[(ngModel)]` synchronise the value both
ways with no compatibility code — exactly as Angular's documentation says. The library's core
does not import the classic forms API. The behaviour is protected by regression tests in
`input.spec.ts`.

---

### <a id="lesson-10"></a>`lesson-10` — The contrast gate took in non-text pairs (SC 1.4.11)

The contrast gate now also covers **non-text pairs per SC 1.4.11** (`level: "UI"`, a 3:1
threshold) — the input border, the focus/error border, the focus ring. This catches a typical
UI library defect: field borders that are too light. Component tokens are auto-discovered
(`component.*.json`), so adding a component needs no changes to `build.mjs`.

---

### <a id="lesson-11"></a>`lesson-11` — The Angular CLI MCP gives version-matched guidance

**The Angular CLI MCP (`.mcp.json`) supplies version-matched guidance.** The generic
`best-practices.md` downloaded from the website did not contain the rule "do not set `OnPush`
explicitly — it is the default in v22+" that `get_best_practices` returns over MCP. Hence the
correction to `req-api-foundation`. Note: `list_projects` returns an empty list because it
reads `angular.json` while the workspace is Nx-based (`project.json`) — the tools needing
workspace context do not work, but `search_documentation` and `get_best_practices` do.

---

### <a id="lesson-12"></a>`lesson-12` — `FormCheckboxControl` requires `checked`, not `value`

**Controls under the `FormCheckboxControl` contract require `checked`, not `value`** (defining
`value` is forbidden). Since `model()` does not accept the `booleanAttribute` transform,
`checked` has to be bound in brackets (`[checked]="true"`) rather than as a bare attribute —
otherwise the template does not compile (`Type 'string' is not assignable to type 'boolean'`).
The contract also allows optional `focus()` and `reset()` methods; implemented in `PctCheckbox`
and `PctInput`.

---

### <a id="lesson-13"></a>`lesson-13` — `getComputedStyle` from a preview panel can be stale

`getComputedStyle` reads from a preview panel can be **stale** when the panel is not being
displayed ("the page is not compositing frames") — which leads to false diagnoses of CSS bugs.
The reliable way to verify styles is e2e tests (Playwright), which run in a normally rendering
browser.

---

### <a id="lesson-14"></a>`lesson-14` — Formal conformance does not mean good quality

**Formal conformance does not mean good quality.** The first axe audit found no violations, and
the `target-size` rule **passed** on an 18×18 px checkbox hit area — because SC 2.5.8 allows
a spacing exception and there was plenty of free space around the control. Tightening the
layout in a consumer's app would be enough for the same thing to stop conforming. Hence
`req-a11y-touch`: we meet the touch target outright, independently of the surroundings.

---

### <a id="lesson-15"></a>`lesson-15` — A part-name collision only surfaced in e2e

A part-name collision only surfaced in an e2e test: the selector `[data-pct-part="label"]`
inside a `pct-radio-group` matched 4 elements (the group's label plus the options' labels).
Hence `req-api-parts-unique`. The unit tests did not catch it, because they queried a specific
element rather than a collection.

---

### <a id="lesson-16"></a>`lesson-16` — Options in a group are projected content, not `viewChildren`

In a group the options are **projected content**, so the container cannot see them with
a `viewChildren` query; `contentChildren(PctRadio)` would create a circular container↔element
import. So the group's `focus()` queries the host's DOM (`input[type="radio"]`).

The second half of that sentence is true of the **class**, not of the query — and the radio group's
duplicate-value check needed the difference. A token declared beside the group (`PCT_RADIO_OPTION`)
and provided by the option lets a `contentChildren` query see what the options carry, with the
import still pointing one way only. Both roads now stand, and neither replaces the other: the DOM
road carries what the BROWSER holds (which native is checked — `focus()` needs exactly that), the
token road what the options MEAN. The DOM cannot carry the second, because `[attr.value]` is absent
for a non-primitive `T` — which is precisely where `compareWith` lives ([`lesson-72`](#lesson-72)).

---

### <a id="lesson-17"></a>`lesson-17` — The scoped theme was broken at the component tier

**The scoped theme was broken at the component tier and nobody saw it.** A probe in the browser
showed that in a `[data-theme="dark"]` panel the semantic token `--pct-surface` had the correct
dark value while `--pct-button-bg` and `--pct-select-panel-bg` still returned light ones. The
cause is in `req-token-closure`. The defect survived that long because the earlier scoped-theme
test checked **only the semantic token**, and the difference between `blue-600` and `blue-500`
is visually subtle. Fixed in the build; a regression test was added comparing a component token
in `:root` and in a scope.

---

### <a id="lesson-18"></a>`lesson-18` — An overlay panel renders outside the host tree

A CDK overlay panel renders **outside the host tree**, which has two consequences: (1)
`:host(...)` selectors do not reach its content — option states have to be marked with
attributes on the options themselves; (2) the scoped-theme cascade does not reach it — the
theme from the host's nearest ancestor is carried over to the panel explicitly (`data-theme`).
Tokens work, because they are defined on `:root` — an advantage of the CSS-first approach
(`req-token-dtcg`).

---

### <a id="lesson-19"></a>`lesson-19` — `CSS.escape` does not exist in jsdom

`CSS.escape` does not exist in jsdom, so building selectors from ids blows the unit tests up.
We find the active option by index in the collection, which additionally matches the semantics
of `activeIndex` directly.

---

### <a id="lesson-20"></a>`lesson-20` — On a native element `DefaultValueAccessor` leads

**On a native element the classic forms go through the built-in `DefaultValueAccessor`.**
`[formControl]` on `<input pctText>` is handled by Angular's accessor, which writes to the DOM
itself. Our parallel value binding caused a conflict of two authors (the input started empty
instead of with the control's value). So the control detects an `NgControl` on the same element
and then gives up ownership of the value, keeping the wrapper and the state.

---

### <a id="lesson-21"></a>`lesson-21` — The same message logic in four controls

The same message logic (`errorText`, `showInvalid`, `showError`, `describedBy`, `hintId`,
`errorId`, `touch`) had been **copied into 4 controls**. A fix required four identical
changes — hence extracting it into `core` (`req-api-wrapper`).

---

### <a id="lesson-22"></a>`lesson-22` — The frame's padding created a dead zone

**The wrapper frame's padding created a "dead zone"** — the cursor was inside the field, but
a click did not set focus. It was most visible when a taller element in a slot (a button)
raised the row's height and the centred control left empty space above and below itself. The
solution had two parts: the control stretches to the row's height (`align-self: stretch`), and
the wrapper forwards to the control any `mousedown` coming from an area that is not an
interactive element (the contract gained an optional `focus()`). The frame shows a text cursor
when it contains a text control. **The fix was only half of one** — see `lesson-27`.

---

### <a id="lesson-23"></a>`lesson-23` — `page.mouse.click()` does not scroll the page

While verifying that fix, **the bug was in the test, not in the code**: Playwright's
`page.mouse.click()` uses viewport coordinates and does not scroll the page, so a click on an
element below the fold hit `<html>`. The locator's `click()` scrolls by itself. When clicking
coordinates you have to call `scrollIntoViewIfNeeded()` first.

---

### <a id="lesson-24"></a>`lesson-24` — The part-name collision repeated itself with the wrapper

**The part-name collision repeated itself with the wrapper.** When `pct-field` wrapped a radio
group, its `label` part matched 4 elements (the wrapper's label plus the options' labels), and
after wrapping a checkbox the `control` part collided with the checkbox's native input. That is
the same class of bug as `lesson-15` — so the `req-api-parts-unique` rule applies to the
wrapper too, not only to groups.

---

### <a id="lesson-25"></a>`lesson-25` — A wrapped select had a 19.6 px touch target

**A wrapped select had a 19.6 px touch target.** After handing the frame over to the wrapper
the trigger lost its own padding, so its height dropped to the text line height — below the SC
2.5.8 threshold. The wrapper now guarantees `min-height: var(--pct-target-min)` on the control
column, which fixes it for every control at once. The existing touch-target test caught it —
proof that it was worth writing back at the checkbox.

---

### <a id="lesson-26"></a>`lesson-26` — `FormField` supplies an `NgControl` itself

**`FormField` supplies an `NgControl` itself, so the heuristic from `lesson-20` was too wide.**
The signal-forms directive registers an interop `NgControl` for compatibility with old
`ControlValueAccessor`s. The condition "there is an `NgControl` ⇒ somebody else writes to the
DOM" therefore covered signal forms too — and those, with **our own control**
(`FormValueControl`), set only its `value` and do not write to the DOM (they do that only for
elements with no control of their own). The effect:
`<input pctText [formField]="f.email">` with a non-empty initial value rendered an **empty
field**. The defect survived because every test and the sandbox started from an empty model.
The condition now tells the two cases apart (an `NgControl` without a `FormField`), and the
regression is watched by tests starting from a non-empty value — in `PctText` and `PctNumber`.

---

### <a id="lesson-27"></a>`lesson-27` — Patching the symptom left a dead zone visible in the cursor

**Patching the symptom instead of the cause left a dead zone visible in the cursor.**
`lesson-22` fixed the _click_ on the frame's padding (forwarding `mousedown` to the control) but
not the _ownership_ of that area: the padding and `gap` stayed on the row and the columns were
centred within it, so **about 60% of the frame's surface belonged to no inner element** (a
354×24 control column in a 380×42 row). The consequences only showed on a cursor map taken from
the browser (`elementFromPoint` × `getComputedStyle().cursor` over a grid of points): a select
field had a `pointer` cursor only over the trigger, a disabled field invited you to type with
a text cursor across all of its padding, and the strip around a button in a slot looked like
part of it while a click there hit the field. The structural fix: padding moves from the row
down to the columns, the columns tile the inside of the frame with no gaps (an empty decoration
slot **does not disappear**, it collapses to the edge padding), an interactive decoration gets
the full height of its slot (revised in `lesson-34` — from then on the author decides whether
a slot is filled, not the presence of a button), and the kind of cursor is declared by the
control through `fieldCursor` — without that, `field.scss` would have to know the classes of
every control (`:has(input.pct-text)`) and every new one would start with the same bug.
`activate()` joined the contract too: a `pointer` cursor over the whole frame of a select
promises the list will open, so a click on the padding has to open it, not merely move focus.

The methodological lesson: **"can it be clicked" and "can you see that it can be clicked" are
two different requirements** — the first was tested by a pair of e2e tests and they passed, the
second only came out of measuring the whole surface. The "cursor map over a grid of points"
pattern catches this class of defect cheaply and is worth repeating for every component with
a complex surface.

---

### <a id="lesson-28"></a>`lesson-28` — jsdom does not parse `:has()` with a relative combinator

**jsdom (nwsapi) does not parse `:has()` with a relative combinator** — `:has(+ .selector)`
blows up with `SyntaxError: not a valid selector` on **any** later `querySelectorAll` in the
test, so the failure appears somewhere unrelated to the cause. The version with a plain
`:has(button, a, [tabindex])` works. Tooling aside, a better solution turned out to be a layout
that does not look "ahead": the spacing is carried by the decoration slot (edge padding on the
outside, `gap` on the control's side), and an empty slot collapses to the edge padding alone —
which lets the columns tile the frame with no conditional rule at all.

---

### <a id="lesson-29"></a>`lesson-29` — A height computed from padding cannot be lined up

**A height computed from padding cannot be lined up between components.** The button and the
field used the same spacing token (`space.3`) and still differed by 7 px: the button measured
`padding-y` plus the label's line height (≈34.8 px), the field `padding-y` plus the guaranteed
touch target of the control column (42 px). Aligning by tuning the paddings would be false —
it would depend on `line-height`, the typeface and the slots' content, and every new component
would start by guessing. Hence `req-api-size`: the height is a separate token
(`--pct-control-height-*`) shared by both, and vertical padding stops driving the vertical. The
`28 / 36 / 44 px` scale was chosen so the smallest size still clears the SC 2.5.8 touch
threshold with room to spare.

The evidence is a measurement in the browser (`apps/sandbox-e2e/src/size.spec.ts`), not the
mere fact that both components read the same token: the test checks that the heights are equal
**and** what that height is — on equality alone both could collapse to the text line height and
still "pass".

---

### <a id="lesson-30"></a>`lesson-30` — A test can click server HTML before hydration

**A test can click the server's HTML before hydration takes it over.** After the sandbox was
split into lazily loaded views the e2e tests began to flake: `fill()` typed a value and then
the field returned to its initial state — the symptom looked like a `PctNumber` defect and was
a race. `goto()` resolves on the `load` event, and between "the element is in the DOM" and "the
element is wired up" sits the fetch of the route's chunk. So the shell exposes
a `data-sbx-ready` marker after `ApplicationRef.whenStable()`, and the tests enter through the
`visit()` helper, which waits for it. The barrier is on the test's side, not the app's — the
app delays nothing.

---

### <a id="lesson-31"></a>`lesson-31` — The id generator was unsafe under SSR

**The id generator was unsafe under SSR and nobody saw it.** `nextPctId` counted in a module
variable, and the server renders many requests in one process: the counter grew with every
render while the client always started from zero. The first request after the server started
happened to agree (hence the green tests); every later one produced HTML with different ids
than the client would compute — after hydration some attributes kept the server's values and
some got the client's, and **ARIA relations pointed into the void**
(`aria-labelledby="pct-field-4071-label"` against a `pct-field-12-label` label). The defect only
surfaced once the sandbox got a second route and traffic on the dev server grew. The counter now
lives in a `providedIn: 'root'` service — the app injector lives exactly as long as one request
on the server and one page load on the client, so both sides count from zero.

The lesson: **module state is shared across all SSR renders.** Every counter, cache or registry
in a library with `req-project-ssr` has to go into DI or be stateless — otherwise the defect
appears only "on somebody's production", after the second request.

---

### <a id="lesson-32"></a>`lesson-32` — A number field step computed from the DOM dropped keypresses

**A number field step computed from the DOM's text dropped keypresses.** `stepBy` took its
starting point from `input.value`, and the text is written by an **effect**, i.e.
asynchronously: two arrow presses in one detection pass saw the same starting value and the
second had no effect. It showed up as a flaky e2e test (once every few runs), because it
depended on whether a flush fitted between the events — a person holding the arrow down hits
the same window. The starting point is now **the signal**, and the text only when the user is
actually typing (`typing()`); a typed but uncommitted value is still respected.

The lesson: **the DOM is not the source of truth in a signal-driven component** — a read from
it can always be one pass behind. The regression test deliberately does not stabilise the
fixture between events; with an `await` after each of them the defect is invisible, which
explains why the existing keyboard test let it through.

---

### <a id="lesson-33"></a>`lesson-33` — The states view found a disallowed ARIA attribute

**The cross-cutting states view found a disallowed ARIA attribute on its first run.**
`PctRadio` exposed `aria-readonly` on a native `<input type="radio">`, and the `radio` role
**does not support** that attribute — only `radiogroup` does. Axe classifies this as a
**critical** violation (`aria-allowed-attr`), and the defect had still survived several rounds
of audits: no example so far had rendered a radio group in a read-only state. The attribute
moved to the container, and the unit tests now check both places (present on the group, absent
on the option).

The lesson: **the "every component × every state" matrix is not sandbox decoration but the
input for the a11y gate.** The audit examines only what somebody rendered first — a gap in what
is shown is a gap in coverage, invisible in the report because the report is green.

---

### <a id="lesson-34"></a>`lesson-34` — The stylesheet guessed intent from a slot's content

**The stylesheet guessed intent from a slot's content and coupled two independent things.**
`lesson-27` gave a decoration the full height of its slot through the rule
`:has(button, a, [tabindex])` — that is, "interactive" meant "fills the slot". The consequences
only appeared on an attempt to build four natural decorations at once: a clear button **could
not** be smaller than its slot (and a small button with a visible border inside a field's
spacing is an ordinary pattern), and a tile with a background — a unit welded into the frame —
**could not** be bigger, because it is not interactive. The two axes were separated: the author
decides whether the slot is filled (`pctPrefix="fill"`), and the element itself still decides
about handling the click. A `fill` decoration is also **a surface of its own**, so the wrapper
stops intercepting clicks on it — otherwise the tile would show a `default` cursor and still
focus the control, precisely the cursor/effect mismatch `lesson-27` was fixing.

Two details only came out of measurement in the browser, not of reasoning. First, a welded-in
button contributed a minimum height of its own, equal by design to the height of a field of the
same size (`req-api-size`), so the row grew by the thickness of its border — a field with
a button was 2 px taller than one without. So a `fill` decoration gets `min-height: 0`: it is to
take its height from the slot, because it is the slot it fills. Second, once the slot was handed
over to the decoration, the spacing between it and the control had to move onto the control's
column — without that it would be a strip with no owner, i.e. a return to the `lesson-27` defect
in miniature.

A symmetric constraint stays on the author's side and is unremovable: an `inset` button has to
be one step smaller than the field, because the heights of both at the same size are equal by
design. At the smallest size there is no step below, so the button fills the height there and
pushes the row out by the thickness of its border — that is not a fitting defect but a corollary
of `req-api-size`.

---

### <a id="lesson-35"></a>`lesson-35` — The control handed the wrapper its frame but not its panel

**The control handed the wrapper its frame but did not hand it the panel.** After
`req-api-wrapper` the select's trigger inside a field stopped being its own frame — and the
overlay still anchored to it, so the panel came out of the control column's edge rather than
the field's: with a measured 301 px field the panel was 275 px and offset 13 px to the right.
A standalone select looked impeccable all the while, because there the trigger **is** the
visible edge — so the symptom appeared in exactly the configuration where the wrapper takes over
the appearance. Hence `req-api-overlay`: the wrapper offers its row as the reference surface,
and the anchor is part of the contract, not a guess made by the control.

On the same occasion it turned out that **the panel's typeface had no owner either**. The panel
lives in a CDK overlay, i.e. as a child of `body`, so it inherits its typeface from there rather
than from the app: the sandbox sets `font-family` on the shell's host, and as a result the list
wrote in the browser's default serif (measured: `Times New Roman` in the panel against
`system-ui` in the control). The size had a twin defect, but in the other direction — it came
from the `--pct-select-font-size` token, so in an `lg` field the options stayed at 14 px while
the trigger wrote at 16 px. Both solved the same way: the typeface is read from the trigger when
the panel opens (like the theme in `lesson-18`), instead of relying on inheritance or on
a token.

The lesson: **every inherited property is silently severed in an overlay.** The theme was
already being carried over explicitly, but that was treated as a peculiarity of theming rather
than as a rule — and the rule reads: whatever is supposed to look like an extension of the
control has to be read from it, because the DOM tree will not do it.

**Addendum — the third property.** While introducing the `dir` axis into the sandbox
(`req-token-logical`) it turned out that writing direction is exactly the same case — measured
`direction: rtl` on the trigger against `ltr` on the panel. The stylesheet was impeccably logical
all the while: `text-align: start` simply resolves the other way when the direction does not arrive.
So the rule repeated for a third time, which is an argument for extracting this carrying-over into
the overlay layer in `core` instead of appending a fourth property to `openPanel()`. A secondary
conclusion: a gate reading stylesheets is a necessary condition for the RTL promise, never a
sufficient one — the rest lives on the rendered page.

The lesson: **a CSS rule inferring intent from a slot's content is hidden API** — cheap only
while there is one example. When an author wants a variant the heuristic does not anticipate,
there is no way to express it and what is left is a fight with the stylesheet. A variant the
library allows is to be named in the API.

---

### <a id="lesson-36"></a>`lesson-36` — The package carried no skin while the pipeline shone green

**The package carried no skin and the whole pipeline shone green.** `dist/libs/components`
contained FESMs, types and an `exports` map — and **zero CSS files**: the bundle referred to
`var(--pct-field-bg)`, whose definition was nowhere in the package. The cause was that `tokens`
**did not exist in the NX graph** (`tokens -> []`, and nothing pointed at `tokens`), while
`libs/tokens/dist` is gitignored. There was no edge because the dependency is unusual: not one
TS import, only a CSS artifact — and the Nx graph infers from imports.

The failure was **silent in both directions**. With `libs/tokens/dist` deleted,
`nx build sandbox` ended in **success** without a warning, and the app's resulting CSS contained
no token definition at all; `nx serve sandbox` (the start command from the README) did not have
that dependency either. CI passed only thanks to a **manual step**, `node libs/tokens/build.mjs`
before `run-many` — a workaround that masked the missing edge instead of exposing it.

The fix has three parts, because three different things could fail independently: (1)
`implicitDependencies: ["tokens"]` in `components` and `sandbox` plus an explicit `dependsOn` on
`serve` — the graph knows the edge, the manual CI step disappears; (2) the skin is copied into
`libs/components/themes` and taken from there by `assets` in `ng-package.json` — ng-packagr
**does not read assets from outside the project directory**, so the staging is forced, not
cosmetic; plus a `./themes/*` entry in the source `package.json`'s `exports` (ng-packagr merges
it with the generated entries), because the `exports` map is closed and a file with no entry is
invisible to the consumer; (3) the `nx check-package components` gate.

The lesson: **a green build is not proof that the artifact can be used** — if nothing checks the
packed output, a library can carry a defect through the entire pipeline that only the first
consumer sees after `npm i`. The gate checks token closure (every `var(--pct-*)` used in the
package has a declaration in it), not the mere presence of a file — presence would also be
satisfied by an empty file, or by a skin somebody stripped the component layer out of. That is
the same class of defect as `lesson-17`, moved from runtime to distribution: a missing custom
property definition is not an error but a silent fall back to the initial value.

---

### <a id="lesson-37"></a>`lesson-37` — A generic in a component does not mean the template checks it

**A generic in a component does not mean the template checks it.** After generalising
`PctSelect` into `PctSelect<T>` (`req-api-generic`) a probe in the sandbox showed that the
compiler lets explicitly contradictory bindings through: a `PctSelectOption<number>[]` option
list with the value `'a string'`, an `emptyValue` of a different type than the options, and even
`$event` from `(valueChange)` passed to a method with a mismatched parameter. Template checking
**worked** (`NG8002` on a made-up input was caught immediately) — the problem was narrower: `T`
has several inference sites (`options`, `value`, `emptyValue`), so TypeScript chose the union of
the candidates (`string | number`), which both sides of the conflict fitted.

The fix is to take away the right to **determine** `T` from the bindings that are only meant to
be checked against it: `value` and `emptyValue` are declared as `NoInfer<T>`, so the type comes
from the option list alone. That closed four of the probe's five cases — including the typing of
`$event`, which had previously been silent.

The fifth case stayed and is a limitation of Angular, not of the API: `PctRadioGroup` has no
options input (they are projected content), so the only source of `T` is `value` itself — and
there `$event` from `(valueChange)` is still unchecked. The generic gives that group safety on
the TypeScript side (`isSelected`, `select`, reading `value()`) but not on the template side.

The lesson: **with a generic component you have to check separately whether the template really
enforces the type** — the mere fact that the build passes on correct usage does not tell "the
type matches" from "the type is ignored". Only a negative control settles it: a deliberately
wrong binding that **must** break the build.

---

### <a id="lesson-38"></a>`lesson-38` — Playwright's idiomatic emulation silently does nothing

**Playwright's idiomatic way of writing emulation silently does nothing and the test passes on
default values.** `test.use({ reducedMotion: 'reduce' })` and
`test.use({ forcedColors: 'active' })` in version 1.61.1 **do not reach the browser context**:
in the page `matchMedia('(prefers-reduced-motion: reduce)').matches` returns `false`, even
though the configuration looks right and nothing warns. The same code through
`browser.newContext({ reducedMotion })` and through `page.emulateMedia({ … })` works
impeccably, and `test.use({ colorScheme })` — one of the three axes — works too. In other words:
how you write it decides whether the test examines anything, and the discrepancy is invisible on
reading.

It was found by the **negative control**, not by the test proper. Had there been only
a reduction test asserting "the transition duration is small", it would have passed on the base
value of `150ms` read as "small enough" and nobody would have noticed that the media query never
fired. What fired was the comparison of a pair: without the preference **exactly** `150ms`, with
it **exactly** `0.01ms`.

Hence two rules for every system-preference test: emulation goes through `page.emulateMedia()`
in the `visit()` helper, and every such test **checks `matchMedia` first**, i.e. asks the
browser whether it is in the mode being measured at all. That is the same principle as
`req-quality-negative-control`: a gate has to be able to say that it works.

---

### <a id="lesson-39"></a>`lesson-39` — A visual test can be born dead in two ways

**A visual test can be born dead in two independent ways — both of which look like a working
test.** First: `__screenshots__/` was in `.gitignore`, so the references would never reach the
repository, and with no reference Playwright **saves the current screenshot as correct and
passes** — on CI the test would shine green forever, comparing every run with itself. Second:
the first version of the threshold had `maxDiffPixelRatio: 0.01` and **let through** a change of
the button's `border-radius` from 8 px to 1 px.

The second case is instructive numerically. A threshold as a **fraction** of the image grows
more forgiving the bigger the card — while the difference of a real regression does not scale
with the screenshot's size, because it concerns a few edges. Measured: the same code in
a repeated run gives **0** differing pixels, and the radius change gives **74**. So the
threshold is absolute (`maxDiffPixels: 20`) and follows from those two numbers rather than from
a feeling.

Both defects only surfaced after **deliberately introducing a regression** and checking that the
gate fires. The lesson: a new gate is not ready when it passes — it is ready when it has been
shown to fail.

---

### <a id="lesson-40"></a>`lesson-40` — A state carried by background alone disappears in high contrast

**A state carried by the background alone disappears in high contrast mode.** The dot of
a selected radio button is a plain `<div>` with a `background`, and under `forced-colors: active`
the browser forces the system palette onto backgrounds — the dot and the circle both got
`rgb(255,255,255)` and **a selected option looked identical to an empty one**. Neither the token
contrast gate nor the axe audit sees this: both examine normal mode, in which the colours are
correct.

The fix is one sentence long, but the rule that follows from it is wider and went into
`req-a11y-forced-colors`: **a state is to be carried by the presence of a shape, not by
colour**. The checkbox's tick was immune from the start, because it toggles `visibility` — the
radio's dot was the exception, not the rule. Where there is no shape (a list option is
a rectangle), we split the states into two independent channels: background for selection,
outline for the keyboard cursor.

---

### <a id="lesson-41"></a>`lesson-41` — The tool had a "before" hook where a "after" one was needed

**The tool had only a "before" hook where an "after" one was needed.** `nx release` offers
`preVersionCommand`, a command run **before** the version is bumped. A package built at that
moment carries the old `PCT_VERSION` constant, so the first release would ship an artifact lying
about its own version. The documentation's hint — `manifestRootsToUpdate: ["dist/{projectRoot}"]`
— is a half-measure: it fixes the `package.json` in `dist`, i.e. **one file**, while the value
compiled into the bundle stays old. The package then agrees with itself in the manifest and lies
in the code.

The fix is to reverse the order rather than patch the symptom: the release is driven by
`tools/release.mjs` on the programmatic API (`releaseVersion` → stamp → build → gate →
`releaseChangelog` → `releasePublish`). The build stands after the version bump, so `dist`
carries the right value straight from the compiler and `manifestRootsToUpdate` stops being
needed. The package gate stands **before** the commit, the tag and the publish — that is, before
everything that would otherwise have to be undone.

A separate decision: `stamp-version` is **not** a dependency of `build`. If it were, the
artifact would always agree with itself and the version check in `check-package` would stop
measuring anything — exactly like a gate that cannot fail (`lesson-39`).

---

### <a id="lesson-42"></a>`lesson-42` — The e2e project had never been typechecked

**The e2e project had never been typechecked and nobody noticed.** `sandbox-e2e` had `lint` and
`e2e` but **no** typecheck target — a dozen or so TypeScript files the compiler had never seen.
It came out alongside `req-token-artifacts`: adding the target revealed 3 errors in
`playwright.config.mts` on the first run. They were not test defects — the `tsconfig.json`
described the project untruthfully (`module: commonjs` for a `.mts` file, which is ESM, and no
`types: ["node"]` while `process` was used). The code worked because Playwright and Nx load
`.mts` with loaders of their own, so the tsconfig's declaration was never confronted with
reality.

The lesson: **lint is not a substitute for typecheck.** ESLint parses and checks rules, but it
reports neither type errors nor module configuration inconsistencies. A project with no
`typecheck` target is code about which the only known fact is that it parses.

---

### <a id="lesson-43"></a>`lesson-43` — Reading a non-existent token gives an empty string

**Reading a non-existent token is not an error, it is an empty string.**
`getComputedStyle(el).getPropertyValue('--pct-surfce')` returns `''` — so a test comparing two
such reads passes on `'' === ''` and says nothing about having measured nothing. That is the
same class of silent defect as `lesson-38`, only triggered by a typo rather than by how the
emulation was written. Hence the real use of the generated `tokens.ts` (`req-token-artifacts`):
the `tokenOf`/`rootToken` helpers take a `PctCssVar` — a union of **custom property names**, not
of DTCG paths — so a typo is a compile error rather than a green test. The gate was verified by
a negative control: swapping one name for a wrong one produces 6 type errors.

Along the way, the same tooling trap three times in a row: a "comment" in JSON (`"// key"`) can
only be inserted where the schema allows arbitrary keys. In `targets` (project.json),
`namedInputs` (nx.json) and `paths` (tsconfig) the value must have a specific type, so a string
respectively blows up the Nx graph (`Cannot use 'in' operator`), its loading (`Given napi value
is not an array`) and `tsc` (`TS5025`).

---

### <a id="lesson-44"></a>`lesson-44` — `.nxignore` does not disable a project, it removes a file from counting

**The package gate's negative control needs fake packages, and a fake package has
a `package.json` — which was enough for Nx to make a project out of it.** `nx show projects`
showed a phantom `@pacit/components` rooted in `tools/check-package.fixtures/_reference`, with
a `lint` target of its own; three fixture directories declared the same name, so the graph
picked one of them quietly. The natural workaround — an entry in `.nxignore` — removed the
phantom and **broke something worse**: the directory disappeared from the file map, so the
`check-package` target's `inputs` stopped seeing it. Measured: after editing a fixture,
`Cache: 5/5 hit (100%)`, i.e. the gate **did not run**; after the fix the same edit gives `4/5`.

The consequence is exactly the class this whole project stands against: somebody weakens
a fixture, CI shines green from the cache, and the gate has not run once. The fix is not
ignoring but not using a name the tool treats as structure: the manifest sits in the repository
as `manifest.json` and only becomes `package.json` in the copy assembled for a run.

The rule is wider than this one directory: **"ignore" in build tools almost never means "not
a project" — it means "does not exist"**, and non-existence propagates into hashing, i.e. into
what decides whether a task runs again. Before silencing a tool, you have to check what else
will stop seeing it — and check it by measuring cache hits, because in a run's result the
difference is invisible: green is green.

---

### <a id="lesson-45"></a>`lesson-45` — Removing a test raised coverage

**Removing `number.spec.ts` raised line coverage from 96.55% to 96.94%.** That is not a paradox
of the measurement but its definition: v8 knows only the modules that actually entered the run,
so the entirely untested `number.ts` dropped out of the report along with its test — 114 lines
vanished from the **denominator** rather than being added to the numerator. A threshold guarding
such a number is a gate born dead (`lesson-39`), and in the worst possible variant: it shines the
brighter the less you test.

`coverageInclude` closes this **only halfway**. Files with no test are added by a separate path
(`getCoverageMapForUncoveredFiles`) that parses the SOURCE with rolldown — and that one falls
over on `import type` / `export type`, printing `Failed to parse … Excluding it from coverage.`
in the middle of a few thousand lines of log and ending the run **green, with exit code 0**.
A probe settled where the boundary lies: a plain function, a `@Directive` and a `@Component`
with a `templateUrl` all reached the report with a zero; a copy of `number.ts` did not, because
line 18 has an `import type`. In an Angular library under `isolatedModules` that is not a rare
notation but the default.

Hence coverage stands on two legs. `libs/components/src/public-api.spec.ts` imports every gate
of the package, so its modules enter the run by the normal path and a file with no test shows up
with coverage near zero instead of dropping out of the statistic. `tools/check-coverage.mjs`
watches that **not one source file is missing** from the report — because it is the denominator
that quietly shrinks while the percentage always looks healthy. Point 3 of that gate is the only
one that catches this regression; the points about the threshold guard a number that came out of
it.

Two things measured along the way rather than assumed. `coverageInclude` takes patterns relative
to the **repository root**, not the project directory, whatever the executor's schema says: the
notation `**/src/**` pulled all of `apps/sandbox` into the library's report (coverage 96.55% →
70.72%). And the 80% threshold is **a floor, not a ratchet**: at 96.58%, removing `select.spec.ts`
alone gives 81.55%, `number.spec.ts` alone gives exactly 80.00%, and both pass; only both
together give 64.96% and fire. Whoever wants a ratchet has to write it separately — this gate
does not promise one.

---

### <a id="lesson-46"></a>`lesson-46` — A partial declaration omits defaults, so OnPush can only be measured after linking

**The built package contains not one `changeDetection:`, and yet every component links as
OnPush.** Partial compilation (`ɵɵngDeclareComponent`) records only what departs from the
defaults — the value comes into being at the consumer, at link time, out of **their** Angular's
defaults. The conclusion is inconvenient: the promise "every component is OnPush" cannot be
checked in the source (nothing stands there — the v22+ guide explicitly forbids repeating the
defaults) nor in the bundle's text (nothing stands there either). The only reading that means
anything is `ɵcmp.onPush` **after** linking, and in Node that is reproduced by
`import '@angular/compiler'` before loading the package — the same step the consumer performs.

Hence the shape of the `check-zoneless` gate: it measures `dist`, not the sources. The side
effect is the one that was wanted — the day Angular changes its default is the day this gate
fires, with no changelog reading.

Measured along the way rather than assumed: adding an explicit `standalone: true` to the
decorator **does not change** `ɵɵngDeclareComponent` (the declaration carries
`isStandalone: true` anyway) and moves only `ɵɵngDeclareClassMetadata` — the echo of the
decorator left for debugging. So the Nx cache is invalidated today even without putting the
sources into `inputs`, but thanks to a diagnostic feature that is nobody's promise. A cache key
has to name what the gate **reads**, not what usually changes alongside — otherwise `lesson-44`
repeats itself in a third disguise.

And one more, cheaper: `git ls-files "*package.json"` also pulls in `ng-package.json`.
A pathspec matches a suffix, not a file name. It produced no false hit — the ng-packagr
configuration has no dependency fields — but it inflated the denominator in the gate's message
from 3 manifests to 10, i.e. it made the gate lie about its own reach.

---

### <a id="lesson-47"></a>`lesson-47` — An inferred target is somebody else's decision about scope and looks exactly like your own

**`sandbox` had a `typecheck` target, passed green and did not look at four of its own files.**
The target was contributed by `@nx/vite/plugin` (`typecheckTargetName: "typecheck"`), and its
command reads `tsc --noEmit -p tsconfig.app.json` — a configuration that **excludes**
`**/*.spec.ts`. The specs went through vitest, which transpiles without type checking, so
`app.spec.ts`, `demo.spec.ts`, `test-setup.ts` and `vite.config.mts` never passed through the
compiler once. And there was **nothing** to see in `project.json`: the target is not written
there.

This is `lesson-42` one floor up. There the target was missing and the `nx affected -t typecheck`
list said nothing; here the target exists, runs and checks part of the project, and that
difference shows up nowhere except in `--listFilesOnly`. The rule: **an inferred target is the
plugin's decision about what the project is — not mine.** You may accept it, but you have to see
it first, and `nx show project … --json` is the only place where it is visible.

Hence the shape of the `check-typecheck` gate: it does not read `include` from the tsconfig but
**runs the command from the target** extended with `--listFilesOnly` and compares the result
with the git index. Reading `include` would measure a second time the same declaration that
turned out to be untrue in `lesson-42`; `--showConfig` is out for the same reason, because it
expands patterns but does not see files pulled in by imports.

Three things measured along the way, not assumed:

- **The gap is BETWEEN projects too.** `vitest.config.ts` and `vitest.workspace.ts` sit in the
  root and belong to no library or app, so a gate walking over projects would be blind to them
  and would rule "there is no such code" precisely because it cannot see it. Point 1 assigns
  every file to the deepest prefix project and fires on those matched by none.
- **The root project is affected by every change.** Checked with
  `nx show projects --affected --files=…`: `libs/components/src/index.ts`, `docs/plan.md` and
  a new project's `project.json` all yield `@org/source`. So the workspace gates
  (`check-docs`, `check-typecheck`) run in every pass — otherwise a new project with no target
  would slip past the very gate built for it.
- **Disarming a point sometimes yields an exception instead of a message.** Point 3 read
  `p.typecheck.commands` directly, because after point 2 the target "certainly" exists.
  Disabling point 2 as part of the control of that control turned the gate into a `TypeError`,
  i.e. the negative control lost the ability to examine the point it was meant to examine.
  A dependency between points is normal; writing it down so that its violation gives a stack
  trace instead of a sentence is not.

And one more, in the `lesson-44` family: **a target checking specs must not take
`inputs: ["production"]`**, because that namedInput subtracts `**/*.spec.ts` — exactly the files
it was added for. Measured: adding a line to `src/public-api.spec.ts` gives `Cache: 0/1 hit`
under `default` and `1/1 hit` under `production`. The run is green in both cases and looks the
same in both; what differs is whether the compiler started at all.

---

### <a id="lesson-48"></a>`lesson-48` — Two measurements guarding each other have to be INDEPENDENT, or they go dark together

**The styles gate passed green having printed "7 stylesheets, 0 components".** The source list
came from `git ls-files 'libs/components/*/src/**/*.ts'`, and **a git pathspec is not a shell
glob**: without the `:(glob)` magic the asterisk crosses `/`, so that pattern demands one
directory too many and does not match `button/src/button.ts`. It returns zero files — not an
error, not a warning, an empty list.

Zero components passed the denominator check, because that one compared **the number of parsed
decorators with the number of `@Component(` occurrences**. Both sides came out zero, zero equals
zero, the point ruled "complete". The remedy is the same one the coverage gate uses on its file
list: before comparing two sets, check that **at least one of them contains anything at all**.
A comparison of numbers is always blind to zero.

A worse variant of the same defect sat in the check that was meant to rule it out. The counter
was written as `/^@Component\(/gm` — **character for character the same anchor as the parser's**.
The point of the counter was that it measures independently: the parser anchors on prettier's
formatting, and the counter is meant to notice when reality departs from that formatting. With
an identical anchor, shifting a decorator by **one space** puts out both at once, the two sides
agree one lower, and the gate ends green.

Measured, not reasoned: `PctCheckbox` indented by a space gave "7 components" instead of eight,
on a run with not one violation.

The same sentence stood in the comment next to that code — "without this a formatting change
would not blow the parser up but quietly SHRINK the denominator" — and it had been untrue from
the start. The comment described the intent, the implementation did not deliver it, and **nothing
checked that, because this gate's negative control supplies data, not source text**: the regex
runs on no fixture, only on the real repository. The hole only surfaced from a manual run against
a broken repo.

The same defect was in `check-zoneless.mjs` ([`lesson-46`](#lesson-46)) and was fixed together
with this one — there it cost a silent absence of the `OnPush` measurement for a whole component.

The rule: **a check comparing two measurements is worth exactly as much as their independence.**
Copying the expression from one side to the other turns it into a check that a certain constant
equals itself — a construction that never fires and looks exactly like a working one. On top of
that comes a conclusion about the reach of a negative control: a fixture supplying **data** does
not exercise the code that extracts that data, so that layer needs evidence of its own — a run
against a broken repository.

---

### <a id="lesson-49"></a>`lesson-49` — A snapshot does not close a promise about names, it freezes it

**The plan said: "`tokens.ts` is generated already — add a versioned snapshot and a comparison".
A snapshot added then would have recorded as the accepted state 34 tokens whose names broke the
scheme described in the same requirement.** `--pct-checkbox-checked-bg` stood in
`component.checkbox.json` six lines below `--pct-checkbox-border-hover`: once state before
property, once after. Both names are valid on their own and neither breaks anything — what
breaks them is standing next to each other, because then knowing one gives no way to guess the
other. That guessability is exactly the content of
[`req-token-names`](requirements/tokens.md#req-token-names).

The distinction the plan did not make: **a snapshot measures CHANGE, not a PROPERTY.** These are
two different promises and only the first can be closed by comparing with a file. A gate made of
a snapshot alone answers "did somebody rename a token quietly" and says nothing about "can this
name be guessed" — and on its first run it does something worse than saying nothing: **it seals
the state it found.** The longer it stands, the more expensive the fix, because every further
rename is by then a breaking change for the consumer.

Hence the order of the points in `check-tokens.mjs`: the scheme **before** the snapshot. The
reverse would answer a bad name with "the snapshot has drifted" — a correct diagnosis of
a problem that does not exist, plus a hint (`--write`) that would set the defect in concrete.
Measured: with the scheme point disarmed, all four doctored inputs for the scheme fire on the
snapshot, i.e. they look handled.

The second sentence of the same lesson concerns the dictionary. The rule "a name is made of
words from a closed set" closes in a circle, because the set can be extended along with the
name. A machine cannot settle that and the gate does not pretend to — it guards a narrower
thing: **every declared word has to be used**. That makes adding a word a line in the diff,
visible in review, rather than a quiet widening of the set of acceptable names. That is the same
construction as the justification length threshold in `check-styles`: the gate does not judge
whether the reason is good, it makes sure there is something to judge.

A third observation, in the [`lesson-44`](#lesson-44) family: **a fixture that is not in the
repository is not a negative control.** Two of this gate's cases carry a deliberately broken
`dist/` — because that is the only way to show a mismatch between artifact and source — and the
`dist` rule in `.gitignore` matches a directory of that name at **any** depth, so both dropped
out of the index without a word. A fresh checkout got the cases without their defect. Measured by
moving both directories aside: the gate then reports "doctored input PASSED" for points 1 and 2.
So the failure is **loud**, and that is the only reason this slip was not expensive — the "a case
must fire on its own point" construction turns a missing file into red CI rather than into
a silent loss of two checks. The file had to be recovered anyway
(`!tools/check-tokens.fixtures/*/libs/tokens/dist/`) and excluded from prettier, because
a fixture is meant to look like real generator output, not like formatted code.

A fourth observation, this time about tooling rather than a gate: **a renaming script has to be
idempotent, or one-shot under supervision.** The map `dot` → `dot-bg` applied a second time to an
already renamed file gave `--pct-radio-dot-bg-bg` and `--pct-radio-dot-bg-bg-size`, because text
substitution has no word boundaries. Only a grep noticed — `check-tokens` reads token
**declarations**, not their uses in stylesheets, so a broken `var()` is invisible to it by
design. That side is watched separately by `check-package` (every token used has a declaration in
the package) and that is the right division, but you have to know that a run of this one gate
does not rule such a defect out.

---

### <a id="lesson-50"></a>`lesson-50` — A negative control proves a gate FIRES, not that it tells the truth

**The snapshot point in `check-parts` fired correctly and explained it falsely.** Renaming the
`trigger` part to `activator` — a change to public styling API — produced the message "the list
of parts is the same, the header or the row order has drifted". The file content comparison was
fine and worked; what failed was the code meant to **name the difference**: the data-row filter
read `/^\.[a-z-]*\s/` and did not get past the slash in `./select`, so both lists came out empty,
and empty lists are equal. The gate rejected the change and, while doing so, gave a correct
diagnosis of a problem that did not exist.

What matters is not the oversight itself but that **the negative control had no way of seeing
it — by construction.** The `stale-snapshot` case fired on its own point and was counted,
because `fixture.json` declares a `check` and the run compares identifiers. That is how the
negative control of **every** gate in this repository works: it checks WHICH point rejected an
input, and says nothing about WHAT that point said. The whole message layer — the only layer
a human reacts to — lies outside its reach.

It came out of a run against the real repository, and not from its exit code but from reading
the sentence it printed. Which is a practical rule: **a run against a broken repository has to be
READ, not counted.** The exit code is the part fixtures already cover; the message is covered by
nothing but a look.

Separately, in the [`lesson-47`](#lesson-47) and [`lesson-49`](#lesson-49) family: disarming the
"no snapshot" branch turned the gate into a `TypeError`, because the branch computing the
difference read `null.split`. **The third time for the same defect, found the third time by the
same control — this time in a gate written in awareness of the previous two.** It repeats because
the natural way to write the second branch is to assume the first has already worked.
A dependency between the branches of one point is normal; writing it down so that its violation
gives no sentence is not — and apparently knowing about it is not enough, it has to be measured
every time.

### <a id="lesson-51"></a>`lesson-51` — A default a tool writes in cannot be removed, so a gate on its absence has no way to fire

**`check-bundle` got a point guarding `sideEffects: false` in the packed manifest, justified by
"removing this flag produces not one red test and disables tree-shaking at the consumer". The
justification was true, and the point examined something other than what I wrote.** A run against
the real repository: the key removed from the source `libs/components/package.json`, a rebuild,
the gate **green**. The first suspect was the cache — `nx build` reported `Cache: 3/3 hit`, which
looked like a sufficient explanation and was a false trail. A repeat with `--skip-nx-cache` gave
the same result: **ng-packagr writes `"sideEffects": false` in itself** when the source says
nothing.

So the scenario the point was built for — "somebody deleted the flag" — is unreachable, and
a point written that way would be a [gate born dead](#lesson-39) in that one variant and nobody
would notice, because the gate passes. It fires on an explicit `true` and on the day ng-packagr
stops writing the default in — and that is its real scope; it just had to be measured rather than
written out of intent.

A more general rule, in the [`lesson-11`](#lesson-11) and [`lesson-46`](#lesson-46) family: **a
tool in the build chain has defaults of its own and writes them into the artifact, so the
question "did somebody remove this" has no answer on the artifact's side.** A gate reading the
artifact then examines what the tool decided, not what a person decided. The answer is not "read
the source" — the consumer gets the artifact — but: **measure what this point can really fire on,
and write that into the point itself.** Otherwise the comment next to a gate describes a defect
that gate does not catch, which is worse than no comment: it reads like coverage.

Separately, in the [`lesson-47`](#lesson-47), [`lesson-49`](#lesson-49) and
[`lesson-50`](#lesson-50) family: disarming the `presence` point turned the gate into
a `TypeError`, because the second branch of the same point read `s.pulled`, trusting the
first. **The fourth time for the same defect — and the first time INSIDE one point rather than
between points.** The previous three gave the rule "do not trust the previous point"; this one
adds that a point's boundary is not the boundary of that trust.

### <a id="lesson-52"></a>`lesson-52` — A pair nobody put in the policy is a pair the gate has no opinion about

**This library's contrast gate counted 38 pairs and was green. The colours the library actually
paints number 74.** Outside its reach stood every hover and active state of the button, every
disabled state, the error messages of the checkbox, the radio and the select, and seven borders.
The policy did not lie — nobody lied to it — it simply **measures exactly what somebody typed
into it first**, and in a run that looks identical to a complete measurement
([`lesson-33`](#lesson-33) in a token-flavoured version).

Two of those 27 gaps were also invisible to a rule based on token NAMES: the button's outline
variant paints the background `var(--pct-surface-100)` and the label `var(--pct-primary)`, i.e.
with two **semantic** tokens. A gate asking "does every `*-bg` component token have a pair" would
rule on completeness without seeing them at all. Hence the denominator reads the **sass** output
for the stylesheets rather than a list of names — the same move as "do not read `include`, run
the compiler" from [`lesson-47`](#lesson-47).

The most important part is what happened after the missing pairs were added: **the build failed
on three of them.** In the dark theme the button's label on hover gave 3.45:1, on active 2.66:1,
and the outline variant's label on hover 3.98:1 — all below AA, all present in the library for
months, all with CI green. The cause is instructive in itself: **the direction of the ramp
depends on which side the text is on.** In the light theme `on-primary` is white, so a hover that
darkens the background raises contrast; in the dark one `on-primary` is dark, so the same
operation **lowers** it. A ramp copied from the light theme into the dark one looks symmetric and
is not. The fix: in the dark theme `primary` goes up (`blue-400` → `blue-300` → `blue-200`)
rather than down.

A practical rule: **a gate examining a hand-written list needs a second gate on that list's
completeness** — and only together are they a measurement. The first alone is a questionnaire
that grades its own questions.

### <a id="lesson-53"></a>`lesson-53` — The visual gate has two budgets and only one was measured

**Changing `--pct-primary` in the dark theme by one step of the ramp repainted the whole button
on every dark screenshot — and did not move a single reference.**
`npx playwright test --update-snapshots` rewrote no file, because to Playwright the image was
**identical**. Measured, because it is hard to believe: the reference's histogram has 2145 pixels
of `#3b82f6`, a fresh render's has 2155 of `#60a5fa`, and the comparison reports zero
differences.

The reason: `toHaveScreenshot` has **two** thresholds. `maxDiffPixels` says how many pixels may
differ, and `threshold` (default **0.2**) decides which pixel **counts as different** at all —
that is the colour distance in pixelmatch's YIQ metric. Measured ramp steps: `blue-500` →
`blue-400` is 0.0163, `blue-500` → `blue-600` is 0.0101, `slate-900` → `slate-800` is 0.0042. All
of them fit inside the default tolerance **twelve times over**, so the visual gate could not see
a palette shift — precisely the class of regression a design system keeps screenshots for.

This is [`lesson-39`](#lesson-39) on a second axis. There a fractional threshold scaled with the
card's size and let a geometry regression through; here a colour threshold lets a painting
regression through. In both cases **the configuration had one measured value and one default, and
a gate is only as strong as the latter.**

A practical rule: **list all of a gate's thresholds and measure each one separately, including
the one you did not set.** A default is not an absence of a decision — it is the decision of
somebody who did not know this project. The new threshold (`threshold: 0.005`) catches every step
of the ramp except adjacent background greys and adds no noise: 26 screenshots, two consecutive
runs, zero false alarms.

### <a id="lesson-54"></a>`lesson-54` — An input's default value is a read at construction, even though the input is a signal

**`readonly placeholder = input<string>(this.texts.selectPlaceholder)` looks like a reactive read
and is not one.** What is reactive is the input itself — a change of the binding from outside
will redraw the view. The **default** value comes into being once, in the constructor, so
swapping the texts after the app starts does not reach a component that already exists.

Measured by a deliberate regression: a test switching `providePctTexts(computed(() => …))` from
English to French gets `expected 'Select…' to be 'Sélectionner…'` with the read at construction, and
passes with the read through `computed()`. With CI green the whole time, because **the only test
of that channel rendered the component once** — and with a single render both versions give the
same string.

The matter is wider than texts. A signal in an API says **when a value is read**, not that every
use of it is a read: `input(x)`, `signal(x)`, `model(x)` take **a value**, so whatever stands in
that place is computed immediately and frozen. That is the same shape as [`lesson-11`](#lesson-11)
and [`lesson-46`](#lesson-46): a default is somebody else's decision, taken earlier than it
seems.

A practical rule: **a string, a value depending on DI and anything a consumer can swap after
startup are to be read in a `computed()`, not in a default value.** Written down as a point of
a gate (`check-texts`, the rule `text-at-construction`), because knowing is not enough: the
previous notation stood in the library from the day `PCT_TEXTS` was introduced and produced
not one red test in all that time. The defect was moreover **described
in decision 0007 as open**; what kept it alive was not a lack of knowledge but a lack of
machinery.

### <a id="lesson-55"></a>`lesson-55` — A file that is in the package and a file that can be loaded are two different measurements

**`ng add @pacit/components` — the first command a consumer types — blew up with `exports is not
defined in ES module scope`.** The cause: the package manifest carries `"type": "module"`
(ng-packagr adds it), while the schematics are compiled separately to CommonJS and land in the
package as `.js`. So Node reads them as ESM and falls over on `exports.ngAdd = …` on the file's
second line.

The defect stood in the released artifact and **no gate saw it, even though one asked about that
very file.** `check-package` checks point by point: the manifest has a `schematics` field, the
collection points at the `./ng-add/index` factory, the file `schematics/ng-add/index.js` is in
the package. All three answers were true. The question "can it be loaded" was never asked,
because a static gate has no way to ask it — `require()` of that file needs the package
**installed**, with its own module boundary, not a `dist` directory read from the side.

Measured: removing `schematics/package.json` (`{ "type": "commonjs" }`) from the package fires
`check-consumer` on the rule `ng-add/schematic-failed` and does not move `check-package`.
`@angular/cdk` solves it the same way: `"type": "module"` at the root, a boundary of its own in
a subdirectory.

A practical rule: **for an artifact meant for distribution, a file's existence and its usability
are two different measurements and need two different gates.** The static one reads a directory
and answers "what is missing" cheaply; the one in use installs the package by name and answers
"what breaks" expensively. The first without the second looks like a complete set — and that is
its worst property, because `req-quality-package` declared coverage of a point where it had only
presence. This is [`lesson-36`](#lesson-36) one floor up: there a green build did not prove the
artifact could be used, here a green artifact gate does not prove that what is in it can be used.

### <a id="lesson-56"></a>`lesson-56` — A media query fires even in an engine that cannot do what it asks about

**Playwright's webkit reports `matchMedia('(forced-colors: active)').matches === true` and does
not replace a single author colour.** Measured with a probe on an element carrying none of the
library's rules: `<div style="background: rgb(1, 2, 3)">` comes out of chromium and firefox as
white from the user's palette, and out of webkit as `rgb(1, 2, 3)`. `forced-color-adjust` is not
even a known property there — `getComputedStyle` returns `undefined` for it, while the other two
engines give `auto`.

The consequence is worse than a red run. Of the six tests in `forced-colors.spec.ts`, **four
pass** on webkit — the ones comparing a value measured in the component with `Highlight` or
`Field` read from the same browser. Webkit resolves the system palette keywords correctly and
applies rules from inside `@media (forced-colors: active)`, so an explicitly declared
`outline-color: Highlight` lands where it should. What does not work is the **automatic
replacement**, i.e. exactly the half of the contract that is invisible in a stylesheet. The tests
asking about it measure colours from the tokens and report success.

This incidentally hit a specificity defect the other two engines **cannot show**:
`:host([disabled]:not([data-pct-loading]))` in the base rule has (0,3,0), while
`:host([disabled])` inside the forced-colors block has (0,2,0). A media query adds no
specificity, so `color: GrayText` loses to the token. In chromium and firefox this is never
visible, because the browser paints over the result anyway; it becomes visible exactly where it
does not. So the declaration in the library is dead — today with no symptom, and with one from
the day it falls under `forced-color-adjust: none`.

A practical rule, in the [`lesson-48`](#lesson-48) family: **asking about a condition and being
able to satisfy it are two different questions, and emulation answers only the first.** Before
a test rests on a browser mode, measure whether THAT browser implements the mode — on a probe
with no code of your own, because your own code can answer instead of the engine. And measure it
**on every run**, not once: it is a statement about a package version, not about the repository,
so it will stop holding after a change that touches not one file here (hence point 6 of
`check-browsers`).

### <a id="lesson-57"></a>`lesson-57` — Coverage measures execution, not checking: 96.62% of lines is 63.54% of mutants

**The library's core had 96.62% line coverage and 183 green tests. On the first mutation run they
noticed 63.54% of the introduced defects.** In other words: every third change of behaviour in
`core`, `[pctNumber]` and `PctSelect` passed CI green. The difference is not a measurement error —
these are two different quantities. Coverage answers "did this line execute", and a line executed
**without a single assertion on its effect** counts there exactly like a checked one.

The distribution of surviving mutants says where it sits, and none of these things is exotic:

- **44 mutants with no covering test at all** — at 96.62% coverage. Code executed "in passing"
  (a constructor, an effect, a `default` branch) is covered and unmeasured;
- **condition boundaries**: `match >= 0` changed to `> 0` survives every test in which the hit
  does not fall on index zero. The test "typeahead activates the matching option" existed and
  checked option number 1;
- **inputs' default values**: every test passing `[readonly]="readonly()"` measures its own
  binding, not the default. A control with not one binding was never rendered — and that is the
  first thing a consumer writes;
- **tests that do not do what their name promises**: `PageUp/PageDown jumps tenfold` pressed only
  PageUp. The entire PageDown branch was uncovered and nobody saw it, because the test's name
  reads like coverage.

The most interesting part is that **public API with no spec of its own looks tested.** The
`pctFieldMessages` and `pctDescribedBy` functions from `@pacit/components/core` had not one test
under their own name — they were measured by the controls' specs, and on one path each. Line
coverage showed them as 100% covered, because every line executed while rendering the select.
A separate `core.spec.ts` with fifteen tests raised that entrypoint's score from 76.79% to
98.21%.

A practical rule: **a coverage threshold is a gate on whether the tests touch the code; a mutation
score is a gate on whether they check anything.** The first without the second is what
[`lesson-33`](#lesson-33) warns against: a number that grows from writing tests rather than from
writing assertions. Closing the difference from 63.54% to 81.77% cost 38 new tests — and each of
them came into being because a mutant pointed at a specific line, not because somebody thought of
it.

### <a id="lesson-58"></a>`lesson-58` — A gate that can fire and a gate that will fire are two different states — Stryker starts in the second

**`thresholds.break` is `null` by default in Stryker, and that means "never break".** A run
scoring 4% ends with exit code 0 exactly like a run scoring 94%; the only difference is the
colour of the number in the report. So a tool that measures defects is, out of the box, **a report
to look at** rather than a gate — and it looks identical to a gate in CI, because the step is
green.

This is the same family as [`lesson-39`](#lesson-39) (a visual threshold scaling with the card's
size) and [`lesson-53`](#lesson-53) (the second, unmeasured `toHaveScreenshot` threshold), but one
degree sharper: there the default was too loose, here it **switches enforcement off entirely**.
The conclusion generalises to every quality tool wired into a pipeline: the first question is not
"what does it measure" but **"what does it do with a result nobody configured"**.

The second question is more interesting, because it concerns the day after. Once the threshold is
in place, it is raised by five moves, none of which adds a single test and each of which looks
like tidying up in review:

- a file struck from `mutate` — it takes its surviving mutants with it, so **the percentage
  rises**;
- `ignorers` widened or `// Stryker disable` added to the source — the mutants vanish from the
  denominator, and the configuration keeps no trace of it;
- `mutator.excludedMutations` with a whole family of mutations;
- `ignoreStatic: true` — field initialisers and module scope drop out, i.e. in a component
  library its public contract;
- a shortened `timeoutMS` — **a mutant killed by the clock counts towards the score like one
  killed by an assertion**, so a shorter limit buys percentage with run time.

Hence the shape of `check-mutation`: the gate does not read `stryker.config.json` but the `config`
field from the **run's report**, i.e. the effective configuration — a flag added to the target's
command leaves not one line in the file. That is the same move as "do not read `include`, run the
compiler" from [`lesson-47`](#lesson-47), carried from a compiler to a measuring tool.

Separately, and this is a conclusion for every measurement with a threshold: **an aggregate
threshold alone says nothing about a file that dropped twenty points, as long as the rest makes
up for it.** So next to the hard floor stands a per-file snapshot with a **two-sided** tolerance —
downwards, because that is what a removed assertion looks like, upwards, because a floor standing
ten points below the measurement stops measuring. The price is written down outright: every
improvement in the tests requires rewriting the snapshot, i.e. a line in the diff that is visible
in review. That is the price you pay for the number to mean something.

### <a id="lesson-59"></a>`lesson-59` — A task flaky under `nx affected` points at a shared directory, not at a time limit

**The `mutation` target passed every time on its own and fell over when run alongside the rest.**
The first suspect was the mutant time limit: Stryker computes it relative to the dry-run time, so
under load a live mutant can become a timeout. The hypothesis was convenient, it fitted the
symptom and **it was false**.

The real reason showed only in a recorded run: `ENOENT: no such file or directory, copyfile
'tmp/libs/components/build/tsconfig.generated.<uuid>.json'`. Stryker copies the repository into
a sandbox and walks it **itself** rather than walking the git index — it saw 3907 files where git
knows 707. The excess is generated directories (`tmp`, `dist`, `.nx`, `.angular`, `coverage`), and
those have **concurrent writers**: `nx affected` runs `build` alongside, ng-packagr creates and
deletes its temporary tsconfig, and the file disappears between being listed and being copied.
A race, not performance.

A practical rule, in the [`lesson-51`](#lesson-51) family ("the first suspect was the cache and it
was a false trail"): **with a task flaky under parallelism, ask first which DIRECTORY the task
reads or copies, not how long it takes.** A tool that makes a copy of the project tree is
sensitive to everybody writing in that tree — and the remedy is narrowing what it copies
(`ignorePatterns`), not raising limits. The symptom "passes solo, fails in a batch" is common to
both causes and does not settle anything by itself; what settles it is the recorded message.

**It bit a second time, on a different failure and the same sentence.** Two agent directories
held symlinks to a tree in a third, and `copyFile` on a link to a directory is `EISDIR`: the run
ended before the first mutant, and the crash sat behind a cache hit until an unrelated new source
file finally missed. What makes it worth adding here is what did NOT fix it — the trees were
taken out of the git index, and the mutation run went on crashing on exactly the same path,
because **the tool copies the working tree and git tracking is not a property of the disk**.
The remedy was `ignorePatterns` again, and the general form of the rule is one question to ask
of any tool that reads a project: _which repository is it reading — the index or the directory?_
Reach and language answer to the first, Stryker to the second, and a fix aimed at the wrong one
looks like a fix right up to the run.

---

### <a id="lesson-60"></a>`lesson-60` — A scan is only as wide as its word list, and a hand-written list is narrower than its author thinks

**The language scan that reported four layers clean was measuring diacritics; the one that
replaced it was measuring a list of Polish function words I wrote by hand — and it counted 32
files where a dictionary counts 94.** Both limbs were honest about what they compared and
neither was honest about what that left out. A function-word list catches PROSE, because
function words stand in sentences. It cannot catch a single identifier — a local, a constant,
a camelCase name — because an identifier carries no function words by construction, and
identifiers had already been ruled to move with everything else.

The fix cost nothing: `/usr/share/dict/polish` folded of its diacritics, minus
`/usr/share/dict/american-english`, over identifiers split at camelCase. **The design work is
where the plan said it would be — the false positives** — but they are enumerable and boring:
acronyms of two or three letters, the abbreviations of the trade (`repo`, `config`, `dom`,
`proc`), and the words that belong to both languages at once (`test`, `role`, `data`, `rate`).
A register of about a hundred entries turns a 61 MB dictionary into an instrument with no false
negatives worth the name.

**The register wrote the next blind spot itself.** Two entries on that list — `SCREAMING_CASE`
and abbreviations shorter than four letters — are not false positives at all, they are whole
grammatical classes, and every constant and short parameter in the gates sat inside them:
eleven files still carrying Polish names after two passes had reported those
files clean. An exclusion by SHAPE excuses everything of that shape; an exclusion has to name
the word, never the form it is written in.

The rule generalises past language: **when a measurement's denominator is a list somebody typed,
the measurement's ceiling is that person's recall, not the thing being measured.** Ask what
generates the list before trusting what it reports — [`lesson-48`](#lesson-48) asks the same
question about an empty denominator, and this is its other half: a denominator that is non-empty
and still too small says nothing about it, because a scan that finds Polish in 32 files looks
exactly like a scan that finds Polish in 32 files.

---

### <a id="lesson-61"></a>`lesson-61` — A copy carries its citations with it, so "is this file mentioned?" cannot see a dead tree

**`.github/skills/` was 17 files byte-identical to `.opencode/skills/`, and the obvious
measurement — does any other file in the repository mention this one — called every one of them
alive.** Of course it did: a skill's `SKILL.md` points at its own `references/VITE.md`, and the
copy points at the copy's. The citations were duplicated along with the files, so the tree
answered for itself. Nothing outside it had pointed at either directory for months.

The measurement that works asks a different question: **not "who mentions this file" but "what
gets there from a root"** — from the files a tool opens by its own convention, following what
each reached file names. A dead island then falls out on the first pass, because nobody enters
it. Ten lines separate the two questions in the implementation and everything separates them in
what they can see: the first is a relation between files, the second is a walk, and only a walk
can tell a subgraph nothing points into from one everything points into.

**The second finding sits one floor down, in what counts as a mention.** With the walk in
place, the same 19 files came back alive, granted by `**/*.md` in the header of an unrelated
gate — a pattern in a cache declaration saying "prose is checked everywhere". A pattern like
that names a KIND of file, not a file: read as a mention it reaches the whole repository from
one line, which is a gate that passes everything while looking exactly like a gate. The rule
that survived measurement: **a pattern names files only inside the directory it names** — a
segment before the first wildcard, or it names nobody. The same instinct that makes
[`lesson-60`](#lesson-60) forbid an exclusion by shape: `libs/tokens/src/**/*.json` points at
files somebody chose, `**/*.md` points at a category, and a category granted anything grants
everything of that category, including what arrived after the sentence was written.

Both halves are one shape — **a measurement that reads a repository has to be told where it
starts.** Roots, and only then edges.

---

### <a id="lesson-62"></a>`lesson-62` — A condition in a template is measured by nobody

Extracting the list walk into `core` uncovered a guard nothing had ever run:
`(mouseenter)="option.disabled ? null : activateAt(i)"` in `select.html` — the rule that hovering a
disabled option must not highlight it. **Deliberate regression: the guard was removed and the whole
suite of 213 cases stayed green.**

The guard sat inside two measurements and neither could see it:

- **the mutation run does not reach it.** `mutate` in `stryker.config.json` names `.ts` files,
  so a condition written in a template produces **no mutants at all** — not a surviving one,
  which the snapshot would show, but none, which looks exactly like code that has nothing to
  break,
- **the coverage gate does not read the column that saw it.** `select.html` measured
  **100% of lines and 85.71% of branches**; `tools/check-coverage.mjs` reads
  `total.lines.pct` and the threshold in `project.json` is `lines: 80`. The untested arm of
  the condition was visible the whole time, in a number no gate looks at. Two DOM cases took
  the branches to 100% and the removal of the guard to red.

The shape is the [axis](00-axis.md) one, one floor further out than
[`lesson-45`](#lesson-45): there the denominator was narrowed by a pattern, here it is
**the choice of metric** — lines answer "was this rendered", branches answer "was this
decided", and a template is where the difference lives, because a template is all decisions
and hardly any lines. Hence the rule: **logic put in a template leaves the tested part of the
library**, and the two answers to it are a branch floor on templates
([`req-quality-unit`](requirements/quality.md#req-quality-unit)) or the condition moved into
the class, where the mutation run reaches it. What
[decision 0013](decisions/0013-no-headless-split.md) recorded about the template↔class
contract — that it is unchecked — turns out to have a second half: the template side is not
merely unchecked by the compiler, it is outside the evidence base as well.

---

### <a id="lesson-63"></a>`lesson-63` — A gate whose input is not a file cannot be cached, and a cached one answers from before the change

The support gate ties a breaking change to an `ng update` migration, so its input is **git**:
the newest release tag, and the subjects of the commits after it. Every other gate here reads
files, and `inputs` in `project.json` is a list of file patterns — which means the honest
pattern list for this one is empty of the thing it actually measures.

The failure that follows is quiet and complete. **`git commit --amend` to add the `!` of a
breaking change touches no file at all.** The tree is byte-identical, so the hash Nx computed
before the amendment is still valid, so the run is served from cache — and the cached answer
was taken from a repository where the breaking change did not exist. The gate does not fail;
it does not run. Nothing in the output says which of the two happened.

`cache: false`, and the reasoning written next to it. That is a real cost and it is worth
naming rather than hiding: the target runs on every invocation, in CI and locally. It is
affordable here because the run is a handful of file reads and two `git` calls — the
calculation that matters is **the price of always running against the price of listing what
the gate reads and being wrong about it**, and for an input outside the filesystem the second
price is not a risk but a certainty.

The general shape: an input Nx cannot hash is an input Nx cannot invalidate on. Git history,
a clock, a network response, a dictionary outside the workspace
([`check-language` names that one out loud](../project.json)) — each of them turns a cached
target into a measurement with a timestamp nobody prints. Either the input comes into the
filesystem where the cache can see it, or the cache comes off.

---

### <a id="lesson-64"></a>`lesson-64` — The published manifest is not the manifest anybody wrote

`libs/components/package.json` declares **no `dependencies` at all**. The package published
from it declares one: `"tslib": "^2.3.0"`. Nobody in this repository typed either half of that
line — ng-packagr adds it while writing the packed manifest whenever the library declares no
tslib of its own, and it takes the range from **`@angular/compiler`'s** dependencies, so the
version a consumer installs is Angular's opinion arriving through a build step.

The dependency itself is defensible; the interesting part is where a gate would have looked.
A check of "the dependency list" written against the source manifest reads **zero runtime
dependencies** and is green — for a package that publishes one. The same asymmetry applies
one field over: the artefact carries `module`, `typings`, an `exports` map with entries the
source never had, and the compiler's version stamped into every declaration. **What the
consumer installs is a document written by two authors**, and only one of them is in the
repository.

This is [`lesson-17`](#lesson-17) in a second disguise — there the build succeeded while
dropping the tokens out of the package, here the build succeeds while adding a dependency to
it — and it is why point 7 of `check-package.mjs` reads `dist`, like every other point of
that gate. The general shape: **when a tool both builds an artefact and writes part of its
manifest, the manifest in the repository is a request, not a record.** Measure the thing that
gets published.

---

### <a id="lesson-65"></a>`lesson-65` — An audit of the rendered page measures the pages you wrote, not the component you shipped

The finding named one component: `<pct-select aria-label="Country">` puts the name on a host
that has no role, while `role="combobox"` sits on the trigger inside. The gate written for it
found **three** — `pct-checkbox` and `pct-radio` have the same shape, a role on an `<input>`
one level down and a host that carries none.

Two gates stood over that code and neither could see it. The axe audit reads the DOM of the
sandbox, and in the sandbox every checkbox is given a `label` — a page where the defect is
invisible by construction, because the defect is not "this control is unnamed" but "this
control cannot be named from outside". The per-component ARIA specs assert the relations that
exist; there is no test for a relation a consumer is unable to create. Both answer **is this
page correct**. Neither answers **can a consumer make this component correct**.

What hides it is that nothing goes wrong. Angular puts the consumer's `aria-label` on the
host exactly as asked, the attribute sits there in the inspector, and ARIA prohibits it on a
roleless element — so it is read by nobody, silently, in a spot that looks handled.
[`lesson-33`](#lesson-33) is the same family seen from the other side: there an attribute
disallowed for a role was a critical violation, here the element has no role for the
attribute to be allowed on.

The general shape: **a promise about the API surface has to be measured against the
component's own template, not against the pages that happen to use it.** A demo is a witness
for what it shows and for nothing else — and the configuration it never shows is exactly
where the promise fails.

---

### <a id="lesson-66"></a>`lesson-66` — When the only witness of a defect is somebody else's diagnostic, the cheap fix silences it

The finding was written as an either/or: the select's `@for` tracked by `option.value`, so
either track `$index`, or promise that values are unique and warn when they are not. The two
roads read as alternatives because they close the same finding. They do different work.

`track` decides which DOM node a row reuses. Uniqueness decides which option a value denotes.
Duplicated values were audible only because Angular says NG0955 about a track expression —
one standing inside a library, addressed to a reader who cannot reach it. Change the tracking
and that message goes, and with it the only thing that had ever mentioned the defect: the
later of two options that share a value still cannot be shown as selected, picking it still
displays the earlier one's label, and now nothing says so. The list would have gone from noisy
to quiet without getting any more correct.

The general shape: **ask what still fails after the fix.** When the answer is "the same thing,
without the message", the change has moved a defect from loud to silent — and it owes a
message of its own, from the component, in the words of its own API. The mirror image is
[`lesson-62`](#lesson-62), where the code nobody measured was quiet from the start; here the
quiet would have been something we did.

---

### <a id="lesson-67"></a>`lesson-67` — A comment in a template is shipped; a comment in TypeScript is not

The `@for` in the select got a seven-line comment saying why it tracks `$index`, and the size
gate fired: `./select` 30510 → 33178 B. The dev-mode report written in the same task accounts
for 588 B of that (measured by stripping the method out of the built FESM and bundling both).
The comment was most of the rest.

A library compiled in **partial mode carries its templates as strings** — `ɵɵngDeclareComponent`
holds the template source, and that source is what the size probe bundles. Prose written for a
maintainer therefore lands in the artefact and in the budget: the HTML comments of
`select.html` are 2928 B, and stripping them takes the probe's minified bundle from 33178 to
30262 B — around a tenth of the entrypoint. A TypeScript comment costs nothing at all; the
compiler drops it long before anything measures.

Hence the reason for a decision belongs beside the code that implements it, and a template keeps a
pointer at most. And a second thing, worth knowing before the number is read as a consumer's bill:
the probe bundles the FESM with esbuild and **does not run Angular's linker**, while a real
application does — the linker compiles the template into instructions and the comments never reach
the app. The bytes are real in the package on npm; in the consumer's bundle they are not. That the
snapshot does not say so is a finding of its own.

---

### <a id="lesson-68"></a>`lesson-68` — A warning about a second one needs to be told when the first one left

The chrome of a field kept its control in a signal and `attach` simply overwrote it, so two
controls inside one `pct-field` ended with the later one taking the label, the hint and the
error ids, and the earlier one looking exactly as it should while being unlabelled and
undescribed. The finding said what to do about it: a `console.warn` under `isDevMode()` when
`attach` arrives at a chrome that already has a control.

Written that way it reports the wrong thing. A control inside an `@if` is destroyed and built
again, and the second construction calls `attach` exactly like a second control would — the
message would fire on a page that is entirely correct, which is how a warning teaches people
to ignore warnings. Nothing in the contract distinguished the two, because the contract had
only the half that speaks: **there was no `detach`.**

So the pair came first and the message second (`pctAttachToField` books both from the
control's `DestroyRef`). The pair also closed something the finding had not named: the chrome
went on reading the state of a destroyed control, because a signal outlives the component that
owns it and answers with the last value it held — the error of a control removed from the DOM
stayed lit under the field. Measured: with `detach` made a no-op, the swap case and the
departure case both fail.

The general shape: **before writing a warning about "one too many", check that something tells
you when one goes away.** A life-cycle event that only fires on the way in cannot tell a
duplicate from a replacement, and a rule built on it reports normal life as a defect —
[`lesson-60`](#lesson-60) one floor over, where the noise was a word list rather than a
life cycle.

---

### <a id="lesson-69"></a>`lesson-69` — A rule that fires on the way to something else is not the rule you think you have

The token gate had a point that reads the stylesheets: every colour the library really paints
must stand in the contrast policy. Among its branches is "this name is not a token of the
skin — there is nothing to measure", so a misspelt token appeared to be covered.

Measured both ways in one stylesheet: `background: var(--pct-button-bgg)` fires, and
`min-height: var(--pct-button-heigth)` passes every gate in the repository. The second is the
likelier typo of the two — a stylesheet reads more dimensions than colours — and its symptom
is nothing at all. CSS has no undefined variable to report: the declaration is dropped, the
element keeps whatever the cascade gave it, and the screenshot changes only if that particular
property happened to be visible in that particular state.

What hid it is that the branch was a **precondition**, not a rule. The point's subject is
contrast, and it asks about a name only far enough to know whether a colour can be judged.
Where no colour is judged, the question is never asked — and the summary line, "74 colours
painted across 7 stylesheets", reports a number about colours while a reader takes it for a
promise about tokens.

The general shape: **when a gate catches a defect as a precondition of a different question,
ask what happens to that defect where the question is not asked.** The answer here was a
point of its own (NAMES), and it cost less than the artefact whose whole argument had been
that it would have caught the same typo
([0018](decisions/0018-no-sass-entry-point.md)).

---

### <a id="lesson-70"></a>`lesson-70` — A media query adds no specificity, and the browser it is written for hides that

`@media (forced-colors: active)` says **when** a rule applies, never **how strongly**. A rule
inside it beats the base sheet by its own selector alone — so `:host([disabled])` in the block
loses to `:host([disabled]:not([data-pct-loading]))` outside it, and `color: GrayText` paints
nothing. The sheet looks like it handles the mode; the button carries the theme's disabled
colour into a palette that was meant to replace it.

What kept it out of sight for six stylesheets is the mode itself. Chromium and firefox
**substitute** colours in forced-colors mode: whichever rule won, what reaches the screen is a
system colour, so the screenshot, the axe audit and every e2e assertion come out the same. The
one engine that would show the difference is webkit, which does not substitute
([`lesson-56`](#lesson-56)) — and `forced-colors.spec.ts` is excluded there **by policy**, on
the sound ground that the engine does not have the mode at all
([`req-quality-browsers`](requirements/quality.md#req-quality-browsers)). So the defect had no
runner anywhere: not one browser in the matrix could have shown it, and it would show in all
of them from the day any part of the library takes `forced-color-adjust: none`. The static
gate here is not the cheaper instrument, it is the only one.

Five sheets carried it. In two the declaration really was dead (the disabled checkbox and
radio kept a theme surface, an active option in the panel a theme background). In three the
result was **right for the wrong reason**: a bare field draws no surface and no ring, a
trigger inside the chrome no ring of its own — the base rules said so, and the mode's block
never did. Both are the same defect, and the second kind is the one that turns into the first
the moment somebody reorders a sheet.

The rule generalises without a register of any kind, because both rules stand in one file:
**point 7 of `check-styles`** compares each declaration of the mode with the base rules whose
elements it claims, and asks who wins. It is decided on sass's output, that is, on the text a
browser really parses, and only where one selector's match set is contained in the other's —
a "don't know" costs an unexamined pair, a wrong "yes" would cost a false accusation. A block
that spells the more specific state out itself (`[data-pct-selected] { background: SelectedItem }`
beside the general `background: Canvas`) is not a hole and is not reported.

---

### <a id="lesson-71"></a>`lesson-71` — Four coverage metrics, and each was blind to what another one caught

A guard living in a template is in no measurement this repository had. `check-coverage` read
`total.lines.pct`, Stryker mutates `.ts` only — so an `@if` in a template was a promise with
no machine behind it. The fix looked like one line of configuration (a branch floor), and the
measurement that had to come first said something else entirely.

Three templates, one run, four metrics:

- **`field.html`** — the false arms of two `@if`s had never been rendered: no field without a
  label, none with an add-on and no label. **Branches 84.61%** (11/13) and **lines 100%**. An
  arm not taken writes no line; it only fails to.
- **`radio-group.html`** — the standalone hint block had never been created: 3 lines and 4
  statements dead, **lines 82.35%** — and **branches 100%** (8/8). The `@if (hint() && !inField)`
  came back from v8 with two arms at the same source position and the same count, 49 and 49.
  The metric said "both taken" about a block created zero times.
- **`select.html`** — `(overlayOutsideClick)` is never called in a unit test: **functions
  85.71%**, **statements 98.36%**, lines and branches **100%** both.

No single metric saw all three, and each of them was the only witness of one. A floor has to
stand on all four, per template — which is exactly what the build configuration cannot
express: the executor's `coverageThresholds` is four numbers and a `perFile` flag with
`additionalProperties: false`, so a floor for one glob has no place to be written. It lives in
the gate (`check-coverage` point 6) or nowhere.

The whole-report number cannot stand in for it. The templates are 136 of 694 lines and 47 of
535 branches: `select.html` could go entirely unrendered and the line total would still read
93.37%, thirteen points above the floor. The two defects above read 84.61% and 82.35% — both
comfortably above the 80% the whole library is held to. Hence 100% per template, and what a
template cannot reach is a matter for an **exception with a reason and both sides**: the
select's listener is guarded by an e2e in three engines, and were somebody to write the unit
test after all, the exception fires as stale rather than quietly covering the next defect.

One more thing the same run made plain: a declared threshold is not inherited. `lines: 80`
alone left every branch in the library — 535 of them — under no floor at all, while the log
said the threshold was met.

---

### <a id="lesson-72"></a>`lesson-72` — A content query sees the option before its inputs are bound

`contentChildren(PCT_RADIO_OPTION)` plus an `effect()` reading `option.value()` is the obvious
way for a group to see what its options carry. It works — for options written out in the
template. For options produced by `@for` it throws **NG0950: Input "value" is required but no
value is available yet**: a query is populated when the components are created, and a component
created inside an embedded view has its inputs bound later in the same pass.

The measurement is the whole lesson: with a plain `effect()` **five of the six cases passed and
the `@for` one failed** — everything except the case the feature exists for. A duplicated value
is rarely typed by hand; it arrives with the second list, the one from the server. A spec whose
hosts were all static would have shipped this green, and the first consumer to build options
from data would have got an exception from a diagnostic.

The read that is late enough is `afterRenderEffect`: by the render phase every component created
in that pass has its inputs. A `try`/`catch` would also work, and soundly — in `createInputSignal`
the `producerAccessed(node)` call runs BEFORE the throw, so the effect records the dependency and
re-runs the moment the input arrives — but it catches a framework error to discover a condition
instead of stating it. The price of preferring the statement was measured: **14 B** on `./radio`
(20574 against 20560).

---

### <a id="lesson-73"></a>`lesson-73` — A partially compiled package is not what an application carries

The size budget bundled the published FESM with esbuild and called the result "the contribution
of this library" to an application. It was the contribution of the **tarball**. Between the two
stands a step every consumer's builder takes and the probe did not: Angular's linker, which
turns `ɵɵngDeclareComponent` — where the template still travels as the string it was written
as — into instructions.

The finding this was written from said the number therefore **overstates** the real cost by the
size of the template source. The measurement says something else: linking alone moved `./field`
by **−1850 B** and `./checkbox` by **+823 B**. A template compiles into more than it was written
as or into less, depending on how much of it was structure and how much was prose — so the
unlinked figure is not an inflated version of the right number, it is a **different quantity**,
and it errs in both directions at about the width of the ±5% budget itself.

The bigger half was nowhere in the finding. Partial compilation emits `ɵɵngDeclareClassMetadata`
carrying the **whole decorator argument a second time**, template and styles included, and the
compiler puts a `debugName` on every signal input. Both are dev-mode only, and both are dropped
by a production build — but the drop needs BOTH steps: the metadata call in the package is
unguarded, and it is the linker that wraps it in `ngDevMode`, which `define` then folds. Either
step alone is worth under 200 B on `./button`; together they take it from **8116 to 4481**, and
`./field` from 39294 to 22316. The library's whole recorded weight fell from 121354 B to 72999 B
without one line of component code changing.

Two things are worth keeping from how it was verified. The claim "a production build drops this"
was not read off documentation but off a real `@angular/build` bundle: no `ngDeclareComponent`,
no `setClassMetadata`, no `setClassDebugInfo`. And the honest denominator was cheap — running
babel over the sources with **no plugin at all** moved every entrypoint by exactly **0 B**, which
is what makes "the linker did this" a measurement rather than an attribution.

---

### <a id="lesson-74"></a>`lesson-74` — The obvious denominator for "used" would have deleted a live axis

A gate point written to find dead primitives has one interesting decision in it, and it is not
the comparison — it is what counts as a **reader**. The obvious answer is a reference: a
primitive is used when a token points at it, which is exactly what the tier model is about.

Run that way against this repository, the rule names three tokens:
`--pct-motion-transition-duration`, `--pct-motion-transition-easing` and
`--pct-motion-loop-duration`. That is the entire motion axis, and it is as alive as anything in
the skin — every transition and the spinner run on it. It has **no reader among the tokens**
because it has no tier above it: motion has no semantic layer, and no component token points at
it either, since a duration is not a lever a theme author reaches for
([0008](decisions/0008-motion-axis.md)). Its readers are the stylesheets, which write
`var(--pct-motion-transition-duration)` directly.

Two things are worth keeping. The first is that the rule needed the second half — a stylesheet
read counts as much as a reference — and the reference input of the negative control had to
grow a `transition` line to carry that shape, or the reference itself would have held a dead
primitive.

The second is what the gate would have done had nobody noticed, and it was run rather than
guessed. Point 9 advises deleting the three tokens; deleting them takes **three more runs of
the same gate**, each with advice of its own:

1. point 4 — `primitives.axes: motion` is now a declared word no token uses, so drop it from
   the dictionary,
2. point 5 — three names have left the skin, so `node tools/check-tokens.mjs --write`,
3. point 8 — `--pct-motion-transition-duration: read in
libs/components/button/src/button.scss and absent from the skin`, three times over.

One gate, four points, and the last one forbids what the first advised — with two accepting
steps in between, one of which is a `--write`, so the wrong move arrives in review looking
recorded. A measurement contradicting a neighbouring one is not a tie to be broken by
whichever ran first: it says the newer one has the wrong denominator.

---

### <a id="lesson-75"></a>`lesson-75` — Eleven of twenty rows were wrong in the list a hand had just fixed

The decisions index was corrected by hand two tasks earlier: 0018 and 0019 were missing, both
were added, and the file looked right afterwards. It was not. The first run of a renderer over
`docs/decisions/` disagreed with **eleven of the twenty rows** — five titles paraphrased away
from the heading they quote, six `implements` lists naming the first requirement of a decision
that carries three or four. Nothing about the file said so. A shortened title reads like a
title, and a list of one requirement reads like a list of requirements; the only way to see
either is to open the twenty files and compare, which is what a hand-kept index quietly asks of
every reader.

The by-hand fix had done what a person does: it looked for what was **absent**. Absence is the
one kind of drift a reader can spot without the source, and it is the smaller half — the two
missing rows were fixed and the eleven wrong ones were read straight past, in the same file, in
the same sitting.

Then the same rule, written and pointed at the rest of the repository, found more of it before
anybody had looked: `tarball-without-licence` was a case in `check-consumer.fixtures` that its
own table did not name, and the map on the first page of the documentation counted 17 decisions
against 21 and 63 lessons against 74. Three hand-kept lists, three kinds of drift, none of them
visible in review of the diffs that caused them — because every one of those diffs was correct
in the file it touched. The drift is always in **the other** file, the one the commit did not
open.

What the measurement did not settle is which of the two roads each list takes; that needed a
question, not a run — is every column derivable? — and the answer differs per file
([0021](decisions/0021-an-index-is-derived-or-measured.md)). One thing it did settle: a table
of cases cannot be held to completeness unless it says it is complete. `check-reach.fixtures`
tabulates "the three cases the design rests on" out of seventeen, deliberately, and a gate
counting rows cannot tell that from a list that has lost fourteen.

---

### <a id="lesson-76"></a>`lesson-76` — Both modes were tested; that the two disagree belonged to neither test

`req-api-no-wrapper` promises the wrapper is optional, and its gate does what the promise says:
`field-controls.spec.ts` tests every control **inside** `pct-field` and the checkbox **outside**
it. Ten green cases. What none of them asked is whether the two modes give the **same** answer —
and for the message line they did not: `pct-select` inside the chrome showed the error alone, the
same `pct-select` on its own showed the hint and the error together and named both in
`aria-describedby`. Three of the four components that draw messages diverged, in a state no page
had ever rendered, with every test of both modes passing.

A per-mode suite has no place where the modes meet. Each half asserts what its own template does,
and the difference between the halves is nobody's assertion — which is why the discovery came from a
template read while the message line was being settled, and not from a run: the code was correct in
every file it was written in.

The measurement then took the finding's premise with it. The finding named the radio group and
offered an argument for it — a group's message describes a **set** rather than a control, so
maybe it earns a second line. The run over all four showed the checkbox and the select doing the
same thing, and neither is a set. What the two shapes divide is the chrome against a control's
own footer, and that is the defect rather than the design ([0022](decisions/0022-one-message-line.md)).

The gate that came out of it had to read the template's **conditional tree**, not its text: the
question "can these two be in the DOM at once?" is a question about which block excludes which,
and `@if (a) { … } @else if (b) { … }` differs from `@if (a) { … } @if (b) { … }` by two
characters that a pattern over the file cannot weigh. `parseTemplate` answers it, and the answer
covers a component nobody has written yet — which the unit spec, a hand-kept list of three, does
not.

---

### <a id="lesson-77"></a>`lesson-77` — Two dictionaries, and the word that belongs to neither

**A section header in `tools/check-texts.mjs` had been half translated: the comment around it was
English and the name of the language it scans was left standing in a Polish case.** It rode through
the whole of the language gate and every run after it — 843 files, 5570 distinct words, no exception
in the register, green each time. The gate that measures "the repository speaks one language" had
the word in its own denominator on every one of those runs.

The reason is arithmetic rather than oversight. The second limb confirms a word by finding it in
`/usr/share/dict/polish` and not in `american-english`; a foreign stem with a Polish ending is in
**neither** list — the Polish one has no such stem, the English one no such tail — and the
diacritics limb has nothing to catch, because an ending like that carries none. **The union of
two word lists is not the union of two languages**, and what falls between them is exactly the
register a mixed repository actually writes in: the imported noun, declined.

The rule for it had to name a SHAPE — 37 endings — in a gate whose fifth point exists to forbid
naming shapes. The two are not in conflict and the difference is worth keeping: **an excused
shape lets a whole grammatical class through, a hunted shape lets a whole grammatical class be
seen.** A register names words; a detector names forms. Measured over the whole index the limb
finds 16 words: four of the class and twelve that enumerate and are boring — an initialism with
a vowel after it, the debris the split leaves in a regular expression, an account name, a test
matcher — which is where [`lesson-60`](#lesson-60) said the design work would be, one limb over.

The failure direction is the other half. An unread English list makes the **second** limb flood
the run — every word the two languages share fires at once, and nobody can miss it. It makes the
**fourth** limb find no stem to hang an ending on, and report a clean repository. Same file
unread, opposite symptom: one gate goes red, the other goes quiet. That is what the fourth canary
of point 1 is for, and it generalises past this gate — **ask of every input not only what breaks
without it, but in which direction.**

And then the finding fell into itself. The plan's entry describing the class spelled four examples
of it, so the first run of the new limb was red on the position that had asked for the limb — the
same shape as the package README, which was nearly deleted by ticking off the very task that had
just written it. There is nowhere in this repository to quote such a word except the gate's own
tree, where the constant of [`lesson-60`](#lesson-60) already lives: this lesson cannot print its
own evidence, and the sample stands in `tools/check-language.fixtures/inflected-foreign-stem.json`.

---

### <a id="lesson-78"></a>`lesson-78` — A threshold decides two things and is argued about one

**The size point of `check-bundle` held every entrypoint to ±5% of its recorded number, and
`--write` rewrote the record only when a row left that band.** The band was argued as a failure
threshold — how big a jump has to be before somebody looks — and it was never argued as what it
also was: **the resolution of the record**. Anything smaller was not accepted, it was never
written down.

Measured on an unchanged tree, three of the seven rows stood 76 B above the truth. That is the price
of [0022](decisions/0022-one-message-line.md): it took a second message line out of `pct-checkbox`,
`pct-radio-group` and `pct-select`, and each of the three got 76 B smaller. The file was last
written one task earlier, and that change is the only commit since to have touched a component — so
the attribution needs no guess. A file whose own prose says each row is the size of a production
bundle was describing three bundles nobody had built since.

The other half is who pays. The first change to leave the band rewrites **every** row, so its diff
carries everybody's drift: the commit that gave the radio group its duplicate-value message rewrote
six rows, one of them its own. And the band is not narrow where it counts — ±5% of `./field` is 1115
B, so a component may grow by a kilobyte in steps with nothing anywhere to show for it.

The band's justification would be a measurement that wobbles, and this one does not. Measured
three ways: two runs of the same artifact are byte-identical, ~100 characters added to the probe
workspace's path change nothing, and ~100 added to the artifact's path change nothing either —
the two lengths that differ between a developer's machine and CI. `mutation.snapshot.md` next
door keeps its ±2 points and should: a mutant killed by the clock depends on what else the
machine was doing. Hence the rule in
[0023](decisions/0023-a-tolerance-is-for-a-wobbling-measurement.md): **a tolerance is for a
measurement that wobbles, not for a record somebody would rather not rewrite.**

The conclusion is wider than one gate. Wherever a threshold both decides a failure and triggers
the rewrite of the record it compares against, it silently sets **how much history that record
can lose**. Ask of a threshold not only what it lets pass, but what it stops writing down — and
which commit ends up carrying what it swallowed.

---

### <a id="lesson-79"></a>`lesson-79` — The message that names what moved is the message that stopped comparing the file

**Four files here are snapshots: a gate renders them whole — header, explanation, rows — and
compares them against what is on disk.** The finding that opened this said all four compare
their rows and nothing else. Two of them do not. `check-tokens` and `check-parts` compare the
rendering with the file in one `!==`, and their message carries a branch for exactly this case:
"the list of names is the same — the heading or the row order drifted". `check-bundle` and
`check-mutation` read the file through a map keyed by the row's first column, and everything
the same renderer writes around those rows — the header, the paragraphs saying what the number
means, the tolerance quoted from the policy — was compared by nobody.

What splits the four is not care, it is what their messages can say. A token name that vanished
needs no arithmetic: print the two lists and the difference is the message. A byte needs it —
"probe `./field` weighs 8123 B, the snapshot records 7323 B (+800 B, +10.9%)" can only be said
by a gate that has parsed the row into columns. And once the rows are parsed, **the parse
becomes the comparison**: the file around them leaves the measurement without anybody deciding
that it should. The better the diagnosis, the narrower the thing being diagnosed.

The repair is not one rule in both places, and that is
[0023](decisions/0023-a-tolerance-is-for-a-wobbling-measurement.md) read literally.
`check-bundle` compares the file whole, because its rows are already held to the byte in both
directions, so nothing in the file is allowed to move on its own. `check-mutation` cannot: that
score wobbles, ±2 points is the width of the wobble, and the columns beside the score wobble
with it — a mutant killed by the clock rather than by an assertion moves the timeout count with
the code unchanged. So its rule is everything that is **not** a row, which is also the honest
statement of what a tolerance covers: the numbers that move by themselves, and not the sentence
explaining what they mean.

Ask of a generated file not whether it is compared, but **which part of it is**. The part
nobody compares is the part that reads as measured, because the rows beside it are.

---

### <a id="lesson-80"></a>`lesson-80` — A shape may be named to see a class, never to stop seeing one

**The language gate holds two rules about shapes that look like opposites and are one.** The
register may name only words, because an excused shape lets a whole grammatical class through
— a layer of constants once rode two passes on exactly that
([`lesson-60`](#lesson-60)). The detector names nothing but shapes: endings, suffixes, a
quotation mark. Both were written down years apart, and the fifth limb put them in the same
place at once.

That limb reads a **Polish stem carrying a derivational suffix** — the class no dictionary
holds because the word list has the noun a word is made from, and the abstract noun made from
that one, and never got round to the agent noun made from either. Its first run over this
repository: 5715 distinct words, seven splits. One was the name a neighbouring gate had given
a function and no pass had ever seen; one was the fourth limb's own probe; **five were English
agent nouns** whose stem the Polish list happens to hold.

And those five share a property. The English verb behind each of them —
`locate`, `paginate`, `activate` — stands in `american-english`. Three lines in the detector
("quiet when the stem plus `ate` is a word") would have removed every false positive at once,
shortened the register by five entries and looked like tidying. It would have been an
**excused shape written where the rule against excused shapes cannot reach**: point 5 checks
the format of the policy, and nothing checks the format of the instrument. The register would
have got shorter and the gate would have acquired a silent hole in the shape of a grammatical
class.

So the direction is what decides, not the file. A shape may be named to make a class visible;
it may never be named to make one invisible, and moving it from the policy into the code
changes only who can review it. The five words are in the register, one by one, where the
`dead-word` rule will take them out the day they stop silencing anything.

There is a smaller one on top, and it happened **twice more while this was being written**:
the first draft of the entry excusing those five quoted their Polish-looking stems as evidence
and turned the policy file red, and the plan entry recording that quoted the fourth limb's
probe and turned the plan red — the new limb firing on the description of itself, as the
second limb had fired on the entry that first described this defect
([`lesson-77`](#lesson-77)). **The evidence for a rule about a language cannot be written in
the language the rule forbids.** The specimen goes into the gate's own tree, as a constant of
the instrument, and everything else points at it.

---

### <a id="lesson-81"></a>`lesson-81` — A gate reading modules cannot answer a question about bytes

**The first directive in `core` turned the tree-shaking gate red on a bundle that does not contain
it.** `PctOverlayPanel` went into `@pacit/components/core`, and point 4 of `check-bundle` reported
that the **primary** entrypoint now "brings in components" — the literal text of
`req-project-tree-shaking`, the promise a consumer pays nothing for what they did not import.

The measurement says otherwise. The primary probe, built the way the gate builds them and the
way a consumer's builder does, weighs **1003 B** and holds no `pctOverlayPanel` anywhere in
its text. What it does hold is the reason for the red: `@pacit/components` re-exports
`providePctConfig` **from `./core`**, so the primary pulls that entrypoint by construction —
and the gate's read was `pulled`, the bundler's metafile, which speaks of modules. A module
read cannot tell the provider it took from the directive it left behind, and until that day it
never had to: `./core` held functions and tokens alone, every other entrypoint held components
alone, and "pulled it" and "carries its components" were the same sentence.

That equivalence was the model, and one directive in a shared entrypoint ended it. The repair
is in the same place the promise is: the primary is now measured over its **own text**, the
marker being a selector, which survives minification and linking as data. The two other points
resting on the same equivalence moved with it — point 7's second direction gained an exemption
for a **mixed** entrypoint (components AND plain exports, computed from the artifact rather
than listed), and point 11 now compares the real builder's text read against the probe's text
read instead of against a set derived from modules.

The price is measured too, and it is not zero: `./core` 2248 → 3185 B, `./select`
19494 → 20072 B — and **+11 B on every other entrypoint, the primary included**, which is one
`,input as b` in an import statement that no longer has a user. A directive in a shared
entrypoint is imported by the module that no consumer of the plain half will ever instantiate,
and an unused named import from an external package survives the bundler.

The lesson: **a gate answers the question its read can see.** Point 4's sentence never changed;
what changed is that its read stopped meaning what the sentence says, and the day it did, the
gate reported a defect nobody could find in the bytes. When a rule is about what a consumer
carries, the honest read is the artifact's text — a module graph is an inference from it, and
an inference is only as good as the model behind it.

---

### <a id="lesson-82"></a>`lesson-82` — The wider event is not the safer guard

**A listbox panel that keeps focus on its trigger has to refuse a press, and the obvious refusal
takes a component's pointer with it.** The promise is the ARIA pattern's: focus stays on the
combobox, the active option is named by `aria-activedescendant` ([`lesson-18`](#lesson-18)).
The browser does not keep it — a press on the panel's own background moves focus to `body`,
measured the same way in blink, gecko and webkit — and everything the trigger owns goes quiet
with it, the arrows, Home and End, Enter and the typeahead, while the trigger goes on pointing
at an option from an element that no longer has focus. Only Escape survives, because the CDK
listens for it on the document.

The repair is one prevented default, and the only question was which event to prevent.
`pointerdown` is the modern one and covers mouse, pen and touch in a single listener, so it
looks like the safer choice. The measurement says otherwise, and it says three things:

- **touch never had the defect.** A tap inside the panel left the trigger focused in chromium
  and in webkit alike, with no guard installed at all — where the same press with a mouse blurs
  it. The default action that moves focus belongs
  to the mouse event, not to the pointer event above it;
- **preventing `pointerdown` cancels what follows it.** With the guard on `pointerdown`, a tap
  fired `pointerdown, click` in chromium and **`pointerdown` alone** in webkit — the
  compatibility events are the pointer event's default action, and webkit counts the `click`
  among them. A panel guarded that way cannot be tapped: the pick never arrives;
- **`mousedown` is exact.** Guarded there, focus stayed on the trigger in all three engines,
  the keyboard went on answering, the pick still arrived, and a scrollbar drag inside the panel
  still scrolled it — the same 17 px it scrolled unguarded.

The lesson generalises past this panel: **a guard should be as wide as the default action it is
cancelling, and no wider.** Reaching for the broader event buys coverage of a case that was
never broken and pays for it with the events the component needs — and the price is invisible
in the engine most people develop in, which is why it is a measurement in three and not a
reading of a specification.

There is a second half, one floor up. jsdom moves focus on no `mousedown` at all, so the unit
suite cannot tell the guarded panel from the unguarded one: it can assert that the event was
cancelled and nothing about what the cancellation is for. The promise itself is only readable
where focus is real, and the negative control says so outright — `pctFocusStays` taken off the
panel leaves every unit case green and all three browsers red. **A behaviour whose only witness
is the browser needs its test in the browser**, however cheap the unit test would have been.

---

### <a id="lesson-83"></a>`lesson-83` — The hiding was in a stylesheet nobody ships

**A live region has to be invisible, and the utility that would have hidden it is a promise about a
file this library never tells anybody to include.** The live announcer needed a hidden element in
the document body, and the obvious answer was CDK's `LiveAnnouncer`: `req-a11y-built-in` names it
outright, the mechanics are written, and [0013](decisions/0013-no-headless-split.md) buys the
machinery rather than rewriting it.

What it does with its element is one line: `classList.add('cdk-visually-hidden')`. The class is
defined in `@angular/cdk/a11y-prebuilt.css` — and the stylesheets this library asks a consumer
to load are `@angular/cdk/overlay-prebuilt.css` and its own `themes/pct.css`, in the README, in
the `ng add` schematic and in the sandbox alike. Measured on the sandbox, which loads exactly
those two, on the element CDK builds, with its two classes and its `aria-live`:

```
rect: 573 × 18 px      position: static      clip-path: none      overflow: visible
```

Every announcement painted across the bottom of the page, in the consumer's application, in the
one configuration the install instructions produce. `grep -c cdk-visually-hidden` over the
three prebuilt stylesheets says it plainly: two hits in `a11y-prebuilt.css`, zero in the
other two.

The repair is the size of the defect — the region carries its own declaration block, nine
properties in one `cssText`, 30 B of the built artifact measured against writing them one at a
time — and it is not the point. The point is the class of mistake: **a utility class is a
promise about a stylesheet, and a package that hands you DOM is handing you that promise too.**
Nothing in the type system, in the compiler or in this repository's gates would have caught it;
the element is created at runtime, from a service, with a class name that is a string. What
caught it is asking the browser how big the element is — the same question, in the same place,
as every other measurement here.

There is a second half, and it is about where such a defect can hide. This library had never
before created an element outside a template: every component tree is compiled, and its
stylesheet ships with it. A body-level node built by a service belongs to nobody's `styleUrl`,
so **whatever it needs, it needs to carry** — the appearance, the ARIA attributes, and the
removal when the injector that made it goes. That is why the same file also books its cleanup
on `DestroyRef` rather than trusting a page load to end.

---

### <a id="lesson-84"></a>`lesson-84` — A template's name and a template's context are two different checks, and no one shape gives both

**The compiler can see what a template is called or what it is handed, and which of the two depends
on how the consumer was asked to write it.** The slot directive had to choose the channel through
which a consumer supplies an `<ng-template>`, and the plan named two — `TemplateRef` passed as a
value, or a `*pctTemplate` directive. They are not two roads to one place. Four probes under
`strictTemplates`, each a deliberately wrong binding that either breaks the build or does not:

| what is written                                                  | wrong NAME | wrong CONTEXT READ          |
| ---------------------------------------------------------------- | ---------- | --------------------------- |
| `<ng-template pctWhatever>` — an attribute matching no directive | silent     | silent                      |
| `<ng-template #ref>` handed to an input                          | **NG8002** | silent (`TemplateRef<any>`) |
| a slot directive with `ngTemplateContextGuard` and no input      | silent     | silent — `T` is `any`       |
| the same directive with an input the context type depends on     | silent     | **TS2339 / TS2345**         |

Two things fall out of the table. The first: **an attribute is not a name the compiler reads.**
Not misspelt (`pctSelectOptoin`), not left out of `imports`, not in its structural form — every
one of them compiles, renders nothing and says nothing. The second: a context guard types
`let-option` only when the context type is fully known, and a directive with no input has no
inference site at all, so Angular's type-check block instantiates its generic as `any`. The
guard on its own is decoration.

So `*pctTemplate="'option'"` — the shape most libraries ship — is the one that gives up **both**
halves: the name lives inside a string, and one directive serving many names has nowhere to put
a context guard per name. What buys the context back is a directive per slot with a required
input that carries the type; what buys the name back is the compiler, one step earlier, since a
required input left unbound is `NG8008`.

The half that stays open is the misspelling, and the obvious repair for it is measured shut.
Have the component compare the `<ng-template>`s in its content against the slots that claimed
one: `contentChildren(TemplateRef)` really does see every template, claimed or not — `3/1` over
three of them. But it also sees things nobody wrote as a template. An `@if` in projected content
**is** a `TemplateRef`, and so is each block inside it: one template with the condition false,
two with it true, every anchor an identical `<!--container-->` with no parent to tell it apart.
The comparison therefore accuses a consumer who merely wrapped a correct slot in an `@if` —
[`lesson-68`](#lesson-68) again, a message that fires on a page that is right. The check that
survives is the other direction, and it is exact: a slot that matched, standing under a
component that does not offer it, reported by the slot itself through the element injector.

The rule: **a mechanism for passing templates has two checks to buy and they are bought
separately.** Ask which one a shape gives before choosing it, and say plainly which one it does
not — a channel that quietly gives neither looks exactly like a channel that gives both.

---

### <a id="lesson-85"></a>`lesson-85` — A registry of markup is a registry of components, and a name in a string is checked when the string is a value

**Angular has exactly one thing that carries markup somebody else wrote, and it cannot be handed to
a provider.** The icon work had to build the registry [0011](decisions/0011-icons.md) describes as
"a token mapping semantic names to templates", and the word _templates_ is where the design stops
being writable: a `TemplateRef` is a handle on part of a component's view, and a
`bootstrapApplication` provider array is not in a view. Four probes over the shapes the registry
could take:

| what the token carries                        | what it renders                                       | what it costs                                                   |
| --------------------------------------------- | ----------------------------------------------------- | --------------------------------------------------------------- |
| a **markup string** in `[innerHTML]`          | **nothing** — the sanitizer deletes the whole `<svg>` | works only through `bypassSecurityTrustHtml`, on consumer input |
| a **component type**, `NgComponentOutlet`     | the drawing inside the consumer's host element        | one element between the icon's box and the drawing              |
| a **`TemplateRef`**                           | correctly, in place                                   | cannot be built at bootstrap — there is no view to build it in  |
| a **component whose templates are the icons** | correctly, in place                                   | the library creates and destroys that component                 |

The first row is the shape most icon libraries ship, and it is the one that measures worst:
`<span [innerHTML]="'<svg …>…</svg>'">` renders `<span></span>`. Angular's HTML sanitizer
allows no SVG element at all, so the shape works only if the library calls
`bypassSecurityTrustHtml` on something the consumer supplied — a library-shaped XSS vector,
paid for a chevron.

The last row wins, and the two things that make it cheap were measured rather than assumed:
`createComponent()` in an environment injector gives a component whose `viewChild` template is
**readable immediately**, with no change detection and no attachment to `ApplicationRef`; and
the directives on the `<ng-template>`s inside it are **constructed as the view is created**,
two of two. One `detectChanges()` on the detached view is still needed, and only because the
name is an `input` — inputs are set on the first check, so the registration happens in
`ngOnInit`.

The second half of the lesson is about the name, and it is the exact counterweight to
[`lesson-84`](#lesson-84). That lesson's rule reads as "a name inside a string is invisible to
the compiler", and the truth is narrower: **`pctIcon="chevrn-down"` is `TS2820`, with the
right name suggested.** What differs is not the quoting but what the string _is_ — in
`*pctTemplate="'option'"` it picks a slot the compiler has no type for, here it is the
**value** of an input typed `PctIconName`, and a union type checks a string literal wherever
one is written: a static attribute, a bound literal, either arm of a conditional.

So: **ask what a registry can hold before designing what it holds, and prefer a name the type
system can read over a name a lookup can.**

---

### <a id="lesson-86"></a>`lesson-86` — A shared kernel is where a cost stops being visible

The plan puts icons in `core`, with the rest of the behaviour layer, and they went there first. The
size snapshot, rewritten before anything else was touched:

| entrypoint   | before | icons in `./core` | icons in `./icon` |
| ------------ | -----: | ----------------: | ----------------: |
| `.`          |   1990 |          **2744** |              1990 |
| `./button`   |   5479 |          **6233** |              5479 |
| `./radio`    |  13811 |         **14575** |             13811 |
| `./field`    |  23323 |         **24089** |             23323 |
| `./checkbox` |  11429 |             13271 |             13354 |
| `./select`   |  23450 |             25252 |             25336 |
| `./icon`     |      — |                 — |              2552 |

**754 B and a new external dependency on every entrypoint** — `@angular/common`, for a
`NgTemplateOutlet` a button never renders. (The middle column was measured before a clean-up
of the same file worth some 80 B, so the two placements are comparable to about that; what the
table is about is which rows move at all.) Nothing in the library imported the icon
component there; `./core`'s barrel re-exports it, every entrypoint imports `./core`, and a
component is not tree-shaken out of that graph the way a plain function is. In its own
entrypoint the same code costs the two components that draw icons about 2 kB each and
everybody else **nothing, to the byte** — the four unchanged rows are the measurement, not an
argument.

This is [`lesson-81`](#lesson-81) one floor up. There, `./core`'s first directive turned the
tree-shaking gate red on a bundle containing no directive, and the repair was to the gate's
reading. Here the gate was right and the placement was wrong: a shared kernel is precisely the
place where "it is only a few hundred bytes" is said about every consumer at once, and where
nobody importing `@pacit/components/button` will ever see what they are paying for.

The rule: **before putting something in the kernel, measure what the kernel costs the
entrypoints that will never call it.** The plan's placement is a proposal; the snapshot is the
answer.

---

### <a id="lesson-87"></a>`lesson-87` — The dependency a library can require without depending on it

`req-api-animations` bans `@angular/animations`, and the natural reading of a banned package is
a name: in a manifest, in a policy, in an import. Four probes compiled with the package **not
installed in the workspace at all**, under `strictTemplates`:

| the component writes            | compiles | what the emitted file imports |
| ------------------------------- | -------- | ----------------------------- |
| `<div [@fade]="state">`         | yes      | `@angular/core`               |
| `<div (@fade.done)="onDone()">` | yes      | `@angular/core`               |
| `host: { '[@fade]': "'in'" }`   | yes      | `@angular/core`               |
| `<div [@.disabled]="true">`     | yes      | `@angular/core`               |

No error, no import, no dependency — the only trace is a name beginning with `@`:
`ɵɵproperty("@fade", …)` and `ɵɵsyntheticHostProperty("@fade", …)` in a full compilation, and in
the partial declarations ng-packagr ships, the template as a **string** and the host as an
object with `@`-prefixed keys.

What the consumer gets is not a missing dependency but a broken component, and it breaks
differently in each of their two builds. Angular's DOM renderer:

```js
setProperty(el, name, value) {
  (typeof ngDevMode === 'undefined' || ngDevMode) &&
    this.throwOnSyntheticProps && checkNoSyntheticProp(name, 'property');
  el[name] = value;
}
```

In their **dev** build that is NG5105 — `Unexpected synthetic property @fade found`, advising
them to add `provideAnimations()`, that is, to install the runtime this library refused to
declare. In their **production** build the guard is folded out and the line assigns a DOM
property called `@fade` to an element that has no such thing: nothing throws, nothing animates,
and no test anywhere says so.

The rule: **a ban on a dependency has to be measured on the shape that requires it, not only on
the name that declares it.** The one road here that leaves neither an import nor a manifest
entry is also the only one that reaches the consumer as a crash.

---

### <a id="lesson-88"></a>`lesson-88` — A gate's order is the repair it advises

The ban's first draft was written after the rules point 7 already had. With the ban removed
again, the same defect — an import of `@angular/animations` in the packed code — was walked
through the gate three times:

| the state of the package       | what fires    | what the message advises          |
| ------------------------------ | ------------- | --------------------------------- |
| imported, nothing declared     | `undeclared`  | declare it                        |
| + declared as a peer           | `not-allowed` | write the policy entry saying WHY |
| + a policy entry with a reason | **nothing**   | — (the run is green)              |

The third row is the gap `req-api-animations` had been describing since it was written, and the
first two are the reason it is worse than a hole: every message here is a **repair
instruction**, and read in order they are directions to the forbidden dependency, given by the
gate that forbids it, one green commit at a time. Placed last, the ban would then read as the
gate changing its mind on the third try.

The rule: **where one rule refuses and another asks for a justification, the refusal is
evaluated first.** A gate is not only a verdict — the order of its rules is the sequence of
repairs it teaches, and a repair that is forbidden must never be the one it teaches first.

---

### <a id="lesson-89"></a>`lesson-89` — The platform's modal is not composable with the library's overlays

`<dialog>` with `showModal()` answers most of what a modal needs, and it answers it better than
we could: measured in blink, gecko and webkit, it traps focus, honours `autofocus`, gives focus
back to the opener, makes the background refuse the pointer and `focus()`, and — the surprise —
**severs nothing** through the top layer. Custom properties, the typeface, the writing direction
and `closest('[data-theme]')` all resolve through it, and `::backdrop` inherits from the
originating element. The whole of `lesson-35` would simply not apply.

Then the same three engines were asked the one question that decides:

| what was outside the open modal                                 | hit test   | `focus()` | click | Tab   |
| --------------------------------------------------------------- | ---------- | --------- | ----- | ----- |
| a plain child of `body` — where the CDK overlay container lives | the dialog | refused   | never | never |
| `popover="manual"` + `showPopover()`, i.e. **the top layer**    | the dialog | refused   | never | never |

The second row is the one that matters: CDK v22 puts every overlay host in the top layer by
default (`usePopover`), and it makes no difference. Everything outside the topmost modal dialog
is inert, top layer included. So a `pct-select` inside a native `<dialog>` has a panel nobody can
click, focus or reach — in every engine.

Two smaller findings from the same session, worth keeping because they are protocol rather than
preference:

- `preventDefault()` on the **keydown** stops a native dialog closing; `stopPropagation()` does
  not. The close watcher is not propagation-based — which is exactly why a control that wants to
  keep Escape to itself must prevent the default rather than stop the bubble;
- `preventDefault()` on `cancel` holds for a few presses and then stops. Blink and gecko
  force-close on the fourth Escape, webkit never does. "Escape does not close this" is not a
  promise the platform lets a library keep.

The rule: **a platform feature is only "what the platform gives us" if it composes with what we
already ship.** `req-api-platform` is a preference for the browser's answer, not an obligation to
take it where taking it breaks a component that already exists — and the way to tell the two
apart is to measure the composition, not the feature.

---

### <a id="lesson-90"></a>`lesson-90` — What a modal must NOT silence

The first version of the `inert` walk was three lines and looked obviously right: every child of
`body` that does not contain the panel stops answering. Opening a dialog in the sandbox and
reading the DOM showed what those three lines had also taken:

```
APP-ROOT      inert
DIV aria-live="polite"      inert      <- the library's own channel
DIV aria-live="assertive"   inert      <- and the other one
DIV .cdk-overlay-container  live
```

Inert content is hidden from assistive technology, so a live region inside one is a sentence
nobody hears. The regions are children of `body` because that is where `PctAnnouncer` puts them
(0026), which means the one case the sandbox demonstrates — a select opened **inside** a dialog,
announcing that its list is empty — had lost its only voice, to a component that had never heard
of it.

No test would have caught it. The unit suite cannot see `inert` at all (jsdom implements
neither), the axe audit reads structure rather than announcements, and the sentence itself is
delivered by a screen reader nothing here runs. It was found by opening the page and looking at
`document.body.children`.

The rule: **`inert` on the background is not "everything except the modal" — it is "everything
except the modal and the channels that speak to the user".** And the narrower rule that follows
from writing it down: the test is `aria-live` on the child **itself**, never a search below it —
a region an application put inside its own root would otherwise keep the whole page answering,
which is the opposite of a modal.

---

### <a id="lesson-91"></a>`lesson-91` — The name of a control is often in another element

The tooltip reports in dev mode when it is set to _describe_ a control that has no name of its
own — the case where a screen reader announces the description and nothing else. The first
version of that check read the trigger: `aria-label`, `aria-labelledby`, `title`, its own text,
the `alt` of an image inside it. Every one of those is an attribute **on the element**.

Opening the sandbox printed a false alarm on the first page it ran on:

```
[pctTooltip] "Markdown is allowed here" describes a control that has no name of its own …
```

The control was an `<input pctText>` inside the field chrome — named by a `<label for>` sitting
in another part of the template entirely. The input carries **not one attribute** saying so, and
no amount of reading the element would have found it: the association is the document's, held by
the label and resolved by the browser.

The platform answers the question itself. `HTMLInputElement.labels` is the list, it is
implemented everywhere including jsdom, and reading it turned the check from a guess about
markup into a question put to the engine — the same road `:focus-visible` takes one method above
it, and the same rule as [`req-api-platform`](requirements/api.md#req-api-platform) one floor
down: **do not reimplement what the browser already computes.**

The wider point is about heuristics that report to a human. A false alarm is not a small defect
in one: it is the thing that teaches the reader to ignore the channel, and after that the true
alarms cost nothing either. A check that speaks in the console has to be measured on a real page
before it ships, exactly like a gate — this one was, and it fired on the second card.

---

### <a id="lesson-92"></a>`lesson-92` — A name that comes and goes is not a name

A tooltip's text can reach assistive technology two ways, and the choice looks like a matter of
taste until an audit is run over the closed state. Four buttons, one page, axe-core with the
WCAG 2.2 AA tags:

```
A  icon-only, named ONLY by a panel that is not attached      button-name  [critical]
D  icon-only, aria-labelledby -> an id that is not in the DOM button-name  [critical]
B  labelled, aria-describedby -> an id that is not in the DOM (nothing)
C  icon-only, aria-label="Approve"                            (nothing)
```

Two findings in one measurement. The **name** half is not a preference: a control whose name
lives in a panel is nameless for as long as nobody is pointing at it, and pointing at a dangling
id is exactly as nameless — a reference to nothing contributes nothing to the accessible name,
so the audit reports the same critical violation for both. The **description** half is the
opposite: a dangling `aria-describedby` produces not a word from the audit, because a
description is optional by construction and its absence is not a defect.

Hence the shape of `PctTooltip` and of
[0030](decisions/0030-a-name-is-an-attribute-a-description-is-a-reference.md): **the name is an
attribute written once and kept, the description is a reference held exactly as long as the
panel it points at.** The asymmetry is not symmetry avoided for convenience — it is what the two
relations mean.

What makes this a lesson rather than a note is the direction the measurement runs in. The
interesting state of a tooltip is not the open one everybody looks at; it is the closed one,
which is where a control spends its whole life. An audit that only ever sees panels open would
have said both roads were fine.

---

### <a id="lesson-93"></a>`lesson-93` — The outside press and the trigger's press are one event

A popover closes on a press outside its panel, and the trigger is outside its panel. Written the
obvious way — dismiss on the overlay's `outsidePointerEvents`, toggle on the trigger's `click` —
the one control that opens the panel becomes the one control that cannot shut it: the press
closes it and reopens it in the same gesture, and the panel looks as if it had ignored the user.

The order is not the one the names suggest. `OverlayOutsideClickDispatcher` binds to `body` with
`{ capture: true }` and fires on **`click`** (plus `auxclick` and `contextmenu`); the
`pointerdown` beside them only records where the press began, so that a selection dragged out of
a panel is not counted as a press outside it. A capture listener on `body` runs on the way
**down**, before the event has reached the trigger at all — so the dismissal is delivered first
and the toggle answers it afterwards. Reordering is not on the table: no handler on the target
can run before a capture-phase handler above it.

So the guard belongs to the component: **a press whose target is inside the trigger is not a
press outside the panel.** That gesture is the trigger's, and the toggle it runs _is_ the close.

The general form is worth keeping, because the next two components inherit it unchanged: **the
dismissal paths of a panel and the opening path of its control are one event, not two.** Any
panel here that closes on an outside press and is toggled from a control has to name the control
that press belongs to — otherwise the control works exactly once.

---

### <a id="lesson-94"></a>`lesson-94` — An effect that reads what it writes: one consumer pays a pass, two never finish

The popover's trigger registers itself with the panel it opens. The partner is a **required
input** (`[pctPopoverTrigger]="filters"`), so the registration cannot happen in the constructor
the way a field control's does — an input has no value there — and it went into an `effect`:

```ts
effect((onCleanup) => {
  const popover = this.popover();
  popover.bindTrigger(this.host.nativeElement); // reads `trigger()` inside, to warn on a second one
  onCleanup(() => popover.unbindTrigger(this.host.nativeElement));
});
```

`bindTrigger` reads the `trigger` signal — it has to, in order to tell a second trigger from the
same one built again — and then writes it. Reading a signal inside an effect makes the effect
depend on it, so the write invalidates the effect that performed it.

With **one** trigger the loop stops after a second pass: the value written is the value already
there, and a `signal.set` of an equal value notifies nobody. With **two** triggers it does not
stop at all. Each effect writes its own element, each write invalidates the other effect, and
the two go round for ever — which is not a stack overflow, an error or a warning, but a unit
run that simply never ends. It cost a fifteen-minute test suite that had passed an hour earlier,
and the symptom pointed nowhere near the cause.

`untracked` is the fix and it is not a tidy-up: the read is genuinely not a dependency — the
question "is somebody else already registered?" is asked _at the moment of registering_ and
never again.

The wider lesson is about a shape this repository already had and got right for another reason.
`pctFieldControl` registers in a **constructor** and unregisters through `DestroyRef`, because
the partner arrives by injection; nothing there is reactive, so nothing can loop. Moving the
same pattern to a partner that arrives as an **input** moves it into a reactive context, and the
pattern stops being safe without a word of warning. **A registration is not a computation, and
an effect is the wrong place for it unless every read inside is untracked.**

### <a id="lesson-95"></a>`lesson-95` — A host listener cannot stop a listener the template registered first

A menu item is a `<button>` a consumer binds their own `(click)` to. Marking one unavailable
therefore has two candidate spellings, and only one of them is a promise:

```html
<button pctMenuItem disabled (click)="destroy()">Delete</button>
```

Written with `aria-disabled="true"` — the spelling the APG prefers, because a disabled item
stays discoverable — the row **says** the command is unavailable and runs it anyway. The
directive's own `(click)` handler can decide not to act, but the consumer's handler is a second
listener on the same element, and stopping it would take `stopImmediatePropagation` from a
listener that runs **first**. It does not: Angular registers a template's own listeners during
the creation pass of the element and a directive's host listeners after them, so the consumer's
handler is always ahead of ours in the list. There is no ordering to arrange — the two are not
in a race, they are in a queue, and we are behind.

The platform's `disabled` has no such problem: a disabled `<button>` dispatches no `click` at
all, to anybody. So the item is declared as `button[pctMenuItem]` and binds the real property,
and the APG's discoverability argument is answered instead by the walk — a disabled row is
skipped rather than hidden, and it is still read out by a virtual cursor going over the panel.

**The general shape:** a directive that guards an event on somebody else's element can only
guard what nobody else is listening for. Where a consumer may bind the same event, the guard has
to be a state the platform enforces, not a decision the component makes.

### <a id="lesson-96"></a>`lesson-96` — Projected content keeps the encapsulation of the template that declared it

The menu's rows were written as a directive with the styling left in the component's own
stylesheet — `.pct-menu__item { … }` in `menu.scss`, beside `.pct-menu__panel`. Every rule for a
row was dead, and nothing said so: the panel was drawn correctly, the rows were the browser's
default buttons, and the unit suite was green because jsdom computes no styles.

Emulated encapsulation rewrites `.pct-menu__item` to `.pct-menu__item[_ngcontent-abc]`, where
`abc` is the id of the component whose template the element was **written in**. The rows are
written in the consumer's template, so they carry the consumer's id — the menu's selector cannot
match them however deeply they are nested inside its panel. What the panel gets right and the
row gets wrong is not depth, it is authorship.

The repository already had the answer one entrypoint over and had written down half the reason:
`pct-text` is a **component on a native element** (`input[pctText]`) because "a directive cannot
carry styles, and the API is not to stand on `::ng-deep`". The other half is this: a component
on the element brings `:host`, which matches the element itself rather than its contents, and
`:host` is the only selector that reaches a projected node from the component that owns it.

It was found by opening the page and reading `getComputedStyle` — 21 px tall, 6 px of padding,
`rgb(239, 239, 239)`: a browser default button, in the one measurement no test in this
repository was taking. It is the third defect in a row here found that way
([`lesson-90`](#lesson-90), [`lesson-91`](#lesson-91)), and the three of them have one shape —
**a component is not built until somebody has looked at it.**

### <a id="lesson-97"></a>`lesson-97` — Two elements of one template are two instantiations, and neither is evidence about the other

The select family opens with a fork: is an option a row of data or a `<pct-option>` the consumer
projects? The second shape is what most libraries ship, and the argument for it is readability — the
value stands next to the label it belongs to. Four probes under `strictTemplates` say what it costs,
and the first of them is the whole answer:

```html
<!-- silent, in every engine and every strictness flag this repository sets -->
<pct-probe-select [value]="aString">
  <pct-probe-option [value]="'pl'">Poland</pct-probe-option>
  <pct-probe-option [value]="1">One</pct-probe-option>
</pct-probe-select>
```

The same two values in the array this library already takes are **TS2322 at the literal**. The
compiler is not being lenient about projection: it never related the two elements at all. A
parent's `T` is decided at the parent's own binding sites, a child's at the child's, and the
fact that one stands inside the other is a runtime relation with no type to it. Projection is
not the only place this bites — it is every parent/child pair in every template.

The parent's own view of its content is worse rather than better.
`contentChildren(PctOption)` takes a **class reference**, and a class reference carries no type
argument, so the query's element type falls to `any`: the same expression was accepted as a
`string` and as a `number` in one file, by one compiler, in one pass. A query is a runtime
lookup wearing a type, and the type comes from the locator rather than from what the locator
found.

This is [`lesson-84`](#lesson-84) one floor up. There the finding was that a directive's
generic has no inference site of its own; here it is that **an element boundary is not an
inference site either**, and no amount of care inside one component buys checking across two.
The shape that keeps the type is the one where the values a list holds are written in a single
expression — an array literal is the one place TypeScript compares a list's members with each
other.

### <a id="lesson-98"></a>`lesson-98` — Projected rows belong to the consumer's view, so the panel never owns how many exist

The second half of the same probe, and it measures something the type argument above cannot
reach: a host whose `@for` writes **1000** `<pct-probe-option>` elements into a select whose
panel is never opened builds **1000 component instances**. The panel is closed, the overlay
template is not attached, and none of the projected nodes is in the document — `closedInDom: 0`
— but every constructor has run, every input is bound and every one of them will answer change
detection for as long as the page lives.

That is not a leak and not a bug: content is created with the view that **declares** it, which
is the consumer's, and an `<ng-content />` inside an unattached template simply has nowhere to
put nodes that already exist. The same probe shows the pleasant half — closing and reopening
the panel moves them back with no rebuild at all, `afterReopenInstances: 3` for three rows.

What it settles is who can make a promise about the size of a list. Rows the panel builds are
rows the panel can decline to build; rows the consumer builds are already there. Virtualisation,
async loading and a filter that never renders what it hides are all promises of the first kind,
and a component that takes its rows through projection has given away the only place from which
any of them can be kept. **The authoring channel decides who owns the count**, and the count is
where the last three items of this component's own plan live.

### <a id="lesson-99"></a>`lesson-99` — A two-way binding is checked in the read direction only

Measured while deciding where multiplicity lives ([0034](decisions/0034-multiplicity-is-a-tag.md)),
on a probe compiled by `nx build sandbox` with `strictTemplates`. A control whose model is
`string | null`, bound two ways to a signal that holds a plain `string`:

```html
<pct-probe-one [options]="countries" [(value)]="required" />
<!-- protected required = signal<string>('pl'); -->
```

This **compiles**. So does the same mismatch written to an ordinary field
(`plainRequired: string`). The component may write `null` into either, and nothing in the
build says so — while the read direction of the very same binding is checked strictly:
`[(value)]="many"` on a control whose value is `string | null` is `TS2322` at the binding.

The consequence is about where a type promise can actually be kept. `[(x)]` looks like the
tightest binding in a template and is the loosest: of the three channels a value travels
through, only two carry a check — the input, and an explicit `(valueChange)="fn($event)"`
handler, where `$event` is the model's type and the method's parameter is compared with it.
That is why [0034](decisions/0034-multiplicity-is-a-tag.md)'s union road is silent in the
cases that matter: every wrong value it accepts arrives through the one unchecked direction,
and the one thing it breaks is the checked one.

The rule to write bindings by: a component that widens its value type is not paid for by its
own consumers in their two-way bindings — it is paid for by the ones who wrote a handler, and
their code was right.

### <a id="lesson-100"></a>`lesson-100` — A base class hides half a component from every gate that reads one class body

`PctSelect` and `PctMultiSelect` are one implementation with two value channels: fifteen
inputs, the overlay, the walk and the chrome contract live on a `@Directive()` base they both
extend ([0034](decisions/0034-multiplicity-is-a-tag.md)). Two gates went red on the spot, and
neither was reporting a defect in the components:

- `check-aria`: "`PctSelect` keeps its widget inside the template and declares no
  `ariaLabel` / `ariaLabelledby`". The inputs are declared — one file away. The scanner reads
  a decorator and the class body beneath it, which is a complete description of every
  component this library had until that day;
- `check-texts`: "`PctSelectBase` is not in the built package". It is in the bundle and not in
  the exports, because an internal base is not public API — and the gate's list of package
  classes is the list of exported ones.

Both are the same defect one level up: **a scanner that reads one class body reads a
component's surface only while no component has a base.** The fix is the same in both — read
`@Directive` classes as well as `@Component` ones, follow `extends`, and merge what the base
declares into the subclass, exactly as Angular merges `hostAttrs`, inputs and queries into the
subclass's definition. A base no entrypoint exports then stops being a class of its own: its
strings and its attributes travel inside whatever extends it.

The part worth keeping is the shape of the failure. Both gates failed **loudly and wrongly** —
they named a real component and made a false claim about it. That is the good case. The same
blindness in a gate written to _find_ something (a part inventory, a size budget) would have
reported nothing at all, and a green run would have said the surface was measured.

### <a id="lesson-101"></a>`lesson-101` — Whether an accent is a letter is a question of language, and the trick that pretends otherwise folds half the alphabet

Every filtering select needs a default predicate, and the tempting one is "case-insensitive,
accent-insensitive contains" — three lines with `normalize('NFD')` and a strip of the combining
marks. Two measurements, run before writing them:

**The platform answers per language.** `Intl.Collator(locale, { sensitivity: 'base' })` is the
setting whose entire job is to ignore accents. Asked whether an `o` with an umlaut is the same
letter as a plain `o`:

| locale           | `o`-umlaut vs `o` | `a`-umlaut vs `a` |
| ---------------- | ----------------: | ----------------: |
| `en`, `de`, `pl` |          0 (same) |          0 (same) |
| `sv`, `da`       |     1 (different) |     1 (different) |

Same pair of strings, opposite answers. In Swedish and Danish those are letters of their own,
at the end of the alphabet; in German they are an `o` wearing a hat. A library that folds
accents has picked one of those languages for every application that installs it.

**And the shortcut is not even consistent with itself.** `normalize('NFD')` decomposes what has
a combining form and leaves alone what does not:

| written               | after NFD + strip |
| --------------------- | ----------------- |
| an `o` with an umlaut | `o`               |
| an `o` with a stroke  | unchanged         |
| an `a` with a ring    | `a`               |
| an `a` and `e` joined | unchanged         |

So a Danish label is reachable by typing the slashed letter and unreachable by typing the plain
one, while its Swedish neighbour folds — in a library whose documentation says "accents are
ignored". The user is on the wrong side of a rule nobody wrote down.

The decision is therefore not "we did not get round to it": **the library folds case and stops
there**, and `filterWith` takes the whole option, so an application that knows its language
writes the two lines it actually needs ([0035](decisions/0035-a-filter-is-a-question-not-a-value.md)).

There is a second-order note worth keeping, because it cost half an hour. This repository's own
language gate hunts Polish letters, so the examples that first illustrated this lesson —
Polish place names, the sharpest case there is, since Polish collation makes `l`-with-stroke a
letter of its own — could not be written down anywhere in the repository. The gate that keeps
one language out of the package also keeps its letters out of a sentence about letters, and the
measurements above are Nordic for that reason and for no other.

### <a id="lesson-102"></a>`lesson-102` — An exception outlives the reason it names, and reads as a limit of the environment

`check-coverage` held two entries for `select.html`, both for the panel's
`(overlayOutsideClick)`. The reason they gave was that jsdom cannot raise it: "the CDK raises
it from a real click outside a real overlay, so a jsdom test would measure its own synthetic
event and nothing else." The gesture was guarded one floor up, in three engines, and the
exception was read by four later sessions as a fact about the environment.

It is not one. The CDK listens on the **document** and answers a synthetic click like any
other: `document.body.click()` with the panel open closes it, in jsdom, in ten lines. Nothing
had ever asked. The exception did not describe a limit — it described a test nobody had
written, and it kept describing it long after the sentence had stopped being checked by
anything.

What made it visible was the gate's own two-sided floor: an exception fires when the metric climbs
**above** what it allows, and the filtering trigger brought a click on the trigger with the panel
open into the unit suite. The gate then said the entry covers nothing — which is the part worth
copying. **An exception that only ever guards a floor is a claim nobody re-reads; an exception that
also fires from above is a claim with an expiry date.** The two entries are gone, `select.html`
measures 100% on all four metrics, and the repository now carries no template exception at all.

### <a id="lesson-103"></a>`lesson-103` — A template reference inside a control-flow block cannot be seen from outside it

The select's panel is anchored on its trigger, and it was written the way the CDK documents:
`#origin="cdkOverlayOrigin"` on the `<button>`, `[cdkConnectedOverlayOrigin]="origin"` on the
overlay template below. That works while the trigger is one element. The moment it becomes two
— a `<button>` and an `<input>` on the branches of an `@if`
([0035](decisions/0035-a-filter-is-a-question-not-a-value.md)) — the reference is declared
**inside an embedded view**, and the overlay standing beside the block cannot name it. Writing
`#origin` in both branches does not help: they are two views, and neither of them is the one
asking.

The fix is not a wrapper element around both branches (which would have moved the border and
the part) but the other form of the same input: `cdkConnectedOverlayOrigin` takes a
`CdkOverlayOrigin`, an `ElementRef`, an `Element` or a point — so the origin becomes the
element itself, `anchor() ?? trigger()`, where `trigger` is a `viewChild.required` that
resolves to whichever branch is standing.

Two things worth keeping from it. **A signal view query reaches into embedded views**, so one
`viewChild('trigger')` covers both branches and stays `required` — exactly one of them is ever
in the tree. And a directive's export is a **name in a view**, while the thing it exports is an
object: whenever a reference cannot be reached, the question to ask is what the binding would
have taken instead of the reference.

### <a id="lesson-104"></a>`lesson-104` — A `<button>` inside a `<button>` is two buttons, and only the parser says so

The select's cross had one obvious home: inside the trigger, where every library draws it. The
select-only trigger **is** a `<button>`, so that is a button inside a button — filed, usually,
under "the validator will complain about it". It is not a validator's opinion. Measured, in two
lines:

```js
// the HTML parser — the server's answer, and the browser's own parse of it
new JSDOM('<div><button>text<button>x</button></button></div>');
// → <button>text</button><button>x</button>

// the DOM API on the same tree — which is how a framework builds a template
a.appendChild(b);
// → <button>text<button>x</button></button>
```

The spec says it outright: a `<button>` start tag while a button is in scope generates implied
end tags and pops the open one. And **Angular's template parser does not do that** —
`parseTemplate` on the nested markup returns no error and the nested tree, because a compiled
template is built through the DOM rather than through the fragment parser.

So the same template is two different trees depending on who read it, and the place the two
readings meet is **server rendering**: Angular serialises the built tree and the browser parses
it back, so hydration compares a nested button against two siblings. What would have been a
lint note in a client-rendered page is a tree that rearranges itself under SSR, with no
message a reader can act on.

The general form is worth more than the case: **a content model is not advice, it is what the
parser will do to you** — and any rule of it that a framework's own parser does not implement
becomes visible only where a string is parsed. Server rendering is that place, so "it works in
the browser" is not evidence about the markup.

### <a id="lesson-105"></a>`lesson-105` — A positioning context is a paint layer, and the text inside one loses its subpixel antialiasing

The cross had to be a sibling of the trigger ([`lesson-104`](#lesson-104)), a sibling needs a
box to be positioned in, and so a `<div class="pct-select__box">` with `position: relative`
went around both branches of the select's trigger. Every geometric measurement said nothing had
changed: same `x`, same `width`, same `height`, to three decimal places, with the wrapper and
with `display: contents` in its place.

The visual gate disagreed — 309 differing pixels on a card nothing had moved. They were all in
one band, the trigger's line of text, and reading the values said what had happened:

```
baseline (191, 136, 106)   actual (132, 141, 153)
baseline (140, 213, 244)   actual (219, 221, 225)
```

Strongly coloured pixels against nearly grey ones: the baseline was rasterised with **subpixel
(LCD) antialiasing** and the new render with greyscale. `position: relative` makes the element
a positioned box painted in its own phase, and Chromium will not use subpixel antialiasing for
text whose background it cannot vouch for. The card counted 5385 pixels with a colour cast
before and 5303 after — the same rule, measured from the other side, by putting the wrapper
back to `static`.

Two things follow. **A wrapper is not free even when the layout is identical**, so "nothing
moved" is not the same measurement as "nothing changed"; a geometric test would have passed
this and a screenshot did not, which is the argument for keeping both. And the fix is the shape
the defect suggests: a positioning context **only where something is going to be positioned in
it** — here, the branch whose arrow stands beside the trigger, and the control that carries a
cross — rather than always, on the reasoning that it costs nothing.

### <a id="lesson-106"></a>`lesson-106` — An empty listbox is a critical violation, and `aria-busy` is the specification's way of saying "not yet"

The async step needed the waiting panel audited, and the audit was expected to be a formality:
a `role="listbox"` with a sentence in it and no rows, drawn by a control that has been through
five accessibility reviews. It came back **critical**, from the listbox and not from anything
inside it:

```
[critical] aria-required-children: Required ARIA children role not present: group, option
  - #pct-select-39-listbox
```

`listbox` is one of the roles ARIA declares with required owned elements, and a panel waiting
for its rows owns none. The obvious repairs are both worse than the fault — a message row
wearing `role="option"` is an option nobody can pick, and dropping the role while the panel is
empty is a combobox whose `aria-haspopup="listbox"` points at something else.

The answer is a state the specification already has for this exact case, and axe implements it:
`aria-busy="true"` marks a container whose content **has not arrived**, and the rule stands
down until it does. Putting the attribute on makes the violation go; taking it off brings it
straight back, which is how the two runs above were produced. So the accessible reading of
"loading" is not decoration around the list — it is what makes the empty list legal.

The second half of the measurement is the one that was not asked for. Pointed at the panel of
a control whose list is **genuinely** empty — the same audit, the sentence "No options" instead
of "Loading…" — it reports the same critical violation, and no case in this repository had ever
opened an empty panel under axe. A state can be audited by four cases and still have a floor
nobody stood on.

### <a id="lesson-107"></a>`lesson-107` — A cursor kept as a number survives only a list that changes on a keystroke

The keyboard cursor of the select was an index into the row list, and for five steps of the family
that was exactly right: every change of the list came from a keystroke — a letter typed into the
filter, a question cleared, a pick — and each of those paths set the cursor itself, on the same line
that changed the list.

A list answered by a server is the first change that arrives on **nobody's** keystroke, and the
number then names a different row. What that costs is not a cosmetic slip:
`aria-activedescendant` on the trigger points at an id nothing in the document carries, so the
reader has nothing to read; the row drawn as active is one the user never moved to; and `Enter`
picks whatever has slid under the number. The e2e case is the shape of it — two steps down to
Slovakia, the same six options answered again as another instance of each, and the id in the
attribute has to still name a row that exists.

The repair is one sentence — **a cursor names an entry, not a position** — and the mechanism it
needs is a `linkedSignal`: the index is derived from the list and written over by the walk,
which is what that primitive is. An effect cannot do this job, because it would read the index
it writes ([`lesson-94`](#lesson-94)).

What makes two entries "the same" is where the general answer runs out. Rows built from data
are rebuilt on every reading, so identity says two readings of one list share nothing; items
that are component instances survive the change, so identity is exactly right for them. The
walk therefore asks and does not assume — and the select's answer was already written down as
something else: `compareWith`, the function that maps a value back to an option **because a
fetch brings back another instance of the same thing**. A cursor is another way of naming an
option, so it is put back the same way the value is.

### <a id="lesson-108"></a>`lesson-108` — `offsetHeight` is an integer, and a list is arithmetic over a fraction

A window over a list is arithmetic over one number: the height of a row. The height was refused
as an input for a reason that was written down before anything was built — a row here is
**35.59 px**, `line-height: 1.4` on a 14 px type plus the padding, there is no token for it
because it falls out of the type, and `size` moves it again per instance — so a number a
consumer typed by hand would be wrong by a fraction of a pixel per row and by two thousand over
five thousand of them.

The first implementation then measured it with `offsetHeight`, and `offsetHeight` **rounds to an
integer**. The panel drawn whole reported a `scrollHeight` of 177,977 px and the windowed one
180,004: the same list, 2,027 px apart, which is fifty-seven rows of scrollbar describing rows
nobody has. The very drift the input was refused for, arrived through the measurement instead.

`getBoundingClientRect().height` answers 35.59375 and the two totals agree to the pixel. The
lesson is not about one property: **a measurement is a promise about precision**, and the DOM
has two kinds of length — the rounded ones (`offsetHeight`, `clientHeight`, `scrollTop` in
some engines) and the exact ones (every `DOMRect`). A number that is multiplied by five
thousand has to come from the second kind.

The gate is the one that says so without naming a number: the same list is opened twice, drawn
whole and windowed, and the two `scrollHeight`s are compared against **each other** with a
pixel of tolerance. A test asserting 177,977 would have been a test about this machine's fonts.

### <a id="lesson-109"></a>`lesson-109` — Two repairs in one run, and the count of red cases cannot say which one worked

The window moved on Chromium and did not on Firefox. Two things were changed in answer to that,
in the same edit: a demo whose keyboard case was asking `End` of a **filtering** trigger, where
that key belongs to the caret and not to the list; and `overflow-anchor: none` on the panel, on
the reasoning that scroll anchoring is the browser keeping a chosen element still while the
content around it changes, which is a fair description of what a window does on every frame.

The run went from five red cases to two. Both changes looked justified, the story was coherent —
and the anchoring had done **nothing at all**. It was found out only because the negative
control for it was actually run: the property was put back to its default and every case stayed
green, including a wheel-driven scroll in Firefox, twenty-five notches down, which is the
interaction anchoring bites hardest. All five of the original failures belonged to the demo and
to the two defects in [`lesson-110`](#lesson-110) and [`lesson-111`](#lesson-111).

The line is gone, because a line no test can fail on is a line this repository deletes. The
lesson is about the method rather than about the property: **a run that goes from five red to
two has measured the pair, not either one.** Changing two things and reading one number is how a
guess earns a permanent place in a stylesheet — and the thing that finds it out is the rule this
plan already has, that every gate needs a recorded run of it failing. The control here did not
confirm a repair; it deleted one.

### <a id="lesson-110"></a>`lesson-110` — An effect that follows the cursor must be woken by the cursor alone

The hook that keeps the active row in view read four things: the cursor, whether the panel is
open, the panel element, and — through the arithmetic that finds the row's offset — the
geometry. Only the first two are what it is **about**. The other two are how it does its job.

An `afterRenderEffect` tracks every signal it reads, so a measurement that moved by a fraction
of a pixel woke a hook whose entire body is "scroll the panel to the cursor" — and the cursor
was standing on row 0 while the user was looking at row 4,989. The panel snapped back to the
top, in one engine and not the other, on a scroll the user had asked for.

`untracked` around the body, with the cursor read outside it. The rule generalises past this
component: **an effect's dependencies are the question it answers, not the data it needs to
answer it** — and the two are easy to confuse, because reading the second is how you compute
the first.

### <a id="lesson-111"></a>`lesson-111` — Two engines lay out on two grids, so a measured value is compared with a tolerance and never rounded

With the hook untracked and the anchoring off, Firefox still froze the panel where it stood,
and the console said why: `NG0103: Infinite change detection while refreshing application
views`.

The instrumented run is the whole lesson in six lines:

```
SET metrics 35.600006103515625   HOOK measure 4989 177608.43045043945
SET metrics 35.59999084472656    HOOK measure 4989 177608.35432434082
SET metrics 35.600006103515625   HOOK measure 4989 177608.43045043945
```

Firefox reports the row's height as two values a **fifteen-millionth of a pixel** apart, and
they alternate, because each measurement writes the spacer that decides where the next row is
laid out. Measure, write, re-render, measure. The loop is not slow, it is endless, and Angular
gives up rather than hanging — which is why the symptom is a panel that stops responding rather
than a tab that dies.

The obvious repair is to round the value, and it is wrong: **engines do not share a grid.**
Blink lays out on 1/64 px and reports 35.59375; Gecko lays out on 1/60 px and reports 35.6.
Rounding to either grid moves every reading of the other by tens of pixels over five thousand
rows — the same defect as [`lesson-108`](#lesson-108), reintroduced by the fix for the loop.

So the reading stays exact and the **question** gets coarse: two heights within a sixty-fourth
of a pixel are one measurement, in the signal's `equal`. That is a thousand times the jitter and
a two-hundredth of the smallest change that can be real, because a row's height comes out of
the type and moves by whole points when it moves at all. A stored value is exact; "is this a
different value" is a judgement, and a judgement about a measurement needs a tolerance.

---

### <a id="lesson-112"></a>`lesson-112` — An ARIA attribute over a native state is written by us and read by nobody

`PctSwitch` had one question to settle before a line of it was written: `role="switch"`
declares `aria-checked` a **required** state, so does the component write it? The
specification says yes, `PctCheckbox` one directory over has been writing it since v0, and
both of those turn out to be about a different element.

The probe is four inputs on one page, read in three engines and — for the one browser that
exposes it — out of the accessibility tree the browser itself builds:

```
                                                          axe            Chromium AX tree
<input type=checkbox role=switch checked>                 —              switch   checked=true
<button  type=button role=switch>                         critical/      switch   checked=false
<div     role=switch tabindex=0>                          aria-required- switch   checked=false
                                                          attr
<input type=checkbox role=switch checked aria-checked=false>  —          switch   checked=true
```

Two readings, and the second is the lesson. The **fourth** row writes `aria-checked="false"`
onto a box that is checked, and the browser reports it as checked anyway: for a native
checkbox the checkedness is the state and the ARIA attribute is not consulted. The same holds
one role over — an unchecked `<input type="checkbox" aria-checked="true">` comes out of the
tree as `checked=false`, and an `indeterminate` set through the DOM property comes out as
`checked=mixed` with nothing written at all.

So the attribute is not redundant, it is **inert**. And an inert attribute is worse than a
missing one, because it looks like the thing that is working: it can drift from the state it
claims to mirror — a stale computed, a binding left behind by a refactor, a `mixed` that
outlives the `indeterminate` — and nothing will say so. Not a unit test, which reads the same
attribute back and finds it exactly as written; not an axe audit, which has no rule about it;
not a reader, which never looked. The whole apparatus around such a line agrees with itself
and measures nothing, which is [`req-axis`](00-axis.md) with the layers rearranged: here the
gate exists, runs and passes, and the thing it examines is our own echo.

Rows two and three are the other half, and they are what settled the element. With no
checkedness to derive the state from, the role's required attribute really is required — the
audit reports it as **critical**, from the element itself, in every engine. So a
`<button role="switch">` obliges the component to publish the state for ever, and a native
checkbox with the same role obliges it to publish nothing. The rule that comes out of both
readings is one sentence: **write ARIA for what the element does not already say, and check
which of the two you are doing before you write it**
([0039](decisions/0039-a-state-the-platform-publishes-is-not-ours-to-write.md)).

---

### <a id="lesson-113"></a>`lesson-113` — A finding written down is an input to the gate that found it

**`check-reach` reported 45 tracked files nothing reaches. One commit later it reported a clean
repository, and nothing had been fixed — the commit had written the finding into the plan.**
The entry naming the trees spelled `.agents/skills/**`, which is a legal mention by
[`lesson-61`](#lesson-61)'s own rule (a directory segment before the first wildcard), so the
walk entered the dead island through the paragraph explaining that nobody enters it. The entry
named the other two paths as well, so all 45 files came back alive on a commit that touched no
configuration at all.

The same entry did it twice. It quoted the two fragments of hex the language gate had been
about to flag inside a lockfile, and the next run reported them at `docs/plan.md` as well —
the report of a violation being a fresh instance of it, which is where
[`lesson-77`](#lesson-77) had already ended once, and it did not generalise then because it
looked like a property of a gate that hunts words.

It is not. **A document in the git index is a file like any other, and every gate that walks
the index walks the description of its own failures.** The plan is where findings are recorded
here, so the plan is an input to `check-reach`, `check-language`, `check-texts` and
`check-docs` alike — writing a finding down changes the measurement, in the direction that
makes the finding disappear.

Two things follow, and the first is worth more than the second:

- **A gate that goes green after a commit that only wrote prose has not been fixed.** That is
  a cheap thing to check and it costs nothing to remember: compare what moved against what the
  gate reads, and a documentation-only diff answers immediately.
- Naming a defective path in a report is a **choice of form**: `.agents/skills/**` reaches 42
  files, `.agents/skills/` reaches none. There is no way to write about a hunted word at all —
  the fixtures tree is the one place a sample of it can stand, which is what
  [`lesson-77`](#lesson-77) settled — and there is no reason to make the general habit of it,
  because the cure would be prose written badly on purpose.

The trees are gone from the index now ([0040](decisions/0040-a-lockfile-is-material-the-tree-it-locks-is-not.md)),
so the citation grants nothing and the question does not arise for these files again. It
arises for the next finding.

---

### <a id="lesson-114"></a>`lesson-114` — `NgControl.valueChanges` is `null` for the whole of a sibling directive's constructor

**A subscription made in a constructor was a subscription to nothing, and the only symptom was
a height that never moved.** `PctAutosize` sits on the same element as a forms directive and
needs to hear a value written with no event — `patchValue` reaches the DOM through
`DefaultValueAccessor.writeValue`, which dispatches nothing, so `(input)` is deaf to it. The
obvious wiring is the one every other listener here uses:

```ts
constructor() {
  const classic = inject(NgControl, { optional: true, self: true });
  classic?.valueChanges?.pipe(takeUntilDestroyed()).subscribe(() => this.fit());
}
```

`classic` is **not** null — the injection is fine, and a probe printing it says so. What is
null is `classic.valueChanges`, because `NgControl` is an abstract forwarder: the getter
returns `this.control?.valueChanges`, and `control` is bound by the forms directive in its own
`ngOnChanges`, which runs after every constructor on the node. Optional chaining then does
exactly what it is for and the line evaluates to `undefined` in silence.

**Nothing reports this.** Not the compiler, which types the getter as nullable and is satisfied
by the `?.`; not a unit test, which can assert that the subscription was attempted and cannot
tell an observable from an absent one; not a browser, which throws nothing. In three engines
the only difference was that firefox — the one on the measured road — stopped following
`patchValue`, and it stopped by doing nothing at all.

Moved into `afterNextRender`, the same three lines work. The general form is worth more than
the fix: **a value a framework binds in a lifecycle hook is not readable from a constructor
that runs before it, and reading it through a nullable getter turns the ordering bug into a
no-op rather than an error.** The habit that follows is to ask, of anything injected from a
neighbour, _when_ it is populated — `inject()` answering is a fact about the injector and not
about the object being ready.

The control is recorded and it is cheap: taken at construction, one e2e case goes red in
firefox and one unit case with it, and the other twenty stay green.

---

### <a id="lesson-115"></a>`lesson-115` — Build the optional part of a fallback last, or its absence takes the rest with it

**jsdom has no `ResizeObserver`, and the line that constructed one threw before the two lines
under it had run — so a missing nicety cost the whole road.** The measured half of
`pctAutosize` has three inputs: the value the control owns, a value written with no event, and
a width that changed under the text. Written in that order in the source, they were installed
in a different one, and the observer went first because it read best there.

`new ResizeObserver(...)` then threw a `ReferenceError` inside `afterNextRender`, which took
down the subscription that follows it, the `ready` flag under that, and the first fit under
that. The symptom was not "rewraps are not followed" but "the height is never written at all",
in an environment where none of the other two mechanisms is even in question.

The repair is an ordering and a `typeof` guard, and the rule it stands on is worth keeping:
**inside one block, install what a consumer cannot do without before what merely improves the
result** — a fallback's parts are not equal, and the sequence is where that inequality gets
expressed. Guarded and moved to the end, the same absence now costs exactly what it should: an
environment with no `ResizeObserver` follows every value and misses only a rewrap.

The wider half is about where this was found. Three browsers all have `ResizeObserver`, so no
e2e case could ever have shown this; it took the one environment in the matrix that is poorer
than a browser. **A test runner is a platform too, and the things it lacks are a free probe of
what the code assumes.**

---

### <a id="lesson-116"></a>`lesson-116` — An element screenshot's height depends on where the element starts

**A visual baseline went red on a panel that had not changed at all: same width, same
children, same height to the pixel — 166 px before and 166 px after.** The screenshot was
167 px.

The panel was `panel-scoped` on the kitchen-sink page, photographed as an ELEMENT rather than
as a viewport. What moved was one number nobody photographs:

|        | `height` | `top` (page)  | screenshot |
| ------ | -------- | ------------- | ---------- |
| before | 166      | **1893**      | 166 px     |
| after  | 166      | **1991.1875** | **167 px** |

A box 166 px tall starting at `.1875` covers 167 rows of device pixels, so a rasteriser that
must return whole pixels returns 167. Nothing about the element changed; the element moved
onto a fractional offset, and an element screenshot is a crop of a raster rather than a
measurement of a box.

**Where the fraction came from is the half worth keeping.** A `<textarea>` was added to the
page ABOVE that panel, and a textarea's height is a whole number of LINE BOXES — which is not
a whole number of pixels: two rows of the field's type is 39.1875 px. That is not an artefact
of `pctAutosize`'s `min-block-size: calc(var(--_pct-text-rows) * 1lh)` either, and the
measurement says so outright: a plain `<textarea rows="2">` on the same page is **39.19 px**
too, in all three engines. The arithmetic in `lh` reproduces the platform's own number,
fraction included — which is the point of it.

So the rule is about the gate rather than about the code: **an element baseline is invalidated
by anything that changes the element's vertical offset, not only by what changes the element.**
Adding a control anywhere above it is enough, and the diff image will show two identical
pictures — which is exactly how this was nearly written off as flake.

Two practical consequences:

- **Reproduce before you accept.** Run the case again: a rounding that depends on a layout is
  stable, and a flake is not. This one gave 167 three times out of three, which is what turned
  it from noise into a question.
- **Measure the element, not the picture, before rewriting a baseline.** `height` and `top`
  read from the DOM said in one line what the two images could not: the panel is untouched.
  Rewriting the file was still right — the raster really is different — but for a reason that
  can be written down instead of shrugged at.

It is [`lesson-105`](#lesson-105)'s pair. There, "nothing moved" and "nothing changed" were two
measurements because a paint layer changed the pixels of an unmoved box; here they come apart
the other way, because a box that did not change was moved.

---

### <a id="lesson-117"></a>`lesson-117` — The forms interop writes `null` into a model typed `number`, and nothing says so

**`[(ngModel)]` on a control that only implements `FormValueControl` writes `null` before it
writes the value.** [`lesson-9`](#lesson-9) settled that `ControlValueAccessor` is
unnecessary — the classic forms bind to a signal control with no adapter of ours. What that
lesson did not say is WHEN. The bridge sets the control up in the same turn as the directive
and its own value has not resolved yet, so the first write reaching the model is `null`; the
real one arrives a microtask later.

For `PctSwitch` that is invisible: `checked` is a `boolean`, `null` is falsy, and the box is
simply unchecked for one tick. For a slider it is not. `value` is typed `number`, the
stylesheet runs on `(value - min) / (max - min)`, and `null` there is a `0` that happens to
be right at `min = 0` and wrong everywhere else — while `[value]="null"` on the element
writes an empty string, which a `<input type="range">` answers with **its own default, 50**.
So the first frame of a `[(ngModel)]`-bound slider showed 50 for a model holding 70, and the
declared type had refused nothing: `model<number>` accepts whatever the interop hands it,
because the write comes from outside the compiler's sight.

The repair is not a cast and not a guard at the one place it hurt. It is **one read of the
value, defensive from the first version**:

```ts
protected readonly position = computed(() => {
  const v = this.value() as number | null | undefined;
  return typeof v === 'number' && Number.isFinite(v) ? v : this.lower();
});
```

and every consumer of the value — the arithmetic, the formatting, the DOM binding, the
readonly restore — reads `position()` and not `value()`.

The general rule, and it is the one this repository keeps relearning: **a value that arrives
from a framework's own plumbing is an input from outside, whatever its declared type.** The
type describes the contract a consumer writes against; the plumbing is not that consumer. A
control that reads it defensively from the first version pays four lines; one that waits for
a `NaN` to reach a `calc()` pays an afternoon and a bug report about a slider that "jumps on
load".

---

### <a id="lesson-118"></a>`lesson-118` — `getComputedStyle(el, '::before')` answers for an element that renders no `::before`

**A range does not carry generated content, and the obvious probe says it does.**
[0042](decisions/0042-a-slider-is-the-platforms-range.md) was decided on thirteen probes, and
one of them — C1, "`input[type=range]::before` renders in all three engines" — was wrong. It
was read the way generated content is usually read, by asking the browser for the computed
`content` of the pseudo-element. That reading is not about rendering at all: it reports the
declaration, and an `<input>` is a replaced element on which the box is never generated.

Measured by PIXEL instead — the element screenshotted and the colours sampled where the box
would be — the answer is **chromium yes, firefox no, webkit no**. And in chromium, an
absolutely positioned `::before` paints ABOVE the UA shadow content, so a fill drawn that way
covers half the thumb it is supposed to end at.

Two things follow, and the second is worth more than the first.

**The mechanism changed.** The fill, the ticks and the thumb are drawn boxes inside the
component's own template, with the native range laid over them at `opacity: 0` — the switch's
technique, for a reason the switch never had to argue: a gradient on `::-webkit-slider-runnable-track`
does render in all three (that part of C2 held), but a gradient direction is PHYSICAL, so the
RTL slider would have needed a rule reading the direction, which is the one thing
[`req-token-logical`](requirements/tokens.md#req-token-logical) forbids. Drawn boxes take
`inset-inline-start` and `inline-size` and mirror for free — in RTL and under the vertical
writing mode alike.

**The check that would have caught it is cheap.** A probe that asks a browser to REPORT a
declaration has measured the parser. A probe that samples a pixel has measured the renderer.
When the question is "does this render", only the second one is an answer — and the way to
read a PNG with no dependency is to hand it back to the page: `img.decode()` into a canvas
and `getImageData` a point. Three lines, and it is the difference between a decision resting
on a measurement and a decision resting on a syntax check.

The other half of the same probe: an `outline` on `::-webkit-slider-thumb` / `::-moz-range-thumb`
applies in **one engine of three** (firefox). The focus ring is therefore on a box of ours,
where all three can be asked about it.

---

### <a id="lesson-119"></a>`lesson-119` — Forced-colors mode is a request, and each engine honours a different part of it

**A `box-shadow` is forced to `none` in chromium and firefox and left alone in webkit.**
Measured on one page in the three engines with `forced-colors: active` emulated: the computed
`box-shadow` reads `none` in chromium 149 and firefox 151, and reads the author's own
`rgb(37, 99, 235) 0px 0px 0px 1px inset` in webkit 26.5.

The same probe answers a bigger question by accident. An `outline-color` written as
`rgb(37, 99, 235)` computes to `rgb(0, 0, 0)` in chromium and firefox — the substitution
doing its work — and stays `rgb(37, 99, 235)` in webkit. **Webkit matches the media query and
substitutes nothing.** That is not a defect in the emulation to route around: it is why every
forced-colors block in this library NAMES its system colours (`Field`, `CanvasText`,
`Highlight`) instead of leaving the palette to be swapped for it, and it is why the gate that
reads those blocks passes in three engines at all
([`lesson-70`](#lesson-70) is the same discipline arrived at from the specificity side).

The rule that falls out is one line: **in that mode, remove what you want removed and paint
what you want painted — never rely on the mode to do either.** The calendar's "today" ring is
where it was found. It is an inset `box-shadow` in the light theme, and today is one of three
facts drawn on the same square (chosen, today, refused), so it has to survive the swap as a
SHAPE. Leaving it to the mode would have drawn two rings in webkit and none in the other two;
the block writes `box-shadow: none` and an `outline` of its own, and both halves are needed
for the same three engines to agree.

---

### <a id="lesson-120"></a>`lesson-120` — A fallback checked against the platform it falls back FROM is checked against nothing

**The gate over the week-start table was green with the table emptied.** The table exists
because `Intl.Locale.prototype.getWeekInfo()` is absent from firefox 151 and a calendar that
started the week on a different day per engine would be [`req-axis`](00-axis.md) itself
([0043](decisions/0043-a-day-is-not-an-instant.md)). Eighty regions of the 676 are written
down, and the case over them compares every one with the platform's own CLDR — 676
comparisons, no sample, which is exactly the shape a written-down copy of somebody else's data
needs.

It measured nothing. `pctFirstDayOfWeek` asks the platform **first** and reads the table only
where the platform is silent; node's ICU has `getWeekInfo`, so the case was comparing
`getWeekInfo()` with a function whose first line is `getWeekInfo()`. Measured rather than
reasoned: Egypt dropped out of the Saturday row left **all twenty cases passing**.

The fix is three lines and it is the shape worth keeping. Read the platform's answers first,
then **take the platform away** — `delete Intl.Locale.prototype.getWeekInfo`, which is firefox
— and ask the fallback the same 676 questions with the real function restored in a `finally`.
The same edit then reads `EG: ours 1, ICU 6`, and a second case holds the other half: with
`getWeekInfo` present the table must NOT be reached.

The general form is worth more than the case: **a fallback is only measured in the world it
exists for.** Any check of one that runs in the environment where the primary answers is a
check of the primary, twice — green whatever the fallback holds, and green for exactly as long
as nobody visits the browser it was written for.

---

### <a id="lesson-121"></a>`lesson-121` — A control that vanishes on a timer takes the user's place on the page with it

**Measured in three engines: when the element holding focus is removed from the document,
focus goes to `body`.** Not to the neighbour, not to the parent, not back where it came from —
to the root, which for a keyboard user means the next `Tab` starts the page again from the top.

The finding arrived with the toast, which is the first thing in this library that removes
itself while the user may be standing in it. Everything else here is dismissed by an action:
a dialog closes because somebody closed it, and the component then restores focus to the
element that opened it, deliberately and in a written-down order
([0029](decisions/0029-a-modal-is-an-overlay-not-a-dialog-element.md)). A message on a clock
has no such moment — the clock is not an action and there is nobody to give focus back to.

So the rule is not "restore focus afterwards" but **do not let the clock run**: nothing expires
while focus is inside the stack, and what is left of the timer is resumed rather than
restarted. The pointer gets the same treatment for a different reason (a message being read is
a message being read), and the two are one hold, so that neither can release the other's.

The general form is a question to ask of anything that disappears by itself: **who is standing
on it when it goes?** A tooltip nobody can focus, a panel that closes on a click, a row
replaced by a re-render — the first has no answer to give, the second has one, and the third
is where this bites next.

---

### <a id="lesson-122"></a>`lesson-122` — A `z-index` cannot get above the top layer, and the number that says it can is the dependency's

**The toast stack was under a modal's veil at `z-index: 1100`, with the veil's own container
declaring `1000`.** Read as CSS that is impossible, and the first half-hour of it was spent
reading it as CSS: raising the number to 99999 changed nothing, no ancestor had a transform, a
filter or an `isolation`, and both elements were children of `body`.

What the DOM said, once it was asked instead of the stylesheet, is that the CDK renders every
overlay inside `<div class="cdk-overlay-popover" popover>` — a **shown popover**, which is the
top layer. Nothing outside the top layer can be above something inside it, whatever either
side's `z-index` is; and the `z-index: 1000` still sitting on `.cdk-overlay-container` is
exactly what makes the defect read as an ordinary stacking bug. A number that describes what
the dependency used to do is worse than no number.

The way out is the platform's own: be in the top layer too. The stack is a
`popover="manual"`, shown when it is created and shown again as each message is raised —
because the order in the top layer is the order things were **shown** in, so being last is the
only way of being on top, and "shown last" is a fair description of a message that has just
arrived.

Three things that come with that road, each measured rather than assumed:

- a popover the user agent has **closed** is `display: none`, and a `display: none` live region
  is **absent** from the accessibility tree — so the region has to be shown while it is still
  empty, which is the same discipline
  [0026](decisions/0026-one-channel-per-politeness.md) arrived at from the other side;
- the user-agent sheet gives a popover `inset: 0`, a 3 px border, 4 px of padding, an opaque
  background and `overflow: auto`. Every one of them has to be taken back, and the first would
  have quietly undone every placement rule the component has;
- toggling the popover to move it up the top layer does **not** restart the transitions of the
  children already inside it: in all three engines they stay at `opacity: 1` and only the new
  one runs its `@starting-style`. That was the measurement the road depended on, and it is the
  kind that is cheaper to take than to reason about.

### <a id="lesson-123"></a>`lesson-123` — An ignored mutant is still instrumented, and a static attribute is where that shows

**`affix.ts` cannot enter the mutation measurement at all — not because it would score badly,
but because with the file in `mutate` the run dies in the INITIAL test run.** One case of
`field.spec.ts` fails and exactly one: `<span pctPrefix="fill">` renders
`data-pct-fit="inset"`. The sibling case a line above writes the attribute bare and passes,
because bare means `inset` and `inset` is also what a directive that received nothing answers.

The `angular` ignorer is why the file looked safe. It strikes the mutants of an `input()`
configuration object out of the score, and its reason in the policy says why they cannot be
run: mutated, the object stops being a literal the compiler can read. What that reason did not
say, because nothing had needed it, is that **striking a mutant out of the score does not take
it out of the code**. Instrumentation goes in first; every mutant of that object — ignored or
not — leaves a `stryMutAct(id) ? … : …` where a string used to be. The alias is one of those
strings.

An alias the compiler cannot read is not an error anywhere. It is an input the consuming
template never learns about, so `pctPrefix="fill"` compiles as a plain attribute, `fit()`
answers with its default, and nothing throws or warns. The only thing in the world that says
so is an assertion on the value.

Which is why the same instrumentation is harmless in `icon`, `popover`, `tooltip` and
`overlay` — four measured files, all four carrying aliases. No spec of theirs sets an aliased
input as a plain attribute with a value. So the property that decides is not "the file has an
alias" but "some spec binds one the way an application would", and that is the sort of
property nobody can read off a file.

The consequence for the register is the general one: a file can be **unmeasurable** and not
merely unmeasured, the two look identical from outside, and a policy that can only say "in" or
"out" leaves whoever meets this pushing at the run instead of writing the sentence down. Here
the sentence costs 14 mutants, and it is in `mutation.policy.json` under `unmeasured`.

### <a id="lesson-124"></a>`lesson-124` — A required input read from a sibling's host binding throws, and `@for` is where that happens

`PctTab.value` was `input.required<string>()` for about an hour. Every unit case failed with
`NG0950 — Input "value" is required but no value is available yet`, and the stack said where:
`PctTabs.chosenIndex`, reading `tab.value()` over the whole content, called from **another
panel's host binding**.

The shape is worth having, because nothing about the component looks wrong. A strip has to
compare every panel's value against its own to decide which one shows, and each panel asks that
question from its own `[attr.hidden]` binding. So panel one asks panel two for its value.

**What decides is the loop, not the query.** Written out as three `<pct-tab>` elements in one
template, this is safe: Ivy runs the template's update function first and the view's host
bindings afterwards, so by the time any panel asks, every sibling's inputs are set. Written
inside an `@for` — which is how anybody with a list writes it — each iteration is an embedded
view refreshed **whole**: template and host bindings together, one iteration at a time. Panel
one's host binding therefore runs before panel two's input exists, and a required input read
there does not return `undefined`, it throws.

There is no API for "has this input been set yet", and there could not be a useful one: the
answer changes inside a single change-detection pass. So the repair is the input's declaration
— `input<string>('')` with a default nobody sees, and a dev-mode report after the first render
for the consumer who really did leave it out. `label` stayed `input.required`, and the
asymmetry is the lesson in one line: **it is read from the strip's own template, one phase
later, where the ordering does not reach.**

What generalises: a component that publishes a signal derived from **all** of its content's
inputs cannot have that signal read from the content's own host bindings unless every input in
it has a default. It is not a rule about queries — the query is resolved and correct — it is a
rule about when an embedded view's inputs exist.

### <a id="lesson-125"></a>`lesson-125` — The testing tool's accessibility tree is not the browser's

Probing `hidden="until-found"` for [0045](decisions/0045-a-panel-nobody-chose-is-still-text-in-the-document.md),
Playwright's `ariaSnapshot()` reported the hidden subtree's heading and button **on webkit** and
not on chromium or firefox. Read as a browser fact that is a finding: it would mean a screen
reader on Safari walks the content of every tab panel that is not showing, and the whole
decision would have to be reconsidered.

It is not a browser fact. `ariaSnapshot()` is computed by Playwright's own injected script,
which implements the ARIA algorithm in JavaScript and decides visibility with its own rules.
Asking the **engines** instead gave one answer three times: `checkVisibility()` is `false`
inside such a subtree in all three, focus cannot enter it in any of them, and chromium's real
tree — `Accessibility.getFullAXTree` over CDP — holds no node for the heading at all, not even
an ignored one with a reason.

This is [`lesson-112`](#lesson-112) from the other side. There the attribute was written by us
and read by nobody; here the tree was read by us and written by nobody — a layer that looks
like the platform, answers like the platform, and is a library. The rule that falls out is
narrow and worth keeping: **a claim about what an engine exposes is measured with something the
engine computes** — `checkVisibility`, `getComputedStyle`, the focus that does or does not
move, CDP where it exists — and a tool's convenience view is evidence about the tool.

### <a id="lesson-126"></a>`lesson-126` — `overflow: auto` makes an element focusable in two engines of three

The tab strip scrolls, so it carries `overflow: auto`. Two e2e cases then failed on chromium
and firefox and passed on webkit — and the cause was in the test, which sent keys with
`locator.press()`. That call focuses the element first, and it succeeded: **the tablist took
focus**, the component saw `focusout` from the tab, and the walk was cleared before the key
arrived.

Measured across the three: blink and gecko let a container with `overflow: auto` take
programmatic focus — `focus()` moves the focus there — and webkit does not. It is not about
whether the element really scrolls: the horizontal strip in the sandbox does not overflow at
all and is focusable all the same in both.

The part that keeps it from being a defect is the second reading: `tabIndex` is `-1` on that
element in every engine, so it never joins the page's sequential tab order and a keyboard user
meets no extra stop. Both halves are now a test, because both are invisible from the markup —
nothing in the template asks for either, and the next person to wonder why a `press()` on a
scroll container behaves differently in Safari should find the answer written down rather than
measure it again.

### <a id="lesson-127"></a>`lesson-127` — A heading inside a `<summary>` survives, because a `<summary>` is not a button

The APG's accordion pattern wants each header to be a heading, so that a screen-reader user can
jump between sections with `H`. The obvious way to give a `<details>` one is to write the
heading inside the `<summary>` — and the obvious reason to expect that not to work is ARIA's
**presentational children** rule: the contents of a `role="button"` are flattened into its
accessible name, and a heading inside one is dropped from the tree.

Measured before the accordion was written, and it survives: chromium's own accessibility tree,
read through CDP, holds two nodes for `<summary><h3>Heading inside</h3></summary>` — a
`DisclosureTriangle` named "Heading inside" with `expanded`, and a separate `heading` at level 3. Playwright's `ariaSnapshot()` agrees in all three engines.

The reason is the half of the mapping that is easy to skip: a `<summary>` is **not** mapped to
`button`. Chromium calls it a disclosure triangle, and that role has no presentational-children
rule to apply. The lesson generalises past this one tag — "the children of a control are
flattened" is a fact about specific ROLES, and reading it as a fact about controls is what
would have cost this component the navigation the pattern exists for.

The reading that ships is the one taken in an engine, which is why the title is a real
`<h2>`…`<h6>` and not a `role="heading"` with an `aria-level`: the second was checked only in
the testing tool's tree, and that tree is not the browser's ([`lesson-125`](#lesson-125)).

### <a id="lesson-128"></a>`lesson-128` — `preventDefault()` is the only way to refuse a disclosure, and it takes the keyboard with it

The platform has no disabled `<details>`. There is no attribute, no property and nothing in the
element's IDL that says "this one does not open" — which is awkward for a library whose every
other control has a `disabled` input.

What works is one line, and it works because of how the element opens at all: `<summary>`'s
activation behaviour is a **click**, so cancelling the click cancels the toggle. Measured in
chromium, firefox and webkit: with a `click` listener that calls `preventDefault()`, the
section stays closed under the pointer — and under `Enter`, because `Enter` on a `<summary>`
arrives as a click too. One listener covers both, and there is no key map to keep in step with
the pointer.

What it does **not** do is take the section out of the accessibility tree or out of the tab
order, which is the reason to prefer it over the alternatives even if there were any: the
heading is still announced, still says whether it is open, and still carries `aria-disabled`.
A section nobody may open still names what is inside it — the argument `pct-tabs` makes for
`aria-disabled` over the native attribute, one component over.

The corollary is the part to watch: a section that is **open** when it is disabled stays open,
because refusing the press is all this does. That is the correct reading of "disabled" here and
it is the one arrangement in which a consumer can show a section the user may not close.

### <a id="lesson-129"></a>`lesson-129` — A page the browser is not rendering has a frozen clock, and every transition on it reads as broken

The drawer's slide looked stuck: the panel took `data-pct-open`, the more specific rule really
matched (`element.matches()` said so), the cascade really preferred it (`transition: none`
inline jumped the panel straight to `0`), and yet `getComputedStyle` reported the shut inset
for as long as anybody cared to wait. `element.getAnimations()` gave the shape of the answer —
a `CSSTransition` for `left`, `playState: "running"`, `currentTime: 0`, permanently.

The cause was not in the component. `document.visibilityState` was `hidden` and
`document.timeline.currentTime` was `0` and stayed `0`: the preview pane was not being
rendered, so no frame was ever produced, `requestAnimationFrame` never fired, and a transition
created in that state simply never advanced. `setTimeout` fires perfectly well in such a page,
which is what makes the trap convincing — a probe that waits and then reads gets an answer, and
the answer is the from-value.

Two rules come out of it. **Before believing a measurement of motion, ask the page whether it is
being drawn**: `document.visibilityState`, or two readings of `document.timeline.currentTime`.
Neither costs anything and either would have saved the hour spent proving a cascade that was
never wrong. And **anything about motion belongs in the e2e suite**, where three real engines
render for real — the same boundary [`lesson-13`](#lesson-13) drew for `getComputedStyle` in a
preview panel, one layer further down: there the styles were stale, here the clock is.

### <a id="lesson-130"></a>`lesson-130` — A state attribute lands when the motion starts, not when it ends

Six red cases in three engines, all of them a box measured in the wrong place: the drawer's
`left` read `-135.4` where `0` was expected, the bottom sheet's edge `855` where the viewport
ended at `720`. Both numbers are somewhere in the middle of a 150 ms slide.

The mistake is in the shape of the wait, and it is the kind that passes review because it looks
like a proper Playwright assertion:

```ts
await expect(panel).toHaveAttribute('data-pct-open', ''); // ← retries until the attribute is there
const box = await panel.evaluate((el) => el.getBoundingClientRect()); // ← reads one frame later
```

`toHaveAttribute` retries, so it feels like a settle. It is not: the attribute is what **starts**
the transition, so the assertion succeeds at the first frame of the motion and the reading that
follows catches the panel in flight. Nothing is flaky about it — it fails the same way every
time, on every engine, which is the only reason it was cheap to find.

What is being asserted is where the panel comes to **rest**, so the retry has to be around the
geometry itself: `expect.poll(() => box())`. The general rule is worth more than the fix — a
retrying assertion settles the thing it names, and naming the cause of a motion does not settle
its effect.

### <a id="lesson-131"></a>`lesson-131` — A clamp swallows the change it was written to correct

`pct-pagination` promises that a `page` written out of range is corrected and the correction
written back to the model. The effect that does it read one signal:

```ts
effect(() => {
  const clamped = this.current(); // ← the CLAMPED value
  untracked(() => {
    if (this.page() !== clamped) this.page.set(clamped);
  });
});
```

It worked for `page = 999` and did nothing at all for `page = 0` or `page = -5`. Two unit cases
found it on the first run, and the reason is the whole lesson: **a clamp is a many-to-one map,
and the effect was watching the image rather than the domain.** Standing on page 1, a consumer
writing `-5` leaves `current()` at `1` — unchanged, so the computed does not notify, so the
effect never runs, so the model keeps `-5` while the view shows page 1. `999` worked only
because it happened to move the result.

Reading `page()` inside `untracked()` is what hides it: the value the effect must react to is
read in the one place a read establishes no dependency. The fix is to track both, and it makes
the shape visible in the code —

```ts
effect(() => {
  const written = this.page(); // ← tracked: the domain
  const clamped = this.current(); // ← tracked: the image
  if (written === clamped) return;
  untracked(() => this.page.set(clamped));
});
```

The rule is wider than pagination and applies to every guard written as "correct it and write it
back": `Math.min`/`Math.max`, a `Set` that de-duplicates, a normaliser that lowercases, a parser
returning `null` for anything malformed. **What the effect must depend on is the input it is
correcting, not the corrected output** — an output that stays the same is exactly the case where
the correction is still owed. It is [`lesson-95`](#lesson-95)'s family seen from the signal
graph: a guard that cannot be reached, here because the thing that would wake it is the thing
it discards.

### <a id="lesson-132"></a>`lesson-132` — An apostrophe in a comment is a quote to a scanner, and the gate then names an innocent file

`check-texts` went red on `pagination.ts` with two "signal defaults are prose", and both quoted
values were nonsense — fragments of source text starting mid-word:

```
libs/components/pagination/src/pagination.ts:139: computed(…) → "s time; touching ends fold to nothing.\n      ...(siblingsStart > boundary + 2\n        ? (["
```

Point 4 reads a factory's argument as **text** and pulls its string literals out with a regular
expression, `/'((?:[^'\\]|\\.)*)'|"…"/g`. The argument of this `computed()` is a whole function
body, a body carries comments, and one of the comments said `wastes the reader's time`. That
apostrophe left the count of `'` odd, so the next quote in the **code** — the opening one of
`['ellipsis']`, two lines down — closed a literal that had begun in the prose. The captured
value was the source between the two, which reads as prose because half of it is: a capital, a
space, a sentence. The rule fired, correctly by its own logic, at a file that had done nothing.

Three things are worth keeping.

**A scanner over source text has no denominator until it knows what a comment is.** This is
[`lesson-77`](#lesson-77)'s shape once more and the same one open finding 4.1 describes for the
language gate: the limb that decides _what to look at_ was never measured, so anything it
reads wrongly is indistinguishable from something it approved. Here it erred loudly, which is
the good case — the reverse (a real prose default hidden inside a badly paired span) passes
green.

**The failure needs two authors to meet.** The comments and `'ellipsis'` were written in one
session and the gate was green; it went red when a later comment changed the parity of
apostrophes in the same argument. So the trigger is not "a file with a comment" but "a file
whose comment count of `'` happens to be odd" — which nobody can review for.

**The fix is a scanner, not a reworded comment.** `literalsIn()` walks the argument in four
states — code, line comment, block comment, string — and is thirty lines. Rewording the comment
would have been one line and would have left the trap for the next component, which is exactly
what open finding 4.13 records happening twice with `data-pct-selected`. The control is in
`_reference/`: the reference input now carries a comment with an apostrophe standing over a
`'sm'` in the code, and disarming `literalsIn` turns the reference red and moves **seven**
prepared cases onto the wrong rule.

### <a id="lesson-133"></a>`lesson-133` — A switch that turns a drawing off turns a behaviour off with it, and the three engines disagree about what is left

`appearance: none` is how you get permission to paint a form control. On a `<progress>` it also
withdraws the engine's indeterminate animation — and what stands there afterwards is not
"nothing" but three different things:

| engine   | `<progress>` with no `value`, `appearance: none`, value part painted |
| -------- | -------------------------------------------------------------------- |
| Chromium | an EMPTY groove — `::-webkit-progress-value` has no width            |
| WebKit   | an empty groove, the same                                            |
| Firefox  | a FULL groove — `::-moz-progress-bar` keeps its width                |

So the same two declarations say "nothing has happened" in two engines and "it is finished" in
the third, about a bar whose whole message is that nobody knows. A component that shipped after
testing in one browser would be wrong in the other two and would look right in all three
screenshots taken by its author.

Two things generalise past this component.

**A property that removes a drawing can remove a behaviour.** `appearance` reads like a paint
switch and is a switch on the whole UA widget: the animation lived in the same shadow tree as
the colours. The question to ask of any `appearance: none` is therefore not "what do I have to
repaint" but "what did this element DO that nobody wrote down" — the answer here was the one
thing the element was chosen for.

**"The platform does it" and "the platform draws it" are two claims, and only the first is
free.** This library takes the first wherever it can
([`req-api-platform`](requirements/api.md#req-api-platform)) — and the second is what
[0049](decisions/0049-a-progress-bar-is-the-platforms-element-under-our-paint.md) had to buy
back element by element: a fill that is a sibling because a `<progress>` renders no children,
and a pseudo-element that was not an option because `progress::before` paints in two engines
and not in Firefox. The semantics stayed the platform's; only the paint moved.

### <a id="lesson-134"></a>`lesson-134` — Forced colours keep a background colour and drop a gradient, so what a state is painted WITH decides whether it survives

Two ways to draw a moving band along a groove, indistinguishable in a screenshot:

```css
.band {
  background: var(--pct-progress-fill-bg);
} /* an element */
.track {
  background-image: linear-gradient(90deg, …, #0b5fd0, …);
} /* a gradient */
```

Under `forced-colors: active` the first can be given a system colour and paints; the second is
**gone**. The mode forces author background colours to the user palette and forces
`background-image` to `none` for every value that is not a `url()` — a gradient is one of
those. Measured in the probe: the gradient band came back as an empty outlined groove, while
the element band with `background: Highlight` came back painted in all three engines.

The reading that matters is not "avoid gradients". It is that
[`req-a11y-forced-colors`](requirements/a11y.md#req-a11y-forced-colors) is usually stated as a
rule about COLOUR — do not carry a state by colour alone — and this is the same requirement one
level lower, about the PROPERTY the colour is carried in. A state painted in a background
colour has a system colour to fall back to; the same state painted in a gradient, a shadow or
an image has nothing, and the fallback cannot be written because the declaration itself is
dropped. So the mode is a filter on the drawing technique before it is a filter on the palette.

The neighbouring measurement is worth keeping too, because it is [`lesson-70`](#lesson-70) met
from a new side: a forced-colours rule written ABOVE the base rule it corrects loses the
cascade and paints nothing, and the failure looks exactly like "the browser dropped my colour".
Both readings in the probe that produced this lesson were of that kind before they were of any
other kind.

### <a id="lesson-135"></a>`lesson-135` — A spy on an already-spied method is the same spy, so a per-case spy without a restore is one spy for the file

Three cases in `progress.spec.ts` failed with a number nobody could account for:
`expected "warn" to not be called at all, but actually been called 3 times` — in cases that
render a bar which HAS a name and cannot warn.

Three is the number of earlier cases in the file that render the nameless bar on purpose.
`vi.spyOn(console, 'warn')` over a method that is already spied does not install a second spy:
it hands back the first one, history and all (measured — a second `spyOn` inside one case is
`===` the first). So a spy created per case and never restored is **one spy for the whole
file**, and `expect(warn).not.toHaveBeenCalled()` stops being a statement about this case.

What makes it worth a lesson rather than a fix is which way it fails. The sharing turns
"was not called" into a claim about the whole file, so the assertion gets **stricter** and
fails loudly — this time. Its mirror image is the quiet one: `toHaveBeenCalledWith(…)` passes
on a call some earlier case made, and a component that stopped warning altogether keeps a green
test. Same shared object, same missing `restoreAllMocks`, opposite symptom.

The fix is one line — `afterEach(() => vi.restoreAllMocks())` — and the general rule is the
one this repository keeps re-learning about denominators: a measurement whose SCOPE is
implicit measures whatever the harness happens to hand it. The date field's own warning case
sidesteps this by declaring the spy inside the single case that uses it, which works right up
until a second case in the same file wants one.

### <a id="lesson-136"></a>`lesson-136` — A placeholder measured in `1lh` holds exactly the space the text will take, and one measured in pixels holds a guess

Every skeleton component in the wild is built out of numbers somebody chose: a bar 16 px tall,
a gap of 8, a last line at 60%. The first two are the interesting ones, because the browser
already computes both and has done since 2023:

| unit   | what it is                     | measured at `font-size: 32px; line-height: 1.5` |
| ------ | ------------------------------ | ----------------------------------------------- |
| `1lh`  | the element's own LINE BOX     | 48 px in chromium, firefox and webkit alike     |
| `1em`  | the font size                  | 32 px                                           |
| `1cap` | the height of a capital letter | 22.84 px (firefox 22.850 — a font metric)       |

The reading that matters is the one below the table. A `<p>` of three lines in that same type
is **144 px**; a stack of `1lh` rows is 48 px a row — 192 px for the four the probe drew, and
144 for three. The same number in all three engines, because it is the same arithmetic done
twice. So a skeleton whose rows are line boxes holds exactly the space the text will occupy:
measured on the sandbox's own card, the region is **57 px with the placeholder and 57 px with
the answer**, and the page does not move when the content lands.

A token in pixels cannot do that, and the reason is not precision but SCOPE: `--pct-skeleton-
line-height: 16px` is right at the one font size it was chosen for and wrong in a heading, in a
caption, and in every application that sets its own type. The same goes for the gap between the
lines, which is the sharper half — there is no gap. What stands between two bars is the
LEADING the line box already has, so a component that centred a `1cap` bar in a `1lh` row has
nothing left to choose.

`cap` is the one to watch: it comes from the font's own metrics, so the three engines agree to
about a hundredth of a pixel and not exactly (22.84375 against 22.850006). An assertion on it
has to be a proportion — shorter than the line, taller than half of it — and never an equality.

### <a id="lesson-137"></a>`lesson-137` — `overflow: hidden` takes focus in no engine, where `overflow: auto` takes it in two of three

[`lesson-126`](#lesson-126) measured that a scrollable box is focusable in chromium and firefox
and not in webkit. The skeleton needed the other half of that measurement, because its bar
clips a travelling sheen and the whole component is `aria-hidden`: an element that is hidden
from the accessibility tree and reachable by the keyboard is axe's `aria-hidden-focus`, which
is the one violation this component could cause.

Probed on a bare page, one overflowing child each, `Tab` from the button before them:

| box                | chromium        | firefox         | webkit        |
| ------------------ | --------------- | --------------- | ------------- |
| `overflow: auto`   | focused, in Tab | focused, in Tab | not focusable |
| `overflow: hidden` | not focusable   | not focusable   | not focusable |
| `overflow: clip`   | not focusable   | not focusable   | not focusable |

So the rule the engines implement is about SCROLLABILITY and not about clipping: a box a user
could scroll is given a way to scroll it, and a box that merely cuts its content off is not a
scroll container at all. `hidden` is the odd one in the CSS specification — it is scrollable
programmatically — and no engine treats that as a reason to focus it.

What the pair of lessons is really about is that "make it clip" and "make it scroll" are one
declaration apart and one requirement apart. The first is safe inside a hidden subtree; the
second turns the same subtree into a violation in two engines out of three, and the visible
result — content cut off at the box's edge — is identical in both.

### <a id="lesson-138"></a>`lesson-138` — An empty `list` passes the audit that fails an empty `listbox`, so the machinery has to be sized to the exact role

The chips container was designed with its role conditional — `role="list"` while it holds
chips, nothing when the row empties — because the nearest precedent said so: an empty listbox
is a **critical** axe violation (plan 4.8, `aria-required-children`), and the ARIA grammar
gives `list` the same required owned elements (`listitem`). The hypothesis: same grammar, same
violation, so the empty row needs the role taken off.

Probed before anything was written — a bare page with a `role="list"` holding zero items,
beside one holding custom elements with `role="listitem"`, through the same axe build the
audits run:

| arrangement                                    | chromium | firefox | webkit |
| ---------------------------------------------- | -------- | ------- | ------ |
| `role="list"`, zero children                   | clean    | clean   | clean  |
| custom-element children with `role="listitem"` | clean    | clean   | clean  |

Axe enforces required children per ROLE, not per grammar family: `aria-required-children`
carries an explicit carve-out for `list` (and a few others) precisely because an empty list is
an ordinary state of real pages, while an empty `listbox` is a select promising choices it
does not have. The conditional role would have been machinery against a violation nobody can
measure — a computed binding, its unit cases, and a mutant surface, all guarding nothing.

The rule: a precedent from a NEIGHBOURING role is a hypothesis, not a constraint. The audit's
grammar is per-role with carve-outs the specification's grammar does not show, so the probe
has to name the exact role it stands on — and the cheapest line of code is the one a
measurement deleted before it was written.

### <a id="lesson-139"></a>`lesson-139` — WCAG 2.5.8's inline exception ends where the sentence does, and axe measures the bar you thought was typography

The breadcrumb's links were designed as text — 16px tall, spaced by the trail's own gap —
on the strength of the target-size rule's inline exception: a link inside a sentence is
constrained by the line it stands in, and no floor applies. The axe audit disagreed in all
three engines: `target-size` (serious) on every link of the WRAPPED trail, with 18px of safe
space where 24px is owed.

The exception covers targets whose size the SURROUNDING TEXT constrains — a link in a
paragraph. A navigation bar constrains nothing: the trail is a flex row of standalone
targets, its line height is its own choice, and once it wraps, the second row is a
neighbouring row of targets at whatever distance the gap token puts it. Axe reads the
arrangement, not the intention — typography-shaped controls are still controls.

The fix is the chips' arrangement at a quieter control: the shared `{pct.target.min}` floor
outright on the link's block size (`req-a11y-touch`), with the word centred in the target it
earns. The rule: an exception in a success criterion names a CONTEXT, not a look — before
leaning on it, measure whether the context is really the one the exception describes,
because the audit will.

### <a id="lesson-140"></a>`lesson-140` — A `listitem` computes no name from its contents, so what a reader "hears" is measured as content, not as accessible name

The stepper's done-suffix test was written with `toHaveAccessibleName(/Cart Completed/)` —
and received the empty string in all three engines, on a listitem whose text plainly held
both words. Nothing was broken: the accessible name computation only runs name-from-content
for roles that support it (buttons, links, headings…), and `listitem` is not one of them.
A list item has no NAME; a reader simply walks its CONTENT.

The consequence for tests: "what does a reader get" has two different measurable shapes,
and the role decides which one applies. For a control (`role="link"`, `role="button"`) the
accessible name is the contract — separators and drawings polluting it is the defect to
probe for (the breadcrumb's reading). For a container (`listitem`), the contract is the
text content in reading order — the suffix after the label, the drawings contributing
nothing. Asserting the name there measures the absence of a computation and calls it the
component's silence.

### <a id="lesson-141"></a>`lesson-141` — Playwright's visibility is not the platform's `checkVisibility()`, and `content-visibility` is where they part

The tree's folded branch hides as `hidden="until-found"`, which the stylesheet turns into
`content-visibility: hidden` wherever the property exists (the tabs' arrangement). The e2e
assertion `toBeHidden()` on a child of that subtree passed in Chromium and Firefox — and
received "visible" in WebKit, on a child the engine demonstrably does not paint: the
probe's `elementFromPoint` over the child's box lands on `<html>`, and the platform's own
`checkVisibility()` answers `false` in the same engine.

The two verdicts differ because they model different things. The locator heuristic reads
boxes and a handful of styles, and an element under a `content-visibility: hidden`
ancestor still HAS a geometric box — it is the rendering that is skipped, not the layout
object. `checkVisibility()` is the platform answering the actual question, ancestors
included, and it agrees with the paint in all three engines.

The rule: when a hiding mechanism is newer than the test tool's visibility model, assert
with the platform's own verdict (`checkVisibility()`, `elementFromPoint`) rather than the
tool's — and record which engine would have shipped a green lie otherwise.

### <a id="lesson-142"></a>`lesson-142` — A bare file name reaches a file only while the name is unique, and the first copied app tree ends that

The reach gate resolves a mention three ways, and the weakest is the bare name: a token
with no slash counts as a mention only when exactly one tracked file carries that name.
The day `apps/docs` copied the sandbox's conventions — `index.html`, `favicon.ico`, the
vendored `InterVariable.woff2` with its licence — every one of those names stopped being
unique, and the gate reported **eight** unreached files at once: the four new copies AND
the four originals, whose reach had silently ridden on uniqueness the whole time. Nothing
about the sandbox changed; its files went dark because a second application exists.

The walker's own comment had named the hazard in advance ("a copied tree is exactly the
case where names stop being unique") — what the day added is the measured shape of the
failure: it is not the copy that goes unreached, it is BOTH sides, and the red arrives in
a commit that touched neither. The fix is the durable form: each application's
`project.json` now names its convention-found files by full path in a `"// conventions"`
comment, so the reach of `index.html` and the public assets no longer depends on how many
applications the workspace holds.

The rule: a bare-name mention is a loan against every future copy of that name. When a
file is found by a tool's convention rather than by a path in code, anchor it by full
path from something reached — the third application should cost a comment, not a debug
session.

### <a id="lesson-143"></a>`lesson-143` — A scoped formatter on a clean tree formats nothing, and a green battery says nothing about it

The day 2.1 closed, every commit had gone out over eighteen green gates — and the push
still turned CI red in under three minutes, on the one step the battery does not
contain: `nx format:check`. Twenty-seven component cards had been rewritten by a script
(the "docs page" sweep of 2.1.7) after the day's last real prettier pass, and the
closing ritual, `nx format:write`, reported nothing to do. Not because the files were
clean — because the write was **scoped**: with everything committed, the affected set is
the uncommitted set, and on a clean tree the ritual is a silent no-op that looks exactly
like a blessing.

The check is scoped on CI too (the SHAs action hands it the range since the last green
run), which is how the residue accumulates: `--all` locally surfaced three files
**outside** the pushed range — `libs/components/tabs/src/tabs.scss`, its spec, decision
0045 — each blessed by the CI run that landed it and dirty under today's prettier. A
scope-blind spot does not stay where it started; it waits in files nobody is touching
and bills whoever touches the area next.

The rule: a formatter that takes a scope is run with the scope written out — before any
push, `nx format:check --all`, because the gate battery does not run the formatter and
CI opens with it. And a script-made sweep is an edit like any other: it goes through
prettier before its commit, not at an end-of-day ceremony that may be looking at an
empty range.

### <a id="lesson-144"></a>`lesson-144` — A box that overhangs a scroll container by one pixel is a scrollbar

The tabs' strip is a scroll container by design — a row of tabs scrolls rather than
wraps — and the chosen tab's edge was pulled onto the strip's rail with a one-pixel
negative margin, "to make one line out of two"; the stylesheet's own comment said so. What
the browser did with it: the tab's box overhung the strip's content box by that pixel, an
overhang inside `overflow: auto` is scrollable content, and every strip on the site carried
a one-pixel scrollbar across its own axis. At rest the overhanging pixel was hidden, so the
edge read one pixel thin; scrolled, it read two — the reviewer's exact words, "the
underline gets thicker", from the docs site's Preview panel.

Two suites had looked at the strip and neither saw it: the baselines froze the resting
state, and no assertion asked whether a scroll container scrolls across its own axis. The
fix draws the edge inside the box — above the rail, not on it — and the spec now asks the
question outright: along its axis a strip may scroll, across it never.

The rule: inside a scroll container a negative margin is not a drawing trick, it is
content, and one pixel of it is a scrollbar. When a decoration must overlap a neighbour's
edge, overlap from INSIDE the box or accept adjacency — and give every scroll container a
test that names the one axis it is allowed to scroll on.

### <a id="lesson-145"></a>`lesson-145` — A container query answers for an ancestor, never for the element that asks

The component page's three columns were to answer the width of the column they stand in,
not the viewport's — the reviewer had caught the sketch's columns arriving too early, and a
viewport query cannot know whether the rails are there. The first cut put `container` on
the grid itself and asked `@container` about it in the same rule: the grid stayed a single
column, the index rail was told to show, and the first baseline held the whole component
index laid across the page above the content. Nothing in the build objected; a query that
names the element it sits on simply never matches, because an element is not inside its
own containment.

The picture was the only reader that noticed, one screenshot into the work — the same
service the baselines rendered for the tabs' edge (lesson-144) and the landing's counts.

The rule: the element carrying `container` is never the subject of its own `@container`;
put the containment on the ancestor whose width is the question — here the library's
column — and query from the descendants. And regenerate the picture BEFORE reading the
suite's verdict: a baseline is the fastest look at a layout there is.

### <a id="lesson-146"></a>`lesson-146` — Inline-size containment makes a box's intrinsic width zero, and a column in a parent sized by its content collapses to its gutter

The container's stylesheet called `container-type: inline-size` free: "costs nothing here
and turns the host into the ruler its content can measure against". It is free exactly as
long as the column is sized by its parent — block flow, a grid track with a length — and
that was the only place the sandbox and the landing had ever put it. The docs site put the
demo on a stage that centres its children with flex, and the reviewer saw the first demo of
the container "terribly narrow": measured, 80 px of an 810 px row, the paragraph inside at 0. Size containment on the inline axis means the box reports no content when a
shrink-to-fit context asks how wide it wants to be — a flex item, a float, an inline block,
an `auto` grid track — so the parent shrinks to the column's gutter and nothing else.

The first fix tried `inline-size: 100%` on the column and measured the same 80 px: a
percentage resolves against the parent, the parent is sized by the column, and in that
cycle the percentage counts as nothing. No declaration on the column can undo what
containment does to its intrinsic size — the width has to come from OUTSIDE. The demo's
host now states it (`inline-size: 100%` of the stage, which is definite), the card names
the contract in its limitations, and the rig holds both halves: a bare column in a flex row
that collapses, and one whose parent states the width and that keeps the row up to its cap.

The same trap has a second half in grid and flex: the column centres itself in block
flow with `margin-inline: auto`, and as a grid or flex ITEM those auto margins mean
"absorb the free space" — the item shrinks to its intrinsic size, which containment has
already made zero. A grid host wide enough for the column measured its columns at 80 px
all the same. The wrapper is the answer in both layouts: a plain block is the item, the
column is a block inside it.

The third face needs no containment at all. The grid's `repeat(auto-fit, minmax(…, 1fr))`
counts its tracks against the container's width, and when that width is not definite —
the same flex stage, the demo host shrink-wrapped — the specification says the list
repeats exactly once. The reviewer asked what tells a grid from a stack, because the two
pages showed the same picture: one column of cards, measured at 70 px in a 287 px stage,
and the grid's example at 99 px with one track. Nothing was wrong in either component; the
stage had asked "how wide do you want to be" and a grid that answers by counting has no
answer. The demo hosts state their width now, and the stage centres what is smaller.

The rule: `container-type` is never free — it takes the box's intrinsic size away. A
component that opts into containment is a block-flow element by contract: its parent
states the width, it caps it, and in a grid or a flex row a block wrapper is the parent.
Say so in the card, and measure the collapse as well as the remedy, so the sentence stays
true the day somebody "fixes" it. And on a stage that centres by shrink-wrapping, a layout
demo — anything that measures, counts or caps — states its own width; only what is small
by nature is left to the stage.

### <a id="lesson-147"></a>`lesson-147` — A part-dressing rule scoped by the shared part name leaks onto every projected component that parts the same name

The component page's Preview / Code switch is the library's own `pct-tabs`, dressed as a
segmented pill through the one hook a consumer's stylesheet also has — the parts, styled
globally because they live inside the component's emulated scope. The rule read
`.hero .docs-switch [data-pct-part='list'] { … a 6% pill, 10px radius, 3px padding … }`,
one class more specific than the component's own rules, and it looked right because on the
switch it was right.

But the switch is not just chrome around the stage — the stage is INSIDE the switch's own
Preview panel. So a DESCENDANT selector from `.docs-switch` reaches whatever the demo
renders: and a part name is a shared vocabulary, not a private one. A breadcrumb parts its
trail `list`; the rule dressed the trail as a segmented pill, and with only 3px of padding
the reviewer saw the text hug the rounded edge and asked for "padding in this place" — the
padding of a control the breadcrumb was never meant to be. A tabs demo parts a `list` that
is itself a `tablist`, so even a `[role='tablist']` guard could not tell the demo's list
from ours; it wore the pill too, showing the docs' switch instead of the library's tabs.

The fix is to scope by STRUCTURE, not by the shared name: `.docs-switch > [data-pct-part='list']`
— a direct child. The switch's own list is a child of the switch; a demo's list is always
deeper, behind a `[data-pct-part='panel']`. The child combinator costs no specificity and
draws the line the part name and the role both failed to.

The rule: when a global stylesheet dresses a component through its parts, and that dressed
component contains a stage that projects OTHER components, the part name is not a selector
— it is a word those components share. Reach the instance you mean by where it sits, not by
what it is called, or the dressing lands on every namesake the stage happens to hold.

### <a id="lesson-148"></a>`lesson-148` — A component's token overrides, set on a host that contains a projected instance of the same component, inherit into it

[`lesson-147`](lessons.md#lesson-147) is a selector reaching too far; this is its twin
through a different door. The Preview / Code switch is `pct-tabs` dressed as a segmented
pill, and the honest way to dress a component is through the tokens it exposes — set
`--pct-tabs-tab-border-selected: transparent`, `--pct-tabs-tab-bg-hover: transparent`, and
a dozen more on the switch, and the pill has no underline and no hover, exactly as a
segmented control should not.

Those overrides sat on the switch's host (`.hero__tabs`). A token is a custom property, and
custom properties INHERIT — down the DOM, across every component boundary emulated
encapsulation puts up, because encapsulation scopes selectors and not the cascade of
inherited values. The switch's Preview panel holds the stage, the stage projects the tabs
demo, and the tabs demo is `pct-tabs` too. So it read the switch's `--pct-tabs-*` off its
inherited environment and rendered as the switch: no chosen edge, no hover, just text. The
reviewer saw the first demo "has nothing on it" while the examples below — outside the
switch's subtree — kept their underline.

The fix is to set the overrides where they reach the switch's own tabs and stop: on the
switch's own tablist (`.docs-switch > [data-pct-part='list']`), not on the host above the
panel. The tablist's tabs are its children and inherit them; the panel is its sibling and
does not. The list-level tokens (`--pct-tabs-list-border`, `-gap`) are read by the tablist
itself, which is fine — an element resolves a custom property it declares on itself.

The rule: styling a component through its tokens is correct, but a token set on an element
rains down on every descendant, projected content included. When the dressed component
contains a stage that projects instances of THE SAME component, set the overrides on the
inner element that only the dressed instance owns — never on a host the projected copies
sit beneath. Selectors are scoped by encapsulation; inherited custom properties are not
([`lesson-147`](lessons.md#lesson-147) is the selector half of the same nesting).

### <a id="lesson-149"></a>`lesson-149` — Two equal readings are not stillness: a scroll comes to rest in frames, not in round trips

The modal's scroll-lock case was flaky in webkit alone — one failure in nine runs (three
engines, `--repeat-each=3`), `Expected: 350, Received: 400`. The number the assertion
compared against was not a literal: the case wheels the page, opens the dialog, reads the
offset the lock is holding and asserts a second wheel does not change it. So the reading
itself was wrong, and the lock — which was holding — took the blame.

What a frame-by-frame log of `window.scrollY` says, taken in the page at 1280×500 on the
sandbox's dialog view: a wheel of 400 px is an ANIMATION in webkit, twelve frames and some
190 ms from the first pixel to the last, and its tail crawls — 384, 393, 398, 400. The
scroll-into-view that `element.focus()` does is the opposite, a single frame: 400 → 128
between two consecutive samples, because the opener sits above the fold once the page has
moved. Both were in flight at once, since the case opened the dialog while the wheel was
still running.

The helper that read the offset polled `scrollY` every 100 ms and returned the first value
it saw twice. That is a claim about two moments and not about the interval between them:
where the animation crawls by single pixels, one value stands across both round trips, the
helper reports "stopped" at 350, and the page arrives at 400 a moment later — inside the
window in which the lock is supposed to hold everything still. Counting the stillness in
the page's own frames instead (twenty unchanged `requestAnimationFrame` samples, a third of
a second) makes the same question answerable, and letting the wheel come to rest BEFORE the
dialog opens leaves one scroll to talk about instead of two.

The case now says both things out loud: it reads the room left below the offset the lock is
holding, and the reading after the dialog closes is the control for the one before it. With
the lock taken out of the service on purpose, all three engines carry the page 400 px past
the offset it was holding — 528 against a held 128 — so the equality is not passing on a
page that had nowhere to go.

The rule: stillness is a property of an interval, so measure it where the frames are — a
run of unchanged frames inside the page, not two round trips that happen to agree — and let
synthetic input settle before the thing under test starts. And when the assertion is "this
number did not change", measure the room the number had to move in: at the bottom of a
document, or on a page that does not scroll at all, an equality like that is free, and it
passes just as well on a component that does nothing.

### <a id="lesson-150"></a>`lesson-150` — `content-visibility: hidden` hides the contents; the box, and its padding, stay

A panel nobody chose is `hidden="until-found"` so find-in-page can still search it
([0045](decisions/0045-a-panel-nobody-chose-is-still-text-in-the-document.md)), and the
stylesheet keeps that state OUT of `display: none` on purpose — the browser hides such a
subtree with `content-visibility`, which does nothing to a box that is not rendered at all.
What was never checked is what a box with hidden contents is still worth. Measured on the
documentation site: `getBoundingClientRect().height` on the panel nobody chose returned 24,
which is the panel's own `padding-block` twice over. The property skips the CONTENTS of the
element; the element goes on generating a box, and the padding is the box's.

So every unchosen panel was quietly adding its padding under the chosen one. One spare
panel on the component page's Preview / Code switch, 24px; the sandbox's segmented fixture
carried two, 48px of nothing under a strip 264px tall once it was gone. Nobody saw it as a
defect because it does not look like one — it reads as a stage with generous room below,
which is exactly how the reviewer described the panel before asking for it to be shorter.

The rule: when a hiding mechanism is chosen for what it PRESERVES — searchability, the
element's place in the document — measure what else it preserves. `display: none` takes the
box and the padding with it and needs no second thought; every hiding that stops short of
that leaves geometry behind, and geometry with no content in it is space nobody asked for.
The fix is one declaration beside the mechanism (`padding-block: 0` under the same
`:host([hidden='until-found'])`), and the padding comes back with the attribute the moment
find-in-page reveals the panel.

### <a id="lesson-151"></a>`lesson-151` — Encapsulation scopes a selector to a COMPONENT, not to an instance: a component that can hold itself must reach its parts by structure

The reviewer's screenshot of the documentation page: the Preview / Code switch is
`variant="segmented"`, and the tabs demo running on the stage inside it — a plain
`variant="underline"`, the default — was drawn as a segmented strip too. The variant input
was right, the attribute was on the right host, and the sheet was doing exactly what it said.

Emulated encapsulation writes one `_ngcontent` attribute per COMPONENT DEFINITION, not per
instance, so both strips' elements carry the same one. `:host([data-pct-variant='segmented'])
.pct-tabs__list` therefore compiles to a selector that matches any `.pct-tabs__list` **inside**
a segmented host — including the list of another `pct-tabs` a panel holds. And it wins:
(0,2,1) against the (0,1,0) of the unqualified base rules the inner instance's own stylesheet
lays down. Nothing about that is a bug in Angular; it is what a descendant combinator asks for.

This is [`lesson-147`](lessons.md#lesson-147) one level in. There the site reached a library
part by name and dressed whatever a demo rendered; here the library reached its own parts the
same way, and the site was merely the first page to nest one strip in another. Same shape a
third time in [`lesson-148`](lessons.md#lesson-148), through inherited custom properties. The
constant is nesting: every one of the three was invisible until an instance of a component
stood inside an instance of the same component.

The rule: in a component whose content is the consumer's — anything with an `<ng-content>` —
a rule keyed on the host's own attribute must reach its target with CHILD combinators
(`:host([…]) > .list > .tab`), never by descent. `>` says the thing the rule means, which is
"this host's own strip", and it puts an instance a panel holds out of reach by structure
rather than by luck. Measured blast radius the day this was fixed: 34 such rules in six
other stylesheets that project content, none of them yet nested by anybody. The regression
case is the segmented assertions negated on the inner strip, and it fails on the descendant
selector restored — `rgba(0, 0, 0, 0)` expected, the track's `rgb(241, 245, 249)` received.

### <a id="lesson-152"></a>`lesson-152` — A click returns before the panel it opened has taken focus, and the key pressed on that round trip goes to the opener

The date panel's "writes the day it is given and closes" was flaky in chromium alone — one
failure in a full sandbox run of 1692 cases across three engines, `Expected "28/08/2026"`,
`Received "27/08/2026"`, and six of six green when the case was re-run on its own. So the
component was writing the day it was given; the case was asking before there was anybody to
ask.

The panel takes focus one RENDER after the click, not one round trip. `focusCursor()` is called
from an `afterRenderEffect`, because the grid the panel opens on does not exist until the
overlay has drawn it. Playwright's `click()` resolves when the click has been dispatched, which
is strictly earlier — nothing in the protocol waits for a framework's next render.

Measured on chromium, the page freshly visited and the toggle clicked forty times: at the
instant `click()` returned, focus stood on the TOGGLE 26 times and on the day cell 14, and the
cell needed a further 6 to 93 ms to take it. Two openings in three therefore pass through a
state in which every key the grid owns is dead, and the only thing that usually saves the next
line is that `keyboard.press()` is itself a round trip — one that usually, not always, outruns
what is left of that window.

The pairing is the proof. Twenty openings with the key dispatched INSIDE the page, with no
round trip to hide behind: 18 reached the day cell and wrote `28/08/2026`, 2 reached the toggle
and wrote `27/08/2026`. Where the key went predicts the value with no exceptions, and the value
it predicts for the toggle is the number the failing run reported.

The fix is one line, and it is what [`lesson-149`](lessons.md#lesson-149) reached for from the
other side: assert the real state before acting, rather than trusting a round trip to have
meant something. The case asks where the cursor IS — `await expect(cursorOf(page)).toBeFocused()`
— before asking it to move, which is what its neighbours in the file already did. This was the
one case in the block that clicked and pressed in the same breath.

The rule: an opening that moves focus asynchronously makes the click's resolution and the
panel's readiness two different moments, and a key sent between them is not late — it is
delivered somewhere else, to a listener that has no opinion about it. Nothing reports that: the
key is simply gone, and the assertion downstream blames the component. Wait for the element that
will RECEIVE the key to hold focus, never for the click that is supposed to give it.

### <a id="lesson-153"></a>`lesson-153` — A key pressed where the handler cannot hear it proves the opposite of what the case claims: the drawer's `closeOnEscape=false`

[`lesson-152`](lessons.md#lesson-152) is a key that arrives too early and makes a case FAIL for
the wrong reason. This is the same key arriving in the wrong place, and it is worse: the case
PASSES for the wrong reason, so nothing ever reports it.

The sweep that followed 150 read every `page.keyboard.*` in the forty-four e2e specs against the
step before it, and probed the seven openings where the answer was not settled by construction —
twenty openings each, in all three engines, sampling `document.activeElement` at the instant the
test would have pressed its key. Six were already sound and identically so in every engine: the
menu's first item, the popover's panel, the select's trigger, a tree item, a tab, and the date
panel's day cell, 60 of 60 each. `locator.focus()` is synchronous and a click lands on what it
hits, so only an opening that moves focus by a later render is exposed at all.

The seventh was `body`, 60 of 60: the drawer's `closeOnEscape=false` case. The drawer binds
`(keydown.escape)` on its OWN host, deliberately — the page behind a non-modal panel keeps every
other Escape ([0031](decisions/0031-a-panel-s-tab-order-belongs-to-its-trigger.md)) — and the
bare drawer of the sandbox holds no cross, no link and nothing else focusable, so `bare.click()`
focused nothing and the press went to `body`. The handler never ran. The drawer stayed open
because the key went missing, and `closeOnEscape` was never read.

The proof is a flip. With `[closeOnEscape]="true"` on that same drawer, the old case passed
3 of 3 across the three engines — green on the exact opposite of what its title claims. The case
was a second copy of its own neighbour, which already establishes for another drawer that an
Escape from outside is left alone, with real keys and both halves.

The case now dispatches the key AT the host, which is where the binding is, and stands a control
in front of it: the same dispatch on the drawer that does answer Escape closes it. Against the
flip, the case fails. The rule: a case about a handler must put the event where that handler
listens, and the way to know it did is a control in which the same delivery produces the opposite
outcome — otherwise "nothing happened" is indistinguishable from "the feature worked", which is
[`req-axis`](00-axis.md) read on the keyboard.

### <a id="lesson-154"></a>`lesson-154` — A generated file the hasher cannot see is a build that goes stale without ever going red

The site's /trust page said 151 lessons out of a file holding 153, and nothing was wrong
anywhere a gate could look: `docs/lessons.md` had the entries, the content pass reported 153,
the generated payload on disk carried `"id": 152` and `"id": 153`, every gate was green, and
the e2e case that reads the page failed in all three engines against a page that could not
say where its own number came from.

Two separate mechanisms had to be told apart, and the first attempt blamed the wrong one.

The one that produced the red was Playwright's `reuseExistingServer: true`. A dev server had
been running on the port since hours earlier — started by hand to look at the page — and the
suite attached to it instead of starting its own, so it measured a bundle built before the
content changed. The suite never built anything; the reading was about a machine, not about
the code, exactly as [`lesson-149`](lessons.md#lesson-149) says about stillness.

The one underneath it is real and was found by looking: `docs:build` declared
`inputs: ["production", "^production"]`, and the content pass writes into
`apps/docs/src/generated/`, which is **gitignored**. Nx hashes the workspace's files through
a map that honours `.gitignore`, so those files are invisible to the hasher; `production`
names none of them, and `^production` reaches dependency PROJECTS, not the `content` task of
the same one. Measured, twice, with a probe lesson appended and removed: before the fix, a
new lesson re-ran `content` and then RESTORED a cached bundle over its output — the built
page stayed at 153 with a probe that should have made it 154, replaying a bundle timestamped
minutes earlier. With `{ "dependentTasksOutputFiles": "**/*", "transitive": false }` in the
build's inputs, the same probe rebuilt and the page read 154, and removing it rebuilt back to 153.

The rule: when one task's OUTPUT is another task's SOURCE, say so in the inputs — a
`dependsOn` orders the two but does not tie their hashes together, and a generated directory
that is gitignored is invisible to the hasher no matter how many things read it. The failure
mode is the quiet one: not a broken build, but a correct build of yesterday's data, served
under today's gates with every one of them green.

### <a id="lesson-155"></a>`lesson-155` — A screenshot freezes the animation, not the class that starts it

The landing's visual baseline went red in a full-suite run and green on its own, minutes
apart, against a picture nobody had touched. The diff named the difference precisely: the
evidence strip's five facts, each **36px** off — the first one left, the second right, the
displacement the reveal starts from. One capture had the facts where they arrive, the other
where they set out, and both were honest pictures of the page.

`toHaveScreenshot` disables animations, and that is exactly as far as it goes: it
fast-forwards what is already running. The strip's arrival is not running at load — it waits
on a class an `IntersectionObserver` adds a task later, and a shot taken before that task is
two identical frames of a page that has not started moving. Under a loaded machine that task
lands late; on a quiet one it lands first. The baseline recorded on the quiet run then reads
as the truth, and the flake ships with a green commit — which is how this one shipped.

The fix is to take the picture where the race does not exist: every baseline now visits with
`reducedMotion: 'reduce'`, and the reveal never arms, because the page's own rule is that
less motion means the facts are simply present ([`lesson-151`](lessons.md#lesson-151) is why
they are present rather than faded in). The proof that this **pins** the state instead of
choosing a new one is that not a single pixel was re-recorded: the committed baselines passed
twelve of twelve with three repeats, in both themes, unchanged.

The rule: a still cannot hold a state that JavaScript has yet to write. When a picture and a
motion meet, take the picture in the mode that has no motion — and leave the arrival to the
test that can wait for it, which is where it was already proven.

### <a id="lesson-156"></a>`lesson-156` — A `-webkit-` shorthand is an alias, and an alias undoes the longhand above it

The live cards' gradient rim is a masked pseudo-element: two mask layers, one clipped to
the content box, composited so that the middle is punched out and only the rim paints. It
was written in the order the two vendorings suggest — the standard `mask` and its
`mask-composite`, then `-webkit-mask` and its `-webkit-mask-composite` — and it was correct
in chromium and in webkit.

In firefox `mask-composite` computed to `add`. `add` does not punch anything out, so the
gradient covered the **whole card** rather than its edge, on hover, in one engine of three.
Firefox implements `-webkit-mask` as an alias of `mask`, so the shorthand written below
`mask-composite: exclude` reset the composite to its initial value; chromium and webkit
keep their own composite property either way, which is why the same source was right in two
engines and wrong in the third. The fix is ordering: both shorthands first, both composites
after them.

What is worth keeping is not the ordering rule but how it was found. The suite had 337 green
cases across three engines, including axe on every route, and not one of them could see it:
the defect was a hover state, the baselines are chromium-only by their own law
([`lesson-155`](lessons.md#lesson-155) is the other half of that law), and no assertion had
ever read the property that carried the whole effect. The line that caught it was added
deliberately, out of suspicion rather than evidence — _the guard matching is not the same as
the punch-out happening_ — and it failed on the first run it ever made. A gate written for a
defect nobody has seen yet is the only kind that can catch one nobody would.

The rule: when a declaration exists in a vendored and a standard spelling, order every
shorthand before every longhand of that family, and **assert the computed value in each
engine**. A property that decides whether an effect happens at all is a property a test
should read out loud, not one a picture is trusted to imply.

### <a id="lesson-157"></a>`lesson-157` — Emulated encapsulation rewrites the selector, so it rewrites the specificity

Two rules were written in one day for the landing, both correct as CSS, both silently
powerless as Angular component styles.

The first said `[data-theme='dark'] .live .card { … }` and compiled to
`[data-theme=dark][_ngcontent-x] .live[_ngcontent-x] .card[_ngcontent-x]`. Emulated
encapsulation stamps the content attribute on **every compound of the selector**, `<html>`
included — so the rule asked the document element to carry an attribute only this component's
own nodes ever get, and could not match anything. The symptom was not an error: it was the
dark theme's card name painted in the light theme's gradient stops, which is exactly what a
reader would see if the tokens had simply been chosen badly.

The second said `.hero__inner > * { animation: … }` with the stagger written as
`animation-delay` on each child. The parent rule compiles to
`.hero__inner[_ngcontent-x] > *[_ngcontent-x]` — two classes' worth of weight — while the
child's `.hero__title[_ngcontent-x]` carries one, so the shorthand won and reset every delay
to zero. The symptom was a stagger that was not one: five parts arriving together, which
looks like a design choice.

Both are the same fact seen twice: **the selector that runs is not the selector that was
written**, and its specificity is not the one counted while writing it. The fixes differ
because the shapes differ — `:host-context()` for the ancestor case, since the compiler
leaves its argument alone, and a custom property carried inside the shorthand for the
stagger, because a variable is inherited rather than cascaded against and so has nothing to
lose. What generalises is the diagnosis: when a component rule looks ignored, read the
EMITTED css before rereading the source, because the source is not what the browser was
given.

And both were found the same way — by measuring what the page computed rather than by
looking at it. A rule that does nothing renders a page that looks deliberate.

### <a id="lesson-158"></a>`lesson-158` — A box painted over a transparent control is the box the pointer lands on

The switch is a native `<input>` made transparent and laid over a drawn track, with a thumb
drawn beside it — the idiom every "styled checkbox" uses, and the library's own since the
checkbox. The thumb is the input's LATER sibling, and both are absolutely positioned inside the
track, so the thumb is painted above the input. That is the whole defect: `elementFromPoint` at
the knob's centre answered `thumb`, a click there bubbled through a `<span>` to the track and
the host and reached no input, and the state stayed where it was. The one part of the control
that looks most like the thing to press was the one part that did nothing — and the label, the
track's ends and the keyboard all worked, which is why no case had ever asked.

The fix is one declaration, `pointer-events: none` on the thumb, and the lesson is the
question that was missing: **whatever is drawn over a transparent control has to decline the
pointer, or it is the control.** A decoration's job is to show the state, and a box that shows
the state and also intercepts the gesture that changes it is a control with no handler. The
sandbox now presses the knob's centre by coordinates and watches the state turn, in three
engines; the unit spec pins the declaration, because jsdom lays nothing out and cannot say what
a pointer lands on.

### <a id="lesson-159"></a>`lesson-159` — The router scrolls to an anchor by arithmetic, and reads no CSS while doing it

The docs shell had answered the sticky-bar question twice in CSS: `scroll-padding-block-start`
on `html` for the register's `#lesson-N` links, and `scroll-margin-block-start` on every
section of the component page. Both are the platform's own way of saying "land below the
bar", both are read by a native `#fragment` jump and by `scrollIntoView` — and neither is read
by Angular's `anchorScrolling`. `BrowserViewportScroller.scrollToElement` takes the element's
rectangle, adds the page offset and calls `window.scrollTo` with that number less whatever
`setOffset` was given, which was nothing. Measured on the component page: a table-of-contents
link put its heading at y=0 under a 57px bar, on every click, since the day the page was
written. The two CSS declarations had made the page LOOK handled, and the register's links
happened to be followed as native jumps often enough for nobody to notice the router's path
was blind.

So the offset is one custom property on `html`, `scroll-padding` reads it for the native
path, and the shell hands the router the same property through `setOffset(() => …)`, read at
each scroll rather than copied. The wider conclusion: **a router that owns navigation owns the
landing too, and "the browser handles anchors" stops being true the moment a framework
intercepts the link** — check which path a click really takes before trusting the CSS that
serves the other one.

### <a id="lesson-160"></a>`lesson-160` — A demo whose content has no width of its own has no width in a centred stage

The skeleton's demos declared `max-inline-size: 24rem` and stood in a stage that centres its
demo with `display: flex; justify-content: center`. A flex item's width is the width of its
content, and a skeleton's content is bars that are 100% OF THEIR CONTAINER — so the item
measured 0px wide, the bars 0px with it, and the component page showed a heading, a busy region
and nothing in it. The progress bar's demos had the same declaration and the same stage, and
were 97px across because a button beside the bar gave the item that much.

A ceiling on a width that is not there is a ceiling on nothing: the demo needs a WIDTH
(`inline-size: min(24rem, 100%)`), and the ceiling comes with it. Twenty-one other demos carry
the same `max-inline-size` alone and are fine, because an input, a select or a button has a
width of its own; the two that were not are the two whose only content sizes itself by the
container. The rule that generalises is the platform's, not the stage's: **`100%` of an
element sized by its content is a circle, and the browser resolves it to zero without a
word.**

### <a id="lesson-161"></a>`lesson-161` — A signal written after the first render is a second render for everybody, and so is a view attached then

The cost record (plan 2.3) read **2 renders** for the `menu`, `popover` and `toast` previews
and 1 for the other thirty, and the three had one shape in common: something flipped in
`afterNextRender`. The menu and the popover kept a `rendered` signal — the gate that keeps the
overlay a browser-only thing without asking which platform it is on — and an effect read it;
the toaster kept a `mounted` signal gating the computed the viewport's template reads, and
behind it attached the viewport to the application and set its input. A signal write notifies
its live consumers before anybody looks at the value it produced, and attaching a view or
setting an input tells the scheduler to run the application again whatever the view's state
(`updateAncestorTraversalFlagsOnAttach` notifies first and reads the flags after) — so every
page holding one of these paid a whole pass, whether or not anything had changed: the toaster's
gate flipped over an empty list on every page load.

The fix was not "move the write into `afterNextRender`", which is where it already stood.
It was to write no signal at all: the flag is a field, and the one thing the flip used to
trigger through the effect — opening what was asked open before there was a render to open
into, and saying what the development warning has to say — is done once in the callback that
flips it, with the effect's signals read **before** the gate so that they are tracked from its
first run (the first version forgot that, and the warnings' effects never ran again). The
toaster keeps a queue for messages raised before the region exists, renders the empty region
by hand, and joins change detection with its first message — which is a pass anyway. The
record reads 1 for all three and the gate holds it there.

The rule that generalises: **`afterNextRender` is the right time for DOM work and the wrong
time for anything the scheduler is told about** — a signal a template or an effect reads, an
input set, a view attached. Each is a render, and a render is charged to every consumer of
the page.

### <a id="lesson-162"></a>`lesson-162` — A rule on the inputs of an imprecise read is the workaround written down

`check-bundle` read an entrypoint's presence in a bundle by searching the text for its
selector, as a plain substring — and `pct-select` is inside `data-pct-selected`, so every
bundle holding a calendar read as holding the select. The calendar's day was renamed
`chosen` on the spot; a month later the tabs wanted `selected` for the same reason and took
`chosen` for the same reason, with the token beside it still named `selected` because a
token's name is not scanned. Two components now wrote one idea with two words, and the thing
deciding which was a gate's accident nobody had written down. The item that recorded it
offered two closes: a word-boundary in the read, or a rule in `check-parts` that no state
name may contain a selector.

The second would have been the accident made permanent. A marker is kept because it survives
linking as DATA, and data stands in a bundle as a string literal — `[["pct-select"]]` — so the
read has a boundary of its own to use: the quotes. Read that way, `"data-pct-selected"` and
`"pct-select-option"` contain the token and neither is it, and the guard that had stood in for
the missing boundary (no marker a substring of another's) had nothing left to guard. It
narrowed to what a literal read still cannot tell apart — two entrypoints exporting one
selector — and the read itself got a control over a prepared text.

The rule that generalises: **when a gate misreads a name, fix the read, and never legislate
the names around it.** A naming rule that exists to keep a read from misfiring is enforced on
people who cannot see the read, and the second of them finds the workaround and not the
reason — which is the shape the item itself described, one floor down.

### <a id="lesson-163"></a>`lesson-163` — A platform rule written from memory is a claim, and the platform's own answer is the detector

The drawer's card and its decision listed the properties that take a `position: fixed` panel
away from the window — `transform`, `filter`, `contain: paint`, `container-type` — from
memory of the specification, in a section a consumer reads only once the panel has already
landed in the wrong place. Measured on 2026-09-05 in three engines, over twenty-seven
ancestor properties: `container-type` catches nothing, in any of them (its layout containment
left the specification years ago, and the memory was of the older text); `content-visibility:
auto`, `will-change: transform`, the individual `translate` / `rotate` / `scale`,
`perspective`, `backdrop-filter`, `offset-path` and `transform-style: preserve-3d` all catch,
and not one of them was on the list. A list kept by hand was wrong in both directions, and
nothing could have said so, because prose has no run.

What the same measurement gave was the detector. `offsetParent` of a fixed element is `null`
while the window holds it and the catching ancestor otherwise — the same answer in all three
engines, for every property that catches. The report the drawer now writes asks the platform
that question and reads properties only to NAME the reason, so a property the list does not
know still produces a report, one clause shorter. One quirk is measured rather than assumed:
chromium answers `<body>` for a `zoom` above the panel while the panel stays at the window, so
the body is named only with a reason read off it.

The rule: **a rule about the platform that is only written down is a claim; where the
platform can be asked, ask it, and keep the list for the sentence.** The list is still worth
keeping — it is what turns "an ancestor caught it" into "the `transform` on your card" — but
it is not what decides, and the day it is wrong again the report is wrong by a name, not by
a silence.

### <a id="lesson-164"></a>`lesson-164` — A flake's record names the line the stack names, not the line the story ends on

The dialog's scroll-lock case failed one run in three in WebKit on 2026-09-02, and the item
that recorded it (plan 4.32) said WHERE: "at the `Escape` step — the panel is still in the
DOM when `toHaveCount(0)` asks", with a suspicion to match, a wheel racing the keydown.
Measured again on 2026-09-05 at that day's commit, four runs of twelve failed, every one at
line 161 — `expect(await scrollY()).toBe(locked)`, the LOCK assertion three lines above the
Escape, with `locked` read while the first wheel was still in flight. That is
[`lesson-149`](#lesson-149) to the letter, and the commit that wrote lesson-149 the next
morning made the same twelve runs green; the current code passes 197 of 197 across isolation,
a probe that presses Escape with no settle at all, and eight workers of load. The item stood
for three days pointing at a step that never failed, and a fix along its suspicion would have
been a wait nobody needed beside a lock that was working.

The record went wrong at the reading: Playwright prints a code frame that ends on the line
after the failing expression, and `toHaveCount(0)` was the last line of the frame. The rule:
**a flake's record names the line the stack names — `at file:line:col` — and quotes the
assertion standing on it; the code frame is context, and the last line of a story is not
where it broke.** Written that way, the item would have been closed by the fix that landed
the next day instead of surviving it.

### <a id="lesson-165"></a>`lesson-165` — A blanked element is still a layer, and taking the layer away moved four pictures in another column

The stage of the visual tests was given a rule to blank the sandbox's navigation before the
seven viewport pictures (plan 4.23), and its first version was `visibility: hidden`. The
seven re-recorded as expected — and then four CARD pictures went red, `select-filter-trigger`,
`select-clear-trigger` and their RTL twins at 743–924 pixels each, on cards that contain no
navigation at all; the same four were green under the committed spec, run alone. The differing
pixels were every pixel of the triggers' value text and nothing else, and magnified they said
why: grayscale antialiasing in the baseline, subpixel fringes in the run (an orange
`255, 240, 208` beside a blue on the edges of every glyph). Nothing about the text had changed.
The sticky column beside the content had stopped painting, chromium stopped keeping a
compositing layer for it, its overlap decisions for the content beside that column changed,
and text that had been drawn on a composited layer — grayscale, because such a layer is not
opaque — was drawn on the root one with LCD fringes. `opacity: 0` on the same column keeps the
layer and takes only the paint: the seven viewport pictures match the ones recorded under
`visibility: hidden`, the four cards match their old baselines, and both halves of the
stage's control hold.

The rule: **a pixel of text depends on the compositing of the elements AROUND it as much as
on the text, so a stage that blanks something keeps its layer (`opacity`) rather than its box
alone (`visibility`) — and a red card in a column the change never touched is read as
antialiasing before it is read as a regression.** The diff image tells the two apart: a
regression moves shapes, antialiasing colours edges.

### <a id="lesson-166"></a>`lesson-166` — A host listener cannot get in front of the consumer's own, and a disabled link needs it to

`PctButton` grew a second tag (`a[pctButton]`, plan 4.33) and with it the one state a link has
no platform mechanism for: `disabled`. The first version wrote the refusal the obvious way — a
`(click)` in the component's `host` block calling `preventDefault()` and
`stopImmediatePropagation()`, which is what a disabled button gets from the browser for free.
The navigation was refused, and the consumer's own handler on the same element ran anyway: a
case pressing `<a pctButton disabled (click)="…">` counted one press where it expected none.
`stopImmediatePropagation` was not too weak, it was too late — for an event whose target IS
the element, every listener on it runs in **registration order regardless of the capture
flag**, and the template's `(click)` is registered before the directive's host listener.

What answers it is two properties at once, and neither alone: the listener is attached in the
component's constructor, when the directive is instantiated and therefore before the
template's listener instruction runs, and it listens in the **capture** phase, which is what
gets in front for the other half of the problem — a real press lands on the projected label,
not on the element, and there the capture phase precedes the target phase outright. Both are
measured: one case presses the host, one presses the part.

The rule: **a host listener is not a way to pre-empt the consumer's listener on the same
element — `stopImmediatePropagation` from it is a coin toss decided by registration order —
and a component that must refuse an interaction on the consumer's behalf attaches its own
capture listener at construction and proves it with a press on the element and a press on
what it projects.**

### <a id="lesson-167"></a>`lesson-167` — A drifting gradient's travel is its size written twice, and one frozen picture cannot see the difference

The hero face was extracted from the site's own stylesheet into a component (plan 4.36) and
kept both of the numbers it found there — the button's `background-position: 300% 0` in the
keyframe, the site's `background-size: 200% 100%` on the rim and the word — without noticing
that they had never met. They are one number: a drift moves the image by
`position × (box − image)`, so at `background-size: 200%` a travel of `200%` is exactly one
gradient and the loop closes, while `300%` is one and a **half** — at every repeat the sweep
jumps back half a gradient, blue to cyan, on every rim and every headline the library paints.
The button is right (300% over 300%) and the site's mixin is right (200% over 200%); the
extraction took one of each.

What makes it worth writing down is that nothing in this repository could see it. The visual
baseline is one frame with animations disabled, so a picture of the seam is a picture of
nothing; the e2e cases read `background-image`, `mask-composite` and `animation-duration`,
none of which move; `check-styles` reads rule patterns, not arithmetic between two
declarations; and the mutation run does not read a stylesheet at all. It was found by reading
the extracted sheet against the two it was extracted from — the review that asks "what did the
copy drop that the original had for a measured reason".

The rule: **`background-size` and the keyframe's `background-position` are a pair, and a face
that changes one changes the other — so a stylesheet with two sizes needs two keyframes, named
for the size they travel.** And the reading that would have caught it belongs in the e2e beside
the paint: assert the size and the animation of each face together, because the invariant is
between them and not inside either.

### <a id="lesson-168"></a>`lesson-168` — A reader keyed on the property name cannot see the colour inside a value

Point 7 of `check-tokens` asks what the library really paints, and it asked the compiled CSS
by PROPERTY NAME: `background`, `color`, a border. Two of the library's paintings are not
written that way. The hero gradient is a `background-image`, and its stops are colour
functions inside the value; the ring around today is a `box-shadow`, and its colour stands
beside two lengths. Both had entries in `contrast.policy.json`, so the gate was green and the
policy looked complete — and both entries were there because a person had put them there.

Measured, before and after: deleting `UI: the ring around today` from the policy was a green
run, and after the reader learned the two properties it is
`[unmeasured] --pct-date-day-border-today: painted (outline) and stands in no pair of the
policy`. The denominator moved by exactly one colour, 239 to 240 — and that number is not the
size of what was hidden. The gradient's three stops had entered it the day before, when a new
component happened to spell the shorthand; had they not, the same repair would have moved it
by four. A denominator built by pattern hides an amount nobody can read off the run.

The repair is not one more property in a list, because the two properties are not the same
shape. Where the whole value is a colour, the property name is the authority and every
`var()` under it is a colour — a dimension there is a defect. Where the value is **composite**
— a shadow's offsets, spread and colour, all legal side by side — the property name is
authority over nothing, and the only thing that can say which `var()` is a colour is the
skin's own `$type`. Written as one list it is a false positive on the first shadow the
library already paints — `box-shadow: var(--pct-popover-panel-shadow)`, a token that IS a
whole shadow — and on the first spread written as a length token; measured: with the `$type`
test removed, the library's eight
`$type: shadow` tokens fire `not-a-colour` at once, and so do the reference fixture's own
two dimensions — one of them reached through the assignment expansion, which is the second
half of the same reading.

The rule: **a gate that reads declarations reads VALUES, and where a value is composite the
property name stops being evidence — the skin's type is.** And the cheaper half of the same
rule: when a gate's denominator is built by pattern, the entry that pattern misses is
indistinguishable from the entry it approved, so the control to write is not "does the gate
pass" but "does deleting this policy line turn it red".

---

### <a id="lesson-169"></a>`lesson-169` — A comment is input, and one repository can need it read both ways

Sass keeps a loud comment in its output, and the declaration scanner of `check-tokens` is a
regular expression. So the prose above a declaration is text the gate parses like any other:
a line beginning `improvement:` reads as a property whose value runs to the next `;`, and the
`left: 50%` under it disappears into that value. Four declarations of this library were read
that way — in `checkbox.scss`, `radio.scss`, `container.scss` and `menu.scss` — and not one
of them was red, because all four carry dimensions and the points that lost them ask about
colours. A gate can be wrong in a way that costs nothing today and voids the promise anyway:
what was lost is the PROPERTY, which is the whole question point 7 asks, so a painting under
such a comment would have been a colour in no denominator and a green run.

Two conditions have to meet, and knowing which is what made the case reproducible: the
comment stands **inside a rule** — a captured value may hold no `{`, so a comment above a
selector swallows nothing and the scanner recovers on the next line — and the word carrying
the colon **begins a line**, since a property is anchored to the start of one. The first
fixture written for this had the comment above the selector and the word mid-line, passed
armed and disarmed alike, and proved nothing.

The repair is one call on the gate's own input, and where it stands is the lesson's second
half. `check-styles` reads the same compiled output and **must** see the comments: its
exceptions are written as `/* pct-exception left: … */`, and the very comment that swallowed
the checkbox's `left` is one of them. Two gates, one text, opposite needs — so the strip
belongs to the reader that must not see them, at its own input, and a shared "read the CSS"
helper would have had to choose for both.

The rule: **the text a gate is handed is part of the gate.** A rule can be right and a reader
can be right while the input under them is something else, and that floor is the one nothing
reports from — the run stays green, because a swallowed declaration is not a wrong answer but
no answer at all.

---

### <a id="lesson-170"></a>`lesson-170` — An interface whose members are all optional proves nothing, and `implements` looks like proof

`PctCheckbox implements FormCheckboxControl` reads as a contract being checked. It is not. In
`FormUiControl` — the base of both signal-forms contracts — **every member is optional**; the
one required member in `FormValueControl` is `value`. So a control that declares no
`touched`, no `errors` and no `invalid` implements the contract perfectly, and the form it is
bound to writes state into members that are not there. Worse than absence is presence in the
wrong shape: `readonly invalid = input(false)` without `booleanAttribute` compiles, satisfies
the contract, and turns `<pct-x invalid>` into the string `''` — which is falsy, so the
control is valid for ever while the consumer's template says otherwise.

Nine controls of this library carry that block, from eight declaration sites, and every copy
agreed with every other one on the day the gate was written. That is the state a gate is for:
agreement nobody has written down is agreement that lasts until the next hurried copy.
Measured on the repository — `booleanAttribute` taken off the checkbox's `invalid` — the
report names the file, the line and the eight sites that disagree with it.

**Nine, and the plan said eight.** The count came from a search for `FormValueControl`, and
`pct-switch` implements `FormCheckboxControl` instead: a denominator built by searching for
one of two names misses everything under the other. The same reading corrected the other
number from the other direction — `pct-select` and `pct-multi-select` are two controls over
one abstract base, so eight sites carry nine controls. Neither error was visible from the
inside; both fell out of a reading that walked the heritage instead of grepping for a word.

The rule: **when a dependency's type says everything is optional, the type is not the gate —
it is the list of names a gate can be written against.** And its corollary about prose: the
same reading refused to hold the JSDoc above those members identical, because `readonly` has
six different true sentences here — a native checkbox has none and swallows the click, a date
field hands it to the input and disables the calendar button. Holding text identical across
copies is only right where the text is a fact about the CONTRACT; where it is a fact about
the control, one sentence for all of them is a worse document, not a tidier one.

---

### <a id="lesson-171"></a>`lesson-171` — A string equal to a selector is not a component, and a probe that skips the linker measures the wrong package

The question was 4.4's: does a consumer importing `PctSelect` alone shed `PctMultiSelect`,
its template and its styles? Everybody answers "of course, ESM". Two measurements were taken
before one of them was true.

**The first was wrong because the pipeline was.** A throwaway script bundled the package with
esbuild and an Angular linker plugin copied out of `check-bundle` — and the copy tested
`path.startsWith(dist)` against the repository's `dist`, while the probe resolved the package
through a COPY of it in a temporary `node_modules`. The test was false for every file, so the
linker never ran, and an unlinked FESM carries `ɵɵngDeclareClassMetadata(…)` as a top-level
call naming every class in it: nothing can be shaken out of a module like that. The script
reported that importing one tag sheds 228 B of 127828 — a confident, precise, entirely
artificial number. The gate's own probe, which runs the linker because its `dist` is the one
the probe resolves, answers 4162 B against 11333 for `./accordion`.

**The second was wrong because the reading was.** With the pipeline fixed, the first version
of the point asked whether the sibling's SELECTOR was in the bundle text. Seven rows came
back with a sibling present and two of them were false: `pct-select` stands in a bundle that
imported `PctMultiSelect` alone — inside the shared base's own
`get tag() { return this.multiple ? 'pct-multi-select' : 'pct-select' }` — and
`pct-tree-item` stands in a `PctTree`-only bundle as its content-projection selector. Both
are strings that equal a selector without being a component. The reading that cannot be
fooled is arithmetic: bundle one class, bundle every class, compare the bytes.

The answer, once both were fixed: **it depends, and the difference is up to 60% of the
bundle.** `./accordion`, `./breadcrumb`, `./date` and `./field` shed the tags a consumer does
not name; `./chips`, `./menu`, `./radio`, `./stepper`, `./tabs` and `./tree` do not, and are
right not to — a chip injects its container, so importing the child names the parent.
`./select` is the one that is neither: two siblings with no reference between them, three
bytes apart.

The rule: **a measurement of what is inside a bundle is a measurement of BYTES.** Text in a
bundle is evidence of text. And the second rule, older and re-learnt: a probe that skips a
step of the consumer's build measures a different artefact, so a shortcut copy of a gate's
pipeline is a different gate — the one place a measurement like this belongs is inside the
gate that already gets the pipeline right.

---

### <a id="lesson-172"></a>`lesson-172` — Half a cache is not half a speed-up: one half restores nothing, the other restores a green with no artifact

The step was 4.41's, and it starts with the snippet everybody copies into a GitHub workflow:
`actions/cache` over `.nx/cache`, keyed on the lockfile. It was measured before it was
written, one task at a time on nx 23.1, with `NX_CACHE_DIRECTORY` and
`NX_WORKSPACE_DATA_DIRECTORY` pointed at a scratch pair so nothing in the repository moved.

**`.nx/cache` alone reads 0/1 hit.** The directory holds the artifacts of a cached task —
`<hash>/` with its outputs, `terminalOutputs/<hash>` with what it printed. What it does not
hold is the statement that the hash exists: `cache_outputs` (hash, exit code, size) is a table
in the SQLite database under `.nx/workspace-data`. Restore the artifacts without the database
and every task is a miss, the run is exactly as long as it was, and CI is green — a cache that
restores nothing looks precisely like a cache that works.

**The database alone reads 1/1 hit — and leaves the output directory missing.** With the
database restored and `.nx/cache` deleted, `tokens:build` reported `[local cache]`,
"Successfully ran target build", 100% hit, in 21 ms; `libs/tokens/dist` did not exist
afterwards. That is the dangerous half: a build that never ran, reported as done, with the
artifact every downstream gate reads absent from the disk.

So the two directories are one thing under one key — restored together or missed together —
and that is how the step is written. The general shape is older than nx: **a cache is a pair
of an index and a store, and any advice that names one of them is advice for a version that
kept them in the same place.** The measurement that catches it is not "is the cache smaller
than expected" but the two readings above: hits with the store gone, misses with the index
gone.

What the same measurement also said, and what went into the workflow's comment rather than
here: a documentation-only push restored 12 of 17 tasks, and the five that ran are the five
whose inputs name documentation — plus `check-support`, which is `cache: false` because it
reads git history. The inputs lists were doing exactly what their comments claim. A dependency
bump still reruns everything, because `package-lock.json` is in `sharedGlobals`.

---

### <a id="lesson-173"></a>`lesson-173` — `providers` on a component pin it into its entrypoint, and a consumer who never named it pays for it whole

4.4 measured that importing one tag of a multi-tag entrypoint sheds the others — sometimes.
`./accordion` sheds 63% of itself, `./select` sheds three bytes of 69907. 4.42 asked why, and
the answer is one line of a component's decorator, measured one doctored declaration at a
time on the built package, with the gate's own probe doing the bundling.

**A component that declares `providers` cannot be shaken out.** Angular compiles them into
`features: [ɵɵProvidersFeature([…])]`, and that call stands in the static `ɵcmp` initialiser
of the class itself. It is a call to a function imported from `@angular/core` — external to
the bundle — so no bundler may assume it is pure: the statement that defines the class has a
side effect, and the class survives with its template and its stylesheet. Removing that one
key from `PctSelect`'s declaration takes a bundle that imported `PctMultiSelect` alone from
**69904 B to 45446 B**. Removing it from `PctMultiSelect` — the class the bundle actually
asked for — takes it to 69828, its own 76 bytes and no more: the pin is on the class nobody
imported.

**`sideEffects: false` does not save it**, and the package declares it. The flag lets a
bundler drop a module nothing imports; it does not license dropping a side-effectful statement
out of a module something else in it is imported from.

**Hoisting the author's call does not save it either.** `const HOST =
providePctTemplateHost(…)` at module scope, with `providers: [HOST]` in the decorator, reads
like the obvious repair and measures 69916 against 69919 — nothing shed. The call that pins is
the one the LINKER writes, not the one the author wrote, and every shape of `providers`
produces it.

**Two mechanisms, and they explain all eleven rows.** Either the sibling declares providers
(chips, menu, select, tabs, tree), or something reaches it: `inject(PctStepper)`,
`inject(PctRadioGroup)` — the child injecting the parent CLASS as its token. Where the channel
is a token declared beside the class instead (`PCT_ACCORDION`), there is no reference, and
where the sibling also declares nothing, the row sheds: accordion, breadcrumb, date, field.
The candidate everybody suggests first — two components over one shared base, `usesInheritance`
in the declaration — was measured and refuted: with the inheritance cut out of the FESM the
two numbers were still three bytes apart.

The rule to carry: **a `providers` array is a public cost, not a private convenience.** It is
the difference between a consumer paying for the tag they wrote and paying for every tag the
entrypoint has, and in the select's case that is 24458 B for a dev-mode message about a slot
in the wrong place.

---

### <a id="lesson-174"></a>`lesson-174` — Twelve mechanisms taken out one at a time: what a suite holds is not what its case names say

4.19 asked what measures a component whose implementation is a browser. The accordion is 74
lines of TypeScript and a template, a stylesheet and `<details>`; the mutation run reads the 74
lines and nothing else, so its 95% is a true statement about a small thing that reads like a
statement about a component. The answer the item decided on — a recorded disarming per claim —
was carried out, and it is worth its own entry for what the readings said rather than for the
practice.

**Twelve mechanisms, disarmed one at a time, the suite run over each hole.** Eight of the
twelve are in the template or the stylesheet, where no mutant is ever thrown. Ten turned a case
red; two are held by the unit suite alone, and one is held by nothing that names it.

**The one that is held by nothing: the touch-target floor.** The card said "every heading row's
box measured outright; the floor is `--pct-accordion-heading-target-min` on the row itself".
Take the floor out and the case stays green — the padding clears 24 px without help. The case
is not wrong and the promise is kept; what the sentence implied, that this case is what keeps
the floor honest, is not true, and only the disarming could say so. **A green case names a
promise, not a mechanism**, and the two are told apart by taking the mechanism away.

**The two that only the unit suite holds** are both places where the platform does the work
anyway: `onToggle` writing the element's state back through the two-way binding — every browser
case presses and then reads the ELEMENT, which the platform updates whether we listen or not —
and the generated group name, because a second accordion on one page is a thing no sandbox view
draws.

**And the readings that came out exactly as the card said** are the cheap half of the value:
the exclusive `name`, the heading level, `preventDefault()` on a refused press, `aria-disabled`
beside it, `[open]`, the marker's place in an RTL row, the platform's triangle taken away, and
two lines of the forced-colours block — each of them turned a named case red, and the case's
name is now written next to the line that holds it.

The practice, cheap enough to repeat: an editor, a dev server, one spec file and the unit
suite. It is not a tool, it is not machinery this repository has to own, and it is the only
thing that has ever said which of a component's cases are load-bearing.

---

### <a id="lesson-175"></a>`lesson-175` — The four criteria nobody measured: three defects, and two of them belonged to the harness

Four rows of the conformance report said _Not Evaluated_ — 1.4.4 Resize Text, 1.4.10 Reflow,
1.4.12 Text Spacing, 2.4.11 Focus Not Obscured — for one reason: **every measurement this suite
takes is taken at the size the author chose.** The visual baselines run at one desktop
viewport, the geometry cases measure boxes at that same width, and the axe audit resizes
nothing. Four criteria about a reader changing the page had, between them, no case at all.

The spec that fills them (`adaptation.spec.ts`) is one afternoon's work and its first run was
red on one of the four. Nine of the thirty-five views scrolled sideways at 320 px, and the
causes are worth keeping apart:

- **`align-items: flex-start` on a container that becomes a column.** In a row it means "do not
  stretch to my height", which is what the sandbox's shell wanted; the mobile breakpoint turns
  the same container into a column, where the identical line means "be as wide as your own
  content". One word, `stretch`, and seven of the nine views were fixed.
- **`minmax(280px, 1fr)`.** A track floor wider than the window is a track wider than the
  window. `minmax(min(280px, 100%), 1fr)` is the whole repair.
- **A component with no `min-width: 0`.** `pct-field` is a flex item, and a flex item's
  automatic minimum is its content's min-content size — for a field that is the native input's
  own twenty-character intrinsic width, measured at 282 px. The control and the message inside
  the field already carried the line; the field itself did not, so it pushed the page sideways
  instead of shrinking. That one is the library's, and it is the only one a consumer would have
  hit too.

Two of the three defects were the harness rather than the library, which is the part worth
remembering: **a reflow gate over an application measures the application first.** It is still
the right place for it — a component library cannot reflow a page it does not lay out — but a
red run has to be read twice before anything in `libs/` is touched.

And the three criteria that passed on the first run are worth as much as the one that did not.
They were claimed by nobody until the day the spec was written: a row that says _Not Evaluated_
is not a row that is failing, it is a row where nobody knows, and the difference is what a
conformance report exists to state.

### <a id="lesson-176"></a>`lesson-176` — The template that has no parent: a report that had to stop asking DI

`lesson-173` measured what a `providers` array costs: 24458 B, because the call Angular writes
into the static `ɵcmp` initialiser pins its class into any bundle that imports a sibling from
the same file. The only thing that array bought here was a dev-mode message about a slot
standing where nothing reads it, so the plan chose the obvious repair — have the slot read its
host's tag off the element it stands on, no DI at all (4.43).

**The repair was measured before it was written, and it does not work.** A probe rendering the
four shapes a slot can take reads:

| where the slot stands                             | `nativeElement.parentElement` |
| ------------------------------------------------- | ----------------------------- |
| directly inside `<pct-select>` — the RIGHT markup | `null`                        |
| inside an `<ng-container>` inside it              | `null`                        |
| inside an `@if` inside it                         | `null`                        |
| beside the select, inside `pct-field`             | `span`                        |
| inside another component that projects it         | `div`                         |

An `<ng-template>` in a component's content is unprojected content, and Angular never inserts
its anchor comment into the document. So the DOM answers for every case the report exists to
ACCUSE and for none of the cases it exists to bless: the correct markup is exactly the markup
that is invisible.

**What answers instead is the query that already existed.** `contentChild(PctSelectOptionTemplate)`
finding a template IS the statement that the template will be rendered, so the host claims what
it finds and a slot nobody claims reports itself after the first render. No token, no provider,
no reference from the slot to any host — and the message no longer names a host that offers
other slots, because an unclaimed slot has no way to ask who it stood under. That branch was
unreachable in this library anyway: the two components that read slots read the same one.

The general shape is worth keeping: **a mechanism that already knows the answer is cheaper than
a channel built to ask it.** DI was a way for the host to say something the host was already
doing.

### <a id="lesson-177"></a>`lesson-177` — Eleven floors, and every one of them measured for the first time

`lesson-174` found one promise held by something other than the mechanism named beside it: the
accordion's touch-target case stays green with `min-block-size` deleted, because the row's
padding clears 24 px on its own. Ten more controls declare a `*-target-min` token of their own,
and none of them had been disarmed either.

**One spec, eleven controls, and the disarming is in the case rather than beside it.** Each row
injects a stylesheet that sets every OTHER custom property giving that element size to zero,
hides what it holds and zeroes its text — so what is left is the floor and nothing else — and
then reads the box. Every one of the eleven lands on exactly 24 px, except the switch's track at
26: a 1 px border on each side of a content-box element, which is a literal in the stylesheet
and not a token to zero.

**The upper bound is half the case.** Asserting `>= 24` alone would pass on a control whose
padding survived the disarming, which is the very defect being closed, so each row also states
how far above 24 the box may read — measured, not chosen.

**And each case carries its own negative control**: with the floor's own token ALSO at zero the
box has to fall through 24 px. Without that second reading the first would still pass on a
component that had stopped reading its token and written `24px` into the sheet — the same defect
one floor down.

The proof that the file measures what it claims is the disarming that motivated it. With
`min-block-size: var(--pct-accordion-heading-target-min)` deleted from the stylesheet:

| case                                                             | verdict          |
| ---------------------------------------------------------------- | ---------------- |
| `accordion.spec.ts` — the whole heading row is the touch target  | green, as before |
| `target-min.spec.ts` — accordion heading, everything else zeroed | red: `height: 0` |

Three things this does not say. It reads eleven controls on one page each, not every control on
every route; it runs at the sandbox's font size, so a consumer whose skin sets a larger one is
outside it; and 24 px is the AA minimum (SC 2.5.8), not the 44 px that AAA asks for.

### <a id="lesson-178"></a>`lesson-178` — Motion that ends, and the order of three ways to stop it

SC 2.2.2 asks for a mechanism to pause, stop or hide motion that starts on its own and runs
longer than five seconds. The library had two such motions and one answer for both:
`prefers-reduced-motion`, which is the user agent's mechanism and not a control on the page.

**The cheapest answer to a criterion is often the one that stops the criterion applying.** The
brand's sweep now runs ONE pass — half the motion axis, four seconds — and then stands still,
so condition (2) is not met and no consumer owes a pause control. It costs one word in the
stylesheet (`infinite` → `1`) and one division of the token, and the whole visual consequence
is a tempo: the face reads twice as brisk while it runs. The still picture is untouched,
because the travel is a whole gradient — the frame it settles on is the frame it started from,
which 78 visual baselines confirmed without a single byte moving.

**Then a page got a stop of its own anyway**, because being outside a criterion is not the same
as giving a page control over what it paints. Three mechanisms can now stop one sweep, and the
order between them is the part worth writing down:

| what           | whose         | wins over  |
| -------------- | ------------- | ---------- |
| reduced motion | the reader's  | both       |
| `paused`       | the page's    | the settle |
| the settle     | the library's | —          |

A page may never overrule the reader; that is the only order that can be right.

**And a shorthand quietly resets what it does not name.** `animation-play-state: paused` in a
rule of lower specificity loses to `animation: …` in a rule of higher specificity, because the
shorthand sets play-state to `running` on its way past. The pause rule therefore repeats enough
of the compound to outrank the strongest face rule — the same shape as the forced-colors rules
one media query over (`lesson-70`).

**What did not change is as considered as what did.** The skeleton's sheen still travels for as
long as the wait: a busy indicator that stopped would say the work had finished. That leaves one
row of the conformance report at Partially Supports with the argument stated rather than a
verdict asserted — the sheen is `aria-hidden`, the wait is announced by the consumer's
`aria-busy` region, and whether the movement is "essential" in the criterion's sense is an
argument, not a measurement.

### <a id="lesson-179"></a>`lesson-179` — Thirty-five bytes with three suspects, all three refuted

`./toast` was recorded at **15311 B** and read **15346 B** ever after, with nothing in the diff
to blame. The file has no tolerance by decision (0023), so a row that cannot be explained is a
promise that has quietly stopped being one. The suspects were a dependency bump, the sources
themselves, and a measurement that wobbles. Each was tested.

**The window.** The row was written at the toast's own commit and moved at the tabs commit,
three commits later. `git log package-lock.json` over that range: empty. So no bump happened
between the two readings — the first suspect never had an opportunity.

**The sources.** A worktree at the commit that wrote 15311, built from its own tree with
today's installed packages: **15346**. The sources at that commit do not produce the number
recorded beside them.

**The dependency tree.** The same worktree, with its own `node_modules` installed fresh from
the lockfile of that day (`npm ci`), rebuilt without the task cache: **15346** again — and the
five packages that decide what a byte count means read identically then and now
(`@angular/core` 22.0.6, `@angular/compiler-cli` 22.0.6, `@angular/build` 22.0.6, `ng-packagr`
22.0.1, `esbuild` 0.27.7).

So the recorded number is not reproducible from the tree it names, the toolchain it named, or
any combination of the two — and the mechanism that would have kept it honest was already in
place: `freshInputsFor` (C29) rebuilds without the cache on every `--write`, and it existed at
that commit. What is left is a state of the artefact nobody can reconstruct: a build that had
not finished, a tree that was not the tree, a copy interrupted.

**An unexplained measurement is not a reason for a tolerance; it is a reason to record what the
measurement was made WITH.** The snapshot now carries the five versions above beside its rows,
so the next drift with nothing in the diff is answered by the same diff — the toolchain either
moved with the bytes or it did not. A negative control holds the line: a compiler bumped while
the file still names the old one fires point 13.

The general form, and the reason this took an evening: **a baseline records a number and
forgets the conditions**, and every question about it afterwards is archaeology. The cheapest
moment to write down what produced a measurement is the moment it is produced.

### <a id="lesson-180"></a>`lesson-180` — Four names at once, and the gate that could not see inside a switch

Tones existed as a refusal in two cards for months: success and failure look alike, deliberately,
because a tone painted in colour alone is a state carried by colour alone and the second channel
would be an icon — four public names, a set no single component could judge. The toast refused it
first, the progress bar refused it second for the same reason, and two components standing on one
unmade decision is what the plan said would happen (4.14).

**What the decision bought, and what it cost.** Four names into `PctIconName` at once, two ramps
the palette did not have (`green`, `amber`), three semantic colours beside `danger`, and a `tone`
on both components. Every colour is a measurement rather than a taste: the light theme's steps
are the ones that clear 4.5:1 as text on the page (5.02, 5.02, 5.17) and the dark theme's the
ones that clear it on `slate.900` (10.25, 10.69, 7.02). The `600` amber most palettes reach for
measures 3.19:1 — enough for an edge, not for a word.

The bytes are the part worth stating out loud: `./progress` went from **7204 B to 11625 B**,
because a template that names `pct-icon` carries the icon component whether or not a consumer
ever passes a tone. That is `lesson-173` in its third disguise — an unconditional reference pins
— and here it is the price of the promise rather than an accident.

**A bar had nowhere to put a mark.** The progress host WAS the pipe: `position: relative;
overflow: hidden` on the element itself, because a `<progress>` renders no children and the fill
is a sibling. A mark inside a box that clips to the height of a groove is a mark cut to 8 px, so
the pipe moved down onto a new `bar` part and the host became a row. An untoned bar measures
exactly what it measured before — a case reads the host's box against the groove's to keep that
true.

**And the gate caught itself.** `check-icons` point 1 counts the `<pct-icon>` tags in a template's
TEXT and compares that with what its walk reached; the toast's new template read "1 in the tree,
5 in the text". The walk followed `node.branches ?? node.cases`, and in Angular 22 an `@switch`
carries its branches under **`groups`** — so every switch block in the library was invisible to
it, and to `check-aria`'s identical walk. Nothing had been missed yet because no icon had ever
stood inside a switch, which is exactly what a denominator is for: **a walk that reaches nothing
looks like a walk that found nothing wrong** ([`lesson-48`](#lesson-48) again, one AST node over).

### <a id="lesson-181"></a>`lesson-181` — A key nobody may install, and the hole in the honest default

A toast's `Undo` stands after every control on the page, because the card it sits on is a child
of `body`. The usual repair is a global F6 the library installs on the document — and the
disagreement between implementations (F6 here, F8 there) is the whole argument against doing it:
**a component library does not get to spend the host application's keyboard.**

So the library ships the mechanism — a service, a `[pctRegion]` to declare a place, and a
`[pctRegionKey]` that listens on the element a consumer puts it on — and mounts nothing.

**Then the e2e case refused to pass, and that was the finding.** `page.keyboard.press('F6')` on
a freshly loaded page goes to `document.activeElement`, which is `body` — a node ABOVE the
element the key was mounted on, so the event never passes through it on its way to the document.
Focus has to be inside the page for a key mounted inside the page to hear anything. Every
implementation that reaches for `document` reaches for it for this reason, and the reason is
real.

What closes it here is one word the CONSUMER writes: `listenOn="document"`. The library still
installs nothing by itself; an application that writes it has decided the key is free for it to
take. Two values, one conservative and one that works from a cold page, with the cost of each
written where the consumer chooses.

**Two more things measured on the way.**

A component's own `host` block cannot apply a directive to itself: `host: { pctRegionKey: '' }`
writes the attribute and instantiates nothing, because directive matching happens over a
TEMPLATE. The key went onto an element in the shell's template instead (`hostDirectives` is the
other road).

And two listeners for one key is a real possibility once `listenOn="document"` exists — the toast's
stack answers the key itself, then the same event continues to the document. `event.defaultPrevented`
at the top of both handlers is what keeps one press one hop.

**And where it lives cost 19111 B before it cost anything else.** Written into `./core`, the
service and its two directives are carried by every entrypoint that imports core, used or not: a
`providedIn: 'root'` service is a static initialiser calling an imported function, which no
bundler may treat as pure (`lesson-173`, a fourth time). Measured: the package went 443888 →
462999 B, `./core` 8157 → 10113. Moved into `@pacit/components/regions` with a
`providePctRegions()` and a `null`-by-default token left behind in core, the same mechanism is
**5515 B nobody pays until they import it**, and core grows by 108.

Two more things the move taught, both of them the kind that cost an hour if nobody writes them
down. A brand-new entrypoint directory has to be added to `tsconfig.lib.json` AND
`tsconfig.spec.json` — outside them the Angular compilation is not the same one, and the symptom
is silent: `pctRegion="Navigation"` left the signal input at its default, and every region
registered with an empty name. And the texts gate reads a capitalised default as prose, which is
right for every string but a `KeyboardEvent.key`: the exemption is `F1`–`F24` by name, because
`Enter`, `Home` and `Delete` are key names AND words a component could put on a button.

The shape worth keeping: **when a mechanism cannot do its job without taking something from the
consumer, the honest design is the one that makes the consumer hand it over in a word** — not
the one that takes it quietly, and not the one that refuses to work.

### <a id="lesson-182"></a>`lesson-182` — A gate that cannot start is a gate nobody hears stop

The mutation run died on **2026-09-05** and nobody learnt of it until **2026-09-08**. Not a
wrong score, not a slow run: the DRY run failed, so Stryker threw no mutant at all and exited
before it had measured anything.

The failing case was three days old and correct — `day.spec.ts` sets `process.env.TZ` to
`Pacific/Kiritimati` and asks the clock for `-840`, which is how "a day is the same day
fourteen hours east of the meridian" is measured rather than asserted. Under the `test` target
it passes. Under the mutation run it read the machine's own `-120`.

**Three layers, and only the third is the cause.** `@analogjs/vite-plugin-angular` defaults the
pool to `vmThreads`; a config can override that, and `pool: 'forks'` made a direct run green.
It changed nothing for the mutation run, because `@stryker-mutator/vitest-runner` passes
`pool: 'threads'` to `createVitest` ITSELF, and a caller's option outranks a config file. And
vitest's thread pool hands its workers a SHARED environment: the write to `process.env.TZ`
lands in the parent's store, so the tz cache of the thread doing the reading is never
invalidated. A plain `worker_threads` worker honours the same write — measured — so it is the
pool and not the thread.

**What made it invisible for three days is the other half of the lesson.** `mutation` and
`check-mutation` are not in `ci.yml` while the stage is private; they run in `nightly.yml`, and
nothing has been pushed for a nightly to run. Meanwhile `check-mutation` reads
`tmp/mutation/mutation.json` — whatever report is lying on disk — so a snapshot rewritten on
2026-09-07 recorded a run from before the breakage and said nothing, truthfully, about rows
that had not moved.

The repair is two words in a spec: `describe.skipIf('__stryker__' in globalThis)`. Not a probe
of the platform — Stryker's own marker, so both ways this can go wrong are **loud**. Skipped
there and running in `test`, which CI executes on every commit: if the zone ever stops moving
there the cases go red rather than quietly not running, and if a Stryker upgrade renames its
namespace the mutation run goes red instead. What a guard must never buy is a silent third
state.

**And the general shape:** a gate whose only automatic runner is a workflow that has never
executed is a gate with no negative control on its own liveness. `check-mutation` guards the
report's contents in seven points and has nothing to say about whether a report was produced
today, because the run and the reading are two targets and only the second one speaks.

### <a id="lesson-183"></a>`lesson-183` — A pause is true before it is visible, and webkit reports it in that order

The skeleton's `paused` input froze the sheen in chromium and firefox and travelled 40 px in
webkit — with `getComputedStyle(el).animationPlayState` already reading `paused` when the case
took its first measurement.

The probe that settled it read four things at once, four times: the shade's own x against its
track, the resolved `inset-inline-start`, the animation's `playState` and its `currentTime`.
**The clock was frozen at the very first reading** — 1820 ms, identical in all four — while the
resolved position moved once, from 197.72 px to 214.13 px, and then held 214.13 for the rest of
the run. So webkit stops the animation immediately and lets the STYLE RESOLUTION catch up a few
frames later; the value a case reads in the click's own task is the one the sheen was leaving,
not the one it stops on.

Two things follow, and the second is the general one.

A case that reads a paused animation has to let a frame or two pass first, and the wait hides
nothing as long as the measurement window is much longer than it: 150 ms before the reading
against 700 ms of watching, so a sheen that had gone on travelling would be caught many times
over.

And where a platform offers a reading of its OWN state, take it beside the geometry rather than
instead of it. `el.getAnimations()[0].currentTime` is a number no engine's style resolution can
disagree about, and it was already telling the truth in the reading that looked like a failure.
The geometry is what a user sees; the clock is what the platform did. A case that asserts both
says which of the two an engine got wrong.

---

### <a id="lesson-184"></a>`lesson-184` — The server under the suite is a client of the page, and it can navigate it

A case went red once in a full three-engine sweep and passed five times out of five alone:
`landing.spec`'s copy button clicked, and the toast it raises was **not found** for the whole
five seconds. Everything about it invited the usual diagnosis — a click before hydration, a
toast that expired between polls, a worker starved of CPU — and every one of those is wrong.

The call log carried one line that none of them explains:

```
- waiting for" http://localhost:4300/" navigation to finish...
- navigated to "http://localhost:4300/"
```

Playwright emits that line from exactly one branch, and only when the main frame holds a
**pending document request** at the moment the assertion begins its pre-checks. The test's own
navigation cannot be it: `visit()` awaits `goto`, then `html[data-docs-ready]`, then
`document.fonts.ready`, and all three require a committed document. So a SECOND navigation to
the same URL arrived between the helper returning and the click returning — it replaced the
document that received the click, and the toast went with it.

Nothing in the application can issue one. The control is a native `<button>` with no `href`,
there is no `<form>` in the landing template or in the shell that hosts the outlet, so the
default `type="submit"` has no form owner to submit to, and the handler touches only the
clipboard and the toaster. **The sender was the dev server the suite runs against**, and it has
two of them: `@angular/build`'s HMR channel after a rebuild ("Page reload sent to client(s)"),
and Vite's own dependency optimizer — which needs no file change at all and fires during cold
start, as the first request for a lazy route reveals a bare import the prebundle did not have
("optimized dependencies changed. reloading"). A long sweep is exactly the shape that first
requests a lazy route.

Two things follow.

The first is the repair: a suite's server may not be a page's second author. `liveReload: false`
shuts Angular's channel and `prebundle: false` shuts Vite's — the second is the optimizer's own
call and is not under the first flag — and `reuseExistingServer` goes to `false`, because with
it true a `docs:serve` somebody left running on the port is attached to instead and the
configuration is bypassed entirely.

The second is why it took a sweep and a workflow to see: `trace: 'on-first-retry'` traced
nothing, because the preset sets `retries` to 2 in CI and 0 everywhere else. A local flake was
never retried, so it was never traced, and the only evidence it left was the call log it was
lucky to print. A trace setting that depends on a retry that never happens is not a trace
setting. `retain-on-failure` costs a file and answers the next occurrence on its own.

---

### <a id="lesson-185"></a>`lesson-185` — A day's string is not fixed-width, and two functions had assumed it was

The first property sweep over `day.ts` found two holes, and both sat exactly where the
module's own documentation was **wider than its code**. The type's header says the shape is
`YYYY-MM-DD` "with a four-or-more-digit year". Forty lines further down, `pctCompareDays`
carried the sentence "The shape is fixed-width and zero-padded, so this is a string compare".
Two claims in one file, contradicting each other, and each one true of a different day.

The fifth digit is reachable from inside the module: `pctAddDays('9999-12-31', 1)` is
`'10000-01-01'`. Ten characters sort after eleven, so `pctCompareDays('2026-01-01',
'10000-01-01')` answered `1` — the earlier day reported as the later one — and `pctClampDay`
pulled a day four thousand years past `max` down to **`min`**, the wrong bound entirely.
`calendar.ts` held a third copy of the same `<` in the predicate that decides which cells a
user may take.

The other end is worse, because it is loud in the wrong place. `pad(-1, 4)` is `'00-1'`, so
`pctAddDays('0000-01-01', -1)` returned `'00-1-12-31'` — a string `isPctDay` refuses and
`pctDayParts` crashes on, from an unchecked `as RegExpExecArray` four calls away from the walk
that caused it. Past the ECMAScript date range the fields are `NaN` and it read
`'0NaN-NaN-NaN'`.

The repairs are small: the compare reads the three fields, the clamp and the calendar's bound
test go through it, and `pctDay` throws a `RangeError` for a day this shape cannot write —
because a year below zero is not something `<input type="date">`, JSON or SQL `DATE` can
carry, which is the only reason this type is a string at all. The ceiling was then measured
rather than reasoned: bisecting `pctAddDays` puts the last writable day at **`275760-09-13`**,
256 days past what the first draft of that error message claimed.

What generalises is not the arithmetic. A hand-written case is written by somebody who knows
the intended range, and the intended range is precisely where neither of these holes was.
Both stood one step outside it, both were reachable by the module's own arithmetic, and
neither had a single symptom before a generator walked there.

---

### <a id="lesson-186"></a>`lesson-186` — A sweep's seed belongs to the mutation snapshot, and its shrink is a lead

Two honesties a generated suite owes, and neither is obvious until it costs something.

**The seed is a constant.** A mutation score is a measurement of the suite, and a suite that
draws different cases every morning is a different suite: a mutant killed by the case a
Tuesday seed reached survives on Wednesday, `check-mutation` compares against a tracked file,
and the drift reads exactly like a deleted assertion. So the run is a function of
`PCT_PROPERTY_SEED`, which nothing in CI sets, and hunting is what that variable is for.

**The shrink assumes the body is a function of its case, and a body driving a fixture is
not.** The descent replays candidates against whatever state the run has already left in that
`TestBed`. Measured: disabling the number parser's bidi strip turns the rounding sweep red,
and the descent walks to `en-US` — a locale that strip cannot reach, a case that does not fail
on its own. Which sweeps went red is the part that holds; the counterexample says where to
start looking, and for a stateful sweep it says no more than that.

---

### <a id="lesson-187"></a>`lesson-187` — Nine green properties, four mutants alive

Four property sweeps went in green — 2 880 generated cases over `placement.ts` alone, nine
laws, no failures. An independent pass then generated mutants of that source and asked which
of the nine killed them. **Four mutants survived every one, and the worked cases beside
them**: swapping the last two entries of any row of `FALLBACKS`, the list that says where a
panel goes when the window has no room. `core.spec.ts` pins that order for the `top` row
alone, so three of the four rows were measured by nothing in the repository.

A property that cannot fail is worse than a missing one, because it reads as coverage. Four
families of it, all found here:

- **the expectation read back out of the implementation's own output** — a gap of zero
  compared against `gaps.x === undefined ? undefined : 0`, whose shape can never disagree;
- **the law copied from the implementation, with the same oracle on both sides** —
  `isPctDay`'s "accepts the last day of every month" reduced to `last <= last`, because
  `last` was `pctDaysInMonth(year, month)` and so is the function's body;
- **the assertion implied by its neighbour** — a strip's numbers in range, strictly
  increasing and distinct, all three of which follow from the conservation law above them;
- **the generator whose range never reaches the branch** — a rounding sweep drawing four
  decimals into a field that allows four, where 22 of 60 cases rounded nothing.

The remedy in every case is an oracle the implementation does not own: the platform's own
epoch instead of a weekday table (`pctWeekday` was invariant under all seven rotations of the
ring), `Date`'s normalisation instead of the month-length function, `toISOString().slice(0,
10)` instead of the pad width, a second construction instead of the same expression twice.

And the direction that follows is not "more properties". The hardening pass **deleted more
than it added and came out stronger**: `placement` lost a whole test and 21% of its calls,
`pagination` went from 146 renders to 117 while gaining the three laws that say what
`siblingCount` and `boundaryCount` mean and when a stepper is spent, `number` shipped 284
cases where it had 300. A sweep's worth is not its case count.

---

### <a id="lesson-188"></a>`lesson-188` — The battery is a habit, not a list, and what it omits goes red in silence

On 2026-09-11 two gates were found red, both since 2026-09-09, and the only thing they have in
common is that neither is in the handful anybody runs by hand before a commit.

`check-index` had been failing on a fixture README's case table and on a lesson count in
`docs/README.md` — both of them stale by one edit, both of them cheap to read. `check-bundle`
had been failing since `b6013c0`, where a `regions` refactor shed 29 B of that entrypoint and
the size snapshot was never reseated; **twenty-one commits stood on top of it**, and the
number that finally surfaced it belonged to a different change entirely.

The two gates are nothing alike. One reads tracked text in a second; the other costs a
production build and three probes through the real builder, which is exactly why it is not in
the quick pass. What they share is the shape of the failure: a set that lives in somebody's
habit has no negative control. Nothing fires when it shrinks, and a gate that has quietly
left it reports green by never being asked.

[`lesson-143`](#lesson-143) is the same thing one floor up — the formatter is not in the
battery either, so a scoped `format:write` on a clean tree formats nothing and CI is the first
thing that says so. Three occurrences is a pattern, and the pattern is not a weak memory: it
is an unwritten list. Written down where a reader can see what it leaves out, the omission
becomes an argument somebody can lose.

---

### <a id="lesson-189"></a>`lesson-189` — A plan item can be stale in the direction of DONE

On 2026-09-11, asked for "the next two items of section 5", the first thing the reading turned
up was that one of them had shipped nine days earlier. `698091e` built `[pctTheme]`, its unit
spec and its e2e control, and that commit's own title says `req-token-directive closes`. The
registry has read ✅ enforced ever since. The checkbox stayed open for **149 commits**.

Every habit this repository has against a lying document watches the other direction — a plan
claiming something is done when it is not. This one **under**-claimed, which is exactly why
nothing caught it: an unticked box asks nobody a question. It is not harmless. A maintainer
reads this file to choose what to work on, so an item left open is work offered, and the only
thing standing between that and doing it twice was a session that happened to check first.

The two documents were each right about themselves and neither could see the other: the
registry is generated from the requirements, the plan is hand-kept, and the one thing joining
them is a `req-` identifier written in both. That identifier is the comparison, and making it
costs a loop ([4.51](plan.md)).

---

### <a id="lesson-190"></a>`lesson-190` — "Enabled somewhere" is not a placement rule

`libs/tokens/bridge.mjs` writes the Figma side of the token sources: sets, and themes over
those sets. It builds the base theme by **naming the sets to leave out** —
`semantic.dark`, `motion.reduced` — so on 2026-09-11 the new `density.compact` fell straight
into it and was enabled in the light theme and the dark one at once. A designer opening
Tokens Studio would have read 26/32/38 as this library's default control heights.

`check-bridge` has sixteen negative-control cases and it stayed green, because the question it
asks is whether every set is enabled **somewhere**. A set enabled in the wrong place is
enabled somewhere. The gate was not weak about placement; it had no opinion about placement at
all, and a reader of its green line has no way to tell the two apart.

The shape is [`lesson-188`](#lesson-188)'s and [4.51](plan.md)'s a third time: a list kept by
naming its exceptions grows silently wrong, and only the thing it forgot ever notices. What
found this one was building a second thing over the same sources and watching where it
landed — not the gate, and not a reading of the gate.

The repair is a rule about the source's own naming rather than another exception list: a set
whose file name carries an axis word belongs to that axis's group, and a base is what is left.
