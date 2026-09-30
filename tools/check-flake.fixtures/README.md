# Negative control of the flake gate

Deliberately defective inputs. `tools/check-flake.mjs` runs all five of its points on each of
them, the later ones over the suites the first two leave standing, and **requires every one to
be rejected by the rules it declares and by no other**. An input that passes is a fault; an
input that fires somewhere other than where its file says is a fault just the same, because it
proves something other than what it declares — and so is one that fires there and somewhere
else too, being satisfied by whichever of its defects still works.

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
| [`no-floor-at-all.json`](no-floor-at-all.json)                                   | no `minimumRepetitions` at all: every suite out, and none called short         | `measured`    | `no-repetition-floor`        |
| [`a-suite-with-no-report.json`](a-suite-with-no-report.json)                     | one of the two reports never arrived, and half a suite reads as clean          | `measured`    | `no-report`                  |
| [`an-empty-report.json`](an-empty-report.json)                                   | a report with no project and no case, which agrees with every record           | `measured`    | `empty-report`               |
| [`a-report-with-no-case.json`](a-report-with-no-case.json)                       | projects listed and not one case, as a filter that matched nothing leaves it   | `measured`    | `empty-report`               |
| [`a-report-with-no-project-list.json`](a-report-with-no-project-list.json)       | cases under a `projects` that is not a list: nothing to hold them to           | `measured`    | `empty-report`               |
| [`retries-left-on.json`](retries-left-on.json)                                   | retries on — the mechanism that makes a flake report itself green              | `measured`    | `retries-on`                 |
| [`retries-on-and-a-rescued-case.json`](retries-on-and-a-rescued-case.json)       | retries on, and the `flaky` status a retry gives — point 1 alone may speak     | `measured`    | `retries-on`                 |
| [`the-first-project-retries.json`](the-first-project-retries.json)               | retries on in the first project only: a rule reading the last one passes it    | `measured`    | `retries-on`                 |
| [`the-middle-project-retries.json`](the-middle-project-retries.json)             | retries on in the middle one of three projects: reading the ends passes it     | `measured`    | `retries-on`                 |
| [`the-last-project-retries.json`](the-last-project-retries.json)                 | retries on in the last project only: a rule reading the first one passes it    | `measured`    | `retries-on`                 |
| [`a-single-run-of-each.json`](a-single-run-of-each.json)                         | each case run once: a green rate over a sample that cannot hold a disagreement | `measured`    | `too-few-repetitions`        |
| [`a-single-run-that-failed.json`](a-single-run-that-failed.json)                 | one run of each case, and one failed: a unanimous column one run tall          | `measured`    | `too-few-repetitions`        |
| [`the-first-project-one-short.json`](the-first-project-one-short.json)           | the first project declares two repetitions, one short of the floor             | `measured`    | `too-few-repetitions`        |
| [`the-middle-project-one-short.json`](the-middle-project-one-short.json)         | the middle one of three projects declares two repetitions, one short           | `measured`    | `too-few-repetitions`        |
| [`the-last-project-one-short.json`](the-last-project-one-short.json)             | the last project declares two repetitions, one short of the floor              | `measured`    | `too-few-repetitions`        |
| [`a-tally-that-disagrees.json`](a-tally-that-disagrees.json)                     | the report's own `stats` count more runs than the walk found                   | `denominator` | `readings-disagree`          |
| [`a-run-the-tally-does-not-count.json`](a-run-the-tally-does-not-count.json)     | the walk found one run more than the report's own `stats` count                | `denominator` | `readings-disagree`          |
| [`a-case-that-ran-fewer-times.json`](a-case-that-ran-fewer-times.json)           | one case ran twice where every other ran three times, the tally agreeing       | `denominator` | `case-run-unevenly`          |
| [`a-case-that-ran-more-times.json`](a-case-that-ran-more-times.json)             | one case ran four times where its suite declares three, the tally agreeing     | `denominator` | `case-run-unevenly`          |
| [`the-first-project-declares-four.json`](the-first-project-declares-four.json)   | the first project declares four repetitions and every case ran three           | `denominator` | `case-run-unevenly`          |
| [`the-middle-project-declares-four.json`](the-middle-project-declares-four.json) | the middle one of three projects declares four, and every case ran three       | `denominator` | `case-run-unevenly`          |
| [`the-last-project-declares-four.json`](the-last-project-declares-four.json)     | the last project declares four repetitions and every case ran three            | `denominator` | `case-run-unevenly`          |
| [`a-lost-run-that-makes-a-failure.json`](a-lost-run-that-makes-a-failure.json)   | the walk lost the one pass of a case, and two failures look unanimous          | `denominator` | `readings-disagree`          |
| [`two-tests-under-one-path.json`](two-tests-under-one-path.json)                 | two tests under one path merge into one case — point 2 alone may speak         | `denominator` | `case-run-unevenly`          |
| [`two-suites-taken-out.json`](two-suites-taken-out.json)                         | both suites taken out, each by a rule of its own                               | `denominator` | `readings-disagree`          |
| [`a-status-only-a-retry-gives.json`](a-status-only-a-retry-gives.json)           | a `flaky` status in a run whose configuration says retries are off             | `outcomes`    | `status-contradicts-retries` |
| [`a-retry-status-among-failures.json`](a-retry-status-among-failures.json)       | a `flaky` status beside two failures and no pass: no wobble and no failure     | `outcomes`    | `status-contradicts-retries` |
| [`a-case-that-always-failed.json`](a-case-that-always-failed.json)               | a case failing every repetition, which a wobble counter cannot see at all      | `outcomes`    | `case-always-failed`         |
| [`a-case-that-failed-when-it-ran.json`](a-case-that-failed-when-it-ran.json)     | a case failing the one repetition that ran, skipped in the two around it       | `outcomes`    | `case-always-failed`         |
| [`a-failure-behind-a-retry-status.json`](a-failure-behind-a-retry-status.json)   | a `flaky` status and a case failing every repetition, in one suite             | `outcomes`    | `case-always-failed`         |
| [`a-retry-status-behind-a-failure.json`](a-retry-status-behind-a-failure.json)   | a case failing every repetition in one suite, a `flaky` status in the other    | `outcomes`    | `status-contradicts-retries` |
| [`a-failure-behind-no-report.json`](a-failure-behind-no-report.json)             | the first report never arrived, and the second holds a failure                 | `outcomes`    | `case-always-failed`         |
| [`a-name-the-record-does-not-carry.json`](a-name-the-record-does-not-carry.json) | a case that passed, failed and passed again, standing in no record             | `names`       | `wobble-unrecorded`          |
| [`a-title-recorded-in-another-file.json`](a-title-recorded-in-another-file.json) | a wobble under a title the record carries, but in another file                 | `names`       | `wobble-unrecorded`          |
| [`a-wobble-two-describes-deep.json`](a-wobble-two-describes-deep.json)           | a wobble two describes deep, in the second file and the second describe        | `names`       | `wobble-unrecorded`          |
| [`a-name-one-describe-apart.json`](a-name-one-describe-apart.json)               | a wobble whose record carries names one describe away, at either depth         | `names`       | `wobble-unrecorded`          |
| [`a-wobble-behind-a-failure.json`](a-wobble-behind-a-failure.json)               | one case failing every repetition and two wobbling beside it: 2026-09-24       | `names`       | `wobble-unrecorded`          |
| [`a-wobble-behind-no-report.json`](a-wobble-behind-no-report.json)               | the second report never arrived, and the first holds a wobble                  | `names`       | `wobble-unrecorded`          |
| [`a-wobble-behind-a-retry-status.json`](a-wobble-behind-a-retry-status.json)     | a `flaky` status and a wobble, in one suite                                    | `names`       | `wobble-unrecorded`          |
| [`later-points-behind-no-report.json`](later-points-behind-no-report.json)       | the first report never arrived, and every later point has a finding            | `names`       | `wobble-unrecorded`          |
| [`no-record-at-all.json`](no-record-at-all.json)                                 | no record on disk, which is the state this gate was written in                 | `names`       | `no-record`                  |
| [`no-record-behind-a-red-run.json`](no-record-behind-a-red-run.json)             | no record, in a run with a missing report and a failure                        | `names`       | `no-record`                  |
| [`a-record-with-no-reading.json`](a-record-with-no-reading.json)                 | names with no denominator beside them — a list, and not a rate                 | `record`      | `reading-missing`            |
| [`a-reading-under-the-floor.json`](a-reading-under-the-floor.json)               | a record taken over fewer repetitions than could have found anything           | `record`      | `reading-below-floor`        |
| [`under-the-floor-behind-no-suite.json`](under-the-floor-behind-no-suite.json)   | a reading under the floor, in a register that names no suite                   | `record`      | `reading-below-floor`        |
| [`a-row-the-reading-does-not-count.json`](a-row-the-reading-does-not-count.json) | the reading claims two wobbles over one row                                    | `record`      | `rows-contradict-reading`    |
| [`a-row-written-in-by-hand.json`](a-row-written-in-by-hand.json)                 | two rows under a reading that counts one                                       | `record`      | `rows-contradict-reading`    |
| [`a-rate-that-is-not-the-rows.json`](a-rate-that-is-not-the-rows.json)           | the printed rate is not what the record's own counts give                      | `record`      | `rate-contradicts-reading`   |
| [`a-rate-a-hundredth-over.json`](a-rate-a-hundredth-over.json)                   | the printed rate one hundredth above what the reading's own counts give        | `record`      | `rate-contradicts-reading`   |
| [`a-rate-a-hundredth-under.json`](a-rate-a-hundredth-under.json)                 | the printed rate one hundredth below what the reading's own counts give        | `record`      | `rate-contradicts-reading`   |
| [`prose-drift.json`](prose-drift.json)                                           | every number right, and the sentence saying a name is never deleted reversed   | `record`      | `stale-prose`                |
| [`a-drift-behind-a-wobble.json`](a-drift-behind-a-wobble.json)                   | a wobble of one pass in three, and a record whose prose has drifted            | `record`      | `stale-prose`                |
| [`a-drift-behind-a-failure.json`](a-drift-behind-a-failure.json)                 | a case failing every repetition, and a record whose prose has drifted          | `record`      | `stale-prose`                |
| [`a-drift-behind-a-retry-status.json`](a-drift-behind-a-retry-status.json)       | a `flaky` status, and a record whose prose has drifted                         | `record`      | `stale-prose`                |
| [`a-drift-behind-no-report.json`](a-drift-behind-no-report.json)                 | a report that never arrived, and a record whose prose has drifted              | `record`      | `stale-prose`                |
| [`a-drift-behind-a-floor-in-quotes.json`](a-drift-behind-a-floor-in-quotes.json) | a floor written as a string, and a record whose prose has drifted              | `record`      | `stale-prose`                |
| [`a-drift-behind-a-decimal-floor.json`](a-drift-behind-a-decimal-floor.json)     | a floor of 4.5, and a record whose prose has drifted                           | `record`      | `stale-prose`                |
| [`a-floor-of-two.json`](a-floor-of-two.json)                                     | a floor of two beside a drifted record: point 1 takes it, nothing else fires   | `record`      | `stale-prose`                |
| [`a-case-that-never-ran.json`](a-case-that-never-ran.json)                       | a case skipped in every repetition beside a drifted record: nothing else fires | `record`      | `stale-prose`                |
| [`a-deep-name-the-record-carries.json`](a-deep-name-the-record-carries.json)     | a wobble two describes deep that the record carries, beside a drift            | `record`      | `stale-prose`                |

