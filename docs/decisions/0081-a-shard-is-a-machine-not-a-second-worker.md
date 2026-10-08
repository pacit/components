# 0081 — A shard is a machine, not a second worker

**Status:** accepted
**Implements:** [`req-quality-e2e`](../requirements/quality.md#req-quality-e2e),
[`req-quality-browsers`](../requirements/quality.md#req-quality-browsers)
**Evidence:** run 35375241392 of 2026-09-18, broken down task by task: 67.9 minutes in the
one step that runs nx, of which `sandbox-e2e:e2e` took 42.6 (2086 tests) and `docs-e2e:e2e`
23.5 (446), the two one after the other. All 44 remaining tasks — every lint, test, build and
gate — took 2.5 minutes between them

## Context

"Can the builds be sped up, some cache or something" has an answer that the measurement
refuses: **the cache was never what cost the time.** That run restored 9 tasks from the nx
cache, and a cache that had restored every one of the other 44 would have saved those 2.5
minutes. The 66 remaining are two Playwright suites, and the log says in one line why:
`Running 2086 tests using 1 worker`.

The worker count is not a decision anybody took here. `nxE2EPreset` sets
`workers: process.env.CI ? 1 : undefined`, so every suite this repository has ever run on a
runner ran one test at a time, three engines deep. Raising that number is one line and it is
the obvious change — which is exactly why it is worth writing down why it is not this one.
[`lesson-214`](../lessons.md#lesson-214) holds four cases that fail their first attempt and
pass on the retry, and what a retry gives them is a browser that has just been started. Load
on the machine is the one condition anybody has grounds to suspect there, and raising the
workers changes it for the whole suite at once, on the same afternoon as everything else here.

The second half of the measurement is the shape of the job rather than of the suite. Nx is
free to run those two tasks side by side — the inferred target carries `parallelism: true`
and nx's default is three — and it did not: `docs-e2e:e2e` began, to the second, when
`sandbox-e2e:e2e` ended. One job is also one machine, and two suites on one machine are two
dev servers, so the serialisation may well be right. It is not, however, a reason to pay for
it.

## Decision

**The battery and the browsers become separate jobs, and the browsers are split across
MACHINES rather than across workers on one.**

1. **`gates` runs `nx affected` over every target but `e2e`** — 44 tasks, 2.5 minutes — and
   it is the one job that WRITES the nx cache. That is arithmetic, not preference: the entry
   measured 121 MB, the browser cache beside it 456 MB, and a repository gets 10 GB. Seven
   jobs saving an entry each under a key that carries the commit would evict the browsers
   within a working day. The other jobs restore and do not save. _(The browsers left the
   cache on 2026-10-07 — they come in the machine now, see the amendment at the end — and
   the arithmetic holds for `node_modules`, 192 MB, in their place. Since 2026-10-08 the
   other jobs do not restore the nx entry either: it cost the shards more than the one task
   it could spare them, `lesson-255`.)_
2. **`e2e` is a matrix of six, each running `nx affected --shard=N/… -t e2e`.** Every shard
   is a runner to itself, so `workers: 1` stands and every test meets the same idle machine
   it met before. What changed is how many machines, not what happens on one — the one
   property [`lesson-214`](../lessons.md#lesson-214) would have made expensive to change.
   **Amended 2026-10-07: eight, not six.** The tail shard measured 23 minutes at six
   (37537775744) once this job became the push's whole e2e verdict
   ([0088](0088-a-row-is-measured-by-its-own-run-and-the-whole-at-night.md)); the property
   is the count of MACHINES and the denominator is still `job-total`, so nothing here
   depends on the number. The first run at eight: 7.6 to 11.4 minutes per shard, 13.1 for
   the run (37655766884).
3. **The denominator is `${{ strategy.job-total }}` and never a number typed beside the
   matrix**, and point 5 of `check-browsers` refuses a literal one
   (`ci-shard-not-from-matrix`). This is the failure the arrangement makes possible and
   nothing else here could see: six jobs running `--shard=N/8` run six eighths of the suite
   and report green over the rest. The configuration still declares three engines, the other
   points still pass, every job is still green.
4. **On an `nx affected` line the targets come last, and a word beginning with a dash is an
   option.** Three readers depend on it — `scripts/before-push`, point 3 of `check-docs` and
   `check-tools` — and all three now read every such line of the workflow rather than the
   first. A reader that stopped at the first line would have dropped `e2e` from the local
   battery the day this split landed, silently, because a short list still runs and still
   goes green.
5. **`node_modules` is cached against the lockfile, and `npm ci` runs on a miss.** 66 seconds
   per job, and there are seven of them now.

## Consequences

- **The wall clock went from 68 minutes to 17.1**, measured on the first sharded run
  (35401914426, all seven jobs green): `gates` answered in 4.2 minutes — 1.8 of them the
  battery itself — and the six shards took 8.4, 9.2, 10.7, 11.2, 12.8 and 17.0.
- **The wall clock is the slowest shard's, and the shards are uneven by eight minutes.**
  Playwright balances them by test COUNT, and the engines do not cost the same: a shard
  carrying webkit's share of the slow files runs nearly twice the length of one that does not.
  Six shards therefore buy 17 minutes rather than the 11 that 66 divided by six would
  suggest, and a seventh would move only the straggler. What would actually flatten it is a
  split along the cost rather than the count — and that is a measurement nobody has taken
  yet, not a change to make on the strength of this paragraph.
- **The machine time barely moves: 73.4 minutes against 70.6.** That was the surprise of the
  first run, and it is worth stating plainly because "parallel costs more machine" is what
  everybody assumes. What it is NOT is a tidy sum. The duplicated setup measured between a
  minute and a half and two minutes a job, so six extra jobs should have cost some ten
  minutes — and the total went up by under three, because the six nx steps together came to
  57.5 minutes against the single job's 66. The tests got about eight minutes cheaper by
  being split, and nobody here knows why: three numbers are measured and the arithmetic
  between them is not explained. Do not reason from the 4%; it is a difference of two
  measurements and not a model of anything. On a public repository it is free either way
  ([the minutes note](../plan.md) holds: nothing paid).
- **A red shard no longer cancels its siblings** (`fail-fast: false`): after a failure the
  question is always which tests failed, and a cancelled shard answers nothing.
- **The local battery cannot quietly lose a target.** `scripts/before-push` takes the union
  over the workflow's lines, and refuses a line it cannot read instead of skipping it.

## What this costs us

- **A suite is six results now, not one.** `2086 passed (42.6m)` appears nowhere any more,
  and the flake reading that [`lesson-214`](../lessons.md#lesson-214) is made of has to be
  assembled out of six logs. The nightly, which runs everything unsharded, stays the place
  where the suite speaks with one voice.
- **Setup is paid seven times**: a checkout, a Node, a restore and an apt install of the
  browser libraries in every job (nine jobs since 0088, and the apt install gone since 2026-10-07
  — the amendment at the end) — a minute and a half to two minutes each, measured from the
  start of a job to the start of its nx step on the run above, where the `node_modules` entry
  was still a miss and `npm ci` ran in all seven. The job's whole non-test time is a little
  more, 2.1 minutes on average, the rest of it two dev servers and nx's own. The run as a
  whole cost some 74 minutes of machine time against the 71 of the single job it replaces,
  which is the trade taken deliberately: the same machine time, spent at once instead of in
  a queue.
- **The run starts twelve dev servers where it used to start two, and that dice has come up
  badly once.** On run 35408508618 two shards of six failed with
  `Timed out waiting 240000ms from config.webServer` — and the failing tasks printed NOT ONE
  line of server output in those four minutes, while their siblings on the same run had both
  their servers up inside 35 to 107 seconds together — a figure the correction below withdraws.
  So it is a hang and not a budget, and a
  larger ceiling would buy nothing; re-running the two jobs passed them both. What the
  arrangement changed is how often the question is asked: twelve cold starts a run instead of
  two. It is written down here because the next occurrence is evidence and this one is only a
  reading — whether the nested `npx nx run sandbox:serve` is what stalls is not something one
  run can say. **Read again on 2026-09-19, that silence narrowed rather than widened**: a shard
  of this same run which passed printed 47 project-graph warnings from its sandbox server
  inside the first seconds, and the two that failed printed none — so the stall came before nx
  read the workspace out, nowhere near the build. What `webServer.stdout`, an `'ignore'` by
  default, had been costing is the nx header: the line that tells a server which never started
  from one whose task never did. Both suites pipe stdout now and `scripts/serve-for-e2e` ticks
  on stderr while nothing else is written — read at the end of the task, not live, since nx
  flushes a task's output when it finishes ([`lesson-231`](../lessons.md#lesson-231), 4.76).
  The ceiling is untouched. **And the 35-to-107-second reading above was never about the
  servers**: Playwright's printed time ALREADY CONTAINS the wait for one — measured on run
  35435901274, where `docs-e2e` printed `3.1m` across a task span of 185.3 seconds that held a
  server taking 14 — the two together some fifteen seconds longer than the span containing
  both. No subtraction of that number can isolate what it already includes. Where 35 to 107
  came from is not reconstructed here and is not guessed at a third time; what can be said is
  that the step's duration less the two printed suite times — the subtraction the figure was
  described by — yields 9 to 12 seconds across the six shards of the run it is attributed to.
  Until this instrument the servers had no measurement of their own, and on run 35435901274
  each of the twelve stated it: 11 to 17 seconds.
- **A task first run inside an e2e job is not saved for the next run**, because only `gates`
  writes the cache. The alternative was worse and is measured above.
- **Two more rules and two more prepared inputs to keep in `check-browsers`**, and a reading
  of a workflow line that four gates and one script now share. That reading lives in
  `tools/workflow-targets.mjs` rather than in six copies — the copies existed, and two
  rounds of review found them disagreeing: three would not read past an option, one carried
  `\s` in its class, two stripped comments and two did not, and the script wanted the literal
  `npx nx`. What holds it honest is uneven: `check-docs` has two controls over the reading and
  the shard rule has one that feeds it real YAML, while `check-tools` can have none as long as
  it reads the workflow at module load, and `scripts/before-push` — which now calls the module
  instead of repeating it — has no control mechanism at all. Written down here rather than
  left for the next reader to find out.
- **A job that can legitimately run nothing decides that for itself.** `scripts/nx-verdict`
  still refuses a run with no verdict, because `No tasks were run` is what nx prints BOTH for
  a diff that reaches nothing and for a target list that is a typo. The browser job asks the
  workspace instead — does any project have an `e2e` target, and is any affected — so the two
  cases are told apart where they differ rather than in the guard, where they look alike.

## Alternatives considered

- **Raise `workers` to two or three.** One line, and by the arithmetic alone the cheaper
  change. Rejected as the FIRST move for [`lesson-214`](../lessons.md#lesson-214)'s reason —
  it moves the one variable those four cases are suspected of reacting to. It stays available,
  and it is now measurable on its own, against a suite whose wall clock no longer hides it.
- **Shard by engine** (`--project=chromium` per job). Rejected twice over. Nx takes
  `--project` for its own and answers `Cannot find project 'chromium'` — **and leaves with
  exit code 0**, which is [`lesson-222`](../lessons.md#lesson-222)'s silence exactly, caught
  here only because `scripts/nx-verdict` refuses a run with no verdict. And point 5 of
  `check-browsers` refuses a narrowed `e2e` command outright, which is the rule doing its job:
  three engines in the configuration and one on the command line is the narrowing nothing else
  can see.
- **A hosted remote cache.** A service is a dependency decision rather than a setting, and
  the measurement above says the cache was never the cost.
- **One job per suite, unsharded.** The same arithmetic gives 47 minutes — the longer suite
  plus its setup. It is the shards that make it 17.

## Amended 2026-10-07: the browsers come with the machine

**Every job that needs a browser runs in Playwright's own image,
`mcr.microsoft.com/playwright:v1.63.0-noble`, whose tag is exactly the `@playwright/test`
version in `package-lock.json` — and `check-browsers` (point 5) refuses any other tag in any
workflow.** That is `gates` and the eight shards here, the full run and the repetition run of
`nightly.yml`, and the probe. The cache of `~/.cache/ms-playwright` and both install steps are
gone, because the image is the installation: Playwright builds it with `install-deps` and with
`install chromium`, `firefox` and `webkit`, one layer each (read off its build history). The
option is the one Playwright's CI page gives for GitHub Actions, `--user 1001` — the uid the
runner runs as, owning the workspace and the `$HOME` it mounts in.

**Why.** The setup this record pays in every job had one step that was not ours to bound: the
apt install of the browsers' system libraries, off `azure.archive.ubuntu.com`, on every run,
cache hit or not. On 2026-10-07 it hung a shard in three consecutive runs of one pull request
— 37666438813 (shard 4, the mirror at about 80 kB/s, 13.6 MB of `libflite1` in some three
minutes, cancelled after 31), 37670285011 (shard 5, `apt-get update` silent for 23 minutes
right after skipping the mirror's `noble InRelease`) and 37673446107 (shard 5, 37 minutes in
the step, cancelled and re-run) — and a fourth time on `main` (37663309919,
the push of a0df9a2e), where shard 8 spent 3520 seconds in the step and ran out of its hour.
The step had no ceiling of its own; the job's 60 minutes were the only one.

**What it measured, before and after.** Before: every run of this workflow from 2026-10-05
04:38 to 2026-10-07 19:57 UTC — 28 runs, 213 browser jobs, 208 of which finished the step: 41
seconds at the median, 273 at the 90th percentile, 3520 at worst, behind a cache restore of 8
seconds at the median. The 132 jobs before 2026-10-07 had a 90th percentile of 56 seconds and
three over five minutes; the 76 of 2026-10-07 had 508 and fourteen. After: the image is 956 MB
compressed in seven layers, and `Initialize containers`, the step that pulls it, took 26 to 43
seconds, 27 at the median, over the 31 container jobs of this change's first five runs
(37681764776, 37684639047 and 37686780190 of this workflow, the dispatched probe 37681766570
and nightly 37681770983). So the median moves from 49 seconds to 27 and the worst seen from
58 minutes to 43 seconds — the second figure from five runs, which is not yet a tail.

**What was verified in the image, not assumed** — by a probe step in the first two runs, taken
out before merge:

- **The composite action runs there unchanged.** `setup-node` puts Node 24.21.0 on the path, and
  the action took 12 to 23 seconds on a `node_modules` hit, against 13 to 25 on the bare runner
  (37660677351). Git is 2.43.0.
- **`nx affected` keeps its history.** The checkout is not shallow — 558 commits — and
  `NX_BASE` is an ancestor of `HEAD`.
- **Both web servers start.** `sandbox:serve` answered after 14 seconds and `docs:serve:e2e`
  after 13 and 14; every shard's suites ran, which neither can without its server.
- **Firefox runs as uid 1001.** The probe dispatched on firefox passed 724 of 724 in 17.2
  minutes (37681766570).
- **The rest of the machine:** `Etc/UTC`, as on the runner; 4 CPUs and 16 GB; `/dev/shm` at
  Docker's 64 MB, which Chromium does not use — Playwright starts it with
  `--disable-dev-shm-usage`. `--ipc=host`, which Playwright's Docker page recommends for
  Chromium, is therefore not taken until a crash is measured that it would have prevented.

**What the image changed, each repaired at its cause rather than around it:**

- **`localhost` is `::1` first.** Docker's `/etc/hosts` gives the name to `::1` as well, Node
  resolves it there first, and Verdaccio, told a bare port, bound `::1` alone — while
  `check-consumer`'s `fetch` asked `127.0.0.1` and was refused for the whole of its wait; `[::1]`
  answered 200 in the same run. The gate now names `127.0.0.1` on both ends.
- **`${{ github.workspace }}` is the runner's path, not the job's.** It reads
  `/home/runner/work/components/components` inside a container whose workspace is
  `/__w/components/components`; the repetition run builds its report's path in the shell.
- **There is no `zstd`.** `actions/cache` then writes gzip, and the compression is part of an
  entry's version: the image's first runs found none of the nx entries `main` had written
  outside it, and one `node_modules` key now holds two entries, 178 MB from the runner and
  204 MB from the image. For the nx entries that costs nothing, and the reason is older than
  this change: since Nx 23.2.1 (#48, 2026-10-02) the task cache lives in `~/.nx/<id>`, not in
  the `.nx/cache` the action saves, and every run since restored an entry and then read
  `Cache: 0/… hit` — `gates` 0/51 on 37303382522, `pages.yml` 0/5 on 37579021492. The restore
  in `pages.yml`, on the runner, is removed: it could never again find an entry, and the one
  it found had held nothing for five days. Repairing the cache was its own change, on
  2026-10-08 (`lesson-255`): the action names the cache's place to nx and asks nx where it is,
  and `pages.yml` stays without a restore — now because the image would cost about what a hit
  saves, not because none could happen.
- **The generic `monospace` is another face.** Liberation Mono in the image, DejaVu Sans Mono
  on the desk and on the runner — and all eight of the site's baselines moved, by 3122 to
  30402 pixels. The pictures were right to move: 3610 code and `pre` elements on the 42 routes
  of the sitemap named no face, so the site drew them in whatever the machine had, which is
  what its vendored faces exist to prevent. Every code seat now reads `--docs-font-mono`;
  measured on all 42 routes before and after, the COMPUTED size and line height of all 8375
  code, `kbd`, `samp` and `pre` elements are unchanged — the 66 that sat at the browser's 13px
  for the generic family alone are given that 13px. What does move is a box whose line height
  is `normal`, which is the face's own metric: the review measured 3462 rendered heights
  changed, a block on /components from 15 to 17 pixels — the site's code now has the vertical
  rhythm of the face it names. Six baselines were recorded again on the desk — the theming
  page's two came out as they were — and the image then drew all eight as the desk had
  (37686780190), though the two machines' own `monospace` still differ. The sandbox's moved by
  nothing: they pin Liberation Sans and Liberation Mono, which the image carries.

**Alternatives considered.**

- **An image of our own on ghcr.io.** Taken only if the official image lacked something
  measured, and it did not: what it lacks — `zstd`, the DejaVu fonts — cost nothing once the
  site read its own face and the dead restore went. Our own image would be a build workflow, a
  registry entry and a second version to keep in step with the lockfile, for no reading.
- **A tag derived from the lockfile by a job in front** (`needs.<job>.outputs.image`). No
  literal to drift, but a serial job before every run and a tag nobody can read in the file.
  The literal costs one line per workflow at a bump, and the bump's pull request goes red
  naming each.
- **A step timeout and a retry around apt.** It bounds the hang and not the mirror: the step
  was 41 seconds at its median, and the pull is 27.
- **`at-pass.yml` stays on apt.** Windows and macOS have no such image, and its Linux job is a
  desktop session with Orca that installs from apt for the reader anyway. It names no image, so
  the tag rule has nothing to hold there.

**What this costs.** The pull is a network step too, and it is bounded by the job's timeout
alone, as apt was: 31 pulls of 31 finished inside 45 seconds, and no hang has been seen — five
runs say nothing about one. A Playwright bump now moves five lines in three workflows, which
`check-browsers` names. And the desk does not run the image — it has no Docker — so a picture
the image draws differently from the desk is found on CI; the site's pictures now draw only
vendored faces, and the sandbox's pin faces the image carries.
