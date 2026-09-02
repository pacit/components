import { defineConfig, devices } from '@playwright/test';
import { nxE2EPreset } from '@nx/playwright/preset';
import { workspaceRoot } from '@nx/devkit';

const baseURL = process.env['BASE_URL'] || 'http://localhost:4300';

/**
 * The docs site's suite — the sandbox-e2e configuration's younger sibling, and smaller on
 * purpose: the sandbox is the library's rig, this one watches the shop window. Same three
 * engines from day one (`req-quality-browsers` is the library's law, and the site claims
 * the library's standards on its own pages); the visual-comparison budgets arrive with
 * the first baseline (2.1.8), not before there is a picture to hold.
 */
export default defineConfig({
  ...nxE2EPreset(import.meta.dirname, { testDir: './src' }),
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  snapshotPathTemplate: '{testDir}/__screenshots__/{platform}/{arg}{ext}',
  webServer: {
    command: 'npx nx run docs:serve',
    url: 'http://localhost:4300',
    reuseExistingServer: true,
    cwd: workspaceRoot,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});
