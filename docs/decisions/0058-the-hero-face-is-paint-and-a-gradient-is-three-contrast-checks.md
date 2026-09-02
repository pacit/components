# 0058 — The hero face is paint, and a gradient is three contrast checks

**Status:** accepted
**Implements:** [`req-token-contrast`](../requirements/tokens.md#req-token-contrast),
[`req-token-text-pairs`](../requirements/tokens.md#req-token-text-pairs),
[`req-a11y-motion`](../requirements/a11y.md#req-a11y-motion),
[`req-a11y-forced-colors`](../requirements/a11y.md#req-a11y-forced-colors),
[`req-token-no-opacity`](../requirements/tokens.md#req-token-no-opacity)
**Evidence:** `libs/components/button/src/button.scss`, the measured pairs in
`libs/tokens/src/contrast.policy.json` (both themes, printed by every `tokens:build`),
`apps/sandbox-e2e/src/forced-colors.spec.ts` and `preferences.spec.ts` — the gradient
dropped and the drift frozen, read computed in three engines

## The question

The site design ([site.md](../site.md), 2.1.2) asks for the maintainer's showpiece — the
animated-gradient button in angular.dev's spirit — and for enough quiet faces that a page
built from this library does not press five solid rectangles on the reader. What is the
honest shape of "many buttons that look nothing alike" in a library whose button is one
directive on a native element?

## One directive, five faces — and not one new line of TypeScript

`PctButtonVariant` grows to `solid | outline | ghost | soft | hero`, and that union is the
whole code change: the runtime already reflects the variant as `data-pct-variant`, and
every face is a stylesheet block keyed on it. A second button component — a `HeroButton`
with its own selector — would fork the disabled machinery, the loading spinner, the size
axis and the focus ring for the sake of a background. Paint is paint; it goes where paint
goes. (The measured corollary: this step adds **zero mutants** — there is nothing new for
Stryker to break, because there is nothing new that runs.)

- **`ghost`** is the outline stripped of its boundary — toolbars and top bars. It reuses
  the outline's measured pairs outright.
- **`soft`** is a tinted resting surface. Real colours, not primary under an opacity
  ([`req-token-no-opacity`](../requirements/tokens.md#req-token-no-opacity)): the tint and
  its hover step are semantic tokens with policy entries of their own.
- **`hero`** is the loud one: the brand gradient drifting across an oversized
  `background-image`, white text, a lift on hover instead of a colour change — a transform
  does not fight the background animation for the same property.

## The gradient lives in the semantic tier, as a role with a pair

The stops are not component tokens and not hex in a stylesheet. `hero` is a **semantic
role**: `--pct-hero`, `--pct-hero-via`, `--pct-hero-to` — the first stop is the role's own
name, which is what satisfies the pair rule — and `--pct-on-hero` is the text that stands
on all three. Two consequences fall out of existing law rather than new machinery:

- **The pair rule delivers the headline sentence.** `on-hero` promises text FOR `hero`
  ([`req-token-text-pairs`](../requirements/tokens.md#req-token-text-pairs)), and the
  contrast policy holds one entry per stop: **a gradient is three contrast checks, not
  one** — 5.17, 5.70 and 5.36 to 1 on the day of writing, printed by every build, in both
  themes. A library that ships an animated gradient CTA whose middle is unreadable has
  shipped a poster, not a button; the gate here makes that state unbuildable.
- **A theme retunes the gradient like anything else.** The stops reference primitives
  (`blue.600`, the new `violet.600` and `cyan.700` ramps — private, like every colour
  ramp, per 0019), and a skin overriding `--pct-hero-*` in a scope gets a different
  gradient with the same three checks waiting for it.

The soft face grew the same way: `--pct-primary-100` and `--pct-primary-200` extend the
existing `100` variant idiom, with `--pct-on-primary-100` as their measured text — 5.49
and 4.72 in light, 6.14 and 4.72 in dark, where the tint inverts to `blue.800`/`blue.700`.

## Motion and forcing: the two modes that unmake decoration

The drift is `background-position` over a `300%` image, its duration from the motion axis
(`--pct-motion-drift-duration`, 8 s). Under `prefers-reduced-motion` the axis sets it to
**`0s` — frozen**, not slowed: the spinner slows because it still says "working", but the
drift informs of nothing, so under the preference it is a vestibular cost with no message
([0008](0008-motion-axis.md)'s distinction, applied at the opposite end). `0s` is safe
where the transition's `0.01ms` was needed — nothing anywhere listens for this animation's
events.

Under `forced-colors: active` the forcing strips colours but **not images** — left alone,
the gradient would keep painting over the forced `ButtonFace` (the skeleton's shimmer
lesson, one component over). So the stylesheet drops it by hand (`background-image: none`,
animation off), and gives the three boundary-less faces a `ButtonText` border back —
`transparent` keeps its alpha through the forcing, and a button whose only edge was a tint
would melt into the Canvas. All of it is read back computed, per engine, not assumed.

## Costs

- The semantic dictionary grew `hero` as a role and `via`/`to`/`200` as variants. `via`
  and `to` are gradient words and mean nothing to any other role today; they are the
  price of keeping stops guessable (`--pct-hero-via` is exactly where you would look).
- The hero keeps **one gradient for both themes** — the stops clear `on-hero` either way,
  so the dark theme inherits them unchanged. A dark-tuned gradient is a theme's decision
  later, not a second set of tokens now.
- The hover answers with a 1 px lift, not a colour step — a moving surface has no readable
  hover colour, and the policy cannot measure a moving pair. Recorded so nobody "fixes"
  the missing `bg-hover`.
- `--pct-motion-drift-duration` is a third duration on the motion axis with exactly one
  consumer. Accepted: the axis is the one place `prefers-reduced-motion` is answered, and
  a hand-written media query in `button.scss` was the alternative.
