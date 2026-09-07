# 0071 — A link in button's clothes is a link

**Status:** accepted
**Implements:** [`req-api-platform`](../requirements/api.md#req-api-platform),
[`req-a11y-built-in`](../requirements/a11y.md#req-a11y-built-in),
[`req-api-attributes`](../requirements/api.md#req-api-attributes),
[`req-a11y-forced-colors`](../requirements/a11y.md#req-a11y-forced-colors),
[`req-a11y-wcag`](../requirements/a11y.md#req-a11y-wcag)
**Evidence:** `libs/components/button/src/button.ts` and `button.scss`,
`apps/sandbox-e2e/src/button.spec.ts` and `forced-colors.spec.ts` — the role, the paint, the
ring and the two refusals read back in three engines; `libs/components/breadcrumb/src/link.scss`
(the anchor already measured in this repository), [`lesson-166`](../lessons.md#lesson-166)

## The question

`PctButton` dressed `button[pctButton]` and nothing else, so a control that navigates had no
answer here. The site is the consumer that noticed: its own hero CTAs are
`<button routerLink>` — they navigate, and they are not links. No middle click, no
open-in-new-tab, no status bar showing where the press goes, and nothing in the markup a
crawler reads as a way through the site. The plan carried it as 4.33 and the trigger was
supposed to be the premiere's link audit; the site's design pass arrived first, and a pass
that rewrites the CTAs twice is a pass that pays for this twice.

## One component, two tags

The selector becomes `button[pctButton], a[pctButton]`. This is not a new shape here:
`input[pctText], textarea[pctText]` is one component over two tags already, for the same
reason — the paint, the sizes, the states and the tokens are one thing, and the element is
the consumer's business.

The alternative was a second component (`PctLinkButton`, `a[pctButton]` of its own), and
[0058](0058-the-hero-face-is-paint-and-a-gradient-is-three-contrast-checks.md) already
refused it in the other direction: a second class forks the disabled machinery, the loading
spinner, the size axis and the focus ring for the sake of an element name. Five faces did not
justify a fork and neither does a tag.

**The role is not touched.** No `role="button"` on the anchor. A link navigates; a button
acts; a reader told "button" is told the wrong thing about what `Enter` does and about
whether a middle click will open a tab. The face is paint, and paint does not get to rename
what the element is — which is the same sentence
[`req-api-platform`](../requirements/api.md#req-api-platform) has been making since the
first component.

## The disabled state, where the platform has none

A `<button disabled>` is refused by the browser: the click never fires, the element leaves
the tab order, the accessibility tree says so, and the stylesheet has an attribute to key on.
An `<a>` has none of that — there is no disabled link in HTML — so `disabled` on the anchor
is a promise this component has to keep by hand. It keeps it in three parts:

- **`data-pct-disabled`** — written on both elements, and the only thing the stylesheet reads.
  The face used to key on `[disabled]`, which is exactly the attribute an anchor can never
  have; one hook keyed on the state means the sheet does not have to know which tag it is
  painting ([`req-api-attributes`](../requirements/api.md#req-api-attributes)).
- **the platform's own `disabled`** — still written, on the `<button>` alone, because
  everything above is free there and nothing here should replace it.
- **`aria-disabled` and a refusal** — on the `<a>` alone: the state said in the one channel a
  link has, and `preventDefault()` so the navigation does not happen anyway.

**The disabled link keeps its place in the tab order.** `tabindex="-1"` would hide it from
the reader who most needs to be told why the control does nothing; `aria-disabled` is a state,
not a removal, and the case that reads it walks onto the link with a real `Tab`.

**And the refusal has to arrive before the consumer's own handler, which is measured rather
than assumed.** A `(click)` in `host` does not: for a press landing on the element itself both
listeners run in registration order and the template's is registered first, so
`stopImmediatePropagation()` comes too late and `(click)="buy()"` on a disabled link runs.
The listener is therefore attached when the directive is instantiated and in the **capture**
phase — early enough for a press on the element, and one phase ahead for a press on the
projected label ([`lesson-166`](../lessons.md#lesson-166)).

## The underline goes, and the policy it leaves behind does not

A `<a>` arrives underlined. The underline is dropped here and kept one component over, and
the difference is not taste: the breadcrumb's link is a word in a trail whose only other
channel is colour, so it underlines on hover
(`libs/components/breadcrumb/src/link.scss`). A button face already answers a pointer with a
background — and the hero face with a lift — so the change is never colour alone even with
the underline gone. What the face may not do is remove the link from the reader: the role
stays, the name stays, and the `href` is what a crawler follows.

## Forced colours read it as a link, because it is one

The forced-colours block was written for a `<button>`, and its premise is stated in its own
comment: the browser forces `ButtonFace`/`ButtonBorder` and the stylesheet only restores what
would otherwise be lost. On an `<a>` the mode forces `LinkText` on `Canvas` instead, whatever
the sheet said — the breadcrumb measured that already — so the edge the boundary-less faces
get back is `LinkText` on a link and `ButtonText` on a button. A control whose text is one
system colour and whose border is another is a control disagreeing with itself, and the case
reads both back computed.

The disabled link keeps `GrayText` there: a system colour is the one thing an author rule may
still say in that mode, and it is the same rule the button uses.

## An `<a>` with no `href` is not a link, and only a warning can say so

`<a pctButton>Get started</a>` compiles, paints, passes every gate in this repository and is
unreachable by keyboard: no role, no tab stop, no `Enter`. Nothing in CSS or in the type
system can see it, so it is a dev-mode sentence, said once after the first render — after,
because `routerLink` writes the attribute during that render and must not be accused of
something it did not do. The idiom is the badge's and the breadcrumb's.

## What it costs

- **A surface a consumer may already target.** The paint moved from `[disabled]` to
  `[data-pct-disabled]`, so a consumer's own `button[pctButton][disabled] { … }` still matches
  the element (the attribute is still written there) but a rule of ours no longer depends on
  it. The library's own hook is the state attribute now, and that is what the card says.
- **Mutants.** 0058 could boast that five faces added zero of them — a union and a stylesheet
  have nothing to break. This step adds a branch that reads the tag and a handler that refuses
  a press, and the snapshot's `button.ts` row moves with them. Every branch is answered by a
  unit case in both directions.
- **One more element in the sweeps.** The sandbox's `Links` card joins the axe audit, the
  hydration pass and the forced-colours run for free, and the e2e suite grows four cases in
  three engines.
- **The gate's own negative control.** `check-harness` kept a fixture whose whole content was
  "the harness also answers to `a[pctButton]`, which the component does not". It does now, so
  the fixture stopped failing and had to be re-pointed at `span[pctButton]` — a rejected input
  that stops being rejected is the one way a gate lies quietly.

## What was rejected

- **`role="button"` on the anchor.** It would make the face honest and the element a lie.
- **A second component.** 0058's argument, unchanged: a fork of the machinery for an element
  name.
- **`pointer-events: none` on a disabled link.** It stops the pointer and not `Enter`, and it
  takes the `not-allowed` cursor with it — the one affordance saying the control is refused.
- **Dropping the disabled link out of the tab order.** Cheaper to write, worse to use: the
  reader who lands on it is the one who needed the state.
- **Letting `disabled` mean nothing on a link** and documenting it. The input exists on the
  component, a consumer will bind it, and an input that silently does nothing on half its
  elements is the shape of defect this repository writes gates about.
