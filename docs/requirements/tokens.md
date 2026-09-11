# Requirements — tokens, styling and themes

This area merges three former sections that described **one layer** — and some of their points
were duplicated: two pairs of requirements said the same thing in different words.

**The governing principle: CSS-first, zero-runtime.** A theme at runtime is nothing but
cascading CSS — no JS engine generating styles. That is where the SSR safety comes from (no
FOUC, no hydration mismatches), along with zero runtime cost and the ability to override with
plain CSS.

> The shape of an entry and the meaning of the **Gate** / **Control** fields are described
> in the [README](../README.md#requirement-shape).

---

## The source layer

### <a id="req-token-dtcg"></a>`req-token-dtcg` — The source of truth is the DTCG format

**Promise.** Tokens are written in the W3C Design Tokens Community Group format (JSON with
`$type` / `$value` and `{…}` references). The format is portable — read and written by design
tools (Figma / Tokens Studio).

**Gate:** `libs/tokens/build.mjs` — the build will not start on a malformed source
**Control:** none — deliberately: a parse error is immediate and loud
**Lessons:** [`lesson-4`](../lessons.md#lesson-4)

---

### <a id="req-token-bridge"></a>`req-token-bridge` — The sources round-trip through Tokens Studio

**Promise.** `libs/tokens/bridge.mjs` writes the DTCG sources as the multi-file layout
Tokens Studio for Figma syncs to — one file per set in the plugin's DTCG dialect,
`$themes.json` (light and dark on a scheme axis, full and reduced on a motion axis,
comfortable and compact on a density axis) and
`$metadata.json` (the order the build resolves in) — and reads the plugin's export back,
writing a changed `$value` or `$description` into the source token it belongs to and
**nothing else**. A set, a name, a type and a modifier are decisions made here: the import
refuses them ([0020](../decisions/0020-the-palette-carries-no-spares.md) — the exported
palette is the ramp as it is, holes and all). Shadows and easings are CSS in the sources and
objects in the plugin; the bridge translates on the way out and back, and a value that comes
back unchanged leaves its source text exactly as it stood, so `import(export(src)) === src`
byte for byte — `$comment` keys included, which is why the bridge parses the files with an
order-keeping parser of its own rather than `JSON.parse` (an object puts `200` before a
`$comment` that stood between `100` and `200`).

**Gate:** `tools/check-bridge.mjs` (target `check-bridge` in the root project, in CI) — six
points: every set exported and ordered once, with themes; every token's type and value shape
in the plugin's dialect; every reference resolving inside every theme that enables its set;
every set enabled by some theme, theme names unique per group; the round trip the identity;
and the three refusals measured live on a doctored export. `nx run tokens:bridge` writes the
folder for a designer (the `tokens-studio` directory of the library's build output, ignored
by git like the rest of it); the gate exports in memory and depends on no artefact
**Control:** `tools/check-bridge.fixtures/` — 16 prepared inputs, each rejected on its own
point: among them `a-shadow-as-a-string.json` (the CSS string the sources write, which the
plugin shows blank), `a-reference-outside-the-theme.json` (the dark theme stops enabling the
light semantics, and a component token dangles in Figma while CSS still resolves it),
`a-value-changed-in-figma.json` (an export that is no longer the mirror — the change comes
in through the import, where the build and `check-tokens` judge it) and
`a-modifier-from-figma.json`. Plus the run that shaped the parser: the first import through
`JSON.parse` moved `primitive.json`'s ramp comment — a round trip "with no changes" that
rewrote a file
**Decision:** [0020 — the palette carries no spares](../decisions/0020-the-palette-carries-no-spares.md)

> One token is a length the plugin stores and Figma cannot hold as a variable:
> `pct.container.padding-x` is a `clamp()`. It rides through the export as the string it is —
> the dialect point admits a CSS function as a length — and a designer sees the expression
> rather than a number. That is the honest reading of a fluid value, not a bridge defect.

---

### <a id="req-token-artifacts"></a>`req-token-artifacts` — The build generates artifacts from the source

**Promise.** Out of the DTCG source come **two** artifacts: CSS with custom properties (the
distributed themes) and TS types/constants with the token names. The TS is **generated**, not
hand-written. `tokens.ts` emits two shapes of the same knowledge: `PctTokenName` (the DTCG
path) and `PctCssVar` (the custom property name). There is no Sass artefact — what one would
have bought is a name check, and that is point 8 of the token gate
([0018](../decisions/0018-no-sass-entry-point.md)).

**Gate:** the `typecheck` target of the `sandbox-e2e` project — the `tokenOf` / `rootToken`
helpers take a `PctCssVar`, so a typo in a token name is a **compile error** rather than
a green test comparing two empty strings
**Control:** swapping one name for a wrong one produces 6 type errors — a run documented in
[`lesson-43`](../lessons.md#lesson-43)
**Lessons:** [`lesson-42`](../lessons.md#lesson-42), [`lesson-43`](../lessons.md#lesson-43)

> **Open — no external consumer.** There is nobody to use the typed names **on the consumer
> side** today, because `@pacit/tokens` is `private`. Ties into
> [`req-token-skin`](#req-token-skin).

---

### <a id="req-token-tiers"></a>`req-token-tiers` — Three tiers of tokens

**Promise.**

- **primitive** — raw values with no meaning (`--pct-blue-500`, `--pct-space-4`): the colour
  ramps and the scales. The **ramps are private** — a colour has a semantic tier above it, so
  a ramp is this skin's implementation; the scales have none and stay public
  ([0019](../decisions/0019-primitives-are-not-the-contract.md)). The ramps are **not** kept
  whole from 50 to 950: a step stands here only if a token or a stylesheet reads it
  ([0020](../decisions/0020-the-palette-carries-no-spares.md)),
- **semantic** — intent and states (`--pct-primary`, `--pct-surface-100`, `--pct-text-muted`,
  `--pct-focus-ring`); **the only layer a theme author has to know**,
- **component** — per component (`--pct-button-bg`); they reference semantic tokens only,
  **never** primitives.

The reference graph therefore runs **downwards only**: component → semantic → primitive →
literal. A sideways reference (one component's token pointing at another's) also breaks
[`req-token-override`](#req-token-override), and an upward one (semantic pointing at
component) inverts the whole model.

**Gate:** `tools/check-tokens.mjs` (target `check-tokens` in the root project, in CI) —
points 6 and 9. For **colour** the rule has not one exception: above colour the semantic layer exists
and is complete, so a component colour pointing at a primitive or written in as a literal
fires. For **dimension** the exceptions are the axes declared in
`libs/tokens/src/levels.policy.json` (today `control`, `font`, `radius`, `space`, `target`),
and that list is watched from both sides: an unused axis fires, and an axis carrying
a `$type: color` token fires on the declaration itself. **Point 9** watches the floor from
underneath: a primitive read by no token and no stylesheet fires, because the tier model says
which way a reference may point and nothing about a step nobody stands on
([0020](../decisions/0020-the-palette-carries-no-spares.md)). Plus `libs/tokens/build.mjs` —
auto-discovery of `component.*.json`, so adding a component needs no build changes
**Control:** `tools/check-tokens.fixtures/` — one input per rule: `colour-under-semantics`,
`colour-literal`, `sideways-reference`, `upward-reference`, `primitive-with-reference`,
`shared-axis-dead`, `shared-axis-coloured`, `undeclared-axis`, `dead-primitive`; plus runs
against the repository: `--pct-button-bg` repointed at `{pct.blue.600}`, a field colour written
in by hand, `--pct-select-bg` pointing at `{pct.field.bg}`, the `space` axis removed from the
policy (15 violations), the `motion` axis added without being used, and point 9 finding
`--pct-blue-50` and `--pct-red-700` on the real sources — the run that removed them. Disarming
point 9 moves `dead-primitive` alone to "PASSED and was meant not to", and disarming its
stylesheet half condemns the whole motion axis
**Lessons:** [`lesson-74`](../lessons.md#lesson-74)

> **The exception for dimension axes is written down, not silent.** Read literally, the rule
> was broken **35 times** in this repository — every component dimension token points straight
> at a primitive, because above dimension there is no semantic layer and one cannot be added
> without inventing roles nobody needs. `pct.control.height.md` is not a "raw value with no
> meaning" either: it is the shared axis of the button and the field row
> ([`req-api-size`](api.md#req-api-size)), i.e. the very lever the semantic layer would be.
> A gate written without this note would have to either fire on the entire repository or
> quietly not measure dimension at all.

---

### <a id="req-token-references"></a>`req-token-references` — References stay as `var()`

**Promise.** Token → token references are preserved in the generated CSS as `var()` rather
than expanded to values. Every tier emits a `var()` to the tier below — which is what makes
overriding one variable in any scope cascade by itself.

**Gate:** `apps/sandbox-e2e/src/theme.spec.ts` — overriding a semantic token changes the
component one
**Control:** the test compares the component token in `:root` **and** in a scope — the
semantic token alone passed despite a broken component layer
([`lesson-17`](../lessons.md#lesson-17))
**Lessons:** [`lesson-17`](../lessons.md#lesson-17)

---

### <a id="req-token-closure"></a>`req-token-closure` — A theme block contains the transitive closure

**Promise.** In a theme block (e.g. `[data-theme="dark"]`) the build emits not only the
overridden semantic tokens but **every token that depends on them** — directly or through
a chain of references.

**Gate:** `apps/sandbox-e2e/src/theme.spec.ts` — a **component** token compared in `:root` and
in a scope
**Control:** the run from [`lesson-17`](../lessons.md#lesson-17): before the fix
`--pct-surface` was correctly dark while `--pct-button-bg` and `--pct-select-panel-bg`
returned light values — a gate on the semantic token alone **passed**
**Decision:** [0012 — the transitive closure in a theme block](../decisions/0012-theme-closure.md)
**Lessons:** [`lesson-17`](../lessons.md#lesson-17)

> The reason is in the mechanics of CSS: custom properties are substituted **at the point of
> declaration**, not of use. A token `--a: var(--b)` declared in `:root` inherits an
> already-expanded value, so overriding `--b` in a nested scope will not change it.

---

### <a id="req-token-names"></a>`req-token-names` — A token name can be guessed

**Promise.** The scheme is `--pct-{component}-{part}-{property}-{variant}` (e.g.
`--pct-button-bg-hover`), so that a token can be guessed **without documentation**. The
variant — a state (`hover`, `disabled`) or a size (`sm`, `lg`) — always comes **last**; `md`
never appears, because it is the base value ([`req-api-size`](api.md#req-api-size)). The
semantic layer has its own flat shape, `[on-]{role}[-{variant}]`, and the primitive layer is
the DTCG path one to one.

**Gate:** `tools/check-tokens.mjs` (target `check-tokens` in the root project, in CI) — eight
points. Point 3 parses every name against the dictionary in
`libs/tokens/src/names.policy.json` and requires the component in a name to be a real package
entrypoint; point 5 compares `libs/tokens/tokens.snapshot.md` with the current list; point 8
requires every `--pct-…` a stylesheet reads or declares to be a token of the skin, in any
property. Points 1, 2 and 4 guard the denominator: two independent readings of the list
(`dist/pct.css` against the DTCG sources), agreement of `tokens.ts` with that list, and a ban
on dead words in the dictionary
**Control:** `tools/check-tokens.fixtures/` — 34 inputs, each rejected on its own point **and
its own rule**; plus runs against the repository: renaming to another valid name fires point 5,
`disabled-bg` instead of `bg-disabled` fires point 3, `component.dialog.json` with no
entrypoint fires point 3, a stale `dist` fires point 1, a word added to the dictionary without
being used fires point 4, and `min-height: var(--pct-button-heigth)` — a misspelling no colour
rule can see — fires point 8

> The same rule governs **requirement identifiers** — and it is where the move away from
> numbers came from. See [README](../README.md#why-slugs-not-numbers).

> **A snapshot alone does not close this — it freezes it.** The gate, when it was written,
> found 34 tokens with their segments in reverse order (`--pct-checkbox-checked-bg` next
> to `--pct-checkbox-border-hover` in the same file), so knowing one name did not let you guess
> its sibling. A snapshot laid before normalisation would have recorded that drift as the
> accepted state. Hence point 3 **before** point 5 — and hence the normalisation done in the
> same move as the gate.

---

## Contrast and states

### <a id="req-token-text-pairs"></a>`req-token-text-pairs` — A surface has a matching text token

**Promise.** Every colour the library **paints** — as a background, as text or as an outline —
has a pair in `libs/tokens/src/contrast.policy.json` that it is measured against. Where
a surface is inverted relative to the page, its text token is named `--pct-on-*`
(`--pct-on-primary`), and such a pair must have both sides: an existing role and real use.

**Gate:** `tools/check-tokens.mjs` (target `check-tokens` in the root project, in CI) —
point 7. The denominator is not the list of names ending in `-bg` and `-fg` but the **sass**
output for the `libs/components` stylesheets, **with the comments taken out of it first**: a
token brought in by a mixin or assigned to another custom property paints too, and a loud
comment survives compilation, so prose carrying a colon at the start of a line reads as a
property whose value swallows the declaration under it. The reading is in two shapes, because a property name
promises different things: where the whole value is a colour (`background`, `background-image`,
`color`, a border) every `var()` under it is one, and where the value is **composite** — a
`box-shadow`'s offsets and its colour side by side — the property decides nothing and the
skin's own `$type` decides instead. **What this reading still cannot say is named here
rather than only in the code:** inside a composite value a token whose `$type` is not
`color` takes no role, so a dimension token standing in a shadow's COLOUR slot is caught by
nothing — the browser answers it by dropping the declaration, and the gate says nothing.
The `on-*` rule does read names, because a pair that is
declared and never painted leaves no trace in a stylesheet. The thresholds are still computed
by `libs/tokens/build.mjs` ([`req-token-contrast`](#req-token-contrast)) — this point only
makes sure it has something to compute
**Control:** `tools/check-tokens.fixtures/` — `unmeasured-colour` (a stylesheet painting
a background with a token outside the policy), `pair-removed-from-policy` (the same rule from
the other side), `colour-in-a-gradient` and `colour-in-a-shadow` (the same rule reached
through the two properties the reader was blind to), `dead-on-pair`, `on-without-surface`,
`dimension-painted-as-colour`, `token-outside-theme`, `colour-under-a-comment` (a painting
standing under prose the scanner read as a declaration) and `sheet-removed` for the denominator;
plus runs against the repository: a new `background: var(--pct-surface-disabled)` declaration
in `button.scss` fires, removing the `button/solid — label` pair from the policy fires,
removing `UI: the ring around today` fires as of 4.39 and was silent before it, restoring the
dead `--pct-on-danger` fires once the snapshot is accepted

> **The policy was once silent about 27 colours.** The contrast gate counted 38
> pairs and was green; outside its reach stood every hover and disabled state of the button,
> the error messages of the checkbox, the radio and the select, and seven borders — plus two
> **semantic** tokens painted directly by the outline variant (`--pct-surface-100` beneath the
> `--pct-primary` label), which no rule based on component token names could have seen. This is
> the same class as [`lesson-33`](../lessons.md#lesson-33): a gate examines only what somebody
> typed into it first.
>
> Adding the missing pairs **immediately knocked the build over**: three of them failed AA in
> the dark theme (the button label on hover 3.45:1, on active 2.66:1, the outline variant's
> label on hover 3.98:1) — see [`lesson-52`](../lessons.md#lesson-52).
>
> **And it went on being silent about two more paintings, one floor down.** The rule was
> repaired; the READER under it still keyed on the property name, so neither the hero
> gradient's `background-image` nor the ring's `box-shadow` was a declaration it read. The
> ring's colour was therefore in no denominator at all, and the gradient's stops counted only
> because a second stylesheet spelled them as a `background`. Both had policy entries and
> both entries were there because a person put them there:
> deleting `UI: the ring around today` was a green run until 4.39 taught the reader the two
> shapes of a value — [`lesson-168`](../lessons.md#lesson-168).
>
> **And a third time, one floor further down, in the INPUT.** The rule was right and the
> reader was right, and the text they were given was not: sass keeps a loud comment, so four
> declarations of the library reached the scanner under the last word of the prose above them
> rather than under their own property (4.40). All four carry dimensions, so nothing was red
> and nothing was wrong — what the day cost was the guarantee, since a painting under such a
> comment would have been a colour the point never counted, and green. Three silences, three
> floors, one shape: the gate examined only what it was handed
> ([`lesson-169`](../lessons.md#lesson-169)).

---

### <a id="req-token-contrast"></a>`req-token-contrast` — The contrast gate as a skin policy

**Promise.** A skin definition contains a policy — a list of `fg`/`bg` pairs (role × state)
with a WCAG level and a `severity`. While the skin is built, for every theme, the gate
computes contrast against the WCAG 2.2 thresholds (normal text AA 4.5:1, large AA 3:1, UI
components SC 1.4.11 3:1), blocks the build at `severity: error`, warns at `warn` and reports
**which size variant passes and which does not**.

**Gate:** `libs/tokens/build.mjs` (target `tokens:build`, in CI through `^build`); the
completeness of the policy itself is guarded by `tools/check-tokens.mjs` point 7
([`req-token-text-pairs`](#req-token-text-pairs)) — without it this gate measures only what
somebody typed into it
**Control:** the run from [`lesson-6`](../lessons.md#lesson-6): the original guard let
`disabled` through at a real contrast of ~1.6:1 — the gate has a documented case in which it
**did not fire**, and the fix that changed that
**Lessons:** [`lesson-6`](../lessons.md#lesson-6), [`lesson-10`](../lessons.md#lesson-10)

---

### <a id="req-token-no-opacity"></a>`req-token-no-opacity` — States do not use `opacity`

**Promise.** Every state (hover, active, disabled, …) has its own concrete colour tokens.
`opacity` is **forbidden for text layers**, because it changes contrast at runtime in a way
the gate cannot see (composition with the background).

**Gate:** `tools/check-styles.mjs` (target `check-styles`, in CI) — point 6: `opacity` in the
library's stylesheets is allowed only as a visibility switch (`0` or `1`). Any value in
between **composes with the background**, i.e. moves the real contrast outside the contrast
gate's result; a non-literal value (`var(...)`, `calc(...)`) is statically undecidable and so
fires as well. The family covers the SVG variants (`fill-opacity`, `stroke-opacity`), because
the composition is the same and only the name differs
**Control:** `tools/check-styles.fixtures/partial-opacity/` (a state expressed through
`opacity: 0.6`) and `opacity-from-variable/` (a value from a token). Plus a run against the
repository: `opacity: 0` in `checkbox.scss` changed to `0.45` fires point 6
**Binds at:** immediately — this is a promise whose breach **rolls back**
[`req-token-contrast`](#req-token-contrast) to its state before
[`lesson-6`](../lessons.md#lesson-6), and does so quietly

> `transition: opacity` and a 0 → 1 transition are deliberately let through. A transient state
> is not what [`req-token-contrast`](#req-token-contrast) is about, and a ban covering
> animation would take away the one standard way of bringing overlays in.

**Lessons:** [`lesson-6`](../lessons.md#lesson-6)

---

## Themes

### <a id="req-token-css"></a>`req-token-css` — Tokens compile to native custom properties

**Promise.** Styling and theming rest on design tokens translated into native CSS custom
properties. Changing the theme **requires no SCSS recompilation** and no JS engine.

**Gate:** `apps/sandbox-e2e/src/theme.spec.ts`,
`libs/components/check-package.mjs` (point 3: token closure in the artifact)
**Control:** `tools/check-package.fixtures/token-without-declaration/` — a package in which a used
`var(--pct-*)` has no declaration anywhere must fire point 3. The browser would substitute the
initial value for it, so without this control the failure is invisible
**Lessons:** [`lesson-18`](../lessons.md#lesson-18), [`lesson-36`](../lessons.md#lesson-36)

---

### <a id="req-token-scss"></a>`req-token-scss` — Internally we use SCSS

**Promise.** The library's and the apps' styles in the workspace use SCSS.

**Gate:** none — deliberately: the file extension is visible in review, and a stylesheet in
another language would not build
**Control:** not applicable

---

### <a id="req-token-override"></a>`req-token-override` — Tokens can be overridden for chosen components

**Promise.** Overriding a semantic token re-themes everything below it; overriding a component
one (`--pct-button-bg`) changes only that component.

**Gate:** `apps/sandbox-e2e/src/theme.spec.ts`
**Control:** as in [`req-token-closure`](#req-token-closure) — comparing the component token,
not the semantic one
**Lessons:** [`lesson-17`](../lessons.md#lesson-17)

---

### <a id="req-token-layers"></a>`req-token-layers` — The stacking order is a list, and every number in it is read

**Promise.** What stands above what is one order — page < drawer < overlay < toast — written
once, in `libs/tokens/src/layers.policy.json`, and not three numbers in three files. The
library's own layers are tokens (`--pct-drawer-z-index`, `--pct-toast-z-index`), so an
application with a layer of its own between the page and ours, or above ours, has a place to
say so; the overlay's number is the dependency's, the `z-index` the CDK stamps on its overlay
container, and it is read from the stylesheet the applications load rather than remembered in
a comment. A fourth component that needs a layer says where it stands in the list instead of
inferring the middle of two token files. Where the top layer exists, the order things were
shown in outranks every number here ([`lesson-122`](../lessons.md#lesson-122)); where it does
not, this order is what holds.

**Gate:** `tools/check-tokens.mjs` (target `check-tokens` in the root project, in CI) — point
10: every layer of the order is defined, every number is read from where it lives — a token
from the sources, the dependency's from `node_modules/@angular/cdk/overlay-prebuilt.css` on
every run, so that a bump moves this order and not a comment — the numbers come out strictly
increasing along the order, and a `z-index` token no layer places fires. Plus the two hit
tests: `apps/sandbox-e2e/src/drawer.spec.ts › a panel opened from inside the drawer stands
above it` and `apps/sandbox-e2e/src/toast.spec.ts › a message raised while the modal is up
stands over it`, in three engines
**Control:** `tools/check-tokens.fixtures/` — `layer-in-the-order-undefined` (an order naming a
layer with no number), `overlay-number-unread` (the dependency's stylesheet with no `z-index`
on its container, the shape of a bump), `z-index-outside-the-order` (a `--pct-button-z-index`
no layer places) and `drawer-over-the-overlay` (the drawer's token at 1200) — each rejected on
its own rule of point 10; the reference input re-probes the real dependency's file, laid down
from the repository
**Decision:** [0047 — a drawer is a region of the page, not a layer over it](../decisions/0047-a-drawer-is-a-region-of-the-page-not-a-layer-over-it.md)
**Lessons:** [`lesson-122`](../lessons.md#lesson-122)

### <a id="req-token-scoped"></a>`req-token-scoped` — A theme for part of an app

**Promise.** A different theme for a subtree (a scoped theme) is done by cascading custom
properties on a chosen element (`[data-theme="dark"]`, `.pct-theme-x`), with no recompilation
and no JS engine. Overlays rendered outside the host tree get the theme **carried over
explicitly**.

**Gate:** `apps/sandbox-e2e/src/theme.spec.ts`, `apps/sandbox-e2e/src/a11y.spec.ts`
("a scoped theme keeps working under automatic dark mode"). Every sandbox card sets the theme on
**its own stage**, so every example doubles as a scoped-theme test
**Control:** see [`req-token-closure`](#req-token-closure)
**Lessons:** [`lesson-17`](../lessons.md#lesson-17), [`lesson-18`](../lessons.md#lesson-18)

---

### <a id="req-token-directive"></a>`req-token-directive` — The `[pctTheme]` sugar directive

**Promise.** Setting the theme from a template through a `[pctTheme]` directive. The
underlying mechanism remains the cascade itself — the directive is a convenience, not
a condition.

**Gate:** `libs/components/theme/src/theme.spec.ts` — the attribute written, followed and
removed on `null`; `apps/sandbox-e2e/src/theme.spec.ts` — the sandbox's demo stage sets the
card theme through the directive, so every themed card in the suite exercises it
**Control:** `theme.spec.ts › "the directive and the raw attribute are the same theme"` — a
hand-written `data-theme` panel and a `[pctTheme]` panel side by side read the same
computed `--pct-surface`, or the sugar has become a second mechanism
**Decision:** [0059 — a theme is an attribute the skin reads](../decisions/0059-a-theme-is-an-attribute-the-skin-reads.md)

---

### <a id="req-token-system"></a>`req-token-system` — The theme follows the system until somebody says otherwise

**Promise.** The build emits
`@media (prefers-color-scheme: dark) { :root:not([data-theme]) { … } }` — a page with no
explicit declaration gets the dark theme out of the box. The `:not([data-theme])` selector
makes the system preference **a default, not an order**.

**Gate:** `apps/sandbox-e2e/src/preferences.spec.ts`
**Control:** `preferences.spec.ts › "with no dark preference :root stays light (the
reference)"` — the negative control is **a separate test**, not an assertion inside the
test proper
**Lessons:** [`lesson-38`](../lessons.md#lesson-38)

> The mechanism is built with nesting only because `light` is an **active theme** here rather
> than the absence of an attribute: the `[data-theme="light"]` block carries the full
> counter-overrides, so a light card on a dark system has something to undo the values
> inherited from `:root` with.

---

### <a id="req-token-skin"></a>`req-token-skin` — The skin is fully parameterised

**Promise.** A theme author defines every colour of every state. Components have no built-in
colours and do not dim states with `opacity`. Building a skin runs the
[contrast gate](#req-token-contrast), which gives the author a concrete report.

**Gate:** `libs/tokens/build.mjs` — but **only for the built-in skin**
**Control:** see [`req-token-contrast`](#req-token-contrast)
**Binds at:** when somebody wants a theme of their own — **there is no path today** by which
an outsider would build a skin: `build.mjs` reads a fixed set of files from `libs/tokens/src`,
and the `@pacit/tokens` package is `private`. The sandbox already has a skin axis with one
entry (`base`) waiting for that path

---

### <a id="req-token-distribution"></a>`req-token-distribution` — Themes as ordinary CSS files

**Promise.** Themes are distributed as CSS files (`@pacit/components/themes/…`), imported with
no JS configuration.

**Gate:** `libs/components/check-package.mjs` — points 1 and 2: the skin is in the package and
**reachable by import** (the `exports` map is closed; a file with no entry is invisible to the
consumer)
**Control:** `tools/check-package.fixtures/theme-missing/` — a package with no skin must fire
point 1, and `tools/check-package.fixtures/theme-outside-exports/` — a skin outside the
`exports` map must fire point 2. The run from [`lesson-36`](../lessons.md#lesson-36) was
manual
**Lessons:** [`lesson-36`](../lessons.md#lesson-36)

---

## Axes

### <a id="req-token-density"></a>`req-token-density` — The density axis

**Promise.** A separate token dimension (`comfortable` / `compact`) switched by
attribute/scope, independent of the colour theme.

The switch is `data-pct-density="compact"` on any element, and the mechanism is the cascade:
`libs/tokens/src/density.compact.json` re-points metric primitives — the shared control axis
(26 / 32 / 38 px against 28 / 36 / 44) and the space scale, one step tighter — and the build
emits both scopes with the transitive closure, so a component reading
`--pct-control-height-md` gets the dense value without learning a second word. **Not one
component changed.** Colour stays the theme's; the two axes may sit on the same element or on
different ones.

**Gate:** `tools/check-tokens.mjs` (target `check-tokens` in the root project, in CI) — point
11, four rules. `density-denominator` refuses to rule on an axis that is not there or that
re-points nothing; `density-unpaired` requires `[data-pct-density="comfortable"]` and
`[data-pct-density="compact"]` to declare **the same names**, each also declared in `:root` —
a metric one scope moves and the other does not can be switched one way and not back;
`density-floor-lowered` refuses a compact `--pct-target-min` below the base one; and
`density-below-floor` refuses a compact value that takes a control's **box** under that floor.
What counts as a box is derived rather than typed in — a primitive read by a component token
whose property word is `height` or `size`, which on this skin is
`pct.control.height.{sm,md,lg}` and `pct.target.min` itself. Plus `libs/tokens/build.mjs`,
which emits the two scopes: an axis that stopped being emitted fires point 11's first rule
**Control:** `tools/check-tokens.fixtures/` — four prepared inputs, each rejected on its own
rule of point 11: `density-axis-empty` (an axis emitted as a pair of empty braces),
`density-only-in-compact` (a `dist/pct.css` whose comfortable scope lost a name — the case
carries the artefact, because the two scopes drifting apart is invisible in the sources),
`density-lowers-the-floor` and `density-under-the-floor`. Measured: disarming
`density-floor-lowered` moves its case onto `density-below-floor`, and without the `rule`
field that run would be green; disarming any of the other three turns its own case into
"PASSED and was meant not to". **And the browser measurement the promise really needs** —
`apps/sandbox-e2e/src/density.spec.ts` on the `/density` view: the compact rows read
26 / 32 / 38 px outright (not merely "smaller"), the button follows the field into the dense
scope, the dense stage reads the same `--pct-surface` as the roomy one beside it, and
`Every touch target under compact` walks all thirteen controls that declare a
`--pct-…-target-min` — on their own routes, with the whole page compact — and requires
24 × 24 of each. The corner case `the corner: compact at size sm keeps every target at 24 px`
is the one the gap note named
**Decision:** [0074 — density is a scope that re-points metrics, not an input](../decisions/0074-density-is-a-scope-that-re-points-metrics-not-an-input.md)

> **The floor is what stops the shrinking, and it stops it exactly.** The smallest compact
> step is a measurement rather than a taste: a field draws a 1px border with
> `box-sizing: border-box` and its control column carries
> `min-block-size: var(--pct-target-min)`, so a 26px row lands on exactly 24px inside. At 25
> the floor would push the row back out to 26 and the token would stop being the height —
> the failure [0004](../decisions/0004-explicit-height.md) exists to prevent. Measured in
> chromium under compact: the chip remove, the checkbox, the radio, the date toggle, the
> breadcrumb link and the slider row read exactly 24px in **both** densities, because they
> were already sitting on their floor; the accordion heading went 40 → 36, the tab 36 → 32,
> the field's control column 34 → 30, and the compact `sm` field column landed on 24.00.
>
> **What the static gate cannot see is a layout**, which is why the control is a browser
> measurement and not a second reading of the tokens. Point 11 catches the shape of the
> mistake — an unpaired name, a moved floor, a box below it — and `density.spec.ts` catches
> the fact.
>
> **`[pctDensity]` is deliberately not here yet.** The rule is
> [0059](../decisions/0059-a-theme-is-an-attribute-the-skin-reads.md)'s: sugar arrives when
> the attribute starts to repeat. Density has one writer today, and a directive is an
> entrypoint — a bundle row, a card, a mutation scope. See
> [`req-token-directive`](#req-token-directive) for the shape it will take.

---

### <a id="req-token-logical"></a>`req-token-logical` — Stylesheets use logical properties only

**Promise.** The library's stylesheets use logical properties only (`padding-inline-start`,
not `padding-left`). The layout **mirrors** under `dir="rtl"`. Exceptions only with a comment
justifying them.

**Gate:** `tools/check-styles.mjs` (target `check-styles`, in CI) — point 5: a ban on physical
properties of the inline axis (`left`/`right`, `margin-*`, `padding-*`, `border-*`, corner
radii, `direction`, a multi-value `inset`) and on physical VALUES (`text-align`, `float`,
`clear`). The block axis (`top`/`bottom`) is deliberately off the list: `rtl` mirrors the
inline axis only, and full bidi is a [non-goal](../00-axis.md#explicit-non-goals). An
exception requires a `/* pct-exception <property>: <reason> */` marker adjacent to the
declaration — point 4 fires on a marker with no justification and on one that lands on no
declaration
**Control:** `tools/check-styles.fixtures/physical-padding/` (a property name) and
`physical-text-align/` (a value); for exceptions, `exception-without-justification/` and
`exception-without-use/`. Plus runs against the repository: `padding-inline-start` swapped for
`padding-left` in `field.scss` fires, removing the exception marker above `left: 50%` in
`radio.scss` fires, and a `margin-right` hidden inside a mixin with interpolation fires
point 2 — the comparison of the source text with what sass emits from it
**Lessons:** [`lesson-48`](../lessons.md#lesson-48)

> **The stylesheet gate is a necessary condition, not a sufficient one.** A stylesheet can be
> impeccably logical and the layout still fail to mirror — because the direction does not
> reach where it should. Measured on this occasion: the select's panel lives in a CDK overlay,
> i.e. as a child of `body`, so under `dir="rtl"` the trigger wrote from the right and the list
> below it from the left, with `text-align: start` in the stylesheet
> ([`lesson-35`](../lessons.md#lesson-35) — the third property inherited after theme and
> typeface). So three things guard the promise at once: the stylesheet gate, screenshots in
> `dir="rtl"` (`apps/sandbox-e2e/src/visual.spec.ts`) and layout measurements (`rtl.spec.ts`,
> `a11y.spec.ts` — an axe audit of every view in RTL).
>
> The `dir` axis is a cross-cutting sandbox axis like theme and size: it is switched in the
> global bar or on a single card.
>
> **There is no dividend to collect from giving this up**: `padding-inline-start` is no longer
> than `padding-left`, so dropping it would not save a single line — it would only take away
> the guarantee.
>
> The real cost of RTL lies with the **future** components: Left/Right arrows have to swap in
> horizontal layouts (tabs, slider, carousel), overlays have to mirror (CDK `Directionality`),
> `scrollLeft` has a different sign.
>
> What is deliberately excluded is **full bidi**, not RTL — see
> [non-goals](../00-axis.md#explicit-non-goals).