Point 1 has six rules because a measurement can be hollow in six ways that all parse, and
five of them leave a report that looks entirely normal. Point 5 has five because a record is
two things at once — a reading and a list — and each can contradict the other or itself.

## One run, every finding

A finding of points 1 and 2 takes out of the measurement what it names, and no more: the
register's two rules every suite, any other rule its own suite. A report that failed them is
not a measurement, and a rule read over it speaks of something else. Eight cases carry exactly
that second finding and name it in `hides`. The control runs every point with nothing taken out
and holds `hides` to what the stop keeps silent, both ways: a hidden finding that has stopped
existing cannot pass for a stop, and a silenced one left unnamed is a stop nobody accounted for.

- [`retries-on-and-a-rescued-case.json`](retries-on-and-a-rescued-case.json) — point 3 would call the
  `flaky` status a retry gives a contradiction of retries OFF;
- [`a-single-run-that-failed.json`](a-single-run-that-failed.json) — point 3 would call one failure
  unanimous;
- [`a-report-with-no-project-list.json`](a-report-with-no-project-list.json) — point 2 would find
  every case uneven, and point 4 would name a wobble nothing certifies was measured with retries
  off;
- [`a-lost-run-that-makes-a-failure.json`](a-lost-run-that-makes-a-failure.json) — point 3 would call
  the two failures a lost pass leaves unanimous;
