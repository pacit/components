# Work plan — task list

> **This file is written by hand.** It is the only place allowed to hold "done / in progress /
> to do".
>
> It does not duplicate the [registry](registry.md): the registry is generated and says **which
> promises have no gate**; this file says **in what order we close them and what has already
> gone through**. When the two disagree the registry wins — it is derived from the
> documentation, this is a list written by hand.
>
> **Nothing outside this file cites a task by its number.** The plan is temporary — it goes
> away when it is done, and every citation into it becomes a dangling reference at that
> moment. Whatever is durable is written where it lives: a requirement, a decision, a lesson.
> The one pointer that has to exist is the docs index naming this file at all, without which
> `check-reach` has no reader for it.

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
| requirements                                |    86 |
| ✅ enforced                                 |    64 |
| 🟡 partial (deliberately without a control) |    15 |
| ⛔ gap                                      |     7 |

All 7 gaps have an owner below — in sections 2, 3 and 5. If adding a requirement raises the gap
count and no task changes, this list has stopped being complete, and that is a fault of this
list, not of the registry.

## Order

```
1  components             the work in front of everything else
2  trust surface          the documentation site first — nothing is published without it
3  publication            the first push, then npm; held behind 2.1 and an explicit request
4  open findings          small, good filler between the bigger items
5  gaps with no deadline  waiting for the trigger written in their "Binds at" field
```

## Where things stand

**Nothing is published without a documentation site.** That is the ordering rule this plan
now turns on, and it is why publication sits at the end rather than at the front: **2.1**
(`apps/docs`) stands in front of **3.1** (the first push), and the push then waits for an
explicit request from the maintainer as well — two conditions, not one. **3.2** is held with
**3.1**, being the only work left in the package that needs an address which resolves.

Closed, and gone from this file: the language gate and the package text, the pre-publication
tidy-up with its gate, the support and dependency-list gates; the whole behaviour layer in
`libs/components/core` (list navigation, overlay, focus, live announcer, template slots),
icons in their own entrypoint `@pacit/components/icon`, and the ban on `@angular/animations`;
and the dialog, tooltip, popover, menu, the select family and switch / textarea / slider /
date. What those tasks found lives in the decision records (0018–0044) and
[`lessons.md`](lessons.md); the [registry](registry.md) records which promises they closed.

**The version of the first release does not follow from the history.** With a single root
commit `releaseVersion` sees an empty range and keeps the manifest's `0.0.1`, so the run needs
an explicit `--specifier`; at `0.0.1` every bump lands on a patch
(`adjustSemverBumpsForZeroMajorVersion`), so the first version is a decision, not a derivation.

## 1. Components

Ordered by architectural debt, not by popularity — with one reservation from
[decision 0016](decisions/0016-mit-irreversibility.md): the item with the highest build cost
goes **last**, because a release under MIT is irreversible and it is better settled with users
in hand.

Every new component fills in [`components/_template.md`](components/_template.md) — the DoD
form exists and is a condition of entering a release. Closed: the dialog, tooltip + popover,
menu, the select family, and switch / textarea / slider / date.

