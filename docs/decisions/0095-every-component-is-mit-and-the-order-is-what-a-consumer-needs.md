# 0095 — Every component is released under MIT, and the order is what a consumer needs

**Status:** accepted
**Implements:** [`req-project-package`](../requirements/project.md#req-project-package)
**Evidence:** no measurement in the repository — the maintainer's sentence of 2026-10-29, and
the first consumer's list of what it needs: an application for a house, built on `0.2.0`,
which asks for a table and a card first, then charts and an application shell

## Context

[0016](0016-mit-irreversibility.md) kept one option open. A component whose distribution
terms were not settled did not enter a release, the default answer under doubt was "not yet",
and the most expensive component, the table, was built last so that its terms could be
settled with users in hand. The decision named its own price: a slower road to completeness,
and the risk that the option is never used.

Two facts arrived on the same day. The maintainer settled the terms: no part of the library is
meant to go out on terms other than MIT, now or later. And the first consumer wrote down what
it is missing, with the table at the top of the list. An option nobody intends to use was
protecting nothing, and it was costing the component a consumer asks for first.

## Decision

**Every component is released under MIT, the table and whatever comes after it included.
Nothing waits for a licence: the order is what the consumers ask for, weighed against what
it costs to build.**

- 0016's first rule (under doubt, "not yet") and third rule (the costliest component last)
  are superseded. There is no doubt about terms left for the first to resolve, and no option
  left for the third to protect.
- 0016's second rule, the boundary moves outward only, stops being a rule and stays a fact:
  nothing is held inside it any longer.
- The fact 0016 stood on is untouched. A release under MIT cannot be taken back, and this
  decision takes that in rather than around: it is chosen now instead of deferred.
- The table is planned as work, and its shape is its own decision when it is built. A
  licence does not draw the line between a simple table and an advanced one.

## Consequences

- 0016 carries `superseded by 0095` on the two rules; its consequences about the name, the
  scope and provenance stay in force, because they never depended on the order.
- The work plan's component section is ordered by the consumers' needs, and the table item
  stops saying that it does not exist as a commit.
- The root `LICENSE` covers the whole repository, as before. Nothing in the tree moves.

## What this costs us

- **The option is gone for good.** The first commit of the table puts it under MIT forever,
  and no later decision can reach back past it. Accepted on purpose: 0016 measured the cost of
  the mistake as one-sided, and this decision accepts that side.
- **The order loses a rule it had for free.** "Costliest last" needed no judgement; "what a
  consumer needs" does, and one consumer's list can pull the plan towards one application.
  The guard is the plan's own law: a component answers a class of applications, and the
  first consumer is the first measurement of it, not its specification.

## Alternatives considered

| alternative                                          | why rejected                                                                                                                         |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Keep 0016 and build the table last                   | the first consumer waits for the component it asks for first, to protect an option the maintainer does not mean to use               |
| Build the table in a separate repository             | the terms it would protect have been decided against, and a second repository is a second set of gates for the same code             |
| Release a simple table now and keep an advanced back | it splits the table by licence instead of by what the code does; the split the table gets is drawn by its own decision, by its shape |
