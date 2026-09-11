# fixture — the requirements a plan is read against

<!--
  Point 8's REFERENCE, and not a case: it is the material every case of that point is
  measured against, so on its own it must pass. The `_` prefix is what says so — a fixture
  tree's prepared input is `_`-named, and `tools/check-index.mjs` leaves such an entry out
  of the case table for the same reason.

  Two requirements, because the point's two rules turn on the difference between them: one
  whose state is `enforced` and one whose state is `gap`. The identifiers are fictional by
  design; this whole tree is exempt from the citation check of point 4.
-->

### <a id="req-fixture-shipped"></a>`req-fixture-shipped` — A promise with a machine behind it

**Promise.** Something is true of this repository, and something can fail when it stops
being true.

**Gate:** `tools/check-docs.mjs` — a gate that exists, which is what takes this requirement
out of the gap list
**Control:** `tools/check-docs.fixtures/` — and a negative control beside it

### <a id="req-fixture-unbuilt"></a>`req-fixture-unbuilt` — A promise nothing measures yet

**Promise.** Something is meant to be true of this repository and nothing measures it.

**Gate:** none — gap: nothing measures this yet, which is exactly what the plan item below
is for
**Control:** none — gap: there is no gate here for a control to prove capable of failing
**Binds at:** the first case that needs it
