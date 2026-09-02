import { expect, test } from '@playwright/test';
import { visit } from './support/dom';

/**
 * The visual baselines (2.1.8): the landing and one component page, light and dark —
 * four pictures. Chromium only, the sandbox's own law: a baseline belongs to one
 * rasteriser, and the other engines are excluded in the config, not skipped here.
 * The infinite drift is no threat to determinism — `toHaveScreenshot` cancels
 * animations to frame zero, the same assertion the button's baselines stand on.
 */
// Each picture names what "settled" means for it: the component page's demo arrives
// through a lazy chunk, and under full-suite load it can land BETWEEN two capture
// attempts — which reads as "never stable". The wait is data, not an if in the test.
const SHOTS = [
  { route: '/', name: 'landing', settled: 'h1' },
  {
    route: '/components/button',
    name: 'component-button',
    settled: '.panel__stage > *',
  },
] as const;

test.describe('Visual baselines', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  for (const { route, name, settled } of SHOTS) {
    for (const theme of ['light', 'dark'] as const) {
      test(`${name} — ${theme}`, async ({ page }) => {
        await visit(page, route, { colorScheme: theme });
        await expect(page.locator(settled).first()).toBeVisible();
        // The viewport, not `fullPage` — the sandbox's own idiom: a stitched full-page
        // capture scrolls while it shoots, and under full-suite load the stitcher never
        // saw two identical frames (measured here: three shots red on contention alone).
        await expect(page).toHaveScreenshot(`${name}-${theme}.png`);
      });
    }
  }
});
