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

A case is not a forty-second copy of the correct input with one thing broken. The gate builds
it from two layers:

1. the **live input** — the repository itself as it stands at the commit under test: the
   headers of `tools/*.mjs`, the positions of `docs/plan.md`, the two independent readings
   beside them (what git carries, and what the plan puts a checkbox in front of), the register
   and the record on disk ([`_reference.json`](_reference.json) says so and records nothing,
   because a stored copy would measure the repository as it was the day somebody stored it),
2. the operations from the case file, applied to a copy of it (`headers` and `positions` —
   a unit's reading rewritten, dropped with `null`, or added under a name nothing carries;
   `clear` — a whole layer emptied; `tracked` and `boxesDelta` — the two independent readings
   rewritten, the second BY a number rather than TO one; `policy` — a register entry added or
   dropped; `snapshot: null` — the record gone; `snapshot.replace` — the record rewritten by a
   pattern that has to match, because a needle that finds nothing is a case that broke
   nothing; `plan` — lines the gate's own reader reads as a plan of their own, whose positions
   join the live ones and whose checkboxes join the count).

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

| file                                                                                                 | what it breaks                                                                                                             | point | check         |
| ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ----- | ------------- |
| [`a-gate-with-no-header.json`](a-gate-with-no-header.json)                                           | `check-acr.mjs` opens with no comment block, so the walk measures nothing in it                                            | 1     | `measured`    |
| [`a-header-with-no-points.json`](a-header-with-no-points.json)                                       | a header with no numbered point, whose budget falls to the smallest one by accident                                        | 1     | `measured`    |
| [`a-block-with-no-word.json`](a-block-with-no-word.json)                                             | seventeen lines carrying no word — a block the walk found and did not read                                                 | 1     | `measured`    |
| [`a-count-that-is-not-whole.json`](a-count-that-is-not-whole.json)                                   | position 3.3 reports 12.5 lines                                                                                            | 1     | `measured`    |
| [`a-mark-nobody-knows.json`](a-mark-nobody-knows.json)                                               | a position marked `[?]`, to which no budget belongs                                                                        | 1     | `measured`    |
| [`a-line-after-the-span-closed.json`](a-line-after-the-span-closed.json)                             | a thirteenth line in column 0 after the span has closed, which the parser keeps in the position and the body does not read | 1     | `measured`    |
| [`a-link-title-wrapped-into-column-0.json`](a-link-title-wrapped-into-column-0.json)                 | an open position whose link title wraps, which prettier moves to column 0 as it moves a span                               | 1     | `measured`    |
| [`inline-math-left-in-column-0.json`](inline-math-left-in-column-0.json)                             | inline math whose second line stands in column 0, where prettier leaves it                                                 | 1     | `measured`    |
| [`a-lost-line-past-the-budget.json`](a-lost-line-past-the-budget.json)                               | fourteen lines, two past the budget, and then a line lost in column 0 — the loss is reported before the count              | 1     | `measured`    |
| [`a-nested-position-that-lost-a-line.json`](a-nested-position-that-lost-a-line.json)                 | a nested position whose link title prettier moves to column 0 — refused as itself, not as its parent                       | 1     | `measured`    |
| [`a-position-that-goes-on-after-a-nested-one.json`](a-position-that-goes-on-after-a-nested-one.json) | an outer position that goes on, indented, after the one nested in it                                                       | 1     | `measured`    |
| [`a-script-nobody-tracks.json`](a-script-nobody-tracks.json)                                         | the walk measured a script git does not carry                                                                              | 2     | `denominator` |
| [`a-script-the-walk-missed.json`](a-script-the-walk-missed.json)                                     | git carries a script the walk has no unit for                                                                              | 2     | `denominator` |
| [`no-script-at-all.json`](no-script-at-all.json)                                                     | the walk over `tools/` found nothing — an empty denominator passes forever                                                 | 2     | `denominator` |
| [`no-position-at-all.json`](no-position-at-all.json)                                                 | the plan yielded no position — the layer emptied without the record saying so                                              | 2     | `denominator` |
| [`a-position-the-parser-lost.json`](a-position-the-parser-lost.json)                                 | one more checkbox in the plan than the parser read — the numbering moved under it                                          | 2     | `denominator` |
| [`a-box-the-plan-reader-missed.json`](a-box-the-plan-reader-missed.json)                             | a checkbox with no number under a position, counted by the case the way the live plan counts its own                       | 2     | `denominator` |
| [`a-header-past-its-budget.json`](a-header-past-its-budget.json)                                     | thirty lines against twenty, with no entry in the register                                                                 | 3     | `budget`      |
| [`a-position-past-its-budget.json`](a-position-past-its-budget.json)                                 | an open position at twenty-five lines against twenty                                                                       | 3     | `budget`      |
| [`an-excuse-that-stretched.json`](an-excuse-that-stretched.json)                                     | position 3.1 grew two lines past the count its register entry holds                                                        | 3     | `budget`      |
| [`a-spent-excuse.json`](a-spent-excuse.json)                                                         | position 3.3 fits its budget and the register excuses it all the same                                                      | 3     | `budget`      |
| [`a-reason-for-nothing.json`](a-reason-for-nothing.json)                                             | the register excuses position 9.9, which is not a position                                                                 | 3     | `budget`      |
| [`an-excuse-with-no-reason.json`](an-excuse-with-no-reason.json)                                     | an entry whose whole reason is the word "because"                                                                          | 3     | `budget`      |
| [`a-code-span-wrapped-into-column-0.json`](a-code-span-wrapped-into-column-0.json)                   | a code span over three lines, two of them in column 0 — thirteen lines against twelve                                      | 3     | `budget`      |
| [`a-double-backtick-span-wrapped.json`](a-double-backtick-span-wrapped.json)                         | a span of two backticks holding one, wrapped into column 0 — a lexer pairing backticks closes it early                     | 3     | `budget`      |
| [`a-blank-line-inside-the-body.json`](a-blank-line-inside-the-body.json)                             | a second paragraph after a blank line, indented — thirteen lines against twelve                                            | 3     | `budget`      |
| [`a-span-in-the-title.json`](a-span-in-the-title.json)                                               | a title that opens a span and closes it in column 0 on the next line                                                       | 3     | `budget`      |
| [`no-snapshot.json`](no-snapshot.json)                                                               | the record is not on disk                                                                                                  | 4     | `snapshot`    |
| [`a-row-the-record-lost.json`](a-row-the-record-lost.json)                                           | a row gone from the record while its header is still measured                                                              | 4     | `snapshot`    |
| [`a-row-for-prose-that-is-gone.json`](a-row-for-prose-that-is-gone.json)                             | a row for a script the walk did not measure                                                                                | 4     | `snapshot`    |
| [`a-blank-line-before-column-0.json`](a-blank-line-before-column-0.json)                             | twelve lines, a blank one, and a paragraph in column 0 that opens a span of its own                                        | 4     | `snapshot`    |
| [`a-position-under-a-position.json`](a-position-under-a-position.json)                               | twelve lines, and a position indented under them whose span in column 0 is its own                                         | 4     | `snapshot`    |
| [`a-bullet-beside-the-position.json`](a-bullet-beside-the-position.json)                             | twelve lines, and a plain bullet right after them in column 0 — a sibling, outside the position                            | 4     | `snapshot`    |
| [`a-position-that-opens-with-a-position.json`](a-position-that-opens-with-a-position.json)           | a position whose first line under it is a nested one, wrapping a span of its own into column 0                             | 4     | `snapshot`    |
| [`a-header-that-grew.json`](a-header-that-grew.json)                                                 | one line more than the record says, inside the budget all the same                                                         | 5     | `exact`       |
| [`a-header-that-shrank.json`](a-header-that-shrank.json)                                             | one line fewer — prose leaving fails exactly as prose arriving does                                                        | 5     | `exact`       |
| [`words-without-lines.json`](words-without-lines.json)                                               | eighteen more words on the same fifteen lines — the elastic line                                                           | 5     | `exact`       |
| [`a-point-that-vanished.json`](a-point-that-vanished.json)                                           | a numbered point dropped, which buys a line of budget by hiding what the gate measures                                     | 5     | `exact`       |
| [`a-position-that-closed.json`](a-position-that-closed.json)                                         | an open position closed, which moves its budget from twenty to twelve                                                      | 5     | `exact`       |
| [`words-of-a-span-continuation.json`](words-of-a-span-continuation.json)                             | a span's continuation whose words the record left out, though its line is counted                                          | 5     | `exact`       |
| [`prose-drift.json`](prose-drift.json)                                                               | every row right, and the sentence saying the record holds no tolerance reversed                                            | 6     | `verbatim`    |

