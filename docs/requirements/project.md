# Requirements — project

How the project is built, out of what, and what comes out of it. This area merges three
former sections that sat apart while answering one question.

> The shape of an entry and the meaning of the **Gate** / **Control** fields are described
> in the [README](../README.md#requirement-shape).

---

### <a id="req-project-monorepo"></a>`req-project-monorepo` — The workspace is an NX monorepo

**Promise.** The whole thing is built as one NX workspace; every target is run through `nx`,
never through the tool underneath.

**Gate:** `.github/workflows/ci.yml` — the entire run goes through `nx affected`
**Control:** none — deliberately: the failure is immediate and total (CI has nothing to run
any target with), so it does not belong to the [`req-axis`](../00-axis.md) class

---

### <a id="req-project-latest"></a>`req-project-latest` — Before 1.0 we use the newest versions

**Promise.** Until the first public release the library stands on the newest available
versions of its libraries and frameworks. The compatibility matrix (which Angular versions
are supported) only starts to apply after that release.

**Gate:** none — deliberately: this is a process rule, not a property of the artifact; there
is nothing to measure on the output
**Control:** not applicable
**Binds at:** the first public release — at that point this requirement is **superseded by**
the compatibility matrix, and the gate comes with it

---

### <a id="req-project-dependencies"></a>`req-project-dependencies` — Minimum runtime dependencies

**Promise.** The library has as few runtime dependencies on other TS/JS libraries as
possible. Allowed: `@angular/*` and `@angular/cdk` (declared as a `peerDependency`; the
consumer includes `@angular/cdk/overlay-prebuilt.css`).

**Gate:** none — gap: a check of the `dependencies` / `peerDependencies` lists in the packed
manifest against the allowed list. Its natural home is a seventh point in
`libs/components/check-package.mjs`
**Control:** none — gap: a manifest with a dependency from outside the list added has to
fire the gate
**Binds at:** the first dependency added out of reflex — today nothing tells `@angular/cdk`
apart from anything else somebody installs

**Non-goals:** [`@angular/animations`](api.md#req-api-animations),
[`zone.js`](#req-project-angular) — see [00-axis.md](../00-axis.md#explicit-non-goals)

---

### <a id="req-project-apps"></a>`req-project-apps` — What lives in the workspace

**Promise.** The workspace holds: the component library, a documentation app (publishable as
the library's site), a "sandbox" app (playground and the base for e2e) and e2e tests built
on the sandbox.

**Gate:** none — gap: `apps/docs` does not exist, so a gate would describe a state that does
not hold. Once it exists: presence of the project in the graph plus its `build` target in CI
**Control:** none — gap: the same as for the gate above
**Binds at:** the first external user — without documentation there is no adoption

> Settled in review: **the inventory of parts and tokens must be generated and gated
> independently of `apps/docs`.** A pretty page rendering it can come later — the two were
> separated ([`req-api-parts`](api.md#req-api-parts)).

---

### <a id="req-project-package"></a>`req-project-package` — One npm package

**Promise.** The library is published as one npm package, `@pacit/components`, with
secondary entrypoints per component.

**Gate:** `libs/components/check-package.mjs` (target `check-package`, in CI) — it examines
the **packed artifact**, not the sources: the `exports` map, reachability of the skin,
closure of the tokens
**Control:** `tools/check-package.fixtures/` — a doctored package for every point of the
gate; each must fire on its own point. The run described in
[`lesson-36`](../lessons.md#lesson-36) (deleting `libs/tokens/dist` → the gate fires) was
manual; here it is automated
**Lessons:** [`lesson-36`](../lessons.md#lesson-36)

---

### <a id="req-project-entrypoints"></a>`req-project-entrypoints` — Secondary entrypoints canonically through ng-packagr

**Promise.** Every entrypoint is a folder with its own `ng-package.json` and `index.ts`
(generator `@nx/angular:library-secondary-entry-point`). It all goes into one npm package,
and entrypoints may depend on each other.

**Gate:** `libs/components/check-package.mjs` — the `exports` map in the packed manifest
**Control:** `tools/check-package.fixtures/theme-outside-exports/` — a file present in the
package but absent from the `exports` map must fire point 2. That is the defect point 1
cannot see: the file is right there, the consumer simply has no way to import it

---

### <a id="req-project-core"></a>`req-project-core` — Shared code in `core`

**Promise.** Code shared between components goes into the internal entrypoint
`@pacit/components/core` (base classes, a11y helpers, id generation, `providePctConfig`),
distributed in the same package.

**Gate:** `libs/components/field/src/field-controls.spec.ts` — the shared message logic is
tested once, not in every control; `libs/components/core/src/core.spec.ts` — the same for the
shared code under its own name, the list walk included ([`lesson-57`](../lessons.md#lesson-57))
**Control:** none — deliberately: the violation here is **duplication**, not a failure;
review catches it, not a test. A machine gate would have to be similarity analysis
**Decision:** [0013 — no headless core / skin split](../decisions/0013-no-headless-split.md)
**Lessons:** [`lesson-21`](../lessons.md#lesson-21)

---

### <a id="req-project-tokens-lib"></a>`req-project-tokens-lib` — Tokens are a separate library

**Promise.** Tokens live in the `tokens` lib with a build target (DTCG → CSS/SCSS/TS). The
generated CSS themes land in the package assets, so that `@pacit/components/themes/…` works.

**Gate:** `libs/components/project.json` → `implicitDependencies: ["tokens"]` +
`check-package` (point 3: token closure in the artifact)
**Control:** `tools/check-package.fixtures/theme-missing/` — a package without
`themes/pct.css` (which is what a green build with an empty `libs/tokens/dist` leaves
behind) must fire point 1; `tools/check-package.fixtures/token-without-declaration/` — a token
used but not declared in the package must fire point 3
**Decision:** [0002 — the skin ships in the package](../decisions/0002-skin-in-package.md)
**Lessons:** [`lesson-36`](../lessons.md#lesson-36)

---

### <a id="req-project-tree-shaking"></a>`req-project-tree-shaking` — The primary entrypoint is minimal

**Promise.** `@pacit/components` exports only `providePctConfig`, the shared types and the
version. Components are imported through secondary entrypoints — which forces tree-shaking
and explicit imports.

**Gate:** `tools/check-bundle.mjs` (target `check-bundle` in `components`, in CI) — ten
points. The probes bundle the **artifact** through `node_modules` and the `exports` map, the
same way a consumer does: point 5 watches which entrypoints an import of one of them pulls
in, point 7 which external dependencies come along (CDK Overlay is allowed in `./select`
only), point 8 the size budget per entrypoint (`libs/components/size.snapshot.md`,
two-sided tolerance ±5%). Point 4 watches that the primary entrypoint brings in no component
at all. The rest is the denominator: two readings of the entrypoint list, presence of the
measured entrypoint in the probe, a second reading of isolation from the bundle text, a
differential check, and a repeat of the measurement with the **real**
`@angular/build:application`
**Control:** `tools/check-bundle.fixtures/` — 22 doctored inputs, each rejected on its own
point; among them `entrypoint-pulls-neighbour/` (importing `./alpha` pulls in `./beta`),
`new-external-dependency/` (an entrypoint reaches for the CDK overlay),
`probe-without-its-entrypoint/` (the measurement stopped pulling anything in) and
`pair-no-larger-than-single/` — literally "an app importing two entrypoints must
produce a noticeably bigger bundle"
**Lessons:** [`lesson-51`](../lessons.md#lesson-51)

---

### <a id="req-project-files"></a>`req-project-files` — A fixed component file structure

**Promise.** Per component: `button.ts`, `button.html`, `button.scss`, `button.spec.ts`,
`button.types.ts`, `index.ts`, `ng-package.json`. Template and styles **always** in separate
files.

**Gate:** none — gap: a check of the entrypoint directory layout (a script in the spirit of
`check-package.mjs`, reading `libs/components/*/src`)
**Control:** none — gap: an entrypoint with an inline template has to fire the gate
**Binds at:** the first component added by somebody other than the author of this rule
**Decision:** [0001 — templates and styles in separate files](../decisions/0001-separate-files.md)

> This is a **deliberate departure** from Angular's official guidance to "prefer inline
> templates for smaller components" — dictated by consistency across a library of dozens of
> components.

---

### <a id="req-project-prefix"></a>`req-project-prefix` — The `pct` prefix

**Promise.** The library's selector and class prefix is `pct`. Sandbox infrastructure uses
`sbx`, the app shell `app`.

**Gate:** `libs/components/eslint.config.mjs` — the
`@angular-eslint/component-selector` and `directive-selector` rules with `prefix: "pct"`
**Control:** none — deliberately: an ESLint rule fires on the first violation and has no
mode in which it "passes quietly" — it does not belong to the [`req-axis`](../00-axis.md)
class

---

### <a id="req-project-language"></a>`req-project-language` — The repository speaks one language: English

**Promise.** Every hand-written text is in English: comment, JSDoc, test name, gate message,
name of a file, a target and a rule, documentation, commit title. Polish exists only as
a **dated entry** in a register of exceptions, each with a reason and the task that removes
it. The public surface may not have **a single** entry there, and it is **two things, not
one**: the package (`types/*.d.ts`, README, `description`, the artifacts in `themes/`) and
**the repository itself**, which stands publicly on GitHub — `README.md`, `docs/` and the
names visible in the Actions tab.

**Gate:** `tools/check-language.mjs` (target `check-language` in the root project, in CI) —
seven points, 24 rules, **two measurements with different reach**. The public surface is
measured on the **artifact** (`dist/libs/components` — that is where what the consumer
really sees ends up, not what stands in the source) and knows no register at all; the rest
of the repository is measured on the files in the git index. Detection has three limbs,
because diacritics alone are not enough — a name spelled without them carries none:
diacritical marks, a **dictionary** (`/usr/share/dict/polish` folded of diacritics, minus
the English one, streamed against the words really found) read over identifiers split at
camelCase and at `_`, and the opening quote `U+201E`, a typographic convention with no
English use. The false positives of the second limb live in `tools/language.policy.json` as
**words** — 103 of them — and the format is what forbids the blind spot: an entry that is
not a bare lowercase word fires, so `SCREAMING_CASE` or "anything under four letters"
cannot be written down at all, and a whole layer of constants once survived two passes in
exactly that gap ([`lesson-60`](../lessons.md#lesson-60)). Point 1 is a denominator of its
own and it answers for the INSTRUMENT, not for the input: a constant probe has to come apart
into four known words, and three canaries have to hold: a Polish word confirmed (the list was
read at all), a word the dictionary carries **only** with diacritics confirmed (it was
folded), and a word both languages share **not** confirmed (the English list was subtracted)
([`lesson-48`](../lessons.md#lesson-48))
**Control:** `tools/check-language.fixtures/` — 27 doctored inputs, each rejected on its own
**rule**: a Polish comment in a file outside the register; a constant in `SCREAMING_CASE`
with no diacritics anywhere; diacritics the dictionary does not confirm; the opening quote;
a Polish `description` in the packed manifest firing on the public-surface point **despite**
an entry in the register; a source map whose `sourcesContent` carries what the rebuilt
source no longer does; an entry pointing at a file **already** translated, firing as dead;
an entry under `libs/`; a scan with an empty file list; a probe with its seams taken out;
each of the three canaries. Plus two runs against the real repository (a Polish comment in
`libs/components/button/src/button.ts`; a Polish constant in `SCREAMING_CASE`, with no
diacritic in it, in `tools/check-docs.mjs`) — the second being the shape that had passed
twice before. The samples themselves are quoted nowhere but in the gate's own tree, which
the policy names as `specimens`: this file is measured like every other
**Binds at:** bound. Both limbs run today: the repository one before the first push, which is
what turns "nothing is left" into a measurement rather than a declaration, and the artifact
one on `dist/libs/components` — clean on the run that closed this, so it costs nothing to
keep and would have to be paid for at the release otherwise.

> The register of exceptions plays the part here that `browsers.policy.json` plays for
> [`req-quality-browsers`](quality.md#req-quality-browsers): migration through a shrinking
> list rather than in one run. Without it the gate would have been red for all the weeks of
> translation — that is, switched off on day one. It arrived **empty** all the same, because
> the translation went first and the gate came to prove it, and the one survivor the plan had
> left to rule on turned out not to be a case at all: the `pl-PL` default of
> `libs/components/field/src/number.spec.ts` is a BCP-47 tag naming a formatting convention
> (that locale groups with `U+00A0`, which is what those tests are about), no limb flags it,
> and an entry for it would have been dead the day it was written.

> **What the gate found on its first run, in a repository three passes had already declared
> clean:** a Polish local for "target" in three gate scripts, a Polish "both" in a fixture's
> JSDoc, and a Polish "this is not an email" as the invalid address in an e2e test. None of
> them carries a diacritic; none is a function word; two of them are three letters long. That
> is the whole argument for the dictionary limb, and the reason the first point of this gate
> answers for the instrument before any of them answers for the repository.

> The rule used to apply **by halves and only as prose**: `docs/README.md` recorded a split
> of "working documentation in Polish, public surface in English". The split had no
> gate and was not kept — the package `description` was in Polish, and the
> public JSDoc cited internal documentation identifiers **31 times**, i.e. names of documents
> the consumer does not have. That is exactly the [`req-axis`](../00-axis.md) class: a
> promise without a gate is not a promise.

> The promise covers **identifiers** as well: the old prefixes were Polish abbreviations, and file and directory names (`requirements/`, `decisions/`, `tokens.md`)
> are cited in the same places as the content. That renaming is the exception to the "an ID
> never changes" rule — the only one, deliberate and closed.

---

### <a id="req-project-concise"></a>`req-project-concise` — Text in the repository carries weight

**Promise.** A comment, a JSDoc block and a paragraph of documentation answer the question
"why isn't this obvious?" — they carry a measurement, the price of the chosen road, or a trap
that has already cost something once. Whatever can be **pointed at with a link** is pointed
at, not summarised: the documentation stands publicly at a stable address, so a gate header
links the decision and the lesson instead of retelling them in its own words. Narration has
one home and it is [`lessons.md`](../lessons.md).

The budget covers **prose**, not code: `@example` and examples are outside it entirely,
because in a public API they are the most valuable text there is. The volume problem is in
`tools/` (~590 lines of gate headers alone), not in JSDoc.

**Decision:** [0017 — one home per fact: the criterion and its budget](../decisions/0017-one-home-per-fact.md)
**Gate:** none — gap: a prose volume budget per file, a snapshot with **two-sided**
tolerance, in the idiom of `libs/components/size.snapshot.md`. The values are settled in
[0017](../decisions/0017-one-home-per-fact.md) (gate header 12 lines + 1 per point, task
position 12 closed / 20 open), and the denominator is already counted by
`tools/measure-prose.mjs` — a measurement with no target, which this gate will grow out of.
The limit is written down rather than passed over: the machine measures **volume, not
weight** — growth becomes a line in the diff, while the judgment of whether a paragraph
carries anything stays with review
**Control:** none — gap: a file with a paragraph added beyond the tolerance has to fire; so
does a file shortened without rewriting the snapshot
**Binds at:** the close of the compression pass
— **not earlier**. A snapshot laid on today's 74-line headers would freeze them as the
accepted state, exactly like the token-name snapshot laid before normalisation
([`lesson-49`](../lessons.md#lesson-49))

---

### <a id="req-project-angular"></a>`req-project-angular` — The newest Angular mechanisms

**Promise.** Standalone components, signals, signal forms, OnPush (the default in v22+, never
set explicitly), zoneless, SSR. `zone.js` is **removed from the dependencies**, not merely
switched off.

**Gate:** `tools/check-zoneless.mjs` (target `check-zoneless`, in CI) — three points for one
promise, because `zone.js` comes back by three independent roads: a declaration in any
manifest in the repository (read from the git index, so a new project is covered from its
first commit), an installation in the `package-lock.json` tree — including one nested under
somebody else's package — and a runtime trace in the built package (`import 'zone.js'`,
`NgZone`, `__zone_symbol__`, a global `Zone`). Points 1 and 2 watch the input, point 3 the
output. Besides that, `apps/sandbox/src/app/app.config.ts` →
`provideZonelessChangeDetection()`; unit tests configure zoneless in `TestBed`
**Control:** `tools/check-zoneless.fixtures/` — doctored inputs, one per way for zones to
come back (root manifest, published package manifest, an installation in the lock, a nested
installation, `NgZone` in the bundle, `__zone_symbol__` in the bundle, a scan that cannot see
the package). Each must be rejected **by the point it declares**, and the reference input must
pass. Plus two runs against the real repository: `npm i -D zone.js` fires point 1, and
reverting that entry **in the manifest but not in the lock** fires point 2 — precisely the
variant that is invisible in code review
**Lessons:** [`lesson-7`](../lessons.md#lesson-7), [`lesson-8`](../lessons.md#lesson-8),
[`lesson-11`](../lessons.md#lesson-11)

---

### <a id="req-project-ssr"></a>`req-project-ssr` — Components work under SSR

**Promise.** Every component renders correctly on the server and hydrates without a
mismatch. No module state leaks between renders — counters, caches and registries go through
DI or are stateless.

**Gate:** `apps/sandbox-e2e/src/hydration.spec.ts` — the check sits in the `visit()` helper,
so it covers **every** view at once
**Control:** `hydration.spec.ts › "the gate really does detect a hydration error (a
control of the gate)"`
**Lessons:** [`lesson-30`](../lessons.md#lesson-30), [`lesson-31`](../lessons.md#lesson-31)

---

### <a id="req-project-layout"></a>`req-project-layout` — Directory layout

**Promise.** `apps/` — `docs`, `sandbox`, `sandbox-e2e`. `libs/` — `components`
(publishable), `tokens` (DTCG source + build).

**Gate:** none — gap: follows from [`req-project-apps`](#req-project-apps); it will close
together with it
**Control:** none — gap: the same as for the gate above
**Binds at:** the creation of `apps/docs`
**Lessons:** [`lesson-1`](../lessons.md#lesson-1), [`lesson-2`](../lessons.md#lesson-2)

---

### <a id="req-project-reach"></a>`req-project-reach` — Every tracked file has a reader

**Promise.** Something in the repository opens every file the repository carries — an import,
a path in a configuration, a pattern over a directory, a link in the documentation — or a tool
convention written down **with the reader named**. A file nobody reads is not harmless idle
weight: it compiles nothing, ships nothing and fires nothing, so no measurement ever
contradicts it, and the reader who finds it has to decide from the outside whether they are
looking at the source of truth or at its copy.

**Gate:** `tools/check-reach.mjs` (target `check-reach` in the root project, in CI) — five
points over the whole git index. The measurement is a **walk from the roots**, not the question
"does any other file mention this one": the second calls a copied tree alive, because a copy
brings its citations with it ([`lesson-61`](../lessons.md#lesson-61)). Reach is entered from
outside and follows five kinds of naming — a path from the repository root, a path relative to
the mentioning file, an import with the extension left off, a pattern **that names a directory**
(`libs/tokens/src/**/*.json`, never `**/*.md`, which names a kind of file) and a bare name
**while that name belongs to one file**. Two grants are not names at all, and neither can be
widened by hand: a gate reaches its own `check-<x>.fixtures/` tree, which it walks with
`readdirSync` and never names a case of — the pairing is derived from the two file names, so
the list cannot grow an entry no gate backs — and `tools/reach.policy.json` names the trees an
outside tool enumerates. The policy is held to the aliveness rule of every register here: a
root matching nothing fires, an entry whose reader has left fires, and an entry over a tree the
walk reaches anyway fires, measured by repeating the walk without it
**Control:** `tools/check-reach.fixtures/` — 17 prepared inputs, each rejected on its own
point: a file nothing points at; two files citing only each other; a name two files share; a
pattern naming a kind and not a file; a root written as a pattern, as a path in the name form,
in both forms at once, with a one-word reason, and pointing at a file that is gone; a register
entry that grants nothing, one whose reader is gone, one over an empty tree, one without a
reason; a fixtures tree whose gate is gone; an empty index; a corpus with nothing readable in
it; a policy with no roots. Plus a run against the real repository: the deleted copy of the
vendored guide put back as two files citing each other, which fired point 5 with both named
**Lessons:** [`lesson-61`](../lessons.md#lesson-61)

> The register may not be read as a place to put a tree that has become inconvenient. It holds
> two entries and both name a reader that is itself tracked: `.opencode` against `opencode.json`
> (proof the tool is configured here at all) and the Playwright baselines against the config
> whose `snapshotPathTemplate` builds their paths out of test titles. The price of the second is
> written into it rather than hidden: a baseline whose test was deleted stays, and this gate
> will not say so — that measurement belongs to
> [`req-quality-browsers`](quality.md#req-quality-browsers), which already reads the specs
> through `playwright test --list`.
