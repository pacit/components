import { expect, Page, test } from '@playwright/test';
import { boxOf, visit } from './support/dom';

/**
 * The height of a `<textarea pctAutosize>`, asked where it can be answered.
 *
 * Every number here comes from a real layout, which is why this file exists at all: jsdom
 * reports `scrollHeight` 0 for everything, so the unit suite can prove the plumbing and
 * never the geometry ([`autosize.spec.ts`](../../../libs/components/field/src/autosize.spec.ts)).
 *
 * The file is also **two implementations under one set of assertions**
 * ([0041](../../../docs/decisions/0041-a-height-the-platform-computes.md)): a browser with
 * `field-sizing: content` is laid out by it, one without is measured in script, and the
 * same questions have to get the same answers on both roads. Since firefox 155 all three
 * engines here are on the first road, and the second stays for the older ones Angular still
 * supports ([0084](../../../docs/decisions/0084-a-fallback-stays-while-angular-supports-an-engine-without-the-feature.md)),
 * so every case runs twice in every engine: once on the road the engine takes, once on the
 * road `withoutFieldSizing` makes it take.
 */

/** The two roads, and the engine's own one first. */
const ROADS = ['platform', 'measured'] as const;

/**
 * An engine without `field-sizing`, made out of one that has it — both halves of the
 * absence, because the property is asked about twice. The directive asks `CSS.supports`
 * which road to take, and the sheet asks `@supports` whether to lay the box out by its
 * content; a stub of only the first leaves the property laying the box out under a script
 * that measures it, and the cases would pass on whichever of the two was right. `fixed` is
 * the property's initial value, which is what an engine that does not parse it computes.
 */
async function withoutFieldSizing(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const supports = CSS.supports.bind(CSS) as (...args: string[]) => boolean;
    CSS.supports = ((...args: string[]) =>
      args.join(' ').includes('field-sizing')
        ? false
        : supports(...args)) as typeof CSS.supports;
    const sheet = new CSSStyleSheet();
    sheet.replaceSync('textarea { field-sizing: fixed !important; }');
    document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
  });
}

/** A line of the field, read from the control rather than assumed. */
async function lineHeight(page: Page): Promise<number> {
  return page
    .getByTestId('ta-grows')
    .evaluate((el) => parseFloat(getComputedStyle(el).lineHeight));
}

/**
 * The two roads round differently — `scrollHeight` is an integer, so the measured one writes
 * 59 where chromium lays out 58.78. A pixel of tolerance is the honest comparison, and the
 * reason is written down rather than absorbed
 * ([`lesson-111`](../../../docs/lessons.md#lesson-111)).
 */
function expectLines(height: number, lines: number, line: number): void {
  expect(Math.abs(height - lines * line)).toBeLessThanOrEqual(1.5);
}

