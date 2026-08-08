import { expect, test } from '@playwright/test';
import { visit } from './support/dom';

/**
 * A scoped theme on any subtree (`data-theme` on a section), independent of the
 * sandbox cards — those are checked by `shell.spec.ts`. What matters here is the
 * cascade itself: the semantic and the component layer have to switch together.
 */
test.describe('A scoped theme — the cascade of CSS custom properties', () => {
  test.beforeEach(async ({ page }) => {
    await visit(page, '/all');
  });

  test('a dark panel has a different surface than :root, and the toggle switches it', async ({
    page,
  }) => {
    const rootSurface = await page.evaluate(() =>
      getComputedStyle(document.documentElement)
        .getPropertyValue('--pct-surface')
        .trim(),
    );
    expect(rootSurface).toBe('#ffffff');

    const panel = page.getByTestId('panel-scoped');
    await expect(panel).toHaveAttribute('data-theme', 'dark');

    const surfaceOf = () =>
      panel.evaluate((el) =>
        getComputedStyle(el).getPropertyValue('--pct-surface').trim(),
      );

    expect(await surfaceOf()).toBe('#0f172a'); // the dark scope overrides down the cascade

    await page.getByTestId('toggle').click();
    await expect(panel).not.toHaveAttribute('data-theme', 'dark');
    expect(await surfaceOf()).toBe('#ffffff'); // back to the page theme
  });

  /**
   * A regression: a scoped theme has to re-theme the COMPONENT tokens as well, not
   * only the semantic ones. Custom properties are substituted where they are
   * declared, so a component token declared in `:root` freezes the light value —
   * which is why the build emits a transitive closure in the theme block (lesson-17).
   */
  test('a scoped theme re-themes the component tokens too', async ({
    page,
  }) => {
    const rootButtonBg = await page.evaluate(() =>
      getComputedStyle(document.documentElement)
        .getPropertyValue('--pct-button-bg')
        .trim(),
    );
    const scopedButtonBg = await page
      .getByTestId('panel-scoped')
      .evaluate((el) =>
        getComputedStyle(el).getPropertyValue('--pct-button-bg').trim(),
      );

    // :root -> primary = blue-600, dark scope -> primary = blue-400. The dark ramp
    // sits HIGHER than the light one (blue-400, not blue-500) since A12: `on-primary`
    // is dark in it, so a hover that darkened the background dropped the label
    // contrast below AA, and the same token is sometimes text on a dark surface too.
    expect(rootButtonBg).toBe('#2563eb');
    expect(scopedButtonBg).toBe('#60a5fa');
    expect(scopedButtonBg).not.toBe(rootButtonBg);
  });
});
