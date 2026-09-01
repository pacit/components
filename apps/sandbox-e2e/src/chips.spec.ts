import { expect, test, type Page } from '@playwright/test';
import { boxOf, visit } from './support/dom';

/**
 * What is measured here is mostly WHERE FOCUS STANDS, because that is the component: the
 * list, the buttons and the keyboard are the platform's, and the one thing `pct-chips` adds
 * is the repair after a removal takes the focused button out of the document
 * ([0051](../../../docs/decisions/0051-chips-are-a-list-the-user-shortens.md)). A unit run
 * drives the same verdicts through a synthetic press; only a browser can say what a REAL
 * Enter does to `document.activeElement` — and three engines have to agree, or "Enter,
 * Enter, Enter empties the row" is a claim about one of them.
 */
test.describe('PctChips — a list the user shortens', () => {
  test.beforeEach(async ({ page }) => {
    await visit(page, '/chips');
  });

  const crosses = (page: Page, rowId = 'row') =>
    page.getByTestId(rowId).locator('[data-pct-part="remove"]');

  const chipsOf = (page: Page, rowId = 'row') =>
    page.getByTestId(rowId).locator('pct-chip');

  /** The chip the focused element stands in — the whole repair is read through this. */
  const focusedChipText = (page: Page) =>
    page.evaluate(() =>
      document.activeElement?.closest('pct-chip')?.textContent?.trim(),
    );

  test('is a named list and every chip a listitem — the count a reader hears first', async ({
    page,
  }) => {
    const row = page.getByTestId('row');
    await expect(row).toHaveAttribute('role', 'list');
    await expect(row).toHaveAttribute('aria-label', 'Active filters');
    await expect(chipsOf(page)).toHaveCount(5);
    for (const chip of await chipsOf(page).all())
      await expect(chip).toHaveAttribute('role', 'listitem');
  });

  test('the remove control is a real button, named by the library alone', async ({
    page,
  }) => {
    const cross = crosses(page).first();
    await expect(cross).toHaveRole('button');
    await expect(cross).toHaveAttribute('type', 'button');
    await expect(cross).toHaveAccessibleName('Remove');
  });

  test('a press removes the value and lands focus on the next cross', async ({
    page,
  }) => {
    await crosses(page).nth(1).focus();
    await page.keyboard.press('Enter');

    await expect(chipsOf(page)).toHaveCount(4);
    await expect(page.getByTestId('row-state')).toHaveText('4 of 5 left');
    expect(await focusedChipText(page)).toBe('Free shipping');
  });

  test('Enter, Enter, Enter empties the row with no Tab between them', async ({
    page,
  }) => {
    // The sentence the decision promises a keyboard user, measured as five keystrokes: each
    // press lands focus on the next button, so the sixth key would have nothing to press.
    await crosses(page).first().focus();
    for (let left = 5; left > 0; left--) {
      await expect(chipsOf(page)).toHaveCount(left);
      await page.keyboard.press('Enter');
    }

    await expect(chipsOf(page)).toHaveCount(0);
    await expect(page.getByTestId('row-state')).toHaveText('0 of 5 left');
    // The last removal has no target left and repairs nothing — where focus goes then is the
    // page's question, and the component's answer is to stand still.
    expect(await focusedChipText(page)).toBeUndefined();
  });

  test('the last chip’s removal falls back to the cross before it', async ({
    page,
  }) => {
    await crosses(page).last().focus();
    await page.keyboard.press('Enter');

    await expect(chipsOf(page)).toHaveCount(4);
    expect(await focusedChipText(page)).toBe('New');
  });

  test('the repair steps over a chip with no button', async ({ page }) => {
    // The mixed row pins its middle value: the nearest survivor has nothing to focus, and
    // the repair has to walk on to the third chip rather than give up on the second.
    await crosses(page, 'mixed').first().focus();
    await page.keyboard.press('Enter');

    await expect(chipsOf(page, 'mixed')).toHaveCount(2);
    expect(await focusedChipText(page)).toBe('archived');
  });

  test('Tab walks the crosses in document order, skipping the pinned chip by itself', async ({
    page,
  }) => {
    // Zero key handlers is a measurable promise: the platform's Tab must be enough, and a
    // chip with no button must cost nothing to step over because there is nothing in it to
    // stop at.
    await crosses(page, 'mixed').first().focus();
    await page.keyboard.press('Tab');
    expect(await focusedChipText(page)).toBe('archived');
  });

  test('a removed the page ignores removes nothing', async ({ page }) => {
    // The announcement-not-an-act half: this row asks first, so the chip stands after the
    // press and the platform keeps focus where it was — on a button that still exists.
    await crosses(page, 'confirm-row').first().focus();
    await page.keyboard.press('Enter');

    await expect(chipsOf(page, 'confirm-row')).toHaveCount(3);
    await expect(page.getByTestId('confirm')).toContainText('Ada');
    expect(await focusedChipText(page)).toBe('Ada');

    await page.getByTestId('keep').click();
    await expect(chipsOf(page, 'confirm-row')).toHaveCount(3);
  });

  test('the page confirming is what removes — and by then the repair stands down', async ({
    page,
  }) => {
    // A removal performed later, behind a confirmation, is one the user has navigated away
    // from: the value leaves, and focus stays with the control the user actually pressed.
    await crosses(page, 'confirm-row').first().focus();
    await page.keyboard.press('Enter');
    await page.getByTestId('confirm').click();

    await expect(chipsOf(page, 'confirm-row')).toHaveCount(2);
    await expect(chipsOf(page, 'confirm-row').first()).toContainText('Grace');
    expect(await focusedChipText(page)).toBeUndefined();
  });

  test('the remove target clears 24 px at every size of the row', async ({
    page,
  }) => {
    // `req-a11y-touch` with the pill at its smallest: at `sm` the pill is 28 px and the
    // button inside it may not shrink with it — the floor a finger gets is not a size axis.
    for (const rowId of ['size-sm', 'size-md', 'size-lg']) {
      const cross = crosses(page, rowId).first();
      const box = await boxOf(cross);
      expect(box.width, rowId).toBeGreaterThanOrEqual(24);
      expect(box.height, rowId).toBeGreaterThanOrEqual(24);
    }
  });

  test('the pills stand on the shared control axis', async ({ page }) => {
    // `req-api-size` as arithmetic: the pill's box IS the control height token, so a row of
    // chips lines up with a field or a button of the same size by definition, not by eye.
    const heights: Record<string, number> = {};
    for (const [rowId, expected] of [
      ['size-sm', 28],
      ['size-md', 36],
      ['size-lg', 44],
    ] as const) {
      const box = await boxOf(chipsOf(page, rowId).first());
      expect(box.height, rowId).toBeCloseTo(expected, 0);
      heights[rowId] = box.height;
    }
  });

  test('a programmatic removal moves no focus — the arm exists only under a press', async ({
    page,
  }) => {
    // "Restore everything" rewrites the arrays from a button outside every row: chips
    // appear, none were pressed, and focus must stay exactly where the platform put it.
    await crosses(page).first().focus();
    await page.keyboard.press('Enter');
    await page.getByTestId('restore').click();

    await expect(chipsOf(page)).toHaveCount(5);
    const active = await page.evaluate(() =>
      document.activeElement?.getAttribute('data-testid'),
    );
    expect(active).toBe('restore');
  });
});
