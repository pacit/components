import { expect, test } from '@playwright/test';
import { visit } from './support/dom';

/**
 * The live channels (`req-a11y-built-in`, [0026]).
 *
 * `PctAnnouncer` opens two regions and the library speaks through ONE of them: the polite
 * channel carries the select's empty panel, and the assertive channel — created, hidden and
 * exported since the announcer was built — had no caller anywhere, because every
 * interruption this library could have had turned out to have a place on the screen
 * instead. A mechanism a package exports and never exercises is a promise with no gate, and
 * this file is the gate: the sandbox's `announce` view is the consumer, and these cases read
 * that a sentence lands in the region it named and in no other.
 *
 * What the unit suite already holds is the DOM the announcement is made of — two regions,
 * one message per channel, a repeat written once (`core.spec.ts › PctAnnouncer`). What it
 * cannot hold is a real application: a component injecting the service, a render that opens
 * the pair, and a press that speaks. jsdom has no assistive technology and neither has a
 * browser, so what a person HEARS is measured by nobody here — the promise these cases can
 * make is that the right region holds the right sentence, and that is where it ends.
 */
const region = (politeness: 'polite' | 'assertive') =>
  `[data-pct-live="${politeness}"]`;

test.describe('the live channels', () => {
  test.beforeEach(async ({ page }) => {
    await visit(page, '/announce');
  });

  test('both regions are open before anything is said', async ({ page }) => {
    for (const politeness of ['polite', 'assertive'] as const) {
      const live = page.locator(region(politeness));
      await expect(live).toHaveCount(1);
      await expect(live).toHaveAttribute('aria-live', politeness);
      await expect(live).toHaveText('');
    }
  });

  test('an interruption lands in the assertive region and in no other', async ({
    page,
  }) => {
    await page.getByTestId('say-assertive').click();

    await expect(page.locator(region('assertive'))).toHaveText(
      'The connection was lost. Nothing was saved.',
    );
    // The other half of the promise, and the half a single-channel implementation would
    // still pass: a message names ONE region, so the polite one has to stay empty.
    await expect(page.locator(region('polite'))).toHaveText('');
  });

  test('a polite message lands in the polite region and in no other', async ({
    page,
  }) => {
    await page.getByTestId('say-polite').click();

    await expect(page.locator(region('polite'))).toHaveText('Sixteen results.');
    await expect(page.locator(region('assertive'))).toHaveText('');
  });

  test('a region holding a sentence takes no space and stays in the tree', async ({
    page,
  }) => {
    await page.getByTestId('say-assertive').click();

    const live = page.locator(region('assertive'));
    // Hidden the one way that keeps a region READ: clipped to nothing at one pixel, never
    // `display: none` or `visibility: hidden`, both of which take the element out of the
    // accessibility tree along with the announcement (`lesson-83`).
    const box = await live.boundingBox();
    expect(box?.width).toBeLessThanOrEqual(1);
    expect(box?.height).toBeLessThanOrEqual(1);
    const style = await live.evaluate((el) => {
      const computed = getComputedStyle(el);
      return {
        display: computed.display,
        visibility: computed.visibility,
        clipPath: computed.clipPath,
      };
    });
    expect(style.display).not.toBe('none');
    expect(style.visibility).toBe('visible');
    expect(style.clipPath).not.toBe('none');
  });
});
