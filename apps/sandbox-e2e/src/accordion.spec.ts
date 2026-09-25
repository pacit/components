import { expect, test, type Page } from '@playwright/test';
import { setRtl, visit } from './support/dom';

/**
 * Almost every case here measures the PLATFORM rather than this library, and that is the
 * point: `pct-accordion-item` writes no `aria-expanded`, no key handler and no code at all for
 * the exclusive group, so what is left to prove is that the element it stands on really does
 * those things — in three engines, which is the only place that claim can be checked
 * ([`req-api-platform`](../../../docs/requirements/api.md#req-api-platform)).
 */
test.describe('PctAccordion — a stack of sections the platform opens', () => {
  test.beforeEach(async ({ page }) => {
    await visit(page, '/accordion');
  });

  const item = (page: Page, id: string) =>
    page.getByTestId(id).locator('details');

  const heading = (page: Page, id: string) =>
    page.getByTestId(id).locator('[data-pct-part="heading"]');

  test('a section is a group with a real heading in it', async ({ page }) => {
    await expect(page.getByTestId('accordion-basic')).toMatchAriaSnapshot(`
      - group:
        - heading "Shipping" [level=3]
      - group:
        - heading "Payment" [level=3]
      - group:
        - heading "Returns" [level=3]
    `);

    // The disclosure state is the element's, and this library writes nothing beside it —
    // the whole of 0039 as an absence.
    await expect(heading(page, 'item-payment')).not.toHaveAttribute(
      'aria-expanded',
      /.*/,
    );
    await expect(heading(page, 'item-payment')).not.toHaveAttribute(
      'role',
      /.*/,
    );
    await expect(heading(page, 'item-payment')).not.toHaveAttribute(
      'aria-controls',
      /.*/,
    );
  });

  /**
   * The half of 0045 this component gets for nothing. A closed `<details>` hides its content
   * through `::details-content`, whose `content-visibility: hidden` is the same state the tabs
   * had to ask for by hand with `hidden="until-found"` — so the browser's find-in-page
   * searches a closed section and can open it, and no code here answers anything to make that
   * happen.
   */
  test('a closed section is still text in the document', async ({ page }) => {
    const closed = item(page, 'item-payment');
    await expect(closed).not.toHaveAttribute('open', /.*/);

    const hidden = await closed.evaluate(
      (el) => getComputedStyle(el, '::details-content').contentVisibility,
    );
    expect(hidden).toBe('hidden');

    // The box survives, the text does not — which is what makes the content findable rather
    // than absent. `display: none` would be neither.
    expect(
      await closed.locator('p').evaluate((el) => el.checkVisibility()),
    ).toBe(false);

    await heading(page, 'item-payment').click();
    await expect(closed).toHaveAttribute('open', '');
    expect(
      await closed.evaluate(
        (el) => getComputedStyle(el, '::details-content').contentVisibility,
      ),
    ).toBe('visible');
  });

  test('several sections stand open at once unless the group says otherwise', async ({
    page,
  }) => {
    await heading(page, 'item-payment').click();
    await heading(page, 'item-returns').click();

    await expect(item(page, 'item-shipping')).toHaveAttribute('open', '');
    await expect(item(page, 'item-payment')).toHaveAttribute('open', '');
    await expect(item(page, 'item-returns')).toHaveAttribute('open', '');
  });

  /**
   * The claim the whole component rests on: `exclusive` is one shared `name`, and from there
   * the closing of the others is the browser's. If this goes red in one engine, the input is
   * a lie in that engine and there is no code here to fix it.
   */
  test('one section at a time is the browser closing the others', async ({
    page,
  }) => {
    await heading(page, 'item-first').click();
    await expect(item(page, 'item-first')).toHaveAttribute('open', '');

    await heading(page, 'item-second').click();
    await expect(item(page, 'item-second')).toHaveAttribute('open', '');
    await expect(item(page, 'item-first')).not.toHaveAttribute('open', /.*/);

    await heading(page, 'item-third').click();
    await expect(item(page, 'item-third')).toHaveAttribute('open', '');
    await expect(item(page, 'item-second')).not.toHaveAttribute('open', /.*/);

    // Every section of one group carries the same `name`, and it is not a name anybody wrote.
    const names = await page
      .getByTestId('accordion-exclusive')
      .locator('details')
      .evaluateAll((nodes) =>
        nodes.map((node) => (node as HTMLDetailsElement).name),
      );
    expect(new Set(names).size).toBe(1);
    expect(names[0]).not.toBe('');
  });

  /**
   * `req-api-platform` as a measurement rather than an intention: this component reads neither
   * key, and both work.
   */
  test('the keyboard is the platform, and every heading is a stop in the tab order', async ({
    page,
  }) => {
    await heading(page, 'item-payment').focus();
    await expect(heading(page, 'item-payment')).toBeFocused();

    await page.keyboard.press('Enter');
    await expect(item(page, 'item-payment')).toHaveAttribute('open', '');

    await page.keyboard.press('Space');
    await expect(item(page, 'item-payment')).not.toHaveAttribute('open', /.*/);

    // Tab walks from one heading to the next; nothing here is a roving tabindex, because a
    // stack of disclosures is not a composite widget.
    await page.keyboard.press('Tab');
    await expect(heading(page, 'item-returns')).toBeFocused();
  });

  test('a disabled section refuses the press and keeps everything else', async ({
    page,
  }) => {
    const refused = item(page, 'item-refused');
    await expect(heading(page, 'item-refused')).toHaveAttribute(
      'aria-disabled',
      'true',
    );

    await heading(page, 'item-refused').click();
    await expect(refused).not.toHaveAttribute('open', /.*/);

    // The keyboard is refused by the same one line, because `Enter` on a `<summary>` arrives
    // as a click.
    await heading(page, 'item-refused').focus();
    await expect(heading(page, 'item-refused')).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(refused).not.toHaveAttribute('open', /.*/);

    // and the section beside it still opens
    await heading(page, 'item-open').click();
    await expect(item(page, 'item-open')).toHaveAttribute('open', '');
  });

  test('the heading level is the page’s, and it is a real heading', async ({
    page,
  }) => {
    await expect(page.getByTestId('accordion-level')).toMatchAriaSnapshot(`
      - group:
        - heading "An h4 section" [level=4]
    `);
    expect(
      await page
        .getByTestId('item-level')
        .locator('.pct-accordion__title')
        .evaluate((el) => el.tagName),
    ).toBe('H4');
  });

  test('a lone item is a plain disclosure', async ({ page }) => {
    const lone = item(page, 'item-lone');
    expect(await lone.evaluate((el) => (el as HTMLDetailsElement).name)).toBe(
      '',
    );

    await heading(page, 'item-lone').click();
    await expect(lone).toHaveAttribute('open', '');
  });

  /**
   * The platform draws a disclosure triangle of its own and it is a different shape in every
   * engine. Taking it away is the one thing the stylesheet has to prove it really did — the
   * marker beside it is ours, in `currentColor`, and turns on `[open]`.
   */
  test('the engine’s own marker is gone and ours is drawn', async ({
    page,
  }) => {
    const summary = heading(page, 'item-payment');
    expect(
      await summary.evaluate((el) => getComputedStyle(el).listStyleType),
    ).toBe('none');

    const marker = page
      .getByTestId('item-payment')
      .locator('[data-pct-part="marker"]');
    await expect(marker).toBeVisible();

    expect(await marker.evaluate((el) => getComputedStyle(el).rotate)).toBe(
      'none',
    );
    await summary.click();
    // Retried, and to the resting angle: the marker turns by a transition, so a reading taken
    // straight after the click is some angle on the way (20 to 162 degrees under held timers)
    // — different from `none`, and so a pass that says nothing about where it stops
    // ([`lesson-241`](../../../docs/lessons.md#lesson-241)).
    await expect(marker).toHaveCSS('rotate', '180deg');
  });

  test('the whole heading row is the touch target', async ({ page }) => {
    for (const id of ['item-shipping', 'item-payment', 'item-returns']) {
      const box = await heading(page, id).boundingBox();
      expect(box, `${id} has no box`).not.toBeNull();
      expect(box!.height).toBeGreaterThanOrEqual(24);
      expect(box!.width).toBeGreaterThanOrEqual(24);
    }
  });

  /**
   * The one measurement that decided something by refusing it, written down so that the
   * refusal expires. Growing a panel from nothing to `auto` needs
   * `interpolate-size: allow-keywords`, and today it is chromium's alone — which is why the
   * accordion opens and closes instantly in every engine
   * ([0046](../../../docs/decisions/0046-a-disclosure-is-the-platforms-and-so-is-the-group-it-belongs-to.md)).
   *
   * This case goes red the day a second engine ships it, which is the notice that the reason
   * for "nothing animates" has stopped being true. It is the textarea's expiring fallback with
   * the sign reversed: there a borrowed road loses its last consumer, here a road nobody could
   * take opens.
   */
  test('the engine is on the road the decision says it is', async ({
    page,
    browserName,
  }) => {
    const keywords = await page.evaluate(() =>
      CSS.supports('interpolate-size', 'allow-keywords'),
    );

    expect(keywords).toBe(browserName === 'chromium');
  });

  test('the marker changes sides under dir="rtl"', async ({ page }) => {
    const summary = heading(page, 'item-payment');
    const marker = page
      .getByTestId('item-payment')
      .locator('[data-pct-part="marker"]');

    const ltrRow = (await summary.boundingBox())!;
    const ltrMarker = (await marker.boundingBox())!;
    expect(ltrMarker.x).toBeGreaterThan(ltrRow.x + ltrRow.width / 2);

    await setRtl(page);

    const rtlRow = (await summary.boundingBox())!;
    const rtlMarker = (await marker.boundingBox())!;
    expect(rtlMarker.x).toBeLessThan(rtlRow.x + rtlRow.width / 2);
  });
});
