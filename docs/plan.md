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

All 7 gaps have an owner below — in sections 2 and 5. If adding a requirement raises the gap
count and no task changes, this list has stopped being complete, and that is a fault of this
list, not of the registry.

## Order

```
0  the copy off this machine  DONE — 3.0 landed it on 2026-09-01
1  components             the premiere no longer waits for the tail of 1.1
2  trust surface          the documentation site first — nothing is ANNOUNCED without it
3  publication            3.0, the quiet push, waits for nothing; the premiere behind 2.1
                          and an explicit request
4  open findings          small, good filler between the bigger items
5  gaps with no deadline  waiting for the trigger written in their "Binds at" field
```

## Where things stand

**Nothing is announced without a documentation site — and the push is no longer the
announcement.** The ordering rule survives with its subject corrected. The maintainer
reopened the coupling on 2026-08-31 and named the fear it was protecting — "without a docs
site, nobody will look" — and that fear is about the **first look**, which no push
produces: an unannounced repository has no visitors, and the premiere's date stays a
sentence only the maintainer says. So the halves are split. **3.0** pushes quietly to a
**private** remote and waits for nothing — it buys the off-machine copy, a `ci.yml` that
has actually executed somewhere, and a rehearsed release path. **3.1** — the premiere: the
flip to public and npm — keeps both of its conditions, **2.1** and the explicit request,
so everything a stranger can see still waits exactly as long as it did. **3.2** is held
with **3.1**, being the only work left in the package that needs an address which resolves
publicly.

**The direction was reviewed on 2026-08-31, from outside the daily loop, and it holds.** Six
subsystem readers over the architecture, the components, the gates, CI, the consumer surface
and the market position; ten findings adversarially verified against the code; on the day,
every fast static gate green, 966 of 966 unit cases passing, the tree clean. The verdict in
one sentence: the moat is not any component — it is the evidence machinery itself, which no
competitor publishes anything like — and the risk is not architectural but **time and
fragility**: the product exists on one disk, and the surfaces nothing measures yet are
exactly the ones a stranger reads first (the npm README, the token inventory, the testing
story). The review changed three parameters and no ordering: section **0** exists now and
waits for nothing; **2.1** carries an MVP boundary and may start before 1.1 finishes; and
what the review found sits in **4.24–4.29** and in notes on the items it widened. The
split of the push from the premiere came the same day and is the maintainer's own
reopening, not the review's — recorded above and in section 3. The review also
caught this file lying twice — the truncated tail and the orphaned seventh gap, both
recorded at the end of section 5.

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

## 0. The copy that must exist

- [x] **0.1 — an off-machine copy of the repository, private and encrypted.** _Closed on
      2026-09-01 by **3.0**, which is how it was written to end: the private remote IS the
      copy, and the interval this item existed for was one day._ Until a remote
      exists there is no remote CI, no provenance and no copy off this machine — the price
      section 3 records the old order paying, and the last third of that sentence is an
      existential risk with no compensating benefit. A `git bundle` to a second disk or to an encrypted store is not a remote, not a
      publication and not the private stage 3.1 refuses: nothing in
      [0016](decisions/0016-mit-irreversibility.md) or in the premiere's rules speaks against
      a copy nobody can read. Minutes of work, repeated on a cadence worth writing down —
      and until it exists, every gate, lesson and snapshot here shares one disk's fate.
      **Superseded by 3.0 the day the quiet push lands** — a private remote IS the copy;
      this item exists for the interval before it, and the interval should be days

## 1. Components

Ordered by architectural debt, not by popularity — with one reservation from
[decision 0016](decisions/0016-mit-irreversibility.md): the item with the highest build cost
goes **last**, because a release under MIT is irreversible and it is better settled with users
in hand.