- [`two-tests-under-one-path.json`](two-tests-under-one-path.json) — point 4 would name a wobble neither
  test has;
- [`a-drift-behind-a-floor-in-quotes.json`](a-drift-behind-a-floor-in-quotes.json),
  [`a-drift-behind-a-decimal-floor.json`](a-drift-behind-a-decimal-floor.json) and
  [`no-floor-at-all.json`](no-floor-at-all.json) — point 1, suite by suite, would find every suite
  short of a floor that is not one.

[`a-single-run-of-each.json`](a-single-run-of-each.json) hides the finding point 2 would add
about a suite point 1 has already taken out: one suite, one finding. A report that never
arrived leaves nothing to read, so taking it out prevents nothing and no case is built for that.

The suites still standing are read in full, whichever suite was taken out and however many.
Behind a stop in the first suite, [`later-points-behind-no-report.json`](later-points-behind-no-report.json)
has a finding for every later point and [`a-failure-behind-no-report.json`](a-failure-behind-no-report.json)
one more for point 3; behind a stop in the last,
[`no-record-behind-a-red-run.json`](no-record-behind-a-red-run.json) holds point 3,
[`a-wobble-behind-no-report.json`](a-wobble-behind-no-report.json) point 4 and
[`a-drift-behind-no-report.json`](a-drift-behind-no-report.json) point 5; and
[`two-suites-taken-out.json`](two-suites-taken-out.json) takes out both, each for a rule of its
own. Point 5 reads the record whatever the run was, behind a register fault too, and holds its
reading to a floor point 1 accepts and to no other — not to a floor written in quotes, nor to
4.5 — whether or not a suite stands:
[`under-the-floor-behind-no-suite.json`](under-the-floor-behind-no-suite.json) names no suite,
and its reading is still refused. A missing record is point 4's finding beside the rest, not in
their place.

