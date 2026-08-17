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
| ✅ enforced                                 |    56 |
| 🟡 partial (deliberately without a control) |    16 |
| ⛔ gap                                      |    12 |

All 12 gaps have an owner below (B, D, F, G). If adding a requirement raises the gap count
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
so the npm page is written and the last file that travelled in a second language is gone; what
stands between here and npm is B4 (held with B2), B6 and B7. In parallel: F1 is unblocked — the
inventories it renders both exist — and C is filler.

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
