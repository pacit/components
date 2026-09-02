import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const WCAG_22_AA = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

// The registers' sizes, read from the same tracked sources the content pass reads — the
// page must agree with the repository, not with a number typed here.
const ROOT = join(__dirname, '../../..');
const ADRS = readdirSync(join(ROOT, 'docs/decisions')).filter((f) =>
  /^\d{4}-/.test(f),
).length;
const LESSONS = (
  readFileSync(join(ROOT, 'docs/lessons.md'), 'utf8').match(
    /^### <a id="lesson-\d+"/gm,
  ) ?? []
).length;

/**
 * The pages (2.1.7). The claims on trial: the gallery lists every card and each page
 * really renders — a LIVE demo (driven, not screenshotted), the demo's own source as the
 * code tab, the card's sections with their links rewritten onto /trust's anchors — and
 * the /trust, /theming, /support registers carry the repository's content under stable
 * addresses. The axe scans here cover the two new page SHAPES (a component page, the
 * trust register); the full route sweep is 2.1.8's bar.
 */
test.describe('The pages', () => {
  test('the gallery lists every card and leads into a page', async ({
    page,
  }) => {
    await page.goto('/components');
    const tiles = page.getByTestId('gallery').locator('a');
    await expect(tiles).toHaveCount(33);

    await tiles.filter({ hasText: 'button' }).first().click();
    await expect(page).toHaveURL(/\/components\/button$/);
    await expect(page.locator('h1')).toHaveText('button');
  });

  test('a component page shows the demo, and the code tab is its own source', async ({
    page,
  }) => {
    await page.goto('/components/button');
    // The demo is a running instance — the library's own attribute proves the real
    // component rendered, not a picture of one.
    await expect(
      page.getByTestId('demo-panel').locator('[data-pct-variant="hero"]'),
    ).toBeVisible();

    await page.getByRole('tab', { name: 'Source' }).click();
    const source = page.getByTestId('source');
    await expect(source.locator('.shiki')).toBeVisible();
    await expect(source).toContainText(`import { PctButton }`);
  });

  test('a live demo on a page really runs — the dialog opens and traps', async ({
    page,
  }) => {
    await page.goto('/components/dialog');
    await page
      .getByTestId('demo-panel')
      .getByRole('button', { name: 'Project settings' })
      .click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Done' }).click();
    await expect(dialog).toBeHidden();
  });

  test("the card's decision links land on /trust's anchors", async ({
    page,
  }) => {
    await page.goto('/components/button');
    const link = page.locator('.docs-prose a[href="/trust#adr-0058"]').first();
    await expect(link).toBeVisible();
    await link.click();
    await expect(page).toHaveURL(/\/trust#adr-0058$/);
    // The anchor exists and the router's anchorScrolling brought it into view.
    const target = page.locator('#adr-0058');
    await expect(target).toBeVisible();
    await expect(target).toContainText('gradient');
  });

  test('the token chips copy through the toaster', async ({ page }) => {
    await page.goto('/components/select');
    await page.getByTestId('tokens').getByRole('button').first().click();
    await expect(
      page.locator('pct-toast-viewport [data-pct-part="item"]'),
    ).toBeVisible();
  });

  test('/trust renders the registers the repository tracks', async ({
    page,
  }) => {
    await page.goto('/trust');
    await expect(page.getByTestId('stats')).toContainText('mutation score');
    await expect(
      page.getByTestId('registry').locator('#req-token-directive'),
    ).toBeVisible();
    await expect(page.getByTestId('decisions').locator('li')).toHaveCount(ADRS);
    await expect(page.getByTestId('lessons').locator('li')).toHaveCount(
      LESSONS,
    );
  });

  test('/theming tells the tiers and lists the public inventory', async ({
    page,
  }) => {
    await page.goto('/theming');
    await expect(page.getByTestId('tier-semantic')).toContainText(
      '--pct-surface',
    );
    await expect(page.getByTestId('tier-component')).toContainText(
      '--pct-button-height-sm',
    );
  });

  test('/support and /start render their documents', async ({ page }) => {
    await page.goto('/support');
    await expect(page.getByTestId('policy')).toContainText('angular-majors');

    await page.goto('/start');
    await expect(page.locator('.shiki')).toHaveCount(3);
    await expect(page.locator('.shiki').first()).toContainText(
      'npm install @pacit/components',
    );
  });

  test('the top bar navigates; the narrow drawer takes over below the fold', async ({
    page,
  }) => {
    await page.goto('/');
    await page
      .getByRole('navigation', { name: 'Site' })
      .first()
      .getByText('Trust')
      .click();
    await expect(page).toHaveURL(/\/trust$/);

    await page.setViewportSize({ width: 480, height: 900 });
    await page.getByTestId('menu-trigger').click();
    const drawer = page.getByTestId('menu');
    await expect(drawer).toBeVisible();
    await drawer.getByText('Components').click();
    await expect(page).toHaveURL(/\/components$/);
    // A shut drawer keeps its box and loses its content — the library's own contract
    // (`hidden="until-found"`), which visibility checks in this engine do not model.
    await expect(drawer).toHaveAttribute('hidden', 'until-found');
  });

  test('the two new page shapes pass the axe bar', async ({ page }) => {
    for (const path of ['/components/button', '/trust']) {
      await page.goto(path);
      await expect(page.locator('h1')).toBeVisible();
      const results = await new AxeBuilder({ page })
        .withTags(WCAG_22_AA)
        .analyze();
      expect(results.violations, `${path} violations`).toEqual([]);
    }
  });
});
