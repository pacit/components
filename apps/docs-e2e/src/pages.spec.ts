import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { visit } from './support/dom';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const WCAG_22_AA = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

// The registers' sizes, read from the same tracked sources the content pass reads — the
// page must agree with the repository, not with a number typed here.
const ROOT = join(__dirname, '../../..');
// The page's token rows are the button's DTCG tokens — counted from the same file.
const BUTTON_TOKENS = Object.keys(
  JSON.parse(
    readFileSync(join(ROOT, 'libs/tokens/src/component.button.json'), 'utf8'),
  ).pct.button,
).filter((k) => !k.startsWith('$')).length;
const ADRS = readdirSync(join(ROOT, 'docs/decisions')).filter((f) =>
  /^\d{4}-/.test(f),
).length;
const LESSONS = (
  readFileSync(join(ROOT, 'docs/lessons.md'), 'utf8').match(
    /^### <a id="lesson-\d+"/gm,
  ) ?? []
).length;

/**
 * The pages (2.1.7). The claims on trial: the gallery lists every card and each page
 * really renders — a LIVE demo (driven, not screenshotted), the demo's own source as the
 * code tab, the card's sections with their links rewritten onto /trust's anchors — and
 * the /trust, /theming, /support registers carry the repository's content under stable
 * addresses. The axe scans here cover the two new page SHAPES (a component page, the
 * trust register); the full route sweep is 2.1.8's bar.
 */
