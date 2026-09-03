import { expect, test } from '@playwright/test';
import { styleOf } from './support/css';
import { boxOf, visit } from './support/dom';

/**
 * Layout is geometry and nothing else, so every finding here is a ruler reading: computed
 * lengths and bounding boxes, in three engines. The one deliberate absence is a media
 * query — the column counts below change with the viewport while the stylesheet contains
 * none, which is the whole promise of 0057.
 */
test.describe('Layout — three boxes, measured', () => {
  test.beforeEach(async ({ page }) => {
    await visit(page, '/layout');
  });

  test('the container caps its column and centres it', async ({ page }) => {
    const container = page.getByTestId('container');
    const box = await boxOf(container);
    // 72rem at the default root size — the cap holds even on this wide viewport.
    expect(box.width).toBeLessThanOrEqual(72 * 16);

    const around = await boxOf(container.locator('..'));
    const start = box.x - around.x;
    const end = around.x + around.width - (box.x + box.width);
    expect(Math.abs(start - end)).toBeLessThanOrEqual(1);

    // The quiet extra: the column is a ruler its content can query against.
    expect(await styleOf(container, 'container-type')).toBe('inline-size');
  });

  /**
   * The column as a flex item (lesson-146): inline-size containment makes the box's
   * intrinsic width zero, so a bare column in a flex row collapses to its gutter — and no
   * declaration on the column can undo it, the width has to come from outside. Both
   * halves are measured, so the card's limitation stays true the day somebody "fixes" it.
   */
  test('a bare column in a flex row collapses to its gutter; a held one keeps the row', async ({
    page,
  }) => {
    const bare = await boxOf(page.getByTestId('container-bare'));
    const gutter = parseFloat(
      await styleOf(page.getByTestId('container-bare'), 'padding-inline-start'),
    );
    expect(bare.width).toBeLessThanOrEqual(gutter * 2 + 1);

    const held = page.getByTestId('container-held');
    const box = await boxOf(held);
    const holder = await boxOf(held.locator('..'));
    expect(
      Math.abs(box.width - Math.min(holder.width, 72 * 16)),
    ).toBeLessThanOrEqual(1);
    expect((await boxOf(held.locator('p'))).width).toBeGreaterThan(100);
  });

  test('the gutter follows the viewport between its two ends', async ({
    page,
  }) => {
    const container = page.getByTestId('container');
    // 4vw of 1280 is past the ceiling; of 375 it is under the floor. Both ends of the
    // clamp are read back as the padding the engine actually applied.
    expect(await styleOf(container, 'padding-left')).toBe('40px');

    await page.setViewportSize({ width: 375, height: 720 });
    expect(await styleOf(container, 'padding-left')).toBe('16px');
  });

  test('the stack spaces blocks by the scale, and the edges stay flush', async ({
    page,
  }) => {
    for (const [id, gap] of [
      ['stack-sm', 8],
      ['stack-md', 16],
      ['stack-lg', 24],
    ] as const) {
      const stack = page.getByTestId(id);
      expect(await styleOf(stack, 'row-gap')).toBe(`${gap}px`);

      const boxes = stack.locator('.box');
      const first = await boxOf(boxes.first());
      const second = await boxOf(boxes.nth(1));
      // The distance the reader sees, not just the declaration the engine holds.
      expect(Math.round(second.y - (first.y + first.height))).toBe(gap);

      const outer = await boxOf(stack);
      expect(Math.round(first.y - outer.y)).toBe(0);
    }
  });

  test('the grid finds its own column count at every width', async ({
    page,
  }) => {
    const grid = page.getByTestId('grid');
    const columnsOf = async () =>
      (await styleOf(grid, 'grid-template-columns')).split(' ').length;

    const wide = await columnsOf();
    expect(wide).toBeGreaterThanOrEqual(2);
    // Every track honours the minimum the token names (16rem = 256px).
    for (const track of (await styleOf(grid, 'grid-template-columns')).split(
      ' ',
    )) {
      expect(parseFloat(track)).toBeGreaterThanOrEqual(256);
    }

    await page.setViewportSize({ width: 375, height: 720 });
    expect(await columnsOf()).toBe(1);
  });

  test('the scoped token is the input: a denser minimum packs more columns', async ({
    page,
  }) => {
    const count = async (id: string) =>
      (await styleOf(page.getByTestId(id), 'grid-template-columns')).split(' ')
        .length;

    expect(await count('grid-dense')).toBeGreaterThan(await count('grid'));
  });

  test('none of the three carries a single ARIA attribute', async ({
    page,
  }) => {
    for (const id of ['container', 'stack-md', 'grid'] as const) {
      const attributes = await page
        .getByTestId(id)
        .evaluate((el) => el.getAttributeNames());
      expect(attributes.some((name) => name.startsWith('aria-'))).toBe(false);
      expect(attributes).not.toContain('role');
    }
  });
});
