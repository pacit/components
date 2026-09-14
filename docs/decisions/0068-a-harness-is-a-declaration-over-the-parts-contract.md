# 0068 — A harness is a declaration over the parts contract

**Status:** accepted
**Implements:** [`req-api-harness`](../requirements/api.md#req-api-harness),
[`req-api-parts`](../requirements/api.md#req-api-parts),
[`req-api-platform`](../requirements/api.md#req-api-platform)
**Evidence:** `tools/check-harness.mjs` over the built package, with its 17 prepared inputs
rejected on their own points; `libs/components/testing/src/harness.spec.ts`; the
`./testing` row of `libs/components/size.snapshot.md` — the entrypoint pulls no other
entrypoint in and nothing but the CDK's testing module

## The question

A consumer who tests against this library writes `[data-pct-part="label"]` into a spec by
hand — correct today, silent the day the name moves, and the day after an upgrade is exactly
when a suite is supposed to speak. The parts are already a snapshot-gated public surface
([0013](0013-no-headless-split.md), `check-parts`), so the library owes the instrument that
holds them from the consumer's side: `@pacit/components/testing`. What shape does
that instrument take, and what keeps it honest?

## The decision

**The base is the CDK's `ComponentHarness`, not one of our own.** The CDK's harness knows how
to find a host in a TestBed fixture and through a WebDriver, how to wait for stability, how to
narrow a search with a predicate — an abstraction the ecosystem already reads, with Material's
harnesses as the reference. `@angular/cdk` is the one runtime dependency this library allows
itself ([`req-project-dependencies`](../requirements/project.md#req-project-dependencies)),
and `@angular/cdk/testing` is an entrypoint of it, so the price is zero. A base of our own
would have re-implemented locators and stabilisation for the sake of owning them.

**A harness is a declaration: the host selector and the parts, nothing else.** The behaviour
is the base's five methods — `part`, `parts`, `has`, `text`, `state` — and `with` for the
CDK's filters. There is no `open()` on the select's harness and no `choose()` on the radio's,
on purpose: a helper that knows how to open a panel is a second opinion about the component's
behaviour, and it drifts with the first change to that behaviour; the parts are the contract,
and what a user does to them is the platform's business
([`req-api-platform`](../requirements/api.md#req-api-platform)). A test clicks the trigger part
and asks whether the panel part is drawn. Where a part is looked for is the one piece of
knowledge the base carries: the host itself first (a menu item IS its `item`), then under the
host, then — for a panel a component draws in an overlay — anywhere in the document.

**The declaration is held to the package, in both directions, by a gate.** `check-harness`
reads `ɵcmp` after linking, as `check-parts` does, and holds four things: the host selector to
the class's own selector list, verbatim; the parts list to what the class draws, nothing extra
and nothing left out; the union type the declaration file offers a consumer's editor to that
same list; and the cards' **Harness** rows to the names, so the page a consumer reads names
the instrument and the name is real. Every class that draws a part has a harness — that is the
denominator, and it is read off the package rather than off a list somebody maintains.

## What it costs

- **Coverage counts `testing/` now.** The skip's reason — "no `ng-package.json`, so it does
  not travel" — stopped being true the day the directory became an entrypoint, and the base
  class is executable code a consumer runs. The mutation run still leaves the entrypoint out,
  with a reason of its own written where the exception stands: the declarations have nothing
  to mutate that the gate does not already hold, and the base's few methods are the spec's.
- **The document-root fallback reads the first panel of its kind.** A test with two open
  selects gets the first one's panel from either harness. The alternative — a per-component
  link from trigger to panel — is behaviour, which the previous section refuses.
- **Duplication, twice per harness.** The union in the `extends` clause and the list in
  `parts` say the same thing, because a static member cannot type its own class. Point 5 of
  the gate is what makes the duplication safe rather than a drift waiting to happen.
- **51 classes of four lines each**, generated once from the package and held to it since.

## What it does not decide

Per-component behaviours — if a consumer asks for `open()`, that is a decision of its own,
with the drift argument above to answer. A Playwright harness environment: the CDK ships
TestBed and Selenium, and a Playwright one is somebody else's package today.
