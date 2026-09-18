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

[`_reader/`](_reader) is a small library written for them to read, in the three shapes a public
name arrives in:

- [`plain.ts`](_reader/plain.ts) — the `export` keyword on the declaration, beside a lifecycle
  hook and a private method, which are not API and have to stay out of the result;
- [`listed.ts`](_reader/listed.ts) — the keyword on no declaration at all: a class, a class
  renamed on its way out and a type, exported by a list at the foot of the file;
- [`merged.ts`](_reader/merged.ts) — the two shapes that put several declarations under one
  name, a class merged with an interface and an overload set above its implementation. Each is
  one item, because a consumer imports the name once, and the tag is read off the first
  declaration that carries one. Three of its names hold a tag away from the first
  declaration — one deprecated on its second signature, one dated on its second, one method
  dated on its second and deprecated on its third — so a reader that stops looking past the
  first, or stops merging what it finds, loses one of them at once. What one item cannot say
  is two different dates under one name, which is
  [4.75](../../docs/plan.md) and not yet answered.

[`_reader/expected.json`](_reader/expected.json) holds what the readers must return, counted
and not merely listed, and the gate reports a difference either way — an item gone is an API it
would now excuse, an item added is a tag it has begun asking of what nobody can call, an item
returned twice is a published number nobody can read back.

It was written against a real blindness, and grew by a second one. Until 2026-09-18 the readers
asked for the `export` keyword, so a class exported by a list, a class exported under another
name, a type beside them **and the two public methods those classes declare** were invisible —
five of the fifteen items. The repair then keyed one declaration per name, which hid a class
merged with an interface just as thoroughly; `merged.ts` is what caught it. Put either reading
back, and the control names what it loses.

The prepared sources enter the root project's compiler program
([`tsconfig.root.json`](../../tsconfig.root.json)): code a gate is measured against is worth
compiling, and `check-typecheck` would otherwise read the directory as TypeScript no compiler
sees.
