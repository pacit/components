import { expect, Page, test } from '@playwright/test';
import { setRtl, visit } from './support/dom';

/**
 * The visual tests (req-quality-e2e).
 *
 * The whole method of this project rests on measuring in a browser rather than on
 * reading a stylesheet — a screenshot is its natural extension. The geometry tests
 * check what somebody thought to ask about ("does the column tile the border with
 * no gaps"); a screenshot also catches what nobody asked about, because it compares
 * the WHOLE image. The regressions from lesson-27 and lesson-34 were exactly of
 * that kind.
 *
 * The baselines live in `src/__screenshots__/{platform}/`.
 * After a deliberate change of appearance:
 *
 *     npx nx e2e sandbox-e2e -- --update-snapshots visual.spec.ts
 *
 * and review the differences in the commit — that is the moment when a reviewer
 * sees the visual change instead of guessing it from an SCSS diff.
 */

const VIEWPORT = { width: 1280, height: 900 };

/**
 * Sets the stage so that a screenshot depends on the components, not on the machine.
 *
 * The typeface matters most here: the sandbox uses `system-ui`, which resolves to
 * something different on every system (Noto Sans locally, usually Liberation or
 * DejaVu on a CI runner). A difference in font metrics shifts the layout enough for
 * the baselines to stop matching because of the machine rather than the code — and
 * the test turns into a generator of false alarms. So we pin a typeface that exists
 * both locally and in the CI image (`playwright install --with-deps` pulls in
 * `fonts-liberation`).
 */
