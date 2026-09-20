# 0053 — A badge is a word wearing a tone, and the tone never speaks alone

**Status:** accepted
**Implements:** [`req-a11y-built-in`](../requirements/a11y.md#req-a11y-built-in),
[`req-a11y-forced-colors`](../requirements/a11y.md#req-a11y-forced-colors),
[`req-token-text-pairs`](../requirements/tokens.md#req-token-text-pairs)
**Evidence:** `libs/components/badge/`, the unit suite in
`libs/components/badge/src/badge.spec.ts`, `/badge` in the sandbox audits, the
forced-colours reading in `apps/sandbox-e2e/src/forced-colors.spec.ts`

## The question

Two different things wear the name "badge", and they share nothing but a small box:

- **a status label** — a word in a toned box: `Draft`, `Active`, `Overdue`. The text is the
  content; the tone repeats it for the eye that scans;
- **a count overlay** — the `3` on the corner of a bell. A different component with
  different questions: anchoring to somebody else's element, what a reader hears when the
  number changes, what `99+` truncates.

This decision builds the first and refuses the second. The overlay's questions (anchor
positioning, a live region for a changing count) have nothing in common with a word in a
box, and a component that answered both would answer neither well.

## It is text, and only text

A badge is a word already standing in the document's sentence — a table cell, a heading's
suffix — so it has **no role, no ARIA, and no text of its own**: the content is projected,
a reader reads it as the plain text it is, and the component adds nothing audible. There is
nothing here for `PCT_TEXTS` either; the fourth component in the library whose byte cost to
everyone else is zero.

**The tone never speaks alone.** `data-pct-tone` swaps the box's colours; it does not add a
glyph, and the component cannot verify the word beside the colour. What it can do is refuse
the shapes that make colour the only channel: there is no empty badge (a toned box with no
text is a colour swatch pretending to be information), and forced colours drop every tone
to one palette with the **border** carrying the box — so a page that said something only by
tone was already saying nothing to those users, with nothing this component can add.

## Two tones, then four — and never a list of its own

`tone` is `PctTone | null`: the library's four names
([0076](0076-a-tone-is-two-channels-and-four-names.md)) and the absence of one. It did not
start there. For the first release it was `PctBadgeTone`, `'neutral' | 'danger'` — a union
of the component's own — and the reason was the skin, not the design.

**The skin is why there were two.** `neutral` stood on the surfaces the skin already had;
`danger` is the skin's error colour painting its first background, with `on-danger` as the
text over it — the exact pair `semantic.light.json` removed as unused and promised back for
the first component that would paint a background with the error colour, naming the badge as
that component. `success`, `warning` and `info` needed colour ramps the skin did not have at
all, and inventing three ramps at a component's feet would have put the skin's centre of
gravity in the wrong file ([0019](0019-primitives-are-not-the-contract.md)).

So the union named the missing ramps as its condition for growing — the same road
`PctIconName` walks — and **the condition fired**: the ramps landed with the button's tone
axis ([0082](0082-a-tone-on-a-button-is-a-face-and-the-label-is-what-speaks.md)). The list
was then spent rather than widened. Widening it would have left the library with two
vocabularies for one idea, which is the state 0076 exists to end; deleting it is a breaking
change every consumer sees at compile time, which is the honest version of the same news.

**`neutral` did not survive the collapse, and not one pixel moved with it.** The quiet box is
what a badge with no `tone` wears: no `data-pct-tone` on the host at all, the base tokens
`:host` already sets, the same colours it always had. The absence is the neutral — a union
member meaning "none of the above" makes every consumer write it.

## What is refused, and why

- **the count overlay** — refused above; a component of its own on the day it is asked for.
- **a `size` input** — a badge is not a control and stands on no control axis; it is sized
  by its own type token, and a badge that wants to be as tall as a button is a button
  wanting to be quiet.
- **an icon slot of the component's own** — the content is projected; a consumer who wants
  a glyph beside the word projects one, and the gap is a token.
- **an empty badge** — a dev-mode warning names it: a toned box with no text is colour as
  the only channel, which is the one thing this component exists to refuse.
- **`success` / `warning` / `info` today** — refused above, with the skin as the reason and
  the union as the door.

## Consequences

- `pct-badge` is one host: projected content, `data-pct-tone`, no parts (the host is the
  box), tokens for the pill's geometry and one bg/fg/border triple per tone.
- The skin gains `on-danger` — the promised pair returns, measured by the contrast build
  like every other text pair (`req-token-text-pairs`). `on-success`, `on-warning` and
  `on-info` followed with 0082, and the badge's fourteen rows in `contrast.policy.json` are
  the reading for all four.
- Forced colours: the border is the box's surviving channel; every tone reads `CanvasText`
  on `Canvas`, and the box stays a box.
- The mutation surface is one warning's guard; everything else is tokens and a template.
