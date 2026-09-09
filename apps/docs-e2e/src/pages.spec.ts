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
// SC 2.5.8's floor, read from the primitive the library's own controls stand on — a skin that
// moves it moves the gallery's band bar with it.
const TARGET_FLOOR = Number.parseInt(
  JSON.parse(readFileSync(join(ROOT, 'libs/tokens/src/primitive.json'), 'utf8'))
    .pct.target.min.$value,
  10,
);
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
    await expect(tiles).toHaveCount(34);

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
   * thirty-four cards, thirty-four stops, whatever the scenes hold.
   */
  test('every card renders its component, and the stage holds it', async ({
    page,
  }) => {
    await visit(page, '/components');

    const stages = page.getByTestId('gallery').locator('.card__stage');
    await expect(stages).toHaveCount(34);

    // Each scene against its own stage, in one evaluation — 34 round trips would be a
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
    expect(stops).toBe(34);
  });

  /**
   * The finder (4.34, plate B): the gallery filters by the rule `docs-index` already
   * filters by, and `apps/docs/src/app/find.ts` is the one copy of it, so the rail, the
   * drawer and this page cannot answer the same typing three ways. Both halves are on
   * trial, and the second is the one that can break in silence — narrowing DESTROYS the
   * outlet under every card it drops, and a filter that cannot rebuild them leaves a page
   * of empty cards that still counts thirty-four names.
   */
  test('the finder narrows the gallery, and clearing it brings the demos back', async ({
    page,
  }) => {
    await visit(page, '/components');
    const gallery = page.getByTestId('gallery');
    const count = page.getByTestId('gallery-count');
    const filter = page.getByTestId('gallery-filter');
    await expect(count).toHaveText('34 of 34');

    await filter.fill('date');
    await expect(count).toHaveText('1 of 34');
    await expect(gallery.locator('.card__name')).toHaveText(['Date']);
    // A bucket with nothing to show goes with its header, rather than standing empty.
    await expect(gallery.locator('.bucket')).toHaveCount(1);

    await filter.fill('nothing answers to this');
    await expect(count).toHaveText('0 of 34');
    await expect(gallery.locator('.card')).toHaveCount(0);
    await expect(page.getByTestId('gallery-empty')).toHaveText(
      'No component answers to that.',
    );

    await filter.fill('');
    await expect(count).toHaveText('34 of 34');
    await expect(gallery.locator('.card')).toHaveCount(34);
    // The half that costs something: thirty-four stages, each with its component back in it.
    await expect(gallery.locator('.card__stage')).toHaveCount(34);
    await expect(gallery.locator('.card__scene > *')).toHaveCount(34);
  });

  /**
   * Six bands, six addresses (4.34). The `<h2>` carried no `id` at all, so
   * `/components#choices` did not exist and nothing on the site — not the landing, not a
   * card, not a sentence of prose — could point past 1758 px of page at the bucket a reader
   * already knew the name of. The six are typed out here because they are published
   * addresses: one that changes quietly breaks every link ever made to it.
   */
  test('every band of the gallery has an address, and it clears the header', async ({
    page,
  }) => {
    await visit(page, '/components');
    const ids = await page
      .getByTestId('gallery')
      .locator('.bucket__name')
      .evaluateAll((heads) => heads.map((head) => head.id));
    expect(ids).toEqual([
      'actions-navigation',
      'text-numbers',
      'choices',
      'overlays',
      'data-status',
      'layout-theming',
    ]);

    await visit(page, '/components#choices');
    const landing = await page.evaluate(() => ({
      top: Math.round(
        document.getElementById('choices')?.getBoundingClientRect().top ??
          Number.NaN,
      ),
      offset: Number.parseInt(
        getComputedStyle(document.documentElement).getPropertyValue(
          '--docs-anchor-offset',
        ),
        10,
      ),
      header: Math.round(
        document.querySelector('header')?.getBoundingClientRect().bottom ?? 0,
      ),
    }));
    // Both failures this catches are far outside the band: no `id` leaves the heading 1758 px
    // down the page, and no offset puts it under a sticky header that is 57 px deep.
    expect(landing.offset).toBeGreaterThan(landing.header);
    expect(landing.top).toBeGreaterThanOrEqual(landing.offset - 4);
    expect(landing.top).toBeLessThanOrEqual(landing.offset + 40);
  });

  /**
   * The bar is those six addresses made visible (4.34, plate A inside plate B). What it costs
   * is checked here rather than argued: every chip is a LINK, so every chip owes SC 2.5.8's
   * floor outright — the reason this bar wraps to three or four rows on a narrow page instead
   * of shrinking. And it says where the reader IS, through the same scroll spy the component
   * page's table of contents runs, which is the one copy of that reading (`apps/docs/src/app/spy.ts`).
   */
  test('the band bar carries the addresses, and says which band the reader is in', async ({
    page,
  }) => {
    await visit(page, '/components');
    const bar = page.getByTestId('gallery-bar');
    const chips = bar.locator('.bar__chip');
    await expect(chips).toHaveCount(6);
    await expect(chips.first()).toContainText('Actions & navigation');
    await expect(chips.first().locator('b')).toHaveText('5');

    const heights = await chips.evaluateAll((els) =>
      els.map((el) => el.getBoundingClientRect().height),
    );
    expect(Math.min(...heights)).toBeGreaterThanOrEqual(TARGET_FLOOR);

    // Before the reader has moved they are in the first band, and the bar says so.
    await expect(bar.locator('.bar__chip.is-active')).toContainText(
      'Actions & navigation',
    );

    await chips.nth(3).click();
    await expect(page).toHaveURL(/#overlays$/);
    await expect(bar.locator('.bar__chip.is-active')).toContainText('Overlays');
    await expect(bar.locator('[aria-current="location"]')).toHaveCount(1);

    // The bar follows the list it indexes: a band the filter emptied leaves with its header,
    // so every chip standing is an address of something that is on the page.
    await page.getByTestId('gallery-filter').fill('button');
    await expect(chips).toHaveCount(1);
    await expect(chips.first().locator('b')).toHaveText('1');
  });

  /**
   * The nine defects the five readings found on this page (4.34), as the cases that keep them
   * from coming back. Two of them had been wrong for weeks in the one place on the site whose
   * whole job is to prove that nothing here is wrong quietly — which is what a gate is for.
   */
  test('the evidence tiles carry numbers, not the empty case', async ({
    page,
  }) => {
    // The snapshot grew an `errored` column and the content pass's row regex kept asking for
    // six fields, so it matched nothing and every one of the 34 pages printed "—" over the
    // sentence "no mutants to kill — the policy says why". `button.ts` has 32.
    for (const id of ['button', 'toast', 'select', 'progress']) {
      await visit(page, `/components/${id}`);
      const tiles = page.getByTestId('evidence');
      await expect(tiles).not.toContainText('no mutants to kill');
      await expect(tiles.locator('.tile__n').first()).toHaveText(/^\d/);
      // And the colour-pairs tile, which used to match a naming accident: it asked for checks
      // called `<id>/…` while the policy writes `select — label` and `UI: select border`.
      // The number and its label are separate spans with no whitespace between them.
      await expect(tiles).toContainText(/[1-9]\d*\s*colour pairs measured/);
    }
  });

  test('the import you copy names what the fence below it uses', async ({
    page,
  }) => {
    // `toast` documents `PctToaster` and its shortest use mounts `<pct-toast-viewport />`.
    // An import line derived from the card's own class alone does not compile the snippet
    // printed two blocks under the button that hands it over.
    await visit(page, '/components/toast');
    const line = page.locator('#usage pre.plain code');
    await expect(line).toContainText('PctToaster');
    await expect(line).toContainText('PctToastViewport');

    await visit(page, '/components/field');
    await expect(page.locator('#usage pre.plain code')).toContainText(
      'PctText',
    );
  });

  test('every entry of the table of contents points at a section that is there', async ({
    page,
  }) => {
    // `toast` and `tooltip` offered "On the element" and rendered no such block: the contents
    // asked one question and the template another. A link that writes a fragment, moves
    // nothing and is then shareable is worse than no link.
    for (const id of ['toast', 'tooltip', 'button', 'select']) {
      await visit(page, `/components/${id}`);
      const missing = await page
        .locator('.rail--toc .toc a[href*="#"]')
        .evaluateAll((links) =>
          links
            .map((a) => a.getAttribute('href')?.split('#')[1] ?? '')
            .filter((id) => id && !document.getElementById(id)),
        );
      expect(missing, `${id}: the contents point at nothing`).toEqual([]);
    }
  });

  test('a jump from the contents takes the keyboard with it', async ({
    page,
  }) => {
    // The rail is the last element of the shell, so focus left behind in it runs the reader
    // out of the document rather than into what they chose.
    await visit(page, '/components/button');
    await page
      .locator('.rail--toc [data-testid="toc"]')
      .getByRole('link', { name: 'API', exact: true })
      .click();

    await expect(page).toHaveURL(/#api$/);
    const landed = await page.evaluate(() => ({
      id: document.activeElement?.id ?? '',
      top: Math.round(
        document.getElementById('api')?.getBoundingClientRect().top ??
          Number.NaN,
      ),
    }));
    expect(landed.id).toBe('api');
    // And the router still owns the scrolling, at the offset the stylesheet declares.
    expect(landed.top).toBeGreaterThanOrEqual(80);
    expect(landed.top).toBeLessThanOrEqual(128);
  });

  test('the component index is reachable at every width', async ({ page }) => {
    // The drawer's button stopped at 719 and the rail returned at a CONTAINER width of 1180 —
    // about 1275 of window. Between them the index was in neither seat and the only way to
    // another component was the browser's back button.
    for (const width of [390, 800, 1000, 1200, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await visit(page, '/components/button');
      const seats = await page.evaluate(() => {
        const shown = (selector: string) => {
          const el = document.querySelector(selector);
          if (!el) return false;
          const box = el.getBoundingClientRect();
          return box.width > 0 && box.height > 0;
        };
        return { rail: shown('.rail--index'), menu: shown('.topbar__menu') };
      });
      expect(
        seats.rail || seats.menu,
        `at ${width}px the index has no seat`,
      ).toBe(true);
    }
    await page.setViewportSize({ width: 1280, height: 900 });
  });

  test('the stage flip says what it does, and claims no state', async ({
    page,
  }) => {
    // It sets the stage to whatever the page is NOT, so "Dark stage" was false on a dark page
    // — and `aria-pressed="true"` for a stage it had just made light was false to everybody.
    await visit(page, '/components/button');
    const flip = page.getByTestId('stage-theme');
    await expect(flip).toHaveText('Flip the stage');
    await expect(flip).not.toHaveAttribute('aria-pressed', /.*/);

    await flip.click();
    await expect(flip).toHaveText("Back to the page's theme");
    await expect(flip).not.toHaveAttribute('aria-pressed', /.*/);
  });

  test('the stage tools clear the switch on a phone, and the rails clear the floor', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await visit(page, '/components/button');

    // Absolutely positioned tools used to sit on top of the Preview/Code switch: a tap meant
    // for the source landed on the theme button.
    const stolen = await page.evaluate(() => {
      const tab = Array.from(document.querySelectorAll('[role="tab"]')).find(
        (t) => t.textContent?.trim() === 'Code',
      );
      if (!tab) return -1;
      const box = tab.getBoundingClientRect();
      const y = Math.round((box.top + box.bottom) / 2);
      let taken = 0;
      for (let x = Math.ceil(box.left); x < box.right; x++)
        if (!document.elementFromPoint(x, y)?.closest('[role="tab"]')) taken++;
      return taken;
    });
    expect(stolen, 'the stage tools cover the Code tab').toBe(0);

    await page.setViewportSize({ width: 900, height: 900 });
    await visit(page, '/components/button');
    const handles = await page
      .locator('.toc-fold summary, .toc__meta a')
      .evaluateAll((els) =>
        els
          .map((el) => el.getBoundingClientRect().height)
          .filter((height) => height > 0),
      );
    expect(handles.length).toBeGreaterThan(0);
    expect(Math.min(...handles)).toBeGreaterThanOrEqual(TARGET_FLOOR);
    await page.setViewportSize({ width: 1280, height: 900 });
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

  /**
   * The harness line (plan 2.6) is read off the card's **Harness** row, and the row is held
   * to the built package by `check-harness` — so the name on the page is a class a test can
   * import, not a name somebody typed.
   */
  test('the parts section names the harness a test holds them with', async ({
    page,
  }) => {
    await visit(page, '/components/button');
    const line = page.getByTestId('harness');
    await expect(line).toContainText('PctButtonHarness');
    await expect(line).toContainText('@pacit/components/testing');
    const card = readFileSync(
      join(__dirname, '../../../docs/components/button.md'),
      'utf8',
    );
    const row = card.match(/^\|\s*\*\*Harness\*\*\s*\|(.*)\|\s*$/m);
    expect(row).not.toBeNull();
    for (const [, name] of (row as RegExpMatchArray)[1].matchAll(/`(\w+)`/g))
      await expect(line).toContainText(name);
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

    // The two moves, first and side by side — 324 px under 18 251 before (4.34).
    await expect(page.locator('.move')).toHaveCount(2);
    await expect(page.locator('.move').first()).toContainText(
      'data-theme="dark"',
    );
    await expect(page.locator('.move').last()).toContainText('--pct-surface:');

    await expect(page.getByTestId('tier-semantic')).toContainText(
      '--pct-surface',
    );

    // The component tier is 28 groups and not one alphabetical run of 486 rows. The
    // inventory is all still here: opening a group shows the dials it counts.
    const groups = page.getByTestId('token-groups').locator('details');
    await expect(groups).toHaveCount(28);
    const button = page.getByTestId('group-button');
    await button.locator('summary').click();
    await expect(button).toContainText('--pct-button-height-sm');
    await button
      .getByRole('link', { name: /What button paints with them/ })
      .click();
    await expect(page).toHaveURL(/\/components\/button$/);
  });

  test('the finder on /theming narrows all three tiers, and the bar follows', async ({
    page,
  }) => {
    await visit(page, '/theming');
    const count = page.getByTestId('theming-count');
    await expect(count).toHaveText('536 of 536');
    await expect(page.getByTestId('theming-bar').getByRole('link')).toHaveCount(
      3,
    );

    // Narrowing DESTROYS what it drops — the tiers a filter empties leave with their
    // headings, so every chip standing is the address of something on the page.
    await page.getByTestId('theming-filter').fill('select');
    await expect(count).toHaveText(/^\d+ of 536$/);
    await expect(page.getByTestId('tier-primitive')).toHaveCount(0);
    await expect(page.getByTestId('tier-semantic')).toHaveCount(0);
    const bands = page.getByTestId('theming-bar').getByRole('link');
    await expect(bands).toHaveCount(1);
    await expect(bands.first()).toContainText('Component');
    // A group the filter has narrowed to opens itself: a reader who typed a name is
    // looking at that component's dials, not at a closed row bearing it.
    await expect(
      page.getByTestId('token-groups').locator('details[open]').first(),
    ).toContainText('--pct-select-bg');

    await page.getByTestId('theming-filter').fill('nothing-answers-to-this');
    await expect(page.getByTestId('theming-empty')).toBeVisible();

    await page.getByTestId('theming-filter').fill('');
    await expect(count).toHaveText('536 of 536');
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
    // Four now: install, provide, the first form, and the one line that renders on a server
    // (4.34 — the page named `provideClientHydration()` and never showed it).
    await expect(page.locator('.shiki')).toHaveCount(4);
    await expect(page.locator('.shiki').first()).toContainText(
      'npm install @pacit/components',
    );
    await expect(page.locator('.shiki').last()).toContainText(
      'provideClientHydration()',
    );
  });

  test('the first form on /start is the component the snippet above it is', async ({
    page,
  }) => {
    await visit(page, '/start');

    // The claim the page could not make before: a getting-started page that renders nothing
    // on a site whose whole argument is that components prove themselves (4.34). The snippet
    // is read from this component's own file by the content pass, so the class the code
    // declares and the thing under it are one file — and the test says so from both ends.
    await expect(page.locator('.shiki').nth(2)).toContainText(
      'class FirstForm',
    );
    const running = page.getByTestId('first-form');
    const field = running.getByRole('textbox', { name: /Workspace name/ });
    await expect(field).toBeVisible();
    await expect(running).toContainText('Lowercase, dashes allowed');

    await field.click();
    await field.press('Tab');
    // The schema's own message, and the input pointing at the line that carries it.
    await expect(
      running.getByText('Every workspace needs a name'),
    ).toBeVisible();
    await expect(field).toHaveAttribute('aria-invalid', 'true');
    const describedBy = await field.getAttribute('aria-describedby');
    await expect(running.locator(`#${describedBy}`)).toContainText(
      'Every workspace needs a name',
    );
  });

  test('every step of /start is a step, and hands its snippet over', async ({
    page,
  }) => {
    await visit(page, '/start');

    // The ordinal is the list's, not a digit typed into four headings: a reader on a screen
    // reader is told these are four items of one sequence.
    const steps = page.locator('.steps > li');
    await expect(steps).toHaveCount(4);
    await expect(steps.first().getByRole('heading')).toHaveText('Install');

    const copies = page.locator('.snippet__copy');
    await expect(copies).toHaveCount(4);
    await copies.first().click();
    await expect(
      page.locator('pct-toast-viewport [data-pct-part="item"]'),
    ).toBeVisible();
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
