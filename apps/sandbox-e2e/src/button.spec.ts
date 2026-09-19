import { expect, test } from '@playwright/test';
import { visit } from './support/dom';

test.describe('PctButton', () => {
  test.beforeEach(async ({ page }) => {
    await visit(page, '/button');
  });

  test('renders the library page and the buttons', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('@pacit/components');
    await expect(page.locator('button[pctButton]').first()).toBeVisible();
  });

  test('a solid button takes its background from a token (--pct-button-bg)', async ({
    page,
  }) => {
    const bg = await page
      .getByTestId('btn-solid')
      .evaluate((el) => getComputedStyle(el).backgroundColor);
    // --pct-primary = blue-600 = #2563eb
    expect(bg).toBe('rgb(37, 99, 235)');
  });

  test('loading shows part=spinner and blocks the button', async ({ page }) => {
    const loading = page.getByTestId('btn-loading');
    await expect(loading).toBeDisabled();
    await expect(loading.locator('[data-pct-part="spinner"]')).toBeVisible();
  });

  test('a disabled button is not dimmed with opacity', async ({ page }) => {
    // The states have colour tokens of their own — opacity would change the
    // contrast in a way the gate cannot see (req-token-no-opacity).
    await expect(page.getByTestId('btn-disabled')).toHaveCSS('opacity', '1');
  });

  /**
   * The tone axis (0081). The values are written out rather than read from the skin: a case
   * that resolved `--pct-danger` at run time would agree with the stylesheet about anything,
   * including a tone silently pointing at the wrong family.
   */
  const TONES = {
    danger: {
      base: 'rgb(185, 28, 28)', // red.700
      tint: 'rgb(254, 226, 226)', // red.100
      onTint: 'rgb(153, 27, 27)', // red.800
    },
    warning: {
      base: 'rgb(180, 83, 9)', // amber.700
      tint: 'rgb(254, 243, 199)', // amber.100
      onTint: 'rgb(146, 64, 14)', // amber.800
    },
    success: {
      base: 'rgb(21, 128, 61)', // green.700
      tint: 'rgb(220, 252, 231)', // green.100
      onTint: 'rgb(22, 101, 52)', // green.800
    },
    info: {
      base: 'rgb(37, 99, 235)', // blue.600 — the brand blue, deliberately
      tint: 'rgb(219, 234, 254)', // blue.100
      onTint: 'rgb(29, 78, 216)', // blue.700
    },
  };

  for (const [tone, c] of Object.entries(TONES)) {
    test(`the ${tone} tone paints all four faces from its own family`, async ({
      page,
    }) => {
      const read = (face: string) =>
        page.getByTestId(`btn-${tone}-${face}`).evaluate((el) => {
          const s = getComputedStyle(el);
          return { bg: s.backgroundColor, fg: s.color, edge: s.borderTopColor };
        });

      // solid — the fill is the tone, the label the pair written for it
      const solid = await read('solid');
      expect(solid.bg).toBe(c.base);
      expect(solid.fg).toBe('rgb(255, 255, 255)');
      expect(solid.edge).toBe(c.base);

      // the quiet faces — the tone is the LABEL, and the ground stays the page's
      for (const face of ['outline', 'ghost']) {
        const quiet = await read(face);
        expect(quiet.fg).toBe(c.base);
        expect(quiet.bg).toBe('rgba(0, 0, 0, 0)');
      }
      expect((await read('outline')).edge).toBe(c.base);

      // soft — the tint is the ground and the tint's own text stands on it
      const soft = await read('soft');
      expect(soft.bg).toBe(c.tint);
      expect(soft.fg).toBe(c.onTint);
    });
  }

  test('a quiet face answers the pointer with the page tint, not with the tone', async ({
    page,
  }) => {
    // Measured, and the reason the other reading was dropped: hovering onto the tone's own
    // tint puts the label at 3.00–5.30:1, under the threshold on five of the eight tone-and-
    // theme rows — `info` on both.
    const outline = page.getByTestId('btn-danger-outline');
    await outline.hover();
    await expect(outline).toHaveCSS('background-color', 'rgb(241, 245, 249)'); // slate.100
    await expect(outline).toHaveCSS('color', 'rgb(185, 28, 28)');
  });

  test('a toned soft face answers the pointer and the press', async ({
    page,
  }) => {
    // The tint and its hover tint are two measured pairs, and a face that never reaches the
    // second one is a token declared and never painted. Both the untoned and every toned face
    // are read here, because what makes this go wrong is a TIE: the rule that paints hover and
    // the rule that dressed a toned face once carried the same specificity, and then only the
    // source order decided. The press is read too — it is the suite's only reading of `:active`
    // on a button, and `--pct-button-bg-active` had none at all before it.
    for (const [testId, rest, pressed] of [
      ['btn-soft', 'rgb(219, 234, 254)', 'rgb(191, 219, 254)'], // primary-100 -> -200
      ['btn-danger-soft', 'rgb(254, 226, 226)', 'rgb(254, 202, 202)'], // danger-100 -> -200
      ['btn-warning-soft', 'rgb(254, 243, 199)', 'rgb(253, 230, 138)'],
      ['btn-success-soft', 'rgb(220, 252, 231)', 'rgb(187, 247, 208)'],
      ['btn-info-soft', 'rgb(219, 234, 254)', 'rgb(191, 219, 254)'],
    ] as const) {
      const button = page.getByTestId(testId);
      await expect(button).toHaveCSS('background-color', rest);

      await button.hover();
      await expect(button).toHaveCSS('background-color', pressed);

      // and held down, where the same tint answers — the face has one tint for both states
      await page.mouse.down();
      await expect(button).toHaveCSS('background-color', pressed);
      await page.mouse.up();

      await page.mouse.move(0, 0);
      await expect(button).toHaveCSS('background-color', rest);
    }
  });

  test('the grey of a disabled button outranks the tone it was still asked for', async ({
    page,
  }) => {
    // The attribute stays — the unit case holds that — and what must not stay is the paint:
    // a control that cannot be pressed must not look like the press it refuses.
    const off = page.getByTestId('btn-danger-disabled');
    await expect(off).toHaveAttribute('data-pct-tone', 'danger');
    await expect(off).toHaveCSS('background-color', 'rgb(241, 245, 249)'); // surface-disabled
    await expect(off).toHaveCSS('color', 'rgb(100, 116, 139)'); // text-disabled
  });

  test('the hero keeps its gradient under the pointer', async ({ page }) => {
    // `background` is a shorthand and resets `background-image`. The hover rule stands at two
    // attributes and the hero face at one, so painting hover with the shorthand took the drift
    // out from under the pointer — the reading that made the rule paint `background-color`.
    const hero = page.getByTestId('btn-hero');
    const gradient = (el: Element) => getComputedStyle(el).backgroundImage;

    expect(await hero.evaluate(gradient)).toContain('linear-gradient');
    await hero.hover();
    expect(await hero.evaluate(gradient)).toContain('linear-gradient');
  });
});

