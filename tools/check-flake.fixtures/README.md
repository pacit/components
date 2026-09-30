# Negative control of the flake gate

Deliberately defective inputs. `tools/check-flake.mjs` runs all five of its points on each of
them and **requires every one to be rejected — by the rules it declares, and by no other**. An
input that passes is a fault; an input that fires somewhere other than where its file says is
a fault just the same, because it proves something other than what it declares — and so is
one that fires there and somewhere else too, being satisfied by whichever of its defects still
works.

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
| [`retries-on-and-a-rescued-case.json`](retries-on-and-a-rescued-case.json)       | retries on, and the `flaky` status a retry gives — point 1 alone may speak     | `measured`    | `retries-on`                 |
| [`a-single-run-of-each.json`](a-single-run-of-each.json)                         | each case run once: a green rate over a sample that cannot hold a disagreement | `measured`    | `too-few-repetitions`        |
| [`a-tally-that-disagrees.json`](a-tally-that-disagrees.json)                     | the report's own `stats` count more runs than the walk found                   | `denominator` | `readings-disagree`          |
| [`a-case-that-ran-fewer-times.json`](a-case-that-ran-fewer-times.json)           | one case ran twice where every other ran three times, the tally agreeing       | `denominator` | `case-run-unevenly`          |
| [`two-tests-under-one-path.json`](two-tests-under-one-path.json)                 | two tests under one path merge into one case — point 2 alone may speak         | `denominator` | `case-run-unevenly`          |
| [`a-status-only-a-retry-gives.json`](a-status-only-a-retry-gives.json)           | a `flaky` status in a run whose configuration says retries are off             | `outcomes`    | `status-contradicts-retries` |
| [`a-case-that-always-failed.json`](a-case-that-always-failed.json)               | a case failing every repetition, which a wobble counter cannot see at all      | `outcomes`    | `case-always-failed`         |
| [`a-failure-behind-a-retry-status.json`](a-failure-behind-a-retry-status.json)   | a `flaky` status in one suite, a case failing every repetition in the other    | `outcomes`    | `case-always-failed`         |
| [`a-name-the-record-does-not-carry.json`](a-name-the-record-does-not-carry.json) | a case that passed, failed and passed again, standing in no record             | `names`       | `wobble-unrecorded`          |
| [`a-wobble-behind-a-failure.json`](a-wobble-behind-a-failure.json)               | a case failing every repetition, and a wobble behind it that is named too      | `names`       | `wobble-unrecorded`          |
| [`no-record-at-all.json`](no-record-at-all.json)                                 | no record on disk, which is the state this gate was written in                 | `names`       | `no-record`                  |
| [`a-record-with-no-reading.json`](a-record-with-no-reading.json)                 | names with no denominator beside them — a list, and not a rate                 | `record`      | `reading-missing`            |
| [`a-reading-under-the-floor.json`](a-reading-under-the-floor.json)               | a record taken over fewer repetitions than could have found anything           | `record`      | `reading-below-floor`        |
| [`a-row-the-reading-does-not-count.json`](a-row-the-reading-does-not-count.json) | the reading claims two wobbles over one row                                    | `record`      | `rows-contradict-reading`    |
| [`a-rate-that-is-not-the-rows.json`](a-rate-that-is-not-the-rows.json)           | the printed rate is not what the record's own counts give                      | `record`      | `rate-contradicts-reading`   |
| [`prose-drift.json`](prose-drift.json)                                           | every number right, and the sentence saying a name is never deleted reversed   | `record`      | `stale-prose`                |
| [`a-drift-behind-a-wobble.json`](a-drift-behind-a-wobble.json)                   | a wobble no record carries, and a record whose prose has drifted               | `record`      | `stale-prose`                |

Point 1 has six rules because a measurement can be hollow in six ways that all parse, and
five of them leave a report that looks entirely normal. Point 5 has five because a record is
two things at once — a reading and a list — and each can contradict the other or itself.

## One run, every finding

Points 1 and 2 stop the run at their first finding. They are what makes the input a
measurement at all, and a rule read past them rules on something else: over a run with retries
on, point 3 would call the `flaky` status a retry gives a contradiction of retries OFF, and
over two tests merged under one path, point 4 would name a wobble neither test has.
[`retries-on-and-a-rescued-case.json`](retries-on-and-a-rescued-case.json) and
[`two-tests-under-one-path.json`](two-tests-under-one-path.json) carry exactly that second
finding and name it in `hides`; the control runs points 3 to 5 on them past the stop and
requires it there, so a hidden finding that has stopped existing cannot pass for a stop.

Points 3 to 5 are rules over a measurement, and each reports whatever the others found. A
night is a sample that does not come again: on 2026-09-24 the verdict named the slider's press
at 0/3 and stopped, with the fill at 1/3 and the switch at 2/3 in the same report
([`lesson-246`](../../docs/lessons.md#lesson-246)). So a case is held to the WHOLE set of rules
its run reports — its own, the ones it names in `beside`, and not one more. The three cases
named "… behind …" hold the order itself: each carries a finding that a verdict stopping at
its first would never have reached.

Every case also holds the one thing `--write` decides: it refuses exactly the runs points 1 to
3 reject, and records the rest. That is read off the three points themselves, not off the set
the refusal is written with.

## What these cases do NOT exercise

The reading of the reports off disk, and the register that says where they are. Both are a few
lines and both are guarded by the run itself: a path that resolves to nothing is
`no-report`, and a file that is not a Playwright report throws where it is parsed. What is
deliberately not covered is the **repetition job** — whether `--repeat-each` reached Playwright
at all is a property of the workflow, and `retries-on` and `too-few-repetitions` are what
notice when it did not.

Which cases a finding lists. The control compares rules, not the lines under them: a finding
naming one of the two cases it found would pass. Each rule gathers its cases from every suite
into its one finding, so a rule that lost a suite outright is a case above going silent, but
a list cut short inside a finding is read by the person and nobody else. Nor is the write
itself run: the control holds which findings refuse `--write` over every case, and that the
live run consults them before it writes is a few lines read in review.
