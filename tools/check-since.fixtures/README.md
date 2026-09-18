# Negative control of the since gate

Deliberately defective inputs. `tools/check-since.mjs` runs all four of its points on each of
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
  hook, a protected method, a protected field and a private method, which are not API and have
  to stay out of the result; a `model.required` whose call shape the reader has to recognise;
  and a field and a getter that are no input at all, which ship in the types like the rest;
- [`listed.ts`](_reader/listed.ts) — the keyword on no declaration at all: a class, a class
  renamed on its way out and a type, exported by a list at the foot of the file; and one class
  exported by nothing, whose public method ships nowhere and must not be asked for a date. It
  holds no member on purpose: `membersIn` reads every class in the file, exported or not,
  because an unexported base class hands its inputs to the exported class that extends it;
-

- [`merged.ts`](_reader/merged.ts) — the two shapes that put several declarations under one
  name, a class merged with an interface and an overload set above its implementation. Each is
  one item, because a consumer imports the name once, and the tag is read off the first
  declaration that carries one. Three of its names hold a tag away from the first declaration —
  one deprecated on its second signature, one dated on its second, one method dated on its
  second and deprecated on its third — and two carry a date on two declarations at once, which
  is the case [4.75](../../docs/plan.md) is about: the first wins, and the second is shown
  nowhere.

[`_reader/expected.json`](_reader/expected.json) holds what the readers must return, counted
and not merely listed, and the gate reports a difference either way — an item gone is an API it
would now excuse, an item added is a tag it has begun asking of what nobody can call, an item
returned twice is a published number nobody can read back.

It was written against a real blindness, and grew by every one found after it. Until 2026-09-18
the readers asked for the `export` keyword, so a class exported by a list, a class exported
under another name, a type beside them **and the two public methods those classes declare**
were invisible — five of the nineteen items. The repair then keyed one declaration per name,
which hid a class merged with an interface just as thoroughly. Four reviews of that repair
added the rest: the deprecation read off any declaration, the merge in both readers, the
direction it merges in, the protected and unexported exclusions, the `model.required` call.
Put any of those readings back and the control names what it loses; the list is in the commits.

`merged.ts` also holds a field that OVERRIDES one of `plain.ts` — the shape the readers skip,
because the declaration it overrides is the one a consumer's editor shows and the one the gate
dates. Remove the skip and the control names the item it should not have found.

**What it does not cover, knowingly:** a member or method whose name is computed or private by
`#`, an anonymous `export default class`, a constructor or an accessor, `export * as ns from`,
and a barrel that renames what it re-exports. None of those shapes exists in the library, and
some are refused by other gates; each would need a prepared case before it could arrive.

The prepared sources enter the root project's compiler program
([`tsconfig.root.json`](../../tsconfig.root.json)): code a gate is measured against is worth
compiling, and `check-typecheck` would otherwise read the directory as TypeScript no compiler
sees.
