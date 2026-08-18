# 0021 — An index is generated where every column is derivable, measured where one is not

**Status:** accepted
**Implements:** [`req-quality-index`](../requirements/quality.md#req-quality-index)
**Evidence:** [`lesson-75`](../lessons.md#lesson-75) — the counts below are the output of
`node tools/check-index.mjs` on the state that opened this decision

## Context

The repository keeps lists that describe a directory: the index of decisions, the table of
cases in a negative control's README, the map on the first page of the documentation. Every
one of them is written by hand, and every one had drifted from the directory it describes
before anybody looked:

| list                               | rows | wrong                                            |
| ---------------------------------- | ---: | ------------------------------------------------ |
| [`decisions/README.md`](README.md) |   20 | 5 titles paraphrased, 6 `implements` lists short |
| `check-tokens.fixtures/README.md`  |   29 | 2 cases absent, the count of points said 7 of 9  |
| [`../README.md`](../README.md) map |    3 | 2 counts stale (17 of 20 ADRs, 63 of 74 lessons) |

None of it was visible. A paraphrase reads like a title, a short list of requirements reads
like a list of requirements, and a case that is in the tree and not in the table is invisible
in exactly the place a reader would look for it. The registry has been generated since
[`req-quality-registry`](../requirements/quality.md#req-quality-registry) and does not drift;
these are the lists that were left out.

## Decision

**A list that describes a directory is derived from that directory, or measured against it —
never remembered.** Which of the two depends on one question: _is every column derivable?_

- **Every column derivable → generate.** The decisions index is `no`, `decision`,
  `implements`, and all three have a home in the decision file itself: the number is its
  name, the title its heading, the requirements its `Implements:` line. Quoting any of them
  is a second home for a fact ([0017](0017-one-home-per-fact.md)), so the table is rendered
  by `tools/check-index.mjs --write` and the gate compares cells, not columns.
- **One column a human writes → measure.** A fixtures table's `defect` column is a sentence
  about why the case exists, and no generator writes it. So the table stays hand-written and
  the gate holds it to the tree: the rows are exactly the cases, and a `point`, `check` or
  `rule` column agrees with the case's own `fixture.json`.
- **A number in prose is measured, never generated.** "runs all nine of its checks" and
  "(20 ADRs)" are sentences, and rewriting a sentence around a number is how a generator
  starts owning prose. The gate counts and compares.

**The gate measures the lists that exist and does not require a list to exist.** Five
fixture trees carry no README and that stays a decision for whoever writes one; deleting a
table to silence the gate is a removal visible in the diff, which drift never was.

## Consequences

- **The decisions index stops being edited.** Adding a decision is one file; the row follows
  from `--write`, and the eleven rows that were wrong are right for as long as the gate runs.
- **A count in prose becomes a tie.** Adding a requirement, a decision or a lesson now moves
  the map on the first page, and a gate that grows a point moves its negative control's
  README. Both were meant to happen already.
- **The fixtures tables keep their human column** — the one thing in them worth reading
  slowly, and the reason they are not generated.

## What this costs us

- **The index loses its short titles.** Five rows were a shortened paraphrase that fitted the
  cell better than the heading does; a generated table cannot have a form the directory does
  not carry, so the headings won and the table grew wider.
- **A generated section inside a hand-written file.** `decisions/README.md` is prose with one
  machine-owned section, and nothing but the sentence above marks the boundary — a reader
  editing the table by hand loses the edit at the next `--write`.
- **A second gate that writes.** `check-docs --write` and `check-index --write` both rewrite
  documentation, and a session has to know which one owns the file it is looking at.
- **The rule is not self-extending.** A new kind of list — a glossary, an inventory of
  components — is measured only once somebody teaches this gate to count it. Point 5 refuses
  a number it cannot take rather than passing over it, which is the smallest honest version
  of that limit.

## Alternatives considered

- **Generate the fixtures tables as well**, moving the `defect` sentence into each
  `fixture.json`. Rejected: the sentence would live in a JSON string beside the longer
  `description` already there, which is two homes for one fact — the thing generation was
  supposed to remove — and the eight tables have eight different shapes, so one generator
  means one shape and eight rewrites nobody asked for.
- **Check the decisions index instead of generating it.** It catches the same eleven rows,
  and then every one of them is fixed by hand a second time. Generation is the same work
  once.
- **Neither: a note in the contributing guide.** That is the status quo. Its output is the
  table in "Context", written by people who agreed with the rule the whole time.
