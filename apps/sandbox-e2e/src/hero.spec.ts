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
  /**
   * 2.2.2 Pause, Stop, Hide — the half that is the library's, measured as behaviour.
   *
   * The criterion is about motion that starts on its own and runs for more than five seconds
   * beside other content. The sweep now runs ONE pass — four seconds, half the motion axis —
   * and then stands still, which takes the criterion off the table for a consumer who does
   * nothing (plan 4.37). This case reads that as movement rather than as a declaration: the
   * computed `background-position` moves early and is the same value at 5.2 s and at 6 s.
   *
   * The first reading is the negative control and it is not decoration: without it the case
   * would pass on a face whose animation had been deleted altogether.
   */
  test('the sweep runs its pass and stands still inside five seconds', async ({
    page,
  }) => {
    await visit(page, '/hero');
    const face = page.getByTestId('hero-fill');
    const position = () =>
      face.evaluate((el) => getComputedStyle(el).backgroundPosition);

    /** Whether the engine still has something to run on this element. */
    const running = () =>
      face.evaluate((el) =>
        el.getAnimations().some((a) => a.playState === 'running'),
      );

    // The negative control, and the 400 ms that stood here was a guess at when the first
    // frame lands. What the number meant is the reading CHANGING, which is a condition the
    // page can answer for ([`lesson-192`](../../../docs/lessons.md#lesson-192)) — and on a
    // runner slow enough to miss that mark, a face whose animation had been deleted and one
    // that has not started yet read exactly alike.
    const first = await position();
    await expect
      .poll(position, { message: 'the sweep is not moving at all' })
      .not.toBe(first);

    // And the pass ENDS inside the criterion's five seconds. The 4800 ms decided when the
    // baseline was taken, so what the window below compares against was the runner's clock
    // and not the sweep's: at that mark the sweep may still have been travelling, and the
    // case would then be asking whether it holds a position it never came to rest on.
    // Measured here, 4 runs in chromium: the animation reads `running` at this line and
    // ends 4048–4128 ms later, so the number was standing on some 700 ms of margin — an
    // idle machine's, and nothing in the file said so
    // ([`lesson-192`](../../../docs/lessons.md#lesson-192)). The five seconds are the
    // poll's own bound now — that is the half of this claim which is about a duration —
    // and the condition is the engine's own statement that it has nothing left to run.
    await expect
      .poll(running, {
        message: 'the sweep is still running after five seconds',
        timeout: 5000,
      })
      .toBe(false);

    // The baseline is read BEFORE the window and has to survive it, which is the one shape
    // of wait that is not a guess: a longer one makes the claim stronger.
    const settled = await position();
    await page.waitForTimeout(800);
    expect(
      await position(),
      'the sweep is still moving after five seconds',
    ).toBe(settled);
  });

  /**
   * The other half: a page that wants the pass stopped before it ends says so, and the sweep
   * freezes where it stands rather than jumping to an end frame.
   */
  test('`paused` stops the sweep where it stands', async ({ page }) => {
    await visit(page, '/hero');
    const face = page.getByTestId('hero-paused');
    const position = () =>
      face.evaluate((el) => getComputedStyle(el).backgroundPosition);

    await page.getByTestId('toggle-paused').click();
    await expect(face).toHaveAttribute('data-pct-paused', '');

    const held = await position();
    expect(
      await face.evaluate((el) => getComputedStyle(el).animationPlayState),
    ).toBe('paused');
    await page.waitForTimeout(600);
    expect(await position(), 'a paused sweep moved anyway').toBe(held);

    // And it is a stop the page can take back — the input is a binding, not a one-way door.
    await page.getByTestId('toggle-paused').click();
    await expect(face).not.toHaveAttribute('data-pct-paused', '');
    await page.waitForTimeout(400);
    expect(
      await position(),
      'the sweep did not start again when the page let it',
    ).not.toBe(held);
  });
});
