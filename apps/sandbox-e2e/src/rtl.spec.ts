import { expect, Page, test } from '@playwright/test';
import { styleOf } from './support/css';
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

  /**
   * The pager is a row with a direction of its own: the steppers stand at the two ends and
   * the page numbers ascend between them. Under `rtl` all of that has to turn round with no
   * rule to help it — the strip is a flex row of logical properties, and the chevrons point
   * by a quarter turn of one symmetric drawing rather than by two icon names, so nothing in
   * the stylesheet knows which way is forward.
   *
   * Geometry, not attributes: a physical `margin-left` in this row would leave the DOM order
   * intact and the picture wrong, which is the case this file exists for.
   */
  test('the pager turns round: previous to the right, the numbers descending', async ({
    page,
  }) => {
    await visit(page, '/pagination');
    const pager = page.getByTestId('pagination-few');
    const previous = pager.locator('[data-pct-part="previous"]');
    const next = pager.locator('[data-pct-part="next"]');
    const first = pager.locator('[data-pct-part="page"]').first();

    const ltrPrevious = await boxOf(previous);
    const ltrNext = await boxOf(next);
    expect(ltrPrevious.x).toBeLessThan(ltrNext.x);

    await setRtl(page);
    expect(await directionOf(page, 'pct-pagination')).toBe('rtl');

    const rtlPrevious = await boxOf(previous);
    const rtlNext = await boxOf(next);
    expect(rtlPrevious.x).toBeGreaterThan(rtlNext.x);

    // Page 1 follows the stepper it comes after, which is the reading that says the whole row
    // mirrored rather than the two ends swapping places.
    const rtlFirst = await boxOf(first);
    expect(rtlFirst.x).toBeLessThan(rtlPrevious.x);
  });

  /**
   * A progress bar has one direction and it is the reading direction: the fill grows from the
   * start edge. Nothing in the stylesheet knows which edge that is — the fill is placed by
   * `inset-inline-start` and the band's keyframes animate the same property, so the mirroring
   * is the platform's arithmetic rather than a rule of ours (`req-token-logical`).
   *
   * Geometry, not attributes: a physical `left` here would leave the DOM intact and the
   * picture wrong, which is the case this file exists for.
   */
  test('a progress bar fills from the other edge', async ({ page }) => {
    await visit(page, '/progress');
    const bar = page.getByTestId('progress-value');
    const groove = bar.locator('[data-pct-part="track"]');
    const fill = bar.locator('[data-pct-part="fill"]');

    const ltrGroove = await boxOf(groove);
    const ltrFill = await boxOf(fill);
    expect(ltrFill.x).toBeCloseTo(ltrGroove.x, 0);

    await setRtl(page);
    expect(await directionOf(page, 'pct-progress')).toBe('rtl');

    const rtlGroove = await boxOf(groove);
    const rtlFill = await boxOf(fill);
    expect(rtlFill.x + rtlFill.width).toBeCloseTo(
      rtlGroove.x + rtlGroove.width,
      0,
    );
    expect(rtlFill.x).toBeGreaterThan(rtlGroove.x);
  });

  /**
   * A paragraph's last line is short at its END, and which edge that is nobody wrote down: the
   * bar is placed by `inline-size` inside a grid row, so the start edge is the one the writing
   * direction hands it. The sheen inside it travels the same way, by `inset-inline-start`.
   *
   * Geometry again, and it has to be: the DOM is identical in both directions, so a physical
   * `left` here would leave every attribute right and the picture mirrored.
   */
  test('a skeleton’s short last line keeps to the reading direction', async ({
    page,
  }) => {
    await visit(page, '/skeleton');
    const host = page.getByTestId('skeleton-text');
    const last = host.locator('[data-pct-part="track"]').last();

    const ltrHost = await boxOf(host);
    const ltrLast = await boxOf(last);
    expect(ltrLast.width).toBeLessThan(ltrHost.width);
    expect(ltrLast.x).toBeCloseTo(ltrHost.x, 0);

    await setRtl(page);
    expect(await directionOf(page, 'pct-skeleton')).toBe('rtl');

    const rtlHost = await boxOf(host);
    const rtlLast = await boxOf(last);
    expect(rtlLast.x + rtlLast.width).toBeCloseTo(rtlHost.x + rtlHost.width, 0);
    expect(rtlLast.x).toBeGreaterThan(rtlHost.x);
  });

  /**
   * A chips row is reading order twice over: the first value stands at the reading start of
   * the row, and inside every pill the cross stands at the reading END of its label — both
   * placed by flex order and a logical gap, with not one physical property to leave behind.
   * The geometry is the reading: the same DOM has to put the first chip on the right and
   * every cross on its label's left once the direction flips.
   */
  test('a chips row and the cross inside each pill follow the reading direction', async ({
    page,
  }) => {
    await visit(page, '/chips');
    const row = page.getByTestId('row');
    const chips = row.locator('pct-chip');
    const first = chips.first();
    const label = first.locator('[data-pct-part="label"]');
    const cross = first.locator('[data-pct-part="remove"]');

    const ltrFirst = await boxOf(first);
    const ltrSecond = await boxOf(chips.nth(1));
    expect(ltrFirst.x).toBeLessThan(ltrSecond.x);
    expect((await boxOf(cross)).x).toBeGreaterThan((await boxOf(label)).x);

    await setRtl(page);
    expect(await directionOf(page, 'pct-chips')).toBe('rtl');

    const rtlFirst = await boxOf(first);
    const rtlSecond = await boxOf(chips.nth(1));
    expect(rtlFirst.x).toBeGreaterThan(rtlSecond.x);
    expect((await boxOf(cross)).x).toBeLessThan((await boxOf(label)).x);
  });

  /**
   * A breadcrumb is reading order made into a picture: the trail descends the hierarchy in
   * the writing direction, and every separator points FORWARD — a direction no stylesheet
   * rule knows by name. The row mirrors by flex order and a logical gap; the chevron is one
   * symmetric drawing turned a quarter, `:dir(rtl)` turning it the other way (the
   * calendar's selector). Geometry first — the separator has to change sides against its
   * own link — and then the turn itself, read off the computed style, because a symmetric
   * box photographs the same both ways.
   */
  test('the trail turns round and every separator points the other way', async ({
    page,
  }) => {
    await visit(page, '/breadcrumb');
    const trail = page.getByTestId('trail');
    const crumbs = trail.locator('pct-crumb');
    const second = crumbs.nth(1);
    const separator = second.locator('[data-pct-part="separator"]');
    const link = second.locator('a');

    const ltrFirst = await boxOf(crumbs.first());
    const ltrSecond = await boxOf(second);
    expect(ltrFirst.x).toBeLessThan(ltrSecond.x);
    expect((await boxOf(separator)).x).toBeLessThan((await boxOf(link)).x);
    expect(await styleOf(separator, 'rotate')).toBe('-90deg');

    await setRtl(page);
    expect(await directionOf(page, 'pct-breadcrumb')).toBe('rtl');

    const rtlFirst = await boxOf(crumbs.first());
    const rtlSecond = await boxOf(second);
    expect(rtlFirst.x).toBeGreaterThan(rtlSecond.x);
    expect((await boxOf(separator)).x).toBeGreaterThan((await boxOf(link)).x);
    expect(await styleOf(separator, 'rotate')).toBe('90deg');
  });
});
