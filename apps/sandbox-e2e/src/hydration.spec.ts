import { expect, test } from '@playwright/test';
import { hydrationErrors, uncaughtErrors, visit } from './support/dom';
import { SBX_ROUTES } from './support/views';

/**
 * SSR with hydration is a hard requirement (req-project-ssr), but breaking it does
 * not knock the page over: Angular logs NG0500 and quietly rebuilds the subtree
 * from scratch. The application therefore looks correct and pays for it with a
 * double render, a lost DOM state and flicker — and no test so far saw any of it.
 *
 * The check itself sits in `visit()`, so it covers EVERY e2e test in this project.
 * This file adds the two things that side effect cannot give: an explicit walk
 * through every view (those without a spec of their own included) and a control
 * test of the gate itself.
 */
test.describe('SSR hydration', () => {
  for (const path of SBX_ROUTES) {
    test(`the ${path} view hydrates with no mismatch`, async ({ page }) => {
      // `visit` throws on its own once it sees NG05xx — the assertion below is there
      // so the test states something visible, not just the absence of an exception.
      await visit(page, path);
      expect(hydrationErrors(page)).toEqual([]);
      expect(uncaughtErrors(page)).toEqual([]);
    });
  }

  /**
   * Client-side navigation hydrates nothing, but a lazy view reaches the page after
   * hydration has finished — and that is the moment when the id counter from
   * lesson-31 drifted apart.
   */
  test('moving between views throws no errors either', async ({ page }) => {
    await visit(page, '/');
    for (const path of ['/field', '/select', '/states', '/all']) {
      await page
        .getByRole('link', { name: new RegExp('.') })
        .first()
        .waitFor();
      await visit(page, path);
    }
    expect(hydrationErrors(page)).toEqual([]);
    expect(uncaughtErrors(page)).toEqual([]);
  });

  /**
   * A test of the gate itself, not of the application — in the spirit of the control
   * in `a11y.spec.ts`. A gate that can never fire (because, say, the listener is
   * attached after `goto()`, or the pattern is wrong) gives false confidence and
   * passes exactly like a working one.
   */
  test('the gate really does detect a hydration error (a control of the gate)', async ({
    page,
  }) => {
    await visit(page, '/');
    expect(hydrationErrors(page)).toEqual([]);

    await page.evaluate(() =>
      console.error(
        'NG0500: During hydration Angular expected <div> but found <span>',
      ),
    );
    await expect
      .poll(() => hydrationErrors(page).length, {
        message: 'the console listener saw no hydration error',
      })
      .toBe(1);

    // And that `visit()` really does fail on it — without that the gate collects
    // errors nobody turns into a red test.
    await expect(visit(page, '/button')).rejects.toThrow(/Hydration error/);
  });
});
