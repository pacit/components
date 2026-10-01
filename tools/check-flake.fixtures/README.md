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
instead of three, a suite whose report never arrived, a run that stopped at its first failure
or was interrupted by hand, a walk that lost half the cases. The one measurement this gate
exists to take is the one its own defects erase.

## Why this control is built on a stored input

Every other control here builds its cases on the **live** repository. This one cannot: what
the gate reads is a Playwright report produced by an hour-long repetition job on a machine
that is not this one, so there is nothing live to build on and
[`_reference.json`](_reference.json) carries a small one instead — two suites, five cases,
fifteen runs, one wobble.

That shape was not written from the documentation. It was **measured against the reporter**,
and the measurement mattered — but it was taken from one working directory, which is the half
it missed. Where `--repeat-each` puts the repetitions depends on the directory the suite is run
from (measured 2026-09-30 on a toy of two projects, and again 2026-10-01 with a nested
`describe`; Playwright 1.61.1): the JSON reporter merges a test's entries across repetitions
and projects by title and location, and it compares the location through
`path.relative(rootDir, spec.file)` over a `file` that is already relative — which resolves
against the process's working directory. Run from the test directory, ONE spec entry carries
every repetition of every project of a test (`tests: [alpha×3, beta×3]`); run from anywhere
else, as `npx nx run <suite>:e2e` runs the nightly's suites (`cwd: apps/<suite>`, the tests
under `src/`), every repetition is a SEPARATE spec entry with exactly one test. A `describe`
merges either way, and no repeat index is recorded anywhere in the JSON. The reference holds
the nightly's shape, and [`a-wobble-in-one-spec-entry.json`](a-wobble-in-one-spec-entry.json)
and [`two-projects-in-one-spec-entry.json`](two-projects-in-one-spec-entry.json) hold the
other, so the repetitions of one case are found by grouping on `<path> | <project>` over every
test of every entry and by nothing else — which is also why a case is addressed here by that
same string, and why point 2 checks that every case ran the same number of times.

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
| [`the-first-project-retries.json`](the-first-project-retries.json)               | retries on in the first of three projects: reading the last two passes it      | `measured`    | `retries-on`                 |
| [`the-middle-project-retries.json`](the-middle-project-retries.json)             | retries on in the middle one of three projects: reading the ends passes it     | `measured`    | `retries-on`                 |
| [`the-last-project-retries.json`](the-last-project-retries.json)                 | retries on in the last of three projects: reading the first two passes it      | `measured`    | `retries-on`                 |
| [`a-single-run-of-each.json`](a-single-run-of-each.json)                         | each case run once: a green rate over a sample that cannot hold a disagreement | `measured`    | `too-few-repetitions`        |
| [`a-single-run-that-failed.json`](a-single-run-that-failed.json)                 | one run of each case, and one failed: a unanimous column one run tall          | `measured`    | `too-few-repetitions`        |
| [`the-first-project-one-short.json`](the-first-project-one-short.json)           | the first of three projects declares two repetitions, one short of the floor   | `measured`    | `too-few-repetitions`        |
| [`the-middle-project-one-short.json`](the-middle-project-one-short.json)         | the middle one of three projects declares two repetitions, one short           | `measured`    | `too-few-repetitions`        |
| [`the-last-project-one-short.json`](the-last-project-one-short.json)             | the last of three projects declares two repetitions, one short of the floor    | `measured`    | `too-few-repetitions`        |
| [`a-stop-and-a-project-one-short.json`](a-stop-and-a-project-one-short.json)     | the last project one short of the floor, and an early stop: setup named first  | `measured`    | `too-few-repetitions`        |
| [`a-sigint-and-a-project-one-short.json`](a-sigint-and-a-project-one-short.json) | the last project one short of the floor, and a Ctrl+C: setup named first       | `measured`    | `too-few-repetitions`        |
| [`a-run-stopped-at-a-failure.json`](a-run-stopped-at-a-failure.json)             | `-x` in colour: stopped at a wobble's first, failing run, the rest skipped     | `measured`    | `stopped-early`              |
| [`a-stop-that-skipped-nothing.json`](a-stop-that-skipped-nothing.json)           | the limit reached by the last test to run: nothing skipped, still a stop       | `measured`    | `stopped-early`              |
| [`a-run-out-of-time.json`](a-run-out-of-time.json)                               | out of time in the second suite, the sentence first of two, at 12.25 seconds   | `measured`    | `stopped-early`              |
| [`a-stop-behind-another-error.json`](a-stop-behind-another-error.json)           | ten failures under a limit of ten, the sentence second of two errors           | `measured`    | `stopped-early`              |
| [`errors-that-are-not-a-list.json`](errors-that-are-not-a-list.json)             | an `errors` that is one error and not a list: read as that error, not none     | `measured`    | `stopped-early`              |
| [`a-stop-that-cut-off-a-test.json`](a-stop-that-cut-off-a-test.json)             | `--max-failures=1` on two workers: the stop named, not the test it cut off     | `measured`    | `stopped-early`              |
| [`a-run-interrupted-by-hand.json`](a-run-interrupted-by-hand.json)               | Ctrl+C in firefox's first repetition: no error, every other point passes it    | `measured`    | `interrupted`                |
| [`an-interruption-after-a-failure.json`](an-interruption-after-a-failure.json)   | Ctrl+C after a wobble's failing first run: point 3 would call it a failure     | `measured`    | `interrupted`                |
| [`an-interruption-beside-an-error.json`](an-interruption-beside-an-error.json)   | Ctrl+C in the second suite's last test, and a global teardown that threw       | `measured`    | `interrupted`                |
| [`a-sigint-in-one-spec-entry.json`](a-sigint-in-one-spec-entry.json)             | Ctrl+C on two workers in one spec entry: the result cut off between passes     | `measured`    | `interrupted`                |
| [`results-that-are-not-a-list.json`](results-that-are-not-a-list.json)           | a `results` that is one result and not a list: read as it, not as none         | `measured`    | `interrupted`                |
| [`an-error-outside-any-test.json`](an-error-outside-any-test.json)               | two worker errors outside any test, which took both passes of a wobble         | `measured`    | `error-outside-tests`        |
| [`a-timeout-in-the-teardown.json`](a-timeout-in-the-teardown.json)               | a timeout in the global teardown after every test ran: no stop, still refused  | `measured`    | `error-outside-tests`        |
| [`an-error-thrown-as-a-value.json`](an-error-thrown-as-a-value.json)             | a global teardown that threw a string: an error with no message at all         | `measured`    | `error-outside-tests`        |
| [`a-tally-that-disagrees.json`](a-tally-that-disagrees.json)                     | the report's own `stats` count more runs than the walk found                   | `denominator` | `readings-disagree`          |
| [`a-run-the-tally-does-not-count.json`](a-run-the-tally-does-not-count.json)     | the walk found one run more than the report's own `stats` count                | `denominator` | `readings-disagree`          |
| [`a-case-that-ran-fewer-times.json`](a-case-that-ran-fewer-times.json)           | one case ran twice where every other ran three times, the tally agreeing       | `denominator` | `case-run-unevenly`          |
| [`a-case-that-ran-more-times.json`](a-case-that-ran-more-times.json)             | one case ran four times where its suite declares three, the tally agreeing     | `denominator` | `case-run-unevenly`          |
| [`the-first-project-declares-four.json`](the-first-project-declares-four.json)   | the first of three projects declares four, and every case ran three            | `denominator` | `case-run-unevenly`          |
| [`the-middle-project-declares-four.json`](the-middle-project-declares-four.json) | the middle one of three projects declares four, and every case ran three       | `denominator` | `case-run-unevenly`          |
| [`the-last-project-declares-four.json`](the-last-project-declares-four.json)     | the last of three projects declares four, and every case ran three             | `denominator` | `case-run-unevenly`          |
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
| [`a-wobble-in-one-spec-entry.json`](a-wobble-in-one-spec-entry.json)             | a wobble whose three runs stand in one spec entry, run from the test directory | `names`       | `wobble-unrecorded`          |
| [`two-projects-in-one-spec-entry.json`](two-projects-in-one-spec-entry.json)     | two projects' six runs of a case in one spec entry, the firefox copy wobbling  | `names`       | `wobble-unrecorded`          |
| [`near-misses-in-the-record.json`](near-misses-in-the-record.json)               | a wobble the record misses by one part of its path, at each part in turn       | `names`       | `wobble-unrecorded`          |
| [`a-hook-that-failed-once.json`](a-hook-that-failed-once.json)                   | a `beforeAll` failing once: the test after it skipped, and no interruption     | `names`       | `wobble-unrecorded`          |
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
| [`a-project-that-never-started.json`](a-project-that-never-started.json)         | firefox behind chromium's timeout: no result, no error — nothing else fires    | `record`      | `stale-prose`                |
| [`a-deep-name-the-record-carries.json`](a-deep-name-the-record-carries.json)     | a wobble two describes deep that the record carries, beside a drift            | `record`      | `stale-prose`                |
| [`a-project-repaired-by-name.json`](a-project-repaired-by-name.json)             | firefox broken in the report and repaired by name, beside a drifted record     | `record`      | `stale-prose`                |

