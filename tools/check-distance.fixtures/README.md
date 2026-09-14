# Negative control of the distance gate

Deliberately defective inputs. `tools/check-distance.mjs` runs all five of its points on each
of them and **requires every one to be rejected — and rejected by the point and the rule it
declares**. An input that passes is a fault; an input that fires for a reason other than the
one written in its file is a fault just the same, because it proves something other than what
it declares.

The reason it exists is the same as for every other gate here
([`req-quality-negative-control`](../../docs/requirements/quality.md#req-quality-negative-control)):
**a new gate is not ready when it passes — it is ready when it has been shown to fail.**

For this gate the rule bites in one particular way. Every defect below makes the distance read
**smaller than it is**, and a distance that reads small is a gate that is green. That is not
hypothetical: what this gate was written for is 173 commits over twelve days that no machine
ever counted, while the nightly on the remote ran on a two-week-old head and went red seven
nights of ten ([`lesson-191`](../../docs/lessons.md#lesson-191)). A checkout with no remote
ref measures the distance against nothing; a date that arrives as text ages to 1970; a clock
that arrives as text makes every age `NaN`, and `NaN` is under every ceiling.

## How a case is built

A case is not a twelfth copy of the correct input with one thing broken. The gate builds it
from two layers:

1. the **live input** — the repository itself as it stands at the commit under test: the
   remote-tracking refs, the commits reachable from `HEAD` that none of them carries, the
   second reading beside them (which refs carry `HEAD` itself), the clock and the register on
   disk ([`_reference.json`](_reference.json) says so and records nothing, because a stored
   copy would measure the repository as it was the day somebody stored it — and a distance
   that grows while nobody looks is this gate's whole subject),
2. the operations from the case file, applied to a copy of it (`remotes`, `carried` and
   `commits` — a layer emptied with `clear` or extended with `add`; `commits.pad` — that many
   commits dated now; an `add` entry dates itself with `daysAgo`, or with a raw `at` when the
   point of the case is a date that does not parse; `now` — the clock set outright or moved by
   `forwardDays`; `policy` — register keys dropped with `drop` or rewritten with `set`).

That way the case file holds **nothing but the defect** — visible without comparing files —
and does not drift from the reference when the repository moves.

**The live input must pass.** It is checked first, on the real repository; were it defective,
every case would fire because of it rather than because of its own defect, and every
"rejected" would be false.

## The cases

| file                                                                             | what it breaks                                                                    | point | check         | rule                     |
| -------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ----- | ------------- | ------------------------ |
| [`no-remote-at-all.json`](no-remote-at-all.json)                                 | a checkout with no remote-tracking ref — the distance measured against nothing    | 1     | `measured`    | `no-remote-ref`          |
| [`a-date-that-does-not-parse.json`](a-date-that-does-not-parse.json)             | a commit date that arrived as text, which ages to 1970 or to `NaN`                | 1     | `measured`    | `date-not-whole`         |
| [`a-clock-that-does-not-parse.json`](a-clock-that-does-not-parse.json)           | the other half of the subtraction — a clock as text makes every age `NaN`         | 1     | `measured`    | `clock-not-whole`        |
| [`a-distance-a-remote-also-carries.json`](a-distance-a-remote-also-carries.json) | a commit counted as unpushed while a remote ref still carries `HEAD`              | 2     | `denominator` | `readings-disagree`      |
| [`a-head-no-remote-carries.json`](a-head-no-remote-carries.json)                 | the quiet direction: a distance of zero that no remote ref agrees with            | 2     | `denominator` | `readings-disagree`      |
| [`a-ceiling-nobody-wrote-down.json`](a-ceiling-nobody-wrote-down.json)           | the register carries no commit ceiling, so the gate would supply its own          | 3     | `ceiling`     | `ceiling-missing`        |
| [`a-ceiling-that-is-not-whole.json`](a-ceiling-that-is-not-whole.json)           | two and a half days — a count of commits or days has no fractional part           | 3     | `ceiling`     | `ceiling-not-whole`      |
| [`a-ceiling-of-zero.json`](a-ceiling-of-zero.json)                               | a ceiling that forbids the commit not yet pushed — red between commit and push    | 3     | `ceiling`     | `ceiling-not-positive`   |
| [`a-ceiling-with-no-reason.json`](a-ceiling-with-no-reason.json)                 | a number whose whole justification is the word "because"                          | 3     | `ceiling`     | `ceiling-without-reason` |
| [`a-day-of-work-on-one-disk.json`](a-day-of-work-on-one-disk.json)               | twenty-one commits made today and pushed nowhere — the count with nothing yet old | 4     | `commits`     | `too-many-commits`       |
| [`a-week-on-one-disk.json`](a-week-on-one-disk.json)                             | one commit, seven days old — inside the count and exactly what the count misses   | 5     | `days`        | `too-old`                |

Point 1 has three cases because a reading can be hollow in three ways that all parse: no
remote to measure against, a commit date that is not a number, and a clock that is not one.
Point 2 has two because the two readings can disagree in both directions, and only one of them
is loud: a count that is too high argues with a `HEAD` the remote carries, while a count of
zero beside a `HEAD` no remote carries is the gate reporting a push that never happened.
Point 3 has four because a ceiling can be absent, fractional, zero, or unexplained — and the
last is the one that matters, since a number with no reason beside it is a number the next
person raises instead of pushing.
