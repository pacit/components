# `PctSparkline` — one series drawn small, in a row or a card

**Summary:** One series drawn small where its values already stand: a line, bars or a band.
**Entrypoint:** `@pacit/components/sparkline`
**Selector:** `pct-sparkline`
**Status:** released
**Category:** Data & status
**ARIA APG pattern:** none — a sparkline is a picture, not a widget. The host carries the
[`img` role](https://www.w3.org/TR/wai-aria-1.2/#img), named by the consumer and described by
the words the picture holds. Named in the class JSDoc.

A chart in a word's space
([0117](../decisions/0117-a-sparkline-is-a-picture-with-no-scene.md)): no axes, no cursor, no
legend and no table, because the values stand in the row beside it. It is an entrypoint of its
own and imports nothing of `@pacit/components/chart`, so a table of a hundred rows pays for a
few kilobytes and not for a scene.

## Usage

```html
<th scope="row" id="hall">Hall</th>
<td>
  <pct-sparkline [data]="hours()" unit="kWh" [area]="true" ariaLabelledby="hall" />
</td>
```

## Contract

|             |                                                                                                                                                                                                                                                                                                        |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Value**   | none — a picture holds no value. `description()` is what it says: the lowest and the highest value and the last, with the unit, or a band's last state, or `No data`                                                                                                                                   |
| **Inputs**  | `data` (the rows, in order), `value` (a key of a row or a function of the row and its index; unset, each row is its value), `kind` (`line \| bars \| band`, default `line`), `area`, `last` (default `true`), `extremes`, `floor`, `ceiling`, `color`, `unit`, `locale`, `ariaLabel`, `ariaLabelledby` |
| **Outputs** | none — nothing on it is pressed. A row that opens a chart is the consumer's row                                                                                                                                                                                                                        |
| **Slots**   | none — an `img` has no children a reader meets                                                                                                                                                                                                                                                         |
| **Parts**   | `picture` (the drawing, hidden), `line`, `area`, `bar`, `slot` (a band's slot), `dot` (the last value, the lowest or the highest)                                                                                                                                                                      |
| **Harness** | `PctSparklineHarness`                                                                                                                                                                                                                                                                                  |
| **Tokens**  | the `--pct-sparkline-*` prefix — `fg`, `width`, `area-alpha`, `band-bg`, `dot-size`, `dot-fg` — plus five entries in `contrast.policy.json`                                                                                                                                                            |
| **Strings** | `sparklineLast` (before the last value: `last 1.7 kWh`) and `sparklineEmpty` (`No data`); a band says `chartOn` or `chartOff`, the chart's own words                                                                                                                                                   |

**Which slot and which dot.** A band's slot that is on carries `data-pct-on`, and a dot says
which value it stands on in `data-pct-dot`: `last`, `min` or `max`. A skin reads them, as
the e2e spec does.

**What it reads as gaps.** Anything that is not a finite number: `null`, `NaN`, a string. A
line breaks there and goes on after it, the area closes each run of two values or more, a bar
or a band's slot is left out, and the last dot stands on the last value there is.

**The range.** Unset, a line runs from its lowest value at the bottom to its highest at the
top, and a flat series draws across the middle. Bars rise from nought, so their range takes
nought in. `floor` and `ceiling` fix the range — the same for every row of a table, so the rows
compare — and a value outside it is held at the edge. The words are the data's, never the
range's.

**Why the dots are HTML.** The drawing is laid in a box of a hundred by a hundred and stretched
to the host with `preserveAspectRatio="none"`, which is what lets a consumer size it with CSS
and the server draw it with no measuring. A stretched circle is an ellipse, so the dots stand
over the drawing as elements placed by percentages, and the line keeps its width through
`vector-effect: non-scaling-stroke`.

## Parts

| part      | what it is                                                |
| --------- | --------------------------------------------------------- |
| `picture` | the drawing, hidden: the host is the image a reader meets |
| `line`    | the series as a line, broken at each gap                  |
| `area`    | the fill under the line, down to the floor                |
| `bar`     | a value as a bar, from nought held in the range           |
| `slot`    | a value of a band, filled when on                         |
| `dot`     | the last value, or the lowest or the highest              |

## Theming

```css
[data-theme='brand'] {
  --pct-sparkline-fg: #0f766e;
  --pct-sparkline-width: 2px;
}
```

A row's own colour goes through `color`, which wins over the token for that sparkline alone.

## Keyboard map

| key | effect | test |
| --- | ------ | ---- |
|     |        |      |

Empty **by design**: a picture is no stop. A reader meets it in reading order, named by its row
and described by its values; `apps/sandbox-e2e/src/sparkline.spec.ts` asks every element in it
for a tab index and finds none.

## Checks

Every row: a path to evidence, or `none — <deliberately|gap>: <reason>`.

| criterion                                                  | evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| ARIA pattern named in the class JSDoc                      | `libs/components/sparkline/src/sparkline.ts` — the `img` role on the host                                                                                                                                                                                                                                                                                                                                                                                                            |
| Keyboard map tested key by key                             | `apps/sandbox-e2e/src/sparkline.spec.ts` — the empty map is the claim: no element in the component has a tab index                                                                                                                                                                                                                                                                                                                                                                   |
| axe audit on the component's own sandbox view              | `apps/sandbox-e2e/src/a11y.spec.ts` — `/sparkline` in `SBX_ROUTES`                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Visual screenshot                                          | none — gap: no baseline yet; the geometry a screenshot would show is measured instead in `apps/sandbox-e2e/src/sparkline.spec.ts` — the box of six by one em, the line at its width, the dot round and at the right edge                                                                                                                                                                                                                                                             |
| `forced-colors: active` — no state carried by colour alone | `libs/components/sparkline/src/sparkline.scss` — the line, the bars, a band's on-slots and the dots in `CanvasText`, the area left empty, an off-slot an edge on `Canvas`                                                                                                                                                                                                                                                                                                            |
| `prefers-reduced-motion` — duration from a token           | not applicable — no motion at all                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Touch target ≥ 24×24 px outright                           | not applicable — nothing here is a target                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Size axis aligned to `--pct-control-height-*`              | deliberately not: a sparkline is no control, and its box is a word's, sized by the consumer's CSS                                                                                                                                                                                                                                                                                                                                                                                    |
| Density axis                                               | none — gap: the same one every component here has ([`req-token-density`](../requirements/tokens.md#req-token-density))                                                                                                                                                                                                                                                                                                                                                               |
| RTL — no physical properties + a `dir="rtl"` screenshot    | logical properties only, held by `check-styles`; a series runs left to right in every direction (`direction: ltr` on the drawing), as the chart's axis does; no screenshot, as above                                                                                                                                                                                                                                                                                                 |
| SSR + hydration with no `NG05xx`                           | `apps/sandbox-e2e/src/hydration.spec.ts` — `/sparkline` in `SBX_ROUTES`; the server draws the whole picture, nothing is measured                                                                                                                                                                                                                                                                                                                                                     |
| Forms                                                      | not applicable — a picture holds no value a form owns                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Parts registered in the inventory                          | `libs/components/parts.snapshot.md`, `tools/check-parts.mjs` — the **Parts** row above                                                                                                                                                                                                                                                                                                                                                                                               |
| Tokens registered + an entry in `contrast.policy.json`     | `libs/tokens/src/contrast.policy.json` — the drawing and the dots on both surfaces (UI error, 4), a band's off-slot on the surface (UI warn); `libs/tokens/tokens.snapshot.md`                                                                                                                                                                                                                                                                                                       |
| Strings through `PCT_TEXTS`                                | `libs/components/core/src/texts.ts` — `sparklineLast`, `sparklineEmpty`; `libs/components/texts.snapshot.md`                                                                                                                                                                                                                                                                                                                                                                         |
| Entrypoint size budget                                     | `libs/components/size.snapshot.md` — the `./sparkline` row, on `./core` alone                                                                                                                                                                                                                                                                                                                                                                                                        |
| Screen-reader log                                          | Read 2026-11-05 from `docs/acr/at/` — three readers, whole sandbox. **Not reachable by this instrument**, which is the claim itself: a sparkline takes no focus, and `/sparkline` walks from the page to the demo's one button (`Next hour button main`, `Next hour · button.`) and out to the scaffold, past every picture. What a reader hears on meeting one — its row's name and the sentence of `aria-describedby` — needs a reader asked to READ the table rather than walk it |
| A docs page with live examples                             | `apps/sandbox/src/app/views/sparkline/` (the sandbox view). The published site: `/components/sparkline` — prerendered, the demo's own source is the code tab                                                                                                                                                                                                                                                                                                                         |
| Unit + mutation                                            | `libs/components/sparkline/src/sparkline.spec.ts` — 11 cases; `libs/components/mutation.snapshot.md` — `sparkline.ts`                                                                                                                                                                                                                                                                                                                                                                |

## Decisions this component implements

[0117](../decisions/0117-a-sparkline-is-a-picture-with-no-scene.md) (the main one — a picture
with no scene, one series, the words beside it),
[0102](../decisions/0102-a-series-colour-is-a-place-in-the-palette-and-a-second-channel.md)
(why a sparkline takes no place in the palette: it is one series, and its colour is the
consumer's or the token's),
[0100](../decisions/0100-svg-with-decimation-and-a-canvas-layer-behind-a-measurement.md) (the
SVG drawing, here with nothing to decimate: a cell holds tens of values, not thousands),
[0013](../decisions/0013-no-headless-split.md) (parts and tokens as the whole styling contract).

## Known limitations

- **One series.** Two lines in a cell are a chart, and `pct-chart` draws them with the axes
  that make two series readable.
- **No tooltip and no cursor.** A value under the pointer is what the row beside it already
  says; a sparkline that took the pointer would be a target and a stop.
- **No decimation.** A sparkline of thousands of values draws a path of thousands of points;
  a cell's worth of values is the case it is built for.
- **No screenshot baseline.** The picture's geometry is measured in the e2e spec rather than
  compared with an image.
