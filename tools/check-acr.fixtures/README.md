# Negative control of the conformance gate

Deliberately defective inputs, and the states of one sentence. `tools/check-acr.mjs` runs all
eight of its points on each of them: a defective input it **requires to be rejected — and
rejected by the point it declares**, and a state of the status sentence it requires to be
accepted and rendered with the sentence the case declares. An input that passes where it was
meant to fail is a fault; an input that fires for a reason other than the one written in its
file is a fault just the same, because it proves something other than what it declares; and
a rendering that puts the wrong word on the report is the fault this whole document exists
to catch.

The reason it exists is the same as for every other gate here
([`req-quality-negative-control`](../../docs/requirements/quality.md#req-quality-negative-control)):
**a new gate is not ready when it passes — it is ready when it has been shown to fail.**

For this gate the rule bites where the document is read by strangers. An Accessibility
Conformance Report is the one file a procurement reads without opening the code, and every
way it can lie is quiet: a criterion with no row reads as a pass, a level with no
measurement behind it reads as a measurement, a finding that closed a month ago reads as a
limit the library still has, and a screen-reader pass "recorded" with no transcript on disk
reads exactly like one that was.

## How a case is built

A case is not one more copy of the correct input with one thing broken. The gate builds
it from two layers:

1. the **live input** — the repository itself as it stands at the commit under test: the
   claims, the component cards, the library's sources, the plan, the workflow, the tracked
   files ([`_reference.json`](_reference.json) says so and records nothing, because a stored
   copy would measure the repository as it was the day somebody stored it),
2. the operations from the case file, applied to a copy of it (`criteria` — a row replaced,
   added or, with `null`, dropped; `assistiveTechnology`; `cards` — a card's row rewritten
   or, with `null`, dropped, so that a card can owe a row by not having it at all;
   `texts` and `sources` — a cited file or a library source rewritten; `dropFiles`; `plan`
   — a finding closed, dropped or absent, or **opened**, so that a case which needs an open
   finding builds its own instead of borrowing one the plan will close; `ci`; `atLogs`;
   `acts` — an act of the reader walk's table rewritten, added or, with `null`, dropped).

That way the case file holds **nothing but the defect** — visible without comparing files —
and does not drift from the reference when the repository moves.

**The live input must pass.** It is checked first, on the real run; were it defective, every
case would fire because of it rather than because of its own defect, and every "rejected"
would be false. A case examines the decision, not the drift of the file on disk: the
comparison with `docs/acr.md` is the real run's alone, and the cases run with it left out.

A case that carries a `status` is read the other way round. It is a state of the report, not
a defect, and the gate must accept it; what it examines is the rendering — the word after
`Status:` (`status.word`) and every phrase the case names (`status.says`): the rows counted,
their owners. The sentence is the one line of the report a procurement reads first, and a
rule with three branches can lie in three ways — the stronger word on a report with no
transcript behind it, a count that skips a level, an owner left unnamed — every one of them
in a single line that reads like a report. `status` in the check column is the runner's own
label for these cases and not a point's identifier: point 8's is `rendering`, and it fires on
the real run alone. Every case that counts rows leans on the live rows standing at Supports
or Not Applicable, and turns red the day one drops — a count one higher than the case names.
The two that would not are the pass-unrecorded pair, whose sentence is the same either way;
the second keeps its edge, and the first,
[`a-pass-not-on-record.json`](a-pass-not-on-record.json), would go on passing as a duplicate
of it — so
[`nothing-holds-the-report-below-supports.json`](nothing-holds-the-report-below-supports.json),
red on that day with the weaker word against the stronger one it names, is its canary, and
the two are patched together. A `null` that names no row, no card or no criterion, and a
`plan` state other than `open` on an item the plan lacks, are authoring faults reported by
the case's name; an `acts` `null` on a route the table lacks and a `dropFiles` path the
tracked set lacks are still silent, and no case uses either that way.

## The cases

| file                                                                                                       | what it breaks — or, for a state of the status sentence, what it sets                                    | point | check       |
| ---------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ----- | ----------- |
| [`a-criterion-the-report-skips.json`](a-criterion-the-report-skips.json)                                   | the row for 1.1.1 is gone — a skipped criterion reads as a pass                                          | 1     | `catalogue` |
| [`a-criterion-the-standard-does-not-have.json`](a-criterion-the-standard-does-not-have.json)               | a row for `9.9.9` — a number that is no success criterion                                                | 1     | `catalogue` |
| [`a-word-outside-the-five.json`](a-word-outside-the-five.json)                                             | `1.1.1` says "Meets", a word the template does not have                                                  | 2     | `level`     |
| [`supports-on-no-measurement.json`](supports-on-no-measurement.json)                                       | `1.1.1` says Supports and cites a requirement alone                                                      | 2     | `level`     |
| [`supports-with-a-limit-attached.json`](supports-with-a-limit-attached.json)                               | `1.1.1` says Supports and cites an open finding                                                          | 2     | `level`     |
| [`not-evaluated-with-no-owner.json`](not-evaluated-with-no-owner.json)                                     | `1.4.4` says Not Evaluated and cites no finding                                                          | 2     | `level`     |
| [`a-point-the-gate-does-not-number.json`](a-point-the-gate-does-not-number.json)                           | `1.1.1` cites point 42 of `check-aria`                                                                   | 3     | `evidence`  |
| [`a-case-the-spec-does-not-hold.json`](a-case-the-spec-does-not-hold.json)                                 | `1.4.13` cites a tooltip case by a title the spec no longer has                                          | 3     | `evidence`  |
| [`a-sentence-the-source-does-not-say.json`](a-sentence-the-source-does-not-say.json)                       | `2.5.2` quotes the field row on `click`, and the source says otherwise                                   | 3     | `evidence`  |
| [`a-decision-that-is-not-on-disk.json`](a-decision-that-is-not-on-disk.json)                               | `2.2.1` cites decision 9999, which is not on disk                                                        | 3     | `evidence`  |
| [`a-scan-that-finds-what-it-forbids.json`](a-scan-that-finds-what-it-forbids.json)                         | a template grows a `<video>`, and 1.2.1 still says Not Applicable                                        | 3     | `evidence`  |
| [`a-gate-that-left-ci.json`](a-gate-that-left-ci.json)                                                     | `check-aria` is cited, and ci.yml no longer runs it                                                      | 4     | `wired`     |
| [`a-card-that-owes-the-keyboard.json`](a-card-that-owes-the-keyboard.json)                                 | the button card's keyboard row turns into a gap under a Supports                                         | 5     | `cards`     |
| [`a-finding-that-has-closed.json`](a-finding-that-has-closed.json)                                         | finding 4.75 is ticked in the plan while 4.1.2 still leans on it                                         | 6     | `finding`   |
| [`a-pass-claimed-without-its-logs.json`](a-pass-claimed-without-its-logs.json)                             | `recorded: true` with nothing under `docs/acr/at/`                                                       | 7     | `pass`      |
| [`a-pass-claimed-with-a-card-still-owing.json`](a-pass-claimed-with-a-card-still-owing.json)               | `recorded: true` with a log on disk, and every card still reading `none — gap`                           | 7     | `pass`      |
| [`an-act-whose-owner-never-presses-it.json`](an-act-whose-owner-never-presses-it.json)                     | the dialog act cites the axe sweep as its owner, a spec that never names the control                     | 7     | `owner`     |
| [`an-act-the-record-never-opened.json`](an-act-the-record-never-opened.json)                               | `recorded: true`, and the toast act moves to a control no log has an `open` row on                       | 7     | `pass`      |
| [`a-pass-recorded-in-words.json`](a-pass-recorded-in-words.json)                                           | `recorded: "false"` — a word, which point 7 skipped and every rendering read as true                     | 7     | `pass`      |
| [`a-pass-not-on-record.json`](a-pass-not-on-record.json)                                                   | the pass not recorded, every row at Supports or Not Applicable: the decision's sentence                  | 8     | `status`    |
| [`a-pass-not-on-record-and-a-row-below-supports.json`](a-pass-not-on-record-and-a-row-below-supports.json) | the pass not recorded and 4.1.2 below Supports: still the decision's sentence — the pass is read first   | 8     | `status`    |
| [`a-row-below-supports-with-the-pass-on-record.json`](a-row-below-supports-with-the-pass-on-record.json)   | the pass recorded and 4.1.2 at Partially Supports on a finding: one row, counted, and its owner named    | 8     | `status`    |
| [`three-rows-below-supports-one-at-each-word.json`](three-rows-below-supports-one-at-each-word.json)       | three rows below Supports, one at each word under it: three, in the standard's order, all three owners   | 8     | `status`    |
| [`a-row-held-by-a-card-and-no-finding.json`](a-row-held-by-a-card-and-no-finding.json)                     | 2.1.1 at Partially Supports over a card that owes the keyboard row: the card is the owner named          | 8     | `status`    |
| [`two-kinds-of-owner-on-one-report.json`](two-kinds-of-owner-on-one-report.json)                           | 1.4.4 on two findings and 2.1.1 over two owing cards: both kinds named, the findings in the plan's order | 8     | `status`    |
| [`a-label-two-rows-cite-named-once.json`](a-label-two-rows-cite-named-once.json)                           | 1.3.3 and 2.4.4 over the same owed cards' row: two rows, one limit, the label named once                 | 8     | `status`    |
| [`nothing-holds-the-report-below-supports.json`](nothing-holds-the-report-below-supports.json)             | the pass recorded, every row at Supports or Not Applicable: the word the decision reserves               | 8     | `status`    |

Point 2 has four cases because a level can be wrong in four directions and every one of
them reads like a report: a word outside the five, a _Supports_ on prose, a _Supports_ that
names its own limit, a _Not Evaluated_ with no owner. Point 3 has five, one per kind of
citation that can go stale — a gate's point, a case's title, a quoted sentence, a
decision's number, a scan over the sources — because each goes stale for a different reason
and at a different moment. Point 7 has five: "recorded" can be a lie in three places — the
directory, the cards, and the logs, which can stand on disk without one `open` row the table
promises — the act table can cite a spec that never presses the control, recorded or not, and
the flag itself can be a word rather than a boolean, which the point would skip and every
rendering read as true. Point 8 has eight, for a sentence with three states and the edges
inside two of them: the pass unrecorded over rows all held and over one below, because the
pass is read before the rows; one row below and three, one at each word under Supports,
because a count goes wrong in the singular or in one of the words as easily as in the plural;
a row held by a finding and one held by a card, because a limit has two kinds of owner and a
sentence that knows one kind reads "held by nothing" at the other; both kinds on one report,
with the findings in the plan's order and a card that has no row at all, because a sentence
that names one owner and stops reads like a report whose other limit has closed; a label two
rows lean on, named once, because one row of the cards is one limit; and nothing below with
the pass on record, the one state that earns the stronger word.
