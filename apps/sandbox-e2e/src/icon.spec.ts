import { expect, Locator, Page, test } from '@playwright/test';
import { rootToken, styleOf } from './support/css';
import { boxOf, visit } from './support/dom';

/**
 * The icon in a browser: the BOX and the SOURCES
 * ([0083](../../../docs/decisions/0083-an-icon-source-answers-a-name-with-data-and-the-box-renders-it.md)).
 * The box is what a stylesheet and a reader meet — its size beside text and on its three
 * steps, the colour a tone paints it, whether it is an image or decoration — and the unit
 * specs can say none of that: jsdom lays nothing out and resolves no `var()`. The sources
 * are measured here for the half the unit specs cannot reach either: a drawing from data
 * standing in the SVG namespace with the box's colour running through it, a font's glyph
 * drawn by a stylesheet, and one line dressing the library's own components inside a
 * card and not outside it.
 */

const TONES = ['success', 'warning', 'danger', 'info'] as const;

/** The colour a token paints, as the browser would write it on an element. */
const paintOf = (page: Page, token: string) =>
  page.evaluate((t) => {
    const probe = document.createElement('span');
    probe.style.color = `var(${t})`;
    document.body.append(probe);
    const colour = getComputedStyle(probe).color;
    probe.remove();
    return colour;
  }, token);

/** The `content` of an element's `::before`, which is how the sandbox's font draws. */
const glyphOf = (locator: Locator) =>
  locator.evaluate((el) => getComputedStyle(el, '::before').content);

