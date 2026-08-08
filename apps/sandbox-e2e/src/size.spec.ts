import { expect, test } from '@playwright/test';
import { boxOf, visit } from './support/dom';

/**
 * The size of a control is one axis for the whole library (req-api-size): a field
 * row and a button of the same size have **the same** height, because both take it
 * from the `--pct-control-height-*` token, not from padding plus line height.
 *
 * The test measures real layout in a browser — the only credible proof for styles
 * (lesson-13); in jsdom there is nothing to measure.
 */
const SIZES = [
  { size: 'sm', height: 28, fontSize: '13px' },
  { size: 'md', height: 36, fontSize: '14px' },
  { size: 'lg', height: 44, fontSize: '16px' },
] as const;

test.describe('Sizes — one axis for the field and the button', () => {
  test.beforeEach(async ({ page }) => {
    await visit(page, '/size');
  });

  for (const { size, height, fontSize } of SIZES) {
    test(`the field and the button at size ${size} have the same height`, async ({
      page,
    }) => {
      const row = page
        .getByTestId(`size-field-${size}`)
        .locator('[data-pct-part="field-row"]');
      const button = page.getByTestId(`size-button-${size}`);

      const rowBox = await boxOf(row);
      const buttonBox = await boxOf(button);

      expect(rowBox.height).toBeCloseTo(buttonBox.height, 1);
      // The value outright, not equality alone: had both dropped to the text line
      // height, equality would still hold and the controls would be too short.
      expect(rowBox.height).toBe(height);
    });

    test(`a field with a list at size ${size} keeps the same height and text size`, async ({
      page,
    }) => {
      // A select inside the wrapper gives its size up to it — otherwise two `size`
      // values in one field would give a border of one size and text of another.
      const field = page.getByTestId(`size-select-${size}`);
      const row = field.locator('[data-pct-part="field-row"]');
      const trigger = field.locator('[data-pct-part="trigger"]');

      expect((await boxOf(row)).height).toBe(height);
      await expect(trigger).toHaveCSS('font-size', fontSize);
    });
  }

  for (const { size, height } of SIZES) {
    test(`a field with an affix at size ${size} does not stretch the row`, async ({
      page,
    }) => {
      // The affix (a unit in the suffix slot) lies inside the border, so it has no
      // right to change its height — otherwise a field with a unit would stand out
      // from one without it and from the button.
      const row = page
        .getByTestId(`size-number-${size}`)
        .locator('[data-pct-part="field-row"]');
      expect((await boxOf(row)).height).toBe(height);
    });
  }

  /**
   * The `bare` appearance (a checkbox, a radio group) deliberately does NOT join
   * the shared axis: with no border there is nothing to line up with the button, and
   * a forced height would add empty space to those controls (req-api-size).
   */
  test('the bare appearance does not scale the height but keeps the touch threshold', async ({
    page,
  }) => {
    for (const { size, height } of SIZES) {
      const bare = page.getByTestId(`size-checkbox-${size}`);
      const row = await boxOf(bare.locator('[data-pct-part="field-row"]'));
      const control = await boxOf(
        bare.locator('[data-pct-part="field-control"]'),
      );

      // The same height whatever the size — that is `--pct-target-min`,
      // not `--pct-control-height-*`.
      expect(row.height).toBe(24);
      expect(control.height).toBeGreaterThanOrEqual(24);

      // Every size on the axis is taller than the touch threshold (28/36/44 > 24),
      // so the difference has to show always — with no condition in the test.
      const boxed = await boxOf(
        page
          .getByTestId(`size-field-${size}`)
          .locator('[data-pct-part="field-row"]'),
      );
      expect(boxed.height).toBe(height);
      expect(row.height).toBeLessThan(boxed.height);
    }
  });

  test('the size scales the field text along with the button', async ({
    page,
  }) => {
    for (const { size, fontSize } of SIZES) {
      await expect(
        page.getByTestId(`size-field-${size}`).locator('input'),
      ).toHaveCSS('font-size', fontSize);
      await expect(page.getByTestId(`size-button-${size}`)).toHaveCSS(
        'font-size',
        fontSize,
      );
    }
  });

  test('every size meets the touch-area threshold (SC 2.5.8)', async ({
    page,
  }) => {
    // The smallest size is the threshold here: a 28 px border is a 26 px control
    // column, still above 24 px (req-a11y-touch).
    for (const { size } of SIZES) {
      const control = page
        .getByTestId(`size-field-${size}`)
        .locator('[data-pct-part="field-control"]');
      expect((await boxOf(control)).height).toBeGreaterThanOrEqual(24);
    }
  });
});