for (const road of ROADS) {
  test.describe(`PctAutosize — a textarea as tall as its text, ${road} road`, () => {
    test.beforeEach(async ({ page }) => {
      await page.addInitScript(() => {
        const seen: string[] = [];
        Object.defineProperty(window, '__pctErrors', { value: seen });
        window.addEventListener('error', (event) => seen.push(event.message));
      });
      if (road === 'measured') await withoutFieldSizing(page);
      await visit(page, '/textarea');
    });

    /**
     * Every case ends with the page having raised nothing. A geometry that comes out right is
     * not the whole of a working road: the measured one used to write its height inside the
     * resize observer's delivery, and every engine answered each rewrap with `ResizeObserver
     * loop completed with undelivered notifications` while the heights here stayed correct —
     * seen the first time the road was forced in a browser (0084). Read from the page's own
     * `error` events, because that one is an event with no exception in it and Playwright's
     * `pageerror` never hears it.
     */
    test.afterEach(async ({ page }) => {
      expect(
        await page.evaluate(
          () => (window as unknown as { __pctErrors: string[] }).__pctErrors,
        ),
      ).toEqual([]);
    });

    /**
     * The floor is the platform's `rows`, and this is the case that says the two roads agree
     * about it: `field-sizing: content` DISCARDS the attribute — measured on a bare page, an
     * empty `rows="2"` box under the property is one line tall — so the sheet gives it back as
     * a length. Compared against a plain `<textarea rows="2">` on the same page, which is the
     * only definition of "two rows" that is not ours.
     */
    test('an empty box is exactly as tall as a plain textarea of the same rows', async ({
      page,
    }) => {
      const grows = await boxOf(page.getByTestId('ta-grows'));
      const plain = await boxOf(page.getByTestId('ta-plain'));

      expect(Math.abs(grows.height - plain.height)).toBeLessThanOrEqual(1.5);
    });

    test('it grows a line at a time and comes back down again', async ({
      page,
    }) => {
      const line = await lineHeight(page);
      const area = page.getByTestId('ta-grows');
      const height = async () => (await boxOf(area)).height;

      // One line still sits on the floor of two — the floor is a minimum, not a start.
      await area.fill('one');
      expectLines(await height(), 2, line);

      await area.fill('one\ntwo\nthree');
      expectLines(await height(), 3, line);

      await area.fill('one\ntwo\nthree\nfour\nfive\nsix');
      expectLines(await height(), 6, line);

      // The shrink is the half a measurement loses without its reset: `scrollHeight` never
      // reports less than the box already is.
      await area.fill('');
      expectLines(await height(), 2, line);
    });

    /**
     * A value that was in the page before anything ran. On the platform road this is laid out
     * with no script involved at all; on the measured one the height arrives at hydration.
     * Either way what the user ends up looking at is four lines, not the floor.
     */
    test('a value that was already there is drawn at its own height', async ({
      page,
    }) => {
      const line = await lineHeight(page);

      expectLines(
        (await boxOf(page.getByTestId('ta-initial'))).height,
        4,
        line,
      );
    });

    test('past the ceiling it stops growing and scrolls instead of clipping', async ({
      page,
    }) => {
      const line = await lineHeight(page);
      const area = page.getByTestId('ta-capped');

      await area.fill('1\n2\n3');
      expectLines((await boxOf(area)).height, 3, line);

      await area.fill('1\n2\n3\n4\n5\n6\n7\n8');
      expectLines((await boxOf(area)).height, 4, line);

      // Not cut off — reachable. The cap is a `max-block-size`, and the overflow it makes is
      // the one case this control turns its scrollbar on for.
      expect(
        await area.evaluate((el) => el.scrollHeight > el.clientHeight),
      ).toBe(true);
    });

    /**
     * `patchValue` writes the DOM through `DefaultValueAccessor` and dispatches nothing, so a
     * height that listens for `input` alone never hears it. The platform road cannot miss it —
     * it is layout — and the measured one is subscribed to the form's own `valueChanges`,
     * which is `null` for the whole of a sibling directive's constructor
     * ([`lesson-114`](../../../docs/lessons.md#lesson-114)).
     */
    test('a value written with no event at all is followed too', async ({
      page,
    }) => {
      const line = await lineHeight(page);
      const area = page.getByTestId('ta-silent');

      expectLines((await boxOf(area)).height, 2, line);

      await page.getByTestId('ta-silent-fill').click();
      expectLines((await boxOf(area)).height, 3, line);

      await page.getByTestId('ta-silent-clear').click();
      expectLines((await boxOf(area)).height, 2, line);
    });

    /**
     * Nothing announces a rewrap. The text does not change, the value does not change, and the
     * number of lines does — which is why the measured road carries a resize observer and why
     * the observer reads a WIDTH: its own writes wake it on every height it sets.
     */
    test('a width that changed under the text is followed as well', async ({
      page,
    }) => {
      const line = await lineHeight(page);
      const area = page.getByTestId('ta-grows');
      await area.fill(
        'a paragraph long enough that narrowing the window has to rewrap it onto more lines than it took before',
      );
      expectLines((await boxOf(area)).height, 2, line);

      await page.setViewportSize({ width: 400, height: 800 });

      await expect
        .poll(async () => (await boxOf(area)).height)
        .toBeGreaterThan(2.5 * line);
      expect(
        await area.evaluate((el) => el.scrollHeight > el.clientHeight),
      ).toBe(false);
    });

    /**
     * Which road the box is on — recorded rather than assumed, and the witness that the stub
     * above is not a no-op: on the measured road the property computes `fixed` and the height
     * is a number the script wrote; on the platform one the property lays the box out and no
     * script has touched it. It was first written to expire, asserting firefox as the engine
     * without the property, and it did at firefox 155; the platform half still says every
     * engine here has it.
     */
    test('the box is on the road the case says it is', async ({ page }) => {
      const area = page.getByTestId('ta-grows');
      await area.fill('one\ntwo\nthree');

      const seen = await area.evaluate((el) => ({
        supported: CSS.supports('field-sizing', 'content'),
        sizing: getComputedStyle(el).getPropertyValue('field-sizing'),
        written: el.style.height !== '',
      }));

      expect(seen).toEqual(
        road === 'platform'
          ? { supported: true, sizing: 'content', written: false }
          : { supported: false, sizing: 'fixed', written: true },
      );
    });
  });
}
