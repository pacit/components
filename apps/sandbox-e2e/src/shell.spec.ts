import { expect, test } from '@playwright/test';
import { visit } from './support/dom';
import { SBX_ROUTES } from './support/views';

/**
 * The sandbox shell and the demo card (`sbx-demo`). Checked in a browser, because
 * the whole thing stands on the cascade of CSS custom properties — jsdom will not
 * say what value a token has in a given subtree (lesson-13).
 */
test.describe('The sandbox shell and the demo card', () => {
  const stage = (testid: string) =>
    `[data-testid="${testid}"] [data-testid="demo-stage"]`;

  test('the navigation switches the view and the document title', async ({
    page,
  }) => {
    await visit(page);
    await expect(page.getByTestId('index-button')).toBeVisible();

    await page.getByTestId('nav-button').click();
    await expect(page).toHaveURL(/\/button$/);
    await expect(page).toHaveTitle(/^Button ·/);
    await expect(page.getByTestId('demo-variants')).toBeVisible();
  });

  /**
   * The route list in `support/views.ts` is a copy of the application's view
   * registry — this test keeps the copy from drifting. Without it a view added in
   * the application but left out of the list would quietly lose its a11y audit.
   */
  test('the navigation matches exactly the route list the tests use', async ({
    page,
  }) => {
    await visit(page);
    const hrefs = await page
      .locator('.shell__nav a')
      .evaluateAll((els) =>
        els.map((el) => new URL((el as HTMLAnchorElement).href).pathname),
      );
    expect(hrefs.sort()).toEqual([...SBX_ROUTES].sort());
  });

  test('the index page links to every view but itself', async ({ page }) => {
    await visit(page);
    const cards = page.locator('.index__card');
    await expect(cards).toHaveCount(SBX_ROUTES.length - 1);
  });

  test('the global theme switch re-themes the shell, not :root', async ({
    page,
  }) => {
    await visit(page, '/button');

    const rootSurface = () =>
      page.evaluate(() =>
        getComputedStyle(document.documentElement)
          .getPropertyValue('--pct-surface')
          .trim(),
      );
    const shellSurface = () =>
      page
        .locator('app-root')
        .evaluate((el) =>
          getComputedStyle(el).getPropertyValue('--pct-surface').trim(),
        );

    expect(await shellSurface()).toBe('#ffffff');

    await page
      .getByTestId('global-controls')
      .getByTestId('control-scheme')
      .getByRole('radio', { name: 'ciemny' })
      .check();

    expect(await shellSurface()).toBe('#0f172a');
    // `:root` zostaje punktem odniesienia — motyw strony to scoped theme.
    expect(await rootSurface()).toBe('#ffffff');
  });

  /**
   * A regression on the `[data-theme="light"]` block: as long as the build emitted
   * dark alone, „light" was nothing but the absence of the attribute, so a light card
   * inside a dark page inherited the dark values with nothing to undo them.
   */
  test('a light card inside a dark page returns to the light values', async ({
    page,
  }) => {
    await visit(page, '/button');
    await page
      .getByTestId('global-controls')
      .getByTestId('control-scheme')
      .getByRole('radio', { name: 'ciemny' })
      .check();

    const surfaceOf = (testid: string) =>
      page
        .locator(stage(testid))
        .evaluate((el) =>
          getComputedStyle(el).getPropertyValue('--pct-surface').trim(),
        );

    expect(await surfaceOf('demo-dark')).toBe('#0f172a');
    expect(await surfaceOf('demo-light')).toBe('#ffffff');

    // The COMPONENT token has to be undone too, not the semantic one alone
    // (the transitive closure of the overrides, req-token-closure).
    const buttonBg = await page
      .locator(`${stage('demo-light')} button[pctButton]`)
      .first()
      .evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(buttonBg).toBe('rgb(37, 99, 235)'); // blue-600 = motyw jasny
  });

  test('a card follows the global axis until it has a setting of its own', async ({
    page,
  }) => {
    await visit(page, '/button');
    const solid = page.getByTestId('btn-solid');

    await expect(solid).toHaveAttribute('data-pct-size', 'md');

    await page
      .getByTestId('global-controls')
      .getByTestId('control-size')
      .getByRole('radio', { name: 'lg' })
      .check();
    await expect(solid).toHaveAttribute('data-pct-size', 'lg');

    // Pasek karty wygrywa z ustawieniem globalnym.
    await page
      .getByTestId('demo-variants')
      .getByTestId('control-size')
      .getByRole('radio', { name: 'sm' })
      .check();
    await expect(solid).toHaveAttribute('data-pct-size', 'sm');

    // A card with a size axis of its own in its content will not let it be changed.
    await expect(
      page.getByTestId('demo-sizes').getByTestId('control-size'),
    ).toHaveCount(0);
  });
});
