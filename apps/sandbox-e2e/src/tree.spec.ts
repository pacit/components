import { expect, test } from '@playwright/test';
import { visit } from './support/dom';

/**
 * The walk is the component (0056), so the walk is what three real engines are asked:
 * actual key presses moving actual focus, the roving tabindex leaving one way in and one
 * way out, and the pointer's one gesture. The structure around it is read back through
 * roles — the probe measured it clean without a single hand-written level number, and
 * these readings keep that from rotting.
 */
test.describe('PctTree — a walk the platform does not have', () => {
  test.beforeEach(async ({ page }) => {
    await visit(page, '/tree');
  });

  const item = (page: import('@playwright/test').Page, value: string) =>
    page.locator(`pct-tree-item[value="${value}"]`);

  test('a named tree of treeitems, the folded branch out of the visible walk', async ({
    page,
  }) => {
    const tree = page.getByTestId('tree');
    await expect(tree).toHaveAttribute('role', 'tree');
    await expect(tree).toHaveAttribute('aria-label', 'Project files');
    // Eight items in the DOM; what "folded" means is asked as VISIBILITY, not as a role
    // count — how far an until-found subtree stays in the accessibility tree differs by
    // engine (Chromium keeps it, on the strength of the very content-visibility that
    // makes it findable), and the component's promise is about what the eye and the
    // walk get.
    await expect(tree.locator('pct-tree-item')).toHaveCount(8);
    // `checkVisibility()` and not `toBeHidden()`: the folded subtree hides under
    // `content-visibility: hidden`, which the platform's own verdict models and
    // Playwright's WebKit heuristic does not — WebKit paints nothing there
    // (`elementFromPoint` lands on `<html>`) while the locator still says visible
    // ([`lesson-141`](../../../docs/lessons.md#lesson-141)).
    await expect(item(page, 'src/app.ts')).toBeVisible();
    expect(
      await item(page, 'docs/plan.md').evaluate((el) => el.checkVisibility()),
    ).toBe(false);
    await expect(item(page, 'src')).toHaveAttribute('aria-expanded', 'true');
    await expect(item(page, 'README.md')).not.toHaveAttribute('aria-expanded');
  });

  test('the application’s own model preselects, and the row says so', async ({
    page,
  }) => {
    await expect(item(page, 'src/app.ts')).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await expect(page.getByTestId('chosen')).toContainText('src/app.ts');
  });

  test('one tab stop: leaving and re-entering lands on the roving item', async ({
    page,
  }) => {
    // Backwards on purpose: the tree is the last tabbable thing on this page, and what
    // a forward Tab does past the end is the browser's own business (Firefox hands
    // focus to its chrome and leaves `activeElement` standing). Shift+Tab always has a
    // page target — and coming back must land on the item the walk left, not the first.
    await item(page, 'README.md').click();
    await page.keyboard.press('ArrowDown');
    await expect(item(page, 'src')).toBeFocused();
    // The focus and the tab ORDER are one render apart, and both assertions below read
    // the order. `focusHost()` runs inside the keypress; `[tabindex]` is a host binding
    // this zoneless application SCHEDULES. Ask the browser to leave before that render
    // arrives and it walks backwards into the item still holding the `0` — measured in
    // the browser with the pair forced stale: `Shift+Tab` lands on `README.md` instead
    // of the page, and the `Tab` back lands on `body`
    // ([`lesson-217`](../../../docs/lessons.md#lesson-217)).
    await expect(item(page, 'src')).toHaveAttribute('tabindex', '0');

    await page.keyboard.press('Shift+Tab');
    await expect(page.locator('pct-tree-item:focus')).toHaveCount(0);

    await page.keyboard.press('Tab');
    await expect(item(page, 'src')).toBeFocused();
  });

  test('the arrows walk visible rows; forward opens and enters; back closes and climbs', async ({
    page,
  }) => {
    await item(page, 'README.md').click();
    await page.keyboard.press('ArrowDown');
    await expect(item(page, 'src')).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(item(page, 'src/app.ts')).toBeFocused();

    await page.keyboard.press('ArrowDown');
    await expect(item(page, 'src/views')).toBeFocused();
    await page.keyboard.press('ArrowRight');
    await expect(item(page, 'src/views')).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    await page.keyboard.press('ArrowRight');
    await expect(item(page, 'src/views/home.ts')).toBeFocused();

    await page.keyboard.press('ArrowLeft');
    await expect(item(page, 'src/views')).toBeFocused();
    await page.keyboard.press('ArrowLeft');
    await expect(item(page, 'src/views')).toHaveAttribute(
      'aria-expanded',
      'false',
    );

    await page.keyboard.press('End');
    await expect(item(page, 'docs')).toBeFocused();
    await page.keyboard.press('Home');
    await expect(item(page, 'README.md')).toBeFocused();
  });

  test('Enter chooses the row under focus, and the model follows', async ({
    page,
  }) => {
    await item(page, 'README.md').click();
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await expect(item(page, 'src')).toHaveAttribute('aria-selected', 'true');
    await expect(item(page, 'src/app.ts')).toHaveAttribute(
      'aria-selected',
      'false',
    );
    await expect(page.getByTestId('chosen')).toContainText('Chosen: src');
  });

  test('a click chooses; on a branch it also folds; a child’s press never climbs', async ({
    page,
  }) => {
    await item(page, 'docs').click();
    await expect(item(page, 'docs')).toHaveAttribute('aria-expanded', 'true');
    await expect(item(page, 'docs')).toHaveAttribute('aria-selected', 'true');

    await item(page, 'docs/plan.md').click();
    await expect(page.getByTestId('chosen')).toContainText('docs/plan.md');
    // The press stopped at the child: the branch neither re-folded nor re-chose.
    await expect(item(page, 'docs')).toHaveAttribute('aria-expanded', 'true');
    await expect(item(page, 'docs')).toHaveAttribute('aria-selected', 'false');
  });

  test('a folded branch is still findable: beforematch opens it', async ({
    page,
  }) => {
    // `.first()`: every item renders its own group (the leaf's stands empty and
    // hidden), so the bare locator would also catch the nested child's.
    const group = item(page, 'docs').locator('[role="group"]').first();
    await expect(group).toHaveAttribute('hidden', 'until-found');
    await group.evaluate((el) => el.dispatchEvent(new Event('beforematch')));
    await expect(item(page, 'docs')).toHaveAttribute('aria-expanded', 'true');
    await expect(group).not.toHaveAttribute('hidden');
  });
});