test.describe('PctIcon — a drawing in a box the text sizes and colours', () => {
  test.beforeEach(async ({ page }) => {
    await visit(page, '/icon');
  });

  test('the box is the text’s own size, and each step is the icon’s own token', async ({
    page,
  }) => {
    // Beside text the box is `1em`: the line decides, which is what an icon next to a
    // word wants. The text here is set to 20px so the reading is not the page default.
    const fontSize = Number.parseFloat(
      await styleOf(page.getByTestId('size-text'), 'font-size'),
    );
    const beside = await boxOf(page.getByTestId('size-none'));
    expect(beside.width).toBeCloseTo(fontSize, 0);
    expect(beside.height).toBeCloseTo(fontSize, 0);
    await expect(page.getByTestId('size-none')).not.toHaveAttribute(
      'data-pct-size',
      /./,
    );

    // `md` is the base token with no suffix, as everywhere in the skin (`req-api-size`).
    for (const [step, token] of [
      ['sm', '--pct-icon-size-sm'],
      ['md', '--pct-icon-size'],
      ['lg', '--pct-icon-size-lg'],
    ] as const) {
      const icon = page.getByTestId(`size-${step}`);
      await expect(icon).toHaveAttribute('data-pct-size', step);
      const px = Number.parseFloat(await rootToken(page, token));
      expect(px, token).toBeGreaterThan(0);
      const box = await boxOf(icon);
      expect(box.width, step).toBeCloseTo(px, 0);
      expect(box.height, step).toBeCloseTo(px, 0);
    }
  });

  test('a drawing from data stands in the SVG namespace, fills the box and takes its colour', async ({
    page,
  }) => {
    const icon = page.getByTestId('size-lg');
    const svg = icon.locator('svg');
    await expect(svg).toHaveAttribute('viewBox', '0 0 24 24');
    // The house is three paths of geometry — and nothing else reached the element.
    await expect(svg.locator('path')).toHaveCount(3);
    expect(
      await svg.evaluate((el) => [
        el.namespaceURI,
        el.firstElementChild?.namespaceURI,
      ]),
    ).toEqual(['http://www.w3.org/2000/svg', 'http://www.w3.org/2000/svg']);
    // `display: contents` on the renderer: the drawing is sized by the icon's box as if it
    // stood in it directly, which is what a swapped drawing is promised (0028).
    const drawn = await boxOf(svg);
    const box = await boxOf(icon);
    expect(drawn.width).toBeCloseTo(box.width, 0);
    expect(drawn.height).toBeCloseTo(box.height, 0);
    // `stroke="currentColor"` resolves to the box's colour — the one channel a tone and a
    // state reach the drawing through.
    expect(await styleOf(svg, 'stroke')).toBe(await styleOf(icon, 'color'));
  });

  test('a tone is a state attribute and the skin’s colour for it, and none is no attribute', async ({
    page,
  }) => {
    const plain = page.getByTestId('tone-none');
    await expect(plain).not.toHaveAttribute('data-pct-tone', /./);
    const inherited = await styleOf(plain, 'color');

    const seen = new Set<string>([inherited]);
    for (const tone of TONES) {
      const icon = page.getByTestId(`tone-${tone}`);
      await expect(icon).toHaveAttribute('data-pct-tone', tone);
      const colour = await styleOf(icon, 'color');
      // The token's own paint, not merely "something other than the text's".
      expect(colour, tone).toBe(await paintOf(page, `--pct-icon-fg-${tone}`));
      expect(
        seen.has(colour),
        `${tone} shares a colour with another tone`,
      ).toBe(false);
      seen.add(colour);
    }
  });

  test('hidden until named: a label makes it an image under that name', async ({
    page,
  }) => {
    const hidden = page.getByTestId('name-hidden');
    await expect(hidden).toHaveAttribute('aria-hidden', 'true');
    await expect(hidden).not.toHaveAttribute('role');
    await expect(hidden).not.toHaveAttribute('aria-label');

    const named = page.getByTestId('name-given');
    await expect(named).not.toHaveAttribute('aria-hidden');
    await expect(named).toHaveAttribute('role', 'img');
    await expect(named).toHaveAttribute('aria-label', '3 unread messages');
    // Reachable by that name, which is the point of giving one.
    await expect(
      page.getByRole('img', { name: '3 unread messages' }),
    ).toHaveCount(1);
  });

  test('a font is a span wearing the classes, and the stylesheet draws the glyph', async ({
    page,
  }) => {
    const glyph = page.getByTestId('font-chevron').locator('span');
    await expect(glyph).toHaveClass(/sbx-glyph-chevron/);
    await expect(glyph).toHaveClass(/pct-icon__glyph/);
    await expect(glyph).toHaveAttribute('aria-hidden', 'true');
    expect(await glyphOf(glyph)).toBe('"▾"');
    expect(await glyphOf(page.getByTestId('font-user').locator('span'))).toBe(
      '"☻"',
    );
    // The glyph fills the box: `font-size: 1em` on the span, the box's size on the host.
    const box = await boxOf(page.getByTestId('font-chevron'));
    const px = Number.parseFloat(await rootToken(page, '--pct-icon-size-lg'));
    expect(box.width).toBeCloseTo(px, 0);
  });

  test('one line dresses the library’s own components, and stops where its providers stop', async ({
    page,
  }) => {
    // Inside the card: the avatar's silhouette and the checkbox's mark are glyphs of the
    // font, under the ids the source's `roles` map gave the library's `user` and `check`.
    const dressedAvatar = page.getByTestId('dressed-avatar');
    await expect(
      dressedAvatar.locator('[data-pct-part="silhouette"] span.sbx-glyph-user'),
    ).toHaveCount(1);
    await expect(dressedAvatar.locator('svg')).toHaveCount(0);
    const dressedMark = page
      .getByTestId('dressed-checkbox')
      .locator('[data-pct-part="mark"]');
    await expect(dressedMark.locator('span.sbx-glyph-check')).toHaveCount(1);
    await expect(dressedMark.locator('svg')).toHaveCount(0);

    // Outside it: the drawings the components ship with. The view's own sources stand
    // above both, and carry no roles — so this is also the reading that a source WITHOUT
    // a roles map leaves every component alone.
    const plainAvatar = page.getByTestId('plain-avatar');
    await expect(
      plainAvatar.locator('[data-pct-part="silhouette"] svg'),
    ).toHaveCount(1);
    await expect(plainAvatar.locator('span.sbx-glyph-user')).toHaveCount(0);
    const plainMark = page
      .getByTestId('plain-checkbox')
      .locator('[data-pct-part="mark"]');
    await expect(plainMark.locator('svg')).toHaveCount(1);
    await expect(plainMark.locator('span')).toHaveCount(0);
  });
});