Points 3 to 5 each report whatever the others found. A night is a sample that does not come
again: on 2026-09-24 the verdict named the slider's press at 0/3 and stopped, with the fill at
1/3 and the switch at 2/3 in the same report ([`lesson-246`](../../docs/lessons.md#lesson-246)).
So a case is held to the WHOLE set of rules its run reports — its own, the ones it names in
`beside`, and not one more. Each case named "… behind …" carries a finding that a verdict
stopping at an earlier one would never have reached; together they pair each rule of point 3
with point 4 and with point 5, and point 4 with point 5.

Positions are part of the cases too. The `flaky` status stands first, in the middle and last
across them; a wobble that is the only one in its run has its lone failure first, in the middle
or last, or its lone pass first, in the middle or last. A rule reading a case's runs with the
first or the last one skipped loses one of them, and one reading only those two loses the middle.

Projects are positions as well. Point 1 holds every project of a report and point 2 holds every
case to the most any project declares, so each of the three rules that read projects has a case
with the odd project first among good ones, one with it in the middle of three — chromium,
firefox, webkit, the order the live suites run — and one with it last; `projects` patches a
single project as `<suite>::<project>`. The floor is held where it bites, two repetitions against
three, and each comparison of two readings of one number is held both ways at its edge: the walk
a run ahead of the tally and a run behind, the rows one ahead of the reading and one behind, a
case run once too often and once too few, the printed rate a hundredth above what its counts
give and a hundredth below.

The walk has edges of its own, which the reference — one file per report, no `describe` — leaves
unheld. [`a-wobble-two-describes-deep.json`](a-wobble-two-describes-deep.json) puts a wobble two
describes deep, in the second of two files and under the second of two describes: a walk that
stops at the file or one level down, or reads the first file or the first describe only, loses
it while the tally counts it, and one that drops the describes from the path merges three tests
into one case. A case is named by all of its path, on both sides of the comparison:
[`a-deep-name-the-record-carries.json`](a-deep-name-the-record-carries.json) has the record
carry a wobble two describes deep by its whole path, which a walk naming it by less would call
new, and the record's side is held by
[`a-title-recorded-in-another-file.json`](a-title-recorded-in-another-file.json), a recorded
title in another file, and [`a-name-one-describe-apart.json`](a-name-one-describe-apart.json),
recorded names one describe away at either depth.

A skipped repetition ran nothing, so it is no pass, no failure and no retry status. Point 2
counts it in both readings, and point 3 reads "failed every repetition" as every repetition that
RAN: [`a-case-that-failed-when-it-ran.json`](a-case-that-failed-when-it-ran.json) failed the one
run it made between two skips — an ordinary failure, which the repetition job would swallow if a
skip broke the column — and [`a-case-that-never-ran.json`](a-case-that-never-ran.json), skipped
in all three, is no failure at all. A `flaky` run is held from the other side: beside two
failures and no pass, in [`a-retry-status-among-failures.json`](a-retry-status-among-failures.json),
it makes neither a wobble nor a failure.

Every case also holds the one thing `--write` decides, which is whether to refuse: it refuses
exactly the runs points 1 to 3 reject and records the rest. That is read off the three points
themselves, not off the set the refusal is written with.

## What these cases do NOT exercise

The reading of the reports off disk, and the register that says where they are. Both are a few
lines and both are guarded by the run itself: a path that resolves to nothing is
`no-report`, a file that is not JSON throws where it is parsed, and JSON of another shape is
read as far as it goes — its lists as lists or as nothing — and fails a rule of points 1 and 2
rather than the run. Nor a file, `describe` or spec entry with no test in it: the reporter writes
none, so a report of no case is an empty list of files
([`a-report-with-no-case.json`](a-report-with-no-case.json)), and a rule counting files or
entries where it should count cases agrees with it on every report the reporter writes. What is
deliberately not covered is the **repetition job** — whether `--repeat-each` reached Playwright
at all is a property of the workflow, and `retries-on` and `too-few-repetitions` are what
notice when it did not.

Nor a run stopped early, which the gate does not look for. Under `maxFailures` or a
`globalTimeout` Playwright marks every test it never reached `skipped`, with no result, and counts
it in the tally like a skip the test decided (measured), so such a run reads as complete: every
case has its three runs, most of them skips. Neither suite sets either, and the job's own
timeout leaves no report at all; a rule for it would read the empty `results` of a test never
reached.

Which cases a finding lists. The control compares rules, not the lines under them: a finding
naming one of the two cases it found would pass. Every rule of points 3 and 4 that names cases
has a case whose finding stands in the first suite alone and one whose finding stands in the
last, so a rule that lost a suite outright is a case above going silent; a list cut short
inside a finding is read by the person and nobody else. Nor are findings counted: point 3
gives one per rule, and one per rule and suite would repeat its paragraph without hiding a
case. Nor does every rule of points 1 and 2 meet every later point: each later point is held
behind `no-report`, point 5 behind a register fault too, and a take-out that silenced one point
for one rule alone would need a case for each pair. Nor is the write itself run: the control
checks over every case whether `--write` would refuse, not what the refusal says, and that the
live run consults it before it writes is a few lines read in review — as is `--report`, which
reads every report, taken out or not.
