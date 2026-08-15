# 0017 — One home per fact: the concision criterion and its budget

**Status:** accepted
**Implements:** [`req-project-concise`](../requirements/project.md#req-project-concise)
**Evidence:** `node tools/measure-prose.mjs`, run on 2026-08-07 — every number below is its
output. That script measures and never fails a build; the gate comes later, see "Decision"

## Context

The promise is already written: prose answers "why isn't this obvious?", and whatever can be
pointed at is pointed at instead of summarised. What was missing is **how much** — and
a criterion without a number is settled again by whoever happens to be editing.

Section H of the [plan](../plan.md#h-one-language-for-the-repository) is about to rewrite every prose
layer of this repository. Deciding "concise enough" file by file, mid-pass, means the second
pass answers it differently from the first, and the difference is invisible in review.

Measured today:

| layer                        | volume                                       | over budget           |
| ---------------------------- | -------------------------------------------- | --------------------- |
| headers of `tools/*.mjs`     | 609 lines in 14 scripts (14–74), 5 359 words | 13 scripts, 359 lines |
| journal entries in `plan.md` | 896 lines in 18 entries (14–93, median 48)   | 16 entries, 458 lines |
| closed task positions        | 650 lines in 17 positions (max 62)           | 17 positions          |
| open task positions          | 319 lines in 44 positions (median 5)         | 2 positions           |

The repetition is measured, not sensed. A closed task position shares up to **26.6%** of its
six-word sequences with its own journal entry (A10; A12 19.6%, A13 18.5%, 12.2% across all
fifteen pairs), and the same finding is often told a third time in the header of the gate it
produced — `check-tokens.mjs` spends eleven lines retelling A2, A5, A6 and A7.

## Decision

**Every fact has one home; everywhere else it is a link.**

| home                          | carries                                                  |
| ----------------------------- | -------------------------------------------------------- |
| requirement                   | what must be true, and which gate proves it              |
| decision                      | why this way, and what it costs                          |
| [`lessons.md`](../lessons.md) | what broke, how it was found, how to notice it next time |
| journal entry                 | what moved in a session, what it ended with, what's next |
| task position                 | state, scope, cost                                       |
| gate header                   | what the gate measures and how to run it                 |

Budgets — **targets for the compression pass, not a gate**:

- **gate header: 12 lines + 1 per numbered point**, `/**` and `*/` counted. `check-tokens.mjs`
  has seven points, so 19 lines against today's 74; the thirteen existing headers land at 251
  against 609.
- **journal entry: 25 lines.** Narration has a home and it is `lessons.md`; the entry links it.
- **task position: 12 lines closed, 20 open.** An open position is a working spec and may think
  out loud; closing it moves the story to the journal and the lesson, and what stays is the
  record.
- **JSDoc: no budget, and `@example` is outside it entirely** — in a public API the example is
  the most valuable text there is. JSDoc obeys the criterion, not a number.

Two rules keep the links honest:

1. **A link is an identifier** — `req-*`, `lesson-*` — because `check-docs` (point 4) resolves
   those across every tracked file, so a link that stops pointing anywhere fails CI. Cite
   a decision by path in addition to an identifier, never instead of one.
2. **Removing the last citation of a lesson is not compression, it is loss.** The reverse index
   in the [registry](../registry.md) names lessons no requirement cites — today six, and it read
   fifty-nine until the generator was fixed on 2026-08-07.

**The snapshot is laid after the pass, never before.** A budget frozen on today's headers would
record the bloat as the accepted state — the mistake A4 caught in token names
([`lesson-49`](../lessons.md#lesson-49)). The gate for `req-project-concise` arrives when the
pass is done, with two-sided tolerance, and it measures **lines and words**: a line is elastic,
so halving the count by doubling the width has to show up somewhere.

## Consequences

- **H7 turns from a rewrite into arithmetic.** Thirteen headers, 359 lines to cut, a target per
  file. "Why it is like that" moves to the requirement, the decision or the lesson that already
  holds it.
- **H4 gets a rule for the two layers that repeat each other.** A closed position drops to the
  record; the journal keeps the session; whatever is neither becomes a lesson or goes.
- **The measurement is in the repository, not in a scratch file.** `tools/measure-prose.mjs`
  has no target and no CI wiring on purpose: a gate laid before the pass would fail on every
  file for a week and be switched off. It is what the future gate grows from.
- **New prose is written to the budget from today** — this file included, and the entries that
  close H2.

## What this costs us

- **A gate header stops explaining itself.** Whoever opens `check-tokens.mjs` sees what it
  measures, not why it exists; the why is one click away, and a click is more than zero.
- **`plan.md` stops reading as a story.** Compressed positions make it a list again — which is
  what it is called, but the continuous read moves to the journal and `lessons.md`.
- **A number invites the wrong game.** Twenty-five lines can be met by saying less rather than
  by linking more, and no measurement can tell the two apart.
- **Nothing here measures whether a paragraph carries weight.** The machine counts volume; the
  judgment stays in review. That limit is already written into
  [`req-project-concise`](../requirements/project.md#req-project-concise) and this decision does
  not lift it.

## Alternatives considered

- **No number, review judgment only.** That is the status quo, and its output is measured above:
  609 lines of headers with a 74-line one on top, written by someone who agreed with the
  criterion the whole time.
- **Budget in words or characters instead of lines.** More faithful — a line is elastic — but
  review reads a diff in lines. Words come along as the second reading, the same construction
  the phase A gates use for their denominators.
- **One budget for every layer.** Rejected: twenty-five lines is slack for a header and tight
  for a journal entry, and JSDoc must not have one at all.
- **Budget JSDoc too.** Rejected for the reason B4 gives: the example is what a consumer reads,
  and it is the first thing a line budget would eat.
