import { expect, test } from '@playwright/test';
import { visit } from './support/dom';

/**
 * What keeps a touch target at 24 px when a skin takes everything else away
 * (`req-a11y-touch`).
 *
 * Every control here declares a floor of its own — `min-block-size: var(--pct-…-target-min)`,
 * or a `max()` against the size the component was given — and each of those floors already has
 * a case beside it reading the rendered box at 24 px. Those cases pass with the floor deleted.
 * Measured, on the accordion: remove `min-block-size` and the heading row still clears 24 px,
 * because its padding does ([`lesson-174`](../../../docs/lessons.md#lesson-174), plan 4.44).
 * A promise held by something other than the mechanism named beside it is a promise nobody is
 * really watching — the padding is a design decision and can be re-tuned by a consumer; the
 * floor is the line that survives that.
 *
 * So this file measures the floor ALONE. For each control it injects a stylesheet that sets
 * every OTHER custom property giving that element size to zero, hides whatever it holds and
 * zeroes the text inside it, and then reads the box. What is left is the floor, and nothing
 * else — delete the declaration and the case goes to nearly nothing.
 *
 * **The upper bound is half the case.** Asserting only `>= 24` would pass on an element whose
 * padding survived the disarm, which is the very defect this file exists to close. So each row
 * also states how far above 24 the box may be, and that number is a measurement rather than a
 * taste: it is what the control reads with everything zeroed, plus the borders and outlines
 * that are literals in the stylesheet rather than tokens.
 */

interface Control {
  /** The name in the test title. */
  readonly name: string;
  readonly route: string;
  /** Resolves to exactly one element: the one the floor is declared on. */
  readonly selector: string;
  /** The axis the floor constrains — a `max()` on both sides is `both`. */
  readonly axis: 'block' | 'inline' | 'both';
  /** Every custom property that would otherwise give this element size. */
  readonly zero: readonly string[];
  /** How far above the floor the disarmed box may still read — a measurement, see above. */
  readonly ceiling: number;
  /** The floor's own token, zeroed for the negative control. */
  readonly floor: string;
  /** A control to press first, for a part that is not in the document until then. */
  readonly opens?: string;
}

const CONTROLS: readonly Control[] = [
  {
    name: 'accordion heading',
    route: '/accordion',
    selector: '[data-testid="item-lone"] [data-pct-part="heading"]',
    axis: 'block',
    zero: ['--pct-accordion-heading-padding-y'],
    ceiling: 24,
    floor: '--pct-accordion-heading-target-min',
  },
  {
    name: 'tab',
    route: '/tabs',
    // The vertical strip: in the horizontal one the block axis is the flex CROSS axis, so
    // `align-items: stretch` would hand a disarmed tab the height of its siblings and the
    // measurement would read them rather than the floor.
    selector:
      'pct-tabs[data-testid="tabs-vertical"] > [data-pct-part="list"] > [data-pct-part="tab"]:first-child',
    axis: 'block',
    zero: ['--pct-tabs-tab-padding-y'],
    ceiling: 24,
    floor: '--pct-tabs-tab-target-min',
  },
  {
    name: 'pagination item',
    route: '/pagination',
    selector: '[data-testid="pagination-few"] [data-pct-part="previous"]',
    axis: 'both',
    zero: [
      '--pct-pagination-item-height',
      '--pct-pagination-item-padding-x',
      '--pct-pagination-item-font-size',
    ],
    ceiling: 24,
    floor: '--pct-pagination-item-target-min',
  },
  {
    name: 'chip remove',
    route: '/chips',
    selector: '[data-testid="size-md"] [data-pct-part="remove"]',
    axis: 'both',
    zero: ['--pct-chips-item-height'],
    ceiling: 24,
    floor: '--pct-chips-remove-target-min',
  },
  {
    name: 'menu item',
    route: '/menu',
    selector: '[data-testid="item-rename"][data-pct-part="item"]',
    axis: 'block',
    zero: ['--pct-menu-item-padding-y', '--pct-menu-item-font-size'],
    ceiling: 24,
    floor: '--pct-menu-item-target-min',
    opens: 'actions-trigger',
  },
  {
    name: 'breadcrumb link',
    route: '/breadcrumb',
    selector: '[data-testid="trail"] a.pct-breadcrumb__link[href="#home"]',
    axis: 'block',
    zero: ['--pct-breadcrumb-font-size'],
    ceiling: 24,
    floor: '--pct-breadcrumb-link-target-min',
  },
  {
    name: 'checkbox control',
    route: '/checkbox',
    selector: '[data-testid="checkbox-mixed"] [data-pct-part="control"]',
    axis: 'both',
    zero: ['--pct-checkbox-size'],
    ceiling: 24,
    floor: '--pct-checkbox-target-min',
  },
  {
    name: 'radio control',
    route: '/radio',
    selector:
      '[data-testid="radio-horizontal"] pct-radio:first-of-type [data-pct-part="control"]',
    axis: 'both',
    zero: ['--pct-radio-size'],
    ceiling: 24,
    floor: '--pct-radio-target-min',
  },
  {
    name: 'switch track',
    route: '/switch',
    selector: 'pct-switch[data-testid="switch-wifi"] [data-pct-part="track"]',
    axis: 'both',
    zero: ['--pct-switch-width', '--pct-switch-height'],
    ceiling: 26,
    floor: '--pct-switch-target-min',
  },
  {
    name: 'date toggle',
    route: '/date',
    selector: '[data-testid="date-standalone"] [data-pct-part="toggle"]',
    axis: 'both',
    zero: ['--pct-date-toggle-size', '--pct-date-icon-size'],
    ceiling: 24,
    floor: '--pct-date-target-min',
  },
  {
    name: 'field control',
    route: '/field',
    selector: '[data-testid="field-email"] [data-pct-part="field-control"]',
    axis: 'block',
    // Every size of the field, because the row picks one by attribute and a skin may pick
    // another: what is being disarmed is the height the field was GIVEN, so that what is left
    // is the height nobody may take away.
    zero: [
      '--pct-field-height',
      '--pct-field-height-sm',
      '--pct-field-height-lg',
      '--pct-field-font-size',
      '--pct-field-font-size-sm',
      '--pct-field-font-size-lg',
    ],
    ceiling: 24,
    floor: '--pct-target-min',
  },
];