And since the push and the premiere split (section 3), **the tail of 1.1 stands in front of
nothing**: the premiere's conditions are 2.1 and a sentence, so the components still
unbuilt continue after it as well as before — a library is allowed to grow in public, and
a repository that moves is its own argument to a first visitor.

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
  - gate: `apps/sandbox-e2e/src/tabs.spec.ts` (12 × 3) plus `/tabs` in the axe / hydration /
    RTL audits, two forced-colours readings, three screenshots and 41 unit cases; the control
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
    hydration audits, one forced-colours reading, one screenshot and 14 unit cases; the control
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
    toast's price at a fifth of the size. Every row of the size snapshot moved by exactly
    that — every row but one: `./accordion` moved **+76**, and the +56 above the key is a
    re-measured drift of the toast's family (**4.17**), folded silently into this step's
    `--write` (measured after the fact: `git show` of the step's own commit)
  - the mutation run is `drawer-trigger.ts` **100.00** and `drawer.ts` **96.97** counted the
    gate's way (Stryker's own line reads 98.46 — the errored mutant is the difference); the
    two that are not killed are both known shapes — the `isDevMode()` guard, which no dev-mode test can
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
  - _the progress bar is done_ (6 of 13). It **is** a `<progress>`, and what that buys is one
    sentence: an element with no `value` attribute reaches the accessibility tree with **no
    value at all**, which is what indeterminate is — where an author writing `aria-valuenow` by
    hand has to choose a number and every number is a claim nobody has measured. So the role,
    the bounds, the value and the indeterminate state are the element's, and this component
    writes no ARIA anywhere. What the platform would **not** do is the paint: `appearance: none`
    is the price of styling the element and it takes the engine's own indeterminate animation
    with it, leaving an **empty** groove in chromium and webkit and a **full** one in firefox
    off the same two declarations. The fill is therefore a sibling drawn over the element — the
    checkbox's shape one component over — and the band is an element rather than a gradient
    because a forced-colours mode drops gradients outright. See
    [0049](decisions/0049-a-progress-bar-is-the-platforms-element-under-our-paint.md),
    [`lesson-133`](lessons.md#lesson-133), [`lesson-134`](lessons.md#lesson-134),
    [`lesson-135`](lessons.md#lesson-135)
  - gate: `apps/sandbox-e2e/src/progress.spec.ts` (11 × 3) plus `/progress` in the axe and
    hydration audits through `SBX_ROUTES`, one forced-colours reading, one reduced-motion
    reading, one RTL geometry case, two screenshots and 31 unit cases. Cost `./progress`
    **7029 B** on `./core` alone — no CDK, no `./icon`, no `@angular/common`, and the smallest
    component entrypoint in the library by 4181 B (the accordion held that place at 11210)
  - and it cost everybody else **nothing**: no `PCT_TEXTS` key, so not one other row of the size
    snapshot moved. The toast was +200 B per entrypoint, the drawer +20, the pagination +91;
    this is the first component in five whose price is paid by its own consumers alone, and the
    reason is that it draws no text — the name is the consumer's sentence, through
    `ariaLabelledby`
  - it made **`check-aria` read one thing more**, the third component in a row to do so. A
    `<progress>` is focusable in no engine and carries no `role` attribute, so both of the
    gate's ways of finding a widget were shut and the component would have passed green with its
    name inputs deleted. There is a third list now — `NAMED_TAGS`, the tags whose IMPLICIT role
    is announced with a name (`progress`, `meter`) — and `progress-without-inputs` is its
    control. That is **4.20** widened rather than closed, and the item's note says why
  - **the band's direction is the measurement that decided how it is written.** It travels by
    `inset-inline-start` and not by a `translateX`, which is the switch's and the drawer's rule
    applied to an ANIMATION for the first time: sampled over six frames in three engines, the
    band runs start-to-end under `ltr` and end-to-start under `rtl` with no rule of its own to
    reverse it
  - **`check-styles` caught the forced-colours block on its first run**, and correctly: a
    pseudo-element's rule outranks its host's, so the groove's `Field` gave way to the
    `background` the base sheet declares for `::-webkit-progress-bar`. That is
    [`lesson-70`](lessons.md#lesson-70) at a selector nobody would think to repeat — the three
    engine parts are cleared inside the mode as well now
  - **the suite's own red was the step's, and it is worth the sentence.** The new band case
    read `animation-duration` once and got an **empty string** in webkit, under 22 workers, on a
    view routed lazily — a reading taken before the first style resolution, where empty is
    indistinguishable from wrong. It waits for the value now (`toHaveCSS`), and the direction is
    measured on the same keyframes deliberately slowed to six seconds, because a 600 ms loop
    sampled by a process that can be descheduled for longer than a cycle is aliasing rather than
    measurement: two samples a cycle apart look like stillness and three look like travel the
    other way. Recorded under **4.2**, with the calendar's own flake beside it
  - **the mutation run found eight survivors, and they split four and four.** Four were the
    dev-mode warning's own sentence: the test matched its first clause, so the other three
    quarters could be blanked and nothing said so — which matters more here than it usually
    would, because this component invents no name and that sentence IS what stands between a
    consumer and an unnamed `progressbar`. The case reads four fragments now (both input names,
    the reason there is no default, and the closing clause), and `progress.ts` goes
    **84.62 → 92.31**
  - the other four are **equivalent, and proved so by hand rather than argued**: `isDevMode()`
    forced to `true` is the drawer's shape (no dev-mode test can tell it from the truth), and
    the three in the `value` transform are arithmetic — `value === undefined` dropped still
    answers `null`, because `Number(undefined)` is `NaN` and fails `isFinite`; and
    `typeof value === 'number'` dropped changes nothing, because `Number(n)` of a number is
    that number. Applied by hand, both survive a green 31-case run, which is the reading that
    settles it
  - and one attempt at that reading **did not compile**, which is worth the line: Stryker's
    mutant `false ? value : Number(value)` is fine at runtime and is a type error in the
    source, because `value` is `unknown` there. A mutant is applied after the compiler, so a
    hand-check of one has to be written in a form the compiler accepts — the runtime-equivalent
    `Number(value)` here
  - recorded: `progress.ts` **92.31 48(0) 4 0 2**, and the library is **4297 mutants at 82.41%**
    in **56 m 38 s** (4130 at 81.89% before this step), counted the gate's way rather than
    Stryker's — its own line reads 4184 at 82.60%, the difference being the errored mutants
    **4.6** has no column for. The whole file's mutants die by
    assertion — the clock column reads zero, which is what a component with no timing in it
    looks like
  - _the skeleton is done_ (7 of 13). It is the first component here that stands **alone and
    says nothing**: `aria-hidden` on the host, no role, no text, no slot, no `size` input and no
    `PCT_TEXTS` key. `pct-icon` is decoration too, but it is decoration beside a control that
    carries the meaning; a skeleton stands where the meaning has not arrived yet. What it answers instead is where the wait lives — `aria-busy` on the
    **region**, which is the consumer's own element and never this one, 0037's attribute at its
    second appearance and its first outside the library's own markup — and how big a placeholder
    is: a line is `1lh` and the bar inside it `1cap`, both the browser's arithmetic over the
    consumer's type. Measured on the sandbox's own card, the region is **57 px with the
    placeholder and 57 px with the answer** in all three engines, which is the whole reason the
    component exists. See
    [0050](decisions/0050-a-skeleton-is-a-picture-of-a-wait.md),
    [`lesson-136`](lessons.md#lesson-136), [`lesson-137`](lessons.md#lesson-137)
  - gate: `apps/sandbox-e2e/src/skeleton.spec.ts` (11 × 3) plus `/skeleton` in the axe /
    hydration audits through `SBX_ROUTES`, one forced-colours reading, one reduced-motion
    reading, one RTL geometry case, two screenshots and 20 unit cases. Cost `./skeleton`
    **2997 B on `@angular/core` alone** — it carries **no `./core`**, which every component
    entrypoint but the icon seam does, and the smallest component entrypoint before it was
    `./progress` at 7029 B. It falls out of the decisions rather than out of thrift: no `size`
    input is no `PCT_CONFIG`, no text is no `PCT_TEXTS`, no icon is no drawing to import
  - and it cost everybody else **nothing** for the second component running: no `PCT_TEXTS`
    key, so not one other row of the size snapshot moved
  - **the sheen is the progress band at its second component**, which is what turns 0049's
    answer into a rule rather than one component's accident — an element with a background
    colour travelling by `inset-inline-start`, because a gradient is dropped outright in
    forced colours ([`lesson-134`](lessons.md#lesson-134)) and an `opacity` pulse is refused by
    `req-token-no-opacity`. The two parts carry the progress bar's own names (`track`, `fill`)
    for the same reason: it is the same drawing
  - it made **`check-aria` read one thing more**, the fourth component in a row to do so — and
    this time a whole point rather than a list. **Point 8**: a component whose host carries
    `aria-hidden` holds nothing focusable and declares no name of its own. That is axe's
    `aria-hidden-focus` moved to build time, where the audit can only report it on a page
    somebody rendered ([`lesson-65`](lessons.md#lesson-65)'s shape); the two controls are
    `hidden-with-a-way-in` (a `<button>` grown inside the decoration) and `hidden-with-a-name`
    (an `ariaLabel` no reader will ever visit). It widens **4.20** rather than closing it: the
    new point's correctness now rests on the same hand-written `FOCUSABLE_TAGS`, so a tag
    missing from that list is no longer only a widget the gate cannot see — it is a control the
    gate approves inside a subtree it knows is hidden
  - **two e2e readings were written from memory and had to be measured instead**, and both are
    the same mistake in two shapes. A bar of `1cap` is **under half** the line box at
    `line-height: 1.5` (22.84 against 48), so "taller than half the line" was a claim about a
    line height nobody had fixed — the proportion that holds is against the FONT (0.714 of the
    em box in all three engines). And the sheen's bounding rectangle really does travel out of
    the bar and past its end: what keeps the paint inside is the CLIP, and a rectangle reports
    the box rather than what was painted. Both cases assert what is true now
  - one word joins the token dictionary — `last`, for `--pct-skeleton-track-width-last` — and
    the placeholder's corner is `{pct.radius.md}` rather than the progress bar's `999px`: the
    first screenshot showed a photograph's placeholder rounded into a pill, while on a bar the
    height of a capital letter the radius clamps to half the height and the ends come out round
    anyway
  - **the mutation run found one hole and named two mutants nothing can kill**, and the hole is
    the same one three components in a row have now produced: `shape`'s default. Every
    arrangement in the spec that could see the drawing bound the input, so `'text'` could be
    blanked and the bar-drawing branch answered exactly as before — the accordion's six, the
    pagination's three and the progress bar's four, at a component with only two inputs. The
    bare host reads `data-pct-shape` now, and `skeleton.ts` goes **88.46 → 92.31**
  - the two left are **equivalent, and one of them for a reason worth the line**: `isDevMode()`
    forced to `true` is the drawer's and the progress bar's shape, and `parsed >= 1` weakened to
    `parsed > 1` cannot be told apart at the boundary **because the fallback IS the boundary** —
    one line means one line whichever branch answers. A clamp whose default equals its own floor
    has no observable edge, which is a nicer statement of `lesson-95`'s family than the guard
    that is merely unreachable
  - recorded: `skeleton.ts` **92.31 24(0) 2 0 1**, and the library is **4323 mutants at 82.47%**
    (4297 at 82.41% before this step), counted the gate's way rather than Stryker's — its own
    line reads **82.66%** over the same run, because the gate keeps in the denominator what
    Stryker sets aside. The clock column reads zero here, which is what a component with no
    timing in it looks like; and two rows that had a `1` there — `core/src/field.ts` and
    `core/src/texts.ts` — read `0` over untouched code, which is the wobble **4.2** already
    records from the other side
  - left **4.23** behind again, and told its two halves apart in passing: the new view is a
    seventh row in the navigation, so the six page-level baselines were re-recorded once more —
    but the full suite came back **1417 passed, zero failed** in 20.1 minutes, where each of the
    two steps before it had one red behavioural case in a component nobody had touched. The
    pictures are the deterministic cost of a view; the red case is a load-dependent one
  - _the chips are done_ (8 of 13). The first question was which of the four things wearing
    the name this is — the static label is the badge's, the selectable chip a checkbox in
    different clothes (0039), the input chip the select family's road — and what nothing
    rendered was a row of **chosen values the user can take back**. The row is the platform's
    `list`/`listitem`, every removal a real `<button>`, removal itself an announcement the
    consumer answers by shortening their own array (0048's ownership split one notch
    further); the one thing added to the platform is **where focus goes when the button
    under it disappears** — measured onto `<body>` in all three engines before anything was
    written — so the row repairs it and Enter, Enter, Enter empties it with no Tab between.
    See [0051](decisions/0051-chips-are-a-list-the-user-shortens.md),
    [`lesson-138`](lessons.md#lesson-138).
  - **two probes ran before the code and one of them deleted a design**: the hypothesis
    that an empty `role="list"` needs its role taken off (the empty listbox of 4.8 is a
    critical violation, and `list` declares the same required children) measured as **zero
    violations in three engines** — axe's `aria-required-children` carves `list` out — so
    the conditional role, its unit cases and its mutant surface were never written
    ([`lesson-138`](lessons.md#lesson-138))
  - gate: `apps/sandbox-e2e/src/chips.spec.ts` (12 × 3) plus `/chips` in the axe / hydration
    audits, an RTL geometry case (the row and the cross both follow the reading direction),
    a forced-colours reading in two engines, two screenshots and 25 unit cases. The control
    for the repair's central guard is the second chip of the kept-value arrangement: without
    a candidate to wrongly land on, a dead guard and a standing-down repair read the same.
    Cost `./chips` **10600 B** on `./core` and `./icon`; the one new string (`chipRemove`)
    costs +20 B fanned out to every entrypoint that carries `./core` — and `./skeleton`
    stands unmoved at 2997 B, the one component entrypoint that carries none
  - it taught **no gate anything new** — the first component in a while to add not one point
    to `check-aria`: `list`/`listitem` and a named button are shapes the gates already read
    whole. What it did extend is the measurement's own kit: `ButtonText` joined
    `SYSTEM_COLORS` in the e2e support, the library's first use of that keyword
  - the mutation run: `chips.ts` **90.74 49(0) 5 0 2**, all five survivors named — the
    fourth `isDevMode()`-forced-true in a row, reversing the whole order instead of the
    predecessors (an unreachable difference: wherever the walk reaches that part of the
    map, its prefix is dead), `above?.` on a parent no document can null, and the two DI
    token labels, which are debug strings. The library is **4376 mutants at 82.36%**
    (4321 at 82.48 before). The run itself became a measurement of **4.2** — recorded there
  - the full suite: **1469 passed, zero failed** in 21.6 minutes on the second run; the
    first had three reds, none of them the component's — two were the forced-colours helper
    missing `ButtonText`, the third the webkit scroll-lock wobble 4.23 already records
    (green in isolation on the first retry)
  - _the avatar is done_ (9 of 13). It is **decoration all the way down** — `aria-hidden`
    outright, the third hidden component, because where an avatar stands the name is
    already text a reader says; the rule is written plainly: an avatar is never the only
    carrier of a name, and a control showing nothing else names itself. What it owns is the
    **fallback chain** (image → initials → silhouette, exactly one standing) and initials
    that are **graphemes**. See
    [0052](decisions/0052-an-avatar-is-a-picture-beside-a-name.md)
  - two probes ran before the code: `Intl.Segmenter` returns the emoji family, the flag,
    the matra and the han whole in all three engines (the five scripts are the unit suite's
    fixtures now), and an `<img>` fires `error` for a 404 AND for `src=""` — an empty
    string is a request to the page's own URL — which is why the template never binds an
    empty `src` rather than trusting the attribute to stay quiet
  - gate: `apps/sandbox-e2e/src/avatar.spec.ts` (8 × 3 — the dead link breaks over a real
    404 of the sandbox's own server) plus `/avatar` in the axe / hydration audits, a
    forced-colours reading, two screenshots and 21 unit cases. Cost `./avatar` **8501 B**
    on `./core` and `./icon` — and no `PCT_TEXTS` key, so not one other row of the size
    snapshot moved. The full suite came back **1506 passed, zero failed at the first
    attempt**, the first component step to manage that
  - **it lost an argument to a gate and the decision records it**: the first cut drew the
    silhouette as a bare `<svg>`, arguing an internal state of a hidden subtree is nobody's
    to address — and `check-icons` refused, rightly: a glyph a consumer cannot swap is
    exactly the thing their brand's empty state would want to replace. It is `pct-icon
name="user"` with an inline default now, `user` published in `PctIconName`, and the
    seam costs 1848 B of the entrypoint's weight
  - **the flex row nearly made it an ellipse**: measured live, a tight row shrinks even an
    inline `width` — a specified width is only a flex BASIS — so the host carries
    `flex: none` and the e2e reads equal sides off every size, which is the circle's
    arithmetic as an assertion
  - the mutation run found real work and named the rest: `trim()` beside `filter(Boolean)`
    was redundancy (either guard deletable with the other covering — neither observable),
    deleted with a padded-name test that tells the two apart. `avatar.ts` **87.50 28(0) 3
    1**, all four leftovers named — the reset arrow answering `undefined` for `false`
    (falsy either way), `\s` for `\s+` (the word filter makes the two regexes one
    function), the segmenter's granularity option deleted (`grapheme` IS the platform's
    default), and the `return ''` tail TypeScript demands and no non-empty word reaches
  - the language gate then read the SPEC and won too: the diacritics fixture and the
    flag-and-country pair were Polish standing in no register, and the registers are
    closed by construction
    (specimens cannot leave the gate's own tree, exceptions may not name `libs/`) — so the
    fixtures are Norwegian now (`Øyvind`, `🇳🇴 Norge`), which measure the same graphemes
    while being nobody's dictionary word, and the SVG debris the build spilled (`zm`, `cy`,
    `mw`) is three fragments in the vocabulary with their strings named
  - _the badge is done_ (10 of 13). It is **a word wearing a tone** — no role, no ARIA, no
    string, no size, no parts: the content is projected, a reader reads it as the plain
    text it is, and the tone repeats what the word says, never says it alone (an empty
    badge is a dev-mode warning; forced colours make the argument visible by dropping both
    tones to one palette with the border standing). See
    [0053](decisions/0053-a-badge-is-a-word-wearing-a-tone.md)
  - **two tones, and the skin is the reason**: `neutral` on surfaces the skin has, `danger`
    as the error colour's first background — with `on-danger` the exact pair
    `semantic.light.json` had removed as unused and promised back "with the first component
    painting a background with the error colour", naming this component. `success` /
    `warning` / `info` wait for ramps the skin does not have, as a compile-time fact in the
    union — 0019's centre of gravity kept where it belongs
  - gate: `apps/sandbox-e2e/src/badge.spec.ts` (5 × 3) plus `/badge` in the audits, a
    forced-colours reading, two screenshots and 7 unit cases. Cost `./badge` **1706 B on
    `@angular/core` alone** — the smallest component entrypoint in the library, under the
    skeleton's 2997, carrying not even `./core`
  - **the twin-heading case earned its place twice in one evening.** Written first with a
    remembered `line-height: 1.5`, it went red against a measured `normal` of 1.325 in all
    three engines; rewritten as twin headings (the skeleton's same-height idiom), it went
    red AGAIN — and this time the component was guilty: at `line-height: 1.6` plus the
    border the box stood taller than the heading's line and lifted it 1.8 px. The fix is
    the component's (`1.3`, under even a body line), not the test's — "bends no line" is
    an assertion now, not a hope
  - and the mutation run caught the template lying about whitespace: the blank-badge
    arrangement wrote a literal space, Angular drops a whitespace-only text node
    (`preserveWhitespaces: false`), so the trim's mutant survived over a case that never
    exercised it — the space is an interpolation now, and the trim's removal dies by it.
    `badge.ts` **83.33 10(0) 2 0 0**, both leftovers named: the fifth
    `isDevMode()`-forced-true in a row, and `?.` on a `textContent` no element can null.
    The library is **4420 mutants at 82.40**
  - _the breadcrumb is done_ (11 of 13). It is **the way here, told in the platform's own
    links** — every anchor the consumer's `<a href>` (the router writes `aria-current`,
    never this component: a guess from position lies on every partial trail), and the
    structure the library's: a named `navigation` landmark, a `role="list"` a reader
    counts, a chevron nobody hears. Three pieces on the elements that are really there,
    the third one a component on the consumer's anchor —
    [`lesson-96`](lessons.md#lesson-96)'s road, so the styling stands on no `::ng-deep`
    and `routerLink` stays where the platform put it. See
    [0054](decisions/0054-a-breadcrumb-is-the-way-here-told-in-links.md)
  - **two measurements decided the design before and after the code.** The probe: links
    standing loose in a `role="list"` are a critical `aria-required-children` violation
    in all three engines — the `lesson-138` carve-out covers only the EMPTY list, which
    is why `pct-crumb` exists. The audit: axe's `target-size` fired on the wrapped
    trail's 16px links (18px of safe space against 24 owed), because WCAG 2.5.8's inline
    exception covers sentences, not bars ([`lesson-139`](lessons.md#lesson-139)) — the
    links take the shared `{pct.target.min}` floor outright now, the chips' arrangement
    at a quieter control
  - gate: `apps/sandbox-e2e/src/breadcrumb.spec.ts` (6 × 3) plus `/breadcrumb` in the
    audits, a forced-colours reading (links `LinkText`, the current step a WEIGHT — the
    channel that survives — and bare text told apart by the palette itself), an RTL
    reading where the trail mirrors and every separator turns by `:dir(rtl)`, two
    screenshots and 12 unit cases

- [ ] **1.2 — table / datagrid** on a headless core (column model, sorting, filtering, grouping,
      selection as signals) separated from rendering. **The last item of the phase** — the only
      one counted in months rather than days; until the decision in
      [0016](decisions/0016-mit-irreversibility.md) is made it does not exist as a commit either,
      because the root `LICENSE` covers the whole repository

## 2. The trust surface

**2.1 is a precondition of the premiere (3.1)**, not a nicety after it: a package whose
first visitor has nowhere to read what it does is published too early. It is **not** a
precondition of the quiet push (3.0), which no visitor can see.

- [ ] **2.1 — `apps/docs`** → closes `req-project-apps` and `req-project-layout`. Renders the
      **generated** inventories of parts and tokens, not hand-written ones
  - **an MVP with a stated boundary, not a second product**: the generated inventories, the
    component cards rendered as they stand, a theming page carrying the token inventory, the
    support policy and the forms-interop boundary (**4.25**) — and nothing more before the
    premiere. This is the one item that can grow without any gate saying so, and the
    signal-forms head start decays while it does
  - it may **start before 1.1 finishes**: everything it renders is generated today, and no
    page depends on the six components not yet built
  - the typed token names (`PctTokenName` / `PctCssVar` in `libs/tokens/dist`) never leave the
    repository, so a consumer retheming past the one brand variable reads shipped CSS; a
    `./tokens` entrypoint or the rendered inventory is the same move the icon names already
    made, and it belongs here or to 2.4 — both read the same source
  - the dev-mode warnings are rich and unindexed — an id per warning, extracted from sources
    the text gates already parse, makes every warning an address a consumer can search for
- [ ] **2.2 — ACR / VPAT** out of the existing gates — you get the machine proof earlier than the
      document, which is the reverse of the industry norm (the EAA enforceable since June 2025,
      EN 301 549 in tenders)
  - _from the direction review:_ the document's inputs include **a recorded
    assistive-technology pass** (NVDA and VoiceOver over the sandbox views, logs kept). The
    a11y gates end where axe ends — DOM and CSS — and an ACR claiming screen-reader support
    with zero AT runs behind it is a promise without a gate, published to the exact audience
    that will check
- [ ] **2.3 — benchmarks as a published number** + a performance regression that fails CI
- [ ] **2.4 — DTCG ↔ Figma / Tokens Studio bridge** — the source of truth is already DTCG, an
      unused advantage
- [ ] **2.5 — a surface for AI agents**: `llms.txt`, a machine-readable component catalogue from
      the same source as the docs, canonical examples
  - built **with** 2.1, not after it: the catalogue falls out of the same generators the site
    renders, and locale packs for the `PCT_TEXTS` keys (a dictionary per language is an
    afternoon, and drift is a type error) share the generator. Being the first library an
    agent can verify claims about is this repository's own axis, worn outward
- [ ] **2.6 — `@pacit/components/testing`**: consumer-facing harnesses on the `data-pct-part`
      contract
  - the parts are already a snapshot-gated public surface, so a harness per card is thin and
    gate-able the way the cards are; today the only helpers are explicitly unpublished
    (`libs/components/testing/src/dom.ts` says so in its header) and a consumer re-derives
    by hand the selectors the library treats as contract. A library that ships promises
    should ship the instrument a consumer's own suite holds them with after an upgrade

## 3. Publication

**Split on 2026-08-31, by the maintainer's own reopening of the question.** The push and the
premiere were one moment here, and the fear that held them both — a first look landing on a
repository with no documentation — belongs only to the second: an unannounced private
repository has no first look. So the quiet half moved to the front and waits for nothing,
and everything a stranger can see still waits for 2.1 and a sentence.

- [x] **3.0 — the quiet push: a private remote, and CI that has actually run** — **waits for
      nothing**
  - _done on 2026-09-01, and measured rather than assumed:_ `pacit/components` is
    **PRIVATE** (read back off the API, not off the creation form), `main` is the default
    branch, the remote HEAD equals the local one at 181 commits, and the three workflows
    are active. `git remote -v` is no longer empty and 0.1 is superseded — the copy exists
  - **the push failed first, and the reason is worth the line:** the remote was written as
    SSH (`git@github.com:…`) into a machine with **no key in `~/.ssh` at all**, so it
    answered `Permission denied (publickey)` — a refusal that names the protocol and not
    the missing half. `gh` was authenticated the other way round, over HTTPS with a token,
    so the fix was to make the two agree rather than to invent a key: `gh auth setup-git`
    as the credential helper and the remote moved to `https://`. The token's scopes had to
    include **`workflow`** for the same push to carry `.github/workflows/` at all — a
    push of two files that would have been refused with everything else in place
  - **and the first two runs were the measurement, which is what they were for.** Run one
    died in four minutes on a gate that had never executed off this machine:
    `check-language` reads the system word lists and a runner ships neither (ENOENT — the
    gate failing loudly, correctly, in the first environment that ever lacked its input).
    Run two, with the lists installed, took **48 minutes wall** and went red four ways at
    once: the calendar's today-test was a date bomb that detonated everywhere on 1
    September (August's grid draws September's first days, and the expectation forgot
    them — it also took `mutation` down with it, through the dry run); `sudo` in the new
    install step read as Polish to the dictionary limb — pushed without re-running the
    gate it changed, which is its own lesson; e2e ran **41.3 minutes on ONE worker**,
    Playwright's own CI default, where this machine runs 22; and **six e2e failures were
    deterministic and environmental** — font metrics (4.30). Four load-flakes passed on
    retry, invisibly
  - the mutation pair is **off the push line now** and lives in `nightly.yml`, which is
    what the economics paragraph above declared; `check-docs` point 3 reads both workflows
    and both verbs (`affected`, `run-many`), so a gate that runs at night still counts as
    wired — **4.27**'s string-reading complaint stands, now over two files
  - _notes:_ the reasoning above still owes its decision record — the plan dies, an ADR
    does not
  - the repository under the `pacit` organisation is created **private** and `main` is
    pushed the day this lands. Nobody's first look happens here — the stage is invisible by
    construction, which honours the fear that used to hold the push instead of arguing with
    it
  - what it buys, at the price of minutes: the **copy off this machine** (0.1 is superseded
    that day); **`ci.yml` executing for the first time anywhere** — every number 4.2 argues
    about becomes a measurement instead of a guess, read from the first runs before anything
    is tuned — and the release path rehearsed end to end as a dry run, workflow and all
  - what it changes in 4.2's economics: a private repository meters Actions minutes, and an
    hour of mutation + e2e per push does not fit the free tier at this repository's pace. So
    the private stage takes 4.2's cheapest fork as its default rather than as a debate —
    **mutation moves to a nightly or manual run** while the stage is private. Free to decide
    here, because the stage has no external contributors whose expectations a weaker
    push-gate could betray
  - what it deliberately does **not** do: no flip to public, no npm, no announcement. npm
    provenance still refuses a private repository and `check-package.mjs --release` still
    blocks the release — the guard stays exactly where it was
  - an accidental `git push` — the reason the remote used to be empty on purpose — is
    harmless on a private stage, which dissolves that argument rather than overruling it
  - cost: minutes · _notes:_ when this lands, the reasoning above moves into a decision
    record — the plan dies, an ADR does not

- [ ] **3.1 — the premiere: the flip to public, `repository` promises that resolve, npm** —
      **held on a state and on a sentence, and it needs both**
  - **the precondition is 2.1**: a package whose first visitor has nowhere to read what it does
    is published too early, so the documentation site has to exist before the flip is even
    eligible. That half is a state, and a state can be checked
  - **the trigger is still a sentence.** 2.1 going green does not start the flip, no other run
    turning green starts it, and its standing last in the order is not a start either — a
    session that reaches 3.1 passes over it and takes the next item. Recorded here because the
    opposite is the natural reading of a task list: everything else in this file starts when the
    thing above it is done
  - concerns: `req-release-metadata` — the gate and its control exist, so the registry says ✅.
    **The manifest field is done** (`libs/components/package.json` points at
    `github.com/pacit/components`); what is left is the flip and the npm publish, and day to
    day the gate only warns
  - the `pacit` organisation exists on GitHub and on npm (scope `@pacit`, owner `markovy`);
    the repository arrives with 3.0 and stays private until here
  - **the flip is the second `README.md`, `docs/` and the step names in Actions become the
    product** — the sentence written for the push holds, moved to the moment it was always
    about. The old settlement "no private stage" was reopened by the maintainer on
    2026-08-31 and resolved into 3.0 + this item; what it protected — no half-public limbo,
    no second-class launch — is preserved, because the private stage is invisible and the
    flip is binary
  - hence everything the first visitor sees is finished before the flip, not after it. The
    price the old order paid — no remote CI, no provenance, no copy off this machine — is
    paid down by 3.0; what genuinely waits for this item is provenance, the resolving
    addresses, and every promise a stranger can read
  - the condition is wider than the public surface: **nothing leaves in a second language at
    all**, and a measurement says so, not a declaration — the language gate proves it over
    720 files of the index and 31 of the package, with no entry in the register
  - _from the direction review, three lines for the same checklist:_ the README's external
    links resolve before publish (every documentation link on the future npm page points at
    `github.com/pacit/components`, which does not exist yet, and no gate reads a link;
    `check-package --release` can ask); npm **trusted publishing** replaces the standing
    `NPM_TOKEN` secret (the workflow is already OIDC for provenance, so it is the last step
    of a road mostly walked); and the README entrypoints gate of **4.10** is a
    **precondition of this item**, not a fix the flip can carry loose — the npm page is the
    package's landing page on day one and the only consumer surface whose drift nothing
    measures
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

- [ ] **3.3 — the release reads CI's colour before it trusts it**
  - `release.yml`'s only guard is the ref check: no `needs:`, no check-run query, nothing that
    asks whether the commit it is about to publish ever went green. A dispatch against a red
    or still-running `main` publishes anyway — and of the ~26 gate targets CI runs, the
    release path re-runs only the build and `check-package --release`. The publish is the one
    gate whose failure a consumer inherits forever
  - one step asserting the HEAD commit's CI run succeeded closes it (a check-runs query, or
    the release calling CI as a reusable workflow with `needs`)
  - binds at: **the first non-dry release** · _notes:_ —

- [ ] **3.4 — the premiere is a task, not an event**
  - [0016](decisions/0016-mit-irreversibility.md) defers its biggest decision to "data that
    does not exist today" — and no task acquires the users who would produce that data. The
    plan has no announcement venues, no feedback channel, no "run the gates yourself"
    contributor path in `CONTRIBUTING.md`; the strategy's own logic puts users on the
    critical path of its most expensive open question, and nothing here goes and gets them
  - binds at: **3.1**, as the half of the premiere that is not a flip · _notes:_ —

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
  - binds at: **3.1** — the flip to a public repository is the moment somebody other than
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
  - **a fifth reading, and the cleanest statement yet that the wobble decides nothing on its
    own.** This step ran the gate twice over the same library — once before the progress bar's
    four new assertions and once after — and **four** files moved in the clock column with
    **no score change at all**: `field.ts 32(0)→32(1)`, `placement.ts 64(7)→64(6)`,
    `template.ts 24(1)→24(0)`, `texts.ts 31(0)→31(1)`. Two gained a timeout-kill and two lost
    one, over code neither run touched. So the mechanism is exactly what the drawer's step
    measured — it is always there, on every run, in the columns — and what decides whether it
    reaches a SCORE is only how close a file stands to a boundary. `texts.ts` is the file to
    watch: it reads 100.00 with zero survivors since the pagination's step, so its clock-kills
    now have nowhere to fall
  - **a sixth reading, from the e2e side, and this one names a second component's cases.** The
    progress step's full suite ran twice. The first came back `1364 passed, 1 failed` and the
    failure was the new band case in webkit — a single `getComputedStyle` answering an EMPTY
    string, which is a reading taken before the lazily routed view had its first style
    resolution. The second run, after that case was made to retry, failed a **different** test
    on a component the step never touched: the calendar's `an arrow follows the writing
direction`, expecting index 32 and getting 31. Run again, the date spec failed its
    right-to-left twin instead — and then went green **five times out of five** with the work in
    place and twice out of twice with it stashed
  - so the family is now three components wide (the select's End-key case, the dialog's
    scroll-lock case, the calendar's walk), and what they share is not a component but a shape:
    a case whose answer depends on a keypress or a style landing before the next line reads it.
    Under 22 workers on eight cores the window closes. That is this item's own argument reaching
    the suite CI actually runs, and it is why a red e2e here has to be re-run before it is read
  - _a fourth member, and this one was repaired rather than re-run past:_ the night before
    3.0, the full suite came back one red — the switch's forced-colours thumb, chromium,
    the bounding box read mid-flight (497.5 against a resting 503.1) — and green 17 of 17
    run alone. The case **polls** the position now (`expect.poll`), because what its promise
    is about is where the thumb lands, not where it happens to be one frame in
  - **and it is not only the mutation run any more.** The same step's full e2e finished
    `2 failed, 1202 passed`, and both failures were the select's: `End reaches the five
thousandth row` timed out with the list still showing row 44, and the forced-colours case
    over the same panel went with it. Re-run **alone**, both pass in 20 seconds. Neither test
    touches anything the step changed. So the shape this item describes is not a property of
    Stryker — it is what a machine running a hundred browser pages at once does to any gate
    with a deadline in it, and the e2e suite has deadlines in every wait
  - _from the direction review, and two of its three prefixes are in place:_ `ci.yml`
    carries a `concurrency` group with `cancel-in-progress` (safe exactly because
    `nx-set-shas` keys on the last GREEN run) and `timeout-minutes: 150` — twice the worst
    measured full run, a ceiling for a hung browser rather than a budget for a slow one —
    and `nightly.yml` runs the whole suite on a schedule with the two heaviest gates in a
    **separate step**, so their wall-clock and their wobble are readable per run straight
    off the job's step timings, which is the distribution this item has been missing. Still
    open from the review: the task cache — CI restores npm and the Playwright browsers and
    **no nx task results**, so a dependency bump reruns the whole pipeline, and by this
    item's own measurements a **restored** mutation result is more stable than a rerun,
    which makes the cache a correctness aid here rather than a speed one
  - **a seventh reading, and it adds a third axis and retires a rule.** The chips step's full
    run found the axis nobody had turned: Stryker's own `concurrency`. At the default
    (cpus−1 = 7 workers) the run exhausts the machine's 15 GB at 14% and the **OOM killer
    takes the parent process with it** — no red, no report, a session gone mid-run. At
    `--concurrency 4` it finishes in ~50 minutes and reads exactly like the starved
    `run-many` measurements above: `motion.ts 50(0)`, `placement.ts 58(0)`, `modal.ts 47(0)`
    — every clock-kill absent, the three scores at 86.21 / 89.23 / 78.33
  - and the snapshot now RECORDS that starved run, which the drawer-era rule above forbids —
    deliberately, because the rule died the day `mutation` moved into `nightly.yml`: there
    it shares one job with `e2e` in a single `run-many` line, so **the only run CI will ever
    perform is starved by configuration**, and "the run that lands them" is a run nobody
    starts. A snapshot holding the landed numbers would go red on every nightly for as long
    as the nightly exists. The first nightly fires tonight over exactly this snapshot, and
    its columns are the first CI-side numbers this item has been waiting for
  - the same evening the gate's own **denominator** turned out to be one file and one line
    wide: `check-mutation` point 7 read the first `nx` invocation of `ci.yml` alone, so from
    the day the two heavy targets moved to `nightly.yml` it demanded `mutation` of the
    workflow that deliberately does not run it — locally red on every machine, and the first
    nightly would have fired red on the gate's assumption rather than on any fact about the
    run. It reads the union over every `nx` line of both workflows now, and the
    `ci-without-target` fixture still rejects on its own rule

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
  - **and a fifth, this time on purpose.** `drawer.ts 96.97 64(0) 1 0 2` is 64 killed of 66:
    one survivor (the `isDevMode()` guard) and one errored — `this.openedBy?.focus()` with the
    optional chaining taken off, on a drawer that never had a trigger. The difference from the
    four above is that the case which turns it into an error was **written for it**: a drawer
    opened by find-in-page, focus inside, Escape. So the guard is measured, the measurement
    works, and the snapshot cannot say either — which is the clearest statement of this item
    there is going to be

- [x] **4.7 — the guard that keeps `null` away from a consumer's comparator is promised and not
      measured**
  - `selectedIndex` and `selectedOption` both filter `null`/`undefined` out before calling
    `compareWith`, and the JSDoc says why: a comparator an application wrote
    (`(a, b) => a.id === b.id`) blows up on a value it never declared. Both guards' mutants
    **survive**: with the default identity comparator, dropping the guard changes nothing that
    can be seen, and no test here supplies one that would notice
  - it is ten lines to close — an entity list whose value is set to `null`, asserting the
    trigger goes empty rather than throwing — and it costs a full mutation run to record,
    which is why it is a filler item rather than part of the step that noticed it
  - binds at: **the next full mutation run**
  - _notes:_ **closed at that run, the night before 3.0** — the case is exactly the ten
    lines the item drew (the entity host, `value.set(null)`, both computeds read), and the
    guards' null halves die by it. What the run named instead is the **undefined half** of
    each guard: `current === undefined → false` survives twice, because `model<T | null>`
    gives `undefined` no legal road in — the progress bar's equivalent-mutant family,
    except that `lesson-117`'s bridge has already shown a type is not a fence. One cast
    case (`value.set(undefined as …)`) would kill both; it waits for the next full run,
    because a kill the snapshot does not record is a red planted under a future one

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
    says about the `mixed` state
  - _notes:_ the switch's spec is the reference repair — it already asserts the echo's
    **absence** and reads the native checkedness — so the fix is a copy, not a design. The
    class has a second member: `core/src/announce.ts` is read back only as DOM, and it is
    the higher-leverage one, a shared choke point every announcement passes through, so one
    reader's log fixture there covers the class. And the cheap intermediate between an
    attribute echo and a reader's log exists and is unused: Playwright's aria snapshots
    (`toMatchAriaSnapshot`) assert what the engine actually exposes — role, name, state —
    per component state, and diff the way the parts snapshot already does

- [x] **4.10 — the two READMEs list the entrypoints, and no gate reads either list**
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
  - binds at: **3.1**, the flip to a public repository — that is the moment the npm page
    stops being a draft and becomes what a first visitor reads
  - _notes:_ the drift is **past half the table** now — **eight missing of fifteen**, the
    drawer being the latest. Each component since has widened it by one row and none has fixed
    it in passing, which is the item's own argument holding: a page that names fewer than half
    of what the package exports is not one anybody would call out of date by a line
  - and the arithmetic above is itself out of date, which is the item at work on its own note.
    Counted against the denominator two gates already compute — every `ng-package.json` in the
    library, the twenty `check-tokens` reports — the table names **seven of twenty**, so
    thirteen entrypoints are missing rather than eight. `./pagination` and `./progress` are the
    two most recent, and neither was added by hand for the reason written above
  - `./skeleton` makes it **fourteen missing of twenty-one**, and it is the one that would be
    worth naming first: at 2997 B against `@angular/core` alone it is the cheapest component in
    the package to take, which is precisely the sort of fact a first visitor reads a table for
  - _from the direction review:_ measured whole rather than counted — the page's **status
    paragraph** still describes a five-control form library, and the shipped multi-select,
    filtering, clearing and the virtual window appear nowhere on it. And the item is
    **promoted**: the gate and the regenerated table are a precondition of 3.1 (named there
    now), because the npm page is what the premiere ships to a stranger first
  - _the night before 3.0, the content half was paid first:_ the table names all 21
    secondary entrypoints, the status paragraph counts what ships, fourteen component
    sections exist with examples read off the sources (every binding name verified against
    its `input()`/`model()` declaration), and the root README's layout line points at the
    table instead of carrying a shorter copy of it
  - _and then the gate half, which closes the item:_ **`check-parts` point 7** reads the
    README's entrypoint table against the packed manifest it already holds — an entrypoint
    with no row fires, a row naming no entrypoint fires, a missing README fires. Two
    prepared cases (`readme-missing-entrypoint`, `readme-phantom-entrypoint`) are the
    negative control, both rejected on their own point among the 24; the point stands
    after the snapshot so `--write` keeps answering a drift with one command. The gate's
    verdict line counts the rows now (`22 rows on the npm page`), so the number a visitor
    gets is a number a machine reads on every commit

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
    first consumer report, whichever comes first
  - _notes:_ **the second component arrived and refused it for the same reason.** A progress
    bar has an obvious use for tones — a failed upload is not a finished one — and
    `pct-progress` ships without them, with the refusal written in its card: a tone painted in
    colour alone is a state carried by colour alone, and the second channel a bar could carry
    is the same four icon names the toast would need. Two components now stand on one unmade
    decision, which is what this item said would happen; what it changes is the trigger, since
    "the second component that wants a tone" has been met and the decision is still the right
    one to make once rather than twice

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

- [x] **4.18 — a guard the pointer makes unreachable, found by the mutant that survived it**
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
  - binds at: **the next full mutation run**
  - _notes:_ **closed at that run, the night before 3.0.** The guard is gone, the JSDoc
    that defended it now records the measurement that dissolved it, and the snapshot moved
    the way the deletion predicted: `tabs.ts 93.55 → 94.26`, two mutants fewer and one
    survivor fewer, with the 973-case unit suite green over the change. The full run also
    read `placement.ts 64(6) → 64(7)` over untouched code — 4.2's wobble in the clock
    column with the arithmetic cancelling, on schedule

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
    mutation score is used to argue that a component is well tested
  - _notes:_ widened by the direction review — the stylesheet is the same shape one file
    over. `.ts` is mutated, templates carry per-template coverage floors, `.scss` has
    neither: `check-styles` polices rule **patterns** (logical properties, forced-colours
    ordering), not promises, so a deleted declaration that a case depends on dies silently.
    The honest cheap version for both non-`.ts` halves is the recorded disarming per claim
    this item already names

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
    the five above
  - _notes:_ **the trigger fired sideways.** The progress bar needed the gate to see a
    `<progress>`, and that tag belongs on no list here: it is not focusable in any engine
    (measured) and carries no `role` attribute, so both of the gate's ways in were shut and a
    component whose only widget is a bar counted zero widgets — the accordion's `<summary>`
    story, one tag over. The answer was a **second** hand-written list, `NAMED_TAGS`
    (`progress`, `meter`), with `progress-without-inputs` as its control. So the count is eight
    curated tags across two lists now, and the item's complaint is not merely still true — it
    has been reproduced by the fix. What would settle it is the same for both lists: derive
    them from the platform's own tables rather than remember them
  - _notes, one component later:_ **the stakes went up without the list moving.** The skeleton
    added point 8 — a host hidden from the accessibility tree holds nothing focusable — and that
    point reads the very same `FOCUSABLE_TAGS`. So a tag missing from it used to cost one thing,
    a widget nobody could name; it now costs a second, a control the gate declares safe inside a
    subtree it knows is hidden. `<video controls>` in a skeleton is not a component anybody has
    written, and neither was a `<summary>` the week before it was
  - _notes, from the direction review:_ the count is **three** curated lists, not two —
    `COMPOSITE_ROLES` (nine entries) is the same shape beside `FOCUSABLE_TAGS` and
    `NAMED_TAGS` — and `contenteditable` belongs to the focusability check's attributes
    rather than to any tag list. Whatever derivation settles this settles all three from one
    source

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
  - **and the behavioural half now has a second component and a baseline.** With `/progress`
    added, two full suites came back `1364 passed, 1 failed`, and the failure both times was
    the calendar's arrow walk on a page this step never touched — `an arrow follows the writing
direction` expecting index 32 and getting 31 in the first, its right-to-left twin expecting
    30 and getting 31 in the second. The same spec run **alone** is green five times out of
    five. The reading that makes it evidence rather than a shrug is the baseline: the identical
    suite, with this work **stashed**, is `1313 passed` and **zero failed** under the same load
  - so a view added to the sandbox costs six re-recorded pictures AND, on this machine, one red
    behavioural case in a component nobody touched — the dialog's scroll lock last time, the
    calendar's walk this time. Both are cases that press or read one frame after an assertion
    that only names the cause ([`lesson-130`](lessons.md#lesson-130)), and what the extra row
    changes is where the page stands when they do. It is not fixed here for the reason this
    item exists: the repair is a page whose height the case decides, and that is a change to
    the sandbox's stage rather than to a component
  - **it happened again at the very next view, which is the whole of what "binds at: the next
    sandbox view" was for.** Adding `/progress` re-recorded the same six page-level baselines —
    `dialog-open`, `dialog-open-rtl`, `menu-open`, `popover-open`, `toast-stack`,
    `toast-stack-rtl` — beside the two the component actually earned. Two consecutive components
    have now paid a six-picture toll for one row in a navigation list, so the cost is not a
    one-off of the pagination's step but the standing price of adding a view
  - so a behavioural case, not only a picture, takes its answer partly from the sandbox's own
    chrome. That widens this item from "six baselines" to **a gate whose subject is the shell
    as much as the component**, and it is the more expensive half: a screenshot that moves is
    read by a person, and a scroll assertion that flips is read as the component's defect. The
    dialog case needs a page whose height it decides — content of its own, or a fixed
    `min-height` on the stage — rather than whatever the sandbox happens to be that week
  - **the third view in a row paid the picture toll and NOT the behavioural one**, and that is
    worth recording because it is what tells the two halves of this item apart. `/skeleton` re-
    recorded the same six baselines — the seventh row in the navigation, nothing else — and the
    full suite came back `1417 passed`, **zero failed**, in 20.1 minutes on the same machine
    that had one red case in each of the two steps before it. So the six pictures are a
    **deterministic** cost of adding a view, and the red behavioural case is a load-dependent
    one: the extra row moves where the page stands, and whether that matters depends on which
    worker is descheduled that minute. The repair is unchanged and so is the priority — a
    picture that moves is read by a person, an assertion that flips at random is read as a
    defect in a component nobody touched

- [x] **4.24 — the three-API promise names a gate that measures something else**
  - _closed the night before 3.0:_ the Gate line names the eight per-control interop suites
    now (plus `forms.spec.ts` for the signal-forms half) and says in place why it moved;
    `check-docs --write` rewrote the registry in the same step and stayed green
  - `req-api-signal-forms` cites `field-controls.spec.ts` and the e2e `forms.spec.ts` as the
    gate for "all three form APIs on the same control" — and neither file contains
    `formControl` or `ngModel` at all: the first tests `aria-describedby` wiring, the second
    is signal forms only. The real interop cases live in the per-control specs (the
    "compatibility with classic forms (no CVA)" blocks in `field.spec.ts`, `select.spec.ts`,
    `checkbox.spec.ts` and their siblings), and the requirement does not point at them
  - so deleting the interop tests would today fail nothing the requirement names — the exact
    silent class the axis forbids, standing on the requirement that carries the library's
    loudest bet
  - the repair touches the requirement's Gate line alone; `field-controls.spec.ts`
    legitimately gates three other requirements and keeps them
  - binds at: **before 3.1** — it is cheap, and the promise is the launch story · _notes:_ —

- [x] **4.25 — classic-forms interop is promised whole and measured for value alone**
  - _closed the night before 3.0, and by the happier of its two roads:_ the surface was
    measured and it **holds** — the framework's bridge carries `disable()` / `enable()` to
    the real control element and validity to `aria-invalid`, asserted now per composite
    (select ×2, checkbox, switch, radio group, slider; 972 unit cases green). The two
    boundaries that remain are fenced where they bite: `NG_VALUE_ACCESSOR` resolvers find
    nothing, recorded in [0005](decisions/0005-signal-forms-without-cva.md)'s refreshed cost
    section, and `<pct-date>` already warns under classic forms by design (`lesson-117`).
    0005's "bet on Angular's future" paragraph now also records the API's stabilisation
  - every "no CVA" case asserts two-way **value** sync and stops there: no spec anywhere
    calls `ctrl.disable()` or `markAsTouched()`, and none reads status propagation through
    `[formControl]` on a composite control. A native input under `pctText` falls back to the
    platform's own `DefaultValueAccessor`, which handles disabling; `pct-select` has no such
    fallback, so `disable()` against it is not provably broken — it is **unmeasured**, which
    the axis counts as the same state
  - the ecosystem cost is real and equally unmeasured: an integration that resolves
    `NG_VALUE_ACCESSOR` directly (the wrapper-library road) finds nothing to resolve
  - the road is one of two, and both are honest: measure the whole surface per composite —
    disable/enable, touched, status, then gate it — or fence the boundary in writing in
    [0005](decisions/0005-signal-forms-without-cva.md) and the consumer docs, so "works with
    reactive forms" cannot be read wider than what is held. Either way 0005's cost section
    predates the API's stabilisation: `FormValueControl` ships `@publicApi` in the Angular
    this library pins, which shrinks the risk it names and changes its shape
  - binds at: **before 3.1** — the boundary is written before a stranger reads the promise ·
    _notes:_ —

- [ ] **4.26 — one input block, eight hand-written copies, and only the names are checked**
  - the form-control quartet (`readonly` / `invalid` / `touched` / `errors`) is declared
    verbatim in eight controls. `implements FormValueControl` checks the member names; the
    **transforms and defaults** it does not — a ninth control missing `booleanAttribute` on
    `invalid` compiles and drifts silently, which is [`lesson-21`](lessons.md#lesson-21)'s
    shape standing at the public API
  - two roads: a host-directive carrying the block (it stands under nobody's template, so
    [0013](decisions/0013-no-headless-split.md) does not speak against it), or a structural
    gate over the eight declarations
  - binds at: **the ninth control that takes the block** · _notes:_ —

- [x] **4.27 — two meta-gates trust a fact about nx that nothing re-measures**
  - `check-docs` point 3 proves CI wiring by matching the `nx affected -t` **text** in
    `ci.yml` — presence in the string, not presence in the task graph, so a target whose
    project stops being affected stays green while never running
  - and every root-project gate stands on "the root project is affected by every change",
    measured once ([`lesson-47`](lessons.md#lesson-47)) against an installed nx and
    remembered since — a behaviour of a dependency, which `check-browsers` point 6 already
    re-probes for its own facts rather than remembers. The canary is three lines:
    `nx show projects --affected` over a known file, asserting the root is in the answer
  - binds at: **the next nx major**, or the first change to `check-docs` point 3 ·
    _notes:_ closed 2026-09-01, on the second trigger — point 3 had just been widened to
    read nightly.yml. The canary sits beside `ciTargets` and asserts more than the root:
    one probe over a leaf manifest (`libs/components/package.json`; `--files` measured
    to override the SHAs nx-set-shas exports, so the answer is about the graph, not the
    current diff) must mark all four owners of the wired targets affected —
    `components`, `sandbox`, `sandbox-e2e`, `@org/source` — which folds both halves
    above into one measurement: a root that stops hearing leaf changes and a leaf
    target that falls out of the graph fire the same rule. Proved in both directions:
    probed over `docs/plan.md` it fires naming the three missing projects; restored,
    the gate is green

- [ ] **4.28 — the axe audit's denominator is a hand-curated list of opened panels**
  - `a11y.spec.ts` says it in its own comments, three times over: "a panel that is not
    attached is a panel axe has nothing to say about" — and then opens, by hand, the panels
    it knows about. A new overlay component's open state joins the audit only if somebody
    remembers, which is the state the mutation inventory stood in before 4.11 inverted it
  - the stage list can be derived from an inventory the gates already own — the parts
    snapshot, or the sandbox's views registry — so a new open state is inside the audit by
    default and its absence is a violation rather than a silence
  - binds at: **the next component with an overlay panel** · _notes:_ —

- [ ] **4.29 — the date field's UTC promise is prose, and no run stands in a hostile timezone**
  - `day.ts` says "every day in this file is midnight UTC", so no arithmetic can cross a
    boundary — a design claim with no measurement behind it: no Playwright project sets a
    `timezoneId`, no unit case runs at a DST boundary, and the suite's machine is the
    timezone it happens to be
  - one override (`timezoneId: 'Pacific/Kiritimati'`, UTC+14 — the farthest a clock gets
    from the meridian) on the date spec plus one DST-boundary unit case is the negative
    control the sentence is missing
  - binds at: **the next change under `date/src`**, or the first timezone bug report ·
    _notes:_ —

- [x] **4.30 — six e2e cases measure the machine's fonts, and CI's machine has different ones**
  - the second CI run failed the textarea's width-follow case **in all three engines**, the
    skeleton's `1cap` bar in firefox, and two visual baselines (`field-aux-slots` and its
    RTL twin) — deterministically, twice running, while the same suite is green on this
    machine. The library sets **no font of its own** (no font-family token exists,
    checked), so every metric a case reads is a fact about whichever fonts the machine
    resolves `system-ui` to
  - **the family split in two under the knife, and only one half is fonts.** The sandbox
    pins a vendored face now (`public/InterVariable.woff2`, SIL OFL beside it; `visit()`
    waits on `document.fonts.ready`), which settles the four METRIC cases — and the pin's
    own first day is a lesson in the class it fixes: `app.scss` set `system-ui` on the
    application host, so the pin was silently overridden for the whole tree, three
    re-records produced byte-identical baselines across a font swap, and nothing said
    why until the fonts API was read from inside the page (`Inter var: unloaded`)
  - the two VISUAL baselines are a different defect wearing the same shirt:
    `visual.spec.ts` has pinned `Liberation Sans !important` since it was written —
    which is exactly why the Inter pin changed no pictures — so their CI red under an
    already-pinned face is **rasterisation**, freetype and hinting between two machines,
    not family resolution. The diff images died with the runner (no artifact step —
    repaired: `ci.yml` uploads the e2e output on failure now), and the first artifact
    ever read paid for the step at once: all 52 differing pixels sat inside one
    character — `ⓘ` (U+24D8), which Liberation Sans does not cover, so the pin handed
    exactly that glyph to each machine's symbol fallback. Neither of the two prepared
    answers fit — not CI-recorded baselines, not a tolerance: the demo now draws the
    ring in CSS around a plain italic `i`, and every code point the pair rasterises
    is inside the pinned face
  - binds at: **before the nightly run is trusted** — a red that fires every night on
    fonts buries the reds the night exists to catch · _notes:_ closed 2026-09-01, one
    run before the first nightly. Run 4 proved the Inter pin (the four metric cases
    green on CI), run 5 the glyph swap (the visual pair green in all three engines —
    the repository's first fully green run). One symptom, three causes: what the
    machine resolves `system-ui` to, a cascade override on the application host, and
    one uncovered code point — and no tolerance would have named any of them

- [x] **4.31 — the language gate's dictionary is whatever the machine has**
  - proved by the first two CI runs from both sides: no dictionary at all (ENOENT — the
    gate cannot start on a fresh runner), then a run where the verdict depended on which
    machine's lists read the file. The gate's own dead-entry rule couples the vocabulary
    to the dictionary VERSION: an entry one list flags and another does not is alive here
    and padding there, so the register itself cannot absorb a version split
  - the durable answer is the gate's own idiom applied to its biggest input: the
    dictionary becomes a **versioned, checksummed input** (vendored or fetched by pin)
    rather than an ambient fact of `/usr/share/dict` — the same move `check-browsers`
    made when it stopped remembering facts about engines
  - it bound earlier than its own trigger, on the input rather than the verdict: the day
    of the pin, one package name measurably served two lists — the Ubuntu rebuild and
    the `20240901-1` under it, one word apart (`email`, which the English subtraction
    absorbs) — the pool had already rotated the older file out of reach, and Debian's
    snapshot knows no such source at all, so a verdict split was only a question of
    which runner image moved first ·
    _notes:_ closed 2026-09-01. Vendoring lost to **fetch-by-pin** on arithmetic (the
    Polish list is 61 MB); `tools/dictionaries.lock.json` pins both packages by sha256 —
    the URL is a courtesy, the hash is the identity — and `tools/restore-dictionaries.mjs`
    restores them into untracked `tools/.dictionaries/` in nothing but the standard
    library: fetch, `ar`, zstd out of `node:zlib`, tar, a hash at BOTH ends, so any
    parsing fault lands as a loud mismatch and a tampered cache is a refetch rather than
    an error (measured: cold 4.1 s, warm 0.35 s, one flipped byte healed on the next
    run). The apt steps left both workflows for an `actions/cache` keyed on the lock's
    hash, and the gate now runs on machines that never had a `/usr/share/dict` at all —
    decision 0040's split, applied to the gate's biggest input

## 5. Gaps with no deadline

Waiting for the trigger written in their **Binds at** field. They are not forgotten — they
are deferred.

- [ ] **5.1 — `req-api-number`**: property tests for the parser (`parse(format(n)) === n` for any
      `n` and locale). Binds at the first locale outside `pl`/`en` — and **widened by the
      direction review**: the parser is no longer the richest invariant surface here. The
      pagination's fold, the overlay's placement and the date's day arithmetic are pure
      algorithms with statable invariants (a strip strictly increasing with pinned ends, a
      day that round-trips), enumerated today by hand-picked walks; a property sweep over
      them is also a mutant-killer aimed at the snapshot's lowest rows, and those three bind
      at their next surviving mutant rather than at a locale
- [ ] **5.2 — `req-project-files`**: a check on the entrypoint directory layout. Binds at the first
      component added by somebody other than the author of the rule
- [ ] **5.3 — `req-token-directive`**: a theme directive instead of a hand-written `data-theme`.
      Binds once setting the attribute from a template starts repeating
- [ ] **5.4 — `req-token-density`**: the DTCG sources contain **not one** density token. Binds once
      the size axis settles — note that density will go below the touch-target threshold, so it
      has to arrive together with a gate, not before one
- [ ] **5.5 — `req-project-concise`**: the prose volume budget per file, in the idiom of the
      size snapshot. Binds at the close of the compression pass — **not earlier**, for
      [`lesson-49`](lessons.md#lesson-49)'s reason: a snapshot laid on today's headers would
      freeze them as the accepted state

**This file has no gate, and it showed.** The rewrite that shrank the plan to a working set
also cut it mid-sentence — 5.4's last line was lost, and the file ended on "so it" for six
commits with nobody noticing — and the same rewrite orphaned `req-project-concise`: the
seventh gap, owned by no task while [State](#state) said all seven were owned. Both were
found by the direction review and repaired above. The lesson is the axis's own, one floor
up: a plan that lies does it silently, and the session-start `check-docs` counts are the
only reading that ever catches it — so the counts are checked at the start of a session,
and the tail of this file is part of what a rewrite has to hand back.
