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
//
// `masked` lists the regions the picture must NOT hold: the landing bakes the
// repository's counts into its prose by design, so any new lesson or mutation run
// repaints a digit and a frozen picture turns red on truth (measured: lesson-143 did
// exactly that to CI, one glyph of diff). The numbers are landing.spec's job, read
// from the same tracked files the build reads; the baseline watches the frame.
const SHOTS = [
  {
    route: '/',
    name: 'landing',
    settled: 'h1',
    masked: ['[data-testid="machinery"]', '[data-testid="fact-contrast"]'],
  },
  {
    route: '/components/button',
    name: 'component-button',
    settled: '.panel__stage > *',
    masked: [],
  },
] as const;

test.describe('Visual baselines', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  for (const { route, name, settled, masked } of SHOTS) {
    for (const theme of ['light', 'dark'] as const) {
      test(`${name} — ${theme}`, async ({ page }) => {
        await visit(page, route, { colorScheme: theme });
        await expect(page.locator(settled).first()).toBeVisible();
        // The viewport, not `fullPage` — the sandbox's own idiom: a stitched full-page
        // capture scrolls while it shoots, and under full-suite load the stitcher never
        // saw two identical frames (measured here: three shots red on contention alone).
        await expect(page).toHaveScreenshot(`${name}-${theme}.png`, {
          mask: masked.map((selector) => page.locator(selector)),
        });
      });
    }
  }
});
