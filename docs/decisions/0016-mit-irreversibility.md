# 0016 — Releasing under MIT is irreversible, so the order is a decision

**Status:** accepted
**Implements:** [`req-project-package`](../requirements/project.md#req-project-package)
**Evidence:** no measurement in the repository — the decision stands on outside precedent
(Terraform → OpenTofu, Redis → Valkey, Elasticsearch → OpenSearch). There is no gate and there
cannot be one, see "Consequences"

## Context

[0015](0015-license-and-model.md) settled **what** the licence is: MIT everywhere, rights to
the entity, no CLA. It did not settle **when** a given component goes out under that licence —
and that is a separate question, because MIT works in one direction.

A released version cannot be taken back. The last one published under MIT stays free forever
and anybody may fork and maintain it. Changing the terms for code that has not gone out yet
costs nothing; the same change for released code costs a fork — the more certainly, the more
people use it.

The phase E plan ordered components "by architectural debt, not by popularity". That is a good
criterion for debt and an empty one for this axis: it says nothing about what is better **not
yet** released.

## Decision

**The set released under MIT may grow and may not shrink. A component whose distribution terms
are not settled does not enter a release — it is built after the library has users.**

Three operational rules follow:

1. **The default answer under doubt is "not yet".** An unreleased component costs nothing and
   can be released at any moment; a component released under MIT is released forever. The cost
   of the mistake is one-sided, so the default answer is too.
2. **The boundary moves outward only.** An unsettled thing may be moved into MIT. The other way
   is not allowed — and that is not about discipline, it is about it physically not working.
3. **The build order is part of this decision, not a preference.** The components with the
   highest build cost and the greatest differentiating power are built **last**, once there is
   somebody using them. Earlier, the resolution about their distribution would be taken without
   the one piece of data that would say anything about it.

The distribution model for such a component **is not settled by this decision**. What is
settled is only that it can be settled later — and that requires only that this code not have
gone out under MIT beforehand.

## Consequences

- Phase E ends at **E6 (table/datagrid)** instead of having it in the middle of the list. It is
  the one item on the plan whose build cost is counted in months rather than days.
- **"Build it but do not publish" is not a workaround.** The `LICENSE` file in the root covers
  the whole repository, not only `dist` — code pushed to a public repository is released under
  MIT whether or not it went to npm. A deferred component is deferred as a commit too.
- The protection is not the code but **the name and being upstream**: the npm scope `@pacit`,
  the `github.com/pacit` organisation and the `pacit.pl` domain — all held by the entity from
  the `Copyright` line (the scope checked on 2026-08-07, not assumed). A formal trademark
  filing is deliberately deferred — the name is the company's name, and registering before the
  first user is a cost with no use.
- The second half of "being upstream" is **provenance**, and npm issues it only with
  a `repository` field matching the repository the publish runs from. That makes `repository`
  a condition of this decision, not merely release metadata —
  [`req-release-metadata`](../requirements/release.md#req-release-metadata).
- **There is no gate for this and there will not be.** No machine can check whether a component
  "should have" gone out. A requirement with a sham gate is exactly what
  [`lesson-39`](../lessons.md#lesson-39) describes — a gate born dead — so this decision
  **does not become a requirement**. It is enforced by reviewing the list in the
  [plan](../plan.md), not by CI.
- 0015 stays in force in full. This decision reverses nothing in it; it adds an axis that was
  not there.

## What this costs us

- **A slower road to completeness.** In some buyers' eyes a library without a table is
  incomplete, and that is exactly the component some teams choose on. We pay in adoption for
  keeping an option.
- **The risk that the option is never used.** If adoption does not come, the ordering protected
  nothing and delayed the most wanted component. That cost is real and we accept it, because
  the mistake in the other direction is irreversible and this one is not.
- **The decision will have to be taken again**, with data that does not exist today. This
  decision is not an answer — it is the preservation of the right to answer.

## Alternatives considered

| alternative                                            | why rejected                                                                                                                                                                               |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Release everything under MIT at once                   | maximum adoption, but it closes every other option unconditionally and forever — a price paid up front for a benefit that may not come                                                     |
| Settle the distribution model now                      | the resolution would be taken at a zero user base, i.e. without the one piece of data that would say anything about it                                                                     |
| Write it down as a requirement with a gate             | no machine exists that would measure it; a requirement with a sham gate is worse than no requirement ([`lesson-39`](../lessons.md#lesson-39))                                              |
| Keep unsettled components in this repository           | the root `LICENSE` covers the whole repository — a commit to a public repo **is** a release under MIT, so the workaround does not exist                                                    |
| Reverse 0015 and pick a licence that allows going back | (A)GPL and source-available fail a corporate consumer's legal review, i.e. they cancel adoption — and with no adoption there is nothing to protect (see [0015](0015-license-and-model.md)) |
