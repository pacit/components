# 0038 — A window is measured, and its spacer is not an element

**Status:** accepted
**Implements:** [`req-a11y-wcag`](../requirements/a11y.md#req-a11y-wcag),
[`req-a11y-built-in`](../requirements/a11y.md#req-a11y-built-in),
[`req-api-signals`](../requirements/api.md#req-api-signals)
**Evidence:** `libs/components/select/src/select.spec.ts` — 18 cases over the count, the pair
the DOM no longer carries, the cursor and the arithmetic; `apps/sandbox-e2e/src/select.spec.ts`
("a list too long to draw", 7 cases × 3 engines) — the geometry, which only a browser has;
`a11y.spec.ts` — a windowed panel scrolled into the middle of its list; a `select-panel-window`
baseline; [`lesson-108`](../lessons.md#lesson-108) — `offsetHeight` is an integer;
[`lesson-109`](../lessons.md#lesson-109) — two repairs in one run, and the count of red cases
cannot say which one worked;
[`lesson-110`](../lessons.md#lesson-110) — an effect that follows the cursor is woken by the
cursor alone; [`lesson-111`](../lessons.md#lesson-111) — two engines, two grids, so a
measurement is compared with a tolerance and never rounded

## Context

The select family's last item is **virtualisation**, and [0033](0033-an-option-is-a-row-of-data.md) already
said what it is: _"virtualisation is a promise about how many rows exist, and it can only be
made by whoever creates them."_ The panel builds its own rows, so the panel is the one thing
here that can promise not to.

The card for this component has carried the open question since v0: _"No virtualisation. `@for`
over every option. Legitimate for v0 but **unmeasured** — nothing answers 'what happens at
5,000 options'."_ It is answered now, in a browser, on the demo the card links to:

| a list of 5,000 | elements in the panel | press → rows on screen |
| --------------- | --------------------: | ---------------------: |
| drawn whole     |             **5,000** |             **626 ms** |
| windowed        |                **11** |              **15 ms** |

Half a second of a frozen page between the press and the list, and five thousand elements that
every subsequent change detection pass walks. That is the fault. What follows are the four
questions the repair had to answer, and every one of them was settled by a measurement rather
than by a preference.

## Where the scroll lives: the listbox, and not one element in

> _Since [0069](0069-a-message-about-the-list-is-not-an-item-in-it.md) (2026-09-06) the
> listbox is the `list` part inside the `panel` surface, and it is still the element that
> scrolls — this section is what decided which of the two does._

The obvious implementation is `@angular/cdk/scrolling`: a `cdk-virtual-scroll-viewport` that
scrolls, with the rows inside a content wrapper it transforms. The CDK is already a peer here,
so this looked like the cheap road.

It is not, and the reason is a rule nobody would have thought to check. axe was run over three
trees, each with a real `role="combobox"` trigger pointing at the panel:

```
A — the listbox is the scroll container (today)          (no violations)
B — a viewport inside the listbox scrolls (the CDK)      [serious] scrollable-region-focusable
C — the viewport IS the listbox                          (no violations)
```

A scrollable region with nothing focusable inside it is a WCAG 2.1.1 failure, and a listbox of
`aria-activedescendant` options has nothing focusable inside it **by design** — the focus stays
on the trigger. The only reason the panel passes today is an exemption written into the rule
itself: `scrollableRegionFocusableMatches` stands down for a **combobox's own popup**. Move the
scrolling one element in and the scrolling element is no longer the popup; it is an anonymous
`<div>` that scrolls and cannot be reached by a keyboard.

Road C — putting `role="listbox"` on the viewport — passes that rule, and fails on the list
this library already has: the CDK's fixed-size strategy takes **one** item size, and a grouped
list has two heights and a `role="group"` wrapper around each run of rows. Giving up groups to
gain a window is trading a promise already gated for one not yet made.

**So the listbox stays the scroll container**, and the window is the component's own.

## What holds the space: a box with no node

The rows nobody drew still take up room, and the room has to come from somewhere. Three
instruments, measured in Chromium, Firefox and WebKit:

- **padding does not scroll.** `padding-block: 300px 700px` on a scroll container is inside its
  padding box: `clientHeight` grows by the same 1000 px, `scrollHeight - clientHeight` stays 0.
  All three engines agree. Padding makes the panel taller, not its content;
- **a spacer element is a child of the listbox.** axe traverses generic elements, so an unnamed
  `<div>` between the listbox and its options is accepted — but the moment one carries a name
  it is `aria-required-children`, **critical**, reported from the listbox
  ([`lesson-106`](../lessons.md#lesson-106) is the same rule from the other side). A structure
  whose correctness depends on nobody ever labelling it is a structure waiting for a defect;
- **`::before` and `::after` are boxes with no node.** They scroll, they take the height they
  are given, they are absent from the accessibility tree, and the listbox keeps exactly its
  options and its groups as children.

The third one. The heights arrive through a custom property the component writes on the element
itself, and the name is deliberately **not** `--pct-…`: the prefix is this library's promise
that a skin may set a value, and a number the window computes is not a skin's to move — the
token gate would have had to be told to ignore it, which is the same statement made by a
policy instead of by a name.

A group carries its own skipped rows, because a group is an element. A nameless section draws
no element and carries none — what it skips folds into the panel's, which is the only place it
can ever be, since a section in the middle of a window is drawn whole.

## What the window is arithmetic over: a measurement, not a number

A window needs the height of a row, and this library will not take it as an input. The height
is **35.59 px** — `line-height: 1.4` on a 14 px type plus the row's padding — there is no token
for it because it is not a choice anybody made, and `size` moves it per instance. A number
typed by hand would be wrong by a fraction per row and by two thousand pixels over five
thousand rows.

Measuring it turned out to have the same trap twice:

- `offsetHeight` **rounds to an integer**. The windowed panel's `scrollHeight` came back 2,027
  px longer than the same list drawn whole — fifty-seven rows of scrollbar describing rows
  nobody has. `getBoundingClientRect().height` is exact and the two agree to the pixel
  ([`lesson-108`](../lessons.md#lesson-108));
- an exact reading is not a **stable** reading. Firefox reports the row as 35.600006 px and
  35.599990 px by turns, because each measurement writes the spacer that decides where the next
  row is laid out — measure, write, re-render, measure, until Angular gives up with NG0103 and
  the panel freezes. Rounding to a grid is the wrong repair, because engines do not share one
  (Blink 1/64 px, Gecko 1/60). The reading stays exact and the **question** gets a tolerance:
  two heights within a sixty-fourth of a pixel are one measurement
  ([`lesson-111`](../lessons.md#lesson-111)).

A shut panel forgets what it measured. The next one is a different element at the top of its
list, and a `size` changed between two openings is picked up for the same reason.

## What a window owes the reader, and what no gate will ask for

`aria-setsize` and `aria-posinset` exist for exactly this case — a set whose elements are not
all present — and **axe has no rule about them**. A windowed listbox that says neither is green
in the audit and tells the user a five-thousand-row list has eleven rows in it.

So the promise is a test's rather than a gate's, and it is written here so that it is a promise
at all. The numbering is the **flat** one, the list's rather than the group's: it is what the
walk, the ids and `aria-activedescendant` already count in, and "row 4,201 of 5,000" is the
sentence a long list needs — "2 of 3" inside a heading is not.

The pair is written **only** while a window is on. Where the DOM holds the whole set the
attributes are two more things to keep in step and say nothing the tree does not.

## The cursor and the scrollbar

They are two ways of pointing at one list and they can come apart, which is a state this
component has never been in before: every row used to exist.

- **the window follows the scrollbar.** A cursor that bent the window would mean a drag of the
  scrollbar was undone by wherever the cursor happened to stand;
- **the cursor reaches its row by moving the scrollbar**, by arithmetic rather than by
  `scrollIntoView`. `End` puts the cursor on a row that was never drawn: scrolling to the
  element would be waiting for a row that is waiting for the scroll. The geometry knows where
  the row is whether or not anything drew it;
- **that hook is woken by the cursor alone.** Tracked, it woke on the geometry too, and a
  fraction of a pixel remeasured mid-scroll snapped the panel back to wherever the cursor stood
  ([`lesson-110`](../lessons.md#lesson-110));
- **a name may point only at something drawn.** With the cursor scrolled out of the window,
  `aria-activedescendant` is dropped rather than left naming a row nobody drew. The attribute is
  optional; a dangling reference is not a valid tree, and the next arrow press brings both back
  together.

One repair that is **not** here is worth recording, because it was written, committed to a
stylesheet and then deleted by its own control: `overflow-anchor: none`. Scroll anchoring is the
browser keeping a chosen element still while the content around it changes, which is a fair
description of what a window does on every frame, and it was added while Firefox was failing.
The failures were somebody else's — the property was put back to its default and every case
stayed green, wheel-driven scrolling included
([`lesson-109`](../lessons.md#lesson-109)).

## Decision

**A window is opt-in, measured, and drawn without adding an element to the listbox.**

- `virtual` is an **input** on both tags, by [0034](0034-multiplicity-is-a-tag.md)'s own rule: a
  tag is what the type cannot say otherwise, and a window changes no type;
- it is opt-in rather than a length the library decides for itself, because of a thing the user
  has and the library cannot see — **find-in-page**. A row that is not in the DOM is not found
  by `Ctrl+F`, and a list that quietly stopped being searchable at the four hundredth option
  would be a defect nobody could report against a promise nobody made;
- the listbox is the scroll container, the spacers are pseudo-elements, and the geometry is read
  from the panel rather than declared;
- a windowed listbox carries `aria-setsize` and `aria-posinset` on every row.

## Consequences

- **Every row must be the same height**, and the library cannot check it — a label that wraps or
  a `pctSelectOption` template drawing two lines moves every row below it. Dev mode reports it
  and does not repair it, like a duplicated value: which of two heights is right is the
  application's question, and a library that answered it would be cropping somebody's second
  line.
- **`panelWidth="auto"` and a window are a poor pair.** "As wide as the longest option" is
  measured by the browser from the rows that exist, so the panel would change width as the user
  scrolls. Both are inputs and nothing stops them being set together; the card says so.
- The panel's own scroll listener is added imperatively rather than bound in the template. A
  `(scroll)` binding runs change detection on every scroll frame of **every** panel, including
  the ones drawn whole — a pass over five thousand rows for a window nobody asked for.
- The repair the window forced on a piece of existing code is worth keeping in view: the hook
  that scrolls the active row into view used to index the drawn rows by position
  (`querySelectorAll(...)[i]`), which was right only while every row stood in the DOM. It reads
  the id now.
- The count promise is measurable **without a browser** — jsdom has no layout, so the panel
  draws its probe window of forty rows and a unit case can assert that five thousand options are
  forty elements. The geometry is measurable **only** in a browser. The two gates split along
  exactly that line, and neither pretends to the other's evidence.

## What would overturn it

A row height that cannot be measured — the first list whose rows are legitimately of different
heights, which is what a `pctSelectOption` template drawing a two-line row would be. The window
would then need a measured height **per row** and a layout that survives one changing, which is
a different mechanism and not a setting on this one.
