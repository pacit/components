import { expect, test } from '@playwright/test';
import { visit } from './support/dom';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The landing (0061). Two claims are on trial. The page's numbers are the repository's —
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
    // The certification sentence waits for the ACR (`req-a11y-acr`) — the page must not
    // jump the gun.
    await expect(strip).not.toContainText(/conformant/i);
    // The AI tile points at files this same build really serves.
    for (const address of ['/llms.txt', '/components.json']) {
      const served = await page.request.get(address);
      expect(served.ok(), `${address} is a live address`).toBe(true);
    }
  });

  /**
   * The index of components, and the criterion the SITE has to keep as much as the library.
   *
   * Every row is a link, so every row is a target: SC 2.5.8 asks for 24 px, and the first cut
   * of this list measured EXACTLY 24 with nothing between the rows — the floor scraped rather
   * than cleared, which is what it looked like on the page. The floor is read from the same
   * token the library's own controls stand on, so a skin that moves it moves this too.
   */
  test('every row of the index is a target a finger can find', async ({
    page,
  }) => {
    await visit(page, '/');
    const rows = page.getByTestId('gallery').locator('a');
    await expect(rows).toHaveCount(34);

    const floor = Number.parseInt(FLOOR, 10);
    const boxes = await rows.evaluateAll((els) =>
      els.map((el) => {
        const r = el.getBoundingClientRect();
        return {
          name: el.textContent?.trim().split(/\s+/)[0] ?? '?',
          h: r.height,
        };
      }),
    );
    const short = boxes.filter((b) => b.h < floor);
    expect(
      short,
      `rows under ${floor}px: ${short.map((b) => `${b.name} ${b.h}`).join(', ')}`,
    ).toEqual([]);

    // And clear of it rather than sitting on it: the row that only just reaches the floor is
    // the row nobody can hit twice in a row, and this list is thirty-four of them stacked.
    const tightest = Math.min(...boxes.map((b) => b.h));
    expect(tightest, `the tightest row is ${tightest}px`).toBeGreaterThan(
      floor,
    );
  });

  test('the machine catalogue is the inventory the site renders, read from the same sources', async ({
    page,
  }) => {
    // The tripwire of `req-api-catalogue`: the catalogue cannot drift from the pages because
    // both are one pass over the tracked sources — so this reads those sources itself and holds
    // the served file to them: the cards on disk, the texts channel in its source.
    const cards = readdirSync(join(ROOT, 'docs/components'))
      .filter(
        (f) => f.endsWith('.md') && f !== 'README.md' && f !== '_template.md',
      )
      .map((f) => f.replace(/\.md$/, ''))
      .sort();
    const channel = tracked('libs/components/core/src/texts.ts');
    const keys = [
      ...(
        channel.match(/export interface PctTexts \{([\s\S]*?)^\}/m)?.[1] ?? ''
      ).matchAll(/readonly (\w+): string;/g),
    ]
      .map((m) => m[1])
      .sort();

    const served = await page.request.get('/components.json');
    expect(served.ok()).toBe(true);
    const catalogue = await served.json();
    expect(
      catalogue.components.map((c: { id: string }) => c.id).sort(),
    ).toEqual(cards);
    expect(
      catalogue.texts.keys.map((k: { key: string }) => k.key).sort(),
    ).toEqual(keys);
    expect(Object.keys(catalogue.texts.template).sort()).toEqual(keys);
    for (const key of catalogue.texts.keys) {
      expect(key.meaning, `${key.key} has a meaning`).not.toBe('');
      expect(typeof key.default, `${key.key} has a default`).toBe('string');
    }
    // Every component names the page that documents it — a route routes.spec walks, so
    // no request is made here: thirty-three server renders from this test would load the
    // dev server the hover test next door is timing against — with its canonical usage
    // as text and its cost reading.
    for (const component of catalogue.components) {
      expect(component.docs).toBe(`/components/${component.id}`);
      expect(component.usage?.code, `${component.id} has a usage`).toBeTruthy();
      expect(component.evidence.cost.elements).toBeGreaterThan(0);
    }
    // llms.txt carries the same channel in prose, for a reader that takes markdown.
    const llms = await (await page.request.get('/llms.txt')).text();
    expect(llms).toContain('## Texts');
    for (const key of keys) expect(llms).toContain(`\`${key}\``);
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

  test('the hero arrives without withholding a word of itself', async ({
    page,
  }) => {
    const PARTS = [
      '.hero__eyebrow',
      '.hero__title',
      '.hero__lead',
      '.hero__cta',
      '.hero__install',
    ];
    const read = () =>
      page.evaluate(
        (parts) =>
          parts.map((selector) => {
            const style = getComputedStyle(document.querySelector(selector)!);
            return {
              delay: style.animationDelay,
              duration: style.animationDuration,
              opacity: style.opacity,
              transform: style.transform,
            };
          }),
        PARTS,
      );

    await visit(page, '/', { reducedMotion: 'no-preference' });
    const arriving = await read();

    // One step per part, in the order a reader meets them — and every step a division of
    // the axis token, which is what lets the whole thing freeze at its LAST frame below.
    expect(arriving.map((part) => part.delay)).toEqual([
      '0s',
      '0.09s',
      '0.18s',
      '0.27s',
      '0.36s',
    ]);
    expect(arriving.map((part) => part.duration)).toEqual(
      Array.from({ length: 5 }, () => '0.48s'),
    );

    // Nothing is withheld to make the arrival: this headline is the page's largest
    // painted element, and text at zero opacity is what axe reads as a contrast failure
    // — measured on this very page once already.
    expect(arriving.map((part) => part.opacity)).toEqual(
      Array.from({ length: 5 }, () => '1'),
    );

    // Less motion means the parts stand where they belong, immediately. `transform: none`
    // is the assertion that matters: a freeze on the FIRST frame would read as 14px of
    // displacement that never resolves, and the visual baselines are taken here.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    for (const part of await read()) {
      expect(Number.parseFloat(part.duration)).toBeLessThan(0.05);
      expect(Number.parseFloat(part.delay)).toBeLessThan(0.05);
      expect(part.transform).toBe('none');
    }
  });

  test('the headline drift rides the motion axis and freezes under reduced motion', async ({
    page,
  }) => {
    // The headline is `[pctHero]`'s `text` face since the gradient's hand copies went to the
    // component (0065) — so this reads the face's own sweep, which is what the page
    // used to write out for itself.
    const drift = () =>
      page
        .locator('[data-pct-hero="text"]')
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
    // ONE animation on the words now, not two: the page's own two-beat entrance went with
    // its hand copy, and what is left is the face's single pass — the same division of the
    // same token the rim takes, which is why one axis freezes both.
    expect(await drift()).toBe('4s');
    expect(await rim()).toBe('4s');

    // And it ENDS. An endless drift is what this copy had drifted into while the component
    // settled after one pass (`lesson-178`) — the reason a consumer owes SC 2.2.2 no control.
    expect(
      await page
        .locator('[data-pct-hero="text"]')
        .evaluate((el) => getComputedStyle(el).animationIterationCount),
    ).toBe('1');

    await page.emulateMedia({ reducedMotion: 'reduce' });
    expect(await drift()).toBe('0s');
    expect(await rim()).toBe('0s');
  });

  test('forced colors hands the gradient text back to the palette', async ({
    page,
  }) => {
    await visit(page, '/', { forcedColors: 'active' });

    const grad = page.locator('[data-pct-hero="text"]');
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
    // The rim's reveal is what says the hover landed: `interact` holds the layer at
    // `opacity: 0` and travels it to 1, and forced colours drops the drawing without
    // touching that half. Read in the instant after the hover, every `none` below is what
    // a card nobody is pointing at reads anyway — the guard would then pass because the
    // gesture it answers had not arrived, which is a conformance case failing GREEN
    // ([`lesson-192`](../../../docs/lessons.md#lesson-192)). `toHaveCSS` retries, and each
    // retry resolves `.first()` again.
    await expect(card).toHaveCSS('opacity', '1', { pseudo: 'after' });
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
