# Negative control of the conformance gate

Deliberately defective inputs. `tools/check-acr.mjs` runs all eight of its points on each of
them and **requires every one to be rejected — and rejected by the point it declares**. An
input that passes is a fault; an input that fires for a reason other than the one written
in its file is a fault just the same, because it proves something other than what it
declares.

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

A case is not a seventeenth copy of the correct input with one thing broken. The gate builds
it from two layers:

1. the **live input** — the repository itself as it stands at the commit under test: the
   claims, the component cards, the library's sources, the plan, the workflow, the tracked
   files ([`_reference.json`](_reference.json) says so and records nothing, because a stored
   copy would measure the repository as it was the day somebody stored it),
2. the operations from the case file, applied to a copy of it (`criteria` — a row replaced,
   added or, with `null`, dropped; `assistiveTechnology`; `cards` — a card's row rewritten;
   `texts` and `sources` — a cited file or a library source rewritten; `dropFiles`; `plan`
   — a finding closed, dropped or absent; `ci`; `atLogs`).

That way the case file holds **nothing but the defect** — visible without comparing files —
and does not drift from the reference when the repository moves.

**The live input must pass.** It is checked first, on the real run; were it defective, every
case would fire because of it rather than because of its own defect, and every "rejected"
would be false. A case examines the decision, not the drift of the file on disk: point 8 is
the real run's alone, and the cases run with the rendering left out.

## The cases

| file                                                                                         | what it breaks                                                                 | point | check       |
| -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ----- | ----------- |
| [`a-criterion-the-report-skips.json`](a-criterion-the-report-skips.json)                     | the row for 1.1.1 is gone — a skipped criterion reads as a pass                | 1     | `catalogue` |
| [`a-criterion-the-standard-does-not-have.json`](a-criterion-the-standard-does-not-have.json) | a row for `9.9.9` — a number that is no success criterion                      | 1     | `catalogue` |
| [`a-word-outside-the-five.json`](a-word-outside-the-five.json)                               | `1.1.1` says "Meets", a word the template does not have                        | 2     | `level`     |
| [`supports-on-no-measurement.json`](supports-on-no-measurement.json)                         | `1.1.1` says Supports and cites a requirement alone                            | 2     | `level`     |
| [`supports-with-a-limit-attached.json`](supports-with-a-limit-attached.json)                 | `1.1.1` says Supports and cites an open finding                                | 2     | `level`     |
| [`not-evaluated-with-no-owner.json`](not-evaluated-with-no-owner.json)                       | `1.4.4` says Not Evaluated and cites no finding                                | 2     | `level`     |
| [`a-point-the-gate-does-not-number.json`](a-point-the-gate-does-not-number.json)             | `1.1.1` cites point 42 of `check-aria`                                         | 3     | `evidence`  |
| [`a-case-the-spec-does-not-hold.json`](a-case-the-spec-does-not-hold.json)                   | `1.4.13` cites a tooltip case by a title the spec no longer has                | 3     | `evidence`  |
| [`a-sentence-the-source-does-not-say.json`](a-sentence-the-source-does-not-say.json)         | `2.5.2` quotes the field row on `click`, and the source says otherwise         | 3     | `evidence`  |
| [`a-decision-that-is-not-on-disk.json`](a-decision-that-is-not-on-disk.json)                 | `2.2.1` cites decision 9999, which is not on disk                              | 3     | `evidence`  |
| [`a-scan-that-finds-what-it-forbids.json`](a-scan-that-finds-what-it-forbids.json)           | a template grows a `<video>`, and 1.2.1 still says Not Applicable              | 3     | `evidence`  |
| [`a-gate-that-left-ci.json`](a-gate-that-left-ci.json)                                       | `check-aria` is cited, and ci.yml no longer runs it                            | 4     | `wired`     |
| [`a-card-that-owes-the-keyboard.json`](a-card-that-owes-the-keyboard.json)                   | the button card's keyboard row turns into a gap under a Supports               | 5     | `cards`     |
| [`a-finding-that-has-closed.json`](a-finding-that-has-closed.json)                           | finding 4.8 is ticked in the plan while 1.3.1 still leans on it                | 6     | `finding`   |
| [`a-pass-claimed-without-its-logs.json`](a-pass-claimed-without-its-logs.json)               | `recorded: true` with nothing under `docs/acr/at/`                             | 7     | `pass`      |
| [`a-pass-claimed-with-a-card-still-owing.json`](a-pass-claimed-with-a-card-still-owing.json) | `recorded: true` with a log on disk, and every card still reading `none — gap` | 7     | `pass`      |

Point 2 has four cases because a level can be wrong in four directions and every one of
them reads like a report: a word outside the five, a _Supports_ on prose, a _Supports_ that
names its own limit, a _Not Evaluated_ with no owner. Point 3 has five, one per kind of
citation that can go stale — a gate's point, a case's title, a quoted sentence, a
decision's number, a scan over the sources — because each goes stale for a different reason
and at a different moment. Point 7 has two because "recorded" can be a lie in two places:
the directory, and the cards.