/** The floor every one of them claims (`--pct-target-min`). */
const FLOOR = 24;

/**
 * The disarming, as a stylesheet.
 *
 * The properties are written on `html` with `!important` rather than on the element: several
 * of them are read by an ANCESTOR (the field's row height, the pagination item's) and a
 * custom property is resolved where it is used. `!important` is what beats the theme's own
 * `:root` declaration on that same element.
 */
const disarm = (c: Control): string => `
  html { ${c.zero.map((t) => `${t}: 0px !important;`).join(' ')} }
  ${c.selector}, ${c.selector} * { font-size: 0 !important; line-height: 0 !important; }
  ${c.selector} > * { display: none !important; }
`;

test.describe('The touch-target floor, with everything else taken away', () => {
  for (const c of CONTROLS) {
    test(`${c.name} still clears ${FLOOR} px with nothing else to hold it`, async ({
      page,
    }) => {
      await visit(page, c.route);
      if (c.opens) await page.getByTestId(c.opens).click();

      const target = page.locator(c.selector);
      await expect(target).toBeAttached();
      await page.addStyleTag({ content: disarm(c) });
      await page.waitForTimeout(100);

      const box = await target.boundingBox();
      expect(box, `${c.name}: ${c.selector} has no box`).not.toBeNull();

      const read = { width: box!.width, height: box!.height };
      const axes: readonly ('width' | 'height')[] =
        c.axis === 'both'
          ? ['width', 'height']
          : c.axis === 'block'
            ? ['height']
            : ['width'];

      for (const axis of axes) {
        expect(
          read[axis],
          `${c.name} ${axis} with ${c.zero.join(', ')} at zero: ${JSON.stringify(read)}`,
        ).toBeGreaterThanOrEqual(FLOOR);
        expect(
          read[axis],
          `${c.name} ${axis} is ${read[axis]}px — above the floor by more than the ` +
            `stylesheet's literals, so something the disarming did not reach is holding it: ` +
            `${JSON.stringify(read)}`,
        ).toBeLessThanOrEqual(c.ceiling);
      }

      // The negative control, in the case itself: take the floor's own token away too and
      // the box has to fall through 24 px. Without it the reading above would still pass on
      // a component that had stopped reading its token and written `24px` into the sheet —
      // which is the same defect one floor down, and the reason this file exists (plan 4.44).
      await page.addStyleTag({
        content: `html { ${c.floor}: 0px !important; }`,
      });
      await page.waitForTimeout(100);

      const collapsed = await target.boundingBox();
      for (const axis of axes) {
        expect(
          collapsed![axis],
          `${c.name} ${axis} is still ${collapsed![axis]}px with ${c.floor} at zero, so ` +
            `something other than that token is holding the target up`,
        ).toBeLessThan(FLOOR);
      }
    });
  }
});
