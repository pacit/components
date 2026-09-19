import { defineConfig, devices } from '@playwright/test';
import { nxE2EPreset } from '@nx/playwright/preset';
import { workspaceRoot } from '@nx/devkit';

// The server this configuration starts, named once. `webServer.url` and the argument handed
// to `scripts/serve-for-e2e` have to be the same server — a port moved in one of two literals
// leaves the heartbeat knocking on a door nobody opened, and it would report that for the
// whole suite without ever being wrong about anything else.
const serverURL = 'http://localhost:4200';

// For CI, you may want to set BASE_URL to the deployed application. Separate from the above
// on purpose: that points the SUITE somewhere, and a deployed app is not this block's to start.
const baseURL = process.env['BASE_URL'] || serverURL;

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// import 'dotenv/config';

/**
 * See https://playwright.dev/docs/test-configuration.
 *
 * Generated as a .mts file so Node forces ESM regardless of workspace
 * `type`. Playwright routes `.mts` through its ESM loader (dynamic import,
 * bypassing the pirates CJS-compile path), and Nx's native TS strip loads
 * `.mts` directly. Playwright's configLoader auto-discovers
 * `playwright.config.mts` via its extension list
 * (.ts/.js/.mts/.mjs/.cts/.cjs).
 */
export default defineConfig({
  ...nxE2EPreset(import.meta.dirname, { testDir: './src' }),
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    baseURL,
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
  },
  /*
   * The reference baselines of the visual tests. `{platform}` in the path matters:
   * type rasterises differently across systems, so one set of baselines cannot
   * serve Linux and macOS at once — without that split, screenshots from another
   * machine would "fix" each other on every `--update-snapshots`.
   */
  snapshotPathTemplate: '{testDir}/__screenshots__/{platform}/{arg}{ext}',
  expect: {
    toHaveScreenshot: {
      /*
       * An ABSOLUTE budget, not a fraction of the image — and that is deliberate.
       *
       * `maxDiffPixelRatio` scales with the size of the screenshot, so it is the
       * more forgiving the larger the card. The first version of this configuration
       * had `maxDiffPixelRatio: 0.01` and LET THROUGH a change of the button
       * `border-radius` from 8px to 1px — the gate looked like it worked and did not
       * catch the regression it was there to catch.
       *
       * The value comes from a measurement, not from a feel:
       *   - the same code, a repeated run     ->   0 differing pixels,
       *   - button radius 8px -> 1px          ->  74 differing pixels.
       * 20 stands safely above zero (single anti-aliasing pixels make no noise in
       * commits) and nearly four times below the smallest real regression I managed
       * to provoke.
       */
      maxDiffPixels: 20,
      /*
       * The per-pixel COLOUR SIMILARITY threshold — without it the budget above
       * counts pixels nobody counted.
       *
       * The default `threshold: 0.2` means "a colour difference below 0.2 in
       * pixelmatch's YIQ metric is not a difference". Measured, not assumed:
       *   - ramp step blue-500 -> blue-400    ->  0.0163,
       *   - ramp step blue-500 -> blue-600    ->  0.0101,
       *   - slate-900 -> slate-800            ->  0.0042.
       * So REPAINTING A WHOLE BUTTON by one step of the ramp gave zero differing
       * pixels and a green run — found when a change to `--pct-primary` in
       * the dark theme moved not a single baseline, although the screenshot after it
       * has 2155 pixels in the new colour instead of 2145 in the old. The gate looked
       * like it worked and did not catch the regression it was there to catch — the
       * same defect as `maxDiffPixelRatio` above, on the colour axis instead of the
       * pixel-count one.
       *
       * 0.005 stands below the smallest measured ramp step (0.0042 for the slate pair
       * is the only value lower — two neighbouring background greys are
       * indistinguishable and this gate does not promise otherwise) and well above
       * the anti-aliasing noise, which the budget of 20 pixels absorbs anyway.
       */
      threshold: 0.005,
      animations: 'disabled',
      caret: 'hide',
      scale: 'css',
    },
  },
  /*
   * The dev server is Playwright's to start and to stop. The Nx Playwright plugin reads this
   * command and would make `sandbox:serve` a continuous dependency of the `e2e` target, so
   * that nx starts it first and kills it last — and on the runners a run that ended on this
   * suite ended without nx's summary and with exit code 0, red tasks included (plan 4.72,
   * lesson-222). `project.json` sets that dependency to nothing; this block is the only
   * thing that starts the server. The timeout is for a cold runner, where the first build
   * of the sandbox is the slow part; a running server is reused, which is also what lets a
   * developer's own `nx serve sandbox` carry a suite — and serve it a bundle older than the
   * sources, so a suite that contradicts a reading is first a question about the server.
   *
   * `stdout: 'pipe'` restores a stream this block used to discard. Playwright's default for
   * it is `'ignore'`, and the nx header, the whole `Building…` and the bundle table all go
   * there; stderr carries the project-graph warnings inside the first seconds and then
   * nothing until the server is up. The two shards that timed out on run 35408508618 printed
   * none of those warnings — 47 of them from this server on a shard of the same run that
   * passed, zero on theirs — and that says more than the reading first taken off it: the
   * stall was BEFORE nx read the workspace out, not in the build, so a larger ceiling was
   * never the answer. What the discarded stream cost is the line that separates "nx never
   * got going" from "nx got going and its task never did", which is the header and is all a
   * stall reproduced on a desk ever printed. The price is volume: this server's share of a
   * shard's log went from 49 lines to 128, two thirds of the new ones being the bundle table.
   *
   * `scripts/serve-for-e2e` adds the thing no stream can carry, a line while nothing is
   * printed; `lesson-231` holds the measurements. It also puts this command out of reach of
   * the Nx Playwright plugin's parser, and that is not nothing: the plugin sets
   * `parallelism: false` on a target whose web server it cannot resolve, so nx runs this
   * suite alone now. On the runners nothing moves — `docs-e2e` already forced that, its
   * server being unreusable — and on a desk it costs this suite's overlap with lint and
   * build, which is the trade 0081 makes anyway: the cases that fail a first attempt and
   * pass a retry react to load, so the machine to itself is what the suite wants.
   */
  webServer: {
    command: `scripts/serve-for-e2e sandbox:serve ${serverURL}`,
    url: serverURL,
    reuseExistingServer: true,
    stdout: 'pipe',
    timeout: 240_000,
    cwd: workspaceRoot,
  },
  /*
   * The browser matrix (req-quality-browsers).
   *
   * Three engines, not three brands: blink, gecko, webkit. `Desktop Edge` and
   * `Google Chrome` are the same blink in another wrapper — a fourth project would
   * cost CI time and answer no new question.
   *
   * The same list stands a second time in `browsers.policy.json`, and that is a
   * deliberate repetition, not an oversight. `tools/check-browsers.mjs` does not read
   * this file — it asks Playwright what it REALLY collected — and compares the answer
   * with the policy. An engine dropped from here then diverges from the policy and
   * the gate fires; to quiet it down you have to strike the engine out in two places
   * at once, which leaves a sentence in the diff that a reviewer sees.
   *
   * The `testIgnore` patterns are written here with directory stars, although it is
   * measured that the bare file name works the same — for a spec in a subdirectory
   * too. The reason for the form is a different one: a pattern that matches nothing
   * is NOT an error for Playwright, just a project collecting the full set. So a typo
   * in this list is caught only by `check-browsers` (point 3), comparing the
   * collected files with the policy — and that is the only thing that catches it.
   */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      /*
       * The visual screenshots stay on chromium: the baselines in
       * `__screenshots__/linux/` came from its rasteriser, and every other engine
       * diverges from them because of the machine, not the code (measured: 26 of 26
       * baselines differ on firefox). A third set of baselines per engine is three
       * times the attention on every deliberate change of appearance and no new
       * questions — a layout regression is caught by the geometry tests, which run
       * here in full.
       */
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
      testIgnore: ['**/visual.spec.ts'],
    },
    {
      /*
       * `forced-colors.spec.ts` joins the baselines here — and that exclusion comes
       * from a MEASUREMENT, not from convenience. Playwright's webkit reports
       * `matchMedia('(forced-colors: active)').matches === true` and substitutes none
       * of the author's colours: a probe with a `rgb(1, 2, 3)` background comes out
       * of it unchanged, while chromium and firefox return the white from the user
       * palette. `forced-color-adjust` is not even a known property in it. The whole
       * file would therefore ask about behaviour this engine does not have — and four
       * of its six tests would pass, measuring colours from tokens.
       *
       * The fact is policed, not recorded: point 6 of `check-browsers` repeats that
       * probe on every run, so the day webkit implements it is the day the gate
       * orders the exclusion taken off.
       */
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
      testIgnore: ['**/visual.spec.ts', '**/forced-colors.spec.ts'],
    },
  ],
});
