# 0054 — A breadcrumb is the way here, told in the platform's own links

**Status:** accepted
**Implements:** [`req-api-platform`](../requirements/api.md#req-api-platform),
[`req-a11y-built-in`](../requirements/a11y.md#req-a11y-built-in),
[`req-a11y-forced-colors`](../requirements/a11y.md#req-a11y-forced-colors),
[`req-a11y-touch`](../requirements/a11y.md#req-a11y-touch)
**Evidence:** `libs/components/breadcrumb/`, the unit suite in
`libs/components/breadcrumb/src/breadcrumb.spec.ts`, `/breadcrumb` in the sandbox audits,
the RTL and forced-colours readings in `apps/sandbox-e2e/`

## The question

A breadcrumb is the page saying where it stands: a run of links back up the hierarchy, with
the current place at the end. The ARIA APG shape is settled — a **named `navigation`
landmark** holding an **ordered list of links**, `aria-current="page"` on the one you are
on — so the questions here are not what to build but who owns which half of it:

- **the anchors are the consumer's.** Every step is a real `<a href>`, and in an Angular
  application that anchor carries `routerLink` — which means the library cannot generate it
  from an items array without re-exposing the router's whole surface through its own inputs.
  [0048](0048-a-pagination-owns-its-page-number.md) drew this exact line from the other
  side: the pager owns its page number because its buttons _emit_; a component whose
  activation _navigates_ takes its state from the router and its markup from the consumer.
  The breadcrumb is that other component.
- **the structure is the library's.** The landmark, its name, the list semantics a reader
  counts by, and the separator nobody should hear — none of that is content, and a consumer
  hand-writing `role="listitem"` around every link would get it wrong once per project.

## The structure, measured before it was written

The probe (the [0050](0050-probes-before-code.md) habit) put two arrangements in front of
axe in all three engines. Links standing **directly** in a `role="list"` are an
`aria-required-children` violation — **critical, in Chromium, Firefox and WebKit alike**.
The carve-out [`lesson-138`](../lessons.md#lesson-138) recorded is only for the _empty_
list: a list with the _wrong_ children is flagged where a list with none is not. Wrapped in
`role="listitem"` hosts, the same trail is clean in all three, and an `aria-hidden`
separator inside the listitem pollutes no link's accessible name.

So the component is three pieces, each on the element that is really there
(`req-a11y-built-in`):

- **`<pct-breadcrumb>`** — the `navigation` landmark, named by `texts().breadcrumbLabel`
  with an `ariaLabel` input above it (the pagination's exact arrangement: the key is a
  sensible default in the application's language, the input is how two trails on one page
  are told apart). Inside it, one element carrying `role="list"`.
- **`<pct-crumb>`** — one step: `role="listitem"`, and the separator drawn before its
  content. A custom element cannot be an `<li>`, so the role is declared — `pct-chip`'s
  move, one decision back.
- **`a[pctCrumbLink]`** — a component standing on the consumer's own anchor. A component
  and not a directive for [`lesson-96`](../lessons.md#lesson-96)'s reason: projected
  content keeps the encapsulation of the template that declared it, a directive cannot
  carry styles, and the public styling API here is not to stand on `::ng-deep`. On the
  anchor itself, the stylesheet reaches every state the anchor owns — rest, hover, focus,
  and `aria-current` — while `routerLink`, `href` and the whole keyboard stay the
  platform's.

## The separator is drawn, and nobody hears it

The separator is the library's chevron (`chevron-down`, rotated a quarter turn — the
pagination's "same arrow the other way" rule: a new name in the icon set is a decision, a
rotation is a stylesheet's line), pointing **inline-forward**: right in LTR, left under
`:dir(rtl)`, the calendar's selector. It sits inside the listitem, silent by the icon
host's own `aria-hidden`, and the first crumb hides its separator with `:first-of-type` —
CSS answers "am I first" correctly on every insert, removal and reorder, where a signal
would need wiring to notice any of them.

## The current place is the router's sentence, not ours

`aria-current="page"` belongs to whoever knows what the current page _is_ — in an Angular
application that is the router (`routerLinkActive` writes it with
`ariaCurrentWhenActive="page"`), and in a hand-written trail it is the consumer. This
component **styles** the attribute and never writes it: marking the last crumb current by
position would lie on every partial trail, and would be a second author over the router's
own hand. The current step may also simply not be a link at all — bare text in the last
`<pct-crumb>` — and both spellings read correctly, because the styling hangs off what the
element _is_, not off a class.

Under forced colours every anchor wears `LinkText` no matter what the stylesheet says, so
colour cannot carry "you are here" alone — the current step is also a **weight**, and
weight survives every flattening (`req-a11y-forced-colors`).

## What is refused, and why

- **an `items` input** — an array of `{label, url}` regenerates anchors the router already
  owns; see the question above. The markup is the consumer's.
- **writing `aria-current` ourselves** — refused above; the component would be a second
  author over the router's hand, wrong on every partial trail.
- **a collapse ("…") for long trails** — folding steps into an overflow menu is a
  composition of this component with `pct-menu`, owned by the consumer who knows which
  steps matter; a trail too long for its line **wraps**, which is already readable. The day
  a real application shows the need, it returns as its own decision.
- **key handlers** — a breadcrumb is links; Tab and Enter are the platform's, and there is
  nothing here for arrows to do (`req-api-platform`).
- **a `size` input** — the trail is typography, not a control; it is sized by its own type
  token (the badge's argument, one decision back).
- **a separator slot** — the separator is the one glyph the component draws; a slot would
  put a word of the consumer's inside an element a reader must never hear. Skins move it
  through the token and the part.

## Consequences

- `PCT_TEXTS` grows `breadcrumbLabel` — the landmark's default name, the pagination's key
  one component over.
- The name dictionary grows the parts `link` and `separator` and the state `current` —
  three words in a diff, as `names.policy.json` intends.
- Tokens: the trail's own type size, the gap, and the link's rest / hover / current
  colours plus the current weight; the separator's colour rides on the muted text role.
- The link takes the shared target floor outright (`req-a11y-touch`) — measured into the
  design by the axe audit rather than believed: a 16px line over an 8px row gap leaves a
  wrapped trail 18px of safe space, and WCAG 2.5.8's inline exception covers sentences,
  not bars ([`lesson-139`](../lessons.md#lesson-139)).
- Dev-mode warnings, the chips' shape: a `pct-crumb` whose parent is not the list warns
  (its `listitem` would dangle), and a `pctCrumbLink` outside any crumb warns — each names
  the fix, once, at first render.
- The mutation surface is two warnings' guards; everything else is structure, tokens and a
  stylesheet.