test.describe('The pages', () => {
  test('the gallery lists every card and leads into a page', async ({
    page,
  }) => {
    await visit(page, '/components');
    // By the tile's own link and not by every `<a>` under the gallery: the cards run real
    // components now, and breadcrumb's scene brings links of its own.
    const tiles = page.getByTestId('card-link');
    await expect(tiles).toHaveCount(33);

    await tiles.filter({ hasText: 'Button' }).first().click();
    await expect(page).toHaveURL(/\/components\/button$/);
    // The title now carries the status badge beside the name.
    await expect(page.locator('h1')).toContainText('Button');
  });

  /**
   * The gallery's claim after the 2.8 redesign: every card carries the component itself,
   * and it FITS. Both halves are load-bearing and neither is visible to a green suite that
   * only counts tiles — a scene authored for the component page's 675px stage overflows a
   * card silently, cropped by the stage, and the reader sees four of the button's six
   * faces without being told one was cut. Seven of the thirty-three did exactly that before
   * `CARD_DEMOS` was written; this is what keeps them from coming back.
   *
   * The stage is `inert` and `aria-hidden`, so the count of tab stops is the second claim:
   * thirty-three cards, thirty-three stops, whatever the scenes hold.
   */
  test('every card renders its component, and the stage holds it', async ({
    page,
  }) => {
    await visit(page, '/components');

    const stages = page.getByTestId('gallery').locator('.card__stage');
    await expect(stages).toHaveCount(33);

    // Each scene against its own stage, in one evaluation — 33 round trips would be a
    // minute of wall clock to learn the same thing.
    const overflowing = await page.evaluate(() => {
      const bad: {
        name: string | undefined;
        over: number;
        down: number;
        empty: boolean;
      }[] = [];
      for (const card of document.querySelectorAll('.card')) {
        const stage = card.querySelector('.card__stage');
        const scene = card.querySelector('.card__scene');
        const name = card.querySelector('.card__name')?.textContent?.trim();
        // A card with no stage at all is the other way this claim fails: the demo never
        // resolved, and the tile is back to being three lines of text.
        if (!stage || !scene) {
          bad.push({ name, over: 0, down: 0, empty: true });
          continue;
        }
        // The scene is centred inside a 16px padding, so it overflows the moment it is
        // wider or taller than the stage's content box.
        const over = Math.round(scene.scrollWidth - stage.clientWidth + 32);
        const down = Math.round(scene.scrollHeight - stage.clientHeight + 32);
        if (over > 0 || down > 0) bad.push({ name, over, down, empty: false });
      }
      return bad;
    });
    expect(overflowing, 'a card scene is cropped by its stage').toEqual([]);

    // The stage is inert, so a card is one tab stop — its name — and never the controls
    // its scene happens to hold.
    const stops = await page
      .getByTestId('gallery')
      .locator(
        'a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])',
      )
      .evaluateAll(
        (nodes) => nodes.filter((n) => !n.closest('[inert]')).length,
      );
    expect(stops).toBe(33);
  });

  /**
   * The conformance claim, stated as a sentence under the description (sketch C). It is the
   * one thing in the head that is a CLAIM rather than an address, and it has three readings:
   * a W3C pattern implemented, the platform carrying the semantics, or no pattern applying
   * at all. The third used to render as the single word "none", which read as a gap where
   * eleven cards hold an argument — so all three are checked here on the pages that carry
   * them, and the link each one offers is checked to lead somewhere.
   */
  test('the pattern claim reads as a sentence, in each of its three kinds', async ({
    page,
  }) => {
    await visit(page, '/components/tabs');
    const apg = page.getByTestId('pattern');
    await expect(apg).toContainText('Implements the W3C ARIA APG Tabs pattern');
    await expect(apg.locator('a')).toHaveAttribute(
      'href',
      'https://www.w3.org/WAI/ARIA/apg/patterns/tabs/',
    );

    // The platform kind names the element and claims nothing of its own.
    await visit(page, '/components/button');
    await expect(page.getByTestId('pattern')).toContainText(
      'Semantics come from the native <button>',
    );

    // The deliberate none says it is deliberate, and points at the section that argues it.
    await visit(page, '/components/badge');
    const none = page.getByTestId('pattern');
    await expect(none).toContainText('and none is invented');
    await none.locator('a').click();
    await expect(page.locator('#accessibility')).toBeInViewport();
  });

  test('the evidence tiles show the cost record, not a number typed in', async ({
    page,
  }) => {
    // The same tracked file the content pass reads (plan 2.3): the tile's number is the
    // button row of the record, and the record is what `check-bench` holds the run to.
    const record = readFileSync(
      join(__dirname, '../../docs/bench.snapshot.md'),
      'utf8',
    );
    const [, elements, , listeners, renders] =
      /^button (\d+) (\d+) (\d+) (\d+)$/m.exec(record)!;
    await visit(page, '/components/button');
    const cost = page.getByTestId('cost');
    await expect(cost.locator('.tile__n')).toHaveText(elements);
    await expect(cost).toContainText(`${listeners} listeners`);
    await expect(cost).toContainText(`${renders} render`);
    // The clock is on the tile with its unit, and nothing here compares its value.
    await expect(cost).toContainText(/\d+ µs/);
  });

  test('a component page shows the demo, and the code tab is its own source', async ({
    page,
  }) => {
    await visit(page, '/components/button');
    // The demo is a running instance — the library's own attribute proves the real
    // component rendered, not a picture of one.
    await expect(
      page.getByTestId('demo-panel').locator('[data-pct-variant="hero"]'),
    ).toBeVisible();

    await page.getByRole('tab', { name: 'Code' }).click();
    const source = page.getByTestId('source');
    await expect(source.locator('.shiki')).toBeVisible();
    await expect(source).toContainText(`import { PctButton }`);
  });

  test('a live demo on a page really runs — the dialog opens and traps', async ({
    page,
  }) => {
    await visit(page, '/components/dialog');
    await page
      .getByTestId('demo-panel')
      .getByRole('button', { name: 'Project settings' })
      .click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Done' }).click();
    await expect(dialog).toBeHidden();
  });

  test("the card's decision links land on /trust's anchors", async ({
    page,
  }) => {
    await visit(page, '/components/button');
    const link = page.locator('a[href="/trust#adr-0058"]').first();
    await expect(link).toBeVisible();
    await link.click();
    await expect(page).toHaveURL(/\/trust#adr-0058$/);
    // The anchor exists and the router's anchorScrolling brought it into view.
    const target = page.locator('#adr-0058');
    await expect(target).toBeVisible();
    await expect(target).toContainText('gradient');
  });

  /**
   * The redesigned page (plan 2.7.3): what it shows is READ, not typed — the API from the
   * source, the tokens from the DTCG files, the checks from the card — so the assertions
   * hold the page to the same files the content pass reads.
   */
  test('the API table is the source: variant defaults to solid and carries its JSDoc line', async ({
    page,
  }) => {
    await visit(page, '/components/button');
    const inputs = page.getByTestId('inputs');
    const variant = inputs.locator('tr', { hasText: 'variant' });
    await expect(variant).toContainText('PctButtonVariant');
    await expect(variant).toContainText("'solid'");
    await expect(variant).toContainText('Picks the face');
    // What the directive writes on the element, from the decorator's own `host`.
    await expect(page.getByTestId('host')).toContainText('data-pct-variant');
    await expect(page.getByTestId('host')).toContainText('aria-busy');
  });

  test('every token of the page carries a meaning and both defaults', async ({
    page,
  }) => {
    await visit(page, '/components/button');
    const rows = page.getByTestId('tokens').locator('tbody tr');
    await expect(rows).toHaveCount(BUTTON_TOKENS);
    const first = rows.first();
    await expect(first).toContainText('--pct-button-bg');
    await expect(first).toContainText('{pct.primary}');
    await expect(first).toContainText('Background of the solid face');
  });

  test('the examples run, and the code opens under the one asked', async ({
    page,
  }) => {
    await visit(page, '/components/button');
    const faces = page.locator('#ex-faces');
    // The stage's buttons only — the card's own "Show code" is a pctButton too.
    await expect(
      faces.locator('.example__stage button[data-pct-variant]'),
    ).toHaveCount(5);
    await faces.getByRole('button', { name: 'Show code' }).click();
    await expect(faces.locator('.shiki')).toBeVisible();
    await expect(faces).toContainText('variant="hero"');
  });

  test('the scorecard shows the measurements and the gaps side by side', async ({
    page,
  }) => {
    await visit(page, '/components/button');
    const checks = page.getByTestId('checks');
    await expect(
      checks.locator('[data-state="measured"]').first(),
    ).toBeVisible();
    await expect(checks.locator('[data-state="gap"]').first()).toBeVisible();
    await expect(checks.locator('[data-state="gap"]').first()).toContainText(
      'Gap',
    );
  });

  test('the theming fence is painted onto a second instance of the preview', async ({
    page,
  }) => {
    await visit(page, '/components/button');
    const themed = page
      .getByTestId('theming-stage')
      .locator('button[data-pct-variant="solid"]')
      .first();
    await expect(themed).toBeVisible();
    expect(
      await themed.evaluate((el) => getComputedStyle(el).backgroundColor),
    ).toBe('rgb(15, 118, 110)');
  });

  /** The offset the stylesheet declares — the one number the router and a native jump share. */
  const anchorOffset = (page: Page) =>
    page.evaluate(() =>
      parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue(
          '--docs-anchor-offset',
        ),
      ),
    );

  /** Where an anchor's box begins, against the viewport — the number a reader sees. */
  const topOf = (page: Page, id: string) =>
    page
      .locator(`#${id}`)
      .evaluate((el) => Math.round(el.getBoundingClientRect().top));

  /**
   * Two things measured in one walk. The reading line: one entry lit at a time, its section
   * lifted and never lit beside it. And where a followed link LANDS: the router positions the
   * target itself and reads no `scroll-margin`, so before `setOffset` a heading arrived at y=0
   * under a 56px bar (`lesson-159`) — the case asserts the offset to the pixel rather than
   * "below the bar", because the stylesheet and the router are meant to hold one number.
   */
  test('the table of contents follows the reading line, and a link lands its heading below the bar', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1400, height: 900 });
    await visit(page, '/components/button');
    // The rail's copy — the fold above the page holds another, hidden at this width.
    const toc = page.locator('.rail--toc [data-testid="toc"]');
    await expect(toc.locator('a.is-active')).toHaveText('Preview');

    const offset = await anchorOffset(page);
    const bar = await page.locator('.topbar').boundingBox();
    expect(offset).toBeGreaterThan(bar?.height ?? Infinity);

    // To the pixel, less one: webkit lands a fragment at 89 where the other two engines
    // land it at 88 — a rounding of the scroll position, not a second offset — and the
    // claim is that the heading sits at the offset and not at zero.
    const landed = async (id: string) =>
      Math.abs((await topOf(page, id)) - offset) <= 1;

    await toc.getByRole('link', { name: 'API', exact: true }).click();
    await expect.poll(() => landed('api')).toBe(true);
    await expect(toc.locator('a.is-active')).toHaveText('API');
    await expect(toc.locator('a.has-active')).toHaveCount(0);

    await toc.getByRole('link', { name: 'Inputs', exact: true }).click();
    await expect.poll(() => landed('api-inputs')).toBe(true);
    await expect(toc.locator('a.is-active')).toHaveText('Inputs');
    await expect(toc.locator('a.has-active')).toHaveText('API');
  });

  /**
   * A fragment in the address is followed when the navigation ends, and the demos land AFTER
   * that as lazy chunks — every heading below the preview then moves down by what arrived.
   * Measured before the page asked for its anchor a second time: `#ex-faces` at 160px where
   * the offset had put it at 88.
   */
  test('a fragment in the address lands its heading below the bar once the demos are in', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1400, height: 900 });
    await visit(page, '/components/button#ex-faces');
    await expect(page.locator('#ex-faces .stage').first()).toBeVisible();
    const offset = await anchorOffset(page);
    await expect
      .poll(async () => Math.abs((await topOf(page, 'ex-faces')) - offset) <= 1)
      .toBe(true);
  });

  test('the index filters the components and marks the current one', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1400, height: 900 });
    await visit(page, '/components/button');
    // The rail's copy — the drawer holds another, with no current page to light.
    const index = page.locator('.rail--index [data-testid="index"]');
    await expect(index.locator('a.is-current')).toHaveText('button');
    await index.getByTestId('index-filter').fill('sel');
    await expect(index.locator('a')).toHaveCount(1);
    await expect(index.locator('a')).toHaveText('select');
  });

  test('below the thresholds the rails give way and the table of contents folds', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 800, height: 900 });
    await visit(page, '/components/button');
    await expect(page.locator('.rail--index')).toBeHidden();
    await expect(page.locator('.rail--toc')).toBeHidden();
    const fold = page.locator('.toc-fold');
    await expect(fold).toBeVisible();
    await fold.locator('summary').click();
    await expect(fold.getByTestId('toc')).toBeVisible();
  });

  test('the token chips copy through the toaster', async ({ page }) => {
    await visit(page, '/components/select');
    await page.getByTestId('tokens').getByRole('button').first().click();
    await expect(
      page.locator('pct-toast-viewport [data-pct-part="item"]'),
    ).toBeVisible();
  });

  test('/trust renders the registers the repository tracks', async ({
    page,
  }) => {
    await visit(page, '/trust');
    await expect(page.getByTestId('stats')).toContainText('mutation score');
    await expect(
      page.getByTestId('registry').locator('#req-token-directive'),
    ).toBeVisible();
    await expect(page.getByTestId('decisions').locator('li')).toHaveCount(ADRS);
    await expect(page.getByTestId('lessons').locator('li')).toHaveCount(
      LESSONS,
    );
  });

  test('/theming tells the tiers and lists the public inventory', async ({
    page,
  }) => {
    await visit(page, '/theming');
    await expect(page.getByTestId('tier-semantic')).toContainText(
      '--pct-surface',
    );
    await expect(page.getByTestId('tier-component')).toContainText(
      '--pct-button-height-sm',
    );
  });

  test('/acr renders the conformance report the gate holds to its claims', async ({
    page,
  }) => {
    await visit(page, '/acr');
    const report = page.getByTestId('acr');
    await expect(
      report.getByRole('heading', { name: 'Summary' }),
    ).toBeVisible();
    await expect(report).toContainText('Not recorded');
    await expect(report.getByRole('table').first()).toBeVisible();
    // The trust page points at it through the router, not through a reload.
    await visit(page, '/trust');
    await page
      .getByTestId('acr')
      .getByRole('link', { name: 'Accessibility Conformance Report' })
      .click();
    await expect(page).toHaveURL(/\/acr$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Accessibility conformance report',
    );
  });

  test('/support and /start render their documents', async ({ page }) => {
    await visit(page, '/support');
    await expect(page.getByTestId('policy')).toContainText('angular-majors');

    await visit(page, '/start');
    await expect(page.locator('.shiki')).toHaveCount(3);
    await expect(page.locator('.shiki').first()).toContainText(
      'npm install @pacit/components',
    );
  });

  test('the top bar navigates; the narrow drawer takes over below the fold', async ({
    page,
  }) => {
    await visit(page, '/');
    await page
      .getByRole('navigation', { name: 'Site' })
      .first()
      .getByText('Trust')
      .click();
    await expect(page).toHaveURL(/\/trust$/);

    await page.setViewportSize({ width: 480, height: 900 });
    await page.getByTestId('menu-trigger').click();
    const drawer = page.getByTestId('menu');
    await expect(drawer).toBeVisible();
    await drawer.getByText('Components').click();
    await expect(page).toHaveURL(/\/components$/);
    // A shut drawer keeps its box and loses its content — the library's own contract
    // (`hidden="until-found"`), which visibility checks in this engine do not model.
    await expect(drawer).toHaveAttribute('hidden', 'until-found');
  });

  test('the two new page shapes pass the axe bar', async ({ page }) => {
    // The component page grew forty examples' worth of nodes; Firefox's axe pass on it
    // crossed the default 30 s under full-suite load (measured once, 2026-09-03).
    test.setTimeout(90_000);
    for (const path of ['/components/button', '/trust']) {
      await page.goto(path);
      await expect(page.locator('h1')).toBeVisible();
      const results = await new AxeBuilder({ page })
        .withTags(WCAG_22_AA)
        .analyze();
      expect(results.violations, `${path} violations`).toEqual([]);
    }
  });
});
