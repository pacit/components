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
| ✅ enforced                                 |    78 |
| 🟡 partial (deliberately without a control) |    16 |
| ⛔ gap                                      |     0 |

No gap is left. If adding a requirement raises the gap count and no task changes, this list
has stopped being complete, and that is a fault of this list, not of the registry.

## Order

```
0  the copy off this machine  DONE — landed 2026-09-01
1  components             1.2 only, deferred by 0016 rather than scheduled
2  trust surface          DONE — the site is built; its address is 3.5
3  publication            the premiere: 3.2, 3.3, 3.5 done; 3.4 waits on the maintainer's
                          switches; 3.1 on a token and a sentence; 3.6 past the tag
4  open findings          small, good filler between the bigger items
5  gaps with no deadline  DONE — the last trigger fired on 2026-09-14
```

## Where things stand

**The push and the premiere are two moments**
([0075](decisions/0075-the-push-and-the-premiere-are-two-moments.md)). The quiet push landed
on 2026-09-01, the flip to public on 2026-09-15, and the site went live at its address on
2026-09-17, and the release rehearsed in CI the same morning; npm waits for the maintainer's
two switches (**3.4**), a token, and an explicit sentence. No run turning green starts it, and standing next in this list is not a
start either — a session that reaches **3.1** passes over it and takes the next item.

**The decisions the premiere was waiting for fell on 2026-09-16**, and they stand where
decisions live: the site's address, host and deploy trigger in
[0078](decisions/0078-the-site-has-an-address-and-deploys-behind-a-green-ci.md); the first
version, the shape of its CHANGELOG, the fate of the history and the order in which a token
gives way to trusted publishing in
[0079](decisions/0079-the-first-release-is-a-measurement-and-the-history-stays.md). This file
holds only the order.

**What is left.** Section 1 ends at the table (**1.2**), deferred by
[0016](decisions/0016-mit-irreversibility.md) rather than scheduled. Section 3 is the
premiere. Section 4 holds four findings, each held by a **binds at** rather than by anybody's
mood.

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

