import { expect, test, type Locator, type Page } from '@playwright/test';
import { boxOf, visit } from './support/dom';
import { firstDurationMs, rootToken, styleOf } from './support/css';

/**
 * What is measured here is mostly SPACE, and that is the component: a skeleton exists to hold
 * the place of content that has not arrived, so the reading that matters is whether the page
 * moves when the content lands
 * ([0050](../../../docs/decisions/0050-a-skeleton-is-a-picture-of-a-wait.md),
 * [`lesson-136`](../../../docs/lessons.md#lesson-136)).
 *
 * The other half is the platform's arithmetic, and it can only be read in a browser: `1lh` and
 * `1cap` are the line box and the capital height of the type the skeleton stands in, and no
 * unit test can say what a font does with them. Three engines have to agree, or "the size is
 * the text's" is a claim about one of them.
 */
test.describe('PctSkeleton — the shape of content that has not arrived', () => {
  test.beforeEach(async ({ page }) => {
    await visit(page, '/skeleton');
  });

  const tracks = (page: Page, id: string) =>
    page.getByTestId(id).locator('[data-pct-part="track"]');

  const fill = (page: Page, id: string) =>
    page.getByTestId(id).locator('[data-pct-part="fill"]').first();

  /** The computed line box of a stage — the number the whole geometry is built out of. */
  const lineHeight = (locator: Locator) =>
    locator.evaluate((el) => parseFloat(getComputedStyle(el).lineHeight));

  test('holds exactly the space the text will take, and gives it up without moving', async ({
    page,
  }) => {
    // The claim the component exists for. Three bars stand in three line boxes and three
    // lines of text take three line boxes, so the region is the same height before and after
    // — no number was chosen by anybody to make that true.
    const region = page.getByTestId('region');
    const waiting = await boxOf(region);
    await expect(tracks(page, 'skeleton-swap')).toHaveCount(3);

    await page.getByTestId('toggle').click();
    await expect(page.getByTestId('text-swap')).toBeVisible();

    const answered = await boxOf(region);
    expect(answered.height).toBeCloseTo(waiting.height, 0);
  });

  test('is measured in the type it stands in, with nothing bound', async ({
    page,
  }) => {
    // The same component with the same inputs in two places, and two different heights: a
    // line is `1lh`, so the browser's own arithmetic over the consumer's font decides. A
    // token in pixels here would give one of these two the wrong answer.
    for (const [stage, id] of [
      ['type-large', 'skeleton-large'],
      ['type-small', 'skeleton-small'],
    ]) {
      const line = await lineHeight(page.getByTestId(stage));
      const box = await boxOf(page.getByTestId(id));
      expect(box.height).toBeCloseTo(2 * line, 0);
    }

    const large = await boxOf(page.getByTestId('skeleton-large'));
    const small = await boxOf(page.getByTestId('skeleton-small'));
    expect(large.height).toBeGreaterThan(small.height);
  });

  test('draws a bar the height of a capital letter, not of the line', async ({
    page,
  }) => {
    // `1cap` is the other half of the same idea, and the reading is a proportion of the FONT
    // rather than of the line: a capital letter is about seven tenths of the em box, whatever
    // leading the line box puts around it (measured 0.7138 in chromium and webkit, 0.7141 in
    // firefox — a font metric, so an equality here would be a claim about one engine). Against
    // the LINE it is under a half at `line-height: 1.5`, which is the reading that would have
    // been written from memory.
    for (const [stage, id] of [
      ['type-large', 'skeleton-large'],
      ['type-small', 'skeleton-small'],
    ]) {
      const stageEl = page.getByTestId(stage);
      const line = await lineHeight(stageEl);
      const font = await stageEl.evaluate((el) =>
        parseFloat(getComputedStyle(el).fontSize),
      );
      const bar = await boxOf(tracks(page, id).first());
      expect(bar.height).toBeLessThan(line);
      expect(bar.height / font).toBeGreaterThan(0.55);
      expect(bar.height / font).toBeLessThan(0.9);
    }

    const big = await boxOf(tracks(page, 'skeleton-large').first());
    const small = await boxOf(tracks(page, 'skeleton-small').first());
    expect(big.height).toBeGreaterThan(small.height);
  });

  test('shortens the last line of a paragraph and no other', async ({
    page,
  }) => {
    const bars = tracks(page, 'skeleton-text');
    await expect(bars).toHaveCount(3);

    const first = await boxOf(bars.nth(0));
    const second = await boxOf(bars.nth(1));
    const last = await boxOf(bars.nth(2));
    expect(second.width).toBeCloseTo(first.width, 0);
    expect(last.width).toBeLessThan(first.width);

    // And a bar standing alone is a whole line: `:last-child` alone would have cut this one
    // short too, which is why the rule reads `:not(:only-child)` as well.
    const lone = tracks(page, 'skeleton-block');
    await expect(lone).toHaveCount(1);
    const box = await boxOf(lone);
    const host = await boxOf(page.getByTestId('skeleton-block'));
    expect(box.width).toBeCloseTo(host.width, 0);
  });

  test('says nothing and cannot be landed on', async ({ page }) => {
    const skeleton = page.getByTestId('skeleton-swap');
    await expect(skeleton).toHaveAttribute('aria-hidden', 'true');

    // The whole subtree is out of the tab order, and that is what makes hiding it legitimate:
    // `aria-hidden` over anything focusable is axe's `aria-hidden-focus`. The bar carries
    // `overflow: hidden`, which — unlike `overflow: auto`, focusable in two engines of three
    // (`lesson-126`) — takes focus in none of them.
    const landed = await skeleton.evaluate((host) => {
      const targets = [host, ...host.querySelectorAll('*')];
      return targets.filter((el) => {
        (el as HTMLElement).focus?.();
        return document.activeElement === el;
      }).length;
    });
    expect(landed).toBe(0);

    // Nor is it a progress bar, though it is drawn like one: the role would be a claim about
    // how far along something is, and nobody has measured that.
    await expect(page.getByRole('progressbar')).toHaveCount(0);
  });

  test('leaves the busy state on the region, which drops it when the answer comes', async ({
    page,
  }) => {
    const region = page.getByTestId('region');
    await expect(region).toHaveAttribute('aria-busy', 'true');
    // Not on the placeholder: a busy state on a hidden element is a fact told to nobody.
    await expect(page.getByTestId('skeleton-swap')).not.toHaveAttribute(
      'aria-busy',
      'true',
    );

    await page.getByTestId('toggle').click();
    await expect(page.getByTestId('text-swap')).toBeVisible();
    await expect(region).not.toHaveAttribute('aria-busy', 'true');
  });

  test('takes its sheen’s duration from the motion axis — three and a half loops of it', async ({
    page,
  }) => {
    const sheen = fill(page, 'skeleton-text');
    // Waited for rather than read once: a style read before the first resolution answers with
    // an empty string, which is indistinguishable from a wrong value (the progress bar's own
    // red, `lesson-202`). Three and a half loops and not one: the loop is a band's tempo and
    // a shadow at that tempo flickers — and the factor is read against the token, so the
    // claim stays "derived from the axis" rather than "is 2.1s".
    // The token is written in milliseconds and the browser serialises a duration in
    // seconds, so the reading is kept in whole milliseconds and converted once — `0.6 * 3`
    // was `1.7999999999999998` in JavaScript, and a string built from it matched nothing.
    const loopMs = Math.round(
      parseFloat(await rootToken(page, '--pct-motion-loop-duration')),
    );
    expect(loopMs).toBe(600);
    await expect(sheen).toHaveCSS(
      'animation-duration',
      `${(loopMs * 3.5) / 1000}s`,
    );
    expect(await firstDurationMs(sheen, 'animation-duration')).toBe(
      loopMs * 3.5,
    );
  });

  test('travels the sheen across the placeholder', async ({ page }) => {
    const sheen = fill(page, 'skeleton-text');
    const bar = tracks(page, 'skeleton-text').first();

    // The loop is 600 ms and a worker sharing its cores can be descheduled for longer than
    // that: two samples a cycle apart look like stillness and three like travel the other way
    // (the progress band's reading, one component over). So the same keyframes are slowed to
    // six seconds and put back to their first frame, which makes a one-second window
    // monotone. What the duration really is stays asserted above, from the computed style.
    await sheen.evaluate((el) => {
      el.style.animationDuration = '6s';
      for (const animation of el.getAnimations()) animation.currentTime = 0;
    });

    const groove = await boxOf(bar);
    const samples: number[] = [];
    for (let i = 0; i < 6; i += 1) {
      const band = await boxOf(sheen);
      samples.push(band.x - groove.x);
      await page.waitForTimeout(200);
    }

    const forwards = samples
      .slice(1)
      .filter((value, i) => value > samples[i]).length;
    expect(forwards, `sheen offsets: ${samples.join(', ')}`).toBeGreaterThan(3);
  });

  test('is the box it is given in the block shape', async ({ page }) => {
    const picture = page.getByTestId('skeleton-block');
    await expect(picture).toHaveAttribute('data-pct-shape', 'block');
    const host = await boxOf(picture);
    const bar = await boxOf(tracks(page, 'skeleton-block'));
    expect(bar.height).toBeCloseTo(host.height, 0);
    expect(bar.width).toBeCloseTo(host.width, 0);

    // 8rem, which is nothing this component chose: a block is the space the consumer knows
    // the picture will take.
    expect(host.height).toBeCloseTo(128, 0);
  });

  /**
   * The disc the shapes card used to draw as a block with a radius token, and 0067's reason
   * it is a shape: the view writes ONE axis — `block-size: 3rem` and nothing else — and the
   * width has to be the component's own transfer through the ratio, in three engines. A
   * radius alone could not have done this; it rounded whatever box it was given, and a block
   * is as wide as its container.
   */
  test('is a disc in the circle shape, sized on one axis with the other following', async ({
    page,
  }) => {
    const avatar = page.getByTestId('skeleton-avatar');
    await expect(avatar).toHaveAttribute('data-pct-shape', 'circle');
    const disc = await boxOf(avatar);
    expect(disc.height).toBeCloseTo(48, 0);
    expect(disc.width).toBeCloseTo(disc.height, 0);

    const track = tracks(page, 'skeleton-avatar');
    const bar = await boxOf(track);
    expect(bar.width).toBeCloseTo(disc.width, 0);
    expect(bar.height).toBeCloseTo(disc.height, 0);
    // Half of a square, which is the one radius that IS a circle — the shape's own, not the
    // skin's corner token.
    expect(await styleOf(track, 'border-radius')).toBe('50%');
  });

  test('draws one box in the block shape and one disc in the circle shape, however many lines were asked for', async ({
    page,
  }) => {
    await expect(tracks(page, 'skeleton-block')).toHaveCount(1);
    await expect(tracks(page, 'skeleton-avatar')).toHaveCount(1);
  });

  test('gives every placeholder a sheen of its own, clipped by it', async ({
    page,
  }) => {
    const bars = tracks(page, 'skeleton-text');
    await expect(bars).toHaveCount(3);
    for (let i = 0; i < 3; i++) {
      const bar = await boxOf(bars.nth(i));
      const band = await boxOf(
        bars.nth(i).locator('[data-pct-part="fill"]').first(),
      );

      // As wide as the token says and as tall as the bar — the whole bar, read from the token
      // rather than typed, because the width is the length of the shade's ramp and the
      // number is the token's to decide.
      const size = parseFloat(
        await rootToken(page, '--pct-skeleton-fill-size'),
      );
      expect(size).toBe(100);
      expect(band.width / bar.width).toBeCloseTo(size / 100, 2);
      expect(band.height).toBeCloseTo(bar.height, 0);

      // And no edge: the sheen is the fill token at its middle fading to nothing at both
      // ends, so what crosses the bar is a light and not a block with two sides. Read as the
      // computed image, because that is where a gradient a stylesheet wrote can be lost —
      // under forced colours it is, and `forced-colors.spec` measures the solid colour that
      // stands in for it there.
      expect(
        await styleOf(
          bars.nth(i).locator('[data-pct-part="fill"]').first(),
          'background-image',
        ),
      ).toContain('linear-gradient');
      // And blurred, by the token's pixels — the softness that does not shrink with the
      // element, which is what a 44px disc needed and a 448px picture did not.
      expect(
        await styleOf(
          bars.nth(i).locator('[data-pct-part="fill"]').first(),
          'filter',
        ),
      ).toBe(`blur(${await rootToken(page, '--pct-skeleton-fill-blur')})`);

      // What keeps the paint inside the rounded bar is the CLIP and not the geometry: the
      // band's box travels right out of the bar and past its end, which is what a bounding
      // rectangle reports and a screen never shows. `lesson-137` is the other half of that
      // choice — this clip costs no focusability in any of the three engines.
      expect(await styleOf(bars.nth(i), 'overflow-x')).toBe('hidden');
      expect(await styleOf(bars.nth(i), 'overflow-y')).toBe('hidden');
    }
  });
});

