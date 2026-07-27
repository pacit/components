import { defineConfig, devices } from '@playwright/test';
import { nxE2EPreset } from '@nx/playwright/preset';
import { workspaceRoot } from '@nx/devkit';

// For CI, you may want to set BASE_URL to the deployed application.
const baseURL = process.env['BASE_URL'] || 'http://localhost:4200';

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
   * Wzorce odniesienia testów wizualnych. `{platform}` w ścieżce jest istotny:
   * rasteryzacja pisma różni się między systemami, więc jeden zestaw wzorców
   * nie może obsługiwać naraz Linuksa i macOS-a — bez tego rozdziału zrzuty
   * z innej maszyny „naprawiałyby" się nawzajem przy każdym `--update-snapshots`.
   */
  snapshotPathTemplate: '{testDir}/__screenshots__/{platform}/{arg}{ext}',
  expect: {
    toHaveScreenshot: {
      /*
       * Budżet BEZWZGLĘDNY, nie ułamek obrazu — i to celowo.
       *
       * `maxDiffPixelRatio` skaluje się z wielkością zrzutu, czyli daje tym
       * większą pobłażliwość, im większa karta. Pierwsza wersja tej konfiguracji
       * miała `maxDiffPixelRatio: 0.01` i PRZEPUSZCZAŁA zmianę `border-radius`
       * przycisku z 8px na 1px — bramka wyglądała na działającą, a nie łapała
       * regresji, którą miała łapać.
       *
       * Wartość wynika z pomiaru, nie z wyczucia:
       *   - ten sam kod, powtórzony przebieg   ->   0 różniących się pikseli,
       *   - promień przycisku 8px -> 1px       ->  74 różniące się piksele.
       * 20 leży bezpiecznie nad zerem (pojedyncze piksele wygładzania krawędzi
       * nie robią szumu w commitach) i blisko czterokrotnie pod najmniejszą
       * realną regresją, jaką umiałem wywołać.
       */
      maxDiffPixels: 20,
      animations: 'disabled',
      caret: 'hide',
      scale: 'css',
    },
  },
  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'npx nx run sandbox:serve',
    url: 'http://localhost:4200',
    reuseExistingServer: true,
    cwd: workspaceRoot,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    // Uncomment for mobile browsers support
    /* {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    }, */

    // Uncomment for branded browsers
    /* {
      name: 'Microsoft Edge',
      use: { ...devices['Desktop Edge'], channel: 'msedge' },
    },
    {
      name: 'Google Chrome',
      use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    } */
  ],
});
