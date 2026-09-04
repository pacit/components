import { expect, test, type Page } from '@playwright/test';
import { setRtl, visit } from './support/dom';

/**
 * The drawer's claims are almost all about what it is NOT — not an overlay, not modal, not
 * spliced into anybody's tab order — and a negative is exactly the kind of claim a unit test
 * cannot hold: jsdom has no layout, no stacking contexts, no find-in-page and no cascade, so
 * "the page behind is live" and "the theme comes down the tree" are sentences it agrees with
 * for free. Every case below is a reading of a real engine, three of them
 * ([`req-quality-browsers`](../../../docs/requirements/quality.md#req-quality-browsers)).
 */
test.describe('PctDrawer — a region of the page, not a layer over it', () => {
  test.beforeEach(async ({ page }) => {
    await visit(page, '/drawer');
  });

  const drawer = (page: Page, id: string) => page.getByTestId(id);
  const trigger = (page: Page, id: string) => page.getByTestId(id);

  test('the button says what it does and points at a panel that is really there', async ({
    page,
  }) => {
    await expect(page.getByTestId('demo-basic')).toMatchAriaSnapshot(`
      - button "Sections" [expanded=false]
      - button "Sections, from further down" [expanded=false]
    `);

    const id = await drawer(page, 'drawer-nav').getAttribute('id');
    // Both triggers point at it, and they point at it while it is SHUT — the opposite of the
    // popover's rule, and legal for the opposite reason: the panel is in the document.
    await expect(trigger(page, 'trigger-nav')).toHaveAttribute(
      'aria-controls',
      id ?? '',
    );
    await expect(trigger(page, 'trigger-nav-second')).toHaveAttribute(
      'aria-controls',
      id ?? '',
    );

    await trigger(page, 'trigger-nav').click();
    await expect(trigger(page, 'trigger-nav')).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    await expect(trigger(page, 'trigger-nav-second')).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    await expect(drawer(page, 'drawer-nav')).toMatchAriaSnapshot(`
      - region "Sections":
        - heading "Sections" [level=2]
        - button "Close"
        - navigation
    `);
  });

  /**
   * 0045's mechanism at its second component, and the half no unit test can reach: what the
   * ENGINE does with `hidden="until-found"`. A shut drawer keeps its box and loses its
   * contents — `content-visibility: hidden`, which is the one state the browser's find-in-page
   * is allowed to look inside. Plain `display: none` is not.
   */
  test('a shut drawer is still text in the document', async ({ page }) => {
    const nav = drawer(page, 'drawer-nav');

    await expect(nav).toHaveAttribute('hidden', 'until-found');
    await expect(nav).toHaveCSS('content-visibility', 'hidden');
    await expect(nav).toHaveCSS('display', 'flex');

    // The box survives, its contents do not — gone from the layout and from the accessible
    // tree alike, which is what makes a shut drawer safe to leave in the page.
    expect(
      await nav.locator('nav').evaluate((el) => el.checkVisibility()),
    ).toBe(false);
  });

  /**
   * The tab order is the page's, and that is the whole of what "not an overlay" buys. A
   * popover has to splice its panel into the document's order by hand and take a Tab away at
   * each end of it ([0031](../../../docs/decisions/0031-a-panel-s-tab-order-belongs-to-its-trigger.md));
   * here the panel stands where the consumer wrote it, so walking into it and out of it is
   * the browser doing nothing special at all.
   */
  test('a user tabs in, parks, and tabs out — nobody splices anything', async ({
    page,
  }) => {
    await trigger(page, 'trigger-nav').click();
    await trigger(page, 'trigger-nav-second').focus();

    // The next stop after the last trigger is the drawer's own cross, because that is what
    // comes next in the document. No handler ran to make it so.
    await page.keyboard.press('Tab');
    await expect(
      drawer(page, 'drawer-nav').locator('[data-pct-part="close"]'),
    ).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(
      drawer(page, 'drawer-nav').getByRole('link').first(),
    ).toBeFocused();

    // And out the other side: three links, then whatever the page has next. Nothing traps.
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    expect(
      await page.evaluate(() =>
        document
          .querySelector('[data-testid="drawer-nav"]')
          ?.contains(document.activeElement),
      ),
    ).toBe(false);
    await expect(drawer(page, 'drawer-nav')).toHaveAttribute(
      'data-pct-open',
      '',
    );
  });

  /**
   * The other half of the same sentence: the page behind never stopped answering. The dialog
   * makes every sibling of its overlay `inert` and locks the document's scroll
   * ([0029](../../../docs/decisions/0029-a-modal-is-an-overlay-not-a-dialog-element.md)); an
   * open drawer must do neither, and "must not" is a claim that needs a reading rather than an
   * absence of code.
   */
  test('the page behind goes on answering', async ({ page }) => {
    const before = await page.evaluate(
      () => getComputedStyle(document.documentElement).overflow,
    );

    await trigger(page, 'trigger-nav').click();
    await expect(drawer(page, 'drawer-nav')).toHaveAttribute(
      'data-pct-open',
      '',
    );

    expect(
      await page.evaluate(() => document.querySelectorAll('[inert]').length),
    ).toBe(0);
    expect(
      await page.evaluate(
        () => getComputedStyle(document.documentElement).overflow,
      ),
    ).toBe(before);

    // A control on the page, not in the drawer, still takes a press.
    await trigger(page, 'trigger-bare').click();
    await expect(drawer(page, 'drawer-bare')).toHaveAttribute(
      'data-pct-open',
      '',
    );
  });

  /**
   * `lesson-35` read as an absence. Everything a panel loses by being moved into an overlay —
   * the theme, the typeface, the writing direction — a drawer keeps for nothing, because it
   * was never moved. The demo card sets `data-theme` on its own stage, so the question has a
   * measurable answer: which stage does the drawer resolve its skin from?
   */
  test('the theme comes down the tree, with no overlay panel to patch it', async ({
    page,
  }) => {
    await trigger(page, 'trigger-nav').click();

    const themed = await drawer(page, 'drawer-nav').evaluate((el) => {
      const stage = el.closest('[data-theme]');
      return {
        scoped: stage !== null,
        insideTheCard: stage?.closest('[data-testid="demo-basic"]') !== null,
        background: getComputedStyle(el).backgroundColor,
        stageBackground: stage
          ? getComputedStyle(stage as HTMLElement).backgroundColor
          : '',
      };
    });

    expect(themed.scoped).toBe(true);
    expect(themed.insideTheCard).toBe(true);
    expect(themed.background).toBe(themed.stageBackground);
  });

  /**
   * The reason `--pct-drawer-z-index` is 900 and not a bigger number. A filter drawer is
   * exactly where a select goes, and the panel it opens is a CDK overlay stamped at 1000 —
   * so the composition is the measurement, and a hit test is what asks it.
   */
  test('a panel opened from inside the drawer stands above it', async ({
    page,
  }) => {
    await trigger(page, 'trigger-end').click();
    await page.getByTestId('filter-select').getByRole('combobox').click();

    const panel = page.locator('[role="listbox"]');
    await expect(panel).toBeVisible();

    const onTop = await panel.evaluate((el) => {
      const box = el.getBoundingClientRect();
      const hit = document.elementFromPoint(
        box.left + box.width / 2,
        box.top + box.height / 2,
      );
      return el.contains(hit);
    });
    expect(onTop).toBe(true);
  });

  test('Escape closes it from inside, and is left alone outside', async ({
    page,
  }) => {
    await trigger(page, 'trigger-nav').click();
    const nav = drawer(page, 'drawer-nav');

    // Focus on the page, not in the panel: the key is the page's and the drawer stays.
    await trigger(page, 'trigger-nav').focus();
    await page.keyboard.press('Escape');
    await expect(nav).toHaveAttribute('data-pct-open', '');

    await nav.getByRole('link').first().focus();
    await page.keyboard.press('Escape');
    await expect(nav).not.toHaveAttribute('data-pct-open', /.*/);
    await expect(page.getByTestId('nav-reasons')).toContainText('escape');
  });

  test('the keyboard goes back to the control that opened it', async ({
    page,
  }) => {
    const second = trigger(page, 'trigger-nav-second');
    await second.click();
    const nav = drawer(page, 'drawer-nav');

    await nav.getByRole('link').first().focus();
    await page.keyboard.press('Escape');

    await expect(second).toBeFocused();
  });

  test('closeOnEscape=false leaves the key to the page, and the cross is gone with it', async ({
    page,
  }) => {
    // The control stands first, and without it the assertion below is a claim about a key
    // nobody proved was delivered: the same dispatch on the drawer that DOES answer Escape
    // closes it. It also has to come first — an open drawer covers the other's trigger.
    await trigger(page, 'trigger-nav').click();
    const nav = drawer(page, 'drawer-nav');
    await expect(nav).toHaveAttribute('data-pct-open', '');
    await nav.dispatchEvent('keydown', { key: 'Escape', bubbles: true });
    await expect(nav).not.toHaveAttribute('data-pct-open', /.*/);

    await trigger(page, 'trigger-bare').click();
    const bare = drawer(page, 'drawer-bare');
    await expect(bare.locator('[data-pct-part="close"]')).toHaveCount(0);

    // DISPATCHED at the host rather than typed into the page, and that is what makes the case
    // measure its own input. `(keydown.escape)` is bound on the drawer's host, so it runs only
    // for a key on the panel or inside it — and this drawer holds nothing focusable, no cross
    // and no link, so a real press lands on `body` (measured: 20 openings of 20 on each of the
    // three engines). The handler then never ran, the drawer stayed open because the key went
    // missing, and the assertion held exactly as it would have with `closeOnEscape` left true
    // — which is the case above, on another drawer (`lesson-153`).
    await bare.dispatchEvent('keydown', { key: 'Escape', bubbles: true });
    await expect(bare).toHaveAttribute('data-pct-open', '');
  });

  /**
   * The slide is a transition of the INSET rather than of a transform, and this is why: a
   * drawer docked to the `start` edge comes from the left in an English page and from the
   * right in an Arabic one, off one value and with no rule of its own
   * ([`req-token-logical`](../../../docs/requirements/tokens.md#req-token-logical)).
   */
  test('the start edge is the other edge under dir="rtl"', async ({ page }) => {
    await trigger(page, 'trigger-nav').click();
    const nav = drawer(page, 'drawer-nav');
    await expect(nav).toHaveAttribute('data-pct-open', '');

    // Polled and not read once: `data-pct-open` lands at the START of the slide, so a single
    // reading measures wherever the panel happened to be that frame. What is being asserted
    // is where it comes to rest.
    await expect
      .poll(() =>
        nav.evaluate((el) => Math.round(el.getBoundingClientRect().left)),
      )
      .toBe(0);

    await setRtl(page);
    await expect(nav).toHaveAttribute('data-pct-open', '');
    await expect
      .poll(() =>
        nav.evaluate(
          (el) =>
            Math.round(el.getBoundingClientRect().right) -
            document.documentElement.clientWidth,
        ),
      )
      .toBe(0);
  });

  test('the block edges are drawn along the other axis', async ({ page }) => {
    await trigger(page, 'trigger-bottom').click();
    const sheet = drawer(page, 'drawer-bottom');
    await expect(sheet).toHaveAttribute('data-pct-side', 'bottom');

    await expect
      .poll(() =>
        sheet.evaluate((el) => {
          const rect = el.getBoundingClientRect();
          const root = document.documentElement;
          return {
            offBottom: Math.round(rect.bottom) - root.clientHeight,
            offWidth: Math.round(rect.width) - root.clientWidth,
          };
        }),
      )
      .toEqual({ offBottom: 0, offWidth: 0 });
  });

  /**
   * The cross closes it and the reason says which way out was taken — the three the drawer
   * knows about are the three a consumer can tell apart, and `api` is what everything else
   * looks like.
   */
  test('every way out names itself', async ({ page }) => {
    const reasons = page.getByTestId('nav-reasons');

    await trigger(page, 'trigger-nav').click();
    await drawer(page, 'drawer-nav').locator('[data-pct-part="close"]').click();
    await expect(reasons).toContainText('close');

    await trigger(page, 'trigger-nav').click();
    // The second press is a KEY and not a click, and the reason is the component's own
    // geometry: an open drawer docked to the start edge covers the first 320 px of the page,
    // and in this sandbox that is where its trigger stands. A pointer cannot reach a control
    // under the panel; the keyboard always can, which is the honest half of "the page behind
    // is live" — live to the keyboard everywhere, to the pointer only where nothing covers it.
    await trigger(page, 'trigger-nav').focus();
    await page.keyboard.press('Enter');
    await expect(reasons).toContainText('close, trigger');
  });
});
