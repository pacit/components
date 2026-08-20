import { expect, Page, test } from '@playwright/test';
import { visit } from './support/dom';
import { styleOf, systemColors } from './support/css';

/**
 * Forced colours mode (Windows High Contrast, `forced-colors: active`).
 *
 * In that mode the browser swaps EVERY author colour for one from the user
 * palette. The tokens stop meaning anything and every state expressed by colour
 * alone disappears: two different backgrounds become the same rectangle. So the
 * tests do not check "what the colour is" — they check whether states that are
 * meant to differ still differ, and whether what should come from the palette
 * really does (req-a11y-forced-colors).
 *
 * Emulated through `visit(page, path, { media })` — the reason is in `support/dom.ts`.
 */

const FORCED = { forcedColors: 'active' } as const;

/** The background / text colour of an element, as computed by the browser. */
const bg = (page: Page, sel: string) =>
  styleOf(page.locator(sel).first(), 'background-color');

test.describe('forced-colors: active', () => {
  /**
   * A control of the gate. That the media query fires is no proof yet that the
   * browser really swaps the colours — and if it does not, every test below passes
   * on token colours and examines nothing. The reference point is an element with NO
   * forced-colors rules: its colour has to stop being a colour from the library
   * palette.
   */
  test('the emulation really does swap the author colours (a control of the gate)', async ({
    page,
  }) => {
    await visit(page, '/states');
    const fromToken = await styleOf(
      page.getByTestId('idle-button'),
      'background-color',
    );
    expect(fromToken).toBe('rgb(37, 99, 235)'); // --pct-primary, the light theme

    await visit(page, '/states', { media: FORCED });
    expect(
      await page.evaluate(() => matchMedia('(forced-colors: active)').matches),
    ).toBe(true);

    const forced = await styleOf(
      page.getByTestId('idle-button'),
      'background-color',
    );
    expect(forced).not.toBe(fromToken);
  });

  test('the focus ring is drawn in Highlight, not in the border colour', async ({
    page,
  }) => {
    await visit(page, '/states', { media: FORCED });
    const sys = await systemColors(page);

    const input = page.getByTestId('idle-text');
    await input.focus();

    const row = page
      .getByTestId('states-idle')
      .locator('[data-pct-part="field-row"]')
      .first();
    // With no explicit rule the ring gets the forced border colour and merges with
    // the field border — it disappears exactly where it is needed most.
    expect(await styleOf(row, 'outline-color')).toBe(sys.Highlight);
  });

  /**
   * The radio dot was a real defect, not a hypothesis: it is a `<div>` carrying the
   * state by background alone, so the forcing levelled it with the circle background
   * and a checked radio button looked empty.
   */
  test('a checked radio button stays distinguishable from an empty one', async ({
    page,
  }) => {
    await visit(page, '/states', { media: FORCED });

    const checked = page
      .getByTestId('idle-radio')
      .locator('pct-radio[data-pct-checked]')
      .first();
    await expect(checked).toHaveCount(1);

    const dot = await styleOf(
      checked.locator('[data-pct-part="dot"]'),
      'background-color',
    );
    const circle = await styleOf(
      checked.locator('[data-pct-part="circle"]'),
      'background-color',
    );

    expect(dot).not.toBe(circle);
  });

  test('the checkbox tick stands out against the box', async ({ page }) => {
    await visit(page, '/states', { media: FORCED });
    const sys = await systemColors(page);

    const checkbox = page.getByTestId('idle-checkbox');
    await checkbox.locator('[data-pct-part="control"]').check();

    // The part is the icon's box and the drawing sits inside it, painting itself in
    // `currentColor` — so what the mode has to reach is the box's `color`, and what the
    // user sees is the `stroke` the drawing resolves it to (req-api-icons).
    const mark = checkbox.locator('[data-pct-part="mark"]');
    await expect(mark).toBeVisible();
    expect(await styleOf(mark, 'color')).toBe(sys.FieldText);
    expect(await styleOf(mark.locator('svg'), 'stroke')).toBe(sys.FieldText);
    expect(
      await styleOf(
        checkbox.locator('[data-pct-part="box"]'),
        'background-color',
      ),
    ).toBe(sys.Field);
  });

  /**
   * The hardest case: in a list panel an ordinary option, a selected one and the one
   * active from the keyboard differ by background ALONE. After the palette swap all
   * three would be the same rectangle, so the selection was split into two
   * independent channels — the background for the selection, an outline for the
   * keyboard cursor.
   */
  test('in a list panel the selection and the keyboard cursor stay distinguishable', async ({
    page,
  }) => {
    await visit(page, '/select', { media: FORCED });
    const sys = await systemColors(page);

    const trigger = page
      .getByTestId('select-country')
      .locator('[data-pct-part="trigger"]');
    await trigger.click();
    const options = page.locator('[data-pct-part="option"]');
    await expect(options.first()).toBeVisible();

    // The selection: a palette pair of its own, meant in it for exactly list
    // selections.
    await options.nth(1).click();
    await trigger.click();
    const selected = options
      .locator('[data-pct-selected]')
      .or(page.locator('[data-pct-part="option"][data-pct-selected]'));
    expect(await bg(page, '[data-pct-part="option"][data-pct-selected]')).toBe(
      sys.SelectedItem,
    );
    await expect(selected.first()).toBeVisible();

    // An ordinary option stands on the panel surface — so it differs from a selected
    // one.
    expect(
      await bg(page, '[data-pct-part="option"]:not([data-pct-selected])'),
    ).toBe(sys.Canvas);

    // The keyboard cursor: an outline, that is a channel independent of the
    // background. Thanks to that an option both selected and active shows both
    // states at once.
    await trigger.press('ArrowDown');
    const active = page.locator('[data-pct-part="option"][data-pct-active]');
    await expect(active).toHaveCount(1);
    expect(await styleOf(active, 'outline-color')).toBe(sys.Highlight);
    expect(await styleOf(active, 'outline-style')).toBe('solid');
  });

  /**
   * The veil is a translucent black in every theme, and forced colours has no translucent
   * system colour to swap it for. Left alone it would be repainted opaque by the mode's own
   * rules and the page behind it would go on showing through in strips — so the sheet says
   * `Canvas` outright, and the panel keeps its edge in `CanvasText`. Without that edge a
   * dialog in this mode is a rectangle of page on a rectangle of page.
   */
  test('the dialog keeps an edge against the surface it covers', async ({
    page,
  }) => {
    await visit(page, '/dialog', { media: FORCED });
    const sys = await systemColors(page);

    await page.getByTestId('open-basic').click();
    const panel = page.locator('[data-pct-part="panel"]');
    await expect(panel).toBeVisible();

    expect(await bg(page, '[data-pct-part="backdrop"]')).toBe(sys.Canvas);
    expect(await bg(page, '[data-pct-part="panel"]')).toBe(sys.Canvas);
    // The one thing that separates the two is the border, and it comes from the palette.
    expect(await styleOf(panel, 'border-top-color')).toBe(sys.CanvasText);
  });

  /**
   * A tooltip is an inverted surface, and inversion is the first thing this mode takes away:
   * the panel and the page behind it both become `Canvas`. What is left to tell them apart is
   * an edge, and the sheet draws one here and nowhere else — without it a tooltip in this mode
   * is a rectangle of page floating on a rectangle of page.
   */
  test('the tooltip keeps an edge once its inversion is gone', async ({
    page,
  }) => {
    await visit(page, '/tooltip', { media: FORCED });
    const sys = await systemColors(page);

    await page.getByTestId('describes-trigger').hover();
    const panel = page.locator('[data-pct-part="panel"]');
    await expect(panel).toBeVisible();

    expect(await bg(page, '[data-pct-part="panel"]')).toBe(sys.Canvas);
    expect(await styleOf(panel, 'color')).toBe(sys.CanvasText);
    expect(await styleOf(panel, 'border-top-color')).toBe(sys.CanvasText);
    expect(await styleOf(panel, 'border-top-style')).toBe('solid');
  });

  /**
   * A popover draws the page's own surface, so this mode changes nothing about the colour —
   * and takes away the shadow that was separating the panel from the page. The edge is what
   * is left, and it has to be the system's rather than the skin's `border-strong`, which the
   * mode does not keep either.
   */
  test('the popover keeps a system edge once the shadow is gone', async ({
    page,
  }) => {
    await visit(page, '/popover', { media: FORCED });
    const sys = await systemColors(page);

    await page.getByTestId('panel-trigger').click();
    const panel = page.locator('[data-pct-part="panel"]');
    await expect(panel).toBeVisible();

    expect(await bg(page, '[data-pct-part="panel"]')).toBe(sys.Canvas);
    expect(await styleOf(panel, 'color')).toBe(sys.CanvasText);
    expect(await styleOf(panel, 'border-top-color')).toBe(sys.CanvasText);
    expect(await styleOf(panel, 'border-top-style')).toBe('solid');
  });

  test('the disabled state says GrayText in every control', async ({
    page,
  }) => {
    await visit(page, '/states', { media: FORCED });
    const sys = await systemColors(page);

    const cases: Record<string, Promise<string>> = {
      button: styleOf(page.getByTestId('disabled-button'), 'color'),
      'text field': styleOf(page.getByTestId('disabled-text'), 'color'),
      'radio dot': styleOf(
        page
          .getByTestId('disabled-radio')
          .locator('[data-pct-part="dot"]')
          .first(),
        'background-color',
      ),
      'checkbox tick': styleOf(
        page
          .getByTestId('disabled-checkbox')
          .locator('[data-pct-part="mark"] svg'),
        'stroke',
      ),
    };

    for (const [name, measurement] of Object.entries(cases)) {
      expect(await measurement, `${name} does not use GrayText`).toBe(
        sys.GrayText,
      );
    }
  });
});