Point 1 has nine rules because a measurement can be hollow in nine ways that all parse, and
eight of them leave a report that looks entirely normal. Point 5 has five because a record is
two things at once — a reading and a list — and each can contradict the other or itself.

## One run, every finding

A finding of points 1 and 2 takes out of the measurement what it names, and no more: the
register's two rules every suite, any other rule its own suite. A report that failed them is
not a measurement, and a rule read over it speaks of something else. Twelve cases carry exactly
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
- [`a-run-stopped-at-a-failure.json`](a-run-stopped-at-a-failure.json) — point 3 would call a wobble
  an early stop cut off after one failing run a case failing every repetition it ran;
- [`a-stop-behind-another-error.json`](a-stop-behind-another-error.json) — point 3 would name three
  broken cases, read off a run that cannot say what stopping cost it;
- [`an-interruption-after-a-failure.json`](an-interruption-after-a-failure.json) — point 3 would call
  a wobble a Ctrl+C cut off after its failing first run a failure;
- [`an-error-outside-any-test.json`](an-error-outside-any-test.json) — point 3 would say the same of a
  wobble whose two passes two worker errors took;
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
case to the most any project declares, so each of the three rules that read projects has three
cases on a report of three projects — chromium, firefox, webkit, the order the live suites run
them in — with the odd one first, in the middle and last: a rule reading a fixed one or two of
them, or skipping any one, passes at least one of the three. `projects` patches a single project
as `<suite>::<project>`, and [`a-project-repaired-by-name.json`](a-project-repaired-by-name.json)
holds that it reaches the one it names. The floor is held where it bites, two repetitions against
three, and each comparison of two readings of one number is held both ways at its edge: the walk
a run ahead of the tally and a run behind, the rows one ahead of the reading and one behind, a
case run once too often and once too few, the printed rate a hundredth above what its counts
give and a hundredth below.

