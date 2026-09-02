# 0056 — A tree is a walk the platform does not have

**Status:** accepted
**Implements:** [`req-a11y-built-in`](../requirements/a11y.md#req-a11y-built-in),
[`req-api-platform`](../requirements/api.md#req-api-platform),
[`req-api-signals`](../requirements/api.md#req-api-signals),
[`req-a11y-forced-colors`](../requirements/a11y.md#req-a11y-forced-colors)
**Evidence:** `libs/components/tree/`, the unit suite in
`libs/components/tree/src/tree.spec.ts`, `/tree` in the sandbox audits, the RTL and
forced-colours readings in `apps/sandbox-e2e/`

## The question

The 1.1 tail refused key handlers eleven components in a row, because the platform always
had the keys already — a link Tabs, a `<details>` toggles, a button presses. A tree is
where that run ends, on the pattern's own terms: the ARIA APG Tree View is **one tab stop**
with a roving focus inside it — Up and Down between visible nodes, inline-forward to open
and enter, inline-back to close and leave — and the platform has **no element that does
any of it**. What this component adds is the walk; that is the same sentence the chips
opened with about their focus repair, at a component whose whole value is the sentence.

Everything else is refused ownership, the family line: the nodes are **projected**
(`pct-tree-item` nested inside `pct-tree-item` — the markup is the hierarchy, no `data`
input), each branch owns its `expanded` as a model (local UI state, two-way), and the tree
owns exactly one thing — `selected`, a model of the chosen item's `value`, the
pagination's ownership at a hierarchy.

## The structure, measured before it was written

The probe (the [0050](0050-probes-before-code.md) habit) put the pattern's skeleton in
front of axe in all three engines: custom elements carrying `treeitem`, a branch holding a
`role="group"` of children, **no `aria-level`, `aria-posinset` or `aria-setsize`
anywhere** — clean in Chromium, Firefox and WebKit alike, with the role engine counting
every nested item. The DOM structure IS the level; writing the numbers by hand would be a
second copy of it that can drift.

Two more answers came with it: a **collapsed** branch's hidden group drops its children
out of the tree the way it should, and an **empty** `role="tree"` raises nothing in any
engine — the `list` carve-out of [`lesson-138`](../lessons.md#lesson-138) extends to
`tree`, so the role is static and an empty tree needs no machinery (the lesson's rule —
size the machinery to the exact role — cuts the other way this time).

## The walk

One `keydown` listener on the tree, walking the **visible** items in document order —
visibility is a chain of signals (`!parent || parent.expanded() && parent.visible()`),
never a DOM read:

- `ArrowDown` / `ArrowUp` — the next / previous visible item;
- `Home` / `End` — the first / last;
- inline-forward (`ArrowRight` in LTR, `ArrowLeft` under RTL — the direction is read off
  the computed style at the keypress, so the swap is the platform's fact, not a flag) —
  a closed branch opens; an open one steps into its first child; a leaf ignores it;
- inline-back — an open branch closes; anything else steps to its parent;
- `Enter` / `Space` — selects the item under focus.

Focus really moves (roving `tabindex`, the menu's arrangement): exactly one item holds
`0`, the rest `-1`, and collapsing a branch that held the active item hands the pointer
back to the nearest visible fallback rather than leaving `0` on a node nobody can see.

**A pointer does what a pointer means**: a click selects, and on a branch it also
toggles — the file explorer's single-click convention, one gesture for "look here". The
click handler stops propagation, because a treeitem stands inside its ancestors and one
press must not select the whole lineage.

## Collapsed is hidden, not gone

A collapsed group is `hidden="until-found"` — the tabs' answer
([0045](0045-a-panel-nobody-chose-is-still-text-in-the-document.md)), carried whole: the
browser's find-in-page still searches a folded branch, `beforematch` expands it, and the
user lands IN the branch instead of watching their match vanish. The `@supports
(content-visibility: hidden)` fallback comes with it, for the engine that reads
`until-found` as plain hidden. An `@if` would have been simpler and wrong twice: a
destroyed subtree forgets its own `expanded` state, and text that is not in the document
cannot be found.

## What is refused, and why

- **a `data` input** — the markup is the hierarchy; an array of nodes regenerates
  structure the consumer already wrote, the breadcrumb's `items` refusal one level deep.
- **typeahead** — the menu already carries one; a third private copy of that machinery is
  exactly what `lesson-21` warns about, so it arrives WITH the extraction into `core`
  (the plan's behaviour-layer item), not before it.
- **multi-select** — `aria-multiselectable`, range gestures and an announcement model of
  its own; a decision of its own the day a real application asks.
- **async loading** — `aria-busy` on a loading branch, a state for "asked and empty" —
  the select's loading decision ([0037](0037-loading-is-a-fact-about-the-list.md)) at a
  hierarchy, and it returns as its own record.
- **drag to reorder, virtualization** — application machinery; the second is 1.2's
  problem and arrives with the datagrid or not at all.
- **selection following focus** — the APG allows it and file explorers do it, but it
  turns every arrow press into a write into the application's model; the quiet walk with
  an explicit `Enter` is the smaller promise, and the click keeps the one-gesture feel.

## Consequences

- `pct-tree` / `pct-tree-item`, two-slot projection: an item's own text is its label, and
  nested `pct-tree-item` elements are pulled into the branch's `role="group"` — the
  consumer writes the tree as the tree.
- The walk is the library's **third** private movement machinery (the select's list, the
  menu's walk, now this). `lesson-21` said "before the second"; the extraction into
  `core` now has three consumers waiting and is recorded against the plan's
  behaviour-layer item.
- No strings: the fifth component adding nothing to `PCT_TEXTS` — every word is the
  consumer's, and the expand state is `aria-expanded`, which a reader says itself.
- Tokens: the row (padding, radius, hover and selected pair), the arrow, the per-level
  indent; the name dictionary grows the property `indent`.
- Forced colours: the selected row drops its fill and stands in `Highlight` /
  `HighlightText`, the arrow and the rest in `CanvasText` — written out per `lesson-70`.
