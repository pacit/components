# 0015 — MIT everywhere, rights to the entity, no CLA

**Status:** accepted
**Amended:** 2026-08-07 — the reasoning was rewritten alongside
[0016](0016-mit-irreversibility.md); the resolution is unchanged
**Implements:** [`req-release-metadata`](../requirements/release.md#req-release-metadata)
**Evidence:** `check-package` (point 6, the `licencja` check) and `check-consumer` (point 1,
the `brak-licencji` rule) — the LICENSE file measured in the directory **and** in the archive

## Context

The manifest declared `"license": "MIT"` from the start, but there was no LICENSE file
anywhere — neither in the repository nor in the built package. That is formally an incomplete
licence, and the repository is to stand publicly from the first push, so the question „what is
this legally, exactly" arrives before the first `npm install`.

At the same time it had to be settled whether the core's licence closes off any later choices —
and whether keeping them open requires contributor machinery.

## Decision

**Everything under MIT. Copyright to the entity (`PacIT - Marek Pac`). No CLA, no DCO, no
dual-licensing.**

MIT is not the default chosen on autopilot; it follows from what this library wins on. Its
differentiator is **evidence** — the gates, the [registry](../registry.md), and eventually an
ACR/VPAT generated from CI. Evidence only works with adoption, and the recipient is
a corporation whose first gate is the legal department: MIT passes there without review, and
a licence outside the OSI list does not pass at all. The ecosystem holds the same standard —
Angular, CDK, Material and PrimeNG are all MIT.

**The absence of a CLA is a resolution, not an oversight.** The original recommendation was the
opposite and was withdrawn after checking what a CLA actually buys:

- MIT code may be re-released under other terms, and that includes other people's
  contributions — the condition is that the notice is preserved. Changing the distribution terms
  therefore needs nobody's consent;
- contributions arrive under the repository's licence automatically (GitHub's terms), so „the
  core stays MIT" needs nobody's signature;
- a CLA buys exactly one thing: the right to release **the same code without MIT's
  obligations**. MIT's obligation is one line of notice — being released from it is not
  something anybody would campaign for. Dual-licensing makes sense with (A)GPL, where the
  obligation is real.

The price of a CLA — friction on every external PR — would therefore be paid for nothing.

## Consequences

- `LICENSE` sits in the root and in `libs/components/`, from where ng-packagr copies it into the
  package with no `assets` entry (verified by a run, not assumed).
- The manifest's `author` field names the same entity as the `Copyright` line.
- A mismatch between the `license` field and the file's contents is from now on **a gate
  error**, not a warning: both sides can be changed separately and nothing had tied them
  together.
- Choosing other terms for new code will not require changing this decision or anybody's
  consent in the future — it only requires that the code **not have been released under MIT
  earlier**. [0016](0016-mit-irreversibility.md) develops this.

## What this costs us

- **The core is irreversibly forkable.** Even holding all the rights, the last released MIT
  version stays free forever. On an attempt to change the licence a fork appears within weeks —
  Terraform → OpenTofu, Redis → Valkey, Elasticsearch → OpenSearch. We treat MIT for the core as
  a permanent state, not a stage.
- **Anybody may take this code and release it under their own name**, and that complies with
  the licence. The only protection under MIT is **the name and being upstream** — `pacit` and
  the `@pacit` scope, not the code. The state of the name and the deferred trademark filing are
  in [0016](0016-mit-irreversibility.md).
- **Real dual-licensing stops being available.** Were it ever needed, it would require the
  consent of every contributor individually.
- **This decision settles nothing beyond the licence.** MIT is a condition of adoption and only
  that; whatever might one day stand **beside** the core needs a separate decision taken when
  there is something to choose between.

## Alternatives considered

| alternative                     | why rejected                                                                                                                                                    |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Apache-2.0                      | an explicit patent grant and trademark reservation, but for a component library the patent risk is close to zero — leaving only the mismatch with the ecosystem |
| (A)GPL, SSPL, BSL, FSL          | the code lands in the client's bundle, so copyleft scares corporations off, and source-available licences fail the „OSI-approved" requirement in tenders        |
| MIT plus dual-licensing at once | machinery (a CLA, two licensing paths) for a lever that weighs nothing under MIT — the obligation one could be released from is a single line of notice         |
| MIT plus a CLA „just in case"   | friction on every PR for an option whose exercise does not need a CLA anyway                                                                                    |
