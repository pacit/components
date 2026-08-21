import { expect, Locator, Page, test } from '@playwright/test';
import { boxOf, setRtl, visit } from './support/dom';

/**
 * The menu, measured in a browser — which for this component is where most of it lives. Roving
 * focus is DOM focus, `Enter` and `Space` on an item are the platform's own answer rather than
 * anything written here, and where a submenu is drawn is a question about layout that jsdom
 * runs none of.
 */
test.describe('PctMenu — a list of commands', () => {
  const panels = (page: Page) => page.locator('[role="menu"]');
  const panel = (page: Page) => panels(page).first();

  test.beforeEach(async ({ page }) => {
    await visit(page, '/menu');
  });

  /** What the browser says has focus, by the test id the sandbox put on it. */
  const focused = (page: Page) =>
    page.evaluate(
      () => document.activeElement?.getAttribute('data-testid') ?? null,
    );

  test('nothing is rendered until the trigger is pressed', async ({ page }) => {
    await expect(panels(page)).toHaveCount(0);
    const trigger = page.getByTestId('actions-trigger');
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
    await expect(trigger).not.toHaveAttribute('aria-controls', /./);
  });

  /**
   * The name a menu has without being given one: the control that opened it. It costs the
   * consumer nothing and it is what the APG's own example does — a panel announced as "menu"
   * and nothing else leaves the user to read it to find out what it belongs to.
   */
  test('the trigger opens a menu, points at it and names it', async ({
    page,
  }) => {
    const trigger = page.getByTestId('actions-trigger');
    await trigger.click();

    await expect(panel(page)).toBeVisible();
    const id = await panel(page).getAttribute('id');
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await expect(trigger).toHaveAttribute('aria-controls', id ?? '');

    const triggerId = await trigger.getAttribute('id');
    await expect(panel(page)).toHaveAttribute(
      'aria-labelledby',
      triggerId ?? '',
    );
  });

  test('opening puts focus on the first command', async ({ page }) => {
    await page.getByTestId('actions-trigger').click();
    await expect(panel(page)).toBeVisible();

    expect(await focused(page)).toBe('item-rename');
  });

  test('ArrowUp on the trigger opens it at the last one instead', async ({
    page,
  }) => {
    await page.getByTestId('actions-trigger').focus();
    await page.keyboard.press('ArrowUp');
    await expect(panel(page)).toBeVisible();

    expect(await focused(page)).toBe('item-delete');
  });

  test('the arrows walk it, step over what is disabled, and come round', async ({
    page,
  }) => {
    await page.getByTestId('actions-trigger').click();
    await expect(panel(page)).toBeVisible();

    await page.keyboard.press('ArrowDown');
    expect(await focused(page)).toBe('item-duplicate');
    // `item-archive` is disabled — the step lands past it.
    await page.keyboard.press('ArrowDown');
    expect(await focused(page)).toBe('item-delete');
    // And round, which is where a menu and a listbox part company.
    await page.keyboard.press('ArrowDown');
    expect(await focused(page)).toBe('item-rename');
    await page.keyboard.press('ArrowUp');
    expect(await focused(page)).toBe('item-delete');
  });

  test('Home and End go to the ends', async ({ page }) => {
    await page.getByTestId('actions-trigger').click();
    await expect(panel(page)).toBeVisible();

    await page.keyboard.press('End');
    expect(await focused(page)).toBe('item-delete');
    await page.keyboard.press('Home');
    expect(await focused(page)).toBe('item-rename');
  });

  /**
   * The prefix machinery is the select's, reused from `core` rather than written again — and
   * a second letter within the half-second narrows the search rather than starting it over.
   */
  test('typing walks to the command the letters start', async ({ page }) => {
    await page.getByTestId('langs-trigger').click();
    await expect(panel(page)).toBeVisible();

    await page.keyboard.press('f');
    expect(await focused(page)).toBe('lang-Finnish');
    await page.keyboard.press('r');
    expect(await focused(page)).toBe('lang-French');
  });

  /**
   * `Enter` and `Space` are not in this component's key map, and this is the case that says
   * so: the item is a `<button>`, the platform turns both into a `click`, and a menu that read
   * them itself would be a second implementation of a button.
   */
  for (const key of ['Enter', ' '] as const) {
    test(`${key === ' ' ? 'Space' : key} runs the command and closes the menu`, async ({
      page,
    }) => {
      await page.getByTestId('actions-trigger').click();
      await expect(panel(page)).toBeVisible();

      await page.keyboard.press(key === ' ' ? 'Space' : key);
      await expect(panels(page)).toHaveCount(0);
      await expect(page.getByTestId('chosen')).toHaveText('Chosen: Rename');
      await expect(page.getByTestId('reason')).toHaveText('Last close: item');
      expect(await focused(page)).toBe('actions-trigger');
    });
  }

  test('a disabled command answers no press and no arrow', async ({ page }) => {
    await page.getByTestId('actions-trigger').click();
    await expect(page.getByTestId('item-archive')).toBeDisabled();

    await page.getByTestId('item-archive').click({ force: true });
    await expect(panel(page)).toBeVisible();
    await expect(page.getByTestId('chosen')).toHaveText('Chosen: —');
  });

  test('Escape closes it and gives focus back to the trigger', async ({
    page,
  }) => {
    await page.getByTestId('actions-trigger').click();
    await expect(panel(page)).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(panels(page)).toHaveCount(0);
    expect(await focused(page)).toBe('actions-trigger');
    await expect(page.getByTestId('reason')).toHaveText('Last close: escape');
  });

  /**
   * The tab order is the reason this is written at all. An overlay is a child of `body`, so
   * the panel stands at the END of the document however near the trigger it is drawn — Tab
   * from an item would leave the page altogether. Closing and handing focus back to the
   * trigger puts the menu where the reader thinks it is
   * ([0031](../../../docs/decisions/0031-a-panel-s-tab-order-belongs-to-its-trigger.md)).
   */
  test('Tab closes it and hands the page back its own order', async ({
    page,
  }) => {
    await page.getByTestId('actions-trigger').click();
    await expect(panel(page)).toBeVisible();

    await page.keyboard.press('Tab');
    await expect(panels(page)).toHaveCount(0);
    expect(await focused(page)).toBe('actions-trigger');
    await expect(page.getByTestId('reason')).toHaveText('Last close: away');

    // And the next Tab carries on from the trigger, which is the whole point of putting focus
    // back there rather than leaving it at the end of the document.
    await page.keyboard.press('Tab');
    expect(await focused(page)).toBe('counter');
  });

  /**
   * The defect the guard in `attach` exists for: the dependency's outside-press listener sits
   * on `body` in the CAPTURE phase, so it sees the click BEFORE the trigger's own handler
   * does. A menu that dismissed itself there would be reopened by its own toggle on the way
   * back up ([`lesson-93`](../../../docs/lessons.md#lesson-93)).
   */
  test('a second press on the trigger closes it, and does not reopen it', async ({
    page,
  }) => {
    const trigger = page.getByTestId('actions-trigger');
    await trigger.click();
    await expect(panel(page)).toBeVisible();
    await expect(panel(page)).toHaveCSS('opacity', '1');

    await trigger.click();
    await expect(panels(page)).toHaveCount(0);
    await expect(page.getByTestId('reason')).toHaveText('Last close: trigger');
  });

  /**
   * A menu is not modal, and this is the promise that says so. It is the same measurement the
   * popover carries, and the case a dialog fails on purpose.
   */
  test('the page under a menu is not inert', async ({ page }) => {
    await page.getByTestId('actions-trigger').click();
    await expect(panel(page)).toBeVisible();

    await page.getByTestId('counter').click();
    await expect(page.getByTestId('count')).toHaveText('Count: 1');
    expect(
      await page.evaluate(
        () => getComputedStyle(document.documentElement).overflow,
      ),
    ).not.toBe('hidden');
  });

  test.describe('submenus', () => {
    /** Opens the File menu and walks down to the item that opens the submenu. */
    async function toTheItem(page: Page): Promise<Locator> {
      await page.getByTestId('file-trigger').click();
      await expect(panel(page)).toBeVisible();
      await page.keyboard.press('ArrowDown');
      return page.getByTestId('file-move');
    }

    test('the item that opens one says so, and the arrows walk in and out', async ({
      page,
    }) => {
      const item = await toTheItem(page);
      await expect(item).toHaveAttribute('aria-haspopup', 'menu');
      await expect(item).toHaveAttribute('aria-expanded', 'false');

      await page.keyboard.press('ArrowRight');
      await expect(panels(page)).toHaveCount(2);
      await expect(item).toHaveAttribute('aria-expanded', 'true');
      expect(await focused(page)).toBe('move-inbox');

      await page.keyboard.press('ArrowLeft');
      await expect(panels(page)).toHaveCount(1);
      expect(await focused(page)).toBe('file-move');
    });

    test('Escape closes the submenu alone', async ({ page }) => {
      await toTheItem(page);
      await page.keyboard.press('ArrowRight');
      await expect(panels(page)).toHaveCount(2);

      await page.keyboard.press('Escape');
      await expect(panels(page)).toHaveCount(1);
      expect(await focused(page)).toBe('file-move');
    });

    /**
     * The pointer opens the panel and does NOT take focus into it: crossing a row on the way
     * somewhere else would otherwise pull the user a level deeper every time.
     */
    test('the pointer opens one without taking focus into it', async ({
      page,
    }) => {
      await page.getByTestId('file-trigger').click();
      await expect(panel(page)).toBeVisible();

      await page.getByTestId('file-move').hover();
      await expect(panels(page)).toHaveCount(2);
      expect(await focused(page)).toBe('file-move');

      // And moving on to another row closes it again — one open submenu at a time, and it is
      // always the row the user is on.
      await page.getByTestId('file-close').hover();
      await expect(panels(page)).toHaveCount(1);
    });

    test('choosing in a submenu closes the whole tree', async ({ page }) => {
      await toTheItem(page);
      await page.keyboard.press('ArrowRight');
      await expect(panels(page)).toHaveCount(2);

      await page.getByTestId('move-inbox').click();
      await expect(panels(page)).toHaveCount(0);
      await expect(page.getByTestId('chosen')).toHaveText('Chosen: Inbox');
      expect(await focused(page)).toBe('file-trigger');
    });

    test('and Tab from inside one closes it all as well', async ({ page }) => {
      await toTheItem(page);
      await page.keyboard.press('ArrowRight');
      await expect(panels(page)).toHaveCount(2);

      await page.keyboard.press('Tab');
      await expect(panels(page)).toHaveCount(0);
      expect(await focused(page)).toBe('file-trigger');
    });

    test('a third level opens the same way, and one Escape is one level out', async ({
      page,
    }) => {
      await toTheItem(page);
      await page.keyboard.press('ArrowRight');
      // Settled before the next key, and not out of politeness: the panel attaches from an
      // effect, so an arrow pressed inside that window is delivered to the menu ABOVE the one
      // it was meant for — and the walk then moves a level too high.
      await expect(panels(page)).toHaveCount(2);
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('ArrowDown');
      expect(await focused(page)).toBe('move-more');

      await page.keyboard.press('ArrowRight');
      await expect(panels(page)).toHaveCount(3);
      expect(await focused(page)).toBe('deeper-trash');

      await page.keyboard.press('Escape');
      await expect(panels(page)).toHaveCount(2);
      await page.keyboard.press('Escape');
      await expect(panels(page)).toHaveCount(1);
    });

    /**
     * The side is logical and so is the key. In a right-to-left page the submenu is drawn on
     * the left of its parent, so the way further in is `ArrowLeft` — a menu that kept the
     * physical key would send the user away from the panel they can see.
     */
    test('in a right-to-left page the side and the arrows both mirror', async ({
      page,
    }) => {
      await setRtl(page);
      const item = await toTheItem(page);
      const parent = await boxOf(panel(page));

      await page.keyboard.press('ArrowLeft');
      await expect(panels(page)).toHaveCount(2);
      expect(await focused(page)).toBe('move-inbox');

      const child = await boxOf(panels(page).nth(1));
      // Drawn on the starting side, which in this direction is the left.
      expect(child.x + child.width).toBeLessThanOrEqual(parent.x + 1);

      await page.keyboard.press('ArrowRight');
      await expect(panels(page)).toHaveCount(1);
      expect(await focused(page)).toBe('file-move');
      await expect(item).toHaveAttribute('aria-expanded', 'false');
    });
  });

  /**
   * Reduced motion is answered by the token build, not by a media query in the sheet — so the
   * same rule that fades the panel carries `0.01ms` for a user who asked for less of it, and
   * the wait for the leave collapses with the transition rather than outliving it.
   */
  test('with reduced motion the fade is instant and the leave still ends', async ({
    page,
  }) => {
    await visit(page, '/menu', { media: { reducedMotion: 'reduce' } });
    await page.getByTestId('actions-trigger').click();
    await expect(panel(page)).toBeVisible();

    // The number rather than the string: the same `0.01ms` comes back as `0.00001s` from one
    // engine and as `1e-05s` from another, and what is promised is a duration nobody can see.
    const duration = await panel(page).evaluate(
      (el) => getComputedStyle(el).transitionDuration,
    );
    expect(parseFloat(duration)).toBeLessThan(0.001);

    await page.keyboard.press('Escape');
    await expect(panels(page)).toHaveCount(0);
  });
});
