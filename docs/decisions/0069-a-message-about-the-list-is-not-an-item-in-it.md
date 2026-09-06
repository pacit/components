# 0069 — A message about the list is not an item in it

**Status:** accepted
**Implements:** [`req-a11y-axe`](../requirements/a11y.md#req-a11y-axe),
[`req-a11y-built-in`](../requirements/a11y.md#req-a11y-built-in),
[`req-api-parts`](../requirements/api.md#req-api-parts),
[`req-api-platform`](../requirements/api.md#req-api-platform)
**Evidence:** `apps/sandbox-e2e/src/a11y.spec.ts › "an empty panel has no violations"` — the
stage the audit had never opened (plan 4.8), in three engines;
`apps/sandbox-e2e/src/select.spec.ts › "the sentence stands beside the list, not in it"` and
the same case in `libs/components/select/src/select.spec.ts`, beside the window's cases moved
to the list; `node_modules/axe-core` 4.12.1, `aria-required-children` and
`scrollable-region-focusable` read at the source; [`lesson-106`](../lessons.md#lesson-106) —
an empty listbox is a **critical** violation

## The question

The select's panel was one element: `role="listbox"`, the surface, the scroll, and — when the
list had nothing to show — a sentence saying so, drawn inside it. Four axe cases stood over
the component and none had opened a panel with nothing in it; the recorded run over
`select-empty` reports `aria-required-children` at **critical**, from the listbox itself:
"Required ARIA children role not present: group, option". The waiting panel escapes it by
`aria-busy` ([0037](0037-loading-is-a-fact-about-the-list.md)); a list that is genuinely empty
has no such excuse.

Three answers were on the table, each with a fault. A message row wearing `role="option"` is
an option nobody can pick. Dropping the role while the panel is empty leaves the trigger's
`aria-haspopup="listbox"` and `aria-controls` pointing at something else. Closing the panel
over an empty list is a press that answers nothing.

## The decision

**The panel is a surface, and the list inside it is the listbox.** `panel` keeps its name and
its job — the overlay's face, the border and the shadow, `pctFocusStays`, the scoped theme —
and a new part, `list`, is the `role="listbox"`: the id the trigger controls, the accessible
name, `aria-multiselectable`, `aria-busy`, the rows and the groups. The sentence — "No
options", "No matches", "Loading…" — is the panel's, drawn **beside** the list, and it stays a
message: no role and no live region of its own, because the announcer already speaks it
([0026](0026-one-channel-per-politeness.md)) and a `role="status"` appearing with its text
would say it twice.

What makes this the answer rather than a fourth guess is read off axe's own source.
`aria-required-children` fails a listbox holding content it cannot own, and marks an EMPTY
listbox for review (`reviewEmpty`), which the audit does not count. So the tree with the
sentence outside is a state, and the tree with it inside was a violation — and an empty
listbox with an id the combobox controls is exactly what the combobox pattern draws while
there is nothing to pick.

The list is also **the element that scrolls**, and that is
[0038](0038-a-window-is-measured-and-its-spacer-is-not-an-element.md)'s finding carried over
rather than decided again: `scrollable-region-focusable` stands down for a combobox's own
popup — an element in a popup role whose id a combobox controls — and for nothing else. A
scrolling surface AROUND the listbox would be the CDK viewport's tree with the names changed,
and a serious violation on the same rows. So the cap, the overflow and the window's spacers
moved with the role, and the panel's token still says how tall the panel gets: the list's cap
is the token less the panel's border.

## What it costs

- A part: `list` on both classes, in both harnesses and in the card; `./select` grows by
  988 B and `./testing` by 14 B.
- Every reader of the listbox's attributes moved one element in: the unit and e2e cases that
  asked the panel for `aria-busy`, `aria-multiselectable`, its id, its spacers and its
  `scrollTop` ask the list now. A skin styling `[data-pct-part="panel"]` for the surface is
  untouched; one styling it for the scrollbar is not.
- The sentence's room: the list's padding was what stood around it, and an empty list is
  padded by nothing, so the sentence carries its own margin — the picture is the one it was.
- Three things a scroller inside a surface needs that a surface that scrolled did not, each
  found by a picture: `box-sizing: border-box`, or the cap counts the padding and the panel
  stands 8 px taller than its token (measured 248 against 240); the panel's own background,
  because a scrolling layer with no opaque paint of its own draws its text without subpixel
  antialiasing; and the panel's radius less its border, because a square opaque box in a
  rounded surface paints its corners over the page (24 pixels, four corners).
- Two baselines re-recorded for antialiasing alone: `select-panel-multiple` and its RTL twin.
  Under the old geometry the many-choice rows' text was drawn grayscale and the single-choice
  rows' with subpixel fringes; with the list as the scroller both are drawn alike, and the
  many-choice picture moved by 2015 pixels on glyph edges and nowhere else — measured against
  the old picture with the scroll put back on the panel, where the same page differs by 33
  ([`lesson-165`](../lessons.md#lesson-165)'s shape, one element in).

## What it does not decide

- Whether an empty listbox should ALSO be described by the sentence (`aria-describedby` on
  the trigger). Focus is on the trigger, the announcer has spoken, and no reader was found
  asking for a third channel.
- The other panels. A menu, a tree and a calendar have no empty state a consumer can reach;
  if one grows one, this is its shape.
