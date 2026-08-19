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

The second half of that sentence is true of the **class**, not of the query — and C10 needed the
difference. A token declared beside the group (`PCT_RADIO_OPTION`) and provided by the option
lets a `contentChildren` query see what the options carry, with the import still pointing one
way only. Both roads now stand, and neither replaces the other: the DOM road carries what the
BROWSER holds (which native is checked — `focus()` needs exactly that), the token road what the
options MEAN. The DOM cannot carry the second, because `[attr.value]` is absent for a
non-primitive `T` — which is precisely where `compareWith` lives
([`lesson-72`](#lesson-72)).

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

**Addendum — the third property.** While introducing the `dir` axis into the
sandbox (`req-token-logical`) it turned out that writing direction is exactly the same case —
measured `direction: rtl` on the trigger against `ltr` on the panel. The stylesheet was
impeccably logical all the while: `text-align: start` simply resolves the other way when the
direction does not arrive. So the rule repeated for a third time, which is an argument for
extracting this carrying-over into the overlay layer in `core` (**D2**) instead of appending
a fourth property to `openPanel()`. A secondary conclusion: a gate reading stylesheets is
a necessary condition for the RTL promise, never a sufficient one — the rest lives on the
rendered page.

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

Extracting the list walk into `core` (D1) uncovered a guard nothing had ever run:
`(mouseenter)="option.disabled ? null : activateAt(i)"` in `select.html` — the rule that
hovering a disabled option must not highlight it. **Deliberate regression: the guard was
removed and the whole suite of 213 cases stayed green.**

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

Hence the reason for a decision belongs beside the code that implements it, and a template
keeps a pointer at most. And a second thing, worth knowing before the number is read as a
consumer's bill: the probe bundles the FESM with esbuild and **does not run Angular's
linker**, while a real application does — the linker compiles the template into instructions
and the comments never reach the app. The bytes are real in the package on npm; in the
consumer's bundle they are not. That the snapshot does not say so is **C11**.

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
and the difference between the halves is nobody's assertion — which is why the discovery came
from a template read at C13 and not from a run: the code was correct in every file it was
written in.

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

**A section header in `tools/check-texts.mjs` had been half translated: the comment around it
was English and the name of the language it scans was left standing in a Polish case.** It rode
through the whole of B8, through C1–C15 and through every run in between — 843 files,
5570 distinct words, no exception in the register, green each time. The gate that measures "the
repository speaks one language" had the word in its own denominator on every one of those runs.

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

And then the finding fell into itself. The plan's entry describing the class spelled four
examples of it, so the first run of the new limb was red on the position that had asked for the
limb — the same shape as the file [B3](plan.md#b-readiness-for-the-first-release) nearly deleted
by ticking its own task off. There is nowhere in this repository to quote such a word except the
gate's own tree, where the constant of [`lesson-60`](#lesson-60) already lives: this lesson cannot
print its own evidence, and the sample stands in
`tools/check-language.fixtures/inflected-foreign-stem.json`.

---

### <a id="lesson-78"></a>`lesson-78` — A threshold decides two things and is argued about one

**The size point of `check-bundle` held every entrypoint to ±5% of its recorded number, and
`--write` rewrote the record only when a row left that band.** The band was argued as a failure
threshold — how big a jump has to be before somebody looks — and it was never argued as what it
also was: **the resolution of the record**. Anything smaller was not accepted, it was never
written down.

Measured on an unchanged tree, three of the seven rows stood 76 B above the truth. That is
[C13](plan.md#c-open-findings)'s price: it took a second message line out of `pct-checkbox`,
`pct-radio-group` and `pct-select`, and each of the three got 76 B smaller. The file was last
written at C11, and C13 is the only commit since to have touched a component — so the
attribution needs no guess. A file whose own prose says each row is the size of a production
bundle was describing three bundles nobody had built since.

The other half is who pays. The first change to leave the band rewrites **every** row, so its
diff carries everybody's drift: C10's commit rewrote six rows, one of them C10's. And the band
is not narrow where it counts — ±5% of `./field` is 1115 B, so a component may grow by a
kilobyte in steps with nothing anywhere to show for it.

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
