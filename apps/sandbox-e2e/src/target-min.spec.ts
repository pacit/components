import { expect, test } from '@playwright/test';
import { settled, visit } from './support/dom';

/**
 * What keeps a touch target at 24 px when a skin takes everything else away
 * (`req-a11y-touch`).
 *
 * Every control here declares a floor of its own — `min-block-size: var(--pct-…-target-min)`,
 * or a `max()` against the size the component was given — and each of those floors already has
 * a case beside it reading the rendered box at 24 px. Those cases pass with the floor deleted.
 * Measured, on the accordion: remove `min-block-size` and the heading row still clears 24 px,
 * because its padding does ([`lesson-174`](../../../docs/lessons.md#lesson-174)).
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
 *
 * **The list below is answerable to the stylesheets, and no longer the other way round.**
 * The set of controls here was typed in by hand, and it disagreed with what the library's
 * stylesheets really declare by seven of nineteen (`lesson-194`) — the two close buttons of
 * the dialog and the drawer, the toast's cross and its action, the slider row, the tree label,
 * the pager's ellipsis and the select's cross, all held up by a declaration nothing in the
 * suite read. Nothing was red; the gap was found only because a second sweep was written over
 * the same promise and the two lists were compared. So the denominator is read out of the
 * sheets now: point 10 of `tools/check-styles.mjs` resolves every token whose value reaches
 * `{pct.target.min}`, finds every declaration that gives an element a size from one of them,
 * and requires each of those addresses to appear below in an `applies` field. A floor added to
 * a sheet with no case beside it is a red gate, not a silence.
 */

