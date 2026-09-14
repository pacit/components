import { defineConfig, devices } from '@playwright/test';
import { nxE2EPreset } from '@nx/playwright/preset';
import { workspaceRoot } from '@nx/devkit';

const baseURL = process.env['BASE_URL'] || 'http://localhost:4300';

/**
 * The docs site's suite — the sandbox-e2e configuration's younger sibling, and smaller on
 * purpose: the sandbox is the library's rig, this one watches the shop window. Same three
 * engines from day one (`req-quality-browsers` is the library's law, and the site claims
 * the library's standards on its own pages); the visual-comparison budgets arrive with
 * the first baseline (site.md "The bar the site itself meets"), not before there is a
 * picture to hold.
 */
export default defineConfig({
  ...nxE2EPreset(import.meta.dirname, { testDir: './src' }),
  use: {
    baseURL,
    /* `on-first-retry` traced nothing here: the Nx preset sets `retries` to 2 in CI and 0
       everywhere else, so a local flake was never retried and so never traced — which is why
       the one red run left a bare call log and no artifact to read (lesson-184). */
    trace: 'retain-on-failure',
  },
  snapshotPathTemplate: '{testDir}/__screenshots__/{platform}/{arg}{ext}',
  /*
    The server is this suite's own, and it is the configuration with the reload channels shut
    (`docs:serve:e2e`). A dev server pushes a full page reload to every client it has, and a
    page a test is standing in is one of them; the two senders and what shuts each are
    recorded on the target itself.

    `reuseExistingServer` is false for the same reason and not out of tidiness: with it true,
    any `docs:serve` a person left listening on 4300 is attached to instead — the reload
    channels open, and possibly a stale view of `src/generated` besides (lesson-154). A port
    already in use now stops the suite rather than quietly changing what it tests.
  */
  webServer: {
    command: 'npx nx run docs:serve:e2e',
    url: 'http://localhost:4300',
    reuseExistingServer: false,
    cwd: workspaceRoot,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    {
      /* The baselines stay on chromium — the sandbox's own measured law (its config
         records the numbers): another engine diverges from a chromium-rasterised
         picture because of the machine, not the code. */
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
      testIgnore: ['**/visual.spec.ts'],
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
      testIgnore: ['**/visual.spec.ts'],
    },
  ],
});
