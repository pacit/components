# Work plan — task list

> **This file is written by hand, and it is temporary.** It is the only place allowed to hold
> "done / in progress / to do", and it goes away when the work does. It does not duplicate the
> [registry](registry.md): the registry is generated and says **which promises have no gate**;
> this file says **in what order we close them and what has already gone through**. When the
> two disagree the registry wins.
>
> **Nothing outside this file cites a task by its number** — every such citation becomes a
> dangling reference the day the file goes. Whatever is durable is written where it lives: a
> requirement, a decision, a lesson. The one pointer that has to exist is the docs index
> naming this file at all, without which `check-reach` has no reader for it.

## How to use it

**At the start of a session** — check whether the plan has lied:

```bash
node tools/check-docs.mjs
```

It prints the current counts (`enforced / partial / gap`). If they disagree with
[State](#state), fix that section before starting anything else.

**At the end of a session** — tick the tasks off, and hold the position to the budget
[0017](decisions/0017-one-home-per-fact.md) sets: **12 lines closed, 20 open**, measured by
`node tools/check-prose.mjs`, whose record is [`prose.snapshot.md`](prose.snapshot.md). What
does not fit is not prose to shorten — it is a fact
standing in the wrong home, and it belongs in a requirement, a decision or
[`lessons.md`](lessons.md).

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
| ✅ enforced                                 |    77 |
| 🟡 partial (deliberately without a control) |    16 |
| ⛔ gap                                      |     1 |

The 1 gap left has an owner below, in section 5. If adding a requirement raises the gap
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

**The push and the premiere are two moments**
([0075](decisions/0075-the-push-and-the-premiere-are-two-moments.md)). The quiet push to a
private remote waits for nothing and landed on 2026-09-01; the flip to public and npm waits
for **2.1**, which is closed, and for an explicit sentence, which is not. No run turning
green starts it and standing next in this list is not a start either — a session that reaches
**3.1** passes over it and takes the next item.

**The direction was reviewed on 2026-08-31 from outside the daily loop, and it holds.** The
verdict in one sentence: the moat is not any component but the evidence machinery, which no
competitor publishes anything like — and the risk is not architectural but **time and
fragility**, because the surfaces nothing measures yet are the ones a stranger reads first.
Everything it found is closed in section 4; what it changed is section 0 and 2.1's boundary.

**What is left.** Section 1 ends at the table (**1.2**), deferred by
[0016](decisions/0016-mit-irreversibility.md) rather than scheduled. Section 2 owes the
screen-reader pass (**2.2**). Section 3 is the premiere and the three items standing behind
it. Section 4 holds what this file's own compression pass found. Section 5 holds one gap,
**5.5**, whose trigger that pass was — and it fired on 2026-09-14.

## 0. The copy that must exist

- [x] **0.1 — an off-machine copy of the repository, private and encrypted.** _Closed on
      2026-09-01 by **3.0**, which is how it was written to end: the private remote IS the
      copy, and the interval this item existed for was one day._

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
  - each row: the decision it rests on, `apps/sandbox-e2e/src/<name>.spec.ts` in three engines
    plus the axe / hydration / RTL / forced-colours audits, and the unit suite — bytes in
    `size.snapshot.md`, mutants in `mutation.snapshot.md`

  | component  | decision                                                                                                                                                        | gate                                 | what it turns on                                                                                                                                                                                                                                                                                                                              |
  | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
  | toast      | [0044](decisions/0044-a-toast-is-a-change-in-a-region-that-was-already-there.md), [0039](decisions/0039-a-state-the-platform-publishes-is-not-ours-to-write.md) | `toast.spec.ts` 15 × 3, 21 unit      | a change in a `role="log"` that was already there — no `aria-live` / `-atomic` / `-relevant` of ours, asserted absent; the viewport a `popover="manual"`; urgency the message's ([`lesson-121`](lessons.md#lesson-121), [`lesson-122`](lessons.md#lesson-122))                                                                                |
  | tabs       | [0045](decisions/0045-a-panel-nobody-chose-is-still-text-in-the-document.md)                                                                                    | `tabs.spec.ts` 12 × 3, 41 unit       | the consumer's markup IS the panel, an unchosen one `hidden="until-found"`; `check-aria` counts a composite role as a widget now ([`lesson-124`](lessons.md#lesson-124), [`lesson-125`](lessons.md#lesson-125), [`lesson-126`](lessons.md#lesson-126))                                                                                        |
  | accordion  | [0046](decisions/0046-a-disclosure-is-the-platforms-and-so-is-the-group-it-belongs-to.md)                                                                       | `accordion.spec.ts` 12 × 3, 14 unit  | `<details>` with a `<summary>`, and `exclusive` is one shared `name` attribute with no code behind it; `check-aria` reads `<summary>`; the growing height is refused until a second engine ships `interpolate-size`, and the e2e case reddens the day one does ([`lesson-127`](lessons.md#lesson-127), [`lesson-128`](lessons.md#lesson-128)) |
  | drawer     | [0047](decisions/0047-a-drawer-is-a-region-of-the-page-not-a-layer-over-it.md)                                                                                  | `drawer.spec.ts` 12 × 3, 27 unit     | a region of the page and not a layer over it — no `inert`, no scroll lock, no CDK; the disclosure pattern is the whole written residue and a shut drawer is `hidden="until-found"` ([`lesson-129`](lessons.md#lesson-129), [`lesson-130`](lessons.md#lesson-130))                                                                             |
  | pagination | [0048](decisions/0048-a-pagination-owns-its-page-number.md)                                                                                                     | `pagination.spec.ts` 15 × 3, 36 unit | the model-owning pager — `page` a `model<number>`, a press emits rather than navigates, the fold is all it computes; `check-texts` walks a factory's argument in four states now ([`lesson-131`](lessons.md#lesson-131), [`lesson-132`](lessons.md#lesson-132))                                                                               |
  | progress   | [0049](decisions/0049-a-progress-bar-is-the-platforms-element-under-our-paint.md)                                                                               | `progress.spec.ts` 11 × 3, 31 unit   | it IS a `<progress>`, so indeterminate is a value nobody claims and no ARIA is written; the fill is a sibling travelling by `inset-inline-start`; `check-aria` gains `NAMED_TAGS` ([`lesson-133`](lessons.md#lesson-133), [`lesson-134`](lessons.md#lesson-134), [`lesson-135`](lessons.md#lesson-135))                                       |
  | skeleton   | [0050](decisions/0050-a-skeleton-is-a-picture-of-a-wait.md)                                                                                                     | `skeleton.spec.ts` 11 × 3, 20 unit   | `aria-hidden` and nothing else — the wait lives on the consumer's `aria-busy`; `1lh` and `1cap` are the browser's arithmetic over the consumer's type; `check-aria` point 8 ([`lesson-136`](lessons.md#lesson-136), [`lesson-137`](lessons.md#lesson-137))                                                                                    |
  | chips      | [0051](decisions/0051-chips-are-a-list-the-user-shortens.md)                                                                                                    | `chips.spec.ts` 12 × 3, 25 unit      | a list of chosen values the user shortens, on `list`/`listitem` and real buttons; the one thing added to the platform is where focus goes when the button under it disappears ([`lesson-138`](lessons.md#lesson-138))                                                                                                                         |
  | avatar     | [0052](decisions/0052-an-avatar-is-a-picture-beside-a-name.md)                                                                                                  | `avatar.spec.ts` 8 × 3, 21 unit      | decoration all the way down: the fallback chain image → initials → silhouette with exactly one standing, initials as graphemes, the silhouette through the icon seam `check-icons` demanded                                                                                                                                                   |
  | badge      | [0053](decisions/0053-a-badge-is-a-word-wearing-a-tone.md)                                                                                                      | `badge.spec.ts` 5 × 3, 7 unit        | a word wearing a tone — no role, no ARIA, no string; two tones, because the skin has surfaces for `neutral` and `danger` and no ramps for the rest                                                                                                                                                                                            |
  | breadcrumb | [0054](decisions/0054-a-breadcrumb-is-the-way-here-told-in-links.md)                                                                                            | `breadcrumb.spec.ts` 6 × 3, 12 unit  | the way here in the consumer's own `<a href>`, `aria-current` left to the router; `pct-crumb` exists because loose links in a `role="list"` are a critical violation, and the links take the shared target floor ([`lesson-96`](lessons.md#lesson-96), [`lesson-139`](lessons.md#lesson-139))                                                 |
  | stepper    | [0055](decisions/0055-a-stepper-is-a-map-of-a-journey-the-application-steers.md)                                                                                | `stepper.spec.ts` 6 × 3, 13 unit     | a map the application steers — one 1-based number in, every state computed, nothing written back; `aria-current="step"` because here the input holds the truth ([`lesson-140`](lessons.md#lesson-140))                                                                                                                                        |
  | tree       | [0056](decisions/0056-a-tree-is-a-walk-the-platform-does-not-have.md)                                                                                           | `tree.spec.ts` 7 × 3, 21 unit        | the walk no element has, over an until-found fold; the library's third private copy of that machinery, so the `core` extraction below 1.2 has three consumers waiting ([`lesson-141`](lessons.md#lesson-141))                                                                                                                                 |

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
      2026-09-02 — all eight steps in one day; 2.1.1–2.1.8 below carry the measurements_
  - the boundary was reopened by the maintainer on 2026-09-02: the face around the content
    core stopped being optional, and the site is built **from the library it documents**, so
    its missing pieces become library work first. The design page by page, and the guard
    that replaced the old "and nothing more" — a step list that is finite and ends — is
    [`site.md`](site.md)
  - the content core is unchanged: the generated inventories, the component cards as they
    stand, a theming page carrying the token inventory, the support policy and the
    forms-interop boundary (**4.25**)
  - around the site: deploy waits on 3.1's decision; the library work it surfaced is **4.33**
  - [x] **2.1.1 — the layout entrypoints**: `pct-container`, `pct-stack`, `pct-grid` —
        three entrypoints, not the one `layout` first drawn: a component token's first word
        must be a real entrypoint (`check-tokens` point 3), and
        [0057](decisions/0057-layout-is-three-entrypoints-not-a-framework.md) records the
        shape. No ARIA, no media query; the proof is a ruler in three engines
        (`apps/sandbox-e2e/src/layout.spec.ts`) — cap and centring, the gutter's clamp at
        both ends, the gaps between real boxes, the column count at 375px, and the scoped
        token packing more columns than the default (`req-token-scoped`, live). _Landed
        2026-09-02:_ sizes in the size snapshot; one mutant in the three files, killed —
        container and grid generate none, reason and expiry in `mutation.policy.json`. The
        WebKit dialog scroll-lock coin toss the run surfaced stands as **4.32** · cost:
        ~1 day, spent as estimated
  - [x] **2.1.2 — the button's new faces**: `ghost`, `soft` and the animated `hero` — five
        faces, one directive, **not one new line of TypeScript** (the union widened, the
        stylesheet grew; zero new mutants by construction). The gradient is a semantic role
        with a pair, so the pair rule itself delivers the sentence — **a gradient is three
        contrast checks, not one** — and the measured pairs, the frozen drift and the
        `background-image: none` under forced colours are in
        [0058](decisions/0058-the-hero-face-is-paint-and-a-gradient-is-three-contrast-checks.md),
        with `libs/tokens/src/contrast.policy.json` printing the pairs on every build.
        _Landed 2026-09-02:_ preferences, forced-colors and the full visual set green in
        three engines; `button-variants` ±rtl grew the three faces, the infinite drift
        cancelled to frame zero by the screenshot assertion itself · cost: ~1 day
        estimated, ~half spent — paint is cheaper than machinery
  - [x] **2.1.3 — the theme directive** → closed `req-token-directive`, and the trigger had
        fired earlier than the plan thought: the sandbox wrote `data-theme` by hand in three
        places before the docs app could become the fourth. `PctTheme` is one host binding
        and three refusals —
        [0059](decisions/0059-a-theme-is-an-attribute-the-skin-reads.md). The demo stage now
        drives every themed card through the directive; the kitchen-sink's raw panel stays
        raw as the control's other half, and the e2e case reads the same `--pct-surface`
        from both writers. _Landed 2026-09-02_ · cost: ~0.5 day, spent as estimated
  - [x] **2.1.4 — the scaffold**: `apps/docs` + `apps/docs-e2e` — **static by construction**
        ([0060](decisions/0060-the-site-is-static-by-construction.md)): every route
        prerenders, and the first build's `index.html` carries the whole page before any
        script runs (read with grep, not assumed). The shell is the library's first page —
        container, ghost button, the localStorage theme policy exactly where 0059 sent it —
        and the drawer waits for the nav that would fill it (2.1.7). `req-project-apps`
        closes enforced, `req-project-layout` partial. _Landed 2026-09-02:_ docs-e2e green
        in three engines, and the suite earned its keep before its first commit — the reload
        case caught the theme policy erasing its own stored choice. Copying the app tree
        taught the reach gate's bare-name rule the hard way
        ([`lesson-142`](lessons.md#lesson-142)), anchored by full paths in each
        `project.json` · cost: ~1 day estimated, ~half spent
  - [x] **2.1.5 — the content pipeline**: one dependency-free pass
        (`apps/docs/tools/build-content.mjs`, a cached `content` target the build depends on)
        reads the cards, the parts and token snapshots, the registry and the mutation snapshot
        → typed `DOCS_CARDS` + `DOCS_EVIDENCE`, and `llms.txt` with the machine catalogue
        (`components.json`) fall out of the same pass (2.5, co-built — an agent reads the same
        inventory the pages render). _Landed 2026-09-02:_ the evidence numbers guard themselves
        — a count the parser cannot read throws the build, and the tripwire fired twice before
        the first green pass ([0061](decisions/0061-the-landing-speaks-in-measurements.md)).
        Deliberately parserless: the cards are a form, not prose, so the form's own lines are
        the API; highlighting (shiki) moved to 2.1.7 with the rendering it serves
        ([0062](decisions/0062-the-pages-render-a-form-not-markdown.md)) · cost: ~1 day
        estimated, ~half spent
  - [x] **2.1.6 — the landing**: the gradient headline, live components instead of
        screenshots, the accessibility-led evidence strip reading tracked files only.
        Recalibrated on the maintainer's review of the sketch — WCAG earns the front, the build
        machinery moves to `/trust` (the reasoning is `site.md`'s), and the wording stays
        "machine-audited to WCAG 2.2 AA" until 2.2's ACR earns more; the law and its gate are
        [0061](decisions/0061-the-landing-speaks-in-measurements.md)'s — the suite asserts the
        strip never says "conformant". _Landed 2026-09-02, measured:_ docs-e2e **36 of 36 in
        three engines** (8 new landing cases, the strip↔repository agreement test among them),
        forced colors hands the headline back to `CanvasText`
        ([`lesson-134`](lessons.md#lesson-134)), and the prerendered `index.html` carries the
        strip, the teaser, the gallery and the live cards' first frame before any script (grep)
        · cost: ~1 day, ~half spent
  - [x] **2.1.7 — the pages**: `/components/:id` (demos whose code tab shows their own source,
        parts and token tables), `/start`, `/theming`, `/trust`, `/support`. _Landed
        2026-09-02, measured:_ **39 routes prerendered** — six pages plus one per card, named
        from the same generated inventory the pages render. The machinery is
        [0062](decisions/0062-the-pages-render-a-form-not-markdown.md)'s: a form renderer,
        shiki at build time, one link-rewriting law landing every card citation on a `/trust`
        anchor, and each of the 33 demo files doubling as the page's pixels and its code tab.
        The shell grew the nav and the drawer 0060 deferred, the landing's CTAs and gallery
        wired themselves to the new routes, and the cards traded their "docs page — gap" rows
        for the real address. docs-e2e **66 of 66 in three engines** (10 new cases) · cost:
        ~1.5 days estimated, ~half spent
  - [x] **2.1.8 — the bar, measured**: axe over every route in three engines, hydration, visual
        baselines light and dark, Lighthouse before anything is published, SEO plumbing.
        _Landed 2026-09-02:_ the route sweep (`apps/docs-e2e/src/routes.spec.ts`: 39 routes ×
        both colour schemes × three engines, each visit demanding a silent console) and four
        viewport baselines (`apps/docs-e2e/src/visual.spec.ts`), both entering through a
        `data-docs-ready` marker written after `whenStable()`. The bar bit the hand that built
        it — shiki's stock theme, and two links only the dark half could see — and each reading
        is written where it acts, in the spec and in `build-content.mjs`. Lighthouse (static,
        mobile-throttled): **100** for accessibility, best practices and SEO, **CLS 0** after a
        10rem floor under the lazy demo. Left open: ~121 kB of estimated-unused initial JS and
        a throttled LCP of 5.6 s (2.3's idiom), and `sitemap.xml`, `og:url`/`og:image` and
        canonicals, which wait on the domain 3.1 decides · cost: ~0.5 day, spent as estimated
- [~] **2.2 — ACR / VPAT** out of the existing gates — you get the machine proof earlier than the
  document, which is the reverse of the industry norm (the EAA enforceable since June 2025,
  EN 301 549 in tenders)
  - _ended 2026-09-05 with the machine half landed and the pass still owed._ `docs/acr.md` is
    rendered by `tools/check-acr.mjs --write` from `docs/acr/claims.json` — one row per
    criterion of WCAG 2.2 at A and AA, in the ITI template's tables, each resting on what
    already runs: a gate's numbered point, a case's title in a spec, a sentence in a source, a
    scan over the library's templates and stylesheets, or the cards' own Checks rows summed.
    The gate holds every citation — a renamed case, a closed finding, a gate that left CI, a
    `<video>` in a template all fire — and compares the rendering byte for byte. `req-a11y-acr`
    puts it in the registry; the site renders it at `/acr`, linked from /trust, with
    [0061](decisions/0061-the-landing-speaks-in-measurements.md)'s wording law untouched — the
    landing still says "machine-audited". The counts, the limits and the one deviation from the
    template (a _Not Evaluated_ row at AA says so) are `docs/acr.md`'s own text
  - **what remains is the assistive-technology pass**: NVDA with Firefox on Windows and
    VoiceOver with Safari on macOS over the sandbox views, logs under `docs/acr/at/`, a reading
    in every card's `Screen-reader log` row — the standing gaps are counted in `docs/acr.md`.
    None of it can run on this machine; point 7 of the gate is armed for the day `recorded`
    flips to `true`, and Orca on this Linux box is a third reader worth a log of its own.
    Deciding run: docs-e2e **355 of 355** in three engines, `/acr` in the axe sweep both schemes
- [x] **2.3 — benchmarks as a published number** + a performance regression that fails CI
  - _closed 2026-09-05:_ `nx run docs:bench` (`apps/docs/bench/previews.bench.ts`) renders every
    card's preview in jsdom and reads five things per scene; `tools/check-bench.mjs` (`check-bench`,
    in CI) holds `apps/docs/bench.snapshot.md` to it over six points on seventeen prepared inputs —
    the four counts exactly and both ways, the clock published and compared by nobody, which is
    [0023](decisions/0023-a-tolerance-is-for-a-wobbling-measurement.md) applied to performance
    ([`req-quality-benchmark`](requirements/quality.md#req-quality-benchmark))
  - the reading stands in the page's Evidence tiles (`data-testid="cost"`), held to the same file
    the content pass reads
  - three of the 33 scenes settle in two render passes — a finding with an address (4.38), not a
    number to hide · cost: ~half a day
- [x] **2.4 — DTCG ↔ Figma / Tokens Studio bridge** — the source of truth is already DTCG, an
      unused advantage
  - _closed 2026-09-05:_ `libs/tokens/bridge.mjs` writes the sources as the multi-file layout Tokens
    Studio syncs to (`nx run tokens:bridge` → `dist/tokens-studio/`) and reads the plugin's export
    back, writing a changed value or description into the token it belongs to and nothing else — a
    set, a name, a type and a modifier are refused
    ([0020](decisions/0020-the-palette-carries-no-spares.md))
  - `tools/check-bridge.mjs` (`check-bridge`, in CI) holds six points on sixteen prepared inputs, the
    round trip among them ([`req-token-bridge`](requirements/tokens.md#req-token-bridge))
  - not done, and named: nothing here talks to Figma's REST variables API — the plugin is the road,
    the folder is the interface; the typed token names (`PctCssVar`) still leave the repository only
    through the site's inventory (the 2.1 note) · cost: ~half a day
- [x] **2.5 — a surface for AI agents**: `llms.txt`, a machine-readable component catalogue from
      the same source as the docs, canonical examples
  - _closed 2026-09-05:_ built with 2.1, out of the same generators the site renders.
    `components.json` is one object — per component the usage and examples as text, the API, parts,
    tokens in both themes, keyboard map, texts read, 2.3's cost record — plus the `PctTexts` channel
    (each key's meaning, default, readers, a typed template); `llms.txt` carries the usage
  - the content pass throws on a key with no meaning or no default, a default with no key, a card
    with no usage, a preview with no cost; docs-e2e holds the served file to the cards on disk and
    to the channel's source ([`req-api-catalogue`](requirements/api.md#req-api-catalogue))
  - locale packs are deliberately not shipped ([`req-project-language`](requirements/project.md#req-project-language)):
    the generator emits the keys, their meanings, the defaults and the template instead ·
    cost: ~a quarter of a day
- [x] **2.6 — `@pacit/components/testing`**: consumer-facing harnesses on the `data-pct-part`
      contract
  - _closed 2026-09-05:_ 51 harnesses on the CDK's `ComponentHarness`, one per component and
    directive a card names — the host selector verbatim, the parts it draws, a base of five methods
    and no `open()` ([0068](decisions/0068-a-harness-is-a-declaration-over-the-parts-contract.md));
    the old test-only helpers ship from the same entrypoint, and the cards grew a **Harness** row
  - `check-harness` (six points, 17 prepared inputs) reads `ɵcmp` after linking the way
    `check-parts` does and holds every declaration in both directions, the union to the list and the
    cards' rows to the names ([`req-api-harness`](requirements/api.md#req-api-harness))
  - moved elsewhere: `check-bundle` grew a declared `PLAIN` list for an entrypoint with no component
    of its own, held by four prepared inputs; coverage counts `testing/` now, and the mutation run
    keeps its exclusion with a reason in `libs/components/mutation.policy.json` · cost: half a day
- [x] **2.7 — the component page, redesigned to the approved sketch** — the reviewer's second
      item (2026-09-03): "the worst-looking part of the site". Two static sketches were shown
      before a line of code moved (the rule he set), and the page the chosen one describes —
      layout, the one long page, the code face, the gaps in public — is written down in
      [`site.md`](site.md). _Closed 2026-09-05 with its last two steps, 2.7.4 and 2.7.5; seven
      steps in all, the two reviews included._
  - [x] **2.7.1 — the strip's scrollbar**
    - landed 2026-09-03 (`fix(tabs)`): one pixel of `margin-block-end: -1px` pulled the chosen
      tab's edge onto the strip's rail, and inside a scroll container that pixel is content, so
      every strip carried a scrollbar across its own axis ([`lesson-144`](lessons.md#lesson-144))
    - the edge sits inside the tab's box now, the vertical strip loses the same trick on the
      inline axis; `tabs.spec.ts` holds the question no suite had asked — a strip scrolls along
      its axis, never across it — three sandbox baselines and the button page regenerated
  - [x] **2.7.2 — the page's data**
    - landed 2026-09-03: `build-content.mjs` is a scanner, not a compiler — the API read from the
      source (inputs, models, outputs with their JSDoc, the host bindings, the entry point's
      exports, the `extends` chain), the tokens with a `$description` resolved for both themes,
      the card's `Category` / `Usage` / `Parts` / `Theming`, the examples, the per-component
      evidence and the Checks table read as a scorecard
    - measured on the tree: 33 cards, and 799 readings the sweep still owes, counted per card;
      every reader tolerant but `button`, which is STRICT — the tripwires 2.7.4 flips to throw
    - the scanner's two corrections, a bracket scan that skips comments and examples in the
      registry's order, are commented where they live in `apps/docs/tools/build-content.mjs`
  - [x] **2.7.3 — the page**
    - landed 2026-09-03: header and spec line, Preview first on `pct-tabs`, Usage, Examples, API
      and Styling tables, the Accessibility scorecard, Evidence tiles, a scroll-spied table of
      contents, the index with a filter and its copy in the drawer
    - the content column is the library's container widened through `--pct-container-max-width`
      and the rails query that column, not the grid ([`lesson-145`](lessons.md#lesson-145)); the
      index renders only while the drawer is open, Firefox laying a closed drawer out as a
      scrollable region nothing could focus — the initial bundle fell 501 → 395 kB with it
    - the sweep bit four times: every tinted seat takes the soft pair, measured at every token
      build; the dark review added the library's own, [0063](decisions/0063-the-theme-names-its-scheme-to-the-platform.md)
    - docs-e2e 331/331 in three engines; eight new cases hold the API to the source, the tokens to
      the DTCG file, the examples to their stages, the scorecard, the theming, the spy and the fold
  - [x] **2.7.6 — the tabs' second face, and the side layout it was missing**
    - landed 2026-09-03 out of the reviewer's question: the site had spent 72 lines reaching a
      look it could not name and was bitten twice by the same nesting
      ([`lesson-147`](lessons.md#lesson-147), [`lesson-148`](lessons.md#lesson-148)); when a look
      is a variant is [0064](decisions/0064-a-face-the-consumer-cannot-reach-is-a-variant.md)
    - `variant="underline | segmented"` — one union member, one host binding, a block of paint,
      and `--pct-tabs-list-bg` / `--pct-tabs-tab-bg-selected` as real surface roles, which is
      what let their pairs be measured; the site's own switch handed back to the library
    - `orientation="vertical"` finished: the panels got a wrapper of their own and the host is a
      flex row, measured beside the strip in LTR and mirrored in RTL
    - deciding runs: 45 tabs cases and docs-e2e 331/331 in three engines; `tabs-vertical` and
      `tabs-vertical-rtl` regenerated, `tabs-segmented` new, full Stryker above the floor
  - [x] **2.7.7 — the second review of the component page**
    - landed 2026-09-04 from the maintainer's five notes: a `**Summary:**` field leads every card,
      the proof line is gone, the import's copy moved to the panel that shows the import, Source
      wears a GitHub mark, the preview panel is 424 → 296px, the reasoning sits under Evidence;
      the field and the spec line's grammar of three are held by the content pass, which throws
      on a card it cannot classify
    - two defects under the height note were the library's, not the site's: a panel nobody chose
      kept its padding ([`lesson-150`](lessons.md#lesson-150)), and a host-attribute rule reached
      by descent, so a nested strip wore the outer instance's variant
      ([`lesson-151`](lessons.md#lesson-151)) — child combinators now, a strip inside a strip
    - docs-e2e 331 in three engines, the two component-button baselines regenerated on the change
      itself and `tabs-strip`/`tabs-segmented` shorter; no library TypeScript moved
  - [x] **2.7.4 — the sweep**
    - closed 2026-09-05: of the 799 readings 2.7.2 counted, 94 were left and every one was the
      same line — the form-control block declared without a word in eight controls, the calendar
      and the field. 83 lines written, each saying what the input DOES in that control rather
      than what the contract calls it
    - the tripwires are gone as tripwires: any reading owed fails the build with the list grouped
      by card, `DOCS_WARNINGS` went with them, and the negative control is recorded — one JSDoc
      line removed, the pass exits 1 naming `text.ts: touch (output)`
    - the library's TypeScript moved by comments only, so the mutation snapshot is stale by text
      and not by mutants — re-measured on the next run, not on this one (the maintainer's call)
  - [x] **2.7.5 — the mono face**
    - closed 2026-09-05: the component page had named `'JetBrains Mono'` first in its stack since
      2.7.3 with no file behind it, and the three other code seats named no face at all
    - vendored the way Inter is — `public/JetBrainsMono-latin.woff2` with the OFL beside it,
      `font-display: block` and a preload, out of `@fontsource-variable/jetbrains-mono` 5.3.0;
      the stack is declared once as `--docs-font-mono` and the four seats read it, a fourth hand
      copy being the state [`lesson-21`](lessons.md#lesson-21) exists to prevent
    - the two component-button baselines regenerated, the landing's did not move; deciding run
      docs-e2e 346/346 in three engines, and `nx build docs` copies the three files into dist

## 3. Publication

**Split on 2026-08-31, by the maintainer's own reopening of the question.** The push and the
premiere were one moment here, and the fear that held them both — a first look landing on a
repository with no documentation — belongs only to the second: an unannounced private
repository has no first look. So the quiet half moved to the front and waits for nothing,
and everything a stranger can see still waits for 2.1 and a sentence.

- [x] **3.0 — the quiet push: a private remote, and CI that has actually run** — **waits for
      nothing**
  - done 2026-09-01, read back off the API: `pacit/components` is private, `main` is the default
    branch, the remote HEAD equals the local one, the three workflows are active — 0.1 superseded
  - the remote is `https://` with `gh auth setup-git` as the helper, where SSH had no key on this
    machine, and the token needs the `workflow` scope or `.github/workflows/` does not travel
  - the first two runs are what the stage was bought for: red on word lists no runner ships
    (pinned since in `tools/dictionaries.lock.json`), then red four ways in 48 minutes — **4.30**
  - `mutation` and `check-mutation` are off the push line, in `nightly.yml`; `check-docs` point 3
    reads both workflows and both verbs, so **4.27**'s complaint stands over two files
  - cost: minutes · no flip, no npm, no announcement — provenance refuses a private repository,
    `check-package.mjs --release` still blocks · _notes:_ the split's reasoning is owed an ADR

- [ ] **3.1 — the premiere: the flip to public, `repository` promises that resolve, npm** —
      **held on a state and on a sentence, and it needs both**
  - **the precondition is 2.1**: a package whose first visitor has nowhere to read what it does is
    published too early, and that half is a state, which can be checked
  - **the trigger is still a sentence.** no green run starts the flip, and standing last in the
    order is not a start either — a session that reaches 3.1 passes over it and takes the next item
  - concerns: `req-release-metadata` — the gate, its control and the manifest field are done
    (`libs/components/package.json` points at `github.com/pacit/components`); what is left is the
    flip and the npm publish, and day to day the gate only warns
  - the `pacit` organisation exists on GitHub and on npm (scope `@pacit`, owner `markovy`); the
    repository arrives with **3.0** and stays private until here
  - the flip is binary — the second `README.md`, `docs/` and the step names in Actions become the
    product — so everything a first visitor sees is finished before it, and what waits for this
    item is provenance, the resolving addresses, and every promise a stranger can read
  - the condition is wider than the public surface: **nothing leaves in a second language at all**,
    and the language gate proves it over the index and the package, with no entry in the register
  - _from the direction review:_ the README's external links resolve before publish (no gate reads
    a link; `check-package --release` can ask); npm **trusted publishing** replaces the standing
    `NPM_TOKEN` secret; and the README entrypoints gate of **4.10** is a precondition here
  - cost: minutes for the task itself · _notes:_ —

- [ ] **3.2 — citations in the public API as links**
  - concerns: [`req-project-language`](requirements/project.md#req-project-language)
  - **the language half is done** — the 24 files of the built package that carried Polish measure
    zero today; the JSDoc travelled with its sources rather than being opened a second time
  - what is left is not about language: the public `.d.ts` cite `req-*` and `lesson-*` **31 times**
    as bare identifiers that lead nowhere for a consumer. The answer is a link, not a deletion, so
    it waits on **3.1** — `@see https://…/docs/requirements/a11y.md#req-a11y-built-in` has to
    resolve before it is worth more than the paragraph it replaces
  - **3.1 being held, this one is held with it**, and it is the whole of what that hold costs
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
  - closed (2026-09-06): a Polish preposition stood in a message a maintainer reads —
    `tools/check-parts.mjs` said `has no card at all w \`docs/components/\`` — against
[`req-project-language`](requirements/project.md#req-project-language)
  - the length floor it was blamed on never existed: `american-english` lists the whole alphabet,
    so every one-letter word is subtracted as English before anything looks at it
  - repair: a sixth limb in `tools/check-language.mjs`, which reads the COMPANY a letter keeps
    rather than a dictionary and reports how many it read — the denominator
    [`lesson-77`](lessons.md#lesson-77) says nobody measures. Point 1 proves it on a probe of its
    own, against a reference holding the same letters as identifiers and inside a code span

- [x] **4.2 — the two longest gates share one runner, and CI gives them half the cores**
  - the two longest tasks here by an order of magnitude, `components:mutation` and
    `sandbox-e2e:e2e`, ran in one CI job on four vCPUs in one `nx` line. A mutant killed by the
    CLOCK is killed only while the machine cooperates: `motion.ts`, `placement.ts` and
    `texts.ts` each moved past the snapshot's ±2 over identical code, and every wait in the e2e
    suite has the same window — a red from a full run is re-run before it is read
  - done (2026-09-07): `nightly.yml` splits into two jobs, one runner per heavy gate — its header
    carries the mechanism, the price and what the split does not buy; the pair is off the push
    line at all under [0075](decisions/0075-the-push-and-the-premiere-are-two-moments.md), and
    point 7 of `check-mutation` reads every `nx` line of both workflows, not the first line of one
  - left open: which run a `--write` records — the snapshot holds a starved one; `mutation` on a
    pull request, parked for **3.1**; and the nx task cache, moved to [4.41](#4-open-findings)

- [x] **4.3 — an option's owner is measured only where a page renders the panel**
  - the relation — an `option` owned by its `listbox` through a `role="group"` — is measured
    only by axe on a page that opens the panel, which is [`lesson-65`](lessons.md#lesson-65)'s
    shape: the next grouped panel no sandbox page renders would be green
  - closed (2026-09-06) as **`check-aria` point 9**: for every element whose role requires a
    context, the first ancestor with a role — written or the tag's own — either is that context
    or is the defect; where the template runs out the host answers, and a bound role on the
    path is reported rather than read
  - four prepared inputs among 25, each rejected on its own point; the reference grew the legal
    shape, a listbox owning options directly and through a heading's group

- [x] **4.4 — one template, compiled twice, and nothing says when that stops being worth it**
  - the two select tags share `select.html` and `select.scss` in the sources and duplicate both
    in the artefact ([0034](decisions/0034-multiplicity-is-a-tag.md)); whether importing one tag
    sheds the other was nobody's measurement — [`lesson-45`](lessons.md#lesson-45)'s shape
  - done (2026-09-07): **`check-bundle` point 12** imports one class by name beside every class
    of the same entrypoint, for every entrypoint carrying more than one component, discovered
    from the package; both readings are recorded in `size.snapshot.md`
  - "of course, ESM" is refuted on `./select` alone — one tag costs three bytes less than both —
    and why the sibling is pinned is measured in **4.42**; the road out
    ([`lesson-96`](lessons.md#lesson-96)'s move) still waits for a third tag over this template
  - the reading was wrong twice first ([`lesson-171`](lessons.md#lesson-171)); controls
    `named-probe-empty` and `named-probe-larger`, 32 prepared inputs

- [x] **4.5 — inheritance was taught to the two gates that fired, and to none of the rest**
  - a surface can come from a base class; `check-aria` and `check-texts` fired and were taught
    to follow `extends` ([`lesson-100`](lessons.md#lesson-100)). The other five stayed green
    without being audited — a gate that reads too little finds nothing and reports green
  - closed (2026-09-05): the seven gates that read a class are sorted by which half they read,
    against Angular's own list of what `ɵɵInheritDefinitionFeature` passes on, and the list is
    [`req-quality-inheritance`](requirements/quality.md#req-quality-inheritance) — a gate that
    reads a class and is not on it is a named gap rather than a green
  - `check-parts` was right by accident and follows `extends` now, with `PctMarkerBase` in the
    reference and a `base-not-read` case (25 inputs); `check-texts`'s attribute merge gained
    `speaking-attribute-on-a-base-host/`, proved by the one kind of attribute the reference
    cannot carry (32 inputs)

- [x] **4.6 — the mutation snapshot cannot say that a mutant errored**
  - `check-mutation` counts an errored mutant in the denominator, stricter than Stryker's own
    score, and no column named it — so a row carrying one showed a score that did not follow
    from the numbers beside it
  - what errors is a guard removed inside a DOM listener: the next line dereferences
    `null`/`undefined` and the worker dies instead of a test failing — nine files by the end
  - **done (2026-09-07): the sixth column `errored`, and the rule `score/columns-adrift`** — the
    score must follow from `killed / (killed + surviving + errored + not covered)`, which now
    holds on every row and on the TOTAL, so a hand edit of a generated file is red
  - controls `row-without-columns` and `columns-adrift`, both replacing a row so the disarm
    gives "PASSED"; one fixture spells a row out literally, the rest render theirs from the
    production renderer. The snapshot was rewritten with `--write` and not one score moved

- [x] **4.7 — the guard that keeps `null` away from a consumer's comparator is promised and not
      measured**
  - `selectedIndex` and `selectedOption` filter `null`/`undefined` out before `compareWith`, and
    both guards' mutants survive: with the default identity comparator no test here supplies a
    comparator that would notice
  - closed at the full mutation run the night before 3.0 — an entity list whose value is set to
    `null`, both computeds read, and the guards' null halves die by it
  - left open: the **undefined half** of each guard survives, because `model<T | null>` gives
    `undefined` no legal road in — and a type is not a fence
    ([`lesson-117`](lessons.md#lesson-117)). One cast case (`value.set(undefined as …)`) would
    kill both and waits for the next full run, because a kill the snapshot does not record is a
    red planted under a future one

- [x] **4.8 — an empty listbox is a critical violation, and no case had ever opened one**
  - axe reports `aria-required-children` at **critical** on a `role="listbox"` owning no option;
    the waiting panel is excused by `aria-busy` ([`lesson-106`](lessons.md#lesson-106),
    [0037](decisions/0037-loading-is-a-fact-about-the-list.md)), a genuinely empty one is not —
    and four axe cases stood over this component without one ever opening an empty panel
  - closed (2026-09-06): the panel is a surface with the listbox inside it, a new part `list` on
    both classes, and the empty sentence is the panel's, beside the list
    ([0069](decisions/0069-a-message-about-the-list-is-not-an-item-in-it.md)); the list is also
    the element that scrolls ([0038](decisions/0038-a-window-is-measured-and-its-spacer-is-not-an-element.md))
  - `select-empty` is the audit's fourteenth stage, red at critical before and green after in
    three engines; two visual baselines re-recorded for antialiasing alone, and the select,
    audit, visual and drawer cases green

- [x] **4.9 — the checkbox writes an `aria-checked` that no engine reads**
  - the binding, the computed feeding it and the e2e assertion all measured a string the library
    writes to itself: a native checkbox takes its state from the element's checkedness and the
    `indeterminate` property, in three engines ([`lesson-112`](lessons.md#lesson-112))
  - the class of defect is `req-axis` with the layers rearranged: an inert attribute cannot be
    wrong, so it drifts from the state it claims and nothing says so
  - closed (2026-09-05): all three deleted, the unit case asserting the absence in all three
    states and the e2e reading the accessible tree in three engines — Playwright's aria
    snapshots to their first use here; the sandbox label, `req-a11y-built-in`'s gate and 0039's
    context say what the checkbox no longer writes
  - left standing: `core/src/announce.ts` is the same class's second member, read back only as
    DOM, and one reader's log fixture there covers the class

- [x] **4.10 — the two READMEs list the entrypoints, and no gate reads either list**
  - the npm page's Entrypoints table ([`libs/components/README.md`](../libs/components/README.md))
    named seven of twenty-one entrypoints, the root README fewer still — the inventory a
    maintainer reads is measured and the one a visitor reads is not
  - rows were never put in by hand, because that leaves the page to drift at the next component;
    the direction review promoted the item to a precondition of **3.1**
  - the content half came the night before 3.0 — every secondary entrypoint in the table, a
    status paragraph that counts what ships, fourteen component sections read off the sources,
    and the root README pointing at the table instead of carrying a copy of it
  - closed by **`check-parts` point 7** against the packed manifest the gate already holds: an
    entrypoint with no row, a row naming no entrypoint or a missing README each fire; controls
    `readme-missing-entrypoint` and `readme-phantom-entrypoint`, and a verdict line counting rows

- [x] **4.11 — the mutation run measures 22 of 36 source files, and nothing says which 22**
  - closed with a rule, not a list: the candidate set is read off the git index and every source
    stands in the inventory or in an `unmeasured` register with a reason — a file nobody decided
    about fires `inventory/source-unaccounted`, so a new entrypoint is inside the measurement by
    default ([`req-quality-unit`](requirements/quality.md#req-quality-unit))
  - `mutate` now says what is NOT measured, and the gate computes the excused categories
    independently of it: a list read off `mutate` would strike a file from both sides of the
    comparison at once. The one file the measurement cannot hold is `field/src/affix.ts`, its
    reason in `mutation.policy.json` ([`lesson-123`](lessons.md#lesson-123))
  - the price predicted was paid: sixteen files arrived unmeasured, and 51 cases across ten specs
    answered them — defaults no host had left alone, two guards masking each other, unread warnings
  - four rules and four fixtures, each proved by disarming it; the run's clock tripled (4.2)

- [x] **4.12 — a control knows its text is not a date and has no channel to say so**
  - closed 2026-09-06 as the contract's second channel: `PctFieldControl.ownErrors`, an optional
    signal of what the control knows and the form cannot, read FIRST by `pctFieldMessages` and
    merged the same way by the chrome — so a bare control and one wrapped in `pct-field` say the
    same sentence in the same place
    ([0070](decisions/0070-what-the-control-knows-and-the-form-cannot-is-a-second-channel.md))
  - `<pct-date>` says `Not a date`; `[pctNumber]` now KEEPS text it cannot parse and says
    `Not a number`, taking the report back on a keystroke or a value from outside — both
    `PctTexts` keys, which answers `req-api-number`'s own complaint one floor down
  - cost: the default texts travel with `core`, so every entrypoint pays (`size.snapshot.md`)
  - measured: core, date and field units, the eight static gates, and date, number, field and
    their audits 138 of 138 in three engines

- [x] **4.13 — a state attribute that contains another entrypoint's selector is read as that
      entrypoint**
  - `check-bundle` point 7 read an entrypoint's presence by searching the bundle's TEXT for a
    selector as a plain substring, so `data-pct-selected` on the calendar's day read as the
    select; the tabs met it a second time and renamed by hand the same way
  - closed 2026-09-05 on the read, not on the names: a marker survives linking as DATA, so both
    probes look for the quoted literal — `"data-pct-selected"` contains the token and is not it.
    The substring guard narrowed to what a literal read still cannot tell apart, two entrypoints
    exporting one selector; no rule went into `check-parts`, because a naming rule would have
    been the workaround written down ([`lesson-162`](lessons.md#lesson-162))
  - controls: `marker-shared-by-another/` for the narrowed guard and `marker-inside-a-state-name/`
    for the read itself, 30 doctored inputs, the live run's point 4 the positive side

- [x] **4.14 — a message reports nothing by colour, and the channel that would repair it is a
      decision nobody has made**
  - decided and done 2026-09-07, answering the progress bar as well as the toast: tones exist, and
    the second channel is an icon the library draws — `PctTone` in `./core` (`success`, `warning`,
    `danger`, `info`), four names into `PctIconName` at once ([0011](decisions/0011-icons.md)), a
    field on the toast's spec and an input on the bar, every colour measured rather than chosen
    ([`lesson-180`](lessons.md#lesson-180))
  - cost: a template naming `pct-icon` carries the icon component whether a tone is passed or not
    (`lesson-173` again), bytes in `size.snapshot.md`; measured by `tones.spec.ts`, six cases in
    three engines, both components under `forced-colors: active`
  - left open: `PctBadgeTone` is still `'neutral' | 'danger'` while its three homes say the union
    grows the day the ramps land — and they have landed

- [x] **4.15 — the assertive channel has no consumer, and therefore no gate**
  - `PctAnnouncer` opened two regions and nothing in the library ever spoke on the assertive one;
    0026 named the toast and the dialog as its first callers and was wrong twice, both times by
    its own rule — a message with a place on the screen announces from that place
  - decided and done 2026-09-07: the region stays open, 0026 untouched, and its consumer is an
    application ([`req-a11y-built-in`](requirements/a11y.md#req-a11y-built-in)). The sandbox's
    `announce` view speaks on it and `apps/sandbox-e2e/src/announce.spec.ts` holds four cases in
    three engines, two of them the promise itself — the sentence in the region it named, and the
    OTHER region empty, which a one-region implementation would still fail — and one that a region
    holding a sentence stays in the tree rather than `display: none`
    ([`lesson-83`](lessons.md#lesson-83))
  - the cases do not claim anybody HEARS anything; that limit is in the spec's own header

- [x] **4.16 — a control in the corner is last in the page's tab order, and nothing carries the
      keyboard to it**
  - decided and done 2026-09-08, answering the drawer as well as the toast: the keystroke is the
    consumer's to install ([0072](decisions/0072-a-region-key-is-the-consumers-to-install.md)) —
    `PctRegions` walks the registered places in the DOCUMENT's order, `[pctRegion]` declares one,
    `[pctRegionKey]` listens where a consumer puts it, F6 by default, and `listenOn="document"` is
    the word an application writes for a page whose focus is still on `body`
  - it ships as `@pacit/components/regions` with `providePctRegions()`, not in `./core` where a
    root service is a static initialiser every entrypoint carried — nobody pays until they import
    it ([`lesson-181`](lessons.md#lesson-181), with the tsconfig entry and the F-key exemption)
  - measured: five unit cases and four e2e in three engines, the one that matters reading ONE
    press from the button that raised a message to the stack whose action is otherwise last

- [x] **4.17 — a snapshot with no tolerance drifted with nothing to point at**
  - `./toast` read 35 bytes above the row recorded for it with no source of `./toast` or `./core`
    moved, so `check-bundle` was red on `main` before the step that found it; the row was
    corrected on the spot, because a known-stale row is worse than an unexplained drift
  - done 2026-09-07: all three suspects refuted — no `package-lock.json` change in the window
    between the readings, a worktree at the commit that wrote the old number rebuilding to the new
    one from its own tree, and the same with that day's lockfile installed fresh, the five
    packages that decide a byte count identical then and now ([`lesson-179`](lessons.md#lesson-179))
  - what shipped instead of a tolerance: the snapshot records the toolchain its numbers were
    produced by, with a negative control (`a-toolchain-that-moved.json` fires point 13). 0023
    stands untouched — a tolerance would have hidden exactly this
    ([0023](decisions/0023-a-tolerance-is-for-a-wobbling-measurement.md))

- [x] **4.18 — a guard the pointer makes unreachable, found by the mutant that survived it**
  - `PctTabs.onPress` opened with `if (tab.disabled()) return;` and the mutation run said the
    branch changed nothing: `select()`, `rovingIndex` and the shared walk already refuse a
    disabled tab, and a click focuses one in all three engines, so `onFocusin` puts the cursor
    there before `onPress` is reached — the guard has an effect only under a synthetic `click()`
    ([`lesson-95`](lessons.md#lesson-95) from the other side)
  - cost: minutes to delete and a full mutation run to re-record it, which is why it waited for one
  - closed at that run, the night before 3.0: the guard is gone, the JSDoc that defended it now
    records the measurement that dissolved it, and `tabs.ts` moved the way the deletion predicted
    (`libs/components/mutation.snapshot.md`), with the 973-case unit suite green over the change

- [x] **4.19 — a component that is mostly the platform has almost nothing a mutation run can
      hold**
  - the accordion writes 74 lines and borrows the rest from `<details>`
    ([0046](decisions/0046-a-disclosure-is-the-platforms-and-so-is-the-group-it-belongs-to.md)),
    so a green score over those lines reads like a statement about a component — the shape of
    everything that borrows more than it writes ([`req-api-platform`](requirements/api.md#req-api-platform))
  - decided and done (2026-09-07): a recorded disarming per claim, not a mutator over templates
    this repository would then own — twelve mechanisms taken out by hand and the suite run over
    each hole, in `docs/components/accordion.md`'s `## Negative controls`
    ([`lesson-174`](lessons.md#lesson-174))
  - one promise was held by nothing that named it, the heading row's touch floor (4.44); the
    mutation snapshot's header now says what a score over 74 lines is a true statement about

- [x] **4.20 — the list of what the platform makes focusable is written by hand, and nobody
      counts what is missing**
  - three hand-written lists in `check-aria` — focusable tags, composite roles, named tags —
    each grown by one entry the day a component showed it was missing (`summary`, then
    `progress`), each with a denominator nobody measured
  - derived (2026-09-05) from `axe-core`'s own tables, the same ones the audit in `a11y.spec.ts`
    reads on a rendered page, with an anchor per table so a table that loses an entry in a bump
    is a verdict and not a silence; what the derivation does not reach is measured in three
    engines and named as the blind spot the page audit shares — the gate's header carries both
  - two things moved with it: `contenteditable` is read as an attribute beside `tabindex`, and
    point 4's pairwise rule asks the element whether a user lands on it instead of any list. The
    live verdict did not move

- [x] **4.21 — the library's layer order is three numbers in three files and no rule**
  - `--pct-toast-z-index` and `--pct-drawer-z-index` were each written against the number the
    CDK stamps on `.cdk-overlay-container`, and that number was in neither file, in no policy
    and in no gate — the fourth component needing a layer would infer it from two token files
  - closed as filler (2026-09-05): the order is a list in `libs/tokens/src/layers.policy.json`
    and the promise is [`req-token-layers`](requirements/tokens.md#req-token-layers); point 10
    of `check-tokens` reads every number from where it lives — the tokens from the sources, the
    overlay's from `node_modules/@angular/cdk/overlay-prebuilt.css` on every run — holds the
    order strictly increasing, and fires on a `z-index` token no layer places
  - cost: four prepared inputs, one per rule, and a reference that re-probes the real dependency
    laid down from the repository, because a `node_modules` path is nothing git tracks

- [x] **4.22 — a fixed panel's containing block belongs to the consumer, and only prose says so**
  - `pct-drawer` is drawn in place and positioned against the window
    ([0047](decisions/0047-a-drawer-is-a-region-of-the-page-not-a-layer-over-it.md)), so an
    ancestor property of the consumer's takes the panel off the window silently, and a sentence
    in the card's limitations was the whole of what said so
  - closed (2026-09-05), the rule measured first — twenty-seven ancestor properties in three
    engines, and the listed ones were wrong in both directions
    ([`lesson-163`](lessons.md#lesson-163))
  - the detector is the platform's: `warnOnCaught` reads `offsetParent` on open and names the
    catching ancestor in dev mode. Unit over doctored answers, e2e both ways in three engines;
    the card, 0047 and `req-api-platform`'s gate carry it as the fourth kind of borrowing

- [x] **4.23 — the sandbox's own navigation is inside six component baselines**
  - six page-level baselines took the sandbox shell into the frame, so every new view re-recorded
    six pictures that had nothing to do with it — three views running — and, on this machine, a
    behavioural case in an untouched component went red beside them
  - closed (2026-09-06), both halves. The pictures: `visual.spec.ts`'s stage blanks the
    navigation with `opacity: 0`, the column kept, and a control in the same suite puts a row at
    the top and compares the viewport with itself ([`lesson-50`](lessons.md#lesson-50),
    [`lesson-165`](lessons.md#lesson-165) — `visibility: hidden` takes a sticky column out of its
    compositing layer and moved four card pictures)
  - the behaviour: the dialog's lock case decides its own room and the calendar's arrow walks
    poll the focused index instead of reading it a frame after the key
    ([`lesson-130`](lessons.md#lesson-130))

- [x] **4.24 — the three-API promise names a gate that measures something else**
  - `req-api-signal-forms` cited `field-controls.spec.ts` and `forms.spec.ts` for "all three form
    APIs on the same control", and neither file contains `formControl` or `ngModel`: deleting the
    interop suites would have failed nothing the requirement named
  - closed the night before 3.0 — the Gate line names the eight per-control interop suites and
    `forms.spec.ts` for the signal-forms half, and says in place why it moved; `check-docs
--write` rewrote the registry in the same step and stayed green

- [x] **4.25 — classic-forms interop is promised whole and measured for value alone**
  - every "no CVA" case asserted two-way value sync and stopped there: no spec called
    `ctrl.disable()` or `markAsTouched()`, and status propagation through `[formControl]` on a
    composite was unmeasured, which the axis counts as the same state as broken
  - closed the night before 3.0, by the happier of the two roads: the surface was measured and it
    holds — `disable()` / `enable()` reach the real control element and validity reaches
    `aria-invalid`, asserted per composite. The two boundaries left are fenced where they bite in
    [0005](decisions/0005-signal-forms-without-cva.md)'s refreshed cost section — a resolver of
    `NG_VALUE_ACCESSOR` finds nothing, `<pct-date>` warns under classic forms by design
    (`lesson-117`) — beside the API's stabilisation

- [x] **4.26 — one input block, eight hand-written copies, and only the names are checked**
  - the quartet stood verbatim in every control with only the member names checked — and
    `implements` does not even do that: in `FormUiControl` every member is optional
    ([`lesson-170`](lessons.md#lesson-170), [`lesson-21`](lessons.md#lesson-21))
  - decided and done (2026-09-07): a structural gate — `tools/check-forms.mjs`, four points and
    eight prepared inputs, in CI; the block in `libs/components/forms.policy.json`, held against
    `FormUiControl` read from `@angular/forms`'s own declarations ([`req-api-signal-forms`](requirements/api.md#req-api-signal-forms))
  - both alternatives were refused on measurements: a host directive would still list its inputs
    by name in every component, and holding the JSDoc identical would delete six true sentences
    about `readonly`, already red one gate over when a member has none
  - the title's numbers were wrong and the gate corrected them: nine controls over eight copies,
    `pct-select` and `pct-multi-select` being two tags over one base

- [x] **4.27 — two meta-gates trust a fact about nx that nothing re-measures**
  - `check-docs` point 3 proved CI wiring by matching the `nx affected -t` text in `ci.yml`,
    and every root-project gate stood on a reach measured once against an installed nx
    ([`lesson-47`](lessons.md#lesson-47)) — a dependency's behaviour, remembered
  - closed 2026-09-01: the point re-probes instead. `nx show projects --affected --files` over
    a leaf manifest must mark `components`, `sandbox`, `sandbox-e2e` and `@org/source`
    affected, so a root that stops hearing leaf changes and a target that falls out of the
    graph fire the same rule; the probe and its reasons sit beside `ciTargets` in
    `tools/check-docs.mjs`
  - proved in both directions: aimed at `docs/plan.md` it fires naming the missing projects

- [x] **4.28 — the axe audit's denominator is a hand-curated list of opened panels**
  - the audit opened by hand the panels somebody remembered, so a new overlay's open state
    joined it only if it was thought of — the state the mutation inventory stood in before 4.11
  - closed 2026-09-05, derived from the parts snapshot: a `STAGES` table keyed by the class
    that owns a `panel` part, held to `libs/components/parts.snapshot.md` both ways — an owner
    with no stage, a stage with no owner — with doctored-inventory and doctored-table controls,
    in `apps/sandbox-e2e/src/a11y.spec.ts`
  - the derivation asked for three stages the hand had not written, among them the one overlay
    the audit had never opened; what it does not reach is written beside it — the toast's stack
    is an `item`, not a `panel`, and stays a case by hand

- [x] **4.29 — the date field's UTC promise is prose, and no run stands in a hostile timezone**
  - `day.ts` promised "every day in this file is midnight UTC" with nothing measuring it: no
    Playwright project set a `timezoneId`, no unit case ran at a DST boundary, and the suite's
    machine was the timezone it happened to be
  - closed as filler 2026-09-05, and the promise is in the registry now:
    [`req-api-day`](requirements/api.md#req-api-day) — two unit cases pin `TZ` to Kiritimati
    (UTC+14) and to Warsaw across both 2026 switches, and every e2e case of the field runs with
    the browser's clock in Kiritimati (`test.use({ timezoneId })`) against values the view
    writes from a fixed calendar, so only the `today` marker could move and none did

- [x] **4.30 — six e2e cases measure the machine's fonts, and CI's machine has different ones**
  - CI failed four metric cases and two visual baselines deterministically while the same suite
    was green here — the library sets no font of its own, so every metric a case reads is a fact
    about whatever the runner resolves `system-ui` to
  - closed 2026-09-01: one symptom, three causes, and no tolerance would have named any of them
    — the resolution itself (the sandbox pins a vendored face, `apps/sandbox/src/styles.scss`),
    a cascade override on the application host that silently undid the pin (`app/app.scss` says
    so where it declares no family), and one uncovered code point — all 52 differing pixels sat
    inside `ⓘ` (U+24D8), which the visual suite's long-pinned `Liberation Sans` hands to each
    machine's symbol fallback; the demo draws the ring in CSS around a plain italic `i` now
  - the diff images had died with the runner: `ci.yml` uploads the e2e output on failure, and
    the first artifact ever read named the glyph at once

- [x] **4.31 — the language gate's dictionary is whatever the machine has**
  - the first two CI runs proved it from both sides: ENOENT on a fresh runner, then a verdict
    that depended on which machine's lists read the file — and the gate's dead-entry rule
    couples its vocabulary to the dictionary VERSION, so the register cannot absorb a split
  - closed 2026-09-01: the dictionary becomes a pinned, checksummed input —
    `tools/dictionaries.lock.json` (the sha256 is the identity, the URL a courtesy) restored by
    `tools/restore-dictionaries.mjs` into untracked `tools/.dictionaries/`, verified at both
    ends, in nothing but the standard library — decision
    [0040](decisions/0040-a-lockfile-is-material-the-tree-it-locks-is-not.md)'s split applied
    to the gate's biggest input
  - vendoring lost to fetch-by-pin on arithmetic; both workflows drop their apt steps for an
    `actions/cache` keyed on the lock's hash, and the gate runs where no `/usr/share/dict` is

- [x] **4.32 — the dialog's scroll-lock case is a coin toss in WebKit, and only there**
  - written 2026-09-02 against a 1-in-3 red in WebKit, measured idle and named at the `Escape`
    step
  - closed 2026-09-05, re-measured at the commit it was written on: four runs of twelve are red
    at the LOCK assertion and not at Escape — [`lesson-149`](lessons.md#lesson-149)'s defect,
    which the commit written the next morning already cured; a probe pressing Escape with no
    settle at all is 20 of 20. Today 42 of 42 in isolation, and nothing to fix beside the dialog
  - what was wrong was the record, and that is [`lesson-164`](lessons.md#lesson-164)
- [x] **4.33 — the button's faces stop at `<button>`, and the site is the consumer that
      noticed**
  - a link that should look like a button had no library answer and the docs app settled for
    `<button routerLink>`; raised by the site's own CTAs, recorded in 0062's costs
  - done 2026-09-07 at the full 1.1 regime: `button[pctButton], a[pctButton]`, decision
    [0071](decisions/0071-a-link-in-button-s-clothes-is-a-link.md) — the paint moved off
    `[disabled]`, which an `<a>` can never carry, onto `data-pct-disabled`, and the disabled
    link keeps its tab stop behind `aria-disabled` and a refusal
  - the refusal is a capture listener attached in the constructor on the anchor alone, and the
    obvious spelling of it is wrong ([`lesson-166`](lessons.md#lesson-166))
  - `check-harness`'s fixture stopped failing the day the component caught up with it; 16 unit
    cases, four e2e in three engines and a forced-colours reading hold the pair
- [x] **4.34 — the first human review of the site: good in parts, owed a design pass**
  - delivered 2026-09-02, the day 2.1 closed: not a machinery defect — the numbers, the gates,
    the demos and the prerender stand, and the gap is visual design
  - six screens, each read before it was drawn and transferred literally from a sketch that had
    a yes: the landing **kept**, one part taken (its inventory as a dotted index); the gallery
    **rebuilt** — 24 objections, 2 stood, and both were "the page cannot be arrived at" — with
    `docs-finder`, `docs-bar`, six `<h2>` addresses, and the match rule and the scroll spy moved
    out to `find.ts` and `spy.ts` rather than copied a second time; the component page **kept**,
    its plate refused beside the live page; `start` **rebuilt**, its one demo the file the
    snippet above it is read from; `theming` **rebuilt**, the two moves first and all 536 tokens
    in 28 groups; `trust` **rebuilt**, every row carrying the requirement's own title over the
    clipped cell; `acr` and `support` take `docs-toc`, the report with the identifying fields
  - closed 2026-09-09, and what it leaves behind is the method rather than the pixels: read
    first, draw second, transfer literally — two of the six kept their design, and a no cost a
    sketch instead of a stylesheet
  - three findings were defects no plate would have caught, each the page stating what the
    repository does not — the mutation tile an em dash on all thirty-four pages, the colour-pairs
    tile counting a naming accident, seven cards reading `none — gap` for RTL over a `dir="rtl"`
    baseline each: `check-docs` point 7 refuses that sentence now, and a cell may say `partly`
  - 4.36's three hand copies of the gradient are answered — the rim and the headline are
    `[pctHero]`'s faces, the card's name stays hand-written and `hero-edge.scss` says why — and
    the suite's own flake was the dev server navigating the page it serves
    ([`lesson-184`](lessons.md#lesson-184))
- [x] **4.35 — the popover's axe audit can catch a button mid-transition, in two
      engines at once**
  - closed as filler (2026-09-05), with the suspicion measured first: at the moment
    `toBeVisible()` resolves, two transitions are 0–35% through their 150 ms in all three
    engines, so axe read composed colours no user rests in — `panel-apply`'s label at 4.09:1
    in firefox and webkit at once (2026-09-02, run 33681596258)
  - fix: one wait in `audit()` — `settled(page)` in `apps/sandbox-e2e/src/support/dom.ts`
    waits for every transition and finite animation, infinite ones left running because they
    are the resting state, so no case has to know which transition its click set off; reduced
    motion was the other road and audits a state most users never see
  - measured: the five panel audits and a control that slows the motion axis to two seconds,
    three times in three engines — 108 of 108
- [x] **4.36 — the loud face is equipment the consumer cannot ask for: three hand copies,
      no gate**
  - done 2026-09-07: `[pctHero]` is the 34th entrypoint — `edge`, `text` and `fill`,
    `show="always | interact"`, the shape
    [0065](decisions/0065-a-treatment-that-paints-is-a-component.md) decided and `lesson-21`
    asked for before the second copy; the palette took the two primitives the `text` face needs
  - two defects on the way: a `-webkit-` alias under the rim
    ([`lesson-156`](lessons.md#lesson-156)) and a keyframe whose travel is its size written
    twice ([`lesson-167`](lessons.md#lesson-167)); point 7 of `check-tokens` saw no gradient
    at all until 4.39 taught it to read a value rather than a property name
  - the site's three copies stay — none is a like-for-like swap, and the `hero-edge` mixin's
    trigger, the card's hover painting the name inside it, is a shape 0065 did not name

- [x] **4.37 — the conformance report's rows nothing measures, and two limits with no gate**
  - done 2026-09-07: `apps/sandbox-e2e/src/adaptation.spec.ts` measures the four criteria over
    the sandbox views — every route at 320 px, the kitchen sink at 200 % text and under the
    text-spacing declarations, a focused control under a standing toast — and `docs/acr.md`
    has no _Not Evaluated_ row left
  - the first run was red on three real defects, one of them the library's: `pct-field` had no
    `min-width: 0` ([`lesson-175`](lessons.md#lesson-175))
  - 1.3.5: `[pctNumber]` takes an `autocomplete` input defaulting to `off`, so nobody shipping
    the field today sees a change. 2.2.2: every face of `[pctHero]` and the button's `hero`
    variant run one four-second pass and stand still, `paused` is the page's stop, precedence
    reduced motion over the page over the settle — 78 baselines untouched; the skeleton's sheen
    keeps moving and the report states that argument ([`lesson-178`](lessons.md#lesson-178))

- [x] **4.38 — three previews settle in two render passes**
  - closed the same day from the cost record's own reading: not one shared piece but one shape —
    the menu and the popover flipped a `rendered` signal in `afterNextRender` that an effect
    read, and the toaster did the same with `mounted` and attached its viewport after that
    render, which the scheduler answers with a pass unconditionally
  - the flag is a field now and what its flip used to trigger is done in the callback that
    flips it, with the effect's signals read before the gate; the toaster queues messages
    raised before the region exists ([`lesson-161`](lessons.md#lesson-161))
  - `apps/docs/bench.snapshot.md` reads one render for all three and `check-bench` holds it
    there; the bytes came the commit after, because `check-bundle` was not among the runs

- [x] **4.39 — the gate that measures painted colours cannot see a gradient**
  - done 2026-09-07, and the fork went the repository's own way: the reader was taught, not
    the policy header. Point 7 of `check-tokens` reads a VALUE in two shapes — where the whole
    value is a colour every `var()` under it is one; where it is composite the skin's `$type`
    decides, which is what keeps the first `box-shadow` from firing `not-a-colour` eight times
  - the gain as a control rather than an assertion: the denominator gained
    `--pct-date-day-border-today`, painted only through a `box-shadow`, whose policy line was
    deletable green before this step and reads `[unmeasured]` after it
    ([`lesson-168`](lessons.md#lesson-168))
  - `text-shadow` waits for the first stylesheet that paints one and the eight `$type: shadow`
    tokens stay unmeasured by decision — the limits are
    [`req-token-text-pairs`](requirements/tokens.md#req-token-text-pairs)'s ([`lesson-119`](lessons.md#lesson-119))

- [x] **4.40 — a word with a colon inside a comment eats the declaration after it**
  - done 2026-09-07: the compiled CSS reaches `check-tokens`'s declaration scanner stripped of
    its comments, one call — a comment line carrying `word:` had parsed as a property whose
    value ran to the next `;`, and four declarations in the library lost their property to it
  - what is lost is the property and not the tokens, so the live run is unchanged — all four
    carry dimensions — and what changes is that the guarantee stops depending on the prose
    above a declaration ([`lesson-33`](lessons.md#lesson-33))
  - the strip sits at that reader and not in a shared helper: `check-styles` reads the same
    output and MUST see the comments, its exceptions written as `/* pct-exception left: … */`
  - control `colour-under-a-comment`, whose first draft was green both ways until the disarm
    caught it ([`lesson-169`](lessons.md#lesson-169)); the data URI waits for the first
    stylesheet that holds one, recorded beside the strip rather than left as a plan line

- [x] **4.41 — CI restores the dependencies and none of the task results**
  - closed 2026-09-07: the nx task cache lands in `ci.yml` and is refused in `nightly.yml`,
    and both halves are written into the workflows themselves
  - the shape this item proposed does not work alone — `.nx/cache` holds the artefacts and
    `.nx/workspace-data` the index that says the hash exists, so they are one entry under one
    key, restored together or missed together ([`lesson-172`](lessons.md#lesson-172))
  - what it buys is measured in the workflow's own comment, and what it does not buy is this
    item's headline: a dependency bump still reruns every gate, because `package-lock.json` is
    in `sharedGlobals` and every task's hash carries it
  - the correctness argument is refused where it was aimed: a restored mutation result would
    freeze the very distribution the nightly exists to sample; the hosted remote cache stays
    refused too, being a service and so a dependency decision rather than a setting

- [x] **4.42 — one select tag brings the other, and no reference between them says why**
  - closed 2026-09-07: `./select` sheds nothing between one tag and both, and the cause is
    `providers` on `PctSelect` — the class nobody imported — measured one doctored declaration
    at a time on the BUILT package ([`lesson-173`](lessons.md#lesson-173))
  - the explanation this item led with was wrong twice, and both corrections stand elsewhere:
    the shared base and `PCT_SELECT_IMPORTS` are innocent, and the rows that shed are explained
    by two mechanisms rather than by parent/child pairs (`libs/components/size.snapshot.md`)
  - the snapshot also says the reading is DIRECTIONAL — the probe imports the first export name

- [x] **4.43 — a dev-mode message costs a consumer 24458 B, and it is in the `providers`**
  - done 2026-09-07: the `providers` array both select tags declared bought one dev-mode report
    of a slot standing where nothing reads it, and pinned each tag into a bundle that had
    imported only the other (4.42)
  - the road decided first — the slot reading its host's tag off the DOM — was measured shut
    before a line of it was written ([`lesson-176`](lessons.md#lesson-176)); what shipped is the
    host's own `contentChild` claiming what it finds, so a slot nobody claims reports itself
    after the first render, and `PCT_TEMPLATE_HOST` with `providePctTemplateHost` leave `./core`
    — a breaking removal ([0027](decisions/0027-a-slot-is-a-directive.md))
  - the other tag is shed whole and no component declares `providers` for a message any more
    (`libs/components/size.snapshot.md`); what the report no longer says, and its silence under
    SSR, stand in the header of `pctReportOrphanSlot` (`libs/components/core/src/template.ts`)

- [x] **4.44 — a floor the case above it does not stand on**
  - found by 4.19's disarming: the accordion's 24 px e2e case stays green with
    `--pct-accordion-heading-target-min` removed — the padding clears the floor on its own, so
    the promise (`req-a11y-touch`) was measured and the mechanism named beside it was not
  - done 2026-09-07: `apps/sandbox-e2e/src/target-min.spec.ts`, every control in the library
    that declares a `*-target-min` token — eleven, three engines. Each row zeroes the other
    custom properties that give the element size, empties it and reads the box against a
    measured CEILING, with a negative control that zeroes the floor's own token too
    ([`lesson-177`](lessons.md#lesson-177))
  - the accordion's card is corrected in both places it said the floor was held by nothing

- [x] **4.45 — the sheen that can outlast five seconds, and the wait that owns it**
  - left standing by 4.37: every sweep in the library runs one pass and settles, but the
    skeleton's sheen travels for as long as the wait does, by design
    ([0050](decisions/0050-a-skeleton-is-a-picture-of-a-wait.md))
  - closed 2026-09-08: `paused` on `pct-skeleton`, `false` by default — the page's stop, under
    the reader's `prefers-reduced-motion` and over the bare motion
    ([0073](decisions/0073-the-stop-a-long-wait-needs-is-the-pages-to-throw.md),
    [`lesson-178`](lessons.md#lesson-178)). The "essential" exception was argued and then not
    used — a row that says Supports because we reasoned well is the claim shape the report
    exists to avoid — and the cap after N passes stays refused outright
  - measured: four unit cases, two e2e in three engines, the second a negative control — a
    skeleton the page did not name keeps moving. SC 2.2.2 rises to Supports in `docs/acr.md`

- [x] **4.46 — the mutation gate had been dead for three days, and nothing could have said so**
  - found 2026-09-08: `stryker run` had ended in its dry run since 2026-09-05, throwing no
    mutant at all — cause, and the three layers it took to reach it, in
    [`lesson-182`](lessons.md#lesson-182)
  - repair: `describe.skipIf('__stryker__' in globalThis)`, loud in both directions — the
    cases run under `test` on every commit, and a renamed namespace reddens the mutation run
  - left open: a gate whose only automatic runner is `nightly.yml` has no control over its
    own liveness, and `check-mutation` says nothing about whether a report was produced today

- [x] **4.47 — the run that came back after three days found the new code thinly measured**
  - the first full run since 2026-09-05 held the floor and fell over four days of new code, and
    three files carried it: `toast-viewport.ts` (the registration and key handler 4.16 added,
    walked by e2e and by no unit case), `hero.ts` (two defaults its only host binds away) and
    `core/regions.ts` (the `null` factory that is the whole of 0072's promise, read by nothing)
  - closed 2026-09-08 in one run at `--concurrency 4`: every repair was a spec and none a
    source change, so they landed together and were measured by ONE run — seven cases against a
    FAKED cycle for the toast, and a host that binds nothing for the hero's and the skeleton's
    defaults. The score of each file: `libs/components/mutation.snapshot.md`
  - three survivors stand in `toast-viewport.ts`, two of them equivalent rather than missed, and
    one mutant comes back a RuntimeError — a null cycle dereferenced inside a DOM listener —
    which is neither a survivor nor a kill
- [x] **4.48 — the cycle's own mechanism is the file 4.47 did not name**
  - `libs/components/regions/src/regions.ts` was unmeasured where it matters: the whole
    `listenOn="document"` effect uncovered, and the survivors were the defaults a bound input
    hides, the guards, and the sort comparator that is the whole of "the document's order"
  - closed 2026-09-08, spec-only, nine cases: the `document` seat and its teardown, a host that
    binds nothing, an `@if` whose region registers second and stands first, one region leaving,
    an empty cycle, a `tabindex` the consumer wrote, and the two guards on the press
  - taken to the file's ceiling 2026-09-09 — the two guards that shadowed each other are one,
    with the reason written beside it in `regions.ts` — and the leak case is not the one this
    item proposed: the guard that makes two seats one hop hides the double hop, so what sees a
    leaked document listener is a spy on the cycle and not a second page (`regions.spec.ts` ›
    "and the listener really goes, which nothing visible would show")

- [x] **4.49 — the entrypoint a consumer tests with is measured by nothing** — **closed
      2026-09-11 on the first of the two roads: it is measured now**
  - `libs/components/testing/**` came out of the stryker exclusion: four files mutated, four
    rows in `libs/components/mutation.snapshot.md`, each above the library's own total
  - what it took: a spec over the throwing paths of `dom.ts`, where the message is the product,
    and nine cases over `property.testkit.ts` — the instrument, whose own spec had been written
    against nothing able to disagree with it ([`lesson-195`](lessons.md#lesson-195))
  - the `coversNothing` permit for `property.spec.ts` is retired; the register stays declared in
    `libs/components/mutation.policy.json` — it is the mechanism, not the entry

- [x] **4.50 — a third of the file promise is a plan, not a rule** — **closed 2026-09-11 by
      narrowing the promise and gating what was left**
  - `req-project-files` no longer promises a `*.types.ts` per component: the fixed shape is the
    eponymous four files beside the index and the manifest, and what is promised of a type is
    the **index** that exports it
  - point 10 of `check-files` holds the narrowed promise, building each index's surface by
    following its re-exports. It found five: four interfaces in `select.base.ts` typing
    `protected` members lost the `export` keyword, and `PctArbitrary` stands with a reason in
    the `internal` list of `libs/components/files.policy.json`

- [x] **4.51 — the plan and the registry disagreed for 149 commits and nothing asked** —
      **closed 2026-09-11; the comparison is point 8 of `check-docs`**
  - a task naming a requirement on its title line is held to that requirement's state, in both
    directions — an open task whose requirement has left `gap`, a ticked one whose requirement
    is still a gap ([`lesson-188`](lessons.md#lesson-188),
    [`lesson-189`](lessons.md#lesson-189))
  - four of the point's six rules are the denominator, because a comparison over nothing is this
    gate's own failure mode — including a second count of the task lines, taken differently from
    the parser's, so an invented mark cannot drop out in silence. On today's plan it flags nothing

- [x] **4.52 — a new set lands in the base, and the gate that guards the base asks the wrong
      question** — **closed 2026-09-11; the base is derived, not listed**
  - the instance was a `density` group in `themesOf` (7bc1bd4); the class is closed by `axesOf`
    in `libs/tokens/bridge.mjs` — a qualified set that re-points a name an earlier set declares
    is one option of the axis its stem names, and the base is the remainder, so no list decides
    it ([`lesson-190`](lessons.md#lesson-190))
  - point 7 of `check-bridge` rules on placement, which point 4 never did: an axis of one option,
    an option enabled across two groups, and a denominator that fails rather than passes when the
    parse finds no axis. `$themes.json` comes out byte-identical

- [x] **4.53 — the touch floor has sixteen declarations and its own spec measures nine** —
      **closed 2026-09-11, and the count in this title was wrong: it is 19 applications**
  - the denominator is applications, not token names — three names are applied in more than
    one place, so eight sites were measured by nothing rather than seven
    ([`lesson-194`](lessons.md#lesson-194)). All nineteen are named by a case in
    `apps/sandbox-e2e/src/target-min.spec.ts` now and clear 24×24 with no token raised
  - point 10 of `check-styles` derives which properties carry the floor through the DTCG alias
    chains and requires the spec's set and the sheets' to be equal both ways (`req-a11y-touch`)
  - it turned up an older hole on the way: `cssRules()` dropped the first rule of 40 of the 41
    sheets, and that reader's blind spot was every point's ([`lesson-193`](lessons.md#lesson-193))

- [x] **4.54 — the suite has flakes, and nothing counts them** — **closed 2026-09-11 on the
      greppable rule; the nightly job was refused**
  - both flakes were defects of the test, and one family: a number or an index standing where a
    condition belonged (2af78c7 and the closing commit, [`lesson-192`](lessons.md#lesson-192))
  - the rule is `tools/check-e2e.mjs`, four points over that shape (`req-quality-e2e`): a
    positional locator read by a one-shot reader inside the window an action opened, and a bare
    `waitForTimeout` whose next statement binds a baseline. It found thirteen, **three of them
    failing green** in `adaptation.spec.ts` and `shell.spec.ts`; all are answered by a condition
  - what this does not buy: the suite's own flake rate is still unmeasured — **4.58**

- [x] **4.55 — the copy off this machine was twelve days old, and nothing measured the
      distance** — **closed 2026-09-14: 173 commits pushed, and a gate that holds the number**
  - 3.0 bought a _continuous_ property and ticked it as an event. What decayed under the tick:
    `origin/main` stood on `00040dc` (2026-09-02) while the remote's nightly ran nightly on
    that head, went red seven nights of ten, and the older logs expired unattributable
  - `check-distance` counts the commits reachable from `HEAD` that no remote ref carries and
    the age of the oldest — two readings of one fact, because a count taken against no remote
    at all reads zero, which is the shape of the failure rather than its absence
  - the ceilings are the maintainer's and stand in `distance.policy.json` with a reason each
    ([0075](decisions/0075-the-push-and-the-premiere-are-two-moments.md)). Uncached, like
    `check-support`: the reading moves with every hour, and no `inputs` list can say so

- [x] **4.56 — the plan was the only copy of thirty-five facts** — **closed 2026-09-12; the
      positions half of [0017](decisions/0017-one-home-per-fact.md)'s pass**
  - the instrument first: `check-prose.mjs` had matched the lettered numbering the plan
    carried before the sections, and its position loop was bounded by a `## Journal` heading
    that does not exist — two dead ends over the same layer, in a script that exits 0 by design
  - then the pass: **89 positions, 3985 lines to 995** against a budget of 1124. What came out
    of them and had no other home is `lesson-196`–`lesson-204`, 0075 and 0076, rows in 0005 and
    0044, paragraphs in `site.md`, and four refusals moved to the file the next person to
    propose them will be standing in
  - three defects found on the way: `check-mutation`'s `inputs` named `ci.yml` alone while the
    gate reads both workflows; 0044's "no tone" stood against shipped behaviour; and `plan 2.8`
    was cited three times by source files for an item that does not exist

- [x] **4.57 — the other half of the pass is the gate headers, and it is the larger half** —
      **closed 2026-09-14; the pass is closed with it**
  - [0017](decisions/0017-one-home-per-fact.md) budgets a header at 12 lines plus one per
    numbered point: **29 scripts, 825 lines to 515 against 528, nothing over**. The largest
    were `check-aria` 72 to 21, `check-language` 57 to 19, `check-files` 56 to 22
  - every numbered point survived, numbered and in place — the budget counts them, so dropping
    one buys a line by hiding what the gate measures. What left was the retelling around them
  - one rescue was real: 0040 gains why thirty hand lines of `ar`, `tar` and `zstd` need no
    fixture tree — the bytes are hashed against the lock before the parse and the list after
  - two stale pointers found: `check-language`'s header said five false positives where its own
    policy entry says six, and a jsdoc in `check-files` sent a reader to a header paragraph
    that was the requirement's all along

- [~] **4.58 — the suite has a flake rate and nothing has ever measured it** — **the machine
  landed 2026-09-14; the reading belongs to the first nightly that runs it**
  - 4.54 bought the _shape_ of a race as a greppable rule and refused the repetition job on
    its own wording. The two flakes it found were fixed and the rate stayed a guess
    ([`lesson-202`](lessons.md#lesson-202) names five cases that fail only under the suite's
    parallelism, which is the population a rate would be over)
  - what landed: a third runner in `nightly.yml` — both suites `--repeat-each=3 --retries=0`,
    one at a time, reports kept as an artifact — and `check-flake`, five points over them,
    with `flake.policy.json` and seventeen prepared inputs. Read ONE way: a name that appears
    is red, a recorded name that behaved is not removed, a sample being no proof of absence.
    Falsified in both directions against a substituted report before it was committed
  - the shape of that report was MEASURED against Playwright and not read out of it:
    `--repeat-each` puts every repetition in a separate spec entry under the same title and
    records no repeat index, so repetitions are found by grouping on `<path> | <project>`
  - what remains: **the first reading**, deliberately not taken here. The failure mode is
    "fails only under the suite's own parallelism", so a rate off this idle eight-core desktop
    would be a fact about this desktop written down as a fact about the suite
    ([`lesson-200`](lessons.md#lesson-200)). The gate reports `no-record` until then
  - binds at: **the first nightly on the day's code** — unblocked by 4.55's push

- [x] **4.59 — the plan forbids citing a task by its number, and 126 citations did** —
      **closed 2026-09-14**, 204 files: zero left outside this one
  - the count was wrong, and how is the finding: 126 is what `plan N.N` greps for, while the
    shape with no prefix — `(4.34)`, `since 4.16`, `(2.1.7)` on thirty-four cards — is
    invisible to it and dangles the same. Removed: **165 of one, 96 of the other**
  - `plan 2.8` was cited four times for an item that does not exist, and one was not a
    comment: the component page **printed the number to the reader**, promising work that had
    landed nine days earlier
  - one home had to be built first: the gallery, the only route in `site.md`'s architecture
    table with no section beside it. Left deliberately — a sentence naming the plan as an
    actor survives the file, and `check-acr`'s `finding` field is machinery rather than
    prose, so it goes when **2.2** does

- [x] **4.60 — a survivor proved equivalent by hand had nowhere to be recorded** — **closed
      2026-09-14 on the run its trigger named**
  - `equivalent` in `mutation.policy.json` is the fourth register and the only one about a
    MUTANT: the operator, the **span** and the replacement, so an entry stops resolving the
    day the line moves rather than excusing whatever takes that place. Point 7 holds it to
    resolving, to being alive and to carrying a sentence — and excuses no score
  - the five were four: `regions.ts`'s `label` default is reachable through `hostDirectives`
    on an exported directive, so it stays an unexplained survivor rather than an excuse
  - reading a survivor by its LINE nearly filed a hole as equivalent — three mutants share
    the start column and only the end column separates them
    ([`lesson-205`](lessons.md#lesson-205)); the run itself cost three attempts
    ([`lesson-206`](lessons.md#lesson-206))

- [x] **4.61 — two decisions about the mutation run stood in nobody's file** — **closed
      2026-09-14 as [0077](decisions/0077-the-clock-is-evidence-and-the-workers-are-a-ceiling.md)**
  - one thesis under both: a number about the RUN is not a number about the code. The worker
    count barely varies — the binding resource is memory per worker, 15 GB here against 16 on
    a runner — so it stands once in `stryker.config.json`, and point 1 refuses its absence and
    a command line that overrides it alike
  - the clock varies freely, so it is recorded and binds nothing: the per-file drift is
    measured on the killed MINUS the clock, both sides, and a `--write` is allowed from any run
  - the case that made the record undecidable was a run landing timeouts on `motion.ts`,
    `placement.ts` and `texts.ts` over untouched code. The 2026-09-14 run was **not** that
    case — its eight are the record's own eight in the same six files, and it moved no row.
    Recorded here because this file claimed the opposite for a day

- [x] **4.62 — the nightly claimed to run everything, and nothing compared the two lists** —
      **closed 2026-09-14**
  - `check-prose` reached `ci.yml`'s affected line and nowhere else, so the gate holding the
    prose budget went a day without running on a full sweep. Nothing caught it because point 3
    of `check-docs` read the two workflows **concatenated** — the right reading for "is this
    gate in CI at all" and blind to "does the night run everything the push line runs"
  - the rule is one-sided: the night may hold more than the push line and never less, because
    [0075](decisions/0075-the-push-and-the-premiere-are-two-moments.md) put the two heaviest
    targets there deliberately. Its reference is a PAIR — neither workflow says anything alone
  - a second defect fell out of writing it: the class reading a target list held `\s`, so the
    match ran past the newline and took `npx`, `nx`, `run:` and `-t` from the next step. Six
    words that are not targets, in the set this point answers from

## 5. Gaps with no deadline

Waiting for the trigger written in their **Binds at** field. They are not forgotten — they
are deferred.

- [x] **5.1 — `req-api-number`**: property tests for the parser, and the three surfaces the
      direction review added to it — **taken 2026-09-11, ahead of its trigger, on the
      maintainer's word**
  - the instrument is the repository's own, seeded, and has a spec of its own:
    `libs/components/testing/src/property.testkit.ts` ([`lesson-186`](lessons.md#lesson-186))
  - the parser took three widenings past `pl`/`en`; the sweep and its disarming are the
    requirement's, `libs/components/field/src/number.property.spec.ts` over 22 locales
  - `day.ts` and `calendar.ts` repaired at both ends of the day shape, and the hardening the
    sweeps led to deleted more than it added ([`lesson-185`](lessons.md#lesson-185), [`lesson-187`](lessons.md#lesson-187))
  - a sweep's gain can be invisible to the mutation score — `pagination.ts` took seven laws and
    did not move ([`lesson-204`](lessons.md#lesson-204))
  - cost: 1254 unit cases where 966 stood at the direction review, four sweeps a run
- [x] **5.2 — `req-project-files`**: a check on the entrypoint directory layout — **taken
      2026-09-11, ahead of its trigger, on the maintainer's word**
  - `tools/check-files.mjs`, over `libs/components` as the **git index** carries it, with
    `tools/check-files.fixtures/` as its negative control and
    `libs/components/files.policy.json` as the register that excuses the rest; what each point
    rules on is [`req-project-files`](requirements/project.md#req-project-files)'s
  - the requirement's named control is among the prepared trees: a component keeping its
    template in the decorator, which the build, the tests and the linter are all content with
  - **one limb of the promise is deliberately not a point**, and the measurement that says so
    is the item's own finding — 4.50
- [x] **5.3 — `req-token-directive`**: a theme directive instead of a hand-written
      `data-theme` — **done since 2026-09-02; only this line had not heard**
  - `698091e` built `[pctTheme]`, its unit spec and its e2e control; the checkbox stayed open
    for 149 commits ([`lesson-189`](lessons.md#lesson-189))
  - verified before ticking rather than taken on the registry's word:
    `libs/components/theme/src/theme.ts`, `theme.spec.ts`, `apps/sandbox-e2e/src/theme.spec.ts`
    and `apps/sandbox/src/app/ui/demo.html`, which sets every demo card's theme through the
    directive
  - what it cost to find is 4.51
- [x] **5.4 — `req-token-density`**: the density axis — **taken 2026-09-11, ahead of its
      trigger, on the maintainer's word**
  - a scope, not an input: `density.compact.json` re-points metric primitives, `build.mjs` emits
    both scopes with the closure, no component changed and no token name is new
    ([0074](decisions/0074-density-is-a-scope-that-re-points-metrics-not-an-input.md))
  - the corner this item was written around is where the axis ends: 26px is measured rather
    than chosen ([0004](decisions/0004-explicit-height.md)), so `compact` + `sm` is the floor
  - the gate came in the same commit, because this item said it had to: point 11 of
    `check-tokens` and its four cases ([`lesson-50`](lessons.md#lesson-50)), beside
    `apps/sandbox-e2e/src/density.spec.ts`, whose own disarming is `req-token-density`'s
  - `[pctDensity]` is deliberately not here, its trigger written into 0074
    ([0059](decisions/0059-a-theme-is-an-attribute-the-skin-reads.md)); findings 4.52 and 4.53
- [x] **5.5 — `req-project-concise`**: the prose volume budget per file — **taken 2026-09-14,
      the day its trigger fired**, so the record is the state the compression pass left and
      not the bloat it removed ([`lesson-49`](lessons.md#lesson-49))
  - `tools/check-prose.mjs` over two layers, holding [`prose.snapshot.md`](prose.snapshot.md)
    to lines AND words in both directions with no band; the shape and the values are
    [`req-project-concise`](requirements/project.md#req-project-concise)'s and
    [0017](decisions/0017-one-home-per-fact.md)'s
  - the instrument it grew out of reported for weeks on a layer it never read, so points 1 and
    2 are the denominator's own guards: two readings independent of the walk, and a red rather
    than a pass on an empty set
  - `tools/prose.policy.json` is a fourth register — 1.1 and 4.34 stand past the budget at an
    exact line count, and the reason names the split that removes the entry

**This file lied twice, and now something asks.** The rewrite that shrank it to a working
set also cut it mid-sentence and left `req-project-concise` owned by nobody while
[State](#state) said every gap had an owner — both found by a review rather than by a run.
Point 8 of `check-docs` is the answer to the half that can be measured: a task naming a
requirement is held to that requirement's state, in both directions. The other half is
still a habit — the counts above are read at the start of a session, and the tail of this
file is part of what a rewrite has to hand back.
