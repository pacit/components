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
   * The layout half of `orientation="vertical"` (0064). Until it was finished the strip became
   * a column and the panel still stacked underneath it, which is a column of labels
   * introducing a section nowhere near them. Measured as a relation between two boxes rather
   * than as a CSS value, because that is the claim: the panel stands BESIDE the strip.
   */
  test('a side strip stands beside its panel, and they swap sides under dir="rtl"', async ({
    page,
  }) => {
    const strip = page
      .getByTestId('tabs-vertical')
      .locator('[data-pct-part="list"]');
    const panel = page
      .getByTestId('tabs-vertical')
      .locator('[data-pct-part="panel"]:not([hidden])');

    const boxes = async () => {
      const a = await strip.boundingBox();
      const b = await panel.boundingBox();
      if (!a || !b) throw new Error('the strip or its panel has no box');
      return { a, b };
    };

    const ltr = await boxes();
    // Beside, not below: they share the row, and the panel starts after the strip ends.
    expect(ltr.b.x).toBeGreaterThanOrEqual(ltr.a.x + ltr.a.width);
    expect(Math.abs(ltr.b.y - ltr.a.y)).toBeLessThan(ltr.a.height);

    await setRtl(page);
    await expect(strip).toHaveCSS('direction', 'rtl');

    const rtl = await boxes();
    // Everything mirrors from the logical properties alone — the strip is now on the right,
    // the panel on its left, and the rail has changed edge with them.
    expect(rtl.a.x).toBeGreaterThanOrEqual(rtl.b.x + rtl.b.width);
    await expect(strip).toHaveCSS('border-left-width', '1px');
    await expect(strip).toHaveCSS('border-right-width', '0px');
  });

  /**
   * The segmented face (0064): a recessed track with the chosen tab raised out of it. Every
   * value here is paint keyed on one attribute, so this test is what says the attribute
   * reaches the sheet at all — and the four corners are the detail a reviewer caught first
   * when the face was still being faked from a consumer's stylesheet.
   */
  test('the segmented face is a track with the chosen tab raised out of it', async ({
    page,
  }) => {
    const list = page
      .getByTestId('tabs-segmented')
      .locator('[data-pct-part="list"]');
    const chosen = page
      .getByTestId('tabs-segmented')
      .locator('[data-pct-part="tab"][data-pct-chosen]');
    const other = page
      .getByTestId('tabs-segmented')
      .locator('[data-pct-part="tab"]:not([data-pct-chosen])')
      .first();

    // The track: surface-100, no rail, and a corner derived from the segment's plus the inset.
    await expect(list).toHaveCSS('background-color', 'rgb(241, 245, 249)');
    await expect(list).toHaveCSS('border-bottom-width', '0px');
    await expect(list).toHaveCSS('border-radius', '12px');

    // The raised segment: the page's own surface, and rounded on all four corners — inside a
    // track there is no rail for a tab's bottom edge to meet.
    await expect(chosen).toHaveCSS('background-color', 'rgb(255, 255, 255)');
    await expect(chosen).toHaveCSS('border-radius', '8px');
    await expect(chosen).toHaveCSS('border-bottom-width', '0px');

    // An unchosen segment paints nothing: it is the label's colour that separates them.
    await expect(other).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');

    // The track hugs its segments rather than running to the far edge of what holds it.
    const box = await list.boundingBox();
    const host = await page.getByTestId('tabs-segmented').boundingBox();
    if (!box || !host) throw new Error('no box');
    expect(box.width).toBeLessThan(host.width);
  });

  /**
   * A strip inside a strip. Both instances are the same component, so their elements carry
   * the same encapsulation attribute, and a rule the outer one keys on its own attribute
   * reaches the inner one's tabs unless the selector says CHILD. It did not: a default strip
   * inside a segmented one came out segmented, on the library's own documentation page
   * (lesson-151). What this case reads is the inner strip's own face — the assertions are the
   * segmented test's, negated, on the instance a panel holds.
   */
  test('a strip inside a panel keeps its own face, not the outer one', async ({
    page,
  }) => {
    const outerList = page
      .getByTestId('tabs-outer')
      .locator('> [data-pct-part="list"]');
    const innerList = page
      .getByTestId('tabs-inner')
      .locator('> [data-pct-part="list"]');
    const innerChosen = page
      .getByTestId('tabs-inner')
      .locator('[data-pct-part="tab"][data-pct-chosen]');

    // The outer strip is the track, and the assertions are the segmented case's own.
    await expect(outerList).toHaveCSS('background-color', 'rgb(241, 245, 249)');
    await expect(outerList).toHaveCSS('border-bottom-width', '0px');

    // The inner strip is the default face: a rail under it, no track behind it, and the
    // chosen tab marked by an edge rather than by a fill.
    await expect(innerList).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    await expect(innerList).toHaveCSS('border-bottom-width', '1px');
    await expect(innerList).toHaveCSS('padding', '0px');
    await expect(innerChosen).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    await expect(innerChosen).toHaveCSS('border-bottom-width', '2px');
    // Rounded on top only — the segmented face rounds all four, and that is the tell.
    await expect(innerChosen).toHaveCSS('border-radius', '8px 8px 0px 0px');
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

  /**
   * A box that overhangs a scroll container by one pixel is a scrollbar. The strip once
   * pulled the chosen edge onto its rail with a negative margin, and every strip carried a
   * one-pixel scrollbar across its own axis that thickened the edge when scrolled
   * (lesson-144). Along its axis a strip scrolls by design; across it, never.
   */
  test('the strip never scrolls across its own axis, and the chosen edge fits inside it', async ({
    page,
  }) => {
    const overhang = (id: string) =>
      strip(page, id).evaluate((el) => ({
        across: el.scrollHeight - el.clientHeight,
        along: el.scrollWidth - el.clientWidth,
      }));

    expect(await overhang('tabs-basic')).toEqual({ across: 0, along: 0 });

    // The strip built to overflow scrolls along its axis — and still not across it.
    const overflowing = await overhang('tabs-overflow');
    expect(overflowing.along).toBeGreaterThan(0);
    expect(overflowing.across).toBe(0);

    // The vertical strip's own axis is the block one; across it is inline.
    expect(
      await strip(page, 'tabs-vertical').evaluate(
        (el) => el.scrollWidth - el.clientWidth,
      ),
    ).toBe(0);

    // The edge is whole: two pixels, drawn inside the box, nothing to reveal by scrolling.
    await expect(tabs(page, 'tabs-basic').first()).toHaveCSS(
      'border-bottom-width',
      '2px',
    );
  });

  test('every tab clears the touch-target floor outright', async ({ page }) => {
    for (const tab of await tabs(page, 'tabs-basic').all()) {
      const box = await tab.boundingBox();
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(24);
      expect(box?.width ?? 0).toBeGreaterThanOrEqual(24);
    }
  });
});