/**
 * The face on the other element (`0071`). What is measured is what the widening could
 * break and a unit case cannot see: that the link is still a link to the accessibility
 * tree, that it is the same object to the eye as the button beside it, that the ring is
 * the same ring, and that a disabled link goes nowhere — by pointer or by keyboard.
 */
test.describe('PctButton — the same face on a link', () => {
  test.beforeEach(async ({ page }) => {
    await visit(page, '/button');
  });

  test('a link keeps its role and its name', async ({ page }) => {
    await expect(page.getByTestId('demo-links')).toMatchAriaSnapshot(`
      - link "Get started"
      - link "Hero link"
      - link "Disabled link"
      - button "Get started"
    `);
  });

  test('it is the same object as the button beside it, minus the underline', async ({
    page,
  }) => {
    const read = (testId: string) =>
      page.getByTestId(testId).evaluate((el) => {
        const s = getComputedStyle(el);
        return {
          face: [
            s.height,
            s.paddingInlineStart,
            s.paddingInlineEnd,
            s.borderRadius,
            s.fontSize,
            s.fontWeight,
            s.backgroundColor,
            s.color,
            s.display,
          ].join(' · '),
          underline: s.textDecorationLine,
        };
      });

    const link = await read('link-solid');
    const button = await read('link-twin');

    expect(
      link.face,
      'a link wearing the face is not the button beside it',
    ).toBe(button.face);
    // The underline is the one thing a link gives up here: the face carries its own
    // hover, so the change is never colour alone (0071).
    expect(link.underline).toBe('none');
    expect(button.underline).toBe('none');
  });

  test("the keyboard ring is the button's ring, and a disabled link still takes focus", async ({
    page,
  }) => {
    const ring = (testId: string) =>
      page.getByTestId(testId).evaluate((el) => {
        const s = getComputedStyle(el);
        return [s.outlineStyle, s.outlineWidth, s.outlineColor].join(' · ');
      });

    // A real keyboard, because `:focus-visible` is an answer to how focus arrived and a
    // programmatic `.focus()` is not that answer (the field's own case, one spec over).
    await page.getByTestId('link-solid').focus();
    await page.keyboard.press('Tab');
    await expect(page.getByTestId('link-hero')).toBeFocused();
    const lit = await ring('link-hero');

    // `aria-disabled` is a state, not a removal: the link stays in the tab order so a
    // reader can find it and be told why it does nothing.
    await page.keyboard.press('Tab');
    await expect(page.getByTestId('link-disabled')).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.getByTestId('link-twin')).toBeFocused();
    expect(lit, 'the link and the button do not light alike').toBe(
      await ring('link-twin'),
    );
    expect(lit).toContain('solid');
  });

  /**
   * The disabled link in the view is a `routerLink`, on purpose: the refusal has to arrive
   * before the ROUTER's own click handler as well as before the browser's navigation, and
   * that is the case a consumer writes first (`lesson-166`).
   */
  test('an enabled link navigates, and a disabled one refuses both roads', async ({
    page,
  }) => {
    const disabled = page.getByTestId('link-disabled');
    await expect(disabled).toHaveAttribute('aria-disabled', 'true');
    await expect(disabled).toHaveAttribute('href', '/select');

    // `force`, because Playwright's own actionability reads `aria-disabled` as disabled and
    // would wait for the element to become enabled until the case times out — which is a
    // second reading of the state, from a tool that was not told about it. A pointer is not
    // stopped by an attribute, so the press has to be made and refused.
    await disabled.click({ force: true });
    await expect(page).toHaveURL(/\/button$/);

    await disabled.focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/button$/);

    await page.getByTestId('link-solid').click();
    await expect(page).toHaveURL(/\/select$/);
  });
});
