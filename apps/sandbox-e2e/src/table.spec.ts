import { expect, Locator, test } from '@playwright/test';
import { styleOf } from './support/css';
import { boxOf, visit } from './support/dom';

/**
 * What three engines are asked here is the accessibility tree first: the caption names the
 * table, the header cells are column and row headers, and `aria-sort` stands on one header
 * at a time. Then the two behaviours only a browser has: a sortable header is a button the
 * keyboard presses, and the frame is a region with a tab stop only while its table overflows,
 * measured by a `ResizeObserver` that no unit suite can run.
 */
test.describe('PctTable — the platform table, dressed element by element', () => {
  test.beforeEach(async ({ page }) => {
    await visit(page, '/table');
  });

  const firstRow = (table: Locator) =>
    table.locator('tbody tr').first().getByRole('rowheader');

  test('the caption names the table, and the header cells are headers', async ({
    page,
  }) => {
    const table = page.getByRole('table', { name: 'Polling rules' });
    await expect(table).toHaveCount(1);
    await expect(table.getByRole('columnheader')).toHaveCount(3);
    await expect(table.getByRole('rowheader')).toHaveCount(4);
    await expect(table.getByRole('cell')).toHaveCount(8);
    await expect(page.getByRole('table', { name: 'Devices' })).toHaveCount(1);
  });

  test('a sortable header is a button named by its label, and a plain one is not', async ({
    page,
  }) => {
    const table = page.getByTestId('table-sorted');
    await expect(table.getByRole('button')).toHaveCount(2);
    await expect(
      table.getByRole('button', { name: 'Name', exact: true }),
    ).toHaveCount(1);
    await expect(
      table.getByRole('button', { name: 'Address', exact: true }),
    ).toHaveCount(1);
  });

  test('the keyboard sorts: Enter sorts ascending, Space turns it, and the view orders its rows', async ({
    page,
  }) => {
    const table = page.getByTestId('table-sorted');
    const name = table.getByRole('columnheader', { name: 'Name' });
    await expect(firstRow(table)).toHaveText('Supply fan');
    await expect(table.locator('[aria-sort]')).toHaveCount(0);

    await table.getByRole('button', { name: 'Name', exact: true }).focus();
    await page.keyboard.press('Enter');
    await expect(name).toHaveAttribute('aria-sort', 'ascending');
    await expect(firstRow(table)).toHaveText('Bypass');

    await page.keyboard.press('Space');
    await expect(name).toHaveAttribute('aria-sort', 'descending');
    await expect(firstRow(table)).toHaveText('Supply fan');
  });

  test('a press on another column moves aria-sort there, and it stands on one header', async ({
    page,
  }) => {
    const table = page.getByTestId('table-sorted');
    await table.getByRole('button', { name: 'Name', exact: true }).click();
    await table.getByRole('button', { name: 'Address', exact: true }).click();

    const address = table.getByRole('columnheader', { name: 'Address' });
    await expect(address).toHaveAttribute('aria-sort', 'ascending');
    await expect(table.locator('[aria-sort]')).toHaveCount(1);
    await expect(firstRow(table)).toHaveText('Supply fan');
  });

  test('the hint under the pointer points the way a press sorts', async ({
    page,
  }) => {
    const table = page.getByTestId('table-sorted');
    const header = table.getByRole('columnheader', { name: 'Name' });
    const button = table.getByRole('button', { name: 'Name', exact: true });
    const icon = header.locator('[data-pct-part="icon"]');
    await expect(icon).toBeHidden();

    await button.hover();
    await expect(icon).toBeVisible();
    const hint = await styleOf(icon, 'rotate');
    await button.click();
    await expect(header).toHaveAttribute('aria-sort', 'ascending');
    expect(await styleOf(icon, 'rotate')).toBe(hint);
    await button.click();
    await expect(header).toHaveAttribute('aria-sort', 'descending');
    expect(await styleOf(icon, 'rotate')).not.toBe(hint);
  });

  test('the sort button takes the whole header cell, at least the touch floor high', async ({
    page,
  }) => {
    const table = page.getByTestId('table-sorted');
    const header = table.getByRole('columnheader', { name: 'Name' });
    const button = table.getByRole('button', { name: 'Name', exact: true });
    const cell = await boxOf(header);
    const press = await boxOf(button);
    expect(Math.abs(press.width - cell.width)).toBeLessThan(1);
    expect(press.height).toBeGreaterThanOrEqual(24);
  });

  test('numbers stand at the end edge in digits of one width, text at the start', async ({
    page,
  }) => {
    const table = page.getByTestId('table-sorted');
    const number = table.locator('td[data-pct-numeric]').first();
    expect(await styleOf(number, 'text-align')).toBe('end');
    expect(await styleOf(number, 'font-variant-numeric')).toBe('tabular-nums');
    const caption = page
      .getByTestId('table-plain')
      .locator('caption.pct-table-caption');
    expect(await styleOf(caption, 'text-align')).toBe('start');
    const cell = page.getByTestId('table-plain').locator('td').first();
    expect(await styleOf(cell, 'text-align')).toBe('start');
  });

  test('an overflowing frame is a region named by the caption, and the keyboard scrolls it', async ({
    page,
  }) => {
    const region = page.getByRole('region', { name: 'Registers' });
    await expect(region).toHaveCount(1);
    await expect(region).toHaveAttribute('tabindex', '0');

    await region.focus();
    await expect(region).toBeFocused();
    const before = await region.evaluate((element) => element.scrollLeft);
    await page.keyboard.press('ArrowRight');
    await expect
      .poll(() => region.evaluate((element) => element.scrollLeft))
      .toBeGreaterThan(before);
  });

  test('a frame whose table fits is no region and no stop', async ({
    page,
  }) => {
    const frame = page.getByTestId('frame');
    await expect(frame).toHaveAttribute('role', 'region');

    await page
      .locator('.view__narrow')
      .evaluate((element) => (element.style.maxInlineSize = 'none'));
    await expect(frame).not.toHaveAttribute('role', 'region');
    await expect(frame).not.toHaveAttribute('tabindex', '0');
    await expect(frame).not.toHaveAttribute('aria-labelledby', /.+/);
  });
});
