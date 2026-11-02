import { expect, test } from '@playwright/test';
import { visit } from './support/dom';

/**
 * What only a browser can answer about a card: the row of a grid stretches the cards to one
 * height and the footers stand on one line; the card that is one link answers a press anywhere
 * on it as its link, while the controls standing over the link answer on their own — a
 * hit-test no unit suite can run; and the keyboard meets one link and then the controls.
 */
test.describe('PctCard — a header, a body and a footer', () => {
  test.beforeEach(async ({ page }) => {
    await visit(page, '/card');
  });

  test('the cards of a row stand at one height, and their footers on one line', async ({
    page,
  }) => {
    const ids = ['card-short', 'card-long', 'card-plain'];
    const cards = await Promise.all(
      ids.map((id) => page.getByTestId(id).boundingBox()),
    );
    const feet = await Promise.all(
      ids.map((id) =>
        page.getByTestId(id).locator('[data-pct-part="note"]').boundingBox(),
      ),
    );
    for (const box of cards.slice(1)) {
      expect(box!.y).toBeCloseTo(cards[0]!.y, 0);
      expect(box!.height).toBeCloseTo(cards[0]!.height, 0);
    }
    for (const foot of feet.slice(1))
      expect(foot!.y).toBeCloseTo(feet[0]!.y, 0);
  });

  test('a region nothing was projected into takes no room', async ({
    page,
  }) => {
    const plain = page.getByTestId('card-plain');
    await expect(plain.locator('[data-pct-part="icon"]')).toBeHidden();
    await expect(plain.locator('[data-pct-part="actions"]')).toBeHidden();
    await expect(
      plain.locator('[data-pct-part="footer-actions"]'),
    ).toBeHidden();
    await expect(plain.locator('[data-pct-part="note"]')).toBeVisible();
  });

  test('a card that is one link is one link, named by its title', async ({
    page,
  }) => {
    const card = page.getByTestId('card-link');
    await expect(card.getByRole('link')).toHaveCount(1);
    await expect(card.getByRole('link')).toHaveAccessibleName('Heat pump');
    await expect(card.getByRole('heading', { name: 'Heat pump' })).toHaveCount(
      1,
    );
  });

  test('a press anywhere on the card follows its link', async ({ page }) => {
    await page.getByTestId('link-body').scrollIntoViewIfNeeded();
    const body = (await page.getByTestId('link-body').boundingBox())!;
    await page.mouse.click(body.x + 10, body.y + body.height / 2);
    await expect(page).toHaveURL(/#card-details$/);
  });

  test('the switch in the body and the button in the footer answer on their own', async ({
    page,
  }) => {
    const toggle = page.getByTestId('link-switch').getByRole('switch');
    await page.getByTestId('card-link').scrollIntoViewIfNeeded();
    const before = await toggle.getAttribute('aria-checked');
    const box = (await toggle.boundingBox())!;
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await expect(toggle).not.toHaveAttribute('aria-checked', before ?? '');

    const rename = (await page.getByTestId('link-rename').boundingBox())!;
    await page.mouse.click(
      rename.x + rename.width / 2,
      rename.y + rename.height / 2,
    );
    await expect(page.getByTestId('card-link')).toContainText(
      'Renamed 1 times',
    );
    await expect(page).not.toHaveURL(/#card-details$/);
  });

  test('the keyboard meets the link, then the controls, and Enter follows the link', async ({
    page,
  }) => {
    const link = page.getByTestId('link');
    await link.focus();
    // The ring is the link's pseudo-element over the card, so the card's box is what it rings.
    const ring = await link.evaluate(
      (a) => getComputedStyle(a, '::after').outlineStyle,
    );
    expect(ring).toBe('solid');
    await page.keyboard.press('Tab');
    await expect(
      page.getByTestId('link-switch').getByRole('switch'),
    ).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByTestId('link-rename')).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(
      page.getByTestId('link-switch').getByRole('switch'),
    ).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(link).toBeFocused();
    await link.focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/#card-details$/);
  });

  test('loading draws the skeleton and marks the card busy, until the content arrives', async ({
    page,
  }) => {
    const card = page.getByTestId('card-loading');
    await expect(card).toHaveAttribute('aria-busy', 'true');
    await expect(card.locator('pct-skeleton')).toHaveCount(1);
    await page.getByTestId('toggle-loading').click();
    await expect(card).not.toHaveAttribute('aria-busy', /.*/);
    await expect(card).toContainText('21.4 °C');
  });

  test('an error draws its message in place of the body', async ({ page }) => {
    const card = page.getByTestId('card-error');
    await expect(card.locator('[data-pct-part="message"]')).toHaveText(
      'The device did not answer the last three reads.',
    );
    await expect(card).not.toContainText('3.2 kW');
    await expect(card.locator('[data-pct-part="note"]')).toHaveText(
      'Last answer 14:02',
    );
  });

  test('a muted card is repainted, not faded, and its switch still answers', async ({
    page,
  }) => {
    const card = page.getByTestId('card-muted');
    expect(await card.evaluate((el) => getComputedStyle(el).opacity)).toBe('1');
    const muted = await card.evaluate(
      (el) => getComputedStyle(el).backgroundColor,
    );
    const plain = await page
      .getByTestId('card-plain')
      .evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(muted).not.toBe(plain);
    const toggle = card.getByRole('switch');
    const before = await toggle.getAttribute('aria-checked');
    await toggle.click();
    await expect(toggle).not.toHaveAttribute('aria-checked', before ?? '');
  });
});
