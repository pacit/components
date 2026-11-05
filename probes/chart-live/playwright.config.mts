import { defineConfig, devices } from '@playwright/test';

const SECONDS = Number(process.env['PROBE_SECONDS'] ?? 60);

export default defineConfig({
  testDir: '.',
  testMatch: process.env['PROBE_SPEC'] ?? 'live.spec.mts',
  timeout: (SECONDS * 4 + 120) * 1000,
  workers: 1,
  reporter: 'list',
  use: { baseURL: 'http://localhost:4211', viewport: { width: 1200, height: 800 } },
  webServer: process.env['PROBE_NOSERVER'] ? undefined : {
    command: 'NG_ALLOWED_HOSTS=localhost PORT=4211 node dist/apps/sandbox/server/server.mjs',
    url: 'http://localhost:4211/live-probe',
    reuseExistingServer: false,
    cwd: '../..',
    timeout: 60_000,
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: ['--js-flags=--expose-gc', '--enable-precise-memory-info'],
        },
      },
    },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});
