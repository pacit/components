import { expect, test } from '@playwright/test';
import { visit } from './support/dom';

/**
 * The visual baselines (2.1.8): the landing and one component page, light and dark —
 * four pictures. Chromium only, the sandbox's own law: a baseline belongs to one
 * rasteriser, and the other engines are excluded in the config, not skipped here.
 * The infinite drift is no threat to determinism — `toHaveScreenshot` cancels
 * animations to frame zero, the same assertion the button's baselines stand on.
 *
 * Every picture is taken under **reduced motion**, and that is the load-bearing line.
 * What `toHaveScreenshot` can freeze is an animation already running; it cannot decide
 * whether a class an `IntersectionObserver` adds one task later is on the element yet.
 * The landing's evidence strip arrives on exactly such a class, so without this the shot
 * lands on either the arrived frame or the displaced one — 36px of stagger, whichever
 * the machine's load allows (measured 2026-09-04: the baseline recorded at rest, the
 * full suite captured it displaced, both pictures honest). Asking for less motion takes
 * the race out of the picture rather than out of the assertion: the reveal never arms,
 * so the facts are where the page puts them with no script at all — and that state is
 * the one a still can hold. The arrival itself is `landing.spec`'s to prove, and it does.
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
    settled: '.stage--hero > *',
    // The evidence tiles hold the component's own counts — the same law as the landing's
    // strip: the numbers are pages.spec's to check.
    masked: ['[data-testid="evidence"]'],
  },
] as const;

test.describe('Visual baselines', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  for (const { route, name, settled, masked } of SHOTS) {
    for (const theme of ['light', 'dark'] as const) {
      test(`${name} — ${theme}`, async ({ page }) => {
        await visit(page, route, {
          colorScheme: theme,
          reducedMotion: 'reduce',
        });
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
