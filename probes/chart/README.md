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

## The probes

- **P1** a pinch: eight series of 60,480 readings (a week at one per ten seconds) in a plot
  1,400 px wide, the window narrowing from the week to an hour and back over three seconds,
  each frame drawn by one of: `svg` (a scan of the window), `svg-pyramid` (a min/max pyramid),
  `svg-pyramid-2` (two readings a column), `svg-pyramid-int` (whole-pixel path),
  `svg-transform` (paths drawn once, the group moved), `canvas`; and the baselines `idle`
  (nothing drawn), `svg-static` (paths still, one label changing), `cursor-inline`,
  `cursor-overlay`, `cursor-promoted`, `cursor-transform` (paths still, a cursor crossing them
  in the same `<svg>`, in a second one, in a second one with `will-change`, as an HTML line
  moved by `transform`). Chromium also under a 4× CPU throttle.
- **P2** decimation alone, per frame of eight series: a scan, the pyramid, the path string;
  the pyramid's cost to build; the copy of a consumer's objects into typed arrays.
- **P3** label widths: `measureText` against `getComputedTextLength` and `getBBox`.
- **P4** (`svg-template.probe.spec.ts`) a mark's SVG in an `<ng-template>`, stamped into one
  `<svg>` by `NgTemplateOutlet`, in the browser's DOM and in the server's HTML.
- **P5** (`types/`) whether the template compiler infers a mark's `T` from `[data]` and holds
  `x` and `y` to keys of the right type.
- **P6** pointer and touch: a tap, Ctrl + wheel (passive and cancelled), and in Chromium a
  horizontal drag, a vertical drag and a two-finger pinch through the DevTools protocol.
- **P7** (`palette.mjs`, `palette-search.mjs`) the series palette: contrast on both surfaces
  of each theme, and the closest pair seen with normal vision and three deficiencies.
- **P8** the focus stop's accessibility shapes under axe 4.13, with every tag including
  `best-practice` and `experimental`.

## Runs, 2026-10-29

The desk was shared: another session's Gradle build ran through runs 2–4, and the load average
on each row says how much. The headless engines rasterise in software, so frame rates rank
the strategies and do not predict a GPU.

- `run1/` P1 (six modes), P2, P3, P6, P8 — the first full run
- `run2/` P1 with the baselines and the whole-pixel path, P2 with the whole-pixel path
- `run3/` P1, the cursor inline and on a second `<svg>`
- `run4/` P1, the cursor on a promoted layer and as a transformed HTML line

## Readings

| id  | reading                                                                                                                                                            |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| P1a | `idle` 59–62 fps in every engine: the frame clock is healthy                                                                                                        |
| P1b | `svg-static` 30–44 fps Chromium, 17–23 Firefox, 18–27 WebKit: one changed label repaints every path of its `<svg>`                                                  |
| P1c | `cursor-inline` 6–16 / 10–11 / 2–14 fps; `cursor-transform` 51–56 (37–44 throttled) / 57 / 44–46 fps; `cursor-promoted` 48–55 / 57 / 25–39                           |
| P1d | `cursor-overlay` without promotion 10–23 fps Chromium and 9–12 WebKit (one paint layer), 54–57 Firefox                                                               |
| P1e | the pinch redrawn every frame: 10–21 fps Chromium and Firefox, 3–9 WebKit, in every SVG mode and in `canvas`; `canvas` 3.5–4 fps in Chromium throttled 4×            |
| P1f | `svg-transform` 3–7 fps everywhere: a `non-scaling-stroke` group under a changing transform is the slowest mode measured                                           |
| P2a | a scan of the whole week, eight series: 13.7 ms V8, 21 ms SpiderMonkey, 8 ms JSC; the pyramid 2.7 / 8 / 3 ms; the extremes of every window identical (`extremesExact`) |
| P2b | the path string after the pyramid: 11.8 / 12 / 11 ms at one decimal, 6.9 / 12 / 7 ms in whole pixels with repeats dropped                                           |
| P2c | building the pyramid of one series: 2.1 / 3 / 3 ms; copying 60,480 objects into two `Float64Array`s: 0.7 / 1 / 2 ms                                                 |
| P2d | pairs `[x, y]` instead of typed arrays: 14.7 / 30 / 18 ms for the week scan                                                                                        |
| P3  | `measureText` within 0.016 px of `getComputedTextLength` in every engine; reading the SVG after a text change costs 9.9 / 13 / 21 ms of layout for 200 labels       |
| P4  | CSR: three marks, SVG namespace, declaration order, inside the clip group; SSR: the same three inside `<svg>` in the server's HTML; the marks' hosts reach no DOM      |
| P5  | the three good uses compile; exactly the four bad ones fail (an unknown key, a string column as `y`, a nullable column as `x`, an accessor returning a string)      |
| P6a | a tap: `pointerdown`/`up` with `pointerType` `touch` in all three; WebKit's synthetic click reports `mouse`                                                          |
| P6b | Ctrl + wheel: one `wheel` with `ctrlKey` in all three; the visual viewport's scale stays 1 with a passive listener and a cancelling one alike, headless               |
| P6c | Chromium, `touch-action: pan-y`: a horizontal drag delivers 10 `pointermove`s; a vertical one delivers no pointer event and scrolls the page 377 px; a pinch, two ids |
| P7a | the first consumer's palette: 4 of 8 colours under 3:1 on the light surface, 1 on the dark; closest pair under a deficiency ΔOK 0.016–0.032                          |
| P7b | the search (seed 31): every colour ≥ 3.12:1 on both surfaces of its theme; closest pair ≥ 0.083 in every vision, ≥ 0.146 among the first four                       |
| P8  | `role="img"` + `tabindex` and `role="group"` + `tabindex`: `focus-order-semantics`; a slider inside the image: `nested-interactive`; the image beside a slider or beside `<input type="range">`: clean in three engines |
