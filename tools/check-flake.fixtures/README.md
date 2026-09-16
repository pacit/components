# Negative control of the flake gate

Deliberately defective inputs. `tools/check-flake.mjs` runs all five of its points on each of
them and **requires every one to be rejected — and rejected by the rule it declares**. An
input that passes is a fault; an input that fires somewhere other than where its file says is
a fault just the same, because it proves something other than what it declares.

The reason it exists is the same as for every other gate here
([`req-quality-negative-control`](../../docs/requirements/quality.md#req-quality-negative-control)):
**a new gate is not ready when it passes — it is ready when it has been shown to fail.**

For this gate the rule bites in one direction. Almost every defect below makes the flake rate
read **lower** than it is, and a low rate is a green run: retries left on, one repetition
instead of three, a suite whose report never arrived, a walk that lost half the cases. The one
measurement this gate exists to take is the one its own defects erase.

## Why this control is built on a stored input

Every other control here builds its cases on the **live** repository. This one cannot: what
the gate reads is a Playwright report produced by an hour-long repetition job on a machine
that is not this one, so there is nothing live to build on and
[`_reference.json`](_reference.json) carries a small one instead — two suites, five cases,
fifteen runs, one wobble.

That shape was not written from the documentation. It was **measured against the reporter**,
and the measurement mattered: under `--repeat-each` Playwright puts every repetition in a
SEPARATE spec entry under the same title, records no repeat index anywhere in the JSON, and
gives each spec entry exactly one project. So the repetitions of one case are found by
grouping on `<path> | <project>` and by nothing else — which is also why a case is addressed
here by that same string, and why point 2 checks that every case ran the same number of times.

## The cases

| file                                                                             | what it breaks                                                                 | check         | rule                         |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ------------- | ---------------------------- |
| [`no-suite-declared.json`](no-suite-declared.json)                               | the register names no suite, so every point rules on an empty set              | `measured`    | `no-suite-declared`          |
| [`a-floor-of-one-repetition.json`](a-floor-of-one-repetition.json)               | a floor of one run of each — nothing for a case to disagree with               | `measured`    | `no-repetition-floor`        |
| [`a-suite-with-no-report.json`](a-suite-with-no-report.json)                     | one of the two reports never arrived, and half a suite reads as clean          | `measured`    | `no-report`                  |
| [`an-empty-report.json`](an-empty-report.json)                                   | a report with no project and no case, which agrees with every record           | `measured`    | `empty-report`               |
| [`retries-left-on.json`](retries-left-on.json)                                   | retries on — the mechanism that makes a flake report itself green              | `measured`    | `retries-on`                 |
| [`a-single-run-of-each.json`](a-single-run-of-each.json)                         | each case run once: a green rate over a sample that cannot hold a disagreement | `measured`    | `too-few-repetitions`        |
| [`a-tally-that-disagrees.json`](a-tally-that-disagrees.json)                     | the report's own `stats` count more runs than the walk found                   | `denominator` | `readings-disagree`          |
| [`a-case-that-ran-fewer-times.json`](a-case-that-ran-fewer-times.json)           | one case ran twice where every other ran three times, the tally agreeing       | `denominator` | `case-run-unevenly`          |
| [`a-status-only-a-retry-gives.json`](a-status-only-a-retry-gives.json)           | a `flaky` status in a run whose configuration says retries are off             | `outcomes`    | `status-contradicts-retries` |
| [`a-case-that-always-failed.json`](a-case-that-always-failed.json)               | a case failing every repetition, which a wobble counter cannot see at all      | `outcomes`    | `case-always-failed`         |
| [`a-name-the-record-does-not-carry.json`](a-name-the-record-does-not-carry.json) | a case that passed, failed and passed again, standing in no record             | `names`       | `wobble-unrecorded`          |
| [`no-record-at-all.json`](no-record-at-all.json)                                 | no record on disk, which is the state this gate was written in                 | `names`       | `no-record`                  |
| [`a-record-with-no-reading.json`](a-record-with-no-reading.json)                 | names with no denominator beside them — a list, and not a rate                 | `record`      | `reading-missing`            |
| [`a-reading-under-the-floor.json`](a-reading-under-the-floor.json)               | a record taken over fewer repetitions than could have found anything           | `record`      | `reading-below-floor`        |
| [`a-row-the-reading-does-not-count.json`](a-row-the-reading-does-not-count.json) | the reading claims two wobbles over one row                                    | `record`      | `rows-contradict-reading`    |
| [`a-rate-that-is-not-the-rows.json`](a-rate-that-is-not-the-rows.json)           | the printed rate is not what the record's own counts give                      | `record`      | `rate-contradicts-reading`   |
| [`prose-drift.json`](prose-drift.json)                                           | every number right, and the sentence saying a name is never deleted reversed   | `record`      | `stale-prose`                |

Point 1 has six cases because a measurement can be hollow in six ways that all parse, and
five of them leave a report that looks entirely normal. Point 5 has five because a record is
two things at once — a reading and a list — and each can contradict the other or itself.

## What these cases do NOT exercise

The reading of the reports off disk, and the register that says where they are. Both are a few
lines and both are guarded by the run itself: a path that resolves to nothing is
`no-report`, and a file that is not a Playwright report throws where it is parsed. What is
deliberately not covered is the **repetition job** — whether `--repeat-each` reached Playwright
at all is a property of the workflow, and `retries-on` and `too-few-repetitions` are what
notice when it did not.