The walk has edges of its own, which the reference — one file per report, no `describe`, one
test per spec entry — leaves unheld.
[`a-wobble-two-describes-deep.json`](a-wobble-two-describes-deep.json) puts a wobble two
describes deep, in the second of two files and under the second of two describes: a walk that
stops at the file or one level down, or reads the first file or the first describe only, loses
it while the tally counts it, and one that drops the describes from the path merges three tests
into one case. [`a-wobble-in-one-spec-entry.json`](a-wobble-in-one-spec-entry.json) puts the
three repetitions of a case in one spec entry, the shape a run from the test directory writes,
where the reference has one test per entry: a walk reading one test per entry, the entry's
first, finds a case run once where the tally counts three and never reaches the wobble, so
point 2 speaks where the case declares point 4 — it fires on a rule it does not declare, which
the control refuses. That walk passes every other case here but the next (measured).
[`two-projects-in-one-spec-entry.json`](two-projects-in-one-spec-entry.json) is the reference's
first suite in that shape, both projects' six repetitions in each entry, with the firefox copy
of the recorded wobble wobbling too: a walk taking a case's project off the entry's first test
keys all six under chromium, a case run six times where the suite declares three, and never
names the firefox one — and it passes every other case here, the one-project entry above
included (measured). A case is named by all of its path, on both sides of the comparison:
[`a-deep-name-the-record-carries.json`](a-deep-name-the-record-carries.json) has the record
carry a wobble two describes deep by its whole path, which a walk naming it by less would call
new, and the record's side is held by
[`a-title-recorded-in-another-file.json`](a-title-recorded-in-another-file.json), a recorded
title in another file, and [`near-misses-in-the-record.json`](near-misses-in-the-record.json), a
record carrying a wobble's name with one part changed, at each part in turn.

