import { expect, test } from '@playwright/test';
import { boxOf, visit } from './support/dom';

/**
 * A regression: the border padding and the vertical centring made a „dead zone" —
 * the cursor was inside the field, but a click set no focus. The tests click on
 * specific points of that zone, computed from the real layout.
 */
test.describe('PctField — a clickable area with no dead zone', () => {
  test.beforeEach(async ({ page }) => {
    await visit(page, '/field');
  });

  test('a click on the left border padding focuses the field', async ({
    page,
  }) => {
    // A field with an `inset` affix: the edge padding belongs to the affix slot, but
    // the affix lies on the field surface, so a click on it reaches the control.
    const field = page.getByTestId('field-search');
    const row = field.locator('[data-pct-part="field-row"]');
    const input = field.locator('input');

    // mouse.click() uses viewport coordinates and does not scroll on its own —
    // otherwise the click lands off screen, on <html>.
    await row.scrollIntoViewIfNeeded();
    const box = await boxOf(row);
    // 3 px from the left edge — the padding area, before the prefix affix.
    await page.mouse.click(box.x + 3, box.y + box.height / 2);

    await expect(input).toBeFocused();
  });

  test('a click at the top and at the bottom of the border focuses the field', async ({
    page,
  }) => {
    const field = page.getByTestId('field-price');
    const row = field.locator('[data-pct-part="field-row"]');
    const input = field.locator('input');

    await row.scrollIntoViewIfNeeded();
    const box = await boxOf(row);
    const middleX = box.x + box.width / 2;

    await page.mouse.click(middleX, box.y + 3);
    await expect(input).toBeFocused();

    await input.blur();
    await page.mouse.click(middleX, box.y + box.height - 3);
    await expect(input).toBeFocused();
  });

  test('a click on an inset affix focuses the field', async ({ page }) => {
    const field = page.getByTestId('field-search');
    const input = field.locator('input');

    await field.locator('[data-pct-part="field-prefix"]').click();
    await expect(input).toBeFocused();
  });

  test('the columns tile the inside of the border with no gaps', async ({
    page,
  }) => {
    // The heart of the fix: the row has no padding of its own, so there is no strip
    // in it belonging to no column. It used to be ~60% of the area.
    const field = page.getByTestId('field-price');
    const row = await boxOf(field.locator('[data-pct-part="field-row"]'));
    const border = 1;

    const columns = [];
    for (const part of ['field-prefix', 'field-control', 'field-suffix']) {
      columns.push(await boxOf(field.locator(`[data-pct-part="${part}"]`)));
    }

    for (const column of columns) {
      expect(column.height).toBeCloseTo(row.height - 2 * border, 0);
      expect(column.y).toBeCloseTo(row.y + border, 0);
    }

    // The columns meet with no gaps and reach both edges of the row inside.
    expect(columns[0].x).toBeCloseTo(row.x + border, 0);
    expect(columns[1].x).toBeCloseTo(columns[0].x + columns[0].width, 0);
    expect(columns[2].x).toBeCloseTo(columns[1].x + columns[1].width, 0);
    expect(columns[2].x + columns[2].width).toBeCloseTo(
      row.x + row.width - border,
      0,
    );
  });

  test('a click on a slot button does not move focus to the field', async ({
    page,
  }) => {
    const field = page.getByTestId('field-price');
    const clear = field.getByTestId('field-price-clear');

    await clear.click();
    await expect(field.locator('input')).not.toBeFocused();
  });

  test('the whole border shows the text cursor', async ({ page }) => {
    await expect(
      page.getByTestId('field-price').locator('[data-pct-part="field-row"]'),
    ).toHaveCSS('cursor', 'text');
  });

  test('a field with a list shows the pointer cursor over the whole border', async ({
    page,
  }) => {
    await expect(
      page.getByTestId('field-country').locator('[data-pct-part="field-row"]'),
    ).toHaveCSS('cursor', 'pointer');
  });

  test('a disabled field does not invite typing', async ({ page }) => {
    await expect(
      page.getByTestId('field-disabled').locator('[data-pct-part="field-row"]'),
    ).toHaveCSS('cursor', 'not-allowed');
  });

  test('a click on the padding of a field with a list opens the panel', async ({
    page,
  }) => {
    // The `pointer` cursor over the whole border promises the list will open — and
    // the promise has to hold in the padding too, not over the trigger alone.
    const field = page.getByTestId('field-country');
    const row = field.locator('[data-pct-part="field-row"]');
    const trigger = field.locator('[data-pct-part="trigger"]');

    await row.scrollIntoViewIfNeeded();
    const box = await boxOf(row);
    await page.mouse.click(box.x + 3, box.y + 3);

    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('[data-pct-part="panel"]')).toBeVisible();
  });

  test('a `fill` affix fills its slot to the pixel', async ({ page }) => {
    // A strip around an affix that is a surface itself would look like part of it
    // while a click on it reached the field — the slot leaves no such strip.
    const field = page.getByTestId('field-search');
    const slot = await boxOf(field.locator('[data-pct-part="field-suffix"]'));
    const button = await boxOf(field.getByTestId('field-search-submit'));

    expect(button.height).toBeCloseTo(slot.height, 0);
    expect(button.width).toBeCloseTo(slot.width, 0);
    expect(button.x).toBeCloseTo(slot.x, 0);
  });

  test('an `inset` affix is smaller than its slot, and the strip around it belongs to the field', async ({
    page,
  }) => {
    const field = page.getByTestId('field-price');
    const clear = field.getByTestId('field-price-clear');
    const slot = field.locator('[data-pct-part="field-suffix"]');
    const button = await boxOf(clear);

    expect(button.height).toBeLessThan((await boxOf(slot)).height);
    await expect(clear).toHaveCSS('cursor', 'pointer');
    // The strip around the button promises what a click on it does: control focus.
    await expect(slot).toHaveCSS('cursor', 'text');
  });

  test('a `fill` affix does not stretch the row past the field height', async ({
    page,
  }) => {
    // A button welded into the slot would bring its own min-height, equal to the
    // height of a field of the same size — the row would grow by the border width.
    const plain = await boxOf(
      page.getByTestId('field-email').locator('[data-pct-part="field-row"]'),
    );
    const withFill = await boxOf(
      page.getByTestId('field-search').locator('[data-pct-part="field-row"]'),
    );

    expect(withFill.height).toBeCloseTo(plain.height, 0);
  });

  test('an `inset` affix inherits the field cursor and hands it the click', async ({
    page,
  }) => {
    // The magnifier icon is no click target — a click on it focuses the control, so
    // the cursor has to say the same thing as the rest of the border.
    const field = page.getByTestId('field-search');

    await expect(field.locator('[data-pct-part="field-prefix"]')).toHaveCSS(
      'cursor',
      'text',
    );

    await field.getByTestId('field-search-icon').click();
    await expect(field.locator('input')).toBeFocused();
  });

  test('a `fill` affix has a cursor of its own and hands the field no click', async ({
    page,
  }) => {
    // The „PLN" tile is a surface of its own: it does nothing, so its cursor invites
    // no typing and it moves no focus to the control.
    const field = page.getByTestId('field-price');
    const unit = field.getByTestId('field-price-unit');

    await expect(unit).toHaveCSS('cursor', 'default');

    await unit.click();
    await expect(field.locator('input')).not.toBeFocused();
  });

  test('a `fill` affix reaches the edge of the border inside', async ({
    page,
  }) => {
    const field = page.getByTestId('field-price');
    const row = await boxOf(field.locator('[data-pct-part="field-row"]'));
    const unit = await boxOf(field.getByTestId('field-price-unit'));
    const border = 1;

    expect(unit.x).toBeCloseTo(row.x + border, 0);
    expect(unit.height).toBeCloseTo(row.height - 2 * border, 0);
  });
});