async function stage(page: Page, path: string): Promise<void> {
  await page.setViewportSize(VIEWPORT);
  await visit(page, path);
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        font-family: 'Liberation Sans', Arial, sans-serif !important;
      }
      code, kbd, samp, pre {
        font-family: 'Liberation Mono', 'Courier New', monospace !important;
      }
    `,
  });
  // Swapping the typeface recomputes the layout — without this a screenshot can
  // catch the state from before the reflow. `fonts.ready` waits for every typeface
  // in use to settle.
  await page.evaluate(() => document.fonts.ready);
}

/**
 * The cards to compare. A screenshot of an ELEMENT, not of the whole page: a card
 * contains neither the navigation nor the settings bar, so a change in the sandbox
 * shell does not invalidate the baselines of every component at once.
 */
const CARDS: ReadonlyArray<
  readonly [path: string, testId: string, name: string]
> = [
  ['/button', 'demo-variants', 'button-variants'],
  ['/button', 'demo-sizes', 'button-sizes'],
  ['/button', 'demo-states', 'button-states'],
  ['/button', 'demo-dark', 'button-dark-card'],
  ['/field', 'demo-basics', 'field-basics'],
  ['/field', 'demo-affix', 'field-affixes'],
  ['/field', 'demo-aux', 'field-aux-slots'],
  ['/text', 'demo-types', 'text-types'],
  ['/number', 'demo-price', 'number-amount'],
  ['/checkbox', 'demo-in-field', 'checkbox-in-wrapper'],
  ['/radio', 'demo-in-field', 'radio-in-wrapper'],
  ['/select', 'demo-in-field', 'select-in-wrapper'],
  ['/size', 'demo-axis', 'size-axis'],
  ['/states', 'states-disabled', 'states-disabled'],
  ['/states', 'states-invalid', 'states-invalid'],
];

test.describe('Appearance — compared with the baseline', () => {
  for (const [path, testId, name] of CARDS) {
    test(`${name}`, async ({ page }) => {
      await stage(page, path);
      await expect(page.getByTestId(testId)).toHaveScreenshot(`${name}.png`);
    });
  }

  /**
   * The list panel lives in a CDK overlay, that is outside the card tree — the one
   * element of the library that shows on no screenshot of the resting state.
   */
  test('select-panel-open', async ({ page }) => {
    await stage(page, '/select');
    await page
      .getByTestId('select-country')
      .locator('[data-pct-part="trigger"]')
      .click();

    const panel = page.locator('[data-pct-part="panel"]');
    await expect(panel).toBeVisible();
    await expect(panel).toHaveScreenshot('select-panel-open.png');
  });

  /**
   * The same panel with headings in it. A group's label is the one thing here that is drawn
   * and never interacted with — no state, no cursor, nothing a behavioural case would catch
   * if its weight or its spacing went.
   */
  test('select-panel-groups', async ({ page }) => {
    await stage(page, '/select');
    await page
      .getByTestId('select-groups')
      .locator('[data-pct-part="trigger"]')
      .click();

    const panel = page.locator('[data-pct-part="panel"]');
    await expect(panel).toBeVisible();
    await expect(panel).toHaveScreenshot('select-panel-groups.png');
  });

  /**
   * The filtering triggers at rest. This is the one drawing of the step no behavioural case
   * touches: an `<input>` wearing the button's border, and the arrow standing over its end
   * padding rather than inside a flex row — the two ways of putting one icon in one box, which
   * have to come out as the same box.
   */
  test('select-filter-trigger', async ({ page }) => {
    await stage(page, '/select');

    const demo = page.getByTestId('demo-filter').locator('.stack');
    await expect(demo).toBeVisible();
    await expect(demo).toHaveScreenshot('select-filter-trigger.png');
  });

  /**
   * The same panel taking many answers. The mark on a chosen row is drawn and never touched:
   * its size, its place at the end of the row and the gap before it are what no behavioural
   * case would catch — and two rows chosen at once is the state that says the mark and the
   * surface are two channels rather than one.
   */
  test('select-panel-multiple', async ({ page }) => {
    await stage(page, '/select');
    await page
      .getByTestId('select-multi')
      .locator('[data-pct-part="trigger"]')
      .click();

    const panel = page.locator('[data-pct-part="panel"]');
    await expect(panel).toBeVisible();
    await expect(panel).toHaveScreenshot('select-panel-multiple.png');
  });

  /**
   * The modal, which shows on no screenshot of a resting page: the panel is an overlay and the
   * veil covers everything behind it. The shot is of the whole viewport rather than of the
   * panel, because the veil IS part of what this component draws — its darkness over the page
   * is the signal that the page has stopped answering.
   */
  test('dialog-open', async ({ page }) => {
    await stage(page, '/dialog');
    await page.getByTestId('open-with-select').click();
    await expect(page.locator('[data-pct-part="panel"]')).toBeVisible();

    await expect(page).toHaveScreenshot('dialog-open.png');
  });

  /**
   * The tooltip, which shows on no screenshot of a resting page. The shot is of the card
   * rather than of the panel alone: what this component draws is a surface that answers the
   * page's own — an inverted one — and a picture of the panel by itself would say nothing
   * about the contrast between the two.
   */
  test('tooltip-open', async ({ page }) => {
    await stage(page, '/tooltip');
    await page.getByTestId('describes-trigger').hover();
    const panel = page.locator('[data-pct-part="panel"]');
    await expect(panel).toBeVisible();
    // The enter is a fade, so the shot has to wait for it to have finished.
    await expect(panel).toHaveCSS('opacity', '1');

    await expect(page.getByTestId('demo-describes')).toHaveScreenshot(
      'tooltip-open.png',
    );
  });

  /**
   * The popover, which shows on no screenshot of a resting page. The whole viewport and not
   * the card, for the dialog's reason and one of its own: the panel is drawn OUTSIDE the card
   * it belongs to — an overlay is a child of `body` — so a shot of the card would catch its
   * top edge and nothing else. And what this component draws is the page's own surface, unlike
   * the tooltip's inverted one, so the page around it is half the picture: the edge and the
   * shadow are all there is between the two.
   */
  test('popover-open', async ({ page }) => {
    await stage(page, '/popover');
    await page.getByTestId('panel-trigger').click();
    const panel = page.locator('[data-pct-part="panel"]');
    await expect(panel).toBeVisible();
    // The enter is a fade, so the shot has to wait for it to have finished.
    await expect(panel).toHaveCSS('opacity', '1');

    await expect(page).toHaveScreenshot('popover-open.png');
  });

  /**
   * The menu, with a submenu open beside it — the arrangement no resting page shows and the
   * one where the picture is worth taking: two panels of the same surface, drawn side by side
   * with nothing but their edges and shadows between them and the page.
   */
  test('menu-open', async ({ page }) => {
    await stage(page, '/menu');
    const trigger = page.getByTestId('file-trigger');
    // Into the middle of the window first. A panel that does not fit is pushed back into the
    // viewport rather than clipped, so a trigger near the bottom of the page gives a picture
    // of the push instead of a picture of the menu.
    await trigger.evaluate((el) => el.scrollIntoView({ block: 'center' }));
    await trigger.click();
    const first = page.locator('[role="menu"]').first();
    await expect(first).toBeVisible();
    await page.getByTestId('file-move').hover();
    await expect(page.locator('[role="menu"]')).toHaveCount(2);
    // The enter is a fade, so the shot has to wait for both of them to have finished.
    await expect(first).toHaveCSS('opacity', '1');
    await expect(page.locator('[role="menu"]').nth(1)).toHaveCSS(
      'opacity',
      '1',
    );

    await expect(page).toHaveScreenshot('menu-open.png');
  });

  /**
   * The same set of controls in the dark theme. The theme is a cross-cutting axis,
   * so a regression in the semantic layer of the tokens will show up here rather
   * than in the light screenshots.
   */
  test('states-dark', async ({ page }) => {
    await stage(page, '/all');
    await expect(page.getByTestId('panel-scoped')).toHaveScreenshot(
      'states-dark.png',
    );
  });
});

/**
 * The same set in `dir="rtl"` (req-token-logical).
 *
 * The `check-styles` gate reads the stylesheets and fires on a physical property.
 * That condition is necessary and not sufficient: a stylesheet can be logical beyond
 * reproach and the layout still not mirror — because the direction does not reach
 * where it should (the CDK overlay), or because the asymmetry is carried by an SVG,
 * by DOM order or by the sign of an offset. None of that shows in a stylesheet; all
 * of it shows in a picture.
 *
 * The list is SHORTER than `CARDS` and that is a decision, not neglect: an RTL
 * screenshot carries information where the layout is asymmetric along the inline
 * axis — the field affixes, a control icon, a box before a label. A symmetric card
 * would give a second picture differing only in where the text sits in a paragraph,
 * and would cost the same attention at every deliberate change of appearance.
 */
const CARDS_RTL: ReadonlyArray<
  readonly [path: string, testId: string, name: string]
> = [
  ['/button', 'demo-variants', 'button-variants'],
  ['/field', 'demo-affix', 'field-affixes'],
  ['/field', 'demo-aux', 'field-aux-slots'],
  ['/text', 'demo-types', 'text-types'],
  ['/number', 'demo-price', 'number-amount'],
  ['/checkbox', 'demo-in-field', 'checkbox-in-wrapper'],
  ['/radio', 'demo-in-field', 'radio-in-wrapper'],
  ['/select', 'demo-in-field', 'select-in-wrapper'],
];

test.describe('Appearance in RTL — compared with the baseline', () => {
  for (const [path, testId, name] of CARDS_RTL) {
    test(`${name}-rtl`, async ({ page }) => {
      await stage(page, path);
      await setRtl(page);
      await expect(page.getByTestId(testId)).toHaveScreenshot(
        `${name}-rtl.png`,
      );
    });
  }

  /**
   * The panel in RTL has a baseline of its own, because it is the one place where
   * the direction does not come from the cascade but is carried over from the trigger
   * by hand (`lesson-35`). The regression is already caught by `rtl.spec.ts` through
   * its `direction` measurement; this screenshot also shows which side the panel is
   * anchored to and how the option content is laid out.
   */
  test('dialog-open-rtl', async ({ page }) => {
    await stage(page, '/dialog');
    await setRtl(page);
    await page.getByTestId('open-with-select').click();
    await expect(page.locator('[data-pct-part="panel"]')).toBeVisible();

    await expect(page).toHaveScreenshot('dialog-open-rtl.png');
  });

  /**
   * The mark on a chosen row is the one thing in this panel placed along the inline axis:
   * `margin-inline-start: auto` puts it at the END of the row, so in RTL it belongs on the
   * left. A stylesheet that says so proves nothing on its own — the direction has to reach
   * the panel, which is an overlay outside the host tree.
   */
  test('select-panel-multiple-rtl', async ({ page }) => {
    await stage(page, '/select');
    await setRtl(page);
    await page
      .getByTestId('select-multi')
      .locator('[data-pct-part="trigger"]')
      .click();

    const panel = page.locator('[data-pct-part="panel"]');
    await expect(panel).toBeVisible();
    await expect(panel).toHaveScreenshot('select-panel-multiple-rtl.png');
  });

  /**
   * The same triggers mirrored. The arrow of a text trigger is the one icon in this library
   * placed by `position: absolute`, and `inset-inline-end` is what carries it to the other
   * side — a property that reads correctly in a stylesheet and proves nothing until a
   * direction is set.
   */
  test('select-filter-trigger-rtl', async ({ page }) => {
    await stage(page, '/select');
    await setRtl(page);

    const demo = page.getByTestId('demo-filter').locator('.stack');
    await expect(demo).toBeVisible();
    await expect(demo).toHaveScreenshot('select-filter-trigger-rtl.png');
  });

  test('select-panel-open-rtl', async ({ page }) => {
    await stage(page, '/select');
    await setRtl(page);
    await page
      .getByTestId('select-country')
      .locator('[data-pct-part="trigger"]')
      .click();

    const panel = page.locator('[data-pct-part="panel"]');
    await expect(panel).toBeVisible();
    await expect(panel).toHaveScreenshot('select-panel-open-rtl.png');
  });
});