interface Control {
  /** The name in the test title. */
  readonly name: string;
  /**
   * The stylesheet declaration this case stands for: `<sheet> <selector>`, exactly as point
   * 10 of `tools/check-styles.mjs` prints it. That gate reads the sheets for the list of
   * floors and this field for the list of measurements, and requires the two to be the same
   * set — so an address that drifts is a failure on both sides at once, rather than a case
   * quietly measuring an element nothing declares a floor on.
   */
  readonly applies: string;
  readonly route: string;
  /** Resolves to exactly one element: the one the floor is declared on. */
  readonly selector: string;
  /** The axis the floor constrains — a `max()` on both sides is `both`. */
  readonly axis: 'block' | 'inline' | 'both';
  /**
   * Every custom property that would otherwise give this element size.
   *
   * Empty is a legitimate answer and not a gap: on the three close buttons and the select's
   * cross the floor token IS the size — `width: var(--pct-dialog-close-size)`, and that token
   * resolves to `{pct.target.min}` — so there is no second property to take away. What the
   * ceiling then proves is that the box really is the token's and not a padding's.
   */
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
    applies:
      'libs/components/accordion/src/accordion-item.scss .pct-accordion__heading',
    route: '/accordion',
    selector: '[data-testid="item-lone"] [data-pct-part="heading"]',
    axis: 'block',
    zero: ['--pct-accordion-heading-padding-y'],
    ceiling: 24,
    floor: '--pct-accordion-heading-target-min',
  },
  {
    name: 'tab',
    applies: 'libs/components/tabs/src/tabs.scss .pct-tabs__tab',
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
    applies:
      'libs/components/pagination/src/pagination.scss .pct-pagination__button',
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
    // The second element the pager's floor is declared on, and the one the hand-written list
    // missed: the token was already named by the case above, so a denominator counted by
    // TOKEN reported the pager covered. The ellipsis is not pressable and takes the floor all
    // the same — it stands in a row of targets and keeps the row's rhythm — so what is
    // measured here is the declaration, which is what a consumer can delete.
    name: 'pagination ellipsis',
    applies:
      'libs/components/pagination/src/pagination.scss .pct-pagination__ellipsis',
    route: '/pagination',
    // `pagination-top` is twelve pages showing the fourth, which folds exactly one run away:
    // one ellipsis in that pager, so the locator stays strict.
    selector: '[data-testid="pagination-top"] [data-pct-part="ellipsis"]',
    axis: 'both',
    zero: ['--pct-pagination-item-font-size'],
    ceiling: 24,
    floor: '--pct-pagination-item-target-min',
  },
  {
    name: 'chip remove',
    applies: 'libs/components/chips/src/chip.scss .pct-chip__remove',
    route: '/chips',
    selector: '[data-testid="size-md"] [data-pct-part="remove"]',
    axis: 'both',
    zero: ['--pct-chips-item-height'],
    ceiling: 24,
    floor: '--pct-chips-remove-target-min',
  },
  {
    name: 'menu item',
    applies: 'libs/components/menu/src/menu-item.scss :host',
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
    applies: 'libs/components/breadcrumb/src/link.scss :host',
    route: '/breadcrumb',
    selector: '[data-testid="trail"] a.pct-breadcrumb__link[href="#home"]',
    axis: 'block',
    zero: ['--pct-breadcrumb-font-size'],
    ceiling: 24,
    floor: '--pct-breadcrumb-link-target-min',
  },
  {
    name: 'checkbox control',
    applies:
      'libs/components/checkbox/src/checkbox.scss .pct-checkbox__control',
    route: '/checkbox',
    selector: '[data-testid="checkbox-mixed"] [data-pct-part="control"]',
    axis: 'both',
    zero: ['--pct-checkbox-size'],
    ceiling: 24,
    floor: '--pct-checkbox-target-min',
  },
  {
    name: 'radio control',
    applies: 'libs/components/radio/src/radio.scss .pct-radio__control',
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
    applies: 'libs/components/switch/src/switch.scss .pct-switch__track',
    route: '/switch',
    selector: 'pct-switch[data-testid="switch-wifi"] [data-pct-part="track"]',
    axis: 'both',
    zero: ['--pct-switch-width', '--pct-switch-height'],
    ceiling: 26,
    floor: '--pct-switch-target-min',
  },
  {
    // The floor is on the row and not on the drawn thumb: `max(thumb-size, target-min)`, so
    // what a finger gets is what an eye sees. Disarm the thumb and the row is the floor alone.
    name: 'slider row',
    applies: 'libs/components/slider/src/slider.scss .pct-slider__row',
    route: '/slider',
    selector: '[data-testid="slider-volume"] .pct-slider__row',
    axis: 'block',
    zero: ['--pct-slider-thumb-size'],
    ceiling: 24,
    floor: '--pct-slider-target-min',
  },
  {
    // A tree is rows of targets and not a sentence, which is `lesson-139`'s finding at the
    // breadcrumb. The padding is what usually holds this row up — so it is what goes.
    name: 'tree label',
    applies: 'libs/components/tree/src/tree-item.scss .pct-tree__label',
    route: '/tree',
    // The first item of the top level — README.md, which holds no branch, so the label inside
    // it is its own and the locator stays strict.
    selector:
      '[data-testid="tree"] > pct-tree-item:first-of-type [data-pct-part="label"]',
    axis: 'block',
    zero: ['--pct-tree-label-padding-y'],
    ceiling: 24,
    floor: '--pct-tree-label-target-min',
  },
  {
    name: 'date toggle',
    applies: 'libs/components/date/src/date.scss .pct-date__toggle',
    route: '/date',
    selector: '[data-testid="date-standalone"] [data-pct-part="toggle"]',
    axis: 'both',
    zero: ['--pct-date-toggle-size', '--pct-date-icon-size'],
    ceiling: 24,
    floor: '--pct-date-target-min',
  },
  {
    name: 'field control',
    applies: 'libs/components/field/src/field.scss .pct-field__control',
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
  {
    // The cross that takes the answer back. It draws a 16 px glyph and is a target all the
    // same, which is why its box is the shared floor outright — there is no size token under
    // it to take away, so the ceiling is what proves the box is the token's.
    name: 'select clear',
    applies: 'libs/components/select/src/select.scss .pct-select__clear',
    route: '/select',
    selector: '[data-testid="select-clear"] [data-pct-part="clear"]',
    axis: 'both',
    zero: [],
    ceiling: 24,
    floor: '--pct-target-min',
  },
  {
    // The dialog's cross, and the first of the three that take the floor through a token whose
    // NAME says nothing about targets: `--pct-dialog-close-size` is a floor because
    // `component.dialog.json` points it at `{pct.target.min}`, which is why the gate resolves
    // values rather than reading names. The panel is portalled into an overlay, so the
    // selector cannot be scoped by the host's `data-testid`.
    name: 'dialog close',
    applies: 'libs/components/dialog/src/dialog.scss .pct-dialog__close',
    route: '/dialog',
    selector: '.pct-dialog__panel [data-pct-part="close"]',
    axis: 'both',
    zero: [],
    ceiling: 24,
    floor: '--pct-dialog-close-size',
    opens: 'open-basic',
  },
  {
    // The drawer's cross. The panel stays in its host — it is docked to the demo card rather
    // than to the window — so this one is scoped by `data-testid` like the rest.
    name: 'drawer close',
    applies: 'libs/components/drawer/src/drawer.scss .pct-drawer__close',
    route: '/drawer',
    selector: '[data-testid="drawer-nav"] [data-pct-part="close"]',
    axis: 'both',
    zero: [],
    ceiling: 24,
    floor: '--pct-drawer-close-size',
    opens: 'trigger-nav',
  },
  {
    // A text button in a message, so the target has to be MADE rather than drawn: one line of
    // small type is nowhere near 24 px, and the floor is the bare `--pct-target-min`. The
    // message this raises carries the configured clock (six seconds), and the reading below
    // takes a fraction of a second — the case waits for the card to arrive and settle, never
    // for the clock.
    name: 'toast action',
    applies: 'libs/components/toast/src/toast-viewport.scss .pct-toast__action',
    route: '/toast',
    selector: 'pct-toast-viewport [data-pct-part="action"]',
    axis: 'block',
    zero: ['--pct-toast-message-font-size'],
    ceiling: 24,
    floor: '--pct-target-min',
    opens: 'raise-action',
  },
  {
    // The one control every message has. `raise-standing` is a message with no clock at all,
    // so nothing here races a timer.
    name: 'toast close',
    applies: 'libs/components/toast/src/toast-viewport.scss .pct-toast__close',
    route: '/toast',
    selector: 'pct-toast-viewport [data-pct-part="close"]',
    axis: 'both',
    zero: [],
    ceiling: 24,
    floor: '--pct-toast-close-size',
    opens: 'raise-standing',
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
      if (c.opens) {
        await page.getByTestId(c.opens).click();
        // A panel that fades in, a drawer that slides, a card that arrives: the box is the
        // same throughout, but waiting on the page's own animations rather than on a number
        // is what keeps the case out of the family `lesson-192` names.
        await settled(page);
      }

      const target = page.locator(c.selector);
      await expect(target).toBeAttached();
      await page.addStyleTag({ content: disarm(c) });
      // The disarming HAVING REACHED this element, rather than a tenth of a second in which
      // it probably did: the text is zeroed on the target itself by the rule above, so its
      // own `font-size` is the declaration's arrival, said by the page. A box read before
      // that is the box from before the disarm — every token still holding it up — which
      // reads exactly like a floor doing its work and is the family
      // [`lesson-192`](../../../docs/lessons.md#lesson-192) names.
      await expect(target).toHaveCSS('font-size', '0px');

      const box = await target.boundingBox();
      expect(box, `${c.name}: ${c.selector} has no box`).not.toBeNull();

      const read = { width: box!.width, height: box!.height };
      const taken = c.zero.length
        ? c.zero.join(', ')
        : 'nothing else to take away: the floor token IS the size of this element';
      const axes: readonly ('width' | 'height')[] =
        c.axis === 'both'
          ? ['width', 'height']
          : c.axis === 'block'
            ? ['height']
            : ['width'];

      for (const axis of axes) {
        expect(
          read[axis],
          `${c.name} ${axis} with ${taken} at zero: ${JSON.stringify(read)}`,
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
      // which is the same defect one floor down, and the reason this file exists (`lesson-177`).
      await page.addStyleTag({
        content: `html { ${c.floor}: 0px !important; }`,
      });
      // The same again, and here it is the control that matters most: this reading is the
      // one that has to FALL, so a box taken before the override arrived reads the floor
      // still holding and the negative control fails green. The token is read off the
      // target, which is where it is resolved, and trimmed — a custom property's computed
      // value keeps the whitespace it was written with.
      await expect
        .poll(() =>
          target.evaluate(
            (el, token) => getComputedStyle(el).getPropertyValue(token).trim(),
            c.floor,
          ),
        )
        .toBe('0px');

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
