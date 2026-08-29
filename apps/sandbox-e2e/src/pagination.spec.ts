import { expect, test, type Locator, type Page } from '@playwright/test';
import { boxOf, visit } from './support/dom';

/**
 * Almost every case here measures the PLATFORM rather than this library, and that is the
 * point. `pct-pagination` writes no `tabindex`, no key handler and no focus management at all:
 * every control in the strip is a plain `<button>` inside a `navigation` landmark, so `Tab`
 * moving between them, `Enter` and `Space` pressing them, and a `disabled` button dropping out
 * of the tab order are all claims about the browser
 * ([`req-api-platform`](../../../docs/requirements/api.md#req-api-platform),
 * [0048](../../../docs/decisions/0048-a-pagination-owns-its-page-number.md)).
 *
 * The one thing that IS this library's — the folding — is measured here too, in a real engine
 * rather than in jsdom, because a `@for` that renders differently after hydration would look
 * exactly like a correct fold in the unit run.
 */
test.describe('PctPagination — a landmark, a list, and the platform’s buttons', () => {
  test.beforeEach(async ({ page }) => {
    await visit(page, '/pagination');
  });

  const pager = (page: Page, id: string) => page.getByTestId(id);

  const pages = (page: Page, id: string) =>
    pager(page, id).locator('[data-pct-part="page"]');

  const stepper = (page: Page, id: string, which: 'previous' | 'next') =>
    pager(page, id).locator(`[data-pct-part="${which}"]`);

  /** The strip as a reader reads it: a number for a page, `…` for a gap. */
  const strip = async (page: Page, id: string) =>
    pager(page, id)
      .locator('[data-pct-part="page"], [data-pct-part="ellipsis"]')
      .evaluateAll((els) => els.map((el) => el.textContent?.trim() ?? ''));

  /**
   * The number the pager announces as current — a RETRYING assertion and not a read. A press
   * moves a signal and the strip re-renders after it, so `expect(await …)` asks the question
   * one tick early; it answered right in two engines and wrong in the third, which is the
   * least useful shape a test can have.
   */
  const expectCurrent = (page: Page, id: string, n: string) =>
    expect(pager(page, id).locator('[aria-current="page"]')).toHaveText(n);

  /** What has focus right now, as the page itself sees it. */
  const focused = (page: Page) =>
    page.evaluate(() => {
      const el = document.activeElement;
      if (!el) return null;
      return {
        tag: el.tagName,
        part: el.getAttribute('data-pct-part'),
        text: el.textContent?.trim() ?? '',
      };
    });

  test('the pager is a named landmark with a list inside it', async ({
    page,
  }) => {
    // Two pagers frame the same content, and each is its own landmark — which is why the name
    // has to be settable at all. A reader offers both in its landmark list and tells them
    // apart by nothing else.
    await expect(
      page.getByRole('navigation', { name: 'Results, top' }),
    ).toBeVisible();
    await expect(
      page.getByRole('navigation', { name: 'Results, bottom' }),
    ).toBeVisible();

    // The default name comes from PCT_TEXTS and is what an unnamed pager gets.
    await expect(
      page.getByRole('navigation', { name: 'Pagination' }).first(),
    ).toBeVisible();

    // A list, so a screen reader is owed the count of what is in it.
    const list = pager(page, 'pagination-few').getByRole('list');
    await expect(list).toHaveCount(1);
    await expect(list.getByRole('listitem')).toHaveCount(5);
  });

  test('the current page is announced as current, and only one is', async ({
    page,
  }) => {
    await expect(pager(page, 'pagination-many')).toMatchAriaSnapshot(`
      - navigation "Pagination":
        - list:
          - listitem:
            - button "Previous page"
          - listitem:
            - button "1"
          - listitem
          - listitem:
            - button "6"
          - listitem:
            - button "7"
          - listitem:
            - button "8"
          - listitem
          - listitem:
            - button "20"
          - listitem:
            - button "Next page"
    `);

    await expect(
      pager(page, 'pagination-many').locator('[aria-current="page"]'),
    ).toHaveCount(1);
    await expectCurrent(page, 'pagination-many', '7');
  });

  /**
   * The claim the card's empty keyboard map rests on. A `toolbar` with a roving `tabindex`
   * would put ONE tab stop on the whole strip and hide every other number from sequential
   * navigation; this component deliberately has none, so `Tab` has to walk the buttons one by
   * one. Measured in three engines, because "the platform does it" is only checkable where the
   * platform is.
   */
  test('Tab walks every button in the strip, one stop each', async ({
    page,
  }) => {
    // Page 1 is current, so `previous` is disabled and cannot take focus at all — the walk
    // starts at the first number instead.
    await pages(page, 'pagination-few').first().focus();

    const walk: string[] = [];
    for (let i = 0; i < 4; i++) {
      const at = await focused(page);
      walk.push(at?.part === 'next' ? 'next' : (at?.text ?? ''));
      await page.keyboard.press('Tab');
    }

    expect(walk).toEqual(['1', '2', '3', 'next']);
  });

  test('a disabled stepper is not a tab stop, and the browser says so', async ({
    page,
  }) => {
    const previous = stepper(page, 'pagination-few', 'previous');
    await expect(previous).toBeDisabled();

    // Focusing a disabled button is a request the platform refuses; nothing in this library
    // answers it.
    await previous.focus();
    expect((await focused(page))?.part).not.toBe('previous');
  });

  for (const key of ['Enter', 'Space'] as const) {
    test(`${key} on a page button pages, and it is the browser that presses it`, async ({
      page,
    }) => {
      const three = pages(page, 'pagination-few').nth(2);
      await three.focus();
      await page.keyboard.press(key);

      await expectCurrent(page, 'pagination-few', '3');
      await expect(pager(page, 'demo-few').locator('.view__state')).toHaveText(
        'page 3',
      );
    });
  }

  test('the steppers move by one and go inert at the ends', async ({
    page,
  }) => {
    const previous = stepper(page, 'pagination-few', 'previous');
    const next = stepper(page, 'pagination-few', 'next');

    await expect(previous).toBeDisabled();
    await expect(next).toBeEnabled();

    await next.click();
    await expectCurrent(page, 'pagination-few', '2');
    await expect(previous).toBeEnabled();

    await next.click();
    await expectCurrent(page, 'pagination-few', '3');
    await expect(next).toBeDisabled();

    await previous.click();
    await expectCurrent(page, 'pagination-few', '2');
    await expect(next).toBeEnabled();
  });

  /**
   * The fold in a real engine. The unit run measures the same arrays; what this adds is that
   * the server's markup and the hydrated one agree — a `@for` whose keys drifted would render
   * a correct strip twice and still throw the page away in between.
   */
  test('the ends stay pinned and the window follows the page', async ({
    page,
  }) => {
    expect(await strip(page, 'pagination-many')).toEqual([
      '1',
      '…',
      '6',
      '7',
      '8',
      '…',
      '20',
    ]);

    await pager(page, 'pagination-many')
      .getByRole('button', { name: '1', exact: true })
      .click();
    await expectCurrent(page, 'pagination-many', '1');
    expect(await strip(page, 'pagination-many')).toEqual([
      '1',
      '2',
      '3',
      '4',
      '5',
      '…',
      '20',
    ]);

    await stepper(page, 'pagination-many', 'next').click();
    await expectCurrent(page, 'pagination-many', '2');
    expect(await strip(page, 'pagination-many')).toEqual([
      '1',
      '2',
      '3',
      '4',
      '5',
      '…',
      '20',
    ]);
  });

  test('a gap is a gap: no role, no name, nothing to press', async ({
    page,
  }) => {
    const gaps = pager(page, 'pagination-many').locator(
      '[data-pct-part="ellipsis"]',
    );
    await expect(gaps).toHaveCount(2);

    for (const gap of await gaps.all()) {
      await expect(gap).toHaveAttribute('aria-hidden', 'true');
    }

    // A reader walking the buttons of this landmark finds only pages and steppers.
    const names = await pager(page, 'pagination-many')
      .getByRole('button')
      .evaluateAll((els) => els.map((el) => el.textContent?.trim()));
    expect(names).not.toContain('…');
  });

  /**
   * The whole claim of 0048 end to end: the pager owns an integer, the application owns the
   * data, and pressing a number really changes what is on the page.
   */
  test('the page it owns is the page the application renders', async ({
    page,
  }) => {
    const rows = pager(page, 'demo-list').locator('.view__list li');
    await expect(rows.first()).toHaveText('Row 1');
    await expect(rows).toHaveCount(10);

    await pager(page, 'pagination-list')
      .getByRole('button', { name: '2', exact: true })
      .click();
    await expect(rows.first()).toHaveText('Row 11');

    // The last page is short — 47 rows in tens — which is the application's arithmetic and
    // not the pager's.
    await pager(page, 'pagination-list')
      .getByRole('button', { name: '5', exact: true })
      .click();
    await expect(rows).toHaveCount(7);
    await expect(rows.first()).toHaveText('Row 41');
  });

  test('two pagers over one value move together', async ({ page }) => {
    await expectCurrent(page, 'pagination-top', '4');
    await expectCurrent(page, 'pagination-bottom', '4');

    await stepper(page, 'pagination-bottom', 'next').click();

    await expectCurrent(page, 'pagination-bottom', '5');
    await expectCurrent(page, 'pagination-top', '5');
  });

  test('a disabled pager offers the keyboard nothing at all', async ({
    page,
  }) => {
    const disabled = pager(page, 'pagination-disabled');
    await expect(disabled).toHaveAttribute('data-pct-disabled', '');

    for (const button of await disabled.getByRole('button').all()) {
      await expect(button).toBeDisabled();
    }

    await expectCurrent(page, 'pagination-disabled', '2');
    await disabled
      .locator('[data-pct-part="page"]')
      .nth(2)
      .click({ force: true });
    await expectCurrent(page, 'pagination-disabled', '2');
  });

  /**
   * The touch floor read rather than declared (`req-a11y-touch`). It is the SMALL pager that
   * is asked, because that is where a height token tracking the control axis comes closest to
   * the floor — `min-block-size` is what holds it, and a theme shrinking the axis runs into
   * this and not into the default size.
   */
  test('every target clears 24 px, at the smallest size on the axis', async ({
    page,
  }) => {
    const buttons: Locator[] = await pager(page, 'pagination-sm')
      .getByRole('button')
      .all();
    expect(buttons.length).toBeGreaterThan(2);

    for (const button of buttons) {
      const box = await boxOf(button);
      expect(box.width).toBeGreaterThanOrEqual(24);
      expect(box.height).toBeGreaterThanOrEqual(24);
    }
  });

  /**
   * The size axis really reaching the box. Three pagers, three heights, in the order the axis
   * declares — a `data-pct-size` that stopped being read would leave all three equal, which no
   * unit case measuring an attribute can see.
   */
  test('the three sizes are three different heights', async ({ page }) => {
    const heightOf = async (id: string) =>
      (await boxOf(pager(page, id).getByRole('button').nth(1))).height;

    const [sm, md, lg] = await Promise.all([
      heightOf('pagination-sm'),
      heightOf('pagination-md'),
      heightOf('pagination-lg'),
    ]);

    expect(sm).toBeLessThan(md);
    expect(md).toBeLessThan(lg);
  });

  /**
   * The current page carries its state on channels that are not the border alone: a fill and a
   * text colour of its own. This is the ordinary-mode half of `req-a11y-forced-colors` — the
   * forced-colours reading of the same claim is in `forced-colors.spec.ts`.
   */
  test('the current page differs from its neighbours by fill and by text', async ({
    page,
  }) => {
    const paint = (locator: Locator) =>
      locator.evaluate((el) => {
        const style = getComputedStyle(el);
        return { bg: style.backgroundColor, fg: style.color };
      });

    const current = await paint(
      pager(page, 'pagination-many').locator('[data-pct-current]'),
    );
    const plain = await paint(
      pager(page, 'pagination-many').getByRole('button', {
        name: '1',
        exact: true,
      }),
    );

    expect(current.bg).not.toBe(plain.bg);
    expect(current.fg).not.toBe(plain.fg);
  });
});
