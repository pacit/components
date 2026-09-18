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
- **The machine time roughly doubles**, and on a public repository that is free
  ([the minutes note](../plan.md) holds: nothing paid). Seven setups where there was one is
  the price of the wall clock, paid in a currency this project does not spend.
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
  browser libraries in every job — measured at 1.1 to 1.8 minutes each on the run above,
  where the `node_modules` entry was still a miss and `npm ci` ran in all seven. The run as a
  whole cost some 74 minutes of machine time against the 71 of the single job it replaces,
  which is the trade taken deliberately: the same machine time, spent at once instead of in
  a queue.
- **A task first run inside an e2e job is not saved for the next run**, because only `gates`
  writes the cache. The alternative was worse and is measured above.
- **One more rule and one more prepared input to keep in `check-browsers`**, and a convention
  about where options may stand on a line that three readers now depend on. A convention
  three tools share is a fact in three places; what keeps it honest is that all three fail
  loudly, and the negative controls of two of them construct exactly this defect.

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
