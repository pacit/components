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

A case is not an eighteenth copy of the correct input with one thing broken. The gate builds
it from two layers:

1. `_reference.json` — the reference input: the report, the list of source files, the tree
   as git lists it, the target options and the template exceptions,
2. the operations from the case file, applied to a copy of it (`dropReport`,
   `clearSources`, `dropFromSources`, `clearTree`, `dropFromTree`, `addToTree`,
   `dropFromReport`, `pct`, `branchPct`, `filePct`, `target`, `exceptions`).

That way the case file holds **nothing but the defect** — it is visible without comparing
files — and does not drift from the reference when the shape of the report changes. A case
the builder cannot apply as written is refused by name: a key that is no operation, a value
of the wrong kind, a path that is not there to drop, already there to add or named twice, a
file that is missing, unreadable or not JSON, a check that is not this gate's or a point it
does not stand on, a case with no `description` saying what it breaks, and operations that
leave the reference input exactly as it was. Read loosely, most of them change nothing and
the case passes with the gate's own point blamed for a typo in the fixture; a wrong point
misnumbers every message about its case, and an unreadable file used to stop the run
without its name. A reference that cannot be read is reported once, and no case is judged
on it.

**The reference input must pass.** This is not a check for good measure: were the
reference itself defective, every case would fire because of it rather than because of
its own defect, and every "rejected" would be false — that is, this whole negative
control would become exactly what it stands against.

It carries two things besides, because a case file proves a check FIRES and the gate staying
SILENT has nowhere else to be measured. One is a template that does **not** reach the floor
and an exception saying why: that point 6 keeps quiet where a reason is written down is
shown here, and the case beside it (`template-exception-stale.json`) proves the other side
of that same exception, the one that fires when the metric climbs above what the exception
allows. The other is a tree with one file of every category `NOT_A_SOURCE` excuses — a
stylesheet, a spec, a types file, the version stamp, the mutation harness, the `ng add`
schematic: that point 2 keeps quiet on each of them is shown here, and a category deleted
reddens the reference rather than nothing.

