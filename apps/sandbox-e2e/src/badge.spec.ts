import { expect, test } from '@playwright/test';
import { boxOf, visit } from './support/dom';

/**
 * What is measured here is mostly ABSENCE, because that is the component: no role, no
 * label, no control-axis height, no parts — a word in a box that the document's own text
 * flow owns ([0053](../../../docs/decisions/0053-a-badge-is-a-word-wearing-a-tone.md)).
 * The one presence worth three engines is the geometry: the box bends no line and stands
 * under the control axis it refuses.
 */
test.describe('PctBadge — a word wearing a tone', () => {
  test.beforeEach(async ({ page }) => {
    await visit(page, '/badge');
  });

  test('carries its tone as a state attribute, neutral being the base', async ({
    page,
  }) => {
    await expect(page.getByTestId('tone-neutral')).toHaveAttribute(
      'data-pct-tone',
      'neutral',
    );
    await expect(page.getByTestId('tone-danger')).toHaveAttribute(
      'data-pct-tone',
      'danger',
    );
  });

  test('is plain text to the tree: no role, no name, no parts', async ({
    page,
  }) => {
    const badge = page.getByTestId('tone-danger');
    await expect(badge).toHaveText('3 overdue');
    await expect(badge).not.toHaveAttribute('role');
    await expect(badge).not.toHaveAttribute('aria-label');
    await expect(badge.locator('[data-pct-part]')).toHaveCount(0);
  });

  test('stands under the control axis it refuses', async ({ page }) => {
    // No `size` input is a measurable sentence: the box is its own type plus breathing
    // room, and it must come in UNDER the smallest control height — a badge as tall as a
    // button is a button wanting to be quiet.
    const box = await boxOf(page.getByTestId('tone-neutral'));
    expect(box.height).toBeLessThan(28);
  });

  test('bends no line of the heading it stands in', async ({ page }) => {
    // Twin headings, one with the badge and one without, and one height between them: the
    // badge's box fits inside the line its word is part of, so the heading's own leading
    // decides. The first cut of this case derived the expected height from
    // `line-height: normal` with a remembered 1.5 — and measured 1.325 in all three
    // engines, which is why the reference is a rendered twin and not an arithmetic.
    const withBadge = await boxOf(page.getByTestId('inline-heading'));
    const plain = await boxOf(page.getByTestId('plain-heading'));
    expect(withBadge.height).toBeCloseTo(plain.height, 0);
  });

  test('a projected glyph sits beside the word at the token gap', async ({
    page,
  }) => {
    const glyph = page.getByTestId('glyph').locator('svg');
    await expect(glyph).toBeVisible();
    const badge = await boxOf(page.getByTestId('glyph'));
    const drawing = await boxOf(glyph);
    expect(drawing.x).toBeGreaterThan(badge.x);
  });
});
