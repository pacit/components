# 0077 — A number about the run is not a number about the code

**Status:** accepted
**Implements:** [`req-quality-unit`](../requirements/quality.md#req-quality-unit)
**Evidence:** a full run that produced timeouts on `motion.ts`, `placement.ts` and
`texts.ts` **over untouched code, where the record has never carried one on any of the
three** — and, against it, the run of 2026-09-14: 5281 mutants, 4424 detected, 8 by the
clock, which are the same eight in the same six files the record already held. Most runs
agree exactly; the decision is about the one that did not

## Context

A mutation run produces one number everybody quotes and several nobody does. Two of the
quiet ones had no file to stand in, and both had been living on a command line or in a
default:

- **the worker count.** `components:mutation` runs the bare `stryker run`, and Stryker
  derives its concurrency from the core count. On this machine that default takes the
  **parent** process down with it: no red, no report, and no session left to read one in
  ([`lesson-200`](../lessons.md#lesson-200)). The answer had been `--concurrency 4` typed by
  hand, every time, by whoever remembered.
- **the clock.** A mutant killed by elapsed time counts towards the score exactly as one
  killed by an assertion, and which mutants time out is decided by the machine. It is
  reproducible until it is not: run after run lands the same eight timeouts in the same six
  files, and then one run lands three more, on `motion.ts`, `placement.ts` and `texts.ts`,
  over sources nobody had touched.

The second one is the sharper of the two, because it makes the record itself undecidable.
Write the snapshot from the run that landed its timeouts and every later run that does not
reddens over code nobody touched; write it from the run that did not and the timeouts become
headroom, silently excusing assertions that were never written. Nothing in the gate said
which run a `--write` was allowed to be taken from, so the answer had been "whichever one
was on the disk".

## Decision

**Both numbers describe the run and not the code, and each gets the treatment its own
variability earns: the worker count is DECLARED once because it barely varies, the clock is
RECORDED and never binds because it varies freely.**

1. **`concurrency` stands in `stryker.config.json`.** The binding resource is not cores but
   memory per worker — each one runs a full Vitest process over the instrumented sandbox —
   and that is within a gigabyte on both machines this ever runs on: 15 GB here, 16 GB on
   `ubuntu-latest`. One number is therefore correct in both places although the core counts
   are eight and four, which is exactly what lets it live in a file instead of on a command
   line, where it was right on one machine and absent on every other.
2. **Point 1 of `check-mutation` refuses its absence and refuses an override.** A command
   line that changes it is the same fact in a second place ([0017](0017-one-home-per-fact.md)):
   if the number is wrong, the file is where it is wrong. Like the dry-run ceiling beside it,
   the rule is a tripwire on the SETTING — a run that dies for want of memory writes no
   report, so nothing downstream of it can speak at all.
3. **The clock column stays in the record as evidence and binds nothing.** It is how
   `clock.clockShare` is read and how a score bought with run time shows, so removing it
   would lose a real measurement. What it may not do is decide whether a file drifted.
4. **The per-file drift is measured on the killed MINUS the clock** — the mutants an
   assertion caught — on both sides of the comparison, and two-sided as before. A `--write`
   is therefore allowed from any run: the reading it records does not depend on which
   timeouts that run happened to land.

## Consequences

- **A snapshot has a provenance rule at last, and it is "any run".** That is not laxity —
  it is the consequence of recording a number the run cannot change by being busy. The
  question "which run may this be written from" stops being a judgement call.
- **The total floor is unchanged.** `thresholds.break` stays Stryker's own score, timeouts
  included, because that is the number Stryker enforces and the one quoted outside this
  repository. What the clock may not buy is capped separately by `clock.clockShare`, and
  that bound is over the same evidence column this decision keeps.
- **The record stops depending on which run wrote it.** The run of 2026-09-14 is written
  down as it measured — and the fact that it changed not one row is now a property of the
  arrangement rather than of the luck of that afternoon.
- **The gate got stricter in the one direction that matters.** Under the old comparison a
  file could lose an assertion and land a timeout in the same run and read flat. Now the
  assertion leaving is visible, because the timeout is no longer in the number.

## What this costs us

- **The record and the drift are read from the same row by two different arithmetics**, and
  a reader who computes the score from the columns gets a different number than the one the
  gate compares. The paragraph in the snapshot says so; nothing enforces that somebody reads it.
- **A genuine infinite loop now counts for less.** A mutant that hangs the worker is a real
  defect caught, and under the drift rule it is worth nothing — it is only in the score. That
  is the price of not being able to tell it apart from a busy machine.
- **One worker count for two machines is right for neither exactly.** Four is a memory
  ceiling that leaves a four-core runner saturated and an eight-core desktop half idle. The
  alternative was two homes for one fact.

## Alternatives considered

- **A `--write` only from a run that adds no timeout.** Honest and unworkable: it makes the
  record unwritable from any run taken while the machine was busy, which is most of them on
  a runner, and it puts the gate's remedy out of reach exactly when it fires.
- **Widen the per-file tolerance instead.** Rejected by measurement: one timeout in a file of
  twenty mutants is five points, well past the ±2 that exists, and
  [0023](0023-a-tolerance-is-for-a-wobbling-measurement.md) is explicit that a tolerance is
  the width of ONE wobbling measurement and not a way to reconcile two different ones.
- **Drop the clock column.** It would make the record smaller and lose the only evidence that
  says whether the score is being bought with run time — the very thing `clock.clockShare`
  was written for.
- **Per-machine worker counts through an environment variable.** Correct on each machine and
  two homes for one fact, with the second one invisible in review. Available if the machines
  ever diverge in memory the way they already do in cores.
