import { expect, test } from '@playwright/test';
import { attrOf, boxOf, visit } from './support/dom';

test.describe('PctRadioGroup — signal forms', () => {
  test.beforeEach(async ({ page }) => {
    await visit(page, '/radio');
  });

  test('the group has role radiogroup and is named by the wrapper label', async ({
    page,
  }) => {
    const group = page.getByTestId('radio-plan');
    await expect(group).toHaveRole('radiogroup');

    // Inside the wrapper it is pct-field that renders the label; the group points
    // at it through aria-labelledby, because `<label for>` names no set of elements.
    const labelId = await attrOf(
      page.getByTestId('field-plan').locator('[data-pct-part="field-label"]'),
      'id',
    );
    await expect(group).toHaveAttribute('aria-labelledby', labelId);
    await expect(group.locator('[data-pct-part="group-label"]')).toHaveCount(0);
  });

  test('a click on an option label picks it and fills the dot', async ({
    page,
  }) => {
    const group = page.getByTestId('radio-plan');
    const pro = group.locator('pct-radio', { hasText: 'Pro' });

    await pro.locator('[data-pct-part="label"]').click();

    await expect(pro.locator('input')).toBeChecked();
    // Kropka widoczna tylko dla wybranej opcji.
    await expect(pro.locator('[data-pct-part="dot"]')).toBeVisible();
    await expect(
      group
        .locator('pct-radio', { hasText: 'Darmowy' })
        .locator('[data-pct-part="dot"]'),
    ).toBeHidden();
  });

  /**
   * The key test: arrow navigation comes from the browser, because the options are
   * native <input type="radio"> with a shared `name`. We implement no roving
   * tabindex of our own — this test keeps it that way.
   */
  test('the arrows switch options with no implementation of ours (a native group)', async ({
    page,
  }) => {
    const group = page.getByTestId('radio-plan');
    const free = group
      .locator('pct-radio', { hasText: 'Darmowy' })
      .locator('input');
    const pro = group.locator('pct-radio', { hasText: 'Pro' }).locator('input');

    await free.focus();
    await page.keyboard.press('Space');
    await expect(free).toBeChecked();

    await page.keyboard.press('ArrowDown');
    await expect(pro).toBeChecked();
    await expect(pro).toBeFocused();
    await expect(free).not.toBeChecked();

    await page.keyboard.press('ArrowUp');
    await expect(free).toBeChecked();
    await expect(free).toBeFocused();
  });

  test('the arrows skip a disabled option', async ({ page }) => {
    const group = page.getByTestId('radio-plan');
    const pro = group.locator('pct-radio', { hasText: 'Pro' }).locator('input');
    const enterprise = group
      .locator('pct-radio', { hasText: 'Enterprise' })
      .locator('input');

    await expect(enterprise).toBeDisabled();

    await pro.focus();
    await page.keyboard.press('Space');
    await page.keyboard.press('ArrowDown');

    // Enterprise is disabled, so it cannot be picked.
    await expect(enterprise).not.toBeChecked();
  });

  test('the whole group takes one place in the tab order', async ({ page }) => {
    const group = page.getByTestId('radio-plan');
    const free = group
      .locator('pct-radio', { hasText: 'Darmowy' })
      .locator('input');
    const pro = group.locator('pct-radio', { hasText: 'Pro' }).locator('input');

    await free.focus();
    await page.keyboard.press('Space');
    await expect(free).toBeChecked();

    // Tab leaves the group instead of moving between the options.
    await page.keyboard.press('Tab');
    await expect(free).not.toBeFocused();
    await expect(pro).not.toBeFocused();
  });

  test('the clickable area of an option is at least 24x24 px', async ({
    page,
  }) => {
    const control = page
      .getByTestId('radio-plan')
      .locator('pct-radio')
      .first()
      .locator('input');

    const hit = await boxOf(control);
    expect(hit.width).toBeGreaterThanOrEqual(24);
    expect(hit.height).toBeGreaterThanOrEqual(24);
  });

  test('a horizontal layout sets aria-orientation', async ({ page }) => {
    await expect(page.getByTestId('radio-horizontal')).toHaveAttribute(
      'aria-orientation',
      'horizontal',
    );
    await expect(page.getByTestId('radio-plan')).toHaveAttribute(
      'aria-orientation',
      'vertical',
    );
  });
});