/**
 * The stop the page throws, and the reason the component will not throw it itself
 * ([0073](../../../docs/decisions/0073-the-stop-a-long-wait-needs-is-the-pages-to-throw.md)).
 *
 * SC 2.2.2 asks for a mechanism once motion runs past five seconds beside other content, and a
 * skeleton's sheen runs for as long as the wait does — by design, since a placeholder that
 * went still would say the work had finished. So the mechanism is an input, and what these
 * cases hold is that it is a real one in a browser: the shade freezes WHERE IT STANDS rather
 * than snapping back to its start edge, and the page can let it go again.
 */
test.describe('PctSkeleton — the stop belongs to the page', () => {
  test('`paused` freezes the sheen where it stands, and lets it go again', async ({
    page,
  }) => {
    await visit(page, '/skeleton');
    const host = page.getByTestId('skeleton-paused');
    const shade = host.locator('[data-pct-part="fill"]').first();
    // The travelled distance, read off the property the animation actually moves — a
    // `transform` would have been the usual reading and this component moves neither.
    const position = () => styleOf(shade, 'inset-inline-start');

    const first = await position();
    await page.waitForTimeout(500);
    expect(await position(), 'the sheen is not moving at all').not.toBe(first);

    await page.getByTestId('toggle-paused').click();
    await expect(host).toHaveAttribute('data-pct-paused', '');
    expect(await styleOf(shade, 'animation-play-state')).toBe('paused');

    // Webkit applies the pause on a later FRAME than the one the click lands in, so a value
    // read in the same task is a few frames stale and differs from the one the sheen actually
    // stops on — measured at 197.72px against the 214.13px it then held for the rest of the
    // run ([`lesson-183`](../../../docs/lessons.md#lesson-183)).
    //
    // That lesson also recorded the animation's own `currentTime` as already frozen at both
    // readings, and a fixed 150ms wait stood here on that reading. It does not always hold:
    // 3 of 30 webkit runs on an idle machine had the clock still settling at that mark and
    // falling BACK afterwards — 4280 then 4086, which is 194ms in the direction no running
    // animation can go ([`lesson-192`](../../../docs/lessons.md#lesson-192)). So the
    // baseline is not a point in time but the first reading that repeats: the assertion
    // below was always meant to be about a clock that has stopped, and now it waits for one
    // instead of assuming a number.
    const clock = () =>
      shade.evaluate((el) => el.getAnimations()[0]?.currentTime ?? null);
    const settled = async () => {
      let previous = await clock();
      for (let attempt = 0; attempt < 40; attempt++) {
        await page.waitForTimeout(50);
        const now = await clock();
        if (now === previous) return now;
        previous = now;
      }
      throw new Error('the sheen’s clock never settled under the pause');
    };

    const stopped = await settled();
    const held = await position();
    await page.waitForTimeout(700);
    expect(await position(), 'a paused sheen travelled anyway').toBe(held);
    // And the platform's own statement beside the geometry: the animation's clock did not
    // advance either, which is a reading no engine's style resolution can disagree about.
    expect(await clock(), 'the animation clock advanced under the pause').toBe(
      stopped,
    );
    // Frozen mid-crossing and not sent home: the start edge is the negative of the shade's
    // own width, and a stop that reset the animation would be sitting exactly there.
    expect(held, 'the sheen jumped back to its start edge').not.toBe(first);

    await page.getByTestId('toggle-paused').click();
    await expect(host).not.toHaveAttribute('data-pct-paused', '');
    await page.waitForTimeout(500);
    expect(
      await position(),
      'the sheen did not start again when the page let it',
    ).not.toBe(held);
  });

  test('the stop is one page’s and not the library’s: every other skeleton keeps moving', async ({
    page,
  }) => {
    await visit(page, '/skeleton');
    const other = page
      .getByTestId('skeleton-text')
      .locator('[data-pct-part="fill"]')
      .first();

    await page.getByTestId('toggle-paused').click();
    await expect(page.getByTestId('skeleton-paused')).toHaveAttribute(
      'data-pct-paused',
      '',
    );

    // The negative control for the whole mechanism: an input on one instance is not a
    // document-level switch, and a page that stopped every placeholder it did not name would
    // be the library deciding what a wait means.
    expect(await styleOf(other, 'animation-play-state')).toBe('running');
    const moving = await other.evaluate(
      (el) => getComputedStyle(el).insetInlineStart,
    );
    await page.waitForTimeout(500);
    expect(
      await other.evaluate((el) => getComputedStyle(el).insetInlineStart),
      'an unnamed skeleton stopped with the named one',
    ).not.toBe(moving);
  });
});
