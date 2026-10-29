# chart — the probes behind 0099–0103

Phase 0 of the chart plan. A static page (`page.html` + `page.js`) driven by `probes.spec.mts`
in three engines, a template probe compiled by the library's own Vitest configuration, a type
probe compiled by `ngc`, and two palette scripts. Every Playwright row is a JSONL line with the
condition it ran under (engine version, locale, zone, device pixel ratio, CPU throttle, the
desk's load average).

From the repository root:

    PROBE_OUT=run PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=1 scripts/heavy npx playwright test --config probes/chart/playwright.config.mts
    scripts/heavy npx vitest run --config libs/components/mutation.vitest.config.mts probes/chart/svg-template.probe.spec.ts   (copy it under libs/components first: the config's root is the library)
    scripts/with-node node node_modules/@angular/compiler-cli/bundles/src/bin/ngc.js -p probes/chart/types/tsconfig.json
    scripts/with-node node probes/chart/palette.mjs probes/chart/palettes.json
    scripts/with-node node probes/chart/palette-search.mjs 31 200000
    scripts/with-node node probes/chart/node/bench.mts

## The probes

- **P1** a pinch: eight series of 60,480 readings (a week at one per ten seconds) in a plot
  1,400 px wide, the window narrowing from the week to an hour and back over three seconds,
  each frame drawn by one of: `svg` (a scan of the window), `svg-pyramid` (a min/max pyramid),
  `svg-pyramid-2` (two readings a column), `svg-pyramid-int` (whole-pixel path),
  `svg-transform` (paths drawn once, the group moved), `canvas`; and the baselines `idle`
  (nothing drawn), `svg-static` (paths still, one label changing), `cursor-inline`,
  `cursor-overlay`, `cursor-promoted`, `cursor-transform` (paths still, a cursor crossing them
  in the same `<svg>`, in a second one, in a second one with `will-change`, as an HTML line
  moved by `transform`), `labels-split`, `labels-promoted` (paths still, every label changing
  in a second `<svg>`, without and with the data's `<svg>` promoted) and `layer-transform` (the
  week drawn once in a promoted `<svg>`, the gesture a CSS transform of it). Chromium also
  under a 4× CPU throttle, which slows the main thread and not the raster threads, so it
  says nothing about a renderer that rasterises on the main thread (the canvas).
- **P2** decimation alone, per frame of eight series: a scan, the pyramid (from `run5` the
  exact algorithm of phase 1, checked equal to the scan point for point in fifty random
  windows), the path string; the pyramid's cost to build; the copy of a consumer's objects
  into typed arrays. `node/bench.mts` measures the phase-1 code itself, scan against pyramid,
  from 43 to 1,429 readings a column.
- **P3** label widths: `measureText` against `getComputedTextLength` and `getBBox`.
- **P4** (`svg-template.probe.spec.ts`) a mark's SVG in an `<ng-template>`, stamped into one
  `<svg>` by `NgTemplateOutlet`, in the browser's DOM and in the server's HTML.
- **P5** (`types/`) whether the template compiler infers a mark's `T` from `[data]` and holds
  `x` and `y` to keys of the right type.
- **P6** pointer and touch: a tap, Ctrl + wheel (passive and cancelled), and in Chromium a
  horizontal drag, a vertical drag and a two-finger pinch through the DevTools protocol, on a
  box with `touch-action: pan-y` and (from `run5`) on a control box with `touch-action: auto`.
- **P7** (`palette.mjs`, `palette-search.mjs`) the series palette: contrast on both surfaces
  of each theme, and the closest pair seen with normal vision and three deficiencies.
- **P8** the focus stop's accessibility shapes under axe 4.13, with every tag including
  `best-practice` and `experimental`.

## Runs, 2026-10-29

The desk was shared: another session's Gradle build ran through runs 2–4, and the load average
on each row says how much (3–11). The headless engines rasterise in software, so frame rates
rank the strategies and do not predict a GPU.

- `run1/` P1 (six modes), P2, P3, P6, P8 — the first full run; **WebKit at a device pixel
  ratio of 2** (the `Desktop Safari` profile), the others at 1, a 1,280 × 800 viewport under a
  1,400 px plot, and a vertical drag that started below the viewport. P3 and P8 are read from
  it; its P1, P2 and P6 are superseded by `run5`
- `run2/`–`run4/` P1 baselines and cursor layers under the same skewed conditions — superseded
- `run5/` P1 (fourteen modes), P2 (the exact pyramid), P6 (the drag on screen, the control
  box), every engine at a pixel ratio of 1 in a 1,600 × 900 viewport, load 3–6 — **the run the
  decisions read**
- `node/result.txt` P2d, the phase-1 decimation in Node 24

## Readings

Frame rates in frames a second, Chromium / Firefox / WebKit, two rounds, from `run5`.

| id  | reading                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1a | `idle` 60 / 60 / 62: the frame clock is healthy                                                                                                                                                                                                                                                                                                                                                                                             |
| P1b | `svg-static` 34–44 / 29 / 34–39: one changed label repaints every path of its `<svg>`                                                                                                                                                                                                                                                                                                                                                       |
| P1c | `labels-split` 24–26 / 57–58 / 29–32; `labels-promoted` 58 / 57–58 / 58–60: a second `<svg>` is a layer of its own in Firefox only, until the data's `<svg>` is promoted                                                                                                                                                                                                                                                                    |
| P1d | `cursor-inline` 26–29 / 16 / 19–24; `cursor-overlay` 26–29 / 57 / 12–26; `cursor-promoted` 57 / 57–58 / 58–60; `cursor-transform` 56–57 / 58 / 59                                                                                                                                                                                                                                                                                           |
| P1e | the pinch redrawn every frame: `svg` 17–20 / 23–24 / 7–10, `svg-pyramid-int` 22–25 / 22–24 / 9–11, `canvas` 21–22 / 17–19 / 10–11                                                                                                                                                                                                                                                                                                           |
| P1f | `svg-transform` 8–9 / 12 / 7–10: an SVG `transform` with `non-scaling-stroke` repaints; `layer-transform` 55–56 / 13 / 55–56: a CSS transform of a promoted layer does not, except in Firefox                                                                                                                                                                                                                                               |
| P1g | Chromium ×4: `svg-pyramid-int` 22, `canvas` 4.8; the throttle slows the canvas's raster and not SVG's, so the pair compares the throttle, not the renderers                                                                                                                                                                                                                                                                                 |
| P2a | eight series, the whole week: scan 10.6 / 20 / 8 ms; exact pyramid 13.1 / 26 / 16 ms, its output identical to the scan's in every window (`pyramidIdenticalToScan`)                                                                                                                                                                                                                                                                         |
| P2b | the same with the path in whole pixels: 16.7 / 28 / 21 ms; one day: 8.9 / 18 / 13 ms; one hour: 0.5 / 2 / 1 ms                                                                                                                                                                                                                                                                                                                              |
| P2c | building the pyramid of one series: 3.1 / 3 / 3 ms; copying 60,480 objects into two `Float64Array`s: 0.8 / 1 / 1 ms; pairs `[x, y]` for the scan: 13.8 / 32 / 19 ms                                                                                                                                                                                                                                                                         |
| P2d | Node 24, one series, 1,400 px: scan / pyramid 2.3 / 1.9 ms at 43 a column (the pyramid below 64 is the scan), 3.8 / 2.7 at 86, 5.6 / 3.3 at 171, 13 / 5.1 at 429, 42 / 6.5 at 1,429                                                                                                                                                                                                                                                         |
| P3  | (`run1`) `measureText` within 0.016 px of `getComputedTextLength`; reading 200 SVG labels after changing them costs 9.9 / 13 / 21 ms of layout                                                                                                                                                                                                                                                                                              |
| P4  | CSR: three marks, SVG namespace, declaration order, inside the clip group; SSR: the same three inside `<svg>` in the server's HTML; the marks' hosts reach no DOM. Every mark element is written `svg:g`, `svg:path`                                                                                                                                                                                                                        |
| P5  | the three good uses compile; exactly the four bad ones fail (an unknown key, a text column as `y`, a nullable column as `x`, an accessor returning text)                                                                                                                                                                                                                                                                                    |
| P6a | a tap: `pointerdown`/`up` with `pointerType` `touch` in all three; WebKit's synthetic click reports `mouse`                                                                                                                                                                                                                                                                                                                                 |
| P6b | Ctrl + wheel: one `wheel` with `ctrlKey` in all three; the visual viewport's scale stays 1 with a passive listener and a cancelling one alike, headless                                                                                                                                                                                                                                                                                     |
| P6c | Chromium, `touch-action: pan-y`: a horizontal drag delivers 10 `pointermove`s and no cancel; a pinch, two pointer ids, 20 moves                                                                                                                                                                                                                                                                                                             |
| P6d | Chromium, a vertical drag: `pointerdown`, one `pointermove`, `pointercancel`, the page scrolled 251 px; on the control box with `touch-action: auto` the same, 254 px                                                                                                                                                                                                                                                                       |
| P7a | the first consumer's palette: 4 of 8 colours under 3:1 on the light surface, 1 on the dark; closest pair under a deficiency 0.016–0.032 (OKLab), among the first four 0.040–0.091                                                                                                                                                                                                                                                           |
| P7b | the search (seed 31): every colour ≥ 3.12:1 on both surfaces of its theme; closest pair ≥ 0.082 in every vision on the rounded colours, ≥ 0.146 among the first four                                                                                                                                                                                                                                                                        |
| P8  | (`run1`) `role="img"` + `tabindex` and `role="group"` + `tabindex`: `focus-order-semantics`; a slider inside the image: `nested-interactive`; the image beside a slider or beside `<input type="range">`, `role="application"` and a focusable `<svg role="img">`: clean. `focus-order-semantics` reads only `div`, `span`, `p` and headings, so a clean `<svg>` or `application` is a shape the rule does not look at, not one it approved |
