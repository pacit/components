import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { visit } from './support/dom';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';

const WCAG_22_AA = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

/**
 * The bar, measured over EVERY route (2.1.8): the site advertises "axe across every
 * component in three engines, every commit" — its own pages hold the same line. The route
 * list is not typed here: the component routes come from the same card directory the
 * content pass reads, so a new card automatically joins the sweep or the sweep is lying.
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
