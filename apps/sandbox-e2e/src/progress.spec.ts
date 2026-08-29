import { expect, test, type Locator, type Page } from '@playwright/test';
import { boxOf, setRtl, visit } from './support/dom';

/**
 * Almost every case here measures the PLATFORM rather than this library, and that is the
 * point: `pct-progress` writes no `role`, no `aria-valuenow` and no `aria-valuemax`, so what
 * is left to prove is that a `<progress>` really carries them — in three engines, which is
 * the only place that claim can be checked
 * ([`req-api-platform`](../../../docs/requirements/api.md#req-api-platform),
 * [0049](../../../docs/decisions/0049-a-progress-bar-is-the-platforms-element-under-our-paint.md)).
 *
 * The other half is what the element could NOT do: `appearance: none` is the price of
 * painting it and it takes the engine's indeterminate animation away, so the travelling band
 * is ours and has to be measured moving — including which way it moves once the page is
 * mirrored.
 */
test.describe('PctProgress — a <progress> under our own paint', () => {
  test.beforeEach(async ({ page }) => {
    await visit(page, '/progress');
  });

  const track = (page: Page, id: string) =>
    page.getByTestId(id).locator('[data-pct-part="track"]');

  const fill = (page: Page, id: string) =>
    page.getByTestId(id).locator('[data-pct-part="fill"]');

  /** How wide the fill is as a share of the groove it stands in — geometry, not a style. */
  const share = async (page: Page, id: string) => {
    const groove = await boxOf(track(page, id));
    const painted = await boxOf(fill(page, id));
    return painted.width / groove.width;
  };

  /**
   * The same reading, waited for.
   *
   * The attribute and the paint do not arrive together: the element takes its `value` in the
   * same frame the model changes, and the fill eases into place over the motion axis's
   * transition duration. A geometry reading taken straight after the attribute assertion
   * catches the fill in flight — measured, 0.49 on the way to 0.60 — which is
   * [`lesson-130`](../../../docs/lessons.md#lesson-130) exactly: a retrying assertion settles
   * the thing it names, and naming the cause of a motion does not settle its effect. So the
   * retry goes around the geometry itself.
   */
  const expectSettledShare = async (
    page: Page,
    id: string,
    expected: number,
  ) => {
    await expect.poll(() => share(page, id)).toBeCloseTo(expected, 2);
  };

  /** Where the band stands, measured from the groove's start edge in the reading direction. */
  const offset = async (page: Page, id: string, rtl: boolean) => {
    const groove = await boxOf(track(page, id));
    const band = await boxOf(fill(page, id));
    return rtl
      ? groove.x + groove.width - (band.x + band.width)
      : band.x - groove.x;
  };

  /**
   * Slows the band down for the direction reading, and it is the reading that needs it.
   *
   * The loop is 600 ms, and a worker sharing eight cores with twenty others can be
   * descheduled for longer than that: two samples a whole cycle apart look like no movement
   * and three look like movement the other way, so the case would go red on a machine rather
   * than on a defect — plan 4.2's shape in a suite with a deadline in every wait. Slowing the
   * SAME keyframes to six seconds makes a one-second window monotone. What the duration
   * really is stays asserted, from the computed style, before this runs.
   */
  const slowTheBand = (page: Page, id: string) =>
    fill(page, id).evaluate((el) => {
      el.style.animationDuration = '6s';
    });

  /** Six readings of the band's offset over a second, in the reading direction. */
  const travel = async (page: Page, id: string, rtl: boolean) => {
    const samples: number[] = [];
    for (let i = 0; i < 6; i += 1) {
      samples.push(await offset(page, id, rtl));
      await page.waitForTimeout(200);
    }
    return samples;
  };

  test('what a reader gets is the element, and the library writes none of it', async ({
    page,
  }) => {
    await expect(page.getByTestId('progress-value')).toMatchAriaSnapshot(`
      - progressbar "Uploading"
    `);

    // The name may come from the sentence beside it instead — the usual case, since what a
    // sighted user reads is what a screen-reader user should hear.
    await expect(
      page.getByRole('progressbar', { name: 'Copying files' }),
    ).toBeVisible();

    // And nothing of ours stands beside what the element publishes: the whole of 0039 as an
    // absence, and `lesson-112`'s defect made impossible rather than merely avoided.
    const bar = page.getByTestId('progress-value');
    for (const attribute of [
      'role',
      'aria-valuenow',
      'aria-valuemin',
      'aria-valuemax',
      'aria-busy',
    ]) {
      await expect(bar).not.toHaveAttribute(attribute, /.*/);
      await expect(track(page, 'progress-value')).not.toHaveAttribute(
        attribute,
        /.*/,
      );
    }
  });

  test('the value and the scale are the element attributes, and the fill follows them', async ({
    page,
  }) => {
    await expect(track(page, 'progress-value')).toHaveAttribute('value', '40');
    await expect(track(page, 'progress-value')).toHaveAttribute('max', '100');
    expect(await share(page, 'progress-value')).toBeCloseTo(0.4, 2);

    await page.getByTestId('more').click();
    await page.getByTestId('more').click();

    await expect(track(page, 'progress-value')).toHaveAttribute('value', '60');
    await expectSettledShare(page, 'progress-value', 0.6);

    await page.getByTestId('less').click();
    await expect(track(page, 'progress-value')).toHaveAttribute('value', '50');
    await expectSettledShare(page, 'progress-value', 0.5);
  });

  test('the scale is the consumer own unit, and the fill is the fraction of it', async ({
    page,
  }) => {
    // 129 of 256 bytes: the element carries the bytes, and only the drawing is a fraction.
    await expect(track(page, 'progress-caption-bar')).toHaveAttribute(
      'value',
      '129',
    );
    await expect(track(page, 'progress-caption-bar')).toHaveAttribute(
      'max',
      '256',
    );
    expect(await share(page, 'progress-caption-bar')).toBeCloseTo(129 / 256, 2);
  });

  test('an indeterminate bar has no value at all, and a band instead of a fill', async ({
    page,
  }) => {
    const bar = page.getByTestId('progress-indeterminate');

    // The absence IS the state. A `value="0"` would say the task has not started, which is a
    // different claim, and it is the claim an author writing `aria-valuenow` has to make.
    await expect(track(page, 'progress-indeterminate')).not.toHaveAttribute(
      'value',
      /.*/,
    );
    await expect(bar).toHaveAttribute('data-pct-indeterminate', '');
    await expect(bar).toMatchAriaSnapshot(`- progressbar "Working"`);

    // The band is the token's share of the groove — the fill's width is not bound here, so
    // this is the stylesheet answering rather than an inline style.
    expect(await share(page, 'progress-indeterminate')).toBeCloseTo(0.33, 2);
  });

  test('the band really travels, and it is the loop duration that moves it', async ({
    page,
  }) => {
    const band = fill(page, 'progress-indeterminate');

    // Retried rather than read once. A single `getComputedStyle` here answered an EMPTY
    // string in webkit on a machine running the whole suite at once — the reading landed
    // before the lazily routed view had its first style resolution, and an empty answer is
    // indistinguishable from a wrong one (`lesson-38`'s family). `toHaveCSS` waits for the
    // value the token gives.
    await expect(band).toHaveCSS('animation-duration', '0.6s');

    await slowTheBand(page, 'progress-indeterminate');
    const samples = await travel(page, 'progress-indeterminate', false);

    const forwards = samples
      .slice(1)
      .filter((value, i) => value > samples[i]).length;
    expect(forwards, `band offsets: ${samples.join(', ')}`).toBeGreaterThan(3);
  });

  test('and it travels the other way once the page is mirrored', async ({
    page,
  }) => {
    await setRtl(page);
    await slowTheBand(page, 'progress-indeterminate');

    // The same measurement as above, taken from the OTHER edge: an animation of
    // `inset-inline-start` mirrors with the writing direction and a `translateX` would not,
    // which is why the keyframes are written the way the switch's thumb and the drawer's
    // slide are (`req-token-logical`).
    const samples = await travel(page, 'progress-indeterminate', true);

    const forwards = samples
      .slice(1)
      .filter((value, i) => value > samples[i]).length;
    expect(forwards, `band offsets: ${samples.join(', ')}`).toBeGreaterThan(3);
  });

  test('a value outside the scale is clamped, and the element carries the clamped number', async ({
    page,
  }) => {
    await expect(track(page, 'progress-over')).toHaveAttribute('value', '100');
    expect(await share(page, 'progress-over')).toBeCloseTo(1, 2);

    await expect(track(page, 'progress-under')).toHaveAttribute('value', '0');
    expect(await share(page, 'progress-under')).toBeCloseTo(0, 2);
  });

  test('a max that is not a scale falls back to the default hundred', async ({
    page,
  }) => {
    await expect(track(page, 'progress-noscale')).toHaveAttribute('max', '100');
    await expect(track(page, 'progress-noscale')).toHaveAttribute(
      'value',
      '40',
    );
    expect(await share(page, 'progress-noscale')).toBeCloseTo(0.4, 2);
  });

  test('a number arriving takes the band away, and losing it brings the band back', async ({
    page,
  }) => {
    const bar = page.getByTestId('progress-switch');
    await expect(bar).toHaveAttribute('data-pct-indeterminate', '');

    await page.getByTestId('toggle').click();
    await expect(bar).not.toHaveAttribute('data-pct-indeterminate', /.*/);
    await expect(track(page, 'progress-switch')).toHaveAttribute('value', '60');
    await expectSettledShare(page, 'progress-switch', 0.6);

    await page.getByTestId('toggle').click();
    await expect(bar).toHaveAttribute('data-pct-indeterminate', '');
    await expect(track(page, 'progress-switch')).not.toHaveAttribute(
      'value',
      /.*/,
    );
  });

  test('the size axis is a thickness and nothing else', async ({ page }) => {
    const heights = await Promise.all(
      ['progress-sm', 'progress-md', 'progress-lg'].map(
        async (id) => (await boxOf(track(page, id))).height,
      ),
    );

    expect(heights[0]).toBeLessThan(heights[1]);
    expect(heights[1]).toBeLessThan(heights[2]);

    // The widths do not move with the axis: a bar is read by its length, and the length is
    // the consumer's layout rather than a size step.
    const widths = await Promise.all(
      ['progress-sm', 'progress-md', 'progress-lg'].map(
        async (id) => (await boxOf(track(page, id))).width,
      ),
    );
    expect(widths[0]).toBeCloseTo(widths[2], 0);
  });

  test('nothing here takes focus, because nothing here is a control', async ({
    page,
  }) => {
    const element: Locator = track(page, 'progress-value');

    // Asked outright: a `<progress>` is not focusable in any engine, so a keyboard user walks
    // past it. That is why the card's keyboard map is empty and why no `tabindex` is written.
    expect(
      await element.evaluate((el) => {
        el.focus();
        return document.activeElement === el;
      }),
    ).toBe(false);

    await page.getByTestId('less').focus();
    await page.keyboard.press('Tab');
    await expect(page.getByTestId('more')).toBeFocused();
  });
});
