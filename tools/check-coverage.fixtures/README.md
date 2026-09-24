# Negative control of the coverage gate

Deliberately defective inputs. `tools/check-coverage.mjs` runs all six of its points on
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

A case is not a twenty-third copy of the correct input with one thing broken. The gate
builds it from two layers:

1. `_reference.json` — the reference input: the report, the list of source files, the tree
   as git lists it, the target options and the template exceptions,
2. the operations from the case file, applied to a copy of it (`dropReport`,
   `clearSources`, `dropFromSources`, `clearTree`, `dropFromTree`, `addToTree`,
   `dropFromReport`, `pct`, `branchPct`, `filePct`, `reportRoot`, `reportRootFiles`,
   `absoluteReport`, `target`, `exceptions`).

That way the case file holds **nothing but the defect** — it is visible without comparing
files — and does not drift from the reference when the shape of the report changes. A case
the builder cannot apply as written is refused by name: a key that is no operation, a value
of the wrong kind, a switch set to `false`, a path that is not there to drop, already there
to add or named twice, a move of the report's files that moves none or leaves one where it
was, a file that is missing, unreadable or not JSON, a check that is not this gate's or a
point it does not stand on, a case with no `description` saying what it breaks, and
operations that leave the reference input exactly as it was. Read loosely, most of them
change nothing and the case passes with the gate's own point blamed for a typo in the
fixture; a wrong point misnumbers every message about its case, and an unreadable file used
to stop the run without its name. A reference that cannot be read is reported once, and no
case is judged on it.

**The reference input must pass.** This is not a check for good measure: were the
reference itself defective, every case would fire because of it rather than because of
its own defect, and every "rejected" would be false — that is, this whole negative
control would become exactly what it stands against.

