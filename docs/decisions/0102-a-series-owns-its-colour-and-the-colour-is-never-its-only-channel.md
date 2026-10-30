# 0102 — A series owns its colour, and the colour is never its only channel

**Status:** accepted
**Implements:** [`req-token-contrast`](../requirements/tokens.md#req-token-contrast),
[`req-token-names`](../requirements/tokens.md#req-token-names),
[`req-a11y-forced-colors`](../requirements/a11y.md#req-a11y-forced-colors),
[`req-a11y-wcag`](../requirements/a11y.md#req-a11y-wcag)
**Evidence:** the probe P7 on `probe/chart-0` (commit `863185d6`, never merged):
`palette.mjs` and `palette-search.mjs`, which read the surfaces from the built tokens

## Context

A chart of eight series needs eight colours a reader tells apart, on both themes, and a
series has to keep its colour when another series is removed, because the first consumer
saves an analysis with a palette index per series. WCAG asks 3:1 of a graphic that carries
meaning (1.4.11) and forbids colour as the only means of telling things apart (1.4.1). The
first consumer's phone palette was taken as the starting point and measured.

## Decision

**A series owns its colour.** A mark's `color` is a palette index (one to eight) or any CSS
colour. Without one, the scene gives a series the next index when its `id` first appears and
keeps it while the series is on the chart, so removing a series repaints none of the others.

**The palette is eight tokens per theme, held to three rules:**

- every colour at least 3:1 on both surfaces of its theme, `surface` and `surface-100`,
  measured by the contrast gate;
- series N has the same hue in both themes, so a stored index means the same colour after a
  change of theme;
- the closest pair is measured as a reader with each of the three colour-vision deficiencies
  sees it, as an OKLab distance, and the palette keeps at least 0.08 across all eight and
  0.14 among the first four, which most charts use.

**The colour is never the only channel.** Series N also has a dash pattern and a marker
shape. The legend and the tooltip draw both beside the name; the lines draw the pattern
under `forced-colors: active`, where every colour becomes one, and on request
(`distinct="all"`). Text is never in a series colour: values, labels and units stand in the
text colours and the series' swatch beside them carries the identity.

**The names extend the dictionary.** A series colour has no meaning to name, only its place,
so the component dictionary gains the part `series`, the properties `color` and `dash`, and
the variants one to eight as ordinals: `--pct-chart-series-color-3`. The semantic tier's
refusal of `--pct-tone-2` (the comment on that tier in `libs/tokens/src/names.policy.json`)
stands, because a tone has a meaning and a series slot has none. The dictionary entry lands
with the first token that uses it.

## The measurement

| palette                                  | under 3:1 (light / dark) | closest pair, all eight | closest among the first four |
| ---------------------------------------- | ------------------------ | ----------------------- | ---------------------------- |
| the first consumer's phone palette (P7a) | 4 of 8 / 1 of 8          | 0.016–0.032             | 0.040–0.091                  |
| the search's candidate, seed 31 (P7b)    | none (lowest 3.12:1)     | ≥ 0.082                 | ≥ 0.146                      |

The distances are the smallest over normal vision and the three simulated deficiencies
(Machado 2009, severity 1), on the colours as written. The search kept each hue within 30° of
the phone palette's, lightness in a band per theme (0.45–0.63 light, 0.65–0.82 dark) and
colourfulness (OKLCH C) between 0.10 and 0.19, so the colours stay colours and do not drift
into black, white or neon. The candidate is where the token work of the chart's first
component starts; the gate, not this record, decides its final steps.

Eight colours that stay 0.08 apart for every reader are the best the search found and are
still close for a reader with a deficiency. That is the reason for the second channel, not a
complement to it.

## Consequences

- A saved analysis keeps its colours across themes and across removed series.
- The first consumer's colours change visibly, by 0.09 to 0.27 in OKLab from the phone's in
  the light theme and by 0.05 to 0.21 in the dark one: the price of a palette that passes 3:1
  in the light theme and keeps one hue per index in both.
- A consumer's own CSS colour is outside the gate, and the card says so.

## What this costs us

- **Eight dash patterns and eight markers** to design and to test under forced colours.
- **A dictionary change** for a family of names whose only content is a number.

## Alternatives considered

| alternative                                  | why rejected                                                                              |
| -------------------------------------------- | ----------------------------------------------------------------------------------------- |
| The phone palette as it is                   | half of it under 3:1 on the light theme; pairs a reader with a deficiency cannot separate |
| Colour by position in the list               | removing a series repaints the rest, and a saved analysis loses its colours               |
| A different hue per theme for the same index | an index would not name a colour                                                          |
| Named colours (`series-blue`)                | the name would lie in a skin that paints series one green                                 |
| Dash patterns on every line, always          | eight patterns at once read as noise; the swatch carries them where they are read         |

## Amended 2026-10-30: the palette crosses three tiers

The record put the eight colours in the component tier alone, and the token build answered
otherwise: a component file holds one value for both themes, and only the semantic tier is
swapped between them. So the palette stands in three tiers. The primitive axis `series` holds
the sixteen colours, `light-1` to `light-8` and `dark-1` to `dark-8`, private like every ramp.
The semantic tier gains the role `series` with the ordinals 1 to 8 as variants, each theme
pointing at its own eight — the refusal of `--pct-tone-2` still stands for a tone, which has a
meaning; a series place has none. The component tier keeps the name the record gave,
`--pct-chart-series-color-3`, pointing at `--pct-series-3`, and the dictionary's `ordinals`
list holds the variants there. A skin re-points a place in one theme at the semantic name, or
in one chart at the component name.

## Amended 2026-10-30: the second channel's tables, and who draws the swatch

Building the legend (phase 5 of 1.11) settled two details. **The dash patterns and the
marker shapes are tables, not tokens.** A dash pattern is a `strokeStyle` in DTCG, a type the
design tool's bridge does not read (`check-bridge` measures seven), and a marker shape has no
type at all; so the eight dashes stand in `line.scss` and the eight shapes in the contract
(`PCT_SERIES_MARKERS`), and the dictionary gained the property `color` alone. A ninth series
starts over at the first of each. **A mark draws its own swatch.** `PctMark.swatch` is a
template that draws the series small — its line with its dash and its marker, or the marker
alone — and the legend, the tooltip and the markers on the cursor's line stamp it, so a bar
will draw a bar's swatch and nothing beside the mark knows what a series looks like.
