# 0051 — Chips are a list the user shortens, and focus outlives the button it stood on

**Status:** accepted
**Implements:** [`req-a11y-built-in`](../requirements/a11y.md#req-a11y-built-in),
[`req-api-platform`](../requirements/api.md#req-api-platform),
[`req-api-texts`](../requirements/api.md#req-api-texts),
[`req-a11y-touch`](../requirements/a11y.md#req-a11y-touch),
[`req-a11y-forced-colors`](../requirements/a11y.md#req-a11y-forced-colors),
[`req-token-logical`](../requirements/tokens.md#req-token-logical)
**Evidence:** `libs/components/chips/`, `apps/sandbox-e2e/src/chips.spec.ts`, the RTL and
forced-colours readings in their own specs, the unit suite in
`libs/components/chips/src/chips.spec.ts`; the probes quoted below — where focus lands when
the element under it is removed, and whether an empty `role="list"` is an audit violation —
were measured in Chromium, Firefox and WebKit before anything was written

## The question

Four different things wear the name "chip", and a component that tries to be all of them ends
up as Material's: a grid with roving `tabindex`, arrow-key handlers, and three subclasses. So
the first question is not how to build a chip — it is which of the four this library still
owes anybody:

- **a static label** — a word in a coloured box. That is the badge, its own item of the plan,
  and nothing about it involves this component;
- **a selectable chip** — a filter the user toggles. That is a checkbox (or a radio) wearing
  different clothes, and the library already has the controls whose state the platform
  publishes ([0039](0039-a-state-the-platform-publishes-is-not-ours-to-write.md)). A second
  element with a hand-written `aria-pressed` would be the exact thing 0039 refuses;
- **an input chip** — a value typed into a combobox and kept as a token. That is the select
  family's road, and belongs to it on the day it is walked;
- **a chosen value the user can take back** — the active filters above a table, the
  recipients of a message. Nothing in the library renders this, and no single platform
  element is it.

The last one is the component. Everything below is about it alone.

## A list is the platform's, and so is the count

A row of chosen values is a **list**: the fact a screen reader owes its user first is "three
of these", and `role="list"` / `role="listitem"` buy that count with two attributes. The host
elements are the library's usual custom elements, so the native `<ul>`/`<li>` are out of
reach — the roles are the same move `pct-tab` makes with `tabpanel`
([0045](0045-a-panel-nobody-chose-is-still-text-in-the-document.md)): the platform's
semantics, declared on the element that is actually there.

The container takes an optional `ariaLabel` and has **no text key behind it**: a list is
allowed to be nameless, and a library default would have to guess what the list holds —
"Chips" names the paint, not the content. Where two rows stand on one page ("recipients",
"active filters"), the consumer tells them apart with the input, which is `pct-pagination`'s
arrangement with the guessable half removed.

**The role is static, and that is measured rather than assumed.** The hypothesis was that an
empty `role="list"` would need the role taken off — the empty listbox is a critical audit
violation ([`lesson-106`](../lessons.md#lesson-106)), and `list` declares the same required owned elements in the ARIA
grammar. Axe disagrees: a `role="list"` with zero items raises **nothing** in any of the
three engines, and custom elements as its `listitem` children pass clean. So the empty state
needs no machinery at all, and a computed role that existed to dodge a violation nobody can
measure would be the gate-shaped superstition this repository keeps finding in other
libraries' code.

## Removal is an announcement, not an act

The chips do not own the collection. The values belong to the application — a chip row is a
**projection** of somebody else's array, written with `@for` over it — so a chip has no
`remove()` to perform, only a `removed` to say. The consumer hears it and shortens their own
data; the row follows on the next render. This is `pct-pagination`'s split
([0048](0048-a-pagination-owns-its-page-number.md)) one notch further: the pager owns the one
number the platform has nothing for, and a chip owns **nothing but the announcement**,
because even its text is projected content.

The consequence worth writing down: a `removed` the consumer ignores removes nothing. A
confirmation dialog, an undo window, a value that must stay — all of them are the consumer
not shortening the array, and the component is correct to stand still.

## Focus outlives the button it stood on

The one thing the platform has nothing for. Every removal control is a real `<button>` — the
press, the keyboard and the focus ring are the platform's, and this component ships **zero
key handlers** — but when the press succeeds, the element under focus leaves the document.
Measured in all three engines: `document.activeElement` lands on `<body>`. Tab order restarts
from the top of the page, and a keyboard user who just removed one of five filters is back at
the navigation bar.

So the container repairs it. At the press, the chip arms its parent with its own position;
one render later, the parent checks what actually happened:

- the chip is still connected — the consumer did not shorten the array, focus never moved,
  there is nothing to repair;
- the chip is gone and focus is genuinely lost (`activeElement` on `<body>` or `null`) — the
  parent focuses the remove button of the **nearest surviving chip after** the removed one,
  falling back through the ones before it, skipping any that has no button;
- the chip is gone but focus is somewhere real — the application moved it on purpose, and a
  repair would be a fight with the consumer.

The arm lives for exactly one render (`afterNextRender`) and no longer: a removal the
consumer performs two seconds later, behind a confirmation, is a removal the user has
navigated away from, and yanking focus back would be the repair causing the defect it exists
to prevent.

What the repair buys a keyboard user is worth naming: Enter, Enter, Enter empties the row.
Each press lands focus on the next button, so clearing five filters is five keystrokes with
no Tab between them — the behaviour Material builds a grid pattern for, delivered here by
the list standing still while focus steps through it.

When the **last** chip goes, the repair has no target and does nothing. The component cannot
know what the page wants focused when the row is empty — the heading above it, the input
beside it, nothing — and the consumer who removed the last value is the one who knows what
stands next to the list.

## What is refused, and why

- **`Delete` / `Backspace` on a chip, arrow keys across the row** — there is no ARIA APG
  pattern for chips, and the library does not invent keyboard grammars
  ([`req-api-platform`](../requirements/api.md#req-api-platform)). Tab reaches every button,
  Enter and Space press it, and the focus repair makes serial removal cheap. A grid pattern
  is Material carrying its own invention.
- **selectable chips** — a checkbox in different clothes; refused above, with 0039.
- **a disabled remove button** — a control drawn where it cannot be used is a promise struck
  through. A chip that must stay is a chip whose `removable` is off, and the button is not
  drawn at all.
- **focus placement when the row empties** — refused above: the component would be guessing
  at page structure it cannot see.
- **a `chips` model of the collection** — the component would then own a copy of data whose
  truth lives in the application, and every removal would happen twice.

## Consequences

- `pct-chips` is `role="list"` with an optional consumer-given name; `pct-chip` is
  `role="listitem"`, its content projected, its removal control a real `<button>` whose name
  is COMPOSED — `texts().chipRemove` and then the chip's own label, joined by
  `aria-labelledby`. One text key still, the toast's `Dismiss` argument at the next
  component: "remove" is what happens to a chosen value, and a language that spells it apart
  from "dismiss a message" has nowhere else to say so.
- **The composition is an amendment, dated 2026-09-16.** This record first said the verb was
  the only name the button needed, because the label stands beside it inside the same
  `listitem`. That was an argument about what a reader does, and the readers disagreed: Orca
  `Remove · button.`, NVDA `Remove, button`, VoiceOver `Remove button list Active filters 5
items` — at every one of five chips, the list named and counted, the chip never said
  ([`lesson-218`](../lessons.md#lesson-218)). The cost of the fix is two ids per chip and a
  clipped span; the cost of the argument was a user clearing five filters hearing `Remove`
  five times.
- A chip standing outside `pct-chips` is a `listitem` outside a `list` — a dev-mode warning
  says so once, at first render.
- The removal button's target is `--pct-target-min` outright
  ([`req-a11y-touch`](../requirements/a11y.md#req-a11y-touch)); the chip itself is not
  interactive and owes no target.
- The row is `flex` with a logical gap and the pill is drawn with border + background, so
  forced colours keep the boundary when the fill goes
  ([`req-a11y-forced-colors`](../requirements/a11y.md#req-a11y-forced-colors)).
- The repair is the one behaviour worth a mutation run's attention: arm-then-check with the
  three-way verdict above, and every branch of the verdict is observable from a test that
  counts where focus stands.
