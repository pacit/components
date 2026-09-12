# 0048 — A pagination owns its page number, and the folding is the only thing it computes

**Status:** accepted
**Implements:** [`req-api-platform`](../requirements/api.md#req-api-platform),
[`req-a11y-built-in`](../requirements/a11y.md#req-a11y-built-in),
[`req-a11y-wcag`](../requirements/a11y.md#req-a11y-wcag),
[`req-api-signals`](../requirements/api.md#req-api-signals),
[`req-token-logical`](../requirements/tokens.md#req-token-logical)
**Evidence:** the skeleton — the component, its sandbox view, the token file and the card. The
gates (e2e in three engines, axe, hydration, the mutation run over the folding logic) are the
next session's, and until they exist the card says so row by row.

## The question

Every library ships something called pagination, and they are not the same component.

One is **links**: a `<nav>` of `<a href>`, the current page read from the URL, "activate"
meaning the browser navigates. The page number lives in the router; the component only draws.

The other is a **control**: it holds the current page as state, emits when the user moves, and
the application slices its own data to match. Nothing navigates. This is what a data table
under one route needs, what an image gallery needs, what a search-results panel that fetches on
change needs.

The user asked for the second one first, and noted the first will likely follow — and that a
third, wired into a future table, may be needed if this one does not fit. So the question is
not "which pagination" but: **what is the smallest honest contract for the control-shaped one,
and where is its boundary with the other two?**

## The decision

`PctPagination` **owns the current page**. `page` is a `model<number>`, 1-based, and it is the
value: an application sets it, a press writes it back, and a write out of range is clamped into
`[1, count]`.

Three things fall out, and the first two are the whole point of the shape:

**`count` is a number of pages, never a number of items.** The component that knows how to turn
a data source into a page count is the component that holds the data source, and that is not
this one. `Math.ceil(total / pageSize)` is one line at the call site. Taking `length` +
`pageSize` as inputs instead would drag a page-size model, its options list and its own
control into a component whose job is to move an integer — and it would still not know how to
count a server-paged source. So `count` it is, and the derivation stays where the data is.

**The folding is the only thing this component computes.** Given `page`, `count`,
`siblingCount` and `boundaryCount`, `items` is a pure function producing
`(number | 'ellipsis')[]` — the pinned ends, the window around the current page, and an
`'ellipsis'` wherever **two or more** pages were folded away. A single hidden page is drawn as
itself: a "…" that stands for one number wastes the reader's time. This is the one thing the
platform has nothing for, and it is therefore the surface the mutation run has to hold hardest
([`req-api-signals`](../requirements/api.md#req-api-signals) — derived state is a signal, and a
signal the tests do not pin is a claim with no measurement).

**Everything else is the platform's.** Every control in the strip is a native `<button>`. The
press, `Enter`, `Space`, `Tab` between them, the disabled state at the ends — none of it is
written here ([`req-api-platform`](../requirements/api.md#req-api-platform)). The keyboard map
in the card is empty on purpose, the same way the menu's and the accordion's are.

## What is refused, and why

**Item-count inputs (`length` + `pageSize`).** Refused above: they move a model this component
should not own and still do not cover a server-paged source. A `pageSize` selector, a "jump to
page" field and a "showing 1–20 of 400" summary are **compositions around** the pager, not
parts of it. They may ship as siblings; they are not inputs here.

**A `toolbar` role with a roving `tabindex`.** The APG toolbar pattern makes a group of
controls one tab stop and walks them with the arrow keys. It is refused because pagination's
buttons are **independent destinations**, not a set operated as a unit: a roving index would
hide every page number but the current one from sequential keyboard navigation and from a
screen reader's "next focusable" command. The cost of not doing it — one tab stop per rendered
button — is real, and it is capped by `siblingCount` / `boundaryCount` holding the strip to
about nine numbers plus two steppers. A row of buttons is something the platform already makes
perfectly navigable; a toolbar would be inventing a worse version of it.

**A second icon name for the "next" chevron.** The icon set is a component and a new name in it
is a decision of its own ([0011](0011-icons.md), [0028](0028-an-icon-set-is-a-component.md)) —
`PctIconName` is a closed five-word list. So the steppers draw **one** `chevron-down` and each
turns it a quarter-turn in the stylesheet, which is the calendar's move one component over. The
turn is logical-safe because it is a rotation of a symmetric glyph: once `dir` mirrors the row,
`previous` points at the inline start in both writing directions with no RTL rule of its own
([`req-token-logical`](../requirements/tokens.md#req-token-logical)).

**A templated "Page N" accessible name.** Inside a landmark named "Pagination", a button
reading `3` is announced "3, button", and the current one "3, current page, button" off
`aria-current` — which is a valid accessible name
([`req-a11y-built-in`](../requirements/a11y.md#req-a11y-built-in)). "Page 3" would need a text
channel carrying a number in a language's own word order, and this library does not have one:
the same seam the date field's format letters stand on. It is written in the card as a known
limitation rather than solved in a hurry.

## What is written, and why it is a landmark

The host is a `navigation` landmark — `role="navigation"` with a name — and **not**
`role="group"`. Moving between pages of a collection is navigation of content whether or not a
page boundary is a URL; a screen-reader user reaches the pager through the landmark list and
steps over it the same way. `role="group"` would bury it among the page's widgets.

The name is required and settable. Two pagers on one page — above and below a table — are two
landmarks, and a screen reader that announces "Pagination" twice with nothing to tell them
apart has made the landmark useless. `texts().paginationLabel` carries a sensible default in
the application's language; `ariaLabel` is the per-instance override ("Pagination, top").

The current page carries `aria-current="page"` and, visually, a fill **and** a text colour of
its own — two channels before the border is looked at, so a forced-colours mode that drops the
fill still says "here" ([`req-a11y-forced-colors`](../requirements/a11y.md#req-a11y-forced-colors)).
The token is named `item-*-selected` for the name dictionary; the DOM attribute is
`data-pct-current`, which — unlike `data-pct-selected` — cannot be read as another entrypoint's
selector ([`lesson-162`](../lessons.md#lesson-162), the tabs' and calendar's workaround turned
into a reason).

## Consequences

**The clamp is written back to the model from an effect.** `page` is the source of truth and a
consumer may write anything into it; `current` is `page` clamped into `[1, count]`, and an
effect writes `current` back when it differs. Writing a model from an effect is a narrow
exception — taken here because the alternative, a view showing page 10 while the model says
999, is a worse contract. A well-behaved consumer never sees it fire.

**The boundary with the other two paginations is now drawn.** The links pager takes its current
page from the router and "activate" means navigate — every sentence above about `page` being
the value is then false, so it is a **different component**, not this one behind a flag. The
table's pager, when the table is built, is most likely this component wired to the grid's own
paging signals; if the grid's shape does not fit, a grid-specific pager is the third, and this
decision is what it will be measured against.

**The cost in bytes** is the next session's number — the `./pagination` row of the size
snapshot does not exist yet. What is already known: it is on `./core` and `./icon`, it pulls
`NgTemplateOutlet` from `@angular/common` (which `./icon` already requires, so no new external
dependency), and it adds three strings to `PCT_TEXTS` — `paginationLabel`,
`paginationPrevious`, `paginationNext` — which is a few bytes on every entrypoint in the
package, the toast's and drawer's price again.
