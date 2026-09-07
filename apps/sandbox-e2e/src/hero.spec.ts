import { expect, Locator, test } from '@playwright/test';
import { visit } from './support/dom';

/**
 * `pctHero` is paint and nothing else, so every promise it makes is a computed value in a
 * real engine — jsdom paints none of this. Three of the cases here are the probe
 * [0065](../../../docs/decisions/0065-a-treatment-that-paints-is-a-component.md) asked for
 * before the component existed: the rim stands on `mask-composite`, and
 * [`lesson-156`](../../../docs/lessons.md#lesson-156) is the bill that idiom has already
 * cost once — in one engine, with no symptom anywhere a green suite could look.
 */
test.describe('PctHero — the brand gradient as equipment', () => {
  test.beforeEach(async ({ page }) => {
    await visit(page, '/hero');
  });

  /** A computed property of the element itself, or of a pseudo-element of it. */
  const styleOf = (
    host: Locator,
    property: string,
    pseudo: string | null = null,
  ) =>
    host.evaluate(
      (el, [prop, pseudo]) =>
        getComputedStyle(el, pseudo || undefined).getPropertyValue(
          prop as string,
        ),
      [property, pseudo] as const,
    );

  test('the rim is a rim: the mask is composited to exclude, in every engine', async ({
    page,
  }) => {
    const card = page.getByTestId('hero-edge');

    // The measurement this component was not allowed to be written without. `add` is what
    // firefox falls back to when a `-webkit-mask` shorthand stands BELOW the composite, and
    // `add` does not punch the middle out — it paints the gradient over the whole card.
    // One value per mask LAYER, and there are two of them — the engines answer `xor, xor`
    // or `exclude, exclude`, so the reading is per layer and not per property.
    const layers = [
      await styleOf(card, 'mask-composite', '::after'),
      await styleOf(card, '-webkit-mask-composite', '::after'),
    ]
      .filter(Boolean)
      .flatMap((value) => value.split(',').map((one) => one.trim()));

    expect(
      layers.length,
      'no engine reported a mask composite at all',
    ).toBeGreaterThan(0);
    expect(
      layers.every((value) => value === 'exclude' || value === 'xor'),
      `a layer does not exclude: ${layers.join(' / ')}`,
    ).toBe(true);

    // And the rim really is drawn: a mask image, a gradient under it, and a card whose own
    // surface is still its own.
    expect(await styleOf(card, 'mask-image', '::after')).toContain('gradient');
    expect(await styleOf(card, 'background-image', '::after')).toContain(
      'linear-gradient',
    );
    expect(await styleOf(card, 'background-color')).toBe('rgb(255, 255, 255)');
  });

  test('the word is cut out of the sweep, and the fill carries its measured pair', async ({
    page,
  }) => {
    const word = page.getByTestId('hero-text');
    // Both spellings read, and one of them has to say `text`: the engines do not agree on
    // which of the two they report, and a reading that asked only one would pass on a
    // browser that answers with the other.
    const clip = [
      await styleOf(word, 'background-clip'),
      await styleOf(word, '-webkit-background-clip'),
    ];
    expect(
      clip,
      `neither spelling clips to the text: ${clip.join(' / ')}`,
    ).toContain('text');
    // The glyphs are painted by the background, so the colour property itself is out of the
    // way. Without the clip this would be an unreadable headline, which is why the rule
    // stands behind `@supports`.
    expect(await styleOf(word, 'color')).toBe('rgba(0, 0, 0, 0)');
    expect(await styleOf(word, 'background-image')).toContain(
      'linear-gradient',
    );

    const fill = page.getByTestId('hero-fill');
    expect(await styleOf(fill, 'background-image')).toContain(
      'linear-gradient',
    );
    // --pct-on-hero -> slate.0
    expect(await styleOf(fill, 'color')).toBe('rgb(255, 255, 255)');
  });

  /**
   * The invariant that lives BETWEEN two declarations, which is why it is read as a pair: the
   * drift moves the image by `position × (box − image)`, so a travel that is not a whole
   * number of gradients snaps back mid-sweep at every repeat. Neither number is wrong on its
   * own and no picture of a frozen frame can show it (`lesson-167`).
   */
  test('every face travels a whole number of its own gradient', async ({
    page,
  }) => {
    const pairs = [
      ['hero-edge', '::after', '200%', 'pct-hero-drift'],
      ['hero-text', null, '200%', 'pct-hero-drift'],
      ['hero-fill', null, '300%', 'pct-hero-drift-wide'],
    ] as const;

    for (const [testId, pseudo, size, name] of pairs) {
      const host = page.getByTestId(testId);
      expect(
        await styleOf(host, 'background-size', pseudo),
        `${testId} does not paint at ${size}`,
      ).toBe(`${size} 100%`);
      // The last segment, because emulated encapsulation renames a component's keyframes:
      // what the engine reports is `_ngcontent-ng-cXXXXXXX_pct-hero-drift`. Read whole and
      // not by `toContain` — `pct-hero-drift-wide` contains `pct-hero-drift`, so the loose
      // reading would pass on exactly the swap this case exists to catch.
      const animation = await styleOf(host, 'animation-name', pseudo);
      expect(
        animation.split('_').pop(),
        `${testId} drifts on the keyframe of another size (${animation})`,
      ).toBe(name);
    }
  });

  test('the word takes the lifted stops on a dark ground and the brand stops on a light one', async ({
    page,
  }) => {
    const light = await styleOf(
      page.getByTestId('hero-text-light'),
      'background-image',
    );
    const dark = await styleOf(
      page.getByTestId('hero-text-dark'),
      'background-image',
    );

    // blue.600 / violet.600 / cyan.700 against blue.400 / violet.400 / cyan.500 — the three
    // that read 3.13–3.45 as text on the dark surface, and the three that read 6.56–7.35.
    expect(light).toContain('rgb(37, 99, 235)');
    expect(light).toContain('rgb(124, 58, 237)');
    expect(light).toContain('rgb(14, 116, 144)');
    expect(dark).toContain('rgb(96, 165, 250)');
    expect(dark).toContain('rgb(167, 139, 250)');
    expect(dark).toContain('rgb(6, 182, 212)');
  });

  test('`interact` answers a pointer AND a keyboard, and neither at rest', async ({
    page,
  }) => {
    const card = page.getByTestId('hero-edge-interact');
    const opacity = () => styleOf(card, 'opacity', '::after');

    expect(await opacity()).toBe('0');

    await card.hover();
    await expect.poll(opacity).toBe('1');

    // Away, and then in by keyboard: `:focus-visible` is the half of the pair a treatment
    // summoned by hover alone would not have (0065).
    await page.mouse.move(0, 0);
    await expect.poll(opacity).toBe('0');

    await page.getByTestId('hero-edge-interact').focus();
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Tab');
    await expect(card).toBeFocused();
    await expect.poll(opacity).toBe('1');
  });

  test('no face is no paint and no attribute — the element is left as it was found', async ({
    page,
  }) => {
    const plain = page.getByTestId('hero-none');
    await expect(plain).not.toHaveAttribute('data-pct-hero', /.*/);
    await expect(plain).not.toHaveAttribute('data-pct-show', /.*/);
    expect(await styleOf(plain, 'background-image')).toBe('none');
    // The rim's rule is keyed on the face, so with no face the pseudo-element draws nothing.
    expect(await styleOf(plain, 'content', '::after')).toBe('none');
  });
});
