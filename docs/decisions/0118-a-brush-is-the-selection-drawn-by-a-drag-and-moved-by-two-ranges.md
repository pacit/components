# 0118 — A brush is the selection drawn by a drag and moved by two ranges

**Status:** accepted
**Implements:** [`req-api-templates`](../requirements/api.md#req-api-templates),
[`req-a11y-built-in`](../requirements/a11y.md#req-a11y-built-in),
[`req-a11y-wcag`](../requirements/a11y.md#req-a11y-wcag),
[`req-token-names`](../requirements/tokens.md#req-token-names),
[`req-token-contrast`](../requirements/tokens.md#req-token-contrast)
**Evidence:** the sandbox view `/chart` walked by `apps/sandbox-e2e/src/chart.spec.ts` ("a
brush and a navigator"); `libs/components/chart/src/model/brush.spec.ts`;
`libs/components/chart/src/chart.spec.ts` ("PctChart, its brush")

## Context

A week of readings at one a minute is ten thousand points, and the question asked of it is
nearly always about a stretch: the night the heat pump defrosted twice, the afternoon the
supply air fell. [0101](0101-the-window-the-cursor-and-the-selection-are-the-applications-models.md)
gave the chart a `selected` band beside the `window`, and the bars write it on a press; what
was missing is a way to draw it across a series, move it, and make it the window — and the
usual picture of that: a strip of the whole series under the chart, with the stretch on show
marked on it, which a drag moves. Two shapes were open. A directive on the chart, as
`pctChartSync` is, would keep the scene's code out of a page that does not brush; but the
press, the drag and the double tap are the scene's own gesture machine, and a directive that
listens beside it would fight it for the pointer. And a navigator as a component of its own
would draw a second chart in all but name.

## Decision

**An input of the scene, and the selection it already has.** `brush` on `pct-chart` turns a
drag across the plot from a pan into `selected`. The arithmetic is pure, in `model/brush.ts`:
where a press lands (on an edge within 12px, inside, outside), the selection a drag makes
from there, and an edge put at a position — always inside the window and never narrower
than the window's own narrowest span, two minutes on a time axis. A drag from outside draws
a new selection, one from inside moves it whole, one from an edge moves that edge; a travel
short of the gesture's slop is a tap, which lets a selection it missed go and is then the
scene's own tap, so the cursor still pins.

**Two ranges, as the cursor is one.** Each edge has a native range beside the picture,
hidden from the eye and read as the cursor's
([0103](0103-a-chart-is-a-named-picture-and-its-cursor-is-the-platforms-range.md)): from 0 to
the window's span, its value the edge's distance from the window's start, its value text the
position written in full. They follow the cursor's range in the tab order, so a chart with a
brush has three stops. The arrows move an edge by a hundredth of the window, the page keys
by a tenth, Home and End to the window's ends; Enter shows the selection as the window and
Escape lets it go — and passes on with no selection, for a dialog around the chart. The
focus is drawn on the edge's grip, a line across the plot with a knob, since the range is
not seen.

**The twin of the drag is two taps.** A tap on a grip picks its edge and the next tap on the
plot puts it there, a single pointer with no path (WCAG 2.5.7); a double tap inside the
selection shows it, one outside goes home. A chart with `zoom="none"` keeps its window on
both.

**A navigator is a recipe.** A low chart with `brush`, `zoom="none"` and `cursorMode="none"`,
its `[(selected)]` bound to the main chart's `[(window)]`, is the navigator: the whole series,
the stretch on show as its selection, a drag on it moving the chart above and a zoom above
moving the selection on it. No component is added, and the pieces are the application's to
arrange — over the chart, under it, beside a table.

## Consequences

- Three tokens, `--pct-chart-handle-width`, `-handle-bg` and `-handle-border`, and `handle`
  as a part in the names policy; the contrast gate holds the edge to UI on both surfaces and
  on its knob as an error.
- Three texts: `chartBrushFrom`, `chartBrushTo` and `chartBrushKeys`, the edges' names and
  the sentence of their keys.
- `zoomToSelection()` is public: an application's own button shows the selection the same
  way.
- A brush selects along the horizontal axis alone. A box of values — a second pair of edges
  up the value axis — waits for a use that is not served by `zoom="xy"`.
- One pointer brushes: a second finger during a brush is ignored, and a pinch on a brushing
  chart is not a zoom. A navigator does not need one, and a main chart with a brush keeps
  Ctrl with the wheel and the zoom bar.
