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

**When a phase closes** — its positions leave this file, and git history keeps them. Nothing
durable was ever at home here: a requirement, a decision or a lesson holds it, and the
position only cited it. Sections 0, 2 and 5 left on 2026-09-16, with every closed finding.

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
| requirements                                |    98 |
| ✅ enforced                                 |    83 |
| 🟡 partial (deliberately without a control) |    15 |
| ⛔ gap                                      |     0 |

No gap stands. If adding a requirement raises the gap count and no task changes, this list
has stopped being complete, and that is a fault of this list, not of the registry.

## Order

```
0  the copy off this machine  DONE — landed 2026-09-01
1  components             by need (0095): 1.8, 1.2, 1.9, 1.10, 1.11, then 1.6 and 1.7
2  trust surface          DONE — the site is built; its address is 3.5
3  publication            DONE — 0.1.0 on npm 2026-09-17; 0.2.0 staged and approved 2026-09-25
4  open findings          small, good filler between the bigger items
5  gaps with no deadline  DONE — the last trigger fired on 2026-09-14
```

## Where things stand

**The push and the premiere were two moments**
([0075](decisions/0075-the-push-and-the-premiere-are-two-moments.md)), and both have passed:
the quiet push on 2026-09-01, the flip to public on 2026-09-15, the site at its address and
`@pacit/components@0.1.0` on npm on 2026-09-17, the last on the maintainer's sentence. The
premiere owes nothing since 2026-09-25: `0.2.0` was the proof — staged by the trusted
publisher and approved by hand with 2FA, the first `@since next` dated on the release run
(**3.6** past the tag), the first codemod under the version a consumer installs — read back
from npm and the tarball the same day
([0079](decisions/0079-the-first-release-is-a-measurement-and-the-history-stays.md)).

**The whole left the desk on 2026-10-07**
([0088](decisions/0088-a-row-is-measured-by-its-own-run-and-the-whole-at-night.md)): the
battery runs without the browsers, a change measures its own files with a narrow run and
merges their rows, and CI measures the whole — eight shards on a push, the full set at night,
its report kept.

**The decisions the premiere was waiting for fell on 2026-09-16**, and they stand where
decisions live: the site's address, host and deploy trigger in
[0078](decisions/0078-the-site-has-an-address-and-deploys-behind-a-green-ci.md); the first
version, the shape of its CHANGELOG, the fate of the history and the order in which a token
gives way to trusted publishing in
[0079](decisions/0079-the-first-release-is-a-measurement-and-the-history-stays.md). This file
holds only the order.

**What is left.** Section 1 holds what the first consumer asked for — numbers and instants
(**1.8**), the table (**1.2**), the card (**1.9**), an application's frame (**1.10**) and
charts (**1.11**), ordered by need since [0095](decisions/0095-every-component-is-mit-and-the-order-is-what-a-consumer-needs.md) — and after them the wheel (**1.6**) and the
time panel's shape (**1.7**). The warnings on a field
(**1.5**) landed on 2026-10-07, as
[0087](decisions/0087-a-warning-is-a-verdict-without-a-veto.md) decided them, and the datetime
field (**1.4**) on 2026-10-12, as
[0090](decisions/0090-a-day-with-a-time-is-a-wall-clock-with-a-date.md) decided it. The wheel
and the time panel's shape follow
[0089](decisions/0089-one-value-more-than-one-control-and-the-consumer-chooses.md) of
2026-10-08, the wheel first, and its runway was measured and written on 2026-10-14
([0091](decisions/0091-the-rings-runway-is-the-cycle-three-times-in-the-tree.md)). Section 3 holds nothing since `0.2.0`. Section 4 holds six open
findings, each held by a **binds at** rather than by anybody's mood.

## 1. Components

Ordered by what the consumers need, weighed against what it costs to build: [0095](decisions/0095-every-component-is-mit-and-the-order-is-what-a-consumer-needs.md) took back
the rule of [0016](decisions/0016-mit-irreversibility.md) that the costliest item goes last.
A component answers a class of applications, and the first consumer to ask for it is its
first measurement, not its specification. A library is allowed to grow in public, and a repository that moves is its own
argument to a first visitor.

Every new component fills in [`components/_template.md`](components/_template.md) — the DoD
form exists and is a condition of entering a release. Forty-two cards are filled in.

