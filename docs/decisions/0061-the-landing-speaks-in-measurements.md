# 0061 — The landing speaks in measurements, and says "machine-audited" until the ACR

**Status:** accepted
**Implements:** [`req-project-apps`](../requirements/project.md#req-project-apps),
[`req-token-contrast`](../requirements/tokens.md#req-token-contrast) (worn outward)
**Evidence:** `apps/docs/src/app/pages/home/`; the strip↔repository agreement measured in
`apps/docs-e2e/src/landing.spec.ts` (the test reads the same tracked files the content
pass reads); the wording guard in the same suite (`not.toContainText(/conformant/i)`)

## The question

Plan 2.1.6: what does the front page lead with, and in which words? The first sketch led
with the builder's own numbers — mutation score, lesson count, promise registry — and the
maintainer's review caught the mistake: those are the diary of how the library is made,
not the buyer's question. Meanwhile the strongest claim the library holds — accessibility
as a machine-checked property — sat in the third row.

## Accessibility leads, the machinery moves to /trust

Since the EAA became enforceable (June 2025, EN 301 549 in tenders), WCAG conformance is a
procurement gate, not an ornament — it is the one line a visitor may be _required_ to ask
about. So the evidence strip leads with it, and every tile answers a visitor's stake in
the visitor's terms: the axe sweep on every commit, the contrast pairs measured on both
themes, the three engines, the touch floor, and the machine catalogue an agent can verify
suggestions against. The build machinery — mutants, the promise registry, decisions,
lessons — moves wholesale to `/trust` for the auditor who wants it, and keeps exactly one
teaser line on the landing. Nothing was deleted; it was re-addressed.

## "Machine-audited", never "conformant" — a wording law with a gate

The gates end where axe ends: DOM and CSS, three engines, every commit. That earns the
sentence **"built and machine-audited to WCAG 2.2 AA"** and does not earn "conformant" —
conformance language belongs to 2.2's ACR, whose inputs include a recorded
assistive-technology pass. A library whose pitch is "every promise is held by a gate"
cannot open with a promise held by none, published to the exact audience that will check.
The law is enforced the way this repository enforces words: the e2e suite asserts the
strip never contains "conformant". The day the ACR lands, that assertion is the one line
the stronger sentence must delete first.

## A number nothing measured cannot reach the page

The strip's figures ride `DOCS_EVIDENCE` only — the content pass (2.1.5) reads them from
tracked files and throws on a count it cannot parse. 2.1.6 extends the same pass with the
two accessibility numbers (the contrast policy's check count — the contrast gate's own
denominator — and the touch-floor primitive), then closes the loop from the other side:
the landing suite re-reads those tracked files at test time and expects the rendered strip
to agree. The pitch of the site folded into an assertion — the page cannot drift from the
repository without a red test naming the drift.

## The live cards are the page's own state, not a harness

"Live, not screenshots" means the stepper moves, the chips really leave, the switch drives
the bar, and the copy button answers through the toaster — real instances of the shipped
package driven by a handful of signals the page owns. The gradient headline repeats the
hero button's exact idiom (an oversized image drifting by `background-position`, duration
from the motion axis) so reduced motion freezes both through one token; forced colors gets
the same hand-off the button needed, because the mode strips colours but keeps images and
alpha — without the guard the headline would be a gradient with invisible text.

## Costs

- The CTA buttons and the Trust teaser name destinations that exist only with 2.1.7 —
  the shell's own law ("a link that leads nowhere is worse than its absence") holds, so
  they ship as unlinked copy with the wiring one step away. Recorded here so the gap
  reads as sequencing, not oversight.
- The strip's hairline separators are the grid's 1px gaps over a border-coloured ground —
  a site-local trick, listed as chrome; if a second consumer wants it, the extraction law
  of lesson-21 applies.
- "197 colour pairs" counts the policy's checks; each is measured on both themes, and the
  strip says "light **and** dark" rather than doubling the number — the honest count is
  the denominator, not the multiplication.
