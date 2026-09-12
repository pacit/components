# 0049 — A progress bar is the platform's element under our own paint

**Status:** accepted
**Implements:** [`req-api-platform`](../requirements/api.md#req-api-platform),
[`req-a11y-built-in`](../requirements/a11y.md#req-a11y-built-in),
[`req-a11y-forced-colors`](../requirements/a11y.md#req-a11y-forced-colors),
[`req-a11y-motion`](../requirements/a11y.md#req-a11y-motion),
[`req-token-logical`](../requirements/tokens.md#req-token-logical)
**Evidence:** `libs/components/progress/`, `apps/sandbox-e2e/src/progress.spec.ts` (11 × 3),
the forced-colours and reduced-motion readings in their own specs, 31 unit cases, and the
probe runs quoted below — every number here was measured in Chromium, Firefox and WebKit
before the component was written.

## The question

Every library draws a progress bar as a `div` with `role="progressbar"` and three ARIA
attributes written by hand. HTML has had `<progress>` since 2011. This repository's whole
direction is to borrow the platform where it already answers
([`req-api-platform`](../requirements/api.md#req-api-platform),
[0046](0046-a-disclosure-is-the-platforms-and-so-is-the-group-it-belongs-to.md)) — so the
question is not "which of the two", it is: **what does the element really give, what does
painting it really cost, and where is the line between the two?**

Both halves had to be measured, because both are usually stated from memory.

## What the element gives, measured

A `<progress value="50" max="200">` reaches Chromium's accessibility tree as
`progressbar · valuemin 0 · valuemax 200 · value 50` — the role, both bounds and the number,
none of them written by an author. `<label for>` names it, because `<progress>` is a labelable
element; `aria-label` and `aria-labelledby` name it too, and Playwright's role query finds it
by name in all three engines.

**And the part that decides this record:** an element with no `value` attribute arrives in the
same tree with **no value key at all**. That is what indeterminate IS — not zero, not a
guessed number, an absence. An author writing `aria-valuenow` by hand has to choose a number,
and every number is a claim about progress nobody has measured; the alternative, omitting
`aria-valuenow` on a `role="progressbar"`, is a state the ARIA spec leaves to the reader to
interpret rather than one the author has expressed. So the element says something the
hand-written version cannot, and that alone settles which side carries the semantics
([0039](0039-a-state-the-platform-publishes-is-not-ours-to-write.md),
[`lesson-112`](../lessons.md#lesson-112) — this library has already shipped one ARIA attribute
that no engine read).

## What painting it costs, measured

Styling a `<progress>` at all requires `appearance: none`, and that switch is where the
platform stops answering:

- **It takes the engine's indeterminate animation away and hands nothing back.** With the
  value part painted and no `value` attribute, Chromium and WebKit draw an **empty** groove
  and Firefox draws a **full** one — `::-moz-progress-bar` keeps its width where
  `::-webkit-progress-value` has none. The same two declarations mean "nothing has happened"
  in two engines and "it is finished" in the third ([`lesson-133`](../lessons.md#lesson-133)).
- **A pseudo-element of the element is not a way out.** `progress::before` paints in Chromium
  and WebKit and paints **nothing** in Firefox (measured: the probe's band came back as the
  bare groove colour, `rgb(215,220,229)`), so the smallest possible DOM is a Chromium-and-
  WebKit drawing.
- **Nor is a child.** A `<progress>` renders no children in any engine — its content is
  fallback for browsers that predate it.

## The decision

**The `<progress>` carries the semantics and is the groove; the fill is a sibling drawn over
it.** That is the checkbox's shape one component over: the native control for what a reader
hears, our own element for what an eye sees. The three engine parts (`::-webkit-progress-bar`,
`::-webkit-progress-value`, `::-moz-progress-bar`) are painted transparent, so what shows
through is the element's own background — the groove — and the fill above it.

Two elements, two `data-pct-part` names, and nothing else:

```html
<progress data-pct-part="track" [attr.value] [attr.max] [attr.aria-label]></progress>
<div data-pct-part="fill" [style.inline-size.%]></div>
```

`value` is `number | null`, and `null` — the default — is indeterminate, because that is the
platform's own contract expressed in a signal. Text that does not parse is `null` as well: a
measurement nobody has is exactly the state the element already has a name for.

`max` defaults to **100** and this is the one place the component leaves the platform's own
default of `1`. The reason is which mistake each default produces. With `max="1"` a consumer
who writes `[value]="40"` gets a **full** bar, because the element clamps — a wrong answer
wearing the look of a finished task. With `max="100"` the mirror-image slip (`[value]="0.4"`
for four tenths) draws an almost empty bar, which is visibly wrong and fixed in seconds. The
element never sees the difference: `max` is always written out.

## The indeterminate band, and why it is an element and not a gradient

The obvious way to animate a band along a groove is a moving `linear-gradient` on the track.
**Measured, that is invisible exactly where it matters most:** under `forced-colors: active`
the browser forces author background COLOURS to the user palette and drops background IMAGES
that are not `url()` — a gradient among them. The probe's gradient band came back as an empty
outlined groove; the same band drawn as an ELEMENT with `background: Highlight` inside the
forced-colours block came back painted, in all three engines
([`lesson-134`](../lessons.md#lesson-134)).

So the band is the same `fill` element, given a width from a token and moved along the groove.
It moves by **`inset-inline-start` and not by `translateX`**, which is the rule the switch's
thumb and the drawer's slide already wrote down: `translateX` names an axis the writing
direction may have mirrored, and the logical property already knows which edge the bar starts
from ([`req-token-logical`](../requirements/tokens.md#req-token-logical)). Measured in three
engines and in both directions: the band travels start-to-end under `ltr` and end-to-start
under `rtl`, with no rule of its own to reverse it.

Its duration is `--pct-motion-loop-duration`, the **continuous** half of the motion axis — the
one a reduced-motion setting slows to 1500 ms rather than stopping, because a band that stood
still would stop saying anything is under way. The determinate fill's transition is the other
half and disappears under the same setting. Neither is a media query in this stylesheet
([`req-a11y-motion`](../requirements/a11y.md#req-a11y-motion)).

## What is refused, and why

**A name of our own.** The component supplies no default accessible name and warns in dev mode
when it has none. A progress bar's name is _what_ is progressing, and only the application
knows that; "Progress" would satisfy axe's `aria-progressbar-name` and tell a screen-reader
user nothing — a gate passing on our own echo, which is the shape
[`req-axis`](../00-axis.md) exists against. The pagination's landmark default is not a
precedent against this: "Pagination" names the thing itself, and a pager without one is
unreachable in a landmark list.

**A live region.** A determinate bar that announced every percent would be noise, and the
`progressbar` role is one assistive technology polls rather than one that speaks. An
application that needs "upload complete" said out loud has a sentence to announce, and that
sentence is not the bar ([0026](0026-one-channel-per-politeness.md)).

**A circular variant.** A ring is a different drawing with its own token set, and this library
already has one inside `pct-button` for a button that is working. If a standalone one is
wanted it is a tag of its own, not a `variant` input here
([0034](0034-multiplicity-is-a-tag.md)).

**A buffer, a second value, tones, a label slot and a percentage read-out.** The platform's
element has one value, and the sentence beside the bar is the consumer's — the same boundary
the pagination drew when it refused "showing 1–20 of 400".

**`forced-color-adjust: none`.** It would keep the library's own colours in a mode a user
turned on precisely to be rid of them. Measured to work; refused for what it is.

## Consequences

**Nothing is added to `PCT_TEXTS`.** This is the first component in five to cost the other
entrypoints nothing: the toast added 200 B to every entrypoint in the package, the drawer 20 B
and the pagination 91 B, and `./progress` adds **0**, because it draws no text at all.

**`check-aria` reads one thing more.** A `<progress>` is not focusable in any engine and
carries no `role` attribute, so the gate's two ways of finding a widget — focusability and a
composite role — both missed it: the component declaring `ariaLabel` and `ariaLabelledby`
would have passed green with the inputs deleted. The gate now has a third list, the tags whose
IMPLICIT role is announced with a name (`progress`, `meter`), and
`check-aria.fixtures/progress-without-inputs` is its control. That is the third component in a
row to widen this gate — the tabs added composite roles, the accordion added `<summary>` — and
the widening is found by building rather than by reading
([`lesson-196`](../lessons.md#lesson-196)).

**The bar is not a control, and the card's keyboard map is empty because of it.** A
`<progress>` takes focus in no engine (measured), nothing is pressed and nothing is dragged;
the touch-target floor and the shared control-height axis do not apply, which is why the size
axis here is a thickness of its own.