A skipped repetition ran nothing, so it is no pass, no failure and no retry status. Point 2
counts it in both readings, and point 3 reads "failed every repetition" as every repetition that
RAN: [`a-case-that-failed-when-it-ran.json`](a-case-that-failed-when-it-ran.json) failed the one
run it made between two skips — an ordinary failure, which the repetition job would swallow if a
skip broke the column — and [`a-case-that-never-ran.json`](a-case-that-never-ran.json), skipped
in all three, is no failure at all. A `flaky` run is held from the other side: beside two
failures and no pass, in [`a-retry-status-among-failures.json`](a-retry-status-among-failures.json),
it makes neither a wobble nor a failure.

An early stop is read off the report's own `errors` and off nothing else (measured, Playwright
1.61.1). Under `maxFailures` every test the run never reached is `skipped` with no result, under
a `globalTimeout` the one in flight keeps a `skipped` result besides, and the tally counts both
like a skip the test decided — so a run that stopped early reads as complete, and a wobble cut
off after one failing run fails every repetition that ran. A `skipped` test with no annotation
is no sign of a stop: a serial group after a failure and a failed `beforeAll` leave one, a
failed dependency project leaves tests with no result at all, and none of the three writes an
error. So `stopped-early` matches the two whole sentences Playwright writes when it stops a run,
once the colour `nx` turns on for its tasks is off them:
[`a-run-stopped-at-a-failure.json`](a-run-stopped-at-a-failure.json) is `-x` in that red,
[`a-run-out-of-time.json`](a-run-out-of-time.json) a timeout of 12.25 seconds whose sentence is
the first of two errors, and
[`a-stop-behind-another-error.json`](a-stop-behind-another-error.json) a limit of ten whose
sentence is the second. [`a-stop-that-skipped-nothing.json`](a-stop-that-skipped-nothing.json)
reached its limit on the last test to run and is refused all the same: a timeout that runs out
in the last worker's teardown says the test suite timed out as well, with every test run
(measured), and a report cannot say what stopping cost, so the gate takes it at its word.
[`a-stop-and-a-project-one-short.json`](a-stop-and-a-project-one-short.json) holds the order —
how a run was set up is named before what it did, its last project short of the floor, the last
setup rule the run reads.

A run stopped from outside names itself nowhere in `errors`: a Ctrl+C, a `SIGINT`, leaves a
report with no error at all, the test in flight `skipped` over one `interrupted` result and
every test after it `skipped` with none (measured). That result is the only trace, so
`interrupted` reads results where every other rule reads a test's status, and refuses a run in
which any was cut off. [`a-run-interrupted-by-hand.json`](a-run-interrupted-by-hand.json) is that
run as one worker leaves it, firefox cut off in its first repetition, and passes every other
point: `--write` would record a reading in which five of firefox's six runs were never made.
[`an-interruption-after-a-failure.json`](an-interruption-after-a-failure.json) cuts the recorded
wobble off after its failing first run, which point 3 would call a failure,
[`an-interruption-beside-an-error.json`](an-interruption-beside-an-error.json) the second suite's
last test, and [`a-sigint-in-one-spec-entry.json`](a-sigint-in-one-spec-entry.json) the second of
three tests in the one entry a run from the test directory writes, on two workers and between
two passes. Across the four, the result cut off stands first, in the middle and last of its
case's repetitions, alone, last and between two among its case's results, in both projects and
both suites; [`results-that-are-not-a-list.json`](results-that-are-not-a-list.json) holds the
field itself, read as the one result it holds when it is not a list, as `errors` is. The rule
comes after the stop sentence, which names a cause where a result is a trace — `maxFailures` on
two workers cuts off the test the other one was running, as
[`a-stop-that-cut-off-a-test.json`](a-stop-that-cut-off-a-test.json) holds — and before any other
error: whether a run reached its end is asked before what else went wrong in it, so the global
teardown that threw beside the second suite's interruption goes unnamed.
[`a-sigint-and-a-project-one-short.json`](a-sigint-and-a-project-one-short.json) holds it behind
the setup rules. Only an `interrupted` result is read, and none of the shapes above that are no
sign of a stop is one: [`a-hook-that-failed-once.json`](a-hook-that-failed-once.json) holds the
`skipped` result a failed `beforeAll` leaves, and
[`a-project-that-never-started.json`](a-project-that-never-started.json) the tests a failed
dependency leaves with no result, the dependency failing on a `timedOut` one — the way an e2e
wobble most often fails.

