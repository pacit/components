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

## Two tones today, and why not five

`tone` is `'neutral' | 'danger'` — a union, so the day a tone is missing it is a compile
error and not a silently grey box.

**The skin is the reason there are two.** `neutral` stands on the surfaces the skin already
has; `danger` is the skin's error colour painting its first background, with `on-danger` as
the text over it — the exact pair `semantic.light.json` removed as unused and promised back
"with the first component painting a background with the error colour", naming the badge as
that component. `success`, `warning` and `info` needed colour ramps the skin did not have
at all, and inventing three ramps at a component's feet would have put the skin's centre of
gravity in the wrong file ([0019](0019-primitives-are-not-the-contract.md)). The union grows
the day the ramps land — the same road `PctIconName` walks, and **that day came**: the ramps
landed with the button's tone axis ([0081](0081-a-tone-on-a-button-is-a-face-and-the-label-is-what-speaks.md)),
so this refusal's condition has fired and the collapse onto `PctTone` is owed.

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
  like every other text pair (`req-token-text-pairs`).
- Forced colours: the border is the box's surviving channel; both tones read `CanvasText`
  on `Canvas` with the ring standing.
- The mutation surface is one warning's guard; everything else is tokens and a template.
