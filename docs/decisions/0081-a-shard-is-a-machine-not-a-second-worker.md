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
   within a working day. The other jobs restore and do not save.
2. **`e2e` is a matrix of six, each running `nx affected --shard=N/… -t e2e`.** Every shard
   is a runner to itself, so `workers: 1` stands and every test meets the same idle machine
   it met before. What changed is how many machines, not what happens on one — the one
   property [`lesson-214`](../lessons.md#lesson-214) would have made expensive to change.
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
  browser libraries in every job — a minute and a half to two minutes each, measured from the
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
  35435901274, where `docs-e2e` printed `3.1m` across a task span of 186.8 seconds holding a
  server that took 14, and where printed-plus-server exceeds the span on four of the six
  shards. No subtraction of that number can isolate what it already includes. Where 35 to 107
  came from is not reconstructed here and should not be guessed at a third time: the
  subtraction it was described by yields 9 to 12 seconds on the run it is attributed to, and
  the quantity that does resemble it is the setup this page already counts two bullets above.
  Until this instrument the servers had no measurement of their own; on that run each of the
  twelve stated it, 11 to 17 seconds.
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