Any other entry in `errors` is `error-outside-tests`, and a narrow match is safe only because of
it: a stop sentence a later version rewords is refused all the same, as an error — or as an
interruption, where the stop cut off a test another worker was running.
[`an-error-outside-any-test.json`](an-error-outside-any-test.json) is why the rule is there — a
worker's unhandled error between two tests takes the next one with it, as a skip with one result
and no annotation, and only the error tells.
[`a-timeout-in-the-teardown.json`](a-timeout-in-the-teardown.json) is a timeout sentence with
another phase in it, after every test had run, and it is refused too: telling an error that cost
a case from one that cost none would mean reading Playwright's wording for every phase it has,
and the gate does not interpret an error outside a test.
[`an-error-thrown-as-a-value.json`](an-error-thrown-as-a-value.json) has no `message` at all — a
thrown value that is not an `Error` keeps only its `value` — and is an error all the same, and
[`errors-that-are-not-a-list.json`](errors-that-are-not-a-list.json) holds the field itself: an
`errors` that is not a list is read as the one error it holds, where read as an empty list, the
way every other field is, it would pass the run. A file that fails to load, a web server that
never answers, a global setup that throws, a `.only` under `forbidOnly` and a timeout before the
tests begin each leave a report of no case at all (measured), which is `empty-report` before it
is an error — as [`a-report-with-no-case.json`](a-report-with-no-case.json) holds, its
`No tests found` and all.

Every case also holds the one thing `--write` decides, which is whether to refuse: it refuses
exactly the runs points 1 to 3 reject and records the rest. That is read off the three points
themselves, not off the set the refusal is written with.

## What these cases do NOT exercise

The reading of the reports off disk, and the register that says where they are. Both are a few
lines and both are guarded by the run itself: a path that resolves to nothing is `no-report`, a
file that is not JSON throws where it is parsed, and JSON of another shape is read as far as it
goes — its lists as lists or as nothing, an `errors` or a `results` that is not one as the entry
it holds — and fails a rule of points 1 and 2 rather than the run. A missing `errors` or
`results` is read as none, as a missing `retries` is read as off and a missing counter in
`stats` as zero: the reporter writes each of them every time, and the reports built by hand here
leave out the empty `errors`, and the `results` of most tests.
Nor a file, `describe` or spec entry with no test in it: the reporter writes none, so a report
of no case is an empty list of files
([`a-report-with-no-case.json`](a-report-with-no-case.json)), and a rule counting files or
entries where it should count cases agrees with it on every report the reporter writes. What is
deliberately not covered is the **repetition job** — whether `--repeat-each` reached Playwright
at all is a property of the workflow, and `retries-on` and `too-few-repetitions` are what notice
when it did not.

Nor an interruption that leaves no `interrupted` result (all measured). One between two tests —
while the next repetition's worker starts, no worker running two repetitions, or once a worker
has taken its tests and before the first begins — leaves tests `skipped` with no result, or one
over a `skipped` result, which is what a failed dependency and a failed `beforeAll` leave too. A
second Ctrl+C, more than a second after the first and while the run still cleans up, has the
report written before the test the first one cut off reports its end, and that test keeps a
`skipped` result; a single Ctrl+C in a test that has already failed leaves that failure. Each
reads as a run that reached its end. The nightly's own cap leaves no report (`no-report`), as a
`SIGTERM` does, so the way in is a repetition interrupted by hand and then written down. Nor a
stop sentence inside a longer message, nor the test suite's teardown sentence on its own.
Playwright writes each stop sentence as the whole of a message, so a rule that finds one
anywhere in a message agrees with this one on every report the reporter writes. The test suite
stops its workers before its own teardown runs, so that teardown runs out of time only after the
suite itself has, or after a `SIGINT` cut the suite short (read in the runner, and the second
measured since: the test cut off keeps a `skipped` result): a rule that takes it for a stop as
well calls that interrupted run an early stop where this one calls it an error outside a test,
and refuses it all the same.

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