- [~] **1.1 — the rest**: toast, tabs, accordion, drawer, pagination, progress, skeleton, chips,
  avatar, badge, breadcrumb, stepper, tree
  - _the toast is done_ (1 of 13). It is drawn inside a live region rather than duplicated into
    a hidden one — `role="log"`, with **no `aria-live` / `aria-atomic` / `aria-relevant` of
    ours**, urgency a property of the message (an `alert` nested in the `log`). The viewport is
    a `popover="manual"` shown again per message, because a `z-index` cannot climb above the top
    layer. The spec is a discriminated pair: a message that carries an action or is urgent has
    no `duration` field at all. See
    [0044](decisions/0044-a-toast-is-a-change-in-a-region-that-was-already-there.md),
    [0039](decisions/0039-a-state-the-platform-publishes-is-not-ours-to-write.md),
    [`lesson-121`](lessons.md#lesson-121), [`lesson-122`](lessons.md#lesson-122).
  - gate: `apps/sandbox-e2e/src/toast.spec.ts` (15 × 3) plus `/toast` in the axe / hydration /
    RTL / forced-colours audits and 21 unit cases; control is the asserted **absence** of the
    three live attributes. Cost `./toast` **15311 B** on `./core` and `./icon`, `./core` +200 B
    and +142 B fanned out to every entrypoint for one new string.
  - left **4.14**, **4.15** and **4.16** behind; the two files it added to the mutation set
    are measured now, with everything else the library ships
  - _the tabs are done_ (2 of 13). The panels are the consumer's markup where they wrote it —
    a `<pct-tab>` **is** the panel, `role="tabpanel"` on its own host, and the strip is drawn
    from the labels handed up — and a panel nobody chose is `hidden="until-found"`, so the
    browser's find-in-page searches it and the reveal is answered rather than undone. A
    **disabled** panel is hidden outright, because find-in-page promises a way in. See
    [0045](decisions/0045-a-panel-nobody-chose-is-still-text-in-the-document.md),
    [`lesson-124`](lessons.md#lesson-124), [`lesson-125`](lessons.md#lesson-125),
    [`lesson-126`](lessons.md#lesson-126).
  - gate: `apps/sandbox-e2e/src/tabs.spec.ts` (11 × 3) plus `/tabs` in the axe / hydration /
    RTL audits, two forced-colours readings, three screenshots and 37 unit cases; the control
    for the central claim is the `@supports` fallback, which is why an engine without the
    attribute hides the panel rather than showing it. Cost `./tabs` **13458 B** on `./core`
    alone — no CDK, no `./icon`, no `@angular/common`
  - it made **`check-aria` read one thing more**: a composite role (`tablist`, `listbox`,
    `menu`, `radiogroup`, …) is a widget a consumer names, even with no `tabindex` on it. The
    old proxy for "carries a role" was focusability, so a strip named as a whole and focused
    through its children counted as zero widgets and asked for no name inputs. One new
    fixture, `composite-without-inputs`, is that rule's control
  - _the accordion is done_ (3 of 13). It is a `<details>` with a `<summary>`, so the press,
    the `expanded` state a reader announces, `Enter` and `Space`, the place in the page's tab
    order and the browser's find-in-page are all the platform's — and **`exclusive` is one
    shared `name` attribute with no code behind it at all**, measured closing the others in
    three engines. Three things were left over and each is here because the element really has
    nothing for it: a real `<h2>`…`<h6>` written inside the summary, which survives because a
    `<summary>` is not a button; `preventDefault()` as the only way to refuse a press, which
    takes the keyboard with it; and an `open` model written from `toggle` and never from a
    guess. See
    [0046](decisions/0046-a-disclosure-is-the-platforms-and-so-is-the-group-it-belongs-to.md),
    [`lesson-127`](lessons.md#lesson-127), [`lesson-128`](lessons.md#lesson-128).
  - gate: `apps/sandbox-e2e/src/accordion.spec.ts` (12 × 3) plus `/accordion` in the axe and
    hydration audits, one forced-colours reading, one screenshot and 12 unit cases; the control
    for the central claim is recorded rather than prepared — `[attr.name]` taken off the
    `<details>` leaves **3 of 36 red, one per engine**, all three of them the exclusive case
    and all three on the sibling that failed to close, with every other case green. That is
    the shape of a component whose one input is an attribute: nothing else moves, because
    nothing else was ours. Cost
    `./accordion` **11210 B** on `./core` and `./icon` — the smallest component entrypoint in
    the library, and the whole of what "the platform does it" is worth in bytes
  - it made **`check-aria` read one tag more**: `<summary>` was not in the list of what the
    platform makes focusable, so a component whose only widget is a disclosure counted zero
    widgets, was asked for no name inputs and passed green with a heading a consumer could not
    name. One new fixture, `summary-without-inputs`, is that rule's control
  - the one thing it **refused** is the open/close animation, and the refusal is written to
    expire: `interpolate-size: allow-keywords` is chromium's alone, so a height that grows
    would be a different component in different browsers. `› "the engine is on the road the
decision says it is"` goes red the day a second engine ships it
  - the mutation run found **six holes of one shape** and they are worth the sentence, because
    it is the shape **4.11** named: defaults no host had ever left alone. `exclusive`,
    `disabled`, `ariaLabel` and `ariaLabelledby` were bound in every arrangement the spec drew,
    so their own defaults were never what answered; `onToggle`'s body could be emptied, because
    nothing read the model back; and the generated `name`'s prefix was asserted by nobody, so a
    blank one — which would put every section in the document into a single group — passed. The
    answer is a third arrangement in the spec: a group binding nothing and a section outside any
    group binding only its label. `accordion-item.ts` **100.00**, `accordion.ts` **75.00**, the
    one survivor being the DI token's description string — which survives in `tabs.ts` and
    `menu.ts` too, and is a debugging label with no behaviour
  - left **4.19** and **4.20** behind, and gave **4.2** a third file
  - _the drawer is done_ (4 of 13). It is **not an overlay**: the panel is drawn where the
    consumer wrote it, so the tab order, the theme, the writing direction and the stacking
    context are the page's own — which is the shape
    [0031](decisions/0031-a-panel-s-tab-order-belongs-to-its-trigger.md) named and handed here
    ("a docked filter panel, a side sheet — is not this component"). The one thing written is
    the ARIA Disclosure pattern, and that is the exact residue of
    [0046](decisions/0046-a-disclosure-is-the-platforms-and-so-is-the-group-it-belongs-to.md):
    the platform's disclosure needs its button **inside** the thing it opens, and a drawer's
    never is. A shut drawer is `hidden="until-found"` — 0045's mechanism at its second
    component, which is what turns it from the tabs' accident into a rule. See
    [0047](decisions/0047-a-drawer-is-a-region-of-the-page-not-a-layer-over-it.md),
    [`lesson-129`](lessons.md#lesson-129), [`lesson-130`](lessons.md#lesson-130)
  - gate: `apps/sandbox-e2e/src/drawer.spec.ts` (12 × 3) plus `/drawer` in the axe / hydration
    audits, one forced-colours reading, one screenshot and 27 unit cases. Almost every e2e case
    is a reading of what the component does **not** do — zero `[inert]`, the root's `overflow`
    untouched, Tab walking in and out with no handler run, `closest('[data-theme]')` resolving
    to the card's own stage — because a negative is exactly what jsdom agrees with for free.
    Cost `./drawer` **14031 B** on `./core` and `./icon`, and the column to read is the
    dependency one: **no CDK at all**, which no other panel here can say
  - the modal drawer is **refused with a reason**, not deferred by taste: a side sheet that
    takes the page is `pct-dialog`, the two differ in promises rather than in looks, and
    `PctModalBackground.hold()` walks `body.children` — which is right for an overlay and does
    nothing for a panel inside an application's own tree. Making it work would generalise a
    shipped, gated behaviour of the dialog for a component with no consumer yet
  - it cost everybody else **+20 B per entrypoint**: `drawerClose` is a new `PCT_TEXTS` key, the
    toast's price at a fifth of the size. Every row of the size snapshot moved by exactly that
  - the mutation run is `drawer-trigger.ts` **100.00** and `drawer.ts` **98.46**; the two that
    are not killed are both known shapes — the `isDevMode()` guard, which no dev-mode test can
    tell from `true`, and an errored mutant that **4.6** has no column for (the fifth such row,
    and the first where the test proving the guard was written on purpose)
  - left **4.21** and **4.22** behind, gave **4.6** a fifth row, widened **4.10** to eight
    missing of fifteen, and gave **4.2** two more files and a fifth reading of its own defect.
    The whole library is **4130 mutants** now (3878 before) at **81.89%**, in **55 m 47 s**
  - _the pagination is done_ (5 of 13). It is the **model-owning** pager: `page` is a
    `model<number>`, `count` is a number of pages and never of items, and a press emits rather
    than navigates — a pager on `<a href>` takes its current page from the router and is a
    different component, not this one behind a flag
    ([0048](decisions/0048-a-pagination-owns-its-page-number.md)). The host is a `navigation`
    landmark and every control in the strip is a plain `<button>`, so the keyboard, the press
    and the disabled state are the platform's; the **fold** — the pinned ends, the window
    around the current page, one `'ellipsis'` per run of two or more, a single hidden page
    drawn as itself — is the whole of what this component computes. See
    [`lesson-131`](lessons.md#lesson-131), [`lesson-132`](lessons.md#lesson-132)
  - gate: `apps/sandbox-e2e/src/pagination.spec.ts` (15 × 3) plus `/pagination` in the axe /
    hydration audits through `SBX_ROUTES`, one forced-colours reading, one RTL geometry case,
    two screenshots and 36 unit cases. Cost `./pagination` **13581 B** on `./core` and
    `./icon` — `@angular/common` for one `NgTemplateOutlet`, and **no CDK**
  - it cost everybody else **+91 B per entrypoint**: three new `PCT_TEXTS` keys
    (`paginationLabel` / `-Previous` / `-Next`), the drawer's price at four and a half times
    the size, and every row of the size snapshot moved by exactly that
  - **the unit run found a real defect on its first pass, and it is a shape worth the
    sentence.** The clamp that keeps `page` inside `[1, count]` wrote the correction back from
    an effect watching `current()` — the clamped value. A clamp is a many-to-one map, so
    writing `0` or `-5` while standing on page 1 left `current()` unchanged, nothing
    recomputed, the effect never ran, and the consumer kept the number the card promised to
    correct. `999` worked only because it happened to move the result. The effect now tracks
    `page()` as well ([`lesson-131`](lessons.md#lesson-131))
  - **and it made `check-texts` read one thing more.** Point 4 pulled a factory's string
    literals out of the argument with a regular expression, comments included — and the
    comment `wastes the reader's time` left the count of `'` odd, so the opening quote of
    `['ellipsis']` two lines down closed a literal that had begun in the prose. The gate fired
    at a file that had done nothing. `literalsIn()` walks the argument in four states now
    (code, line comment, block comment, string); the control is in `_reference/`, and
    disarming it turns the reference red and moves **seven** prepared cases onto the wrong
    rule ([`lesson-132`](lessons.md#lesson-132))
  - a page button's accessible name is its number and not "Page N" — enough inside a named
    landmark, and the richer phrasing waits on a templated text channel this library does not
    have (the date field's format-letters seam). Written in the card as a limitation, not a gap
  - **the mutation run found five holes and named four mutants nothing can kill.** Three are
    the accordion's shape one arrangement later: the bare pager EXISTED, and `disabled`,
    `ariaLabel` and `controls` still survived their defaults, because a strip drawn by a pager
    that thinks it is disabled looks exactly like one drawn by a pager that does not — until
    somebody reads the buttons. The fourth is the fold's far clamp, reachable only with
    `boundaryCount=0`: taken off, the strip offers **page 21 of 20** and repeats page 20 beside
    it, and every other case here pins an end. The fifth is `go`'s `disabled` guard, which
    `.click()` can never reach — a disabled button swallows the press before the handler — so
    the case that claimed to measure it was measuring the browser; it dispatches the event by
    hand now. `pagination.ts` **91.96 → 96.43**
  - it also closed one line of **4.2**, and by an unexpected road: the run's own wobble put
    `core/src/texts.ts` at `100.00` and then `96.77` over identical code, and the single
    survivor was `toastDismiss`'s default — a string no assertion in the library had ever
    read, because the toast's case overrides it. One `expect` and the file is 100.00 with zero
    survivors, clock or no clock
  - the four left are **equivalent**, and the reason is the same twice over: a `signal.set` of
    a value already held notifies nobody, so both early returns (`written === clamped` in the
    clamp effect, `next === this.current()` in `go`) are an optimisation and not a behaviour;
    and `Array.from({ length: n })` already answers `[]` for every `n <= 0`, so `range`'s own
    `length > 0` guard is unreachable in effect and two mutants say so. A defensive line the
    platform already holds — [`lesson-95`](lessons.md#lesson-95)'s family, and **4.18**'s
    shape with the guard reachable by nobody rather than by the pointer alone
  - it left **4.23** behind, and widened it in the same breath: the sandbox's own navigation
    is inside six page-level screenshot baselines, so adding one view re-recorded all six —
    and it is inside a **behavioural** case as well. The dialog's scroll-lock test fails 5 of 5
    in webkit on `main` with this work stashed and passes 4 of 5 with it in place, on a page
    whose only difference is one more row in the navigation list

- [ ] **1.2 — table / datagrid** on a headless core (column model, sorting, filtering, grouping,
      selection as signals) separated from rendering. **The last item of the phase** — the only
      one counted in months rather than days; until the decision in
      [0016](decisions/0016-mit-irreversibility.md) is made it does not exist as a commit either,
      because the root `LICENSE` covers the whole repository

## 2. The trust surface

**2.1 is now a precondition of everything in section 3**, not a nicety after it: a package
whose first visitor has nowhere to read what it does is published too early.

- [ ] **2.1 — `apps/docs`** → closes `req-project-apps` and `req-project-layout`. Renders the
      **generated** inventories of parts and tokens, not hand-written ones
- [ ] **2.2 — ACR / VPAT** out of the existing gates — you get the machine proof earlier than the
      document, which is the reverse of the industry norm (the EAA enforceable since June 2025,
      EN 301 549 in tenders)
- [ ] **2.3 — benchmarks as a published number** + a performance regression that fails CI
- [ ] **2.4 — DTCG ↔ Figma / Tokens Studio bridge** — the source of truth is already DTCG, an
      unused advantage
- [ ] **2.5 — a surface for AI agents**: `llms.txt`, a machine-readable component catalogue from
      the same source as the docs, canonical examples

## 3. Publication

Binds at the first publication — and then all of it at once. Both items below are held, and
**3.1 now carries two conditions rather than one**: the documentation site of 2.1 has to
exist, and the maintainer has to ask for the push outright.

- [ ] **3.1 — remote repository + `repository` in the manifest** — **held on a state and on a
      sentence, and it needs both**
  - **the precondition is 2.1**: a package whose first visitor has nowhere to read what it does
    is published too early, so the documentation site has to exist before the push is even
    eligible. That half is a state, and a state can be checked
  - **the trigger is still a sentence.** 2.1 going green does not start the push, no other run
    turning green starts it, and its standing last in the order is not a start either — a
    session that reaches 3.1 passes over it and takes the next item. Recorded here because the
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
  - **the task itself is minutes, but it is now last.** The repository is public
    **from the first push** (settled: no private stage), so `README.md`,
    `docs/` and the step names in Actions become **the product** at that second
  - hence everything the first visitor sees is finished before the push, not after it. The price
    of that order is written down plainly — until the first push there is no remote CI, no
    provenance and no copy off this machine
  - the condition is wider than the public surface: **nothing leaves in a second language at
    all**, and a measurement says so, not a declaration — the language gate proves it over
    720 files of the index and 31 of the package, with no entry in the register
  - cost: minutes for the task itself · _notes:_ —

- [ ] **3.2 — citations in the public API as links**
  - concerns: [`req-project-language`](requirements/project.md#req-project-language)
  - **the language half is done**: the 24 files of the built package
    that carried Polish — all eight `types/*.d.ts`, seven `fesm2022/*.mjs`, the source maps and
    the manifest — measure **zero** today. Translating the JSDoc apart from the file it stands
    in would have meant opening all 15 sources twice, so it travelled with the sources
  - what is left is the second thing in the same place, and it is not about language: the
    public `.d.ts` cite `req-*` and `lesson-*` **31 times** as bare identifiers that lead
    nowhere for a consumer. The answer is **a link, not a deletion** — so this waits on **3.1**,
    because the address `@see https://…/docs/requirements/a11y.md#req-a11y-built-in` has to
    resolve before it is worth more than the paragraph it replaces
  - **3.1 being held, this one is held with it** — and it is the whole of what the hold costs,
    since the citations are the only work in the file that needs an address
  - cost: ~0.5 day · _notes:_ —

## 4. Open findings

Small, good filler between the bigger items. Each is verified in the code and still current,
and every one is held by a **binds at** rather than by anybody's mood.

- [ ] **4.1 — a one-letter Polish word walks through the language gate**
  - `tools/check-parts.mjs` said `has no card at all w \`docs/components/\`` — a Polish
preposition in a message a maintainer reads, in the repository whose whole first rule is
one language ([`req-project-language`](requirements/project.md#req-project-language))
  - **measured, not deduced**: the gate was run over the repository with the word in place and
    reported one violation, in a different file. So the word is not excused anywhere — it is
    **not seen**, and the reason is almost certainly the floor on word length that keeps `a`,
    `i` and `z` from firing on every initial, index variable and axis name in the tree
  - the word is fixed. What is not fixed is the class: `w`, `i`, `z`, `o`, `u` and `a` are all
    Polish words, and all of them are also things an English source writes constantly — so a
    rule here cannot be "look them up", it has to be about the CONTEXT a one-letter word stands
    in (prose between two English words, rather than an identifier, a table cell or a formula)
  - the same shape as [`lesson-77`](lessons.md#lesson-77) one floor down: the limb that reads
    the dictionary has a denominator nobody measures, and a word it never looks at is
    indistinguishable from a word it approved
  - binds at: the next language-gate task, or the first time a second one of these is found ·
    _notes:_ —

- [ ] **4.2 — the two longest gates share one runner, and CI gives them half the cores**
  - measured, from the `task_history` table nx keeps in `.nx/workspace-data`:
    `components:mutation` **1052 s and 1030 s** on two clean runs, `sandbox-e2e:e2e`
    **603 s** — that is 17½ and 10 minutes on an **eight-core** machine, and they are the two
    longest tasks in the repository by an order of magnitude
  - CI runs them **in one job on `ubuntu-latest`, which has four vCPUs**, and in one
    `nx affected -t …` line, so nx is free to start both at once. Halving the cores and then
    dividing them between the two is exactly the arrangement that turned a 17½-minute run into
    a **30-minute** one on the machine this was measured on — with the difference that here it
    was an accident of two background commands, and in CI it is the configuration
  - so the number nobody has is the one that matters: **what a push that touches
    `libs/components` really costs in CI**. The estimate is 45–60 minutes, and an estimate is
    what this repository builds gates against
  - the fork is a real one and both halves have a price. **Split the job** — a matrix with the
    slow pair on runners of their own — buys wall-clock and pays with a second `npm ci` and a
    second Playwright cache per run. **Cap the parallelism** for the heavy targets keeps one
    job and pays by serialising what is already the critical path. **Move `mutation` off the
    pull request** — nightly, or on `main` alone — is the cheapest and the only one that
    changes what CI _promises_, which is why it is a decision rather than a setting
  - **measured since, and it is worse than "somebody waits"**: three runs of `components:mutation`
    over identical code gave `core/src/motion.ts` **91.38, 86.21, 91.38**. The file was not
    touched between them. Three of its kills are the **clock's**, and a clock-kill is a kill
    only while the machine cooperates — under load the same three mutants survive and the file
    drops 5.17 points, which is past the snapshot's ±2 tolerance. So the arrangement this item
    describes does not just make CI slow: **halving the cores is what turns a timing-dependent
    kill into a red gate on a change that touched nothing**, and the failure names an innocent
    file
  - **and it is not one file.** The select's clearing step ran the whole gate list in one `nx
run-many`, which is the closest thing here to what CI does, and the same run reported
    `core/src/placement.ts` at **89.23** against **98.46** from a run of its own — nine points,
    on a second file nothing had touched. So the reading is not a quirk of `motion.ts`'s three
    mutants: it is what every clock-kill in the repository does when the cores are shared, and
    the number of files that can name is unknown
  - **and the select's window step wrote the mechanism into the snapshot's own columns.** Four full
    runs that evening over code neither file had been touched by: `motion.ts` read 86.21, 86.21,
    86.21 and then **91.38**; `placement.ts` read 89.23, 89.23, 89.23 and then **98.46**. Run
    **alone** (`stryker --mutate` over just the two) they came back at 91.38 and 98.46 first
    time and in four minutes. The column that says why is the one the snapshot already carries:
    `killed (of that, by the clock)` reads `53(3)` and `64(6)` on a run that lands them and
    `50(0)` and `58(0)` on one that does not. So a clock-kill here is not slow, it is **absent**
    — the mutant survives — and how many are absent is decided by what else the run is doing
  - the practical rule that falls out, and it is the one this step followed: **the snapshot
    records the run that lands them.** A `--write` from a starved run buries a nine-point
    tolerance in two rows, and every regression smaller than that in either file becomes
    invisible. Which means `--write` is not a mechanical step for these two files — somebody has
    to look at the clock column — and that is a gate needing a person, which is what this item
    exists to remove
  - it does not touch the definition of done: every gate still runs, and a slow gate is a
    green gate. What it touches is whether anybody waits for it — and, on the measurement
    above, whether the run answers the same way twice
  - binds at: **3.1** — the first push to a public repository is the moment somebody other than
    the maintainer waits for this run, and a first visitor who watches an hour of CI has
    learned something about the project. Sooner if a run starts hitting a limit
  - _notes:_ **the number above is out of date and the direction is the wrong one.** Widening
    the measured set to the whole library took `components:mutation` from 2762 mutants and
    ~17½ minutes to **3878 mutants and 49 m 30 s / 50 m 59 s** — two full runs, on the same
    eight-core machine. So the estimate for a push that touches `libs/components` is no longer
    45–60 minutes but something the four vCPUs of `ubuntu-latest` have to be asked about
  - and the two runs measured this item's own defect again, at the new scale: over identical
    code the first landed `motion.ts 87.93 51(1)` and `placement.ts 96.92 63(5)`, the second
    `91.38 53(3)` and `98.46 64(6)`. **Three and a half points on a file nothing touched**, and
    the whole of the difference is in the clock column. The snapshot in the tree is the second
    run's, per this item's own rule — which is a gate needing a person, twice now
  - **the cleanest reading of this item yet, and it took two runs to get it.** The drawer's step
    ran the gate **twice, alone, on a quiet machine, over identical code** — the second only
    because prettier had reflowed a comment and the gate rightly called the first measurement
    stale. The five files whose clock column moved between them are
    `config.ts 8(0)↔8(1)`, `field.ts 32(0)↔32(1)`, `motion.ts 53(3)↔53(5)`,
    `placement.ts 64(6)↔64(7)` and `template.ts 24(0)↔24(1)` — and it went **out and back**:
    the second run landed on exactly the numbers the snapshot held before this step began. Not
    one score moved either way, because every one of those mutants was killed both times, by an
    assertion in one run and by a timeout in the other
  - so the wobble is not a symptom of a busy machine at all: it is **always there**, visible in
    the columns on every run, and what a shared runner changes is only how far it swings. What
    decides whether it reaches the score is how close a file already stands to a boundary —
    `motion.ts` and `texts.ts` were the two where it landed on one, and these five were the same
    event with nowhere to fall
  - **a third file, and this time the clock gave rather than took.** The accordion's step ran
    the gate twice over code that never touched `core/`, and `texts.ts` came back
    `96.30 26(0) 1` from the recorded run and `100.00 27(5) 0` from the one that landed: the
    surviving mutant is killed by a **timeout**, so the file's score moves 3.7 points — past
    the ±2 tolerance — on the strength of what else the machine was doing. `placement.ts` moved
    in the column without moving in the score (`64(7)` → `64(6)`), which is the same mechanism
    with the arithmetic cancelling
  - so the rule's own price is now visible from both sides: the snapshot records `100.00`,
    because that is the run that landed them, and **a future run that does not land them reads
    96.30 and goes red on a file nobody edited**. Recording the starved number would put the
    red on the run that succeeds instead. There is no third option while the clock counts
    towards the score, which is what makes this a decision rather than a setting
  - **the fourth reading is the first one that closed something, and it names the third
    option this item says does not exist.** The pagination's step ran the gate twice over
    identical code and `core/src/texts.ts` came back `100.00 31(1) 0` and then
    `96.77 30(0) 1` — 3.23 points, past the tolerance, on a file the step had touched only by
    adding three keys. The survivor was one mutant: `toastDismiss: 'Dismiss'` blanked to `""`.
    Every OTHER default in `PCT_DEFAULT_TEXTS` is asserted somewhere; this one was asserted
    nowhere, because the toast's own case provides `providePctTexts({ toastDismiss: 'Take it
down' })` and a host that overrides a default is a host that never observes it
  - so the mutant had no assertion to die by and was killed by a **timeout** or not at all —
    which is precisely what "the clock counts towards the score" means, seen at one mutant. The
    repair is one `expect`: the cross's name with nobody providing one. Measured after it,
    `texts.ts` reads **100.00 with zero survivors**, and the two mutants still dying on the
    clock no longer decide anything, because the score is the same either way
  - that does not dissolve this item — most clock-kills are genuine timeouts and cannot be
    turned into assertions — but it narrows it, and it gives the practical first move for the
    next file that wobbles: **look at WHICH mutant the clock is holding.** If it is a string, a
    default or a branch a test could name, the wobble is a missing assertion wearing a timing
    defect's clothes. `motion.ts` and `placement.ts` are the two where it will not be, since
    what times out there is real waiting
  - **and it is not only the mutation run any more.** The same step's full e2e finished
    `2 failed, 1202 passed`, and both failures were the select's: `End reaches the five
thousandth row` timed out with the list still showing row 44, and the forced-colours case
    over the same panel went with it. Re-run **alone**, both pass in 20 seconds. Neither test
    touches anything the step changed. So the shape this item describes is not a property of
    Stryker — it is what a machine running a hundred browser pages at once does to any gate
    with a deadline in it, and the e2e suite has deadlines in every wait

- [ ] **4.3 — an option's owner is measured only where a page renders the panel**
  - `pct-select` draws a named section as `role="group"`, and the options below it are owned by
    the listbox **through** it — `option` names `group` and `listbox` as its context, `listbox`
    names `group` and `option` as what it may own. That relation is what makes a heading legal
    inside a list at all
  - **measured, not deduced**: with `role="group"` taken off the wrapper the axe audit answers
    with a **critical** `aria-required-children`, and it answers from the listbox's side —
    "element has children which are not allowed: `div[aria-labelledby]`". So the gate exists
    and it bites
  - **but it is an audit of a rendered, OPEN panel.** `check-aria` reads every template in the
    library and has six points; not one of them asks what stands between a role and its
    required context. The next component to draw a section — a menu with headings at 1.1, a
    listbox inside a table at 1.2 — will be green wherever no sandbox page opens that panel,
    which is [`lesson-65`](lessons.md#lesson-65)'s shape exactly — the same family as the error
    part that announced on nobody's rule until `check-aria` grew a point for it
  - the rule a static point would carry is the relation itself, read off the template: an
    element with `role="option"` may have `role="listbox"` or `role="group"` between it and its
    panel, and nothing else. The fixtures have a home already
  - binds at: **1.1**, at the first component after the select to draw a heading inside a list —
    or sooner, the first time a grouped panel is written that no page renders · _notes:_ —

- [ ] **4.4 — one template, compiled twice, and nothing says when that stops being worth it**
  - `pct-select` and `pct-multi-select` share `select.html` and `select.scss` in the sources
    and duplicate both in the artefact: an `@Component` compiles its own template and carries
    its own styles, so the entrypoint went 29058 → **46749 B** and became the largest in the
    library ([0034](decisions/0034-multiplicity-is-a-tag.md))
  - what the number measures is an application that imports the **whole** entrypoint, which is
    how every probe of `check-bundle` is written. Whether a consumer importing only `PctSelect`
    sheds the other class, its template and its styles is the question everybody would answer
    "of course, ESM" — and **nothing here measures it**, which is the same shape as
    [`lesson-45`](lessons.md#lesson-45): a promise whose denominator nobody looked at
  - the road out is known and is not free: draw the panel from an internal component
    (`role="listbox"`, the groups, the rows) that both triggers hold, which is one template and
    one stylesheet in the artefact as well as in the sources. It costs an encapsulation move —
    the rows would carry the panel component's `_ngcontent`, so the row rules leave
    `select.scss` and the `:host` half has to be rewritten ([`lesson-96`](lessons.md#lesson-96)
    is what that move gets wrong when it is done in a hurry)
  - binds at: **the third tag over this template** — an autocomplete or a combobox with a
    filter field would make it three copies, and three is where "one file, compiled n times"
    stops reading as a rounding error · _notes:_ —

- [ ] **4.5 — inheritance was taught to the two gates that fired, and to none of the rest**
  - a component's surface can now come from a base class, and two gates said so out loud:
    `check-aria` reported a combobox that "declares no `ariaLabel`", `check-texts` a class the
    package does not export. Both follow `extends` now
    ([`lesson-100`](lessons.md#lesson-100))
  - the rest were **not audited, they merely stayed green**: `check-parts` reads parts off
    templates and `templateUrl` is not inherited, so it is right by accident rather than by
    design; `check-zoneless` reads `changeDetection` from the decorator, which a base could
    carry; `check-styles`, `check-icons` and `check-texts`'s own point 4 all read a class body
    or a decorator. A gate that reads the WRONG half of a component reports a false claim
    loudly, which is the good case — a gate that reads too little and finds nothing reports
    green
  - the smaller sibling: `check-texts`'s attribute merge is exercised by the reference tree
    only through a NON-speaking attribute (`role`), because a static speaking attribute in a
    host block is a violation of the gate's own point 3. So the half that matters most is
    proved by the repository and not by a fixture
  - binds at: **the second base class in this library** — at one, the two gates that fire are
    the measurement; at two, "which gates read a class body" has to be a list somebody keeps ·
    _notes:_ —

- [ ] **4.6 — the mutation snapshot cannot say that a mutant errored**
  - the columns are `score · killed (of that, by the clock) · surviving · not covered ·
ignored`, and `RuntimeError` is in none of them — while `check-mutation` counts it in the
    **denominator**, deliberately and stricter than Stryker's own score. Two lines of the
    snapshot now carry a number that does not follow from the numbers beside it:
    `select.ts 88.89 32(0) 3 0 0` (32 of 36) and `multi-select.ts 97.14 34(0) 0 0 0` (34 of
    35). A reader checking the arithmetic finds a mistake that is not one
  - what an errored mutant is, in both cases: `if (row === null) return;` in `selectAt`. Drop
    the guard and the next line dereferences `null` inside a DOM listener, and the vitest
    worker dies rather than a test failing — "Cannot convert object to primitive value", twice
    restarted. It has always been so for `pct-select`; the filtering step gave the many-choice
    tag the same shape, because a pick now reads the row's value before anything else
  - binds at: **the next task that touches `check-mutation`** — a sixth column, or a score the
    columns can be added up to
  - _notes:_ **the trigger has fired**: the widening of the measured set gave the gate four
    rules and the snapshot sixteen rows, and left this column exactly where it was. It was not
    taken in passing because a sixth column is not a rendering change — the row format is
    parsed by point 6 and written out literally in five fixtures, so it is its own step with
    its own controls
  - **and it is four rows now, not two.** The tabs brought two more:
    `tab.ts 91.43 32(0) 2 0 1` (32 killed of 35 counted) and `tabs.ts 93.55 116(0) 7 0 2`
    (116 of 124). Both errored mutants are guards this step added tests FOR — `this.tabs?.select()`
    on a panel with no strip, and `if (!tab) return` in the walk's `settle` — and both die the
    same way the select's does: the guard removed, the next line dereferences `undefined`
    inside a DOM listener and the vitest worker dies instead of a test failing. So the column
    that is missing is not an edge case of one component; it is what a defensive guard looks
    like whenever the test that proves it is an event handler
  - **and a fifth, this time on purpose.** `drawer.ts 98.46 64(0) 1 0 0` is 64 killed of 66:
    one survivor (the `isDevMode()` guard) and one errored — `this.openedBy?.focus()` with the
    optional chaining taken off, on a drawer that never had a trigger. The difference from the
    four above is that the case which turns it into an error was **written for it**: a drawer
    opened by find-in-page, focus inside, Escape. So the guard is measured, the measurement
    works, and the snapshot cannot say either — which is the clearest statement of this item
    there is going to be

- [ ] **4.7 — the guard that keeps `null` away from a consumer's comparator is promised and not
      measured**
  - `selectedIndex` and `selectedOption` both filter `null`/`undefined` out before calling
    `compareWith`, and the JSDoc says why: a comparator an application wrote
    (`(a, b) => a.id === b.id`) blows up on a value it never declared. Both guards' mutants
    **survive**: with the default identity comparator, dropping the guard changes nothing that
    can be seen, and no test here supplies one that would notice
  - it is ten lines to close — an entity list whose value is set to `null`, asserting the
    trigger goes empty rather than throwing — and it costs a full mutation run to record,
    which is why it is a filler item rather than part of the step that noticed it
  - binds at: **the next full mutation run** · _notes:_ —

- [ ] **4.8 — an empty listbox is a critical violation, and no case had ever opened one**
  - measured while auditing the waiting panel of the select's async step: axe reports
    `aria-required-children` at **critical** on a `role="listbox"` that owns no
    `role="option"`, from the listbox itself ("Required ARIA children role not present:
    group, option"). The waiting panel is now legal because `aria-busy` is the state ARIA
    has for a container whose content has not arrived ([`lesson-106`](lessons.md#lesson-106),
    [0037](decisions/0037-loading-is-a-fact-about-the-list.md)) — and the panel of a control
    whose list is **genuinely** empty is the same tree without that excuse: the recorded run
    over `select-empty` reports the identical violation
  - what it is not: a defect this step introduced. The empty panel has been drawn since the
    first version of the select, four axe cases stand over this component, and none of them
    had ever opened a panel with nothing in it — a state can be audited from four sides and
    still have a floor nobody stood on
  - what closing it takes is a decision rather than an attribute: a message row wearing
    `role="option"` is an option nobody can pick, dropping the role while the panel is empty
    is a combobox whose `aria-haspopup="listbox"` points at something else, and closing the
    panel over an empty list is a press that answers nothing. The one thing that is already
    settled is that the audit will hold the answer: the case is `a11y.spec.ts` with
    `select-empty` in place of `select-async`, and it is red today
  - binds at: **the next step that touches the empty panel** — nothing built since opens a
    listbox, so this is a filler item · _notes:_ —

- [ ] **4.9 — the checkbox writes an `aria-checked` that no engine reads**
  - `checkbox.html` binds `[attr.aria-checked]="ariaChecked()"`, a computed of its own feeds
    it, and `apps/sandbox-e2e/src/checkbox.spec.ts` asserts the value it produces. All three
    measure a string this library writes to itself: on a native `<input type="checkbox">` the
    checked state comes from the element's checkedness and the `indeterminate` PROPERTY, and
    the ARIA attribute is not consulted at all
  - **measured, not deduced** ([`lesson-112`](lessons.md#lesson-112)), in three engines and
    in Chromium's own accessibility tree: an unchecked box carrying `aria-checked="true"`
    comes out `checked=false`, and `indeterminate` set through the DOM with nothing written
    comes out `checked=mixed`. The attribute is inert in both directions
  - what makes it an item rather than a tidy-up is the class of defect it belongs to: an
    inert attribute cannot be wrong, so it can drift from the state it claims to mirror and
    nothing will say so — not the unit case that reads back what it wrote, not axe, which has
    no rule about it, not a reader, which never looked. It is `req-axis` with the layers
    rearranged: the gate exists, runs, passes, and examines our own echo
  - the repair is a deletion — the binding, the computed and the e2e assertion, with the
    assertion replaced by a reading of the accessible tree, which is what the switch's own
    cases already do. It moves a public part of the rendered DOM, which is why it is not
    folded into the step that found it
  - binds at: **the next task that touches `PctCheckbox`**, or the first screen-reader log,
    whichever comes first — a log is the one measurement that would show what a reader really
    says about the `mixed` state · _notes:_ —

- [ ] **4.10 — the two READMEs list the entrypoints, and no gate reads either list**
  - the npm page's **Entrypoints** table
    ([`libs/components/README.md`](../libs/components/README.md)) names seven of the
    **fourteen** entrypoints the package really exports: `./dialog`, `./tooltip`, `./popover`,
    `./menu`, `./switch`, `./tabs` and now `./accordion` are missing, and its **Components**
    section stops at the select. The repository's own `README.md` carries the same list, one
    line shorter still, inside the layout tree
  - the page was written in English before the push and was true then. Four components have
    been built since, each with
    a card in `docs/components/` that `check-parts` compares against the built package — so the
    inventory a MAINTAINER reads is measured and the one a VISITOR reads is not. That is the
    asymmetry worth an item: the npm page is the first thing anybody sees, and it is the only
    surface here whose drift nothing notices
  - the shape of the gate is already known, twice over: `check-parts` point 5 finds a card by
    the selector it names, and `check-tokens` point 3 requires a component token's name to
    match a real entrypoint manifest. The same reading over the README's table — every
    `libs/components/*/ng-package.json` has a row, every row has a manifest — is the missing
    half, and it is cheap because the denominator is already computed by two gates
  - it is not fixed in passing deliberately: putting five rows in by hand today leaves the
    same page to drift at the sixth component, which is exactly how it got here
  - binds at: **3.1**, the first push to a public repository — that is the moment the npm page
    stops being a draft and becomes what a first visitor reads
  - _notes:_ the drift is **past half the table** now — **eight missing of fifteen**, the
    drawer being the latest. Each component since has widened it by one row and none has fixed
    it in passing, which is the item's own argument holding: a page that names fewer than half
    of what the package exports is not one anybody would call out of date by a line

- [x] **4.11 — the mutation run measures 22 of 36 source files, and nothing says which 22**
  - closed with a **rule**, which is what the item asked for. The gate reads the library's
    sources off the git index and requires every one of them to stand either in the inventory
    or in a new `unmeasured` register with a reason; a file nobody decided about is a violation
    (`inventory/source-unaccounted`) and not a silence. So **a new entrypoint's file is inside
    the measurement by default** — the exact inversion of the state this item was written about
  - `mutate` now says what is NOT measured instead of what is, which is the same inversion
    written where Stryker reads it. The categories that stay out carry a reason each — specs,
    `*.types.ts`, barrels, `testing/`, the version stamp, the mutation harness, the `ng add`
    schematic — and the gate computes them **independently of the configuration**, for
    `check-coverage`'s reason: a list read off `mutate` would strike a file from both sides of
    the comparison at once
  - **the measurement it opened with**: run over the repository before the widening, the rule
    named exactly the **17** sources that stood outside — `field.ts`, the wrapper every control
    is drawn by, `slider.ts`, `date.ts`, `calendar.ts` and thirteen more
  - the set is **42 of 43 files** now, 2762 → 3878 mutants. The one absence is
    `field/src/affix.ts`, and it is not a low score: instrumented, the file brings the INITIAL
    test run down, because the alias in its `input()` configuration stops being a literal the
    compiler can read and a static `pctPrefix="fill"` stops being a binding
    ([`lesson-123`](lessons.md#lesson-123)). An ignored mutant is still instrumented
  - **the price the item predicted came due and was paid.** The sixteen files arrived at
    **64.25%** with 399 mutants nobody had ever looked at; **51 cases across ten specs** answered
    them, and what they turned out to be is worth the sentence: defaults no host had ever left
    alone, two guards blocking one outcome and masking each other, a focus trap nobody had
    tabbed out of, three dev-mode warnings nobody had read, and a chrome with no control in it.
    Total **81.05%** against the 80 floor, and the widened run is **50 minutes** where the
    narrow one was seventeen — which is 4.2's number, not this item's, and it just tripled
  - four rules and four fixtures (38 → 42), each proved by disarming it: all four answer
    "PASSED", none moves onto a neighbour

- [ ] **4.12 — a control knows its text is not a date and has no channel to say so**
  - `<pct-date>` reports malformed text with `aria-invalid="true"` and a `data-pct-malformed`
    state, and puts **no sentence** in the message line. Not a wording decision: `errors` is an
    `input` the form owns, and `PctFieldControl.errors` is the signal the chrome reads — so a
    control cannot add an error of its own without shadowing the member the
    `FormValueControl` contract requires. Two members cannot share one name
  - what the user gets today: a required date typed as `31.02.2026` leaves the value `null`,
    so the form says **"this field is required"** while three numbers stand in front of them.
    The red border and the ARIA flag are true; the sentence is wrong, and it is the form's
  - the shape of the answer is a second channel on the contract — a control-side error the
    chrome merges with the form's — and it is not the date field's alone: `[pctNumber]`
    silently clears junk on blur for want of the same channel, which is `req-api-number`'s own
    complaint about `<input type="number">` committed one floor down
  - binds at: **the first control that has to say something the form cannot know**, which is
    either the next one with a parser (a time field, a masked input) or 4.12 itself being
    picked up as filler · _notes:_ —

- [ ] **4.13 — a state attribute that contains another entrypoint's selector is read as that
      entrypoint**
  - `check-bundle` point 7 reads an entrypoint's presence in a probe two ways — the bundler's
    metafile and a search of the bundle's TEXT for a marker, which is a component's selector
    from the built package — and requires the two to agree. The calendar's chosen day was
    `data-pct-chosen` only after the gate fired: written `data-pct-selected`, the way the
    select writes the same idea, the text `pct-selected` **contains** `pct-select`, so every
    bundle holding a calendar read as holding the select as well
  - the gate is right that the text is ambiguous and the report it gives is exactly the drift
    it exists for. What is missing is the rule one floor up: **no `data-pct-*` name may contain
    an entrypoint's selector as a substring**, and nothing says so — point 6(d) already guards
    markers against each other and stops there. The next component to want a `selected`,
    `switch`-ish or `menu`-ish state word finds this the same way, by a gate firing on
    something that looks like a tree-shaking defect and is a naming one
  - the shape of the answer is a word-boundary read in the marker scan, or the rule written
    into `check-parts` where part names already live. Which of the two is the item
  - binds at: **the next `data-pct-*` name that collides**, or the first change to
    `check-bundle`'s marker scan — whichever comes first
  - _notes:_ **it has been met a second time, and avoided by hand again.** The tabs' chosen tab
    wanted `data-pct-selected` for the same reason the calendar's day did, and took
    `data-pct-chosen` for the same reason it did — with the token beside it still named
    `--pct-tabs-tab-border-selected`, because a token name is not scanned. So one idea is now
    written with two words in two components, and what decides which is a rule nothing
    enforces: the second person to want it will find the workaround and not the reason

- [ ] **4.14 — a message reports nothing by colour, and the channel that would repair it is a
      decision nobody has made**
  - every toast is drawn the same: one surface, one edge, one sentence. Success, warning and
    failure look alike, and the only thing that separates an urgent message from an ordinary
    one is what it is announced as (`role="alert"`) and the clock it does not have
  - that is deliberate and it is written down
    ([0044](decisions/0044-a-toast-is-a-change-in-a-region-that-was-already-there.md)): a tone
    painted in colour alone is a state carried by colour alone
    ([`req-a11y-forced-colors`](requirements/a11y.md#req-a11y-forced-colors)), so a tone needs a
    second channel, and the only one a card of text has is an **icon**. An icon is a public
    name and a promise that supplying one replaces the drawing
    ([0011](decisions/0011-icons.md)), so "success, warning, danger, info" is four names added
    to `PctIconName` at once — the kind of set no one consumer can judge, a shared property
    being indistinguishable from an accident of the only case
  - what the item is: the decision, not the CSS. Whether tones exist at all; if they do,
    whether the icon is the library's or a slot; and whether the same set then serves the
    field's error, the dialog's confirm and whatever the banner turns out to be. Every one of
    those wants the same four drawings, which is exactly why the first component to want them
    should not settle it alone
  - binds at: **the second component that wants a tone** — a banner, an inline alert — or the
    first consumer report, whichever comes first · _notes:_ —

- [ ] **4.15 — the assertive channel has no consumer, and therefore no gate**
  - `PctAnnouncer` opens two regions and has done since the live announcer was built. The
    polite one is read by the
    select's empty panel and measured in `core.spec.ts`; the assertive one is created, hidden,
    exported — and spoken through by nothing in this library
  - 0026 said so out loud and named who would fix it: "the first callers are the toast and the
    dialog". Neither turned out to be one, and both for the same reason, which is 0026's
    own rule: a message with a place on the screen announces from that place. The dialog is a
    panel that takes focus; the toast is a `role="log"` with the message inside it
    ([0044](decisions/0044-a-toast-is-a-change-in-a-region-that-was-already-there.md)). So the
    prediction is not merely unfulfilled — it was **wrong twice**, and the second time on
    purpose
  - what is left is a mechanism this library ships, exports and never exercises: no unit case
    puts a sentence on it, no e2e page draws it, and the one thing that would notice it
    breaking is an application using it. That is the shape of a promise with no gate, and the
    two roads are opposite — find the consumer that needs an interruption with no place on the
    screen, or take the region out and let a consumer pass `'assertive'` into a channel opened
    on demand, which is the very failure 0026 refused
  - binds at: **the first message in this library that has no home** — or the next change to
    `announce.ts`, whichever comes first · _notes:_ —

- [ ] **4.16 — a control in the corner is last in the page's tab order, and nothing carries the
      keyboard to it**
  - a toast's `Undo` is a real control on a real card, and it is a child of `body` — so it
    stands after every control on the page. A keyboard user who wants it walks the whole
    document first. The clock at least does not run out during that walk (an action makes a
    message standing, and focus inside the stack stops every clock), but "reachable in
    principle" is not the same promise as "reachable"
  - the usual answer is a global key that moves focus into the stack (F6 in several
    implementations, F8 in others), and the disagreement between them is the item: a library
    that installs a document-level listener is taking a keystroke away from the application,
    and this repository has measured nothing about which one is free
    ([`req-api-platform`](requirements/api.md#req-api-platform) is about not inventing what the
    platform already has, and here the platform has nothing)
  - the same gap will arrive from the other side at the first banner or skip link, which is why
    it is worth settling once: **how does a keyboard reach a region that is not where the
    reading order says it is?**
  - binds at: **the second body-level control this library draws**, or the first consumer
    report about the toast's action
  - _notes:_ **the second side has arrived, and it is not body-level.** A drawer is drawn where
    the consumer wrote it, so it is reachable by Tab in principle from the moment it opens —
    and where in the walk depends entirely on where they put the tag. A navigation drawer
    written at the end of a document is at the end of the tab order while looking like it is at
    the top of the page. That is the same question the toast raises and it is NOT the same
    mechanism: the toast has nowhere in the document to be, the drawer has somewhere and it is
    the wrong somewhere. Whatever answers this has to answer both, which is the argument for
    settling it once rather than per component

- [ ] **4.17 — a snapshot with no tolerance drifted with nothing to point at**
  - `libs/components/size.snapshot.md` records `./toast` at **15311 B**. Built today from the
    same sources it reads **15346 B**, and the drift is at **HEAD**: measured with the tabs
    work stashed, so `check-bundle` was already red on `main` before this step touched
    anything. No source of `./toast` or of `./core` has moved since the row was written — the
    last commit over either is the toast's own
  - the file's own header is what makes this an item rather than a correction: "there is no
    tolerance, because a tolerance decides two things and is argued about one"
    ([0023](decisions/0023-a-tolerance-is-for-a-wobbling-measurement.md)). A number with no
    tolerance is a promise that the same sources give the same bytes — and here they did not,
    with nothing in the diff to blame
  - the suspects are all outside the library: a patch of Angular or of the linker in the
    lockfile, a change in `esbuild`, the token build. Each is testable and none has been
    tested, which is the work: **what moved 35 bytes, and does the gate need to say which of
    its inputs it is measuring?** Today it reads as though it measured this repository alone
  - the same question one floor up is the one that matters for CI: a gate that can go red on a
    dependency bump with no source change is a gate whose failures somebody has to interpret,
    and this repository's whole argument is that a red gate names its cause
  - it is corrected in the step that found it — the snapshot now records 15346 — because
    leaving a known-stale row would be worse than a drift nobody has explained
  - binds at: **the next `check-bundle` drift with no source change**, or the first dependency
    bump
  - _notes:_ measured again in the accordion's step, which rewrote the whole snapshot: `./toast`
    came back at **15346** and every other row was unchanged, the new `./accordion` line being
    the only difference. So the 35 bytes moved once and have stayed moved — which rules out a
    measurement that wobbles and leaves the dependency bump as the suspect it always was

- [ ] **4.18 — a guard the pointer makes unreachable, found by the mutant that survived it**
  - `PctTabs.onPress` opens with `if (tab.disabled()) return;` and the mutation run says the
    branch changes nothing: removed, every case stays green. Three things already refuse a
    disabled tab — `select()` will not take the value, `rovingIndex` will not put the tab stop
    on it, and every movement of the shared walk skips it — so what the guard alone stops is
    the CURSOR landing there
  - and it does not stop that either, because of a measurement taken in the same step: a click
    on a tab focuses it in **all three engines**, so `onFocusin` puts the cursor on the pressed
    tab before `onPress` is reached. The guard has an effect only where the press arrives with
    no focus event, which is a synthetic `click()` — that is, in a unit test and nowhere else
  - it is the shape [`lesson-95`](lessons.md#lesson-95) describes from the other side: there a
    guard was too weak because the platform got there first, here it is unreachable for the
    same reason. A branch nothing can reach is a claim with no measurement behind it, which is
    exactly what `PctMenuItem.press` says about the guard it deliberately does NOT have
  - what it costs to close is why it is a filler item and not part of the step that found it:
    deleting three lines is minutes, and re-recording the snapshot they move is a **55-minute**
    mutation run — 4.7's reasoning exactly, one component over
  - binds at: **the next full mutation run** · _notes:_ —

- [ ] **4.19 — a component that is mostly the platform has almost nothing a mutation run can
      hold**
  - `accordion.ts` and `accordion-item.ts` are **74 lines of code between them** and the rest
    is a template and a stylesheet. What that buys is written down
    ([0046](decisions/0046-a-disclosure-is-the-platforms-and-so-is-the-group-it-belongs-to.md));
    what it costs is a measurement that has almost no surface: the exclusive group, the
    keyboard, the disclosure state and the searchability of a closed section are all **outside**
    the two files the mutation run reads
  - the numbers say it plainly. The whole entrypoint is **20 mutants**, where `tabs.ts` alone
    is 124 — and the run was not useless, it found six real holes on the first pass. But what
    it can go red about afterwards is four inputs' defaults and one method body: the exclusive
    group, the keyboard, the disclosure state and the searchability of a closed section are
    **outside** the files it reads. So a green 95% on this entrypoint is a true statement about
    a small thing, and it looks exactly like a true statement about a component
  - the gate that really holds the promises is `apps/sandbox-e2e/src/accordion.spec.ts`, and it
    is an e2e run: 36 cases in three engines, none of which the mutation snapshot knows about
  - the same shape will arrive from every component that borrows more than it writes, and the
    library's whole direction is to borrow more ([`req-api-platform`](requirements/api.md#req-api-platform)).
    So the question is not "why is this file's score meaningless" but **what measures a
    component whose implementation is a browser** — and the honest answers are all outside
    Stryker: a mutation over the TEMPLATE (which nothing here reads), or a recorded disarming
    per claim, of which this step took one by hand
  - binds at: **the second component built mostly out of the platform**, or the first time a
    mutation score is used to argue that a component is well tested · _notes:_ —

- [ ] **4.20 — the list of what the platform makes focusable is written by hand, and nobody
      counts what is missing**
  - `check-aria`'s widget test rests on `FOCUSABLE_TAGS`, five tags until this step and six
    now. `summary` was the missing one and it was found the way these are always found: by
    building a component whose only widget was one, and noticing that the gate said nothing
  - what is still not in it, off the top of the platform's own list: `<audio controls>`,
    `<video controls>`, `<iframe>`, anything with `contenteditable`, and `<details>` itself in
    the engines that focus it. None of them is in this library today, which is exactly the
    state `summary` was in last week
  - it is [`lesson-77`](lessons.md#lesson-77)'s shape one floor up and the same one **4.5**
    describes for inheritance: the limb that decides what to look at has a denominator nobody
    measures, and a tag it never looks at is indistinguishable from a tag it approved. The
    difference from 4.5 is that here the list is a fact about HTML rather than about this
    repository — so it can be derived rather than curated, which is what makes it worth an item
  - binds at: **the third tag added to this list**, or the first component here to draw one of
    the five above · _notes:_ —

- [ ] **4.21 — the library's layer order is three numbers in three files and no rule**
  - `--pct-toast-z-index` is **1100** and its comment says why: above the CDK's overlay
    container. `--pct-drawer-z-index` is **900** and its comment says why: below the same
    container. The number both of them are written against — the **1000** the dependency
    stamps on `.cdk-overlay-container` — is in neither file, in no policy, and in no gate
  - each of the two is measured, and measured well: a hit test on a toast raised from inside a
    dialog, and a hit test on a listbox opened from inside a drawer. What is not measured is
    the thing they are both instances of. So the fourth component that needs a layer picks its
    number by opening two token files and inferring the middle one, which is how `pct-selected`
    was picked in **4.13** — a workaround found without the reason behind it
  - it is cheap to state and the shape is known: the order is a list (page < drawer < overlay <
    toast), the CDK's number is a fact about a dependency, and a fact about a dependency is what
    `check-browsers` point 6 already re-probes on every run rather than remembers
  - binds at: **the third `z-index` token in this library**, or the first `@angular/cdk` bump
    that moves the overlay container's number · _notes:_ —

- [ ] **4.22 — a fixed panel's containing block belongs to the consumer, and only prose says so**
  - `pct-drawer` is the first component here drawn **in place** and positioned against the
    window: `position: fixed`, docked to an edge, no overlay. That is the whole of
    [0047](decisions/0047-a-drawer-is-a-region-of-the-page-not-a-layer-over-it.md) and it comes
    with a platform rule nobody in this repository has had to think about before — a
    `transform`, a `filter`, `contain: paint` or `container-type` on **any** ancestor makes
    that element the containing block, and the panel docks to it instead of to the window
  - none of those is exotic. `container-type: inline-size` is what a component library's own
    consumer writes on a card to use container queries; a `transform` is what an animation
    library leaves on a wrapper. The failure is silent and looks like a bug in the drawer: the
    panel lands in the middle of the page, at an edge nobody asked for
  - it is written in the card's limitations and that is all it is — a sentence a consumer reads
    if they read that section. What a gate could do is narrower and real: the component knows
    its own offset parent at runtime, so a **dev-mode report** ("this drawer is docked to a
    `<div>` and not to the window, because an ancestor establishes a containing block") is the
    same shape as the four warnings this library already ships
  - the cost of not having it is asymmetric: the consumer cannot diagnose it without knowing
    the rule, and the library can detect it in three lines
  - binds at: **the second component drawn in place and positioned against the window**, or the
    first consumer report that a drawer is in the wrong place · _notes:_ —

- [ ] **4.23 — the sandbox's own navigation is inside six component baselines**
  - `visual.spec.ts` states the rule in its own comment: a screenshot is of an **element**, not
    of the whole page, "so a change in the sandbox shell does not invalidate the baselines of
    every component at once". Six shots take the page anyway — `dialog-open`, `dialog-open-rtl`,
    `menu-open`, `popover-open`, `toast-stack`, `toast-stack-rtl` — and each of the four tests
    says why in a paragraph of its own: an overlay is a child of `body`, so a shot of the card
    would catch its top edge and nothing else; the dialog's veil IS what the component draws;
    the toast's whole subject is where it lands against the window's edges. Every one of those
    reasons is good
  - **the cost the rule predicted came due, and it is measured**: adding `/pagination` to the
    sandbox put one more entry in the navigation, and six baselines went red at once — 1594
    different pixels in `menu-open`, every one of them in the sidebar, with the menu panel
    itself byte for byte the same. Six pictures re-recorded for a change that touched none of
    the six components
  - the shape of the answer is not "scope them to an element", because the four paragraphs
    above are right. It is to take the SHELL out of the frame: a stage with the navigation
    hidden, a route rendered bare, or a clip box that stops at the content column. Whichever it
    is, it has to keep the veil, the page surface behind a popover and the window's edges,
    since those are what the six exist for
  - until then the cost is a rule for whoever adds a view, and it is written nowhere: **a new
    sandbox view re-records six baselines that have nothing to do with it**. A reviewer seeing
    six changed pictures in a pagination commit has to open all six to learn that only a
    sidebar moved
  - binds at: **the next sandbox view**, or the first time one of the six really drifts and the
    drift is missed among the sidebar's — whichever comes first
  - _notes:_ **the shell is inside more than the pictures, and this is the measurement that
    says so.** `dialog.spec.ts` › "the page stops scrolling, and starts again" runs at a
    viewport of 1280x500, wheels 400, and asserts the lock holds. Run five times in webkit on
    **`main`, with this step's work stashed**, it failed **five times out of five**; run five
    times with the work in place it passed **four out of five**. Nothing in this step touches
    the dialog, the lock or that spec — the only thing that changed for `/dialog` is that the
    navigation list has one more entry, so the document is one row taller and the test's
    arithmetic sits somewhere else against it
  - so a behavioural case, not only a picture, takes its answer partly from the sandbox's own
    chrome. That widens this item from "six baselines" to **a gate whose subject is the shell
    as much as the component**, and it is the more expensive half: a screenshot that moves is
    read by a person, and a scroll assertion that flips is read as the component's defect. The
    dialog case needs a page whose height it decides — content of its own, or a fixed
    `min-height` on the stage — rather than whatever the sandbox happens to be that week

## 5. Gaps with no deadline

Waiting for the trigger written in their **Binds at** field. They are not forgotten — they
are deferred.

- [ ] **5.1 — `req-api-number`**: property tests for the parser (`parse(format(n)) === n` for any
      `n` and locale). Binds at the first locale outside `pl`/`en`
- [ ] **5.2 — `req-project-files`**: a check on the entrypoint directory layout. Binds at the first
      component added by somebody other than the author of the rule
- [ ] **5.3 — `req-token-directive`**: a theme directive instead of a hand-written `data-theme`.
      Binds once setting the attribute from a template starts repeating
- [ ] **5.4 — `req-token-density`**: the DTCG sources contain **not one** density token. Binds once
      the size axis settles — note that density will go below the touch-target threshold, so it
