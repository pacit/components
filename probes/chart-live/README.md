# Live data under `follow` — the probes behind 0121

Never merged: the decision record cites this branch's commit.

## What runs

- `apps/sandbox/src/app/views/live-probe/live-probe-view.ts` (route `/live-probe`): eight
  `pct-line`s of 60 000 readings a second apart, ending now, under `follow`, in a 900×400
  chart. `?mode=set` appends a reading to every series ten times a second — the consumer's
  way: `rows => [...rows.slice(1), row]` — and records the time to build the arrays (`build`)
  and from the `set` to Angular's next render (`render`); `?mode=idle` appends nothing.
  `?span=` is the window in seconds: 600 (ten minutes) or 60000 (the whole series).
- `live.spec.mts`: sixty seconds a mode, a span and an engine; every row of the JSONL carries
  the condition it was read under. Frames are the gaps between `requestAnimationFrame`
  callbacks; the heap is Chromium's `performance.memory` with `--js-flags=--expose-gc`.
- `profile.spec.mts`: five seconds of `mode=set` under Chromium's CPU profiler; `map.cjs`
  names the minified functions by their source.
- `bench.mts`, `bench2.mts` (tsx, Node 24): the reading of one series and the decimation with
  and without the pyramid, by the readings in the window.
- `easing.spec.mts`: whether `KeyframeEffect.getComputedTiming().progress` is eased.

The sandbox is the production build (`nx run sandbox:build:production`) served by its own
SSR server on port 4211 (`NG_ALLOWED_HOSTS=localhost`).

```bash
scripts/heavy bash -c 'PROBE_SPAN=600 PROBE_MODES=idle,set npx playwright test --config probes/chart-live/playwright.config.mts'
```

## Read on 2026-11-05

Playwright 1.63 (chromium 153, firefox 155, webkit 26.6), this desk, one heavy run at a time.

`result-before.jsonl` is main at 87f5e84c; `result-after.jsonl` the change of 0121. Per tick
(eight series, one reading each), p50 / p95 of `render`, frames over 50 ms in sixty seconds,
and the share of the time the main thread spent on the ticks:

| engine   | window  | before          | after          | long frames | busy        |
| -------- | ------- | --------------- | -------------- | ----------- | ----------- |
| chromium | 10 min  | 59 / 66 ms      | 11 / 13 ms     | 115 → 0     | 61% → 15%   |
| firefox  | 10 min  | 54 / 81 ms      | 13 / 15 ms     | 451 → 9     | 67% → 40%   |
| webkit   | 10 min  | 32 / 73 ms      | 9 / 12 ms      | 45 → 1      | 38% → 13%   |
| chromium | whole   | 63 / 73 ms      | 54 / 62 ms     | 117 → 42    | 66% → 57%   |
| firefox  | whole   | 71 / 103 ms     | 50 / 55 ms     | 564 → 398   | 83% → 59%   |
| webkit   | whole   | 71 / 125 ms     | 66 / 129 ms    | 544 → 547   | 75% → 70%   |

The profile before the change (Chromium, ten minutes, five seconds): reading the rows into
columns 1.30 s plus 0.47 s in the accessor, the pyramid 0.95 s, the consumer's copy 0.14 s —
nearly all of the time. After: the identity check of the rows 0.25 s, the consumer's copy
0.20 s, the rest under 0.05 s each (`profile-after-mapped.txt`, both spans).

Node, one series of 60 000: `pctColumnsOf` 3.7 ms, `pctPyramid` 2.5 ms, the copy 1.5 ms.
Decimation across 860 px, scan / pyramid: 600 readings 0.15 / 0.08 ms, 16 000 0.80 / 0.78 ms,
60 000 2.50 / 1.47 ms; the extent, scan / pyramid, 16 000 0.41 / 0.007 ms, 60 000 1.79 /
0.016 ms.

Eased progress at 600 ms of 1000 under `steps(2, end)`: 0.5 in all three engines.
