# 0065 — A treatment that paints is a component, because a directive cannot

**Status:** accepted
**Implements:** [`req-api-attributes`](../requirements/api.md#req-api-attributes),
[`req-api-parts`](../requirements/api.md#req-api-parts),
[`req-token-contrast`](../requirements/tokens.md#req-token-contrast),
[`req-token-names`](../requirements/tokens.md#req-token-names),
[`req-a11y-motion`](../requirements/a11y.md#req-a11y-motion),
[`req-a11y-forced-colors`](../requirements/a11y.md#req-a11y-forced-colors)
**Evidence:** `libs/components/button/src/button.scss` (the fill face, and the only one that
exists), `apps/docs/src/app/pages/home/home.scss` (three hand copies of the same idiom, the
third one measured in this decision), `libs/tokens/src/contrast.policy.json` (three entries,
all of them about hero as a **background**), [`lesson-21`](../lessons.md#lesson-21),
[`lesson-156`](../lessons.md#lesson-156)

## The question

The library has one loud face — the brand gradient, drifting — and
[0058](0058-the-hero-face-is-paint-and-a-gradient-is-three-contrast-checks.md) put it on the button. The site then wanted it
three more times and could not ask for it: the headline clips it to text, the identity tiles
take one stop each for a border, and the live cards now light a rim and paint a component's
name. Each is a hand copy in the site's own stylesheet, each spells the same four-stop
gradient and the same drift, and none of them is reachable by a consumer of the package.

The review that asked for the third copy asked the real question with it: should this be
standard equipment — `heroBorder`, `heroText`, `heroBackground`, each with a trigger?

The answer to the substance is yes. The answer to the shape is that it cannot be a directive,
and the reason is not style but architecture.

## A directive carries no paint, and this library lends it none

An Angular directive has no stylesheet. It can add classes and attributes; the rules those
select have to already exist somewhere. In this repository they cannot: every rule the
library ships is **component-scoped**, and the only global artifact in the package is
`themes/pct.css`, generated from the DTCG sources and carrying variables — not one rule. A
directive-shaped hero would therefore require the package to start shipping global rules, and
that is the first hole in a property worth more than the convenience: today a consumer who
installs this library gets no selector that can reach their markup by accident.

So the treatment takes the shape the library already knows for dressing an element the
consumer owns — a component with an **attribute selector**, exactly as `pctButton` dresses a
`<button>` and `pctText` an `<input>`:

```html
<article pctHero="edge">…</article>
<h3 pctHero="text">Tabs</h3>
<div pctHero="fill" show="interact">…</div>

<!-- a condition needs no API of its own: the face is an input, so it takes a binding -->
<article [pctHero]="featured() ? 'edge' : null">…</article>
```

Two inputs, stamped as `data-pct-*` state per
[`req-api-attributes`](../requirements/api.md#req-api-attributes): `pctHero` names **which
surface** takes the gradient (`edge | text | fill | null`), `show` names **when**
(`always | interact`). The third case the review asked for — a variable with a trigger — is
the binding above, and inventing an input for it would have been inventing a second way to
say what a signal already says.

## One face per element, and the compiler agrees

Three independent switches would let a consumer write the one combination that cannot be
read: gradient text on a gradient fill. A single input makes that state unrepresentable
rather than documented, and Angular enforces the same rule from underneath — two components
cannot share a host element, so an element wears one face or none.

The cost of that enforcement is real and is stated in the limitations: `pctHero` cannot sit
on another component's host. A hero-faced button is not `<button pctButton pctHero>`; it is
`variant="hero"`, which the button already has. When a second component genuinely needs the
face, it grows its own variant — which is not a workaround but the honest path, because a
variant brings its own contrast entries and its own card, and a face bolted onto a host from
outside brings neither.

## When it paints, and what a device without hover is owed

`interact` is **hover or `:focus-visible`**, never hover alone. A treatment that only a mouse
can summon is a treatment a keyboard cannot, and this library does not ship those.

On `(hover: none)` the pair falls to `:focus-visible` and `:active`: attention on a touch
screen is a press, so the face answers a press. The alternative — painting it always on touch
— was rejected because a grid of cards all wearing the loud face is not the loud face any
more.

## The text face cannot have the brand's own stops in the dark

Measured on the tokens' own values, the three stops as **foreground**:

| stop       | value     | on the light card | on the dark card |
| ---------- | --------- | ----------------- | ---------------- |
| `hero`     | `#2563eb` | 5.17              | 3.45             |
| `hero-via` | `#7c3aed` | 5.70              | 3.13             |
| `hero-to`  | `#0e7490` | 5.36              | 3.33             |

The `edge` and `fill` faces are fine: a boundary is non-text and measured against 3:1, and
the fill's label is measured against the stops it lies on, which the policy already carries.
The `text` face is not: text under 24px is measured against 4.5:1, and every stop misses on
the dark ground. The site's own headline is legal only because it is enormous — the same
three colours, the same ground, a different threshold.

So the `text` face arrives with **dark-ground stops of its own**: three semantic tokens
lifted toward white, which needs two new primitives (a violet and a cyan near the 400 level,
mirroring `blue.400`, which measures 7.02 on the dark surface). The site's third copy already
does this with `color-mix` at 70% and reads 5.91, 5.43 and 5.88 — even across the sweep,
which matters as much as the size, because a gradient's weakest stop is the one nobody looks
at. Until those tokens exist, the face ships without a dark ground it can stand on, and that
is a reason to build them, not to ship the face.

**The gate arrives with the extraction, and that is half the argument for it.** Point 7 of
`check-tokens` demands a contrast entry for every colour a library stylesheet paints as text,
background or outline. The site's copies escape it because the site is not the library — and
the consequence is exactly what one would predict: the biggest headline on the page is
painted in three colours no gate has ever measured, and axe cannot help, because text clipped
from a background carries `color: transparent` and axe reports that it cannot tell. Moving
the idiom into the library turns that silence into three checks that fail a build.

## What it costs

- **A new entrypoint** — the 34th — with everything one carries here: a card, a sandbox view,
  a three-engine spec, parts and token snapshots, a bundle row, a mutation row.
- **Two new primitives** in a palette deliberately small, plus the semantic trio above them
  and their contrast entries. Every widening of the palette is a line in a diff that has to
  be argued, and this one will be.
- **A probe before the code.** The `edge` face stands on `mask-composite`, and
  [`lesson-156`](../lessons.md#lesson-156) is already the first bill for it: the site's own
  rim painted the whole card in firefox because a `-webkit-` shorthand undid the composite
  above it, in one engine, with no symptom. The geometry gets measured in three engines before
  the component exists, as every ARIA geometry here does.
- **A limitation with a sharp edge**: no `pctHero` on another component's host, stated in the
  card rather than discovered.

## What was rejected

- **A directive plus a global stylesheet.** The API the review asked for, and the one that
  costs the package's own property that no rule of ours can reach a consumer's markup by
  accident. A convenience is not worth a global selector.
- **Three independent inputs** (`heroBorder`, `heroText`, `heroBackground`). They read well
  and they permit gradient text on a gradient fill. One input for the face refuses it by
  construction.
- **A wrapping element** (`<pct-hero>`). It composes with anything, including other
  components — and it inserts a box into the consumer's layout to do it, which
  [`req-api-no-wrapper`](../requirements/api.md#req-api-no-wrapper) exists to refuse.
- **A per-component variant everywhere.** It is the right answer for a component that wants
  the face itself (the button has it) and the wrong one as a general mechanism: 33 components
  would each grow an input for the same paint.
- **Restricting the `text` face to display sizes** instead of lifting the stops. It is true,
  it is cheaper, and it is a rule no gate can hold: nothing in CSS knows that 16px is not
  24px at the moment the face is applied. A face whose legality depends on the consumer
  reading a sentence is not a face this library ships.
