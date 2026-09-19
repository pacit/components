# 0081 — A tone on a button is a face, and the label is what speaks

**Status:** accepted
**Implements:** [`req-token-skin`](../requirements/tokens.md#req-token-skin),
[`req-a11y-forced-colors`](../requirements/a11y.md#req-a11y-forced-colors),
[`req-token-text-pairs`](../requirements/tokens.md#req-token-text-pairs)
**Evidence:** `libs/components/button/src/button.scss` and the tone cases in
`button.spec.ts`; the 32 entries the tones added to
`libs/tokens/src/contrast.policy.json` — 28 named `button/<tone> …` and four
`UI: button border (<tone>)` — measured on every build; the `Tones` card in
`apps/sandbox/src/app/views/button/` and the readings that walk it

## The question

The library had a tone vocabulary before it had a toned control:
[0076](0076-a-tone-is-two-channels-and-four-names.md) settled `success`, `warning`, `danger`,
`info` for the toast and the progress bar, and the badge recorded a refusal with a named
trigger: `success` / `warning` / `info` needed colour ramps the skin did not have at all, and
"the union grows the day the ramps land". This decision lands them, so that day is today —
which is why 0053's own sentence is in the past tense as of this branch, and why quoting it
here in the present would now quote nothing.

The ask was a button in colours: _info / warn / error / primary / accent_. Three of those are
the settled names under other spellings, one is the default, and one is not a tone at all.
This decision answers all five, and lands the ramps the badge was waiting for.

## Decision

**The button wears `PctTone`, unchanged.** `tone` is `PctTone | null`, `null` is the default
and paints the brand — the absence is the neutral, as the type's own header already says.
`error` and `warn` are `danger` and `warning`: a second spelling of a settled name is the
drift 0076 exists to prevent. `primary` gets no member, because primary is what a button with
no tone already is.

**Four faces wear it: `solid`, `outline`, `ghost`, `soft`.** `hero` refuses, and the component
does not write the attribute for it — the gradient IS the brand
([0058](0058-the-hero-face-is-paint-and-a-gradient-is-three-contrast-checks.md)), a toned
gradient would be three contrast checks per tone, and a silent refusal is how a consumer comes
to believe a tone is there. Dev mode says the sentence once.

**The label is the second channel.** 0076 binds a tone to two channels because a state painted
in colour alone is lost in forced colours and to a reader who cannot separate red from green.
On a button that second channel is the content: "Delete account" says danger in words. This is
the badge's road ([0053](0053-a-badge-is-a-word-wearing-a-tone.md)) — where a colour would
otherwise speak alone the repair is content, not configuration — and it is why the button
draws no icon of its own for a tone.

**Nothing about the tone is announced.** ARIA has no property for severity, and the three
readings recorded on the button's card say every variant announces as the same thing and
nothing more. A tone on a button is a face; putting it in the accessible name would make a
translated word out of an emphasis, and would lie the first time a consumer reached for red
without meaning danger.

**One focus ring.** `--pct-focus-ring` is `blue.500` in both themes and 20 stylesheets in the library read it.
Whether a control in an error state should ring in its own colour is a question for the skin,
and a shared property settled by whoever needed it first is an accident of that one case.

**`danger` moves from `red.600` to `red.700` in the light theme, and `red.600` leaves the
palette.** A quiet face hovers onto the page's own tint, where `red.600` reads 4.41:1 — below
the threshold the contrast gate blocks a build on. At `red.700` the same pair reads 5.91:1, and
danger joins the rule the other two hot tones were already keeping: a tone's base is the first
step that carries white text. The orphaned step goes, because
[0020](0020-the-palette-carries-no-spares.md) says the palette carries no spares.

## What the shape is

A tone swaps the button's base tokens and nothing else — the idiom the size axis already uses,
so the `:host` rule stays the only place that knows where which value lands. The tone rules
point at the SEMANTIC tier rather than at per-tone component tokens, which the badge has: the
name dictionary carries one variant per name, so `--pct-button-bg-hover-danger` cannot be
spelled, and a family across three states is a skin decision rather than a per-button lever.
Overriding `--pct-button-bg` still changes the button and nothing else.

The disabled state outranks every tone by specificity and not by line number, and it is
written that way on purpose: a control that cannot be pressed must not still look like the
press it refuses.

## Consequences

- **The badge's refusal has lost its reason, and is not yet spent.** `PctBadgeTone` names the
  ramps the skin lacked as the condition for growing, and this decision lands them — but the
  badge is untouched here and still takes `'neutral' | 'danger'`. The collapse onto `PctTone`,
  with `null` painting the pill `'neutral'` paints, is a breaking API change with no visual
  change at all, and it is owed in its own commit. Until it lands the library has two tone
  vocabularies, which is the state 0076 exists to end.
- **Forty-six semantic tokens and sixteen primitive steps land**, and every colour pair the
  faces paint is measured: 32 entries, both themes, none below AA.
- **Two pairs sit close to the line** — `warning` 4.51:1 and `success` 4.57:1 on the dark
  soft face's hover tint. They pass, and they are the first thing to re-read the day those
  ramps move.
- **`info` renders exactly like the default in this skin**, because `info` and `primary` are
  deliberately the same blue. The names stay separate: a skin where they diverge changes seven
  values and nothing else.

## What this costs us

- **A tone is now expressible where it means little.** Nothing stops `tone="success"` on a
  button labelled "Cancel", and no gate can see it — the same exposure the badge has, with the
  same answer: the dev-mode warning catches the empty case, and the rest is review.
- **Four tones times four faces is sixteen rules** in one stylesheet. They are written out
  rather than generated, which is the file's own style, and it is the largest block in it.
- **The skin's error colour changed shade** for every component that paints it, on a reading
  taken for the button alone.

## Alternatives considered

- **`accent` as a fifth member.** Refused: a tone is two channels, and `accent` has no drawing
  to ship under `PctIconName` because it carries no meaning — it is an emphasis, and emphasis
  already has an axis here, which is the face. Adding it later costs exactly what it costs
  today, so the door stays open; committing the skin to a second brand hue today does not.
- **`neutral` as a member.** Refused as a member, granted as an absence: the badge takes
  `null`. A union member meaning "none of the above" makes every consumer write it.
- **A `PctButtonTone` of its own.** The shape that would have allowed both extra names.
  Refused for 0076's reason: two lists that mean the same thing drift.
- **Hovering a quiet face onto the tone's own tint.** Measured and dropped — 3.00–5.30:1 across the
  four tones and both themes, failing five of those eight rows (`info` on both), because a tint
  sits too close to its base to carry the label. The quiet faces keep the page's tint.
