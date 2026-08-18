# Work plan — task list

> **This file is written by hand.** It is the only place allowed to hold "done / in progress /
> to do".
>
> It does not duplicate the [registry](registry.md): the registry is generated and says **which
> promises have no gate**; this file says **in what order we close them and what has already
> gone through**. When the two disagree the registry wins — it is derived from the
> documentation, this is a list written by hand.

## How to use it

**At the start of a session** — check whether the plan has lied:

```bash
node tools/check-docs.mjs
```

It prints the current counts (`enforced / partial / gap`). If they disagree with
[State](#state), fix that section before starting anything else.

**At the end of a session** — tick the tasks off. A task turns `[x]` only once it meets the
definition of done.

### Definition of done

Straight from [`req-axis`](00-axis.md): a promise without a gate is unfinished, and a gate
without proof that it can fail is unfinished one floor up. A task is `[x]` when:

1. the gate exists and **runs in CI** (`nx affected -t …` in `.github/workflows/ci.yml`),
2. it has a **negative control** — a test or a recorded run proving it can **fail**,
3. the requirement in [`requirements/`](requirements/) has its **Gate** and **Control** fields
   updated,
4. `node tools/check-docs.mjs --write` has rewritten the registry and the entry is gone from
   the gap list.

Point 4 is the only hard proof; the first three without it are a declaration.

### Notation

| mark  | meaning                                                                                           |
| ----- | ------------------------------------------------------------------------------------------------- |
| `[ ]` | not started                                                                                       |
| `[~]` | in progress — the note says **what it ended with**, so it can be resumed without reading the code |
| `[x]` | closed per the definition above                                                                   |
| `[-]` | deliberately dropped — the requirement then gets `none — deliberately: <reason>`                  |

## State

Snapshot, `node tools/check-docs.mjs`:

| measure                                     | value |
| ------------------------------------------- | ----: |
| requirements                                |    84 |
| ✅ enforced                                 |    58 |
| 🟡 partial (deliberately without a control) |    16 |
| ⛔ gap                                      |    10 |

All 10 gaps have an owner below (B, D, F, G). If adding a requirement raises the gap count
and no task changes, this list has stopped being complete — and that is a fault of this list,
not of the registry.

## Order

```
B  release readiness        binds at the first publication
C  open findings            small, good filler between the bigger items
D  behaviour layer in core  blocks E
E  components               dialog → tooltip/popover → menu → select → fields → rest → table
F  trust surface            docs, ACR, benchmarks, Figma bridge
G  gaps with no deadline    waiting for the trigger written in their "Binds at" field
```

**The next milestone is not a release but the first push to the public repository** (B2), and
the rule for it is settled: nothing leaves in a second language — not the sandbox, not a
comment, not a fixture value. **B8 has closed, so that is now a measurement and not a
declaration** — both limbs run, the register of exceptions is empty, and the run that closed
it found three survivors in a repository three passes had declared clean. **B9 has closed
too**, and with the same shape: the clear-out went with a gate, so what a public repository
should never have carried is now measured on every push rather than tidied once. **Nothing
stands between here and B2 any more** — the task itself is minutes, and it is the last one
whose price is paid before a first visitor arrives, not after. Of B, **B3 has closed as well**,
so the npm page is written and the last file that travelled in a second language is gone.
**B6 and B7 have closed too** — the support window with a gate reading its numbers, and the
dependency lists with a gate reading the artefact — so **what stands between here and npm is
B4 alone, and B4 is held with B2**. In parallel: F1 is unblocked — the inventories it renders
both exist — and C is filler.

**B2 is deferred by decision, not blocked** — and the decision has a shape: **the first push
happens only when the maintainer asks for it outright.** It is not triggered by a state of the
repository, by a green run or by B2 standing next in this order; a session that reaches it
**skips it and takes the next item**, and so does anything whose price is a remote (B4's links,
provenance, remote CI). The reason is the premiere: everything the first visitor sees becomes
the product at that second, and "the list says it was next" is not a reason to spend that
once-only moment.

So the work went on into D: **D1 has closed**, and the walk over a list now stands in `core`
before the second control that needs it rather than after the fourth. What it left behind is a
new finding of the C kind — **C9**, the metric that sees neither a template's conditions nor
their absence.

Then back to the rule above, taken literally: **B3 is the next item after B2, and its price is
not a remote**, so the session that skipped B2 took it. It closed, and it proved the skip rule
does not exempt a task from being read carefully — the file B3 was written to replace was
reachable only through the sentence in this plan that described it, so ticking the task off
without a second thought would have deleted the reader of the page it produced.

The same rule carried on to **B6**, which closed as well and cost the plan a decision it had
left open: a support policy is numbers, and there were none to copy. They are written down as
the honest ones rather than the generous ones — **`support-months` is 0**, because a backport
promise costs a second CI matrix and a maintainer on somebody else's timetable, and a zero
that holds is worth more than a six that does not. Each row says what it becomes at 1.0. The
task also produced [`lesson-63`](lessons.md#lesson-63): this is the first gate here whose
input is git rather than files, and a cached one would answer from before the amendment that
added the `!`.

And on to **B7**, which closed and moved the question the plan had written down. The task was
"the declared lists against an allowed list", and the declared list is the one place a
dependency added by reflex does not touch — `npm i` writes the name into the root manifest and
the import into a source file, and the library's manifest never learns of it. So the point
measures the closure in both directions over the artefact, and the first thing that fell out
of doing so is [`lesson-64`](lessons.md#lesson-64): the published manifest declares a runtime
dependency (`tslib`) that no file in this repository declares — ng-packagr writes it, with
Angular's range. The promise was amended rather than the package: **a document that describes
an artefact nobody measured describes what somebody meant.**

With B exhausted — B2 held on a sentence, B4 held with it — the order handed the session to
**C**, and **C1 has closed**. The finding named one component and the rule written for it
found three: `pct-checkbox` and `pct-radio` carry the same shape as the select, a role one
level down and a host with none. Why none of the three had been caught is the part worth
keeping in view ([`lesson-65`](lessons.md#lesson-65)): **the axe audit reads the sandbox's
DOM, and in the sandbox every control is given a label** — so the one configuration in which
the promise fails is the one no page renders.

**C2 closed after it**, and it moved the finding it was written from. The plan offered
`track $index` **or** a uniqueness promise with a warning under `isDevMode()`, as two roads to
one place; they do different work. Tracking decides which DOM node a row reuses, uniqueness
decides which option a value denotes — so the cheap road on its own would have taken away
NG0955, the only thing that had ever spoken about a duplicated value, and left the defect
where it was, now silent ([`lesson-66`](lessons.md#lesson-66)). Both were done. The same
promise turned out to have no owner one component over: **C10**, where the radio group cannot
even see the values of its own options — and the size gate, fired by a comment written into a
template, produced **C11** and [`lesson-67`](lessons.md#lesson-67): a template travels to the
artefact as a string, so prose for a maintainer is bytes, while the same prose in TypeScript
is free.

**C3 closed next**, and it repeated C2's shape one component over: the finding asked for a
`console.warn` when a second control registers with a field chrome, and written that way the
message would have fired on a page that is entirely correct — a control inside an `@if` is
destroyed and built again, and its second construction calls `attach` exactly as a second
control would. The contract had only the half that speaks, so **`detach` came first and the
message second** ([`lesson-68`](lessons.md#lesson-68)), and the pair closed a defect the
finding had not named: the chrome was reading the state of a control that had left the DOM.

## B. Readiness for the first release

Binds at the first publication — and then all of it at once. **B9** bound one step earlier, at
the push, and is closed; what is left binds at npm.

Three of the seven tasks (**B3**, **B4**, **B8**) were about language: the text that travels
inside the package, and the gate that proves the rest of the repository holds to it. The gate
went first, the package text followed it, and **both are closed** — so what still carries B4's
number is not about language at all, but about 31 citations that need an address.

**The version of that first release does not follow from the history**, and it belongs to no
single task below: with a single root commit `releaseVersion` sees an empty range and keeps the
`0.0.1` of the manifest, so the run needs an explicit `--specifier`. At `0.0.1` every bump lands
on a patch anyway (`adjustSemverBumpsForZeroMajorVersion`), so the first version is a decision,
not a derivation.

- [ ] **B2 — remote repository + `repository` in the manifest** — **held: it starts on an
      explicit request and on nothing else**
  - **the trigger is a sentence, not a state.** No other task may pull the push forward, no run
    turning green starts it, and its standing next in the order is not a start either — a
    session that reaches B2 passes over it and takes the next item. Recorded here because the
    opposite is the natural reading of a task list: everything else in this file starts when the
    thing above it is done
  - concerns: `req-release-metadata` — the gate and its control exist, so the registry says ✅.
    **The manifest field is done** (`libs/components/package.json` points at
    `github.com/pacit/components`); what is left is the repository, the remote and the push,
    and day to day the gate only warns
  - the `pacit` organisation exists on GitHub and on npm (scope `@pacit`, owner `markovy`);
    the repository itself does not yet
  - `git remote -v` is still **empty**, deliberately: the first push is a premiere, so a remote
    added early is an invitation to an accidental `git push`. Until then npm refuses provenance and `check-package.mjs --release` blocks
    the release
  - **the task itself is minutes, but it stopped being first.** The repository is public
    **from the first push** (settled: no private stage), so `README.md`,
    `docs/` and the step names in Actions become **the product** at that second
  - hence everything the first visitor sees is finished before the push, not after it. The price
    of that order is written down plainly — until the first push there is no remote CI, no
    provenance and no copy off this machine
  - the condition is wider than the public surface: **nothing leaves in a second language at
    all**, and a measurement says so, not a declaration — **B8 proves it, and it is closed**:
    720 files of the index and 31 of the package, no entry in the register
  - cost: minutes for the task itself · _notes:_ —

- [x] **B3 — package README in English** — **closed, and it had to be made reachable to survive
      its own task**
  - closes: [`req-project-language`](requirements/project.md#req-project-language) on the last
    file that carried the layer with no right to stand in a register of exceptions
  - cost: ~0.5 day · _notes:_ **done** — `libs/components/README.md`, 268 lines written from
    scratch over the seven-line Nx stub: install and what each of the two stylesheets buys,
    the peer dependencies, the entrypoint table, a section per component, theming, texts,
    configuration, accessibility, documentation, licence. The other two files of this task
    were already done — the manifest `description` and the headers of the generated theme
    artefacts, fixed in `libs/tokens/build.mjs` rather than in its output.
    **The file was alive only because this task named it**: `check-reach` reached
    `libs/components/README.md` through one sentence of this position, so ticking B3 off would
    have killed the file B3 had just written. It is a root now, for the reason it was always
    one — ng-packagr copies a library README into `dist` by its own convention, and
    `ng-package.json` names the `themes` assets and nothing else. The same edit corrected the
    root README's reason in the policy, which claimed npm renders it: npm renders this one, and
    the two answer to different readers. Two things deliberately left out — `_tokens.scss`,
    because advertising it on the npm page would settle **C4** by publishing it, and any
    mention of the primitive ramps, which is **C6**. The documentation links are absolute
    `github.com/pacit/components` addresses, dead until B2 and costing nothing for it: the page
    reaches its first reader at npm, and npm is behind B2

- [ ] **B4 — citations in the public API as links**
  - concerns: [`req-project-language`](requirements/project.md#req-project-language)
  - **the language half is done**: the 24 files of the built package
    that carried Polish — all eight `types/*.d.ts`, seven `fesm2022/*.mjs`, the source maps and
    the manifest — measure **zero** today. Translating the JSDoc apart from the file it stands
    in would have meant opening all 15 sources twice, so it travelled with the sources
  - what is left is the second thing in the same place, and it is not about language: the
    public `.d.ts` cite `req-*` and `lesson-*` **31 times** as bare identifiers that lead
    nowhere for a consumer. The answer is **a link, not a deletion** — so this waits on **B2**,
    because the address `@see https://…/docs/requirements/a11y.md#req-a11y-built-in` has to
    resolve before it is worth more than the paragraph it replaces
  - **B2 being held on a request, this one is held with it** — and it is the whole of what the
    hold costs, since the citations are the only work in the file that needs an address
  - cost: ~0.5 day · _notes:_ —

- [x] **B6 — support policy document** — **closed, and the document is an input, not a page**
  - closes: [`req-release-support`](requirements/release.md#req-release-support)
  - cost: ~1 day · _notes:_ **done** — [`docs/support.md`](support.md) plus
    `tools/check-support.mjs` (five points, 15 fixtures), target `check-support` in the root
    project and in CI. **A document is the one input that always looks fine**, so the three
    numbers live in a table the gate reads: 1 Angular major, 0 months of an old line, 2 minors
    of notice, and `codemod-required` as a switch that fires when reached for. Point 2 is what
    stops the page drifting — it counts the majors the `@angular/*` peer ranges admit and
    requires the count to equal the declared one; widening the window is one edit in each
    place and doing only one fails CI. **Point 4 is the tie the requirement was missing**, and
    it measures nothing until the first release tag: there is no installed version to migrate
    from, so a breaking change before it owes no codemod — the run prints which of the two
    states it is in rather than passing quietly. Deliberately **not** measured, and written
    into the document: that a removal actually waited the two minors, which needs a record of
    the public API at each release that only CSS parts have. Proof on the real input, not only
    on fixtures: `angular-majors` moved to 2 against `^22.0.0` fires point 2. The one cost
    named out loud is `cache: false` ([`lesson-63`](lessons.md#lesson-63))

- [x] **B7 — dependency list gate** — **closed, and the list was the smaller half**
  - closes: [`req-project-dependencies`](requirements/project.md#req-project-dependencies)
  - what: a seventh point in `check-package.mjs` — `dependencies` / `peerDependencies` of the
    **packed** manifest against an allowed list. Today nothing tells a deliberate dependency
    apart from one added by reflex
  - control: a manifest with a dependency outside the list must fire
  - cost: ~0.5 day · _notes:_ **done** — point 7 of `libs/components/check-package.mjs`
    (seven rules) plus `libs/components/dependencies.policy.json`, nine prepared packages,
    the target already in CI. **The task as written would have watched the one place a
    reflex does not reach**: `npm i` writes the name into the root manifest and the import
    into a source file, so the library's own manifest never learns of it. Hence the closure
    runs both ways over the artefact — an import nobody declared fires, a declaration nothing
    imports fires — and the list of names keeps the half the requirement asked for: an entry
    carries the reason, a dependency without one fires, and **an entry outliving its
    dependency fires just the same** (the `check-language` register idiom, one gate over).
    Two things the task did not foresee. **The policy is a list, and a list of names always
    looks fine**, so a case may carry a policy of its own — that is what makes the rules
    _about_ the policy provable, and the entry with no reason is one of the nine. And
    `compiler-drift`, which pays a debt written down elsewhere: `check-consumer` records that
    a peer-range drift passes it and that only this requirement watches for one, so the range
    is measured against the Angular major **stamped into the artefact** by partial
    compilation — not against a number typed a second time. The stamp going missing is its
    own rule, for the reason point 4 has two cases. Proof on the real artefact, not only on
    fixtures: `date-fns` in `dependencies` fires `not-allowed`, an `rxjs` import in
    `pacit-components-button.mjs` fires `undeclared`, `@angular/core` at `^21.0.0` fires
    `compiler-drift`. The negative control grew a floor: point 7 is the first with several
    rules under one check, so a case names the rule too — measured, with
    `dependency-outside-list` retagged as `dead` and the run saying which fired instead.
    One thing found by accident and left visible: the fixtures' README had never listed the
    two `licence` cases, so it now does

- [x] **B8 — language gate** — **stood before B2, and it is closed**
  - closes: [`req-project-language`](requirements/project.md#req-project-language)
  - **without it every translation pass is a one-off tidy-up.** A language rule with no gate is
    the [`req-axis`](00-axis.md) class exactly: it was written down once and broken on **both**
    sides while it stood
  - what: `tools/check-language.mjs` + `tools/language.policy.json`. **Two measurements of
    different reach**: the public surface on the **artefact** (what comes out of `npm pack`,
    not what stands in the source), the rest of the repository on files from the git index
  - **two reaches, one deadline now**: the repository limb runs before the push, being the only
    thing turning "nothing is left in Polish" into a measurement; the artefact limb binds at B3
  - detection has **three limbs**: diacritics carry prose only, so the second is
    `/usr/share/dict/polish` minus `american-english`, over identifiers split at camelCase, and
    the third is the opening quote `U+201E`, a typographic convention with no English use.
    **The false positives of the second are the design work** and they enumerate — acronyms,
    the abbreviations of the trade and the words both languages share — never a whole
    grammatical class ([`lesson-60`](lessons.md#lesson-60))
  - the register follows the `browsers.policy.json` idiom: an entry carries its reason
    and the task that removes it, and **a dead entry fires just like new Polish**. It starts
    empty bar one survivor to rule on — the `pl-PL` default of `number.spec.ts`, the case that
    groups with U+00A0. Denominator: [`lesson-48`](lessons.md#lesson-48)
  - control: Polish in a file outside the register; an entry pointing at a file **already**
    translated; a Polish `description` **despite** an entry; a scan with an empty file list
  - cost: ~1 day · _notes:_ **done** — `tools/check-language.mjs` (seven points, 24 rules),
    `tools/language.policy.json`, 27 fixtures, target `check-language` in the root project
    and in CI. The register of exceptions is **empty**: the survivor left to rule on turned
    out not to be a case (a BCP-47 tag is not prose, and no limb flags it), so an entry would
    have been dead on arrival. The vocabulary holds **103 words**, and the shape the plan
    forbade is not merely discouraged — an entry that is not a bare lowercase word fires.
    **The first run found three survivors** three passes had declared clean: a Polish local
    for "target" in three gate scripts, a Polish "both" in a fixture's JSDoc, a Polish
    "this is not an email" in an e2e test; all translated in the same commit. A third list
    was needed that the plan had not foreseen — `specimens`, the gate's own samples, which
    carry Polish by construction and whose tree the script hard-codes, so the list cannot be
    widened into a second register of permits. Two limbs of noise were fixed rather than
    registered —
    `ɵ` is a letter, so Angular's `ɵfac` stops coming apart at the barred o, and a source map is read
    through its fields, so `mappings` stops arriving as base64 debris

- [x] **B9 — the repository is tidied before it is published** — **closed, and it left a gate
      behind**
  - closes: [`req-project-reach`](requirements/project.md#req-project-reach)
  - **what a first visitor must not find**: an identifier space no public reader can observe,
    findings closed long before they could read them, and files whose deletion was nobody's task
  - `.opencode/skills/` and `.github/skills/` are **byte-identical copies** of a vendored Nx
    guide, 18 files each — one of the two is a directory nothing reads
  - control: no tracked file that no other file mentions
  - cost: ~0.5 day · _notes:_ **done** — 21 files went (the `.github` copy of the vendored
    guide with its agent and prompt twins, and `tools/ai-migrations/`, the prompts of an ESLint
    migration that has already run); which copy stays was decided by evidence rather than by
    preference — `opencode.json` is tracked, nothing configures the tool that would read the
    other. The four citations of section A (`A7`, `A12`) in `project.json` now name
    [`lesson-47`](lessons.md#lesson-47), which holds the measurement A7 stood for.
    **The control as this task wrote it would not have found the tree it names**: a copy brings
    its citations with it, so "no tracked file that no other file mentions" answers alive for
    every file of a duplicated directory. `tools/check-reach.mjs` walks from roots instead —
    five points, 17 fixtures, 728 files reached, and it took a second design pass to see that
    `**/*.md` in an unrelated gate's `inputs` was granting the whole tree
    ([`lesson-61`](lessons.md#lesson-61))

## C. Open findings

Small, good filler between the bigger items. Each one is verified in the code and still
current.

- [x] **C1 — `pct-select` without the field chrome is an unnamed combobox** — **closed, and it
      was three components, not one**
  - `aria-label` lands on the `<pct-select>` host, which has no role; `role="combobox"` sits on
    the inner `<button>`. A consumer has no way to fix this
  - needed: explicit `ariaLabel` / `ariaLabelledby` inputs forwarded to the element that has the
    role — a rule for every future component whose role does not sit on the host
  - a real a11y gap, not cosmetics · _notes:_ **done** — the two inputs on `pct-select`,
    `pct-checkbox` and `pct-radio`, forwarded to the element that carries the role (in the
    select also to the panel, which is the second element with one), plus
    `tools/check-aria.mjs` (five points, 10 fixtures), target `check-aria` in the root project
    and in CI. **The finding named the place it was seen; the rule named the class** — the
    same defect stood in the checkbox and in the radio, and nothing had caught it because the
    axe audit reads pages and the pages all pass a `label`
    ([`lesson-65`](lessons.md#lesson-65)). What the gate measures: a component whose widget
    sits inside its own template declares both inputs and binds both on **exactly one**
    focusable element — one carrier, because two named elements are two names for one control,
    and none because an input read by nobody is worse than an input that does not exist. The
    mirror rule is point 2: an ARIA name written into a `host` block needs a role on that
    host, which is the same defect committed by us one floor lower, where it looks like a fix.
    Deliberately **not** measured, and written into the cards and the JSDoc instead:
    precedence. `ariaLabel` wins over a visible `label` by the accessible-name algorithm, so
    setting both makes the two say different things — a dev-mode warning is **C3**'s idiom and
    nothing has established it yet. Left out with its reason: **no page renders a control
    named only from outside**, so the axe audit still never sees the configuration the gate
    now guarantees is reachable — a sandbox specimen for it means new visual snapshots, and
    the unit cases of the three components carry that proof instead. Proof on the real input,
    not only on fixtures: the
    bindings removed from `select.html` fire `forwarded`, an input removed from
    `checkbox.ts` fires `inputs`, an `aria-label` written into the select's roleless host
    fires `host`

- [x] **C2 — `track option.value` with a generic `T`** — **closed, and the either/or in it was
      a false choice**
  - `libs/components/select/src/select.html` — for a non-primitive `T` this tracks by reference,
    and two options with the same value give NG0955 in dev mode. Either `track $index`, or a
    documented uniqueness requirement with a warning under `isDevMode()` · _notes:_ **done** —
    `track $index` in `select.html`, `warnOnDuplicateValues` in `select.ts` under
    `isDevMode()`, seven unit cases, and the promise written down where a consumer meets it:
    [`req-api-generic`](requirements/api.md#req-api-generic), the component page and the npm
    README. **The two roads were not alternatives** ([`lesson-66`](lessons.md#lesson-66)):
    tracking decides which DOM node a row reuses, uniqueness decides which option a value
    denotes — so the cheap road alone would have removed NG0955, the only thing that had ever
    spoken about a duplicated value, and left the defect standing in silence. Why `$index` and
    not the value: **every binding of a row is already a function of the index** (the id,
    `aria-selected`, both flags, both handlers), so keying by value moves DOM that is rewritten
    in place anyway — while a list rebuilt from a response, the very case `compareWith` exists
    for, arrives as all new references and re-creates every row. Measured rather than argued:
    with `option.value` back in the track expression the case "a list rebuilt from equal data
    reuses the rows" fails, and with the warning switched off three of the six duplicate cases
    fail while their mirrors stay green. The message names **positions and labels**, the labels
    being what differ between two options a value cannot tell apart. The cost written down
    plainly: the scan is pairwise and therefore O(n²), because the comparator belongs to the
    application — a `Set` has a key only for the default identity, and measuring one case and
    not the other would be worse than measuring both. Deliberately **not** measured, for C1's
    reason one component over: that the message reaches a real console — no page renders a
    duplicated list, so the unit cases carry it. **The price is measured, not estimated**: the
    mutation run reads 83.47% for `select.ts` (80.73 before, one new survivor and it is the
    `isDevMode()` guard itself — the same one `number.ts` carries at its own guard), and the
    size snapshot `./select` 30510 → 32114 B, of which the report is **588 B** — stripped out
    of the built FESM and bundled again to get that number. It ships, because `isDevMode()` is
    a call and not a flag a minifier can fold. The same rewrite records 739 B on `./checkbox`
    and 731 B on `./radio` that C1 had left inside the tolerance. Three things found by
    accident: the same promise has no owner in the radio group (**C10**), a seven-line comment
    written into the template cost **1064 B** in the artefact and moved into TypeScript
    ([`lesson-67`](lessons.md#lesson-67)) — which in turn opened **C11**, the budget that
    counts a template as text — and this component's page still carried two limitations that
    D1 and C1 had closed, a "Known limitations" section outliving what it knew

- [x] **C3 — `PctField.attach()` overwrites silently** — **closed, and the message needed a
      life-cycle event that did not exist**
  - `libs/components/field/src/field.ts` — a second control in one field chrome wins without a
    word. A classic silent defect, cheap to close: `console.warn` under `isDevMode()`
    · _notes:_ **done** — `detach` in the `PctFieldApi` contract, `pctAttachToField` in `core`
    (one call, both halves, booked through the control's `DestroyRef`), the report in
    `PctField.attach` under `isDevMode()`, four cases in `field.spec.ts`, and the promise in
    [`req-api-wrapper`](requirements/api.md#req-api-wrapper) and on the component page.
    **The task as written would have reported a correct page** ([`lesson-68`](lessons.md#lesson-68)):
    a control inside an `@if` is destroyed and built again, and the second construction calls
    `attach` exactly as a second control would — nothing in the contract told the two apart,
    because the contract had only the half that speaks. The pair therefore came first and the
    message second. It also closed something the finding had not named: **the chrome went on
    reading a destroyed control's state**, a signal outliving its component, so the error of a
    control removed from the DOM stayed lit under the field. Measured, not argued: `detach`
    made a no-op leaves the swap case and the departure case red, the report switched off
    leaves the first case red. The five controls that used to call `attach` by hand now call
    the helper — the same three lines in five places is a fix that has to be made five times
    ([`lesson-21`](lessons.md#lesson-21)), and the mutation run reads `core/field.ts` at
    **96.97%** (96.43 before), its one survivor unchanged — an optional-chaining mutant in
    `pctFieldMessages` that only a control reporting `null` errors could kill, and the types
    forbid one. It says 96.97 rather than 100 because the run was made **twice**: the first
    shared the machine with other gates and recorded that survivor as killed by the CLOCK,
    which is the purchase `mutation.policy.json` was written to catch. It also records two
    scores falling by a hundredth,
    which is the same edit seen from the other end: `this.field?.attach(this)` carried an
    optional-chaining mutant that a plain call does not, so `number.ts` and `select.ts` each
    have one killed mutant fewer to their name. Deliberately **not** changed: which control wins.
    Last-in still takes the chrome, because the chrome cannot know which of the two the label
    was written for, and a quiet reordering would be a second guess on top of the first

- [ ] **C4 — `_tokens.scss`: generated, shipped in the package, used by zero lines**
  - concerns: `req-token-scss` — component stylesheets contain no `@use` at all; every reference
    is a raw `var(--pct-*)`
  - decision: either make it the mandatory road to a token (a typo becomes a compile error — the
    spirit of [`lesson-43`](lessons.md#lesson-43)), or drop it from the requirement and from the
    package. Today it is a dead artefact in a published package · _notes:_ —

- [ ] **C6 — primitives in the public `PctCssVar` union: two ramps private, the third not**
  - `libs/tokens/src/names.policy.json` declares `pct.blue.` and `pct.slate.` private and
    `pct.red.` not — so a consumer sees `--pct-red-600` in the type and does not see
    `--pct-blue-600`. An inherited drift, moved out of an expression in `build.mjs` and into the
    policy — that is, **from an invisible place into a visible one** — and left there
  - to be settled wider than one ramp: do primitives belong to the public surface at all? For:
    e2e and theme-building code ask the browser for values and the type is the only protection
    against a typo ([`lesson-43`](lessons.md#lesson-43)). Against: a primitive is an
    implementation of the skin, not its contract
  - cost: minutes for the change, the decision is the whole task · _notes:_ —

- [ ] **C7 — `options`, the only container part without the `group-` prefix**
  - `libs/components/radio/src/radio-group.html` — the group ships `group-label`, `group-hint`,
    `group-error` and `options`. The prefix came from a real collision with option labels
    ([`lesson-15`](lessons.md#lesson-15)), and this one part stayed outside the rule that
    [`req-api-parts-unique`](requirements/api.md#req-api-parts-unique) records as a fact
  - it collides with **nothing** today, so this is neither an a11y defect nor a forced change:
    `req-api-parts` promises stability and being written down, not guessability. Left alone
    deliberately, the same call as C6 — with the difference that a rename is now a visible
    change to the public API (the parts snapshot), not a quiet fix
  - cost: minutes for the change (`options` → `group-options`, nobody uses it in tests or in the
    sandbox), the decision is the whole task · _notes:_ —

- [ ] **C8 — forced-colors rules lose on specificity to the base rules**
  - `libs/components/button/src/button.scss` — `:host([disabled])` inside
    `@media (forced-colors: active)` has specificity (0,2,0) while the base rule
    `:host([disabled]:not([data-pct-loading]))` has (0,3,0). A media query adds no specificity,
    so `color: GrayText` **does not win**. To be checked in the other five stylesheets with a
    forced-colors block (`checkbox`, `radio`, `select`, `field`, `text`)
  - **no symptom today**: chromium and firefox repaint the result with the user's palette
    whichever rule won, so the measurement comes out correct. It is visible only in webkit,
    which does no substitution ([`lesson-56`](lessons.md#lesson-56)), and it will be visible
    everywhere from the day any part of the library gets `forced-color-adjust: none`
  - this is a declaration without coverage, the same family as a dead token nothing paints:
    code that looks like it handles a case and does not
  - cost: ~0.5 day including measuring whether it can be written as a `check-styles` rule
    · _notes:_ —

- [ ] **C9 — a condition in a template is measured by nobody**
  - concerns: [`req-quality-unit`](requirements/quality.md#req-quality-unit) — the registry says
    ✅, and it is right about what it measures: the floor holds, the denominator is guarded.
    What has no owner is the **metric** — `tools/check-coverage.mjs` reads `total.lines.pct`
    and Stryker mutates `.ts` only, so a guard living in a template is in neither
    ([`lesson-62`](lessons.md#lesson-62), measured: the guard removed, 213 cases green)
  - the number that saw it exists already — `select.html` read 100% of lines against 85.71%
    of branches — so the cheap half is a **branch floor on templates** in `coverageThresholds`
    plus a point in the gate that the two thresholds are declared, not inherited
  - the expensive half is the one worth arguing about: today the arms of an `@if` in six
    templates have never been counted, and a floor set at what they measure ratifies whatever
    that is. The order is therefore **measure first, choose the floor after** — the same order
    the mutation snapshot was built in
  - what the fix does NOT buy: mutation testing of templates. A branch count says an arm ran,
    not that anything would have noticed it being wrong
  - cost: ~0.5 day for the measurement and the floor · _notes:_ —

- [ ] **C10 — two `pct-radio` with one value both render checked**
  - `libs/components/radio/src/radio.ts` — `checked` is computed
    (`group.isSelected(this.value())`), so two options carrying one value both compute `true`:
    both hosts get `data-pct-checked`, which is what the CSS paints, while the native inputs
    share a `name` and the DOM keeps only the last of them checked. **The same promise as C2
    one component over** — and the group cannot measure it today: it has no
    `contentChildren(PctRadio)`, deliberately (a circular import), so it never sees the values
    its options carry
  - read off the code, not measured. The first task here is therefore a failing case; the
    second is the decision whether the registration channel a duplicate scan would need is
    worth its price, or whether the promise stays a documented one in the group's JSDoc
  - cost: ~0.5 day · _notes:_ —

- [ ] **C11 — the size budget counts a template as text**
  - `tools/check-bundle.mjs` — the probe bundles the FESM with esbuild and **does not run
    Angular's linker**, so a partially compiled template is measured as the string it still
    is: the HTML comments of `select.html` alone are 2928 B, and stripping them takes the
    entrypoint from 33178 to 30262 B ([`lesson-67`](lessons.md#lesson-67))
  - the bytes are real in the package on npm; in a consumer's bundle they are not, because
    the linker compiles the template into instructions before the app is bundled. So
    `size.snapshot.md`, which says it measures "the contribution of this library" to an
    application, overstates it by the size of the template source — and a maintainer's comment
    moves a budget that is supposed to be watching what a consumer pays
  - to be settled: either the sentence in the snapshot says what the number is (cheap, honest,
    and leaves the budget sensitive to prose), or the probe runs the linker first (costly, and
    the number becomes what an app really carries). **Not** an argument for templates without
    comments — the reason for a decision then simply lives in the TypeScript beside it
  - cost: ~0.5 day · _notes:_ —

## D. Phase 1 — the behaviour layer in `core`

The largest architectural risk. The list machinery (typeahead, `activeIndex`, skipping disabled
options) sat as private methods in `PctSelect`, and autocomplete, multiselect, menu,
combobox and a command palette all need it. **Extract before the second consumer, not after** —
otherwise [`lesson-21`](lessons.md#lesson-21) (the same logic copied into four controls) repeats
on a much bigger piece. **D1 has closed**, so that half of the risk is paid: what the walk
shares now stands in `core`, and what the roles do not share stayed with the control.

Guiding principle: **mechanics from CDK, our own API** — CDK types never leak into the public
contract. The pattern is ready: `PCT_FIELD` is exactly that for the field chrome and its control.

- [x] **D1 — list navigation** → extracted from `PctSelect` into `core` · _notes:_ **done** —
      `pctListNavigation` in `libs/components/core/src/list.ts`: a function returning signals,
      the `pctFieldMessages` idiom that [0013](decisions/0013-no-headless-split.md) settled on.
      It owns the active index, skipping what cannot be reached, the edges and the typeahead
      prefix; **the key map stayed with the control**, because which key opens and which picks
      is a property of the combobox role, not of walking a list. Left out deliberately, one
      consumer being unable to tell a shared property from an accident of the only case:
      wrapping at the ends (a menu wraps, a listbox does not) and scrolling the active entry
      into view, which is DOM the walk never touches. Measured rather than declared: 17 cases
      under the primitive's own name ([`lesson-57`](lessons.md#lesson-57)), the select's
      keyboard cases unchanged as the proof that behaviour did not move, and the mutation run
      says **98.59%** for `list.ts` — `select.ts` rose 79.48 → 80.73 in the same pass, the
      weakly measured code having left it. **One mutant survives and stays**: `delta > 0` in
      `move()` reads the same as `delta >= 0` for every input but `move(0)`, and pinning a
      direction for a step of nothing would be inventing a promise to satisfy a mutant
      ([`lesson-60`](lessons.md#lesson-60) is the same instinct one floor down).
      Cost of the entrypoint, from the size snapshot: `./core` 1705 → 2628 B, `./select`
      30598 → 30510 B, and `./button` +44 B — the walk does not travel to controls that do not
      walk. The extraction also turned up a guard nothing had ever run
      ([`lesson-62`](lessons.md#lesson-62)); the two DOM cases it now has are here, the metric
      it exposed is **C9**
- [ ] **D2 — overlay**: positioning, the closing stack (Escape order when nested), outside click,
      `inert` background, scroll lock, inheritance of theme and writing direction — the last one
      solved once in [`lesson-35`](lessons.md#lesson-35), to be generalised · _notes:_ —
- [ ] **D3 — focus**: trap, restore, initial focus, roving tabindex as an alternative to
      `aria-activedescendant` · _notes:_ —
- [ ] **D4 — live announcer**: one `polite` channel, one `assertive`, with deduplication — not a
      region per component · _notes:_ —
- [ ] **D5 — `*pctTemplate` / `TemplateRef`** → closes `req-api-templates`; unblocks icons
      · _notes:_ —
- [ ] **D6 — icons**: `pct-icon` over a projected SVG plus a `PCT_ICONS` token mapping semantic
      names to templates, with built-in defaults → closes `req-api-icons` · _notes:_ —
- [ ] **D7 — gate forbidding `@angular/animations`** → closes `req-api-animations`; binds at the
      first component with an enter/leave transition, that is at D2 · _notes:_ —

## E. Phase 2 — components

Ordered by architectural debt, not by popularity — with one reservation from
[decision 0016](decisions/0016-mit-irreversibility.md): the item with the highest build cost goes
**last**, because a release under MIT is irreversible and it is better settled with users in
hand. The numbers are stable, the list order is not.

Every new component fills in [`components/_template.md`](components/_template.md) — the DoD form
exists and is a condition of entering a release.

- [ ] **E1 — dialog** — forces a focus trap, scroll lock, `inert`, focus restore, the Escape
      stack, SSR safety. The highest architectural gain per component
- [ ] **E2 — tooltip + popover** — the "describes vs names" distinction, hover/focus/touch
      parity, motion reduction on a real enter/leave
- [ ] **E3 — menu** — roving focus, submenus, reuse of the typeahead from D1
- [ ] **E4 — closing out the select family** — projected `pct-option`, an option template,
      groups, multiple selection, filtering, clearing, async, virtualisation. Deliberately
      **after** the behaviour layer
- [ ] **E5 — switch, textarea (autosize), slider, date picker** — the date picker forces deep
      i18n, which `[pctNumber]` has already started
- [ ] **E7 — the rest**: toast, tabs, accordion, drawer, pagination, progress, skeleton, chips,
      avatar, badge, breadcrumb, stepper, tree
- [ ] **E6 — table / datagrid** on a headless core (column model, sorting, filtering, grouping,
      selection as signals) separated from rendering. **The last item of the phase** — the only
      one counted in months rather than days; until the decision in
      [0016](decisions/0016-mit-irreversibility.md) is made it does not exist as a commit either,
      because the root `LICENSE` covers the whole repository

## F. Phase 3 — the trust surface

- [ ] **F1 — `apps/docs`** → closes `req-project-apps` and `req-project-layout`. Renders the
      **generated** inventories of parts and tokens, not hand-written ones
- [ ] **F2 — ACR / VPAT** out of the existing gates — you get the machine proof earlier than the
      document, which is the reverse of the industry norm (the EAA enforceable since June 2025,
      EN 301 549 in tenders)
- [ ] **F3 — benchmarks as a published number** + a performance regression that fails CI
- [ ] **F4 — DTCG ↔ Figma / Tokens Studio bridge** — the source of truth is already DTCG, an
      unused advantage
- [ ] **F5 — a surface for AI agents**: `llms.txt`, a machine-readable component catalogue from
      the same source as the docs, canonical examples

## G. Gaps with no deadline

Waiting for the trigger written in their **Binds at** field. They are not forgotten — they are
deferred.

- [ ] **G1 — `req-api-number`**: property tests for the parser (`parse(format(n)) === n` for any
      `n` and locale). Binds at the first locale outside `pl`/`en`
- [ ] **G2 — `req-project-files`**: a check on the entrypoint directory layout. Binds at the first
      component added by somebody other than the author of the rule
- [ ] **G3 — `req-token-directive`**: a theme directive instead of a hand-written `data-theme`.
      Binds once setting the attribute from a template starts repeating
- [ ] **G4 — `req-token-density`**: the DTCG sources contain **not one** density token. Binds once
      the size axis settles — note that density will go below the touch-target threshold, so it
      has to arrive together with a gate, not before one