- [x] **1.3 — time field** in `@pacit/components/time` — **closed 2026-10-08**
  - the value module landed 2026-10-06, enforced as
    [`req-api-time`](requirements/api.md#req-api-time); the field `PctTime` and the columns
    `PctTimeColumns` on 2026-10-08, with the tier `--pct-time-*`, nine `PCT_TEXTS` keys and the
    icon role `clock` — and `./time` left `check-bundle`'s list of componentless entrypoints
  - a signal form gives the field its bounds through `pctTimeBounds` since 2026-10-15
    ([0093](decisions/0093-a-bound-of-the-fields-own-type-reaches-it-through-the-limit-key.md)):
    Angular 22.2's `min()` takes numbers, and the compiler refuses `min` beside `[formField]`
  - the round trip over 0086's 38 locales is read in three engines
    (`apps/sandbox-e2e/src/time.spec.ts`), and `/time` carries 12-hour and 24-hour fields
  - both cards filled in, the readers' log among their rows

- [x] **1.4 — datetime field** in `@pacit/components/datetime` — **closed 2026-10-12**
  - the value `PctDateTime` with its arithmetic on the pair, enforced as
    [`req-api-datetime`](requirements/api.md#req-api-datetime); the field `PctDatetime` with the
    tier `--pct-datetime-*` and four `PCT_TEXTS` keys; `./datetime` is 78 KB, the date's and the
    time's barrels inside it
  - `PctTimeColumns` took `timeDisabled` and `PctCalendar` `startAt`, the two inputs 0090 named;
    the chrome hands its label's id to a control the label points at, for the two texts' names
  - the panel in three engines and the three readers on it — the grid's Escape on `/datetime`,
    a column's on `/time`, the same listbox (4.82, closed: two under NVDA)
  - a signal form gives the field its bounds through `pctDateTimeBounds` since 2026-10-15 (0093,
    amended), and none where its rules meet in no datetime

- [x] **1.5 — warnings on a field: `req-api-warning`**, landed 2026-10-07 as
      [0087](decisions/0087-a-warning-is-a-verdict-without-a-veto.md) decided them, amended
      four times on the way — `pctWarn` and `PCT_WARNINGS` in `./core`, the third branch in
      the chrome and in six footers, `warnings` on every control
  - the probe's seven cases are `core/src/warnings.spec.ts`, and one of them turned out to
    measure the platform rather than the record: a shadow's injector outlives its item
  - ten tokens, each in the contrast policy; `./field` +8.1 KB, `./radio`, `./slider` and
    `./switch` the same for the icon chunk; the two keys under `@__PURE__`, or every
    entrypoint carried `form()` ([`lesson-253`](lessons.md#lesson-253))
  - the AT walk on `/field` is dispatched after the merge, and its record lands with the
    next pass

- [x] **1.6 — the wheel** `PctWheel<T>` in `@pacit/components/wheel` — **closed 2026-11-10**
  - a listbox on the platform's scroll, the row under the line the value, as
    [0089](decisions/0089-one-value-more-than-one-control-and-the-consumer-chooses.md) decided;
    a ring's runway is the cycle three times in the tree, `scroll-snap-stop: normal`
    ([0091](decisions/0091-the-rings-runway-is-the-cycle-three-times-in-the-tree.md))
  - a settle a gesture started writes, the opening and `null` write nothing; `[formField]`,
    `warnings`, `compareWith`, `wrap`, an odd row count; `pctScrollBehavior` in `./core`;
    21 tokens and ten contrast pairs, no text key of its own
  - ended with: the card [`wheel.md`](components/wheel.md), the sandbox in three engines,
    the `/states` view, the readers' walk of `/wheel` with its keys pressed
  - left out: the drum (rows turned by their distance to the line), a variant to measure
    where scroll-driven animations are; the select's long list is not this runway's consumer

- [x] **1.7 — the time panel's shape** — **closed 2026-11-10**: `picker` (`'list' | 'wheel'`,
      default `'list'`) on `PctTime`, `PctDatetime` and `PctTimeColumns`
  - the `wheel` shape is a `PctWheel` per field, the bounds its refused rows, and a ring
    where the column fills its window; the keys, the step and `timePicked` are the columns'
    in both shapes, and the wheel takes `startAt` for the row an empty column opens on
  - the window is a count: `rows` on the columns, seven by default, in both shapes; the
    `list` shape snaps to a row's start and keeps the walk on the middle
  - `--pct-time-column-height` shipped in 0.3.0, which the plan did not know: deprecated
    and still honoured where a skin wrote it, not retired (0089, amended)
  - ended with: the three cards with their new rows, two demos on the site, the `/time` and
    `/datetime` baselines moved, `time-columns.ts` and `wheel.ts` mutated narrowly, and the
    three readers on the `wheel` shape

- [x] **1.8 — numbers and instants in `./core`** — **closed 2026-10-29**
  - `pctQuantityFormat`: the platform's unit where it knows one, a symbol after a no-break
    space where it does not, the fraction digits as one number or a pair
  - `PctInstant`, `pctWallClockOf` and `pctInstantOf`, the road between an instant and a wall
    clock in a zone, a skipped or repeated hour resolved by Temporal's three names; and
    `pctRelativeFormat`, which picks the unit the platform leaves to the caller
  - writing an instant in full stays `Intl.DateTimeFormat` with `timeZone`: a wrapper would
    be a second name for the same call
  - three suites, one of them a sweep over seven zones; 177 mutants, every one killed

- [x] **1.2 — the table** in `@pacit/components/table` — **closed 2026-11-10**
  - two layers drawn by who writes the rows, both under MIT: `table[pctTable]`
    ([0096](decisions/0096-a-table-is-the-consumers-markup-or-the-librarys-rows.md)) and one typed
    engine, `pct-data-table`, that grows into a grid by directives
    ([0097](decisions/0097-a-data-table-is-a-typed-engine-under-the-first-layer-and-grows-into-a-grid-by-directives.md))
  - v1 and fifteen phases after it, each its own pull request: the window to a million rows, the
    server's pages, blocks, tree and groups, column filters and layout, the grid, editing, the
    clipboard and the exports, the tree, header groups, pinned rows, the row menu
  - both cards, `/datatable` in three engines, and the readers' walk of 2026-11-10 in ten of its
    demos: a branch's button heard without its row by Orca and VoiceOver now carries it
  - a window over columns waits for a consumer with hundreds of them, as 0097 accepted

- [x] **1.9 — the card** `pct-card` in `@pacit/components/card` — **closed 2026-11-02**
  - a header of an icon, the title with its subtitle and actions, a body, and a footer of a
    note and actions that stays down in a row of equal heights; a region with nothing in it
    takes no room
  - `loading` draws the skeleton and marks the card busy, `error` its message with the danger
    icon, `muted` the disabled surface with the muted text — the disabled text measured under
    AA in both skins — and no `opacity`
  - one link by the title, stretched over the card, the controls standing over it, as
    [0109](decisions/0109-a-card-is-one-link-by-its-title-and-its-controls-stand-over-it.md)
    chose it in three engines over a forwarded click and a raised body
  - the card filled in, `/card` in three engines, and the readers' walk of 2026-11-02: Orca
    reached the link and the controls, NVDA the same without the word link, VoiceOver the switch alone

- [x] **1.10 — an application's frame** in `./topbar`, `./nav`, `./description` — **closed 2026-11-02**
  - a bar of a start, the title and an end on the consumer's `<header>`; a list in the
    consumer's `<nav>`, the current screen the `aria-current` the router writes, drawn three
    ways; `<dl>` pairs that write their own `<dt>` and `<dd>`s, a control named by its term
  - no shell and no breakpoint
    ([0110](decisions/0110-a-frame-is-three-parts-the-application-arranges.md)): the
    application moves the navigation into the drawer at its own width
  - three cards, `/frame` in three engines, wide and narrow, and the readers' walk of
    2026-11-02: Orca and NVDA the landmark and the current screen, Orca the switch by its
    term, VoiceOver the bar's button alone

- [~] **1.11 — charts** in `@pacit/components/chart` — a scene and the marks it draws, on one
  core of pure functions and no dependency ([0099](decisions/0099-a-chart-is-scales-the-marks-share-and-a-ready-chart-is-a-recipe.md)–[0103](decisions/0103-a-chart-is-a-named-picture-and-its-cursor-is-the-platforms-range.md),
  decided 2026-10-29 on eight probes, five of them in three engines)
  - the core (2026-10-29) and the scene with a line, its axes by unit, its table and its card
    (2026-10-30): scales, 1-2-5 ticks, time ticks in a named zone across a change of clocks,
    the window's transform, the value at a position, decimation to the pixel, paths, layout
  - landed 2026-10-30: the cursor as the platform's range, moved from reading to reading by the
    pointer, the keys and a reader, with a tooltip; the window by a drag, a pinch, the wheel and
    the keys through one transform, `follow`, the zoom bar as their twin, `pctChartSync`; the
    legend and each series' swatch drawn by its mark (0102); bars in bands of an interval or a
    category, grouped, stacked, a period compared, a selected band, a picked row; the chart
    turned on its side; the annotations — a reference line, a band, a note, the moment of now, a
    line cut by its thresholds — read in the description; a band of states in a lane (0104);
    points and bubbles picked by distance, a zoom on both axes, a log axis of decades (0105);
    areas on a stack or as shares, a monotone curve the tooltip reads too, a histogram recipe,
    a range band and candles, boxes with whiskers and outliers (0106); a heatmap on rows the
    scene lays (0113); a pie of shares and a donut, a gauge as a meter drawn on an arc (0115);
    a sparkline with no scene (0117); a brush (0119); an export, a description, a print (0120);
    live data read where it changed, a recount eased (0121); a canvas layer only if measured (0100)
  - ends with: every mark's card, the sandbox in three engines, the readers' walk of the cursor

## 3. Publication

**Split on 2026-08-31, by the maintainer's own reopening of the question.** The push and the
premiere were one moment here, and the fear that held them both — a first look landing on a
repository with no documentation — belongs only to the second: an unannounced private
repository has no first look. So the quiet half moved to the front and landed on 2026-09-01;
the flip followed on 2026-09-15, npm on 2026-09-17 after **3.5** and a sentence, and the
proof of the staged path on 2026-09-25.

- [x] **3.1 — the premiere: the flip to public, npm, and `req-project-latest` superseded** —
      **closed 2026-09-17: `@pacit/components@0.1.0` is on npm**
  - the flip 2026-09-15; the publish 2026-09-17 on the maintainer's word, after a dry run in
    CI on the same head: `0.1.0` from the commits, provenance attested, `PCT_VERSION` in the
    published code equal to the tag — read back from the tarball, not from the log
  - what only the real run could show: the release commit carried the changelog alone, the
    manifest and the stamp left in the runner's checkout ([`lesson-220`](lessons.md#lesson-220));
    repaired by hand under the tag, and `release.mjs` stages both from now on
  - `req-project-latest` is superseded by the matrix and `check-support`, as its Binds at
    said; the token lived one run — a stage-only trusted publisher since the same afternoon,
    so `release.yml` stages on npm and the maintainer approves with 2FA (0079, amended)
  - cost: the night of 2026-09-16 and the morning after · _notes:_ —

- [x] **3.2 — citations in the public API as links** — **closed 2026-09-16**
  - concerns: [`req-project-language`](requirements/project.md#req-project-language)
  - the language half closed first: the 24 files of the built package that carried Polish
    measure zero. The link half was larger than the count said — 187 links by repository path
    and 23 bare identifiers in the `.d.ts`, nobody's file and a word in a consumer's tree
  - `libs/components/link-citations.mjs` rewrites them onto the site after the build, the
    origin from `public/CNAME` (0078); `check-package` point 9 reads the artefact for what
    escaped — a path, a word, a foreign host, or nothing at all — and three prepared packages
    prove it fires. The sources keep the paths an editor can follow;
    `req-release-metadata` carries the promise, and the site's own evidence links gained the
    host's slash on the way
  - cost: 0.5 day · _notes:_ —

- [x] **3.3 — the release reads CI's colour before it trusts it** — **closed 2026-09-17**
  - `release.yml`'s only guard was the ref check: a dispatch against a red or still-running
    `main` published anyway, and the release path re-runs only the build and the package gate
  - what landed: a step before `tools/release.mjs` reads the `CI` run of `GITHUB_SHA` off the
    API and exits 1 unless it is `completed success`; `actions: read` joined the permissions
  - **both readings taken the same morning**: a dry run dispatched while CI still ran on
    `20e8707` was refused (`in_progress null`, exit 1); the same dispatch after that run went
    green passed — 0.1.0 resolved from the commits, the entry rendered, stopped at "would
    publish". A dry run is held to it too: a rehearsal against a red tree rehearses nothing
  - not taken: CI as a reusable workflow with `needs:` — a rebuild of `ci.yml` nobody needs

- [x] **3.4 — the premiere is a task, not an event** — **closed 2026-09-17**
  - [0016](decisions/0016-mit-irreversibility.md) defers its biggest decision to "data that
    does not exist today", and no task acquired the users who would produce it: `.github/`
    held workflows and nothing else, and nowhere said where a question goes
  - what landed: issue forms asking for the promise broken or the promise to keep, a
    `config.yml` sending questions to Discussions and vulnerabilities to the private channel,
    a PR template asking which gates ran, `SECURITY.md`, `CONTRIBUTING.md` with the way to
    run the gates; Discussions, private reporting and About switched on by the maintainer
  - **the venue, decided 2026-09-17, its date revised 2026-09-25**: no announcement yet —
    around `0.8.0`, on a sentence, with much to fix and add first; it no longer waits for
    the table (1.2): the data 0016 waits for comes with the announcement. Channels and reason
    stand in [0075](decisions/0075-the-push-and-the-premiere-are-two-moments.md), amended

- [x] **3.5 — the site at its own address, deployed behind a green CI** — **live 2026-09-17**
  - concerns: [`req-project-apps`](requirements/project.md#req-project-apps) · decided in
    [0078](decisions/0078-the-site-has-an-address-and-deploys-behind-a-green-ci.md)
  - `pages.yml` on `workflow_run` after a green `CI`; the origin stated once in `public/CNAME`
    and derived into canonical, `og:*`, `sitemap.xml`, `robots.txt`; a `not-found` page
    prerendered under `/404` and served as the host's `404.html`. `routes.spec` holds every
    route to its address, 261 cases over three engines
  - **read off the live host after the first dispatch**: `/` 200 under a Let's Encrypt
    certificate for the domain, `/start` 301 → `/start/` 200, an unknown path **404** with
    `noindex`, 41 addresses in the map, `pacit.github.io/components/` 301 to the domain, HTTP
    301 to HTTPS. What is still the maintainer's: the apex on the hosting, Search Console
  - cost: 1 day · _notes:_ —

- [x] **3.6 — the public surface says since when, per API and not per component** — **closed 2026-09-17**
  - concerns: [`req-release-since`](requirements/release.md#req-release-since)
  - the source is the JSDoc at the declaration: `@since 0.1.0` on the 514 inputs, models,
    outputs and entry-point exports that shipped, `@since next` on what `main` gets from now
    on — a word, not a guess, because at `0.x` the next number is unknowable until the release
    counts the commits; `stamp-version.mjs` names it on the release run, before the build
  - the site compares `@since` with the MANIFEST — in every checkout where a tag is not — and
    marks `unreleased` per row with a legend per page; the shipped `.d.ts` carry the tag too.
    `check-since` holds every item to it; `check-package` point 10 refuses an unstamped release
  - parts are left out with reason — markup, not a declaration; a since column in the card
    would be a second home (0017). The 74 public methods, refused at first as plumbing between
    a component and its parts, were dated the morning after on the maintainer's word

## 4. Open findings

Small, good filler between the bigger items. Each is verified in the code and still current,
and every one is held by a **binds at** rather than by anybody's mood.

- [x] **4.58 — the suite has a flake rate and nothing has ever measured it** — **closed 2026-09-18**
  - the race-shape rule bought the _shape_ of a race, greppable, and refused the repetition; the
    gate that measures it (`check-flake`, five points) landed 2026-09-16 with two nightly jobs,
    one suite per runner, `--repeat-each 3` and retries off — a retry is what hides a wobble
  - three readings found the instrument before the rate: the unanimous column (2026-09-16), a
    typo in a run number, and six `docs-e2e` cases failing every repetition — a failure and not
    a wobble, as point 3 is written to say, fixed the same day ([`lesson-221`](lessons.md#lesson-221))
  - the fourth, dispatched 2026-09-17 (run 35279012559): **2532 cases × 3 = 7596 runs, one
    wobbled (0.04%)** — `docs/flake.snapshot.md` is the record, and the one name in it is 4.74

- [x] **4.71 — the walk reads what a view SAYS on arrival, and nothing about what opens** — **closed 2026-09-28**
  - nine acts (`at/acts.ts`), one per view with something to open, read by all three readers on
    runners (`at-pass.yml`, run 36388327497): a modal, a menu, a popover, a toast, a month grid,
    a tab panel, a listbox, a docked region, a disclosure. Same walk, same record shape; every
    `open` row is the first announcement after the thing appears, and fourteen cards were re-read
  - two of the nine cited a spec that never pressed the control ([`lesson-244`](lessons.md#lesson-244)),
    and NVDA opened nothing where the walk had Tabbed out of the page ([`lesson-245`](lessons.md#lesson-245));
    point 7 of `check-acr` resolves the owner and demands the act in every log, two prepared inputs
  - the reading raised 4.1.2 to Supports, and what it left open is 4.78. The say-all pass stays
    refused, as written

- [x] **4.79 — firefox 155 shipped two features a fallback was kept for, and one case noticed** — **closed 2026-10-03**
  - the bump to Playwright 1.63 (PR #48) brought firefox 155, and with it `field-sizing: content`
    and `Intl.Locale.prototype.getWeekInfo` — probed true in all three engines
  - both fallbacks stay: Angular 22 supports firefox 112–152, and 151 had neither feature
    ([0084](decisions/0084-a-fallback-stays-while-angular-supports-an-engine-without-the-feature.md)).
    Each is forced in every engine by an init script — the textarea suite runs twice, the
    Japanese and Polish grids are drawn with `getWeekInfo` deleted — and the controls
    `req-api-platform` records bite again, per engine instead of on firefox alone
  - the forced textarea road found what the suite never listened for: a height written inside the
    resize observer's callback, which every engine reports as an error event Playwright's
    `pageerror` does not hear. The measurement waits a frame now, and every case reads the
    page's own `error` events

- [x] **4.80 — two sentences about `PctDate` that no measurement holds** — **closed 2026-10-05**
  - it bound at 1.3's move of the digits out of `date/src/locale.ts`, as written. The class
    comment of `PctDate`, which ships in the package's `.d.ts`, and the comment over the first
    case of `apps/sandbox-e2e/src/date.spec.ts` now say what
    [0086](decisions/0086-a-time-of-day-is-a-wall-clock.md) measured: the browser's interface
    language in chromium, firefox's own, the browser's locale in webkit, and `lang` in none
  - the sentence that `[formField]` fills `min` and `max` went rather than wait for a case:
    Angular 22.2's `min()` and `max()` take numbers, and the rule a string bound would need is
    measured with the time field, which ships it with a case or not at all

- [x] **4.84 — the readers' log quotes the data table's Polish** — **closed 2026-11-10**
  - `/datatable`'s tables that wrote Polish relative times write French ones, the third
    language a record may quote; the walk of 2026-11-10 read the frames and quoted none

- [ ] **4.83 — an `<ng-template>` stamped in two places is read as standing in one**
  - `check-aria` points 4 and 6 read an `@for` body as repeating and a template as standing
    once. Five are named by two outlets: the calendar's and the pagination's chevron side by
    side, the select's arrow on two branches of one `@if`, the select's option rows under an
    `@for`, and the dialog's body below. The first four hold no carrier of the consumer's name
    and no message part, which is why nothing reads wrong yet (2026-10-13)
  - the reading this was opened with — count the outlets naming the `#ref` — misjudges the
    three templates that carry the name in two places: the dialog's, the menu's and the
    popover's panel, stamped by an outlet under `@if (inline() && open())` AND by the class,
    directly or through `#panel`, which no reading of the template sees. Counted, the menu and
    the popover stand once and the dialog's body twice, apart by the class alone; a sound
    reading says "cannot judge" of all three, red on correct components until a list of
    exceptions stands — and that list is where the defect would pass
  - the sound piece — an outlet under an `@for` stamps per item — guards nothing the library
    has: in the select's shape a focusable carrier or a message added to the rows is refused
    already, against the trigger or the lines outside. `slot.template` stays unread
  - the same class, 2026-10-17: a structural directive's template, read in place here too, and a
    component's projection; `check-icons` refuses the first below an icon (#117), leaves the second open
  - binds at: **the first carrier or message part in a template stamped more than once at a
    time** — by an outlet under an `@for`, or by two side by side — beyond the three panels

- [ ] **4.75 — one name, several declarations, and only the first date is read**
  - a name TypeScript lets several declarations carry — a class merged with an interface, an
    overload set — is one item to `check-since`, and its `@since` is the first one written:
    `methodsIn` merges with `??=`, `exportsIn` with `find(Boolean)`. A shipped function that
    gains an overload dated `@since next` therefore still reads `0.1.0`, and the site's
    `unreleased` mark never fires for the signature the published package does not have
  - the opposite reading is no better: a name the library shipped would be marked unreleased
    because one of its signatures is new. What the item cannot say is that a name is partly
    both, and that is the thing to decide — a second item per differing date, or a point that
    refuses the disagreement and makes the author split the declaration
  - found by the third review of the gate's own repair, 2026-09-18; no exported overload and no
    merged name exists in the library today, which is why nothing reads wrong yet
  - binds at: **the first exported name with two declarations dated differently**

- [x] **4.78 — Orca says nothing when the modal takes focus** — **closed 2026-11-13**
  - the `open` row of `/dialog` was a silence for Orca on the desk (2026-09-17) and the runner
    (2026-09-28, 2026-10-02), with focus on the close button, where NVDA and VoiceOver named
    the dialog; three suspects — `showModal()`, the inert page, focus moved before the draw
  - read again at the dialog card's reading: Orca has spoken on that row in every one of the 27
    logs since 2026-10-08 — `Project settings`, the description, `Close · button` — on the same
    Orca 50.2, and nothing in the dialog, the modal background or the walk's act changed
    between the last silence and the first reading. The cause is not established; the
    suspects stay unmeasured, and the card records what each reader says, the role Orca leaves
    out included

- [x] **4.81 — the warning line is not heard on the stop it appears** — **closed 2026-11-13**
  - the pass of 2026-10-08 (run 37733848017) and every weekly pass after it: NVDA and VoiceOver
    read the amount and the phone, and neither heard the `status` line that enters the DOM as
    the amount is left — a polite region entering with its text is one no reader registered
  - a probe of four lines appearing as Tab leaves a field (`probe/warning-4.81`, run
    43402848075): the `status` entering with its text, heard by none; a `status`
    standing before its text and the polite channel of `PctAnnouncer`, each heard by NVDA and
    VoiceOver; an `alert`, the control, by all three. Orca heard neither polite shape on the turn
  - the channel, since a standing region is a second row under `check-aria` point 6 or a region
    per field: `pctFieldMessages` says the line while it is lit and takes it back as it goes
    out, for every control that draws one. 0087 and 0026 carry the amendment

- [x] **4.82 — the time panel takes two Escapes under NVDA** — **closed 2026-11-13**
  - the pass of 2026-10-08 (run 37795534533): NVDA's first Escape left `/time`'s panel open
    where the same walk closed the date's, the menu and the popover — a `role="listbox"` puts
    NVDA in focus mode, and focus mode keeps the first Escape. The 1.7 pass read it again
  - measured on a probe of three panels closed by Escape (`probe/escape-4.82`, run
    43398981776): a listbox focused itself (E1, the columns), one with its option focused by a
    roving `tabindex` (0086's E2), and a grid with its cell focused, the date's shape, as the
    control. NVDA kept the first Escape on both listboxes and let the grid's through; Orca and
    VoiceOver closed all three on one. Both built panels reproduced, so E2 saves nothing
  - the columns stay a listbox: a grid of one column says `table` where a list of hours is what
    there is, to save one key NVDA's users press on every listbox in focus mode. The three
    cards say it under their limits, and 0090 §4 the reading

- [x] **4.74 — one case in 2532 wobbled, and a sample of three is not its rate** — **closed 2026-09-27**
  - the first flake record (4.58) named one case, the list panel of `forced-colors.spec.ts` on
    chromium, 2 of 3. It bound the next night — 2026-09-18, run 35319850439, 2 of 3 again — and
    the second name, `slider.spec.ts` (2026-09-22, run 35701669075), was read first
    ([`lesson-241`](lessons.md#lesson-241)); the thirteen nightly reports from 35279012559 to
    36306161890, read on 2026-09-27, put this one at 16 of 39 chromium repetitions
  - the reading: `ArrowDown` moves the cursor in its own task and the attribute follows a change
    detection later; the count of one before the read was true BEFORE the key, since an answered
    list opens on its answer, and a one-shot `styleOf` is two round trips — the answer's row
    resolved, then read once it had lost the cursor. Held 400 ms it passes, every read preceding
    the move; held 30 ms 2 of 5 go red and 45 ms 4 of 5, in CI's own two messages. It polls the
    outline on the row the cursor moved TO; no second copy; the name stays; nightlies read the rate

- [ ] **4.76 — the dev server that never bound, and where in the start it stopped**
  - run `35408508618` lost two shards of six to a web-server timeout of 240 000 ms, both on
    `sandbox-e2e:e2e`, both with no server output at all; re-running the two passed them, and
    24 shard-jobs before them never hit it (0081, "What this costs us")
  - the silence on stderr is itself a reading, and a narrower one than the first taken: a shard
    of the same run that PASSED printed 47 project-graph warnings from that server in its first
    seconds, and the two that failed printed none. The stall was therefore before nx read the
    workspace out, nowhere near the build, and no ceiling addresses it
  - ruled out by measurement — nx's project-graph lock, which announces a blocked nested `nx`
    on stderr after 30 seconds. Reproduces the shape exactly — nx's `workspace-data` database
    lock, under which a nested `nx` hangs mute and for ever; but a real outer run takes that
    one only in bursts shorter than a 100 ms sample, so it is a shape and not yet a cause
    ([`lesson-231`](lessons.md#lesson-231))
  - what landed is the instrument and not the answer: both suites pipe stdout, and
    `scripts/serve-for-e2e` ticks on stderr while nothing is being printed, so the next one
    sorts itself into one of three shapes. A larger ceiling stays refused
  - binds at: **the next shard that times out on a web server** — the tick standing above its
    last line of output is the reading this position waits for

- [x] **4.77 — a position can leave the prose budget by wrapping a code span** — **closed 2026-09-28**
  - `tools/check-prose.mjs` ended a position's body at the first line in column 0, and prettier
    prints a code span's content unindented, so the continuation of a wrapped one lands there:
    4.76 was recorded at 2 lines against its real 18 until the line was reworded, the budget
    binding nothing and the record holding a number about the wrong text
  - the body is read by indentation now, and a line in column 0 is still the position's when it
    continues a code span, as the parser prettier formats the plan with reads it, not a second
    lexer of backticks ([`lesson-236`](lessons.md#lesson-236)). Any other line in column 0 the
    parser keeps inside the position — prettier moves a wrapped link title there too — is
    refused on point 1 rather than dropped; the next position ends the body at any indent
  - twenty-one prepared inputs go through the reader itself. Measured again, the plan does not
    move: no position wraps a span today

- [x] **4.73 — the reader pass was never isolated, and the record said it was** — **closed 2026-09-17**
  - GTK reads `WAYLAND_DISPLAY` before `DISPLAY`: the browser opened on the maintainer's desktop
    while Xvfb drew nothing — found by him, proved by his theme switch mid-reading. The X11
    repair measured **7 utterances against 1969** and was refused: it worked BECAUSE not isolated
  - closed by a headless GNOME Shell of the pass's own (installed all along, GNOME 47+), a
    keyboard given to its seat through mutter's remote-desktop interface — a seat without one
    tells no window it has focus, and Orca never leaves its default script — and a private,
    muted speech server; the record's surface is SAMPLED off `ss(8)` ([`lesson-224`](lessons.md#lesson-224))
  - the first isolated reading: **509 steps over 36 views, 6 silent, 11 capped** in 22 minutes,
    against 482/0/11 on the desktop; the silences are four Escapes that closed nothing, the
    modal's opening and one arrival through a covered nav ([`lesson-225`](lessons.md#lesson-225)).
    The night after, a runner read the same view to the utterance (`at-pass.yml`, [`lesson-227`](lessons.md#lesson-227))

- [x] **4.72 — a gate went red inside a run GitHub reported green** — **closed 2026-09-17**
  - CI run `35104356828` on `6491aef` concluded **success** with `❌ check-typecheck` inside its
    one step, no `NX … failed` line and no `Failed tasks:` list. Read over every completed run
    since 2026-09-15: silent exactly when `sandbox-e2e:e2e` ended the step — nine of nine — and
    hiding `check-bench` ×6, the sandbox suite ×2, one typecheck, one consumer flake, and the
    publish guard's reading of `1da5fb0` ([`lesson-222`](lessons.md#lesson-222))
  - what closed it: every verdict-carrying `nx` line in both workflows went through
    `scripts/nx-verdict`, which fails a run that ends without nx's summary, and the sandbox
    suite stopped depending on the continuous `sandbox:serve`. Read on `fcfe5b6` (red, the
    list printed) and `3be54c2` (green, the summary printed). 2026-09-18 named the silence,
    not the green: Node drops a pipe's buffered output at `process.exit()`, which nx calls,
    so a fast all-cached run lost its summary too; nx RUNS into a file now ([`lesson-228`](lessons.md#lesson-228))
