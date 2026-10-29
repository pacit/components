# table-window — the probes behind 0098 (and 0097's axe evidence)

A static page (`page.html` + `page.js`) driven by `probes.spec.mts` in three engines, from the
repository root:

    PROBE_OUT=run PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=1 scripts/heavy npx playwright test --config probes/table-window/playwright.config.mts

- P1 the bare table, 500 to 50,000 rows of eight cells
- P2 where the skipped rows' space lives: pseudo rows, `<tr>` spacers, a transform; automatic
  and fixed layout; `vary` widens one column's text down the list
- P3 a details row taller than its estimate, the scroll correction, rows of fractional height,
  renders with no scroll, a drawn row that grows later
- P4 axe on the structures 0097 promises
- P5 the tallest scroller

Three runs on 2026-10-29, each a JSONL per engine with the condition on every row:

- `run1/` the first full run — P1, P4 are read from it; its P2 had no widening text, its P5
  set `scrollTop = 1e12`, which WebKit reads as 0, and its P3 rows were whole pixels
- `run2/` P2 with `vary`, P5 setting `scrollTop` to `scrollHeight` and to half the height
- `run3/` P2 with the row count of Chromium's accessibility tree, P3 with fractional rows,
  idle renders and a late change

`python3 summarise.py run1` prints a run.
