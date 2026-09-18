# End-to-end flake snapshot

> **This file is generated.** Do not edit it by hand —
> `node tools/check-flake.mjs --write`. The `check-flake` gate rejects a new name.

A test that fails once in thirty runs is worse than a test that fails always: it is read as
noise, re-run until green, and the defect it was pointing at outlives everybody's patience
([`req-quality-e2e`](../docs/requirements/quality.md#req-quality-e2e)). Two such cases were
found here by hand and fixed, and the SHAPE of the race they shared became a greppable rule —
but nobody has ever measured how many are left, which is what this file is.

**What is measured.** Both suites run with `--repeat-each` and `--retries=0`, and a case —
one test, in one project — that did not agree with itself across its repetitions is written
down by name. Retries are off because a retry is precisely the mechanism that makes this
invisible: a case that fails and passes on the second attempt is reported green.

**The record is read ONE way.** A name that appears and is not below is a finding and turns
the run red. A name below that behaved this time is **not** a finding and is not removed by
the gate, because repetitions of a suite are a sample of a population: a case that wobbles
once in twenty runs is silent in most samples, and deleting it on that evidence would be the
sample deciding what the population contains.

**The rate is dated and compared by nobody**, the way `bench.snapshot.md` treats its clock.
It is a property of the machine that took it at least as much as of the suite — the failure
mode being measured is "fails only under the suite's own parallelism" — so two readings from
two machines are two facts and not a trend ([`lesson-200`](lessons.md#lesson-200)).

Rows: case · project · how many of its repetitions passed. The reading line above them says
when, how many repetitions, and over how many cases and runs.

Taken 2026-09-17 · 3 repetitions · 2 suites · 2532 cases · 7596 runs · 1 wobbled (0.04%)

```
forced-colors.spec.ts › forced-colors: active › in a list panel the selection and the keyboard cursor stay distinguishable | chromium 2/3
```
