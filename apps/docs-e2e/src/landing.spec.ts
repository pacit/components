import { expect, test } from '@playwright/test';
import { visit } from './support/dom';
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
    await visit(page, '/');
    await expect(page.getByTestId('fact-contrast')).toHaveText(String(PAIRS));
    await expect(page.getByTestId('fact-target')).toHaveText(FLOOR);
    await expect(page.getByTestId('machinery')).toContainText(
      `${MUTANTS} mutants`,
    );
  });

  test('the strip leads with the accessibility claim, worded as measurement', async ({
    page,
  }) => {
    await visit(page, '/');
    const strip = page.getByTestId('evidence');
    await expect(strip).toContainText('WCAG 2.2 AA');
    await expect(strip).toContainText('machine-audited');

    // The order is an argument and not an accident, so it is pinned: the accessibility
    // claim leads because it is what the library is for, the agent surface stands second
    // because it is what nobody else offers, and the three numbers behind them are the
    // evidence for the first (chosen 2026-09-04).
    await expect(strip.locator('.fact').first()).toContainText('WCAG 2.2 AA');
    await expect(strip.locator('.fact').nth(1)).toContainText('AI-ready');

    // The facts arrive one at a time as the strip is scrolled to, and the arrival must not
    // be able to leave one behind: every one of the five is visible once the section is.
    await strip.scrollIntoViewIfNeeded();
    const facts = strip.locator('.fact');
    await expect(facts).toHaveCount(5);
    for (let at = 0; at < 5; at++) await expect(facts.nth(at)).toBeVisible();
    // Opaque at every moment, revealed or not: the arrival moves the fact and never fades
    // it, because a fact waiting its turn below the fold at zero opacity is text axe reads
    // as unreadable — measured, webkit, 1.01:1 (2026-09-04).
    for (let at = 0; at < 5; at++)
      await expect(facts.nth(at)).toHaveCSS('opacity', '1');
    // The certification sentence waits for 2.2's ACR — the page must not jump the gun.
    await expect(strip).not.toContainText(/conformant/i);
    // The AI tile points at files this same build really serves.
    for (const address of ['/llms.txt', '/components.json']) {
      const served = await page.request.get(address);
      expect(served.ok(), `${address} is a live address`).toBe(true);
    }
  });

  test('the tabs card follows the arrow keys, not a screenshot', async ({
    page,
  }) => {
    await visit(page, '/');
    const strip = page.getByTestId('live-tabs');
    const chosen = strip.locator('[role="tab"][aria-selected="true"]');
    await expect(chosen).toHaveText('General');

    // The whole strip is one tab stop: the press goes to the chosen tab, and the arrow
    // moves the selection from there. Automatic activation, so the panel follows the
    // selection without a second key.
    await chosen.press('ArrowRight');
    await expect(chosen).toHaveText('Network');
    await expect(
      strip.locator('[role="tabpanel"]:not([hidden])'),
    ).toContainText('Proxies');
  });

  test('hovering a live card lights its rim, and paints the name only', async ({
    page,
  }) => {
    await visit(page, '/');
    const card = page.getByTestId('live').locator('.card').first();
    const rim = () =>
      card.evaluate((el) => getComputedStyle(el, '::after').opacity);
    const name = card.locator('.card__name');
    const selector = card.locator('.card__title code');
    const selectorColour = await selector.evaluate(
      (el) => getComputedStyle(el).color,
    );

    // At rest the card is what it always was. A rim reading `1` here means the engine
    // has no `mask-composite`, so the `@supports` block never applied and the gradient
    // would be covering the whole card rather than its edge — worth a red, not a skip.
    expect(await rim()).toBe('0');

    await card.hover();
    await expect.poll(rim).toBe('1');

    // The punch-out itself, not only the guard that let it in: an engine that matched
    // `@supports` and then dropped the composite would paint the gradient over the whole
    // card rather than around it, and every assertion below would still pass.
    const composite = await card.evaluate((el) => {
      const style = getComputedStyle(el, '::after');
      return [style.maskComposite, style.webkitMaskComposite].join(' ');
    });
    expect(composite).toMatch(/xor|exclude/);

    // The name takes the three stops: its own colour goes transparent and the gradient
    // arrives behind the glyphs.
    await expect(name).toHaveCSS('color', 'rgba(0, 0, 0, 0)');
    await expect(name).not.toHaveCSS('background-image', 'none');

    // The selector is the string a reader copies, not decoration — it keeps its colour
    // and takes no gradient of its own.
    await expect(selector).toHaveCSS('color', selectorColour);
    await expect(selector).toHaveCSS('background-image', 'none');
  });

  test('removing a chip shortens the row; restore brings it back', async ({
    page,
  }) => {
    await visit(page, '/');
    const chips = page.getByTestId('live-chips').locator('pct-chip');
    await expect(chips).toHaveCount(4);

    await chips.first().locator('[data-pct-part="remove"]').click();
    await expect(chips).toHaveCount(3);

    await page.getByTestId('live-restore').click();
    await expect(chips).toHaveCount(4);
  });

  test('the switch drives the bar through a signal', async ({ page }) => {
    await visit(page, '/');
    const bar = page.getByTestId('live-progress').locator('progress');
    await expect(bar).toHaveJSProperty('value', 62);

    await page.getByTestId('live-switch').click();
    await expect(bar).toHaveJSProperty('value', 100);
  });

  test('the copy button answers through the toast viewport', async ({
    page,
  }) => {
    await visit(page, '/');
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

    // The card rim divides the same token rather than naming a duration of its own —
    // which is the whole point: `calc(0s / 2)` is `0s`, so one axis freezes both.
    const rim = () =>
      page
        .getByTestId('live')
        .locator('.card')
        .first()
        .evaluate((el) => getComputedStyle(el, '::after').animationDuration);

    await visit(page, '/', { reducedMotion: 'no-preference' });
    expect(await drift()).toBe('8s');
    expect(await rim()).toBe('4s');

    await page.emulateMedia({ reducedMotion: 'reduce' });
    expect(await drift()).toBe('0s');
    expect(await rim()).toBe('0s');
  });

  test('forced colors hands the gradient text back to the palette', async ({
    page,
  }) => {
    await visit(page, '/', { forcedColors: 'active' });

    const grad = page.locator('.hero__grad');
    expect(
      await grad.evaluate((el) => getComputedStyle(el).backgroundImage),
    ).toBe('none');
    // `transparent` keeps its alpha through forcing — invisible text — so the guard
    // hands the colour back and this reads anything BUT transparent.
    expect(
      await grad.evaluate((el) => getComputedStyle(el).color),
    ).not.toContain('rgba(0, 0, 0, 0)');

    // The live card carries the same two drawings, and forced colors keeps IMAGES: the
    // rim and the hovered name would go on painting over the forced Canvas without the
    // guard that drops them.
    const card = page.getByTestId('live').locator('.card').first();
    await card.hover();
    expect(
      await card.evaluate(
        (el) => getComputedStyle(el, '::after').backgroundImage,
      ),
    ).toBe('none');

    const name = card.locator('.card__name');
    expect(
      await name.evaluate((el) => getComputedStyle(el).backgroundImage),
    ).toBe('none');
    expect(
      await name.evaluate((el) => getComputedStyle(el).color),
    ).not.toContain('rgba(0, 0, 0, 0)');
  });
});
