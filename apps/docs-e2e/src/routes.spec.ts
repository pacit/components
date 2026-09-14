import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { visit } from './support/dom';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';

const WCAG_22_AA = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

/**
 * The bar, measured over EVERY route (site.md "The bar the site itself meets"): the site
 * advertises "axe across every component in three engines, every commit" — its own pages
 * hold the same line. The route list is not typed here: the component routes come from the
 * same card directory the content pass reads, so a new card automatically joins the sweep
 * or the sweep is lying.
 * Each visit also demands a silent console — a hydration mismatch (NG0500) is exactly the
 * kind of error that only speaks there.
 */
const ROOT = join(__dirname, '../../..');
const CARD_ROUTES = readdirSync(join(ROOT, 'docs/components'))
  .filter((f) => f.endsWith('.md') && f !== 'README.md' && f !== '_template.md')
  .map((f) => `/components/${f.replace(/\.md$/, '')}`);

const ROUTES = [
  '/',
  '/start',
  '/components',
  '/theming',
  '/trust',
  '/support',
  '/acr',
  ...CARD_ROUTES,
];

test.describe('Every route', () => {
  // Both schemes on purpose, and the dark half has already earned its seat: the first
  // sweep ran light-only, and Lighthouse (which prefers dark) caught two unstyled links
  // at 1.89:1 on the dark surface that the light sweep could never see.
  for (const scheme of ['light', 'dark'] as const) {
    for (const route of ROUTES) {
      test(`${route} (${scheme}) renders silent and passes the axe bar`, async ({
        page,
      }) => {
        /* An axe pass over this site's biggest pages costs real seconds in webkit, and the
           default 30 s is not enough of them under a full sweep. Measured idle on one worker,
           2026-09-09: `/components/button` 14.8 s, `/trust` 11.8 s, `/components/date` 10.6 s,
           `/acr` 6.1 s — and four workers on eight cores turn the top of that into a timeout,
           which is how `/trust (light)` and `/components/date (light)` went red in webkit with
           nothing wrong on either page. Sixty seconds is four times the worst measurement and
           still short enough that a page which never settles fails rather than hangs. The
           sibling bound is `pages.spec`'s 90 s, taken the same way (2026-09-03). */
        test.setTimeout(60_000);

        const errors: string[] = [];
        page.on('console', (msg) => {
          if (msg.type() === 'error') errors.push(msg.text());
        });
        page.on('pageerror', (err) =>
          errors.push(`${err.name}: ${err.message}`),
        );

        await visit(page, route, { colorScheme: scheme });
        await expect(page.locator('h1')).toBeVisible();

        const results = await new AxeBuilder({ page })
          .withTags(WCAG_22_AA)
          .analyze();
        expect(results.violations).toEqual([]);
        expect(errors).toEqual([]);
      });
    }
  }
});
