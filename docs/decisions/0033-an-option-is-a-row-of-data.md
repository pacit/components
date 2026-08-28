# 0033 — An option is a row of data, not a component the consumer projects

**Status:** accepted
**Implements:** [`req-api-generic`](../requirements/api.md#req-api-generic),
[`req-api-templates`](../requirements/api.md#req-api-templates),
[`req-api-signals`](../requirements/api.md#req-api-signals)
**Evidence:** [`lesson-97`](../lessons.md#lesson-97) — the compiler relates no two elements of a
template, so a projected option's value is checked against nothing;
[`lesson-98`](../lessons.md#lesson-98) — projected content belongs to the view that wrote it,
so a panel with projected rows never owns how many of them exist

## Context

The select family's line opens with **projected `pct-option`** — the shape most component libraries
ship, and the one a consumer coming from Angular Material or from a native `<select>` expects:

```html
<pct-select [(value)]="country">
  <pct-option value="pl">Poland</pct-option>
  <pct-option value="de">Germany</pct-option>
</pct-select>
```

against the one this library shipped from the start:

```html
<pct-select [options]="countries" [(value)]="country" />
```

Two ways of writing one list, so it reads as a matter of taste — and the family has six more items
below this one (groups, multiple selection, filtering, clearing, async, virtualisation) whose shape
follows from whichever wins. It was measured before anything was written.

## The measurement

Four probes: a `pct-probe-select` with an `<ng-content />` inside its `cdkConnectedOverlay`
template and a `contentChildren` query, driven from a host whose `@for` writes the options.

| what was asked                                               | projected                             | as data                   |
| ------------------------------------------------------------ | ------------------------------------- | ------------------------- |
| a `number` among strings, consumer's template                | **silent**                            | **TS2322** at the literal |
| the value the parent reads out of its own query              | takes `string` **and** `number` — any | `T`, from the array       |
| option components built with the panel never opened, of 1000 | **1000**                              | 0                         |
| rendering into the overlay, and again after close → reopen   | 3 / 3, no rebuild                     | (not applicable)          |

The last row is the one that makes this a decision rather than a refusal: the projected road
**works**. Content projects into an overlay template, survives a close and a reopen without
rebuilding the instances, and a row's label is readable through `textContent` while the panel
has never been attached — enough for typeahead. Nothing about it is broken.

What it costs is the two things this library has already promised.

**The type.** [`req-api-generic`](../requirements/api.md#req-api-generic) says the value's type
comes from the option list, and [0010](0010-generic-noinfer.md) put `NoInfer<T>` on `value` so
that the list is the only thing that decides `T`. A projected option cannot carry it: the
compiler relates no two elements of a template to one another, so
`<pct-option [value]="1">` under `<pct-select [value]="aString">` is two independent
instantiations and neither is evidence about the other. The parent's own query is worse — a
class reference has no type argument to infer from, so `contentChildren(PctOption)` hands back
elements whose `value` is assignable both to `string` and to `number`. The road that looks
like more type safety, because the values are written next to the labels, has less: today's
array puts every value of the list in one literal, which is exactly where TypeScript checks
them against each other.

**The count.** A projected option is built by the **consumer's** `@for`, in the consumer's view,
when the host renders — not when the panel opens. A thousand options are a thousand component
instances on a page where nobody has clicked anything. Today's panel builds rows inside the overlay
and has none while it is closed. That difference is the family's own last item: virtualisation is a
promise about how many rows exist, and it can only be made by whoever creates them.

## Decision

**An option stays a row of data.** `options` accepts the list, `pct-option` is not built, and
the two things projection is usually reached for are answered where they already were:

- **a row that is more than a label** — `pctSelectOption`, the slot from
  [0027](0027-a-slot-is-a-directive.md). It replaces what is inside the row while the `role`,
  the id, `aria-selected` and the key map stay with the component;
- **structure in the list** — a group is a shape in the data
  (`PctSelectOptionGroup`), not an element in the template.

## Consequences

- Every item left in the family is a question about the **data**: a group is a nested row, multiple
  selection is a value shape, filtering is a predicate over the list, virtualisation is a window
  over it. None of them needs a second authoring channel.
- The library has one list and one place where `T` is decided. A consumer who wants the
  `<pct-option>` look writes a `@for` over their own array to build it and hands the array
  over — the same keystrokes, with the values checked against one another.
- The slot's own inference site (`[pctSelectOption]="list"`) keeps working for grouped lists,
  because it takes the same union the control does.
- **What is given up** is real and is written here rather than discovered later: an option
  whose content is arbitrary markup **written at the call site** — the `<pct-option>` with a
  `<span>` inside it. The slot draws arbitrary markup, but once for the list rather than once
  per option. A consumer wanting a different row per option has to branch inside the slot.

## What would overturn it

An Angular release in which a content query carries the type of what it matched — that is,
where `contentChildren(PctOption<T>)` under a `PctSelect<T>` is one inference and not two. The
count would still stand, so the projected road would become an alternative for short lists and
never the only one.
