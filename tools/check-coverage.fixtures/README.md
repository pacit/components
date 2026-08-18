# Negative control of the coverage gate

Deliberately defective inputs. `tools/check-coverage.mjs` runs all six of its checks on
each of them and **requires every one to be rejected — and rejected by the point it
declares**. An input that passes is a fault; an input that fires for a reason other than
the one written in its file is a fault just the same, because it proves something other
than what it declares.

The reason it exists is the same as for every other gate in this repository
([`req-quality-negative-control`](../../docs/requirements/quality.md#req-quality-negative-control)):
**a new gate is not ready when it passes — it is ready when it has been shown to fail.**
The run this gate came from is described by
[`lesson-45`](../../docs/lessons.md#lesson-45): removing a test **raised** coverage from
96.55% to 96.94%, because an untested file left the report along with the test. A
threshold guarding such a number always passes, and the louder the less is tested.

## How a case is built

A case is not a thirteenth copy of the correct input with one thing broken. The gate builds
it from two layers:

1. `_reference.json` — the reference input: the report, the list of source files, the
   target options and the template exceptions,
2. the operations from the case file, applied to a copy of it (`dropReport`,
   `clearSources`, `dropFromReport`, `pct`, `branchPct`, `filePct`, `target`,
   `exceptions`).

That way the case file holds **nothing but the defect** — it is visible without comparing
files — and does not drift from the reference when the shape of the report changes.

**The reference input must pass.** This is not a check for good measure: were the
reference itself defective, every case would fire because of it rather than because of
its own defect, and every "rejected" would be false — that is, this whole negative
control would become exactly what it stands against.

It carries one thing besides: a template that does **not** reach the floor and an exception
saying why. That is the only place where the gate staying SILENT is measured. A case file
proves a check FIRES; that point 6 keeps quiet where a reason is written down has nowhere
else to be shown — and the case beside it (`template-exception-stale.json`) proves the other
side of that same exception, the one that fires when the metric climbs above what the
exception allows.

The input is **data, not a directory on disk**: the gate examines the decision, not the
reading of files. The plumbing defends itself — were the source glob or the path
normalisation from the report to stop working, point 2 or 3 fires on the real run, loudly
and at once.

| file                                                             | what it breaks                                             | point |
| ---------------------------------------------------------------- | ---------------------------------------------------------- | ----- |
| [`missing-report.json`](missing-report.json)                     | the run left no coverage report                            | 1     |
| [`no-sources.json`](no-sources.json)                             | an empty list of source files                              | 2     |
| [`file-outside-report.json`](file-outside-report.json)           | a source file outside the report, with a rising percentage | 3     |
| [`coverage-off.json`](coverage-off.json)                         | the target has a threshold but collects no coverage        | 4     |
| [`no-threshold.json`](no-threshold.json)                         | the target collects coverage but has no threshold          | 4     |
| [`threshold-below-minimum.json`](threshold-below-minimum.json)   | a threshold below the minimum from `req-quality-coverage`  | 4     |
| [`branch-threshold-unset.json`](branch-threshold-unset.json)     | a line threshold declared and no branch one                | 4     |
| [`below-threshold.json`](below-threshold.json)                   | lines below the declared threshold                         | 5     |
| [`branches-below-threshold.json`](branches-below-threshold.json) | branches below the declared threshold                      | 5     |
| [`template-outside-report.json`](template-outside-report.json)   | a template outside the report — a component nobody renders | 3     |
| [`template-below-floor.json`](template-below-floor.json)         | a template below the floor of its own                      | 6     |
| [`template-exception-stale.json`](template-exception-stale.json) | an exception the metric has climbed above                  | 6     |

Point 4 has four cases, because there are four different ways of disarming the same
enforcement: turning the measurement off, removing the thresholds, declaring one of the two
and lowering it. Each leaves a `project.json` that looks sensible and each ends the run
green — the third one especially, because `coverageThresholds: { lines: 80 }` reads like a
threshold is in place while every condition in the library stands under none
([`lesson-71`](../../docs/lessons.md#lesson-71)).

Point 3 is the one that actually catches the regression. Points 4 and 5 guard the number;
point 3 guards the **denominator** it came from — and that is what quietly shrinks. Point 6
guards the part of the denominator too small to matter to the total: the templates are a
seventh of the lines, so any one of them can go unrendered without moving the percentage off
its threshold, and a floor per template is the only thing that notices.

## Adding a new check to the gate

A new check in `check-coverage.mjs` comes **together with the case** that fires it, and
with an identifier that tells you it was this check that fired. A check with no case is
exactly what [`req-axis`](../../docs/00-axis.md) forbids: a promise with no machine able
to fire on it, only one floor up.
