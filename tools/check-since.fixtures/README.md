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

## The readers have a control of their own

The cases above examine the **judge** — they hand it items and require a rejection. Nothing in
them examines the **readers**, and a reader that stops seeing an API leaves the gate green over
an undated one: the list of items is exactly what the reader was supposed to produce, so no
prepared list can miss its absence.

[`_reader/`](_reader) is a small library written for them to read: the same surface twice, once
with the `export` keyword (`plain.ts`) and once with a list (`listed.ts`, where the keyword is
on nothing and every name still reaches a consumer), plus the entry point that re-exports both.
[`_reader/expected.json`](_reader/expected.json) holds what the readers must return, and the
gate reports a difference either way — an item gone is an API it would now excuse, an item
added is a tag it has begun asking of what nobody can call.

It was written against a real blindness: until 2026-09-18 the readers asked for the `export`
keyword, so a class exported by a list, a class exported under another name, and a type beside
them were invisible — five of the ten items below. Put that reading back, and the control names
all five.
