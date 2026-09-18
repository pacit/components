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
| requirements                                |    94 |
| ✅ enforced                                 |    79 |
| 🟡 partial (deliberately without a control) |    15 |
| ⛔ gap                                      |     0 |

No gap is left. If adding a requirement raises the gap count and no task changes, this list
has stopped being complete, and that is a fault of this list, not of the registry.

## Order

```
0  the copy off this machine  DONE — landed 2026-09-01
1  components             1.2 only, deferred by 0016 rather than scheduled
2  trust surface          DONE — the site is built; its address is 3.5
3  publication            DONE — 0.1.0 on npm 2026-09-17; 3.6 stands past the tag
2  open findings          small, good filler between the bigger items
5  gaps with no deadline  DONE — the last trigger fired on 2026-09-14
```

## Where things stand

**The push and the premiere were two moments**
([0075](decisions/0075-the-push-and-the-premiere-are-two-moments.md)), and both have passed:
the quiet push on 2026-09-01, the flip to public on 2026-09-15, the site at its address and
`@pacit/components@0.1.0` on npm on 2026-09-17, the last on the maintainer's sentence. What
the premiere still owes is **3.6**, which binds at the first commit after the tag, and one
proof: the first version staged by the trusted publisher and approved by hand.

**The decisions the premiere was waiting for fell on 2026-09-16**, and they stand where
decisions live: the site's address, host and deploy trigger in
[0078](decisions/0078-the-site-has-an-address-and-deploys-behind-a-green-ci.md); the first
version, the shape of its CHANGELOG, the fate of the history and the order in which a token
gives way to trusted publishing in
[0079](decisions/0079-the-first-release-is-a-measurement-and-the-history-stays.md). This file
holds only the order.

**What is left.** Section 1 ends at the table (**1.2**), deferred by
[0016](decisions/0016-mit-irreversibility.md) rather than scheduled. Section 3 holds **3.6**.
Section 4 holds two findings, each held by a **binds at** rather than by anybody's mood.

## 1. Components

Ordered by architectural debt, not by popularity — with one reservation from
[decision 0016](decisions/0016-mit-irreversibility.md): the item with the highest build cost
goes **last**, because a release under MIT is irreversible and it is better settled with users
in hand. A library is allowed to grow in public, and a repository that moves is its own
argument to a first visitor.

Every new component fills in [`components/_template.md`](components/_template.md) — the DoD
form exists and is a condition of entering a release. Thirty-four cards are filled in.

- [ ] **1.2 — table / datagrid** on a headless core (column model, sorting, filtering, grouping,
      selection as signals) separated from rendering. **The last item of the phase** — the only
      one counted in months rather than days; until the decision in
      [0016](decisions/0016-mit-irreversibility.md) is made it does not exist as a commit either,
      because the root `LICENSE` covers the whole repository

## 3. Publication

**Split on 2026-08-31, by the maintainer's own reopening of the question.** The push and the
premiere were one moment here, and the fear that held them both — a first look landing on a
repository with no documentation — belongs only to the second: an unannounced private
repository has no first look. So the quiet half moved to the front and landed on 2026-09-01;
the flip followed on 2026-09-15, and npm waits for **3.5** and a sentence.

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
  - **the venue, decided**: no announcement at `0.1.0`. The library is announced when it
    stands closer to 1.0 — the table (1.2) in hand — and the order on record for that day is
    a write-up (dev.to) → r/Angular → LinkedIn → X, Show HN last. Until then the site and
    npm are findable, not advertised; the data 0016 waits for comes with that announcement

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
  - left out with reason: methods (66 public ones, most of them the plumbing between a
    component and its parts; a method is API when a card's contract names it) and parts
    (markup, not a declaration — a since column in the card would be a second home, 0017)

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

- [ ] **4.71 — the walk reads what a view SAYS on arrival, and nothing about what opens**
      — **the word is given 2026-09-16: build it, and build it narrow**
  - seven cards ask what a reader announces when something opens — a modal, a menu, a popover,
    a toast, a month grid, a revealed tab panel, a select list — and the answer for all seven
    is the same: the walk presses Tab and nothing else, so no panel in the three logs was ever
    opened. 2.2 closed with that stated rather than blurred
  - it is also why **4.1.2 stays `Partially Supports`** with the pass recorded: what the walk
    answers it answers well, and the half it cannot reach is the half a modal lives in
  - **why it is worth paying for**: for a tree, arrival is most of the story; for a dialog it
    is none of it. Opening IS the component in all seven, so the record as it stands answers a
    question nobody asked of them, and no rewording of the remark repairs that
  - **the scope**: one act per component, the gesture its own e2e spec already presses, read
    by the same three readers into the same record shape. Not a longer walk, not a framework
  - **refused — the say-all pass**: a `progressbar`, a badge and a skeleton take no focus, so
    a Tab walk cannot tell their silence from their absence. But three readers' say-all
    outputs answer three different questions, and this record's whole worth is that all three
    answer one. Those cards owe a sentence about the component instead of a fourth instrument
  - binds at: **the act table**, which is where 0017 bites — the key that opens a menu must not
    take a second home here, so the table cites the spec that owns it rather than restating it

- [ ] **4.74 — one case in 2532 wobbled, and a sample of three is not its rate**
  - the first flake record (4.58) names one case, in `forced-colors.spec.ts` on chromium, 2 of
    3: the list panel whose selection and keyboard cursor must stay distinguishable — a visual
    assertion under `forced-colors: active`, read under the suite's own parallelism
  - a name in the record is a known wobble and not a finding to the gate, by design: repetitions
    are a sample, and one wobble in three says the case is not stable, not how unstable it is
  - binds at: **the second record in which it wobbles**, or the first in which a second name
    joins it — either is the moment to read the case rather than the rate

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
  - what closed it: every task-running `nx` line in both workflows ends in `|& scripts/nx-verdict`,
    which fails a run that ends without nx's summary — a mute run cannot be green again, whatever
    the mechanism — and the sandbox suite no longer depends on the continuous `sandbox:serve`,
    the one task of that kind and the suspect. Read on `fcfe5b6` (red, the list printed) and
    `3be54c2` (green, the summary printed), both suites in each; the docs suite ended both runs,
    so the suspect's removal is read by the suite's presence, not by its position
