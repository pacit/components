# 0110 — A frame is three parts the application arranges

**Status:** accepted
**Implements:** [`req-api-platform`](../requirements/api.md#req-api-platform),
[`req-a11y-built-in`](../requirements/a11y.md#req-a11y-built-in),
[`req-token-names`](../requirements/tokens.md#req-token-names),
[`req-project-tree-shaking`](../requirements/project.md#req-project-tree-shaking)
**Evidence:** `libs/components/topbar/`, `libs/components/nav/`, `libs/components/description/`
with their unit suites; `/frame` walked by `apps/sandbox-e2e/src/frame.spec.ts` at a wide
and a narrow window, the axe audit and the hydration reading of the same view

## Context

The first consumer, a smart-home application, asked for the frame its screens stand in: a top
bar with the screen's title, actions, the signed-in user and sign-out; a navigation between
screens, a list of links with icons and the current one marked — at the side on a wide screen
and in the drawer on a narrow one; and a "key: value" list for an entity's details, a label, a
value with its unit and an optional control that changes it.

Every library that ships these ships them as a shell: one component that owns the page, takes a
breakpoint, and moves the navigation between a column and a drawer by itself. This repository
drew the edge of that offer before it had a frame to draw it for:
[0057](0057-layout-is-three-entrypoints-not-a-framework.md) refused a breakpoint dictionary and
left the query to the consumer, and
[0047](0047-a-drawer-is-a-region-of-the-page-not-a-layer-over-it.md) made the drawer a region
drawn where the consumer wrote it. The question is what is left to build once the shell is
refused.

## The decision

**Three entrypoints, one word each, and no shell.**

- `@pacit/components/topbar` — `header[pctTopbar]`, a row of three slots: `[pctTopbarStart]`,
  the title (`[pctTopbarTitle]` on the consumer's heading) and `[pctTopbarEnd]`.
- `@pacit/components/nav` — `nav[pctNav]` with a `role="list"` inside it, `pct-nav-item` (the
  `listitem`) and `a[pctNavLink]` with an `[pctNavIcon]` slot.
- `@pacit/components/description` — `dl[pctDescriptionList]` and `div[pctDescription]`, a pair
  that writes its own `<dt>` and `<dd>`s around three slots: `[pctDescriptionTerm]`, the value,
  and `[pctDescriptionControl]`.

The count is 0057's: a component token is `--pct-{component}-…` and the component word is an
entrypoint, so one `frame` entrypoint would have made `topbar` and `nav` parts of a component
that does not exist; and the parts are whole alone — a details page has a description list and
no bar, a kiosk has a bar and no navigation.

**The platform's element under each, demanded by the selector.** The bar is the consumer's
`<header>`, so it is the `banner` landmark exactly where the page's outline makes it one and
nothing where it does not — a decision no attribute of ours could take as well. The navigation
is the consumer's `<nav>`, named by the native `aria-label` when the page holds a second one; it
writes no default name, so `PCT_TEXTS` grows no key and no other entrypoint pays a byte for it.
The list is the consumer's `<dl>`, read by every engine and reader as terms and definitions.

**The current screen is `aria-current`, written by whoever knows it.** The breadcrumb's rule of
[0054](0054-a-breadcrumb-is-the-way-here-told-in-links.md), one component over: the router
says it (`routerLinkActive` with `ariaCurrentWhenActive="page"`), or the consumer binds it, and
the link draws the attribute with three channels — a tint, a bar at the start edge and a weight
— because the tint is the first thing the forced-colours mode drops.

**A list inside the landmark, and a wrapper per link.** A reader that enters the navigation is
told how many screens there are; that is the list's whole job. A link standing directly in a
`role="list"` is the arrangement 0054 measured as a critical violation in all three engines,
which is what `pct-nav-item` carries — the breadcrumb's `pct-crumb`, again.

**A pair writes its own `<dt>` and `<dd>`.** The term, the value and the control are slots of a
`div[pctDescription]`, the one wrapper HTML lets a `<dl>` hold, and the component writes the
elements around them in the order the platform reads a pair in. A consumer cannot put a `<dd>`
before its `<dt>`, and the pair's stylesheet reaches the elements it draws
([`lesson-96`](../lessons.md#lesson-96)), where a consumer's own `<dt>` would have needed a
component of its own on every term. The control is named by the term: `termId` is the `<dt>`'s
`id`, exported for the control's `ariaLabelledby`.

**No breakpoint anywhere.** The bar is one row at every width and its title gives way first, to
an ellipsis for the eye with the text whole in the document. A pair stands on one row while the
row holds the term's width and the value's floor — two tokens — and wraps the value under its
term when it does not, by `flex-wrap`, the row deciding by its own width wherever it stands.
The navigation does not move itself: the application reads its own breakpoint and renders the
same `<ng-template>` in a column or in a `pct-drawer`. The sandbox does it in a dozen lines
(`apps/sandbox/src/app/views/frame/`), and the one trap in them is written there and on the
cards — the width is read **after** the first render, because a branch the server never took
is a hydration mismatch.

## What is refused, and why

**A shell with a breakpoint input.** It is the media-query dictionary 0057 refused, moved into
one component, and it would own three things the application owns already: the width at which
its layout changes, what stands where at that width, and the page's landmarks. It would also
have to choose between a navigation rendered twice — two landmarks of one name — and one moved
by DOM surgery, which Angular's projection does not do.

**A navigation that closes the drawer it stands in.** A link press shutting the drawer is one
line of the application's (`drawer.close('api')` beside its own navigation), and a navigation
that knew about drawers would be a navigation that knew where it stands.

**The consumer's `<dt>` and `<dd>` with components on them.** Three selectors for one pair, an
order nothing holds, and a `<dd>` that is sometimes a value and sometimes a control told apart
by an attribute — against one wrapper that writes the right thing.

**A `term` input on the pair.** A term is often more than a string — an abbreviation, an icon
beside the word — and a slot carries both; an input beside it would be a second way to write
the same pair.

**A navigation without a list.** Fewer elements, and no count for a reader; the count is what
the first consumer's screens are navigated by.

## Consequences

- **The application writes its frame's layout.** A grid or a flex row of the side column and
  the content is the application's CSS, as 0057 left a page's skeleton to it. The docs show it.
- **The navigation's markup is long.** A `<nav>`, a `pct-nav-item` per screen and the anchor in
  it: three levels where a shell would take an array. The array is the consumer's `@for`.
- **A pair outside a `<dl>`, and an item outside the list, warn in dev mode.** Both are markup
  the platform does not read as what it looks like, and both are a template's mistake.
- **`aria-current` is the only mark.** A link the consumer forgot to mark looks like every
  other, and nothing can warn: no current screen is a legitimate state of a page outside the
  navigation.
- **What it costs in bytes.** Three rows of the size snapshot, none of them on the CDK and none
  on `PCT_TEXTS` beyond what `./core` already carries.
