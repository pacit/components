import { expect, Locator, Page, test } from '@playwright/test';
import { styleOf, systemColors } from './support/css';
import { visit } from './support/dom';

/**
 * What a tone is, measured in a browser: **two channels, and the one that survives**.
 *
 * A tone painted in colour alone is a state carried by colour alone — gone for a reader who
 * does not separate red from green, and gone again under `forced-colors: active`, where the
 * palette is the user's and the author's greens are not invited
 * ([`req-a11y-forced-colors`](../../../docs/requirements/a11y.md#req-a11y-forced-colors)). So
 * every tone in this library draws a MARK as well, one public icon name per tone, and these
 * cases hold both halves: the colour differs per tone in ordinary mode, and the mark is still
 * there when the colour is gone (plan 4.14).
 *
 * The four names arrived together on purpose, so the file walks all four rather than sampling:
 * a set decided once is a set measured once.
 */

const TONES = ['success', 'warning', 'danger', 'info'] as const;
const FORCED = { forcedColors: 'active' } as const;

/** The mark inside a part, by the name it was published under. */
const markOf = (scope: Locator) => scope.locator('[data-pct-part="icon"]');

/** Every toast standing, in the order they were raised. */
const items = (page: Page) =>
  page.locator('pct-toast-viewport [data-pct-part="item"]');

test.describe('Tones — a colour and a drawing, and the drawing is the half that survives', () => {
  test('a toast draws the mark its tone names, and an untoned one draws none', async ({
    page,
  }) => {
    await visit(page, '/toast');

    // The untoned message first, because the promise starts there: a consumer who never
    // thought about tones ships exactly the message they shipped before.
    await page.getByTestId('raise-standing').click();
    await expect(items(page)).toHaveCount(1);
    await expect(items(page).first()).not.toHaveAttribute('data-pct-tone', /./);
    await expect(markOf(items(page).first())).toHaveCount(0);

    await page.getByTestId('clear-toasts').click();
    await expect(items(page)).toHaveCount(0);

    for (const tone of TONES) {
      await page.getByTestId(`raise-${tone}`).click();
      const item = items(page).last();
      await expect(item).toHaveAttribute('data-pct-tone', tone);
      // One name per tone and one drawing per name. A set that resolved to a single icon
      // would be a colour again, wearing a shape.
      await expect(markOf(item)).toHaveAttribute('name', tone);
      await expect(markOf(item).locator('svg')).toHaveCount(1);
    }
  });

  test('the four toasts are four colours, on the mark and on the edge', async ({
    page,
  }) => {
    await visit(page, '/toast');

    const marks: string[] = [];
    const edges: string[] = [];
    for (const tone of TONES) {
      await page.getByTestId(`raise-${tone}`).click();
      const item = items(page).last();
      // The wait is what makes `.last()` mean the toast this iteration raised. A style read
      // resolves the locator once, at the instant it runs, and the new item is appended a
      // frame after the click — so without this the reading is the PREVIOUS toast's paint and
      // two tones come back the same colour. Measured at 2 failures in 30 chromium runs, and
      // once in the full suite before that, where it reads as a tone that lost its colour
      // rather than as a race ([`lesson-192`](../../../docs/lessons.md#lesson-192)). The
      // `toHaveAttribute` retries, and each retry resolves `.last()` again.
      await expect(item).toHaveAttribute('data-pct-tone', tone);
      marks.push(await styleOf(markOf(item), 'color'));
      edges.push(await styleOf(item, 'border-block-start-color'));
    }

    // Four readings and four values: a tone that had quietly fallen back to the base colour
    // would still pass a "has an attribute" case, which is why this one reads paint.
    expect(new Set(marks).size, `marks: ${marks.join(', ')}`).toBe(4);
    expect(new Set(edges).size, `edges: ${edges.join(', ')}`).toBe(4);
    expect(marks, 'the mark and the edge are one tone, so they agree').toEqual(
      edges,
    );
  });

  test('a progress bar takes the tone on its fill and beside it', async ({
    page,
  }) => {
    await visit(page, '/progress');

    // The untoned bars of the other demos are the control: no mark, no attribute, and the
    // geometry the component had before tones existed.
    const plain = page.getByTestId('progress-md');
    await expect(plain).not.toHaveAttribute('data-pct-tone', /./);
    await expect(markOf(plain)).toHaveCount(0);

    const fills: string[] = [];
    for (const tone of TONES) {
      const bar = page.getByTestId(`progress-${tone}`);
      await expect(bar).toHaveAttribute('data-pct-tone', tone);
      await expect(markOf(bar)).toHaveAttribute('name', tone);
      fills.push(
        await styleOf(
          bar.locator('[data-pct-part="fill"]'),
          'background-color',
        ),
      );

      // The mark stands BESIDE the groove and not inside it: the box that clips is `bar`,
      // and a mark inside a clipping box the height of a groove is a mark cut to 8 px.
      const mark = await markOf(bar).boundingBox();
      const groove = await bar.locator('[data-pct-part="bar"]').boundingBox();
      expect(
        mark!.height,
        `${tone}: the mark is inside the pipe`,
      ).toBeGreaterThan(groove!.height);
      expect(
        mark!.x + mark!.width,
        `${tone}: the mark overlaps the bar`,
      ).toBeLessThanOrEqual(groove!.x + 1);
    }

    expect(new Set(fills).size, `fills: ${fills.join(', ')}`).toBe(4);
  });

  test('the untoned bar is the bar it always was', async ({ page }) => {
    await visit(page, '/progress');

    // The whole promise of "the absence is the neutral": no attribute, no mark, and the host
    // exactly as tall as the groove — which is what it was before the pipe moved down one
    // element to make room for a mark (plan 4.14).
    const bar = page.getByTestId('progress-md');
    const host = await bar.boundingBox();
    const groove = await bar.locator('[data-pct-part="bar"]').boundingBox();
    expect(host!.height).toBe(groove!.height);
    expect(host!.width).toBe(groove!.width);
  });

  test.describe('forced colours', () => {
    test('the colour goes and the mark stays, in both components', async ({
      page,
    }) => {
      await visit(page, '/progress', { media: FORCED });
      const sys = await systemColors(page);

      for (const tone of TONES) {
        const bar = page.getByTestId(`progress-${tone}`);
        // The tone's own colour is gone — the fill is the system's `Highlight` for every one
        // of the four, which is exactly what makes the mark the channel worth having.
        expect(
          await styleOf(
            bar.locator('[data-pct-part="fill"]'),
            'background-color',
          ),
        ).toBe(sys.Highlight);
        await expect(markOf(bar)).toHaveCount(1);
        expect(await styleOf(markOf(bar), 'color')).toBe(sys.CanvasText);
      }
    });

    test('a toast keeps its mark when the palette is the user’s', async ({
      page,
    }) => {
      await visit(page, '/toast', { media: FORCED });
      const sys = await systemColors(page);

      await page.getByTestId('raise-danger').click();
      const item = items(page).last();
      await expect(markOf(item)).toHaveAttribute('name', 'danger');
      expect(await styleOf(markOf(item), 'color')).toBe(sys.CanvasText);
      // The edge said "danger" in colour; here it says only "this is where the card ends",
      // which is the untoned reading and the right one — the shape is what carries the tone.
      expect(await styleOf(item, 'border-block-start-color')).toBe(
        sys.CanvasText,
      );
    });
  });
});
