import { expect, test } from '@playwright/test';
import { tokenOf } from './support/css';
import { boxOf, visit } from './support/dom';

/**
 * Density is the second axis (`req-token-density`), and it is an attribute:
 * `data-pct-density="compact"` on a subtree re-points the metric tokens under it — the
 * shared control axis and the space scale — while the colour theme goes on being the
 * theme's business ([0074](../../../docs/decisions/0074-density-is-a-scope-that-re-points-metrics-not-an-input.md)).
 *
 * Measured in a browser, for the reason `size.spec.ts` is: a stylesheet says what it
 * intends, a layout says what happened (`lesson-13`). In jsdom there is nothing to measure.
 *
 * Three things are checked, and the third is the requirement's own control:
 *
 *  1. the compact heights are **what the tokens say** — 26 / 32 / 38, not merely "smaller";
 *  2. comfortable and compact **differ**, so a case that measured the wrong subtree or an
 *     attribute that never arrived would fail instead of quietly reporting the defaults
 *     (`lesson-38`);
 *  3. every control carrying a `--pct-…-target-min` token still clears **24 × 24** under
 *     compact — including at size `sm`, which is the corner where the two axes meet and the
 *     one the requirement warned about.
 */

/** What the compact scope has to make of the shared control axis, per size. */
const HEIGHTS = [
  { size: 'sm', comfortable: 28, compact: 26 },
  { size: 'md', comfortable: 36, compact: 32 },
  { size: 'lg', comfortable: 44, compact: 38 },
] as const;

/** WCAG 2.2 SC 2.5.8 — the floor the compact scope may not take a target under. */
const FLOOR = 24;

/**
 * Every control that declares a floor of its own against `--pct-target-min`, the route it
 * lives on and the box the floor is declared on. The list is `target-min.spec.ts`'s, because
 * that is the list the sources carry: `grep target-min libs/tokens/src/*.json`. There the
 * floor is measured with everything else disarmed; here it is measured with everything else
 * **on and compact**, which is the state a user meets.
 */
interface Target {
  readonly name: string;
  readonly route: string;
  readonly selector: string;
  /** The axis the floor constrains — a `max()` on both sides is `both`. */
  readonly axis: 'block' | 'inline' | 'both';
  /** A control to press first, for a part that is not in the document until then. */
  readonly opens?: string;
}

const TARGETS: readonly Target[] = [
  {
    name: 'accordion heading',
    route: '/accordion',
    selector: '[data-testid="item-lone"] [data-pct-part="heading"]',
    axis: 'block',
  },
  {
    name: 'tab',
    route: '/tabs',
    selector:
      'pct-tabs[data-testid="tabs-vertical"] > [data-pct-part="list"] > [data-pct-part="tab"]:first-child',
    axis: 'block',
  },
  {
    name: 'pagination item',
    route: '/pagination',
    selector: '[data-testid="pagination-few"] [data-pct-part="previous"]',
    axis: 'both',
  },
  {
    name: 'chip remove',
    route: '/chips',
    selector: '[data-testid="size-md"] [data-pct-part="remove"]',
    axis: 'both',
  },
  {
    name: 'menu item',
    route: '/menu',
    selector: '[data-testid="item-rename"][data-pct-part="item"]',
    axis: 'block',
    opens: 'actions-trigger',
  },
  {
    name: 'breadcrumb link',
    route: '/breadcrumb',
    selector: '[data-testid="trail"] a.pct-breadcrumb__link[href="#home"]',
    axis: 'block',
  },
  {
    name: 'checkbox control',
    route: '/checkbox',
    selector: '[data-testid="checkbox-mixed"] [data-pct-part="control"]',
    axis: 'both',
  },
  {
    name: 'radio control',
    route: '/radio',
    selector:
      '[data-testid="radio-horizontal"] pct-radio:first-of-type [data-pct-part="control"]',
    axis: 'both',
  },
  {
    name: 'switch track',
    route: '/switch',
    selector: 'pct-switch[data-testid="switch-wifi"] [data-pct-part="track"]',
    axis: 'both',
  },
  {
    // The floor is on the row, not on the drawn thumb: `max(thumb-size, target-min)` on
    // `.pct-slider__row`, so that what a finger gets is what an eye sees.
    name: 'slider row',
    route: '/slider',
    selector: '[data-testid="slider-volume"] .pct-slider__row',
    axis: 'block',
  },
  {
    name: 'tree label',
    route: '/tree',
    // The first item of the top level — README.md, which holds no branch, so the label
    // inside it is its own and the locator stays strict.
    selector:
      '[data-testid="tree"] > pct-tree-item:first-of-type [data-pct-part="label"]',
    axis: 'block',
  },
  {
    name: 'date toggle',
    route: '/date',
    selector: '[data-testid="date-standalone"] [data-pct-part="toggle"]',
    axis: 'both',
  },
  {
    name: 'field control',
    route: '/field',
    selector: '[data-testid="field-email"] [data-pct-part="field-control"]',
    axis: 'block',
  },
];

/** The axes a floor of a given kind is read on. */
const axesOf = (axis: Target['axis']): readonly ('width' | 'height')[] =>
  axis === 'both'
    ? ['width', 'height']
    : axis === 'block'
      ? ['height']
      : ['width'];

