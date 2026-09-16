import { defineConfig, devices } from '@playwright/test';

/**
 * The Orca pass, and a configuration of its own for one reason: `at.config.mts` imports
 * `@guidepup/playwright`, which throws `No available supported screen readers` at IMPORT on
 * Linux. The two files therefore cannot be one, and that refusal is a guard rather than an
 * inconvenience — it is what stops the Windows and macOS specs from quietly hanging here.
 *
 * Everything else is the Orca pass's own requirements, and every one of them was measured:
 * Firefox headed, because a screen reader cannot read a headless browser; the accessibility
 * tree forced on with `accessibility.force_disabled: 0`, because Firefox switches it off when
 * nothing has asked; one worker and no retries, because a reader cannot speak over itself and
 * a retried view would append a second reading of itself to the record.
 *
 * NO `webServer` HERE. `tools/at-pass.sh` checks that something is already serving and says
 * so if not: this run happens inside `dbus-run-session` on an Xvfb display, and a dev server
 * started from in there would inherit both and outlive neither cleanly.
 */
const baseURL = process.env['BASE_URL'] || 'http://localhost:4200';

export default defineConfig({
  testDir: './at',
  testMatch: ['**/orca.spec.ts'],
  // A full pass is thirty-six views at nine seconds a load — twenty-five minutes measured,
  // and this is the ceiling for a reader that stopped answering, not a budget for a slow one.
  timeout: 60 * 60 * 1000,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    ...devices['Desktop Firefox'],
    baseURL,
    headless: false,
    viewport: { width: 1280, height: 900 },
    launchOptions: { firefoxUserPrefs: { 'accessibility.force_disabled': 0 } },
  },
  projects: [{ name: 'orca-firefox' }],
});
