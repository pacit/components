import { defineConfig, devices } from '@playwright/test';

// Probes for the data-table decisions (0097, 0098). Static pages built in the page, no dev
// server: each probe writes JSONL rows with the condition it ran under.
export default defineConfig({
  testDir: import.meta.dirname,
  testMatch: /probes\.spec\.mts$/,
  timeout: 600_000,
  workers: 1,
  fullyParallel: false,
  reporter: [['list']],
  use: { locale: 'en-US', viewport: { width: 1280, height: 800 } },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 800 },
        launchOptions: { args: ['--enable-experimental-web-platform-features', '--enable-precise-memory-info'] },
      },
    },
    { name: 'firefox', use: { ...devices['Desktop Firefox'], viewport: { width: 1280, height: 800 } } },
    { name: 'webkit', use: { ...devices['Desktop Safari'], viewport: { width: 1280, height: 800 } } },
  ],
});
