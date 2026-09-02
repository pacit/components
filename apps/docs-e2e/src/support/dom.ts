import { Page } from '@playwright/test';

/**
 * Entering a docs page — it waits for interactivity, not for `load` alone. The shell
 * raises `data-docs-ready` on `<html>` after `whenStable()` (the sandbox's own idiom):
 * before that instant the server's HTML can be clicked but nothing listens, and with
 * the demos arriving as lazy chunks that window is long enough for a loaded runner to
 * fall into — measured the night the full suite first ran. The fonts settle here too,
 * so a screenshot never reads the fallback face's metrics.
 *
 * Media emulation goes BEFORE `goto` — the first render must already stand under the
 * emulated preference, and `test.use({ reducedMotion })` does not reach the context in
 * this Playwright (the sandbox's measured note, repeated rather than rediscovered).
 */
export async function visit(
  page: Page,
  path: string,
  media?: Parameters<Page['emulateMedia']>[0],
): Promise<void> {
  if (media) await page.emulateMedia(media);
  await page.goto(path);
  await page.locator('html[data-docs-ready]').waitFor();
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
}
