import { expect, Locator, test } from '@playwright/test';
import { visit } from './support/dom';

/**
 * The states across the board: the same question put to every control at once.
 *
 * The per-component tests check whether a given state works. What matters here is
 * whether every control understands it **the same way** — because the drift starts
 * with the one that does it its own way.
 */
const CONTROLS = [
  'text',
  'number',
  'select',
  'checkbox',
  'radio',
  'switch',
  'slider',
  'date',
] as const;

/**
 * The element that really takes focus and the disabled state. No single selector
 * points at it: `[pctText]` and `[pctNumber]` **are** the native input (the testid
 * sits on it), the select has a trigger, and the checkbox and the radio group keep
 * their native inputs inside.
 */
function focusTarget(card: Locator, state: string, control: string): Locator {
  const host = card.getByTestId(`${state}-${control}`);
  if (control === 'text' || control === 'number') return host;
  if (control === 'select') return host.locator('[data-pct-part="trigger"]');
  // The date field is a text control the library formats itself, so the element that takes
  // focus is the `<input>` inside — and it is the FIRST one, the calendar button standing
  // beside it in the same row.
  return host.locator('input').first();
}

test.describe('States — a cross-section through every control', () => {
  test.beforeEach(async ({ page }) => {
    await visit(page, '/states');
  });

  /**
   * The contrast gate computes on hex values from the palette, so any **dimming**
   * with `opacity` is invisible to it — a state has to have colour tokens of its own
   * (req-token-no-opacity). So we look for values between 0 and 1: a full `0` is a
   * different technique (the native checkbox control is invisible but still the hit
   * area over the drawn box), not dimmed text.
   */
  test('no state is dimmed with transparency', async ({ page }) => {
    for (const state of ['disabled', 'readonly', 'invalid']) {
      const dimmed = await page
        .getByTestId(`states-${state}`)
        .locator('[data-pct-part], input, button')
        .evaluateAll((els) =>
          els
            .map((el) => ({
              el,
              opacity: Number(getComputedStyle(el).opacity),
            }))
            .filter(({ opacity }) => opacity > 0 && opacity < 1)
            .map(
              ({ el, opacity }) =>
                `${el.tagName.toLowerCase()}[${el.getAttribute('data-pct-part') ?? '—'}] = ${opacity}`,
            ),
        );
      expect(dimmed, `state ${state}`).toEqual([]);
    }
  });

  test('every disabled control is really disabled', async ({ page }) => {
    const card = page.getByTestId('states-disabled');

    for (const control of CONTROLS) {
      await expect(
        focusTarget(card, 'disabled', control),
        `control ${control}`,
      ).toBeDisabled();
    }

    await expect(card.getByTestId('disabled-button')).toBeDisabled();
  });

  /**
   * Read-only is not the same as disabled: the value cannot be changed, but the
   * control stays in the tab order, so a screen reader will read it out.
   */
  test('a read-only control stays focusable', async ({ page }) => {
    const card = page.getByTestId('states-readonly');

    for (const control of CONTROLS) {
      const target = focusTarget(card, 'readonly', control);
      await target.focus();
      await expect(target, `control ${control}`).toBeFocused();
    }
  });

  test('the error is visible, announced and bound to the control', async ({
    page,
  }) => {
    const card = page.getByTestId('states-invalid');
    const errors = card.locator('[data-pct-part="field-error"]');

    // Every control on the card gets its message from the wrapper.
    await expect(errors).toHaveCount(CONTROLS.length);
    for (let i = 0; i < CONTROLS.length; i++) {
      await expect(errors.nth(i)).toHaveAttribute('role', 'alert');
    }

    // The field border signals the error with a colour from a token — in every
    // field that has a border.
    const rows = card.locator('[data-pct-part="field-row"]');
    const colours = await rows.evaluateAll((els) =>
      els
        .filter((el) => getComputedStyle(el).borderTopWidth !== '0px')
        .map((el) => getComputedStyle(el).borderColor),
    );
    expect(colours.length).toBeGreaterThan(0);
    // `--pct-danger` — red.700 since the tone axis moved it one step down the ramp so a
    // quiet button face could carry its label on the page's hover tint (0082).
    expect(new Set(colours)).toEqual(new Set(['rgb(185, 28, 28)']));
  });

  test('the required marker belongs to the wrapper, not to the control', async ({
    page,
  }) => {
    const card = page.getByTestId('states-required');
    const labels = card.locator('[data-pct-part="field-label"]');

    await expect(labels).toHaveCount(4);
    for (let i = 0; i < 4; i++) {
      await expect(labels.nth(i)).toContainText('*');
    }
  });

  test('a button in the loading state blocks itself and announces it through ARIA', async ({
    page,
  }) => {
    const loading = page.getByTestId('loading-button');
    await expect(loading).toBeDisabled();
    await expect(loading).toHaveAttribute('aria-busy', 'true');
    await expect(loading.locator('[data-pct-part="spinner"]')).toBeVisible();
  });
});
