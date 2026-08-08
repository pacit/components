import { expect, Page, test } from '@playwright/test';
import { boxOf, setRtl, visit } from './support/dom';

/**
 * Writing direction (`req-token-logical`).
 *
 * The `check-styles` gate reads the stylesheets and makes sure no physical property
 * of the inline axis stands in them. That condition is necessary and **not
 * sufficient**: a stylesheet can be logical beyond reproach and the layout still
 * not mirror in RTL — because the direction does not reach where it should. The
 * stylesheet says nothing about it; it shows only on the rendered page.
 *
 * That is exactly how the select panel regression came out: `text-align: start` in
 * the stylesheet is correct, and the panel still wrote left to right beside a
 * trigger writing right to left, because the CDK overlay lives as a child of `body`
 * and inherits nothing from the control (`lesson-35` — the theme, the font, and
 * now the direction).
 */

/** The direction computed by the browser, not read off an attribute. */
const directionOf = (page: Page, selector: string) =>
  page
    .locator(selector)
    .first()
    .evaluate((el) => getComputedStyle(el).direction);

test.describe('Writing direction — the layout mirrors in dir="rtl"', () => {
  /**
   * A measurement, not a declaration: in LTR the field affix stands to the left of
   * the control and in RTL to its right. Were the stylesheet physical, both sides
   * would be the same and this test would fire — which makes it the reference
   * control for the whole rest of this file, expressed as geometry.
   */
  test('the field affix moves to the other side of the control', async ({
    page,
  }) => {
    await visit(page, '/field');
    const prefix = page
      .getByTestId('field-price')
      .locator('[data-pct-part="field-prefix"]');
    const control = page
      .getByTestId('field-price')
      .locator('[data-pct-part="field-control"]');

    const ltrPrefix = await boxOf(prefix);
    const ltrControl = await boxOf(control);
    expect(ltrPrefix.x).toBeLessThan(ltrControl.x);

    await setRtl(page);

    const rtlPrefix = await boxOf(prefix);
    const rtlControl = await boxOf(control);
    expect(rtlPrefix.x).toBeGreaterThan(rtlControl.x);
  });

  test('the shell and the card stage take the direction over', async ({
    page,
  }) => {
    await visit(page, '/button');
    await setRtl(page);

    await expect(page.getByTestId('demo-stage').first()).toHaveAttribute(
      'dir',
      'rtl',
    );
    expect(await directionOf(page, '[data-testid="demo-stage"]')).toBe('rtl');
  });

  /**
   * A regression straight out of `lesson-35`, this time on the third inherited
   * property. The panel is in a CDK overlay, that is outside `app-root`, so `dir`
   * from the shell does NOT reach it — the direction has to be carried over
   * explicitly, the same as the theme and the font. Measured before the fix:
   * `direction: rtl` on the trigger against `ltr` on the panel, with a stylesheet
   * carrying not one physical property.
   *
   * The test compares the panel WITH THE TRIGGER rather than with a fixed value: the
   * panel is meant to be an extension of that control, so if the direction ever
   * becomes scoped, this assertion still says the same thing.
   */
  test('the select panel inherits the direction from the trigger, not from body', async ({
    page,
  }) => {
    await visit(page, '/select');
    await setRtl(page);

    const trigger = page
      .getByTestId('select-country')
      .locator('[data-pct-part="trigger"]');
    await trigger.click();

    const panel = page.locator('[data-pct-part="panel"]');
    await expect(panel).toBeVisible();

    const triggerDir = await trigger.evaluate(
      (el) => getComputedStyle(el).direction,
    );
    const panelDir = await panel.evaluate(
      (el) => getComputedStyle(el).direction,
    );

    expect(triggerDir).toBe('rtl');
    expect(panelDir).toBe(triggerDir);

    // The panel really is outside the shell tree — without this the assertion above
    // would pass through ordinary inheritance and examine nothing.
    expect(await panel.evaluate((el) => el.closest('app-root') === null)).toBe(
      true,
    );
  });
});
