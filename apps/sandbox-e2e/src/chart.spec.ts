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
    // the picture's own drawings: the zoom bar beside it draws its icons for a reader
    for (const svg of await pattern
      .locator('[data-pct-part="plot"] svg')
      .all()) {
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
      // apart in time: two clicks within 300 ms are a double click, which returns the window
      await page.waitForTimeout(350);
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
      await page.waitForTimeout(350);
      await page.touchscreen.tap(x + 6, y);
      await expect(line).toHaveCount(0);
    });
  });

  test.describe('the window', () => {
    const NAME = 'Heat recovery on 25 October 2026';
    const H = 3_600_000;
    const spanOf = (page: import('@playwright/test').Page) =>
      page
        .getByRole('slider', { name: NAME })
        .evaluate((e) => Number((e as HTMLInputElement).max));
    const firstLabel = (page: import('@playwright/test').Page) =>
      chart(page, 'chart-pattern')
        .locator('[data-pct-part="axis"] .time')
        .first()
        .textContent();

    test('the keys zoom, pan and return the window', async ({ page }) => {
      const range = page.getByRole('slider', { name: NAME });
      await range.focus();
      expect(await spanOf(page)).toBe(25 * H);
      await page.keyboard.press('+');
      await expect.poll(() => spanOf(page)).toBe(12.5 * H);
      const before = await firstLabel(page);
      await page.keyboard.press('Shift+ArrowRight');
      await expect.poll(() => firstLabel(page)).not.toBe(before);
      expect(await spanOf(page)).toBe(12.5 * H);
      await expect(range).toHaveAttribute(
        'aria-valuetext',
        'No reading selected',
      );
      await page.keyboard.press('-');
      await expect.poll(() => spanOf(page)).toBe(25 * H);
      await page.keyboard.press('+');
      await page.keyboard.press('0');
      await expect.poll(() => spanOf(page)).toBe(25 * H);
      await expect.poll(() => firstLabel(page)).toBe('25/10');
    });

    test('the zoom bar is one stop whose buttons move the window', async ({
      page,
    }) => {
      const range = page.getByRole('slider', { name: NAME });
      const bar = chart(page, 'chart-pattern').getByRole('toolbar', {
        name: 'Zoom',
      });
      await range.focus();
      await page.keyboard.press('Tab');
      const zoomIn = bar.getByRole('button', { name: 'Zoom in' });
      await expect(zoomIn).toBeFocused();
      await page.keyboard.press('ArrowRight');
      await expect(bar.getByRole('button', { name: 'Zoom out' })).toBeFocused();
      await page.keyboard.press('Home');
      await page.keyboard.press('Enter');
      await expect.poll(() => spanOf(page)).toBe(12.5 * H);
      // one stop: Tab leaves the bar
      await page.keyboard.press('Tab');
      await expect(bar.locator(':focus')).toHaveCount(0);
      await bar
        .getByRole('button', { name: 'Back to the default view' })
        .click();
      await expect.poll(() => spanOf(page)).toBe(25 * H);
      for (const button of await bar.getByRole('button').all()) {
        const box = (await button.boundingBox())!;
        expect(box.width).toBeGreaterThanOrEqual(24);
        expect(box.height).toBeGreaterThanOrEqual(24);
      }
    });

    test('a drag pans the window, and Ctrl with the wheel zooms it while the wheel alone scrolls the page', async ({
      page,
    }) => {
      const pattern = chart(page, 'chart-pattern');
      await pattern.scrollIntoViewIfNeeded();
      const range = page.getByRole('slider', { name: NAME });
      await range.focus();
      await page.keyboard.press('+');
      await expect.poll(() => spanOf(page)).toBe(12.5 * H);
      // measured after the focus, which may scroll the page
      const box = (await pattern.boundingBox())!;
      const y = box.y + box.height / 2;
      const before = await firstLabel(page);
      const start = box.x + box.width * 0.6;
      await page.mouse.move(start, y);
      await page.mouse.down();
      await page.mouse.move(start - 40, y, { steps: 4 });
      await page.mouse.move(start - 120, y, { steps: 4 });
      await page.mouse.up();
      await expect.poll(() => firstLabel(page)).not.toBe(before);
      expect(await spanOf(page)).toBe(12.5 * H);
      const scrolled = await page.evaluate(() => window.scrollY);
      await page.mouse.move(box.x + box.width / 2, y);
      await page.keyboard.down('Control');
      await page.mouse.wheel(0, -200);
      await page.keyboard.up('Control');
      await expect.poll(() => spanOf(page)).toBeLessThan(12.5 * H);
      expect(await page.evaluate(() => window.scrollY)).toBe(scrolled);
      const zoomed = await spanOf(page);
      await page.mouse.wheel(0, 200);
      await expect
        .poll(() => page.evaluate(() => window.scrollY))
        .toBeGreaterThan(scrolled);
      expect(await spanOf(page)).toBe(zoomed);
    });

    test('two charts in step share the window and the cursor, and line their plots up', async ({
      page,
    }) => {
      const power = chart(page, 'chart-sync-power');
      const heater = chart(page, 'chart-sync-heater');
      const edge = (c: Locator) =>
        c.locator('clipPath rect').evaluate((r) => Number(r.getAttribute('x')));
      expect(await edge(power)).toBe(await edge(heater));
      await power.scrollIntoViewIfNeeded();
      const box = (await power.boundingBox())!;
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await expect(heater.locator('[data-pct-part="cursor"]')).toHaveCount(1);
      const at = async (c: Locator) =>
        (await c.locator('[data-pct-part="cursor"]').boundingBox())!.x;
      expect(
        Math.abs((await at(power)) - (await at(heater))),
      ).toBeLessThanOrEqual(1);
      await page
        .getByRole('slider', { name: 'Fan power on 25 October 2026' })
        .focus();
      await page.keyboard.press('+');
      const max = (name: string) =>
        page
          .getByRole('slider', { name })
          .evaluate((e) => Number((e as HTMLInputElement).max));
      await expect
        .poll(() => max('Heater on 25 October 2026'))
        .toBe(await max('Fan power on 25 October 2026'));
    });
  });

  test.describe('the window under fingers', () => {
    test.use({ hasTouch: true });
    test.skip(
      ({ browserName }) => browserName === 'firefox',
      'Playwright has no touch in Firefox',
    );

    test('a double tap returns the window to its default', async ({ page }) => {
      const pattern = chart(page, 'chart-pattern');
      const range = page.getByRole('slider', {
        name: 'Heat recovery on 25 October 2026',
      });
      await range.focus();
      await page.keyboard.press('+');
      const span = () =>
        range.evaluate((e) => Number((e as HTMLInputElement).max));
      await expect.poll(span).toBe(12.5 * 3_600_000);
      const box = (await pattern.boundingBox())!;
      const x = box.x + box.width / 2;
      const y = box.y + box.height / 2;
      await page.touchscreen.tap(x, y);
      await page.touchscreen.tap(x, y);
      await expect.poll(span).toBe(25 * 3_600_000);
    });
  });

  test.describe('the legend', () => {
    test('the legend hides a series on a press and shows it on the next', async ({
      page,
    }) => {
      const pattern = chart(page, 'chart-pattern');
      const legend = page.getByTestId('chart-legend');
      await expect(legend).toHaveRole('list');
      await expect(legend).toHaveAccessibleName('Series');
      const fan = legend.getByRole('button', { name: 'Fan power' });
      await expect(fan).toHaveAttribute('aria-pressed', 'true');
      await expect(pattern.locator('path[data-pct-part="series"]')).toHaveCount(
        3,
      );
      const before = await pattern
        .locator('[data-pct-unit="W"] .value')
        .allTextContents();
      await fan.click();
      await expect(fan).toHaveAttribute('aria-pressed', 'false');
      await expect(pattern.locator('path[data-pct-part="series"]')).toHaveCount(
        2,
      );
      // the axis keeps its slot, and reads [0, 1] with no series on it
      await expect(pattern.locator('[data-pct-unit="W"]')).toHaveAttribute(
        'data-pct-slot',
        'right',
      );
      await expect
        .poll(() =>
          pattern.locator('[data-pct-unit="W"] .value').allTextContents(),
        )
        .not.toEqual(before);
      await fan.focus();
      await page.keyboard.press('Space');
      await expect(fan).toHaveAttribute('aria-pressed', 'true');
      await expect(pattern.locator('path[data-pct-part="series"]')).toHaveCount(
        3,
      );
    });

    test('the legend writes the latest reading, and the reading under the cursor as the tooltip does', async ({
      page,
    }) => {
      const legend = page.getByTestId('chart-legend');
      await expect(legend.locator('.value')).toHaveText([
        /°C$/,
        '380 W',
        'Off',
      ]);
      const pattern = chart(page, 'chart-pattern');
      await pattern.scrollIntoViewIfNeeded();
      const box = (await pattern.boundingBox())!;
      await page.mouse.move(box.x + box.width * 0.4, box.y + box.height / 2);
      const tooltip = pattern.locator('[data-pct-part="tooltip"] .row .value');
      await expect(tooltip).toHaveCount(3);
      await expect(legend.locator('.value')).toHaveText(
        await tooltip.allTextContents(),
      );
      // each entry carries the series' swatch, drawn by its mark
      await expect(
        legend.locator('[data-pct-part="toggle"] [data-pct-part="swatch"]'),
      ).toHaveCount(3);
    });

    test('eight series are told apart by their dashes and markers as well as their colours', async ({
      page,
    }) => {
      const eight = chart(page, 'chart-eight');
      const paths = eight.locator('path[data-pct-part="series"]');
      await expect(paths).toHaveCount(8);
      const dashes = await paths.evaluateAll((ps) =>
        ps.map((p) => getComputedStyle(p).strokeDasharray),
      );
      expect(new Set(dashes).size).toBe(8);
      expect(dashes[0]).toBe('none');
      const shapes = await page
        .getByTestId('chart-eight-legend')
        .locator('[data-pct-part="swatch"] .shape')
        .evaluateAll((ss) => ss.map((s) => s.getAttribute('d')));
      expect(shapes).toHaveLength(8);
      expect(new Set(shapes).size).toBe(8);
      const removes = page
        .getByTestId('chart-eight-legend')
        .getByRole('button', { name: /^Remove: / });
      await expect(removes).toHaveCount(8);
      await removes.first().click();
      await expect(paths).toHaveCount(7);
      await expect(removes).toHaveCount(7);
    });
  });

  test.describe('bars', () => {
    test('a bar per day stands in four fifths of its band, February beside March by position', async ({
      page,
    }) => {
      const daily = chart(page, 'chart-bars');
      const own = daily.locator('rect[data-pct-part="bar"]:not(.compared)');
      const compared = daily.locator('rect[data-pct-part="bar"].compared');
      // the 14th has no reading: thirty bars of March, twenty-eight of February
      await expect(own).toHaveCount(30);
      await expect(compared).toHaveCount(28);
      const widths = await own.evaluateAll((rs) =>
        rs.map((r) => Number(r.getAttribute('width'))),
      );
      // one width for every day but the 29th, which has twenty-three hours and a narrower band
      const distinct = [...new Set(widths.map((w) => Math.round(w * 10)))];
      expect(distinct).toHaveLength(2);
      expect(Math.min(...distinct) / Math.max(...distinct)).toBeCloseTo(
        23 / 24,
        1,
      );
      const ticks = daily.locator('[data-pct-part="axis"] .tick');
      await expect(ticks).toHaveCount(31);
      const band =
        (await ticks.nth(1).evaluate((t) => Number(t.getAttribute('x1')))) -
        (await ticks.nth(0).evaluate((t) => Number(t.getAttribute('x1'))));
      // a band holds March's bar and February's, each half of four fifths less the gaps
      expect(widths[0] * 2 + 2 * 2).toBeCloseTo(band * 0.8, 0);
      const firstOwn = await own
        .first()
        .evaluate((r) => Number(r.getAttribute('x')));
      const firstCompared = await compared
        .first()
        .evaluate((r) => Number(r.getAttribute('x')));
      expect(firstCompared).toBeLessThan(firstOwn);
      // the labels never touch
      const boxes = await daily
        .locator('text[data-pct-part="label"]')
        .evaluateAll((ts) =>
          ts.map((t) => {
            const b = (t as SVGGraphicsElement).getBBox();
            return [b.x, b.x + b.width];
          }),
        );
      expect(boxes.length).toBeGreaterThan(0);
      for (let i = 1; i < boxes.length; i++)
        expect(boxes[i][0]).toBeGreaterThan(boxes[i - 1][1]);
    });

    test("a press selects a bar's band, and Enter at the cursor does the same", async ({
      page,
    }) => {
      const daily = chart(page, 'chart-bars');
      await daily.scrollIntoViewIfNeeded();
      const third = daily
        .locator('rect[data-pct-part="bar"]:not(.compared)')
        .nth(2);
      const box = (await third.boundingBox())!;
      await page.waitForTimeout(350);
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      const selection = daily.locator('[data-pct-part="selection"]');
      await expect(selection).toHaveCount(1);
      await expect(page.getByTestId('bars-picked')).toHaveText(
        'Picked 3 March',
      );
      // the band spans the whole day: from half a band before its tick, which stands in its
      // middle, to half a band after it
      const sel = (await selection.boundingBox())!;
      const ticks = daily.locator('[data-pct-part="axis"] .tick');
      const middle = (await ticks.nth(2).boundingBox())!.x;
      const band =
        (await ticks.nth(2).boundingBox())!.x -
        (await ticks.nth(1).boundingBox())!.x;
      expect(Math.abs(sel.x - (middle - band / 2))).toBeLessThanOrEqual(1.5);
      expect(
        Math.abs(sel.x + sel.width - (middle + band / 2)),
      ).toBeLessThanOrEqual(1.5);
      await page.waitForTimeout(350);
      await page.mouse.click(box.x + box.width / 2, box.y - 10);
      await expect(selection).toHaveCount(0);
      const range = page.getByRole('slider', {
        name: 'Heat pump energy by day, March 2026',
      });
      await range.focus();
      await page.keyboard.press('Home');
      await expect(range).toHaveAttribute('aria-valuetext', /^Sun 1: March/);
      await page.keyboard.press('Enter');
      await expect(selection).toHaveCount(1);
      await page.keyboard.press('Space');
      await expect(selection).toHaveCount(0);
      const table = page.getByTestId('bars-table');
      await expect(table.locator('tbody tr')).toHaveCount(31);
      await expect(table.locator('tfoot th')).toHaveText('Sum');
      await expect(table.locator('tfoot td')).toHaveCount(2);
    });

    test('stacked bars stand on each other in a band of categories, a third group beside them', async ({
      page,
    }) => {
      const stack = chart(page, 'chart-stack');
      await expect(stack.locator('[data-pct-part="axis"] .time')).toHaveText([
        'Kitchen',
        'Hall',
        'Study',
      ]);
      const bars = stack.locator('rect[data-pct-part="bar"]');
      await expect(bars).toHaveCount(9);
      const read = (i: number) =>
        bars.nth(i).evaluate((r) => ({
          x: Number(r.getAttribute('x')),
          y: Number(r.getAttribute('y')),
          h: Number(r.getAttribute('height')),
          place: r.getAttribute('data-pct-series'),
        }));
      const pump = await read(0);
      const solar = await read(3);
      const before = await read(6);
      expect(pump.place).toBe('1');
      expect(solar.place).toBe('2');
      expect(before.place).toBe('3');
      expect(solar.x).toBeCloseTo(pump.x, 0);
      expect(solar.y).toBeGreaterThanOrEqual(pump.y + pump.h - 1);
      expect(before.x).toBeGreaterThan(pump.x);
      await expect(
        stack.locator('[data-pct-unit="kWh"] .value').first(),
      ).toHaveText(/^-/);
    });

    test('a turned chart lays the bands down the side: the bars grow to the right, the labels stand beside their ends, the cursor lies across and the page keeps the horizontal gesture', async ({
      page,
    }) => {
      const turned = chart(page, 'chart-turned');
      await expect(turned).toHaveClass(/horizontal/);
      const bars = turned.locator('rect[data-pct-part="bar"]');
      await expect(bars).toHaveCount(9);
      const boxes = await bars.evaluateAll((rs) =>
        rs.map((r) => ({
          x: Number(r.getAttribute('x')),
          y: Number(r.getAttribute('y')),
          w: Number(r.getAttribute('width')),
          h: Number(r.getAttribute('height')),
          place: r.getAttribute('data-pct-series'),
        })),
      );
      // the pump's bars start at zero and run right; the solar's, negative, end at zero
      const pump = boxes.filter((b) => b.place === '1');
      const solar = boxes.filter((b) => b.place === '2');
      expect(new Set(pump.map((b) => Math.round(b.x))).size).toBe(1);
      solar.forEach((s, i) => expect(s.x + s.w).toBeCloseTo(pump[i].x, 0));
      expect(pump.every((b) => b.w > b.h)).toBe(true);
      // the rooms down the side in their order, labelled to the left of the axis
      const names = turned.locator('[data-pct-part="axis"] .time');
      await expect(names).toHaveText(['Kitchen', 'Hall', 'Study']);
      const ys = await names.evaluateAll((ts) =>
        ts.map((t) => Number(t.getAttribute('y'))),
      );
      expect(ys[0]).toBeLessThan(ys[1]);
      expect(ys[1]).toBeLessThan(ys[2]);
      await expect(names.first()).toHaveAttribute('text-anchor', 'end');
      // the value labels along the bottom
      await expect(
        turned.locator('[data-pct-unit="kWh"] .value').first(),
      ).toHaveAttribute('dominant-baseline', 'hanging');
      // the bars' labels beside their ends
      await expect(
        turned.locator('text[data-pct-part="label"]').first(),
      ).toHaveAttribute('text-anchor', 'start');
      // the pointer on the plot: the cursor's line lies across, wider than tall — the demo
      // sits below the fold, and a mouse moved to a point outside the viewport reaches nothing
      await turned.scrollIntoViewIfNeeded();
      const box = (await turned
        .locator('[data-pct-part="plot"]')
        .boundingBox())!;
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      const line = turned.locator('[data-pct-part="cursor"]');
      await expect(line).toHaveClass(/across/);
      const size = await line.evaluate((l) => {
        const r = l.getBoundingClientRect();
        return { w: r.width, h: r.height };
      });
      expect(size.w).toBeGreaterThan(size.h);
      // the page keeps the horizontal gesture
      expect(
        await turned
          .locator('.overlay')
          .evaluate((o) => getComputedStyle(o).touchAction),
      ).toBe('pan-x');
    });
  });

  test.describe('annotations', () => {
    test('a band under the line, a dashed reference line with its label at the right end, a note in a box on its point, the moment of the report, and the line cut red over 22 °C', async ({
      page,
    }) => {
      const annotated = chart(page, 'chart-annotations');
      const plot = (await annotated
        .locator('clipPath rect')
        .first()
        .evaluate((r) => ({
          left: Number(r.getAttribute('x')),
          right: Number(r.getAttribute('x')) + Number(r.getAttribute('width')),
          top: Number(r.getAttribute('y')),
        })))!;
      // the band from the plot's top, under the series: before the line's path in the layer
      const band = annotated.locator('[data-pct-part="span"] rect.band');
      await expect(band).toHaveAttribute('y', String(plot.top));
      expect(
        await annotated.locator('[data-pct-part="data"]').evaluate((svg) => {
          const band = svg.querySelector('[data-pct-part="span"]')!;
          const path = svg.querySelector('[data-pct-part="series"]')!;
          return Boolean(
            band.compareDocumentPosition(path) &
            Node.DOCUMENT_POSITION_FOLLOWING,
          );
        }),
      ).toBe(true);
      await expect(
        annotated.locator('[data-pct-part="span"] text.label'),
      ).toHaveText('Night tariff');
      // the reference line across the whole plot, dashed, its label ending at the right edge
      const reference = annotated.locator('[data-pct-part="reference"]');
      const line = reference.locator('line.line');
      await expect(line).toHaveClass(/dashed/);
      await expect(line).toHaveAttribute('x1', String(plot.left));
      await expect(line).toHaveAttribute('x2', String(plot.right));
      const label = reference.locator('text.label');
      await expect(label).toHaveText('Comfort');
      await expect(label).toHaveAttribute('text-anchor', 'end');
      await expect(label).toHaveAttribute('x', String(plot.right - 4));
      expect(
        await line.evaluate((l) => getComputedStyle(l).strokeDasharray),
      ).not.toBe('none');
      // the note: a box wide enough for its text, measured, over its dot, with a leader between
      const note = annotated.locator('[data-pct-part="note"]');
      await expect(note.locator('text.text')).toHaveText('Window opened');
      const geometry = await note.evaluate((g) => {
        const box = g.querySelector('rect.box')!.getBoundingClientRect();
        const text = g.querySelector('text.text')!.getBoundingClientRect();
        const dot = g.querySelector('circle.dot')!.getBoundingClientRect();
        return {
          textInside:
            text.left >= box.left &&
            text.right <= box.right &&
            text.top >= box.top &&
            text.bottom <= box.bottom,
          boxOverDot: box.bottom <= dot.top,
        };
      });
      expect(geometry).toEqual({ textInside: true, boxOverDot: true });
      // the moment of the report, pinned, from the plot's top with its label at the top
      const now = annotated.locator('[data-pct-part="now"]');
      await expect(now.locator('text.label')).toHaveText('Report taken');
      await expect(now.locator('line.line')).toHaveAttribute(
        'y1',
        String(plot.top),
      );
      // the line drawn twice, each clipped to its band: the upper one in tomato
      const paths = annotated.locator('path[data-pct-part="series"]');
      await expect(paths).toHaveCount(2);
      const clips = await paths.evaluateAll((ps) =>
        ps.map((p) => p.getAttribute('clip-path')),
      );
      expect(new Set(clips).size).toBe(2);
      expect(clips.every((c) => c?.startsWith('url(#pct-line-threshold'))).toBe(
        true,
      );
      expect(
        await paths.nth(1).evaluate((p) => getComputedStyle(p).stroke),
      ).toBe('rgb(255, 99, 71)');
    });

    test('a reader hears the annotations in the description, and the legend hides the ones that stand in it', async ({
      page,
    }) => {
      const annotated = chart(page, 'chart-annotations');
      const picture = annotated.getByRole('img');
      await expect(picture).toHaveAccessibleDescription(
        /^Supply air through the day of the clocks going back\. Night tariff .+ – .+\. Comfort 21 °C\. Window opened \(.+, 21\.9 °C\)\. Report taken .+\.$/,
      );
      // the legend: the series, then the two annotations asked to stand there, no unit, no value
      const legend = page.getByTestId('annotations-legend');
      const toggles = legend.getByRole('button');
      await expect(toggles).toContainText([
        'Supply air',
        'Night tariff',
        'Comfort',
      ]);
      await toggles.nth(2).click();
      await expect(toggles.nth(2)).toHaveAttribute('aria-pressed', 'false');
      await expect(
        annotated.locator('[data-pct-part="reference"]'),
      ).toHaveCount(0);
      await expect(picture).not.toHaveAccessibleDescription(/Comfort/);
      await toggles.nth(2).click();
      await expect(
        annotated.locator('[data-pct-part="reference"]'),
      ).toHaveCount(1);
      // the swatches of the annotations: the band's block and the reference's dashed line
      await expect(
        legend.locator('[data-pct-part="swatch"] rect.band'),
      ).toHaveCount(1);
      await expect(
        legend.locator('[data-pct-part="swatch"] line.line.dashed'),
      ).toHaveCount(1);
    });
  });
});
