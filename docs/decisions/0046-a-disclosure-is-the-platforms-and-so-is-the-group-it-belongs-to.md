# 0046 — A disclosure is the platform's, and so is the group it belongs to

**Status:** accepted
**Implements:** [`req-api-platform`](../requirements/api.md#req-api-platform),
[`req-a11y-built-in`](../requirements/a11y.md#req-a11y-built-in),
[`req-a11y-wcag`](../requirements/a11y.md#req-a11y-wcag),
[`req-quality-browsers`](../requirements/quality.md#req-quality-browsers)
**Evidence:** three probes over three engines, taken before a line of the component was
written. `<details name>` groups: opening one section closes its sibling in chromium, firefox
**and** webkit, through the property and through a click alike, and `toggle` fires on both
elements — `["a:true", "b:true", "a:false"]`, in that order, in all three.
`::details-content` computes `content-visibility: hidden` on a closed section and `visible`
on an open one in all three, and a node inside a closed one answers
`checkVisibility() === false` — the same state
[0045](0045-a-panel-nobody-chose-is-still-text-in-the-document.md) had to ask for by name.
`preventDefault()` on the summary's `click` stops the toggle for the pointer **and** for
`Enter` in all three. A `<h3>` inside a `<summary>` survives as a heading: chromium's own
accessibility tree, read through CDP, holds `DisclosureTriangle "Heading inside"
expanded=true` **and** `heading "Heading inside" level=3` as separate nodes. And
`interpolate-size: allow-keywords` is chromium's alone — `false` in firefox and webkit, which
is the one measurement that decided something by refusing it

## Context

The ARIA APG's [Accordion](https://www.w3.org/WAI/ARIA/apg/patterns/accordion/) pattern is
written for a widget that has to be built: a heading, a `<button aria-expanded>` inside it,
`aria-controls` pointing at a panel, and a key handler. Every accordion in every library is
that pattern, and each one of them re-implements a disclosure.

The platform has had one since HTML 5.1, and in the two years before this component was
written it acquired the two things it used to be missing:

- **`<details name>`** — sections that share a name form a group, and the browser closes the
  others. That is the whole of "one at a time", and until Firefox 130 (September 2024) it
  existed in two engines of three,
- **`::details-content`** — the pseudo-element that holds a section's content, which is what
  made the closed state something a stylesheet can see rather than something only the engine
  knows.

So the question is not "how do we implement the accordion pattern" but "what is left of it
once the element is used". The answer turned out to be three things, and the first was a
surprise.

## Decision

**A section is a `<details>` with a `<summary>`, and this library adds only what the element
has no answer to.**

What comes from the platform, measured rather than assumed:

| what                                       | where it comes from                                           |
| ------------------------------------------ | ------------------------------------------------------------- |
| the press, by pointer, `Enter` and `Space` | `<summary>`'s activation behaviour                            |
| the `expanded` state a reader announces    | the element, in the accessibility tree — no attribute of ours |
| the place in the page's tab order          | `<summary>` is focusable with no `tabindex` written           |
| a closed section still being searchable    | `::details-content` → `content-visibility: hidden`            |
| one section at a time                      | `<details name>` — one attribute, no code                     |

What is left, and each of the three is here because the element really has nothing for it:

1. **The heading.** The APG asks for one so a screen-reader user can jump between sections
   with `H`, and a `<summary>` is not a heading. It was not obvious that one could be put
   inside: a `<button>`'s children are presentational and a heading in one is dropped. A
   `<summary>` is not a button — chromium calls it a `DisclosureTriangle` — and the heading
   survives, in all three engines. So the title is a real `<h2>`…`<h6>` written into the
   summary, at a level the consumer gives, and never a `role="heading"` with an `aria-level`:
   the reading that was taken in a browser is the reading that ships
   ([`lesson-125`](../lessons.md#lesson-125)).
2. **A way to refuse.** There is no disabled disclosure. `preventDefault()` on the summary's
   `click` is the whole of it, and it covers the keyboard because `Enter` on a `<summary>`
   arrives as a click ([`lesson-128`](../lessons.md#lesson-128)). The section keeps its
   heading, its place in the tab order and its `expanded` state, with `aria-disabled` beside
   them — a section nobody may open still names what is inside it.
3. **A signal.** `open` is a `model`, written from the `toggle` event and never from a
   guess. Both directions arrive there, and the second is what makes the exclusive group free:
   when the browser closes a section because a sibling opened, it fires `toggle` on the one it
   closed, so a group stays in step with no bookkeeping at all.

**And the group is the platform's too.** `exclusive` generates one `name` and puts it on every
section; there is no listener over the siblings, no "close the others" method and nothing to go
wrong when a consumer adds a section at runtime. The `name` is generated rather than taken as
an input because it is not a name anybody reads — two accordions on one page that both chose
`"main"` would become one group the consumer never meant to make.

**What was refused, and it is the interesting half: the open/close animation.** Growing a
panel from nothing to `auto` needs `interpolate-size: allow-keywords`, which chromium has and
the other two do not. A height animated in one engine of three is not a fallback that produces
the platform's own answer — it is a different component in different browsers, which is exactly
what [0041](0041-a-height-the-platform-computes.md) allows only when the two roads AGREE. So
nothing animates but the marker, which turns a half circle everywhere.

## Consequences

- **The keyboard map is a page of the HTML spec.** The APG's optional arrow keys between
  headings are not implemented: every heading is already a stop in the page's tab order, which
  is the pattern's own required behaviour, and a document-level key map would be this library
  taking `ArrowDown` away from the page.
- **No `role="region"` on the panels.** The APG offers it and warns about it in the same
  paragraph — a landmark per section is six landmarks in a six-section accordion. The platform
  already publishes each section as a `group`, so the offer is declined and the warning is
  taken.
- **`check-aria` reads one tag more.** Its proxy for "a widget a consumer names" was a list of
  focusable tags, and `summary` was not in it: a component whose only widget is a `<summary>`
  counted zero widgets, was asked for no name inputs and passed green with a heading nobody
  could name. The list is longer by one word now, and `summary-without-inputs` is that rule's
  control.
- **A section's content is always rendered**, open or not — the price of it being text in the
  document rather than a branch, and the same one the tabs pay.
- **The exclusive group is one attribute and therefore one measurement.** If `<details name>`
  stops working in an engine, `exclusive` is a lie in that engine and there is no code here to
  patch. That is what `apps/sandbox-e2e/src/accordion.spec.ts` is for, and why the case runs in
  three engines rather than one.
