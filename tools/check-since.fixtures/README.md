# Negative control of the since gate

Deliberately defective inputs. `tools/check-since.mjs` runs all three of its points on each of
them and **requires every one to be rejected — and rejected by the point it declares**. An
input that passes is a fault; an input that fires for a reason other than the one written in
its file is a fault just the same, because it proves something other than what it declares.

The reason it exists is the same as for every other gate here
([`req-quality-negative-control`](../../docs/requirements/quality.md#req-quality-negative-control)):
**a new gate is not ready when it passes — it is ready when it has been shown to fail.**

[`an-input-that-says-not-since-when.json`](an-input-that-says-not-since-when.json) is the
state the whole library was in before the gate existed: every member documented, none dated.

## How a case is built

Each case is built ON A COPY of [`_reference.json`](_reference.json) — a released library at
`0.1.0` whose surface is dated — so the file holds nothing but its own defect: `add` appends
items, `items` replaces them all, `version` replaces the manifest's. `point` and `check` name
the point that has to fire and the check it fires as.
