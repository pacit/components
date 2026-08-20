import { expect, Page, test } from '@playwright/test';
import { attrOf, setRtl, visit } from './support/dom';

/**
 * The modal, measured in a browser — which for this component is not a nicety but the only
 * place the promises exist. `inert` is the platform's and jsdom implements none of it; the
 * focus trap moves DOM focus, and jsdom has no layout for the interactivity checker to read;
 * the scroll lock is about a viewport there is none of. The unit suite says WHICH elements the
 * library marks, this file says what the marking does.
 */
test.describe('PctDialog — a modal', () => {
  test.beforeEach(async ({ page }) => {
    await visit(page, '/dialog');
  });

  const panel = (page: Page) => page.locator('[data-pct-part="panel"]');
  const activeTestId = (page: Page) =>
    page.evaluate(
      () =>
        document.activeElement?.getAttribute('data-testid') ??
        document.activeElement?.getAttribute('data-pct-part') ??
        document.activeElement?.tagName ??
        '',
    );

  /** Opens from the keyboard, so that focus is really on the opener when the dialog captures it. */
  async function openWith(page: Page, testId: string): Promise<void> {
    await page.getByTestId(testId).focus();
    await page.keyboard.press('Enter');
    await expect(panel(page)).toBeVisible();
  }

  /**
   * The scroll offset once it has stopped moving. A wheel event does not land in one frame —
   * webkit in particular goes on settling after the promise resolves — so a reading taken
   * straight afterwards is a reading of a scroll still in progress. Comparing two of them
   * against each other made the lock case fail about one run in three, on a lock that was
   * working: the flake was in the measurement, not in the component.
   */
  async function settledScrollY(page: Page): Promise<number> {
    let last = -1;
    for (let i = 0; i < 20; i++) {
      const now = await page.evaluate(() => window.scrollY);
      if (now === last) return now;
      last = now;
      await page.waitForTimeout(100);
    }
    throw new Error(`the page never stopped scrolling (last ${last})`);
  }

  test('the panel is a modal dialog named by its heading', async ({ page }) => {
    await openWith(page, 'open-basic');

    await expect(panel(page)).toHaveRole('dialog');
    await expect(panel(page)).toHaveAttribute('aria-modal', 'true');

    const labelledBy = await attrOf(panel(page), 'aria-labelledby');
    await expect(page.locator(`#${labelledBy}`)).toHaveText('Project settings');
  });

  test.describe('focus', () => {
    test('it takes focus on open and gives it back on close', async ({
      page,
    }) => {
      await openWith(page, 'open-basic');
      // Nothing said where focus should go, so it goes to the first thing that can hold it.
      expect(await activeTestId(page)).toBe('close');

      await page.keyboard.press('Escape');
      await expect(panel(page)).toHaveCount(0);
      expect(await activeTestId(page)).toBe('open-basic');
    });

    test('pctAutofocus decides what takes it', async ({ page }) => {
      await openWith(page, 'open-confirm');
      // Without it the close button would take focus, being first in the DOM — and the close
      // button is the one control that means "undo opening this".
      expect(await activeTestId(page)).toBe('confirm-cancel');
    });

    test('Tab never leaves the panel', async ({ page }) => {
      await openWith(page, 'open-confirm');

      const walk: string[] = [];
      for (let i = 0; i < 6; i++) {
        await page.keyboard.press('Tab');
        walk.push(await activeTestId(page));
      }

      // Everything the walk touched is inside the panel — the opener behind it is not on it.
      expect(walk).not.toContain('open-confirm');
      expect(walk).not.toContain('open-basic');
      expect(
        walk.filter((id) => id === 'confirm-cancel').length,
      ).toBeGreaterThan(0);
    });
  });

  test.describe('the background', () => {
    test('it stops answering the pointer, the keyboard and a script', async ({
      page,
    }) => {
      await openWith(page, 'open-basic');

      const state = await page.evaluate(() => {
        const opener = document.querySelector(
          '[data-testid="open-confirm"]',
        ) as HTMLElement;
        const box = opener.getBoundingClientRect();
        opener.focus();
        return {
          // The hit test lands on the veil, not on the button underneath it.
          hit:
            document
              .elementFromPoint(box.x + 4, box.y + 4)
              ?.getAttribute('data-pct-part') ?? '',
          // `focus()` on an inert element is refused, so the active element does not move.
          focusMoved:
            document.activeElement?.getAttribute('data-testid') ===
            'open-confirm',
          inert: opener.closest('[inert]') !== null,
        };
      });

      expect(state.inert).toBe(true);
      expect(state.focusMoved).toBe(false);
      expect(state.hit).toBe('backdrop');
    });

    test('a live region goes on speaking', async ({ page }) => {
      await openWith(page, 'open-with-select');

      // The library's channels are children of `body`, so the first version of the inert
      // walk silenced them — and with them the sentence a select opened INSIDE this dialog
      // has to say when its list is empty.
      const silenced = await page.evaluate(
        () =>
          Array.from(document.querySelectorAll('[aria-live]')).filter(
            (region) => region.closest('[inert]') !== null,
          ).length,
      );
      expect(silenced).toBe(0);
    });

    test('the page stops scrolling, and starts again', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 500 });
      await visit(page, '/dialog');
      const scrollY = () => page.evaluate(() => window.scrollY);

      await page.mouse.move(640, 250);
      await page.mouse.wheel(0, 400);
      // The page really does scroll, or the lock below would be proving nothing.
      await expect.poll(scrollY).toBeGreaterThan(0);

      // Read AFTER opening, not before: focusing the opener scrolls it into view, so the
      // reading taken first is a reading of a different page.
      await openWith(page, 'open-basic');
      const locked = await settledScrollY(page);
      await page.mouse.wheel(0, 400);
      await page.waitForTimeout(300);
      expect(await scrollY()).toBe(locked);

      await page.keyboard.press('Escape');
      await expect(panel(page)).toHaveCount(0);
      const released = await settledScrollY(page);
      await page.mouse.wheel(0, 400);
      await expect.poll(scrollY).toBeGreaterThan(released);
    });

    /**
     * The scrollbar's width is what the lock has to hand back to the layout, or the page
     * jumps sideways the moment a dialog opens. In this suite only webkit shows it: blink and
     * gecko run here with scrollbars that overlay the content, so their gutter is 0 and this
     * case passes by having nothing to measure. The forced scrollbar is added to the page
     * rather than to the sandbox, so no visual baseline moves for it.
     */
    test('the page does not shift when the veil takes the scrollbar', async ({
      page,
    }) => {
      await page.addStyleTag({
        content: `html::-webkit-scrollbar { width: 15px } body { min-height: 300vh }`,
      });
      const cardWidth = () =>
        page.evaluate(
          () =>
            document
              .querySelector('[data-testid="demo-basics"]')
              ?.getBoundingClientRect().width ?? 0,
        );

      const before = await cardWidth();
      await openWith(page, 'open-basic');

      expect(await cardWidth()).toBe(before);
    });
  });

  test.describe('the ways out', () => {
    test('Escape closes it and says so', async ({ page }) => {
      await openWith(page, 'open-basic');
      await page.keyboard.press('Escape');

      await expect(panel(page)).toHaveCount(0);
      await expect(page.getByTestId('last-reason')).toHaveText('escape');
    });

    test('a press on the veil closes it', async ({ page }) => {
      await openWith(page, 'open-basic');
      // The corner of the viewport is veil in every engine and at every panel size.
      await page.mouse.click(8, 8);

      await expect(panel(page)).toHaveCount(0);
      await expect(page.getByTestId('last-reason')).toHaveText('backdrop');
    });

    test('a drag out of the panel does not close it', async ({ page }) => {
      await openWith(page, 'open-basic');
      const box = await panel(page).boundingBox();
      if (!box) throw new Error('the panel has no box');

      // Selecting text from inside the panel and letting go outside it is one `click` on the
      // veil, and closing on it throws away what the user was in the middle of doing.
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(8, 8);
      await page.mouse.up();

      await expect(panel(page)).toBeVisible();
    });

    test('a dialog that insists keeps the key and the veil', async ({
      page,
    }) => {
      await openWith(page, 'open-insistent');

      await page.keyboard.press('Escape');
      await page.mouse.click(8, 8);
      await page.waitForTimeout(200);
      await expect(panel(page)).toBeVisible();

      // The content's own control is the way out, and it is the only one.
      await page.getByTestId('insistent-ok').click();
      await expect(panel(page)).toHaveCount(0);
    });
  });

  /**
   * The case the whole component was shaped by. A native `<dialog showModal()>` gives the
   * trap, the restore, `inert` and Escape for free — and makes every CDK overlay on the page
   * inert while it is up, the top layer included, so this list would be unusable
   * (`lesson-89`). Here both panels are overlays in one container, and the closing stack
   * orders them.
   */
  test.describe('a panel inside the modal', () => {
    const trigger = (page: Page) =>
      page.getByTestId('select-country').locator('[data-pct-part="trigger"]');
    const options = (page: Page) => page.locator('[data-pct-part="option"]');

    test('the select opens, answers the pointer and picks', async ({
      page,
    }) => {
      await openWith(page, 'open-with-select');
      await trigger(page).click();

      await expect(options(page).first()).toBeVisible();
      await options(page).filter({ hasText: 'Germany' }).click();

      await expect(
        page.getByTestId('select-country').locator('[data-pct-part="value"]'),
      ).toHaveText('Germany');
      // Picking an option closed the list and left the dialog where it was.
      await expect(panel(page)).toHaveCount(1);
    });

    test('Escape closes the list first and the dialog second', async ({
      page,
    }) => {
      await openWith(page, 'open-with-select');
      await trigger(page).click();
      await expect(options(page).first()).toBeVisible();

      await page.keyboard.press('Escape');
      await expect(options(page)).toHaveCount(0);
      await expect(panel(page)).toBeVisible();
      // Nothing was closed by the dialog, so nothing was reported.
      await expect(page.getByTestId('last-reason')).toHaveText('—');

      await page.keyboard.press('Escape');
      await expect(panel(page)).toHaveCount(0);
      await expect(page.getByTestId('last-reason')).toHaveText('escape');
    });
  });

  /**
   * The panel is a child of `body`, so the writing direction is severed from it like every
   * other inherited property (`lesson-35`) and is carried over by hand.
   */
  test('the panel writes in the page’s direction', async ({ page }) => {
    await setRtl(page);
    await openWith(page, 'open-basic');

    await expect(panel(page)).toHaveAttribute('dir', 'rtl');
  });
});
