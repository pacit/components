import { expect, test } from '@playwright/test';
import { visit } from './support/dom';

/**
 * What only a browser can answer about an application's frame: the landmarks the platform
 * gives the consumer's `<header>` and `<nav>` and what they hold; the navigation in a column at
 * a wide window and in a drawer at a narrow one, moved by the view and not by the library; the
 * current screen marked by more than a colour; a title cut to an ellipsis on one row; and a
 * description list read as terms and their values, wrapping a value under its term.
 */
test.describe('An application’s frame — topbar, nav, description list', () => {
  test.describe('at a wide window', () => {
    test.use({ viewport: { width: 1280, height: 900 } });

    test.beforeEach(async ({ page }) => {
      await visit(page, '/frame');
    });

    test('the navigation stands at the side, a list of four screens in a named landmark', async ({
      page,
    }) => {
      const nav = page.getByRole('navigation', { name: 'Screens' });
      await expect(nav).toHaveCount(1);
      await expect(page.getByTestId('side').getByTestId('nav')).toBeVisible();
      await expect(page.getByTestId('menu')).toHaveCount(0);
      const list = nav.getByRole('list');
      await expect(list).toHaveCount(1);
      await expect(list.getByRole('listitem')).toHaveCount(4);
      await expect(nav.getByRole('link')).toHaveText([
        'Rooms',
        'Devices',
        'Energy',
        'Settings',
      ]);
    });

    test('the current screen carries aria-current, a weight and a bar at its start edge', async ({
      page,
    }) => {
      const current = page.getByTestId('link-devices');
      const other = page.getByTestId('link-rooms');
      await expect(current).toHaveAttribute('aria-current', 'page');
      await expect(other).not.toHaveAttribute('aria-current', /.*/);

      const weight = (el: typeof current) =>
        el.evaluate((a) => Number(getComputedStyle(a).fontWeight));
      expect(await weight(current)).toBeGreaterThan(await weight(other));

      const bar = (el: typeof current) =>
        el.evaluate((a) => {
          const after = getComputedStyle(a, '::before');
          return { content: after.content, width: after.width };
        });
      expect(await bar(current)).toEqual({ content: '""', width: '3px' });
      expect((await bar(other)).content).toBe('none');

      // The bar stands at the start edge: flush with the link's left in a left-to-right page.
      const box = (await current.boundingBox())!;
      const left = await current.evaluate(
        (a) =>
          a.getBoundingClientRect().left +
          parseFloat(getComputedStyle(a, '::before').left),
      );
      expect(left).toBeCloseTo(box.x, 0);
    });

    test('a link chosen becomes the current one, and the title follows', async ({
      page,
    }) => {
      await page.getByTestId('link-energy').click();
      await expect(page.getByTestId('link-energy')).toHaveAttribute(
        'aria-current',
        'page',
      );
      await expect(page.getByTestId('link-devices')).not.toHaveAttribute(
        'aria-current',
        /.*/,
      );
      await expect(page.getByTestId('title')).toHaveText('Energy');
    });

    test('Tab walks the bar in its reading order, then the navigation', async ({
      page,
    }) => {
      // Wide, the bar's one control is its end: the title and the user's name are text.
      await page.getByTestId('sign-out').focus();
      await page.keyboard.press('Tab');
      await expect(page.getByTestId('link-rooms')).toBeFocused();
      await page.keyboard.press('Tab');
      await expect(page.getByTestId('link-devices')).toBeFocused();
      await page.keyboard.press('Tab');
      await expect(page.getByTestId('link-energy')).toBeFocused();
      await page.keyboard.press('Enter');
      await expect(page.getByTestId('title')).toHaveText('Energy');
      await expect(page.getByTestId('link-energy')).toHaveAttribute(
        'aria-current',
        'page',
      );
    });

    test('a narrowing takes the column away and hands the keyboard to the menu button', async ({
      page,
    }) => {
      await page.getByTestId('link-rooms').focus();
      await page.setViewportSize({ width: 600, height: 900 });
      await expect(page.getByTestId('side')).toHaveCount(0);
      await expect(page.getByTestId('menu')).toBeFocused();
    });

    test('the bar holds the start, the title and the end on one row, the end at the end', async ({
      page,
    }) => {
      const bar = (await page.getByTestId('topbar').boundingBox())!;
      const title = (await page.getByTestId('title').boundingBox())!;
      const out = (await page.getByTestId('sign-out').boundingBox())!;
      // Centred on the bar's axis, to the rounding of a half pixel the engines differ by.
      const axis = bar.y + bar.height / 2;
      expect(Math.abs(title.y + title.height / 2 - axis)).toBeLessThan(1);
      expect(Math.abs(out.y + out.height / 2 - axis)).toBeLessThan(1);
      expect(bar.x + bar.width - (out.x + out.width)).toBeCloseTo(16, 0);
      expect(bar.height).toBeGreaterThanOrEqual(56);
      await expect(
        page.getByTestId('topbar').locator('[data-pct-part="start"]'),
      ).toBeHidden();
    });

    test('a title longer than its bar ends in an ellipsis and stays whole for a reader', async ({
      page,
    }) => {
      const title = page.getByTestId('title-long');
      const cut = await title.evaluate((h) => ({
        overflow: h.scrollWidth > h.clientWidth,
        ellipsis: getComputedStyle(h).textOverflow,
      }));
      expect(cut).toEqual({ overflow: true, ellipsis: 'ellipsis' });
      await expect(
        page.getByRole('heading', {
          name: 'Heat pump in the utility room, second floor',
        }),
      ).toHaveCount(1);
      const edit = (await page
        .getByTestId('topbar-long')
        .getByRole('button')
        .boundingBox())!;
      expect(edit.width).toBeGreaterThan(24);
    });

    test('a description list is terms and their values, and a control named by its term', async ({
      page,
    }) => {
      const list = page.getByTestId('properties');
      await expect(list.getByRole('term')).toHaveText([
        'Supply temperature',
        'Mode',
        'Heating',
      ]);
      await expect(list.getByRole('definition').first()).toHaveText('21.4 °C');
      const control = list.getByRole('switch');
      await expect(control).toHaveAccessibleName('Heating');
      await control.click();
      await expect(list.getByRole('definition').nth(2)).toHaveText('Off');

      // A wide row: the term and its value on one line, the values of the rows in one column.
      const terms = await list
        .getByRole('term')
        .evaluateAll((els) => els.map((e) => e.getBoundingClientRect().top));
      const values = list.locator('[data-pct-part="value"]');
      const tops = await values.evaluateAll((els) =>
        els.map((e) => e.getBoundingClientRect()),
      );
      for (const [i, r] of tops.entries())
        expect(Math.abs(r.top - terms[i])).toBeLessThan(r.height);
      for (const r of tops.slice(1))
        expect(r.left).toBeCloseTo(tops[0].left, 0);
    });

    test('a row narrower than the term and the value’s floor wraps the value under its term', async ({
      page,
    }) => {
      const pair = page
        .getByTestId('properties-narrow')
        .locator('[pctDescription]')
        .first();
      // 320px holds a 12rem term beside an 8rem value floor only with no gap: it does not.
      const term = (await pair.locator('dt').boundingBox())!;
      const value = (await pair.locator('dd').first().boundingBox())!;
      expect(value.y).toBeGreaterThanOrEqual(term.y + term.height - 1);
      expect(value.x).toBeCloseTo(term.x, 0);
    });
  });

  test.describe('at a narrow window', () => {
    test.use({ viewport: { width: 600, height: 900 } });

    test.beforeEach(async ({ page }) => {
      await visit(page, '/frame');
    });

    test('the view moves the navigation into the drawer, and the bar opens it', async ({
      page,
    }) => {
      await expect(page.getByTestId('side')).toHaveCount(0);
      const menu = page.getByTestId('menu');
      await expect(menu).toHaveAttribute('aria-expanded', 'false');
      // One navigation still, now inside the drawer's region.
      await expect(page.getByTestId('nav')).toHaveCount(1);
      await expect(page.getByTestId('drawer').getByTestId('nav')).toHaveCount(
        1,
      );

      await menu.click();
      await expect(menu).toHaveAttribute('aria-expanded', 'true');
      const nav = page.getByRole('navigation', { name: 'Screens' });
      await expect(nav.getByRole('link', { name: 'Energy' })).toBeVisible();
    });

    test('a screen chosen in the drawer shuts it and gives the keyboard back to the bar', async ({
      page,
    }) => {
      const menu = page.getByTestId('menu');
      await menu.click();
      const energy = page.getByTestId('link-energy');
      await expect(energy).toBeVisible();
      await energy.focus();
      await expect(energy).toBeFocused();
      await page.keyboard.press('Enter');
      await expect(page.getByTestId('title')).toHaveText('Energy');
      await expect(menu).toHaveAttribute('aria-expanded', 'false');
      await expect(menu).toBeFocused();
    });

    test('Tab walks the bar from its start to its end', async ({ page }) => {
      await page.getByTestId('menu').focus();
      await page.keyboard.press('Tab');
      await expect(page.getByTestId('sign-out')).toBeFocused();
    });

    test('a widening with the drawer open shuts it, and the keyboard follows the navigation', async ({
      page,
    }) => {
      const menu = page.getByTestId('menu');
      await menu.click();
      // The drawer shows its panel at the render after the click, and a hidden link takes no
      // focus: the link is focused once it is on the screen.
      await expect(page.getByTestId('link-rooms')).toBeVisible();
      await page.getByTestId('link-rooms').focus();
      await expect(page.getByTestId('link-rooms')).toBeFocused();
      await page.setViewportSize({ width: 1280, height: 900 });
      await expect(page.getByTestId('side').getByTestId('nav')).toBeVisible();
      await expect(page.getByTestId('menu')).toHaveCount(0);
      await expect(page.getByTestId('drawer')).not.toHaveAttribute(
        'data-pct-open',
        /.*/,
      );
      // The keyboard follows the navigation to the column, onto the current screen.
      await expect(page.getByTestId('link-devices')).toBeFocused();
    });

    test('the start of the bar holds the button, before the title', async ({
      page,
    }) => {
      const menu = (await page.getByTestId('menu').boundingBox())!;
      const title = (await page.getByTestId('title').boundingBox())!;
      expect(menu.x + menu.width).toBeLessThanOrEqual(title.x);
    });
  });
});
