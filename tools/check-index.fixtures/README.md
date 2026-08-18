# Negative control of the index gate

Deliberately defective inputs. `tools/check-index.mjs` runs all five of its points on each of
them and **requires every one to be rejected — and rejected by the point it declares**. An
input that passes is a fault; an input that fires for a reason other than the one written in
its file is a fault just the same, because it proves something other than what it declares.

The reason it exists is the same as for every other gate here
([`req-quality-negative-control`](../../docs/requirements/quality.md#req-quality-negative-control)):
**a new gate is not ready when it passes — it is ready when it has been shown to fail.**

For this gate the rule has a second edge. What it guards is a list that describes a directory,
and a wrong list is the one defect that leaves the document looking finished: a paraphrased
title reads like a title, a short list of requirements reads like a list, and a case that is in
the tree and not in the table is invisible exactly where a reader would look for it. Eleven of
the twenty rows of `docs/decisions/README.md` were wrong when this gate first ran, in a file a
hand had corrected two tasks earlier ([`lesson-75`](../../docs/lessons.md#lesson-75)).

## How a case is built

A case is not a twenty-fourth copy of the correct input with one thing broken. The gate builds
it from two layers:

1. [`_reference.json`](_reference.json) — the reference input: three decisions, three fixture
   trees and a map. It is the smallest thing shaped like this repository — one tree with a
   table of its cases, one with a README and no table, one with no README at all,
2. the operations from the case file, applied to a copy of it (`dropDecisions`, `decisions`,
   `index`, `dropTrees`, `trees` with `dropCases` / `cases` / `readme` / `points`, `map`,
   `mapText`, `mapActual`).

That way the case file holds **nothing but the defect** — visible without comparing files —
and does not drift from the reference when the shape of the input changes.

**The index is never written into a case.** `@render` is the directory's own rendering after
the case's edits and `@stale` the one from before them, so a case says **which side moved**
rather than carrying a copy of the table. A copy would drift from the renderer, which is the
defect this whole gate was opened for — and the reference would be the first to drift.

**The reference input must pass.** Were it defective itself, every case would fire because of
it rather than because of its own defect, and every "rejected" would be false. It carries the
two shapes that are easy to leave unexercised: a decision whose status is not `accepted`, which
the renderer writes into the title cell, and one with no `Implements:` line at all, which
renders an em dash.

## The cases

| case                                          | point | check     | defect                                                    |
| --------------------------------------------- | ----: | --------- | --------------------------------------------------------- |
| `no-decision-in-the-directory`                |     1 | `corpus`  | the walk finds no decision, and `--write` would save that |
| `the-index-section-is-gone`                   |     1 | `corpus`  | no `## Index` section to compare the directory against    |
| `no-fixtures-tree-at-all`                     |     1 | `corpus`  | no `*.fixtures/` tree, so points 3 to 5 rule on nothing   |
| `not-one-table-of-cases`                      |     1 | `corpus`  | no README claims to list its cases                        |
| `no-map-in-the-documentation`                 |     1 | `corpus`  | the map block is gone, and half of point 5 with it        |
| `decision-missing-from-the-index`             |     2 | `index`   | a decision written, a row not added                       |
| `index-row-for-a-decision-that-is-gone`       |     2 | `index`   | the row outlives the file it links to                     |
| `index-title-paraphrased`                     |     2 | `index`   | the index shortens a title the heading has since changed  |
| `index-implements-out-of-date`                |     2 | `index`   | one requirement named where the decision carries two      |
| `decision-without-a-heading`                  |     2 | `index`   | no `# NNNN — Title`, so the row renders from nothing      |
| `case-missing-from-the-table`                 |     3 | `cases`   | a prepared case the table does not name                   |
| `table-row-for-a-case-that-is-gone`           |     3 | `cases`   | the row promises proof the tree no longer holds           |
| `case-listed-twice`                           |     3 | `cases`   | one case, two rows, free to say two things                |
| `a-cases-section-with-no-table`               |     3 | `cases`   | the heading claims a list and there is none under it      |
| `point-column-drifted`                        |     4 | `columns` | the row sends the reader to another point of the gate     |
| `check-column-drifted`                        |     4 | `columns` | the point's name in the table is not the one in the gate  |
| `rule-column-drifted`                         |     4 | `columns` | the row names a rule the case does not fire on            |
| `column-for-a-rule-the-case-does-not-declare` |     4 | `columns` | a rule in the table where the case declares none          |
| `count-of-points-out-of-date`                 |     5 | `counts`  | the gate grew a point, the sentence did not               |
| `count-missing-from-the-sentence`             |     5 | `counts`  | the number is dropped rather than corrected               |
| `a-count-the-gate-refuses-to-guess-at`        |     5 | `counts`  | a word outside the list this gate reads                   |
| `a-gate-whose-points-cannot-be-counted`       |     5 | `counts`  | the header numbers its points other than 1..n             |
| `map-count-out-of-date`                       |     5 | `counts`  | the map counts fewer decisions than the directory holds   |
| `a-count-nobody-counts`                       |     5 | `counts`  | a number in the map with no counter behind it             |

The four cases of point 4 are kept apart on purpose: they are one rule read three ways round
and one read backwards. A `point`, a `check` and a `rule` drift independently — the number can
be right while the name is stale — and the fourth is the other direction entirely, a table
claiming something where the case declares nothing. Without it the column would only ever be
compared when there was something to compare it with.

**Point 4 stays silent about a case that declares nothing at all.** A prepared `.md` input —
`check-docs.fixtures` is made of them — carries no `fixture.json`, so the column in the table is
the only account of it there is, not a second one to be held against a first. The reference
input carries such a case for that reason.

**This gate's own tree is measured by this gate.** The table above is held to the directory it
describes by the point it declares, and the sentence at the top is counted against the five
points of `check-index.mjs`. That is not a curiosity: the first list to drift is the one written
by whoever is busy writing the thing that measures lists.
