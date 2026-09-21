# Requirements — quality and gates

This area is **the implementation of [`req-axis`](../00-axis.md)**: it describes the machines
that can fire. It merges the former test and sandbox sections plus four requirements that
used to be scattered across the project and accessibility areas.

The sandbox sits here rather than in a section of its own, deliberately:
[`lesson-33`](../lessons.md#lesson-33) showed that the "every component × every state"
matrix is not decoration but **the input for the a11y gate**. The audit only examines what
somebody rendered first — a gap in what is shown is a gap in coverage, invisible in the
report because the report is green.

> The shape of an entry and the meaning of the **Gate** / **Control** fields are described
> in the [README](../README.md#requirement-shape).

---

## Meta — gates for gates

### <a id="req-quality-negative-control"></a>`req-quality-negative-control` — Every gate has a negative control

**Promise.** A new gate is not ready when it passes — it is ready when it has been **shown
to fail**. Every gate has a test or a documented run proving that it fires after a deliberate
regression. A gate that always passes is more dangerous than no gate.

**Gate:** `tools/check-docs.mjs` — the **Control** field is required on every requirement,
exactly like the **Gate** field
**Control:** `tools/check-docs.fixtures/` — a requirement with a gate but no control must be
rejected
**Lessons:** [`lesson-38`](../lessons.md#lesson-38), [`lesson-39`](../lessons.md#lesson-39),
[`lesson-41`](../lessons.md#lesson-41)

> The two runs this rule came from are worth keeping close:
> [`lesson-38`](../lessons.md#lesson-38) — the idiomatic way of writing the emulation
> **silently did nothing**, and the test passed on default values; only the negative control
> found it, not the test itself. [`lesson-39`](../lessons.md#lesson-39) — a visual test could
> be born dead in two independent ways, both looking like a working test.

---

### <a id="req-quality-inheritance"></a>`req-quality-inheritance` — A gate that reads a class reads the whole of it

**Promise.** A component's surface can come from a base class: Angular merges a decorated
base's inputs, outputs, host attributes, host bindings, queries and features into the
definition of every class that extends it, and leaves the template, the styles and the
change-detection flag to the subclass's own decorator (`ɵɵInheritDefinitionFeature` in
`@angular/core`). A gate that reads one class body therefore reads half a component, and the
half it reads is green whatever the other half says
([`lesson-100`](../lessons.md#lesson-100)). So every gate that reads a decorator or a class
body is listed here, with what it reads and why the read is whole — it follows `extends` and
merges what a base declares, or what it reads is one of the things a base cannot pass on, or
it reads the built package, where the merge has already happened. A gate that reads a class
and is not on this list is the gap this requirement exists to name.

**Gate:** the list, one entry per gate that reads a class:
`tools/check-aria.mjs` (target `check-aria`) — inputs and `host` blocks, merged down
`extends`, and a base the scan cannot see is a denominator fault;
`tools/check-texts.mjs` (target `check-texts`) — `host` attributes and the literals in their
bindings, merged the same way, and point 4 reads signal factories per FILE rather than per
class, so a base's default is read where it stands;
`tools/check-parts.mjs` (target `check-parts`) — `host` parts, merged the same way, and
the template through `templateUrl`, which a base cannot pass on;
`tools/check-zoneless.mjs` (target `check-zoneless`) — `changeDetection` and `standalone` from
every `@Component` decorator, an abstract base's included, and `onPush` from the package,
where nothing is inherited;
`tools/check-styles.mjs` (target `check-styles`) — `styleUrl` per `@Component`; styles are the
subclass's own, so each decorator is the whole truth;
`tools/check-icons.mjs` (target `check-icons`) — templates and `icon.ts`; a template is not
inherited;
`tools/check-harness.mjs` (target `check-harness`) — the harness declarations the compiler
emits (`declare class X extends PctHarness<…>`), where the one `extends` is the harness base
and the part list is the declaration's own
**Control:** `tools/check-aria.fixtures/base-not-read/`,
`tools/check-texts.fixtures/base-without-declaration/` and
`tools/check-texts.fixtures/speaking-attribute-on-a-base-host/` — the merge proved by a
speaking attribute, the one kind the reference input cannot carry without being a violation
itself; `tools/check-parts.fixtures/base-not-read/`, with the reference's `PctMarkerBase`
whose part the package puts on `PctMarker` and the source read has to put there too. The
four gates that read what a base cannot pass on have no fixture, deliberately: the thing that
would be inherited is not, by the feature named above, and a fixture of it would measure
Angular rather than the gate
**Lessons:** [`lesson-100`](../lessons.md#lesson-100)

---

### <a id="req-quality-registry"></a>`req-quality-registry` — The promise → gate → control registry

**Promise.** Every requirement points **machine-readably** at what enforces it and at what
proves that gate can fail. A requirement's state is **derived** from the contents of the
registry, never typed in by hand. A deliberate absence of a gate is allowed — it has to be
written down **together with the reason**.

**Gate:** `tools/check-docs.mjs` (target `check-docs`, in CI) — the six checks described in
the [README](../README.md#the-docs-gate)
**Control:** `tools/check-docs.fixtures/` — a set of deliberately broken requirements (with
no gate, with a gate pointing at a file that does not exist, with a target outside CI, with
no control), **every one** of which must be rejected
**Lessons:** [`lesson-36`](../lessons.md#lesson-36), [`lesson-39`](../lessons.md#lesson-39)

> **Why this has to be code and not discipline.** Drift between the documentation and reality
> has already happened and has already been patched by hand once: the "How to read this
> document" heading existed precisely because the requirements could be read as a description
> of the state of the code, and the answer was **18 annotations added by hand**. That is the
> same pattern as the manual `node libs/tokens/build.mjs` in CI before
> [`lesson-36`](../lessons.md#lesson-36): a workaround that **masks the missing structure
> instead of exposing it**.
>
> The side effect is really the main benefit: **adding a requirement without a gate stops
> being possible quietly.** The axis starts enforcing itself.
>
> This requirement is also **its own first test case**: until the registry exists,
> [`req-axis`](../00-axis.md) is a promise without a gate — exactly what it forbids.

---

### <a id="req-quality-index"></a>`req-quality-index` — A list that describes a directory is derived from it

**Promise.** Where the repository keeps a list of what a directory holds — the index of
decisions, a negative control's table of cases, the map on the first page of the
documentation — that list is **generated from the directory or measured against it**, and a
number written in prose is measured against what it counts. A hand-kept list drifts in
silence: nothing compiles it, nothing renders it, and a reader cannot tell a row that is
missing from a case that does not exist.

**Decision:** [0021 — an index is generated where every column is derivable, measured where one is not](../decisions/0021-an-index-is-derived-or-measured.md)
**Gate:** `tools/check-index.mjs` (target `check-index` in the root project, in CI) — five
points. The decisions index is **generated** (`--write`), because its three columns all have
a home in the decision file; a fixtures table is **measured**, because its `defect` column is
a sentence a human writes. A tree claims to list its cases with the heading `## The cases`,
and nowhere else: completeness cannot tell a deliberate selection
(`check-reach.fixtures/README.md` tabulates three of seventeen) from a list that has lost two
rows, so the claim is written down. **The limit is deliberate**: the gate measures the lists
that exist and does not require a list to exist — five fixture trees carry no README, and
deleting a table to silence the gate is a removal visible in the diff, which drift never was.
Outside `docs/` the same promise is held by the gate that RENDERS the list, because only it
can: `check-tokens` point 5, `check-parts` point 5 and `check-bundle` point 12 compare their
snapshot against the rendering whole, `check-mutation`'s `score/stale-prose` everything in it
that is not a wobbling number ([`lesson-79`](../lessons.md#lesson-79)). A central gate would
have to repeat both measurements — a build and a mutation run — to know what those files
should say
**Control:** `tools/check-index.fixtures/` — 23 prepared inputs, each rejected on its own
point: an empty walk over the decisions, a deleted index section, no fixtures tree, no
declared table, no map; a decision missing from the index, a row outliving its file, a
paraphrased title, a short `implements` list, a decision with no heading; a case outside the
table, a row for a case that is gone, a case named twice, a claiming heading with no table;
a `point`, `check` or `rule` column disagreeing with the case, and one naming a rule the case
does not declare; a point count out of date, missing, and written as a word the gate refuses
to guess at; a map count out of date, and a map count nobody counts. Plus the run that opened
the gate: on the real repository it named `tarball-without-licence`, absent from
`check-consumer.fixtures/README.md`, before anybody had looked
**Lessons:** [`lesson-75`](../lessons.md#lesson-75), [`lesson-79`](../lessons.md#lesson-79)

> **Why this is a promise of its own and not part of the registry.**
> [`req-quality-registry`](#req-quality-registry) generates one list out of one directory and
> has done since it was written; what it never said is that this is the rule rather than that
> file's arrangement. The eleven wrong rows of the decisions index were written by people who
> had the registry in front of them.

---

### <a id="req-quality-typecheck"></a>`req-quality-typecheck` — Every project has a `typecheck` target

**Promise.** There is no TypeScript in the workspace that the compiler does not see. **Lint
is not a substitute for typecheck**: ESLint parses and checks rules, but it reports neither
type errors nor module configuration inconsistencies.

**Gate:** `tools/check-typecheck.mjs` (target `check-typecheck`, in CI) — four checks:
(1) every TypeScript file in the git index belongs to some project, (2) every project with
TypeScript files has a `typecheck` target, (3) that target's command can be measured and is
not disarmed (a shell operator, `--noCheck`, a missing `-p`), (4) every file of a project
enters its compiler program
**Control:** `tools/check-typecheck.fixtures/` — eleven doctored inputs, each rejected on its
own point; plus runs against the repository: `sandbox` reverted to the target inferred by
`@nx/vite` fires point 4 on four files, a new library entrypoint outside `include` fires
point 4 as well, a new project with no target fires point 2, `|| true` appended to the
command fires point 3
**Lessons:** [`lesson-42`](../lessons.md#lesson-42), [`lesson-47`](../lessons.md#lesson-47)

> **Point 4 is what this gate was built for.** Requiring the target to exist measures
> a declaration, and `lesson-42` says outright that a tsconfig can lie about its reach.
> `sandbox` had a `typecheck` target **inferred** by `@nx/vite/plugin` and passed green while
> checking `tsconfig.app.json` only — and that one excludes `**/*.spec.ts`. So the gate does
> not read `include`; it runs the **command from the target** extended with `--listFilesOnly`
> and compares the result with the git index.

---

## Tests

### <a id="req-quality-unit"></a>`req-quality-unit` — Unit tests on Vitest

**Promise.** The library's and the app's unit tests run on Vitest, zoneless, and they **catch
something**: **every source file of the library** has a measured mutation score with an
enforced floor, and whatever is not measured stands in a register with the reason it cannot
be.

**Gate:** in three parts, because "the tests run", "how many pass" and "how many defects they
notice" break separately. `.github/workflows/ci.yml` — `test` and `vite:test` in the
`nx affected -t` list (the run). `libs/components/project.json` — the `mutation` target runs
Stryker with `thresholds.break` = 80, i.e. **fails below the floor**.
`tools/check-mutation.mjs` (target `check-mutation`, `dependsOn: mutation`, in CI) guards the
denominator: eight points and 53 rules for the measurement being current, covering the
declared file inventory **and every source file of the library** — the candidate set is read
off the git index and not off `mutate`, so a file nobody decided about is a violation
(`inventory/source-unaccounted`) and not a silence — running **the same specs as the `test`
target**, having a binding
and unnarrowed threshold (ignorers, excluded mutators, `ignoreStatic`, `// Stryker disable`
comments, a shortened `timeoutMS`), and fitting inside the `libs/components/mutation.snapshot.md`
snapshot with a **two-sided** per-file tolerance. A row of that snapshot also has to **add
up** (`score/columns-adrift`): it states a score and the counts behind it, so
`killed / (killed + surviving + errored + not covered)` has to give the score printed beside
them — which is why the errored mutants have a column of their own. Before they did,
nine rows carried a score their columns could not produce, and a reader checking the
arithmetic found a mistake that was not one. The snapshot's PROSE is held exactly
(`score/stale-prose`): the tolerance is the width of a wobbling number, not of the paragraph
that says what the number means, nor of the tolerance quoted in it
([`lesson-79`](../lessons.md#lesson-79)). Stryker mutates `.ts` and nothing else, so
what a **template** promises stands outside this measurement altogether — that half is held by
`check-coverage` point 6, a floor per template on all four metrics
([`lesson-71`](../lessons.md#lesson-71)). Point 7 is the fourth register and the only one
about a MUTANT rather than a file: a survivor no test can tell from the original is named in
`equivalent` in `libs/components/mutation.policy.json` by its operator, its span and its
replacement, and the gate holds the entry to being resolvable, still alive and reasoned — so
an excuse dies with the line it excuses rather than drifting onto the next mutant to take
that place. It excuses no score: a registered mutant is still counted as surviving
**Control:** `tools/check-mutation.fixtures/` — 57 doctored inputs on a fake library, each
rejected on its own **rule**; plus runs against the real repository (removing an assertion
from `select.spec.ts` drops that file's score and fires `score/score-dropped`, adding a test
beyond the tolerance fires `score/snapshot-adrift`, `thresholds.break: null` fires
`threshold/threshold-unset`, a file struck from `mutate` fires `inventory/patterns-changed`).
`inventory/source-unaccounted` was run against the real repository before the widening and
named exactly the 17 sources that stood outside the measurement — `slider.ts`, `field.ts`,
`date.ts` and fourteen more — while `affix.ts`, put into `mutate` by hand, brought the initial
test run down rather than the score ([`lesson-123`](../lessons.md#lesson-123)).
Plus a control of that control: disarming each of the 42 rules in turn — 30 give "PASSED",
12 move the case onto a neighbouring rule (measured before `columns-adrift`, the 43rd, was
added; of its two cases the disarm gives "PASSED" on one and moves the other onto
`incomplete-snapshot`, since a row nobody can read is a file with no row)
**Lessons:** [`lesson-3`](../lessons.md#lesson-3), [`lesson-19`](../lessons.md#lesson-19),
[`lesson-28`](../lessons.md#lesson-28), [`lesson-57`](../lessons.md#lesson-57),
[`lesson-58`](../lessons.md#lesson-58), [`lesson-71`](../lessons.md#lesson-71),
[`lesson-79`](../lessons.md#lesson-79), [`lesson-123`](../lessons.md#lesson-123)

> **Coverage and mutation score measure two different things, and the difference is large.**
> At 96.62% line coverage the core scored **63.54%** on mutation: every third mutant passed
> CI green. Coverage says how many lines were EXECUTED — and a line executed without a single
> assertion counts there the same as a checked one. Closing that difference to 81.77% took 38
> new tests and a new `core/src/core.spec.ts` spec: the functions in
> `@pacit/components/core` were public API without a single test under their own name
> ([`lesson-57`](../lessons.md#lesson-57)).

> Why Stryker alone is not enough as a gate. Its `thresholds.break` is **`null` by default** —
> the run exits zero at a score of 4% exactly as it does at 94%, which makes it a report to
> look at. And once a threshold is in place, it is raised by five moves, none of which adds a
> single test: a file struck from `mutate`, widened `ignorers`, an excluded mutator family,
> `ignoreStatic: true` and a shortened `timeoutMS` (a mutant killed by the CLOCK counts
> towards the score like one killed by an assertion). So `check-mutation` reads the
> **effective configuration from the run report**, not from the file — a flag in the target's
> command leaves no trace in it.

---

### <a id="req-quality-coverage"></a>`req-quality-coverage` — Coverage ≥ 80% of lines

**Promise.** The library's code is covered by tests as fully as possible; the SonarQube
minimum, i.e. ≥ 80% line coverage and the same floor on branches. A template is code as much
as a class is — and it is held **higher**: each of them at 100%, on all four metrics, or with
an exception that says why.

**Gate:** in three parts, because the percentage, its denominator and the templates break
separately. `libs/components/project.json` — the `test` target collects coverage (`coverage`,
`coverageInclude`) and **fails** below `coverageThresholds.lines` = 80 and
`coverageThresholds.branches` = 80. `tools/check-coverage.mjs` (target `check-coverage`, in
CI) guards the rest in six points: **every source file of the library, its templates included,
must be in the report**; both thresholds must be declared and no lower than 80, because vitest
enforces the keys it is handed and infers none from the other; and **every template must meet
a floor of its own — 100% of lines, statements, branches and functions** (point 6), since in
the whole-report figure a template is a rounding error and each of the four metrics turned out
to be the only witness of one defect ([`lesson-71`](../lessons.md#lesson-71)). The per-file
floor cannot live in the target: the executor's `coverageThresholds` is four numbers and a
`perFile` flag, `additionalProperties: false`. On top of that,
`libs/components/src/public-api.spec.ts` brings the modules of every package gate into the run
— without it a file with no test does not show up as zero, it **drops out of the statistic**
([`lesson-45`](../lessons.md#lesson-45))
**Control:** `tools/check-coverage.fixtures/` — twelve doctored inputs, one per way of
disarming the gate (no report, an empty source list, a source file outside the report, a
TEMPLATE outside the report, measurement switched off, a threshold removed, the branch
threshold alone removed, a threshold lowered, lines below the threshold, branches below the
threshold, a template below its floor, an exception that no longer covers anything). Each must
be rejected **by the point it declares**, and the reference input must pass — it carries an
exempted template, which is the only place where the gate staying SILENT is measured. Plus
three runs against the real repository: removing `libs/components/src/public-api.spec.ts`
leaves the `test` target **green** (96.55%) while `check-coverage` fires on
`libs/components/src/index.ts`; removing `select.spec.ts` and `number.spec.ts` drops coverage
to 64.96% and fires both thresholds at once; taking the three template tests back out leaves
the `test` target green as well (235 passed, both thresholds met) while point 6 names three
metrics across two files
**Lessons:** [`lesson-5`](../lessons.md#lesson-5), [`lesson-45`](../lessons.md#lesson-45),
[`lesson-71`](../lessons.md#lesson-71)

> Why two gates for one number. The threshold alone guards **the numerator over the
> denominator**, and v8 computes both only over the modules that entered the run. Removing
> `number.spec.ts` once **raised** coverage from 96.55% to 96.94%, because an entirely
> untested file disappeared from the report along with its test. Point 3 of the gate
> therefore guards something the percentage cannot see: that the denominator covers the whole
> library.

> The threshold is **a floor, not a ratchet**. At 96.58%, removing one spec does not take it
> below 80 (`select.spec.ts` → 81.55%, `number.spec.ts` → 80.00%), and that is in line with
> the promise: 80% is a minimum, not "never less than yesterday". A ratchet would be
> a different promise and would have to arrive with a gate of its own.

---

### <a id="req-quality-e2e"></a>`req-quality-e2e` — e2e tests on Playwright, visual ones included

**Promise.** e2e tests on Playwright, including **visual tests** (screenshot diff). What gets
compared are **sandbox cards** (`toHaveScreenshot` on an element), not whole pages — so
a change in the shell does not invalidate every component's references at once. Seven
pictures are of the whole viewport, each for a reason its case states (the dialog's veil,
the surface a popover and a menu are drawn on, the window's edges a toast stack and a drawer
land against), and for those the stage **blanks the sandbox's navigation** — `visibility:
hidden`, the column kept — so a row added to that list, which is what every new view is,
moves no pixel of them (`opacity`, not `visibility`, because the layer has to stay —
[`lesson-165`](../lessons.md#lesson-165)). The references live in
`apps/sandbox-e2e/src/__screenshots__/{platform}/` and **are in the repository**.

**Gate:** `apps/sandbox-e2e/src/visual.spec.ts` and the remaining e2e specs; and over those
specs themselves `tools/check-e2e.mjs` (target `check-e2e`, in CI) — four points over both
suites, the first two the denominator (a corpus to read, and a scanner that read all of it
rather than losing the thread in the middle of a file) and the last two the rules: a
positional locator (`.last()`, `.first()`, `.nth(n)`) read in the window an action opened
with no auto-retrying assertion between, and a bare `waitForTimeout` whose next statement
takes the baseline a later assertion is measured against. How many races are LEFT is a
separate measurement and a separate machine: `tools/check-flake.mjs` (target `check-flake`, in
the nightly's repetition job) — five points over a run of both suites `--repeat-each` times
with retries OFF, which writes the cases that did not agree with themselves into
`docs/flake.snapshot.md`. That record is **not taken yet** and the gate says so rather than
starting empty: the first reading belongs to the first nightly that runs the job, because the
failure mode being measured IS contention and a reading off this desktop would be a fact about
this desktop ([`lesson-200`](../lessons.md#lesson-200)). It is read ONE way: a name that
appears and is not in the record turns the run red, a recorded name that behaved is not
removed, because repetitions of a suite are a sample and absence is not proof
**Control:** there are **two** thresholds and both come from measurement. The pixel count is
absolute (`maxDiffPixels: 20`): a repeated run of the same code gives **0** differing pixels,
while changing `border-radius` from 8 px to 1 px gives **74**; the first version, with
a fractional threshold (`maxDiffPixelRatio: 0.01`), **let that regression through**
([`lesson-39`](../lessons.md#lesson-39)). Colour similarity is a separate threshold
(`threshold: 0.005`), because the default `0.2` decides which pixels **reach** that budget at
all: one step of the ramp `blue-500` → `blue-400` is 0.0163 in pixelmatch's metric, so
repainting the entire button produced **zero** differing pixels
([`lesson-53`](../lessons.md#lesson-53)). The stage's blanking has a control of its own —
`visual.spec.ts › "a row added to the navigation moves no pixel of a viewport picture (a
control of the stage)"`: a row put at the top of the list moves nothing with the navigation
blanked and moves pixels with it shown, so the first half is a comparison that can fail. Its
first version appended the row at the bottom of a list that reaches past the frame, and the
shown half caught it moving nothing ([`lesson-50`](../lessons.md#lesson-50)). The race gate
has a control of its own: `tools/check-e2e.fixtures/` — eight prepared corpora, three for the
denominator, two for the scanner and three for the rules, each rejected **by the point and
the rule it declares**, and a reference corpus that must pass. That reference carries the two
real bugs in their FIXED shape, so a rule grown until it fires on the accepted cure is caught
by the reference refusing to pass rather than out in a spec somebody then rewrites to please
a gate. The flake gate has a tree of its own — `tools/check-flake.fixtures/`, seventeen
prepared inputs and a reference that must pass — and it is the one control here built on a
STORED input rather than on the repository, because what the gate reads is produced by an
hour-long job on a machine that is not this one. The shape of that stored report was measured
against Playwright's own reporter rather than read out of its documentation: under
`--repeat-each` every repetition is a separate spec entry under the same title, with no repeat
index recorded anywhere
**Lessons:** [`lesson-13`](../lessons.md#lesson-13), [`lesson-23`](../lessons.md#lesson-23),
[`lesson-30`](../lessons.md#lesson-30), [`lesson-39`](../lessons.md#lesson-39),
[`lesson-50`](../lessons.md#lesson-50), [`lesson-165`](../lessons.md#lesson-165),
[`lesson-192`](../lessons.md#lesson-192)

> Two things decide whether such a test measures the code or the machine. **The typeface** is
> pinned for the duration of the screenshot (`Liberation Sans`), because `system-ui` resolves
> differently on every system. **The threshold is absolute**, not fractional — a fraction
> grows more forgiving the bigger the card.
>
> Geometry tests check what somebody thought to ask about; a screenshot also catches what
> nobody asked about, because it compares the whole image.
>
> **The third thing is the race**, and it was the one nobody was watching. Two full runs of
> the suite came back 1 red of 2062 and a different test each time, both defects of the test
> rather than of the product, and aimed at with `--repeat-each=30` they answered 3 of 30 and
> 2 of 30 ([`lesson-192`](../lessons.md#lesson-192)). The family is not "timing": each had a
> number or an index standing where a condition belonged — a measured wait taken for the
> moment an animation's clock has stopped, and a `.last()` read in the instant after the
> click that fills it. A 7-to-10 % case is a coin-flip across a suite this size, and a green
> full run says nothing about whether it is there; so the gate is over the SHAPE, which costs
> a second and does not have to be believed twice.

---

### <a id="req-quality-hydration"></a>`req-quality-hydration` — A hydration gate in e2e

**Promise.** A mismatch between the server and client trees fires the gate. The check sits in
the `visit()` helper that **every** e2e test goes through — so it covers all views at once
instead of waiting to be added to one spec after another.

**Gate:** `apps/sandbox-e2e/src/hydration.spec.ts` + the `visit()` helper in
`apps/sandbox-e2e/src/support/`
**Control:** `hydration.spec.ts › "the gate really does detect a hydration error (a
control of the gate)"`
**Lessons:** [`lesson-30`](../lessons.md#lesson-30), [`lesson-31`](../lessons.md#lesson-31)

> A hydration mismatch **does not knock the page over**: Angular logs `NG05xx` and quietly
> rebuilds the subtree from scratch. The app looks right and pays with a double render and
> lost DOM state — a textbook [`req-axis`](../00-axis.md) case.

---

### <a id="req-quality-package"></a>`req-quality-package` — A gate that examines the packed artifact

**Promise.** **A green build is not proof that the artifact can be used.** A separate gate
examines `dist/libs/components` — not the sources: presence and reachability of the skin,
**token closure** (every `var(--pct-*)` used in the package has a declaration in it),
agreement between `PCT_VERSION` and the manifest, reachability of the `ng add` / `ng update`
collections, and the metadata npm requires.

**Gate:** `libs/components/check-package.mjs` (target `check-package`, in CI)
**Control:** `tools/check-package.fixtures/` — seven doctored packages, one per point of the
gate (point 4 has two: a wrong value and a vanished constant). Each must be rejected **by the
point it declares**, and the reference package must pass. The run from
[`lesson-36`](../lessons.md#lesson-36) (deleting `libs/tokens/dist` → the build **passes**
while the package carries not one token definition) was manual; this is its machine form
**Lessons:** [`lesson-36`](../lessons.md#lesson-36), [`lesson-41`](../lessons.md#lesson-41)

> The gate checks **closure**, not the presence of a file — presence would also be satisfied
> by an empty file, or by a skin somebody stripped the component layer out of.

> It does examine the **`dist` directory**, though, and that limit is recorded rather than
> overlooked: between it and the consumer's `node_modules` stand `npm pack` and the registry,
> and "the file is there" does not mean "the file can be loaded". The other side is measured
> by [`req-quality-consumer`](#req-quality-consumer)
> ([`lesson-55`](../lessons.md#lesson-55)).

> The control checks not only **that** a doctored package fired, but **which** point rejected
> it. Without that, a fixture blowing up for an incidental reason — a broken manifest, a typo
> in a path — would count as proof that the point under test works. That would be the same
> silent defect one floor up.

---

### <a id="req-quality-consumer"></a>`req-quality-consumer` — A consumer test on a local registry

**Promise.** The logical next step after
[`req-quality-package`](#req-quality-package) is checking the artifact **in use**:
`npm pack` → publish to a local registry → install **by name** into a fresh app → `ng add` →
build with SSR → one e2e.

Between `dist` and the consumer's `node_modules` stand two filters a static gate cannot see
by design: `npm pack` (the `files` field, `.npmignore`) and the registry. And **"the file
exists" does not mean "the file works"**.

**Gate:** `tools/check-consumer.mjs` (target `check-consumer`, in CI) — seven points: the
archive contents against the `exports` map and the schematic collections; the publish, and
whether the registry serves **the same checksum** from the **local** address rather than from
the npmjs uplink; installation by name and module resolution into the app's own
`node_modules`; `ng add` run from the **installed** package by a real Angular CLI; a build
with SSR together with a trace of the library in the bundle and token declarations in the
stylesheet; rendering **on the server** (`ng-server-context="ssr"`, not a prerender); one run
in a browser measuring that the button's background is the value of `--pct-button-bg`, with
zero errors in the console
**Control:** `tools/check-consumer.fixtures/` — 28 doctored inputs, each rejected on its own
**rule**; plus seven runs against the real repository (an empty skin in the package → the
consumer's build with not one token declaration; the skin removed from the package; a `files`
field cutting off the schematics; the CommonJS boundary removed; `exports` pointing at
a non-existent file; `document` touched while constructing a component; a button painted with
a hand-written colour) — each on a different rule
**Lessons:** [`lesson-36`](../lessons.md#lesson-36), [`lesson-55`](../lessons.md#lesson-55)

> The gate does **not** install `peerDependencies` from the registry — the app takes
> `@angular/*` from the repository's `node_modules`, the same way the builder probe in
> [`req-project-tree-shaking`](project.md#req-project-tree-shaking) does. A drift in the
> `peerDependencies` version range passes this gate; the one that watches it is
> [`req-project-dependencies`](project.md#req-project-dependencies).

---

### <a id="req-quality-browsers"></a>`req-quality-browsers` — The browser matrix

**Promise.** Functional tests run on chromium, **webkit and firefox**. Visual screenshots
stay on one platform (linux/chromium) — rasterisation would scatter them anyway.

**Gate:** `apps/sandbox-e2e/playwright.config.mts` — three projects (chromium, firefox,
webkit), 2086 tests per run; plus `tools/check-browsers.mjs` (target `check-browsers` in the
root project, in CI) — six points, 28 rules. The e2e run is blind to its own matrix:
Playwright exits zero after three projects exactly as it does after one, and exactly as it
does after **zero** collected tests. So the gate asks `playwright test --list --reporter=json`
what the engines REALLY collect and compares that with the
`apps/sandbox-e2e/browsers.policy.json` policy: every file runs on every engine unless it
has an entry there with a reason. Point 5 reads the `e2e` target's command from the Nx graph
and the install steps from `.github/workflows/ci.yml` — `--project=chromium` in the command is
one narrowing invisible in the Playwright configuration, and a sharded run is the other: the six
browser jobs are the whole suite only while their shard count is the size of their own matrix
rather than a number typed beside it
**Control:** `tools/check-browsers.fixtures/` — 27 doctored inputs, each rejected on its own
**rule**; plus nine runs against the real repository (webkit struck from `projects`; a file
added to firefox's `testIgnore`; an exclusion widened onto an engine that passes the probe; an
engine removed from the install step in CI; `--project=chromium` in the target; an exclusion
removed from the policy with `testIgnore` left in place; `testIgnore` removed with the entry
left in place; a new spec excluded on every engine at once; an unclosed bracket in the
configuration) — each on a different rule
**Lessons:** [`lesson-56`](../lessons.md#lesson-56)

> There are two exclusions and they are **of different kinds**. `visual.spec.ts` outside
> chromium is a `record` — a decision recorded once: the references in `__screenshots__/linux/`
> were rasterised by chromium, so on every other engine 26 out of 26 differ (measured).
> `forced-colors.spec.ts` outside webkit is a `measurement`: that engine reports
> `forced-colors: active` and **does not replace the author's colours**, so four of the six
> tests pass there while measuring colours from the tokens
> ([`lesson-56`](../lessons.md#lesson-56)). Point 6 repeats that probe on every run — the day
> webkit implements it is the day the gate **demands the exclusion be lifted**, instead of the
> day nobody notices the file is no longer running there for no reason.

> The `fact-without-baseline` rule is point 6's denominator: a fact that holds on **no** engine
> is not a defect of the engines but a broken probe — and a probe returning false would
> justify every exclusion built on it, forever.

---

## Cost

### <a id="req-quality-benchmark"></a>`req-quality-benchmark` — What a component costs is a published number

**Promise.** Every component page's preview is rendered by the cost run
(`nx run docs:bench` — the demo the page shows, in jsdom) and five readings per scene are
recorded in `apps/docs/bench.snapshot.md`: elements in the document, depth, listeners
registered and not taken back, renders before the scene holds still, and microseconds from
creation to stable. **The counts are held exactly and in both directions; the clock is
published, dated, attributed to its machine — and compared by nobody.** The split is
[0023](../decisions/0023-a-tolerance-is-for-a-wobbling-measurement.md) applied to
performance: a count comes out the same on every machine, so a band on it would only let the
record age; a clock wobbles with the load, so a gate on it is either flaky or so wide it
never fires. A wrapper added, a listener leaked or a second render pass therefore fails CI
until it is written down beside the change that caused it, and the page shows the reading
in its Evidence tiles — a number nothing measured does not appear.

**Gate:** `tools/check-bench.mjs` (target `check-bench` of the `docs` project, in CI) — six
points: the report is there, dated, attributed and whole; the scenes are exactly the demo
registry's previews, read a second time from the registry's own text; the record has a row
per scene and no other; the four counts equal the record, both ways; a clock reading stands
for every scene and parses; the file is byte for byte what the renderer writes. The
measurement itself is `apps/docs/bench/previews.bench.ts`
**Control:** `tools/check-bench.fixtures/` — 17 prepared inputs, each rejected on its own
point: among them `a-preview-the-run-skipped.json` (the registry shows a preview the report
has no scene for), `elements-shrank.json` (one element fewer fails exactly as one more does),
`a-listener-leaked.json`, `a-second-render.json`, `a-scene-nobody-timed.json` (a clock row
gone while the date above still stands) and `prose-drift.json` (every row right and one
sentence of the record rewritten). Plus the run that settled the design: the counts came out
identical in two consecutive runs of the 33 scenes, and the clock moved by up to 15% between
them — which is why the first four are a gate and the fifth is a dated number
**Decision:** [0023 — a tolerance is for a measurement that wobbles](../decisions/0023-a-tolerance-is-for-a-wobbling-measurement.md)
**Lessons:** [`lesson-78`](../lessons.md#lesson-78), [`lesson-79`](../lessons.md#lesson-79)

> jsdom on purpose, and not a browser: there is no layout in it, so the clock reads the
> library's own work — the compiled templates, the signals, the listeners it wires — and not
> the engine's. That is the part this repository can change. What a browser adds on top (style
> recalculation, layout, paint) scales with the first two counts, which is why they are the
> ones held exactly.

---

## The sandbox — input for the gates

### <a id="req-quality-views"></a>`req-quality-views` — The sandbox is split into views

**Promise.** A view per component shows its variants, sizes and states; cross-cutting views
(size, theme, density, states, forms, tokens/parts, a11y) line **all** components up along
one axis. The view registry (`views.ts`) is the single source for routing, navigation and the
landing page. **A component's test enters that component's view.**

**Gate:** `apps/sandbox-e2e/src/a11y.spec.ts`, `hydration.spec.ts` — both iterate over the
view registry, so a new view is audited **without adding a test**
**Control:** `apps/sandbox/src/app/app.spec.ts` — the view registry against the routes
**Lessons:** [`lesson-29`](../lessons.md#lesson-29), [`lesson-33`](../lessons.md#lesson-33)

> The cross-cutting views line components up in a **matrix**, not in a list of examples:
> `/size` is every control × `sm`/`md`/`lg` aligned on their bottom edge, `/states` is every
> control × every state. States are forced through **inputs**, not derived from a form —
> otherwise there is no way to show the cases that are hard to reach by clicking, and those
> are exactly the ones with no coverage.

---

### <a id="req-quality-card"></a>`req-quality-card` — The shared `sbx-demo` card

**Promise.** The card wraps every example and carries the cross-cutting axes: colour scheme,
skin and size — globally in the shell, locally per card. It sets the theme on **its own
stage**, never on `:root`, so every example doubles as a scoped-theme test. The switch bar
stands **outside the stage**. The card also declares which requirements it is about
(`[reqs]`).

**Gate:** `apps/sandbox/src/app/ui/demo.spec.ts`; `tools/check-docs.mjs` — every `req-*` in
`[reqs]` must resolve to an existing requirement
**Control:** `tools/check-docs.fixtures/` — a card with a non-existent identifier must be
rejected
**Lessons:** [`lesson-13`](../lessons.md#lesson-13)

> The `reqs` input is typed as `PctReqId[]` — a union generated from the documentation. Same
> move as `PctCssVar` in [`lesson-43`](../lessons.md#lesson-43): a typo in an identifier stops
> being a silent chip leading nowhere and becomes a **compile error**.

---

### <a id="req-quality-stage"></a>`req-quality-stage` — The page theme is a scoped theme too

**Promise.** The shell keeps `data-theme` on its own host, not on `:root`. That leaves
`:root` as an **invariant reference point** for tests, and the page goes through the same code
path as any subtree.

**Gate:** `apps/sandbox-e2e/src/theme.spec.ts`, `apps/sandbox-e2e/src/shell.spec.ts`
**Control:** `preferences.spec.ts › "with no dark preference :root stays light (the
reference)"` — here `:root` is the negative control for every theme measurement
**Lessons:** [`lesson-17`](../lessons.md#lesson-17)

> This forced the token build to emit a `[data-theme="light"]` block: as long as the light
> theme was merely the absence of an attribute, a light card inside a dark page had nothing to
> undo the inherited values with.

---

### <a id="req-quality-prefix"></a>`req-quality-prefix` — Sandbox infrastructure uses the `sbx` prefix

**Promise.** The `sbx` prefix is kept apart from `app` (the shell) and `pct` (the library) —
the selector tells you whether an element is scaffolding, a demonstration, or a published
component.

**Gate:** `apps/sandbox/eslint.config.mjs` — selector rules with the prefixes
**Control:** none — deliberately: an ESLint rule has no quiet-pass mode
