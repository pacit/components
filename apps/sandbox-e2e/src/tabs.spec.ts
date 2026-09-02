import { expect, test } from '@playwright/test';
import { setRtl, visit } from './support/dom';

test.describe('PctTabs — one section showing at a time', () => {
  test.beforeEach(async ({ page }) => {
    await visit(page, '/tabs');
  });

  const strip = (page: import('@playwright/test').Page, id: string) =>
    page.getByTestId(id).locator('[data-pct-part="list"]');

  const tabs = (page: import('@playwright/test').Page, id: string) =>
    page.getByTestId(id).locator('[data-pct-part="tab"]');

  test('the pattern is wired both ways in a page a browser really parsed', async ({
    page,
  }) => {
    const list = strip(page, 'tabs-basic');
    await expect(list).toHaveAttribute('role', 'tablist');
    await expect(list).toHaveAttribute('aria-orientation', 'horizontal');
    await expect(list).toHaveAttribute('aria-label', 'Account settings');

    // The accessible tree computed off the DOM, which is the reading that matters: three
    // tabs, one of them chosen, one of them unavailable, and a panel named by its tab.
    await expect(page.getByTestId('tabs-basic')).toMatchAriaSnapshot(`
      - tablist "Account settings":
        - tab "General" [selected]
        - tab "Network"
        - tab "Billing" [disabled]
      - tabpanel "General"
    `);
  });

  /**
   * The heart of 0045, and the half no unit test can reach: what the ENGINE does with
   * `hidden="until-found"`. A panel nobody chose keeps a box and loses its contents —
   * `content-visibility: hidden` — which is exactly the state the browser's find-in-page is
   * allowed to look inside. Plain `display: none` is not.
   */
  test('a panel nobody chose is hidden the findable way, and a disabled one outright', async ({
    page,
  }) => {
    const general = page.getByTestId('panel-general');
    const network = page.getByTestId('panel-network');
    const billing = page.getByTestId('panel-billing');

    await expect(general).not.toHaveAttribute('hidden', /.*/);
    await expect(network).toHaveAttribute('hidden', 'until-found');
    // A disabled tab is a section with no way in, so its text is not offered to a search
    // that could not take the user there.
    await expect(billing).toHaveAttribute('hidden', '');

    await expect(network).toHaveCSS('content-visibility', 'hidden');
    await expect(network).toHaveCSS('display', 'block');
    await expect(billing).toHaveCSS('display', 'none');

    // The contents are gone from the layout and from the accessible tree all the same: the
    // panel's own box survives, its text does not.
    expect(
      await network.locator('p').evaluate((el) => el.checkVisibility()),
    ).toBe(false);
  });

  test('the walk moves the focus and, here, chooses with it', async ({
    page,
  }) => {
    const all = tabs(page, 'tabs-basic');

    await all.nth(0).focus();
    await expect(all.nth(0)).toBeFocused();

    await page.keyboard.press('ArrowRight');
    await expect(all.nth(1)).toBeFocused();
    await expect(all.nth(1)).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByTestId('panel-network')).not.toHaveAttribute(
      'hidden',
      /.*/,
    );

    // The disabled tab is stepped over, and the strip comes round at the end.
    await page.keyboard.press('ArrowRight');
    await expect(all.nth(0)).toBeFocused();

    await page.keyboard.press('End');
    // `End` goes to the last tab that can be REACHED, which is not the last tab.
    await expect(all.nth(1)).toBeFocused();
  });

  /**
   * The roving tabindex, measured as a keyboard user meets it: the strip is ONE stop in the
   * page's tab order, and the next `Tab` leaves it for the panel rather than for the second
   * label.
   */
  test('the strip is one stop and the panel is the next', async ({ page }) => {
    const all = tabs(page, 'tabs-basic');

    await all.nth(0).focus();
    await expect(all.nth(0)).toHaveAttribute('tabindex', '0');
    await expect(all.nth(1)).toHaveAttribute('tabindex', '-1');
    await expect(all.nth(2)).toHaveAttribute('tabindex', '-1');

    await page.keyboard.press('Tab');
    await expect(page.getByTestId('panel-general')).toBeFocused();
  });

  test('choosing by hand moves the focus and waits for the press', async ({
    page,
  }) => {
    const all = tabs(page, 'tabs-manual');

    await all.nth(0).focus();
    await page.keyboard.press('ArrowRight');

    await expect(all.nth(1)).toBeFocused();
    await expect(all.nth(0)).toHaveAttribute('aria-selected', 'true');

    // `Enter` is the platform's — a `<button>` turns it into a click, and no key map here
    // says so (req-api-platform).
    await page.keyboard.press('Enter');
    await expect(all.nth(1)).toHaveAttribute('aria-selected', 'true');

    await all.nth(0).focus();
    await page.keyboard.press(' ');
    await expect(all.nth(0)).toHaveAttribute('aria-selected', 'true');
  });

  /**
   * A pressed tab is where the walk stands, so the next arrow moves from THERE. It is the one
   * place the pointer and the keyboard have to agree about a single piece of state, and the
   * agreement is written twice in the component on purpose — see `onFocusin`.
   */
  test('an arrow after a click moves from the tab that was pressed', async ({
    page,
  }) => {
    const all = tabs(page, 'tabs-overflow');

    await all.nth(3).click();
    await expect(all.nth(3)).toHaveAttribute('aria-selected', 'true');

    await page.keyboard.press('ArrowRight');
    await expect(all.nth(4)).toBeFocused();
    await expect(all.nth(4)).toHaveAttribute('aria-selected', 'true');
  });

  test('a strip down the side is walked with the vertical arrows', async ({
    page,
  }) => {
    const list = strip(page, 'tabs-vertical');
    const all = tabs(page, 'tabs-vertical');

    await expect(list).toHaveAttribute('aria-orientation', 'vertical');

    await all.nth(0).focus();
    await page.keyboard.press('ArrowDown');
    await expect(all.nth(1)).toBeFocused();

    // The horizontal arrows belong to the page on a vertical strip.
    await page.keyboard.press('ArrowRight');
    await expect(all.nth(1)).toBeFocused();
  });

  /**
   * The direction is read off the strip as the browser RESOLVES it, so this is the half a
   * unit test cannot reach: nothing sets `direction` on the tablist itself — it is inherited
   * from the document, and the arrows have to follow the reading order all the same.
   */
  test('the arrows follow the reading order under dir="rtl"', async ({
    page,
  }) => {
    await setRtl(page);

    const list = strip(page, 'tabs-basic');
    const all = tabs(page, 'tabs-basic');

    await expect(list).toHaveCSS('direction', 'rtl');

    await all.nth(0).focus();
    await page.keyboard.press('ArrowLeft');
    await expect(all.nth(1)).toBeFocused();
    await page.keyboard.press('ArrowRight');
    await expect(all.nth(0)).toBeFocused();
  });

  test('the mark of the chosen tab moves to the inline edge when the strip is vertical', async ({
    page,
  }) => {
    const chosen = page
      .getByTestId('tabs-vertical')
      .locator('[data-pct-part="tab"][data-pct-chosen]');

    // --pct-tabs-tab-border-selected -> --pct-primary -> blue-600
    await expect(chosen).toHaveCSS(
      'border-inline-end-color',
      'rgb(37, 99, 235)',
    );
    await expect(chosen).toHaveCSS('border-block-end-width', '0px');
  });

  /**
   * The strip scrolls and this library scrolls nothing: the browser brings a focused element
   * into view by itself, which is the whole answer for a strip with more labels than room
   * (req-api-platform).
   */
  test('a tab out of sight is brought into view by the platform, not by us', async ({
    page,
  }) => {
    const list = strip(page, 'tabs-overflow');
    const all = tabs(page, 'tabs-overflow');

    const overflows = await list.evaluate(
      (el) => el.scrollWidth > el.clientWidth,
    );
    expect(overflows).toBe(true);
    expect(await list.evaluate((el) => el.scrollLeft)).toBe(0);

    await all.nth(0).focus();
    await page.keyboard.press('End');

    await expect(all.nth(4)).toBeFocused();
    expect(await list.evaluate((el) => el.scrollLeft)).toBeGreaterThan(0);
  });

  /**
   * A measurement, not a promise: `overflow: auto` makes the strip **programmatically**
   * focusable in blink and gecko — and in neither of them does it join the page's tab order,
   * because `tabIndex` stays `-1`. WebKit does not make it focusable at all. The reason to
   * hold it here is that the three engines disagree and the fact is invisible from the
   * markup: nothing in the template asks for it, and a keyboard user meets no extra stop.
   */
  test('the scrolling strip is not a stop in the tab order', async ({
    page,
  }) => {
    const list = strip(page, 'tabs-overflow');
    expect(await list.evaluate((el) => el.tabIndex)).toBe(-1);

    // Two tabs into the page from the strip's own tab: the panel, then whatever follows it —
    // never a second label, and never the strip itself.
    const all = tabs(page, 'tabs-overflow');
    await all.nth(0).focus();
    await page.keyboard.press('Tab');
    await expect(
      page
        .getByTestId('demo-overflow')
        .locator('[data-pct-part="panel"]:not([hidden])'),
    ).toBeFocused();
  });

  test('every tab clears the touch-target floor outright', async ({ page }) => {
    for (const tab of await tabs(page, 'tabs-basic').all()) {
      const box = await tab.boundingBox();
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(24);
      expect(box?.width ?? 0).toBeGreaterThanOrEqual(24);
    }
  });
});
