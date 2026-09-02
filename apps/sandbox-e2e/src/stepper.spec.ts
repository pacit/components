import { expect, test } from '@playwright/test';
import { visit } from './support/dom';

/**
 * What three engines are asked is the map's honesty: the states recompute from one
 * number (the two buttons move a signal and nothing else), `aria-current="step"` stands
 * exactly where that number points, and a done step is AUDIBLE — the check is a drawing,
 * so the listitem's accessible name has to carry the word, with the application's label
 * first (0055).
 */
test.describe('PctStepper — a map of a journey the application steers', () => {
  test.beforeEach(async ({ page }) => {
    await visit(page, '/stepper');
  });

  test('a counted list with the current step named by the number', async ({
    page,
  }) => {
    const journey = page.getByTestId('journey');
    await expect(journey).toHaveAttribute('role', 'list');
    await expect(journey).toHaveAttribute('aria-label', 'Checkout');
    await expect(journey.getByRole('listitem')).toHaveCount(4);

    const current = journey.locator('[aria-current="step"]');
    await expect(current).toHaveCount(1);
    await expect(current).toContainText('Delivery');
  });

  test('a done step is audible with the application’s word first', async ({
    page,
  }) => {
    // A `listitem` computes no accessible NAME from its contents — a reader reads the
    // content itself — so the reading here is the text a reader walks: the label, then
    // the suffix, and the drawings contributing nothing (the done marker holds only the
    // hidden check, which is why no ordinal appears before "Cart").
    const done = page
      .getByTestId('journey')
      .getByRole('listitem')
      .filter({ hasText: 'Cart' });
    expect(
      await done.evaluate((el) =>
        (el.textContent ?? '').replace(/\s+/g, ' ').trim(),
      ),
    ).toBe('Cart Completed');

    const upcoming = page
      .getByTestId('journey')
      .getByRole('listitem')
      .filter({ hasText: 'Payment' });
    expect(await upcoming.evaluate((el) => el.textContent ?? '')).not.toContain(
      'Completed',
    );
  });

  test('the check marks what is behind, the ordinals what is not', async ({
    page,
  }) => {
    const markers = page
      .getByTestId('journey')
      .locator('[data-pct-part="marker"]');
    await expect(markers.first().locator('svg')).toBeVisible();
    await expect(markers.nth(1)).toHaveText('2');
    await expect(markers.nth(3)).toHaveText('4');
  });

  test('one number moves and the whole map follows', async ({ page }) => {
    const journey = page.getByTestId('journey');
    await page.getByTestId('next').click();

    await expect(journey.locator('[aria-current="step"]')).toContainText(
      'Payment',
    );
    await expect(
      journey.getByRole('listitem').filter({ hasText: 'Delivery' }),
    ).toHaveAttribute('data-pct-state', 'done');
    await expect(
      journey.locator('[data-pct-part="marker"]').nth(1).locator('svg'),
    ).toBeVisible();
  });

  test('past the end and before the start, nobody stands on the map', async ({
    page,
  }) => {
    for (const [id, state] of [
      ['journey-done', 'done'],
      ['journey-ahead', 'upcoming'],
    ] as const) {
      const journey = page.getByTestId(id);
      await expect(journey.locator('[aria-current]')).toHaveCount(0);
      await expect(journey.locator(`[data-pct-state="${state}"]`)).toHaveCount(
        3,
      );
    }
  });

  test('the first step draws no connector; every later one does', async ({
    page,
  }) => {
    const tracks = page
      .getByTestId('journey')
      .locator('[data-pct-part="track"]');
    await expect(tracks).toHaveCount(4);
    await expect(tracks.first()).toBeHidden();
    await expect(tracks.nth(1)).toBeVisible();
  });
});
