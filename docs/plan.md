# Work plan — task list

> **This file is written by hand.** It is the only place allowed to hold „done / in progress /
> to do" and the notes carried from one session to the next.
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

**At the end of a session** — tick the tasks off and add an entry to the [journal](#journal).
A task turns `[x]` only once it meets the definition of done.

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

Snapshot from **2026-08-07**, `node tools/check-docs.mjs`:

| measure                                     | value |
| ------------------------------------------- | ----: |
| requirements                                |    83 |
| ✅ enforced                                 |    54 |
| 🟡 partial (deliberately without a control) |    16 |
| ⛔ gap                                      |    13 |

All 13 gaps have an owner below (B, D, F, G, H). If adding a requirement raises the gap count
and no task changes, this list has stopped being complete — and that is a fault of this list,
not of the registry.

## Order

```
A  gates „right away"       blocks everything — each entry gets pricier with every component
B  release readiness        can run parallel to A; binds at the first publication
C  open review findings     small, good filler between the bigger items
D  behaviour layer in core  only after A; blocks E
E  components               dialog → tooltip/popover → menu → select → fields → rest → table
F  trust surface            docs, ACR, benchmarks, Figma bridge
G  gaps with no deadline    waiting for the trigger written in their „Binds at" field
H  one language, no filler  English everywhere; blocks B2 whole, not just its public part
```

**Phase A is closed and so are H1–H8 and H11**, so the next milestone is not a release but the
**first push to the public repository** (B2) — and the rule for it is settled: **nothing leaves
in Polish**. Not the sandbox, not a comment, not a fixture value. So B2 waits on the rest of H
(H9, H10), on the **repository limb of B8** — because „nothing is left" is a measurement,
not a declaration, this file's own [definition of done](#definition-of-done) — and on **B9**,
the clear-out of what a public repository should never have carried. H1 (identifiers),
H2 (the concision criterion, [0017](decisions/0017-one-home-per-fact.md)), H3 (the title page),
H4 (`docs/`), H5 (`libs`), H6 (test names), H7 (the fifteen gate scripts), H8 (the contracts
they read) and H11 (what a diacritics scan cannot see) are done, and `LICENSE` has a gate on both sides of `npm pack` (B1). Of B, the
package README (B3) and B4 stand between here and npm.
**Outside `apps/` both limbs are now empty** — H11 closed the 84 files a dictionary scan found
where a function-word probe had counted 32, the JSDoc example that shipped in `types/*.d.ts`
among them. Under `apps/` **52 of the 117** files are left, and that is H10.
In parallel: F1 is unblocked (A3 and A4 gave it both inventories to render), and C is filler.

H is not a separate phase, and it no longer has two deadlines. The old split — `README.md`,
`docs/` and Actions at B2, the package at npm — held while the rule was „the public surface may
not be Polish". The rule of 2026-08-14 is wider, so what travels inside the package (B3, B4)
binds **no later than the push**, and B8 moves in front of it. The two hard ordering conditions
inside H are spent: **H1 before everything**, because any text written earlier is written twice,
and **H2 before H3–H8**, because translating prose you are about to shorten is paid for twice.

## A. Phase 0 — gates „right away"

**Closed 2026-08-06.** Thirteen tasks, twenty closed gaps, thirteen gates with a negative
control. Nothing here is waiting any more.

- [x] **A1 — negative control for `check-package`** _(2026-08-04)_
  - closed: `req-quality-package`, `req-project-package`, `req-project-entrypoints`,
    `req-project-tokens-lib`, `req-token-css`, `req-token-distribution` — **6 gaps** — plus
    `req-release-ng-add` (**B5**) and the control for `req-release-metadata`: the same points
    of the same gate, so their fixtures came with the same move
  - built: `tools/check-package.fixtures/` — a reference package and seven cases assembled
    **on a copy of it**, so a case directory carries nothing but its own defect;
    `check-package.mjs` split into checks returning an identifier, so a run proves **which
    point** rejected the case rather than merely that something did
  - control: failure proved four independent ways — point 3 disarmed in the gate, a case that
    stops being faulty, a case firing on someone else's point, a faulty reference package
  - cost: ~1 day · journal 2026-08-04 · [`lesson-44`](lessons.md#lesson-44)

- [x] **A2 — coverage with an enforced threshold** _(2026-08-04)_
  - closed: `req-quality-coverage` — the oldest debt in the project
  - built: `coverage` + `coverageInclude` + an 80% threshold in target `test`, and on top of
    that a **second gate**, `tools/check-coverage.mjs` (target `check-coverage`, in CI), plus
    `libs/components/src/public-api.spec.ts`. The plan said „`coverageInclude` + threshold"
    and that was not enough: a threshold watches the number, and what breaks is the
    **denominator** — deleting `number.spec.ts` **raised** coverage from 96.55% to 96.94%
  - control: `tools/check-coverage.fixtures/` — seven inputs, one per way of disarming the
    gate, each rejected on its own point; plus two runs on the repository (removing
    `public-api.spec.ts` leaves `test` green and fires `check-coverage`; removing two specs
    gives 64.96% and fires both thresholds)
  - cost: ~1 day (plan: 0.5) · journal 2026-08-04 · [`lesson-45`](lessons.md#lesson-45)

- [x] **A3 — `data-pct-part` inventory + gate** _(2026-08-05)_
  - closed: `req-api-parts`
  - built: `tools/check-parts.mjs` (target `check-parts` in the root project,
    `dependsOn: components:build`, in CI) — five points plus the generated
    `libs/components/parts.snapshot.md` (41 parts, 10 classes, 5 entrypoints). Three points
    are rules, **two guard the denominator**: the list is built **twice**, from the sources and
    from the built package through JIT, because four chrome parts stand in no template at all —
    only in directive `host` blocks. Point 4 (a card's **Parts** table against what the
    entrypoint ships) fired at once: `field.md` listed 11 parts out of fifteen
  - control: 21 inputs, each rejected on its own point; plus six runs on the real repository;
    every point disarmed in turn. `options` in `PctRadioGroup` deliberately left alone → **C7**
  - cost: ~1 day · journal 2026-08-05 · [`lesson-50`](lessons.md#lesson-50)

- [x] **A4 — snapshot of token names** _(2026-08-05)_
  - closed: `req-token-names`
  - built: `tools/check-tokens.mjs` (target `check-tokens` in the root project,
    `dependsOn: tokens:build`, in CI) — five points: two rules (a name parses against
    `libs/tokens/src/names.policy.json`; the snapshot matches the current list) and **three
    guarding the denominator**, among them two independent readings of the name list
  - **a snapshot laid before normalisation would have frozen the drift**: 34 tokens had their
    segments in reverse order, so every later rename would have been a breaking change — hence
    normalisation with the same move, 108 substitutions in 16 files
  - control: eleven inputs, each on its own point; five runs on the real repository; every
    point disarmed in turn. Private ramp prefixes moved into the policy → open question **C6**
  - cost: ~1 day (plan: 0.5) · journal 2026-08-05 · [`lesson-49`](lessons.md#lesson-49)

- [x] **A5 — style gate: logical properties + no `opacity` on text** _(2026-08-05)_
  - closed: `req-token-logical`, `req-token-no-opacity` — **2 gaps**
  - built: `tools/check-styles.mjs` (target `check-styles` in `components`, in CI) — six
    points: two rules (physical properties on the inline axis; `opacity` other than `0`/`1`)
    and **four guarding the denominator**. An exception needs a `/* pct-exception <property>:
<reason> */` marker **adjacent** to the declaration; the repo has four. A script beat
    stylelint, which reports on the files it is handed and says nothing about the rest
  - plus, as planned: the **`dir` axis** in `SbxSettings`, 9 RTL visual patterns, an axe audit
    of every view in RTL and `rtl.spec.ts` — and the axis found a defect at once: the select
    panel lives in a CDK overlay and inherits no direction from the control
  - control: twelve inputs, each on its own point; six repository runs; `rtl.spec.ts` reverted
  - cost: ~1.5 days · journal 2026-08-05 · [`lesson-48`](lessons.md#lesson-48)

- [x] **A6 — zoneless + OnPush gate** _(2026-08-04)_
  - closed: `req-project-angular`, `req-api-foundation` — **2 gaps**
  - built: `tools/check-zoneless.mjs` (target `check-zoneless`, `dependsOn: build` +
    `schematics`, in CI) — six points in one run. Zoneless: manifests from the git index, the
    `package-lock.json` tree and a runtime trace in the built package, each trace named one by
    one. Foundation: `ɵcmp.onPush` and `ɵcmp.standalone` measured, the denominator, and no
    repetition of default values in the decorator
  - `ɵcmp` is read from `dist` through JIT, not from the sources: a partial declaration
    **omits** `changeDetection` when it is the default, so the value exists only after
    linking — which also means an Angular bump changing that default fires this gate
  - control: twelve inputs, each on its own point; four runs on the real repository
  - cost: ~0.5 day · journal 2026-08-04 · [`lesson-46`](lessons.md#lesson-46)

- [x] **A7 — gate on `typecheck` coverage** _(2026-08-05)_
  - closed: `req-quality-typecheck`
  - built: `tools/check-typecheck.mjs` (target `check-typecheck` in the root project, in CI) —
    four points, plus the **missing targets**: `components` (three disjoint programs), the
    root project (`vitest.config.ts`, `vitest.workspace.ts`) and an overridden `sandbox`.
    `tokens` deliberately without one — it has no TS file
  - the plan said „a project without a `typecheck` target fires" and that was not enough:
    `sandbox` **had** one, passed, and looked at none of its four spec files. Hence point 4 —
    the gate does not read `include`, it **runs the target's command** with `--listFilesOnly`
    and compares the compiler program against the git index
  - control: eleven inputs, each on its own point; four runs on the real repository
  - cost: ~0.5 day · journal 2026-08-05 · [`lesson-47`](lessons.md#lesson-47)

- [x] **A8 — tree-shaking + entrypoint size budget** _(2026-08-05)_
  - closed: `req-project-tree-shaking`
  - built: `tools/check-bundle.mjs` (target `check-bundle` in `components`, `dependsOn: build`,
    in CI) — ten points plus the generated `libs/components/size.snapshot.md` (7 entrypoints,
    114 766 B). The core is two: which entrypoints an import of one drags in (5) and which
    external dependencies come with them (7) — `@angular/cdk/overlay` only in `./select`
  - the plan's assertion („no `PctField` in a `button` bundle") proves nothing on its own — a
    probe the bundler emptied contains no `PctField` either. Probes reach the package through
    `node_modules` and the `exports` map, never through an `alias` that would be green anyway
  - control: 22 inputs on a **fake** library; seven runs on the real repository; **all ten**
    points disarmed in turn
  - cost: ~1 day · journal 2026-08-05 · [`lesson-51`](lessons.md#lesson-51)

- [x] **A9 — consumer test on Verdaccio** _(2026-08-06)_
  - closed: `req-quality-consumer`, and in passing a second gate for `req-release-ng-add`
  - built: `tools/check-consumer.mjs` (target `check-consumer` in `components`,
    `dependsOn: build` + `schematics`, in CI) — seven points, 28 rules, ~26 s. The consumer's
    whole road: `npm pack` → publish to Verdaccio → `npm install` **by name** → `ng add` →
    an SSR build → the server → one browser run
  - it found a defect on its first run and not where the plan was looking: `ng add
@pacit/components` died on `exports is not defined in ES module scope`, with
    `check-package` seeing a complete collection. Deliberately **without installing
    `peerDependencies` from the registry** — a peer range drift waits for **B7**
  - control: 28 inputs, each on its own **rule**; seven repository runs; all 28 rules disarmed
  - cost: ~1 day (plan: 1–2) · journal 2026-08-06 · [`lesson-55`](lessons.md#lesson-55)

- [x] **A10 — browser matrix** _(2026-08-06)_
  - closed: `req-quality-browsers`
  - built: three projects in `playwright.config.mts` (chromium, firefox, webkit) — **458 tests per
    run, 5.5 min** — plus `tools/check-browsers.mjs` (target `check-browsers`, in CI): six points,
    26 rules, the register `apps/sandbox-e2e/browsers.policy.json`, three engines in CI install
  - „add webkit and firefox" has no symptom — Playwright exits zero after three projects as after
    one, and after **zero** tests — so the gate asks `--list` what the engines **actually** collect
  - firefox passed 146 functional tests first time, webkit 144: it reports `forced-colors: active`
    and **does not substitute author colours**. Two exclusion kinds, `record` and `measurement` → **C8**
  - control: 25 inputs, each on its own rule; nine repository runs; **all 26 rules** disarmed in
    turn — the 26th has no symptom when disarmed, which is the whole truth about it
  - cost: ~1 day (plan: 0.5) · journal 2026-08-06 · [`lesson-56`](lessons.md#lesson-56)

- [x] **A11 — text gate** _(2026-08-06)_
  - closed: `req-api-texts`, and with it **C5** — the reactivity of `PCT_TEXTS` is a decision
    from now on ([0014](decisions/0014-texts-as-signal.md)), not an oversight
  - built: `tools/check-texts.mjs` (target `check-texts` in `components`, `dependsOn: build`,
    in CI) — six points, 30 rules: three carry rules (a string in a text node or a speaking
    attribute; prose in a signal's default value; dev warnings outside the channel), **three
    guard the denominator**. A template is read with `parseTemplate`; ICU is **forbidden**
  - **the second half of the channel is in TypeScript and the plan did not see it**:
    `input<string>(this.texts.selectPlaceholder)` is computed once, at construction — so an app
    switching language kept the old string, with CI green
  - control: 29 inputs, each on its own **rule**; nine repository runs; all 29 rules disarmed
  - cost: ~1.5 days (plan: 0.5) · journal 2026-08-06 · [`lesson-54`](lessons.md#lesson-54)

- [x] **A12 — text/background pair completeness + token tiers** _(2026-08-05)_
  - closed: `req-token-text-pairs`, `req-token-tiers` — **2 gaps**
  - built: points **6 and 7** in `tools/check-tokens.mjs` (same target, same negative control,
    because both promises stand on the same denominator as the names): a „downwards only"
    reference graph with `libs/tokens/src/levels.policy.json`, and „every painted colour has a
    pair" plus the `on-*` rule. Plus `regula` in `fixture.json` ([`lesson-50`](lessons.md#lesson-50))
  - the plan's denominator was wrong: names (`*-bg`) cannot see the outline button painting
    `var(--pct-surface-100)` under `var(--pct-primary)`, so point 7 reads the **sass output**.
    **The policy was silent about 27 colours out of 74** — three of them below AA in the dark
    theme, for months, with CI green
  - control: fifteen inputs, each on its own point **and rule**; eight runs; 14 of 15 disarmed
  - cost: ~1.5 days (plan: 0.5) · journal 2026-08-05 · [`lesson-52`](lessons.md#lesson-52)

- [x] **A13 — mutation testing of the core** _(2026-08-06)_
  - closed: `req-quality-unit` — the last gap of phase A
  - built: target `mutation` (Stryker 9.6 on `core`, `field/number.ts`, `select/select.ts`,
    `thresholds.break` = 80, ~6 min) plus `tools/check-mutation.mjs` (target `check-mutation`,
    `dependsOn: mutation`, in CI) — seven points, 37 rules — with `mutation.policy.json` and the
    generated `mutation.snapshot.md`
  - **the first measurement was the whole justification: at 96.62% line coverage the mutation
    score was 63.54%.** Closing it to 81.77% cost **38 new tests**; the gate reads the
    configuration **as it took effect, from the report**, since a threshold has five silent ways up
  - control: 37 inputs on a **fake** library, each on its own rule; four runs; all 37 disarmed
  - cost: ~1.5 days (plan: 1–2) · journal 2026-08-06 · [`lesson-57`](lessons.md#lesson-57),
    [`lesson-58`](lessons.md#lesson-58), [`lesson-59`](lessons.md#lesson-59)

## B. Readiness for the first release

Can run in parallel with A. Binds at the first publication — and then all of it at once, with
**B9** and B8's repository limb one step earlier, at the push.

Three of the nine tasks (**B3**, **B4**, **B8**) are about language. Only the part of it that
**cannot be released in Polish** stands here: text that travels inside the package. The rest of
the repository moves to English in [section H](#h-one-language-for-the-repository) — it does not
block publication and is an order of magnitude larger.

- [x] **B1 — `LICENSE` in the repository** _(2026-08-06)_
  - strengthened: `req-release-metadata` — state unchanged (✅), the measurement caught up
  - built: `LICENSE` (MIT, `Copyright (c) 2026 PacIT - Marek Pac`) at the root and in
    `libs/components/`, `author` in the manifest, and [decision
    0015](decisions/0015-license-and-model.md): **MIT everywhere, no CLA, no dual licensing**
  - **the plan said „minutes" and that was half the truth**: the requirement already promised
    the file while point 6 measured manifest fields only. Two measurements now — the `licencja`
    check in `check-package` (file, non-empty, name matching `license`, a copyright line) and
    the `brak-licencji` rule in `check-consumer`, on the far side of `npm pack`
  - control: two fixtures in `check-package.fixtures/`, one in `check-consumer.fixtures/`,
    three runs on the real package, the `licencja` check disarmed
  - cost: ~0.5 day (plan: minutes) · journal 2026-08-06

- [ ] **B2 — remote repository + `repository` in the manifest**
  - concerns: `req-release-metadata` — the gate and its control exist (A1), so the registry
    says ✅; what is missing is **the field itself**, and day to day the gate only warns
  - **the field has been there since 2026-08-07** and points at `github.com/pacit/components`.
    The `pacit` organisation exists on GitHub and on npm (scope `@pacit`, owner `markovy`);
    the repository itself does not yet
  - `git remote -v` is still **empty**, deliberately: the first push is a premiere and the
    history is squashed before it, so a remote added early is an invitation to an accidental
    `git push`. Until then npm refuses provenance and `check-package.mjs --release` blocks
    the release
  - **the task itself is minutes, but it stopped being first.** The repository is public
    **from the first push** (decision of 2026-08-06 — no private stage), so `README.md`,
    `docs/` and the step names in Actions become **the product** at that second
  - hence the ordering condition **H1 → H3 → H4 → B2**, satisfied for everything the first
    visitor sees. The price of that order is written down plainly — until the first push there
    is no remote CI, no provenance and no copy off this machine
  - **and on 2026-08-14 the condition grew**: nothing leaves in Polish, so **H9 and H10** stand
    before the push and **B8's repository limb is what proves it**. H11 closed its half the same
    day — the scan that reported four layers clean saw neither „nie biegnie" nor `'Wybierz…'`
  - cost: minutes for the task itself · _notes:_ —

- [ ] **B3 — package README in English**
  - concerns: [`req-project-language`](requirements/project.md#req-project-language) — the layer
    that has no right to stand in a register of exceptions
  - **two of the three files closed at H5**: the manifest `description` (the sentence npm shows
    in search results) and the headers of the generated theme artefacts, fixed in
    `libs/tokens/build.mjs` rather than in its output, as this position said they should be
  - what is left is `libs/components/README.md` — still the Nx generator stub („This library
    was generated with Nx", seven lines) and it **travels to `dist`**, so it is the package
    page on npm. Written from scratch rather than translated: the stub has nothing to carry
    over, and it is the first page anybody sees
  - cost: ~0.5 day · _notes:_ —

- [ ] **B4 — citations in the public API as links**
  - concerns: [`req-project-language`](requirements/project.md#req-project-language)
  - **the language half is done** _(2026-08-08, with H5)_: the 24 files of the built package
    that carried Polish — all eight `types/*.d.ts`, seven `fesm2022/*.mjs`, the source maps and
    the manifest — measure **zero** today. Translating the JSDoc apart from the file it stands
    in would have meant opening all 15 sources twice, so it travelled with H5
  - what is left is the second thing in the same place, and it is not about language: the
    public `.d.ts` cite `req-*` and `lesson-*` **31 times** as bare identifiers that lead
    nowhere for a consumer. The answer is **a link, not a deletion** — so this waits on **B2**,
    because the address `@see https://…/docs/requirements/a11y.md#req-a11y-built-in` has to
    resolve before it is worth more than the paragraph it replaces
  - cost: ~0.5 day · _notes:_ —

- [x] **B5 — negative control for `ng add`** _(2026-08-04, with A1)_
  - closed: `req-release-ng-add`
  - built: `tools/check-package.fixtures/schematic-missing/` — the collection points at a factory
    whose compiled file is missing, and point 5 must fire. It came with the same move as A1,
    being a point of the same gate; a separate task was unnecessary from the start

- [ ] **B6 — support policy document**
  - closes: `req-release-support`
  - what: the support window (how many Angular versions back, for how long), the deprecation
    policy (how many minors of warning before removal), and the requirement of a codemod for a
    breaking change — the migration collection exists, but nothing ties `feat!` to an entry in it
  - control: a `feat!:` commit without an entry in the migration collection must fire
  - cost: ~1 day · _notes:_ —

- [ ] **B7 — dependency list gate**
  - closes: `req-project-dependencies`
  - what: a seventh point in `check-package.mjs` — `dependencies` / `peerDependencies` of the
    **packed** manifest against an allowed list. Today nothing tells a deliberate dependency
    apart from one added by reflex
  - control: a manifest with a dependency outside the list must fire
  - cost: ~0.5 day · _notes:_ —

- [ ] **B8 — language gate** — **stands before B2** _(2026-08-14)_
  - closes: [`req-project-language`](requirements/project.md#req-project-language)
  - **without it B3, B4 and the whole of H are a one-off tidy-up.** The language split stood in
    [`docs/README.md`](README.md) with no gate, broken on **both** sides (A2, A5, A12)
  - what: `tools/check-language.mjs` + `tools/language.policy.json`. **Two measurements of
    different reach**: the public surface on the **artefact** (what comes out of `npm pack`,
    not what stands in the source), the rest of the repository on files from the git index
  - **two reaches, one deadline now**: the repository limb runs before the push, being the only
    thing that turns „nothing is left in Polish" into a measurement; the artefact limb still
    binds at the release with B3
  - detection has **two limbs** and H11 settled the second: diacritics carry prose, so the other
    limb is `/usr/share/dict/polish` minus `american-english`, over identifiers split at
    camelCase. **Its false positives are the design work** and they enumerate — acronyms,
    `SCREAMING_CASE`, the abbreviations of the trade, `jest` ([`lesson-60`](lessons.md#lesson-60))
  - the register follows the `browsers.policy.json` idiom from A10: an entry carries its reason
    and the task that removes it, and **a dead entry fires just like new Polish**. It starts
    empty — that is what B3, B4 and H10 are for. Denominator: [`lesson-48`](lessons.md#lesson-48)
  - control: Polish in a file outside the register; an entry pointing at a file **already**
    translated; a Polish `description` **despite** an entry; a scan with an empty file list
  - cost: ~1 day · _notes:_ —

- [ ] **B9 — the repository is tidied before it is published** _(binds at B2)_
  - **what a first visitor must not find**: mappings of an identifier space that never stood in
    public, review findings closed weeks ago, and files whose deletion was nobody's task
  - **old identifiers, 157 lines of them**: the two migration tables in
    [`docs/README.md`](README.md) — [2026-08-06](README.md#id-space-migration-2026-08-06), 93
    rows of `wym-`/`lekcja-`, and 2026-07-27, the numeric space — are **53% of that file** and
    map a space no public reader can ever observe, the history being squashed. They go; the
    `LEGACY` guard in `check-docs.mjs` stays, because it is what stops the space coming back
  - they are not its only citations: **55 in `review.md`, 2 in `overview.md`**, silent because
    all three files sit in `CITATION_EXEMPT`. So the cleanup ends when **that set is empty but
    for the generated registry** — which makes this a gate rather than a tidy-up
  - **`review.md` (576 lines) is an inbound document, not a plan**: §5.6 closed with B1, §5.7
    with A2 and A13, §5.2 with C5, and §3.E is the whole of H. What is still open stands in
    section C here. Keep the verdict and the axis (§9), retire the rest
  - with the same eye: `.opencode/skills/` and `.github/skills/` are **byte-identical copies**
    of a vendored Nx guide (18 files each); this file is 1 436 lines, 175 of them a closed phase
    A and 686 the journal; and section C's „verified 2026-08-03" wants one re-read before it
  - control: `check-docs` green with `CITATION_EXEMPT` empty, and no tracked file that no other
    file mentions
  - cost: ~1 day · _notes:_ —

## C. Open findings from the review

Verified in the code **2026-08-03** — all still current. Small, good filler between the bigger
items. Full context: [`review.md`](review.md) §5.

- [ ] **C1 — `pct-select` without the field chrome is an unnamed combobox**
  - `aria-label` lands on the `<pct-select>` host, which has no role; `role="combobox"` sits on
    the inner `<button>`. A consumer has no way to fix this
  - needed: explicit `ariaLabel` / `ariaLabelledby` inputs forwarded to the element that has the
    role — a rule for every future component whose role does not sit on the host
  - a real a11y gap, not cosmetics · _notes:_ —

- [ ] **C2 — `track option.value` with a generic `T`**
  - `libs/components/select/src/select.html` — for a non-primitive `T` this tracks by reference,
    and two options with the same value give NG0955 in dev mode. Either `track $index`, or a
    documented uniqueness requirement with a warning under `isDevMode()` · _notes:_ —

- [ ] **C3 — `PctField.attach()` overwrites silently**
  - `libs/components/field/src/field.ts` — a second control in one field chrome wins without a
    word. A classic silent defect, cheap to close: `console.warn` under `isDevMode()`
    · _notes:_ —

- [ ] **C4 — `_tokens.scss`: generated, shipped in the package, used by zero lines**
  - concerns: `req-token-scss` — component stylesheets contain no `@use` at all; every reference
    is a raw `var(--pct-*)`
  - decision: either make it the mandatory road to a token (a typo becomes a compile error — the
    spirit of [`lesson-43`](lessons.md#lesson-43)), or drop it from the requirement and from the
    package. Today it is a dead artefact in a published package · _notes:_ —

- [ ] **C6 — primitives in the public `PctCssVar` union: two ramps private, the third not**
  - `libs/tokens/src/names.policy.json` declares `pct.blue.` and `pct.slate.` private and
    `pct.red.` not — so a consumer sees `--pct-red-600` in the type and does not see
    `--pct-blue-600`. An inherited drift, moved at A4 from an expression in `build.mjs` into the
    policy, that is **from an invisible place into a visible one**, and left there
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
    `req-api-parts` promises stability and being written down, not guessability. Left alone at
    A3 deliberately, the same move as C6 at A4 — with the difference that since A3 a rename is
    a visible change to the public API (the snapshot), not a quiet fix
  - cost: minutes for the change (`options` → `group-options`, nobody uses it in tests or in the
    sandbox), the decision is the whole task · _notes:_ —

- [ ] **C8 — forced-colors rules lose on specificity to the base rules**
      _(found 2026-08-06 during A10)_
  - `libs/components/button/src/button.scss` — `:host([disabled])` inside
    `@media (forced-colors: active)` has specificity (0,2,0) while the base rule
    `:host([disabled]:not([data-pct-loading]))` has (0,3,0). A media query adds no specificity,
    so `color: GrayText` **does not win**. To be checked in the other five stylesheets with a
    forced-colors block (`checkbox`, `radio`, `select`, `field`, `text`)
  - **no symptom today**: chromium and firefox repaint the result with the user's palette
    whichever rule won, so the measurement comes out correct. It is visible only in webkit,
    which does no substitution ([`lesson-56`](lessons.md#lesson-56)), and it will be visible
    everywhere from the day any part of the library gets `forced-color-adjust: none`
  - this is a declaration without coverage, the same family as the dead `--pct-on-danger` from
    A12: code that looks like it handles a case and does not
  - cost: ~0.5 day including measuring whether it can be written as a `check-styles` rule
    · _notes:_ —

- [x] **C5 — `PCT_TEXTS` will not survive a language change at runtime** _(2026-08-06, with A11)_
  - settled as [0014](decisions/0014-texts-as-signal.md): the token carries `Signal<PctTexts>`
    and a string is read **at render time**. `providePctTexts` also accepts a signal, so a
    language switch passes `computed(() => DICTIONARIES[language()])`
  - the first of three options won rather than the defensive third, because the price is payable
    **only now**: `inject(PCT_TEXTS)` changes type, so after the first release this would be a
    major with a codemod. A factory (option two) is not enough — DI resolves a provider once.
    `placeholder` lost its default (`input<string>()`) and gained a `computed()`, while
    **`placeholder=""` stays an empty placeholder** — absent and empty mean different things
  - control: a runtime language change reaches the strings; without the fix the test fails on
    `expected 'Select…' to be 'Wybierz…'`, and `check-texts` guards the rule, because knowing it
    was not enough once ([`lesson-54`](lessons.md#lesson-54))

## D. Phase 1 — the behaviour layer in `core`

The largest architectural risk. The list machinery (typeahead, `activeIndex`, skipping disabled
options) sits today as private methods in `PctSelect`, and autocomplete, multiselect, menu,
combobox and a command palette all need it. **Extract before the second consumer, not after** —
otherwise [`lesson-21`](lessons.md#lesson-21) (the same logic copied into four controls) repeats
on a much bigger piece.

Guiding principle: **mechanics from CDK, our own API** — CDK types never leak into the public
contract. The pattern is ready: `PCT_FIELD` is exactly that for the field chrome and its control.

- [ ] **D1 — list navigation** → extract from `PctSelect` into `core` · _notes:_ —
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
- [ ] **E2 — tooltip + popover** — the „describes vs names" distinction, hover/focus/touch
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
      **generated** inventories of parts and tokens (from A3 and A4), not hand-written ones
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

## H. One language for the repository

Goal: **the whole repository in English and without filler** — documentation, code, comments,
test names, gate messages and **identifiers**. No split into „working" and „public": that split
existed from the beginning, had no gate and was kept on neither side. Two promises, two gates:
[`req-project-language`](requirements/project.md#req-project-language) → **B8**,
[`req-project-concise`](requirements/project.md#req-project-concise) → a budget laid **after**
the compression pass (H2).

Settled 2026-08-06, not to be reopened:

- **identifiers move with everything else** — `wym-` was short for „wymaganie", and an English
  repository with Polish IDs is exactly the drift this file polices everywhere else. The
  [rename table](README.md#id-space-migration-2026-08-06) is approved;
- **compression travels with the translation**, not after it — and its target is `tools/`
  (~595 lines of headers), not JSDoc and not the documentation. The instrument is **a link
  instead of a repetition**, possible only because the documentation stands in public;
- **the repository is public from the first push**, with no private stage, and the history is
  squashed before it — 49 Polish commits never leave. The push is a premiere, so H1, H3 and H4
  stand **before** B2.

Settled 2026-08-14, and it widens all three: **the first push carries no Polish at all** — not
the sandbox, not a comment, not a fixture value, not a stale citation of a renamed rule. There
is no „this part is only working material" tier left, and the register of exceptions starts its
public life **empty**. That collapses H's two deadlines into one and hands B8 a job it did not
have before: proving it, in front of B2 rather than at the release.

**The repository is to stand publicly on GitHub, so the documentation is a product, not a back
office.** That reordered the middle of H: the two most-read files of a public repository —
`README.md` and `docs/README.md` — were entirely in Polish, and the first of them **was not
counted in any layer of the previous version of this plan**. So H3–H6 follow **reader traffic**
rather than cost: title page → documentation → sources → tools.

There are two binding moments and **the earlier one is wider**: the first push (B2) covers
`README`, `docs/` and Actions; the package release (B3, B4, B8) covers only what goes into
`npm pack`. Outside both stands **H1**, which binds to nothing external but gets pricier with
every sentence written.

Measured 2026-08-06 (`git ls-files` + a diacritics scan), refreshed 2026-08-08. **The rows
marked done were measured with the diacritics limb only** — what the second limb finds in them
is the last row, and it is H11, not a new layer:

| layer                               | volume                                                                       | binds at                 |
| ----------------------------------- | ---------------------------------------------------------------------------- | ------------------------ |
| package public surface              | done — **H5** (24 files in `dist` → **0**; the README is B3)                 | release (B3)             |
| `README.md`, `AGENTS.md`, workflows | done — **H3** (11 files, 5 903 → 4 884 words)                                | first push               |
| `docs/` documentation               | done — **H4** (40 files)                                                     | first push               |
| identifiers and their citations     | done — **H1** (82 + 59 names, 2 571 citations in 175 files)                  | —                        |
| `libs` sources                      | done — **H5** (30 files, plus 14 config and token files)                     | —                        |
| test names                          | done — **H6** (27 spec files, 26 baselines renamed)                          | —                        |
| `apps/` sandbox demo                | **52 of 117 files** — **H10**, decision made: it goes English                | first push               |
| tools and gates                     | done — **H7** (15 scripts; headers 609 → **249**, budget 251)                | —                        |
| proper names in contracts           | done — **H8** (1 target, 5 policies/snapshots, 252 fixture cases, 9 READMEs) | —                        |
| commit history                      | 49 commits — **H9**                                                          | squashed before the push |
| Polish without diacritics           | done — **H11** (84 files outside `apps/`, measured against a dictionary)     | first push               |

- [x] **H1 — the identifier and documentation-name space** _(2026-08-06)_
  - done: **83 requirement identifiers**, **59 lessons** (`lekcja-N` → `lesson-N`) and **2 571
    citations in 175 files**, plus 24 file and directory names, mapped in
    [the migration table](README.md#id-space-migration-2026-08-06); `check-docs.mjs` moved to the
    new space and **rejects the old one**, beside the numeric space from 2026-07-27
  - **the plan said „mechanical" and that was half the truth** — three consequences it did not
    foresee were found by the gate, not by review: `req-ids.ts` started to look like a citation of
    itself (renamed to `doc-ids.ts`), the substitution **rewrote the left column of the migration
    table**, and fixing `docs/komponenty` in `check-parts.mjs` fired that gate, because five of
    its fixtures carry **their own copy** of that directory
  - control: three repository runs, plus green `typecheck`, `check-parts` and the sandbox tests
  - cost: ~0.5 day (plan: ~1) · journal 2026-08-06

- [x] **H2 — the concision criterion and its budget** _(2026-08-07)_
  - settled: [0017](decisions/0017-one-home-per-fact.md) — one home per fact, a budget per
    layer: gate header 12 lines + 1 per point, journal entry 25, task position 12 closed /
    20 open, JSDoc no limit (`@example` outside the budget entirely)
  - the measurement moved into the repository: `tools/measure-prose.mjs`, with no target — the
    gate (`req-project-concise`) comes after the compression pass and is laid on its result
  - the plan offered two numbers and the measurement forced a third: task positions are 969
    lines, and a closed position repeats up to 26.6% of its six-word sequences from its own
    journal entry (A10)
  - found in passing: the registry's reverse index reported **59 lessons out of 59** as
    uncited — the generator was asking about the pre-H1 prefix; after the fix it is six
  - cost: ~0.5 day (plan: hours) · journal 2026-08-07

- [x] **H3 — the repository title page** _(2026-08-07)_
  - done: `README.md` in English (the examples stay — they are meant to be pasted), `AGENTS.md`
    and `CLAUDE.md`, both workflows (the name **Release**, the steps, the inputs) and six root
    configuration files
  - **the scope came out three times bigger than the plan counted**: it counted „names in
    Actions", and `ci.yml` had 121 Polish lines out of 177 — including one 120-line comment
    summarising thirteen gates. Plus the CHANGELOG section titles, which no other H task covered
  - measurement: 5 903 → 4 884 words in 11 files (−17%), `ci.yml` alone 1 639 → 384 (−77%); the
    README stands still (1 665 → 1 694), English being longer by as much as five paragraphs
    replaced by links took away
  - control: green `check-docs`, `check-browsers` and `check-typecheck`; the root scan is empty
  - cost: ~0.5 day · journal 2026-08-07

- [x] **H4 — the `docs/` documentation** — **40 files** _(2026-08-07)_
  - done: all 40 files in English and compressed to the
    [0017](decisions/0017-one-home-per-fact.md) budget — `README.md`, `00-axis.md`, `overview.md`,
    [`requirements/`](requirements/), [`decisions/`](decisions/), [`components/`](components/),
    [`lessons.md`](lessons.md), the [registry](registry.md), this file and [`review.md`](review.md)
  - **a requirement's vocabulary is a contract, not prose** and moved with the content:
    `Obietnica/Bramka/Kontrola/Wiąże przy` → `Promise/Gate/Control/Binds at`, which meant the
    parser, the classifier and the generator in `check-docs.mjs`, its four fixtures, and the
    `Części` → `Parts` table read by `check-parts` — carried in its own copy by five of its cases
  - left for **H6**: seven citations of Polish test names pointing at an `it()` that exists.
    Heading anchors have no gate and drift silently — four found, one older than this session
  - cost: ~2 days for 40 files (plan: 3–5) · journal 2026-08-07 (two entries)

- [x] **H5 — `libs` sources outside the public API** _(2026-08-08)_
  - done: 30 non-spec `.ts`/`.scss`/`.html` files with the public JSDoc standing in them, plus
    the layer the scope line hid — `project.json`, nine DTCG token files, `eslint.config.mjs`,
    `mutation.vitest.config.mts` and two tsconfigs (44 files, ~2 800 words of prose)
  - closes **B4's language half**: the built package went from 24 files carrying Polish to
    **zero**. Two of them were generated, so those fixes went into `libs/tokens/build.mjs` and
    `stamp-version.mjs`, never into their output
  - control: `typecheck`, `lint`, `test`, `format:check` and ten gates green; mutation score
    unchanged at 81.77%, bundle 114 766 → 114 610 B, inside the tolerance
  - left for **H6**: the nine spec files, whose comments and `it()` names are one read
  - cost: ~1 day · journal 2026-08-08 · found **H10**

- [x] **H6 — test names** _(2026-08-08)_
  - done: 196 `it()` in nine `libs` specs and every `test()` in eighteen e2e specs, with their
    comments, their fixture data and the three `src/support/` helpers the specs quote
  - **the 26 visual baselines belonged here, not to H10**: `przycisk-warianty` is a test name
    first and a `.png` second, so the rename was `git mv` plus the table, bytes untouched
  - couplings: the seven **Control** citations (`check-docs` reads the path, never the sentence
    after `›`), `hydration.spec.ts` asserting on what `visit()` throws, and fixture values with
    a length — `dwanaście!!!` is twelve characters and the counter asserts `12/120`
  - control: 196 unit tests and every non-visual e2e test green on three engines, eleven gates
    green, bundle unchanged; the 26 chromium screenshot diffs are **older than this change**
  - cost: ~1 day · journal 2026-08-08 · left `apps/` a decision, not a translation (H10)

- [x] **H7 — gate headers and messages** _(2026-08-13)_
  - done: **15 scripts** in English — headers, comments and every message a gate prints.
    Headers **609 → 249 lines against a budget of 251**, so `measure-prose --over` prints
    nothing for the first time; the remedy was H2's, a link instead of a repetition
  - with them the 65 `name` values of `contrast.policy.json` (the a11y gate prints each one,
    per theme, so they are messages) and four generated snapshots plus four fixture copies,
    which follow their renderer. `size.snapshot.md` kept its recorded numbers by hand
  - control: twelve gates green, `nx format:check` clean, `check-bundle` with its three real
    `@angular/build` probes and `check-consumer` end to end
  - cost: ~1 day · journal 2026-08-13 · found the fixture prose and left it to H8

- [x] **H8 — proper names in contracts** _(2026-08-14)_
  - done: the target `mutacja` → **`mutation`**, five snapshots and policies, **252 fixture
    cases** across thirteen gates with their prose, nine `*.fixtures/README.md`, the
    vocabulary of four policy files, the `pct-exception` marker and every script-local name
    in fifteen scripts. Outside `apps/` the diacritics scan is empty
  - **a rename is a contract on both sides or it is a broken gate**: a case declares
    `check` + `rule` and the script throws them, so each gate moved in one commit — script,
    fixtures, snapshots and the **Control** citations `check-docs` found by itself. Four
    renames the gates caught and review would not have (journal 2026-08-14)
  - control: twelve gates plus `check-package` green in one pass, `check-consumer` end to
    end, `lint` and `format:check` clean; bundle 114 610 B and mutation 81.77% unchanged
  - cost: ~1 day (plan: ~1.5) · journal 2026-08-14

- [ ] **H9 — commit convention**
  - titles and bodies in English, scopes (`feat(tokens)!:`) unchanged
  - **49 Polish commits will never go outside**: the history is squashed before the first push
    to upstream (decision of 2026-08-06). So there is no dated boundary and no public trace —
    the first commit of the public repository is in English
  - a small consequence for the release, worth checking once: the version comes from
    conventional commits, so after the squash the history starts from a single entry — the
    first release goes with `--first-release` anyway, but the CHANGELOG will start from that
    commit
  - cost: minutes · _notes:_ —

- [ ] **H10 — the `apps/` sandbox demo** _(H6 took the e2e half)_
  - what is left: **52 of the 117 files under `apps/`** — 46 the diacritics scan sees, 6 only
    the second limb — plus `playwright.config.mts` and the e2e `project.json`. The specs, the
    `src/support/` helpers and the 26 baselines went with H6; their prose did not all follow
  - **the decision is made: the demo goes English** _(2026-08-14)_. It was the one place where
    Polish was load-bearing — `app.config.ts` is the only live use of `providePctTexts` and of
    a non-English `LOCALE_ID`, and `select.spec.ts` follows that chain through SSR and hydration
  - **so the proof changes language, not homes**:
    [`req-api-texts`](requirements/api.md#req-api-texts) needs a locale that is **not English**,
    and never needed one that is Polish. `fr-FR` keeps every assertion that mattered — the
    decimal comma the number field formats by `LOCALE_ID` is the same there — and the texts
    channel keeps a live consumer instead of a smaller, deliberate demonstration elsewhere
  - couplings: the e2e specs cite the UI strings they read (`hasText: 'Polska'` and its kin, 15
    places), so demo and specs move in one commit; the **Control** citations in `quality.md` and
    `tokens.md` named Polish test names that no longer exist — H11 took those
  - cost: ~1 day · _notes:_ the one open sub-choice is the locale; `fr-FR` recommended

- [x] **H11 — the Polish a diacritics scan cannot see** _(2026-08-14)_
  - done: **84 files outside `apps/`** — ten gate scripts, 25 fixture files, seven library
    specs, the tokens generator, the live contrast policy and 26 stale citations
  - **the plan counted 32 because the instrument was hand-written**: a function-word list finds
    prose, not `wartosc` or `przygotujKatalogSond` ([`lesson-60`](lessons.md#lesson-60))
  - **a rename is a contract on both sides, again**: `fabryki` is a fixture key, and the fixture
    `name` values are messages — H7 did the real contrast policy, not its two copies
  - quoted history stays put: the [migration table](README.md#id-space-migration-2026-08-06) and
    `review.md` go at **B9**; the anecdotes keep their identifier
  - control: twelve gates in one pass, `check-consumer` end to end, 196 unit tests; both scan
    limbs empty outside `apps/`
  - cost: ~1 day (plan: ~1) · journal 2026-08-14

## Journal

One entry per session: what moved, what it ended with, what comes next. Newest on top.

### 2026-08-14 — H11: a scan is as wide as its word list, and mine was a third as wide

**H11 is done — 84 files outside `apps/`**: ten gate scripts, 25 fixture files, seven library
specs, the tokens generator, the live contrast policy and 26 stale citations. The diacritics
limb outside `apps/` now reports one file, and it is this one, quoting the Polish it discusses.

**The estimate was 32 and the instrument was the reason.** A hand-written function-word list
finds prose, because function words stand in sentences; it cannot find `wartosc`, `skroc` or
`przygotujKatalogSond`, and identifiers were most of what was left. Swapped for
`/usr/share/dict/polish` folded of diacritics minus `american-english`, over identifiers split
at camelCase, the same index gave **94 files** ([`lesson-60`](lessons.md#lesson-60)). The false
positives are what the plan promised — acronyms, `SCREAMING_CASE`, `repo`/`config`/`proc`, the
words Polish and English share — and a hundred entries settle them. **That register is B8's.**

**Two gates carried Polish in their contracts, not only their locals**: `fabryki` is a key of
`check-consumer.fixtures/_reference.json`, and the `name` values of the fixture contrast
policies are messages the a11y gate prints, per theme. H7 translated the real
`contrast.policy.json` and left its two fixture copies — the miss H8 recorded, one layer down.

**A `perl -pi` run mangled a template literal and the next command caught it**: an interpolated
step number came out empty, because `${…}` means something to the shell too. The renames moved
to a node script reading a JSON map after that, with `node --check` after every file.

Next: **H10** (the sandbox, decision made: English with `fr-FR`), then H9, **B9**’s clear-out
and B8's repository limb. Only then B2.

### 2026-08-14 — the push carries no Polish, and the scan that said so was half a scan

**A rule settled, wider than the plan it landed in**: nothing goes to the first push in Polish
— not the sandbox, not a comment, not a fixture value. H stops having two deadlines and gets
one, B8's repository limb moves in front of **B2**, and the register of exceptions starts its
public life empty.

**Then the rule was measured, which is the whole point of having it.** A function-word probe
over the index — the second limb B8 has promised since A5 — finds Polish in **32 files outside
`apps/`**, every one of them inside a layer this file marks done, and in **52 of the 117** files
under `apps/`, where the diacritics scan had counted 46.

**The most expensive one ships.** The JSDoc of `texts.ts` demonstrates the texts channel with
`selectPlaceholder: 'Wybierz…'`, so it stands in `types/*.d.ts` and on the npm page; the README
repeats it at line 254. „The built package carries no Polish at all" was true of diacritics and
of nothing else — and equally so for H3, H7 and H8.

**Two gates still print Polish and two carry Polish identifiers**: `check-docs` („nie biegnie w
`nx affected -t`"), `check-tokens` (`wpisy`), `check-parts` (`wpisy`, `skroc`). The requirements
cite four names H8 renamed away, `fakt-bez-odniesienia` among them — `check-docs` compares the
path, never the name after `›`, the blind spot H6 recorded and nobody has closed.

**The sandbox decision is made**: English, with the texts channel demonstrated in `fr-FR` — not
English, never Polish, and the decimal comma `req-api-texts` leans on survives the swap.
Next: **H11**, **H10**, then H9, **B9**'s clear-out and B8's repository limb. Only then B2.

### 2026-08-14 — H8: a name a gate compares is a contract on both sides

**H8 is done** — 252 fixture cases across thirteen gates, five snapshots and policies, nine
fixture READMEs and every script-local name in fifteen scripts. Outside `apps/` and the
commit history the diacritics scan is now empty.

**The cost was not the count, it was the coupling.** A case declares `check` + `rule` and
the script throws them; a rename on one side alone leaves a gate that fires on the wrong
point and says so. So each gate went in one commit — script, fixtures, snapshots and the
**Control** citations in `docs/` — and `check-docs` found the last four of those itself.

**Four renames the gates caught and review would not have.** `odwiedz` → `visit` collided
with the `TmplAstRecursiveVisitor` protocol: `visitAll` then calls it for every node
instead of dispatching, three template points stopped firing and the run stayed green.
`package` and `private` are reserved words — those at least throw. And `wzorcowy` (the
baseline engine) wanted the same English word as `_poprawny` (the reference input).

**A generated file is regenerated, not translated.** `check-consumer`'s reference input is
an imprint of a real measurement, and a hand-written copy lost `tarball.manifest` — two
point-1 cases then passed. Five snapshot headers went the same way: the Polish lived in the
renderer, so the fix went there and the files were rewritten, numbers untouched.

Found in passing: five gate messages H7 had left in **diacritic-free Polish** — invisible to
the scan that closed H7, and why the C-phase language gate needs its second limb. Next:
**B2** (the first push); H10 is a decision about the sandbox, H9 minutes before it.

### 2026-08-13 — H7: the gates speak English, and the budget closes at 249 of 251

**H7 is done.** Fifteen scripts — headers, comments, and every message a gate prints in CI.
Headers went **609 → 249 lines** against the budget of 251 from
[0017](decisions/0017-one-home-per-fact.md), so `measure-prose --view --over` prints nothing.

- **The compression cut repetition, not content.** Every header retold a lesson that already
  stands in [`lessons.md`](lessons.md); it now names what the gate measures, lists its points
  and links the lesson. `check-tokens` went 74 → 19 that way and lost no argument.
- **A diacritics scan finds half the Polish.** `check-package.mjs` was written without them,
  so „uruchom" and „brak zbudowanego pakietu" survived the first sweep. A second pass, by
  Polish function words over comments and strings, found leftovers in seven files already
  reported clean — including a `punkt ${fx.punkt}` left by the shared boilerplate pass.
- **Generated files follow their generator; deliberately stale ones must not.** Four
  snapshots were regenerated, but the two stale fixture copies (`check-parts`,
  `check-tokens`) had to be rebuilt by hand as „the current file minus its defect" —
  regenerating them would have deleted the defect they exist for.
- **One rename crossed a contract.** `RAZEM` → `TOTAL` in the mutation snapshot broke the
  fixture composer, which inserts a row above that word. The gate named it precisely („passed
  and was meant not to"), which is the `regula` field from A12 doing its job.
- **The fixture prose is the part nobody counted** — eight READMEs, ~400 lines, invisible to
  `measure-prose.mjs`. Written into H8 now.

Next: **B2** — squash and push. H8 (proper names, now including the fixture prose) and H9
(commit convention) travel with it; H10 still wants a decision before a translation.

### 2026-08-08 — H6: the tests speak English, and `apps/` turns out to be a decision

**H6 is done.** 196 `it()` in `libs`, every `test()` in the e2e project, their comments, their
fixture data and the three helpers in `src/support/` that the specs quote by message.

- **The screenshot names were test names.** The plan filed the 26 Polish baselines under H10,
  beside the sandbox. But `visual.spec.ts` names every test after its own file, so
  `przycisk-warianty` was a test name that happened to end in `.png` — the rename belonged
  here and cost one `git mv` loop, with the bytes untouched.
- **What a test quotes, it binds to.** Three couplings, one uncounted: the seven requirement
  **Control** citations (`check-docs` reads the path, never the sentence after `›`);
  `hydration.spec.ts`, which asserts on the message `visit()` throws, so `support/dom.ts` moved
  with it; and fixture values carrying a length — `dwanaście!!!` is twelve characters.
- **`apps/` is not a translation.** `app.config.ts` states that the sandbox is Polish on
  purpose: it is the only live use of `providePctTexts` and of a non-English `LOCALE_ID`, and
  `select.spec.ts` follows that chain through SSR and hydration. Translating the demo would
  leave `req-api-texts` without a working proof, so **H10 now carries a choice, not a task**.
- **The visual gate fails, and failed before this.** 26 chromium comparisons differ by ~0.01 of
  pixels — the same tests, the same 351 and 331 px, on the stashed tree. Not refreshed on
  purpose: a baseline is rewritten after a deliberate change of appearance, and there was none.

Control: 196 unit tests, every non-visual e2e test on three engines, eleven gates and
`format:check` — green; the bundle unchanged at 114 610 B.

Next: **H7** (gate headers, the compression's main target) or **B2**. H10 wants an answer first.

### 2026-08-08 — H5: the package stopped speaking Polish, and the count was short by two layers

**H5 is done** and with it B4's language half. Registry numbers unchanged (54/16/13) — a
translation, not a measurement.

- **The result that matters sits on the far side of `npm pack`.** Splitting a file's JSDoc from
  the comment three lines below it would have meant opening all 15 sources twice, so both went
  in one pass — and B4's measured scope closed with it.
- **Two of those files were generated**, so the fixes went into `libs/tokens/build.mjs` and
  `stamp-version.mjs`. B3 had predicted the first; the second announced itself, because
  `--check` compares the whole file and the next release run would have reverted a hand edit.
- **The scope line said `.ts`/`.scss`/`.html`, and that is what hid the second layer.** Nx target
  comments and DTCG `$comment` fields are prose by any measure, and no file-type filter was
  going to see them — H3's third layer again, one directory down.
- **`apps/` was in no layer at all**, and that is the more expensive miss: 68 files, uncounted
  since the table was written. It is the demo a visitor opens and the harness the gates cite,
  so it binds at the first push, exactly where H3 and H4 bound. Now **H10**.
- **A slow read finds what a scan cannot.** `// typecheck` said „three programs" while the
  target has run four since A13 — and no gate reads a comment.
- Control: `typecheck`, `lint`, `test`, `format:check` and ten gates green; mutation score
  unchanged at 81.77%. The bundle moved 114 766 → 114 610 B — comments do reach `fesm2022`, and
  the two-sided tolerance absorbed it, so the snapshot stays as it is.

Next: **B2** — squash and push; then **B3 + B8**. **H6** (test names, now counting the e2e half)
is the next language step; **C** is filler.

### 2026-08-07 — H4 closed: the plan is a list again, and 962 lines shorter

**H4 is done — 40 of 40 `docs/` files in English.** Registry numbers unchanged (54/16/13): this
was a translation, not a measurement. This file went 2 199 → 1 254 lines and 21 183 → 13 638 words;
the journal 976 → 531 lines, the task positions 966 → 474.

- **The budget did the cutting, not taste.** The three numbers from
  [0017](decisions/0017-one-home-per-fact.md) turned the pass into arithmetic — every closed
  position to 12 lines, every journal entry to 25, with `node tools/measure-prose.mjs --over` as
  the checklist. What left the file was the second telling of a fact, not the fact.
- **„One home per fact" decided the hard cases by lookup, not by taste.** The 35 dimension-axis
  violations from A12 already stand in `req-token-tiers`, so they left the journal; the `lesson-*`
  citations stayed, because the registry's reverse index counts them (H2). Checked before cutting
  anything: no lesson is cited **only** here, so compression could not orphan one.
- **The measurement charges a section separator to the position above it.** `measure-prose` reads
  a position from its line down to the next position or `##`, so every `---` between sections
  landed inside the last item of that section and read two lines over budget. The rules are gone:
  with an `##` heading opening each section they were decoration distorting the one number that
  says whether this pass is finished.
- **[`review.md`](review.md) is a dated snapshot and stays one** — translated, neither compressed
  nor corrected, including its own recommendation that the working documentation stay in Polish,
  which 2026-08-06 reversed. It grew (405 → 576 lines, 4 645 → 5 490 words) because it is now
  wrapped to the repository width and because English is longer — as the README was in H3.

Next: **B2** — squash the history and push, then **B3 + B4 + B8** as one move; **C** is filler.

### 2026-08-07 — H4: a requirement's vocabulary turned out to be a contract, not prose

**38 of the 40 `docs/` files** in English; `plan.md` and `review.md` left. Registry numbers
unchanged — 54/16/13, because this was a translation, not a measurement, and **that is its
control**: had the parser drifted from the content, the classification would have collapsed.

- **A requirement's fields are read by a machine**, so `Obietnica/Bramka/Kontrola/Wiąże przy`
  could not be translated apart from `check-docs.mjs`. One move took the parser, the state
  classifier, the registry generator and four fixtures — otherwise a faulty case would fire on
  „field missing", that is on somebody else's point ([`lesson-50`](lessons.md#lesson-50)).
- **The same in the second gate, and dearer there:** the `Części` table in the component cards
  is input to `check-parts`, and **five of its cases carry their own copy of `docs/components/`**.
  „The price is in the dispersion, not in the count" from **H8** came true on one name.
- **Nothing guards heading anchors** — `check-docs` resolves `req-*`/`lesson-*` and paths, but
  not the sentence after `#`. An ad-hoc script found four, one of them **standing since H1**:
  `README.md#planowane-przemianowanie-przestrzeni-id` pointed at a heading H1 itself renamed.
- **`docs/README.md` carried a corrupted ID migration table**: a separator with no header and
  rows reading `req-project-*` → `req-project-*`. The same path substitution from H1 that
  rewrote the left column — that entry says the table „was saved by its exemption from citation
  control", and in truth only a fragment of it was. The rest stood there for three days.
- **Test-name citations deliberately left in Polish** (seven in four files): they point at an
  `it()` that exists, and renaming one side without the other is the coupling described in H6.

Next: **the tail of H4** — `plan.md` and `review.md` → **B2**.

### 2026-08-07 — H3: the title page had three times the surface the plan counted

**H3** closed. Registry numbers unchanged — `req-project-language` waits for its gate (**B8**),
and this was a translation, not a measurement.

- **The plan counted „names in Actions" and was off by an order of magnitude.** `ci.yml` had
  121 Polish lines out of 177, one comment taking 120 of them and summarising thirteen gates —
  each the way its own header, its own requirement and its own lesson already do. After
  [0017](decisions/0017-one-home-per-fact.md) seven lines with a link to the registry were left.
- **The scan revealed a third layer no H task covered**: 41 lines of Polish comments in
  `.gitignore`, `.prettierignore`, `nx.json`, `project.json`, `tsconfig.root.json` and
  `eslint.config.mjs` — otherwise they would have landed in the B8 register of exceptions as
  debt rather than as work.
- **The CHANGELOG section titles were in Polish and nobody guarded them.** They are the only
  thing in this batch that reaches a consumer, and the comment beside them justified the choice
  with „the language of the commit history" — the very sentence H9 is about to reverse.
- **The README did not shrink, and that is an honest result**: 1 665 → 1 694 words. English is
  longer than Polish at equal content, and five paragraphs of justification went down to links
  — one cancelled the other.
- code examples stay examples: `Save`, `Search`, `byId`, `cities`. The one Polish string
  deliberately left in the repository is `providePctTexts({ … })` in the translation section —
  there Polish is a **value**, not prose.

Next: **H4** (`docs/`, 40 files, 7 590 lines) → **B2**.

### 2026-08-07 — H2: a budget for three layers, because the measurement found a third

**H2** closed — [0017](decisions/0017-one-home-per-fact.md). Registry numbers unchanged (83
requirements, 13 gaps): `req-project-concise` stays ⛔ until the gate which, by that same
decision, is to be built **after** the compression and on its result.

- **The plan gave two numbers, the measurement forced a third.** The `tools/` headers (595 lines
  in 13 scripts) and the journal entries (896 in 18) were counted; the task positions in this
  file were not, and they are 969 lines, 650 of them in seventeen closed ones. Hence the third
  budget and the split into an open position (a working spec) and a closed one (a record).
- **The repetition is measured, not sensed:** a closed position repeats up to 26.6% of its
  six-word sequences from its own journal entry (A10; A12 19.6%, A13 18.5%, 12.2% across all
  fifteen pairs), and the same finding is often told a third time in the header of the gate it
  produced.
- **The measurement moved into the repository** (`tools/measure-prose.mjs`) and deliberately
  **without a target**: a gate laid before the compression would fail on every file for a week
  and be switched off. That script is what the gate grows from.
- **The registry's reverse index had been lying since H1.** The generator asked about the old
  lesson prefix, so the „lesson → requirements" table showed **59 out of 59** as uncited while 51
  `Lessons` fields stood filled in — green, because the file matched what the generator produces.
  After a one-word fix six are uncited, and only now is that column a safety net for a
  compression that could orphan a lesson.

Next: **H3** (`README.md`, 251 lines) → **H4** (`docs/`, 40 files) → **B2**.

### 2026-08-07 — the licence settled „with what", so the question left was „when"

A session with no item from the list: the tail of B1. Numbers unchanged (83 requirements, 13 gaps).

- **The `repository` field is there** (`git+https://github.com/pacit/components.git`), the
  condition is not: provenance demands agreement with the repository the publication comes from,
  and that repository does not exist yet. `req-release-metadata` says so in „Binds at"; **B2**
  closes it.
- **[0016](decisions/0016-mit-irreversibility.md): MIT works one way, so the build order is a
  decision rather than a preference.** A set released under MIT can grow and cannot shrink, so a
  component whose distribution terms are unsettled does not enter a release. There is no proof
  in the repository and cannot be — the decision stands on outside precedent, and says so.
- **`CONTRIBUTING.md` in English from the start** — inbound equals outbound, no CLA. The first
  file written to section H before H had begun: it came after H1, so a Polish version would have
  been work to rewrite in the same week.
- **`docs/private/` is untracked.** `docs/` is a public surface from the first push, so
  commercial deliberation stands next to it rather than in it. The price is written in
  `.gitignore`: git will not restore that directory after `clean -xdf`.

Fixed in passing, because it misled me about the next step: [Order](#order) listed **B1** as
remaining (it has been `[x]` since 2026-08-06) and omitted **H2**, although two paragraphs below
the same file makes it a hard condition for H3–H8.

Next: **H2** → **H3** → **H4** → **B2**.

### 2026-08-06 — B1: the simplest task in the plan held an unmeasured promise

**B1** done. Numbers unchanged (83 requirements, 13 gaps) — `req-release-metadata` was and is ✅.
What changed is that it now **measures what it promises**. The plan priced this in minutes and
was wrong not about the file but about what would come out beside it.

- **The requirement promised two things and the gate measured one.** „The manifest carries
  `repository`, and the repository — a `LICENSE` file" had stood there from the beginning; point
  6 checked manifest fields only, and the file existed **nowhere**, with the requirement marked
  ✅. The same class as everything phase A found, hidden in the item described as the cheapest.
- **`includes` is unfit for comparing a licence name, and that is a measurement, not a hunch.**
  The MIT text contains „INCLUDING BUT NOT LIMITED TO", and `LIMITED` contains `MIT` as a
  substring — so an Apache-2.0 file under an `MIT` manifest would pass a containment test.
  Matching goes by word boundary.
- **The file has to be measured on both sides of `npm pack`.** `check-package` reads the `dist`
  directory, and between it and the registry stands the `files` field — a file present in the
  directory and absent from the archive is invisible to that gate. Hence a second rule in
  `check-consumer`, the same split as at A9.
- **The CLA was rejected after checking what it buys**
  ([0015](decisions/0015-license-and-model.md)): MIT code may be re-released on other terms —
  including contributions from others — so changing them needs nobody's consent. Written into
  the decision so it is never rediscovered: **MIT on the core is irreversible**, and the only
  protection is the name and being upstream — not the licence.

Next: **H3** (`README.md`) → **H4** (`docs/`) → **B2** (squash the history and push).

### 2026-08-06 — H1: a file name that started to look like a citation of itself

**H1** done. No change to the numbers (83 requirements, 13 gaps) — this was a migration of names,
not of promises: 83 requirement identifiers, 59 lessons, **2 571 citations in 175 files** and 24
file and directory names ([migration table](README.md#id-space-migration-2026-08-06)). The plan
called it **„mechanical"** and that was the one word wrong: the substitution is mechanical, the
consequences are not — and the gate found them, not review.

- **The new prefix started catching its own tool.** After `wym-` → `req-` the citation pattern
  matches the file name `apps/sandbox/src/app/ui/req-ids.ts`, so the gate reported it as a
  dangling citation. Renamed to `doc-ids.ts`, which is truer anyway; the pattern also stopped
  treating a **path segment** as a citation — `req-` is too ordinary a prefix.
- **The path substitution rewrote the left column of the migration table**, the one document
  whose only job is to remember the old names; what saved it is that the table lives in the only
  file exempt from citation control. **A migration must not run over the file describing it.**
- **`tools/check-parts.mjs` held `docs/komponenty` without a trailing slash** and fell out of the
  substitution pattern. The more interesting half: **fixing that one constant fired the gate**,
  because five cases in `check-parts.fixtures/` carry their own copy of the cards directory. A
  documentation path lives in as many places as there are cases mirroring it.
- **The old space is rejected from now on**, but the pattern requires a letter after the dash —
  otherwise a sentence about the prefix itself (`wym-*`) would be a citation and the migration
  could not be described anywhere.

Next: **B1** → **H3** → **H4** → **B2**. From now on every new sentence is written in the target
namespace, so H3 and H4 will not be written twice.

### 2026-08-06 — the language rule existed from the start and was broken on every side

A planning session, not an executing one: **nothing moved to `[x]`**. Requirements 81 → 83, gaps
11 → 13; both new gaps have an owner (**B8**, **H2**), so the invariant from [State](#state)
holds. The starting point was B3 and B4 („README and JSDoc in English"), and what was not fine
about them was **what enforced them**: nothing.

- **The split „working in Polish, public in English" stood in [`docs/README.md`](README.md) as
  prose and was kept on neither side.** Measured: the package `description` is in Polish, and in
  the built package **24 files** carry Polish text, among them **all eight `types/*.d.ts`** —
  precisely the surface the split was meant to defend. A rule without a gate is no rule, hence
  [`req-project-language`](requirements/project.md#req-project-language) and **B8**.
- **The public `.d.ts` cite `wym-*` and `lekcja-*` 31 times** — identifiers of documentation the
  consumer does not have; translated they would be just as useless. Measured with it: the
  `PctReqId` union is built for the sandbox, so renaming identifiers (**H8**) is internal.
- **Concision is a separate axis and travels with the same move.** Gate headers run 34–76 lines,
  ~590 together, and half of them repeat [`lessons.md`](lessons.md) and this journal. Hence **H1**
  before H2–H4: translating prose you are about to cut costs twice.
- **Three things were settled, not deferred:** identifiers move with everything else; compression
  is a promise with a gate on **volume**, its budget laid **after** the pass, because a snapshot
  of today's headers would freeze them as accepted ([`lesson-49`](lessons.md#lesson-49)); and the
  repository is **public from the first push**, so **B2 moves behind H1, H3 and H4**.

Next: **B1** → **H1** → **H3** → **H4** → **B2**, and only then **B3 + B4 + B8 as one move**.

### 2026-08-06 — A13: 96.62% coverage is 63.54% of defects noticed. Phase A closed

**A13** done. Gaps 12 → 11, enforced 53 → 54. **Phase A has all thirteen tasks behind it.** The
scope was exactly what the plan wrote down — Stryker on `core`, `number` and `select`, a
threshold wired into CI — and it was wrong about one thing: it assumed the gate would be the
hard part. The hard part was **the first measurement**.

- **At 96.62% line coverage the tests noticed 63.54% of the introduced defects.** Not a
  measurement error but two different quantities: coverage says how many lines **executed**, and
  a line executed without a single assertion on its effect counts the same as a checked one. 44
  mutants had no covering test at all. The rest is unexotic: condition boundaries, input default
  values, and tests that do not do what their name promises ([`lesson-57`](lessons.md#lesson-57)).
- **A public API without its own spec looks tested.** `pctFieldMessages` and `pctDescribedBy`
  had no test under their own name — the control specs measured them, each along one path, and
  line coverage showed 100%. In total 38 new tests, score 63.54% → **81.77%**.
- **A tool that measures defects is a report after installation, not a gate.**
  `thresholds.break` defaults to `null`, and once set it can be raised five ways, none of which
  adds a test — including a mutant killed by the **clock**. Hence the gate reads the
  configuration **as it took effect, from the run report** ([`lesson-58`](lessons.md#lesson-58)).
- **Two roads to the same specs diverged on the first run.** Stryker needs a Vitest config
  **file** while target `test` goes through `@angular/build`, which assembles one in memory — so
  point 3 compares `testFiles` from the report with `*.spec.ts` from the git index. Under the
  mutation config two `field.spec.ts` tests failed: the Analog plugin compiles tests **JIT**.

Next: phase A is closed, so the order starts from **B**; **F1** is unblocked, **C** stays filler.

### 2026-08-06 — A10: a media query fired in an engine that cannot do it

**A10** done. Gaps 13 → 12, enforced 52 → 53. The scope was exactly what the plan wrote down —
webkit and firefox functionally, screenshots on chromium — and it was wrong about one thing:
adding three projects is not the **execution** of that promise, it is its declaration.

- **This promise has no symptom.** Playwright exits zero after three projects exactly as it does
  after one, and the same after **zero** collected tests. Four moves undo it and each looks like
  tidying in review — a project struck from `projects`, a file in `testIgnore`, `--project=chromium`
  in the target, an engine dropped from CI install. Hence a gate asking `playwright test --list`
  what the engines **actually** collect: „do not read `include`, run the compiler" from A7.
- **Firefox passed 146 of 146 functional tests first time, webkit 144.** Those two are the whole
  finding: Playwright's webkit reports `matchMedia('(forced-colors: active)').matches === true`
  and **does not substitute author colours** ([`lesson-56`](lessons.md#lesson-56)).
- **An exclusion resting on a fact about a browser must measure that fact.** „Webkit cannot do
  this" is a sentence about a **package version**, not about this repository. So the register has
  two kinds of entry: `record` (a decision written once) and `measurement` (a probe on every run), with
  `fakt-bez-odniesienia` as denominator — a fact holding for **no** engine is a broken probe.
- **An engine that does not repaint the result shows a defect the other two cannot.**
  `:host([disabled])` in a forced-colors block has specificity (0,2,0) against the base rule's
  (0,3,0), so `color: GrayText` loses to a token — dead declaration, no symptom today. → **C8**
- One slip, new in shape: the gate fired **on itself**, counting four install steps where there
  are two — a text scanner reading a commented file has to strip the comments first.

Next: **A13** (the mutation run, 1–2 days) — the last item of phase A.

### 2026-08-06 — A9: the consumer's first command failed while every gate was green

**A9** done. Gaps 14 → 13, enforced 51 → 52. The scope was exactly what the plan wrote down —
`npm pack`, install, an SSR build, one e2e — and it **found a defect on the first run, before it
even got to the e2e**.

- **`ng add @pacit/components` did not work.** The package manifest carries `"type": "module"`
  (added by ng-packagr) while the schematics are CommonJS — so Node reads them as ESM and dies on
  `exports.ngAdd = …`. The first command a consumer types, in the released artefact.
  **`check-package` saw a complete collection**: field, collection, factory file — all true, and
  „can it be loaded" was never asked, because a static gate cannot ask it
  ([`lesson-55`](lessons.md#lesson-55)). The fix is what `@angular/cdk` does: its own boundary
  in `schematics/package.json`.
- **Two filters stand between `dist` and the consumer's `node_modules`:** `npm pack` (the `files`
  field, `.npmignore`) and the registry. A gate walking the directory is blind to both, so point 1
  reads the file list from the **archive** — a truncated `files` fires it and not `check-package`.
- **The registry proxies npmjs, and that is a quiet defect waiting for the first release.** A
  failed publication does not end in an install error — it ends with the package pulled from the
  uplink. Today that would be a 404; after B2 a gate without point 2 would examine a pre-release
  artefact and look green.
- **„It built with SSR" is not enough — you have to ask WHO rendered.** An app without a router
  is **prerendered**, so the server bundle never renders; point 6 demands `ng-server-context="ssr"`.
  Measured in passing: `document` at library **module scope** breaks the **build**, not a request.

Next: **A10** (the browser matrix) or **A13** (the mutation run) — the last two items of phase A.

### 2026-08-06 — A11: an input is a signal, its default value is not

**A11** done, and **C5** with it — they turned out to be one task, because a gate guarding the
text channel must first know what that channel is. Gaps 15 → 14, enforced 50 → 51. This was meant
to be a half-day grep („every user-visible string goes through `PCT_TEXTS`") and it was wrong not
about the diagnosis but about **where that string stands**.

- **Grepping the templates is half the channel, and the easier half.** The other half is in TS:
  `input<string>(this.texts.selectPlaceholder)` looks like a reactive read because an input **is**
  a signal — and the default value is produced once, at construction. An app switching language
  without a reload kept the pre-change string since 2026-07-27, with CI green: the only test of
  that channel rendered the component **once** ([`lesson-54`](lessons.md#lesson-54)). It was
  **described in decision 0007 as open** — not knowledge that was missing, a machine.
- **The template is read once and that is a measured limit, not an oversight.** The „two
  independent readings" pattern (A3, A4, A6) does not close here: after linking, a text node's
  literal lands in a **nested** template function. So the gate takes Angular's parser with four
  denominator rules, and the package reading stays with attributes assembled by object spread.
- **What the measurement cannot see is forbidden.** ICU carries text variants in the i18n tree,
  which this traversal does not reach — measured: `visitText` receives no node from an ICU.
- **A gate without a user is a dead artefact.** `check-styles` has an exception mechanism and four
  real uses; here there is not one candidate, so there is no mechanism. Separately: the breakage
  script restored state with `git checkout` and **deleted the uncommitted decision 0014**.

Next: **A9**, **A10** or **A13** — the last three items of phase A, each needing something new
built.

### 2026-08-05 — A12: the contrast gate measured 38 pairs out of 74 and was green

**A12** done. Gaps 17 → 15, enforced 48 → 50. This was meant to be half a day („compare the list
of surfaces with the list of pairs") and was something else in both halves: the plan got the
mechanism right and was wrong about **where to take the list** you compare against.

- **A surface list taken from token NAMES does not see what this library does.** The outline
  button paints its background with `var(--pct-surface-100)` and its label with
  `var(--pct-primary)` — two semantic tokens, invisible to a rule asking „does every component
  `*-bg` token have a pair". So the denominator reads the **sass output**.
- **The policy was silent about 27 colours out of 74, and adding them broke the build on three.**
  In the dark theme the button label gave **3.45:1** on hover, **2.66:1** on active — below AA,
  in the library for months, with CI green. The cause: the dark ramp was a copy of the light one,
  and `on-primary` is **dark** there, so darkening the background drives contrast down instead of
  up ([`lesson-52`](lessons.md#lesson-52)).
- **A gate point is not one sentence.** Point 6 carries nine rules, point 7 six. Comparing the
  point identifier alone — how every negative control here works
  ([`lesson-50`](lessons.md#lesson-50)) — lets through a case that fired on a neighbouring rule.
  Hence the `regula` field: disarming five rules moves their cases to neighbours.
- Point 7 itself **passed green having measured no colour at all** at first, which is
  [`lesson-48`](lessons.md#lesson-48) in a point written to avoid repeating it. In **another**
  gate: `toHaveScreenshot` has two thresholds, one measured ([`lesson-53`](lessons.md#lesson-53)).

Next: **A11** (the text gate, half a day, and it forces C5 to be settled).

### 2026-08-05 — A8: an empty probe passes every test for what is not in it

**A8** done. Gaps 18 → 17, enforced 47 → 48. The task took the day it was given and the plan
**was not wrong about the scope** — the promise holds in full today. It was wrong about what the
assertion it proposed actually proves.

- **„There is no `PctField` in the bundle" is vacuously true exactly when the measurement has
  stopped measuring.** A probe from which the bundler dropped the library entirely — a bad alias,
  too wide an `external` list, an entrypoint unreachable through `exports` — also contains no
  `PctField`, and looks like proof. For an assertion about **absence** the denominator is **„can
  my measurement see anything at all"**.
- **A probe with an alias would be green even if `exports` did not exist.** The package is seen
  under its own name, through `node_modules` and the `exports` map — the road the consumer takes.
- **Markers have to be selectors, because a string from FESM does not survive linking.** The
  first version derived them from the minified FESM, which works in an esbuild probe; in a real
  build `button[pctButton]` becomes `[["button","pctButton",""]]`, so „no `PctButton` here" would
  come out green **always**.
- **The `sideEffects` point examined something other than what its justification claimed.** The
  comment said „removing this flag gives no red test"; the run said otherwise — the first suspect
  was the cache and that was a false trail, because **ng-packagr adds `false` itself**. A comment
  describing a defect the gate does not catch is worse than none ([`lesson-51`](lessons.md#lesson-51)).
- Disarming point 4 gave a `TypeError` — **the same defect as in A7, A4 and A3, the fourth time**,
  and the first inside a single point rather than between points.

Next: **A12** or **A11**. A9, A10 and A13 need something new built.

### 2026-08-05 — A3: a gate that fired correctly and explained it falsely

**A3** done. Gaps 19 → 18, enforced 46 → 47. The task took the day it was given and the plan got
the mechanism wrong, not the scope. It was to be „a template scan + a snapshot", and a template
scan is blind to what this library actually does.

- **Four parts stand in no template.** `field-prefix-item`, `field-suffix-item`,
  `field-label-aux-item` and `field-message-aux-item` sit in the `host` blocks of four slot
  directives — markers for projected content, not chrome elements. A gate reading templates alone
  would rule on an inventory without them and look complete, so the list is built **twice**: from
  the sources and from the built package through JIT, each side catching what the other cannot.
- **An inventory without a reader is a file for a machine.** The **Parts** tables in the
  `docs/components/` cards are the only surface where a consumer sees these names, and they are
  written by hand. The point comparing them with the package fired on the first run: `field.md`
  listed **11 parts out of fifteen** — the same card, the same defect as before 2026-07-27.
- **A snapshot cannot see a part whose name is produced at runtime** — it would be green precisely
  because there is nothing to notice, hence a point forbidding binding. Measured: a bound attribute
  **does not reach `consts` at all**, and an interpolation looks like a literal and is not one.
- **The snapshot point fired correctly and explained it falsely.** Renaming `trigger` produced
  „the part list is the same — the header or the row order has drifted", because the data-row
  filter did not survive the slash in `./select` and empty equals empty. **A negative control
  cannot see this by construction** — it compares an identifier, not a sentence
  ([`lesson-50`](lessons.md#lesson-50)).

Next: **A8** or **A12**. F1 is unblocked — A3 and A4 gave it both inventories to render.

### 2026-08-05 — A4: a snapshot that would have frozen what it was meant to guard

**A4** done. Gaps 20 → 19, enforced 45 → 46. This was to be half a day („add a versioned snapshot
and a comparison") and at the first reading of the requirement turned out to be something else.
The plan got the mechanism right — a snapshot really is what was missing — and was wrong about
**what it measures**. That came from writing the list of names out and looking at it.

- **A snapshot measures CHANGE, and the requirement promises a PROPERTY.** `req-token-names` says
  a name can be guessed without documentation. The repository had **34 tokens with their segments
  in reverse order**; each of those names is correct on its own, and what makes them unguessable
  is standing next to each other. A snapshot added before normalisation would have recorded that
  as the **accepted state** ([`lesson-49`](lessons.md#lesson-49)), so the schema point comes
  **before** the snapshot point.
- **A rule that closes in a circle needs narrower policing.** „A name is made of words from a
  closed set" is always true, because the set can be extended along with the name. So the gate
  enforces the narrower thing — **every declared word is used** — making an addition visible.
- **The denominator again, this time as a list of names.** Point 1 counts it **twice**: once from
  the text of `dist/pct.css`, once from walking the DTCG trees. The two catch different things —
  a declaration removed from `pct.css` fires as „in the sources, not in the artefact", an
  uncommitted `component.dialog.json` the other way round.
- **Disarming a point again gave a stack trace instead of a sentence.** The dictionary point read
  the parser result directly, because after the schema point the name „certainly" parses. **The
  same defect as in A7**, in a gate written a day after I wrote the conclusion in this journal.

Next: **A3** (the `data-pct-part` inventory) — together with A4 it unblocks F1.

### 2026-08-05 — A5: a gate that passed having measured nothing

**A5** done. Gaps 22 → 20, enforced 43 → 45. The task took the day and a half it was given and for
the first time in this series **the plan got the diagnosis right** — both promises were exactly
where it said, and the two foreseen exceptions turned out to be the only ones in the repository.
I was the one who got it wrong, in the place these tasks have been drilling for four sessions.

- **The gate passed green having measured no component at all.** It printed „7 stylesheets, 0
  components". A git pathspec is not a shell glob: without `:(glob)` a star crosses `/`, so
  `libs/components/*/src/**/*.ts` demands one directory too many and returns an **empty list** —
  not an error. The denominator check compared parsed decorators against `@Component(`
  occurrences, both came out zero, and zero equals zero ([`lesson-48`](lessons.md#lesson-48)).
- **A check comparing two measurements is worth what their independence is worth.** The decorator
  counter was meant to notice drift from the formatting the parser anchors on — and was written
  **with the parser's own anchor**. Measured: `PctCheckbox` indented by one space gave „7
  components" instead of eight. **The same defect sat in `check-zoneless.mjs`**; fixed together.
- **A stylesheet can be flawlessly logical and still not mirror in RTL.** The `dir` axis went into
  the sandbox and immediately showed the select panel writing left-to-right under a right-to-left
  trigger — the CDK overlay is a child of `body` and inherits nothing. The third property from
  [`lesson-35`](lessons.md#lesson-35), and an argument for moving that into the overlay layer (**D2**).
- **A scanner has a denominator too.** A property assembled by interpolation (`padding-#{$side}`)
  reaches the browser and stands nowhere in the stylesheet text. Hence point 2: the gate compares
  its own reading with the sass output.

Next: **A4** or **A3** — together they unblock F1. _(A4 done the same day — entry above.)_

### 2026-08-05 — A7: a target that exists, and a target that looks

**A7** done. Gaps 23 → 22, enforced 42 → 43. The task took the half day the plan gave it, but the
plan got the diagnosis wrong and the scope with it. It was to be „a walk over the Nx graph — a
project without a `typecheck` target fires", noting that **only** `sandbox-e2e` has one. Checking
the graph showed otherwise: `sandbox` has one too, inferred by `@nx/vite/plugin` — which looks
like a better state than the one described, and is a worse one.

- **An inferred target is somebody else's decision about scope.** The command is
  `tsc --noEmit -p tsconfig.app.json`, and that configuration **excludes** `**/*.spec.ts`. Four
  sandbox files never went through the compiler with `nx affected -t typecheck` green, and
  `project.json` showed nothing, because an inferred target is not written there.
- **Hence point 4, which the plan did not foresee.** Requiring the target to exist measures a
  declaration, and `lesson-42` says plainly that a tsconfig can lie about its own scope. So the
  gate runs **the target's command** with `--listFilesOnly` and compares the compiler program
  against the git index; `--showConfig` expands patterns but misses files pulled in by an import.
- **The denominator again, one floor up.** In A2 the sample of files shrank, in A6 the set of
  measured components; here the **set of projects**: `vitest.config.ts` and `vitest.workspace.ts`
  belong to no project, so a gate walking projects cannot see them and says nothing.
- **Disarming a point gave a stack trace instead of a sentence.** Point 3 read the target's
  command directly, because after point 2 the target „certainly" exists. A dependency between
  points is normal; writing it so that its violation gives no message is not.

Next: **A5** (the style gate), the one item whose retrofit cost grows non-linearly with the number
of components.

### 2026-08-04 — A6: OnPush can only be measured after linking

**A6** done. Gaps 25 → 23, enforced 40 → 42. The task took the half day the plan gave it, but not
where the plan assumed. Both promises — „`zone.js` removed" and „every component is OnPush" — are
of the same class: they rest on nobody undoing them, and undoing them yields no red test. They
differ in where they can be measured at all.

- **Zoneless is measured on the way in and on the way out.** Manifest, lock, bundle — three
  independent roads back, so three points. `npm i -D zone.js` fires point 1; reverting the entry
  **in the manifest but not in the lock** fires point 2, and that second variant is the one code
  review cannot see — the diff shows a removal while the package still stands in the tree.
- **OnPush is measured nowhere but in `dist`.** Nothing stands in the source (the v22+ guide
  forbids repeating defaults), nothing in the bundle text either — a partial declaration records
  only departures from defaults, and the value comes into existence at linking. The only honest
  reading is `ɵcmp.onPush` after `import '@angular/compiler'` ([`lesson-46`](lessons.md#lesson-46)),
  and the side effect is the point: the day Angular changes its defaults this gate fires.
- **„Every component" needed a denominator again.** If the set of examined components came from
  the package alone, a component that fell out of it would silently stop being checked. Hence
  point 4 and a separate denominator check on the parser — breaking the decorator formatting
  gives „recognised 7 of 8".
- **A comment in `project.json` lied before I measured it.** I wrote that an explicit
  `standalone: true` gives a byte-identical package; comparing checksums refuted it —
  `ɵɵngDeclareClassMetadata` moves. The sources stay in `inputs`, but because the gate reads them.

Next: **A7** (the `typecheck` target gate) — half a day, no dependencies.

### 2026-08-04 — A2: coverage measures the whole library, not its own sample

**A2** done. Gaps 26 → 25, enforced 39 → 40. This was to be half a day („`coverageInclude` +
an 80% threshold") and turned out to be something else on the first run of the control. The
control the plan named was: „removing a test drops coverage below the threshold and the gate
fires". Removing `number.spec.ts` **raised** coverage from 96.55% to 96.94% — v8 knows only the
modules that entered the run, so the untested `number.ts` left the report together with its test.
The numerator did not grow; the denominator shrank. That first version of the gate would have
passed, and not because coverage is good.

- **`coverageInclude` closes half of it.** Files without a test are added by a path that parses
  the SOURCE with rolldown — and that one falls over on `import type` / `export type`, prints
  „Excluding it from coverage" in the middle of a few thousand log lines and finishes the run
  **green**. Probe: a plain function, a `@Directive` and a `@Component` reach the report with a
  zero; a copy of `number.ts` does not, because line 18 has an `import type`. In an Angular library
  that is the default spelling, not an exotic one ([`lesson-45`](lessons.md#lesson-45)).
- **Hence two legs.** `public-api.spec.ts` brings the modules of every package entrypoint into the
  run, and `check-coverage.mjs` enforces that no source file is missing from the report. The
  threshold points guard the number; point 3 guards the denominator the number came from — and it
  is the denominator that shrinks quietly.
- **The file list in the gate is independent of `coverageInclude`.** Reading it from there would
  take a file off both sides of the comparison at once and point 3 would stop seeing anything —
  as would target `inputs` taken from the report ([`lesson-44`](lessons.md#lesson-44) again).

Next: **A6** or **A7** — half a day each, no dependencies.

### 2026-08-04 — A1: the package gate got a negative control

**A1** done, and **B5** with it — it turned out to be the same task, because `ng add` is the fifth
point of the same gate. Gaps 33 → 26, enforced 31 → 39 (eight, not seven: `req-release-metadata`
moved from 🟡 to ✅, because its „no control — deliberately" stopped being true).

Three things worth remembering beyond the code itself:

- **Checking that a fixture fired is not enough — you have to check which point rejected it.**
  With six checks in one script a prepared package can fall over for a reason it was not examining
  (a broken manifest, a typo in a path) and look like proof. Hence a check identifier on every
  error and a `kontrola` declaration in `fixture.json`. The run confirmed it: when the reference
  package became faulty, **all seven** cases started firing on other points.
- **The reference package must pass** — otherwise every case fires for its reason rather than its
  own, and the whole control becomes the thing it stands against.
- **A fake `package.json` in the repository is a project as far as Nx is concerned**, and
  `.nxignore` fixes that at the cost of invalidating the cache — trading visible mess for a quiet
  defect ([`lesson-44`](lessons.md#lesson-44)).

Verified by running it: the gate fires on four independent breakages (point 3 disarmed, a fixture
that stops being faulty, a fixture firing on somebody else's point, a faulty reference package).

Next: **A2** (coverage with an enforced threshold — the oldest debt).

### 2026-08-03 — the plan was written

A review of the state: 81 requirements, 31 enforced, 17 deliberately partial, 33 gaps. Verified in
the code while there:

- the component DoD form (`components/_template.md`) **already exists** — that item from the
  review roadmap is done,
- review findings §5.1–5.5 are still open (→ C1–C5),
- `dist/libs/components/README.md` is the Nx generator stub (→ B3),
- the repository has no remote (`git remote -v` empty) (→ B2),
- `libs/components/testing/` has no `ng-package.json` — it is an internal directory, not an
  entrypoint; worth confirming deliberately when G2 comes round.

Next: A1.
