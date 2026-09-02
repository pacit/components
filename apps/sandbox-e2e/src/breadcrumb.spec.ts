import { expect, test } from '@playwright/test';
import { styleOf } from './support/css';
import { boxOf, visit } from './support/dom';

/**
 * What three engines are asked here is mostly the accessibility TREE, not the DOM: the
 * landmark and the list are read back through roles, and the link names are read exactly —
 * the probe behind 0054 measured that an `aria-hidden` separator pollutes no name, and
 * these readings keep that fact from rotting. The rest is the geometry of the two things
 * the component draws: the separator that hides on the first step, and the wrap that
 * answers a trail too long for its line.
 */
test.describe('PctBreadcrumb — the way here, told in links', () => {
  test.beforeEach(async ({ page }) => {
    await visit(page, '/breadcrumb');
  });

  test('a named landmark holding a counted list of steps', async ({ page }) => {
    const trail = page.getByTestId('trail');
    await expect(trail).toHaveAttribute('role', 'navigation');
    await expect(trail).toHaveAttribute('aria-label', 'Breadcrumb');
    await expect(page.getByTestId('trail-plain')).toHaveAttribute(
      'aria-label',
      'Reports trail',
    );

    await expect(trail.getByRole('list')).toHaveCount(1);
    await expect(trail.getByRole('listitem')).toHaveCount(3);
  });

  test('every link is reachable by its exact name — the separator adds nothing', async ({
    page,
  }) => {
    const trail = page.getByTestId('trail');
    for (const name of ['Home', 'Library', 'Data']) {
      await expect(trail.getByRole('link', { name, exact: true })).toHaveCount(
        1,
      );
    }
  });

  test('the first step announces nothing; every later one draws the quiet chevron', async ({
    page,
  }) => {
    const separators = page
      .getByTestId('trail')
      .locator('[data-pct-part="separator"]');
    await expect(separators).toHaveCount(3);
    await expect(separators.first()).toBeHidden();
    await expect(separators.nth(1)).toBeVisible();
    await expect(separators.nth(2)).toBeVisible();
  });

  test('the current step wears the weight, and only the resting links underline under the pointer', async ({
    page,
  }) => {
    const trail = page.getByTestId('trail');
    const rest = trail.locator('.pct-breadcrumb__link').first();
    const current = trail.locator('[aria-current="page"]');

    expect(await styleOf(current, 'font-weight')).not.toBe(
      await styleOf(rest, 'font-weight'),
    );

    await rest.hover();
    expect(await styleOf(rest, 'text-decoration-line')).toBe('underline');
    await current.hover();
    expect(await styleOf(current, 'text-decoration-line')).toBe('none');
  });

  test('every step is a real tab stop, in reading order', async ({ page }) => {
    const trail = page.getByTestId('trail');
    await trail.getByRole('link', { name: 'Home', exact: true }).focus();
    await page.keyboard.press('Tab');
    await expect(
      trail.getByRole('link', { name: 'Library', exact: true }),
    ).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(
      trail.getByRole('link', { name: 'Data', exact: true }),
    ).toBeFocused();
  });

  test('a trail too long for its line wraps instead of folding', async ({
    page,
  }) => {
    const crumbs = page.getByTestId('trail-wrap').locator('pct-crumb');
    const tops = new Set<number>();
    for (const crumb of await crumbs.all()) {
      tops.add(Math.round((await boxOf(crumb)).y));
    }
    expect(tops.size).toBeGreaterThan(1);
  });
});
