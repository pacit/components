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
| requirements                                |    94 |
| ✅ enforced                                 |    74 |
| 🟡 partial (deliberately without a control) |    16 |
| ⛔ gap                                      |     4 |

All 4 gaps have an owner below — in sections 2 and 5. If adding a requirement raises the gap
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

**2.1's boundary was reopened on 2026-09-02, the day after 1.1 closed.** The MVP's content
core stands; the face around it stopped being optional. The maintainer's bar for the first
visit is the best sites in the ecosystem, and the site is to be built from the library it
documents — so the gap between those two sentences is library work before it is site work:
a `layout` entrypoint, the button's new faces, the theme directive whose own trigger has
now fired. The design lives in [`site.md`](site.md); the execution is 2.1.1–2.1.8, in
order, "next step" meaning the first unchecked box.

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

- [x] **1.1 — the rest**: toast, tabs, accordion, drawer, pagination, progress, skeleton, chips,
      avatar, badge, breadcrumb, stepper, tree — **all thirteen built**, each with a decision,
      a full three-engine gate and a mutation row
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
  - mutation: `breadcrumb.ts` **92.00 23(0) 2 0 0**, after a correction round the first
    full run demanded — it read 73.33 with eight survivors, six of them FRAGMENTS of
    concatenated warn strings plus the landmark label's own default, which no
    arrangement exercised. The warns are single literals now (one string is one mutant,
    and any asserted word kills it) and the unbound arrangement asserts the default.
    The two left are named: the seventh `isDevMode()`-forced-true in a row, and `?.` on
    a parent no rendered host lacks
  - _the stepper is done_ (12 of 13). It is **a map of a journey the application steers**
    — 0048's ownership split walked one component further: the application hands the map
    ONE 1-based number, the DOM order numbers the steps, and every state is computed
    (before it done, at it current, past it upcoming; nothing clamped, nothing written
    back, no event — a map does not move the traveller). It **stamps
    `aria-current="step"` where the breadcrumb refused to write `aria-current="page"`**,
    and the two records agree underneath: the attribute belongs to whoever holds the
    truth — there the router, here the input that already said it. See
    [0055](decisions/0055-a-stepper-is-a-map-of-a-journey-the-application-steers.md)
  - **done is audible, and it is content, not name**: the check is an `aria-hidden`
    drawing, so `texts().stepDone` rides after the label inside the listitem — whose
    accessible NAME is empty by specification, because `listitem` computes none from its
    contents. The first cut asserted the name and measured the absence of a computation
    ([`lesson-140`](lessons.md#lesson-140)); the suffix's leading space is an
    interpolation, the badge's whitespace lesson at its second component
  - gate: `apps/sandbox-e2e/src/stepper.spec.ts` (6 × 3) plus `/stepper` in the audits,
    a forced-colours reading (the border keeps the circles, the check keeps done, the
    weight keeps current), an RTL reading where the journey descends the other way with
    no rule to help it, two screenshots and 13 unit cases
  - mutation: `stepper.ts` **89.80 44(0) 5 0 2**, the five named: the `||` in the state
    guard (equivalent by invariant — no row ⇔ ordinal 0, so each half implies the
    other), the whole guard forced false — **killed by hand** with the
    runtime-equivalent edit and a red test, surviving only Stryker's per-test
    attribution, so it is recorded as the runner's artifact and not the suite's hole —
    the eighth `isDevMode()`, `?.` on the same never-null parent, and a DI token's
    debug label no behaviour reads
  - _the tree is done_ (13 of 13 — **1.1 closes**). It is **a walk the platform does not
    have**: the first component of the tail that could not refuse the keys, because the
    APG Tree View is one tab stop with a roving focus and no element walks a hierarchy —
    so the walk IS the component, and everything else is refused ownership (the markup is
    the hierarchy, each branch owns its `expanded`, the tree owns one `selected`). The
    inline pair swaps under RTL by the computed direction AT the keypress, measured with
    real keys in three engines. A folded branch is `hidden="until-found"` — 0045 carried
    whole, an `@if` being wrong twice (a destroyed subtree forgets its own state, and
    text not in the document cannot be found). See
    [0056](decisions/0056-a-tree-is-a-walk-the-platform-does-not-have.md)
  - **the probe and the tools both taught something.** The probe: `treeitem`/`group` on
    custom elements needs no hand-written `aria-level`/`posinset`/`setsize` (clean ×3),
    and the `lesson-138` carve-out extends to `tree` — an empty tree is legal, the role
    static. The tools: an until-found subtree's role-visibility differs by engine, and
    Playwright's `toBeHidden` is not the platform's `checkVisibility()` — WebKit paints
    nothing there while the locator says visible
    ([`lesson-141`](lessons.md#lesson-141)); the assertion now asks the platform
  - **the walk is the library's third private movement machinery** (the select's list,
    the menu's walk, now this) — `lesson-21` said "before the second", so the extraction
    into `core` (the behaviour-layer precondition below 1.2) now has three consumers
    waiting and typeahead deliberately arrives WITH it, not as a fourth copy
  - gate: `apps/sandbox-e2e/src/tree.spec.ts` (7 × 3) plus `/tree` in the audits, an RTL
    reading where the indent mirrors and the walk swaps under real keys, a
    forced-colours reading (the chosen row in the palette's own highlight pair), two
    screenshots and 21 unit cases — three of them born in the mutation round: back on a
    CLOSED branch climbs, a walk past either end stays put, and removing the active
    item hands the roving `0` to the first visible survivor
  - mutation: `tree.ts` **93.28 111(0) 7 1 4**, the seven named in three families: a
    leaf's fold state has no witness by construction (two mutants — the pointer's
    toggle and forward-on-a-leaf both write a model nothing renders), guards whose
    breach the zoneless `ErrorHandler` swallows into the same rendered picture (the
    empty-walk return, a loose item's calls), the ninth `isDevMode()`, and the token's
    debug label. The library is **4615 mutants at 82.82** — the day added just over two
    hundred and moved the total up 0.42

- [ ] **1.2 — table / datagrid** on a headless core (column model, sorting, filtering, grouping,
      selection as signals) separated from rendering. **The last item of the phase** — the only
      one counted in months rather than days; until the decision in
      [0016](decisions/0016-mit-irreversibility.md) is made it does not exist as a commit either,
      because the root `LICENSE` covers the whole repository

## 2. The trust surface

**2.1 is a precondition of the premiere (3.1)**, not a nicety after it: a package whose
first visitor has nowhere to read what it does is published too early. It is **not** a
precondition of the quiet push (3.0), which no visitor can see.

- [x] **2.1 — `apps/docs`** → closes `req-project-apps` and `req-project-layout`. Renders the
      **generated** inventories of parts and tokens, not hand-written ones. _Closed
      2026-09-02 — all eight steps landed in one day (2.1.1–2.1.8 below carry the
      measurements); what remains around the site is deploy (3.1's decision) and the
      library work it surfaced (4.33)_
  - **the boundary was reopened by the maintainer on 2026-09-02, the day after 1.1
    closed.** The content core below is unchanged and still names everything the premiere
    needs; what stopped being optional is the face around it: the first visit has to read
    as the best library in the room — angular.dev's motion and identity, primeng.dev's
    live examples beside their code — and the site is built **from the library it
    documents**, which turns its missing pieces into library work first. The design, page
    by page, is [`site.md`](site.md); the steps below execute it in order, each one
    committable and gate-green on its own. The old "and nothing more" guarded against a
    second product; that guard is now the step list itself, which is finite and ends
  - the content core, as stated at the review: the generated inventories, the component
    cards rendered as they stand, a theming page carrying the token inventory, the support
    policy and the forms-interop boundary (**4.25**)
  - [x] **2.1.1 — the layout entrypoints**: `pct-container`, `pct-stack`, `pct-grid` —
        **three entrypoints, not the one `layout` first drawn**: a component token's first
        word must be a real entrypoint (`check-tokens` point 3), and 0057 records why the
        gate is right. No ARIA at all, no media query anywhere, and the proof is a ruler
        in three engines: the cap and the centring, the gutter's clamp read at both ends
        (40px → 16px), the gaps 8/16/24 measured between real boxes, the column count
        falling to one at 375px, and the scoped token packing more columns than the
        default (`req-token-scoped`, live). _Landed 2026-09-02:_ unit **1080** passed
        (8 new), e2e **1665 of 1668** — the three reds measured one by one: the tree
        focus case green in isolation (load flake); `drawer-docked` red against a
        baseline the update pass itself caught mid-settle — HEAD's baseline
        restored, twice green, the new route never reached that page shot; and the WebKit
        dialog scroll-lock coin toss now standing as **4.32**. Sizes: `./grid` **673 B**
        — the smallest entrypoint in the package — `./container` **717 B**, `./stack`
        **879 B**, all three on `@angular/core` alone. Mutation, targeted: **one mutant
        in the three files, killed** (stack's `'md'` default); container and grid
        generate none — a component that is one declaration offers Stryker nothing to
        break — and both stay in the policy so the day they grow logic, the report owes
        a row. _The day's shared full run (68 min, `--concurrency 4`) confirmed all of
        it in the snapshot: `stack.ts` **100.00 1(0)**, no rows for the other three, the
        library at **82.82, 3823/4616**_ · cost: ~1 day, spent as estimated
  - [x] **2.1.2 — the button's new faces**: `ghost`, `soft` and the animated `hero` —
        five faces, one directive, **not one new line of TypeScript** (the union widened,
        the stylesheet grew; zero new mutants by construction — 0058). The gradient lives
        in the semantic tier as a role with a pair (`--pct-hero/-via/-to`, `--pct-on-hero`),
        so the pair rule itself delivers the sentence: **a gradient is three contrast
        checks, not one — 5.17, 5.70, 5.36**, printed by every build, both themes; soft is
        `primary-100/-200` with its own text (5.49/4.72 light, 6.14/4.72 dark, tint
        inverted). _Landed 2026-09-02, measured:_ unit **1081**; the targeted e2e set
        (preferences + forced-colors + full visual) **155 of 155** — the drift reads 8 s
        plain and **0 s frozen** under reduced motion (the spinner slows, the drift
        stops: information against decoration), the hero's gradient reads
        `background-image: none` under forcing (an image survives colour-forcing, so the
        stylesheet drops it by hand) and the three boundary-less faces read a
        `ButtonText` edge in all three engines. Baselines: `button-variants` ±rtl grew
        the three faces; infinite animations are cancelled to frame zero by the
        screenshot assertion itself, so the drifting surface stays a deterministic
        picture. (And 2.1.1's "smallest entrypoint" held for two hours: `./theme` landed
        at **518 B** the same afternoon) · cost: ~1 day estimated, ~half spent — paint is
        cheaper than machinery
  - [x] **2.1.3 — the theme directive** → closed `req-token-directive`, and the trigger
        had fired earlier than the plan thought: the sandbox already wrote `data-theme`
        by hand in three places before the docs app could become the fourth. `PctTheme`
        is one host binding and three refusals (0059): the mechanism stays the cascade,
        `null` removes the attribute so the system speaks again, and no persistence —
        policy belongs to the application. The demo stage now drives every themed card
        through the directive; the kitchen-sink's raw panel deliberately stays raw as
        the control's other half, and the e2e case reads the same `--pct-surface` from
        both writers. _Landed 2026-09-02:_ unit **1084** (3 new), the registry moves
        **7 gaps → 6** and enforced **64 → 65** · cost: ~0.5 day, spent as estimated
  - [x] **2.1.4 — the scaffold**: `apps/docs` + `apps/docs-e2e` — **static by
        construction** (0060): every route prerenders, and the first build's
        `index.html` carries the headline, thirteen `pct-container`s, seven `pct-grid`s
        and the hero CTA before any script runs (read with grep, not assumed). The shell
        is the library's first page — container, ghost button, `[pctTheme]` with the
        localStorage policy exactly where 0059 sent it — and the drawer deliberately
        waits for the nav that would fill it (2.1.7). `req-project-apps` closes enforced,
        `req-project-layout` closes partial: the registry stands at **66 / 16 / 4**.
        _Landed 2026-09-02, measured:_ docs-e2e **12 of 12 in three engines** — and the
        suite earned its keep before its first commit: the reload case caught the theme
        policy erasing its own stored choice (the persisting effect ran before the
        `afterNextRender` read — the fix is a synchronous read at construction, and the
        defect died deterministic in all three engines). Copying the app tree also
        taught the reach gate's bare-name rule the hard way: **lesson-142**, eight files
        dark on both sides of the copy, anchored by full paths in each `project.json` ·
        cost: ~1 day estimated, ~half spent
  - [x] **2.1.5 — the content pipeline**: one dependency-free pass
        (`apps/docs/tools/build-content.mjs`, a cached `content` target the build
        depends on) reads the cards, the parts and token snapshots, the registry and
        the mutation snapshot → typed `DOCS_CARDS` + `DOCS_EVIDENCE`, and **`llms.txt`
        with the machine catalogue (`components.json`) fall out of the same pass**
        (2.5, co-built as ordered below — an agent reads the same inventory the pages
        render). _Landed 2026-09-02, measured:_ **33 cards, 119 parts, 465 component
        tokens** lifted; the evidence numbers guard themselves — a count the parser
        cannot read throws the build ("a page must never show a number nothing
        measured"), and the tripwire fired twice during writing (the registry's bold
        `**86**` and its three-column rows) before the first green pass. Deliberately
        parserless: the cards are a form, not prose, so the form's own lines are the
        API; **highlighting (shiki) moved to 2.1.7 with the rendering it serves** —
        data is not the place to paint code · cost: ~1 day estimated, ~half spent
  - [x] **2.1.6 — the landing**: the gradient headline, live components instead of
        screenshots, the **accessibility-led** evidence strip reading **tracked files
        only** — a number nothing generates does not appear. Recalibrated on the
        maintainer's review of the sketch: WCAG earns the front, the build machinery
        moves to `/trust` (site.md records the reasoning, and the wording stays
        "machine-audited to WCAG 2.2 AA" until 2.2's ACR earns the stronger sentence —
        0061 makes that a law with a gate: the suite asserts the strip never says
        "conformant"). _Landed 2026-09-02, measured:_ docs-e2e **36 of 36 in three
        engines** (8 new landing cases; the strip↔repository agreement test re-reads
        the same tracked files the content pass reads and expects the page to match —
        197 contrast checks, the 24px floor, the mutant count), the headline's drift
        reads **8s plain and 0s under reduced motion** off the one motion token, and
        forced colors hands the text back to `CanvasText` (the gradient survives
        forcing as an image while `transparent` keeps its alpha — the button's lesson,
        repeated by the headline). The content pass grew the two a11y numbers with a
        third tripwire; the prerendered `index.html` carries the whole strip, the 4616
        teaser, the 33-card gallery and the live cards' first frame before any script
        (grep, not assumption). The landing chrome compiles to 4.85 kB, so the app's
        `anyComponentStyle` warn line moved 4→6 kB (the 8 kB error stands) — recorded
        here, not hidden · cost: ~1 day, ~half spent
  - [x] **2.1.7 — the pages**: `/components/:id` (demos whose code tab shows their own
        source, parts and token tables), `/start`, `/theming`, `/trust`, `/support`.
        _Landed 2026-09-02, measured:_ **39 routes prerendered** — six pages plus one per
        card, the parameterised route naming its pages from the same generated inventory
        the pages render. The machinery is 0062's: a ~150-line **form renderer** (no
        markdown engine — an unknown construct renders as escaped text) plus **shiki at
        build time** (one HTML, both palettes, zero highlighter shipped), and one
        link-rewriting law that lands every card citation on a /trust anchor — the dist
        carries **86 `req-`, 62 `adr-` and 142 `lesson-` anchors** (counted, not
        assumed). **33 demo files** each double as the page's pixels and its code tab;
        the demo lazy-loads inside a `PendingTasks` span, so the button page's static
        HTML ships its hero button before any script (grep). The shell grew the nav and
        the drawer 0060 deferred, the landing's CTAs and gallery wired themselves to the
        new routes, and the 33 cards traded their "docs page — gap" rows for the real
        address. docs-e2e: **66 of 66 in three engines** (10 new cases), and two red
        runs earned their keep first: the dialog demo's "Close" collided with the
        dialog's own close button (strict mode — the demo now says "Done"), and a shut
        drawer is `hidden="until-found"` — a box Playwright calls visible, so the
        assertion reads the library's contract instead. Named costs: `<button
routerLink>` CTAs until `a[pctButton]` exists (**4.33**), `select.scss` 7.69 kB
        against the app's 6 kB style warn — the library's heaviest sheet, now printed by
        every docs build · cost: ~1.5 days estimated, ~half spent
  - [x] **2.1.8 — the bar, measured**: axe over every route in three engines, hydration,
        visual baselines light and dark, Lighthouse read before anything is published,
        SEO plumbing. _Landed 2026-09-02, measured — and the bar bit the hand that built
        it, which is the point:_ the route sweep (`apps/docs-e2e/src/routes.spec.ts`: **39 routes × both
        colour schemes × three engines**, each visit also demanding a silent console) failed /start on
        its first run — shiki's stock `github-light` paints tokens at **3.48:1**, so
        the site now highlights with the high-contrast pair; then Lighthouse (which
        prefers dark) caught two unstyled links at **1.89:1** on the dark surface that
        the light-only sweep could never see — the sweep runs both schemes since, and
        one of the two fixes taught the `[innerHTML]` scope lesson (a page's scss
        cannot reach injected markup; `.docs-prose` can). Full-suite contention then
        surfaced the hydration window: a swallowed switch click and three
        "never-stable" screenshots — answered the sandbox's own way, a
        `data-docs-ready` marker after `whenStable()` with every spec entering through
        `visit()`, and viewport shots instead of full-page stitching (the sandbox's
        law, re-measured here). **Lighthouse, static build, mobile-throttled:** `/` —
        performance **72**, accessibility **100**, best practices **100**, SEO **100**;
        `/components/button` — **71/100/100/100**; **CLS 0** both (was 0.156 — the
        lazy demo re-rendering through hydration collapsed an unreserved stage; a
        10rem floor holds it), TBT ≤180 ms; the perf lever left on the table is named:
        ~121 kB of estimated-unused initial JS and a throttled LCP of 5.6 s — future
        perf work (2.3's idiom), recorded before anything is published on the page.
        SEO: per-page descriptions + `og:` mirrored into the prerendered HTML, the
        font preloaded, `robots.txt` shipped; **deferred with the domain 3.1 decides:
        `sitemap.xml`, `og:url`/`og:image`, canonicals** — recorded, not faked with a
        placeholder host. Four viewport baselines (`apps/docs-e2e/src/visual.spec.ts` — landing and
        the button page, light and dark), twice green in isolation and green under the deciding full run:
        docs-e2e **304 of 304** (7.3 min) · cost: ~0.5 day, spent as estimated
  - the typed token names (`PctTokenName` / `PctCssVar` in `libs/tokens/dist`) never leave the
    repository, so a consumer retheming past the one brand variable reads shipped CSS; a
    `./tokens` entrypoint or the rendered inventory is the same move the icon names already
    made, and it belongs here or to 2.4 — both read the same source
  - the dev-mode warnings are rich and unindexed — an id per warning, extracted from sources
    the text gates already parse, makes every warning an address a consumer can search for
- [~] **2.2 — ACR / VPAT** out of the existing gates — you get the machine proof earlier than the
  document, which is the reverse of the industry norm (the EAA enforceable since June 2025,
  EN 301 549 in tenders)
  - _from the direction review:_ the document's inputs include **a recorded
    assistive-technology pass** (NVDA and VoiceOver over the sandbox views, logs kept). The
    a11y gates end where axe ends — DOM and CSS — and an ACR claiming screen-reader support
    with zero AT runs behind it is a promise without a gate, published to the exact audience
    that will check
  - _notes (2026-09-05):_ **the machine half landed; the pass is what remains.**
    `docs/acr.md` is rendered by `tools/check-acr.mjs --write` from `docs/acr/claims.json` —
    one row per criterion of WCAG 2.2 at A and AA (55), in the ITI template's tables, each
    resting on what already runs: a gate's numbered point, a case's title in a spec, a
    sentence in a source, a scan over the library's templates and stylesheets for what the
    criterion forbids, or the cards' own Checks rows summed (2.1.1 is the 33 keyboard rows,
    2.5.8 the 33 touch rows). The gate holds every citation — a renamed case, a closed
    finding, a gate that left CI, a `<video>` in a template all fire — and compares the
    rendering byte for byte; sixteen prepared inputs prove it. The count on the day: 28
    Supports, 4 Partially Supports (1.3.1 and 4.1.2 on 4.8's empty listbox, 1.3.5 on the
    number field's `autocomplete="off"`, 2.2.2 on the `hero` drift), 19 Not Applicable (six
    proved by a scan), 4 Not Evaluated (1.4.4, 1.4.10, 1.4.12, 2.4.11 — no gate, owned by
    4.37), 0 Does Not Support. _Not Evaluated_ at AA is the report's one deviation from the
    template, stated in its own section: a row nothing measured says so. `req-a11y-acr`
    puts it in the registry (87 promises, 67 enforced); the site renders it at `/acr`, linked
    from /trust, with 0061's wording law untouched — the landing still says
    "machine-audited". **What remains is the assistive-technology pass**: NVDA with Firefox
    on Windows and VoiceOver with Safari on macOS over the sandbox views, logs under
    `docs/acr/at/`, a reading in every card's `Screen-reader log` row (19 rows exist, all
    gaps; 14 cards have no row). None of it can run on this machine; point 7 of the gate is
    armed for the day `recorded` flips to `true`, and Orca on this Linux box is a third
    reader worth a log of its own. Deciding run: docs-e2e **355 of 355** in three engines
    (the `/acr` route joined the axe sweep in both schemes, and the trust page's link is
    walked)
- [x] **2.3 — benchmarks as a published number** + a performance regression that fails CI
  - _notes (2026-09-05):_ **the cost run and its gate.** `nx run docs:bench`
    (`apps/docs/bench/previews.bench.ts`) renders every card's preview — the demo the page
    shows — in jsdom and reads five things per scene: elements, depth, listeners held,
    renders to settle, and microseconds from creation to stable; `tools/check-bench.mjs`
    (`check-bench`, in CI) holds the record `apps/docs/bench.snapshot.md` to it. **The design
    is 0023 applied to performance**: the four counts came out identical in two consecutive
    runs and are held exactly, both ways, so a wrapper added, a listener leaked or a second
    render pass is red until written down beside its change; the clock moved by up to 15%
    between the same two runs and is therefore published, dated and attributed to its
    machine, and compared by nobody — a band on it would be flaky or blind, and a band on
    the counts would only let the record age. Seventeen prepared inputs prove the six points
    (among them a drop of one element, which fails exactly as a growth does). The page shows
    the reading in its Evidence tiles (`data-testid="cost"`, the fifth tile; docs-e2e reads
    the same file the content pass reads and holds the tile to it), `req-quality-benchmark`
    puts it in the registry (88 promises, 68 enforced). Measured on the day: **450 elements
    and 175 listeners over 33 scenes**, three of them settling in two passes — a finding
    with an address (4.38), not a number to hide. **What this is not**: a browser number.
    jsdom lays nothing out, so the clock is the library's own work; what an engine adds
    scales with the first two counts, which is why those are the ones held · cost: ~half a day
- [x] **2.4 — DTCG ↔ Figma / Tokens Studio bridge** — the source of truth is already DTCG, an
      unused advantage
  - _notes (2026-09-05):_ **the bridge and its gate.** `libs/tokens/bridge.mjs` writes the
    sources as the multi-file layout Tokens Studio syncs to (`nx run tokens:bridge` →
    `dist/tokens-studio/`: 32 sets in the plugin's DTCG dialect, `$themes.json` with light
    and dark on a scheme axis and full and reduced on a motion axis, `$metadata.json` in the
    build's resolution order) and reads the plugin's export back (`bridge.mjs import <dir>`),
    writing a changed value or description into the token it belongs to and nothing else.
    **The law is 0020's**: a set, a name, a type and a modifier are decisions made here, and
    the import refuses them in four sentences. Shadows and easings are CSS in the sources and
    objects in the plugin — translated both ways, and a value that comes back unchanged leaves
    its text exactly as it stood, so the round trip is the identity byte for byte.
    `tools/check-bridge.mjs` (`check-bridge`, in CI) holds six points — sets, dialect,
    references per theme, themes, the round trip, the three refusals measured live on a
    doctored export — and sixteen prepared inputs prove them; `req-token-bridge` puts it in
    the registry (89 promises, 69 enforced). **Two things the run taught**: `JSON.parse`
    puts `200` before a `$comment` that stood between `100` and `200` of a ramp, so the
    first "no-change" import rewrote `primitive.json` and the bridge got an order-keeping
    parser of its own; and two cases had to be aimed twice (the README says where). **Not
    done, and named**: nothing here talks to Figma's REST variables API — the plugin is the
    road, the folder is the interface; and the typed token names (`PctCssVar`) still leave
    the repository only through the site's inventory, which the 2.1 note already records ·
    cost: ~half a day
- [x] **2.5 — a surface for AI agents**: `llms.txt`, a machine-readable component catalogue from
      the same source as the docs, canonical examples
  - built **with** 2.1, not after it: the catalogue falls out of the same generators the site
    renders, and locale packs for the `PCT_TEXTS` keys (a dictionary per language is an
    afternoon, and drift is a type error) share the generator. Being the first library an
    agent can verify claims about is this repository's own axis, worn outward
  - _notes (2026-09-05):_ **the catalogue grew up, and the dictionaries stayed the
    consumer's.** `components.json` is one object now: every component with its canonical
    usage and examples as text (the card's fence and the demo files the pages run), its
    API with types and defaults, parts, tokens with both themes' defaults, keyboard map,
    the `texts().key` reads scanned from its sources and templates, and its evidence with
    the cost record of 2.3; the `PctTexts` channel with the meaning of every key (its
    JSDoc), the English default, which components read it, and a template typed against
    the interface; `llms.txt` carries the usage beside every component and the channel in
    prose. **Locale packs are not shipped, and the reason is a gate, not an afternoon**:
    `check-language` measures the built package for one language with no register at all
    and calls a register that could excuse a directory "the second language's way back
    in" — a Polish dictionary under `libs/` would need that gate to grow the hole it was
    built not to have, and a German or Spanish one the maintainer cannot review would ship
    under the library's name. So the generator emits what makes the afternoon short — the
    keys, their meanings, the defaults, the template — and the type makes drift a compile
    error where the dictionary lives. **The tripwire**: the content pass throws on a key
    with no meaning or no default, a default with no key, a card with no usage, a preview
    with no cost; docs-e2e reads the cards on disk and the channel's source and holds the
    served file to both, every documented address answering. `req-api-catalogue` puts it
    in the registry (90 promises, 70 enforced). Deciding run, after 2.3, 2.4 and this:
    docs-e2e **361 of 361** in three engines (the first pass had the landing's two
    baselines to rewrite for the AI tile's new line, and one webkit timing under full-suite
    load that is green alone) · cost: ~a quarter of a day
- [x] **2.6 — `@pacit/components/testing`**: consumer-facing harnesses on the `data-pct-part`
      contract
  - the parts are already a snapshot-gated public surface, so a harness per card is thin and
    gate-able the way the cards are; before this the only helpers were explicitly unpublished
    (`libs/components/testing/src/dom.ts` said so in its header) and a consumer re-derived
    by hand the selectors the library treats as contract. A library that ships promises
    should ship the instrument a consumer's own suite holds them with after an upgrade
  - _notes (2026-09-05):_ **shipped, as declarations held to the package.** The entrypoint
    carries 51 harnesses on the CDK's `ComponentHarness` — one per component and directive a
    card names, each four lines: the host selector, verbatim the class's own, and the parts
    it draws, with the union type an editor offers after `part(`. The base has five methods
    (`part`, `parts`, `has`, `text`, `state`) and `with` for the CDK's filters, and no
    `open()` anywhere, on purpose
    ([0068](decisions/0068-a-harness-is-a-declaration-over-the-parts-contract.md)).
    `check-harness` (six points, 17 prepared inputs) reads `ɵcmp` after linking the way
    `check-parts` does and holds every declaration in both directions, the declared union to
    the list, and the cards' new **Harness** rows to the names — the row the page renders
    under Parts and the catalogue carries under `harnesses`, with a `testing` section of its
    own and a paragraph in `llms.txt`. The old test-only helpers (`part`, `allParts`,
    `query`) are published from the same entrypoint. **What it moved elsewhere:**
    `check-bundle` had no way to see an entrypoint with no component of its own — its
    presence read is a selector in the bundle's text, and a harness's `hostSelector` is every
    component's selector as data — so the gate grew a declared `PLAIN` list (`silent` for
    primary, `quotes` for `./testing`), declared rather than computed because a computed
    exemption would blind the gate the day the linker stopped attaching `ɵcmp`; four
    prepared inputs hold the declaration (29 now), and the size row reads
    `./testing 7998 - @angular/cdk/testing`. Coverage counts `testing/` now — the skip's
    reason died with the entrypoint; the mutation run keeps its exclusion with a reason of
    its own. `req-api-harness` puts it in the registry (91 promises, 71 enforced). Unit:
    **1150 of 1150**; every fast gate green. Deciding run for this step: docs-e2e in chromium, **120 of 120** over the pages, landing,
    routes and shell specs (118 on the first pass against a dev server compiling its first
    requests — the two landing timings, green alone) and the visual spec 4 of 4 with not one
    baseline moved, the harness line standing below the fold of the button page's viewport · cost: half a day
- [x] **2.7 — the component page, redesigned to the approved sketch** — the reviewer's second
      item (2026-09-03): "the worst-looking part of the site". Two static sketches were
      shown before a line of code moved (the rule he set); the decision is the second
      sketch's character with the first one's tables — layout B (a component index on the
      left, the page, a pinned table of contents on the right), ONE long page rather than
      top tabs, JetBrains Mono as the vendored code face, the accessibility gaps shown in
      public beside the measurements. _Closed 2026-09-05 with its last two steps, 2.7.4
      and 2.7.5; seven steps in all, the two reviews included, and the page it leaves
      behind is the one the sketch promised._
  - [x] **2.7.1 — the strip's scrollbar** — the reviewer's guess was right: `pct-tabs` always
        showed a scrollbar at the strip's end, and scrolling it by a pixel thickened the
        chosen tab's edge. Library fix under the full regime, and first, because the page's
        Preview stands on this component. _Landed 2026-09-03 (`fix(tabs)`): the cause was one
        pixel of `margin-block-end: -1px` pulling the chosen edge onto the strip's rail — inside
        a scroll container that pixel is content, so every strip carried a one-pixel scrollbar
        across its own axis (lesson-144). The edge now sits inside the tab's box, the vertical
        strip loses the same trick on the inline axis; `tabs.spec.ts` asks the question no
        suite had asked (a strip scrolls along its axis, never across it) — 101 cases green in
        three engines, three sandbox baselines and the docs' button page regenerated for the
        pixel that moved._
  - [x] **2.7.2 — the page's data** — the content pass grows the readers the design needs:
        the API read from the SOURCE (inputs, models and outputs with their JSDoc, the host
        bindings, the entry point's exports), the tokens with a `$description` and their
        defaults resolved for both themes, the card's new fields and sections (`Category`,
        `Usage`, `Parts`, `Theming`), the examples as demo files with a title line, the
        per-component evidence (mutation, e2e cases, colour pairs, baselines) and the Checks
        table read as a scorecard. Every reader tolerant today, a tripwire the day 2.7.4
        closes. _Landed 2026-09-03: `build-content.mjs` is a scanner, not a compiler — it
        reads `readonly x = input<T>(default)` lines with the JSDoc block that ends right above
        each, the decorator's `host` object, the entry point's `export` lines and the `extends`
        chain (Select's inputs live on `PctSelectBase`; the first cut missed the base class
        because Prettier wraps `extends` onto its own line, and read 2 members where there are
        26). Measured on the tree: 252 API members over 33 cards, 33 previews, 5 examples,
        the button's 19 tokens resolved to both themes; 799 readings the sweep still owes,
        counted per card, and one card in STRICT (`button`) that has to read whole or the
        build fails. Two scanner lessons paid for at once: a bracket scanner has to skip
        comments (the library's comments are prose, and prose holds braces), and the
        examples follow the registry's order, not the directory's._
  - [x] **2.7.3 — the page** — header with a spec line, Preview first on `pct-tabs` (dark
        stage, RTL, copy), Usage, Examples with the prose beside the stage, API tables,
        Styling tables, the Accessibility scorecard, Evidence tiles, the table of contents
        with a scroll spy, the index with a filter and its copy in the drawer; container
        queries on the content column, not viewport queries (the reviewer caught three
        columns arriving too early in the sketch); baselines with the numbers masked; e2e.
        _Landed 2026-09-03. The column is the library's container widened through its own
        token (`--pct-container-max-width: 88rem`); the rails answer `@container` queries on
        that column — the first cut queried the grid about itself and the baseline held the
        index laid across the page (lesson-145). The bar bit four times before the deciding
        run, each time the page's own sweep: primary on an 11% tint read 4.44:1 and a 12%
        pill 4.36:1 (every tinted seat now takes the soft pair, measured at every token
        build); a link's inline code on a translucent ground under the hero's shadow read
        4.48:1 (the ground is opaque now); the theming fence set a brand background and not
        its foreground, so the dark theme put slate-900 on teal at 3.26:1 (the fence carries
        `--pct-button-fg` — a lesson the section teaches by example); and Firefox lays a
        closed drawer out, so the index inside it made a scrollable region nothing could
        focus on every route (the index renders only while the drawer is open). The initial
        bundle fell from 501 to 395 kB once the drawer's index left it. Deciding run:
        docs-e2e 331/331 in three engines (11.2 min); eight new cases hold the API to the
        source, the tokens to the DTCG file, the examples to their stages, the scorecard to
        both states, the theming to a computed colour, the spy, the filter and the fold. The reviewer's first look at the built page found it worse than the sketch it came from, and he was right: the port had re-interpreted three things — the demo's JSDoc as a two-line caption over the stage, the Preview/Code switch as the plain tab strip, the pattern's whole sentence in the spec line. Restored to the sketch the same day: `pct-tabs` stays (tablist, keyboard, panels) and wears the segmented look through its own tokens and parts, the caption is gone and the file's name sits in the corner, the spec line names the pattern. The lesson is procedural: an approved sketch is ported line for line, and the picture is compared before the suite is asked. The dark review found a third thing, and it was the library's: every scrollbar white, because the tokens repainted every colour and told the platform nothing — `color-scheme` now rides in each theme block at the block's own scope (0063), measured in the sandbox's theme spec and in the page's dark baseline._
  - [x] **2.7.6 — the tabs' second face, and the side layout it was missing** — `variant`
        on `pct-tabs` (`underline | segmented`), `orientation="vertical"` finished so the
        panel stands beside the strip, RTL from logical properties alone, the two tokens the
        segmented face needed and the pairs they brought; the site's own switch handed back
        to the library.
        _Landed 2026-09-03, out of the reviewer's question: "shouldn't this be a variant like
        the button's, because it is an awful lot of CSS to write?" It was, and the argument
        was already on the shelf — 0058 answered it for the button's five faces, so 0064
        answers it here and records the test it produced: a look is a variant when reaching it
        from outside means overriding our defaults to nothing first, or needs a value we name
        no token for. Both were true. The site had spent 72 lines on it, about a dozen of them
        undoing the rail, and had been bitten twice by the same nesting — the token overrides
        inherited into the demo its own stage projects (lesson-148) and the part selectors
        matched whatever that stage rendered (lesson-147). The variant is one union member,
        one host binding and a block of paint: no branch, so nothing new for Stryker to break.
        `--pct-tabs-list-bg` and `--pct-tabs-tab-bg-selected` are real surface roles rather
        than the page under an opacity, which is what let them be measured: the two label
        pairs are errors at 9.45:1 and 17.85:1, and the raised segment against its track is a
        deliberate `warn` at 1.10:1, because the fill is not what identifies the state. The
        track's corner is derived (`tab-radius + list-inset`), the name gate having first
        rejected `segment-inset` for composing out of nothing in the dictionary. The vertical
        face had been half-built since it shipped: the strip turned into a column and the panel
        still stacked underneath it, so the panels got a wrapper of their own (layout, no part,
        no role) and the host became a flex row — measured beside the strip in LTR and mirrored
        in RTL, three engines. Site's remainder: six declarations for its smaller scale, set on
        the switch's own list where inherited values stop. 1085 unit tests, 45 tabs cases in
        three engines, `tabs-vertical` and `tabs-vertical-rtl` regenerated and `tabs-segmented`
        new. Deciding runs: docs-e2e 331/331 in three engines, sandbox-e2e clean apart from a
        webkit flake in the dialog's scroll lock that predates this and is filed on its own (1
        in 9, an exact-offset assertion where the promise is the lock); full Stryker in 83
        minutes at concurrency 4 — 4617 mutants against 4616 before, the one new mutant being
        the variant default's string literal, score 82.80% against an 80% floor. Two numbers in
        the first draft of 0064 were written before they were measured and are corrected in it:
        the dark theme's label pairs are 11.87:1 and 17.85:1. The site's baselines moved by a
        pixel and the cause is in the diff — its old pill kept a transparent 1px rail because
        the site had only zeroed the rail's COLOUR, and the variant draws no rail at all._
  - [x] **2.7.7 — the second review of the component page** — the head reads for somebody
        choosing a component rather than auditing one: a `**Summary:**` field on every card
        as the lead, the proof line gone, the import's copy moved down to the panel that
        shows the import, a GitHub mark on Source, the preview panel a third shorter, and the
        card's reasoning moved under Evidence.
        _Landed 2026-09-04, from the maintainer's five notes. The lead was the card's opening
        prose, which is where the reasoning lives — so fourteen pages led with nothing at all
        and the rest led with a decision number. The field is machine-held: the content pass
        throws on a missing one, on more than 200 characters, and on a markdown link or a
        `req-`/`lesson-`/`decisions/` reference inside it (33 written, the longest 106). Two
        defects surfaced under the height note and both were the library's, not the site's.
        A panel nobody chose keeps its box under `content-visibility: hidden`, so it kept its
        padding: 24px of nothing per spare panel, 48 under the sandbox's segmented fixture
        (lesson-150). And every rule keyed on the host's own attribute reached its target by
        DESCENT, which in a component that can hold itself reaches the nested instance too —
        the reviewer's screenshot caught a default strip rendered segmented inside the page's
        own switch (lesson-151); the selectors are child combinators now, the fixture is a
        strip inside a strip, and the case fails on the descendant selector restored. The
        panel: 424px to 296px, 30.2% of it, from a 220px floor under a 36px demo plus the
        ghost padding. The third item of the spec line came back as its own line after a
        sketch of five ways to write it (the maintainer chose C, the sentence): the field is
        read as a grammar of three — a W3C link, a native element, or the word "none" — and
        the page states "Implements the W3C ARIA APG Tabs pattern", "Semantics come from the
        native `<button>`", or "No APG pattern applies, and none is invented", the last
        pointing down at the section that argues it. Eleven cards had been rendering the
        single word "none" and the stepper half a sentence, because the line was cut at the
        field's first dash; seven cards were reworded so the head parses, the qualifiers that
        keep a partial claim honest survive into the sentence ("the grid of", "the non-modal
        reading of"), and a card the reader cannot classify is refused. Deciding runs: docs-e2e 331 in three engines, 329 passed with the two
        component-button baselines red on the change itself and regenerated after; sandbox-e2e
        tabs 24 in chromium, `tabs-strip` and `tabs-segmented` regenerated 24px and 48px
        shorter. No TypeScript in the library moved, so the mutation snapshot stands._
  - [x] **2.7.4 — the sweep** — a JSDoc line on every input, model and output of the library,
        a `$description` on every component token, `Parts`/`Usage`/`Theming` in every card,
        examples per component batched by category; the tripwires of 2.7.2 flip to throw.
        _Closed 2026-09-05. Most of it had landed with the pages: of the 799 readings 2.7.2
        counted, 94 were left, and every one was the same line — the form-control block
        (`disabled` / `readonly` / `invalid` / `touched` / `required` / `errors` / `name` /
        `touch`, then `label` / `hint` / `size` / `max`) declared without a word in eight
        controls, the calendar and the field: 4.26's eight hand copies, read from the
        documentation side. 83 lines written, each saying what the input DOES in that control
        rather than what the contract calls it (a checkbox has no `readonly`, so its line
        says the click is swallowed; a range undoes the move; the group carries
        `aria-readonly` because the `radio` role has none). The tripwires are gone as
        tripwires: STRICT covered `button` alone, now any reading owed fails the build with
        the list grouped by card, and `DOCS_WARNINGS` had nothing left to print and went
        with it. Negative control recorded: one JSDoc line removed, the pass exits 1 naming
        `text.ts: touch (output)`. The library's TypeScript moved by comments only, so the
        mutation snapshot is stale by text and not by mutants — re-measured on the next run,
        not on this one (the maintainer's call, with more changes still coming)._
  - [x] **2.7.5 — the mono face** — JetBrains Mono vendored beside Inter (OFL, the licence
        next to it), first in the code stack; the baselines that hold code regenerated.
        _Closed 2026-09-05. Half of it had been written before the file existed: the
        component page named `'JetBrains Mono'` first in its stack since 2.7.3 and every
        visitor fell through to the system's monospace, while the three other code seats
        (the claim's inline code, the fenced blocks, the trust page's gate names) named
        no face at all. Vendored the way Inter is — `public/JetBrainsMono-latin.woff2`
        (40 kB, the variable weight, the Latin cut of a site that is English by law), the
        OFL beside it, `font-display: block` and a preload like Inter's; the source is
        `@fontsource-variable/jetbrains-mono` 5.3.0, the Google Fonts build of JetBrains'
        own release. A second cut (`latin-ext`, 15 kB, split by `unicode-range`) was in
        the first version and went: the language gate reads the hex of a range as words,
        and the honest answer to that was not a dictionary entry but the file the site
        does not need. The stack is declared once, as `--docs-font-mono` on the
        root, and the four seats read it — a fourth hand copy was the state lesson-21
        exists to prevent. Baselines: the two component-button pictures regenerated (7 270
        and 7 470 pixels of glyphs, 1 % of the frame); the landing's did not move, because
        its code sits below the first viewport. Deciding run: docs-e2e **346 of 346** in
        three engines, 13.0 min; `nx build docs` copies the three files into dist and the
        component page's sheet fell from 11.63 to 11.46 kB on the shorter stack._

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

- [x] **4.1 — a one-letter Polish word walks through the language gate**
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
    _notes:_ **closed (2026-09-06), and the floor was not a floor.** The gate never had a
    length limit: `american-english` lists the whole alphabet, so every one-letter word is
    subtracted as English before anything looks at it — `w` walked through as a word the
    other dictionary holds too. The sixth limb reads the COMPANY instead: `i`, `o`, `u`, `w`
    or `z` between two words, a single space either side, the word before at least two
    letters and the thing after a word or a quoted one; prose being a Markdown line outside
    a fence, a comment or a string literal, and an inline code span or code being not. `a`
    is left out as the English article, and the match is lowercase because the English
    pronoun is `I`. Measured over the repository before the rule was written: ten such
    letters stand between two words, one of them in prose — `build z SSR` in a comment of
    `check-consumer.mjs`, translated — and one near-miss shaped the rule, `npm i zone.js`
    inside a code span. The limb has the denominator this item asked for: the summary line
    reports how many letters it read, and its own probe with the prose taken out is the
    blind case. Three prepared inputs (the comment, the template literal that was the
    original defect, the blinded probe), 35 in all; the reference holds the same letters as
    identifiers, in a table cell and inside a code span

- [x] **4.2 — the two longest gates share one runner, and CI gives them half the cores**
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
  - **an eighth reading: the first nightly ran, and the CI columns exist.** The scheduler
    skipped the cron's first window outright (a freshly registered schedule, a known
    best-effort hole), so run 33594523992 is a morning `workflow_dispatch` — and it is
    green end to end. The job: 2h23m. The split: `npm ci` 58s, the browser system
    libraries 34s, the 23-target fast set **3m02s**, the heavy step **138m03s** — inside
    which `components:mutation` is the critical path at **137m57s**, the e2e's 1534 cases
    pass in 1.6h RUNNING BESIDE IT (one `run-many`, `nx` parallelism — the "starved by
    configuration" sentence above, now a measurement), and `check-mutation` reads the
    report in 2.9s. The score CI lands: **82.59 against the starved snapshot's 82.40** —
    a drift of +0.19 into the gate's ±2, in the predicted direction and a tenth of the
    predicted size. The starved-snapshot decision holds its first night
  - **decided (2026-09-07): the nightly splits into a matrix, one runner per heavy
    gate.** `mutation` and `e2e` stop sharing a job, so the clock column stops being
    decided by what else the run is doing and the snapshot can go back to recording a
    run that lands its kills. The price is a second `npm ci` — 58 s on the first nightly
    — and a second Playwright restore per night, against ~138 minutes of critical path
    either way. The `--write` after the split is the step that re-reads the files this
    item names; whether `mutation` ever joins a pull request stays parked for 3.1, where
    it belongs
  - **done (2026-09-07): two jobs, and the second one takes the shorter setup.**
    `nightly.yml` now runs the fast set and `e2e` in one job and `mutation check-mutation`
    in a job of its own, so nx is no longer free to start the two heaviest targets at once
    on four vCPUs — which is the arrangement every reading above measured. The two targets
    stay on ONE line because `check-mutation` reads the report the run leaves on that
    runner's disk; separating them would separate a measurement from its evidence
  - **the price came in under the estimate.** One more `npm ci` (~58 s, on a runner nothing
    waits for) and **no** second Playwright restore: the mutation job is vitest and needs no
    browser, no word lists and no dictionary cache, so the browsers stay in the job that
    uses them
  - **a matrix was the recorded shape and was refused for a measured reason.** With one
    templated `run` line, the targets stand behind `${{ matrix.… }}` — and point 7 of
    `check-mutation` reads WORDS on every `nx` line of both workflows, so the gate that
    exists to notice `mutation` leaving CI would stop being able to see it there. Two jobs
    with literal lines keep the workflow readable to the gate and to a person by the same
    property. The duplication it costs is four steps
  - **what the split does not buy, said here rather than left to be assumed:** the four
    vCPUs. Stryker still runs with the workers a small runner allows, so whether the nightly
    starts LANDING the clock-kills the snapshot was written from is the first night's
    measurement and not this step's claim. If it does, the starved-snapshot decision above
    is the next thing to revisit; if it does not, the decision holds with one fewer variable
    behind it
  - the nightly's fast line was missing `check-forms` on the day it was added, and this step
    put it there: `ci.yml` gained the target with the gate and `nightly.yml` did not, which
    is the shape of a "run everything" list that is maintained by hand twice
  - the task-cache thread this item carried is **not** closed and moves to
    [4.41](#4-open-findings) rather than out of the plan with the tick

- [x] **4.3 — an option's owner is measured only where a page renders the panel**
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
    or sooner, the first time a grouped panel is written that no page renders · _notes:_
    **closed (2026-09-06), as `check-aria` point 9.** The relation is read off the template's
    tree: for every element whose role requires a context — axe's own `requiredContext` table,
    anchored on `option` like the three tables before it — the first ancestor with a role,
    written or the platform's own for the tag, either is that context or is the defect;
    `presentation`/`none`, Angular's containers and role-less elements that carry no ARIA and
    take no focus are looked through, and a role-less wrapper that keeps an `aria-labelledby`
    is not, which is axe's own line and the case this item measured. Where the template runs
    out the host answers — a host role that is the context settles it, one that is not is the
    defect one element up, none leaves the question to the consumer's template and is counted
    as such. A bound role anywhere on the path is reported, not read. The library today: two
    such elements (the select's `option`, the tabs' `tab`), both owned in their own template.
    Four prepared inputs — a `role="list"` between a listbox and its options, the group wrapper
    with its role off, an `option` at the root of a `radiogroup`'s template, the context table
    without its anchor — 25 in all, each rejected on its own point; the reference grew the
    legal shape (a listbox owning options directly and through a heading's group)

- [x] **4.4 — one template, compiled twice, and nothing says when that stops being worth it**
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
    stops reading as a rounding error · _notes:_ **decided (2026-09-07): measure before
    extracting.** A probe in `check-bundle` that imports `PctSelect` alone records what
    a consumer of one tag really pays, and the panel component of the road out waits for
    its trigger. If the second class does fall away, the item closes on a number instead
    of on everybody's "of course, ESM"; if it does not, the extraction has the argument
    it lacks today
  - **done (2026-09-07): point 12 of `check-bundle`, and the extraction has its argument.**
    The probe imports ONE class by name beside a probe importing every class of the same
    entrypoint, for every entrypoint carrying more than one component — discovered from the
    package, not named, so the day a second tag joins another entrypoint the reading follows
  - the measurement, recorded in `size.snapshot.md`: **`./select` 69904 B for one tag against
    69907 for both.** Three bytes. A consumer who imports `pct-select` alone carries
    `pct-multi-select` whole, so the duplication 0034 accepted is paid by every consumer of
    either tag, and "of course, ESM" is refuted where it was assumed
  - **and it is refuted only here.** Tree-shaking inside an entrypoint works elsewhere:
    `./accordion` 4162 against 11333, `./breadcrumb` 4256 against 9043, `./date` 22123
    against 38901, `./field` 16059 against 24895 — up to 63% shed. Of the seven that shed
    nothing, six are parent/child pairs where the child injects the container, which is a
    reference the bundler is right to keep. `./select` is the only pair of SIBLINGS with no
    reference between them, and why the bundler keeps the second is not measured — it opens
    as 4.42 rather than being guessed at here
  - so the road out (a panel component both triggers hold) keeps its trigger — the third tag
    — and gains a number: what it would save is the duplication, and the duplication is not
    shed by anybody
  - the reading was wrong twice before it was right, both times in a way that looked precise:
    a throwaway probe that never ran the linker, and a first version of the point that looked
    for the sibling's SELECTOR in the bundle text — two false positives in seven rows
    ([`lesson-171`](lessons.md#lesson-171)). What holds now is arithmetic on bytes
  - controls: `named-probe-empty` and `named-probe-larger`, 32 prepared inputs from 30. Both
    disarm to "PASSED" rather than to a neighbour, and that needed the harness to render the
    case's snapshot from the case's own measurement: point 12 compares a measurement against
    ITSELF, so a record disagreeing with it would take both cases to `verbatim`

- [x] **4.5 — inheritance was taught to the two gates that fired, and to none of the rest**
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
    _notes:_ **closed (2026-09-05), the list written and the third gate taught.** What a base
    passes on is Angular's own list — `ɵɵInheritDefinitionFeature` copies inputs, outputs,
    host attributes, host bindings, queries and features, and leaves the template, the styles
    and `onPush` to the subclass's decorator — so the seven gates that read a class were
    sorted by which half they read: `check-aria` and `check-texts` follow `extends` already;
    `check-parts` did not and was right by accident — a base with a host part would have fired
    point 2 on both sides, loudly — and follows it now, with the reference's `PctMarkerBase`
    whose part the package puts on `PctMarker` and a `base-not-read` case at point 1 (25
    inputs); `check-zoneless`, `check-styles` and `check-icons` read what a base cannot pass
    on, and `check-harness` reads the compiler's declarations. The smaller sibling closed with
    `speaking-attribute-on-a-base-host/`, the merge proved by the one kind of attribute the
    reference cannot carry (32 inputs). The list is `req-quality-inheritance`, so a gate that
    reads a class and is not on it is a named gap rather than a green

- [x] **4.6 — the mutation snapshot cannot say that a mutant errored**
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
  - **done (2026-09-07): the sixth column, and the arithmetic the item's own binds-at asked
    for as the alternative — both, because the second is what makes the first earn its
    place.** The row is now `score · killed (of that, by the clock) · surviving · errored ·
not covered · ignored`, and a new rule `score/columns-adrift` requires the score to
    follow from the columns beside it: `killed / (killed + surviving + errored + not
covered)`. Before the column that arithmetic was impossible on any row with an errored
    mutant; now it holds on every row and on the TOTAL, and a hand edit of a generated file
    is red
  - **it is nine rows, not the two the item opens with and not the five it counted up to.**
    Measured off the report the snapshot is written from: twelve errored mutants over
    `drawer.ts`, `field.ts`, `menu-item.ts`, `menu.ts`, `popover.ts`, `multi-select.ts`,
    `select.ts`, `tab.ts` and `tabs.ts`. Every one of those rows now adds up
  - and **one fixture spelled a row out literally, not five**: `expired-snapshot`, whose row
    grew a column. The other cases' snapshots come from the same renderer as the production
    one, so they followed the format on their own — which is the reason the fixture harness
    renders them rather than storing them
  - controls: two cases on the new rule, because it breaks in two human ways —
    `row-without-columns` (five numbers where six are declared: a half-finished format
    change) and `columns-adrift` (a row that reads and contradicts itself). Both REPLACE an
    existing row rather than adding one for a stranger, so the disarm gives "PASSED" on the
    second instead of moving it onto `expired-snapshot`. 44 prepared inputs now, 43 rules
  - the snapshot was rewritten with `--write` from the report already on disk, and **not one
    score moved** — verified row by row. The rewrite is the column and the header's new
    paragraph and nothing else, which is what makes it safe to do while the gate is red on
    `stale-measurement` for a file the next run has to re-measure anyway
  - _superseded (the decision this replaces):_ **a sixth column, and an errored mutant keeps
    counting against the score.** The row becomes `score · killed (of that, by the clock) · surviving ·
errored · not covered · ignored`, and point 6's parser and the five fixtures that
    spell a row out literally grow with it. The denominator stays stricter than
    Stryker's own: a mutant after which the worker dies is not a case that stated
    anything. The arithmetic then reads on the five rows that carry one

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

- [x] **4.8 — an empty listbox is a critical violation, and no case had ever opened one**
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
    listbox, so this is a filler item · _notes:_ **closed (2026-09-06), by the fourth answer the
    three above had hidden.** The panel was one element — the listbox, the surface, the scroll
    and the sentence — so the sentence had nowhere to stand but inside the list. Now the panel
    is a surface and the list inside it is the listbox, a new part `list` on both classes, and
    the sentence is the panel's, drawn beside the list
    ([0069](decisions/0069-a-message-about-the-list-is-not-an-item-in-it.md)). Read off axe's
    own source: `aria-required-children` fails a listbox holding content it cannot own and
    marks an EMPTY one for review, which the audit does not count; and
    `scrollable-region-focusable` stands down for a combobox's own popup alone, so the list is
    also the element that scrolls, as [0038](decisions/0038-a-window-is-measured-and-its-spacer-is-not-an-element.md)
    found. The stage this suite had never opened — `select-empty` — is the audit's fourteenth,
    red at **critical** before the change and green after, in three engines. Three things the
    scroller inside a surface needed that the surface which scrolled did not, each found by a
    picture: `box-sizing: border-box` (the panel stood 248 px against its 240 px token), the
    panel's background said again on the list (a scrolling layer with no opaque paint draws
    text without subpixel antialiasing), and the panel's radius less its border (24 pixels of
    square corners). Two baselines re-recorded for antialiasing alone, `select-panel-multiple`
    and its RTL twin: under the old geometry the many-choice rows' text was grayscale and the
    single-choice rows' subpixel, the list as the scroller draws both alike, and the same page
    with the scroll put back on the panel differs from the old picture by 33 pixels. Measured:
    the select's unit specs green, the eight static gates green (`./select` +988 B, `./testing`
    +14 B), and select, audit, visual and drawer cases **467 of 467** in three engines

- [x] **4.9 — the checkbox writes an `aria-checked` that no engine reads**
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
    per component state, and diff the way the parts snapshot already does · **closed
    (2026-09-05), the copy made.** The binding, the computed and the assertion are gone; the
    unit case asserts the absence in all three states, and the e2e reads the accessible tree
    in three engines — `[checked]` from the checkedness and `[checked=mixed]` from the
    `indeterminate` property alone, the aria snapshots this note named put to their first
    use here. 15 e2e cases and 25 unit cases green in chromium/firefox/webkit; `./checkbox`
    −110 B. The sandbox label that named the attribute now names the reading, and the card,
    `req-a11y-built-in`'s gate and 0039's context say what the checkbox no longer writes.
    `announce.ts` and the reader's log stay where this note put them

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

- [x] **4.12 — a control knows its text is not a date and has no channel to say so**
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
    picked up as filler · _notes:_ **closed (2026-09-06), as the contract's second channel.**
    `PctFieldControl.ownErrors` is an optional signal of what the control knows and the form
    cannot; `pctFieldMessages` reads it FIRST and gates it by nothing, and the chrome merges
    it the same way, so a control drawing its own line and one wrapped in `pct-field` say the
    same sentence in the same place
    ([0070](decisions/0070-what-the-control-knows-and-the-form-cannot-is-a-second-channel.md)).
    The date field says `Not a date`; the number field now KEEPS text it cannot parse and
    says `Not a number`, taking the report back on a keystroke or a value from outside —
    both `PctTexts` keys, both translated in the sandbox. What it cost: `./core` +112 B,
    `./date` +192 B, `./field` +515 B and 58 B on every other entrypoint, because the default
    texts travel with `core`. Measured: the core, date and field unit specs green, the eight
    static gates green, and date, number, field and their audits **138 of 138** in three
    engines. On the way, a calendar case went red on its own — the today mark's range was a
    constant written for weeks from Sunday, and the Host's locale starts them on Monday
    (5e347bb, its own commit)

- [x] **4.13 — a state attribute that contains another entrypoint's selector is read as that
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
  - _notes:_ **closed on the read, not on the names (2026-09-05).** The ambiguity was the
    gate's: a marker is a selector token kept because it survives linking as DATA, and data
    stands in a bundle as a string literal — `[["pct-select"]]`, `[["button","pctButton",""]]`
    — so that is what the read looks for now, quotes included, in both probes. `"data-pct-selected"`
    and `"pct-select-option"` contain the token and neither is it. The guard that had stood
    in for the read — no marker a substring of another's — has nothing left to guard and is
    narrowed to what a literal read still cannot tell apart, two entrypoints exporting one
    selector; its fixture became `marker-shared-by-another/`, and a new one holds the read
    itself over a prepared text (`marker-inside-a-state-name/`, through the same `presentIn`
    the probes call): 30 doctored inputs, the live run's point 4 the positive side. No rule
    went into `check-parts`, because a naming rule would have been the workaround written
    down — `selected` is a word a state may have again; `chosen` stays where it is, a name
    two components carry and nobody asked to move ([`lesson-162`](lessons.md#lesson-162))

- [x] **4.14 — a message reports nothing by colour, and the channel that would repair it is a
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
  - **decided (2026-09-07): tones exist, and the second channel is an icon the library
    draws.** A `tone` input on the toast and on the progress bar, and four names into
    `PctIconName` at once — `success`, `warning`, `danger`, `info` — each with a drawing
    the component ships and a consumer's set can replace (0011). Six public names become
    ten, and the set is settled once for the field's error, the dialog's confirm and
    whatever the banner turns out to be, which is the whole reason this item refused to
    let the first component decide it
  - **done (2026-09-07): four names, two ramps, three semantic colours and a `tone` on both
    components.** `PctTone` lives in `./core` because the set is one set — `'success' |
'warning' | 'danger' | 'info'`, with no `neutral` member: a component with no tone takes no
    `tone`, and the absence is the neutral. The toast takes it as a field on the spec (it has
    no inputs — the surface is a service), the bar as an input; both draw a mark the library
    ships and a consumer's set replaces (0011)
  - **every colour is a measurement.** The palette had no green and no amber, so both ramps
    were added at the two steps that clear 4.5:1 as text: `green.700`/`amber.700` on the light
    surface (5.02:1 each) and `green.400`/`amber.400` on the dark (10.25 and 10.69). `info` is
    the brand blue and deliberately the same value as `primary` — an informational message is
    not an alarm, and a fourth hue invented for it would be a colour with no meaning behind it.
    Sixteen new pairs in `contrast.policy.json`, two per tone per component, because a policy
    that measured "the tone" once would be measuring whichever tone somebody wrote first
  - **the bar had nowhere to put a mark**, and that is the structural half of this step: its
    host WAS the pipe (`position: relative; overflow: hidden`), so a mark inside it would be
    cut to the height of a groove. The pipe moved onto a new `bar` part and the host became a
    row; an untoned bar measures exactly what it measured before, and a case reads the host's
    box against the groove's to keep that true
  - **the cost, stated rather than discovered:** `./progress` **7204 → 11625 B** and `./toast`
    **15867 → 19473 B** — a template that names `pct-icon` carries the icon component whether
    or not a consumer ever passes a tone (`lesson-173` in its third disguise). The package is
    435841 → 443888 B
  - **and the icon gate caught itself.** Point 1's denominator read "1 `<pct-icon>` in the
    tree, 5 in the text" of the toast's new template: the walk followed `branches ?? cases`,
    and an `@switch` in Angular 22 carries its branches under `groups` — so every switch block
    in the library was invisible to `check-icons` and to `check-aria`'s identical walk. Both
    are fixed ([`lesson-180`](lessons.md#lesson-180))
  - measured: 1180 unit cases green, `tones.spec.ts` with six cases over three engines (the
    four names, four colours on the mark and the edge, the mark beside the groove and not
    inside it, the untoned bar unchanged, and both components under `forced-colors: active`
    where the colour goes and the mark stays). The progress bar's forced-colours ring is
    re-pointed at the same time: it was read on `track`, where `outline-color` with no outline
    computes to `currentColor` and the assertion passed on the fallback
  - what is NOT in this step and is now cheap: `PctBadgeTone` is still `'neutral' | 'danger'`,
    with its own note saying the union grows the day the ramps land. They have landed

- [x] **4.15 — the assertive channel has no consumer, and therefore no gate**
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
    `announce.ts`, whichever comes first · _notes:_ **decided (2026-09-07): the region
    stays open, and a demo is its consumer.** 0026 is untouched — the pair is opened by
    a render and not by the first message — and what changes is that the assertive half
    stops being a promise with no gate: a sandbox view calls `announce(…, 'assertive')`,
    and an e2e case reads that the sentence lands in the assertive region and not in the
    polite one. The mechanism is measured without inventing a library message that has
    no home, which is the prediction 0026 already got wrong twice
  - **done (2026-09-07): the sandbox's `announce` view and `announce.spec.ts`, four cases in
    three engines.** Two of them are the promise: the sentence in the region it named, and
    the OTHER region empty — which a one-region implementation would still fail. One reads
    that both regions are open and empty before anything is said, the last that a region
    holding a sentence takes no space and stays in the tree (clipped, never `display: none`,
    which would take the announcement out of the tree with the element —
    [`lesson-83`](lessons.md#lesson-83))
  - **one sentence of this item was wrong and the code says so:** "no unit case puts a
    sentence on it" — `core.spec.ts › PctAnnouncer › a message goes to the channel it names
and to no other` has announced on the assertive channel since the announcer was built.
    What was really missing is what the item's title says: a CONSUMER, and with it a run in
    which a real component injects the service, a render opens the pair and a press speaks
  - 0026 is untouched, and the view says why in its own header: the pair is opened by a
    render and not by the first message, and every interruption this library could have had
    turned out to have a place on the screen instead. The consumer is therefore an
    application, and the sandbox is the application this repository has
  - what the cases do NOT claim: that anybody HEARS anything. jsdom has no assistive
    technology and neither has Playwright, so the promise ends at "the right region holds the
    right sentence" — written into the spec's own header rather than left to be assumed

- [x] **4.16 — a control in the corner is last in the page's tab order, and nothing carries the
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
  - **decided (2026-09-07): the keystroke is the consumer's to install.** The library
    ships the mechanism — one that moves focus through the regions, F6 by default and
    the key configurable — and mounts nothing on the document by itself. It answers both
    sides this item names, the toast that has nowhere in the document to be and the
    drawer that is somewhere wrong, and it takes no keystroke from an application that
    never asked to give one up
  - **done (2026-09-08): the mechanism is in `./core`, the key is the consumer's, and the hole
    in the honest default is a word rather than a silence.** `PctRegions` holds the registered
    places and moves focus between them in the DOCUMENT's order, read at the press;
    `[pctRegion]` declares a place and names it; `[pctRegionKey]` listens on the element a
    consumer puts it on, F6 by default and the key an input. The toast's stack registers itself
    and answers the same key from inside the stack — a press there can never reach the element
    the key was mounted on ([0072](decisions/0072-a-region-key-is-the-consumers-to-install.md))
  - **the default cannot hear a cold page, and that was measured rather than reasoned about.**
    A keydown reaches an element only when focus is already inside it, and a page that has just
    loaded has focus on `body`. The first e2e case pressed F6 on a fresh page and focus stayed
    where it was. `listenOn="document"` closes it and is a word the CONSUMER writes: the library
    still installs nothing anywhere by itself, and an application that writes it has decided
    the key is free for it to take. The sandbox writes it, because a sandbox is an application
  - measured: five unit cases (the walk and its wrap, landing on the place and not the control,
    the key as an input, the refusal — F6 with nothing mounted moves nothing — and a region
    letting go when its element goes) and four e2e cases in three engines, of which the one
    that matters reads **one press** from the button that raised a message to the stack whose
    action is otherwise last in the tab order
  - two things found on the way and written into [`lesson-181`](lessons.md#lesson-181): a
    component's own `host` block cannot apply a directive to itself (the attribute is written
    and nothing is instantiated — directive matching happens over a template), and one key can
    now have two listeners, so both handlers step aside on `event.defaultPrevented`
  - **and where it lives was a measurement of its own.** In `./core` the mechanism cost
    **+19111 B over the package** — a root service is an impure static initialiser, so every
    entrypoint importing core carried a cycle it never used. It moved to
    `@pacit/components/regions` with `providePctRegions()`, leaving core the interfaces and a
    `PCT_REGIONS` token that answers `null`: **5515 B nobody pays until they import it**, core
    +108 B, the toast +570 for the optional integration and the region's name
  - two things found in the move and worth the hour they cost: a new entrypoint directory has
    to be listed in `tsconfig.lib.json` and `tsconfig.spec.json` — outside them the compilation
    is not the same one and a static attribute silently stops reaching a signal input — and the
    texts gate reads a capitalised default as prose, so `F1`–`F24` are named as the one class
    of capitalised literals nobody translates
  - the drawer, the other side this item named, needs nothing of its own: a consumer writes
    `pctRegion` on it and it is in the cycle. What the library owed was the mechanism, and a
    component that is drawn where the consumer put it was never the hard half

- [x] **4.17 — a snapshot with no tolerance drifted with nothing to point at**
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
  - **decided (2026-09-07): find the 35 bytes first, then decide what the gate
    declares.** A walk over the lockfile's history, the same sources built at each step,
    names the bump that moved them; only with the cause in hand is it clear whether the
    snapshot should carry the versions it measures (Angular, the linker, esbuild, the
    token build) or whether this was one artefact. A tolerance is refused outright —
    0023 says what a tolerance is for, and this is exactly the drift it would hide
  - **done (2026-09-07): the three suspects were tested and all three are refuted; what
    shipped is the second half of the question.** The window between the two readings holds no
    `package-lock.json` change at all, so no bump could have moved them. A worktree at the
    commit that wrote 15311, built from its own tree, reads **15346**. The same worktree with
    its own `node_modules` installed fresh from that day's lockfile (`npm ci`) and rebuilt
    without the task cache reads **15346** again — and the five packages that decide what a
    byte count means are identical then and now (`@angular/core` 22.0.6, `@angular/compiler-cli`
    22.0.6, `@angular/build` 22.0.6, `ng-packagr` 22.0.1, `esbuild` 0.27.7)
  - so the recorded number is not reproducible from the tree it names or the toolchain it
    named, and the mechanism that would have caught a stale artefact — `freshInputsFor`, from
    C29 — already stood at that commit. What is left is a state of `dist` nobody can
    reconstruct, and an evening spent proving it
  - what shipped instead of a tolerance: **the snapshot now records the toolchain the numbers
    were produced by**, five versions beside the rows, with a negative control of its own
    (`a-toolchain-that-moved.json` fires point 13 when a compiler is bumped and the file still
    names the old one). The next drift with nothing in the diff is answered by the same diff —
    the toolchain either moved with the bytes or it did not
    ([`lesson-179`](lessons.md#lesson-179))
  - 0023 stands untouched: a tolerance would have hidden exactly this

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

- [x] **4.19 — a component that is mostly the platform has almost nothing a mutation run can
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
  - **decided (2026-09-07): a recorded disarming per claim.** Every promise of a
    component that is mostly the platform gets a negative control written down the way a
    gate's fixtures are: the mechanism disarmed by hand, the case that turns red named,
    the result in the card. No new tool is built — a mutator over templates is refused
    as machinery this repository would then own and maintain — and the snapshot's header
    says what a score over 74 lines is a true statement about
  - **done (2026-09-07): twelve mechanisms disarmed one at a time, and the readings are in
    the card.** Every line the accordion actually writes was taken out by hand, the suite run
    over the hole, and what turned red written into a `## Negative controls` table of
    `docs/components/accordion.md` — mechanism, file, how it was disarmed, the case by name.
    Eight of the twelve are in the template or the stylesheet, where no mutant is ever thrown
  - ten turned a named case red. Two are held by the **unit suite alone**, and both for the
    same reason: `onToggle` writing the platform's state back (every browser case presses and
    then reads the ELEMENT, which the platform updates whether we listen or not) and the
    generated group name (a second accordion on one page is a thing no sandbox view draws)
  - **one is held by nothing that names it**, and only the disarming could say so. The card
    read "every heading row's box measured outright; the floor is
    `--pct-accordion-heading-target-min` on the row itself" — take the floor out and the 24 px
    case stays green, because the padding clears 24 px without help. The case holds the
    PROMISE and not this line; the card now says that, and 4.44 is opened for the shape
  - the mutation snapshot's header now says what a score over 74 lines is a true statement
    about, and names the disarming as what answers for the other half
    ([`lesson-174`](lessons.md#lesson-174))
  - what the readings do NOT say: they were taken in **chromium**, so a mechanism held only by
    gecko or webkit reads the same as one held by nothing. And nothing disarms the platform —
    the press, `Enter`, the tab stop, find-in-page — because there is no line of ours to take
    out, which is the whole of 0046

- [x] **4.20 — the list of what the platform makes focusable is written by hand, and nobody
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
  - _notes:_ **derived (2026-09-05), all three from one source: `axe-core`'s tables, the
    same ones the audit in `a11y.spec.ts` reads on a rendered page.** The focusable tags are
    axe's own `isNativelyFocusable` asked over a virtual element for every tag of its element
    table (seven: `a[href]`, `area[href]`, `button`, `input` not hidden, `select`, `summary`,
    `textarea`); the named roles are the ones whose ARIA superclass chain passes through
    `composite` plus the ones the table says must carry a name they cannot take from content
    (`toolbar`, `dialog`, `progressbar`, `img` — 22 in all); the named tags are the tags whose
    implicit role is one of those, focusable in no variant and named by no HTML method
    (`progress`, `meter`, `dialog`). Per element the question goes to axe too, with the
    deciding attributes only — `href`, `type`, `tabindex`, a binding standing for the worst
    case and a `disabled` never passed on. Each table holds an anchor (`summary`, `tablist`,
    `progress`), so a table that loses one in a bump is a verdict and not a silence; two
    prepared inputs hold that, 21 in all. **What the derivation does not reach is now
    counted**, in three engines: `iframe`, `audio`/`video` with `controls`, `embed`, `object`,
    an open `<dialog>` and an editing host take focus and axe's table knows none of them —
    the editing host the gate reads itself, as an attribute beside `tabindex`; the six tags
    stay axe's blind spot, and the audit on the page shares it, which is what one source
    means. One surprise on the way: the union put `combobox` among the roles named as a
    whole (axe files it under `select`), and point 4's pairwise rule, which had excluded
    composites from "two names for one control", stopped seeing two named triggers — so that
    rule asks the element whether a user lands on it, and no list at all. The live verdict
    did not move: 58 components, 14 naming a widget of their own

- [x] **4.21 — the library's layer order is three numbers in three files and no rule**
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
    that moves the overlay container's number · _notes:_ **closed as filler (2026-09-05), and
    the promise is [`req-token-layers`](requirements/tokens.md#req-token-layers).** The order
    is a list in `libs/tokens/src/layers.policy.json` — page < drawer < overlay < toast — and
    point 10 of `check-tokens` reads every number from where it lives: the two tokens from the
    sources, the page's floor as a value, and the overlay's from
    `node_modules/@angular/cdk/overlay-prebuilt.css` on every run, the file both applications
    load, so a bump that moved the container's number moves the middle of the order and fires
    at the gate rather than going stale in a comment (the two token comments carried the
    literal 1000 and carry none now). Held strictly increasing — today **page 0 < drawer 900
    < overlay 1000 < toast 1100** — and a `z-index` token no layer places fires, which is
    this item's own trigger made a rule. Four prepared inputs, one per rule (34 in all); the
    reference re-probes the real dependency, laid down from the repository, and a case
    doctors it through its descriptor because a `node_modules` path is nothing git tracks.
    Two things on the way: five older cases carried their own copies of the names policy or
    the snapshot and fired on the reference's new tokens until they learned the word, and the
    rule that read the names list read objects for strings and fired on nothing — the case
    written for it said so on the first run

- [x] **4.22 — a fixed panel's containing block belongs to the consumer, and only prose says so**
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
    first consumer report that a drawer is in the wrong place · _notes:_ **closed (2026-09-05),
    the rule measured first.** Twenty-seven ancestor properties in three engines:
    `container-type` — in the card, in 0047 and in this item's own first bullet — catches
    nothing; `content-visibility: auto`, `will-change: transform`, the individual transforms,
    `perspective`, `backdrop-filter`, `offset-path` and `preserve-3d` do, and not one was
    listed ([`lesson-163`](lessons.md#lesson-163)). The detector is the platform's:
    `offsetParent` of a fixed element is `null` while the window holds it and the catching
    ancestor otherwise, so `warnOnCaught` asks that on open and reads `CAPTURING` only to
    name the reason — chromium's `<body>` for a `zoom` is the one measured quirk, and the body
    is named only with a reason on it. Unit: the sentence whole, four reasons and none, the
    body rule, over doctored answers (31 cases, 4 new); e2e: the demo card given a `transform`
    takes the panel onto its padding box and the report names `<sbx-demo>` and the matrix,
    without it the panel spans the viewport and nothing is said — 39 of 39 in three engines.
    `./drawer` +1311 B, a dev-mode sentence and its list, recorded. The card, 0047 and
    `req-api-platform`'s gate carry it as the fourth kind of borrowing

- [x] **4.23 — the sandbox's own navigation is inside six component baselines**
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
  - **closed (2026-09-06), both halves, and the repair was two properties wide.** The
    pictures: `visual.spec.ts`'s stage blanks the sandbox's navigation before any picture is
    taken — `opacity: 0`, the column kept, so the content stands where a user sees it — and
    the seven pictures of the viewport (the six above and the drawer's `drawer-docked`, which
    had joined them since) are re-recorded for the last time on this account; the drawer's own
    panel stands over the column, so its picture never held a row and came back identical. A
    control in the same suite puts a row at the top of the navigation list and compares the
    viewport with itself byte for byte: nothing moves blanked, pixels move shown. Its first
    version appended the row at the BOTTOM of a list that reaches past the frame and passed the
    blanked half for the wrong reason, and the shown half caught it
    ([`lesson-50`](lessons.md#lesson-50)). The blanking's first version was `visibility:
hidden`, and it turned four CARD pictures of the select's triggers red at 743–924 pixels
    each — their antialiasing, because a sticky column that stops painting stops being a
    compositing layer and the text beside it moves to the root one; `opacity` keeps the layer
    ([`lesson-165`](lessons.md#lesson-165)). The behaviour: the dialog's lock case decides its
    own room (`min-height: 300vh` on the view column, put there by the case), and the
    calendar's two arrow walks poll the focused index instead of reading it one frame after
    the key ([`lesson-130`](lessons.md#lesson-130)); the mid-flight baseline read the dialog
    case had actually died of was 0c20b25's, measured at 4.32. Measured: visual on chromium
    with dialog and date in three engines, **172 of 172** in one run

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

- [x] **4.26 — one input block, eight hand-written copies, and only the names are checked**
  - the form-control quartet (`readonly` / `invalid` / `touched` / `errors`) is declared
    verbatim in eight controls. `implements FormValueControl` checks the member names; the
    **transforms and defaults** it does not — a ninth control missing `booleanAttribute` on
    `invalid` compiles and drifts silently, which is [`lesson-21`](lessons.md#lesson-21)'s
    shape standing at the public API
  - two roads: a host-directive carrying the block (it stands under nobody's template, so
    [0013](decisions/0013-no-headless-split.md) does not speak against it), or a structural
    gate over the eight declarations
  - binds at: **the ninth control that takes the block** · _notes:_ the sweep (2.7.4,
    2026-09-05) wrote the block's JSDoc into all eight copies by a script keyed on the member
    names — a ninth copy of the same drift, in prose. The gate, when the trigger fires, holds
    the lines as well as the transforms
  - **decided (2026-09-07): a structural gate, not a host directive.** A point reads the
    eight declarations and holds the transforms, the defaults and the JSDoc as well as
    the member names, so the ninth copy missing `booleanAttribute` is red with a file
    named. The host directive is refused for a measured reason rather than a taste: its
    inputs would still have to be listed by name in every component, so the duplication
    moves into a list of strings, and eight public classes change shape to buy that
  - **done (2026-09-07): `tools/check-forms.mjs`, four points, eight prepared inputs, in
    CI.** The block is declared in `libs/components/forms.policy.json` and held against
    `FormUiControl` read from `@angular/forms`'s OWN declarations — a member list typed into
    the gate would be a promise about somebody else's package that nothing re-measures
  - **two numbers in the title are wrong and the gate corrected both.** It is **nine**
    controls, not eight: `pct-switch` implements `FormCheckboxControl`, and the count came
    from a search for `FormValueControl`. And they carry **eight** copies, not nine, because
    `pct-select` and `pct-multi-select` are two tags over one abstract base — the inheritance
    the reading walks, and which the reference fixture carries so that the walk is code the
    negative control exercises. Disarmed, the reference fires on all four members of its
    block and the repository on sixteen
  - **the premise was understated, too.** `implements` does not check the member names:
    in `FormUiControl` every member is OPTIONAL — the one required member is `value` — so a
    control with no `touched` satisfies the contract as fully as one with it
    ([`lesson-170`](lessons.md#lesson-170))
  - **the JSDoc half of the decision is refused, on a measurement.** Holding the prose
    identical would mean deleting seven true sentences: `readonly` has six different
    descriptions across the nine controls and every one is right about its own — a native
    checkbox has no `readonly` and swallows the click, a date field hands it to the input and
    disables the calendar button. What the decision was protecting against — a member with no
    documentation at all — is already red one gate over, in the content pass. The evidence
    is 2.7.4's own: of the 94 readings it owed, every one was a line of this block, and the
    83 it wrote each say what the input DOES in that control rather than what the contract
    calls it
  - live control: `booleanAttribute` taken off the checkbox's `invalid` reports the file, the
    line and the eight sites that disagree with it. `check-index` counts the tree (13 case
    tables over 24), `check-reach` reaches it, and the target is on the `affected` line of CI

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

- [x] **4.28 — the axe audit's denominator is a hand-curated list of opened panels**
  - `a11y.spec.ts` says it in its own comments, three times over: "a panel that is not
    attached is a panel axe has nothing to say about" — and then opens, by hand, the panels
    it knows about. A new overlay component's open state joins the audit only if somebody
    remembers, which is the state the mutation inventory stood in before 4.11 inverted it
  - the stage list can be derived from an inventory the gates already own — the parts
    snapshot, or the sandbox's views registry — so a new open state is inside the audit by
    default and its absence is a violation rather than a silence
  - binds at: **the next component with an overlay panel** · _notes:_ **closed (2026-09-05),
    derived from the parts snapshot.** The hand-opened cases became a `STAGES` table keyed by
    the class that owns a `panel` part, and one case holds the table to
    `libs/components/parts.snapshot.md` both ways — an owner with no stage, a stage with no
    owner — with a control over a doctored inventory and a doctored table
    (`support/inventory.ts`, pure readers). The derivation asked for three stages the hand
    had not written: the **open calendar** with the field it belongs to, the one overlay the
    audit had never opened (green in three engines, whole-page), and the accordion's and the
    tabs' panels, drawn in the page and held open by the sandbox, whose stages hold that
    claim rather than an audit of their own. Nine owners, thirteen stages; the whole file
    264 of 264 in three engines. What the derivation does not reach is written beside it: the
    toast's stack is an `item`, not a `panel`, and stays a case by hand

- [x] **4.29 — the date field's UTC promise is prose, and no run stands in a hostile timezone**
  - `day.ts` says "every day in this file is midnight UTC", so no arithmetic can cross a
    boundary — a design claim with no measurement behind it: no Playwright project sets a
    `timezoneId`, no unit case runs at a DST boundary, and the suite's machine is the
    timezone it happens to be
  - one override (`timezoneId: 'Pacific/Kiritimati'`, UTC+14 — the farthest a clock gets
    from the meridian) on the date spec plus one DST-boundary unit case is the negative
    control the sentence is missing
  - binds at: **the next change under `date/src`**, or the first timezone bug report ·
    _notes:_ **closed as filler (2026-09-05), and the promise is in the registry now:
    [`req-api-day`](requirements/api.md#req-api-day).** Two unit cases stand where the
    sentence stood: Node reads `TZ` on every local-time call, so one pins the clock to
    Kiritimati (UTC+14 — noon UTC on the 28th is already the 29th where the user is, and the
    one local read, `pctToday`, says so) and one to Warsaw across both switches of 2026, the
    23-hour 29 March and the 25-hour 25 October — where a `PctDay` is 24 hours from the next
    on both and the local-time `Date` built from the same three fields serialises as the day
    before (`2026-03-28T23:00:00.000Z`, and `…T10:00:00.000Z` in Kiritimati), measured in the
    run beside the value it refuses to be. Every e2e case of the date field runs with the
    browser's clock in Kiritimati (`test.use({ timezoneId })`), against values the view writes
    from a fixed calendar, so nothing but the `today` marker may move and nothing did: **51 of
    51** in three engines; `day.spec.ts` 18 of 18. The spec program carries no Node types by
    design, so `process` is declared in the one spec that reads it

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

- [x] **4.32 — the dialog's scroll-lock case is a coin toss in WebKit, and only there**
  - measured on 2026-09-02, in isolation and idle (not under the 22-worker load that
    excuses an ordinary flake): `dialog.spec.ts › "the page stops scrolling, and starts
again"` fails **1 run in 3** in WebKit at the `Escape` step — the panel is still in
    the DOM when `toHaveCount(0)` asks — and passes deterministically in Chromium and
    Firefox. Surfaced by the 2.1.1 full sweep, which touched nothing a dialog reads (a
    sidebar route, layout tokens), so the margin is old and the day it first went green
    was the coin landing well
  - the suspicion to test first: the `mouse.wheel` just before `Escape` — a wheel over a
    modal in WebKit may move focus or leave the scroll settle racing the keydown, and
    `settledScrollY` waits for the page, not for the panel's focus
  - binds at: **the next red CI run it causes** — a retry currently absorbs it, and a
    fix belongs beside the dialog, not inside 2.1 · _notes:_ **closed (2026-09-05),
    re-measured at the commit it was written on.** Four runs of twelve red in WebKit at
    the commit this item was written on (the parent of 0c20b25) — every one at the LOCK assertion, `expect(await scrollY()).toBe(locked)`, with
    `locked` read mid-flight: [`lesson-149`](lessons.md#lesson-149)'s defect, not the Escape
    step this item named, and the commit that wrote lesson-149 the next morning (0c20b25)
    makes the same twelve green. The suspicion here pointed at a step that never failed — a
    probe pressing Escape with no settle at all is 20 of 20 in WebKit. Today: 42 of 42 in
    isolation, 135 of 135 over eight workers in three engines; nothing to fix beside the
    dialog. What was wrong was the record, and that is
    [`lesson-164`](lessons.md#lesson-164)
- [x] **4.33 — the button's faces stop at `<button>`, and the site is the consumer that
      noticed**
  - `PctButton` dresses `button[pctButton]` only; a link that should look like a button
    — the landing's hero CTA, any "Get started" pointing at a route — has no library
    answer, and the docs app (2.1.6/2.1.7) settled for `<button routerLink>`: it
    navigates, but it is not an `<a>` — no open-in-new-tab, no link semantics for a
    crawler. First raised by the site's own CTAs; recorded in 0062's costs
  - the shape when it binds: widen the selector to `a[pctButton]` at the full 1.1 regime
    (decision, e2e in three engines — a link keeps its role and its underline policy,
    focus-visible parity with the button, forced-colors reading — mutation, card)
  - binds at: **the premiere's link audit (2.1.8/3.1)**, or the first consumer who asks
    for a link in button's clothes — whichever lands first · _notes:_ **decided
    (2026-09-07): widen the selector now, ahead of the site's design pass.**
    `a[pctButton]` at the full 1.1 regime — decision, e2e in three engines, mutation,
    card — so the pass has a link in button's clothes to paint with instead of rewriting
    the landing's CTAs twice. The trigger named above is met early on purpose: the
    consumer that noticed is the site, and the site is the next thing to be rebuilt
  - **done (2026-09-07), and the widening was the easy half.** The selector is
    `button[pctButton], a[pctButton]`, one component over two tags as
    `input[pctText], textarea[pctText]` already is, and the decision is
    [0071](decisions/0071-a-link-in-button-s-clothes-is-a-link.md). What the tag really
    costs is the one state the platform has on one element and not the other: the paint
    moved off `[disabled]` — an attribute an `<a>` can never carry — onto
    `data-pct-disabled`, written on both, while the native attribute stays on the button
    and `aria-disabled` plus a refusal stands on the link. The disabled link keeps its
    place in the tab order deliberately, and a real `Tab` walks onto it in the case
  - **the refusal had to be measured, and the obvious spelling of it is wrong.** A
    `(click)` in `host` calling `stopImmediatePropagation()` does not stop the consumer's
    own `(click)` on the same element: at the target both listeners run in REGISTRATION
    order and the template's is first. What works is a capture listener attached in the
    constructor, and both halves are needed — the early registration for a press on the
    element, the capture phase for a press on the projected label. Two unit cases, one
    each, and [`lesson-166`](lessons.md#lesson-166)
  - **and the gate's own negative control had already predicted this step.**
    `check-harness` kept a fixture whose whole content was "the harness also answers to
    `a[pctButton]`, which the component does not" — the moment the component did, the
    fixture stopped failing, which is the one way a gate lies quietly. Re-pointed at
    `span[pctButton]`, and its neighbour (a second harness on the button's selector)
    re-pointed at the new list so it fires for the reason it claims
  - **and the cost record caught the first version paying for all of it on every button.**
    The listener was attached in the constructor unconditionally, so `check-bench` read
    `button: listeners 0 → 6` on a preview holding six buttons — six subscriptions for a
    refusal only a link can need, in every application that draws a button. It is attached
    on the anchor alone now and the record reads 0 again, which is the whole argument for
    a gate that counts what a page really holds rather than what a diff looks like
  - measured: 16 unit cases over the two tags; four e2e cases in three engines — the role
    and the name from the accessibility tree, nine computed properties identical to the
    button beside it with `text-decoration-line: none` on top, the focus ring lit by a
    real `Tab` and equal to the button's, and a disabled `routerLink` refused by pointer
    and by `Enter`; one forced-colours case reading `LinkText` on the face's edge and
    `GrayText` on the disabled link. The full suite: 1739 of 1741, the two red ones a
    known flake of this section's own 4.2 (green 3 of 3 alone) and a card picture that
    moved because a card was inserted above it (`lesson-165`'s family — the same text at
    a different height is antialiased differently), re-recorded. `docs-e2e` 362 of 364,
    the two the component page's own pictures, re-recorded for the example that was added;
    the landing's pictures did not move a pixel when its CTAs became anchors.
    `./button` 8597 → 9669 B, `./testing` +14 B
  - **left open on purpose:** the mutation row for `button.ts` (`100.00 7(0) 0 0 2`) is
    NOT re-measured here — the run is ~50 minutes and it is deferred to an evening pass
    over several steps at once (2026-09-07, the maintainer's call). The branch that reads
    the tag and the handler that refuses a press are both new mutants, so the row is
    known-stale until then, and the nightly is the first thing that will say so
  - two things the step found rather than fixed: Playwright's own actionability reads
    `aria-disabled` as disabled and waits out the timeout, so the press that has to be
    refused is made with `force` (a second reading of the state, from a tool nobody told);
    and the card's `**ARIA APG pattern:**` grammar states ONE platform element, so the
    link is stated in the prose after the dash. The site is the consumer this closes for:
    the landing's two hero CTAs are anchors now, and 0062's cost is marked paid
- [ ] **4.34 — the first human review of the site: good in parts, owed a design pass**
  - delivered 2026-09-02 over the running preview, the day 2.1 closed: parts of the site
    look very good, a lot does not — and the direction is explicit: the site will still
    change heavily, toward more professional and prettier pages
  - not a machinery defect: the numbers, the gates, the demos and the prerender all
    stand; the gap is visual design — composition, rhythm, polish — the one axis 2.1
    measured least
  - binds at: **the next site session** — it opens with the reviewer's list of concrete
    screens, not with a guess · _notes:_ **decided (2026-09-07): landing, then the
    gallery, then a component's card, then the rest.** The order is the visitor's own
    walk — `theming`, `start` and the trust pages come last, because whoever reaches
    them is already convinced. Each screen goes the way the component card went: a
    sketch to look at, a yes, then the sketch carried over literally with the library's
    semantics underneath it. So the pass opens with the landing's sketch and not with an
    edit to its stylesheet
  - **and it inherits three hand copies of the brand gradient from 4.36.** The component
    exists now (`[pctHero]`), and none of the three is a swap that can be made without a
    design decision: the headline's two-beat entrance is not the library's, the identity
    tiles use one stop as a rule rather than the `edge` face, and the live cards paint the
    NAME from the CARD's hover — a trigger `show="interact"` cannot say, because it reads the
    attention on the element wearing the face. Each is a question for the pass, and the
    fourth copy the item warned about is the thing to refuse while answering them
  - **the landing's two sketches went out on 2026-09-07, and the pass waits on a yes.** Same
    words, same numbers, same components in both — no fact added, dropped or rounded — and the
    difference is what a reader meets first. **A, the instrument panel:** the hero splits, the
    claim on the left and a gate readout on the right, monospace and tabular, with the evidence
    strip rebuilt as one hairline instrument and the inventory as a four-column dotted index.
    **B, the quiet proof:** a narrow measure, a seal instead of a badge row, the demos set as
    figures with their captions beside them, and the five numbers arriving once, after them
  - what the sketches ask for besides A or B: **the gradient's budget** (both cut it back to
    two words and the CTA, which is also where 4.36's three hand-copies get decided), and
    **whether mono becomes a second face** — a decision that reaches the gallery and the
    component card, not this page alone
  - **answered 2026-09-08, and the answer is neither plate.** The landing as it stands is the
    one that has had the work — it has moved a long way since this item was written — so it
    stays. What the review kept is **one part of plate A: the inventory**, which reads better
    as an index than as thirty-four boxes. Carried over literally: a dotted-leader list, name
    and root selector, monospace, four columns on a wide page — still `pct-grid`, because the
    paragraph above the list says it is and a page that says so has to be it. The toast's row
    says `service` rather than standing empty, which is what its card says too
  - so the pass does NOT open with the landing any more. The order that stands is the gallery,
    then a component's card, then the rest — and the gradient's budget and the mono question
    are open where they always were, with 4.36's three hand-copies still inherited
  - **the gallery was read on 2026-09-08, and almost nothing about it is wrong.** Four
    independent readings over `/components` — one for finding a component among 34, one for
    composition and rhythm, one for the brand's budget, one for the card itself — raised
    **24 objections; 2 survived being argued against**, each verified against the files rather
    than accepted. The rhythm I went in expecting to repair is not broken: every card is
    **330 px** to the pixel (body 119, stage 209) in every row of every bucket, and the
    screenshots that read otherwise were scaled. The sketch went out as an artifact and the
    pass waits on a yes, the same order the landing went in
  - what STANDS, and both are one defect: **the page cannot be arrived at.** The six `<h2>`
    carry no `id`, so `/components#choices` does not exist and nothing on the site can point at
    a band of it — while the anchor mechanism is already paid for twice (`--docs-anchor-offset`
    for the native jump, `ViewportScroller.setOffset` for the router's) and fragment links
    already ship on the component page and its table of contents. 5430 px of page, and
    **1758 px down to `select`** for a visitor who already knows it is filed under "Choices".
    Two plates: **A**, six anchor chips under the lead — cheap, and each chip is a link owing
    the 24 px floor outright, so below ~800 px it wraps to 3–4 rows and costs 100–170 px rather
    than the 40 it looks like ([`lesson-139`](lessons.md#lesson-139)); **B**, the finder the
    site ALREADY ships — `docs-index` filters this same list on `id` and class name with an
    empty state written, and appears only in the drawer below 720 px and in the component
    page's left column. Recommended: **B with A's anchors inside it**, which moves nothing else
    on the page
  - and what stands second is a deletion, recorded so it is not proposed a third time:
    **`auto-fit` cannot repair the nine ragged cells.** `pct-grid` already declares it, and it
    collapses empty TRACKS, not empty cells — five items across three columns collapse nothing.
    Stretching the survivors needs flexbox, and a wider card renders its demo at a width no
    other card uses, on a page whose first sentence promises the demo its own page opens with
  - **the gradient's budget is answered, and the answer is: leave this page alone.** Five
    separate objections to the 34 stages — wallpaper, contrast, forced colours, an invisible
    animation, "replace it with a quiet surface" — and every one was refuted against the files:
    it is ONE rule for all 34 stages, it is the component page's own stage at a card's size, and
    the quiet-surface replacement measured worse than leaving it. The debt that is real is the
    hand copy itself, now measured: **`hero-edge.scss` still runs `linear infinite`** while 4.37
    made every sweep in the library one pass of four seconds and then stillness. The site's copy
    has drifted from the component it was copied from, which is an argument for the extraction
    and not for repainting the gallery
  - **mono does not become a second face.** It carries the strings — selectors, entry points,
    tokens, the landing's index — and that is a rule anybody can state; a mono heading makes it
    decoration and spends the distinction the same page depends on
- [x] **4.35 — the popover's axe audit can catch a button mid-transition, in two
      engines at once**
  - CI run 33680164640's sibling (2026-09-02, run 33681596258): `a11y.spec.ts › an open
popover has no violations` flaked in firefox AND webkit on the same measured pair —
    `panel-apply`'s label at 4.09 (#eff4fe on #366fed), a pair that is no resting state
    of the button (the resting faces pass this audit on every commit). A retry absorbed
    both; the toast-stack audit flaked once beside it
  - the suspicion to test first: the audit runs right after the interaction that opens
    the panel, and a colour `transition` is still travelling when axe reads the pixels —
    a reduced-motion context or a settled wait before `analyze()` would pin it
  - binds at: **the next red it causes** — today it is a retry's cost, and the fix
    belongs beside the a11y spec, not inside 2.1 · _notes:_ **closed as filler (2026-09-05),
    with the suspicion measured first.** A probe in three engines at the moment
    `toBeVisible()` resolves for the popover's panel found two CSS transitions running at
    0–35% of their 150 ms — the panel's own `opacity` fade from `@starting-style` and the
    trigger's `background-color` travelling back — so the audit read the panel's colours
    composed over the page at a third of their opacity, which is where a label at 4.09:1 on a
    background that is no resting state comes from. The fix is one wait in `audit()`:
    `settled(page)` in `support/dom.ts` waits for every transition and finite animation on
    the page (`document.getAnimations()`, infinite ones left running — a spinner's loop and
    the hero's drift are the resting state), so every audit in the file reads the page at
    rest and no case has to know which transition its click set off. Reduced motion was the
    other road and is the wrong one: it audits a state most users never see. A control case
    slows the motion axis to two seconds through its token and holds both halves — something
    in flight when the panel is first visible, nothing finite once waited for. The panel
    audits (popover, menu, dialog, tooltip, the toast stack) and the control, three times each
    in three engines: **108 of 108**
- [x] **4.36 — the loud face is equipment the consumer cannot ask for: three hand copies,
      no gate**
  - the brand gradient exists once as API — the button's `variant="hero"`
    ([0058](decisions/0058-the-hero-face-is-paint-and-a-gradient-is-three-contrast-checks.md))
    — and three more times as hand-written CSS in the site's own stylesheet: the headline
    clips it to text, the identity tiles take a stop each for a border, and the live cards
    light a rim and paint a component's name (2026-09-04). `lesson-21` asked for the
    extraction before the second copy
  - the shape is decided, not the build:
    [0065](decisions/0065-a-treatment-that-paints-is-a-component.md) — a component with an
    attribute selector, `pctHero="edge | text | fill"` and `show="always | interact"`, one
    face per element. A directive was refused because it carries no stylesheet and this
    package ships no global rules to lend it one
  - what the extraction BUYS is the argument for it: point 7 of `check-tokens` demands a
    contrast entry for every colour a library stylesheet paints, so the face's stops become
    checks that fail a build. Today the site's headline is painted in three colours nothing
    has ever measured, and axe cannot help — text clipped from a background carries
    `color: transparent`, so it reports that it cannot tell rather than that it is wrong
  - what it needs first: **two new primitives** (a violet and a cyan near the 400 level) so
    the `text` face has a dark ground it can stand on — the brand's own stops are 3.13–3.45
    there, legal as an edge at the 3:1 bar and not as 16px text at 4.5 — and a
    `mask-composite` probe in three engines, whose first bill is already paid
    ([`lesson-156`](lessons.md#lesson-156))
  - binds at: **the site's design pass (4.34)**, which is where a fourth copy would be
    written, or the first consumer who asks for the face outside the button — whichever
    lands first · _notes:_ **decided (2026-09-07): three faces, and the palette takes
    the two primitives.** `pctHero="edge | text | fill"` as 0065 has it, and a violet
    and a cyan near the 400 level so the `text` face has a ground it stands on at 4.5
    rather than at the brand's own 3.13–3.45. 0020 says the palette carries no spares
    and it is kept: both primitives have a consumer the day they land, because the face
    is what asks for them — and point 7 of `check-tokens` then turns the three unmeasured
    headline colours into contrast entries that can fail a build. Said more precisely than
    it was: the point's denominator is the `libs/components` stylesheets, so the SITE's
    copies stay outside it whatever the gate learns — what the extraction buys is a
    measured face the site can use, not a measurement reaching the site
  - **done (2026-09-07): the equipment exists, the gate exists, and the copies outlived
    both — on purpose.** `[pctHero]` is the 34th entrypoint: `edge`, `text` and `fill`,
    `show="always | interact"`, one face per element, exactly the shape 0065 decided. The
    palette took the two primitives with the consumer that asks for them — and the LEVEL is
    a measurement rather than a mirror: `cyan.400` reads 9.88:1 on the dark surface against
    `violet.400`'s 6.56 and `blue.400`'s 7.02, so the sweep would have had one end that
    shouts. `cyan.500` lands at 7.35 and the three stand together, which matters as much as
    the numbers because a gradient's weakest stop is the one nobody looks at
  - the `text` face got its own trio (`--pct-hero-text*`), and only the DARK theme lifts it:
    the surface stops stay the brand's one blue on both skins, and it is the word cut out of
    them that has to move — 7.02, 6.56 and 7.35 in the dark, where the unlifted stops read
    3.45, 3.13 and 3.33. Six entries in the contrast policy, three at AA for the word and
    three at UI for the boundary, all six printed by every token build in both themes
  - **and the gate this step was supposed to buy turned out to need one more thing.** Point 7
    of `check-tokens` reads the colours a stylesheet paints off the compiled CSS by PROPERTY
    NAME, and `background-image` matches none of its three roles — so the button's own hero
    face has never been in that denominator either, and its three policy entries are there
    because a person put them there. The component writes `background:` instead, which the
    point does read: the stops of a library gradient are now measured because the gate
    demands them, not because somebody remembered. **4.39 closed the other half** — the
    reader now reads a value rather than a property name, so the button's face is in the
    denominator too and the sentence above is history rather than a description
  - the probe 0065 asked for, before the code: `mask-composite` reads `xor, xor` in all three
    engines — one value per mask LAYER, not per property, which is what the first version of
    the case got wrong — and the rim is a rim rather than a filled card in every one of them
  - **and the extraction carried a defect no gate here could have seen.** It kept the button's
    keyframe (`background-position: 300%`) beside the site's sizes (`background-size: 200%`),
    which are two numbers that have to be one: the travel is `position × (box − image)`, so
    200% over 200% is a closed loop and 300% over 200% is one and a HALF — the sweep snapping
    back half a gradient at every repeat, on every rim and every headline. A frozen picture
    cannot show it, the cases read `background-image` and `animation-duration`, `check-styles`
    reads patterns rather than arithmetic between two declarations, and a stylesheet has no
    mutants. It came out of reading the extracted sheet against the two it was extracted from.
    Two keyframes now, one per size, and a case reads the SIZE and the ANIMATION of each face
    together, because the invariant lives between them ([`lesson-167`](lessons.md#lesson-167))
  - **what did NOT move, and why it is not a silent narrowing.** The site's three copies stay
    where they are, because not one of them is a like-for-like swap: the landing's headline
    adds a two-beat entrance (a bloom, then the drift) that the library does not own; the
    identity tiles take ONE stop each as a top rule, which is not the `edge` face at all; and
    the `hero-edge` mixin's trigger is the CARD's hover painting the NAME inside it, while
    `show="interact"` is the attention on the element wearing the face. That last one is a
    shape 0065 did not name, and it is the site's design pass (4.34) that decides whether the
    component grows a way to say it or the pages change to fit what it says
  - measured: 4 unit cases, six e2e cases over three engines (18 runs) plus the forced-colours reading and
    the reduced-motion one (the face divides the axis, so `calc(0s / 2)` is what freezes it);
    `./hero` **5594 B** on `@angular/core` alone, `./testing` +90 B, tokens 534 → 539. The
    mutation row for `hero.ts` is owed with `button.ts`'s, in the evening pass
  - **and it inherits the debt 4.37 decided the same day.** All three faces drift for as long
    as the element stands, which is the state 2.2.2 is about — the decision recorded hours
    earlier is that the sweep runs its pass and settles inside five seconds, so this component
    is the second place that has to change when 4.37 lands, not an exception to it — and the
    revision hours later makes that two changes here and not one, since the page gets a
    control over the sweep as well as a pass that ends by itself

- [x] **4.37 — the conformance report's rows nothing measures, and two limits with no gate**
  - the ACR (2.2, `docs/acr.md`) is rendered from what the gates prove, and four criteria of
    WCAG 2.2 AA have no gate behind them at all, so their rows say _Not Evaluated_ and point
    here: **1.4.4** Resize Text (no view rendered at 200 % text size), **1.4.10** Reflow (no
    view laid out at 320 px), **1.4.12** Text Spacing (the overrides never applied and read
    back), **2.4.11** Focus Not Obscured (nothing measures whether the toast stack or a panel
    covers the focused element)
  - and two rows say _Partially Supports_ on a limit that is the library's, not the gates':
    **1.3.5** — `[pctNumber]` writes `autocomplete="off"` on its own input, so a numeric
    purpose from the list (`bday-day`, `bday-year`) cannot be declared on it; **2.2.2** —
    the `hero` face's gradient drifts for as long as the button stands, and the only thing
    that stops it is `prefers-reduced-motion`, a user agent's mechanism rather than a control
    on the page (a consumer who ships the face beside text the user reads owes one)
  - the shape of the first four is one e2e spec over the sandbox views — a 320 px viewport,
    a 200 % text size, the text-spacing declarations, a focused control under an open toast —
    each asserting that nothing is clipped, overlapped or lost; the fifth is a decision about
    the number field's `autocomplete`; the sixth a `pause` input on the face, or the
    finding closed by 4.36's component
  - **done (2026-09-07): the four Not Evaluated rows are gone and 1.3.5 is closed; only
    2.2.2 is left, and this item stays open for it.** `apps/sandbox-e2e/src/adaptation.spec.ts`
    measures all four: every one of the thirty-five views at 320 px (one case per route, three
    engines), the kitchen sink at 200 % text and under the criterion's own text-spacing
    declarations, and a focused control under a standing toast read with `elementsFromPoint`
    rather than by comparing rectangles. The report now has **no Not Evaluated row at all** —
    34 supports, 2 partially supports
  - **the first run was red, and three of the four defects were real.** Nine of the
    thirty-five views scrolled sideways at 320 px: the sandbox's shell is a column of flex
    items with `align-items: flex-start`, which in a column means "as wide as your own
    content"; its two-card grid had a `minmax(280px, 1fr)` floor wider than the window; and
    `pct-field` had no `min-width: 0`, so its automatic minimum was the native input's
    twenty-character intrinsic width — 282 px measured, which a 320 px window has no room for
    once a page has any padding. The first two are the harness, the third is the library and
    is fixed here (`./field` 27788 → 27866 B). The other three criteria passed on the first
    run, which is worth as much as the failures: they were claimed by nobody until today
    ([`lesson-175`](lessons.md#lesson-175))
  - 1.3.5: `[pctNumber]` takes an `autocomplete` input typed as the platform's own `AutoFill`,
    defaulting to `off` — so nobody who ships the field today sees a change, and a consumer
    collecting a date of birth can declare `bday-year`. Two unit cases, and the row is
    Supports
  - **what is left is 2.2.2, and it is not the row this item described.** The claim names two
    perpetual motions, the `hero` face's gradient AND the skeleton's sheen; the decision above
    settles the first and says nothing about the second, which is a component another pass is
    changing as this is written. Beyond that, making the brand's one loud face stop after a
    pass is a change to what the library LOOKS like, and the visual consequence is the kind of
    thing this repository shows before it ships
  - binds at: **the first buyer who asks for the report**, or the site's design pass (4.34),
    whichever comes first · _notes:_ **decided (2026-09-07), for the two rows that are
    limits rather than gaps.** 1.3.5: `[pctNumber]` takes an `autocomplete` input
    defaulting to `off`, so a consumer can declare `bday-day` and nobody who ships the
    field today sees a change; the row goes to Supports. 2.2.2: the hero's gradient
    stops being perpetual — it runs its pass and settles inside five seconds, so the
    criterion does not apply and no pause control has to be invented, nor the duty of
    drawing one handed to every consumer of the face. The four Not Evaluated rows keep
    the shape written above: one e2e spec over the sandbox views at 320 px, at 200 %
    text, with the text-spacing declarations applied, and with a focused control under
    an open toast
  - **revised the same day (2026-09-07): both mechanisms, and what has to be settled is the
    order between them.** The settle stays the default — the sweep runs its pass and comes to
    rest inside five seconds, which is what takes 2.2.2 off the table for a consumer who does
    nothing — and the page gets a control besides, so a face standing next to text somebody is
    reading can be stopped where it is without waiting the pass out. Three things can then
    stop one motion, and the precedence is not negotiable: `prefers-reduced-motion` is the
    reader's and wins over both, the page's input comes next, and the settle is what happens
    when neither has spoken. The name of the input, and whether releasing it replays the pass,
    belong to the step that writes it. The objection to a second public name was mine and it
    was loose: nothing here is stable yet, so a name costs a card, a gate and a demo rather
    than a break — and 0011 and 4.14 argue for deciding a set ONCE, not for having fewer of
    them
  - **done (2026-09-07): the sweep ends, the page can stop it, and the row's remaining half is
    an argument stated rather than a limit hidden.** Every face of `[pctHero]` and the button's
    `hero` variant run one pass of `calc(var(--pct-motion-drift-duration) / 2)` — four seconds
    — and then stand still, so the criterion's second condition is not met and no consumer owes
    a control. `paused` on `[pctHero]` is the other half, a boolean input that freezes the
    sweep where it stands (`animation-play-state`), and the precedence is written into the
    stylesheet and the card: reduced motion beats the page, the page beats the settle
  - measured: two e2e cases read it as MOVEMENT rather than as a declaration — the computed
    `background-position` moves within 400 ms, is the same value at 5.2 s and at 6 s, and with
    `paused` does not move at all and then moves again when the page lets it. A unit case holds
    the attribute, and a sandbox demo is the control it documents (`/hero`, "Stopped by the
    page")
  - the visual consequence, which is what this repository shows before it ships: **the still
    picture does not change at all**. 78 visual baselines pass untouched, because the travel is
    a whole gradient and the frame it settles on is the frame it started from. What changed is
    the tempo — the face reads twice as brisk during its one pass — and that it now has an end
  - what did NOT change, and why the row stays Partially Supports: the skeleton's sheen travels
    for as long as the wait does, because a busy indicator that stopped would say the work had
    finished. The remark now states the argument — the sheen is `aria-hidden`, the wait is
    announced by the consumer's `aria-busy` region, and whether the movement is "essential" in
    the criterion's sense is an argument rather than a measurement — instead of pointing at
    this item. Both limits the item named now have a gate, which is what it asked for
    ([`lesson-178`](lessons.md#lesson-178))

- [x] **4.38 — three previews settle in two render passes**
  - the cost record (2.3, `apps/docs/bench.snapshot.md`) reads **2 renders** for the `menu`,
    `popover` and `toast` previews and 1 for the other thirty: after the first pass
    something wrote a signal a template had already read, and the application went round
    again. Each of the three owns an overlay trigger, so the suspect is one shared piece —
    the trigger's registration of the panel, or the toaster's viewport — and not three
    separate faults
  - the shape of the fix is a read of what writes in the first pass (`afterEveryRender`
    with a counter is the whole rig, and the bench already has it), then the write moved
    to construction or to `afterNextRender`; the record then reads 1 and the gate makes
    the change visible, which is the point of the record
  - binds at: **the next change to the overlay trigger or the toaster** — the file will be
    open · _notes:_ **closed the same day, from the record's own reading.** Not one shared
    piece but one shared shape, and behind the toaster's a second cause of its own: the menu
    and the popover kept a `rendered` signal flipped in `afterNextRender` — the gate that
    keeps the overlay a browser-only thing — and an effect read it, so the flip after the
    first render was a whole pass of the application on every page holding one; the toaster
    kept a `mounted` signal gating the viewport's list the same way, and attached the
    viewport to the application and set its input after that render, which the scheduler
    answers with a pass unconditionally. The flag is a field now, and what its flip used to
    trigger through the effect is done once in the callback that flips it — with the
    effect's signals read before the gate, because the first version forgot that and the
    development warnings' effects never ran again (three unit cases said so); the toaster
    keeps a queue for messages raised before the region exists and joins change detection
    with its first message, which is a pass anyway. The record reads **1** for all three,
    0 scenes settling in more than one render, and `check-bench` holds it there
    ([`lesson-161`](lessons.md#lesson-161)). Unit: 1150 of 1150. Sandbox-e2e for the three, chromium: 52 of 52.
    Deciding run, after 2.6 and this: docs-e2e **364 of 364** in three engines — 360 on the
    first pass, the four left being the trust page counting 160 lessons off a dev server that
    had not picked up the regenerated content (161 on disk, and on the page once the server
    was restarted) and one firefox anchor timing, all six green alone. **The bytes came the
    commit after**: `check-bundle` was not among the runs above, and the size record stood
    at the old numbers for one commit — `./menu` +93, `./popover` +98, `./toast` +316 B,
    the field and the queue — written the moment the next gate run read it

- [x] **4.39 — the gate that measures painted colours cannot see a gradient**
  - point 7 of `check-tokens` builds its denominator from the compiled CSS **by property
    name**: `/^background(-color)?$/` is the background role, and it matches `background`
    and `background-color` and nothing else. So a stylesheet that paints with
    `background-image` paints colours the gate never counts — and the library has exactly one such place,
    `button.scss`'s hero face, whose three stops therefore stand in `contrast.policy.json`
    because 0058's author put them there and not because anything demanded them
  - found on the way into 4.36, which is why the new component writes `background:` for every
    gradient and says so in its own header. Two rules of one library now spell the same paint
    differently, and only one of them is measured
  - the same hole is one property wider than gradients: `box-shadow` is invisible to the point
    too, and `calendar.scss` paints today's ring with a token through it — the policy carries
    that entry by hand as well
  - the fork is small and real: teach the point the two properties (a gradient's stops are
    colour FUNCTIONS inside a value, so the reader has to walk the value rather than the
    property alone), or leave it and record in the policy's header which entries are
    hand-placed because no gate could ask for them. The first is the repository's own
    argument; the second is what it does today without saying so
  - binds at: **the next gradient or shadow a library stylesheet paints**, or the first time
    a policy entry is deleted and nothing goes red · _notes:_ **done (2026-09-07), and the
    fork went the repository's own way: the reader was taught, not the header.**
  - the point reads a VALUE now, in two shapes, because a property name promises two
    different things. Where the whole value is a colour — `background`, and
    `background-image` beside it — every `var()` under it is a colour and a dimension there
    is still `not-a-colour`. Where the value is COMPOSITE — a `box-shadow`'s offsets, spread
    and colour, all legal side by side — the property is authority over nothing and the
    skin's own `$type` decides. Written as one list instead, it is a false positive on the
    first shadow: measured, eight `$type: shadow` tokens fire `not-a-colour` at once
  - **the gain, measured rather than asserted.** The denominator moved 239 → 240 colours, and
    the one that arrived is `--pct-date-day-border-today` — the ring around today, painted
    only through a `box-shadow`. Deleting `UI: the ring around today` from
    `contrast.policy.json` was a green run before this step and is
    `[unmeasured] … stands in no pair of the policy` after it. The hero stops moved the other
    way: they were in the denominator only because 4.36's component spells the shorthand, and
    now `button.scss` demands them on its own
  - two cases and one line in the reference, each a control for its own half and measured as
    such: dropping `-image` from the background pattern turns `colour-in-a-gradient` green
    and leaves `colour-in-a-shadow` red, emptying the composite table does the reverse, and
    removing the `$type` test makes the reference itself fire on its own two dimensions —
    the second reached through the assignment expansion. 36 prepared inputs now, from 34
  - what the composite reading does NOT buy, measured against the flat alternative and
    written down where it happens — and the three are not equal. A length in a length slot is CORRECT and had to stop firing; a name
    outside the skin is point 8's, which reads every property; but a token of the skin with
    a non-colour `$type` in the COLOUR slot — a `box-shadow` whose colour is
    `var(--pct-space-3)` — is caught by nothing, and the browser answers it by dropping the
    declaration. **That last one is not a loss**, and the adversarial pass is what got the
    word right: before this reading the property was not walked at all, so nothing caught it
    then either. It is the one thing the new reading still cannot say. The eight `$type: shadow` tokens stay unmeasured by decision
    rather than by oversight, and the decision is already written in three component token
    files (menu, popover, toast): the panels separate themselves with `border-strong`
    precisely because a shadow does not, and forced colours takes a shadow away in two
    engines of three ([`lesson-119`](lessons.md#lesson-119))
  - **one property and not two, and that was a correction.** The first cut had `text-shadow`
    beside `box-shadow` on the argument that they are one value shape — and the library
    paints not one, so it was a pattern covering nothing, which is the construction this very
    file refuses four times over (a dead prefix, a dead word, a dead `on-` pair, a dead
    primitive). It arrives with the first stylesheet that paints one, together with its case
  - two limits of the reading, stated here rather than discovered later. The first is
    older than this step and now written down: "the whole value is a colour" is the point's
    MODEL, not a fact about CSS — `border: 1px solid …` carries a width, `background` a
    position, and a gradient carries stop positions, so a token in one of those slots would
    fire `not-a-colour` on correct CSS. Every one of them in this library is a literal, and
    the answer if that changes is `withoutMixAmounts`, one function over. The second is the
    declaration scanner stopping at the first `;`, which a data URI carries — the hole 4.40
    is about, and `background-image` is the property that attracts them
  - [`lesson-168`](lessons.md#lesson-168): a gate that reads declarations reads values, and
    the control to write for a pattern-built denominator is not "does the gate pass" but
    "does deleting this policy line turn it red"
  - **no decision record, and that is a choice rather than an omission.** The fork had a real
    alternative and a real cost, which is the shape a decision takes here — but the normative
    half already has a home in a requirement (`req-token-text-pairs`' gate paragraph carries
    both the two readings and the blind spot), and the evidence has one in the lesson. An ADR
    would be a fourth copy of the same sentence, and this repository's rule for a fourth copy
    is the one it applies to tokens

- [x] **4.40 — a word with a colon inside a comment eats the declaration after it**
  - the declaration scanner —
    `/^\s*(-{0,2}[a-z][a-z0-9-]*)\s*:\s*([^;{}]+);/gm`, written twice in `check-tokens`:
    once for point 7 (what is painted) and once for point 8 (what is touched), which point 9
    then reads for its list of readers — walks the COMPILED CSS, and sass keeps a loud
    comment in it. A comment line whose prose contains `word:` therefore parses as a property
    whose value runs to the next `;`, swallowing the real declaration that follows
  - **measured over the library, not deduced**: four declarations are misread today, each
    losing its property to the word before it — `left: 50%` in `checkbox.scss` and `radio.scss` (read as `improvement`),
    `container-type: inline-size` in `container.scss` (read as `stage`) and, the only one
    carrying tokens, the `max-block-size` of `menu.scss` (read as `screen`), which is a
    `min()` of `--pct-menu-panel-max-height` and a viewport height less two `--pct-space-5`
  - **what is lost is the PROPERTY, not the tokens** — measured after a first reading of this
    got it backwards. The captured value runs from `screen:` through the real declaration, so
    the `var()` names inside it are still extracted: point 8 records both menu tokens as read,
    and it is the only record `--pct-menu-panel-max-height` has anywhere. What no point can
    see is which property they were painting, and that is exactly the question point 7 asks.
    Harmless today because all four declarations carry dimensions
  - what the hole really says is that the gate's reach depends on the prose above a
    declaration — the day a swallowed line paints a colour, point 7 counts nothing and stays
    green, which is [`lesson-33`](lessons.md#lesson-33)'s shape reached by a comma
  - found on the way out of 4.39, by a sweep that asked what the reader cannot see rather
    than what it reports. The same `[^;{}]+` also stops at the `;` inside a data URI, and
    `background-image` — the property 4.39 just taught it — is the one that attracts them
  - the fork: strip loud comments before the walk (one line, and it changes what three
    points measure at once, so it wants its own fixture), or parse rather than match. The
    first is the proportionate one
  - binds at: **the next declaration a gate has to see that stands under a comment with a
    colon in it**, or the first data URI in a library stylesheet
  - _notes:_ **done (2026-09-07): the comments come out of the input, one call, at the
    gate's own reader.** The proportionate fork of the two, as written above. What it buys
    is measured and it is not a red line: the live run is unchanged — 240 colours painted,
    496 names touched, the same numbers before and after — because all four recovered
    declarations carry dimensions and the points that lost them ask about colours. What
    changes is that the four now reach the scanner under their own property, so the
    guarantee is no longer conditional on the prose above a declaration
  - **where the strip stands is half the step.** `check-styles` reads the same compiled
    output and MUST see the comments — its exceptions are written `/* pct-exception left: … */`
    — and the comment that swallowed the checkbox's `left` is one of them. Two gates, one
    text, opposite needs: the strip belongs to the reader that must not see them and not to
    a shared helper, which would have had to choose for both
  - control: `colour-under-a-comment`, a painting under prose the scanner reads as a
    declaration. Disarmed — the strip made an identity — the case PASSES and the harness
    reports point 7 as having "stopped examining anything", which is the exact statement: a
    swallowed painting is not a wrong answer but no answer. 37 prepared inputs now, from 36
  - **the first version of that case proved nothing and the disarm caught it.** Two
    conditions have to meet: the comment stands inside a rule (a captured value may hold no
    `{`, so a comment above a selector swallows nothing) and the word carrying the colon
    begins a line (a property is anchored to the start of one). The first draft had neither
    and was green both ways — [`lesson-169`](lessons.md#lesson-169) carries both halves
  - the data URI is NOT taken: the same `[^;{}]+` does stop at a `;` inside one, and no
    stylesheet in this library holds one. A rule covering nothing is what this file refuses
    four times over, so it waits for the first — with its case. Recorded in the code beside
    the strip rather than left as a plan line nobody reads

- [x] **4.41 — CI restores the dependencies and none of the task results**
  - `ci.yml` and `nightly.yml` both cache `npm` and the Playwright browsers, and neither
    restores an **nx task result**. So a dependency bump — or any change the graph calls
    affected — reruns every gate from nothing, including the two that take hours
  - what makes this more than a speed note is 4.2's own measurement: a **restored** result is
    a reading taken from a run that already happened, and a rerun of `components:mutation` is
    a fresh throw of the clock-kill dice. On the numbers in 4.2 that is up to nine points on
    a file nobody edited. A cache here is a **correctness** aid before it is a speed one,
    which inverts the usual argument for one
  - and the usual argument against one inverts with it: a stale cache is normally the risk,
    while here the risk of NOT caching is a red gate on an innocent file. What has to be
    settled is which side of that trade the repository wants, and the answer is not obvious —
    a restored mutation result is also a result nobody re-measured
  - the shape: `actions/cache` over `.nx/cache` keyed on the lockfile and the commit, or the
    hosted remote cache (which is a service and therefore a decision about a dependency, not
    a setting). The first is free and weaker; the second is neither
  - found by the direction review inside 4.2 and left behind by its tick, deliberately: 4.2's
    decision was about which runner starts what, and this is about what a runner may skip
  - binds at: **the first nightly that goes red on a file the commit did not touch**, or the
    first CI bill · _notes:_ **closed (2026-09-07): the cache lands in `ci.yml` and is
    refused in `nightly.yml`, and both halves are written into the workflows themselves.**
  - **the shape this item proposed does not work, and that was measured before it was
    written.** `actions/cache` over `.nx/cache` — the snippet copied everywhere — restores
    the ARTIFACTS of a cached task and not the INDEX that says the hash exists: since nx 20
    that lives in a SQLite table (`cache_outputs`) under `.nx/workspace-data`. Restored on
    its own it reads **0/1 hit**; the database on its own reads **1/1 hit for
    `tokens:build` and leaves `libs/tokens/dist` not existing** — a green build with no
    artifact. So the step names both directories under one key, restored together or missed
    together ([`lesson-172`](lessons.md#lesson-172))
  - what it buys, measured over the root project's fourteen gates on a developer machine: a
    documentation-only push restored **12 of 17 tasks**, 11.2 s against 50.8 s. The five
    that ran are the five whose inputs name documentation — plus `check-support`, which is
    `cache: false` because point 4 reads git history. The inputs lists every gate's comment
    argues for are exactly what decides this, which is why the reading is worth having: it
    is a measurement OF those lists
  - what it does **not** buy is this item's own headline. A dependency bump still reruns
    every gate, because `package-lock.json` is in `sharedGlobals` and every task's hash
    carries it — deliberately, and for the reason `check-forms`'s `externalDependencies`
    note gives one target down: a gate answered from a run taken before the bump is a gate
    that did not see it
  - **the correctness argument is refused where it was aimed.** The item's strongest line —
    a restored mutation result does not re-throw the clock-kill dice — would freeze the very
    distribution the nightly exists to sample, and the item's own next sentence says why
    ("a restored mutation result is also a result nobody re-measured"). The wobble on an
    untouched file is answered by 4.2's runner split and by the snapshot it is measured
    against. `nightly.yml` therefore caches nothing, and its header says so in those words
  - the remote cache stays refused for now for the reason the item gave: it is a service,
    and therefore a dependency decision rather than a setting

- [x] **4.42 — one select tag brings the other, and no reference between them says why**
  - measured by point 12 of `check-bundle` (4.4): `./select` costs **69904 B** for
    `PctMultiSelect` alone and **69907 B** for both tags. The second component is three bytes,
    which means it was already there
  - what makes it a finding rather than a fact of bundling is that the neighbours behave
    differently. `./accordion`, `./breadcrumb`, `./date` and `./field` shed the tags a
    consumer does not name — up to 63% of the bundle — so the pipeline shakes. The six that
    do not are parent/child pairs, where the child injects the container and the reference is
    real. `./select` is neither: a search finds no mention of `PctSelect` in any source of the
    entrypoint outside its own file, and the two classes share only an abstract base
  - the candidates, none of them measured: the linker's output for two components over one
    base (`usesInheritance`), a top-level call in the FESM naming both, or the shared
    `PCT_SELECT_IMPORTS` constant tying their definitions together. Each is testable by
    building the two probes against a doctored package, which is an afternoon and a number
  - why it matters beyond one entrypoint: the answer decides whether 4.4's road out — one
    panel component both triggers hold — would actually save a consumer anything, and whether
    the same trap is waiting for the next entrypoint that grows a sibling tag
  - binds at: **the third tag over the select's template**, or the first entrypoint whose two
    numbers stop agreeing with the explanation above · _notes:_ **closed (2026-09-07): it is
    the `providers` array, and the explanation this item wrote down was wrong.**
  - measured one doctored declaration at a time on the BUILT package, with the gate's own
    probe doing the bundling (`lesson-171`'s rule: no second pipeline). Pristine, `./select`
    reads 69904 for `PctMultiSelect` alone against 69907 for both. Take `providers` out of
    **`PctSelect`** — the class nobody imported — and the one-tag probe falls to **45446 B**,
    24458 B shed. Take it out of `PctMultiSelect` instead, the class the bundle asked for,
    and the reading is 69828: its own 76 bytes, with the sibling still there. The pin is on
    the class nobody named
  - the mechanism: Angular compiles `providers` into `features: [ɵɵProvidersFeature([…])]`,
    a call to a function imported from `@angular/core`, standing in the static `ɵcmp`
    initialiser of the class itself. External, so no bundler may assume it is pure — the
    statement defining the class has a side effect and the class stays, template and
    stylesheet with it. `sideEffects: false` on the package does not reach inside a module
    something else in it is imported from, and hoisting the author's call into a module
    constant does not help either (69916 against 69919): the call that pins is the one the
    LINKER writes ([`lesson-173`](lessons.md#lesson-173))
  - **the candidate this item led with is refuted.** With the inheritance cut out of the FESM
    — `class PctSelect` no longer extending the base, `usesInheritance: false` — the two
    numbers are still three bytes apart. `PCT_SELECT_IMPORTS` is likewise innocent: it names
    directives both classes keep anyway
  - **and the explanation this item gave for the OTHER rows was a coincidence.** "The six
    that do not shed are parent/child pairs, where the child injects the container and the
    reference is real" is true for exactly two of them: `inject(PctStepper)` and
    `inject(PctRadioGroup)` name the parent CLASS. The other four (chips, menu, tabs, tree)
    are pinned by the sibling's own `providers`, and the accordion — whose child injects a
    TOKEN declared beside the class, `PCT_ACCORDION` — sheds. Two mechanisms account for all
    eleven rows, and the snapshot's own prose now carries them
  - the reading is **directional**, which the snapshot now says: the probe imports the first
    export name, so `./accordion` sheds the item and would not shed the group

- [x] **4.43 — a dev-mode message costs a consumer 24458 B, and it is in the `providers`**
  - measured in 4.42: `PctSelect` and `PctMultiSelect` each carry
    `providers: [providePctTemplateHost('pct-…', ['pctSelectOption'])]`, and that array is
    what pins each of them into a bundle that imported only the other one. The report it
    feeds is `pctReportOrphanSlot` — a `console.warn` under `isDevMode()` about an
    `<ng-template>` written where nothing reads it. A consumer who imports one select tag
    pays **24458 B**, a third of the entrypoint, for a message their production bundle
    cannot print
  - what makes it a decision rather than a deletion: the report is the only thing that
    catches a slot under the wrong host, and 0027's whole argument is that a slot is a
    directive precisely so that the compiler and the runtime can both say something about
    it. Taking the providers out would leave every correctly placed slot reporting itself as
    an orphan, which is worse than silence
  - the roads, none of them measured: the slot directive reads the host's tag from its own
    element in dev mode instead of resolving a provider (no `providers`, same message);
    the host declares itself through something that is not a component provider; or the cost
    is accepted and written into the card, which is at least a true sentence about what the
    tag costs
  - the same shape stands over every component that declares `providers` for a reason a
    consumer never asked for — `check-bundle`'s second block is the list, and today the only
    dev-only one is the select's
  - binds at: **the next component that adds `providers` for a dev-mode report**, or the
    first consumer who reads the size snapshot's second block and asks · _notes:_ —
  - **decided (2026-09-07): the slot reads its host off the DOM, and the component declares
    nothing for it.** In dev mode the directive looks at the element it stands on and takes
    the host's tag from there, so the report survives word for word and the array that pins a
    component nobody imported goes away with the providers. What has to be measured before it
    lands is the reading itself: a template written inside an `ng-container`, or projected in
    from somewhere else, is not a child of the host tag in the DOM the directive sees — if
    that case cannot be read, the road is the second one and not this one
  - **done (2026-09-07), and the chosen road was refuted before a line of it was written.** A
    probe rendered the five shapes a slot can take and read `nativeElement.parentElement` on
    each: `null` for a template written directly inside `<pct-select>`, `null` inside an
    `<ng-container>`, `null` inside an `@if` — and an element for the two WRONG placements.
    An `<ng-template>` in a component's content is unprojected content and Angular never
    inserts its anchor into the document, so the DOM answers for every case the report exists
    to accuse and for none of the cases it exists to bless
    ([`lesson-176`](lessons.md#lesson-176))
  - what shipped is the second road, and it needed no new channel at all: the host already
    queries the slot (`contentChild(PctSelectOptionTemplate)`), and finding the template IS
    the statement that it will be rendered. So the query claims what it finds, a slot nobody
    claims reports itself after the first render, and both `providers` arrays are gone with
    `PCT_TEMPLATE_HOST` and `providePctTemplateHost` — a breaking removal from `./core`
  - measured: the probe that imports `PctMultiSelect` alone from `./select` falls from
    **69904 B to 45175 B** (−24729, the whole of the other tag), `./select` itself from 70136
    to 69796, `./core` from 8430 to 8157, and every entrypoint sheds the ~34 B of the token it
    no longer carries — 436938 B to **435587 B** over the package. No component in the library
    declares `providers` for a message any more
  - what it costs, written down rather than discovered later: the message no longer names a
    host that offers other slots, because an unclaimed slot has no way to ask who it stood
    under. That branch had a case in `core.spec.ts` and was unreachable in the shipped
    library — the only two components that read slots read the same one. And the report now
    waits for `afterNextRender`, so it says nothing during server-side rendering, where there
    is no render to be after

- [x] **4.44 — a floor the case above it does not stand on**
  - found by 4.19's disarming: `--pct-accordion-heading-target-min` is a `min-block-size` on
    the heading row, and the e2e case that measures the row at 24 px stays **green with the
    floor removed** — the padding clears 24 px on its own. The promise (`req-a11y-touch`) is
    kept and measured; the mechanism named beside it is not what keeps it
  - what makes it more than a wording fix: the floor is the line that survives a **skin**. A
    consumer who sets `--pct-accordion-heading-padding-y` to `0` gets a row that is 24 px
    because of the token, and nothing in the suite would notice if the token stopped working.
    The same shape stands wherever a `*-target-min` token does — the tabs, the pagination, the
    chips — and none of those has been disarmed yet
  - the roads: a case that renders the component with the padding tokens at zero and reads the
    box (a demo of its own, or a page-level style in the spec); a `check-styles` point that
    the target token is used by every control that claims the criterion; or the honest
    minimum, which is already done — the card says what its case really holds
  - binds at: **the second component whose disarming finds the same hole**, or the first skin
    that sets a padding token to zero · _notes:_ —
  - **decided (2026-09-07): a case renders the control with its padding tokens at zero and
    reads the box.** The floor then holds the promise standing beside it — take the
    `min-block-size` out and the case goes red, which is the reading 4.19 could not take. It
    is written once for the accordion and then carried to every control with a `*-target-min`
    token: the tabs, the pagination, the chips. Not the `check-styles` point, which would
    measure that a declaration is present rather than what an engine lays out
  - **done (2026-09-07): `apps/sandbox-e2e/src/target-min.spec.ts`, eleven controls, three
    engines, 36 runs.** Not the accordion alone: every control in the library that declares a
    `*-target-min` token is in the table — the accordion heading, a tab, a pagination item,
    the chip's remove, a menu item, a breadcrumb link, the checkbox and radio controls, the
    switch's track, the date toggle and the field's control. Each row names the custom
    properties that would otherwise give that element size, and the case sets them to zero,
    hides what the element holds and zeroes its text before reading the box
  - measured: ten of the eleven land on **exactly 24 px** with everything else gone, the
    switch's track on 26 — a 1 px border either side of a content-box element, a literal in
    the stylesheet and not a token to zero. Each row carries that number as its CEILING, so a
    padding that survived the disarming would fail the case rather than pass it unnoticed
  - and each case carries its own negative control: with the floor's own token also at zero
    the box has to fall through 24 px, which is what a component that had stopped reading its
    token and written `24px` into the sheet would fail
  - the proof it measures the mechanism: with `min-block-size` deleted from
    `accordion-item.scss`, `accordion.spec.ts`'s 24 px case stays **green** and the new one
    goes **red at `height: 0`** ([`lesson-177`](lessons.md#lesson-177)). The accordion's card
    is corrected in both places it said the floor was held by nothing

- [x] **4.45 — the sheen that can outlast five seconds, and the wait that owns it**
  - left standing by 4.37, which closed the other half. Every sweep in the library now runs
    one pass and settles, and `[pctHero]` takes a `paused` input besides — but the skeleton's
    sheen travels for as long as the wait does, by design: a busy indicator that stopped would
    say the work had finished ([0050](decisions/0050-a-skeleton-is-a-picture-of-a-wait.md))
  - SC 2.2.2 asks for a mechanism to pause, stop or hide motion that starts on its own, lasts
    more than five seconds and stands in parallel with other content — unless the movement is
    **essential**. A wait under five seconds never reaches the criterion; a slow one does, and
    then the question is whether the sheen is essential in the criterion's own sense. It is
    `aria-hidden`, the wait is announced by the `aria-busy` region the consumer writes around
    it, and the movement is that same fact in the sighted channel. That is an argument, and
    the ACR says so rather than asserting a verdict
  - the roads: a stop of the page's own, the shape `[pctHero]` now has (`paused`, and the
    consumer decides when a wait has gone on too long); the argument written out and the row
    raised to Supports; or a cap after N passes, which is the one road that lies — a
    placeholder that stops moving while the work goes on says the work stopped
  - what it is NOT: a defect anybody has hit. A skeleton that stands for more than five
    seconds is already a page with a problem, and the repair is upstream of this component
  - binds at: **the first consumer whose wait is long enough to notice**, or the buyer who
    reads the conformance report and asks about the one Partially Supports row that is not
    the disabled state's contrast · _notes:_ **closed 2026-09-08 on the first of the three
    roads, and the second one is what was refused.** `paused` on `pct-skeleton`, `false` by
    default — the same word `[pctHero]` took on 4.37, and for the same criterion
    ([0073](decisions/0073-the-stop-a-long-wait-needs-is-the-pages-to-throw.md)). The
    argument for the "essential" exception is real and was written out, and then not used:
    a row that says Supports because we reasoned well is the shape of claim the whole report
    exists to avoid. The cap after N passes stays refused outright — a placeholder that goes
    still while the work runs says the work finished. Three mechanisms and an order between
    them: `prefers-reduced-motion` is the reader's and only SLOWS the sheen, `paused` is the
    page's, and with neither spoken the motion is the wait itself. Measured: four unit cases
    (the attribute both ways, the bare attribute, `animation-play-state` rather than
    `animation: none` so the shade freezes where it stands, and the specificity that beats the
    shorthand with no `!important`), two e2e cases in three engines, the second of them the
    negative control — a second skeleton the page did not name keeps moving, which is what
    makes this an input and not a document-level switch. **SC 2.2.2 rises to Supports**, and
    the report now stands at 35 Supports, 1 Partially (4.1.2, the assistive-technology pass
    2.2 owes), 19 Not Applicable, 0 Not Evaluated

- [x] **4.46 — the mutation gate had been dead for three days, and nothing could have said so**
  - found 2026-09-08 while running the pass 4.14–4.16 left owing: `stryker run` ended in its
    DRY run, threw no mutant at all, and had done so since **2026-09-05** — the day
    `day.spec.ts` gained the two cases that stand in a hostile timezone
  - the cause is three layers deep and only the third one is it. `@analogjs/vite-plugin-angular`
    defaults the pool to `vmThreads`; `pool: 'forks'` in `mutation.vitest.config.mts` fixes a
    DIRECT run and changes nothing here, because `@stryker-mutator/vitest-runner` passes
    `pool: 'threads'` to `createVitest` itself and a caller's option outranks a config file.
    Vitest's thread pool hands its workers a SHARED environment, so `process.env.TZ = …` lands
    in the parent's store and the reading thread's tz cache is never invalidated — a plain
    `worker_threads` worker honours the same write, measured, so it is the pool and not the
    thread ([`lesson-182`](lessons.md#lesson-182))
  - **why three days passed.** `mutation` and `check-mutation` are not in `ci.yml` while the
    stage is private — they run in `nightly.yml`, and nothing has been pushed for a nightly to
    run. `check-mutation` reads whatever report is lying in `tmp/mutation`, so the snapshot
    rewritten on 2026-09-07 recorded a run from before the breakage and said nothing untrue
    about rows that had not moved
  - **the repair:** `describe.skipIf('__stryker__' in globalThis)` — Stryker's own marker and
    not a probe of the platform, so both failure directions are loud: the cases run in `test`,
    which CI executes on every commit, and go red there if the zone ever stops moving; and if
    an upgrade renames the namespace the mutation run goes red instead. The pool line stays in
    the config with what it cannot do written beside it
  - **what is still open, and it is the shape and not this bug:** a gate whose only automatic
    runner is a workflow that has never executed has no control over its own liveness, and
    `check-mutation` guards a report's contents in seven points while saying nothing about
    whether a report was produced today. Both close the day 3.0 pushes and a nightly actually
    runs; until then the run is a hand run, and this item is the record that a hand run can go
    three days unnoticed

- [ ] **4.47 — the run that came back after three days found the new code thinly measured**
  - the first full mutation run since 2026-09-05 (5014 mutants, **81.69%** against the 80%
    floor, 80 minutes at `--concurrency 4`) is recorded, and the snapshot's diff is the point
    of the file: **83.43 → 81.69** over four days of new code. The floor holds; three files do
    not deserve to be behind it
  - **`toast-viewport.ts` 95.00 → 45.65, with 25 of its 46 mutants NOT COVERED.** Every one is
    in the region registration and the key handler 4.16 added (lines 90–109): the optional
    chain onto `PCT_REGIONS`, the `key === null || event.key !== key` guard, the whole
    `afterNextRender` block. Three engines walk it in `regions.spec.ts` and no unit case ever
    constructs the viewport with a `PCT_REGIONS` provider, so the mutation run sees dead code
    where the browser sees a working cycle. A browser case is not a substitute here — the
    mutants are in branches an e2e cannot enumerate
  - **`hero.ts` 0.00, and the reason is a spec that binds too much.** Two survivors, both
    DEFAULTS — `show` at `''` and `paused` at `false` — because `hero.spec.ts` binds
    `[paused]="paused()"` and `[show]="show()"` on its only host, and a bound input is never
    the default. It is the shape the skeleton's spec already names in its own header ("**bare**
    binds nothing … the only place the defaults are ever observed") and that the accordion,
    the pagination and the progress bar each paid for once. The repair is a second host that
    binds nothing
  - **`core/regions.ts` 25.00** — three survivors on the injection token's description string
    and its `factory: () => null`. The `null` default is the whole promise of 0072 ("with no
    `providePctRegions()` this resolves to `null` and the component does nothing") and no unit
    case reads it
  - smaller, and named so the diff is not read as noise: `drawer.ts` 96.97 → 79.19 and
    `button.ts` 100.00 → 81.25 are four days of new code arriving at once, not a regression in
    what was measured before; `skeleton.ts` 92.31 → 88.89 is `paused`'s own default, the same
    shape as the hero's; `select.template.ts` 50.00 → 33.33 is one mutant of two
  - binds at: **the next batch of unit work** — every repair here is a spec, none is a source
    change, so they can land together and be measured by ONE run rather than one each. Until
    they do, the snapshot is the honest record of what the tests hold · _notes:_ —

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
