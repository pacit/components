# 0109 — A card is one link by its title, and its controls stand over it

**Status:** accepted
**Implements:** [`req-a11y-built-in`](../requirements/a11y.md#req-a11y-built-in),
[`req-api-platform`](../requirements/api.md#req-api-platform)
**Evidence:** `tmp/card-probe/probes.spec.mts` on 2026-11-02 in Playwright's three engines
(chromium 153, firefox 155, webkit 26.6), 117 cases; the sandbox demo `demo-link` walked by
`apps/sandbox-e2e/src/card.spec.ts`

## Context

The first consumer lays its panel and its house out as a grid of cards, and asked for one
variant above the rest: the whole card leads to the details, and the controls inside it — a
menu, a switch — still work on their own. Plan item 1.9 held the variant back until it was
measured in three engines, because the three ways it is built each break something different,
and which thing is the decision.

An `<a>` round the whole card is not one of them: a link may hold no interactive content, so
the switch inside it is invalid HTML, and a reader reads the whole card as the link's name.
That leaves three, all with the link in the title, named by the title alone:

- **A** — the link's `::after` stretched over the card, and the controls raised over it;
- **B** — a click on the card forwarded to the link by a script, unless it hit a control or
  ended a selection;
- **C** — A, with the body raised over the link too, so its text is selectable.

## The measurement

Thirteen probes per variant, the same in the three engines except where the row says:

| probe                                | A                                                           | B                    | C                |
| ------------------------------------ | ----------------------------------------------------------- | -------------------- | ---------------- |
| a click on the body follows the link | yes                                                         | yes                  | **no**           |
| a click on the footer follows it     | yes                                                         | yes                  | yes              |
| the menu button and the switch       | answer alone                                                | answer alone         | answer alone     |
| a drag over the body text            | selects nothing, stays                                      | selects              | selects          |
| a double click on a word             | **follows the link**                                        | **follows the link** | selects the word |
| Ctrl with a click                    | a new page                                                  | **the same page**    | a new page       |
| a middle click                       | a new page                                                  | **nothing**          | a new page       |
| a right click on the body            | the link's menu                                             | the page's menu      | the link's menu  |
| the tab order                        | link, menu, switch                                          | the same             | the same         |
| the accessibility tree, axe          | one link named by the title, no violation of the card's own | the same             | the same         |

B is a link only for the left button: the engines open a synthetic click in the same page
whatever the modifiers, and a middle click fires no `click` at all. A program can forward
`auxclick` and read the modifiers, but it would be reimplementing a link, and the context
menu's "Open in a new tab" stays out of reach.

## Decision

**The link is the consumer's anchor in the title, and its box is stretched over the card (A).**
`a[pctCardLink]` is a component on the consumer's own `<a>`, with its `href` or `routerLink`:
its `::after` covers the card, which is its containing block, so a press anywhere is a press on
the anchor and every gesture of a link works. The focus ring is drawn on the same pseudo-element,
around the card, the box a press opens. The probes read a ring drawn on the card itself; the
ring on the pseudo-element is read by `apps/sandbox-e2e/src/card.spec.ts` and, in forced
colours, by `forced-colors.spec.ts`.

**The controls stand over it.** The header's actions and the footer's actions are regions of
the card's own, raised over the link whenever the card holds one. A control written in the body
takes `pctCardControl`, a directive on the consumer's element that raises it the same way —
a directive and not a component, because a control is as often a component of its own, and an
element holds one. So
does any part of the body whose text the user must be able to select, which is then no longer
part of the link.

**Not C.** A card leads to its details because its body is the summary of them: a value, a
reading, a state. A body that does not answer a press is a card that is a link only around its
edges.

## Consequences

- The body's text cannot be selected by a drag or a double click, which follows the link.
  `pctCardControl` on a passage takes it out of the link where that matters.
- A control in the body without `pctCardControl` sits under the link and cannot be pressed;
  nothing can warn about it, because a control is anything the consumer writes.
- The card is the containing block of the link (`position: relative`), so a consumer's
  absolutely positioned child of the card is placed against the card.
- WebKit reports the anchor's computed `cursor` as `auto` while it shows the hand; the hand is
  the link's, not a declaration of the card's.
