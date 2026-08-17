# Negative control of the mutation run gate

Deliberately defective inputs. `tools/check-mutation.mjs` runs all seven of its points on
each of them and **requires every one to be rejected — and rejected by the rule it
declares**. An input that passes is a fault; an input that fires somewhere other than
where its file says is a fault just the same, because it proves something other than
what it declares.

Every case carries the pair `check` + `rule`, not the point number alone — straight from
[`lesson-50`](../../docs/lessons.md#lesson-50). Measured on this gate: disarming
**twelve of the thirty-seven** rules moves their cases onto a neighbouring rule, and
without that field all twelve runs would be green.

The reason it exists is the same as for every other gate
([`req-quality-negative-control`](../../docs/requirements/quality.md#req-quality-negative-control)):
**a new gate is not ready when it passes — it is ready when it has been shown to fail.**
What makes it interesting here is that the machine that fires already exists: Stryker
itself fails a run below `thresholds.break`. Except that `break` is **`null` by default**
there, and the score goes up by five moves, not one of which adds a single test — and it
is those five moves these cases exercise.

## How a case is built

A case is not one more copy of the correct input with a single thing broken. The gate
builds it from two layers:

1. a copy of `_reference.json` — a fake library (`alpha`, `beta`, `empty`) that **must
   pass**;
2. the changes from the case file (`replaceStatuses`, `runConfig`, `policy`,
   `dropSnapshotRow`, …).

That way the case file holds **nothing but its own defect** and the diff shows exactly
the one thing at issue. The reference input is checked separately and first: were it
defective itself, every case would fire because of it rather than because of its own —
that is, this whole control would become what it stands against.

The library is **fake** rather than real (`core`, `number`, `select`), and that is the
same choice as in `check-bundle`: the cases are not to need maintenance at every new
test. Mutant statuses are written out outright, because the gate computes the score from
their distribution and not from the code's content — and the distribution is what can
break.

The reference input's snapshot comes from the **same renderer** as the production one and
**from the report before the case's changes**. Both are necessary: rendered after the
changes it would always agree with the measurement, so point 6 would have nothing to
examine, and written by hand it would fire on a difference of format instead of on the
case's defect.

## What these cases do NOT exercise

Four readings arrive here as data rather than from a real run:

- `report` — instead of a Stryker run (~6 minutes for the full set),
- `sources` — instead of the files on disk,
- `targets` — instead of the commands from the Nx graph,
- `ci` — instead of the workflow text.

This is the same choice as in `check-browsers` and for the same reason: four readings
from disk and from the graph are four functions of a dozen lines each, while the checks
are seven points and thirty-seven rules, and that is where all the content sits. The
readings are guarded by runs against the real repository, recorded in
[`plan.md`](../../docs/plan.md).

## The rule that outlives disarming Stryker itself

`clock-instead-of-test` is the only rule of this gate measuring something that **does not
happen** today: the repository has zero timeouts. The case proves the rule works, but its
real test will be the day the first mutant loops the code — and then it is to be loud
that the score has started buying the clock rather than the assertion.
