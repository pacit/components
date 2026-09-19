# 0076 — A tone is two channels and four names, settled once

**Status:** accepted
**Implements:** [`req-a11y-forced-colors`](../requirements/a11y.md#req-a11y-forced-colors),
[`req-api-message`](../requirements/api.md#req-api-message)
**Evidence:** `libs/components/core/src/tone.ts` and the cases that hold it —
`toast.spec.ts` › "draws a tone as a mark and a state attribute, or as nothing at all", the
progress bar's own pair, and the forced-colours readings in `apps/sandbox-e2e`

## Context

Two components asked for tones within a week of each other and both refused to answer alone.
The toast wanted to say that a message is a failure; the progress bar wanted to say that a run
ended badly. A set of tones is a **shared property**, and a shared property settled by whoever
needed it first is an accident of that one case — which is why
[0044](0044-a-toast-is-a-change-in-a-region-that-was-already-there.md) recorded "no tone" with
the reason attached: the repair is an icon set, and the icon set is a decision of its own.

This is that decision.

## Decision

**A tone is a pair of channels, never one: the colour a skin gives it, and a drawing the
library ships under the matching name in `PctIconName`.**

That is not decoration doubled up. A state painted in colour alone is a state carried by colour
alone — gone for a reader who cannot separate red from green, and gone again in forced-colours
mode, where the palette is the user's and an author's greens are not invited
([`req-a11y-forced-colors`](../requirements/a11y.md#req-a11y-forced-colors)).

**Four names, decided once, for every component that will ever want them:** `success`,
`warning`, `danger`, `info` — landing in `PctIconName` together
([0011](0011-icons.md)). The field's error, the dialog's confirm and whatever the banner turns
out to be inherit this list rather than starting another.

**There is no `neutral` member.** A component with no tone takes no `tone` at all, and the
absence is the neutral. A union with a member meaning "none of the above" would make every
consumer write it.

The mechanism, and what each channel costs at the element, is in the header of
`libs/components/core/src/tone.ts` — the type's own home, where a reader of the API lands.

## Consequences

- **[0044](0044-a-toast-is-a-change-in-a-region-that-was-already-there.md)'s "no tone" clause
  is spent.** It was a refusal with a named condition, the condition is met, and the toast
  carries tones today. The clause stays in that record as history, with a line saying so —
  a refusal whose condition has fired is not deleted, it is closed.
- **A component adopting a tone adopts both channels** — but the second channel is not always
  a drawing. Where the tone lands on a thing that might carry no words — a toast, a progress
  bar — it is the icon this decision names, and taking the colour without it is the failure
  the decision exists to prevent. Where the component IS text and cannot exist without it, the
  words are the second channel and an icon would only repeat them: the badge
  ([0053](0053-a-badge-is-a-word-wearing-a-tone.md)) and the button
  ([0082](0082-a-tone-on-a-button-is-a-face-and-the-label-is-what-speaks.md)) take tones and
  draw no mark, and both refuse the empty case in dev mode instead. Either way it is the one
  shape review has to watch, because nothing measures a missing second channel yet.
- **The union is closed and widening it is a breaking change** for anyone matching on it
  exhaustively. Four was chosen to be the set that does not need a fifth, and the one list
  standing outside it is gone: `PctBadgeTone` named the skin's missing ramps as its condition
  for growing, the ramps landed with
  [0082](0082-a-tone-on-a-button-is-a-face-and-the-label-is-what-speaks.md), and the badge
  now reads this one rather than a second one of its own.

## What this costs us

- **Two channels are two things to get right**, and the second one is easy to forget: a skin
  can paint a tone without the component drawing it, and the page still looks correct to
  whoever ships it.
- **Four names is a guess about the future.** The set was settled before the banner exists, so
  the banner inherits a vocabulary rather than choosing one — which is the point, and also the
  risk.
- **A shared union couples the components that use it.** The toast and the progress bar now
  move together on this axis whether or not that suits either of them.

## Alternatives considered

- **Per-component tone unions.** What both components asked for first. Rejected: two lists that
  mean the same thing drift, and the skin would have to carry both.
- **Colour only, and let the consumer add the icon.** Rejected by
  [`req-a11y-forced-colors`](../requirements/a11y.md#req-a11y-forced-colors) — the library
  cannot promise a state survives forced colours and then leave the surviving half to the
  consumer.
- **A `neutral` member for symmetry.** Rejected: it makes the common case verbose and turns an
  absence into a value two places have to agree about.