The input is **data, not a directory on disk**: the gate examines the decision, not the
reading of files. The plumbing defends itself — were the source glob or the path
normalisation from the report to stop working, point 2 or 3 fires on the real run, loudly
and at once. A glob that stops working is loud; a glob **narrowed** was not, and no case
could make it so, because every case hands the gate the list the globs produce
([`lesson-237`](../../docs/lessons.md#lesson-237)). The review that followed PR #14 measured
it: a copy of the gate without the migrations' pattern walked 145 files instead of 146,
passed, and rejected all twelve cases on their own points. Hence the tree: git's listing of
the library is the one reading of it that no pattern of this gate produces, and point 2
holds the list to it both ways — the listing is read under a pathspec, and the other
direction is what keeps that pathspec from being narrowed in turn.

## The cases

| file                                                                         | what it breaks                                                | point |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------- | ----- |
| [`missing-report.json`](missing-report.json)                                 | the run left no coverage report                               | 1     |
| [`no-sources.json`](no-sources.json)                                         | an empty list of source files, and an empty listing with it   | 2     |
| [`no-tree.json`](no-tree.json)                                               | an empty listing of the tree — every source outside it        | 2     |
| [`file-outside-sources.json`](file-outside-sources.json)                     | a tracked source the patterns no longer reach                 | 2     |
| [`migration-behind-ng-add-excuse.json`](migration-behind-ng-add-excuse.json) | a migration under an `ng add` excuse widened to `schematics/` | 2     |
| [`template-outside-sources.json`](template-outside-sources.json)             | a template the patterns no longer reach                       | 2     |
| [`source-outside-tree.json`](source-outside-tree.json)                       | a source the narrowed listing of the tree no longer holds     | 2     |
| [`file-outside-report.json`](file-outside-report.json)                       | a source file outside the report, with a rising percentage    | 3     |
| [`coverage-off.json`](coverage-off.json)                                     | the target has a threshold but collects no coverage           | 4     |
| [`no-threshold.json`](no-threshold.json)                                     | the target collects coverage but has no threshold             | 4     |
| [`threshold-below-minimum.json`](threshold-below-minimum.json)               | a threshold below the minimum from `req-quality-coverage`     | 4     |
| [`branch-threshold-unset.json`](branch-threshold-unset.json)                 | a line threshold declared and no branch one                   | 4     |
| [`below-threshold.json`](below-threshold.json)                               | lines below the declared threshold                            | 5     |
| [`branches-below-threshold.json`](branches-below-threshold.json)             | branches below the declared threshold                         | 5     |
| [`template-outside-report.json`](template-outside-report.json)               | a template outside the report — a component nobody renders    | 3     |
| [`template-below-floor.json`](template-below-floor.json)                     | a template below the floor of its own                         | 6     |
| [`template-exception-stale.json`](template-exception-stale.json)             | an exception the metric has climbed above                     | 6     |

Point 4 has four cases, because there are four different ways of disarming the same
enforcement: turning the measurement off, removing the thresholds, declaring one of the two
and lowering it. Each leaves a `project.json` that looks sensible and each ends the run
green — the third one especially, because `coverageThresholds: { lines: 80 }` reads like a
threshold is in place while every condition in the library stands under none
([`lesson-71`](../../docs/lessons.md#lesson-71)).

Point 2 has six cases, and five of them came with the tree. The empty list is the plumbing
broken, and its case empties the listing too: with the listing full, an empty list fires
one check over, so the pair is the one input only the list's emptiness check stands in
front of. The empty listing alone is the narrowed listing in the extreme, every source
outside it (an emptiness check of its own was measured to be decoration — disabled, the
case still fired one check over, and no input needed it — so the listing gets a message
there, not a point); the file outside
the sources is the list **narrowed** — still in the tree, still in the report, and demanded by
nobody — and the template outside the sources is the same narrowing for the other half of
the extension category, which every other case leaves unmeasured (with templates excused on
the tree side, both `.html` patterns could go and the gate walked 106 files instead of 146).
The migration case is the control of a control: the category excusing `ng add` reads
`schematics/ng-add/`, and every other case here is a path under `src/` that the wider
spelling `schematics/` would leave alone, so without it the excuse could widen back with no
case reddening. The source outside the tree holds the **listing** itself: it is read under
a pathspec, and a pathspec is a pattern the cases cannot reach any more than they could
reach `SOURCES` — narrowed to `src/`, the tree side would stop seeing the migrations and the
fifth pattern could leave again unseen (the review of PR #16 reproduced the 145 with an
exclusion pathspec, `:!schematics/migrations`). Measured by reverting each: with the list's
emptiness check disabled `no-sources.json` alone passes; with the rule disabled the three
`unaccounted` cases pass and no other; with the excuse widened the
migration case alone passes; with `.html` struck from the category the template case alone
passes; with the `outside-tree` check disabled `no-tree.json` and `source-outside-tree.json`
pass and no other. And on the real repository the pattern struck out names the migration as
reached by no pattern, a `SKIPPED` widened to strike every schematic names it as struck, and
the pathspec narrowed to `src/` fires `outside-tree` on 145 files. The two lists are spelled
apart so that a `SKIPPED` predicate widened leaves the tree's files behind; a category of
`NOT_A_SOURCE` widened costs the floor nothing — the patterns still demand its files — and
only blinds the tree side to them, which is the half of this control a second edit needs.

Point 3 is the one that actually catches the regression. Points 4 and 5 guard the number;
point 3 guards the **denominator** it came from — and that is what quietly shrinks. Point 6
guards the part of the denominator too small to matter to the total: the templates are a
seventh of the lines, so any one of them can go unrendered without moving the percentage off
its threshold, and a floor per template is the only thing that notices.

## Adding a new check to the gate

A new check in `check-coverage.mjs` comes **together with the case** that fires it, and
with an identifier that tells you it was this check that fired — and with its row in
`CHECK_POINTS`, since a case naming a check the table does not hold is refused. A check
with no case is exactly what [`req-axis`](../../docs/00-axis.md) forbids: a promise with no
machine able to fire on it, only one floor up. That is why a row no readable case declares
is a violation of its own: the run walks the cases, so a check losing its last case would
otherwise leave nothing to notice it go.

Both rules start from the table, so the table is held in turn to the gate's **own source**.
A check thrown with neither a row nor a case met neither of them: the review of PR #17 named
it, and a copy of the gate throwing `new CoverageError('impossible', …)` with no row and no
case ran green with 17 cases. The run reads its own file, collects the check of every
`new CoverageError('…'`, and requires that set to equal the rows both ways — a check thrown
with no row is named with its line, and a row no construction names is named too: the table
would list a check the source does not throw by name. A check is read only where the class
is constructed by name with the check as a plain literal first argument; every other use of
the name — a variable or a concatenation for the check, a helper's parameter, a subclass, an
alias, `new (CoverageError)(…)` — is reported by its line, because the table cannot be held
to a check the source does not name. Declaring the class, `instanceof` and a mention in
backticks are left alone, and the text is read comments included, so a construction quoted
in a comment counts as one. Measured on copies of the gate: the phantom throw reddens naming
`impossible` and its line, a row no construction names reddens naming it, the phantom given
a row asks for its case instead, a subclass or an alias throwing a check of its own reddens
by its line, a check added whole — throw, row and case — is green with 18 cases, and the
real run stays green with 17.