test.describe('Density — the second axis, and what it may not shrink', () => {
  test.describe('The axis itself', () => {
    test.beforeEach(async ({ page }) => {
      await visit(page, '/density');
    });

    for (const { size, comfortable, compact } of HEIGHTS) {
      test(`at size ${size} the compact row is ${compact} px and the comfortable one ${comfortable}`, async ({
        page,
      }) => {
        const rowOf = (density: string) =>
          page
            .getByTestId(`${density}-field-${size}`)
            .locator('[data-pct-part="field-row"]');

        const roomy = await boxOf(rowOf('comfortable'));
        const dense = await boxOf(rowOf('compact'));

        // The values outright, not the difference: on "smaller" alone both rows could have
        // collapsed to the text line height and the case would still read as a pass — the
        // same reasoning `size.spec.ts` states for the size axis.
        expect(roomy.height).toBe(comfortable);
        expect(dense.height).toBe(compact);
        // And the difference as well, because equal numbers would mean the attribute never
        // arrived and every reading below is of the defaults (`lesson-38`).
        expect(dense.height).toBeLessThan(roomy.height);
      });

      test(`at size ${size} the button follows the field into the compact scope`, async ({
        page,
      }) => {
        // One axis for the whole library is a promise about DENSITY too: a dense field
        // beside a roomy button is the 7 px mismatch of `lesson-29` in another costume.
        const row = await boxOf(
          page
            .getByTestId(`compact-field-${size}`)
            .locator('[data-pct-part="field-row"]'),
        );
        const button = await boxOf(page.getByTestId(`compact-button-${size}`));

        expect(button.height).toBeCloseTo(row.height, 1);
        expect(button.height).toBe(compact);
      });
    }

    test('the compact scope moves metrics and no colour', async ({ page }) => {
      // The promise is "independent of the colour theme". The stage carries the card's own
      // `data-theme`, the section inside it carries the density — so if the two axes were
      // entangled, the surface under the dense section would differ from the roomy one.
      const roomy = page.getByTestId('stage-comfortable');
      const dense = page.getByTestId('stage-compact');

      expect(await tokenOf(dense, '--pct-surface')).toBe(
        await tokenOf(roomy, '--pct-surface'),
      );
      expect(await tokenOf(dense, '--pct-text')).toBe(
        await tokenOf(roomy, '--pct-text'),
      );
      // And the metric side of the same reading, so the case cannot pass by measuring two
      // elements that are both roomy.
      expect(await tokenOf(dense, '--pct-control-height-md')).toBe('32px');
      expect(await tokenOf(roomy, '--pct-control-height-md')).toBe('36px');
    });

    test('the touch floor is the one metric the compact scope leaves alone', async ({
      page,
    }) => {
      const dense = page.getByTestId('stage-compact');
      const roomy = page.getByTestId('stage-comfortable');

      expect(await tokenOf(dense, '--pct-target-min')).toBe(`${FLOOR}px`);
      expect(await tokenOf(roomy, '--pct-target-min')).toBe(`${FLOOR}px`);
    });

    test('the corner: compact at size sm keeps every target at 24 px', async ({
      page,
    }) => {
      // The controls in this section stand on the SIZE axis as well as the density one, so
      // they are the only place where the two shrinkings compose. Everything else in the
      // sweep below takes its box from tokens the size axis does not move.
      const corner = page.getByTestId('stage-corner');
      const boxes: Record<string, number> = {};

      for (const [name, selector, axis] of [
        [
          'chip remove',
          '[data-testid="corner-chips"] pct-chip:first-of-type [data-pct-part="remove"]',
          'both',
        ],
        [
          'pagination item',
          '[data-testid="corner-pagination"] [data-pct-part="previous"]',
          'both',
        ],
        [
          'checkbox control',
          '[data-testid="corner-checkbox"] [data-pct-part="control"]',
          'both',
        ],
        [
          'radio control',
          '[data-testid="corner-radio"] pct-radio:first-of-type [data-pct-part="control"]',
          'both',
        ],
        [
          'switch track',
          '[data-testid="corner-switch"] [data-pct-part="track"]',
          'both',
        ],
        [
          'field control',
          '[data-testid="corner-checkbox"] [data-pct-part="field-control"]',
          'block',
        ],
      ] as const) {
        const box = await boxOf(corner.locator(selector));
        for (const readOn of axesOf(axis)) {
          boxes[`${name} ${readOn}`] = box[readOn];
          expect(
            box[readOn],
            `${name} ${readOn} under compact at size sm: ${JSON.stringify(boxes)}`,
          ).toBeGreaterThanOrEqual(FLOOR);
        }
      }
    });
  });

  /**
   * The requirement's named control: the floor holds under compact at every control that
   * declares one, on its own page, with the rest of the skin switched to compact around it.
   *
   * The attribute goes on `<html>`, which is the widest scope there is — a consumer who
   * switches the whole application to compact gets exactly this, and anything narrower would
   * leave part of each page roomy and let a failure hide in it.
   */
  test.describe('Every touch target under compact', () => {
    for (const target of TARGETS) {
      test(`${target.name} still clears ${FLOOR} px with the page compact`, async ({
        page,
      }) => {
        await visit(page, target.route);

        const element = page.locator(target.selector);
        await page.evaluate(() =>
          document.documentElement.setAttribute('data-pct-density', 'compact'),
        );
        if (target.opens) await page.getByTestId(target.opens).click();
        await expect(element).toBeVisible();

        // The attribute really took: a metric the compact scope owns reads its compact
        // value. Without this the whole sweep could be measuring the comfortable skin and
        // reporting it as compact — the gate that passes because nothing arrived.
        expect(
          await page.evaluate(() =>
            getComputedStyle(document.documentElement)
              .getPropertyValue('--pct-control-height-md')
              .trim(),
          ),
        ).toBe('32px');

        const box = await boxOf(element);
        for (const readOn of axesOf(target.axis)) {
          expect(
            box[readOn],
            `${target.name} ${readOn} under compact: ${JSON.stringify({
              width: box.width,
              height: box.height,
            })}`,
          ).toBeGreaterThanOrEqual(FLOOR);
        }
      });
    }
  });
});
