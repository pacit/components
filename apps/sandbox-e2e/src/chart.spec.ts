import { expect, test, type Locator } from '@playwright/test';
import { visit } from './support/dom';

/**
 * What only a browser can show about a chart: the size it measures with a `ResizeObserver`,
 * the label widths it measures with a canvas, the geometry of what it draws, and the tree a
 * reader is given. The sandbox's first chart is the day Warsaw moves its clocks back, so the
 * time axis is measured on a day of twenty-five hours.
 */
test.describe('PctChart — a scene of scales and the marks drawn on them', () => {
  test.beforeEach(async ({ page }) => {
    await visit(page, '/chart');
  });

  const chart = (page: import('@playwright/test').Page, id: string) =>
    page.getByTestId(id);
  const xOf = (el: Locator) => el.evaluate((e) => Number(e.getAttribute('x')));

  test('the drawing is a picture named by the chart, described, its layers hidden', async ({
    page,
  }) => {
    const pattern = chart(page, 'chart-pattern');
    const picture = pattern.getByRole('img', {
      name: 'Heat recovery on 25 October 2026',
    });
    await expect(picture).toHaveCount(1);
    await expect(picture).toHaveAccessibleDescription(
      /Supply air between 17\.3 and 22\.7 °C/,
    );
    for (const svg of await pattern.locator('svg').all()) {
      await expect(svg).toHaveAttribute('aria-hidden', 'true');
    }
  });

  test('each unit takes an axis, the first left, the second right, the yes/no outside', async ({
    page,
  }) => {
    const pattern = chart(page, 'chart-pattern');
    await expect(pattern.locator('[data-pct-unit="°C"]')).toHaveAttribute(
      'data-pct-slot',
      'left',
    );
    await expect(pattern.locator('[data-pct-unit="W"]')).toHaveAttribute(
      'data-pct-slot',
      'right',
    );
    await expect(pattern.locator('[data-pct-unit="boolean"]')).toHaveAttribute(
      'data-pct-slot',
      'left-outer',
    );
    await expect(
      pattern.locator('[data-pct-unit="boolean"] .value'),
    ).toHaveText(['Off', 'On']);
    // the outer axis stands left of the inner one
    const inner = await pattern
      .locator('[data-pct-unit="°C"] .base')
      .evaluate((e) => Number(e.getAttribute('x1')));
    const outer = await pattern
      .locator('[data-pct-unit="boolean"] .base')
      .evaluate((e) => Number(e.getAttribute('x1')));
    expect(outer).toBeLessThan(inner);
  });

  test('the time axis ticks the wall clock of Warsaw on the day of twenty-five hours', async ({
    page,
  }) => {
    const pattern = chart(page, 'chart-pattern');
    const labels = pattern.locator('[data-pct-part="axis"] .time');
    const texts = await labels.allTextContents();
    expect(texts[0]).toBe('25/10');
    expect(texts.at(-1)).toBe('26/10');
    for (const hour of ['06:00', '12:00', '18:00'])
      expect(texts).toContain(hour);
    // every label but a date is a whole hour of the wall clock
    for (const text of texts) expect(text).toMatch(/^(\d\d:00|\d\d\/\d\d)$/);
    const xOfLabel = async (text: string) =>
      xOf(labels.filter({ hasText: text }).first());
    const midnight = await pattern
      .locator('[data-pct-part="axis"] .tick')
      .first()
      .evaluate((e) => Number(e.getAttribute('x1')));
    const six = await xOfLabel('06:00');
    const noon = await xOfLabel('12:00');
    const evening = await xOfLabel('18:00');
    // midnight to 06:00 is seven hours on this day and 06:00 to noon six: the clocks went back at 03:00
    expect((six - midnight) / (noon - six)).toBeCloseTo(7 / 6, 1);
    expect((evening - noon) / (noon - six)).toBeCloseTo(1, 1);
  });

  test('every series is a path in its palette place, and the hour with no readings a gap', async ({
    page,
  }) => {
    const pattern = chart(page, 'chart-pattern');
    const paths = pattern.locator('path[data-pct-part="series"]');
    await expect(paths).toHaveCount(3);
    expect(
      await paths.evaluateAll((ps) =>
        ps.map((p) => p.getAttribute('data-pct-series')),
      ),
    ).toEqual(['1', '2', '3']);
    const supply = await paths.first().getAttribute('d');
    expect(supply?.match(/M/g)).toHaveLength(2);
    // the palette's colours, from the tokens
    const stroke = await paths
      .first()
      .evaluate((p) => getComputedStyle(p).stroke);
    const token = await page.evaluate(() =>
      getComputedStyle(document.documentElement)
        .getPropertyValue('--pct-chart-series-color-1')
        .trim(),
    );
    expect(token).not.toBe('');
    expect(stroke).not.toBe('none');
  });

  test('sixty thousand readings draw as a few thousand points', async ({
    page,
  }) => {
    const dense = chart(page, 'chart-dense');
    const d = await dense
      .locator('path[data-pct-part="series"]')
      .getAttribute('d');
    const points = (d?.match(/[ML]/g) ?? []).length;
    const width = await dense.evaluate((e) => e.getBoundingClientRect().width);
    expect(points).toBeGreaterThan(100);
    expect(points).toBeLessThanOrEqual(4 * width + 2);
  });

  test('a narrower chart draws narrower, from its own size', async ({
    page,
  }) => {
    const area = chart(page, 'chart-area');
    const before = await area
      .locator('[data-pct-part="axis"] .base')
      .first()
      .evaluate((e) => Number(e.getAttribute('x2')));
    await area.evaluate((e) => ((e as HTMLElement).style.inlineSize = '320px'));
    await expect
      .poll(() =>
        area
          .locator('[data-pct-part="axis"] .base')
          .first()
          .evaluate((e) => Number(e.getAttribute('x2'))),
      )
      .toBeLessThan(before);
  });

  test('an area fills to zero, on the axis the view holds from 0 to 30', async ({
    page,
  }) => {
    const area = chart(page, 'chart-area');
    await expect(area.locator('path[data-pct-part="area"]')).toHaveCount(1);
    await expect(
      area.locator('[data-pct-unit="°C"] .value').first(),
    ).toHaveText('0');
    await expect(area.locator('[data-pct-unit="°C"] .value').last()).toHaveText(
      '30',
    );
  });

  test('numbers along the horizontal axis tick 1-2-5', async ({ page }) => {
    const linear = chart(page, 'chart-linear');
    const labels = await linear
      .locator('[data-pct-part="axis"] .time')
      .allTextContents();
    expect(labels[0]).toBe('0');
    expect(labels).toContain('20');
  });

  test('a chart with nothing to draw says so, and a loading one is busy behind a skeleton', async ({
    page,
  }) => {
    await expect(
      chart(page, 'chart-empty').locator('[data-pct-part="message"]'),
    ).toHaveText('No data to show');
    const loading = chart(page, 'chart-loading');
    await expect(loading).toHaveAttribute('aria-busy', 'true');
    await expect(loading.locator('pct-skeleton')).toHaveCount(1);
    await expect(loading.locator('[data-pct-part="data"]')).toHaveCount(0);
  });

  test('the data stand beside the picture as a table, captioned by the chart', async ({
    page,
  }) => {
    const table = page.getByRole('table', {
      name: 'Heat recovery on 25 October 2026',
    });
    await expect(table).toHaveCount(1);
    await expect(table.getByRole('columnheader')).toHaveText([
      'Time',
      'Supply air (°C)',
      'Fan power (W)',
      'Heater',
    ]);
    const rows = table.locator('tbody tr');
    expect(await rows.count()).toBeLessThanOrEqual(24);
    await expect(rows.first().getByRole('rowheader')).toHaveText(
      '25/10/2026, 00:00:00',
    );
    await expect(rows.first().getByRole('cell')).toHaveText([
      '17.7',
      '380',
      'Off',
    ]);
  });

  test('a label near the edge stands inside the box', async ({ page }) => {
    const area = chart(page, 'chart-area');
    const width = await area.evaluate((e) => e.getBoundingClientRect().width);
    for (const label of await area
      .locator('[data-pct-part="axis"] .time')
      .all()) {
      // A DOMRect does not cross `evaluate`: its numbers are copied out.
      const box = await label.evaluate((e) => {
        const b = (e as SVGGraphicsElement).getBBox();
        return { x: b.x, width: b.width };
      });
      expect(box.x).toBeGreaterThanOrEqual(-0.5);
      expect(box.x + box.width).toBeLessThanOrEqual(width + 0.5);
    }
    expect(
      await xOf(area.locator('[data-pct-part="axis"] .time').last()),
    ).toBeLessThan(width);
  });
});
