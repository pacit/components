# Negative control of the prose gate

Deliberately defective inputs. `tools/check-prose.mjs` runs all six of its points on each of
them and **requires every one to be rejected — and rejected by the point it declares**. An
input that passes is a fault; an input that fires for a reason other than the one written in
its file is a fault just the same, because it proves something other than what it declares.

The reason it exists is the same as for every other gate here
([`req-quality-negative-control`](../../docs/requirements/quality.md#req-quality-negative-control)):
**a new gate is not ready when it passes — it is ready when it has been shown to fail.**

For this gate the rule bites where a measurement can read nothing and report a pass. That is
not hypothetical: the instrument this gate grew out of spent weeks reporting on a layer it
never read, because the plan's numbering had moved under its regular expression and a loop
was bounded by a heading that does not exist. Nothing was red. A header the walk cannot find
measures zero lines and fits every budget; a layer that empties agrees with itself; a register
entry that stretches with the text excuses the paragraph nobody read.

## How a case is built

A case is not a twenty-sixth copy of the correct input with one thing broken. The gate builds
it from two layers:

1. the **live input** — the repository itself as it stands at the commit under test: the
   headers of `tools/*.mjs`, the positions of `docs/plan.md`, the two independent readings
   beside them (what git carries, and what the plan puts a checkbox in front of), the register
   and the record on disk ([`_reference.json`](_reference.json) says so and records nothing,
   because a stored copy would measure the repository as it was the day somebody stored it),
2. the operations from the case file, applied to a copy of it (`headers` and `positions` —
   a unit's reading rewritten, dropped with `null`, or added under a name nothing carries;
   `clear` — a whole layer emptied; `tracked` and `boxesDelta` — the two independent readings
   rewritten, the second BY a number rather than TO one; `policy` — a register entry added or dropped; `snapshot: null` — the record
   gone; `snapshot.replace` — the record rewritten by a pattern that has to match, because a
   needle that finds nothing is a case that broke nothing).

That way the case file holds **nothing but the defect** — visible without comparing files —
and does not drift from the reference when the repository moves. What it must not do is pin a
reading TO a number: a case set to the count the repository had the day it was written is
armed only until the repository reaches that count, and then it agrees instead of firing. Five
cases here had that shape and one had already gone quiet, which is why a reading is moved by
`{ "delta": n }` ([`lesson-207`](../../docs/lessons.md#lesson-207)).

**The live input must pass.** It is checked first, on the real repository; were it defective,
every case would fire because of it rather than because of its own defect, and every
"rejected" would be false.

## The cases

| file                                                                     | what it breaks                                                                         | point | check         |
| ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------- | ----- | ------------- |
| [`a-gate-with-no-header.json`](a-gate-with-no-header.json)               | `check-acr.mjs` opens with no comment block, so the walk measures nothing in it        | 1     | `measured`    |
| [`a-header-with-no-points.json`](a-header-with-no-points.json)           | a header with no numbered point, whose budget falls to the smallest one by accident    | 1     | `measured`    |
| [`a-block-with-no-word.json`](a-block-with-no-word.json)                 | seventeen lines carrying no word — a block the walk found and did not read             | 1     | `measured`    |
| [`a-count-that-is-not-whole.json`](a-count-that-is-not-whole.json)       | position 5.5 reports 12.5 lines                                                        | 1     | `measured`    |
| [`a-mark-nobody-knows.json`](a-mark-nobody-knows.json)                   | a position marked `[?]`, to which no budget belongs                                    | 1     | `measured`    |
| [`a-script-nobody-tracks.json`](a-script-nobody-tracks.json)             | the walk measured a script git does not carry                                          | 2     | `denominator` |
| [`a-script-the-walk-missed.json`](a-script-the-walk-missed.json)         | git carries a script the walk has no unit for                                          | 2     | `denominator` |
| [`no-script-at-all.json`](no-script-at-all.json)                         | the walk over `tools/` found nothing — an empty denominator passes forever             | 2     | `denominator` |
| [`no-position-at-all.json`](no-position-at-all.json)                     | the plan yielded no position — the layer emptied without the record saying so          | 2     | `denominator` |
| [`a-position-the-parser-lost.json`](a-position-the-parser-lost.json)     | one more checkbox in the plan than the parser read — the numbering moved under it      | 2     | `denominator` |
| [`a-header-past-its-budget.json`](a-header-past-its-budget.json)         | thirty lines against twenty, with no entry in the register                             | 3     | `budget`      |
| [`a-position-past-its-budget.json`](a-position-past-its-budget.json)     | an open position at twenty-five lines against twenty                                   | 3     | `budget`      |
| [`an-excuse-that-stretched.json`](an-excuse-that-stretched.json)         | position 1.1 grew two lines past the count its register entry holds                    | 3     | `budget`      |
| [`a-spent-excuse.json`](a-spent-excuse.json)                             | position 1.1 fits again and the register still excuses it                              | 3     | `budget`      |
| [`a-reason-for-nothing.json`](a-reason-for-nothing.json)                 | the register excuses position 9.9, which is not a position                             | 3     | `budget`      |
| [`an-excuse-with-no-reason.json`](an-excuse-with-no-reason.json)         | an entry whose whole reason is the word "because"                                      | 3     | `budget`      |
| [`no-snapshot.json`](no-snapshot.json)                                   | the record is not on disk                                                              | 4     | `snapshot`    |
| [`a-row-the-record-lost.json`](a-row-the-record-lost.json)               | a row gone from the record while its header is still measured                          | 4     | `snapshot`    |
| [`a-row-for-prose-that-is-gone.json`](a-row-for-prose-that-is-gone.json) | a row for a script the walk did not measure                                            | 4     | `snapshot`    |
| [`a-header-that-grew.json`](a-header-that-grew.json)                     | one line more than the record says, inside the budget all the same                     | 5     | `exact`       |
| [`a-header-that-shrank.json`](a-header-that-shrank.json)                 | one line fewer — prose leaving fails exactly as prose arriving does                    | 5     | `exact`       |
| [`words-without-lines.json`](words-without-lines.json)                   | eighteen more words on the same fifteen lines — the elastic line                       | 5     | `exact`       |
| [`a-point-that-vanished.json`](a-point-that-vanished.json)               | a numbered point dropped, which buys a line of budget by hiding what the gate measures | 5     | `exact`       |
| [`a-position-that-opened.json`](a-position-that-opened.json)             | a closed position reopened, which moves its budget from twelve to twenty               | 5     | `exact`       |
| [`prose-drift.json`](prose-drift.json)                                   | every row right, and the sentence saying the record holds no tolerance reversed        | 6     | `verbatim`    |

Point 1 has five cases because a reading can be hollow in five ways that all parse: a header
the walk never found, one with no point to count a budget from, a block with no word in it, a
count that is not whole, and a mark no budget belongs to. Point 2 has five because a
denominator has two sides and two readings: a unit the walk invented, a unit it skipped, and —
the shape that actually happened — a layer that quietly went empty. Point 3 has six because
a register is the part of a gate that can be turned into a list: an excuse may outlive its
unit, stretch with it, or arrive with no sentence behind it. Point 5 has five because both
columns move in both directions, and because the two derived facts a row carries — a header's
numbered points and a position's state — are what the budget is picked from.