- [~] **3.1 — the premiere: the flip to public, npm, and `req-project-latest` superseded**
  — **the flip is done, 2026-09-15; the publish waits on 3.4's switches, a token, and a sentence**
  - **the flip.** `pacit/components` is public: no secret across 404 commits, every README
    link answering 200, and 404 commits under a public author address for good
  - **the publish was refused the same day**, the rehearsal green end to end (690.6 kB, 114
    files). What it waits for was settled 2026-09-16 in
    [0079](decisions/0079-the-first-release-is-a-measurement-and-the-history-stays.md): the
    version is **0.1.0**, the CHANGELOG entry is a measurement rendered by
    `tools/changelog-renderer.mjs` rather than ~150 commit titles, and the history stays
  - the rehearsal's 0.0.2 was Nx reading a commit's scope as a project name and counting
    `fix(chips)!` as a patch (`useCommitScope`, off since 2026-09-17); measured, and the dry
    run now resolves 0.1.0 from the sixteen `!` commits on its own
  - **trusted publishing comes a minute after the first publish, not before** — npm keeps it
    in the package's settings, and the package exists once published. A granular token with
    2FA bypass, seven days, one run; then the publisher, and the token, the secret and
    `NODE_AUTH_TOKEN` in `release.yml` gone. Bypass tokens lose publish around 2027-01
  - a dry run writes no manifest, so `stamp-version` reads the OLD version
    ([`lesson-41`](lessons.md#lesson-41)); `PCT_VERSION` in the published package is the reading
  - the tag supersedes `req-project-latest` with the compatibility matrix and its gate, as its
    **Binds at** says; that is the last edit of this position. The trigger stays a sentence

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

- [~] **3.4 — the premiere is a task, not an event** — **the files landed 2026-09-17, the
  switches are on; the venue is the maintainer's**
  - [0016](decisions/0016-mit-irreversibility.md) defers its biggest decision to "data that
    does not exist today", and no task acquired the users who would produce it: `.github/`
    held workflows and nothing else, `CONTRIBUTING.md` had two sections and no way to run
    the gates, and nowhere said where a question goes
  - **what landed**: issue forms (`bug`, `proposal`) that ask for the promise broken or the
    promise to keep, a `config.yml` refusing blank issues and sending questions to Discussions
    and vulnerabilities to the private channel, a PR template asking which gates ran,
    `SECURITY.md`, `CONTRIBUTING.md` with `scripts/with-node`, the line CI runs, the two gates
    the habit omits ([`lesson-188`](lessons.md#lesson-188)) and `apps/docs` on 4300; the README
    names the channels. Each file is read by GitHub by its name and by nobody inside — a root
    in `tools/reach.policy.json`, the shape `CONTRIBUTING.md` already had
  - not taken: `CODE_OF_CONDUCT.md` — a promise of moderation with nobody to keep it
  - **done by the maintainer the same morning**: Discussions on, private vulnerability
    reporting on, About with the site and five topics. **Open: the venue** — where the
    release is announced has no answer yet
  - binds at: **3.1**, as the half of the premiere that is not a flip · _notes:_ —

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

- [ ] **3.6 — the public surface says since when, per API and not per component**
  - concerns: [`req-release-semver`](requirements/release.md#req-release-semver)
  - the site deploys from `main` on every green run, so from the first commit after the tag
    it shows an input the published package does not have. A chip per component is too
    coarse: the unit is the `input`, the `output`, the method, the `data-pct-part`
  - **the source is the JSDoc at the declaration** — `@since 0.2.0`, and `@deprecated` with
    what replaces it and when it goes. It travels into the `.d.ts`, so the consumer's editor
    reads it too; `Status:` on a card stays what it is, the state of the component as a whole
  - the content pass compares `@since` with the last `components@X.Y.Z` tag: newer, or no
    tag at all, renders `unreleased` on the page. `pages.yml` then needs the tags in its
    checkout — added with this position, not before
  - a gate keeps `@since` honest: every public API carries one, its value is a version that
    shipped or the next one, and `@deprecated` is held to `docs/support.md`'s two-minor window
  - binds at: **the first commit after `0.1.0`** · _notes:_ —

## 4. Open findings

Small, good filler between the bigger items. Each is verified in the code and still current,
and every one is held by a **binds at** rather than by anybody's mood.

- [~] **4.58 — the suite has a flake rate and nothing has ever measured it** — **the unanimous
  column cleared 2026-09-16; the record waits on one whole run**
  - the race-shape rule bought the _shape_ of a race, greppable, and refused the repetition
    job on its own wording. The two flakes it found were fixed and the rate stayed a guess
  - what landed: a runner in `nightly.yml` per suite, `--repeat-each=3 --retries=0`, reports
    kept as an artifact — and `check-flake`, five points over them, with `flake.policy.json`
    and seventeen prepared inputs. The report's shape was MEASURED against Playwright:
    repetitions carry no index, so a case is addressed by `<path> | <project>` and nothing else
  - **first reading** (run 35070461427): `sandbox-e2e` 2086 cases over 6258 runs — 2078 clean,
    4 wobbled, **4 unanimous**; `docs-e2e` 431 cases over 1293 runs, not one wobble
  - **second** (run 35114204663, the first after the four CI-chromium fixes): the same 2086
    cases over the same 6258 runs — **2084 clean, 2 wobbled, zero unanimous**, one case in
    `forced-colors.spec.ts` and one in `slider.spec.ts`. The four columns are gone, which is
    four fixes holding under repetition rather than under a retry
  - [`lesson-202`](lessons.md#lesson-202) named the wrong population: it expected cases that
    fail under the suite's parallelism, and this CI has none — Nx's preset sets `workers: 1`
  - what remains: **one run with both halves in it.** That reading spent 2.2 hours on the
    sandbox suite and was cut off inside the docs one at the three-hour cap, so the gate
    stopped at point 1 with a suite missing. The job is one runner per suite now
  - binds at: **the first nightly of the split job**

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

- [ ] **4.73 — the reader pass was never isolated, and the record said it was**
  - `tools/at-pass.sh` starts an Xvfb on `:99`, a session bus and a throwaway configuration
    directory, and its own header says the point is that the pass never touches the reader,
    the preferences or the desktop of whoever runs it. For the BROWSER that was false from the
    first run: GTK reads `GDK_BACKEND` and `WAYLAND_DISPLAY` before `DISPLAY`, so Firefox took
    the session compositor and opened a real window on the maintainer's desktop
  - found by the maintainer saying so — a `firefox` on his taskbar with Tab walking the
    application inside it — and proved by him switching its theme, twice, in the middle of a
    reading. Xvfb had been running the whole time with nothing ever drawing on it
  - **the obvious repair is measured and refused**: `unset WAYLAND_DISPLAY` with
    `GDK_BACKEND=x11` does move the browser to `:99`, and Orca then reads almost nothing —
    **7 utterances against 1969** for the same walk, the first view failing its own guard.
    This pass works BECAUSE it is not isolated
  - what it costs: every Orca reading in `docs/acr/at/` was taken on a desktop somebody was
    using, so a stray click is indistinguishable from a component's behaviour. That is the
    error the three-reader comparison exists to catch, arriving through the instrument itself
  - what landed meanwhile: the surface is SAMPLED and written into the record, in place of the
    constant "driven on Xvfb" it used to claim, and the script warns before it opens anything
  - binds at: **a headless Wayland compositor** — `cage`, or `weston --backend=headless`, and
    neither is installed here

- [ ] **4.72 — a gate went red inside a run GitHub reported green**
  - CI run `35104356828` on `6491aef` concluded **success**. Inside it, in the one step that
    runs every gate: `❌ nx run @org/source:check-typecheck`, the gate's own verdict of one
    violation, and the end-to-end suite reporting `1 flaky`. The step's own conclusion is
    `success`, and the log carries no `NX ... failed` line and no `Failed tasks:` list
  - the gate was RIGHT. `apps/sandbox-e2e/at-orca.config.mts` had entered no compiler's
    program since the day it was written, and the nightly said so on the next tree it read.
    Fixed separately; this position is about the run that swallowed it
  - what it is not: `affected` skipping the project — `nx show projects --affected` for that
    range lists `@org/source`; and not a chronic condition — the three green runs before it
    carry no failed task at all
  - **what is already measured**: on this desk the same gate, failing under `nx affected`
    alone and again among ten of the line's gates, exits **1** and prints both missing lines.
    So the difference is not the executor, not the gate and not the target count, and the
    next reading is of a run carrying the rest — including a forty-three-minute `e2e`
  - what it costs while it stands: every green tick on this repository is a claim that the
    gates ran and passed, and for one run it was a claim that they had merely been started
  - binds at: **a reading of nx's exit code under the full line**, which is a dispatch and not
    a guess ([`lesson-214`](lessons.md#lesson-214))
