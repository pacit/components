import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The landing (2.1.6). Two claims are on trial. The page's numbers are the repository's —
 * so the first tests read the same tracked files the content pass reads and expect the
 * rendered strip to agree, which is the site's whole pitch folded into an assertion. And
 * the "live" cards are really the shipped components — so the rest drives them and watches
 * the ARIA they publish, not the pixels they paint.
 */
const ROOT = join(__dirname, '../../..');
const tracked = (path: string) => readFileSync(join(ROOT, path), 'utf8');

// Read at module scope: a snapshot that stops parsing leaves `MUTANTS` undefined, and the
// assertion below then demands the literal "undefined mutants" — loud enough.
const PAIRS = JSON.parse(tracked('libs/tokens/src/contrast.policy.json')).checks
  .length;
const FLOOR = JSON.parse(tracked('libs/tokens/src/primitive.json')).pct.target
  .min.$value;
const MUTANTS = /^TOTAL [\d.]+ \d+\/(\d+)$/m.exec(
  tracked('libs/components/mutation.snapshot.md'),
)?.[1];

test.describe('The landing', () => {
  test('the evidence strip shows what the tracked sources hold', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.getByTestId('fact-contrast')).toHaveText(String(PAIRS));
    await expect(page.getByTestId('fact-target')).toHaveText(FLOOR);
    await expect(page.getByTestId('machinery')).toContainText(
      `${MUTANTS} mutants`,
    );
  });

  test('the strip leads with the accessibility claim, worded as measurement', async ({
    page,
  }) => {
    await page.goto('/');
    const strip = page.getByTestId('evidence');
    await expect(strip).toContainText('WCAG 2.2 AA');
    await expect(strip).toContainText('machine-audited');
    // The certification sentence waits for 2.2's ACR — the page must not jump the gun.
    await expect(strip).not.toContainText(/conformant/i);
    // The AI tile points at files this same build really serves.
    for (const address of ['/llms.txt', '/components.json']) {
      const served = await page.request.get(address);
      expect(served.ok(), `${address} is a live address`).toBe(true);
    }
  });

  test('the stepper card is a live journey, not a screenshot', async ({
    page,
  }) => {
    await page.goto('/');
    const journey = page.getByTestId('live-stepper');
    await expect(journey.locator('[aria-current="step"]')).toContainText(
      'Delivery',
    );

    await page.getByTestId('live-next').click();
    await expect(journey.locator('[aria-current="step"]')).toContainText(
      'Payment',
    );
    await expect(page.getByTestId('live-next')).toBeDisabled();
  });

  test('removing a chip shortens the row; restore brings it back', async ({
    page,
  }) => {
    await page.goto('/');
    const chips = page.getByTestId('live-chips').locator('pct-chip');
    await expect(chips).toHaveCount(4);

    await chips.first().locator('[data-pct-part="remove"]').click();
    await expect(chips).toHaveCount(3);

    await page.getByTestId('live-restore').click();
    await expect(chips).toHaveCount(4);
  });

  test('the switch drives the bar through a signal', async ({ page }) => {
    await page.goto('/');
    const bar = page.getByTestId('live-progress').locator('progress');
    await expect(bar).toHaveJSProperty('value', 62);

    await page.getByTestId('live-switch').click();
    await expect(bar).toHaveJSProperty('value', 100);
  });

  test('the copy button answers through the toast viewport', async ({
    page,
  }) => {
    await page.goto('/');
    await page.getByTestId('install-copy').click();
    // Clipboard permission differs per engine; either wording rides the same toast.
    await expect(
      page.locator('pct-toast-viewport [data-pct-part="item"]'),
    ).toBeVisible();
  });

  test('the headline drift rides the motion axis and freezes under reduced motion', async ({
    page,
  }) => {
    const drift = () =>
      page
        .locator('.hero__grad')
        .evaluate((el) => getComputedStyle(el).animationDuration);

    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/');
    expect(await drift()).toBe('8s');

    await page.emulateMedia({ reducedMotion: 'reduce' });
    expect(await drift()).toBe('0s');
  });

  test('forced colors hands the gradient text back to the palette', async ({
    page,
  }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    await page.goto('/');

    const grad = page.locator('.hero__grad');
    expect(
      await grad.evaluate((el) => getComputedStyle(el).backgroundImage),
    ).toBe('none');
    // `transparent` keeps its alpha through forcing — invisible text — so the guard
    // hands the colour back and this reads anything BUT transparent.
    expect(
      await grad.evaluate((el) => getComputedStyle(el).color),
    ).not.toContain('rgba(0, 0, 0, 0)');
  });
});
