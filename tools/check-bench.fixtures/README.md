# Negative control of the cost gate

Deliberately defective inputs. `tools/check-bench.mjs` runs all six of its points on each of
them and **requires every one to be rejected — and rejected by the point it declares**. An
input that passes is a fault; an input that fires for a reason other than the one written in
its file is a fault just the same, because it proves something other than what it declares.

The reason it exists is the same as for every other gate here
([`req-quality-negative-control`](../../docs/requirements/quality.md#req-quality-negative-control)):
**a new gate is not ready when it passes — it is ready when it has been shown to fail.**

For this gate the rule bites where a number is read as a measurement. A cost record is a list
of small integers, and every way it can lie is quiet: a scene the run skipped is a row that
simply stays as it was, a preview that grew a wrapper is one digit in a file nobody opens, a
clock with no date beside it reads exactly like one taken this morning, and a record whose
prose was rewritten still carries every right number.

## How a case is built

A case is not an eighteenth copy of the correct input with one thing broken. The gate builds
it from two layers:

1. the **live input** — the repository itself as it stands at the commit under test: the
   report the cost run wrote, the demo registry and the record on disk
   ([`_reference.json`](_reference.json) says so and records nothing, because a stored copy
   would measure the repository as it was the day somebody stored it),
2. the operations from the case file, applied to a copy of it (`report: null` and
   `reportWithout` — the report gone, or a field of it; `scenes` — a scene's reading
   rewritten, dropped with `null`, or added under an id no page shows; `registry` — previews
   added or dropped; `snapshot: null` — the record gone; `snapshot.replace` — the record
   rewritten by a pattern that has to match, because a needle that finds nothing is a case
   that broke nothing).

That way the case file holds **nothing but the defect** — visible without comparing files —
and does not drift from the reference when the repository moves.

**The live input must pass.** It is checked first, on the real run; were it defective, every
case would fire because of it rather than because of its own defect, and every "rejected"
would be false.

## The cases

| file                                                                   | what it breaks                                                                    | point | check         |
| ---------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ----- | ------------- |
| [`no-report.json`](no-report.json)                                     | the cost run left no report — a record compared with nothing passes               | 1     | `report`      |
| [`a-clock-nobody-dated.json`](a-clock-nobody-dated.json)               | the report carries no `measured` date                                             | 1     | `report`      |
| [`a-count-below-its-floor.json`](a-count-below-its-floor.json)         | the button scene reports −1 listeners                                             | 1     | `report`      |
| [`a-scene-that-never-rendered.json`](a-scene-that-never-rendered.json) | the button scene reports 0 renders                                                | 1     | `report`      |
| [`a-reading-that-is-not-whole.json`](a-reading-that-is-not-whole.json) | the button scene reports 12.5 elements                                            | 1     | `report`      |
| [`a-preview-the-run-skipped.json`](a-preview-the-run-skipped.json)     | the registry shows the button preview and the report has no scene for it          | 2     | `denominator` |
| [`a-scene-no-page-shows.json`](a-scene-no-page-shows.json)             | the run measured a `ghost` scene the registry does not show                       | 2     | `denominator` |
| [`no-snapshot.json`](no-snapshot.json)                                 | the record is not on disk                                                         | 3     | `snapshot`    |
| [`a-row-the-record-lost.json`](a-row-the-record-lost.json)             | the button row is gone from the counts block while the scene is still measured    | 3     | `snapshot`    |
| [`elements-grew.json`](elements-grew.json)                             | the button preview puts one more element in the document than the record says     | 4     | `exact`       |
| [`elements-shrank.json`](elements-shrank.json)                         | one element fewer — a drop fails exactly as a growth does                         | 4     | `exact`       |
| [`a-listener-leaked.json`](a-listener-leaked.json)                     | the button preview holds a listener it did not hold when the record was written   | 4     | `exact`       |
| [`a-second-render.json`](a-second-render.json)                         | the button preview took two passes to hold still                                  | 4     | `exact`       |
| [`a-wrapper-crept-in.json`](a-wrapper-crept-in.json)                   | the button preview is one level deeper than the record says                       | 4     | `exact`       |
| [`a-clock-with-no-date.json`](a-clock-with-no-date.json)               | the dated line of the clock section reads `someday`                               | 5     | `clock`       |
| [`a-scene-nobody-timed.json`](a-scene-nobody-timed.json)               | the button row is gone from the clock block while the date above still stands     | 5     | `clock`       |
| [`prose-drift.json`](prose-drift.json)                                 | every row right, and the sentence saying the clock is compared by nobody reversed | 6     | `verbatim`    |

Point 1 has five cases because a report can be hollow in five ways that all parse: gone, undated,
below a floor, never rendered, not whole. Point 4 has five because each of the four counts
can move and the record has two sides — `elements-shrank` is there for the same reason
`size-grew`'s neighbour is in the bundle gate: a drop that nobody wrote down is a change
nobody can attribute. Point 5 has two because "dated" can be a lie in two places: the line,
and the rows under it.
