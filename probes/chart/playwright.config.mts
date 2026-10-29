import { defineConfig, devices } from '@playwright/test';

// Probes for the chart decisions (plan-charts, phase 0). Static pages built in the page, no dev
// server: each probe writes JSONL rows with the condition it ran under.
export default defineConfig({
  testDir: import.meta.dirname,
  testMatch: /probes\.spec\.mts$/,
  timeout: 600_000,
  workers: 1,
  fullyParallel: false,
  reporter: [['list']],
  use: { locale: 'en-US', viewport: { width: 1600, height: 900 } },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1600, height: 900 },
        deviceScaleFactor: 1,
        launchOptions: { args: ['--enable-experimental-web-platform-features', '--enable-precise-memory-info'] },
      },
    },
    { name: 'firefox', use: { ...devices['Desktop Firefox'], viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 } },
    { name: 'webkit', use: { ...devices['Desktop Safari'], viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 } },
  ],
});
