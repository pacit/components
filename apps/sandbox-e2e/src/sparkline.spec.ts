import { expect, test } from '@playwright/test';
import { visit } from './support/dom';

/**
 * A sparkline is a picture and nothing else: an image named by its row and described by its
 * lowest, highest and last value, which only a browser computes from the references — and a
 * drawing stretched to its box with a line that keeps its width and dots that stay round,
 * which only a layout engine can measure
 * ([0116](../../../docs/decisions/0116-a-sparkline-is-a-picture-with-no-scene.md)).
 */
test.describe('PctSparkline — one series drawn small', () => {
  test.beforeEach(async ({ page }) => {
    await visit(page, '/sparkline');
  });

  test('a line in each row is an image named by the row and described by its values, no stop for the keyboard', async ({
    page,
  }) => {
    const table = page.getByTestId('spark-table');
    const hall = table.getByRole('img', { name: 'Hall' });
    await expect(hall).toHaveAccessibleDescription(
      '1.1 kWh – 2.2 kWh, last 1.7 kWh',
    );
    await expect(
      table.getByRole('img', { name: 'Attic' }),
    ).toHaveAccessibleDescription('0.4 kWh – 1.3 kWh, last 0.7 kWh');
    await expect(table.getByRole('img')).toHaveCount(3);
    // the attic missed an hour: its line is two runs
    const attic = page.getByTestId('spark-attic');
    const line = (await attic
      .locator('[data-pct-part="line"]')
      .getAttribute('d'))!;
    expect(line.match(/M /g)).toHaveLength(2);
    await expect(attic.locator('[data-pct-part="area"]')).toHaveCount(1);
    // nothing in it is a stop for the keyboard
    expect(
      await hall.evaluate((el) =>
        [el, ...el.querySelectorAll('*')].some(
          (e) => (e as HTMLElement).tabIndex >= 0,
        ),
      ),
    ).toBe(false);
  });

  test('the drawing fills its box of a word, the line keeps its width and the dot stays round', async ({
    page,
  }) => {
    const hall = page.getByTestId('spark-hall');
    const box = (await hall.boundingBox())!;
    const em = await hall.evaluate((el) =>
      parseFloat(getComputedStyle(el).fontSize),
    );
    expect(box.width).toBeCloseTo(6 * em, 0);
    expect(box.height).toBeCloseTo(em, 0);
    const picture = (await hall
      .locator('[data-pct-part="picture"]')
      .boundingBox())!;
    expect(picture.width).toBeCloseTo(box.width, 0);
    expect(picture.height).toBeCloseTo(box.height, 0);
    expect(
      await hall
        .locator('[data-pct-part="line"]')
        .evaluate((el) => getComputedStyle(el).strokeWidth),
    ).toBe('1.5px');
    const dot = (await hall.locator('[data-pct-part="dot"]').boundingBox())!;
    expect(dot.width).toBeGreaterThan(0);
    expect(dot.width).toBeCloseTo(dot.height, 1);
    // the last value stands at the right edge
    expect(dot.x + dot.width / 2).toBeCloseTo(box.x + box.width, 0);
  });

  test('a new hour moves every line and its words', async ({ page }) => {
    const hall = page.getByTestId('spark-hall');
    const before = await hall
      .locator('[data-pct-part="line"]')
      .getAttribute('d');
    await page.getByTestId('spark-tick').click();
    await expect(hall.locator('[data-pct-part="line"]')).not.toHaveAttribute(
      'd',
      before!,
    );
    await expect(
      page.getByTestId('spark-table').getByRole('img', { name: 'Hall' }),
    ).not.toHaveAccessibleDescription('1.1 kWh – 2.2 kWh, last 1.7 kWh');
  });

  test('bars rise from nought and hang below it, a band fills its on-slots, and a sparkline with no value says so', async ({
    page,
  }) => {
    const bars = page.getByTestId('spark-bars');
    await expect(bars.locator('[data-pct-part="bar"]')).toHaveCount(7);
    await expect(bars.locator('[data-pct-part="dot"]')).toHaveCount(3);
    await expect(
      page.getByRole('img', { name: 'Balance this week' }),
    ).toHaveAccessibleDescription('-2 kWh – 5 kWh, last 1 kWh');
    const band = page.getByTestId('spark-band');
    await expect(band.locator('[data-pct-part="slot"]')).toHaveCount(10);
    await expect(
      band.locator('[data-pct-part="slot"][data-pct-on]'),
    ).toHaveCount(6);
    await expect(band.locator('[data-pct-part="dot"]')).toHaveCount(0);
    await expect(
      page.getByRole('img', { name: 'Heater' }),
    ).toHaveAccessibleDescription('last On');
    const empty = page.getByTestId('spark-empty');
    await expect(empty.locator('[data-pct-part="line"]')).toHaveCount(0);
    await expect(
      page.getByRole('img', { name: 'New meter' }),
    ).toHaveAccessibleDescription('No data');
  });
});
