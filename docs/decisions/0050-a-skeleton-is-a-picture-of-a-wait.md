# 0050 — A skeleton is a picture of a wait, and the wait belongs to the region

**Status:** accepted — the section "Two shapes, and a disc is neither of them" superseded by 0067
**Implements:** [`req-a11y-built-in`](../requirements/a11y.md#req-a11y-built-in),
[`req-api-platform`](../requirements/api.md#req-api-platform),
[`req-a11y-forced-colors`](../requirements/a11y.md#req-a11y-forced-colors),
[`req-a11y-motion`](../requirements/a11y.md#req-a11y-motion),
[`req-token-logical`](../requirements/tokens.md#req-token-logical)
**Evidence:** `libs/components/skeleton/`, `apps/sandbox-e2e/src/skeleton.spec.ts` (11 × 3),
the forced-colours, reduced-motion and RTL readings in their own specs, 20 unit cases; the unit
probes quoted below — `1lh`, `1cap` and the focusability of a clipping box — were measured in
Chromium, Firefox and WebKit before anything was written
([`lesson-136`](../lessons.md#lesson-136), [`lesson-137`](../lessons.md#lesson-137))

## The question

A skeleton is the easiest component in any library to write and the easiest to get wrong,
because the two things it is for are not the thing it looks like. It looks like grey bars. What
it is for is **holding a space** and **saying that something is on its way** — and a library
that draws the bars without answering either has shipped decoration with an accessibility
regression inside it.

So there are three questions, and only the first one looks like the feature:

1. **What does it announce?** Nothing in this component has text, and the content it stands for
   does not exist yet.
2. **How big is it?** Every library answers with numbers somebody chose.
3. **What does it look like when the colours are not ours** — a forced-colours mode — **and
   when the user has asked for less motion?**

## It announces nothing, and that is the whole first answer

The component is `aria-hidden="true"` on its host. It is the second in the library to be, after
`pct-icon`, and the reason is stronger here: an icon is hidden because the control beside it
already says what it means, while a skeleton is hidden because **there is nothing to say**. A
placeholder announced as anything at all — "loading", a `progressbar`, three empty list items —
is a reader describing a picture of text nobody has written.

**What has to be announced is the wait, and the wait is a fact about the REGION.** ARIA already
has the word for it: `aria-busy="true"` on the container whose content has not arrived, which
is the same attribute `pct-select` writes on a listbox whose rows are still coming
([0037](0037-loading-is-a-fact-about-the-list.md)). That is the second appearance of the
attribute in this library and the first where it belongs to somebody else: the region is the
element the content will land in, and that element is the consumer's own — a `<section>`, a
card, a table body. A busy state written on the skeleton would be a fact about the placeholder,
and the placeholder is hidden, so it would be a fact told to nobody.

The component cannot write it and does not pretend to. It **reports** instead, in dev mode,
when nothing above it is marked busy — `closest('[aria-busy="true"]')`, the platform's own walk
rather than a guess about which ancestor the region is. It is the same shape as the progress
bar's unnamed-bar warning and the drawer's unnamed-panel one: the defect lives in a consumer's
application, where no gate of this repository can see it, so the component says so where the
consumer will read it.

**And a hidden subtree may hold nothing to land on.** That is axe's `aria-hidden-focus`, and it
is the reason this component has no `<ng-content>`: a slot is where a consumer puts a button,
and a button inside a hidden subtree is a control the keyboard reaches and a screen reader
cannot describe. The clipping the sheen needs is safe — `overflow: hidden` takes focus in no
engine, where `overflow: auto` takes it in two of three
([`lesson-137`](../lessons.md#lesson-137), [`lesson-126`](../lessons.md#lesson-126)) — and
`check-aria` point 8 now refuses the general case, before there is a page for an audit to
report it on.

## Its size is the type it stands in, measured

The second question is where the platform answers and nobody asks it. A skeleton needs two
numbers: how tall a line is, and how tall the bar inside that line is. CSS has computed both
since 2023, and the units are `lh` — the element's own line box — and `cap`, the height of a
capital letter in its own font.

Measured on a bare page in three engines, `font-size: 32px; line-height: 1.5`:

| unit   | chromium | firefox | webkit |
| ------ | -------- | ------- | ------ |
| `1lh`  | 48       | 48      | 48     |
| `1cap` | 22.84    | 22.85   | 22.84  |
| `1em`  | 32       | 32      | 32     |

And the reading that decides the record: a `<p>` of three lines in that same type is **144 px**
— exactly three line boxes — so a skeleton whose rows are line boxes occupies exactly what the
text will occupy. On the sandbox's own card the region measures **57 px with the placeholder
and 57 px with the answer**, in all three engines, and the page does not move when the content
lands.

**So this component has no size axis and no `size` input.** The progress bar kept a thickness
of its own because a bar is not text; a skeleton IS text, or a box standing where a picture
will be, and a `--pct-skeleton-line-height` in pixels would be right at the one font size
somebody chose it for and wrong in a heading, in a caption and in every application that sets
its own type ([`lesson-136`](../lessons.md#lesson-136)). There is no gap token either, and that
is the sharper half: what stands between two bars is the LEADING the line box already has.

`lines` is therefore a count of line boxes and not of pixels — the one number only the consumer
knows — and everything else follows from the browser's arithmetic.

## Two shapes, and a disc is neither of them

`text` is lines of a paragraph. `block` is one box standing where something that is not type
will be: a picture, a map, a chart. Its size is the consumer's, because only they know what is
coming; `min-block-size: 1lh` is a floor rather than a value, so a box they size wins outright
and no specificity fight is possible — the floor is a different property from the height they
write.

There is no `circle`, and its absence is the styling contract working as intended: a disc is a
`block` with `--pct-skeleton-track-radius: 50%`, which is a token a consumer sets on the
element they already own ([0013](0013-no-headless-split.md)). A third shape would have been a
third drawing this component has to know about, in exchange for a line of CSS the consumer can
write.

`lines` does not reach a `block`: it counts lines of TEXT, and a box has none. That is the one
input in the component that means nothing in one of the two shapes, and it is written down as a
limitation rather than hidden — the alternative, a box `lines` line boxes tall, would need the
count in the stylesheet, and a component may not invent a `--pct-…` custom property that is not
a token of the skin (`check-tokens` point 8).

## The sheen: the progress band, one component over

A skeleton that only sat there would be a grey box nobody can tell from a finished layout, so
something moves. What moves is decided by two measurements already in the register, and by one
requirement:

- a **gradient** shimmer — the usual implementation — is dropped outright under
  `forced-colors: active`, because the mode forces `background-image` to `none` for every value
  that is not a `url()` ([`lesson-134`](../lessons.md#lesson-134));
- an **opacity** pulse is refused by [`req-token-no-opacity`](../requirements/tokens.md#req-token-no-opacity):
  a compositing `opacity` moves the real contrast outside the contrast gate's result;
- so the sheen is an **element with a background colour** travelling by `inset-inline-start`,
  clipped by the bar it crosses. That is exactly the progress bar's indeterminate band at its
  second component — which is what turns 0049's answer from one component's accident into a
  rule of the library.

The two parts carry the progress bar's own names for the same reason: a `track` is the
placeholder and a `fill` is the thing travelling across it, so a skin styles both components
with one selector. A skeleton **is** an indeterminate progress bar wearing the shape of the
content, and one vocabulary for both says so.

Under `forced-colors: active` the box keeps its extent through an `outline: 1px solid GrayText`
over `background: Canvas`, and the sheen is `GrayText`. Not `Highlight`, which the progress
band uses: `Highlight` is the colour of a selection, and a page waiting for four cards would be
a wall of highlighted blocks. `GrayText` is the palette's own word for "not live", which is
what a placeholder is. Under `prefers-reduced-motion` the sheen slows to the loop token's 1500
ms and does not stop — the reduction takes the vestibular trigger away, not the meaning
([0008](0008-motion-axis.md)).

## What is refused, and why

**A `loading` input, and a content slot beside it.** The obvious API is
`<pct-skeleton [loading]="pending()">the real content</pct-skeleton>`, and it is refused for
two reasons that point the same way. The projected content would live inside an `aria-hidden`
host, which is the violation above; and the swap is an `@if` the consumer already has, written
where they can see it. A component that owned the swap would own the region's busy state too,
and the region is theirs.

**A `size` input.** Answered above: the size is the type's.

**A tone, a variant, an animation switch.** A skeleton has no state to carry in colour, and a
consumer who wants it still has the tokens. `animation: none` is one declaration in their own
stylesheet, and an input for it would be a second way to say what
`prefers-reduced-motion` already says properly.

**A skeleton that times out.** "If the content has not arrived in ten seconds, show an error"
is an application's decision with an application's sentence, and a component that guessed the
threshold would be wrong on every slow connection.

## Consequences

**Nothing is added to `PCT_TEXTS`, for the second component in a row.** `./skeleton` costs the
other entrypoints **0 B**, because it draws no text at all — there is nothing to translate in a
component that says nothing.

**And it carries no `./core`, which every component entrypoint but the icon seam does.**
`./skeleton` is **2997 B** against `@angular/core` alone — no `./core`, no `./icon`, no
`@angular/common` — where the smallest component entrypoint before it was `./progress` at
7029 B. That falls out of the decisions above rather than out of any effort to be small: no
`size` input means no `PCT_CONFIG` to inject, no text means no `PCT_TEXTS`, and no icon means
no drawing to import. A component that answers with the platform's own arithmetic has little
left to ship.

**`check-aria` reads one thing more, and it is the fourth component in a row to do so.** Point
8: a component whose host carries `aria-hidden` holds nothing focusable and declares no name of
its own. Two fixtures are its control — `hidden-with-a-way-in` (a `<button>` grown inside the
decoration) and `hidden-with-a-name` (an `ariaLabel` nobody will ever read). The tabs added
composite roles, the accordion `<summary>`, the progress bar the tags whose implicit role is
named, and this one the subtree that is not in the tree at all — such widenings are found by
building rather than by reading ([`lesson-196`](../lessons.md#lesson-196)).

**One word joins the token dictionary**: `last`, as a variant, for
`--pct-skeleton-track-width-last`. It is the `today` shelf — a state of position rather than of
interaction — and it exists because a stack of identical full-width bars reads as a table
rather than as a paragraph.
