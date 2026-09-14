import { defineConfig, devices } from '@playwright/test';
import { screenReaderConfig } from '@guidepup/playwright';

/**
 * The assistive-technology pass, on the two readers no Linux box can run. It is a
 * configuration of its own and NOT a project of `playwright.config.mts`, for one reason: a
 * screen reader cannot drive a headless browser, and these specs hang without a reader
 * attached. Under the `e2e` target they would be twenty minutes of a runner waiting for
 * something that is never going to speak.
 *
 * Measured rather than hoped for: `@guidepup/playwright` throws `No available supported
 * screen readers` at IMPORT on Linux, so even `--list` refuses here. That is the guard —
 * these specs cannot end up quietly hanging inside the `e2e` target, they refuse first.
 *
 * One spec per reader — `apps/sandbox-e2e/at/nvda.spec.ts` and
 * `apps/sandbox-e2e/at/voiceover.spec.ts` — because the fixture that starts a reader is
 * chosen at import and cannot be swapped at run time; both walk the same
 * `apps/sandbox-e2e/at/walk.ts`.
 *
 * The pairs are not a preference — they are what `docs/acr/claims.json` declares and what
 * Guidepup supports: NVDA with Firefox on Windows, VoiceOver with Safari on macOS. One
 * worker, no retries: two readers cannot speak over each other, and a retried view would
 * append a second reading of itself to the record.
 */
const baseURL = process.env['BASE_URL'] || 'http://localhost:4200';

export default defineConfig({
  // The reader's own requirements come from the reader's own package — one worker, nothing
  // parallel, nothing headless — rather than from this file remembering them.
  ...screenReaderConfig,
  testDir: './at',
  timeout: 30 * 60 * 1000,
  retries: 0,
  reporter: [['list']],
  use: { ...screenReaderConfig.use, baseURL },
  webServer: {
    command: 'npx nx run sandbox:serve',
    url: 'http://localhost:4200',
    reuseExistingServer: true,
    timeout: 240 * 1000,
  },
  projects: [
    {
      name: 'nvda-firefox',
      testMatch: ['**/nvda.spec.ts'],
      use: { ...devices['Desktop Firefox'], headless: false },
    },
    {
      name: 'voiceover-safari',
      testMatch: ['**/voiceover.spec.ts'],
      use: { ...devices['Desktop Safari'], headless: false },
    },
  ],
});
