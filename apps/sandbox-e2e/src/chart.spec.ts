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

  test.describe('the cursor', () => {
    const NAME = 'Heat recovery on 25 October 2026';
    const rangeOf = (page: import('@playwright/test').Page) =>
      page.getByRole('slider', { name: NAME });
    const text = (range: Locator) => range.getAttribute('aria-valuetext');

    test("the cursor is the chart's one stop, a range named by the chart", async ({
      page,
    }) => {
      const range = rangeOf(page);
      await expect(range).toHaveCount(1);
      await expect(range).toHaveAttribute(
        'aria-valuetext',
        'No reading selected',
      );
      await expect(range).toHaveAccessibleDescription(
        /Arrow keys move from reading to reading/,
      );
      // the picture is no stop: Tab from the stop before lands on the range
      await range.focus();
      await page.keyboard.press('Shift+Tab');
      await expect(range).not.toBeFocused();
      await page.keyboard.press('Tab');
      await expect(range).toBeFocused();
      await expect(
        chart(page, 'chart-pattern').getByRole('img', { name: NAME }),
      ).not.toHaveAttribute('tabindex', /.*/);
    });

    test('the arrows walk the cursor from reading to reading, Home and End go to the ends', async ({
      page,
    }) => {
      const range = rangeOf(page);
      await range.focus();
      await page.keyboard.press('ArrowRight');
      await expect
        .poll(() => text(range))
        .toMatch(/^25 Oct 2026, 00:00: Supply air /);
      await page.keyboard.press('ArrowRight');
      await expect.poll(() => text(range)).toMatch(/^25 Oct 2026, 00:10: /);
      await page.keyboard.press('ArrowUp');
      await expect.poll(() => text(range)).toMatch(/^25 Oct 2026, 00:20: /);
      await page.keyboard.press('ArrowLeft');
      await expect.poll(() => text(range)).toMatch(/^25 Oct 2026, 00:10: /);
      await page.keyboard.press('ArrowDown');
      await expect.poll(() => text(range)).toMatch(/^25 Oct 2026, 00:00: /);
      await page.keyboard.press('End');
      await expect.poll(() => text(range)).toMatch(/^26 Oct 2026, 00:00: /);
      await page.keyboard.press('Home');
      await expect
        .poll(() => text(range))
        .toMatch(
          /^25 Oct 2026, 00:00: Supply air [\d.]+ °C, Fan power 380 W, Heater Off$/,
        );
      // the line stands where the reading is, and its value is the range's
      await expect(
        chart(page, 'chart-pattern').locator('[data-pct-part="cursor"]'),
      ).toHaveCount(1);
      await expect(
        chart(page, 'chart-pattern').locator('[data-pct-part="marker"]'),
      ).toHaveCount(3);
    });

    test('Page Up and Page Down move a tenth of the window', async ({
      page,
    }) => {
      const range = rangeOf(page);
      await range.focus();
      await page.keyboard.press('Home');
      await page.keyboard.press('PageUp');
      // a tenth of twenty-five hours is two and a half
      await expect.poll(() => text(range)).toMatch(/^25 Oct 2026, 02:30: /);
      await page.keyboard.press('PageDown');
      await expect.poll(() => text(range)).toMatch(/^25 Oct 2026, 00:00: /);
    });

    test('Escape and Delete clear the cursor, and Escape passes on when there is none', async ({
      page,
    }) => {
      const range = rangeOf(page);
      await range.focus();
      await page.evaluate(() => {
        (window as unknown as { escapes: boolean[] }).escapes = [];
        document.addEventListener('keydown', (e) => {
          if (e.key === 'Escape')
            (window as unknown as { escapes: boolean[] }).escapes.push(
              e.defaultPrevented,
            );
        });
      });
      await page.keyboard.press('Home');
      await page.keyboard.press('Escape');
      await expect(range).toHaveAttribute(
        'aria-valuetext',
        'No reading selected',
      );
      await page.keyboard.press('Escape');
      expect(
        await page.evaluate(
          () => (window as unknown as { escapes: boolean[] }).escapes,
        ),
      ).toEqual([true, false]);
      await page.keyboard.press('End');
      await page.keyboard.press('Delete');
      await expect(range).toHaveAttribute(
        'aria-valuetext',
        'No reading selected',
      );
    });

    test('a mouse over the plot draws the line under it and the tooltip beside it', async ({
      page,
    }) => {
      const pattern = chart(page, 'chart-pattern');
      const box = (await pattern.boundingBox())!;
      const x = box.x + box.width * 0.4;
      await page.mouse.move(x, box.y + box.height / 2);
      const line = pattern.locator('[data-pct-part="cursor"]');
      const tooltip = pattern.locator('[data-pct-part="tooltip"]');
      await expect(tooltip).toBeVisible();
      const lineBox = (await line.boundingBox())!;
      expect(Math.abs(lineBox.x - x)).toBeLessThanOrEqual(1);
      const tipBox = (await tooltip.boundingBox())!;
      // to the right of the line, eight pixels away
      expect(tipBox.x - lineBox.x).toBeCloseTo(8, 0);
      await expect(tooltip.locator('.row')).toHaveCount(3);
      // near the right edge it turns to the left
      const near = box.x + box.width - 60;
      await page.mouse.move(near, box.y + box.height / 2);
      await expect
        .poll(async () => {
          const l = (await line.boundingBox())!;
          const t = (await tooltip.boundingBox())!;
          return Math.round(l.x - (t.x + t.width));
        })
        .toBe(8);
      // leaving the chart takes the cursor away
      await page.mouse.move(box.x + box.width / 2, box.y - 40);
      await expect(line).toHaveCount(0);
    });

    test('a click pins the cursor, and a click on its line lets it go', async ({
      page,
    }) => {
      const pattern = chart(page, 'chart-pattern');
      const box = (await pattern.boundingBox())!;
      const x = box.x + box.width * 0.5;
      const y = box.y + box.height / 2;
      await page.mouse.click(x, y);
      await page.mouse.move(box.x + box.width / 2, box.y - 40);
      const line = pattern.locator('[data-pct-part="cursor"]');
      await expect(line).toHaveCount(1);
      await page.mouse.click(x + 5, y);
      await page.mouse.move(box.x + box.width / 2, box.y - 40);
      await expect(line).toHaveCount(0);
    });

    test('a cursor the application sets draws with no event, and reads back', async ({
      page,
    }) => {
      const shared = chart(page, 'chart-cursor');
      await page.getByTestId('cursor-ten').click();
      await expect(page.getByTestId('cursor-reading')).toHaveText(
        /10:00\s+—\s+Supply air [\d.]+ °C,\s+Fan power 640 W/,
      );
      await expect(shared.locator('[data-pct-part="cursor"]')).toHaveCount(1);
      await expect(shared.getByTestId('own-tooltip')).toHaveText(
        '25 Oct, 10:00',
      );
      await page.getByTestId('cursor-clear').click();
      await expect(page.getByTestId('cursor-reading')).toHaveText('No cursor');
      await expect(shared.locator('[data-pct-part="cursor"]')).toHaveCount(0);
    });
  });

  test.describe('the cursor under a finger', () => {
    test.use({ hasTouch: true });
    test.skip(
      ({ browserName }) => browserName === 'firefox',
      'Playwright has no touch in Firefox',
    );

    test('a tap places the cursor, and a tap on its line clears it', async ({
      page,
    }) => {
      const pattern = chart(page, 'chart-pattern');
      const box = (await pattern.boundingBox())!;
      const x = box.x + box.width * 0.5;
      const y = box.y + box.height / 2;
      const line = pattern.locator('[data-pct-part="cursor"]');
      await page.touchscreen.tap(x, y);
      await expect(line).toHaveCount(1);
      expect(Math.abs((await line.boundingBox())!.x - x)).toBeLessThanOrEqual(
        1,
      );
      await page.touchscreen.tap(x + 6, y);
      await expect(line).toHaveCount(0);
    });
  });
});
