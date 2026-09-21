# Negative control of the mutation run gate

Deliberately defective inputs. `tools/check-mutation.mjs` runs all eight of its points on
each of them and **requires every one to be rejected — and rejected by the rule it
declares**. An input that passes is a fault; an input that fires somewhere other than
where its file says is a fault just the same, because it proves something other than
what it declares.

Every case carries the pair `check` + `rule`, not the point number alone — straight from
[`lesson-50`](../../docs/lessons.md#lesson-50). Measured when this gate had forty-five rules:
disarming **twelve** of them moves their cases onto a neighbouring rule, and without that
field all twelve runs would be green.

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

1. a copy of `_reference.json` — a fake library (`alpha`, `beta`, `empty`, `delta`) that
   **must pass**;
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

This is the same choice as in `check-browsers` and for the same reason: four readings from disk and
from the graph are four functions of a dozen lines each, while the checks are eight points and
fifty-three rules, and that is where all the content sits. The readings are guarded by runs against
the real repository, recorded in the **Control** of
[`req-quality-unit`](../../docs/requirements/quality.md#req-quality-unit).

## The two cases on one rule, and why they are two

`columns-adrift` holds a row to its own arithmetic — a row states a score AND the counts
behind it, so `killed / (killed + surviving + errored + not covered)` has to give what stands
beside them. It breaks in two ways that are two different human moves, so it has two cases:
`row-without-columns` is a row that cannot be READ (five numbers where the format declares
six — a half-finished format change), `columns-adrift` is a row that reads and contradicts
itself (9 killed against 5 surviving, printed as 90.00).

Both replace an EXISTING row rather than inventing one, and that is deliberate:
`libs/fake/alpha.ts` stays inside the measurement, so `expired-snapshot` has nothing to say
and the disarm of `columns-adrift` gives a green run — "PASSED" — instead of quietly moving
the case onto a neighbour. Measured: with the arithmetic disarmed the second case passes, and
the first moves to `incomplete-snapshot`, because a row nobody can read is a file with no row.

## The spec the run never selects

`epsilon.spec.ts` is the fake library's `delta.ts` one floor down: it stands in `specs` and
NOT in `testFiles`, and the only thing that makes the reference input pass is its entry in
`coversNothing`. Which is the whole point — Stryker drives Vitest in related mode over the
mutated inventory, so a spec whose subject was struck out of `patterns` is never selected and
never reaches the report, for a reason that is not drift; point 3 has no way of telling that
apart from a spec the configuration really dropped. What `testFiles` holds is every spec of
the dry run, covering or not, so a spec that RAN is not the absent case (`lesson-235`).

Three cases stand around it, each breaking one thing: an excuse for a spec the library does
not have (`excuse-without-spec`), an excuse for a spec the run does execute
(`excuse-that-runs`), and an excuse with no sentence (`excuse-without-reason`). The first
two carry `epsilon`'s valid entry BESIDE the defective one, deliberately: strip it and
`spec-outside-measurement` fires first, and the case would then prove a neighbour's rule
rather than its own — which is the fault this whole tree is built to refuse.

The live entry is `libs/components/schematics/migrations/badge-tone/index.spec.ts`, the
library's first spec under `schematics/`: the migration it measures is outside `patterns`,
which reaches `*/src/**` alone and strikes every `index.ts` besides, so the related filter
never selects the spec that holds its 81 cases.

## The rule that outlives disarming Stryker itself

`clock-instead-of-test` is the only rule of this gate measuring something that **does not
happen** today: the repository has zero timeouts. The case proves the rule works, but its
real test will be the day the first mutant loops the code — and then it is to be loud
that the score has started buying the clock rather than the assertion.

## The ceiling the run has to clear before it is a run

`a-dry-run-on-the-default-ceiling.json` is the one case here that cannot catch the failure it
is about. Before the first mutant, Stryker runs the whole suite once with coverage
instrumentation, and its own ceiling for that is five minutes; this suite measures 4:57 on a
machine twice the size of a CI runner. A run that dies there writes **no report**, so every
rule downstream — every rule in this directory — has nothing to read and the gate says only
that the measurement is unreadable. The rule therefore stands on the SETTING: it fires one run
late, on the next run that succeeds, and what it buys is that the value cannot quietly go back
to the default that cost two red nights ([`lesson-206`](../../docs/lessons.md#lesson-206)).

## The mutant the suite cannot tell apart

Four cases stand behind point 7, and what makes them different from every other register
here is the key: `unmeasured`, `noMutants` and `coversNothing` all excuse a FILE, and a file
is something the git index and the report can both confirm. An equivalent mutant is not a
file — it is an operator, a span of characters and what the operator puts there — so the
entry is keyed on exactly that, and the four cases break the four things such a key can lose:
the mutant is not in the run (`equivalent-without-mutant`), it is in the run and killed
(`equivalent-that-dies`), it is excused with no sentence behind it (`equivalent-without-reason`),
and its file is already excused whole (`equivalent-outside-inventory`).

`equivalent-that-dies` and `equivalent-without-reason` need a mutant with coordinates, which
the reference's compact `statuses` list does not carry, so both write one of the reference's
own statuses out in full — the SAME status, so no score moves and point 6 has nothing to say.
That is deliberate: a case that changes the score fires on the snapshot before it ever
reaches the rule it declares.

## The file the measurement cannot hold

`delta.ts` is in the fake library and in nothing else: not in `files`, not in `patterns`, not
in the report — only in `unmeasured`, with a reason. It is there so that the reference input
proves the register in the AFFIRMATIVE, and the four cases around it can each break one thing:
the register gone (`source-unaccounted`), an excuse for a file that is not a source
(`absence-without-source`), a file both measured and excused (`absence-inside-inventory`), and
an excuse with no sentence (`absence-without-reason`).

Its reason is the real one, shortened: `field/src/affix.ts` cannot be instrumented without
bringing the initial test run down ([`lesson-123`](../../docs/lessons.md#lesson-123)). A fake
library made only of files that CAN be measured would have had nowhere to put that case.
