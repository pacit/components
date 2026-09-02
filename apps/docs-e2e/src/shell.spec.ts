import AxeBuilder from '@axe-core/playwright';
import { expect, Page, test } from '@playwright/test';
import { visit } from './support/dom';

const WCAG_22_AA = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

/**
 * The scaffold's smoke: the shell renders from the library, the theme policy works end to
 * end, and the page already meets the axe bar it will advertise. Console errors are
 * collected from before navigation — an error at bootstrap is exactly the kind that a
 * later listener never hears.
 */
function watchErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(`${err.name}: ${err.message}`));
  return errors;
}

test.describe('The docs shell', () => {
  test('renders the home page from the library, with a clean console', async ({
    page,
  }) => {
    const errors = watchErrors(page);
    await visit(page, '/');

    await expect(page.locator('h1')).toContainText('prove themselves');
    // The law of site.md, measured: the column, the grid and the CTA are the library's.
    await expect(page.locator('pct-container').first()).toBeVisible();
    await expect(page.locator('pct-grid').first()).toBeVisible();
    await expect(page.getByTestId('cta-hero')).toHaveAttribute(
      'data-pct-variant',
      'hero',
    );

    expect(errors).toEqual([]);
  });

  test('the theme cycle pins the attribute, mirrors it to the root, and lets go', async ({
    page,
  }) => {
    await visit(page, '/');
    const site = page.getByTestId('site');
    const surfaceOf = () =>
      site.evaluate((el) =>
        getComputedStyle(el).getPropertyValue('--pct-surface').trim(),
      );

    await expect(site).not.toHaveAttribute('data-theme', /./);
    const light = await surfaceOf();

    const toggle = page.getByTestId('theme-toggle');
    await toggle.click(); // system -> dark
    await expect(site).toHaveAttribute('data-theme', 'dark');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    expect(await surfaceOf()).not.toBe(light);

    await toggle.click(); // dark -> light
    await expect(site).toHaveAttribute('data-theme', 'light');
    expect(await surfaceOf()).toBe(light);

    await toggle.click(); // light -> system
    await expect(site).not.toHaveAttribute('data-theme', /./);
    await expect(page.locator('html')).not.toHaveAttribute('data-theme', /./);
  });

  test('the stored choice survives a reload — the shell remembers, not the directive', async ({
    page,
  }) => {
    await visit(page, '/');
    await page.getByTestId('theme-toggle').click(); // -> dark
    await page.reload();

    await expect(page.getByTestId('site')).toHaveAttribute(
      'data-theme',
      'dark',
    );
  });

  test('the home page passes the axe bar the site will advertise', async ({
    page,
  }) => {
    await visit(page, '/');
    await expect(page.locator('h1')).toBeVisible();

    const results = await new AxeBuilder({ page })
      .withTags(WCAG_22_AA)
      .analyze();
    expect(results.violations).toEqual([]);
  });
});
