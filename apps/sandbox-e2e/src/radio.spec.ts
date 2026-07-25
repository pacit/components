import { expect, test } from '@playwright/test';

test.describe('PctRadioGroup — signal forms', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('grupa ma rolę radiogroup i jest nazwana etykietą obudowy', async ({
    page,
  }) => {
    const group = page.getByTestId('radio-plan');
    await expect(group).toHaveRole('radiogroup');

    // W obudowie etykietę renderuje pct-field; grupa wskazuje ją przez
    // aria-labelledby, bo `<label for>` nie nazywa zbioru elementów.
    const labelId = await page
      .getByTestId('field-plan')
      .locator('[data-pct-part="field-label"]')
      .getAttribute('id');
    await expect(group).toHaveAttribute('aria-labelledby', labelId!);
    await expect(group.locator('[data-pct-part="group-label"]')).toHaveCount(0);
  });

  test('kliknięcie w etykietę opcji wybiera ją i zaznacza kropkę', async ({
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
   * Kluczowy test: nawigacja strzałkami pochodzi od przeglądarki, bo opcje to
   * natywne <input type="radio"> ze wspólnym `name`. Nie implementujemy
   * własnego roving tabindex — ten test pilnuje, że tak zostaje.
   */
  test('strzałki przełączają opcje bez własnej implementacji (natywna grupa)', async ({
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

  test('strzałki pomijają wyłączoną opcję', async ({ page }) => {
    const group = page.getByTestId('radio-plan');
    const pro = group.locator('pct-radio', { hasText: 'Pro' }).locator('input');
    const enterprise = group
      .locator('pct-radio', { hasText: 'Enterprise' })
      .locator('input');

    await expect(enterprise).toBeDisabled();

    await pro.focus();
    await page.keyboard.press('Space');
    await page.keyboard.press('ArrowDown');

    // Enterprise jest wyłączone, więc nie może zostać wybrane.
    await expect(enterprise).not.toBeChecked();
  });

  test('cała grupa zajmuje jedno miejsce w kolejności Taba', async ({
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

    // Tab wychodzi z grupy, nie przechodzi między opcjami.
    await page.keyboard.press('Tab');
    await expect(free).not.toBeFocused();
    await expect(pro).not.toBeFocused();
  });

  test('obszar klikalny opcji ma minimum 24x24 px', async ({ page }) => {
    const control = page
      .getByTestId('radio-plan')
      .locator('pct-radio')
      .first()
      .locator('input');

    const hit = await control.boundingBox();
    expect(hit!.width).toBeGreaterThanOrEqual(24);
    expect(hit!.height).toBeGreaterThanOrEqual(24);
  });

  test('układ poziomy ustawia aria-orientation', async ({ page }) => {
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
