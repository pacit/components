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
consumer includes `@angular/cdk/overlay-prebuilt.css`), plus **`tslib`** — the one runtime
dependency, and nobody here typed it: ng-packagr writes it into the packed manifest when the
library declares none ([`lesson-64`](../lessons.md#lesson-64)). The list of record, with the
reason beside each name, is
[`libs/components/dependencies.policy.json`](../../libs/components/dependencies.policy.json).

**Gate:** point 7 of `libs/components/check-package.mjs`, over the **packed** manifest and
the packed code, with seven rules. The list of names is the smaller half: a name declared
with no entry in the policy fires (`not-allowed`), an entry outliving its dependency fires
too (`dead`), and an allowed name in the wrong field is a second copy in the consumer's tree
(`wrong-kind`). The half that catches a real reflex is the closure over the artefact —
`npm i` writes the name into the ROOT manifest and the import into a source file, so the
library's own manifest never learns of it: an import nobody declared fires (`undeclared`)
and a declaration nothing imports fires (`unused`, waived only by an `unimported` entry
carrying its reason). `unread-field` closes the road round the point — `optionalDependencies`
and its neighbours are lists npm installs from and this gate does not read. `compiler-drift`
is the one the neighbours leave: the peer range has to admit the Angular major stamped into
the artefact by partial compilation, which is what `check-consumer` names as its own blind
spot (it takes `@angular/*` from the workspace, so a package declaring `^21.0.0` and built
by 22 passes there), and `check-support` asks a different question of the same ranges — how
many majors the window holds. `@nx/dependency-checks` in the library's ESLint config is the
same closure over the SOURCES, and it stops at consistency: it would have `date-fns` added
to the manifest rather than argued for
**Control:** `tools/check-package.fixtures/` — nine prepared packages for point 7 alone, one
per rule, each rejected by the rule it declares and not merely by the point (the case naming
the wrong rule is reported, and that was measured). Plus three recorded runs on the real
artefact: `date-fns` added to `dependencies` fires `not-allowed`, an `import { debounceTime }
from 'rxjs'` in `fesm2022/pacit-components-button.mjs` fires `undeclared`, and
`@angular/core` moved to `^21.0.0` fires `compiler-drift`
**Binds at:** bound. It measures the artefact on every build, and the first dependency added
out of reflex is now the one that has to be argued for in the policy before CI is green
**Lessons:** [`lesson-64`](../lessons.md#lesson-64)

**Non-goals:** [`@angular/animations`](api.md#req-api-animations),
[`zone.js`](#req-project-angular) — see [00-axis.md](../00-axis.md#explicit-non-goals)

---

### <a id="req-project-apps"></a>`req-project-apps` — What lives in the workspace

**Promise.** The workspace holds: the component library, a documentation app (publishable as
the library's site), a "sandbox" app (playground and the base for e2e) and e2e tests built
on the sandbox.

**Gate:** `apps/docs/project.json`, `apps/docs-e2e/project.json` — the two projects in the
graph — and `.github/workflows/ci.yml`, whose `nx affected` line runs their `build`, `lint`,
`typecheck` and `e2e` the moment they are touched
**Control:** `apps/docs-e2e/src/shell.spec.ts › "renders the home page from the library,
with a clean console"` — an application that stops building, or ships a broken shell, fails
its own suite in three engines; the gate cannot go quiet by the app quietly rotting
**Decision:** [0060 — the site is static by construction](../decisions/0060-the-site-is-static-by-construction.md)

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

**Gate:** `tools/check-bundle.mjs` (target `check-bundle` in `components`, in CI) — thirteen
points. The probes bundle the **artifact** through `node_modules` and the `exports` map, the
same way a consumer does: point 6 watches which entrypoints an import of one of them pulls
in, point 8 which external dependencies come along (CDK Overlay is allowed in `./select`
only), point 9 the size per entrypoint against `libs/components/size.snapshot.md` — **to the
byte**, in both directions, because the measurement does not wobble and a band decides not
only when a run fails but when the record is written
([0023](../decisions/0023-a-tolerance-is-for-a-wobbling-measurement.md)). Point 4 watches that the primary entrypoint carries no component
at all — read over the probe's **text**, because primary re-exports `providePctConfig` from
`./core` and so pulls that entrypoint whatever it takes from it
([`lesson-81`](../lessons.md#lesson-81)); the same point holds every entrypoint **declared**
plain in the gate's `PLAIN` list — declared rather than computed, because a computed
exemption would cover every entrypoint the day the linker stopped attaching `ɵcmp` — to its
declaration: it exists, it exports no component, a `silent` one carries no marker in its text,
and a `quotes` one (`./testing`, whose harnesses carry every selector as data) is held by the
metafile alone. The rest is the denominator: two readings of the entrypoint list, presence of the
measured entrypoint in the probe, a second reading of isolation from the bundle text — a
marker read as the string literal it is in a linked bundle, so a state attribute or a longer
selector containing it is not it — a differential check, and a repeat of the measurement with the **real**
`@angular/build:application`. Point 13 holds the FILE rather than the measurement: the
snapshot is exactly what the renderer writes, prose included — the points above read it
through a map of its rows, so a paragraph rewritten in the renderer used to stay out of the
file until some byte happened to move with it
([`lesson-79`](../lessons.md#lesson-79)). Point 12 asks the question one floor **inside** an
entrypoint: eleven of them carry more than one component, and what a consumer importing ONE
tag pays is measured rather than assumed — a probe importing one class by name beside a probe
importing every class of that entrypoint, both recorded. The answer is not the "of course,
ESM" everybody gives: `./accordion` is 4162 B for one tag against 11333 for both and
`./field` 16059 against 24895, while `./select` reads 69904 against 69907 — three bytes, so a
consumer of one select tag carries the other whole. Six of the seven entrypoints that shed
nothing are parent/child pairs where the child injects the container, which is a reference
the bundler is right to keep; `./select` is a pair of SIBLINGS and is the finding. The point
itself holds the measurement — a named probe with no bytes measured nothing, and one class
cannot cost more than every class — while the numbers are held by point 13 with every other
row. The budget's number is what an **application** carries, not
what the tarball weighs: point 5 requires the probe to be built the way a consumer builds —
the Angular linker run over the package and `ngDevMode` folded — and the two together take a
component entrypoint to some 60% of its unlinked size
**Control:** `tools/check-bundle.fixtures/` — 32 doctored inputs, each rejected on its own
point; among them `entrypoint-pulls-neighbour/` (importing `./alpha` pulls in `./beta`),
`marker-inside-a-state-name/` (a probe's text holds a selector only inside a stranger's name,
and the read that takes the literal does not take it for the entrypoint),
`plain-entrypoint-with-a-component/`, `plain-entrypoint-undeclared/` and
`plain-declaration-naming-nobody/` (a plain declaration that is stale, missing or names
nobody), `quotes-entrypoint-pulls-neighbour/` (the entrypoint whose text is never read pulls a
component in, and the metafile read fires),
`new-external-dependency/` (an entrypoint reaches for the CDK overlay),
`probe-without-its-entrypoint/` (the measurement stopped pulling anything in),
`probe-not-linked/` (the probe measures the package's bytes rather than the consumer's),
`size-grew/` (one byte, the smallest thing the point can be asked to see),
`snapshot-not-the-render/` (every row right, and the prose still describing the band 0023
removed), `named-probe-empty/` and `named-probe-larger/` (the one-tag measurement produced no
bytes, and one class costing more than every class) and `pair-no-larger-than-single/` —
literally "an app importing two entrypoints must produce a noticeably bigger bundle". Plus runs against the real repository: the exact
comparison's first run was red on `./checkbox`, `./radio` and `./select`, 76 B each, a drift
of the single message line that the old ±5% band had recorded nowhere, and point 12's first run was green — the
paragraphs 0023 rewrote had reached the file on the back of the rows that moved with them;
point 12 was measured the same way — with its two rules disarmed both cases pass, and the
first reading it produced was WRONG, because it looked for the sibling's selector in the
text instead of weighing it ([`lesson-171`](../lessons.md#lesson-171))
**Decision:** [0023 — a tolerance is for a measurement that wobbles](../decisions/0023-a-tolerance-is-for-a-wobbling-measurement.md)
**Lessons:** [`lesson-51`](../lessons.md#lesson-51), [`lesson-73`](../lessons.md#lesson-73),
[`lesson-78`](../lessons.md#lesson-78), [`lesson-79`](../lessons.md#lesson-79)

---

### <a id="req-project-files"></a>`req-project-files` — A fixed component file structure

**Promise.** The shape of a component entrypoint is fixed: the eponymous source, template,
stylesheet and spec — `button.ts`, `button.html`, `button.scss`, `button.spec.ts` — beside the
entrypoint's `index.ts` and `ng-package.json`. Template and styles **always** in separate files.
A `button.types.ts` is **not** part of that fixed shape: it is what a component reaches for when
its types outgrow the source that owns them or when two sources of the entrypoint share them,
and where it exists it is named after the component and exported by the index. What is promised
of a type is not the file it stands in but the **index**: a type a source of an entrypoint
exports is exported by that entrypoint's `src/index.ts` too — or it stands, with a reason, in
the `internal` list of `libs/components/files.policy.json`.

The axis is the index because that is where the consumer is. Which file a type lives in is a
question for whoever opens the directory; whether the index names it decides whether anybody
outside can write the type down at all — an `input()` typed `PctBadgeTone` that `badge`'s index
passes over is an input nobody can declare a variable for, wrap, or hold a test to, while the
library compiles over it and ships it without a word. The filename half was also measured and
was never true here: of the 30 entrypoints that declare a component, 18 have no `*.types.ts` at
all and 13 export a public type from the component's own source, so a point demanding the file
would have been red on the day it was written — a plan, not a gate. And `select.types.ts` shows
the demand would have been for the wrong thing anyway: it exports `pctFilterByLabel` and
`pctKeepAll`, which are functions, so even where the convention is kept the name on the file
says nothing certain about what is inside it.

**Gate:** `tools/check-files.mjs` (target `check-files`, in CI) — ten points over the files of
`libs/components` as the **git index** carries them: 1 the denominator (entrypoints, sources,
declarations, exported types and the register, plus a second count of `@Component(` taken
differently from the parser's, so a decorator nobody parsed cannot pass for a component nobody
faulted), 2 an entrypoint's `ng-package.json` and `src/index.ts` — read in **both** directions,
so a directory of sources with no manifest beside it fires too, 3 the eponymous pair of a
component entrypoint (`button.ts` and `button.spec.ts`), 4 and 5 no `template:` and no `styles:`
in a decorator, 6 what a declaration names is a **sibling**, under the extension it promises, and
in the index, 7 the other direction — no template or sheet a rename left behind, 8 a `*.types.ts`
exported by the index of its entrypoint, 9 the register `libs/components/files.policy.json` in
both of its lists, where every excuse names what it excuses, carries a reason and is still
needed, 10 a type a source exports is named by its entrypoint's index — followed through the
index's own re-exports, and an edge that walk cannot read (a package specifier, `export * as ns
from`) is reported rather than passed over, because over a list of names known to be short
"this type is not exported" has nothing behind it. The run measures 35 entrypoints, 43
declarations, 81 templates and sheets and 82 exported types, and excuses seven things: two
components whose host **is** a native `<input>` and whose template is therefore the empty
string, and five types no public signature carries — the four view shapes of the select panel,
which type `protected` members of a base class the index does not export either, and
`PctArbitrary`, the property sweep's generator, which the `testing` entrypoint publishes none of
**Control:** `tools/check-files.fixtures/` — 27 prepared trees, each rejected on its own point
**and its own rule**, among them this requirement's named control
`template-in-the-decorator/` (a component keeping its template in the decorator — the defect
that arrives looking like Angular's own advice), `styles-in-the-decorator/` (styles no rule of
`check-styles` can see, because that gate reads sheets and not decorators),
`a-template-no-declaration-names/` (the file a rename left behind),
`stylesheet-that-is-plain-css/` (a sibling that exists and has left every SCSS rule),
`decorator-off-the-anchor/` (the parser misses a declaration and the counter says so),
`type-the-index-does-not-export/` (a public type with no line of the index to carry it),
`re-export-the-gate-cannot-follow/` (a star re-export that leaves an entrypoint's surface open,
so point 10 stops being able to rule on it), `register-internal-entry-nothing-uses/` (the type
went public and the excuse stayed), `register-entry-nothing-uses/` (the component was fixed and
the excuse stayed) and six cases of point 1 alone, each a different way for the gate to examine
nothing and report it green. Plus two runs against the real repository: with the register entry
for `PctText` removed, the gate names `libs/components/field/src/text.ts` and the line of its
decorator; with `export * from './accordion';` taken out of
`libs/components/accordion/src/index.ts`, it names `PctAccordionApi`, the line it is declared on
and the index that no longer carries it
**Decision:** [0001 — templates and styles in separate files](../decisions/0001-separate-files.md)

> This is a **deliberate departure** from Angular's official guidance to "prefer inline
> templates for smaller components" — dictated by consistency across a library of dozens of
> components.
>
> Decision 0001 lists `button.types.ts` among a component's files. What it **decides** —
> template and styles in files of their own — is untouched by the narrowing above; the file
> list beside it was written from expected scale, before anything had been measured, and the
> measurement is in the paragraphs above.

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
seven points, 27 rules, **two measurements with different reach**. The public surface is
measured on the **artifact** (`dist/libs/components` — that is where what the consumer
really sees ends up, not what stands in the source) and knows no register at all; the rest
of the repository is measured on the files in the git index — on the **regular** files of
it, because git records a mode per entry and only a regular file carries text of its own: a
symlink (`120000`) holds the target path as its blob, so reading one through the filesystem
gives the target's words a second time under a path nobody wrote them at, or `EISDIR` and a
run that never reaches its report. Detection has five limbs,
because diacritics alone are not enough — a name spelled without them carries none:
diacritical marks, a **dictionary** (`/usr/share/dict/polish` folded of diacritics, minus
the English one, streamed against the words really found) read over identifiers split at
camelCase and at `_`, the opening quote `U+201E`, a typographic convention with no
English use, and a **foreign stem carrying a Polish ending**, which is the one word standing
in NEITHER dictionary and therefore invisible to the three above
([`lesson-77`](../lessons.md#lesson-77)), and — the fifth limb — a **Polish stem carrying a
derivational suffix**, which is in neither list for the opposite reason: the word list holds
the noun it is made from and the abstract noun made from that one, and never got round to the
agent noun made from either ([`lesson-80`](../lessons.md#lesson-80)), and — the sixth limb — a
**one-letter Polish word read by its company**: `w`, `z`, `o`, `u` and `i` are in both
dictionaries, because `american-english` lists the whole alphabet, so every letter is
subtracted as English before anything looks at it ([`lesson-77`](../lessons.md#lesson-77)); the limb reads the
instead — the letter between two words in prose, a Markdown line, a comment or a string, and
never in code or in an inline code span — and reports how many such letters it read, which
is the denominator the item said nobody measured. Those two limbs name the
37 endings and the 26 suffixes they look for in the gate's own source, which is the inverse of
what the register may do and not an exception to it: an excused shape lets a whole class
through, a hunted shape lets a whole class be seen — and the rule holds wherever the shape is
written, so the fifth limb's false positives go into the policy as words rather than into the
detector as the one line that would have silenced all of them. The false positives of the
dictionary limbs live in
`tools/language.policy.json` as **words** — 120 of them — and the format is what forbids the
blind spot: an entry that is
not a bare lowercase word fires, so `SCREAMING_CASE` or "anything under four letters"
cannot be written down at all, and a whole layer of constants once survived two passes in
exactly that gap ([`lesson-60`](../lessons.md#lesson-60)). Point 1 is a denominator of its
own and it answers for the INSTRUMENT, not for the input: three constant probes have to be
read — one coming apart into four known words, one recognised as a borrowing, one as a
derivation — and four canaries have to hold: a Polish word confirmed (the list was
read at all), a word the dictionary carries **only** with diacritics confirmed (it was
folded), a word both languages share **not** confirmed (the English list was subtracted), and
an English word confirmed as a **stem** — the fourth limb's failure is silence, not noise
([`lesson-48`](../lessons.md#lesson-48))
**Control:** `tools/check-language.fixtures/` — 35 doctored inputs, each rejected on its own
**rule**: a Polish comment in a file outside the register; a one-letter preposition between an
English word and a quoted path, in a comment and in a template literal, with the limb's own
probe blinded as the third; a constant in `SCREAMING_CASE`
with no diacritics anywhere; diacritics the dictionary does not confirm; the opening quote;
an English stem with a Polish ending, which no dictionary can be asked about; a Polish stem
with a Polish suffix, which one can be asked about and answers with the two words either side
of the missing one; a Polish
`description` in the packed manifest firing on the public-surface point **despite**
an entry in the register; a source map whose `sourcesContent` carries what the rebuilt
source no longer does; an entry pointing at a file **already** translated, firing as dead;
an entry under `libs/`; a scan with an empty file list; a probe with its seams taken out, one
with its ending taken off and one with its suffix taken off; each of the four canaries. Plus
four runs against the real repository (a Polish comment in
`libs/components/button/src/button.ts`; a Polish constant in `SCREAMING_CASE`, with no
diacritic in it, in `tools/check-docs.mjs`; and `tools/check-texts.mjs` restored from
`a5b1a74~1`, the historical file rather than a made-up one, firing at line 478) — the second
being the shape that had passed twice before, the third the shape that had passed **every**
run of this gate while the gate stood. The fourth is the fifth limb's own first run: one true
hit — the name `tools/check-bundle.mjs` gave the function building an import specifier, green
through every pass before it — against five English agent nouns, and the entry written to
excuse those five was red on the file it stands in until it stopped quoting their stems. The samples themselves are quoted nowhere but in the gate's own tree, which
the policy names as `specimens`: this file is measured like every other. Plus the index
classifier proved on constants at every run, in both directions — a regular file and an
executable kept, a symlink and a gitlink stepped over — which is the one layer the fixtures
cannot reach, a case there being a list of files and never an index. Let every mode through
and the run dies on the first symlink to a directory; let none through and point 1 fires on
an empty denominator; a wrong set in the MIDDLE is the silent one, dropping real files and
reporting a smaller, cleaner repository than the one that exists
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
**Gate:** `tools/check-prose.mjs` (target `check-prose` in the root project, in CI) — six
points over two layers: the leading comment of every `tools/*.mjs`, and every task position in
`docs/plan.md`. Point 3 is [0017](../decisions/0017-one-home-per-fact.md)'s budget — 12 lines
plus one per numbered point for a header, 12 closed and 20 open for a position — and
`tools/prose.policy.json` is the whole of what stands past it with a reason, at an exact line
count, so an excuse cannot stretch with the text it excuses. Points 4 to 6 hold
[`docs/prose.snapshot.md`](../prose.snapshot.md): **lines and words**, both layers, in both
directions and with no band, the way the size record has held bytes since
[0023](../decisions/0023-a-tolerance-is-for-a-wobbling-measurement.md). Words are there
because a line is elastic — a header that meets its budget by running three sentences onto one
has moved nothing a reader can feel. Points 1 and 2 are what make the rest a measurement
rather than an agreement with itself, and they are the lesson of the instrument this gate grew
out of, which reported for weeks on a layer it never read: a `check-*` script with no header
or no numbered point, a mark no budget belongs to, a layer that went empty, a script git
carries and the walk skipped, and the plan's own checkboxes counted a second time against what
the parser found. The limit is written down rather than passed over: the machine measures
**volume, not weight** — growth becomes a line in the diff, while the judgment of whether a
paragraph carries anything stays with review
**Control:** `tools/check-prose.fixtures/` — twenty-five prepared inputs, each rejected on its
own point, built on the live repository rather than on a stored copy. Both halves of what this
field asked for are there: `a-header-past-its-budget` for a paragraph that arrived, and
`a-header-that-shrank` for a file shortened without rewriting the record. Beside them
`words-without-lines` for the elastic line, `no-script-at-all` and `no-position-at-all` for a
denominator that empties quietly, and `a-position-the-parser-lost` for the defect that
actually happened — a numbering that moved under the instrument measuring it

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

**Gate:** `apps/docs/project.json`, `apps/sandbox/project.json`,
`apps/sandbox-e2e/project.json`, `apps/docs-e2e/project.json`,
`libs/components/project.json`, `libs/tokens/project.json` — the six roots of the promised
layout; a missing one is an existence failure here and a graph error in every nx command
**Control:** none — deliberately: the violation is immediate and total — a project root
that vanishes breaks the graph before any gate could speak more politely about it
**Decision:** [0060 — the site is static by construction](../decisions/0060-the-site-is-static-by-construction.md)
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
**Decision:** [0040 — a lockfile is repository material, the tree it locks is not](../decisions/0040-a-lockfile-is-material-the-tree-it-locks-is-not.md)
**Lessons:** [`lesson-61`](../lessons.md#lesson-61),, [`lesson-142`](../lessons.md#lesson-142)
[`lesson-113`](../lessons.md#lesson-113)

> **A mention is an edge, and the report of a defect is a mention.** The gate reported 45
> unreached files, the finding describing them went into the plan naming that directory with
> a wildcard after it, and the next run was clean with nothing fixed — a legal pattern by the
> rule above, written in the one paragraph that says nobody reads those files
> ([`lesson-113`](../lessons.md#lesson-113)). What the walk cannot do is tell a reader from a
> witness. The rule that catches it is not in the gate: a gate that turns green on a commit
> that only wrote prose has not been fixed.

> The register may not be read as a place to put a tree that has become inconvenient. It holds
> two entries and both name a reader that is itself tracked: `.opencode` against `opencode.json`
> (proof the tool is configured here at all) and the Playwright baselines against the config
> whose `snapshotPathTemplate` builds their paths out of test titles. The price of the second is
> written into it rather than hidden: a baseline whose test was deleted stays, and this gate
> will not say so — that measurement belongs to
> [`req-quality-browsers`](quality.md#req-quality-browsers), which already reads the specs
> through `playwright test --list`.