It carries two things besides, because a case file proves a check FIRES and shows the gate
staying SILENT only on the points before its own: the reference is the one input on which
every point stays silent. One is a template that does **not** reach the floor and an
exception saying why: that point 6 keeps quiet where a reason is written down is shown here
and nowhere else, and the case beside it (`template-exception-stale.json`) proves the other
side of that same exception, the one that fires when the metric climbs above what the
exception allows. The other is a tree with one file of every category `NOT_A_SOURCE` excuses
— a stylesheet, a spec, a types file, the version stamp, the mutation harness, the `ng add`
schematic: that point 2 keeps quiet on each of them is shown here and by every case past
point 2, so a category deleted reddens the reference and those thirteen cases rather than
nothing (measured with the mutation harness's category struck).

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

| file                                                                                   | what it breaks                                                | point |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------------- | ----- |
| [`missing-report.json`](missing-report.json)                                           | the run left no coverage report                               | 1     |
| [`report-from-another-checkout.json`](report-from-another-checkout.json)               | a report another checkout wrote — every file outside this one | 1     |
| [`report-from-a-nested-checkout.json`](report-from-a-nested-checkout.json)             | a report a checkout nested in this one wrote                  | 1     |
| [`report-partly-from-another-checkout.json`](report-partly-from-another-checkout.json) | every file of the report elsewhere but one                    | 3     |
| [`report-keyed-by-absolute-path.json`](report-keyed-by-absolute-path.json)             | keys left absolute, in this very checkout                     | 3     |
| [`report-with-no-file.json`](report-with-no-file.json)                                 | a report with its totals and not one file                     | 3     |
| [`no-sources.json`](no-sources.json)                                                   | an empty list of source files, and an empty listing with it   | 2     |
| [`no-tree.json`](no-tree.json)                                                         | an empty listing of the tree — every source outside it        | 2     |
| [`file-outside-sources.json`](file-outside-sources.json)                               | a tracked source the patterns no longer reach                 | 2     |
| [`migration-behind-ng-add-excuse.json`](migration-behind-ng-add-excuse.json)           | a migration under an `ng add` excuse widened to `schematics/` | 2     |
| [`template-outside-sources.json`](template-outside-sources.json)                       | a template the patterns no longer reach                       | 2     |
| [`source-outside-tree.json`](source-outside-tree.json)                                 | a source the narrowed listing of the tree no longer holds     | 2     |
| [`file-outside-report.json`](file-outside-report.json)                                 | a source file outside the report, with a rising percentage    | 3     |
| [`coverage-off.json`](coverage-off.json)                                               | the target has a threshold but collects no coverage           | 4     |
| [`no-threshold.json`](no-threshold.json)                                               | the target collects coverage but has no threshold             | 4     |
| [`threshold-below-minimum.json`](threshold-below-minimum.json)                         | a threshold below the minimum from `req-quality-coverage`     | 4     |
| [`branch-threshold-unset.json`](branch-threshold-unset.json)                           | a line threshold declared and no branch one                   | 4     |
| [`below-threshold.json`](below-threshold.json)                                         | lines below the declared threshold                            | 5     |
| [`branches-below-threshold.json`](branches-below-threshold.json)                       | branches below the declared threshold                         | 5     |
| [`template-outside-report.json`](template-outside-report.json)                         | a template outside the report — a component nobody renders    | 3     |
| [`template-below-floor.json`](template-below-floor.json)                               | a template below the floor of its own                         | 6     |
| [`template-exception-stale.json`](template-exception-stale.json)                       | an exception the metric has climbed above                     | 6     |

Point 1 has three cases: a report that is not there, one another checkout wrote, and one a
checkout nested in this one wrote — nx shares its cache across git worktrees and v8 keys the
report by absolute path, so one worktree can be handed another's
([`lesson-240`](../../docs/lessons.md#lesson-240)), and every worktree under
`.claude/worktrees/` lies inside the main checkout. `reportRoot` moves the reference report's
files under another directory, which is how such a report reads once made relative here;
"here" is this checkout's library, not everything under its root, or the nested report never
leaves it. Three cases on point 3 hold the other edges of the check, because its claim is
"another checkout wrote this" and only a report none of whose files lies here makes it: every
file elsewhere but one (`reportRootFiles` names the ones `reportRoot` moves), keys left
absolute in this very checkout (`absoluteReport` — lost normalisation, not another checkout),
and a report with no file at all. The review of PR #19 found each edge held by nothing, in
three rounds: copies of the gate reading "any file" for "every file", letting an empty report
through as foreign, and reading a path's spelling instead of its place ran green with 18
cases; "most files" and "all but one" with 21, while the partial case moved one file of
three; and the rule this check first had — a file is elsewhere when it climbs out of the
checkout — left the nested report to point 3, on all 146 files of the real one. Measured on
such copies since: each reddens its own case and no other, and with the check disabled the
two reports another checkout wrote alone fire `complete`.

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
`new CoverageError('…'`, and requires that set to equal the rows both ways — a check
constructed with no row is named with its line, and a row no construction names is named
too: the table would list a check the source does not throw by name.

The source is read by the TypeScript parser, not by a pattern over its text. PR #18 read it
with patterns first, and its review found one taking a comment that ended in `class` or
`instanceof` for the keyword: four copies threw a check past it and stayed green. That is
[`lesson-236`](../../docs/lessons.md#lesson-236) one gate over — a pattern written against a
parser is a second lexer. A check is the non-empty string literal a construction by name
passes first. Every other reference to the class — a variable or a concatenation for the
check, a helper's parameter, a subclass, an alias, an export, `Reflect.construct`, a class of
the same name in an inner scope — is reported by its line, because the table cannot be held
to a check the source does not name; the top-level declaration and the right side of
`instanceof` are left alone, and comments and strings are no code, so they are not read at
all. A file the parser reads otherwise than Node runs it (`</` is a JSX token to it) is
reported and not read. What a reading of the code cannot follow is what happens as it runs:
a check relabelled on the error, a construction reached through another expression (`eval`,
`.constructor`, `this`), or a second error class the catches accept — the first two are
answered below. A violation reported without the class at all — a line pushed straight onto
`problems` — is outside the table.

The unit of both rules is the check, not the place it is thrown: a second construction under
a check that already had a case needed no case of its own. The review of PR #18 measured it —
`if (target.coverageThresholds.functions === 0) throw new CoverageError('threshold', …)` after
point 4 left the gate green — and `req-axis` says of a construction what it says of a check.
So each construction of a check its cases declare has to be reached by one of them, or it is
named with its line and column (`unfired`): one added under an old check, and a dead one no
input reaches. One defect is named by one rule, once per case it trips: a check no readable
case declares is named whole (`uncovered`); a check with a case named for itself — it passed,
fired another check, or fired where no construction of it is read — waits for that case; and
a construction a case reached under another check is that case's line. A malformed case
counts for nothing, here as for `uncovered`, so a construction only it would reach is named
beside it.

A run and a reading have to agree on which construction fired, and they meet at its `new`.
V8 places a construction's frame there, whatever lines its name and arguments run over; the
error records that frame's line and column in `check-coverage.mjs` (`siteOf`, from V8's
frames, not from the text of the stack, whose first line is a message of several lines here);
and `throwsOf` places a construction by name at its `new` too — so two constructions on one
line are two. A case that fires its check where the reading puts no construction of it, or
outside the gate's file, is named (`unplaced`). A check relabelled on the error is therefore
red whatever the cases do — a case reaching the construction fires another check than the one
read there, and none reaching it leaves it unreached — and a construction through
`.constructor` or `eval` is seen once a case fires it, and stays unseen while none does. So
does a condition joined to an existing construction's test (`||`): it is that construction,
and any one case reaching it holds both.

Measured once, on copies, and held by nothing afterwards: every rule of this control has a
reject path only a defective input takes, and the real input takes none of them — its
constructions name literal checks, its cases are well-formed, every row has one — so a rule
loosened or struck out left the run exactly as green. The run holds them itself now, every
time, on prepared inputs in the gate, each answered as written beside it or named:

- `READINGS`, sources `throwsOf` has to read check by check and line by line: a check in
  double quotes or backticks read; a variable, a concatenation, a `${}` template, a number or
  a regular expression read as none; a helper `fail(check, message)`, a subclass handing a
  literal to `super`, an alias, an export, `Reflect.construct`, a class declared in an inner
  scope and the class on the right of an operator other than `instanceof` reported;
  `new (Name)(…)` read through its parentheses and placed at its `new` when the name stands on
  a line of its own, and a comment between `new`, the name and `(` read through; a use that is
  no construction placed at the name, even where its expression starts a line above; a line
  comment ending in `class`, `instanceof` or `new` above the name excusing nothing; a name
  that merely contains the class's not taken for it; a construction quoted in a comment or a
  string, and the name in backticks, not read — under the patterns a quoted construction
  counted, under the parser it does not;
- `ANSWERS`, changes to a prepared input of its own — two rows, a source constructing both, a
  reference and a case for each — with what `controlOf`, the whole control as a function of
  its input, has to find, down to the location a message gives: two literal phantoms with no
  row, and one named like a member of every object; a row nothing names; a use no check
  resolves from, twice on one line, and every use unresolved, on two; a gate of one check,
  and a class of another name than `ERROR_CLASS`; a source the parser misreads in one place,
  in two, and in two with the first not on the last line; a reference that fails; a row whose
  one case passes, one whose one case fires another check, a case firing another check beside
  a row's own, and one firing another on its own point; a line total and a branch total each
  changed alone under the other's threshold, so that the builder writes each where it
  belongs; no case at all, a row with no case, and one whose only case is malformed
  (`uncovered`, both); a second construction of a check that no case reaches, the first of
  two, the last two of three, two reached by a case each, two on one line with one reached,
  and one of a check beside another check waiting for its case (`unfired`); a check of two
  constructions waiting for its case, which passed, fired another check or fired where none of
  them is read; a construction only a case of another check reaches, and one reached as
  another check, as a relabelled one is; a case firing its check where no construction of it
  is read, on its construction's line at another column, and outside the source (`unplaced`)
  — each case of the prepared input names the site of what it fires, since the checks it runs
  are this gate's own;
- `PLACES`, frames `siteOf` has to place: one of the gate's file at its line and column, and
  one of another script — unnamed, as an `eval` makes, or another file — nowhere; the real
  run holds the rest, since every construction a case fires has to stand where the reading
  puts one;
- `REFUSED` and `REFERENCE_REFUSED`, a case and a reference for every reason the builder
  refuses one, with a part of that reason — a refusal giving another reason is a rule gone
  quiet behind a neighbour — and one per edge where a rule has several: each key's kind of
  value, and each switch set to false; each operation `dropReport` excludes; each list whose
  paths must be there, one path of two that is not, one of two that is no string, and a list
  set to `null`; every kind of JSON a file can be instead of an object, and one file of two in
  the report that is none; a report emptied before its keys are made absolute; the names every
  object inherits, `__proto__` and `constructor`, that only `has` refuses. The two refusals
  that need a reference of their own — a metric that is no object, a move landing one of two
  files on a file the report holds — stand in `ANSWERS`, and the one prepared description is
  exactly the 40 characters the rule asks for.

The prepared sources never spell out the class's name — `ERROR_CLASS` stands in for it — so
the gate's reading of its own source finds none of their constructions, by the parser or by a
pattern, and their findings name "the prepared source" rather than a line of the gate. A new
refusal of the builder comes with its row in `REFUSED`, a new rule of the control with its
entry in `ANSWERS`, a new prepared case that fires a check its source constructs with its site
in `sites` — left out, it fires "outside the prepared source" —, and a new check the prepared
reference does not pass reddens nearly every prepared input at once — give
`PREPARED_REFERENCE` what the check asks, as `_reference.json` was given it. Nothing notices a rule no prepared input takes, a row of these tables deleted,
or an edit to the own control itself — its loops and their catch, the comparisons, the mapping
of the tables to inputs, the line handing its violations to the run. Nor five presence tests
written by truthiness rather than by `has` — of `pct`, `branchPct`, `target` and `exceptions`,
and of the operations `dropReport` excludes: a falsy value is then dropped, in silence beside
another operation and as "unchanged" alone, which hides no defect — `target` is the only
operation that reaches point 4, and points 5 and 6 stay held by cases of one operation each.
Reading the `say('…'` rules to require an input for each was considered and left out: that
reading would need a control of its own, one floor up.

Measured on copies of the gate in `tmp/`, each loosening one pattern or disabling one rule:
all 137 red. 135 name the prepared input that caught them — 133 of those the real run alone
passes, two it fails — and two (`isObject` loosened) crash the control over the real cases,
before its own control is reached. The untouched copy is green, and so is a check added whole
— throw, row and case: `foreign-report` came that way, and the real run is green with 22
cases.

The rule over constructions was measured the same way. The review's `threshold` construction,
added before point 4's loop, is red and named with its line and column; a dead `result`
construction before the summary is red; a check relabelled on the error —
`Object.assign(new CoverageError('report', …), { check: 'threshold' })` at point 4's second
throw — is red, its three cases `unplaced`. Of 35 copies each loosening one piece of the
rule, all are red: 33 name the prepared input that caught them — 26 of those the real run
alone passes, seven it fails — and the other two, the frame the error records and the site
the run hands over, only the real run catches, as it has to. The untouched copy is green, its
22 cases reaching all 11 constructions of its 10 checks, and a check added whole stays green
with 23 cases, 11 checks and 12 constructions.