Point 1 has eleven cases because a reading can be hollow in five ways that all parse: a header
the walk never found, one with no point to count a budget from, a block with no word in it, a
count that is not whole, and a mark no budget belongs to — and because a position can hold a
line the reading would lose or charge to another, in the six shapes below. Point 2 has six
because a denominator has two sides and two readings: a unit the walk invented, a unit it
skipped, and — the shape that actually happened — a layer that quietly went empty; the sixth
holds that a case's own checkboxes are counted as a second reading too. Point 3 has ten because
a register is the part of a gate that can be turned into a list — an excuse may outlive its
unit, stretch with it, or arrive with no sentence behind it — and because four positions built
one line past the budget hold the reading: one that loses a line never gets there. Point 4 has
seven: the record gone, a row lost, a row kept for prose that is gone, and four cases about the
reading below. Point 5 has six because both columns move in both directions, because the two
derived facts a row carries — a header's numbered points and a position's state — are what the
budget is picked from, and because a span's continuation carries its words as well as its line.

Sixteen cases reach the reading itself rather than a count it produced, through `plan`. A
position's body is its own line and what hangs under it, down to the next position at any
indent or to column 0 — and a line in column 0 is still its own when it continues a code span,
which prettier prints with its lines unindented. Whatever else the parser keeps inside the
position, outside the items of positions nested in it, and the body does not read is refused on
point 1, because it would leave the budget unmeasured or be charged to another: the text after
a span has closed, a link title prettier moves to column 0, inline math it leaves there, and
anything a position carries after one nested in it, which has to be the last thing in it. The
refusal comes before the budget, so that a position with a lost line is told what it lost rather
than to cut a count it never finished (`a-lost-line-past-the-budget`); a nested position answers
for its own lines, and one standing directly under its parent's title is found as nested all the
same. The cases on points 3 and 4 stand at the budget's edge, where a reading one line off
shows: those on point 3 are one line over it, so a reading that loses a line never reaches it,
and three on point 4 are exactly at it — a blank line before column-0 text, a position under a
position, a bullet beside the position — so a reading that takes a line too many stops at the
budget, and one that refuses a line outside the position stops at point 1, before either reaches
the missing row they declare. `a-box-the-plan-reader-missed` keeps the operation's checkbox
count a second reading, and `words-of-a-span-continuation` holds that a continuation's words
count with its line.
